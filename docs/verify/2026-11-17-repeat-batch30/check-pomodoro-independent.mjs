import assert from 'node:assert/strict'
import { createPomodoroSession } from '../../../src/lib/pomodoro/session.ts'
import { initialPomodoroTimer, restorePomodoroTimer } from '../../../src/utils/pomodoroSession.ts'
import { parsePomodoroSettings, parsePomodoroTasks, parsePomodoroTimer, readPomodoroState, writePomodoroSettings, writePomodoroTasks, writePomodoroTimer, discardPomodoroState, withPomodoroStateLock, POMODORO_STATE_KEYS } from '../../../src/utils/pomodoroPersistence.ts'

const settings = { workDuration: 1, shortBreakDuration: 1, longBreakDuration: 2, longBreakInterval: 2, autoStart: false, notificationsEnabled: false, soundEnabled: false, soundVolume: 0 }
const baseWall = Date.UTC(2026, 10, 17)
const flush = async () => { for (let index = 0; index < 12; index++) await Promise.resolve() }
const deferred = () => { let resolve, reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no }); return { promise, resolve, reject } }
let groups = 0
async function check(name, run) { await run(); groups++; console.log('PASS', name) }
function rig(options = {}) {
  let wallElapsed = 0, monoElapsed = 0, sequence = 0
  const ticks = new Set(), returned = new Set(), transitions = [], changes = []
  const clock = () => ({ wallMs: baseWall + Math.round(wallElapsed), monotonicMs: 100 + monoElapsed })
  const controller = createPomodoroSession({
    clock, nextPhaseId: () => `independent-${++sequence}`,
    every(callback) { ticks.add(callback); return () => ticks.delete(callback) },
    onReturn(callback) { returned.add(callback); return () => returned.delete(callback) },
    authorizeCompletion: options.authorize,
  }, state => changes.push(state), event => transitions.push(event), options.value ?? initialPomodoroTimer(options.settings ?? settings), options.notice ?? null)
  return { controller, clock, transitions, ticks, returned, changes,
    elapse(wall, mono = wall) { wallElapsed += wall; monoElapsed += mono },
    tick() { for (const callback of [...ticks]) callback() },
    wake() { for (const callback of [...returned]) callback() }, state: () => controller.getSnapshot() }
}
function memory(initial = {}) {
  const values = new Map(Object.entries(initial)), writes = [], deletes = []
  return { values, writes, deletes,
    getItem(key) { return values.get(key) ?? null },
    setItem(key, raw) { writes.push({ key, raw }); values.set(key, raw) },
    removeItem(key) { deletes.push(key); values.delete(key) } }
}
function legacy(overrides = {}) {
  return { phase: 'work', timeLeft: 60, isRunning: true, currentRound: 8, completedRounds: 7, totalWorkSeconds: 420, lastTickTime: baseWall, settings: { ...settings }, ...overrides }
}

await check('Separate running-time ledger retains fractional ticks and excludes each paused interval', async () => {
  const f = rig({ settings: { ...settings, workDuration: 2 } })
  let creditedElapsed = 0
  for (let cycle = 0; cycle < 35; cycle++) {
    f.controller.start(); const staleTick = [...f.ticks][0]
    for (const duration of [1400.125, 321.25, 0.5]) {
      f.elapse(duration); creditedElapsed += duration; f.tick()
      assert.equal(f.state().remainingMs, 120000 - creditedElapsed)
    }
    const tail = (cycle % 4) * 123.25 + 0.125
    f.elapse(tail); creditedElapsed += tail; f.controller.pause()
    assert.equal(f.state().remainingMs, 120000 - creditedElapsed)
    const paused = f.state(); f.elapse(100000 + cycle * 1000); staleTick(); f.tick()
    assert.deepEqual(f.state(), paused)
  }
  assert.equal(f.transitions.length, 0); f.controller.dispose(); await flush()
})

await check('Clock disagreement boundary is strict >2000ms; rollback never adds time', () => {
  for (const gap of [-2001, -2000, -1999, 0, 1999, 2000, 2001]) {
    const f = rig(); f.controller.start(); f.elapse(4000 + gap, 4000); f.tick()
    const stopped = Math.abs(gap) > 2000
    const expected = 60000 - (stopped ? Math.max(4000, 4000 + gap) : 4000)
    assert.equal(f.state().remainingMs, expected); assert.equal(f.state().isRunning, !stopped)
    assert.equal(f.state().notice, stopped ? 'clockChanged' : null); assert.equal(f.transitions.length, 0); f.controller.dispose()
  }
  const f = rig(); f.controller.start(); f.elapse(2500); f.tick(); f.elapse(-86400000, 500); f.tick()
  assert.equal(f.state().remainingMs, 57000); assert.equal(f.state().notice, 'clockChanged'); assert.equal(f.transitions.length, 0)
  f.controller.start(); f.elapse(0, -0.25); f.tick(); assert.equal(f.state().remainingMs, 57000); assert.equal(f.state().isRunning, false); f.controller.dispose()
})

await check('Wall-only sleep simulation is no-credit expiry; together-delayed clocks complete only the observed phase', async () => {
  const uncertain = rig({ settings: { ...settings, autoStart: true } }); uncertain.controller.start(); uncertain.elapse(7200000, 0); uncertain.wake()
  assert.equal(uncertain.state().notice, 'clockGapExpired'); assert.equal(uncertain.state().remainingMs, 0); assert.equal(uncertain.state().completedRounds, 0)
  uncertain.controller.start(); assert.equal(uncertain.state().isRunning, false); assert.equal(uncertain.transitions.length, 0)
  uncertain.controller.advanceExpired(); assert.equal(uncertain.state().phase, 'shortBreak'); assert.equal(uncertain.state().completedRounds, 0)
  assert.deepEqual(uncertain.transitions.map(event => [event.kind, event.workMinutes]), [['expiredAdvance', 0]]); uncertain.controller.dispose()
  const known = rig({ settings: { ...settings, autoStart: true } }); known.controller.start(); const old = [...known.ticks][0]; known.elapse(7200000); known.wake(); await flush()
  assert.equal(known.state().phase, 'shortBreak'); assert.equal(known.state().remainingMs, 60000); assert.equal(known.state().completedRounds, 1)
  old(); old(); assert.equal(known.transitions.length, 1); assert.equal(known.transitions[0].workMinutes, 1); known.controller.dispose()
})

await check('Pause at expiry commits once while explicit skip/reset cancels unobserved completion', async () => {
  const pause = rig({ settings: { ...settings, autoStart: true } }); pause.controller.start(); pause.elapse(60000); pause.controller.pause(); await flush()
  assert.equal(pause.state().completedRounds, 1); assert.equal(pause.state().isRunning, false); assert.equal(pause.transitions.length, 1); pause.controller.dispose()
  for (const method of ['skip', 'resetPhase', 'resetAll']) {
    const f = rig(); f.controller.start(); const old = [...f.ticks][0]; f.elapse(60001); f.controller[method](); old(); await flush()
    assert.equal(f.state().completedRounds, 0); assert.equal(f.state().totalWorkSeconds, 0)
    assert.deepEqual(f.transitions.map(event => event.kind), method === 'skip' ? ['skipped'] : []); f.controller.dispose()
  }
})

await check('Delayed ownership lock uses one persisted start, including receipt delivery latency and cancellation', async () => {
  const held = deferred(), delivery = deferred(), store = memory(); let proposal, signal, f
  f = rig({ settings: { ...settings, autoStart: true }, authorize: async (value, abort) => {
    proposal = value; signal = abort; await held.promise
    const startedAt = f.clock(), next = value.getNext()
    assert.equal(writePomodoroTimer(store, null, next, value.nextPhaseId, startedAt.wallMs, abort).ok, true)
    await delivery.promise; return { decision: 'allow', startedAt }
  } })
  f.controller.start(); f.elapse(60000); f.tick(); assert.equal(f.state().settling, true)
  const observedAt = proposal.observedAt; f.elapse(45000); held.resolve(); await flush()
  const persisted = parsePomodoroTimer(store.getItem(POMODORO_STATE_KEYS.timer))
  assert.equal(persisted.checkpointAt, baseWall + 105000); assert.notEqual(persisted.checkpointAt, observedAt)
  f.elapse(1725); delivery.resolve(); await flush()
  assert.equal(f.state().remainingMs, 58275); assert.equal(restorePomodoroTimer(persisted, f.clock().wallMs).value.remainingMs, f.state().remainingMs)
  assert.equal(f.transitions.length, 1); assert.equal(f.transitions[0].observedAt, observedAt); assert.equal(signal.aborted, true)
  f.controller.dispose()
  const canceled = deferred(); let captured
  const c = rig({ authorize: async (_value, abort) => { captured = abort; return canceled.promise } })
  c.controller.start(); c.elapse(60000); c.tick(); c.controller.resetAll(); const resetId = c.state().phaseId
  canceled.resolve({ decision: 'allow', startedAt: c.clock() }); await flush()
  assert.equal(captured.aborted, true); assert.equal(c.state().phaseId, resetId); assert.equal(c.transitions.length, 0); c.controller.dispose()
})

await check('Receipt that outlives the next phase never creates a second completion or credits the unobserved phase', async () => {
  const ready = deferred(); let receipt
  const f = rig({ settings: { ...settings, autoStart: true }, authorize: async () => { receipt = { decision: 'allow', startedAt: f.clock() }; await ready.promise; return receipt } })
  f.controller.start(); f.elapse(60000); f.tick(); f.elapse(60001); ready.resolve(); await flush()
  assert.equal(f.state().phase, 'shortBreak'); assert.equal(f.state().notice, 'clockGapExpired'); assert.equal(f.state().remainingMs, 0)
  assert.equal(f.state().completedRounds, 1); assert.equal(f.state().totalWorkSeconds, 60); assert.equal(f.transitions.length, 1)
  f.controller.start(); f.wake(); await flush(); assert.equal(f.transitions.length, 1); f.controller.dispose()
})

await check('Three strict legacy readers preserve bytes/text and block malformed/future payloads without writes', () => {
  const tasks = [{ id: '__proto__', text: '  한국어\n😀  ', completed: false, estimatedPomodoros: 200, completedPomodoros: 3 }]
  const original = { [POMODORO_STATE_KEYS.settings]: JSON.stringify(settings), [POMODORO_STATE_KEYS.tasks]: JSON.stringify(tasks), [POMODORO_STATE_KEYS.timer]: JSON.stringify(legacy()) }
  const store = memory(original)
  for (const [kind, parser] of [['settings', parsePomodoroSettings], ['tasks', parsePomodoroTasks], ['timer', parsePomodoroTimer]]) assert.equal(readPomodoroState(store, kind, parser).ok, true)
  assert.deepEqual(Object.fromEntries(store.values), original); assert.equal(store.writes.length, 0); assert.equal(parsePomodoroTasks(original[POMODORO_STATE_KEYS.tasks])[0].text, tasks[0].text)
  const invalid = [
    ['settings', parsePomodoroSettings, JSON.stringify({ ...settings, autoStart: 'false' })],
    ['settings', parsePomodoroSettings, JSON.stringify({ ...settings, surprise: 1 })],
    ['tasks', parsePomodoroTasks, JSON.stringify([...tasks, tasks[0]])],
    ['tasks', parsePomodoroTasks, 'null'],
    ['timer', parsePomodoroTimer, JSON.stringify({ ...legacy(), version: 999 })],
    ['timer', parsePomodoroTimer, JSON.stringify({ ...legacy(), phase: 'future' })],
    ['timer', parsePomodoroTimer, JSON.stringify({ ...legacy(), timeLeft: -1 })],
  ]
  for (const [kind, parser, raw] of invalid) {
    const damaged = memory({ [POMODORO_STATE_KEYS[kind]]: raw }), read = readPomodoroState(damaged, kind, parser)
    assert.equal(read.ok, false); assert.equal(read.raw, raw); assert.equal(damaged.writes.length, 0); assert.equal(damaged.getItem(POMODORO_STATE_KEYS[kind]), raw)
  }
  const expired = restorePomodoroTimer(parsePomodoroTimer(original[POMODORO_STATE_KEYS.timer]), baseWall + 60000)
  assert.equal(expired.notice, 'restoredExpired'); assert.equal(expired.value.completedRounds, 7); assert.equal(expired.value.totalWorkSeconds, 420)
})

await check('CAS/unknown readback, explicit discard and lock cancellation protect the captured raw', async () => {
  const store = memory(), saved = writePomodoroSettings(store, null, settings)
  assert.equal(saved.ok, true); const changed = { ...settings, soundVolume: 42 }
  assert.deepEqual(writePomodoroSettings(store, null, changed), { ok: false, error: 'conflict' }); assert.equal(store.writes.length, 1)
  const tasks = [{ id: '1', text: 'kept', completed: false, estimatedPomodoros: 1, completedPomodoros: 0 }]
  let reads = 0, current = null, writes = 0
  const unreadable = { getItem() { if (++reads > 1) throw new Error('blocked readback'); return current }, setItem(_key, raw) { writes++; current = raw }, removeItem() { throw new Error('unexpected rollback') } }
  assert.deepEqual(writePomodoroTasks(unreadable, null, tasks), { ok: false, error: 'unconfirmed' }); assert.equal(writes, 1); assert.deepEqual(JSON.parse(current), tasks)
  const damaged = memory({ [POMODORO_STATE_KEYS.tasks]: '{bad' })
  assert.deepEqual(discardPomodoroState(damaged, 'tasks', '{old'), { ok: false, error: 'conflict' }); assert.equal(damaged.deletes.length, 0)
  assert.equal(discardPomodoroState(damaged, 'tasks', '{bad').ok, true); assert.equal(damaged.deletes.length, 1)
  const pending = deferred(), abort = new AbortController(); let actions = 0
  const lock = { async request(key, options, action) { assert.equal(key, POMODORO_STATE_KEYS.timer); assert.equal(options.signal, abort.signal); await pending.promise; return action() } }
  const blocked = withPomodoroStateLock('timer', abort.signal, () => { actions++ }, lock)
  abort.abort(); pending.resolve(); await assert.rejects(blocked, error => error.name === 'AbortError'); assert.equal(actions, 0)
  assert.equal(await withPomodoroStateLock('settings', new AbortController().signal, () => 7, undefined), 7)
})

console.log(`Independent Pomodoro core/storage: ${groups} groups passed; controlled clocks and ports, not native sleep/browser claims`)
