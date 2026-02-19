'use client'

import { useState, useCallback, useMemo } from 'react'
import { useTranslations } from 'next-intl'
import { Zap, Lightbulb, Copy, Check, BookOpen, RotateCcw } from 'lucide-react'

type Season = 'normal' | 'summer' | 'winter'
type ContractType = 'low' | 'high'

interface BaseFee {
  tier1: number
  tier2: number
  tier3: number
}

interface UsageRates {
  tier1: { max: number; rate: number }
  tier2: { max: number; rate: number }
  tier3: { rate: number }
}

interface Breakdown {
  tier1Usage: number
  tier2Usage: number
  tier3Usage: number
  baseFee: number
  tier1Fee: number
  tier2Fee: number
  tier3Fee: number
  usageFee: number
  climateFee: number
  fuelAdjustment: number
  subtotal: number
  vat: number
  fund: number
  total: number
  costPerKwh: number
}

const LOW_VOLTAGE_BASE_FEE: BaseFee = {
  tier1: 910, // 0-200kWh
  tier2: 1600, // 201-400kWh
  tier3: 7300, // 401+kWh
}

const HIGH_VOLTAGE_BASE_FEE: BaseFee = {
  tier1: 730, // 0-200kWh
  tier2: 1260, // 201-400kWh
  tier3: 6060, // 401+kWh
}

const NORMAL_SEASON_RATES: UsageRates = {
  tier1: { max: 200, rate: 120.0 },
  tier2: { max: 400, rate: 214.6 },
  tier3: { rate: 307.3 },
}

const SUMMER_RATES: UsageRates = {
  tier1: { max: 300, rate: 120.0 },
  tier2: { max: 450, rate: 214.6 },
  tier3: { rate: 307.3 },
}

const WINTER_RATES: UsageRates = {
  tier1: { max: 200, rate: 120.0 },
  tier2: { max: 400, rate: 214.6 },
  tier3: { rate: 307.3 },
}

const CLIMATE_ENV_FEE = 9.0 // 원/kWh
const FUEL_COST_ADJUSTMENT = 5.0 // 원/kWh
const VAT_RATE = 0.1 // 10%
const FUND_RATE = 0.037 // 3.7%

const HOUSEHOLD_USAGE = {
  single: 200,
  couple: 300,
  three: 350,
  four: 400,
}

export default function ElectricityCalculator() {
  const t = useTranslations('electricityCalculator')
  const [usage, setUsage] = useState<number>(300)
  const [season, setSeason] = useState<Season>('normal')
  const [contractType, setContractType] = useState<ContractType>('low')
  const [copiedId, setCopiedId] = useState<string | null>(null)

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

  const breakdown = useMemo((): Breakdown => {
    const rates = season === 'summer' ? SUMMER_RATES : season === 'winter' ? WINTER_RATES : NORMAL_SEASON_RATES
    const baseFees = contractType === 'low' ? LOW_VOLTAGE_BASE_FEE : HIGH_VOLTAGE_BASE_FEE

    let tier1Usage = 0
    let tier2Usage = 0
    let tier3Usage = 0
    let baseFee = 0

    if (usage <= rates.tier1.max) {
      tier1Usage = usage
      baseFee = baseFees.tier1
    } else if (usage <= rates.tier2.max) {
      tier1Usage = rates.tier1.max
      tier2Usage = usage - rates.tier1.max
      baseFee = baseFees.tier2
    } else {
      tier1Usage = rates.tier1.max
      tier2Usage = rates.tier2.max - rates.tier1.max
      tier3Usage = usage - rates.tier2.max
      baseFee = baseFees.tier3
    }

    const tier1Fee = tier1Usage * rates.tier1.rate
    const tier2Fee = tier2Usage * rates.tier2.rate
    const tier3Fee = tier3Usage * rates.tier3.rate
    const usageFee = tier1Fee + tier2Fee + tier3Fee

    const climateFee = usage * CLIMATE_ENV_FEE
    const fuelAdjustment = usage * FUEL_COST_ADJUSTMENT

    const subtotal = baseFee + usageFee + climateFee + fuelAdjustment
    const vat = Math.round(subtotal * VAT_RATE)
    const fund = Math.round((subtotal + vat) * FUND_RATE)
    const total = Math.round(subtotal + vat + fund)
    const costPerKwh = usage > 0 ? total / usage : 0

    return {
      tier1Usage,
      tier2Usage,
      tier3Usage,
      baseFee,
      tier1Fee,
      tier2Fee,
      tier3Fee,
      usageFee,
      climateFee,
      fuelAdjustment,
      subtotal,
      vat,
      fund,
      total,
      costPerKwh,
    }
  }, [usage, season, contractType])

  const handleReset = useCallback(() => {
    setUsage(300)
    setSeason('normal')
    setContractType('low')
  }, [])

  const getTierColor = (tier: number): string => {
    if (tier === 1) return 'bg-green-500'
    if (tier === 2) return 'bg-yellow-500'
    return 'bg-red-500'
  }

  const getTierLabel = (tier: number): string => {
    const rates = season === 'summer' ? SUMMER_RATES : season === 'winter' ? WINTER_RATES : NORMAL_SEASON_RATES
    if (tier === 1) return `0-${rates.tier1.max}kWh`
    if (tier === 2) return `${rates.tier1.max + 1}-${rates.tier2.max}kWh`
    return `${rates.tier2.max + 1}+kWh`
  }

  const getTierPercentage = (tierUsage: number): number => {
    return usage > 0 ? (tierUsage / usage) * 100 : 0
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
        {/* Left Panel - Settings */}
        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <Zap className="w-5 h-5 text-yellow-500" />
                설정
              </h2>
              <button
                onClick={handleReset}
                className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
                aria-label={t('common.reset')}
              >
                <RotateCcw className="w-5 h-5" />
              </button>
            </div>

            {/* Usage Input */}
            <div className="space-y-3">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                {t('usage')}
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  value={usage}
                  onChange={(e) => setUsage(Math.max(0, Math.min(1000, Number(e.target.value))))}
                  className="w-24 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                  min="0"
                  max="1000"
                />
                <span className="text-sm text-gray-500 dark:text-gray-400">kWh</span>
              </div>
              <input
                type="range"
                value={usage}
                onChange={(e) => setUsage(Number(e.target.value))}
                min="0"
                max="1000"
                step="10"
                className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-600"
              />
            </div>

            {/* Household Size Quick Buttons */}
            <div className="space-y-3">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                가구 인원별 평균
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setUsage(HOUSEHOLD_USAGE.single)}
                  className="px-3 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 transition-colors"
                >
                  1인 (200kWh)
                </button>
                <button
                  onClick={() => setUsage(HOUSEHOLD_USAGE.couple)}
                  className="px-3 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 transition-colors"
                >
                  2인 (300kWh)
                </button>
                <button
                  onClick={() => setUsage(HOUSEHOLD_USAGE.three)}
                  className="px-3 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 transition-colors"
                >
                  3인 (350kWh)
                </button>
                <button
                  onClick={() => setUsage(HOUSEHOLD_USAGE.four)}
                  className="px-3 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 transition-colors"
                >
                  4인+ (400kWh)
                </button>
              </div>
            </div>

            {/* Season Selector */}
            <div className="space-y-3">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                {t('season')}
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => setSeason('normal')}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    season === 'normal'
                      ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  {t('seasons.normal')}
                </button>
                <button
                  onClick={() => setSeason('summer')}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    season === 'summer'
                      ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  {t('seasons.summer')}
                </button>
                <button
                  onClick={() => setSeason('winter')}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    season === 'winter'
                      ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  {t('seasons.winter')}
                </button>
              </div>
            </div>

            {/* Contract Type */}
            <div className="space-y-3">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                {t('contractType')}
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setContractType('low')}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    contractType === 'low'
                      ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  {t('contracts.lowVoltage')}
                </button>
                <button
                  onClick={() => setContractType('high')}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    contractType === 'high'
                      ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  {t('contracts.highVoltage')}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right Panel - Results */}
        <div className="lg:col-span-2 space-y-6">
          {/* Total Bill Card */}
          <div className="bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl shadow-lg p-8 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium opacity-90">{t('result.totalMonthly')}</p>
                <p className="text-4xl font-bold mt-2">{breakdown.total.toLocaleString()}원</p>
                <p className="text-sm opacity-75 mt-2">
                  {t('result.perKwh')}: {breakdown.costPerKwh.toFixed(2)}원/kWh
                </p>
              </div>
              <button
                onClick={() => copyToClipboard(`${breakdown.total.toLocaleString()}원`, 'total')}
                className="p-3 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-lg transition-colors"
                aria-label="복사"
              >
                {copiedId === 'total' ? <Check className="w-6 h-6" /> : <Copy className="w-6 h-6" />}
              </button>
            </div>
          </div>

          {/* Tier Visualization */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              {t('tiers.title')}
            </h3>
            <div className="space-y-4">
              {/* Progress Bar */}
              <div className="relative h-8 bg-gray-200 dark:bg-gray-700 rounded-lg overflow-hidden">
                {breakdown.tier1Usage > 0 && (
                  <div
                    className={`absolute left-0 h-full ${getTierColor(1)}`}
                    style={{ width: `${getTierPercentage(breakdown.tier1Usage)}%` }}
                  />
                )}
                {breakdown.tier2Usage > 0 && (
                  <div
                    className={`absolute h-full ${getTierColor(2)}`}
                    style={{
                      left: `${getTierPercentage(breakdown.tier1Usage)}%`,
                      width: `${getTierPercentage(breakdown.tier2Usage)}%`,
                    }}
                  />
                )}
                {breakdown.tier3Usage > 0 && (
                  <div
                    className={`absolute h-full ${getTierColor(3)}`}
                    style={{
                      left: `${getTierPercentage(breakdown.tier1Usage) + getTierPercentage(breakdown.tier2Usage)}%`,
                      width: `${getTierPercentage(breakdown.tier3Usage)}%`,
                    }}
                  />
                )}
              </div>

              {/* Tier Legend */}
              <div className="grid grid-cols-3 gap-3">
                {breakdown.tier1Usage > 0 && (
                  <div className="flex items-center gap-2">
                    <div className={`w-4 h-4 ${getTierColor(1)} rounded`} />
                    <div className="text-xs">
                      <p className="font-medium text-gray-900 dark:text-white">{getTierLabel(1)}</p>
                      <p className="text-gray-500 dark:text-gray-400">{breakdown.tier1Usage.toFixed(0)}kWh</p>
                    </div>
                  </div>
                )}
                {breakdown.tier2Usage > 0 && (
                  <div className="flex items-center gap-2">
                    <div className={`w-4 h-4 ${getTierColor(2)} rounded`} />
                    <div className="text-xs">
                      <p className="font-medium text-gray-900 dark:text-white">{getTierLabel(2)}</p>
                      <p className="text-gray-500 dark:text-gray-400">{breakdown.tier2Usage.toFixed(0)}kWh</p>
                    </div>
                  </div>
                )}
                {breakdown.tier3Usage > 0 && (
                  <div className="flex items-center gap-2">
                    <div className={`w-4 h-4 ${getTierColor(3)} rounded`} />
                    <div className="text-xs">
                      <p className="font-medium text-gray-900 dark:text-white">{getTierLabel(3)}</p>
                      <p className="text-gray-500 dark:text-gray-400">{breakdown.tier3Usage.toFixed(0)}kWh</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Detailed Breakdown */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              상세 내역
            </h3>
            <div className="space-y-2">
              <div className="flex justify-between py-2 border-b border-gray-200 dark:border-gray-700">
                <span className="text-sm text-gray-600 dark:text-gray-400">{t('result.baseFee')}</span>
                <span className="font-medium text-gray-900 dark:text-white">
                  {breakdown.baseFee.toLocaleString()}원
                </span>
              </div>
              {breakdown.tier1Usage > 0 && (
                <div className="flex justify-between py-2 border-b border-gray-200 dark:border-gray-700">
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    1구간 {t('tiers.fee')} ({breakdown.tier1Usage.toFixed(0)}kWh)
                  </span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {breakdown.tier1Fee.toLocaleString()}원
                  </span>
                </div>
              )}
              {breakdown.tier2Usage > 0 && (
                <div className="flex justify-between py-2 border-b border-gray-200 dark:border-gray-700">
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    2구간 {t('tiers.fee')} ({breakdown.tier2Usage.toFixed(0)}kWh)
                  </span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {breakdown.tier2Fee.toLocaleString()}원
                  </span>
                </div>
              )}
              {breakdown.tier3Usage > 0 && (
                <div className="flex justify-between py-2 border-b border-gray-200 dark:border-gray-700">
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    3구간 {t('tiers.fee')} ({breakdown.tier3Usage.toFixed(0)}kWh)
                  </span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {breakdown.tier3Fee.toLocaleString()}원
                  </span>
                </div>
              )}
              <div className="flex justify-between py-2 border-b border-gray-200 dark:border-gray-700">
                <span className="text-sm text-gray-600 dark:text-gray-400">{t('result.climateFee')}</span>
                <span className="font-medium text-gray-900 dark:text-white">
                  {breakdown.climateFee.toLocaleString()}원
                </span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-200 dark:border-gray-700">
                <span className="text-sm text-gray-600 dark:text-gray-400">{t('result.fuelAdjust')}</span>
                <span className="font-medium text-gray-900 dark:text-white">
                  {breakdown.fuelAdjustment.toLocaleString()}원
                </span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-200 dark:border-gray-700">
                <span className="text-sm text-gray-600 dark:text-gray-400">{t('result.subtotal')}</span>
                <span className="font-medium text-gray-900 dark:text-white">
                  {breakdown.subtotal.toLocaleString()}원
                </span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-200 dark:border-gray-700">
                <span className="text-sm text-gray-600 dark:text-gray-400">{t('result.vat')}</span>
                <span className="font-medium text-gray-900 dark:text-white">
                  {breakdown.vat.toLocaleString()}원
                </span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-200 dark:border-gray-700">
                <span className="text-sm text-gray-600 dark:text-gray-400">{t('result.elecFund')}</span>
                <span className="font-medium text-gray-900 dark:text-white">
                  {breakdown.fund.toLocaleString()}원
                </span>
              </div>
              <div className="flex justify-between py-3 bg-blue-50 dark:bg-blue-950 rounded-lg px-3 mt-2">
                <span className="font-semibold text-gray-900 dark:text-white">총 요금</span>
                <span className="font-bold text-blue-600 dark:text-blue-400 text-lg">
                  {breakdown.total.toLocaleString()}원
                </span>
              </div>
            </div>
          </div>

          {/* Saving Tips */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <Lightbulb className="w-5 h-5 text-yellow-500" />
              {t('savingTips.title')}
            </h3>
            <ul className="space-y-2">
              {(t.raw('savingTips.items') as string[]).map((tip, index) => (
                <li key={index} className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <span className="text-blue-600 dark:text-blue-400 mt-0.5">•</span>
                  <span>{tip}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Guide Section */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
          <BookOpen className="w-6 h-6 text-blue-600" />
          {t('guide.title')}
        </h2>
        <div className="space-y-6">
          {/* How to Use */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-3">
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

          {/* Rate Info */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-3">
              {t('guide.rateInfo.title')}
            </h3>
            <ul className="space-y-2">
              {(t.raw('guide.rateInfo.items') as string[]).map((item, index) => (
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
