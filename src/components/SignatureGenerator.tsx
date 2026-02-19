'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { Pen, Eraser, Download, Undo2, Copy, Check, BookOpen } from 'lucide-react'

interface Point {
  x: number
  y: number
}

interface Stroke {
  points: Point[]
  color: string
  size: number
}

export default function SignatureGenerator() {
  const t = useTranslations('signatureGenerator')
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [penColor, setPenColor] = useState('#000000')
  const [penSize, setPenSize] = useState(3)
  const [backgroundColor, setBackgroundColor] = useState<'transparent' | 'white'>('transparent')
  const [strokes, setStrokes] = useState<Stroke[]>([])
  const [currentStroke, setCurrentStroke] = useState<Point[]>([])
  const [copiedId, setCopiedId] = useState<string | null>(null)

  // Initialize canvas
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Set canvas size
    const rect = canvas.getBoundingClientRect()
    canvas.width = rect.width
    canvas.height = rect.height

    redrawCanvas()
  }, [backgroundColor])

  // Redraw entire canvas
  const redrawCanvas = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Clear canvas
    if (backgroundColor === 'transparent') {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
    } else {
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
    }

    // Redraw all strokes
    strokes.forEach((stroke) => {
      if (stroke.points.length < 2) return

      ctx.beginPath()
      ctx.strokeStyle = stroke.color
      ctx.lineWidth = stroke.size
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'

      ctx.moveTo(stroke.points[0].x, stroke.points[0].y)
      for (let i = 1; i < stroke.points.length; i++) {
        ctx.lineTo(stroke.points[i].x, stroke.points[i].y)
      }
      ctx.stroke()
    })
  }, [strokes, backgroundColor])

  useEffect(() => {
    redrawCanvas()
  }, [redrawCanvas])

  // Get canvas coordinates
  const getCanvasCoordinates = useCallback((e: MouseEvent | TouchEvent): Point | null => {
    const canvas = canvasRef.current
    if (!canvas) return null

    const rect = canvas.getBoundingClientRect()

    if (e instanceof MouseEvent) {
      return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      }
    } else {
      const touch = e.touches[0] || e.changedTouches[0]
      return {
        x: touch.clientX - rect.left,
        y: touch.clientY - rect.top,
      }
    }
  }, [])

  // Draw on canvas
  const draw = useCallback((point: Point) => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    if (currentStroke.length === 0) {
      setCurrentStroke([point])
      return
    }

    const lastPoint = currentStroke[currentStroke.length - 1]

    ctx.beginPath()
    ctx.moveTo(lastPoint.x, lastPoint.y)
    ctx.lineTo(point.x, point.y)
    ctx.strokeStyle = penColor
    ctx.lineWidth = penSize
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.stroke()

    setCurrentStroke((prev) => [...prev, point])
  }, [currentStroke, penColor, penSize])

  // Mouse handlers
  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDrawing(true)
    const point = getCanvasCoordinates(e.nativeEvent)
    if (point) {
      setCurrentStroke([point])
    }
  }, [getCanvasCoordinates])

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return
    const point = getCanvasCoordinates(e.nativeEvent)
    if (point) {
      draw(point)
    }
  }, [isDrawing, draw, getCanvasCoordinates])

  const handleMouseUp = useCallback(() => {
    if (isDrawing && currentStroke.length > 0) {
      setStrokes((prev) => [...prev, { points: currentStroke, color: penColor, size: penSize }])
      setCurrentStroke([])
    }
    setIsDrawing(false)
  }, [isDrawing, currentStroke, penColor, penSize])

  // Touch handlers
  const handleTouchStart = useCallback((e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault()
    setIsDrawing(true)
    const point = getCanvasCoordinates(e.nativeEvent)
    if (point) {
      setCurrentStroke([point])
    }
  }, [getCanvasCoordinates])

  const handleTouchMove = useCallback((e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault()
    if (!isDrawing) return
    const point = getCanvasCoordinates(e.nativeEvent)
    if (point) {
      draw(point)
    }
  }, [isDrawing, draw, getCanvasCoordinates])

  const handleTouchEnd = useCallback((e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault()
    if (isDrawing && currentStroke.length > 0) {
      setStrokes((prev) => [...prev, { points: currentStroke, color: penColor, size: penSize }])
      setCurrentStroke([])
    }
    setIsDrawing(false)
  }, [isDrawing, currentStroke, penColor, penSize])

  // Clear canvas
  const handleClear = useCallback(() => {
    setStrokes([])
    setCurrentStroke([])
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    if (backgroundColor === 'transparent') {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
    } else {
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
    }
  }, [backgroundColor])

  // Undo last stroke
  const handleUndo = useCallback(() => {
    if (strokes.length === 0) return
    setStrokes((prev) => prev.slice(0, -1))
  }, [strokes])

  // Download as PNG
  const handleDownload = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const dataUrl = canvas.toDataURL('image/png')
    const link = document.createElement('a')
    link.download = `signature-${Date.now()}.png`
    link.href = dataUrl
    link.click()
  }, [])

  // Copy to clipboard
  const copyToClipboard = useCallback(async () => {
    const canvas = canvasRef.current
    if (!canvas) return

    try {
      canvas.toBlob(async (blob) => {
        if (!blob) return

        if (navigator.clipboard?.write) {
          const item = new ClipboardItem({ 'image/png': blob })
          await navigator.clipboard.write([item])
          setCopiedId('signature')
          setTimeout(() => setCopiedId(null), 2000)
        } else {
          const dataUrl = canvas.toDataURL('image/png')
          await navigator.clipboard.writeText(dataUrl)
          setCopiedId('signature')
          setTimeout(() => setCopiedId(null), 2000)
        }
      }, 'image/png')
    } catch (error) {
      setCopiedId('signature')
      setTimeout(() => setCopiedId(null), 2000)
    }
  }, [])

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('title')}</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('description')}</p>
      </div>

      {/* Main Grid */}
      <div className="grid lg:grid-cols-3 gap-8">
        {/* Settings Panel */}
        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 space-y-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              서명 설정
            </h2>

            {/* Pen Color */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('penColor')}
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={penColor}
                  onChange={(e) => setPenColor(e.target.value)}
                  className="w-16 h-10 rounded border border-gray-300 dark:border-gray-600 cursor-pointer"
                />
                <span className="text-sm text-gray-600 dark:text-gray-400">{penColor}</span>
              </div>
            </div>

            {/* Pen Size */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('penSize')}: {penSize}px
              </label>
              <input
                type="range"
                min="1"
                max="10"
                value={penSize}
                onChange={(e) => setPenSize(Number(e.target.value))}
                className="w-full accent-blue-600"
              />
            </div>

            {/* Background Color */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('backgroundColor')}
              </label>
              <div className="flex gap-3">
                <button
                  onClick={() => setBackgroundColor('transparent')}
                  className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
                    backgroundColor === 'transparent'
                      ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300'
                  }`}
                >
                  {t('transparent')}
                </button>
                <button
                  onClick={() => setBackgroundColor('white')}
                  className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
                    backgroundColor === 'white'
                      ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300'
                  }`}
                >
                  {t('white')}
                </button>
              </div>
            </div>

            {/* Actions */}
            <div className="space-y-2 pt-4 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={handleClear}
                className="w-full flex items-center justify-center gap-2 bg-red-100 dark:bg-red-900 hover:bg-red-200 dark:hover:bg-red-800 text-red-700 dark:text-red-300 rounded-lg px-4 py-3 font-medium transition-colors"
              >
                <Eraser className="w-5 h-5" />
                {t('clear')}
              </button>

              <button
                onClick={handleUndo}
                disabled={strokes.length === 0}
                className="w-full flex items-center justify-center gap-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg px-4 py-3 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Undo2 className="w-5 h-5" />
                {t('undo')}
              </button>

              <button
                onClick={handleDownload}
                className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white rounded-lg px-4 py-3 font-medium transition-colors"
              >
                <Download className="w-5 h-5" />
                {t('downloadPNG')}
              </button>

              <button
                onClick={copyToClipboard}
                className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-lg px-4 py-3 font-medium transition-colors"
              >
                {copiedId === 'signature' ? (
                  <>
                    <Check className="w-5 h-5" />
                    {t('copied')}
                  </>
                ) : (
                  <>
                    <Copy className="w-5 h-5" />
                    {t('copy')}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Canvas Panel */}
        <div className="lg:col-span-2">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              {t('canvas')}
            </h2>
            <div className="relative">
              <canvas
                ref={canvasRef}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                className={`w-full h-[300px] border-2 border-gray-300 dark:border-gray-600 rounded-lg cursor-crosshair ${
                  backgroundColor === 'white' ? 'bg-white' : 'bg-transparent'
                }`}
                style={{ touchAction: 'none' }}
              />
              {strokes.length === 0 && currentStroke.length === 0 && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <p className="text-gray-400 dark:text-gray-500 text-sm">
                    {t('drawHere')}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Guide Section */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
        <div className="flex items-center gap-3 mb-6">
          <BookOpen className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            {t('guide.title')}
          </h2>
        </div>

        <div className="space-y-6">
          {/* Usage */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
              {t('guide.usage.title')}
            </h3>
            <ul className="space-y-2 text-gray-600 dark:text-gray-400">
              {(t.raw('guide.usage.items') as string[]).map((item, index) => (
                <li key={index} className="flex gap-2">
                  <span className="text-blue-600 dark:text-blue-400">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Tips */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
              {t('guide.tips.title')}
            </h3>
            <ul className="space-y-2 text-gray-600 dark:text-gray-400">
              {(t.raw('guide.tips.items') as string[]).map((item, index) => (
                <li key={index} className="flex gap-2">
                  <span className="text-blue-600 dark:text-blue-400">•</span>
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
