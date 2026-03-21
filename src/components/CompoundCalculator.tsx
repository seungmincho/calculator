'use client'

import { useState, useCallback, useMemo, useEffect } from 'react'
import { useSearchParams, useRouter, usePathname } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { TrendingUp, Calculator, Copy, Check, BookOpen, RotateCcw, Link, GitCompare } from 'lucide-react'

interface YearlyData {
  year: number
  deposit: number
  interest: number
  balance: number
}

type CompoundFrequency = 'yearly' | 'semiannually' | 'quarterly' | 'monthly' | 'daily'
type PeriodType = 'years' | 'months'

const frequencyValues: Record<CompoundFrequency, number> = {
  yearly: 1,
  semiannually: 2,
  quarterly: 4,
  monthly: 12,
  daily: 365,
}

function computeResults(
  principal: number,
  annualRate: number,
  period: number,
  periodType: PeriodType,
  compoundFrequency: CompoundFrequency,
  monthlyDeposit: number
) {
  const years = periodType === 'years' ? period : period / 12
  const r = annualRate / 100
  const n = frequencyValues[compoundFrequency]
  const t = years

  if (years <= 0 || annualRate < 0 || principal < 0 || monthlyDeposit < 0) {
    return {
      totalAmount: 0,
      totalInterest: 0,
      totalDeposited: 0,
      effectiveRate: 0,
      yearlyBreakdown: [] as YearlyData[],
      simpleInterest: 0,
      compoundAdvantage: 0,
    }
  }

  const compoundMultiplier = Math.pow(1 + r / n, n * t)
  const principalGrowth = principal * compoundMultiplier

  let depositGrowth = 0
  if (monthlyDeposit > 0 && r > 0) {
    const ratePerPeriod = r / n
    depositGrowth = (monthlyDeposit * 12 / n) * ((compoundMultiplier - 1) / ratePerPeriod)
  } else if (monthlyDeposit > 0) {
    depositGrowth = monthlyDeposit * 12 * t
  }

  const totalAmount = principalGrowth + depositGrowth
  const totalDeposited = principal + monthlyDeposit * 12 * t
  const totalInterest = totalAmount - totalDeposited
  const effectiveRate = totalDeposited > 0 ? (totalInterest / totalDeposited) * 100 : 0

  const simpleInterest = principal * r * t + (monthlyDeposit * 12 * t * r * t / 2)
  const compoundAdvantage = totalInterest - simpleInterest

  const yearlyBreakdown: YearlyData[] = []
  for (let year = 1; year <= Math.ceil(years); year++) {
    const yearT = year
    const yearCompoundMultiplier = Math.pow(1 + r / n, n * yearT)
    const yearPrincipalGrowth = principal * yearCompoundMultiplier

    let yearDepositGrowth = 0
    if (monthlyDeposit > 0 && r > 0) {
      const ratePerPeriod = r / n
      yearDepositGrowth = (monthlyDeposit * 12 / n) * ((Math.pow(1 + ratePerPeriod, n * yearT) - 1) / ratePerPeriod)
    } else if (monthlyDeposit > 0) {
      yearDepositGrowth = monthlyDeposit * 12 * yearT
    }

    const yearTotalAmount = yearPrincipalGrowth + yearDepositGrowth
    const yearTotalDeposited = principal + monthlyDeposit * 12 * yearT
    const yearInterest = yearTotalAmount - yearTotalDeposited

    yearlyBreakdown.push({
      year,
      deposit: yearTotalDeposited,
      interest: Math.max(0, yearInterest),
      balance: yearTotalAmount,
    })
  }

  return { totalAmount, totalInterest, totalDeposited, effectiveRate, yearlyBreakdown, simpleInterest, compoundAdvantage }
}

// ── Scenario comparison rates ──────────────────────────────────────────────
interface ScenarioRate {
  id: number
  rate: number
}

const DEFAULT_SCENARIOS: ScenarioRate[] = [
  { id: 1, rate: 3 },
  { id: 2, rate: 5 },
  { id: 3, rate: 7 },
]

const SCENARIO_COLORS = [
  { bg: 'bg-blue-500', text: 'text-blue-600 dark:text-blue-400', bar: 'bg-blue-500', light: 'bg-blue-50 dark:bg-blue-950' },
  { bg: 'bg-emerald-500', text: 'text-emerald-600 dark:text-emerald-400', bar: 'bg-emerald-500', light: 'bg-emerald-50 dark:bg-emerald-950' },
  { bg: 'bg-violet-500', text: 'text-violet-600 dark:text-violet-400', bar: 'bg-violet-500', light: 'bg-violet-50 dark:bg-violet-950' },
]

// ── Stacked bar chart helpers ──────────────────────────────────────────────
function GrowthChart({ yearlyBreakdown, maxBalance }: { yearlyBreakdown: YearlyData[]; maxBalance: number }) {
  if (yearlyBreakdown.length === 0) return null
  return (
    <div className="space-y-2">
      {/* Legend */}
      <div className="flex gap-4 text-xs text-gray-500 dark:text-gray-400 mb-3">
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded-sm bg-blue-500" />
          원금+납입
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded-sm bg-green-500" />
          이자
        </span>
      </div>
      {yearlyBreakdown.map((data) => {
        const totalPct = (data.balance / maxBalance) * 100
        const depositPct = (data.deposit / data.balance) * 100
        const interestPct = 100 - depositPct
        return (
          <div key={data.year} className="space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-gray-600 dark:text-gray-300 w-10 shrink-0">{data.year}년</span>
              <span className="font-semibold text-gray-900 dark:text-white">
                ₩{data.balance.toLocaleString('ko-KR', { maximumFractionDigits: 0 })}
              </span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-4 overflow-hidden">
              <div className="h-full flex rounded-full overflow-hidden" style={{ width: `${totalPct}%` }}>
                <div className="h-full bg-blue-500 transition-all duration-300" style={{ width: `${depositPct}%` }} />
                <div className="h-full bg-green-500 transition-all duration-300" style={{ width: `${interestPct}%` }} />
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default function CompoundCalculator() {
  const t = useTranslations('compoundCalculator')
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()
  const [copiedId, setCopiedId] = useState<string | null>(null)

  // ── Init from URL params ─────────────────────────────────────────────────
  const [principal, setPrincipal] = useState<number>(() => {
    const v = searchParams.get('p')
    return v ? Number(v) : 10000000
  })
  const [annualRate, setAnnualRate] = useState<number>(() => {
    const v = searchParams.get('r')
    return v ? Number(v) : 5
  })
  const [period, setPeriod] = useState<number>(() => {
    const v = searchParams.get('t')
    return v ? Number(v) : 10
  })
  const [periodType, setPeriodType] = useState<PeriodType>(() => {
    const v = searchParams.get('pt')
    return v === 'months' ? 'months' : 'years'
  })
  const [compoundFrequency, setCompoundFrequency] = useState<CompoundFrequency>(() => {
    const v = searchParams.get('f')
    const valid: CompoundFrequency[] = ['yearly', 'semiannually', 'quarterly', 'monthly', 'daily']
    return valid.includes(v as CompoundFrequency) ? (v as CompoundFrequency) : 'yearly'
  })
  const [monthlyDeposit, setMonthlyDeposit] = useState<number>(() => {
    const v = searchParams.get('md')
    return v ? Number(v) : 0
  })

  // ── Scenario comparison state ────────────────────────────────────────────
  const [showScenarios, setShowScenarios] = useState(false)
  const [scenarios, setScenarios] = useState<ScenarioRate[]>(DEFAULT_SCENARIOS)

  // ── Sync URL when inputs change ──────────────────────────────────────────
  useEffect(() => {
    const params = new URLSearchParams()
    params.set('p', String(principal))
    params.set('r', String(annualRate))
    params.set('t', String(period))
    params.set('pt', periodType)
    params.set('f', compoundFrequency)
    if (monthlyDeposit > 0) params.set('md', String(monthlyDeposit))
    router.replace(`${pathname}?${params.toString()}`, { scroll: false })
  }, [principal, annualRate, period, periodType, compoundFrequency, monthlyDeposit, router, pathname])

  // ── Copy helpers ─────────────────────────────────────────────────────────
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

  const copyLink = useCallback(() => {
    copyToClipboard(window.location.href, 'link')
  }, [copyToClipboard])

  // ── Reset ────────────────────────────────────────────────────────────────
  const handleReset = useCallback(() => {
    setPrincipal(10000000)
    setAnnualRate(5)
    setPeriod(10)
    setPeriodType('years')
    setCompoundFrequency('yearly')
    setMonthlyDeposit(0)
    setScenarios(DEFAULT_SCENARIOS)
  }, [])

  // ── Main calculation ─────────────────────────────────────────────────────
  const results = useMemo(
    () => computeResults(principal, annualRate, period, periodType, compoundFrequency, monthlyDeposit),
    [principal, annualRate, period, periodType, compoundFrequency, monthlyDeposit]
  )

  const maxBalance = useMemo(() => Math.max(...results.yearlyBreakdown.map(d => d.balance), 1), [results.yearlyBreakdown])

  // ── Scenario calculations ────────────────────────────────────────────────
  const scenarioResults = useMemo(() =>
    scenarios.map(s => ({
      ...s,
      result: computeResults(principal, s.rate, period, periodType, compoundFrequency, monthlyDeposit),
    })),
    [scenarios, principal, period, periodType, compoundFrequency, monthlyDeposit]
  )

  const scenarioMax = useMemo(() =>
    Math.max(...scenarioResults.map(s => s.result.totalAmount), 1),
    [scenarioResults]
  )

  const updateScenarioRate = useCallback((id: number, rate: number) => {
    setScenarios(prev => prev.map(s => s.id === id ? { ...s, rate } : s))
  }, [])

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('title')}</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('description')}</p>
        </div>
        {/* Copy Link button */}
        <button
          onClick={copyLink}
          className="flex items-center gap-1.5 shrink-0 px-3 py-2 text-sm bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg transition-colors"
          title="현재 계산 결과 링크 복사"
        >
          {copiedId === 'link' ? <Check className="w-4 h-4 text-green-500" /> : <Link className="w-4 h-4" />}
          <span className="hidden sm:inline">{copiedId === 'link' ? '복사됨!' : '링크 복사'}</span>
        </button>
      </div>

      {/* Main Grid */}
      <div className="grid lg:grid-cols-3 gap-8">
        {/* Left Panel: Inputs */}
        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <Calculator className="w-5 h-5" />
                설정
              </h2>
              <button
                onClick={handleReset}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                title={t('common.reset')}
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>

            {/* Principal */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('principal')}
              </label>
              <input
                type="number"
                value={principal}
                onChange={(e) => setPrincipal(Number(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                min="0"
              />
            </div>

            {/* Annual Rate */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('rate')}
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={annualRate}
                  onChange={(e) => setAnnualRate(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                  min="0"
                  step="0.1"
                />
                <span className="text-gray-700 dark:text-gray-300">%</span>
              </div>
            </div>

            {/* Period */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('period')}
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  value={period}
                  onChange={(e) => setPeriod(Number(e.target.value))}
                  className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                  min="1"
                />
                <select
                  value={periodType}
                  onChange={(e) => setPeriodType(e.target.value as PeriodType)}
                  className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                >
                  <option value="years">{t('periodUnit.years')}</option>
                  <option value="months">{t('periodUnit.months')}</option>
                </select>
              </div>
            </div>

            {/* Compound Frequency */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('compoundFrequency')}
              </label>
              <select
                value={compoundFrequency}
                onChange={(e) => setCompoundFrequency(e.target.value as CompoundFrequency)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
              >
                <option value="yearly">{t('frequency.yearly')}</option>
                <option value="semiannually">{t('frequency.semiannually')}</option>
                <option value="quarterly">{t('frequency.quarterly')}</option>
                <option value="monthly">{t('frequency.monthly')}</option>
                <option value="daily">{t('frequency.daily')}</option>
              </select>
            </div>

            {/* Monthly Deposit */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('monthlyDeposit')}
              </label>
              <input
                type="number"
                value={monthlyDeposit}
                onChange={(e) => setMonthlyDeposit(Number(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                min="0"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {t('monthlyDepositDesc')}
              </p>
            </div>
          </div>

          {/* Guide Section */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 mt-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <BookOpen className="w-5 h-5" />
              {t('guide.title')}
            </h2>
            <div className="space-y-4 text-sm text-gray-600 dark:text-gray-300">
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                  {t('guide.howToUse.title')}
                </h3>
                <ul className="space-y-1 list-disc list-inside">
                  {(t.raw('guide.howToUse.items') as string[]).map((item, idx) => (
                    <li key={idx}>{item}</li>
                  ))}
                </ul>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                  {t('guide.tips.title')}
                </h3>
                <ul className="space-y-1 list-disc list-inside">
                  {(t.raw('guide.tips.items') as string[]).map((item, idx) => (
                    <li key={idx}>{item}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Right Panel: Results */}
        <div className="lg:col-span-2 space-y-6">
          {/* Total Results Cards */}
          <div className="grid md:grid-cols-2 gap-4">
            {/* Total Amount */}
            <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg p-6 text-white">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium opacity-90">{t('result.totalAmount')}</h3>
                <button
                  onClick={() => copyToClipboard(results.totalAmount.toFixed(0), 'totalAmount')}
                  className="text-white/80 hover:text-white"
                  title={t('common.copy')}
                >
                  {copiedId === 'totalAmount' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-3xl font-bold">₩{results.totalAmount.toLocaleString('ko-KR', { maximumFractionDigits: 0 })}</p>
            </div>

            {/* Total Interest */}
            <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl shadow-lg p-6 text-white">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium opacity-90">{t('result.totalInterest')}</h3>
                <button
                  onClick={() => copyToClipboard(results.totalInterest.toFixed(0), 'totalInterest')}
                  className="text-white/80 hover:text-white"
                  title={t('common.copy')}
                >
                  {copiedId === 'totalInterest' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-3xl font-bold">₩{results.totalInterest.toLocaleString('ko-KR', { maximumFractionDigits: 0 })}</p>
            </div>

            {/* Total Deposited */}
            <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl shadow-lg p-6 text-white">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium opacity-90">{t('result.totalDeposit')}</h3>
                <button
                  onClick={() => copyToClipboard(results.totalDeposited.toFixed(0), 'totalDeposited')}
                  className="text-white/80 hover:text-white"
                  title={t('common.copy')}
                >
                  {copiedId === 'totalDeposited' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-3xl font-bold">₩{results.totalDeposited.toLocaleString('ko-KR', { maximumFractionDigits: 0 })}</p>
            </div>

            {/* Effective Rate */}
            <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl shadow-lg p-6 text-white">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium opacity-90">{t('result.effectiveRate')}</h3>
                <button
                  onClick={() => copyToClipboard(results.effectiveRate.toFixed(2) + '%', 'effectiveRate')}
                  className="text-white/80 hover:text-white"
                  title={t('common.copy')}
                >
                  {copiedId === 'effectiveRate' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-3xl font-bold">{results.effectiveRate.toFixed(2)}%</p>
            </div>
          </div>

          {/* Simple vs Compound Comparison */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              {t('comparison.title')}
            </h2>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-600 dark:text-gray-300">{t('comparison.simple')}</span>
                <span className="font-semibold text-gray-900 dark:text-white">
                  ₩{results.simpleInterest.toLocaleString('ko-KR', { maximumFractionDigits: 0 })}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600 dark:text-gray-300">{t('comparison.compound')}</span>
                <span className="font-semibold text-gray-900 dark:text-white">
                  ₩{results.totalInterest.toLocaleString('ko-KR', { maximumFractionDigits: 0 })}
                </span>
              </div>
              <div className="border-t border-gray-200 dark:border-gray-700 pt-3 flex justify-between items-center">
                <span className="text-gray-600 dark:text-gray-300 font-medium">{t('comparison.difference')}</span>
                <span className="font-bold text-green-600 dark:text-green-400 text-lg">
                  +₩{results.compoundAdvantage.toLocaleString('ko-KR', { maximumFractionDigits: 0 })}
                </span>
              </div>
            </div>
          </div>

          {/* Growth Chart — stacked bars */}
          {results.yearlyBreakdown.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                {t('result.growthChart')}
              </h2>
              <GrowthChart yearlyBreakdown={results.yearlyBreakdown} maxBalance={maxBalance} />
            </div>
          )}

          {/* Scenario Comparison */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <GitCompare className="w-5 h-5" />
                금리 시나리오 비교
              </h2>
              <button
                onClick={() => setShowScenarios(v => !v)}
                className="text-sm px-3 py-1.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg transition-colors"
              >
                {showScenarios ? '접기' : '펼치기'}
              </button>
            </div>

            {/* Always-visible summary bars */}
            <div className="space-y-3">
              {scenarioResults.map((s, idx) => {
                const color = SCENARIO_COLORS[idx % SCENARIO_COLORS.length]
                const pct = (s.result.totalAmount / scenarioMax) * 100
                const depositPct = s.result.totalAmount > 0
                  ? (s.result.totalDeposited / s.result.totalAmount) * 100
                  : 100
                return (
                  <div key={s.id} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <span className={`inline-block w-3 h-3 rounded-sm ${color.bg}`} />
                        <span className="text-gray-700 dark:text-gray-300 font-medium">{s.rate}%</span>
                      </div>
                      <span className={`font-bold ${color.text}`}>
                        ₩{s.result.totalAmount.toLocaleString('ko-KR', { maximumFractionDigits: 0 })}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-5 overflow-hidden">
                      <div className="h-full flex rounded-full overflow-hidden" style={{ width: `${pct}%` }}>
                        <div className="h-full bg-blue-200 dark:bg-blue-900 transition-all duration-300" style={{ width: `${depositPct}%` }} />
                        <div className={`h-full ${color.bar} transition-all duration-300`} style={{ width: `${100 - depositPct}%` }} />
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Expandable rate editors + detail table */}
            {showScenarios && (
              <div className="mt-6 space-y-4">
                {/* Rate inputs */}
                <div className="grid grid-cols-3 gap-3">
                  {scenarios.map((s, idx) => {
                    const color = SCENARIO_COLORS[idx % SCENARIO_COLORS.length]
                    return (
                      <div key={s.id} className={`${color.light} rounded-lg p-3`}>
                        <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">
                          시나리오 {s.id} 금리
                        </label>
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            value={s.rate}
                            onChange={e => updateScenarioRate(s.id, Number(e.target.value))}
                            className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                            min="0"
                            step="0.5"
                          />
                          <span className={`text-sm font-medium ${color.text}`}>%</span>
                        </div>
                      </div>
                    )
                  })}
                </div>

                {/* Detail comparison table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="border-b border-gray-200 dark:border-gray-700">
                      <tr className="text-gray-600 dark:text-gray-300">
                        <th className="text-left py-2 px-2">항목</th>
                        {scenarioResults.map((s, idx) => (
                          <th key={s.id} className={`text-right py-2 px-2 ${SCENARIO_COLORS[idx % SCENARIO_COLORS.length].text}`}>
                            {s.rate}%
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                      <tr>
                        <td className="py-2 px-2 text-gray-600 dark:text-gray-300">최종 금액</td>
                        {scenarioResults.map(s => (
                          <td key={s.id} className="text-right py-2 px-2 font-semibold text-gray-900 dark:text-white">
                            ₩{s.result.totalAmount.toLocaleString('ko-KR', { maximumFractionDigits: 0 })}
                          </td>
                        ))}
                      </tr>
                      <tr>
                        <td className="py-2 px-2 text-gray-600 dark:text-gray-300">총 이자</td>
                        {scenarioResults.map((s, idx) => (
                          <td key={s.id} className={`text-right py-2 px-2 font-medium ${SCENARIO_COLORS[idx % SCENARIO_COLORS.length].text}`}>
                            ₩{s.result.totalInterest.toLocaleString('ko-KR', { maximumFractionDigits: 0 })}
                          </td>
                        ))}
                      </tr>
                      <tr>
                        <td className="py-2 px-2 text-gray-600 dark:text-gray-300">실질 수익률</td>
                        {scenarioResults.map(s => (
                          <td key={s.id} className="text-right py-2 px-2 text-gray-900 dark:text-white">
                            {s.result.effectiveRate.toFixed(2)}%
                          </td>
                        ))}
                      </tr>
                      <tr>
                        <td className="py-2 px-2 text-gray-600 dark:text-gray-300">복리 우위</td>
                        {scenarioResults.map(s => (
                          <td key={s.id} className="text-right py-2 px-2 text-green-600 dark:text-green-400">
                            +₩{s.result.compoundAdvantage.toLocaleString('ko-KR', { maximumFractionDigits: 0 })}
                          </td>
                        ))}
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          {/* Yearly Breakdown Table */}
          {results.yearlyBreakdown.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 overflow-x-auto">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                {t('result.yearlyBreakdown')}
              </h2>
              <table className="w-full text-sm">
                <thead className="border-b border-gray-200 dark:border-gray-700">
                  <tr className="text-gray-600 dark:text-gray-300">
                    <th className="text-left py-3 px-2">{t('result.year')}</th>
                    <th className="text-right py-3 px-2">{t('result.deposit')}</th>
                    <th className="text-right py-3 px-2">{t('result.interest')}</th>
                    <th className="text-right py-3 px-2">{t('result.balance')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {results.yearlyBreakdown.map((data) => (
                    <tr key={data.year} className="text-gray-900 dark:text-white">
                      <td className="py-3 px-2">{data.year}</td>
                      <td className="text-right py-3 px-2">
                        ₩{data.deposit.toLocaleString('ko-KR', { maximumFractionDigits: 0 })}
                      </td>
                      <td className="text-right py-3 px-2 text-green-600 dark:text-green-400">
                        ₩{data.interest.toLocaleString('ko-KR', { maximumFractionDigits: 0 })}
                      </td>
                      <td className="text-right py-3 px-2 font-semibold">
                        ₩{data.balance.toLocaleString('ko-KR', { maximumFractionDigits: 0 })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
