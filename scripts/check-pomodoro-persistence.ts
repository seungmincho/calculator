import assert from 'node:assert/strict'
import { DEFAULT_POMODORO_SETTINGS, initialPomodoroTimer } from '../src/utils/pomodoroSession.ts'
import { POMODORO_STATE_KEYS, POMODORO_STATE_MAX_BYTES, PomodoroStateParseError, discardPomodoroState,
  parsePomodoroSettings, parsePomodoroTasks, parsePomodoroTimer, readPomodoroState, withPomodoroStateLock,
  writePomodoroSettings, writePomodoroTasks, writePomodoroTimer } from '../src/utils/pomodoroPersistence.ts'

class Memory {
  values = new Map<string, string>(); writes = 0; removes = 0; failSet = false; failReadAfterSet = false; changedAfterSet = false; failRead = false
  getItem(key: string) { if (this.failRead || (this.failReadAfterSet && this.writes > 0)) throw new Error('blocked'); return this.values.get(key) ?? null }
  setItem(key: string, value: string) { if (this.failSet) throw new DOMException('Full', 'QuotaExceededError'); this.writes++; this.values.set(key, this.changedAfterSet ? 'changed' : value) }
  removeItem(key: string) { this.removes++; this.values.delete(key) }
}
const settings = { ...DEFAULT_POMODORO_SETTINGS }
const legacy = { phase: 'work', timeLeft: 123, isRunning: true, currentRound: 999, completedRounds: 9,
  totalWorkSeconds: 1234, lastTickTime: 1_000_000, settings }
const task = { id: 'legacy-task', text: '  한글 원문\n\u0000 keep  ', completed: false, estimatedPomodoros: 150, completedPomodoros: 2 }
const expectParse = (run: () => unknown, code = 'corrupt') => assert.throws(run, error => error instanceof PomodoroStateParseError && error.code === code)
let groups = 0
const check = async (name: string, run: () => void | Promise<void>) => { await run(); console.log('PASS', name); groups++ }

await check('strict legacy reads preserve bytes, task text, high estimate and round without writing', () => {
  const store = new Memory(), raw = JSON.stringify(legacy, null, 2), tasks = JSON.stringify([task])
  store.values.set(POMODORO_STATE_KEYS.timer, raw); store.values.set(POMODORO_STATE_KEYS.tasks, tasks)
  const read = readPomodoroState(store, 'timer', parsePomodoroTimer); assert.equal(read.ok, true)
  if (!read.ok) throw new Error('read failed')
  assert.equal(read.raw, raw); assert.equal(read.value?.remainingMs, 123_000); assert.equal(read.value?.currentRound, 999)
  assert.deepEqual(parsePomodoroTasks(tasks), [task]); assert.equal(store.writes, 0); assert.equal(store.getItem(POMODORO_STATE_KEYS.timer), raw)
})
await check('absent values return independent defaults and null timer without writing', () => {
  const a = parsePomodoroSettings(null), b = parsePomodoroSettings(null); a.workDuration = 1
  assert.equal(b.workDuration, 25); assert.deepEqual(parsePomodoroTasks(null), []); assert.equal(parsePomodoroTimer(null), null)
})
await check('normal checkpoint upgrades in the same key with legacy-compatible fields and exact milliseconds', () => {
  const store = new Memory(), raw = JSON.stringify(legacy); store.values.set(POMODORO_STATE_KEYS.timer, raw)
  const timer = { ...initialPomodoroTimer(settings), remainingMs: 123_456.75, isRunning: true }
  const write = writePomodoroTimer(store, raw, timer, 'phase-1', 2_000_000); assert.equal(write.ok, true)
  if (!write.ok || write.raw === null) throw new Error('write failed')
  const json = JSON.parse(write.raw), read = parsePomodoroTimer(write.raw)!
  assert.equal(json.timeLeft, 124); assert.equal(json.lastTickTime, 2_000_000); assert.deepEqual(json.settings, settings)
  assert.equal(read.remainingMs, 123_456.75); assert.equal(read.format, 'v1'); assert.equal(read.revision, 1)
  const next = writePomodoroTimer(store, write.raw, timer, 'phase-2', 2_000_100); assert.equal(next.ok, true)
  if (next.ok) assert.equal(parsePomodoroTimer(next.raw)?.revision, 2)
  assert.deepEqual([...store.values.keys()], [POMODORO_STATE_KEYS.timer])
})
await check('settings require exact fields, booleans and UI ranges without coercion', () => {
  for (const patch of [{ workDuration: 0 }, { workDuration: 121 }, { shortBreakDuration: 31 }, { longBreakDuration: 61 },
    { longBreakInterval: 1 }, { soundVolume: 101 }, { autoStart: 'false' }, { soundEnabled: 1 }, { extra: true }]) {
    expectParse(() => parsePomodoroSettings(JSON.stringify({ ...settings, ...patch })))
  }
  for (const raw of ['null', '[]', '{}', '{']) expectParse(() => parsePomodoroSettings(raw))
})
await check('task IDs/shape/counters are strict, while normal raw strings and positive safe estimates survive', () => {
  for (const value of [[task, task], [{ ...task, id: '' }], [{ ...task, estimatedPomodoros: 0 }], [{ ...task, completedPomodoros: -1 }],
    [{ ...task, completed: 1 }], [{ ...task, text: null }], [{ ...task, extra: 1 }], [null], {}]) expectParse(() => parsePomodoroTasks(JSON.stringify(value)))
  assert.equal(parsePomodoroTasks(JSON.stringify([{ ...task, estimatedPomodoros: Number.MAX_SAFE_INTEGER }]))[0].estimatedPomodoros, Number.MAX_SAFE_INTEGER)
})
await check('malformed timer values and future versions are rejected without clamping or deleting', () => {
  for (const patch of [{ phase: 'other' }, { timeLeft: -1 }, { timeLeft: 1501 }, { timeLeft: 1.1 }, { isRunning: 1 },
    { currentRound: 0 }, { completedRounds: -1 }, { totalWorkSeconds: '1' }, { lastTickTime: -1 }, { settings: null }, { extra: 1 }]) {
    expectParse(() => parsePomodoroTimer(JSON.stringify({ ...legacy, ...patch })))
  }
  expectParse(() => parsePomodoroTimer(JSON.stringify({ ...legacy, version: 2 })), 'unsupported')
  const store = new Memory(); const raw = JSON.stringify({ ...legacy, version: 99 }); store.values.set(POMODORO_STATE_KEYS.timer, raw)
  assert.deepEqual(writePomodoroTimer(store, raw, initialPomodoroTimer(), 'valid', 1000), { ok: false, error: 'unsupported' })
  assert.equal(store.getItem(POMODORO_STATE_KEYS.timer), raw); assert.equal(store.writes, 0)
})
await check('v1 metadata/display agreement and revision overflow are strict', () => {
  const store = new Memory(); const write = writePomodoroTimer(store, null, initialPomodoroTimer(), 'phase', 1000)
  if (!write.ok || !write.raw) throw new Error('write failed')
  const valid = JSON.parse(write.raw)
  for (const patch of [{ revision: -1 }, { phaseId: '' }, { phaseId: 'bad id' }, { timeLeft: 10 }, { remainingMs: -1 }]) expectParse(() => parsePomodoroTimer(JSON.stringify({ ...valid, ...patch })))
  const maximum = JSON.stringify({ ...valid, revision: Number.MAX_SAFE_INTEGER }); store.values.set(POMODORO_STATE_KEYS.timer, maximum)
  assert.deepEqual(writePomodoroTimer(store, maximum, initialPomodoroTimer(), 'phase', 2000), { ok: false, error: 'invalid' })
})
await check('UTF-8 byte caps are exact and oversized originals remain intact', () => {
  const base = JSON.stringify([{ ...task, text: '' }]); const count = POMODORO_STATE_MAX_BYTES.tasks - Buffer.byteLength(base)
  const boundary = JSON.stringify([{ ...task, text: 'x'.repeat(count) }]); assert.equal(Buffer.byteLength(boundary), POMODORO_STATE_MAX_BYTES.tasks)
  assert.equal(parsePomodoroTasks(boundary)[0].text.length, count)
  const oversized = JSON.stringify([{ ...task, text: 'x'.repeat(count + 1) }]); expectParse(() => parsePomodoroTasks(oversized), 'oversized')
  const multibyte = JSON.stringify([{ ...task, text: '가'.repeat(800_000) }]); assert.ok(multibyte.length < POMODORO_STATE_MAX_BYTES.tasks)
  expectParse(() => parsePomodoroTasks(multibyte), 'oversized')
  const store = new Memory(); store.values.set(POMODORO_STATE_KEYS.tasks, oversized)
  assert.deepEqual(writePomodoroTasks(store, oversized, [task]), { ok: false, error: 'oversized' }); assert.equal(store.writes, 0)
})
await check('raw CAS, quota and canceled writes preserve the original and typed input', () => {
  const store = new Memory(), raw = JSON.stringify([task]); store.values.set(POMODORO_STATE_KEYS.tasks, raw)
  const input = [{ ...task, text: 'latest input' }]
  assert.deepEqual(writePomodoroTasks(store, null, input), { ok: false, error: 'conflict' }); assert.equal(store.writes, 0)
  store.failSet = true; assert.deepEqual(writePomodoroTasks(store, raw, input), { ok: false, error: 'quota' }); assert.equal(store.getItem(POMODORO_STATE_KEYS.tasks), raw)
  store.failSet = false; const aborted = new AbortController(); aborted.abort()
  assert.deepEqual(writePomodoroTasks(store, raw, input, aborted.signal), { ok: false, error: 'canceled' }); assert.equal(store.writes, 0); assert.equal(input[0].text, 'latest input')
})
await check('readback errors/differences are unconfirmed and never roll back a possibly committed write', () => {
  for (const difference of [false, true]) {
    const store = new Memory(); store.failReadAfterSet = !difference; store.changedAfterSet = difference
    assert.deepEqual(writePomodoroSettings(store, null, settings), { ok: false, error: 'unconfirmed' })
    assert.equal(store.writes, 1); assert.equal(store.removes, 0); assert.ok(store.values.has(POMODORO_STATE_KEYS.settings))
  }
})
await check('blocked reads have no fabricated raw and corrupt reads preserve a discardable raw snapshot', () => {
  const store = new Memory(); store.failRead = true
  assert.deepEqual(readPomodoroState(store, 'settings', parsePomodoroSettings), { ok: false, error: 'unavailable' })
  store.failRead = false; store.values.set(POMODORO_STATE_KEYS.settings, 'null')
  assert.deepEqual(readPomodoroState(store, 'settings', parsePomodoroSettings), { ok: false, raw: 'null', error: 'corrupt' })
  assert.deepEqual(writePomodoroSettings(store, 'null', settings), { ok: false, error: 'corrupt' }); assert.equal(store.writes, 0)
})
await check('explicit discard still uses CAS and only removes its requested key', () => {
  const store = new Memory(); store.values.set(POMODORO_STATE_KEYS.timer, 'broken'); store.values.set(POMODORO_STATE_KEYS.tasks, JSON.stringify([task]))
  assert.deepEqual(discardPomodoroState(store, 'timer', 'older'), { ok: false, error: 'conflict' }); assert.equal(store.removes, 0)
  assert.deepEqual(discardPomodoroState(store, 'timer', 'broken'), { ok: true, raw: null }); assert.equal(store.removes, 1)
  assert.deepEqual(parsePomodoroTasks(store.getItem(POMODORO_STATE_KEYS.tasks)), [task])
})
await check('lock fallback works; queued cancellation and serialized two-reader CAS cannot overwrite the winner', async () => {
  const store = new Memory(), first = new AbortController(), second = new AbortController()
  const jobs: (() => unknown)[] = [], keys: string[] = []
  const locks = { request: (key: string, _options: unknown, action: () => unknown) => { keys.push(key); return new Promise((resolve, reject) => jobs.push(() => { try { resolve(action()) } catch (error) { reject(error) } })) } } as unknown as Pick<LockManager, 'request'>
  const a = withPomodoroStateLock('settings', first.signal, () => writePomodoroSettings(store, null, settings), locks)
  const b = withPomodoroStateLock('settings', second.signal, () => writePomodoroSettings(store, null, { ...settings, soundVolume: 5 }), locks)
  jobs.shift()!(); assert.equal((await a).ok, true); jobs.shift()!(); assert.deepEqual(await b, { ok: false, error: 'conflict' })
  const cancel = new AbortController(); let calls = 0
  const pending = withPomodoroStateLock('tasks', cancel.signal, () => { calls++; return 1 }, locks); cancel.abort(); jobs.shift()!()
  await assert.rejects(pending, { name: 'AbortError' }); assert.equal(calls, 0)
  assert.equal(await withPomodoroStateLock('timer', new AbortController().signal, () => 42, undefined), 42)
  assert.deepEqual(keys, [POMODORO_STATE_KEYS.settings, POMODORO_STATE_KEYS.settings, POMODORO_STATE_KEYS.tasks])
})
console.log(`${groups} Pomodoro persistence groups passed (in-memory Storage/LockManager ports).`)
