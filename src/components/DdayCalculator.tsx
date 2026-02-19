'use client'

import { useState, useCallback, useEffect, useMemo } from 'react'
import { useTranslations } from 'next-intl'
import {
  Calendar,
  ArrowRightLeft,
  Plus,
  Minus,
  Copy,
  Check,
  Share2,
  CalendarDays,
  Briefcase,
  Flag,
  BookOpen,
  Clock,
} from 'lucide-react'
import {
  getKoreanHolidays,
  countBusinessDays,
  getHolidaysInRange,
  getPresetDates,
  type KoreanHoliday,
} from '@/utils/koreanHolidays'

type DdayMode = 'dday' | 'diff' | 'add'
type AddDirection = 'add' | 'subtract'
type AddUnit = 'days' | 'weeks' | 'months' | 'years'

interface DdayResult {
  totalDays: number
  weeks: number
  remainingDays: number
  months: number
  monthRemainingDays: number
  years: number
  yearMonths: number
  yearDays: number
  businessDays: number
  businessDaysExcludeHolidays: number
  holidaysInRange: KoreanHoliday[]
  ddayString: string
  isFuture: boolean
}

function formatDateStr(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function getTodayStr(): string {
  return formatDateStr(new Date())
}

function parseDateStr(s: string): Date {
  return new Date(s + 'T00:00:00')
}

function calculateDifference(startStr: string, endStr: string): DdayResult | null {
  if (!startStr || !endStr) return null

  const start = parseDateStr(startStr)
  const end = parseDateStr(endStr)

  const diffMs = end.getTime() - start.getTime()
  const totalDays = Math.round(diffMs / (1000 * 60 * 60 * 24))
  const absDays = Math.abs(totalDays)
  const isFuture = totalDays > 0

  // Weeks
  const weeks = Math.floor(absDays / 7)
  const remainingDays = absDays % 7

  // Calendar months
  const [earlier, later] = totalDays >= 0 ? [start, end] : [end, start]
  let months = (later.getFullYear() - earlier.getFullYear()) * 12 + (later.getMonth() - earlier.getMonth())
  let monthRemainingDays = later.getDate() - earlier.getDate()
  if (monthRemainingDays < 0) {
    months--
    const prevMonth = new Date(later.getFullYear(), later.getMonth(), 0)
    monthRemainingDays += prevMonth.getDate()
  }

  const years = Math.floor(months / 12)
  const yearMonths = months % 12
  const yearDays = monthRemainingDays

  // Business days
  const businessDays = countBusinessDays(earlier, later)
  const holidays = getHolidaysInRange(earlier, later)
  const businessDaysExcludeHolidays = countBusinessDays(earlier, later, holidays)

  // D-Day string
  let ddayString: string
  if (totalDays === 0) ddayString = 'D-Day!'
  else if (totalDays > 0) ddayString = `D-${totalDays}`
  else ddayString = `D+${Math.abs(totalDays)}`

  return {
    totalDays: absDays,
    weeks,
    remainingDays,
    months,
    monthRemainingDays,
    years,
    yearMonths,
    yearDays,
    businessDays,
    businessDaysExcludeHolidays,
    holidaysInRange: holidays,
    ddayString,
    isFuture,
  }
}

function addDateCalc(baseDateStr: string, value: number, unit: AddUnit, direction: AddDirection, businessOnly: boolean): string | null {
  if (!baseDateStr || value <= 0) return null

  const base = parseDateStr(baseDateStr)
  const multiplier = direction === 'subtract' ? -1 : 1

  if (!businessOnly) {
    const result = new Date(base)
    switch (unit) {
      case 'days':
        result.setDate(result.getDate() + value * multiplier)
        break
      case 'weeks':
        result.setDate(result.getDate() + value * 7 * multiplier)
        break
      case 'months':
        result.setMonth(result.getMonth() + value * multiplier)
        break
      case 'years':
        result.setFullYear(result.getFullYear() + value * multiplier)
        break
    }
    return formatDateStr(result)
  }

  // Business days calculation
  const current = new Date(base)
  let remaining = value
  const step = multiplier

  while (remaining > 0) {
    current.setDate(current.getDate() + step)
    const day = current.getDay()
    if (day !== 0 && day !== 6) {
      remaining--
    }
  }
  return formatDateStr(current)
}

const DdayCalculator = () => {
  const t = useTranslations('ddayCalculator')

  // Mode
  const [mode, setMode] = useState<DdayMode>('dday')

  // D-Day mode
  const [targetDate, setTargetDate] = useState('')
  const [eventName, setEventName] = useState('')

  // Diff mode
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  // Add mode
  const [baseDate, setBaseDate] = useState(getTodayStr())
  const [addValue, setAddValue] = useState(30)
  const [addUnit, setAddUnit] = useState<AddUnit>('days')
  const [addDirection, setAddDirection] = useState<AddDirection>('add')
  const [businessDaysOnly, setBusinessDaysOnly] = useState(false)

  // Shared
  const [copied, setCopied] = useState(false)

  // URL state sync
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const m = params.get('mode') as DdayMode | null
    if (m && ['dday', 'diff', 'add'].includes(m)) setMode(m)
    if (params.get('target')) setTargetDate(params.get('target')!)
    if (params.get('event')) setEventName(params.get('event')!)
    if (params.get('start')) setStartDate(params.get('start')!)
    if (params.get('end')) setEndDate(params.get('end')!)
    if (params.get('base')) setBaseDate(params.get('base')!)
    if (params.get('value')) setAddValue(Number(params.get('value')))
    if (params.get('unit')) setAddUnit(params.get('unit') as AddUnit)
    if (params.get('dir')) setAddDirection(params.get('dir') as AddDirection)
  }, [])

  const updateURL = useCallback((params: Record<string, string>) => {
    const url = new URL(window.location.href)
    Object.entries(params).forEach(([key, value]) => {
      if (value) url.searchParams.set(key, value)
      else url.searchParams.delete(key)
    })
    window.history.replaceState({}, '', url)
  }, [])

  // Sync URL on changes
  useEffect(() => {
    const params: Record<string, string> = { mode }
    if (mode === 'dday') {
      params.target = targetDate
      params.event = eventName
    } else if (mode === 'diff') {
      params.start = startDate
      params.end = endDate
    } else {
      params.base = baseDate
      params.value = String(addValue)
      params.unit = addUnit
      params.dir = addDirection
    }
    updateURL(params)
  }, [mode, targetDate, eventName, startDate, endDate, baseDate, addValue, addUnit, addDirection, updateURL])

  // Results
  const ddayResult = useMemo(() => {
    if (mode === 'dday' && targetDate) {
      return calculateDifference(getTodayStr(), targetDate)
    }
    if (mode === 'diff' && startDate && endDate) {
      return calculateDifference(startDate, endDate)
    }
    return null
  }, [mode, targetDate, startDate, endDate])

  const addResult = useMemo(() => {
    if (mode === 'add' && baseDate && addValue > 0) {
      return addDateCalc(baseDate, addValue, addUnit, addDirection, businessDaysOnly)
    }
    return null
  }, [mode, baseDate, addValue, addUnit, addDirection, businessDaysOnly])

  const addResultDiff = useMemo(() => {
    if (addResult && baseDate) {
      const [s, e] = addDirection === 'subtract' ? [addResult, baseDate] : [baseDate, addResult]
      return calculateDifference(s, e)
    }
    return null
  }, [addResult, baseDate, addDirection])

  // Presets
  const presets = useMemo(() => {
    return getPresetDates(new Date().getFullYear())
  }, [])

  const handlePreset = useCallback((date: string) => {
    setMode('dday')
    setTargetDate(date)
  }, [])

  const handleSwapDates = useCallback(() => {
    setStartDate(endDate)
    setEndDate(startDate)
  }, [startDate, endDate])

  const handleShare = useCallback(async () => {
    const url = window.location.href
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url)
      } else {
        const textarea = document.createElement('textarea')
        textarea.value = url
        textarea.style.position = 'fixed'
        textarea.style.left = '-999999px'
        document.body.appendChild(textarea)
        textarea.select()
        document.execCommand('copy')
        document.body.removeChild(textarea)
      }
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }, [])

  // Format date for display
  const formatDisplayDate = useCallback((dateStr: string) => {
    if (!dateStr) return ''
    const d = parseDateStr(dateStr)
    const days = ['일', '월', '화', '수', '목', '금', '토']
    return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일 (${days[d.getDay()]})`
  }, [])

  const modeButtons: { key: DdayMode; icon: typeof Calendar }[] = [
    { key: 'dday', icon: CalendarDays },
    { key: 'diff', icon: ArrowRightLeft },
    { key: 'add', icon: Plus },
  ]

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Calendar className="w-7 h-7 text-blue-600" />
            {t('title')}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('description')}</p>
        </div>
        <button
          onClick={handleShare}
          className="flex items-center gap-2 px-3 py-2 text-sm rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 transition-colors"
        >
          {copied ? <Check className="w-4 h-4 text-green-500" /> : <Share2 className="w-4 h-4" />}
          {copied ? t('result.dday') === 'D-Day!' ? 'Copied!' : '복사됨!' : t('share')}
        </button>
      </div>

      {/* Mode Tabs */}
      <div className="flex gap-2 bg-white dark:bg-gray-800 rounded-xl shadow-lg p-2">
        {modeButtons.map(({ key, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setMode(key)}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium transition-all ${
              mode === key
                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
          >
            <Icon className="w-4 h-4" />
            <span className="text-sm">{t(`modes.${key}`)}</span>
          </button>
        ))}
      </div>

      {/* Main Grid */}
      <div className="grid lg:grid-cols-3 gap-8">
        {/* Left Panel - Settings */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 space-y-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <Clock className="w-5 h-5 text-blue-600" />
              {mode === 'dday' && t('modes.dday')}
              {mode === 'diff' && t('modes.diff')}
              {mode === 'add' && t('modes.add')}
            </h2>

            {/* D-Day Mode */}
            {mode === 'dday' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t('dday.targetDate')}
                  </label>
                  <input
                    type="date"
                    value={targetDate}
                    onChange={(e) => setTargetDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t('dday.eventName')}
                  </label>
                  <input
                    type="text"
                    value={eventName}
                    onChange={(e) => setEventName(e.target.value)}
                    placeholder={t('dday.eventNamePlaceholder')}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <button
                  onClick={() => setTargetDate(getTodayStr())}
                  className="w-full px-3 py-2 text-sm bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 transition-colors"
                >
                  {t('dday.setToday')}
                </button>
              </>
            )}

            {/* Diff Mode */}
            {mode === 'diff' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t('diff.startDate')}
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <button
                  onClick={handleSwapDates}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 transition-colors"
                >
                  <ArrowRightLeft className="w-4 h-4" />
                  {t('diff.swap')}
                </button>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t('diff.endDate')}
                  </label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </>
            )}

            {/* Add Mode */}
            {mode === 'add' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t('add.baseDate')}
                  </label>
                  <input
                    type="date"
                    value={baseDate}
                    onChange={(e) => setBaseDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setAddDirection('add')}
                    className={`flex-1 flex items-center justify-center gap-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      addDirection === 'add'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    <Plus className="w-4 h-4" />
                    {t('add.direction.add')}
                  </button>
                  <button
                    onClick={() => setAddDirection('subtract')}
                    className={`flex-1 flex items-center justify-center gap-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      addDirection === 'subtract'
                        ? 'bg-red-600 text-white'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    <Minus className="w-4 h-4" />
                    {t('add.direction.subtract')}
                  </button>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t('add.value')}
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={addValue}
                    onChange={(e) => setAddValue(Math.max(1, Number(e.target.value)))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t('add.unit')}
                  </label>
                  <select
                    value={addUnit}
                    onChange={(e) => setAddUnit(e.target.value as AddUnit)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    {(['days', 'weeks', 'months', 'years'] as const).map((u) => (
                      <option key={u} value={u}>{t(`add.units.${u}`)}</option>
                    ))}
                  </select>
                </div>
                {addUnit === 'days' && (
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={businessDaysOnly}
                      onChange={(e) => setBusinessDaysOnly(e.target.checked)}
                      className="w-4 h-4 accent-blue-600 rounded"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">{t('add.businessDaysOnly')}</span>
                  </label>
                )}
              </>
            )}
          </div>

          {/* Presets */}
          <div className="bg-blue-50 dark:bg-blue-950 rounded-xl p-6">
            <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-200 mb-3 flex items-center gap-2">
              <Flag className="w-4 h-4" />
              {t('presets.title')}
            </h3>
            <div className="grid grid-cols-2 gap-2">
              {presets.map((preset) => {
                const daysLeft = Math.round((parseDateStr(preset.date).getTime() - new Date(new Date().toDateString()).getTime()) / (1000 * 60 * 60 * 24))
                return (
                  <button
                    key={preset.key}
                    onClick={() => handlePreset(preset.date)}
                    className="flex flex-col items-start px-3 py-2 bg-white dark:bg-gray-800 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900 transition-colors text-left"
                  >
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      {t(`presets.${preset.key}`)}
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      D-{daysLeft}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        {/* Right Panel - Results */}
        <div className="lg:col-span-2">
          {/* D-Day / Diff Result */}
          {(mode === 'dday' || mode === 'diff') && ddayResult && (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 space-y-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{t('result.title')}</h2>

              {/* Big D-Day Display */}
              {mode === 'dday' && (
                <div className="text-center py-6">
                  {eventName && (
                    <p className="text-lg text-gray-600 dark:text-gray-400 mb-2">{eventName}</p>
                  )}
                  <div className={`text-6xl font-bold mb-2 ${
                    ddayResult.ddayString === 'D-Day!'
                      ? 'text-red-600 dark:text-red-400'
                      : ddayResult.isFuture
                        ? 'text-blue-600 dark:text-blue-400'
                        : 'text-gray-600 dark:text-gray-400'
                  }`}>
                    {ddayResult.ddayString}
                  </div>
                  <p className="text-gray-500 dark:text-gray-400">
                    {formatDisplayDate(targetDate)}
                  </p>
                </div>
              )}

              {/* Stats Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <StatCard
                  label={t('result.totalDays')}
                  value={`${ddayResult.totalDays}`}
                  suffix={t('result.days')}
                  icon={<CalendarDays className="w-5 h-5 text-blue-600" />}
                />
                <StatCard
                  label={`${t('result.weeks')} + ${t('result.days')}`}
                  value={`${ddayResult.weeks}`}
                  suffix={`${t('result.weeks')} ${ddayResult.remainingDays}${t('result.days')}`}
                  icon={<Calendar className="w-5 h-5 text-indigo-600" />}
                />
                {ddayResult.years > 0 ? (
                  <StatCard
                    label={`${t('result.years')} + ${t('result.months')}`}
                    value={`${ddayResult.years}`}
                    suffix={`${t('result.years')} ${ddayResult.yearMonths}${t('result.months')} ${ddayResult.yearDays}${t('result.days')}`}
                    icon={<Calendar className="w-5 h-5 text-purple-600" />}
                  />
                ) : (
                  <StatCard
                    label={`${t('result.months')} + ${t('result.days')}`}
                    value={`${ddayResult.months}`}
                    suffix={`${t('result.months')} ${ddayResult.monthRemainingDays}${t('result.days')}`}
                    icon={<Calendar className="w-5 h-5 text-purple-600" />}
                  />
                )}
                <StatCard
                  label={t('result.businessDays')}
                  value={`${ddayResult.businessDays}`}
                  suffix={t('result.days')}
                  icon={<Briefcase className="w-5 h-5 text-green-600" />}
                />
                <StatCard
                  label={t('result.businessDaysHoliday')}
                  value={`${ddayResult.businessDaysExcludeHolidays}`}
                  suffix={t('result.days')}
                  icon={<Briefcase className="w-5 h-5 text-emerald-600" />}
                />
              </div>

              {/* Holidays in Range */}
              {ddayResult.holidaysInRange.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                    <Flag className="w-4 h-4 text-red-500" />
                    {t('result.holidaysInRange')} ({ddayResult.holidaysInRange.length})
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {ddayResult.holidaysInRange.map((h, i) => {
                      const d = parseDateStr(h.date)
                      const dayNames = ['일', '월', '화', '수', '목', '금', '토']
                      return (
                        <div
                          key={`${h.date}-${i}`}
                          className="flex items-center justify-between px-3 py-2 bg-red-50 dark:bg-red-950 rounded-lg"
                        >
                          <span className="text-sm font-medium text-gray-900 dark:text-white">{h.name}</span>
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {d.getMonth() + 1}/{d.getDate()} ({dayNames[d.getDay()]})
                          </span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Add Mode Result */}
          {mode === 'add' && addResult && (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 space-y-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{t('add.resultDate')}</h2>

              <div className="text-center py-6">
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                  {formatDisplayDate(baseDate)} {addDirection === 'add' ? '+' : '-'} {addValue} {t(`add.units.${addUnit}`)}
                  {businessDaysOnly ? ` (${t('add.businessDaysOnly')})` : ''}
                </p>
                <div className="text-4xl font-bold text-blue-600 dark:text-blue-400 mb-2">
                  {formatDisplayDate(addResult)}
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {addResult}
                </p>
              </div>

              {addResultDiff && (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  <StatCard
                    label={t('result.totalDays')}
                    value={`${addResultDiff.totalDays}`}
                    suffix={t('result.days')}
                    icon={<CalendarDays className="w-5 h-5 text-blue-600" />}
                  />
                  <StatCard
                    label={t('result.businessDays')}
                    value={`${addResultDiff.businessDays}`}
                    suffix={t('result.days')}
                    icon={<Briefcase className="w-5 h-5 text-green-600" />}
                  />
                  <StatCard
                    label={t('result.businessDaysHoliday')}
                    value={`${addResultDiff.businessDaysExcludeHolidays}`}
                    suffix={t('result.days')}
                    icon={<Briefcase className="w-5 h-5 text-emerald-600" />}
                  />
                </div>
              )}
            </div>
          )}

          {/* Empty State */}
          {((mode === 'dday' && !targetDate) ||
            (mode === 'diff' && (!startDate || !endDate)) ||
            (mode === 'add' && !addResult)) && (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-12 text-center">
              <Calendar className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
              <p className="text-gray-500 dark:text-gray-400">
                {mode === 'dday' && t('dday.targetDate')}
                {mode === 'diff' && `${t('diff.startDate')} / ${t('diff.endDate')}`}
                {mode === 'add' && t('add.value')}
              </p>
            </div>
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
          <div>
            <h3 className="font-medium text-gray-900 dark:text-white mb-3">{t('guide.usage.title')}</h3>
            <ul className="space-y-2">
              {(t.raw('guide.usage.items') as string[]).map((item, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <span className="text-blue-600 mt-0.5">&#8226;</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="font-medium text-gray-900 dark:text-white mb-3">{t('guide.businessDays.title')}</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
              {t('guide.businessDays.description')}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

// Stat Card Sub-component
function StatCard({ label, value, suffix, icon }: { label: string; value: string; suffix: string; icon: React.ReactNode }) {
  return (
    <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
      <div className="flex items-center gap-2 mb-1">
        {icon}
        <span className="text-xs text-gray-500 dark:text-gray-400">{label}</span>
      </div>
      <div className="flex items-baseline gap-1">
        <span className="text-2xl font-bold text-gray-900 dark:text-white">{value}</span>
        <span className="text-sm text-gray-500 dark:text-gray-400">{suffix}</span>
      </div>
    </div>
  )
}

export default DdayCalculator
