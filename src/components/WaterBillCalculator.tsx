'use client'

import { useState, useCallback, useMemo } from 'react'
import { useTranslations } from 'next-intl'
import { Droplets, Copy, Check, RotateCcw, BookOpen } from 'lucide-react'

interface WaterBillResult {
  basicFee: number
  usageFee: number
  sewageFee: number
  waterQualityFee: number
  subtotal: number
  vat: number
  total: number
}

export default function WaterBillCalculator() {
  const t = useTranslations('waterBill')
  const [usage, setUsage] = useState<number>(15)
  const [householdSize, setHouseholdSize] = useState<number>(3)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const calculateWaterBill = useCallback((usage: number): WaterBillResult => {
    const basicFee = 1080
    const tiers = [
      { limit: 10, rate: 360 },
      { limit: 20, rate: 550 },
      { limit: 30, rate: 790 },
      { limit: 40, rate: 1180 },
      { limit: 50, rate: 1580 },
      { limit: Infinity, rate: 2100 },
    ]

    let usageFee = 0
    let remaining = usage
    let prevLimit = 0

    for (const tier of tiers) {
      const tierUsage = Math.min(remaining, tier.limit - prevLimit)
      if (tierUsage <= 0) break
      usageFee += tierUsage * tier.rate
      remaining -= tierUsage
      prevLimit = tier.limit
    }

    const sewageFee = Math.round(usageFee * 0.5)
    const waterQualityFee = usage * 170
    const subtotal = basicFee + usageFee + sewageFee + waterQualityFee
    const vat = Math.round(subtotal * 0.1)

    return { basicFee, usageFee, sewageFee, waterQualityFee, subtotal, vat, total: subtotal + vat }
  }, [])

  const result = useMemo(() => calculateWaterBill(usage), [usage, calculateWaterBill])

  const householdUsageMap: Record<number, number> = {
    1: 6,
    2: 10,
    3: 14,
    4: 18,
    5: 22,
    6: 26,
  }

  const handleQuickUsage = useCallback((size: number) => {
    setHouseholdSize(size)
    setUsage(householdUsageMap[size] ?? 14)
  }, [])

  const handleReset = useCallback(() => {
    setUsage(15)
    setHouseholdSize(3)
  }, [])

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

  const getTierInfo = useCallback((usage: number) => {
    const tiers = [
      { range: '1-10', limit: 10, rate: 360, color: 'bg-blue-200 dark:bg-blue-900' },
      { range: '11-20', limit: 20, rate: 550, color: 'bg-green-200 dark:bg-green-900' },
      { range: '21-30', limit: 30, rate: 790, color: 'bg-yellow-200 dark:bg-yellow-900' },
      { range: '31-40', limit: 40, rate: 1180, color: 'bg-orange-200 dark:bg-orange-900' },
      { range: '41-50', limit: 50, rate: 1580, color: 'bg-red-200 dark:bg-red-900' },
      { range: '51+', limit: Infinity, rate: 2100, color: 'bg-purple-200 dark:bg-purple-900' },
    ]

    let remaining = usage
    let prevLimit = 0
    const tierUsages: { range: string; usage: number; rate: number; color: string; percentage: number }[] = []

    for (const tier of tiers) {
      const tierUsage = Math.min(remaining, tier.limit - prevLimit)
      if (tierUsage <= 0) break
      tierUsages.push({
        range: tier.range,
        usage: tierUsage,
        rate: tier.rate,
        color: tier.color,
        percentage: (tierUsage / usage) * 100,
      })
      remaining -= tierUsage
      prevLimit = tier.limit
    }

    return tierUsages
  }, [])

  const tierInfo = useMemo(() => getTierInfo(usage), [usage, getTierInfo])

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('title')}</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('description')}</p>
      </div>

      {/* Main Grid */}
      <div className="grid lg:grid-cols-3 gap-8">
        {/* Left Panel - Inputs */}
        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 space-y-6">
            {/* Usage Slider */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('usage')}
              </label>
              <div className="flex items-center gap-4">
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={usage}
                  onChange={(e) => setUsage(Number(e.target.value))}
                  className="flex-1 accent-blue-600"
                />
                <input
                  type="number"
                  min="0"
                  max="1000"
                  value={usage}
                  onChange={(e) => setUsage(Math.max(0, Number(e.target.value)))}
                  className="w-20 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-center focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                m³
              </p>
            </div>

            {/* Quick Usage Buttons */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('quickUsage')}
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[1, 2, 3, 4, 5, 6].map((size) => (
                  <button
                    key={size}
                    onClick={() => handleQuickUsage(size)}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      householdSize === size
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    {size}{t('persons')}
                  </button>
                ))}
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                가구원 수를 선택하면 평균 사용량이 자동 입력됩니다
              </p>
            </div>

            {/* Average Usage Reference */}
            <div className="bg-blue-50 dark:bg-blue-950 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-2 flex items-center gap-2">
                <Droplets className="w-4 h-4" />
                {t('averageUsage')}
              </h3>
              <ul className="text-xs text-blue-800 dark:text-blue-200 space-y-1">
                <li>• {t('avgInfo.person1')}</li>
                <li>• {t('avgInfo.person2')}</li>
                <li>• {t('avgInfo.person3')}</li>
                <li>• {t('avgInfo.person4')}</li>
              </ul>
            </div>

            {/* Reset Button */}
            <button
              onClick={handleReset}
              className="w-full flex items-center justify-center gap-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg px-4 py-2 font-medium transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              {t('reset')}
            </button>
          </div>
        </div>

        {/* Right Panel - Results */}
        <div className="lg:col-span-2 space-y-6">
          {/* Total Card */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl shadow-lg p-8 text-white">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm opacity-90 mb-1">{t('totalAmount')}</p>
                <p className="text-4xl font-bold">
                  {result.total.toLocaleString()}{t('won')}
                </p>
                <p className="text-sm opacity-75 mt-2">
                  월 사용량: {usage}m³
                </p>
              </div>
              <button
                onClick={() => copyToClipboard(result.total.toString(), 'total')}
                className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                title={t('copy')}
              >
                {copiedId === 'total' ? (
                  <Check className="w-5 h-5" />
                ) : (
                  <Copy className="w-5 h-5" />
                )}
              </button>
            </div>
          </div>

          {/* Breakdown Cards */}
          <div className="grid md:grid-cols-2 gap-4">
            {/* Basic Fee */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4">
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">
                {t('basicFee')}
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {result.basicFee.toLocaleString()}{t('won')}
              </p>
            </div>

            {/* Usage Fee */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4">
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">
                {t('usageFee')}
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {result.usageFee.toLocaleString()}{t('won')}
              </p>
            </div>

            {/* Sewage Fee */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4">
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">
                {t('sewageFee')}
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {result.sewageFee.toLocaleString()}{t('won')}
              </p>
            </div>

            {/* Water Quality Fee */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4">
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">
                {t('waterQualityFee')}
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {result.waterQualityFee.toLocaleString()}{t('won')}
              </p>
            </div>

            {/* VAT */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4">
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">
                {t('vat')}
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {result.vat.toLocaleString()}{t('won')}
              </p>
            </div>

            {/* Subtotal */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4">
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">
                {t('totalBeforeVat')}
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {result.subtotal.toLocaleString()}{t('won')}
              </p>
            </div>
          </div>

          {/* Tier Visualization */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              {t('tierInfo')}
            </h3>
            <div className="space-y-3">
              {tierInfo.map((tier, idx) => (
                <div key={idx}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-gray-700 dark:text-gray-300">
                      {tier.range}m³ ({tier.usage}m³)
                    </span>
                    <span className="text-gray-500 dark:text-gray-400">
                      {tier.rate.toLocaleString()}원/m³
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
                    <div
                      className={`h-full ${tier.color} transition-all duration-300`}
                      style={{ width: `${tier.percentage}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-4">
              사용량 구간별 단가와 비중을 시각적으로 표시합니다
            </p>
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
          {/* Rate Structure */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
              {t('guide.structure.title')}
            </h3>
            <ul className="space-y-2 text-gray-700 dark:text-gray-300">
              {(t.raw('guide.structure.items') as string[]).map((item, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="text-blue-600 dark:text-blue-400 mt-1">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Tips */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
              {t('guide.saving.title')}
            </h3>
            <ul className="space-y-2 text-gray-700 dark:text-gray-300">
              {(t.raw('guide.saving.items') as string[]).map((item, idx) => (
                <li key={idx} className="flex items-start gap-2">
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
