import { FONT_BY_ID } from './fontPreview.ts'
import { PAIR_SIZE_LIMITS, PAIR_WEIGHTS, type FontPairState } from './fontPairing.ts'

export const FONT_PAIR_PROFILES_KEY = 'toolhub:font-pair:profiles'
export const FONT_PAIR_PROFILE_LIMIT = 6
export const FONT_PAIR_PROFILE_NAME_LIMIT = 40
type PartStyle = { fontId: string; size: number; weight: number }
export interface FontPairStyles { title: PartStyle; body: PartStyle }
export interface FontPairProfile { id: string; name: string; styles: FontPairStyles }
type ReadError = 'invalidData' | 'unsupportedVersion' | 'unavailable'
export type FontPairProfilesSnapshot = { status: 'ready'; raw: string | null; profiles: FontPairProfile[] } | { status: ReadError }
export type FontPairProfilesError = ReadError | 'conflict' | 'quota' | 'invalidStyles' | 'invalidName' | 'duplicateName' | 'limit' | 'missingProfile' | 'invalidAction'
export type FontPairProfileAction = { kind: 'add'; id: string; name: string; styles: FontPairStyles } | { kind: 'delete'; id: string }
type WriteResult = { ok: true; snapshot: Extract<FontPairProfilesSnapshot, { status: 'ready' }> } | { ok: false; error: FontPairProfilesError }
type ProfileStorage = Pick<Storage, 'getItem' | 'setItem'>

const record = (value: unknown): value is Record<string, unknown> => value !== null && typeof value === 'object' && !Array.isArray(value)
const exactKeys = (value: Record<string, unknown>, keys: string[]) => Object.keys(value).length === keys.length && keys.every(key => Object.hasOwn(value, key))
const validId = (value: unknown): value is string => typeof value === 'string' && /^[a-zA-Z0-9_-]{1,80}$/.test(value)
const validName = (value: unknown): value is string => typeof value === 'string' && value === value.trim() && value.length > 0 && value.length <= FONT_PAIR_PROFILE_NAME_LIMIT && !/[\u0000-\u001f\u007f]/.test(value)
const nameKey = (name: string) => name.normalize('NFKC').toLowerCase()

export function isFontPairStyles(value: unknown): value is FontPairStyles {
  if (!record(value) || !exactKeys(value, ['title', 'body'])) return false
  return (['title', 'body'] as const).every(role => {
    const part = value[role], limits = PAIR_SIZE_LIMITS[role]
    return record(part) && exactKeys(part, ['fontId', 'size', 'weight'])
      && typeof part.fontId === 'string' && FONT_BY_ID.has(part.fontId)
      && typeof part.size === 'number' && Number.isInteger(part.size) && part.size >= limits.min && part.size <= limits.max
      && typeof part.weight === 'number' && PAIR_WEIGHTS.includes(part.weight)
  })
}

/** Explicit projection: manuscript text and any future runtime fields never enter storage. */
export function fontPairStyles(pair: FontPairState): FontPairStyles {
  return {
    title: { fontId: pair.title.fontId, size: pair.title.size, weight: pair.title.weight },
    body: { fontId: pair.body.fontId, size: pair.body.size, weight: pair.body.weight },
  }
}

export function applyFontPairStyles(pair: FontPairState, styles: unknown): FontPairState | null {
  if (!isFontPairStyles(styles)) return null
  return { title: { ...styles.title, text: pair.title.text }, body: { ...styles.body, text: pair.body.text } }
}

export function parseFontPairProfiles(raw: string | null): FontPairProfilesSnapshot {
  if (raw === null) return { status: 'ready', raw, profiles: [] }
  if (raw.length > 20_000) return { status: 'invalidData' }
  try {
    const data: unknown = JSON.parse(raw)
    if (!record(data) || !Number.isInteger(data.version)) return { status: 'invalidData' }
    if (data.version !== 1) return { status: 'unsupportedVersion' }
    if (!exactKeys(data, ['version', 'profiles']) || !Array.isArray(data.profiles) || data.profiles.length > FONT_PAIR_PROFILE_LIMIT) return { status: 'invalidData' }
    const ids = new Set<string>(), names = new Set<string>()
    for (const profile of data.profiles) {
      if (!record(profile) || !exactKeys(profile, ['id', 'name', 'styles']) || !validId(profile.id) || !validName(profile.name) || !isFontPairStyles(profile.styles)) return { status: 'invalidData' }
      if (ids.has(profile.id) || names.has(nameKey(profile.name))) return { status: 'invalidData' }
      ids.add(profile.id); names.add(nameKey(profile.name))
    }
    return { status: 'ready', raw, profiles: data.profiles as FontPairProfile[] }
  } catch { return { status: 'invalidData' } }
}

export function readFontPairProfiles(storage?: ProfileStorage): FontPairProfilesSnapshot {
  try { return parseFontPairProfiles((storage ?? window.localStorage).getItem(FONT_PAIR_PROFILES_KEY)) }
  catch { return { status: 'unavailable' } }
}

export function writeFontPairProfileAction(snapshot: FontPairProfilesSnapshot, action: FontPairProfileAction, storage?: ProfileStorage): WriteResult {
  if (snapshot.status !== 'ready') return { ok: false, error: snapshot.status }
  try {
    const target = storage ?? window.localStorage
    const current = readFontPairProfiles(target)
    if (current.status !== 'ready') return { ok: false, error: current.status }
    if (current.raw !== snapshot.raw) return { ok: false, error: 'conflict' }
    if (!record(action) || !validId(action.id)) return { ok: false, error: 'invalidAction' }
    let profiles = current.profiles
    if (action.kind === 'add') {
      if (!exactKeys(action, ['kind', 'id', 'name', 'styles']) || typeof action.name !== 'string') return { ok: false, error: 'invalidAction' }
      const name = action.name.trim()
      if (!validName(name)) return { ok: false, error: 'invalidName' }
      if (profiles.some(profile => nameKey(profile.name) === nameKey(name))) return { ok: false, error: 'duplicateName' }
      if (profiles.length >= FONT_PAIR_PROFILE_LIMIT) return { ok: false, error: 'limit' }
      if (!isFontPairStyles(action.styles) || profiles.some(profile => profile.id === action.id)) return { ok: false, error: 'invalidStyles' }
      profiles = [...profiles, { id: action.id, name, styles: { title: { ...action.styles.title }, body: { ...action.styles.body } } }]
    } else if (action.kind === 'delete' && exactKeys(action, ['kind', 'id'])) {
      if (!profiles.some(profile => profile.id === action.id)) return { ok: false, error: 'missingProfile' }
      profiles = profiles.filter(profile => profile.id !== action.id)
    } else return { ok: false, error: 'invalidAction' }
    const raw = JSON.stringify({ version: 1, profiles })
    target.setItem(FONT_PAIR_PROFILES_KEY, raw)
    if (target.getItem(FONT_PAIR_PROFILES_KEY) !== raw) return { ok: false, error: 'conflict' }
    return { ok: true, snapshot: { status: 'ready', raw, profiles } }
  } catch (error) {
    return { ok: false, error: error instanceof Error && error.name === 'QuotaExceededError' ? 'quota' : 'unavailable' }
  }
}

/** Cooperating tabs serialize writes; older snapshots are still rejected inside the lock. */
export async function withFontPairProfilesLock<T>(action: () => T): Promise<T> {
  if (typeof navigator === 'undefined' || !navigator.locks) return action()
  return navigator.locks.request(FONT_PAIR_PROFILES_KEY, action)
}
