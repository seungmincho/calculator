'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { Globe, Plus, X, Clock, BookOpen } from 'lucide-react'

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

export default function WorldClock() {
  const t = useTranslations('worldClock')
  const [selectedCities, setSelectedCities] = useState<string[]>(DEFAULT_CITY_IDS)
  const [is24h, setIs24h] = useState(true)
  const [currentTime, setCurrentTime] = useState(new Date())
  const [selectedCityToAdd, setSelectedCityToAdd] = useState<string>('')

  // Update time every second
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)

    return () => clearInterval(interval)
  }, [])

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
      // Try another method for GMT
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

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <Globe className="w-8 h-8" />
          {t('title')}
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('description')}</p>
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
            <option value="">도시를 선택하세요</option>
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
            추가
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
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                  {t(`cities.${city.id}`)}
                </h3>
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
