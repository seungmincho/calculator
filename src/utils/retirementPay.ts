// 퇴직금 + 퇴직소득세(2023.1.1 이후 퇴직분). 회귀 체크: node scripts/check-retirement.ts
// 금액 단위: 원. 날짜: 'YYYY-MM-DD' (UTC 기준 산술, 시간대 무관).
import { progressiveTax } from './yearEndTax.ts'

const DAY = 86_400_000
const toMs = (s: string) => { const [y, m, d] = s.split('-').map(Number); return Date.UTC(y, m - 1, d) }
export const isoOf = (ms: number) => new Date(ms).toISOString().slice(0, 10)
export const isDate = (s: string | null | undefined): s is string =>
  !!s && /^\d{4}-\d{2}-\d{2}$/.test(s) && isoOf(toMs(s)) === s

/** n개월 더하기 (말일 보정: 5/31 − 3개월 = 2/28) */
export function addMonths(date: string, n: number): string {
  const [y, m, d] = date.split('-').map(Number)
  const first = Date.UTC(y, m - 1 + n, 1)
  const dt = new Date(first)
  const last = new Date(Date.UTC(dt.getUTCFullYear(), dt.getUTCMonth() + 1, 0)).getUTCDate()
  return isoOf(Date.UTC(dt.getUTCFullYear(), dt.getUTCMonth(), Math.min(d, last)))
}

// 퇴직일 = 마지막 근무일의 다음 날(근로관계 종료일, 고용노동부 퇴직금 계산기와 동일).
// 재직일수 = 퇴직일 − 입사일 (= 입사일~마지막 근무일 양 끝 포함 일수)
export const serviceDays = (start: string, end: string) => Math.round((toMs(end) - toMs(start)) / DAY)

/** 만 근속 연수(완전히 채운 해) */
export function fullYears(start: string, end: string): number {
  let y = Math.max(0, Number(end.slice(0, 4)) - Number(start.slice(0, 4)))
  while (y > 0 && addMonths(start, 12 * y) > end) y--
  return y
}

/** 퇴직소득세 근속연수: 1년 미만 끝수는 1년 (소득세법 시행령 제105조 ①) */
export function taxServiceYears(start: string, end: string): number {
  if (end <= start) return 0
  const y = fullYears(start, end)
  return addMonths(start, 12 * y) < end ? y + 1 : y
}

// ── 근속연수공제 (소득세법 제48조 ①2호, 2023.1.1 이후 퇴직분) ──
export function serviceDeduction(years: number): number {
  if (years <= 0) return 0
  if (years <= 5) return 1_000_000 * years
  if (years <= 10) return 5_000_000 + 2_000_000 * (years - 5)
  if (years <= 20) return 15_000_000 + 2_500_000 * (years - 10)
  return 40_000_000 + 3_000_000 * (years - 20)
}

// ── 환산급여공제 (소득세법 제48조 ①2호 가목 표, 2023.1.1 이후) ──
export function convertedDeduction(c: number): number {
  if (c <= 8_000_000) return Math.max(0, c)
  if (c <= 70_000_000) return Math.floor(8_000_000 + (c - 8_000_000) * 0.6)
  if (c <= 100_000_000) return Math.floor(45_200_000 + (c - 70_000_000) * 0.55)
  if (c <= 300_000_000) return Math.floor(61_700_000 + (c - 100_000_000) * 0.45)
  return Math.floor(151_700_000 + (c - 300_000_000) * 0.35)
}

const floor10 = (n: number) => Math.floor(n / 10) * 10 // 국고금관리법 제47조: 10원 미만 절사

/** 퇴직소득세 (소득세법 제48조·제55조 ②): 근속연수공제 → 12배 환산 → 환산급여공제 → 기본세율 → ÷12×근속연수 */
export function retirementTax(pay: number, years: number) {
  const zero = { serviceDed: 0, converted: 0, convertedDed: 0, base: 0, convertedTax: 0, tax: 0, localTax: 0, totalTax: 0 }
  if (pay <= 0 || years <= 0) return zero
  const serviceDed = Math.min(pay, serviceDeduction(years))
  const converted = Math.floor(((pay - serviceDed) * 12) / years)
  const convertedDed = convertedDeduction(converted)
  const base = converted - convertedDed
  const convertedTax = progressiveTax(base)
  const tax = floor10((convertedTax * years) / 12)
  const localTax = floor10(tax * 0.1) // 지방세법 제103조의13: 퇴직소득분 지방소득세 = 소득세의 10%
  return { serviceDed, converted, convertedDed, base, convertedTax, tax, localTax, totalTax: tax + localTax }
}

export interface RetirementInput {
  start: string // 입사일
  end: string // 퇴직일(마지막 근무일 다음 날)
  monthly: number // 퇴직 전 3개월 월평균 임금(세전, 기본급+고정수당)
  bonus: number // 직전 1년 상여금 총액
  leave: number // 직전 1년 연차수당 총액
}

export function calcRetirement(x: RetirementInput) {
  if (!isDate(x.start) || !isDate(x.end) || x.end <= x.start) return null
  const days = serviceDays(x.start, x.end)
  const years = fullYears(x.start, x.end)
  const months = (() => { let m = years * 12; while (addMonths(x.start, m + 1) <= x.end) m++; return m - years * 12 })()
  // 근로자퇴직급여 보장법 제4조 ①: 계속근로기간 1년 미만이면 퇴직금 지급 의무 없음
  const eligible = years >= 1
  // 평균임금 산정기간 = 퇴직일 이전 3개월의 달력 일수 (근로기준법 제2조 ①6호) — 89~92일
  const periodStart = addMonths(x.end, -3)
  const periodDays = serviceDays(periodStart, x.end)
  // 상여금·연차수당은 직전 12개월분 × 3/12 가산 (고용노동부 평균임금 산정 지침)
  const wages3m = x.monthly * 3 + (x.bonus * 3) / 12 + (x.leave * 3) / 12
  const dailyWage = wages3m / periodDays
  const pay = eligible ? Math.floor(dailyWage * 30 * (days / 365)) : 0 // 근로자퇴직급여 보장법 제8조 ①
  const taxYears = taxServiceYears(x.start, x.end)
  const tax = retirementTax(pay, taxYears)
  // IRP 이전 후 연금수령: 연금소득세 = 이연퇴직소득세 × 70%(실수령 10년차까지) / 60%(11년차~) (소득세법 제129조 ①5호)
  const irp70 = floor10(tax.tax * 0.7) + floor10(tax.localTax * 0.7)
  const irp60 = floor10(tax.tax * 0.6) + floor10(tax.localTax * 0.6)
  return {
    days, years, months, eligible, periodStart, periodDays, wages3m: Math.floor(wages3m), dailyWage,
    pay, taxYears, ...tax, net: pay - tax.totalTax,
    effRate: pay > 0 ? (tax.totalTax / pay) * 100 : 0,
    irp70, irp60,
  }
}
export type RetirementResult = NonNullable<ReturnType<typeof calcRetirement>>
