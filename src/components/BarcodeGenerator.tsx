'use client'

import { useState, useEffect, useMemo, useCallback, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import JsBarcode from 'jsbarcode'
import { AlertCircle, AlertTriangle, Download, Copy, Printer, ExternalLink } from 'lucide-react'
import { useTranslations } from '@/lib/i18n'
import { useSearchParams } from '@/hooks/useSearchParams'
import GuideSection from '@/components/GuideSection'
import {
  FORMATS, FORMAT_NAME, SAMPLE, GS1_LEN, MAX_LEN, MAX_ITEMS, SHEET_PRESETS, PAGE,
  checkValue, gs1Prefix, serial, parseBulk, labelSize, cellPos, paginate, contrastWarning,
  type Format, type Checked, type SheetLayout,
} from '@/utils/barcode'

type Mode = 'single' | 'bulk' | 'serial'
interface Opts { width: number; height: number; showText: boolean; fontSize: number; margin: number; bar: string; bg: string }
interface Cell { svg: string; label: string }
interface Row extends Checked { line: number; code: string; label: string }

const SVG_NS = 'http://www.w3.org/2000/svg'
const jsOpts = (format: Format, o: Opts, k = 1) => ({
  format, width: o.width * k, height: o.height * k, displayValue: o.showText, fontSize: o.fontSize * k,
  margin: o.margin * k, background: o.bg, lineColor: o.bar, font: 'monospace',
})
/** 브라우저 전용: JsBarcode → SVG 문자열 (실패 시 '') */
function toSvg(format: Format, value: string, o: Opts): string {
  try {
    const svg = document.createElementNS(SVG_NS, 'svg')
    JsBarcode(svg, value, jsOpts(format, o))
    return new XMLSerializer().serializeToString(svg)
  } catch { return '' }
}
const clampNum = (s: string, lo: number, hi: number, def: number) => {
  const n = Number(s)
  return s.trim() === '' || !Number.isFinite(n) ? def : Math.min(hi, Math.max(lo, n))
}
const PAPER: React.CSSProperties = { background: '#fff', color: '#000' }

export default function BarcodeGenerator() {
  const t = useTranslations('barcodeGenerator')
  const sp = useSearchParams()

  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  const [mode, setMode] = useState<Mode>('single')
  const [format, setFormat] = useState<Format>(() => (FORMATS.includes(sp.get('f') as Format) ? (sp.get('f') as Format) : 'CODE128'))
  const [value, setValue] = useState(() => sp.get('v') ?? SAMPLE[format])
  const [bulkText, setBulkText] = useState(() => t('u.bulk.sample'))
  const [prefix, setPrefix] = useState('A-')
  const [start, setStart] = useState('1')
  const [count, setCount] = useState('24')
  const [pad, setPad] = useState('4')
  const [opts, setOpts] = useState<Opts>({ width: 2, height: 80, showText: true, fontSize: 16, margin: 10, bar: '#000000', bg: '#ffffff' })
  const [cols, setCols] = useState('3')
  const [rows, setRows] = useState('8')
  const [top, setTop] = useState('10')
  const [side, setSide] = useState('5')
  const [gapX, setGapX] = useState('0')
  const [gapY, setGapY] = useState('0')
  const [skip, setSkip] = useState('0')
  const [copies, setCopies] = useState('')
  const [showLabel, setShowLabel] = useState(true)
  const [status, setStatus] = useState('')
  const [printing, setPrinting] = useState(false)

  // 단건 형식·값만 URL로 공유
  useEffect(() => {
    const q = new URLSearchParams(window.location.search)
    q.set('f', format)
    q.set('v', value)
    window.history.replaceState(null, '', `?${q}`)
  }, [format, value])

  const set = <K extends keyof Opts>(k: K, v: Opts[K]) => setOpts((p) => ({ ...p, [k]: v }))
  const changeFormat = (f: Format) => {
    setFormat(f)
    if (!checkValue(f, value).ok) setValue(SAMPLE[f])
  }

  const single = checkValue(format, value)
  const layout: SheetLayout = {
    cols: clampNum(cols, 1, 8, 3), rows: clampNum(rows, 1, 20, 8),
    top: clampNum(top, 0, 50, 10), side: clampNum(side, 0, 50, 5), gapX: clampNum(gapX, 0, 30, 0), gapY: clampNum(gapY, 0, 30, 0),
  }
  const size = labelSize(layout)
  const perPage = layout.cols * layout.rows
  const sizeOk = size.w >= 10 && size.h >= 5

  const bulkAll = useMemo(() => parseBulk(bulkText), [bulkText])
  const rowsList: Row[] = useMemo(() => {
    const src = mode === 'single'
      ? Array.from({ length: clampNum(copies, 1, MAX_ITEMS, perPage) }, () => ({ line: 1, code: value, label: '' }))
      : mode === 'bulk'
        ? bulkAll.slice(0, MAX_ITEMS)
        : serial(prefix, clampNum(start, 0, 1e12, 1), clampNum(count, 0, MAX_ITEMS, 24), clampNum(pad, 0, 20, 0)).map((code, i) => ({ line: i + 1, code, label: '' }))
    return src.map((r) => ({ ...r, ...checkValue(format, r.code) }))
  }, [mode, copies, perPage, value, bulkAll, prefix, start, count, pad, format])
  const good = rowsList.filter((r) => r.ok)
  const bad = rowsList.filter((r) => !r.ok)
  const pages = paginate(good, perPage, clampNum(skip, 0, perPage - 1, 0))

  // SVG 생성은 브라우저에서만 (정적 HTML엔 자리만)
  const svgCache = useMemo(() => new Map<string, string>(), [format, opts]) // eslint-disable-line react-hooks/exhaustive-deps
  const svgOf = useCallback((v: string) => {
    let s = svgCache.get(v)
    if (s === undefined) { s = toSvg(format, v, opts); svgCache.set(v, s) }
    return s
  }, [svgCache, format, opts])
  const cellsOf = (page: (Row | null)[]): (Cell | null)[] => page.map((r) => (r ? { svg: svgOf(r.value), label: showLabel ? r.label : '' } : null))

  const ctr = contrastWarning(opts.bar, opts.bg)
  const gs1 = format in GS1_LEN
  const prefixHint = single.ok ? gs1Prefix(format, single.value) : null
  const name = FORMAT_NAME[format]

  const errMsg = (c: Checked) => {
    const n = GS1_LEN[format] ?? 0
    return t(`u.err.${c.error}`, { a: n - 1, b: n, len: c.value.length, expected: c.expected ?? '', max: MAX_LEN, name })
  }

  // ── 내보내기 ──
  const flash = (msg: string) => { setStatus(msg); setTimeout(() => setStatus(''), 3000) }
  const fileBase = `barcode-${name}-${single.value.replace(/[^\w-]/g, '_').slice(0, 40)}`
  const save = (blob: Blob, file: string) => {
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = file
    a.click()
    setTimeout(() => URL.revokeObjectURL(a.href), 1000)
  }
  const pngBlob = () => new Promise<Blob | null>((res) => {
    const c = document.createElement('canvas')
    try { JsBarcode(c, single.value, jsOpts(format, opts, 3)) } catch { return res(null) } // 3배 해상도
    c.toBlob(res, 'image/png')
  })
  const downloadPng = async () => {
    const b = await pngBlob()
    if (b) { save(b, `${fileBase}.png`); flash(t('u.status.png')) }
  }
  const downloadSvg = () => {
    save(new Blob([svgOf(single.value)], { type: 'image/svg+xml' }), `${fileBase}.svg`)
    flash(t('u.status.svg'))
  }
  const copyImage = async () => {
    try {
      const b = await pngBlob()
      if (!b || !navigator.clipboard?.write) throw new Error('unsupported')
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': b })])
      flash(t('u.status.copied'))
    } catch { flash(t('u.status.copyFail')) }
  }

  // 인쇄: 누를 때만 전체 시트를 포털로 그리고 print → afterprint에서 해제
  useEffect(() => {
    if (!printing) return
    const done = () => setPrinting(false)
    window.addEventListener('afterprint', done, { once: true })
    const id = setTimeout(() => window.print(), 50)
    return () => { clearTimeout(id); window.removeEventListener('afterprint', done) }
  }, [printing])

  // ── UI 조각 ──
  const seg = (on: boolean) =>
    `min-h-[44px] px-3 py-2 rounded-lg text-sm font-medium transition-colors ${on ? 'bg-primary text-white' : 'bg-soft text-body hover:bg-subtle'}`
  const lbl = 'block text-sm font-medium text-body mb-2'
  const num = (id: string, label: ReactNode, v: string, on: (s: string) => void, min: number, max: number, unit?: string) => (
    <div>
      <label htmlFor={id} className={lbl}>{label}</label>
      <div className="relative">
        <input id={id} type="number" inputMode="numeric" min={min} max={max} value={v} onChange={(e) => on(e.target.value)}
          className={`ui-field w-full px-4 py-3 tabular-nums ${unit ? 'pr-12' : ''}`} />
        {unit && <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-muted pointer-events-none" aria-hidden="true">{unit}</span>}
      </div>
    </div>
  )
  const range = (id: 'width' | 'height' | 'margin' | 'fontSize', min: number, max: number, step: number) => (
    <div>
      <label htmlFor={`bc-${id}`} className="flex justify-between text-sm font-medium text-body mb-1">
        <span>{t(`u.opts.${id}`)}</span><span className="tabular-nums text-sub">{t('u.opts.px', { v: opts[id] })}</span>
      </label>
      <input id={`bc-${id}`} type="range" min={min} max={max} step={step} value={opts[id]}
        onChange={(e) => set(id, Number(e.target.value))} className="w-full h-11 accent-blue-500 cursor-pointer" />
    </div>
  )
  const errIcon = <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" aria-hidden="true" />
  const mm = t('u.sheet.mm')

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
      <style>{'.bc-cell svg{display:block;width:100%;height:100%}'}</style>
      <div>
        <h1 className="text-2xl font-bold text-fg">{t('title')}</h1>
        <p className="text-sm text-muted mt-1">{t('description')}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── 입력 ── */}
        <div className="lg:col-span-1 space-y-6">
          <div className="ui-card p-6 space-y-5">
            <div>
              <p id="bc-mode-label" className={lbl}>{t('u.mode.label')}</p>
              <div role="group" aria-labelledby="bc-mode-label" className="grid grid-cols-3 gap-2">
                {(['single', 'bulk', 'serial'] as const).map((m) => (
                  <button key={m} type="button" aria-pressed={mode === m} onClick={() => setMode(m)} className={seg(mode === m)}>{t(`u.mode.${m}`)}</button>
                ))}
              </div>
            </div>

            <div>
              <label htmlFor="bc-format" className={lbl}>{t('input.format')}</label>
              <select id="bc-format" value={format} onChange={(e) => changeFormat(e.target.value as Format)} aria-describedby="bc-rule" className="ui-field w-full px-4 py-3">
                {FORMATS.map((f) => <option key={f} value={f}>{t(`formats.${f}`)}</option>)}
              </select>
              <p id="bc-rule" className="text-xs text-muted mt-2">{t(`u.rule.${format}`)}</p>
            </div>

            {mode === 'single' && (
              <div>
                <label htmlFor="bc-value" className={lbl}>{t('u.value.label')}</label>
                <input id="bc-value" type="text" value={value} onChange={(e) => setValue(e.target.value)} autoComplete="off" spellCheck={false}
                  inputMode={gs1 ? 'numeric' : 'text'} placeholder={SAMPLE[format]}
                  aria-invalid={!single.ok} aria-describedby="bc-value-msg bc-rule"
                  className="ui-field w-full px-4 py-3 font-mono tabular-nums" />
                <div id="bc-value-msg" className="mt-2 text-sm">
                  {!single.ok ? (
                    <p className="flex gap-1.5 text-red-600">
                      {errIcon}
                      <span>{errMsg(single)}
                        {single.expected && (
                          <button type="button" onClick={() => setValue(single.expected!)} className="ml-2 min-h-[44px] px-2 font-medium text-primary underline">{t('u.fix')}</button>
                        )}
                      </span>
                    </p>
                  ) : single.added !== undefined ? (
                    <p className="text-sub">{t('u.added', { d: single.added, value: single.value })}</p>
                  ) : null}
                  {prefixHint && <p className="text-sub mt-1">{t(`u.prefix.${prefixHint}`)}</p>}
                </div>
              </div>
            )}

            {mode === 'bulk' && (
              <div>
                <label htmlFor="bc-bulk" className={lbl}>{t('u.bulk.label')}</label>
                <textarea id="bc-bulk" rows={8} value={bulkText} onChange={(e) => setBulkText(e.target.value)} spellCheck={false}
                  aria-invalid={bad.length > 0} aria-describedby="bc-bulk-hint bc-list-msg"
                  className="ui-field w-full px-4 py-3 font-mono text-sm" />
                <p id="bc-bulk-hint" className="text-xs text-muted mt-2">
                  {t('u.bulk.hint', { max: MAX_ITEMS })}{bulkAll.length > MAX_ITEMS && ` ${t('u.bulk.over', { max: MAX_ITEMS })}`}
                </p>
              </div>
            )}

            {mode === 'serial' && (
              <div className="space-y-4">
                <div>
                  <label htmlFor="bc-prefix" className={lbl}>{t('u.serial.prefix')}</label>
                  <input id="bc-prefix" type="text" value={prefix} onChange={(e) => setPrefix(e.target.value)} autoComplete="off" spellCheck={false}
                    aria-invalid={bad.length > 0} aria-describedby="bc-serial-hint bc-list-msg" className="ui-field w-full px-4 py-3 font-mono" />
                </div>
                <div className="grid grid-cols-3 gap-3">
                  {num('bc-start', t('u.serial.start'), start, setStart, 0, 1e12)}
                  {num('bc-count', t('u.serial.count'), count, setCount, 1, MAX_ITEMS)}
                  {num('bc-pad', t('u.serial.pad'), pad, setPad, 0, 20)}
                </div>
                <p id="bc-serial-hint" className="text-xs text-muted">
                  {rowsList.length > 0 && <span className="font-mono text-sub">{t('u.serial.range', { first: rowsList[0].code, last: rowsList[rowsList.length - 1].code })} </span>}
                  {gs1 && t('u.serial.hint', { n: (GS1_LEN[format] ?? 1) - 1 })}
                </p>
              </div>
            )}
          </div>

          {/* ── 모양 ── */}
          <div className="ui-card p-6 space-y-4">
            <h2 className="text-lg font-semibold text-fg">{t('u.opts.title')}</h2>
            {range('width', 1, 4, 1)}
            {range('height', 30, 200, 5)}
            {range('margin', 0, 40, 2)}
            <label htmlFor="bc-showText" className="flex items-center gap-3 min-h-[44px] text-sm text-body cursor-pointer">
              <input id="bc-showText" type="checkbox" checked={opts.showText} onChange={(e) => set('showText', e.target.checked)} className="w-5 h-5 accent-blue-500" />
              {t('u.opts.showText')}
            </label>
            {opts.showText && range('fontSize', 10, 30, 1)}
            <div className="grid grid-cols-2 gap-3">
              {(['bar', 'bg'] as const).map((k) => (
                <div key={k}>
                  <label htmlFor={`bc-${k}`} className={lbl}>{t(`u.opts.${k}`)}</label>
                  <input id={`bc-${k}`} type="color" value={opts[k]} onChange={(e) => set(k, e.target.value)}
                    aria-describedby={ctr.warn ? 'bc-contrast' : undefined} className="w-full h-11 rounded-lg border border-line cursor-pointer bg-surface" />
                </div>
              ))}
            </div>
            {ctr.warn && (
              <p id="bc-contrast" className="flex gap-1.5 text-sm bg-amber-50 text-amber-800 rounded-xl p-3">
                <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" aria-hidden="true" />
                <span>{t(`u.warn.${ctr.warn}`, { ratio: ctr.ratio })}</span>
              </p>
            )}
          </div>
        </div>

        {/* ── 결과 ── */}
        <div className="lg:col-span-2 space-y-6">
          <div className="ui-card p-6">
            <h2 className="text-lg font-semibold text-fg mb-4">{t('u.preview.title')}</h2>
            {mode === 'single' ? (
              <>
                <div className="rounded-2xl border border-line p-6 min-h-[180px] flex items-center justify-center overflow-x-auto" style={{ background: opts.bg }}>
                  {single.ok && mounted && svgOf(single.value) ? (
                    <div role="img" aria-label={t('u.preview.aria', { format: name, value: single.value })}
                      className="[&>svg]:max-w-full [&>svg]:h-auto" dangerouslySetInnerHTML={{ __html: svgOf(single.value) }} />
                  ) : (
                    <p className="text-sm text-muted">{single.ok ? '' : t('u.preview.empty')}</p>
                  )}
                </div>
                <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <button type="button" onClick={downloadPng} disabled={!single.ok} className="ui-btn min-h-[44px] px-4 py-2 inline-flex items-center justify-center gap-1.5 text-sm">
                    <Download className="w-4 h-4" aria-hidden="true" />{t('u.dl.png')}
                  </button>
                  <button type="button" onClick={downloadSvg} disabled={!single.ok} className="ui-btn-soft min-h-[44px] px-4 py-2 inline-flex items-center justify-center gap-1.5 text-sm disabled:opacity-45">
                    <Download className="w-4 h-4" aria-hidden="true" />{t('u.dl.svg')}
                  </button>
                  <button type="button" onClick={copyImage} disabled={!single.ok} className="ui-btn-soft min-h-[44px] px-4 py-2 inline-flex items-center justify-center gap-1.5 text-sm disabled:opacity-45">
                    <Copy className="w-4 h-4" aria-hidden="true" />{t('u.dl.copy')}
                  </button>
                  <a href="#bc-sheet" className="ui-btn-soft min-h-[44px] px-4 py-2 inline-flex items-center justify-center gap-1.5 text-sm">
                    <Printer className="w-4 h-4" aria-hidden="true" />{t('u.dl.print')}
                  </a>
                </div>
              </>
            ) : (
              <div id="bc-list-msg" className="space-y-3">
                <p className="text-3xl font-bold text-fg tabular-nums">{t('u.list.count', { n: good.length })}</p>
                {bad.length > 0 && (
                  <div className="text-sm text-red-600">
                    <p className="flex gap-1.5 font-medium">{errIcon}{t('u.list.errors', { n: bad.length })}</p>
                    <ul className="mt-2 space-y-1 pl-6 list-disc">
                      {bad.slice(0, 10).map((r) => (
                        <li key={r.line}>{t('u.list.row', { n: r.line, code: r.code || ' ', msg: errMsg(r) })}</li>
                      ))}
                    </ul>
                    {bad.length > 10 && <p className="mt-1 pl-6">{t('u.list.more', { n: bad.length - 10 })}</p>}
                  </div>
                )}
                {good.length > 0 && <p className="text-sm text-sub">{t('u.list.next')}</p>}
              </div>
            )}
            <p aria-live="polite" className="mt-3 min-h-[1.25rem] text-sm text-sub">{status}</p>
          </div>

          {gs1 && (
            <div className="bg-amber-50 text-amber-800 rounded-2xl p-5 text-sm space-y-2">
              <p className="flex gap-1.5 font-semibold"><AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" aria-hidden="true" />{t('u.gs1.title')}</p>
              <p className="leading-relaxed">{t('u.gs1.body')}</p>
              <div className="flex flex-wrap gap-x-4">
                <a href="https://www.gs1kr.org" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 min-h-[44px] font-medium underline">
                  {t('u.gs1.link')}<ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
                </a>
                <button type="button" onClick={() => changeFormat('CODE128')} className="min-h-[44px] font-medium underline">{t('u.gs1.useCode128')}</button>
              </div>
            </div>
          )}

          {/* ── 라벨 시트 ── */}
          <div id="bc-sheet" className="ui-card p-6 space-y-5 scroll-mt-20">
            <h2 className="text-lg font-semibold text-fg">{t('u.sheet.title')}</h2>
            <div>
              <p id="bc-preset-label" className={lbl}>{t('u.sheet.preset')}</p>
              <div role="group" aria-labelledby="bc-preset-label" className="flex flex-wrap gap-2">
                {SHEET_PRESETS.map(([c, r]) => {
                  const on = layout.cols === c && layout.rows === r
                  return (
                    <button key={`${c}x${r}`} type="button" aria-pressed={on} onClick={() => { setCols(String(c)); setRows(String(r)) }} className={seg(on)}>
                      {t('u.sheet.presetItem', { c, r, n: c * r })}
                    </button>
                  )
                })}
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {num('bc-cols', t('u.sheet.cols'), cols, setCols, 1, 8)}
              {num('bc-rows', t('u.sheet.rows'), rows, setRows, 1, 20)}
              {num('bc-skip', t('u.sheet.skip'), skip, setSkip, 0, perPage - 1)}
              {num('bc-top', t('u.sheet.top'), top, setTop, 0, 50, mm)}
              {num('bc-side', t('u.sheet.side'), side, setSide, 0, 50, mm)}
              {num('bc-gapX', t('u.sheet.gapX'), gapX, setGapX, 0, 30, mm)}
              {num('bc-gapY', t('u.sheet.gapY'), gapY, setGapY, 0, 30, mm)}
              {mode === 'single' && (
                <div>
                  <label htmlFor="bc-copies" className={lbl}>{t('u.sheet.copies')}</label>
                  <input id="bc-copies" type="number" inputMode="numeric" min={1} max={MAX_ITEMS} value={copies} placeholder={String(perPage)}
                    onChange={(e) => setCopies(e.target.value)} aria-describedby="bc-copies-hint" className="ui-field w-full px-4 py-3 tabular-nums" />
                  <p id="bc-copies-hint" className="text-xs text-muted mt-1">{t('u.sheet.copiesHint', { n: perPage })}</p>
                </div>
              )}
            </div>
            {mode === 'bulk' && (
              <label htmlFor="bc-showLabel" className="flex items-center gap-3 min-h-[44px] text-sm text-body cursor-pointer">
                <input id="bc-showLabel" type="checkbox" checked={showLabel} onChange={(e) => setShowLabel(e.target.checked)} className="w-5 h-5 accent-blue-500" />
                {t('u.sheet.showLabel')}
              </label>
            )}

            <div className="bg-subtle rounded-2xl p-5 text-sm text-sub space-y-1" aria-live="polite">
              {sizeOk ? (
                <>
                  <p className="text-base font-semibold text-fg tabular-nums">{t('u.sheet.size', { w: size.w, h: size.h })}</p>
                  <p className="tabular-nums">{t('u.sheet.pages', { n: pages.length, count: good.length })}</p>
                </>
              ) : (
                <p className="flex gap-1.5 text-red-600">{errIcon}{t('u.sheet.invalid')}</p>
              )}
            </div>

            {sizeOk && mounted && pages[0] && (
              <div className="mx-auto w-full max-w-sm border border-line rounded-sm overflow-hidden"
                role="img" aria-label={t('u.sheet.previewAria', { c: layout.cols, r: layout.rows })}>
                <SheetPage cells={cellsOf(pages[0])} layout={layout} unit="%" />
              </div>
            )}

            <button type="button" onClick={() => setPrinting(true)} disabled={!sizeOk || good.length === 0}
              className="ui-btn w-full min-h-[44px] px-4 py-3 inline-flex items-center justify-center gap-2">
              <Printer className="w-4 h-4" aria-hidden="true" />{t('u.sheet.print', { n: pages.length })}
            </button>
            <p className="text-xs text-muted leading-relaxed">{t('u.sheet.note')}</p>
          </div>
        </div>
      </div>

      <GuideSection namespace="barcodeGenerator" />

      {printing && createPortal(
        <div id="barcode-print" className="hidden print:block">
          <style>{'@media print{body>*:not(#barcode-print){display:none!important}html,body{background:#fff!important;margin:0!important;padding:0!important}@page{size:A4;margin:0}}'}</style>
          {pages.map((p, i) => <SheetPage key={i} cells={cellsOf(p)} layout={layout} unit="mm" />)}
        </div>,
        document.body,
      )}
    </div>
  )
}

/** A4 한 장: 인쇄는 mm 절대 위치, 미리보기는 같은 배치를 %·cqw로 축소 */
function SheetPage({ cells, layout, unit }: { cells: (Cell | null)[]; layout: SheetLayout; unit: 'mm' | '%' }) {
  const { w, h } = labelSize(layout)
  const X = (v: number) => (unit === 'mm' ? `${v}mm` : `${(v / PAGE.w) * 100}%`)
  const Y = (v: number) => (unit === 'mm' ? `${v}mm` : `${(v / PAGE.h) * 100}%`)
  const F = (v: number) => (unit === 'mm' ? `${v}mm` : `${(v / PAGE.w) * 100}cqw`)
  const pad = Math.min(2, w / 10, h / 10)
  const fontMm = Math.min(3, h / 8)
  return (
    <div style={{
      ...PAPER, position: 'relative', overflow: 'hidden',
      ...(unit === 'mm' ? { width: '210mm', height: '297mm', breakAfter: 'page' } : { width: '100%', aspectRatio: '210 / 297', containerType: 'inline-size' }),
    }}>
      {Array.from({ length: layout.cols * layout.rows }, (_, i) => {
        const c = cells[i]
        const p = cellPos(layout, i)
        return (
          <div key={i} className="bc-cell" style={{
            position: 'absolute', left: X(p.x), top: Y(p.y), width: X(w), height: Y(h), padding: F(pad),
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: F(0.5),
            outline: unit === '%' ? '1px dashed #d1d6db' : undefined, outlineOffset: -1,
          }}>
            {c && <div style={{ flex: 1, minHeight: 0, width: '100%' }} dangerouslySetInnerHTML={{ __html: c.svg }} />}
            {c?.label && (
              <div style={{ fontSize: F(fontMm), lineHeight: 1.2, maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.label}</div>
            )}
          </div>
        )
      })}
    </div>
  )
}
