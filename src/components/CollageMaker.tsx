'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { useTranslations } from '@/lib/i18n'
import '@/lib/i18n/ns/collageMaker'
import { Upload, Download, Share2, Trash2, Undo2, ImagePlus, RefreshCw, X, Maximize2 } from 'lucide-react'
import { parseRatio } from '@/utils/aspectRatio'
import {
  LAYOUTS, getLayout, layoutForCount, cellRects, hitTest, coverPlacement, panBy, zoomTo,
  canvasSize, isDark, FIT, MAX_ZOOM, type LayoutDef, type Transform,
} from '@/utils/collage'

// ── Types / constants ─────────────────────────────────────────────────────────

interface Photo { id: string; src: string; name: string; t: Transform }
interface Snapshot { photos: Photo[]; layoutId: string }

const RATIOS = [
  { key: 'r1_1', r: 1 },
  { key: 'r4_5', r: 4 / 5 },
  { key: 'r3_4', r: 3 / 4 },
  { key: 'r9_16', r: 9 / 16 },
  { key: 'r16_9', r: 16 / 9 },
  { key: 'r1_3', r: 1 / 3 },
] as const

const BG_SWATCHES = ['#ffffff', '#f2f4f6', '#000000', '#f9e4e4', '#e4ecf9', '#fdf3d8']
const PREVIEW_LONG = 1080 // 미리보기 해상도(긴 변). gap/radius 슬라이더 값의 기준
const EXPORT_LONG = 2160
const PRIMARY = '#3182f6'
const HISTORY_MAX = 30

const uid = () => `${Date.now()}-${Math.random().toString(36).slice(2)}`
const todayISO = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

interface DrawOpts {
  layout: LayoutDef
  photos: Photo[]
  imgs: Map<string, HTMLImageElement>
  previews: Map<string, CanvasImageSource> | null // 미리보기용 축소본 (없으면 원본)
  gap: number
  radius: number
  bg: string
  footerOn: boolean
  caption: string
  date: string // 'YYYY-MM-DD' or ''
  preview: boolean
  selected: number | null
  target: number | null
}

const footerPx = (W: number, H: number, on: boolean) => (on ? Math.round(Math.max(W, H) * 0.08) : 0)

function drawCollage(ctx: CanvasRenderingContext2D, W: number, H: number, o: DrawOpts) {
  const k = Math.max(W, H) / PREVIEW_LONG
  const footer = footerPx(W, H, o.footerOn)
  const rects = cellRects(o.layout, W, H, o.gap * k, footer)

  ctx.fillStyle = o.bg
  ctx.fillRect(0, 0, W, H)

  rects.forEach((r, i) => {
    const photo = o.photos[i]
    const img = photo && o.imgs.get(photo.id)
    ctx.save()
    ctx.beginPath()
    const rad = Math.min(o.radius * k, r.w / 2, r.h / 2)
    if (rad > 0 && ctx.roundRect) ctx.roundRect(r.x, r.y, r.w, r.h, rad)
    else ctx.rect(r.x, r.y, r.w, r.h)
    ctx.clip()
    if (img && img.naturalWidth) {
      const p = coverPlacement(img.naturalWidth, img.naturalHeight, r.w, r.h, photo.t)
      ctx.drawImage(o.previews?.get(photo.id) ?? img, r.x + p.dx, r.y + p.dy, p.dw, p.dh)
    } else if (o.preview) {
      ctx.fillStyle = '#e5e8eb'
      ctx.fillRect(r.x, r.y, r.w, r.h)
      const s = Math.min(r.w, r.h) * 0.12
      ctx.strokeStyle = '#8b95a1'
      ctx.lineWidth = Math.max(2, s / 6)
      ctx.beginPath()
      ctx.moveTo(r.x + r.w / 2 - s, r.y + r.h / 2); ctx.lineTo(r.x + r.w / 2 + s, r.y + r.h / 2)
      ctx.moveTo(r.x + r.w / 2, r.y + r.h / 2 - s); ctx.lineTo(r.x + r.w / 2, r.y + r.h / 2 + s)
      ctx.stroke()
    }
    ctx.restore()
    if (o.preview && (i === o.selected || i === o.target)) {
      ctx.save()
      ctx.strokeStyle = PRIMARY
      ctx.lineWidth = 6 * k
      if (i === o.target) ctx.setLineDash([16 * k, 10 * k])
      ctx.strokeRect(r.x + 3 * k, r.y + 3 * k, r.w - 6 * k, r.h - 6 * k)
      ctx.restore()
    }
  })

  if (footer > 0) {
    const dateTxt = o.date ? o.date.replace(/-/g, '.') : ''
    ctx.fillStyle = isDark(o.bg) ? '#ffffff' : '#191f28'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    const top = H - footer
    const font = (w: number, px: number) => `${w} ${Math.round(px)}px Pretendard, -apple-system, 'Apple SD Gothic Neo', sans-serif`
    const maxW = W * 0.9
    if (o.caption && dateTxt) {
      ctx.font = font(700, footer * 0.3)
      ctx.fillText(o.caption, W / 2, top + footer * 0.4, maxW)
      ctx.font = font(500, footer * 0.18)
      ctx.globalAlpha = 0.7
      ctx.fillText(dateTxt, W / 2, top + footer * 0.72, maxW)
      ctx.globalAlpha = 1
    } else if (o.caption || dateTxt) {
      ctx.font = font(o.caption ? 700 : 500, footer * 0.3)
      ctx.fillText(o.caption || dateTxt, W / 2, top + footer * 0.5, maxW)
    }
  }
  return rects
}

function LayoutThumb({ layout }: { layout: LayoutDef }) {
  const W = 40, H = 40, g = 2
  const rects = cellRects(layout, W, H, g)
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-9 h-9" aria-hidden="true">
      {rects.map((r, i) => <rect key={i} x={r.x} y={r.y} width={r.w} height={r.h} rx={1.5} className="fill-current" />)}
    </svg>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function CollageMaker() {
  const t = useTranslations('collageMaker')

  const [photos, setPhotos] = useState<Photo[]>([])
  const [layoutId, setLayoutId] = useState('g4')
  const [layoutManual, setLayoutManual] = useState(false)
  const [ratioKey, setRatioKey] = useState<string>('r1_1')
  const [customRatio, setCustomRatio] = useState('3:2')
  const [gap, setGap] = useState(12)
  const [radius, setRadius] = useState(0)
  const [bg, setBg] = useState('#ffffff')
  const [footerOn, setFooterOn] = useState(false)
  const [caption, setCaption] = useState('')
  const [showDate, setShowDate] = useState(true)
  const [date, setDate] = useState('')
  const [format, setFormat] = useState<'png' | 'jpg'>('jpg')
  const [selected, setSelected] = useState<number | null>(null)
  const [target, setTarget] = useState<number | null>(null)
  const [history, setHistory] = useState<Snapshot[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const [busy, setBusy] = useState(false)
  const [canShareFiles, setCanShareFiles] = useState(false)
  const [, setImgTick] = useState(0)

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const replaceSlot = useRef<number | null>(null)
  const imgs = useRef(new Map<string, HTMLImageElement>())
  const previews = useRef(new Map<string, CanvasImageSource>())
  const allUrls = useRef<string[]>([])
  const rectsRef = useRef<ReturnType<typeof cellRects>>([])

  const layout = getLayout(layoutId)
  const ratio = ratioKey === 'custom'
    ? (parseRatio(customRatio) ?? 1)
    : (RATIOS.find(r => r.key === ratioKey)?.r ?? 1)
  const exportSize = canvasSize(ratio, EXPORT_LONG)

  // 최신 상태를 포인터 핸들러에서 읽기 위한 ref
  const photosRef = useRef(photos)
  photosRef.current = photos
  const layoutRef = useRef(layout)
  layoutRef.current = layout

  useEffect(() => {
    setDate(todayISO())
    const probe = typeof File !== 'undefined' ? new File([''], 'a.png', { type: 'image/png' }) : null
    setCanShareFiles(!!(probe && navigator.canShare?.({ files: [probe] })))
  }, [])

  // 언마운트 시에만 URL 해제 (되돌리기로 복원될 수 있으므로 삭제 시에는 유지)
  // ponytail: 세션 동안 삭제한 사진 메모리도 유지 — 수백 장을 넣었다 뺄 일이 생기면 history 밖 URL만 해제
  useEffect(() => () => { allUrls.current.forEach(u => URL.revokeObjectURL(u)) }, [])

  // ── History ────────────────────────────────────────────────────────────────
  const pushHistory = useCallback(() => {
    setHistory(h => [...h.slice(-(HISTORY_MAX - 1)), { photos: photosRef.current, layoutId: layoutRef.current.id }])
  }, [])

  const historyRef = useRef(history)
  historyRef.current = history
  const undo = useCallback(() => {
    const h = historyRef.current
    if (!h.length) return
    const last = h[h.length - 1]
    setPhotos(last.photos)
    setLayoutId(last.layoutId)
    setSelected(null)
    setHistory(h.slice(0, -1))
  }, [])

  // ── Photo add / replace / remove ───────────────────────────────────────────
  const applyAutoLayout = useCallback((count: number) => {
    if (!layoutManual && count > 0) setLayoutId(layoutForCount(count).id)
  }, [layoutManual])

  const addFiles = useCallback((list: FileList | File[] | null, slot: number | null = null) => {
    const files = Array.from(list ?? []).filter(f => f.type.startsWith('image/'))
    if (!files.length) return
    const created: Photo[] = files.map(f => {
      const src = URL.createObjectURL(f)
      allUrls.current.push(src)
      const p = { id: uid(), src, name: f.name, t: FIT }
      const img = new Image()
      img.onload = () => {
        // 큰 원본(수천 px)을 매 프레임 그리면 모바일에서 끌기가 버벅임 → 미리보기는 축소본
        const s = PREVIEW_LONG * 1.5 / Math.max(img.naturalWidth, img.naturalHeight)
        if (s < 1) {
          const c = document.createElement('canvas')
          c.width = Math.round(img.naturalWidth * s)
          c.height = Math.round(img.naturalHeight * s)
          c.getContext('2d')?.drawImage(img, 0, 0, c.width, c.height)
          previews.current.set(p.id, c)
        }
        setImgTick(n => n + 1)
      }
      img.src = src
      imgs.current.set(p.id, img)
      return p
    })
    const cur = photosRef.current
    let next: Photo[]
    if (slot !== null && slot < cur.length) {
      pushHistory()
      next = [...cur]
      next[slot] = created[0]
      next.push(...created.slice(1))
    } else {
      next = [...cur, ...created]
    }
    setPhotos(next)
    applyAutoLayout(next.length)
  }, [pushHistory, applyAutoLayout])

  const removeAt = useCallback((i: number) => {
    pushHistory()
    const next = photosRef.current.filter((_, j) => j !== i)
    setPhotos(next)
    setSelected(null)
    applyAutoLayout(next.length)
  }, [pushHistory, applyAutoLayout])

  const clearAll = useCallback(() => {
    if (!photosRef.current.length) return
    pushHistory()
    setPhotos([])
    setSelected(null)
    setLayoutManual(false)
  }, [pushHistory])

  const setTransform = useCallback((i: number, fn: (t: Transform) => Transform) => {
    setPhotos(ps => ps.map((p, j) => (j === i ? { ...p, t: fn(p.t) } : p)))
  }, [])

  const openPicker = (slot: number | null) => {
    replaceSlot.current = slot
    fileInputRef.current?.click()
  }

  // ── Paste / keyboard ───────────────────────────────────────────────────────
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const files = Array.from(e.clipboardData?.files ?? []).filter(f => f.type.startsWith('image/'))
      if (files.length) { e.preventDefault(); addFiles(files) }
    }
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && tag !== 'INPUT' && tag !== 'TEXTAREA') {
        e.preventDefault()
        undo()
      }
    }
    document.addEventListener('paste', onPaste)
    document.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('paste', onPaste); document.removeEventListener('keydown', onKey) }
  }, [addFiles, undo])

  // ── Preview render ─────────────────────────────────────────────────────────
  const drawOpts = (preview: boolean): DrawOpts => ({
    layout, photos, imgs: imgs.current, previews: preview ? previews.current : null, gap, radius, bg, footerOn, caption,
    date: showDate ? date : '', preview, selected, target,
  })

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return
    const { w, h } = canvasSize(ratio, PREVIEW_LONG)
    if (canvas.width !== w) canvas.width = w
    if (canvas.height !== h) canvas.height = h
    rectsRef.current = drawCollage(ctx, w, h, drawOpts(true))
  })

  // ── Pointer: pan / pinch / swap / tap ──────────────────────────────────────
  const pointers = useRef(new Map<number, { x: number; y: number }>())
  const gesture = useRef<{
    idx: number; startT: Transform; sx: number; sy: number; lx: number; ly: number
    moved: boolean; swap: boolean; swapTo: number | null; pinch: { d0: number; z0: number } | null
  } | null>(null)

  const toCanvas = (e: { clientX: number; clientY: number }) => {
    const c = canvasRef.current!
    const b = c.getBoundingClientRect()
    return { x: (e.clientX - b.left) * c.width / b.width, y: (e.clientY - b.top) * c.height / b.height }
  }
  const pinchDist = () => {
    const [a, b] = Array.from(pointers.current.values())
    return Math.hypot(a.x - b.x, a.y - b.y)
  }

  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId)
    const p = toCanvas(e)
    pointers.current.set(e.pointerId, p)
    if (pointers.current.size === 1) {
      const idx = hitTest(rectsRef.current, p.x, p.y)
      const photo = photosRef.current[idx]
      gesture.current = { idx, startT: photo?.t ?? FIT, sx: p.x, sy: p.y, lx: p.x, ly: p.y, moved: false, swap: false, swapTo: null, pinch: null }
    } else if (pointers.current.size === 2 && gesture.current && photosRef.current[gesture.current.idx]) {
      const g = gesture.current
      if (g.swap) { g.swap = false; g.swapTo = null; setTarget(null) }
      g.moved = true
      g.pinch = { d0: pinchDist(), z0: photosRef.current[g.idx].t.z }
    }
  }

  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!pointers.current.has(e.pointerId)) return
    const p = toCanvas(e)
    pointers.current.set(e.pointerId, p)
    const g = gesture.current
    if (!g || g.idx < 0) return
    const photo = photosRef.current[g.idx]
    if (!photo) return
    if (g.pinch && pointers.current.size >= 2) {
      const d = pinchDist()
      if (g.pinch.d0 > 0) setTransform(g.idx, tr => zoomTo(tr, g.pinch!.z0 * d / g.pinch!.d0))
      return
    }
    if (!g.moved && Math.hypot(p.x - g.sx, p.y - g.sy) < 6) return
    g.moved = true
    const over = hitTest(rectsRef.current, p.x, p.y)
    if (!g.swap && over !== g.idx && over >= 0 && photosRef.current.length > 1) {
      g.swap = true // 다른 칸으로 끌고 가면 교체 모드 — 이동한 위치는 되돌림
      setTransform(g.idx, () => g.startT)
    }
    if (g.swap) {
      const to = over >= 0 && over !== g.idx ? Math.min(over, photosRef.current.length - 1) : null
      g.swapTo = to !== g.idx ? to : null
      setTarget(g.swapTo)
      return
    }
    const r = rectsRef.current[g.idx]
    const img = imgs.current.get(photo.id)
    if (r && img?.naturalWidth) {
      const dx = p.x - g.lx, dy = p.y - g.ly
      setTransform(g.idx, tr => panBy(tr, dx, dy, img.naturalWidth, img.naturalHeight, r.w, r.h))
    }
    g.lx = p.x; g.ly = p.y
  }

  const onPointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    pointers.current.delete(e.pointerId)
    const g = gesture.current
    if (!g) return
    if (g.pinch) {
      if (pointers.current.size < 2) g.pinch = null
      if (pointers.current.size === 1) {
        // 한 손가락이 남으면 그 위치부터 이어서 이동
        const [rest] = Array.from(pointers.current.values())
        g.lx = rest.x; g.ly = rest.y
      }
      if (pointers.current.size > 0) return
    }
    if (pointers.current.size > 0) return
    gesture.current = null
    setTarget(null)
    if (g.swap) {
      if (g.swapTo !== null) {
        pushHistory()
        const next = [...photosRef.current]
        ;[next[g.idx], next[g.swapTo]] = [next[g.swapTo], next[g.idx]]
        setPhotos(next)
        setSelected(g.swapTo)
      }
      return
    }
    if (g.moved) { setSelected(g.idx >= 0 && photosRef.current[g.idx] ? g.idx : selected); return }
    if (g.idx < 0) setSelected(null)
    else if (photosRef.current[g.idx]) setSelected(g.idx)
    else openPicker(null)
  }

  // 휠 확대 (passive: false 필요 → 직접 등록)
  useEffect(() => {
    const c = canvasRef.current
    if (!c) return
    const onWheel = (e: WheelEvent) => {
      const p = toCanvas(e)
      const idx = hitTest(rectsRef.current, p.x, p.y)
      if (idx < 0 || !photosRef.current[idx]) return
      e.preventDefault()
      setTransform(idx, tr => zoomTo(tr, tr.z * Math.exp(-e.deltaY * 0.0015)))
      setSelected(idx)
    }
    c.addEventListener('wheel', onWheel, { passive: false })
    return () => c.removeEventListener('wheel', onWheel)
  }, [setTransform])

  // ── Export ─────────────────────────────────────────────────────────────────
  const renderBlob = async (): Promise<Blob | null> => {
    const c = document.createElement('canvas')
    c.width = exportSize.w
    c.height = exportSize.h
    const ctx = c.getContext('2d')
    if (!ctx) return null
    await Promise.all(photos.slice(0, layout.n).map(p => imgs.current.get(p.id)?.decode().catch(() => {})))
    drawCollage(ctx, c.width, c.height, drawOpts(false))
    const type = format === 'png' ? 'image/png' : 'image/jpeg'
    return new Promise(res => c.toBlob(res, type, 0.92))
  }
  const fileName = () => `collage-${date || 'image'}.${format}`

  const handleDownload = async () => {
    setBusy(true)
    try {
      const blob = await renderBlob()
      if (!blob) return
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = fileName()
      a.click()
      setTimeout(() => URL.revokeObjectURL(url), 2000)
    } finally { setBusy(false) }
  }

  const handleShare = async () => {
    setBusy(true)
    try {
      const blob = await renderBlob()
      if (!blob) return
      const file = new File([blob], fileName(), { type: blob.type })
      if (navigator.canShare?.({ files: [file] })) await navigator.share({ files: [file] }).catch(() => {})
    } finally { setBusy(false) }
  }

  const applyFourCut = () => {
    setLayoutId('strip4')
    setLayoutManual(true)
    setRatioKey('r1_3')
    setFooterOn(true)
    setBg('#000000')
    setGap(16)
    setRadius(0)
  }

  const resetSettings = () => {
    setLayoutManual(false)
    setLayoutId(photos.length ? layoutForCount(photos.length).id : 'g4')
    setRatioKey('r1_1'); setGap(12); setRadius(0); setBg('#ffffff'); setFooterOn(false); setCaption('')
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  const sel = selected !== null && selected < layout.n ? photos[selected] : undefined
  const overflow = Math.max(0, photos.length - layout.n)
  const chip = (on: boolean) => `px-3 py-2 rounded-xl text-sm font-medium transition-colors ${on ? 'bg-primary text-white' : 'bg-soft text-body hover:bg-subtle'}`
  const sortedLayouts = [...LAYOUTS].sort((a, b) => a.n - b.n)

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
        multiple
        className="hidden"
        onChange={e => { addFiles(e.target.files, replaceSlot.current); replaceSlot.current = null; e.target.value = '' }}
      />

      <div className="grid lg:grid-cols-5 gap-6">
        {/* Preview */}
        <div className="lg:col-span-3 space-y-3 lg:order-2">
          <div
            className={`ui-card p-4 ${isDragging ? 'border-primary' : ''}`}
            onDragOver={e => { e.preventDefault(); setIsDragging(true) }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={e => { e.preventDefault(); setIsDragging(false); addFiles(e.dataTransfer.files) }}
          >
            <div className="flex items-center justify-between gap-2 mb-3">
              <h2 className="font-semibold text-fg">{t('preview')}</h2>
              <div className="flex items-center gap-2">
                <button
                  onClick={undo}
                  disabled={!history.length}
                  className="ui-btn-soft px-3 py-2 text-sm flex items-center gap-1.5 disabled:opacity-40"
                  aria-label={t('undo')}
                >
                  <Undo2 className="h-4 w-4" />{t('undo')}
                </button>
                <button onClick={() => openPicker(null)} className="ui-btn-soft px-3 py-2 text-sm flex items-center gap-1.5">
                  <ImagePlus className="h-4 w-4" />{t('addImages')}
                </button>
              </div>
            </div>

            <div className="bg-subtle rounded-2xl p-3 flex items-center justify-center">
              <canvas
                ref={canvasRef}
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                onPointerCancel={onPointerUp}
                className="block max-w-full h-auto cursor-pointer select-none"
                style={{ maxHeight: '70vh', touchAction: 'none' }}
                aria-label={t('preview')}
              />
            </div>
            <p className="text-xs text-muted mt-2 text-center">
              {photos.length ? t('cellHint') : t('dragDrop')}
            </p>

            {sel && selected !== null && (
              <div className="mt-3 bg-subtle rounded-2xl p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <span className="text-sm text-body shrink-0">{t('zoom')}</span>
                  <input
                    type="range" min={1} max={MAX_ZOOM} step={0.01} value={sel.t.z}
                    onChange={e => setTransform(selected, tr => zoomTo(tr, Number(e.target.value)))}
                    className="flex-1 accent-blue-600" aria-label={t('zoom')}
                  />
                  <span className="text-sm text-sub tabular-nums w-12 text-right">{Math.round(sel.t.z * 100)}%</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button onClick={() => openPicker(selected)} className="ui-btn-soft px-3 py-2 text-sm flex items-center gap-1.5">
                    <RefreshCw className="h-4 w-4" />{t('replace')}
                  </button>
                  <button onClick={() => setTransform(selected, () => FIT)} className="ui-btn-soft px-3 py-2 text-sm flex items-center gap-1.5">
                    <Maximize2 className="h-4 w-4" />{t('resetFit')}
                  </button>
                  <button onClick={() => removeAt(selected)} className="ui-btn-soft px-3 py-2 text-sm flex items-center gap-1.5 text-red-600">
                    <Trash2 className="h-4 w-4" />{t('remove')}
                  </button>
                  <button onClick={() => setSelected(null)} className="ml-auto p-2 text-muted hover:text-fg" aria-label={t('close')}>
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Export */}
          <div className="ui-card p-4 space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm text-body mr-1">{t('format')}</span>
              {(['jpg', 'png'] as const).map(f => (
                <button key={f} onClick={() => setFormat(f)} aria-pressed={format === f} className={chip(format === f)}>
                  {f.toUpperCase()}
                </button>
              ))}
              <span className="text-xs text-muted ml-auto tabular-nums">{t('exportInfo', { w: exportSize.w, h: exportSize.h })}</span>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleDownload}
                disabled={!photos.length || busy}
                className="ui-btn flex-1 px-4 py-3 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <Download className="h-4 w-4" />{busy ? t('generating') : t('download')}
              </button>
              {canShareFiles && (
                <button
                  onClick={handleShare}
                  disabled={!photos.length || busy}
                  className="ui-btn-soft flex-1 px-4 py-3 flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <Share2 className="h-4 w-4" />{t('share')}
                </button>
              )}
            </div>
            <p className="text-xs text-muted">{t('privacy')}</p>
          </div>
        </div>

        {/* Settings */}
        <div className="lg:col-span-2 space-y-4 lg:order-1">
          {!photos.length && (
            <button
              onClick={() => openPicker(null)}
              onDragOver={e => { e.preventDefault(); setIsDragging(true) }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={e => { e.preventDefault(); setIsDragging(false); addFiles(e.dataTransfer.files) }}
              className={`w-full border-2 border-dashed rounded-2xl p-8 text-center transition-colors ${isDragging ? 'border-primary bg-primary-soft' : 'border-line-strong hover:bg-subtle'}`}
            >
              <Upload className="mx-auto h-8 w-8 text-faint mb-2" />
              <p className="text-body font-medium">{t('dragDrop')}</p>
              <p className="text-xs text-muted mt-1">{t('uploadHint')}</p>
            </button>
          )}

          {photos.length > 0 && (
            <div className="ui-card p-5">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-semibold text-fg">{t('photosCount', { n: photos.length })}</h2>
                <button onClick={clearAll} className="text-sm text-muted hover:text-fg">{t('clearAll')}</button>
              </div>
              <div className="grid grid-cols-5 gap-2">
                {photos.map((p, i) => (
                  <div key={p.id} className={`relative aspect-square rounded-lg overflow-hidden bg-soft ${i >= layout.n ? 'opacity-40' : ''} ${i === selected ? 'ring-2 ring-primary' : ''}`}>
                    <button onClick={() => i < layout.n && setSelected(i)} className="block w-full h-full" aria-label={p.name}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={p.src} alt="" className="w-full h-full object-cover" />
                    </button>
                    <span className="absolute left-1 top-1 text-[10px] leading-none px-1 py-0.5 rounded bg-black/60 text-white tabular-nums">{i + 1}</span>
                    <button
                      onClick={() => removeAt(i)}
                      aria-label={t('remove')}
                      className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-0.5"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
                <button onClick={() => openPicker(null)} className="aspect-square rounded-lg border-2 border-dashed border-line-strong flex items-center justify-center text-faint hover:bg-subtle" aria-label={t('addImages')}>
                  <ImagePlus className="h-5 w-5" />
                </button>
              </div>
              {overflow > 0 && <p className="text-xs text-muted mt-2">{t('notInCollage', { n: overflow })}</p>}
            </div>
          )}

          <div className="ui-card p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold text-fg">{t('layout')}</h2>
              <button onClick={applyFourCut} className="ui-btn-soft px-3 py-1.5 text-sm">{t('fourCutPreset')}</button>
            </div>
            <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
              {sortedLayouts.map(l => {
                const on = l.id === layoutId
                return (
                  <button
                    key={l.id}
                    onClick={() => { setLayoutId(l.id); setLayoutManual(true); setSelected(null) }}
                    aria-pressed={on}
                    aria-label={t(`layouts.${l.id}`)}
                    title={t(`layouts.${l.id}`)}
                    className={`flex flex-col items-center gap-1 p-2 rounded-xl border transition-colors ${on ? 'bg-primary-soft text-primary border-primary' : 'border-line text-faint hover:bg-subtle'}`}
                  >
                    <LayoutThumb layout={l} />
                    <span className={`text-[11px] ${on ? 'text-primary' : 'text-sub'}`}>{t('layoutFits', { n: l.n })}</span>
                  </button>
                )
              })}
            </div>
            <p className="text-xs text-muted mt-2">{t(`layouts.${layoutId}`)}{!layoutManual && photos.length > 0 ? ` · ${t('autoLayout')}` : ''}</p>
          </div>

          <div className="ui-card p-5 space-y-5">
            <div>
              <h3 className="text-sm font-medium text-body mb-2">{t('ratio')}</h3>
              <div className="flex flex-wrap gap-2">
                {RATIOS.map(r => (
                  <button key={r.key} onClick={() => setRatioKey(r.key)} aria-pressed={ratioKey === r.key} className={chip(ratioKey === r.key)}>
                    {t(`ratios.${r.key}`)}
                  </button>
                ))}
                <button onClick={() => setRatioKey('custom')} aria-pressed={ratioKey === 'custom'} className={chip(ratioKey === 'custom')}>
                  {t('ratios.custom')}
                </button>
              </div>
              {ratioKey === 'custom' && (
                <input
                  value={customRatio}
                  onChange={e => setCustomRatio(e.target.value)}
                  placeholder={t('customPlaceholder')}
                  aria-label={t('ratios.custom')}
                  className="ui-field px-4 py-2 mt-2 w-full"
                  aria-invalid={parseRatio(customRatio) === null}
                />
              )}
              {ratioKey === 'custom' && parseRatio(customRatio) === null && (
                <p className="text-xs text-red-600 mt-1">{t('customInvalid')}</p>
              )}
            </div>

            <label className="block">
              <span className="flex justify-between text-sm font-medium text-body mb-1">
                {t('spacing')}<span className="text-sub tabular-nums">{gap}</span>
              </span>
              <input type="range" min={0} max={40} value={gap} onChange={e => setGap(Number(e.target.value))} className="w-full accent-blue-600" />
            </label>

            <label className="block">
              <span className="flex justify-between text-sm font-medium text-body mb-1">
                {t('borderRadius')}<span className="text-sub tabular-nums">{radius}</span>
              </span>
              <input type="range" min={0} max={60} value={radius} onChange={e => setRadius(Number(e.target.value))} className="w-full accent-blue-600" />
            </label>

            <div>
              <h3 className="text-sm font-medium text-body mb-2">{t('backgroundColor')}</h3>
              <div className="flex flex-wrap items-center gap-2">
                {BG_SWATCHES.map(c => (
                  <button
                    key={c}
                    onClick={() => setBg(c)}
                    aria-label={c}
                    aria-pressed={bg === c}
                    className={`h-8 w-8 rounded-full border ${bg === c ? 'ring-2 ring-primary ring-offset-2 border-line' : 'border-line-strong'}`}
                    style={{ backgroundColor: c }}
                  />
                ))}
                <input
                  type="color"
                  value={bg}
                  onChange={e => setBg(e.target.value)}
                  aria-label={t('customColor')}
                  className="h-8 w-12 rounded border border-line-strong cursor-pointer bg-transparent p-0.5"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-medium text-body cursor-pointer">
                <input type="checkbox" checked={footerOn} onChange={e => setFooterOn(e.target.checked)} className="accent-blue-600 h-4 w-4" />
                {t('footer')}
              </label>
              {footerOn && (
                <div className="space-y-2">
                  <input
                    value={caption}
                    onChange={e => setCaption(e.target.value)}
                    maxLength={40}
                    placeholder={t('captionPlaceholder')}
                    aria-label={t('captionPlaceholder')}
                    className="ui-field px-4 py-2 w-full"
                  />
                  <div className="flex items-center gap-2">
                    <label className="flex items-center gap-2 text-sm text-body cursor-pointer shrink-0">
                      <input type="checkbox" checked={showDate} onChange={e => setShowDate(e.target.checked)} className="accent-blue-600 h-4 w-4" />
                      {t('showDate')}
                    </label>
                    {showDate && (
                      <input type="date" value={date} onChange={e => setDate(e.target.value)} aria-label={t('showDate')} className="ui-field px-3 py-2 flex-1 min-w-0" />
                    )}
                  </div>
                </div>
              )}
            </div>

            <button onClick={resetSettings} className="text-sm text-muted hover:text-fg">{t('reset')}</button>
          </div>
        </div>
      </div>

      {/* Guide */}
      <div className="ui-card p-6 space-y-6">
        <h2 className="text-xl font-semibold text-fg">{t('guide.title')}</h2>
        <div>
          <h3 className="font-medium text-body mb-2">{t('guide.howTo.title')}</h3>
          <ol className="list-decimal list-inside space-y-1">
            {(t.raw('guide.howTo.items') as string[]).map((item, i) => (
              <li key={i} className="text-sm text-sub">{item}</li>
            ))}
          </ol>
        </div>
        <div>
          <h3 className="font-medium text-body mb-2">{t('guide.faq.title')}</h3>
          <dl className="space-y-3">
            {(t.raw('guide.faq.items') as { q: string; a: string }[]).map((f, i) => (
              <div key={i}>
                <dt className="text-sm font-medium text-body">{f.q}</dt>
                <dd className="text-sm text-sub mt-0.5">{f.a}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </div>
  )
}
