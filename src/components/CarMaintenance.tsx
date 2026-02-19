'use client'

import { useState, useCallback, useMemo } from 'react'
import { useTranslations } from 'next-intl'
import {
  Car,
  Fuel,
  Shield,
  Wrench,
  ParkingSquare,
  Droplets,
  TrendingDown,
  CreditCard,
  Calculator,
  RotateCcw,
  BookOpen,
  ChevronDown,
  ChevronUp,
  Bus
} from 'lucide-react'

// ── Types ──
type VehicleType = 'light' | 'small' | 'medium' | 'large' | 'suv' | 'import'
type FuelType = 'gasoline' | 'diesel' | 'lpg' | 'hybrid' | 'electric'

interface CostBreakdown {
  autoTax: number
  insurance: number
  fuelCost: number
  maintenance: number
  parking: number
  carWash: number
  tollFees: number
  depreciation: number
}

interface MaintenanceItem {
  nameKey: string
  intervalKm: number
  intervalMonths: number
  estimatedCost: number
}

// ── Constants ──
const CURRENT_YEAR = 2026

const DEFAULT_FUEL_PRICES: Record<FuelType, number> = {
  gasoline: 1680,
  diesel: 1520,
  lpg: 1050,
  hybrid: 1680,
  electric: 300, // won/kWh
}

const INSURANCE_BASE: Record<VehicleType, number> = {
  light: 350000,
  small: 550000,
  medium: 750000,
  large: 950000,
  suv: 850000,
  import: 1200000,
}

const DEPRECIATION_BASE: Record<VehicleType, number> = {
  light: 1500000,
  small: 2500000,
  medium: 4000000,
  large: 5500000,
  suv: 5000000,
  import: 8000000,
}

const DEFAULT_EFFICIENCY: Record<FuelType, Record<VehicleType, number>> = {
  gasoline: { light: 16, small: 14, medium: 11, large: 9, suv: 10, import: 8 },
  diesel: { light: 18, small: 16, medium: 13, large: 11, suv: 12, import: 10 },
  lpg: { light: 12, small: 10, medium: 8, large: 7, suv: 8, import: 6 },
  hybrid: { light: 22, small: 20, medium: 17, large: 14, suv: 15, import: 13 },
  electric: { light: 6.5, small: 5.8, medium: 5.2, large: 4.8, suv: 5.0, import: 4.5 },
}

const MAINTENANCE_SCHEDULE: MaintenanceItem[] = [
  { nameKey: 'engineOil', intervalKm: 10000, intervalMonths: 6, estimatedCost: 80000 },
  { nameKey: 'oilFilter', intervalKm: 10000, intervalMonths: 6, estimatedCost: 15000 },
  { nameKey: 'airFilter', intervalKm: 20000, intervalMonths: 12, estimatedCost: 20000 },
  { nameKey: 'cabinFilter', intervalKm: 15000, intervalMonths: 12, estimatedCost: 25000 },
  { nameKey: 'brakePads', intervalKm: 40000, intervalMonths: 24, estimatedCost: 150000 },
  { nameKey: 'tires', intervalKm: 50000, intervalMonths: 36, estimatedCost: 400000 },
  { nameKey: 'battery', intervalKm: 60000, intervalMonths: 36, estimatedCost: 120000 },
  { nameKey: 'coolant', intervalKm: 40000, intervalMonths: 24, estimatedCost: 50000 },
  { nameKey: 'transmissionFluid', intervalKm: 60000, intervalMonths: 48, estimatedCost: 100000 },
  { nameKey: 'sparkPlugs', intervalKm: 40000, intervalMonths: 24, estimatedCost: 60000 },
  { nameKey: 'wiperBlades', intervalKm: 15000, intervalMonths: 12, estimatedCost: 30000 },
  { nameKey: 'brakeFluid', intervalKm: 40000, intervalMonths: 24, estimatedCost: 40000 },
]

// ── Calculation helpers ──
function calculateAutoTax(cc: number, age: number): number {
  if (cc <= 0) return 0
  let taxPerCc: number
  if (cc <= 1000) taxPerCc = 80
  else if (cc <= 1600) taxPerCc = 140
  else taxPerCc = 200

  let annualTax = cc * taxPerCc
  const discountRate = Math.min(0.5, Math.max(0, (age - 3)) * 0.05)
  annualTax *= (1 - discountRate)
  annualTax *= 1.3 // education tax 30%
  return Math.round(annualTax)
}

function calculateInsurance(vehicleType: VehicleType, age: number): number {
  const base = INSURANCE_BASE[vehicleType]
  // newer cars cost more to insure, older cars cost less
  let ageFactor = 1.0
  if (age <= 2) ageFactor = 1.2
  else if (age <= 5) ageFactor = 1.0
  else if (age <= 10) ageFactor = 0.85
  else ageFactor = 0.7
  return Math.round(base * ageFactor)
}

function calculateDepreciation(vehicleType: VehicleType, age: number): number {
  const base = DEPRECIATION_BASE[vehicleType]
  // depreciation decreases as car ages
  let ageFactor = 1.0
  if (age <= 1) ageFactor = 1.5
  else if (age <= 3) ageFactor = 1.2
  else if (age <= 5) ageFactor = 1.0
  else if (age <= 8) ageFactor = 0.7
  else if (age <= 12) ageFactor = 0.4
  else ageFactor = 0.2
  return Math.round(base * ageFactor)
}

function calculateMaintenanceCost(annualKm: number, age: number): number {
  let total = 0
  for (const item of MAINTENANCE_SCHEDULE) {
    const kmBased = annualKm / item.intervalKm
    const timeBased = 12 / item.intervalMonths
    const annualFrequency = Math.max(kmBased, timeBased)
    total += item.estimatedCost * annualFrequency
  }
  // older cars need more maintenance
  let ageFactor = 1.0
  if (age > 10) ageFactor = 1.5
  else if (age > 7) ageFactor = 1.3
  else if (age > 5) ageFactor = 1.15
  return Math.round(total * ageFactor)
}

// ── Formatting ──
function formatWon(value: number): string {
  if (value >= 10000) {
    const man = Math.floor(value / 10000)
    const remainder = value % 10000
    if (remainder === 0) return `${man.toLocaleString()}만원`
    return `${man.toLocaleString()}만 ${remainder.toLocaleString()}원`
  }
  return `${value.toLocaleString()}원`
}

function formatNumber(value: number): string {
  return value.toLocaleString()
}

// ── Pie chart colors ──
const PIE_COLORS = [
  '#3B82F6', // blue - auto tax
  '#10B981', // green - insurance
  '#F59E0B', // amber - fuel
  '#EF4444', // red - maintenance
  '#8B5CF6', // purple - parking
  '#06B6D4', // cyan - car wash
  '#F97316', // orange - toll
  '#EC4899', // pink - depreciation
]

export default function CarMaintenance() {
  const t = useTranslations('carMaintenance')

  // ── State ──
  const [vehicleType, setVehicleType] = useState<VehicleType>('medium')
  const [displacement, setDisplacement] = useState<number>(1998)
  const [modelYear, setModelYear] = useState<number>(2022)
  const [fuelType, setFuelType] = useState<FuelType>('gasoline')
  const [efficiency, setEfficiency] = useState<number>(11)
  const [useCustomEfficiency, setUseCustomEfficiency] = useState(false)
  const [annualKm, setAnnualKm] = useState<number>(15000)
  const [fuelPrice, setFuelPrice] = useState<number>(DEFAULT_FUEL_PRICES.gasoline)
  const [monthlyParking, setMonthlyParking] = useState<number>(100000)
  const [carWashFrequency, setCarWashFrequency] = useState<number>(2) // per month
  const [carWashCost, setCarWashCost] = useState<number>(10000)
  const [monthlyToll, setMonthlyToll] = useState<number>(30000)
  const [showSchedule, setShowSchedule] = useState(false)
  const [showResults, setShowResults] = useState(false)

  const vehicleAge = CURRENT_YEAR - modelYear

  // sync default efficiency when vehicle/fuel type changes
  const handleVehicleTypeChange = useCallback((type: VehicleType) => {
    setVehicleType(type)
    if (!useCustomEfficiency) {
      setEfficiency(DEFAULT_EFFICIENCY[fuelType][type])
    }
  }, [fuelType, useCustomEfficiency])

  const handleFuelTypeChange = useCallback((type: FuelType) => {
    setFuelType(type)
    setFuelPrice(DEFAULT_FUEL_PRICES[type])
    if (!useCustomEfficiency) {
      setEfficiency(DEFAULT_EFFICIENCY[type][vehicleType])
    }
  }, [vehicleType, useCustomEfficiency])

  // ── Calculation ──
  const costBreakdown = useMemo((): CostBreakdown => {
    const isElectric = fuelType === 'electric'
    const autoTax = isElectric ? 130000 : calculateAutoTax(displacement, vehicleAge)
    const insurance = calculateInsurance(vehicleType, vehicleAge)
    const fuelCost = efficiency > 0 ? Math.round((annualKm / efficiency) * fuelPrice) : 0
    const maintenance = isElectric
      ? Math.round(calculateMaintenanceCost(annualKm, vehicleAge) * 0.5)
      : calculateMaintenanceCost(annualKm, vehicleAge)
    const parking = monthlyParking * 12
    const carWash = carWashFrequency * carWashCost * 12
    const tollFees = monthlyToll * 12
    const depreciation = calculateDepreciation(vehicleType, vehicleAge)

    return { autoTax, insurance, fuelCost, maintenance, parking, carWash, tollFees, depreciation }
  }, [vehicleType, displacement, vehicleAge, fuelType, efficiency, annualKm, fuelPrice, monthlyParking, carWashFrequency, carWashCost, monthlyToll])

  const annualTotal = useMemo(() => {
    return Object.values(costBreakdown).reduce((sum, val) => sum + val, 0)
  }, [costBreakdown])

  const monthlyTotal = useMemo(() => Math.round(annualTotal / 12), [annualTotal])
  const costPerKm = useMemo(() => annualKm > 0 ? Math.round(annualTotal / annualKm) : 0, [annualTotal, annualKm])

  // Public transport comparison (Seoul avg monthly transit pass ~65,000)
  const monthlyPublicTransport = 65000
  const annualPublicTransport = monthlyPublicTransport * 12
  const carVsTransitRatio = annualPublicTransport > 0 ? (annualTotal / annualPublicTransport) : 0

  // ── Pie chart ──
  const pieData = useMemo(() => {
    const entries = [
      { key: 'autoTax', value: costBreakdown.autoTax, color: PIE_COLORS[0] },
      { key: 'insurance', value: costBreakdown.insurance, color: PIE_COLORS[1] },
      { key: 'fuelCost', value: costBreakdown.fuelCost, color: PIE_COLORS[2] },
      { key: 'maintenance', value: costBreakdown.maintenance, color: PIE_COLORS[3] },
      { key: 'parking', value: costBreakdown.parking, color: PIE_COLORS[4] },
      { key: 'carWash', value: costBreakdown.carWash, color: PIE_COLORS[5] },
      { key: 'tollFees', value: costBreakdown.tollFees, color: PIE_COLORS[6] },
      { key: 'depreciation', value: costBreakdown.depreciation, color: PIE_COLORS[7] },
    ].filter(d => d.value > 0)

    const total = entries.reduce((s, e) => s + e.value, 0)
    let accumulated = 0
    return entries.map(entry => {
      const percent = total > 0 ? (entry.value / total) * 100 : 0
      const start = accumulated
      accumulated += percent
      return { ...entry, percent, start, end: accumulated }
    })
  }, [costBreakdown])

  const conicGradient = useMemo(() => {
    if (pieData.length === 0) return 'conic-gradient(#e5e7eb 0% 100%)'
    const stops = pieData.map(d => `${d.color} ${d.start}% ${d.end}%`).join(', ')
    return `conic-gradient(${stops})`
  }, [pieData])

  // ── Maintenance schedule with mileage ──
  const scheduleItems = useMemo(() => {
    return MAINTENANCE_SCHEDULE.map(item => {
      const kmBased = annualKm / item.intervalKm
      const timeBased = 12 / item.intervalMonths
      const annualFrequency = Math.max(kmBased, timeBased)
      const annualCost = Math.round(item.estimatedCost * annualFrequency)
      return {
        ...item,
        annualFrequency: Math.round(annualFrequency * 10) / 10,
        annualCost,
      }
    })
  }, [annualKm])

  const handleCalculate = useCallback(() => {
    setShowResults(true)
  }, [])

  const handleReset = useCallback(() => {
    setVehicleType('medium')
    setDisplacement(1998)
    setModelYear(2022)
    setFuelType('gasoline')
    setEfficiency(DEFAULT_EFFICIENCY.gasoline.medium)
    setUseCustomEfficiency(false)
    setAnnualKm(15000)
    setFuelPrice(DEFAULT_FUEL_PRICES.gasoline)
    setMonthlyParking(100000)
    setCarWashFrequency(2)
    setCarWashCost(10000)
    setMonthlyToll(30000)
    setShowResults(false)
    setShowSchedule(false)
  }, [])

  // ── Year options ──
  const yearOptions = useMemo(() => {
    const years: number[] = []
    for (let y = CURRENT_YEAR; y >= CURRENT_YEAR - 25; y--) {
      years.push(y)
    }
    return years
  }, [])

  // Quick km buttons
  const quickKmOptions = [10000, 15000, 20000, 30000]

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <Car className="w-7 h-7 text-blue-600" />
          {t('title')}
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('description')}</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* ── Left: Input Panel ── */}
        <div className="lg:col-span-1 space-y-6">
          {/* Vehicle Info */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 space-y-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <Car className="w-5 h-5 text-blue-500" />
              {t('vehicleInfo')}
            </h2>

            {/* Vehicle Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('vehicleType')}
              </label>
              <select
                value={vehicleType}
                onChange={e => handleVehicleTypeChange(e.target.value as VehicleType)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
              >
                <option value="light">{t('vehicleTypes.light')}</option>
                <option value="small">{t('vehicleTypes.small')}</option>
                <option value="medium">{t('vehicleTypes.medium')}</option>
                <option value="large">{t('vehicleTypes.large')}</option>
                <option value="suv">{t('vehicleTypes.suv')}</option>
                <option value="import">{t('vehicleTypes.import')}</option>
              </select>
            </div>

            {/* Displacement */}
            {fuelType !== 'electric' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('displacement')}
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={displacement || ''}
                    onChange={e => setDisplacement(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 pr-10"
                    placeholder="1998"
                    min={0}
                    max={8000}
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">cc</span>
                </div>
              </div>
            )}

            {/* Model Year */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('modelYear')}
              </label>
              <select
                value={modelYear}
                onChange={e => setModelYear(Number(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
              >
                {yearOptions.map(y => (
                  <option key={y} value={y}>{y}{t('year')} ({CURRENT_YEAR - y}{t('yearsOld')})</option>
                ))}
              </select>
            </div>

            {/* Fuel Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('fuelType')}
              </label>
              <select
                value={fuelType}
                onChange={e => handleFuelTypeChange(e.target.value as FuelType)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
              >
                <option value="gasoline">{t('fuelTypes.gasoline')}</option>
                <option value="diesel">{t('fuelTypes.diesel')}</option>
                <option value="lpg">{t('fuelTypes.lpg')}</option>
                <option value="hybrid">{t('fuelTypes.hybrid')}</option>
                <option value="electric">{t('fuelTypes.electric')}</option>
              </select>
            </div>

            {/* Fuel Efficiency */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  {t('fuelEfficiency')}
                </label>
                <label className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={useCustomEfficiency}
                    onChange={e => {
                      setUseCustomEfficiency(e.target.checked)
                      if (!e.target.checked) {
                        setEfficiency(DEFAULT_EFFICIENCY[fuelType][vehicleType])
                      }
                    }}
                    className="accent-blue-600"
                  />
                  {t('customInput')}
                </label>
              </div>
              <div className="relative">
                <input
                  type="number"
                  value={efficiency || ''}
                  onChange={e => setEfficiency(Number(e.target.value))}
                  disabled={!useCustomEfficiency}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 pr-16 disabled:opacity-60"
                  placeholder="11"
                  min={0}
                  step={0.1}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">
                  {fuelType === 'electric' ? 'km/kWh' : 'km/L'}
                </span>
              </div>
            </div>
          </div>

          {/* Driving & Costs */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 space-y-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <Fuel className="w-5 h-5 text-amber-500" />
              {t('drivingCosts')}
            </h2>

            {/* Annual Driving Distance */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('annualDistance')}
              </label>
              <div className="relative">
                <input
                  type="number"
                  value={annualKm || ''}
                  onChange={e => setAnnualKm(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 pr-10"
                  placeholder="15000"
                  min={0}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">km</span>
              </div>
              <div className="flex gap-2 mt-2 flex-wrap">
                {quickKmOptions.map(km => (
                  <button
                    key={km}
                    onClick={() => setAnnualKm(km)}
                    className={`px-3 py-1 text-xs rounded-full border transition-colors ${
                      annualKm === km
                        ? 'bg-blue-100 dark:bg-blue-900 border-blue-400 dark:border-blue-600 text-blue-700 dark:text-blue-300'
                        : 'border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                    }`}
                  >
                    {formatNumber(km)}km
                  </button>
                ))}
              </div>
            </div>

            {/* Fuel Price */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('fuelPrice')} ({fuelType === 'electric' ? t('wonPerKwh') : t('wonPerLiter')})
              </label>
              <div className="relative">
                <input
                  type="number"
                  value={fuelPrice || ''}
                  onChange={e => setFuelPrice(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 pr-10"
                  min={0}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">{t('won')}</span>
              </div>
            </div>

            {/* Monthly Parking */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('monthlyParking')}
              </label>
              <div className="relative">
                <input
                  type="number"
                  value={monthlyParking || ''}
                  onChange={e => setMonthlyParking(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 pr-10"
                  placeholder="100000"
                  min={0}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">{t('won')}</span>
              </div>
            </div>

            {/* Car Wash */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('carWashFrequency')}
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={carWashFrequency || ''}
                    onChange={e => setCarWashFrequency(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 pr-12"
                    min={0}
                    max={30}
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">{t('timesPerMonth')}</span>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('carWashCost')}
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={carWashCost || ''}
                    onChange={e => setCarWashCost(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 pr-10"
                    min={0}
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">{t('won')}</span>
                </div>
              </div>
            </div>

            {/* Monthly Toll */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('monthlyToll')}
              </label>
              <div className="relative">
                <input
                  type="number"
                  value={monthlyToll || ''}
                  onChange={e => setMonthlyToll(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 pr-10"
                  placeholder="30000"
                  min={0}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">{t('won')}</span>
              </div>
            </div>
          </div>

          {/* Buttons */}
          <div className="flex gap-3">
            <button
              onClick={handleCalculate}
              className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg px-4 py-3 font-medium hover:from-blue-700 hover:to-indigo-700 transition-all flex items-center justify-center gap-2"
            >
              <Calculator className="w-5 h-5" />
              {t('calculate')}
            </button>
            <button
              onClick={handleReset}
              className="bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg px-4 py-3 transition-colors"
              title={t('reset')}
            >
              <RotateCcw className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ── Right: Results Panel ── */}
        <div className="lg:col-span-2 space-y-6">
          {showResults ? (
            <>
              {/* Summary Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl p-5 text-white shadow-lg">
                  <p className="text-sm opacity-90">{t('annualTotal')}</p>
                  <p className="text-2xl font-bold mt-1">{formatWon(annualTotal)}</p>
                </div>
                <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl p-5 text-white shadow-lg">
                  <p className="text-sm opacity-90">{t('monthlyAverage')}</p>
                  <p className="text-2xl font-bold mt-1">{formatWon(monthlyTotal)}</p>
                </div>
                <div className="bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl p-5 text-white shadow-lg">
                  <p className="text-sm opacity-90">{t('costPerKm')}</p>
                  <p className="text-2xl font-bold mt-1">{formatNumber(costPerKm)}{t('wonPerKm')}</p>
                </div>
              </div>

              {/* Cost Breakdown + Pie Chart */}
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{t('costBreakdown')}</h3>
                <div className="grid md:grid-cols-2 gap-6">
                  {/* Pie Chart */}
                  <div className="flex flex-col items-center">
                    <div
                      className="w-48 h-48 rounded-full relative"
                      style={{ background: conicGradient }}
                    >
                      <div className="absolute inset-6 bg-white dark:bg-gray-800 rounded-full flex flex-col items-center justify-center">
                        <span className="text-xs text-gray-500 dark:text-gray-400">{t('annualTotal')}</span>
                        <span className="text-sm font-bold text-gray-900 dark:text-white">{formatWon(annualTotal)}</span>
                      </div>
                    </div>
                    {/* Legend */}
                    <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                      {pieData.map(d => (
                        <div key={d.key} className="flex items-center gap-1.5">
                          <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: d.color }} />
                          <span className="text-gray-600 dark:text-gray-400">
                            {t(`categories.${d.key}`)} ({Math.round(d.percent)}%)
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Breakdown List */}
                  <div className="space-y-3">
                    {[
                      { key: 'autoTax', value: costBreakdown.autoTax, icon: CreditCard, color: 'text-blue-500' },
                      { key: 'insurance', value: costBreakdown.insurance, icon: Shield, color: 'text-emerald-500' },
                      { key: 'fuelCost', value: costBreakdown.fuelCost, icon: Fuel, color: 'text-amber-500' },
                      { key: 'maintenance', value: costBreakdown.maintenance, icon: Wrench, color: 'text-red-500' },
                      { key: 'parking', value: costBreakdown.parking, icon: ParkingSquare, color: 'text-purple-500' },
                      { key: 'carWash', value: costBreakdown.carWash, icon: Droplets, color: 'text-cyan-500' },
                      { key: 'tollFees', value: costBreakdown.tollFees, icon: Car, color: 'text-orange-500' },
                      { key: 'depreciation', value: costBreakdown.depreciation, icon: TrendingDown, color: 'text-pink-500' },
                    ].map(item => {
                      const Icon = item.icon
                      const monthly = Math.round(item.value / 12)
                      return (
                        <div key={item.key} className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-700 last:border-0">
                          <div className="flex items-center gap-2">
                            <Icon className={`w-4 h-4 ${item.color}`} />
                            <span className="text-sm text-gray-700 dark:text-gray-300">{t(`categories.${item.key}`)}</span>
                          </div>
                          <div className="text-right">
                            <span className="text-sm font-semibold text-gray-900 dark:text-white">{formatWon(item.value)}</span>
                            <span className="text-xs text-gray-400 dark:text-gray-500 ml-1">({t('monthly')} {formatWon(monthly)})</span>
                          </div>
                        </div>
                      )
                    })}
                    <div className="flex items-center justify-between pt-3 border-t-2 border-gray-300 dark:border-gray-600">
                      <span className="text-sm font-bold text-gray-900 dark:text-white">{t('total')}</span>
                      <span className="text-lg font-bold text-blue-600 dark:text-blue-400">{formatWon(annualTotal)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Monthly Breakdown */}
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{t('monthlyBreakdown')}</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200 dark:border-gray-700">
                        <th className="text-left py-2 text-gray-500 dark:text-gray-400 font-medium">{t('category')}</th>
                        <th className="text-right py-2 text-gray-500 dark:text-gray-400 font-medium">{t('monthlyAmount')}</th>
                        <th className="text-right py-2 text-gray-500 dark:text-gray-400 font-medium">{t('annualAmount')}</th>
                        <th className="text-right py-2 text-gray-500 dark:text-gray-400 font-medium">{t('percentage')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        { key: 'autoTax', value: costBreakdown.autoTax },
                        { key: 'insurance', value: costBreakdown.insurance },
                        { key: 'fuelCost', value: costBreakdown.fuelCost },
                        { key: 'maintenance', value: costBreakdown.maintenance },
                        { key: 'parking', value: costBreakdown.parking },
                        { key: 'carWash', value: costBreakdown.carWash },
                        { key: 'tollFees', value: costBreakdown.tollFees },
                        { key: 'depreciation', value: costBreakdown.depreciation },
                      ].map(item => (
                        <tr key={item.key} className="border-b border-gray-100 dark:border-gray-700/50">
                          <td className="py-2 text-gray-700 dark:text-gray-300">{t(`categories.${item.key}`)}</td>
                          <td className="py-2 text-right text-gray-900 dark:text-white">{formatNumber(Math.round(item.value / 12))}{t('won')}</td>
                          <td className="py-2 text-right text-gray-900 dark:text-white">{formatNumber(item.value)}{t('won')}</td>
                          <td className="py-2 text-right text-gray-500 dark:text-gray-400">
                            {annualTotal > 0 ? Math.round((item.value / annualTotal) * 100) : 0}%
                          </td>
                        </tr>
                      ))}
                      <tr className="border-t-2 border-gray-300 dark:border-gray-600 font-bold">
                        <td className="py-2 text-gray-900 dark:text-white">{t('total')}</td>
                        <td className="py-2 text-right text-blue-600 dark:text-blue-400">{formatNumber(monthlyTotal)}{t('won')}</td>
                        <td className="py-2 text-right text-blue-600 dark:text-blue-400">{formatNumber(annualTotal)}{t('won')}</td>
                        <td className="py-2 text-right text-blue-600 dark:text-blue-400">100%</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Public Transport Comparison */}
              <div className="bg-blue-50 dark:bg-blue-950 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                  <Bus className="w-5 h-5 text-blue-500" />
                  {t('transitComparison')}
                </h3>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
                    <p className="text-sm text-gray-500 dark:text-gray-400">{t('carAnnualCost')}</p>
                    <p className="text-xl font-bold text-gray-900 dark:text-white mt-1">{formatWon(annualTotal)}</p>
                    <p className="text-xs text-gray-400 dark:text-gray-500">{t('monthly')} {formatWon(monthlyTotal)}</p>
                  </div>
                  <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
                    <p className="text-sm text-gray-500 dark:text-gray-400">{t('transitAnnualCost')}</p>
                    <p className="text-xl font-bold text-gray-900 dark:text-white mt-1">{formatWon(annualPublicTransport)}</p>
                    <p className="text-xs text-gray-400 dark:text-gray-500">{t('monthly')} {formatWon(monthlyPublicTransport)}</p>
                  </div>
                </div>
                <div className="mt-4 bg-white dark:bg-gray-800 rounded-lg p-4">
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    {t('transitComparisonResult', { ratio: carVsTransitRatio.toFixed(1) })}
                  </p>
                </div>
              </div>

              {/* Maintenance Schedule */}
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
                <button
                  onClick={() => setShowSchedule(!showSchedule)}
                  className="w-full flex items-center justify-between text-lg font-semibold text-gray-900 dark:text-white"
                >
                  <span className="flex items-center gap-2">
                    <Wrench className="w-5 h-5 text-red-500" />
                    {t('maintenanceSchedule')}
                  </span>
                  {showSchedule ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                </button>
                {showSchedule && (
                  <div className="mt-4 overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-200 dark:border-gray-700">
                          <th className="text-left py-2 text-gray-500 dark:text-gray-400 font-medium">{t('scheduleItem')}</th>
                          <th className="text-right py-2 text-gray-500 dark:text-gray-400 font-medium">{t('scheduleInterval')}</th>
                          <th className="text-right py-2 text-gray-500 dark:text-gray-400 font-medium">{t('scheduleUnitCost')}</th>
                          <th className="text-right py-2 text-gray-500 dark:text-gray-400 font-medium">{t('scheduleAnnualCost')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {scheduleItems.map(item => (
                          <tr key={item.nameKey} className="border-b border-gray-100 dark:border-gray-700/50">
                            <td className="py-2 text-gray-700 dark:text-gray-300">{t(`maintenanceItems.${item.nameKey}`)}</td>
                            <td className="py-2 text-right text-gray-500 dark:text-gray-400 text-xs">
                              {formatNumber(item.intervalKm)}km / {item.intervalMonths}{t('months')}
                            </td>
                            <td className="py-2 text-right text-gray-900 dark:text-white">{formatWon(item.estimatedCost)}</td>
                            <td className="py-2 text-right text-gray-900 dark:text-white font-medium">{formatWon(item.annualCost)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          ) : (
            /* Placeholder before calculation */
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-12 flex flex-col items-center justify-center text-center min-h-[400px]">
              <Car className="w-16 h-16 text-gray-300 dark:text-gray-600 mb-4" />
              <h3 className="text-lg font-semibold text-gray-500 dark:text-gray-400 mb-2">{t('placeholderTitle')}</h3>
              <p className="text-sm text-gray-400 dark:text-gray-500 max-w-sm">{t('placeholderDescription')}</p>
            </div>
          )}
        </div>
      </div>

      {/* Guide Section */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-blue-500" />
          {t('guide.title')}
        </h2>
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <h3 className="font-medium text-gray-900 dark:text-white mb-2">{t('guide.taxSection.title')}</h3>
            <ul className="space-y-1">
              {(t.raw('guide.taxSection.items') as string[]).map((item, i) => (
                <li key={i} className="text-sm text-gray-600 dark:text-gray-400 flex items-start gap-1.5">
                  <span className="text-blue-500 mt-0.5">-</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="font-medium text-gray-900 dark:text-white mb-2">{t('guide.savingsSection.title')}</h3>
            <ul className="space-y-1">
              {(t.raw('guide.savingsSection.items') as string[]).map((item, i) => (
                <li key={i} className="text-sm text-gray-600 dark:text-gray-400 flex items-start gap-1.5">
                  <span className="text-green-500 mt-0.5">-</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="font-medium text-gray-900 dark:text-white mb-2">{t('guide.maintenanceSection.title')}</h3>
            <ul className="space-y-1">
              {(t.raw('guide.maintenanceSection.items') as string[]).map((item, i) => (
                <li key={i} className="text-sm text-gray-600 dark:text-gray-400 flex items-start gap-1.5">
                  <span className="text-red-500 mt-0.5">-</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="font-medium text-gray-900 dark:text-white mb-2">{t('guide.depreciationSection.title')}</h3>
            <ul className="space-y-1">
              {(t.raw('guide.depreciationSection.items') as string[]).map((item, i) => (
                <li key={i} className="text-sm text-gray-600 dark:text-gray-400 flex items-start gap-1.5">
                  <span className="text-pink-500 mt-0.5">-</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
