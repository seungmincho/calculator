'use client'

import { useState, useRef, useCallback, useEffect, useMemo } from 'react'
import { useTranslations } from '@/lib/i18n'
import '@/lib/i18n/ns/signatureGenerator'
import { Download, Undo2, Redo2, Eraser, Copy, Check, Save, Trash2, ShieldCheck } from 'lucide-react'
import GuideSection from '@/components/GuideSection'
import { FONTS, FONT_BY_ID, googleCssUrl } from '@/utils/fontPreview'
import {
  type Pt, type Stroke, type SavedSig, segments, dotRadius, strokesSvg, alphaBounds, hasHangul, parseSaved, SAVED_MAX,
} from '@/utils/signature'

type Mode = 'draw' | 'type'
type Fmt = 'png' | 'jpg' | 'svg'
interface SigFont { family: string; label: string; latin: boolean; scale: number }

const INKS = [{ id: 'black', v: '#111111' }, { id: 'blue', v: '#1d3fae' }] as const
const PAD = 12 // 트림 후 여백 (CSS px, 배율 곱함)
const SAVE_KEY = 'signatureGenerator.saved'

// 한글 손글씨: fontPreview의 손글씨 분류 + 붓글씨 느낌 2종 (모두 Google Fonts, SIL OFL 1.1)
// scale = 같은 px에서 작아 보이는 폰트 보정 (눈대중)
const SCALE: Record<string, number> = {
  'Nanum Pen Script': 1.2, 'Nanum Brush Script': 1.2, 'Great Vibes': 1.15, Sacramento: 1.25, Allura: 1.2,
  'Alex Brush': 1.1, 'Mr Dafoe': 1.15, 'Herr Von Muellerhoff': 1.35, Parisienne: 1.1, 'Mrs Saint Delafield': 1.35,
  'Pinyon Script': 1.05, 'La Belle Aurore': 1.05,
}
const KO_FONTS: SigFont[] = [
  ...FONTS.filter(f => f.cat === 'handwriting'),
  ...['yeon-sung', 'kirang-haerang'].map(id => FONT_BY_ID.get(id)!).filter(Boolean),
].map(f => ({ family: f.family, label: f.ko, latin: false, scale: SCALE[f.family] ?? 1 }))
// 라틴 필기체: github.com/google/fonts ofl/ 디렉터리 확인 (2026-10)
const LATIN_FONTS: SigFont[] = [
  'Dancing Script', 'Great Vibes', 'Sacramento', 'Allura', 'Alex Brush', 'Mr Dafoe', 'Herr Von Muellerhoff', 'Caveat',
  'Parisienne', 'Mrs Saint Delafield', 'La Belle Aurore', 'Cedarville Cursive', 'Pinyon Script', 'Kaushan Script',
].map(family => ({ family, label: family, latin: true, scale: SCALE[family] ?? 1 }))

const fontCss = (f: SigFont, px: number) => `${px}px '${f.family}', ${f.latin ? 'cursive' : 'sans-serif'}`

function drawStrokes(ctx: CanvasRenderingContext2D, strokes: Stroke[]) {
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  for (const s of strokes) {
    const segs = segments(s)
    if (!segs.length) {
      if (!s.pts.length) continue
      ctx.fillStyle = s.color
      ctx.beginPath()
      ctx.arc(s.pts[0].x, s.pts[0].y, dotRadius(s), 0, Math.PI * 2)
      ctx.fill()
      continue
    }
    ctx.strokeStyle = s.color
    for (const g of segs) {
      ctx.lineWidth = g.w
      ctx.beginPath()
      ctx.moveTo(g.x0, g.y0)
      ctx.bezierCurveTo(g.c1x, g.c1y, g.c2x, g.c2y, g.x1, g.y1)
      ctx.stroke()
    }
  }
}

/** 투명 캔버스 → 잉크 경계로 자르고 여백 추가. jpg면 흰 배경 */
function trim(src: HTMLCanvasElement, pad: number, white: boolean): HTMLCanvasElement | null {
  const ctx = src.getContext('2d')
  if (!ctx || !src.width || !src.height) return null
  const b = alphaBounds(ctx.getImageData(0, 0, src.width, src.height).data, src.width, src.height)
  if (!b) return null
  const out = document.createElement('canvas')
  out.width = b.w + pad * 2
  out.height = b.h + pad * 2
  const o = out.getContext('2d')!
  if (white) { o.fillStyle = '#ffffff'; o.fillRect(0, 0, out.width, out.height) }
  o.drawImage(src, b.x, b.y, b.w, b.h, pad, pad, b.w, b.h)
  return out
}

const toBlob = (c: HTMLCanvasElement, type: string) =>
  new Promise<Blob>((res, rej) => c.toBlob(b => (b ? res(b) : rej(new Error('toBlob'))), type, 0.92))

function downloadBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = name
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

const stamp = () => new Date().toISOString().slice(0, 10).replace(/-/g, '')

export default function SignatureGenerator() {
  const t = useTranslations('signatureGenerator')
  const [mode, setMode] = useState<Mode>('draw')

  // ── 공통 ──
  const [ink, setInk] = useState<string>(INKS[0].v)
  const [fmt, setFmt] = useState<Fmt>('png')
  const [scale, setScale] = useState(2)
  const [flash, setFlash] = useState<string | null>(null)
  const [saved, setSaved] = useState<SavedSig[]>([])
  const [preview, setPreview] = useState<{ url: string; w: number; h: number } | null>(null)

  // ── 그리기 ──
  const [size, setSize] = useState(3)
  const [hist, setHist] = useState<{ past: Stroke[][]; cur: Stroke[]; future: Stroke[][] }>({ past: [], cur: [], future: [] })
  const strokes = hist.cur
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const liveRef = useRef<Stroke | null>(null)
  const strokesRef = useRef(strokes)
  strokesRef.current = strokes
  const rafRef = useRef(0)
  const [drawing, setDrawing] = useState(false)

  // ── 이름 입력 ──
  const [name, setName] = useState(() => t('type.defaultName'))
  const [debName, setDebName] = useState(name)
  const [fontFamily, setFontFamily] = useState('Nanum Pen Script')
  const [fontSize, setFontSize] = useState(64)
  const [slant, setSlant] = useState(0)
  const [spacing, setSpacing] = useState(0)

  const koName = hasHangul(debName)
  const fontList = koName ? KO_FONTS : [...LATIN_FONTS, ...KO_FONTS]
  const font = fontList.find(f => f.family === fontFamily) ?? KO_FONTS[0]
  const text = name.trim()

  const showFlash = (k: string) => { setFlash(k); setTimeout(() => setFlash(f => (f === k ? null : f)), 2000) }

  // ── 저장 목록 로드 ──
  useEffect(() => {
    try { setSaved(parseSaved(localStorage.getItem(SAVE_KEY))) } catch { /* 저장소 차단 */ }
  }, [])
  const persist = (list: SavedSig[]) => {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(list))
      setSaved(list)
      return true
    } catch {
      showFlash('saveFailed')
      return false
    }
  }

  // ── 캔버스 렌더 (DPR 반영) ──
  const render = useCallback(() => {
    const c = canvasRef.current
    const ctx = c?.getContext('2d')
    if (!c || !ctx) return
    const dpr = window.devicePixelRatio || 1
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, c.width / dpr, c.height / dpr)
    drawStrokes(ctx, liveRef.current ? [...strokesRef.current, liveRef.current] : strokesRef.current)
  }, [])
  const schedule = useCallback(() => {
    cancelAnimationFrame(rafRef.current)
    rafRef.current = requestAnimationFrame(render)
  }, [render])

  useEffect(() => {
    if (mode !== 'draw') return
    const c = canvasRef.current
    if (!c) return
    const fit = () => {
      const r = c.getBoundingClientRect()
      const dpr = window.devicePixelRatio || 1
      c.width = Math.round(r.width * dpr)
      c.height = Math.round(r.height * dpr)
      render()
    }
    fit()
    const ro = new ResizeObserver(fit)
    ro.observe(c)
    return () => ro.disconnect()
  }, [mode, render])
  useEffect(() => { render() }, [strokes, render])

  // ── 기록 (되돌리기/다시하기) ──
  const commit = useCallback((next: Stroke[]) => setHist(h => ({ past: [...h.past, h.cur], cur: next, future: [] })), [])
  const undo = useCallback(() => setHist(h => (h.past.length ? { past: h.past.slice(0, -1), cur: h.past[h.past.length - 1], future: [h.cur, ...h.future] } : h)), [])
  const redo = useCallback(() => setHist(h => (h.future.length ? { past: [...h.past, h.cur], cur: h.future[0], future: h.future.slice(1) } : h)), [])
  const clear = () => { if (strokes.length) commit([]) }

  useEffect(() => {
    if (mode !== 'draw') return
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement
      if (!(e.ctrlKey || e.metaKey) || el.closest('input, textarea, select, [contenteditable]')) return
      const k = e.key.toLowerCase()
      if (k === 'z' && !e.shiftKey) { e.preventDefault(); undo() }
      else if (k === 'y' || (k === 'z' && e.shiftKey)) { e.preventDefault(); redo() }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [mode, undo, redo])

  // ── 포인터 (마우스·터치·펜 공통) ──
  const toPt = (e: PointerEvent, r: DOMRect): Pt => ({
    x: e.clientX - r.left, y: e.clientY - r.top, t: e.timeStamp,
    p: e.pointerType === 'pen' ? e.pressure : undefined,
  })
  const onDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return
    e.preventDefault()
    e.currentTarget.setPointerCapture(e.pointerId)
    liveRef.current = { pts: [toPt(e.nativeEvent, e.currentTarget.getBoundingClientRect())], color: ink, size }
    setDrawing(true)
    schedule()
  }
  const onMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const live = liveRef.current
    if (!live) return
    e.preventDefault()
    const r = e.currentTarget.getBoundingClientRect()
    const evs = e.nativeEvent.getCoalescedEvents?.() ?? []
    for (const ev of evs.length ? evs : [e.nativeEvent]) live.pts.push(toPt(ev, r))
    schedule()
  }
  const onUp = () => {
    const live = liveRef.current
    if (!live) return
    liveRef.current = null
    setDrawing(false)
    commit([...strokesRef.current, live])
  }

  // ── 이름 서명: 폰트 로드 (Google Fonts text= 서브셋, 이름이 바뀌면 교체) ──
  useEffect(() => {
    const id = setTimeout(() => setDebName(name), 350)
    return () => clearTimeout(id)
  }, [name])
  useEffect(() => {
    if (mode !== 'type') return
    const sample = debName.trim() || 'Signature'
    for (const f of fontList) {
      let link = document.querySelector<HTMLLinkElement>(`link[data-sig="${f.family}"]`)
      if (!link) {
        link = document.createElement('link')
        link.rel = 'stylesheet'
        link.dataset.sig = f.family
        document.head.appendChild(link)
      }
      const href = googleCssUrl(f.family, [], sample)
      if (link.href !== href) link.href = href
    }
    // fontList는 debName·koName에서 파생 → 이 둘로 충분
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, debName])

  // ── 원본(투명) 캔버스 생성: 배율 적용 ──
  const source = useCallback(async (k: number): Promise<HTMLCanvasElement | null> => {
    const c = document.createElement('canvas')
    const ctx = c.getContext('2d')
    if (!ctx) return null
    if (mode === 'draw') {
      const cv = canvasRef.current
      if (!cv || !strokes.length) return null
      const r = cv.getBoundingClientRect()
      c.width = Math.ceil(r.width * k)
      c.height = Math.ceil(r.height * k)
      ctx.scale(k, k)
      drawStrokes(ctx, strokes)
      return c
    }
    if (!text) return null
    const px = fontSize * font.scale * k
    const css = fontCss(font, px)
    try { await document.fonts.load(css, text) } catch { /* 폴백 폰트로 진행 */ }
    const sp = spacing * k
    const measure = () => {
      ctx.font = css
      // 구형 Safari/Firefox엔 ctx.letterSpacing이 없음 → 글자별 수동 배치
      const canLs = typeof (ctx as { letterSpacing?: unknown }).letterSpacing === 'string'
      if (canLs) ctx.letterSpacing = `${sp}px`
      return canLs || !sp
        ? { w: ctx.measureText(text).width, manual: false }
        : { w: Array.from(text).reduce((a, ch) => a + ctx.measureText(ch).width + sp, 0), manual: true }
    }
    const { w } = measure()
    const skew = Math.tan((slant * Math.PI) / 180)
    const base = px * 2 // 기준선 위 여유(필기체 장식)
    c.width = Math.ceil(Math.abs(w) + px * 2 + Math.abs(skew) * px * 3)
    c.height = Math.ceil(px * 3)
    const { manual } = measure() // 크기 변경으로 상태가 초기화되므로 다시 설정
    ctx.fillStyle = ink
    ctx.textBaseline = 'alphabetic'
    // 오른쪽으로 기울이기: x' = x - tan·y, 기준선이 제자리에 오도록 보정
    ctx.setTransform(1, 0, -skew, 1, px + Math.max(0, skew) * base, 0)
    if (!manual) ctx.fillText(text, 0, base)
    else {
      let x = 0
      for (const ch of Array.from(text)) { ctx.fillText(ch, x, base); x += ctx.measureText(ch).width + sp }
    }
    return c
  }, [mode, strokes, text, font, fontSize, spacing, slant, ink])

  const output = useCallback(async (k: number, white: boolean) => {
    const src = await source(k)
    return src ? trim(src, Math.round(PAD * k), white) : null
  }, [source])

  // ── 미리보기 (문서 모의 화면) ──
  useEffect(() => {
    if (drawing) return
    let dead = false
    const id = setTimeout(async () => {
      const c = await output(2, false)
      if (!dead) setPreview(c ? { url: c.toDataURL('image/png'), w: c.width / 2, h: c.height / 2 } : null)
    }, mode === 'type' ? 250 : 0)
    return () => { dead = true; clearTimeout(id) }
  }, [output, drawing, mode, debName])

  const empty = mode === 'draw' ? !strokes.length : !text
  const effFmt: Fmt = mode === 'type' && fmt === 'svg' ? 'png' : fmt

  const download = async () => {
    if (effFmt === 'svg') {
      const svg = strokesSvg(strokes, PAD)
      if (svg) downloadBlob(new Blob([svg], { type: 'image/svg+xml' }), `signature-${stamp()}.svg`)
      return
    }
    const c = await output(scale, effFmt === 'jpg')
    if (!c) return
    downloadBlob(await toBlob(c, effFmt === 'jpg' ? 'image/jpeg' : 'image/png'), `signature-${stamp()}@${scale}x.${effFmt}`)
  }

  const copyBlob = async (blob: Promise<Blob>) => {
    try {
      if (!navigator.clipboard?.write || typeof ClipboardItem === 'undefined') throw new Error('unsupported')
      // Safari: 사용자 제스처 안에서 Promise째 넘겨야 함
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })])
      showFlash('copied')
    } catch {
      showFlash('copyFailed')
    }
  }
  const copy = () => copyBlob(output(scale, false).then(c => (c ? toBlob(c, 'image/png') : Promise.reject(new Error('empty')))))

  const save = async () => {
    if (saved.length >= SAVED_MAX) return
    const c = await output(2, false)
    if (!c) return
    const item: SavedSig = {
      id: `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
      png: c.toDataURL('image/png'),
      svg: mode === 'draw' ? strokesSvg(strokes, PAD) ?? undefined : undefined,
      at: Date.now(),
    }
    if (persist([item, ...saved])) showFlash('saved')
  }
  const remove = (id: string) => persist(saved.filter(s => s.id !== id))

  // ── UI 조각 ──
  const seg = (on: boolean) => `px-3 py-2 rounded-lg text-sm font-medium transition-colors ${on ? 'bg-primary text-white' : 'bg-soft text-body hover:bg-subtle'}`
  const label = 'block text-sm font-medium text-body mb-2'
  const previewStyle = useMemo(() => ({ fontFamily: `'${font.family}', ${font.latin ? 'cursive' : 'sans-serif'}` }), [font])
  const cardStyle = (f: SigFont) => ({
    fontFamily: `'${f.family}', ${f.latin ? 'cursive' : 'sans-serif'}`,
    fontSize: 30 * f.scale,
    letterSpacing: `${spacing / 2}px`,
    transform: `skewX(${-slant}deg)`,
    color: ink,
  })

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-fg">{t('title')}</h1>
        <p className="text-sm text-muted mt-1">{t('description')}</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* ── 편집 영역 ── */}
        <div className="lg:col-span-2 space-y-4">
          <div className="ui-card p-4 sm:p-6 space-y-4">
            <div className="grid grid-cols-2 gap-2" role="tablist">
              {(['draw', 'type'] as Mode[]).map(m => (
                <button key={m} role="tab" aria-selected={mode === m} onClick={() => setMode(m)} className={`${seg(mode === m)} py-3`}>
                  {t(`mode.${m}`)}
                </button>
              ))}
            </div>

            {mode === 'draw' ? (
              <>
                <div className="relative rounded-xl border border-line-strong bg-white overflow-hidden">
                  {/* 서명 기준선 (이미지에는 포함되지 않음) */}
                  <div className="pointer-events-none absolute left-6 right-6 bottom-[28%] border-b border-dashed border-gray-300" />
                  <span className="pointer-events-none absolute left-6 bottom-[29%] text-gray-400 text-sm select-none">×</span>
                  <canvas
                    ref={canvasRef}
                    role="img"
                    aria-label={t('drawHere')}
                    onPointerDown={onDown}
                    onPointerMove={onMove}
                    onPointerUp={onUp}
                    onPointerCancel={onUp}
                    className="relative block w-full h-56 sm:h-72 cursor-crosshair select-none"
                    style={{ touchAction: 'none' }}
                  />
                  {!strokes.length && !drawing && (
                    <p className="pointer-events-none absolute inset-x-0 top-6 text-center text-sm text-gray-400">{t('drawHere')}</p>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  <button onClick={undo} disabled={!hist.past.length} className="ui-btn-soft px-3 py-2 inline-flex items-center gap-1.5 text-sm disabled:opacity-40" title="Ctrl+Z">
                    <Undo2 className="w-4 h-4" />{t('undo')}
                  </button>
                  <button onClick={redo} disabled={!hist.future.length} className="ui-btn-soft px-3 py-2 inline-flex items-center gap-1.5 text-sm disabled:opacity-40" title="Ctrl+Shift+Z">
                    <Redo2 className="w-4 h-4" />{t('redo')}
                  </button>
                  <button onClick={clear} disabled={!strokes.length} className="ui-btn-soft px-3 py-2 inline-flex items-center gap-1.5 text-sm disabled:opacity-40 ml-auto">
                    <Eraser className="w-4 h-4" />{t('clear')}
                  </button>
                </div>
              </>
            ) : (
              <>
                <div>
                  <label htmlFor="sig-name" className={label}>{t('type.name')}</label>
                  <input
                    id="sig-name" value={name} maxLength={30} onChange={e => setName(e.target.value)}
                    placeholder={t('type.namePlaceholder')} className="ui-field w-full px-4 py-3 text-lg"
                  />
                </div>
                <div className="rounded-xl border border-line-strong bg-white min-h-40 flex items-center justify-center overflow-hidden px-4 py-6">
                  <span
                    className="whitespace-nowrap"
                    style={{ ...previewStyle, fontSize: fontSize * font.scale, letterSpacing: `${spacing}px`, transform: `skewX(${-slant}deg)`, color: ink }}
                  >
                    {text || <span className="text-gray-400 text-base font-sans">{t('type.namePlaceholder')}</span>}
                  </span>
                </div>
                <div>
                  <p className={label}>{t('type.font')}</p>
                  {koName && <p className="text-xs text-muted mb-2">{t('type.latinHint')}</p>}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-96 overflow-y-auto pr-1">
                    {fontList.map(f => {
                      const on = f.family === font.family
                      return (
                        <button
                          key={f.family}
                          onClick={() => setFontFamily(f.family)}
                          aria-pressed={on}
                          className={`text-left rounded-xl border px-3 py-2 transition-colors ${on ? 'bg-primary-soft border-primary' : 'bg-surface border-line hover:bg-subtle'}`}
                        >
                          <div className="h-14 flex items-center overflow-hidden rounded-lg bg-white px-2">
                            <span className="whitespace-nowrap" style={cardStyle(f)}>{text || 'Signature'}</span>
                          </div>
                          <p className={`mt-1 text-xs truncate ${on ? 'text-primary font-medium' : 'text-muted'}`}>{f.label}</p>
                        </button>
                      )
                    })}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* ── 문서 모의 미리보기 ── */}
          <div className="ui-card p-4 sm:p-6">
            <h2 className="text-base font-semibold text-fg mb-3">{t('mock.title')}</h2>
            <div className="rounded-xl border border-line bg-white text-gray-800 p-5 sm:p-8 text-sm leading-relaxed">
              <p className="font-semibold text-gray-900 mb-2">{t('mock.docTitle')}</p>
              <p className="text-gray-600">{t('mock.docBody')}</p>
              <div className="mt-8 flex items-end justify-end gap-2">
                <span className="pb-1 shrink-0">{t('mock.signLabel')}</span>
                <div className="relative w-56 sm:w-64 h-20 border-b border-gray-800">
                  {preview && (
                    <img
                      src={preview.url} alt={t('mock.alt')}
                      className="absolute left-1/2 -translate-x-1/2 bottom-[-10px] max-w-full object-contain"
                      style={{ height: Math.min(preview.h * 0.6, 88), width: 'auto' }}
                    />
                  )}
                </div>
              </div>
            </div>
            <p className="text-xs text-muted mt-2">{t('mock.note')}</p>
          </div>
        </div>

        {/* ── 설정 + 내보내기 ── */}
        <div className="space-y-4">
          <div className="ui-card p-4 sm:p-6 space-y-5">
            <div>
              <p className={label}>{t('penColor')}</p>
              <div className="flex items-center gap-2">
                {INKS.map(c => (
                  <button key={c.id} onClick={() => setInk(c.v)} aria-pressed={ink === c.v} className={`${seg(ink === c.v)} inline-flex items-center gap-2`}>
                    <span className="w-3.5 h-3.5 rounded-full border border-white/60" style={{ background: c.v }} />
                    {t(`ink.${c.id}`)}
                  </button>
                ))}
                <label className={`${seg(!INKS.some(c => c.v === ink))} inline-flex items-center gap-2 cursor-pointer`}>
                  <input type="color" value={ink} onChange={e => setInk(e.target.value)} className="w-5 h-5 rounded border-0 p-0 bg-transparent cursor-pointer" />
                  {t('ink.custom')}
                </label>
              </div>
            </div>

            {mode === 'draw' ? (
              <div>
                <label htmlFor="sig-size" className={label}>{t('penSize')} <span className="text-muted tabular-nums">{size}px</span></label>
                <input id="sig-size" type="range" min={1} max={8} step={0.5} value={size} onChange={e => setSize(Number(e.target.value))} className="w-full accent-primary" />
                <p className="text-xs text-muted mt-1">{t('penHint')}</p>
              </div>
            ) : (
              <>
                <div>
                  <label htmlFor="sig-fs" className={label}>{t('type.size')} <span className="text-muted tabular-nums">{fontSize}px</span></label>
                  <input id="sig-fs" type="range" min={32} max={120} value={fontSize} onChange={e => setFontSize(Number(e.target.value))} className="w-full accent-primary" />
                </div>
                <div>
                  <label htmlFor="sig-slant" className={label}>{t('type.slant')} <span className="text-muted tabular-nums">{slant}°</span></label>
                  <input id="sig-slant" type="range" min={-20} max={25} value={slant} onChange={e => setSlant(Number(e.target.value))} className="w-full accent-primary" />
                </div>
                <div>
                  <label htmlFor="sig-sp" className={label}>{t('type.spacing')} <span className="text-muted tabular-nums">{spacing}px</span></label>
                  <input id="sig-sp" type="range" min={-6} max={20} value={spacing} onChange={e => setSpacing(Number(e.target.value))} className="w-full accent-primary" />
                </div>
              </>
            )}
          </div>

          <div className="ui-card p-4 sm:p-6 space-y-4">
            <h2 className="text-base font-semibold text-fg">{t('export.title')}</h2>
            <div>
              <p className={label}>{t('export.format')}</p>
              <div className="grid grid-cols-3 gap-2">
                {(['png', 'jpg', 'svg'] as Fmt[]).map(f => (
                  <button key={f} onClick={() => setFmt(f)} disabled={f === 'svg' && mode === 'type'} aria-pressed={effFmt === f} className={`${seg(effFmt === f)} disabled:opacity-40`}>
                    {t(`export.${f}`)}
                  </button>
                ))}
              </div>
              <p className="text-xs text-muted mt-1.5">{t(`export.${effFmt}Hint`)}</p>
              {mode === 'type' && <p className="text-xs text-muted mt-1">{t('export.svgTypeNote')}</p>}
            </div>
            {effFmt !== 'svg' && (
              <div>
                <p className={label}>{t('export.scale')}</p>
                <div className="grid grid-cols-3 gap-2">
                  {[1, 2, 3].map(k => (
                    <button key={k} onClick={() => setScale(k)} aria-pressed={scale === k} className={seg(scale === k)}>{k}x</button>
                  ))}
                </div>
              </div>
            )}
            <button onClick={download} disabled={empty} className="ui-btn w-full px-4 py-3 inline-flex items-center justify-center gap-2 disabled:opacity-40">
              <Download className="w-5 h-5" />{t('export.download', { fmt: effFmt.toUpperCase() })}
            </button>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={copy} disabled={empty} className="ui-btn-soft px-3 py-2.5 inline-flex items-center justify-center gap-1.5 text-sm disabled:opacity-40">
                {flash === 'copied' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {flash === 'copied' ? t('copied') : t('copy')}
              </button>
              <button onClick={save} disabled={empty || saved.length >= SAVED_MAX} className="ui-btn-soft px-3 py-2.5 inline-flex items-center justify-center gap-1.5 text-sm disabled:opacity-40">
                {flash === 'saved' ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
                {flash === 'saved' ? t('saved.done') : t('saved.save')}
              </button>
            </div>
            {flash === 'copyFailed' && <p className="text-xs text-red-600" role="alert">{t('copyFailed')}</p>}
            {flash === 'saveFailed' && <p className="text-xs text-red-600" role="alert">{t('saved.failed')}</p>}
            {saved.length >= SAVED_MAX && <p className="text-xs text-muted">{t('saved.full', { max: SAVED_MAX })}</p>}
          </div>

          <div className="ui-card p-4 sm:p-6">
            <h2 className="text-base font-semibold text-fg mb-3">
              {t('saved.title')} <span className="text-muted tabular-nums text-sm font-normal">{saved.length}/{SAVED_MAX}</span>
            </h2>
            {saved.length === 0 ? (
              <p className="text-sm text-muted">{t('saved.empty')}</p>
            ) : (
              <ul className="space-y-2">
                {saved.map(s => (
                  <li key={s.id} className="rounded-xl border border-line p-2">
                    <div className="h-16 rounded-lg bg-white flex items-center justify-center overflow-hidden">
                      <img src={s.png} alt={t('mock.alt')} className="max-h-14 max-w-full object-contain" />
                    </div>
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      <button onClick={() => fetch(s.png).then(r => r.blob()).then(b => downloadBlob(b, `signature-${s.id}.png`))} className="bg-soft hover:bg-subtle text-body rounded-lg px-2.5 py-1.5 text-xs">PNG</button>
                      {s.svg && (
                        <button onClick={() => downloadBlob(new Blob([s.svg!], { type: 'image/svg+xml' }), `signature-${s.id}.svg`)} className="bg-soft hover:bg-subtle text-body rounded-lg px-2.5 py-1.5 text-xs">SVG</button>
                      )}
                      <button onClick={() => copyBlob(fetch(s.png).then(r => r.blob()))} className="bg-soft hover:bg-subtle text-body rounded-lg px-2.5 py-1.5 text-xs">{t('copy')}</button>
                      <button onClick={() => remove(s.id)} aria-label={t('saved.delete')} className="ml-auto bg-soft hover:bg-subtle text-body rounded-lg px-2 py-1.5">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
            <div className="mt-4 bg-subtle rounded-xl p-3 text-xs text-sub flex gap-2">
              <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{t('privacy')}</span>
            </div>
          </div>
        </div>
      </div>

      <GuideSection namespace="signatureGenerator" />
    </div>
  )
}
