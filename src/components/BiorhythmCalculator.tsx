'use client'

import { useState, useMemo, useCallback, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { Calendar, Heart, Brain, Dumbbell, Users, ChevronLeft, ChevronRight, BookOpen, AlertTriangle, Info } from 'lucide-react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, ReferenceLine
} from 'recharts'

// ── Constants ──
const PHYSICAL_CYCLE = 23
const EMOTIONAL_CYCLE = 28
const INTELLECTUAL_CYCLE = 33

// ── Utility functions ──
function daysBetween(d1: Date, d2: Date): number {
  const utc1 = Date.UTC(d1.getFullYear(), d1.getMonth(), d1.getDate())
  const utc2 = Date.UTC(d2.getFullYear(), d2.getMonth(), d2.getDate())
  return Math.floor((utc2 - utc1) / (1000 * 60 * 60 * 24))
}

function biorhythmValue(days: number, cycle: number): number {
  return Math.sin((2 * Math.PI * days) / cycle) * 100
}

function isCriticalDay(days: number, cycle: number): boolean {
  const val = Math.abs(biorhythmValue(days, cycle))
  return val < 5
}

function formatDate(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date)
  result.setDate(result.getDate() + days)
  return result
}

function getStatusLevel(value: number): 'high' | 'medium' | 'low' | 'critical' {
  const abs = Math.abs(value)
  if (abs < 5) return 'critical'
  if (value > 50) return 'high'
  if (value > -20) return 'medium'
  return 'low'
}

function compatibilityScore(days1: number, days2: number, cycle: number): number {
  const v1 = biorhythmValue(days1, cycle)
  const v2 = biorhythmValue(days2, cycle)
  // Phase difference approach: similarity = 100 - |v1 - v2| / 2
  return Math.max(0, Math.min(100, 100 - Math.abs(v1 - v2) / 2))
}

// ── Component ──
export default function BiorhythmCalculator() {
  const t = useTranslations('biorhythm')

  // State
  const [birthDate, setBirthDate] = useState('')
  const [targetDate, setTargetDate] = useState(formatDate(new Date()))
  const [period, setPeriod] = useState(30)
  const [showCompatibility, setShowCompatibility] = useState(false)
  const [birthDate2, setBirthDate2] = useState('')
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const now = new Date()
    return { year: now.getFullYear(), month: now.getMonth() }
  })

  // URL state sync
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const bd = params.get('birthDate')
    const td = params.get('targetDate')
    const p = params.get('period')
    const bd2 = params.get('birthDate2')
    if (bd) setBirthDate(bd)
    if (td) setTargetDate(td)
    if (p) setPeriod(Number(p))
    if (bd2) {
      setBirthDate2(bd2)
      setShowCompatibility(true)
    }
  }, [])

  const updateURL = useCallback((params: Record<string, string>) => {
    const url = new URL(window.location.href)
    Object.entries(params).forEach(([key, value]) => {
      if (value) url.searchParams.set(key, value)
      else url.searchParams.delete(key)
    })
    window.history.replaceState({}, '', url)
  }, [])

  useEffect(() => {
    updateURL({
      birthDate,
      targetDate,
      period: String(period),
      birthDate2: showCompatibility ? birthDate2 : '',
    })
  }, [birthDate, targetDate, period, birthDate2, showCompatibility, updateURL])

  // Calculations
  const target = useMemo(() => new Date(targetDate), [targetDate])
  const birth = useMemo(() => birthDate ? new Date(birthDate) : null, [birthDate])
  const birth2 = useMemo(() => birthDate2 ? new Date(birthDate2) : null, [birthDate2])

  const todayDays = useMemo(() => {
    if (!birth) return 0
    return daysBetween(birth, target)
  }, [birth, target])

  const todayValues = useMemo(() => {
    if (!birth) return { physical: 0, emotional: 0, intellectual: 0 }
    return {
      physical: biorhythmValue(todayDays, PHYSICAL_CYCLE),
      emotional: biorhythmValue(todayDays, EMOTIONAL_CYCLE),
      intellectual: biorhythmValue(todayDays, INTELLECTUAL_CYCLE),
    }
  }, [birth, todayDays])

  const overallScore = useMemo(() => {
    return Math.round((todayValues.physical + todayValues.emotional + todayValues.intellectual) / 3)
  }, [todayValues])

  // Chart data
  const chartData = useMemo(() => {
    if (!birth) return []
    const halfBefore = Math.floor(period / 3)
    const data = []
    for (let i = -halfBefore; i <= period - halfBefore; i++) {
      const date = addDays(target, i)
      const days = daysBetween(birth, date)
      const days2 = birth2 ? daysBetween(birth2, date) : 0
      const entry: Record<string, string | number> = {
        date: formatDate(date),
        label: `${date.getMonth() + 1}/${date.getDate()}`,
        physical: Math.round(biorhythmValue(days, PHYSICAL_CYCLE) * 10) / 10,
        emotional: Math.round(biorhythmValue(days, EMOTIONAL_CYCLE) * 10) / 10,
        intellectual: Math.round(biorhythmValue(days, INTELLECTUAL_CYCLE) * 10) / 10,
      }
      if (birth2 && showCompatibility) {
        entry.physical2 = Math.round(biorhythmValue(days2, PHYSICAL_CYCLE) * 10) / 10
        entry.emotional2 = Math.round(biorhythmValue(days2, EMOTIONAL_CYCLE) * 10) / 10
        entry.intellectual2 = Math.round(biorhythmValue(days2, INTELLECTUAL_CYCLE) * 10) / 10
      }
      data.push(entry)
    }
    return data
  }, [birth, birth2, target, period, showCompatibility])

  // Compatibility scores
  const compatibility = useMemo(() => {
    if (!birth || !birth2) return null
    const days1 = daysBetween(birth, target)
    const days2 = daysBetween(birth2, target)
    const phys = compatibilityScore(days1, days2, PHYSICAL_CYCLE)
    const emot = compatibilityScore(days1, days2, EMOTIONAL_CYCLE)
    const intl = compatibilityScore(days1, days2, INTELLECTUAL_CYCLE)
    return {
      physical: Math.round(phys),
      emotional: Math.round(emot),
      intellectual: Math.round(intl),
      overall: Math.round((phys + emot + intl) / 3),
    }
  }, [birth, birth2, target])

  // Calendar data
  const calendarDays = useMemo(() => {
    if (!birth) return []
    const { year, month } = calendarMonth
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const startPad = firstDay.getDay()

    const days: Array<{
      date: Date | null
      physical: number
      emotional: number
      intellectual: number
      isToday: boolean
      isCritical: boolean
    }> = []

    // Padding for start of week
    for (let i = 0; i < startPad; i++) {
      days.push({ date: null, physical: 0, emotional: 0, intellectual: 0, isToday: false, isCritical: false })
    }

    for (let d = 1; d <= lastDay.getDate(); d++) {
      const date = new Date(year, month, d)
      const dayCount = daysBetween(birth, date)
      const phys = biorhythmValue(dayCount, PHYSICAL_CYCLE)
      const emot = biorhythmValue(dayCount, EMOTIONAL_CYCLE)
      const intl = biorhythmValue(dayCount, INTELLECTUAL_CYCLE)
      const isToday = formatDate(date) === targetDate
      const isCritical = isCriticalDay(dayCount, PHYSICAL_CYCLE) ||
        isCriticalDay(dayCount, EMOTIONAL_CYCLE) ||
        isCriticalDay(dayCount, INTELLECTUAL_CYCLE)
      days.push({ date, physical: phys, emotional: emot, intellectual: intl, isToday, isCritical })
    }

    return days
  }, [birth, calendarMonth, targetDate])

  const rhythmColor = (value: number) => {
    if (value > 50) return 'text-green-600 dark:text-green-400'
    if (value > 0) return 'text-blue-600 dark:text-blue-400'
    if (value > -50) return 'text-yellow-600 dark:text-yellow-400'
    return 'text-red-600 dark:text-red-400'
  }

  const dotColor = (value: number) => {
    if (value > 30) return 'bg-green-500'
    if (value > -30) return 'bg-yellow-400'
    return 'bg-red-500'
  }

  const statusKey = (value: number): string => {
    const level = getStatusLevel(value)
    return `status.${level}`
  }

  const gaugeBar = (value: number, color: string, label: string, icon: React.ReactNode) => {
    const pct = (value + 100) / 2
    const isCrit = Math.abs(value) < 5
    return (
      <div className="space-y-1">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-1.5">
            {icon}
            <span className="font-medium text-gray-700 dark:text-gray-300">{label}</span>
          </div>
          <div className="flex items-center gap-2">
            {isCrit && (
              <span className="flex items-center gap-0.5 text-xs text-amber-600 dark:text-amber-400 font-medium">
                <AlertTriangle className="w-3 h-3" />
                {t('criticalDay')}
              </span>
            )}
            <span className={`font-bold ${rhythmColor(value)}`}>{Math.round(value)}%</span>
          </div>
        </div>
        <div className="relative h-4 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <div className="absolute top-0 left-1/2 w-px h-full bg-gray-400 dark:bg-gray-500 z-10" />
          <div
            className={`absolute top-0 h-full rounded-full transition-all duration-500 ${color}`}
            style={{
              left: value >= 0 ? '50%' : `${pct}%`,
              width: `${Math.abs(value) / 2}%`,
            }}
          />
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400">{t(statusKey(value))}</p>
      </div>
    )
  }

  const periodOptions = [7, 14, 30, 60, 90]

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null
    return (
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg p-3 text-sm">
        <p className="font-medium text-gray-900 dark:text-white mb-1">{label}</p>
        {payload.map((entry: { color: string; name: string; value: number }, idx: number) => (
          <p key={idx} style={{ color: entry.color }} className="flex justify-between gap-4">
            <span>{entry.name}</span>
            <span className="font-medium">{entry.value}%</span>
          </p>
        ))}
      </div>
    )
  }

  const prevMonth = () => {
    setCalendarMonth(prev => {
      if (prev.month === 0) return { year: prev.year - 1, month: 11 }
      return { ...prev, month: prev.month - 1 }
    })
  }
  const nextMonth = () => {
    setCalendarMonth(prev => {
      if (prev.month === 11) return { year: prev.year + 1, month: 0 }
      return { ...prev, month: prev.month + 1 }
    })
  }

  const weekDays = [t('calendar.sun'), t('calendar.mon'), t('calendar.tue'), t('calendar.wed'), t('calendar.thu'), t('calendar.fri'), t('calendar.sat')]

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('title')}</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('description')}</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Input Panel */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 space-y-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <Calendar className="w-5 h-5 text-blue-600" />
              {t('inputTitle')}
            </h2>

            {/* Birth date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('birthDate')}
              </label>
              <input
                type="date"
                value={birthDate}
                onChange={e => setBirthDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                max={targetDate}
              />
            </div>

            {/* Target date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('targetDate')}
              </label>
              <input
                type="date"
                value={targetDate}
                onChange={e => setTargetDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Period */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('periodLabel')}
              </label>
              <select
                value={period}
                onChange={e => setPeriod(Number(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
              >
                {periodOptions.map(p => (
                  <option key={p} value={p}>{t('periodDays', { days: p })}</option>
                ))}
              </select>
            </div>

            {/* Days lived info */}
            {birth && (
              <div className="bg-blue-50 dark:bg-blue-950 rounded-lg p-3 text-sm">
                <p className="text-blue-800 dark:text-blue-300">
                  {t('daysLived', { days: todayDays.toLocaleString() })}
                </p>
              </div>
            )}
          </div>

          {/* Compatibility toggle */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <Users className="w-5 h-5 text-purple-600" />
                {t('compatibility.title')}
              </h2>
              <button
                onClick={() => setShowCompatibility(!showCompatibility)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${showCompatibility ? 'bg-purple-600' : 'bg-gray-300 dark:bg-gray-600'}`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${showCompatibility ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
            </div>

            {showCompatibility && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('compatibility.birthDate2')}
                </label>
                <input
                  type="date"
                  value={birthDate2}
                  onChange={e => setBirthDate2(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                  max={targetDate}
                />
              </div>
            )}
          </div>
        </div>

        {/* Results Panel */}
        <div className="lg:col-span-2 space-y-6">
          {!birth ? (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-12 text-center">
              <Calendar className="w-16 h-16 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
              <p className="text-gray-500 dark:text-gray-400">{t('emptyState')}</p>
            </div>
          ) : (
            <>
              {/* Today's Biorhythm Card */}
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 space-y-5">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{t('todayTitle')}</h2>
                  <div className="text-right">
                    <p className="text-xs text-gray-500 dark:text-gray-400">{t('overallCondition')}</p>
                    <p className={`text-2xl font-bold ${rhythmColor(overallScore)}`}>{overallScore}%</p>
                  </div>
                </div>

                {gaugeBar(todayValues.physical, 'bg-red-500', t('physical'), <Dumbbell className="w-4 h-4 text-red-500" />)}
                {gaugeBar(todayValues.emotional, 'bg-green-500', t('emotional'), <Heart className="w-4 h-4 text-green-500" />)}
                {gaugeBar(todayValues.intellectual, 'bg-blue-500', t('intellectual'), <Brain className="w-4 h-4 text-blue-500" />)}
              </div>

              {/* Chart */}
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{t('chartTitle')}</h2>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis
                        dataKey="label"
                        tick={{ fontSize: 11 }}
                        interval={period <= 14 ? 0 : period <= 30 ? 2 : period <= 60 ? 5 : 8}
                      />
                      <YAxis domain={[-100, 100]} tick={{ fontSize: 11 }} />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend />
                      <ReferenceLine y={0} stroke="#9ca3af" strokeDasharray="4 4" />
                      <ReferenceLine
                        x={`${target.getMonth() + 1}/${target.getDate()}`}
                        stroke="#6b7280"
                        strokeDasharray="4 4"
                        label={{ value: t('today'), position: 'top', fontSize: 11 }}
                      />
                      <Line type="monotone" dataKey="physical" name={t('physical')} stroke="#ef4444" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
                      <Line type="monotone" dataKey="emotional" name={t('emotional')} stroke="#22c55e" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
                      <Line type="monotone" dataKey="intellectual" name={t('intellectual')} stroke="#3b82f6" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
                      {showCompatibility && birth2 && (
                        <>
                          <Line type="monotone" dataKey="physical2" name={`${t('physical')}(2)`} stroke="#ef4444" strokeWidth={1.5} strokeDasharray="5 5" dot={false} />
                          <Line type="monotone" dataKey="emotional2" name={`${t('emotional')}(2)`} stroke="#22c55e" strokeWidth={1.5} strokeDasharray="5 5" dot={false} />
                          <Line type="monotone" dataKey="intellectual2" name={`${t('intellectual')}(2)`} stroke="#3b82f6" strokeWidth={1.5} strokeDasharray="5 5" dot={false} />
                        </>
                      )}
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Compatibility Scores */}
              {showCompatibility && compatibility && (
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                    <Users className="w-5 h-5 text-purple-600" />
                    {t('compatibility.resultTitle')}
                  </h2>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    {[
                      { key: 'overall', value: compatibility.overall, color: 'text-purple-600 dark:text-purple-400', bg: 'bg-purple-50 dark:bg-purple-950' },
                      { key: 'physical', value: compatibility.physical, color: 'text-red-600 dark:text-red-400', bg: 'bg-red-50 dark:bg-red-950' },
                      { key: 'emotional', value: compatibility.emotional, color: 'text-green-600 dark:text-green-400', bg: 'bg-green-50 dark:bg-green-950' },
                      { key: 'intellectual', value: compatibility.intellectual, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-950' },
                    ].map(item => (
                      <div key={item.key} className={`${item.bg} rounded-xl p-4 text-center`}>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                          {item.key === 'overall' ? t('compatibility.overall') : t(item.key)}
                        </p>
                        <p className={`text-2xl font-bold ${item.color}`}>{item.value}%</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Calendar View */}
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{t('calendarTitle')}</h2>
                  <div className="flex items-center gap-2">
                    <button onClick={prevMonth} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
                      <ChevronLeft className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                    </button>
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300 min-w-[100px] text-center">
                      {calendarMonth.year}.{String(calendarMonth.month + 1).padStart(2, '0')}
                    </span>
                    <button onClick={nextMonth} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
                      <ChevronRight className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                    </button>
                  </div>
                </div>

                {/* Legend */}
                <div className="flex items-center gap-4 mb-3 text-xs text-gray-500 dark:text-gray-400">
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500" />{t('physical')}</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500" />{t('emotional')}</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500" />{t('intellectual')}</span>
                  <span className="flex items-center gap-1"><AlertTriangle className="w-3 h-3 text-amber-500" />{t('criticalDay')}</span>
                </div>

                <div className="grid grid-cols-7 gap-1">
                  {/* Week day headers */}
                  {weekDays.map(day => (
                    <div key={day} className="text-center text-xs font-medium text-gray-500 dark:text-gray-400 py-1">{day}</div>
                  ))}
                  {/* Calendar cells */}
                  {calendarDays.map((day, idx) => (
                    <div
                      key={idx}
                      className={`relative text-center py-1.5 rounded-lg text-sm ${
                        !day.date ? '' :
                        day.isToday ? 'bg-blue-100 dark:bg-blue-900 font-bold' :
                        day.isCritical ? 'bg-amber-50 dark:bg-amber-950' : ''
                      }`}
                    >
                      {day.date && (
                        <>
                          <span className={`${day.isToday ? 'text-blue-700 dark:text-blue-300' : 'text-gray-700 dark:text-gray-300'}`}>
                            {day.date.getDate()}
                          </span>
                          <div className="flex justify-center gap-0.5 mt-0.5">
                            <span className={`w-1.5 h-1.5 rounded-full ${dotColor(day.physical)}`} />
                            <span className={`w-1.5 h-1.5 rounded-full ${dotColor(day.emotional)}`} />
                            <span className={`w-1.5 h-1.5 rounded-full ${dotColor(day.intellectual)}`} />
                          </div>
                          {day.isCritical && (
                            <span className="absolute top-0 right-0.5 text-amber-500 text-[8px]">!</span>
                          )}
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Guide Section */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-blue-600" />
          {t('guide.title')}
        </h2>

        <div className="grid md:grid-cols-2 gap-6">
          {/* What is biorhythm */}
          <div className="space-y-3">
            <h3 className="font-medium text-gray-900 dark:text-white">{t('guide.what.title')}</h3>
            <div className="text-sm text-gray-600 dark:text-gray-400 space-y-2">
              {(t.raw('guide.what.items') as string[]).map((item, i) => (
                <p key={i}>{item}</p>
              ))}
            </div>
          </div>

          {/* Rhythm meanings */}
          <div className="space-y-3">
            <h3 className="font-medium text-gray-900 dark:text-white">{t('guide.rhythms.title')}</h3>
            <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-2">
              {(t.raw('guide.rhythms.items') as string[]).map((item, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${i === 0 ? 'bg-red-500' : i === 1 ? 'bg-green-500' : 'bg-blue-500'}`} />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          {/* Critical days */}
          <div className="space-y-3">
            <h3 className="font-medium text-gray-900 dark:text-white flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              {t('guide.critical.title')}
            </h3>
            <div className="text-sm text-gray-600 dark:text-gray-400 space-y-2">
              {(t.raw('guide.critical.items') as string[]).map((item, i) => (
                <p key={i}>{item}</p>
              ))}
            </div>
          </div>

          {/* Disclaimer */}
          <div className="space-y-3">
            <h3 className="font-medium text-gray-900 dark:text-white flex items-center gap-2">
              <Info className="w-4 h-4 text-blue-500" />
              {t('guide.disclaimer.title')}
            </h3>
            <div className="bg-amber-50 dark:bg-amber-950 rounded-lg p-4 text-sm text-amber-800 dark:text-amber-300 space-y-2">
              {(t.raw('guide.disclaimer.items') as string[]).map((item, i) => (
                <p key={i}>{item}</p>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
