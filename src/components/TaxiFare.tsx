'use client'

import { useState, useMemo, useCallback, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { useSearchParams, useRouter, usePathname } from 'next/navigation'
import { Car, Moon, Sun, BookOpen, MapPin, Link, Check, BarChart2 } from 'lucide-react'

type Region = 'seoul' | 'gyeonggi' | 'busan' | 'other'
type TaxiType = 'regular' | 'deluxe' | 'jumbo'
type TimeOfDay = 'day' | 'night'

interface TaxiRates {
  baseFare: number
  baseDistance: number // in meters
  unitDistance: number // in meters
  unitFare: number
  timeUnit: number // in seconds
  estimatedDriveSeconds: number // estimated drive time deducted from total time
}

const TAXI_RATES: Record<TaxiType, TaxiRates> = {
  regular: {
    baseFare: 4800,
    baseDistance: 1600,
    unitDistance: 131,
    unitFare: 100,
    timeUnit: 30,
    estimatedDriveSeconds: 0,
  },
  deluxe: {
    baseFare: 7000,
    baseDistance: 3000,
    unitDistance: 151,
    unitFare: 200,
    timeUnit: 36,
    estimatedDriveSeconds: 0,
  },
  jumbo: {
    baseFare: 7000,
    baseDistance: 3000,
    unitDistance: 151,
    unitFare: 200,
    timeUnit: 36,
    estimatedDriveSeconds: 0,
  },
}

const NIGHT_SURCHARGE_RATE = 0.2

function calcFare(distanceKm: number, timeMin: number, type: TaxiType, timeOfDay: TimeOfDay): number {
  const rates = TAXI_RATES[type]
  const totalDistanceMeters = distanceKm * 1000
  const extraDistance = Math.max(0, totalDistanceMeters - rates.baseDistance)
  const distanceFare = Math.floor(extraDistance / rates.unitDistance) * rates.unitFare
  const totalTimeSeconds = timeMin * 60
  const stoppedTimeSeconds = totalTimeSeconds * 0.4
  const extraTime = Math.max(0, stoppedTimeSeconds - rates.estimatedDriveSeconds)
  const timeFare = Math.floor(extraTime / rates.timeUnit) * rates.unitFare
  const baseTotal = rates.baseFare + distanceFare + timeFare
  const nightSurcharge = timeOfDay === 'night' ? Math.floor(baseTotal * NIGHT_SURCHARGE_RATE) : 0
  return baseTotal + nightSurcharge
}

export default function TaxiFare() {
  const t = useTranslations('taxiFare')
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()

  // Initialise state from URL params
  const [distance, setDistance] = useState<string>(() => searchParams.get('distance') ?? '5')
  const [time, setTime] = useState<string>(() => searchParams.get('time') ?? '15')
  const [region, setRegion] = useState<Region>(() => (searchParams.get('region') as Region) ?? 'seoul')
  const [taxiType, setTaxiType] = useState<TaxiType>(() => (searchParams.get('type') as TaxiType) ?? 'regular')
  const [timeOfDay, setTimeOfDay] = useState<TimeOfDay>(() => (searchParams.get('tod') as TimeOfDay) ?? 'day')
  const [copied, setCopied] = useState(false)

  // Sync URL whenever state changes
  useEffect(() => {
    const params = new URLSearchParams()
    params.set('distance', distance)
    params.set('time', time)
    params.set('region', region)
    params.set('type', taxiType)
    params.set('tod', timeOfDay)
    router.replace(`${pathname}?${params.toString()}`, { scroll: false })
  }, [distance, time, region, taxiType, timeOfDay, pathname, router])

  const distanceNum = parseFloat(distance) || 0
  const timeNum = parseFloat(time) || 0

  const fareBreakdown = useMemo(() => {
    const rates = TAXI_RATES[taxiType]
    const totalDistanceMeters = distanceNum * 1000
    const extraDistance = Math.max(0, totalDistanceMeters - rates.baseDistance)
    const distanceFare = Math.floor(extraDistance / rates.unitDistance) * rates.unitFare
    const totalTimeSeconds = timeNum * 60
    const stoppedTimeSeconds = totalTimeSeconds * 0.4
    const extraTime = Math.max(0, stoppedTimeSeconds - rates.estimatedDriveSeconds)
    const timeFare = Math.floor(extraTime / rates.timeUnit) * rates.unitFare
    const baseTotal = rates.baseFare + distanceFare + timeFare
    const nightSurcharge = timeOfDay === 'night' ? Math.floor(baseTotal * NIGHT_SURCHARGE_RATE) : 0
    const total = baseTotal + nightSurcharge
    return { baseFare: rates.baseFare, distanceFare, timeFare, nightSurcharge, total }
  }, [distanceNum, timeNum, taxiType, timeOfDay])

  // Comparison fares for all 3 types
  const comparisonFares = useMemo(() => ({
    regular: calcFare(distanceNum, timeNum, 'regular', timeOfDay),
    deluxe: calcFare(distanceNum, timeNum, 'deluxe', timeOfDay),
    jumbo: calcFare(distanceNum, timeNum, 'jumbo', timeOfDay),
  }), [distanceNum, timeNum, timeOfDay])

  const maxFare = Math.max(...Object.values(comparisonFares))

  const handleReset = () => {
    setDistance('5')
    setTime('15')
    setRegion('seoul')
    setTaxiType('regular')
    setTimeOfDay('day')
  }

  const copyLink = useCallback(async () => {
    const url = window.location.href
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
      // silent fail
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [])

  const barColors: Record<TaxiType, string> = {
    regular: 'bg-blue-500',
    deluxe: 'bg-purple-500',
    jumbo: 'bg-emerald-500',
  }

  const typeLabels: Record<TaxiType, string> = {
    regular: t('types.regular'),
    deluxe: t('types.deluxe'),
    jumbo: t('types.jumbo'),
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
            {/* Distance Input + Slider */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <MapPin className="w-4 h-4 inline mr-1" />
                {t('distance')}
              </label>
              <div className="flex items-center gap-2 mb-2">
                <input
                  type="number"
                  value={distance}
                  onChange={(e) => setDistance(e.target.value)}
                  placeholder={t('distancePlaceholder')}
                  step="0.1"
                  min="0"
                  max="50"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
                <span className="text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap">km</span>
              </div>
              {/* Slider */}
              <input
                type="range"
                min="1"
                max="50"
                step="0.5"
                value={Math.min(Math.max(parseFloat(distance) || 1, 1), 50)}
                onChange={(e) => setDistance(e.target.value)}
                className="w-full h-2 rounded-lg appearance-none cursor-pointer accent-blue-600"
              />
              <div className="flex justify-between text-xs text-gray-400 dark:text-gray-500 mt-1">
                <span>1km</span>
                <span>25km</span>
                <span>50km</span>
              </div>
            </div>

            {/* Time Input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('time')}
              </label>
              <input
                type="number"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                placeholder={t('timePlaceholder')}
                step="1"
                min="0"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            {/* Region Selector */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('region')}
              </label>
              <select
                value={region}
                onChange={(e) => setRegion(e.target.value as Region)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
              >
                <option value="seoul">{t('regions.seoul')}</option>
                <option value="gyeonggi">{t('regions.gyeonggi')}</option>
                <option value="busan">{t('regions.busan')}</option>
                <option value="other">{t('regions.other')}</option>
              </select>
            </div>

            {/* Taxi Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                <Car className="w-4 h-4 inline mr-1" />
                {t('taxiType')}
              </label>
              <div className="space-y-2">
                {(['regular', 'deluxe', 'jumbo'] as TaxiType[]).map((type) => (
                  <label key={type} className="flex items-center space-x-3 cursor-pointer">
                    <input
                      type="radio"
                      name="taxiType"
                      value={type}
                      checked={taxiType === type}
                      onChange={(e) => setTaxiType(e.target.value as TaxiType)}
                      className="w-4 h-4 accent-blue-600"
                    />
                    <span className="text-gray-700 dark:text-gray-300">{t(`types.${type}`)}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Time of Day */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                {t('timeOfDay')}
              </label>
              <div className="space-y-2">
                <label className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="radio"
                    name="timeOfDay"
                    value="day"
                    checked={timeOfDay === 'day'}
                    onChange={(e) => setTimeOfDay(e.target.value as TimeOfDay)}
                    className="w-4 h-4 accent-blue-600"
                  />
                  <Sun className="w-4 h-4 text-yellow-500" />
                  <span className="text-gray-700 dark:text-gray-300">{t('times.day')}</span>
                </label>
                <label className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="radio"
                    name="timeOfDay"
                    value="night"
                    checked={timeOfDay === 'night'}
                    onChange={(e) => setTimeOfDay(e.target.value as TimeOfDay)}
                    className="w-4 h-4 accent-blue-600"
                  />
                  <Moon className="w-4 h-4 text-indigo-500" />
                  <span className="text-gray-700 dark:text-gray-300">{t('times.night')}</span>
                </label>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-2">
              {/* Copy Link */}
              <button
                onClick={copyLink}
                className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg px-4 py-3 font-medium hover:from-blue-700 hover:to-indigo-700 transition-all"
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4" />
                    {t('copyLinkDone')}
                  </>
                ) : (
                  <>
                    <Link className="w-4 h-4" />
                    {t('copyLink')}
                  </>
                )}
              </button>

              {/* Reset */}
              <button
                onClick={handleReset}
                className="w-full bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg px-4 py-3 font-medium transition-colors"
              >
                {t('reset')}
              </button>
            </div>
          </div>
        </div>

        {/* Result Panel */}
        <div className="lg:col-span-2 space-y-6">
          {/* Fare Breakdown */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6 flex items-center">
              <Car className="w-5 h-5 mr-2" />
              {t('result.title')}
            </h2>

            <div className="space-y-4">
              {/* Base Fare */}
              <div className="flex justify-between items-center py-3 border-b border-gray-200 dark:border-gray-700">
                <span className="text-gray-700 dark:text-gray-300">{t('result.baseFare')}</span>
                <span className="text-lg font-semibold text-gray-900 dark:text-white">
                  {fareBreakdown.baseFare.toLocaleString()} {t('result.won')}
                </span>
              </div>

              {/* Distance Fare */}
              <div className="flex justify-between items-center py-3 border-b border-gray-200 dark:border-gray-700">
                <span className="text-gray-700 dark:text-gray-300">{t('result.distanceFare')}</span>
                <span className="text-lg font-semibold text-gray-900 dark:text-white">
                  {fareBreakdown.distanceFare.toLocaleString()} {t('result.won')}
                </span>
              </div>

              {/* Time Fare */}
              <div className="flex justify-between items-center py-3 border-b border-gray-200 dark:border-gray-700">
                <span className="text-gray-700 dark:text-gray-300">{t('result.timeFare')}</span>
                <span className="text-lg font-semibold text-gray-900 dark:text-white">
                  {fareBreakdown.timeFare.toLocaleString()} {t('result.won')}
                </span>
              </div>

              {/* Night Surcharge */}
              {timeOfDay === 'night' && (
                <div className="flex justify-between items-center py-3 border-b border-gray-200 dark:border-gray-700">
                  <span className="text-gray-700 dark:text-gray-300 flex items-center">
                    <Moon className="w-4 h-4 mr-2 text-indigo-500" />
                    {t('result.nightSurcharge')}
                  </span>
                  <span className="text-lg font-semibold text-indigo-600 dark:text-indigo-400">
                    +{fareBreakdown.nightSurcharge.toLocaleString()} {t('result.won')}
                  </span>
                </div>
              )}

              {/* Total */}
              <div className="flex justify-between items-center py-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950 rounded-xl px-4 mt-4">
                <span className="text-xl font-bold text-gray-900 dark:text-white">{t('result.total')}</span>
                <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {fareBreakdown.total.toLocaleString()} {t('result.won')}
                </span>
              </div>
            </div>

            <p className="text-xs text-gray-500 dark:text-gray-400 mt-4">{t('result.note')}</p>
          </div>

          {/* Fare Comparison Chart */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6 flex items-center">
              <BarChart2 className="w-5 h-5 mr-2" />
              {t('comparison.title')}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">{t('comparison.subtitle')}</p>

            <div className="space-y-4">
              {(['regular', 'deluxe', 'jumbo'] as TaxiType[]).map((type) => {
                const fare = comparisonFares[type]
                const pct = maxFare > 0 ? Math.round((fare / maxFare) * 100) : 0
                const isSelected = taxiType === type
                return (
                  <div key={type}>
                    <div className="flex justify-between items-center mb-1">
                      <span className={`text-sm font-medium ${isSelected ? 'text-blue-600 dark:text-blue-400' : 'text-gray-700 dark:text-gray-300'}`}>
                        {typeLabels[type]}
                        {isSelected && (
                          <span className="ml-2 text-xs bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 px-1.5 py-0.5 rounded">
                            {t('comparison.selected')}
                          </span>
                        )}
                      </span>
                      <span className={`text-sm font-bold ${isSelected ? 'text-blue-600 dark:text-blue-400' : 'text-gray-900 dark:text-white'}`}>
                        {fare.toLocaleString()}{t('result.won')}
                      </span>
                    </div>
                    <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-6 overflow-hidden">
                      <div
                        className={`h-6 rounded-full transition-all duration-500 flex items-center justify-end pr-2 ${barColors[type]} ${isSelected ? 'opacity-100' : 'opacity-60'}`}
                        style={{ width: `${Math.max(pct, 4)}%` }}
                      >
                        {pct >= 20 && (
                          <span className="text-xs text-white font-medium">{pct}%</span>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            <p className="text-xs text-gray-500 dark:text-gray-400 mt-4">{t('comparison.note')}</p>
          </div>

          {/* Fare Info */}
          <div className="bg-blue-50 dark:bg-blue-950 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
              <BookOpen className="w-5 h-5 mr-2" />
              {t('fareInfo.title')}
            </h3>
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="bg-white dark:bg-gray-800 rounded-lg p-3">
                  <p className="font-semibold text-gray-900 dark:text-white mb-1">
                    {t('types.regular')}
                  </p>
                  <p className="text-gray-700 dark:text-gray-300">{t('fareInfo.baseFare')}: 4,800원 (1.6km)</p>
                  <p className="text-gray-700 dark:text-gray-300">{t('fareInfo.distanceRate')}: 131m당 100원</p>
                  <p className="text-gray-700 dark:text-gray-300">{t('fareInfo.timeRate')}: 30초당 100원</p>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-lg p-3">
                  <p className="font-semibold text-gray-900 dark:text-white mb-1">
                    {t('types.deluxe')} / {t('types.jumbo')}
                  </p>
                  <p className="text-gray-700 dark:text-gray-300">{t('fareInfo.baseFare')}: 7,000원 (3km)</p>
                  <p className="text-gray-700 dark:text-gray-300">{t('fareInfo.distanceRate')}: 151m당 200원</p>
                  <p className="text-gray-700 dark:text-gray-300">{t('fareInfo.timeRate')}: 36초당 200원</p>
                </div>
              </div>
              <p className="text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 rounded-lg p-3">
                <Moon className="w-4 h-4 inline mr-1 text-indigo-500" />
                {t('fareInfo.nightRate')}: 00:00~04:00 심야할증 20%
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Guide Section */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6 flex items-center">
          <BookOpen className="w-5 h-5 mr-2" />
          {t('guide.title')}
        </h2>

        <div className="space-y-6">
          {/* Calculation Method */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
              {t('guide.calculation.title')}
            </h3>
            <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300">
              {(t.raw('guide.calculation.items') as string[]).map((item, idx) => (
                <li key={idx}>{item}</li>
              ))}
            </ul>
          </div>

          {/* Tips */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
              {t('guide.tips.title')}
            </h3>
            <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300">
              {(t.raw('guide.tips.items') as string[]).map((item, idx) => (
                <li key={idx}>{item}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
