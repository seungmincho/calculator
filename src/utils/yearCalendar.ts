// 연간 달력(/calendar-2027) 순수 로직. 검증: node scripts/check-year-calendar.ts
// 공휴일 = koreanHolidays.ts(관공서의 공휴일에 관한 규정, 대체공휴일 포함), 음력 = lunarCalendar.ts.
// 24절기·잡절 = 한국천문연구원 천문우주지식정보 달력자료(KST, 2026-11-07 확인)
//   https://astro.kasi.re.kr/kor/life/post/calendarData?year=2027 — 날짜의 공식 근거는 관보의 월력요항.
// 새해 달력을 만들 때: 그 해 SOLAR_TERMS·CUSTOM_DAYS 를 천문연 자료로 채우고 page 를 복사한다.
import { getKoreanHolidays, type KoreanHoliday } from './koreanHolidays.ts'
import { solarToLunar } from './lunarCalendar.ts'

export const TERM_KEYS = ['sohan', 'daehan', 'ipchun', 'usu', 'gyeongchip', 'chunbun', 'cheongmyeong', 'gogu', 'ipha', 'soman', 'mangjong', 'haji',
  'soseo', 'daeseo', 'ipchu', 'cheoseo', 'baengno', 'chubun', 'hallo', 'sanggang', 'ipdong', 'soseol', 'daeseol', 'dongji'] as const
export type TermKey = (typeof TERM_KEYS)[number]

/** 24절기 'MM-DD HH:MM' (TERM_KEYS 순서) */
const TERMS_RAW: Record<number, string[]> = {
  2027: ['01-05 23:10', '01-20 16:30', '02-04 10:46', '02-19 06:33', '03-06 04:40', '03-21 05:25', '04-05 09:17', '04-20 16:18', '05-06 02:25', '05-21 15:18', '06-06 06:26', '06-21 23:11',
    '07-07 16:37', '07-23 10:05', '08-08 02:27', '08-23 17:14', '09-08 05:28', '09-23 15:02', '10-08 21:17', '10-24 00:33', '11-08 00:39', '11-22 22:16', '12-07 17:38', '12-22 11:42'],
}
export const CUSTOM_KEYS = ['daeboreum', 'hansik', 'dano', 'chobok', 'jungbok', 'malbok', 'chilseok'] as const
export type CustomKey = (typeof CUSTOM_KEYS)[number]
/** 명절·잡절 'MM-DD' (CUSTOM_KEYS 순서) */
const CUSTOM_RAW: Record<number, string[]> = {
  2027: ['02-21', '04-06', '06-09', '07-20', '07-30', '08-09', '08-08'],
}
export const CALENDAR_YEARS = Object.keys(TERMS_RAW).map(Number)

export interface SolarTerm { key: TermKey; date: string; time: string }
export const solarTerms = (year: number): SolarTerm[] =>
  (TERMS_RAW[year] ?? []).map((s, i) => ({ key: TERM_KEYS[i], date: `${year}-${s.slice(0, 5)}`, time: s.slice(6) }))
export const customDays = (year: number): { key: CustomKey; date: string }[] =>
  (CUSTOM_RAW[year] ?? []).map((s, i) => ({ key: CUSTOM_KEYS[i], date: `${year}-${s}` })).sort((a, b) => a.date.localeCompare(b.date))

const pad = (n: number) => String(n).padStart(2, '0')
const iso = (y: number, m: number, d: number) => `${y}-${pad(m)}-${pad(d)}`
/** 0=일 … 6=토 */
export const dayOfWeek = (date: string) => new Date(`${date}T00:00:00Z`).getUTCDay()
const daysIn = (y: number, m: number) => new Date(Date.UTC(y, m, 0)).getUTCDate()

export interface CalDay {
  date: string; d: number; dow: number
  holidays: KoreanHoliday[]; term?: SolarTerm; custom: CustomKey[]
  off: boolean // 주말 또는 공휴일
}
export interface CalMonth { month: number; weeks: (CalDay | null)[][] }

/** 일요일 시작 주 단위 12개월 */
export function buildYear(year: number): CalMonth[] {
  const hol = getKoreanHolidays(year)
  const terms = new Map(solarTerms(year).map(t => [t.date, t]))
  const custom = customDays(year)
  return Array.from({ length: 12 }, (_, i) => {
    const m = i + 1
    const cells: (CalDay | null)[] = Array(dayOfWeek(iso(year, m, 1))).fill(null)
    for (let d = 1; d <= daysIn(year, m); d++) {
      const date = iso(year, m, d), dow = dayOfWeek(date), holidays = hol.filter(h => h.date === date)
      cells.push({ date, d, dow, holidays, term: terms.get(date), custom: custom.filter(c => c.date === date).map(c => c.key), off: dow === 0 || dow === 6 || holidays.length > 0 })
    }
    while (cells.length % 7) cells.push(null)
    return { month: m, weeks: Array.from({ length: cells.length / 7 }, (_, w) => cells.slice(w * 7, w * 7 + 7)) }
  })
}

/** 음력 날짜 (1900~2050 밖이면 null) */
export function lunarOf(date: string) {
  const [y, m, d] = date.split('-').map(Number)
  const l = solarToLunar(y, m, d)
  return l ? { month: l.month, day: l.day, leap: l.isLeap } : null
}

export interface LongWeekend { start: string; end: string; days: number; holidays: KoreanHoliday[] }
/** 주말·공휴일이 3일 이상 이어지는 연휴 (그 해 안에서) */
export function longWeekends(year: number): LongWeekend[] {
  const days = buildYear(year).flatMap(m => m.weeks.flat()).filter((d): d is CalDay => !!d)
  const out: LongWeekend[] = []
  let run: CalDay[] = []
  const flush = () => {
    if (run.length >= 3 && run.some(d => d.holidays.length)) out.push({ start: run[0].date, end: run[run.length - 1].date, days: run.length, holidays: run.flatMap(d => d.holidays) })
    run = []
  }
  for (const d of days) { if (d.off) run.push(d); else flush() }
  flush()
  return out
}

/** 공휴일 수 요약: 공휴일 날짜 수, 그중 평일·주말, 대체공휴일, 1년 쉬는 날(주말+평일 공휴일) */
export function holidaySummary(year: number) {
  const dates = [...new Set(getKoreanHolidays(year).map(h => h.date))]
  const weekday = dates.filter(d => dayOfWeek(d) % 6 !== 0).length
  let weekends = 0
  for (let m = 1; m <= 12; m++) for (let d = 1; d <= daysIn(year, m); d++) if (dayOfWeek(iso(year, m, d)) % 6 === 0) weekends++
  return {
    total: dates.length, weekday, weekend: dates.length - weekday,
    substitute: getKoreanHolidays(year).filter(h => h.nameKey === 'substituteHoliday').length,
    offDays: weekends + weekday, weekends,
  }
}
