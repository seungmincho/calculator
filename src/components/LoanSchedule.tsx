'use client'

import { useState, useMemo, useCallback, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { Copy, Check, BookOpen, Download, ArrowRightLeft, Plus, Trash2, Calendar, TrendingDown, BarChart3 } from 'lucide-react'

// ── Types ──
type RepaymentType = 'equalPayment' | 'equalPrincipal' | 'bullet'
type AmountUnit = 'won' | 'manwon' | 'eokwon'
type TermUnit = 'months' | 'years'

interface ScheduleRow {
  period: number
  date: string
  payment: number
  principal: number
  interest: number
  balance: number
  isGrace: boolean
  extraPayment: number
}

interface LoanResult {
  schedule: ScheduleRow[]
  totalPayment: number
  totalInterest: number
  totalPrincipal: number
  interestRatio: number
  avgMonthlyPayment: number
}

interface LoanParams {
  principal: number
  annualRate: number
  totalMonths: number
  gracePeriod: number
  repaymentType: RepaymentType
  startDate: string
  extraMonthly: number
}

// ── Calculation Engine ──
function calculateSchedule(params: LoanParams): LoanResult {
  const { principal, annualRate, totalMonths, gracePeriod, repaymentType, startDate, extraMonthly } = params
  const monthlyRate = annualRate / 100 / 12
  const repaymentMonths = totalMonths - gracePeriod
  const schedule: ScheduleRow[] = []
  let balance = principal
  let totalPayment = 0
  let totalInterest = 0

  const startD = new Date(startDate)

  for (let i = 1; i <= totalMonths; i++) {
    const d = new Date(startD)
    d.setMonth(d.getMonth() + i)
    const dateStr = `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`

    const isGrace = i <= gracePeriod
    let payment = 0
    let principalPart = 0
    let interestPart = 0
    let extra = 0

    if (balance <= 0) break

    interestPart = balance * monthlyRate

    if (isGrace) {
      // Grace period: interest-only
      payment = interestPart
      principalPart = 0
    } else if (repaymentType === 'bullet') {
      // Bullet: interest-only, principal at end
      if (i === totalMonths) {
        principalPart = balance
        payment = interestPart + principalPart
      } else {
        payment = interestPart
        principalPart = 0
      }
    } else if (repaymentType === 'equalPayment') {
      // Equal Payment (annuity)
      const n = repaymentMonths - (i - gracePeriod - 1)
      if (n <= 0) {
        principalPart = balance
        payment = interestPart + principalPart
      } else {
        const remainingTerms = repaymentMonths - (i - gracePeriod) + 1
        if (monthlyRate === 0) {
          principalPart = balance / remainingTerms
          payment = principalPart
          interestPart = 0
        } else {
          const powerTerm = Math.pow(1 + monthlyRate, remainingTerms)
          payment = balance * monthlyRate * powerTerm / (powerTerm - 1)
          principalPart = payment - interestPart
        }
      }
    } else {
      // Equal Principal
      const remainingTerms = repaymentMonths - (i - gracePeriod) + 1
      principalPart = balance / remainingTerms
      payment = principalPart + interestPart
    }

    // Extra payment
    if (!isGrace && extraMonthly > 0 && repaymentType !== 'bullet') {
      extra = Math.min(extraMonthly, balance - principalPart)
      if (extra < 0) extra = 0
    }

    const totalPrincipalThisMonth = principalPart + extra
    balance = Math.max(0, balance - totalPrincipalThisMonth)

    const totalPaymentThisMonth = payment + extra
    totalPayment += totalPaymentThisMonth
    totalInterest += interestPart

    schedule.push({
      period: i,
      date: dateStr,
      payment: totalPaymentThisMonth,
      principal: totalPrincipalThisMonth,
      interest: interestPart,
      balance,
      isGrace,
      extraPayment: extra,
    })

    if (balance <= 0) break
  }

  return {
    schedule,
    totalPayment,
    totalInterest,
    totalPrincipal: principal,
    interestRatio: principal > 0 ? (totalInterest / principal) * 100 : 0,
    avgMonthlyPayment: schedule.length > 0 ? totalPayment / schedule.length : 0,
  }
}

// ── Utility ──
function formatWon(value: number): string {
  return Math.round(value).toLocaleString('ko-KR')
}

function toRawWon(value: string, unit: AmountUnit): number {
  const n = parseFloat(value) || 0
  if (unit === 'manwon') return n * 10000
  if (unit === 'eokwon') return n * 100000000
  return n
}

function getDefaultDate(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// ── Component ──
export default function LoanSchedule() {
  const t = useTranslations('loanSchedule')
  const [copiedId, setCopiedId] = useState<string | null>(null)

  // ── Inputs ──
  const [amountStr, setAmountStr] = useState('30000')
  const [amountUnit, setAmountUnit] = useState<AmountUnit>('manwon')
  const [rateStr, setRateStr] = useState('4.5')
  const [termStr, setTermStr] = useState('30')
  const [termUnit, setTermUnit] = useState<TermUnit>('years')
  const [repaymentType, setRepaymentType] = useState<RepaymentType>('equalPayment')
  const [gracePeriodStr, setGracePeriodStr] = useState('0')
  const [startDate, setStartDate] = useState(getDefaultDate())
  const [extraMonthlyStr, setExtraMonthlyStr] = useState('0')

  // ── Comparison mode ──
  const [compareMode, setCompareMode] = useState(false)
  const [amountStr2, setAmountStr2] = useState('30000')
  const [amountUnit2, setAmountUnit2] = useState<AmountUnit>('manwon')
  const [rateStr2, setRateStr2] = useState('3.5')
  const [termStr2, setTermStr2] = useState('20')
  const [termUnit2, setTermUnit2] = useState<TermUnit>('years')
  const [repaymentType2, setRepaymentType2] = useState<RepaymentType>('equalPayment')
  const [gracePeriodStr2, setGracePeriodStr2] = useState('0')

  // ── Display ──
  const [visibleRows, setVisibleRows] = useState(24)
  const [activeTab, setActiveTab] = useState<'schedule' | 'chart'>('schedule')

  // ── URL state sync ──
  useEffect(() => {
    if (typeof window === 'undefined') return
    const params = new URLSearchParams(window.location.search)
    if (params.get('amount')) setAmountStr(params.get('amount')!)
    if (params.get('unit')) setAmountUnit(params.get('unit') as AmountUnit)
    if (params.get('rate')) setRateStr(params.get('rate')!)
    if (params.get('term')) setTermStr(params.get('term')!)
    if (params.get('termUnit')) setTermUnit(params.get('termUnit') as TermUnit)
    if (params.get('type')) setRepaymentType(params.get('type') as RepaymentType)
    if (params.get('grace')) setGracePeriodStr(params.get('grace')!)
    if (params.get('start')) setStartDate(params.get('start')!)
    if (params.get('extra')) setExtraMonthlyStr(params.get('extra')!)
  }, [])

  const updateURL = useCallback((overrides: Record<string, string>) => {
    if (typeof window === 'undefined') return
    const url = new URL(window.location.href)
    Object.entries(overrides).forEach(([k, v]) => url.searchParams.set(k, v))
    window.history.replaceState({}, '', url)
  }, [])

  useEffect(() => {
    updateURL({
      amount: amountStr, unit: amountUnit, rate: rateStr,
      term: termStr, termUnit, type: repaymentType,
      grace: gracePeriodStr, start: startDate, extra: extraMonthlyStr,
    })
  }, [amountStr, amountUnit, rateStr, termStr, termUnit, repaymentType, gracePeriodStr, startDate, extraMonthlyStr, updateURL])

  // ── Calculation ──
  const totalMonths = termUnit === 'years' ? (parseInt(termStr) || 0) * 12 : (parseInt(termStr) || 0)
  const gracePeriod = parseInt(gracePeriodStr) || 0
  const principal = toRawWon(amountStr, amountUnit)
  const extraMonthly = toRawWon(extraMonthlyStr, 'manwon')

  const result = useMemo<LoanResult | null>(() => {
    if (principal <= 0 || totalMonths <= 0 || (parseFloat(rateStr) || 0) <= 0) return null
    if (gracePeriod >= totalMonths) return null
    return calculateSchedule({
      principal,
      annualRate: parseFloat(rateStr) || 0,
      totalMonths,
      gracePeriod,
      repaymentType,
      startDate,
      extraMonthly,
    })
  }, [principal, rateStr, totalMonths, gracePeriod, repaymentType, startDate, extraMonthly])

  // ── Comparison result ──
  const totalMonths2 = termUnit2 === 'years' ? (parseInt(termStr2) || 0) * 12 : (parseInt(termStr2) || 0)
  const gracePeriod2 = parseInt(gracePeriodStr2) || 0
  const principal2 = toRawWon(amountStr2, amountUnit2)

  const result2 = useMemo<LoanResult | null>(() => {
    if (!compareMode) return null
    if (principal2 <= 0 || totalMonths2 <= 0 || (parseFloat(rateStr2) || 0) <= 0) return null
    if (gracePeriod2 >= totalMonths2) return null
    return calculateSchedule({
      principal: principal2,
      annualRate: parseFloat(rateStr2) || 0,
      totalMonths: totalMonths2,
      gracePeriod: gracePeriod2,
      repaymentType: repaymentType2,
      startDate,
      extraMonthly: 0,
    })
  }, [compareMode, principal2, rateStr2, totalMonths2, gracePeriod2, repaymentType2, startDate])

  // ── No-extra result for savings display ──
  const resultNoExtra = useMemo<LoanResult | null>(() => {
    if (extraMonthly <= 0 || !result) return null
    return calculateSchedule({
      principal,
      annualRate: parseFloat(rateStr) || 0,
      totalMonths,
      gracePeriod,
      repaymentType,
      startDate,
      extraMonthly: 0,
    })
  }, [principal, rateStr, totalMonths, gracePeriod, repaymentType, startDate, extraMonthly, result])

  // ── Clipboard ──
  const copyToClipboard = useCallback(async (text: string, id: string) => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text)
      } else {
        const textarea = document.createElement('textarea')
        textarea.value = text
        textarea.style.position = 'fixed'
        textarea.style.left = '-999999px'
        document.body.appendChild(textarea)
        textarea.select()
        document.execCommand('copy')
        document.body.removeChild(textarea)
      }
      setCopiedId(id)
      setTimeout(() => setCopiedId(null), 2000)
    } catch {
      setCopiedId(id)
      setTimeout(() => setCopiedId(null), 2000)
    }
  }, [])

  // ── Export CSV ──
  const downloadCSV = useCallback(() => {
    if (!result) return
    const header = [t('period'), t('date'), t('monthlyPayment'), t('principalPayment'), t('interestPayment'), t('remainingBalance')].join(',')
    const rows = result.schedule.map(r =>
      [r.period, r.date, Math.round(r.payment), Math.round(r.principal), Math.round(r.interest), Math.round(r.balance)].join(',')
    )
    const csv = '\uFEFF' + [header, ...rows].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'loan-schedule.csv'
    a.click()
    URL.revokeObjectURL(url)
  }, [result, t])

  // ── Copy schedule as text ──
  const copyScheduleText = useCallback(() => {
    if (!result) return
    const lines = result.schedule.map(r =>
      `${r.period}${t('periodSuffix')} | ${r.date} | ${formatWon(r.payment)}${t('wonUnit')} | ${formatWon(r.principal)}${t('wonUnit')} | ${formatWon(r.interest)}${t('wonUnit')} | ${formatWon(r.balance)}${t('wonUnit')}`
    )
    const header = `${t('period')} | ${t('date')} | ${t('monthlyPayment')} | ${t('principalPayment')} | ${t('interestPayment')} | ${t('remainingBalance')}`
    copyToClipboard([header, ...lines].join('\n'), 'schedule')
  }, [result, copyToClipboard, t])

  // ── Reset ──
  const handleReset = () => {
    setAmountStr('30000')
    setAmountUnit('manwon')
    setRateStr('4.5')
    setTermStr('30')
    setTermUnit('years')
    setRepaymentType('equalPayment')
    setGracePeriodStr('0')
    setStartDate(getDefaultDate())
    setExtraMonthlyStr('0')
    setVisibleRows(24)
    setCompareMode(false)
  }

  // ── Max balance for chart scaling ──
  const maxPayment = result ? Math.max(...result.schedule.map(r => r.payment)) : 0

  // ── Render helpers ──
  const renderInputPanel = (
    label: string,
    amt: string, setAmt: (v: string) => void,
    aUnit: AmountUnit, setAUnit: (v: AmountUnit) => void,
    rate: string, setRate: (v: string) => void,
    term: string, setTerm: (v: string) => void,
    tUnit: TermUnit, setTUnit: (v: TermUnit) => void,
    rType: RepaymentType, setRType: (v: RepaymentType) => void,
    grace: string, setGrace: (v: string) => void,
    showExtra?: boolean,
  ) => (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 space-y-4">
      {label && <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{label}</h2>}

      {/* Loan Amount */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('loanAmount')}</label>
        <div className="flex gap-2">
          <input
            type="number"
            value={amt}
            onChange={e => setAmt(e.target.value)}
            className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
            min="0"
          />
          <select
            value={aUnit}
            onChange={e => setAUnit(e.target.value as AmountUnit)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
          >
            <option value="won">{t('unitWon')}</option>
            <option value="manwon">{t('unitManwon')}</option>
            <option value="eokwon">{t('unitEokwon')}</option>
          </select>
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          = {formatWon(toRawWon(amt, aUnit))}{t('wonUnit')}
        </p>
      </div>

      {/* Annual Interest Rate */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('annualRate')}</label>
        <div className="relative">
          <input
            type="number"
            value={rate}
            onChange={e => setRate(e.target.value)}
            step="0.1"
            min="0"
            max="100"
            className="w-full px-3 py-2 pr-8 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400">%</span>
        </div>
      </div>

      {/* Loan Term */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('loanTerm')}</label>
        <div className="flex gap-2">
          <input
            type="number"
            value={term}
            onChange={e => setTerm(e.target.value)}
            min="1"
            className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
          />
          <select
            value={tUnit}
            onChange={e => setTUnit(e.target.value as TermUnit)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
          >
            <option value="years">{t('unitYears')}</option>
            <option value="months">{t('unitMonths')}</option>
          </select>
        </div>
      </div>

      {/* Repayment Type */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('repaymentType')}</label>
        <select
          value={rType}
          onChange={e => setRType(e.target.value as RepaymentType)}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
        >
          <option value="equalPayment">{t('typeEqualPayment')}</option>
          <option value="equalPrincipal">{t('typeEqualPrincipal')}</option>
          <option value="bullet">{t('typeBullet')}</option>
        </select>
      </div>

      {/* Grace Period */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('gracePeriod')}</label>
        <div className="flex items-center gap-2">
          <input
            type="number"
            value={grace}
            onChange={e => setGrace(e.target.value)}
            min="0"
            className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
          />
          <span className="text-sm text-gray-500 dark:text-gray-400">{t('monthsLabel')}</span>
        </div>
      </div>

      {/* Extra Monthly (only for primary panel) */}
      {showExtra && (
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('extraMonthly')}</label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              value={extraMonthlyStr}
              onChange={e => setExtraMonthlyStr(e.target.value)}
              min="0"
              className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-500 dark:text-gray-400">{t('unitManwon')}</span>
          </div>
        </div>
      )}
    </div>
  )

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('title')}</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('description')}</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setCompareMode(!compareMode)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              compareMode
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300'
            }`}
          >
            <ArrowRightLeft className="w-4 h-4" />
            {t('compare')}
          </button>
          <button
            onClick={handleReset}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            {t('reset')}
          </button>
        </div>
      </div>

      {/* Input Section */}
      <div className={`grid gap-6 ${compareMode ? 'lg:grid-cols-2' : 'lg:grid-cols-3'}`}>
        <div className={compareMode ? '' : 'lg:col-span-1'}>
          {renderInputPanel(
            compareMode ? t('loanA') : '',
            amountStr, setAmountStr,
            amountUnit, setAmountUnit,
            rateStr, setRateStr,
            termStr, setTermStr,
            termUnit, setTermUnit,
            repaymentType, setRepaymentType,
            gracePeriodStr, setGracePeriodStr,
            !compareMode,
          )}

          {/* Start Date (shared) */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 mt-6">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              <Calendar className="w-4 h-4 inline mr-1" />
              {t('startDate')}
            </label>
            <input
              type="date"
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {compareMode && (
          <div>
            {renderInputPanel(
              t('loanB'),
              amountStr2, setAmountStr2,
              amountUnit2, setAmountUnit2,
              rateStr2, setRateStr2,
              termStr2, setTermStr2,
              termUnit2, setTermUnit2,
              repaymentType2, setRepaymentType2,
              gracePeriodStr2, setGracePeriodStr2,
              false,
            )}
          </div>
        )}

        {/* Results Section */}
        {!compareMode && result && (
          <div className="lg:col-span-2 space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4">
                <p className="text-xs text-gray-500 dark:text-gray-400">{t('totalPayment')}</p>
                <p className="text-lg font-bold text-gray-900 dark:text-white mt-1">{formatWon(result.totalPayment)}<span className="text-xs font-normal">{t('wonUnit')}</span></p>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4">
                <p className="text-xs text-gray-500 dark:text-gray-400">{t('totalInterest')}</p>
                <p className="text-lg font-bold text-red-600 dark:text-red-400 mt-1">{formatWon(result.totalInterest)}<span className="text-xs font-normal">{t('wonUnit')}</span></p>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4">
                <p className="text-xs text-gray-500 dark:text-gray-400">{t('interestRatio')}</p>
                <p className="text-lg font-bold text-orange-600 dark:text-orange-400 mt-1">{result.interestRatio.toFixed(1)}%</p>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4">
                <p className="text-xs text-gray-500 dark:text-gray-400">{t('avgMonthly')}</p>
                <p className="text-lg font-bold text-blue-600 dark:text-blue-400 mt-1">{formatWon(result.avgMonthlyPayment)}<span className="text-xs font-normal">{t('wonUnit')}</span></p>
              </div>
            </div>

            {/* Early Repayment Savings */}
            {extraMonthly > 0 && resultNoExtra && result && (
              <div className="bg-green-50 dark:bg-green-950 rounded-xl p-4 border border-green-200 dark:border-green-800">
                <h3 className="text-sm font-semibold text-green-800 dark:text-green-300 flex items-center gap-1.5 mb-2">
                  <TrendingDown className="w-4 h-4" />
                  {t('earlyRepaymentSavings')}
                </h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-600 dark:text-gray-400">{t('interestSaved')}</p>
                    <p className="font-bold text-green-700 dark:text-green-400">
                      -{formatWon(resultNoExtra.totalInterest - result.totalInterest)}{t('wonUnit')}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-600 dark:text-gray-400">{t('termReduced')}</p>
                    <p className="font-bold text-green-700 dark:text-green-400">
                      -{resultNoExtra.schedule.length - result.schedule.length}{t('monthsLabel')}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Tabs */}
            <div className="flex gap-2">
              <button
                onClick={() => setActiveTab('schedule')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === 'schedule'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                {t('scheduleTab')}
              </button>
              <button
                onClick={() => setActiveTab('chart')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === 'chart'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                <BarChart3 className="w-4 h-4 inline mr-1" />
                {t('chartTab')}
              </button>
            </div>

            {/* Schedule Table */}
            {activeTab === 'schedule' && (
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{t('scheduleTitle')}</h3>
                  <div className="flex gap-2">
                    <button
                      onClick={copyScheduleText}
                      className="flex items-center gap-1 px-3 py-1.5 text-xs rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 transition-colors"
                    >
                      {copiedId === 'schedule' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      {copiedId === 'schedule' ? t('copied') : t('copyText')}
                    </button>
                    <button
                      onClick={downloadCSV}
                      className="flex items-center gap-1 px-3 py-1.5 text-xs rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 transition-colors"
                    >
                      <Download className="w-3.5 h-3.5" />
                      CSV
                    </button>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 dark:bg-gray-750 border-b border-gray-200 dark:border-gray-700">
                        <th className="px-3 py-2.5 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{t('period')}</th>
                        <th className="px-3 py-2.5 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{t('date')}</th>
                        <th className="px-3 py-2.5 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{t('monthlyPayment')}</th>
                        <th className="px-3 py-2.5 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{t('principalPayment')}</th>
                        <th className="px-3 py-2.5 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{t('interestPayment')}</th>
                        <th className="px-3 py-2.5 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{t('remainingBalance')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                      {result.schedule.slice(0, visibleRows).map(row => (
                        <tr
                          key={row.period}
                          className={`${
                            row.isGrace
                              ? 'bg-yellow-50 dark:bg-yellow-950/30'
                              : 'hover:bg-gray-50 dark:hover:bg-gray-750'
                          } transition-colors`}
                        >
                          <td className="px-3 py-2 text-gray-900 dark:text-white">
                            {row.period}
                            {row.isGrace && (
                              <span className="ml-1 text-[10px] px-1 py-0.5 bg-yellow-200 dark:bg-yellow-800 text-yellow-800 dark:text-yellow-200 rounded">
                                {t('graceLabel')}
                              </span>
                            )}
                          </td>
                          <td className="px-3 py-2 text-gray-600 dark:text-gray-400 text-xs">{row.date}</td>
                          <td className="px-3 py-2 text-right font-medium text-gray-900 dark:text-white">
                            {formatWon(row.payment)}
                            {row.extraPayment > 0 && (
                              <span className="ml-1 text-[10px] text-green-600 dark:text-green-400">+{formatWon(row.extraPayment)}</span>
                            )}
                          </td>
                          <td className="px-3 py-2 text-right text-blue-600 dark:text-blue-400">{formatWon(row.principal)}</td>
                          <td className="px-3 py-2 text-right text-red-600 dark:text-red-400">{formatWon(row.interest)}</td>
                          <td className="px-3 py-2 text-right text-gray-900 dark:text-white">{formatWon(row.balance)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {result.schedule.length > visibleRows && (
                  <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700 text-center">
                    <button
                      onClick={() => setVisibleRows(prev => Math.min(prev + 48, result.schedule.length))}
                      className="flex items-center gap-1.5 mx-auto px-4 py-2 text-sm font-medium rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700 transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                      {t('loadMore')} ({result.schedule.length - visibleRows}{t('rowsRemaining')})
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Chart View */}
            {activeTab === 'chart' && (
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 space-y-6">
                {/* Principal vs Interest per period */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">{t('chartPrincipalInterest')}</h3>
                  <div className="space-y-1 max-h-96 overflow-y-auto">
                    {result.schedule.map(row => {
                      const principalPct = maxPayment > 0 ? (row.principal / maxPayment) * 100 : 0
                      const interestPct = maxPayment > 0 ? (row.interest / maxPayment) * 100 : 0
                      return (
                        <div key={row.period} className="flex items-center gap-2 text-xs">
                          <span className="w-8 text-right text-gray-500 dark:text-gray-400 shrink-0">{row.period}</span>
                          <div className="flex-1 flex h-4 rounded overflow-hidden bg-gray-100 dark:bg-gray-700">
                            <div
                              className="bg-blue-500 dark:bg-blue-400 transition-all"
                              style={{ width: `${principalPct}%` }}
                              title={`${t('principalPayment')}: ${formatWon(row.principal)}`}
                            />
                            <div
                              className="bg-red-400 dark:bg-red-500 transition-all"
                              style={{ width: `${interestPct}%` }}
                              title={`${t('interestPayment')}: ${formatWon(row.interest)}`}
                            />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                  <div className="flex gap-4 mt-2 text-xs text-gray-500 dark:text-gray-400">
                    <span className="flex items-center gap-1">
                      <span className="w-3 h-3 bg-blue-500 dark:bg-blue-400 rounded" /> {t('principalPayment')}
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-3 h-3 bg-red-400 dark:bg-red-500 rounded" /> {t('interestPayment')}
                    </span>
                  </div>
                </div>

                {/* Remaining Balance */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">{t('chartBalance')}</h3>
                  <div className="space-y-1 max-h-64 overflow-y-auto">
                    {result.schedule.map(row => {
                      const pct = principal > 0 ? (row.balance / principal) * 100 : 0
                      return (
                        <div key={row.period} className="flex items-center gap-2 text-xs">
                          <span className="w-8 text-right text-gray-500 dark:text-gray-400 shrink-0">{row.period}</span>
                          <div className="flex-1 h-3 rounded bg-gray-100 dark:bg-gray-700 overflow-hidden">
                            <div
                              className="h-full bg-indigo-500 dark:bg-indigo-400 transition-all rounded"
                              style={{ width: `${pct}%` }}
                              title={`${t('remainingBalance')}: ${formatWon(row.balance)}`}
                            />
                          </div>
                          <span className="w-20 text-right text-gray-500 dark:text-gray-400 shrink-0">{formatWon(row.balance)}</span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Comparison Results */}
      {compareMode && result && result2 && (
        <div className="space-y-6">
          {/* Side-by-side summary */}
          <div className="grid lg:grid-cols-2 gap-6">
            {/* Loan A Summary */}
            <div className="bg-blue-50 dark:bg-blue-950 rounded-xl p-6 border border-blue-200 dark:border-blue-800">
              <h3 className="text-sm font-semibold text-blue-800 dark:text-blue-300 mb-4">{t('loanA')}</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">{t('totalPayment')}</span>
                  <span className="font-bold text-gray-900 dark:text-white">{formatWon(result.totalPayment)}{t('wonUnit')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">{t('totalInterest')}</span>
                  <span className="font-bold text-red-600 dark:text-red-400">{formatWon(result.totalInterest)}{t('wonUnit')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">{t('interestRatio')}</span>
                  <span className="font-bold text-orange-600 dark:text-orange-400">{result.interestRatio.toFixed(1)}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">{t('avgMonthly')}</span>
                  <span className="font-bold text-blue-600 dark:text-blue-400">{formatWon(result.avgMonthlyPayment)}{t('wonUnit')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">{t('totalPeriods')}</span>
                  <span className="font-bold text-gray-900 dark:text-white">{result.schedule.length}{t('monthsLabel')}</span>
                </div>
              </div>
            </div>

            {/* Loan B Summary */}
            <div className="bg-green-50 dark:bg-green-950 rounded-xl p-6 border border-green-200 dark:border-green-800">
              <h3 className="text-sm font-semibold text-green-800 dark:text-green-300 mb-4">{t('loanB')}</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">{t('totalPayment')}</span>
                  <span className="font-bold text-gray-900 dark:text-white">{formatWon(result2.totalPayment)}{t('wonUnit')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">{t('totalInterest')}</span>
                  <span className="font-bold text-red-600 dark:text-red-400">{formatWon(result2.totalInterest)}{t('wonUnit')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">{t('interestRatio')}</span>
                  <span className="font-bold text-orange-600 dark:text-orange-400">{result2.interestRatio.toFixed(1)}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">{t('avgMonthly')}</span>
                  <span className="font-bold text-blue-600 dark:text-blue-400">{formatWon(result2.avgMonthlyPayment)}{t('wonUnit')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">{t('totalPeriods')}</span>
                  <span className="font-bold text-gray-900 dark:text-white">{result2.schedule.length}{t('monthsLabel')}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Difference highlight */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">{t('compareDiff')}</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
              <div>
                <p className="text-gray-500 dark:text-gray-400">{t('totalInterestDiff')}</p>
                <p className={`font-bold ${result.totalInterest > result2.totalInterest ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
                  {result.totalInterest > result2.totalInterest ? '+' : ''}{formatWon(result.totalInterest - result2.totalInterest)}{t('wonUnit')}
                </p>
              </div>
              <div>
                <p className="text-gray-500 dark:text-gray-400">{t('totalPaymentDiff')}</p>
                <p className={`font-bold ${result.totalPayment > result2.totalPayment ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
                  {result.totalPayment > result2.totalPayment ? '+' : ''}{formatWon(result.totalPayment - result2.totalPayment)}{t('wonUnit')}
                </p>
              </div>
              <div>
                <p className="text-gray-500 dark:text-gray-400">{t('avgMonthlyDiff')}</p>
                <p className={`font-bold ${result.avgMonthlyPayment > result2.avgMonthlyPayment ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
                  {result.avgMonthlyPayment > result2.avgMonthlyPayment ? '+' : ''}{formatWon(result.avgMonthlyPayment - result2.avgMonthlyPayment)}{t('wonUnit')}
                </p>
              </div>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-3">{t('compareDiffNote')}</p>
          </div>
        </div>
      )}

      {/* Guide Section */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
          <BookOpen className="w-5 h-5" />
          {t('guide.title')}
        </h2>
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">{t('guide.types.title')}</h3>
            <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
              {(t.raw('guide.types.items') as string[]).map((item, i) => (
                <li key={i} className="flex gap-2">
                  <span className="text-blue-500 mt-0.5 shrink-0">&#8226;</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">{t('guide.tips.title')}</h3>
            <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
              {(t.raw('guide.tips.items') as string[]).map((item, i) => (
                <li key={i} className="flex gap-2">
                  <span className="text-green-500 mt-0.5 shrink-0">&#8226;</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
