'use client'

import { useState, useCallback, useMemo, useEffect } from 'react'
import Link from 'next/link'
import { useTranslations } from '@/lib/i18n'
import { useSearchParams } from '@/hooks/useSearchParams'
import { Copy, Check, RotateCcw, ArrowRight } from 'lucide-react'
import {
  M2_PER_PYEONG, FT2_PER_M2, toPyeong, toM2, parseNum, splitArea, popularSizes,
  perPyeong, TYPICAL_RATIO_MIN, TYPICAL_RATIO_MAX, type AreaType,
} from '@/utils/pyeong'

type Unit = 'pyeong' | 'sqm'
type Method = 'area' | 'dim'

const QUICK_VALUES = [5, 8, 10, 15, 18, 20, 24, 25, 30, 32, 34, 40, 50, 60]
const POPULAR = popularSizes()
const DEFAULT_RATIO = 75
const REF_PYEONG = 33 // 시각화 기준: 33평 아파트
const MAX_BOX_PX = 160

const fmt = (n: number) => (n > 0 ? String(Math.round(n * 100) / 100) : '')
const num = (n: number, d = 2) => n.toLocaleString(undefined, { minimumFractionDigits: d, maximumFractionDigits: d })

const ROOM_SIZES = [
  { key: 'studio', min: 5, max: 8 },
  { key: 'small', min: 15, max: 20 },
  { key: 'medium', min: 25, max: 34 },
  { key: 'large', min: 40, max: 60 },
] as const

const seg = (on: boolean) =>
  `flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${on ? 'bg-primary text-white' : 'bg-soft text-body hover:bg-subtle'}`

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
    return r >= 40 && r <= 95 ? r : DEFAULT_RATIO
  })
  const [price, setPrice] = useState(() => {
    const n = parseNum(sp.get('price') ?? '')
    return n > 0 ? Math.round(n).toLocaleString('ko-KR') : ''
  })
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const m2 = useMemo(() => {
    if (method === 'dim') return parseNum(width) * parseNum(depth)
    const n = parseNum(area.text)
    return area.unit === 'pyeong' ? toM2(n) : n
  }, [method, width, depth, area])
  const pyeong = toPyeong(m2)
  const split = splitArea(m2, areaType, ratio / 100)
  const priceNum = parseNum(price)

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
    if (priceNum > 0) p.set('price', String(priceNum))
    return `${window.location.pathname}?${p.toString()}`
  }, [method, width, depth, area, areaType, ratio, priceNum])

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
  const handleReset = () => {
    setMethod('area')
    setArea({ unit: 'sqm', text: '84' })
    setAreaType('exclusive')
    setRatio(DEFAULT_RATIO)
    setPrice('')
  }

  const copyBtn = (text: string, id: string) => (
    <button
      onClick={() => copyToClipboard(text, id)}
      className="p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/15 transition-colors"
      title={t('copy')}
      aria-label={t('copy')}
    >
      {copiedId === id ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
    </button>
  )

  const other = areaType === 'exclusive' ? split.supply : split.exclusive
  const currentSidePx = Math.min(Math.sqrt(pyeong / REF_PYEONG) * MAX_BOX_PX, MAX_BOX_PX * 2)

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-fg">{t('title')}</h1>
        <p className="text-sm text-muted mt-1">{t('description')}</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* 입력 */}
        <div className="lg:col-span-1">
          <div className="ui-card p-6 space-y-6">
            <div>
              <label className="block text-sm font-medium text-body mb-2">{t('inputMethod')}</label>
              <div className="flex gap-2">
                <button onClick={() => switchMethod('area')} className={seg(method === 'area')}>{t('methodArea')}</button>
                <button onClick={() => switchMethod('dim')} className={seg(method === 'dim')}>{t('methodDim')}</button>
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
              <label className="block text-sm font-medium text-body mb-2">{t('areaType')}</label>
              <div className="flex gap-2">
                <button onClick={() => setAreaType('exclusive')} className={seg(areaType === 'exclusive')}>{t('exclusive')}</button>
                <button onClick={() => setAreaType('supply')} className={seg(areaType === 'supply')}>{t('supply')}</button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-body mb-2">{t('quickValues')}</label>
              <div className="grid grid-cols-5 gap-2">
                {QUICK_VALUES.map((v) => {
                  const on = method === 'area' && area.unit === 'pyeong' && parseNum(area.text) === v
                  return (
                    <button
                      key={v}
                      onClick={() => setAreaValue('pyeong', String(v))}
                      className={`px-2 py-2 rounded-lg text-sm font-medium transition-colors tabular-nums ${on ? 'bg-primary text-white' : 'bg-soft text-body hover:bg-subtle'}`}
                    >
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

            <div className="flex gap-2">
              <button
                onClick={() => copyToClipboard(window.location.origin + shareUrl(), 'link')}
                className="ui-btn-soft flex-1 px-4 py-2.5"
              >
                {copiedId === 'link' ? t('linkCopied') : t('copyLink')}
              </button>
              <button onClick={handleReset} className="bg-soft hover:bg-subtle text-body rounded-xl px-3" title={t('reset')} aria-label={t('reset')}>
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* 결과 */}
        <div className="lg:col-span-2 space-y-6">
          <div className="ui-hero p-6">
            <div className="text-sm text-white/70">{t(areaType)}</div>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-4xl font-bold tabular-nums">{num(pyeong)}</span>
              <span className="text-xl font-semibold">{t('pyeong')}</span>
              {copyBtn(pyeong.toFixed(2), 'pyeong')}
            </div>
            <div className="grid grid-cols-2 gap-4 mt-4">
              <div>
                <div className="text-xs text-white/70">{t('sqm')}</div>
                <div className="flex items-center gap-1">
                  <span className="text-xl font-semibold tabular-nums">{num(m2)}</span>
                  {copyBtn(m2.toFixed(2), 'm2')}
                </div>
              </div>
              <div>
                <div className="text-xs text-white/70">{t('sqft')}</div>
                <div className="flex items-center gap-1">
                  <span className="text-xl font-semibold tabular-nums">{num(m2 * FT2_PER_M2)}</span>
                  {copyBtn((m2 * FT2_PER_M2).toFixed(2), 'ft2')}
                </div>
              </div>
            </div>
            <p className="text-sm text-white/70 mt-4 pt-4 border-t border-white/20 tabular-nums">
              {t(areaType === 'exclusive' ? 'heroSupply' : 'heroExclusive', {
                m2: num(other, 1),
                pyeong: num(toPyeong(other), 1),
                ratio,
              })}
            </p>
          </div>

          {/* 전용 ↔ 공급 */}
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
                min={50}
                max={90}
                step={1}
                value={ratio}
                onChange={(e) => setRatio(Number(e.target.value))}
                className="w-full accent-primary"
              />
              <div className="flex justify-between text-xs text-faint mt-1">
                <span>50%</span>
                <span>90%</span>
              </div>
            </div>
            <div className="grid sm:grid-cols-2 gap-3 mt-4">
              {(['exclusive', 'supply'] as const).map((k) => {
                const v = split[k]
                const est = k !== areaType
                return (
                  <div key={k} className={`rounded-xl p-4 border ${est ? 'bg-subtle border-transparent' : 'bg-primary-soft border-primary'}`}>
                    <div className={`text-sm ${est ? 'text-muted' : 'text-primary'}`}>
                      {t(k)}{est ? ` (${t('ratio.estimated')})` : ''}
                    </div>
                    <div className="text-2xl font-bold text-fg tabular-nums mt-1">
                      {num(toPyeong(v), 1)} {t(k === 'supply' ? 'pyeongType' : 'pyeong')}
                    </div>
                    <div className="text-sm text-sub tabular-nums">{num(v, 1)} {t('sqm')}</div>
                  </div>
                )
              })}
            </div>
            <p className="text-xs text-muted mt-4">{t('ratio.note')}</p>
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
              onChange={(e) => {
                const raw = e.target.value.replace(/[^0-9]/g, '')
                setPrice(raw ? Number(raw).toLocaleString('ko-KR') : '')
              }}
              className="ui-field w-full px-4 py-3 text-lg tabular-nums"
              placeholder={t('price.placeholder')}
            />
            {priceNum > 0 && m2 > 0 ? (
              <div className="grid sm:grid-cols-3 gap-3 mt-4">
                {[
                  { k: 'perSupplyPyeong', v: perPyeong(priceNum, split.supply) },
                  { k: 'perExclusivePyeong', v: perPyeong(priceNum, split.exclusive) },
                  { k: 'perM2', v: split.exclusive > 0 ? priceNum / split.exclusive : 0 },
                ].map(({ k, v }) => (
                  <div key={k} className="bg-subtle rounded-xl p-4">
                    <div className="text-sm text-muted">{t(`price.${k}`)}</div>
                    <div className="text-xl font-bold text-fg tabular-nums mt-1">
                      {Math.round(v).toLocaleString()} <span className="text-sm font-medium text-sub">{t('price.manwon')}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted mt-3">{t('price.empty')}</p>
            )}
            <p className="text-xs text-muted mt-3">{t('price.note')}</p>
            <Link href="/real-estate-calculator/" className="inline-flex items-center gap-1 text-sm font-medium text-primary mt-3 hover:underline">
              {t('price.link')}
              <ArrowRight className="w-4 h-4" />
            </Link>
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
                <th className="text-left py-2 pr-3 font-semibold">{t('popular.colExclusive')}</th>
                <th className="text-right py-2 px-3 font-semibold">{t('popular.colExclusivePyeong')}</th>
                <th className="text-right py-2 px-3 font-semibold">{t('popular.colSupply')}</th>
                <th className="text-right py-2 pl-3 font-semibold">{t('popular.colType')}</th>
              </tr>
            </thead>
            <tbody>
              {POPULAR.map((r) => {
                const on = method === 'area' && areaType === 'exclusive' && Math.abs(m2 - r.exclusive) < 0.01
                return (
                  <tr
                    key={r.exclusive}
                    onClick={() => {
                      setAreaValue('sqm', String(r.exclusive))
                      setAreaType('exclusive')
                    }}
                    className={`border-b border-line cursor-pointer tabular-nums transition-colors ${on ? 'bg-primary-soft text-primary' : 'text-body hover:bg-subtle'}`}
                  >
                    <td className="py-2.5 pr-3 font-medium">{r.exclusive} {t('sqm')}</td>
                    <td className="py-2.5 px-3 text-right">{num(r.exclusivePyeong)} {t('pyeong')}</td>
                    <td className="py-2.5 px-3 text-right">{Math.round(r.supplyMin)}~{Math.round(r.supplyMax)} {t('sqm')}</td>
                    <td className="py-2.5 pl-3 text-right font-semibold">{r.typeMin}~{r.typeMax}{t('pyeongType')}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* 면적 시각화 */}
        <div className="ui-card p-6">
          <h2 className="text-lg font-semibold text-fg">{t('visual.title')}</h2>
          <p className="text-xs text-muted mt-1 mb-5">{t('visual.desc')}</p>
          <div className="flex items-end gap-6 flex-wrap">
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
            <div>
              <p className="text-2xl font-bold text-primary tabular-nums">{((pyeong / REF_PYEONG) * 100).toFixed(0)}%</p>
              <p className="text-xs text-muted">{t('visual.ratio')}</p>
            </div>
          </div>
        </div>

        {/* 방 크기 참고 */}
        <div className="ui-card p-6">
          <h2 className="text-lg font-semibold text-fg mb-4">{t('roomSize')}</h2>
          <div className="grid grid-cols-2 gap-3">
            {ROOM_SIZES.map((room) => {
              const on = pyeong >= room.min && pyeong <= room.max
              return (
                <div key={room.key} className={`rounded-xl p-4 border ${on ? 'bg-primary-soft border-primary' : 'bg-subtle border-transparent'}`}>
                  <div className={`font-semibold text-sm mb-1 ${on ? 'text-primary' : 'text-fg'}`}>{t(`sizes.${room.key}`)}</div>
                  <div className="text-xs text-muted tabular-nums">
                    {(room.min * M2_PER_PYEONG).toFixed(1)}~{(room.max * M2_PER_PYEONG).toFixed(1)} {t('sqm')}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* 가이드 */}
      <div className="ui-card p-6">
        <h2 className="text-xl font-semibold text-fg mb-6">{t('guide.title')}</h2>
        <div className="grid md:grid-cols-2 gap-6">
          {(['what', 'reference'] as const).map((sec) => (
            <div key={sec}>
              <h3 className="text-lg font-semibold text-body mb-3">{t(`guide.${sec}.title`)}</h3>
              <ul className="space-y-2 text-sm text-sub list-disc pl-5">
                {(t.raw(`guide.${sec}.items`) as string[]).map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
