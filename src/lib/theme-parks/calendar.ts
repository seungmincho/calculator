import { getKoreanHolidays } from '../../utils/koreanHolidays.ts'
import { seoulDay } from '../everland/model.ts'
import { crowdOf, type VisitDay } from '../everland/planner.ts'
import type { Database } from '../everland/storage.ts'
import { parks, type ParkId } from './config.ts'

/** First month with collected history (Everland collection started 2026-11-04). */
export const CALENDAR_START = '2026-11'
export interface CalendarDay {
  date: string; weekday: number; holiday: string | null; crowd: VisitDay['crowd']
  opening: string | null; closing: string | null; extended: boolean; measured: number | null
}
export interface CalendarMonth { month: string; prev: string | null; next: string | null; today: string; days: CalendarDay[] }
export interface CalendarSource { schedules: { day: string; opening: string; closing: string }[]; daily: { day: string; mean_median: number | null }[] }

const shift = (month: string, by: number) => new Date(Date.UTC(+month.slice(0, 4), +month.slice(5) - 1 + by, 1)).toISOString().slice(0, 7)
const kstTime = (iso: string) => new Date(Date.parse(iso) + 9 * 3600000).toISOString().slice(11, 16)
/** Parks whose provider publishes operating hours. */
export const hasCalendar = (park: ParkId) => !!parks[park].providerId
/** Months with a page: from the first collected month to three months ahead. */
export function calendarMonths(now: number): string[] {
  const out: string[] = [], last = shift(seoulDay(now).slice(0, 7), 3)
  for (let m = CALENDAR_START; m <= last; m = shift(m, 1)) out.push(m)
  return out
}

export function calendarMonth(month: string, now: number, { schedules, daily }: CalendarSource): CalendarMonth {
  const months = calendarMonths(now), i = months.indexOf(month), today = seoulDay(now), year = +month.slice(0, 4)
  const holidays = new Map(getKoreanHolidays(year).map(h => [h.date, h.name]))
  const hours = new Map(schedules.map(s => [s.day, s]))
  // "Extended" = closes later than the month's most common closing time.
  const counts = new Map<string, number>()
  schedules.forEach(s => counts.set(kstTime(s.closing), (counts.get(kstTime(s.closing)) ?? 0) + 1))
  const usual = [...counts].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0]?.[0]
  const measured = new Map(daily.map(d => [d.day, d.mean_median]))
  const length = new Date(Date.UTC(year, +month.slice(5), 0)).getUTCDate()
  const days = Array.from({ length }, (_, k): CalendarDay => {
    const date = `${month}-${String(k + 1).padStart(2, '0')}`, weekday = new Date(`${date}T00:00:00Z`).getUTCDay()
    const holiday = holidays.get(date) ?? null, h = hours.get(date)
    return { date, weekday, holiday, crowd: crowdOf(weekday, !!holiday), opening: h?.opening ?? null, closing: h?.closing ?? null,
      extended: !!h && !!usual && kstTime(h.closing) > usual,
      // Today's record is partial, so only finished days show a measured value.
      measured: date < today ? measured.get(date) ?? null : null }
  })
  return { month, prev: months[i - 1] ?? null, next: months[i + 1] ?? null, today, days }
}

export async function readCalendar(db: Database, park: ParkId, month: string): Promise<CalendarSource> {
  const like = `${month}-%`
  const [schedules, daily] = await Promise.all([
    db.prepare('SELECT day,opening,closing FROM park_schedules WHERE park=? AND day LIKE ?').bind(park, like).all<CalendarSource['schedules'][number]>(),
    park === 'everland' ? db.prepare('SELECT day,mean_median FROM everland_daily WHERE day LIKE ?').bind(like).all<CalendarSource['daily'][number]>() : { results: [] },
  ])
  return { schedules: schedules.results, daily: daily.results }
}
