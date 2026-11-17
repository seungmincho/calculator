import { lunarAnniversary, MIN_YEAR, MAX_YEAR, type Occurrence } from './lunarCalendar.ts'
import { addDays, isValidDate } from './dday.ts'
import { escapeCalendarText, foldCalendarLine } from './ddayCalendar.ts'

export const LUNAR_CALENDAR_TITLE_LIMIT = 100
export const LUNAR_CALENDAR_YEAR_LIMIT = 11

export interface LunarAnniversarySpec { month: number; day: number; isLeap: boolean }
export interface LunarCalendarOccurrence extends Occurrence { date: string; endDate: string }
export type LunarCalendarErrorCode = 'invalidLunar' | 'empty' | 'tooMany' | 'invalidYears' | 'duplicate' | 'outOfRange' | 'invalidTitle' | 'invalidDescription' | 'timestamp' | 'download'
export class LunarCalendarError extends Error {
  code: LunarCalendarErrorCode
  constructor(code: LunarCalendarErrorCode) { super(code); this.name = 'LunarCalendarError'; this.code = code }
}

function validText(value: unknown, limit: number): value is string {
  return typeof value === 'string' && value.trim().length > 0 && value.length <= limit &&
    !/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(value) &&
    !Array.from(value).some(character => { const point = character.codePointAt(0)!; return point >= 0xd800 && point <= 0xdfff })
}

/** Recalculate every selected lunar year; one unsupported date rejects the whole selection. */
export function selectLunarCalendarOccurrences(spec: LunarAnniversarySpec, lunarYears: number[]): LunarCalendarOccurrence[] {
  if (!spec || !Number.isInteger(spec.month) || spec.month < 1 || spec.month > 12 ||
    !Number.isInteger(spec.day) || spec.day < 1 || spec.day > 30 || typeof spec.isLeap !== 'boolean') throw new LunarCalendarError('invalidLunar')
  if (!Array.isArray(lunarYears)) throw new LunarCalendarError('invalidYears')
  if (!lunarYears.length) throw new LunarCalendarError('empty')
  if (lunarYears.length > LUNAR_CALENDAR_YEAR_LIMIT) throw new LunarCalendarError('tooMany')
  if (lunarYears.some(year => !Number.isInteger(year) || year < MIN_YEAR || year > MAX_YEAR)) throw new LunarCalendarError('invalidYears')
  if (new Set(lunarYears).size !== lunarYears.length) throw new LunarCalendarError('duplicate')
  return [...lunarYears].sort((a, b) => a - b).map(year => {
    const occurrence = lunarAnniversary(year, spec.month, spec.day, spec.isLeap)
    if (!occurrence) throw new LunarCalendarError('outOfRange')
    const { solar } = occurrence
    const date = `${solar.year}-${String(solar.month).padStart(2, '0')}-${String(solar.day).padStart(2, '0')}`
    const endDate = addDays(date, 1)
    if (!isValidDate(date) || !isValidDate(endDate)) throw new LunarCalendarError('outOfRange')
    return { ...occurrence, date, endDate }
  })
}

/** Localized descriptions come from t(); their text is validated and escaped like titles. */
export async function createLunarAnniversaryCalendar(
  input: LunarAnniversarySpec & { title: string; lunarYears: number[] },
  describe: (occurrence: LunarCalendarOccurrence) => string,
  now = new Date(),
): Promise<string> {
  const occurrences = selectLunarCalendarOccurrences(input, input?.lunarYears)
  if (!validText(input.title, LUNAR_CALENDAR_TITLE_LIMIT)) throw new LunarCalendarError('invalidTitle')
  const title = input.title.trim()
  if (!(now instanceof Date) || !Number.isFinite(now.getTime()) || !/^\d{4}-/.test(now.toISOString())) throw new LunarCalendarError('timestamp')
  if (typeof describe !== 'function') throw new LunarCalendarError('invalidDescription')
  const stamp = now.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z')
  // Snapshot all fields before awaiting SHA-256 so a caller's later edits cannot mix events.
  const events = occurrences.map(occurrence => {
    const description = describe({ ...occurrence, solar: { ...occurrence.solar } })
    if (!validText(description, 4000)) throw new LunarCalendarError('invalidDescription')
    const identity = JSON.stringify(['toolhub-lunar-anniversary-v1', title, input.month, input.day, input.isLeap, occurrence.lunarYear, occurrence.date])
    return { occurrence, description, identity }
  })
  const uids = await Promise.all(events.map(async event => {
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(event.identity))
    const hex = Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('')
    return `lunar-${hex}@toolhub.ai.kr`
  }))
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Toolhub//Lunar Anniversary Export//KO', 'CALSCALE:GREGORIAN']
  events.forEach(({ occurrence, description }, index) => lines.push(
    'BEGIN:VEVENT', `UID:${uids[index]}`, `DTSTAMP:${stamp}`,
    `DTSTART;VALUE=DATE:${occurrence.date.replace(/-/g, '')}`, `DTEND;VALUE=DATE:${occurrence.endDate.replace(/-/g, '')}`,
    `SUMMARY:${escapeCalendarText(title)}`, `DESCRIPTION:${escapeCalendarText(description)}`, 'END:VEVENT',
  ))
  lines.push('END:VCALENDAR')
  return lines.map(foldCalendarLine).join('\r\n') + '\r\n'
}
