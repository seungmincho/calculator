'use client'

import { useState, useMemo, useCallback, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { useSearchParams } from 'next/navigation'
import { Calendar, Sun, BookOpen, Clock, Copy, Check, Share2, AlertTriangle, ChevronDown } from 'lucide-react'

type CalcBasis = 'joinDate' | 'fiscalYear'

interface LeaveBreakdown {
  year: number
  earned: number
  type: 'monthly' | 'annual' | 'additional'
}

interface LeaveResult {
  years: number
  months: number
  totalEarned: number
  used: number
  remaining: number
  currentYearEarned: number
  nextEarnedDate: string | null
  breakdown: LeaveBreakdown[]
  leavePay: number | null
}

// Milestones for the timeline: year → total annual leave
const MILESTONES = [
  { year: 1, days: 15, label: '1y' },
  { year: 3, days: 16, label: '3y' },
  { year: 5, days: 17, label: '5y' },
  { year: 7, days: 18, label: '7y' },
  { year: 9, days: 19, label: '9y' },
  { year: 11, days: 20, label: '11y' },
  { year: 21, days: 25, label: '21y+' },
]

function getAnnualLeaveForYear(completedYears: number): number {
  if (completedYears < 1) return 0
  const base = 15
  const additional = completedYears >= 2 ? Math.floor((completedYears - 1) / 2) : 0
  return Math.min(base + additional, 25)
}

export default function AnnualLeave() {
  const t = useTranslations('annualLeave')
  const searchParams = useSearchParams()
  const today = new Date()

  // Read URL params on mount
  const initialJoin = searchParams.get('join') || ''
  const initialUsed = parseInt(searchParams.get('used') || '0', 10) || 0
  const initialBasis = (searchParams.get('basis') as CalcBasis) || 'joinDate'
  const initialWage = parseInt(searchParams.get('wage') || '0', 10) || 0

  const [joinDate, setJoinDate] = useState<string>(initialJoin)
  const [usedLeaves, setUsedLeaves] = useState<number>(initialUsed)
  const [calcBasis, setCalcBasis] = useState<CalcBasis>(initialBasis)
  const [dailyWage, setDailyWage] = useState<number>(initialWage)
  const [copiedLink, setCopiedLink] = useState(false)
  const [promotionOpen, setPromotionOpen] = useState(false)

  // Sync state to URL
  useEffect(() => {
    if (typeof window === 'undefined') return
    const url = new URL(window.location.href)
    if (joinDate) url.searchParams.set('join', joinDate)
    else url.searchParams.delete('join')
    if (usedLeaves > 0) url.searchParams.set('used', String(usedLeaves))
    else url.searchParams.delete('used')
    if (calcBasis !== 'joinDate') url.searchParams.set('basis', calcBasis)
    else url.searchParams.delete('basis')
    if (dailyWage > 0) url.searchParams.set('wage', String(dailyWage))
    else url.searchParams.delete('wage')
    window.history.replaceState({}, '', url.toString())
  }, [joinDate, usedLeaves, calcBasis, dailyWage])

  // --- Join Date Basis Calculation (existing logic) ---
  const calcJoinDateBasis = useCallback((join: Date): Omit<LeaveResult, 'leavePay'> | null => {
    if (join > today) return null

    let years = today.getFullYear() - join.getFullYear()
    let months = today.getMonth() - join.getMonth()
    if (months < 0) { years--; months += 12 }
    if (today.getDate() < join.getDate()) {
      months--
      if (months < 0) { years--; months += 12 }
    }
    const totalMonths = years * 12 + months

    const breakdown: LeaveBreakdown[] = []
    let totalEarned = 0
    let currentYearEarned = 0

    if (totalMonths < 12) {
      const monthlyLeave = Math.min(totalMonths, 11)
      totalEarned = monthlyLeave
      currentYearEarned = monthlyLeave
      breakdown.push({ year: 1, earned: monthlyLeave, type: 'monthly' })
    } else {
      totalEarned += 11
      breakdown.push({ year: 1, earned: 11, type: 'monthly' })
      const fullYears = Math.floor((totalMonths - 12) / 12) + 1
      for (let i = 1; i <= fullYears; i++) {
        let yearLeave = 15
        if (i >= 2) {
          const additionalYears = Math.floor((i - 1) / 2)
          const additional = Math.min(additionalYears, 10)
          yearLeave += additional
          breakdown.push({ year: i + 1, earned: yearLeave, type: 'additional' })
        } else {
          breakdown.push({ year: i + 1, earned: yearLeave, type: 'annual' })
        }
        totalEarned += yearLeave
        if (i === fullYears) currentYearEarned = yearLeave
      }
    }

    let nextEarnedDate: string | null = null
    if (totalMonths < 12) {
      const nextMonth = new Date(join)
      nextMonth.setMonth(join.getMonth() + totalMonths + 1)
      if (nextMonth <= new Date(join.getFullYear() + 1, join.getMonth(), join.getDate())) {
        nextEarnedDate = nextMonth.toLocaleDateString('ko-KR')
      }
    } else {
      const nextAnniversary = new Date(join)
      nextAnniversary.setFullYear(today.getFullYear() + 1)
      if (nextAnniversary <= today) nextAnniversary.setFullYear(nextAnniversary.getFullYear() + 1)
      nextEarnedDate = nextAnniversary.toLocaleDateString('ko-KR')
    }

    return {
      years, months, totalEarned, used: usedLeaves,
      remaining: totalEarned - usedLeaves, currentYearEarned, nextEarnedDate, breakdown,
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [usedLeaves])

  // --- Fiscal Year Basis Calculation ---
  const calcFiscalYearBasis = useCallback((join: Date): Omit<LeaveResult, 'leavePay'> | null => {
    if (join > today) return null

    let years = today.getFullYear() - join.getFullYear()
    let months = today.getMonth() - join.getMonth()
    if (months < 0) { years--; months += 12 }
    if (today.getDate() < join.getDate()) {
      months--
      if (months < 0) { years--; months += 12 }
    }

    const currentYear = today.getFullYear()
    const joinYear = join.getFullYear()
    const breakdown: LeaveBreakdown[] = []
    let totalEarned = 0
    let currentYearEarned = 0

    for (let yr = joinYear; yr <= currentYear; yr++) {
      // Start of this fiscal period for the employee
      const fiscalStart = new Date(yr, 0, 1)
      const fiscalEnd = new Date(yr, 11, 31)

      // Months worked in this fiscal year
      const effectiveStart = join > fiscalStart ? join : fiscalStart
      const effectiveEnd = today < fiscalEnd ? today : fiscalEnd
      if (effectiveStart > effectiveEnd) continue

      const completedYearsAtStart = yr - joinYear

      if (completedYearsAtStart < 1) {
        // First partial year: monthly accrual
        const monthsInYear = Math.min(
          11,
          (effectiveEnd.getFullYear() - effectiveStart.getFullYear()) * 12 +
          effectiveEnd.getMonth() - effectiveStart.getMonth()
        )
        const earned = Math.max(0, monthsInYear)
        if (earned > 0) {
          totalEarned += earned
          breakdown.push({ year: 1, earned, type: 'monthly' })
          if (yr === currentYear) currentYearEarned = earned
        }
      } else {
        // Full year: prorated if partial
        const fullYearLeave = getAnnualLeaveForYear(completedYearsAtStart)
        // Prorate for partial years (join year or current year)
        let monthsActive = 12
        if (yr === joinYear) {
          monthsActive = 12 - join.getMonth()
        }
        if (yr === currentYear) {
          monthsActive = today.getMonth() + 1
        }
        const earned = yr === currentYear && yr !== joinYear
          ? Math.round(fullYearLeave * monthsActive / 12)
          : fullYearLeave

        totalEarned += earned
        const yearLabel = completedYearsAtStart + 1
        breakdown.push({
          year: yearLabel,
          earned,
          type: completedYearsAtStart >= 2 ? 'additional' : 'annual',
        })
        if (yr === currentYear) currentYearEarned = earned
      }
    }

    const nextEarnedDate = new Date(currentYear + 1, 0, 1).toLocaleDateString('ko-KR')

    return {
      years, months, totalEarned, used: usedLeaves,
      remaining: totalEarned - usedLeaves, currentYearEarned, nextEarnedDate, breakdown,
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [usedLeaves])

  const calculateLeave = useMemo((): LeaveResult | null => {
    if (!joinDate) return null
    const join = new Date(joinDate)
    if (isNaN(join.getTime()) || join > today) return null

    const base = calcBasis === 'joinDate' ? calcJoinDateBasis(join) : calcFiscalYearBasis(join)
    if (!base) return null

    const leavePay = dailyWage > 0 ? base.remaining * dailyWage : null
    return { ...base, leavePay }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [joinDate, usedLeaves, calcBasis, dailyWage, calcJoinDateBasis, calcFiscalYearBasis])

  // Timeline data: years worked mapped to milestones
  const timelineData = useMemo(() => {
    if (!calculateLeave) return null
    const workedYears = calculateLeave.years + (calculateLeave.months > 0 ? calculateLeave.months / 12 : 0)
    const maxYear = Math.max(Math.ceil(workedYears) + 2, 5)
    return { workedYears, maxYear: Math.min(maxYear, 25) }
  }, [calculateLeave])

  const handleReset = () => {
    setJoinDate('')
    setUsedLeaves(0)
    setDailyWage(0)
    setCalcBasis('joinDate')
  }

  const copyLink = useCallback(async () => {
    try {
      const url = new URL(window.location.href)
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url.toString())
      } else {
        const ta = document.createElement('textarea')
        ta.value = url.toString()
        ta.style.position = 'fixed'
        ta.style.left = '-999999px'
        document.body.appendChild(ta)
        ta.select()
        document.execCommand('copy')
        document.body.removeChild(ta)
      }
      setCopiedLink(true)
      setTimeout(() => setCopiedLink(false), 2000)
    } catch { /* ignore */ }
  }, [])

  const shareResult = useCallback(async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: t('title'),
          url: window.location.href,
        })
      } catch { /* user cancelled */ }
    } else {
      copyLink()
    }
  }, [t, copyLink])

  const guideItems = t.raw('guide.rules.items') as string[]
  const tipsItems = t.raw('guide.tips.items') as string[]

  const formatNumber = (n: number) => n.toLocaleString('ko-KR')

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('title')}</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('description')}</p>
        </div>
        {joinDate && (
          <div className="flex gap-2">
            <button
              onClick={copyLink}
              className="flex items-center gap-1.5 px-3 py-2 text-sm bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg transition-colors"
              title={t('copyLink')}
            >
              {copiedLink ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
              <span className="hidden sm:inline">{copiedLink ? t('copied') : t('copyLink')}</span>
            </button>
            <button
              onClick={shareResult}
              className="flex items-center gap-1.5 px-3 py-2 text-sm bg-blue-100 dark:bg-blue-900 hover:bg-blue-200 dark:hover:bg-blue-800 text-blue-700 dark:text-blue-300 rounded-lg transition-colors"
              title={t('share')}
            >
              <Share2 className="w-4 h-4" />
              <span className="hidden sm:inline">{t('share')}</span>
            </button>
          </div>
        )}
      </div>

      {/* Main Grid */}
      <div className="grid lg:grid-cols-3 gap-8">
        {/* Settings Panel */}
        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 space-y-4">
            <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 mb-4">
              <Calendar className="w-5 h-5" />
              <h2 className="text-lg font-semibold">{t('title')}</h2>
            </div>

            {/* Calculation Basis Toggle */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('calculationBasis')}
              </label>
              <div className="grid grid-cols-2 gap-1 bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
                <button
                  onClick={() => setCalcBasis('joinDate')}
                  className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                    calcBasis === 'joinDate'
                      ? 'bg-white dark:bg-gray-600 text-blue-600 dark:text-blue-400 shadow-sm'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                  }`}
                >
                  {t('joinDateBasis')}
                </button>
                <button
                  onClick={() => setCalcBasis('fiscalYear')}
                  className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                    calcBasis === 'fiscalYear'
                      ? 'bg-white dark:bg-gray-600 text-blue-600 dark:text-blue-400 shadow-sm'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                  }`}
                >
                  {t('fiscalYearBasis')}
                </button>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {calcBasis === 'joinDate' ? t('joinDateBasisDesc') : t('fiscalYearBasisDesc')}
              </p>
            </div>

            {/* Join Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('joinDate')}
              </label>
              <input
                type="date"
                value={joinDate}
                onChange={(e) => setJoinDate(e.target.value)}
                max={today.toISOString().split('T')[0]}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Used Leaves */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('usedLeaves')}
              </label>
              <input
                type="number"
                value={usedLeaves}
                onChange={(e) => setUsedLeaves(Math.max(0, parseInt(e.target.value) || 0))}
                min="0"
                placeholder={t('usedLeavesPlaceholder')}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Daily Wage (for leave pay calculation) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('dailyWage')}
              </label>
              <div className="relative">
                <input
                  type="number"
                  value={dailyWage || ''}
                  onChange={(e) => setDailyWage(Math.max(0, parseInt(e.target.value) || 0))}
                  min="0"
                  placeholder={t('dailyWagePlaceholder')}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 pr-10"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">{t('won')}</span>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{t('dailyWageDesc')}</p>
            </div>

            {/* Buttons */}
            <div className="flex gap-2 pt-2">
              <button
                onClick={handleReset}
                className="flex-1 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg px-4 py-3 font-medium transition-colors"
              >
                {t('reset')}
              </button>
            </div>
          </div>
        </div>

        {/* Results Panel */}
        <div className="lg:col-span-2 space-y-6">
          {calculateLeave ? (
            <>
              {/* Main Results */}
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
                <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 mb-6">
                  <Sun className="w-5 h-5" />
                  <h2 className="text-lg font-semibold">{t('result.title')}</h2>
                  <span className="ml-auto text-xs text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded">
                    {calcBasis === 'joinDate' ? t('joinDateBasis') : t('fiscalYearBasis')}
                  </span>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  {/* Work Period */}
                  <div className="bg-blue-50 dark:bg-blue-950 rounded-lg p-4">
                    <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">{t('result.workPeriod')}</div>
                    <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                      {calculateLeave.years}{t('result.years')} {calculateLeave.months}{t('result.months')}
                    </div>
                  </div>

                  {/* Total Earned */}
                  <div className="bg-green-50 dark:bg-green-950 rounded-lg p-4">
                    <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">{t('result.totalEarned')}</div>
                    <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                      {calculateLeave.totalEarned}{t('result.days')}
                    </div>
                  </div>

                  {/* Used */}
                  <div className="bg-orange-50 dark:bg-orange-950 rounded-lg p-4">
                    <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">{t('result.used')}</div>
                    <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                      {calculateLeave.used}{t('result.days')}
                    </div>
                  </div>

                  {/* Remaining */}
                  <div className="bg-purple-50 dark:bg-purple-950 rounded-lg p-4">
                    <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">{t('result.remaining')}</div>
                    <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                      {calculateLeave.remaining}{t('result.days')}
                    </div>
                  </div>

                  {/* Current Year Earned */}
                  <div className="bg-indigo-50 dark:bg-indigo-950 rounded-lg p-4">
                    <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">{t('result.currentYearEarned')}</div>
                    <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
                      {calculateLeave.currentYearEarned}{t('result.days')}
                    </div>
                  </div>

                  {/* Next Earned Date */}
                  {calculateLeave.nextEarnedDate && (
                    <div className="bg-teal-50 dark:bg-teal-950 rounded-lg p-4">
                      <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">{t('result.nextEarned')}</div>
                      <div className="text-xl font-bold text-teal-600 dark:text-teal-400">
                        {calculateLeave.nextEarnedDate}
                      </div>
                    </div>
                  )}
                </div>

                {/* Leave Pay Calculation */}
                {calculateLeave.leavePay !== null && calculateLeave.remaining > 0 && (
                  <div className="mt-4 bg-amber-50 dark:bg-amber-950 rounded-lg p-4 border border-amber-200 dark:border-amber-800">
                    <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">{t('leavePay.title')}</div>
                    <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                      {formatNumber(calculateLeave.leavePay)}{t('won')}
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {t('leavePay.formula', {
                        remaining: calculateLeave.remaining,
                        wage: formatNumber(dailyWage),
                        total: formatNumber(calculateLeave.leavePay),
                      })}
                    </p>
                  </div>
                )}
              </div>

              {/* Timeline Visualization */}
              {timelineData && timelineData.workedYears >= 0.5 && (
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
                  <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 mb-4">
                    <Clock className="w-5 h-5" />
                    <h2 className="text-lg font-semibold">{t('timeline.title')}</h2>
                  </div>

                  {/* Timeline bar */}
                  <div className="relative mt-6 mb-10">
                    <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full transition-all duration-500"
                        style={{ width: `${Math.min((timelineData.workedYears / timelineData.maxYear) * 100, 100)}%` }}
                      />
                    </div>

                    {/* Current position marker */}
                    <div
                      className="absolute -top-1 w-5 h-5 bg-blue-600 border-2 border-white dark:border-gray-800 rounded-full shadow-md transform -translate-x-1/2"
                      style={{ left: `${Math.min((timelineData.workedYears / timelineData.maxYear) * 100, 100)}%` }}
                    />
                    <div
                      className="absolute top-6 text-xs font-bold text-blue-600 dark:text-blue-400 transform -translate-x-1/2 whitespace-nowrap"
                      style={{ left: `${Math.min((timelineData.workedYears / timelineData.maxYear) * 100, 100)}%` }}
                    >
                      {t('timeline.current')}
                    </div>

                    {/* Milestone markers */}
                    {MILESTONES.filter(m => m.year <= timelineData.maxYear).map((m) => {
                      const pos = (m.year / timelineData.maxYear) * 100
                      const isPast = timelineData.workedYears >= m.year
                      return (
                        <div key={m.year} className="absolute" style={{ left: `${pos}%` }}>
                          <div className={`w-2 h-2 rounded-full transform -translate-x-1/2 -top-[calc(0.375rem-1px)] absolute ${
                            isPast ? 'bg-green-500' : 'bg-gray-400 dark:bg-gray-500'
                          }`} />
                          <div className={`absolute top-4 transform -translate-x-1/2 text-center whitespace-nowrap ${
                            isPast ? 'text-green-600 dark:text-green-400' : 'text-gray-400 dark:text-gray-500'
                          }`}>
                            <div className="text-[10px] font-semibold">{m.year}{t('result.years')}</div>
                            <div className="text-[10px]">{m.days}{t('result.days')}</div>
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">{t('timeline.desc')}</p>
                </div>
              )}

              {/* Breakdown Table */}
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
                <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 mb-4">
                  <Clock className="w-5 h-5" />
                  <h2 className="text-lg font-semibold">{t('breakdown.title')}</h2>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200 dark:border-gray-700">
                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                          {t('breakdown.year')}
                        </th>
                        <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                          {t('breakdown.earned')}
                        </th>
                        <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                          {t('breakdown.type')}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {calculateLeave.breakdown.map((item, index) => (
                        <tr
                          key={index}
                          className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50"
                        >
                          <td className="py-3 px-4 text-sm text-gray-900 dark:text-white">
                            {item.year}{t('breakdown.year')}
                          </td>
                          <td className="text-right py-3 px-4 text-sm font-semibold text-blue-600 dark:text-blue-400">
                            {item.earned}{t('result.days')}
                          </td>
                          <td className="text-right py-3 px-4 text-sm text-gray-600 dark:text-gray-400">
                            {t(`breakdown.${item.type}`)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          ) : (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-12 text-center">
              <Sun className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
              <p className="text-gray-500 dark:text-gray-400">{t('description')}</p>
            </div>
          )}
        </div>
      </div>

      {/* Leave Promotion Notice */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
        <button
          onClick={() => setPromotionOpen(!promotionOpen)}
          className="w-full flex items-center justify-between text-left"
        >
          <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
            <AlertTriangle className="w-5 h-5" />
            <h2 className="text-lg font-semibold">{t('promotion.title')}</h2>
          </div>
          <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform ${promotionOpen ? 'rotate-180' : ''}`} />
        </button>

        {promotionOpen && (
          <div className="mt-4 space-y-4">
            <p className="text-sm text-gray-700 dark:text-gray-300">{t('promotion.description')}</p>

            <div className="space-y-3">
              {(t.raw('promotion.steps') as string[]).map((step, i) => (
                <div key={i} className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-6 h-6 bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-300 rounded-full flex items-center justify-center text-sm font-bold">
                    {i + 1}
                  </span>
                  <span className="text-sm text-gray-700 dark:text-gray-300">{step}</span>
                </div>
              ))}
            </div>

            <div className="bg-amber-50 dark:bg-amber-950 rounded-lg p-4 border border-amber-200 dark:border-amber-800">
              <p className="text-sm text-amber-800 dark:text-amber-200 font-medium">{t('promotion.warning')}</p>
            </div>
          </div>
        )}
      </div>

      {/* Guide Section */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
        <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 mb-6">
          <BookOpen className="w-5 h-5" />
          <h2 className="text-xl font-semibold">{t('guide.title')}</h2>
        </div>

        <div className="space-y-6">
          {/* Rules */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
              {t('guide.rules.title')}
            </h3>
            <ul className="space-y-2 text-gray-700 dark:text-gray-300">
              {guideItems.map((item, index) => (
                <li key={index} className="flex items-start gap-2">
                  <span className="text-blue-600 dark:text-blue-400 mt-1">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Tips */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
              {t('guide.tips.title')}
            </h3>
            <ul className="space-y-2 text-gray-700 dark:text-gray-300">
              {tipsItems.map((item, index) => (
                <li key={index} className="flex items-start gap-2">
                  <span className="text-blue-600 dark:text-blue-400 mt-1">•</span>
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
