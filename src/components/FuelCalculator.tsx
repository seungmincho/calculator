'use client'

import { useState, useCallback, useEffect, useMemo, useRef } from 'react'
import { useSearchParams } from '@/hooks/useSearchParams'
import { useTranslations } from '@/lib/i18n/fuelCalculator'
import {
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
import { calculateTripCosts, fuelNumber, logFuelCost } from '@/utils/fuelTrip'

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
  light: { id: 'light', efficiency: 16.0, depreciation: 80 },
  compact: { id: 'compact', efficiency: 14.5, depreciation: 100 },
  midsize: { id: 'midsize', efficiency: 12.0, depreciation: 130 },
  fullsize: { id: 'fullsize', efficiency: 10.5, depreciation: 160 },
  suv: { id: 'suv', efficiency: 9.5, depreciation: 180 },
  van: { id: 'van', efficiency: 8.5, depreciation: 200 },
  truck: { id: 'truck', efficiency: 7.0, depreciation: 250 }
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
const SHARE_KEYS = ['distance', 'rt', 'vehicleType', 'fuelType', 'eff', 'dm', 'date', 'sido', 'price', 'mode', 'people', 'toll', 'parking']

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
  { code: '', key: 'all' },
  { code: '01', key: 'seoul' },
  { code: '02', key: 'gyeonggi' },
  { code: '03', key: 'gangwon' },
  { code: '04', key: 'chungbuk' },
  { code: '05', key: 'chungnam' },
  { code: '06', key: 'jeonbuk' },
  { code: '08', key: 'gyeongbuk' },
  { code: '09', key: 'gyeongnam' },
  { code: '10', key: 'busan' },
  { code: '11', key: 'jeju' },
  { code: '14', key: 'daegu' },
  { code: '15', key: 'incheon' },
  { code: '17', key: 'daejeon' },
  { code: '18', key: 'ulsan' },
  { code: '19', key: 'sejong' },
  { code: '20', key: 'jeonnamGwangju' },
] as const
// OPINET 이 전남(07)·광주(16)를 전남광주(20) 하나로 합쳤다 — 예전 저장값·공유 링크를 옮긴다
const sidoCode = (code?: string | null) => code === '07' || code === '16' ? '20' : code || ''

interface DrivingLogEntry {
  id: string
  date: string
  distance: number // 편도(또는 입력한) 거리
  roundTrip?: boolean // true면 distance × 2
  tollFee: number
  parkingFee: number
  memo: string
  settlement?: number
  people?: number
  mode?: 'quick' | 'split'
  snapshot?: VehicleSettings & { priceSource: 'default' | 'manual' | 'opinet'; priceDate: string }
}

const logKm = (log: Pick<DrivingLogEntry, 'distance' | 'roundTrip'>) => log.distance * (log.roundTrip ? 2 : 1)

const FuelCalculator = () => {
  const t = useTranslations('fuelCalculator')
  const tc = useTranslations('common')
  const currentSearchParams = useSearchParams()
  const [searchParams] = useState(() => new URLSearchParams(currentSearchParams))
  const priceRequest = useRef(0)

  // Tab state
  const [activeTab, setActiveTab] = useState<'calculator' | 'drivingLog'>('calculator')

  // Calculator state
  // First render matches static HTML; restore shared inputs after hydration.
  const [distance, setDistance] = useState(100)
  const [roundTrip, setRoundTrip] = useState(false)
  const [vehicleType, setVehicleType] = useState('compact')
  const [fuelType, setFuelType] = useState<FuelType>('gasoline')
  const [mode, setMode] = useState<'quick' | 'split'>('quick')
  const [people, setPeople] = useState(4)
  const [tollFee, setTollFee] = useState(0)
  const [parkingFee, setParkingFee] = useState(0)
  const [tripMemo, setTripMemo] = useState('')
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
  const [shareUrl, setShareUrl] = useState<string>() // 공유 링크 = 현재 주소 + 유가 기준일(실시간이면 그날 날짜로 고정)

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
          setCustomEfficiency(fuelNumber(s.customEfficiency, 0, 0, 100))
          setUseCustomEfficiency(s.useCustomEfficiency === true && fuelNumber(s.customEfficiency, 0, .1, 100) > 0)
        } catch {
          // ignore invalid vehicle settings data
        }
      }
    }

    const savedLogs = safeStorage.getItem(STORAGE_KEYS.DRIVING_LOG)
    if (savedLogs) {
      try {
        const parsed = JSON.parse(savedLogs)
        if (Array.isArray(parsed)) setDrivingLogs(parsed.filter(log => log && typeof log.id === 'string' && typeof log.date === 'string' && Number.isFinite(log.distance) && log.distance > 0).map(log => ({
          ...log,
          tollFee: fuelNumber(log.tollFee, 0, 0, 10000000, true),
          parkingFee: fuelNumber(log.parkingFee, 0, 0, 10000000, true),
          memo: typeof log.memo === 'string' ? log.memo : '',
        })))
      } catch {
        // ignore invalid driving log data
      }
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── OPINET 유가 가져오기 (실시간 또는 과거 날짜) ──
  const fetchOpinetPrices = useCallback(async (sido?: string, date?: string) => {
    const request = ++priceRequest.current
    setPriceLoading(true)
    setPriceNoData(false)
    setPriceFallback(null)
    const apply = (p: Partial<Record<FuelType, number>>, basis: string) => {
      if (request !== priceRequest.current) return
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
      const res = await fetch(`/api/fuel-prices${qs ? `?${qs}` : ''}`, { signal: AbortSignal.timeout(15000) })
      if (!res.ok) throw new Error('API error')
      const data = await res.json()
      if (request !== priceRequest.current) return

      // Supabase 과거 데이터 응답
      if (data.source === 'supabase' && Array.isArray(data.data)) {
        // RPC 는 전국 조회에 18행을 주는데 지역이 16·17개인 날이면 전날 행이 섞인다 — 가장 최근 날짜만
        const rows = (data.data as Array<{ gasoline?: number; premium_gasoline?: number; diesel?: number; lpg?: number; trade_date?: string; sido_cd?: string }>)
          .filter((r, _, all) => r.trade_date === all[0].trade_date)
        let gasoline = 0, premiumGasoline = 0, diesel = 0, lpg = 0
        // 전국은 OPINET 전국 평균 행('00')이 있으면 그대로 — 시도 단순 평균은 주유소 수 가중이 없어 실시간 전국가와 다르다
        const one = sido ? rows[0] : rows.find(r => r.sido_cd === '00')
        if (rows.length > 0) {
          if (one) {
            gasoline = Math.round(Number(one.gasoline ?? 0))
            premiumGasoline = Math.round(Number(one.premium_gasoline ?? 0))
            diesel = Math.round(Number(one.diesel ?? 0))
            lpg = Math.round(Number(one.lpg ?? 0))
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
      if (request === priceRequest.current && date) setPriceNoData(true)
    } finally {
      if (request === priceRequest.current) setPriceLoading(false)
    }
  }, [])

  // 마운트 시 OPINET 가격 자동 로드 + localStorage에서 감가비 계수/지역 복원
  useEffect(() => {
    const savedMultiplier = safeStorage.getItem('fuel_depreciation_multiplier')
    if (savedMultiplier) setDepreciationMultiplier(fuelNumber(savedMultiplier, 1, 1, 1.5))
    // 공유 링크의 지역·기준일·유가가 내 저장 지역·실시간 유가보다 우선
    const qSido = searchParams.get('sido')
    const sido = sidoCode(qSido !== null && SIDO_OPTIONS.some(o => o.code === sidoCode(qSido)) ? qSido : safeStorage.getItem('fuel_selected_sido'))
    const qDate = normDate(searchParams.get('date') ?? '')
    const date = qDate && qDate < localDate() ? qDate : '' // 오늘 이후면 실시간
    setSelectedSido(sido)
    setSelectedDate(date)
    // price = 네 연료 단가 스냅샷(휘발유-고급-경유-LPG) 또는 선택 연료 단가 하나(이전 형식) — 조회하지 않고 그대로 쓴다
    const parts = (searchParams.get('price') ?? '').split('-').map(Number)
    const sharedFuel = searchParams.get('fuelType')
    const selectedFuel = isFuelType(sharedFuel) ? sharedFuel : 'gasoline'
    const shared: Partial<Record<FuelType, number>> = parts.length === 1
      ? { [selectedFuel]: parts[0] }
      : Object.fromEntries(FUEL_TYPES.map((f, i) => [f, parts[i]]))
    const ok = (n = 0) => n > 0 && n < 10000
    if (ok(shared[selectedFuel])) {
      setFuelPrices(prev => {
        const next = { ...prev }
        for (const f of FUEL_TYPES) if (ok(shared[f])) next[f] = shared[f]!
        return next
      })
      setPriceSource(searchParams.get('source') === 'default' ? 'default' : qDate ? 'opinet' : 'manual')
      setPriceDate(qDate)
      return
    }
    fetchOpinetPrices(sido || undefined, date || undefined)
  }, [fetchOpinetPrices]) // eslint-disable-line react-hooks/exhaustive-deps

  // 공유 링크의 직접 입력 연비·감가비 계수 복원 (위 localStorage 값보다 우선, 첫 렌더 시점 쿼리 기준)
  useEffect(() => {
    if (!SHARE_KEYS.some(k => searchParams.has(k))) return
    setDistance(fuelNumber(searchParams.get('distance'), 100, 0, 100000))
    setRoundTrip(searchParams.get('rt') === '1')
    const vehicle = searchParams.get('vehicleType'), fuel = searchParams.get('fuelType')
    setVehicleType(isVehicleType(vehicle) ? vehicle : 'compact')
    setFuelType(isFuelType(fuel) ? fuel : 'gasoline')
    setMode(searchParams.get('mode') === 'split' ? 'split' : 'quick')
    setPeople(fuelNumber(searchParams.get('people'), 4, 1, 100, true))
    setTollFee(fuelNumber(searchParams.get('toll'), 0, 0, 10000000, true))
    setParkingFee(fuelNumber(searchParams.get('parking'), 0, 0, 10000000, true))
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
    setOrDelete('distance', String(distance), distance === 100)
    setOrDelete('rt', '1', !roundTrip)
    setOrDelete('vehicleType', vehicleType, vehicleType === 'compact')
    setOrDelete('fuelType', fuelType, fuelType === 'gasoline')
    setOrDelete('eff', String(customEfficiency), !(useCustomEfficiency && customEfficiency > 0))
    setOrDelete('dm', String(depreciationMultiplier), depreciationMultiplier === 1)
    setOrDelete('mode', mode, mode === 'quick')
    setOrDelete('people', String(people), people === 4)
    setOrDelete('toll', String(tollFee), tollFee === 0)
    setOrDelete('parking', String(parkingFee), parkingFee === 0)
    // 유가 기준은 주소창에 남기지 않는다(북마크·새로고침은 최신 유가). 받은 링크의 옛 기준도 여기서 지운다.
    for (const k of ['date', 'sido', 'price', 'source']) url.searchParams.delete(k)
    window.history.replaceState({}, '', url)
    // 공유 링크에는 적용된 단가 자체를 박는다 — 과거 유가 DB 공백·전국 평균 산식 차이와 무관하게 받는 사람도 같은 금액.
    // OPINET이면 표시용 기준일(실제 적용된 날짜)과 지역(전국 = 빈 값)도 함께.
    url.searchParams.set('price', FUEL_TYPES.map(f => fuelPrices[f]).join('-'))
    url.searchParams.set('source', priceSource)
    if (priceSource === 'opinet') {
      url.searchParams.set('date', priceDate)
      url.searchParams.set('sido', selectedSido)
    }
    setShareUrl(url.toString())
  }, [distance, roundTrip, vehicleType, fuelType, customEfficiency, useCustomEfficiency, depreciationMultiplier, selectedSido, priceSource, priceDate, fuelPrices, mode, people, tollFee, parkingFee])

  const efficiency = useCustomEfficiency && customEfficiency > 0
    ? customEfficiency
    : getAdjustedEfficiency(VEHICLE_TYPES[vehicleType].efficiency, fuelType)
  const tripKm = distance > 0 ? distance * (roundTrip ? 2 : 1) : 0

  // 유류비 계산 — 렌더 중 계산(useMemo)이라 서버 HTML에도 기본값(100km) 결과가 들어감
  const calculation = useMemo<FuelCalculation | null>(() => {
    if (!Number.isFinite(tripKm) || tripKm <= 0 || tripKm > 200000 || !Number.isFinite(efficiency) || efficiency <= 0 || efficiency > 100 || (useCustomEfficiency && customEfficiency <= 0) || fuelPrices[fuelType] <= 0) return null
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
  }, [tripKm, efficiency, fuelPrices, fuelType, depreciationMultiplier, vehicleType, useCustomEfficiency, customEfficiency])

  const tripCosts = useMemo(() => calculation ? calculateTripCosts(calculation.settlement, tollFee, parkingFee, people) : null, [calculation, tollFee, parkingFee, people])
  const resultAmount = tripCosts ? (mode === 'split' ? tripCosts.perPerson : tripCosts.total) : 0

  // 유가 출처 문구 (예: "OPINET 서울 · 2026-09-30 기준")
  const sidoKey = SIDO_OPTIONS.find(s => s.code === selectedSido)?.key
  const sidoName = selectedSido ? (sidoKey ? t(`region.names.${sidoKey}`) : '') : t('priceSource.nationwide')
  const priceSourceLabel = priceSource === 'opinet'
    ? t('priceSource.opinet', { region: sidoName, date: priceDate })
    : priceSource === 'manual' ? t('priceSource.manual') : t('priceSource.default')

  // Manual fuel price editing
  const startEditingPrices = useCallback(() => {
    setTempPrices(fuelPrices)
    setIsEditingPrices(true)
  }, [fuelPrices])

  const savePrices = useCallback(() => {
    if (FUEL_TYPES.some(f => !Number.isFinite(tempPrices[f]) || tempPrices[f] <= 0 || tempPrices[f] >= 10000)) return
    priceRequest.current++
    setPriceLoading(false)
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
    if (useCustomEfficiency && (customEfficiency <= 0 || customEfficiency > 100)) return
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
      safeStorage.setItem('fuel_depreciation_multiplier', String(depreciationMultiplier))
      safeStorage.setItem('fuel_selected_sido', selectedSido)
      setSettingsFeedback(t('vehicleSettings.saved'))
      setTimeout(() => setSettingsFeedback(null), 2000)
    } else setSettingsFeedback(t('experience.storageFailed'))
  }, [vehicleType, fuelType, customEfficiency, useCustomEfficiency, fuelPrices, depreciationMultiplier, selectedSido, t])

  const loadVehicleSettings = useCallback(() => {
    const savedSettings = safeStorage.getItem(STORAGE_KEYS.VEHICLE_SETTINGS)
    if (savedSettings) {
      try {
        const settings: VehicleSettings = JSON.parse(savedSettings)
        if (isVehicleType(settings.vehicleType)) setVehicleType(settings.vehicleType)
        if (isFuelType(settings.fuelType)) setFuelType(settings.fuelType)
        setCustomEfficiency(fuelNumber(settings.customEfficiency, 0, 0, 100))
        setUseCustomEfficiency(settings.useCustomEfficiency === true && fuelNumber(settings.customEfficiency, 0, .1, 100) > 0)
        const multiplier = fuelNumber(settings.depreciationMultiplier, 1, 1, 1.5)
        setDepreciationMultiplier(multiplier)
        safeStorage.setItem('fuel_depreciation_multiplier', String(multiplier))
        const region = sidoCode(settings.selectedSido)
        const savedRegion = SIDO_OPTIONS.some(o => o.code === region) ? region : ''
        setSelectedSido(savedRegion)
        safeStorage.setItem('fuel_selected_sido', savedRegion)
        setSelectedDate('')
        fetchOpinetPrices(savedRegion || undefined)
        setSettingsFeedback(t('vehicleSettings.loaded'))
        setTimeout(() => setSettingsFeedback(null), 2000)
      } catch {
        // ignore invalid vehicle settings data
      }
    } else {
      setSettingsFeedback(t('vehicleSettings.noSaved'))
      setTimeout(() => setSettingsFeedback(null), 2000)
    }
  }, [t, fetchOpinetPrices])

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
      priceRequest.current++
      setPriceLoading(false)
      setPriceNoData(false)
      setPriceFallback(null)
      setActiveTab('calculator')
      setDistance(fuelNumber(inputs.distance, 100, 0, 100000))
      setRoundTrip(!!inputs.roundTrip)
      setMode(inputs.mode === 'split' ? 'split' : 'quick')
      setPeople(fuelNumber(inputs.people, 4, 1, 100, true))
      setTollFee(fuelNumber(inputs.tollFee, 0, 0, 10000000, true))
      setParkingFee(fuelNumber(inputs.parkingFee, 0, 0, 10000000, true))
      setTripMemo(typeof inputs.tripMemo === 'string' ? inputs.tripMemo : '')
      setVehicleType(isVehicleType(inputs.vehicleType) ? inputs.vehicleType : 'compact')
      setFuelType(isFuelType(inputs.fuelType) ? inputs.fuelType : 'gasoline')
      setCustomEfficiency(fuelNumber(inputs.customEfficiency, 0, 0, 100))
      setUseCustomEfficiency(inputs.useCustomEfficiency === true && fuelNumber(inputs.customEfficiency, 0, .1, 100) > 0)
      // 감가비 계수가 없는 예전 이력은 1 (정산 유류비 = 유류비 × 계수)
      const dm = Number(inputs.depreciationMultiplier)
      setDepreciationMultiplier(dm >= 1 && dm <= 1.5 ? dm : 1)
      if (inputs.fuelPrices && typeof inputs.fuelPrices === 'object') {
        // 고급휘발유 단가가 없던 예전 이력도 있음 → 저장된 연료 단가만 덮어씀
        const saved = inputs.fuelPrices as Partial<Record<FuelType, number>>
        setFuelPrices(prev => {
          const next = { ...prev }
          for (const f of FUEL_TYPES) next[f] = fuelNumber(saved[f], prev[f], 1, 9999)
          return next
        })
        setPriceSource(inputs.priceSource === 'opinet' ? 'opinet' : inputs.priceSource === 'default' ? 'default' : 'manual')
        setPriceDate(normDate(inputs.priceDate))
        setSelectedSido(sidoCode(inputs.selectedSido))
        setSelectedDate(normDate(inputs.selectedDate))
      }
    }
  }, [loadFromHistory])

  // Format history result for display
  const formatHistoryResult = useCallback((result: Record<string, unknown>) => {
    const amount = (result.tripTotal ?? result.settlement ?? result.totalCost) as number | undefined
    return `${won(amount ?? 0)}${t('share.won')}`
  }, [t])

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
      depreciationMultiplier,
      mode, people, tollFee, parkingFee, tripMemo, priceSource, priceDate, selectedSido, selectedDate,
      tripTotal: calculateTripCosts(calculation.settlement, tollFee, parkingFee, people).total,
      totalCost: calculation.totalCost
    }

    const resultData = {
      settlement: calculation.settlement,
      totalCost: calculation.totalCost,
      fuelCost: calculation.fuelCost,
      depreciationCost: calculation.depreciationCost,
      costPerKm: calculation.costPerKm,
      fuelConsumption: calculation.fuelConsumption,
      tripTotal: calculateTripCosts(calculation.settlement, tollFee, parkingFee, people).total
    }

    const success = saveCalculation(inputs, resultData)
    if (success) {
      setIsSaved(true)
      setTimeout(() => setIsSaved(false), 2000)
    } else setLogFeedback(t('experience.storageFailed'))
  }, [calculation, distance, roundTrip, vehicleType, fuelType, customEfficiency, useCustomEfficiency, fuelPrices, depreciationMultiplier, saveCalculation, mode, people, tollFee, parkingFee, tripMemo, priceSource, priceDate, selectedSido, selectedDate, t])

  const snapshot = useMemo(() => ({
    vehicleType, fuelType, customEfficiency, useCustomEfficiency, fuelPrices,
    depreciationMultiplier, selectedSido, priceSource, priceDate, savedAt: new Date().toISOString(),
  }), [vehicleType, fuelType, customEfficiency, useCustomEfficiency, fuelPrices, depreciationMultiplier, selectedSido, priceSource, priceDate])

  const persistLogs = useCallback((logs: DrivingLogEntry[]) => {
    if (!safeStorage.setItem(STORAGE_KEYS.DRIVING_LOG, JSON.stringify(logs))) {
      setLogFeedback(t('experience.storageFailed'))
      return false
    }
    setDrivingLogs(logs)
    return true
  }, [t])

  // Driving log functions
  const addDrivingLogEntry = useCallback(() => {
    if (!Number.isFinite(newLogEntry.distance) || newLogEntry.distance <= 0 || newLogEntry.distance > 100000 || (useCustomEfficiency && (customEfficiency <= 0 || customEfficiency > 100))) return
    const entry: DrivingLogEntry = {
      ...newLogEntry,
      settlement: Math.round(logKm(newLogEntry) / efficiency * fuelPrices[fuelType] * depreciationMultiplier),
      snapshot,
      date: newLogEntry.date || localDate(),
      id: Date.now().toString() + Math.random().toString(36).slice(2, 11)
    }
    if (!persistLogs([entry, ...drivingLogs])) return
    // Reset form (날짜·왕복 여부는 유지 → 연속 입력이 빠름)
    setNewLogEntry(prev => ({ ...prev, distance: 0, tollFee: 0, parkingFee: 0, memo: '' }))
  }, [newLogEntry, drivingLogs, persistLogs, efficiency, fuelPrices, fuelType, depreciationMultiplier, snapshot, useCustomEfficiency, customEfficiency])

  // 계산기 결과를 주행일지에 바로 추가 (출장일 선택 시 그 날짜로)
  const addCurrentTripToLog = useCallback(() => {
    if (!calculation) return
    const entry: DrivingLogEntry = {
      id: Date.now().toString() + Math.random().toString(36).slice(2, 11),
      date: selectedDate || localDate(),
      distance,
      roundTrip,
      tollFee,
      parkingFee,
      memo: tripMemo,
      settlement: Math.round(calculation.settlement),
      snapshot, mode, people,
    }
    if (!persistLogs([entry, ...drivingLogs])) return
    setLogFeedback(t('trip.addedToLog', { date: entry.date }))
    setTimeout(() => setLogFeedback(null), 2500)
  }, [distance, roundTrip, selectedDate, drivingLogs, persistLogs, t, calculation, tollFee, parkingFee, tripMemo, snapshot, mode, people])

  const removeDrivingLogEntry = useCallback((id: string) => {
    persistLogs(drivingLogs.filter(log => log.id !== id))
  }, [drivingLogs, persistLogs])

  const clearAllDrivingLogs = useCallback(() => {
    if (window.confirm(t('drivingLog.export.confirmClear'))) {
      setDrivingLogs([])
      safeStorage.removeItem(STORAGE_KEYS.DRIVING_LOG)
    }
  }, [t])

  // 새 기록은 저장 금액, 이전 형식 기록은 현재 차량·유가·감가비 계수 적용
  const calculateLogFuelCost = useCallback((log: DrivingLogEntry): number =>
    logFuelCost(log.settlement, (logKm(log) / efficiency) * fuelPrices[fuelType] * depreciationMultiplier),
  [efficiency, fuelPrices, fuelType, depreciationMultiplier])

  const loadLogInCalculator = (log: DrivingLogEntry) => {
    const s = log.snapshot
    if (s) {
      priceRequest.current++
      setPriceLoading(false)
      setPriceNoData(false)
      setPriceFallback(null)
      if (isVehicleType(s.vehicleType)) setVehicleType(s.vehicleType)
      if (isFuelType(s.fuelType)) setFuelType(s.fuelType)
      setCustomEfficiency(fuelNumber(s.customEfficiency, 0, 0, 100))
      setUseCustomEfficiency(s.useCustomEfficiency === true && fuelNumber(s.customEfficiency, 0, .1, 100) > 0)
      setFuelPrices(prev => Object.fromEntries(FUEL_TYPES.map(f => [f, fuelNumber(s.fuelPrices?.[f], prev[f], 1, 9999)])) as Record<FuelType, number>)
      setDepreciationMultiplier(fuelNumber(s.depreciationMultiplier, 1, 1, 1.5))
      setSelectedSido(sidoCode(s.selectedSido))
      setPriceSource(s.priceSource === 'opinet' ? 'opinet' : s.priceSource === 'default' ? 'default' : 'manual')
      setPriceDate(normDate(s.priceDate))
    }
    setDistance(log.distance)
    setRoundTrip(!!log.roundTrip)
    setTollFee(log.tollFee)
    setParkingFee(log.parkingFee)
    setTripMemo(log.memo)
    setSelectedDate(log.date)
    setMode(log.mode === 'split' ? 'split' : 'quick')
    setPeople(fuelNumber(log.people, 4, 1, 100, true))
    setActiveTab('calculator')
  }

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
    const totalFuelCost = filteredLogs.reduce((sum, log) => sum + calculateLogFuelCost(log), 0)
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
      total: logs.reduce((sum, log) => sum + calculateLogFuelCost(log) + log.tollFee + log.parkingFee, 0)
    }
  }, [drivingLogs, calculateLogFuelCost])

  const filterLabel = t(`drivingLog.filter.${dateFilter}`)
  const conditionLine = t('settlement.condition', {
    vehicle: t(`vehicleTypes.${vehicleType}`),
    fuel: t(`fuelTypes.${fuelType}`),
    efficiency: efficiency.toFixed(1),
    price: won(fuelPrices[fuelType]),
    multiplier: depreciationMultiplier.toFixed(2),
    source: priceSourceLabel
  })

  const logCondition = useCallback((log: DrivingLogEntry) => {
    const s = log.snapshot
    if (!s || !isVehicleType(s.vehicleType) || !isFuelType(s.fuelType)) return conditionLine
    const regionKey = SIDO_OPTIONS.find(o => o.code === s.selectedSido)?.key ?? 'all'
    return t('settlement.condition', {
      vehicle: t(`vehicleTypes.${s.vehicleType}`), fuel: t(`fuelTypes.${s.fuelType}`),
      efficiency: (s.useCustomEfficiency ? fuelNumber(s.customEfficiency, efficiency, .1, 100) : getAdjustedEfficiency(VEHICLE_TYPES[s.vehicleType].efficiency, s.fuelType)).toFixed(1),
      price: won(fuelNumber(s.fuelPrices?.[s.fuelType], fuelPrices[s.fuelType], 1, 9999)), multiplier: fuelNumber(s.depreciationMultiplier, 1, 1, 1.5).toFixed(2),
      source: s.priceSource === 'opinet' ? t('priceSource.opinet', { region: t(`region.names.${regionKey}`), date: s.priceDate }) : t(s.priceSource === 'default' ? 'priceSource.default' : 'priceSource.manual'),
    })
  }, [conditionLine, efficiency, fuelPrices, t])

  const logSplitLine = useCallback((log: DrivingLogEntry) => {
    if (log.mode !== 'split') return ''
    const c = calculateTripCosts(calculateLogFuelCost(log), log.tollFee, log.parkingFee, log.people ?? 4)
    return t('experience.splitLine', { people: c.people, amount: won(c.perPerson), last: won(c.lastPerson) })
  }, [calculateLogFuelCost, t])

  // Export driving logs (현재 필터) to CSV
  const exportToCSV = useCallback(() => {
    if (filteredLogs.length === 0) return
    const q = (s: string) => `"${(/^[=+@\-\t\r]/.test(s) ? "'" + s : s).replace(/"/g, '""')}"`
    const headers = [t('drivingLog.date'), t('drivingLog.distance'), t('trip.roundTrip'), t('settlement.km'), t('drivingLog.tollFee'), t('drivingLog.parkingFee'), t('drivingLog.fuelCost'), t('drivingLog.totalCost'), t('drivingLog.routeMemo'), t('experience.savedBasis'), t('experience.split')]
    const rows = filteredLogs.map(log => {
      const fuelCost = calculateLogFuelCost(log)
      return [log.date, log.distance, log.roundTrip ? 'Y' : '', logKm(log), log.tollFee, log.parkingFee, fuelCost, log.tollFee + log.parkingFee + fuelCost, q(log.memo), q(logCondition(log)), q(logSplitLine(log))].join(',')
    })
    rows.push([t('drivingLog.summary.title'), '', '', logSummary.totalDistance, logSummary.totalTollFee, logSummary.totalParkingFee, logSummary.totalFuelCost, logSummary.grandTotal, '', q(t('experience.logBasisHint')), ''].join(','))
    downloadFile('﻿' + [headers.map(q).join(','), ...rows].join('\n'), `${t('share.logFile')}_${localDate()}.csv`, 'text/csv;charset=utf-8')
  }, [filteredLogs, logSummary, calculateLogFuelCost, logCondition, logSplitLine, t])

  // 주행일지 정산서 텍스트 (결재·메신저 붙여넣기용)
  const copyLogSettlement = useCallback(async () => {
    if (filteredLogs.length === 0) return
    const lines = [...filteredLogs].sort((a, b) => a.date.localeCompare(b.date)).map(log => {
      const fuelCost = calculateLogFuelCost(log)
      return [t('settlement.logLine', {
        date: log.date,
        memo: log.memo || '-',
        km: logKm(log).toLocaleString('ko-KR'),
        trip: log.roundTrip ? t('trip.roundTrip') : t('trip.oneWay'),
        fuel: won(fuelCost),
        extra: won(log.tollFee + log.parkingFee),
        total: won(fuelCost + log.tollFee + log.parkingFee)
      }), logCondition(log), logSplitLine(log)].filter(Boolean).join('\n')
    })
    const text = [
      t('settlement.logTitle', { period: filterLabel }),
      t('experience.logBasisHint'),
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
  }, [filteredLogs, logSummary, calculateLogFuelCost, logCondition, logSplitLine, filterLabel, t])

  // 단건 정산서 텍스트
  const settlementText = useMemo(() => {
    if (!calculation || !tripCosts) return ''
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
      t('experience.extraLine', { toll: won(tollFee), parking: won(parkingFee) }),
      t('experience.totalLine', { amount: won(tripCosts.total) }),
      ...(mode === 'split' ? [t('experience.splitLine', { people, amount: won(tripCosts.perPerson), last: won(tripCosts.lastPerson) })] : []),
      '',
      t('settlement.footer')
    ].join('\n')
  }, [calculation, distance, roundTrip, tripKm, conditionLine, efficiency, fuelPrices, fuelType, depreciationMultiplier, t, tripCosts, tollFee, parkingFee, mode, people])

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
    downloadFile(content, `${t('share.settlementFile')}_${localDate()}.txt`, 'text/plain;charset=utf-8')
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
            isLoading={historyLoading}
            onLoadHistory={handleLoadFromHistory}
            onRemoveHistory={removeHistory}
            onClearHistories={clearHistories}
            formatResult={formatHistoryResult}
          />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-line pb-4">
        <button
          onClick={() => setActiveTab('calculator')}
          aria-pressed={activeTab === 'calculator'}
          className={`px-5 py-3 min-h-11 rounded-xl text-sm font-medium transition-colors motion-reduce:transition-none ${
            activeTab === 'calculator'
              ? 'bg-primary text-white'
              : 'bg-soft text-sub hover:bg-track'
          }`}
        >
          <div className="flex items-center space-x-2">

            <span>{t('tabs.calculator')}</span>
          </div>
        </button>
        <button
          onClick={() => setActiveTab('drivingLog')}
          aria-pressed={activeTab === 'drivingLog'}
          className={`px-5 py-3 min-h-11 rounded-xl text-sm font-medium transition-colors motion-reduce:transition-none ${
            activeTab === 'drivingLog'
              ? 'bg-primary text-white'
              : 'bg-soft text-sub hover:bg-track'
          }`}
        >
          <div className="flex items-center space-x-2">

            <span>{t('tabs.drivingLog')}</span>
            {drivingLogs.length > 0 && (
              <span className="bg-primary-soft text-primary px-2 py-0.5 rounded-full text-xs">
                {drivingLogs.length}
              </span>
            )}
          </div>
        </button>
      </div>

      {/* Calculator Tab */}
      {activeTab === 'calculator' && (
        <div className="space-y-6">
          <div className="relative grid grid-cols-2 gap-1 rounded-2xl bg-soft p-1 max-w-md" role="group" aria-label={t('experience.mode')}>
            <span aria-hidden="true" className={`absolute inset-y-1 left-1 w-[calc(50%-4px)] rounded-xl bg-primary transition-transform duration-200 motion-reduce:transition-none ${mode === 'split' ? 'translate-x-full' : ''}`} />
            {(['quick', 'split'] as const).map(m => <button key={m} onClick={() => setMode(m)} aria-pressed={mode === m} className={`relative min-h-11 rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors motion-reduce:transition-none ${mode === m ? 'text-white' : 'text-sub'}`}>{t(`experience.${m}`)}</button>)}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
            <section id="fuel-calculator-result" aria-label={t('result.title')} className="ui-card bg-subtle p-5 sm:p-7 scroll-mt-20 lg:col-start-2 lg:row-start-1">
              {calculation && tripCosts ? <>
                <div aria-live="polite" aria-atomic="true">
                  <p className="text-sm font-medium text-sub">{t(mode === 'split' ? 'experience.perPerson' : 'experience.tripTotal')}</p>
                  <p className="mt-2 text-4xl sm:text-5xl font-bold tracking-tight text-fg tabular-nums" data-testid="fuel-headline">{won(resultAmount)}<span className="ml-1 text-xl font-semibold">{t('share.won')}</span></p>
                  <p className="mt-2 text-sm text-sub tabular-nums">{mode === 'split' ? t('experience.splitBasis', { total: won(tripCosts.total), people }) : t('experience.tripBasis', { km: tripKm.toLocaleString('ko-KR'), liters: calculation.fuelConsumption.toFixed(2) })}</p>
                </div>
                <div className="mt-6 pt-4 border-t border-line space-y-3 text-sm">
                  <div className="flex justify-between gap-3"><span className="text-sub">{t('result.settlement')}</span><span className="text-fg font-medium tabular-nums">{won(tripCosts.fuel)}{t('share.won')}</span></div>
                  <div className="flex justify-between gap-3"><span className="text-sub">{t('experience.extras')}</span><span className="text-fg font-medium tabular-nums">{won(tripCosts.toll + tripCosts.parking)}{t('share.won')}</span></div>
                  {mode === 'split' && <div className="flex justify-between gap-3"><span className="text-sub">{t('experience.tripTotal')}</span><span className="text-fg font-semibold tabular-nums">{won(tripCosts.total)}{t('share.won')}</span></div>}
                </div>
                {mode === 'split' && <p className="text-xs text-sub mt-3" data-testid="fuel-split-note">{tripCosts.remainder ? t('experience.remainder', { remainder: tripCosts.remainder, last: won(tripCosts.lastPerson) }) : t('experience.evenSplit')}</p>}
                {depreciationMultiplier !== 1 && <p className="text-xs text-sub mt-3">{t('experience.multiplierApplied', { multiplier: depreciationMultiplier.toFixed(2) })}</p>}
                <p className="mt-4 text-xs text-muted">{priceLoading ? tc('loading') : priceSourceLabel} · {won(fuelPrices[fuelType])}{t('share.perLiter')}</p>
                <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <button onClick={copyResult} className="ui-btn min-h-11 px-4 py-3 inline-flex items-center justify-center gap-2"><span>{isCopied ? tc('copied') : t('settlement.copy')}</span>{isCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}</button>
                  <button onClick={addCurrentTripToLog} className="ui-btn-soft min-h-11 px-4 py-3">{t('trip.addToLog')}</button>
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  <button onClick={handleSaveCalculation} className="inline-flex items-center justify-center gap-2 min-h-11 rounded-xl border border-line-strong bg-soft px-4 py-2.5 text-sm font-medium text-body hover:bg-subtle focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">{isSaved ? <Check className="w-4 h-4" aria-hidden="true" /> : <Save className="w-4 h-4" aria-hidden="true" />}{isSaved ? tc('saved') : t('experience.saveCalculation')}</button>
                  <button onClick={downloadResult} className="inline-flex items-center justify-center gap-2 min-h-11 rounded-xl border border-line-strong bg-soft px-4 py-2.5 text-sm font-medium text-body hover:bg-subtle focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"><Download className="w-4 h-4" aria-hidden="true" />{tc('export')}</button>
                </div>
                <p className="text-xs text-muted mt-2">{t('experience.referenceHint')}</p>
              </> : <p className="py-8 text-sub" role="status">{t('experience.invalidInput')}</p>}
              {logFeedback && <p className="mt-3 text-sm text-primary" role="status">{logFeedback}</p>}
              <button onClick={() => { setDateFilter('thisMonth'); setActiveTab('drivingLog') }} className="mt-4 min-h-11 text-left text-sm text-primary hover:underline">{monthSummary.count > 0 ? t('trip.monthSummary', { count: monthSummary.count, total: won(monthSummary.total) }) : t('experience.openLog')}</button>
            </section>

            <div className="ui-card p-5 sm:p-7 space-y-5 min-w-0 lg:col-start-1 lg:row-start-1">
              <div>
                <label htmlFor="fuel-distance" className="block text-sm font-medium text-body mb-2">{t(roundTrip ? 'trip.oneWayDistance' : 'input.distance')} (km)</label>
                <input id="fuel-distance" type="number" inputMode="decimal" value={distance || ''} min="0" max="100000" step="0.1" onChange={e => setDistance(fuelNumber(e.target.value, 0, 0, 100000))} className="ui-field w-full px-4 py-3 text-3xl font-semibold tabular-nums" />
                <div className="grid grid-cols-3 gap-2 mt-3" role="group" aria-label={t('experience.quickDistance')}>
                  {[50, 100, 200].map(km => <button key={km} onClick={() => setDistance(km)} aria-pressed={distance === km} className={`min-h-11 rounded-xl px-3 py-2 text-sm transition-colors motion-reduce:transition-none ${distance === km ? 'bg-primary text-white' : 'bg-soft text-sub hover:bg-track'}`}>{t('experience.km', { km })}</button>)}
                </div>
              </div>
              <div>
                <div className="grid grid-cols-2 gap-1 p-1 bg-soft rounded-xl" role="group" aria-label={t('trip.mode')}>
                  {([false, true] as const).map(rt => <button key={String(rt)} onClick={() => setRoundTrip(rt)} aria-pressed={roundTrip === rt} className={`min-h-11 rounded-lg px-3 py-2 text-sm font-medium transition-colors motion-reduce:transition-none ${roundTrip === rt ? 'bg-primary text-white' : 'text-sub hover:bg-track'}`}>{t(rt ? 'trip.roundTrip' : 'trip.oneWay')}</button>)}
                </div>
                <p className="text-xs text-muted tabular-nums mt-2">{t('experience.totalDistance', { km: tripKm.toLocaleString('ko-KR') })}</p>
              </div>
              {mode === 'split' && <div>
                <label htmlFor="fuel-people" className="block text-sm font-medium text-body mb-2">{t('experience.people')}</label>
                <div className="flex items-center gap-2">
                  <button onClick={() => setPeople(n => Math.max(1, n - 1))} disabled={people <= 1} aria-label={t('experience.fewerPeople')} className="ui-btn-soft w-11 h-11 shrink-0 disabled:opacity-40">−</button>
                  <input id="fuel-people" type="number" inputMode="numeric" min="1" max="100" value={people} onChange={e => setPeople(fuelNumber(e.target.value, 1, 1, 100, true))} className="ui-field w-full min-w-0 py-2.5 text-center tabular-nums" />
                  <button onClick={() => setPeople(n => Math.min(100, n + 1))} disabled={people >= 100} aria-label={t('experience.morePeople')} className="ui-btn-soft w-11 h-11 shrink-0 disabled:opacity-40">+</button>
                </div>
                <p className="text-xs text-muted mt-2">{t('experience.peopleHint')}</p>
              </div>}
              <section className="border-t border-line pt-4" data-testid="fuel-basic-options">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="fuel-vehicle" className="block text-sm font-medium text-body mb-2">
                    {t('input.vehicleType')}
                  </label>
                  <select
                    id="fuel-vehicle"
                    value={vehicleType}
                    onChange={(e) => setVehicleType(e.target.value)}
                    className="w-full min-h-11 ui-field px-3 py-2"
                  >
                    {Object.entries(VEHICLE_TYPES).map(([key, vehicle]) => (
                      <option key={key} value={key}>
                        {t(`vehicleTypes.${key}`)} ({vehicle.efficiency}km/L)
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="fuel-type" className="block text-sm font-medium text-body mb-2">
                    {t('input.fuelType')}
                  </label>
                  <select
                    id="fuel-type"
                    value={fuelType}
                    onChange={(e) => setFuelType(e.target.value as FuelType)}
                    className="w-full min-h-11 ui-field px-3 py-2"
                  >
                    {FUEL_TYPES.map(ft => <option key={ft} value={ft}>{t(`fuelTypes.${ft}`)} ({priceLoading ? tc('loading') : `${priceSource === 'default' ? t('priceSource.estimate') + ' ' : ''}${won(fuelPrices[ft])}${t('share.perLiter')}`})</option>)}
                  </select>
                  <p className="text-xs text-muted mt-2" aria-live="polite">{priceLoading ? tc('loading') : priceSourceLabel}</p>
                </div>

                {/* 지역 선택 */}
                <div>
                  <label htmlFor="fuel-sido" className="block text-xs font-medium text-sub mb-1">
                    {t('region.label')}
                  </label>
                  <select
                    id="fuel-sido"
                    value={selectedSido}
                    onChange={(e) => {
                      const sido = e.target.value
                      setSelectedSido(sido)
                      safeStorage.setItem('fuel_selected_sido', sido)
                      fetchOpinetPrices(sido || undefined, selectedDate || undefined)
                    }}
                    className="w-full min-h-11 ui-field px-3 py-2 text-sm"
                  >
                    {SIDO_OPTIONS.map(s => (
                      <option key={s.code} value={s.code}>{t(`region.names.${s.key}`)}</option>
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
                      className="flex-1 min-w-0"
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
                    <p className="text-xs mt-2 px-3 py-2 rounded-lg bg-amber-50 text-amber-800 ">
                      {t('priceSource.noData')}
                    </p>
                  )}
                  {priceSource === 'opinet' && priceFallback && (
                    <p role="status" className="text-xs mt-2 px-3 py-2 rounded-lg bg-amber-50 text-amber-800 ">
                      {t('priceSource.fallback', priceFallback)}
                    </p>
                  )}
                </div>

                </div>
                <div className="mt-4">
                  <label htmlFor="fuel-efficiency" className="block text-sm font-medium text-body mb-2">{t('input.efficiency')}</label>
                  <div className="flex gap-2 items-center">
                    <input
                      id="fuel-efficiency"
                      type="number"
                      inputMode="decimal"
                      aria-label={t('input.customEfficiency')}
                      value={useCustomEfficiency ? customEfficiency || '' : Number(efficiency.toFixed(2))}
                      onChange={(e) => { setUseCustomEfficiency(true); setCustomEfficiency(Number(e.target.value)) }}
                      min="0.1"
                      max="100"
                      step="0.1"
                      className="ui-field w-full min-w-0 min-h-11 px-3 py-2 tabular-nums"
                    />
                    {useCustomEfficiency && <button onClick={() => { setUseCustomEfficiency(false); setCustomEfficiency(0) }} className="ui-btn-soft shrink-0 min-h-11 px-3 py-2 text-sm">{t('input.resetEfficiency')}</button>}
                  </div>
                  <p className="text-xs text-muted mt-2">{t(useCustomEfficiency ? 'input.customEfficiencyHint' : 'input.defaultEfficiencyHint')}</p>
                </div>
                <div className="mt-5" data-testid="fuel-adjustment">
                  <div>
                    <label htmlFor="fuel-depr" className="block text-sm font-medium text-body mb-2">
                      {t('depreciation.multiplier')}
                    </label>
                    <div className="flex items-center gap-3">
                      <input
                        id="fuel-depr"
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
                        className="flex-1 min-w-0 min-h-11 accent-primary"
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
                  <p className="mt-2 text-xs text-muted">
                    {t('depreciation.description')}
                  </p>
                  {depreciationMultiplier !== 1.0 && (
                    <button
                      onClick={() => {
                        setDepreciationMultiplier(1.0)
                        safeStorage.setItem('fuel_depreciation_multiplier', '1.0')
                      }}
                      className="ui-btn-soft mt-2 min-h-11 px-3 py-2 text-sm"
                    >
                      {t('depreciation.reset')}
                    </button>
                  )}
                </div>
                {hasVehicleSettings && <p className="text-xs text-primary mt-3">{t('experience.savedVehicle')}</p>}
                {/* Vehicle Settings Buttons */}
                <div className="pt-3 border-t border-line">
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={saveVehicleSettings}
                      disabled={useCustomEfficiency && (customEfficiency <= 0 || customEfficiency > 100)}
                      className="ui-btn-soft flex items-center gap-1 min-h-11 px-3 py-2 text-sm disabled:opacity-40"
                    >
                      <Save className="w-3 h-3" />
                      <span>{t('vehicleSettings.save')}</span>
                    </button>
                    <button
                      onClick={loadVehicleSettings}
                      className="ui-btn-soft flex items-center gap-1 min-h-11 px-3 py-2 text-sm"
                    >
                      <Upload className="w-3 h-3" />
                      <span>{t('vehicleSettings.load')}</span>
                    </button>
                    {hasVehicleSettings && (
                      <button
                        onClick={deleteVehicleSettings}
                        className="flex items-center gap-1 min-h-11 px-3 py-2 text-sm text-muted hover:text-red-600 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>{t('vehicleSettings.delete')}</span>
                      </button>
                    )}
                  </div>
                  <p className="mt-2 text-xs text-muted" role="status">
                    {settingsFeedback ?? t('vehicleSettings.autoApplyHint')}
                  </p>
                </div>
              </section>
              <details className="border-t border-line pt-4">
                <summary className="min-h-11 cursor-pointer text-sm font-semibold text-fg">{t('experience.extraSettings')}<span className="block mt-1 text-xs font-normal text-muted">{t('experience.extraSummary', { amount: won(tollFee + parkingFee) })}</span></summary>
                <div className="grid grid-cols-2 gap-3 mt-4">
                  <div><label htmlFor="fuel-toll" className="block text-xs text-sub mb-2">{t('experience.totalToll')}</label><input id="fuel-toll" type="number" inputMode="numeric" min="0" max="10000000" value={tollFee || ''} placeholder="0" onChange={e => setTollFee(fuelNumber(e.target.value, 0, 0, 10000000, true))} className="ui-field w-full px-3 py-2.5" /></div>
                  <div><label htmlFor="fuel-parking" className="block text-xs text-sub mb-2">{t('experience.totalParking')}</label><input id="fuel-parking" type="number" inputMode="numeric" min="0" max="10000000" value={parkingFee || ''} placeholder="0" onChange={e => setParkingFee(fuelNumber(e.target.value, 0, 0, 10000000, true))} className="ui-field w-full px-3 py-2.5" /></div>
                </div>
                <p className="text-xs text-muted mt-2">{t('experience.extraHint')}</p>
                <label htmlFor="fuel-trip-memo" className="block text-xs text-sub mt-4 mb-2">{t('drivingLog.routeMemo')}</label><input id="fuel-trip-memo" maxLength={200} value={tripMemo} onChange={e => setTripMemo(e.target.value)} placeholder={t('drivingLog.form.placeholder.route')} className="ui-field w-full px-3 py-2.5" />
                <p className="text-xs text-muted mt-2">{t('experience.memoHint')}</p>
              </details>
              <section className="border-t border-line pt-4">
              <div className="flex items-center justify-between gap-3 my-4">
                <h2 className="text-sm font-medium text-fg">
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
                      disabled={FUEL_TYPES.some(f => !Number.isFinite(tempPrices[f]) || tempPrices[f] <= 0 || tempPrices[f] >= 10000)}
                      className="p-3 disabled:opacity-40 text-primary hover:opacity-80 transition-colors"
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
                        onChange={(e) => setTempPrices(prev => ({ ...prev, [ft]: Math.max(0, Number(e.target.value) || 0) }))}
                        className="w-24 ui-field px-2 py-1 text-sm text-right"
                        min="0"
                      />
                    ) : (
                      <span className={`tabular-nums ${ft === fuelType ? 'font-semibold text-fg' : 'font-medium text-body'}`}>{won(fuelPrices[ft])}{t('share.perLiter')}</span>
                    )}
                  </div>
                ))}

                <div className="pt-3 border-t border-line">
                  <div className="flex items-center justify-between gap-2 text-xs mb-3">
                    <span className={priceSource === 'default' ? 'text-muted' : 'text-muted'} aria-live="polite">
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
              </section>

            </div>
          </div>
          {calculation && tripCosts && <>
            <ShareResult url={shareUrl} fileName="fuel-cost" text={settlementText} card={{
              tool: t('title'), label: t(mode === 'split' ? 'experience.perPerson' : 'experience.tripTotal'),
              headline: `${won(resultAmount)}${t('share.won')}`,
              sub: mode === 'split' ? t('experience.splitBasis', { total: won(tripCosts.total), people }) : t('experience.tripBasis', { km: tripKm.toLocaleString('ko-KR'), liters: calculation.fuelConsumption.toFixed(2) }),
              rows: [
                { label: t('result.settlement'), value: `${won(tripCosts.fuel)}${t('share.won')}` },
                { label: t('experience.extras'), value: `${won(tripCosts.toll + tripCosts.parking)}${t('share.won')}` },
                { label: t('result.efficiency'), value: `${efficiency.toFixed(1)}km/L` },
                { label: t('result.fuelPrice'), value: `${won(fuelPrices[fuelType])}${t('share.perLiter')}` },
                { label: t('share.priceBasis'), value: priceSourceLabel },
                ...(mode === 'split' && tripCosts.remainder ? [{ label: t('experience.lastPerson'), value: `${won(tripCosts.lastPerson)}${t('share.won')}` }] : []),
                ...(depreciationMultiplier !== 1 ? [{ label: t('depreciation.title'), value: `×${depreciationMultiplier.toFixed(2)}` }] : []),
              ],
            }} />
            <details className="ui-card p-5 sm:p-6"><summary className="min-h-11 cursor-pointer font-semibold text-fg">{t('experience.calculationDetails')}</summary>
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
                        {won(fuelPrices[fuelType])}{t('share.perLiter')}
                        <span className="block text-xs font-normal text-muted">{priceSourceLabel}</span>
                      </span>
                    </div>
                    <div className="flex justify-between gap-3">
                      <span className="text-sub">{t('result.fuelCost')}</span>
                      <span className="font-medium text-fg tabular-nums">{won(calculation.fuelCost)}{t('share.won')}</span>
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
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4 text-center">
                    <div className="rounded-xl border border-line p-3">
                      <p className="text-xs text-muted">{t('result.depreciationCost')}</p>
                      <p className="text-base font-semibold text-fg tabular-nums mt-1">{won(calculation.depreciationCost)}{t('share.won')}</p>
                      <p className="text-[11px] text-faint">{VEHICLE_TYPES[vehicleType].depreciation}{t('share.perKm')}</p>
                    </div>
                    <div className="rounded-xl border border-line p-3">
                      <p className="text-xs text-muted">{t('result.totalCost')}</p>
                      <p className="text-base font-semibold text-fg tabular-nums mt-1">{won(calculation.totalCost)}{t('share.won')}</p>
                    </div>
                    <div className="rounded-xl border border-line p-3">
                      <p className="text-xs text-muted">{t('result.costPerKm')}</p>
                      <p className="text-base font-semibold text-fg tabular-nums mt-1">{won(calculation.costPerKm)}{t('share.won')}</p>
                    </div>
                  </div>
                  <p className="text-xs text-faint mt-2">{t('result.referenceNote')}</p>

            </details>
            <details className="ui-card p-5 sm:p-6"><summary className="min-h-11 cursor-pointer font-semibold text-fg">{t('experience.comparison')}</summary><div className="mt-4">
              <FuelCharts
                  fuelCost={Math.round(calculation.fuelCost)}
                  depreciationCost={Math.round(calculation.depreciationCost)}
                  tripKm={tripKm}
                  comparison={FUEL_TYPES.map(ft => {
                    const selectedVehicle = VEHICLE_TYPES[vehicleType]
                    const fill = ft === fuelType ? 'var(--primary)' : 'var(--line-strong)'
                    const eff = useCustomEfficiency && customEfficiency > 0
                      ? customEfficiency
                      : getAdjustedEfficiency(selectedVehicle.efficiency, ft)
                    const cost = (tripKm / eff) * fuelPrices[ft]
                    return { name: t(`fuelShort.${ft}`), cost: Math.round(cost), fill, isCurrent: ft === fuelType }
                  })}
                />
            </div></details>
          </>}
        </div>
      )}

      {/* Driving Log Tab */}
      {activeTab === 'drivingLog' && (
        <div className="space-y-6">
          <p className="text-sm text-sub">{t('experience.logBasisHint')}</p>
          {logFeedback && <p className="text-sm text-primary" role="status">{logFeedback}</p>}
          {/* Add Entry Form */}
          <div className={`ui-card p-6`}>
            <h2 className="text-xl font-semibold text-fg mb-4">
              {t('drivingLog.addEntry')}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              <div>
                <label htmlFor="fuel-log-date" className="block text-xs font-medium text-sub mb-1">
                  {t('drivingLog.date')}
                </label>
                <input
                  id="fuel-log-date"
                  type="date"
                  value={newLogEntry.date}
                  onChange={(e) => setNewLogEntry(prev => ({ ...prev, date: e.target.value }))}
                  className="w-full ui-field px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label htmlFor="fuel-log-distance" className="block text-xs font-medium text-sub mb-1">
                  {t('drivingLog.distance')}
                </label>
                <input
                  id="fuel-log-distance"
                  type="number"
                  value={newLogEntry.distance || ''}
                  onChange={(e) => setNewLogEntry(prev => ({ ...prev, distance: fuelNumber(e.target.value, 0, 0, 100000) }))}
                  placeholder={t('drivingLog.form.placeholder.distance')}
                  min="0"
                  step="0.1"
                  className="w-full ui-field px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label htmlFor="fuel-log-toll" className="block text-xs font-medium text-sub mb-1">
                  {t('drivingLog.tollFee')}
                </label>
                <input
                  id="fuel-log-toll"
                  type="number"
                  value={newLogEntry.tollFee || ''}
                  onChange={(e) => setNewLogEntry(prev => ({ ...prev, tollFee: fuelNumber(e.target.value, 0, 0, 10000000, true) }))}
                  placeholder={t('drivingLog.form.placeholder.tollFee')}
                  min="0"
                  step="100"
                  className="w-full ui-field px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label htmlFor="fuel-log-parking" className="block text-xs font-medium text-sub mb-1">
                  {t('drivingLog.parkingFee')}
                </label>
                <input
                  id="fuel-log-parking"
                  type="number"
                  value={newLogEntry.parkingFee || ''}
                  onChange={(e) => setNewLogEntry(prev => ({ ...prev, parkingFee: fuelNumber(e.target.value, 0, 0, 10000000, true) }))}
                  placeholder={t('drivingLog.form.placeholder.parkingFee')}
                  min="0"
                  step="100"
                  className="w-full ui-field px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label htmlFor="fuel-log-memo" className="block text-xs font-medium text-sub mb-1">
                  {t('drivingLog.routeMemo')}
                </label>
                <input
                  id="fuel-log-memo"
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
                <div className="grid grid-cols-3 gap-1 p-1 bg-soft rounded-xl" role="group" aria-label={t('a11y.period')}>
                  {(['thisMonth', 'last3Months', 'all'] as const).map(f => (
                    <button
                      key={f}
                      onClick={() => setDateFilter(f)}
                      aria-pressed={dateFilter === f}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                        dateFilter === f ? 'bg-primary text-white' : 'text-muted hover:text-body'
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
                <p className="text-3xl font-bold text-fg tabular-nums mt-1">{won(logSummary.grandTotal)}{t('share.won')}</p>
                <p className="text-sm text-sub mt-2 tabular-nums">
                  {t('settlement.logSummary', {
                    count: filteredLogs.length,
                    km: logSummary.totalDistance.toLocaleString('ko-KR'),
                    fuel: won(logSummary.totalFuelCost),
                    toll: won(logSummary.totalTollFee),
                    parking: won(logSummary.totalParkingFee)
                  })}
                </p>
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
                      <th className="py-3 px-2"><span className="sr-only">{t('experience.recordActions')}</span></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredLogs.map((log) => {
                      const km = logKm(log)
                      const fuelCost = calculateLogFuelCost(log)
                      const total = log.tollFee + log.parkingFee + fuelCost
                      return (
                        <tr key={log.id} className="border-b border-line hover:bg-subtle">
                          <td className="py-3 px-2 whitespace-nowrap">{log.date}</td>
                          <td className="py-3 px-2 text-body min-w-40 max-w-xs break-words">{log.memo || '—'}<span className="block text-xs text-muted mt-1">{t(log.settlement !== undefined ? 'experience.savedRecord' : 'experience.legacyRecord')}</span>{log.mode === 'split' && <span className="block text-xs text-sub mt-1">{logSplitLine(log)}</span>}<details className="mt-2 text-xs"><summary className="cursor-pointer py-2 text-sub">{t('experience.savedBasis')}</summary><p className="text-muted py-2">{logCondition(log)}</p></details></td>
                          <td className="py-3 px-2 text-right whitespace-nowrap">
                            {km.toLocaleString('ko-KR')}km
                            {log.roundTrip && <span className="block text-xs text-muted">{t('trip.roundTrip')}</span>}
                          </td>
                          <td className="py-3 px-2 text-right">{won(fuelCost)}{t('share.won')}</td>
                          <td className="py-3 px-2 text-right">{won(log.tollFee)}{t('share.won')}</td>
                          <td className="py-3 px-2 text-right">{won(log.parkingFee)}{t('share.won')}</td>
                          <td className="py-3 px-2 text-right font-medium text-fg">{won(total)}{t('share.won')}</td>
                          <td className="py-3 px-2">
                            <button onClick={() => loadLogInCalculator(log)} className="min-h-11 rounded-lg px-3 py-2 text-xs text-primary hover:bg-soft whitespace-nowrap">{t('experience.restoreLog')}</button>
                            <button
                              onClick={() => removeDrivingLogEntry(log.id)}
                              className="p-3 text-muted hover:text-red-600 transition-colors"
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
                      <td className="py-3 px-2 text-right">{won(logSummary.totalFuelCost)}{t('share.won')}</td>
                      <td className="py-3 px-2 text-right">{won(logSummary.totalTollFee)}{t('share.won')}</td>
                      <td className="py-3 px-2 text-right">{won(logSummary.totalParkingFee)}{t('share.won')}</td>
                      <td className="py-3 px-2 text-right font-bold text-fg">{won(logSummary.grandTotal)}{t('share.won')}</td>
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

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* Accurate Calculation */}
              <div className="ui-card p-6">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="p-3 bg-soft rounded-lg">
                    <Calculator className="w-6 h-6 text-body" />
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
              <div className="ui-card p-6">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="p-3 bg-soft rounded-lg">
                    <Shield className="w-6 h-6 text-body" />
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
              <div className="ui-card p-6">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="p-3 bg-soft rounded-lg">
                    <FileText className="w-6 h-6 text-body" />
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
          <div className="ui-card p-8">
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Fuel Efficiency */}
              <div className="ui-card p-6">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="p-3 bg-soft rounded-lg">
                    <Fuel className="w-6 h-6 text-body" />
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
              <div className="ui-card p-6">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="p-3 bg-soft rounded-lg">
                    <Wrench className="w-6 h-6 text-body" />
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
