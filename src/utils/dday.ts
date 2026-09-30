// 디데이 계산 순수 로직. 날짜는 전부 'YYYY-MM-DD' 문자열 + UTC 일련번호로 다뤄
// 브라우저 시간대·서머타임과 무관하게 하루 단위가 정확하다. "오늘"만 KST(UTC+9)로 구한다.
// 검증: node scripts/check-dday.ts
import type { KoreanHoliday } from './koreanHolidays'

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
// koreanHolidays.ts의 기본 공휴일을 쓰되, 대체공휴일은 법령 기준으로 다시 계산하고
// 누락된 공휴일(노동절·제헌절 2026~, 선거일·임시공휴일)을 보탠다.
// ponytail: 임시공휴일은 지정될 때마다 EXTRA에 추가해야 함
export interface Holiday { date: string; key: string }

const EXTRA: Record<string, string> = {
  '2024-04-10': 'election',
  '2024-10-01': 'tempHoliday',
  '2025-01-27': 'tempHoliday',
  '2025-06-03': 'election',
  '2026-06-03': 'election',
  '2028-04-12': 'election',
}
const BLOCK = new Set(['seollalEve', 'seollal', 'seollalAfter', 'chuseokEve', 'chuseok', 'chuseokAfter'])
// 토·일과 겹치면 대체 (공휴일에 관한 법률, 관공서의 공휴일에 관한 규정 제3조)
const SAT_SUN = new Set(['marchFirst', 'childrensDay', 'liberationDay', 'nationalFoundation', 'hangeulDay', 'buddhasBirthday', 'christmas', 'laborDay', 'constitutionDay'])

const holidayCache = new Map<number, Holiday[]>()

export function holidaysOfYear(year: number, getBase: (y: number) => KoreanHoliday[]): Holiday[] {
  const hit = holidayCache.get(year)
  if (hit) return hit
  const list: Holiday[] = getBase(year).filter(h => h.nameKey !== 'substituteHoliday').map(h => ({ date: h.date, key: h.nameKey }))
  if (year >= 2026) list.push({ date: `${year}-05-01`, key: 'laborDay' }, { date: `${year}-07-17`, key: 'constitutionDay' })
  for (const [d, k] of Object.entries(EXTRA)) if (d.startsWith(`${year}-`)) list.push({ date: d, key: k })

  const byDate = new Map<string, string[]>()
  for (const h of list) byDate.set(h.date, [...(byDate.get(h.date) ?? []), h.key])
  const taken = new Set(byDate.keys())
  const subs: Holiday[] = []
  const place = (after: string) => {
    let d = addDays(after, 1)
    while (taken.has(d) || weekday(d) === 0 || weekday(d) === 6) d = addDays(d, 1)
    taken.add(d)
    subs.push({ date: d, key: 'substituteHoliday' })
  }
  // 설·추석 연휴: 일요일 또는 다른 공휴일과 겹치면 연휴 다음 첫 평일
  for (const pre of ['seollal', 'chuseok']) {
    const days = list.filter(h => h.key.startsWith(pre) && BLOCK.has(h.key)).map(h => h.date).sort()
    if (days.length && days.some(d => weekday(d) === 0 || byDate.get(d)!.length > 1)) place(days[days.length - 1])
  }
  // 그 밖: 토·일 또는 다른 공휴일과 겹치면 날짜당 하루 (연휴 블록끼리 겹침은 위에서 처리)
  for (const [d, keys] of [...byDate].sort()) {
    const eligible = keys.filter(k => SAT_SUN.has(k))
    if (!eligible.length) continue
    const wd = weekday(d)
    const overlap = keys.length > 1 && !keys.some(k => BLOCK.has(k))
    if (wd === 0 || wd === 6 || overlap) place(d)
  }
  const out = [...list, ...subs].sort((a, b) => a.date.localeCompare(b.date))
  holidayCache.set(year, out)
  return out
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
// 수능 시행일 (교육부·평가원 발표). 없는 해는 11월 셋째 목요일로 추정.
export const CSAT: Record<number, string> = {
  2024: '2024-11-14', // 2025학년도
  2025: '2025-11-13', // 2026학년도
  2026: '2026-11-19', // 2027학년도 (평가원 시행 기본계획, 2026-03)
  2027: '2027-11-18', // 2028학년도 (교육부 2028 대입 안내)
}

export function csatDate(year: number): { date: string; estimated: boolean } {
  if (CSAT[year]) return { date: CSAT[year], estimated: false }
  const first = 1 + ((4 - weekday(`${year}-11-01`) + 7) % 7)
  return { date: `${year}-11-${String(first + 14).padStart(2, '0')}`, estimated: true }
}

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
