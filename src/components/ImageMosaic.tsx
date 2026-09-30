'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { useTranslations } from '@/lib/i18n'
import { Upload, Image as ImageIcon, ImagePlus, Square, Paintbrush, Undo, Redo, RotateCcw, Download } from 'lucide-react'

type Mode = 'rectangle' | 'brush'
type EffectType = 'mosaic' | 'blur'

interface Point {
  x: number
  y: number
}

// Region snapshot: pixels of (x, y, data.width, data.height) before/after an action
interface HistoryEntry {
  x: number
  y: number
  data: ImageData
}

interface Stroke {
  start: Point
  last: Point
  radius: number
  layer?: HTMLCanvasElement
  snap?: HTMLCanvasElement
  box?: { x1: number; y1: number; x2: number; y2: number }
}

// iOS Safari refuses canvases above ~16.7M pixels
const MAX_PIXELS = 16_777_216
// ponytail: byte budget for undo+redo region snapshots; raise if users need deeper history on huge photos
const HISTORY_BYTES = 256 * 1024 * 1024
const HISTORY_MAX = 30

function makeCanvas(w: number, h: number) {
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  return c
}

// Full-size copy of `src` with the effect applied; callers clip and draw the part they need
function buildEffectLayer(src: HTMLCanvasElement, effect: EffectType, strength: number) {
  const { width: w, height: h } = src
  const out = makeCanvas(w, h)
  const ctx = out.getContext('2d')!

  if (effect === 'mosaic') {
    const b = Math.max(2, Math.round(strength))
    const sw = Math.max(1, Math.ceil(w / b))
    const sh = Math.max(1, Math.ceil(h / b))
    const small = makeCanvas(sw, sh)
    const sctx = small.getContext('2d')!
    sctx.imageSmoothingEnabled = true
    sctx.imageSmoothingQuality = 'high'
    sctx.drawImage(src, 0, 0, sw, sh)
    ctx.imageSmoothingEnabled = false
    ctx.drawImage(small, 0, 0, sw * b, sh * b)
  } else {
    // Pad with stretched edges so blur near the border does not fade to transparent (which would leak the original)
    const p = Math.ceil(strength * 3)
    const pad = makeCanvas(w + 2 * p, h + 2 * p)
    const pctx = pad.getContext('2d')!
    pctx.drawImage(src, p, p)
    pctx.drawImage(src, 0, 0, 1, h, 0, p, p, h)
    pctx.drawImage(src, w - 1, 0, 1, h, p + w, p, p, h)
    pctx.drawImage(pad, 0, p, w + 2 * p, 1, 0, 0, w + 2 * p, p)
    pctx.drawImage(pad, 0, p + h - 1, w + 2 * p, 1, 0, p + h, w + 2 * p, p)
    ctx.filter = `blur(${strength}px)`
    ctx.drawImage(pad, -p, -p)
  }
  return out
}

export default function ImageMosaic() {
  const t = useTranslations('imageMosaic')

  const [image, setImage] = useState<HTMLImageElement | null>(null)
  const [baseName, setBaseName] = useState('image')
  const [mode, setMode] = useState<Mode>('rectangle')
  const [effectType, setEffectType] = useState<EffectType>('mosaic')
  const [intensity, setIntensity] = useState(20)
  const [brushSize, setBrushSize] = useState(30)
  const [, setHistoryVersion] = useState(0)
  const [downloadFormat, setDownloadFormat] = useState<'png' | 'jpeg'>('jpeg')
  const [jpegQuality, setJpegQuality] = useState(0.9)

  // canvasRef holds the ORIGINAL resolution; CSS scales it down for display
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const rectOverlayRef = useRef<HTMLDivElement>(null)
  const cursorRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const objectUrlRef = useRef<string | null>(null)
  const undoRef = useRef<HistoryEntry[]>([])
  const redoRef = useRef<HistoryEntry[]>([])
  const strokeRef = useRef<Stroke | null>(null)

  const bumpHistory = () => setHistoryVersion((v) => v + 1)

  // Draw the original at full resolution whenever a new image is loaded
  useEffect(() => {
    const canvas = canvasRef.current
    if (!image || !canvas) return
    let w = image.naturalWidth
    let h = image.naturalHeight
    if (w * h > MAX_PIXELS) {
      const s = Math.sqrt(MAX_PIXELS / (w * h))
      w = Math.floor(w * s)
      h = Math.floor(h * s)
    }
    canvas.width = w
    canvas.height = h
    canvas.getContext('2d')!.drawImage(image, 0, 0, w, h)
    undoRef.current = []
    redoRef.current = []
    bumpHistory()
  }, [image])

  useEffect(() => () => {
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current)
  }, [])

  const handleFileSelect = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) return
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current)
      objectUrlRef.current = url
      setBaseName(file.name.replace(/\.[^.]+$/, '') || 'image')
      setImage(img)
    }
    img.onerror = () => URL.revokeObjectURL(url)
    img.src = url
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file) handleFileSelect(file)
  }, [handleFileSelect])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
  }, [])

  // ── History ──
  const pushUndo = useCallback((entry: HistoryEntry) => {
    const undo = undoRef.current
    undo.push(entry)
    redoRef.current = []
    let bytes = undo.reduce((s, en) => s + en.data.data.byteLength, 0)
    while (undo.length > 1 && (undo.length > HISTORY_MAX || bytes > HISTORY_BYTES)) {
      bytes -= undo.shift()!.data.data.byteLength
    }
    bumpHistory()
  }, [])

  // Put `entry` back on the canvas and return what it replaced (for the opposite stack)
  const swapRegion = (entry: HistoryEntry): HistoryEntry | null => {
    const ctx = canvasRef.current?.getContext('2d')
    if (!ctx) return null
    const current = ctx.getImageData(entry.x, entry.y, entry.data.width, entry.data.height)
    ctx.putImageData(entry.data, entry.x, entry.y)
    return { x: entry.x, y: entry.y, data: current }
  }

  const handleUndo = useCallback(() => {
    const entry = undoRef.current.pop()
    if (!entry) return
    const inverse = swapRegion(entry)
    if (inverse) redoRef.current.push(inverse)
    bumpHistory()
  }, [])

  const handleRedo = useCallback(() => {
    const entry = redoRef.current.pop()
    if (!entry) return
    const inverse = swapRegion(entry)
    if (inverse) undoRef.current.push(inverse)
    bumpHistory()
  }, [])

  // Reset always restores the original image (and is itself undoable)
  const handleReset = useCallback(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx || !image) return
    const before = ctx.getImageData(0, 0, canvas.width, canvas.height)
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height)
    pushUndo({ x: 0, y: 0, data: before })
  }, [image, pushUndo])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey)) return
      const el = e.target as HTMLElement
      if (el.isContentEditable || el.tagName === 'TEXTAREA' || (el.tagName === 'INPUT' && (el as HTMLInputElement).type !== 'range')) return
      const key = e.key.toLowerCase()
      if (key === 'z' && !e.shiftKey) {
        e.preventDefault()
        handleUndo()
      } else if ((key === 'z' && e.shiftKey) || key === 'y') {
        e.preventDefault()
        handleRedo()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [handleUndo, handleRedo])

  // ── Pointer ──
  // Display px → canvas px factor (1 display px = `scale` original px)
  const getScale = () => {
    const canvas = canvasRef.current!
    return canvas.width / canvas.getBoundingClientRect().width
  }

  const toCanvas = (e: React.PointerEvent, clamp: boolean): Point => {
    const canvas = canvasRef.current!
    const r = canvas.getBoundingClientRect()
    let x = (e.clientX - r.left) * (canvas.width / r.width)
    let y = (e.clientY - r.top) * (canvas.height / r.height)
    if (clamp) {
      x = Math.min(Math.max(x, 0), canvas.width)
      y = Math.min(Math.max(y, 0), canvas.height)
    }
    return { x, y }
  }

  const effectStrength = (scale: number) =>
    effectType === 'mosaic' ? intensity * scale : intensity * scale * 0.6

  // Stamp the effect layer along a→b (interpolated so fast strokes stay continuous)
  const paintSegment = (stroke: Stroke, a: Point, b: Point) => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx || !stroke.layer) return
    const r = stroke.radius
    const dist = Math.hypot(b.x - a.x, b.y - a.y)
    const steps = Math.max(1, Math.ceil(dist / Math.max(1, r / 3)))

    ctx.save()
    ctx.beginPath()
    for (let i = 0; i <= steps; i++) {
      const x = a.x + ((b.x - a.x) * i) / steps
      const y = a.y + ((b.y - a.y) * i) / steps
      ctx.moveTo(x + r, y)
      ctx.arc(x, y, r, 0, Math.PI * 2)
    }
    ctx.clip()

    const x1 = Math.max(0, Math.floor(Math.min(a.x, b.x) - r))
    const y1 = Math.max(0, Math.floor(Math.min(a.y, b.y) - r))
    const x2 = Math.min(canvas.width, Math.ceil(Math.max(a.x, b.x) + r))
    const y2 = Math.min(canvas.height, Math.ceil(Math.max(a.y, b.y) + r))
    if (x2 > x1 && y2 > y1) {
      ctx.drawImage(stroke.layer, x1, y1, x2 - x1, y2 - y1, x1, y1, x2 - x1, y2 - y1)
      const box = stroke.box
      stroke.box = box
        ? { x1: Math.min(box.x1, x1), y1: Math.min(box.y1, y1), x2: Math.max(box.x2, x2), y2: Math.max(box.y2, y2) }
        : { x1, y1, x2, y2 }
    }
    ctx.restore()
  }

  const moveCursor = (e: React.PointerEvent) => {
    const cursor = cursorRef.current
    const wrapper = wrapperRef.current
    if (!cursor || !wrapper) return
    const wr = wrapper.getBoundingClientRect()
    cursor.style.display = 'block'
    cursor.style.width = `${brushSize}px`
    cursor.style.height = `${brushSize}px`
    cursor.style.left = `${e.clientX - wr.left - brushSize / 2}px`
    cursor.style.top = `${e.clientY - wr.top - brushSize / 2}px`
  }

  const updateRectOverlay = (a: Point, b: Point) => {
    const overlay = rectOverlayRef.current
    const wrapper = wrapperRef.current
    const canvas = canvasRef.current
    if (!overlay || !wrapper || !canvas) return
    const scale = getScale()
    const cr = canvas.getBoundingClientRect()
    const wr = wrapper.getBoundingClientRect()
    overlay.style.display = 'block'
    overlay.style.left = `${cr.left - wr.left + Math.min(a.x, b.x) / scale}px`
    overlay.style.top = `${cr.top - wr.top + Math.min(a.y, b.y) / scale}px`
    overlay.style.width = `${Math.abs(b.x - a.x) / scale}px`
    overlay.style.height = `${Math.abs(b.y - a.y) / scale}px`
  }

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!image || !canvas || e.button > 0) return
    canvas.setPointerCapture(e.pointerId)
    const scale = getScale()

    if (mode === 'brush') {
      const p = toCanvas(e, false)
      const snap = makeCanvas(canvas.width, canvas.height)
      snap.getContext('2d')!.drawImage(canvas, 0, 0)
      const stroke: Stroke = {
        start: p,
        last: p,
        radius: (brushSize / 2) * scale,
        snap,
        layer: buildEffectLayer(canvas, effectType, effectStrength(scale)),
      }
      strokeRef.current = stroke
      paintSegment(stroke, p, p)
      moveCursor(e)
    } else {
      const p = toCanvas(e, true)
      strokeRef.current = { start: p, last: p, radius: 0 }
      updateRectOverlay(p, p)
    }
  }

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!image) return
    if (mode === 'brush') moveCursor(e)
    const stroke = strokeRef.current
    if (!stroke) return

    if (mode === 'brush') {
      const p = toCanvas(e, false)
      paintSegment(stroke, stroke.last, p)
      stroke.last = p
    } else {
      stroke.last = toCanvas(e, true)
      updateRectOverlay(stroke.start, stroke.last)
    }
  }

  const handlePointerUp = () => {
    const stroke = strokeRef.current
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    strokeRef.current = null
    if (rectOverlayRef.current) rectOverlayRef.current.style.display = 'none'
    if (!stroke || !canvas || !ctx) return

    if (stroke.snap) {
      const box = stroke.box
      if (box) {
        const data = stroke.snap.getContext('2d')!.getImageData(box.x1, box.y1, box.x2 - box.x1, box.y2 - box.y1)
        pushUndo({ x: box.x1, y: box.y1, data })
      }
      return
    }

    const x = Math.floor(Math.min(stroke.start.x, stroke.last.x))
    const y = Math.floor(Math.min(stroke.start.y, stroke.last.y))
    const w = Math.ceil(Math.max(stroke.start.x, stroke.last.x)) - x
    const h = Math.ceil(Math.max(stroke.start.y, stroke.last.y)) - y
    if (w < 1 || h < 1) return

    const before = ctx.getImageData(x, y, w, h)
    const layer = buildEffectLayer(canvas, effectType, effectStrength(getScale()))
    ctx.drawImage(layer, x, y, w, h, x, y, w, h)
    pushUndo({ x, y, data: before })
  }

  const hideCursor = () => {
    if (cursorRef.current) cursorRef.current.style.display = 'none'
  }

  // Download from the full-resolution canvas
  const handleDownload = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    let out = canvas
    if (downloadFormat === 'jpeg') {
      // JPEG has no alpha: flatten transparent areas onto white instead of black
      out = makeCanvas(canvas.width, canvas.height)
      const octx = out.getContext('2d')!
      octx.fillStyle = '#fff'
      octx.fillRect(0, 0, out.width, out.height)
      octx.drawImage(canvas, 0, 0)
    }

    out.toBlob((blob) => {
      if (!blob) return
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${baseName}-mosaic.${downloadFormat === 'png' ? 'png' : 'jpg'}`
      a.click()
      setTimeout(() => URL.revokeObjectURL(url), 1000)
    }, downloadFormat === 'png' ? 'image/png' : 'image/jpeg', downloadFormat === 'jpeg' ? jpegQuality : undefined)
  }, [downloadFormat, jpegQuality, baseName])

  const canUndo = undoRef.current.length > 0
  const canRedo = redoRef.current.length > 0

  const toggleClass = (active: boolean) =>
    `flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium transition-colors ${
      active ? 'bg-primary text-white' : 'bg-soft hover:bg-subtle text-body'
    }`
  const softBtn =
    'w-full flex items-center justify-center gap-2 bg-soft hover:bg-subtle text-body rounded-lg px-4 py-3 font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors'

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-fg">{t('title')}</h1>
        <p className="text-sm text-muted mt-1">{t('description')}</p>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) handleFileSelect(file)
          e.target.value = ''
        }}
      />

      {/* Main Grid */}
      <div className="grid lg:grid-cols-3 gap-8">
        {/* Controls */}
        <div className="lg:col-span-1">
          <div className="ui-card p-6 space-y-6">
            {/* Upload */}
            {!image && (
              <div>
                <label className="block text-sm font-medium text-body mb-2">
                  {t('upload')}
                </label>
                <div
                  className="border-2 border-dashed border-line-strong rounded-lg p-8 text-center cursor-pointer hover:border-primary transition-colors"
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="w-12 h-12 mx-auto text-faint mb-3" />
                  <p className="text-sm text-sub">{t('dragDrop')}</p>
                </div>
              </div>
            )}

            {!!image && (
              <>
                {/* Mode Selection */}
                <div>
                  <label className="block text-sm font-medium text-body mb-2">
                    {t('mode')}
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button onClick={() => setMode('rectangle')} className={toggleClass(mode === 'rectangle')}>
                      <Square className="w-4 h-4" />
                      {t('rectangle')}
                    </button>
                    <button onClick={() => setMode('brush')} className={toggleClass(mode === 'brush')}>
                      <Paintbrush className="w-4 h-4" />
                      {t('brush')}
                    </button>
                  </div>
                </div>

                {/* Effect Type */}
                <div>
                  <label className="block text-sm font-medium text-body mb-2">
                    {t('effectType')}
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button onClick={() => setEffectType('mosaic')} className={toggleClass(effectType === 'mosaic')}>
                      {t('mosaic')}
                    </button>
                    <button onClick={() => setEffectType('blur')} className={toggleClass(effectType === 'blur')}>
                      {t('blur')}
                    </button>
                  </div>
                </div>

                {/* Intensity */}
                <div>
                  <label className="block text-sm font-medium text-body mb-2">
                    {t('intensity')}: {intensity}
                  </label>
                  <input
                    type="range"
                    min={effectType === 'mosaic' ? 5 : 3}
                    max={effectType === 'mosaic' ? 50 : 30}
                    value={intensity}
                    onChange={(e) => setIntensity(Number(e.target.value))}
                    className="w-full accent-blue-600"
                  />
                </div>

                {/* Brush Size */}
                {mode === 'brush' && (
                  <div>
                    <label className="block text-sm font-medium text-body mb-2">
                      {t('brushSize')}: {brushSize}
                    </label>
                    <input
                      type="range"
                      min={10}
                      max={100}
                      value={brushSize}
                      onChange={(e) => setBrushSize(Number(e.target.value))}
                      className="w-full accent-blue-600"
                    />
                  </div>
                )}

                {/* Action Buttons */}
                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <button onClick={handleUndo} disabled={!canUndo} title="Ctrl+Z" className={softBtn}>
                      <Undo className="w-4 h-4" />
                      {t('undo')}
                    </button>
                    <button onClick={handleRedo} disabled={!canRedo} title="Ctrl+Shift+Z / Ctrl+Y" className={softBtn}>
                      <Redo className="w-4 h-4" />
                      {t('redo')}
                    </button>
                  </div>
                  <button onClick={handleReset} disabled={!canUndo && !canRedo} className={softBtn}>
                    <RotateCcw className="w-4 h-4" />
                    {t('reset')}
                  </button>
                  <button onClick={() => fileInputRef.current?.click()} className={softBtn}>
                    <ImagePlus className="w-4 h-4" />
                    {t('changeImage')}
                  </button>
                </div>

                {/* Download Settings */}
                <div className="border-t border-line pt-4 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-body mb-2">
                      {t('format')}
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => setDownloadFormat('jpeg')}
                        className={`${toggleClass(downloadFormat === 'jpeg')} !py-2 text-sm`}
                      >
                        {t('jpeg')}
                      </button>
                      <button
                        onClick={() => setDownloadFormat('png')}
                        className={`${toggleClass(downloadFormat === 'png')} !py-2 text-sm`}
                      >
                        {t('png')}
                      </button>
                    </div>
                  </div>

                  {downloadFormat === 'jpeg' && (
                    <div>
                      <label className="block text-sm font-medium text-body mb-2">
                        {t('quality')}: {Math.round(jpegQuality * 100)}%
                      </label>
                      <input
                        type="range"
                        min={0.1}
                        max={1}
                        step={0.1}
                        value={jpegQuality}
                        onChange={(e) => setJpegQuality(Number(e.target.value))}
                        className="w-full accent-blue-600"
                      />
                    </div>
                  )}

                  <button onClick={handleDownload} className="ui-btn w-full flex items-center justify-center gap-2 px-4 py-3">
                    <Download className="w-4 h-4" />
                    {t('download')}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Canvas */}
        <div className="lg:col-span-2">
          <div className="ui-card p-6" onDrop={handleDrop} onDragOver={handleDragOver}>
            {!image ? (
              <div className="flex flex-col items-center justify-center h-96 text-faint">
                <ImageIcon className="w-24 h-24 mb-4" />
                <p className="text-lg">{t('noImage')}</p>
              </div>
            ) : (
              <div className="space-y-4">
                {mode === 'rectangle' && (
                  <p className="text-sm text-sub text-center">
                    {t('selectArea')}
                  </p>
                )}
                <div ref={wrapperRef} className="relative flex justify-center items-start overflow-hidden">
                  <canvas
                    ref={canvasRef}
                    onPointerDown={handlePointerDown}
                    onPointerMove={handlePointerMove}
                    onPointerUp={handlePointerUp}
                    onPointerCancel={handlePointerUp}
                    onPointerLeave={hideCursor}
                    className={`block max-w-full h-auto border border-line rounded-lg ${mode === 'brush' ? 'cursor-none' : 'cursor-crosshair'}`}
                    style={{ touchAction: 'none', maxHeight: 600 }}
                  />
                  <div
                    ref={rectOverlayRef}
                    className="absolute hidden pointer-events-none border-2 border-dashed border-primary"
                  />
                  <div
                    ref={cursorRef}
                    className="absolute hidden pointer-events-none rounded-full border-2 border-white outline outline-1 outline-black/60"
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Guide Section */}
      <div className="ui-card p-6">
        <h2 className="text-xl font-semibold text-fg mb-6">
          {t('guide.title')}
        </h2>

        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-medium text-fg mb-3">
              {t('guide.howToUse.title')}
            </h3>
            <ul className="space-y-2 text-sub list-disc pl-5">
              {(t.raw('guide.howToUse.items') as string[]).map((item, index) => (
                <li key={index}>{item}</li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-lg font-medium text-fg mb-3">
              {t('guide.tips.title')}
            </h3>
            <ul className="space-y-2 text-sub list-disc pl-5">
              {(t.raw('guide.tips.items') as string[]).map((item, index) => (
                <li key={index}>{item}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
