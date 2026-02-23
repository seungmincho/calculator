'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { Download, Copy, Check, RotateCcw } from 'lucide-react'

type StampShape = 'circle' | 'square' | 'oval'
type StampStyle = 'traditional' | 'modern-blue' | 'black' | 'custom'
type FontStyle = 'serif' | 'sans-serif' | 'brush'

const FONT_FAMILIES: Record<FontStyle, string> = {
  serif: '"Noto Serif KR", "Batang", "BatangChe", Georgia, serif',
  'sans-serif': '"Noto Sans KR", "Malgun Gothic", "Apple SD Gothic Neo", Arial, sans-serif',
  brush: '"Nanum Brush Script", "Nanum Myeongjo", cursive, serif',
}

const STYLE_COLORS: Record<StampStyle, string> = {
  traditional: '#CC0000',
  'modern-blue': '#1E3A8A',
  black: '#1A1A1A',
  custom: '#CC0000',
}

interface StampConfig {
  text: string
  shape: StampShape
  stampStyle: StampStyle
  customColor: string
  fontStyle: FontStyle
  size: number
  borderWidth: number
  doubleBorder: boolean
  opacity: number
}

function drawStamp(canvas: HTMLCanvasElement, config: StampConfig) {
  const { text, shape, stampStyle, customColor, fontStyle, size, borderWidth, doubleBorder, opacity } = config
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  const dpr = window.devicePixelRatio || 1
  const canvasSize = size * 2 + 40
  canvas.width = canvasSize * dpr
  canvas.height = canvasSize * dpr
  canvas.style.width = `${canvasSize}px`
  canvas.style.height = `${canvasSize}px`
  ctx.scale(dpr, dpr)

  ctx.clearRect(0, 0, canvasSize, canvasSize)

  const color = stampStyle === 'custom' ? customColor : STYLE_COLORS[stampStyle]
  const cx = canvasSize / 2
  const cy = canvasSize / 2
  const r = size / 2

  ctx.globalAlpha = opacity / 100

  // Draw outer shape
  ctx.strokeStyle = color
  ctx.lineWidth = borderWidth
  ctx.fillStyle = 'transparent'

  const c = ctx
  function drawShape(radiusX: number, radiusY: number) {
    c.beginPath()
    if (shape === 'circle') {
      c.arc(cx, cy, radiusX, 0, Math.PI * 2)
    } else if (shape === 'square') {
      const s = radiusX * 2
      c.rect(cx - radiusX, cy - radiusY, s, s * (radiusY / radiusX))
    } else {
      // oval
      c.ellipse(cx, cy, radiusX, radiusY * 0.72, 0, 0, Math.PI * 2)
    }
    c.stroke()
  }

  const radiusX = r - borderWidth / 2
  const radiusY = shape === 'oval' ? r * 0.72 - borderWidth / 2 : r - borderWidth / 2
  const squareRadiusY = shape === 'square' ? radiusX : radiusY

  drawShape(radiusX, squareRadiusY)

  if (doubleBorder) {
    const innerGap = Math.max(4, borderWidth * 2)
    drawShape(radiusX - innerGap, squareRadiusY - innerGap)
  }

  // Draw text
  ctx.fillStyle = color
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'

  const trimmed = text.trim()
  if (!trimmed) return

  const chars = Array.from(trimmed)
  const charCount = chars.length

  if (charCount === 0) return

  if (shape === 'circle' || shape === 'oval') {
    // For circle/oval: arrange text in a vertical column in the center
    const effectiveR = shape === 'oval' ? radiusY - (doubleBorder ? borderWidth * 3 : borderWidth * 1.5)
      : radiusX - (doubleBorder ? borderWidth * 3 : borderWidth * 1.5)

    const maxFontSize = Math.min((effectiveR * 1.4) / charCount, effectiveR * 0.72)
    const fontSize = Math.max(10, Math.floor(maxFontSize))
    ctx.font = `${fontSize}px ${FONT_FAMILIES[fontStyle]}`

    const lineHeight = fontSize * 1.15
    const totalHeight = lineHeight * charCount
    const startY = cy - totalHeight / 2 + lineHeight / 2

    chars.forEach((char, i) => {
      ctx.fillText(char, cx, startY + i * lineHeight)
    })
  } else {
    // Square: arrange characters in a grid
    const innerSize = radiusX * 2 - (doubleBorder ? borderWidth * 6 : borderWidth * 3)
    const cols = charCount <= 2 ? 1 : charCount <= 4 ? 2 : Math.ceil(Math.sqrt(charCount))
    const rows = Math.ceil(charCount / cols)
    const cellSize = innerSize / Math.max(cols, rows)
    const fontSize = Math.max(10, Math.floor(cellSize * 0.82))
    ctx.font = `${fontSize}px ${FONT_FAMILIES[fontStyle]}`

    chars.forEach((char, i) => {
      const col = i % cols
      const row = Math.floor(i / cols)
      const totalWidth = cols * cellSize
      const totalHeight = rows * cellSize
      const x = cx - totalWidth / 2 + col * cellSize + cellSize / 2
      const y = cy - totalHeight / 2 + row * cellSize + cellSize / 2
      ctx.fillText(char, x, y)
    })
  }
}

export default function StampGenerator() {
  const t = useTranslations('stampGenerator')
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [copied, setCopied] = useState(false)

  const [config, setConfig] = useState<StampConfig>({
    text: '홍길동',
    shape: 'circle',
    stampStyle: 'traditional',
    customColor: '#CC0000',
    fontStyle: 'serif',
    size: 80,
    borderWidth: 3,
    doubleBorder: false,
    opacity: 100,
  })

  const redraw = useCallback(() => {
    if (canvasRef.current) {
      drawStamp(canvasRef.current, config)
    }
  }, [config])

  useEffect(() => {
    redraw()
  }, [redraw])

  const handleDownload = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const link = document.createElement('a')
    link.download = `stamp-${config.text || 'stamp'}.png`
    link.href = canvas.toDataURL('image/png')
    link.click()
  }, [config.text])

  const handleCopy = useCallback(async () => {
    const canvas = canvasRef.current
    if (!canvas) return
    try {
      canvas.toBlob(async (blob) => {
        if (!blob) return
        try {
          await navigator.clipboard.write([
            new ClipboardItem({ 'image/png': blob })
          ])
          setCopied(true)
          setTimeout(() => setCopied(false), 2000)
        } catch {
          // Fallback: download
          handleDownload()
        }
      }, 'image/png')
    } catch {
      handleDownload()
    }
  }, [handleDownload])

  const handleReset = useCallback(() => {
    setConfig({
      text: '홍길동',
      shape: 'circle',
      stampStyle: 'traditional',
      customColor: '#CC0000',
      fontStyle: 'serif',
      size: 80,
      borderWidth: 3,
      doubleBorder: false,
      opacity: 100,
    })
  }, [])

  const update = <K extends keyof StampConfig>(key: K, value: StampConfig[K]) => {
    setConfig(prev => ({ ...prev, [key]: value }))
  }

  const activeColor = config.stampStyle === 'custom' ? config.customColor : STYLE_COLORS[config.stampStyle]

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('title')}</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('description')}</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Settings Panel */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 space-y-5">

            {/* Name Input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('labelText')}
              </label>
              <input
                type="text"
                value={config.text}
                onChange={e => update('text', e.target.value.slice(0, 4))}
                placeholder={t('placeholderText')}
                maxLength={4}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{config.text.length}/4</p>
            </div>

            {/* Shape */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('labelShape')}
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(['circle', 'square', 'oval'] as StampShape[]).map(s => (
                  <button
                    key={s}
                    onClick={() => update('shape', s)}
                    className={`py-2 px-2 rounded-lg text-xs font-medium transition-colors ${
                      config.shape === s
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                  >
                    {t(`shape${s.charAt(0).toUpperCase() + s.slice(1)}`)}
                  </button>
                ))}
              </div>
            </div>

            {/* Stamp Style */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('labelStyle')}
              </label>
              <div className="grid grid-cols-2 gap-2">
                {(['traditional', 'modern-blue', 'black', 'custom'] as StampStyle[]).map(s => (
                  <button
                    key={s}
                    onClick={() => update('stampStyle', s)}
                    className={`py-2 px-2 rounded-lg text-xs font-medium transition-colors flex items-center gap-1 justify-center ${
                      config.stampStyle === s
                        ? 'ring-2 ring-blue-500 bg-gray-50 dark:bg-gray-700'
                        : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600'
                    } text-gray-700 dark:text-gray-300`}
                  >
                    <span
                      className="inline-block w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: STYLE_COLORS[s] }}
                    />
                    {t(`style${s.charAt(0).toUpperCase() + s.replace('-', '').slice(1)}`)}
                  </button>
                ))}
              </div>
              {config.stampStyle === 'custom' && (
                <div className="mt-2 flex items-center gap-2">
                  <input
                    type="color"
                    value={config.customColor}
                    onChange={e => update('customColor', e.target.value)}
                    className="w-10 h-8 rounded cursor-pointer border border-gray-300 dark:border-gray-600"
                  />
                  <span className="text-xs text-gray-500 dark:text-gray-400">{config.customColor}</span>
                </div>
              )}
            </div>

            {/* Font Style */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('labelFont')}
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(['serif', 'sans-serif', 'brush'] as FontStyle[]).map(f => (
                  <button
                    key={f}
                    onClick={() => update('fontStyle', f)}
                    className={`py-2 px-1 rounded-lg text-xs font-medium transition-colors ${
                      config.fontStyle === f
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                  >
                    {t(`font${f.charAt(0).toUpperCase() + f.replace('-', '').slice(1)}`)}
                  </button>
                ))}
              </div>
            </div>

            {/* Size */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('labelSize')}: <span className="font-bold text-blue-600">{config.size}px</span>
              </label>
              <input
                type="range"
                min={40}
                max={120}
                value={config.size}
                onChange={e => update('size', Number(e.target.value))}
                className="w-full accent-blue-600"
              />
              <div className="flex justify-between text-xs text-gray-400 dark:text-gray-500">
                <span>40px</span>
                <span>120px</span>
              </div>
            </div>

            {/* Border Width */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('labelBorderWidth')}: <span className="font-bold text-blue-600">{config.borderWidth}px</span>
              </label>
              <input
                type="range"
                min={1}
                max={8}
                value={config.borderWidth}
                onChange={e => update('borderWidth', Number(e.target.value))}
                className="w-full accent-blue-600"
              />
            </div>

            {/* Opacity */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('labelOpacity')}: <span className="font-bold text-blue-600">{config.opacity}%</span>
              </label>
              <input
                type="range"
                min={20}
                max={100}
                value={config.opacity}
                onChange={e => update('opacity', Number(e.target.value))}
                className="w-full accent-blue-600"
              />
            </div>

            {/* Double Border */}
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="doubleBorder"
                checked={config.doubleBorder}
                onChange={e => update('doubleBorder', e.target.checked)}
                className="w-4 h-4 accent-blue-600"
              />
              <label htmlFor="doubleBorder" className="text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
                {t('labelDoubleBorder')}
              </label>
            </div>

            {/* Reset */}
            <button
              onClick={handleReset}
              className="w-full flex items-center justify-center gap-2 py-2 px-4 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              {t('buttonReset')}
            </button>
          </div>
        </div>

        {/* Preview & Download Panel */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{t('previewTitle')}</h2>

            {/* Canvas Preview */}
            <div className="flex justify-center items-center min-h-64 bg-gray-50 dark:bg-gray-900 rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-700 p-6">
              <div className="flex flex-col items-center gap-4">
                <canvas
                  ref={canvasRef}
                  className="max-w-full"
                  style={{ imageRendering: 'pixelated' }}
                  aria-label={t('canvasAriaLabel')}
                />
                {!config.text.trim() && (
                  <p className="text-sm text-gray-400 dark:text-gray-500">{t('emptyTextHint')}</p>
                )}
              </div>
            </div>

            {/* Stamp Info */}
            <div className="mt-4 grid grid-cols-3 gap-3">
              <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3 text-center">
                <p className="text-xs text-gray-500 dark:text-gray-400">{t('infoShape')}</p>
                <p className="text-sm font-semibold text-gray-900 dark:text-white mt-1">
                  {t(`shape${config.shape.charAt(0).toUpperCase() + config.shape.slice(1)}`)}
                </p>
              </div>
              <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3 text-center">
                <p className="text-xs text-gray-500 dark:text-gray-400">{t('infoSize')}</p>
                <p className="text-sm font-semibold text-gray-900 dark:text-white mt-1">{config.size}px</p>
              </div>
              <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3 text-center">
                <p className="text-xs text-gray-500 dark:text-gray-400">{t('infoColor')}</p>
                <div className="flex items-center justify-center gap-1 mt-1">
                  <span className="inline-block w-3 h-3 rounded-full" style={{ backgroundColor: activeColor }} />
                  <p className="text-xs font-semibold text-gray-900 dark:text-white">{activeColor.toUpperCase()}</p>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="mt-4 flex gap-3">
              <button
                onClick={handleDownload}
                className="flex-1 flex items-center justify-center gap-2 py-3 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-lg font-medium transition-colors"
              >
                <Download className="w-4 h-4" />
                {t('buttonDownload')}
              </button>
              <button
                onClick={handleCopy}
                className="flex-1 flex items-center justify-center gap-2 py-3 px-4 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg font-medium transition-colors"
              >
                {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                {copied ? t('buttonCopied') : t('buttonCopy')}
              </button>
            </div>
          </div>

          {/* Usage Tips */}
          <div className="bg-blue-50 dark:bg-blue-950 rounded-xl p-5">
            <h3 className="text-sm font-semibold text-blue-800 dark:text-blue-300 mb-3">{t('tipsTitle')}</h3>
            <ul className="space-y-1">
              {(t.raw('tipsList') as string[]).map((tip, i) => (
                <li key={i} className="text-xs text-blue-700 dark:text-blue-400 flex gap-2">
                  <span className="flex-shrink-0">•</span>
                  <span>{tip}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Guide Section */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">{t('guideTitle')}</h2>
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <h3 className="text-base font-semibold text-gray-800 dark:text-gray-200 mb-3">{t('guideShapesTitle')}</h3>
            <ul className="space-y-2">
              {(t.raw('guideShapesItems') as string[]).map((item, i) => (
                <li key={i} className="text-sm text-gray-600 dark:text-gray-400 flex gap-2">
                  <span className="flex-shrink-0 text-blue-500">▸</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="text-base font-semibold text-gray-800 dark:text-gray-200 mb-3">{t('guideUsageTitle')}</h3>
            <ul className="space-y-2">
              {(t.raw('guideUsageItems') as string[]).map((item, i) => (
                <li key={i} className="text-sm text-gray-600 dark:text-gray-400 flex gap-2">
                  <span className="flex-shrink-0 text-blue-500">▸</span>
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
