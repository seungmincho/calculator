'use client'

import { useState, useCallback, useEffect, useMemo } from 'react'
import { useTranslations } from 'next-intl'
import { useRouter, useSearchParams } from 'next/navigation'
import { Copy, Check, Link, RotateCcw, BookOpen, ChevronDown, ChevronUp, Calculator, TrendingUp, Clock, AlertTriangle } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Legend } from 'recharts'

// ── Constants ──
const A_VALUE = 2_861_091 // 2024년 전체 가입자 평균소득월액
const MIN_INCOME = 350_000 // 2025년 기준소득월액 하한
const MAX_INCOME = 5_900_000 // 2025년 기준소득월액 상한
const MIN_CONTRIBUTION_YEARS = 10 // 최소 가입 기간

// 소득대체율 (2025년 기준 42%, 매년 0.5%p 하락 → 2028년 40%)
const REPLACEMENT_RATE = 0.42

// 조기/연기 수령 조정
const EARLY_REDUCTION_PER_YEAR = 0.06 // 연 6% 감액
const DEFERRED_INCREASE_PER_YEAR = 0.072 // 연 7.2% 증액
const MAX_EARLY_YEARS = 5
const MAX_DEFERRED_YEARS = 5

// 출생연도별 수급개시연령
const PENSION_AGE_BRACKETS: { min: number; max: number; age: number }[] = [
  { min: 0, max: 1952, age: 60 },
  { min: 1953, max: 1956, age: 61 },
  { min: 1957, max: 1960, age: 62 },
  { min: 1961, max: 1964, age: 63 },
  { min: 1965, max: 1968, age: 64 },
  { min: 1969, max: 9999, age: 65 },
]

// ── Types ──
interface PensionResult {
  monthlyBasic: number
  earlyMonthly: number
  normalMonthly: number
  deferredMonthly: number
  earlyStartAge: number
  normalStartAge: number
  deferredStartAge: number
  earlyReductionRate: number
  deferredIncreaseRate: number
  contributionYears: number
  monthlyIncome: number
  bValue: number
}

// ── Helpers ──
function getPensionStartAge(birthYear: number): number {
  for (const bracket of PENSION_AGE_BRACKETS) {
    if (birthYear <= bracket.max) return bracket.age
  }
  return 65
}

function calculatePension(birthYear: number, contributionYears: number, monthlyIncome: number): PensionResult | null {
  if (contributionYears < MIN_CONTRIBUTION_YEARS) return null

  const B = Math.max(MIN_INCOME, Math.min(MAX_INCOME, monthlyIncome))
  const n = Math.max(0, contributionYears - 20)

  // 기본연금액(월) = {소득대체율 × (A + B) × (1 + 0.05n)} / 12
  const monthlyBasic = Math.round((REPLACEMENT_RATE * (A_VALUE + B) * (1 + 0.05 * n)) / 12)

  const normalStartAge = getPensionStartAge(birthYear)
  const earlyStartAge = normalStartAge - MAX_EARLY_YEARS
  const deferredStartAge = normalStartAge + MAX_DEFERRED_YEARS

  const earlyReductionRate = EARLY_REDUCTION_PER_YEAR * MAX_EARLY_YEARS // 30%
  const deferredIncreaseRate = DEFERRED_INCREASE_PER_YEAR * MAX_DEFERRED_YEARS // 36%

  const earlyMonthly = Math.round(monthlyBasic * (1 - earlyReductionRate))
  const normalMonthly = monthlyBasic
  const deferredMonthly = Math.round(monthlyBasic * (1 + deferredIncreaseRate))

  return {
    monthlyBasic,
    earlyMonthly,
    normalMonthly,
    deferredMonthly,
    earlyStartAge,
    normalStartAge,
    deferredStartAge,
    earlyReductionRate,
    deferredIncreaseRate,
    contributionYears,
    monthlyIncome: B,
    bValue: B,
  }
}

function formatKRW(value: number): string {
  if (value >= 100_000_000) {
    const eok = Math.floor(value / 100_000_000)
    const remainder = value % 100_000_000
    if (remainder >= 10_000) {
      const man = Math.floor(remainder / 10_000)
      return `${eok}억 ${man.toLocaleString()}만`
    }
    return `${eok}억`
  }
  if (value >= 10_000) {
    const man = Math.floor(value / 10_000)
    return `${man.toLocaleString()}만`
  }
  return value.toLocaleString()
}

function formatNumber(num: number): string {
  return num.toLocaleString()
}

// ── Component ──
export default function NationalPensionCalculator() {
  const t = useTranslations('nationalPension')
  const router = useRouter()
  const searchParams = useSearchParams()

  // Input state
  const [birthYear, setBirthYear] = useState(1970)
  const [contributionYears, setContributionYears] = useState(20)
  const [monthlyIncome, setMonthlyIncome] = useState('3000000')
  const [result, setResult] = useState<PensionResult | null>(null)
  const [linkCopied, setLinkCopied] = useState(false)
  const [showGuide, setShowGuide] = useState(false)
  const [showFaq, setShowFaq] = useState(false)

  // Birth year options
  const birthYearOptions = useMemo(() => {
    const options: number[] = []
    for (let y = 1950; y <= 2005; y++) options.push(y)
    return options
  }, [])

  // Auto-calculated pension start age
  const pensionStartAge = useMemo(() => getPensionStartAge(birthYear), [birthYear])

  // URL param sync - restore
  useEffect(() => {
    const birth = searchParams.get('birth')
    const years = searchParams.get('years')
    const income = searchParams.get('income')
    let changed = false
    if (birth && /^\d{4}$/.test(birth)) {
      const b = Number(birth)
      if (b >= 1950 && b <= 2005) { setBirthYear(b); changed = true }
    }
    if (years && /^\d+$/.test(years)) {
      const y = Number(years)
      if (y >= 1 && y <= 40) { setContributionYears(y); changed = true }
    }
    if (income && /^\d+$/.test(income)) {
      const i = Number(income)
      if (i >= MIN_INCOME && i <= MAX_INCOME) { setMonthlyIncome(income); changed = true }
    }
    if (changed) {
      const b = birth ? Number(birth) : 1970
      const y = years ? Number(years) : 20
      const i = income ? Number(income) : 3_000_000
      const res = calculatePension(b, y, i)
      setResult(res)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // URL param sync - update
  const updateURL = useCallback((birth: number, years: number, income: string) => {
    const params = new URLSearchParams()
    params.set('birth', String(birth))
    params.set('years', String(years))
    params.set('income', income.replace(/,/g, ''))
    router.replace(`?${params.toString()}`, { scroll: false })
  }, [router])

  const handleCalculate = useCallback(() => {
    const incomeNum = Number(monthlyIncome.replace(/,/g, ''))
    if (!incomeNum || incomeNum <= 0) return
    const res = calculatePension(birthYear, contributionYears, incomeNum)
    setResult(res)
    updateURL(birthYear, contributionYears, monthlyIncome)
  }, [birthYear, contributionYears, monthlyIncome, updateURL])

  const handleReset = useCallback(() => {
    setBirthYear(1970)
    setContributionYears(20)
    setMonthlyIncome('3000000')
    setResult(null)
    router.replace('?', { scroll: false })
  }, [router])

  const copyLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(window.location.href)
      setLinkCopied(true)
      setTimeout(() => setLinkCopied(false), 2000)
    } catch { /* ignore */ }
  }, [])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleCalculate()
  }, [handleCalculate])

  const incomeNum = Number(monthlyIncome.replace(/,/g, '')) || 0
  const isUnderMinContribution = contributionYears < MIN_CONTRIBUTION_YEARS

  // ── Chart Data ──
  const totalComparisonData = useMemo(() => {
    if (!result) return []
    const ages = [80, 85, 90]
    return ages.map(targetAge => {
      const earlyYears = Math.max(0, targetAge - result.earlyStartAge)
      const normalYears = Math.max(0, targetAge - result.normalStartAge)
      const deferredYears = Math.max(0, targetAge - result.deferredStartAge)
      return {
        label: `${targetAge}${t('age')}`,
        [t('earlyPension')]: earlyYears * result.earlyMonthly * 12,
        [t('normalPension')]: normalYears * result.normalMonthly * 12,
        [t('deferredPension')]: deferredYears * result.deferredMonthly * 12,
      }
    })
  }, [result, t])

  const cumulativeData = useMemo(() => {
    if (!result) return []
    const data: { age: number; early: number; normal: number; deferred: number }[] = []
    let earlyTotal = 0
    let normalTotal = 0
    let deferredTotal = 0
    const startAge = result.earlyStartAge
    for (let age = startAge; age <= 95; age++) {
      if (age >= result.earlyStartAge) earlyTotal += result.earlyMonthly * 12
      if (age >= result.normalStartAge) normalTotal += result.normalMonthly * 12
      if (age >= result.deferredStartAge) deferredTotal += result.deferredMonthly * 12
      data.push({ age, early: earlyTotal, normal: normalTotal, deferred: deferredTotal })
    }
    return data
  }, [result])

  // Chart tooltip formatter
  const chartTooltipFormatter = useCallback((value: number) => {
    return `${formatKRW(value)}${t('won')}`
  }, [t])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
            {t('title')}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('description')}</p>
        </div>
        <button
          onClick={copyLink}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg transition-colors shrink-0"
        >
          {linkCopied ? <Check className="w-4 h-4 text-green-500" /> : <Link className="w-4 h-4" />}
          {linkCopied ? t('linkCopied') : t('copyLink')}
        </button>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* ── Left: Input Panel ── */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 space-y-4">
            {/* 출생연도 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('birthYear')}
              </label>
              <select
                value={birthYear}
                onChange={(e) => setBirthYear(Number(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
              >
                {birthYearOptions.map(y => (
                  <option key={y} value={y}>{y}{t('year')}</option>
                ))}
              </select>
            </div>

            {/* 가입기간 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('contributionYears')}
              </label>
              <div className="relative">
                <input
                  type="number"
                  min={1}
                  max={40}
                  value={contributionYears}
                  onChange={(e) => setContributionYears(Math.max(1, Math.min(40, Number(e.target.value) || 1)))}
                  onKeyDown={handleKeyDown}
                  className="w-full px-3 py-2 pr-12 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 text-sm">
                  {t('yearUnit')}
                </span>
              </div>
              {isUnderMinContribution && (
                <p className="flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400 mt-1">
                  <AlertTriangle className="w-3 h-3" />
                  {t('minContribution')}
                </p>
              )}
            </div>

            {/* 월 평균 소득 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('monthlyIncome')}
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={incomeNum > 0 ? formatNumber(incomeNum) : ''}
                  onChange={(e) => {
                    const raw = e.target.value.replace(/,/g, '').replace(/[^\d]/g, '')
                    setMonthlyIncome(raw)
                  }}
                  onKeyDown={handleKeyDown}
                  placeholder="3,000,000"
                  className="w-full px-3 py-2 pr-12 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 text-sm">
                  {t('won')}
                </span>
              </div>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                {t('incomeMin')}: {formatNumber(MIN_INCOME)}{t('won')} ~ {t('incomeMax')}: {formatNumber(MAX_INCOME)}{t('won')}
              </p>
            </div>

            {/* 수급개시연령 (auto) */}
            <div className="bg-blue-50 dark:bg-blue-950 rounded-lg p-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {t('pensionStartAge')}
                </span>
                <span className="text-lg font-bold text-blue-600 dark:text-blue-400">
                  {pensionStartAge}{t('age')}
                </span>
              </div>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                {t('autoCalculated')}
              </p>
            </div>

            {/* Action buttons */}
            <div className="flex gap-2">
              <button
                onClick={handleCalculate}
                disabled={isUnderMinContribution || incomeNum <= 0}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg font-bold hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                <Calculator className="w-5 h-5" />
                {t('calculate')}
              </button>
              <button
                onClick={handleReset}
                className="flex items-center justify-center gap-1 px-4 py-3 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg transition-colors"
              >
                <RotateCcw className="w-4 h-4" />
                {t('reset')}
              </button>
            </div>
          </div>
        </div>

        {/* ── Right: Result Panel ── */}
        <div className="lg:col-span-2 space-y-6">
          {!result && (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-12 text-center">
              <TrendingUp className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400 dark:text-gray-500 text-lg">{t('enterToCalculate')}</p>
            </div>
          )}

          {result && (
            <>
              {/* 3가지 수령 방식 비교 카드 */}
              <div className="grid sm:grid-cols-3 gap-4">
                {/* 조기수령 */}
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden">
                  <div className="bg-gradient-to-r from-amber-500 to-orange-500 px-4 py-3">
                    <div className="flex items-center gap-2 text-white">
                      <Clock className="w-5 h-5" />
                      <span className="font-bold">{t('earlyPension')}</span>
                    </div>
                    <p className="text-amber-100 text-xs mt-0.5">{t('earlyDesc')}</p>
                  </div>
                  <div className="p-4 space-y-3">
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{t('startAge')}</p>
                      <p className="text-lg font-bold text-gray-900 dark:text-white">{result.earlyStartAge}{t('age')}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{t('monthlyAmount')}</p>
                      <p className="text-xl font-bold text-amber-600 dark:text-amber-400">
                        {formatNumber(result.earlyMonthly)}{t('won')}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{t('yearlyAmount')}</p>
                      <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        {formatKRW(result.earlyMonthly * 12)}{t('won')}
                      </p>
                    </div>
                    <div className="pt-2 border-t border-gray-100 dark:border-gray-700">
                      <p className="text-xs text-red-500 dark:text-red-400">
                        {t('earlyReduction')}: -{Math.round(result.earlyReductionRate * 100)}%
                      </p>
                    </div>
                  </div>
                </div>

                {/* 정상수령 */}
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden ring-2 ring-blue-500">
                  <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-3">
                    <div className="flex items-center gap-2 text-white">
                      <TrendingUp className="w-5 h-5" />
                      <span className="font-bold">{t('normalPension')}</span>
                      <span className="ml-auto text-xs bg-white/20 px-2 py-0.5 rounded-full">{t('recommended')}</span>
                    </div>
                    <p className="text-blue-100 text-xs mt-0.5">{t('normalDesc')}</p>
                  </div>
                  <div className="p-4 space-y-3">
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{t('startAge')}</p>
                      <p className="text-lg font-bold text-gray-900 dark:text-white">{result.normalStartAge}{t('age')}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{t('monthlyAmount')}</p>
                      <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                        {formatNumber(result.normalMonthly)}{t('won')}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{t('yearlyAmount')}</p>
                      <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        {formatKRW(result.normalMonthly * 12)}{t('won')}
                      </p>
                    </div>
                    <div className="pt-2 border-t border-gray-100 dark:border-gray-700">
                      <p className="text-xs text-blue-500 dark:text-blue-400">
                        {t('standardAmount')}
                      </p>
                    </div>
                  </div>
                </div>

                {/* 연기수령 */}
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden">
                  <div className="bg-gradient-to-r from-emerald-500 to-teal-500 px-4 py-3">
                    <div className="flex items-center gap-2 text-white">
                      <TrendingUp className="w-5 h-5" />
                      <span className="font-bold">{t('deferredPension')}</span>
                    </div>
                    <p className="text-emerald-100 text-xs mt-0.5">{t('deferredDesc')}</p>
                  </div>
                  <div className="p-4 space-y-3">
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{t('startAge')}</p>
                      <p className="text-lg font-bold text-gray-900 dark:text-white">{result.deferredStartAge}{t('age')}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{t('monthlyAmount')}</p>
                      <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
                        {formatNumber(result.deferredMonthly)}{t('won')}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{t('yearlyAmount')}</p>
                      <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        {formatKRW(result.deferredMonthly * 12)}{t('won')}
                      </p>
                    </div>
                    <div className="pt-2 border-t border-gray-100 dark:border-gray-700">
                      <p className="text-xs text-emerald-500 dark:text-emerald-400">
                        {t('deferredIncrease')}: +{Math.round(result.deferredIncreaseRate * 100)}%
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* 총 수령액 비교 (BarChart) */}
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
                <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-1">
                  {t('totalComparison')}
                </h2>
                <p className="text-xs text-gray-400 dark:text-gray-500 mb-4">
                  {t('totalBy80')} / {t('totalBy85')} / {t('totalBy90')}
                </p>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={totalComparisonData} margin={{ top: 10, right: 10, left: 10, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                      <YAxis
                        tick={{ fontSize: 11 }}
                        tickFormatter={(v: number) => formatKRW(v)}
                      />
                      <Tooltip
                        formatter={(value) => chartTooltipFormatter(Number(value))}
                        contentStyle={{
                          backgroundColor: 'var(--tooltip-bg, #fff)',
                          borderColor: '#e5e7eb',
                          borderRadius: '8px',
                          fontSize: '12px',
                        }}
                      />
                      <Legend wrapperStyle={{ fontSize: '12px' }} />
                      <Bar dataKey={t('earlyPension')} fill="#f59e0b" radius={[4, 4, 0, 0]} />
                      <Bar dataKey={t('normalPension')} fill="#3b82f6" radius={[4, 4, 0, 0]} />
                      <Bar dataKey={t('deferredPension')} fill="#10b981" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* 누적 수령액 시뮬레이션 (LineChart) */}
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
                <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-1">
                  {t('cumulativeChart')}
                </h2>
                <p className="text-xs text-gray-400 dark:text-gray-500 mb-4">
                  {t('cumulativeDesc')}
                </p>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={cumulativeData} margin={{ top: 10, right: 10, left: 10, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis
                        dataKey="age"
                        tick={{ fontSize: 11 }}
                        label={{ value: t('age'), position: 'insideBottomRight', offset: -5, fontSize: 11 }}
                      />
                      <YAxis
                        tick={{ fontSize: 11 }}
                        tickFormatter={(v: number) => formatKRW(v)}
                      />
                      <Tooltip
                        labelFormatter={(label) => `${label}${t('age')}`}
                        formatter={(value, name) => [chartTooltipFormatter(Number(value)), name]}
                        contentStyle={{
                          backgroundColor: 'var(--tooltip-bg, #fff)',
                          borderColor: '#e5e7eb',
                          borderRadius: '8px',
                          fontSize: '12px',
                        }}
                      />
                      <Legend wrapperStyle={{ fontSize: '12px' }} />
                      <Line
                        type="monotone"
                        dataKey="early"
                        name={t('earlyPension')}
                        stroke="#f59e0b"
                        strokeWidth={2}
                        dot={false}
                      />
                      <Line
                        type="monotone"
                        dataKey="normal"
                        name={t('normalPension')}
                        stroke="#3b82f6"
                        strokeWidth={2}
                        dot={false}
                      />
                      <Line
                        type="monotone"
                        dataKey="deferred"
                        name={t('deferredPension')}
                        stroke="#10b981"
                        strokeWidth={2}
                        dot={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* 계산 상세 정보 */}
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
                <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
                  {t('calculationDetails')}
                </h2>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{t('aValue')}</p>
                    <p className="text-sm font-bold text-gray-900 dark:text-white">
                      {formatNumber(A_VALUE)}{t('won')}
                    </p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{t('aValueDesc')}</p>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{t('bValue')}</p>
                    <p className="text-sm font-bold text-gray-900 dark:text-white">
                      {formatNumber(result.bValue)}{t('won')}
                    </p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{t('bValueDesc')}</p>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{t('replacementRate')}</p>
                    <p className="text-sm font-bold text-gray-900 dark:text-white">
                      {REPLACEMENT_RATE * 100}% ({t('year2025')})
                    </p>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{t('extraYears')}</p>
                    <p className="text-sm font-bold text-gray-900 dark:text-white">
                      {Math.max(0, contributionYears - 20)}{t('yearUnit')} (n)
                    </p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{t('extraYearsDesc')}</p>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── Guide Section ── */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg">
        <button
          onClick={() => setShowGuide(!showGuide)}
          className="w-full flex items-center justify-between p-6"
        >
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">{t('guide.title')}</h2>
          </div>
          {showGuide ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
        </button>
        {showGuide && (
          <div className="px-6 pb-6 space-y-6">
            {/* 계산 공식 */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                {t('guide.formula.title')}
              </h3>
              <ul className="space-y-2">
                {(t.raw('guide.formula.items') as string[]).map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-300">
                    <span className="text-blue-500 mt-0.5">•</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* 조기 vs 연기 */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                {t('guide.earlyVsDeferred.title')}
              </h3>
              <ul className="space-y-2">
                {(t.raw('guide.earlyVsDeferred.items') as string[]).map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-300">
                    <span className="text-blue-500 mt-0.5">•</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* 수급 자격 */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                {t('guide.requirements.title')}
              </h3>
              <ul className="space-y-2">
                {(t.raw('guide.requirements.items') as string[]).map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-300">
                    <span className="text-blue-500 mt-0.5">•</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>

      {/* ── FAQ Section ── */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg">
        <button
          onClick={() => setShowFaq(!showFaq)}
          className="w-full flex items-center justify-between p-6"
        >
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">{t('faqTitle')}</h2>
          {showFaq ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
        </button>
        {showFaq && (
          <div className="px-6 pb-6 space-y-4">
            {[1, 2, 3].map(n => (
              <div key={n} className="border-b border-gray-100 dark:border-gray-700 pb-4 last:border-0 last:pb-0">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                  Q. {t(`faq.q${n}.question`)}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
                  {t(`faq.q${n}.answer`)}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
