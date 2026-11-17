import { addDays, isValidDate, type SavedDday } from './dday.ts'

export const DDAY_SAVED_KEY = 'dday-saved'
export const DDAY_CALENDAR_LIMIT = 100
export const DDAY_CALENDAR_TITLE_LIMIT = 2000
const SAVED_LIMIT = 1000

export type DdayCalendarErrorCode = 'empty' | 'tooMany' | 'invalidDate' | 'endDate' | 'invalidTitle' | 'invalidId' | 'duplicate' | 'selectionChanged' | 'timestamp' | 'download' | 'savedCorrupt' | 'savedUnsupported' | 'savedUnavailable' | 'savedQuota' | 'savedConflict'
export class DdayCalendarError extends Error {
  code: DdayCalendarErrorCode
  constructor(code: DdayCalendarErrorCode) { super(code); this.name = 'DdayCalendarError'; this.code = code }
}
export interface DdayCalendarEvent { id?: string; title: string; date: string }

const object = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value)
const idValid = (value: unknown): value is string => typeof value === 'string' && value.length > 0 && value.length <= 200 && !/[\u0000-\u001f\u007f]/.test(value)
function textValid(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0 && value.length <= DDAY_CALENDAR_TITLE_LIMIT &&
    !/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(value) &&
    !Array.from(value).some(character => { const point = character.codePointAt(0)!; return point >= 0xd800 && point <= 0xdfff })
}

/** Preserve the complete saved list on any bad entry; never silently filter and rewrite it. */
export function parseSavedDdays(raw: string | null): SavedDday[] {
  if (raw === null) return []
  let value: unknown
  try { value = JSON.parse(raw) } catch { throw new DdayCalendarError('savedCorrupt') }
  if (object(value) && 'version' in value) throw new DdayCalendarError('savedUnsupported')
  if (!Array.isArray(value) || value.length > SAVED_LIMIT) throw new DdayCalendarError('savedCorrupt')
  const ids = new Set<string>()
  for (const item of value) {
    if (!object(item) || !idValid(item.id) || ids.has(item.id) || !textValid(item.title) || typeof item.date !== 'string' || !isValidDate(item.date) || (item.pinned !== undefined && typeof item.pinned !== 'boolean')) throw new DdayCalendarError('savedCorrupt')
    ids.add(item.id)
  }
  return value as SavedDday[]
}

export function ddayCalendarErrorCode(error: unknown, fallback: DdayCalendarErrorCode = 'download'): DdayCalendarErrorCode {
  if (error instanceof DdayCalendarError) return error.code
  if (error instanceof Error && error.name === 'QuotaExceededError') return 'savedQuota'
  return fallback
}

export function writeSavedDdays(storage: Pick<Storage, 'getItem' | 'setItem'>, expectedRaw: string | null, next: SavedDday[]): string {
  parseSavedDdays(expectedRaw)
  const raw = JSON.stringify(next)
  parseSavedDdays(raw)
  if (storage.getItem(DDAY_SAVED_KEY) !== expectedRaw) throw new DdayCalendarError('savedConflict')
  storage.setItem(DDAY_SAVED_KEY, raw)
  if (storage.getItem(DDAY_SAVED_KEY) !== raw) throw new DdayCalendarError('savedConflict')
  return raw
}

export async function withDdaySavedLock<T>(action: () => T): Promise<T> {
  return typeof navigator !== 'undefined' && navigator.locks ? navigator.locks.request(DDAY_SAVED_KEY, { mode: 'exclusive' }, action) : action()
}

export function selectDdayCalendarEvents(saved: SavedDday[], ids: string[]): DdayCalendarEvent[] {
  if (!ids.length) throw new DdayCalendarError('empty')
  if (ids.length > DDAY_CALENDAR_LIMIT) throw new DdayCalendarError('tooMany')
  if (new Set(ids).size !== ids.length) throw new DdayCalendarError('duplicate')
  const map = new Map(saved.map(item => [item.id, item]))
  return ids.map(id => {
    const item = map.get(id)
    if (!item) throw new DdayCalendarError('selectionChanged')
    return { id: item.id, title: item.title, date: item.date }
  })
}

/** RFC 5545 §3.3.11: escape TEXT before folding, so data cannot start a new property. */
export function escapeCalendarText(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/\r\n|\r|\n/g, '\\n').replace(/;/g, '\\;').replace(/,/g, '\\,')
}

/** RFC 5545 §3.1: fold at 75 UTF-8 octets, counting the continuation space. */
export function foldCalendarLine(line: string): string {
  const encoder = new TextEncoder()
  let folded = '', physical = '', length = 0
  for (const character of line) {
    const bytes = encoder.encode(character).length
    if (length + bytes > 75) { folded += `${physical}\r\n`; physical = ' '; length = 1 }
    physical += character
    length += bytes
  }
  return folded + physical
}

function validateEvent(event: DdayCalendarEvent): string {
  if (!event || !textValid(event.title)) throw new DdayCalendarError('invalidTitle')
  if (event.id !== undefined && !idValid(event.id)) throw new DdayCalendarError('invalidId')
  if (typeof event.date !== 'string' || !isValidDate(event.date)) throw new DdayCalendarError('invalidDate')
  const end = addDays(event.date, 1)
  if (!isValidDate(end)) throw new DdayCalendarError('endDate')
  return end
}

/** Saved records are immutable in the existing UI; identity includes their ID, title and date. */
export async function ddayCalendarUid(event: DdayCalendarEvent): Promise<string> {
  validateEvent(event)
  const identity = JSON.stringify(['toolhub-dday-v1', event.id === undefined ? 'current' : 'saved', event.id ?? '', event.title, event.date])
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(identity))
  const hex = Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('')
  return `dday-${hex}@toolhub.ai.kr`
}

/** A single invalid or missing selection aborts the complete file. No RRULE/VALARM is inferred. */
export async function createDdayCalendar(events: DdayCalendarEvent[], now = new Date()): Promise<string> {
  if (!Array.isArray(events) || !events.length) throw new DdayCalendarError('empty')
  if (events.length > DDAY_CALENDAR_LIMIT) throw new DdayCalendarError('tooMany')
  const endDates = events.map(validateEvent)
  if (!Number.isFinite(now.getTime()) || !/^\d{4}-/.test(now.toISOString())) throw new DdayCalendarError('timestamp')
  const stamp = now.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z')
  const uids = await Promise.all(events.map(ddayCalendarUid))
  if (new Set(uids).size !== uids.length) throw new DdayCalendarError('duplicate')
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Toolhub//Dday Calendar Export//KO', 'CALSCALE:GREGORIAN']
  events.forEach((event, index) => lines.push(
    'BEGIN:VEVENT', `UID:${uids[index]}`, `DTSTAMP:${stamp}`,
    `DTSTART;VALUE=DATE:${event.date.replace(/-/g, '')}`, `DTEND;VALUE=DATE:${endDates[index].replace(/-/g, '')}`,
    `SUMMARY:${escapeCalendarText(event.title)}`, 'END:VEVENT',
  ))
  lines.push('END:VCALENDAR')
  return lines.map(foldCalendarLine).join('\r\n') + '\r\n'
}
