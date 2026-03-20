'use client'

/**
 * DSR (총부채원리금상환비율) 계산기
 *
 * 번역 네임스페이스: dsrCalc
 *
 * === 번역 키 목록 ===
 *
 * dsrCalc.title
 * dsrCalc.description
 *
 * -- 소득 --
 * dsrCalc.income.title
 * dsrCalc.income.annual
 * dsrCalc.income.placeholder
 * dsrCalc.income.unit
 *
 * -- 신규 대출 --
 * dsrCalc.newLoan.title
 * dsrCalc.newLoan.type
 * dsrCalc.newLoan.types.mortgage
 * dsrCalc.newLoan.types.credit
 * dsrCalc.newLoan.types.carInstallment
 * dsrCalc.newLoan.amount
 * dsrCalc.newLoan.amountPlaceholder
 * dsrCalc.newLoan.rate
 * dsrCalc.newLoan.ratePlaceholder
 * dsrCalc.newLoan.term
 * dsrCalc.newLoan.termUnit
 * dsrCalc.newLoan.repayment
 * dsrCalc.newLoan.repayment.equalPayment
 * dsrCalc.newLoan.repayment.equalPrincipal
 * dsrCalc.newLoan.repayment.bullet
 * dsrCalc.newLoan.rateType
 * dsrCalc.newLoan.rateTypes.variable
 * dsrCalc.newLoan.rateTypes.mixed
 * dsrCalc.newLoan.rateTypes.periodic
 * dsrCalc.newLoan.rateTypes.fixed
 * dsrCalc.newLoan.location
 * dsrCalc.newLoan.locations.capital
 * dsrCalc.newLoan.locations.nonCapital
 *
 * -- 기존 대출 --
 * dsrCalc.existing.title
 * dsrCalc.existing.add
 * dsrCalc.existing.remove
 * dsrCalc.existing.loanLabel
 * dsrCalc.existing.types.mortgage
 * dsrCalc.existing.types.credit
 * dsrCalc.existing.types.revolving
 * dsrCalc.existing.types.cardLoan
 * dsrCalc.existing.types.carInstallment
 * dsrCalc.existing.balance
 * dsrCalc.existing.balancePlaceholder
 * dsrCalc.existing.rate
 * dsrCalc.existing.ratePlaceholder
 * dsrCalc.existing.remainingTerm
 * dsrCalc.existing.termUnit
 * dsrCalc.existing.repayment
 * dsrCalc.existing.forcedTerm
 *
 * -- 결과 --
 * dsrCalc.result.title
 * dsrCalc.result.currentDsr
 * dsrCalc.result.safe
 * dsrCalc.result.caution
 * dsrCalc.result.danger
 * dsrCalc.result.safeDesc
 * dsrCalc.result.cautionDesc
 * dsrCalc.result.dangerDesc
 * dsrCalc.result.annualRepayment
 * dsrCalc.result.annualRepaymentTitle
 * dsrCalc.result.newLoanLabel
 * dsrCalc.result.existingLoanLabel
 * dsrCalc.result.totalAnnual
 * dsrCalc.result.annualIncome
 *
 * -- 대출한도 역산 --
 * dsrCalc.limit.title
 * dsrCalc.limit.maxAdditional
 * dsrCalc.limit.basedOn
 * dsrCalc.limit.availableAnnual
 * dsrCalc.limit.noRoom
 *
 * -- 스트레스 DSR --
 * dsrCalc.stress.title
 * dsrCalc.stress.description
 * dsrCalc.stress.appliedRate
 * dsrCalc.stress.additionalRate
 * dsrCalc.stress.resultDsr
 * dsrCalc.stress.resultLimit
 * dsrCalc.stress.nonCapitalNote
 *
 * -- 계산 버튼 --
 * dsrCalc.calculate
 * dsrCalc.reset
 *
 * -- 면책 --
 * dsrCalc.disclaimer.title
 * dsrCalc.disclaimer.text
 *
 * -- 가이드 --
 * dsrCalc.guide.title
 * dsrCalc.guide.whatIsDsr.title
 * dsrCalc.guide.whatIsDsr.items  (string[])
 * dsrCalc.guide.stressDsr.title
 * dsrCalc.guide.stressDsr.items  (string[])
 * dsrCalc.guide.tips.title
 * dsrCalc.guide.tips.items  (string[])
 */

import { useState, useCallback, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { useSearchParams } from 'next/navigation'
import {
  Calculator,
  Plus,
  X,
  AlertTriangle,
  BookOpen,
  TrendingUp,
  Shield,
} from 'lucide-react'

// ── 타입 정의 ──

type NewLoanType = 'mortgage' | 'credit' | 'carInstallment'
type ExistingLoanType = 'mortgage' | 'credit' | 'revolving' | 'cardLoan' | 'carInstallment'
type RepaymentMethod = 'equalPayment' | 'equalPrincipal' | 'bullet'
type RateType = 'variable' | 'mixed' | 'periodic' | 'fixed'
type Location = 'capital' | 'nonCapital'

interface ExistingLoan {
  id: number
  type: ExistingLoanType
  balance: string
  rate: string
  remainingTerm: string
  repayment: RepaymentMethod
}

interface LoanAnnualRepayment {
  label: string
  annual: number
}

interface DsrResult {
  dsr: number
  newLoanAnnual: number
  existingLoansAnnual: LoanAnnualRepayment[]
  totalAnnual: number
  maxAdditionalLoan: number
  stressDsr: number
  stressRate: number
  stressAdditional: number
  stressMaxLoan: number
}

// ── 스트레스 DSR 가산금리 (2025년 3단계) ──

const STRESS_RATE: Record<RateType, number> = {
  variable: 1.50,
  mixed: 1.20,
  periodic: 0.60,
  fixed: 0,
}

const NON_CAPITAL_MORTGAGE_DISCOUNT = 0.75

const DSR_THRESHOLD = 40

// ── 계산 유틸 ──

function calcEqualPaymentMonthly(principal: number, annualRate: number, months: number): number {
  if (principal <= 0 || months <= 0) return 0
  if (annualRate <= 0) return principal / months
  const r = annualRate / 100 / 12
  return principal * r * Math.pow(1 + r, months) / (Math.pow(1 + r, months) - 1)
}

function calcEqualPrincipalFirstMonthly(principal: number, annualRate: number, months: number): number {
  if (principal <= 0 || months <= 0) return 0
  const monthlyPrincipal = principal / months
  const firstInterest = principal * (annualRate / 100 / 12)
  return monthlyPrincipal + firstInterest
}

function calcAnnualRepayment(
  principal: number,
  annualRate: number,
  termYears: number,
  repayment: RepaymentMethod,
  loanType: ExistingLoanType | NewLoanType
): number {
  if (principal <= 0) return 0

  // DSR 산입 기준에 따른 기간/방식 결정
  let effectiveTermMonths: number
  let effectiveRepayment: RepaymentMethod = repayment

  switch (loanType) {
    case 'credit':
      effectiveTermMonths = 5 * 12 // 신용대출: 5년 원리금균등 환산
      effectiveRepayment = 'equalPayment'
      break
    case 'revolving':
      effectiveTermMonths = 5 * 12 // 마이너스통장: 5년 원리금균등
      effectiveRepayment = 'equalPayment'
      break
    case 'cardLoan':
      effectiveTermMonths = 3 * 12 // 카드론: 3년 원리금균등
      effectiveRepayment = 'equalPayment'
      break
    default:
      effectiveTermMonths = termYears * 12
      break
  }

  if (effectiveTermMonths <= 0) return 0

  let monthly: number

  switch (effectiveRepayment) {
    case 'equalPayment':
      monthly = calcEqualPaymentMonthly(principal, annualRate, effectiveTermMonths)
      break
    case 'equalPrincipal':
      monthly = calcEqualPrincipalFirstMonthly(principal, annualRate, effectiveTermMonths)
      break
    case 'bullet':
      // 만기일시: 원리금균등 환산
      if (loanType === 'mortgage') {
        monthly = calcEqualPaymentMonthly(principal, annualRate, effectiveTermMonths)
      } else {
        monthly = calcEqualPaymentMonthly(principal, annualRate, 5 * 12)
      }
      break
    default:
      monthly = calcEqualPaymentMonthly(principal, annualRate, effectiveTermMonths)
  }

  return monthly * 12
}

function calcMaxLoan(
  availableAnnual: number,
  annualRate: number,
  termYears: number
): number {
  if (availableAnnual <= 0 || termYears <= 0) return 0
  const monthlyAvailable = availableAnnual / 12
  if (annualRate <= 0) return monthlyAvailable * termYears * 12
  const r = annualRate / 100 / 12
  const n = termYears * 12
  return monthlyAvailable * (Math.pow(1 + r, n) - 1) / (r * Math.pow(1 + r, n))
}

// ── 포맷 ──

function formatNumber(value: string): string {
  const num = value.replace(/[^0-9]/g, '')
  if (!num) return ''
  return parseInt(num, 10).toLocaleString('ko-KR')
}

function parseNumber(value: string): number {
  return parseInt(value.replace(/[^0-9]/g, ''), 10) || 0
}

function formatCurrency(num: number): string {
  if (num >= 100_000_000) {
    const eok = Math.floor(num / 100_000_000)
    const remainder = num % 100_000_000
    if (remainder >= 10_000) {
      return `${eok}억 ${Math.floor(remainder / 10_000).toLocaleString()}만원`
    }
    return `${eok}억원`
  }
  if (num >= 10_000) return `${Math.floor(num / 10_000).toLocaleString()}만원`
  return `${num.toLocaleString()}원`
}

// ── 컴포넌트 ──

let nextLoanId = 1

export default function DsrCalculator() {
  const t = useTranslations('dsrCalc')
  const searchParams = useSearchParams()

  // 소득
  const [annualIncome, setAnnualIncome] = useState('')

  // 신규 대출
  const [newLoanType, setNewLoanType] = useState<NewLoanType>('mortgage')
  const [newLoanAmount, setNewLoanAmount] = useState('')
  const [newLoanRate, setNewLoanRate] = useState('4.0')
  const [newLoanTerm, setNewLoanTerm] = useState('30')
  const [newLoanRepayment, setNewLoanRepayment] = useState<RepaymentMethod>('equalPayment')
  const [rateType, setRateType] = useState<RateType>('variable')
  const [location, setLocation] = useState<Location>('capital')

  // 기존 대출
  const [existingLoans, setExistingLoans] = useState<ExistingLoan[]>([])

  // 결과
  const [result, setResult] = useState<DsrResult | null>(null)

  // URL 파라미터 동기화 (읽기)
  useEffect(() => {
    const income = searchParams.get('income')
    const amount = searchParams.get('amount')
    const rate = searchParams.get('rate')
    const term = searchParams.get('term')
    const ltype = searchParams.get('ltype')
    const repay = searchParams.get('repay')
    const rt = searchParams.get('rt')
    const loc = searchParams.get('loc')

    if (income) setAnnualIncome(formatNumber(income))
    if (amount) setNewLoanAmount(formatNumber(amount))
    if (rate) setNewLoanRate(rate)
    if (term) setNewLoanTerm(term)
    if (ltype && ['mortgage', 'credit', 'carInstallment'].includes(ltype)) {
      setNewLoanType(ltype as NewLoanType)
    }
    if (repay && ['equalPayment', 'equalPrincipal', 'bullet'].includes(repay)) {
      setNewLoanRepayment(repay as RepaymentMethod)
    }
    if (rt && ['variable', 'mixed', 'periodic', 'fixed'].includes(rt)) {
      setRateType(rt as RateType)
    }
    if (loc && ['capital', 'nonCapital'].includes(loc)) {
      setLocation(loc as Location)
    }
  }, [searchParams])

  // URL 파라미터 동기화 (쓰기)
  const updateURL = useCallback(() => {
    const url = new URL(window.location.href)
    url.searchParams.set('income', annualIncome.replace(/,/g, ''))
    url.searchParams.set('amount', newLoanAmount.replace(/,/g, ''))
    url.searchParams.set('rate', newLoanRate)
    url.searchParams.set('term', newLoanTerm)
    url.searchParams.set('ltype', newLoanType)
    url.searchParams.set('repay', newLoanRepayment)
    url.searchParams.set('rt', rateType)
    url.searchParams.set('loc', location)
    window.history.replaceState({}, '', url)
  }, [annualIncome, newLoanAmount, newLoanRate, newLoanTerm, newLoanType, newLoanRepayment, rateType, location])

  // 기존 대출 추가
  const addExistingLoan = useCallback(() => {
    setExistingLoans(prev => [
      ...prev,
      {
        id: nextLoanId++,
        type: 'credit',
        balance: '',
        rate: '5.0',
        remainingTerm: '5',
        repayment: 'equalPayment',
      },
    ])
  }, [])

  // 기존 대출 삭제
  const removeExistingLoan = useCallback((id: number) => {
    setExistingLoans(prev => prev.filter(loan => loan.id !== id))
  }, [])

  // 기존 대출 수정
  const updateExistingLoan = useCallback((id: number, field: keyof ExistingLoan, value: string) => {
    setExistingLoans(prev =>
      prev.map(loan => {
        if (loan.id !== id) return loan
        const updated = { ...loan, [field]: value }
        // 신용대출, 카드론은 기간 강제
        if (field === 'type') {
          if (value === 'credit' || value === 'revolving') {
            updated.remainingTerm = '5'
            updated.repayment = 'equalPayment'
          } else if (value === 'cardLoan') {
            updated.remainingTerm = '3'
            updated.repayment = 'equalPayment'
          }
        }
        return updated
      })
    )
  }, [])

  // 스트레스 가산금리 계산
  const getStressAdditionalRate = useCallback((): number => {
    let additional = STRESS_RATE[rateType]
    // 비수도권 주담대: 한시 할인
    if (location === 'nonCapital' && newLoanType === 'mortgage') {
      additional = Math.max(0, additional - NON_CAPITAL_MORTGAGE_DISCOUNT)
    }
    return additional
  }, [rateType, location, newLoanType])

  // DSR 계산
  const calculate = useCallback(() => {
    const income = parseNumber(annualIncome)
    const loanAmount = parseNumber(newLoanAmount)
    const rate = parseFloat(newLoanRate) || 0
    const term = parseInt(newLoanTerm) || 0

    if (income <= 0 || loanAmount <= 0) return

    // 신규 대출 연간 원리금
    const newLoanAnnual = calcAnnualRepayment(loanAmount, rate, term, newLoanRepayment, newLoanType)

    // 기존 대출 연간 원리금
    const existingLoansAnnual: LoanAnnualRepayment[] = existingLoans.map((loan, idx) => {
      const balance = parseNumber(loan.balance)
      const loanRate = parseFloat(loan.rate) || 0
      const remainingTerm = parseInt(loan.remainingTerm) || 1
      const annual = calcAnnualRepayment(balance, loanRate, remainingTerm, loan.repayment, loan.type)

      const typeLabels: Record<ExistingLoanType, string> = {
        mortgage: t('existing.types.mortgage'),
        credit: t('existing.types.credit'),
        revolving: t('existing.types.revolving'),
        cardLoan: t('existing.types.cardLoan'),
        carInstallment: t('existing.types.carInstallment'),
      }

      return {
        label: `${typeLabels[loan.type]} ${idx + 1}`,
        annual,
      }
    })

    const existingTotal = existingLoansAnnual.reduce((sum, l) => sum + l.annual, 0)
    const totalAnnual = newLoanAnnual + existingTotal

    // 기본 DSR
    const dsr = (totalAnnual / income) * 100

    // 스트레스 DSR
    const stressAdditional = getStressAdditionalRate()
    const stressRate = rate + stressAdditional
    const stressNewLoanAnnual = calcAnnualRepayment(loanAmount, stressRate, term, newLoanRepayment, newLoanType)
    const stressTotalAnnual = stressNewLoanAnnual + existingTotal
    const stressDsr = (stressTotalAnnual / income) * 100

    // 대출한도 역산 (DSR 40% 기준, 스트레스 가산 후 금리 적용)
    const availableAnnual = income * (DSR_THRESHOLD / 100) - existingTotal
    const maxAdditionalLoan = calcMaxLoan(availableAnnual, stressRate, term)

    // 스트레스 기준 한도
    const stressMaxLoan = calcMaxLoan(availableAnnual, stressRate, term)

    setResult({
      dsr,
      newLoanAnnual,
      existingLoansAnnual,
      totalAnnual,
      maxAdditionalLoan: Math.max(0, maxAdditionalLoan),
      stressDsr,
      stressRate,
      stressAdditional,
      stressMaxLoan: Math.max(0, stressMaxLoan),
    })

    updateURL()
  }, [annualIncome, newLoanAmount, newLoanRate, newLoanTerm, newLoanRepayment, newLoanType, existingLoans, getStressAdditionalRate, updateURL, t])

  // 초기화
  const handleReset = useCallback(() => {
    setAnnualIncome('')
    setNewLoanAmount('')
    setNewLoanRate('4.0')
    setNewLoanTerm('30')
    setNewLoanType('mortgage')
    setNewLoanRepayment('equalPayment')
    setRateType('variable')
    setLocation('capital')
    setExistingLoans([])
    setResult(null)
    const url = new URL(window.location.href)
    url.search = ''
    window.history.replaceState({}, '', url)
  }, [])

  // 기간 강제 여부
  const isTermForced = (type: ExistingLoanType): boolean => {
    return type === 'credit' || type === 'revolving' || type === 'cardLoan'
  }

  const getForcedTermLabel = (type: ExistingLoanType): string => {
    if (type === 'credit' || type === 'revolving') return `5${t('existing.termUnit')} (${t('existing.forcedTerm')})`
    if (type === 'cardLoan') return `3${t('existing.termUnit')} (${t('existing.forcedTerm')})`
    return ''
  }

  // DSR 색상
  const getDsrColor = (dsr: number): string => {
    if (dsr <= 40) return 'bg-green-500'
    if (dsr <= 50) return 'bg-yellow-500'
    return 'bg-red-500'
  }

  const getDsrTextColor = (dsr: number): string => {
    if (dsr <= 40) return 'text-green-600 dark:text-green-400'
    if (dsr <= 50) return 'text-yellow-600 dark:text-yellow-400'
    return 'text-red-600 dark:text-red-400'
  }

  const getDsrLabel = (dsr: number): string => {
    if (dsr <= 40) return t('result.safe')
    if (dsr <= 50) return t('result.caution')
    return t('result.danger')
  }

  const getDsrDesc = (dsr: number): string => {
    if (dsr <= 40) return t('result.safeDesc')
    if (dsr <= 50) return t('result.cautionDesc')
    return t('result.dangerDesc')
  }

  // ── 입력 핸들러 (숫자 쉼표 포맷) ──

  const handleIncomeChange = (value: string) => setAnnualIncome(formatNumber(value))
  const handleAmountChange = (value: string) => setNewLoanAmount(formatNumber(value))

  // ── 셀렉트 옵션 ──

  const newLoanTypeOptions: { value: NewLoanType; label: string }[] = [
    { value: 'mortgage', label: t('newLoan.types.mortgage') },
    { value: 'credit', label: t('newLoan.types.credit') },
    { value: 'carInstallment', label: t('newLoan.types.carInstallment') },
  ]

  const existingLoanTypeOptions: { value: ExistingLoanType; label: string }[] = [
    { value: 'mortgage', label: t('existing.types.mortgage') },
    { value: 'credit', label: t('existing.types.credit') },
    { value: 'revolving', label: t('existing.types.revolving') },
    { value: 'cardLoan', label: t('existing.types.cardLoan') },
    { value: 'carInstallment', label: t('existing.types.carInstallment') },
  ]

  const repaymentOptions: { value: RepaymentMethod; label: string }[] = [
    { value: 'equalPayment', label: t('newLoan.repayment.equalPayment') },
    { value: 'equalPrincipal', label: t('newLoan.repayment.equalPrincipal') },
    { value: 'bullet', label: t('newLoan.repayment.bullet') },
  ]

  const rateTypeOptions: { value: RateType; label: string }[] = [
    { value: 'variable', label: t('newLoan.rateTypes.variable') },
    { value: 'mixed', label: t('newLoan.rateTypes.mixed') },
    { value: 'periodic', label: t('newLoan.rateTypes.periodic') },
    { value: 'fixed', label: t('newLoan.rateTypes.fixed') },
  ]

  const locationOptions: { value: Location; label: string }[] = [
    { value: 'capital', label: t('newLoan.locations.capital') },
    { value: 'nonCapital', label: t('newLoan.locations.nonCapital') },
  ]

  const inputClass = 'w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm'
  const selectClass = 'w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm'
  const labelClass = 'block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'

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
      <div className="grid lg:grid-cols-5 gap-6">
        {/* ── 왼쪽: 입력 (2/5) ── */}
        <div className="lg:col-span-2 space-y-6">

          {/* 소득 정보 */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              {t('income.title')}
            </h2>
            <div>
              <label className={labelClass}>{t('income.annual')}</label>
              <div className="relative">
                <input
                  type="text"
                  inputMode="numeric"
                  className={inputClass}
                  placeholder={t('income.placeholder')}
                  value={annualIncome}
                  onChange={e => handleIncomeChange(e.target.value)}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">{t('income.unit')}</span>
              </div>
            </div>
          </div>

          {/* 신규 대출 정보 */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              {t('newLoan.title')}
            </h2>
            <div className="space-y-4">
              {/* 대출 유형 */}
              <div>
                <label className={labelClass}>{t('newLoan.type')}</label>
                <select className={selectClass} value={newLoanType} onChange={e => setNewLoanType(e.target.value as NewLoanType)}>
                  {newLoanTypeOptions.map(o => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>

              {/* 대출 금액 */}
              <div>
                <label className={labelClass}>{t('newLoan.amount')}</label>
                <div className="relative">
                  <input
                    type="text"
                    inputMode="numeric"
                    className={inputClass}
                    placeholder={t('newLoan.amountPlaceholder')}
                    value={newLoanAmount}
                    onChange={e => handleAmountChange(e.target.value)}
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">{t('income.unit')}</span>
                </div>
              </div>

              {/* 금리 */}
              <div>
                <label className={labelClass}>{t('newLoan.rate')}</label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="30"
                    className={inputClass}
                    placeholder={t('newLoan.ratePlaceholder')}
                    value={newLoanRate}
                    onChange={e => setNewLoanRate(e.target.value)}
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">%</span>
                </div>
              </div>

              {/* 대출 기간 */}
              <div>
                <label className={labelClass}>{t('newLoan.term')}</label>
                <div className="relative">
                  <select className={selectClass} value={newLoanTerm} onChange={e => setNewLoanTerm(e.target.value)}>
                    {[1, 3, 5, 7, 10, 15, 20, 25, 30, 35, 40].map(y => (
                      <option key={y} value={String(y)}>{y}{t('newLoan.termUnit')}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* 상환 방식 */}
              <div>
                <label className={labelClass}>{t('newLoan.repayment')}</label>
                <select className={selectClass} value={newLoanRepayment} onChange={e => setNewLoanRepayment(e.target.value as RepaymentMethod)}>
                  {repaymentOptions.map(o => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>

              {/* 금리 유형 (스트레스 DSR용) */}
              <div>
                <label className={labelClass}>{t('newLoan.rateType')}</label>
                <div className="grid grid-cols-2 gap-2">
                  {rateTypeOptions.map(o => (
                    <button
                      key={o.value}
                      type="button"
                      onClick={() => setRateType(o.value)}
                      className={`px-3 py-2 text-sm rounded-lg border transition-colors ${
                        rateType === o.value
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600'
                      }`}
                    >
                      {o.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* 소재지 (스트레스 DSR용) */}
              <div>
                <label className={labelClass}>{t('newLoan.location')}</label>
                <div className="grid grid-cols-2 gap-2">
                  {locationOptions.map(o => (
                    <button
                      key={o.value}
                      type="button"
                      onClick={() => setLocation(o.value)}
                      className={`px-3 py-2 text-sm rounded-lg border transition-colors ${
                        location === o.value
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600'
                      }`}
                    >
                      {o.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* 기존 대출 */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                {t('existing.title')}
              </h2>
              <button
                type="button"
                onClick={addExistingLoan}
                className="flex items-center gap-1 px-3 py-1.5 text-sm bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors"
              >
                <Plus className="w-4 h-4" />
                {t('existing.add')}
              </button>
            </div>

            {existingLoans.length === 0 && (
              <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-4">
                {t('existing.add')}
              </p>
            )}

            <div className="space-y-4">
              {existingLoans.map((loan, idx) => (
                <div key={loan.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 relative">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      {t('existing.loanLabel')} {idx + 1}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeExistingLoan(loan.id)}
                      className="text-red-400 hover:text-red-600 transition-colors"
                      aria-label={t('existing.remove')}
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {/* 유형 */}
                    <div className="col-span-2">
                      <label className={labelClass}>{t('newLoan.type')}</label>
                      <select
                        className={selectClass}
                        value={loan.type}
                        onChange={e => updateExistingLoan(loan.id, 'type', e.target.value)}
                      >
                        {existingLoanTypeOptions.map(o => (
                          <option key={o.value} value={o.value}>{o.label}</option>
                        ))}
                      </select>
                    </div>
                    {/* 잔액 */}
                    <div className="col-span-2">
                      <label className={labelClass}>{t('existing.balance')}</label>
                      <input
                        type="text"
                        inputMode="numeric"
                        className={inputClass}
                        placeholder={t('existing.balancePlaceholder')}
                        value={loan.balance}
                        onChange={e => updateExistingLoan(loan.id, 'balance', formatNumber(e.target.value))}
                      />
                    </div>
                    {/* 금리 */}
                    <div>
                      <label className={labelClass}>{t('existing.rate')}</label>
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        max="30"
                        className={inputClass}
                        placeholder={t('existing.ratePlaceholder')}
                        value={loan.rate}
                        onChange={e => updateExistingLoan(loan.id, 'rate', e.target.value)}
                      />
                    </div>
                    {/* 잔여 기간 */}
                    <div>
                      <label className={labelClass}>{t('existing.remainingTerm')}</label>
                      {isTermForced(loan.type) ? (
                        <div className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-600 rounded-lg">
                          {getForcedTermLabel(loan.type)}
                        </div>
                      ) : (
                        <div className="relative">
                          <input
                            type="number"
                            min="1"
                            max="50"
                            className={inputClass}
                            value={loan.remainingTerm}
                            onChange={e => updateExistingLoan(loan.id, 'remainingTerm', e.target.value)}
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">{t('existing.termUnit')}</span>
                        </div>
                      )}
                    </div>
                    {/* 상환 방식 (강제가 아닌 경우만) */}
                    {!isTermForced(loan.type) && (
                      <div className="col-span-2">
                        <label className={labelClass}>{t('existing.repayment')}</label>
                        <select
                          className={selectClass}
                          value={loan.repayment}
                          onChange={e => updateExistingLoan(loan.id, 'repayment', e.target.value as RepaymentMethod)}
                        >
                          {repaymentOptions.map(o => (
                            <option key={o.value} value={o.value}>{o.label}</option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 계산/초기화 버튼 */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={calculate}
              className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg px-4 py-3 font-medium hover:from-blue-700 hover:to-indigo-700 transition-all flex items-center justify-center gap-2"
            >
              <Calculator className="w-5 h-5" />
              {t('calculate')}
            </button>
            <button
              type="button"
              onClick={handleReset}
              className="px-4 py-3 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg font-medium transition-colors"
            >
              {t('reset')}
            </button>
          </div>
        </div>

        {/* ── 오른쪽: 결과 (3/5) ── */}
        <div className="lg:col-span-3 space-y-6">
          {result ? (
            <>
              {/* DSR 게이지 */}
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  {t('result.title')}
                </h2>

                <div className="text-center mb-6">
                  <div className={`text-4xl font-bold ${getDsrTextColor(result.dsr)}`}>
                    {result.dsr.toFixed(1)}%
                  </div>
                  <div className={`text-sm font-medium mt-1 ${getDsrTextColor(result.dsr)}`}>
                    {getDsrLabel(result.dsr)}
                  </div>
                </div>

                {/* 게이지 바 */}
                <div className="relative mb-2">
                  <div className="w-full h-6 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ease-out ${getDsrColor(result.dsr)}`}
                      style={{ width: `${Math.min(100, result.dsr)}%` }}
                    />
                  </div>
                  {/* 40% / 50% 마커 */}
                  <div className="absolute top-0 left-[40%] h-6 w-px bg-gray-900 dark:bg-gray-100 opacity-50" />
                  <div className="absolute top-0 left-[50%] h-6 w-px bg-gray-900 dark:bg-gray-100 opacity-50" />
                </div>
                <div className="flex justify-between text-xs text-gray-400">
                  <span>0%</span>
                  <span className="ml-[30%]">40%</span>
                  <span>50%</span>
                  <span>100%</span>
                </div>

                <p className="text-sm text-gray-500 dark:text-gray-400 mt-4">{getDsrDesc(result.dsr)}</p>
              </div>

              {/* 연간 원리금 내역 */}
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  {t('result.annualRepaymentTitle')}
                </h2>
                <div className="space-y-3">
                  {/* 신규 대출 */}
                  <div className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-700">
                    <span className="text-sm text-gray-600 dark:text-gray-400">{t('result.newLoanLabel')}</span>
                    <span className="text-sm font-semibold text-gray-900 dark:text-white">{formatCurrency(Math.round(result.newLoanAnnual))}</span>
                  </div>
                  {/* 기존 대출들 */}
                  {result.existingLoansAnnual.map((loan, idx) => (
                    <div key={idx} className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-700">
                      <span className="text-sm text-gray-600 dark:text-gray-400">{loan.label}</span>
                      <span className="text-sm font-semibold text-gray-900 dark:text-white">{formatCurrency(Math.round(loan.annual))}</span>
                    </div>
                  ))}
                  {/* 합계 */}
                  <div className="flex justify-between items-center py-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg px-3">
                    <span className="text-sm font-medium text-blue-700 dark:text-blue-300">{t('result.totalAnnual')}</span>
                    <span className="text-sm font-bold text-blue-700 dark:text-blue-300">{formatCurrency(Math.round(result.totalAnnual))}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 px-3">
                    <span className="text-sm text-gray-500 dark:text-gray-400">{t('result.annualIncome')}</span>
                    <span className="text-sm text-gray-700 dark:text-gray-300">{formatCurrency(parseNumber(annualIncome))}</span>
                  </div>
                </div>
              </div>

              {/* 대출한도 역산 */}
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-green-600" />
                  {t('limit.title')}
                </h2>
                {result.maxAdditionalLoan > 0 ? (
                  <div className="space-y-3">
                    <div className="text-center bg-green-50 dark:bg-green-900/20 rounded-xl p-6">
                      <p className="text-sm text-green-600 dark:text-green-400 mb-1">{t('limit.maxAdditional')}</p>
                      <p className="text-3xl font-bold text-green-700 dark:text-green-300">{formatCurrency(Math.round(result.maxAdditionalLoan))}</p>
                      <p className="text-xs text-green-500 dark:text-green-400 mt-2">{t('limit.basedOn')}</p>
                    </div>
                    <div className="flex justify-between items-center py-2 px-3">
                      <span className="text-sm text-gray-500 dark:text-gray-400">{t('limit.availableAnnual')}</span>
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        {formatCurrency(Math.round(Math.max(0, parseNumber(annualIncome) * 0.4 - result.existingLoansAnnual.reduce((s, l) => s + l.annual, 0))))}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="text-center bg-red-50 dark:bg-red-900/20 rounded-xl p-6">
                    <AlertTriangle className="w-8 h-8 text-red-500 mx-auto mb-2" />
                    <p className="text-sm text-red-600 dark:text-red-400">{t('limit.noRoom')}</p>
                  </div>
                )}
              </div>

              {/* 스트레스 DSR */}
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                  <Shield className="w-5 h-5 text-purple-600" />
                  {t('stress.title')}
                </h2>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">{t('stress.description')}</p>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4">
                    <p className="text-xs text-purple-600 dark:text-purple-400 mb-1">{t('stress.additionalRate')}</p>
                    <p className="text-xl font-bold text-purple-700 dark:text-purple-300">+{result.stressAdditional.toFixed(2)}%p</p>
                  </div>
                  <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4">
                    <p className="text-xs text-purple-600 dark:text-purple-400 mb-1">{t('stress.appliedRate')}</p>
                    <p className="text-xl font-bold text-purple-700 dark:text-purple-300">{result.stressRate.toFixed(2)}%</p>
                  </div>
                  <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4">
                    <p className="text-xs text-purple-600 dark:text-purple-400 mb-1">{t('stress.resultDsr')}</p>
                    <p className={`text-xl font-bold ${getDsrTextColor(result.stressDsr)}`}>{result.stressDsr.toFixed(1)}%</p>
                  </div>
                  <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4">
                    <p className="text-xs text-purple-600 dark:text-purple-400 mb-1">{t('stress.resultLimit')}</p>
                    <p className="text-xl font-bold text-purple-700 dark:text-purple-300">{formatCurrency(Math.round(result.stressMaxLoan))}</p>
                  </div>
                </div>

                {location === 'nonCapital' && newLoanType === 'mortgage' && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-3 flex items-start gap-1">
                    <AlertTriangle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                    {t('stress.nonCapitalNote')}
                  </p>
                )}
              </div>

              {/* 면책문구 */}
              <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl p-4">
                <h3 className="text-sm font-medium text-yellow-800 dark:text-yellow-300 mb-1 flex items-center gap-1">
                  <AlertTriangle className="w-4 h-4" />
                  {t('disclaimer.title')}
                </h3>
                <p className="text-xs text-yellow-700 dark:text-yellow-400 leading-relaxed">{t('disclaimer.text')}</p>
              </div>
            </>
          ) : (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-12 text-center">
              <Calculator className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400 dark:text-gray-500">{t('description')}</p>
            </div>
          )}
        </div>
      </div>

      {/* 가이드 섹션 */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-blue-600" />
          {t('guide.title')}
        </h2>
        <div className="grid md:grid-cols-3 gap-6">
          {/* DSR이란? */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">{t('guide.whatIsDsr.title')}</h3>
            <ul className="space-y-2">
              {(t.raw('guide.whatIsDsr.items') as string[]).map((item, i) => (
                <li key={i} className="text-sm text-gray-600 dark:text-gray-400 flex items-start gap-2">
                  <span className="text-blue-500 mt-1 flex-shrink-0">&#8226;</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
          {/* 스트레스 DSR */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">{t('guide.stressDsr.title')}</h3>
            <ul className="space-y-2">
              {(t.raw('guide.stressDsr.items') as string[]).map((item, i) => (
                <li key={i} className="text-sm text-gray-600 dark:text-gray-400 flex items-start gap-2">
                  <span className="text-purple-500 mt-1 flex-shrink-0">&#8226;</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
          {/* 팁 */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">{t('guide.tips.title')}</h3>
            <ul className="space-y-2">
              {(t.raw('guide.tips.items') as string[]).map((item, i) => (
                <li key={i} className="text-sm text-gray-600 dark:text-gray-400 flex items-start gap-2">
                  <span className="text-green-500 mt-1 flex-shrink-0">&#8226;</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
