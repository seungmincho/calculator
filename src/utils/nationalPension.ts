/**
 * 국민연금 노령연금 추정 — 순수 계산 (현재가치, 2026년 기준).
 *
 * 근거: 국민연금법(2026.1.1 시행, 법률 제20903호 2025.4.2 개정 반영) — law.go.kr
 * - 제51조 기본연금액 = 1.29 × (A + B) × (1 + 0.05 × 20년 초과연수)   (2026.1.1 이후 가입기간)
 * - 부칙(2007.7.23) 제20조: 2008년 1.5 → 매년 0.015↓ → 2025년 1.245. 1999~2007 1.8, 1988~1998 2.4(A+0.75B) (종전 규정)
 * - 제63조: 10~20년 미만 = 기본연금액 × (50% + 10년 초과 1년마다 5%)
 *   → 두 규칙을 합치면 월 연금 = Σ 계수 × (A + B) × 가입월수 ÷ 240 ÷ 12 (가입기간 10년 이상일 때)
 * - 제63조②·제62조: 조기 1년당 6%(월 0.5%) 감액, 연기 1개월당 0.6%(1년 7.2%) 가산 — 둘 다 부양가족연금 제외
 * - 제18조: 군복무 크레딧 최대 12개월(2026 이후 전역자), B = A/2 / 제19조: 출산 크레딧 자녀 1·2명 12개월씩, 셋째부터 18개월, B = A
 * - 제63조의2(2025.12.16 개정, 2026.6.17 시행): 초과소득월액(소득 − A) 200만원 이상부터 감액, 노령연금액의 1/2 한도
 * - 제52조 부양가족연금 2026.1~12: 배우자 연 306,630원, 자녀·부모 연 204,360원 — 국민연금공단 https://www.nps.or.kr/pnsinfo/ntpsklg/getOHAF0048M0.do
 * A값 3,193,511원(2025.12~2026.11 적용, 같은 공단 페이지). 기준소득월액 41만~659만원(2026.7~2027.6, korea.kr 2026.1.12)
 */
import { INSURANCE } from './insuranceRates.ts'

export const YEAR = INSURANCE.year // 2026
export const A_VALUE = 3_193_511
export const INCOME_FLOOR = INSURANCE.pensionMonthlyFloor
export const INCOME_CAP = INSURANCE.pensionMonthlyCap
export const MIN_MONTHS = 120
export const EARLY_PER_YEAR = 0.06
export const DEFER_PER_YEAR = 0.072
export const MAX_SHIFT = 5
export const NEW_COEF = 1.29
/** 부양가족연금 연액 (2026) */
export const DEPENDENT_ANNUAL = { spouse: 306_630, child: 204_360, parent: 204_360 } as const
/** 2026년 소비자물가 반영 연금 인상률 */
export const CPI_2026 = 0.021

/** 출생연도별 수급개시연령 (부칙 2007.7.23 제18조) */
export function startAge(birthYear: number): number {
  if (birthYear <= 1952) return 60
  if (birthYear <= 1956) return 61
  if (birthYear <= 1960) return 62
  if (birthYear <= 1964) return 63
  if (birthYear <= 1968) return 64
  return 65
}

/** 가입연도별 기본연금액 계수와 B 가중치 */
export function coef(year: number): { c: number; bw: number } {
  if (year <= 1998) return { c: 2.4, bw: 0.75 }
  if (year <= 2007) return { c: 1.8, bw: 1 }
  if (year <= 2025) return { c: Math.round((1.5 - 0.015 * (year - 2008)) * 1000) / 1000, bw: 1 }
  return { c: NEW_COEF, bw: 1 }
}

/** 40년 가입 시 소득대체율 (표시용) */
export const replacementRate = (year: number) => (year <= 1998 ? 0.7 : Math.round((coef(year).c / 3) * 1000) / 1000)

/** 연도별 연금보험료율(전체, 사업장 기준). 지역가입자는 1995~2005년 3%→9% 단계 인상이었으나 단순화 */
export function premiumRate(year: number): number {
  if (year <= 1992) return 0.03
  if (year <= 1997) return 0.06
  if (year <= 2025) return 0.09
  return Math.min(0.13, Math.round((0.095 + 0.005 * (year - 2026)) * 1000) / 1000)
}

/** 출산 크레딧 개월 수. newRule = 2026년 이후 첫째(또는 그 뒤 자녀)를 얻은 경우 */
export function childCreditMonths(children: number, newRule: boolean): number {
  const n = Math.max(0, Math.floor(children))
  if (newRule) return n <= 2 ? 12 * n : 24 + 18 * (n - 2)
  return n < 2 ? 0 : Math.min(50, 12 + 18 * (n - 2))
}

export const clampIncome = (v: number) => Math.min(INCOME_CAP, Math.max(INCOME_FLOOR, v))

export interface PensionInput {
  birthYear: number
  startYear: number
  /** 본인 가입(납부) 연수 — 앞으로 낼 기간 포함, 연속 가정 */
  years: number
  /** 가입기간 평균 월소득(현재가치) */
  income: number
  /** 직장가입자면 본인 부담 = 절반 */
  employee?: boolean
  children?: number
  childNewRule?: boolean
  militaryMonths?: number
  spouse?: boolean
  depChildren?: number
  depParents?: number
  /** 추납·임의(계속)가입으로 더하는 개월 (현행 계수 1.29) */
  extraMonths?: number
}

/** 표시용 구간: 1988~1998 / 1999~2007 / 2008~2025(매년 하락) / 2026~. rate = 구간 첫해 소득대체율 */
export interface Period { from: number; to: number; months: number; rate: number }
const era = (y: number) => (y <= 1998 ? 1 : y <= 2007 ? 2 : y <= 2025 ? 3 : 4)

export interface PensionResult {
  eligible: boolean
  B: number
  ownMonths: number
  creditMonths: number
  totalMonths: number
  /** 부양가족연금 제외 월 노령연금 (정상 수령, 현재가치) */
  basic: number
  /** 부양가족연금 월액 */
  dependent: number
  /** basic + dependent */
  monthly: number
  startAge: number
  pensionYear: number
  periods: Period[]
  /** 총 보험료(사용자 부담 포함) / 본인 부담 */
  paidTotal: number
  paidSelf: number
}

export function calcPension(p: PensionInput): PensionResult {
  const B = clampIncome(p.income)
  const years = Math.max(0, Math.floor(p.years))
  let sum = 0
  let paidTotal = 0
  const periods: Period[] = []
  for (let y = p.startYear; y < p.startYear + years; y++) {
    const { c, bw } = coef(y)
    sum += c * (A_VALUE + bw * B) * 12
    paidTotal += premiumRate(y) * B * 12
    const last = periods[periods.length - 1]
    if (last && era(last.from) === era(y)) { last.to = y; last.months += 12 }
    else periods.push({ from: y, to: y, months: 12, rate: replacementRate(y) })
  }
  const child = childCreditMonths(p.children ?? 0, !!p.childNewRule)
  const military = Math.min(12, Math.max(0, p.militaryMonths ?? 0))
  // ponytail: 크레딧 기간은 수급권 취득 시점 계수(1.29)로 단순화 — 실제 적용 계수는 공단 확인 필요
  sum += NEW_COEF * (A_VALUE + A_VALUE) * child + NEW_COEF * (A_VALUE + A_VALUE / 2) * military
  const extra = Math.max(0, p.extraMonths ?? 0)
  sum += NEW_COEF * (A_VALUE + B) * extra
  const ownMonths = years * 12 + extra
  const creditMonths = child + military
  const totalMonths = ownMonths + creditMonths
  const eligible = totalMonths >= MIN_MONTHS
  const basic = eligible ? Math.round(sum / 240 / 12) : 0
  const dependent = eligible
    ? Math.round(((p.spouse ? DEPENDENT_ANNUAL.spouse : 0) + (p.depChildren ?? 0) * DEPENDENT_ANNUAL.child + (p.depParents ?? 0) * DEPENDENT_ANNUAL.parent) / 12)
    : 0
  const age = startAge(p.birthYear)
  paidTotal = Math.round(paidTotal)
  return {
    eligible, B, ownMonths, creditMonths, totalMonths, basic, dependent, monthly: basic + dependent,
    startAge: age, pensionYear: p.birthYear + age, periods,
    paidTotal, paidSelf: p.employee === false ? paidTotal : Math.round(paidTotal / 2),
  }
}

/** 나이 기준 간이 입력(/pension-calculator) → calcPension 입력. 60세 이후 납부는 임의계속가입(최대 65세, 제13조)으로 본다.
 *  /national-pension 딥링크(b·s·y·i)도 이 값을 그대로 쓴다. 제도 시행(1988) 전 기간은 빼고 센다 */
export function ageInput(currentAge: number, income: number, joinAge: number, retireAge: number): PensionInput {
  const birthYear = YEAR - currentAge
  const startYear = Math.max(1988, birthYear + joinAge)
  return { birthYear, startYear, years: Math.max(0, birthYear + Math.min(retireAge, 65) - startYear), income }
}

export const calcByAge = (currentAge: number, income: number, joinAge: number, retireAge: number): PensionResult =>
  calcPension(ageInput(currentAge, income, joinAge, retireAge))

/** 조기(shift<0)·연기(shift>0) 수령 월액. 부양가족연금은 가감 없이 더함 */
export function shifted(basic: number, dependent: number, shift: number): number {
  const s = Math.max(-MAX_SHIFT, Math.min(MAX_SHIFT, shift))
  const f = s < 0 ? 1 + EARLY_PER_YEAR * s : 1 + DEFER_PER_YEAR * s
  return Math.round(basic * f) + dependent
}

/** toAge세가 될 때까지 받은 누적액 (startAge부터 매년 12개월) */
export const cumulative = (monthly: number, from: number, toAge: number) => monthly * 12 * Math.max(0, toAge - from)

/** 두 수령 방식의 누적액이 같아지는 나이 (없으면 null) */
export function crossoverAge(m1: number, s1: number, m2: number, s2: number): number | null {
  if (m1 === m2) return null
  const age = (m2 * s2 - m1 * s1) / (m2 - m1)
  return age > Math.max(s1, s2) ? Math.round(age * 10) / 10 : null
}

/** 낸 보험료를 연금으로 돌려받는 나이 */
export const paybackAge = (paid: number, monthly: number, from: number) =>
  monthly > 0 ? Math.round((from + paid / (monthly * 12)) * 10) / 10 : null

/** 소득활동 감액 월액 (제63조의2, 2026.6.17~). pension = 부양가족연금 제외 노령연금액 */
export function workReduction(pension: number, monthlyIncome: number): number {
  const ex = monthlyIncome - A_VALUE
  let cut = 0
  if (ex >= 4_000_000) cut = 500_000 + (ex - 4_000_000) * 0.25
  else if (ex >= 3_000_000) cut = 300_000 + (ex - 3_000_000) * 0.2
  else if (ex >= 2_000_000) cut = 150_000 + (ex - 2_000_000) * 0.15
  return Math.round(Math.min(cut, pension / 2))
}

/** 현재가치 → 수령 시점 명목 금액 (연 g 상승 가정) */
export const nominal = (pv: number, fromYear: number, toYear: number, g: number) =>
  Math.round(pv * Math.pow(1 + g, Math.max(0, toYear - fromYear)))

/** 추납 보험료: 신청 시점 보험료율 × 기준소득월액 × 개월 (제92조③) */
export const catchUpCost = (income: number, months: number) => Math.round(clampIncome(income) * premiumRate(YEAR) * months)
