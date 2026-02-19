'use client'

import { useState, useMemo, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { Package, Truck, Calculator, Copy, Check, RotateCcw, BookOpen } from 'lucide-react'

type DestinationType = 'domestic' | 'international' | 'sameDay'

interface CarrierRate {
  name: string
  baseRate: number
  multiplier: number
}

const CARRIERS: Record<string, CarrierRate> = {
  cj: { name: 'CJ대한통운', baseRate: 3500, multiplier: 1.0 },
  hanjin: { name: '한진택배', baseRate: 3600, multiplier: 1.05 },
  logen: { name: '로젠택배', baseRate: 3400, multiplier: 0.98 },
  lotte: { name: '롯데택배', baseRate: 3550, multiplier: 1.02 },
  post: { name: '우체국택배', baseRate: 3700, multiplier: 1.08 },
}

export default function ShippingCalc() {
  const t = useTranslations('shippingCalc')
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const [weight, setWeight] = useState<string>('2')
  const [width, setWidth] = useState<string>('30')
  const [height, setHeight] = useState<string>('20')
  const [depth, setDepth] = useState<string>('15')
  const [destination, setDestination] = useState<DestinationType>('domestic')

  // Calculate volume weight: (W × H × D) / 6000
  const volumeWeight = useMemo(() => {
    const w = parseFloat(width) || 0
    const h = parseFloat(height) || 0
    const d = parseFloat(depth) || 0
    return (w * h * d) / 6000
  }, [width, height, depth])

  // Applied weight: greater of actual vs volume weight
  const appliedWeight = useMemo(() => {
    const actualWeight = parseFloat(weight) || 0
    return Math.max(actualWeight, volumeWeight)
  }, [weight, volumeWeight])

  // Calculate rate based on weight tiers
  const calculateRate = useCallback((baseRate: number, multiplier: number, destType: DestinationType) => {
    const w = appliedWeight
    let tierRate = 0

    if (w <= 2) {
      tierRate = baseRate
    } else if (w <= 5) {
      tierRate = baseRate + 500
    } else if (w <= 10) {
      tierRate = baseRate + 1500
    } else if (w <= 20) {
      tierRate = baseRate + 3000
    } else if (w <= 30) {
      tierRate = baseRate + 5000
    } else {
      tierRate = baseRate + 8000
    }

    // Destination surcharge
    if (destType === 'international') {
      tierRate *= 3.5
    } else if (destType === 'sameDay') {
      tierRate *= 1.5
    }

    return Math.round(tierRate * multiplier)
  }, [appliedWeight])

  // Calculate rates for all carriers
  const carrierRates = useMemo(() => {
    const rates = Object.entries(CARRIERS).map(([key, carrier]) => ({
      key,
      name: carrier.name,
      rate: calculateRate(carrier.baseRate, carrier.multiplier, destination),
    }))
    return rates.sort((a, b) => a.rate - b.rate)
  }, [calculateRate, destination])

  const cheapestRate = carrierRates[0]?.rate || 0
  const highestRate = carrierRates[carrierRates.length - 1]?.rate || 0

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

  const handleReset = () => {
    setWeight('2')
    setWidth('30')
    setHeight('20')
    setDepth('15')
    setDestination('domestic')
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <Package className="w-7 h-7 text-blue-600" />
          {t('title')}
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('description')}</p>
      </div>

      {/* Main Grid */}
      <div className="grid lg:grid-cols-3 gap-8">
        {/* Input Panel */}
        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 space-y-6">
            {/* Weight */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('weight')}
              </label>
              <input
                type="number"
                step="0.1"
                min="0"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                placeholder={t('weightPlaceholder')}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Box Dimensions */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                상자 크기
              </label>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                    {t('width')}
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    value={width}
                    onChange={(e) => setWidth(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                    {t('height')}
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    value={height}
                    onChange={(e) => setHeight(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                    {t('depth')}
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    value={depth}
                    onChange={(e) => setDepth(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-950 rounded-lg">
                <div className="text-xs text-gray-600 dark:text-gray-400">{t('volumeWeightInfo')}</div>
                <div className="text-lg font-semibold text-blue-600 dark:text-blue-400">
                  {volumeWeight.toFixed(2)} kg
                </div>
              </div>
            </div>

            {/* Destination Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('destination')}
              </label>
              <div className="grid grid-cols-1 gap-2">
                <button
                  onClick={() => setDestination('domestic')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    destination === 'domestic'
                      ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300'
                  }`}
                >
                  국내 배송
                </button>
                <button
                  onClick={() => setDestination('international')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    destination === 'international'
                      ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300'
                  }`}
                >
                  국제 배송
                </button>
                <button
                  onClick={() => setDestination('sameDay')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    destination === 'sameDay'
                      ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300'
                  }`}
                >
                  당일 배송
                </button>
              </div>
            </div>

            {/* Reset Button */}
            <button
              onClick={handleReset}
              className="w-full bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg px-4 py-2 font-medium flex items-center justify-center gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              {t('reset')}
            </button>
          </div>
        </div>

        {/* Results Panel */}
        <div className="lg:col-span-2 space-y-6">
          {/* Applied Weight Info */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <Calculator className="w-5 h-5 text-blue-600" />
              무게 계산
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div className="text-sm text-gray-600 dark:text-gray-400">{t('result.actualWeight')}</div>
                <div className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                  {parseFloat(weight) || 0} kg
                </div>
              </div>
              <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div className="text-sm text-gray-600 dark:text-gray-400">{t('result.volumeWeight')}</div>
                <div className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                  {volumeWeight.toFixed(2)} kg
                </div>
              </div>
            </div>
            <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-950 rounded-lg border-2 border-blue-300 dark:border-blue-700">
              <div className="text-sm text-gray-600 dark:text-gray-400">{t('result.appliedWeight')}</div>
              <div className="text-3xl font-bold text-blue-600 dark:text-blue-400 mt-1">
                {appliedWeight.toFixed(2)} kg
              </div>
              {appliedWeight === volumeWeight && appliedWeight > parseFloat(weight || '0') && (
                <div className="text-xs text-orange-600 dark:text-orange-400 mt-2">
                  ⚠️ 부피무게가 실중량보다 큽니다
                </div>
              )}
            </div>
          </div>

          {/* Carrier Rates */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <Truck className="w-5 h-5 text-blue-600" />
              택배사별 요금
            </h2>
            <div className="space-y-3">
              {carrierRates.map((carrier) => {
                const isCheapest = carrier.rate === cheapestRate
                return (
                  <div
                    key={carrier.key}
                    className={`p-4 rounded-lg border-2 ${
                      isCheapest
                        ? 'bg-green-50 dark:bg-green-950 border-green-400 dark:border-green-600'
                        : 'bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                          {carrier.name}
                          {isCheapest && (
                            <span className="px-2 py-0.5 text-xs bg-green-500 text-white rounded-full">
                              최저가
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="text-xl font-bold text-gray-900 dark:text-white">
                          {carrier.rate.toLocaleString()}원
                        </div>
                        <button
                          onClick={() => copyToClipboard(carrier.rate.toString(), carrier.key)}
                          className="p-2 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
                          title="복사"
                        >
                          {copiedId === carrier.key ? (
                            <Check className="w-4 h-4 text-green-600" />
                          ) : (
                            <Copy className="w-4 h-4 text-gray-500" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Price Range Summary */}
            <div className="mt-6 p-4 bg-indigo-50 dark:bg-indigo-950 rounded-lg">
              <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                가격 범위
              </div>
              <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
                {cheapestRate.toLocaleString()}원 ~ {highestRate.toLocaleString()}원
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                최대 {(highestRate - cheapestRate).toLocaleString()}원 차이
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Guide Section */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
          <BookOpen className="w-6 h-6 text-blue-600" />
          {t('guide.title')}
        </h2>
        <div className="grid md:grid-cols-2 gap-6">
          {/* Calculation Guide */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
              {t('guide.calculation.title')}
            </h3>
            <ul className="space-y-2">
              {(t.raw('guide.calculation.items') as string[]).map((item, idx) => (
                <li key={idx} className="flex gap-2 text-gray-600 dark:text-gray-300">
                  <span className="text-blue-600 dark:text-blue-400">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Tips */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
              {t('guide.tips.title')}
            </h3>
            <ul className="space-y-2">
              {(t.raw('guide.tips.items') as string[]).map((item, idx) => (
                <li key={idx} className="flex gap-2 text-gray-600 dark:text-gray-300">
                  <span className="text-blue-600 dark:text-blue-400">•</span>
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
