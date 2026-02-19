'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { Upload, Image as ImageIcon, Square, Paintbrush, Undo, RotateCcw, Download } from 'lucide-react'

type Mode = 'rectangle' | 'brush'
type EffectType = 'mosaic' | 'blur'

interface Point {
  x: number
  y: number
}

export default function ImageMosaic() {
  const t = useTranslations('imageMosaic')

  const [image, setImage] = useState<HTMLImageElement | null>(null)
  const [mode, setMode] = useState<Mode>('rectangle')
  const [effectType, setEffectType] = useState<EffectType>('mosaic')
  const [intensity, setIntensity] = useState(20)
  const [brushSize, setBrushSize] = useState(30)
  const [isDrawing, setIsDrawing] = useState(false)
  const [startPoint, setStartPoint] = useState<Point | null>(null)
  const [currentPoint, setCurrentPoint] = useState<Point | null>(null)
  const [history, setHistory] = useState<string[]>([])
  const [downloadFormat, setDownloadFormat] = useState<'png' | 'jpeg'>('png')
  const [jpegQuality, setJpegQuality] = useState(0.9)

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Load image onto canvas
  const loadImageToCanvas = useCallback((img: HTMLImageElement) => {
    const canvas = canvasRef.current
    const container = containerRef.current
    if (!canvas || !container) return

    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    if (!ctx) return

    // Calculate canvas size to fit container while maintaining aspect ratio
    const maxWidth = container.clientWidth
    const maxHeight = 600
    let width = img.width
    let height = img.height

    if (width > maxWidth) {
      height = (height * maxWidth) / width
      width = maxWidth
    }
    if (height > maxHeight) {
      width = (width * maxHeight) / height
      height = maxHeight
    }

    canvas.width = width
    canvas.height = height
    ctx.drawImage(img, 0, 0, width, height)

    // Save initial state
    setHistory([canvas.toDataURL()])
  }, [])

  // Handle file upload
  const handleFileSelect = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) return

    const reader = new FileReader()
    reader.onload = (e) => {
      const img = new Image()
      img.onload = () => {
        setImage(img)
        loadImageToCanvas(img)
      }
      img.src = e.target?.result as string
    }
    reader.readAsDataURL(file)
  }, [loadImageToCanvas])

  // Drag and drop handlers
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file) handleFileSelect(file)
  }, [handleFileSelect])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
  }, [])

  // Get canvas coordinates from mouse/touch event
  const getCanvasCoordinates = useCallback((e: React.MouseEvent | React.TouchEvent): Point => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }

    const rect = canvas.getBoundingClientRect()
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY

    return {
      x: clientX - rect.left,
      y: clientY - rect.top
    }
  }, [])

  // Apply mosaic effect
  const applyMosaic = useCallback((imageData: ImageData, blockSize: number, x: number, y: number, width: number, height: number) => {
    const data = imageData.data
    const imgWidth = imageData.width

    for (let by = y; by < y + height; by += blockSize) {
      for (let bx = x; bx < x + width; bx += blockSize) {
        let r = 0, g = 0, b = 0, count = 0

        // Calculate average color in block
        for (let py = by; py < Math.min(by + blockSize, y + height); py++) {
          for (let px = bx; px < Math.min(bx + blockSize, x + width); px++) {
            const idx = (py * imgWidth + px) * 4
            r += data[idx]
            g += data[idx + 1]
            b += data[idx + 2]
            count++
          }
        }

        r = Math.floor(r / count)
        g = Math.floor(g / count)
        b = Math.floor(b / count)

        // Fill block with average color
        for (let py = by; py < Math.min(by + blockSize, y + height); py++) {
          for (let px = bx; px < Math.min(bx + blockSize, x + width); px++) {
            const idx = (py * imgWidth + px) * 4
            data[idx] = r
            data[idx + 1] = g
            data[idx + 2] = b
          }
        }
      }
    }
  }, [])

  // Apply blur effect
  const applyBlur = useCallback((imageData: ImageData, radius: number, x: number, y: number, width: number, height: number) => {
    const data = imageData.data
    const imgWidth = imageData.width
    const imgHeight = imageData.height
    const tempData = new Uint8ClampedArray(data)

    for (let py = y; py < y + height; py++) {
      for (let px = x; px < x + width; px++) {
        let r = 0, g = 0, b = 0, count = 0

        // Average surrounding pixels within radius
        for (let dy = -radius; dy <= radius; dy++) {
          for (let dx = -radius; dx <= radius; dx++) {
            const nx = px + dx
            const ny = py + dy

            if (nx >= 0 && nx < imgWidth && ny >= 0 && ny < imgHeight) {
              const idx = (ny * imgWidth + nx) * 4
              r += tempData[idx]
              g += tempData[idx + 1]
              b += tempData[idx + 2]
              count++
            }
          }
        }

        const idx = (py * imgWidth + px) * 4
        data[idx] = Math.floor(r / count)
        data[idx + 1] = Math.floor(g / count)
        data[idx + 2] = Math.floor(b / count)
      }
    }
  }, [])

  // Apply effect to rectangular area
  const applyEffectToArea = useCallback((x1: number, y1: number, x2: number, y2: number) => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    if (!ctx) return

    // Normalize coordinates
    const x = Math.min(x1, x2)
    const y = Math.min(y1, y2)
    const width = Math.abs(x2 - x1)
    const height = Math.abs(y2 - y1)

    if (width === 0 || height === 0) return

    // Save state before applying effect
    const newHistory = [...history, canvas.toDataURL()]
    if (newHistory.length > 20) newHistory.shift()
    setHistory(newHistory)

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)

    if (effectType === 'mosaic') {
      applyMosaic(imageData, intensity, x, y, width, height)
    } else {
      applyBlur(imageData, intensity, x, y, width, height)
    }

    ctx.putImageData(imageData, 0, 0)
  }, [effectType, intensity, history, applyMosaic, applyBlur])

  // Apply effect to circular area (brush mode)
  const applyEffectToBrush = useCallback((x: number, y: number) => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    if (!ctx) return

    const radius = brushSize / 2
    const x1 = Math.max(0, Math.floor(x - radius))
    const y1 = Math.max(0, Math.floor(y - radius))
    const x2 = Math.min(canvas.width, Math.ceil(x + radius))
    const y2 = Math.min(canvas.height, Math.ceil(y + radius))

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)

    // Apply effect only to pixels within circular brush
    const tempData = new Uint8ClampedArray(imageData.data)

    for (let py = y1; py < y2; py++) {
      for (let px = x1; px < x2; px++) {
        const dx = px - x
        const dy = py - y
        const distance = Math.sqrt(dx * dx + dy * dy)

        if (distance <= radius) {
          if (effectType === 'mosaic') {
            // For mosaic in brush mode, use smaller blocks
            const blockSize = Math.max(5, Math.floor(intensity / 2))
            const bx = Math.floor(px / blockSize) * blockSize
            const by = Math.floor(py / blockSize) * blockSize

            let r = 0, g = 0, b = 0, count = 0
            for (let iy = by; iy < Math.min(by + blockSize, canvas.height); iy++) {
              for (let ix = bx; ix < Math.min(bx + blockSize, canvas.width); ix++) {
                const idx = (iy * canvas.width + ix) * 4
                r += tempData[idx]
                g += tempData[idx + 1]
                b += tempData[idx + 2]
                count++
              }
            }

            const idx = (py * canvas.width + px) * 4
            imageData.data[idx] = Math.floor(r / count)
            imageData.data[idx + 1] = Math.floor(g / count)
            imageData.data[idx + 2] = Math.floor(b / count)
          } else {
            // Blur
            const blurRadius = Math.max(1, Math.floor(intensity / 3))
            let r = 0, g = 0, b = 0, count = 0

            for (let dy = -blurRadius; dy <= blurRadius; dy++) {
              for (let dx = -blurRadius; dx <= blurRadius; dx++) {
                const nx = px + dx
                const ny = py + dy

                if (nx >= 0 && nx < canvas.width && ny >= 0 && ny < canvas.height) {
                  const idx = (ny * canvas.width + nx) * 4
                  r += tempData[idx]
                  g += tempData[idx + 1]
                  b += tempData[idx + 2]
                  count++
                }
              }
            }

            const idx = (py * canvas.width + px) * 4
            imageData.data[idx] = Math.floor(r / count)
            imageData.data[idx + 1] = Math.floor(g / count)
            imageData.data[idx + 2] = Math.floor(b / count)
          }
        }
      }
    }

    ctx.putImageData(imageData, 0, 0)
  }, [brushSize, effectType, intensity])

  // Mouse/touch event handlers
  const handleMouseDown = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (!image) return

    const point = getCanvasCoordinates(e)
    setIsDrawing(true)
    setStartPoint(point)
    setCurrentPoint(point)

    if (mode === 'brush') {
      // Save state on first brush stroke
      const canvas = canvasRef.current
      if (canvas) {
        const newHistory = [...history, canvas.toDataURL()]
        if (newHistory.length > 20) newHistory.shift()
        setHistory(newHistory)
      }
      applyEffectToBrush(point.x, point.y)
    }
  }, [image, mode, getCanvasCoordinates, applyEffectToBrush, history])

  const handleMouseMove = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing || !image) return

    const point = getCanvasCoordinates(e)
    setCurrentPoint(point)

    if (mode === 'brush') {
      applyEffectToBrush(point.x, point.y)
    }
  }, [isDrawing, image, mode, getCanvasCoordinates, applyEffectToBrush])

  const handleMouseUp = useCallback(() => {
    if (!isDrawing || !image) return

    if (mode === 'rectangle' && startPoint && currentPoint) {
      applyEffectToArea(startPoint.x, startPoint.y, currentPoint.x, currentPoint.y)
    }

    setIsDrawing(false)
    setStartPoint(null)
    setCurrentPoint(null)
  }, [isDrawing, image, mode, startPoint, currentPoint, applyEffectToArea])

  // Draw selection rectangle
  useEffect(() => {
    if (mode === 'rectangle' && isDrawing && startPoint && currentPoint) {
      const canvas = canvasRef.current
      if (!canvas) return

      const ctx = canvas.getContext('2d')
      if (!ctx) return

      // Redraw from history
      const lastState = history[history.length - 1]
      if (lastState) {
        const img = new Image()
        img.onload = () => {
          ctx.drawImage(img, 0, 0)

          // Draw selection rectangle
          ctx.strokeStyle = '#3b82f6'
          ctx.lineWidth = 2
          ctx.setLineDash([5, 5])
          ctx.strokeRect(
            startPoint.x,
            startPoint.y,
            currentPoint.x - startPoint.x,
            currentPoint.y - startPoint.y
          )
          ctx.setLineDash([])
        }
        img.src = lastState
      }
    }
  }, [mode, isDrawing, startPoint, currentPoint, history])

  // Undo
  const handleUndo = useCallback(() => {
    if (history.length <= 1) return

    const newHistory = [...history]
    newHistory.pop()
    setHistory(newHistory)

    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const lastState = newHistory[newHistory.length - 1]
    const img = new Image()
    img.onload = () => {
      ctx.drawImage(img, 0, 0)
    }
    img.src = lastState
  }, [history])

  // Reset
  const handleReset = useCallback(() => {
    if (history.length === 0 || !image) return

    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const firstState = history[0]
    const img = new Image()
    img.onload = () => {
      ctx.drawImage(img, 0, 0)
      setHistory([firstState])
    }
    img.src = firstState
  }, [history, image])

  // Download
  const handleDownload = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const mimeType = downloadFormat === 'png' ? 'image/png' : 'image/jpeg'
    const quality = downloadFormat === 'jpeg' ? jpegQuality : undefined

    canvas.toBlob((blob) => {
      if (!blob) return

      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `mosaic-${Date.now()}.${downloadFormat}`
      a.click()
      URL.revokeObjectURL(url)
    }, mimeType, quality)
  }, [downloadFormat, jpegQuality])

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('title')}</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('description')}</p>
      </div>

      {/* Main Grid */}
      <div className="grid lg:grid-cols-3 gap-8">
        {/* Controls */}
        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 space-y-6">
            {/* Upload */}
            {!image && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('upload')}
                </label>
                <div
                  className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-8 text-center cursor-pointer hover:border-blue-500 dark:hover:border-blue-400 transition-colors"
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="w-12 h-12 mx-auto text-gray-400 mb-3" />
                  <p className="text-sm text-gray-600 dark:text-gray-400">{t('dragDrop')}</p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) handleFileSelect(file)
                    }}
                  />
                </div>
              </div>
            )}

            {/* Mode Selection */}
            {!!image && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t('mode')}
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setMode('rectangle')}
                      className={`flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium transition-colors ${
                        mode === 'rectangle'
                          ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white'
                          : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300'
                      }`}
                    >
                      <Square className="w-4 h-4" />
                      {t('rectangle')}
                    </button>
                    <button
                      onClick={() => setMode('brush')}
                      className={`flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium transition-colors ${
                        mode === 'brush'
                          ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white'
                          : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300'
                      }`}
                    >
                      <Paintbrush className="w-4 h-4" />
                      {t('brush')}
                    </button>
                  </div>
                </div>

                {/* Effect Type */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t('effectType')}
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setEffectType('mosaic')}
                      className={`px-4 py-3 rounded-lg font-medium transition-colors ${
                        effectType === 'mosaic'
                          ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white'
                          : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300'
                      }`}
                    >
                      {t('mosaic')}
                    </button>
                    <button
                      onClick={() => setEffectType('blur')}
                      className={`px-4 py-3 rounded-lg font-medium transition-colors ${
                        effectType === 'blur'
                          ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white'
                          : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300'
                      }`}
                    >
                      {t('blur')}
                    </button>
                  </div>
                </div>

                {/* Intensity */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
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
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
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
                  <button
                    onClick={handleUndo}
                    disabled={history.length <= 1}
                    className="w-full flex items-center justify-center gap-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg px-4 py-3 font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <Undo className="w-4 h-4" />
                    {t('undo')}
                  </button>
                  <button
                    onClick={handleReset}
                    disabled={history.length <= 1}
                    className="w-full flex items-center justify-center gap-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg px-4 py-3 font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <RotateCcw className="w-4 h-4" />
                    {t('reset')}
                  </button>
                </div>

                {/* Download Settings */}
                <div className="border-t border-gray-200 dark:border-gray-700 pt-4 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      {t('format')}
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => setDownloadFormat('png')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                          downloadFormat === 'png'
                            ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300'
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                        }`}
                      >
                        {t('png')}
                      </button>
                      <button
                        onClick={() => setDownloadFormat('jpeg')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                          downloadFormat === 'jpeg'
                            ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300'
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                        }`}
                      >
                        {t('jpeg')}
                      </button>
                    </div>
                  </div>

                  {downloadFormat === 'jpeg' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
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

                  <button
                    onClick={handleDownload}
                    className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg px-4 py-3 font-medium hover:from-blue-700 hover:to-indigo-700 transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    {t('download')}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Canvas */}
        <div className="lg:col-span-2" ref={containerRef}>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
            {!image ? (
              <div className="flex flex-col items-center justify-center h-96 text-gray-400">
                <ImageIcon className="w-24 h-24 mb-4" />
                <p className="text-lg">{t('noImage')}</p>
              </div>
            ) : (
              <div className="space-y-4">
                {mode === 'rectangle' && (
                  <p className="text-sm text-gray-600 dark:text-gray-400 text-center">
                    {t('selectArea')}
                  </p>
                )}
                <div className="overflow-auto">
                  <canvas
                    ref={canvasRef}
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={handleMouseUp}
                    onTouchStart={handleMouseDown}
                    onTouchMove={handleMouseMove}
                    onTouchEnd={handleMouseUp}
                    className="border border-gray-200 dark:border-gray-700 rounded-lg cursor-crosshair mx-auto"
                    style={{ touchAction: 'none' }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Guide Section */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
          <ImageIcon className="w-5 h-5" />
          {t('guide.title')}
        </h2>

        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-3">
              {t('guide.howToUse.title')}
            </h3>
            <ul className="space-y-2 text-gray-600 dark:text-gray-300">
              {(t.raw('guide.howToUse.items') as string[]).map((item, index) => (
                <li key={index} className="flex items-start gap-2">
                  <span className="text-blue-600 dark:text-blue-400 mt-1">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-3">
              {t('guide.tips.title')}
            </h3>
            <ul className="space-y-2 text-gray-600 dark:text-gray-300">
              {(t.raw('guide.tips.items') as string[]).map((item, index) => (
                <li key={index} className="flex items-start gap-2">
                  <span className="text-blue-600 dark:text-blue-400 mt-1">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
