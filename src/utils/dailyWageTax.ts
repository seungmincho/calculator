/**
 * 일용직(일용근로소득) 원천징수 계산. 회귀 체크: node scripts/check-daily-wage-tax.ts
 *
 * 하루 소득세 = (일당 − 비과세 − 150,000) × 6% − 산출세액 × 55% = 과세분 × 2.7% (원 미만 버림)
 *   - 근로소득공제 1일 15만원: 소득세법 제47조②
 *   - 원천징수세율 6%: 소득세법 제129조①4호 단서
 *   - 근로소득세액공제 55%: 소득세법 제59조③
 * 소액부징수: 원천징수세액 1,000원 미만이면 걷지 않음(소득세법 제86조). 여러 날 치를 한 번에 주면
 *   일별 세액의 합계로 판단(국세청 법인46013-343, 1997.2.1) → 판단 단위 = 1회 지급분.
 * 지방소득세 = 소득세 × 10% (지방세법 제103조의13 특별징수), 원 미만 버림.
 * 고용보험 근로자 0.9%: 일용근로자는 근로시간과 관계없이 적용(고용보험법 시행령 제3조① 단서), 보수(비과세 제외) 기준.
 */
import { INSURANCE } from './insuranceRates.ts'
import { withholding33 } from './salesCommission.ts'

export const DAILY_DEDUCTION = 150_000
export const SMALL_TAX = 1_000
/** 식대 비과세 월 한도 (소득세법 시행령 제17조의2) */
export const MEAL_MONTHLY_CAP = 200_000
export const MAX_DAYS = 31

export type PayMode = 'day' | 'week' | 'month'

export interface Input {
  wage: number // 일당 (세전, 비과세 포함)
  days: number // 기간(한 달) 근무일수
  mode: PayMode // 지급 방식
  weekDays?: number // 주급일 때 1회 지급에 들어가는 근무일수
  meal?: number // 하루 비과세 식대
  employment?: boolean // 고용보험 공제 여부
}

/** 10원 미만 버림 (요율 곱셈의 부동소수 오차 보정) */
const floor10 = (n: number) => Math.floor(n / 10 + 1e-9) * 10

const int = (n: number | undefined, lo: number, hi: number) =>
  Number.isFinite(n) ? Math.min(hi, Math.max(lo, Math.floor(n as number))) : lo

/** 하루 과세분에 대한 소득세 (소액부징수 판단 전) */
export const dayIncomeTax = (taxableDay: number) =>
  Math.floor((Math.max(0, taxableDay - DAILY_DEDUCTION) * 27) / 1000)

/** 1회 지급분(n일 치) 소득세 — 일별 세액 합계가 1,000원 미만이면 0 */
export const paymentTax = (dayTax: number, n: number) => (dayTax * n < SMALL_TAX ? 0 : dayTax * n)

/** 근무일수를 지급 1회분 묶음으로 나눔 (예: 12일, 주 5일 → [5, 5, 2]) */
export function chunks(days: number, size: number): number[] {
  const out: number[] = []
  for (let left = days; left > 0; left -= size) out.push(Math.min(size, left))
  return out
}

export function calcDailyWageTax(input: Input) {
  const wage = int(input.wage, 0, 10_000_000)
  const days = int(input.days, 1, MAX_DAYS)
  const meal = Math.min(int(input.meal ?? 0, 0, wage), Math.floor(MEAL_MONTHLY_CAP / days))
  const size = input.mode === 'day' ? 1 : input.mode === 'week' ? int(input.weekDays ?? 5, 1, 7) : days
  const taxableDay = wage - meal
  const dayTax = dayIncomeTax(taxableDay)

  const pays = chunks(days, size)
  let incomeTax = 0
  let localTax = 0
  for (const n of pays) {
    const tax = paymentTax(dayTax, n)
    incomeTax += tax
    localTax += Math.floor(tax / 10)
  }
  const gross = wage * days
  const taxable = taxableDay * days
  const employment = input.employment === false ? 0 : floor10(taxable * INSURANCE.employmentRate)
  const deductions = incomeTax + localTax + employment
  const net = gross - deductions
  // 같은 기간을 한 번에 받았다면 (소액부징수 비교용)
  const lumpTax = paymentTax(dayTax, days)

  return {
    wage, days, meal, size, payments: pays.length,
    gross, nonTaxable: meal * days, taxable, taxableDay, dayTax,
    incomeTax, localTax, employment, deductions, net,
    /** 일별 세액은 있는데 소액부징수로 걷지 않은 금액 */
    exempted: dayTax * days - incomeTax,
    lumpTax, lumpLocal: Math.floor(lumpTax / 10),
    /** 하루 평균 */
    perDay: { incomeTax: incomeTax / days, localTax: localTax / days, employment: employment / days, net: net / days },
  }
}

/** 같은 금액을 사업소득 3.3%로 원천징수했다면 (지급 총액 기준) */
export function compare33(gross: number, dailyTaxTotal: number) {
  const w = withholding33(gross)
  return { ...w, diff: w.total - dailyTaxTotal }
}

/**
 * 국민연금·건강보험(근로자 부담) 참고 추정 — 1개월 이상 근로 + 월 8일 이상 등 조건 충족 시에만 대상.
 * 국민연금 기준소득월액 하한·상한 적용, 원 단위는 10원 미만 버림.
 */
export function socialEstimate(taxable: number) {
  const base = Math.min(INSURANCE.pensionMonthlyCap, Math.max(INSURANCE.pensionMonthlyFloor, taxable))
  const pension = floor10(base * INSURANCE.pensionRate)
  const health = floor10(taxable * INSURANCE.healthRate)
  const care = floor10(health * INSURANCE.longTermCareRate)
  return { pension, health, care, total: pension + health + care }
}
