'use client'

/**
 * JeonseLoanCalculator - 전세자금대출 계산기
 *
 * Translation namespace: jeonseLoanCalc
 * Translation keys used:
 *   - title, description
 *   - loanType.title
 *   - loanType.general.label, loanType.general.sub, loanType.general.rate
 *   - loanType.youth.label, loanType.youth.sub, loanType.youth.rate
 *   - loanType.newlywed.label, loanType.newlywed.sub, loanType.newlywed.rate
 *   - loanType.bank.label, loanType.bank.sub, loanType.bank.rate
 *   - input.deposit, input.depositPlaceholder
 *   - input.loanAmount, input.loanAmountPlaceholder
 *   - input.location, input.locationCapital, input.locationLocal
 *   - input.income, input.incomePlaceholder
 *   - input.smeWorker (중소기업 재직 여부)
 *   - input.children, input.children0, input.children1, input.children2, input.children3plus
 *   - input.bankRate, input.bankRatePlaceholder
 *   - repayment.title
 *   - repayment.bullet (만기일시상환)
 *   - repayment.equalPrincipalInterest (원리금균등상환)
 *   - repayment.period, repayment.years
 *   - result.title
 *   - result.appliedRate, result.baseRate, result.discount
 *   - result.monthlyPayment, result.monthlyInterest
 *   - result.loanLimit, result.maxLoanByLTV, result.maxLoanByType, result.ltvRatio
 *   - result.totalInterest
 *   - result.guaranteeFee, result.guaranteeFeeDesc
 *   - result.eligibility, result.eligible, result.notEligible
 *   - result.incomeCheck, result.depositCheck, result.loanLimitCheck
 *   - result.ltvWarning
 *   - result.noResult
 *   - result.calculate
 *   - unit.won, unit.percent, unit.year, unit.month, unit.manwon, unit.eok
 *   - disclaimer
 *   - guide.title
 *   - guide.overview.title, guide.overview.items
 *   - guide.rates.title, guide.rates.items
 *   - guide.tips.title, guide.tips.items
 */

import { useState, useEffect, useCallback, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Calculator, CheckCircle, XCircle, AlertTriangle, BookOpen, Building2, GraduationCap, Heart, Landmark } from 'lucide-react'

// ── 대출 유형 ──
type LoanType = 'general' | 'youth' | 'newlywed' | 'bank'

// ── 상환 방식 ──
type RepaymentType = 'bullet' | 'equalPrincipalInterest'

// ── 소재지 ──
type Location = 'capital' | 'local'

// ── 금리 테이블 ──
interface RateBracket {
  maxDeposit: number // 보증금 상한 (원)
  rate: number        // 연 이율 (%)
}

const GENERAL_RATES: RateBracket[] = [
  { maxDeposit: 20_000_000, rate: 2.5 },
  { maxDeposit: 40_000_000, rate: 2.7 },
  { maxDeposit: 60_000_000, rate: 3.0 },
  { maxDeposit: 75_000_000, rate: 3.3 },
  { maxDeposit: Infinity, rate: 3.5 },
]

interface YouthRateBracket {
  maxIncome: number
  rate: number
}

const YOUTH_RATES: YouthRateBracket[] = [
  { maxIncome: 20_000_000, rate: 2.2 },
  { maxIncome: 40_000_000, rate: 2.5 },
  { maxIncome: 60_000_000, rate: 2.9 },
  { maxIncome: Infinity, rate: 4.3 },
]

const NEWLYWED_RATES: RateBracket[] = [
  { maxDeposit: 20_000_000, rate: 1.9 },
  { maxDeposit: 40_000_000, rate: 2.2 },
  { maxDeposit: 60_000_000, rate: 2.6 },
  { maxDeposit: 75_000_000, rate: 3.0 },
  { maxDeposit: Infinity, rate: 4.3 },
]

// ── 한도 ──
interface LoanLimit {
  capital: number
  local: number
  ltv: number
}

const LOAN_LIMITS: Record<LoanType, LoanLimit> = {
  general:  { capital: 120_000_000, local: 80_000_000, ltv: 0.70 },
  youth:    { capital: 150_000_000, local: 150_000_000, ltv: 0.80 },
  newlywed: { capital: 250_000_000, local: 160_000_000, ltv: 0.80 },
  bank:     { capital: 500_000_000, local: 500_000_000, ltv: 0.80 },
}

// ── 소득 기준 ──
const INCOME_LIMITS: Record<LoanType, number> = {
  general: 50_000_000,
  youth: 50_000_000,
  newlywed: 50_000_000,
  bank: Infinity,
}

// ── 보증금 상한 ──
const DEPOSIT_LIMITS: Record<LoanType, Record<Location, number>> = {
  general:  { capital: 300_000_000, local: 200_000_000 },
  youth:    { capital: 300_000_000, local: 200_000_000 },
  newlywed: { capital: 300_000_000, local: 200_000_000 },
  bank:     { capital: Infinity, local: Infinity },
}

const CHILD_DISCOUNT: Record<string, number> = {
  '0': 0,
  '1': 0.3,
  '2': 0.5,
  '3plus': 0.7,
}

const GUARANTEE_FEE_RATE = 0.0015 // 0.15%

const LOAN_PERIODS = [2, 4, 6, 8, 10]

// ── 결과 타입 ──
interface CalcResult {
  appliedRate: number
  baseRate: number
  discountTotal: number
  discounts: { label: string; value: number }[]
  monthlyPayment: number
  totalInterest: number
  maxLoanByLTV: number
  maxLoanByType: number
  effectiveLoan: number
  guaranteeFee: number
  eligibility: {
    income: boolean
    deposit: boolean
    loanLimit: boolean
  }
  ltvExceeded: boolean
}

// ── 포맷 유틸 ──
const formatNumber = (num: number): string =>
  num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',')

const parseNumber = (str: string): number =>
  parseInt(str.replace(/,/g, ''), 10) || 0

const formatInputNumber = (value: string): string => {
  const digits = value.replace(/[^0-9]/g, '')
  if (!digits) return ''
  return parseInt(digits, 10).toLocaleString()
}

const formatCurrency = (num: number): string => {
  if (num >= 100_000_000) {
    const eok = num / 100_000_000
    return eok % 1 === 0 ? `${eok.toFixed(0)}억원` : `${eok.toFixed(1)}억원`
  }
  if (num >= 10_000) return `${Math.floor(num / 10_000).toLocaleString()}만원`
  return `${formatNumber(num)}원`
}

// ── 금리 계산 ──
function getBaseRate(
  type: LoanType,
  deposit: number,
  income: number,
  bankRate: number
): number {
  switch (type) {
    case 'general': {
      const bracket = GENERAL_RATES.find(b => deposit <= b.maxDeposit)
      return bracket?.rate ?? 3.5
    }
    case 'youth': {
      const bracket = YOUTH_RATES.find(b => income <= b.maxIncome)
      return bracket?.rate ?? 4.3
    }
    case 'newlywed': {
      const bracket = NEWLYWED_RATES.find(b => deposit <= b.maxDeposit)
      return bracket?.rate ?? 4.3
    }
    case 'bank':
      return bankRate
  }
}

function getDiscounts(
  type: LoanType,
  location: Location,
  smeWorker: boolean,
  children: string
): { label: string; value: number }[] {
  const discounts: { label: string; value: number }[] = []

  if (location === 'local' && type !== 'bank') {
    discounts.push({ label: '지방 우대', value: 0.2 })
  }

  if (type === 'youth' && smeWorker) {
    discounts.push({ label: '중소기업 재직 우대', value: 0.3 })
  }

  if (type === 'newlywed' && children !== '0') {
    const disc = CHILD_DISCOUNT[children] ?? 0
    if (disc > 0) {
      const childLabel = children === '3plus' ? '3명 이상' : `${children}명`
      discounts.push({ label: `자녀 우대 (${childLabel})`, value: disc })
    }
  }

  return discounts
}

// ── 메인 컴포넌트 ──
function JeonseLoanCalculatorContent() {
  const searchParams = useSearchParams()
  const t = useTranslations('jeonseLoanCalc')

  // ── State ──
  const [loanType, setLoanType] = useState<LoanType>(
    (searchParams.get('type') as LoanType) || 'general'
  )
  const [deposit, setDeposit] = useState(searchParams.get('deposit') || '')
  const [loanAmount, setLoanAmount] = useState(searchParams.get('loan') || '')
  const [location, setLocation] = useState<Location>(
    (searchParams.get('location') as Location) || 'capital'
  )
  const [income, setIncome] = useState(searchParams.get('income') || '')
  const [smeWorker, setSmeWorker] = useState(searchParams.get('sme') === 'true')
  const [children, setChildren] = useState(searchParams.get('children') || '0')
  const [bankRate, setBankRate] = useState(searchParams.get('rate') || '4.0')
  const [repayment, setRepayment] = useState<RepaymentType>(
    (searchParams.get('repayment') as RepaymentType) || 'bullet'
  )
  const [period, setPeriod] = useState(parseInt(searchParams.get('period') || '2', 10))
  const [result, setResult] = useState<CalcResult | null>(null)

  // ── URL 동기화 ──
  const updateURL = useCallback((params: Record<string, string>) => {
    const url = new URL(window.location.href)
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.set(key, value)
    })
    window.history.replaceState({}, '', url)
  }, [])

  // ── 계산 ──
  const calculate = useCallback(() => {
    const depositNum = parseNumber(deposit)
    const loanNum = parseNumber(loanAmount)
    const incomeNum = parseNumber(income)
    const bankRateNum = parseFloat(bankRate) || 4.0

    if (!depositNum || !loanNum) {
      setResult(null)
      return
    }

    // 금리 계산
    const base = getBaseRate(loanType, depositNum, incomeNum, bankRateNum)
    const discounts = getDiscounts(loanType, location, smeWorker, children)
    const discountTotal = discounts.reduce((sum, d) => sum + d.value, 0)
    const appliedRate = Math.max(base - discountTotal, 1.0)

    // 한도 계산
    const limits = LOAN_LIMITS[loanType]
    const maxLoanByLTV = Math.floor(depositNum * limits.ltv)
    const maxLoanByType = location === 'capital' ? limits.capital : limits.local
    const effectiveMax = Math.min(maxLoanByLTV, maxLoanByType)
    const effectiveLoan = Math.min(loanNum, effectiveMax)
    const ltvExceeded = loanNum > effectiveMax

    // 상환액 계산
    const monthlyRate = appliedRate / 100 / 12
    const months = period * 12
    let monthlyPayment: number
    let totalInterest: number

    if (repayment === 'bullet') {
      monthlyPayment = Math.round(effectiveLoan * monthlyRate)
      totalInterest = monthlyPayment * months
    } else {
      // 원리금균등상환
      if (monthlyRate === 0) {
        monthlyPayment = Math.round(effectiveLoan / months)
        totalInterest = 0
      } else {
        monthlyPayment = Math.round(
          effectiveLoan * (monthlyRate * Math.pow(1 + monthlyRate, months)) /
          (Math.pow(1 + monthlyRate, months) - 1)
        )
        totalInterest = monthlyPayment * months - effectiveLoan
      }
    }

    // 보증료
    const guaranteeFee = Math.round(effectiveLoan * GUARANTEE_FEE_RATE * period)

    // 자격 체크
    const incomeLimit = INCOME_LIMITS[loanType]
    const depositLimit = DEPOSIT_LIMITS[loanType][location]

    const eligibility = {
      income: incomeNum <= incomeLimit || loanType === 'bank',
      deposit: depositNum <= depositLimit,
      loanLimit: loanNum <= effectiveMax,
    }

    setResult({
      appliedRate,
      baseRate: base,
      discountTotal,
      discounts,
      monthlyPayment,
      totalInterest,
      maxLoanByLTV,
      maxLoanByType,
      effectiveLoan,
      guaranteeFee,
      eligibility,
      ltvExceeded,
    })

    updateURL({
      type: loanType,
      deposit: deposit.replace(/,/g, ''),
      loan: loanAmount.replace(/,/g, ''),
      location,
      income: income.replace(/,/g, ''),
      sme: String(smeWorker),
      children,
      rate: bankRate,
      repayment,
      period: String(period),
    })
  }, [deposit, loanAmount, income, loanType, location, smeWorker, children, bankRate, repayment, period, updateURL])

  // ── 자동 계산 ──
  useEffect(() => {
    if (parseNumber(deposit) && parseNumber(loanAmount)) {
      calculate()
    }
  }, [calculate])

  // ── 초기 URL 파라미터 적용 ──
  useEffect(() => {
    const d = searchParams.get('deposit')
    const l = searchParams.get('loan')
    if (d) setDeposit(formatInputNumber(d))
    if (l) setLoanAmount(formatInputNumber(l))
    const inc = searchParams.get('income')
    if (inc) setIncome(formatInputNumber(inc))
  }, [searchParams])

  const handleNumberInput = (
    value: string,
    setter: (v: string) => void
  ) => {
    setter(formatInputNumber(value))
  }

  const LOAN_TYPE_OPTIONS: { key: LoanType; icon: React.ReactNode; color: string }[] = [
    { key: 'general', icon: <Building2 className="w-5 h-5" />, color: 'blue' },
    { key: 'youth', icon: <GraduationCap className="w-5 h-5" />, color: 'green' },
    { key: 'newlywed', icon: <Heart className="w-5 h-5" />, color: 'pink' },
    { key: 'bank', icon: <Landmark className="w-5 h-5" />, color: 'purple' },
  ]

  return (
    <div className="space-y-8">
      {/* 헤더 */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <Calculator className="w-7 h-7 text-blue-600" />
          {t('title')}
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('description')}</p>
      </div>

      {/* 메인 그리드 */}
      <div className="grid lg:grid-cols-2 gap-8">
        {/* ──────── 입력 패널 ──────── */}
        <div className="space-y-6">
          {/* 대출 유형 선택 */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              {t('loanType.title')}
            </h2>
            <div className="grid grid-cols-2 gap-3">
              {LOAN_TYPE_OPTIONS.map(({ key, icon }) => (
                <button
                  key={key}
                  onClick={() => setLoanType(key)}
                  className={`p-4 rounded-xl border-2 transition-all text-left ${
                    loanType === key
                      ? 'ring-2 ring-blue-500 border-blue-500 bg-blue-50 dark:bg-blue-950'
                      : 'border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className={loanType === key ? 'text-blue-600' : 'text-gray-500 dark:text-gray-400'}>
                      {icon}
                    </span>
                    <span className="font-semibold text-gray-900 dark:text-white text-sm">
                      {t(`loanType.${key}.label`)}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {t(`loanType.${key}.sub`)}
                  </p>
                  <p className="text-xs text-blue-600 dark:text-blue-400 mt-1 font-medium">
                    {t(`loanType.${key}.rate`)}
                  </p>
                </button>
              ))}
            </div>
          </div>

          {/* 기본 정보 */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 space-y-4">
            {/* 전세보증금 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('input.deposit')}
              </label>
              <div className="relative">
                <input
                  type="text"
                  inputMode="numeric"
                  value={deposit}
                  onChange={(e) => handleNumberInput(e.target.value, setDeposit)}
                  placeholder={t('input.depositPlaceholder')}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 pr-10"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">
                  {t('unit.won')}
                </span>
              </div>
              {deposit && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  = {formatCurrency(parseNumber(deposit))}
                </p>
              )}
            </div>

            {/* 희망 대출금액 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('input.loanAmount')}
              </label>
              <div className="relative">
                <input
                  type="text"
                  inputMode="numeric"
                  value={loanAmount}
                  onChange={(e) => handleNumberInput(e.target.value, setLoanAmount)}
                  placeholder={t('input.loanAmountPlaceholder')}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 pr-10"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">
                  {t('unit.won')}
                </span>
              </div>
              {loanAmount && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  = {formatCurrency(parseNumber(loanAmount))}
                </p>
              )}
            </div>

            {/* 소재지 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('input.location')}
              </label>
              <div className="grid grid-cols-2 gap-2">
                {(['capital', 'local'] as const).map((loc) => (
                  <button
                    key={loc}
                    onClick={() => setLocation(loc)}
                    className={`py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
                      location === loc
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                  >
                    {t(`input.location${loc === 'capital' ? 'Capital' : 'Local'}`)}
                  </button>
                ))}
              </div>
            </div>

            {/* 연소득 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('input.income')}
              </label>
              <div className="relative">
                <input
                  type="text"
                  inputMode="numeric"
                  value={income}
                  onChange={(e) => handleNumberInput(e.target.value, setIncome)}
                  placeholder={t('input.incomePlaceholder')}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 pr-10"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">
                  {t('unit.won')}
                </span>
              </div>
              {income && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  = {formatCurrency(parseNumber(income))}
                </p>
              )}
            </div>

            {/* 유형별 추가 입력 */}
            {loanType === 'youth' && (
              <div className="flex items-center gap-3 p-3 bg-green-50 dark:bg-green-950 rounded-lg">
                <input
                  type="checkbox"
                  id="smeWorker"
                  checked={smeWorker}
                  onChange={(e) => setSmeWorker(e.target.checked)}
                  className="w-4 h-4 accent-blue-600"
                />
                <label htmlFor="smeWorker" className="text-sm text-gray-700 dark:text-gray-300">
                  {t('input.smeWorker')}
                </label>
              </div>
            )}

            {loanType === 'newlywed' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('input.children')}
                </label>
                <select
                  value={children}
                  onChange={(e) => setChildren(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                >
                  <option value="0">{t('input.children0')}</option>
                  <option value="1">{t('input.children1')}</option>
                  <option value="2">{t('input.children2')}</option>
                  <option value="3plus">{t('input.children3plus')}</option>
                </select>
              </div>
            )}

            {loanType === 'bank' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('input.bankRate')}
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.1"
                    min="1.0"
                    max="10.0"
                    value={bankRate}
                    onChange={(e) => setBankRate(e.target.value)}
                    placeholder={t('input.bankRatePlaceholder')}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 pr-10"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">
                    {t('unit.percent')}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* 상환 방식 */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 space-y-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              {t('repayment.title')}
            </h2>

            <div className="grid grid-cols-2 gap-2">
              {(['bullet', 'equalPrincipalInterest'] as const).map((rType) => (
                <button
                  key={rType}
                  onClick={() => setRepayment(rType)}
                  className={`py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                    repayment === rType
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  {t(`repayment.${rType}`)}
                </button>
              ))}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('repayment.period')}
              </label>
              <div className="flex flex-wrap gap-2">
                {LOAN_PERIODS.map((p) => (
                  <button
                    key={p}
                    onClick={() => setPeriod(p)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      period === p
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                  >
                    {p}{t('repayment.years')}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ──────── 결과 패널 ──────── */}
        <div className="space-y-6">
          {result ? (
            <>
              {/* 적용 금리 */}
              <div className="bg-blue-50 dark:bg-blue-950 rounded-xl p-6">
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                  {t('result.appliedRate')}
                </h3>
                <p className="text-4xl font-bold text-blue-600 dark:text-blue-400">
                  {result.appliedRate.toFixed(2)}<span className="text-lg ml-1">%</span>
                </p>
                <div className="mt-2 text-xs text-gray-500 dark:text-gray-400 space-y-1">
                  <p>{t('result.baseRate')}: {result.baseRate.toFixed(2)}%</p>
                  {result.discounts.length > 0 && (
                    <div>
                      {result.discounts.map((d, i) => (
                        <p key={i} className="text-green-600 dark:text-green-400">
                          {t('result.discount')}: {d.label} -{d.value.toFixed(1)}%p
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* 월 상환액 */}
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                  {repayment === 'bullet' ? t('result.monthlyInterest') : t('result.monthlyPayment')}
                </h3>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">
                  {formatNumber(result.monthlyPayment)}<span className="text-base ml-1 text-gray-500">{t('unit.won')}</span>
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  = {formatCurrency(result.monthlyPayment)} / {t('unit.month')}
                </p>
              </div>

              {/* 대출 한도 */}
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 space-y-3">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {t('result.loanLimit')}
                </h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500 dark:text-gray-400">{t('result.maxLoanByLTV')}</span>
                    <span className="font-medium text-gray-900 dark:text-white">{formatCurrency(result.maxLoanByLTV)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500 dark:text-gray-400">{t('result.maxLoanByType')}</span>
                    <span className="font-medium text-gray-900 dark:text-white">{formatCurrency(result.maxLoanByType)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500 dark:text-gray-400">{t('result.ltvRatio')}</span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {(LOAN_LIMITS[loanType].ltv * 100).toFixed(0)}%
                    </span>
                  </div>
                </div>

                {result.ltvExceeded && (
                  <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-950 rounded-lg mt-3">
                    <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-amber-700 dark:text-amber-300">
                      {t('result.ltvWarning')}
                    </p>
                  </div>
                )}
              </div>

              {/* 총 이자 + 보증료 */}
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-500 dark:text-gray-400">{t('result.totalInterest')}</span>
                  <span className="text-lg font-bold text-gray-900 dark:text-white">
                    {formatCurrency(result.totalInterest)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <div>
                    <span className="text-sm text-gray-500 dark:text-gray-400">{t('result.guaranteeFee')}</span>
                    <p className="text-xs text-gray-400 dark:text-gray-500">{t('result.guaranteeFeeDesc')}</p>
                  </div>
                  <span className="text-lg font-bold text-gray-900 dark:text-white">
                    {formatCurrency(result.guaranteeFee)}
                  </span>
                </div>
              </div>

              {/* 자격 요건 체크 */}
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  {t('result.eligibility')}
                </h3>
                <div className="space-y-3">
                  {/* 소득 */}
                  <div className="flex items-center gap-3">
                    {result.eligibility.income ? (
                      <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                    ) : (
                      <XCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
                    )}
                    <span className={`text-sm ${result.eligibility.income ? 'text-green-600' : 'text-red-500'}`}>
                      {t('result.incomeCheck')}{' '}
                      {loanType !== 'bank' && (
                        <span className="text-gray-400">
                          ({formatCurrency(INCOME_LIMITS[loanType])} {t('result.eligible')})
                        </span>
                      )}
                    </span>
                  </div>
                  {/* 보증금 */}
                  <div className="flex items-center gap-3">
                    {result.eligibility.deposit ? (
                      <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                    ) : (
                      <XCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
                    )}
                    <span className={`text-sm ${result.eligibility.deposit ? 'text-green-600' : 'text-red-500'}`}>
                      {t('result.depositCheck')}{' '}
                      {loanType !== 'bank' && (
                        <span className="text-gray-400">
                          ({formatCurrency(DEPOSIT_LIMITS[loanType][location])} {t('result.eligible')})
                        </span>
                      )}
                    </span>
                  </div>
                  {/* 대출 한도 */}
                  <div className="flex items-center gap-3">
                    {result.eligibility.loanLimit ? (
                      <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                    ) : (
                      <XCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
                    )}
                    <span className={`text-sm ${result.eligibility.loanLimit ? 'text-green-600' : 'text-red-500'}`}>
                      {t('result.loanLimitCheck')}
                    </span>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-12 text-center">
              <Calculator className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
              <p className="text-gray-500 dark:text-gray-400">{t('result.noResult')}</p>
              <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">{t('result.calculate')}</p>
            </div>
          )}

          {/* 면책 문구 */}
          <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-xl">
            <p className="text-xs text-gray-400 dark:text-gray-500 leading-relaxed">
              {t('disclaimer')}
            </p>
          </div>
        </div>
      </div>

      {/* 가이드 */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-blue-600" />
          {t('guide.title')}
        </h2>
        <div className="grid md:grid-cols-3 gap-6">
          {(['overview', 'rates', 'tips'] as const).map((section) => (
            <div key={section}>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-3">
                {t(`guide.${section}.title`)}
              </h3>
              <ul className="space-y-2">
                {(t.raw(`guide.${section}.items`) as string[]).map((item, i) => (
                  <li key={i} className="text-sm text-gray-600 dark:text-gray-400 flex items-start gap-2">
                    <span className="text-blue-500 mt-0.5">{'•'}</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default function JeonseLoanCalculator() {
  return (
    <Suspense fallback={<div className="text-center py-12 text-gray-500">Loading...</div>}>
      <JeonseLoanCalculatorContent />
    </Suspense>
  )
}
