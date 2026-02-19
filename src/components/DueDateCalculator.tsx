'use client'

import { useState, useMemo } from 'react'
import { useTranslations } from 'next-intl'
import { Calendar, Baby, Heart, Clock, BookOpen } from 'lucide-react'

type CalcMethod = 'lmp' | 'ovulation'

interface Milestone {
  labelKey: string
  weekStart: number
  weekEnd?: number
}

const MILESTONES: Milestone[] = [
  { labelKey: 'heartbeat', weekStart: 6, weekEnd: 7 },
  { labelKey: 'firstTrimesterScreen', weekStart: 11, weekEnd: 13 },
  { labelKey: 'genderReveal', weekStart: 16, weekEnd: 20 },
  { labelKey: 'secondTrimesterScreen', weekStart: 15, weekEnd: 20 },
  { labelKey: 'viability', weekStart: 24 },
  { labelKey: 'glucoseTest', weekStart: 24, weekEnd: 28 },
  { labelKey: 'fullTerm', weekStart: 37 },
  { labelKey: 'dueDate', weekStart: 40 },
]

export default function DueDateCalculator() {
  const t = useTranslations('dueDateCalculator')
  const [calcMethod, setCalcMethod] = useState<CalcMethod>('lmp')
  const [selectedDate, setSelectedDate] = useState<string>('')
  const [calculated, setCalculated] = useState(false)

  const results = useMemo(() => {
    if (!selectedDate || !calculated) return null

    const inputDate = new Date(selectedDate)
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    // Calculate due date
    const dueDate = new Date(inputDate)
    if (calcMethod === 'lmp') {
      dueDate.setDate(dueDate.getDate() + 280) // LMP + 280 days
    } else {
      dueDate.setDate(dueDate.getDate() + 266) // Ovulation + 266 days
    }

    // Calculate conception date (LMP + 14 days)
    const conceptionDate = new Date(inputDate)
    if (calcMethod === 'lmp') {
      conceptionDate.setDate(conceptionDate.getDate() + 14)
    } else {
      // If using ovulation date, it IS the conception date
      conceptionDate.setTime(inputDate.getTime())
    }

    // Calculate current week and days
    const daysSinceStart = Math.floor((today.getTime() - inputDate.getTime()) / (1000 * 60 * 60 * 24))
    const totalWeeks = Math.floor(daysSinceStart / 7)
    const remainingDays = daysSinceStart % 7

    // Calculate days remaining/elapsed
    const daysUntilDue = Math.floor((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
    const isPastDue = daysUntilDue < 0

    // Calculate progress
    const totalDays = calcMethod === 'lmp' ? 280 : 266
    const progress = Math.min(100, Math.max(0, (daysSinceStart / totalDays) * 100))

    // Determine trimester
    let trimester = 1
    if (totalWeeks >= 28) trimester = 3
    else if (totalWeeks >= 13) trimester = 2

    return {
      dueDate,
      conceptionDate,
      weeks: totalWeeks,
      days: remainingDays,
      trimester,
      daysRemaining: Math.abs(daysUntilDue),
      isPastDue,
      progress,
    }
  }, [selectedDate, calcMethod, calculated])

  const handleCalculate = () => {
    if (selectedDate) {
      setCalculated(true)
    }
  }

  const handleReset = () => {
    setSelectedDate('')
    setCalculated(false)
  }

  const formatDate = (date: Date) => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}년 ${month}월 ${day}일`
  }

  const getMilestoneDate = (weekNumber: number) => {
    if (!selectedDate || !calculated) return null
    const inputDate = new Date(selectedDate)
    const milestoneDate = new Date(inputDate)
    milestoneDate.setDate(milestoneDate.getDate() + weekNumber * 7)
    return milestoneDate
  }

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
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 space-y-6">
            <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
              <Calendar className="w-5 h-5" />
              <h2 className="text-lg font-semibold">{t('calcMethod')}</h2>
            </div>

            {/* Calculation Method */}
            <div className="space-y-3">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="radio"
                  name="calcMethod"
                  value="lmp"
                  checked={calcMethod === 'lmp'}
                  onChange={(e) => setCalcMethod(e.target.value as CalcMethod)}
                  className="w-4 h-4 accent-blue-600"
                />
                <span className="text-gray-900 dark:text-white">{t('lmpMethod')}</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="radio"
                  name="calcMethod"
                  value="ovulation"
                  checked={calcMethod === 'ovulation'}
                  onChange={(e) => setCalcMethod(e.target.value as CalcMethod)}
                  className="w-4 h-4 accent-blue-600"
                />
                <span className="text-gray-900 dark:text-white">{t('ovulationMethod')}</span>
              </label>
            </div>

            {/* Date Input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {calcMethod === 'lmp' ? t('lmpDate') : t('ovulationDate')}
              </label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                max={new Date().toISOString().split('T')[0]}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <button
                onClick={handleCalculate}
                disabled={!selectedDate}
                className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg px-4 py-3 font-medium hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {t('calculate')}
              </button>
              <button
                onClick={handleReset}
                className="px-4 py-3 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg font-medium transition-colors"
              >
                {t('reset')}
              </button>
            </div>
          </div>
        </div>

        {/* Results Panel */}
        <div className="lg:col-span-2">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 space-y-6">
            {!calculated || !results ? (
              <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                <Baby className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p>{t('description')}</p>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
                  <Heart className="w-5 h-5" />
                  <h2 className="text-lg font-semibold">{t('result.title')}</h2>
                </div>

                {/* Main Results Grid */}
                <div className="grid md:grid-cols-2 gap-4">
                  {/* Due Date */}
                  <div className="bg-gradient-to-br from-pink-50 to-rose-50 dark:from-pink-950/30 dark:to-rose-950/30 rounded-lg p-4">
                    <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">{t('result.dueDate')}</div>
                    <div className="text-2xl font-bold text-pink-600 dark:text-pink-400">
                      {formatDate(results.dueDate)}
                    </div>
                  </div>

                  {/* Current Week */}
                  <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 rounded-lg p-4">
                    <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">{t('result.currentWeek')}</div>
                    <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                      {t('result.weeksAndDays', { weeks: results.weeks, days: results.days })}
                    </div>
                  </div>

                  {/* Trimester */}
                  <div className="bg-gradient-to-br from-purple-50 to-violet-50 dark:from-purple-950/30 dark:to-violet-950/30 rounded-lg p-4">
                    <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">{t('result.trimester')}</div>
                    <div className="text-lg font-bold text-purple-600 dark:text-purple-400">
                      {t(`result.trimester${results.trimester}` as any)}
                    </div>
                  </div>

                  {/* Days Remaining/Elapsed */}
                  <div className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30 rounded-lg p-4">
                    <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                      {results.isPastDue ? t('result.daysElapsed') : t('result.daysRemaining')}
                    </div>
                    <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                      {results.daysRemaining}일
                    </div>
                    {results.isPastDue && (
                      <div className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                        {t('result.alreadyPassed')}
                      </div>
                    )}
                  </div>
                </div>

                {/* Progress Bar */}
                <div>
                  <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400 mb-2">
                    <span>{t('result.progress')}</span>
                    <span>{results.progress.toFixed(1)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-blue-600 to-indigo-600 h-full transition-all duration-500"
                      style={{ width: `${results.progress}%` }}
                    />
                  </div>
                </div>

                {/* Conception Date */}
                <div className="bg-blue-50 dark:bg-blue-950/30 rounded-lg p-4">
                  <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">{t('result.conceptionDate')}</div>
                  <div className="text-lg font-semibold text-blue-600 dark:text-blue-400">
                    {formatDate(results.conceptionDate)}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Milestones Timeline */}
      {calculated && results && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
          <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 mb-6">
            <Clock className="w-5 h-5" />
            <h2 className="text-lg font-semibold">{t('milestones.title')}</h2>
          </div>

          <div className="space-y-4">
            {MILESTONES.map((milestone, index) => {
              const milestoneDate = getMilestoneDate(milestone.weekStart)
              const isPast = milestoneDate && milestoneDate < new Date()
              const isCurrent = results.weeks >= milestone.weekStart &&
                               (!milestone.weekEnd || results.weeks <= milestone.weekEnd)

              return (
                <div
                  key={index}
                  className={`flex items-start gap-4 p-4 rounded-lg transition-colors ${
                    isCurrent
                      ? 'bg-blue-50 dark:bg-blue-950/30 border-l-4 border-blue-600'
                      : isPast
                      ? 'bg-gray-50 dark:bg-gray-900/30 opacity-60'
                      : 'bg-gray-50 dark:bg-gray-900/30'
                  }`}
                >
                  <div
                    className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
                      isCurrent
                        ? 'bg-blue-600 text-white'
                        : isPast
                        ? 'bg-gray-400 text-white'
                        : 'bg-gray-300 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                    }`}
                  >
                    <Baby className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <div className={`font-medium ${
                      isCurrent
                        ? 'text-blue-600 dark:text-blue-400'
                        : 'text-gray-900 dark:text-white'
                    }`}>
                      {t(`milestones.${milestone.labelKey}` as any)}
                    </div>
                    {milestoneDate && (
                      <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        {formatDate(milestoneDate)}
                      </div>
                    )}
                  </div>
                  {isCurrent && (
                    <div className="flex-shrink-0 px-3 py-1 bg-blue-600 text-white text-xs font-medium rounded-full">
                      현재
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Guide Section */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
        <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 mb-6">
          <BookOpen className="w-5 h-5" />
          <h2 className="text-lg font-semibold">{t('guide.title')}</h2>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Calculation Method */}
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white mb-3">
              {t('guide.calculation.title')}
            </h3>
            <ul className="space-y-2">
              {(t.raw('guide.calculation.items') as string[]).map((item, index) => (
                <li key={index} className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <span className="text-blue-600 dark:text-blue-400 mt-1">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Tips */}
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white mb-3">
              {t('guide.tips.title')}
            </h3>
            <ul className="space-y-2">
              {(t.raw('guide.tips.items') as string[]).map((item, index) => (
                <li key={index} className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400">
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
