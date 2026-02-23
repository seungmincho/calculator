'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useTranslations } from 'next-intl'
import { Moon, Sun, Clock, AlarmClock, BookOpen, ChevronRight } from 'lucide-react'

type Mode = 'sleepNow' | 'wakeAt'

interface SleepOption {
  cycles: number
  totalMinutes: number
  time: Date
  quality: 'excellent' | 'good' | 'fair' | 'poor'
}

const CYCLE_MINUTES = 90
const DEFAULT_FALL_ASLEEP_MINUTES = 14

function formatTime(date: Date): string {
  const h = date.getHours()
  const m = date.getMinutes()
  const period = h < 12 ? 'AM' : 'PM'
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h
  return `${h12}:${String(m).padStart(2, '0')} ${period}`
}

function formatTime24(date: Date): string {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

function getQuality(cycles: number): 'excellent' | 'good' | 'fair' | 'poor' {
  if (cycles >= 5) return 'excellent'
  if (cycles === 4) return 'good'
  if (cycles === 3) return 'fair'
  return 'poor'
}

const qualityColors: Record<string, { bg: string; border: string; text: string; badge: string }> = {
  excellent: {
    bg: 'bg-emerald-50 dark:bg-emerald-950/40',
    border: 'border-emerald-200 dark:border-emerald-800',
    text: 'text-emerald-700 dark:text-emerald-300',
    badge: 'bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300',
  },
  good: {
    bg: 'bg-green-50 dark:bg-green-950/40',
    border: 'border-green-200 dark:border-green-800',
    text: 'text-green-700 dark:text-green-300',
    badge: 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300',
  },
  fair: {
    bg: 'bg-yellow-50 dark:bg-yellow-950/40',
    border: 'border-yellow-200 dark:border-yellow-800',
    text: 'text-yellow-700 dark:text-yellow-300',
    badge: 'bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-300',
  },
  poor: {
    bg: 'bg-red-50 dark:bg-red-950/40',
    border: 'border-red-200 dark:border-red-800',
    text: 'text-red-700 dark:text-red-300',
    badge: 'bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300',
  },
}

export default function SleepCalculator() {
  const t = useTranslations('sleepCalculator')

  const [mode, setMode] = useState<Mode>('sleepNow')
  const [currentTime, setCurrentTime] = useState<Date>(new Date())
  const [wakeUpInput, setWakeUpInput] = useState<string>('07:00')
  const [fallAsleepMinutes, setFallAsleepMinutes] = useState<number>(DEFAULT_FALL_ASLEEP_MINUTES)
  const [showResults, setShowResults] = useState<boolean>(false)

  // Update clock every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  // Auto-calculate when in sleepNow mode
  useEffect(() => {
    if (mode === 'sleepNow') {
      setShowResults(true)
    }
  }, [mode])

  const sleepNowOptions = useMemo((): SleepOption[] => {
    if (mode !== 'sleepNow') return []

    const options: SleepOption[] = []
    const sleepStart = new Date(currentTime.getTime() + fallAsleepMinutes * 60 * 1000)

    for (let cycles = 6; cycles >= 1; cycles--) {
      const totalSleepMinutes = cycles * CYCLE_MINUTES
      const wakeTime = new Date(sleepStart.getTime() + totalSleepMinutes * 60 * 1000)
      options.push({
        cycles,
        totalMinutes: totalSleepMinutes,
        time: wakeTime,
        quality: getQuality(cycles),
      })
    }
    return options
  }, [mode, currentTime, fallAsleepMinutes])

  const wakeAtOptions = useMemo((): SleepOption[] => {
    if (mode !== 'wakeAt') return []

    const [hours, minutes] = wakeUpInput.split(':').map(Number)
    const wakeTarget = new Date(currentTime)
    wakeTarget.setHours(hours, minutes, 0, 0)

    // If the target time is earlier today, assume tomorrow
    if (wakeTarget.getTime() <= currentTime.getTime()) {
      wakeTarget.setDate(wakeTarget.getDate() + 1)
    }

    const options: SleepOption[] = []
    for (let cycles = 6; cycles >= 1; cycles--) {
      const totalSleepMinutes = cycles * CYCLE_MINUTES
      const bedTime = new Date(
        wakeTarget.getTime() - (totalSleepMinutes + fallAsleepMinutes) * 60 * 1000
      )
      options.push({
        cycles,
        totalMinutes: totalSleepMinutes,
        time: bedTime,
        quality: getQuality(cycles),
      })
    }
    return options
  }, [mode, wakeUpInput, currentTime, fallAsleepMinutes])

  const handleCalculateWakeAt = useCallback(() => {
    setShowResults(true)
  }, [])

  const options = mode === 'sleepNow' ? sleepNowOptions : wakeAtOptions

  const formatHoursMinutes = useCallback(
    (totalMinutes: number): string => {
      const h = Math.floor(totalMinutes / 60)
      const m = totalMinutes % 60
      if (m === 0) return `${h}${t('hourUnit')}`
      return `${h}${t('hourUnit')} ${m}${t('minuteUnit')}`
    },
    [t]
  )

  const ageGroupData = useMemo(
    () => [
      { age: t('ageNewborn'), hours: '14-17' },
      { age: t('ageInfant'), hours: '12-15' },
      { age: t('ageToddler'), hours: '11-14' },
      { age: t('agePreschool'), hours: '10-13' },
      { age: t('ageSchool'), hours: '9-11' },
      { age: t('ageTeen'), hours: '8-10' },
      { age: t('ageAdult'), hours: '7-9' },
      { age: t('ageSenior'), hours: '7-8' },
    ],
    [t]
  )

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <Moon className="text-indigo-500" size={28} />
          {t('title')}
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('description')}</p>
      </div>

      {/* Current Time Display */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 text-center">
        <div className="text-sm text-gray-500 dark:text-gray-400 mb-2 flex items-center justify-center gap-1.5">
          <Clock size={14} />
          {t('currentTime')}
        </div>
        <div className="text-5xl sm:text-6xl font-mono font-bold text-indigo-600 dark:text-indigo-400 tabular-nums tracking-tight">
          {String(currentTime.getHours()).padStart(2, '0')}
          <span className="animate-pulse">:</span>
          {String(currentTime.getMinutes()).padStart(2, '0')}
          <span className="text-3xl sm:text-4xl text-indigo-400 dark:text-indigo-500 ml-1">
            {String(currentTime.getSeconds()).padStart(2, '0')}
          </span>
        </div>
        <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">
          {currentTime.toLocaleDateString('ko-KR', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            weekday: 'long',
          })}
        </div>
      </div>

      {/* Mode Toggle */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 space-y-6">
        <div className="flex rounded-lg bg-gray-100 dark:bg-gray-700 p-1">
          <button
            onClick={() => {
              setMode('sleepNow')
              setShowResults(true)
            }}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-md text-sm font-medium transition-colors ${
              mode === 'sleepNow'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
            }`}
          >
            <Moon size={16} />
            {t('modeNow')}
          </button>
          <button
            onClick={() => {
              setMode('wakeAt')
              setShowResults(false)
            }}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-md text-sm font-medium transition-colors ${
              mode === 'wakeAt'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
            }`}
          >
            <AlarmClock size={16} />
            {t('modeWakeAt')}
          </button>
        </div>

        {/* Fall asleep time setting */}
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {t('fallAsleepTime')}
          </label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={1}
              max={60}
              value={fallAsleepMinutes}
              onChange={(e) => {
                const v = parseInt(e.target.value, 10)
                if (!isNaN(v) && v >= 1 && v <= 60) setFallAsleepMinutes(v)
              }}
              className="w-20 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-center focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
            <span className="text-sm text-gray-500 dark:text-gray-400">{t('minutes')}</span>
          </div>
        </div>

        {/* Wake-at mode: time input */}
        {mode === 'wakeAt' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                <AlarmClock size={16} className="text-indigo-500" />
                {t('wakeUpAt')}
              </label>
              <input
                type="time"
                value={wakeUpInput}
                onChange={(e) => setWakeUpInput(e.target.value)}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-lg font-mono focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
            <button
              onClick={handleCalculateWakeAt}
              className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg px-4 py-3 font-medium hover:from-indigo-700 hover:to-purple-700 flex items-center justify-center gap-2 transition-colors"
            >
              <Moon size={18} />
              {t('calculate')}
            </button>
          </div>
        )}
      </div>

      {/* Results */}
      {showResults && options.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            {mode === 'sleepNow' ? <Sun size={20} className="text-amber-500" /> : <Moon size={20} className="text-indigo-500" />}
            {mode === 'sleepNow' ? t('resultTitleWakeUp') : t('resultTitleBedTime')}
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {options.map((opt) => {
              const colors = qualityColors[opt.quality]
              return (
                <div
                  key={opt.cycles}
                  className={`${colors.bg} border ${colors.border} rounded-xl p-4 transition-transform hover:scale-[1.02]`}
                >
                  {/* Badge row */}
                  <div className="flex items-center justify-between mb-3">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${colors.badge}`}>
                      {opt.cycles} {t('cycleLabel')}
                    </span>
                    {opt.quality === 'excellent' && (
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-600 text-white">
                        {t('recommended')}
                      </span>
                    )}
                  </div>

                  {/* Time */}
                  <div className="text-2xl font-bold text-gray-900 dark:text-white font-mono tabular-nums">
                    {formatTime(opt.time)}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 font-mono mt-0.5">
                    ({formatTime24(opt.time)})
                  </div>

                  {/* Total sleep */}
                  <div className="mt-2 text-sm text-gray-600 dark:text-gray-400 flex items-center gap-1">
                    <Clock size={13} />
                    {t('totalSleep')}: {formatHoursMinutes(opt.totalMinutes)}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Explanation */}
          <div className="bg-indigo-50 dark:bg-indigo-950/30 rounded-xl p-4 text-sm text-indigo-700 dark:text-indigo-300">
            <p className="flex items-start gap-2">
              <ChevronRight size={16} className="flex-shrink-0 mt-0.5" />
              {t('cycleExplanation')}
            </p>
          </div>
        </div>
      )}

      {/* Age Group Sleep Recommendations */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <AlarmClock size={20} className="text-indigo-500" />
          {t('ageGroupTitle')}
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700">
                <th className="text-left py-2 px-3 font-medium text-gray-600 dark:text-gray-400">
                  {t('ageGroupLabel')}
                </th>
                <th className="text-right py-2 px-3 font-medium text-gray-600 dark:text-gray-400">
                  {t('recommendedHours')}
                </th>
              </tr>
            </thead>
            <tbody>
              {ageGroupData.map((row, i) => (
                <tr
                  key={i}
                  className={`border-b border-gray-100 dark:border-gray-700/50 ${
                    row.age === t('ageAdult')
                      ? 'bg-indigo-50 dark:bg-indigo-950/30 font-medium'
                      : ''
                  }`}
                >
                  <td className="py-2 px-3 text-gray-800 dark:text-gray-200">{row.age}</td>
                  <td className="py-2 px-3 text-right text-gray-600 dark:text-gray-400">
                    {row.hours} {t('hoursLabel')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-3">{t('ageGroupSource')}</p>
      </div>

      {/* Guide Section */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
          <BookOpen size={20} className="text-indigo-500" />
          {t('guideTitle')}
        </h2>
        <div className="grid md:grid-cols-3 gap-6">
          {/* Healthy Habits */}
          <div>
            <h3 className="font-medium text-gray-800 dark:text-gray-200 mb-3 flex items-center gap-1.5">
              <Moon size={16} className="text-indigo-500" />
              {t('guideHabitsTitle')}
            </h3>
            <ul className="space-y-2">
              {(t.raw('guideHabitsItems') as string[]).map((item, i) => (
                <li
                  key={i}
                  className="flex gap-2 text-sm text-gray-600 dark:text-gray-400"
                >
                  <span className="flex-shrink-0 text-indigo-500 mt-0.5">•</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>

          {/* Sleep Science */}
          <div>
            <h3 className="font-medium text-gray-800 dark:text-gray-200 mb-3 flex items-center gap-1.5">
              <Sun size={16} className="text-amber-500" />
              {t('guideScienceTitle')}
            </h3>
            <ul className="space-y-2">
              {(t.raw('guideScienceItems') as string[]).map((item, i) => (
                <li
                  key={i}
                  className="flex gap-2 text-sm text-gray-600 dark:text-gray-400"
                >
                  <span className="flex-shrink-0 text-amber-500 mt-0.5">•</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>

          {/* Tips */}
          <div>
            <h3 className="font-medium text-gray-800 dark:text-gray-200 mb-3 flex items-center gap-1.5">
              <Clock size={16} className="text-emerald-500" />
              {t('guideTipsTitle')}
            </h3>
            <ul className="space-y-2">
              {(t.raw('guideTipsItems') as string[]).map((item, i) => (
                <li
                  key={i}
                  className="flex gap-2 text-sm text-gray-600 dark:text-gray-400"
                >
                  <span className="flex-shrink-0 text-emerald-500 mt-0.5">•</span>
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
