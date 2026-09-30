'use client'

import { useState, useMemo, useCallback, useEffect } from 'react'
import { useTranslations } from '@/lib/i18n'
import { Package, Truck, Calculator, Copy, Check, RotateCcw, BookOpen, Save, Store, AlertTriangle } from 'lucide-react'
import { glassCard, glassInset, glassInput } from '@/lib/glass'
import { useCalculationHistory } from '@/hooks/useCalculationHistory'
import CalculationHistory from './CalculationHistory'
import GuideSection from '@/components/GuideSection'

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

// 요금 기준일 · 출처 (개인 발송 기준, 2026-09-30 확인)
const RATE_BASIS = '2026.09'
const RATE_SOURCES: { label: string; url: string }[] = [
  { label: '우정사업본부 소포요금', url: 'https://koreapost.go.kr/kpost/subIndex/201.do' },
  { label: '우체국 방문접수 요금', url: 'https://parcel.epost.go.kr/parcel/use_guide/charge_1.jsp' },
  { label: '롯데택배 요금안내', url: 'https://www.lotteglogis.com/mobile/reservation/feeinfo/write' },
  { label: '로젠택배 요금안내', url: 'https://www.ilogen.com/web/personal/chargeInfo' },
  { label: 'CJ대한통운 배송운임', url: 'https://www.cjlogistics.com/ko/utility/parcel-price' },
  { label: 'GS25 중량별 운임', url: 'https://www.cvsnet.co.kr/service/national-delivery/use/contentsid/205/index.do' },
  { label: 'GS25 반값택배', url: 'https://www.cvsnet.co.kr/service/slow-delivery/use/contentsid/274/index.do' },
  { label: 'CU 반값택배 (ZDNet 2026.02)', url: 'https://zdnet.co.kr/view/?no=20260209092755' },
  { label: '세븐일레븐 착한택배 (헤럴드경제 2026.04)', url: 'https://www.heraldk.com/article/2026040717030145483' },
]

const CARRIER_DATA: CarrierData[] = [
  // ── 일반 택배사 ── (타권역 개인 요금. 동일권역은 보통 1,000원 저렴)
  {
    // 구간(극소 2kg/80cm·소 5kg/100cm·중 10kg/120cm·대 15kg/140cm·특대 20kg/160cm, 최대 25kg)은 공식 운임검색·예약 페이지로 확인
    // 미검증: 공식 페이지가 금액을 폼 제출 후에만 보여 줘 2026 금액 확인 못함(2025.4 기업택배만 인상, 개인요금 동결 보도)
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
  },
  {
    // 미검증: 공식 요금 페이지 접근 불가. 소형(5kg)·중형(15kg) 동일가 구조는 2021.5 보도(초소형 3kg / 소형·중형 동일 / 대형)와 일치해 유지
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
    // 검증: 롯데택배 요금안내 — 타권역 소(5kg/110cm) 6,000 / 중(15kg/130cm) 7,000 / 대(20kg/160cm) 8,000, 제주권 8,000/9,000/10,000
    // 미검증: 도서산간 요금(공식 표에 없음, 기존 값 유지)
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
    // 검증: 로젠 요금안내 — 기본(동일권) 6,000/7,000/9,000/12,000 + 타권역 1,000원
    // 미검증: 제주 추가요금 금액 미공개(5kg 제주 9,500원은 기존 값 유지), 도서산간은 지역별 별도
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
    note: '제주 5kg 초과·도서산간 별도 문의',
  },
  {
    // 검증: 우체국 방문접수(2025.6.1 시행 요금, 2026.09 현행) — 5,000/8,000/10,000/14,000
    // 제주 익일 할증(7,500~)은 제주발(제주→육지)에만 적용, 육지→제주는 D+2 동일요금. 도서 할증 항목 없음(배달기간만 상이)
    id: 'post_visit',
    name: '우체국',
    serviceLabel: '방문접수',
    category: 'standard',
    tiers: [
      { maxWeight: 5,  price: 5000,  jejuPrice: 5000,  islandPrice: 5000  },
      { maxWeight: 10, price: 8000,  jejuPrice: 8000,  islandPrice: 8000  },
      { maxWeight: 20, price: 10000, jejuPrice: 10000, islandPrice: 10000 },
      { maxWeight: 30, price: 14000, jejuPrice: 14000, islandPrice: 14000 },
    ],
    maxWeight: 30, maxGirth: 160, cvsPickupOnly: false,
    jejuAvailable: true, islandAvailable: true, deliveryDays: '익일',
    note: '제주행 D+2 · 도서 배달기간 상이',
  },
  {
    // 검증: 우정사업본부 등기소포 창구 — 4,000~13,000 (육지→제주 D+2 동일요금, 도서 할증 없음)
    id: 'post_registered',
    name: '우체국 등기소포',
    serviceLabel: '창구접수',
    category: 'standard',
    tiers: [
      { maxWeight: 3,  price: 4000,  jejuPrice: 4000,  islandPrice: 4000  },
      { maxWeight: 5,  price: 4500,  jejuPrice: 4500,  islandPrice: 4500  },
      { maxWeight: 7,  price: 5000,  jejuPrice: 5000,  islandPrice: 5000  },
      { maxWeight: 10, price: 6000,  jejuPrice: 6000,  islandPrice: 6000  },
      { maxWeight: 15, price: 7000,  jejuPrice: 7000,  islandPrice: 7000  },
      { maxWeight: 20, price: 8000,  jejuPrice: 8000,  islandPrice: 8000  },
      { maxWeight: 25, price: 11000, jejuPrice: 11000, islandPrice: 11000 },
      { maxWeight: 30, price: 13000, jejuPrice: 13000, islandPrice: 13000 },
    ],
    maxWeight: 30, maxGirth: 160, cvsPickupOnly: false,
    jejuAvailable: true, islandAvailable: true, deliveryDays: '익일',
    note: '추적·배상 가능 · 제주행 D+2',
  },
  {
    // 검증: 우정사업본부 일반소포 D+3 — 2,700~11,700. 우체국은 권역 할증 없음(CUpost: "우체국은 동일권/타권/제주권 요금이 동일")
    id: 'post_regular',
    name: '우체국 일반소포',
    serviceLabel: '창구접수',
    category: 'standard',
    tiers: [
      { maxWeight: 3,  price: 2700,  jejuPrice: 2700,  islandPrice: 2700  },
      { maxWeight: 5,  price: 3200,  jejuPrice: 3200,  islandPrice: 3200  },
      { maxWeight: 7,  price: 3700,  jejuPrice: 3700,  islandPrice: 3700  },
      { maxWeight: 10, price: 4700,  jejuPrice: 4700,  islandPrice: 4700  },
      { maxWeight: 15, price: 5700,  jejuPrice: 5700,  islandPrice: 5700  },
      { maxWeight: 20, price: 6700,  jejuPrice: 6700,  islandPrice: 6700  },
      { maxWeight: 25, price: 9700,  jejuPrice: 9700,  islandPrice: 9700  },
      { maxWeight: 30, price: 11700, jejuPrice: 11700, islandPrice: 11700 },
    ],
    maxWeight: 30, maxGirth: 160, cvsPickupOnly: false,
    jejuAvailable: true, islandAvailable: true, deliveryDays: 'D+3',
    note: '최저가, 추적·배상 없음',
  },
  // ── 편의점 택배 ──
  {
    // 미검증: CUpost 요금표가 동적 로딩이라 금액 확인 못함(2026.1 내일보장택배만 100원 인상 보도). 기존 값 유지. 택배사는 롯데글로벌로지스·우체국 선택
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
    note: '롯데글로벌로지스·우체국 · 집 배달 가능',
  },
  {
    // 검증: ZDNet 2026.02.09 — 2월 200원 할인가 1,600/1,900/~2,500 → 정가 1,800/2,100/2,700. 2026.1 롯데글로벌로지스 이관, 익일 배송
    // 미검증: 제주·도서 노선 요금(CUpost 표 동적 로딩)
    id: 'cu_economy',
    name: 'CU',
    serviceLabel: '반값택배 (편의점→편의점)',
    category: 'cvs',
    tiers: [
      { maxWeight: 0.5, price: 1800 },
      { maxWeight: 1,   price: 2100 },
      { maxWeight: 5,   price: 2700 },
    ],
    maxWeight: 5, maxGirth: 80, cvsPickupOnly: true,
    jejuAvailable: false, islandAvailable: false, deliveryDays: '익일',
    note: '편의점 수령 전용',
  },
  {
    // 검증: GS25 중량별 운임(타권 기준, 제주권 별도, 도서지역 +4,000원)
    // 미검증: 최대 크기(160cm 기존 가정 유지)
    id: 'gs_standard',
    name: 'GS25',
    serviceLabel: '일반택배',
    category: 'cvs',
    tiers: [
      { maxWeight: 0.35, price: 3900,  jejuPrice: 6600,  islandPrice: 7900  },
      { maxWeight: 0.4,  price: 4100,  jejuPrice: 6800,  islandPrice: 8100  },
      { maxWeight: 0.45, price: 4200,  jejuPrice: 6900,  islandPrice: 8200  },
      { maxWeight: 0.5,  price: 4400,  jejuPrice: 7100,  islandPrice: 8400  },
      { maxWeight: 0.6,  price: 4600,  jejuPrice: 7600,  islandPrice: 8600  },
      { maxWeight: 0.7,  price: 4700,  jejuPrice: 7700,  islandPrice: 8700  },
      { maxWeight: 0.8,  price: 4800,  jejuPrice: 7800,  islandPrice: 8800  },
      { maxWeight: 0.9,  price: 4900,  jejuPrice: 7900,  islandPrice: 8900  },
      { maxWeight: 1,    price: 5000,  jejuPrice: 8000,  islandPrice: 9000  },
      { maxWeight: 1.5,  price: 5300,  jejuPrice: 8300,  islandPrice: 9300  },
      { maxWeight: 2,    price: 5600,  jejuPrice: 8600,  islandPrice: 9600  },
      { maxWeight: 3,    price: 5900,  jejuPrice: 8900,  islandPrice: 9900  },
      { maxWeight: 4,    price: 6000,  jejuPrice: 9000,  islandPrice: 10000 },
      { maxWeight: 5,    price: 6200,  jejuPrice: 9200,  islandPrice: 10200 },
      { maxWeight: 7,    price: 7700,  jejuPrice: 10700, islandPrice: 11700 },
      { maxWeight: 10,   price: 8200,  jejuPrice: 10700, islandPrice: 12200 },
      { maxWeight: 15,   price: 9000,  jejuPrice: 12000, islandPrice: 13000 },
      { maxWeight: 20,   price: 10000, jejuPrice: 12000, islandPrice: 14000 },
    ],
    maxWeight: 20, maxGirth: 160, cvsPickupOnly: false,
    jejuAvailable: true, islandAvailable: true, deliveryDays: '익일',
    note: '집 배달 가능 · 동일권 500원~ 저렴',
  },
  {
    // 검증: GS25 반값택배 — 내륙 1,900/2,300/2,700, 제주↔내륙·내륙→도서 3,600/4,000/4,400, 5kg·80cm 이하
    id: 'gs_halfprice',
    name: 'GS25',
    serviceLabel: '반값택배 (편의점→편의점)',
    category: 'cvs',
    tiers: [
      { maxWeight: 0.5, price: 1900, jejuPrice: 3600, islandPrice: 3600 },
      { maxWeight: 1,   price: 2300, jejuPrice: 4000, islandPrice: 4000 },
      { maxWeight: 5,   price: 2700, jejuPrice: 4400, islandPrice: 4400 },
    ],
    maxWeight: 5, maxGirth: 80, cvsPickupOnly: true,
    jejuAvailable: true, islandAvailable: true, deliveryDays: '4일 이내',
    note: '편의점 수령 전용 · 제주 5~7일',
  },
  {
    // 검증: 착한택배 전국 균일 1,980원(바이라인 2025.03), 2026.04 인상 대상 제외(헤럴드경제). 점포 간 배송
    // 미검증: 20kg·160cm 한도(검색 요약으로만 확인, 기존 25kg에서 하향), 제주 노선(2026.2 확대 보도) 요금
    id: 'seven',
    name: '세븐일레븐',
    serviceLabel: '착한택배 (편의점→편의점)',
    category: 'cvs',
    tiers: [
      { maxWeight: 20, price: 1980 },
    ],
    maxWeight: 20, maxGirth: 160, cvsPickupOnly: true,
    jejuAvailable: false, islandAvailable: false, deliveryDays: '2~3일',
    note: '전국 균일가 · 편의점 수령 전용',
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

const BOX_PRESETS: { id: string; w: number; h: number; d: number }[] = [
  // 우체국 택배상자 규격(cm). 6호는 단종
  { id: '0', w: 22.5, h: 15.5, d: 3 },
  { id: '1', w: 22, h: 19, d: 9 },
  { id: '2', w: 27, h: 18, d: 15 },
  { id: '3', w: 34, h: 25, d: 21 },
  { id: '4', w: 41, h: 31, d: 28 },
  { id: '5', w: 48, h: 38, d: 34 },
]

const TABLE_WEIGHTS = [2, 5, 10, 20]

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

  // 전 카테고리(일반+편의점) 결과, 가격순
  const allResults = useMemo(() => {
    return CARRIER_DATA
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
  }, [appliedWeight, girth, destination])

  const carrierResults = allResults.filter(r => r.carrier.category === carrierCategory)
  const bestOverall = allResults[0]?.price != null ? allResults[0] : null
  const availableResults = carrierResults.filter(r => r.price !== null)
  const cheapestPrice = availableResults[0]?.price ?? null

  const updateURL = useCallback((params: Record<string, string>) => {
    const url = new URL(window.location.href)
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v))
    window.history.replaceState({}, '', url.toString())
  }, [])

  // Read URL params on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const w = params.get('weight')
    const wi = params.get('width')
    const h = params.get('height')
    const d = params.get('depth')
    const dest = params.get('destination')
    const cat = params.get('category')
    if (w) setWeight(w)
    if (wi) setWidth(wi)
    if (h) setHeight(h)
    if (d) setDepth(d)
    if (dest === 'mainland' || dest === 'jeju' || dest === 'island') setDestination(dest)
    if (cat === 'standard' || cat === 'cvs') setCarrierCategory(cat)
  }, [])

  // Sync URL when key inputs change
  useEffect(() => {
    updateURL({ weight, width, height, depth, destination, category: carrierCategory })
  }, [weight, width, height, depth, destination, carrierCategory, updateURL])

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

  const inputCls = `${glassInput} px-3 py-2`

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-fg flex items-center gap-2">
          <Package className="w-7 h-7 text-blue-600" />
          {t('title')}
        </h1>
        <p className="text-sm text-muted mt-1">{t('description')}</p>
      </div>

      {/* Main Grid */}
      <div className="grid lg:grid-cols-3 gap-8">
        {/* ── Input Panel ── */}
        <div className="lg:col-span-1">
          <div className={`${glassCard} ${glassInset} p-6 space-y-6`}>

            {/* Weight */}
            <div>
              <label className="block text-sm font-medium text-body mb-2">
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
              <label className="block text-sm font-medium text-body mb-2">
                {t('boxSize')}
              </label>
              <div className="grid grid-cols-3 gap-1.5 mb-3">
                {BOX_PRESETS.map(b => {
                  const active = width === String(b.w) && height === String(b.h) && depth === String(b.d)
                  return (
                    <button
                      key={b.id}
                      type="button"
                      onClick={() => { setWidth(String(b.w)); setHeight(String(b.h)); setDepth(String(b.d)); setShowSaveButton(true) }}
                      title={`${b.w}×${b.h}×${b.d}cm`}
                      aria-pressed={active}
                      className={`py-1.5 rounded-lg text-xs font-medium transition-colors ${
                        active ? 'bg-primary text-white' : 'bg-soft hover:bg-subtle text-body'
                      }`}
                    >
                      {t('boxPreset', { n: b.id })}
                    </button>
                  )
                })}
              </div>
              <div className="space-y-3">
                {([['width', t('width')], ['height', t('height')], ['depth', t('depth')]] as [string, string][]).map(([field, label]) => (
                  <div key={field}>
                    <label className="block text-xs text-muted mb-1">{label}</label>
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
              <div className="mt-3 p-3 bg-subtle rounded-lg">
                <div className="text-xs text-sub">{t('volumeWeightInfo')}</div>
                <div className="text-lg font-semibold text-blue-600 dark:text-blue-400 mt-0.5">
                  {volumeWeight.toFixed(2)} kg
                </div>
                <div className="text-xs text-muted mt-1">
                  {t('girth')}: <span className="font-semibold">{girth.toFixed(0)} cm</span>
                </div>
              </div>
            </div>

            {/* Destination */}
            <div>
              <label className="block text-sm font-medium text-body mb-2">
                {t('destination')}
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                {(['mainland', 'jeju', 'island'] as DestinationType[]).map(dest => [dest, t(`destinations.${dest}`)] as const).map(([dest, label]) => (
                  <button
                    key={dest}
                    onClick={() => { setDestination(dest); setShowSaveButton(true) }}
                    className={`py-2 rounded-lg text-xs font-medium transition-colors ${
                      destination === dest
                        ? 'bg-primary hover:bg-blue-700 text-white'
                        : 'bg-soft hover:bg-gray-200 dark:hover:bg-gray-600 text-body'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Carrier Category */}
            <div>
              <label className="block text-sm font-medium text-body mb-2">
                택배 유형
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => { setCarrierCategory('standard'); setShowSaveButton(true) }}
                  className={`py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-1.5 ${
                    carrierCategory === 'standard'
                      ? 'bg-primary hover:bg-blue-700 text-white'
                      : 'bg-soft hover:bg-gray-200 dark:hover:bg-gray-600 text-body'
                  }`}
                >
                  <Truck className="w-3.5 h-3.5" />
                  일반 택배
                </button>
                <button
                  onClick={() => { setCarrierCategory('cvs'); setShowSaveButton(true) }}
                  className={`py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-1.5 ${
                    carrierCategory === 'cvs'
                      ? 'bg-primary hover:bg-blue-700 text-white'
                      : 'bg-soft hover:bg-gray-200 dark:hover:bg-gray-600 text-body'
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
              className="w-full bg-soft hover:bg-gray-200 dark:hover:bg-gray-600 text-body rounded-lg px-4 py-2 font-medium flex items-center justify-center gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              {t('reset')}
            </button>
          </div>
        </div>

        {/* ── Results Panel ── */}
        <div className="lg:col-span-2 space-y-6">

          {/* Overall Best Pick (일반 + 편의점) */}
          {bestOverall && (
            <div className={`${glassCard} p-6`}>
              <div className="text-sm text-muted">{t('bestOverall.title')}</div>
              <div className="mt-1 flex items-end justify-between gap-3 flex-wrap">
                <div className="min-w-0">
                  <div className="text-base font-semibold text-fg">
                    {bestOverall.carrier.name} <span className="text-sm font-normal text-muted">{bestOverall.carrier.serviceLabel}</span>
                  </div>
                  <div className="mt-1.5 flex flex-wrap gap-1.5 text-xs">
                    <span className="px-2 py-0.5 rounded-full bg-soft text-body">
                      {bestOverall.carrier.category === 'cvs' ? t('bestOverall.cvsDropoff') : t('bestOverall.noCvs')}
                    </span>
                    {bestOverall.carrier.cvsPickupOnly && (
                      <span className="px-2 py-0.5 rounded-full bg-soft text-body">{t('bestOverall.cvsPickup')}</span>
                    )}
                    <span className="px-2 py-0.5 rounded-full bg-soft text-body">{bestOverall.carrier.deliveryDays}</span>
                  </div>
                </div>
                <div className="text-3xl font-bold text-fg tabular-nums">
                  {bestOverall.price!.toLocaleString()}{t('result.won')}
                </div>
              </div>
            </div>
          )}

          {/* Weight Summary */}
          <div className={`${glassCard} ${glassInset} p-6`}>
            <h2 className="text-lg font-semibold text-fg mb-4 flex items-center gap-2">
              무게 계산
            </h2>
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 bg-subtle rounded-lg text-center">
                <div className="text-xs text-muted">{t('result.actualWeight')}</div>
                <div className="text-xl font-bold text-fg mt-1">
                  {parseFloat(weight) || 0}<span className="text-sm font-normal ml-1">kg</span>
                </div>
              </div>
              <div className="p-3 bg-subtle rounded-lg text-center">
                <div className="text-xs text-muted">{t('result.volumeWeight')}</div>
                <div className="text-xl font-bold text-fg mt-1">
                  {volumeWeight.toFixed(2)}<span className="text-sm font-normal ml-1">kg</span>
                </div>
              </div>
              <div className="p-3 bg-subtle rounded-lg text-center border-2 border-line">
                <div className="text-xs text-blue-600 dark:text-blue-400">{t('result.appliedWeight')}</div>
                <div className="text-xl font-bold text-sub mt-1">
                  {appliedWeight.toFixed(2)}<span className="text-sm font-normal ml-1">kg</span>
                </div>
              </div>
            </div>
            {appliedWeight === volumeWeight && appliedWeight > (parseFloat(weight) || 0) && (
              <div className="mt-3 flex items-center gap-2 text-xs text-orange-600 dark:text-orange-400 bg-subtle rounded-lg p-2.5">
                <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                {t('volumeWeightWarning')}
              </div>
            )}
          </div>

          {/* Carrier Rates */}
          <div className={`${glassCard} ${glassInset} p-6`}>
            <h2 className="text-lg font-semibold text-fg mb-4 flex items-center gap-2">
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
                        ? 'bg-subtle border-line opacity-50'
                        : isCheapest
                        ? 'bg-subtle border-green-400 dark:border-green-600'
                        : 'bg-subtle border-line'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center flex-wrap gap-1.5">
                          <span className={`font-semibold text-sm ${isUnavailable ? 'text-faint' : 'text-fg'}`}>
                            {carrier.name}
                          </span>
                          <span className="text-xs text-muted">{carrier.serviceLabel}</span>
                          {isCheapest && (
                            <span className="px-1.5 py-0.5 text-xs bg-green-500 text-white rounded-full font-medium">최저가</span>
                          )}
                          {carrier.cvsPickupOnly && !isUnavailable && (
                            <span className="px-1.5 py-0.5 text-xs bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-300 rounded-full">편의점 수령</span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs text-faint">배송 {carrier.deliveryDays}</span>
                          {carrier.note && (
                            <span className="text-xs text-faint">· {carrier.note}</span>
                          )}
                        </div>
                      </div>
                      <div className="flex-shrink-0 flex items-center gap-1.5">
                        {isUnavailable ? (
                          <span className="text-xs text-red-500 dark:text-red-400 font-medium">{unavailableReason}</span>
                        ) : (
                          <>
                            <span className={`text-lg font-bold ${isCheapest ? 'text-sub' : 'text-fg'}`}>
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
              <div className="mt-5 p-4 bg-subtle rounded-lg">
                <div className="text-sm text-muted mb-1">가격 범위</div>
                <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
                  {availableResults[0].price!.toLocaleString()}원 ~ {availableResults[availableResults.length - 1].price!.toLocaleString()}원
                </div>
                <div className="text-xs text-faint mt-1">
                  최대 {(availableResults[availableResults.length - 1].price! - availableResults[0].price!).toLocaleString()}원 차이
                  {' · '}{availableResults.length}개 서비스 이용 가능
                </div>
              </div>
            )}

            <p className="mt-3 text-xs text-faint text-right">
              {t('rateBasis', { date: RATE_BASIS })} · {t('result.note')}
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
      <div className={`${glassCard} ${glassInset} p-6`}>
        <h2 className="text-xl font-semibold text-fg mb-6 flex items-center gap-2">
          {t('guide.title')}
        </h2>

        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <div>
            <h3 className="text-base font-semibold text-fg mb-3">
              {t('guide.calculation.title')}
            </h3>
            <ul className="space-y-2">
              {(t.raw('guide.calculation.items') as string[]).map((item, idx) => (
                <li key={idx} className="flex gap-2 text-sm text-sub">
                  <span className="text-blue-600 dark:text-blue-400 flex-shrink-0">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="text-base font-semibold text-fg mb-3">
              {t('guide.tips.title')}
            </h3>
            <ul className="space-y-2">
              {(t.raw('guide.tips.items') as string[]).map((item, idx) => (
                <li key={idx} className="flex gap-2 text-sm text-sub">
                  <span className="text-green-600 dark:text-green-400 flex-shrink-0">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Rate Reference Table — CARRIER_DATA에서 파생 */}
        <h3 className="text-base font-semibold text-fg mb-1">
          {t('rateTable.title')}
        </h3>
        <p className="text-xs text-muted mb-3">{t('rateBasis', { date: RATE_BASIS })}</p>
        <div className="overflow-x-auto rounded-lg border border-line">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="bg-soft">
                <th className="px-3 py-2 font-semibold text-body">{t('rateTable.carrier')}</th>
                <th className="px-3 py-2 font-semibold text-body">{t('rateTable.service')}</th>
                {TABLE_WEIGHTS.map(w => (
                  <th key={w} className="px-3 py-2 font-semibold text-body text-right">~{w}kg</th>
                ))}
                <th className="px-3 py-2 font-semibold text-body text-right">{t('rateTable.limit')}</th>
                <th className="px-3 py-2 font-semibold text-body text-center">{t('rateTable.days')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {CARRIER_DATA.map(c => (
                <tr key={c.id} className="hover:bg-subtle">
                  <td className="px-3 py-2 font-medium text-body whitespace-nowrap">{c.name}</td>
                  <td className="px-3 py-2 text-muted whitespace-nowrap">{c.serviceLabel}</td>
                  {TABLE_WEIGHTS.map(w => (
                    <td key={w} className="px-3 py-2 text-right text-body tabular-nums">
                      {fmtPrice(getCarrierPrice(c, w, 0, 'mainland'))}
                    </td>
                  ))}
                  <td className="px-3 py-2 text-right text-faint whitespace-nowrap">{c.maxWeight}kg/{c.maxGirth}cm</td>
                  <td className="px-3 py-2 text-center text-faint whitespace-nowrap">{c.deliveryDays}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-faint mt-2">
          {t('rateTable.note')}
        </p>
        <div className="mt-3 text-xs text-muted">
          <span className="font-medium text-body">{t('rateTable.sources')}</span>{' '}
          {RATE_SOURCES.map((src, i) => (
            <span key={src.url}>
              {i > 0 && ' · '}
              <a href={src.url} target="_blank" rel="noopener noreferrer" className="underline hover:text-fg">{src.label}</a>
            </span>
          ))}
        </div>
      </div>

      {/* Guide Section */}
      <GuideSection namespace="shippingCalc" />

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
