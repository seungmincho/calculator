'use client'

// ============================================================
// Translation keys used (namespace: incomeTaxCalc)
// ============================================================
// title, description, disclaimer
//
// --- Tabs ---
// tabIncome, tabDeduction, tabResult
//
// --- Income Tab ---
// incomeType, incomeTypeBusiness, incomeTypeOther
// totalRevenue, totalRevenuePlaceholder
// expenseMethod, expenseSimple, expenseStandard, expenseDirect
// occupation, occupationCustom
// occupationIT, occupationSW, occupationWriter, occupationDesigner
// occupationLecturer, occupationAcademyLecturer, occupationYoutuber
// occupationRider, occupationDriver, occupationInsurance
// simpleExpenseRate, standardExpenseRate, customExpenseRate
// otherIncome, otherIncomePlaceholder, otherIncomeDesc
// withholdingTax, withholdingTaxAuto, withholdingTaxManual, withholdingTaxDesc
// majorExpenses, majorExpensesPurchase, majorExpensesRent, majorExpensesLabor
// directExpenseAmount, directExpensePlaceholder
// won, percent
//
// --- Deduction Tab ---
// personalDeduction, personalDeductionSelf, personalDeductionSpouse
// personalDeductionParents, personalDeductionChildren, personalDeductionDependents
// persons, personalDeductionDesc
// nationalPension, nationalPensionPlaceholder, nationalPensionDesc
// healthInsurance, healthInsurancePlaceholder, healthInsuranceDesc
// pensionSavings, pensionSavingsPlaceholder, pensionSavingsDesc, pensionSavingsLimit
// childTaxCredit, childTaxCreditDesc
// childCount
//
// --- Result Tab ---
// resultTitle, resultSummary
// stepRevenue, stepExpense, stepBusinessIncome, stepTaxBase
// stepCalculatedTax, stepFinalTax
// appliedExpenseRate, expenseAmount
// incomeDeductionTotal, personalDeductionAmount
// nationalPensionDeduction, healthInsuranceDeduction
// taxableBase, taxRate, progressiveDeduction
// calculatedTax, taxCredits
// standardTaxCredit, childTaxCreditAmount, pensionTaxCredit, efilingCredit
// determinedTax, localIncomeTax, totalTaxDue
// prepaidIncomeTax, prepaidLocalTax, prepaidTotal
// finalResult, refund, additionalPayment, breakeven
//
// --- Comparison ---
// comparisonTitle, comparisonDesc
// comparisonSimple, comparisonStandard
// comparisonExpense, comparisonTax, comparisonDiff, comparisonBetter
//
// --- Guide ---
// guideTitle
// guideWhoTitle, guideWhoItems
// guideExpenseTitle, guideExpenseItems
// guideDeadlineTitle, guideDeadlineItems
// guideTipTitle, guideTipItems
// ============================================================

import { useState, useCallback, useMemo, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Calculator, FileText, Settings, BarChart3, AlertTriangle, Info, ChevronDown, ChevronUp } from 'lucide-react'

// --- Occupation data ---
interface OccupationInfo {
  code: string
  labelKey: string
  simpleRate: number     // 단순경비율 (일반)
  simpleExcessRate: number // 단순경비율 (초과, 4000만 이상분)
  standardRate: number   // 기준경비율
}

const OCCUPATIONS: OccupationInfo[] = [
  { code: '940909', labelKey: 'occupationIT', simpleRate: 0.641, simpleExcessRate: 0.641, standardRate: 0.117 },
  { code: '940926', labelKey: 'occupationSW', simpleRate: 0.641, simpleExcessRate: 0.641, standardRate: 0.117 },
  { code: '940100', labelKey: 'occupationWriter', simpleRate: 0.587, simpleExcessRate: 0.587, standardRate: 0.103 },
  { code: '940200', labelKey: 'occupationDesigner', simpleRate: 0.723, simpleExcessRate: 0.723, standardRate: 0.138 },
  { code: '940600', labelKey: 'occupationLecturer', simpleRate: 0.584, simpleExcessRate: 0.584, standardRate: 0.101 },
  { code: '940903', labelKey: 'occupationAcademyLecturer', simpleRate: 0.617, simpleExcessRate: 0.617, standardRate: 0.113 },
  { code: '940306', labelKey: 'occupationYoutuber', simpleRate: 0.641, simpleExcessRate: 0.641, standardRate: 0.117 },
  { code: '940918', labelKey: 'occupationRider', simpleRate: 0.794, simpleExcessRate: 0.794, standardRate: 0.222 },
  { code: '940913', labelKey: 'occupationDriver', simpleRate: 0.737, simpleExcessRate: 0.737, standardRate: 0.186 },
  { code: '940906', labelKey: 'occupationInsurance', simpleRate: 0.776, simpleExcessRate: 0.776, standardRate: 0.201 },
]

// --- Helper functions ---
function formatWon(value: number): string {
  return Math.round(value).toLocaleString('ko-KR')
}

function parseNum(str: string): number {
  return Number(str.replace(/,/g, '')) || 0
}

function formatInput(str: string): string {
  const num = str.replace(/[^\d]/g, '')
  if (!num) return ''
  return Number(num).toLocaleString('ko-KR')
}

// 누진세율 계산 (8구간)
function calcProgressiveTax(taxBase: number): { rate: number; deduction: number; tax: number } {
  const brackets = [
    { limit: 14_000_000, rate: 0.06, deduction: 0 },
    { limit: 50_000_000, rate: 0.15, deduction: 1_260_000 },
    { limit: 88_000_000, rate: 0.24, deduction: 5_760_000 },
    { limit: 150_000_000, rate: 0.35, deduction: 15_440_000 },
    { limit: 300_000_000, rate: 0.38, deduction: 19_940_000 },
    { limit: 500_000_000, rate: 0.40, deduction: 25_940_000 },
    { limit: 1_000_000_000, rate: 0.42, deduction: 35_940_000 },
    { limit: Infinity, rate: 0.45, deduction: 65_940_000 },
  ]
  for (const b of brackets) {
    if (taxBase <= b.limit) {
      return { rate: b.rate, deduction: b.deduction, tax: Math.max(0, taxBase * b.rate - b.deduction) }
    }
  }
  return { rate: 0.45, deduction: 65_940_000, tax: Math.max(0, taxBase * 0.45 - 65_940_000) }
}

type IncomeType = 'business' | 'other'
type ExpenseMethod = 'simple' | 'standard' | 'direct'
type TabType = 'income' | 'deduction' | 'result'

interface CalcResult {
  revenue: number
  expenseMethod: ExpenseMethod
  expenseRate: number
  expenseAmount: number
  businessIncome: number
  // other income
  otherIncome: number
  otherIncomeIncluded: boolean // 300만 초과 시 합산
  // deductions
  personalDeduction: number
  pensionDeduction: number
  healthDeduction: number
  totalDeduction: number
  taxBase: number
  // tax
  taxRate: number
  progressiveDeduction: number
  calculatedTax: number
  // credits
  standardCredit: number
  childCredit: number
  pensionCredit: number
  efilingCredit: number
  totalCredits: number
  determinedTax: number
  localTax: number
  totalTaxDue: number
  // prepaid
  prepaidIncome: number
  prepaidLocal: number
  prepaidTotal: number
  // final
  finalAmount: number // negative = refund
  // comparison
  compSimpleExpense: number
  compSimpleTax: number
  compStandardExpense: number
  compStandardTax: number
}

function IncomeTaxContent() {
  const searchParams = useSearchParams()
  const t = useTranslations('incomeTaxCalc')

  // --- Tab ---
  const [activeTab, setActiveTab] = useState<TabType>('income')

  // --- Income inputs ---
  const [incomeType, setIncomeType] = useState<IncomeType>('business')
  const [revenue, setRevenue] = useState(() => {
    const v = searchParams.get('revenue')
    return v ? formatInput(v) : ''
  })
  const [expenseMethod, setExpenseMethod] = useState<ExpenseMethod>(() => {
    const v = searchParams.get('method')
    return (v === 'simple' || v === 'standard' || v === 'direct') ? v : 'simple'
  })
  const [selectedOccupation, setSelectedOccupation] = useState<string>(() => {
    return searchParams.get('occ') || '940909'
  })
  const [customSimpleRate, setCustomSimpleRate] = useState('64.1')
  const [customStandardRate, setCustomStandardRate] = useState('11.7')
  const [directExpense, setDirectExpense] = useState('')
  // 기준경비율 주요경비
  const [majorPurchase, setMajorPurchase] = useState('')
  const [majorRent, setMajorRent] = useState('')
  const [majorLabor, setMajorLabor] = useState('')
  // 기타소득
  const [otherIncome, setOtherIncome] = useState('')
  // 기납부세액
  const [withholdingMode, setWithholdingMode] = useState<'auto' | 'manual'>('auto')
  const [manualWithholding, setManualWithholding] = useState('')

  // --- Deduction inputs ---
  const [hasSpouse, setHasSpouse] = useState(false)
  const [parentCount, setParentCount] = useState('0')
  const [childrenCount, setChildrenCount] = useState('0')
  const [dependentCount, setDependentCount] = useState('0')
  const [pensionAmount, setPensionAmount] = useState('')
  const [healthAmount, setHealthAmount] = useState('')
  const [pensionSavings, setPensionSavings] = useState('')
  const [childCreditCount, setChildCreditCount] = useState('0')

  // --- Guide toggle ---
  const [showGuide, setShowGuide] = useState(false)

  // --- Get occupation info ---
  const getOccupation = useCallback((): OccupationInfo => {
    if (selectedOccupation === 'custom') {
      return {
        code: 'custom',
        labelKey: 'occupationCustom',
        simpleRate: (parseFloat(customSimpleRate) || 0) / 100,
        simpleExcessRate: (parseFloat(customSimpleRate) || 0) / 100,
        standardRate: (parseFloat(customStandardRate) || 0) / 100,
      }
    }
    return OCCUPATIONS.find(o => o.code === selectedOccupation) || OCCUPATIONS[0]
  }, [selectedOccupation, customSimpleRate, customStandardRate])

  // --- Calculation ---
  const result = useMemo<CalcResult | null>(() => {
    const rev = parseNum(revenue)
    if (rev <= 0) return null

    const occ = getOccupation()

    // 1. 필요경비 계산
    let expenseAmt = 0
    let expRate = 0

    if (expenseMethod === 'simple') {
      // 단순경비율: 인적용역 수입 4000만 이하분 × 일반율, 초과분 × 초과율(배율 적용)
      const threshold = 40_000_000
      if (rev <= threshold) {
        expenseAmt = rev * occ.simpleRate
      } else {
        expenseAmt = threshold * occ.simpleRate + (rev - threshold) * occ.simpleExcessRate
      }
      expRate = occ.simpleRate
    } else if (expenseMethod === 'standard') {
      // 기준경비율: 주요경비 + (수입 × 기준경비율)
      const purchase = parseNum(majorPurchase)
      const rent = parseNum(majorRent)
      const labor = parseNum(majorLabor)
      expenseAmt = purchase + rent + labor + rev * occ.standardRate
      expRate = occ.standardRate
    } else {
      // 직접입력
      expenseAmt = parseNum(directExpense)
      expRate = rev > 0 ? expenseAmt / rev : 0
    }

    expenseAmt = Math.floor(expenseAmt)
    const businessIncome = Math.max(0, rev - expenseAmt)

    // 2. 기타소득 합산 여부 (연 300만 초과 시)
    const otherInc = parseNum(otherIncome)
    const otherExpense = otherInc * 0.6 // 기타소득 필요경비 60%
    const otherNet = Math.max(0, otherInc - otherExpense)
    const otherIncluded = otherNet > 3_000_000

    // 3. 총소득
    const totalIncome = businessIncome + (otherIncluded ? otherNet : 0)

    // 4. 소득공제
    const selfDeduction = 1_500_000
    const spouseDeduction = hasSpouse ? 1_500_000 : 0
    const parentDed = (parseInt(parentCount) || 0) * 1_500_000
    const childDed = (parseInt(childrenCount) || 0) * 1_500_000
    const dependentDed = (parseInt(dependentCount) || 0) * 1_500_000
    const personalDeduction = selfDeduction + spouseDeduction + parentDed + childDed + dependentDed

    const pensionDed = parseNum(pensionAmount) // 국민연금 전액
    const healthDed = parseNum(healthAmount) // 건강보험 전액

    const totalDeduction = personalDeduction + pensionDed + healthDed

    // 5. 과세표준
    const taxBase = Math.max(0, totalIncome - totalDeduction)

    // 6. 산출세액
    const { rate, deduction: progDed, tax: calcTax } = calcProgressiveTax(taxBase)
    const calculatedTax = Math.floor(calcTax)

    // 7. 세액공제
    const standardCredit = 70_000 // 표준세액공제 7만원
    const efilingCredit = 20_000 // 전자신고세액공제 2만원

    // 자녀세액공제
    const childCnt = parseInt(childCreditCount) || 0
    let childCredit = 0
    if (childCnt === 1) childCredit = 250_000
    else if (childCnt === 2) childCredit = 550_000
    else if (childCnt >= 3) childCredit = 550_000 + (childCnt - 2) * 400_000

    // 연금저축/IRP 세액공제
    const savingsAmt = parseNum(pensionSavings)
    const savingsLimit = 9_000_000 // 한도 900만
    const savingsBase = Math.min(savingsAmt, savingsLimit)
    // 총급여 5500만 이하: 16.5%, 초과: 13.2%
    // 사업소득자: 종합소득금액 4500만 이하 16.5%, 초과 13.2%
    const pensionRate = totalIncome <= 45_000_000 ? 0.165 : 0.132
    const pensionCredit = Math.floor(savingsBase * pensionRate)

    const totalCredits = standardCredit + childCredit + pensionCredit + efilingCredit

    // 8. 결정세액
    const determinedTax = Math.max(0, calculatedTax - totalCredits)

    // 9. 지방소득세
    const localTax = Math.floor(determinedTax * 0.1)

    const totalTaxDue = determinedTax + localTax

    // 10. 기납부세액
    let prepaidIncome = 0
    let prepaidLocal = 0
    if (withholdingMode === 'auto') {
      // 사업소득 3.3% = 소득세 3% + 지방 0.3%
      prepaidIncome = Math.floor(rev * 0.03)
      prepaidLocal = Math.floor(rev * 0.003)
      // 기타소득 22% 원천징수 (소득세 20% + 지방 2%)
      if (otherInc > 0) {
        prepaidIncome += Math.floor(otherInc * 0.20)
        prepaidLocal += Math.floor(otherInc * 0.02)
      }
    } else {
      prepaidIncome = parseNum(manualWithholding)
      prepaidLocal = Math.floor(prepaidIncome * 0.1)
    }
    const prepaidTotal = prepaidIncome + prepaidLocal

    // 11. 최종
    const finalAmount = totalTaxDue - prepaidTotal // 양수: 추가납부, 음수: 환급

    // 12. 비교 (단순 vs 기준)
    // 단순경비율 기준 세금
    let compSimpleExp = 0
    if (rev <= 40_000_000) {
      compSimpleExp = rev * occ.simpleRate
    } else {
      compSimpleExp = 40_000_000 * occ.simpleRate + (rev - 40_000_000) * occ.simpleExcessRate
    }
    compSimpleExp = Math.floor(compSimpleExp)
    const compSimpleIncome = Math.max(0, rev - compSimpleExp)
    const compSimpleBase = Math.max(0, compSimpleIncome - totalDeduction)
    const compSimpleTaxCalc = calcProgressiveTax(compSimpleBase)
    const compSimpleDetermined = Math.max(0, Math.floor(compSimpleTaxCalc.tax) - totalCredits)
    const compSimpleFinal = compSimpleDetermined + Math.floor(compSimpleDetermined * 0.1)

    // 기준경비율 기준 세금 (주요경비 현재 입력값 사용)
    const purchase = parseNum(majorPurchase)
    const rent = parseNum(majorRent)
    const labor = parseNum(majorLabor)
    const compStdExp = Math.floor(purchase + rent + labor + rev * occ.standardRate)
    const compStdIncome = Math.max(0, rev - compStdExp)
    const compStdBase = Math.max(0, compStdIncome - totalDeduction)
    const compStdTaxCalc = calcProgressiveTax(compStdBase)
    const compStdDetermined = Math.max(0, Math.floor(compStdTaxCalc.tax) - totalCredits)
    const compStdFinal = compStdDetermined + Math.floor(compStdDetermined * 0.1)

    return {
      revenue: rev,
      expenseMethod,
      expenseRate: expRate,
      expenseAmount: expenseAmt,
      businessIncome,
      otherIncome: otherNet,
      otherIncomeIncluded: otherIncluded,
      personalDeduction,
      pensionDeduction: pensionDed,
      healthDeduction: healthDed,
      totalDeduction,
      taxBase,
      taxRate: rate,
      progressiveDeduction: progDed,
      calculatedTax,
      standardCredit,
      childCredit,
      pensionCredit,
      efilingCredit,
      totalCredits,
      determinedTax,
      localTax,
      totalTaxDue,
      prepaidIncome,
      prepaidLocal,
      prepaidTotal,
      finalAmount,
      compSimpleExpense: compSimpleExp,
      compSimpleTax: compSimpleFinal,
      compStandardExpense: compStdExp,
      compStandardTax: compStdFinal,
    }
  }, [
    revenue, expenseMethod, selectedOccupation, customSimpleRate, customStandardRate,
    directExpense, majorPurchase, majorRent, majorLabor, otherIncome,
    hasSpouse, parentCount, childrenCount, dependentCount,
    pensionAmount, healthAmount, pensionSavings, childCreditCount,
    withholdingMode, manualWithholding, getOccupation,
  ])

  // --- URL sync ---
  const updateURL = useCallback((params: Record<string, string>) => {
    if (typeof window === 'undefined') return
    const url = new URL(window.location.href)
    Object.entries(params).forEach(([key, value]) => {
      if (value) url.searchParams.set(key, value)
      else url.searchParams.delete(key)
    })
    window.history.replaceState({}, '', url)
  }, [])

  const handleRevenueChange = useCallback((val: string) => {
    const formatted = formatInput(val)
    setRevenue(formatted)
    updateURL({ revenue: val.replace(/[^\d]/g, '') })
  }, [updateURL])

  const handleMethodChange = useCallback((method: ExpenseMethod) => {
    setExpenseMethod(method)
    updateURL({ method })
  }, [updateURL])

  const handleOccupationChange = useCallback((code: string) => {
    setSelectedOccupation(code)
    updateURL({ occ: code })
  }, [updateURL])

  // --- Tab components ---
  const tabs: { key: TabType; labelKey: string; icon: React.ReactNode }[] = [
    { key: 'income', labelKey: 'tabIncome', icon: <FileText className="w-4 h-4" /> },
    { key: 'deduction', labelKey: 'tabDeduction', icon: <Settings className="w-4 h-4" /> },
    { key: 'result', labelKey: 'tabResult', icon: <BarChart3 className="w-4 h-4" /> },
  ]

  const inputClass = 'w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent'
  const labelClass = 'block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'
  const cardClass = 'bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6'
  const selectClass = 'w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500'

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
      <div className="flex items-start gap-2 bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
        <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
        <p className="text-sm text-amber-800 dark:text-amber-300">{t('disclaimer')}</p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 dark:border-gray-700">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.key
                ? 'border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-400'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            {tab.icon}
            {t(tab.labelKey)}
          </button>
        ))}
      </div>

      {/* Tab: Income */}
      {activeTab === 'income' && (
        <div className={cardClass}>
          <div className="space-y-5">
            {/* Income Type */}
            <div>
              <label className={labelClass}>{t('incomeType')}</label>
              <div className="flex gap-3">
                {(['business', 'other'] as const).map(type => (
                  <label key={type} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="incomeType"
                      checked={incomeType === type}
                      onChange={() => setIncomeType(type)}
                      className="accent-blue-600"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      {t(type === 'business' ? 'incomeTypeBusiness' : 'incomeTypeOther')}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* Revenue */}
            <div>
              <label className={labelClass}>{t('totalRevenue')}</label>
              <div className="relative">
                <input
                  type="text"
                  inputMode="numeric"
                  value={revenue}
                  onChange={e => handleRevenueChange(e.target.value)}
                  placeholder={t('totalRevenuePlaceholder')}
                  className={inputClass}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">{t('won')}</span>
              </div>
            </div>

            {/* Occupation */}
            {incomeType === 'business' && (
              <div>
                <label className={labelClass}>{t('occupation')}</label>
                <select
                  value={selectedOccupation}
                  onChange={e => handleOccupationChange(e.target.value)}
                  className={selectClass}
                >
                  {OCCUPATIONS.map(occ => (
                    <option key={occ.code} value={occ.code}>
                      {t(occ.labelKey)} ({occ.code}) - {t('simpleExpenseRate')} {(occ.simpleRate * 100).toFixed(1)}%
                    </option>
                  ))}
                  <option value="custom">{t('occupationCustom')}</option>
                </select>

                {selectedOccupation === 'custom' && (
                  <div className="mt-3 grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-gray-500 dark:text-gray-400">{t('simpleExpenseRate')}</label>
                      <div className="relative">
                        <input
                          type="number"
                          step="0.1"
                          value={customSimpleRate}
                          onChange={e => setCustomSimpleRate(e.target.value)}
                          className={inputClass}
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">{t('percent')}</span>
                      </div>
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 dark:text-gray-400">{t('standardExpenseRate')}</label>
                      <div className="relative">
                        <input
                          type="number"
                          step="0.1"
                          value={customStandardRate}
                          onChange={e => setCustomStandardRate(e.target.value)}
                          className={inputClass}
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">{t('percent')}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Expense Method */}
            {incomeType === 'business' && (
              <div>
                <label className={labelClass}>{t('expenseMethod')}</label>
                <div className="flex flex-wrap gap-2">
                  {(['simple', 'standard', 'direct'] as const).map(method => (
                    <button
                      key={method}
                      onClick={() => handleMethodChange(method)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        expenseMethod === method
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                      }`}
                    >
                      {t(method === 'simple' ? 'expenseSimple' : method === 'standard' ? 'expenseStandard' : 'expenseDirect')}
                    </button>
                  ))}
                </div>

                {/* Simple rate display */}
                {expenseMethod === 'simple' && revenue && (
                  <div className="mt-3 bg-blue-50 dark:bg-blue-950 rounded-lg p-3">
                    <p className="text-sm text-blue-800 dark:text-blue-300">
                      {t('appliedExpenseRate')}: {(getOccupation().simpleRate * 100).toFixed(1)}% → {t('expenseAmount')}: {formatWon(parseNum(revenue) * getOccupation().simpleRate)}{t('won')}
                    </p>
                  </div>
                )}

                {/* Standard: major expenses */}
                {expenseMethod === 'standard' && (
                  <div className="mt-3 space-y-3">
                    <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1">
                      <Info className="w-4 h-4" />
                      {t('majorExpenses')}
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="text-xs text-gray-500 dark:text-gray-400">{t('majorExpensesPurchase')}</label>
                        <input
                          type="text"
                          inputMode="numeric"
                          value={majorPurchase}
                          onChange={e => setMajorPurchase(formatInput(e.target.value))}
                          className={inputClass}
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500 dark:text-gray-400">{t('majorExpensesRent')}</label>
                        <input
                          type="text"
                          inputMode="numeric"
                          value={majorRent}
                          onChange={e => setMajorRent(formatInput(e.target.value))}
                          className={inputClass}
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500 dark:text-gray-400">{t('majorExpensesLabor')}</label>
                        <input
                          type="text"
                          inputMode="numeric"
                          value={majorLabor}
                          onChange={e => setMajorLabor(formatInput(e.target.value))}
                          className={inputClass}
                        />
                      </div>
                    </div>
                    <div className="bg-blue-50 dark:bg-blue-950 rounded-lg p-3">
                      <p className="text-sm text-blue-800 dark:text-blue-300">
                        {t('standardExpenseRate')}: {(getOccupation().standardRate * 100).toFixed(1)}%
                      </p>
                    </div>
                  </div>
                )}

                {/* Direct expense */}
                {expenseMethod === 'direct' && (
                  <div className="mt-3">
                    <label className="text-xs text-gray-500 dark:text-gray-400">{t('directExpenseAmount')}</label>
                    <div className="relative">
                      <input
                        type="text"
                        inputMode="numeric"
                        value={directExpense}
                        onChange={e => setDirectExpense(formatInput(e.target.value))}
                        placeholder={t('directExpensePlaceholder')}
                        className={inputClass}
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">{t('won')}</span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Other income */}
            <div>
              <label className={labelClass}>{t('otherIncome')}</label>
              <div className="relative">
                <input
                  type="text"
                  inputMode="numeric"
                  value={otherIncome}
                  onChange={e => setOtherIncome(formatInput(e.target.value))}
                  placeholder={t('otherIncomePlaceholder')}
                  className={inputClass}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">{t('won')}</span>
              </div>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{t('otherIncomeDesc')}</p>
            </div>

            {/* Withholding tax */}
            <div>
              <label className={labelClass}>{t('withholdingTax')}</label>
              <div className="flex gap-3 mb-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="withholding"
                    checked={withholdingMode === 'auto'}
                    onChange={() => setWithholdingMode('auto')}
                    className="accent-blue-600"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">{t('withholdingTaxAuto')}</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="withholding"
                    checked={withholdingMode === 'manual'}
                    onChange={() => setWithholdingMode('manual')}
                    className="accent-blue-600"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">{t('withholdingTaxManual')}</span>
                </label>
              </div>
              {withholdingMode === 'auto' && revenue && (
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {t('withholdingTaxDesc')}: {formatWon(parseNum(revenue) * 0.033)}{t('won')} (3.3%)
                </p>
              )}
              {withholdingMode === 'manual' && (
                <div className="relative">
                  <input
                    type="text"
                    inputMode="numeric"
                    value={manualWithholding}
                    onChange={e => setManualWithholding(formatInput(e.target.value))}
                    className={inputClass}
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">{t('won')}</span>
                </div>
              )}
            </div>

            {/* Next tab button */}
            <button
              onClick={() => setActiveTab('deduction')}
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg px-4 py-3 font-medium hover:from-blue-700 hover:to-indigo-700 transition-colors"
            >
              {t('tabDeduction')} →
            </button>
          </div>
        </div>
      )}

      {/* Tab: Deduction */}
      {activeTab === 'deduction' && (
        <div className={cardClass}>
          <div className="space-y-5">
            {/* Personal deduction */}
            <div>
              <label className={labelClass}>{t('personalDeduction')}</label>
              <p className="text-xs text-gray-400 dark:text-gray-500 mb-3">{t('personalDeductionDesc')}</p>
              <div className="space-y-3">
                {/* Self - always checked */}
                <div className="flex items-center justify-between py-2 px-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <span className="text-sm text-gray-700 dark:text-gray-300">{t('personalDeductionSelf')}</span>
                  <span className="text-sm font-medium text-blue-600 dark:text-blue-400">150{t('won')}</span>
                </div>

                {/* Spouse */}
                <div className="flex items-center justify-between py-2 px-3 rounded-lg">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={hasSpouse}
                      onChange={e => setHasSpouse(e.target.checked)}
                      className="accent-blue-600 w-4 h-4"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">{t('personalDeductionSpouse')}</span>
                  </label>
                  <span className="text-sm text-gray-500 dark:text-gray-400">150{t('won')}</span>
                </div>

                {/* Parents */}
                <div className="flex items-center justify-between py-2 px-3 rounded-lg">
                  <span className="text-sm text-gray-700 dark:text-gray-300">{t('personalDeductionParents')}</span>
                  <div className="flex items-center gap-2">
                    <select
                      value={parentCount}
                      onChange={e => setParentCount(e.target.value)}
                      className="px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white"
                    >
                      {[0, 1, 2, 3, 4].map(n => (
                        <option key={n} value={n}>{n}{t('persons')}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Children */}
                <div className="flex items-center justify-between py-2 px-3 rounded-lg">
                  <span className="text-sm text-gray-700 dark:text-gray-300">{t('personalDeductionChildren')}</span>
                  <select
                    value={childrenCount}
                    onChange={e => setChildrenCount(e.target.value)}
                    className="px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white"
                  >
                    {[0, 1, 2, 3, 4, 5].map(n => (
                      <option key={n} value={n}>{n}{t('persons')}</option>
                    ))}
                  </select>
                </div>

                {/* Other dependents */}
                <div className="flex items-center justify-between py-2 px-3 rounded-lg">
                  <span className="text-sm text-gray-700 dark:text-gray-300">{t('personalDeductionDependents')}</span>
                  <select
                    value={dependentCount}
                    onChange={e => setDependentCount(e.target.value)}
                    className="px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white"
                  >
                    {[0, 1, 2, 3, 4, 5].map(n => (
                      <option key={n} value={n}>{n}{t('persons')}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* National pension */}
            <div>
              <label className={labelClass}>{t('nationalPension')}</label>
              <div className="relative">
                <input
                  type="text"
                  inputMode="numeric"
                  value={pensionAmount}
                  onChange={e => setPensionAmount(formatInput(e.target.value))}
                  placeholder={t('nationalPensionPlaceholder')}
                  className={inputClass}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">{t('won')}</span>
              </div>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{t('nationalPensionDesc')}</p>
            </div>

            {/* Health insurance */}
            <div>
              <label className={labelClass}>{t('healthInsurance')}</label>
              <div className="relative">
                <input
                  type="text"
                  inputMode="numeric"
                  value={healthAmount}
                  onChange={e => setHealthAmount(formatInput(e.target.value))}
                  placeholder={t('healthInsurancePlaceholder')}
                  className={inputClass}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">{t('won')}</span>
              </div>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{t('healthInsuranceDesc')}</p>
            </div>

            {/* Pension savings / IRP */}
            <div>
              <label className={labelClass}>{t('pensionSavings')}</label>
              <div className="relative">
                <input
                  type="text"
                  inputMode="numeric"
                  value={pensionSavings}
                  onChange={e => setPensionSavings(formatInput(e.target.value))}
                  placeholder={t('pensionSavingsPlaceholder')}
                  className={inputClass}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">{t('won')}</span>
              </div>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{t('pensionSavingsDesc')}</p>
              <p className="text-xs text-blue-600 dark:text-blue-400 mt-0.5">{t('pensionSavingsLimit')}</p>
            </div>

            {/* Child tax credit */}
            <div>
              <label className={labelClass}>{t('childTaxCredit')}</label>
              <select
                value={childCreditCount}
                onChange={e => setChildCreditCount(e.target.value)}
                className={selectClass}
              >
                {[0, 1, 2, 3, 4, 5].map(n => (
                  <option key={n} value={n}>{n}{t('childCount')}</option>
                ))}
              </select>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{t('childTaxCreditDesc')}</p>
            </div>

            {/* Nav buttons */}
            <div className="flex gap-3">
              <button
                onClick={() => setActiveTab('income')}
                className="flex-1 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg px-4 py-3 font-medium transition-colors"
              >
                ← {t('tabIncome')}
              </button>
              <button
                onClick={() => setActiveTab('result')}
                className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg px-4 py-3 font-medium hover:from-blue-700 hover:to-indigo-700 transition-colors"
              >
                {t('tabResult')} →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tab: Result */}
      {activeTab === 'result' && (
        <div className="space-y-6">
          {!result ? (
            <div className={cardClass}>
              <p className="text-center text-gray-500 dark:text-gray-400 py-8">
                {t('totalRevenuePlaceholder')}
              </p>
            </div>
          ) : (
            <>
              {/* Summary card */}
              <div className={`${cardClass} ${result.finalAmount < 0 ? 'ring-2 ring-blue-500' : result.finalAmount > 0 ? 'ring-2 ring-red-500' : ''}`}>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">{t('resultSummary')}</h2>
                <div className={`text-3xl font-bold ${result.finalAmount < 0 ? 'text-blue-600 dark:text-blue-400' : result.finalAmount > 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-white'}`}>
                  {result.finalAmount < 0 ? (
                    <>{t('refund')} {formatWon(Math.abs(result.finalAmount))}{t('won')}</>
                  ) : result.finalAmount > 0 ? (
                    <>{t('additionalPayment')} {formatWon(result.finalAmount)}{t('won')}</>
                  ) : (
                    <>{t('breakeven')}</>
                  )}
                </div>
              </div>

              {/* Waterfall breakdown */}
              <div className={cardClass}>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{t('resultTitle')}</h2>
                <div className="space-y-0">
                  {/* Step 1: Revenue */}
                  <WaterfallRow label={t('stepRevenue')} value={result.revenue} step={1} />

                  {/* Step 2: Expense */}
                  <WaterfallRow
                    label={`${t('stepExpense')} (${t('appliedExpenseRate')}: ${(result.expenseRate * 100).toFixed(1)}%)`}
                    value={-result.expenseAmount}
                    step={2}
                  />

                  {/* Step 3: Business income */}
                  <WaterfallRow label={t('stepBusinessIncome')} value={result.businessIncome} step={3} isSubtotal />

                  {/* Deductions detail */}
                  <div className="ml-4 border-l-2 border-gray-200 dark:border-gray-700 pl-4 py-2 space-y-1">
                    <DetailRow label={t('personalDeductionAmount')} value={result.personalDeduction} />
                    {result.pensionDeduction > 0 && (
                      <DetailRow label={t('nationalPensionDeduction')} value={result.pensionDeduction} />
                    )}
                    {result.healthDeduction > 0 && (
                      <DetailRow label={t('healthInsuranceDeduction')} value={result.healthDeduction} />
                    )}
                    <DetailRow label={t('incomeDeductionTotal')} value={result.totalDeduction} isBold />
                  </div>

                  {/* Step 4: Tax base */}
                  <WaterfallRow label={t('stepTaxBase')} value={result.taxBase} step={4} isSubtotal />

                  {/* Tax rate info */}
                  <div className="ml-4 border-l-2 border-gray-200 dark:border-gray-700 pl-4 py-2 space-y-1">
                    <DetailRow label={t('taxRate')} value={`${(result.taxRate * 100).toFixed(0)}%`} isText />
                    <DetailRow label={t('progressiveDeduction')} value={result.progressiveDeduction} />
                  </div>

                  {/* Step 5: Calculated tax */}
                  <WaterfallRow label={t('stepCalculatedTax')} value={result.calculatedTax} step={5} isSubtotal />

                  {/* Tax credits detail */}
                  <div className="ml-4 border-l-2 border-gray-200 dark:border-gray-700 pl-4 py-2 space-y-1">
                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">{t('taxCredits')}</p>
                    <DetailRow label={t('standardTaxCredit')} value={result.standardCredit} />
                    {result.childCredit > 0 && (
                      <DetailRow label={t('childTaxCreditAmount')} value={result.childCredit} />
                    )}
                    {result.pensionCredit > 0 && (
                      <DetailRow label={t('pensionTaxCredit')} value={result.pensionCredit} />
                    )}
                    <DetailRow label={t('efilingCredit')} value={result.efilingCredit} />
                  </div>

                  {/* Step 6: Final */}
                  <WaterfallRow label={t('stepFinalTax')} value={result.determinedTax} step={6} isSubtotal />

                  {/* Local + totals */}
                  <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400">{t('determinedTax')}</span>
                      <span className="text-gray-900 dark:text-white font-medium">{formatWon(result.determinedTax)}{t('won')}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400">{t('localIncomeTax')} (10%)</span>
                      <span className="text-gray-900 dark:text-white font-medium">{formatWon(result.localTax)}{t('won')}</span>
                    </div>
                    <div className="flex justify-between text-sm font-semibold border-t border-gray-200 dark:border-gray-700 pt-2">
                      <span className="text-gray-900 dark:text-white">{t('totalTaxDue')}</span>
                      <span className="text-gray-900 dark:text-white">{formatWon(result.totalTaxDue)}{t('won')}</span>
                    </div>
                  </div>

                  {/* Prepaid */}
                  <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400">{t('prepaidIncomeTax')}</span>
                      <span className="text-gray-900 dark:text-white">-{formatWon(result.prepaidIncome)}{t('won')}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400">{t('prepaidLocalTax')}</span>
                      <span className="text-gray-900 dark:text-white">-{formatWon(result.prepaidLocal)}{t('won')}</span>
                    </div>
                    <div className="flex justify-between text-sm font-semibold">
                      <span className="text-gray-600 dark:text-gray-400">{t('prepaidTotal')}</span>
                      <span className="text-gray-900 dark:text-white">-{formatWon(result.prepaidTotal)}{t('won')}</span>
                    </div>
                  </div>

                  {/* Final result */}
                  <div className={`mt-4 p-4 rounded-xl ${result.finalAmount < 0 ? 'bg-blue-50 dark:bg-blue-950' : result.finalAmount > 0 ? 'bg-red-50 dark:bg-red-950' : 'bg-gray-50 dark:bg-gray-900'}`}>
                    <div className="flex justify-between items-center">
                      <span className="font-semibold text-gray-900 dark:text-white">{t('finalResult')}</span>
                      <span className={`text-xl font-bold ${result.finalAmount < 0 ? 'text-blue-600 dark:text-blue-400' : result.finalAmount > 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-white'}`}>
                        {result.finalAmount < 0
                          ? `${t('refund')} ${formatWon(Math.abs(result.finalAmount))}${t('won')}`
                          : result.finalAmount > 0
                            ? `${t('additionalPayment')} ${formatWon(result.finalAmount)}${t('won')}`
                            : t('breakeven')
                        }
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Comparison: Simple vs Standard */}
              <div className="bg-yellow-50 dark:bg-yellow-950 rounded-xl shadow-lg p-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">{t('comparisonTitle')}</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">{t('comparisonDesc')}</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
                    <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">{t('comparisonSimple')}</h3>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500 dark:text-gray-400">{t('comparisonExpense')}</span>
                        <span className="text-gray-900 dark:text-white">{formatWon(result.compSimpleExpense)}{t('won')}</span>
                      </div>
                      <div className="flex justify-between text-sm font-semibold">
                        <span className="text-gray-700 dark:text-gray-300">{t('comparisonTax')}</span>
                        <span className="text-gray-900 dark:text-white">{formatWon(result.compSimpleTax)}{t('won')}</span>
                      </div>
                    </div>
                  </div>
                  <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
                    <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">{t('comparisonStandard')}</h3>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500 dark:text-gray-400">{t('comparisonExpense')}</span>
                        <span className="text-gray-900 dark:text-white">{formatWon(result.compStandardExpense)}{t('won')}</span>
                      </div>
                      <div className="flex justify-between text-sm font-semibold">
                        <span className="text-gray-700 dark:text-gray-300">{t('comparisonTax')}</span>
                        <span className="text-gray-900 dark:text-white">{formatWon(result.compStandardTax)}{t('won')}</span>
                      </div>
                    </div>
                  </div>
                </div>
                {result.compSimpleTax !== result.compStandardTax && (
                  <div className="mt-4 bg-white dark:bg-gray-800 rounded-lg p-3">
                    <p className="text-sm font-medium text-center">
                      <span className="text-gray-600 dark:text-gray-400">{t('comparisonDiff')}: </span>
                      <span className="text-blue-600 dark:text-blue-400 font-bold">
                        {formatWon(Math.abs(result.compSimpleTax - result.compStandardTax))}{t('won')}
                      </span>
                      <span className="text-gray-500 dark:text-gray-400 ml-1">
                        ({t('comparisonBetter')}: {result.compSimpleTax <= result.compStandardTax ? t('comparisonSimple') : t('comparisonStandard')})
                      </span>
                    </p>
                  </div>
                )}
              </div>

              {/* Back to income */}
              <button
                onClick={() => setActiveTab('income')}
                className="w-full bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg px-4 py-3 font-medium transition-colors"
              >
                ← {t('tabIncome')}
              </button>
            </>
          )}
        </div>
      )}

      {/* Guide section */}
      <div className={cardClass}>
        <button
          onClick={() => setShowGuide(!showGuide)}
          className="w-full flex items-center justify-between"
        >
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">{t('guideTitle')}</h2>
          {showGuide ? <ChevronUp className="w-5 h-5 text-gray-500" /> : <ChevronDown className="w-5 h-5 text-gray-500" />}
        </button>
        {showGuide && (
          <div className="mt-6 space-y-6">
            <GuideSection t={t} titleKey="guideWhoTitle" itemsKey="guideWhoItems" />
            <GuideSection t={t} titleKey="guideExpenseTitle" itemsKey="guideExpenseItems" />
            <GuideSection t={t} titleKey="guideDeadlineTitle" itemsKey="guideDeadlineItems" />
            <GuideSection t={t} titleKey="guideTipTitle" itemsKey="guideTipItems" />
          </div>
        )}
      </div>
    </div>
  )
}

// --- Sub-components ---

function WaterfallRow({ label, value, step, isSubtotal }: {
  label: string
  value: number
  step: number
  isSubtotal?: boolean
}) {
  return (
    <div className={`flex items-center justify-between py-2.5 px-3 rounded-lg ${isSubtotal ? 'bg-gray-50 dark:bg-gray-700 font-semibold' : ''}`}>
      <div className="flex items-center gap-2">
        <span className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 text-xs flex items-center justify-center font-bold">{step}</span>
        <span className="text-sm text-gray-700 dark:text-gray-300">{label}</span>
      </div>
      <span className={`text-sm ${value < 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-white'} ${isSubtotal ? 'font-semibold' : ''}`}>
        {value < 0 ? '-' : ''}{formatWon(Math.abs(value))}
      </span>
    </div>
  )
}

function DetailRow({ label, value, isBold, isText }: {
  label: string
  value: number | string
  isBold?: boolean
  isText?: boolean
}) {
  return (
    <div className={`flex justify-between text-xs ${isBold ? 'font-semibold' : ''}`}>
      <span className="text-gray-500 dark:text-gray-400">{label}</span>
      <span className="text-gray-700 dark:text-gray-300">
        {isText ? value : `${formatWon(value as number)}`}
      </span>
    </div>
  )
}

interface GuideSectionProps {
  t: ReturnType<typeof useTranslations>
  titleKey: string
  itemsKey: string
}

function GuideSection({ t, titleKey, itemsKey }: GuideSectionProps) {
  const items = t.raw(itemsKey) as string[]
  return (
    <div>
      <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-2">{t(titleKey)}</h3>
      <ul className="space-y-1.5">
        {items.map((item, i) => (
          <li key={i} className="text-sm text-gray-600 dark:text-gray-400 flex items-start gap-2">
            <span className="text-blue-500 mt-0.5">&#8226;</span>
            {item}
          </li>
        ))}
      </ul>
    </div>
  )
}

// --- Export with Suspense ---
export default function IncomeTaxCalculator() {
  return (
    <Suspense fallback={<div className="text-center py-8">Loading...</div>}>
      <IncomeTaxContent />
    </Suspense>
  )
}
