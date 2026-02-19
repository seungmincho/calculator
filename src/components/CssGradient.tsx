'use client'

import { useState, useCallback, useMemo, useRef } from 'react'
import { useTranslations } from 'next-intl'
import {
  Copy,
  Check,
  Shuffle,
  BookOpen,
  Plus,
  Trash2,
  Maximize2,
  Minimize2,
  Download,
  ArrowLeftRight,
  ChevronDown,
  ChevronUp,
  RotateCcw,
} from 'lucide-react'

// ── Types ──

type GradientType = 'linear' | 'radial' | 'conic'
type RadialShape = 'circle' | 'ellipse'
type RadialPosition = 'center' | 'top' | 'bottom' | 'left' | 'right'

interface ColorStop {
  id: string
  color: string
  position: number
}

interface Preset {
  name: string
  type: GradientType
  angle: number
  colorStops: Omit<ColorStop, 'id'>[]
}

// ── Constants ──

const MAX_COLORS = 8

const DIRECTION_ARROWS: { angle: number; label: string; arrow: string }[] = [
  { angle: 0, label: 'top', arrow: '\u2191' },
  { angle: 45, label: 'top-right', arrow: '\u2197' },
  { angle: 90, label: 'right', arrow: '\u2192' },
  { angle: 135, label: 'bottom-right', arrow: '\u2198' },
  { angle: 180, label: 'bottom', arrow: '\u2193' },
  { angle: 225, label: 'bottom-left', arrow: '\u2199' },
  { angle: 270, label: 'left', arrow: '\u2190' },
  { angle: 315, label: 'top-left', arrow: '\u2196' },
]

const RADIAL_POSITIONS: RadialPosition[] = ['center', 'top', 'bottom', 'left', 'right']

const PRESETS: Preset[] = [
  { name: 'sunset', type: 'linear', angle: 135, colorStops: [{ color: '#f093fb', position: 0 }, { color: '#f5576c', position: 100 }] },
  { name: 'ocean', type: 'linear', angle: 135, colorStops: [{ color: '#667eea', position: 0 }, { color: '#764ba2', position: 100 }] },
  { name: 'forest', type: 'linear', angle: 135, colorStops: [{ color: '#11998e', position: 0 }, { color: '#38ef7d', position: 100 }] },
  { name: 'fire', type: 'linear', angle: 135, colorStops: [{ color: '#f12711', position: 0 }, { color: '#f5af19', position: 100 }] },
  { name: 'night', type: 'linear', angle: 135, colorStops: [{ color: '#0f0c29', position: 0 }, { color: '#302b63', position: 50 }, { color: '#24243e', position: 100 }] },
  { name: 'candy', type: 'linear', angle: 135, colorStops: [{ color: '#fc5c7d', position: 0 }, { color: '#6a82fb', position: 100 }] },
  { name: 'mint', type: 'linear', angle: 135, colorStops: [{ color: '#00b09b', position: 0 }, { color: '#96c93d', position: 100 }] },
  { name: 'aurora', type: 'linear', angle: 135, colorStops: [{ color: '#a8edea', position: 0 }, { color: '#fed6e3', position: 100 }] },
  { name: 'peach', type: 'linear', angle: 135, colorStops: [{ color: '#ffecd2', position: 0 }, { color: '#fcb69f', position: 100 }] },
  { name: 'sky', type: 'linear', angle: 180, colorStops: [{ color: '#a1c4fd', position: 0 }, { color: '#c2e9fb', position: 100 }] },
  { name: 'lavender', type: 'linear', angle: 135, colorStops: [{ color: '#e0c3fc', position: 0 }, { color: '#8ec5fc', position: 100 }] },
  { name: 'neon', type: 'linear', angle: 90, colorStops: [{ color: '#00f260', position: 0 }, { color: '#0575e6', position: 100 }] },
  { name: 'rainbow', type: 'linear', angle: 90, colorStops: [{ color: '#ff0000', position: 0 }, { color: '#ff8800', position: 20 }, { color: '#ffff00', position: 40 }, { color: '#00ff00', position: 60 }, { color: '#0066ff', position: 80 }, { color: '#8800ff', position: 100 }] },
  { name: 'steel', type: 'linear', angle: 135, colorStops: [{ color: '#485563', position: 0 }, { color: '#29323c', position: 100 }] },
  { name: 'wine', type: 'linear', angle: 135, colorStops: [{ color: '#6a0572', position: 0 }, { color: '#ab2d6b', position: 100 }] },
  { name: 'spring', type: 'linear', angle: 135, colorStops: [{ color: '#f9d423', position: 0 }, { color: '#ff4e50', position: 100 }] },
]

// ── Helpers ──

let idCounter = 0
function generateId(): string {
  idCounter += 1
  return `stop-${Date.now()}-${idCounter}`
}

function randomHexColor(): string {
  return '#' + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0')
}

function angleToDirection(angle: number): string | null {
  const map: Record<number, string> = {
    0: 'to top',
    45: 'to top right',
    90: 'to right',
    135: 'to bottom right',
    180: 'to bottom',
    225: 'to bottom left',
    270: 'to left',
    315: 'to top left',
  }
  return map[angle] ?? null
}

/** Approximate Tailwind class for simple 2-color linear gradients */
function getTailwindHint(
  type: GradientType,
  angle: number,
  stops: ColorStop[]
): string | null {
  if (type !== 'linear' || stops.length !== 2) return null
  const dirMap: Record<number, string> = {
    0: 't',
    45: 'tr',
    90: 'r',
    135: 'br',
    180: 'b',
    225: 'bl',
    270: 'l',
    315: 'tl',
  }
  const dir = dirMap[angle]
  if (!dir) return null
  return `bg-gradient-to-${dir} from-[${stops[0].color}] to-[${stops[1].color}]`
}

// ── Component ──

export default function CssGradient() {
  const t = useTranslations('cssGradient')

  // ── State ──
  const [gradientType, setGradientType] = useState<GradientType>('linear')
  const [angle, setAngle] = useState(135)
  const [radialShape, setRadialShape] = useState<RadialShape>('circle')
  const [radialPosition, setRadialPosition] = useState<RadialPosition>('center')
  const [repeating, setRepeating] = useState(false)
  const [colorStops, setColorStops] = useState<ColorStop[]>([
    { id: generateId(), color: '#667eea', position: 0 },
    { id: generateId(), color: '#764ba2', position: 100 },
  ])
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [showVendorPrefix, setShowVendorPrefix] = useState(false)
  const [showTailwind, setShowTailwind] = useState(false)

  const previewRef = useRef<HTMLDivElement>(null)

  // ── Gradient CSS generation ──

  const stopsString = useMemo(() => {
    const sorted = [...colorStops].sort((a, b) => a.position - b.position)
    return sorted.map((s) => `${s.color} ${s.position}%`).join(', ')
  }, [colorStops])

  const gradientCss = useMemo(() => {
    const prefix = repeating ? 'repeating-' : ''
    switch (gradientType) {
      case 'linear': {
        const dir = angleToDirection(angle)
        const dirStr = dir ?? `${angle}deg`
        return `${prefix}linear-gradient(${dirStr}, ${stopsString})`
      }
      case 'radial': {
        const pos = radialPosition === 'center' ? '' : ` at ${radialPosition}`
        return `${prefix}radial-gradient(${radialShape}${pos}, ${stopsString})`
      }
      case 'conic': {
        return `${prefix}conic-gradient(from ${angle}deg, ${stopsString})`
      }
    }
  }, [gradientType, angle, radialShape, radialPosition, repeating, stopsString])

  const fullCssRule = `background: ${gradientCss};`

  const vendorPrefixCss = useMemo(() => {
    return `background: -webkit-${gradientCss};\nbackground: ${gradientCss};`
  }, [gradientCss])

  const tailwindHint = useMemo(
    () => getTailwindHint(gradientType, angle, colorStops),
    [gradientType, angle, colorStops]
  )

  // Visual gradient bar: always linear for visualization
  const barGradient = useMemo(() => {
    const sorted = [...colorStops].sort((a, b) => a.position - b.position)
    const stops = sorted.map((s) => `${s.color} ${s.position}%`).join(', ')
    return `linear-gradient(to right, ${stops})`
  }, [colorStops])

  // ── Actions ──

  const copyToClipboard = useCallback(async (text: string, id: string) => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text)
      } else {
        const textarea = document.createElement('textarea')
        textarea.value = text
        textarea.style.position = 'fixed'
        textarea.style.left = '-999999px'
        document.body.appendChild(textarea)
        textarea.select()
        document.execCommand('copy')
        document.body.removeChild(textarea)
      }
      setCopiedId(id)
      setTimeout(() => setCopiedId(null), 2000)
    } catch {
      setCopiedId(id)
      setTimeout(() => setCopiedId(null), 2000)
    }
  }, [])

  const addColorStop = useCallback(() => {
    if (colorStops.length >= MAX_COLORS) return
    const lastPos = colorStops[colorStops.length - 1]?.position ?? 0
    const newPos = Math.min(100, lastPos + Math.round(100 / (colorStops.length + 1)))
    setColorStops((prev) => [
      ...prev,
      { id: generateId(), color: randomHexColor(), position: newPos },
    ])
  }, [colorStops.length, colorStops])

  const removeColorStop = useCallback(
    (id: string) => {
      if (colorStops.length <= 2) return
      setColorStops((prev) => prev.filter((s) => s.id !== id))
    },
    [colorStops.length]
  )

  const updateColorStop = useCallback(
    (id: string, field: 'color' | 'position', value: string | number) => {
      setColorStops((prev) =>
        prev.map((s) => (s.id === id ? { ...s, [field]: value } : s))
      )
    },
    []
  )

  const applyPreset = useCallback((preset: Preset) => {
    setGradientType(preset.type)
    setAngle(preset.angle)
    setRepeating(false)
    setColorStops(
      preset.colorStops.map((s) => ({
        ...s,
        id: generateId(),
      }))
    )
  }, [])

  const handleRandom = useCallback(() => {
    const count = 2 + Math.floor(Math.random() * 3) // 2-4 stops
    const stops: ColorStop[] = []
    for (let i = 0; i < count; i++) {
      stops.push({
        id: generateId(),
        color: randomHexColor(),
        position: Math.round((i / (count - 1)) * 100),
      })
    }
    setAngle(Math.floor(Math.random() * 360))
    setColorStops(stops)
  }, [])

  const handleReverse = useCallback(() => {
    setColorStops((prev) =>
      prev.map((s) => ({ ...s, position: 100 - s.position }))
    )
  }, [])

  const handleReset = useCallback(() => {
    setGradientType('linear')
    setAngle(135)
    setRadialShape('circle')
    setRadialPosition('center')
    setRepeating(false)
    setColorStops([
      { id: generateId(), color: '#667eea', position: 0 },
      { id: generateId(), color: '#764ba2', position: 100 },
    ])
  }, [])

  const exportPng = useCallback(() => {
    const canvas = document.createElement('canvas')
    canvas.width = 1920
    canvas.height = 1080
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const sorted = [...colorStops].sort((a, b) => a.position - b.position)

    if (gradientType === 'radial') {
      const cx = canvas.width / 2
      const cy = canvas.height / 2
      const r = Math.max(canvas.width, canvas.height) / 2
      const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r)
      sorted.forEach((s) => {
        grad.addColorStop(s.position / 100, s.color)
      })
      ctx.fillStyle = grad
      ctx.fillRect(0, 0, canvas.width, canvas.height)
    } else {
      // linear and conic both export as linear for canvas compatibility
      const rad = ((angle - 90) * Math.PI) / 180
      const cx = canvas.width / 2
      const cy = canvas.height / 2
      const len = Math.max(canvas.width, canvas.height)
      const x0 = cx - Math.cos(rad) * len
      const y0 = cy - Math.sin(rad) * len
      const x1 = cx + Math.cos(rad) * len
      const y1 = cy + Math.sin(rad) * len

      const grad = ctx.createLinearGradient(x0, y0, x1, y1)
      sorted.forEach((s) => {
        grad.addColorStop(s.position / 100, s.color)
      })
      ctx.fillStyle = grad
      ctx.fillRect(0, 0, canvas.width, canvas.height)
    }

    const link = document.createElement('a')
    link.download = 'gradient.png'
    link.href = canvas.toDataURL('image/png')
    link.click()
  }, [gradientType, angle, colorStops])

  const toggleFullscreen = useCallback(() => {
    setIsFullscreen((prev) => !prev)
  }, [])

  // ── Checkerboard pattern for transparency preview ──
  const checkerboardStyle: React.CSSProperties = {
    backgroundImage:
      'linear-gradient(45deg, #ccc 25%, transparent 25%), linear-gradient(-45deg, #ccc 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #ccc 75%), linear-gradient(-45deg, transparent 75%, #ccc 75%)',
    backgroundSize: '20px 20px',
    backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px',
  }

  // ── Render ──

  return (
    <>
      {/* Fullscreen overlay */}
      {isFullscreen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0"
            style={{ background: gradientCss }}
          />
          <button
            onClick={toggleFullscreen}
            className="absolute top-6 right-6 z-10 bg-black/50 hover:bg-black/70 text-white rounded-lg px-4 py-2 flex items-center gap-2 transition-colors"
          >
            <Minimize2 className="w-5 h-5" />
            {t('exitFullscreen')}
          </button>
        </div>
      )}

      <div className="space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {t('title')}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {t('description')}
          </p>
        </div>

        {/* Preview Section */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              {t('preview')}
            </h2>
            <div className="flex gap-2">
              <button
                onClick={exportPng}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg transition-colors"
              >
                <Download className="w-4 h-4" />
                {t('exportPng')}
              </button>
              <button
                onClick={toggleFullscreen}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg transition-colors"
              >
                <Maximize2 className="w-4 h-4" />
                {t('fullscreen')}
              </button>
            </div>
          </div>
          <div className="rounded-xl overflow-hidden" style={checkerboardStyle}>
            <div
              ref={previewRef}
              className="min-h-[300px] rounded-xl"
              style={{ background: gradientCss }}
            />
          </div>
        </div>

        {/* CSS Code Output */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              {t('cssCode')}
            </h2>
            <button
              onClick={() => copyToClipboard(fullCssRule, 'css-main')}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg font-medium hover:from-blue-700 hover:to-indigo-700 transition-colors"
            >
              {copiedId === 'css-main' ? (
                <Check className="w-4 h-4" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
              {copiedId === 'css-main' ? t('copied') : t('copy')}
            </button>
          </div>
          <pre className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 text-sm font-mono text-gray-800 dark:text-gray-200 overflow-x-auto whitespace-pre-wrap break-all">
            {fullCssRule}
          </pre>

          {/* Vendor prefix toggle */}
          <div className="border-t border-gray-200 dark:border-gray-700 pt-3">
            <button
              onClick={() => setShowVendorPrefix((v) => !v)}
              className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 transition-colors"
            >
              {showVendorPrefix ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
              {t('cssWithPrefix')}
            </button>
            {showVendorPrefix && (
              <div className="mt-2 relative">
                <pre className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 text-sm font-mono text-gray-800 dark:text-gray-200 overflow-x-auto whitespace-pre-wrap break-all pr-12">
                  {vendorPrefixCss}
                </pre>
                <button
                  onClick={() => copyToClipboard(vendorPrefixCss, 'css-vendor')}
                  className="absolute top-2 right-2 p-1.5 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded-md transition-colors"
                >
                  {copiedId === 'css-vendor' ? (
                    <Check className="w-3.5 h-3.5 text-green-600" />
                  ) : (
                    <Copy className="w-3.5 h-3.5 text-gray-600 dark:text-gray-400" />
                  )}
                </button>
              </div>
            )}
          </div>

          {/* Tailwind hint toggle */}
          {tailwindHint && (
            <div className="border-t border-gray-200 dark:border-gray-700 pt-3">
              <button
                onClick={() => setShowTailwind((v) => !v)}
                className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 transition-colors"
              >
                {showTailwind ? (
                  <ChevronUp className="w-4 h-4" />
                ) : (
                  <ChevronDown className="w-4 h-4" />
                )}
                {t('tailwindHint')}
              </button>
              {showTailwind && (
                <div className="mt-2 relative">
                  <pre className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 text-sm font-mono text-gray-800 dark:text-gray-200 overflow-x-auto whitespace-pre-wrap break-all pr-12">
                    {tailwindHint}
                  </pre>
                  <button
                    onClick={() => copyToClipboard(tailwindHint, 'tailwind')}
                    className="absolute top-2 right-2 p-1.5 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded-md transition-colors"
                  >
                    {copiedId === 'tailwind' ? (
                      <Check className="w-3.5 h-3.5 text-green-600" />
                    ) : (
                      <Copy className="w-3.5 h-3.5 text-gray-600 dark:text-gray-400" />
                    )}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Controls Grid */}
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Left panel: settings */}
          <div className="lg:col-span-1 space-y-6">
            {/* Gradient type */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 space-y-4">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                {t('gradientType')}
              </h3>
              <div className="grid grid-cols-3 gap-2">
                {(['linear', 'radial', 'conic'] as GradientType[]).map((gt) => (
                  <button
                    key={gt}
                    onClick={() => setGradientType(gt)}
                    className={`px-3 py-2 text-sm rounded-lg font-medium transition-colors ${
                      gradientType === gt
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                  >
                    {t(`type.${gt}`)}
                  </button>
                ))}
              </div>

              {/* Direction controls: linear */}
              {gradientType === 'linear' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-sm text-gray-600 dark:text-gray-400">
                      {t('angle')}
                    </label>
                    <span className="text-sm font-mono text-gray-900 dark:text-white">
                      {angle}&deg;
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={360}
                    value={angle}
                    onChange={(e) => setAngle(Number(e.target.value))}
                    className="w-full accent-blue-600"
                  />
                  <div className="grid grid-cols-4 gap-1.5">
                    {DIRECTION_ARROWS.map((d) => (
                      <button
                        key={d.angle}
                        onClick={() => setAngle(d.angle)}
                        className={`p-2 text-lg rounded-lg transition-colors ${
                          angle === d.angle
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                        }`}
                        title={d.label}
                      >
                        {d.arrow}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Direction controls: radial */}
              {gradientType === 'radial' && (
                <div className="space-y-3">
                  <div>
                    <label className="text-sm text-gray-600 dark:text-gray-400 block mb-1.5">
                      {t('shape')}
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => setRadialShape('circle')}
                        className={`px-3 py-2 text-sm rounded-lg font-medium transition-colors ${
                          radialShape === 'circle'
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                        }`}
                      >
                        {t('shapeCircle')}
                      </button>
                      <button
                        onClick={() => setRadialShape('ellipse')}
                        className={`px-3 py-2 text-sm rounded-lg font-medium transition-colors ${
                          radialShape === 'ellipse'
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                        }`}
                      >
                        {t('shapeEllipse')}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="text-sm text-gray-600 dark:text-gray-400 block mb-1.5">
                      {t('direction')}
                    </label>
                    <div className="flex flex-wrap gap-1.5">
                      {RADIAL_POSITIONS.map((pos) => (
                        <button
                          key={pos}
                          onClick={() => setRadialPosition(pos)}
                          className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-colors ${
                            radialPosition === pos
                              ? 'bg-blue-600 text-white'
                              : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                          }`}
                        >
                          {t(`pos${pos.charAt(0).toUpperCase() + pos.slice(1)}`)}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Direction controls: conic */}
              {gradientType === 'conic' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-sm text-gray-600 dark:text-gray-400">
                      {t('angle')}
                    </label>
                    <span className="text-sm font-mono text-gray-900 dark:text-white">
                      {angle}&deg;
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={360}
                    value={angle}
                    onChange={(e) => setAngle(Number(e.target.value))}
                    className="w-full accent-blue-600"
                  />
                </div>
              )}
            </div>

            {/* Tools: repeating + utility buttons */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 space-y-4">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                {t('tools')}
              </h3>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={repeating}
                  onChange={(e) => setRepeating(e.target.checked)}
                  className="w-4 h-4 accent-blue-600 rounded"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  {t('repeating')}
                </span>
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={handleRandom}
                  className="flex items-center justify-center gap-1.5 px-3 py-2 text-sm bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg transition-colors"
                >
                  <Shuffle className="w-4 h-4" />
                  {t('random')}
                </button>
                <button
                  onClick={handleReverse}
                  className="flex items-center justify-center gap-1.5 px-3 py-2 text-sm bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg transition-colors"
                >
                  <ArrowLeftRight className="w-4 h-4" />
                  {t('reverse')}
                </button>
              </div>
              <button
                onClick={handleReset}
                className="w-full flex items-center justify-center gap-1.5 px-3 py-2 text-sm bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg transition-colors"
              >
                <RotateCcw className="w-4 h-4" />
                {t('reset')}
              </button>
            </div>
          </div>

          {/* Right panel: color stops */}
          <div className="lg:col-span-2">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 space-y-5">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                  {t('colors')}
                </h3>
                <button
                  onClick={addColorStop}
                  disabled={colorStops.length >= MAX_COLORS}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg font-medium hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  {t('addColor')}
                </button>
              </div>

              {colorStops.length >= MAX_COLORS && (
                <p className="text-xs text-amber-600 dark:text-amber-400">
                  {t('maxColors')}
                </p>
              )}

              {/* Visual gradient bar */}
              <div
                className="h-8 rounded-lg border border-gray-200 dark:border-gray-600"
                style={{ background: barGradient }}
              />

              {/* Color stop list */}
              <div className="space-y-3">
                {colorStops.map((stop, index) => (
                  <div
                    key={stop.id}
                    className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg"
                  >
                    {/* Stop label */}
                    <span className="text-xs text-gray-500 dark:text-gray-400 flex-shrink-0 font-medium whitespace-nowrap">
                      {t('stopLabel', { n: index + 1 })}
                    </span>
                    {/* Color picker */}
                    <input
                      type="color"
                      value={stop.color}
                      onChange={(e) =>
                        updateColorStop(stop.id, 'color', e.target.value)
                      }
                      className="w-10 h-10 rounded-lg border border-gray-300 dark:border-gray-600 cursor-pointer flex-shrink-0 p-0"
                    />
                    {/* Hex input */}
                    <input
                      type="text"
                      value={stop.color}
                      onChange={(e) => {
                        const val = e.target.value
                        if (/^#[0-9a-fA-F]{0,6}$/.test(val) || val === '#') {
                          updateColorStop(stop.id, 'color', val)
                        }
                      }}
                      className="w-24 px-2 py-1.5 text-sm font-mono border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none flex-shrink-0"
                      maxLength={7}
                    />
                    {/* Position slider */}
                    <div className="flex-1 flex items-center gap-2 min-w-0">
                      <input
                        type="range"
                        min={0}
                        max={100}
                        value={stop.position}
                        onChange={(e) =>
                          updateColorStop(stop.id, 'position', Number(e.target.value))
                        }
                        className="flex-1 accent-blue-600"
                      />
                      <span className="text-xs font-mono text-gray-600 dark:text-gray-400 w-10 text-right flex-shrink-0">
                        {stop.position}%
                      </span>
                    </div>
                    {/* Delete button */}
                    <button
                      onClick={() => removeColorStop(stop.id)}
                      disabled={colorStops.length <= 2}
                      className="p-1.5 text-gray-400 hover:text-red-500 dark:text-gray-500 dark:hover:text-red-400 disabled:opacity-30 disabled:cursor-not-allowed transition-colors flex-shrink-0"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Presets Section */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            {t('presets')}
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {PRESETS.map((preset) => {
              const sorted = [...preset.colorStops].sort(
                (a, b) => a.position - b.position
              )
              const stops = sorted
                .map((s) => `${s.color} ${s.position}%`)
                .join(', ')
              const bg = `linear-gradient(${preset.angle}deg, ${stops})`
              return (
                <button
                  key={preset.name}
                  onClick={() => applyPreset(preset)}
                  className="group relative h-20 rounded-lg overflow-hidden border-2 border-transparent hover:border-blue-500 transition-all"
                  style={{ background: bg }}
                >
                  <span className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/40 transition-colors">
                    <span className="text-white text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-lg">
                      {t(`preset.${preset.name}`)}
                    </span>
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Guide Section */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 space-y-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <BookOpen className="w-5 h-5" />
            {t('guide.title')}
          </h2>

          <div>
            <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-3">
              {t('guide.types.title')}
            </h3>
            <ul className="space-y-2">
              {(t.raw('guide.types.items') as string[]).map((item, i) => (
                <li
                  key={i}
                  className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400"
                >
                  <span className="text-blue-500 mt-0.5 flex-shrink-0">&bull;</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-3">
              {t('guide.tips.title')}
            </h3>
            <ul className="space-y-2">
              {(t.raw('guide.tips.items') as string[]).map((item, i) => (
                <li
                  key={i}
                  className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400"
                >
                  <span className="text-blue-500 mt-0.5 flex-shrink-0">&bull;</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </>
  )
}
