'use client'

/**
 * MarginCalculator - 마진 계산기
 * Translation namespace: marginCalc
 *
 * ── 번역 키 목록 ──
 * marginCalc.title
 * marginCalc.description
 * marginCalc.mode.calculate          // 마진 계산 모드 라벨
 * marginCalc.mode.reverse            // 역산 모드 라벨
 * marginCalc.input.sellingPrice      // 판매가
 * marginCalc.input.costPrice         // 상품 원가
 * marginCalc.input.platform          // 플랫폼 선택
 * marginCalc.input.platformCustom    // 직접입력
 * marginCalc.input.commissionRate    // 수수료율
 * marginCalc.input.shippingCost      // 배송비 (판매자부담)
 * marginCalc.input.packagingCost     // 포장비 (건당)
 * marginCalc.input.adCost            // 광고비 (건당 배분)
 * marginCalc.input.taxType           // 과세 유형
 * marginCalc.input.targetMargin      // 목표 마진율
 * marginCalc.input.monthlySales      // 월 판매량
 * marginCalc.input.unit              // 원
 * marginCalc.input.percent           // %
 * marginCalc.input.count             // 개
 * marginCalc.platform.coupang        // 쿠팡
 * marginCalc.platform.smartstore     // 스마트스토어
 * marginCalc.platform.elevenst       // 11번가
 * marginCalc.platform.custom         // 직접입력
 * marginCalc.taxType.general         // 일반과세자
 * marginCalc.taxType.simplified      // 간이과세자
 * marginCalc.taxType.exempt          // 면세사업자
 * marginCalc.result.netProfit        // 순이익
 * marginCalc.result.marginRate       // 마진율
 * marginCalc.result.markupRate       // 마크업률
 * marginCalc.result.breakEvenQty     // 손익분기 수량
 * marginCalc.result.breakEvenUnit    // 개
 * marginCalc.result.perItem          // 건당
 * marginCalc.result.calculatedPrice  // 산출 판매가
 * marginCalc.result.deficit          // 적자
 * marginCalc.costBreakdown.title     // 비용 구성 분석
 * marginCalc.costBreakdown.cost      // 원가
 * marginCalc.costBreakdown.commission// 수수료
 * marginCalc.costBreakdown.shipping  // 배송비
 * marginCalc.costBreakdown.packaging // 포장비
 * marginCalc.costBreakdown.ad        // 광고비
 * marginCalc.costBreakdown.tax       // 부가세
 * marginCalc.costBreakdown.profit    // 순이익
 * marginCalc.detail.title            // 상세 내역
 * marginCalc.detail.item             // 항목
 * marginCalc.detail.amount           // 금액
 * marginCalc.detail.ratio            // 비율
 * marginCalc.detail.sellingPrice     // 판매가
 * marginCalc.detail.totalCost        // 총비용
 * marginCalc.monthly.title           // 월간 시뮬레이션
 * marginCalc.monthly.revenue         // 월 매출
 * marginCalc.monthly.totalCost       // 월 총비용
 * marginCalc.monthly.netProfit       // 월 순이익
 * marginCalc.guide.title
 * marginCalc.guide.margin.title
 * marginCalc.guide.margin.items      // string[]
 * marginCalc.guide.reverse.title
 * marginCalc.guide.reverse.items     // string[]
 * marginCalc.guide.platform.title
 * marginCalc.guide.platform.items    // string[]
 * marginCalc.guide.tax.title
 * marginCalc.guide.tax.items         // string[]
 */

import { useState, useCallback, useEffect, useMemo } from 'react'
import { useTranslations } from 'next-intl'
import { useSearchParams } from 'next/navigation'
import {
  Calculator,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Package,
  Truck,
  BarChart3,
  BookOpen,
  Target,
  ShoppingCart,
  ArrowRightLeft
} from 'lucide-react'

// ── 타입 정의 ──

type CalcMode = 'calculate' | 'reverse'
type TaxType = 'general' | 'simplified' | 'exempt'
type PlatformKey = 'coupang' | 'smartstore' | 'elevenst' | 'custom'

interface PlatformInfo {
  key: PlatformKey
  rate: number
}

interface CalcResult {
  sellingPrice: number
  costPrice: number
  commissionAmount: number
  commissionRate: number
  shippingCost: number
  packagingCost: number
  adCost: number
  vatAmount: number
  totalCost: number
  netProfit: number
  marginRate: number
  markupRate: number
  breakEvenQty: number | null
}

// ── 상수 ──

const PLATFORMS: PlatformInfo[] = [
  { key: 'coupang', rate: 10.9 },
  { key: 'smartstore', rate: 5.5 },
  { key: 'elevenst', rate: 10 },
  { key: 'custom', rate: 0 },
]

// 간이과세자 부가가치율 (소매업 기준)
const SIMPLIFIED_TAX_RATIO = 0.15

// ── 비용 바 색상 ──
const COST_COLORS: Record<string, string> = {
  cost: 'bg-gray-400 dark:bg-gray-500',
  commission: 'bg-purple-500',
  shipping: 'bg-blue-500',
  packaging: 'bg-yellow-500',
  ad: 'bg-orange-500',
  tax: 'bg-red-500',
  profit: 'bg-green-500',
}

const COST_TEXT_COLORS: Record<string, string> = {
  cost: 'text-gray-600 dark:text-gray-400',
  commission: 'text-purple-600 dark:text-purple-400',
  shipping: 'text-blue-600 dark:text-blue-400',
  packaging: 'text-yellow-600 dark:text-yellow-400',
  ad: 'text-orange-600 dark:text-orange-400',
  tax: 'text-red-600 dark:text-red-400',
  profit: 'text-green-600 dark:text-green-400',
}

// ── 유틸리티 ──

const formatNumber = (num: number): string => {
  return Math.round(num).toLocaleString('ko-KR')
}

const formatInputValue = (num: number): string => {
  if (num === 0) return ''
  return num.toLocaleString('ko-KR')
}

// ── 컴포넌트 ──

export default function MarginCalculator() {
  const t = useTranslations('marginCalc')
  const searchParams = useSearchParams()

  // ── State ──
  const [mode, setMode] = useState<CalcMode>('calculate')
  const [sellingPrice, setSellingPrice] = useState(0)
  const [costPrice, setCostPrice] = useState(0)
  const [platformKey, setPlatformKey] = useState<PlatformKey>('coupang')
  const [customRate, setCustomRate] = useState(0)
  const [shippingCost, setShippingCost] = useState(0)
  const [packagingCost, setPackagingCost] = useState(0)
  const [adCost, setAdCost] = useState(0)
  const [taxType, setTaxType] = useState<TaxType>('general')
  const [targetMargin, setTargetMargin] = useState(30)
  const [monthlySales, setMonthlySales] = useState(100)

  // ── URL 파라미터 초기화 ──
  useEffect(() => {
    const m = searchParams.get('mode')
    if (m === 'calculate' || m === 'reverse') setMode(m)

    const sp = searchParams.get('sp')
    if (sp) setSellingPrice(parseFloat(sp) || 0)

    const cp = searchParams.get('cp')
    if (cp) setCostPrice(parseFloat(cp) || 0)

    const pf = searchParams.get('pf')
    if (pf && ['coupang', 'smartstore', 'elevenst', 'custom'].includes(pf)) {
      setPlatformKey(pf as PlatformKey)
    }

    const cr = searchParams.get('cr')
    if (cr) setCustomRate(parseFloat(cr) || 0)

    const sc = searchParams.get('sc')
    if (sc) setShippingCost(parseFloat(sc) || 0)

    const pc = searchParams.get('pc')
    if (pc) setPackagingCost(parseFloat(pc) || 0)

    const ac = searchParams.get('ac')
    if (ac) setAdCost(parseFloat(ac) || 0)

    const tt = searchParams.get('tt')
    if (tt === 'general' || tt === 'simplified' || tt === 'exempt') setTaxType(tt)

    const tm = searchParams.get('tm')
    if (tm) setTargetMargin(parseFloat(tm) || 30)

    const ms = searchParams.get('ms')
    if (ms) setMonthlySales(parseInt(ms) || 100)
  }, [searchParams])

  // ── URL 동기화 ──
  const updateURL = useCallback((params: Record<string, string | number>) => {
    if (typeof window === 'undefined') return
    const url = new URL(window.location.href)
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.set(key, String(value))
    })
    window.history.replaceState({}, '', url)
  }, [])

  useEffect(() => {
    updateURL({
      mode,
      sp: sellingPrice,
      cp: costPrice,
      pf: platformKey,
      cr: customRate,
      sc: shippingCost,
      pc: packagingCost,
      ac: adCost,
      tt: taxType,
      tm: targetMargin,
      ms: monthlySales,
    })
  }, [mode, sellingPrice, costPrice, platformKey, customRate, shippingCost, packagingCost, adCost, taxType, targetMargin, monthlySales, updateURL])

  // ── 수수료율 ──
  const commissionRate = useMemo(() => {
    if (platformKey === 'custom') return customRate / 100
    const platform = PLATFORMS.find(p => p.key === platformKey)
    return (platform?.rate ?? 0) / 100
  }, [platformKey, customRate])

  // ── 부가세 계산 ──
  const calcVAT = useCallback((sp: number, cp: number, tt: TaxType): number => {
    if (tt === 'exempt') return 0
    if (tt === 'simplified') {
      // 간이과세자: 공급대가 × 부가가치율 × 10%
      return sp * SIMPLIFIED_TAX_RATIO * 0.1
    }
    // 일반과세자: (판매가 - 원가) × 10/110
    const margin = sp - cp
    if (margin <= 0) return 0
    return margin * 10 / 110
  }, [])

  // ── 역산: 목표 마진율에서 판매가 산출 ──
  const calcReverseSellingPrice = useCallback((): number => {
    const targetRate = targetMargin / 100
    const baseCost = costPrice + shippingCost + packagingCost + adCost

    // 면세: 간단 공식
    if (taxType === 'exempt') {
      const denom = 1 - commissionRate - targetRate
      if (denom <= 0) return 0
      return baseCost / denom
    }

    // 세금 포함: 반복 수렴
    let sp = baseCost / (1 - commissionRate - targetRate) // 초기값
    for (let i = 0; i < 20; i++) {
      const comm = sp * commissionRate
      const vat = calcVAT(sp, costPrice, taxType)
      const totalCost = costPrice + comm + shippingCost + packagingCost + adCost + vat
      const requiredSp = totalCost / (1 - targetRate)
      if (Math.abs(requiredSp - sp) < 1) {
        sp = requiredSp
        break
      }
      sp = requiredSp
    }
    return Math.max(0, sp)
  }, [costPrice, shippingCost, packagingCost, adCost, commissionRate, targetMargin, taxType, calcVAT])

  // ── 메인 계산 결과 ──
  const result: CalcResult | null = useMemo(() => {
    let sp: number
    const cp = costPrice

    if (mode === 'reverse') {
      if (cp <= 0) return null
      sp = calcReverseSellingPrice()
      if (sp <= 0) return null
    } else {
      sp = sellingPrice
      if (sp <= 0 || cp <= 0) return null
    }

    const commAmount = sp * commissionRate
    const vat = calcVAT(sp, cp, taxType)
    const totalCost = cp + commAmount + shippingCost + packagingCost + adCost + vat
    const netProfit = sp - totalCost
    const marginRate = sp > 0 ? (netProfit / sp) * 100 : 0
    const markupRate = cp > 0 ? (netProfit / cp) * 100 : 0

    // 손익분기 수량: 건당 이익으로 나눔
    let breakEvenQty: number | null = null
    if (netProfit > 0) {
      breakEvenQty = 1 // 건당 이익이 있으면 1개부터 수익
    } else if (netProfit === 0) {
      breakEvenQty = null
    } else {
      breakEvenQty = null // 적자면 손익분기 불가
    }

    // 광고비를 월 고정비로 볼 경우: breakEven = monthlyAdCost / (sp - variableCost)
    // 여기서는 건당 배분이므로 이미 변동비에 포함
    // 하지만 월간 고정비 개념이 있다면:
    const monthlyFixedAd = adCost * monthlySales // 총 광고비
    const variableCostPerUnit = cp + (sp * commissionRate) + shippingCost + packagingCost + vat
    const contributionPerUnit = sp - variableCostPerUnit
    if (contributionPerUnit > 0 && monthlyFixedAd > 0) {
      breakEvenQty = Math.ceil(monthlyFixedAd / contributionPerUnit)
    } else if (contributionPerUnit > 0) {
      breakEvenQty = 1
    }

    return {
      sellingPrice: sp,
      costPrice: cp,
      commissionAmount: commAmount,
      commissionRate: commissionRate * 100,
      shippingCost,
      packagingCost,
      adCost,
      vatAmount: vat,
      totalCost,
      netProfit,
      marginRate,
      markupRate,
      breakEvenQty,
    }
  }, [mode, sellingPrice, costPrice, commissionRate, shippingCost, packagingCost, adCost, taxType, monthlySales, calcVAT, calcReverseSellingPrice])

  // ── 비용 구성 데이터 ──
  const costBreakdown = useMemo(() => {
    if (!result) return []
    const sp = result.sellingPrice
    if (sp <= 0) return []

    const items = [
      { key: 'cost', value: result.costPrice },
      { key: 'commission', value: result.commissionAmount },
      { key: 'shipping', value: result.shippingCost },
      { key: 'packaging', value: result.packagingCost },
      { key: 'ad', value: result.adCost },
      { key: 'tax', value: result.vatAmount },
      { key: 'profit', value: Math.max(0, result.netProfit) },
    ]

    return items.map(item => ({
      ...item,
      percent: sp > 0 ? (item.value / sp) * 100 : 0,
    }))
  }, [result])

  // ── 월간 시뮬레이션 ──
  const monthlySimulation = useMemo(() => {
    if (!result) return null
    const qty = monthlySales
    return {
      revenue: result.sellingPrice * qty,
      totalCost: result.totalCost * qty,
      netProfit: result.netProfit * qty,
    }
  }, [result, monthlySales])

  // ── 숫자 입력 핸들러 ──
  const handleNumberInput = useCallback((setter: (v: number) => void) => {
    return (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value.replace(/[^0-9.]/g, '')
      setter(parseFloat(raw) || 0)
    }
  }, [])

  // ── 렌더링 ──
  return (
    <div className="space-y-8">
      {/* 헤더 */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <Calculator className="w-7 h-7 text-blue-600" />
          {t('title')}
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('description')}</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* ── 입력 패널 (1/3) ── */}
        <div className="lg:col-span-1 space-y-4">
          {/* 모드 토글 */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 space-y-5">
            <div className="flex rounded-lg overflow-hidden border border-gray-200 dark:border-gray-600">
              <button
                onClick={() => setMode('calculate')}
                className={`flex-1 py-2.5 text-sm font-medium transition-colors ${
                  mode === 'calculate'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                {t('mode.calculate')}
              </button>
              <button
                onClick={() => setMode('reverse')}
                className={`flex-1 py-2.5 text-sm font-medium transition-colors ${
                  mode === 'reverse'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                {t('mode.reverse')}
              </button>
            </div>

            {/* 판매가 (마진 계산 모드만) */}
            {mode === 'calculate' && (
              <InputField
                label={t('input.sellingPrice')}
                value={sellingPrice}
                onChange={handleNumberInput(setSellingPrice)}
                unit={t('input.unit')}
                icon={<DollarSign className="w-4 h-4" />}
              />
            )}

            {/* 목표 마진율 (역산 모드만) */}
            {mode === 'reverse' && (
              <InputField
                label={t('input.targetMargin')}
                value={targetMargin}
                onChange={handleNumberInput(setTargetMargin)}
                unit={t('input.percent')}
                icon={<Target className="w-4 h-4" />}
              />
            )}

            {/* 상품 원가 */}
            <InputField
              label={t('input.costPrice')}
              value={costPrice}
              onChange={handleNumberInput(setCostPrice)}
              unit={t('input.unit')}
              icon={<Package className="w-4 h-4" />}
            />

            {/* 플랫폼 선택 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                {t('input.platform')}
              </label>
              <select
                value={platformKey}
                onChange={(e) => setPlatformKey(e.target.value as PlatformKey)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 text-sm"
              >
                {PLATFORMS.map((p) => (
                  <option key={p.key} value={p.key}>
                    {t(`platform.${p.key}`)} {p.key !== 'custom' ? `(${p.rate}%)` : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* 직접입력 수수료율 */}
            {platformKey === 'custom' && (
              <InputField
                label={t('input.commissionRate')}
                value={customRate}
                onChange={handleNumberInput(setCustomRate)}
                unit={t('input.percent')}
                icon={<ArrowRightLeft className="w-4 h-4" />}
              />
            )}

            {/* 배송비 */}
            <InputField
              label={t('input.shippingCost')}
              value={shippingCost}
              onChange={handleNumberInput(setShippingCost)}
              unit={t('input.unit')}
              icon={<Truck className="w-4 h-4" />}
            />

            {/* 포장비 */}
            <InputField
              label={t('input.packagingCost')}
              value={packagingCost}
              onChange={handleNumberInput(setPackagingCost)}
              unit={t('input.unit')}
              icon={<Package className="w-4 h-4" />}
            />

            {/* 광고비 */}
            <InputField
              label={t('input.adCost')}
              value={adCost}
              onChange={handleNumberInput(setAdCost)}
              unit={t('input.unit')}
              icon={<TrendingUp className="w-4 h-4" />}
            />

            {/* 과세 유형 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                {t('input.taxType')}
              </label>
              <select
                value={taxType}
                onChange={(e) => setTaxType(e.target.value as TaxType)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 text-sm"
              >
                <option value="general">{t('taxType.general')}</option>
                <option value="simplified">{t('taxType.simplified')}</option>
                <option value="exempt">{t('taxType.exempt')}</option>
              </select>
            </div>
          </div>
        </div>

        {/* ── 결과 패널 (2/3) ── */}
        <div className="lg:col-span-2 space-y-6">
          {result ? (
            <>
              {/* 핵심 지표 카드 4개 */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {/* 순이익 */}
                <MetricCard
                  icon={<DollarSign className="w-5 h-5" />}
                  label={t('result.netProfit')}
                  value={`${formatNumber(result.netProfit)}${t('input.unit')}`}
                  sublabel={t('result.perItem')}
                  positive={result.netProfit >= 0}
                />
                {/* 마진율 */}
                <MetricCard
                  icon={<BarChart3 className="w-5 h-5" />}
                  label={t('result.marginRate')}
                  value={`${result.marginRate.toFixed(1)}%`}
                  positive={result.marginRate >= 0}
                />
                {/* 마크업률 */}
                <MetricCard
                  icon={<TrendingUp className="w-5 h-5" />}
                  label={t('result.markupRate')}
                  value={`${result.markupRate.toFixed(1)}%`}
                  positive={result.markupRate >= 0}
                />
                {/* 손익분기 수량 */}
                <MetricCard
                  icon={<ShoppingCart className="w-5 h-5" />}
                  label={t('result.breakEvenQty')}
                  value={result.breakEvenQty !== null ? `${formatNumber(result.breakEvenQty)}${t('result.breakEvenUnit')}` : '-'}
                  neutral
                />
              </div>

              {/* 역산 모드: 산출 판매가 */}
              {mode === 'reverse' && (
                <div className="bg-blue-50 dark:bg-blue-950 rounded-xl p-4 flex items-center gap-3">
                  <Target className="w-6 h-6 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                  <div>
                    <p className="text-sm text-blue-700 dark:text-blue-300 font-medium">{t('result.calculatedPrice')}</p>
                    <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">
                      {formatNumber(result.sellingPrice)}{t('input.unit')}
                    </p>
                  </div>
                </div>
              )}

              {/* 비용 구성 분석 (스택 바) */}
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  {t('costBreakdown.title')}
                </h2>
                {/* 스택 바 */}
                <div className="h-8 rounded-lg overflow-hidden flex mb-4">
                  {costBreakdown.map((item) =>
                    item.percent > 0 ? (
                      <div
                        key={item.key}
                        className={`${COST_COLORS[item.key]} transition-all duration-300`}
                        style={{ width: `${item.percent}%` }}
                        title={`${t(`costBreakdown.${item.key}`)} ${item.percent.toFixed(1)}%`}
                      />
                    ) : null
                  )}
                  {/* 적자인 경우 나머지 빈 공간 표시 없음 */}
                </div>
                {/* 범례 */}
                <div className="flex flex-wrap gap-x-4 gap-y-2">
                  {costBreakdown.map((item) => (
                    <div key={item.key} className="flex items-center gap-1.5 text-xs">
                      <span className={`w-3 h-3 rounded-sm ${COST_COLORS[item.key]}`} />
                      <span className={COST_TEXT_COLORS[item.key]}>
                        {t(`costBreakdown.${item.key}`)} {item.percent.toFixed(1)}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* 상세 내역 테이블 */}
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  {t('detail.title')}
                </h2>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200 dark:border-gray-700">
                        <th className="text-left py-2 text-gray-500 dark:text-gray-400 font-medium">{t('detail.item')}</th>
                        <th className="text-right py-2 text-gray-500 dark:text-gray-400 font-medium">{t('detail.amount')}</th>
                        <th className="text-right py-2 text-gray-500 dark:text-gray-400 font-medium">{t('detail.ratio')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      <DetailRow
                        label={t('detail.sellingPrice')}
                        amount={result.sellingPrice}
                        ratio={100}
                        unit={t('input.unit')}
                        bold
                      />
                      <DetailRow
                        label={t('costBreakdown.cost')}
                        amount={result.costPrice}
                        ratio={result.sellingPrice > 0 ? (result.costPrice / result.sellingPrice) * 100 : 0}
                        unit={t('input.unit')}
                        color={COST_TEXT_COLORS.cost}
                      />
                      <DetailRow
                        label={`${t('costBreakdown.commission')} (${result.commissionRate.toFixed(1)}%)`}
                        amount={result.commissionAmount}
                        ratio={result.sellingPrice > 0 ? (result.commissionAmount / result.sellingPrice) * 100 : 0}
                        unit={t('input.unit')}
                        color={COST_TEXT_COLORS.commission}
                      />
                      <DetailRow
                        label={t('costBreakdown.shipping')}
                        amount={result.shippingCost}
                        ratio={result.sellingPrice > 0 ? (result.shippingCost / result.sellingPrice) * 100 : 0}
                        unit={t('input.unit')}
                        color={COST_TEXT_COLORS.shipping}
                      />
                      <DetailRow
                        label={t('costBreakdown.packaging')}
                        amount={result.packagingCost}
                        ratio={result.sellingPrice > 0 ? (result.packagingCost / result.sellingPrice) * 100 : 0}
                        unit={t('input.unit')}
                        color={COST_TEXT_COLORS.packaging}
                      />
                      <DetailRow
                        label={t('costBreakdown.ad')}
                        amount={result.adCost}
                        ratio={result.sellingPrice > 0 ? (result.adCost / result.sellingPrice) * 100 : 0}
                        unit={t('input.unit')}
                        color={COST_TEXT_COLORS.ad}
                      />
                      <DetailRow
                        label={t('costBreakdown.tax')}
                        amount={result.vatAmount}
                        ratio={result.sellingPrice > 0 ? (result.vatAmount / result.sellingPrice) * 100 : 0}
                        unit={t('input.unit')}
                        color={COST_TEXT_COLORS.tax}
                      />
                      <tr className="border-t border-gray-200 dark:border-gray-700">
                        <td className="py-2 font-medium text-gray-700 dark:text-gray-300">{t('detail.totalCost')}</td>
                        <td className="py-2 text-right font-medium text-gray-900 dark:text-white">
                          {formatNumber(result.totalCost)}{t('input.unit')}
                        </td>
                        <td className="py-2 text-right font-medium text-gray-500 dark:text-gray-400">
                          {result.sellingPrice > 0 ? ((result.totalCost / result.sellingPrice) * 100).toFixed(1) : '0.0'}%
                        </td>
                      </tr>
                      <tr className="border-t-2 border-gray-300 dark:border-gray-600">
                        <td className="py-2 font-bold text-gray-900 dark:text-white">{t('result.netProfit')}</td>
                        <td className={`py-2 text-right font-bold ${result.netProfit >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-500 dark:text-red-400'}`}>
                          {formatNumber(result.netProfit)}{t('input.unit')}
                          {result.netProfit < 0 && ` (${t('result.deficit')})`}
                        </td>
                        <td className={`py-2 text-right font-bold ${result.netProfit >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-500 dark:text-red-400'}`}>
                          {result.marginRate.toFixed(1)}%
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* 월간 시뮬레이션 */}
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  {t('monthly.title')}
                </h2>
                <div className="mb-4">
                  <InputField
                    label={t('input.monthlySales')}
                    value={monthlySales}
                    onChange={handleNumberInput(setMonthlySales)}
                    unit={t('input.count')}
                    icon={<ShoppingCart className="w-4 h-4" />}
                  />
                </div>
                {monthlySimulation && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 text-center">
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{t('monthly.revenue')}</p>
                      <p className="text-lg font-bold text-gray-900 dark:text-white">
                        {formatNumber(monthlySimulation.revenue)}{t('input.unit')}
                      </p>
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 text-center">
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{t('monthly.totalCost')}</p>
                      <p className="text-lg font-bold text-gray-900 dark:text-white">
                        {formatNumber(monthlySimulation.totalCost)}{t('input.unit')}
                      </p>
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 text-center">
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{t('monthly.netProfit')}</p>
                      <p className={`text-lg font-bold ${monthlySimulation.netProfit >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-500 dark:text-red-400'}`}>
                        {formatNumber(monthlySimulation.netProfit)}{t('input.unit')}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-12 text-center">
              <Calculator className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
              <p className="text-gray-400 dark:text-gray-500">
                {mode === 'calculate' ? t('input.sellingPrice') : t('input.costPrice')}
                {' & '}
                {t('input.costPrice')}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* 가이드 섹션 */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-blue-600" />
          {t('guide.title')}
        </h2>
        <div className="grid md:grid-cols-2 gap-6">
          <GuideSection title={t('guide.margin.title')} items={t.raw('guide.margin.items') as string[]} />
          <GuideSection title={t('guide.reverse.title')} items={t.raw('guide.reverse.items') as string[]} />
          <GuideSection title={t('guide.platform.title')} items={t.raw('guide.platform.items') as string[]} />
          <GuideSection title={t('guide.tax.title')} items={t.raw('guide.tax.items') as string[]} />
        </div>
      </div>
    </div>
  )
}

// ── 서브 컴포넌트 ──

interface InputFieldProps {
  label: string
  value: number
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  unit: string
  icon?: React.ReactNode
}

function InputField({ label, value, onChange, unit, icon }: InputFieldProps) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 flex items-center gap-1.5">
        {icon && <span className="text-gray-400 dark:text-gray-500">{icon}</span>}
        {label}
      </label>
      <div className="relative">
        <input
          type="text"
          inputMode="decimal"
          value={value === 0 ? '' : formatInputValue(value)}
          onChange={onChange}
          placeholder="0"
          className="w-full px-3 py-2 pr-10 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 text-sm text-right"
        />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 dark:text-gray-500">
          {unit}
        </span>
      </div>
    </div>
  )
}

interface MetricCardProps {
  icon: React.ReactNode
  label: string
  value: string
  sublabel?: string
  positive?: boolean
  neutral?: boolean
}

function MetricCard({ icon, label, value, sublabel, positive, neutral }: MetricCardProps) {
  const colorClass = neutral
    ? 'text-gray-900 dark:text-white'
    : positive
      ? 'text-green-600 dark:text-green-400'
      : 'text-red-500 dark:text-red-400'

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-gray-400 dark:text-gray-500">{icon}</span>
        <span className="text-xs text-gray-500 dark:text-gray-400">{label}</span>
      </div>
      <p className={`text-lg font-bold ${colorClass}`}>
        {value}
      </p>
      {sublabel && (
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{sublabel}</p>
      )}
    </div>
  )
}

interface DetailRowProps {
  label: string
  amount: number
  ratio: number
  unit: string
  bold?: boolean
  color?: string
}

function DetailRow({ label, amount, ratio, unit, bold, color }: DetailRowProps) {
  return (
    <tr className="border-b border-gray-100 dark:border-gray-700">
      <td className={`py-2 ${bold ? 'font-bold text-gray-900 dark:text-white' : color || 'text-gray-700 dark:text-gray-300'}`}>
        {label}
      </td>
      <td className={`py-2 text-right ${bold ? 'font-bold text-gray-900 dark:text-white' : 'text-gray-900 dark:text-white'}`}>
        {formatNumber(amount)}{unit}
      </td>
      <td className={`py-2 text-right ${bold ? 'font-bold' : ''} text-gray-500 dark:text-gray-400`}>
        {ratio.toFixed(1)}%
      </td>
    </tr>
  )
}

interface GuideSectionProps {
  title: string
  items: string[]
}

function GuideSection({ title, items }: GuideSectionProps) {
  return (
    <div>
      <h3 className="font-medium text-gray-900 dark:text-white mb-2">{title}</h3>
      <ul className="space-y-1.5">
        {items.map((item, i) => (
          <li key={i} className="text-sm text-gray-600 dark:text-gray-400 flex items-start gap-2">
            <span className="text-blue-500 mt-0.5">&#8226;</span>
            {item}
          </li>
        ))}
      </ul>
    </div>
  )
}
