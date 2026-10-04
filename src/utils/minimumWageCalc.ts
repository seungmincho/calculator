/**
 * 최저임금 계산기 (MinimumWageCalculator). 회귀 체크: node scripts/check-minimum-wage.ts
 *
 * 시간급은 minimumWage.ts, 주휴·월 환산은 weeklyHolidayPay.ts 단일 출처를 그대로 쓴다.
 * 월 환산 = (주 소정근로 + 주휴) × 365/7/12 반올림 (주 40h → 209h, 최저임금법 시행령 제5조의2)
 * 수습 감액: 최저임금법 제5조②·시행령 제3조 — 1년 이상 계약 + 수습 3개월 이내 + 단순노무 아님 → 시간급의 90%
 */
import { MIN_WAGE_BY_YEAR, minWageFor } from './minimumWage.ts'
import { holidayHoursFor, monthlyHoursFor } from './weeklyHolidayPay.ts'

export const YEARS = [2026, 2027] as const
export type Year = (typeof YEARS)[number]
/** 2027년 금액이 고시(2026.8.5)된 뒤라 정적 기본값으로 둔다 */
export const DEFAULT_YEAR: Year = 2027
export const HOURS_TABLE = [15, 20, 25, 30, 35, 40] as const

const clamp = (n: number, lo: number, hi: number) => (Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : lo)

/** 그 해 시간급 (수습 감액이면 10% 뺀 금액) */
export const hourlyFor = (year: number, probation = false) => {
  const w = minWageFor(year)
  return probation ? w - Math.round(w / 10) : w
}

/** 전년 대비 인상액·인상률(%) */
export function raiseFrom(year: number) {
  const cur = minWageFor(year)
  const prev = MIN_WAGE_BY_YEAR[year - 1] ?? cur
  return { prev, diff: cur - prev, rate: prev ? ((cur - prev) / prev) * 100 : 0 }
}

/**
 * 주 소정근로시간·근무일수 → 시급·일급·주급·월급·연봉.
 * 소정근로는 하루 8시간·주 40시간 이내(근로기준법 제50조)로 자른다 — 넘는 부분은 연장근로라 이 표에 넣지 않음.
 */
export function calcMinWage(year: number, weeklyHours: number, days: number, probation = false) {
  const hourly = hourlyFor(year, probation)
  const d = Math.round(clamp(days, 1, 7))
  const hours = clamp(weeklyHours, 0, Math.min(40, d * 8))
  const holidayHours = holidayHoursFor(hours)
  const monthlyHours = monthlyHoursFor(hours + holidayHours)
  const monthly = hourly * monthlyHours
  return {
    hourly,
    hours,
    days: d,
    clipped: hours < weeklyHours,
    dailyHours: hours / d,
    holidayHours,
    eligible: holidayHours > 0,
    daily: Math.round(hourly * (hours / d)),
    holidayPay: Math.round(hourly * holidayHours),
    weekly: Math.round(hourly * (hours + holidayHours)),
    monthlyHours,
    monthly,
    yearly: monthly * 12,
  }
}

/** 내 임금(시급 또는 월급) → 최저임금 미달 여부와 부족액. 월급은 같은 월 환산시간으로 나눠 시급 환산 */
export function checkWage(pay: number, type: 'hourly' | 'monthly', minHourly: number, monthlyHours: number) {
  const myHourly = type === 'hourly' ? pay : monthlyHours > 0 ? pay / monthlyHours : 0
  const gap = minHourly - myHourly
  const below = pay > 0 && gap > 1e-9
  const shortMonthly = below ? Math.round(gap * monthlyHours) : 0
  return {
    myHourly,
    below,
    gapHourly: below ? Math.ceil(gap - 1e-9) : 0,
    surplusHourly: below ? 0 : Math.floor(-gap + 1e-9),
    shortMonthly,
    shortYearly: shortMonthly * 12,
  }
}
