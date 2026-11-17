import { DEFAULT_IDS, isValidTz, localParts, resolveCity, type City, type Local } from './worldClock.ts'

export const MEETING_CITY_LIMIT = 12
export const MEETING_MIN_YEAR = 1900
export const MEETING_MAX_YEAR = 9999
export const MEETING_MIN_MS = Date.UTC(MEETING_MIN_YEAR, 0, 1)
export const MEETING_MAX_MS = Date.UTC(MEETING_MAX_YEAR + 1, 0, 1) - 1000
export const MEETING_OFFSET_SCAN_MS = 30 * 60 * 1000
const SECOND = 1000, HOUR = 3600000, DAY = 86400000

export type MeetingErrorCode = 'cities' | 'instant' | 'date' | 'unavailableDate' | 'unsupportedDate' | 'workHours'
export class MeetingError extends Error {
  readonly code: MeetingErrorCode
  constructor(code: MeetingErrorCode) { super(code); this.name = 'MeetingError'; this.code = code }
}
export interface MeetingInterval { startMs: number; endMs: number }
export interface MeetingOffsetInterval extends MeetingInterval { offsetSeconds: number }
export interface MeetingDay extends MeetingInterval { tz: string; date: string; slots: MeetingInterval[]; totalMs: number }
export interface MeetingOverlap { intervals: MeetingInterval[]; totalMs: number; slotOverlapMs: number[] }

/** URL/storage cleanup preserves the order of valid IDs, never guesses an invalid IANA zone. */
export function parseMeetingCityIds(raw: unknown): string[] {
  if (typeof raw !== 'string' || raw.length > 4096) return []
  const ids: string[] = [], seen = new Set<string>()
  for (const part of raw.split(',')) {
    const id = part.trim()
    if (id.length > 100 || seen.has(id) || !resolveCity(id)) continue
    seen.add(id); ids.push(id)
    if (ids.length === MEETING_CITY_LIMIT) break
  }
  return ids
}

export function initialMeetingCityIds(urlValue: unknown, storedValue: unknown): string[] {
  const url = parseMeetingCityIds(urlValue), stored = parseMeetingCityIds(storedValue)
  return url.length ? url : stored.length ? stored : [...DEFAULT_IDS]
}

function validZones(tzs: readonly string[]): boolean {
  return Array.isArray(tzs) && tzs.length > 0 && tzs.length <= MEETING_CITY_LIMIT
    && tzs.every(tz => typeof tz === 'string' && tz.length <= 100 && isValidTz(tz))
}
const wholeSecond = (ms: number) => Number.isSafeInteger(ms) && ms % SECOND === 0
const yearInRange = (year: number) => year >= MEETING_MIN_YEAR && year <= MEETING_MAX_YEAR

/** UTC and every selected city's calendar year must be displayable. No rounding is performed. */
export function isMeetingInstant(ms: number, tzs: readonly string[]): boolean {
  if (!wholeSecond(ms) || ms < MEETING_MIN_MS || ms > MEETING_MAX_MS || !validZones(tzs)) return false
  try { return tzs.every(tz => yearInRange(localParts(tz, ms).y)) } catch { return false }
}

export function parseMeetingAt(raw: unknown, tzs: readonly string[]): number | null {
  if (typeof raw !== 'string' || raw.length > 16 || !/^-?\d+$/.test(raw)) return null
  const seconds = Number(raw)
  const ms = seconds * SECOND
  return Number.isSafeInteger(seconds) && isMeetingInstant(ms, tzs) ? ms : null
}

export const meetingDate = (parts: Pick<Local, 'y' | 'mo' | 'd'>) => `${String(parts.y).padStart(4, '0')}-${String(parts.mo).padStart(2, '0')}-${String(parts.d).padStart(2, '0')}`
function dateWallMs(date: string): number {
  if (typeof date !== 'string' || !/^\d{4}-\d\d-\d\d$/.test(date)) throw new MeetingError('date')
  const [y, mo, d] = date.split('-').map(Number), ms = Date.UTC(y, mo - 1, d), value = new Date(ms)
  if (!yearInRange(y) || value.getUTCFullYear() !== y || value.getUTCMonth() !== mo - 1 || value.getUTCDate() !== d) throw new MeetingError('date')
  return ms
}

/** Unlike offsetMin, this retains historical second-based offsets. Internal edge probes allow adjacent years. */
export function meetingOffsetSeconds(tz: string, ms: number): number {
  if (!wholeSecond(ms) || ms < MEETING_MIN_MS - 3 * DAY || ms > MEETING_MAX_MS + 4 * DAY) throw new MeetingError('instant')
  const p = localParts(tz, ms)
  return (Date.UTC(p.y, p.mo - 1, p.d, p.h, p.mi, p.s) - ms) / SECOND
}

/**
 * Intl exposes no next-transition query. Probe at 30-minute intervals, then locate a
 * detected change to the exact second. Assumes at most one offset transition per probe
 * interval; an out-and-back change inside one interval cannot be detected by this API.
 * This is a bounded planning helper, not a proof of all historical TZDB transitions.
 */
export function meetingOffsetIntervals(tz: string, startMs: number, endMs: number): MeetingOffsetInterval[] {
  if (!validZones([tz])) throw new MeetingError('cities')
  if (!wholeSecond(startMs) || !wholeSecond(endMs) || endMs <= startMs || endMs - startMs > 6 * DAY) throw new MeetingError('instant')
  const out: MeetingOffsetInterval[] = []
  let segmentStart = startMs, cursor = startMs, offset = meetingOffsetSeconds(tz, startMs)
  while (cursor < endMs) {
    const next = Math.min(cursor + MEETING_OFFSET_SCAN_MS, endMs)
    const probe = next === endMs ? endMs - SECOND : next
    if (meetingOffsetSeconds(tz, probe) === offset) { cursor = next; continue }
    let low = cursor + SECOND, high = probe
    while (low < high) {
      const middle = low + Math.floor((high - low) / (2 * SECOND)) * SECOND
      if (meetingOffsetSeconds(tz, middle) === offset) low = middle + SECOND
      else high = middle
    }
    out.push({ startMs: segmentStart, endMs: low, offsetSeconds: offset })
    if (out.length > 16) throw new MeetingError('unsupportedDate')
    segmentStart = cursor = low; offset = meetingOffsetSeconds(tz, low)
  }
  out.push({ startMs: segmentStart, endMs, offsetSeconds: offset })
  return out
}

function mergeIntervals(values: MeetingInterval[]): MeetingInterval[] {
  const out: MeetingInterval[] = []
  for (const interval of values.filter(v => v.endMs > v.startMs).sort((a, b) => a.startMs - b.startMs)) {
    const last = out[out.length - 1]
    if (last && interval.startMs <= last.endMs) last.endMs = Math.max(last.endMs, interval.endMs)
    else out.push({ ...interval })
  }
  return out
}

/** Resolve the entire actual local date, including repeated/missing midnight and partial final hours. */
export function meetingDay(tz: string, date: string): MeetingDay {
  const wall = dateWallMs(date)
  const offsets = meetingOffsetIntervals(tz, wall - 2 * DAY, wall + 3 * DAY)
  const intervals = mergeIntervals(offsets.map(part => ({
    startMs: Math.max(part.startMs, wall - part.offsetSeconds * SECOND),
    endMs: Math.min(part.endMs, wall + DAY - part.offsetSeconds * SECOND),
  })))
  if (!intervals.length) throw new MeetingError('unavailableDate')
  if (intervals.length !== 1) throw new MeetingError('unsupportedDate')
  const { startMs, endMs } = intervals[0], totalMs = endMs - startMs
  if (totalMs > 48 * HOUR || totalMs <= 0
    || meetingDate(localParts(tz, startMs)) !== date || meetingDate(localParts(tz, endMs - SECOND)) !== date) throw new MeetingError('unsupportedDate')
  const slots: MeetingInterval[] = []
  for (let ms = startMs; ms < endMs; ms += HOUR) slots.push({ startMs: ms, endMs: Math.min(ms + HOUR, endMs) })
  return { tz, date, startMs, endMs, totalMs, slots }
}

function intersectIntervals(left: MeetingInterval[], right: MeetingInterval[]): MeetingInterval[] {
  const out: MeetingInterval[] = []
  let a = 0, b = 0
  while (a < left.length && b < right.length) {
    const startMs = Math.max(left[a].startMs, right[b].startMs), endMs = Math.min(left[a].endMs, right[b].endMs)
    if (startMs < endMs) out.push({ startMs, endMs })
    if (left[a].endMs <= right[b].endMs) a++; else b++
  }
  return out
}

/** Intersect exact local weekday work boundaries inside each detected constant-offset interval. */
export function meetingWorkIntervals(tzs: readonly string[], day: MeetingDay, workStart: number, workEnd: number): MeetingOverlap {
  if (!validZones(tzs)) throw new MeetingError('cities')
  if (!Number.isInteger(workStart) || !Number.isInteger(workEnd) || workStart < 0 || workEnd > 24 || workStart >= workEnd) throw new MeetingError('workHours')
  let intervals: MeetingInterval[] = [{ startMs: day.startMs, endMs: day.endMs }]
  for (const tz of tzs) {
    const work: MeetingInterval[] = []
    for (const part of meetingOffsetIntervals(tz, day.startMs, day.endMs)) {
      const offset = part.offsetSeconds * SECOND
      const firstLocalDate = Math.floor((part.startMs + offset) / DAY) * DAY
      for (let date = firstLocalDate; date < part.endMs + offset; date += DAY) {
        const weekday = new Date(date).getUTCDay()
        if (weekday === 0 || weekday === 6) continue
        work.push({ startMs: Math.max(part.startMs, date + workStart * HOUR - offset), endMs: Math.min(part.endMs, date + workEnd * HOUR - offset) })
      }
    }
    intervals = intersectIntervals(intervals, mergeIntervals(work))
    if (!intervals.length) break
  }
  const totalMs = intervals.reduce((sum, value) => sum + value.endMs - value.startMs, 0)
  const slotOverlapMs = day.slots.map(slot => intervals.reduce((sum, range) => sum + Math.max(0, Math.min(slot.endMs, range.endMs) - Math.max(slot.startMs, range.startMs)), 0))
  return { intervals, totalMs, slotOverlapMs }
}

/** Highlight the containing slot only. Never use this index to reconstruct the selected instant. */
export function meetingSlotIndex(day: MeetingDay, instantMs: number): number {
  return day.slots.findIndex(slot => instantMs >= slot.startMs && instantMs < slot.endMs)
}

/** Called only for first initialization or an explicit date change, never for city reordering. */
export function defaultMeetingInstant(day: MeetingDay, tzs: readonly string[], overlap: MeetingOverlap): number {
  for (const interval of overlap.intervals) if (isMeetingInstant(interval.startMs, tzs)) return interval.startMs
  const candidates = day.slots.map(slot => slot.startMs).filter(ms => isMeetingInstant(ms, tzs))
  if (!candidates.length) throw new MeetingError('instant')
  const distance = (ms: number) => { const p = localParts(day.tz, ms); return Math.abs(p.h * 3600 + p.mi * 60 + p.s - 9 * 3600) }
  return candidates.reduce((best, ms) => distance(ms) < distance(best) ? ms : best)
}

export function meetingShareUrl(href: string, ids: readonly string[], instantMs: number): string {
  const clean = parseMeetingCityIds(ids.join(','))
  if (clean.length !== ids.length || clean.some((id, i) => id !== ids[i])) throw new MeetingError('cities')
  if (!isMeetingInstant(instantMs, clean.map(id => resolveCity(id)!.tz))) throw new MeetingError('instant')
  const url = new URL(href)
  url.searchParams.set('cities', clean.join(',')); url.searchParams.set('at', String(instantMs / SECOND))
  return url.toString()
}

export function formatMeetingOffset(seconds: number): string {
  if (!Number.isSafeInteger(seconds)) throw new MeetingError('instant')
  if (!seconds) return 'UTC±00:00'
  const abs = Math.abs(seconds), hour = Math.floor(abs / 3600), minute = Math.floor(abs / 60) % 60, second = abs % 60
  return `UTC${seconds > 0 ? '+' : '-'}${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}${second ? `:${String(second).padStart(2, '0')}` : ''}`
}

export function formatMeetingLocal(tz: string, instantMs: number, locale: 'ko' | 'en'): string {
  if (!isMeetingInstant(instantMs, [tz])) throw new MeetingError('instant')
  const p = localParts(tz, instantMs)
  const weekday = new Intl.DateTimeFormat(locale === 'ko' ? 'ko-KR' : 'en-US', { timeZone: tz, weekday: 'short' }).format(instantMs)
  const time = [p.h, p.mi, p.s].map(value => String(value).padStart(2, '0')).join(':')
  return `${meetingDate(p)} (${weekday}) ${time} ${formatMeetingOffset(meetingOffsetSeconds(tz, instantMs))}`
}

export function meetingShareLine(instantMs: number, cities: readonly City[], locale: 'ko' | 'en'): string {
  if (!isMeetingInstant(instantMs, cities.map(city => city.tz))) throw new MeetingError('instant')
  return cities.map(city => `${locale === 'ko' ? city.ko : city.en}: ${formatMeetingLocal(city.tz, instantMs, locale)}`).join('\n')
}
