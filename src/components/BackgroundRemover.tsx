'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { Upload, Download, RefreshCw, Pipette, ChevronDown, ChevronUp } from 'lucide-react'

interface RGBColor {
  r: number
  g: number
  b: number
}

const colorDistance = (r1: number, g1: number, b1: number, r2: number, g2: number, b2: number): number =>
  Math.sqrt((r1 - r2) ** 2 + (g1 - g2) ** 2 + (b1 - b2) ** 2)

const MAX_DISTANCE = Math.sqrt(255 ** 2 * 3) // ~441.67

export default function BackgroundRemover() {
  const t = useTranslations('backgroundRemover')

  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imageSrc, setImageSrc] = useState<string | null>(null)
  const [selectedColor, setSelectedColor] = useState<RGBColor | null>(null)
  const [tolerance, setTolerance] = useState(30)
  const [edgeSoftening, setEdgeSoftening] = useState(1)
  const [isDragging, setIsDragging] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [hasResult, setHasResult] = useState(false)
  const [isPickMode, setIsPickMode] = useState(false)
  const [showGuide, setShowGuide] = useState(false)

  const originalCanvasRef = useRef<HTMLCanvasElement>(null)
  const resultCanvasRef = useRef<HTMLCanvasElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const imageRef = useRef<HTMLImageElement | null>(null)

  // Draw original image onto the original canvas
  const drawOriginalImage = useCallback((img: HTMLImageElement) => {
    const canvas = originalCanvasRef.current
    if (!canvas) return
    canvas.width = img.naturalWidth
    canvas.height = img.naturalHeight
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.drawImage(img, 0, 0)
  }, [])

  // Load image from file
  const loadImage = useCallback((file: File) => {
    const url = URL.createObjectURL(file)
    setImageSrc(url)
    setSelectedColor(null)
    setHasResult(false)
    setIsPickMode(false)

    const img = new Image()
    img.onload = () => {
      imageRef.current = img
      drawOriginalImage(img)
      // Clear result canvas
      const resultCanvas = resultCanvasRef.current
      if (resultCanvas) {
        resultCanvas.width = img.naturalWidth
        resultCanvas.height = img.naturalHeight
        const ctx = resultCanvas.getContext('2d')
        if (ctx) {
          ctx.clearRect(0, 0, resultCanvas.width, resultCanvas.height)
        }
      }
    }
    img.src = url
  }, [drawOriginalImage])

  // Cleanup object URL on unmount
  useEffect(() => {
    return () => {
      if (imageSrc) URL.revokeObjectURL(imageSrc)
    }
  }, [imageSrc])

  const handleFileChange = (file: File) => {
    if (!file.type.startsWith('image/')) return
    setImageFile(file)
    loadImage(file)
  }

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFileChange(file)
  }, [loadImage]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = () => setIsDragging(false)

  // Pick color from original canvas on click
  const pickColor = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isPickMode) return
    const canvas = originalCanvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const rect = canvas.getBoundingClientRect()
    const x = Math.floor((e.clientX - rect.left) * (canvas.width / rect.width))
    const y = Math.floor((e.clientY - rect.top) * (canvas.height / rect.height))
    const pixel = ctx.getImageData(x, y, 1, 1).data
    setSelectedColor({ r: pixel[0], g: pixel[1], b: pixel[2] })
    setIsPickMode(false)
  }, [isPickMode])

  // Remove background using canvas
  const removeBackground = useCallback(() => {
    if (!selectedColor || !imageRef.current) return
    const canvas = resultCanvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    setIsProcessing(true)

    // Use setTimeout to allow UI to update before heavy computation
    setTimeout(() => {
      try {
        const img = imageRef.current!
        canvas.width = img.naturalWidth
        canvas.height = img.naturalHeight
        ctx.drawImage(img, 0, 0)

        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
        const data = imageData.data
        const { r: tr, g: tg, b: tb } = selectedColor
        const w = canvas.width
        const h = canvas.height

        // Scaled tolerance: tolerance slider (0-100) maps to RGB distance (0-441)
        const distThreshold = (tolerance / 100) * MAX_DISTANCE

        // First pass: mark pixels for removal and store distances
        const distMap = new Float32Array(w * h)
        for (let i = 0; i < w * h; i++) {
          const ri = i * 4
          const dist = colorDistance(data[ri], data[ri + 1], data[ri + 2], tr, tg, tb)
          distMap[i] = dist
        }

        // Edge softening band
        const softBand = Math.max(0, edgeSoftening)

        for (let y = 0; y < h; y++) {
          for (let x = 0; x < w; x++) {
            const i = y * w + x
            const ri = i * 4
            const dist = distMap[i]

            if (dist <= distThreshold) {
              if (softBand <= 0) {
                data[ri + 3] = 0
              } else {
                // Check if near boundary (any neighbor is outside threshold)
                let isBoundary = false
                for (let dy = -1; dy <= 1 && !isBoundary; dy++) {
                  for (let dx = -1; dx <= 1 && !isBoundary; dx++) {
                    const nx = x + dx
                    const ny = y + dy
                    if (nx >= 0 && nx < w && ny >= 0 && ny < h) {
                      if (distMap[ny * w + nx] > distThreshold) {
                        isBoundary = true
                      }
                    }
                  }
                }

                if (isBoundary && softBand > 0) {
                  // Gradient alpha based on how close to threshold
                  const ratio = dist / distThreshold // 0 = full transparent, 1 = boundary
                  data[ri + 3] = Math.round(ratio * 128)
                } else {
                  data[ri + 3] = 0
                }
              }
            } else if (softBand > 0) {
              // Outside threshold: check if near a removed pixel and soften
              let minNeighborDist = Infinity
              const softPx = Math.ceil(softBand)
              for (let dy = -softPx; dy <= softPx; dy++) {
                for (let dx = -softPx; dx <= softPx; dx++) {
                  const nx = x + dx
                  const ny = y + dy
                  if (nx >= 0 && nx < w && ny >= 0 && ny < h) {
                    const nd = distMap[ny * w + nx]
                    if (nd < minNeighborDist) minNeighborDist = nd
                  }
                }
              }
              if (minNeighborDist <= distThreshold) {
                // Feather based on pixel distance from boundary
                const pixelDist = dist - distThreshold
                const maxFeather = (softBand / 100) * MAX_DISTANCE + distThreshold * 0.3
                const alpha = Math.min(1, pixelDist / Math.max(1, maxFeather))
                data[ri + 3] = Math.round(alpha * data[ri + 3])
              }
            }
          }
        }

        ctx.putImageData(imageData, 0, 0)
        setHasResult(true)
      } finally {
        setIsProcessing(false)
      }
    }, 20)
  }, [selectedColor, tolerance, edgeSoftening])

  // Auto-process when color or settings change
  useEffect(() => {
    if (selectedColor && imageRef.current) {
      removeBackground()
    }
  }, [selectedColor, tolerance, edgeSoftening]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleDownload = () => {
    const canvas = resultCanvasRef.current
    if (!canvas) return
    const link = document.createElement('a')
    link.download = imageFile
      ? imageFile.name.replace(/\.[^.]+$/, '') + '_no-bg.png'
      : 'background-removed.png'
    link.href = canvas.toDataURL('image/png')
    link.click()
  }

  const handleReset = () => {
    setImageFile(null)
    setImageSrc(null)
    setSelectedColor(null)
    setHasResult(false)
    setIsPickMode(false)
    imageRef.current = null
    if (fileInputRef.current) fileInputRef.current.value = ''
    const origCanvas = originalCanvasRef.current
    const resCanvas = resultCanvasRef.current
    if (origCanvas) {
      const ctx = origCanvas.getContext('2d')
      if (ctx) ctx.clearRect(0, 0, origCanvas.width, origCanvas.height)
      origCanvas.width = 0
      origCanvas.height = 0
    }
    if (resCanvas) {
      const ctx = resCanvas.getContext('2d')
      if (ctx) ctx.clearRect(0, 0, resCanvas.width, resCanvas.height)
      resCanvas.width = 0
      resCanvas.height = 0
    }
  }

  const colorToHex = (c: RGBColor) =>
    '#' + [c.r, c.g, c.b].map(v => v.toString(16).padStart(2, '0')).join('')

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('title')}</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('description')}</p>
      </div>

      {/* Upload Zone */}
      {!imageSrc && (
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-colors ${
            isDragging
              ? 'border-blue-500 bg-blue-50 dark:bg-blue-950'
              : 'border-gray-300 dark:border-gray-600 hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-gray-700'
          }`}
        >
          <Upload className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500 mb-4" />
          <p className="text-lg font-medium text-gray-700 dark:text-gray-300">{t('uploadImage')}</p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('dragDrop')}</p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">PNG, JPG, WEBP, GIF</p>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={e => {
              const file = e.target.files?.[0]
              if (file) handleFileChange(file)
            }}
          />
        </div>
      )}

      {/* Main workspace */}
      {imageSrc && (
        <>
          {/* Controls bar */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4 space-y-4">
            <div className="flex flex-wrap gap-3 items-center">
              {/* Pick color button */}
              <button
                onClick={() => setIsPickMode(prev => !prev)}
                disabled={!imageSrc}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                  isPickMode
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-blue-50 dark:hover:bg-gray-600'
                }`}
              >
                <Pipette className="h-4 w-4" />
                {isPickMode ? t('clickToSelect') : t('pickColor')}
              </button>

              {/* Selected color swatch */}
              {selectedColor && (
                <div className="flex items-center gap-2">
                  <div
                    className="w-8 h-8 rounded border border-gray-300 dark:border-gray-600 shadow-sm flex-shrink-0"
                    style={{ backgroundColor: colorToHex(selectedColor) }}
                    title={`RGB(${selectedColor.r}, ${selectedColor.g}, ${selectedColor.b})`}
                  />
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    {t('selectedColor')}: {colorToHex(selectedColor).toUpperCase()}
                  </span>
                </div>
              )}

              <div className="flex-1" />

              {/* Download */}
              {hasResult && (
                <button
                  onClick={handleDownload}
                  className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg font-medium text-sm hover:from-green-700 hover:to-emerald-700 transition-colors"
                >
                  <Download className="h-4 w-4" />
                  {t('download')}
                </button>
              )}

              {/* Reset */}
              <button
                onClick={handleReset}
                className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg font-medium text-sm hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                <RefreshCw className="h-4 w-4" />
                {t('reset')}
              </button>
            </div>

            {/* Sliders */}
            <div className="grid sm:grid-cols-2 gap-4">
              {/* Tolerance */}
              <div className="space-y-1">
                <div className="flex justify-between items-center">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {t('tolerance')}
                  </label>
                  <span className="text-sm text-blue-600 dark:text-blue-400 font-semibold">{tolerance}</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={tolerance}
                  onChange={e => setTolerance(Number(e.target.value))}
                  className="w-full accent-blue-600"
                />
                <div className="flex justify-between text-xs text-gray-400 dark:text-gray-500">
                  <span>0 (정밀)</span>
                  <span>100 (광범위)</span>
                </div>
              </div>

              {/* Edge softening */}
              <div className="space-y-1">
                <div className="flex justify-between items-center">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {t('edgeSoftening')}
                  </label>
                  <span className="text-sm text-blue-600 dark:text-blue-400 font-semibold">{edgeSoftening}px</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={5}
                  step={1}
                  value={edgeSoftening}
                  onChange={e => setEdgeSoftening(Number(e.target.value))}
                  className="w-full accent-blue-600"
                />
                <div className="flex justify-between text-xs text-gray-400 dark:text-gray-500">
                  <span>0 (날카로운 경계)</span>
                  <span>5 (부드러운 경계)</span>
                </div>
              </div>
            </div>

            {/* Instructions */}
            {!selectedColor && (
              <p className="text-sm text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950 rounded-lg px-3 py-2">
                {t('pickColor')} 버튼을 누른 후 원본 이미지에서 배경 색상을 클릭하세요.
              </p>
            )}
            {isPickMode && (
              <p className="text-sm text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950 rounded-lg px-3 py-2 font-medium animate-pulse">
                {t('clickToSelect')} — 원본 이미지의 배경 부분을 클릭하세요
              </p>
            )}
            {isProcessing && (
              <p className="text-sm text-blue-600 dark:text-blue-400">{t('processing')}</p>
            )}
          </div>

          {/* Canvas preview: side by side */}
          <div className="grid md:grid-cols-2 gap-4">
            {/* Original */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4 space-y-2">
              <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">{t('original')}</h2>
              <div
                className="overflow-auto rounded-lg border border-gray-200 dark:border-gray-700 max-h-96"
                style={{ background: '#f0f0f0' }}
              >
                <canvas
                  ref={originalCanvasRef}
                  onClick={pickColor}
                  className={`block max-w-full h-auto transition-all ${
                    isPickMode
                      ? 'cursor-crosshair ring-2 ring-blue-500 ring-inset'
                      : 'cursor-default'
                  }`}
                  style={{ maxHeight: '384px', width: '100%', objectFit: 'contain' }}
                  title={isPickMode ? t('clickToSelect') : t('original')}
                />
              </div>
              {isPickMode && (
                <p className="text-xs text-blue-500 dark:text-blue-400 text-center">{t('clickToSelect')}</p>
              )}
            </div>

            {/* Result */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4 space-y-2">
              <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">{t('result')}</h2>
              <div
                className="overflow-auto rounded-lg border border-gray-200 dark:border-gray-700 max-h-96 relative"
                style={{
                  backgroundImage:
                    'linear-gradient(45deg, #ccc 25%, transparent 25%), linear-gradient(-45deg, #ccc 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #ccc 75%), linear-gradient(-45deg, transparent 75%, #ccc 75%)',
                  backgroundSize: '20px 20px',
                  backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px',
                  backgroundColor: '#fff',
                  minHeight: '200px',
                }}
              >
                {/* Always render canvas so ref is always attached; hide when no result */}
                <canvas
                  ref={resultCanvasRef}
                  className={`block max-w-full h-auto ${hasResult ? '' : 'hidden'}`}
                  style={{ maxHeight: '384px', width: '100%', objectFit: 'contain' }}
                />
                {!hasResult && (
                  <div
                    className="absolute inset-0 flex items-center justify-center text-gray-400 dark:text-gray-500 text-sm"
                  >
                    {t('preview')}
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {/* Guide section */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg">
        <button
          onClick={() => setShowGuide(prev => !prev)}
          className="w-full flex items-center justify-between p-6 text-left"
          aria-expanded={showGuide}
        >
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{t('guide.title')}</h2>
          {showGuide ? (
            <ChevronUp className="h-5 w-5 text-gray-400" />
          ) : (
            <ChevronDown className="h-5 w-5 text-gray-400" />
          )}
        </button>

        {showGuide && (
          <div className="px-6 pb-6 space-y-6">
            {/* Usage steps */}
            <div>
              <h3 className="text-base font-semibold text-gray-800 dark:text-gray-200 mb-3">
                {t('guide.howToUse.title')}
              </h3>
              <ol className="space-y-2 list-decimal list-inside">
                {(t.raw('guide.howToUse.steps') as string[]).map((step, i) => (
                  <li key={i} className="text-sm text-gray-600 dark:text-gray-400">{step}</li>
                ))}
              </ol>
            </div>

            {/* Tips */}
            <div>
              <h3 className="text-base font-semibold text-gray-800 dark:text-gray-200 mb-3">
                {t('guide.tips.title')}
              </h3>
              <ul className="space-y-2">
                {(t.raw('guide.tips.items') as string[]).map((tip, i) => (
                  <li key={i} className="text-sm text-gray-600 dark:text-gray-400 flex gap-2">
                    <span className="text-blue-500 flex-shrink-0 mt-0.5">•</span>
                    <span>{tip}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Limitations */}
            <div>
              <h3 className="text-base font-semibold text-gray-800 dark:text-gray-200 mb-3">
                {t('guide.limitations.title')}
              </h3>
              <ul className="space-y-2">
                {(t.raw('guide.limitations.items') as string[]).map((item, i) => (
                  <li key={i} className="text-sm text-gray-600 dark:text-gray-400 flex gap-2">
                    <span className="text-amber-500 flex-shrink-0 mt-0.5">•</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
