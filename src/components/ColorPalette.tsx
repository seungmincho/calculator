'use client'

import { useState, useCallback, useMemo, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { Palette, Copy, Check, Shuffle, Save, Trash2, Download, BookOpen } from 'lucide-react'

interface HSL {
  h: number
  s: number
  l: number
}

interface RGB {
  r: number
  g: number
  b: number
}

interface SavedPalette {
  id: string
  name: string
  baseColor: string
  harmony: HarmonyRule
  colors: string[]
  timestamp: number
}

type HarmonyRule = 'complementary' | 'analogous' | 'triadic' | 'tetradic' | 'splitComplementary' | 'monochromatic'

export default function ColorPalette() {
  const t = useTranslations('colorPalette')
  const [baseColor, setBaseColor] = useState('#3b82f6')
  const [harmony, setHarmony] = useState<HarmonyRule>('complementary')
  const [selectedColor, setSelectedColor] = useState<string | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [savedPalettes, setSavedPalettes] = useState<SavedPalette[]>([])

  // Load saved palettes from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('colorPalettes')
    if (saved) {
      try {
        setSavedPalettes(JSON.parse(saved))
      } catch (e) {
        console.error('Failed to load palettes:', e)
      }
    }
  }, [])

  // Color conversion helpers
  const hexToRgb = useCallback((hex: string): RGB => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
    return result
      ? {
          r: parseInt(result[1], 16),
          g: parseInt(result[2], 16),
          b: parseInt(result[3], 16),
        }
      : { r: 0, g: 0, b: 0 }
  }, [])

  const hexToHsl = useCallback((hex: string): HSL => {
    const { r, g, b } = hexToRgb(hex)
    const rNorm = r / 255
    const gNorm = g / 255
    const bNorm = b / 255

    const max = Math.max(rNorm, gNorm, bNorm)
    const min = Math.min(rNorm, gNorm, bNorm)
    let h = 0
    let s = 0
    const l = (max + min) / 2

    if (max !== min) {
      const d = max - min
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min)

      switch (max) {
        case rNorm:
          h = ((gNorm - bNorm) / d + (gNorm < bNorm ? 6 : 0)) / 6
          break
        case gNorm:
          h = ((bNorm - rNorm) / d + 2) / 6
          break
        case bNorm:
          h = ((rNorm - gNorm) / d + 4) / 6
          break
      }
    }

    return {
      h: Math.round(h * 360),
      s: Math.round(s * 100),
      l: Math.round(l * 100),
    }
  }, [hexToRgb])

  const hslToHex = useCallback((h: number, s: number, l: number): string => {
    const hNorm = h / 360
    const sNorm = s / 100
    const lNorm = l / 100

    let r, g, b

    if (sNorm === 0) {
      r = g = b = lNorm
    } else {
      const hue2rgb = (p: number, q: number, t: number) => {
        if (t < 0) t += 1
        if (t > 1) t -= 1
        if (t < 1 / 6) return p + (q - p) * 6 * t
        if (t < 1 / 2) return q
        if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6
        return p
      }

      const q = lNorm < 0.5 ? lNorm * (1 + sNorm) : lNorm + sNorm - lNorm * sNorm
      const p = 2 * lNorm - q

      r = hue2rgb(p, q, hNorm + 1 / 3)
      g = hue2rgb(p, q, hNorm)
      b = hue2rgb(p, q, hNorm - 1 / 3)
    }

    const toHex = (x: number) => {
      const hex = Math.round(x * 255).toString(16)
      return hex.length === 1 ? '0' + hex : hex
    }

    return `#${toHex(r)}${toHex(g)}${toHex(b)}`
  }, [])

  // Generate harmony colors
  const generateHarmony = useCallback(
    (baseHex: string, rule: HarmonyRule): string[] => {
      const hsl = hexToHsl(baseHex)
      const { h, s, l } = hsl

      const normalizeHue = (hue: number) => ((hue % 360) + 360) % 360

      switch (rule) {
        case 'complementary':
          return [baseHex, hslToHex(normalizeHue(h + 180), s, l)]

        case 'analogous':
          return [
            hslToHex(normalizeHue(h - 30), s, l),
            baseHex,
            hslToHex(normalizeHue(h + 30), s, l),
          ]

        case 'triadic':
          return [
            baseHex,
            hslToHex(normalizeHue(h + 120), s, l),
            hslToHex(normalizeHue(h + 240), s, l),
          ]

        case 'tetradic':
          return [
            baseHex,
            hslToHex(normalizeHue(h + 90), s, l),
            hslToHex(normalizeHue(h + 180), s, l),
            hslToHex(normalizeHue(h + 270), s, l),
          ]

        case 'splitComplementary':
          return [
            baseHex,
            hslToHex(normalizeHue(h + 150), s, l),
            hslToHex(normalizeHue(h + 210), s, l),
          ]

        case 'monochromatic':
          return [
            hslToHex(h, s, Math.max(10, l - 30)),
            hslToHex(h, s, Math.max(10, l - 15)),
            baseHex,
            hslToHex(h, s, Math.min(90, l + 15)),
            hslToHex(h, s, Math.min(90, l + 30)),
          ]

        default:
          return [baseHex]
      }
    },
    [hexToHsl, hslToHex]
  )

  // Generate shades, tints, tones
  const generateVariations = useCallback(
    (hex: string) => {
      const hsl = hexToHsl(hex)
      const { h, s, l } = hsl

      const shades = [
        hslToHex(h, s, Math.max(5, l - 30)),
        hslToHex(h, s, Math.max(5, l - 20)),
        hslToHex(h, s, Math.max(5, l - 10)),
      ]

      const tints = [
        hslToHex(h, s, Math.min(95, l + 10)),
        hslToHex(h, s, Math.min(95, l + 20)),
        hslToHex(h, s, Math.min(95, l + 30)),
      ]

      const tones = [
        hslToHex(h, Math.max(5, s - 20), l),
        hslToHex(h, Math.max(5, s - 10), l),
        hslToHex(h, Math.min(100, s + 10), l),
      ]

      return { shades, tints, tones }
    },
    [hexToHsl, hslToHex]
  )

  const paletteColors = useMemo(
    () => generateHarmony(baseColor, harmony),
    [baseColor, harmony, generateHarmony]
  )

  const colorInfo = useMemo(() => {
    if (!selectedColor) return null

    const rgb = hexToRgb(selectedColor)
    const hsl = hexToHsl(selectedColor)

    return {
      hex: selectedColor.toUpperCase(),
      rgb: `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`,
      hsl: `hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)`,
    }
  }, [selectedColor, hexToRgb, hexToHsl])

  // Clipboard copy
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

  // Random color
  const randomColor = useCallback(() => {
    const random = Math.floor(Math.random() * 16777215).toString(16)
    setBaseColor('#' + '0'.repeat(6 - random.length) + random)
  }, [])

  // Save palette
  const savePalette = useCallback(() => {
    const name = prompt(t('savePalette'))
    if (!name) return

    const newPalette: SavedPalette = {
      id: Date.now().toString(),
      name,
      baseColor,
      harmony,
      colors: paletteColors,
      timestamp: Date.now(),
    }

    const updated = [...savedPalettes, newPalette]
    setSavedPalettes(updated)
    localStorage.setItem('colorPalettes', JSON.stringify(updated))
  }, [baseColor, harmony, paletteColors, savedPalettes, t])

  // Delete palette
  const deletePalette = useCallback(
    (id: string) => {
      const updated = savedPalettes.filter((p) => p.id !== id)
      setSavedPalettes(updated)
      localStorage.setItem('colorPalettes', JSON.stringify(updated))
    },
    [savedPalettes]
  )

  // Load palette
  const loadPalette = useCallback((palette: SavedPalette) => {
    setBaseColor(palette.baseColor)
    setHarmony(palette.harmony)
  }, [])

  // Export functions
  const exportCSS = useCallback(() => {
    const css = paletteColors
      .map((color, i) => `  --color-${i + 1}: ${color};`)
      .join('\n')
    copyToClipboard(`:root {\n${css}\n}`, 'css-export')
  }, [paletteColors, copyToClipboard])

  const exportJSON = useCallback(() => {
    const json = JSON.stringify(
      {
        baseColor,
        harmony,
        colors: paletteColors,
      },
      null,
      2
    )
    copyToClipboard(json, 'json-export')
  }, [baseColor, harmony, paletteColors, copyToClipboard])

  const exportTailwind = useCallback(() => {
    const tailwind = paletteColors
      .map((color, i) => `        'color-${i + 1}': '${color}',`)
      .join('\n')
    copyToClipboard(
      `module.exports = {\n  theme: {\n    extend: {\n      colors: {\n${tailwind}\n      },\n    },\n  },\n}`,
      'tailwind-export'
    )
  }, [paletteColors, copyToClipboard])

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <Palette className="w-8 h-8" />
          {t('title')}
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('description')}</p>
      </div>

      {/* Main Grid */}
      <div className="grid lg:grid-cols-3 gap-8">
        {/* Settings Panel */}
        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 space-y-6">
            {/* Base Color */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('baseColor')}
              </label>
              <div className="flex gap-2">
                <input
                  type="color"
                  value={baseColor}
                  onChange={(e) => setBaseColor(e.target.value)}
                  className="w-16 h-12 rounded-lg border border-gray-300 dark:border-gray-600 cursor-pointer"
                />
                <input
                  type="text"
                  value={baseColor}
                  onChange={(e) => {
                    const val = e.target.value
                    if (/^#[0-9A-Fa-f]{0,6}$/.test(val)) {
                      setBaseColor(val)
                    }
                  }}
                  className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 uppercase"
                  placeholder="#3b82f6"
                />
              </div>
            </div>

            {/* Random Button */}
            <button
              onClick={randomColor}
              className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg px-4 py-3 font-medium hover:from-purple-700 hover:to-pink-700 transition-colors flex items-center justify-center gap-2"
            >
              <Shuffle className="w-5 h-5" />
              {t('random')}
            </button>

            {/* Harmony Rule */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('harmony')}
              </label>
              <select
                value={harmony}
                onChange={(e) => setHarmony(e.target.value as HarmonyRule)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
              >
                <option value="complementary">{t('harmonies.complementary')}</option>
                <option value="analogous">{t('harmonies.analogous')}</option>
                <option value="triadic">{t('harmonies.triadic')}</option>
                <option value="tetradic">{t('harmonies.tetradic')}</option>
                <option value="splitComplementary">{t('harmonies.splitComplementary')}</option>
                <option value="monochromatic">{t('harmonies.monochromatic')}</option>
              </select>
            </div>

            {/* Export Buttons */}
            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('export')}</p>
              <button
                onClick={exportCSS}
                className="w-full bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg px-4 py-2 text-sm flex items-center justify-center gap-2"
              >
                {copiedId === 'css-export' ? (
                  <Check className="w-4 h-4" />
                ) : (
                  <Download className="w-4 h-4" />
                )}
                {t('exportCSS')}
              </button>
              <button
                onClick={exportJSON}
                className="w-full bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg px-4 py-2 text-sm flex items-center justify-center gap-2"
              >
                {copiedId === 'json-export' ? (
                  <Check className="w-4 h-4" />
                ) : (
                  <Download className="w-4 h-4" />
                )}
                {t('exportJSON')}
              </button>
              <button
                onClick={exportTailwind}
                className="w-full bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg px-4 py-2 text-sm flex items-center justify-center gap-2"
              >
                {copiedId === 'tailwind-export' ? (
                  <Check className="w-4 h-4" />
                ) : (
                  <Download className="w-4 h-4" />
                )}
                {t('exportTailwind')}
              </button>
            </div>

            {/* Save Palette */}
            <button
              onClick={savePalette}
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg px-4 py-3 font-medium hover:from-blue-700 hover:to-indigo-700 transition-colors flex items-center justify-center gap-2"
            >
              <Save className="w-5 h-5" />
              {t('savePalette')}
            </button>
          </div>

          {/* Saved Palettes */}
          {savedPalettes.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 mt-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                {t('savedPalettes')}
              </h3>
              <div className="space-y-3">
                {savedPalettes.map((palette) => (
                  <div
                    key={palette.id}
                    className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
                  >
                    <button
                      onClick={() => loadPalette(palette)}
                      className="flex-1 text-left"
                    >
                      <p className="font-medium text-gray-900 dark:text-white">{palette.name}</p>
                      <div className="flex gap-1 mt-1">
                        {palette.colors.slice(0, 5).map((color, i) => (
                          <div
                            key={i}
                            className="w-6 h-6 rounded"
                            style={{ backgroundColor: color }}
                          />
                        ))}
                      </div>
                    </button>
                    <button
                      onClick={() => deletePalette(palette.id)}
                      className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Palette Display */}
        <div className="lg:col-span-2">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
              {t('palette')}
            </h2>

            {/* Main Palette Colors */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4 mb-8">
              {paletteColors.map((color, i) => (
                <div key={i} className="space-y-2">
                  <button
                    onClick={() => setSelectedColor(color)}
                    className="w-full aspect-square rounded-xl shadow-lg hover:scale-105 transition-transform cursor-pointer border-2 border-gray-200 dark:border-gray-600"
                    style={{ backgroundColor: color }}
                  />
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-mono text-gray-700 dark:text-gray-300 flex-1">
                      {color.toUpperCase()}
                    </p>
                    <button
                      onClick={() => copyToClipboard(color, `color-${i}`)}
                      className="p-1 text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400"
                    >
                      {copiedId === `color-${i}` ? (
                        <Check className="w-4 h-4" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Variations for selected color */}
            {selectedColor && (
              <div className="space-y-6 border-t border-gray-200 dark:border-gray-700 pt-6">
                {(() => {
                  const variations = generateVariations(selectedColor)
                  return (
                    <>
                      {/* Shades */}
                      <div>
                        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                          {t('shades')}
                        </h3>
                        <div className="grid grid-cols-3 gap-3">
                          {variations.shades.map((color, i) => (
                            <div key={i} className="space-y-1">
                              <div
                                className="w-full h-16 rounded-lg shadow"
                                style={{ backgroundColor: color }}
                              />
                              <div className="flex items-center gap-1">
                                <p className="text-xs font-mono text-gray-600 dark:text-gray-400 flex-1">
                                  {color.toUpperCase()}
                                </p>
                                <button
                                  onClick={() => copyToClipboard(color, `shade-${i}`)}
                                  className="p-1 text-gray-500 hover:text-blue-600"
                                >
                                  {copiedId === `shade-${i}` ? (
                                    <Check className="w-3 h-3" />
                                  ) : (
                                    <Copy className="w-3 h-3" />
                                  )}
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Tints */}
                      <div>
                        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                          {t('tints')}
                        </h3>
                        <div className="grid grid-cols-3 gap-3">
                          {variations.tints.map((color, i) => (
                            <div key={i} className="space-y-1">
                              <div
                                className="w-full h-16 rounded-lg shadow"
                                style={{ backgroundColor: color }}
                              />
                              <div className="flex items-center gap-1">
                                <p className="text-xs font-mono text-gray-600 dark:text-gray-400 flex-1">
                                  {color.toUpperCase()}
                                </p>
                                <button
                                  onClick={() => copyToClipboard(color, `tint-${i}`)}
                                  className="p-1 text-gray-500 hover:text-blue-600"
                                >
                                  {copiedId === `tint-${i}` ? (
                                    <Check className="w-3 h-3" />
                                  ) : (
                                    <Copy className="w-3 h-3" />
                                  )}
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Tones */}
                      <div>
                        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                          {t('tones')}
                        </h3>
                        <div className="grid grid-cols-3 gap-3">
                          {variations.tones.map((color, i) => (
                            <div key={i} className="space-y-1">
                              <div
                                className="w-full h-16 rounded-lg shadow"
                                style={{ backgroundColor: color }}
                              />
                              <div className="flex items-center gap-1">
                                <p className="text-xs font-mono text-gray-600 dark:text-gray-400 flex-1">
                                  {color.toUpperCase()}
                                </p>
                                <button
                                  onClick={() => copyToClipboard(color, `tone-${i}`)}
                                  className="p-1 text-gray-500 hover:text-blue-600"
                                >
                                  {copiedId === `tone-${i}` ? (
                                    <Check className="w-3 h-3" />
                                  ) : (
                                    <Copy className="w-3 h-3" />
                                  )}
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </>
                  )
                })()}
              </div>
            )}

            {/* Color Info Panel */}
            {colorInfo && (
              <div className="bg-blue-50 dark:bg-blue-950 rounded-xl p-6 mt-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  {t('colorInfo.title')}
                </h3>
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-12 h-12 rounded-lg shadow-lg border-2 border-gray-200 dark:border-gray-600"
                      style={{ backgroundColor: selectedColor ?? undefined }}
                    />
                    <div className="flex-1 space-y-1">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                          {t('colorInfo.hex')}
                        </span>
                        <span className="font-mono text-sm text-gray-900 dark:text-white">
                          {colorInfo.hex}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                          {t('colorInfo.rgb')}
                        </span>
                        <span className="font-mono text-sm text-gray-900 dark:text-white">
                          {colorInfo.rgb}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                          {t('colorInfo.hsl')}
                        </span>
                        <span className="font-mono text-sm text-gray-900 dark:text-white">
                          {colorInfo.hsl}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Guide Section */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
          <BookOpen className="w-6 h-6" />
          {t('guide.title')}
        </h2>

        <div className="space-y-6">
          {/* Color Harmonies */}
          <div>
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-3">
              {t('guide.harmonies.title')}
            </h3>
            <ul className="space-y-2 text-gray-600 dark:text-gray-400">
              {(t.raw('guide.harmonies.items') as string[]).map((item, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-blue-600 dark:text-blue-400 mt-1">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Tips */}
          <div>
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-3">
              {t('guide.tips.title')}
            </h3>
            <ul className="space-y-2 text-gray-600 dark:text-gray-400">
              {(t.raw('guide.tips.items') as string[]).map((item, i) => (
                <li key={i} className="flex items-start gap-2">
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
