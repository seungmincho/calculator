/** 실업급여(구직급여) 계산 순수 로직. 검증: node scripts/check-unemployment-benefit.ts */
import { MIN_WAGE_2026 } from './workHours.ts'
import { addDays, addMonths, daysBetween, weekday } from './dday.ts'
import { getKoreanHolidays } from './koreanHolidays.ts'

// 2026.1.1 이후 이직자 기준.
// 상한: 고용보험법 시행령 제68조 — 1일 66,000 → 68,100원 (2026.1.1 시행)
// 하한: 고용보험법 제46조 — 최저기초일액(최저임금 × 1일 소정근로시간) × 80%
//       = 10,320 × 0.8 × 8h = 66,048원. 2023.12.1부터 단시간 근로자는 실제 소정근로시간으로 계산(4시간 간주 폐지).
export const DAILY_CAP = 68_100
export const BENEFIT_RATE = 0.6
export const FLOOR_RATE = 0.8
export const WAITING_DAYS = 7

/** 1일 하한액 = 최저임금 × 80% × 1일 소정근로시간(최대 8) */
export const dailyFloor = (hours = 8) => Math.floor(MIN_WAGE_2026 * FLOOR_RATE * Math.min(Math.max(hours, 1), 8))

export type AgeGroup = 'under50' | 'over50'
export type InsurancePeriod = 'under1' | '1to3' | '3to5' | '5to10' | 'over10'
export const PERIODS: InsurancePeriod[] = ['under1', '1to3', '3to5', '5to10', 'over10']

// 고용보험법 별표 1 (소정급여일수). 50세 이상·장애인은 같은 행.
export const BENEFIT_DAYS: Record<AgeGroup, number[]> = {
  under50: [120, 150, 180, 210, 240],
  over50: [120, 180, 210, 240, 270],
}

export const benefitDays = (age: AgeGroup, period: InsurancePeriod) => BENEFIT_DAYS[age][PERIODS.indexOf(period)]

/** 이직일 이전 3개월의 총 일수 (평균임금 산정 기간, 89~92일) */
export const daysIn3Months = (leaveDate: string) => {
  const next = addDays(leaveDate, 1)
  return daysBetween(addMonths(next, -3), next)
}

/** 3개월 평균 월급(세전) → 평균임금 1일분 */
export const avgDailyWage = (monthly: number, leaveDate: string) => Math.floor((monthly * 3) / daysIn3Months(leaveDate))

export interface Daily { daily: number; raw: number; floor: number; applied: 'cap' | 'floor' | 'none' }

export function dailyBenefit(avgDaily: number, hours = 8): Daily {
  const raw = Math.floor(avgDaily * BENEFIT_RATE)
  const floor = dailyFloor(hours)
  if (raw > DAILY_CAP) return { daily: DAILY_CAP, raw, floor, applied: 'cap' }
  if (raw < floor) return { daily: floor, raw, floor, applied: 'floor' }
  return { daily: raw, raw, floor, applied: 'none' }
}

/**
 * 조기재취업수당: 구직급여를 paidDays일 받은 뒤 재취업.
 * 잔여 소정급여일수가 1/2 이상이면 잔여 구직급여액의 1/2 (12개월 이상 계속 고용 시 지급, 시행령 제84조).
 */
export function earlyBonus(daily: number, days: number, paidDays: number) {
  const remaining = Math.max(days - paidDays, 0)
  const eligible = remaining * 2 >= days && paidDays >= 0
  const bonus = eligible ? Math.floor((daily * remaining) / 2) : 0
  return { remaining, eligible, bonus, total: daily * Math.min(paidDays, days) + bonus }
}

/** 조기재취업수당을 받을 수 있는 마지막 수급 일수 */
export const lastEligiblePaidDay = (days: number) => Math.floor(days / 2)

/** 주말·공휴일이면 다음 영업일로 */
export function nextBusinessDay(d: string): string {
  let x = d
  for (;;) {
    const wd = weekday(x)
    if (wd !== 0 && wd !== 6 && !getKoreanHolidays(+x.slice(0, 4)).some((h) => h.date === x)) return x
    x = addDays(x, 1)
  }
}

export interface Recognition { n: number; date: string; payDays: number; amount: number; cumulative: number }

/**
 * 예상 실업인정 일정. 가정: 신청일부터 7일 대기 → 1차 실업인정 = 신청 2주 뒤,
 * 이후 4주(28일) 간격. 각 회차는 직전 인정일~이번 인정일 전날 분을 지급. 실제 날짜는 고용센터가 지정.
 * 주말·공휴일 인정일은 다음 영업일로 밀되 지급 일수 계산은 원래 주기를 따른다.
 */
export function schedule(applyDate: string, days: number, daily: number): Recognition[] {
  const out: Recognition[] = []
  let paid = 0
  let n = 1
  let nominal = addDays(applyDate, 14)
  while (paid < days) {
    // 첫 회차: 14일 중 대기 7일 제외한 7일분
    const payDays = Math.min(n === 1 ? 14 - WAITING_DAYS : 28, days - paid)
    paid += payDays
    out.push({ n, date: nextBusinessDay(nominal), payDays, amount: payDays * daily, cumulative: paid * daily })
    nominal = addDays(nominal, 28)
    n++
  }
  return out
}
