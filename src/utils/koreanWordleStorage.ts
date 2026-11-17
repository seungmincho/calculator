import { MAX_GUESSES, VALID, dailyAnswer, dayNumber, type DailyRecords, type DayRecord, type LegacyStats } from './koreanWordle.ts'

export const WORDLE_KEYS = { daily: 'koreanWordle-daily-v1', settings: 'koreanWordle-settings-v1', legacy: ['koreanWordle_stats_2', 'koreanWordle_stats'] } as const
/** Protection budgets, not a claim that older valid records had a maximum size. */
export const WORDLE_STORAGE_LIMITS = { bytes: 8 * 1024 * 1024, days: 80_000 } as const
export type WordleStorageError = 'corrupt' | 'unsupported' | 'tooLarge' | 'unavailable' | 'conflict' | 'writeUnknown' | 'quota' | 'canceled' | 'invalidAction'
export type WordleRead<T> = { ok: true; raw: string | null; value: T } | { ok: false; raw?: string | null; error: WordleStorageError }
export interface WordleSettings { hard: boolean; contrast: boolean }
export type WordleStoragePort = Pick<Storage, 'getItem' | 'setItem'>
export type WordleLock = <T>(key: string, action: () => T, signal?: AbortSignal) => Promise<T>
export interface WordleWritePorts { storage?: WordleStoragePort; lock?: WordleLock; current?: () => boolean; signal?: AbortSignal }
export type WordleWrite<T> = { ok: true; snapshot: Extract<WordleRead<T>, { ok: true }>; alreadyApplied: boolean } | { ok: false; error: WordleStorageError }

const DAY_MS = 86_400_000, EPOCH = Date.UTC(2026, 0, 1)
const object = (value: unknown): value is Record<string, unknown> => value !== null && typeof value === 'object' && !Array.isArray(value)
const knownKeys = (value: Record<string, unknown>, keys: string[]) => Object.keys(value).every(key => keys.includes(key))
const counter = (value: unknown): value is number => typeof value === 'number' && Number.isSafeInteger(value) && value >= 0
const failed = <T>(error: WordleStorageError, raw?: string | null): WordleRead<T> => ({ ok: false, error, ...(raw === undefined ? {} : { raw }) })
const withinBytes = (raw: string) => raw.length <= WORDLE_STORAGE_LIMITS.bytes && new TextEncoder().encode(raw).length <= WORDLE_STORAGE_LIMITS.bytes

/** Supports pre-epoch day 0/negative values and the existing engine's actual Date range. */
export function wordleDate(day: number): string | null {
  if (!Number.isSafeInteger(day)) return null
  const ms = EPOCH + (day - 1) * DAY_MS
  if (!Number.isSafeInteger(ms) || Math.abs(ms) > 8_640_000_000_000_000 || dayNumber(ms - 9 * 3_600_000) !== day) return null
  return new Date(ms).toISOString().split('T')[0]
}

/** JSON.parse owns grammar. This scan only rejects duplicate decoded property names. */
function hasDuplicateKeys(raw: string): boolean {
  const stack: (Set<string> | null)[] = []
  for (let i = 0; i < raw.length; i++) {
    const char = raw[i]
    if (char === '{') stack.push(new Set())
    else if (char === '[') stack.push(null)
    else if (char === '}' || char === ']') stack.pop()
    else if (char === '"') {
      const start = i++
      for (; i < raw.length; i++) { if (raw[i] === '\\') i++; else if (raw[i] === '"') break }
      let next = i + 1
      while (/\s/.test(raw[next] ?? '') && next < raw.length) next++
      if (raw[next] === ':') {
        const key: string = JSON.parse(raw.slice(start, i + 1)), keys = stack[stack.length - 1]
        if (keys?.has(key)) return true
        keys?.add(key)
      }
    }
  }
  return false
}
function parseRaw(raw: string): { ok: true; value: unknown } | { ok: false; error: WordleStorageError } {
  if (!withinBytes(raw)) return { ok: false, error: 'tooLarge' }
  try { const value: unknown = JSON.parse(raw); return hasDuplicateKeys(raw) ? { ok: false, error: 'corrupt' } : { ok: true, value } }
  catch { return { ok: false, error: 'corrupt' } }
}
export function validWordleDayRecord(value: unknown, day: number): value is DayRecord {
  if (!object(value) || !knownKeys(value, ['guesses', 'hard']) || !Array.isArray(value.guesses) || value.guesses.length > MAX_GUESSES) return false
  if (Object.hasOwn(value, 'hard') && typeof value.hard !== 'boolean') return false
  const answer = dailyAnswer(day), guesses = value.guesses
  return guesses.every((guess, index) => typeof guess === 'string' && guess.length === 2 && VALID[2].has(guess) && (guess !== answer || index === guesses.length - 1))
}
export function parseDailyRecords(raw: string | null, today: number): WordleRead<DailyRecords> {
  if (!wordleDate(today)) return failed('invalidAction', raw)
  if (raw === null) return { ok: true, raw, value: {} }
  const parsed = parseRaw(raw)
  if (!parsed.ok) return failed(parsed.error, raw)
  if (!object(parsed.value)) return failed('corrupt', raw)
  const entries = Object.entries(parsed.value)
  if (entries.length > WORDLE_STORAGE_LIMITS.days) return failed('tooLarge', raw)
  for (const [key, record] of entries) {
    if (!/^(?:0|-?[1-9]\d*)$/.test(key) || !wordleDate(Number(key))) return failed('corrupt', raw)
    if (Number(key) > today || object(record) && !knownKeys(record, ['guesses', 'hard'])) return failed('unsupported', raw)
    if (!validWordleDayRecord(record, Number(key))) return failed('corrupt', raw)
  }
  return { ok: true, raw, value: parsed.value as DailyRecords }
}
export function parseWordleSettings(raw: string | null): WordleRead<WordleSettings> {
  if (raw === null) return { ok: true, raw, value: { hard: false, contrast: false } }
  const parsed = parseRaw(raw)
  if (!parsed.ok) return failed(parsed.error, raw)
  const value = parsed.value
  if (!object(value)) return failed('corrupt', raw)
  if (!knownKeys(value, ['hard', 'contrast'])) return failed('unsupported', raw)
  if (Object.keys(value).some(key => typeof value[key] !== 'boolean')) return failed('corrupt', raw)
  return { ok: true, raw, value: { hard: value.hard === true, contrast: value.contrast === true } }
}
export function parseLegacyStats(raw: string | null): WordleRead<LegacyStats | null> {
  if (raw === null) return { ok: true, raw, value: null }
  const parsed = parseRaw(raw)
  if (!parsed.ok) return failed(parsed.error, raw)
  const data = parsed.value
  if (!object(data)) return failed('corrupt', raw)
  const fields = ['gamesPlayed', 'gamesWon', 'maxStreak', 'currentStreak']
  if (fields.some(key => Object.hasOwn(data, key) && !counter(data[key]))) return failed('corrupt', raw)
  const dist = data.guessDistribution
  if (dist !== undefined && (!Array.isArray(dist) || dist.length > MAX_GUESSES || !dist.every(counter))) return failed('corrupt', raw)
  let lastDay = -1
  if (Object.hasOwn(data, 'lastPlayedDate')) {
    if (typeof data.lastPlayedDate !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(data.lastPlayedDate)) return failed('corrupt', raw)
    const date = new Date(data.lastPlayedDate + 'T00:00:00.000Z')
    if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== data.lastPlayedDate) return failed('corrupt', raw)
    lastDay = dayNumber(date.getTime() - 9 * 3_600_000)
  }
  return { ok: true, raw, value: { played: typeof data.gamesPlayed === 'number' ? data.gamesPlayed : 0, wins: typeof data.gamesWon === 'number' ? data.gamesWon : 0,
    maxStreak: typeof data.maxStreak === 'number' ? data.maxStreak : 0, streak: typeof data.currentStreak === 'number' ? data.currentStreak : 0,
    dist: Array.from({ length: MAX_GUESSES }, (_, index) => Array.isArray(dist) ? dist[index] ?? 0 : 0), lastDay } }
}
function read<T>(key: string, parse: (raw: string | null) => WordleRead<T>, storage?: WordleStoragePort): WordleRead<T> {
  try { return parse((storage ?? window.localStorage).getItem(key)) } catch { return failed('unavailable') }
}
export const readDailyRecords = (today: number, storage?: WordleStoragePort) => read(WORDLE_KEYS.daily, raw => parseDailyRecords(raw, today), storage)
export function readWordleStorage(today: number, storage?: WordleStoragePort) {
  const daily = readDailyRecords(today, storage), settings = read(WORDLE_KEYS.settings, parseWordleSettings, storage)
  const legacyReads = WORDLE_KEYS.legacy.map(key => ({ key, result: read(key, parseLegacyStats, storage) }))
  const selected = legacyReads.find(({ result }) => result.ok && result.value && result.value.played > 0)
  return { daily, settings, legacyReads, legacy: selected?.result.ok ? selected.result.value : null, legacyKey: selected?.key ?? null }
}
const defaultLock: WordleLock = (key, action, signal) => typeof navigator !== 'undefined' && navigator.locks
  ? navigator.locks.request(key, { mode: 'exclusive', ...(signal ? { signal } : {}) }, action) : Promise.resolve().then(action)
const current = (ports: WordleWritePorts) => !ports.signal?.aborted && (ports.current?.() ?? true)
const prefixOf = (prefix: readonly string[], list: readonly string[]) => prefix.length <= list.length && prefix.every((word, index) => word === list[index])
const writeError = (error: unknown): WordleStorageError => error instanceof Error && error.name === 'QuotaExceededError' ? 'quota' : 'unavailable'

/** Call only with an acknowledged basis; a failed/unknown write requires explicit reread. */
export async function appendDailyGuess(basis: WordleRead<DailyRecords>, input: { day: number; prefix: readonly string[]; hard: boolean; guess: string }, today: number, ports: WordleWritePorts = {}): Promise<WordleWrite<DailyRecords>> {
  if (!basis.ok) return { ok: false, error: basis.error }
  if (!input || !Array.isArray(input.prefix) || typeof input.hard !== 'boolean' || typeof input.guess !== 'string') return { ok: false, error: 'invalidAction' }
  const action = { ...input, prefix: [...input.prefix] }, desired = { guesses: [...input.prefix, input.guess], hard: input.hard }
  if (!wordleDate(action.day) || action.day > today || !validWordleDayRecord(desired, action.day)) return { ok: false, error: 'invalidAction' }
  const verifiedBasis = parseDailyRecords(basis.raw, today)
  if (!verifiedBasis.ok) return { ok: false, error: verifiedBasis.error }
  const base = verifiedBasis.value[action.day]
  if (base && (!prefixOf(base.guesses, action.prefix) || base.guesses.length > 0 && !!base.hard !== action.hard)) return { ok: false, error: 'invalidAction' }
  try {
    return await (ports.lock ?? defaultLock)(WORDLE_KEYS.daily, (): WordleWrite<DailyRecords> => {
      if (!current(ports)) return { ok: false, error: 'canceled' }
      const storage = ports.storage ?? window.localStorage, latest = readDailyRecords(today, storage)
      if (!latest.ok) return { ok: false, error: latest.error }
      const existing = latest.value[action.day], guesses = existing?.guesses ?? []
      if (guesses.length && !!existing?.hard !== action.hard) return { ok: false, error: 'conflict' }
      if (prefixOf(desired.guesses, guesses)) return { ok: true, snapshot: latest, alreadyApplied: true }
      if (guesses.length !== action.prefix.length || !prefixOf(action.prefix, guesses)) return { ok: false, error: 'conflict' }
      const value = { ...latest.value, [action.day]: desired }, raw = JSON.stringify(value)
      if (!withinBytes(raw) || Object.keys(value).length > WORDLE_STORAGE_LIMITS.days) return { ok: false, error: 'tooLarge' }
      if (!current(ports)) return { ok: false, error: 'canceled' }
      if (storage.getItem(WORDLE_KEYS.daily) !== latest.raw) return { ok: false, error: 'conflict' }
      try { storage.setItem(WORDLE_KEYS.daily, raw) } catch (error) { return { ok: false, error: writeError(error) } }
      try { if (storage.getItem(WORDLE_KEYS.daily) !== raw) return { ok: false, error: 'writeUnknown' } } catch { return { ok: false, error: 'writeUnknown' } }
      return { ok: true, snapshot: { ok: true, raw, value }, alreadyApplied: false }
    }, ports.signal)
  } catch (error) { return { ok: false, error: !current(ports) ? 'canceled' : writeError(error) } }
}
export async function writeWordleSettings(basis: WordleRead<WordleSettings>, settings: WordleSettings, ports: WordleWritePorts = {}): Promise<WordleWrite<WordleSettings>> {
  if (!basis.ok) return { ok: false, error: basis.error }
  const baseline = parseWordleSettings(basis.raw)
  if (!baseline.ok) return { ok: false, error: baseline.error }
  if (!object(settings) || !knownKeys(settings, ['hard', 'contrast']) || typeof settings.hard !== 'boolean' || typeof settings.contrast !== 'boolean') return { ok: false, error: 'invalidAction' }
  const raw = JSON.stringify(settings), checked = parseWordleSettings(raw)
  if (!checked.ok) return { ok: false, error: 'invalidAction' }
  try {
    return await (ports.lock ?? defaultLock)(WORDLE_KEYS.settings, (): WordleWrite<WordleSettings> => {
      if (!current(ports)) return { ok: false, error: 'canceled' }
      const storage = ports.storage ?? window.localStorage
      if (storage.getItem(WORDLE_KEYS.settings) !== basis.raw) return { ok: false, error: 'conflict' }
      try { storage.setItem(WORDLE_KEYS.settings, raw) } catch (error) { return { ok: false, error: writeError(error) } }
      try { if (storage.getItem(WORDLE_KEYS.settings) !== raw) return { ok: false, error: 'writeUnknown' } } catch { return { ok: false, error: 'writeUnknown' } }
      return { ok: true, snapshot: checked, alreadyApplied: false }
    }, ports.signal)
  } catch (error) { return { ok: false, error: !current(ports) ? 'canceled' : writeError(error) } }
}
