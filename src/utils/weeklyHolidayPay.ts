/**
 * 주휴수당·시급 환산 (WeeklyHolidayPay, HourlyWage 공용). 회귀 체크: node scripts/check-weekly-holiday-pay.ts
 *
 * 근거: 근로기준법 제55조①·시행령 제30조①(1주 소정근로일 개근 → 유급휴일),
 *       제18조②③(단시간 근로자 비례, 4주 평균 주 15시간 미만은 주휴 제외)
 * 주휴시간 = min(주 소정근로, 40) / 40 × 8. 소정근로는 하루 8시간 이내분만 (초과분은 연장근로).
 * 월 환산 = (주 근로 + 주휴) × 365/7/12 를 정수 반올림 (주 40시간 → 209시간, 최저임금 고시 월 환산과 동일)
 */
import { MIN_WAGE_2026, WEEKS_PER_MONTH } from './workHours.ts'
import { INSURANCE } from './insuranceRates.ts'
import { withholding33 } from './salesCommission.ts'

export { MIN_WAGE_2026, WEEKS_PER_MONTH }

const sum = (a: number[]) => a.reduce((s, x) => s + x, 0)

/** 주 소정근로시간 → 주휴시간 (15시간 미만 0, 최대 8) */
export const holidayHoursFor = (contractWeekly: number) =>
  contractWeekly >= 15 ? (Math.min(40, contractWeekly) / 40) * 8 : 0

/** 주 유급시간 → 월 유급시간 (정수 반올림, 209시간 방식) */
export const monthlyHoursFor = (paidWeekly: number) => Math.round(paidWeekly * WEEKS_PER_MONTH)

/** 휴게 차감한 하루 실근로시간 */
export const netDayHours = (stayHours: number, breakMin: number) =>
  stayHours > 0 ? Math.max(0, stayHours - breakMin / 60) : 0

export interface WeekCalc {
  workedHours: number    // 주 실근로
  contractHours: number  // 주휴 판단용 소정근로 (일 8h·주 40h 이내)
  overtimeHours: number  // 일 8h·주 40h 초과분 (5인 이상이면 50% 가산 대상, 여기선 1배만 반영)
  eligible: boolean
  holidayHours: number
  basePay: number        // 주 근로분 임금
  holidayPay: number     // 주휴수당
  weeklyTotal: number
  monthlyHours: number
  monthlyBase: number    // 주휴 제외 월 환산
  monthlyTotal: number   // 주휴 포함 월 환산
  yearlyTotal: number
  effectiveHourly: number // 주휴 포함 실질 시급 = 주급 / 실근로
}

/** dayHours: 요일별 실근로시간(휴게 차감 후). 0 = 쉬는 날 */
export function calcWeek(wage: number, dayHours: number[]): WeekCalc {
  const days = dayHours.map((h) => Math.max(0, h || 0))
  const worked = sum(days)
  const within8 = sum(days.map((h) => Math.min(8, h)))
  const contract = Math.min(40, within8)
  const holidayHours = holidayHoursFor(contract)
  const basePay = wage * worked
  const holidayPay = wage * holidayHours
  const monthlyHours = monthlyHoursFor(worked + holidayHours)
  const monthlyTotal = wage * monthlyHours
  return {
    workedHours: worked,
    contractHours: contract,
    overtimeHours: worked - contract,
    eligible: holidayHours > 0,
    holidayHours,
    basePay,
    holidayPay,
    weeklyTotal: basePay + holidayPay,
    monthlyHours,
    monthlyBase: wage * monthlyHoursFor(worked),
    monthlyTotal,
    yearlyTotal: monthlyTotal * 12,
    effectiveHourly: worked > 0 ? (basePay + holidayPay) / worked : 0,
  }
}

/** 주 N일 × 하루 N시간 → 요일 배열 (월요일부터) */
export const evenDays = (days: number, hours: number) =>
  Array.from({ length: 7 }, (_, i) => (i < days ? hours : 0))

export type DeductMode = 'none' | 'tax33' | 'ins'

/**
 * 월 공제액. tax33 = 사업소득 원천징수 3.3%(소득세 3% + 지방세 0.3%, 10원 미만 절사).
 * ins = 4대보험 근로자 부담분(국민연금은 기준소득월액 하한·상한 적용). 근로소득세는 호출부에서 더함.
 */
export function monthlyDeduction(monthly: number, mode: DeductMode) {
  if (mode === 'tax33') {
    const w = withholding33(monthly)
    return { pension: 0, health: 0, care: 0, employment: 0, tax: w.total, total: w.total }
  }
  if (mode === 'ins') {
    const base = Math.min(INSURANCE.pensionMonthlyCap, Math.max(INSURANCE.pensionMonthlyFloor, monthly))
    const pension = Math.floor((base * INSURANCE.pensionRate) / 10) * 10
    const health = Math.floor((monthly * INSURANCE.healthRate) / 10) * 10
    const care = Math.floor((health * INSURANCE.longTermCareRate) / 10) * 10
    const employment = Math.floor((monthly * INSURANCE.employmentRate) / 10) * 10
    return { pension, health, care, employment, tax: 0, total: pension + health + care + employment }
  }
  return { pension: 0, health: 0, care: 0, employment: 0, tax: 0, total: 0 }
}

// ── 시급 ↔ 일급 ↔ 주급 ↔ 월급 ↔ 연봉 ──
export type WageType = 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly'

export function wageTable(type: WageType, amount: number, weeklyHours: number, daysPerWeek: number, holiday: boolean) {
  const holidayHours = holiday ? holidayHoursFor(weeklyHours) : 0
  const monthlyHours = monthlyHoursFor(weeklyHours + holidayHours)
  const dailyHours = weeklyHours / daysPerWeek
  const weeklyPaid = weeklyHours + holidayHours
  const hourly =
    type === 'hourly' ? amount
    : type === 'daily' ? amount / dailyHours
    : type === 'weekly' ? amount / weeklyPaid
    : type === 'monthly' ? amount / monthlyHours
    : amount / 12 / monthlyHours
  const monthly = hourly * monthlyHours
  return {
    hourly,
    daily: hourly * dailyHours,
    weekly: hourly * weeklyPaid,
    monthly,
    yearly: monthly * 12,
    holidayHours,
    monthlyHours,
    dailyHours,
    holidayPayMonthly: hourly * holidayHours * WEEKS_PER_MONTH,
  }
}
