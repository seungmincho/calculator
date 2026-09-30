// 디데이 계산 순수 로직. 날짜는 전부 'YYYY-MM-DD' 문자열 + UTC 일련번호로 다뤄
// 브라우저 시간대·서머타임과 무관하게 하루 단위가 정확하다. "오늘"만 KST(UTC+9)로 구한다.
// 검증: node scripts/check-dday.ts
import { csatDate, type KoreanHoliday } from './koreanHolidays.ts'
export { CSAT, csatDate } from './koreanHolidays.ts'

const DAY = 86400000

export function toDayNum(s: string): number {
  const [y, m, d] = s.split('-').map(Number)
  return Math.round(Date.UTC(y, m - 1, d) / DAY)
}

export function fromDayNum(n: number): string {
  return new Date(n * DAY).toISOString().slice(0, 10)
}

export function isValidDate(s: string | null | undefined): s is string {
  if (!s || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false
  return fromDayNum(toDayNum(s)) === s
}

/** 한국 시간 기준 오늘 */
export function todayKST(now = Date.now()): string {
  return new Date(now + 9 * 3600000).toISOString().slice(0, 10)
}

/** 0=일 … 6=토 */
export function weekday(s: string): number {
  return (((toDayNum(s) + 4) % 7) + 7) % 7 // 1970-01-01 = 목(4)
}

export function addDays(s: string, n: number): string {
  return fromDayNum(toDayNum(s) + n)
}

/** 월 더하기. 말일 넘침은 말일로 고정 (1/31 + 1개월 = 2/28·29) */
export function addMonths(s: string, n: number): string {
  const [y, m, d] = s.split('-').map(Number)
  const idx = y * 12 + (m - 1) + n
  const ny = Math.floor(idx / 12)
  const nm = idx - ny * 12
  const last = new Date(Date.UTC(ny, nm + 1, 0)).getUTCDate()
  return `${String(ny).padStart(4, '0')}-${String(nm + 1).padStart(2, '0')}-${String(Math.min(d, last)).padStart(2, '0')}`
}

export const addYears = (s: string, n: number) => addMonths(s, n * 12)

/** to - from (일). 양수 = to가 미래 */
export const daysBetween = (from: string, to: string) => toDayNum(to) - toDayNum(from)

/** 한국식 표기: 당일 D-Day, 남으면 D-N, 지나면 D+N */
export function ddayLabel(diff: number): string {
  return diff === 0 ? 'D-Day' : diff > 0 ? `D-${diff}` : `D+${-diff}`
}

/** 두 날짜 사이 만 개월 수·연·월·일 (earlier ≤ later 로 정렬해서 계산) */
export function ymd(a: string, b: string): { years: number; months: number; days: number; totalMonths: number } {
  const [from, to] = a <= b ? [a, b] : [b, a]
  const [y1, m1, d1] = from.split('-').map(Number)
  const [y2, m2, d2] = to.split('-').map(Number)
  let totalMonths = (y2 - y1) * 12 + (m2 - m1)
  if (d2 < d1 && addMonths(from, totalMonths) > to) totalMonths--
  const days = daysBetween(addMonths(from, totalMonths), to)
  return { years: Math.floor(totalMonths / 12), months: totalMonths % 12, days, totalMonths }
}

// ── 공휴일 ─────────────────────────────────────────────
// 공휴일·대체공휴일 규칙은 koreanHolidays.ts가 단일 출처 (getBase = getKoreanHolidays)
export interface Holiday { date: string; key: string }

export function holidaysOfYear(year: number, getBase: (y: number) => KoreanHoliday[]): Holiday[] {
  return getBase(year).map(h => ({ date: h.date, key: h.nameKey }))
}

/** from..to (양끝 포함) 사이 공휴일 */
export function holidaysInRange(from: string, to: string, getBase: (y: number) => KoreanHoliday[]): Holiday[] {
  const [a, b] = from <= to ? [from, to] : [to, from]
  const out: Holiday[] = []
  for (let y = +a.slice(0, 4); y <= +b.slice(0, 4); y++) out.push(...holidaysOfYear(y, getBase).filter(h => h.date >= a && h.date <= b))
  return out
}

/**
 * from 다음 날 ~ to 당일 (총 |to-from|일) 구성: 주말 / 평일 공휴일 / 영업일. 세 값의 합 = 총 일수.
 * D-Day 기준 "오늘 제외, 목표일 포함".
 */
export function rangeStats(from: string, to: string, getBase: (y: number) => KoreanHoliday[]) {
  const [a, b] = from <= to ? [from, to] : [to, from]
  const total = daysBetween(a, b)
  const hol = new Set(holidaysInRange(addDays(a, 1), b, getBase).map(h => h.date))
  let weekend = 0, holiday = 0
  // ponytail: 하루씩 순회 O(n) — 수십 년 범위도 1만여 회라 충분
  for (let n = toDayNum(a) + 1; n <= toDayNum(b); n++) {
    const wd = (((n + 4) % 7) + 7) % 7
    if (wd === 0 || wd === 6) weekend++
    else if (hol.has(fromDayNum(n))) holiday++
  }
  return { total, weeks: Math.floor(total / 7), restDays: total % 7, weekend, holiday, business: total - weekend - holiday }
}

/** 영업일(주말·공휴일 제외) n일 더하기/빼기 */
export function addBusinessDays(s: string, n: number, getBase: (y: number) => KoreanHoliday[]): string {
  const step = n < 0 ? -1 : 1
  let left = Math.abs(n)
  let d = s
  while (left > 0) {
    d = addDays(d, step)
    const wd = weekday(d)
    if (wd !== 0 && wd !== 6 && !holidaysOfYear(+d.slice(0, 4), getBase).some(h => h.date === d)) left--
  }
  return d
}

// ── 프리셋 ─────────────────────────────────────────────
export interface Preset { key: string; date: string; estimated?: boolean }

/** 오늘 이후(당일 포함) 가장 가까운 날짜로 계산한 프리셋, 가까운 순 */
export function presets(today: string, getBase: (y: number) => KoreanHoliday[]): Preset[] {
  const y = +today.slice(0, 4)
  const next = (f: (yr: number) => string | undefined) => {
    for (const yr of [y, y + 1, y + 2]) { const d = f(yr); if (d && d >= today) return d }
    return undefined
  }
  const out: Preset[] = []
  const add = (key: string, date?: string, estimated?: boolean) => { if (date) out.push({ key, date, estimated }) }
  const cs = next(yr => csatDate(yr).date)
  add('csat', cs, cs ? csatDate(+cs.slice(0, 4)).estimated : undefined)
  add('christmas', next(yr => `${yr}-12-25`))
  add('yearEnd', next(yr => `${yr}-12-31`))
  add('newYear', next(yr => `${yr}-01-01`))
  add('seollal', next(yr => getBase(yr).find(h => h.nameKey === 'seollal')?.date))
  add('chuseok', next(yr => getBase(yr).find(h => h.nameKey === 'chuseok')?.date))
  return out.sort((a, b) => a.date.localeCompare(b.date))
}

// ── 기념일 ─────────────────────────────────────────────
/** start 기준 date가 며칠째인지. includeStart면 시작일 = 1일 (연애 1일) */
export function dayCount(start: string, date: string, includeStart: boolean): number {
  return daysBetween(start, date) + (includeStart ? 1 : 0)
}

export interface Milestone { kind: 'days' | 'years'; n: number; date: string }

/** 100일 단위(1~10000일 중 주요) + N주년, 날짜순 */
export function milestones(start: string, includeStart: boolean, maxYears = 30): Milestone[] {
  const off = includeStart ? 1 : 0
  const days = [100, 200, 300, 365, 400, 500, 600, 700, 800, 900, 1000, 1500, 2000, 2500, 3000, 4000, 5000, 7000, 10000]
  const out: Milestone[] = days.map(n => ({ kind: 'days' as const, n, date: addDays(start, n - off) }))
  for (let n = 1; n <= maxYears; n++) out.push({ kind: 'years', n, date: addYears(start, n) })
  return out.sort((a, b) => a.date.localeCompare(b.date) || (a.kind === 'years' ? 1 : -1))
}

// ── 저장 목록 ──────────────────────────────────────────
export interface SavedDday { id: string; title: string; date: string; pinned?: boolean }

/** 고정 먼저, 그다음 다가오는 일정(가까운 순), 지난 일정(최근 순) */
export function sortSaved(list: SavedDday[], today: string): SavedDday[] {
  const rank = (s: SavedDday) => {
    const d = daysBetween(today, s.date)
    return [s.pinned ? 0 : 1, d >= 0 ? 0 : 1, d >= 0 ? d : -d] as const
  }
  return [...list].sort((a, b) => {
    const ra = rank(a), rb = rank(b)
    return ra[0] - rb[0] || ra[1] - rb[1] || ra[2] - rb[2]
  })
}

/** 달력 한 달치 칸 (일요일 시작, 앞쪽 빈칸 = null) */
export function monthGrid(year: number, month: number): (string | null)[] {
  const first = `${year}-${String(month).padStart(2, '0')}-01`
  const cells: (string | null)[] = Array(weekday(first)).fill(null)
  for (let d = first; d.slice(5, 7) === first.slice(5, 7); d = addDays(d, 1)) cells.push(d)
  return cells
}
