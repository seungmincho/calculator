import { isValidLunar, lunarToSolar, nextLunarAnniversary, type LunarDate, type SolarDate } from './lunarCalendar.ts'

export const LUNAR_ANNIVERSARIES_KEY = 'toolhub:lunar-anniversaries:v1'
export const LUNAR_ANNIVERSARY_LIMIT = 12
export const LUNAR_ANNIVERSARY_NAME_LIMIT = 40
export const LUNAR_ANNIVERSARY_RAW_LIMIT = 20000
export interface SavedLunarAnniversary { id: string; name: string; lunar: LunarDate }
export interface LunarAnniversarySnapshot { raw: string | null; revision: string | null; anniversaries: SavedLunarAnniversary[] }
export type LunarAnniversaryError = 'corrupt' | 'unsupported' | 'oversized' | 'unavailable' | 'quota' | 'conflict' | 'unverified' | 'invalid' | 'name' | 'limit' | 'missing'
export type LunarAnniversaryRead = { ok: true; snapshot: LunarAnniversarySnapshot } | { ok: false; error: LunarAnniversaryError }
export type LunarAnniversaryAction = { kind: 'add'; record: SavedLunarAnniversary } | { kind: 'rename'; id: string; name: string } | { kind: 'delete'; id: string }
type Reader = Pick<Storage, 'getItem'>
type Writer = Reader & Pick<Storage, 'setItem'>
const object = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value)
const exact = (value: Record<string, unknown>, keys: string[]) => Object.keys(value).length === keys.length && keys.every(key => Object.hasOwn(value, key))
const token = (value: unknown): value is string => typeof value === 'string' && /^[A-Za-z0-9_-]{1,80}$/.test(value)
const validName = (value: unknown): value is string => typeof value === 'string' && value === value.trim() && value.length > 0 && value.length <= LUNAR_ANNIVERSARY_NAME_LIMIT && !/[\u0000-\u001f\u007f]/.test(value)

/** A real original lunar date, including its leap-month year, within conversion coverage. */
export function isSavedLunarDate(value: unknown): value is LunarDate {
  if (!object(value) || !exact(value, ['year', 'month', 'day', 'isLeap']) || typeof value.isLeap !== 'boolean') return false
  const { year, month, day, isLeap } = value
  if (typeof year !== 'number' || typeof month !== 'number' || typeof day !== 'number' || ![year, month, day].every(Number.isInteger)) return false
  return isValidLunar(year, month, day, isLeap) && lunarToSolar(year, month, day, isLeap) !== null
}

function validRecord(value: unknown): value is SavedLunarAnniversary {
  return object(value) && exact(value, ['id', 'name', 'lunar']) && token(value.id) && validName(value.name) && isSavedLunarDate(value.lunar)
}

export function parseLunarAnniversaries(raw: string | null): LunarAnniversaryRead {
  if (raw === null) return { ok: true, snapshot: { raw, revision: null, anniversaries: [] } }
  if (raw.length > LUNAR_ANNIVERSARY_RAW_LIMIT) return { ok: false, error: 'oversized' }
  try {
    const data: unknown = JSON.parse(raw)
    if (!object(data)) return { ok: false, error: 'corrupt' }
    if (data.version !== 1) return { ok: false, error: Object.hasOwn(data, 'version') ? 'unsupported' : 'corrupt' }
    if (!exact(data, ['version', 'revision', 'anniversaries']) || !token(data.revision) || !Array.isArray(data.anniversaries) || data.anniversaries.length > LUNAR_ANNIVERSARY_LIMIT || !data.anniversaries.every(validRecord)) return { ok: false, error: 'corrupt' }
    if (new Set(data.anniversaries.map(record => record.id)).size !== data.anniversaries.length) return { ok: false, error: 'corrupt' }
    return { ok: true, snapshot: { raw, revision: data.revision, anniversaries: data.anniversaries } }
  } catch { return { ok: false, error: 'corrupt' } }
}

export function readLunarAnniversaries(storage: Reader): LunarAnniversaryRead {
  try { return parseLunarAnniversaries(storage.getItem(LUNAR_ANNIVERSARIES_KEY)) }
  catch { return { ok: false, error: 'unavailable' } }
}

export function nextSavedLunarAnniversary(record: SavedLunarAnniversary, today: SolarDate) {
  if (!validRecord(record) || !today || ![today.year, today.month, today.day].every(Number.isInteger)) return null
  const date = new Date(Date.UTC(today.year, today.month - 1, today.day))
  if (date.getUTCFullYear() !== today.year || date.getUTCMonth() + 1 !== today.month || date.getUTCDate() !== today.day) return null
  return nextLunarAnniversary(today, record.lunar.month, record.lunar.day, record.lunar.isLeap)
}

/** Caller serializes cooperating tabs with withLunarAnniversariesLock. */
export function writeLunarAnniversaryAction(snapshot: LunarAnniversarySnapshot, action: LunarAnniversaryAction, revision: string, storage: Writer): LunarAnniversaryRead {
  const previous = parseLunarAnniversaries(snapshot.raw)
  if (!previous.ok) return previous
  if (!token(revision) || revision === previous.snapshot.revision) return { ok: false, error: 'invalid' }
  const records = previous.snapshot.anniversaries
  let next: SavedLunarAnniversary[]
  if (action.kind === 'add') {
    if (records.length >= LUNAR_ANNIVERSARY_LIMIT) return { ok: false, error: 'limit' }
    if (typeof action.record?.name !== 'string' || !validName(action.record.name.trim())) return { ok: false, error: 'name' }
    const record = { ...action.record, name: action.record.name.trim() }
    if (!validRecord(record) || records.some(item => item.id === record.id)) return { ok: false, error: 'invalid' }
    next = [...records, structuredClone(record)]
  } else {
    const index = records.findIndex(record => record.id === action.id)
    if (index < 0) return { ok: false, error: 'missing' }
    if (action.kind === 'rename') {
      if (typeof action.name !== 'string' || !validName(action.name.trim())) return { ok: false, error: 'name' }
      next = records.map((record, position) => position === index ? { ...record, name: action.name.trim() } : record)
    } else if (action.kind === 'delete') next = records.filter((_, position) => position !== index)
    else return { ok: false, error: 'invalid' }
  }
  const raw = JSON.stringify({ version: 1, revision, anniversaries: next })
  const parsed = parseLunarAnniversaries(raw)
  if (!parsed.ok) return { ok: false, error: 'invalid' }
  try { if (storage.getItem(LUNAR_ANNIVERSARIES_KEY) !== snapshot.raw) return { ok: false, error: 'conflict' } }
  catch { return { ok: false, error: 'unavailable' } }
  try { storage.setItem(LUNAR_ANNIVERSARIES_KEY, raw) }
  catch (cause) { return { ok: false, error: object(cause) && cause.name === 'QuotaExceededError' ? 'quota' : 'unavailable' } }
  try { if (storage.getItem(LUNAR_ANNIVERSARIES_KEY) !== raw) return { ok: false, error: 'unverified' } }
  catch { return { ok: false, error: 'unverified' } }
  return parsed
}

/** Read-only recheck after the user confirms replacing the current inputs. */
export function readLunarAnniversaryForLoad(snapshot: LunarAnniversarySnapshot, id: string, storage: Reader): { ok: true; record: SavedLunarAnniversary } | { ok: false; error: LunarAnniversaryError } {
  const latest = readLunarAnniversaries(storage)
  if (!latest.ok) return latest
  if (latest.snapshot.raw !== snapshot.raw) return { ok: false, error: 'conflict' }
  const record = latest.snapshot.anniversaries.find(item => item.id === id)
  return record ? { ok: true, record: structuredClone(record) } : { ok: false, error: 'missing' }
}

/** Abort while waiting is supported; the UI must also reject stale input revisions. */
export async function withLunarAnniversariesLock<T>(action: () => T, signal?: AbortSignal): Promise<T> {
  signal?.throwIfAborted()
  if (typeof navigator === 'undefined' || !navigator.locks) return action()
  return navigator.locks.request(LUNAR_ANNIVERSARIES_KEY, { mode: 'exclusive', ...(signal ? { signal } : {}) }, () => { signal?.throwIfAborted(); return action() })
}
