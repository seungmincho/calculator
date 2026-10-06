'use client'

import { useState, useCallback, useEffect, useMemo } from 'react'
import { useSearchParams } from '@/hooks/useSearchParams'
import { useTranslations } from '@/lib/i18n/fuelCalculator'
import {
  Car,
  Copy,
  Check,
  Download,
  Save,
  X,
  FileText,
  Shield,
  TrendingUp,
  Wrench,
  BookOpen,
  ExternalLink,
  Plus,
  Trash2,
  Upload,
  Edit3,
  RefreshCw,
  Fuel,
  Calculator
} from 'lucide-react'
import FuelCharts from '@/components/FuelCharts'
import { useCalculationHistory } from '@/hooks/useCalculationHistory'
import CalculationHistory from '@/components/CalculationHistory'
import { safeStorage, STORAGE_KEYS } from '@/utils/localStorage'
import DatePicker from '@/components/ui/DatePicker'
import GuideSection from '@/components/GuideSectionContent'
import { fuelPriceFallback } from '@/utils/fuelPriceFallback'
import ShareResult from '@/components/ShareResult'
import MobileResultLink from '@/components/MobileResultLink'

type FuelType = 'gasoline' | 'premium_gasoline' | 'diesel' | 'lpg'

interface FuelCalculation {
  distance: number
  fuelConsumption: number
  fuelCost: number
  settlement: number // 정산 유류비 = 연료비 × 감가비 계수
  depreciationCost: number
  totalCost: number // 운행 원가(참고) = 연료비 + 감가상각비
  costPerKm: number
  settlementPerKm: number
}

interface VehicleType {
  id: string
  category: '경차' | '소형차' | '중형차' | '대형차' | 'SUV' | '승합차' | '화물차'
  efficiency: number // km/L
  depreciation: number // 원/km
}

interface VehicleSettings {
  vehicleType: string
  fuelType: FuelType
  customEfficiency: number
  useCustomEfficiency: boolean
  fuelPrices: Record<FuelType, number>
  depreciationMultiplier: number
  selectedSido: string
  savedAt: string
}

// 차종별 연비 및 감가상각비 데이터
const VEHICLE_TYPES: Record<string, VehicleType> = {
  light: { id: 'light', category: '경차', efficiency: 16.0, depreciation: 80 },
  compact: { id: 'compact', category: '소형차', efficiency: 14.5, depreciation: 100 },
  midsize: { id: 'midsize', category: '중형차', efficiency: 12.0, depreciation: 130 },
  fullsize: { id: 'fullsize', category: '대형차', efficiency: 10.5, depreciation: 160 },
  suv: { id: 'suv', category: 'SUV', efficiency: 9.5, depreciation: 180 },
  van: { id: 'van', category: '승합차', efficiency: 8.5, depreciation: 200 },
  truck: { id: 'truck', category: '화물차', efficiency: 7.0, depreciation: 250 }
}

const FUEL_TYPES: FuelType[] = ['gasoline', 'premium_gasoline', 'diesel', 'lpg']
const isFuelType = (v: unknown): v is FuelType => FUEL_TYPES.includes(v as FuelType)
const isVehicleType = (v: unknown): v is string => typeof v === 'string' && v in VEHICLE_TYPES

// 연료별 연비 보정 (차종 기준 연비는 휘발유)
const getAdjustedEfficiency = (baseEfficiency: number, fuel: FuelType): number =>
  fuel === 'diesel' ? baseEfficiency * 1.18 : fuel === 'lpg' ? baseEfficiency * 0.9 : baseEfficiency

// 로컬(KST) 기준 YYYY-MM-DD — toISOString()은 UTC라 오전 9시 전엔 전날이 됨
const localDate = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
// OPINET/Supabase 날짜(YYYYMMDD 또는 YYYY-MM-DD…) → YYYY-MM-DD
const normDate = (s?: string) => {
  const digits = (s ?? '').replace(/\D/g, '').slice(0, 8)
  return digits.length === 8 ? `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6)}` : ''
}
const won = (n: number) => Math.round(n).toLocaleString('ko-KR')
// 공유 링크 판별용 계산 파라미터 — 하나라도 있으면 링크 값을 내 차량 설정(localStorage)보다 우선
const SHARE_KEYS = ['distance', 'rt', 'vehicleType', 'fuelType', 'eff', 'dm']

async function copyText(text: string) {
  if (navigator.clipboard?.writeText) return navigator.clipboard.writeText(text)
  const textarea = document.createElement('textarea')
  textarea.value = text
  textarea.style.position = 'fixed'
  textarea.style.left = '-999999px'
  document.body.appendChild(textarea)
  textarea.select()
  document.execCommand('copy')
  document.body.removeChild(textarea)
}

function downloadFile(content: string, filename: string, type: string) {
  const blob = new Blob([content], { type })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

// OPINET 시도 코드 매핑
const SIDO_OPTIONS = [
  { code: '', name: '전국 평균' },
  { code: '01', name: '서울' },
  { code: '02', name: '경기' },
  { code: '03', name: '강원' },
  { code: '04', name: '충북' },
  { code: '05', name: '충남' },
  { code: '06', name: '전북' },
  { code: '07', name: '전남' },
  { code: '08', name: '경북' },
  { code: '09', name: '경남' },
  { code: '10', name: '부산' },
  { code: '11', name: '제주' },
  { code: '14', name: '대구' },
  { code: '15', name: '인천' },
  { code: '16', name: '광주' },
  { code: '17', name: '대전' },
  { code: '18', name: '울산' },
  { code: '19', name: '세종' },
] as const

interface DrivingLogEntry {
  id: string
  date: string
  distance: number // 편도(또는 입력한) 거리
  roundTrip?: boolean // true면 distance × 2
  tollFee: number
  parkingFee: number
  memo: string
}

const logKm = (log: DrivingLogEntry) => log.distance * (log.roundTrip ? 2 : 1)

const FuelCalculator = () => {
  const t = useTranslations('fuelCalculator')
  const tc = useTranslations('common')
  const searchParams = useSearchParams()

  // Tab state
  const [activeTab, setActiveTab] = useState<'calculator' | 'drivingLog'>('calculator')

  // Calculator state
  const [distance, setDistance] = useState<number>(() => parseFloat(searchParams.get('distance') || '') || 100) // 기본 100km: 첫 화면(서버 HTML 포함)부터 결과 노출
  const [roundTrip, setRoundTrip] = useState<boolean>(() => searchParams.get('rt') === '1')
  const [vehicleType, setVehicleType] = useState<string>(() => {
    const p = searchParams.get('vehicleType')
    return isVehicleType(p) ? p : 'compact'
  })
  const [fuelType, setFuelType] = useState<FuelType>(() => {
    const p = searchParams.get('fuelType')
    return isFuelType(p) ? p : 'gasoline'
  })
  const [customEfficiency, setCustomEfficiency] = useState<number>(0)
  const [useCustomEfficiency, setUseCustomEfficiency] = useState(false)
  const [isCopied, setIsCopied] = useState(false)
  const [isSaved, setIsSaved] = useState(false)
  const [fuelPrices, setFuelPrices] = useState<Record<FuelType, number>>({
    gasoline: 1600,
    premium_gasoline: 1800,
    diesel: 1400,
    lpg: 900
  })
  const [isEditingPrices, setIsEditingPrices] = useState(false)
  const [tempPrices, setTempPrices] = useState(fuelPrices)
  // default = 조회 전/실패 시 내장 기본값, manual = 사용자가 직접 수정, opinet = 조회 성공
  const [priceSource, setPriceSource] = useState<'default' | 'manual' | 'opinet'>('default')
  const [priceDate, setPriceDate] = useState<string>('') // 적용 유가의 기준일 (YYYY-MM-DD)
  const [priceNoData, setPriceNoData] = useState(false) // 요청한 날짜 데이터 없음 → 기존 가격 유지
  const [priceFallback, setPriceFallback] = useState<ReturnType<typeof fuelPriceFallback>>(null)
  const [priceLoading, setPriceLoading] = useState(false)
  const [selectedSido, setSelectedSido] = useState<string>('')
  const [selectedDate, setSelectedDate] = useState<string>('') // YYYY-MM-DD, 빈 값이면 실시간
  const [depreciationMultiplier, setDepreciationMultiplier] = useState<number>(1.0) // 감가비 계수 (유류비에 곱함)

  // Vehicle settings state
  const [hasVehicleSettings, setHasVehicleSettings] = useState(false)
  const [settingsFeedback, setSettingsFeedback] = useState<string | null>(null)
  const [logFeedback, setLogFeedback] = useState<string | null>(null)
  const [logCopied, setLogCopied] = useState(false)

  // Driving log state
  const [drivingLogs, setDrivingLogs] = useState<DrivingLogEntry[]>([])
  const [dateFilter, setDateFilter] = useState<'thisMonth' | 'last3Months' | 'all'>('thisMonth')
  const [newLogEntry, setNewLogEntry] = useState<Omit<DrivingLogEntry, 'id'>>({
    date: '', // 마운트 후 오늘 날짜로 채움 (빌드 시각 고정 방지)
    distance: 0,
    roundTrip: false,
    tollFee: 0,
    parkingFee: 0,
    memo: ''
  })

  // Calculation history hook
  const {
    histories,
    isLoading: historyLoading,
    saveCalculation,
    removeHistory,
    clearHistories,
    loadFromHistory
  } = useCalculationHistory('fuel')

  // Load vehicle settings and driving logs on mount
  useEffect(() => {
    setNewLogEntry(prev => ({ ...prev, date: prev.date || localDate() }))

    const savedSettings = safeStorage.getItem(STORAGE_KEYS.VEHICLE_SETTINGS)
    if (savedSettings) {
      setHasVehicleSettings(true)
      // 공유 링크(계산 파라미터)가 없을 때만 내 차량(연비·계수) 자동 적용 — 유가는 OPINET 최신값 유지
      // searchParams = 첫 렌더 시점 쿼리 (URL 동기화가 덮어쓴 뒤 StrictMode 재실행돼도 원래 링크 기준)
      if (!SHARE_KEYS.some(k => searchParams.has(k))) {
        try {
          const s: Partial<VehicleSettings> = JSON.parse(savedSettings)
          if (isVehicleType(s.vehicleType)) setVehicleType(s.vehicleType)
          if (isFuelType(s.fuelType)) setFuelType(s.fuelType)
          if (s.customEfficiency) setCustomEfficiency(s.customEfficiency)
          if (s.useCustomEfficiency !== undefined) setUseCustomEfficiency(s.useCustomEfficiency)
        } catch {
          // ignore invalid vehicle settings data
        }
      }
    }

    const savedLogs = safeStorage.getItem(STORAGE_KEYS.DRIVING_LOG)
    if (savedLogs) {
      try {
        const parsed = JSON.parse(savedLogs)
        if (Array.isArray(parsed)) setDrivingLogs(parsed)
      } catch {
        // ignore invalid driving log data
      }
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── OPINET 유가 가져오기 (실시간 또는 과거 날짜) ──
  const fetchOpinetPrices = useCallback(async (sido?: string, date?: string) => {
    setPriceLoading(true)
    setPriceNoData(false)
    setPriceFallback(null)
    const apply = (p: Partial<Record<FuelType, number>>, basis: string) => {
      setFuelPrices(prev => ({
        gasoline: p.gasoline || prev.gasoline,
        premium_gasoline: p.premium_gasoline || prev.premium_gasoline,
        diesel: p.diesel || prev.diesel,
        lpg: p.lpg || prev.lpg,
      }))
      setPriceDate(basis)
      setPriceFallback(fuelPriceFallback(date, basis))
      setPriceSource('opinet')
    }
    try {
      const params = new URLSearchParams()
      if (sido) params.set('sido', sido)
      if (date) params.set('date', date)
      const qs = params.toString()
      const res = await fetch(`/api/fuel-prices${qs ? `?${qs}` : ''}`)
      if (!res.ok) throw new Error('API error')
      const data = await res.json()

      // Supabase 과거 데이터 응답
      if (data.source === 'supabase' && Array.isArray(data.data)) {
        const rows = data.data as Array<{ gasoline?: number; premium_gasoline?: number; diesel?: number; lpg?: number; trade_date?: string; sido_nm?: string }>
        let gasoline = 0, premiumGasoline = 0, diesel = 0, lpg = 0
        if (rows.length > 0) {
          if (sido) {
            gasoline = Math.round(Number(rows[0].gasoline ?? 0))
            premiumGasoline = Math.round(Number(rows[0].premium_gasoline ?? 0))
            diesel = Math.round(Number(rows[0].diesel ?? 0))
            lpg = Math.round(Number(rows[0].lpg ?? 0))
          } else {
            let gCount = 0, pgCount = 0, dCount = 0, lCount = 0
            for (const r of rows) {
              if (r.gasoline) { gasoline += Number(r.gasoline); gCount++ }
              if (r.premium_gasoline) { premiumGasoline += Number(r.premium_gasoline); pgCount++ }
              if (r.diesel) { diesel += Number(r.diesel); dCount++ }
              if (r.lpg) { lpg += Number(r.lpg); lCount++ }
            }
            if (gCount) gasoline = Math.round(gasoline / gCount)
            if (pgCount) premiumGasoline = Math.round(premiumGasoline / pgCount)
            if (dCount) diesel = Math.round(diesel / dCount)
            if (lCount) lpg = Math.round(lpg / lCount)
          }
        }
        if (gasoline || diesel) {
          apply({ gasoline, premium_gasoline: premiumGasoline, diesel, lpg }, normDate(rows[0].trade_date) || date || localDate())
        } else {
          setPriceNoData(true)
        }
        return
      }

      // OPINET 실시간 응답 (전국 또는 시도별)
      const oils = data?.RESULT?.OIL
      if (Array.isArray(oils)) {
        const priceMap: Partial<Record<FuelType, number>> = {}
        let tradeDate = ''
        for (const oil of oils) {
          if (oil.PRODCD === 'B027') priceMap.gasoline = Math.round(Number(oil.PRICE))
          if (oil.PRODCD === 'B034') priceMap.premium_gasoline = Math.round(Number(oil.PRICE))
          if (oil.PRODCD === 'D047') priceMap.diesel = Math.round(Number(oil.PRICE))
          if (oil.PRODCD === 'K015') priceMap.lpg = Math.round(Number(oil.PRICE))
          tradeDate ||= normDate(oil.TRADE_DT)
        }
        if (priceMap.gasoline || priceMap.diesel) apply(priceMap, tradeDate || localDate())
        else if (date) setPriceNoData(true)
      }
    } catch {
      // 실패 시 기존 가격 유지 (출처 표시는 그대로)
      if (date) setPriceNoData(true)
    } finally {
      setPriceLoading(false)
    }
  }, [])

  // 마운트 시 OPINET 가격 자동 로드 + localStorage에서 감가비 계수/지역 복원
  useEffect(() => {
    const savedMultiplier = safeStorage.getItem('fuel_depreciation_multiplier')
    if (savedMultiplier) setDepreciationMultiplier(Number(savedMultiplier) || 1.0)
    const savedSido = safeStorage.getItem('fuel_selected_sido')
    if (savedSido) setSelectedSido(savedSido)
    fetchOpinetPrices(savedSido || undefined)
  }, [fetchOpinetPrices])

  // 공유 링크의 직접 입력 연비·감가비 계수 복원 (위 localStorage 값보다 우선, 첫 렌더 시점 쿼리 기준)
  useEffect(() => {
    if (!SHARE_KEYS.some(k => searchParams.has(k))) return
    const eff = parseFloat(searchParams.get('eff') ?? '')
    if (eff > 0 && eff <= 100) { setCustomEfficiency(eff); setUseCustomEfficiency(true) }
    const dm = parseFloat(searchParams.get('dm') ?? '')
    setDepreciationMultiplier(dm >= 1 && dm <= 1.5 ? dm : 1)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── URL sync ──
  useEffect(() => {
    const url = new URL(window.location.href)
    // 기본값은 URL에서 뺌 → 새로고침 시 쿼리 없는 깨끗한 URL(서버 HTML과 일치, hydration 경고 없음)
    const setOrDelete = (key: string, value: string, isDefault: boolean) =>
      isDefault ? url.searchParams.delete(key) : url.searchParams.set(key, value)
    setOrDelete('distance', String(distance), distance === 100 || distance <= 0)
    setOrDelete('rt', '1', !roundTrip)
    setOrDelete('vehicleType', vehicleType, vehicleType === 'compact')
    setOrDelete('fuelType', fuelType, fuelType === 'gasoline')
    setOrDelete('eff', String(customEfficiency), !(useCustomEfficiency && customEfficiency > 0))
    setOrDelete('dm', String(depreciationMultiplier), depreciationMultiplier === 1)
    window.history.replaceState({}, '', url)
  }, [distance, roundTrip, vehicleType, fuelType, customEfficiency, useCustomEfficiency, depreciationMultiplier])

  const efficiency = useCustomEfficiency && customEfficiency > 0
    ? customEfficiency
    : getAdjustedEfficiency(VEHICLE_TYPES[vehicleType].efficiency, fuelType)
  const tripKm = distance > 0 ? distance * (roundTrip ? 2 : 1) : 0

  // 유류비 계산 — 렌더 중 계산(useMemo)이라 서버 HTML에도 기본값(100km) 결과가 들어감
  const calculation = useMemo<FuelCalculation | null>(() => {
    if (tripKm <= 0) return null
    const fuelConsumption = tripKm / efficiency
    const fuelCost = fuelConsumption * fuelPrices[fuelType]
    const settlement = fuelCost * depreciationMultiplier
    const depreciationCost = tripKm * VEHICLE_TYPES[vehicleType].depreciation
    const totalCost = fuelCost + depreciationCost
    return {
      distance: tripKm,
      fuelConsumption,
      fuelCost,
      settlement,
      depreciationCost,
      totalCost,
      costPerKm: totalCost / tripKm,
      settlementPerKm: settlement / tripKm
    }
  }, [tripKm, efficiency, fuelPrices, fuelType, depreciationMultiplier, vehicleType])

  // 유가 출처 문구 (예: "OPINET 서울 · 2026-09-30 기준")
  const sidoName = selectedSido ? SIDO_OPTIONS.find(s => s.code === selectedSido)?.name ?? '' : t('priceSource.nationwide')
  const priceSourceLabel = priceSource === 'opinet'
    ? t('priceSource.opinet', { region: sidoName, date: priceDate })
    : priceSource === 'manual' ? t('priceSource.manual') : t('priceSource.default')

  // Manual fuel price editing
  const startEditingPrices = useCallback(() => {
    setTempPrices(fuelPrices)
    setIsEditingPrices(true)
  }, [fuelPrices])

  const savePrices = useCallback(() => {
    setFuelPrices(tempPrices)
    setPriceSource('manual')
    setPriceFallback(null)
    setPriceNoData(false)
    setIsEditingPrices(false)
  }, [tempPrices])

  const cancelEditingPrices = useCallback(() => {
    setTempPrices(fuelPrices)
    setIsEditingPrices(false)
  }, [fuelPrices])

  // Vehicle settings functions
  const saveVehicleSettings = useCallback(() => {
    const settings: VehicleSettings = {
      vehicleType,
      fuelType,
      customEfficiency,
      useCustomEfficiency,
      fuelPrices,
      depreciationMultiplier,
      selectedSido,
      savedAt: new Date().toISOString()
    }

    const success = safeStorage.setItem(STORAGE_KEYS.VEHICLE_SETTINGS, JSON.stringify(settings))
    if (success) {
      setHasVehicleSettings(true)
      setSettingsFeedback(t('vehicleSettings.saved'))
      setTimeout(() => setSettingsFeedback(null), 2000)
    }
  }, [vehicleType, fuelType, customEfficiency, useCustomEfficiency, fuelPrices, depreciationMultiplier, selectedSido, t])

  const loadVehicleSettings = useCallback(() => {
    const savedSettings = safeStorage.getItem(STORAGE_KEYS.VEHICLE_SETTINGS)
    if (savedSettings) {
      try {
        const settings: VehicleSettings = JSON.parse(savedSettings)
        if (isVehicleType(settings.vehicleType)) setVehicleType(settings.vehicleType)
        if (isFuelType(settings.fuelType)) setFuelType(settings.fuelType)
        setCustomEfficiency(settings.customEfficiency)
        setUseCustomEfficiency(settings.useCustomEfficiency)
        if (settings.fuelPrices) {
          setFuelPrices(settings.fuelPrices)
          setPriceSource('manual')
        }
        if (settings.depreciationMultiplier) setDepreciationMultiplier(settings.depreciationMultiplier)
        if (settings.selectedSido !== undefined) setSelectedSido(settings.selectedSido)
        setSettingsFeedback(t('vehicleSettings.loaded'))
        setTimeout(() => setSettingsFeedback(null), 2000)
      } catch {
        // ignore invalid vehicle settings data
      }
    } else {
      setSettingsFeedback(t('vehicleSettings.noSaved'))
      setTimeout(() => setSettingsFeedback(null), 2000)
    }
  }, [t])

  const deleteVehicleSettings = useCallback(() => {
    if (window.confirm(t('vehicleSettings.confirmDelete'))) {
      safeStorage.removeItem(STORAGE_KEYS.VEHICLE_SETTINGS)
      setHasVehicleSettings(false)
      setSettingsFeedback(t('vehicleSettings.deleted'))
      setTimeout(() => setSettingsFeedback(null), 2000)
    }
  }, [t])

  // Load calculation from history
  const handleLoadFromHistory = useCallback((historyId: string) => {
    const inputs = loadFromHistory(historyId)
    if (inputs) {
      setDistance(inputs.distance || 0)
      setRoundTrip(!!inputs.roundTrip)
      setVehicleType(isVehicleType(inputs.vehicleType) ? inputs.vehicleType : 'compact')
      setFuelType(isFuelType(inputs.fuelType) ? inputs.fuelType : 'gasoline')
      setCustomEfficiency(inputs.customEfficiency || 0)
      setUseCustomEfficiency(inputs.useCustomEfficiency || false)
      if (inputs.fuelPrices) {
        setFuelPrices(inputs.fuelPrices)
        setPriceSource('manual')
      }
    }
  }, [loadFromHistory])

  // Format history result for display
  const formatHistoryResult = useCallback((result: Record<string, unknown>) => {
    const amount = (result.settlement ?? result.totalCost) as number | undefined
    return `${won(amount ?? 0)}원`
  }, [])

  // Manual save calculation
  const handleSaveCalculation = useCallback(() => {
    if (!calculation) return

    const inputs = {
      distance,
      roundTrip,
      vehicleType,
      fuelType,
      customEfficiency: useCustomEfficiency ? customEfficiency : 0,
      useCustomEfficiency,
      fuelPrices,
      totalCost: calculation.totalCost
    }

    const resultData = {
      settlement: calculation.settlement,
      totalCost: calculation.totalCost,
      fuelCost: calculation.fuelCost,
      depreciationCost: calculation.depreciationCost,
      costPerKm: calculation.costPerKm,
      fuelConsumption: calculation.fuelConsumption
    }

    const success = saveCalculation(inputs, resultData)
    if (success) {
      setIsSaved(true)
      setTimeout(() => setIsSaved(false), 2000)
    }
  }, [calculation, distance, roundTrip, vehicleType, fuelType, customEfficiency, useCustomEfficiency, fuelPrices, saveCalculation])

  const persistLogs = useCallback((logs: DrivingLogEntry[]) => {
    setDrivingLogs(logs)
    safeStorage.setItem(STORAGE_KEYS.DRIVING_LOG, JSON.stringify(logs))
  }, [])

  // Driving log functions
  const addDrivingLogEntry = useCallback(() => {
    if (newLogEntry.distance <= 0) return
    const entry: DrivingLogEntry = {
      ...newLogEntry,
      date: newLogEntry.date || localDate(),
      id: Date.now().toString() + Math.random().toString(36).slice(2, 11)
    }
    persistLogs([entry, ...drivingLogs])
    // Reset form (날짜·왕복 여부는 유지 → 연속 입력이 빠름)
    setNewLogEntry(prev => ({ ...prev, distance: 0, tollFee: 0, parkingFee: 0, memo: '' }))
  }, [newLogEntry, drivingLogs, persistLogs])

  // 계산기 결과를 주행일지에 바로 추가 (출장일 선택 시 그 날짜로)
  const addCurrentTripToLog = useCallback(() => {
    if (distance <= 0) return
    const entry: DrivingLogEntry = {
      id: Date.now().toString() + Math.random().toString(36).slice(2, 11),
      date: selectedDate || localDate(),
      distance,
      roundTrip,
      tollFee: 0,
      parkingFee: 0,
      memo: ''
    }
    persistLogs([entry, ...drivingLogs])
    setLogFeedback(t('trip.addedToLog', { date: entry.date }))
    setTimeout(() => setLogFeedback(null), 2500)
  }, [distance, roundTrip, selectedDate, drivingLogs, persistLogs, t])

  const removeDrivingLogEntry = useCallback((id: string) => {
    persistLogs(drivingLogs.filter(log => log.id !== id))
  }, [drivingLogs, persistLogs])

  const clearAllDrivingLogs = useCallback(() => {
    if (window.confirm(t('drivingLog.export.confirmClear'))) {
      setDrivingLogs([])
      safeStorage.removeItem(STORAGE_KEYS.DRIVING_LOG)
    }
  }, [t])

  // 주행일지 한 건의 정산 유류비 (현재 차량·유가·감가비 계수 적용)
  const calculateLogFuelCost = useCallback((km: number): number =>
    Math.round((km / efficiency) * fuelPrices[fuelType] * depreciationMultiplier),
  [efficiency, fuelPrices, fuelType, depreciationMultiplier])

  // Filtered logs by date (문자열 비교 — 타임존 영향 없음)
  const filteredLogs = useMemo(() => {
    if (dateFilter === 'all') return drivingLogs
    const now = new Date()
    if (dateFilter === 'thisMonth') {
      const month = localDate(now).slice(0, 7)
      return drivingLogs.filter(log => log.date.slice(0, 7) === month)
    }
    const cutoff = localDate(new Date(now.getFullYear(), now.getMonth() - 2, 1)).slice(0, 7)
    return drivingLogs.filter(log => log.date.slice(0, 7) >= cutoff)
  }, [drivingLogs, dateFilter])

  // 합계는 현재 필터(기본: 이번 달) 기준
  const logSummary = useMemo(() => {
    const totalDistance = filteredLogs.reduce((sum, log) => sum + logKm(log), 0)
    const totalTollFee = filteredLogs.reduce((sum, log) => sum + log.tollFee, 0)
    const totalParkingFee = filteredLogs.reduce((sum, log) => sum + log.parkingFee, 0)
    const totalFuelCost = filteredLogs.reduce((sum, log) => sum + calculateLogFuelCost(logKm(log)), 0)
    return {
      totalDistance,
      totalTollFee,
      totalParkingFee,
      totalFuelCost,
      grandTotal: totalTollFee + totalParkingFee + totalFuelCost
    }
  }, [filteredLogs, calculateLogFuelCost])

  // 계산기 탭에 보여줄 이번 달 누적 (필터와 무관)
  const monthSummary = useMemo(() => {
    const month = localDate().slice(0, 7)
    const logs = drivingLogs.filter(log => log.date.slice(0, 7) === month)
    return {
      count: logs.length,
      total: logs.reduce((sum, log) => sum + calculateLogFuelCost(logKm(log)) + log.tollFee + log.parkingFee, 0)
    }
  }, [drivingLogs, calculateLogFuelCost])

  const filterLabel = t(`drivingLog.filter.${dateFilter}`)
  const conditionLine = t('settlement.condition', {
    vehicle: VEHICLE_TYPES[vehicleType].category,
    fuel: t(`fuelTypes.${fuelType}`),
    efficiency: efficiency.toFixed(1),
    price: won(fuelPrices[fuelType]),
    multiplier: depreciationMultiplier.toFixed(2),
    source: priceSourceLabel
  })

  // Export driving logs (현재 필터) to CSV
  const exportToCSV = useCallback(() => {
    if (filteredLogs.length === 0) return
    const q = (s: string) => `"${s.replace(/"/g, '""')}"`
    const headers = [t('drivingLog.date'), t('drivingLog.distance'), t('trip.roundTrip'), t('settlement.km'), t('drivingLog.tollFee'), t('drivingLog.parkingFee'), t('drivingLog.fuelCost'), t('drivingLog.totalCost'), t('drivingLog.routeMemo')]
    const rows = filteredLogs.map(log => {
      const fuelCost = calculateLogFuelCost(logKm(log))
      return [log.date, log.distance, log.roundTrip ? 'Y' : '', logKm(log), log.tollFee, log.parkingFee, fuelCost, log.tollFee + log.parkingFee + fuelCost, q(log.memo)].join(',')
    })
    rows.push([t('drivingLog.summary.title'), '', '', logSummary.totalDistance, logSummary.totalTollFee, logSummary.totalParkingFee, logSummary.totalFuelCost, logSummary.grandTotal, q(conditionLine)].join(','))
    downloadFile('﻿' + [headers.map(q).join(','), ...rows].join('\n'), `주행일지_${localDate()}.csv`, 'text/csv;charset=utf-8')
  }, [filteredLogs, logSummary, calculateLogFuelCost, conditionLine, t])

  // 주행일지 정산서 텍스트 (결재·메신저 붙여넣기용)
  const copyLogSettlement = useCallback(async () => {
    if (filteredLogs.length === 0) return
    const lines = [...filteredLogs].sort((a, b) => a.date.localeCompare(b.date)).map(log => {
      const fuelCost = calculateLogFuelCost(logKm(log))
      return t('settlement.logLine', {
        date: log.date,
        memo: log.memo || '-',
        km: logKm(log).toLocaleString('ko-KR'),
        trip: log.roundTrip ? t('trip.roundTrip') : t('trip.oneWay'),
        fuel: won(fuelCost),
        extra: won(log.tollFee + log.parkingFee),
        total: won(fuelCost + log.tollFee + log.parkingFee)
      })
    })
    const text = [
      t('settlement.logTitle', { period: filterLabel }),
      conditionLine,
      '',
      ...lines,
      '',
      t('settlement.logSummary', {
        count: filteredLogs.length,
        km: logSummary.totalDistance.toLocaleString('ko-KR'),
        fuel: won(logSummary.totalFuelCost),
        toll: won(logSummary.totalTollFee),
        parking: won(logSummary.totalParkingFee)
      }),
      t('settlement.logTotal', { total: won(logSummary.grandTotal) })
    ].join('\n')
    try {
      await copyText(text)
      setLogCopied(true)
      setTimeout(() => setLogCopied(false), 2000)
    } catch (error) {
      console.error('Failed to copy:', error)
    }
  }, [filteredLogs, logSummary, calculateLogFuelCost, conditionLine, filterLabel, t])

  // 단건 정산서 텍스트
  const settlementText = useMemo(() => {
    if (!calculation) return ''
    return [
      t('settlement.title'),
      t('settlement.distanceLine', {
        km: distance.toLocaleString('ko-KR'),
        trip: roundTrip ? t('trip.roundTripX2') : t('trip.oneWay'),
        total: tripKm.toLocaleString('ko-KR')
      }),
      conditionLine,
      t('settlement.formula', {
        km: tripKm.toLocaleString('ko-KR'),
        efficiency: efficiency.toFixed(1),
        price: won(fuelPrices[fuelType]),
        multiplier: depreciationMultiplier.toFixed(2),
        liters: calculation.fuelConsumption.toFixed(2)
      }),
      t('settlement.amount', { amount: won(calculation.settlement) }),
      '',
      t('settlement.footer')
    ].join('\n')
  }, [calculation, distance, roundTrip, tripKm, conditionLine, efficiency, fuelPrices, fuelType, depreciationMultiplier, t])

  // 결과 복사
  const copyResult = useCallback(async () => {
    if (!settlementText) return
    try {
      await copyText(settlementText)
      setIsCopied(true)
      setTimeout(() => setIsCopied(false), 2000)
    } catch (error) {
      console.error('Failed to copy:', error)
    }
  }, [settlementText])

  // 결과 다운로드 (정산서 + 참고 원가)
  const downloadResult = useCallback(() => {
    if (!calculation) return
    const content = [
      settlementText,
      '',
      t('settlement.reference', {
        depreciation: won(calculation.depreciationCost),
        total: won(calculation.totalCost),
        perKm: won(calculation.costPerKm)
      })
    ].join('\n')
    downloadFile(content, `유류비정산_${localDate()}.txt`, 'text/plain;charset=utf-8')
  }, [calculation, settlementText, t])

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-2">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-fg">
            {t('title')}
          </h1>
          <p className="text-sm text-muted mt-1">
            {t('description')}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <CalculationHistory
            histories={histories}
            isLoading={false}
            onLoadHistory={handleLoadFromHistory}
            onRemoveHistory={removeHistory}
            onClearHistories={clearHistories}
            formatResult={formatHistoryResult}
          />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-line">
        <button
          onClick={() => setActiveTab('calculator')}
          className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'calculator'
              ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
              : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
          }`}
        >
          <div className="flex items-center space-x-2">
            <Calculator className="w-4 h-4" />
            <span>{t('tabs.calculator')}</span>
          </div>
        </button>
        <button
          onClick={() => setActiveTab('drivingLog')}
          className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'drivingLog'
              ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
              : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
          }`}
        >
          <div className="flex items-center space-x-2">
            <FileText className="w-4 h-4" />
            <span>{t('tabs.drivingLog')}</span>
            {drivingLogs.length > 0 && (
              <span className="bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-300 px-2 py-0.5 rounded-full text-xs">
                {drivingLogs.length}
              </span>
            )}
          </div>
        </button>
      </div>

      {/* Calculator Tab */}
      {activeTab === 'calculator' && (
        <div className="grid lg:grid-cols-3 gap-8">
          {/* 입력 패널 */}
          <div className="lg:col-span-1 space-y-6">
            {/* 주행 정보 */}
            <div className={`ui-card p-6`}>
              {calculation && <MobileResultLink href="#fuel-calculator-result" className="mb-4" label={roundTrip ? t('result.settlementRoundTrip') : t('result.settlement')} value={`${won(calculation.settlement)}${t('share.won')}`} />}
              <h2 className="text-xl font-semibold text-fg mb-4">
                {t('input.tripInfo')}
              </h2>

              <div className="space-y-4">
                <div>
                  <label htmlFor="fuel-distance" className="block text-sm font-medium text-body mb-2">
                    {roundTrip ? t('trip.oneWayDistance') : t('input.distance')} (km)
                  </label>
                  <input
                    id="fuel-distance"
                    type="number"
                    inputMode="decimal"
                    value={distance || ''}
                    onChange={(e) => setDistance(Number(e.target.value))}
                    placeholder="100"
                    min="0"
                    step="0.1"
                    className="w-full ui-field px-3 py-2"
                  />
                </div>
                <div className="grid grid-cols-2 gap-1 p-1 bg-soft rounded-xl" role="group" aria-label={t('trip.mode')}>
                  {([false, true] as const).map(rt => (
                    <button
                      key={String(rt)}
                      type="button"
                      onClick={() => setRoundTrip(rt)}
                      aria-pressed={roundTrip === rt}
                      className={`py-2 text-sm font-medium rounded-lg transition-colors ${roundTrip === rt ? 'bg-primary text-white shadow-sm' : 'text-muted hover:text-body'}`}
                    >
                      {rt ? t('trip.roundTrip') : t('trip.oneWay')}
                    </button>
                  ))}
                </div>
                {roundTrip && distance > 0 && (
                  <p className="text-xs text-muted tabular-nums">
                    {t('trip.roundTripHint', { km: distance.toLocaleString('ko-KR'), total: tripKm.toLocaleString('ko-KR') })}
                  </p>
                )}
              </div>
            </div>

            {/* 차량 정보 */}
            <div className={`ui-card p-6`}>
              <h2 className="text-xl font-semibold text-fg mb-4">
                {t('input.vehicleInfo')}
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-body mb-2">
                    {t('input.vehicleType')}
                  </label>
                  <select
                    value={vehicleType}
                    onChange={(e) => setVehicleType(e.target.value)}
                    className="w-full ui-field px-3 py-2"
                  >
                    {Object.entries(VEHICLE_TYPES).map(([key, vehicle]) => (
                      <option key={key} value={key}>
                        {vehicle.category} ({vehicle.efficiency}km/L)
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-body mb-2">
                    {t('input.fuelType')}
                  </label>
                  <select
                    value={fuelType}
                    onChange={(e) => setFuelType(e.target.value as FuelType)}
                    className="w-full ui-field px-3 py-2"
                  >
                    <option value="gasoline">{t('fuelTypes.gasoline')} ({fuelPrices.gasoline.toLocaleString()}원/L)</option>
                    <option value="premium_gasoline">{t('fuelTypes.premium_gasoline')} ({fuelPrices.premium_gasoline.toLocaleString()}원/L)</option>
                    <option value="diesel">{t('fuelTypes.diesel')} ({fuelPrices.diesel.toLocaleString()}원/L)</option>
                    <option value="lpg">{t('fuelTypes.lpg')} ({fuelPrices.lpg.toLocaleString()}원/L)</option>
                  </select>
                </div>

                <div>
                  <div className="flex items-center mb-2">
                    <input
                      type="checkbox"
                      id="customEfficiency"
                      checked={useCustomEfficiency}
                      onChange={(e) => setUseCustomEfficiency(e.target.checked)}
                      className="mr-2"
                    />
                    <label htmlFor="customEfficiency" className="text-sm font-medium text-body">
                      {t('input.customEfficiency')}
                    </label>
                  </div>
                  {useCustomEfficiency && (
                    <input
                      type="number"
                      value={customEfficiency || ''}
                      onChange={(e) => setCustomEfficiency(Number(e.target.value))}
                      placeholder="12.5"
                      min="1"
                      max="30"
                      step="0.1"
                      className="w-full ui-field px-3 py-2"
                    />
                  )}
                </div>

                {/* Vehicle Settings Buttons */}
                <div className="pt-3 border-t border-line">
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={saveVehicleSettings}
                      className="ui-btn-soft flex items-center gap-1 px-3 py-1.5 text-xs"
                    >
                      <Save className="w-3 h-3" />
                      <span>{t('vehicleSettings.save')}</span>
                    </button>
                    <button
                      onClick={loadVehicleSettings}
                      className="ui-btn-soft flex items-center gap-1 px-3 py-1.5 text-xs"
                    >
                      <Upload className="w-3 h-3" />
                      <span>{t('vehicleSettings.load')}</span>
                    </button>
                    {hasVehicleSettings && (
                      <button
                        onClick={deleteVehicleSettings}
                        className="flex items-center gap-1 px-3 py-1.5 text-xs text-muted hover:text-red-600 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>{t('vehicleSettings.delete')}</span>
                      </button>
                    )}
                  </div>
                  <p className="mt-2 text-xs text-muted" aria-live="polite">
                    {settingsFeedback ?? t('vehicleSettings.autoApplyHint')}
                  </p>
                </div>
              </div>
            </div>

            {/* 유가 정보 (지역/날짜/가격) */}
            <div className={`ui-card p-6`}>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-fg">
                  {t('opinet.title')}
                </h2>
                {!isEditingPrices ? (
                  <button
                    onClick={startEditingPrices}
                    className="flex items-center gap-1 px-2 py-1.5 text-xs text-muted hover:text-primary rounded-lg transition-colors"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>{t('priceSource.edit')}</span>
                  </button>
                ) : (
                  <div className="flex space-x-1">
                    <button
                      onClick={savePrices}
                      className="p-2 text-primary hover:opacity-80 transition-colors"
                      aria-label={tc('save')}
                    >
                      <Save className="w-4 h-4" />
                    </button>
                    <button
                      onClick={cancelEditingPrices}
                      className="p-2 text-muted hover:text-body transition-colors"
                      aria-label={tc('cancel')}
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>

              <div className="space-y-3">
                {/* 지역 선택 */}
                <div>
                  <label className="block text-xs font-medium text-sub mb-1">
                    {t('region.label')}
                  </label>
                  <select
                    value={selectedSido}
                    onChange={(e) => {
                      const sido = e.target.value
                      setSelectedSido(sido)
                      safeStorage.setItem('fuel_selected_sido', sido)
                      fetchOpinetPrices(sido || undefined, selectedDate || undefined)
                    }}
                    className="w-full ui-field px-3 py-2 text-sm"
                  >
                    {SIDO_OPTIONS.map(s => (
                      <option key={s.code} value={s.code}>{s.name}</option>
                    ))}
                  </select>
                </div>

                {/* 날짜 선택 (출장일) */}
                <div>
                  <label className="block text-xs font-medium text-sub mb-1">
                    {t('region.date')}
                  </label>
                  <div className="flex gap-2 items-start">
                    <DatePicker
                      label={t('region.date')}
                      value={selectedDate}
                      onChange={(date) => {
                        setSelectedDate(date)
                        fetchOpinetPrices(selectedSido || undefined, date || undefined)
                      }}
                      maxDate={new Date()}
                      placeholder={t('region.realtime')}
                      className="flex-1"
                    />
                    {selectedDate && (
                      <button
                        onClick={() => {
                          setSelectedDate('')
                          fetchOpinetPrices(selectedSido || undefined)
                        }}
                        className="ui-btn-soft px-2 py-2 text-xs shrink-0"
                      >
                        {t('region.today')}
                      </button>
                    )}
                  </div>
                  {priceNoData && (
                    <p className="text-xs mt-2 px-3 py-2 rounded-lg bg-amber-50 text-amber-800 dark:bg-amber-950 dark:text-amber-200">
                      {t('priceSource.noData')}
                    </p>
                  )}
                  {priceSource === 'opinet' && priceFallback && (
                    <p role="status" className="text-xs mt-2 px-3 py-2 rounded-lg bg-amber-50 text-amber-800 dark:bg-amber-950 dark:text-amber-200">
                      {t('priceSource.fallback', priceFallback)}
                    </p>
                  )}
                </div>

                <div className="pt-2 border-t border-line" />

                {/* 유가 표시 */}
                {FUEL_TYPES.map(ft => (
                  <div key={ft} className="flex justify-between items-center">
                    <span className={`text-sm ${ft === fuelType ? 'text-fg font-medium' : 'text-sub'}`}>{t(`fuelTypes.${ft}`)}</span>
                    {isEditingPrices ? (
                      <input
                        type="number"
                        inputMode="numeric"
                        aria-label={t(`fuelTypes.${ft}`)}
                        value={tempPrices[ft] || ''}
                        onChange={(e) => setTempPrices(prev => ({ ...prev, [ft]: Number(e.target.value) }))}
                        className="w-24 ui-field px-2 py-1 text-sm text-right"
                        min="0"
                      />
                    ) : (
                      <span className={`tabular-nums ${ft === fuelType ? 'font-semibold text-fg' : 'font-medium text-body'}`}>{won(fuelPrices[ft])}원/L</span>
                    )}
                  </div>
                ))}

                <div className="pt-3 border-t border-line">
                  <div className="flex items-center justify-between gap-2 text-xs mb-3">
                    <span className={priceSource === 'default' ? 'text-amber-700 dark:text-amber-300' : 'text-muted'} aria-live="polite">
                      {priceLoading ? tc('loading') : priceSourceLabel}
                    </span>
                    <button
                      onClick={() => fetchOpinetPrices(selectedSido || undefined, selectedDate || undefined)}
                      disabled={priceLoading}
                      className="p-1 text-muted hover:text-primary disabled:opacity-50 shrink-0"
                      aria-label={t('fuelPrices.update')}
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${priceLoading ? 'animate-spin' : ''}`} />
                    </button>
                  </div>

                  {/* OPINET Link */}
                  <a
                    href="https://www.opinet.co.kr/user/dopospdrg/dopOsPdrgSelect.do"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ui-btn-soft flex items-center justify-center gap-2 w-full px-4 py-2"
                  >
                    <ExternalLink className="w-4 h-4" />
                    <span className="text-sm font-medium">{t('opinet.checkPrice')}</span>
                  </a>
                  <p className="text-xs text-muted mt-2 text-center">
                    {t('opinet.linkDescription')}
                  </p>
                </div>
              </div>
            </div>

            {/* 감가비 계수 설정 */}
            <div className={`ui-card p-6`}>
              <h2 className="text-lg font-semibold text-fg mb-4">
                {t('depreciation.title')}
              </h2>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-sub mb-1">
                    {t('depreciation.multiplier')}
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="range"
                      min="1.0"
                      max="1.5"
                      step="0.05"
                      value={depreciationMultiplier}
                      onChange={(e) => {
                        const val = Number(e.target.value)
                        setDepreciationMultiplier(val)
                        safeStorage.setItem('fuel_depreciation_multiplier', String(val))
                      }}
                      className="flex-1 accent-blue-600"
                      aria-label={t('depreciation.multiplier')}
                    />
                    <span className="text-sm font-bold text-fg w-12 text-right tabular-nums">
                      ×{depreciationMultiplier.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs text-faint mt-1">
                    <span>×1.00</span>
                    <span>×1.50</span>
                  </div>
                </div>
                <p className="text-xs text-muted">
                  {t('depreciation.description')}
                </p>
                {depreciationMultiplier !== 1.0 && (
                  <button
                    onClick={() => {
                      setDepreciationMultiplier(1.0)
                      safeStorage.setItem('fuel_depreciation_multiplier', '1.0')
                    }}
                    className="text-xs text-primary hover:underline"
                  >
                    {t('depreciation.reset')}
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* 결과 패널 */}
          <div className="lg:col-span-2 space-y-6">
            {calculation ? (
              <>
                {/* 정산 결과 */}
                <div id="fuel-calculator-result" className="ui-card p-6 scroll-mt-20">
                  <p className="text-sm font-medium text-muted">
                    {roundTrip ? t('result.settlementRoundTrip') : t('result.settlement')}
                  </p>
                  <p className="text-4xl font-bold text-fg tabular-nums mt-1" aria-live="polite">
                    {won(calculation.settlement)}<span className="text-2xl ml-0.5">원</span>
                  </p>
                  <p className="text-sm text-sub mt-2 tabular-nums">
                    {t('result.summaryLine', {
                      km: tripKm.toLocaleString('ko-KR'),
                      liters: calculation.fuelConsumption.toFixed(2),
                      perKm: won(calculation.settlementPerKm)
                    })}
                  </p>

                  <div className="flex flex-wrap gap-2 mt-5">
                    <button onClick={copyResult} className="ui-btn flex items-center gap-1.5 px-4 py-2.5 text-sm">
                      {isCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      <span>{isCopied ? tc('copied') : t('settlement.copy')}</span>
                    </button>
                    <button onClick={addCurrentTripToLog} className="ui-btn-soft flex items-center gap-1.5 px-4 py-2.5 text-sm">
                      <Plus className="w-4 h-4" />
                      <span>{t('trip.addToLog')}</span>
                    </button>
                    <button onClick={handleSaveCalculation} className="ui-btn-soft flex items-center gap-1.5 px-3 py-2.5 text-sm">
                      {isSaved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
                      <span>{tc('save')}</span>
                    </button>
                    <button onClick={downloadResult} className="ui-btn-soft flex items-center gap-1.5 px-3 py-2.5 text-sm">
                      <Download className="w-4 h-4" />
                      <span>{tc('export')}</span>
                    </button>
                  </div>
                  {(logFeedback || monthSummary.count > 0) && (
                    <p className="text-xs text-muted mt-3" aria-live="polite">
                      {logFeedback && <span className="text-fg font-medium mr-2">{logFeedback}</span>}
                      {monthSummary.count > 0 && (
                        <button onClick={() => { setDateFilter('thisMonth'); setActiveTab('drivingLog') }} className="text-primary hover:underline tabular-nums">
                          {t('trip.monthSummary', { count: monthSummary.count, total: won(monthSummary.total) })}
                        </button>
                      )}
                    </p>
                  )}

                  {/* 산식 + 유가 출처 */}
                  <div className="bg-subtle rounded-2xl p-4 mt-5 text-sm space-y-2">
                    <div className="flex justify-between gap-3">
                      <span className="text-sub">{t('result.distance')}</span>
                      <span className="font-medium text-fg tabular-nums text-right">
                        {roundTrip ? t('trip.roundTripHint', { km: distance.toLocaleString('ko-KR'), total: tripKm.toLocaleString('ko-KR') }) : `${tripKm.toLocaleString('ko-KR')}km`}
                      </span>
                    </div>
                    <div className="flex justify-between gap-3">
                      <span className="text-sub">{t('result.efficiency')}</span>
                      <span className="font-medium text-fg tabular-nums">{efficiency.toFixed(1)}km/L</span>
                    </div>
                    <div className="flex justify-between gap-3">
                      <span className="text-sub">{t('result.fuelPrice')}</span>
                      <span className="font-medium text-fg tabular-nums text-right">
                        {won(fuelPrices[fuelType])}원/L
                        <span className="block text-xs font-normal text-muted">{priceSourceLabel}</span>
                      </span>
                    </div>
                    <div className="flex justify-between gap-3">
                      <span className="text-sub">{t('result.fuelCost')}</span>
                      <span className="font-medium text-fg tabular-nums">{won(calculation.fuelCost)}원</span>
                    </div>
                    {depreciationMultiplier !== 1 && (
                      <div className="flex justify-between gap-3">
                        <span className="text-sub">{t('depreciation.title')}</span>
                        <span className="font-medium text-fg tabular-nums">×{depreciationMultiplier.toFixed(2)}</span>
                      </div>
                    )}
                    <p className="pt-2 border-t border-line text-xs text-muted tabular-nums">
                      {t('settlement.formula', {
                        km: tripKm.toLocaleString('ko-KR'),
                        efficiency: efficiency.toFixed(1),
                        price: won(fuelPrices[fuelType]),
                        multiplier: depreciationMultiplier.toFixed(2),
                        liters: calculation.fuelConsumption.toFixed(2)
                      })}
                    </p>
                  </div>

                  {/* 참고: 감가상각 포함 운행 원가 */}
                  <div className="grid grid-cols-3 gap-3 mt-4 text-center">
                    <div className="rounded-xl border border-line p-3">
                      <p className="text-xs text-muted">{t('result.depreciationCost')}</p>
                      <p className="text-base font-semibold text-fg tabular-nums mt-1">{won(calculation.depreciationCost)}원</p>
                      <p className="text-[11px] text-faint">{VEHICLE_TYPES[vehicleType].depreciation}원/km</p>
                    </div>
                    <div className="rounded-xl border border-line p-3">
                      <p className="text-xs text-muted">{t('result.totalCost')}</p>
                      <p className="text-base font-semibold text-fg tabular-nums mt-1">{won(calculation.totalCost)}원</p>
                    </div>
                    <div className="rounded-xl border border-line p-3">
                      <p className="text-xs text-muted">{t('result.costPerKm')}</p>
                      <p className="text-base font-semibold text-fg tabular-nums mt-1">{won(calculation.costPerKm)}원</p>
                    </div>
                  </div>
                  <p className="text-xs text-faint mt-2">{t('result.referenceNote')}</p>
                </div>

                <ShareResult
                  fileName="fuel-cost"
                  card={{
                    tool: t('title'),
                    label: t('share.label', { vehicle: VEHICLE_TYPES[vehicleType].category, fuel: t(`fuelTypes.${fuelType}`), km: tripKm.toLocaleString('ko-KR') }),
                    headline: `${won(calculation.settlement)}${t('share.won')}`,
                    sub: t('result.summaryLine', { km: tripKm.toLocaleString('ko-KR'), liters: calculation.fuelConsumption.toFixed(2), perKm: won(calculation.settlementPerKm) }),
                    rows: [
                      { label: t('result.distance'), value: roundTrip ? t('trip.roundTripHint', { km: distance.toLocaleString('ko-KR'), total: tripKm.toLocaleString('ko-KR') }) : `${tripKm.toLocaleString('ko-KR')}km` },
                      { label: t('result.efficiency'), value: `${efficiency.toFixed(1)}km/L` },
                      { label: t('result.fuelPrice'), value: `${won(fuelPrices[fuelType])}${t('share.perLiter')}` },
                      { label: t('share.priceBasis'), value: priceSourceLabel },
                      ...(depreciationMultiplier !== 1 ? [{ label: t('depreciation.title'), value: `×${depreciationMultiplier.toFixed(2)}` }] : []),
                    ],
                  }}
                  text={t('share.text', { km: tripKm.toLocaleString('ko-KR'), amount: won(calculation.settlement), fuel: t(`fuelTypes.${fuelType}`), price: won(fuelPrices[fuelType]) })}
                />

                {/* 비용 구성 파이차트 + 연료별 비교 */}
                <FuelCharts
                  fuelCost={Math.round(calculation.fuelCost)}
                  depreciationCost={Math.round(calculation.depreciationCost)}
                  tripKm={tripKm}
                  comparison={FUEL_TYPES.map(ft => {
                    const selectedVehicle = VEHICLE_TYPES[vehicleType]
                    const fuelLabels = { gasoline: '일반', premium_gasoline: '고급', diesel: '경유', lpg: 'LPG' }
                    const fuelColors = { gasoline: '#3b82f6', premium_gasoline: '#8b5cf6', diesel: '#10b981', lpg: '#f59e0b' }
                    const eff = useCustomEfficiency && customEfficiency > 0
                      ? customEfficiency
                      : getAdjustedEfficiency(selectedVehicle.efficiency, ft)
                    const cost = (tripKm / eff) * fuelPrices[ft]
                    return { name: fuelLabels[ft], cost: Math.round(cost), fill: fuelColors[ft], isCurrent: ft === fuelType }
                  })}
                />
              </>
            ) : (
              <div className={`ui-card p-12 text-center`}>
                <Car className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-muted">
                  {t('placeholder')}
                </p>
              </div>
            )}

            {/* Calculation History */}
            <CalculationHistory
              histories={histories}
              isLoading={historyLoading}
              onLoadHistory={handleLoadFromHistory}
              onRemoveHistory={removeHistory}
              onClearHistories={clearHistories}
              formatResult={formatHistoryResult}
            />
          </div>
        </div>
      )}

      {/* Driving Log Tab */}
      {activeTab === 'drivingLog' && (
        <div className="space-y-6">
          {/* Add Entry Form */}
          <div className={`ui-card p-6`}>
            <h2 className="text-xl font-semibold text-fg mb-4">
              {t('drivingLog.addEntry')}
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div>
                <label className="block text-xs font-medium text-sub mb-1">
                  {t('drivingLog.date')}
                </label>
                <input
                  type="date"
                  value={newLogEntry.date}
                  onChange={(e) => setNewLogEntry(prev => ({ ...prev, date: e.target.value }))}
                  className="w-full ui-field px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-sub mb-1">
                  {t('drivingLog.distance')}
                </label>
                <input
                  type="number"
                  value={newLogEntry.distance || ''}
                  onChange={(e) => setNewLogEntry(prev => ({ ...prev, distance: Number(e.target.value) }))}
                  placeholder={t('drivingLog.form.placeholder.distance')}
                  min="0"
                  step="0.1"
                  className="w-full ui-field px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-sub mb-1">
                  {t('drivingLog.tollFee')}
                </label>
                <input
                  type="number"
                  value={newLogEntry.tollFee || ''}
                  onChange={(e) => setNewLogEntry(prev => ({ ...prev, tollFee: Number(e.target.value) }))}
                  placeholder={t('drivingLog.form.placeholder.tollFee')}
                  min="0"
                  step="100"
                  className="w-full ui-field px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-sub mb-1">
                  {t('drivingLog.parkingFee')}
                </label>
                <input
                  type="number"
                  value={newLogEntry.parkingFee || ''}
                  onChange={(e) => setNewLogEntry(prev => ({ ...prev, parkingFee: Number(e.target.value) }))}
                  placeholder={t('drivingLog.form.placeholder.parkingFee')}
                  min="0"
                  step="100"
                  className="w-full ui-field px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-sub mb-1">
                  {t('drivingLog.routeMemo')}
                </label>
                <input
                  type="text"
                  value={newLogEntry.memo}
                  onChange={(e) => setNewLogEntry(prev => ({ ...prev, memo: e.target.value }))}
                  onKeyDown={(e) => { if (e.key === 'Enter') addDrivingLogEntry() }}
                  placeholder={t('drivingLog.form.placeholder.route')}
                  className="w-full ui-field px-3 py-2 text-sm"
                />
              </div>
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-4">
              <label className="flex items-center gap-2 text-sm text-body">
                <input
                  type="checkbox"
                  checked={!!newLogEntry.roundTrip}
                  onChange={(e) => setNewLogEntry(prev => ({ ...prev, roundTrip: e.target.checked }))}
                  className="accent-blue-600"
                />
                {t('trip.roundTripX2')}
                {newLogEntry.roundTrip && newLogEntry.distance > 0 && (
                  <span className="text-muted tabular-nums">= {(newLogEntry.distance * 2).toLocaleString('ko-KR')}km</span>
                )}
              </label>
              <button
                onClick={addDrivingLogEntry}
                disabled={newLogEntry.distance <= 0}
                className="ui-btn flex items-center gap-2 px-4 py-2"
              >
                <Plus className="w-4 h-4" />
                <span>{t('drivingLog.addEntry')}</span>
              </button>
            </div>
          </div>

          {/* Log Table */}
          <div className="ui-card p-6">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <h2 className="text-xl font-semibold text-fg">
                {t('drivingLog.title')}
              </h2>
              {drivingLogs.length > 0 && (
                <div className="grid grid-cols-3 gap-1 p-1 bg-soft rounded-xl" role="group">
                  {(['thisMonth', 'last3Months', 'all'] as const).map(f => (
                    <button
                      key={f}
                      onClick={() => setDateFilter(f)}
                      aria-pressed={dateFilter === f}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                        dateFilter === f ? 'bg-primary text-white shadow-sm' : 'text-muted hover:text-body'
                      }`}
                    >
                      {t(`drivingLog.filter.${f}`)}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* 정산 합계 (현재 필터 기준) */}
            {filteredLogs.length > 0 && (
              <div className="bg-subtle rounded-2xl p-5 mb-4">
                <p className="text-sm text-muted">{t('drivingLog.periodTotal', { period: filterLabel })}</p>
                <p className="text-3xl font-bold text-fg tabular-nums mt-1">{won(logSummary.grandTotal)}원</p>
                <p className="text-sm text-sub mt-2 tabular-nums">
                  {t('settlement.logSummary', {
                    count: filteredLogs.length,
                    km: logSummary.totalDistance.toLocaleString('ko-KR'),
                    fuel: won(logSummary.totalFuelCost),
                    toll: won(logSummary.totalTollFee),
                    parking: won(logSummary.totalParkingFee)
                  })}
                </p>
                <p className="text-xs text-muted mt-1">{conditionLine}</p>
                <div className="flex flex-wrap gap-2 mt-4">
                  <button onClick={copyLogSettlement} className="ui-btn flex items-center gap-1.5 px-4 py-2 text-sm">
                    {logCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    <span>{logCopied ? tc('copied') : t('settlement.copy')}</span>
                  </button>
                  <button onClick={exportToCSV} className="ui-btn-soft flex items-center gap-1.5 px-4 py-2 text-sm">
                    <Download className="w-4 h-4" />
                    <span>{t('drivingLog.export.csv')}</span>
                  </button>
                  <button onClick={clearAllDrivingLogs} className="flex items-center gap-1.5 px-3 py-2 text-sm text-muted hover:text-red-600 rounded-lg transition-colors ml-auto">
                    <Trash2 className="w-4 h-4" />
                    <span>{t('drivingLog.export.clear')}</span>
                  </button>
                </div>
              </div>
            )}

            {drivingLogs.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted">{t('drivingLog.noEntries')}</p>
                <p className="text-sm text-faint mt-1">{t('drivingLog.addFirst')}</p>
              </div>
            ) : filteredLogs.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted">{t('drivingLog.noEntriesInPeriod')}</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm tabular-nums">
                  <thead>
                    <tr className="border-b border-line">
                      <th className="text-left py-3 px-2 font-medium text-sub">{t('drivingLog.date')}</th>
                      <th className="text-left py-3 px-2 font-medium text-sub">{t('drivingLog.routeMemo')}</th>
                      <th className="text-right py-3 px-2 font-medium text-sub">{t('drivingLog.distance')}</th>
                      <th className="text-right py-3 px-2 font-medium text-sub">{t('drivingLog.fuelCost')}</th>
                      <th className="text-right py-3 px-2 font-medium text-sub">{t('drivingLog.tollFee')}</th>
                      <th className="text-right py-3 px-2 font-medium text-sub">{t('drivingLog.parkingFee')}</th>
                      <th className="text-right py-3 px-2 font-medium text-sub">{t('drivingLog.totalCost')}</th>
                      <th className="py-3 px-2"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredLogs.map((log) => {
                      const km = logKm(log)
                      const fuelCost = calculateLogFuelCost(km)
                      const total = log.tollFee + log.parkingFee + fuelCost
                      return (
                        <tr key={log.id} className="border-b border-line hover:bg-subtle">
                          <td className="py-3 px-2 whitespace-nowrap">{log.date}</td>
                          <td className="py-3 px-2 text-body max-w-[180px] truncate">{log.memo}</td>
                          <td className="py-3 px-2 text-right whitespace-nowrap">
                            {km.toLocaleString('ko-KR')}km
                            {log.roundTrip && <span className="block text-xs text-muted">{t('trip.roundTrip')}</span>}
                          </td>
                          <td className="py-3 px-2 text-right">{won(fuelCost)}원</td>
                          <td className="py-3 px-2 text-right">{won(log.tollFee)}원</td>
                          <td className="py-3 px-2 text-right">{won(log.parkingFee)}원</td>
                          <td className="py-3 px-2 text-right font-medium text-fg">{won(total)}원</td>
                          <td className="py-3 px-2">
                            <button
                              onClick={() => removeDrivingLogEntry(log.id)}
                              className="p-1 text-faint hover:text-red-600 transition-colors"
                              aria-label={t('drivingLog.delete')}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="bg-subtle font-medium">
                      <td className="py-3 px-2" colSpan={2}>{t('drivingLog.summary.title')}</td>
                      <td className="py-3 px-2 text-right">{logSummary.totalDistance.toLocaleString('ko-KR')}km</td>
                      <td className="py-3 px-2 text-right">{won(logSummary.totalFuelCost)}원</td>
                      <td className="py-3 px-2 text-right">{won(logSummary.totalTollFee)}원</td>
                      <td className="py-3 px-2 text-right">{won(logSummary.totalParkingFee)}원</td>
                      <td className="py-3 px-2 text-right font-bold text-fg">{won(logSummary.grandTotal)}원</td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Guide Content - Only show on calculator tab */}
      {activeTab === 'calculator' && (
        <div className="mt-16 space-y-12">
          {/* Business Expense Guide */}
          <div className="bg-subtle rounded-2xl p-8">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-fg mb-4">
                {t('businessExpense.title')}
              </h2>
              <p className="text-lg text-sub max-w-3xl mx-auto">
                {t('businessExpense.subtitle')}
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              {/* Accurate Calculation */}
              <div className="bg-surface rounded-xl p-6 shadow-lg">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-lg">
                    <Calculator className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                  </div>
                  <h3 className="text-xl font-semibold text-fg">
                    {t('businessExpense.features.accurate.title')}
                  </h3>
                </div>
                <p className="text-sub mb-4">
                  {t('businessExpense.features.accurate.description')}
                </p>
                <ul className="space-y-2">
                  {[0, 1, 2].map((i) => (
                    <li key={i} className="flex items-start space-x-2">
                      <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                      <div>
                        <div className="font-medium text-fg">
                          {t(`businessExpense.features.accurate.points.${i}.title`)}
                        </div>
                        <div className="text-sm text-sub">
                          {t(`businessExpense.features.accurate.points.${i}.content`)}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Legal Compliance */}
              <div className="bg-surface rounded-xl p-6 shadow-lg">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="p-3 bg-green-100 dark:bg-green-900 rounded-lg">
                    <Shield className="w-6 h-6 text-green-600 dark:text-green-400" />
                  </div>
                  <h3 className="text-xl font-semibold text-fg">
                    {t('businessExpense.features.legal.title')}
                  </h3>
                </div>
                <p className="text-sub mb-4">
                  {t('businessExpense.features.legal.description')}
                </p>
                <ul className="space-y-2">
                  {[0, 1, 2].map((i) => (
                    <li key={i} className="flex items-start space-x-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0"></div>
                      <div>
                        <div className="font-medium text-fg">
                          {t(`businessExpense.features.legal.points.${i}.title`)}
                        </div>
                        <div className="text-sm text-sub">
                          {t(`businessExpense.features.legal.points.${i}.content`)}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Practical Tools */}
              <div className="bg-surface rounded-xl p-6 shadow-lg">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="p-3 bg-purple-100 dark:bg-purple-900 rounded-lg">
                    <FileText className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                  </div>
                  <h3 className="text-xl font-semibold text-fg">
                    {t('businessExpense.features.practical.title')}
                  </h3>
                </div>
                <p className="text-sub mb-4">
                  {t('businessExpense.features.practical.description')}
                </p>
                <ul className="space-y-2">
                  {[0, 1, 2].map((i) => (
                    <li key={i} className="flex items-start space-x-2">
                      <div className="w-2 h-2 bg-purple-500 rounded-full mt-2 flex-shrink-0"></div>
                      <div>
                        <div className="font-medium text-fg">
                          {t(`businessExpense.features.practical.points.${i}.title`)}
                        </div>
                        <div className="text-sm text-sub">
                          {t(`businessExpense.features.practical.points.${i}.content`)}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          {/* Expense Rules */}
          <div className="bg-surface rounded-2xl shadow-xl p-8">
            <div className="text-center mb-8">
              <div className="flex items-center justify-center space-x-3 mb-4">
                <BookOpen className="w-8 h-8 text-indigo-600" />
                <h2 className="text-3xl font-bold text-fg">
                  {t('expenseRules.title')}
                </h2>
              </div>
              <p className="text-lg text-sub">
                {t('expenseRules.description')}
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
              {/* Personal Car */}
              <div className="bg-subtle rounded-xl p-6">
                <h3 className="text-xl font-semibold text-fg mb-2">
                  {t('expenseRules.personalCar.title')}
                </h3>
                <p className="text-sub mb-4">
                  {t('expenseRules.personalCar.description')}
                </p>
                <ul className="space-y-2">
                  {[0, 1, 2, 3].map((i) => (
                    <li key={i} className="flex items-start space-x-2">
                      <div className="w-2 h-2 bg-indigo-500 rounded-full mt-2 flex-shrink-0"></div>
                      <span className="text-sm text-body">
                        {t(`expenseRules.personalCar.details.${i}`)}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Company Car */}
              <div className="bg-subtle rounded-xl p-6">
                <h3 className="text-xl font-semibold text-fg mb-2">
                  {t('expenseRules.companyCar.title')}
                </h3>
                <p className="text-sub mb-4">
                  {t('expenseRules.companyCar.description')}
                </p>
                <ul className="space-y-2">
                  {[0, 1, 2, 3].map((i) => (
                    <li key={i} className="flex items-start space-x-2">
                      <div className="w-2 h-2 bg-indigo-500 rounded-full mt-2 flex-shrink-0"></div>
                      <span className="text-sm text-body">
                        {t(`expenseRules.companyCar.details.${i}`)}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          {/* Cost Optimization */}
          <div className="bg-subtle rounded-2xl p-8">
            <div className="text-center mb-8">
              <div className="flex items-center justify-center space-x-3 mb-4">
                <TrendingUp className="w-8 h-8 text-green-600" />
                <h2 className="text-3xl font-bold text-fg">
                  {t('costOptimization.title')}
                </h2>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
              {/* Fuel Efficiency */}
              <div className="bg-surface rounded-xl p-6 shadow-lg">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="p-3 bg-green-100 dark:bg-green-900 rounded-lg">
                    <Fuel className="w-6 h-6 text-green-600 dark:text-green-400" />
                  </div>
                  <h3 className="text-xl font-semibold text-fg">
                    {t('costOptimization.fuelEfficiency.title')}
                  </h3>
                </div>
                <div className="space-y-4">
                  {[0, 1, 2, 3].map((i) => (
                    <div key={i} className="bg-subtle rounded-lg p-4">
                      <div className="font-medium text-fg mb-1">
                        {t(`costOptimization.fuelEfficiency.methods.${i}.title`)}
                      </div>
                      <div className="text-sm text-sub">
                        {t(`costOptimization.fuelEfficiency.methods.${i}.content`)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Maintenance */}
              <div className="bg-surface rounded-xl p-6 shadow-lg">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="p-3 bg-orange-100 dark:bg-orange-900 rounded-lg">
                    <Wrench className="w-6 h-6 text-orange-600 dark:text-orange-400" />
                  </div>
                  <h3 className="text-xl font-semibold text-fg">
                    {t('costOptimization.maintenance.title')}
                  </h3>
                </div>
                <div className="space-y-4">
                  {[0, 1, 2].map((i) => (
                    <div key={i} className="bg-subtle rounded-lg p-4">
                      <div className="font-medium text-fg mb-1">
                        {t(`costOptimization.maintenance.tips.${i}.title`)}
                      </div>
                      <div className="text-sm text-sub">
                        {t(`costOptimization.maintenance.tips.${i}.content`)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <GuideSection translate={t} />
    </div>
  )
}

export default FuelCalculator
