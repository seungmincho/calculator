import { INQ_SOC, INQ_SCI } from './csatGrade.ts'

export const CSAT_SCORE_RECORDS_KEY = 'toolhub-csat-score-records-v1'
export const CSAT_SCORE_RECORD_LIMIT = 12
export const CSAT_SCORE_RECORD_NAME_LIMIT = 40
export const CSAT_SCORE_RECORD_MAX_BYTES = 64 * 1024
export const CSAT_SCORE_FIELDS = ['kor', 'math', 'eng', 'hist', 'inq1', 'inq2'] as const
export type CsatScoreField = typeof CSAT_SCORE_FIELDS[number]
export interface CsatScoreSnapshot {
  examYear: number
  referenceYear: number
  scores: Record<CsatScoreField, string>
  selection: { kor: 'lm' | 'hj'; math: 'prob' | 'calc' | 'geo'; inq1: string; inq2: string }
}
export interface CsatScoreRecord { id: string; name: string; createdAt: string; snapshot: CsatScoreSnapshot }
export interface CsatScoreStore { version: 1; revision: string; records: CsatScoreRecord[] }
export type CsatScoreError = 'corrupt' | 'unsupported' | 'oversized' | 'unavailable' | 'quota' | 'conflict' | 'unverified' | 'invalid' | 'name' | 'limit' | 'missing' | 'stale'
export type CsatScoreRead = { ok: true; raw: string | null; store: CsatScoreStore } | { ok: false; error: CsatScoreError }
type StorageReader = Pick<Storage, 'getItem'>
type StoragePort = Pick<Storage, 'getItem' | 'setItem'>
const inquiry = new Set<string>([...INQ_SOC, ...INQ_SCI])
const object = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value)
const exact = (value: Record<string, unknown>, keys: readonly string[]) => Object.keys(value).length === keys.length && keys.every(key => Object.hasOwn(value, key))
const idValid = (value: unknown): value is string => typeof value === 'string' && /^[A-Za-z0-9_-]{1,80}$/.test(value)
const yearValid = (value: unknown): value is number => typeof value === 'number' && Number.isInteger(value) && value >= 1000 && value <= 9999
const nameValid = (value: unknown): value is string => typeof value === 'string' && value === value.trim() && value.length > 0 && value.length <= CSAT_SCORE_RECORD_NAME_LIMIT && !/[\u0000-\u001f\u007f]/.test(value)
const dateValid = (value: unknown): value is string => typeof value === 'string' && /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString() === value

/** Preserve empty and leading-zero input. Do not normalize malformed or out-of-range scores. */
export function isCsatRawScore(value: unknown, field: CsatScoreField): value is string {
  const max = field === 'hist' || field === 'inq1' || field === 'inq2' ? 50 : 100
  return typeof value === 'string' && (value === '' || (/^\d{1,3}$/.test(value) && Number(value) <= max))
}

export function isCsatScoreSnapshot(value: unknown): value is CsatScoreSnapshot {
  if (!object(value) || !exact(value, ['examYear', 'referenceYear', 'scores', 'selection']) || !yearValid(value.examYear) || !yearValid(value.referenceYear)) return false
  if (!object(value.scores) || !exact(value.scores, CSAT_SCORE_FIELDS)) return false
  if (!CSAT_SCORE_FIELDS.every(field => isCsatRawScore((value.scores as Record<string, unknown>)[field], field))) return false
  const selection = value.selection
  return object(selection) && exact(selection, ['kor', 'math', 'inq1', 'inq2'])
    && (selection.kor === 'lm' || selection.kor === 'hj')
    && (selection.math === 'prob' || selection.math === 'calc' || selection.math === 'geo')
    && typeof selection.inq1 === 'string' && inquiry.has(selection.inq1)
    && typeof selection.inq2 === 'string' && inquiry.has(selection.inq2)
}

export function parseCsatScoreRecords(raw: string | null): CsatScoreRead {
  if (raw === null) return { ok: true, raw, store: { version: 1, revision: 'empty', records: [] } }
  if (raw.length > CSAT_SCORE_RECORD_MAX_BYTES || new TextEncoder().encode(raw).length > CSAT_SCORE_RECORD_MAX_BYTES) return { ok: false, error: 'oversized' }
  try {
    const value: unknown = JSON.parse(raw)
    if (!object(value)) return { ok: false, error: 'corrupt' }
    if (value.version !== 1) return { ok: false, error: value.version === undefined ? 'corrupt' : 'unsupported' }
    if (!exact(value, ['version', 'revision', 'records']) || !idValid(value.revision) || !Array.isArray(value.records) || value.records.length > CSAT_SCORE_RECORD_LIMIT) return { ok: false, error: 'corrupt' }
    const ids = new Set<string>()
    for (const record of value.records) {
      if (!object(record) || !exact(record, ['id', 'name', 'createdAt', 'snapshot']) || !idValid(record.id) || ids.has(record.id) || !nameValid(record.name) || !dateValid(record.createdAt) || !isCsatScoreSnapshot(record.snapshot)) return { ok: false, error: 'corrupt' }
      ids.add(record.id)
    }
    return { ok: true, raw, store: value as unknown as CsatScoreStore }
  } catch { return { ok: false, error: 'corrupt' } }
}

export function csatScoreStorageError(cause: unknown): CsatScoreError {
  return object(cause) && cause.name === 'QuotaExceededError' ? 'quota' : 'unavailable'
}

export function readCsatScoreRecords(storage: StorageReader): CsatScoreRead {
  try { return parseCsatScoreRecords(storage.getItem(CSAT_SCORE_RECORDS_KEY)) }
  catch { return { ok: false, error: 'unavailable' } }
}

export function appendCsatScoreRecord(store: CsatScoreStore, snapshot: CsatScoreSnapshot, name: string, id: string, createdAt: string): CsatScoreStore {
  if (!nameValid(name.trim())) throw new Error('name')
  if (!isCsatScoreSnapshot(snapshot)) throw new Error('invalid')
  if (store.records.length >= CSAT_SCORE_RECORD_LIMIT) throw new Error('limit')
  const next: CsatScoreStore = { version: 1, revision: id, records: [...store.records, { id, name: name.trim(), createdAt, snapshot: structuredClone(snapshot) }] }
  if (!parseCsatScoreRecords(JSON.stringify(next)).ok) throw new Error('invalid')
  return next
}

export function removeCsatScoreRecord(store: CsatScoreStore, id: string, revision: string): CsatScoreStore {
  if (!store.records.some(record => record.id === id)) throw new Error('missing')
  const next: CsatScoreStore = { ...store, revision, records: store.records.filter(record => record.id !== id) }
  if (!parseCsatScoreRecords(JSON.stringify(next)).ok) throw new Error('invalid')
  return next
}

/** Call under the exclusive lock. A failed readback never claims rollback or success. */
export function writeCsatScoreRecords(storage: StoragePort, expectedRaw: string | null, next: CsatScoreStore): { ok: true; raw: string } | { ok: false; error: CsatScoreError } {
  const previous = parseCsatScoreRecords(expectedRaw)
  if (!previous.ok) return previous
  const raw = JSON.stringify(next)
  if (!parseCsatScoreRecords(raw).ok) return { ok: false, error: 'invalid' }
  try {
    if (storage.getItem(CSAT_SCORE_RECORDS_KEY) !== expectedRaw) return { ok: false, error: 'conflict' }
  } catch { return { ok: false, error: 'unavailable' } }
  try { storage.setItem(CSAT_SCORE_RECORDS_KEY, raw) }
  catch (cause) { return { ok: false, error: csatScoreStorageError(cause) } }
  try {
    if (storage.getItem(CSAT_SCORE_RECORDS_KEY) !== raw) return { ok: false, error: 'unverified' }
  } catch { return { ok: false, error: 'unverified' } }
  return { ok: true, raw }
}

/** Web Locks serialize supported tabs; fallback CAS/readback cannot guarantee atomic cross-tab writes. */
export async function withCsatScoreRecordsLock<T>(action: () => T): Promise<T> {
  if (typeof navigator === 'undefined' || !navigator.locks) return action()
  return navigator.locks.request(CSAT_SCORE_RECORDS_KEY, { mode: 'exclusive' }, action)
}

export function csatScoreSubject(field: CsatScoreField, snapshot: CsatScoreSnapshot): string {
  if (field === 'kor') return snapshot.selection.kor === 'lm' ? 'korLm' : 'korHj'
  if (field === 'math') return { prob: 'mathProb', calc: 'mathCalc', geo: 'mathGeo' }[snapshot.selection.math]
  if (field === 'eng') return 'english'
  if (field === 'hist') return 'koreanHistory'
  return snapshot.selection[field]
}

export function compareCsatScoreSnapshots(current: CsatScoreSnapshot, saved: CsatScoreSnapshot) {
  return CSAT_SCORE_FIELDS.map(field => {
    const a = current.scores[field], b = saved.scores[field]
    const reason = csatScoreSubject(field, current) !== csatScoreSubject(field, saved) ? 'differentSubject'
      : !isCsatRawScore(a, field) || !isCsatRawScore(b, field) ? 'invalidScore'
        : a === '' || b === '' ? 'missingScore' : null
    return { field, current: a, saved: b, reason, difference: reason ? null : Number(a) - Number(b) }
  })
}

/** An action becomes stale after cancellation, storage changes, or any committed input change. */
export function createCsatScoreActionGuard() {
  let generation = 0, context = ''
  return {
    update(next: string) { if (context !== next) { context = next; generation++ } },
    begin() { return ++generation },
    invalidate() { generation++ },
    isCurrent(token: number) { return token === generation },
  }
}
