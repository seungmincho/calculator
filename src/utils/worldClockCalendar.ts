import { escapeCalendarText, foldCalendarLine } from './ddayCalendar.ts'
import { isMeetingInstant, parseMeetingCityIds, MEETING_MIN_MS, MEETING_MAX_MS } from './worldClockMeeting.ts'
import { resolveCity } from './worldClock.ts'

export const MEETING_CALENDAR_TITLE_LIMIT = 100
export const MEETING_DURATIONS = [30, 60, 90, 120] as const
export type MeetingDuration = typeof MEETING_DURATIONS[number]
export interface MeetingCalendarInput { title: string; startMs: number; durationMinutes: number; cityIds: readonly string[] }
export interface MeetingCalendarSnapshot { title: string; startMs: number; endMs: number; durationMinutes: MeetingDuration; cityIds: string[] }
export type MeetingCalendarErrorCode = 'title' | 'duration' | 'instant' | 'end' | 'cities' | 'timestamp' | 'generate'
export class MeetingCalendarError extends Error {
  readonly code: MeetingCalendarErrorCode
  constructor(code: MeetingCalendarErrorCode) { super(code); this.name = 'MeetingCalendarError'; this.code = code }
}
export type MeetingDigest = (bytes: Uint8Array<ArrayBuffer>) => Promise<ArrayBuffer>

export function snapshotMeetingCalendar(input: MeetingCalendarInput): MeetingCalendarSnapshot {
  if (!input || typeof input.title !== 'string' || !input.title.trim() || input.title.length > MEETING_CALENDAR_TITLE_LIMIT
    || /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(input.title)
    || Array.from(input.title).some(c => { const point = c.codePointAt(0)!; return point >= 0xd800 && point <= 0xdfff })) throw new MeetingCalendarError('title')
  if (!MEETING_DURATIONS.includes(input.durationMinutes as MeetingDuration)) throw new MeetingCalendarError('duration')
  if (!Array.isArray(input.cityIds)) throw new MeetingCalendarError('cities')
  const ids = parseMeetingCityIds(input.cityIds.join(','))
  if (!ids.length || ids.length !== input.cityIds.length || ids.some((id, i) => id !== input.cityIds[i])) throw new MeetingCalendarError('cities')
  const tzs = ids.map(id => resolveCity(id)!.tz)
  if (!isMeetingInstant(input.startMs, tzs)) throw new MeetingCalendarError('instant')
  const endMs = input.startMs + input.durationMinutes * 60 * 1000
  if (!isMeetingInstant(endMs, tzs)) throw new MeetingCalendarError('end')
  return { title: input.title, startMs: input.startMs, endMs, durationMinutes: input.durationMinutes as MeetingDuration, cityIds: [...ids] }
}

function utcStamp(ms: number): string {
  return new Date(ms).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z')
}

/** Snapshot before await. UTC times carry Z without TZID; no recurrence, alarm or attendee is inferred. */
export async function createMeetingCalendar(
  input: MeetingCalendarInput, now = Date.now(),
  digest: MeetingDigest = bytes => crypto.subtle.digest('SHA-256', bytes),
): Promise<string> {
  const snapshot = snapshotMeetingCalendar(input)
  const stampMs = Math.floor(now / 1000) * 1000
  if (!Number.isSafeInteger(stampMs) || stampMs < MEETING_MIN_MS || stampMs > MEETING_MAX_MS) throw new MeetingCalendarError('timestamp')
  // Same event identity survives repeated exports, locale changes and city reordering.
  const identity = JSON.stringify(['toolhub-world-meeting-v1', snapshot.title, snapshot.startMs, snapshot.durationMinutes])
  let hash: ArrayBuffer
  try { hash = await digest(new TextEncoder().encode(identity)) } catch { throw new MeetingCalendarError('generate') }
  if (!(hash instanceof ArrayBuffer) || hash.byteLength !== 32) throw new MeetingCalendarError('generate')
  const hex = Array.from(new Uint8Array(hash), byte => byte.toString(16).padStart(2, '0')).join('')
  const lines = [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Toolhub//World Clock Meeting//EN', 'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT', `UID:world-clock-${hex}@toolhub.ai.kr`, `DTSTAMP:${utcStamp(stampMs)}`,
    `DTSTART:${utcStamp(snapshot.startMs)}`, `DTEND:${utcStamp(snapshot.endMs)}`,
    `SUMMARY:${escapeCalendarText(snapshot.title)}`, 'END:VEVENT', 'END:VCALENDAR',
  ]
  return lines.map(foldCalendarLine).join('\r\n') + '\r\n'
}
