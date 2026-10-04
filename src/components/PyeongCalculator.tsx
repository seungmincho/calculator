'use client'

import { useState, useCallback, useMemo, useEffect } from 'react'
import Link from 'next/link'
import { useTranslations } from '@/lib/i18n'
import '@/lib/i18n/ns/pyeongCalculator'
import { useSearchParams } from '@/hooks/useSearchParams'
import { Copy, Check, RotateCcw, ArrowRight } from 'lucide-react'
import ShareResult from '@/components/ShareResult'
import {
  M2_PER_PYEONG, FT2_PER_M2, toPyeong, toM2, parseNum, splitArea, popularSizes, perPyeong,
  perM2FromPerPyeong, perPyeongFromPerM2, roomSides, areaBreakdown,
  TYPICAL_RATIO_MIN, TYPICAL_RATIO_MAX, POPULAR_EXCLUSIVE_M2, type AreaType,
} from '@/utils/pyeong'

type Unit = 'pyeong' | 'sqm'
type Method = 'area' | 'dim'

const QUICK_EXCLUSIVE = [59, 74, 84, 101, 114]
const QUICK_PYEONG = [5, 10, 15, 20, 25, 30, 34, 40, 50, 60]
const POPULAR = popularSizes(POPULAR_EXCLUSIVE_M2)
// menuConfig에 실제 있는 경로만
const RELATED = [
  { k: 'realEstate', href: '/real-estate-calculator/' },
  { k: 'acquisitionTax', href: '/acquisition-tax/' },
  { k: 'brokerageFee', href: '/brokerage-fee/' },
] as const
const DEFAULT_RATIO = 75
const RATIO_MIN = 40
const RATIO_MAX = 90
const DEFAULT_PRICE = 100000 // 만원 (10억)
const REF_PYEONG = 33 // 시각화 기준: 33평 아파트
const MAX_BOX_PX = 160

const fmt = (n: number) => (n > 0 ? String(Math.round(n * 100) / 100) : '')
const num = (n: number, d = 2) => n.toLocaleString('ko-KR', { minimumFractionDigits: d, maximumFractionDigits: d })
const won = (n: number) => Math.round(n).toLocaleString('ko-KR')
const commas = (s: string) => {
  const raw = s.replace(/[^0-9]/g, '')
  return raw ? Number(raw).toLocaleString('ko-KR') : ''
}

const ROOM_SIZES = [
  { key: 'studio', min: 5, max: 8 },
  { key: 'small', min: 15, max: 20 },
  { key: 'medium', min: 25, max: 34 },
  { key: 'large', min: 40, max: 60 },
] as const

const seg = (on: boolean) =>
  `flex-1 min-h-11 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${on ? 'bg-primary text-white' : 'bg-soft text-body hover:bg-subtle'}`
const chip = (on: boolean) =>
  `min-h-10 px-2 py-2 rounded-lg text-sm font-medium transition-colors tabular-nums ${on ? 'bg-primary text-white' : 'bg-soft text-body hover:bg-subtle'}`

export default function PyeongCalculator() {
  const t = useTranslations('pyeongCalculator')
  const sp = useSearchParams()

  // 공유 링크 복원 (구버전 ?value=&from=sqm 호환)
  const [area, setArea] = useState<{ unit: Unit; text: string }>(() => ({
    unit: sp.get('from') === 'pyeong' ? 'pyeong' : 'sqm',
    text: sp.get('value') ?? '84',
  }))
  const [method, setMethod] = useState<Method>(() => (sp.get('method') === 'dim' ? 'dim' : 'area'))
  const [width, setWidth] = useState(() => sp.get('w') ?? '10')
  const [depth, setDepth] = useState(() => sp.get('d') ?? '8')
  const [areaType, setAreaType] = useState<AreaType>(() => (sp.get('type') === 'supply' ? 'supply' : 'exclusive'))
  const [ratio, setRatio] = useState<number>(() => {
    const r = parseInt(sp.get('r') || '', 10)
    return r >= RATIO_MIN && r <= RATIO_MAX ? r : DEFAULT_RATIO
  })
  const [price, setPrice] = useState(() => {
    const p = sp.get('price')
    if (p === null) return won(DEFAULT_PRICE)
    const n = parseNum(p)
    return n > 0 ? won(n) : ''
  })
  const [otherCommon, setOtherCommon] = useState(() => sp.get('etc') ?? '')
  const [service, setService] = useState(() => sp.get('svc') ?? '')
  const [unitPrice, setUnitPrice] = useState<{ unit: Unit; text: string }>({ unit: 'pyeong', text: '4,000' })
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const m2 = useMemo(() => {
    if (method === 'dim') return parseNum(width) * parseNum(depth)
    const n = parseNum(area.text)
    return area.unit === 'pyeong' ? toM2(n) : n
  }, [method, width, depth, area])
  const pyeong = toPyeong(m2)
  const split = splitArea(m2, areaType, ratio / 100)
  const priceNum = parseNum(price)
  const etcNum = parseNum(otherCommon)
  const svcNum = parseNum(service)
  const parts = areaBreakdown(split.exclusive, split.supply, etcNum, svcNum)
  const sides = roomSides(m2)

  const shareUrl = useCallback(() => {
    const p = new URLSearchParams()
    if (method === 'dim') {
      p.set('method', 'dim')
      p.set('w', width)
      p.set('d', depth)
    } else {
      p.set('value', area.text)
      p.set('from', area.unit === 'pyeong' ? 'pyeong' : 'sqm')
    }
    if (areaType === 'supply') p.set('type', 'supply')
    if (ratio !== DEFAULT_RATIO) p.set('r', String(ratio))
    if (priceNum !== DEFAULT_PRICE) p.set('price', String(priceNum))
    if (etcNum > 0) p.set('etc', String(etcNum))
    if (svcNum > 0) p.set('svc', String(svcNum))
    return `${window.location.pathname}?${p.toString()}`
  }, [method, width, depth, area, areaType, ratio, priceNum, etcNum, svcNum])

  useEffect(() => {
    const id = setTimeout(() => window.history.replaceState(null, '', shareUrl()), 300)
    return () => clearTimeout(id)
  }, [shareUrl])

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
    } catch {
      // silent
    }
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }, [])

  const switchMethod = (m: Method) => {
    if (m === 'area' && method === 'dim' && m2 > 0) setArea({ unit: 'sqm', text: fmt(m2) })
    setMethod(m)
  }
  const setAreaValue = (unit: Unit, text: string) => {
    setMethod('area')
    setArea({ unit, text })
  }
  const pickExclusive = (v: number) => {
    setAreaValue('sqm', String(v))
    setAreaType('exclusive')
  }
  const handleReset = () => {
    setMethod('area')
    setArea({ unit: 'sqm', text: '84' })
    setAreaType('exclusive')
    setRatio(DEFAULT_RATIO)
    setPrice(won(DEFAULT_PRICE))
    setOtherCommon('')
    setService('')
  }

  const copyBtn = (text: string, id: string, label: string) => (
    <button
      type="button"
      onClick={() => copyToClipboard(text, id)}
      className="inline-flex items-center justify-center w-10 h-10 rounded-lg text-white/70 hover:text-white hover:bg-white/15 transition-colors"
      aria-label={t('copyItem', { label })}
    >
      {copiedId === id ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
    </button>
  )

  const other = areaType === 'exclusive' ? split.supply : split.exclusive
  const heroSub = t(areaType === 'exclusive' ? 'heroSupply' : 'heroExclusive', {
    m2: num(other, 1),
    pyeong: num(toPyeong(other), 1),
    ratio,
  })
  const currentSidePx = Math.min(Math.sqrt(pyeong / REF_PYEONG) * MAX_BOX_PX, MAX_BOX_PX * 2)

  const unitPriceNum = parseNum(unitPrice.text)
  const perPyeongPrice = unitPrice.unit === 'pyeong' ? unitPriceNum : perPyeongFromPerM2(unitPriceNum)
  const perM2Price = unitPrice.unit === 'sqm' ? unitPriceNum : perM2FromPerPyeong(unitPriceNum)

  const priceRows = [
    { k: 'perSupplyPyeong', v: perPyeong(priceNum, split.supply) },
    { k: 'perExclusivePyeong', v: perPyeong(priceNum, split.exclusive) },
    { k: 'perM2', v: split.exclusive > 0 ? priceNum / split.exclusive : 0 },
  ]

  const breakdownRows: { k: string; v: number | null; est: boolean; strong?: boolean }[] = [
    { k: 'exclusive', v: parts.exclusive, est: areaType !== 'exclusive', strong: true },
    { k: 'residentialCommon', v: parts.residentialCommon, est: true },
    { k: 'supply', v: parts.supply, est: areaType !== 'supply', strong: true },
    { k: 'otherCommon', v: etcNum > 0 ? etcNum : null, est: false },
    { k: 'contract', v: etcNum > 0 ? parts.contract : null, est: true },
    { k: 'service', v: svcNum > 0 ? svcNum : null, est: false },
    { k: 'usable', v: svcNum > 0 ? parts.usable : null, est: true },
  ]

  const shareRows = [
    { label: t('sqm'), value: `${num(m2)} ${t('sqm')}` },
    { label: t('sqft'), value: `${num(m2 * FT2_PER_M2)} ${t('sqft')}` },
    { label: t(areaType === 'exclusive' ? 'supply' : 'exclusive'), value: `${num(other, 1)} ${t('sqm')} · ${num(toPyeong(other), 1)}${t(areaType === 'exclusive' ? 'pyeongType' : 'pyeong')}` },
    ...(priceNum > 0 && m2 > 0 ? [{ label: t('price.perSupplyPyeong'), value: `${won(priceRows[0].v)} ${t('price.manwon')}` }] : []),
  ]

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-fg">{t('title')}</h1>
        <p className="text-sm text-muted mt-1">{t('description')}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* 입력 */}
        <div className="lg:col-span-1">
          <div className="ui-card p-6 space-y-6">
            <div>
              <span id="pc-method-label" className="block text-sm font-medium text-body mb-2">{t('inputMethod')}</span>
              <div className="flex gap-2" role="group" aria-labelledby="pc-method-label">
                <button type="button" aria-pressed={method === 'area'} onClick={() => switchMethod('area')} className={seg(method === 'area')}>{t('methodArea')}</button>
                <button type="button" aria-pressed={method === 'dim'} onClick={() => switchMethod('dim')} className={seg(method === 'dim')}>{t('methodDim')}</button>
              </div>
            </div>

            {method === 'area' ? (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="pc-sqm" className="block text-sm font-medium text-body mb-2">{t('sqm')}</label>
                  <input
                    id="pc-sqm"
                    type="number"
                    inputMode="decimal"
                    min="0"
                    step="0.01"
                    value={area.unit === 'sqm' ? area.text : fmt(m2)}
                    onChange={(e) => setAreaValue('sqm', e.target.value)}
                    className="ui-field w-full px-4 py-3 text-lg tabular-nums"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label htmlFor="pc-pyeong" className="block text-sm font-medium text-body mb-2">{t('pyeong')}</label>
                  <input
                    id="pc-pyeong"
                    type="number"
                    inputMode="decimal"
                    min="0"
                    step="0.01"
                    value={area.unit === 'pyeong' ? area.text : fmt(pyeong)}
                    onChange={(e) => setAreaValue('pyeong', e.target.value)}
                    className="ui-field w-full px-4 py-3 text-lg tabular-nums"
                    placeholder="0"
                  />
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="pc-w" className="block text-sm font-medium text-body mb-2">{t('width')}</label>
                  <input id="pc-w" type="number" inputMode="decimal" min="0" step="0.01" value={width}
                    onChange={(e) => setWidth(e.target.value)} className="ui-field w-full px-4 py-3 text-lg tabular-nums" placeholder="0" />
                </div>
                <div>
                  <label htmlFor="pc-d" className="block text-sm font-medium text-body mb-2">{t('depth')}</label>
                  <input id="pc-d" type="number" inputMode="decimal" min="0" step="0.01" value={depth}
                    onChange={(e) => setDepth(e.target.value)} className="ui-field w-full px-4 py-3 text-lg tabular-nums" placeholder="0" />
                </div>
                <p className="col-span-2 text-sm text-muted tabular-nums">
                  {fmt(parseNum(width)) || 0} × {fmt(parseNum(depth)) || 0} = {num(m2)} {t('sqm')}
                </p>
              </div>
            )}

            <div>
              <span id="pc-type-label" className="block text-sm font-medium text-body mb-2">{t('areaType')}</span>
              <div className="flex gap-2" role="group" aria-labelledby="pc-type-label">
                {(['exclusive', 'supply'] as const).map((k) => (
                  <button key={k} type="button" aria-pressed={areaType === k} onClick={() => setAreaType(k)} className={seg(areaType === k)}>{t(k)}</button>
                ))}
              </div>
            </div>

            <div>
              <span id="pc-quick-ex-label" className="block text-sm font-medium text-body mb-2">{t('quickExclusive')}</span>
              <div className="grid grid-cols-5 gap-2" role="group" aria-labelledby="pc-quick-ex-label">
                {QUICK_EXCLUSIVE.map((v) => {
                  const on = method === 'area' && areaType === 'exclusive' && Math.abs(m2 - v) < 0.01
                  return (
                    <button key={v} type="button" aria-pressed={on} onClick={() => pickExclusive(v)} className={chip(on)}>
                      {v}
                    </button>
                  )
                })}
              </div>
            </div>

            <div>
              <span id="pc-quick-py-label" className="block text-sm font-medium text-body mb-2">{t('quickValues')}</span>
              <div className="grid grid-cols-5 gap-2" role="group" aria-labelledby="pc-quick-py-label">
                {QUICK_PYEONG.map((v) => {
                  const on = method === 'area' && area.unit === 'pyeong' && parseNum(area.text) === v
                  return (
                    <button key={v} type="button" aria-pressed={on} onClick={() => setAreaValue('pyeong', String(v))} className={chip(on)}>
                      {v}
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="bg-subtle rounded-xl p-4">
              <h3 className="text-sm font-semibold text-fg mb-1">{t('formulaTitle')}</h3>
              <p className="text-xs text-sub">{t('formula')}</p>
            </div>

            <button type="button" onClick={handleReset} className="ui-btn-soft w-full min-h-11 px-4 py-2.5 inline-flex items-center justify-center gap-2">
              <RotateCcw className="w-4 h-4" aria-hidden="true" />
              {t('reset')}
            </button>
          </div>
        </div>

        {/* 결과 */}
        <div className="lg:col-span-2 space-y-6">
          <div>
            <div className="ui-hero p-6" aria-live="polite" aria-atomic="true">
              <div className="text-sm text-white/70">{t('heroLabel', { type: t(areaType), m2: fmt(m2) || '0' })}</div>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-4xl font-bold tabular-nums">{num(pyeong)}</span>
                <span className="text-xl font-semibold">{t('pyeong')}</span>
                {copyBtn(pyeong.toFixed(2), 'pyeong', t('pyeong'))}
              </div>
              <div className="grid grid-cols-2 gap-4 mt-4">
                <div>
                  <div className="text-xs text-white/70">{t('sqm')}</div>
                  <div className="flex items-center gap-1">
                    <span className="text-xl font-semibold tabular-nums">{num(m2)}</span>
                    {copyBtn(m2.toFixed(2), 'm2', t('sqm'))}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-white/70">{t('sqft')}</div>
                  <div className="flex items-center gap-1">
                    <span className="text-xl font-semibold tabular-nums">{num(m2 * FT2_PER_M2)}</span>
                    {copyBtn((m2 * FT2_PER_M2).toFixed(2), 'ft2', t('sqft'))}
                  </div>
                </div>
              </div>
              <p className="text-sm text-white/80 mt-4 pt-4 border-t border-white/20 tabular-nums">{heroSub}</p>
            </div>
            <ShareResult
              className="mt-3"
              fileName="pyeong-calculator"
              card={{
                tool: t('title'),
                label: t('heroLabel', { type: t(areaType), m2: fmt(m2) || '0' }),
                headline: `${num(pyeong)}${t('pyeong')}`,
                sub: heroSub,
                rows: shareRows,
              }}
            />
          </div>

          {/* 면적 구분: 전용 / 공급 / 계약 / 서비스 */}
          <div className="ui-card p-6">
            <h2 className="text-lg font-semibold text-fg">{t('ratio.title')}</h2>
            <div className="mt-4">
              <div className="flex items-center justify-between mb-2">
                <label htmlFor="pc-ratio" className="text-sm font-medium text-body">{t('ratio.label')}</label>
                <span className="text-sm font-semibold text-primary tabular-nums">{ratio}%</span>
              </div>
              <input
                id="pc-ratio"
                type="range"
                min={RATIO_MIN}
                max={RATIO_MAX}
                step={1}
                value={ratio}
                aria-valuetext={`${ratio}%`}
                onChange={(e) => setRatio(Number(e.target.value))}
                className="w-full accent-primary"
              />
              <div className="flex justify-between text-xs text-faint mt-1">
                <span>{RATIO_MIN}%</span>
                <span>{RATIO_MAX}%</span>
              </div>
              <p className="text-xs text-muted mt-2">{t('ratio.note')}</p>
            </div>

            <div className="grid sm:grid-cols-2 gap-3 mt-4">
              {(['exclusive', 'supply'] as const).map((k) => {
                const v = split[k]
                const est = k !== areaType
                return (
                  <div key={k} className={`rounded-xl p-4 border ${est ? 'bg-subtle border-transparent' : 'bg-primary-soft border-primary'}`}>
                    <div className={`text-sm ${est ? 'text-muted' : 'text-primary'}`}>
                      {t(k)} ({t(est ? 'ratio.estimated' : 'ratio.entered')})
                    </div>
                    <div className="text-2xl font-bold text-fg tabular-nums mt-1">
                      {num(toPyeong(v), 1)} {t(k === 'supply' ? 'pyeongType' : 'pyeong')}
                    </div>
                    <div className="text-sm text-sub tabular-nums">{num(v, 1)} {t('sqm')}</div>
                  </div>
                )
              })}
            </div>

            <div className="grid sm:grid-cols-2 gap-3 mt-5">
              <div>
                <label htmlFor="pc-etc" className="block text-sm font-medium text-body mb-2">{t('breakdown.otherCommonInput')}</label>
                <input id="pc-etc" type="number" inputMode="decimal" min="0" step="0.01" value={otherCommon}
                  onChange={(e) => setOtherCommon(e.target.value)} className="ui-field w-full px-4 py-3 tabular-nums" placeholder={t('breakdown.optional')} />
              </div>
              <div>
                <label htmlFor="pc-svc" className="block text-sm font-medium text-body mb-2">{t('breakdown.serviceInput')}</label>
                <input id="pc-svc" type="number" inputMode="decimal" min="0" step="0.01" value={service}
                  onChange={(e) => setService(e.target.value)} className="ui-field w-full px-4 py-3 tabular-nums" placeholder={t('breakdown.optional')} />
              </div>
            </div>
            <p className="text-xs text-muted mt-2">{t('breakdown.inputHint')}</p>

            <div className="overflow-x-auto mt-4">
              <table className="w-full text-sm">
                <caption className="sr-only">{t('breakdown.caption')}</caption>
                <thead>
                  <tr className="border-b border-line text-sub">
                    <th scope="col" className="text-left py-2 pr-3 font-semibold">{t('breakdown.colType')}</th>
                    <th scope="col" className="text-right py-2 px-3 font-semibold whitespace-nowrap">{t('sqm')}</th>
                    <th scope="col" className="text-right py-2 pl-3 font-semibold whitespace-nowrap">{t('pyeong')}</th>
                  </tr>
                </thead>
                <tbody>
                  {breakdownRows.map(({ k, v, est, strong }) => (
                    <tr key={k} className="border-b border-line align-top">
                      <th scope="row" className="text-left py-2.5 pr-3 font-normal">
                        <span className={`block ${strong ? 'font-semibold text-fg' : 'text-body'}`}>
                          {t(`breakdown.rows.${k}.name`)}
                          {v !== null && est ? <span className="text-xs text-muted font-normal"> ({t('ratio.estimated')})</span> : null}
                        </span>
                        <span className="block text-xs text-muted mt-0.5">{t(`breakdown.rows.${k}.desc`)}</span>
                      </th>
                      {v === null ? (
                        <td colSpan={2} className="py-2.5 pl-3 text-right text-xs text-faint">{t('breakdown.needInput')}</td>
                      ) : (
                        <>
                          <td className="py-2.5 px-3 text-right tabular-nums whitespace-nowrap text-body">{num(v, 1)}</td>
                          <td className={`py-2.5 pl-3 text-right tabular-nums whitespace-nowrap ${strong ? 'font-semibold text-fg' : 'text-body'}`}>{num(toPyeong(v), 1)}</td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* 평당가 */}
          <div className="ui-card p-6">
            <h2 className="text-lg font-semibold text-fg">{t('price.title')}</h2>
            <label htmlFor="pc-price" className="block text-sm font-medium text-body mt-4 mb-2">{t('price.label')}</label>
            <input
              id="pc-price"
              type="text"
              inputMode="numeric"
              value={price}
              onChange={(e) => setPrice(commas(e.target.value))}
              className="ui-field w-full px-4 py-3 text-lg tabular-nums"
              placeholder={t('price.placeholder')}
            />
            {priceNum > 0 && m2 > 0 ? (
              <div className="grid sm:grid-cols-3 gap-3 mt-4">
                {priceRows.map(({ k, v }) => (
                  <div key={k} className="bg-subtle rounded-xl p-4">
                    <div className="text-sm text-muted">{t(`price.${k}`)}</div>
                    <div className="text-xl font-bold text-fg tabular-nums mt-1">
                      {won(v)} <span className="text-sm font-medium text-sub">{t('price.manwon')}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted mt-3">{t('price.empty')}</p>
            )}
            <p className="text-xs text-muted mt-3">{t('price.note')}</p>

            <h3 className="text-base font-semibold text-fg mt-6">{t('price.convTitle')}</h3>
            <div className="grid grid-cols-2 gap-3 mt-3">
              <div>
                <label htmlFor="pc-ppy" className="block text-sm font-medium text-body mb-2">{t('price.convPerPyeong')}</label>
                <input
                  id="pc-ppy"
                  type="text"
                  inputMode="numeric"
                  value={unitPrice.unit === 'pyeong' ? unitPrice.text : (perPyeongPrice > 0 ? won(perPyeongPrice) : '')}
                  onChange={(e) => setUnitPrice({ unit: 'pyeong', text: commas(e.target.value) })}
                  className="ui-field w-full px-4 py-3 tabular-nums"
                  placeholder="0"
                />
              </div>
              <div>
                <label htmlFor="pc-pm2" className="block text-sm font-medium text-body mb-2">{t('price.convPerM2')}</label>
                <input
                  id="pc-pm2"
                  type="text"
                  inputMode="numeric"
                  value={unitPrice.unit === 'sqm' ? unitPrice.text : (perM2Price > 0 ? won(perM2Price) : '')}
                  onChange={(e) => setUnitPrice({ unit: 'sqm', text: commas(e.target.value) })}
                  className="ui-field w-full px-4 py-3 tabular-nums"
                  placeholder="0"
                />
              </div>
            </div>
            <p className="text-xs text-muted mt-2">{t('price.convNote')}</p>

            <div className="flex flex-wrap gap-x-5 gap-y-2 mt-4">
              {RELATED.map(({ k, href }) => (
                <Link key={k} href={href} className="inline-flex items-center gap-1 min-h-10 text-sm font-medium text-primary hover:underline">
                  {t(`links.${k}`)}
                  <ArrowRight className="w-4 h-4" aria-hidden="true" />
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 인기 아파트 면적표 */}
      <div className="ui-card p-6">
        <h2 className="text-lg font-semibold text-fg">{t('popular.title')}</h2>
        <p className="text-xs text-muted mt-1 mb-4">
          {t('popular.desc', { min: Math.round(TYPICAL_RATIO_MIN * 100), max: Math.round(TYPICAL_RATIO_MAX * 100) })}
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-sub">
                <th scope="col" className="text-left py-2 pr-3 font-semibold">{t('popular.colExclusive')}</th>
                <th scope="col" className="text-right py-2 px-3 font-semibold">{t('popular.colExclusivePyeong')}</th>
                <th scope="col" className="text-right py-2 px-3 font-semibold">{t('popular.colSupply')}</th>
                <th scope="col" className="text-right py-2 pl-3 font-semibold">{t('popular.colType')}</th>
              </tr>
            </thead>
            <tbody>
              {POPULAR.map((r) => {
                const on = method === 'area' && areaType === 'exclusive' && Math.abs(m2 - r.exclusive) < 0.01
                return (
                  <tr key={r.exclusive} className={`border-b border-line tabular-nums ${on ? 'bg-primary-soft text-primary' : 'text-body'}`}>
                    <td className="py-1 pr-3">
                      <button
                        type="button"
                        aria-pressed={on}
                        aria-label={t('popular.select', { m2: r.exclusive })}
                        onClick={() => pickExclusive(r.exclusive)}
                        className="inline-flex items-center gap-1.5 min-h-10 px-2 -mx-2 rounded-lg font-medium hover:bg-subtle"
                      >
                        {on ? <Check className="w-4 h-4" aria-hidden="true" /> : <span className="w-4" aria-hidden="true" />}
                        {r.exclusive} {t('sqm')}
                      </button>
                    </td>
                    <td className="py-1 px-3 text-right whitespace-nowrap">{num(r.exclusivePyeong)} {t('pyeong')}</td>
                    <td className="py-1 px-3 text-right whitespace-nowrap">{Math.round(r.supplyMin)}~{Math.round(r.supplyMax)} {t('sqm')}</td>
                    <td className="py-1 pl-3 text-right whitespace-nowrap font-semibold">{r.typeMin}~{r.typeMax}{t('pyeongType')}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* 면적 시각화 + 방 크기 감 */}
        <div className="ui-card p-6">
          <h2 className="text-lg font-semibold text-fg">{t('visual.title')}</h2>
          <p className="text-xs text-muted mt-1 mb-5">{t('visual.desc')}</p>
          <div className="flex items-end gap-6 flex-wrap" aria-hidden="true">
            <div className="flex flex-col items-center gap-2">
              <div
                className="bg-primary-soft border-2 border-primary rounded-md transition-all duration-300 flex items-center justify-center"
                style={{ width: `${currentSidePx}px`, height: `${currentSidePx}px`, minWidth: '20px', minHeight: '20px' }}
              >
                <span className="text-xs font-semibold text-primary text-center px-1 tabular-nums">{num(pyeong, 1)}</span>
              </div>
              <span className="text-xs text-muted">{t('visual.current')}</span>
            </div>
            <div className="flex flex-col items-center gap-2">
              <div
                className="bg-soft border-2 border-line-strong rounded-md flex items-center justify-center"
                style={{ width: `${MAX_BOX_PX}px`, height: `${MAX_BOX_PX}px` }}
              >
                <span className="text-xs font-semibold text-sub">{REF_PYEONG} {t('pyeong')}</span>
              </div>
              <span className="text-xs text-muted">{t('visual.ref')}</span>
            </div>
          </div>
          <p className="text-sm text-body mt-5 tabular-nums">
            {t('visual.ratioText', { pct: ((pyeong / REF_PYEONG) * 100).toFixed(0), ref: REF_PYEONG })}
          </p>
          <p className="text-sm text-body mt-2 tabular-nums">
            {t('visual.sides', { s: num(sides.square, 1), l: num(sides.long, 1), w: num(sides.short, 1) })}
          </p>
        </div>

        {/* 방 크기 참고 */}
        <div className="ui-card p-6">
          <h2 className="text-lg font-semibold text-fg mb-4">{t('roomSize')}</h2>
          <ul className="grid grid-cols-2 gap-3">
            {ROOM_SIZES.map((room) => {
              const on = pyeong >= room.min && pyeong <= room.max
              return (
                <li key={room.key} className={`rounded-xl p-4 border ${on ? 'bg-primary-soft border-primary' : 'bg-subtle border-transparent'}`}>
                  <div className={`font-semibold text-sm mb-1 ${on ? 'text-primary' : 'text-fg'}`}>
                    {t(`sizes.${room.key}`)}
                    {on ? <span className="ml-1 text-xs font-medium">· {t('visual.current')}</span> : null}
                  </div>
                  <div className="text-xs text-muted tabular-nums">
                    {num(room.min * M2_PER_PYEONG, 1)}~{num(room.max * M2_PER_PYEONG, 1)} {t('sqm')}
                  </div>
                </li>
              )
            })}
          </ul>
          <p className="text-xs text-muted mt-4">{t('roomNote')}</p>
        </div>
      </div>

      {/* 가이드 */}
      <div className="ui-card p-6">
        <h2 className="text-xl font-semibold text-fg mb-6">{t('guide.title')}</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {(['what', 'reference', 'law'] as const).map((sec) => (
            <div key={sec}>
              <h3 className="text-base font-semibold text-fg mb-3">{t(`guide.${sec}.title`)}</h3>
              <ul className="space-y-2 text-sm text-sub list-disc pl-5">
                {(t.raw(`guide.${sec}.items`) as string[]).map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <h3 className="text-base font-semibold text-fg mt-8 mb-3">{t('guide.faq.title')}</h3>
        <div className="divide-y divide-line border-y border-line">
          {(t.raw('guide.faq.items') as { q: string; a: string }[]).map((f, i) => (
            <details key={i} className="group">
              <summary className="flex items-center justify-between gap-3 min-h-11 py-3 cursor-pointer text-sm font-medium text-fg list-none">
                {f.q}
                <span className="text-faint group-open:rotate-45 transition-transform" aria-hidden="true">+</span>
              </summary>
              <p className="pb-4 text-sm text-sub leading-relaxed">{f.a}</p>
            </details>
          ))}
        </div>
      </div>
    </div>
  )
}
