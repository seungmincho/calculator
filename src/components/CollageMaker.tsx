'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { Upload, Download, Trash2, RefreshCw, X, ImageIcon } from 'lucide-react'

// ── Types ──────────────────────────────────────────────────────────────────────

type LayoutId = 'grid2' | 'grid3' | 'grid4' | 'grid6' | 'grid9'

interface CellDef {
  x: number // 0..1 ratio
  y: number
  w: number
  h: number
}

interface UploadedImage {
  id: string
  src: string
  name: string
}

interface OutputSize {
  label: string
  width: number
  height: number
}

// ── Layout definitions (percentage-based) ──────────────────────────────────────

const LAYOUTS: Record<LayoutId, CellDef[]> = {
  grid2: [
    { x: 0, y: 0, w: 0.5, h: 1 },
    { x: 0.5, y: 0, w: 0.5, h: 1 },
  ],
  grid3: [
    { x: 0, y: 0, w: 0.5, h: 1 },
    { x: 0.5, y: 0, w: 0.5, h: 0.5 },
    { x: 0.5, y: 0.5, w: 0.5, h: 0.5 },
  ],
  grid4: [
    { x: 0, y: 0, w: 0.5, h: 0.5 },
    { x: 0.5, y: 0, w: 0.5, h: 0.5 },
    { x: 0, y: 0.5, w: 0.5, h: 0.5 },
    { x: 0.5, y: 0.5, w: 0.5, h: 0.5 },
  ],
  grid6: [
    { x: 0, y: 0, w: 1 / 3, h: 0.5 },
    { x: 1 / 3, y: 0, w: 1 / 3, h: 0.5 },
    { x: 2 / 3, y: 0, w: 1 / 3, h: 0.5 },
    { x: 0, y: 0.5, w: 1 / 3, h: 0.5 },
    { x: 1 / 3, y: 0.5, w: 1 / 3, h: 0.5 },
    { x: 2 / 3, y: 0.5, w: 1 / 3, h: 0.5 },
  ],
  grid9: [
    { x: 0, y: 0, w: 1 / 3, h: 1 / 3 },
    { x: 1 / 3, y: 0, w: 1 / 3, h: 1 / 3 },
    { x: 2 / 3, y: 0, w: 1 / 3, h: 1 / 3 },
    { x: 0, y: 1 / 3, w: 1 / 3, h: 1 / 3 },
    { x: 1 / 3, y: 1 / 3, w: 1 / 3, h: 1 / 3 },
    { x: 2 / 3, y: 1 / 3, w: 1 / 3, h: 1 / 3 },
    { x: 0, y: 2 / 3, w: 1 / 3, h: 1 / 3 },
    { x: 1 / 3, y: 2 / 3, w: 1 / 3, h: 1 / 3 },
    { x: 2 / 3, y: 2 / 3, w: 1 / 3, h: 1 / 3 },
  ],
}

const OUTPUT_SIZES: OutputSize[] = [
  { label: 'Instagram (1080×1080)', width: 1080, height: 1080 },
  { label: 'OG Image (1200×630)', width: 1200, height: 630 },
  { label: 'HD (1920×1080)', width: 1920, height: 1080 },
]

// ── Utility ───────────────────────────────────────────────────────────────────

function drawCoverImage(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  dx: number,
  dy: number,
  dw: number,
  dh: number,
) {
  const scale = Math.max(dw / img.naturalWidth, dh / img.naturalHeight)
  const sw = dw / scale
  const sh = dh / scale
  const sx = (img.naturalWidth - sw) / 2
  const sy = (img.naturalHeight - sh) / 2
  ctx.drawImage(img, sx, sy, sw, sh, dx, dy, dw, dh)
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = src
  })
}

// ── Layout preview SVG component ──────────────────────────────────────────────

function LayoutPreview({ cells }: { cells: CellDef[] }) {
  const W = 56
  const H = 40
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-full" aria-hidden="true">
      {cells.map((c, i) => (
        <rect
          key={i}
          x={c.x * W + 1}
          y={c.y * H + 1}
          width={c.w * W - 2}
          height={c.h * H - 2}
          rx={2}
          className="fill-blue-200 dark:fill-blue-800 stroke-blue-400 dark:stroke-blue-600"
          strokeWidth={0.5}
        />
      ))}
    </svg>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function CollageMaker() {
  const t = useTranslations('collageMaker')

  const [images, setImages] = useState<UploadedImage[]>([])
  const [layout, setLayout] = useState<LayoutId>('grid4')
  const [spacing, setSpacing] = useState(8)
  const [borderRadius, setBorderRadius] = useState(8)
  const [bgColor, setBgColor] = useState('#ffffff')
  const [outputSizeIdx, setOutputSizeIdx] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const [isRendering, setIsRendering] = useState(false)

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const outputSize = OUTPUT_SIZES[outputSizeIdx]

  // ── Image loading helpers ─────────────────────────────────────────────────

  const addFiles = useCallback((files: FileList | null) => {
    if (!files) return
    const toAdd: UploadedImage[] = []
    Array.from(files).forEach(file => {
      if (!file.type.startsWith('image/')) return
      const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`
      const src = URL.createObjectURL(file)
      toAdd.push({ id, src, name: file.name })
    })
    setImages(prev => [...prev, ...toAdd])
  }, [])

  const removeImage = useCallback((id: string) => {
    setImages(prev => {
      const img = prev.find(i => i.id === id)
      if (img) URL.revokeObjectURL(img.src)
      return prev.filter(i => i.id !== id)
    })
  }, [])

  const reset = useCallback(() => {
    setImages(prev => {
      prev.forEach(i => URL.revokeObjectURL(i.src))
      return []
    })
    setLayout('grid4')
    setSpacing(8)
    setBorderRadius(8)
    setBgColor('#ffffff')
    setOutputSizeIdx(0)
  }, [])

  // cleanup on unmount
  useEffect(() => {
    return () => {
      images.forEach(i => URL.revokeObjectURL(i.src))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Canvas rendering ──────────────────────────────────────────────────────

  const renderCollage = useCallback(async () => {
    if (images.length === 0) return
    const canvas = canvasRef.current
    if (!canvas) return

    setIsRendering(true)
    try {
      const { width, height } = outputSize
      canvas.width = width
      canvas.height = height

      const ctx = canvas.getContext('2d')
      if (!ctx) return

      // Background
      ctx.fillStyle = bgColor
      ctx.fillRect(0, 0, width, height)

      const cells = LAYOUTS[layout]
      const loadedImgs = await Promise.all(
        cells.map((_, i) => {
          const img = images[i % images.length]
          return loadImage(img.src)
        }),
      )

      cells.forEach((cell, i) => {
        const img = loadedImgs[i]
        const x = cell.x * width + spacing / 2
        const y = cell.y * height + spacing / 2
        const w = cell.w * width - spacing
        const h = cell.h * height - spacing

        if (w <= 0 || h <= 0) return

        ctx.save()

        if (borderRadius > 0) {
          const r = Math.min(borderRadius, w / 2, h / 2)
          ctx.beginPath()
          ctx.moveTo(x + r, y)
          ctx.lineTo(x + w - r, y)
          ctx.quadraticCurveTo(x + w, y, x + w, y + r)
          ctx.lineTo(x + w, y + h - r)
          ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
          ctx.lineTo(x + r, y + h)
          ctx.quadraticCurveTo(x, y + h, x, y + h - r)
          ctx.lineTo(x, y + r)
          ctx.quadraticCurveTo(x, y, x + r, y)
          ctx.closePath()
          ctx.clip()
        }

        drawCoverImage(ctx, img, x, y, w, h)
        ctx.restore()
      })
    } finally {
      setIsRendering(false)
    }
  }, [images, layout, spacing, borderRadius, bgColor, outputSize])

  // Re-render whenever settings change
  useEffect(() => {
    if (images.length > 0) {
      renderCollage()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [images, layout, spacing, borderRadius, bgColor, outputSizeIdx])

  // ── Download ──────────────────────────────────────────────────────────────

  const handleDownload = useCallback(async () => {
    await renderCollage()
    const canvas = canvasRef.current
    if (!canvas) return
    const link = document.createElement('a')
    link.download = `collage-${Date.now()}.png`
    link.href = canvas.toDataURL('image/png')
    link.click()
  }, [renderCollage])

  // ── Drag and drop ─────────────────────────────────────────────────────────

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }
  const handleDragLeave = () => setIsDragging(false)
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    addFiles(e.dataTransfer.files)
  }

  // ── Render ────────────────────────────────────────────────────────────────

  const layoutIds = Object.keys(LAYOUTS) as LayoutId[]
  const layoutLabelKeys: Record<LayoutId, string> = {
    grid2: 'layoutGrid2',
    grid3: 'layoutGrid3',
    grid4: 'layoutGrid4',
    grid6: 'layoutGrid6',
    grid9: 'layoutGrid9',
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('title')}</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('description')}</p>
      </div>

      {/* Upload zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`
          border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors
          ${isDragging
            ? 'border-blue-500 bg-blue-50 dark:bg-blue-950'
            : 'border-gray-300 dark:border-gray-600 hover:border-blue-400 hover:bg-blue-50/50 dark:hover:bg-blue-950/30'
          }
        `}
      >
        <Upload className="mx-auto h-10 w-10 text-gray-400 dark:text-gray-500 mb-3" />
        <p className="text-gray-600 dark:text-gray-300 font-medium">{t('dragDrop')}</p>
        <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">{t('addImages')}</p>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={e => addFiles(e.target.files)}
        />
      </div>

      {/* Main grid: settings left, preview right */}
      <div className="grid lg:grid-cols-5 gap-6">

        {/* Left: settings panel */}
        <div className="lg:col-span-2 space-y-5">

          {/* Uploaded images */}
          {images.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-5">
              <h2 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                <ImageIcon className="h-4 w-4" />
                {t('uploadImages')} ({images.length})
              </h2>
              <div className="grid grid-cols-3 gap-2">
                {images.map(img => (
                  <div key={img.id} className="relative group aspect-square rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-700">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={img.src}
                      alt={img.name}
                      className="w-full h-full object-cover"
                    />
                    <button
                      onClick={() => removeImage(img.id)}
                      aria-label={t('remove')}
                      className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Layout selection */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-5">
            <h2 className="font-semibold text-gray-900 dark:text-white mb-3">{t('layout')}</h2>
            <div className="grid grid-cols-3 gap-2">
              {layoutIds.map(id => (
                <button
                  key={id}
                  onClick={() => setLayout(id)}
                  aria-label={t(layoutLabelKeys[id])}
                  aria-pressed={layout === id}
                  className={`
                    flex flex-col items-center gap-1 p-2 rounded-lg border-2 transition-all
                    ${layout === id
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-950'
                      : 'border-gray-200 dark:border-gray-600 hover:border-blue-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                    }
                  `}
                >
                  <div className="w-14 h-10">
                    <LayoutPreview cells={LAYOUTS[id]} />
                  </div>
                  <span className="text-xs text-gray-600 dark:text-gray-300">{t(layoutLabelKeys[id])}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Settings */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-5 space-y-4">

            {/* Spacing */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('spacing')}: <span className="font-mono text-blue-600 dark:text-blue-400">{spacing}px</span>
              </label>
              <input
                type="range"
                min={0}
                max={20}
                value={spacing}
                onChange={e => setSpacing(Number(e.target.value))}
                className="w-full accent-blue-600"
              />
            </div>

            {/* Border radius */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('borderRadius')}: <span className="font-mono text-blue-600 dark:text-blue-400">{borderRadius}px</span>
              </label>
              <input
                type="range"
                min={0}
                max={20}
                value={borderRadius}
                onChange={e => setBorderRadius(Number(e.target.value))}
                className="w-full accent-blue-600"
              />
            </div>

            {/* Background color */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('backgroundColor')}
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={bgColor}
                  onChange={e => setBgColor(e.target.value)}
                  className="h-9 w-16 rounded border border-gray-300 dark:border-gray-600 cursor-pointer bg-transparent p-0.5"
                />
                <span className="font-mono text-sm text-gray-600 dark:text-gray-300">{bgColor}</span>
              </div>
            </div>

            {/* Output size */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('outputSize')}
              </label>
              <div className="grid grid-cols-1 gap-1">
                {OUTPUT_SIZES.map((s, i) => (
                  <button
                    key={i}
                    onClick={() => setOutputSizeIdx(i)}
                    aria-pressed={outputSizeIdx === i}
                    className={`
                      text-left text-sm px-3 py-2 rounded-lg border transition-all
                      ${outputSizeIdx === i
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300'
                        : 'border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:border-blue-300'
                      }
                    `}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex gap-3">
            <button
              onClick={handleDownload}
              disabled={images.length === 0 || isRendering}
              className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg px-4 py-3 font-medium hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              <Download className="h-4 w-4" />
              {t('download')}
            </button>
            <button
              onClick={reset}
              className="flex items-center justify-center gap-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg px-4 py-3 font-medium transition-all"
            >
              <RefreshCw className="h-4 w-4" />
              {t('reset')}
            </button>
          </div>
        </div>

        {/* Right: canvas preview */}
        <div className="lg:col-span-3">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-5 sticky top-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold text-gray-900 dark:text-white">{t('preview')}</h2>
              {isRendering && (
                <span className="text-xs text-blue-500 animate-pulse">{t('generating')}</span>
              )}
            </div>

            {images.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-gray-400 dark:text-gray-500 gap-3">
                <ImageIcon className="h-12 w-12" />
                <p className="text-sm">{t('noImages')}</p>
              </div>
            ) : (
              <div className="relative w-full bg-gray-100 dark:bg-gray-900 rounded-lg overflow-hidden flex items-center justify-center">
                <canvas
                  ref={canvasRef}
                  className="max-w-full max-h-[500px] object-contain"
                  style={{ display: 'block' }}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Guide section */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          {t('guide.title')}
        </h2>
        <div>
          <h3 className="font-medium text-gray-800 dark:text-gray-200 mb-2">{t('guide.howTo.title')}</h3>
          <ol className="list-decimal list-inside space-y-1">
            {(t.raw('guide.howTo.items') as string[]).map((item, i) => (
              <li key={i} className="text-sm text-gray-600 dark:text-gray-400">{item}</li>
            ))}
          </ol>
        </div>
      </div>
    </div>
  )
}
