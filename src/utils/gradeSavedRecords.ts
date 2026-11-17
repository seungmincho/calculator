import { gradeOf, type GradeSystem } from './gradeRank.ts'

export const GRADE_RECORDS_KEY = 'toolhub-grade-records-v1'
export const GRADE_ENTRY_YEARS = [2021, 2022, 2023, 2024, 2025, 2026, 2027, 2028] as const
export const GRADE_RECORD_LIMITS = { count: 8, name: 40, rows: 30, subject: 80, numericText: 32, raw: 200000 } as const
export interface GradeRecordRow { name: string; units: string; rank: string; ties: string; total: string }
export interface GradeRecordSnapshot { entryYear: number; system: GradeSystem; rows: GradeRecordRow[] }
export interface GradeSavedRecord { id: string; name: string; createdAt: string; snapshot: GradeRecordSnapshot }
export interface GradeRecordStore { version: 1; revision: string; records: GradeSavedRecord[] }
export type GradeRecordError = 'corrupt' | 'unsupported' | 'unavailable' | 'quota' | 'conflict' | 'unconfirmed' | 'changed' | 'invalid' | 'limit' | 'name'
export type GradeRecordRead = { ok: true; raw: string | null; store: GradeRecordStore } | { ok: false; error: GradeRecordError }
type StoragePort = Pick<Storage, 'getItem' | 'setItem'>

const object = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value)
const keys = (value: Record<string, unknown>, allowed: string[]) => Object.keys(value).every(key => allowed.includes(key))
const text = (value: unknown, max: number): value is string => typeof value === 'string' && value.length <= max && !/[\u0000-\u001f\u007f]/.test(value)
const label = (value: unknown, max: number): value is string => text(value, max) && value.length > 0 && value.trim() === value
const timestamp = (value: unknown): value is string => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString() === value

/** Raw strings may be blank or academically invalid; persistence must not repair unfinished input. */
export function isGradeRecordSnapshot(value: unknown): value is GradeRecordSnapshot {
  if (!object(value) || !keys(value, ['entryYear', 'system', 'rows'])) return false
  if (!GRADE_ENTRY_YEARS.some(year => year === value.entryYear) || (value.system !== 5 && value.system !== 9)) return false
  if (!Array.isArray(value.rows) || value.rows.length < 1 || value.rows.length > GRADE_RECORD_LIMITS.rows) return false
  return value.rows.every(row => object(row) && keys(row, ['name', 'units', 'rank', 'ties', 'total']) && text(row.name, GRADE_RECORD_LIMITS.subject) && ['units', 'rank', 'ties', 'total'].every(key => text(row[key], GRADE_RECORD_LIMITS.numericText)))
}

export function parseGradeSavedRecords(raw: string | null): GradeRecordRead {
  if (raw === null) return { ok: true, raw, store: { version: 1, revision: 'empty', records: [] } }
  try {
    if (raw.length > GRADE_RECORD_LIMITS.raw) return { ok: false, error: 'corrupt' }
    const store: unknown = JSON.parse(raw)
    if (!object(store)) return { ok: false, error: 'corrupt' }
    if (store.version !== 1) return { ok: false, error: typeof store.version === 'number' && Number.isInteger(store.version) && store.version > 0 ? 'unsupported' : 'corrupt' }
    if (!keys(store, ['version', 'revision', 'records']) || !label(store.revision, 128) || !Array.isArray(store.records) || store.records.length > GRADE_RECORD_LIMITS.count) return { ok: false, error: 'corrupt' }
    const ids = new Set<string>()
    for (const saved of store.records) {
      if (!object(saved) || !keys(saved, ['id', 'name', 'createdAt', 'snapshot']) || !label(saved.id, 128) || !label(saved.name, GRADE_RECORD_LIMITS.name) || !timestamp(saved.createdAt) || !isGradeRecordSnapshot(saved.snapshot) || ids.has(saved.id)) return { ok: false, error: 'corrupt' }
      ids.add(saved.id)
    }
    return { ok: true, raw, store: store as unknown as GradeRecordStore }
  } catch { return { ok: false, error: 'corrupt' } }
}

export function gradeRecordStorageError(error: unknown): GradeRecordError {
  return error instanceof Error && error.name === 'QuotaExceededError' ? 'quota' : 'unavailable'
}

export function readGradeSavedRecords(storage: Pick<Storage, 'getItem'>): GradeRecordRead {
  try { return parseGradeSavedRecords(storage.getItem(GRADE_RECORDS_KEY)) }
  catch (error) { return { ok: false, error: gradeRecordStorageError(error) } }
}

export function appendGradeSavedRecord(store: GradeRecordStore, snapshot: GradeRecordSnapshot, name: string, id: string, createdAt: string): GradeRecordStore {
  if (!label(name.trim(), GRADE_RECORD_LIMITS.name)) throw new Error('name')
  if (!parseGradeSavedRecords(JSON.stringify(store)).ok || !isGradeRecordSnapshot(snapshot)) throw new Error('invalid')
  if (store.records.length >= GRADE_RECORD_LIMITS.count) throw new Error('limit')
  const next: GradeRecordStore = { version: 1, revision: id, records: [...store.records, { id, name: name.trim(), createdAt, snapshot: structuredClone(snapshot) }] }
  if (!parseGradeSavedRecords(JSON.stringify(next)).ok) throw new Error('invalid')
  return next
}

export function removeGradeSavedRecord(store: GradeRecordStore, id: string, revision: string): GradeRecordStore {
  if (!parseGradeSavedRecords(JSON.stringify(store)).ok || !store.records.some(saved => saved.id === id)) throw new Error('invalid')
  const next: GradeRecordStore = { ...store, revision, records: store.records.filter(saved => saved.id !== id) }
  if (!parseGradeSavedRecords(JSON.stringify(next)).ok) throw new Error('invalid')
  return next
}

/** Call under withGradeRecordLock. An unconfirmed write may already have reached storage. */
export function writeGradeSavedRecords(storage: StoragePort, expectedRaw: string | null, next: GradeRecordStore): { ok: true; raw: string } | { ok: false; error: GradeRecordError } {
  const expected = parseGradeSavedRecords(expectedRaw)
  if (!expected.ok) return { ok: false, error: expected.error }
  let raw: string
  try { raw = JSON.stringify(next) } catch { return { ok: false, error: 'invalid' } }
  if (!parseGradeSavedRecords(raw).ok) return { ok: false, error: 'invalid' }
  try {
    if (storage.getItem(GRADE_RECORDS_KEY) !== expectedRaw) return { ok: false, error: 'conflict' }
    storage.setItem(GRADE_RECORDS_KEY, raw)
  } catch (error) { return { ok: false, error: gradeRecordStorageError(error) } }
  try {
    if (storage.getItem(GRADE_RECORDS_KEY) !== raw) return { ok: false, error: 'unconfirmed' }
  } catch { return { ok: false, error: 'unconfirmed' } }
  return { ok: true, raw }
}

/** Web Locks serialize cooperating tabs; the fallback retains CAS/readback but is not atomic. */
export async function withGradeRecordLock<T>(action: () => T, signal?: AbortSignal): Promise<T> {
  signal?.throwIfAborted()
  if (typeof navigator === 'undefined' || !navigator.locks) return action()
  return navigator.locks.request(GRADE_RECORDS_KEY, { mode: 'exclusive', ...(signal ? { signal } : {}) }, action)
}

/** Number inputs may contain incomplete strings; parseFloat would incorrectly accept "2abc". */
export function gradeInputUnits(value: string): number | null {
  const trimmed = value.trim()
  if (!/^[+]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/.test(trimmed)) return null
  const units = Number(trimmed)
  return Number.isFinite(units) && units > 0 ? units : null
}

/** Reuse the current rank/tie calculation; never invent a grade for incomplete rows. */
export function summarizeGradeRecord(snapshot: GradeRecordSnapshot) {
  const integer = (value: string) => /^\d+$/.test(value.trim()) ? parseInt(value, 10) : NaN
  let validCount = 0, units = 0
  for (const row of snapshot.rows) {
    const grade = row.rank.trim() && row.total.trim() ? gradeOf(integer(row.rank), integer(row.ties || '1'), integer(row.total), snapshot.system) : null
    const weight = gradeInputUnits(row.units)
    if (grade && weight !== null) { validCount++; units += weight }
  }
  return { subjectCount: snapshot.rows.length, validCount, units }
}
