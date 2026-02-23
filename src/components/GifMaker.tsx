'use client'

import { useState, useRef, useEffect, useCallback, ChangeEvent, DragEvent } from 'react'
import { useTranslations } from 'next-intl'
import { Upload, Trash2, ChevronUp, ChevronDown, Play, Pause, Download, RefreshCw, ImageIcon } from 'lucide-react'

// ---------------------------------------------------------------------------
// Minimal GIF89a encoder (pure TypeScript, no external deps)
// ---------------------------------------------------------------------------

/** Quantise an RGBA pixel array to at most 256 colours (popularity algorithm) */
function quantizeColors(pixels: Uint8ClampedArray): {
  palette: number[][]
  indices: Uint8Array
} {
  // Build frequency map (ignore alpha=0 pixels)
  const freq = new Map<number, number>()
  for (let i = 0; i < pixels.length; i += 4) {
    const a = pixels[i + 3]
    if (a < 128) continue
    const key = ((pixels[i] >> 2) << 14) | ((pixels[i + 1] >> 2) << 7) | (pixels[i + 2] >> 2)
    freq.set(key, (freq.get(key) ?? 0) + 1)
  }

  // Sort by frequency descending, pick top 255 (reserve 0 for transparency)
  const sorted = [...freq.entries()].sort((a, b) => b[1] - a[1])
  const topEntries = sorted.slice(0, 255)
  const palette: number[][] = [[0, 0, 0]] // index 0 = black / transparent stand-in
  const paletteMap = new Map<number, number>()
  for (const [key] of topEntries) {
    const r = ((key >> 14) & 0x7f) << 2
    const g = ((key >> 7) & 0x7f) << 2
    const b = (key & 0x7f) << 2
    paletteMap.set(key, palette.length)
    palette.push([r, g, b])
  }
  // Pad palette to a power of 2, minimum 2
  while (palette.length < 2 || (palette.length & (palette.length - 1)) !== 0) {
    palette.push([0, 0, 0])
  }

  // Map each pixel to nearest palette index
  const indices = new Uint8Array(pixels.length / 4)
  for (let i = 0; i < pixels.length; i += 4) {
    const a = pixels[i + 3]
    if (a < 128) {
      indices[i / 4] = 0 // transparent → index 0
      continue
    }
    const key = ((pixels[i] >> 2) << 14) | ((pixels[i + 1] >> 2) << 7) | (pixels[i + 2] >> 2)
    const exact = paletteMap.get(key)
    if (exact !== undefined) {
      indices[i / 4] = exact
      continue
    }
    // Nearest-colour search in palette
    let best = 0
    let bestDist = Infinity
    for (let j = 1; j < palette.length; j++) {
      const dr = pixels[i] - palette[j][0]
      const dg = pixels[i + 1] - palette[j][1]
      const db = pixels[i + 2] - palette[j][2]
      const dist = dr * dr + dg * dg + db * db
      if (dist < bestDist) { bestDist = dist; best = j }
    }
    indices[i / 4] = best
  }

  return { palette, indices }
}

/** LZW compress a stream of colour indices for GIF */
function lzwCompress(indices: Uint8Array, minCodeSize: number): Uint8Array {
  const clearCode = 1 << minCodeSize
  const eofCode = clearCode + 1
  let nextCode = eofCode + 1
  let codeSize = minCodeSize + 1

  // Output bit stream
  const out: number[] = []
  let bitBuf = 0
  let bitLen = 0

  function emitCode(code: number) {
    bitBuf |= code << bitLen
    bitLen += codeSize
    while (bitLen >= 8) {
      out.push(bitBuf & 0xff)
      bitBuf >>= 8
      bitLen -= 8
    }
    if (nextCode > (1 << codeSize) && codeSize < 12) codeSize++
  }

  // String table: Map<string, number>
  // Key = previous_code + "," + current_index
  const table = new Map<string, number>()
  for (let i = 0; i < clearCode; i++) table.set(`-1,${i}`, i)

  emitCode(clearCode)

  let prev = -1
  for (let i = 0; i < indices.length; i++) {
    const cur = indices[i]
    const key = `${prev},${cur}`
    if (table.has(key)) {
      prev = table.get(key)!
    } else {
      emitCode(prev === -1 ? cur : prev)
      if (nextCode < 4096) {
        table.set(key, nextCode++)
      } else {
        // Reset
        emitCode(clearCode)
        table.clear()
        for (let j = 0; j < clearCode; j++) table.set(`-1,${j}`, j)
        nextCode = eofCode + 1
        codeSize = minCodeSize + 1
      }
      prev = cur
    }
  }
  if (prev !== -1) emitCode(prev)
  emitCode(eofCode)

  if (bitLen > 0) out.push(bitBuf & 0xff)
  return new Uint8Array(out)
}

/** Write a GIF data sub-block sequence (max 255 bytes per block) */
function writeSubBlocks(bytes: Uint8Array, out: number[]) {
  let offset = 0
  while (offset < bytes.length) {
    const blockSize = Math.min(255, bytes.length - offset)
    out.push(blockSize)
    for (let i = 0; i < blockSize; i++) out.push(bytes[offset++])
  }
  out.push(0) // block terminator
}

interface GifFrame {
  imageData: ImageData
  delay: number // centiseconds (delay_ms / 10)
}

/**
 * Encode an array of frames into a GIF89a file.
 * Returns a Uint8Array containing the complete GIF binary.
 */
function encodeGif(frames: GifFrame[], loop: boolean): Uint8Array {
  if (frames.length === 0) return new Uint8Array()
  const width = frames[0].imageData.width
  const height = frames[0].imageData.height
  const out: number[] = []

  // --- GIF Header ---
  const sig = [0x47, 0x49, 0x46, 0x38, 0x39, 0x61] // GIF89a
  out.push(...sig)

  // Logical screen descriptor — use global colour table from first frame
  const { palette: gPalette } = quantizeColors(frames[0].imageData.data)
  const colorDepth = Math.max(2, Math.ceil(Math.log2(gPalette.length)))
  const gctSize = Math.pow(2, colorDepth)

  out.push(width & 0xff, (width >> 8) & 0xff)
  out.push(height & 0xff, (height >> 8) & 0xff)
  // Packed field: Global Color Table Flag=1, Color Resolution=colorDepth-1, Sort=0, GCT Size=colorDepth-1
  out.push(0x80 | ((colorDepth - 1) << 4) | (colorDepth - 1))
  out.push(0x00) // background colour index
  out.push(0x00) // pixel aspect ratio

  // Global Colour Table (padded to gctSize entries)
  for (let i = 0; i < gctSize; i++) {
    if (i < gPalette.length) {
      out.push(gPalette[i][0], gPalette[i][1], gPalette[i][2])
    } else {
      out.push(0, 0, 0)
    }
  }

  // --- Netscape Application Extension (for looping) ---
  if (loop) {
    out.push(0x21, 0xff) // Extension, Application
    out.push(0x0b) // block size = 11
    // "NETSCAPE2.0"
    const app = [0x4e, 0x45, 0x54, 0x53, 0x43, 0x41, 0x50, 0x45, 0x32, 0x2e, 0x30]
    out.push(...app)
    out.push(0x03, 0x01) // sub-block size, sub-block ID
    out.push(0x00, 0x00) // loop count = 0 (infinite)
    out.push(0x00) // block terminator
  }

  // --- Frames ---
  for (const frame of frames) {
    const { palette, indices } = quantizeColors(frame.imageData.data)
    const localColorDepth = Math.max(2, Math.ceil(Math.log2(palette.length)))
    const lctSize = Math.pow(2, localColorDepth)

    // Graphic Control Extension
    out.push(0x21, 0xf9) // Extension Introducer, Graphic Control Label
    out.push(0x04) // block size
    out.push(0x00) // packed: dispose=0, user input=0, transparent=0
    const delayCentisec = Math.max(1, frame.delay)
    out.push(delayCentisec & 0xff, (delayCentisec >> 8) & 0xff)
    out.push(0x00) // transparent colour index
    out.push(0x00) // block terminator

    // Image Descriptor
    out.push(0x2c) // Image Separator
    out.push(0x00, 0x00) // left
    out.push(0x00, 0x00) // top
    out.push(frame.imageData.width & 0xff, (frame.imageData.width >> 8) & 0xff)
    out.push(frame.imageData.height & 0xff, (frame.imageData.height >> 8) & 0xff)
    // Packed: Local Color Table Flag=1, Interlace=0, Sort=0, LCT Size
    out.push(0x80 | (localColorDepth - 1))

    // Local Colour Table
    for (let i = 0; i < lctSize; i++) {
      if (i < palette.length) {
        out.push(palette[i][0], palette[i][1], palette[i][2])
      } else {
        out.push(0, 0, 0)
      }
    }

    // Image Data: minimum code size
    const minCodeSize = Math.max(2, localColorDepth)
    out.push(minCodeSize)
    const compressed = lzwCompress(indices, minCodeSize)
    writeSubBlocks(compressed, out)
  }

  // GIF Trailer
  out.push(0x3b)
  return new Uint8Array(out)
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface FrameItem {
  id: string
  file: File
  dataUrl: string
  img: HTMLImageElement
}

export default function GifMaker() {
  const t = useTranslations('gifMaker')

  const [frames, setFrames] = useState<FrameItem[]>([])
  const [frameDelay, setFrameDelay] = useState(500) // ms
  const [outputWidth, setOutputWidth] = useState(400)
  const [loopInfinite, setLoopInfinite] = useState(true)
  const [isPreviewing, setIsPreviewing] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null)
  const [previewIndex, setPreviewIndex] = useState(0)
  const [isDraggingOver, setIsDraggingOver] = useState(false)
  const [dragReorderIdx, setDragReorderIdx] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const previewTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const downloadLinkRef = useRef<HTMLButtonElement>(null)

  // Canvas preview animation
  useEffect(() => {
    if (previewTimerRef.current) clearInterval(previewTimerRef.current)
    if (!isPreviewing || frames.length === 0) return
    let idx = previewIndex

    const draw = () => {
      const canvas = canvasRef.current
      if (!canvas || frames.length === 0) return
      const img = frames[idx % frames.length].img
      const aspect = img.naturalHeight / img.naturalWidth
      canvas.width = outputWidth
      canvas.height = Math.round(outputWidth * aspect)
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
    }

    draw()
    previewTimerRef.current = setInterval(() => {
      idx = (idx + 1) % frames.length
      setPreviewIndex(idx)
      draw()
    }, frameDelay)

    return () => {
      if (previewTimerRef.current) clearInterval(previewTimerRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPreviewing, frames, frameDelay, outputWidth])

  // Draw first frame on canvas when not previewing
  useEffect(() => {
    if (isPreviewing) return
    const canvas = canvasRef.current
    if (!canvas || frames.length === 0) {
      if (canvas) {
        const ctx = canvas.getContext('2d')
        ctx?.clearRect(0, 0, canvas.width, canvas.height)
      }
      return
    }
    const img = frames[previewIndex < frames.length ? previewIndex : 0].img
    const aspect = img.naturalHeight / img.naturalWidth
    canvas.width = outputWidth
    canvas.height = Math.round(outputWidth * aspect)
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
  }, [frames, outputWidth, previewIndex, isPreviewing])

  const loadImage = (file: File): Promise<FrameItem> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string
        const img = new Image()
        img.onload = () =>
          resolve({
            id: `${Date.now()}-${Math.random()}`,
            file,
            dataUrl,
            img,
          })
        img.onerror = () => reject(new Error(`Failed to load ${file.name}`))
        img.src = dataUrl
      }
      reader.onerror = () => reject(new Error(`Failed to read ${file.name}`))
      reader.readAsDataURL(file)
    })

  const addFiles = useCallback(
    async (files: FileList | File[]) => {
      setError(null)
      const imageFiles = Array.from(files).filter((f) => f.type.startsWith('image/'))
      if (imageFiles.length === 0) return
      try {
        const loaded = await Promise.all(imageFiles.map(loadImage))
        setFrames((prev) => [...prev, ...loaded])
        setDownloadUrl(null)
      } catch {
        setError('이미지를 불러오는 중 오류가 발생했습니다.')
      }
    },
    []
  )

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) addFiles(e.target.files)
    e.target.value = ''
  }

  const handleDropZoneDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDraggingOver(false)
    if (e.dataTransfer.files) addFiles(e.dataTransfer.files)
  }

  const removeFrame = (id: string) => {
    setFrames((prev) => prev.filter((f) => f.id !== id))
    setDownloadUrl(null)
  }

  const moveFrame = (idx: number, dir: -1 | 1) => {
    const newIdx = idx + dir
    if (newIdx < 0 || newIdx >= frames.length) return
    setFrames((prev) => {
      const copy = [...prev]
      ;[copy[idx], copy[newIdx]] = [copy[newIdx], copy[idx]]
      return copy
    })
    setDownloadUrl(null)
  }

  // Drag-to-reorder for frame strip
  const handleFrameDragStart = (idx: number) => setDragReorderIdx(idx)
  const handleFrameDragOver = (e: DragEvent<HTMLDivElement>, idx: number) => {
    e.preventDefault()
    if (dragReorderIdx === null || dragReorderIdx === idx) return
    setFrames((prev) => {
      const copy = [...prev]
      const [item] = copy.splice(dragReorderIdx, 1)
      copy.splice(idx, 0, item)
      return copy
    })
    setDragReorderIdx(idx)
  }
  const handleFrameDragEnd = () => setDragReorderIdx(null)

  const generateGif = useCallback(async () => {
    if (frames.length === 0) return
    setIsGenerating(true)
    setError(null)

    try {
      // Offscreen canvas to render each frame
      const offscreen = document.createElement('canvas')
      const firstImg = frames[0].img
      const aspect = firstImg.naturalHeight / firstImg.naturalWidth
      const w = Math.min(outputWidth, 800)
      const h = Math.round(w * aspect)
      offscreen.width = w
      offscreen.height = h
      const ctx = offscreen.getContext('2d', { willReadFrequently: true })
      if (!ctx) throw new Error('Canvas context unavailable')

      const gifFrames: GifFrame[] = []
      const delayCentisec = Math.round(frameDelay / 10)

      for (const frame of frames) {
        ctx.clearRect(0, 0, w, h)
        ctx.drawImage(frame.img, 0, 0, w, h)
        const imageData = ctx.getImageData(0, 0, w, h)
        gifFrames.push({ imageData, delay: delayCentisec })
      }

      // Encode in a microtask to allow UI updates
      await new Promise<void>((resolve) => setTimeout(resolve, 0))
      const gifBytes = encodeGif(gifFrames, loopInfinite)
      const blob = new Blob([gifBytes.buffer as ArrayBuffer], { type: 'image/gif' })
      const url = URL.createObjectURL(blob)
      setDownloadUrl(url)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'GIF 생성 오류')
    } finally {
      setIsGenerating(false)
    }
  }, [frames, frameDelay, outputWidth, loopInfinite])

  const handleDownload = () => {
    if (!downloadUrl) return
    const a = document.createElement('a')
    a.href = downloadUrl
    a.download = 'animation.gif'
    a.click()
  }

  const handleReset = () => {
    setFrames([])
    setFrameDelay(500)
    setOutputWidth(400)
    setLoopInfinite(true)
    setDownloadUrl(null)
    setIsPreviewing(false)
    setPreviewIndex(0)
    setError(null)
  }

  const togglePreview = () => {
    setIsPreviewing((p) => !p)
    setPreviewIndex(0)
  }

  // Derive canvas height from first frame aspect ratio
  const firstImg = frames[0]?.img
  const canvasHeight =
    firstImg && firstImg.naturalWidth > 0
      ? Math.round(outputWidth * (firstImg.naturalHeight / firstImg.naturalWidth))
      : Math.round(outputWidth * 0.75)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('title')}</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('description')}</p>
      </div>

      {/* Upload drop zone */}
      <div
        className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
          isDraggingOver
            ? 'border-blue-500 bg-blue-50 dark:bg-blue-950'
            : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 hover:border-blue-400 dark:hover:border-blue-500'
        }`}
        onDragOver={(e) => { e.preventDefault(); setIsDraggingOver(true) }}
        onDragLeave={() => setIsDraggingOver(false)}
        onDrop={handleDropZoneDrop}
        onClick={() => fileInputRef.current?.click()}
        role="button"
        tabIndex={0}
        aria-label={t('uploadImages')}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') fileInputRef.current?.click() }}
      >
        <Upload className="w-10 h-10 text-gray-400 mx-auto mb-3" />
        <p className="text-gray-700 dark:text-gray-300 font-medium">{t('dragDrop')}</p>
        <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">JPG, PNG, WebP, GIF</p>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={handleFileChange}
          aria-hidden="true"
        />
      </div>

      {/* Frame strip */}
      {frames.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
              {t('frames')} ({frames.length})
            </h2>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="text-sm px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              + {t('addImages')}
            </button>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2">
            {frames.map((frame, idx) => (
              <div
                key={frame.id}
                draggable
                onDragStart={() => handleFrameDragStart(idx)}
                onDragOver={(e) => handleFrameDragOver(e, idx)}
                onDragEnd={handleFrameDragEnd}
                className={`flex-shrink-0 relative group rounded-lg overflow-hidden border-2 transition-colors cursor-grab active:cursor-grabbing ${
                  dragReorderIdx === idx
                    ? 'border-blue-500 opacity-60'
                    : 'border-gray-200 dark:border-gray-600'
                }`}
                style={{ width: 96 }}
              >
                {/* Frame number badge */}
                <span className="absolute top-1 left-1 bg-black/60 text-white text-xs rounded px-1 z-10">
                  {idx + 1}
                </span>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={frame.dataUrl}
                  alt={`Frame ${idx + 1}`}
                  className="w-24 h-20 object-cover"
                  draggable={false}
                />
                {/* Controls overlay */}
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1">
                  <button
                    onClick={(e) => { e.stopPropagation(); moveFrame(idx, -1) }}
                    disabled={idx === 0}
                    aria-label={t('moveUp')}
                    className="text-white disabled:opacity-30 hover:text-blue-300"
                  >
                    <ChevronUp className="w-4 h-4" />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); removeFrame(frame.id) }}
                    aria-label={t('remove')}
                    className="text-red-400 hover:text-red-300"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); moveFrame(idx, 1) }}
                    disabled={idx === frames.length - 1}
                    aria-label={t('moveDown')}
                    className="text-white disabled:opacity-30 hover:text-blue-300"
                  >
                    <ChevronDown className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Settings */}
      {frames.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Frame delay */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('frameDelay')}: <span className="font-bold text-blue-600">{frameDelay}ms</span>
              </label>
              <input
                type="range"
                min={100}
                max={2000}
                step={50}
                value={frameDelay}
                onChange={(e) => { setFrameDelay(Number(e.target.value)); setDownloadUrl(null) }}
                className="w-full accent-blue-600"
              />
              <div className="flex justify-between text-xs text-gray-400 mt-1">
                <span>100ms</span>
                <span>2000ms</span>
              </div>
            </div>

            {/* Width */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('width')} (px)
              </label>
              <input
                type="number"
                min={50}
                max={800}
                value={outputWidth}
                onChange={(e) => { setOutputWidth(Math.max(50, Math.min(800, Number(e.target.value)))); setDownloadUrl(null) }}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>

            {/* Height (auto) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('height')} (px)
              </label>
              <div className="px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-400 text-sm">
                {frames.length > 0 ? canvasHeight : '—'} (auto)
              </div>
            </div>

            {/* Loop */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('loop')}
              </label>
              <div className="flex rounded-lg overflow-hidden border border-gray-300 dark:border-gray-600">
                <button
                  onClick={() => { setLoopInfinite(true); setDownloadUrl(null) }}
                  className={`flex-1 py-2 text-sm font-medium transition-colors ${
                    loopInfinite
                      ? 'bg-blue-600 text-white'
                      : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600'
                  }`}
                >
                  {t('infinite')}
                </button>
                <button
                  onClick={() => { setLoopInfinite(false); setDownloadUrl(null) }}
                  className={`flex-1 py-2 text-sm font-medium transition-colors border-l border-gray-300 dark:border-gray-600 ${
                    !loopInfinite
                      ? 'bg-blue-600 text-white'
                      : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600'
                  }`}
                >
                  {t('once')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-xl p-4 text-red-700 dark:text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Canvas preview */}
      {frames.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">{t('preview')}</h2>
            <button
              onClick={togglePreview}
              className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg text-sm transition-colors"
            >
              {isPreviewing ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              {isPreviewing ? 'Stop' : 'Play'}
            </button>
          </div>
          <div className="flex justify-center">
            <canvas
              ref={canvasRef}
              className="rounded-lg border border-gray-200 dark:border-gray-700 max-w-full"
              style={{ maxWidth: outputWidth, imageRendering: 'pixelated' }}
            />
          </div>
          {frames.length > 1 && !isPreviewing && (
            <p className="text-xs text-center text-gray-400 mt-2">
              {t('preview')} — frame {(previewIndex % frames.length) + 1} / {frames.length}
            </p>
          )}
        </div>
      )}

      {/* Action buttons */}
      {frames.length > 0 && (
        <div className="flex flex-wrap gap-3">
          <button
            onClick={generateGif}
            disabled={isGenerating}
            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:opacity-60 text-white rounded-xl font-medium transition-all shadow-lg"
          >
            {isGenerating ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                {t('processing')}
              </>
            ) : (
              <>
                <ImageIcon className="w-4 h-4" />
                {t('generate')}
              </>
            )}
          </button>

          {downloadUrl && (
            <button
              onClick={handleDownload}
              ref={downloadLinkRef}
              className="flex items-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl font-medium transition-colors shadow-lg"
            >
              <Download className="w-4 h-4" />
              {t('download')} (GIF)
            </button>
          )}

          <button
            onClick={handleReset}
            className="flex items-center gap-2 px-4 py-3 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-xl font-medium transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            {t('reset')}
          </button>
        </div>
      )}

      {/* Empty state */}
      {frames.length === 0 && (
        <div className="text-center py-8 text-gray-400 dark:text-gray-500">
          <ImageIcon className="w-12 h-12 mx-auto mb-3 opacity-40" />
          <p>{t('noImages')}</p>
        </div>
      )}

      {/* Guide */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          {t('guide.title')}
        </h2>
        <div>
          <h3 className="font-medium text-gray-800 dark:text-gray-200 mb-2">
            {t('guide.howTo.title')}
          </h3>
          <ol className="list-decimal list-inside space-y-1">
            {(t.raw('guide.howTo.items') as string[]).map((item, i) => (
              <li key={i} className="text-sm text-gray-600 dark:text-gray-400">
                {item}
              </li>
            ))}
          </ol>
        </div>
      </div>
    </div>
  )
}
