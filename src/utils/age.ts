// 나이 계산 순수 로직. 날짜는 'YYYY-MM-DD' 문자열 (dday.ts와 동일, 시간대 무관).
// 검증: node scripts/check-age.ts
import { daysBetween, ymd, isValidDate } from './dday.ts'
import { lunarToSolar, solarToLunar, nextLunarAnniversary, yearGanzi, type Occurrence } from './lunarCalendar.ts'

const pad = (n: number) => String(n).padStart(2, '0')
const ymdStr = (y: number, m: number, d: number) => `${String(y).padStart(4, '0')}-${pad(m)}-${pad(d)}`
const isLeapYear = (y: number) => (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0

export interface BirthInput {
  cal: 'solar' | 'lunar'
  /** 입력한 그대로의 날짜 (음력이면 음력 날짜) */
  date: string
  /** 음력 윤달 여부 */
  leap?: boolean
}

/** 입력 → 실제 양력 생년월일. 존재하지 않는 날짜면 null */
export function birthSolar(b: BirthInput): string | null {
  const [y, m, d] = b.date.split('-').map(Number)
  if (b.cal === 'solar') return isValidDate(b.date) ? b.date : null
  const s = lunarToSolar(y, m, d, !!b.leap)
  return s ? ymdStr(s.year, s.month, s.day) : null
}

/**
 * 그 해에 만 나이가 올라가는 날. 2/29생은 평년엔 3/1.
 * 근거: 민법 제158조(출생일 산입) + 제160조 제3항(해당일이 없으면 그 월의 말일로 기간 만료) → 2/28 만료, 3/1 0시에 한 살.
 */
export function ageUpDay(birth: string, year: number): string {
  const [, m, d] = birth.split('-').map(Number)
  if (m === 2 && d === 29 && !isLeapYear(year)) return ymdStr(year, 3, 1)
  return ymdStr(year, m, d)
}

/** 만 나이 (민법 제158조) */
export function manAge(birth: string, base: string): number {
  const by = +birth.slice(0, 4), y = +base.slice(0, 4)
  return y - by - (base < ageUpDay(birth, y) ? 1 : 0)
}

/** 연 나이 = 기준 연도 − 출생 연도 (청소년보호법·병역법 등) */
export const yeonAge = (birth: string, base: string) => +base.slice(0, 4) - +birth.slice(0, 4)
/** 세는 나이 = 연 나이 + 1 (법적 효력 없음, 참고) */
export const countingAge = (birth: string, base: string) => yeonAge(birth, base) + 1

/** 만 나이 상세: N년 M개월 D일 (마지막 나이 먹은 날부터) */
export function ageDetail(birth: string, base: string) {
  const years = manAge(birth, base)
  const last = ageUpDay(birth, +birth.slice(0, 4) + years)
  const r = ymd(last, base)
  return { years, months: r.months + r.years * 12, days: r.days }
}

export interface NextBirthday {
  date: string
  days: number
  /** 그 생일에 되는 만 나이 */
  turning: number
  isToday: boolean
  /** 음력 생일 부가 정보 */
  lunar?: Pick<Occurrence, 'leapFallback' | 'dayFallback'>
}

/**
 * 기준일 포함, 다음 생일. 음력 생일이면 음력 월일로 그 해 양력 날짜를 구함
 * (윤달생은 윤달 없는 해엔 평달, 30일생은 작은달이면 29일 — lunarCalendar 관례).
 * turning = 몇 번째 생일인지. 만 나이는 양력 환산 생년월일 기준이라 음력 생일 당일과 어긋날 수 있음.
 */
export function nextBirthday(b: BirthInput, base: string): NextBirthday | null {
  const birth = birthSolar(b)
  if (!birth) return null
  let date: string, turning: number
  let lunar: NextBirthday['lunar']
  if (b.cal === 'lunar') {
    const [, m, d] = b.date.split('-').map(Number)
    const [y, bm, bd] = base.split('-').map(Number)
    const o = nextLunarAnniversary({ year: y, month: bm, day: bd }, m, d, !!b.leap)
    if (!o) return null
    date = ymdStr(o.solar.year, o.solar.month, o.solar.day)
    turning = o.lunarYear - +b.date.slice(0, 4)
    lunar = { leapFallback: o.leapFallback, dayFallback: o.dayFallback }
  } else {
    const y = +base.slice(0, 4)
    date = ageUpDay(birth, y)
    if (date < base) date = ageUpDay(birth, y + 1)
    turning = +date.slice(0, 4) - +birth.slice(0, 4)
  }
  const days = daysBetween(base, date)
  return { date, days, turning, isToday: days === 0, lunar }
}

// ── 띠 · 별자리 ─────────────────────────────────────
export const ZODIAC_KEYS = ['rat', 'ox', 'tiger', 'rabbit', 'dragon', 'snake', 'horse', 'goat', 'monkey', 'rooster', 'dog', 'pig'] as const

/** 띠: 음력 설날 기준 (양력 1~2월생은 전년도 띠일 수 있음). 음력표 범위 밖이면 양력 연도로 */
export function zodiacOf(birth: string): { key: typeof ZODIAC_KEYS[number]; ganzi: string; byLunar: boolean } {
  const [y, m, d] = birth.split('-').map(Number)
  const l = solarToLunar(y, m, d)
  const g = yearGanzi(l ? l.year : y)
  return { key: g.zodiacEn.toLowerCase() as typeof ZODIAC_KEYS[number], ganzi: g.ganzi, byLunar: !!l }
}

/** 서양 별자리 (열대 황도대, 통용 날짜 구간) */
export function westernSign(birth: string): string {
  const md = +birth.slice(5, 7) * 100 + +birth.slice(8, 10)
  const table: [number, string][] = [
    [120, 'capricorn'], [219, 'aquarius'], [321, 'pisces'], [420, 'aries'], [521, 'taurus'], [622, 'gemini'],
    [723, 'cancer'], [823, 'leo'], [923, 'virgo'], [1023, 'libra'], [1122, 'scorpio'], [1222, 'sagittarius'],
  ]
  for (const [until, sign] of table) if (md < until) return sign
  return 'capricorn'
}

export function generationOf(y: number): string {
  if (y >= 2013) return 'genAlpha'
  if (y >= 1997) return 'genZ'
  if (y >= 1981) return 'millennial'
  if (y >= 1965) return 'genX'
  if (y >= 1946) return 'babyBoomer'
  return 'silent'
}

// ── 학교 ────────────────────────────────────────────
/**
 * 초등학교 입학 연도. 초·중등교육법 제13조: 만 6세가 된 날이 속하는 해의 다음 해 3월 1일.
 * 2008학년도까지는 취학 기준일이 3월 1일이라 1~2월생이 1년 먼저 입학(빠른년생). 2002년 1~2월생이 마지막.
 */
export function schoolEntryYear(birth: string): { year: number; early: boolean } {
  const y = +birth.slice(0, 4), m = +birth.slice(5, 7)
  const early = m <= 2 && y <= 2002
  return { year: y + (early ? 6 : 7), early }
}

export type SchoolStatus = { status: 'preschool' | 'elementary' | 'middle' | 'high' | 'university' | 'graduated'; grade: number }

/** 제 나이 입학·진학 가정한 현재 학년 (학년도 = 3월 시작) */
export function schoolStatus(birth: string, base: string): SchoolStatus {
  const entry = schoolEntryYear(birth).year
  const academic = +base.slice(0, 4) - (+base.slice(5, 7) >= 3 ? 0 : 1)
  const n = academic - entry
  if (n < 0) return { status: 'preschool', grade: 0 }
  if (n < 6) return { status: 'elementary', grade: n + 1 }
  if (n < 9) return { status: 'middle', grade: n - 5 }
  if (n < 12) return { status: 'high', grade: n - 8 }
  if (n < 16) return { status: 'university', grade: n - 11 }
  return { status: 'graduated', grade: 0 }
}

// ── 국민연금 ───────────────────────────────────────
/** 노령연금 수급 개시 연령 — 국민연금법 부칙(1998.12.31, 법률 제5623호) 제8조, 국민연금공단 안내 */
export function pensionAge(birthYear: number): number {
  if (birthYear <= 1952) return 60
  if (birthYear <= 1956) return 61
  if (birthYear <= 1960) return 62
  if (birthYear <= 1964) return 63
  if (birthYear <= 1968) return 64
  return 65
}

// ── 나이 기준 이정표 ───────────────────────────────
export interface AgeMilestone {
  key: string
  /** 'man' = 만 나이 도달일, 'yeon' = 그 나이가 되는 해 1월 1일, 'date' = 고정일 */
  basis: 'man' | 'yeon' | 'date'
  age: number
  date: string
}

export function ageMilestones(birth: string): AgeMilestone[] {
  const by = +birth.slice(0, 4)
  const man = (key: string, age: number): AgeMilestone => ({ key, basis: 'man', age, date: ageUpDay(birth, by + age) })
  const yeon = (key: string, age: number): AgeMilestone => ({ key, basis: 'yeon', age, date: ymdStr(by + age, 1, 1) })
  const entry = schoolEntryYear(birth).year
  const pa = pensionAge(by)
  const list: AgeMilestone[] = [
    { key: 'school', basis: 'date', age: entry - by, date: ymdStr(entry, 3, 1) },
    man('idCard', 17),
    yeon('militaryPrep', 18),
    man('vote', 18),
    man('driving', 18),
    yeon('youthProtection', 19),
    yeon('militaryExam', 19),
    man('adult', 19),
    man('pension', pa),
    man('basicPension', 65),
  ]
  return list.sort((a, b) => a.date.localeCompare(b.date))
}

// ── 가족 비교 ──────────────────────────────────────
export interface Member extends BirthInput { id: string; name: string }

export function sanitizeMembers(v: unknown): Member[] {
  if (!Array.isArray(v)) return []
  return v.filter((x): x is Member =>
    !!x && typeof x.id === 'string' && typeof x.name === 'string' && (x.cal === 'solar' || x.cal === 'lunar') &&
    typeof x.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(x.date) && birthSolar(x) !== null,
  ).map(x => ({ id: x.id, name: x.name.slice(0, 20), cal: x.cal, date: x.date, leap: !!x.leap })).slice(0, 30)
}

/** 두 생년월일 차이. sign: a가 b보다 먼저 태어났으면 1 */
export function ageGap(a: string, b: string) {
  const r = ymd(a, b)
  return { ...r, sign: a < b ? 1 : a > b ? -1 : 0, yearDiff: Math.abs(+a.slice(0, 4) - +b.slice(0, 4)) }
}
