'use client'

/**
 * YearEndTaxCalculator - 연말정산 계산기 (2025년 귀속 / 2026년 신고)
 *
 * Translation namespace: yearEndTaxCalc
 *
 * === Used translation keys ===
 *
 * -- Top-level --
 * t('title')
 * t('description')
 * t('disclaimer')
 * t('calculate')
 * t('reset')
 * t('share')
 * t('copied')
 * t('won')
 * t('percent')
 *
 * -- Tabs --
 * t('tab.basic')
 * t('tab.incomeDeduction')
 * t('tab.taxCredit')
 * t('tab.result')
 *
 * -- Basic info tab --
 * t('grossSalary')
 * t('grossSalaryPlaceholder')
 * t('nonTaxableIncome')
 * t('mealAllowance')
 * t('mealAllowanceDesc')
 * t('drivingAllowance')
 * t('drivingAllowanceDesc')
 * t('childcareAllowance')
 * t('childcareAllowanceDesc')
 * t('dependentCount')
 * t('dependentCountDesc')
 * t('prepaidTax')
 * t('prepaidTaxDesc')
 *
 * -- Income deduction tab --
 * t('nationalPension')
 * t('nationalPensionDesc')
 * t('healthInsurance')
 * t('healthInsuranceDesc')
 * t('employmentInsurance')
 * t('employmentInsuranceDesc')
 * t('housingSubscription')
 * t('housingSubscriptionDesc')
 * t('creditCard')
 * t('creditCardDesc')
 * t('debitCard')
 * t('debitCardDesc')
 * t('cashReceipt')
 * t('cashReceiptDesc')
 * t('traditionalMarket')
 * t('traditionalMarketDesc')
 * t('publicTransport')
 * t('publicTransportDesc')
 * t('cardDeductionInfo')
 *
 * -- Tax credit tab --
 * t('childCount')
 * t('childCountDesc')
 * t('pensionSavings')
 * t('pensionSavingsDesc')
 * t('irp')
 * t('irpDesc')
 * t('insurancePremium')
 * t('insurancePremiumDesc')
 * t('medicalExpense')
 * t('medicalExpenseDesc')
 * t('medicalExpenseSelf')
 * t('medicalExpenseElderly')
 * t('medicalExpenseGeneral')
 * t('educationExpense')
 * t('educationExpenseDesc')
 * t('educationSelf')
 * t('educationChild')
 * t('educationChildLevel')
 * t('educationLevelElementary')
 * t('educationLevelUniversity')
 * t('donation')
 * t('donationDesc')
 * t('monthlyRent')
 * t('monthlyRentDesc')
 * t('marriageTaxCredit')
 * t('marriageTaxCreditDesc')
 *
 * -- Result tab (steps) --
 * t('step1.title')
 * t('step1.grossSalary')
 * t('step1.nonTaxable')
 * t('step1.totalSalary')
 *
 * t('step2.title')
 * t('step2.earnedIncomeDeduction')
 * t('step2.earnedIncome')
 *
 * t('step3.title')
 * t('step3.personalDeduction')
 * t('step3.nationalPension')
 * t('step3.healthEmployment')
 * t('step3.housingSubscription')
 * t('step3.cardDeduction')
 * t('step3.totalDeduction')
 * t('step3.taxBase')
 *
 * t('step4.title')
 * t('step4.taxRate')
 * t('step4.calculatedTax')
 *
 * t('step5.title')
 * t('step5.earnedIncomeCredit')
 * t('step5.childCredit')
 * t('step5.pensionCredit')
 * t('step5.insuranceCredit')
 * t('step5.medicalCredit')
 * t('step5.educationCredit')
 * t('step5.donationCredit')
 * t('step5.rentCredit')
 * t('step5.marriageCredit')
 * t('step5.totalCredit')
 *
 * t('step6.title')
 * t('step6.determinedTax')
 * t('step6.localIncomeTax')
 * t('step6.totalTax')
 * t('step6.prepaidTax')
 * t('step6.refundAmount')
 * t('step6.additionalPayment')
 *
 * t('result.refund')
 * t('result.additionalPayment')
 * t('result.breakeven')
 *
 * t('detailToggle')
 */

import { useState, useCallback, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Calculator, Share2, Check, ChevronRight, RotateCcw, BookOpen, AlertTriangle } from 'lucide-react'
import GuideSection from '@/components/GuideSection'

// ────────────────────────────────────────
// Types
// ────────────────────────────────────────
type TabId = 'basic' | 'incomeDeduction' | 'taxCredit' | 'result'

interface CalcResult {
  // Step 1
  grossSalary: number
  nonTaxable: number
  totalSalary: number
  // Step 2
  earnedIncomeDeduction: number
  earnedIncome: number
  // Step 3
  personalDeduction: number
  nationalPensionDeduction: number
  healthEmploymentDeduction: number
  housingSubscriptionDeduction: number
  cardDeduction: number
  cardDeductionDetail: {
    minSpend: number
    creditUsed: number
    debitUsed: number
    cashUsed: number
    marketUsed: number
    transportUsed: number
    basicLimit: number
    additionalLimit: number
    total: number
  }
  totalIncomeDeduction: number
  taxBase: number
  // Step 4
  taxRate: string
  calculatedTax: number
  // Step 5
  earnedIncomeCredit: number
  childCredit: number
  pensionCredit: number
  insuranceCredit: number
  medicalCredit: number
  educationCredit: number
  donationCredit: number
  rentCredit: number
  marriageCredit: number
  totalTaxCredit: number
  // Step 6
  determinedTax: number
  localIncomeTax: number
  totalTax: number
  prepaidTax: number
  refundAmount: number
}

// ────────────────────────────────────────
// Helpers
// ────────────────────────────────────────
const parseNum = (v: string): number => {
  const n = parseInt(v.replace(/,/g, ''), 10)
  return isNaN(n) ? 0 : n
}

const fmtNum = (n: number): string => n.toLocaleString('ko-KR')

const fmtInput = (v: string): string => {
  const num = v.replace(/[^0-9]/g, '')
  if (!num) return ''
  return parseInt(num, 10).toLocaleString('ko-KR')
}

// ────────────────────────────────────────
// Calculation engine
// ────────────────────────────────────────
function calculateEarnedIncomeDeduction(totalSalary: number): number {
  let d = 0
  if (totalSalary <= 5_000_000) {
    d = totalSalary * 0.7
  } else if (totalSalary <= 15_000_000) {
    d = 3_500_000 + (totalSalary - 5_000_000) * 0.4
  } else if (totalSalary <= 45_000_000) {
    d = 7_500_000 + (totalSalary - 15_000_000) * 0.15
  } else if (totalSalary <= 100_000_000) {
    d = 12_000_000 + (totalSalary - 45_000_000) * 0.05
  } else {
    d = 14_750_000 + (totalSalary - 100_000_000) * 0.02
  }
  return Math.min(Math.floor(d), 20_000_000)
}

function calculateCardDeduction(
  totalSalary: number,
  credit: number,
  debit: number,
  cash: number,
  market: number,
  transport: number
): CalcResult['cardDeductionDetail'] {
  const minSpend = Math.floor(totalSalary * 0.25)
  const totalSpend = credit + debit + cash + market + transport

  let remaining = Math.max(0, totalSpend - minSpend)
  if (remaining <= 0) {
    return { minSpend, creditUsed: 0, debitUsed: 0, cashUsed: 0, marketUsed: 0, transportUsed: 0, basicLimit: 0, additionalLimit: 0, total: 0 }
  }

  // Apply spending in order: credit(15%) → debit(30%) → cash(30%) → market(40%) → transport(80%)
  // First consume minimum spend from credit card first
  let creditRemaining = credit
  let debitRemaining = debit
  let cashRemaining = cash
  let marketRemaining = market
  let transportRemaining = transport

  let toConsume = minSpend
  // Consume minimum spend from each in order
  const consumeFrom = (available: number): number => {
    const consumed = Math.min(available, toConsume)
    toConsume -= consumed
    return available - consumed
  }
  creditRemaining = consumeFrom(creditRemaining)
  debitRemaining = consumeFrom(debitRemaining)
  cashRemaining = consumeFrom(cashRemaining)
  marketRemaining = consumeFrom(marketRemaining)
  transportRemaining = consumeFrom(transportRemaining)

  // Calculate deductions from remaining amounts
  const creditDeduction = Math.floor(creditRemaining * 0.15)
  const debitDeduction = Math.floor(debitRemaining * 0.30)
  const cashDeduction = Math.floor(cashRemaining * 0.30)
  const marketDeduction = Math.floor(marketRemaining * 0.40)
  const transportDeduction = Math.floor(transportRemaining * 0.80)

  const basicDeductionAmount = creditDeduction + debitDeduction + cashDeduction
  const basicLimit = totalSalary <= 70_000_000 ? 3_000_000 : 2_500_000
  const basicApplied = Math.min(basicDeductionAmount, basicLimit)

  const additionalMarket = Math.min(marketDeduction, 1_000_000)
  const additionalTransport = Math.min(transportDeduction, 1_000_000)
  const additionalLimit = additionalMarket + additionalTransport

  return {
    minSpend,
    creditUsed: creditDeduction,
    debitUsed: debitDeduction,
    cashUsed: cashDeduction,
    marketUsed: marketDeduction,
    transportUsed: transportDeduction,
    basicLimit: basicApplied,
    additionalLimit,
    total: basicApplied + additionalLimit,
  }
}

function calculateIncomeTax(taxBase: number): { tax: number; rate: string } {
  if (taxBase <= 0) return { tax: 0, rate: '0%' }
  if (taxBase <= 14_000_000) return { tax: Math.floor(taxBase * 0.06), rate: '6%' }
  if (taxBase <= 50_000_000) return { tax: Math.floor(taxBase * 0.15 - 1_260_000), rate: '15%' }
  if (taxBase <= 88_000_000) return { tax: Math.floor(taxBase * 0.24 - 5_760_000), rate: '24%' }
  if (taxBase <= 150_000_000) return { tax: Math.floor(taxBase * 0.35 - 15_440_000), rate: '35%' }
  if (taxBase <= 300_000_000) return { tax: Math.floor(taxBase * 0.38 - 19_940_000), rate: '38%' }
  if (taxBase <= 500_000_000) return { tax: Math.floor(taxBase * 0.40 - 25_940_000), rate: '40%' }
  if (taxBase <= 1_000_000_000) return { tax: Math.floor(taxBase * 0.42 - 35_940_000), rate: '42%' }
  return { tax: Math.floor(taxBase * 0.45 - 65_940_000), rate: '45%' }
}

function calculateEarnedIncomeCredit(calculatedTax: number, totalSalary: number): number {
  let credit = 0
  if (calculatedTax <= 1_300_000) {
    credit = Math.floor(calculatedTax * 0.55)
  } else {
    credit = 715_000 + Math.floor((calculatedTax - 1_300_000) * 0.30)
  }

  let limit = 0
  if (totalSalary <= 33_000_000) {
    limit = 740_000
  } else if (totalSalary <= 70_000_000) {
    limit = Math.max(Math.min(740_000 - Math.floor((totalSalary - 33_000_000) * 0.008), 740_000), 660_000)
  } else if (totalSalary <= 120_000_000) {
    limit = Math.max(Math.min(660_000 - Math.floor((totalSalary - 70_000_000) * 0.5 / 100), 660_000), 500_000)
  } else {
    limit = Math.max(Math.min(500_000 - Math.floor((totalSalary - 120_000_000) * 0.5 / 100), 500_000), 200_000)
  }

  return Math.min(credit, limit)
}

function runCalculation(inputs: {
  grossSalary: number
  mealAllowance: number
  drivingAllowance: number
  childcareAllowance: number
  dependentCount: number
  prepaidTax: number
  nationalPension: number
  healthInsurance: number
  employmentInsurance: number
  housingSubscription: number
  creditCard: number
  debitCard: number
  cashReceipt: number
  traditionalMarket: number
  publicTransport: number
  childCount: number
  pensionSavings: number
  irp: number
  insurancePremium: number
  medicalExpenseSelf: number
  medicalExpenseElderly: number
  medicalExpenseGeneral: number
  educationSelf: number
  educationChild: number
  educationChildLevel: 'elementary' | 'university'
  donation: number
  monthlyRent: number
  marriageTaxCredit: boolean
}): CalcResult {
  // Step 1: Total salary
  const nonTaxable = inputs.mealAllowance + inputs.drivingAllowance + inputs.childcareAllowance
  const totalSalary = Math.max(0, inputs.grossSalary - nonTaxable)

  // Step 2: Earned income deduction
  const earnedIncomeDeduction = calculateEarnedIncomeDeduction(totalSalary)
  const earnedIncome = Math.max(0, totalSalary - earnedIncomeDeduction)

  // Step 3: Tax base
  const personalDeduction = inputs.dependentCount * 1_500_000
  const nationalPensionDeduction = inputs.nationalPension
  const healthEmploymentDeduction = inputs.healthInsurance + inputs.employmentInsurance
  const housingSubscriptionDeduction = Math.min(Math.floor(inputs.housingSubscription * 0.4), 1_200_000)
  const cardDetail = calculateCardDeduction(
    totalSalary,
    inputs.creditCard,
    inputs.debitCard,
    inputs.cashReceipt,
    inputs.traditionalMarket,
    inputs.publicTransport
  )
  const cardDeduction = cardDetail.total

  const totalIncomeDeduction = personalDeduction + nationalPensionDeduction + healthEmploymentDeduction + housingSubscriptionDeduction + cardDeduction
  const taxBase = Math.max(0, earnedIncome - totalIncomeDeduction)

  // Step 4: Calculated tax
  const { tax: calculatedTax, rate: taxRate } = calculateIncomeTax(taxBase)

  // Step 5: Tax credits
  const earnedIncomeCredit = calculateEarnedIncomeCredit(calculatedTax, totalSalary)

  let childCredit = 0
  if (inputs.childCount === 1) childCredit = 250_000
  else if (inputs.childCount === 2) childCredit = 550_000
  else if (inputs.childCount >= 3) childCredit = 550_000 + (inputs.childCount - 2) * 400_000

  // Pension savings + IRP: combined limit 900만
  const pensionIrpTotal = Math.min(inputs.pensionSavings + inputs.irp, 9_000_000)
  const pensionRate = totalSalary <= 55_000_000 ? 0.165 : 0.132
  const pensionCredit = Math.floor(pensionIrpTotal * pensionRate)

  // Insurance premium: 12%, limit 100만
  const insuranceCredit = Math.floor(Math.min(inputs.insurancePremium, 1_000_000) * 0.12)

  // Medical expenses: excess over 3% of totalSalary × 15%
  const medicalThreshold = Math.floor(totalSalary * 0.03)
  const totalMedical = inputs.medicalExpenseSelf + inputs.medicalExpenseElderly + inputs.medicalExpenseGeneral
  const medicalExcess = Math.max(0, totalMedical - medicalThreshold)
  // Self + elderly: unlimited, general: 700만 limit
  const generalMedicalDeductible = Math.min(inputs.medicalExpenseGeneral, 7_000_000)
  const selfElderlyMedical = inputs.medicalExpenseSelf + inputs.medicalExpenseElderly
  const medicalDeductibleTotal = selfElderlyMedical + generalMedicalDeductible
  const medicalDeductibleExcess = Math.max(0, Math.min(medicalExcess, medicalDeductibleTotal - medicalThreshold + Math.max(0, totalMedical - medicalDeductibleTotal)))
  // Simpler approach: total medical - threshold, then cap general portion
  const medicalCreditBase = Math.max(0, totalMedical - medicalThreshold)
  // But general is capped at 700만 within that
  const generalOverLimit = Math.max(0, inputs.medicalExpenseGeneral - 7_000_000)
  const adjustedMedicalBase = Math.max(0, medicalCreditBase - generalOverLimit)
  const medicalCredit = Math.floor(adjustedMedicalBase * 0.15)

  // Education: 15%, self unlimited, child elementary/middle/high 300만, university 900만
  const educationSelfCredit = Math.floor(inputs.educationSelf * 0.15)
  const childLimit = inputs.educationChildLevel === 'university' ? 9_000_000 : 3_000_000
  const educationChildCredit = Math.floor(Math.min(inputs.educationChild, childLimit) * 0.15)
  const educationCredit = educationSelfCredit + educationChildCredit

  // Donation: 1000만 이하 15%, 초과 30%
  let donationCredit = 0
  if (inputs.donation <= 10_000_000) {
    donationCredit = Math.floor(inputs.donation * 0.15)
  } else {
    donationCredit = 1_500_000 + Math.floor((inputs.donation - 10_000_000) * 0.30)
  }

  // Monthly rent: limit 1000만
  const rentBase = Math.min(inputs.monthlyRent, 10_000_000)
  let rentRate = 0
  if (totalSalary <= 55_000_000) rentRate = 0.17
  else if (totalSalary <= 80_000_000) rentRate = 0.15
  const rentCredit = Math.floor(rentBase * rentRate)

  // Marriage tax credit
  const marriageCredit = inputs.marriageTaxCredit ? 500_000 : 0

  const totalTaxCredit = earnedIncomeCredit + childCredit + pensionCredit + insuranceCredit +
    medicalCredit + educationCredit + donationCredit + rentCredit + marriageCredit

  // Step 6: Determined tax
  const determinedTax = Math.max(0, calculatedTax - totalTaxCredit)
  const localIncomeTax = Math.floor(determinedTax * 0.1)
  const totalTax = determinedTax + localIncomeTax
  const refundAmount = inputs.prepaidTax - totalTax

  return {
    grossSalary: inputs.grossSalary,
    nonTaxable,
    totalSalary,
    earnedIncomeDeduction,
    earnedIncome,
    personalDeduction,
    nationalPensionDeduction,
    healthEmploymentDeduction,
    housingSubscriptionDeduction,
    cardDeduction,
    cardDeductionDetail: cardDetail,
    totalIncomeDeduction,
    taxBase,
    taxRate,
    calculatedTax,
    earnedIncomeCredit,
    childCredit,
    pensionCredit,
    insuranceCredit,
    medicalCredit,
    educationCredit,
    donationCredit,
    rentCredit,
    marriageCredit,
    totalTaxCredit,
    determinedTax,
    localIncomeTax,
    totalTax,
    prepaidTax: inputs.prepaidTax,
    refundAmount,
  }
}

// ────────────────────────────────────────
// Inner component (needs Suspense for useSearchParams)
// ────────────────────────────────────────
function YearEndTaxCalculatorContent() {
  const t = useTranslations('yearEndTaxCalc')
  const searchParams = useSearchParams()

  // Tab
  const [activeTab, setActiveTab] = useState<TabId>('basic')

  // Basic info
  const [grossSalary, setGrossSalary] = useState('')
  const [mealAllowance, setMealAllowance] = useState('')
  const [drivingAllowance, setDrivingAllowance] = useState('')
  const [childcareAllowance, setChildcareAllowance] = useState('')
  const [dependentCount, setDependentCount] = useState('1')
  const [prepaidTax, setPrepaidTax] = useState('')

  // Income deduction
  const [nationalPension, setNationalPension] = useState('')
  const [healthInsurance, setHealthInsurance] = useState('')
  const [employmentInsurance, setEmploymentInsurance] = useState('')
  const [housingSubscription, setHousingSubscription] = useState('')
  const [creditCard, setCreditCard] = useState('')
  const [debitCard, setDebitCard] = useState('')
  const [cashReceipt, setCashReceipt] = useState('')
  const [traditionalMarket, setTraditionalMarket] = useState('')
  const [publicTransport, setPublicTransport] = useState('')

  // Tax credit
  const [childCount, setChildCount] = useState('0')
  const [pensionSavings, setPensionSavings] = useState('')
  const [irp, setIrp] = useState('')
  const [insurancePremium, setInsurancePremium] = useState('')
  const [medicalExpenseSelf, setMedicalExpenseSelf] = useState('')
  const [medicalExpenseElderly, setMedicalExpenseElderly] = useState('')
  const [medicalExpenseGeneral, setMedicalExpenseGeneral] = useState('')
  const [educationSelf, setEducationSelf] = useState('')
  const [educationChild, setEducationChild] = useState('')
  const [educationChildLevel, setEducationChildLevel] = useState<'elementary' | 'university'>('elementary')
  const [donation, setDonation] = useState('')
  const [monthlyRent, setMonthlyRent] = useState('')
  const [marriageTaxCredit, setMarriageTaxCredit] = useState(false)

  // Result
  const [result, setResult] = useState<CalcResult | null>(null)
  const [isCopied, setIsCopied] = useState(false)

  // Load from URL on mount
  useEffect(() => {
    const gs = searchParams.get('gs')
    if (gs) setGrossSalary(fmtInput(gs))
    const ma = searchParams.get('ma')
    if (ma) setMealAllowance(fmtInput(ma))
    const da = searchParams.get('da')
    if (da) setDrivingAllowance(fmtInput(da))
    const ca = searchParams.get('ca')
    if (ca) setChildcareAllowance(fmtInput(ca))
    const dc = searchParams.get('dc')
    if (dc) setDependentCount(dc)
    const pt = searchParams.get('pt')
    if (pt) setPrepaidTax(fmtInput(pt))

    const np = searchParams.get('np')
    if (np) setNationalPension(fmtInput(np))
    const hi = searchParams.get('hi')
    if (hi) setHealthInsurance(fmtInput(hi))
    const ei = searchParams.get('ei')
    if (ei) setEmploymentInsurance(fmtInput(ei))
    const hs = searchParams.get('hs')
    if (hs) setHousingSubscription(fmtInput(hs))
    const cc = searchParams.get('cc')
    if (cc) setCreditCard(fmtInput(cc))
    const dc2 = searchParams.get('dc2')
    if (dc2) setDebitCard(fmtInput(dc2))
    const cr = searchParams.get('cr')
    if (cr) setCashReceipt(fmtInput(cr))
    const tm = searchParams.get('tm')
    if (tm) setTraditionalMarket(fmtInput(tm))
    const pub = searchParams.get('pub')
    if (pub) setPublicTransport(fmtInput(pub))

    const ch = searchParams.get('ch')
    if (ch) setChildCount(ch)
    const ps = searchParams.get('ps')
    if (ps) setPensionSavings(fmtInput(ps))
    const irpParam = searchParams.get('irp')
    if (irpParam) setIrp(fmtInput(irpParam))
    const ip = searchParams.get('ip')
    if (ip) setInsurancePremium(fmtInput(ip))
    const ms = searchParams.get('ms')
    if (ms) setMedicalExpenseSelf(fmtInput(ms))
    const me = searchParams.get('me')
    if (me) setMedicalExpenseElderly(fmtInput(me))
    const mg = searchParams.get('mg')
    if (mg) setMedicalExpenseGeneral(fmtInput(mg))
    const es = searchParams.get('es')
    if (es) setEducationSelf(fmtInput(es))
    const ec = searchParams.get('ec')
    if (ec) setEducationChild(fmtInput(ec))
    const ecl = searchParams.get('ecl')
    if (ecl === 'university') setEducationChildLevel('university')
    const dn = searchParams.get('dn')
    if (dn) setDonation(fmtInput(dn))
    const mr = searchParams.get('mr')
    if (mr) setMonthlyRent(fmtInput(mr))
    const mc = searchParams.get('mc')
    if (mc === '1') setMarriageTaxCredit(true)

    // Auto-calculate if gross salary present
    if (gs) {
      setTimeout(() => {
        // Will be triggered by the effect or the user pressing calculate
      }, 100)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Update URL
  const updateURL = useCallback(() => {
    const url = new URL(window.location.href)
    const params: Record<string, string> = {
      gs: String(parseNum(grossSalary)),
      ma: String(parseNum(mealAllowance)),
      da: String(parseNum(drivingAllowance)),
      ca: String(parseNum(childcareAllowance)),
      dc: dependentCount,
      pt: String(parseNum(prepaidTax)),
      np: String(parseNum(nationalPension)),
      hi: String(parseNum(healthInsurance)),
      ei: String(parseNum(employmentInsurance)),
      hs: String(parseNum(housingSubscription)),
      cc: String(parseNum(creditCard)),
      dc2: String(parseNum(debitCard)),
      cr: String(parseNum(cashReceipt)),
      tm: String(parseNum(traditionalMarket)),
      pub: String(parseNum(publicTransport)),
      ch: childCount,
      ps: String(parseNum(pensionSavings)),
      irp: String(parseNum(irp)),
      ip: String(parseNum(insurancePremium)),
      ms: String(parseNum(medicalExpenseSelf)),
      me: String(parseNum(medicalExpenseElderly)),
      mg: String(parseNum(medicalExpenseGeneral)),
      es: String(parseNum(educationSelf)),
      ec: String(parseNum(educationChild)),
      ecl: educationChildLevel,
      dn: String(parseNum(donation)),
      mr: String(parseNum(monthlyRent)),
      mc: marriageTaxCredit ? '1' : '0',
    }
    Object.entries(params).forEach(([k, v]) => {
      if (v && v !== '0') url.searchParams.set(k, v)
      else url.searchParams.delete(k)
    })
    window.history.replaceState({}, '', url)
  }, [grossSalary, mealAllowance, drivingAllowance, childcareAllowance, dependentCount, prepaidTax,
    nationalPension, healthInsurance, employmentInsurance, housingSubscription,
    creditCard, debitCard, cashReceipt, traditionalMarket, publicTransport,
    childCount, pensionSavings, irp, insurancePremium,
    medicalExpenseSelf, medicalExpenseElderly, medicalExpenseGeneral,
    educationSelf, educationChild, educationChildLevel, donation, monthlyRent, marriageTaxCredit])

  const handleCalculate = useCallback(() => {
    const gs = parseNum(grossSalary)
    if (gs <= 0) return

    const res = runCalculation({
      grossSalary: gs,
      mealAllowance: parseNum(mealAllowance),
      drivingAllowance: parseNum(drivingAllowance),
      childcareAllowance: parseNum(childcareAllowance),
      dependentCount: parseInt(dependentCount) || 1,
      prepaidTax: parseNum(prepaidTax),
      nationalPension: parseNum(nationalPension),
      healthInsurance: parseNum(healthInsurance),
      employmentInsurance: parseNum(employmentInsurance),
      housingSubscription: parseNum(housingSubscription),
      creditCard: parseNum(creditCard),
      debitCard: parseNum(debitCard),
      cashReceipt: parseNum(cashReceipt),
      traditionalMarket: parseNum(traditionalMarket),
      publicTransport: parseNum(publicTransport),
      childCount: parseInt(childCount) || 0,
      pensionSavings: parseNum(pensionSavings),
      irp: parseNum(irp),
      insurancePremium: parseNum(insurancePremium),
      medicalExpenseSelf: parseNum(medicalExpenseSelf),
      medicalExpenseElderly: parseNum(medicalExpenseElderly),
      medicalExpenseGeneral: parseNum(medicalExpenseGeneral),
      educationSelf: parseNum(educationSelf),
      educationChild: parseNum(educationChild),
      educationChildLevel,
      donation: parseNum(donation),
      monthlyRent: parseNum(monthlyRent),
      marriageTaxCredit,
    })

    setResult(res)
    setActiveTab('result')
    updateURL()
  }, [grossSalary, mealAllowance, drivingAllowance, childcareAllowance, dependentCount, prepaidTax,
    nationalPension, healthInsurance, employmentInsurance, housingSubscription,
    creditCard, debitCard, cashReceipt, traditionalMarket, publicTransport,
    childCount, pensionSavings, irp, insurancePremium,
    medicalExpenseSelf, medicalExpenseElderly, medicalExpenseGeneral,
    educationSelf, educationChild, educationChildLevel, donation, monthlyRent, marriageTaxCredit, updateURL])

  const handleReset = useCallback(() => {
    setGrossSalary('')
    setMealAllowance('')
    setDrivingAllowance('')
    setChildcareAllowance('')
    setDependentCount('1')
    setPrepaidTax('')
    setNationalPension('')
    setHealthInsurance('')
    setEmploymentInsurance('')
    setHousingSubscription('')
    setCreditCard('')
    setDebitCard('')
    setCashReceipt('')
    setTraditionalMarket('')
    setPublicTransport('')
    setChildCount('0')
    setPensionSavings('')
    setIrp('')
    setInsurancePremium('')
    setMedicalExpenseSelf('')
    setMedicalExpenseElderly('')
    setMedicalExpenseGeneral('')
    setEducationSelf('')
    setEducationChild('')
    setEducationChildLevel('elementary')
    setDonation('')
    setMonthlyRent('')
    setMarriageTaxCredit(false)
    setResult(null)
    setActiveTab('basic')
    const url = new URL(window.location.href)
    url.search = ''
    window.history.replaceState({}, '', url)
  }, [])

  const handleShare = useCallback(async () => {
    updateURL()
    try {
      await navigator.clipboard.writeText(window.location.href)
      setIsCopied(true)
      setTimeout(() => setIsCopied(false), 2000)
    } catch {
      setIsCopied(true)
      setTimeout(() => setIsCopied(false), 2000)
    }
  }, [updateURL])

  // ── Reusable input component ──
  const MoneyInput = ({ label, desc, value, onChange, placeholder }: {
    label: string; desc?: string; value: string; onChange: (v: string) => void; placeholder?: string
  }) => (
    <div>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
        {label}
      </label>
      {desc && <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{desc}</p>}
      <div className="relative">
        <input
          type="text"
          inputMode="numeric"
          value={value}
          onChange={(e) => onChange(fmtInput(e.target.value))}
          placeholder={placeholder || '0'}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 pr-8"
        />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">{t('won')}</span>
      </div>
    </div>
  )

  // ── Tabs ──
  const tabs: { id: TabId; label: string }[] = [
    { id: 'basic', label: t('tab.basic') },
    { id: 'incomeDeduction', label: t('tab.incomeDeduction') },
    { id: 'taxCredit', label: t('tab.taxCredit') },
    { id: 'result', label: t('tab.result') },
  ]

  // ── Step row for result ──
  const StepRow = ({ label, value, bold, highlight }: {
    label: string; value: number; bold?: boolean; highlight?: 'blue' | 'red' | 'green'
  }) => {
    const colorClass = highlight === 'blue' ? 'text-blue-600 dark:text-blue-400'
      : highlight === 'red' ? 'text-red-600 dark:text-red-400'
      : highlight === 'green' ? 'text-green-600 dark:text-green-400'
      : 'text-gray-900 dark:text-white'
    return (
      <div className={`flex justify-between items-center py-2 ${bold ? 'font-bold border-t border-gray-200 dark:border-gray-600 pt-3 mt-1' : ''}`}>
        <span className="text-sm text-gray-600 dark:text-gray-400">{label}</span>
        <span className={`text-sm ${bold ? 'text-base' : ''} ${colorClass}`}>
          {value < 0 ? '-' : ''}{fmtNum(Math.abs(value))}{t('won')}
        </span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <Calculator className="w-7 h-7 text-blue-600" />
          {t('title')}
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('description')}</p>
      </div>

      {/* Disclaimer */}
      <div className="bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-xl p-4 flex gap-3">
        <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
        <p className="text-sm text-amber-800 dark:text-amber-200">{t('disclaimer')}</p>
      </div>

      {/* Tab navigation */}
      <div className="overflow-x-auto -mx-4 px-4">
        <div className="flex gap-1 min-w-max bg-gray-100 dark:bg-gray-800 rounded-xl p-1">
          {tabs.map((tab, idx) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
              }`}
            >
              <span className="text-xs text-gray-400">{idx + 1}</span>
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">

        {/* ── Basic info tab ── */}
        {activeTab === 'basic' && (
          <div className="space-y-5">
            <MoneyInput
              label={t('grossSalary')}
              value={grossSalary}
              onChange={setGrossSalary}
              placeholder={t('grossSalaryPlaceholder')}
            />

            <div>
              <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-3">{t('nonTaxableIncome')}</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <MoneyInput label={t('mealAllowance')} desc={t('mealAllowanceDesc')} value={mealAllowance} onChange={setMealAllowance} />
                <MoneyInput label={t('drivingAllowance')} desc={t('drivingAllowanceDesc')} value={drivingAllowance} onChange={setDrivingAllowance} />
                <MoneyInput label={t('childcareAllowance')} desc={t('childcareAllowanceDesc')} value={childcareAllowance} onChange={setChildcareAllowance} />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('dependentCount')}
                </label>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{t('dependentCountDesc')}</p>
                <input
                  type="number"
                  min="1"
                  max="20"
                  value={dependentCount}
                  onChange={(e) => setDependentCount(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <MoneyInput label={t('prepaidTax')} desc={t('prepaidTaxDesc')} value={prepaidTax} onChange={setPrepaidTax} />
            </div>
          </div>
        )}

        {/* ── Income deduction tab ── */}
        {activeTab === 'incomeDeduction' && (
          <div className="space-y-5">
            <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200">{t('tab.incomeDeduction')}</h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <MoneyInput label={t('nationalPension')} desc={t('nationalPensionDesc')} value={nationalPension} onChange={setNationalPension} />
              <MoneyInput label={t('healthInsurance')} desc={t('healthInsuranceDesc')} value={healthInsurance} onChange={setHealthInsurance} />
              <MoneyInput label={t('employmentInsurance')} desc={t('employmentInsuranceDesc')} value={employmentInsurance} onChange={setEmploymentInsurance} />
            </div>

            <MoneyInput label={t('housingSubscription')} desc={t('housingSubscriptionDesc')} value={housingSubscription} onChange={setHousingSubscription} />

            <div>
              <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-1">{t('creditCard')}</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">{t('cardDeductionInfo')}</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <MoneyInput label={t('creditCard')} desc={t('creditCardDesc')} value={creditCard} onChange={setCreditCard} />
                <MoneyInput label={t('debitCard')} desc={t('debitCardDesc')} value={debitCard} onChange={setDebitCard} />
                <MoneyInput label={t('cashReceipt')} desc={t('cashReceiptDesc')} value={cashReceipt} onChange={setCashReceipt} />
                <MoneyInput label={t('traditionalMarket')} desc={t('traditionalMarketDesc')} value={traditionalMarket} onChange={setTraditionalMarket} />
                <MoneyInput label={t('publicTransport')} desc={t('publicTransportDesc')} value={publicTransport} onChange={setPublicTransport} />
              </div>
            </div>
          </div>
        )}

        {/* ── Tax credit tab ── */}
        {activeTab === 'taxCredit' && (
          <div className="space-y-5">
            <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200">{t('tab.taxCredit')}</h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('childCount')}
                </label>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{t('childCountDesc')}</p>
                <input
                  type="number"
                  min="0"
                  max="10"
                  value={childCount}
                  onChange={(e) => setChildCount(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">{t('pensionSavings')}</h4>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">{t('pensionSavingsDesc')}</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <MoneyInput label={t('pensionSavings')} value={pensionSavings} onChange={setPensionSavings} />
                <MoneyInput label={t('irp')} desc={t('irpDesc')} value={irp} onChange={setIrp} />
              </div>
            </div>

            <MoneyInput label={t('insurancePremium')} desc={t('insurancePremiumDesc')} value={insurancePremium} onChange={setInsurancePremium} />

            <div>
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">{t('medicalExpense')}</h4>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">{t('medicalExpenseDesc')}</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <MoneyInput label={t('medicalExpenseSelf')} value={medicalExpenseSelf} onChange={setMedicalExpenseSelf} />
                <MoneyInput label={t('medicalExpenseElderly')} value={medicalExpenseElderly} onChange={setMedicalExpenseElderly} />
                <MoneyInput label={t('medicalExpenseGeneral')} value={medicalExpenseGeneral} onChange={setMedicalExpenseGeneral} />
              </div>
            </div>

            <div>
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">{t('educationExpense')}</h4>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">{t('educationExpenseDesc')}</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <MoneyInput label={t('educationSelf')} value={educationSelf} onChange={setEducationSelf} />
                <div>
                  <MoneyInput label={t('educationChild')} value={educationChild} onChange={setEducationChild} />
                  <div className="mt-2">
                    <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">{t('educationChildLevel')}</label>
                    <select
                      value={educationChildLevel}
                      onChange={(e) => setEducationChildLevel(e.target.value as 'elementary' | 'university')}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="elementary">{t('educationLevelElementary')}</option>
                      <option value="university">{t('educationLevelUniversity')}</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            <MoneyInput label={t('donation')} desc={t('donationDesc')} value={donation} onChange={setDonation} />
            <MoneyInput label={t('monthlyRent')} desc={t('monthlyRentDesc')} value={monthlyRent} onChange={setMonthlyRent} />

            <div className="flex items-center gap-3 pt-2">
              <input
                type="checkbox"
                id="marriageTaxCredit"
                checked={marriageTaxCredit}
                onChange={(e) => setMarriageTaxCredit(e.target.checked)}
                className="w-4 h-4 accent-blue-600 rounded"
              />
              <div>
                <label htmlFor="marriageTaxCredit" className="text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer">
                  {t('marriageTaxCredit')}
                </label>
                <p className="text-xs text-gray-500 dark:text-gray-400">{t('marriageTaxCreditDesc')}</p>
              </div>
            </div>
          </div>
        )}

        {/* ── Result tab ── */}
        {activeTab === 'result' && result && (
          <div className="space-y-6">
            {/* Final result highlight */}
            <div className={`rounded-xl p-6 text-center ${
              result.refundAmount > 0
                ? 'bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800'
                : result.refundAmount < 0
                  ? 'bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800'
                  : 'bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600'
            }`}>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                {result.refundAmount > 0 ? t('result.refund') : result.refundAmount < 0 ? t('result.additionalPayment') : t('result.breakeven')}
              </p>
              <p className={`text-3xl font-bold ${
                result.refundAmount > 0
                  ? 'text-blue-600 dark:text-blue-400'
                  : result.refundAmount < 0
                    ? 'text-red-600 dark:text-red-400'
                    : 'text-gray-900 dark:text-white'
              }`}>
                {result.refundAmount < 0 ? '-' : '+'}{fmtNum(Math.abs(result.refundAmount))}{t('won')}
              </p>
            </div>

            {/* Step 1 */}
            <details open className="group/s1">
              <summary className="cursor-pointer text-sm font-semibold text-gray-800 dark:text-gray-200 flex items-center gap-2 py-2">
                <ChevronRight className="w-4 h-4 transition-transform group-open/s1:rotate-90" />
                {t('step1.title')}
              </summary>
              <div className="ml-6 mt-2 space-y-0">
                <StepRow label={t('step1.grossSalary')} value={result.grossSalary} />
                <StepRow label={`- ${t('step1.nonTaxable')}`} value={result.nonTaxable} />
                <StepRow label={t('step1.totalSalary')} value={result.totalSalary} bold highlight="blue" />
              </div>
            </details>

            {/* Step 2 */}
            <details open className="group/s2">
              <summary className="cursor-pointer text-sm font-semibold text-gray-800 dark:text-gray-200 flex items-center gap-2 py-2">
                <ChevronRight className="w-4 h-4 transition-transform group-open/s2:rotate-90" />
                {t('step2.title')}
              </summary>
              <div className="ml-6 mt-2 space-y-0">
                <StepRow label={`- ${t('step2.earnedIncomeDeduction')}`} value={result.earnedIncomeDeduction} />
                <StepRow label={t('step2.earnedIncome')} value={result.earnedIncome} bold highlight="blue" />
              </div>
            </details>

            {/* Step 3 */}
            <details open className="group/s3">
              <summary className="cursor-pointer text-sm font-semibold text-gray-800 dark:text-gray-200 flex items-center gap-2 py-2">
                <ChevronRight className="w-4 h-4 transition-transform group-open/s3:rotate-90" />
                {t('step3.title')}
              </summary>
              <div className="ml-6 mt-2 space-y-0">
                <StepRow label={`- ${t('step3.personalDeduction')}`} value={result.personalDeduction} />
                <StepRow label={`- ${t('step3.nationalPension')}`} value={result.nationalPensionDeduction} />
                <StepRow label={`- ${t('step3.healthEmployment')}`} value={result.healthEmploymentDeduction} />
                <StepRow label={`- ${t('step3.housingSubscription')}`} value={result.housingSubscriptionDeduction} />
                <StepRow label={`- ${t('step3.cardDeduction')}`} value={result.cardDeduction} />

                {result.cardDeduction > 0 && (
                  <details className="ml-4 mt-1 mb-2">
                    <summary className="cursor-pointer text-xs text-blue-600 dark:text-blue-400">{t('detailToggle')}</summary>
                    <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3 mt-1 space-y-1 text-xs">
                      <div className="flex justify-between">
                        <span className="text-gray-500 dark:text-gray-400">{t('creditCard')} (15%)</span>
                        <span className="text-gray-700 dark:text-gray-300">{fmtNum(result.cardDeductionDetail.creditUsed)}{t('won')}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500 dark:text-gray-400">{t('debitCard')} (30%)</span>
                        <span className="text-gray-700 dark:text-gray-300">{fmtNum(result.cardDeductionDetail.debitUsed)}{t('won')}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500 dark:text-gray-400">{t('cashReceipt')} (30%)</span>
                        <span className="text-gray-700 dark:text-gray-300">{fmtNum(result.cardDeductionDetail.cashUsed)}{t('won')}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500 dark:text-gray-400">{t('traditionalMarket')} (40%)</span>
                        <span className="text-gray-700 dark:text-gray-300">{fmtNum(result.cardDeductionDetail.marketUsed)}{t('won')}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500 dark:text-gray-400">{t('publicTransport')} (80%)</span>
                        <span className="text-gray-700 dark:text-gray-300">{fmtNum(result.cardDeductionDetail.transportUsed)}{t('won')}</span>
                      </div>
                    </div>
                  </details>
                )}

                <StepRow label={t('step3.totalDeduction')} value={result.totalIncomeDeduction} />
                <StepRow label={t('step3.taxBase')} value={result.taxBase} bold highlight="blue" />
              </div>
            </details>

            {/* Step 4 */}
            <details open className="group/s4">
              <summary className="cursor-pointer text-sm font-semibold text-gray-800 dark:text-gray-200 flex items-center gap-2 py-2">
                <ChevronRight className="w-4 h-4 transition-transform group-open/s4:rotate-90" />
                {t('step4.title')}
              </summary>
              <div className="ml-6 mt-2 space-y-0">
                <div className="flex justify-between items-center py-2">
                  <span className="text-sm text-gray-600 dark:text-gray-400">{t('step4.taxRate')}</span>
                  <span className="text-sm text-gray-900 dark:text-white">{result.taxRate}</span>
                </div>
                <StepRow label={t('step4.calculatedTax')} value={result.calculatedTax} bold highlight="blue" />
              </div>
            </details>

            {/* Step 5 */}
            <details open className="group/s5">
              <summary className="cursor-pointer text-sm font-semibold text-gray-800 dark:text-gray-200 flex items-center gap-2 py-2">
                <ChevronRight className="w-4 h-4 transition-transform group-open/s5:rotate-90" />
                {t('step5.title')}
              </summary>
              <div className="ml-6 mt-2 space-y-0">
                <StepRow label={t('step5.earnedIncomeCredit')} value={result.earnedIncomeCredit} />
                {result.childCredit > 0 && <StepRow label={t('step5.childCredit')} value={result.childCredit} />}
                {result.pensionCredit > 0 && <StepRow label={t('step5.pensionCredit')} value={result.pensionCredit} />}
                {result.insuranceCredit > 0 && <StepRow label={t('step5.insuranceCredit')} value={result.insuranceCredit} />}
                {result.medicalCredit > 0 && <StepRow label={t('step5.medicalCredit')} value={result.medicalCredit} />}
                {result.educationCredit > 0 && <StepRow label={t('step5.educationCredit')} value={result.educationCredit} />}
                {result.donationCredit > 0 && <StepRow label={t('step5.donationCredit')} value={result.donationCredit} />}
                {result.rentCredit > 0 && <StepRow label={t('step5.rentCredit')} value={result.rentCredit} />}
                {result.marriageCredit > 0 && <StepRow label={t('step5.marriageCredit')} value={result.marriageCredit} />}
                <StepRow label={t('step5.totalCredit')} value={result.totalTaxCredit} bold highlight="green" />
              </div>
            </details>

            {/* Step 6 */}
            <details open className="group/s6">
              <summary className="cursor-pointer text-sm font-semibold text-gray-800 dark:text-gray-200 flex items-center gap-2 py-2">
                <ChevronRight className="w-4 h-4 transition-transform group-open/s6:rotate-90" />
                {t('step6.title')}
              </summary>
              <div className="ml-6 mt-2 space-y-0">
                <StepRow label={t('step6.determinedTax')} value={result.determinedTax} />
                <StepRow label={t('step6.localIncomeTax')} value={result.localIncomeTax} />
                <StepRow label={t('step6.totalTax')} value={result.totalTax} bold />
                <StepRow label={t('step6.prepaidTax')} value={result.prepaidTax} />
                <StepRow
                  label={result.refundAmount >= 0 ? t('step6.refundAmount') : t('step6.additionalPayment')}
                  value={result.refundAmount}
                  bold
                  highlight={result.refundAmount >= 0 ? 'blue' : 'red'}
                />
              </div>
            </details>
          </div>
        )}

        {activeTab === 'result' && !result && (
          <div className="text-center py-12">
            <Calculator className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
            <p className="text-gray-500 dark:text-gray-400">{t('tab.basic')}</p>
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div className="flex flex-wrap gap-3">
        <button
          onClick={handleCalculate}
          disabled={!grossSalary}
          className="flex-1 sm:flex-none bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg px-6 py-3 font-medium hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all"
        >
          <Calculator className="w-4 h-4" />
          {t('calculate')}
        </button>
        <button
          onClick={handleReset}
          className="bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg px-4 py-3 flex items-center gap-2 transition-all"
        >
          <RotateCcw className="w-4 h-4" />
          {t('reset')}
        </button>
        {result && (
          <button
            onClick={handleShare}
            className="bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg px-4 py-3 flex items-center gap-2 transition-all"
          >
            {isCopied ? <Check className="w-4 h-4 text-green-500" /> : <Share2 className="w-4 h-4" />}
            {isCopied ? t('copied') : t('share')}
          </button>
        )}
      </div>

      <GuideSection namespace="yearEndTaxCalc" />
    </div>
  )
}

// ────────────────────────────────────────
// Exported wrapper with Suspense
// ────────────────────────────────────────
export default function YearEndTaxCalculator() {
  return (
    <Suspense fallback={<div className="text-center py-12 text-gray-500">Loading...</div>}>
      <YearEndTaxCalculatorContent />
    </Suspense>
  )
}
