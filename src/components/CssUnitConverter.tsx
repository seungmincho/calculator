'use client'

import { useState, useCallback, useMemo, useEffect } from 'react'
import { useTranslations } from '@/lib/i18n'
import '@/lib/i18n/ns/cssUnitConverter'
import { useSearchParams } from '@/hooks/useSearchParams'
import { Copy, Check } from 'lucide-react'
import {
  ALL_UNITS, UNIT_GROUPS, APPROX_UNITS, convert, fmt, parseCssValue, pxToRemCss, fluidClamp, clampAt,
  type CssUnit, type CssContext,
} from '@/utils/cssUnits'

type Tab = 'convert' | 'bulk' | 'clamp' | 'table'
const TABS: Tab[] = ['convert', 'bulk', 'clamp', 'table']

const DEF = { v: '24', u: 'px' as CssUnit, root: '16', parent: '16', vw: '1440', vh: '900', cmin: '16', cmax: '24', cvmin: '375', cvmax: '1440', min: '0' }
const VIEWPORT_PRESETS = [
  { w: 360, h: 800, label: 'Galaxy' },
  { w: 375, h: 812, label: 'iPhone mini' },
  { w: 390, h: 844, label: 'iPhone' },
  { w: 768, h: 1024, label: 'iPad' },
  { w: 1280, h: 800, label: 'Laptop' },
  { w: 1440, h: 900, label: 'MacBook' },
  { w: 1920, h: 1080, label: 'FHD' },
]
const TABLE_PX = [1, 2, 4, 6, 8, 10, 12, 13, 14, 15, 16, 18, 20, 22, 24, 28, 32, 36, 40, 44, 48, 56, 64, 72, 80, 96, 128]
const CLAMP_PREVIEW_VW = [320, 375, 768, 1024, 1280, 1440, 1920]
const SAMPLE_CSS = `.card {
  padding: 24px 32px;
  margin-bottom: 16px;
  font-size: 14px;
  border: 1px solid #e5e8eb;
  border-radius: 12px;
}

@media (min-width: 768px) {
  .card { font-size: 18px; }
}`

const pos = (s: string, d: number) => { const n = Number(s); return n > 0 && Number.isFinite(n) ? n : d }

export default function CssUnitConverter() {
  const t = useTranslations('cssUnitConverter')
  const sp = useSearchParams()
  const q = (k: keyof typeof DEF) => sp.get(k) ?? DEF[k]

  const [tab, setTab] = useState<Tab>(() => (TABS as string[]).includes(sp.get('tab') ?? '') ? sp.get('tab') as Tab : 'convert')
  const [input, setInput] = useState(() => q('v'))
  const [unit, setUnit] = useState<CssUnit>(() => ALL_UNITS.find(u => u === sp.get('u')) ?? DEF.u)
  const [root, setRoot] = useState(() => q('root'))
  const [parent, setParent] = useState(() => q('parent'))
  const [vw, setVw] = useState(() => q('vw'))
  const [vh, setVh] = useState(() => q('vh'))
  const [cmin, setCmin] = useState(() => q('cmin'))
  const [cmax, setCmax] = useState(() => q('cmax'))
  const [cvmin, setCvmin] = useState(() => q('cvmin'))
  const [cvmax, setCvmax] = useState(() => q('cvmax'))
  const [minPx, setMinPx] = useState(() => q('min'))
  const [keep1px, setKeep1px] = useState(() => sp.get('k1') !== '0')
  const [skipMedia, setSkipMedia] = useState(() => sp.get('mq') !== '1')
  const [css, setCss] = useState(SAMPLE_CSS)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const ctx: CssContext = useMemo(() => ({
    root: pos(root, 16), parent: pos(parent, 16), vw: pos(vw, 1440), vh: pos(vh, 900),
  }), [root, parent, vw, vh])

  // URL 동기화 (기본값과 다른 것만)
  useEffect(() => {
    const id = setTimeout(() => {
      const cur: Record<string, string> = { tab, v: input, u: unit, root, parent, vw, vh, cmin, cmax, cvmin, cvmax, min: minPx }
      const p = new URLSearchParams()
      for (const [k, v] of Object.entries(cur)) {
        if (v !== (k === 'tab' ? 'convert' : DEF[k as keyof typeof DEF])) p.set(k, v)
      }
      if (!keep1px) p.set('k1', '0')
      if (!skipMedia) p.set('mq', '1')
      const qs = p.toString()
      window.history.replaceState(null, '', `${window.location.pathname}${qs ? `?${qs}` : ''}`)
    }, 300)
    return () => clearTimeout(id)
  }, [tab, input, unit, root, parent, vw, vh, cmin, cmax, cvmin, cvmax, minPx, keep1px, skipMedia])

  const copy = useCallback(async (text: string, id: string) => {
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
    } catch { /* 무시 */ }
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }, [])

  // ── 단위 변환 ──
  const parsed = parseCssValue(input)
  const from = parsed?.unit ?? unit
  const value = parsed?.value
  const pickUnit = (u: CssUnit) => {
    setUnit(u)
    if (parsed?.unit) setInput(fmt(parsed.value))
  }
  const onValueKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if ((e.key !== 'ArrowUp' && e.key !== 'ArrowDown') || value === undefined) return
    e.preventDefault()
    const step = e.shiftKey ? 10 : e.altKey ? 0.1 : 1
    setInput(fmt(value + (e.key === 'ArrowUp' ? step : -step)) + (parsed?.unit ?? ''))
  }
  const unitNames = (t.raw('unitNames') ?? {}) as Record<string, string>

  // ── 일괄 변환 ──
  const bulk = useMemo(
    () => pxToRemCss(css, { root: ctx.root, minPx: Math.max(0, Number(minPx) || 0), keep1px, skipMedia }),
    [css, ctx.root, minPx, keep1px, skipMedia],
  )

  // ── clamp ──
  const clamp = useMemo(
    () => fluidClamp({ minSize: Number(cmin), maxSize: Number(cmax), minVw: Number(cvmin), maxVw: Number(cvmax), root: ctx.root }),
    [cmin, cmax, cvmin, cvmax, ctx.root],
  )

  const copyBtn = (text: string, id: string, label?: string) => {
    const done = copiedId === id
    return (
      <button
        onClick={() => copy(text, id)}
        className={label ? 'ui-btn-soft px-3 py-1.5 text-sm inline-flex items-center gap-1.5' : 'shrink-0 p-1.5 rounded-lg hover:bg-soft text-faint hover:text-body transition-colors'}
        aria-label={done ? t('copySuccess') : `${t('copy')} ${text}`}
        title={done ? t('copySuccess') : t('copy')}
      >
        {done ? <Check className="w-4 h-4 text-primary" /> : <Copy className="w-4 h-4" />}
        {label && <span>{done ? t('copySuccess') : label}</span>}
      </button>
    )
  }

  const numField = (label: string, val: string, set: (s: string) => void, suffix = 'px') => (
    <label className="block">
      <span className="block text-sm text-body mb-1">{label}</span>
      <span className="flex items-center gap-2">
        <input type="number" inputMode="decimal" min="0" value={val} onChange={e => set(e.target.value)} className="ui-field px-3 py-2 text-sm font-mono w-full" />
        <span className="text-sm text-muted">{suffix}</span>
      </span>
    </label>
  )

  const quickRefHeaders = t.raw('quickRefHeaders') as string[]
  const quickRefRows = t.raw('quickRefRows') as string[][]
  const guides: [string, string][] = [
    ['guideAbsoluteTitle', 'guideAbsoluteItems'],
    ['guideRelativeTitle', 'guideRelativeItems'],
    ['guideViewportTitle', 'guideViewportItems'],
    ['guideTipsTitle', 'guideTipsItems'],
  ]

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-fg">{t('title')}</h1>
        <p className="text-sm text-muted mt-1">{t('description')}</p>
      </div>

      <div role="tablist" className="grid grid-cols-2 sm:flex gap-1 p-1 bg-soft rounded-xl">
        {TABS.map(id => (
          <button
            key={id}
            role="tab"
            aria-selected={tab === id}
            onClick={() => setTab(id)}
            className={`flex-1 whitespace-nowrap px-3 py-2 rounded-lg text-sm font-semibold transition-colors ${tab === id ? 'bg-primary text-white' : 'text-sub hover:text-fg'}`}
          >
            {t(`tab_${id}`)}
          </button>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* 기준 설정 */}
        <div className="lg:col-span-1 order-2 lg:order-1">
          <div className="ui-card p-6 space-y-4">
            <h2 className="text-base font-semibold text-fg">{t('settingsTitle')}</h2>
            {numField(t('rootFontSize'), root, setRoot)}
            {numField(t('parentFontSize'), parent, setParent)}
            <div className="grid grid-cols-2 gap-3">
              {numField(t('viewportWidth'), vw, setVw)}
              {numField(t('viewportHeight'), vh, setVh)}
            </div>
            <div>
              <span className="block text-sm text-body mb-2">{t('viewportPresets')}</span>
              <div className="flex flex-wrap gap-1.5">
                {VIEWPORT_PRESETS.map(p => {
                  const on = ctx.vw === p.w && ctx.vh === p.h
                  return (
                    <button
                      key={p.label}
                      onClick={() => { setVw(String(p.w)); setVh(String(p.h)) }}
                      aria-pressed={on}
                      className={`px-2.5 py-1.5 rounded-lg text-xs transition-colors ${on ? 'bg-primary text-white' : 'bg-soft text-body hover:bg-subtle'}`}
                    >
                      <span className="font-semibold">{p.label}</span> <span className="font-mono opacity-80">{p.w}×{p.h}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-2 order-1 lg:order-2 min-w-0">
          {tab === 'convert' && (
            <div className="ui-card p-6 space-y-6">
              <div className="space-y-3">
                <label className="block">
                  <span className="block text-sm font-medium text-body mb-1">{t('inputLabel')}</span>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={onValueKey}
                    placeholder={t('inputPlaceholder')}
                    className="ui-field px-4 py-3 text-lg font-mono w-full"
                    spellCheck={false}
                  />
                </label>
                <p className="text-xs text-muted">{t('inputHint')}</p>
                {!parsed && input.trim() !== '' && <p className="text-sm text-red-600">{t('inputError')}</p>}
                <div className="flex flex-wrap gap-1.5" aria-label={t('unitLabel')}>
                  {ALL_UNITS.map(u => (
                    <button
                      key={u}
                      onClick={() => pickUnit(u)}
                      aria-pressed={from === u}
                      className={`min-w-[3rem] px-2.5 py-1.5 rounded-lg text-sm font-mono font-semibold transition-colors ${from === u ? 'bg-primary text-white' : 'bg-soft text-body hover:bg-subtle'}`}
                    >
                      {u}
                    </button>
                  ))}
                </div>
              </div>

              {value !== undefined && UNIT_GROUPS.map(g => (
                <section key={g.key}>
                  <h2 className="text-sm font-semibold text-sub mb-2">{t(`group_${g.key}`)}</h2>
                  <div className="grid sm:grid-cols-2 gap-2">
                    {g.units.map(u => {
                      const text = `${fmt(convert(value, from, u, ctx))}${u}`
                      const active = u === from
                      return (
                        <div key={u} className={`flex items-center justify-between gap-2 px-4 py-3 rounded-xl border ${active ? 'border-primary bg-primary-soft' : 'border-line'}`}>
                          <div className="min-w-0">
                            <div className={`font-mono font-semibold tabular-nums truncate ${active ? 'text-primary' : 'text-fg'}`}>
                              {APPROX_UNITS.includes(u) && <span className="text-faint">≈ </span>}{text}
                            </div>
                            <div className="text-xs text-muted truncate">{unitNames[u]}</div>
                          </div>
                          {copyBtn(text, `r-${u}`)}
                        </div>
                      )
                    })}
                  </div>
                  {g.key === 'physical' && <p className="text-xs text-muted mt-2">{t('physicalNote')}</p>}
                  {g.key === 'font' && <p className="text-xs text-muted mt-2">{t('approxNote')}</p>}
                </section>
              ))}
            </div>
          )}

          {tab === 'bulk' && (
            <div className="ui-card p-6 space-y-4">
              <div>
                <h2 className="text-base font-semibold text-fg">{t('bulkTitle')}</h2>
                <p className="text-sm text-muted mt-1">{t('bulkDesc', { root: ctx.root })}</p>
              </div>
              <div className="flex flex-wrap items-center gap-x-5 gap-y-3 text-sm text-body">
                <label className="flex items-center gap-2">
                  {t('bulkMinPx')}
                  <input type="number" min="0" value={minPx} onChange={e => setMinPx(e.target.value)} className="ui-field px-2 py-1 w-20 font-mono" />
                  px
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={keep1px} onChange={e => setKeep1px(e.target.checked)} className="w-4 h-4 accent-primary" />
                  {t('bulkKeep1px')}
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={skipMedia} onChange={e => setSkipMedia(e.target.checked)} className="w-4 h-4 accent-primary" />
                  {t('bulkSkipMedia')}
                </label>
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <label className="block">
                  <span className="block text-sm font-medium text-body mb-1">{t('bulkInput')}</span>
                  <textarea value={css} onChange={e => setCss(e.target.value)} rows={14} spellCheck={false} className="ui-field px-3 py-2 w-full font-mono text-xs leading-relaxed resize-y" />
                </label>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-body">{t('bulkOutput', { count: bulk.count })}</span>
                    {copyBtn(bulk.out, 'bulk', t('copy'))}
                  </div>
                  <textarea readOnly value={bulk.out} rows={14} spellCheck={false} className="ui-field px-3 py-2 w-full font-mono text-xs leading-relaxed resize-y" aria-label={t('bulkOutput', { count: bulk.count })} />
                </div>
              </div>
              <p className="text-xs text-muted">{t('bulkNote')}</p>
            </div>
          )}

          {tab === 'clamp' && (
            <div className="ui-card p-6 space-y-5">
              <div>
                <h2 className="text-base font-semibold text-fg">{t('clampTitle')}</h2>
                <p className="text-sm text-muted mt-1">{t('clampDesc')}</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {numField(t('clampMinSize'), cmin, setCmin)}
                {numField(t('clampMaxSize'), cmax, setCmax)}
                {numField(t('clampMinVw'), cvmin, setCvmin)}
                {numField(t('clampMaxVw'), cvmax, setCvmax)}
              </div>
              {clamp ? (
                <>
                  <div className="bg-subtle rounded-2xl p-4 flex items-center justify-between gap-3">
                    <code className="font-mono text-sm sm:text-base font-semibold text-fg break-all">font-size: {clamp.css};</code>
                    {copyBtn(`font-size: ${clamp.css};`, 'clamp', t('copy'))}
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-sub mb-2">{t('clampPreview')}</h3>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-line text-left text-muted">
                            <th className="py-2 pr-3 font-medium">{t('clampColViewport')}</th>
                            <th className="py-2 pr-3 font-medium">{t('clampColSize')}</th>
                            <th className="py-2 font-medium">{t('clampColSample')}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {CLAMP_PREVIEW_VW.map(w => {
                            const px = clampAt(clamp, w, ctx.root)
                            return (
                              <tr key={w} className="border-b border-line">
                                <td className="py-2 pr-3 font-mono text-body">{w}px</td>
                                <td className="py-2 pr-3 font-mono tabular-nums text-fg">{fmt(px, 2)}px</td>
                                <td className="py-2 text-fg whitespace-nowrap" style={{ fontSize: px }}>{t('clampSampleText')}</td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              ) : (
                <p className="text-sm text-red-600">{t('clampError')}</p>
              )}
            </div>
          )}

          {tab === 'table' && (
            <div className="ui-card p-6">
              <h2 className="text-base font-semibold text-fg">{t('tableTitle', { root: ctx.root })}</h2>
              <p className="text-sm text-muted mt-1 mb-4">{t('tableDesc')}</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {TABLE_PX.map(px => {
                  const rem = `${fmt(px / ctx.root)}rem`
                  return (
                    <button
                      key={px}
                      onClick={() => copy(rem, `t-${px}`)}
                      className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl border border-line hover:bg-soft text-left font-mono text-sm"
                      title={t('copy')}
                    >
                      <span className="text-muted">{px}px</span>
                      <span className={copiedId === `t-${px}` ? 'text-primary font-semibold' : 'text-fg font-semibold'}>
                        {copiedId === `t-${px}` ? t('copySuccess') : rem}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 공식 참고표 */}
      <div className="ui-card p-6">
        <h2 className="text-xl font-semibold text-fg mb-2">{t('quickRefTitle')}</h2>
        <p className="text-sm text-muted mb-4">{t('quickRefDesc')}</p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line">
                {quickRefHeaders.map((h, i) => <th key={i} className="text-left py-2 px-3 font-semibold text-body">{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {quickRefRows.map((row, i) => (
                <tr key={i} className="border-b border-line">
                  {row.map((cell, j) => (
                    <td key={j} className={`py-2.5 px-3 ${j === 0 ? 'font-semibold text-fg font-mono whitespace-nowrap' : j === 1 ? 'text-sub' : 'font-mono text-body'}`}>{cell}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 가이드 */}
      <div className="ui-card p-6">
        <h2 className="text-xl font-semibold text-fg mb-6">{t('guideTitle')}</h2>
        <div className="grid md:grid-cols-2 gap-4">
          {guides.map(([title, items]) => (
            <div key={title} className="bg-subtle rounded-2xl p-5">
              <h3 className="text-base font-semibold text-fg mb-3">{t(title)}</h3>
              <ul className="space-y-2 list-disc pl-5 text-sm text-sub">
                {(t.raw(items) as string[]).map((item, i) => <li key={i}>{item}</li>)}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
