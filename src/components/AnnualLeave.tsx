'use client'

import { useState, useMemo } from 'react'
import { useTranslations } from 'next-intl'
import { Calendar, Sun, BookOpen, Clock } from 'lucide-react'

interface LeaveBreakdown {
  year: number
  earned: number
  type: 'monthly' | 'annual' | 'additional'
}

export default function AnnualLeave() {
  const t = useTranslations('annualLeave')
  const today = new Date('2026-02-16')

  const [joinDate, setJoinDate] = useState<string>('')
  const [usedLeaves, setUsedLeaves] = useState<number>(0)

  const calculateLeave = useMemo(() => {
    if (!joinDate) return null

    const join = new Date(joinDate)
    if (join > today) return null

    // Calculate work period
    let years = today.getFullYear() - join.getFullYear()
    let months = today.getMonth() - join.getMonth()

    if (months < 0) {
      years--
      months += 12
    }

    if (today.getDate() < join.getDate()) {
      months--
      if (months < 0) {
        years--
        months += 12
      }
    }

    const totalMonths = years * 12 + months

    // Calculate total earned leave and breakdown
    const breakdown: LeaveBreakdown[] = []
    let totalEarned = 0
    let currentYearEarned = 0

    // First year: monthly leave (1 day per month, max 11)
    if (totalMonths < 12) {
      const monthlyLeave = Math.min(totalMonths, 11)
      totalEarned = monthlyLeave
      currentYearEarned = monthlyLeave
      breakdown.push({ year: 1, earned: monthlyLeave, type: 'monthly' })
    } else {
      // First year monthly leave (max 11)
      totalEarned += 11
      breakdown.push({ year: 1, earned: 11, type: 'monthly' })

      // Calculate full years worked (from 2nd year onwards)
      const fullYears = Math.floor((totalMonths - 12) / 12) + 1

      for (let i = 1; i <= fullYears; i++) {
        let yearLeave = 15 // Base annual leave

        // Additional leave for 3+ years (1 day per 2 years)
        if (i >= 2) {
          const additionalYears = Math.floor((i - 1) / 2)
          const additional = Math.min(additionalYears, 10) // Max 25 total (15 + 10)
          yearLeave += additional
          breakdown.push({ year: i + 1, earned: yearLeave, type: 'additional' })
        } else {
          breakdown.push({ year: i + 1, earned: yearLeave, type: 'annual' })
        }

        totalEarned += yearLeave

        // Last year is current year
        if (i === fullYears) {
          currentYearEarned = yearLeave
        }
      }
    }

    // Calculate next leave earned date
    let nextEarnedDate: string | null = null

    if (totalMonths < 12) {
      // In first year, next leave is next month anniversary
      const nextMonth = new Date(join)
      nextMonth.setMonth(join.getMonth() + totalMonths + 1)
      if (nextMonth <= new Date(join.getFullYear() + 1, join.getMonth(), join.getDate())) {
        nextEarnedDate = nextMonth.toLocaleDateString('ko-KR')
      }
    } else {
      // After first year, next leave is on annual anniversary
      const nextAnniversary = new Date(join)
      nextAnniversary.setFullYear(today.getFullYear() + 1)
      if (nextAnniversary <= today) {
        nextAnniversary.setFullYear(nextAnniversary.getFullYear() + 1)
      }
      nextEarnedDate = nextAnniversary.toLocaleDateString('ko-KR')
    }

    const remaining = totalEarned - usedLeaves

    return {
      years,
      months,
      totalEarned,
      used: usedLeaves,
      remaining,
      currentYearEarned,
      nextEarnedDate,
      breakdown
    }
  }, [joinDate, usedLeaves, today])

  const handleReset = () => {
    setJoinDate('')
    setUsedLeaves(0)
  }

  const guideItems = t.raw('guide.rules.items') as string[]
  const tipsItems = t.raw('guide.tips.items') as string[]

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('title')}</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('description')}</p>
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
          {calculateLeave && (
            <>
              {/* Main Results */}
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
                <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 mb-6">
                  <Sun className="w-5 h-5" />
                  <h2 className="text-lg font-semibold">{t('result.title')}</h2>
                </div>

                <div className="grid sm:grid-cols-2 gap-6">
                  {/* Work Period */}
                  <div className="bg-blue-50 dark:bg-blue-950 rounded-lg p-4">
                    <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                      {t('result.workPeriod')}
                    </div>
                    <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                      {calculateLeave.years}{t('result.years')} {calculateLeave.months}{t('result.months')}
                    </div>
                  </div>

                  {/* Total Earned */}
                  <div className="bg-green-50 dark:bg-green-950 rounded-lg p-4">
                    <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                      {t('result.totalEarned')}
                    </div>
                    <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                      {calculateLeave.totalEarned}{t('result.days')}
                    </div>
                  </div>

                  {/* Used Leaves */}
                  <div className="bg-orange-50 dark:bg-orange-950 rounded-lg p-4">
                    <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                      {t('result.used')}
                    </div>
                    <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                      {calculateLeave.used}{t('result.days')}
                    </div>
                  </div>

                  {/* Remaining Leaves */}
                  <div className="bg-purple-50 dark:bg-purple-950 rounded-lg p-4">
                    <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                      {t('result.remaining')}
                    </div>
                    <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                      {calculateLeave.remaining}{t('result.days')}
                    </div>
                  </div>

                  {/* Current Year Earned */}
                  <div className="bg-indigo-50 dark:bg-indigo-950 rounded-lg p-4">
                    <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                      {t('result.currentYearEarned')}
                    </div>
                    <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
                      {calculateLeave.currentYearEarned}{t('result.days')}
                    </div>
                  </div>

                  {/* Next Earned Date */}
                  {calculateLeave.nextEarnedDate && (
                    <div className="bg-teal-50 dark:bg-teal-950 rounded-lg p-4">
                      <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                        {t('result.nextEarned')}
                      </div>
                      <div className="text-xl font-bold text-teal-600 dark:text-teal-400">
                        {calculateLeave.nextEarnedDate}
                      </div>
                    </div>
                  )}
                </div>
              </div>

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
          )}

          {!calculateLeave && (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-12 text-center">
              <Sun className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
              <p className="text-gray-500 dark:text-gray-400">{t('description')}</p>
            </div>
          )}
        </div>
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
