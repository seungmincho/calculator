'use client'

import { useState, useCallback, useEffect, useMemo } from 'react'
import { useTranslations } from 'next-intl'
import {
  Calendar,
  Heart,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  BookOpen,
  RefreshCw,
  Plus,
  Minus,
} from 'lucide-react'

interface CycleInfo {
  periodStart: Date
  periodEnd: Date
  fertileStart: Date
  fertileEnd: Date
  ovulationDate: Date
  safeEarlyStart: Date
  safeEarlyEnd: Date
  safeLateStart: Date
  safeLateEnd: Date
  nextPeriod: Date
}

type DayType = 'period' | 'fertile' | 'ovulation' | 'safe' | 'normal'

function formatDate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function parseDate(s: string): Date {
  return new Date(s + 'T00:00:00')
}

function addDays(d: Date, n: number): Date {
  const result = new Date(d)
  result.setDate(result.getDate() + n)
  return result
}

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
}

function isInRange(d: Date, start: Date, end: Date): boolean {
  const t = d.getTime()
  const s = new Date(start.getFullYear(), start.getMonth(), start.getDate()).getTime()
  const e = new Date(end.getFullYear(), end.getMonth(), end.getDate()).getTime()
  return t >= s && t <= e
}

function getDefaultDate(): string {
  const d = new Date()
  d.setDate(d.getDate() - 14)
  return formatDate(d)
}

export default function OvulationCalculator() {
  const t = useTranslations('ovulationCalculator')

  const [lastPeriod, setLastPeriod] = useState(getDefaultDate())
  const [cycleLength, setCycleLength] = useState(28)
  const [periodLength, setPeriodLength] = useState(5)
  const [calculated, setCalculated] = useState(false)
  const [copiedLink, setCopiedLink] = useState(false)
  const [guideOpen, setGuideOpen] = useState(false)

  // URL param restore
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const date = params.get('date')
    const cycle = params.get('cycle')
    const period = params.get('period')
    if (date) setLastPeriod(date)
    if (cycle) {
      const c = parseInt(cycle, 10)
      if (c >= 21 && c <= 45) setCycleLength(c)
    }
    if (period) {
      const p = parseInt(period, 10)
      if (p >= 3 && p <= 7) setPeriodLength(p)
    }
    if (date) setCalculated(true)
  }, [])

  const updateURL = useCallback((date: string, cycle: number, period: number) => {
    const url = new URL(window.location.href)
    url.searchParams.set('date', date)
    url.searchParams.set('cycle', String(cycle))
    url.searchParams.set('period', String(period))
    window.history.replaceState({}, '', url)
  }, [])

  // Calculate cycles for 3 months
  const cycles = useMemo<CycleInfo[]>(() => {
    if (!calculated) return []
    const result: CycleInfo[] = []
    let currentStart = parseDate(lastPeriod)

    for (let i = 0; i < 3; i++) {
      const periodStart = new Date(currentStart)
      const periodEnd = addDays(periodStart, periodLength - 1)
      const ovulationDate = addDays(periodStart, cycleLength - 14)
      const fertileStart = addDays(ovulationDate, -5)
      const fertileEnd = addDays(ovulationDate, 1)
      const nextPeriod = addDays(periodStart, cycleLength)
      const safeEarlyStart = addDays(periodEnd, 1)
      const safeEarlyEnd = addDays(fertileStart, -1)
      const safeLateStart = addDays(fertileEnd, 1)
      const safeLateEnd = addDays(nextPeriod, -1)

      result.push({
        periodStart, periodEnd, fertileStart, fertileEnd,
        ovulationDate, safeEarlyStart, safeEarlyEnd,
        safeLateStart, safeLateEnd, nextPeriod,
      })
      currentStart = nextPeriod
    }
    return result
  }, [calculated, lastPeriod, cycleLength, periodLength])

  const getDayType = useCallback((date: Date): DayType => {
    for (const cycle of cycles) {
      if (isSameDay(date, cycle.ovulationDate)) return 'ovulation'
      if (isInRange(date, cycle.periodStart, cycle.periodEnd)) return 'period'
      if (isInRange(date, cycle.fertileStart, cycle.fertileEnd)) return 'fertile'
      if (isInRange(date, cycle.safeEarlyStart, cycle.safeEarlyEnd)) return 'safe'
      if (isInRange(date, cycle.safeLateStart, cycle.safeLateEnd)) return 'safe'
    }
    return 'normal'
  }, [cycles])

  const handleCalculate = useCallback(() => {
    setCalculated(true)
    updateURL(lastPeriod, cycleLength, periodLength)
  }, [lastPeriod, cycleLength, periodLength, updateURL])

  const handleReset = useCallback(() => {
    setLastPeriod(getDefaultDate())
    setCycleLength(28)
    setPeriodLength(5)
    setCalculated(false)
    window.history.replaceState({}, '', window.location.pathname)
  }, [])

  const copyLink = useCallback(async () => {
    const url = new URL(window.location.href)
    url.searchParams.set('date', lastPeriod)
    url.searchParams.set('cycle', String(cycleLength))
    url.searchParams.set('period', String(periodLength))
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url.toString())
      } else {
        const textarea = document.createElement('textarea')
        textarea.value = url.toString()
        textarea.style.position = 'fixed'
        textarea.style.left = '-999999px'
        document.body.appendChild(textarea)
        textarea.select()
        document.execCommand('copy')
        document.body.removeChild(textarea)
      }
      setCopiedLink(true)
      setTimeout(() => setCopiedLink(false), 2000)
    } catch {
      setCopiedLink(true)
      setTimeout(() => setCopiedLink(false), 2000)
    }
  }, [lastPeriod, cycleLength, periodLength])

  const handleShare = useCallback(async () => {
    const url = new URL(window.location.href)
    url.searchParams.set('date', lastPeriod)
    url.searchParams.set('cycle', String(cycleLength))
    url.searchParams.set('period', String(periodLength))
    if (navigator.share) {
      try {
        await navigator.share({ title: t('title'), url: url.toString() })
      } catch { /* cancelled */ }
    } else {
      await copyLink()
    }
  }, [lastPeriod, cycleLength, periodLength, t, copyLink])

  const formatDisplayDate = useCallback((d: Date) => {
    const months = t.raw('months') as string[]
    return `${d.getFullYear()}. ${months[d.getMonth()]} ${d.getDate()}${t('days').charAt(0) === '일' ? '일' : ''}`
  }, [t])

  const formatShortDate = useCallback((d: Date) => {
    return `${d.getMonth() + 1}/${d.getDate()}`
  }, [])

  // Calendar rendering
  const calendarMonths = useMemo(() => {
    if (!calculated) return []
    const start = parseDate(lastPeriod)
    const months: { year: number; month: number }[] = []
    const seen = new Set<string>()
    for (let i = 0; i < 90; i++) {
      const d = addDays(start, i)
      const key = `${d.getFullYear()}-${d.getMonth()}`
      if (!seen.has(key)) {
        seen.add(key)
        months.push({ year: d.getFullYear(), month: d.getMonth() })
      }
      if (months.length >= 3) break
    }
    return months
  }, [calculated, lastPeriod])

  const today = useMemo(() => new Date(), [])

  const renderCalendar = useCallback((year: number, month: number) => {
    const monthNames = t.raw('months') as string[]
    const weekdays = t.raw('weekdays') as string[]
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const startDow = firstDay.getDay()
    const daysInMonth = lastDay.getDate()

    const cells: (number | null)[] = []
    for (let i = 0; i < startDow; i++) cells.push(null)
    for (let d = 1; d <= daysInMonth; d++) cells.push(d)
    while (cells.length % 7 !== 0) cells.push(null)

    return (
      <div key={`${year}-${month}`} className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4 sm:p-6">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white text-center mb-4">
          {year}. {monthNames[month]}
        </h3>
        <div className="grid grid-cols-7 gap-1">
          {weekdays.map((wd: string, i: number) => (
            <div key={i} className={`text-center text-xs font-semibold py-1 ${
              i === 0 ? 'text-red-500' : i === 6 ? 'text-blue-500' : 'text-gray-500 dark:text-gray-400'
            }`}>
              {wd}
            </div>
          ))}
          {cells.map((day, i) => {
            if (day === null) return <div key={`e-${i}`} />
            const date = new Date(year, month, day)
            const type = getDayType(date)
            const isToday = isSameDay(date, today)
            let cellClass = 'text-gray-700 dark:text-gray-300'
            if (type === 'period') cellClass = 'bg-red-200 dark:bg-red-800 text-red-800 dark:text-red-200'
            else if (type === 'ovulation') cellClass = 'bg-purple-500 text-white font-bold'
            else if (type === 'fertile') cellClass = 'bg-orange-200 dark:bg-orange-800 text-orange-800 dark:text-orange-200'
            else if (type === 'safe') cellClass = 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200'

            return (
              <div
                key={`d-${day}`}
                className={`text-center text-sm py-1.5 rounded-lg ${cellClass} ${
                  isToday ? 'ring-2 ring-purple-500 ring-offset-1 dark:ring-offset-gray-800' : ''
                }`}
              >
                {day}
              </div>
            )
          })}
        </div>
      </div>
    )
  }, [getDayType, t, today])

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <Heart className="w-7 h-7 text-pink-500" />
          {t('title')}
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('description')}</p>
      </div>

      {/* Input Section */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 space-y-5">
        {/* Last period date */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            <Calendar className="w-4 h-4 inline mr-1" />
            {t('lastPeriod')}
          </label>
          <input
            type="date"
            value={lastPeriod}
            onChange={(e) => setLastPeriod(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-pink-500"
          />
        </div>

        {/* Cycle length */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            {t('cycleLength')}
          </label>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCycleLength(Math.max(21, cycleLength - 1))}
              className="p-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg"
              aria-label="Decrease cycle length"
            >
              <Minus className="w-4 h-4 text-gray-700 dark:text-gray-300" />
            </button>
            <input
              type="number"
              min={21}
              max={45}
              value={cycleLength}
              onChange={(e) => {
                const v = parseInt(e.target.value, 10)
                if (v >= 21 && v <= 45) setCycleLength(v)
              }}
              className="w-20 text-center px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-pink-500"
            />
            <button
              onClick={() => setCycleLength(Math.min(45, cycleLength + 1))}
              className="p-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg"
              aria-label="Increase cycle length"
            >
              <Plus className="w-4 h-4 text-gray-700 dark:text-gray-300" />
            </button>
            <span className="text-sm text-gray-500 dark:text-gray-400">{t('days')}</span>
          </div>
        </div>

        {/* Period length */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            {t('periodLength')}
          </label>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPeriodLength(Math.max(3, periodLength - 1))}
              className="p-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg"
              aria-label="Decrease period length"
            >
              <Minus className="w-4 h-4 text-gray-700 dark:text-gray-300" />
            </button>
            <input
              type="number"
              min={3}
              max={7}
              value={periodLength}
              onChange={(e) => {
                const v = parseInt(e.target.value, 10)
                if (v >= 3 && v <= 7) setPeriodLength(v)
              }}
              className="w-20 text-center px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-pink-500"
            />
            <button
              onClick={() => setPeriodLength(Math.min(7, periodLength + 1))}
              className="p-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg"
              aria-label="Increase period length"
            >
              <Plus className="w-4 h-4 text-gray-700 dark:text-gray-300" />
            </button>
            <span className="text-sm text-gray-500 dark:text-gray-400">{t('days')}</span>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex gap-3">
          <button
            onClick={handleCalculate}
            className="flex-1 bg-gradient-to-r from-pink-500 to-purple-500 text-white rounded-lg px-4 py-3 font-medium hover:from-pink-600 hover:to-purple-600 transition-colors flex items-center justify-center gap-2"
          >
            <Calendar className="w-5 h-5" />
            {t('calculate')}
          </button>
          <button
            onClick={handleReset}
            className="px-4 py-3 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg transition-colors flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            {t('reset')}
          </button>
        </div>
      </div>

      {/* Results */}
      {calculated && cycles.length > 0 && (
        <>
          {/* Summary Cards */}
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              {t('result')}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Ovulation */}
              <div className="bg-purple-50 dark:bg-purple-950 rounded-xl p-5 text-center">
                <div className="text-3xl mb-2">🥚</div>
                <div className="text-sm text-purple-600 dark:text-purple-400 font-medium mb-1">
                  {t('ovulationDate')}
                </div>
                <div className="text-lg font-bold text-purple-800 dark:text-purple-200">
                  {formatShortDate(cycles[0].ovulationDate)}
                </div>
                <div className="text-xs text-purple-500 dark:text-purple-400 mt-1">
                  {formatDisplayDate(cycles[0].ovulationDate)}
                </div>
              </div>

              {/* Fertile Window */}
              <div className="bg-orange-50 dark:bg-orange-950 rounded-xl p-5 text-center">
                <div className="text-3xl mb-2">🔥</div>
                <div className="text-sm text-orange-600 dark:text-orange-400 font-medium mb-1">
                  {t('fertileWindow')}
                </div>
                <div className="text-lg font-bold text-orange-800 dark:text-orange-200">
                  {formatShortDate(cycles[0].fertileStart)} {t('to')} {formatShortDate(cycles[0].fertileEnd)}
                </div>
              </div>

              {/* Next Period */}
              <div className="bg-red-50 dark:bg-red-950 rounded-xl p-5 text-center">
                <div className="text-3xl mb-2">📅</div>
                <div className="text-sm text-red-600 dark:text-red-400 font-medium mb-1">
                  {t('nextPeriod')}
                </div>
                <div className="text-lg font-bold text-red-800 dark:text-red-200">
                  {formatShortDate(cycles[0].nextPeriod)}
                </div>
                <div className="text-xs text-red-500 dark:text-red-400 mt-1">
                  {formatDisplayDate(cycles[0].nextPeriod)}
                </div>
              </div>

              {/* Safe Periods */}
              <div className="bg-green-50 dark:bg-green-950 rounded-xl p-5 text-center">
                <div className="text-3xl mb-2">🛡️</div>
                <div className="text-sm text-green-600 dark:text-green-400 font-medium mb-1">
                  {t('safeEarly')}
                </div>
                <div className="text-sm font-bold text-green-800 dark:text-green-200">
                  {formatShortDate(cycles[0].safeEarlyStart)} {t('to')} {formatShortDate(cycles[0].safeEarlyEnd)}
                </div>
                <div className="text-sm text-green-600 dark:text-green-400 font-medium mt-2 mb-1">
                  {t('safeLate')}
                </div>
                <div className="text-sm font-bold text-green-800 dark:text-green-200">
                  {formatShortDate(cycles[0].safeLateStart)} {t('to')} {formatShortDate(cycles[0].safeLateEnd)}
                </div>
              </div>
            </div>

            {/* Due date link */}
            <div className="mt-4 text-center">
              <a
                href="/due-date"
                className="inline-flex items-center gap-1 text-pink-600 dark:text-pink-400 hover:underline text-sm font-medium"
              >
                {t('dueDateLink')}
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>

          {/* Share buttons */}
          <div className="flex gap-3 justify-center">
            <button
              onClick={handleShare}
              className="px-4 py-2 bg-pink-100 dark:bg-pink-900 hover:bg-pink-200 dark:hover:bg-pink-800 text-pink-700 dark:text-pink-300 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors"
            >
              <Heart className="w-4 h-4" />
              {t('shareButton')}
            </button>
            <button
              onClick={copyLink}
              className="px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors"
            >
              {copiedLink ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {copiedLink ? t('linkCopied') : t('copyLinkButton')}
            </button>
          </div>

          {/* 3-Month Calendar */}
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-pink-500" />
              {t('calendar')}
            </h2>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {calendarMonths.map(({ year, month }) => renderCalendar(year, month))}
            </div>

            {/* Legend */}
            <div className="mt-4 bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                {t('legend')}
              </h3>
              <div className="flex flex-wrap gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <span className="w-4 h-4 rounded bg-red-200 dark:bg-red-800 inline-block" />
                  <span className="text-gray-600 dark:text-gray-400">{t('legendPeriod')}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-4 h-4 rounded bg-orange-200 dark:bg-orange-800 inline-block" />
                  <span className="text-gray-600 dark:text-gray-400">{t('legendFertile')}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-4 h-4 rounded bg-purple-500 inline-block" />
                  <span className="text-gray-600 dark:text-gray-400">{t('legendOvulation')}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-4 h-4 rounded bg-green-100 dark:bg-green-900 inline-block" />
                  <span className="text-gray-600 dark:text-gray-400">{t('legendSafe')}</span>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Guide Section */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden">
        <button
          onClick={() => setGuideOpen(!guideOpen)}
          className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
        >
          <span className="flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-white">
            <BookOpen className="w-5 h-5 text-pink-500" />
            {t('guide.title')}
          </span>
          {guideOpen ? (
            <ChevronUp className="w-5 h-5 text-gray-500" />
          ) : (
            <ChevronDown className="w-5 h-5 text-gray-500" />
          )}
        </button>
        {guideOpen && (
          <div className="px-6 pb-6 space-y-6">
            <div>
              <h3 className="text-base font-semibold text-gray-800 dark:text-gray-200 mb-2">
                {t('guide.howItWorks.title')}
              </h3>
              <ul className="space-y-1.5">
                {(t.raw('guide.howItWorks.items') as string[]).map((item, i) => (
                  <li key={i} className="text-sm text-gray-600 dark:text-gray-400 flex items-start gap-2">
                    <span className="text-pink-500 mt-0.5">•</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="text-base font-semibold text-gray-800 dark:text-gray-200 mb-2">
                {t('guide.tips.title')}
              </h3>
              <ul className="space-y-1.5">
                {(t.raw('guide.tips.items') as string[]).map((item, i) => (
                  <li key={i} className="text-sm text-gray-600 dark:text-gray-400 flex items-start gap-2">
                    <span className="text-purple-500 mt-0.5">•</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>

      {/* Disclaimer */}
      <p className="text-xs text-gray-400 dark:text-gray-500 text-center">
        {t('disclaimer')}
      </p>
    </div>
  )
}
