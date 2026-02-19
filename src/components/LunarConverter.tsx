'use client'

import { useState, useCallback, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { Moon, Sun, Calendar, ArrowRightLeft, Copy, Check, BookOpen, RotateCcw } from 'lucide-react'

// Lunar calendar data for years 1900-2100
// Each entry encodes: leap month info + month lengths for that lunar year
const LUNAR_DATA = [
  0x04bd8, 0x04ae0, 0x0a570, 0x054d5, 0x0d260, 0x0d950, 0x16554, 0x056a0, 0x09ad0, 0x055d2, // 1900-1909
  0x04ae0, 0x0a5b6, 0x0a4d0, 0x0d250, 0x1d255, 0x0b540, 0x0d6a0, 0x0ada2, 0x095b0, 0x14977, // 1910-1919
  0x04970, 0x0a4b0, 0x0b4b5, 0x06a50, 0x06d40, 0x1ab54, 0x02b60, 0x09570, 0x052f2, 0x04970, // 1920-1929
  0x06566, 0x0d4a0, 0x0ea50, 0x06e95, 0x05ad0, 0x02b60, 0x186e3, 0x092e0, 0x1c8d7, 0x0c950, // 1930-1939
  0x0d4a0, 0x1d8a6, 0x0b550, 0x056a0, 0x1a5b4, 0x025d0, 0x092d0, 0x0d2b2, 0x0a950, 0x0b557, // 1940-1949
  0x06ca0, 0x0b550, 0x15355, 0x04da0, 0x0a5b0, 0x14573, 0x052b0, 0x0a9a8, 0x0e950, 0x06aa0, // 1950-1959
  0x0aea6, 0x0ab50, 0x04b60, 0x0aae4, 0x0a570, 0x05260, 0x0f263, 0x0d950, 0x05b57, 0x056a0, // 1960-1969
  0x096d0, 0x04dd5, 0x04ad0, 0x0a4d0, 0x0d4d4, 0x0d250, 0x0d558, 0x0b540, 0x0b6a0, 0x195a6, // 1970-1979
  0x095b0, 0x049b0, 0x0a974, 0x0a4b0, 0x0b27a, 0x06a50, 0x06d40, 0x0af46, 0x0ab60, 0x09570, // 1980-1989
  0x04af5, 0x04970, 0x064b0, 0x074a3, 0x0ea50, 0x06b58, 0x05ac0, 0x0ab60, 0x096d5, 0x092e0, // 1990-1999
  0x0c960, 0x0d954, 0x0d4a0, 0x0da50, 0x07552, 0x056a0, 0x0abb7, 0x025d0, 0x092d0, 0x0cab5, // 2000-2009
  0x0a950, 0x0b4a0, 0x0baa4, 0x0ad50, 0x055d9, 0x04ba0, 0x0a5b0, 0x15176, 0x052b0, 0x0a930, // 2010-2019
  0x07954, 0x06aa0, 0x0ad50, 0x05b52, 0x04b60, 0x0a6e6, 0x0a4e0, 0x0d260, 0x0ea65, 0x0d530, // 2020-2029
  0x05aa0, 0x076a3, 0x096d0, 0x04afb, 0x04ad0, 0x0a4d0, 0x1d0b6, 0x0d250, 0x0d520, 0x0dd45, // 2030-2039
  0x0b5a0, 0x056d0, 0x055b2, 0x049b0, 0x0a577, 0x0a4b0, 0x0aa50, 0x1b255, 0x06d20, 0x0ada0, // 2040-2049
  0x14b63, 0x09370, 0x049f8, 0x04970, 0x064b0, 0x168a6, 0x0ea50, 0x06b20, 0x1a6c4, 0x0aae0, // 2050-2059
  0x092e0, 0x0d2e3, 0x0c960, 0x0d557, 0x0d4a0, 0x0da50, 0x05d55, 0x056a0, 0x0a6d0, 0x055d4, // 2060-2069
  0x052d0, 0x0a9b8, 0x0a950, 0x0b4a0, 0x0b6a6, 0x0ad50, 0x055a0, 0x0aba4, 0x0a5b0, 0x052b0, // 2070-2079
  0x0b273, 0x06930, 0x07337, 0x06aa0, 0x0ad50, 0x14b55, 0x04b60, 0x0a570, 0x054e4, 0x0d160, // 2080-2089
  0x0e968, 0x0d520, 0x0daa0, 0x16aa6, 0x056d0, 0x04ae0, 0x0a9d4, 0x0a4d0, 0x0d150, 0x0f252, // 2090-2099
  0x0d520, // 2100
]

const BASE_YEAR = 1900
const BASE_DATE = new Date(Date.UTC(1900, 0, 31)) // 1900-01-31 is lunar 1900-01-01

// Heavenly Stems (천간)
const STEMS = ['갑', '을', '병', '정', '무', '기', '경', '신', '임', '계']
// Earthly Branches (지지)
const BRANCHES = ['자', '축', '인', '묘', '진', '사', '오', '미', '신', '유', '술', '해']
// Zodiac animals
const ZODIAC = ['쥐', '소', '호랑이', '토끼', '용', '뱀', '말', '양', '원숭이', '닭', '개', '돼지']

// Get leap month for a given year (0 if no leap month)
function leapMonth(year: number): number {
  return LUNAR_DATA[year - BASE_YEAR] & 0x0F
}

// Get days in leap month (0 if no leap month)
function leapMonthDays(year: number): number {
  if (leapMonth(year) === 0) return 0
  return (LUNAR_DATA[year - BASE_YEAR] & 0x10000) ? 30 : 29
}

// Get days in a specific lunar month
function lunarMonthDays(year: number, month: number): number {
  return (LUNAR_DATA[year - BASE_YEAR] & (0x10000 >> month)) ? 30 : 29
}

// Get total days in a lunar year
function lunarYearDays(year: number): number {
  let days = 0
  for (let i = 1; i <= 12; i++) {
    days += lunarMonthDays(year, i)
  }
  days += leapMonthDays(year)
  return days
}

// Convert solar date to lunar date
function solarToLunar(solarYear: number, solarMonth: number, solarDay: number): {
  year: number
  month: number
  day: number
  isLeap: boolean
} {
  const solarDate = new Date(Date.UTC(solarYear, solarMonth - 1, solarDay))
  const offset = Math.round((solarDate.getTime() - BASE_DATE.getTime()) / (24 * 60 * 60 * 1000))

  let lunarYear = BASE_YEAR
  let daysCount = offset

  // Find lunar year
  while (lunarYear < 2101 && daysCount > 0) {
    const yearDays = lunarYearDays(lunarYear)
    if (daysCount < yearDays) break
    daysCount -= yearDays
    lunarYear++
  }

  // Find lunar month
  let lunarMonth = 1
  let isLeapMonth = false
  const leap = leapMonth(lunarYear)

  while (lunarMonth <= 12 && daysCount > 0) {
    let monthDays = lunarMonthDays(lunarYear, lunarMonth)

    if (daysCount < monthDays) break
    daysCount -= monthDays

    // Check leap month
    if (leap === lunarMonth && !isLeapMonth) {
      const leapDays = leapMonthDays(lunarYear)
      if (daysCount < leapDays) {
        isLeapMonth = true
        break
      }
      daysCount -= leapDays
    }

    if (!isLeapMonth || leap !== lunarMonth) {
      lunarMonth++
    }
  }

  return {
    year: lunarYear,
    month: lunarMonth,
    day: daysCount + 1,
    isLeap: isLeapMonth,
  }
}

// Convert lunar date to solar date
function lunarToSolar(lunarYear: number, lunarMonth: number, lunarDay: number, isLeap: boolean): {
  year: number
  month: number
  day: number
} {
  let offset = 0

  // Add days from base year to target year
  for (let y = BASE_YEAR; y < lunarYear; y++) {
    offset += lunarYearDays(y)
  }

  // Add days from months
  const leap = leapMonth(lunarYear)
  for (let m = 1; m < lunarMonth; m++) {
    offset += lunarMonthDays(lunarYear, m)
    if (leap === m) {
      offset += leapMonthDays(lunarYear)
    }
  }

  // Add leap month days if current month is after leap or is leap itself
  if (isLeap) {
    offset += lunarMonthDays(lunarYear, lunarMonth)
  }

  // Add current month days
  offset += lunarDay - 1

  const solarDate = new Date(BASE_DATE.getTime() + offset * 24 * 60 * 60 * 1000)

  return {
    year: solarDate.getUTCFullYear(),
    month: solarDate.getUTCMonth() + 1,
    day: solarDate.getUTCDate(),
  }
}

// Get zodiac and stems/branches for a lunar year
function getYearInfo(lunarYear: number) {
  const yearOffset = (lunarYear - 4) % 60
  const stemIndex = yearOffset % 10
  const branchIndex = yearOffset % 12

  return {
    zodiac: ZODIAC[branchIndex],
    stem: STEMS[stemIndex],
    branch: BRANCHES[branchIndex],
    ganzi: STEMS[stemIndex] + BRANCHES[branchIndex],
  }
}

// Get day of week
function getDayOfWeek(year: number, month: number, day: number, locale: string): string {
  const date = new Date(year, month - 1, day)
  return new Intl.DateTimeFormat(locale === 'ko' ? 'ko-KR' : 'en-US', { weekday: 'long' }).format(date)
}

type ConversionMode = 'solarToLunar' | 'lunarToSolar'

export default function LunarConverter() {
  const t = useTranslations('lunarConverter')
  const [mode, setMode] = useState<ConversionMode>('solarToLunar')
  const [copiedId, setCopiedId] = useState<string | null>(null)

  // Solar input
  const [solarYear, setSolarYear] = useState(new Date().getFullYear())
  const [solarMonth, setSolarMonth] = useState(new Date().getMonth() + 1)
  const [solarDay, setSolarDay] = useState(new Date().getDate())

  // Lunar input
  const [lunarYear, setLunarYear] = useState(new Date().getFullYear())
  const [lunarMonth, setLunarMonth] = useState(1)
  const [lunarDay, setLunarDay] = useState(1)
  const [isLeap, setIsLeap] = useState(false)

  // Result
  const [result, setResult] = useState<{
    year: number
    month: number
    day: number
    isLeap?: boolean
    dayOfWeek: string
    zodiac: string
    stem: string
    branch: string
    ganzi: string
  } | null>(null)

  // Update result when inputs change
  useEffect(() => {
    try {
      if (mode === 'solarToLunar') {
        const lunar = solarToLunar(solarYear, solarMonth, solarDay)
        const yearInfo = getYearInfo(lunar.year)
        const dayOfWeek = getDayOfWeek(solarYear, solarMonth, solarDay, 'ko')

        setResult({
          year: lunar.year,
          month: lunar.month,
          day: lunar.day,
          isLeap: lunar.isLeap,
          dayOfWeek,
          ...yearInfo,
        })
      } else {
        const solar = lunarToSolar(lunarYear, lunarMonth, lunarDay, isLeap)
        const yearInfo = getYearInfo(lunarYear)
        const dayOfWeek = getDayOfWeek(solar.year, solar.month, solar.day, 'ko')

        setResult({
          year: solar.year,
          month: solar.month,
          day: solar.day,
          dayOfWeek,
          ...yearInfo,
        })
      }
    } catch (error) {
      setResult(null)
    }
  }, [mode, solarYear, solarMonth, solarDay, lunarYear, lunarMonth, lunarDay, isLeap])

  const copyToClipboard = useCallback(async (text: string, id: string) => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text)
      } else {
        const textarea = document.createElement('textarea')
        textarea.value = text
        textarea.style.position = 'fixed'
        textarea.style.left = '-999999px'
        document.body.appendChild(textarea)
        textarea.select()
        document.execCommand('copy')
        document.body.removeChild(textarea)
      }
      setCopiedId(id)
      setTimeout(() => setCopiedId(null), 2000)
    } catch {
      setCopiedId(id)
      setTimeout(() => setCopiedId(null), 2000)
    }
  }, [])

  const handleReset = useCallback(() => {
    const today = new Date()
    setSolarYear(today.getFullYear())
    setSolarMonth(today.getMonth() + 1)
    setSolarDay(today.getDate())
    setLunarYear(today.getFullYear())
    setLunarMonth(1)
    setLunarDay(1)
    setIsLeap(false)
    setMode('solarToLunar')
  }, [])

  const toggleMode = useCallback(() => {
    setMode(prev => prev === 'solarToLunar' ? 'lunarToSolar' : 'solarToLunar')
  }, [])

  const getResultText = useCallback(() => {
    if (!result) return ''

    if (mode === 'solarToLunar') {
      return `음력 ${result.year}년 ${result.isLeap ? '윤' : ''}${result.month}월 ${result.day}일 (${result.dayOfWeek}) - ${result.ganzi}년 ${result.zodiac}띠`
    } else {
      return `양력 ${result.year}년 ${result.month}월 ${result.day}일 (${result.dayOfWeek})`
    }
  }, [result, mode])

  const getDaysInMonth = useCallback((year: number, month: number, isLunarMode: boolean) => {
    if (isLunarMode) {
      return lunarMonthDays(year, month)
    } else {
      return new Date(year, month, 0).getDate()
    }
  }, [])

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
            {/* Mode Toggle */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                변환 모드
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setMode('solarToLunar')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    mode === 'solarToLunar'
                      ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  <div className="flex items-center justify-center gap-2">
                    <Sun className="w-4 h-4" />
                    <ArrowRightLeft className="w-3 h-3" />
                    <Moon className="w-4 h-4" />
                  </div>
                  <div className="mt-1">{t('mode.solarToLunar')}</div>
                </button>
                <button
                  onClick={() => setMode('lunarToSolar')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    mode === 'lunarToSolar'
                      ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  <div className="flex items-center justify-center gap-2">
                    <Moon className="w-4 h-4" />
                    <ArrowRightLeft className="w-3 h-3" />
                    <Sun className="w-4 h-4" />
                  </div>
                  <div className="mt-1">{t('mode.lunarToSolar')}</div>
                </button>
              </div>
            </div>

            {/* Date Input */}
            {mode === 'solarToLunar' ? (
              <div className="space-y-4">
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                  <Sun className="w-4 h-4" />
                  {t('solar')}
                </h3>

                <div>
                  <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
                    {t('year')}
                  </label>
                  <select
                    value={solarYear}
                    onChange={(e) => setSolarYear(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                  >
                    {Array.from({ length: 201 }, (_, i) => 1900 + i).map(year => (
                      <option key={year} value={year}>{year}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
                    {t('month')}
                  </label>
                  <select
                    value={solarMonth}
                    onChange={(e) => {
                      const newMonth = Number(e.target.value)
                      setSolarMonth(newMonth)
                      const maxDay = getDaysInMonth(solarYear, newMonth, false)
                      if (solarDay > maxDay) setSolarDay(maxDay)
                    }}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                  >
                    {Array.from({ length: 12 }, (_, i) => i + 1).map(month => (
                      <option key={month} value={month}>{month}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
                    {t('day')}
                  </label>
                  <select
                    value={solarDay}
                    onChange={(e) => setSolarDay(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                  >
                    {Array.from({ length: getDaysInMonth(solarYear, solarMonth, false) }, (_, i) => i + 1).map(day => (
                      <option key={day} value={day}>{day}</option>
                    ))}
                  </select>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                  <Moon className="w-4 h-4" />
                  {t('lunar')}
                </h3>

                <div>
                  <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
                    {t('year')}
                  </label>
                  <select
                    value={lunarYear}
                    onChange={(e) => setLunarYear(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                  >
                    {Array.from({ length: 201 }, (_, i) => 1900 + i).map(year => (
                      <option key={year} value={year}>{year}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
                    {t('month')}
                  </label>
                  <select
                    value={lunarMonth}
                    onChange={(e) => {
                      const newMonth = Number(e.target.value)
                      setLunarMonth(newMonth)
                      const maxDay = getDaysInMonth(lunarYear, newMonth, true)
                      if (lunarDay > maxDay) setLunarDay(maxDay)
                      // Reset leap month if not available
                      if (leapMonth(lunarYear) !== newMonth) {
                        setIsLeap(false)
                      }
                    }}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                  >
                    {Array.from({ length: 12 }, (_, i) => i + 1).map(month => (
                      <option key={month} value={month}>{month}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
                    {t('day')}
                  </label>
                  <select
                    value={lunarDay}
                    onChange={(e) => setLunarDay(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                  >
                    {Array.from({ length: getDaysInMonth(lunarYear, lunarMonth, true) }, (_, i) => i + 1).map(day => (
                      <option key={day} value={day}>{day}</option>
                    ))}
                  </select>
                </div>

                {leapMonth(lunarYear) === lunarMonth && (
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="isLeap"
                      checked={isLeap}
                      onChange={(e) => setIsLeap(e.target.checked)}
                      className="w-4 h-4 accent-blue-600 rounded"
                    />
                    <label htmlFor="isLeap" className="text-sm text-gray-700 dark:text-gray-300">
                      {t('leapMonth')}
                    </label>
                  </div>
                )}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-2">
              <button
                onClick={toggleMode}
                className="flex-1 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg px-4 py-2 font-medium transition-colors flex items-center justify-center gap-2"
              >
                <ArrowRightLeft className="w-4 h-4" />
                모드 전환
              </button>
              <button
                onClick={handleReset}
                className="bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg px-4 py-2 font-medium transition-colors"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Result Panel */}
        <div className="lg:col-span-2">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              {t('result.title')}
            </h2>

            {result ? (
              <div className="space-y-6">
                {/* Main Result */}
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950 rounded-xl p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                        {mode === 'solarToLunar' ? '음력' : '양력'}
                      </div>
                      <div className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
                        {mode === 'solarToLunar' ? (
                          <>
                            음력 {result.year}년 {result.isLeap ? '윤' : ''}{result.month}월 {result.day}일
                          </>
                        ) : (
                          <>
                            양력 {result.year}년 {result.month}월 {result.day}일
                          </>
                        )}
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        {result.dayOfWeek}
                      </div>
                    </div>
                    <button
                      onClick={() => copyToClipboard(getResultText(), 'result')}
                      className="bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg px-3 py-2 transition-colors"
                    >
                      {copiedId === 'result' ? (
                        <Check className="w-4 h-4 text-green-600" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Year Info */}
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-4">
                    <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">
                      띠
                    </div>
                    <div className="text-lg font-semibold text-gray-900 dark:text-white">
                      {result.zodiac}띠
                    </div>
                  </div>

                  <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-4">
                    <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">
                      {t('result.sexagenary')}
                    </div>
                    <div className="text-lg font-semibold text-gray-900 dark:text-white">
                      {result.ganzi}년
                    </div>
                  </div>

                  <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-4">
                    <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">
                      {t('result.heavenlyStem')}
                    </div>
                    <div className="text-lg font-semibold text-gray-900 dark:text-white">
                      {result.stem}
                    </div>
                  </div>

                  <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-4">
                    <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">
                      {t('result.earthlyBranch')}
                    </div>
                    <div className="text-lg font-semibold text-gray-900 dark:text-white">
                      {result.branch}
                    </div>
                  </div>
                </div>

                {/* Original Date */}
                <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-4">
                  <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">
                    {mode === 'solarToLunar' ? '입력한 양력' : '입력한 음력'}
                  </div>
                  <div className="text-base font-medium text-gray-900 dark:text-white">
                    {mode === 'solarToLunar' ? (
                      <>양력 {solarYear}년 {solarMonth}월 {solarDay}일</>
                    ) : (
                      <>음력 {lunarYear}년 {isLeap ? '윤' : ''}{lunarMonth}월 {lunarDay}일</>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center text-gray-500 dark:text-gray-400 py-12">
                날짜를 선택하면 변환 결과가 표시됩니다
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Guide Section */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
          <BookOpen className="w-5 h-5" />
          {t('guide.title')}
        </h2>

        <div className="space-y-6">
          {/* How to Use */}
          <div>
            <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-3">
              {t('guide.howToUse.title')}
            </h3>
            <ul className="space-y-2">
              {(t.raw('guide.howToUse.items') as string[]).map((item, index) => (
                <li key={index} className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <span className="text-blue-600 dark:text-blue-400 mt-0.5">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Tips */}
          <div>
            <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-3">
              {t('guide.tips.title')}
            </h3>
            <ul className="space-y-2">
              {(t.raw('guide.tips.items') as string[]).map((item, index) => (
                <li key={index} className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <span className="text-blue-600 dark:text-blue-400 mt-0.5">•</span>
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
