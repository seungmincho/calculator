'use client'

import { useState, useMemo, useCallback, useEffect, Suspense } from 'react'
import { useTranslations } from '@/lib/i18n'
import { useRouter, usePathname } from 'next/navigation'
import { useSearchParams } from '@/hooks/useSearchParams'
import { DollarSign, Clock, TrendingUp, BookOpen, ArrowRightLeft, Link, Check } from 'lucide-react'
import { glassCard, glassInset, glassInput } from '@/lib/glass'

type InputType = 'hourly' | 'daily' | 'monthly' | 'yearly'

// 2026년 최저임금 시급 10,320원 (고용노동부 고시)
const MINIMUM_WAGE_2026 = 10320
const MIN_WAGE_COMPARE = MINIMUM_WAGE_2026
const AVG_ANNUAL_SALARY_KR = 42_000_000 // 한국 근로자 평균 연봉 약 4,200만원 (2024 기준)

function HourlyWageInner() {
  const t = useTranslations('hourlyWage')
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()

  // --- State initialised from URL params ---
  const [inputType, setInputType] = useState<InputType>(
    () => (searchParams.get('type') as InputType) || 'hourly'
  )
  const [amount, setAmount] = useState<string>(() => {
    const w = searchParams.get('wage')
    return w ? parseInt(w).toLocaleString('ko-KR') : ''
  })
  const [hoursPerDay, setHoursPerDay] = useState<number>(() => {
    const h = parseFloat(searchParams.get('hours') || '')
    return h > 0 ? h : 8
  })
  const [daysPerWeek, setDaysPerWeek] = useState<number>(() => {
    const d = parseFloat(searchParams.get('days') || '')
    return d > 0 && d <= 7 ? d : 5
  })
  const [daysPerMonth, setDaysPerMonth] = useState<number>(() => {
    const dm = parseFloat(searchParams.get('dpm') || '')
    return dm > 0 ? dm : 21.74
  })

  const [copied, setCopied] = useState(false)

  // --- Sync URL whenever inputs change ---
  const updateURL = useCallback(
    (
      type: InputType,
      wage: string,
      hours: number,
      days: number,
      dpm: number
    ) => {
      const rawWage = wage.replace(/,/g, '')
      const params = new URLSearchParams()
      if (rawWage) params.set('wage', rawWage)
      if (type !== 'hourly') params.set('type', type)
      if (hours !== 8) params.set('hours', String(hours))
      if (days !== 5) params.set('days', String(days))
      if (dpm !== 21.74) params.set('dpm', String(dpm))
      const qs = params.toString()
      router.replace(`${pathname}${qs ? '?' + qs : ''}`, { scroll: false })
    },
    [router, pathname]
  )

  // Debounce URL update to avoid rapid-fire history entries
  useEffect(() => {
    const id = setTimeout(() => {
      updateURL(inputType, amount, hoursPerDay, daysPerWeek, daysPerMonth)
    }, 300)
    return () => clearTimeout(id)
  }, [inputType, amount, hoursPerDay, daysPerWeek, daysPerMonth, updateURL])

  // --- Calculations ---
  const results = useMemo(() => {
    const inputAmount = parseFloat(amount.replace(/,/g, ''))
    if (!inputAmount || inputAmount <= 0) {
      return { hourly: 0, daily: 0, monthly: 0, yearly: 0 }
    }

    let hourlyWage = 0
    switch (inputType) {
      case 'hourly':
        hourlyWage = inputAmount
        break
      case 'daily':
        hourlyWage = inputAmount / hoursPerDay
        break
      case 'monthly':
        hourlyWage = inputAmount / (hoursPerDay * daysPerMonth)
        break
      case 'yearly':
        hourlyWage = inputAmount / 12 / (hoursPerDay * daysPerMonth)
        break
    }

    const dailyWage = hourlyWage * hoursPerDay
    const monthlyWage = hourlyWage * hoursPerDay * daysPerMonth
    const yearlyWage = monthlyWage * 12

    return { hourly: hourlyWage, daily: dailyWage, monthly: monthlyWage, yearly: yearlyWage }
  }, [amount, inputType, hoursPerDay, daysPerMonth])

  // Annual projection: hourly × hours/day × days/week × 52
  const annualProjection = useMemo(() => {
    if (results.hourly === 0) return 0
    return results.hourly * hoursPerDay * daysPerWeek * 52
  }, [results.hourly, hoursPerDay, daysPerWeek])

  // Minimum wage comparison (2025: 9,860원)
  const minimumWageComparison = useMemo(() => {
    if (results.hourly === 0) return { percent: 0, isAbove: false, diff: 0, barWidth: 0 }
    const percent = Math.round((results.hourly / MIN_WAGE_COMPARE) * 100)
    const isAbove = results.hourly >= MIN_WAGE_COMPARE
    const diff = Math.round(results.hourly - MIN_WAGE_COMPARE)
    // bar: user wage fills relative to max(user, minWage) capped at 150%
    const maxVal = Math.max(results.hourly, MIN_WAGE_COMPARE)
    const barWidth = Math.min(Math.round((results.hourly / maxVal) * 100), 100)
    return { percent, isAbove, diff, barWidth }
  }, [results.hourly])

  // Annual salary comparison vs average
  const annualComparison = useMemo(() => {
    if (annualProjection === 0) return { percent: 0, isAbove: false, diff: 0, barWidth: 0 }
    const percent = Math.round((annualProjection / AVG_ANNUAL_SALARY_KR) * 100)
    const isAbove = annualProjection >= AVG_ANNUAL_SALARY_KR
    const diff = Math.round(annualProjection - AVG_ANNUAL_SALARY_KR)
    const maxVal = Math.max(annualProjection, AVG_ANNUAL_SALARY_KR)
    const barWidth = Math.min(Math.round((annualProjection / maxVal) * 100), 100)
    return { percent, isAbove, diff, barWidth }
  }, [annualProjection])

  // --- Handlers ---
  const handleReset = () => {
    setInputType('hourly')
    setAmount('')
    setHoursPerDay(8)
    setDaysPerWeek(5)
    setDaysPerMonth(21.74)
  }

  const handleCopyLink = useCallback(async () => {
    const url = window.location.href
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url)
      } else {
        const ta = document.createElement('textarea')
        ta.value = url
        ta.style.position = 'fixed'
        ta.style.left = '-999999px'
        document.body.appendChild(ta)
        ta.select()
        document.execCommand('copy')
        document.body.removeChild(ta)
      }
    } catch {
      // silent
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [])

  const formatCurrency = (value: number) => Math.round(value).toLocaleString('ko-KR')

  const showResults = results.hourly > 0

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-fg">{t('title')}</h1>
          <p className="text-sm text-muted mt-1">{t('description')}</p>
        </div>
        {/* Copy Link Button */}
        <button
          onClick={handleCopyLink}
          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-soft hover:bg-gray-200 dark:hover:bg-gray-600 text-body text-sm font-medium transition-colors shrink-0"
          title="링크 복사"
        >
          {copied ? (
            <>
              <Check className="w-4 h-4 text-green-500" />
              <span className="text-green-600 dark:text-green-400">복사됨</span>
            </>
          ) : (
            <>
              <Link className="w-4 h-4" />
              <span>링크 복사</span>
            </>
          )}
        </button>
      </div>

      {/* Main Grid */}
      <div className="grid lg:grid-cols-3 gap-8">
        {/* Settings Panel */}
        <div className="lg:col-span-1">
          <div className={`${glassCard} ${glassInset} p-6 space-y-4`}>
            <div className="flex items-center gap-2 mb-4">
              <ArrowRightLeft className="w-5 h-5 text-blue-600" />
              <h2 className="text-lg font-semibold text-fg">
                {t('inputType')}
              </h2>
            </div>

            {/* Input Type Selector */}
            <div>
              <label className="block text-sm font-medium text-body mb-2">
                {t('inputType')}
              </label>
              <div className="grid grid-cols-2 gap-2">
                {(['hourly', 'daily', 'monthly', 'yearly'] as InputType[]).map((type) => (
                  <button
                    key={type}
                    onClick={() => setInputType(type)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      inputType === type
                        ? 'bg-primary hover:bg-blue-700 text-white'
                        : 'bg-soft text-body hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                  >
                    {t(type)}
                  </button>
                ))}
              </div>
            </div>

            {/* Amount Input */}
            <div>
              <label className="block text-sm font-medium text-body mb-2">
                {t('amount')}
              </label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={amount}
                  onChange={(e) => {
                    const value = e.target.value.replace(/,/g, '')
                    if (value === '' || /^\d+$/.test(value)) {
                      setAmount(value ? parseInt(value).toLocaleString('ko-KR') : '')
                    }
                  }}
                  placeholder={t('amountPlaceholder')}
                  className={`${glassInput} pl-10 pr-3 py-2`}
                />
              </div>
            </div>

            {/* Work Settings */}
            <div className="pt-4 border-t border-line">
              <div className="flex items-center gap-2 mb-3">
                <Clock className="w-4 h-4 text-gray-500" />
                <h3 className="text-sm font-semibold text-fg">
                  Work Settings
                </h3>
              </div>

              {/* Hours per Day */}
              <div className="mb-3">
                <label className="block text-sm font-medium text-body mb-1">
                  {t('workHoursPerDay')}
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={hoursPerDay}
                    onChange={(e) => setHoursPerDay(Math.max(1, parseFloat(e.target.value) || 1))}
                    min="1"
                    max="24"
                    step="0.5"
                    className={`${glassInput} px-3 py-2`}
                  />
                  <span className="text-sm text-muted whitespace-nowrap">
                    {t('hours')}
                  </span>
                </div>
              </div>

              {/* Days per Week */}
              <div className="mb-3">
                <label className="block text-sm font-medium text-body mb-1">
                  {t('workDaysPerWeek')}
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={daysPerWeek}
                    onChange={(e) =>
                      setDaysPerWeek(Math.max(1, Math.min(7, parseFloat(e.target.value) || 1)))
                    }
                    min="1"
                    max="7"
                    step="0.5"
                    className={`${glassInput} px-3 py-2`}
                  />
                  <span className="text-sm text-muted whitespace-nowrap">
                    {t('days')}
                  </span>
                </div>
              </div>

              {/* Days per Month */}
              <div>
                <label className="block text-sm font-medium text-body mb-1">
                  {t('workDaysPerMonth')}
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={daysPerMonth}
                    onChange={(e) =>
                      setDaysPerMonth(Math.max(1, parseFloat(e.target.value) || 1))
                    }
                    min="1"
                    max="31"
                    step="0.01"
                    className={`${glassInput} px-3 py-2`}
                  />
                  <span className="text-sm text-muted whitespace-nowrap">
                    {t('days')}
                  </span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 pt-4">
              <button
                onClick={handleReset}
                className="flex-1 bg-soft hover:bg-gray-200 dark:hover:bg-gray-600 text-body rounded-lg px-4 py-2 font-medium transition-colors"
              >
                {t('reset')}
              </button>
            </div>
          </div>
        </div>

        {/* Results Panel */}
        <div className="lg:col-span-2">
          <div className={`${glassCard} ${glassInset} p-6`}>
            <h2 className="text-xl font-semibold text-fg mb-6">
              {t('result.title')}
            </h2>

            {showResults ? (
              <div className="space-y-4">
                {/* Hourly Wage */}
                <div className="bg-subtle rounded-xl p-4 border-t-4 border-blue-600">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm text-sub">
                        {t('result.hourlyWage')}
                      </div>
                      <div className="text-2xl font-bold text-fg mt-1">
                        {formatCurrency(results.hourly)}{' '}
                        <span className="text-lg">{t('result.won')}</span>
                      </div>
                    </div>
                    <Clock className="w-8 h-8 text-blue-600" />
                  </div>
                </div>

                {/* Daily Wage */}
                <div className="bg-subtle rounded-xl p-4 border-t-4 border-green-600">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm text-sub">
                        {t('result.dailyWage')}
                      </div>
                      <div className="text-2xl font-bold text-fg mt-1">
                        {formatCurrency(results.daily)}{' '}
                        <span className="text-lg">{t('result.won')}</span>
                      </div>
                    </div>
                    <DollarSign className="w-8 h-8 text-green-600" />
                  </div>
                </div>

                {/* Monthly Wage */}
                <div className="bg-subtle rounded-xl p-4 border-t-4 border-purple-600">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm text-sub">
                        {t('result.monthlyWage')}
                      </div>
                      <div className="text-2xl font-bold text-fg mt-1">
                        {formatCurrency(results.monthly)}{' '}
                        <span className="text-lg">{t('result.won')}</span>
                      </div>
                    </div>
                    <TrendingUp className="w-8 h-8 text-purple-600" />
                  </div>
                </div>

                {/* Yearly Wage */}
                <div className="bg-subtle rounded-xl p-4 border-t-4 border-orange-600">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm text-sub">
                        {t('result.yearlyWage')}
                      </div>
                      <div className="text-2xl font-bold text-fg mt-1">
                        {formatCurrency(results.yearly)}{' '}
                        <span className="text-lg">{t('result.won')}</span>
                      </div>
                    </div>
                    <TrendingUp className="w-8 h-8 text-orange-600" />
                  </div>
                </div>

                {/* ── NEW: Minimum Wage Visual Comparison Bar ── */}
                <div className="bg-subtle rounded-xl p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-fg">
                      2025년 최저임금 비교
                    </h3>
                    <span
                      className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                        minimumWageComparison.isAbove
                          ? 'bg-soft text-sub'
                          : 'bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300'
                      }`}
                    >
                      {minimumWageComparison.isAbove ? '최저임금 이상' : '최저임금 미달'}
                    </span>
                  </div>

                  {/* Bar: user wage */}
                  <div>
                    <div className="flex justify-between text-xs text-muted mb-1">
                      <span>내 시급 {formatCurrency(results.hourly)}원</span>
                      <span>{minimumWageComparison.percent}%</span>
                    </div>
                    <div className="relative h-4 bg-track rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          minimumWageComparison.isAbove
                            ? 'bg-green-500'
                            : 'bg-red-500'
                        }`}
                        style={{ width: `${minimumWageComparison.barWidth}%` }}
                      />
                    </div>
                  </div>

                  {/* Bar: minimum wage (always 100% of itself) */}
                  <div>
                    <div className="flex justify-between text-xs text-muted mb-1">
                      <span>최저임금 9,860원</span>
                      <span>기준</span>
                    </div>
                    <div className="relative h-4 bg-track rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full bg-blue-400"
                        style={{
                          width: `${Math.min(
                            Math.round(
                              (MIN_WAGE_COMPARE / Math.max(results.hourly, MIN_WAGE_COMPARE)) * 100
                            ),
                            100
                          )}%`,
                        }}
                      />
                    </div>
                  </div>

                  <p className={`text-sm font-medium ${
                    minimumWageComparison.isAbove
                      ? 'text-green-700 dark:text-green-400'
                      : 'text-red-700 dark:text-red-400'
                  }`}>
                    {minimumWageComparison.isAbove
                      ? `최저임금보다 ${formatCurrency(minimumWageComparison.diff)}원 높습니다`
                      : `최저임금보다 ${formatCurrency(Math.abs(minimumWageComparison.diff))}원 부족합니다`}
                  </p>
                </div>

                {/* ── NEW: Annual Salary Projection ── */}
                <div className="bg-subtle rounded-xl p-5 space-y-3 border border-line">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-fg">
                      연봉 환산 예상 (주 52주 기준)
                    </h3>
                    <span
                      className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                        annualComparison.isAbove
                          ? 'bg-soft text-sub'
                          : 'bg-soft text-sub'
                      }`}
                    >
                      {annualComparison.isAbove ? '평균 이상' : '평균 미만'}
                    </span>
                  </div>

                  <div className="text-2xl font-bold text-sub">
                    {formatCurrency(annualProjection)}원
                    <span className="text-sm font-normal text-muted ml-2">
                      / 년
                    </span>
                  </div>

                  <p className="text-xs text-muted">
                    시급 {formatCurrency(results.hourly)}원 × {hoursPerDay}시간 × {daysPerWeek}일 × 52주
                  </p>

                  {/* Bar: annual projection */}
                  <div>
                    <div className="flex justify-between text-xs text-muted mb-1">
                      <span>내 예상 연봉</span>
                      <span>{annualComparison.percent}%</span>
                    </div>
                    <div className="relative h-4 bg-track rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          annualComparison.isAbove ? 'bg-green-500' : 'bg-orange-400'
                        }`}
                        style={{ width: `${annualComparison.barWidth}%` }}
                      />
                    </div>
                  </div>

                  {/* Bar: average salary */}
                  <div>
                    <div className="flex justify-between text-xs text-muted mb-1">
                      <span>한국 평균 연봉 4,200만원</span>
                      <span>기준</span>
                    </div>
                    <div className="relative h-4 bg-track rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full bg-blue-400"
                        style={{
                          width: `${Math.min(
                            Math.round(
                              (AVG_ANNUAL_SALARY_KR /
                                Math.max(annualProjection, AVG_ANNUAL_SALARY_KR)) *
                                100
                            ),
                            100
                          )}%`,
                        }}
                      />
                    </div>
                  </div>

                  <p className={`text-sm font-medium ${
                    annualComparison.isAbove
                      ? 'text-green-700 dark:text-green-400'
                      : 'text-orange-700 dark:text-orange-400'
                  }`}>
                    {annualComparison.isAbove
                      ? `평균보다 ${formatCurrency(annualComparison.diff)}원 높습니다`
                      : `평균보다 ${formatCurrency(Math.abs(annualComparison.diff))}원 낮습니다`}
                  </p>
                </div>

                {/* Original Minimum Wage Info Cards */}
                <div className="bg-subtle rounded-xl p-6 mt-2">
                  <h3 className="text-lg font-semibold text-fg mb-4">
                    {t('minimumWage.title')}
                  </h3>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="bg-surface rounded-lg p-4">
                      <div className="text-sm text-sub">
                        {t('minimumWage.current')}
                      </div>
                      <div className="text-xl font-bold text-fg mt-1">
                        {t('minimumWage.currentValue')}
                      </div>
                    </div>
                    <div className="bg-surface rounded-lg p-4">
                      <div className="text-sm text-sub">
                        {t('minimumWage.monthlyMin')}
                      </div>
                      <div className="text-xl font-bold text-fg mt-1">
                        {t('minimumWage.monthlyMinValue')}
                      </div>
                    </div>
                  </div>
                  <div
                    className={`mt-4 p-4 rounded-lg ${
                      minimumWageComparison.isAbove
                        ? 'bg-green-100 dark:bg-green-950 border border-line'
                        : 'bg-red-100 dark:bg-red-950 border border-red-300 dark:border-red-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm font-medium mb-1">
                          {t('minimumWage.comparison')}
                        </div>
                        <div
                          className={`text-lg font-bold ${
                            minimumWageComparison.isAbove
                              ? 'text-green-700 dark:text-green-400'
                              : 'text-red-700 dark:text-red-400'
                          }`}
                        >
                          {minimumWageComparison.isAbove
                            ? t('minimumWage.above')
                            : t('minimumWage.below')}
                        </div>
                        <div className="text-sm text-sub mt-1">
                          {t('minimumWage.percent', { percent: minimumWageComparison.percent })}
                        </div>
                      </div>
                      <div
                        className={`text-3xl font-bold ${
                          minimumWageComparison.isAbove
                            ? 'text-green-600 dark:text-green-500'
                            : 'text-red-600 dark:text-red-500'
                        }`}
                      >
                        {minimumWageComparison.percent}%
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-12 text-muted">
                <DollarSign className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p>{t('amountPlaceholder')}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Guide Section */}
      <div className={`${glassCard} ${glassInset} p-6`}>
        <div className="flex items-center gap-2 mb-6">
          <BookOpen className="w-5 h-5 text-blue-600" />
          <h2 className="text-xl font-semibold text-fg">
            {t('guide.title')}
          </h2>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <h3 className="font-semibold text-fg mb-3">
              {t('guide.conversion.title')}
            </h3>
            <ul className="space-y-2">
              {(t.raw('guide.conversion.items') as string[]).map((item, index) => (
                <li
                  key={index}
                  className="flex items-start gap-2 text-sm text-sub"
                >
                  <span className="text-blue-600 mt-1">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="font-semibold text-fg mb-3">
              {t('guide.tips.title')}
            </h3>
            <ul className="space-y-2">
              {(t.raw('guide.tips.items') as string[]).map((item, index) => (
                <li
                  key={index}
                  className="flex items-start gap-2 text-sm text-sub"
                >
                  <span className="text-blue-600 mt-1">•</span>
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

export default function HourlyWage() {
  return (
    <Suspense fallback={<div className="text-center py-12 text-muted">Loading...</div>}>
      <HourlyWageInner />
    </Suspense>
  )
}
