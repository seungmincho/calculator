import { clonePomodoroTimer, initialPomodoroTimer, isPomodoroPhaseId, isPomodoroSettings,
  isPomodoroTimerValue, nextPomodoroPhase, pomodoroPhaseMs, inspectPomodoroProgress, validatePomodoroClock,
  type PomodoroClock, type PomodoroNotice, type PomodoroPhase, type PomodoroSettings,
  type PomodoroTimerValue } from '../../utils/pomodoroSession.ts'

export interface PomodoroSessionState extends PomodoroTimerValue {
  phaseId: string
  generation: number
  settling: boolean
  notice: PomodoroNotice
}
export interface PomodoroTransition {
  kind: 'completed' | 'skipped' | 'expiredAdvance'
  phaseId: string
  phase: PomodoroPhase
  nextPhase: PomodoroPhase
  observedAt: number
  workMinutes: number
  settings: PomodoroSettings
}
export interface PomodoroCompletionProposal {
  phaseId: string
  generation: number
  observedAt: number
  next: PomodoroTimerValue
  nextPhaseId: string
  getNext: () => PomodoroTimerValue | null
}
export type PomodoroCompletionReceipt = { decision: 'allow'; startedAt: PomodoroClock }
  | { decision: 'conflict' | 'unconfirmed' }
export interface PomodoroSessionPorts {
  clock: () => PomodoroClock
  nextPhaseId: () => string
  every: (callback: () => void, ms: number) => () => void
  onReturn: (callback: () => void) => () => void
  authorizeCompletion?: (proposal: PomodoroCompletionProposal, signal: AbortSignal) => Promise<PomodoroCompletionReceipt>
}
type Pending = { generation: number; controller: AbortController }

/** Owns one phase. No storage, notifications, audio or React updater runs inside this module. */
export function createPomodoroSession(
  ports: PomodoroSessionPorts,
  onChange: (state: PomodoroSessionState) => void,
  onTransition: (event: PomodoroTransition) => void,
  initial: PomodoroTimerValue = initialPomodoroTimer(),
  initialNotice: PomodoroNotice = null,
) {
  if (!isPomodoroTimerValue(initial)) throw new Error('invalidTimer')
  const nextId = () => { const id = ports.nextPhaseId(); if (!isPomodoroPhaseId(id)) throw new Error('invalidPhaseId'); return id }
  let state: PomodoroSessionState = { ...clonePomodoroTimer(initial), phaseId: nextId(), generation: 0, settling: false, notice: initialNotice }
  let anchor: { remainingMs: number; startedAt: PomodoroClock; lastAt: number } | null = null
  let cleanups: (() => void)[] = [], pending: Pending | null = null, disposed = false
  const snapshot = () => clonePomodoroTimer(state)
  const emit = () => { if (!disposed) onChange(snapshot()) }
  const now = () => { const clock = ports.clock(); validatePomodoroClock(clock); return clock }
  const clearWatch = () => { const owned = cleanups; cleanups = []; for (const release of owned) release() }
  const invalidate = () => {
    clearWatch(); anchor = null; pending?.controller.abort(); pending = null
    state = { ...state, generation: state.generation + 1, settling: false }
  }
  const pauseWith = (notice: PomodoroNotice) => {
    invalidate(); state = { ...state, isRunning: false, notice }; emit()
  }
  const readRemaining = (clock: PomodoroClock) => {
    if (!anchor) return { remainingMs: state.remainingMs, uncertain: false }
    const progress = inspectPomodoroProgress(anchor.remainingMs, anchor.startedAt, clock, state.remainingMs, anchor.lastAt)
    anchor.lastAt = clock.monotonicMs
    return progress
  }
  const active = (item: Pending) => !disposed && pending === item && item.generation === state.generation && !item.controller.signal.aborted

  function watch(clock: PomodoroClock) {
    anchor = { remainingMs: state.remainingMs, startedAt: { ...clock }, lastAt: clock.monotonicMs }
    const generation = state.generation, id = state.phaseId
    const callback = () => { if (!disposed && state.generation === generation && state.phaseId === id) refresh() }
    cleanups.push(ports.every(callback, 250))
    cleanups.push(ports.onReturn(callback))
  }
  function install(value: PomodoroTimerValue, notice: PomodoroNotice, phaseId: string, clock: PomodoroClock) {
    invalidate()
    state = { ...clonePomodoroTimer(value), phaseId, generation: state.generation, settling: false, notice }
    if (state.isRunning && state.remainingMs > 0) watch(clock)
    emit()
  }

  async function complete(clock: PomodoroClock, startNext: boolean) {
    if (disposed || pending || !state.isRunning) return
    const previous = snapshot()
    let next: PomodoroTimerValue
    try { next = nextPomodoroPhase(previous, true) } catch { pauseWith('counterLimit'); return }
    next.isRunning = startNext && next.settings.autoStart
    let nextPhaseId: string
    try { nextPhaseId = nextId() } catch { pauseWith('counterLimit'); return }
    invalidate()
    state = { ...state, remainingMs: 0, isRunning: false, settling: true }
    const item: Pending = { generation: state.generation, controller: new AbortController() }
    pending = item
    emit()
    if (!active(item)) return
    try {
      const receipt: PomodoroCompletionReceipt = ports.authorizeCompletion
        ? await ports.authorizeCompletion({ phaseId: previous.phaseId, generation: item.generation,
          observedAt: clock.wallMs, next: clonePomodoroTimer(next), nextPhaseId,
          getNext: () => active(item) ? { ...clonePomodoroTimer(next), settings: { ...state.settings }, isRunning: startNext && state.settings.autoStart } : null }, item.controller.signal)
        : { decision: 'allow', startedAt: now() }
      if (!active(item)) return
      if (receipt.decision !== 'allow') { pauseWith(receipt.decision); return }
      validatePomodoroClock(receipt.startedAt)
      const appliedAt = now()
      // Preferences may change while the ownership check waits. They do not alter elapsed time.
      next.settings = { ...state.settings }
      next.isRunning = startNext && next.settings.autoStart
      let notice: PomodoroNotice = null
      if (next.isRunning) {
        const progress = inspectPomodoroProgress(next.remainingMs, receipt.startedAt, appliedAt)
        next.remainingMs = progress.remainingMs
        if (progress.uncertain || next.remainingMs === 0) {
          next.isRunning = false
          notice = next.remainingMs === 0 ? 'clockGapExpired' : 'clockChanged'
        }
      }
      // Remaining time is already advanced from the exact persisted start to appliedAt.
      install(next, notice, nextPhaseId, appliedAt)
      if (disposed || state.phaseId !== nextPhaseId) return
      onTransition({ kind: 'completed', phaseId: previous.phaseId, phase: previous.phase, nextPhase: next.phase,
        observedAt: clock.wallMs, workMinutes: previous.phase === 'work' ? previous.settings.workDuration : 0,
        settings: { ...next.settings } })
    } catch {
      if (active(item)) pauseWith('unconfirmed')
    }
  }

  function refresh() {
    if (disposed || !state.isRunning || pending) return
    try {
      const clock = ports.clock(), { remainingMs, uncertain } = readRemaining(clock)
      state = { ...state, remainingMs }
      if (uncertain) { pauseWith(remainingMs === 0 ? 'clockGapExpired' : 'clockChanged'); return }
      if (remainingMs === 0) void complete(clock, true)
      else emit()
    } catch { pauseWith('clockChanged') }
  }

  function start() {
    if (disposed || state.isRunning || pending || state.notice === 'restoredExpired' || state.notice === 'clockGapExpired'
      || state.notice === 'conflict' || state.notice === 'unconfirmed' || state.remainingMs === 0) return
    try { const clock = now(); invalidate(); state = { ...state, isRunning: true, notice: null }; watch(clock); emit() }
    catch { pauseWith('clockChanged') }
  }
  function pause() {
    if (disposed || !state.isRunning || pending) return
    try {
      const clock = ports.clock(), { remainingMs, uncertain } = readRemaining(clock)
      state = { ...state, remainingMs }
      if (uncertain) { pauseWith(remainingMs === 0 ? 'clockGapExpired' : 'clockChanged'); return }
      if (remainingMs === 0) { void complete(clock, false); return }
      pauseWith(null)
    } catch { pauseWith('clockChanged') }
  }
  function skip(expiredAdvance = false) {
    if (disposed || state.notice === 'conflict' || state.notice === 'unconfirmed'
      || (expiredAdvance && state.notice !== 'restoredExpired' && state.notice !== 'clockGapExpired')) return
    const previous = snapshot()
    try {
      const clock = now(), next = nextPomodoroPhase(previous, false), id = nextId()
      if (expiredAdvance) next.isRunning = true
      install(next, null, id, clock)
      if (disposed || state.phaseId !== id) return
      onTransition({ kind: expiredAdvance ? 'expiredAdvance' : 'skipped', phaseId: previous.phaseId,
        phase: previous.phase, nextPhase: next.phase, observedAt: clock.wallMs, workMinutes: 0,
        settings: { ...next.settings } })
    } catch { pauseWith('counterLimit') }
  }
  function reset(all = false) {
    if (disposed || state.notice === 'conflict' || state.notice === 'unconfirmed') return
    try {
      const clock = now()
      const value = all ? initialPomodoroTimer(state.settings)
        : { ...clonePomodoroTimer(state), remainingMs: pomodoroPhaseMs(state.phase, state.settings), isRunning: false }
      install(value, null, nextId(), clock)
    } catch { pauseWith('clockChanged') }
  }
  function applySettings(settings: PomodoroSettings) {
    if (disposed || state.notice === 'conflict' || state.notice === 'unconfirmed' || !isPomodoroSettings(settings)) return
    try { install(initialPomodoroTimer(settings), null, nextId(), now()) }
    catch { pauseWith('clockChanged') }
  }
  function selectPhase(phase: PomodoroPhase) {
    if (disposed || phase === state.phase || state.notice === 'conflict' || state.notice === 'unconfirmed') return
    try { install({ ...clonePomodoroTimer(state), phase, remainingMs: pomodoroPhaseMs(phase, state.settings), isRunning: false }, null, nextId(), now()) }
    catch { pauseWith('clockChanged') }
  }
  function updatePreferences(preferences: Partial<Pick<PomodoroSettings, 'soundEnabled' | 'soundVolume' | 'notificationsEnabled' | 'autoStart'>>) {
    if (disposed) return
    const settings = { ...state.settings, ...preferences }
    if (!isPomodoroSettings(settings)) return
    state = { ...state, settings }; emit()
  }
  function interruptConflict(notice: 'conflict' | 'unconfirmed' = 'conflict') {
    if (disposed) return
    if (state.isRunning) { try { state = { ...state, remainingMs: readRemaining(ports.clock()).remainingMs } } catch { /* Keep last verified time. */ } }
    pauseWith(notice)
  }
  function replace(value: PomodoroTimerValue, notice: PomodoroNotice = null) {
    if (disposed || !isPomodoroTimerValue(value)) return
    try { install(value, notice, nextId(), now()) } catch { pauseWith('clockChanged') }
  }
  function checkpoint(): PomodoroSessionState {
    refresh()
    return snapshot()
  }
  if (state.isRunning && state.remainingMs > 0) {
    try { watch(now()) } catch { clearWatch(); anchor = null; state = { ...state, isRunning: false, notice: 'clockChanged' } }
  } else if (state.remainingMs === 0) state = { ...state, isRunning: false, notice: initialNotice ?? 'restoredExpired' }

  return { getSnapshot: snapshot, refresh, start, pause, skip: () => skip(), advanceExpired: () => skip(true),
    resetPhase: () => reset(), resetAll: () => reset(true), applySettings, updatePreferences, selectPhase,
    cancelSettlement() { if (!disposed && pending) pauseWith('restoredExpired') },
    interruptConflict, replace, checkpoint,
    dispose() { if (disposed) return; disposed = true; invalidate() },
  }
}
