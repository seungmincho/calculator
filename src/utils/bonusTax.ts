/**
 * 성과급 세후 계산 (2026). 두 기준을 함께 낸다.
 *  - now   : 지급월 원천징수 기준 — 통장에 실제 찍히는 금액
 *  - final : 연말정산·보험료 정산 반영 — 성과급이 실제로 남기는 금액
 *
 * 근거
 *  - 소득세: 상여 원천징수(소득세법 시행령 §194) = 지급대상기간 m개월 × 간이세액표[(월급+성과급/m)] − 이미 뗀 세액.
 *    지급대상기간이 없는 성과급은 1월~지급월. 간이세액표는 "월급×12 연간세액÷12"로 만들어진 표라 calculateNetSalary로 근사.
 *  - 국민연금: 기준소득월액(전년도 소득 기준)을 연중 고정 적용 → 성과급 달에 추가로 떼지 않음.
 *  - 건강·장기요양: 보수월액 연중 고정 → 지급월엔 없음, 다음 해 4월 보수총액 정산 때 성과급 × 요율 부과.
 *  - 고용보험: 대부분 급여명세서가 지급월 실지급액 × 0.9% 공제.
 */
import { INSURANCE } from './insuranceRates'
import { calculateNetSalary } from './netSalary'

export interface BonusTaxInput {
  /** 세전 연봉 (비과세 포함, 성과급 제외) */
  salary: number
  /** 세전 성과급 */
  bonus: number
  nonTaxableMonthly?: number
  dependents?: number
  children?: number
  /** 원천징수 지급대상기간(개월, 1~12). 기본 1 = 이번 달 급여와 합산 */
  period?: number
}

export interface BonusDeductions {
  nationalPension: number
  healthInsurance: number
  longTermCare: number
  employmentInsurance: number
  incomeTax: number
  localIncomeTax: number
  total: number
  net: number
}

const TAX_BRACKETS = [14e6, 50e6, 88e6, 150e6, 300e6, 500e6, 1e9, Infinity]
const TAX_RATES = [0.06, 0.15, 0.24, 0.35, 0.38, 0.4, 0.42, 0.45]
/** 과세표준 → 구간 인덱스(0~7) */
export const bracketIndex = (taxBase: number) => TAX_BRACKETS.findIndex(l => taxBase <= l)
export const bracketRate = (i: number) => TAX_RATES[i]

function sumDeductions(d: Omit<BonusDeductions, 'total' | 'net'>, bonus: number): BonusDeductions {
  const total = d.nationalPension + d.healthInsurance + d.longTermCare + d.employmentInsurance + d.incomeTax + d.localIncomeTax
  return { ...d, total, net: bonus - total }
}

export function calculateBonusTax(input: BonusTaxInput) {
  const { salary, bonus } = input
  const nonTax = Math.max(0, input.nonTaxableMonthly ?? 200_000)
  const opt = { dependents: input.dependents ?? 1, children: input.children ?? 0, nonTaxableMonthly: 0 }
  const period = Math.min(12, Math.max(1, Math.round(input.period ?? 1)))
  const taxableSalary = salary - nonTax * 12 // 총급여(비과세 제외)
  if (!(taxableSalary > 0) || !(bonus > 0)) return null

  // 연간 (성과급 제외 / 포함). 국민연금 공제는 실제 납부액(성과급 미반영) 그대로.
  const base = calculateNetSalary(taxableSalary, opt)!
  const withBonus = calculateNetSalary(taxableSalary + bonus, { ...opt, nationalPensionAnnual: base.deductions.nationalPension })!

  // 간이세액표 근사: 월 과세급여 → 월 소득세 (10원 미만 절사)
  const monthlyTax = (monthly: number) =>
    Math.floor(calculateNetSalary(monthly * 12, opt)!.deductions.incomeTax / 12 / 10) * 10
  const monthlySalary = taxableSalary / 12
  const nowIncomeTax = Math.max(0, period * (monthlyTax(monthlySalary + bonus / period) - monthlyTax(monthlySalary)))

  const employmentInsurance = Math.floor(bonus * INSURANCE.employmentRate)
  const healthInsurance = Math.floor(bonus * INSURANCE.healthRate)
  const longTermCare = Math.floor(healthInsurance * INSURANCE.longTermCareRate)

  const now = sumDeductions({
    nationalPension: 0, healthInsurance: 0, longTermCare: 0, employmentInsurance,
    incomeTax: nowIncomeTax, localIncomeTax: Math.floor(nowIncomeTax * 0.1),
  }, bonus)

  const finalIncomeTax = withBonus.deductions.incomeTax - base.deductions.incomeTax
  const final = sumDeductions({
    nationalPension: 0, healthInsurance, longTermCare, employmentInsurance,
    incomeTax: finalIncomeTax,
    localIncomeTax: withBonus.deductions.localIncomeTax - base.deductions.localIncomeTax,
  }, bonus)

  const baseBracket = bracketIndex(base.taxInfo.taxableIncome)
  const withBracket = bracketIndex(withBonus.taxInfo.taxableIncome)
  const baseTotalTax = base.deductions.incomeTax + base.deductions.localIncomeTax
  const withTotalTax = withBonus.deductions.incomeTax + withBonus.deductions.localIncomeTax

  return {
    bonus,
    period,
    now,
    final,
    /** 연말정산 정산액: +면 추가납부, −면 환급 (소득세+지방세) */
    settlement: final.incomeTax + final.localIncomeTax - (now.incomeTax + now.localIncomeTax),
    /** 다음 해 4월 건강보험 정산으로 부과될 금액 */
    healthLater: healthInsurance + longTermCare,
    /** 성과급 없는 달 월 실수령 (비과세 포함) */
    baseMonthlyNet: Math.floor(base.netAnnual / 12) + nonTax,
    /** 연 실수령 (비과세 포함) */
    baseNetAnnual: base.netAnnual + nonTax * 12,
    withNetAnnual: base.netAnnual + nonTax * 12 + final.net,
    salaryOnly: {
      taxBase: base.taxInfo.taxableIncome, bracket: baseBracket, marginalRate: bracketRate(baseBracket),
      totalTax: baseTotalTax, effectiveRate: (baseTotalTax / salary) * 100,
    },
    withBonusTax: {
      taxBase: withBonus.taxInfo.taxableIncome, bracket: withBracket, marginalRate: bracketRate(withBracket),
      totalTax: withTotalTax, effectiveRate: (withTotalTax / (salary + bonus)) * 100,
    },
  }
}

export type BonusTaxResult = NonNullable<ReturnType<typeof calculateBonusTax>>
