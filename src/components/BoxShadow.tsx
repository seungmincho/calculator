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
  Download,
  RotateCcw,
  ChevronDown,
  ChevronUp,
  Layers,
  Eye,
} from 'lucide-react'

// ── Types ──

interface ShadowLayer {
  id: string
  x: number
  y: number
  blur: number
  spread: number
  color: string
  opacity: number
  inset: boolean
}

interface ShadowPreset {
  name: string
  layers: Omit<ShadowLayer, 'id'>[]
}

// ── Constants ──

const MAX_LAYERS = 5

const PRESETS: ShadowPreset[] = [
  { name: 'material1', layers: [{ x: 0, y: 1, blur: 3, spread: 0, color: '#000000', opacity: 12, inset: false }, { x: 0, y: 1, blur: 2, spread: 0, color: '#000000', opacity: 24, inset: false }] },
  { name: 'material2', layers: [{ x: 0, y: 3, blur: 6, spread: 0, color: '#000000', opacity: 16, inset: false }, { x: 0, y: 3, blur: 6, spread: 0, color: '#000000', opacity: 23, inset: false }] },
  { name: 'material3', layers: [{ x: 0, y: 10, blur: 20, spread: 0, color: '#000000', opacity: 19, inset: false }, { x: 0, y: 6, blur: 6, spread: 0, color: '#000000', opacity: 23, inset: false }] },
  { name: 'material4', layers: [{ x: 0, y: 14, blur: 28, spread: 0, color: '#000000', opacity: 25, inset: false }, { x: 0, y: 10, blur: 10, spread: 0, color: '#000000', opacity: 22, inset: false }] },
  { name: 'soft', layers: [{ x: 8, y: 8, blur: 16, spread: 0, color: '#b8b9be', opacity: 70, inset: false }, { x: -8, y: -8, blur: 16, spread: 0, color: '#ffffff', opacity: 70, inset: false }] },
  { name: 'sharp', layers: [{ x: 6, y: 6, blur: 0, spread: 0, color: '#000000', opacity: 80, inset: false }] },
  { name: 'float', layers: [{ x: 0, y: 20, blur: 60, spread: -10, color: '#000000', opacity: 30, inset: false }] },
  { name: 'inner', layers: [{ x: 0, y: 4, blur: 8, spread: 0, color: '#000000', opacity: 25, inset: true }] },
  { name: 'layered', layers: [{ x: 0, y: 1, blur: 1, spread: 0, color: '#000000', opacity: 8, inset: false }, { x: 0, y: 2, blur: 4, spread: 0, color: '#000000', opacity: 8, inset: false }, { x: 0, y: 4, blur: 16, spread: 0, color: '#000000', opacity: 8, inset: false }, { x: 0, y: 8, blur: 32, spread: 0, color: '#000000', opacity: 8, inset: false }] },
  { name: 'neon', layers: [{ x: 0, y: 0, blur: 10, spread: 0, color: '#00d4ff', opacity: 70, inset: false }, { x: 0, y: 0, blur: 40, spread: 0, color: '#00d4ff', opacity: 40, inset: false }, { x: 0, y: 0, blur: 80, spread: 0, color: '#00d4ff', opacity: 20, inset: false }] },
  { name: 'retro', layers: [{ x: 4, y: 4, blur: 0, spread: 0, color: '#000000', opacity: 100, inset: false }] },
  { name: 'minimal', layers: [{ x: 0, y: 1, blur: 2, spread: 0, color: '#000000', opacity: 6, inset: false }] },
  { name: 'glass', layers: [{ x: 0, y: 8, blur: 32, spread: 0, color: '#000000', opacity: 10, inset: false }, { x: 0, y: 0, blur: 1, spread: 0, color: '#ffffff', opacity: 20, inset: true }] },
  { name: 'deep', layers: [{ x: 0, y: 25, blur: 50, spread: -12, color: '#000000', opacity: 40, inset: false }] },
  { name: 'colorful', layers: [{ x: 5, y: 5, blur: 0, spread: 0, color: '#ff6b6b', opacity: 60, inset: false }, { x: 10, y: 10, blur: 0, spread: 0, color: '#48dbfb', opacity: 40, inset: false }, { x: 15, y: 15, blur: 0, spread: 0, color: '#feca57', opacity: 30, inset: false }] },
  { name: 'paper', layers: [{ x: 0, y: 1, blur: 1, spread: 0, color: '#000000', opacity: 12, inset: false }, { x: 0, y: 2, blur: 2, spread: 0, color: '#000000', opacity: 8, inset: false }, { x: 0, y: 4, blur: 4, spread: -1, color: '#000000', opacity: 6, inset: false }, { x: 0, y: 8, blur: 8, spread: -2, color: '#000000', opacity: 4, inset: false }] },
]

// ── Helpers ──

let idCounter = 0
function generateId(): string {
  idCounter += 1
  return `shadow-${Date.now()}-${idCounter}`
}

function randomHexColor(): string {
  return '#' + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0')
}

function hexToRgba(hex: string, opacity: number): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r}, ${g}, ${b}, ${(opacity / 100).toFixed(2)})`
}

function layerToCss(layer: ShadowLayer): string {
  const rgba = hexToRgba(layer.color, layer.opacity)
  const insetStr = layer.inset ? 'inset ' : ''
  return `${insetStr}${layer.x}px ${layer.y}px ${layer.blur}px ${layer.spread}px ${rgba}`
}

function layersToCss(layers: ShadowLayer[]): string {
  return layers.map(layerToCss).join(',\n    ')
}

/** Approximate Tailwind class for simple single-layer shadows */
function getTailwindShadowHint(layers: ShadowLayer[]): string | null {
  if (layers.length !== 1) return null
  const l = layers[0]
  if (l.inset || l.spread !== 0) return null

  // Map to known Tailwind shadow utilities
  if (l.x === 0 && l.y === 1 && l.blur <= 3 && l.opacity <= 15) return 'shadow-sm'
  if (l.x === 0 && l.y === 1 && l.blur <= 5 && l.opacity <= 15) return 'shadow'
  if (l.x === 0 && l.y === 4 && l.blur <= 8 && l.opacity <= 15) return 'shadow-md'
  if (l.x === 0 && l.y === 10 && l.blur <= 20 && l.opacity <= 15) return 'shadow-lg'
  if (l.x === 0 && l.y === 20 && l.blur <= 30 && l.opacity <= 15) return 'shadow-xl'
  if (l.x === 0 && l.y === 25 && l.blur <= 60 && l.opacity <= 30) return 'shadow-2xl'

  return null
}

// ── Component ──

export default function BoxShadow() {
  const t = useTranslations('boxShadow')

  // ── State: Shadow Layers ──
  const [layers, setLayers] = useState<ShadowLayer[]>([
    { id: generateId(), x: 0, y: 10, blur: 20, spread: 0, color: '#000000', opacity: 19, inset: false },
    { id: generateId(), x: 0, y: 6, blur: 6, spread: 0, color: '#000000', opacity: 23, inset: false },
  ])

  // ── State: Preview Settings ──
  const [previewBg, setPreviewBg] = useState('#f0f0f0')
  const [elementBg, setElementBg] = useState('#ffffff')
  const [elementWidth, setElementWidth] = useState(200)
  const [elementHeight, setElementHeight] = useState(200)
  const [borderRadius, setBorderRadius] = useState(12)

  // ── State: UI ──
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [showVendorPrefix, setShowVendorPrefix] = useState(false)
  const [showTailwind, setShowTailwind] = useState(false)
  const [expandedLayer, setExpandedLayer] = useState<string | null>(null)

  const previewRef = useRef<HTMLDivElement>(null)

  // ── CSS Generation ──

  const shadowCssValue = useMemo(() => layersToCss(layers), [layers])
  const fullCssRule = useMemo(() => `box-shadow: ${shadowCssValue};`, [shadowCssValue])

  const vendorPrefixCss = useMemo(() => {
    return `-webkit-box-shadow: ${shadowCssValue};\n-moz-box-shadow: ${shadowCssValue};\nbox-shadow: ${shadowCssValue};`
  }, [shadowCssValue])

  const tailwindHint = useMemo(() => getTailwindShadowHint(layers), [layers])

  // ── Shadow style for preview ──
  const shadowStyle = useMemo((): React.CSSProperties => {
    return { boxShadow: layers.map(layerToCss).join(', ') }
  }, [layers])

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

  const addLayer = useCallback(() => {
    if (layers.length >= MAX_LAYERS) return
    const newLayer: ShadowLayer = {
      id: generateId(),
      x: 0,
      y: 4 + layers.length * 2,
      blur: 8 + layers.length * 4,
      spread: 0,
      color: '#000000',
      opacity: 15,
      inset: false,
    }
    setLayers((prev) => [...prev, newLayer])
    setExpandedLayer(newLayer.id)
  }, [layers.length])

  const removeLayer = useCallback(
    (id: string) => {
      if (layers.length <= 1) return
      setLayers((prev) => prev.filter((l) => l.id !== id))
      if (expandedLayer === id) setExpandedLayer(null)
    },
    [layers.length, expandedLayer]
  )

  const updateLayer = useCallback(
    (id: string, field: keyof Omit<ShadowLayer, 'id'>, value: number | string | boolean) => {
      setLayers((prev) =>
        prev.map((l) => (l.id === id ? { ...l, [field]: value } : l))
      )
    },
    []
  )

  const applyPreset = useCallback((preset: ShadowPreset) => {
    const newLayers = preset.layers.map((l) => ({
      ...l,
      id: generateId(),
    }))
    setLayers(newLayers)
    setExpandedLayer(newLayers[0]?.id ?? null)
  }, [])

  const handleRandom = useCallback(() => {
    const count = 1 + Math.floor(Math.random() * 3) // 1-3 layers
    const newLayers: ShadowLayer[] = []
    for (let i = 0; i < count; i++) {
      newLayers.push({
        id: generateId(),
        x: Math.floor(Math.random() * 40) - 20,
        y: Math.floor(Math.random() * 40) - 10,
        blur: Math.floor(Math.random() * 60),
        spread: Math.floor(Math.random() * 20) - 5,
        color: randomHexColor(),
        opacity: 20 + Math.floor(Math.random() * 60),
        inset: Math.random() > 0.8,
      })
    }
    setLayers(newLayers)
    setExpandedLayer(newLayers[0]?.id ?? null)
  }, [])

  const handleReset = useCallback(() => {
    const defaultLayers: ShadowLayer[] = [
      { id: generateId(), x: 0, y: 10, blur: 20, spread: 0, color: '#000000', opacity: 19, inset: false },
      { id: generateId(), x: 0, y: 6, blur: 6, spread: 0, color: '#000000', opacity: 23, inset: false },
    ]
    setLayers(defaultLayers)
    setPreviewBg('#f0f0f0')
    setElementBg('#ffffff')
    setElementWidth(200)
    setElementHeight(200)
    setBorderRadius(12)
    setExpandedLayer(null)
  }, [])

  const exportPng = useCallback(() => {
    const canvas = document.createElement('canvas')
    const scale = 2
    const padding = 100
    const w = elementWidth + padding * 2
    const h = elementHeight + padding * 2
    canvas.width = w * scale
    canvas.height = h * scale
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.scale(scale, scale)

    // Background
    ctx.fillStyle = previewBg
    ctx.fillRect(0, 0, w, h)

    // Draw each shadow layer
    for (const layer of layers) {
      ctx.save()
      if (layer.inset) {
        // Canvas doesn't natively support inset shadows, simulate with clip
        ctx.beginPath()
        roundRect(ctx, padding, padding, elementWidth, elementHeight, borderRadius)
        ctx.clip()

        ctx.shadowColor = hexToRgba(layer.color, layer.opacity)
        ctx.shadowBlur = layer.blur
        ctx.shadowOffsetX = layer.x
        ctx.shadowOffsetY = layer.y

        // Draw a large rectangle around the element to cast shadow inward
        ctx.fillStyle = hexToRgba(layer.color, layer.opacity)
        ctx.beginPath()
        ctx.rect(-w, -h, w * 3, padding + (layer.spread > 0 ? -layer.spread : Math.abs(layer.spread)))
        ctx.rect(-w, -h, padding + (layer.spread > 0 ? -layer.spread : Math.abs(layer.spread)), h * 3)
        ctx.rect(padding + elementWidth + (layer.spread > 0 ? layer.spread : -Math.abs(layer.spread)), -h, w * 3, h * 3)
        ctx.rect(-w, padding + elementHeight + (layer.spread > 0 ? layer.spread : -Math.abs(layer.spread)), w * 3, h * 3)
        ctx.fill()
      } else {
        ctx.shadowColor = hexToRgba(layer.color, layer.opacity)
        ctx.shadowBlur = layer.blur
        ctx.shadowOffsetX = layer.x
        ctx.shadowOffsetY = layer.y

        // Spread: adjust size
        const spreadX = padding - layer.spread
        const spreadY = padding - layer.spread
        const spreadW = elementWidth + layer.spread * 2
        const spreadH = elementHeight + layer.spread * 2

        ctx.fillStyle = 'rgba(0,0,0,0)'
        ctx.beginPath()
        roundRect(ctx, spreadX, spreadY, spreadW, spreadH, borderRadius)
        ctx.fill()
      }
      ctx.restore()
    }

    // Draw element on top
    ctx.fillStyle = elementBg
    ctx.beginPath()
    roundRect(ctx, padding, padding, elementWidth, elementHeight, borderRadius)
    ctx.fill()

    const link = document.createElement('a')
    link.download = 'box-shadow.png'
    link.href = canvas.toDataURL('image/png')
    link.click()
  }, [layers, elementWidth, elementHeight, borderRadius, previewBg, elementBg])

  const toggleLayerExpand = useCallback((id: string) => {
    setExpandedLayer((prev) => (prev === id ? null : id))
  }, [])

  // ── Render ──

  return (
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
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <Eye className="w-5 h-5" />
            {t('preview')}
          </h2>
          <button
            onClick={exportPng}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg transition-colors"
          >
            <Download className="w-4 h-4" />
            {t('exportPng')}
          </button>
        </div>
        <div
          ref={previewRef}
          className="min-h-[300px] rounded-xl flex items-center justify-center transition-colors"
          style={{ backgroundColor: previewBg }}
        >
          <div
            className="transition-shadow duration-200"
            style={{
              width: elementWidth,
              height: elementHeight,
              borderRadius: borderRadius,
              backgroundColor: elementBg,
              ...shadowStyle,
            }}
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
        {/* Left panel: Preview settings */}
        <div className="lg:col-span-1 space-y-6">
          {/* Preview element settings */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 space-y-4">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
              {t('previewSettings')}
            </h3>

            {/* Background color */}
            <div className="space-y-1.5">
              <label className="text-sm text-gray-600 dark:text-gray-400">
                {t('bgColor')}
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={previewBg}
                  onChange={(e) => setPreviewBg(e.target.value)}
                  className="w-10 h-10 rounded-lg border border-gray-300 dark:border-gray-600 cursor-pointer flex-shrink-0 p-0"
                />
                <input
                  type="text"
                  value={previewBg}
                  onChange={(e) => {
                    const val = e.target.value
                    if (/^#[0-9a-fA-F]{0,6}$/.test(val) || val === '#') {
                      setPreviewBg(val)
                    }
                  }}
                  className="flex-1 px-3 py-2 text-sm font-mono border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  maxLength={7}
                />
              </div>
            </div>

            {/* Element color */}
            <div className="space-y-1.5">
              <label className="text-sm text-gray-600 dark:text-gray-400">
                {t('elementColor')}
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={elementBg}
                  onChange={(e) => setElementBg(e.target.value)}
                  className="w-10 h-10 rounded-lg border border-gray-300 dark:border-gray-600 cursor-pointer flex-shrink-0 p-0"
                />
                <input
                  type="text"
                  value={elementBg}
                  onChange={(e) => {
                    const val = e.target.value
                    if (/^#[0-9a-fA-F]{0,6}$/.test(val) || val === '#') {
                      setElementBg(val)
                    }
                  }}
                  className="flex-1 px-3 py-2 text-sm font-mono border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  maxLength={7}
                />
              </div>
            </div>

            {/* Element width */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-sm text-gray-600 dark:text-gray-400">
                  {t('elementWidth')}
                </label>
                <span className="text-sm font-mono text-gray-900 dark:text-white">
                  {elementWidth}px
                </span>
              </div>
              <input
                type="range"
                min={50}
                max={400}
                value={elementWidth}
                onChange={(e) => setElementWidth(Number(e.target.value))}
                className="w-full accent-blue-600"
              />
            </div>

            {/* Element height */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-sm text-gray-600 dark:text-gray-400">
                  {t('elementHeight')}
                </label>
                <span className="text-sm font-mono text-gray-900 dark:text-white">
                  {elementHeight}px
                </span>
              </div>
              <input
                type="range"
                min={50}
                max={400}
                value={elementHeight}
                onChange={(e) => setElementHeight(Number(e.target.value))}
                className="w-full accent-blue-600"
              />
            </div>

            {/* Border radius */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-sm text-gray-600 dark:text-gray-400">
                  {t('borderRadius')}
                </label>
                <span className="text-sm font-mono text-gray-900 dark:text-white">
                  {borderRadius}px
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={200}
                value={borderRadius}
                onChange={(e) => setBorderRadius(Number(e.target.value))}
                className="w-full accent-blue-600"
              />
            </div>
          </div>

          {/* Tools */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 space-y-4">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
              {t('tools')}
            </h3>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={handleRandom}
                className="flex items-center justify-center gap-1.5 px-3 py-2 text-sm bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg transition-colors"
              >
                <Shuffle className="w-4 h-4" />
                {t('random')}
              </button>
              <button
                onClick={handleReset}
                className="flex items-center justify-center gap-1.5 px-3 py-2 text-sm bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg transition-colors"
              >
                <RotateCcw className="w-4 h-4" />
                {t('reset')}
              </button>
            </div>
          </div>
        </div>

        {/* Right panel: Shadow layers */}
        <div className="lg:col-span-2">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <Layers className="w-4 h-4" />
                {t('layers')}
                <span className="text-xs text-gray-500 dark:text-gray-400 font-normal">
                  ({layers.length}/{MAX_LAYERS})
                </span>
              </h3>
              <button
                onClick={addLayer}
                disabled={layers.length >= MAX_LAYERS}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg font-medium hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Plus className="w-4 h-4" />
                {t('addLayer')}
              </button>
            </div>

            {layers.length >= MAX_LAYERS && (
              <p className="text-xs text-amber-600 dark:text-amber-400">
                {t('maxLayers')}
              </p>
            )}

            {/* Layer list */}
            <div className="space-y-3">
              {layers.map((layer, index) => {
                const isExpanded = expandedLayer === layer.id

                return (
                  <div
                    key={layer.id}
                    className={`rounded-lg border transition-colors ${
                      isExpanded
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-950'
                        : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900'
                    }`}
                  >
                    {/* Layer header */}
                    <div
                      className="flex items-center gap-3 p-3 cursor-pointer"
                      onClick={() => toggleLayerExpand(layer.id)}
                    >
                      {/* Color swatch */}
                      <div
                        className="w-8 h-8 rounded-md border border-gray-300 dark:border-gray-600 flex-shrink-0"
                        style={{ backgroundColor: hexToRgba(layer.color, layer.opacity) }}
                      />
                      {/* Layer label */}
                      <span className="text-sm font-medium text-gray-900 dark:text-white flex-shrink-0">
                        {t('layerLabel', { n: index + 1 })}
                      </span>
                      {/* Layer summary */}
                      <span className="text-xs text-gray-500 dark:text-gray-400 truncate flex-1 font-mono">
                        {layer.inset ? 'inset ' : ''}{layer.x}px {layer.y}px {layer.blur}px {layer.spread}px
                      </span>
                      {/* Inset badge */}
                      {layer.inset && (
                        <span className="text-xs bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 px-1.5 py-0.5 rounded flex-shrink-0">
                          inset
                        </span>
                      )}
                      {/* Expand/collapse */}
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            removeLayer(layer.id)
                          }}
                          disabled={layers.length <= 1}
                          className="p-1 text-gray-400 hover:text-red-500 dark:text-gray-500 dark:hover:text-red-400 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                        )}
                      </div>
                    </div>

                    {/* Expanded controls */}
                    {isExpanded && (
                      <div className="px-3 pb-4 space-y-4 border-t border-gray-200 dark:border-gray-700 pt-3">
                        {/* X & Y offset */}
                        <div className="grid grid-cols-2 gap-4">
                          {/* X Offset */}
                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between">
                              <label className="text-xs text-gray-600 dark:text-gray-400">
                                {t('xOffset')}
                              </label>
                              <span className="text-xs font-mono text-gray-900 dark:text-white">
                                {layer.x}px
                              </span>
                            </div>
                            <input
                              type="range"
                              min={-100}
                              max={100}
                              value={layer.x}
                              onChange={(e) => updateLayer(layer.id, 'x', Number(e.target.value))}
                              className="w-full accent-blue-600"
                            />
                          </div>
                          {/* Y Offset */}
                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between">
                              <label className="text-xs text-gray-600 dark:text-gray-400">
                                {t('yOffset')}
                              </label>
                              <span className="text-xs font-mono text-gray-900 dark:text-white">
                                {layer.y}px
                              </span>
                            </div>
                            <input
                              type="range"
                              min={-100}
                              max={100}
                              value={layer.y}
                              onChange={(e) => updateLayer(layer.id, 'y', Number(e.target.value))}
                              className="w-full accent-blue-600"
                            />
                          </div>
                        </div>

                        {/* Blur & Spread */}
                        <div className="grid grid-cols-2 gap-4">
                          {/* Blur */}
                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between">
                              <label className="text-xs text-gray-600 dark:text-gray-400">
                                {t('blur')}
                              </label>
                              <span className="text-xs font-mono text-gray-900 dark:text-white">
                                {layer.blur}px
                              </span>
                            </div>
                            <input
                              type="range"
                              min={0}
                              max={200}
                              value={layer.blur}
                              onChange={(e) => updateLayer(layer.id, 'blur', Number(e.target.value))}
                              className="w-full accent-blue-600"
                            />
                          </div>
                          {/* Spread */}
                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between">
                              <label className="text-xs text-gray-600 dark:text-gray-400">
                                {t('spread')}
                              </label>
                              <span className="text-xs font-mono text-gray-900 dark:text-white">
                                {layer.spread}px
                              </span>
                            </div>
                            <input
                              type="range"
                              min={-100}
                              max={100}
                              value={layer.spread}
                              onChange={(e) => updateLayer(layer.id, 'spread', Number(e.target.value))}
                              className="w-full accent-blue-600"
                            />
                          </div>
                        </div>

                        {/* Color & Opacity */}
                        <div className="grid grid-cols-2 gap-4">
                          {/* Color */}
                          <div className="space-y-1.5">
                            <label className="text-xs text-gray-600 dark:text-gray-400">
                              {t('color')}
                            </label>
                            <div className="flex items-center gap-2">
                              <input
                                type="color"
                                value={layer.color}
                                onChange={(e) => updateLayer(layer.id, 'color', e.target.value)}
                                className="w-10 h-10 rounded-lg border border-gray-300 dark:border-gray-600 cursor-pointer flex-shrink-0 p-0"
                              />
                              <input
                                type="text"
                                value={layer.color}
                                onChange={(e) => {
                                  const val = e.target.value
                                  if (/^#[0-9a-fA-F]{0,6}$/.test(val) || val === '#') {
                                    updateLayer(layer.id, 'color', val)
                                  }
                                }}
                                className="flex-1 px-2 py-1.5 text-sm font-mono border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                maxLength={7}
                              />
                            </div>
                          </div>
                          {/* Opacity */}
                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between">
                              <label className="text-xs text-gray-600 dark:text-gray-400">
                                {t('opacity')}
                              </label>
                              <span className="text-xs font-mono text-gray-900 dark:text-white">
                                {layer.opacity}%
                              </span>
                            </div>
                            <input
                              type="range"
                              min={0}
                              max={100}
                              value={layer.opacity}
                              onChange={(e) => updateLayer(layer.id, 'opacity', Number(e.target.value))}
                              className="w-full accent-blue-600"
                            />
                          </div>
                        </div>

                        {/* Inset toggle */}
                        <label className="flex items-center gap-3 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={layer.inset}
                            onChange={(e) => updateLayer(layer.id, 'inset', e.target.checked)}
                            className="w-4 h-4 accent-blue-600 rounded"
                          />
                          <span className="text-sm text-gray-700 dark:text-gray-300">
                            {t('inset')}
                          </span>
                        </label>
                      </div>
                    )}
                  </div>
                )
              })}
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
            const previewShadow = preset.layers.map((l) => {
              const rgba = hexToRgba(l.color, l.opacity)
              const insetStr = l.inset ? 'inset ' : ''
              return `${insetStr}${l.x}px ${l.y}px ${l.blur}px ${l.spread}px ${rgba}`
            }).join(', ')

            return (
              <button
                key={preset.name}
                onClick={() => applyPreset(preset)}
                className="group relative h-24 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center border-2 border-transparent hover:border-blue-500 transition-all"
              >
                <div
                  className="w-12 h-12 rounded-md bg-white dark:bg-gray-200"
                  style={{ boxShadow: previewShadow }}
                />
                <span className="absolute bottom-1.5 left-0 right-0 text-center text-xs font-medium text-gray-600 dark:text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                  {t(`preset.${preset.name}`)}
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
            {t('guide.basics.title')}
          </h3>
          <ul className="space-y-2">
            {(t.raw('guide.basics.items') as string[]).map((item, i) => (
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
  )
}

// ── Canvas Helper ──

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  const radius = Math.min(r, w / 2, h / 2)
  ctx.moveTo(x + radius, y)
  ctx.arcTo(x + w, y, x + w, y + h, radius)
  ctx.arcTo(x + w, y + h, x, y + h, radius)
  ctx.arcTo(x, y + h, x, y, radius)
  ctx.arcTo(x, y, x + w, y, radius)
  ctx.closePath()
}
