import { GRADE_VALUES, computeStats, supersededIds, type GpaScale, type Semester } from './gpa.ts'

export const GPA_SCENARIOS_KEY = 'toolhub-gpa-scenarios-v1'
export const GPA_AUTOSAVE_KEY = 'gpa-calculator-v2'
export const GPA_SCENARIO_LIMIT = 8
export const GPA_SCENARIO_NAME_LIMIT = 40
export const GPA_LIMITS = { semesters: 32, coursesPerSemester: 100, courses: 1000, courseName: 200, credits: 30 } as const

export interface GpaSnapshot {
  scale: GpaScale
  semesters: (Semester & { isExpanded?: boolean })[]
  targetGpa: string
  remainingCredits: string
}

export interface GpaScenario {
  id: string
  name: string
  createdAt: string
  snapshot: GpaSnapshot
}

export interface GpaScenarioStore {
  version: 1
  revision: string
  scenarios: GpaScenario[]
}

export type GpaStorageError = 'corrupt' | 'unsupported' | 'unavailable' | 'quota' | 'conflict' | 'invalid' | 'limit' | 'name'
export type GpaReadResult = { ok: true; store: GpaScenarioStore; raw: string | null } | { ok: false; error: GpaStorageError }
type StoragePort = Pick<Storage, 'getItem' | 'setItem'>

const record = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value)
const idValid = (value: unknown): value is string => typeof value === 'string' && value.length > 0 && value.length <= 128 && !/[\u0000-\u001f\u007f]/.test(value)
const numericText = (value: unknown, maximum: number): value is string => typeof value === 'string' && (value === '' || (/^\d+(?:\.\d*)?$/.test(value) && Number(value) <= maximum && value.length <= 24))

/** Validate the whole snapshot; never silently discard or normalize saved courses. */
export function isGpaSnapshot(value: unknown): value is GpaSnapshot {
  if (!record(value) || (value.scale !== '4.5' && value.scale !== '4.3')) return false
  if (!numericText(value.targetGpa, 10) || !numericText(value.remainingCredits, 3000)) return false
  if (!Array.isArray(value.semesters) || !value.semesters.length || value.semesters.length > GPA_LIMITS.semesters) return false
  const ids = new Set<string>()
  let count = 0
  for (const semester of value.semesters) {
    if (!record(semester) || !idValid(semester.id) || ids.has(semester.id)) return false
    ids.add(semester.id)
    if (semester.isExpanded !== undefined && typeof semester.isExpanded !== 'boolean') return false
    if (!Array.isArray(semester.courses) || semester.courses.length > GPA_LIMITS.coursesPerSemester) return false
    count += semester.courses.length
    if (count > GPA_LIMITS.courses) return false
    for (const course of semester.courses) {
      if (!record(course) || !idValid(course.id) || ids.has(course.id)) return false
      ids.add(course.id)
      if (typeof course.name !== 'string' || course.name.length > GPA_LIMITS.courseName) return false
      if (typeof course.credits !== 'number' || !Number.isFinite(course.credits) || course.credits < 0 || course.credits > GPA_LIMITS.credits) return false
      if (typeof course.grade !== 'string' || !['', 'P', 'NP', ...Object.keys(GRADE_VALUES[value.scale])].includes(course.grade)) return false
      if (course.major !== undefined && typeof course.major !== 'boolean') return false
      if (course.retake !== undefined && typeof course.retake !== 'boolean') return false
    }
  }
  return true
}

export function parseGpaAutosave(raw: string | null): { ok: true; snapshot: GpaSnapshot | null } | { ok: false; error: GpaStorageError } {
  if (raw === null) return { ok: true, snapshot: null }
  try {
    const value: unknown = JSON.parse(raw)
    if (record(value) && value.version !== undefined) return { ok: false, error: 'unsupported' }
    // These fields were optional in early local saves.
    const snapshot = record(value) ? { ...value, targetGpa: value.targetGpa ?? '', remainingCredits: value.remainingCredits ?? '' } : value
    return isGpaSnapshot(snapshot) ? { ok: true, snapshot } : { ok: false, error: 'corrupt' }
  } catch { return { ok: false, error: 'corrupt' } }
}

export function parseGpaScenarios(raw: string | null): GpaReadResult {
  if (raw === null) return { ok: true, raw, store: { version: 1, revision: 'empty', scenarios: [] } }
  try {
    const store: unknown = JSON.parse(raw)
    if (!record(store)) return { ok: false, error: 'corrupt' }
    if (store.version !== 1) return { ok: false, error: store.version === undefined ? 'corrupt' : 'unsupported' }
    if (!idValid(store.revision) || !Array.isArray(store.scenarios) || store.scenarios.length > GPA_SCENARIO_LIMIT) return { ok: false, error: 'corrupt' }
    const ids = new Set<string>()
    for (const scenario of store.scenarios) {
      if (!record(scenario) || !idValid(scenario.id) || ids.has(scenario.id)) return { ok: false, error: 'corrupt' }
      ids.add(scenario.id)
      if (typeof scenario.name !== 'string' || !scenario.name.trim() || scenario.name !== scenario.name.trim() || scenario.name.length > GPA_SCENARIO_NAME_LIMIT) return { ok: false, error: 'corrupt' }
      if (typeof scenario.createdAt !== 'string' || !/^\d{4}-\d{2}-\d{2}T/.test(scenario.createdAt) || !Number.isFinite(Date.parse(scenario.createdAt))) return { ok: false, error: 'corrupt' }
      if (!isGpaSnapshot(scenario.snapshot)) return { ok: false, error: 'corrupt' }
    }
    return { ok: true, raw, store: store as unknown as GpaScenarioStore }
  } catch { return { ok: false, error: 'corrupt' } }
}

export function gpaStorageError(error: unknown): GpaStorageError {
  if (error instanceof Error && error.name === 'QuotaExceededError') return 'quota'
  return 'unavailable'
}

export function readGpaScenarios(storage: Pick<Storage, 'getItem'>): GpaReadResult {
  try { return parseGpaScenarios(storage.getItem(GPA_SCENARIOS_KEY)) }
  catch (error) { return { ok: false, error: gpaStorageError(error) } }
}

export function appendGpaScenario(store: GpaScenarioStore, snapshot: GpaSnapshot, name: string, id: string, createdAt: string): GpaScenarioStore {
  if (!name.trim() || name.trim().length > GPA_SCENARIO_NAME_LIMIT) throw new Error('name')
  if (store.scenarios.length >= GPA_SCENARIO_LIMIT) throw new Error('limit')
  if (!isGpaSnapshot(snapshot)) throw new Error('invalid')
  const scenario = { id, name: name.trim(), createdAt, snapshot: structuredClone(snapshot) }
  const next: GpaScenarioStore = { version: 1, revision: id, scenarios: [...store.scenarios, scenario] }
  if (!parseGpaScenarios(JSON.stringify(next)).ok) throw new Error('invalid')
  return next
}

/** Called inside an exclusive browser lock. Check raw bytes, including the missing-key case. */
export function writeGpaScenarios(storage: StoragePort, expectedRaw: string | null, next: GpaScenarioStore): { ok: true; raw: string } | { ok: false; error: GpaStorageError } {
  if (!parseGpaScenarios(expectedRaw).ok) return { ok: false, error: 'corrupt' }
  const raw = JSON.stringify(next)
  if (!parseGpaScenarios(raw).ok) return { ok: false, error: 'invalid' }
  try {
    if (storage.getItem(GPA_SCENARIOS_KEY) !== expectedRaw) return { ok: false, error: 'conflict' }
    storage.setItem(GPA_SCENARIOS_KEY, raw)
    if (storage.getItem(GPA_SCENARIOS_KEY) !== raw) return { ok: false, error: 'conflict' }
    return { ok: true, raw }
  } catch (error) { return { ok: false, error: gpaStorageError(error) } }
}

export function writeGpaAutosave(storage: StoragePort, expectedRaw: string | null, snapshot: GpaSnapshot): { ok: true; raw: string } | { ok: false; error: GpaStorageError } {
  if (!parseGpaAutosave(expectedRaw).ok) return { ok: false, error: 'corrupt' }
  if (!isGpaSnapshot(snapshot)) return { ok: false, error: 'invalid' }
  try {
    if (storage.getItem(GPA_AUTOSAVE_KEY) !== expectedRaw) return { ok: false, error: 'conflict' }
    const raw = JSON.stringify(snapshot)
    storage.setItem(GPA_AUTOSAVE_KEY, raw)
    if (storage.getItem(GPA_AUTOSAVE_KEY) !== raw) return { ok: false, error: 'conflict' }
    return { ok: true, raw }
  } catch (error) { return { ok: false, error: gpaStorageError(error) } }
}

/** Locks serialize modern browsers. Legacy fallback retains raw checks and readback. */
export async function withGpaStorageLock<T>(key: string, action: () => T): Promise<T> {
  if (typeof navigator === 'undefined' || !navigator.locks) return action()
  return navigator.locks.request(key, { mode: 'exclusive' }, action)
}

export function compareGpaSnapshots(current: GpaSnapshot, saved: GpaSnapshot) {
  const stats = (snapshot: GpaSnapshot) => computeStats(snapshot.semesters.flatMap(s => s.courses), snapshot.scale, supersededIds(snapshot.semesters))
  const currentStats = stats(current)
  const savedStats = stats(saved)
  const sameScale = current.scale === saved.scale
  return {
    current: currentStats,
    saved: savedStats,
    sameScale,
    gpaDifference: sameScale && currentStats.gpaCredits && savedStats.gpaCredits ? currentStats.gpa - savedStats.gpa : null,
    majorDifference: sameScale && currentStats.majorCredits && savedStats.majorCredits ? currentStats.majorGpa - savedStats.majorGpa : null,
    creditDifference: currentStats.earnedCredits - savedStats.earnedCredits,
  }
}
