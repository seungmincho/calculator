'use client'

import { useState, useCallback, useMemo, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { Copy, Check, Palette, RefreshCw } from 'lucide-react'

interface ColorValues {
  hex: string
  rgb: { r: number; g: number; b: number }
  hsl: { h: number; s: number; l: number }
  hsv: { h: number; s: number; v: number }
  cmyk: { c: number; m: number; y: number; k: number }
}

export default function ColorConverter() {
  const t = useTranslations('colorConverter')
  const [hex, setHex] = useState('#3B82F6')
  const [copied, setCopied] = useState<string | null>(null)

  const hexToRgb = useCallback((hex: string): { r: number; g: number; b: number } | null => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null
  }, [])

  const rgbToHex = useCallback((r: number, g: number, b: number): string => {
    return '#' + [r, g, b].map(x => {
      const hex = Math.max(0, Math.min(255, Math.round(x))).toString(16)
      return hex.length === 1 ? '0' + hex : hex
    }).join('').toUpperCase()
  }, [])

  const rgbToHsl = useCallback((r: number, g: number, b: number): { h: number; s: number; l: number } => {
    r /= 255
    g /= 255
    b /= 255
    const max = Math.max(r, g, b)
    const min = Math.min(r, g, b)
    let h = 0
    let s = 0
    const l = (max + min) / 2

    if (max !== min) {
      const d = max - min
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
      switch (max) {
        case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break
        case g: h = ((b - r) / d + 2) / 6; break
        case b: h = ((r - g) / d + 4) / 6; break
      }
    }

    return {
      h: Math.round(h * 360),
      s: Math.round(s * 100),
      l: Math.round(l * 100)
    }
  }, [])

  const hslToRgb = useCallback((h: number, s: number, l: number): { r: number; g: number; b: number } => {
    h /= 360
    s /= 100
    l /= 100
    let r, g, b

    if (s === 0) {
      r = g = b = l
    } else {
      const hue2rgb = (p: number, q: number, t: number) => {
        if (t < 0) t += 1
        if (t > 1) t -= 1
        if (t < 1/6) return p + (q - p) * 6 * t
        if (t < 1/2) return q
        if (t < 2/3) return p + (q - p) * (2/3 - t) * 6
        return p
      }
      const q = l < 0.5 ? l * (1 + s) : l + s - l * s
      const p = 2 * l - q
      r = hue2rgb(p, q, h + 1/3)
      g = hue2rgb(p, q, h)
      b = hue2rgb(p, q, h - 1/3)
    }

    return {
      r: Math.round(r * 255),
      g: Math.round(g * 255),
      b: Math.round(b * 255)
    }
  }, [])

  const rgbToHsv = useCallback((r: number, g: number, b: number): { h: number; s: number; v: number } => {
    r /= 255
    g /= 255
    b /= 255
    const max = Math.max(r, g, b)
    const min = Math.min(r, g, b)
    let h = 0
    const v = max
    const d = max - min
    const s = max === 0 ? 0 : d / max

    if (max !== min) {
      switch (max) {
        case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break
        case g: h = ((b - r) / d + 2) / 6; break
        case b: h = ((r - g) / d + 4) / 6; break
      }
    }

    return {
      h: Math.round(h * 360),
      s: Math.round(s * 100),
      v: Math.round(v * 100)
    }
  }, [])

  const rgbToCmyk = useCallback((r: number, g: number, b: number): { c: number; m: number; y: number; k: number } => {
    r /= 255
    g /= 255
    b /= 255
    const k = 1 - Math.max(r, g, b)
    if (k === 1) return { c: 0, m: 0, y: 0, k: 100 }
    return {
      c: Math.round(((1 - r - k) / (1 - k)) * 100),
      m: Math.round(((1 - g - k) / (1 - k)) * 100),
      y: Math.round(((1 - b - k) / (1 - k)) * 100),
      k: Math.round(k * 100)
    }
  }, [])

  const colorValues = useMemo((): ColorValues | null => {
    const rgb = hexToRgb(hex)
    if (!rgb) return null
    return {
      hex: hex.toUpperCase(),
      rgb,
      hsl: rgbToHsl(rgb.r, rgb.g, rgb.b),
      hsv: rgbToHsv(rgb.r, rgb.g, rgb.b),
      cmyk: rgbToCmyk(rgb.r, rgb.g, rgb.b)
    }
  }, [hex, hexToRgb, rgbToHsl, rgbToHsv, rgbToCmyk])

  const handleCopy = useCallback(async (value: string, key: string) => {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(key)
      setTimeout(() => setCopied(null), 2000)
    } catch {
      const textarea = document.createElement('textarea')
      textarea.value = value
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand('copy')
      document.body.removeChild(textarea)
      setCopied(key)
      setTimeout(() => setCopied(null), 2000)
    }
  }, [])

  const handleRandomColor = useCallback(() => {
    const randomHex = '#' + Math.floor(Math.random()*16777215).toString(16).padStart(6, '0').toUpperCase()
    setHex(randomHex)
  }, [])

  const handleRgbChange = useCallback((component: 'r' | 'g' | 'b', value: number) => {
    if (!colorValues) return
    const newRgb = { ...colorValues.rgb, [component]: value }
    setHex(rgbToHex(newRgb.r, newRgb.g, newRgb.b))
  }, [colorValues, rgbToHex])

  const handleHslChange = useCallback((component: 'h' | 's' | 'l', value: number) => {
    if (!colorValues) return
    const newHsl = { ...colorValues.hsl, [component]: value }
    const rgb = hslToRgb(newHsl.h, newHsl.s, newHsl.l)
    setHex(rgbToHex(rgb.r, rgb.g, rgb.b))
  }, [colorValues, hslToRgb, rgbToHex])

  // Predefined color palette
  const presetColors = [
    '#EF4444', '#F97316', '#F59E0B', '#EAB308', '#84CC16',
    '#22C55E', '#10B981', '#14B8A6', '#06B6D4', '#0EA5E9',
    '#3B82F6', '#6366F1', '#8B5CF6', '#A855F7', '#D946EF',
    '#EC4899', '#F43F5E', '#78716C', '#64748B', '#000000'
  ]

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <Palette className="w-7 h-7 text-pink-500" />
          {t('title')}
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          {t('description')}
        </p>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Color Preview & Picker */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="px-4 py-3 bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {t('preview.title')}
            </span>
          </div>
          <div className="p-6">
            {/* Color Preview */}
            <div
              className="w-full h-32 rounded-xl shadow-inner mb-4 transition-colors"
              style={{ backgroundColor: hex }}
            />

            {/* Color Picker */}
            <div className="flex gap-4 mb-4">
              <input
                type="color"
                value={hex}
                onChange={(e) => setHex(e.target.value)}
                className="w-16 h-10 rounded cursor-pointer"
              />
              <input
                type="text"
                value={hex}
                onChange={(e) => setHex(e.target.value)}
                className="flex-1 px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-mono uppercase"
                maxLength={7}
              />
              <button
                onClick={handleRandomColor}
                className="px-4 py-2 rounded-lg bg-pink-500 hover:bg-pink-600 text-white transition-all"
                title={t('actions.random')}
              >
                <RefreshCw className="w-5 h-5" />
              </button>
            </div>

            {/* Preset Colors */}
            <div className="grid grid-cols-10 gap-2">
              {presetColors.map((color) => (
                <button
                  key={color}
                  onClick={() => setHex(color)}
                  className={`w-full aspect-square rounded-lg border-2 transition-all hover:scale-110 ${
                    hex.toUpperCase() === color ? 'border-gray-900 dark:border-white' : 'border-transparent'
                  }`}
                  style={{ backgroundColor: color }}
                  title={color}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Color Values */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="px-4 py-3 bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {t('values.title')}
            </span>
          </div>
          {colorValues && (
            <div className="p-4 space-y-4">
              {/* HEX */}
              <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-700/50">
                <div>
                  <span className="text-xs font-medium text-gray-500 dark:text-gray-400">HEX</span>
                  <p className="font-mono text-gray-900 dark:text-white">{colorValues.hex}</p>
                </div>
                <button
                  onClick={() => handleCopy(colorValues.hex, 'hex')}
                  className="p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-all"
                >
                  {copied === 'hex' ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4 text-gray-500" />}
                </button>
              </div>

              {/* RGB */}
              <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-700/50">
                <div>
                  <span className="text-xs font-medium text-gray-500 dark:text-gray-400">RGB</span>
                  <p className="font-mono text-gray-900 dark:text-white">
                    rgb({colorValues.rgb.r}, {colorValues.rgb.g}, {colorValues.rgb.b})
                  </p>
                </div>
                <button
                  onClick={() => handleCopy(`rgb(${colorValues.rgb.r}, ${colorValues.rgb.g}, ${colorValues.rgb.b})`, 'rgb')}
                  className="p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-all"
                >
                  {copied === 'rgb' ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4 text-gray-500" />}
                </button>
              </div>

              {/* HSL */}
              <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-700/50">
                <div>
                  <span className="text-xs font-medium text-gray-500 dark:text-gray-400">HSL</span>
                  <p className="font-mono text-gray-900 dark:text-white">
                    hsl({colorValues.hsl.h}, {colorValues.hsl.s}%, {colorValues.hsl.l}%)
                  </p>
                </div>
                <button
                  onClick={() => handleCopy(`hsl(${colorValues.hsl.h}, ${colorValues.hsl.s}%, ${colorValues.hsl.l}%)`, 'hsl')}
                  className="p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-all"
                >
                  {copied === 'hsl' ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4 text-gray-500" />}
                </button>
              </div>

              {/* HSV */}
              <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-700/50">
                <div>
                  <span className="text-xs font-medium text-gray-500 dark:text-gray-400">HSV/HSB</span>
                  <p className="font-mono text-gray-900 dark:text-white">
                    hsv({colorValues.hsv.h}, {colorValues.hsv.s}%, {colorValues.hsv.v}%)
                  </p>
                </div>
                <button
                  onClick={() => handleCopy(`hsv(${colorValues.hsv.h}, ${colorValues.hsv.s}%, ${colorValues.hsv.v}%)`, 'hsv')}
                  className="p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-all"
                >
                  {copied === 'hsv' ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4 text-gray-500" />}
                </button>
              </div>

              {/* CMYK */}
              <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-700/50">
                <div>
                  <span className="text-xs font-medium text-gray-500 dark:text-gray-400">CMYK</span>
                  <p className="font-mono text-gray-900 dark:text-white">
                    cmyk({colorValues.cmyk.c}%, {colorValues.cmyk.m}%, {colorValues.cmyk.y}%, {colorValues.cmyk.k}%)
                  </p>
                </div>
                <button
                  onClick={() => handleCopy(`cmyk(${colorValues.cmyk.c}%, ${colorValues.cmyk.m}%, ${colorValues.cmyk.y}%, ${colorValues.cmyk.k}%)`, 'cmyk')}
                  className="p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-all"
                >
                  {copied === 'cmyk' ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4 text-gray-500" />}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* RGB/HSL Sliders */}
      {colorValues && (
        <div className="mt-6 grid md:grid-cols-2 gap-6">
          {/* RGB Sliders */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">RGB</h3>
            <div className="space-y-4">
              {(['r', 'g', 'b'] as const).map((c) => (
                <div key={c} className="flex items-center gap-4">
                  <span className="w-4 font-mono text-sm text-gray-500 uppercase">{c}</span>
                  <input
                    type="range"
                    min="0"
                    max="255"
                    value={colorValues.rgb[c]}
                    onChange={(e) => handleRgbChange(c, parseInt(e.target.value))}
                    className={`flex-1 h-2 rounded-lg appearance-none cursor-pointer ${
                      c === 'r' ? 'accent-red-500' : c === 'g' ? 'accent-green-500' : 'accent-blue-500'
                    }`}
                  />
                  <span className="w-10 text-right font-mono text-sm text-gray-900 dark:text-white">
                    {colorValues.rgb[c]}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* HSL Sliders */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">HSL</h3>
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <span className="w-4 font-mono text-sm text-gray-500">H</span>
                <input
                  type="range"
                  min="0"
                  max="360"
                  value={colorValues.hsl.h}
                  onChange={(e) => handleHslChange('h', parseInt(e.target.value))}
                  className="flex-1 h-2 rounded-lg appearance-none cursor-pointer"
                  style={{ background: 'linear-gradient(to right, #ff0000, #ffff00, #00ff00, #00ffff, #0000ff, #ff00ff, #ff0000)' }}
                />
                <span className="w-10 text-right font-mono text-sm text-gray-900 dark:text-white">
                  {colorValues.hsl.h}°
                </span>
              </div>
              <div className="flex items-center gap-4">
                <span className="w-4 font-mono text-sm text-gray-500">S</span>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={colorValues.hsl.s}
                  onChange={(e) => handleHslChange('s', parseInt(e.target.value))}
                  className="flex-1 h-2 rounded-lg appearance-none cursor-pointer accent-pink-500"
                />
                <span className="w-10 text-right font-mono text-sm text-gray-900 dark:text-white">
                  {colorValues.hsl.s}%
                </span>
              </div>
              <div className="flex items-center gap-4">
                <span className="w-4 font-mono text-sm text-gray-500">L</span>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={colorValues.hsl.l}
                  onChange={(e) => handleHslChange('l', parseInt(e.target.value))}
                  className="flex-1 h-2 rounded-lg appearance-none cursor-pointer accent-gray-500"
                />
                <span className="w-10 text-right font-mono text-sm text-gray-900 dark:text-white">
                  {colorValues.hsl.l}%
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Guide */}
      <div className="mt-6 bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          {t('guide.title')}
        </h2>
        <div className="grid md:grid-cols-2 gap-6 text-sm text-gray-600 dark:text-gray-400">
          <div>
            <h3 className="font-medium text-gray-700 dark:text-gray-300 mb-2">{t('guide.formats.title')}</h3>
            <ul className="space-y-1">
              <li><strong>HEX:</strong> {t('guide.formats.hex')}</li>
              <li><strong>RGB:</strong> {t('guide.formats.rgb')}</li>
              <li><strong>HSL:</strong> {t('guide.formats.hsl')}</li>
              <li><strong>CMYK:</strong> {t('guide.formats.cmyk')}</li>
            </ul>
          </div>
          <div>
            <h3 className="font-medium text-gray-700 dark:text-gray-300 mb-2">{t('guide.useCases.title')}</h3>
            <ul className="space-y-1">
              {(t.raw('guide.useCases.items') as string[]).map((item, idx) => (
                <li key={idx}>• {item}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
