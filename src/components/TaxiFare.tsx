'use client'

import { useState, useMemo, useCallback, useEffect } from 'react'
import { useTranslations } from '@/lib/i18n'
import { useRouter, usePathname } from 'next/navigation'
import { useSearchParams } from '@/hooks/useSearchParams'
import { Car, Moon, Sun, BookOpen, MapPin, Link, Check, BarChart2, Clock, Navigation, Download } from 'lucide-react'
import { glassCard, glassInset, glassInput } from '@/lib/glass'

type RegionKey =
  | 'seoul' | 'gyeonggi' | 'incheon'
  | 'busan' | 'daegu' | 'daejeon' | 'gwangju' | 'ulsan'
  | 'sejong' | 'gangwon' | 'chungbuk' | 'chungnam'
  | 'jeonbuk' | 'jeonnam' | 'gyeongbuk' | 'gyeongnam' | 'jeju'
type TaxiType = 'regular' | 'deluxe' | 'jumbo'

interface RegionRate {
  base: number        // 기본요금 (원)
  baseDist: number    // 기본거리 (m)
  unitDist: number    // 거리요금 단위거리 (m)
  unitFare: number    // 거리요금 (원)
  timeUnit: number    // 시간요금 단위 (초)
  timeFare: number    // 시간요금 (원)
  nightStart: number  // 심야 시작 시각 (시)
  nightEnd: number    // 심야 종료 시각 (시, 익일)
  deepStart: number | null // 최고할증 구간 시작 (시)
  deepEnd: number | null   // 최고할증 구간 종료 (시, 익일)
  nightRate: number   // 일반 심야할증율
  deepRate: number    // 최고 심야할증율
  outRate: number     // 시계외 할증율
}

// 2026년 9월 기준 시도별 중형택시 요율 (지자체별 변동 가능 — 실제 요율은 관할 시·도 확인)
// 검증: 서울 4,800/1.6km(2023.2~) · 대구 4,500/1.7km/125m(2025.1~) · 제주 4,300/2km(2024.7~) · 전남 4,300/2km
// 예정: 전남 22개 시군 4,800/1.7km(2026.11~12 시행 추진), 대구 5,200~5,600(2027 초 용역안)
const REGION_RATES: Record<RegionKey, RegionRate> = {
  seoul:     { base: 4800, baseDist: 1600, unitDist: 131, unitFare: 100, timeUnit: 30, timeFare: 100, nightStart: 22, nightEnd: 4, deepStart: 23, deepEnd: 2, nightRate: 0.2, deepRate: 0.4, outRate: 0.2 },
  gyeonggi:  { base: 4800, baseDist: 1600, unitDist: 131, unitFare: 100, timeUnit: 30, timeFare: 100, nightStart: 23, nightEnd: 4, deepStart: null, deepEnd: null, nightRate: 0.3, deepRate: 0.3, outRate: 0.2 },
  incheon:   { base: 4800, baseDist: 1600, unitDist: 131, unitFare: 100, timeUnit: 30, timeFare: 100, nightStart: 22, nightEnd: 4, deepStart: 23, deepEnd: 2, nightRate: 0.2, deepRate: 0.4, outRate: 0.3 },
  busan:     { base: 4800, baseDist: 2000, unitDist: 132, unitFare: 100, timeUnit: 30, timeFare: 100, nightStart: 23, nightEnd: 4, deepStart: 23, deepEnd: 2, nightRate: 0.2, deepRate: 0.3, outRate: 0.3 },
  daegu:     { base: 4500, baseDist: 1700, unitDist: 125, unitFare: 100, timeUnit: 30, timeFare: 100, nightStart: 23, nightEnd: 4, deepStart: null, deepEnd: null, nightRate: 0.2, deepRate: 0.2, outRate: 0.2 },
  daejeon:   { base: 4300, baseDist: 1800, unitDist: 133, unitFare: 100, timeUnit: 30, timeFare: 100, nightStart: 23, nightEnd: 4, deepStart: null, deepEnd: null, nightRate: 0.2, deepRate: 0.2, outRate: 0.3 },
  gwangju:   { base: 4300, baseDist: 1600, unitDist: 131, unitFare: 100, timeUnit: 30, timeFare: 100, nightStart: 23, nightEnd: 4, deepStart: null, deepEnd: null, nightRate: 0.2, deepRate: 0.2, outRate: 0.2 },
  ulsan:     { base: 4300, baseDist: 2000, unitDist: 132, unitFare: 100, timeUnit: 30, timeFare: 100, nightStart: 23, nightEnd: 4, deepStart: null, deepEnd: null, nightRate: 0.2, deepRate: 0.2, outRate: 0.2 },
  sejong:    { base: 4000, baseDist: 2000, unitDist: 132, unitFare: 100, timeUnit: 30, timeFare: 100, nightStart: 23, nightEnd: 4, deepStart: null, deepEnd: null, nightRate: 0.2, deepRate: 0.2, outRate: 0.2 },
  gangwon:   { base: 4000, baseDist: 2000, unitDist: 132, unitFare: 100, timeUnit: 30, timeFare: 100, nightStart: 23, nightEnd: 4, deepStart: null, deepEnd: null, nightRate: 0.2, deepRate: 0.2, outRate: 0.2 },
  chungbuk:  { base: 4000, baseDist: 2000, unitDist: 132, unitFare: 100, timeUnit: 30, timeFare: 100, nightStart: 23, nightEnd: 4, deepStart: null, deepEnd: null, nightRate: 0.2, deepRate: 0.2, outRate: 0.2 },
  chungnam:  { base: 4000, baseDist: 2000, unitDist: 132, unitFare: 100, timeUnit: 30, timeFare: 100, nightStart: 23, nightEnd: 4, deepStart: null, deepEnd: null, nightRate: 0.2, deepRate: 0.2, outRate: 0.2 },
  jeonbuk:   { base: 4000, baseDist: 2000, unitDist: 132, unitFare: 100, timeUnit: 30, timeFare: 100, nightStart: 23, nightEnd: 4, deepStart: null, deepEnd: null, nightRate: 0.2, deepRate: 0.2, outRate: 0.2 },
  jeonnam:   { base: 4300, baseDist: 2000, unitDist: 132, unitFare: 100, timeUnit: 30, timeFare: 100, nightStart: 23, nightEnd: 4, deepStart: null, deepEnd: null, nightRate: 0.2, deepRate: 0.2, outRate: 0.2 },
  gyeongbuk: { base: 4500, baseDist: 1700, unitDist: 131, unitFare: 100, timeUnit: 30, timeFare: 100, nightStart: 23, nightEnd: 4, deepStart: null, deepEnd: null, nightRate: 0.2, deepRate: 0.2, outRate: 0.2 },
  gyeongnam: { base: 4000, baseDist: 2000, unitDist: 132, unitFare: 100, timeUnit: 30, timeFare: 100, nightStart: 23, nightEnd: 4, deepStart: null, deepEnd: null, nightRate: 0.2, deepRate: 0.2, outRate: 0.2 },
  jeju:      { base: 4300, baseDist: 2000, unitDist: 131, unitFare: 100, timeUnit: 30, timeFare: 100, nightStart: 23, nightEnd: 4, deepStart: null, deepEnd: null, nightRate: 0.2, deepRate: 0.2, outRate: 0.2 },
}

// 모범/대형 택시 프리미엄 요율 (전국 유사 — 지역별 세부 요율은 관할 확인)
const PREMIUM = { base: 7000, baseDist: 3000, unitDist: 151, unitFare: 200, timeUnit: 36, timeFare: 200 }

const REGION_GROUPS: { groupKey: string; regions: RegionKey[] }[] = [
  { groupKey: 'metro', regions: ['seoul', 'gyeonggi', 'incheon'] },
  { groupKey: 'city', regions: ['busan', 'daegu', 'daejeon', 'gwangju', 'ulsan'] },
  { groupKey: 'province', regions: ['sejong', 'gangwon', 'chungbuk', 'chungnam', 'jeonbuk', 'jeonnam', 'gyeongbuk', 'gyeongnam', 'jeju'] },
]

// 선택 지역·차종에 적용되는 유효 요율 스케줄 반환
function getSchedule(region: RegionKey, type: TaxiType): RegionRate {
  const r = REGION_RATES[region]
  if (type === 'regular') return r
  const sched: RegionRate = {
    ...r,
    base: PREMIUM.base,
    baseDist: PREMIUM.baseDist,
    unitDist: PREMIUM.unitDist,
    unitFare: PREMIUM.unitFare,
    timeUnit: PREMIUM.timeUnit,
    timeFare: PREMIUM.timeFare,
  }
  // 모범택시는 심야할증 없음
  if (type === 'deluxe') {
    sched.nightRate = 0
    sched.deepRate = 0
    sched.deepStart = null
    sched.deepEnd = null
  }
  return sched
}

function inWindow(start: number, end: number, h: number): boolean {
  return start < end ? h >= start && h < end : h >= start || h < end
}

// 탑승 시각에 적용되는 심야할증율
function nightRateFor(hour: number, s: RegionRate): number {
  if (s.nightRate === 0 && s.deepRate === 0) return 0
  if (!inWindow(s.nightStart, s.nightEnd, hour)) return 0
  if (s.deepStart != null && s.deepEnd != null && inWindow(s.deepStart, s.deepEnd, hour)) return s.deepRate
  return s.nightRate
}

interface FareResult {
  base: number
  distanceFare: number
  timeFare: number
  metered: number
  nightRate: number
  nightSurcharge: number
  outRate: number
  outSurcharge: number
  total: number
}

function computeFare(distanceKm: number, timeMin: number, hour: number, region: RegionKey, type: TaxiType, outOfCity: boolean): FareResult {
  const s = getSchedule(region, type)
  const meters = distanceKm * 1000
  const extraDist = Math.max(0, meters - s.baseDist)
  const distanceFare = Math.floor(extraDist / s.unitDist) * s.unitFare
  const stoppedSec = timeMin * 60 * 0.4 // 저속·정차 구간 가정치(40%)
  const timeFare = Math.floor(stoppedSec / s.timeUnit) * s.timeFare
  const metered = s.base + distanceFare + timeFare
  const nightRate = nightRateFor(hour, s)
  const outRate = outOfCity ? s.outRate : 0
  const nightSurcharge = Math.floor(metered * nightRate)
  const outSurcharge = Math.floor(metered * outRate)
  const total = metered + nightSurcharge + outSurcharge
  return { base: s.base, distanceFare, timeFare, metered, nightRate, nightSurcharge, outRate, outSurcharge, total }
}

export default function TaxiFare() {
  const t = useTranslations('taxiFare')
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()

  const initRegion = (searchParams.get('region') as RegionKey) || 'seoul'
  const [distance, setDistance] = useState<string>(() => searchParams.get('distance') ?? '5')
  const [time, setTime] = useState<string>(() => searchParams.get('time') ?? '15')
  const [region, setRegion] = useState<RegionKey>(REGION_RATES[initRegion] ? initRegion : 'seoul')
  const [taxiType, setTaxiType] = useState<TaxiType>(() => (searchParams.get('type') as TaxiType) ?? 'regular')
  const [hour, setHour] = useState<number>(() => {
    const h = parseInt(searchParams.get('hour') ?? '', 10)
    return Number.isFinite(h) && h >= 0 && h <= 23 ? h : 14
  })
  const [outOfCity, setOutOfCity] = useState<boolean>(() => searchParams.get('out') === '1')
  const [copied, setCopied] = useState(false)
  const [saved, setSaved] = useState(false)

  // URL 동기화
  useEffect(() => {
    const params = new URLSearchParams()
    params.set('distance', distance)
    params.set('time', time)
    params.set('region', region)
    params.set('type', taxiType)
    params.set('hour', String(hour))
    params.set('out', outOfCity ? '1' : '0')
    router.replace(`${pathname}?${params.toString()}`, { scroll: false })
  }, [distance, time, region, taxiType, hour, outOfCity, pathname, router])

  const distanceNum = parseFloat(distance) || 0
  const timeNum = parseFloat(time) || 0

  const schedule = useMemo(() => getSchedule(region, taxiType), [region, taxiType])
  const activeNightRate = useMemo(() => nightRateFor(hour, schedule), [hour, schedule])

  const fare = useMemo(
    () => computeFare(distanceNum, timeNum, hour, region, taxiType, outOfCity),
    [distanceNum, timeNum, hour, region, taxiType, outOfCity]
  )

  // 차종별 비교 (동일 지역·시각·시외 조건)
  const comparisonFares = useMemo(() => ({
    regular: computeFare(distanceNum, timeNum, hour, region, 'regular', outOfCity).total,
    deluxe: computeFare(distanceNum, timeNum, hour, region, 'deluxe', outOfCity).total,
    jumbo: computeFare(distanceNum, timeNum, hour, region, 'jumbo', outOfCity).total,
  }), [distanceNum, timeNum, hour, region, outOfCity])

  const maxFare = Math.max(...Object.values(comparisonFares))

  const regionRate = REGION_RATES[region]

  const handleReset = () => {
    setDistance('5')
    setTime('15')
    setRegion('seoul')
    setTaxiType('regular')
    setHour(14)
    setOutOfCity(false)
  }

  const setNow = () => {
    setHour(new Date().getHours())
  }

  const copyLink = useCallback(async () => {
    const url = window.location.href
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url)
      } else {
        const ta = document.createElement('textarea')
        ta.value = url
        ta.style.position = 'fixed'
        ta.style.left = '-999999px'
        document.body.appendChild(ta)
        ta.select()
        document.execCommand('copy')
        document.body.removeChild(ta)
      }
    } catch {
      // silent
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [])

  const saveAsImage = useCallback(() => {
    const W = 680, H = 460
    const canvas = document.createElement('canvas')
    canvas.width = W
    canvas.height = H
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // 배경
    const grad = ctx.createLinearGradient(0, 0, 0, H)
    grad.addColorStop(0, '#0f172a')
    grad.addColorStop(1, '#1e293b')
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, W, H)

    // 상단 바
    ctx.fillStyle = '#facc15'
    ctx.fillRect(0, 0, W, 8)

    ctx.textBaseline = 'top'
    ctx.fillStyle = '#e2e8f0'
    ctx.font = 'bold 30px system-ui, -apple-system, sans-serif'
    ctx.fillText('🚕 ' + t('title'), 40, 40)

    ctx.fillStyle = '#94a3b8'
    ctx.font = '17px system-ui, -apple-system, sans-serif'
    const meta = `${t(`regions.${region}`)} · ${t(`types.${taxiType}`)} · ${distanceNum}km / ${timeNum}${t('minUnit')} · ${hour}${t('hourUnit')}${outOfCity ? ' · ' + t('outOfCity.short') : ''}`
    ctx.fillText(meta, 40, 86)

    // 구분선
    ctx.strokeStyle = 'rgba(148,163,184,0.25)'
    ctx.beginPath()
    ctx.moveTo(40, 128)
    ctx.lineTo(W - 40, 128)
    ctx.stroke()

    const rows: [string, string][] = [
      [t('result.baseFare'), fare.base.toLocaleString() + t('result.won')],
      [t('result.distanceFare'), fare.distanceFare.toLocaleString() + t('result.won')],
      [t('result.timeFare'), fare.timeFare.toLocaleString() + t('result.won')],
    ]
    if (fare.nightSurcharge > 0) rows.push([`${t('result.nightSurcharge')} (${Math.round(fare.nightRate * 100)}%)`, '+' + fare.nightSurcharge.toLocaleString() + t('result.won')])
    if (fare.outSurcharge > 0) rows.push([`${t('result.outSurcharge')} (${Math.round(fare.outRate * 100)}%)`, '+' + fare.outSurcharge.toLocaleString() + t('result.won')])

    let y = 150
    ctx.font = '18px system-ui, -apple-system, sans-serif'
    rows.forEach(([label, val]) => {
      ctx.fillStyle = '#cbd5e1'
      ctx.textAlign = 'left'
      ctx.fillText(label, 40, y)
      ctx.fillStyle = '#f1f5f9'
      ctx.textAlign = 'right'
      ctx.fillText(val, W - 40, y)
      y += 36
    })
    ctx.textAlign = 'left'

    // 총액 박스
    const boxY = y + 12
    ctx.fillStyle = 'rgba(16,185,129,0.12)'
    ctx.fillRect(40, boxY, W - 80, 74)
    ctx.strokeStyle = 'rgba(16,185,129,0.5)'
    ctx.strokeRect(40, boxY, W - 80, 74)
    ctx.fillStyle = '#e2e8f0'
    ctx.font = 'bold 22px system-ui, -apple-system, sans-serif'
    ctx.fillText(t('result.total'), 60, boxY + 24)
    ctx.fillStyle = '#34d399'
    ctx.font = 'bold 34px system-ui, -apple-system, sans-serif'
    ctx.textAlign = 'right'
    ctx.fillText(fare.total.toLocaleString() + t('result.won'), W - 60, boxY + 18)

    // 푸터
    ctx.textAlign = 'left'
    ctx.fillStyle = '#64748b'
    ctx.font = '14px system-ui, -apple-system, sans-serif'
    ctx.fillText('toolhub.ai.kr · ' + t('imageFooter'), 40, H - 34)

    const link = document.createElement('a')
    link.download = `taxi-fare-${region}-${distanceNum}km.png`
    link.href = canvas.toDataURL('image/png')
    link.click()

    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }, [fare, region, taxiType, distanceNum, timeNum, hour, outOfCity, t])

  const barColors: Record<TaxiType, string> = {
    regular: 'bg-blue-500',
    deluxe: 'bg-purple-500',
    jumbo: 'bg-emerald-500',
  }

  const typeLabels: Record<TaxiType, string> = {
    regular: t('types.regular'),
    deluxe: t('types.deluxe'),
    jumbo: t('types.jumbo'),
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
        {/* Settings Panel */}
        <div className="lg:col-span-1">
          <div className={`${glassCard} ${glassInset} p-6 space-y-6`}>
            {/* Region Selector */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <MapPin className="w-4 h-4 inline mr-1" />
                {t('region')}
              </label>
              <select
                value={region}
                onChange={(e) => setRegion(e.target.value as RegionKey)}
                className={`${glassInput} px-3 py-2`}
              >
                {REGION_GROUPS.map((g) => (
                  <optgroup key={g.groupKey} label={t(`regionGroups.${g.groupKey}`)}>
                    {g.regions.map((rk) => (
                      <option key={rk} value={rk}>{t(`regions.${rk}`)}</option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>

            {/* Distance Input + Slider */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <Navigation className="w-4 h-4 inline mr-1" />
                {t('distance')}
              </label>
              <div className="flex items-center gap-2 mb-2">
                <input
                  type="number"
                  value={distance}
                  onChange={(e) => setDistance(e.target.value)}
                  placeholder={t('distancePlaceholder')}
                  step="0.1"
                  min="0"
                  max="50"
                  className={`${glassInput} px-3 py-2`}
                />
                <span className="text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap">km</span>
              </div>
              <input
                type="range"
                min="1"
                max="50"
                step="0.5"
                value={Math.min(Math.max(parseFloat(distance) || 1, 1), 50)}
                onChange={(e) => setDistance(e.target.value)}
                className="w-full h-2 rounded-lg appearance-none cursor-pointer accent-blue-600"
              />
              <div className="flex justify-between text-xs text-gray-400 dark:text-gray-500 mt-1">
                <span>1km</span>
                <span>25km</span>
                <span>50km</span>
              </div>
            </div>

            {/* Time Input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <Clock className="w-4 h-4 inline mr-1" />
                {t('time')}
              </label>
              <input
                type="number"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                placeholder={t('timePlaceholder')}
                step="1"
                min="0"
                className={`${glassInput} px-3 py-2`}
              />
            </div>

            {/* Boarding Hour */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  {activeNightRate > 0 ? <Moon className="w-4 h-4 inline mr-1 text-indigo-500" /> : <Sun className="w-4 h-4 inline mr-1 text-yellow-500" />}
                  {t('boardingTime')}
                </label>
                <button
                  onClick={setNow}
                  className="text-xs bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded px-2 py-1 transition-colors"
                >
                  {t('nowButton')}
                </button>
              </div>
              <div className="flex items-center gap-2 mb-2">
                <input
                  type="range"
                  min="0"
                  max="23"
                  step="1"
                  value={hour}
                  onChange={(e) => setHour(parseInt(e.target.value, 10))}
                  className="w-full h-2 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                />
                <span className="text-sm font-semibold text-gray-900 dark:text-white whitespace-nowrap w-12 text-right">
                  {String(hour).padStart(2, '0')}{t('hourUnit')}
                </span>
              </div>
              <div className={`text-xs font-medium px-2 py-1 rounded inline-block ${activeNightRate > 0 ? 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300' : 'bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-300'}`}>
                {activeNightRate > 0 ? `${t('tier.night')} +${Math.round(activeNightRate * 100)}%` : t('tier.day')}
              </div>
            </div>

            {/* Taxi Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                <Car className="w-4 h-4 inline mr-1" />
                {t('taxiType')}
              </label>
              <div className="space-y-2">
                {(['regular', 'deluxe', 'jumbo'] as TaxiType[]).map((type) => (
                  <label key={type} className="flex items-center space-x-3 cursor-pointer">
                    <input
                      type="radio"
                      name="taxiType"
                      value={type}
                      checked={taxiType === type}
                      onChange={(e) => setTaxiType(e.target.value as TaxiType)}
                      className="w-4 h-4 accent-blue-600"
                    />
                    <span className="text-gray-700 dark:text-gray-300">{t(`types.${type}`)}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Out of City */}
            <div>
              <label className="flex items-start space-x-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={outOfCity}
                  onChange={(e) => setOutOfCity(e.target.checked)}
                  className="w-4 h-4 mt-0.5 accent-blue-600"
                />
                <span>
                  <span className="text-gray-700 dark:text-gray-300 font-medium">{t('outOfCity.label')}</span>
                  <span className="block text-xs text-gray-500 dark:text-gray-400">{t('outOfCity.desc', { rate: Math.round(REGION_RATES[region].outRate * 100) })}</span>
                </span>
              </label>
            </div>

            {/* Action Buttons */}
            <div className="space-y-2">
              <button
                onClick={copyLink}
                className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg px-4 py-3 font-medium hover:from-blue-700 hover:to-indigo-700 transition-all"
              >
                {copied ? <><Check className="w-4 h-4" />{t('copyLinkDone')}</> : <><Link className="w-4 h-4" />{t('copyLink')}</>}
              </button>
              <button
                onClick={saveAsImage}
                className="w-full flex items-center justify-center gap-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg px-4 py-3 font-medium transition-colors"
              >
                {saved ? <><Check className="w-4 h-4" />{t('saveImageDone')}</> : <><Download className="w-4 h-4" />{t('saveImage')}</>}
              </button>
              <button
                onClick={handleReset}
                className="w-full bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg px-4 py-3 font-medium transition-colors"
              >
                {t('reset')}
              </button>
            </div>
          </div>
        </div>

        {/* Result Panel */}
        <div className="lg:col-span-2 space-y-6">
          {/* Fare Breakdown */}
          <div className={`${glassCard} ${glassInset} p-6`}>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6 flex items-center">
              <Car className="w-5 h-5 mr-2" />
              {t('result.title')}
            </h2>

            <div className="space-y-1">
              <div className="flex justify-between items-center py-3 border-b border-gray-200 dark:border-gray-700">
                <span className="text-gray-700 dark:text-gray-300">{t('result.baseFare')}</span>
                <span className="text-lg font-semibold text-gray-900 dark:text-white">
                  {fare.base.toLocaleString()} {t('result.won')}
                </span>
              </div>
              <div className="flex justify-between items-center py-3 border-b border-gray-200 dark:border-gray-700">
                <span className="text-gray-700 dark:text-gray-300">{t('result.distanceFare')}</span>
                <span className="text-lg font-semibold text-gray-900 dark:text-white">
                  {fare.distanceFare.toLocaleString()} {t('result.won')}
                </span>
              </div>
              <div className="flex justify-between items-center py-3 border-b border-gray-200 dark:border-gray-700">
                <span className="text-gray-700 dark:text-gray-300">{t('result.timeFare')}</span>
                <span className="text-lg font-semibold text-gray-900 dark:text-white">
                  {fare.timeFare.toLocaleString()} {t('result.won')}
                </span>
              </div>

              {fare.nightSurcharge > 0 && (
                <div className="flex justify-between items-center py-3 border-b border-gray-200 dark:border-gray-700">
                  <span className="text-gray-700 dark:text-gray-300 flex items-center">
                    <Moon className="w-4 h-4 mr-2 text-indigo-500" />
                    {t('result.nightSurcharge')} <span className="ml-1 text-xs text-indigo-500">({Math.round(fare.nightRate * 100)}%)</span>
                  </span>
                  <span className="text-lg font-semibold text-indigo-600 dark:text-indigo-400">
                    +{fare.nightSurcharge.toLocaleString()} {t('result.won')}
                  </span>
                </div>
              )}

              {fare.outSurcharge > 0 && (
                <div className="flex justify-between items-center py-3 border-b border-gray-200 dark:border-gray-700">
                  <span className="text-gray-700 dark:text-gray-300 flex items-center">
                    <Navigation className="w-4 h-4 mr-2 text-amber-500" />
                    {t('result.outSurcharge')} <span className="ml-1 text-xs text-amber-500">({Math.round(fare.outRate * 100)}%)</span>
                  </span>
                  <span className="text-lg font-semibold text-amber-600 dark:text-amber-400">
                    +{fare.outSurcharge.toLocaleString()} {t('result.won')}
                  </span>
                </div>
              )}

              <div className="flex justify-between items-center py-4 bg-gradient-to-r from-slate-800/90 to-slate-900/92 rounded-xl px-4 mt-4">
                <span className="text-xl font-bold text-white">{t('result.total')}</span>
                <span className="text-3xl font-bold text-emerald-400">
                  {fare.total.toLocaleString()} {t('result.won')}
                </span>
              </div>
            </div>

            <p className="text-xs text-gray-500 dark:text-gray-400 mt-4">{t('result.note')}</p>
          </div>

          {/* Fare Comparison Chart */}
          <div className={`${glassCard} ${glassInset} p-6`}>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6 flex items-center">
              <BarChart2 className="w-5 h-5 mr-2" />
              {t('comparison.title')}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">{t('comparison.subtitle')}</p>

            <div className="space-y-4">
              {(['regular', 'deluxe', 'jumbo'] as TaxiType[]).map((type) => {
                const f = comparisonFares[type]
                const pct = maxFare > 0 ? Math.round((f / maxFare) * 100) : 0
                const isSelected = taxiType === type
                return (
                  <div key={type}>
                    <div className="flex justify-between items-center mb-1">
                      <span className={`text-sm font-medium ${isSelected ? 'text-blue-600 dark:text-blue-400' : 'text-gray-700 dark:text-gray-300'}`}>
                        {typeLabels[type]}
                        {isSelected && (
                          <span className="ml-2 text-xs bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 px-1.5 py-0.5 rounded">
                            {t('comparison.selected')}
                          </span>
                        )}
                      </span>
                      <span className={`text-sm font-bold ${isSelected ? 'text-blue-600 dark:text-blue-400' : 'text-gray-900 dark:text-white'}`}>
                        {f.toLocaleString()}{t('result.won')}
                      </span>
                    </div>
                    <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-6 overflow-hidden">
                      <div
                        className={`h-6 rounded-full transition-all duration-500 flex items-center justify-end pr-2 ${barColors[type]} ${isSelected ? 'opacity-100' : 'opacity-60'}`}
                        style={{ width: `${Math.max(pct, 4)}%` }}
                      >
                        {pct >= 20 && <span className="text-xs text-white font-medium">{pct}%</span>}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            <p className="text-xs text-gray-500 dark:text-gray-400 mt-4">{t('comparison.note')}</p>
          </div>

          {/* Region Fare Info */}
          <div className="bg-blue-50 dark:bg-blue-950 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
              <BookOpen className="w-5 h-5 mr-2" />
              {t(`regions.${region}`)} {t('fareInfo.title')}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
              <div className="bg-white dark:bg-gray-800 rounded-lg p-3 space-y-1">
                <p className="font-semibold text-gray-900 dark:text-white mb-1">{t('types.regular')}</p>
                <p className="text-gray-700 dark:text-gray-300">{t('fareInfo.base')}: {regionRate.base.toLocaleString()}{t('result.won')} ({(regionRate.baseDist / 1000).toFixed(1)}km)</p>
                <p className="text-gray-700 dark:text-gray-300">{t('fareInfo.distance')}: {regionRate.unitDist}{t('fareInfo.perMeter')} {regionRate.unitFare}{t('result.won')}</p>
                <p className="text-gray-700 dark:text-gray-300">{t('fareInfo.time')}: {regionRate.timeUnit}{t('fareInfo.perSec')} {regionRate.timeFare}{t('result.won')}</p>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-lg p-3 space-y-1">
                <p className="font-semibold text-gray-900 dark:text-white mb-1">{t('fareInfo.surchargeTitle')}</p>
                <p className="text-gray-700 dark:text-gray-300">
                  <Moon className="w-4 h-4 inline mr-1 text-indigo-500" />
                  {t('fareInfo.night')}: {String(regionRate.nightStart).padStart(2, '0')}~{String(regionRate.nightEnd).padStart(2, '0')}{t('hourUnit')} {Math.round(regionRate.nightRate * 100)}%
                  {regionRate.deepStart != null && ` (${String(regionRate.deepStart).padStart(2, '0')}~${String(regionRate.deepEnd).padStart(2, '0')}${t('hourUnit')} ${Math.round(regionRate.deepRate * 100)}%)`}
                </p>
                <p className="text-gray-700 dark:text-gray-300">
                  <Navigation className="w-4 h-4 inline mr-1 text-amber-500" />
                  {t('fareInfo.outOfCity')}: {Math.round(regionRate.outRate * 100)}%
                </p>
                <p className="text-gray-700 dark:text-gray-300">{t('fareInfo.premium')}: {PREMIUM.base.toLocaleString()}{t('result.won')} (3km)</p>
              </div>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-3">{t('fareInfo.sourceNote')}</p>
          </div>
        </div>
      </div>

      {/* Guide Section */}
      <div className={`${glassCard} ${glassInset} p-6`}>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6 flex items-center">
          <BookOpen className="w-5 h-5 mr-2" />
          {t('guide.title')}
        </h2>

        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">{t('guide.calculation.title')}</h3>
            <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300">
              {(t.raw('guide.calculation.items') as string[]).map((item, idx) => (
                <li key={idx}>{item}</li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">{t('guide.tips.title')}</h3>
            <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300">
              {(t.raw('guide.tips.items') as string[]).map((item, idx) => (
                <li key={idx}>{item}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
