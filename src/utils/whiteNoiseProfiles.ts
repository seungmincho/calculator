import { cloneWhiteNoiseSettings, isWhiteNoiseSettings, type WhiteNoiseSettings } from './whiteNoise.ts'

export const WHITE_NOISE_PROFILES_KEY = 'toolhub-white-noise-profiles-v1'
export const WHITE_NOISE_PROFILE_LIMIT = 6
export const WHITE_NOISE_PROFILE_NAME_LIMIT = 40
export const WHITE_NOISE_PROFILES_BYTES = 16 * 1024
export interface WhiteNoiseProfile { id: string; name: string; settings: WhiteNoiseSettings }
export interface WhiteNoiseProfilesSnapshot { raw: string | null; revision: number; profiles: WhiteNoiseProfile[] }
export type WhiteNoiseProfilesError = 'corrupt' | 'unsupported' | 'oversized' | 'unavailable' | 'quota' | 'conflict' | 'unconfirmed' | 'invalid' | 'name' | 'duplicateName' | 'limit' | 'missing'
export type WhiteNoiseProfilesRead = { ok: true; snapshot: WhiteNoiseProfilesSnapshot } | { ok: false; error: WhiteNoiseProfilesError }
export type WhiteNoiseProfileAction = { kind: 'add'; record: WhiteNoiseProfile } | { kind: 'rename'; id: string; name: string } | { kind: 'delete'; id: string }
type Reader = Pick<Storage, 'getItem'>
type Writer = Reader & Pick<Storage, 'setItem'>
const object = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value)
const exact = (value: Record<string, unknown>, keys: string[]) => Object.keys(value).length === keys.length && keys.every(key => Object.hasOwn(value, key))
const token = (value: unknown): value is string => typeof value === 'string' && /^[A-Za-z0-9_-]{1,80}$/.test(value)
const validName = (value: unknown): value is string => typeof value === 'string' && value === value.trim() && value.length > 0 && value.length <= WHITE_NOISE_PROFILE_NAME_LIMIT && !/[\u0000-\u001f\u007f]/.test(value)
const nameKey = (value: string) => value.normalize('NFKC').toLowerCase()
const profile = (value: unknown): value is WhiteNoiseProfile => object(value) && exact(value, ['id', 'name', 'settings']) && token(value.id) && validName(value.name) && isWhiteNoiseSettings(value.settings)
const cloneProfile = (value: WhiteNoiseProfile): WhiteNoiseProfile => ({ id: value.id, name: value.name, settings: cloneWhiteNoiseSettings(value.settings) })

export function parseWhiteNoiseProfiles(raw: string | null): WhiteNoiseProfilesRead {
  if (raw === null) return { ok: true, snapshot: { raw, revision: 0, profiles: [] } }
  if (raw.length > WHITE_NOISE_PROFILES_BYTES || new TextEncoder().encode(raw).length > WHITE_NOISE_PROFILES_BYTES) return { ok: false, error: 'oversized' }
  try {
    const value: unknown = JSON.parse(raw)
    if (!object(value) || !Number.isInteger(value.version)) return { ok: false, error: 'corrupt' }
    if (value.version !== 1) return { ok: false, error: 'unsupported' }
    if (!exact(value, ['version', 'revision', 'profiles']) || typeof value.revision !== 'number' || !Number.isSafeInteger(value.revision) || value.revision < 0
      || !Array.isArray(value.profiles) || value.profiles.length > WHITE_NOISE_PROFILE_LIMIT || !value.profiles.every(profile)) return { ok: false, error: 'corrupt' }
    const records = value.profiles as WhiteNoiseProfile[]
    if (new Set(records.map(item => item.id)).size !== records.length || new Set(records.map(item => nameKey(item.name))).size !== records.length) return { ok: false, error: 'corrupt' }
    return { ok: true, snapshot: { raw, revision: value.revision, profiles: records.map(cloneProfile) } }
  } catch { return { ok: false, error: 'corrupt' } }
}
export function readWhiteNoiseProfiles(storage: Reader): WhiteNoiseProfilesRead {
  try { return parseWhiteNoiseProfiles(storage.getItem(WHITE_NOISE_PROFILES_KEY)) }
  catch { return { ok: false, error: 'unavailable' } }
}
/** Reparse the authoritative raw; caller-mutated snapshot arrays cannot enter a write. */
export function applyWhiteNoiseProfileAction(raw: string | null, action: WhiteNoiseProfileAction): WhiteNoiseProfilesRead {
  const previous = parseWhiteNoiseProfiles(raw)
  if (!previous.ok) return previous
  const { profiles, revision } = previous.snapshot
  if (revision === Number.MAX_SAFE_INTEGER || !object(action)) return { ok: false, error: 'invalid' }
  let next: WhiteNoiseProfile[]
  if (action.kind === 'add' && exact(action, ['kind', 'record'])) {
    if (profiles.length >= WHITE_NOISE_PROFILE_LIMIT) return { ok: false, error: 'limit' }
    if (!object(action.record) || typeof action.record.name !== 'string' || !validName(action.record.name.trim())) return { ok: false, error: 'name' }
    const record = { ...action.record, name: action.record.name.trim() }
    if (!profile(record) || profiles.some(item => item.id === record.id)) return { ok: false, error: 'invalid' }
    if (profiles.some(item => nameKey(item.name) === nameKey(record.name))) return { ok: false, error: 'duplicateName' }
    next = [...profiles, cloneProfile(record)]
  } else if ((action.kind === 'rename' && exact(action, ['kind', 'id', 'name'])) || (action.kind === 'delete' && exact(action, ['kind', 'id']))) {
    if (!token(action.id)) return { ok: false, error: 'invalid' }
    if (!profiles.some(item => item.id === action.id)) return { ok: false, error: 'missing' }
    if (action.kind === 'rename') {
      if (typeof action.name !== 'string' || !validName(action.name.trim())) return { ok: false, error: 'name' }
      const name = action.name.trim()
      if (profiles.some(item => item.id !== action.id && nameKey(item.name) === nameKey(name))) return { ok: false, error: 'duplicateName' }
      next = profiles.map(item => item.id === action.id ? { ...item, name } : item)
    } else next = profiles.filter(item => item.id !== action.id)
  } else return { ok: false, error: 'invalid' }
  return parseWhiteNoiseProfiles(JSON.stringify({ version: 1, revision: revision + 1, profiles: next }))
}
/** Use withWhiteNoiseProfilesLock and a UI generation check before entering this synchronous CAS. */
export function writeWhiteNoiseProfileAction(snapshot: WhiteNoiseProfilesSnapshot, action: WhiteNoiseProfileAction, storage: Writer): WhiteNoiseProfilesRead {
  const next = applyWhiteNoiseProfileAction(snapshot.raw, action)
  if (!next.ok) return next
  try { if (storage.getItem(WHITE_NOISE_PROFILES_KEY) !== snapshot.raw) return { ok: false, error: 'conflict' } }
  catch { return { ok: false, error: 'unavailable' } }
  try { storage.setItem(WHITE_NOISE_PROFILES_KEY, next.snapshot.raw!) }
  catch (error) { return { ok: false, error: object(error) && error.name === 'QuotaExceededError' ? 'quota' : 'unavailable' } }
  try { if (storage.getItem(WHITE_NOISE_PROFILES_KEY) !== next.snapshot.raw) return { ok: false, error: 'unconfirmed' } }
  catch { return { ok: false, error: 'unconfirmed' } }
  return next
}
export function readWhiteNoiseProfileForLoad(snapshot: WhiteNoiseProfilesSnapshot, id: string, storage: Reader): { ok: true; record: WhiteNoiseProfile } | { ok: false; error: WhiteNoiseProfilesError } {
  const latest = readWhiteNoiseProfiles(storage)
  if (!latest.ok) return latest
  if (latest.snapshot.raw !== snapshot.raw) return { ok: false, error: 'conflict' }
  const found = latest.snapshot.profiles.find(item => item.id === id)
  return found ? { ok: true, record: cloneProfile(found) } : { ok: false, error: 'missing' }
}
export async function withWhiteNoiseProfilesLock<T>(action: () => T, signal?: AbortSignal): Promise<T> {
  signal?.throwIfAborted()
  if (typeof navigator === 'undefined' || !navigator.locks) return action()
  return navigator.locks.request(WHITE_NOISE_PROFILES_KEY, { mode: 'exclusive', ...(signal ? { signal } : {}) }, () => { signal?.throwIfAborted(); return action() })
}
