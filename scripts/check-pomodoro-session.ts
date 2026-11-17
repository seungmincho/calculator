import assert from 'node:assert/strict'
import { createPomodoroSession, type PomodoroSessionPorts, type PomodoroTransition, type PomodoroCompletionReceipt } from '../src/lib/pomodoro/session.ts'
import { DEFAULT_POMODORO_SETTINGS, initialPomodoroTimer, nextPomodoroPhase, pomodoroDisplaySeconds,
  restorePomodoroTimer, inspectPomodoroProgress, type PomodoroTimerValue, type PomodoroSavedTimer } from '../src/utils/pomodoroSession.ts'
import { parsePomodoroTimer, writePomodoroTimer, POMODORO_STATE_KEYS } from '../src/utils/pomodoroPersistence.ts'

const settings = { ...DEFAULT_POMODORO_SETTINGS, workDuration: 1, shortBreakDuration: 1, longBreakDuration: 2, longBreakInterval: 2 }
const flush = async () => { for (let n = 0; n < 6; n++) await Promise.resolve() }
function deferred<T>() { let resolve!: (value: T) => void, reject!: (error: Error) => void; const promise = new Promise<T>((done, fail) => { resolve = done; reject = fail }); return { promise, resolve, reject } }
function fixture(value = initialPomodoroTimer(settings), authorize?: PomodoroSessionPorts['authorizeCompletion']) {
  let wallMs = Date.UTC(2026, 10, 17), monotonicMs = 1000, sequence = 0
  const ticks = new Set<() => void>(), returns = new Set<() => void>(), events: PomodoroTransition[] = []
  let updates = 0
  const ports: PomodoroSessionPorts = {
    clock: () => ({ wallMs, monotonicMs }), nextPhaseId: () => `phase-${++sequence}`,
    every(callback) { ticks.add(callback); return () => { ticks.delete(callback) } },
    onReturn(callback) { returns.add(callback); return () => { returns.delete(callback) } }, authorizeCompletion: authorize,
  }
  const session = createPomodoroSession(ports, () => updates++, event => events.push(event), value)
  return { session, ports, ticks, returns, events, state: () => session.getSnapshot(), updates: () => updates,
    advance(ms: number, wall = true) { monotonicMs += ms; if (wall) wallMs += ms },
    wall(ms: number) { wallMs += ms }, tick() { for (const tick of [...ticks]) tick() }, back() { for (const back of [...returns]) back() } }
}
let groups = 0
const check = async (name: string, run: () => void | Promise<void>) => { await run(); console.log('PASS', name); groups++ }

await check('1.4-second delayed ticks follow an independent elapsed-time oracle without rounding drift', () => {
  const f = fixture(); f.session.start()
  for (let elapsed = 1400; elapsed < 60_000; elapsed += 1400) {
    f.advance(1400); f.tick()
    assert.equal(f.state().remainingMs, 60_000 - elapsed)
    assert.equal(pomodoroDisplaySeconds(f.state().remainingMs), Math.ceil((60_000 - elapsed) / 1000))
  }
  assert.equal(f.events.length, 0); f.session.dispose()
})
await check('sub-tick pause/resume retains all elapsed milliseconds and excludes long paused gaps', () => {
  const f = fixture(); let elapsed = 0
  for (const part of [125, 333, 299, 450, 1, 497]) {
    f.session.start(); f.advance(part); elapsed += part; f.session.pause()
    assert.equal(f.state().remainingMs, 60_000 - elapsed)
    f.advance(100_000); f.tick(); assert.equal(f.state().remainingMs, 60_000 - elapsed)
  }
  const copy = f.state(); copy.settings.workDuration = 120
  assert.equal(f.state().settings.workDuration, 1); assert.equal(f.events.length, 0); f.session.dispose()
})
await check('large wall/mono disagreement pauses without adding time or work; monotonic regression also pauses', () => {
  const f = fixture(); f.session.start(); f.advance(1234); f.tick(); f.wall(-86_400_000); f.tick()
  assert.equal(f.state().remainingMs, 58_766); assert.equal(f.state().notice, 'clockChanged'); assert.equal(f.state().isRunning, false)
  f.session.start(); f.advance(1000); f.tick(); f.advance(-1, false); f.tick(); assert.equal(f.state().isRunning, false)
  assert.equal(f.state().remainingMs, 57_766); assert.equal(f.events.length, 0); f.session.dispose()
})
await check('large wake-up credits one observed phase and auto-starts a full next phase', () => {
  const f = fixture(initialPomodoroTimer({ ...settings, autoStart: true })); f.session.start()
  const oldTick = [...f.ticks][0]; f.advance(8 * 60 * 60_000); f.back()
  assert.equal(f.events.length, 1); assert.equal(f.events[0].kind, 'completed'); assert.equal(f.events[0].workMinutes, 1)
  assert.equal(f.state().phase, 'shortBreak'); assert.equal(f.state().remainingMs, 60_000); assert.equal(f.state().isRunning, true)
  oldTick(); oldTick(); assert.equal(f.events.length, 1); assert.equal(f.state().remainingMs, 60_000); f.session.dispose()
})
await check('completion, long break and round rules match existing behavior; skip never adds work', () => {
  let value = initialPomodoroTimer(settings)
  value = nextPomodoroPhase(value, true); assert.equal(value.phase, 'shortBreak'); assert.equal(value.completedRounds, 1)
  value = nextPomodoroPhase(value, true); assert.equal(value.phase, 'work'); assert.equal(value.currentRound, 2)
  value = nextPomodoroPhase(value, true); assert.equal(value.phase, 'longBreak'); assert.equal(value.completedRounds, 2)
  value = nextPomodoroPhase(value, false); assert.equal(value.phase, 'work'); assert.equal(value.currentRound, 1)
  value = nextPomodoroPhase(value, false); assert.equal(value.phase, 'shortBreak'); assert.equal(value.totalWorkSeconds, 120)
  const f = fixture(); f.session.start(); f.advance(65_000); f.session.skip()
  assert.equal(f.events.length, 1); assert.equal(f.events[0].kind, 'skipped'); assert.equal(f.state().completedRounds, 0); f.session.dispose()
})
await check('pause at expiry completes once but suppresses next automatic start', () => {
  const f = fixture(initialPomodoroTimer({ ...settings, autoStart: true })); f.session.start(); f.advance(60_000); f.session.pause()
  assert.equal(f.events.length, 1); assert.equal(f.state().phase, 'shortBreak'); assert.equal(f.state().isRunning, false)
  f.session.pause(); f.tick(); assert.equal(f.events.length, 1); f.session.dispose()
})
await check('reset, reset-all and settings application invalidate old callbacks without retroactive credit', () => {
  for (const operation of ['resetPhase', 'resetAll', 'applySettings'] as const) {
    const f = fixture(); f.session.start(); const old = [...f.ticks][0]; f.advance(65_000)
    if (operation === 'applySettings') f.session.applySettings({ ...settings, workDuration: 2 })
    else f.session[operation]()
    old(); assert.equal(f.events.length, 0); assert.equal(f.state().isRunning, false)
    assert.equal(f.state().remainingMs, operation === 'applySettings' ? 120_000 : 60_000); f.session.dispose()
  }
})
await check('unexpired reload uses wall elapsed; expired/paused-zero/backwards-wall restores emit no completion', () => {
  const base: PomodoroSavedTimer = { ...initialPomodoroTimer(settings), isRunning: true, format: 'legacy', phaseId: null, revision: 0, checkpointAt: 100_000 }
  const active = restorePomodoroTimer(base, 101_234); assert.equal(active.value.remainingMs, 58_766); assert.equal(active.value.isRunning, true)
  const expired = restorePomodoroTimer(base, 170_000); assert.equal(expired.notice, 'restoredExpired'); assert.equal(expired.value.isRunning, false)
  const pausedZero = restorePomodoroTimer({ ...base, remainingMs: 0, isRunning: false }, 100_000); assert.equal(pausedZero.notice, 'restoredExpired')
  const backwards = restorePomodoroTimer(base, 99_000); assert.equal(backwards.notice, 'clockChanged'); assert.equal(backwards.value.remainingMs, 60_000)
  const f = fixture(expired.value); f.session.start(); assert.equal(f.state().isRunning, false); assert.equal(f.events.length, 0)
  f.session.advanceExpired(); assert.equal(f.state().phase, 'shortBreak'); assert.equal(f.state().isRunning, true)
  assert.equal(f.state().completedRounds, 0); assert.equal(f.events[0].kind, 'expiredAdvance'); f.session.dispose()
})
await check('pending ownership approval is single-flight, cancellable and rejects late successful completion', async () => {
  for (const operation of ['skip', 'resetPhase', 'resetAll', 'dispose'] as const) {
    const request = deferred<PomodoroCompletionReceipt>(); let count = 0, signal: AbortSignal | undefined
    const f = fixture(initialPomodoroTimer(settings), (_proposal, pendingSignal) => { count++; signal = pendingSignal; return request.promise })
    f.session.start(); const old = [...f.ticks][0]; f.advance(60_000); f.tick(); old(); f.back()
    assert.equal(count, 1); assert.equal(f.state().settling, true); f.session[operation](); assert.equal(signal?.aborted, true)
    const after = f.state(); request.resolve({ decision: 'allow', startedAt: f.ports.clock() }); await flush(); assert.deepEqual(f.state(), after)
    assert.equal(f.events.filter(event => event.kind === 'completed').length, 0); f.session.dispose()
  }
})
await check('approval delay starts next phase now but attributes completion to the observed local-day timestamp', async () => {
  const request = deferred<PomodoroCompletionReceipt>(); let proposalTime = 0
  const f = fixture(initialPomodoroTimer({ ...settings, autoStart: true }), proposal => { proposalTime = proposal.observedAt; return request.promise })
  f.session.start(); f.advance(60_000); f.tick(); f.advance(86_400_000)
  f.session.updatePreferences({ soundEnabled: false, soundVolume: 5, notificationsEnabled: false })
  request.resolve({ decision: 'allow', startedAt: f.ports.clock() }); await flush()
  assert.equal(f.events[0].observedAt, proposalTime); assert.equal(f.events[0].settings.soundEnabled, false)
  assert.equal(f.state().remainingMs, 60_000); assert.equal(f.state().isRunning, true); f.session.dispose()
})
await check('conflict/unconfirmed approvals stop without credit and require explicit replace before running', async () => {
  for (const decision of ['conflict', 'unconfirmed'] as const) {
    const f = fixture(initialPomodoroTimer(settings), async () => ({ decision }))
    f.session.start(); f.advance(60_000); f.tick(); await flush()
    assert.equal(f.events.length, 0); assert.equal(f.state().notice, decision); assert.equal(f.state().completedRounds, 0)
    f.session.start(); f.session.skip(); f.session.resetAll(); assert.equal(f.state().notice, decision)
    f.session.replace(initialPomodoroTimer(settings)); f.session.start(); assert.equal(f.state().isRunning, true); f.session.dispose()
  }
})
await check('storage conflict, rejected approval and dispose consume no late credit and release subscriptions', async () => {
  const request = deferred<PomodoroCompletionReceipt>(); const f = fixture(initialPomodoroTimer(settings), () => request.promise)
  f.session.start(); f.advance(60_000); f.tick(); f.session.interruptConflict(); request.reject(new Error('old error')); await flush()
  assert.equal(f.events.length, 0); assert.equal(f.state().notice, 'conflict'); assert.equal(f.ticks.size + f.returns.size, 0)
  f.session.replace(initialPomodoroTimer(settings)); f.session.start(); const old = [...f.ticks][0]; f.session.dispose(); const updates = f.updates()
  old(); f.back(); assert.equal(f.updates(), updates); assert.equal(f.ticks.size + f.returns.size, 0)
})
await check('restored running state and normal sound preferences do not reset the remaining baseline', () => {
  const value: PomodoroTimerValue = { ...initialPomodoroTimer(settings), remainingMs: 12_345.5, isRunning: true }
  const f = fixture(value); f.advance(100.25, false); f.session.updatePreferences({ soundEnabled: false, notificationsEnabled: true, soundVolume: 0 }); f.tick()
  assert.equal(f.state().remainingMs, 12_245.25); assert.equal(f.state().isRunning, true)
  const checkpoint = f.session.checkpoint(); assert.equal(checkpoint.remainingMs, 12_245.25); assert.equal(f.events.length, 0); f.session.dispose()
})
await check('counter overflow cannot emit a successful completion or silently wrap', () => {
  const f = fixture({ ...initialPomodoroTimer(settings), completedRounds: Number.MAX_SAFE_INTEGER })
  f.session.start(); f.advance(60_000); f.tick(); assert.equal(f.events.length, 0); assert.equal(f.state().notice, 'counterLimit'); f.session.dispose()
})
await check('partial port setup, invalid future IDs and reentrant cancellation release resources without stale authorization', async () => {
  let released = 0, callback: (() => void) | undefined, ids = 0, authorized = 0
  const ports: PomodoroSessionPorts = {
    clock: () => ({ wallMs: 1000, monotonicMs: 1000 }), nextPhaseId: () => 'valid',
    every() { return () => released++ }, onReturn() { throw new Error('listener unavailable') },
  }
  const failed = createPomodoroSession(ports, () => {}, () => {}, { ...initialPomodoroTimer(settings), isRunning: true })
  assert.equal(failed.getSnapshot().isRunning, false); assert.equal(released, 1); failed.dispose(); assert.equal(released, 1)
  const f = fixture(); let clock = 1000
  const invalid = createPomodoroSession({ ...f.ports, clock: () => ({ wallMs: clock, monotonicMs: clock }),
    nextPhaseId: () => ++ids === 1 ? 'valid' : 'invalid id', every(fn) { callback = fn; return () => {} } }, () => {}, () => { throw new Error('must not complete') }, initialPomodoroTimer(settings))
  invalid.start(); clock += 60_000; callback!(); await flush(); assert.equal(invalid.getSnapshot().notice, 'counterLimit'); invalid.dispose(); f.session.dispose()
  const cancel: ReturnType<typeof createPomodoroSession> = createPomodoroSession({ ...ports, clock: () => ({ wallMs: clock, monotonicMs: clock }),
    every(fn) { callback = fn; return () => {} }, onReturn: () => () => {},
    authorizeCompletion: async () => { authorized++; return { decision: 'allow', startedAt: ports.clock() } } }, state => { if (state.settling) cancel.resetPhase() }, () => { throw new Error('must not complete') }, initialPomodoroTimer(settings))
  cancel.start(); clock += 60_000; callback!(); await flush(); assert.equal(authorized, 0); assert.equal(cancel.getSnapshot().remainingMs, 60_000); cancel.dispose()
})
await check('sleep-like forward wall gap expires with no completion and only explicit skip advance', () => {
  let authorizations = 0
  const f = fixture(initialPomodoroTimer(settings), async () => { authorizations++; return { decision: 'conflict' } })
  f.session.start(); f.advance(1000); f.tick(); f.wall(70_000); f.back()
  assert.equal(f.state().notice, 'clockGapExpired'); assert.equal(f.state().remainingMs, 0); assert.equal(f.events.length, 0); assert.equal(authorizations, 0)
  f.session.start(); assert.equal(f.state().isRunning, false); f.session.advanceExpired()
  assert.equal(f.state().phase, 'shortBreak'); assert.equal(f.state().completedRounds, 0); assert.equal(f.events[0].kind, 'expiredAdvance'); f.session.dispose()
})
await check('forward wall gap with time left uses conservative remaining and explicit resume anchors both clocks', () => {
  const f = fixture(); f.session.start(); f.advance(1000); f.tick(); f.wall(20_000); f.back()
  assert.equal(f.state().remainingMs, 39_000); assert.equal(f.state().notice, 'clockChanged'); assert.equal(f.state().isRunning, false)
  f.session.start(); f.advance(1400); f.tick(); assert.equal(f.state().remainingMs, 37_600); assert.equal(f.events.length, 0); f.session.dispose()
})
await check('two-second safety threshold is strict and rollback never increases a verified value', () => {
  const start = { wallMs: 100_000, monotonicMs: 1000 }
  assert.deepEqual(inspectPomodoroProgress(60_000, start, { wallMs: 103_000, monotonicMs: 2000 }), { remainingMs: 59_000, uncertain: false })
  assert.deepEqual(inspectPomodoroProgress(60_000, start, { wallMs: 103_001, monotonicMs: 2000 }), { remainingMs: 56_999, uncertain: true })
  assert.deepEqual(inspectPomodoroProgress(60_000, start, { wallMs: 90_000, monotonicMs: 3000 }, 57_000), { remainingMs: 57_000, uncertain: true })
})
await check('long lock wait uses one committed start for saved wall timestamp and live auto-start remaining', async () => {
  const request = deferred<PomodoroCompletionReceipt>(); let commit!: () => void
  const values = new Map<string, string>()
  const store = { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, raw: string) => { values.set(key, raw) }, removeItem: (key: string) => { values.delete(key) } }
  const f = fixture(initialPomodoroTimer({ ...settings, autoStart: true }), proposal => {
    commit = () => { const startedAt = f.ports.clock(); const written = writePomodoroTimer(store, null, proposal.next, proposal.nextPhaseId, startedAt.wallMs); assert.equal(written.ok, true); request.resolve({ decision: 'allow', startedAt }) }
    return request.promise
  })
  f.session.start(); f.advance(60_000); f.tick(); const observed = f.ports.clock().wallMs; f.advance(180_000); commit(); await flush()
  const saved = parsePomodoroTimer(store.getItem(POMODORO_STATE_KEYS.timer))!
  assert.equal(saved.checkpointAt, observed + 180_000); assert.equal(f.events[0].observedAt, observed); assert.equal(f.state().remainingMs, 60_000)
  f.advance(12_345); f.tick(); assert.equal(f.state().remainingMs, restorePomodoroTimer(saved, f.ports.clock().wallMs).value.remainingMs); f.session.dispose()
})
await check('late receipt delivery deducts elapsed time but never credits the unobserved next phase', async () => {
  for (const delay of [12_345, 90_000]) {
    const request = deferred<PomodoroCompletionReceipt>(); const f = fixture(initialPomodoroTimer({ ...settings, autoStart: true }), () => request.promise)
    f.session.start(); f.advance(60_000); f.tick(); const startedAt = f.ports.clock(); f.advance(delay)
    request.resolve({ decision: 'allow', startedAt }); await flush()
    assert.equal(f.events.length, 1); assert.equal(f.state().completedRounds, 1); assert.equal(f.state().phase, 'shortBreak')
    assert.equal(f.state().remainingMs, Math.max(0, 60_000 - delay)); assert.equal(f.state().isRunning, delay < 60_000)
    if (delay > 60_000) { assert.equal(f.state().notice, 'clockGapExpired'); f.session.start(); assert.equal(f.events.length, 1) }
    f.session.dispose()
  }
})
console.log(`${groups} Pomodoro clock/controller groups passed (controlled ports; no real notifications or audio).`)
