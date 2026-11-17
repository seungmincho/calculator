import { DEFAULT_POMODORO_SETTINGS, clonePomodoroTimer, isPomodoroPhaseId, isPomodoroSettings,
  isPomodoroTimerValue, isPomodoroWallTime, pomodoroDisplaySeconds, pomodoroExactFields,
  pomodoroInteger, pomodoroObject, type PomodoroSavedTimer, type PomodoroSettings,
  type PomodoroTask, type PomodoroTimerValue } from './pomodoroSession.ts'

export const POMODORO_STATE_KEYS = { settings: 'pomodoro-settings', tasks: 'pomodoro-tasks', timer: 'pomodoro-timer-state' } as const
export type PomodoroStateKind = keyof typeof POMODORO_STATE_KEYS
export const POMODORO_STATE_MAX_BYTES = { settings: 65_536, timer: 65_536, tasks: 2_097_152 } as const
export type PomodoroStateStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>
export type PomodoroStateError = 'corrupt' | 'unsupported' | 'oversized' | 'unavailable' | 'conflict' | 'quota' | 'unconfirmed' | 'invalid' | 'canceled'
export type PomodoroStateRead<T> = { ok: true; raw: string | null; value: T }
  | { ok: false; raw?: string | null; error: PomodoroStateError }
export type PomodoroStateWrite = { ok: true; raw: string | null } | { ok: false; error: PomodoroStateError }
export class PomodoroStateParseError extends Error {
  readonly code: 'corrupt' | 'unsupported' | 'oversized'
  constructor(code: 'corrupt' | 'unsupported' | 'oversized') { super(code); this.code = code; this.name = 'PomodoroStateParseError' }
}

const fail = (code: 'corrupt' | 'unsupported' | 'oversized' = 'corrupt'): never => { throw new PomodoroStateParseError(code) }
const parse = (kind: PomodoroStateKind, raw: string): unknown => {
  if (raw.length > POMODORO_STATE_MAX_BYTES[kind] || new TextEncoder().encode(raw).byteLength > POMODORO_STATE_MAX_BYTES[kind]) return fail('oversized')
  try { return JSON.parse(raw) } catch { return fail() }
}
const fields = ['phase', 'timeLeft', 'isRunning', 'currentRound', 'completedRounds', 'totalWorkSeconds', 'lastTickTime', 'settings']
const versionFields = [...fields, 'version', 'revision', 'phaseId', 'remainingMs']

export function parsePomodoroSettings(raw: string | null): PomodoroSettings {
  if (raw === null) return { ...DEFAULT_POMODORO_SETTINGS }
  const value = parse('settings', raw)
  if (!isPomodoroSettings(value)) return fail()
  return { ...value }
}

export function parsePomodoroTasks(raw: string | null): PomodoroTask[] {
  if (raw === null) return []
  const value = parse('tasks', raw)
  if (!Array.isArray(value)) return fail()
  const ids = new Set<string>(), tasks: PomodoroTask[] = []
  for (const task of value) {
    if (!pomodoroObject(task) || !pomodoroExactFields(task, ['id', 'text', 'completed', 'estimatedPomodoros', 'completedPomodoros'])
      || typeof task.id !== 'string' || !task.id || ids.has(task.id) || typeof task.text !== 'string'
      || typeof task.completed !== 'boolean' || !pomodoroInteger(task.estimatedPomodoros, 1) || !pomodoroInteger(task.completedPomodoros)) return fail()
    ids.add(task.id)
    tasks.push({ id: task.id, text: task.text, completed: task.completed, estimatedPomodoros: task.estimatedPomodoros, completedPomodoros: task.completedPomodoros })
  }
  return tasks
}

export function parsePomodoroTimer(raw: string | null): PomodoroSavedTimer | null {
  if (raw === null) return null
  const value = parse('timer', raw)
  if (!pomodoroObject(value)) return fail()
  const versioned = Object.hasOwn(value, 'version')
  if (versioned && value.version !== 1) return fail('unsupported')
  if (!pomodoroExactFields(value, versioned ? versionFields : fields) || !pomodoroInteger(value.timeLeft)
    || !isPomodoroWallTime(value.lastTickTime)) return fail()
  const remainingMs = versioned ? value.remainingMs : value.timeLeft * 1000
  const normalized = { ...value, remainingMs }
  if (!isPomodoroTimerValue(normalized)) return fail()
  if (versioned && (!pomodoroInteger(value.revision) || !isPomodoroPhaseId(value.phaseId)
    || value.timeLeft !== pomodoroDisplaySeconds(normalized.remainingMs))) return fail()
  return {
    phase: normalized.phase, remainingMs: normalized.remainingMs, isRunning: normalized.isRunning,
    currentRound: normalized.currentRound, completedRounds: normalized.completedRounds,
    totalWorkSeconds: normalized.totalWorkSeconds, settings: { ...normalized.settings },
    format: versioned ? 'v1' : 'legacy', revision: versioned ? value.revision as number : 0,
    phaseId: versioned ? value.phaseId as string : null, checkpointAt: value.lastTickTime,
  }
}

export function readPomodoroState<T>(storage: PomodoroStateStorage, kind: PomodoroStateKind, parser: (raw: string | null) => T): PomodoroStateRead<T> {
  let raw: string | null
  try { raw = storage.getItem(POMODORO_STATE_KEYS[kind]) } catch { return { ok: false, error: 'unavailable' } }
  try { return { ok: true, raw, value: parser(raw) } }
  catch (error) { return { ok: false, raw, error: error instanceof PomodoroStateParseError ? error.code : 'corrupt' } }
}

const isQuota = (error: unknown) => error instanceof Error && (error.name === 'QuotaExceededError' || error.name === 'NS_ERROR_DOM_QUOTA_REACHED')
const parsers = { settings: parsePomodoroSettings, tasks: parsePomodoroTasks, timer: parsePomodoroTimer }
function writeState(storage: PomodoroStateStorage, kind: PomodoroStateKind, expectedRaw: string | null, raw: string, signal?: AbortSignal): PomodoroStateWrite {
  if (signal?.aborted) return { ok: false, error: 'canceled' }
  try { parsers[kind](expectedRaw) } catch (error) { return { ok: false, error: error instanceof PomodoroStateParseError ? error.code : 'corrupt' } }
  try { parsers[kind](raw) } catch { return { ok: false, error: 'invalid' } }
  try { if (storage.getItem(POMODORO_STATE_KEYS[kind]) !== expectedRaw) return { ok: false, error: 'conflict' } }
  catch { return { ok: false, error: 'unavailable' } }
  if (signal?.aborted) return { ok: false, error: 'canceled' }
  try { storage.setItem(POMODORO_STATE_KEYS[kind], raw) }
  catch (error) { return { ok: false, error: isQuota(error) ? 'quota' : 'unavailable' } }
  try { if (storage.getItem(POMODORO_STATE_KEYS[kind]) !== raw) return { ok: false, error: 'unconfirmed' } }
  catch { return { ok: false, error: 'unconfirmed' } }
  return { ok: true, raw }
}

export function writePomodoroSettings(storage: PomodoroStateStorage, expectedRaw: string | null, settings: PomodoroSettings, signal?: AbortSignal): PomodoroStateWrite {
  if (!isPomodoroSettings(settings)) return { ok: false, error: 'invalid' }
  return writeState(storage, 'settings', expectedRaw, JSON.stringify(settings), signal)
}
export function writePomodoroTasks(storage: PomodoroStateStorage, expectedRaw: string | null, tasks: PomodoroTask[], signal?: AbortSignal): PomodoroStateWrite {
  let raw: string
  try { raw = JSON.stringify(tasks); parsePomodoroTasks(raw) } catch { return { ok: false, error: 'invalid' } }
  return writeState(storage, 'tasks', expectedRaw, raw, signal)
}
/** Normal checkpoints may upgrade strict legacy data; reading alone never calls this. */
export function writePomodoroTimer(storage: PomodoroStateStorage, expectedRaw: string | null, timer: PomodoroTimerValue, phaseId: string, wallMs: number, signal?: AbortSignal): PomodoroStateWrite {
  if (!isPomodoroTimerValue(timer) || !isPomodoroPhaseId(phaseId) || !isPomodoroWallTime(wallMs)) return { ok: false, error: 'invalid' }
  let previous: PomodoroSavedTimer | null
  try { previous = parsePomodoroTimer(expectedRaw) } catch (error) { return { ok: false, error: error instanceof PomodoroStateParseError ? error.code : 'corrupt' } }
  const revision = (previous?.revision ?? 0) + 1
  if (!pomodoroInteger(revision)) return { ok: false, error: 'invalid' }
  const value = clonePomodoroTimer(timer)
  const raw = JSON.stringify({ version: 1, revision, phaseId, remainingMs: value.remainingMs,
    phase: value.phase, timeLeft: pomodoroDisplaySeconds(value.remainingMs), isRunning: value.isRunning,
    currentRound: value.currentRound, completedRounds: value.completedRounds, totalWorkSeconds: value.totalWorkSeconds,
    lastTickTime: wallMs, settings: value.settings })
  return writeState(storage, 'timer', expectedRaw, raw, signal)
}

/** Only the UI's explicit discard confirmation may call this with the raw the user saw. */
export function discardPomodoroState(storage: PomodoroStateStorage, kind: PomodoroStateKind, expectedRaw: string, signal?: AbortSignal): PomodoroStateWrite {
  if (signal?.aborted) return { ok: false, error: 'canceled' }
  try { if (storage.getItem(POMODORO_STATE_KEYS[kind]) !== expectedRaw) return { ok: false, error: 'conflict' } }
  catch { return { ok: false, error: 'unavailable' } }
  if (signal?.aborted) return { ok: false, error: 'canceled' }
  try { storage.removeItem(POMODORO_STATE_KEYS[kind]) } catch { return { ok: false, error: 'unavailable' } }
  try { if (storage.getItem(POMODORO_STATE_KEYS[kind]) !== null) return { ok: false, error: 'unconfirmed' } }
  catch { return { ok: false, error: 'unconfirmed' } }
  return { ok: true, raw: null }
}

/** One key per call. Callers must finish this lock before requesting stats/tasks locks. */
export async function withPomodoroStateLock<T>(kind: PomodoroStateKind, signal: AbortSignal, action: () => T | Promise<T>, locks: Pick<LockManager, 'request'> | undefined = globalThis.navigator?.locks): Promise<T> {
  const run = () => { if (signal.aborted) throw new DOMException('Canceled', 'AbortError'); return action() }
  if (signal.aborted) throw new DOMException('Canceled', 'AbortError')
  return locks?.request ? locks.request(POMODORO_STATE_KEYS[kind], { mode: 'exclusive', signal }, run) : run()
}
