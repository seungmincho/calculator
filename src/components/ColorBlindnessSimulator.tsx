'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { Upload, Camera, Download, Info, ChevronDown, ChevronUp } from 'lucide-react'
import GuideSection from '@/components/GuideSection'

// ── CVD Transformation Matrices ──────────────────────────────────────────────
// Based on Brettel/Viénot algorithm (simplified linear approximation)
type Matrix3x3 = [
  [number, number, number],
  [number, number, number],
  [number, number, number]
]

const CVD_MATRICES: Record<string, Matrix3x3> = {
  protanopia: [
    [0.567, 0.433, 0.0],
    [0.558, 0.442, 0.0],
    [0.0,   0.242, 0.758],
  ],
  deuteranopia: [
    [0.625, 0.375, 0.0],
    [0.7,   0.3,   0.0],
    [0.0,   0.3,   0.7],
  ],
  tritanopia: [
    [0.95,  0.05,  0.0],
    [0.0,   0.433, 0.567],
    [0.0,   0.475, 0.525],
  ],
  achromatopsia: [
    [0.299, 0.587, 0.114],
    [0.299, 0.587, 0.114],
    [0.299, 0.587, 0.114],
  ],
}

// Anomaly types blend 50% original + 50% simulated (weak version)
const ANOMALY_BASE: Record<string, string> = {
  protanomaly: 'protanopia',
  deuteranomaly: 'deuteranopia',
  tritanomaly: 'tritanopia',
}

const CVD_TYPES = [
  'normal',
  'protanopia',
  'deuteranopia',
  'tritanopia',
  'protanomaly',
  'deuteranomaly',
  'tritanomaly',
  'achromatopsia',
] as const

type CvdType = typeof CVD_TYPES[number]

// ── Apply CVD filter to ImageData ─────────────────────────────────────────────
function applyFilter(imageData: ImageData, type: CvdType): ImageData {
  if (type === 'normal') return imageData

  const output = new ImageData(
    new Uint8ClampedArray(imageData.data),
    imageData.width,
    imageData.height
  )

  const isAnomaly = type in ANOMALY_BASE
  const matrixKey = isAnomaly ? ANOMALY_BASE[type] : type
  const matrix = CVD_MATRICES[matrixKey]

  const data = imageData.data
  const out = output.data

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i] / 255
    const g = data[i + 1] / 255
    const b = data[i + 2] / 255

    const nr = matrix[0][0] * r + matrix[0][1] * g + matrix[0][2] * b
    const ng = matrix[1][0] * r + matrix[1][1] * g + matrix[1][2] * b
    const nb = matrix[2][0] * r + matrix[2][1] * g + matrix[2][2] * b

    if (isAnomaly) {
      // Blend 50% original + 50% simulated for "weak" types
      out[i]     = Math.round((r * 0.5 + nr * 0.5) * 255)
      out[i + 1] = Math.round((g * 0.5 + ng * 0.5) * 255)
      out[i + 2] = Math.round((b * 0.5 + nb * 0.5) * 255)
    } else {
      out[i]     = Math.round(nr * 255)
      out[i + 1] = Math.round(ng * 255)
      out[i + 2] = Math.round(nb * 255)
    }
    out[i + 3] = data[i + 3] // alpha unchanged
  }

  return output
}

// ── Generate Sample Images with Canvas ────────────────────────────────────────
type SampleKey = 'colorWheel' | 'ishihara' | 'trafficLight'

function generateColorWheel(size: number): ImageData {
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')!
  const cx = size / 2
  const cy = size / 2
  const radius = size / 2 - 4

  // Hue ring + luminance gradient
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = x - cx
      const dy = y - cy
      const dist = Math.sqrt(dx * dx + dy * dy)
      if (dist <= radius) {
        const angle = Math.atan2(dy, dx)
        const hue = ((angle * 180) / Math.PI + 360) % 360
        const saturation = dist / radius
        ctx.fillStyle = `hsl(${hue}, ${saturation * 100}%, 50%)`
        ctx.fillRect(x, y, 1, 1)
      }
    }
  }

  // Inner white circle
  ctx.beginPath()
  ctx.arc(cx, cy, radius * 0.18, 0, Math.PI * 2)
  ctx.fillStyle = 'white'
  ctx.fill()

  return ctx.getImageData(0, 0, size, size)
}

function generateIshihara(size: number): ImageData {
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')!

  // Background: random green/yellow dots
  const rng = (seed: number) => {
    let s = seed
    return () => {
      s = (s * 9301 + 49297) % 233280
      return s / 233280
    }
  }
  const rand = rng(42)

  // Fill background
  ctx.fillStyle = '#f5f5f0'
  ctx.fillRect(0, 0, size, size)

  // Clip to circle
  ctx.save()
  ctx.beginPath()
  ctx.arc(size / 2, size / 2, size / 2 - 2, 0, Math.PI * 2)
  ctx.clip()

  // Draw many small dots (Ishihara style)
  const numDots = 800
  const cx = size / 2
  const cy = size / 2
  const R = size / 2 - 4

  // Define the number "74" region roughly (for demonstration)
  // We use a simple bitmask approach: define regions where red/orange dots appear
  const isInDigitRegion = (x: number, y: number) => {
    const nx = (x - cx) / R  // -1 to 1
    const ny = (y - cy) / R  // -1 to 1
    // Approximate "7" on the left, "4" on the right using simple shapes
    const inSeven = (
      (ny < -0.1 && ny > -0.6 && nx > -0.5 && nx < 0.1 && Math.abs(ny + 0.1) < 0.08) || // top bar
      (nx > 0.0 && nx < 0.1 && ny > -0.6 && ny < 0.4) // diagonal
    )
    const inFour = (
      (nx > 0.1 && nx < 0.5 && ny > -0.5 && ny < 0.0 && Math.abs(nx - 0.1) < 0.06) || // left arm
      (ny > -0.1 && ny < 0.0 && nx > 0.1 && nx < 0.5) || // horizontal bar
      (nx > 0.35 && nx < 0.45 && ny > -0.5 && ny < 0.4) // vertical
    )
    return inSeven || inFour
  }

  for (let i = 0; i < numDots; i++) {
    const angle = rand() * Math.PI * 2
    const r = Math.sqrt(rand()) * R
    const x = cx + r * Math.cos(angle)
    const y = cy + r * Math.sin(angle)
    const dotR = 4 + rand() * 10

    if (isInDigitRegion(x, y)) {
      // Red/orange spectrum dots for the digit
      const hue = 10 + rand() * 30
      ctx.fillStyle = `hsl(${hue}, 80%, 50%)`
    } else {
      // Green spectrum dots for background
      const hue = 80 + rand() * 60
      const light = 35 + rand() * 30
      ctx.fillStyle = `hsl(${hue}, 60%, ${light}%)`
    }
    ctx.beginPath()
    ctx.arc(x, y, dotR, 0, Math.PI * 2)
    ctx.fill()
  }

  ctx.restore()

  // Border circle
  ctx.beginPath()
  ctx.arc(cx, cy, R, 0, Math.PI * 2)
  ctx.strokeStyle = '#999'
  ctx.lineWidth = 2
  ctx.stroke()

  return ctx.getImageData(0, 0, size, size)
}

function generateTrafficLight(size: number): ImageData {
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')!

  // Sky background gradient
  const sky = ctx.createLinearGradient(0, 0, 0, size * 0.65)
  sky.addColorStop(0, '#87ceeb')
  sky.addColorStop(1, '#d4f1f9')
  ctx.fillStyle = sky
  ctx.fillRect(0, 0, size, size * 0.65)

  // Ground
  const ground = ctx.createLinearGradient(0, size * 0.65, 0, size)
  ground.addColorStop(0, '#4a7c59')
  ground.addColorStop(1, '#2d5a3a')
  ctx.fillStyle = ground
  ctx.fillRect(0, size * 0.65, size, size * 0.35)

  // Road
  ctx.fillStyle = '#555'
  ctx.fillRect(size * 0.3, size * 0.55, size * 0.4, size * 0.45)
  ctx.fillStyle = '#fff'
  for (let i = 0; i < 4; i++) {
    ctx.fillRect(size * 0.47, size * 0.62 + i * size * 0.1, size * 0.06, size * 0.06)
  }

  // Traffic light pole
  ctx.fillStyle = '#333'
  ctx.fillRect(size * 0.44, size * 0.1, size * 0.04, size * 0.55)

  // Traffic light housing
  const housingX = size * 0.32
  const housingY = size * 0.05
  const housingW = size * 0.28
  const housingH = size * 0.42
  ctx.fillStyle = '#222'
  ctx.beginPath()
  ctx.roundRect(housingX, housingY, housingW, housingH, 8)
  ctx.fill()

  // Lights: red, yellow, green
  const lights = [
    { color: '#ff2200', glowColor: 'rgba(255,34,0,0.4)', y: 0.11 },
    { color: '#ffcc00', glowColor: 'rgba(255,204,0,0.4)', y: 0.21 },
    { color: '#00cc44', glowColor: 'rgba(0,204,68,0.4)', y: 0.31 },
  ]

  lights.forEach(({ color, glowColor, y }) => {
    const lx = size * 0.46
    const ly = size * y
    const lr = size * 0.07

    // Glow
    const grd = ctx.createRadialGradient(lx, ly, 0, lx, ly, lr * 2.5)
    grd.addColorStop(0, glowColor)
    grd.addColorStop(1, 'transparent')
    ctx.fillStyle = grd
    ctx.beginPath()
    ctx.arc(lx, ly, lr * 2.5, 0, Math.PI * 2)
    ctx.fill()

    // Main light
    ctx.fillStyle = color
    ctx.beginPath()
    ctx.arc(lx, ly, lr, 0, Math.PI * 2)
    ctx.fill()
  })

  // Some foliage for variety
  const foliage = [
    { x: 0.07, y: 0.52, r: 0.1, color: '#2d6b3f' },
    { x: 0.12, y: 0.45, r: 0.09, color: '#3a7a4a' },
    { x: 0.82, y: 0.50, r: 0.11, color: '#2d6b3f' },
    { x: 0.87, y: 0.43, r: 0.09, color: '#3a7a4a' },
  ]
  foliage.forEach(({ x, y, r, color }) => {
    ctx.fillStyle = color
    ctx.beginPath()
    ctx.arc(x * size, y * size, r * size, 0, Math.PI * 2)
    ctx.fill()
  })

  return ctx.getImageData(0, 0, size, size)
}

// ── Component ──────────────────────────────────────────────────────────────────
export default function ColorBlindnessSimulator() {
  const t = useTranslations('colorBlindnessSimulator')

  const [selectedType, setSelectedType] = useState<CvdType>('deuteranomaly')
  const [originalImageData, setOriginalImageData] = useState<ImageData | null>(null)
  const [naturalWidth, setNaturalWidth] = useState(0)
  const [naturalHeight, setNaturalHeight] = useState(0)
  const [processing, setProcessing] = useState(false)
  const [sliderX, setSliderX] = useState(50) // percent
  const [isDraggingSlider, setIsDraggingSlider] = useState(false)
  const [showInfo, setShowInfo] = useState(false)
  const [isDraggingFile, setIsDraggingFile] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const originalCanvasRef = useRef<HTMLCanvasElement>(null)
  const filteredCanvasRef = useRef<HTMLCanvasElement>(null)
  const sliderContainerRef = useRef<HTMLDivElement>(null)

  // Draw both canvases whenever image or type changes
  useEffect(() => {
    if (!originalImageData) return
    const origCanvas = originalCanvasRef.current
    const filtCanvas = filteredCanvasRef.current
    if (!origCanvas || !filtCanvas) return

    // Original
    origCanvas.width = originalImageData.width
    origCanvas.height = originalImageData.height
    const origCtx = origCanvas.getContext('2d')!
    origCtx.putImageData(originalImageData, 0, 0)

    // Filtered
    filtCanvas.width = originalImageData.width
    filtCanvas.height = originalImageData.height
    const filtCtx = filtCanvas.getContext('2d')!

    setProcessing(true)
    // Use rAF so UI stays responsive for large images
    requestAnimationFrame(() => {
      const filtered = applyFilter(originalImageData, selectedType)
      filtCtx.putImageData(filtered, 0, 0)
      setProcessing(false)
    })
  }, [originalImageData, selectedType])

  // Load image from File or Blob
  const loadImage = useCallback((file: File) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const img = new Image()
      img.onload = () => {
        // Cap resolution for performance
        const MAX = 1200
        let w = img.naturalWidth
        let h = img.naturalHeight
        if (w > MAX || h > MAX) {
          const scale = MAX / Math.max(w, h)
          w = Math.round(w * scale)
          h = Math.round(h * scale)
        }
        const tmpCanvas = document.createElement('canvas')
        tmpCanvas.width = w
        tmpCanvas.height = h
        const ctx = tmpCanvas.getContext('2d')!
        ctx.drawImage(img, 0, 0, w, h)
        setNaturalWidth(w)
        setNaturalHeight(h)
        setOriginalImageData(ctx.getImageData(0, 0, w, h))
        setSliderX(50)
      }
      img.src = e.target!.result as string
    }
    reader.readAsDataURL(file)
  }, [])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) loadImage(file)
    e.target.value = ''
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDraggingFile(false)
    const file = e.dataTransfer.files?.[0]
    if (file && file.type.startsWith('image/')) loadImage(file)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDraggingFile(true)
  }

  const handleDragLeave = () => setIsDraggingFile(false)

  // Load a sample image
  const loadSample = useCallback((key: SampleKey) => {
    const size = 600
    let imageData: ImageData
    if (key === 'colorWheel') {
      imageData = generateColorWheel(size)
    } else if (key === 'ishihara') {
      imageData = generateIshihara(size)
    } else {
      imageData = generateTrafficLight(size)
    }
    setNaturalWidth(size)
    setNaturalHeight(size)
    setOriginalImageData(imageData)
    setSliderX(50)
  }, [])

  // Slider drag logic
  const handleSliderMouseDown = (e: React.MouseEvent) => {
    e.preventDefault()
    setIsDraggingSlider(true)
  }

  useEffect(() => {
    if (!isDraggingSlider) return
    const move = (e: MouseEvent | TouchEvent) => {
      const container = sliderContainerRef.current
      if (!container) return
      const rect = container.getBoundingClientRect()
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
      const pct = Math.min(100, Math.max(0, ((clientX - rect.left) / rect.width) * 100))
      setSliderX(pct)
    }
    const up = () => setIsDraggingSlider(false)
    window.addEventListener('mousemove', move)
    window.addEventListener('mouseup', up)
    window.addEventListener('touchmove', move)
    window.addEventListener('touchend', up)
    return () => {
      window.removeEventListener('mousemove', move)
      window.removeEventListener('mouseup', up)
      window.removeEventListener('touchmove', move)
      window.removeEventListener('touchend', up)
    }
  }, [isDraggingSlider])

  // Download filtered image
  const handleDownload = () => {
    const canvas = filteredCanvasRef.current
    if (!canvas) return
    const link = document.createElement('a')
    link.download = `color-blind-${selectedType}.png`
    link.href = canvas.toDataURL('image/png')
    link.click()
  }

  const hasImage = !!originalImageData

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('title')}</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('description')}</p>
      </div>

      {/* Upload Zone + Sample Buttons */}
      {!hasImage && (
        <div
          className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors ${
            isDraggingFile
              ? 'border-blue-500 bg-blue-50 dark:bg-blue-950'
              : 'border-gray-300 dark:border-gray-600 hover:border-blue-400 dark:hover:border-blue-500 bg-white dark:bg-gray-800'
          }`}
          onClick={() => fileInputRef.current?.click()}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
        >
          <Upload className="w-10 h-10 text-gray-400 dark:text-gray-500 mx-auto mb-3" />
          <p className="text-gray-700 dark:text-gray-300 font-medium">{t('uploadPrompt')}</p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{t('uploadSubPrompt')}</p>

          <div className="flex flex-wrap justify-center gap-2 mt-6">
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); cameraInputRef.current?.click() }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg text-sm transition-colors"
            >
              <Camera className="w-4 h-4" />
              {t('cameraButton')}
            </button>
          </div>
        </div>
      )}

      {/* Sample Images */}
      <div className="flex flex-wrap gap-2 items-center">
        <span className="text-sm text-gray-500 dark:text-gray-400 font-medium">{t('sampleImages')}:</span>
        {(['colorWheel', 'ishihara', 'trafficLight'] as SampleKey[]).map((key) => (
          <button
            key={key}
            onClick={() => loadSample(key)}
            className="px-3 py-1.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 hover:border-blue-400 dark:hover:border-blue-500 rounded-lg text-sm text-gray-700 dark:text-gray-300 transition-colors"
          >
            {t(`sample${key.charAt(0).toUpperCase() + key.slice(1)}` as `sampleColorWheel` | `sampleIshihara` | `sampleTrafficLight`)}
          </button>
        ))}
        {hasImage && (
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 hover:border-blue-400 rounded-lg text-sm text-gray-700 dark:text-gray-300 transition-colors"
          >
            <Upload className="w-3.5 h-3.5" />
            {t('uploadPrompt').split(' ')[0]}
          </button>
        )}
      </div>

      {/* Type Selector */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4">
        <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">{t('typeSelector')}</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {CVD_TYPES.map((type) => {
            const typeName = t(`types.${type}.name`)
            const typeDesc = t(`types.${type}.description`)
            const prevalence = type !== 'normal' ? t(`types.${type}.prevalence` as `types.protanopia.prevalence`) : null
            return (
              <button
                key={type}
                onClick={() => setSelectedType(type)}
                className={`text-left p-2.5 rounded-lg border-2 transition-all ${
                  selectedType === type
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-950'
                    : 'border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-700 bg-white dark:bg-gray-800'
                }`}
              >
                <div className="text-xs font-semibold text-gray-900 dark:text-white leading-tight">{typeName}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 leading-tight">{typeDesc}</div>
                {prevalence && (
                  <div className="text-xs text-blue-600 dark:text-blue-400 mt-1">{prevalence}</div>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Image Comparison View */}
      {hasImage && (
        <div className="space-y-4">
          {processing && (
            <div className="text-center text-sm text-gray-500 dark:text-gray-400 animate-pulse">
              {t('processing')}
            </div>
          )}

          {/* Side-by-side on mobile, slider on desktop */}
          <div className="space-y-4 lg:hidden">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden">
              <div className="px-4 py-2 bg-gray-50 dark:bg-gray-700 text-xs font-semibold text-gray-600 dark:text-gray-300 border-b border-gray-200 dark:border-gray-600">
                {t('original')}
              </div>
              <canvas
                ref={originalCanvasRef}
                className="w-full h-auto block"
                style={{ maxHeight: '320px', objectFit: 'contain' }}
              />
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden">
              <div className="px-4 py-2 bg-blue-50 dark:bg-blue-950 text-xs font-semibold text-blue-700 dark:text-blue-300 border-b border-blue-200 dark:border-blue-800">
                {t('simulated')} — {t(`types.${selectedType}.name`)}
              </div>
              <canvas
                ref={filteredCanvasRef}
                className="w-full h-auto block"
                style={{ maxHeight: '320px', objectFit: 'contain' }}
              />
            </div>
          </div>

          {/* Slider comparison — desktop */}
          <div className="hidden lg:block">
            <div
              ref={sliderContainerRef}
              className="relative rounded-xl overflow-hidden shadow-md select-none cursor-ew-resize bg-gray-100 dark:bg-gray-900"
              style={{
                aspectRatio: naturalWidth > 0 ? `${naturalWidth}/${naturalHeight}` : '4/3',
              }}
              onMouseDown={handleSliderMouseDown}
              onTouchStart={() => setIsDraggingSlider(true)}
            >
              {/* Filtered (full) */}
              <canvas
                ref={filteredCanvasRef}
                className="absolute inset-0 w-full h-full"
                style={{ objectFit: 'contain' }}
              />
              {/* Original (clipped to left side) */}
              <div
                className="absolute inset-0 overflow-hidden"
                style={{ width: `${sliderX}%` }}
              >
                <canvas
                  ref={originalCanvasRef}
                  className="absolute inset-0 w-full h-full"
                  style={{
                    width: `${100 / (sliderX / 100)}%`,
                    maxWidth: 'none',
                    objectFit: 'contain',
                  }}
                />
              </div>

              {/* Divider line + handle */}
              <div
                className="absolute top-0 bottom-0 w-0.5 bg-white shadow-lg z-10"
                style={{ left: `${sliderX}%`, transform: 'translateX(-50%)' }}
              >
                <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-8 h-8 bg-white rounded-full shadow-lg flex items-center justify-center cursor-ew-resize">
                  <svg className="w-4 h-4 text-gray-600" viewBox="0 0 16 16" fill="currentColor">
                    <path d="M5 8l3-3v6L5 8zm6 0l-3 3V5l3 3z" />
                  </svg>
                </div>
              </div>

              {/* Labels */}
              <div className="absolute top-2 left-2 px-2 py-0.5 bg-black/60 text-white text-xs rounded">
                {t('original')}
              </div>
              <div className="absolute top-2 right-2 px-2 py-0.5 bg-blue-600/80 text-white text-xs rounded">
                {t('simulated')}
              </div>
            </div>
            <p className="text-center text-xs text-gray-400 dark:text-gray-500 mt-1">{t('sliderHint')}</p>
          </div>

          {/* Download */}
          <div className="flex justify-end">
            <button
              onClick={handleDownload}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-lg text-sm font-medium transition-colors"
            >
              <Download className="w-4 h-4" />
              {t('download')}
            </button>
          </div>
        </div>
      )}

      {!hasImage && (
        <div className="text-center text-gray-400 dark:text-gray-500 py-4 text-sm">{t('noImage')}</div>
      )}

      {/* Info Panel */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden">
        <button
          onClick={() => setShowInfo(!showInfo)}
          className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
        >
          <div className="flex items-center gap-2 font-semibold text-gray-900 dark:text-white">
            <Info className="w-4 h-4 text-blue-500" />
            {t('infoPanel.title')}
          </div>
          {showInfo ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
        </button>

        {showInfo && (
          <div className="px-5 pb-5 space-y-4 border-t border-gray-100 dark:border-gray-700 pt-4">
            <div>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">{t('infoPanel.whatIs')}</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">{t('infoPanel.whatIsText')}</p>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">{t('infoPanel.designTip')}</h3>
              <ul className="space-y-1.5">
                {(t.raw('infoPanel.designTipItems') as string[]).map((item, i) => (
                  <li key={i} className="flex gap-2 text-sm text-gray-600 dark:text-gray-400">
                    <span className="text-blue-500 mt-0.5 flex-shrink-0">•</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* CVD type table */}
            <div>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">{t('typeSelector')}</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="bg-gray-50 dark:bg-gray-700">
                      <th className="text-left px-3 py-2 text-gray-700 dark:text-gray-300 font-medium border border-gray-200 dark:border-gray-600">유형</th>
                      <th className="text-left px-3 py-2 text-gray-700 dark:text-gray-300 font-medium border border-gray-200 dark:border-gray-600">설명</th>
                      <th className="text-left px-3 py-2 text-gray-700 dark:text-gray-300 font-medium border border-gray-200 dark:border-gray-600">{t('prevalence')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {CVD_TYPES.filter(t2 => t2 !== 'normal').map((type) => (
                      <tr key={type} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                        <td className="px-3 py-2 border border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white font-medium whitespace-nowrap">
                          {t(`types.${type}.name`)}
                        </td>
                        <td className="px-3 py-2 border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400">
                          {t(`types.${type}.description`)}
                        </td>
                        <td className="px-3 py-2 border border-gray-200 dark:border-gray-600 text-blue-600 dark:text-blue-400 whitespace-nowrap">
                          {t(`types.${type}.prevalence` as `types.protanopia.prevalence`)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* FAQ */}
            <div>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">FAQ</h3>
              <div className="space-y-3">
                {(['q1', 'q2', 'q3', 'q4'] as const).map((key) => (
                  <div key={key} className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
                    <p className="text-sm font-medium text-gray-900 dark:text-white mb-1">Q. {t(`faq.${key}.q`)}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">A. {t(`faq.${key}.a`)}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Hidden inputs */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFileChange}
      />

      <GuideSection namespace="colorBlindnessSimulator" />
    </div>
  )
}
