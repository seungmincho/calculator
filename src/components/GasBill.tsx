'use client'

import { useState, useMemo } from 'react'
import { useTranslations } from 'next-intl'
import { Flame, MapPin, Thermometer, BookOpen } from 'lucide-react'

type Region = 'seoul' | 'gyeonggi' | 'incheon' | 'busan' | 'daegu' | 'gwangju' | 'daejeon' | 'ulsan' | 'sejong' | 'gangwon' | 'chungbuk' | 'chungnam' | 'jeonbuk' | 'jeonnam' | 'gyeongbuk' | 'gyeongnam' | 'jeju'
type Season = 'summer' | 'winter'

interface RateData {
  basicCharge: number
  summerRate: number
  winterRate: number
}

const REGION_RATES: Record<Region, RateData> = {
  seoul: { basicCharge: 1430, summerRate: 15.89, winterRate: 19.66 },
  gyeonggi: { basicCharge: 1420, summerRate: 15.85, winterRate: 19.62 },
  incheon: { basicCharge: 1410, summerRate: 15.82, winterRate: 19.58 },
  busan: { basicCharge: 1380, summerRate: 15.75, winterRate: 19.50 },
  daegu: { basicCharge: 1390, summerRate: 15.78, winterRate: 19.53 },
  gwangju: { basicCharge: 1370, summerRate: 15.72, winterRate: 19.47 },
  daejeon: { basicCharge: 1400, summerRate: 15.80, winterRate: 19.55 },
  ulsan: { basicCharge: 1360, summerRate: 15.70, winterRate: 19.45 },
  sejong: { basicCharge: 1405, summerRate: 15.81, winterRate: 19.56 },
  gangwon: { basicCharge: 1440, summerRate: 15.92, winterRate: 19.69 },
  chungbuk: { basicCharge: 1415, summerRate: 15.84, winterRate: 19.60 },
  chungnam: { basicCharge: 1425, summerRate: 15.87, winterRate: 19.63 },
  jeonbuk: { basicCharge: 1385, summerRate: 15.76, winterRate: 19.51 },
  jeonnam: { basicCharge: 1375, summerRate: 15.73, winterRate: 19.48 },
  gyeongbuk: { basicCharge: 1395, summerRate: 15.79, winterRate: 19.54 },
  gyeongnam: { basicCharge: 1365, summerRate: 15.71, winterRate: 19.46 },
  jeju: { basicCharge: 1450, summerRate: 15.95, winterRate: 19.72 },
}

export default function GasBill() {
  const t = useTranslations('gasBill')
  const [usage, setUsage] = useState<number>(0)
  const [region, setRegion] = useState<Region>('seoul')
  const [season, setSeason] = useState<Season>('winter')

  const result = useMemo(() => {
    if (!usage || usage <= 0) return null

    const rateData = REGION_RATES[region]
    const unitPrice = season === 'summer' ? rateData.summerRate : rateData.winterRate
    const basicCharge = rateData.basicCharge
    const usageCharge = Math.round(usage * unitPrice)
    const subtotal = basicCharge + usageCharge
    const vat = Math.round(subtotal * 0.1)
    const total = subtotal + vat

    return {
      basicCharge,
      usageCharge,
      subtotal,
      vat,
      total,
      unitPrice,
    }
  }, [usage, region, season])

  const handleReset = () => {
    setUsage(0)
    setRegion('seoul')
    setSeason('winter')
  }

  const regions: Region[] = [
    'seoul',
    'gyeonggi',
    'incheon',
    'busan',
    'daegu',
    'gwangju',
    'daejeon',
    'ulsan',
    'sejong',
    'gangwon',
    'chungbuk',
    'chungnam',
    'jeonbuk',
    'jeonnam',
    'gyeongbuk',
    'gyeongnam',
    'jeju',
  ]

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('title')}</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('description')}</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <Flame className="inline-block w-4 h-4 mr-1" />
                {t('usage')}
              </label>
              <input
                type="number"
                value={usage || ''}
                onChange={(e) => setUsage(parseFloat(e.target.value) || 0)}
                placeholder={t('usagePlaceholder')}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <MapPin className="inline-block w-4 h-4 mr-1" />
                {t('region')}
              </label>
              <select
                value={region}
                onChange={(e) => setRegion(e.target.value as Region)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
              >
                {regions.map((r) => (
                  <option key={r} value={r}>
                    {t(`regions.${r}`)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <Thermometer className="inline-block w-4 h-4 mr-1" />
                {t('season')}
              </label>
              <div className="flex gap-2">
                <button
                  onClick={() => setSeason('summer')}
                  className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
                    season === 'summer'
                      ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300'
                  }`}
                >
                  {t('seasons.summer')}
                </button>
                <button
                  onClick={() => setSeason('winter')}
                  className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
                    season === 'winter'
                      ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300'
                  }`}
                >
                  {t('seasons.winter')}
                </button>
              </div>
            </div>

            <button
              onClick={handleReset}
              className="w-full bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg px-4 py-3 font-medium transition-colors"
            >
              {t('reset')}
            </button>
          </div>
        </div>

        <div className="lg:col-span-2">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
            {result ? (
              <div className="space-y-6">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-700 pb-3">
                  {t('result.title')}
                </h2>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="bg-blue-50 dark:bg-blue-950 rounded-xl p-4">
                    <div className="text-sm text-gray-600 dark:text-gray-400">{t('result.basicCharge')}</div>
                    <div className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                      {result.basicCharge.toLocaleString('ko-KR')} {t('result.won')}
                    </div>
                  </div>
                  <div className="bg-blue-50 dark:bg-blue-950 rounded-xl p-4">
                    <div className="text-sm text-gray-600 dark:text-gray-400">{t('result.usageCharge')}</div>
                    <div className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                      {result.usageCharge.toLocaleString('ko-KR')} {t('result.won')}
                    </div>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-4">
                    <div className="text-sm text-gray-600 dark:text-gray-400">{t('result.subtotal')}</div>
                    <div className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                      {result.subtotal.toLocaleString('ko-KR')} {t('result.won')}
                    </div>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-4">
                    <div className="text-sm text-gray-600 dark:text-gray-400">{t('result.vat')}</div>
                    <div className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                      {result.vat.toLocaleString('ko-KR')} {t('result.won')}
                    </div>
                  </div>
                </div>
                <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl p-6 text-white">
                  <div className="text-sm opacity-90">{t('result.total')}</div>
                  <div className="text-4xl font-bold mt-2">
                    {result.total.toLocaleString('ko-KR')} {t('result.won')}
                  </div>
                  <div className="text-sm opacity-75 mt-3">
                    {t('result.unitPrice')}: {result.unitPrice.toFixed(2)} {t('result.won')}/MJ
                  </div>
                </div>

                <div className="bg-yellow-50 dark:bg-yellow-950 rounded-xl p-4">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">
                    {t('averageUsage.title')}
                  </h3>
                  <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                    <div>{t('averageUsage.summer')}: 150-200 MJ</div>
                    <div>{t('averageUsage.winter')}: 300-400 MJ</div>
                    <div className="text-xs mt-2">{t('averageUsage.description')}</div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-12 text-gray-400 dark:text-gray-500">
                <Flame className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p>{t('calculate')}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
          <BookOpen className="w-5 h-5" />
          {t('guide.title')}
        </h2>
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
              {t('guide.structure.title')}
            </h3>
            <ul className="space-y-2">
              {(t.raw('guide.structure.items') as string[]).map((item, index) => (
                <li key={index} className="flex items-start gap-2 text-gray-600 dark:text-gray-300">
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
            <ul className="space-y-2">
              {(t.raw('guide.tips.items') as string[]).map((item, index) => (
                <li key={index} className="flex items-start gap-2 text-gray-600 dark:text-gray-300">
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
