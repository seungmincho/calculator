import { CATEGORIES, findUnit, parseInput, type Category } from './units.ts'

export const UNIT_FAVORITES_KEY = 'toolhub:unit-converter:favorites'
export const UNIT_FAVORITES_LIMIT = 12
export const UNIT_FAVORITE_NAME_LIMIT = 40
export const UNIT_FAVORITE_PRECISIONS = [4, 6, 8, 10, 12, 15]

export interface UnitFavoritePair {
  c: Exclude<Category, 'traditional'>
  f: string
  t: string
  p: number
  rb: number
}
export interface UnitFavorite { id: string; name: string; pair: UnitFavoritePair }
export interface UnitRecent { c: Exclude<Category, 'traditional'>; f: string; t: string; v: string }
type ReadError = 'invalidData' | 'unsupportedVersion' | 'unavailable'
export type UnitFavoritesSnapshot =
  | { status: 'ready'; raw: string | null; favorites: UnitFavorite[] }
  | { status: ReadError }
export type UnitFavoritesError = ReadError | 'conflict' | 'invalidPair' | 'invalidName' | 'duplicateName' | 'duplicatePair' | 'limit' | 'missingFavorite'
export type UnitFavoriteAction =
  | { kind: 'add'; id: string; name: string; pair: UnitFavoritePair }
  | { kind: 'rename'; id: string; name: string }
  | { kind: 'delete'; id: string }
export type UnitFavoriteWriteResult =
  | { ok: true; snapshot: Extract<UnitFavoritesSnapshot, { status: 'ready' }> }
  | { ok: false; error: UnitFavoritesError }
type FavoriteStorage = Pick<Storage, 'getItem' | 'setItem'>

const record = (value: unknown): value is Record<string, unknown> => value !== null && typeof value === 'object' && !Array.isArray(value)
const exactKeys = (value: Record<string, unknown>, keys: string[]) => Object.keys(value).length === keys.length && keys.every((key) => Object.hasOwn(value, key))
const validId = (value: unknown): value is string => typeof value === 'string' && /^[a-zA-Z0-9_-]{1,80}$/.test(value)
const validName = (value: unknown): value is string => typeof value === 'string' && value === value.trim() && value.length > 0 && value.length <= UNIT_FAVORITE_NAME_LIMIT && !/[\u0000-\u001f\u007f]/.test(value)
const nameKey = (value: string) => value.normalize('NFKC').toLowerCase()
const validUnits = (value: Record<string, unknown>) => typeof value.c === 'string' && value.c !== 'traditional' && CATEGORIES.includes(value.c as Category)
  && typeof value.f === 'string' && typeof value.t === 'string' && !!findUnit(value.c as Category, value.f) && !!findUnit(value.c as Category, value.t)

export function isUnitFavoritePair(value: unknown): value is UnitFavoritePair {
  return record(value) && exactKeys(value, ['c', 'f', 't', 'p', 'rb']) && validUnits(value)
    && typeof value.p === 'number' && UNIT_FAVORITE_PRECISIONS.includes(value.p)
    && typeof value.rb === 'number' && Number.isFinite(value.rb) && value.rb > 0 && value.rb < 1000
}

export function sameUnitFavoritePair(a: UnitFavoritePair, b: UnitFavoritePair): boolean {
  return a.c === b.c && a.f === b.f && a.t === b.t && a.p === b.p && (a.c !== 'css' || a.rb === b.rb)
}

/** Explicit fields ensure even an unexpected `v` property can never replace current input. */
export function applyUnitFavorite<T extends { v: string }>(current: T, pair: UnitFavoritePair): T & UnitFavoritePair {
  return { ...current, c: pair.c, f: pair.f, t: pair.t, p: pair.p, rb: pair.rb }
}

export function isUnitRecent(value: unknown): value is UnitRecent {
  return record(value) && exactKeys(value, ['c', 'f', 't', 'v']) && validUnits(value)
    && typeof value.v === 'string' && value.v.length <= 1000 && Number.isFinite(parseInput(value.v))
}

/** Existing recent-history format stays separate; invalid records must not reach parseInput/render. */
export function parseUnitRecent(raw: string | null): { status: 'ready'; entries: UnitRecent[] } | { status: 'invalidData' } {
  if (raw === null) return { status: 'ready', entries: [] }
  if (raw.length > 100000) return { status: 'invalidData' }
  try {
    const data: unknown = JSON.parse(raw)
    if (!Array.isArray(data) || data.length > 8 || !data.every(isUnitRecent)) return { status: 'invalidData' }
    return { status: 'ready', entries: data }
  } catch { return { status: 'invalidData' } }
}

export function parseUnitFavorites(raw: string | null): UnitFavoritesSnapshot {
  if (raw === null) return { status: 'ready', raw, favorites: [] }
  if (raw.length > 100000) return { status: 'invalidData' }
  try {
    const data: unknown = JSON.parse(raw)
    if (!record(data) || !Number.isInteger(data.version)) return { status: 'invalidData' }
    if (data.version !== 1) return { status: 'unsupportedVersion' }
    if (!exactKeys(data, ['version', 'favorites']) || !Array.isArray(data.favorites) || data.favorites.length > UNIT_FAVORITES_LIMIT) return { status: 'invalidData' }
    const ids = new Set<string>(), names = new Set<string>()
    const pairs: UnitFavoritePair[] = []
    for (const favorite of data.favorites) {
      if (!record(favorite) || !exactKeys(favorite, ['id', 'name', 'pair']) || !validId(favorite.id) || !validName(favorite.name) || !isUnitFavoritePair(favorite.pair)) return { status: 'invalidData' }
      if (ids.has(favorite.id) || names.has(nameKey(favorite.name)) || pairs.some((pair) => sameUnitFavoritePair(pair, favorite.pair as UnitFavoritePair))) return { status: 'invalidData' }
      ids.add(favorite.id)
      names.add(nameKey(favorite.name))
      pairs.push(favorite.pair)
    }
    return { status: 'ready', raw, favorites: data.favorites as UnitFavorite[] }
  } catch { return { status: 'invalidData' } }
}

export function readUnitFavorites(storage?: FavoriteStorage): UnitFavoritesSnapshot {
  try { return parseUnitFavorites((storage ?? window.localStorage).getItem(UNIT_FAVORITES_KEY)) }
  catch { return { status: 'unavailable' } }
}

export function writeUnitFavoriteAction(snapshot: UnitFavoritesSnapshot, action: UnitFavoriteAction, storage?: FavoriteStorage): UnitFavoriteWriteResult {
  if (snapshot.status !== 'ready') return { ok: false, error: snapshot.status }
  try {
    const target = storage ?? window.localStorage
    const current = readUnitFavorites(target)
    if (current.status !== 'ready') return { ok: false, error: current.status }
    if (current.raw !== snapshot.raw) return { ok: false, error: 'conflict' }
    let favorites = current.favorites
    if (action.kind === 'add' || action.kind === 'rename') {
      const name = action.name.trim()
      if (!validName(name)) return { ok: false, error: 'invalidName' }
      if (favorites.some((favorite) => (action.kind === 'add' || favorite.id !== action.id) && nameKey(favorite.name) === nameKey(name))) return { ok: false, error: 'duplicateName' }
      if (action.kind === 'add') {
        if (!isUnitFavoritePair(action.pair) || !validId(action.id) || favorites.some((favorite) => favorite.id === action.id)) return { ok: false, error: 'invalidPair' }
        if (favorites.some((favorite) => sameUnitFavoritePair(favorite.pair, action.pair))) return { ok: false, error: 'duplicatePair' }
        if (favorites.length >= UNIT_FAVORITES_LIMIT) return { ok: false, error: 'limit' }
        favorites = [...favorites, { id: action.id, name, pair: { ...action.pair } }]
      } else {
        if (!favorites.some((favorite) => favorite.id === action.id)) return { ok: false, error: 'missingFavorite' }
        favorites = favorites.map((favorite) => favorite.id === action.id ? { ...favorite, name } : favorite)
      }
    } else {
      if (!favorites.some((favorite) => favorite.id === action.id)) return { ok: false, error: 'missingFavorite' }
      favorites = favorites.filter((favorite) => favorite.id !== action.id)
    }
    const raw = JSON.stringify({ version: 1, favorites })
    target.setItem(UNIT_FAVORITES_KEY, raw)
    if (target.getItem(UNIT_FAVORITES_KEY) !== raw) return { ok: false, error: 'conflict' }
    return { ok: true, snapshot: { status: 'ready', raw, favorites } }
  } catch { return { ok: false, error: 'unavailable' } }
}
