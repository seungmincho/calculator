'use client'

import { useState, useMemo, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { Package, Truck, Calculator, Copy, Check, RotateCcw, BookOpen, Save, Store, AlertTriangle } from 'lucide-react'
import { useCalculationHistory } from '@/hooks/useCalculationHistory'
import CalculationHistory from './CalculationHistory'

type DestinationType = 'mainland' | 'jeju' | 'island'
type CarrierCategoryType = 'standard' | 'cvs'

interface PriceTier {
  maxWeight: number
  price: number
  jejuPrice?: number
  islandPrice?: number
}

interface CarrierData {
  id: string
  name: string
  serviceLabel: string
  category: CarrierCategoryType
  tiers: PriceTier[]
  maxWeight: number
  maxGirth: number
  cvsPickupOnly: boolean
  jejuAvailable: boolean
  islandAvailable: boolean
  deliveryDays: string
  note?: string
}

const CARRIER_DATA: CarrierData[] = [
  // ── 일반 택배사 ──
  {
    id: 'cj',
    name: 'CJ대한통운',
    serviceLabel: '방문접수',
    category: 'standard',
    tiers: [
      { maxWeight: 2,  price: 5000, jejuPrice: 8000,  islandPrice: 9000  },
      { maxWeight: 5,  price: 6000, jejuPrice: 9000,  islandPrice: 10000 },
      { maxWeight: 10, price: 7000, jejuPrice: 10000, islandPrice: 11000 },
      { maxWeight: 15, price: 8000, jejuPrice: 11000, islandPrice: 12000 },
      { maxWeight: 20, price: 9000, jejuPrice: 12000, islandPrice: 13000 },
      { maxWeight: 25, price: 10000, jejuPrice: 13000, islandPrice: 14000 },
    ],
    maxWeight: 25, maxGirth: 160, cvsPickupOnly: false,
    jejuAvailable: true, islandAvailable: true, deliveryDays: '익일',
    note: '4월 소폭 인상 예정',
  },
  {
    id: 'hanjin',
    name: '한진택배',
    serviceLabel: '방문접수',
    category: 'standard',
    tiers: [
      { maxWeight: 3,  price: 6000, jejuPrice: 8000,  islandPrice: 11000 },
      { maxWeight: 5,  price: 7000, jejuPrice: 9000,  islandPrice: 12000 },
      { maxWeight: 15, price: 7000, jejuPrice: 9000,  islandPrice: 12000 },
      { maxWeight: 20, price: 8000, jejuPrice: 10000, islandPrice: 13000 },
    ],
    maxWeight: 20, maxGirth: 160, cvsPickupOnly: false,
    jejuAvailable: true, islandAvailable: true, deliveryDays: '익일',
  },
  {
    id: 'lotte',
    name: '롯데택배',
    serviceLabel: '방문접수',
    category: 'standard',
    tiers: [
      { maxWeight: 5,  price: 6000, jejuPrice: 8000,  islandPrice: 10000 },
      { maxWeight: 15, price: 7000, jejuPrice: 9000,  islandPrice: 11000 },
      { maxWeight: 20, price: 8000, jejuPrice: 10000, islandPrice: 12000 },
    ],
    maxWeight: 20, maxGirth: 160, cvsPickupOnly: false,
    jejuAvailable: true, islandAvailable: true, deliveryDays: '익일',
  },
  {
    id: 'logen',
    name: '로젠택배',
    serviceLabel: '방문접수',
    category: 'standard',
    tiers: [
      { maxWeight: 5,  price: 7000, jejuPrice: 9500 },
      { maxWeight: 10, price: 8000 },
      { maxWeight: 20, price: 10000 },
      { maxWeight: 25, price: 13000 },
    ],
    maxWeight: 25, maxGirth: 160, cvsPickupOnly: false,
    jejuAvailable: true, islandAvailable: false, deliveryDays: '익일~2일',
    note: '도서산간 배송 제한',
  },
  {
    id: 'post_visit',
    name: '우체국',
    serviceLabel: '방문접수',
    category: 'standard',
    tiers: [
      { maxWeight: 5,  price: 5000,  jejuPrice: 7500,  islandPrice: 5000  },
      { maxWeight: 10, price: 8000,  jejuPrice: 10500, islandPrice: 8000  },
      { maxWeight: 20, price: 10000, jejuPrice: 12500, islandPrice: 10000 },
      { maxWeight: 30, price: 14000, jejuPrice: 16500, islandPrice: 14000 },
    ],
    maxWeight: 30, maxGirth: 160, cvsPickupOnly: false,
    jejuAvailable: true, islandAvailable: true, deliveryDays: '익일',
  },
  {
    id: 'post_registered',
    name: '우체국 등기소포',
    serviceLabel: '창구접수',
    category: 'standard',
    tiers: [
      { maxWeight: 3,  price: 4000,  jejuPrice: 6500  },
      { maxWeight: 5,  price: 4500,  jejuPrice: 7000  },
      { maxWeight: 7,  price: 5000,  jejuPrice: 7500  },
      { maxWeight: 10, price: 6000,  jejuPrice: 8500  },
      { maxWeight: 15, price: 7000,  jejuPrice: 9500  },
      { maxWeight: 20, price: 8000,  jejuPrice: 10500 },
      { maxWeight: 25, price: 11000, jejuPrice: 13500 },
      { maxWeight: 30, price: 13000, jejuPrice: 15500 },
    ],
    maxWeight: 30, maxGirth: 160, cvsPickupOnly: false,
    jejuAvailable: true, islandAvailable: true, deliveryDays: '익일',
    note: '추적·배상 가능',
  },
  {
    id: 'post_regular',
    name: '우체국 일반소포',
    serviceLabel: '창구접수',
    category: 'standard',
    tiers: [
      { maxWeight: 3,  price: 2700  },
      { maxWeight: 5,  price: 3200  },
      { maxWeight: 7,  price: 3700  },
      { maxWeight: 10, price: 4700  },
      { maxWeight: 15, price: 5700  },
      { maxWeight: 20, price: 6700  },
      { maxWeight: 25, price: 9700  },
      { maxWeight: 30, price: 11700 },
    ],
    maxWeight: 30, maxGirth: 160, cvsPickupOnly: false,
    jejuAvailable: false, islandAvailable: false, deliveryDays: '2~3일',
    note: '최저가, 추적·배상 없음',
  },
  // ── 편의점 택배 ──
  {
    id: 'cu_standard',
    name: 'CU',
    serviceLabel: 'CU POST (일반)',
    category: 'cvs',
    tiers: [
      { maxWeight: 5,  price: 6200,  jejuPrice: 9200  },
      { maxWeight: 10, price: 8100,  jejuPrice: 10600 },
      { maxWeight: 20, price: 9800,  jejuPrice: 11800 },
    ],
    maxWeight: 20, maxGirth: 160, cvsPickupOnly: false,
    jejuAvailable: true, islandAvailable: false, deliveryDays: '익일',
    note: '롯데글로벌로지스 배송 · 집 배달 가능 · 4월 인상 예정',
  },
  {
    id: 'cu_economy',
    name: 'CU',
    serviceLabel: '알뜰택배 (편의점→편의점)',
    category: 'cvs',
    tiers: [
      { maxWeight: 0.5, price: 1800 },
      { maxWeight: 1,   price: 2100 },
      { maxWeight: 5,   price: 2700 },
    ],
    maxWeight: 5, maxGirth: 80, cvsPickupOnly: true,
    jejuAvailable: false, islandAvailable: false, deliveryDays: '2~5일',
    note: '내륙 편의점 수령 전용',
  },
  {
    id: 'gs_standard',
    name: 'GS25',
    serviceLabel: '일반택배',
    category: 'cvs',
    tiers: [
      { maxWeight: 0.35, price: 3200 },
      { maxWeight: 5,    price: 3600, jejuPrice: 5600 },
      { maxWeight: 10,   price: 4700 },
    ],
    maxWeight: 10, maxGirth: 160, cvsPickupOnly: false,
    jejuAvailable: true, islandAvailable: false, deliveryDays: '익일',
    note: '집 배달 가능',
  },
  {
    id: 'gs_halfprice',
    name: 'GS25',
    serviceLabel: '반값택배 (편의점→편의점)',
    category: 'cvs',
    tiers: [
      { maxWeight: 0.5, price: 1900, jejuPrice: 3600 },
      { maxWeight: 1,   price: 2300, jejuPrice: 4000 },
      { maxWeight: 5,   price: 2700, jejuPrice: 4400 },
    ],
    maxWeight: 5, maxGirth: 80, cvsPickupOnly: true,
    jejuAvailable: true, islandAvailable: false, deliveryDays: '2~3일',
    note: '편의점 수령 전용',
  },
  {
    id: 'seven',
    name: '세븐일레븐',
    serviceLabel: '착한택배 (무인기기)',
    category: 'cvs',
    tiers: [
      { maxWeight: 25, price: 3100 },
    ],
    maxWeight: 25, maxGirth: 160, cvsPickupOnly: false,
    jejuAvailable: false, islandAvailable: false, deliveryDays: '익일',
    note: '균일가, 프로모션 시 1,980원',
  },
]

function getCarrierPrice(
  carrier: CarrierData,
  appliedWeight: number,
  girth: number,
  dest: DestinationType,
): number | null {
  if (appliedWeight > carrier.maxWeight) return null
  if (girth > carrier.maxGirth) return null
  if (dest === 'jeju' && !carrier.jejuAvailable) return null
  if (dest === 'island' && !carrier.islandAvailable) return null

  const tier = carrier.tiers.find(t => appliedWeight <= t.maxWeight)
  if (!tier) return null

  if (dest === 'jeju') return tier.jejuPrice ?? null
  if (dest === 'island') return tier.islandPrice ?? null
  return tier.price
}

function getUnavailableReason(
  carrier: CarrierData,
  appliedWeight: number,
  girth: number,
  dest: DestinationType,
): string {
  if (appliedWeight > carrier.maxWeight) return `최대 ${carrier.maxWeight}kg 초과`
  if (girth > carrier.maxGirth) return `세변합 ${carrier.maxGirth}cm 초과`
  if (dest === 'jeju' && !carrier.jejuAvailable) return '제주 배송불가'
  if (dest === 'island' && !carrier.islandAvailable) return '도서산간 배송불가'
  const tier = carrier.tiers.find(t => appliedWeight <= t.maxWeight)
  if (!tier) return '중량 초과'
  if (dest === 'jeju' && !tier.jejuPrice) return '제주 요금 미제공'
  if (dest === 'island' && !tier.islandPrice) return '도서산간 요금 미제공'
  return '배송 불가'
}

const RATE_TABLE_ROWS = [
  { name: 'CJ대한통운',    service: '방문접수',       p2: 5000,  p5: 6000, p10: 7000, p20: 9000,  max: '25kg/160cm', days: '익일'   },
  { name: '한진택배',      service: '방문접수',       p2: null,  p5: 7000, p10: 7000, p20: 8000,  max: '20kg/160cm', days: '익일'   },
  { name: '롯데택배',      service: '방문접수',       p2: null,  p5: 6000, p10: 7000, p20: 8000,  max: '20kg/160cm', days: '익일'   },
  { name: '로젠택배',      service: '방문접수',       p2: null,  p5: 7000, p10: 8000, p20: 10000, max: '25kg/160cm', days: '익일~2일'},
  { name: '우체국',        service: '방문접수',       p2: null,  p5: 5000, p10: 8000, p20: 10000, max: '30kg/160cm', days: '익일'   },
  { name: '우체국 등기소포', service: '창구접수',     p2: null,  p5: 4500, p10: 6000, p20: 8000,  max: '30kg/160cm', days: '익일'   },
  { name: '우체국 일반소포', service: '창구접수',     p2: null,  p5: 3200, p10: 4700, p20: 6700,  max: '30kg/160cm', days: '2~3일'  },
  { name: 'CU POST',       service: '편의점접수',     p2: null,  p5: 6200, p10: 8100, p20: 9800,  max: '20kg/160cm', days: '익일'   },
  { name: 'GS25 일반',     service: '편의점접수',     p2: null,  p5: 3600, p10: 4700, p20: null,  max: '10kg/160cm', days: '익일'   },
  { name: 'CU 알뜰',       service: '편의점→편의점', p2: 1800,  p5: 2700, p10: null, p20: null,  max: '5kg/80cm',   days: '2~5일'  },
  { name: 'GS25 반값',     service: '편의점→편의점', p2: 1900,  p5: 2700, p10: null, p20: null,  max: '5kg/80cm',   days: '2~3일'  },
  { name: '세븐일레븐',    service: '착한택배(무인)', p2: 3100,  p5: 3100, p10: 3100, p20: 3100,  max: '25kg/160cm', days: '익일'   },
]

function fmtPrice(v: number | null): string {
  if (v === null) return '—'
  return v.toLocaleString() + '원'
}

export default function ShippingCalc() {
  const t = useTranslations('shippingCalc')
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const { histories, saveCalculation, removeHistory, clearHistories, loadFromHistory } = useCalculationHistory('shipping')
  const [showSaveButton, setShowSaveButton] = useState(false)

  const [weight, setWeight] = useState<string>('2')
  const [width, setWidth] = useState<string>('30')
  const [height, setHeight] = useState<string>('20')
  const [depth, setDepth] = useState<string>('15')
  const [destination, setDestination] = useState<DestinationType>('mainland')
  const [carrierCategory, setCarrierCategory] = useState<CarrierCategoryType>('standard')

  const volumeWeight = useMemo(() => {
    const w = parseFloat(width) || 0
    const h = parseFloat(height) || 0
    const d = parseFloat(depth) || 0
    return (w * h * d) / 6000
  }, [width, height, depth])

  const appliedWeight = useMemo(() => {
    const actual = parseFloat(weight) || 0
    return Math.max(actual, volumeWeight)
  }, [weight, volumeWeight])

  const girth = useMemo(() => {
    const w = parseFloat(width) || 0
    const h = parseFloat(height) || 0
    const d = parseFloat(depth) || 0
    return w + h + d
  }, [width, height, depth])

  const carrierResults = useMemo(() => {
    return CARRIER_DATA
      .filter(c => c.category === carrierCategory)
      .map(carrier => {
        const price = getCarrierPrice(carrier, appliedWeight, girth, destination)
        const unavailableReason = price === null
          ? getUnavailableReason(carrier, appliedWeight, girth, destination)
          : null
        return { carrier, price, unavailableReason }
      })
      .sort((a, b) => {
        if (a.price === null && b.price === null) return 0
        if (a.price === null) return 1
        if (b.price === null) return -1
        return a.price - b.price
      })
  }, [carrierCategory, appliedWeight, girth, destination])

  const availableResults = carrierResults.filter(r => r.price !== null)
  const cheapestPrice = availableResults[0]?.price ?? null

  const copyToClipboard = useCallback(async (text: string, id: string) => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text)
      } else {
        const ta = document.createElement('textarea')
        ta.value = text
        ta.style.position = 'fixed'
        ta.style.left = '-999999px'
        document.body.appendChild(ta)
        ta.select()
        document.execCommand('copy')
        document.body.removeChild(ta)
      }
      setCopiedId(id)
      setTimeout(() => setCopiedId(null), 2000)
    } catch {
      setCopiedId(id)
      setTimeout(() => setCopiedId(null), 2000)
    }
  }, [])

  const handleReset = () => {
    setWeight('2'); setWidth('30'); setHeight('20'); setDepth('15')
    setDestination('mainland'); setCarrierCategory('standard')
  }

  const inputCls = "w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"

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
        {/* ── Input Panel ── */}
        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 space-y-6">

            {/* Weight */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('weight')}
              </label>
              <input
                type="number" step="0.1" min="0"
                value={weight}
                onChange={e => { setWeight(e.target.value); setShowSaveButton(true) }}
                placeholder={t('weightPlaceholder')}
                className={inputCls}
              />
            </div>

            {/* Box Dimensions */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                상자 크기
              </label>
              <div className="space-y-3">
                {([['width', t('width')], ['height', t('height')], ['depth', t('depth')]] as [string, string][]).map(([field, label]) => (
                  <div key={field}>
                    <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">{label}</label>
                    <input
                      type="number" step="0.1" min="0"
                      value={field === 'width' ? width : field === 'height' ? height : depth}
                      onChange={e => {
                        const val = e.target.value
                        if (field === 'width') setWidth(val)
                        else if (field === 'height') setHeight(val)
                        else setDepth(val)
                        setShowSaveButton(true)
                      }}
                      className={inputCls}
                    />
                  </div>
                ))}
              </div>
              <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-950 rounded-lg">
                <div className="text-xs text-gray-600 dark:text-gray-400">{t('volumeWeightInfo')}</div>
                <div className="text-lg font-semibold text-blue-600 dark:text-blue-400 mt-0.5">
                  {volumeWeight.toFixed(2)} kg
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  세 변 합: <span className="font-semibold">{girth.toFixed(0)} cm</span>
                </div>
              </div>
            </div>

            {/* Destination */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('destination')}
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                {([
                  ['mainland', '내륙'],
                  ['jeju', '제주도'],
                  ['island', '도서산간'],
                ] as [DestinationType, string][]).map(([dest, label]) => (
                  <button
                    key={dest}
                    onClick={() => { setDestination(dest); setShowSaveButton(true) }}
                    className={`py-2 rounded-lg text-xs font-medium transition-colors ${
                      destination === dest
                        ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white'
                        : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Carrier Category */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                택배 유형
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => { setCarrierCategory('standard'); setShowSaveButton(true) }}
                  className={`py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-1.5 ${
                    carrierCategory === 'standard'
                      ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300'
                  }`}
                >
                  <Truck className="w-3.5 h-3.5" />
                  일반 택배
                </button>
                <button
                  onClick={() => { setCarrierCategory('cvs'); setShowSaveButton(true) }}
                  className={`py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-1.5 ${
                    carrierCategory === 'cvs'
                      ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300'
                  }`}
                >
                  <Store className="w-3.5 h-3.5" />
                  편의점 택배
                </button>
              </div>
            </div>

            {/* Reset */}
            <button
              onClick={handleReset}
              className="w-full bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg px-4 py-2 font-medium flex items-center justify-center gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              {t('reset')}
            </button>
          </div>
        </div>

        {/* ── Results Panel ── */}
        <div className="lg:col-span-2 space-y-6">

          {/* Weight Summary */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <Calculator className="w-5 h-5 text-blue-600" />
              무게 계산
            </h2>
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg text-center">
                <div className="text-xs text-gray-500 dark:text-gray-400">{t('result.actualWeight')}</div>
                <div className="text-xl font-bold text-gray-900 dark:text-white mt-1">
                  {parseFloat(weight) || 0}<span className="text-sm font-normal ml-1">kg</span>
                </div>
              </div>
              <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg text-center">
                <div className="text-xs text-gray-500 dark:text-gray-400">{t('result.volumeWeight')}</div>
                <div className="text-xl font-bold text-gray-900 dark:text-white mt-1">
                  {volumeWeight.toFixed(2)}<span className="text-sm font-normal ml-1">kg</span>
                </div>
              </div>
              <div className="p-3 bg-blue-50 dark:bg-blue-950 rounded-lg text-center border-2 border-blue-300 dark:border-blue-700">
                <div className="text-xs text-blue-600 dark:text-blue-400">{t('result.appliedWeight')}</div>
                <div className="text-xl font-bold text-blue-700 dark:text-blue-300 mt-1">
                  {appliedWeight.toFixed(2)}<span className="text-sm font-normal ml-1">kg</span>
                </div>
              </div>
            </div>
            {appliedWeight === volumeWeight && appliedWeight > (parseFloat(weight) || 0) && (
              <div className="mt-3 flex items-center gap-2 text-xs text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-950 rounded-lg p-2.5">
                <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                부피무게가 실중량보다 큽니다 — 부피무게 기준으로 요금이 적용됩니다
              </div>
            )}
          </div>

          {/* Carrier Rates */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              {carrierCategory === 'standard'
                ? <Truck className="w-5 h-5 text-blue-600" />
                : <Store className="w-5 h-5 text-blue-600" />}
              {carrierCategory === 'standard' ? '일반 택배사별 요금' : '편의점 택배 요금'}
            </h2>

            <div className="space-y-2">
              {carrierResults.map(({ carrier, price, unavailableReason }) => {
                const isCheapest = price !== null && price === cheapestPrice
                const isUnavailable = price === null
                return (
                  <div
                    key={carrier.id}
                    className={`p-3.5 rounded-lg border-2 transition-colors ${
                      isUnavailable
                        ? 'bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 opacity-50'
                        : isCheapest
                        ? 'bg-green-50 dark:bg-green-950 border-green-400 dark:border-green-600'
                        : 'bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center flex-wrap gap-1.5">
                          <span className={`font-semibold text-sm ${isUnavailable ? 'text-gray-400 dark:text-gray-500' : 'text-gray-900 dark:text-white'}`}>
                            {carrier.name}
                          </span>
                          <span className="text-xs text-gray-500 dark:text-gray-400">{carrier.serviceLabel}</span>
                          {isCheapest && (
                            <span className="px-1.5 py-0.5 text-xs bg-green-500 text-white rounded-full font-medium">최저가</span>
                          )}
                          {carrier.cvsPickupOnly && !isUnavailable && (
                            <span className="px-1.5 py-0.5 text-xs bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-300 rounded-full">편의점 수령</span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs text-gray-400 dark:text-gray-500">배송 {carrier.deliveryDays}</span>
                          {carrier.note && (
                            <span className="text-xs text-gray-400 dark:text-gray-500">· {carrier.note}</span>
                          )}
                        </div>
                      </div>
                      <div className="flex-shrink-0 flex items-center gap-1.5">
                        {isUnavailable ? (
                          <span className="text-xs text-red-500 dark:text-red-400 font-medium">{unavailableReason}</span>
                        ) : (
                          <>
                            <span className={`text-lg font-bold ${isCheapest ? 'text-green-700 dark:text-green-300' : 'text-gray-900 dark:text-white'}`}>
                              {price!.toLocaleString()}원
                            </span>
                            <button
                              onClick={() => copyToClipboard(price!.toString(), carrier.id)}
                              className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
                              title="복사"
                            >
                              {copiedId === carrier.id
                                ? <Check className="w-3.5 h-3.5 text-green-600" />
                                : <Copy className="w-3.5 h-3.5 text-gray-400" />}
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Price Range Summary */}
            {availableResults.length > 1 && (
              <div className="mt-5 p-4 bg-indigo-50 dark:bg-indigo-950 rounded-lg">
                <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">가격 범위</div>
                <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
                  {availableResults[0].price!.toLocaleString()}원 ~ {availableResults[availableResults.length - 1].price!.toLocaleString()}원
                </div>
                <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                  최대 {(availableResults[availableResults.length - 1].price! - availableResults[0].price!).toLocaleString()}원 차이
                  {' · '}{availableResults.length}개 서비스 이용 가능
                </div>
              </div>
            )}

            <p className="mt-3 text-xs text-gray-400 dark:text-gray-500 text-right">
              2025~2026년 기준 · 실제 요금은 택배사 정책에 따라 다를 수 있습니다
            </p>

            {/* Save */}
            {showSaveButton && (
              <div className="mt-4 flex justify-end">
                <button
                  onClick={() => {
                    const result: Record<string, number> = {}
                    carrierResults.forEach(({ carrier, price }) => {
                      if (price !== null) result[carrier.id] = price
                    })
                    saveCalculation({ weight, width, height, depth, destination, carrierCategory }, result)
                    setShowSaveButton(false)
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                >
                  <Save className="w-4 h-4" />
                  저장하기
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Guide Section ── */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
          <BookOpen className="w-6 h-6 text-blue-600" />
          {t('guide.title')}
        </h2>

        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <div>
            <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-3">
              {t('guide.calculation.title')}
            </h3>
            <ul className="space-y-2">
              {(t.raw('guide.calculation.items') as string[]).map((item, idx) => (
                <li key={idx} className="flex gap-2 text-sm text-gray-600 dark:text-gray-300">
                  <span className="text-blue-600 dark:text-blue-400 flex-shrink-0">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-3">
              {t('guide.tips.title')}
            </h3>
            <ul className="space-y-2">
              {(t.raw('guide.tips.items') as string[]).map((item, idx) => (
                <li key={idx} className="flex gap-2 text-sm text-gray-600 dark:text-gray-300">
                  <span className="text-green-600 dark:text-green-400 flex-shrink-0">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Rate Reference Table */}
        <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-3">
          2025년 주요 요금표 (내륙 기준)
        </h3>
        <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="bg-gray-100 dark:bg-gray-700">
                <th className="px-3 py-2 font-semibold text-gray-700 dark:text-gray-300">택배사</th>
                <th className="px-3 py-2 font-semibold text-gray-700 dark:text-gray-300">접수</th>
                <th className="px-3 py-2 font-semibold text-gray-700 dark:text-gray-300 text-right">~2kg</th>
                <th className="px-3 py-2 font-semibold text-gray-700 dark:text-gray-300 text-right">~5kg</th>
                <th className="px-3 py-2 font-semibold text-gray-700 dark:text-gray-300 text-right">~10kg</th>
                <th className="px-3 py-2 font-semibold text-gray-700 dark:text-gray-300 text-right">~20kg</th>
                <th className="px-3 py-2 font-semibold text-gray-700 dark:text-gray-300 text-right">한도</th>
                <th className="px-3 py-2 font-semibold text-gray-700 dark:text-gray-300 text-center">배송</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {RATE_TABLE_ROWS.map((row, i) => (
                <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="px-3 py-2 font-medium text-gray-800 dark:text-gray-200 whitespace-nowrap">{row.name}</td>
                  <td className="px-3 py-2 text-gray-500 dark:text-gray-400 whitespace-nowrap">{row.service}</td>
                  <td className="px-3 py-2 text-right text-gray-700 dark:text-gray-300 tabular-nums">{fmtPrice(row.p2)}</td>
                  <td className="px-3 py-2 text-right text-gray-700 dark:text-gray-300 tabular-nums">{fmtPrice(row.p5)}</td>
                  <td className="px-3 py-2 text-right text-gray-700 dark:text-gray-300 tabular-nums">{fmtPrice(row.p10)}</td>
                  <td className="px-3 py-2 text-right text-gray-700 dark:text-gray-300 tabular-nums">{fmtPrice(row.p20)}</td>
                  <td className="px-3 py-2 text-right text-gray-400 dark:text-gray-500 whitespace-nowrap">{row.max}</td>
                  <td className="px-3 py-2 text-center text-gray-400 dark:text-gray-500 whitespace-nowrap">{row.days}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
          * 2025~2026년 기준 개인 접수 요금(타권역). 동일권역은 약 1,000원 저렴. 제주·도서산간 추가요금 별도. CU는 2026년 4월 1일 요금 인상 예정. 최신 요금은 각 택배사 홈페이지에서 확인하세요.
        </p>
      </div>

      {/* Calculation History */}
      <CalculationHistory
        histories={histories}
        isLoading={false}
        onRemoveHistory={removeHistory}
        onClearHistories={clearHistories}
        onLoadHistory={(id) => {
          const inputs = loadFromHistory(id)
          if (inputs) {
            if (inputs.weight !== undefined) setWeight(String(inputs.weight))
            if (inputs.width  !== undefined) setWidth(String(inputs.width))
            if (inputs.height !== undefined) setHeight(String(inputs.height))
            if (inputs.depth  !== undefined) setDepth(String(inputs.depth))
            if (inputs.destination !== undefined) {
              const dest = inputs.destination as string
              if (dest === 'domestic' || dest === 'mainland') setDestination('mainland')
              else if (dest === 'jeju')   setDestination('jeju')
              else if (dest === 'island') setDestination('island')
            }
            if (inputs.carrierCategory !== undefined) {
              setCarrierCategory(inputs.carrierCategory as CarrierCategoryType)
            }
          }
          setShowSaveButton(false)
        }}
        formatResult={(result) => {
          const rates = Object.values(result as Record<string, number>).filter(Boolean)
          if (rates.length === 0) return ''
          return `최저: ${Math.min(...rates).toLocaleString()}원`
        }}
      />
    </div>
  )
}
