'use client'

import { useState, useMemo, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { Truck, Home, MapPin, Building2, Wrench, Calendar, Calculator, BookOpen, CheckSquare, Square, RotateCcw, Copy, Check } from 'lucide-react'

// ── Types ──
type MovingType = 'regular' | 'full' | 'semi'
type DistanceType = 'inCity' | 'nearBy' | 'longRange' | 'veryLong' | 'custom'
type SizeUnit = 'pyeong' | 'sqm'

interface FloorInfo {
  floor: number
  hasElevator: boolean
}

interface ExtraServices {
  acUnits: number
  pianoType: 'none' | 'upright' | 'grand'
  largeAppliances: number
  organizationService: boolean
  cleaningService: boolean
  storageDays: number
}

// ── Constants ──
const SIZE_PRESETS = [
  { label: 'oneRoom', pyeong: 6 },
  { label: 'twoRoom', pyeong: 10 },
  { label: 'twenty', pyeong: 20 },
  { label: 'thirty', pyeong: 30 },
  { label: 'forty', pyeong: 40 },
  { label: 'fiftyPlus', pyeong: 50 },
]

// Base cost ranges for full-service moving (포장이사), in 만원
const BASE_COST_TABLE: { maxPyeong: number; minCost: number; maxCost: number }[] = [
  { maxPyeong: 6, minCost: 30, maxCost: 50 },
  { maxPyeong: 10, minCost: 50, maxCost: 80 },
  { maxPyeong: 20, minCost: 80, maxCost: 120 },
  { maxPyeong: 30, minCost: 120, maxCost: 180 },
  { maxPyeong: 40, minCost: 180, maxCost: 250 },
  { maxPyeong: 999, minCost: 250, maxCost: 350 },
]

const DISTANCE_SURCHARGE: Record<Exclude<DistanceType, 'custom'>, { min: number; max: number }> = {
  inCity: { min: 0, max: 0 },
  nearBy: { min: 10, max: 20 },
  longRange: { min: 20, max: 40 },
  veryLong: { min: 40, max: 80 },
}

const MOVING_TYPE_MULTIPLIER: Record<MovingType, { min: number; max: number }> = {
  full: { min: 1.0, max: 1.0 },
  semi: { min: 0.7, max: 0.8 },
  regular: { min: 0.5, max: 0.6 },
}

// 손없는 날 (auspicious moving days) - days without evil spirits
// Based on traditional Korean lunar calendar patterns
function getAuspiciousDays(year: number, month: number): number[] {
  const days: number[] = []
  const daysInMonth = new Date(year, month, 0).getDate()
  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(year, month - 1, d)
    const dayOfMonth = date.getDate()
    // Traditional pattern: 음력 기준이지만 양력으로 근사 적용
    // 손없는 날은 음력 매월 1,2,11,12,21,22일
    // For simplicity, apply to solar calendar as approximate indicator
    if ([1, 2, 11, 12, 21, 22].includes(dayOfMonth)) {
      days.push(d)
    }
  }
  return days
}

function isPeakSeason(month: number): boolean {
  return month === 3 || month === 9
}

function isWeekend(date: Date): boolean {
  const day = date.getDay()
  return day === 0 || day === 6
}

function formatWon(amount: number): string {
  if (amount >= 10000) {
    const man = Math.floor(amount / 10000)
    const remainder = amount % 10000
    if (remainder === 0) return `${man.toLocaleString('ko-KR')}만`
    return `${man.toLocaleString('ko-KR')}만 ${remainder.toLocaleString('ko-KR')}`
  }
  return amount.toLocaleString('ko-KR')
}

export default function MovingCost() {
  const t = useTranslations('movingCost')
  const [copiedId, setCopiedId] = useState<string | null>(null)

  // ── State ──
  const [sizeUnit, setSizeUnit] = useState<SizeUnit>('pyeong')
  const [sizeValue, setSizeValue] = useState<string>('20')
  const [movingType, setMovingType] = useState<MovingType>('full')
  const [distanceType, setDistanceType] = useState<DistanceType>('inCity')
  const [customKm, setCustomKm] = useState<string>('50')
  const [currentFloor, setCurrentFloor] = useState<FloorInfo>({ floor: 3, hasElevator: true })
  const [newFloor, setNewFloor] = useState<FloorInfo>({ floor: 5, hasElevator: true })
  const [needLadderTruck, setNeedLadderTruck] = useState(false)
  const [extras, setExtras] = useState<ExtraServices>({
    acUnits: 0,
    pianoType: 'none',
    largeAppliances: 0,
    organizationService: false,
    cleaningService: false,
    storageDays: 0,
  })
  const [movingDate, setMovingDate] = useState<string>('')
  const [showChecklist, setShowChecklist] = useState(false)
  const [checkedItems, setCheckedItems] = useState<Set<number>>(new Set())

  // ── Derived ──
  const pyeongValue = useMemo(() => {
    const val = parseFloat(sizeValue) || 0
    return sizeUnit === 'pyeong' ? val : val / 3.3058
  }, [sizeValue, sizeUnit])

  const effectiveDistanceType = useMemo((): Exclude<DistanceType, 'custom'> => {
    if (distanceType !== 'custom') return distanceType
    const km = parseFloat(customKm) || 0
    if (km < 20) return 'inCity'
    if (km < 100) return 'nearBy'
    if (km < 300) return 'longRange'
    return 'veryLong'
  }, [distanceType, customKm])

  const dateInfo = useMemo(() => {
    if (!movingDate) return null
    const date = new Date(movingDate)
    const month = date.getMonth() + 1
    const peak = isPeakSeason(month)
    const weekend = isWeekend(date)
    const auspiciousDays = getAuspiciousDays(date.getFullYear(), month)
    const isAuspicious = auspiciousDays.includes(date.getDate())
    return { date, month, peak, weekend, isAuspicious, auspiciousDays }
  }, [movingDate])

  // ── Cost Calculation ──
  const costBreakdown = useMemo(() => {
    if (pyeongValue <= 0) return null

    // 1. Base cost (full-service basis)
    let baseCostMin = 0
    let baseCostMax = 0
    for (const tier of BASE_COST_TABLE) {
      if (pyeongValue <= tier.maxPyeong) {
        baseCostMin = tier.minCost
        baseCostMax = tier.maxCost
        break
      }
    }
    // Interpolation for sizes between tiers
    if (pyeongValue > 50) {
      const extraPyeong = pyeongValue - 50
      baseCostMin += Math.round(extraPyeong * 3)
      baseCostMax += Math.round(extraPyeong * 5)
    }

    // 2. Apply moving type multiplier
    const typeMultMin = MOVING_TYPE_MULTIPLIER[movingType].min
    const typeMultMax = MOVING_TYPE_MULTIPLIER[movingType].max
    const adjustedBaseMin = Math.round(baseCostMin * typeMultMin)
    const adjustedBaseMax = Math.round(baseCostMax * typeMultMax)

    // 3. Distance surcharge
    const distSurcharge = DISTANCE_SURCHARGE[effectiveDistanceType]

    // 4. Floor surcharge (per floor above 2F without elevator)
    let floorSurchargeMin = 0
    let floorSurchargeMax = 0
    if (!currentFloor.hasElevator && currentFloor.floor > 2) {
      const extraFloors = currentFloor.floor - 2
      floorSurchargeMin += extraFloors * 1
      floorSurchargeMax += extraFloors * 2
    }
    if (!newFloor.hasElevator && newFloor.floor > 2) {
      const extraFloors = newFloor.floor - 2
      floorSurchargeMin += extraFloors * 1
      floorSurchargeMax += extraFloors * 2
    }

    // 5. Ladder truck
    const ladderMin = needLadderTruck ? 10 : 0
    const ladderMax = needLadderTruck ? 20 : 0

    // 6. AC
    const acMin = extras.acUnits * 10
    const acMax = extras.acUnits * 15

    // 7. Piano
    let pianoMin = 0
    let pianoMax = 0
    if (extras.pianoType === 'upright') {
      pianoMin = 10
      pianoMax = 20
    } else if (extras.pianoType === 'grand') {
      pianoMin = 20
      pianoMax = 40
    }

    // 8. Large appliances
    const applianceMin = extras.largeAppliances * 3
    const applianceMax = extras.largeAppliances * 5

    // 9. Organization service
    const orgMin = extras.organizationService ? 10 : 0
    const orgMax = extras.organizationService ? 20 : 0

    // 10. Cleaning service
    const cleanMin = extras.cleaningService ? 5 : 0
    const cleanMax = extras.cleaningService ? 15 : 0

    // 11. Storage
    const storageMin = extras.storageDays > 0 ? Math.max(10, extras.storageDays * 1) : 0
    const storageMax = extras.storageDays > 0 ? Math.max(20, extras.storageDays * 2) : 0

    // Other services combined
    const otherServicesMin = pianoMin + applianceMin + orgMin + cleanMin + storageMin
    const otherServicesMax = pianoMax + applianceMax + orgMax + cleanMax + storageMax

    // Subtotal before season/weekend
    const subtotalMin = adjustedBaseMin + distSurcharge.min + floorSurchargeMin + ladderMin + acMin + otherServicesMin
    const subtotalMax = adjustedBaseMax + distSurcharge.max + floorSurchargeMax + ladderMax + acMax + otherServicesMax

    // 12. Peak season surcharge
    let peakSurchargeMin = 0
    let peakSurchargeMax = 0
    if (dateInfo?.peak) {
      peakSurchargeMin = Math.round(subtotalMin * 0.2)
      peakSurchargeMax = Math.round(subtotalMax * 0.3)
    }

    // 13. Weekend surcharge
    let weekendSurchargeMin = 0
    let weekendSurchargeMax = 0
    if (dateInfo?.weekend) {
      weekendSurchargeMin = Math.round(subtotalMin * 0.1)
      weekendSurchargeMax = Math.round(subtotalMax * 0.2)
    }

    const totalMin = subtotalMin + peakSurchargeMin + weekendSurchargeMin
    const totalMax = subtotalMax + peakSurchargeMax + weekendSurchargeMax

    return {
      base: { min: adjustedBaseMin, max: adjustedBaseMax },
      distance: distSurcharge,
      floor: { min: floorSurchargeMin, max: floorSurchargeMax },
      ladder: { min: ladderMin, max: ladderMax },
      ac: { min: acMin, max: acMax },
      otherServices: { min: otherServicesMin, max: otherServicesMax },
      peakSeason: { min: peakSurchargeMin, max: peakSurchargeMax },
      weekend: { min: weekendSurchargeMin, max: weekendSurchargeMax },
      total: { min: totalMin, max: totalMax },
    }
  }, [pyeongValue, movingType, effectiveDistanceType, currentFloor, newFloor, needLadderTruck, extras, dateInfo])

  // ── Handlers ──
  const handleSizePreset = (pyeong: number) => {
    setSizeUnit('pyeong')
    setSizeValue(String(pyeong))
  }

  const handleReset = () => {
    setSizeUnit('pyeong')
    setSizeValue('20')
    setMovingType('full')
    setDistanceType('inCity')
    setCustomKm('50')
    setCurrentFloor({ floor: 3, hasElevator: true })
    setNewFloor({ floor: 5, hasElevator: true })
    setNeedLadderTruck(false)
    setExtras({
      acUnits: 0,
      pianoType: 'none',
      largeAppliances: 0,
      organizationService: false,
      cleaningService: false,
      storageDays: 0,
    })
    setMovingDate('')
    setCheckedItems(new Set())
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

  const toggleChecklistItem = (index: number) => {
    setCheckedItems(prev => {
      const next = new Set(prev)
      if (next.has(index)) {
        next.delete(index)
      } else {
        next.add(index)
      }
      return next
    })
  }

  const checklistItems = t.raw('checklist.items') as string[]

  const costSummaryText = useMemo(() => {
    if (!costBreakdown) return ''
    const lines = [
      `${t('result.title')}`,
      `${t('sizeLabel')}: ${sizeValue}${sizeUnit === 'pyeong' ? t('pyeong') : t('sqm')}`,
      `${t('movingTypeLabel')}: ${t(`movingTypes.${movingType}`)}`,
      `${t('result.base')}: ${formatWon(costBreakdown.base.min)}~${formatWon(costBreakdown.base.max)}${t('manwon')}`,
      `${t('result.total')}: ${formatWon(costBreakdown.total.min)}~${formatWon(costBreakdown.total.max)}${t('manwon')}`,
    ]
    return lines.join('\n')
  }, [costBreakdown, sizeValue, sizeUnit, movingType, t])

  // ── Render Helpers ──
  const renderCostRow = (label: string, min: number, max: number, highlight?: boolean) => {
    if (min === 0 && max === 0) return null
    return (
      <div className={`flex justify-between items-center py-2 ${highlight ? 'font-bold text-lg' : 'text-sm'}`}>
        <span className={highlight ? 'text-gray-900 dark:text-white' : 'text-gray-600 dark:text-gray-400'}>
          {label}
        </span>
        <span className={highlight ? 'text-blue-600 dark:text-blue-400' : 'text-gray-900 dark:text-white'}>
          {formatWon(min)}~{formatWon(max)}{t('manwon')}
        </span>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <Truck className="w-7 h-7" />
          {t('title')}
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('description')}</p>
      </div>

      {/* Main Grid */}
      <div className="grid lg:grid-cols-3 gap-8">
        {/* Left: Input Panel */}
        <div className="lg:col-span-2 space-y-6">

          {/* 1. Home Size */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 space-y-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <Home className="w-5 h-5" />
              {t('sizeLabel')}
            </h2>

            {/* Quick select buttons */}
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              {SIZE_PRESETS.map((preset) => (
                <button
                  key={preset.pyeong}
                  onClick={() => handleSizePreset(preset.pyeong)}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    sizeUnit === 'pyeong' && sizeValue === String(preset.pyeong)
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300'
                  }`}
                >
                  {t(`sizePresets.${preset.label}`)}
                </button>
              ))}
            </div>

            {/* Custom input */}
            <div className="flex gap-3 items-end">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('customSize')}
                </label>
                <input
                  type="number"
                  value={sizeValue}
                  onChange={(e) => setSizeValue(e.target.value)}
                  min="1"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex gap-1">
                <button
                  onClick={() => setSizeUnit('pyeong')}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    sizeUnit === 'pyeong'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                  }`}
                >
                  {t('pyeong')}
                </button>
                <button
                  onClick={() => setSizeUnit('sqm')}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    sizeUnit === 'sqm'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                  }`}
                >
                  {t('sqm')}
                </button>
              </div>
            </div>
            {sizeUnit === 'sqm' && pyeongValue > 0 && (
              <p className="text-xs text-gray-500 dark:text-gray-400">
                = {pyeongValue.toFixed(1)}{t('pyeong')}
              </p>
            )}
          </div>

          {/* 2. Moving Type */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 space-y-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <Truck className="w-5 h-5" />
              {t('movingTypeLabel')}
            </h2>
            <div className="grid sm:grid-cols-3 gap-3">
              {(['full', 'semi', 'regular'] as MovingType[]).map((type) => (
                <button
                  key={type}
                  onClick={() => setMovingType(type)}
                  className={`p-4 rounded-xl border-2 text-left transition-colors ${
                    movingType === type
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-950'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                  }`}
                >
                  <div className={`font-semibold text-sm ${movingType === type ? 'text-blue-700 dark:text-blue-300' : 'text-gray-900 dark:text-white'}`}>
                    {t(`movingTypes.${type}`)}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {t(`movingTypeDesc.${type}`)}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* 3. Distance */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 space-y-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <MapPin className="w-5 h-5" />
              {t('distanceLabel')}
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {(['inCity', 'nearBy', 'longRange', 'veryLong', 'custom'] as DistanceType[]).map((type) => (
                <button
                  key={type}
                  onClick={() => setDistanceType(type)}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    distanceType === type
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300'
                  }`}
                >
                  {t(`distances.${type}`)}
                </button>
              ))}
            </div>
            {distanceType === 'custom' && (
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={customKm}
                  onChange={(e) => setCustomKm(e.target.value)}
                  min="0"
                  className="w-32 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-500 dark:text-gray-400">km</span>
              </div>
            )}
          </div>

          {/* 4. Floor Info */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 space-y-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <Building2 className="w-5 h-5" />
              {t('floorLabel')}
            </h2>
            <div className="grid sm:grid-cols-2 gap-6">
              {/* Current Floor */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">{t('currentFloor')}</h3>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={currentFloor.floor}
                    onChange={(e) => setCurrentFloor(prev => ({ ...prev, floor: parseInt(e.target.value) || 1 }))}
                    min="1"
                    max="50"
                    className="w-20 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-500 dark:text-gray-400">{t('floor')}</span>
                </div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={currentFloor.hasElevator}
                    onChange={(e) => setCurrentFloor(prev => ({ ...prev, hasElevator: e.target.checked }))}
                    className="accent-blue-600 w-4 h-4"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">{t('hasElevator')}</span>
                </label>
              </div>
              {/* New Floor */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">{t('newFloor')}</h3>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={newFloor.floor}
                    onChange={(e) => setNewFloor(prev => ({ ...prev, floor: parseInt(e.target.value) || 1 }))}
                    min="1"
                    max="50"
                    className="w-20 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-500 dark:text-gray-400">{t('floor')}</span>
                </div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newFloor.hasElevator}
                    onChange={(e) => setNewFloor(prev => ({ ...prev, hasElevator: e.target.checked }))}
                    className="accent-blue-600 w-4 h-4"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">{t('hasElevator')}</span>
                </label>
              </div>
            </div>
            {/* Ladder Truck */}
            <label className="flex items-center gap-2 cursor-pointer pt-2 border-t border-gray-200 dark:border-gray-700">
              <input
                type="checkbox"
                checked={needLadderTruck}
                onChange={(e) => setNeedLadderTruck(e.target.checked)}
                className="accent-blue-600 w-4 h-4"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">{t('ladderTruck')}</span>
            </label>
          </div>

          {/* 5. Extra Services */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 space-y-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <Wrench className="w-5 h-5" />
              {t('extrasLabel')}
            </h2>
            <div className="grid sm:grid-cols-2 gap-4">
              {/* AC Units */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('extras.acUnits')}
                </label>
                <input
                  type="number"
                  value={extras.acUnits}
                  onChange={(e) => setExtras(prev => ({ ...prev, acUnits: Math.max(0, parseInt(e.target.value) || 0) }))}
                  min="0"
                  max="10"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                />
              </div>
              {/* Piano */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('extras.piano')}
                </label>
                <select
                  value={extras.pianoType}
                  onChange={(e) => setExtras(prev => ({ ...prev, pianoType: e.target.value as 'none' | 'upright' | 'grand' }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                >
                  <option value="none">{t('extras.pianoNone')}</option>
                  <option value="upright">{t('extras.pianoUpright')}</option>
                  <option value="grand">{t('extras.pianoGrand')}</option>
                </select>
              </div>
              {/* Large Appliances */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('extras.largeAppliances')}
                </label>
                <input
                  type="number"
                  value={extras.largeAppliances}
                  onChange={(e) => setExtras(prev => ({ ...prev, largeAppliances: Math.max(0, parseInt(e.target.value) || 0) }))}
                  min="0"
                  max="20"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                />
              </div>
              {/* Storage Days */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('extras.storageDays')}
                </label>
                <input
                  type="number"
                  value={extras.storageDays}
                  onChange={(e) => setExtras(prev => ({ ...prev, storageDays: Math.max(0, parseInt(e.target.value) || 0) }))}
                  min="0"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            {/* Toggle services */}
            <div className="space-y-2 pt-2 border-t border-gray-200 dark:border-gray-700">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={extras.organizationService}
                  onChange={(e) => setExtras(prev => ({ ...prev, organizationService: e.target.checked }))}
                  className="accent-blue-600 w-4 h-4"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">{t('extras.organization')}</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={extras.cleaningService}
                  onChange={(e) => setExtras(prev => ({ ...prev, cleaningService: e.target.checked }))}
                  className="accent-blue-600 w-4 h-4"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">{t('extras.cleaning')}</span>
              </label>
            </div>
          </div>

          {/* 6. Moving Date */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 space-y-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              {t('dateLabel')}
            </h2>
            <input
              type="date"
              value={movingDate}
              onChange={(e) => setMovingDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
            />
            {dateInfo && (
              <div className="flex flex-wrap gap-2">
                {dateInfo.peak && (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200">
                    {t('peakSeason')}
                  </span>
                )}
                {dateInfo.weekend && (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-200">
                    {t('weekend')}
                  </span>
                )}
                {dateInfo.isAuspicious && (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200">
                    {t('auspiciousDay')}
                  </span>
                )}
                {!dateInfo.peak && !dateInfo.weekend && (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200">
                    {t('normalDay')}
                  </span>
                )}
              </div>
            )}
            {dateInfo && (
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {dateInfo.peak && t('peakSeasonNote')}
                {dateInfo.weekend && !dateInfo.peak && t('weekendNote')}
              </p>
            )}
          </div>

          {/* Reset */}
          <div className="flex justify-end">
            <button
              onClick={handleReset}
              className="flex items-center gap-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg px-4 py-2 font-medium transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              {t('reset')}
            </button>
          </div>
        </div>

        {/* Right: Result Panel */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 sticky top-24">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2 mb-4">
              <Calculator className="w-5 h-5" />
              {t('result.title')}
            </h2>

            {costBreakdown ? (
              <div className="space-y-3">
                {/* Summary badge */}
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950 rounded-xl p-4 border-2 border-blue-200 dark:border-blue-800">
                  <div className="text-xs font-medium text-blue-700 dark:text-blue-300 mb-1">
                    {t('result.estimatedTotal')}
                  </div>
                  <div className="text-xl font-bold text-blue-900 dark:text-blue-100">
                    {formatWon(costBreakdown.total.min)}~{formatWon(costBreakdown.total.max)}{t('manwon')}
                  </div>
                  <div className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                    ({(costBreakdown.total.min * 10000).toLocaleString('ko-KR')}~{(costBreakdown.total.max * 10000).toLocaleString('ko-KR')}{t('won')})
                  </div>
                </div>

                {/* Breakdown */}
                <div className="divide-y divide-gray-100 dark:divide-gray-700">
                  {renderCostRow(t('result.base'), costBreakdown.base.min, costBreakdown.base.max)}
                  {renderCostRow(t('result.distance'), costBreakdown.distance.min, costBreakdown.distance.max)}
                  {renderCostRow(t('result.floor'), costBreakdown.floor.min, costBreakdown.floor.max)}
                  {renderCostRow(t('result.ladder'), costBreakdown.ladder.min, costBreakdown.ladder.max)}
                  {renderCostRow(t('result.ac'), costBreakdown.ac.min, costBreakdown.ac.max)}
                  {renderCostRow(t('result.otherServices'), costBreakdown.otherServices.min, costBreakdown.otherServices.max)}
                  {renderCostRow(t('result.peakSeason'), costBreakdown.peakSeason.min, costBreakdown.peakSeason.max)}
                  {renderCostRow(t('result.weekend'), costBreakdown.weekend.min, costBreakdown.weekend.max)}
                </div>

                <div className="pt-3 border-t-2 border-gray-200 dark:border-gray-600">
                  {renderCostRow(t('result.total'), costBreakdown.total.min, costBreakdown.total.max, true)}
                </div>

                {/* Copy button */}
                <button
                  onClick={() => copyToClipboard(costSummaryText, 'summary')}
                  className="w-full flex items-center justify-center gap-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg px-4 py-2 text-sm font-medium transition-colors mt-2"
                >
                  {copiedId === 'summary' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  {copiedId === 'summary' ? t('copied') : t('copyResult')}
                </button>

                {/* Disclaimer */}
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-3 leading-relaxed">
                  {t('disclaimer')}
                </p>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400 text-sm">
                {t('result.empty')}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Checklist */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
        <button
          onClick={() => setShowChecklist(!showChecklist)}
          className="w-full flex items-center justify-between text-lg font-semibold text-gray-900 dark:text-white"
        >
          <span className="flex items-center gap-2">
            <CheckSquare className="w-5 h-5" />
            {t('checklist.title')}
          </span>
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {checkedItems.size}/{checklistItems.length}
          </span>
        </button>
        {showChecklist && (
          <div className="mt-4 space-y-2">
            {/* Progress bar */}
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mb-4">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${(checkedItems.size / checklistItems.length) * 100}%` }}
              />
            </div>
            {checklistItems.map((item, index) => (
              <button
                key={index}
                onClick={() => toggleChecklistItem(index)}
                className="w-full flex items-start gap-3 text-left py-2 px-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors"
              >
                {checkedItems.has(index) ? (
                  <CheckSquare className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                ) : (
                  <Square className="w-5 h-5 text-gray-400 dark:text-gray-500 flex-shrink-0 mt-0.5" />
                )}
                <span className={`text-sm ${checkedItems.has(index) ? 'line-through text-gray-400 dark:text-gray-500' : 'text-gray-700 dark:text-gray-300'}`}>
                  {item}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Guide Section */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
          <BookOpen className="w-5 h-5" />
          {t('guide.title')}
        </h2>
        <div className="grid md:grid-cols-2 gap-6">
          {/* Price Reference */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
              {t('guide.priceRef.title')}
            </h3>
            <ul className="space-y-2">
              {(t.raw('guide.priceRef.items') as string[]).map((item, index) => (
                <li key={index} className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300">
                  <span className="text-blue-600 dark:text-blue-400 mt-0.5">&#8226;</span>
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
              {(t.raw('guide.tips.items') as string[]).map((item, index) => (
                <li key={index} className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300">
                  <span className="text-green-600 dark:text-green-400 mt-0.5">&#8226;</span>
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
