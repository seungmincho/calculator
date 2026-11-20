// 국가장학금 계산기: 월 소득인정액 → 학자금 지원구간(가~마) → Ⅰ유형·다자녀 지원금액.
// 회귀 체크: node scripts/check-national-scholarship.ts
//
// 출처(확인 2026-11-20, 한국장학재단):
//  - 경곗값·개편: https://www.kosaf.go.kr/ko/tuition.do?pg=tuition04_09_07&type=scholar
//    경곗값 = 기준중위소득(4인 가구) × 구간 비율. 가구원 수와 관계없이 한 줄이다. 2027년 1학기부터 1~10구간 → 가~마.
//    공표된 표는 2026년 기준(4,546,317 / 8,443,159 / 12,989,476 / 19,484,214)이고 2027년 경곗값은 "추후 확정".
//    해마다 그해 기준중위소득을 쓴다(2025년 1구간 1,829,332 = 2025년 4인 × 30%) → 2027학년도는 2027년 값으로 추정.
//  - 소득인정액: https://www.kosaf.go.kr/ko/tuition.do?pg=tuition04_09_03&naviParam=JH,01,01,05
//    소득평가액 + (재산 − 기본재산액 − 부채) × 월 환산율 − 형제·자매 공제. 기본재산액 6,900만원(지역 구분 없음),
//    일반재산·자동차 월 4.17%/3, 금융재산 월 6.26%/3, 임차보증금 × 0.95, 학생 근로·사업소득 130만원 공제,
//    일용근로소득 50% 공제, 형제·자매 (n − 2) × 40만원(3자녀 이상 미혼 학생).
//  - Ⅰ유형 금액: https://www.kosaf.go.kr/ko/scholar.do?pg=scholarship05_12_01_01&ttab1=1
//  - 다자녀 금액: https://www.kosaf.go.kr/ko/scholar.do?pg=scholarship05_12_10&naviParam=JH,02,05,05&ttab1=1
//    두 표 모두 2027학년도 1학기 안내이고 "2027년도 정부예산(안) 기준으로 변경될 수 있음".
// 재단 확정 경곗값이 나오면 BOUNDARY_CONFIRMED = true, 국회 예산 확정 뒤 금액을 다시 본다.
import { MEDIAN_INCOME } from './medianIncome.ts'

export const CHECKED = '2026-11-20'
export const SOURCES = {
  boundary: 'https://www.kosaf.go.kr/ko/tuition.do?pg=tuition04_09_07&type=scholar',
  method: 'https://www.kosaf.go.kr/ko/tuition.do?pg=tuition04_09_03&naviParam=JH,01,01,05',
  type1: 'https://www.kosaf.go.kr/ko/scholar.do?pg=scholarship05_12_01_01&ttab1=1',
  multi: 'https://www.kosaf.go.kr/ko/scholar.do?pg=scholarship05_12_10&naviParam=JH,02,05,05&ttab1=1',
  apply: 'https://www.kosaf.go.kr/',
} as const

/** 2027학년도에 쓸 기준중위소득 연도. 재단 확정 전이라 추정 */
export const BOUNDARY_YEAR = '2027'
export const BOUNDARY_CONFIRMED = false
/** 재단이 공표한 직전 경곗값(참고 열) */
export const PREV_YEAR = '2026'

export const BASIC_PROPERTY = 69_000_000
export const RATE = { general: 0.0417 / 3, financial: 0.0626 / 3, car: 0.0417 / 3 }
export const DEPOSIT_FACTOR = 0.95
export const STUDENT_DEDUCTION = 1_300_000
export const DAILY_KEEP = 0.5
export const SIBLING_DEDUCTION = 400_000

// ── 신청 일정 (2027학년도 1학기 1차, 신입생 포함)
export const SCHEDULE = {
  start: '2026-11-24T09:00:00+09:00',
  end: '2027-01-07T18:00:00+09:00',
  docsEnd: '2027-01-14T18:00:00+09:00',
}
export type Phase = 'before' | 'open' | 'docs' | 'closed'
const DAY = 86_400_000
/** 지금 단계와 다음 시점까지 남은 날(올림) */
export function phaseAt(now: number): { phase: Phase; days: number } {
  const [s, e, d] = [SCHEDULE.start, SCHEDULE.end, SCHEDULE.docsEnd].map((x) => Date.parse(x))
  const left = (to: number) => Math.ceil((to - now) / DAY)
  if (now < s) return { phase: 'before', days: left(s) }
  if (now <= e) return { phase: 'open', days: left(e) }
  if (now <= d) return { phase: 'docs', days: left(d) }
  return { phase: 'closed', days: 0 }
}

// ── 구간
export const BRACKETS = ['basic', 'ga', 'na', 'da', 'ra', 'ma'] as const
export type Bracket = (typeof BRACKETS)[number]
export type Banded = Exclude<Bracket, 'basic' | 'ma'>
export const BANDED: Banded[] = ['ga', 'na', 'da', 'ra']
/** 기준중위소득 대비 상한 % (이하) */
export const BRACKET_PCT: Record<Banded, number> = { ga: 70, na: 130, da: 200, ra: 300 }

/** 4인 가구 기준중위소득 */
export const median4 = (year: string) => MEDIAN_INCOME[year][3]

/** 구간 상한 경곗값(원, 반올림 — 2026 공표값과 같다) */
export function boundaries(year: string = BOUNDARY_YEAR): Record<Banded, number> {
  const m = median4(year)
  return Object.fromEntries(BANDED.map((b) => [b, Math.round((m * BRACKET_PCT[b]) / 100)])) as Record<Banded, number>
}

export function bracketOf(total: number, year: string = BOUNDARY_YEAR): Exclude<Bracket, 'basic'> {
  const bd = boundaries(year)
  return BANDED.find((b) => total <= bd[b]) ?? 'ma'
}

// ── 소득인정액 (모두 원, 월 소득은 월평균)
export interface Household {
  married: boolean
  /** 부모(기혼이면 배우자) 소득 합계: 근로·사업·연금·임대 등. 일용근로 제외 */
  parentIncome: number
  /** 부모(배우자) 일용근로소득 → 50% 반영 */
  parentDaily: number
  /** 학생 본인 근로·사업소득(일용 포함) → 130만원 공제 */
  studentIncome: number
  /** 주택·토지·건물 등(시가표준액) */
  realEstate: number
  /** 내가 낸 전월세 임차보증금 → 0.95 */
  deposit: number
  financial: number
  car: number
  /** 금융기관 대출·받은 임대보증금·학자금대출 등 */
  debt: number
  /** 본인 포함 형제·자매 수 */
  siblings: number
}

export interface Recognized {
  income: number
  general: number
  financial: number
  car: number
  sibling: number
  total: number
}

const pos = (n: number) => Math.max(0, n)

export function recognizedIncome(h: Household): Recognized {
  // ponytail: 학생 일용근로는 '130만원 정액 vs 50%' 중 큰 공제인데, 월 260만원 넘을 때만 달라져 정액만 쓴다
  const income = pos(h.studentIncome - STUDENT_DEDUCTION) + h.parentIncome + h.parentDaily * DAILY_KEEP
  // 기본재산액·부채는 일반재산에서 먼저 빼고, 남으면 금융재산에서 뺀다(음수는 0). 자동차는 빼지 않는다
  const rest = h.realEstate + h.deposit * DEPOSIT_FACTOR - BASIC_PROPERTY - h.debt
  const general = Math.round(pos(rest) * RATE.general)
  const financial = Math.round(pos(h.financial + Math.min(0, rest)) * RATE.financial)
  const car = Math.round(h.car * RATE.car)
  const sibling = !h.married && h.siblings >= 3 ? (h.siblings - 2) * SIBLING_DEDUCTION : 0
  return { income, general, financial, car, sibling, total: pos(income + general + financial + car - sibling) }
}

// ── 지원금액 (연간, 원). 'full' = 등록금(필수경비) 전액
export const AMOUNT_BASIS = '2027' // 2027년도 정부예산(안) 기준 — 국회 확정 때 바뀔 수 있다
export type Amount = number | 'full'
export type Kind = 'type1' | 'multi12' | 'multi3'
export const ANNUAL: Record<Kind, Record<Bracket, Amount>> = {
  type1: { basic: 'full', ga: 6_000_000, na: 4_400_000, da: 3_600_000, ra: 1_000_000, ma: 0 },
  multi12: { basic: 'full', ga: 6_100_000, na: 5_050_000, da: 4_650_000, ra: 1_350_000, ma: 0 },
  multi3: { basic: 'full', ga: 'full', na: 'full', da: 'full', ra: 2_000_000, ma: 0 },
}

/** 다자녀(3자녀 이상, 미혼) 첫째·둘째 / 셋째 이상, 아니면 Ⅰ유형 */
export function kindOf(married: boolean, siblings: number, third: boolean): Kind {
  if (married || siblings < 3) return 'type1'
  return third ? 'multi3' : 'multi12'
}

const half = (a: Amount): Amount => (a === 'full' ? a : a / 2)

export interface Award {
  kind: Kind
  annual: Amount
  semester: Amount
  /** 등록금을 넣었을 때만: 실제 받는 금액과 본인 부담 */
  aid: number | null
  net: number | null
}

export function award(bracket: Bracket, kind: Kind, tuition = 0): Award {
  const annual = ANNUAL[kind][bracket]
  const semester = half(annual)
  if (tuition <= 0) return { kind, annual, semester, aid: null, net: null }
  const aid = semester === 'full' ? tuition : Math.min(tuition, semester)
  return { kind, annual, semester, aid, net: tuition - aid }
}

/** down: 한 구간 아래(유리한 쪽)로 가려면 줄여야 할 금액. up: 지금 구간에 머무는 여유(이만큼 늘어도 같은 구간) */
export function distance(total: number, year: string = BOUNDARY_YEAR): { down: number | null; up: number | null } {
  const bd = boundaries(year)
  const b = bracketOf(total, year)
  const i = BANDED.indexOf(b as Banded) // ma 는 -1
  const below = b === 'ma' ? bd.ra : i > 0 ? bd[BANDED[i - 1]] : null
  return {
    down: below === null ? null : total - below,
    up: b === 'ma' ? null : bd[b as Banded] - total,
  }
}

// ── 입력값·URL. 소득·등록금은 원, 재산은 만원 단위 숫자 문자열
export const DEFAULTS = {
  m: 'est', // est = 소득·재산으로 추정, known = 구간을 안다
  b: 'na',
  st: 's', // s 미혼, m 기혼
  sib: '2',
  ord: '12', // 12 = 첫째·둘째, 3 = 셋째 이상
  pi: '5000000', pd: '0', si: '0',
  re: '30000', dep: '0', fin: '3000', car: '1500', debt: '10000',
  tu: '0',
}
export type Key = keyof typeof DEFAULTS
export type Values = Record<Key, string>
export const CODES: Partial<Record<Key, readonly string[]>> = {
  m: ['est', 'known'], b: BRACKETS, st: ['s', 'm'], ord: ['12', '3'],
  sib: ['1', '2', '3', '4', '5', '6', '7', '8'],
}
export const MAX_DIGITS = 13
const KEYS = Object.keys(DEFAULTS) as Key[]
const ok = (k: Key, v: string) => (CODES[k] ? CODES[k]!.includes(v) : new RegExp(`^\\d{1,${MAX_DIGITS}}$`).test(v))

/** 없는 키·틀린 값은 기본값 */
export function parseValues(get: (k: string) => string | null): Values {
  const v = { ...DEFAULTS }
  for (const k of KEYS) {
    const q = get(k)
    if (q != null && ok(k, q)) v[k] = String(CODES[k] ? q : Number(q))
  }
  return v
}

/** 기본값과 다른 것만. 모두 기본이면 빈 문자열. 비운 숫자 칸은 '0' 으로 쓴다 */
export function toQuery(v: Values): string {
  const q = new URLSearchParams()
  for (const k of KEYS) {
    const x = CODES[k] ? v[k] : String(Number(v[k]) || 0)
    if (x !== DEFAULTS[k]) q.set(k, x)
  }
  return q.toString()
}

const MAN = 10_000
const n = (s: string) => Number(s) || 0

export function householdOf(v: Values): Household {
  return {
    married: v.st === 'm',
    parentIncome: n(v.pi), parentDaily: n(v.pd), studentIncome: n(v.si),
    realEstate: n(v.re) * MAN, deposit: n(v.dep) * MAN, financial: n(v.fin) * MAN, car: n(v.car) * MAN, debt: n(v.debt) * MAN,
    siblings: n(v.sib) || 1,
  }
}

export interface Outcome {
  bracket: Bracket
  rec: Recognized | null
  pct: number | null
  dist: { down: number | null; up: number | null } | null
  award: Award
}

export function evaluate(v: Values): Outcome {
  const h = householdOf(v)
  const kind = kindOf(h.married, h.siblings, v.ord === '3')
  const tu = n(v.tu)
  if (v.m === 'known') {
    const bracket = v.b as Bracket
    return { bracket, rec: null, pct: null, dist: null, award: award(bracket, kind, tu) }
  }
  const rec = recognizedIncome(h)
  const bracket = bracketOf(rec.total)
  return { bracket, rec, pct: (rec.total / median4(BOUNDARY_YEAR)) * 100, dist: distance(rec.total), award: award(bracket, kind, tu) }
}
