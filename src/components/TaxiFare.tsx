'use client'

import { useState, useMemo } from 'react'
import { useTranslations } from 'next-intl'
import { Car, Moon, Sun, BookOpen, MapPin } from 'lucide-react'

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

export default function TaxiFare() {
  const t = useTranslations('taxiFare')

  const [distance, setDistance] = useState<string>('5')
  const [time, setTime] = useState<string>('15')
  const [region, setRegion] = useState<Region>('seoul')
  const [taxiType, setTaxiType] = useState<TaxiType>('regular')
  const [timeOfDay, setTimeOfDay] = useState<TimeOfDay>('day')

  const fareBreakdown = useMemo(() => {
    const distanceNum = parseFloat(distance) || 0
    const timeNum = parseFloat(time) || 0
    const rates = TAXI_RATES[taxiType]

    // Base fare
    const baseFare = rates.baseFare

    // Distance fare
    const totalDistanceMeters = distanceNum * 1000
    const extraDistance = Math.max(0, totalDistanceMeters - rates.baseDistance)
    const distanceFare = Math.floor(extraDistance / rates.unitDistance) * rates.unitFare

    // Time fare (for stopped/slow time)
    // Assuming 40% of total time is stopped/slow
    const totalTimeSeconds = timeNum * 60
    const stoppedTimeSeconds = totalTimeSeconds * 0.4
    const extraTime = Math.max(0, stoppedTimeSeconds - rates.estimatedDriveSeconds)
    const timeFare = Math.floor(extraTime / rates.timeUnit) * rates.unitFare

    // Night surcharge
    const baseTotal = baseFare + distanceFare + timeFare
    const nightSurcharge = timeOfDay === 'night' ? Math.floor(baseTotal * NIGHT_SURCHARGE_RATE) : 0

    // Total
    const total = baseTotal + nightSurcharge

    return {
      baseFare,
      distanceFare,
      timeFare,
      nightSurcharge,
      total,
    }
  }, [distance, time, taxiType, timeOfDay])

  const handleReset = () => {
    setDistance('5')
    setTime('15')
    setRegion('seoul')
    setTaxiType('regular')
    setTimeOfDay('day')
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
            {/* Distance Input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <MapPin className="w-4 h-4 inline mr-1" />
                {t('distance')}
              </label>
              <input
                type="number"
                value={distance}
                onChange={(e) => setDistance(e.target.value)}
                placeholder={t('distancePlaceholder')}
                step="0.1"
                min="0"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
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
                <label className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="radio"
                    name="taxiType"
                    value="regular"
                    checked={taxiType === 'regular'}
                    onChange={(e) => setTaxiType(e.target.value as TaxiType)}
                    className="w-4 h-4 accent-blue-600"
                  />
                  <span className="text-gray-700 dark:text-gray-300">{t('types.regular')}</span>
                </label>
                <label className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="radio"
                    name="taxiType"
                    value="deluxe"
                    checked={taxiType === 'deluxe'}
                    onChange={(e) => setTaxiType(e.target.value as TaxiType)}
                    className="w-4 h-4 accent-blue-600"
                  />
                  <span className="text-gray-700 dark:text-gray-300">{t('types.deluxe')}</span>
                </label>
                <label className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="radio"
                    name="taxiType"
                    value="jumbo"
                    checked={taxiType === 'jumbo'}
                    onChange={(e) => setTaxiType(e.target.value as TaxiType)}
                    className="w-4 h-4 accent-blue-600"
                  />
                  <span className="text-gray-700 dark:text-gray-300">{t('types.jumbo')}</span>
                </label>
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

            {/* Reset Button */}
            <button
              onClick={handleReset}
              className="w-full bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg px-4 py-3 font-medium transition-colors"
            >
              {t('reset')}
            </button>
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
