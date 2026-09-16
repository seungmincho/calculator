/**
 * 연봉 → 실수령액 순수 계산 (2026). SalaryCalculator·연봉 실수령액 표(/salary-table)가 공유.
 * 입력 의미는 근로소득 간이세액표와 동일: 공제대상가족 수(본인 포함) + 그중 8~20세 자녀 수.
 */
import { INSURANCE, PENSION_ANNUAL_CAP } from './insuranceRates'

export interface NetSalaryInput {
  /** 월 비과세액 (식대 등). 기본 20만 */
  nonTaxableMonthly?: number
  /** 공제대상가족 수, 본인 포함. 기본 1 */
  dependents?: number
  /** 8세 이상 20세 이하 자녀 수 (dependents에 포함된 인원). 기본 0 */
  children?: number
}

export function calculateNetSalary(grossAnnual: number, opt: NetSalaryInput = {}) {
  const nonTaxableMonthly = opt.nonTaxableMonthly ?? 200_000
  const dependents = Math.max(1, opt.dependents ?? 1)
  const children = Math.max(0, opt.children ?? 0)
  if (!grossAnnual || grossAnnual <= 0) return null

  const nonTaxableAnnual = nonTaxableMonthly * 12
  const taxableAnnual = Math.max(0, grossAnnual - nonTaxableAnnual)

  // 4대보험 (근로자 부담) — 요율·상한은 insuranceRates.ts 단일 관리
  const nationalPension = Math.floor(Math.min(taxableAnnual, PENSION_ANNUAL_CAP) * INSURANCE.pensionRate)
  const healthInsurance = Math.floor(taxableAnnual * INSURANCE.healthRate)
  const longTermCare = Math.floor(healthInsurance * INSURANCE.longTermCareRate)
  const employmentInsurance = Math.floor(taxableAnnual * INSURANCE.employmentRate)

  // 근로소득공제 (총급여 기준, 한도 2천만)
  let workIncomeDeduction: number
  if (grossAnnual <= 5_000_000) workIncomeDeduction = grossAnnual * 0.7
  else if (grossAnnual <= 15_000_000) workIncomeDeduction = 3_500_000 + (grossAnnual - 5_000_000) * 0.4
  else if (grossAnnual <= 45_000_000) workIncomeDeduction = 7_500_000 + (grossAnnual - 15_000_000) * 0.15
  else if (grossAnnual <= 100_000_000) workIncomeDeduction = 12_000_000 + (grossAnnual - 45_000_000) * 0.05
  else workIncomeDeduction = 14_750_000 + (grossAnnual - 100_000_000) * 0.02
  workIncomeDeduction = Math.min(workIncomeDeduction, 20_000_000)

  // 인적공제: 공제대상가족 1인당 150만 (자녀는 가족 수에 이미 포함)
  const personalDeduction = dependents * 1_500_000
  const workIncome = grossAnnual - workIncomeDeduction
  const taxableIncome = Math.max(0, workIncome - nationalPension - personalDeduction)

  // 산출세액 (2026 누진세율)
  let computedTax: number
  if (taxableIncome <= 14_000_000) computedTax = taxableIncome * 0.06
  else if (taxableIncome <= 50_000_000) computedTax = 840_000 + (taxableIncome - 14_000_000) * 0.15
  else if (taxableIncome <= 88_000_000) computedTax = 6_240_000 + (taxableIncome - 50_000_000) * 0.24
  else if (taxableIncome <= 150_000_000) computedTax = 15_360_000 + (taxableIncome - 88_000_000) * 0.35
  else if (taxableIncome <= 300_000_000) computedTax = 37_060_000 + (taxableIncome - 150_000_000) * 0.38
  else if (taxableIncome <= 500_000_000) computedTax = 94_060_000 + (taxableIncome - 300_000_000) * 0.4
  else if (taxableIncome <= 1_000_000_000) computedTax = 174_060_000 + (taxableIncome - 500_000_000) * 0.42
  else computedTax = 384_060_000 + (taxableIncome - 1_000_000_000) * 0.45
  computedTax = Math.floor(computedTax)

  // 근로소득세액공제 (소득세법 §59): 산출세액 130만 이하 55%, 초과분 30% — 총급여별 한도
  let workTaxCredit = computedTax <= 1_300_000 ? computedTax * 0.55 : 715_000 + (computedTax - 1_300_000) * 0.3
  let creditCap: number
  if (grossAnnual <= 33_000_000) creditCap = 740_000
  else if (grossAnnual <= 70_000_000) creditCap = Math.max(660_000, 740_000 - (grossAnnual - 33_000_000) * 0.008)
  else if (grossAnnual <= 120_000_000) creditCap = Math.max(500_000, 660_000 - (grossAnnual - 70_000_000) * 0.5)
  else creditCap = Math.max(200_000, 500_000 - (grossAnnual - 120_000_000) * 0.5)
  workTaxCredit = Math.min(workTaxCredit, creditCap)

  // 자녀세액공제 (2025~): 1명 25만, 2명 55만, 3명째부터 +40만
  const childTaxCredit = children === 0 ? 0 : children === 1 ? 250_000 : 550_000 + (children - 2) * 400_000

  const taxCredit = Math.min(computedTax, Math.floor(workTaxCredit + childTaxCredit))
  const incomeTax = computedTax - taxCredit
  const localIncomeTax = Math.floor(incomeTax * 0.1)

  const totalDeductions = nationalPension + healthInsurance + longTermCare + employmentInsurance + incomeTax + localIncomeTax
  const netAnnual = grossAnnual - totalDeductions
  const netMonthly = Math.floor(netAnnual / 12)

  return {
    gross: grossAnnual,
    taxable: taxableAnnual,
    workIncome,
    workIncomeDeduction,
    netAnnual,
    netMonthly,
    deductions: { healthInsurance, longTermCare, nationalPension, employmentInsurance, incomeTax, localIncomeTax, total: totalDeductions },
    taxInfo: {
      taxableIncome,
      personalDeduction,
      taxCredit,
      effectiveTaxRate: ((incomeTax + localIncomeTax) / grossAnnual) * 100,
    },
  }
}

export type NetSalaryResult = NonNullable<ReturnType<typeof calculateNetSalary>>
