'use client'

import { useState, useCallback, useEffect, useMemo } from 'react'
import { useTranslations } from 'next-intl'
import { useRouter, useSearchParams } from 'next/navigation'
import { Zap, MapPin, Car, RotateCcw, Calculator, ChevronDown, ChevronUp, TrendingDown } from 'lucide-react'
import GuideSection from '@/components/GuideSection'

// ── 2026 Local subsidy data (만원) ──────────────────────────────────────────
const LOCAL_SUBSIDY: Record<string, { passenger: number; suv: number; truck: number }> = {
  seoul:     { passenger: 200,  suv: 200,  truck: 200 },
  busan:     { passenger: 400,  suv: 350,  truck: 300 },
  daegu:     { passenger: 500,  suv: 450,  truck: 350 },
  incheon:   { passenger: 400,  suv: 350,  truck: 300 },
  gwangju:   { passenger: 500,  suv: 450,  truck: 350 },
  daejeon:   { passenger: 500,  suv: 450,  truck: 350 },
  ulsan:     { passenger: 400,  suv: 350,  truck: 300 },
  sejong:    { passenger: 600,  suv: 500,  truck: 400 },
  gyeonggi:  { passenger: 400,  suv: 350,  truck: 300 },
  gangwon:   { passenger: 700,  suv: 600,  truck: 500 },
  chungbuk:  { passenger: 700,  suv: 600,  truck: 500 },
  chungnam:  { passenger: 700,  suv: 600,  truck: 500 },
  jeonbuk:   { passenger: 700,  suv: 600,  truck: 500 },
  jeonnam:   { passenger: 800,  suv: 700,  truck: 600 },
  gyeongbuk: { passenger: 700,  suv: 600,  truck: 500 },
  gyeongnam: { passenger: 600,  suv: 500,  truck: 400 },
  jeju:      { passenger: 1100, suv: 900,  truck: 700 },
}

// ── National subsidy max (만원) ──────────────────────────────────────────────
const NATIONAL_MAX: Record<VehicleType, number> = {
  passenger: 680,
  suv:       500,
  truck:     300,
  van:       300,
}

// ── Popular models ──────────────────────────────────────────────────────────
type VehicleType = 'passenger' | 'suv' | 'truck' | 'van'

interface ModelPreset {
  nameKey: string
  price: number
  range: number
  battery: number
  type: VehicleType
}

const POPULAR_MODELS: ModelPreset[] = [
  { nameKey: 'ioniq5',  price: 5200, range: 429, battery: 72.6, type: 'suv' },
  { nameKey: 'ioniq6',  price: 4695, range: 524, battery: 77.4, type: 'passenger' },
  { nameKey: 'ev6',     price: 5030, range: 475, battery: 77.4, type: 'suv' },
  { nameKey: 'ev9',     price: 7386, range: 443, battery: 99.8, type: 'suv' },
  { nameKey: 'rayEv',   price: 1970, range: 205, battery: 35.2, type: 'passenger' },
  { nameKey: 'model3',  price: 5299, range: 554, battery: 60,   type: 'passenger' },
  { nameKey: 'modelY',  price: 5699, range: 511, battery: 75,   type: 'suv' },
  { nameKey: 'gv60',    price: 6550, range: 451, battery: 77.4, type: 'suv' },
]

// ── Calculation logic ────────────────────────────────────────────────────────
interface SubsidyResult {
  nationalSubsidy: number
  localSubsidy: number
  totalSubsidy: number
  finalPrice: number
  priceGateRatio: number
  rangeScore: number
  efficiencyScore: number
  batteryScore: number
  performanceRatio: number
}

function calcEfficiency(range: number, battery: number): number {
  if (battery <= 0) return 0
  return Math.round((range / battery) * 10) / 10
}

function calcNationalSubsidy(
  vehicleType: VehicleType,
  priceMwan: number,
  range: number,
  battery: number,
): { national: number; priceGate: number; rangeScore: number; effScore: number; battScore: number; perfRatio: number } {
  const maxSubsidy = NATIONAL_MAX[vehicleType] ?? 300

  // Price gate
  let priceGate = 1.0
  if (priceMwan >= 8500) priceGate = 0
  else if (priceMwan >= 5500) priceGate = 0.5

  // Performance scores (simplified 2026 model)
  // Range score: 0~1 based on reference ranges
  const rangeRef = vehicleType === 'truck' ? 200 : vehicleType === 'van' ? 250 : 450
  const rangeScore = Math.min(range / rangeRef, 1.0)

  // Efficiency score: km/kWh vs reference
  const efficiency = calcEfficiency(range, battery)
  const effRef = vehicleType === 'truck' ? 4.5 : vehicleType === 'van' ? 4.0 : 6.0
  const effScore = Math.min(efficiency / effRef, 1.0)

  // Battery score: larger battery gets small bonus (capped at reference)
  const battRef = vehicleType === 'truck' ? 60 : vehicleType === 'van' ? 60 : 80
  const battScore = Math.min(battery / battRef, 1.0)

  // Weighted performance ratio
  const perfRatio = rangeScore * 0.4 + effScore * 0.4 + battScore * 0.2

  const national = Math.round(maxSubsidy * perfRatio * priceGate)

  return {
    national,
    priceGate,
    rangeScore: Math.round(rangeScore * 100),
    effScore: Math.round(effScore * 100),
    battScore: Math.round(battScore * 100),
    perfRatio: Math.round(perfRatio * 100),
  }
}

function calcSubsidy(
  vehicleType: VehicleType,
  priceMwan: number,
  range: number,
  battery: number,
  region: string,
): SubsidyResult {
  const { national, priceGate, rangeScore, effScore, battScore, perfRatio } = calcNationalSubsidy(
    vehicleType,
    priceMwan,
    range,
    battery,
  )

  const regionData = LOCAL_SUBSIDY[region] ?? LOCAL_SUBSIDY['seoul']
  const typeKey = vehicleType === 'van' ? 'truck' : vehicleType
  const local = regionData[typeKey as keyof typeof regionData] ?? 0

  const total = national + local
  const finalPrice = Math.max(0, priceMwan - total)

  return {
    nationalSubsidy: national,
    localSubsidy: local,
    totalSubsidy: total,
    finalPrice,
    priceGateRatio: priceGate * 100,
    rangeScore,
    efficiencyScore: effScore,
    batteryScore: battScore,
    performanceRatio: perfRatio,
  }
}

// ── Formatting helper ────────────────────────────────────────────────────────
function formatMwan(n: number): string {
  return n.toLocaleString('ko-KR') + '만원'
}

function formatNumber(val: string): string {
  const digits = val.replace(/[^0-9]/g, '')
  return digits ? Number(digits).toLocaleString('ko-KR') : ''
}

function parseFormatted(val: string): number {
  return Number(val.replace(/,/g, '')) || 0
}

// ── Component ────────────────────────────────────────────────────────────────
export default function EvSubsidyCalculator() {
  const t = useTranslations('evSubsidy')
  const router = useRouter()
  const searchParams = useSearchParams()

  const [vehicleType, setVehicleType] = useState<VehicleType>('suv')
  const [priceInput, setPriceInput] = useState('5200')
  const [rangeInput, setRangeInput] = useState('429')
  const [batteryInput, setBatteryInput] = useState('72.6')
  const [region, setRegion] = useState('gyeonggi')
  const [result, setResult] = useState<SubsidyResult | null>(null)
  const [showRegionTable, setShowRegionTable] = useState(false)
  const [showModelsTable, setShowModelsTable] = useState(false)

  // Restore from URL params
  useEffect(() => {
    const vt = searchParams.get('vt') as VehicleType | null
    const price = searchParams.get('price')
    const range = searchParams.get('range')
    const battery = searchParams.get('battery')
    const reg = searchParams.get('region')

    if (vt && ['passenger', 'suv', 'truck', 'van'].includes(vt)) setVehicleType(vt)
    if (price) setPriceInput(Number(price).toLocaleString('ko-KR'))
    if (range) setRangeInput(range)
    if (battery) setBatteryInput(battery)
    if (reg && LOCAL_SUBSIDY[reg]) setRegion(reg)
  }, [searchParams])

  const updateURL = useCallback(
    (params: { vt: VehicleType; price: string; range: string; battery: string; region: string }) => {
      const url = new URL(window.location.href)
      url.searchParams.set('vt', params.vt)
      url.searchParams.set('price', params.price.replace(/,/g, ''))
      url.searchParams.set('range', params.range)
      url.searchParams.set('battery', params.battery)
      url.searchParams.set('region', params.region)
      window.history.replaceState({}, '', url.toString())
    },
    [],
  )

  const handleCalculate = useCallback(() => {
    const price = parseFormatted(priceInput)
    const range = Number(rangeInput) || 0
    const battery = Number(batteryInput) || 0
    if (price <= 0 || range <= 0 || battery <= 0) return

    const res = calcSubsidy(vehicleType, price, range, battery, region)
    setResult(res)
    updateURL({ vt: vehicleType, price: priceInput, range: rangeInput, battery: batteryInput, region })
  }, [vehicleType, priceInput, rangeInput, batteryInput, region, updateURL])

  const handleReset = useCallback(() => {
    setVehicleType('suv')
    setPriceInput('5200')
    setRangeInput('429')
    setBatteryInput('72.6')
    setRegion('gyeonggi')
    setResult(null)
    router.replace('/ev-subsidy')
  }, [router])

  const handleModelFill = useCallback((model: ModelPreset) => {
    setVehicleType(model.type)
    setPriceInput(model.price.toLocaleString('ko-KR'))
    setRangeInput(String(model.range))
    setBatteryInput(String(model.battery))
    setResult(null)
  }, [])

  // Region comparison table
  const regionComparison = useMemo(() => {
    const price = parseFormatted(priceInput)
    const range = Number(rangeInput) || 0
    const battery = Number(batteryInput) || 0
    if (price <= 0 || range <= 0 || battery <= 0) return []

    return Object.entries(LOCAL_SUBSIDY)
      .map(([key]) => {
        const res = calcSubsidy(vehicleType, price, range, battery, key)
        return { region: key, ...res }
      })
      .sort((a, b) => b.totalSubsidy - a.totalSubsidy)
  }, [vehicleType, priceInput, rangeInput, batteryInput])

  // Models comparison table
  const modelsComparison = useMemo(() => {
    return POPULAR_MODELS.map((model) => {
      const res = calcSubsidy(model.type, model.price, model.range, model.battery, region)
      return { ...model, ...res }
    }).sort((a, b) => b.totalSubsidy - a.totalSubsidy)
  }, [region])

  const vehicleTypes: { value: VehicleType; labelKey: string }[] = [
    { value: 'passenger', labelKey: 'typePassenger' },
    { value: 'suv',       labelKey: 'typeSuv' },
    { value: 'truck',     labelKey: 'typeTruck' },
    { value: 'van',       labelKey: 'typeVan' },
  ]

  const regions: { value: string; labelKey: string }[] = [
    { value: 'seoul',     labelKey: 'regionSeoul' },
    { value: 'busan',     labelKey: 'regionBusan' },
    { value: 'daegu',     labelKey: 'regionDaegu' },
    { value: 'incheon',   labelKey: 'regionIncheon' },
    { value: 'gwangju',   labelKey: 'regionGwangju' },
    { value: 'daejeon',   labelKey: 'regionDaejeon' },
    { value: 'ulsan',     labelKey: 'regionUlsan' },
    { value: 'sejong',    labelKey: 'regionSejong' },
    { value: 'gyeonggi',  labelKey: 'regionGyeonggi' },
    { value: 'gangwon',   labelKey: 'regionGangwon' },
    { value: 'chungbuk',  labelKey: 'regionChungbuk' },
    { value: 'chungnam',  labelKey: 'regionChungnam' },
    { value: 'jeonbuk',   labelKey: 'regionJeonbuk' },
    { value: 'jeonnam',   labelKey: 'regionJeonnam' },
    { value: 'gyeongbuk', labelKey: 'regionGyeongbuk' },
    { value: 'gyeongnam', labelKey: 'regionGyeongnam' },
    { value: 'jeju',      labelKey: 'regionJeju' },
  ]

  const inputClass =
    'w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition'

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center">
        <div className="flex items-center justify-center gap-3 mb-2">
          <div className="p-2 bg-green-100 dark:bg-green-900 rounded-xl">
            <Zap className="w-6 h-6 text-green-600 dark:text-green-400" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
            {t('title')}
          </h1>
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400">{t('description')}</p>
      </div>

      {/* Main grid */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left: Inputs */}
        <div className="lg:col-span-1 space-y-5">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 space-y-5">
            <h2 className="text-base font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <Car className="w-4 h-4 text-green-500" />
              {t('vehicleInfo')}
            </h2>

            {/* Vehicle type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('vehicleType')}
              </label>
              <div className="grid grid-cols-2 gap-2">
                {vehicleTypes.map((vt) => (
                  <button
                    key={vt.value}
                    onClick={() => { setVehicleType(vt.value); setResult(null) }}
                    className={`py-2 px-3 rounded-lg text-sm font-medium transition border ${
                      vehicleType === vt.value
                        ? 'bg-green-600 border-green-600 text-white'
                        : 'bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:border-green-400'
                    }`}
                  >
                    {t(vt.labelKey)}
                  </button>
                ))}
              </div>
            </div>

            {/* Price */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('vehiclePrice')}
              </label>
              <div className="relative">
                <input
                  type="text"
                  inputMode="numeric"
                  value={priceInput}
                  onChange={(e) => setPriceInput(formatNumber(e.target.value))}
                  className={inputClass}
                  placeholder="5,200"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
                  {t('unitMwan')}
                </span>
              </div>
              <div className="mt-1.5 flex gap-2">
                {[
                  { label: t('priceUnder55'), note: t('gateFullLabel') },
                  { label: t('price5585'),    note: t('gate50Label') },
                  { label: t('priceOver85'),  note: t('gate0Label') },
                ].map((tier, i) => (
                  <span
                    key={i}
                    className={`text-xs px-2 py-0.5 rounded-full ${
                      i === 0
                        ? 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300'
                        : i === 1
                        ? 'bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-300'
                        : 'bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300'
                    }`}
                  >
                    {tier.label} {tier.note}
                  </span>
                ))}
              </div>
            </div>

            {/* Range */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('drivingRange')}
              </label>
              <div className="relative">
                <input
                  type="number"
                  value={rangeInput}
                  onChange={(e) => { setRangeInput(e.target.value); setResult(null) }}
                  className={inputClass}
                  placeholder="429"
                  min={0}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
                  km
                </span>
              </div>
            </div>

            {/* Battery */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('batteryCapacity')}
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="0.1"
                  value={batteryInput}
                  onChange={(e) => { setBatteryInput(e.target.value); setResult(null) }}
                  className={inputClass}
                  placeholder="72.6"
                  min={0}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
                  kWh
                </span>
              </div>
            </div>

            {/* Region */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5" />
                {t('region')}
              </label>
              <select
                value={region}
                onChange={(e) => { setRegion(e.target.value); setResult(null) }}
                className={inputClass}
              >
                {regions.map((r) => (
                  <option key={r.value} value={r.value}>
                    {t(r.labelKey)}
                  </option>
                ))}
              </select>
            </div>

            {/* Buttons */}
            <div className="flex gap-3 pt-1">
              <button
                onClick={handleCalculate}
                className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg px-4 py-3 font-medium hover:from-green-700 hover:to-emerald-700 transition flex items-center justify-center gap-2"
              >
                <Calculator className="w-4 h-4" />
                {t('calculate')}
              </button>
              <button
                onClick={handleReset}
                className="bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg px-3 py-3 transition"
                title={t('reset')}
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Popular models quick-fill */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
            <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-3">
              {t('popularModels')}
            </h2>
            <div className="grid grid-cols-2 gap-2">
              {POPULAR_MODELS.map((model) => (
                <button
                  key={model.nameKey}
                  onClick={() => handleModelFill(model)}
                  className="text-left px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 hover:border-green-400 dark:hover:border-green-500 hover:bg-green-50 dark:hover:bg-green-950 transition"
                >
                  <div className="text-xs font-medium text-gray-800 dark:text-gray-200 truncate">
                    {t(`model_${model.nameKey}`)}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    {model.price.toLocaleString()}만 · {model.range}km
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Results */}
        <div className="lg:col-span-2 space-y-5">
          {result ? (
            <>
              {/* Summary card */}
              <div className="bg-gradient-to-br from-green-600 to-emerald-700 rounded-xl shadow-lg p-6 text-white">
                <h2 className="text-base font-medium opacity-90 mb-4">{t('subsidySummary')}</h2>
                <div className="grid grid-cols-3 gap-4 mb-6">
                  <div className="text-center">
                    <div className="text-xs opacity-75 mb-1">{t('nationalSubsidy')}</div>
                    <div className="text-xl font-bold">{formatMwan(result.nationalSubsidy)}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xs opacity-75 mb-1">{t('localSubsidy')}</div>
                    <div className="text-xl font-bold">{formatMwan(result.localSubsidy)}</div>
                  </div>
                  <div className="text-center bg-white bg-opacity-20 rounded-xl p-2">
                    <div className="text-xs opacity-90 mb-1 font-medium">{t('totalSubsidy')}</div>
                    <div className="text-2xl font-extrabold">{formatMwan(result.totalSubsidy)}</div>
                  </div>
                </div>
                <div className="border-t border-white border-opacity-30 pt-4 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <TrendingDown className="w-4 h-4 opacity-80" />
                    <span className="text-sm opacity-90">{t('finalPrice')}</span>
                  </div>
                  <div className="text-2xl font-extrabold">
                    {formatMwan(result.finalPrice)}
                  </div>
                </div>
              </div>

              {/* Performance breakdown */}
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
                <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-4">
                  {t('performanceBreakdown')}
                </h2>

                {/* Price gate */}
                <div className="mb-4 p-3 rounded-lg bg-gray-50 dark:bg-gray-700 flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-300">{t('priceGate')}</span>
                  <span
                    className={`font-semibold text-sm px-3 py-1 rounded-full ${
                      result.priceGateRatio === 100
                        ? 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300'
                        : result.priceGateRatio === 50
                        ? 'bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-300'
                        : 'bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300'
                    }`}
                  >
                    {result.priceGateRatio}%
                  </span>
                </div>

                {/* Score bars */}
                {[
                  { labelKey: 'rangeScore',      value: result.rangeScore,       color: 'bg-blue-500' },
                  { labelKey: 'efficiencyScore',  value: result.efficiencyScore,  color: 'bg-purple-500' },
                  { labelKey: 'batteryScore',     value: result.batteryScore,     color: 'bg-orange-500' },
                ].map((item) => (
                  <div key={item.labelKey} className="mb-3">
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-600 dark:text-gray-300">{t(item.labelKey)}</span>
                      <span className="font-medium text-gray-800 dark:text-gray-200">{item.value}점</span>
                    </div>
                    <div className="h-2 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${item.color} rounded-full transition-all duration-700`}
                        style={{ width: `${item.value}%` }}
                      />
                    </div>
                  </div>
                ))}

                <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-600 flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {t('overallPerformance')}
                  </span>
                  <span className="text-base font-bold text-green-600 dark:text-green-400">
                    {result.performanceRatio}%
                  </span>
                </div>
              </div>
            </>
          ) : (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-10 flex flex-col items-center justify-center text-center min-h-48">
              <Zap className="w-12 h-12 text-gray-300 dark:text-gray-600 mb-3" />
              <p className="text-gray-400 dark:text-gray-500 text-sm">{t('resultPlaceholder')}</p>
            </div>
          )}

          {/* Region comparison table */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden">
            <button
              onClick={() => setShowRegionTable((v) => !v)}
              className="w-full flex items-center justify-between p-5 text-left hover:bg-gray-50 dark:hover:bg-gray-750 transition"
            >
              <h2 className="text-base font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <MapPin className="w-4 h-4 text-green-500" />
                {t('regionComparisonTitle')}
              </h2>
              {showRegionTable ? (
                <ChevronUp className="w-4 h-4 text-gray-400" />
              ) : (
                <ChevronDown className="w-4 h-4 text-gray-400" />
              )}
            </button>
            {showRegionTable && regionComparison.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th className="px-4 py-2.5 text-left text-gray-500 dark:text-gray-400 font-medium">{t('region')}</th>
                      <th className="px-4 py-2.5 text-right text-gray-500 dark:text-gray-400 font-medium">{t('nationalSubsidy')}</th>
                      <th className="px-4 py-2.5 text-right text-gray-500 dark:text-gray-400 font-medium">{t('localSubsidy')}</th>
                      <th className="px-4 py-2.5 text-right text-gray-500 dark:text-gray-400 font-medium">{t('totalSubsidy')}</th>
                      <th className="px-4 py-2.5 text-right text-gray-500 dark:text-gray-400 font-medium">{t('finalPrice')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                    {regionComparison.map((row, idx) => (
                      <tr
                        key={row.region}
                        className={`transition ${
                          row.region === region
                            ? 'bg-green-50 dark:bg-green-950'
                            : idx % 2 === 0
                            ? 'bg-white dark:bg-gray-800'
                            : 'bg-gray-50 dark:bg-gray-750'
                        }`}
                      >
                        <td className="px-4 py-2.5 text-gray-800 dark:text-gray-200 font-medium">
                          {idx === 0 && <span className="mr-1 text-yellow-500">1</span>}
                          {t(`region${row.region.charAt(0).toUpperCase() + row.region.slice(1)}`)}
                          {row.region === region && (
                            <span className="ml-1.5 text-xs text-green-600 dark:text-green-400 font-normal">
                              ({t('selected')})
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-2.5 text-right text-gray-700 dark:text-gray-300">
                          {row.nationalSubsidy.toLocaleString()}만
                        </td>
                        <td className="px-4 py-2.5 text-right text-gray-700 dark:text-gray-300">
                          {row.localSubsidy.toLocaleString()}만
                        </td>
                        <td className="px-4 py-2.5 text-right font-semibold text-green-600 dark:text-green-400">
                          {row.totalSubsidy.toLocaleString()}만
                        </td>
                        <td className="px-4 py-2.5 text-right text-gray-700 dark:text-gray-300">
                          {row.finalPrice.toLocaleString()}만
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {showRegionTable && regionComparison.length === 0 && (
              <p className="p-5 text-sm text-gray-400 dark:text-gray-500 text-center">{t('enterInfoFirst')}</p>
            )}
          </div>

          {/* Popular models comparison */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden">
            <button
              onClick={() => setShowModelsTable((v) => !v)}
              className="w-full flex items-center justify-between p-5 text-left hover:bg-gray-50 dark:hover:bg-gray-750 transition"
            >
              <h2 className="text-base font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <Car className="w-4 h-4 text-green-500" />
                {t('modelsComparisonTitle')}
                <span className="text-xs font-normal text-gray-400">({t('regionLabel')}: {t(`region${region.charAt(0).toUpperCase() + region.slice(1)}`)})</span>
              </h2>
              {showModelsTable ? (
                <ChevronUp className="w-4 h-4 text-gray-400" />
              ) : (
                <ChevronDown className="w-4 h-4 text-gray-400" />
              )}
            </button>
            {showModelsTable && (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th className="px-4 py-2.5 text-left text-gray-500 dark:text-gray-400 font-medium">{t('model')}</th>
                      <th className="px-4 py-2.5 text-right text-gray-500 dark:text-gray-400 font-medium">{t('price')}</th>
                      <th className="px-4 py-2.5 text-right text-gray-500 dark:text-gray-400 font-medium">{t('totalSubsidy')}</th>
                      <th className="px-4 py-2.5 text-right text-gray-500 dark:text-gray-400 font-medium">{t('finalPrice')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                    {modelsComparison.map((row, idx) => (
                      <tr
                        key={row.nameKey}
                        className={idx % 2 === 0 ? 'bg-white dark:bg-gray-800' : 'bg-gray-50 dark:bg-gray-750'}
                      >
                        <td className="px-4 py-2.5">
                          <div className="text-gray-800 dark:text-gray-200 font-medium">
                            {t(`model_${row.nameKey}`)}
                          </div>
                          <div className="text-xs text-gray-400">
                            {t(row.type === 'passenger' ? 'typePassenger' : row.type === 'suv' ? 'typeSuv' : 'typeTruck')} · {row.range}km · {row.battery}kWh
                          </div>
                        </td>
                        <td className="px-4 py-2.5 text-right text-gray-700 dark:text-gray-300">
                          {row.price.toLocaleString()}만
                        </td>
                        <td className="px-4 py-2.5 text-right font-semibold text-green-600 dark:text-green-400">
                          {row.totalSubsidy.toLocaleString()}만
                        </td>
                        <td className="px-4 py-2.5 text-right text-gray-700 dark:text-gray-300">
                          {row.finalPrice.toLocaleString()}만
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Guide */}
      <GuideSection namespace="evSubsidy" />
    </div>
  )
}
