'use client'

import { useState, useMemo, useCallback, useEffect } from 'react'
import { useTranslations } from '@/lib/i18n'
import '@/lib/i18n/ns/shippingCalc'
import { Package, Truck, Calculator, Copy, Check, RotateCcw, BookOpen, Save, Store } from 'lucide-react'
import { glassCard, glassInset, glassInput } from '@/lib/glass'
import { useCalculationHistory } from '@/hooks/useCalculationHistory'
import CalculationHistory from './CalculationHistory'
import GuideSection from '@/components/GuideSection'
import { CARRIER_DATA, RATE_BASIS, RATE_SOURCES, getCarrierPrice, getUnavailableReason, type DestinationType, type CarrierCategoryType } from '@/utils/shippingRates'

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

  // 요금은 실제 무게 단계와 크기(세 변 합) 단계 중 높은 단계로 정해진다 (findTier)
  const actualWeight = parseFloat(weight) || 0

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
        const price = getCarrierPrice(carrier, actualWeight, girth, destination)
        const unavailableReason = price === null
          ? getUnavailableReason(carrier, actualWeight, girth, destination)
          : null
        return { carrier, price, unavailableReason }
      })
      .sort((a, b) => {
        if (a.price === null && b.price === null) return 0
        if (a.price === null) return 1
        if (b.price === null) return -1
        return a.price - b.price
      })
  }, [actualWeight, girth, destination])

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
                <div className="text-xs text-sub">{t('girth')}</div>
                <div className="text-lg font-semibold text-fg tabular-nums mt-0.5">{girth.toFixed(0)} cm</div>
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
                <div className="text-3xl font-bold text-fg tabular-nums" aria-live="polite" aria-atomic="true">
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
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-subtle rounded-lg text-center">
                <div className="text-xs text-muted">{t('result.actualWeight')}</div>
                <div className="text-xl font-bold text-fg mt-1">
                  {parseFloat(weight) || 0}<span className="text-sm font-normal ml-1">kg</span>
                </div>
              </div>
              <div className="p-3 bg-subtle rounded-lg text-center">
                <div className="text-xs text-muted">{t('girth')}</div>
                <div className="text-xl font-bold text-fg tabular-nums mt-1">
                  {girth.toFixed(0)}<span className="text-sm font-normal ml-1">cm</span>
                </div>
              </div>
            </div>
            <p className="mt-3 text-xs text-muted">{t('sizeRule')}</p>
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
