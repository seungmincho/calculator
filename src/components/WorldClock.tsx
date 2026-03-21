'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { useSearchParams, useRouter, usePathname } from 'next/navigation'
import { Globe, Plus, X, Clock, BookOpen, Sun, Moon, Link, Check, Users } from 'lucide-react'

interface City {
  id: string
  timezone: string
  flag: string
}

const ALL_CITIES: City[] = [
  { id: 'seoul', timezone: 'Asia/Seoul', flag: '🇰🇷' },
  { id: 'tokyo', timezone: 'Asia/Tokyo', flag: '🇯🇵' },
  { id: 'beijing', timezone: 'Asia/Shanghai', flag: '🇨🇳' },
  { id: 'newYork', timezone: 'America/New_York', flag: '🇺🇸' },
  { id: 'losAngeles', timezone: 'America/Los_Angeles', flag: '🇺🇸' },
  { id: 'london', timezone: 'Europe/London', flag: '🇬🇧' },
  { id: 'paris', timezone: 'Europe/Paris', flag: '🇫🇷' },
  { id: 'berlin', timezone: 'Europe/Berlin', flag: '🇩🇪' },
  { id: 'moscow', timezone: 'Europe/Moscow', flag: '🇷🇺' },
  { id: 'dubai', timezone: 'Asia/Dubai', flag: '🇦🇪' },
  { id: 'singapore', timezone: 'Asia/Singapore', flag: '🇸🇬' },
  { id: 'sydney', timezone: 'Australia/Sydney', flag: '🇦🇺' },
  { id: 'toronto', timezone: 'America/Toronto', flag: '🇨🇦' },
  { id: 'chicago', timezone: 'America/Chicago', flag: '🇺🇸' },
  { id: 'honolulu', timezone: 'Pacific/Honolulu', flag: '🇺🇸' },
  { id: 'bangkok', timezone: 'Asia/Bangkok', flag: '🇹🇭' },
  { id: 'mumbai', timezone: 'Asia/Kolkata', flag: '🇮🇳' },
  { id: 'istanbul', timezone: 'Europe/Istanbul', flag: '🇹🇷' },
  { id: 'cairo', timezone: 'Africa/Cairo', flag: '🇪🇬' },
  { id: 'saoPaulo', timezone: 'America/Sao_Paulo', flag: '🇧🇷' },
]

const DEFAULT_CITY_IDS = ['seoul', 'tokyo', 'newYork', 'london', 'paris', 'sydney']

// DST detection: compare Jan and Jul UTC offsets
function getTimezoneOffsetMinutes(timezone: string, date: Date): number {
  const jan = new Date(date.getFullYear(), 0, 1)
  const jul = new Date(date.getFullYear(), 6, 1)

  const getOffset = (d: Date) => {
    const utc = Date.UTC(d.getFullYear(), d.getMonth(), d.getDate(), 12, 0, 0)
    const local = new Date(
      new Intl.DateTimeFormat('en-US', {
        timeZone: timezone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      }).format(new Date(utc))
    )
    return (new Date(utc).getTime() - local.getTime()) / 60000
  }

  const janOffset = getOffset(jan)
  const julOffset = getOffset(jul)
  const currentOffset = getOffset(date)

  // DST is active when offset differs from max (more negative = summer in northern hemisphere)
  const maxOffset = Math.max(janOffset, julOffset)
  return currentOffset < maxOffset ? currentOffset : maxOffset
}

function isInDST(timezone: string, date: Date): boolean {
  const jan = new Date(date.getFullYear(), 0, 15)
  const jul = new Date(date.getFullYear(), 6, 15)

  const fmt = (d: Date) =>
    new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      timeZoneName: 'short',
    }).format(d)

  const janStr = fmt(jan)
  const julStr = fmt(jul)
  const nowStr = fmt(date)

  // If Jan and Jul produce different tz abbreviations, DST exists
  if (janStr === julStr) return false

  // In northern hemisphere DST: summer (Jul) has lighter offset
  // In southern hemisphere DST: winter (Jan) has lighter offset
  // "now" matching the non-standard offset means DST active
  const stdStr = janStr < julStr ? janStr : julStr // lexicographic fallback; real check below
  void stdStr

  // Simpler: get numeric offset for jan, jul, now
  const getOffsetMin = (d: Date) => {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      timeZoneName: 'shortOffset',
    }).formatToParts(d)
    const off = parts.find(p => p.type === 'timeZoneName')?.value ?? 'GMT'
    const m = off.replace('GMT', '')
    if (!m) return 0
    const sign = m[0] === '+' ? 1 : -1
    const [h, mn] = m.slice(1).split(':').map(Number)
    return sign * (h * 60 + (mn || 0))
  }

  const janOff = getOffsetMin(jan)
  const julOff = getOffsetMin(jul)
  const nowOff = getOffsetMin(date)

  const stdOff = Math.min(janOff, julOff) // standard time = smaller UTC+ offset
  return nowOff !== stdOff
}

function getLocalHourFloat(timezone: string, date: Date): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
    hour12: false,
  }).formatToParts(date)
  const h = parseInt(parts.find(p => p.type === 'hour')?.value ?? '0', 10)
  const m = parseInt(parts.find(p => p.type === 'minute')?.value ?? '0', 10)
  const s = parseInt(parts.find(p => p.type === 'second')?.value ?? '0', 10)
  return h + m / 60 + s / 3600
}

export default function WorldClock() {
  const t = useTranslations('worldClock')
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()

  // Initialize selectedCities from URL param
  const [selectedCities, setSelectedCities] = useState<string[]>(() => {
    const param = searchParams.get('cities')
    if (param) {
      const ids = param.split(',').filter(id => ALL_CITIES.some(c => c.id === id))
      if (ids.length > 0) return ids
    }
    return DEFAULT_CITY_IDS
  })

  const [is24h, setIs24h] = useState(true)
  const [currentTime, setCurrentTime] = useState(new Date())
  const [selectedCityToAdd, setSelectedCityToAdd] = useState<string>('')
  const [copiedLink, setCopiedLink] = useState(false)

  // Meeting planner state
  const [meetingStart, setMeetingStart] = useState(9)
  const [meetingEnd, setMeetingEnd] = useState(18)
  const [showMeetingPlanner, setShowMeetingPlanner] = useState(false)

  // Update time every second
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  // Sync selectedCities to URL
  useEffect(() => {
    const params = new URLSearchParams()
    params.set('cities', selectedCities.join(','))
    router.replace(`${pathname}?${params.toString()}`, { scroll: false })
  }, [selectedCities, pathname, router])

  // Available cities to add
  const availableCities = useMemo(() => {
    return ALL_CITIES.filter(city => !selectedCities.includes(city.id))
  }, [selectedCities])

  // Get city data by id
  const getCityById = useCallback((id: string): City | undefined => {
    return ALL_CITIES.find(city => city.id === id)
  }, [])

  // Format time for a timezone
  const formatTime = useCallback((timezone: string) => {
    const formatter = new Intl.DateTimeFormat('ko-KR', {
      timeZone: timezone,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: !is24h,
    })
    return formatter.format(currentTime)
  }, [currentTime, is24h])

  // Format date for a timezone
  const formatDate = useCallback((timezone: string) => {
    const formatter = new Intl.DateTimeFormat('ko-KR', {
      timeZone: timezone,
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'long',
    })
    return formatter.format(currentTime)
  }, [currentTime])

  // Calculate time difference in hours
  const getTimeDifference = useCallback((timezone: string) => {
    const localOffset = currentTime.getTimezoneOffset()
    const targetFormatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      timeZoneName: 'shortOffset',
    })
    const targetParts = targetFormatter.formatToParts(currentTime)
    const offsetPart = targetParts.find(part => part.type === 'timeZoneName')

    if (!offsetPart || offsetPart.value === 'GMT') {
      const targetTime = new Date(currentTime.toLocaleString('en-US', { timeZone: timezone }))
      const localTime = new Date(currentTime.toLocaleString('en-US'))
      const diffMs = targetTime.getTime() - localTime.getTime()
      return Math.round(diffMs / (1000 * 60 * 60))
    }

    const offsetStr = offsetPart.value.replace('GMT', '')
    if (!offsetStr) return 0

    const sign = offsetStr[0] === '+' ? 1 : -1
    const [hours, minutes] = offsetStr.slice(1).split(':').map(Number)
    const targetOffsetMinutes = sign * (hours * 60 + (minutes || 0))

    const diffMinutes = targetOffsetMinutes + localOffset
    return Math.round(diffMinutes / 60)
  }, [currentTime])

  // Add city
  const handleAddCity = useCallback(() => {
    if (selectedCityToAdd && !selectedCities.includes(selectedCityToAdd)) {
      setSelectedCities([...selectedCities, selectedCityToAdd])
      setSelectedCityToAdd('')
    }
  }, [selectedCityToAdd, selectedCities])

  // Remove city
  const handleRemoveCity = useCallback((cityId: string) => {
    setSelectedCities(selectedCities.filter(id => id !== cityId))
  }, [selectedCities])

  // Copy shareable link
  const handleCopyLink = useCallback(async () => {
    const url = `${window.location.origin}${pathname}?cities=${selectedCities.join(',')}`
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
      // ignore
    }
    setCopiedLink(true)
    setTimeout(() => setCopiedLink(false), 2000)
  }, [selectedCities, pathname])

  // Meeting planner: find overlap window where all selected cities are within working hours
  const meetingData = useMemo(() => {
    if (selectedCities.length === 0) return null

    const cities = selectedCities.map(id => getCityById(id)).filter(Boolean) as City[]

    // For each hour of the day (0..23) check if ALL cities fall within [meetingStart, meetingEnd)
    const overlapHours: boolean[] = Array.from({ length: 24 }, (_, h) => {
      // h is UTC hour — convert to local hour for each city
      const refDate = new Date(currentTime)
      refDate.setUTCHours(h, 0, 0, 0)
      return cities.every(city => {
        const localH = getLocalHourFloat(city.timezone, refDate)
        // handle midnight wrap
        const norm = ((localH % 24) + 24) % 24
        return norm >= meetingStart && norm < meetingEnd
      })
    })

    // For each city: compute its local hour for each of the 24 UTC hours
    const cityHours = cities.map(city => {
      return Array.from({ length: 24 }, (_, h) => {
        const refDate = new Date(currentTime)
        refDate.setUTCHours(h, 0, 0, 0)
        return getLocalHourFloat(city.timezone, refDate)
      })
    })

    return { cities, overlapHours, cityHours }
  }, [selectedCities, getCityById, meetingStart, meetingEnd, currentTime])

  // For the bar: each segment is 1 hour (UTC), total 24
  // We display local working range [meetingStart, meetingEnd)
  const BAR_HOURS = 24

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Globe className="w-8 h-8" />
            {t('title')}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('description')}</p>
        </div>
        {/* Copy Link Button */}
        <button
          onClick={handleCopyLink}
          className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg font-medium transition-colors text-sm"
          title={t('copyLink')}
        >
          {copiedLink ? (
            <>
              <Check className="w-4 h-4 text-green-500" />
              <span className="text-green-600 dark:text-green-400">{t('copied')}</span>
            </>
          ) : (
            <>
              <Link className="w-4 h-4" />
              <span>{t('copyLink')}</span>
            </>
          )}
        </button>
      </div>

      {/* My Local Time */}
      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950 rounded-xl shadow-lg p-8">
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center gap-3">
            <Clock className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              {t('myTime')}
            </h2>
          </div>
          <div className="text-5xl font-bold font-mono text-gray-900 dark:text-white">
            {formatTime(Intl.DateTimeFormat().resolvedOptions().timeZone)}
          </div>
          <div className="text-lg text-gray-600 dark:text-gray-300">
            {formatDate(Intl.DateTimeFormat().resolvedOptions().timeZone)}
          </div>
          <div className="flex items-center justify-center gap-4 mt-4">
            <button
              onClick={() => setIs24h(false)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                !is24h
                  ? 'bg-blue-600 text-white'
                  : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600'
              }`}
            >
              {t('format12h')}
            </button>
            <button
              onClick={() => setIs24h(true)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                is24h
                  ? 'bg-blue-600 text-white'
                  : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600'
              }`}
            >
              {t('format24h')}
            </button>
          </div>
        </div>
      </div>

      {/* Add City */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <Plus className="w-5 h-5" />
          {t('addCity')}
        </h2>
        <div className="flex gap-3">
          <select
            value={selectedCityToAdd}
            onChange={(e) => setSelectedCityToAdd(e.target.value)}
            className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
          >
            <option value="">{t('selectCity')}</option>
            {availableCities.map(city => (
              <option key={city.id} value={city.id}>
                {city.flag} {t(`cities.${city.id}`)}
              </option>
            ))}
          </select>
          <button
            onClick={handleAddCity}
            disabled={!selectedCityToAdd}
            className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg px-6 py-2 font-medium hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {t('add')}
          </button>
        </div>
      </div>

      {/* City Cards Grid */}
      <div className="grid lg:grid-cols-3 md:grid-cols-2 gap-6">
        {selectedCities.map(cityId => {
          const city = getCityById(cityId)
          if (!city) return null

          const timeDiff = getTimeDifference(city.timezone)
          const diffText = timeDiff === 0
            ? t('same')
            : timeDiff > 0
            ? `${Math.abs(timeDiff)}${t('hours')} ${t('ahead')}`
            : `${Math.abs(timeDiff)}${t('hours')} ${t('behind')}`

          const diffColor = timeDiff === 0
            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
            : timeDiff > 0
            ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
            : 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200'

          const dst = isInDST(city.timezone, currentTime)
          const localH = getLocalHourFloat(city.timezone, currentTime)
          const isNight = localH < 6 || localH >= 20

          return (
            <div
              key={city.id}
              className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 relative"
            >
              {/* Remove Button */}
              <button
                onClick={() => handleRemoveCity(city.id)}
                className="absolute top-4 right-4 p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                aria-label={t('removeCity')}
              >
                <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
              </button>

              {/* Flag and City Name */}
              <div className="flex items-center gap-3 mb-4">
                <span className="text-4xl">{city.flag}</span>
                <div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                    {t(`cities.${city.id}`)}
                  </h3>
                  {/* DST Indicator */}
                  <div className="flex items-center gap-1.5 mt-0.5">
                    {isNight ? (
                      <Moon className="w-3.5 h-3.5 text-indigo-400" />
                    ) : (
                      <Sun className="w-3.5 h-3.5 text-yellow-500" />
                    )}
                    {dst && (
                      <span className="text-xs text-amber-600 dark:text-amber-400 font-medium">
                        {t('dst')}
                      </span>
                    )}
                    {!dst && (
                      <span className="text-xs text-gray-400 dark:text-gray-500">
                        {t('standardTime')}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Time */}
              <div className="text-3xl font-bold font-mono text-gray-900 dark:text-white mb-2">
                {formatTime(city.timezone)}
              </div>

              {/* Date */}
              <div className="text-sm text-gray-500 dark:text-gray-400 mb-3">
                {formatDate(city.timezone)}
              </div>

              {/* Time Difference Badge */}
              <div className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${diffColor}`}>
                {diffText}
              </div>
            </div>
          )
        })}
      </div>

      {/* Meeting Planner */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden">
        <button
          onClick={() => setShowMeetingPlanner(v => !v)}
          className="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
        >
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <Users className="w-5 h-5" />
            {t('meetingPlanner.title')}
          </h2>
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {showMeetingPlanner ? '▲' : '▼'}
          </span>
        </button>

        {showMeetingPlanner && (
          <div className="px-6 pb-6 space-y-5 border-t border-gray-100 dark:border-gray-700 pt-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {t('meetingPlanner.description')}
            </p>

            {/* Working hours range */}
            <div className="flex flex-wrap gap-6 items-center">
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap">
                  {t('meetingPlanner.workStart')}
                </label>
                <select
                  value={meetingStart}
                  onChange={e => setMeetingStart(Number(e.target.value))}
                  className="px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500"
                >
                  {Array.from({ length: 24 }, (_, i) => (
                    <option key={i} value={i}>{String(i).padStart(2, '0')}:00</option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap">
                  {t('meetingPlanner.workEnd')}
                </label>
                <select
                  value={meetingEnd}
                  onChange={e => setMeetingEnd(Number(e.target.value))}
                  className="px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500"
                >
                  {Array.from({ length: 24 }, (_, i) => (
                    <option key={i} value={i + 1}>{String(i + 1).padStart(2, '0')}:00</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Gantt-style bar visualization */}
            {meetingData && meetingData.cities.length > 0 ? (
              <div className="space-y-3">
                {/* Hour labels */}
                <div className="flex text-xs text-gray-400 dark:text-gray-500 pl-24 pr-2">
                  {Array.from({ length: BAR_HOURS + 1 }, (_, i) => (
                    <div
                      key={i}
                      className="flex-shrink-0 text-right pr-0.5"
                      style={{ width: `${100 / BAR_HOURS}%` }}
                    >
                      {i % 6 === 0 ? `${String(i).padStart(2, '0')}` : ''}
                    </div>
                  ))}
                </div>

                {/* City rows */}
                {meetingData.cities.map((city, ci) => (
                  <div key={city.id} className="flex items-center gap-2">
                    {/* City label */}
                    <div className="w-24 flex-shrink-0 flex items-center gap-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 truncate">
                      <span className="text-base leading-none">{city.flag}</span>
                      <span className="truncate">{t(`cities.${city.id}`)}</span>
                    </div>

                    {/* Bar */}
                    <div className="flex-1 flex h-7 rounded overflow-hidden border border-gray-200 dark:border-gray-700">
                      {Array.from({ length: BAR_HOURS }, (_, utcH) => {
                        const localH = meetingData.cityHours[ci][utcH]
                        const norm = ((localH % 24) + 24) % 24
                        const isWork = norm >= meetingStart && norm < meetingEnd
                        const isOverlap = meetingData.overlapHours[utcH]

                        let bg = 'bg-gray-100 dark:bg-gray-700' // off hours
                        if (isWork && isOverlap) bg = 'bg-green-400 dark:bg-green-500'
                        else if (isWork) bg = 'bg-blue-200 dark:bg-blue-800'

                        return (
                          <div
                            key={utcH}
                            className={`${bg} flex-1 transition-colors`}
                            title={`UTC ${String(utcH).padStart(2, '0')}:00 → ${t(`cities.${city.id}`)} ${String(Math.floor(((norm % 24) + 24) % 24)).padStart(2, '0')}:00`}
                          />
                        )
                      })}
                    </div>
                  </div>
                ))}

                {/* Legend */}
                <div className="flex flex-wrap gap-4 pt-2 text-xs text-gray-600 dark:text-gray-400">
                  <div className="flex items-center gap-1.5">
                    <div className="w-4 h-4 rounded bg-green-400 dark:bg-green-500" />
                    <span>{t('meetingPlanner.overlap')}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-4 h-4 rounded bg-blue-200 dark:bg-blue-800" />
                    <span>{t('meetingPlanner.workingHours')}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-4 h-4 rounded bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600" />
                    <span>{t('meetingPlanner.offHours')}</span>
                  </div>
                </div>

                {/* Overlap summary */}
                {(() => {
                  const overlapCount = meetingData.overlapHours.filter(Boolean).length
                  return (
                    <div className={`rounded-lg px-4 py-3 text-sm font-medium ${
                      overlapCount > 0
                        ? 'bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-300'
                        : 'bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-300'
                    }`}>
                      {overlapCount > 0
                        ? t('meetingPlanner.overlapFound', { hours: overlapCount })
                        : t('meetingPlanner.noOverlap')}
                    </div>
                  )
                })()}
              </div>
            ) : (
              <p className="text-sm text-gray-400 dark:text-gray-500 italic">
                {t('meetingPlanner.noCities')}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Guide Section */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
          <BookOpen className="w-6 h-6" />
          {t('guide.title')}
        </h2>
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
              {t('guide.usage.title')}
            </h3>
            <ul className="space-y-2 text-gray-600 dark:text-gray-300">
              {(t.raw('guide.usage.items') as string[]).map((item, index) => (
                <li key={index} className="flex items-start gap-2">
                  <span className="text-blue-600 dark:text-blue-400 mt-1">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
              {t('guide.tips.title')}
            </h3>
            <ul className="space-y-2 text-gray-600 dark:text-gray-300">
              {(t.raw('guide.tips.items') as string[]).map((item, index) => (
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
