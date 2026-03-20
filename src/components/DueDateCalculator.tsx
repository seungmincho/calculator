'use client'

import { useState, useMemo } from 'react'
import { useTranslations } from 'next-intl'
import { Calendar, Baby, Heart, Clock, BookOpen, TrendingUp, Stethoscope, Scale } from 'lucide-react'

type CalcMethod = 'lmp' | 'ovulation'

interface Milestone {
  labelKey: string
  weekStart: number
  weekEnd?: number
}

interface PrenatalVisit {
  key: string
  atWeek: number
  toWeek?: number
}

const PRENATAL_VISITS: PrenatalVisit[] = [
  { key: 'week8', atWeek: 8 },
  { key: 'week12', atWeek: 12 },
  { key: 'week16', atWeek: 16 },
  { key: 'week20', atWeek: 20 },
  { key: 'week24', atWeek: 24, toWeek: 28 },
  { key: 'week28', atWeek: 28, toWeek: 32 },
  { key: 'week36', atWeek: 36, toWeek: 40 },
]

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

type BmiCategory = 'underweight' | 'normal' | 'overweight' | 'obese'

function getBmiCategory(bmi: number): BmiCategory {
  if (bmi < 18.5) return 'underweight'
  if (bmi < 25) return 'normal'
  if (bmi < 30) return 'overweight'
  return 'obese'
}

const BABY_SIZE_WEEKS = [4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40]

export default function DueDateCalculator() {
  const t = useTranslations('dueDateCalculator')
  const [calcMethod, setCalcMethod] = useState<CalcMethod>('lmp')
  const [selectedDate, setSelectedDate] = useState<string>('')
  const [calculated, setCalculated] = useState(false)
  const [preHeight, setPreHeight] = useState<string>('')
  const [preWeight, setPreWeight] = useState<string>('')

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

  const bmiData = useMemo(() => {
    const h = parseFloat(preHeight)
    const w = parseFloat(preWeight)
    if (!h || !w || h <= 0 || w <= 0) return null
    const bmi = w / ((h / 100) ** 2)
    const cat = getBmiCategory(bmi)
    return { bmi, cat }
  }, [preHeight, preWeight])

  // Find the closest week data key (clamp to 4-40)
  const babySizeWeek = useMemo(() => {
    if (!results) return null
    const w = Math.max(4, Math.min(40, results.weeks))
    // find closest week in BABY_SIZE_WEEKS
    const closest = BABY_SIZE_WEEKS.reduce((prev, cur) =>
      Math.abs(cur - w) < Math.abs(prev - w) ? cur : prev
    )
    return closest
  }, [results])

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
                      {t(`result.trimester${results.trimester}` as Parameters<typeof t>[0])}
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
                      {t(`milestones.${milestone.labelKey}` as Parameters<typeof t>[0])}
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

      {/* ── 1. Weekly Progress Bar ── */}
      {calculated && results && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
          <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 mb-6">
            <TrendingUp className="w-5 h-5" />
            <h2 className="text-lg font-semibold">{t('weeklyProgress.title')}</h2>
          </div>

          {/* Trimester color legend */}
          <div className="flex flex-wrap gap-3 mb-4 text-xs">
            <span className="flex items-center gap-1.5">
              <span className="inline-block w-3 h-3 rounded-sm bg-green-400" />
              <span className="text-gray-600 dark:text-gray-400">{t('weeklyProgress.trimester1Label')}</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block w-3 h-3 rounded-sm bg-blue-400" />
              <span className="text-gray-600 dark:text-gray-400">{t('weeklyProgress.trimester2Label')}</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block w-3 h-3 rounded-sm bg-purple-400" />
              <span className="text-gray-600 dark:text-gray-400">{t('weeklyProgress.trimester3Label')}</span>
            </span>
          </div>

          {/* Progress bar (40 segments) */}
          <div className="relative w-full h-8 rounded-full overflow-hidden flex">
            {Array.from({ length: 40 }, (_, i) => {
              const week = i + 1
              const isFilled = week <= results.weeks
              const isCurrent = week === results.weeks
              let colorClass = ''
              if (isFilled) {
                if (week <= 12) colorClass = 'bg-green-400'
                else if (week <= 27) colorClass = 'bg-blue-400'
                else colorClass = 'bg-purple-400'
              } else {
                colorClass = 'bg-gray-200 dark:bg-gray-700'
              }
              return (
                <div
                  key={week}
                  title={`${week}주`}
                  className={`flex-1 transition-colors ${colorClass} ${isCurrent ? 'ring-2 ring-offset-1 ring-white dark:ring-gray-800 relative z-10' : ''}`}
                  style={{ marginRight: week < 40 ? '1px' : 0 }}
                />
              )
            })}
          </div>

          {/* Week marker */}
          <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1 px-0.5">
            <span>1주</span>
            <span>10주</span>
            <span>20주</span>
            <span>30주</span>
            <span>40주</span>
          </div>

          {/* Current badge + baby size teaser */}
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300">
              {t('weeklyProgress.currentWeekBadge', { week: results.weeks })}
              {results.days > 0 && (
                <span className="font-normal text-xs opacity-75">+ {results.days}일</span>
              )}
            </span>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {t('weeklyProgress.outOf40')}
            </span>
            {babySizeWeek && results.weeks >= 4 && (
              <span className="text-sm text-gray-700 dark:text-gray-300">
                {t('weeklyProgress.babyThisWeek')}
                {' '}
                <span className="font-medium">
                  {(t.raw(`babySize.week${babySizeWeek}`) as { fruit: string; emoji: string }).emoji}{' '}
                  {(t.raw(`babySize.week${babySizeWeek}`) as { fruit: string; emoji: string }).fruit}
                </span>
              </span>
            )}
          </div>
        </div>
      )}

      {/* ── 2. Baby Size by Week ── */}
      {calculated && results && results.weeks >= 4 && babySizeWeek && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
          <div className="flex items-center gap-2 text-pink-500 dark:text-pink-400 mb-2">
            <Baby className="w-5 h-5" />
            <h2 className="text-lg font-semibold">{t('babySize.title')}</h2>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">{t('babySize.description')}</p>

          {/* Highlight card for current week */}
          {(() => {
            const data = t.raw(`babySize.week${babySizeWeek}`) as { fruit: string; emoji: string; length: string; weight: string }
            return (
              <div className="bg-gradient-to-br from-pink-50 to-rose-50 dark:from-pink-950/30 dark:to-rose-950/30 rounded-xl p-6 mb-6 flex flex-col sm:flex-row items-center gap-6">
                <div className="text-7xl leading-none">{data.emoji}</div>
                <div>
                  <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">{results.weeks}주 아기</div>
                  <div className="text-2xl font-bold text-pink-600 dark:text-pink-400 mb-2">{data.fruit} 크기</div>
                  <div className="flex gap-4 text-sm text-gray-700 dark:text-gray-300">
                    <span>📏 {t('babySize.lengthLabel')}: <strong>{data.length}</strong></span>
                    <span>⚖️ {t('babySize.weightLabel')}: <strong>{data.weight}</strong></span>
                  </div>
                </div>
              </div>
            )
          })()}

          {/* Compact table of all milestones */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left border-b border-gray-200 dark:border-gray-700">
                  <th className="pb-2 pr-4 text-gray-500 dark:text-gray-400 font-medium">주수</th>
                  <th className="pb-2 pr-4 text-gray-500 dark:text-gray-400 font-medium">크기</th>
                  <th className="pb-2 pr-4 text-gray-500 dark:text-gray-400 font-medium">길이</th>
                  <th className="pb-2 text-gray-500 dark:text-gray-400 font-medium">몸무게</th>
                </tr>
              </thead>
              <tbody>
                {[4, 8, 12, 16, 20, 24, 28, 32, 36, 40].map((w) => {
                  const data = t.raw(`babySize.week${w}`) as { fruit: string; emoji: string; length: string; weight: string }
                  const isCurrentRow = Math.abs(w - results.weeks) <= 2 && babySizeWeek === w
                  return (
                    <tr
                      key={w}
                      className={`border-b border-gray-100 dark:border-gray-700/50 transition-colors ${
                        isCurrentRow ? 'bg-pink-50 dark:bg-pink-950/20 font-medium' : ''
                      }`}
                    >
                      <td className="py-2 pr-4 text-gray-700 dark:text-gray-300">{w}주</td>
                      <td className="py-2 pr-4">
                        <span className="mr-1">{data.emoji}</span>
                        <span className="text-gray-700 dark:text-gray-300">{data.fruit}</span>
                        {isCurrentRow && (
                          <span className="ml-2 text-xs px-1.5 py-0.5 bg-pink-200 dark:bg-pink-900 text-pink-700 dark:text-pink-300 rounded-full">현재</span>
                        )}
                      </td>
                      <td className="py-2 pr-4 text-gray-600 dark:text-gray-400">{data.length}</td>
                      <td className="py-2 text-gray-600 dark:text-gray-400">{data.weight}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── 3. Prenatal Checkup Schedule ── */}
      {calculated && results && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
          <div className="flex items-center gap-2 text-teal-600 dark:text-teal-400 mb-2">
            <Stethoscope className="w-5 h-5" />
            <h2 className="text-lg font-semibold">{t('prenatalSchedule.title')}</h2>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">{t('prenatalSchedule.subtitle')}</p>

          <div className="relative">
            {/* Vertical line */}
            <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-gray-200 dark:bg-gray-700" />

            <div className="space-y-4">
              {PRENATAL_VISITS.map((visit) => {
                const isPast = results.weeks > (visit.toWeek ?? visit.atWeek)
                const isCurrent = results.weeks >= visit.atWeek && results.weeks <= (visit.toWeek ?? visit.atWeek + 2)
                const isUpcoming = !isPast && !isCurrent

                let dotClass = 'bg-gray-300 dark:bg-gray-600'
                let labelClass = 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                let labelText = t('prenatalSchedule.upcomingLabel')
                if (isPast) {
                  dotClass = 'bg-green-500'
                  labelClass = 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300'
                  labelText = t('prenatalSchedule.completedLabel')
                } else if (isCurrent) {
                  dotClass = 'bg-teal-500 ring-4 ring-teal-200 dark:ring-teal-900'
                  labelClass = 'bg-teal-100 dark:bg-teal-900/40 text-teal-700 dark:text-teal-300'
                  labelText = t('prenatalSchedule.currentLabel')
                }

                const visitData = t.raw(`prenatalSchedule.${visit.key}`) as { title: string; desc: string }

                return (
                  <div key={visit.key} className="flex items-start gap-4 pl-0">
                    <div className={`relative z-10 flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${dotClass}`}>
                      <Stethoscope className="w-4 h-4 text-white" />
                    </div>
                    <div className={`flex-1 rounded-lg p-4 ${isCurrent ? 'bg-teal-50 dark:bg-teal-950/20 border-l-4 border-teal-500' : isPast ? 'bg-gray-50 dark:bg-gray-900/20 opacity-70' : 'bg-gray-50 dark:bg-gray-900/20'}`}>
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span className={`font-semibold ${isCurrent ? 'text-teal-700 dark:text-teal-300' : 'text-gray-900 dark:text-white'}`}>
                          {visitData.title}
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${labelClass}`}>
                          {labelText}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">{visitData.desc}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── 4. Weight Gain Guide ── */}
      {calculated && results && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
          <div className="flex items-center gap-2 text-orange-500 dark:text-orange-400 mb-2">
            <Scale className="w-5 h-5" />
            <h2 className="text-lg font-semibold">{t('weightGain.title')}</h2>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">{t('weightGain.subtitle')}</p>

          {/* Input row */}
          <div className="grid sm:grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('weightGain.heightLabel')}
              </label>
              <input
                type="number"
                value={preHeight}
                onChange={(e) => setPreHeight(e.target.value)}
                placeholder={t('weightGain.heightPlaceholder')}
                min="100"
                max="220"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-400"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('weightGain.weightLabel')}
              </label>
              <input
                type="number"
                value={preWeight}
                onChange={(e) => setPreWeight(e.target.value)}
                placeholder={t('weightGain.weightPlaceholder')}
                min="30"
                max="200"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-400"
              />
            </div>
          </div>

          {!bmiData ? (
            <div className="text-center py-6 text-gray-400 dark:text-gray-500 text-sm">
              {t('weightGain.enterHeightWeight')}
            </div>
          ) : (
            <>
              {/* BMI result cards */}
              <div className="grid sm:grid-cols-3 gap-4 mb-6">
                <div className="bg-orange-50 dark:bg-orange-950/30 rounded-lg p-4 text-center">
                  <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">{t('weightGain.bmiLabel')}</div>
                  <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">{bmiData.bmi.toFixed(1)}</div>
                </div>
                <div className="bg-amber-50 dark:bg-amber-950/30 rounded-lg p-4 text-center">
                  <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">{t('weightGain.categoryLabel')}</div>
                  <div className="text-base font-semibold text-amber-700 dark:text-amber-300">
                    {t(`weightGain.${bmiData.cat}` as Parameters<typeof t>[0])}
                  </div>
                </div>
                <div className="bg-yellow-50 dark:bg-yellow-950/30 rounded-lg p-4 text-center">
                  <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">{t('weightGain.recommendedGainLabel')}</div>
                  <div className="text-xl font-bold text-yellow-700 dark:text-yellow-300">
                    {t(`weightGain.${bmiData.cat}Range` as Parameters<typeof t>[0])}
                  </div>
                </div>
              </div>

              {/* Trimester breakdown */}
              <div className="grid sm:grid-cols-2 gap-4 mb-4">
                <div className="bg-gray-50 dark:bg-gray-900/30 rounded-lg p-4">
                  <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">{t('weightGain.trimester1GainLabel')}</div>
                  <div className="font-semibold text-gray-800 dark:text-gray-200">
                    {t(`weightGain.${bmiData.cat}Trimester1` as Parameters<typeof t>[0])}
                  </div>
                </div>
                <div className="bg-gray-50 dark:bg-gray-900/30 rounded-lg p-4">
                  <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">{t('weightGain.trimester23GainLabel')}</div>
                  <div className="font-semibold text-gray-800 dark:text-gray-200">
                    {t(`weightGain.${bmiData.cat}Weekly` as Parameters<typeof t>[0])}
                  </div>
                </div>
              </div>

              {/* All categories reference table */}
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left border-b border-gray-200 dark:border-gray-700">
                      <th className="pb-2 pr-4 text-gray-500 dark:text-gray-400 font-medium">체중 분류</th>
                      <th className="pb-2 pr-4 text-gray-500 dark:text-gray-400 font-medium">총 권장량</th>
                      <th className="pb-2 text-gray-500 dark:text-gray-400 font-medium">주당 (2·3분기)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(['underweight', 'normal', 'overweight', 'obese'] as BmiCategory[]).map((cat) => (
                      <tr
                        key={cat}
                        className={`border-b border-gray-100 dark:border-gray-700/50 ${bmiData.cat === cat ? 'bg-orange-50 dark:bg-orange-950/20 font-semibold' : ''}`}
                      >
                        <td className="py-2 pr-4 text-gray-700 dark:text-gray-300">
                          {t(`weightGain.${cat}` as Parameters<typeof t>[0])}
                          {bmiData.cat === cat && <span className="ml-2 text-xs px-1.5 py-0.5 bg-orange-200 dark:bg-orange-900 text-orange-700 dark:text-orange-300 rounded-full">나</span>}
                        </td>
                        <td className="py-2 pr-4 text-gray-600 dark:text-gray-400">{t(`weightGain.${cat}Range` as Parameters<typeof t>[0])}</td>
                        <td className="py-2 text-gray-600 dark:text-gray-400">{t(`weightGain.${cat}Weekly` as Parameters<typeof t>[0])}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          <p className="text-xs text-gray-400 dark:text-gray-500 mt-4">{t('weightGain.disclaimer')}</p>
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
