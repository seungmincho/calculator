// 직장가입자 4대보험 근로자·사업주 부담 (월). 검증: node scripts/check-four-insurance.ts
// 요율은 insuranceRates.ts, 건강보험 월 상·하한은 healthInsurance.ts(2026 고시)를 쓴다. 10원 미만 절사는 다른 계산기와 같다.
import { insuranceFor, type InsuranceYear } from './insuranceRates.ts'
import { HI } from './healthInsurance.ts'

export const COMPANY_SIZES = ['under150', 'priority', 'mid', 'large'] as const
export type CompanySize = typeof COMPANY_SIZES[number]
/** 고용안정·직업능력개발사업 보험료율 (사업주만) — 고용산재보험료징수법 시행령 제12조 제1항 제1호 */
export const STABILITY_RATE: Record<CompanySize, number> = { under150: 0.0025, priority: 0.0045, mid: 0.0065, large: 0.0085 }
/** 2026년 평균 산재보험료율 1.47% (고용노동부 고시, 2025.12.31). 실제 요율은 사업 종류별로 다르다 */
export const ACCIDENT_AVG = 0.0147
export const ITEMS = ['pension', 'health', 'ltc', 'employment', 'stability', 'accident'] as const
export type Item = typeof ITEMS[number]

const cut10 = (n: number) => Math.floor(n / 10 + 1e-9) * 10

/** `base` = 보수월액(월급 − 비과세). `accidentRate` 는 소수(1.47% → 0.0147). */
export function fourInsurance(base: number, year: InsuranceYear, size: CompanySize, accidentRate: number) {
  const R = insuranceFor(year)
  const pay = Math.max(0, Math.floor(base))
  if (!pay) return null
  const pensionBase = Math.min(R.pensionMonthlyCap, Math.max(R.pensionMonthlyFloor, pay))
  const pension = cut10(pensionBase * R.pensionRate)
  const healthRaw = cut10(pay * R.healthRateTotal / 2)
  const health = Math.min(HI.premiumCap / 2, Math.max(HI.premiumFloor / 2, healthRaw))
  const ltc = cut10(health * R.longTermCareRate)
  const employment = cut10(pay * R.employmentRate)
  const rows: Record<Item, { employee: number; employer: number }> = {
    pension: { employee: pension, employer: pension },
    health: { employee: health, employer: health },
    ltc: { employee: ltc, employer: ltc },
    employment: { employee: employment, employer: employment },
    stability: { employee: 0, employer: cut10(pay * STABILITY_RATE[size]) },
    accident: { employee: 0, employer: cut10(pay * Math.max(0, accidentRate)) },
  }
  const employee = ITEMS.reduce((s, k) => s + rows[k].employee, 0)
  const employer = ITEMS.reduce((s, k) => s + rows[k].employer, 0)
  return {
    year, base: pay, rates: R, rows, employee, employer, total: employee + employer,
    pensionClamp: pay > R.pensionMonthlyCap ? 'cap' as const : pay < R.pensionMonthlyFloor ? 'floor' as const : null,
    healthClamp: healthRaw !== health,
    /** 정부안 고용보험료율이 확정될 때 근로자·사업주가 각각 더 내는 월액 */
    proposedExtra: R.employmentProposed ? cut10(pay * R.employmentProposed) - employment : 0,
  }
}
export type FourInsuranceResult = NonNullable<ReturnType<typeof fourInsurance>>
