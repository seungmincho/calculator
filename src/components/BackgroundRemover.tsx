'use client'

import { useState, useRef, useCallback, useEffect, useMemo } from 'react'
import { useTranslations } from '@/lib/i18n'
import { Upload, Download, Pipette, Eraser, Paintbrush, Undo2, Redo2, X, ClipboardPaste, ImagePlus, RotateCcw } from 'lucide-react'
import GuideSection from '@/components/GuideSection'
import {
  type RGB, type Mode, MASK_ERASE, MASK_KEEP,
  fitSize, detectBorderColors, distanceMap, computeAlpha, applyMask, composite, paintMask, scaleMask, toHex, fromHex,
} from '@/utils/bgRemove'

// ponytail: 메인 스레드 처리. 미리보기는 150만 화소로 줄여 슬라이더를 실시간으로, 저장은 1250만 화소까지 다시 계산.
const PREVIEW_MAX = 1_500_000
const EXPORT_MAX = 12_500_000 // 4032×3024 폰 사진은 원본 그대로
const MAX_COLORS = 6
const HISTORY_MAX = 30

interface BgColor { rgb: RGB; seed: [number, number] | null } // seed = 클릭 위치(0~1), flood 시작점
interface Snap { colors: BgColor[]; mask: Uint8Array | null }
interface Src { img: HTMLImageElement; url: string; name: string; natW: number; natH: number; w: number; h: number; data: Uint8ClampedArray }
type Tool = 'pick' | 'erase' | 'keep'

const BG_PRESETS: { key: string; value: string }[] = [
  { key: 'bgTransparent', value: 'transparent' },
  { key: 'bgWhite', value: '#ffffff' },
  { key: 'bgGray', value: '#f2f4f6' },
  { key: 'bgSky', value: '#dcebfa' },
  { key: 'bgBlue', value: '#3d7cc9' },
]

const CHECKER = {
  backgroundImage:
    'linear-gradient(45deg, #d1d5db 25%, transparent 25%), linear-gradient(-45deg, #d1d5db 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #d1d5db 75%), linear-gradient(-45deg, transparent 75%, #d1d5db 75%)',
  backgroundSize: '16px 16px',
  backgroundPosition: '0 0, 0 8px, 8px -8px, -8px 0',
  backgroundColor: '#ffffff',
}

const isTypingTarget = (el: EventTarget | null) => {
  const e = el as HTMLElement | null
  if (!e) return false
  return e.isContentEditable || e.tagName === 'TEXTAREA' || e.tagName === 'SELECT' ||
    (e.tagName === 'INPUT' && (e as HTMLInputElement).type !== 'range')
}

const seedIndices = (colors: BgColor[], w: number, h: number) =>
  colors.filter((c) => c.seed).map((c) => Math.min(h - 1, Math.floor(c.seed![1] * h)) * w + Math.min(w - 1, Math.floor(c.seed![0] * w)))

export default function BackgroundRemover() {
  const t = useTranslations('backgroundRemover')

  const [src, setSrc] = useState<Src | null>(null)
  const [border, setBorder] = useState<{ colors: RGB[]; share: number }>({ colors: [], share: 1 })
  const [colors, setColors] = useState<BgColor[]>([])
  const [mask, setMask] = useState<Uint8Array | null>(null)
  const [mode, setMode] = useState<Mode>('flood')
  const [tolerance, setTolerance] = useState(15)
  const [softness, setSoftness] = useState(12)
  const [defringe, setDefringe] = useState(true)
  const [tool, setTool] = useState<Tool>('pick')
  const [brush, setBrush] = useState(30)
  const [view, setView] = useState<'result' | 'original'>('result')
  const [bg, setBg] = useState('transparent')
  const [format, setFormat] = useState<'png' | 'jpg'>('png')
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const [cursor, setCursor] = useState<{ x: number; y: number; d: number } | null>(null)
  const [, setHistoryVersion] = useState(0)

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const pastRef = useRef<Snap[]>([])
  const futureRef = useRef<Snap[]>([])
  const curRef = useRef<Snap>({ colors: [], mask: null })
  curRef.current = { colors, mask }
  const strokeRef = useRef<{ mask: Uint8Array; x: number; y: number; r: number; value: number } | null>(null)
  const rafRef = useRef(0)
  const urlRef = useRef<string | null>(null)

  const flash = useCallback((msg: string) => {
    setNotice(msg)
    setTimeout(() => setNotice((m) => (m === msg ? null : m)), 3000)
  }, [])

  // ── 픽셀 계산 (색이 바뀔 때만 거리 재계산, 슬라이더는 알파만) ──
  const dm = useMemo(
    () => (src ? distanceMap(src.data, src.w * src.h, colors.map((c) => c.rgb)) : null),
    [src, colors],
  )
  const baseAlpha = useMemo(
    () => (src && dm ? computeAlpha(dm.dist, src.w, src.h, tolerance, softness, mode, seedIndices(colors, src.w, src.h)) : null),
    [src, dm, tolerance, softness, mode, colors],
  )
  const removedPct = useMemo(() => {
    if (!baseAlpha) return 0
    const a = applyMask(baseAlpha, mask)
    let z = 0
    for (let i = 0; i < a.length; i++) if (a[i] < 128) z++
    return Math.round((z / a.length) * 100)
  }, [baseAlpha, mask])

  const render = useCallback((liveMask?: Uint8Array) => {
    const canvas = canvasRef.current
    if (!canvas || !src) return
    if (canvas.width !== src.w || canvas.height !== src.h) { canvas.width = src.w; canvas.height = src.h }
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    if (view === 'original' || !baseAlpha || !dm) {
      ctx.putImageData(new ImageData(new Uint8ClampedArray(src.data), src.w, src.h), 0, 0)
      return
    }
    const out = composite(src.data, applyMask(baseAlpha, liveMask ?? mask), dm.nearest, colors.map((c) => c.rgb), defringe, null)
    ctx.putImageData(new ImageData(out as Uint8ClampedArray<ArrayBuffer>, src.w, src.h), 0, 0)
  }, [src, view, baseAlpha, dm, mask, colors, defringe])

  useEffect(() => { render() }, [render])

  // ── 히스토리 ──
  const commit = useCallback((next: Snap) => {
    pastRef.current = [...pastRef.current, curRef.current].slice(-HISTORY_MAX)
    futureRef.current = []
    setColors(next.colors)
    setMask(next.mask)
    setHistoryVersion((v) => v + 1)
  }, [])
  const undo = useCallback(() => {
    const prev = pastRef.current.pop()
    if (!prev) return
    futureRef.current.push(curRef.current)
    setColors(prev.colors); setMask(prev.mask); setHistoryVersion((v) => v + 1)
  }, [])
  const redo = useCallback(() => {
    const next = futureRef.current.pop()
    if (!next) return
    pastRef.current.push(curRef.current)
    setColors(next.colors); setMask(next.mask); setHistoryVersion((v) => v + 1)
  }, [])

  // ── 불러오기 (파일 / 드롭 / 붙여넣기) ──
  const loadFile = useCallback((file: Blob, name: string) => {
    if (!file.type.startsWith('image/')) { flash(t('loadFailed')); return }
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      const natW = img.naturalWidth, natH = img.naturalHeight
      const { w, h } = fitSize(natW, natH, PREVIEW_MAX)
      const c = document.createElement('canvas')
      c.width = w; c.height = h
      const ctx = c.getContext('2d', { willReadFrequently: true })
      if (!ctx) { URL.revokeObjectURL(url); return }
      ctx.drawImage(img, 0, 0, w, h)
      const data = ctx.getImageData(0, 0, w, h).data
      if (urlRef.current) URL.revokeObjectURL(urlRef.current) // 이전 이미지 URL 정리 (현재 것은 저장 때 원본 해상도로 다시 그리려고 유지)
      urlRef.current = url
      const det = detectBorderColors(data, w, h)
      setBorder(det)
      pastRef.current = []
      futureRef.current = []
      setColors(det.colors.map((rgb) => ({ rgb, seed: null })))
      setMask(null)
      setView('result')
      setTool('pick')
      setSrc({ img, url, name: name.replace(/\.[^.]+$/, '') || 'image', natW, natH, w, h, data })
    }
    img.onerror = () => { URL.revokeObjectURL(url); flash(t('loadFailed')) }
    img.src = url
  }, [flash, t])

  useEffect(() => () => { if (urlRef.current) URL.revokeObjectURL(urlRef.current) }, [])

  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      if (isTypingTarget(e.target)) return
      const file = Array.from(e.clipboardData?.items ?? []).find((i) => i.type.startsWith('image/'))?.getAsFile()
      if (!file) return
      e.preventDefault()
      loadFile(file, 'pasted')
    }
    window.addEventListener('paste', onPaste)
    return () => window.removeEventListener('paste', onPaste)
  }, [loadFile])

  const pasteFromClipboard = useCallback(async () => {
    try {
      for (const item of await navigator.clipboard.read()) {
        const type = item.types.find((ty) => ty.startsWith('image/'))
        if (type) { loadFile(await item.getType(type), 'pasted'); return }
      }
      flash(t('pasteFailed'))
    } catch {
      flash(t('pasteFailed'))
    }
  }, [flash, loadFile, t])

  useEffect(() => {
    if (!src) return
    const onKey = (e: KeyboardEvent) => {
      if (isTypingTarget(e.target) || !(e.ctrlKey || e.metaKey)) return
      const k = e.key.toLowerCase()
      if (k === 'z' && !e.shiftKey) { e.preventDefault(); undo() }
      else if ((k === 'z' && e.shiftKey) || k === 'y') { e.preventDefault(); redo() }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [src, undo, redo])

  // ── 캔버스 포인터 (스포이트 / 브러시) ──
  const toImage = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const sx = src!.w / rect.width
    return { x: (e.clientX - rect.left) * sx, y: (e.clientY - rect.top) * sx, scale: sx }
  }

  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!src) return
    const { x, y, scale } = toImage(e)
    if (tool === 'pick') {
      const px = Math.min(src.w - 1, Math.max(0, Math.floor(x))), py = Math.min(src.h - 1, Math.max(0, Math.floor(y)))
      const i = (py * src.w + px) * 4
      const rgb: RGB = [src.data[i], src.data[i + 1], src.data[i + 2]]
      commit({ colors: [...colors, { rgb, seed: [(px + 0.5) / src.w, (py + 0.5) / src.h] as [number, number] }].slice(-MAX_COLORS), mask })
      return
    }
    if (view === 'original') setView('result')
    e.currentTarget.setPointerCapture(e.pointerId)
    const m = mask ? mask.slice() : new Uint8Array(src.w * src.h)
    const r = (brush / 2) * scale
    const value = tool === 'erase' ? MASK_ERASE : MASK_KEEP
    paintMask(m, src.w, src.h, x, y, x, y, r, value)
    strokeRef.current = { mask: m, x, y, r, value }
    render(m)
  }

  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!src) return
    if (tool !== 'pick' && e.pointerType !== 'touch') setCursor({ x: e.clientX, y: e.clientY, d: brush })
    const s = strokeRef.current
    if (!s) return
    const { x, y } = toImage(e)
    paintMask(s.mask, src.w, src.h, s.x, s.y, x, y, s.r, s.value)
    s.x = x; s.y = y
    cancelAnimationFrame(rafRef.current)
    rafRef.current = requestAnimationFrame(() => render(s.mask))
  }

  const endStroke = () => {
    const s = strokeRef.current
    if (!s) return
    strokeRef.current = null
    cancelAnimationFrame(rafRef.current)
    commit({ colors, mask: s.mask })
  }

  // ── 저장 (원본 해상도로 다시 계산) ──
  const handleDownload = useCallback(async () => {
    if (!src || !baseAlpha || !dm) return
    setBusy(true)
    await new Promise((r) => setTimeout(r, 30))
    try {
      const { w: W, h: H } = fitSize(src.natW, src.natH, EXPORT_MAX)
      const rgbs = colors.map((c) => c.rgb)
      let data: Uint8ClampedArray = src.data, alpha: Uint8Array, nearest = dm.nearest
      const canvas = document.createElement('canvas')
      canvas.width = W; canvas.height = H
      const ctx = canvas.getContext('2d', { willReadFrequently: true })
      if (!ctx) throw new Error('no ctx')
      if (W === src.w && H === src.h) {
        alpha = applyMask(baseAlpha, mask)
      } else {
        ctx.drawImage(src.img, 0, 0, W, H)
        data = ctx.getImageData(0, 0, W, H).data
        const full = distanceMap(data, W * H, rgbs)
        nearest = full.nearest
        alpha = applyMask(
          computeAlpha(full.dist, W, H, tolerance, softness, mode, seedIndices(colors, W, H)),
          mask ? scaleMask(mask, src.w, src.h, W, H) : null,
        )
      }
      const fill = bg !== 'transparent' ? fromHex(bg) : format === 'jpg' ? ([255, 255, 255] as RGB) : null
      const out = composite(data, alpha, nearest, rgbs, defringe, fill)
      ctx.putImageData(new ImageData(out as Uint8ClampedArray<ArrayBuffer>, W, H), 0, 0)
      const type = format === 'jpg' ? 'image/jpeg' : 'image/png'
      const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, type, 0.92))
      if (!blob) throw new Error('no blob')
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${src.name}${format === 'jpg' ? '_bg.jpg' : bg === 'transparent' ? '_no-bg.png' : '_bg.png'}`
      a.click()
      setTimeout(() => URL.revokeObjectURL(url), 1000)
    } catch {
      flash(t('exportFailed'))
    } finally {
      setBusy(false)
    }
  }, [src, baseAlpha, dm, colors, mask, tolerance, softness, mode, bg, format, defringe, flash, t])

  const resetAll = () => {
    if (urlRef.current) URL.revokeObjectURL(urlRef.current)
    urlRef.current = null
    setSrc(null)
    setColors([])
    setMask(null)
    pastRef.current = []
    futureRef.current = []
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const exportSize = src ? fitSize(src.natW, src.natH, EXPORT_MAX) : null
  const segBtn = (active: boolean) =>
    `flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${active ? 'bg-primary text-white' : 'text-body hover:bg-soft'}`
  const chipBtn = (active: boolean) =>
    `px-3 py-1.5 rounded-full text-sm border transition-colors ${active ? 'bg-primary-soft text-primary border-primary' : 'border-line text-body hover:bg-soft'}`

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-fg">{t('title')}</h1>
        <p className="text-sm text-muted mt-1">{t('description')}</p>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) loadFile(f, f.name); e.target.value = '' }}
      />

      {notice && (
        <div role="status" className="rounded-xl bg-amber-50 text-amber-800 px-4 py-3 text-sm">{notice}</div>
      )}

      {!src && (
        <div className="space-y-4">
          <div
            onDrop={(e) => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) loadFile(f, f.name) }}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            className={`ui-card border-2 border-dashed p-8 sm:p-12 text-center transition-colors ${dragOver ? 'border-primary bg-primary-soft' : 'border-line-strong'}`}
          >
            <Upload className="mx-auto h-10 w-10 text-faint mb-3" />
            <p className="text-lg font-semibold text-fg">{t('uploadImage')}</p>
            <p className="text-sm text-muted mt-1">{t('dragDrop')}</p>
            <div className="mt-5 flex flex-wrap justify-center gap-2">
              <button onClick={() => fileInputRef.current?.click()} className="ui-btn px-5 py-3 flex items-center gap-2">
                <ImagePlus className="h-4 w-4" />{t('chooseFile')}
              </button>
              <button onClick={pasteFromClipboard} className="ui-btn-soft px-5 py-3 flex items-center gap-2">
                <ClipboardPaste className="h-4 w-4" />{t('paste')}
              </button>
            </div>
            <p className="text-xs text-faint mt-4">{t('privacy')}</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-subtle rounded-2xl p-5">
              <p className="text-sm font-semibold text-fg mb-2">{t('goodFor')}</p>
              <ul className="space-y-1 text-sm text-sub">
                {(t.raw('goodForItems') as string[]).map((s) => <li key={s}>· {s}</li>)}
              </ul>
            </div>
            <div className="bg-subtle rounded-2xl p-5">
              <p className="text-sm font-semibold text-fg mb-2">{t('notFor')}</p>
              <ul className="space-y-1 text-sm text-sub">
                {(t.raw('notForItems') as string[]).map((s) => <li key={s}>· {s}</li>)}
              </ul>
            </div>
          </div>
        </div>
      )}

      {src && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 작업 영역 */}
          <div className="lg:col-span-2 ui-card p-4 sm:p-5 space-y-3 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex flex-1 min-w-[240px] gap-1 p-1 bg-soft rounded-xl" role="radiogroup" aria-label={t('toolLabel')}>
                {([['pick', Pipette, 'toolPick'], ['erase', Eraser, 'toolErase'], ['keep', Paintbrush, 'toolKeep']] as const).map(([k, Icon, label]) => (
                  <button key={k} role="radio" aria-checked={tool === k} onClick={() => setTool(k)} className={segBtn(tool === k)}>
                    <Icon className="h-4 w-4" />{t(label)}
                  </button>
                ))}
              </div>
              <div className="flex gap-1">
                <button onClick={undo} disabled={!pastRef.current.length} aria-label={t('undo')} title={t('undo')} className="ui-btn-soft p-2.5 disabled:opacity-40">
                  <Undo2 className="h-4 w-4" />
                </button>
                <button onClick={redo} disabled={!futureRef.current.length} aria-label={t('redo')} title={t('redo')} className="ui-btn-soft p-2.5 disabled:opacity-40">
                  <Redo2 className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between gap-2 flex-wrap">
              <p className="text-xs text-muted">{t(tool === 'pick' ? 'hintPick' : tool === 'erase' ? 'hintErase' : 'hintKeep')}</p>
              <div className="flex gap-1 p-1 bg-soft rounded-xl">
                <button onClick={() => setView('result')} className={segBtn(view === 'result') + ' !px-3 !py-1'}>{t('result')}</button>
                <button onClick={() => setView('original')} className={segBtn(view === 'original') + ' !px-3 !py-1'}>{t('original')}</button>
              </div>
            </div>

            <div className="flex justify-center items-center bg-subtle rounded-xl p-2 sm:p-3 min-h-[200px]">
              <canvas
                ref={canvasRef}
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={endStroke}
                onPointerCancel={endStroke}
                onPointerLeave={() => setCursor(null)}
                className={`block max-w-full max-h-[70vh] rounded ${tool === 'pick' ? 'cursor-crosshair' : 'cursor-none'}`}
                style={{ touchAction: 'none', ...(view === 'original' ? {} : bg === 'transparent' ? CHECKER : { backgroundColor: bg }) }}
                aria-label={t('canvasLabel')}
              />
            </div>
            {cursor && tool !== 'pick' && (
              <div
                className="fixed pointer-events-none rounded-full border-2 border-white ring-1 ring-black z-50"
                style={{ left: cursor.x, top: cursor.y, width: cursor.d, height: cursor.d, transform: 'translate(-50%, -50%)' }}
              />
            )}

            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted">
              <span className="tabular-nums">{t('removedStat', { pct: removedPct })}</span>
              <span className="tabular-nums">
                {src.w !== src.natW ? t('previewScaled', { w: src.w, h: src.h, W: exportSize!.w, H: exportSize!.h }) : `${src.w} × ${src.h}`}
              </span>
            </div>
          </div>

          {/* 설정 */}
          <div className="space-y-4 min-w-0">
            <div className="ui-card p-5 space-y-5">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h2 className="text-sm font-semibold text-fg">{t('bgColors')}</h2>
                  <button onClick={() => commit({ colors: border.colors.map((rgb) => ({ rgb, seed: null })), mask: null })} className="text-xs text-primary flex items-center gap-1">
                    <RotateCcw className="h-3 w-3" />{t('autoDetect')}
                  </button>
                </div>
                {colors.length ? (
                  <div className="flex flex-wrap gap-2">
                    {colors.map((c, i) => (
                      <span key={i} className="inline-flex items-center gap-1.5 pl-1 pr-1.5 py-1 rounded-full bg-soft text-xs text-body">
                        <span className="w-5 h-5 rounded-full border border-line-strong" style={{ backgroundColor: toHex(c.rgb) }} />
                        <span className="font-mono">{toHex(c.rgb).toUpperCase()}</span>
                        <button onClick={() => commit({ colors: colors.filter((_, j) => j !== i), mask })} aria-label={t('removeColor')} className="text-faint hover:text-fg">
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted">{t('noColors')}</p>
                )}
                {border.share < 0.6 && (
                  <p className="mt-2 rounded-xl bg-amber-50 text-amber-800 px-3 py-2 text-xs">{t('busyBorder')}</p>
                )}
              </div>

              <div>
                <h2 className="text-sm font-semibold text-fg mb-2">{t('modeLabel')}</h2>
                <div className="flex gap-1 p-1 bg-soft rounded-xl">
                  <button onClick={() => setMode('flood')} className={segBtn(mode === 'flood')}>{t('modeFlood')}</button>
                  <button onClick={() => setMode('global')} className={segBtn(mode === 'global')}>{t('modeGlobal')}</button>
                </div>
                <p className="text-xs text-muted mt-2">{t(mode === 'flood' ? 'modeFloodDesc' : 'modeGlobalDesc')}</p>
              </div>

              <label className="block">
                <span className="flex justify-between text-sm text-body mb-1">
                  {t('tolerance')}<span className="tabular-nums text-fg font-semibold">ΔE {tolerance}</span>
                </span>
                <input type="range" min={1} max={60} value={tolerance} onChange={(e) => setTolerance(Number(e.target.value))} className="w-full accent-[var(--primary)]" />
                <span className="text-xs text-muted">{t('toleranceHint')}</span>
              </label>

              <label className="block">
                <span className="flex justify-between text-sm text-body mb-1">
                  {t('edgeSoftening')}<span className="tabular-nums text-fg font-semibold">{softness}</span>
                </span>
                <input type="range" min={0} max={40} value={softness} onChange={(e) => setSoftness(Number(e.target.value))} className="w-full accent-[var(--primary)]" />
                <span className="text-xs text-muted">{t('softnessHint')}</span>
              </label>

              <label className="flex items-start gap-2 text-sm text-body cursor-pointer">
                <input type="checkbox" checked={defringe} onChange={(e) => setDefringe(e.target.checked)} className="mt-0.5 accent-[var(--primary)]" />
                <span>{t('defringe')}<span className="block text-xs text-muted">{t('defringeHint')}</span></span>
              </label>

              {tool !== 'pick' && (
                <label className="block">
                  <span className="flex justify-between text-sm text-body mb-1">
                    {t('brushSize')}<span className="tabular-nums text-fg font-semibold">{brush}px</span>
                  </span>
                  <input type="range" min={4} max={120} value={brush} onChange={(e) => setBrush(Number(e.target.value))} className="w-full accent-[var(--primary)]" />
                </label>
              )}
              {mask && (
                <button onClick={() => commit({ colors, mask: null })} className="ui-btn-soft w-full px-4 py-2 text-sm">{t('clearBrush')}</button>
              )}
            </div>

            <div className="ui-card p-5 space-y-4">
              <div>
                <h2 className="text-sm font-semibold text-fg mb-2">{t('bgReplace')}</h2>
                <div className="flex flex-wrap gap-2">
                  {BG_PRESETS.map((p) => (
                    <button key={p.value} onClick={() => setBg(p.value)} className={chipBtn(bg === p.value) + ' inline-flex items-center gap-1.5'}>
                      <span className="w-3.5 h-3.5 rounded-full border border-line-strong" style={p.value === 'transparent' ? CHECKER : { backgroundColor: p.value }} />
                      {t(p.key)}
                    </button>
                  ))}
                  <label className={chipBtn(bg !== 'transparent' && !BG_PRESETS.some((p) => p.value === bg)) + ' inline-flex items-center gap-1.5 cursor-pointer'}>
                    <input type="color" value={bg === 'transparent' ? '#ffffff' : bg} onChange={(e) => setBg(e.target.value)} className="w-4 h-4 p-0 border-0 bg-transparent cursor-pointer" aria-label={t('bgCustom')} />
                    {t('bgCustom')}
                  </label>
                </div>
                <p className="text-xs text-muted mt-2">{t('bgHint')}</p>
              </div>

              <div>
                <h2 className="text-sm font-semibold text-fg mb-2">{t('formatLabel')}</h2>
                <div className="flex gap-1 p-1 bg-soft rounded-xl">
                  <button onClick={() => setFormat('png')} className={segBtn(format === 'png')}>PNG</button>
                  <button onClick={() => setFormat('jpg')} className={segBtn(format === 'jpg')}>JPG</button>
                </div>
                {format === 'jpg' && bg === 'transparent' && <p className="text-xs text-muted mt-2">{t('jpgNote')}</p>}
              </div>

              <button onClick={handleDownload} disabled={busy || !baseAlpha} className="ui-btn w-full px-4 py-3 flex items-center justify-center gap-2">
                <Download className="h-4 w-4" />
                {busy ? t('processing') : t(format === 'png' && bg === 'transparent' ? 'download' : 'downloadWithBg')}
              </button>
              {exportSize && (
                <p className="text-xs text-muted text-center tabular-nums">
                  {t('exportSize', { w: exportSize.w, h: exportSize.h })}
                  {exportSize.w !== src.natW && ` · ${t('exportCapped')}`}
                </p>
              )}
              <button onClick={resetAll} className="ui-btn-soft w-full px-4 py-2 text-sm flex items-center justify-center gap-2">
                <ImagePlus className="h-4 w-4" />{t('newImage')}
              </button>
              <p className="text-xs text-faint text-center">{t('privacy')}</p>
            </div>
          </div>
        </div>
      )}

      <GuideSection namespace="backgroundRemover" defaultOpen />
    </div>
  )
}
