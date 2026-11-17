import { MAX_SIDE, type Fit, type ResizeFormat, type SizeMode } from './imageResize.ts'

export const IMAGE_RESIZE_PROFILES_KEY = 'toolhub:image-resize:profiles'
export const IMAGE_RESIZE_PROFILE_LIMIT = 10
export const IMAGE_RESIZE_PROFILE_NAME_LIMIT = 40

/** Output settings only. File contents, filenames and per-photo crop positions never belong here. */
export interface ImageResizeProfileSettings {
  mode: SizeMode
  width: number
  height: number
  lock: boolean
  percent: number
  longSide: number
  fit: Fit
  format: ResizeFormat
  quality: number
  targetKB: number
  bg: string
}
export interface SavedImageResizeProfile {
  id: string
  name: string
  settings: ImageResizeProfileSettings
}
type ReadError = 'invalidData' | 'unsupportedVersion' | 'unavailable'
export type ImageResizeProfilesSnapshot =
  | { status: 'ready'; raw: string | null; profiles: SavedImageResizeProfile[] }
  | { status: ReadError }
export type ImageResizeProfilesError = ReadError | 'conflict' | 'invalidSettings' | 'invalidName' | 'duplicateName' | 'limit' | 'missingProfile' | 'webpChecking' | 'webpUnsupported'
export type ImageResizeProfileAction =
  | { kind: 'add'; id: string; name: string; settings: ImageResizeProfileSettings }
  | { kind: 'rename'; id: string; name: string }
  | { kind: 'delete'; id: string }
export type ImageResizeProfileWriteResult =
  | { ok: true; snapshot: Extract<ImageResizeProfilesSnapshot, { status: 'ready' }> }
  | { ok: false; error: ImageResizeProfilesError }
type ProfileStorage = Pick<Storage, 'getItem' | 'setItem'>

const record = (value: unknown): value is Record<string, unknown> => value !== null && typeof value === 'object' && !Array.isArray(value)
const exactKeys = (value: Record<string, unknown>, keys: string[]) => Object.keys(value).length === keys.length && keys.every((key) => Object.hasOwn(value, key))
const integer = (value: unknown, min: number, max: number): value is number => typeof value === 'number' && Number.isInteger(value) && value >= min && value <= max
const validId = (value: unknown): value is string => typeof value === 'string' && /^[a-zA-Z0-9_-]{1,80}$/.test(value)
const validName = (value: unknown): value is string => typeof value === 'string' && value === value.trim() && value.length > 0 && value.length <= IMAGE_RESIZE_PROFILE_NAME_LIMIT && !/[\u0000-\u001f\u007f]/.test(value)
const nameKey = (value: string) => value.normalize('NFKC').toLowerCase()

export function isImageResizeProfileSettings(value: unknown): value is ImageResizeProfileSettings {
  if (!record(value) || !exactKeys(value, ['mode', 'width', 'height', 'lock', 'percent', 'longSide', 'fit', 'format', 'quality', 'targetKB', 'bg'])) return false
  return ['px', 'pct', 'long'].includes(value.mode as string)
    && integer(value.width, 0, MAX_SIDE) && integer(value.height, 0, MAX_SIDE) && typeof value.lock === 'boolean'
    && integer(value.percent, 1, 400) && integer(value.longSide, 16, MAX_SIDE)
    && ['stretch', 'contain', 'cover'].includes(value.fit as string)
    && ['jpeg', 'png', 'webp'].includes(value.format as string)
    && integer(value.quality, 10, 100) && (value.targetKB === 0 || integer(value.targetKB, 10, 20000))
    && typeof value.bg === 'string' && /^#[0-9a-f]{6}$/i.test(value.bg)
}

export function imageResizeProfileApplyError(settings: unknown, webpSupported: boolean | null): ImageResizeProfilesError | null {
  if (!isImageResizeProfileSettings(settings)) return 'invalidSettings'
  if (settings.format === 'webp' && webpSupported === null) return 'webpChecking'
  if (settings.format === 'webp' && !webpSupported) return 'webpUnsupported'
  return null
}

/** Refuse an entire damaged/future list instead of dropping records and overwriting the original. */
export function parseImageResizeProfiles(raw: string | null): ImageResizeProfilesSnapshot {
  if (raw === null) return { status: 'ready', raw, profiles: [] }
  if (raw.length > 100000) return { status: 'invalidData' }
  try {
    const data: unknown = JSON.parse(raw)
    if (!record(data) || !Number.isInteger(data.version)) return { status: 'invalidData' }
    if (data.version !== 1) return { status: 'unsupportedVersion' }
    if (!exactKeys(data, ['version', 'profiles']) || !Array.isArray(data.profiles) || data.profiles.length > IMAGE_RESIZE_PROFILE_LIMIT) return { status: 'invalidData' }
    const ids = new Set<string>(), names = new Set<string>()
    for (const profile of data.profiles) {
      if (!record(profile) || !exactKeys(profile, ['id', 'name', 'settings']) || !validId(profile.id) || !validName(profile.name) || !isImageResizeProfileSettings(profile.settings)) return { status: 'invalidData' }
      if (ids.has(profile.id) || names.has(nameKey(profile.name))) return { status: 'invalidData' }
      ids.add(profile.id)
      names.add(nameKey(profile.name))
    }
    return { status: 'ready', raw, profiles: data.profiles as SavedImageResizeProfile[] }
  } catch {
    return { status: 'invalidData' }
  }
}

export function readImageResizeProfiles(storage?: ProfileStorage): ImageResizeProfilesSnapshot {
  try {
    return parseImageResizeProfiles((storage ?? window.localStorage).getItem(IMAGE_RESIZE_PROFILES_KEY))
  } catch {
    return { status: 'unavailable' }
  }
}

/** Compare the original raw snapshot before writing; callers use Web Locks when available. */
export function writeImageResizeProfileAction(snapshot: ImageResizeProfilesSnapshot, action: ImageResizeProfileAction, storage?: ProfileStorage): ImageResizeProfileWriteResult {
  if (snapshot.status !== 'ready') return { ok: false, error: snapshot.status }
  try {
    const target = storage ?? window.localStorage
    const current = readImageResizeProfiles(target)
    if (current.status !== 'ready') return { ok: false, error: current.status }
    if (current.raw !== snapshot.raw) return { ok: false, error: 'conflict' }
    let profiles = current.profiles
    if (action.kind === 'add' || action.kind === 'rename') {
      const name = action.name.trim()
      if (!validName(name)) return { ok: false, error: 'invalidName' }
      if (profiles.some((profile) => (action.kind === 'add' || profile.id !== action.id) && nameKey(profile.name) === nameKey(name))) return { ok: false, error: 'duplicateName' }
      if (action.kind === 'add') {
        if (profiles.length >= IMAGE_RESIZE_PROFILE_LIMIT) return { ok: false, error: 'limit' }
        if (!isImageResizeProfileSettings(action.settings) || !validId(action.id) || profiles.some((profile) => profile.id === action.id)) return { ok: false, error: 'invalidSettings' }
        profiles = [...profiles, { id: action.id, name, settings: { ...action.settings } }]
      } else {
        if (!profiles.some((profile) => profile.id === action.id)) return { ok: false, error: 'missingProfile' }
        profiles = profiles.map((profile) => profile.id === action.id ? { ...profile, name } : profile)
      }
    } else {
      if (!profiles.some((profile) => profile.id === action.id)) return { ok: false, error: 'missingProfile' }
      profiles = profiles.filter((profile) => profile.id !== action.id)
    }
    const raw = JSON.stringify({ version: 1, profiles })
    target.setItem(IMAGE_RESIZE_PROFILES_KEY, raw)
    if (target.getItem(IMAGE_RESIZE_PROFILES_KEY) !== raw) return { ok: false, error: 'conflict' }
    return { ok: true, snapshot: { status: 'ready', raw, profiles } }
  } catch {
    return { ok: false, error: 'unavailable' }
  }
}
