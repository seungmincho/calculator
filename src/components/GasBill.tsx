'use client'

import { useState, useMemo, useCallback, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { useSearchParams } from 'next/navigation'
import { Flame, MapPin, Thermometer, BookOpen, Copy, Check, Share2, Home, ChevronDown, Zap, Droplets } from 'lucide-react'

type Region = 'seoul' | 'gyeonggi' | 'incheon' | 'busan' | 'daegu' | 'gwangju' | 'daejeon' | 'ulsan' | 'sejong' | 'gangwon' | 'chungbuk' | 'chungnam' | 'jeonbuk' | 'jeonnam' | 'gyeongbuk' | 'gyeongnam' | 'jeju'
type Season = 'spring' | 'summer' | 'autumn' | 'winter'
type Insulation = 'good' | 'average' | 'poor'

interface RateData {
  basicCharge: number
  springRate: number
  summerRate: number
  autumnRate: number
  winterRate: number
}

interface TierInfo {
  label: string
  min: number
  max: number
  rate: number
  usage: number
  charge: number
}

const REGION_RATES: Record<Region, RateData> = {
  seoul:     { basicCharge: 1430, springRate: 17.50, summerRate: 15.89, autumnRate: 17.80, winterRate: 19.66 },
  gyeonggi:  { basicCharge: 1420, springRate: 17.46, summerRate: 15.85, autumnRate: 17.76, winterRate: 19.62 },
  incheon:   { basicCharge: 1410, springRate: 17.42, summerRate: 15.82, autumnRate: 17.72, winterRate: 19.58 },
  busan:     { basicCharge: 1380, springRate: 17.35, summerRate: 15.75, autumnRate: 17.65, winterRate: 19.50 },
  daegu:     { basicCharge: 1390, springRate: 17.38, summerRate: 15.78, autumnRate: 17.68, winterRate: 19.53 },
  gwangju:   { basicCharge: 1370, springRate: 17.32, summerRate: 15.72, autumnRate: 17.62, winterRate: 19.47 },
  daejeon:   { basicCharge: 1400, springRate: 17.40, summerRate: 15.80, autumnRate: 17.70, winterRate: 19.55 },
  ulsan:     { basicCharge: 1360, springRate: 17.30, summerRate: 15.70, autumnRate: 17.60, winterRate: 19.45 },
  sejong:    { basicCharge: 1405, springRate: 17.41, summerRate: 15.81, autumnRate: 17.71, winterRate: 19.56 },
  gangwon:   { basicCharge: 1440, springRate: 17.53, summerRate: 15.92, autumnRate: 17.83, winterRate: 19.69 },
  chungbuk:  { basicCharge: 1415, springRate: 17.44, summerRate: 15.84, autumnRate: 17.74, winterRate: 19.60 },
  chungnam:  { basicCharge: 1425, springRate: 17.48, summerRate: 15.87, autumnRate: 17.78, winterRate: 19.63 },
  jeonbuk:   { basicCharge: 1385, springRate: 17.36, summerRate: 15.76, autumnRate: 17.66, winterRate: 19.51 },
  jeonnam:   { basicCharge: 1375, springRate: 17.33, summerRate: 15.73, autumnRate: 17.63, winterRate: 19.48 },
  gyeongbuk: { basicCharge: 1395, springRate: 17.39, summerRate: 15.79, autumnRate: 17.69, winterRate: 19.54 },
  gyeongnam: { basicCharge: 1365, springRate: 17.31, summerRate: 15.71, autumnRate: 17.61, winterRate: 19.46 },
  jeju:      { basicCharge: 1450, springRate: 17.55, summerRate: 15.95, autumnRate: 17.85, winterRate: 19.72 },
}

// Progressive rate tiers (MJ-based)
const RATE_TIERS = [
  { min: 0, max: 50, multiplier: 0.85 },
  { min: 50, max: 150, multiplier: 1.0 },
  { min: 150, max: 300, multiplier: 1.15 },
  { min: 300, max: Infinity, multiplier: 1.35 },
]

// Monthly typical usage patterns (MJ) for an average household
const MONTHLY_USAGE_PATTERN = [
  350, // Jan (winter)
  300, // Feb (winter)
  180, // Mar (spring)
  120, // Apr (spring)
  80,  // May (spring)
  50,  // Jun (summer)
  40,  // Jul (summer)
  45,  // Aug (summer)
  90,  // Sep (autumn)
  160, // Oct (autumn)
  250, // Nov (autumn)
  320, // Dec (winter)
]

const MONTH_SEASONS: Season[] = [
  'winter', 'winter', 'spring', 'spring', 'spring',
  'summer', 'summer', 'summer', 'autumn', 'autumn', 'autumn', 'winter',
]

// Boiler consumption: MJ per pyeong per hour by insulation
const BOILER_CONSUMPTION: Record<Insulation, number> = {
  good: 0.8,
  average: 1.2,
  poor: 1.7,
}

function getSeasonRate(rateData: RateData, season: Season): number {
  switch (season) {
    case 'spring': return rateData.springRate
    case 'summer': return rateData.summerRate
    case 'autumn': return rateData.autumnRate
    case 'winter': return rateData.winterRate
  }
}

function calcTiers(usage: number, baseRate: number): TierInfo[] {
  const tierLabels = ['tier1', 'tier2', 'tier3', 'tier4']
  let remaining = usage
  return RATE_TIERS.map((tier, i) => {
    const range = tier.max === Infinity ? Infinity : tier.max - tier.min
    const usedInTier = Math.min(remaining, range)
    remaining = Math.max(0, remaining - usedInTier)
    const rate = Math.round(baseRate * tier.multiplier * 100) / 100
    return {
      label: tierLabels[i],
      min: tier.min,
      max: tier.max,
      rate,
      usage: usedInTier,
      charge: Math.round(usedInTier * rate),
    }
  })
}

function calcBill(usage: number, region: Region, season: Season) {
  if (!usage || usage <= 0) return null
  const rateData = REGION_RATES[region]
  const baseRate = getSeasonRate(rateData, season)
  const basicCharge = rateData.basicCharge
  const tiers = calcTiers(usage, baseRate)
  const usageCharge = tiers.reduce((sum, t) => sum + t.charge, 0)
  const subtotal = basicCharge + usageCharge
  const vat = Math.round(subtotal * 0.1)
  const total = subtotal + vat
  return { basicCharge, usageCharge, subtotal, vat, total, unitPrice: baseRate, tiers }
}

export default function GasBill() {
  const t = useTranslations('gasBill')
  const searchParams = useSearchParams()

  const [usage, setUsage] = useState<number>(0)
  const [region, setRegion] = useState<Region>('seoul')
  const [season, setSeason] = useState<Season>('winter')
  const [copiedId, setCopiedId] = useState<string | null>(null)

  // Boiler simulation
  const [houseSize, setHouseSize] = useState<number>(25)
  const [insulation, setInsulation] = useState<Insulation>('average')
  const [heatingHours, setHeatingHours] = useState<number>(8)
  const [showBoilerSim, setShowBoilerSim] = useState(false)

  // Utility consolidation
  const [electricityBill, setElectricityBill] = useState<number>(0)
  const [waterBill, setWaterBill] = useState<number>(0)
  const [internetBill, setInternetBill] = useState<number>(0)
  const [showUtility, setShowUtility] = useState(false)

  // URL param sync on mount
  useEffect(() => {
    const u = searchParams.get('usage')
    const r = searchParams.get('region')
    const s = searchParams.get('season')
    if (u) setUsage(parseFloat(u) || 0)
    if (r && r in REGION_RATES) setRegion(r as Region)
    if (s && ['spring', 'summer', 'autumn', 'winter'].includes(s)) setSeason(s as Season)
  }, [searchParams])

  const updateURL = useCallback((params: Record<string, string | number>) => {
    const url = new URL(window.location.href)
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.set(key, String(value))
    })
    window.history.replaceState({}, '', url)
  }, [])

  const handleUsageChange = useCallback((val: number) => {
    setUsage(val)
    updateURL({ usage: val, region, season })
  }, [region, season, updateURL])

  const handleRegionChange = useCallback((val: Region) => {
    setRegion(val)
    updateURL({ usage, region: val, season })
  }, [usage, season, updateURL])

  const handleSeasonChange = useCallback((val: Season) => {
    setSeason(val)
    updateURL({ usage, region, season: val })
  }, [usage, region, updateURL])

  const result = useMemo(() => calcBill(usage, region, season), [usage, region, season])

  // Boiler simulation result
  const boilerEstimate = useMemo(() => {
    const dailyMJ = houseSize * BOILER_CONSUMPTION[insulation] * heatingHours
    const monthlyMJ = Math.round(dailyMJ * 30)
    return monthlyMJ
  }, [houseSize, insulation, heatingHours])

  // Monthly cost chart data
  const monthlyData = useMemo(() => {
    const rateData = REGION_RATES[region]
    return MONTHLY_USAGE_PATTERN.map((mUsage, i) => {
      const mSeason = MONTH_SEASONS[i]
      const rate = getSeasonRate(rateData, mSeason)
      const tiers = calcTiers(mUsage, rate)
      const usageCharge = tiers.reduce((sum, t) => sum + t.charge, 0)
      const sub = rateData.basicCharge + usageCharge
      const total = sub + Math.round(sub * 0.1)
      return { month: i + 1, usage: mUsage, total, season: mSeason }
    })
  }, [region])

  // Utility total
  const utilityTotal = useMemo(() => {
    const gasCost = result?.total ?? 0
    return gasCost + electricityBill + waterBill + internetBill
  }, [result, electricityBill, waterBill, internetBill])

  const handleReset = () => {
    setUsage(0)
    setRegion('seoul')
    setSeason('winter')
    const url = new URL(window.location.href)
    url.search = ''
    window.history.replaceState({}, '', url)
  }

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

  const shareLink = useCallback(() => {
    const url = new URL(window.location.href)
    url.searchParams.set('usage', String(usage))
    url.searchParams.set('region', region)
    url.searchParams.set('season', season)
    const shareUrl = url.toString()
    if (navigator.share) {
      navigator.share({ title: t('title'), url: shareUrl }).catch(() => {
        copyToClipboard(shareUrl, 'share')
      })
    } else {
      copyToClipboard(shareUrl, 'share')
    }
  }, [usage, region, season, t, copyToClipboard])

  const applyBoilerEstimate = useCallback(() => {
    setUsage(boilerEstimate)
    updateURL({ usage: boilerEstimate, region, season })
  }, [boilerEstimate, region, season, updateURL])

  const regions: Region[] = [
    'seoul', 'gyeonggi', 'incheon', 'busan', 'daegu', 'gwangju', 'daejeon',
    'ulsan', 'sejong', 'gangwon', 'chungbuk', 'chungnam', 'jeonbuk', 'jeonnam',
    'gyeongbuk', 'gyeongnam', 'jeju',
  ]

  const seasonOptions: Season[] = ['spring', 'summer', 'autumn', 'winter']

  const maxMonthly = Math.max(...monthlyData.map(d => d.total))

  const tierColors = ['bg-green-500', 'bg-blue-500', 'bg-yellow-500', 'bg-red-500']
  const tierBgColors = ['bg-green-100 dark:bg-green-900', 'bg-blue-100 dark:bg-blue-900', 'bg-yellow-100 dark:bg-yellow-900', 'bg-red-100 dark:bg-red-900']

  const seasonBarColors: Record<Season, string> = {
    spring: 'bg-green-400',
    summer: 'bg-orange-400',
    autumn: 'bg-amber-500',
    winter: 'bg-blue-500',
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('title')}</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('description')}</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Settings Panel */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <Flame className="inline-block w-4 h-4 mr-1" />
                {t('usage')}
              </label>
              <input
                type="number"
                value={usage || ''}
                onChange={(e) => handleUsageChange(parseFloat(e.target.value) || 0)}
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
                onChange={(e) => handleRegionChange(e.target.value as Region)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
              >
                {regions.map((r) => (
                  <option key={r} value={r}>{t(`regions.${r}`)}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <Thermometer className="inline-block w-4 h-4 mr-1" />
                {t('season')}
              </label>
              <div className="grid grid-cols-2 gap-2">
                {seasonOptions.map((s) => (
                  <button
                    key={s}
                    onClick={() => handleSeasonChange(s)}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      season === s
                        ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white'
                        : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    {t(`seasons.${s}`)}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleReset}
                className="flex-1 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg px-4 py-3 font-medium transition-colors"
              >
                {t('reset')}
              </button>
              <button
                onClick={shareLink}
                className="flex items-center justify-center gap-1 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg px-4 py-3 font-medium transition-colors"
                title={t('shareLink')}
              >
                {copiedId === 'share' ? <Check className="w-4 h-4" /> : <Share2 className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Boiler Simulation Toggle */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden">
            <button
              onClick={() => setShowBoilerSim(!showBoilerSim)}
              className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              <span className="flex items-center gap-2 font-medium text-gray-900 dark:text-white">
                <Home className="w-4 h-4" />
                {t('boilerSim.title')}
              </span>
              <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${showBoilerSim ? 'rotate-180' : ''}`} />
            </button>
            {showBoilerSim && (
              <div className="px-4 pb-4 space-y-3 border-t border-gray-200 dark:border-gray-700 pt-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                    {t('boilerSim.houseSize')}
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={houseSize}
                      onChange={(e) => setHouseSize(parseFloat(e.target.value) || 0)}
                      className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                    <span className="text-sm text-gray-500 dark:text-gray-400">{t('boilerSim.pyeong')}</span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                    {t('boilerSim.insulation')}
                  </label>
                  <select
                    value={insulation}
                    onChange={(e) => setInsulation(e.target.value as Insulation)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  >
                    <option value="good">{t('boilerSim.insulationGood')}</option>
                    <option value="average">{t('boilerSim.insulationAverage')}</option>
                    <option value="poor">{t('boilerSim.insulationPoor')}</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                    {t('boilerSim.heatingHours')}
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="range"
                      min={1}
                      max={24}
                      value={heatingHours}
                      onChange={(e) => setHeatingHours(parseInt(e.target.value))}
                      className="flex-1 accent-blue-600"
                    />
                    <span className="text-sm font-medium text-gray-900 dark:text-white w-16 text-right">
                      {heatingHours}{t('boilerSim.hoursPerDay')}
                    </span>
                  </div>
                </div>

                <div className="bg-blue-50 dark:bg-blue-950 rounded-lg p-3">
                  <div className="text-xs text-gray-600 dark:text-gray-400">{t('boilerSim.estimatedUsage')}</div>
                  <div className="text-xl font-bold text-gray-900 dark:text-white">{boilerEstimate.toLocaleString('ko-KR')} MJ</div>
                </div>

                <button
                  onClick={applyBoilerEstimate}
                  className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg px-4 py-2 text-sm font-medium hover:from-blue-700 hover:to-indigo-700 transition-colors"
                >
                  {t('boilerSim.apply')}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Result Panel */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
            {result ? (
              <div className="space-y-6">
                <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-700 pb-3">
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                    {t('result.title')}
                  </h2>
                  <button
                    onClick={() => {
                      const text = `${t('result.total')}: ${result.total.toLocaleString('ko-KR')}${t('result.won')} (${usage}MJ, ${t(`regions.${region}`)}, ${t(`seasons.${season}`)})`
                      copyToClipboard(text, 'result')
                    }}
                    className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
                  >
                    {copiedId === 'result' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    <span>{copiedId === 'result' ? t('copied') : t('copyResult')}</span>
                  </button>
                </div>

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

                {/* Tiered Rate Breakdown */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                    {t('tierBreakdown.title')}
                  </h3>
                  <div className="space-y-2">
                    {result.tiers.map((tier, i) => {
                      const maxCharge = Math.max(...result.tiers.map(t => t.charge))
                      const pct = maxCharge > 0 ? (tier.charge / maxCharge) * 100 : 0
                      return (
                        <div key={i} className={`${tierBgColors[i]} rounded-lg p-3`}>
                          <div className="flex items-center justify-between text-sm mb-1">
                            <span className="font-medium text-gray-900 dark:text-white">
                              {t(`tierBreakdown.${tier.label}`)} ({tier.min}~{tier.max === Infinity ? '∞' : tier.max} MJ)
                            </span>
                            <span className="text-gray-700 dark:text-gray-300">
                              {tier.usage.toLocaleString('ko-KR')} MJ × {tier.rate}{t('result.won')}/MJ
                            </span>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="flex-1 h-5 bg-white/50 dark:bg-gray-800/50 rounded-full overflow-hidden">
                              <div
                                className={`h-full ${tierColors[i]} rounded-full transition-all duration-500`}
                                style={{ width: `${Math.max(pct, 2)}%` }}
                              />
                            </div>
                            <span className="text-sm font-bold text-gray-900 dark:text-white w-24 text-right">
                              {tier.charge.toLocaleString('ko-KR')}{t('result.won')}
                            </span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Average Usage Reference */}
                <div className="bg-yellow-50 dark:bg-yellow-950 rounded-xl p-4">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">
                    {t('averageUsage.title')}
                  </h3>
                  <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                    <div>{t('averageUsage.spring')}</div>
                    <div>{t('averageUsage.summer')}</div>
                    <div>{t('averageUsage.autumn')}</div>
                    <div>{t('averageUsage.winter')}</div>
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

          {/* Monthly Cost Chart */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              {t('monthlyChart.title')}
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">{t('monthlyChart.description')}</p>
            <div className="flex items-end gap-1 sm:gap-2 h-48">
              {monthlyData.map((d) => (
                <div key={d.month} className="flex-1 flex flex-col items-center justify-end h-full">
                  <div className="text-xs text-gray-600 dark:text-gray-400 mb-1 hidden sm:block">
                    {(d.total / 10000).toFixed(1)}
                  </div>
                  <div
                    className={`w-full ${seasonBarColors[d.season]} rounded-t-sm transition-all duration-300 min-h-[4px]`}
                    style={{ height: `${(d.total / maxMonthly) * 100}%` }}
                    title={`${d.month}${t('monthlyChart.monthSuffix')}: ${d.total.toLocaleString('ko-KR')}${t('result.won')}`}
                  />
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {d.month}{t('monthlyChart.monthLabel')}
                  </div>
                </div>
              ))}
            </div>
            <div className="flex flex-wrap gap-3 mt-4 justify-center">
              {(['spring', 'summer', 'autumn', 'winter'] as Season[]).map((s) => (
                <div key={s} className="flex items-center gap-1 text-xs text-gray-600 dark:text-gray-400">
                  <div className={`w-3 h-3 rounded-sm ${seasonBarColors[s]}`} />
                  {t(`seasons.${s}`)}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Utility Consolidation */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden">
        <button
          onClick={() => setShowUtility(!showUtility)}
          className="w-full flex items-center justify-between p-6 text-left hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
        >
          <span className="flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-white">
            <Zap className="w-5 h-5" />
            {t('utility.title')}
          </span>
          <ChevronDown className={`w-5 h-5 text-gray-500 transition-transform ${showUtility ? 'rotate-180' : ''}`} />
        </button>
        {showUtility && (
          <div className="px-6 pb-6 border-t border-gray-200 dark:border-gray-700 pt-4">
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">{t('utility.description')}</p>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-orange-50 dark:bg-orange-950 rounded-xl p-4">
                <div className="flex items-center gap-1 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  <Flame className="w-4 h-4" />
                  {t('utility.gas')}
                </div>
                <div className="text-xl font-bold text-gray-900 dark:text-white">
                  {(result?.total ?? 0).toLocaleString('ko-KR')} {t('result.won')}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">{t('utility.gasAuto')}</div>
              </div>

              <div className="bg-yellow-50 dark:bg-yellow-950 rounded-xl p-4">
                <div className="flex items-center gap-1 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  <Zap className="w-4 h-4" />
                  {t('utility.electricity')}
                </div>
                <input
                  type="number"
                  value={electricityBill || ''}
                  onChange={(e) => setElectricityBill(parseFloat(e.target.value) || 0)}
                  placeholder={t('utility.enterAmount')}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div className="bg-blue-50 dark:bg-blue-950 rounded-xl p-4">
                <div className="flex items-center gap-1 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  <Droplets className="w-4 h-4" />
                  {t('utility.water')}
                </div>
                <input
                  type="number"
                  value={waterBill || ''}
                  onChange={(e) => setWaterBill(parseFloat(e.target.value) || 0)}
                  placeholder={t('utility.enterAmount')}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div className="bg-purple-50 dark:bg-purple-950 rounded-xl p-4">
                <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('utility.internet')}
                </div>
                <input
                  type="number"
                  value={internetBill || ''}
                  onChange={(e) => setInternetBill(parseFloat(e.target.value) || 0)}
                  placeholder={t('utility.enterAmount')}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="mt-4 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-xl p-5 text-white">
              <div className="text-sm opacity-90">{t('utility.totalLabel')}</div>
              <div className="text-3xl font-bold mt-1">
                {utilityTotal.toLocaleString('ko-KR')} {t('result.won')}
              </div>
              <div className="flex flex-wrap gap-3 mt-3 text-sm opacity-80">
                <span>{t('utility.gas')}: {(result?.total ?? 0).toLocaleString('ko-KR')}</span>
                {electricityBill > 0 && <span>| {t('utility.electricity')}: {electricityBill.toLocaleString('ko-KR')}</span>}
                {waterBill > 0 && <span>| {t('utility.water')}: {waterBill.toLocaleString('ko-KR')}</span>}
                {internetBill > 0 && <span>| {t('utility.internet')}: {internetBill.toLocaleString('ko-KR')}</span>}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Guide */}
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
