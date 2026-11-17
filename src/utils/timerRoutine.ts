export const TIMER_ROUTINES_KEY = 'toolhub-timer-routines-v1'
export const ROUTINE_LIMITS = { stages: 12, seconds: 7200, repeats: 10, totalSeconds: 86400, profiles: 10, name: 40 } as const

export interface RoutineStage { name: string; seconds: number }
export interface TimerRoutineConfig { name: string; stages: RoutineStage[]; repeats: number }
export interface RoutineRun {
  routine: TimerRoutineConfig
  status: 'running' | 'paused' | 'done'
  cursor: number
  deadline: number
  remainingMs: number
}
export interface RoutineProfile { id: string; updatedAt: string; routine: TimerRoutineConfig }
export interface RoutineStore { version: 1; revision: string; profiles: RoutineProfile[] }
export type RoutineError = 'corrupt' | 'unsupported' | 'unavailable' | 'quota' | 'conflict' | 'invalid' | 'limit' | 'duplicate'
export type RoutineRead = { ok: true; raw: string | null; store: RoutineStore } | { ok: false; error: RoutineError }
type StoragePort = Pick<Storage, 'getItem' | 'setItem'>

const record = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value)
const cleanString = (value: unknown, max: number): value is string => typeof value === 'string' && !!value.trim() && value === value.trim() && value.length <= max && !/[\u0000-\u001f\u007f]/.test(value)
const integer = (value: unknown, max: number): value is number => typeof value === 'number' && Number.isInteger(value) && value >= 1 && value <= max
export const routineTotalSeconds = (routine: TimerRoutineConfig) => routine.stages.reduce((sum, stage) => sum + stage.seconds, 0) * routine.repeats

export function isTimerRoutine(value: unknown): value is TimerRoutineConfig {
  if (!record(value) || !cleanString(value.name, ROUTINE_LIMITS.name) || !integer(value.repeats, ROUTINE_LIMITS.repeats)) return false
  if (!Array.isArray(value.stages) || value.stages.length < 1 || value.stages.length > ROUTINE_LIMITS.stages) return false
  if (!value.stages.every(stage => record(stage) && cleanString(stage.name, ROUTINE_LIMITS.name) && integer(stage.seconds, ROUTINE_LIMITS.seconds))) return false
  return routineTotalSeconds(value as unknown as TimerRoutineConfig) <= ROUTINE_LIMITS.totalSeconds
}

const totalSteps = (run: RoutineRun) => run.routine.stages.length * run.routine.repeats
const stageMs = (run: RoutineRun, cursor: number) => run.routine.stages[cursor % run.routine.stages.length].seconds * 1000

export function startRoutine(routine: TimerRoutineConfig, now: number): RoutineRun | null {
  if (!isTimerRoutine(routine) || !Number.isFinite(now)) return null
  const snapshot = structuredClone(routine)
  const remainingMs = snapshot.stages[0].seconds * 1000
  return { routine: snapshot, status: 'running', cursor: 0, deadline: now + remainingMs, remainingMs }
}

/** Preserve each deadline when catching up: throttled tabs never stretch the routine. */
export function advanceRoutine(run: RoutineRun, now: number): { run: RoutineRun; crossed: number } {
  if (run.status !== 'running' || !Number.isFinite(now) || now < run.deadline) return { run, crossed: 0 }
  let cursor = run.cursor
  let deadline = run.deadline
  let crossed = 0
  const total = totalSteps(run)
  while (cursor < total && now >= deadline && crossed < ROUTINE_LIMITS.stages * ROUTINE_LIMITS.repeats) {
    cursor++; crossed++
    if (cursor < total) deadline += stageMs(run, cursor)
  }
  if (cursor >= total) return { run: { ...run, cursor: total, deadline, remainingMs: 0, status: 'done' }, crossed }
  return { run: { ...run, cursor, deadline, remainingMs: Math.max(0, deadline - now) }, crossed }
}

export function routineStageRemaining(run: RoutineRun, now: number): number {
  if (run.status === 'done') return 0
  return run.status === 'paused' || !Number.isFinite(now) ? run.remainingMs : Math.max(0, run.deadline - now)
}

export function routineTotalRemaining(run: RoutineRun, now: number): number {
  const current = advanceRoutine(run, now).run
  if (current.status === 'done') return 0
  let remaining = routineStageRemaining(current, now)
  for (let cursor = current.cursor + 1; cursor < totalSteps(current); cursor++) remaining += stageMs(current, cursor)
  return remaining
}

export function pauseRoutine(run: RoutineRun, now: number): RoutineRun {
  if (!Number.isFinite(now)) return run
  const current = advanceRoutine(run, now).run
  return current.status === 'running' ? { ...current, status: 'paused', remainingMs: routineStageRemaining(current, now) } : current
}

export function resumeRoutine(run: RoutineRun, now: number): RoutineRun {
  return run.status === 'paused' && Number.isFinite(now) ? { ...run, status: 'running', deadline: now + run.remainingMs } : run
}

/** User skips stay silent. A paused routine remains paused at the next full stage. */
export function skipRoutine(run: RoutineRun, now: number): RoutineRun {
  if (!Number.isFinite(now)) return run
  const current = advanceRoutine(run, now).run
  if (current.status === 'done') return current
  const cursor = current.cursor + 1
  if (cursor >= totalSteps(current)) return { ...current, cursor, status: 'done', remainingMs: 0, deadline: now }
  const remainingMs = stageMs(current, cursor)
  return { ...current, cursor, remainingMs, deadline: now + remainingMs }
}

export function parseRoutineStore(raw: string | null): RoutineRead {
  if (raw === null) return { ok: true, raw, store: { version: 1, revision: 'empty', profiles: [] } }
  try {
    if (raw.length > 100000) return { ok: false, error: 'corrupt' }
    const store: unknown = JSON.parse(raw)
    if (!record(store)) return { ok: false, error: 'corrupt' }
    if (store.version !== 1) return { ok: false, error: store.version === undefined ? 'corrupt' : 'unsupported' }
    if (!cleanString(store.revision, 128) || !Array.isArray(store.profiles) || store.profiles.length > ROUTINE_LIMITS.profiles) return { ok: false, error: 'corrupt' }
    const ids = new Set<string>(), names = new Set<string>()
    for (const profile of store.profiles) {
      if (!record(profile) || !cleanString(profile.id, 128) || ids.has(profile.id) || !isTimerRoutine(profile.routine)) return { ok: false, error: 'corrupt' }
      if (typeof profile.updatedAt !== 'string' || !/^\d{4}-\d{2}-\d{2}T/.test(profile.updatedAt) || !Number.isFinite(Date.parse(profile.updatedAt))) return { ok: false, error: 'corrupt' }
      const name = profile.routine.name.toLocaleLowerCase()
      if (names.has(name)) return { ok: false, error: 'corrupt' }
      ids.add(profile.id); names.add(name)
    }
    return { ok: true, raw, store: store as unknown as RoutineStore }
  } catch { return { ok: false, error: 'corrupt' } }
}

export const routineStorageError = (error: unknown): RoutineError => error instanceof Error && error.name === 'QuotaExceededError' ? 'quota' : 'unavailable'

export function readRoutineStore(storage: Pick<Storage, 'getItem'>): RoutineRead {
  try { return parseRoutineStore(storage.getItem(TIMER_ROUTINES_KEY)) }
  catch (error) { return { ok: false, error: routineStorageError(error) } }
}

export function appendRoutineProfile(store: RoutineStore, routine: TimerRoutineConfig, id: string, updatedAt: string): RoutineStore {
  if (!isTimerRoutine(routine)) throw new Error('invalid')
  if (store.profiles.length >= ROUTINE_LIMITS.profiles) throw new Error('limit')
  if (store.profiles.some(profile => profile.routine.name.toLocaleLowerCase() === routine.name.toLocaleLowerCase())) throw new Error('duplicate')
  const next: RoutineStore = { version: 1, revision: id, profiles: [...store.profiles, { id, updatedAt, routine: structuredClone(routine) }] }
  if (!parseRoutineStore(JSON.stringify(next)).ok) throw new Error('invalid')
  return next
}

export function writeRoutineStore(storage: StoragePort, expectedRaw: string | null, next: RoutineStore): { ok: true; raw: string } | { ok: false; error: RoutineError } {
  const expected = parseRoutineStore(expectedRaw)
  if (!expected.ok) return { ok: false, error: expected.error }
  const raw = JSON.stringify(next)
  if (!parseRoutineStore(raw).ok) return { ok: false, error: 'invalid' }
  try {
    if (storage.getItem(TIMER_ROUTINES_KEY) !== expectedRaw) return { ok: false, error: 'conflict' }
    storage.setItem(TIMER_ROUTINES_KEY, raw)
    if (storage.getItem(TIMER_ROUTINES_KEY) !== raw) return { ok: false, error: 'conflict' }
    return { ok: true, raw }
  } catch (error) { return { ok: false, error: routineStorageError(error) } }
}

/** Web Locks serialize tabs; older browsers retain comparison/readback but cannot make CAS atomic. */
export async function withRoutineStorageLock<T>(action: () => T): Promise<T> {
  if (typeof navigator === 'undefined' || !navigator.locks) return action()
  return navigator.locks.request(TIMER_ROUTINES_KEY, { mode: 'exclusive' }, action)
}
