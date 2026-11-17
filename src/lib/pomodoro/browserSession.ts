import { createPomodoroSession, type PomodoroSessionPorts, type PomodoroSessionState, type PomodoroTransition } from './session.ts'
import { initialPomodoroTimer, restorePomodoroTimer, clonePomodoroTimer, type PomodoroSettings,
  type PomodoroTask, type PomodoroPhase, type PomodoroNotice } from '../../utils/pomodoroSession.ts'
import { POMODORO_STATE_KEYS, parsePomodoroSettings, parsePomodoroTasks, parsePomodoroTimer, readPomodoroState,
  writePomodoroSettings, writePomodoroTasks, writePomodoroTimer, discardPomodoroState, withPomodoroStateLock,
  type PomodoroStateKind, type PomodoroStateError, type PomodoroStateStorage, type PomodoroStateRead,
  type PomodoroStateWrite } from '../../utils/pomodoroPersistence.ts'

export interface PomodoroKeyState { status: 'ready' | PomodoroStateError; raw?: string | null; pending: boolean }
export interface PomodoroBrowserState {
  timer: PomodoroSessionState
  tasks: PomodoroTask[]
  stores: Record<PomodoroStateKind, PomodoroKeyState>
}
export interface PomodoroBrowserPorts extends Omit<PomodoroSessionPorts, 'authorizeCompletion'> {
  storage: () => PomodoroStateStorage
  activeTaskId: () => string | null
  onStorage: (callback: (key: string | null) => void) => () => void
  onCheckpoint: (callback: () => void) => () => void
  locks?: Pick<LockManager, 'request'>
}
const kinds: PomodoroStateKind[] = ['settings', 'tasks', 'timer']
const blocked = (store: PomodoroKeyState) => store.raw === undefined || ['corrupt', 'unsupported', 'oversized', 'conflict', 'unconfirmed'].includes(store.status)
export function initialPomodoroBrowserState(): PomodoroBrowserState {
  return { timer: { ...initialPomodoroTimer(), phaseId: 'initial', generation: 0, settling: false, notice: null }, tasks: [],
    stores: { settings: { status: 'ready', pending: false }, tasks: { status: 'ready', pending: false }, timer: { status: 'ready', pending: false } } }
}

/** Browser storage orchestration; all IO is injectable and no effect uses translated text. */
export function createPomodoroBrowserSession(ports: PomodoroBrowserPorts, onChange: (state: PomodoroBrowserState) => void,
  onTransition: (event: PomodoroTransition) => void) {
  let disposed = false, suppress = false, intent = 0
  let state = initialPomodoroBrowserState()
  const jobs: Partial<Record<PomodoroStateKind, AbortController>> = {}
  const epochs: Record<PomodoroStateKind, number> = { settings: 0, tasks: 0, timer: 0 }
  let explicit: AbortController | null = null
  let explicitKind: PomodoroStateKind | null = null
  let timer: ReturnType<typeof createPomodoroSession> | null = null
  const copy = (): PomodoroBrowserState => ({ timer: clonePomodoroTimer(state.timer), tasks: state.tasks.map(task => ({ ...task })),
    stores: { settings: { ...state.stores.settings }, tasks: { ...state.stores.tasks }, timer: { ...state.stores.timer } } })
  const emit = () => { if (!disposed) onChange(copy()) }
  const setStore = (kind: PomodoroStateKind, change: Partial<PomodoroKeyState>) => {
    state = { ...state, stores: { ...state.stores, [kind]: { ...state.stores[kind], ...change } } }; emit()
  }
  function read<T>(kind: PomodoroStateKind, parser: (raw: string | null) => T): PomodoroStateRead<T> {
    try { return readPomodoroState(ports.storage(), kind, parser) } catch { return { ok: false, error: 'unavailable' } }
  }
  function adoptRead<T>(kind: PomodoroStateKind, result: PomodoroStateRead<T>) {
    state.stores[kind] = { status: result.ok ? 'ready' : result.error, raw: result.raw, pending: false }
  }
  const settingsRead = read('settings', parsePomodoroSettings), tasksRead = read('tasks', parsePomodoroTasks), timerRead = read('timer', parsePomodoroTimer)
  adoptRead('settings', settingsRead); adoptRead('tasks', tasksRead); adoptRead('timer', timerRead)
  state.tasks = tasksRead.ok ? tasksRead.value : []
  let restored = { value: initialPomodoroTimer(settingsRead.ok ? settingsRead.value : undefined), notice: null as PomodoroNotice }
  if (timerRead.ok && timerRead.value) restored = restorePomodoroTimer(timerRead.value, ports.clock().wallMs)

  function cancelJob(kind: PomodoroStateKind) { jobs[kind]?.abort(); delete jobs[kind]; epochs[kind]++ }
  function failStore(kind: PomodoroStateKind, error: PomodoroStateError) {
    setStore(kind, { status: error, pending: false })
    if (kind === 'timer' && (error === 'conflict' || error === 'unconfirmed')) timer?.interruptConflict(error)
  }
  function acceptWrite(kind: PomodoroStateKind, result: PomodoroStateWrite) {
    if (result.ok) setStore(kind, { raw: result.raw, status: 'ready', pending: false })
    else if (result.error !== 'canceled') failStore(kind, result.error)
  }
  function save(kind: PomodoroStateKind) {
    cancelJob(kind)
    if (disposed || suppress || blocked(state.stores[kind])) return
    const controller = new AbortController(), epoch = epochs[kind]
    jobs[kind] = controller; setStore(kind, { pending: true })
    void withPomodoroStateLock(kind, controller.signal, () => {
      if (disposed || epoch !== epochs[kind] || controller.signal.aborted || blocked(state.stores[kind])) return
      const expected = state.stores[kind].raw!
      let result: PomodoroStateWrite
      try {
        const storage = ports.storage()
        if (kind === 'tasks') result = writePomodoroTasks(storage, expected, state.tasks, controller.signal)
        else if (kind === 'settings') result = writePomodoroSettings(storage, expected, state.timer.settings, controller.signal)
        else {
          const current = timer?.checkpoint()
          if (!current || current.settling || controller.signal.aborted || epoch !== epochs[kind]) return
          result = writePomodoroTimer(storage, expected, current, current.phaseId, ports.clock().wallMs, controller.signal)
        }
      } catch { result = { ok: false, error: 'unavailable' } }
      if (!disposed && epoch === epochs[kind]) acceptWrite(kind, result)
    }, ports.locks).catch(error => {
      if (!disposed && epoch === epochs[kind] && !controller.signal.aborted && !(error instanceof DOMException && error.name === 'AbortError')) failStore(kind, 'unavailable')
    }).finally(() => {
      if (!disposed && jobs[kind] === controller) { delete jobs[kind]; setStore(kind, { pending: false }) }
    })
  }
  timer = createPomodoroSession({ ...ports, authorizeCompletion: async (proposal, signal) => {
    cancelJob('timer')
    const stored = state.stores.timer
    if (stored.status === 'conflict' || stored.status === 'unconfirmed') return { decision: stored.status }
    // A blocked/corrupt key does not disable a memory-only session or rewrite its original.
    if (blocked(stored)) return { decision: 'allow', startedAt: ports.clock() }
    setStore('timer', { pending: true })
    try {
      return await withPomodoroStateLock('timer', signal, () => {
        const next = proposal.getNext()
        if (disposed || signal.aborted || !next) return { decision: 'conflict' as const }
        const startedAt = ports.clock()
        let result: PomodoroStateWrite
        try { result = writePomodoroTimer(ports.storage(), state.stores.timer.raw!, next, proposal.nextPhaseId, startedAt.wallMs, signal) }
        catch { result = { ok: false, error: 'unavailable' } }
        if (result.ok) setStore('timer', { raw: result.raw, status: 'ready', pending: false })
        else {
          setStore('timer', { status: result.error, pending: false })
          if (result.error === 'conflict' || result.error === 'unconfirmed' || result.error === 'canceled') return { decision: result.error === 'unconfirmed' ? 'unconfirmed' as const : 'conflict' as const }
        }
        return { decision: 'allow' as const, startedAt }
      }, ports.locks)
    } finally { if (!disposed && !signal.aborted) setStore('timer', { pending: false }) }
  } }, next => {
    const previous = state.timer
    state = { ...state, timer: next }; emit()
    if (suppress || disposed) return
    const changed = previous.generation !== next.generation || previous.phaseId !== next.phaseId
    if (next.settling) cancelJob('timer')
    else if (changed) save('timer')
  }, event => {
    if (disposed) return
    if (event.kind === 'completed' && event.phase === 'work') {
      const id = ports.activeTaskId()
      if (id && state.tasks.some(task => task.id === id && Number.isSafeInteger(task.completedPomodoros + 1))) {
        state = { ...state, tasks: state.tasks.map(task => task.id === id ? { ...task, completedPomodoros: task.completedPomodoros + 1 } : task) }
        emit(); save('tasks')
      }
    }
    onTransition(event)
  }, restored.value, restored.notice)
  state.timer = timer.getSnapshot()

  const onStorage = ports.onStorage(key => {
    for (const kind of kinds) {
      if (key !== null && key !== POMODORO_STATE_KEYS[kind]) continue
      let current: string | null
      try { current = ports.storage().getItem(POMODORO_STATE_KEYS[kind]) } catch { failStore(kind, 'unavailable'); continue }
      if (current !== state.stores[kind].raw) {
        cancelJob(kind); explicit?.abort(); intent++; failStore(kind, 'conflict')
      }
    }
  })
  const onCheckpoint = ports.onCheckpoint(() => { if (!disposed) save('timer') })
  const acted = () => {
    intent++; explicit?.abort(); explicit = null
    if (explicitKind) { setStore(explicitKind, { pending: false }); explicitKind = null }
  }
  function explicitOperation(kind: PomodoroStateKind, action: 'reload' | 'discard', expectedRaw?: string) {
    acted(); cancelJob(kind)
    const controller = new AbortController(), operationIntent = intent
    explicit = controller; explicitKind = kind; setStore(kind, { pending: true })
    const current = () => !disposed && !controller.signal.aborted && operationIntent === intent
    return withPomodoroStateLock(kind, controller.signal, () => {
      if (!current()) return false
      if (action === 'discard') {
        if (typeof expectedRaw !== 'string') return false
        let result: PomodoroStateWrite
        try { result = discardPomodoroState(ports.storage(), kind, expectedRaw, controller.signal) } catch { result = { ok: false, error: 'unavailable' } }
        if (!current()) return false
        acceptWrite(kind, result)
        if (result.ok && kind === 'timer' && timer) {
          const value = timer.getSnapshot()
          suppress = true; timer.replace({ ...value, isRunning: false }, value.remainingMs === 0 ? 'restoredExpired' : null); suppress = false
        }
        return result.ok
      }
      suppress = true
      try {
        if (kind === 'settings') {
          const result = read(kind, parsePomodoroSettings); adoptRead(kind, result)
          if (!result.ok) return false
          timer?.replace(initialPomodoroTimer(result.value))
        } else if (kind === 'tasks') {
          const result = read(kind, parsePomodoroTasks); adoptRead(kind, result)
          if (!result.ok) return false
          state = { ...state, tasks: result.value }
        } else {
          const result = read(kind, parsePomodoroTimer); adoptRead(kind, result)
          if (!result.ok) return false
          const restored = result.value ? restorePomodoroTimer(result.value, ports.clock().wallMs) : { value: initialPomodoroTimer(state.timer.settings), notice: null }
          timer?.replace(restored.value, restored.notice)
        }
        return true
      } finally { suppress = false; emit() }
    }, ports.locks).catch(error => {
      if (current() && !(error instanceof DOMException && error.name === 'AbortError')) failStore(kind, 'unavailable')
      return false
    }).finally(() => {
      if (explicit === controller) { explicit = null; explicitKind = null; if (!disposed) setStore(kind, { pending: false }) }
    })
  }
  const act = (action: (session: NonNullable<typeof timer>) => void) => { if (!disposed && timer) { acted(); action(timer) } }
  emit()
  return {
    getSnapshot: copy,
    start: () => act(value => value.start()), pause: () => act(value => value.pause()), skip: () => act(value => value.skip()),
    advanceExpired: () => act(value => value.advanceExpired()), resetPhase: () => act(value => value.resetPhase()), resetAll: () => act(value => value.resetAll()),
    selectPhase: (phase: PomodoroPhase) => act(value => value.selectPhase(phase)),
    applySettings(settings: PomodoroSettings) { act(value => value.applySettings(settings)); save('settings') },
    updatePreferences(preferences: Partial<Pick<PomodoroSettings, 'soundEnabled' | 'soundVolume' | 'notificationsEnabled' | 'autoStart'>>) {
      act(value => value.updatePreferences(preferences)); save('settings'); save('timer')
    },
    setTasks(update: PomodoroTask[] | ((tasks: PomodoroTask[]) => PomodoroTask[])) {
      if (disposed) return
      acted(); const tasks = typeof update === 'function' ? update(state.tasks.map(task => ({ ...task }))) : update
      state = { ...state, tasks: tasks.map(task => ({ ...task })) }; emit(); save('tasks')
    },
    reload: (kind: PomodoroStateKind) => explicitOperation(kind, 'reload'),
    discard: (kind: PomodoroStateKind, expectedRaw: string) => explicitOperation(kind, 'discard', expectedRaw),
    cancelPending() {
      acted(); for (const kind of kinds) { cancelJob(kind); setStore(kind, { pending: false }) }
      timer?.cancelSettlement()
    },
    dispose() { if (!disposed) { disposed = true; explicit?.abort(); for (const kind of kinds) cancelJob(kind); onStorage(); onCheckpoint(); timer?.dispose() } },
  }
}

export function pomodoroBrowserPorts(activeTaskId: () => string | null): PomodoroBrowserPorts {
  return {
    clock: () => ({ wallMs: Date.now(), monotonicMs: performance.now() }), nextPhaseId: () => crypto.randomUUID(),
    storage: () => localStorage, activeTaskId, locks: globalThis.navigator?.locks,
    every(callback, ms) { const id = setInterval(callback, ms); return () => clearInterval(id) },
    onReturn(callback) {
      const visible = () => { if (document.visibilityState === 'visible') callback() }
      document.addEventListener('visibilitychange', visible); window.addEventListener('pageshow', callback)
      return () => { document.removeEventListener('visibilitychange', visible); window.removeEventListener('pageshow', callback) }
    },
    onCheckpoint(callback) {
      const hidden = () => { if (document.visibilityState === 'hidden') callback() }
      document.addEventListener('visibilitychange', hidden); window.addEventListener('pagehide', callback)
      return () => { document.removeEventListener('visibilitychange', hidden); window.removeEventListener('pagehide', callback) }
    },
    onStorage(callback) { const listener = (event: StorageEvent) => callback(event.key); window.addEventListener('storage', listener); return () => window.removeEventListener('storage', listener) },
  }
}
