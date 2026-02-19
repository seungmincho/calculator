'use client'

import { useState, useCallback, useMemo } from 'react'
import { useTranslations } from 'next-intl'
import { Palette, ArrowLeftRight, Shuffle, Check, X, Copy, BookOpen } from 'lucide-react'

// ── WCAG Contrast Algorithm ──

function getLuminance(r: number, g: number, b: number): number {
  const [rs, gs, bs] = [r, g, b].map(c => {
    const val = c / 255
    return val <= 0.03928 ? val / 12.92 : Math.pow((val + 0.055) / 1.055, 2.4)
  })
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs
}

function getContrastRatio(l1: number, l2: number): number {
  const lighter = Math.max(l1, l2)
  const darker = Math.min(l1, l2)
  return (lighter + 0.05) / (darker + 0.05)
}

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const cleaned = hex.replace('#', '')
  if (cleaned.length === 3) {
    const r = parseInt(cleaned[0] + cleaned[0], 16)
    const g = parseInt(cleaned[1] + cleaned[1], 16)
    const b = parseInt(cleaned[2] + cleaned[2], 16)
    return { r, g, b }
  }
  const result = /^([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(cleaned)
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null
}

function rgbToHex(r: number, g: number, b: number): string {
  return (
    '#' +
    [r, g, b]
      .map(x => {
        const h = Math.max(0, Math.min(255, Math.round(x))).toString(16)
        return h.length === 1 ? '0' + h : h
      })
      .join('')
      .toUpperCase()
  )
}

function isValidHex(hex: string): boolean {
  return /^#?([a-f\d]{3}|[a-f\d]{6})$/i.test(hex)
}

function normalizeHex(hex: string): string {
  const cleaned = hex.startsWith('#') ? hex : '#' + hex
  if (/^#[a-f\d]{3}$/i.test(cleaned)) {
    const r = cleaned[1] + cleaned[1]
    const g = cleaned[2] + cleaned[2]
    const b = cleaned[3] + cleaned[3]
    return ('#' + r + g + b).toUpperCase()
  }
  return cleaned.toUpperCase()
}

// ── Types ──

interface WcagResult {
  ratio: number
  normalAA: boolean
  normalAAA: boolean
  largeAA: boolean
  largeAAA: boolean
  grade: 'AAA' | 'AA' | 'AA Large' | 'Fail'
}

interface ColorPair {
  fg: string
  bg: string
  labelKey: string
}

// ── Preset color pairs ──

const PRESET_PAIRS: ColorPair[] = [
  { fg: '#FFFFFF', bg: '#000000', labelKey: 'presetWhiteBlack' },
  { fg: '#000000', bg: '#FFFFFF', labelKey: 'presetBlackWhite' },
  { fg: '#1A1A1A', bg: '#F5F5F5', labelKey: 'presetDarkGray' },
  { fg: '#FFFFFF', bg: '#1D4ED8', labelKey: 'presetWhiteBlue' },
  { fg: '#FFFFFF', bg: '#166534', labelKey: 'presetWhiteGreen' },
  { fg: '#FFFFFF', bg: '#991B1B', labelKey: 'presetWhiteRed' },
  { fg: '#1E293B', bg: '#F1F5F9', labelKey: 'presetNavy' },
  { fg: '#7C3AED', bg: '#EDE9FE', labelKey: 'presetPurple' },
]

function randomHex(): string {
  const r = Math.floor(Math.random() * 256)
  const g = Math.floor(Math.random() * 256)
  const b = Math.floor(Math.random() * 256)
  return rgbToHex(r, g, b)
}

// ── Suggestion: nudge luminance toward compliance ──

function suggestCompliantColor(
  targetHex: string,
  referenceHex: string,
  minRatio: number
): string | null {
  const ref = hexToRgb(referenceHex)
  if (!ref) return null
  const refLum = getLuminance(ref.r, ref.g, ref.b)

  const target = hexToRgb(targetHex)
  if (!target) return null

  // Try darkening and lightening in steps
  for (let step = 5; step <= 200; step += 5) {
    // Lighten
    const lr = Math.min(255, target.r + step)
    const lg = Math.min(255, target.g + step)
    const lb = Math.min(255, target.b + step)
    const lightLum = getLuminance(lr, lg, lb)
    if (getContrastRatio(lightLum, refLum) >= minRatio) {
      return rgbToHex(lr, lg, lb)
    }

    // Darken
    const dr = Math.max(0, target.r - step)
    const dg = Math.max(0, target.g - step)
    const db = Math.max(0, target.b - step)
    const darkLum = getLuminance(dr, dg, db)
    if (getContrastRatio(darkLum, refLum) >= minRatio) {
      return rgbToHex(dr, dg, db)
    }
  }
  return null
}

// ── Main Component ──

export default function ContrastChecker() {
  const t = useTranslations('contrastChecker')

  const [fgHex, setFgHex] = useState('#1A1A1A')
  const [bgHex, setBgHex] = useState('#FFFFFF')
  const [fgInput, setFgInput] = useState('#1A1A1A')
  const [bgInput, setBgInput] = useState('#FFFFFF')
  const [copiedId, setCopiedId] = useState<string | null>(null)

  // ── Clipboard ──
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

  // ── WCAG calculation ──
  const wcag: WcagResult = useMemo(() => {
    const fg = hexToRgb(fgHex)
    const bg = hexToRgb(bgHex)
    if (!fg || !bg) {
      return { ratio: 1, normalAA: false, normalAAA: false, largeAA: false, largeAAA: false, grade: 'Fail' }
    }
    const fgLum = getLuminance(fg.r, fg.g, fg.b)
    const bgLum = getLuminance(bg.r, bg.g, bg.b)
    const ratio = getContrastRatio(fgLum, bgLum)

    const normalAA = ratio >= 4.5
    const normalAAA = ratio >= 7
    const largeAA = ratio >= 3
    const largeAAA = ratio >= 4.5

    let grade: WcagResult['grade'] = 'Fail'
    if (normalAAA) grade = 'AAA'
    else if (normalAA) grade = 'AA'
    else if (largeAA) grade = 'AA Large'

    return { ratio, normalAA, normalAAA, largeAA, largeAAA, grade }
  }, [fgHex, bgHex])

  // ── Suggestions ──
  const suggestionAA = useMemo(() => {
    if (wcag.normalAA) return null
    return suggestCompliantColor(fgHex, bgHex, 4.5)
  }, [fgHex, bgHex, wcag.normalAA])

  const suggestionAAA = useMemo(() => {
    if (wcag.normalAAA) return null
    return suggestCompliantColor(fgHex, bgHex, 7)
  }, [fgHex, bgHex, wcag.normalAAA])

  // ── Handlers ──
  const handleFgPickerChange = useCallback((value: string) => {
    const upper = value.toUpperCase()
    setFgHex(upper)
    setFgInput(upper)
  }, [])

  const handleBgPickerChange = useCallback((value: string) => {
    const upper = value.toUpperCase()
    setBgHex(upper)
    setBgInput(upper)
  }, [])

  const handleFgInputChange = useCallback((value: string) => {
    setFgInput(value)
    if (isValidHex(value)) {
      setFgHex(normalizeHex(value))
    }
  }, [])

  const handleBgInputChange = useCallback((value: string) => {
    setBgInput(value)
    if (isValidHex(value)) {
      setBgHex(normalizeHex(value))
    }
  }, [])

  const handleSwap = useCallback(() => {
    setFgHex(bgHex)
    setBgHex(fgHex)
    setFgInput(bgHex)
    setBgInput(fgHex)
  }, [fgHex, bgHex])

  const handleRandom = useCallback(() => {
    const newFg = randomHex()
    const newBg = randomHex()
    setFgHex(newFg)
    setBgHex(newBg)
    setFgInput(newFg)
    setBgInput(newBg)
  }, [])

  const handlePreset = useCallback((fg: string, bg: string) => {
    setFgHex(fg)
    setBgHex(bg)
    setFgInput(fg)
    setBgInput(bg)
  }, [])

  // ── Grade display helpers ──
  const gradeColor =
    wcag.grade === 'AAA'
      ? 'text-green-600 dark:text-green-400'
      : wcag.grade === 'AA'
      ? 'text-blue-600 dark:text-blue-400'
      : wcag.grade === 'AA Large'
      ? 'text-yellow-600 dark:text-yellow-400'
      : 'text-red-600 dark:text-red-400'

  const gradeBg =
    wcag.grade === 'AAA'
      ? 'bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800'
      : wcag.grade === 'AA'
      ? 'bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800'
      : wcag.grade === 'AA Large'
      ? 'bg-yellow-50 dark:bg-yellow-950 border-yellow-200 dark:border-yellow-800'
      : 'bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800'

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <Palette className="w-7 h-7 text-blue-600 dark:text-blue-400" />
          {t('title')}
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('description')}</p>
      </div>

      {/* Main grid */}
      <div className="grid lg:grid-cols-3 gap-8">
        {/* Left: Color pickers */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 space-y-5">
            {/* Foreground */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                {t('foreground')}
              </label>
              <div className="flex gap-2 items-center">
                <div className="relative w-12 h-10 rounded-lg overflow-hidden border-2 border-gray-300 dark:border-gray-600 flex-shrink-0">
                  <input
                    type="color"
                    value={fgHex}
                    onChange={e => handleFgPickerChange(e.target.value)}
                    className="absolute inset-0 w-full h-full cursor-pointer opacity-0"
                    aria-label={t('foreground')}
                  />
                  <div className="w-full h-full rounded-md" style={{ backgroundColor: fgHex }} />
                </div>
                <input
                  type="text"
                  value={fgInput}
                  onChange={e => handleFgInputChange(e.target.value)}
                  placeholder="#000000"
                  maxLength={7}
                  className="flex-1 w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                  aria-label={t('foreground')}
                />
                <button
                  onClick={() => copyToClipboard(fgHex, 'fg')}
                  className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 flex-shrink-0"
                  aria-label={t('copy')}
                >
                  {copiedId === 'fg' ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Swap + Random */}
            <div className="flex gap-2">
              <button
                onClick={handleSwap}
                className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium transition-colors"
              >
                <ArrowLeftRight className="w-4 h-4" />
                {t('swap')}
              </button>
              <button
                onClick={handleRandom}
                className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium transition-colors"
              >
                <Shuffle className="w-4 h-4" />
                {t('random')}
              </button>
            </div>

            {/* Background */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                {t('background')}
              </label>
              <div className="flex gap-2 items-center">
                <div className="relative w-12 h-10 rounded-lg overflow-hidden border-2 border-gray-300 dark:border-gray-600 flex-shrink-0">
                  <input
                    type="color"
                    value={bgHex}
                    onChange={e => handleBgPickerChange(e.target.value)}
                    className="absolute inset-0 w-full h-full cursor-pointer opacity-0"
                    aria-label={t('background')}
                  />
                  <div className="w-full h-full rounded-md" style={{ backgroundColor: bgHex }} />
                </div>
                <input
                  type="text"
                  value={bgInput}
                  onChange={e => handleBgInputChange(e.target.value)}
                  placeholder="#FFFFFF"
                  maxLength={7}
                  className="flex-1 w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                  aria-label={t('background')}
                />
                <button
                  onClick={() => copyToClipboard(bgHex, 'bg')}
                  className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 flex-shrink-0"
                  aria-label={t('copy')}
                >
                  {copiedId === 'bg' ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Preview swatch */}
            <div
              className="rounded-lg p-4 flex items-center justify-center min-h-[80px] border border-gray-200 dark:border-gray-700"
              style={{ backgroundColor: bgHex }}
            >
              <span className="font-semibold text-base" style={{ color: fgHex }}>
                Aa
              </span>
              <span className="ml-3 text-sm" style={{ color: fgHex }}>
                {fgHex} / {bgHex}
              </span>
            </div>
          </div>
        </div>

        {/* Right: Results */}
        <div className="lg:col-span-2 space-y-4">
          {/* Contrast ratio card */}
          <div className={`bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border-2 ${gradeBg}`}>
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">{t('contrastRatio')}</p>
                <div className="flex items-baseline gap-3">
                  <span className={`text-5xl font-bold tabular-nums ${gradeColor}`}>
                    {wcag.ratio.toFixed(2)}
                  </span>
                  <span className="text-2xl text-gray-400 dark:text-gray-500">:1</span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className={`text-3xl font-bold ${gradeColor}`}>{wcag.grade}</span>
                <button
                  onClick={() => copyToClipboard(`${wcag.ratio.toFixed(2)}:1`, 'ratio')}
                  className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300"
                  aria-label={t('copy')}
                >
                  {copiedId === 'ratio' ? (
                    <Check className="w-4 h-4 text-green-500" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* WCAG grade table */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
            <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-4">
              {t('wcagGrades')}
            </h2>
            <div className="grid grid-cols-2 gap-3">
              {/* Normal text AA */}
              <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-700">
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{t('normalText')}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">AA (4.5:1)</p>
                </div>
                {wcag.normalAA ? (
                  <Check className="w-6 h-6 text-green-500 flex-shrink-0" />
                ) : (
                  <X className="w-6 h-6 text-red-500 flex-shrink-0" />
                )}
              </div>

              {/* Normal text AAA */}
              <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-700">
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{t('normalText')}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">AAA (7:1)</p>
                </div>
                {wcag.normalAAA ? (
                  <Check className="w-6 h-6 text-green-500 flex-shrink-0" />
                ) : (
                  <X className="w-6 h-6 text-red-500 flex-shrink-0" />
                )}
              </div>

              {/* Large text AA */}
              <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-700">
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{t('largeText')}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">AA (3:1)</p>
                </div>
                {wcag.largeAA ? (
                  <Check className="w-6 h-6 text-green-500 flex-shrink-0" />
                ) : (
                  <X className="w-6 h-6 text-red-500 flex-shrink-0" />
                )}
              </div>

              {/* Large text AAA */}
              <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-700">
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{t('largeText')}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">AAA (4.5:1)</p>
                </div>
                {wcag.largeAAA ? (
                  <Check className="w-6 h-6 text-green-500 flex-shrink-0" />
                ) : (
                  <X className="w-6 h-6 text-red-500 flex-shrink-0" />
                )}
              </div>
            </div>
          </div>

          {/* Text preview */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
            <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-4">
              {t('preview.title')}
            </h2>
            <div
              className="rounded-lg p-6 space-y-4 border border-gray-200 dark:border-gray-700"
              style={{ backgroundColor: bgHex }}
            >
              <p className="font-normal leading-relaxed" style={{ color: fgHex, fontSize: '16px' }}>
                {t('preview.normalText')}
              </p>
              <p className="font-semibold leading-snug" style={{ color: fgHex, fontSize: '24px' }}>
                {t('preview.largeText')}
              </p>
            </div>
          </div>

          {/* Suggestions */}
          {(!wcag.normalAA || !wcag.normalAAA) && (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
              <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-4">
                {t('suggestion')}
              </h2>
              <div className="space-y-3">
                {!wcag.normalAA && suggestionAA && (
                  <div className="flex items-center justify-between p-3 rounded-lg bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-8 h-8 rounded-md border border-gray-300 dark:border-gray-600 flex-shrink-0"
                        style={{ backgroundColor: suggestionAA }}
                      />
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {t('aa')} — {suggestionAA}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {t('suggestionAA')}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => { handleFgInputChange(suggestionAA); handleFgPickerChange(suggestionAA) }}
                        className="px-3 py-1 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                      >
                        {t('apply')}
                      </button>
                      <button
                        onClick={() => copyToClipboard(suggestionAA, 'sugAA')}
                        className="p-1.5 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300"
                      >
                        {copiedId === 'sugAA' ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                )}
                {!wcag.normalAAA && suggestionAAA && (
                  <div className="flex items-center justify-between p-3 rounded-lg bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-8 h-8 rounded-md border border-gray-300 dark:border-gray-600 flex-shrink-0"
                        style={{ backgroundColor: suggestionAAA }}
                      />
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {t('aaa')} — {suggestionAAA}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {t('suggestionAAA')}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => { handleFgInputChange(suggestionAAA); handleFgPickerChange(suggestionAAA) }}
                        className="px-3 py-1 text-xs bg-green-600 text-white rounded-lg hover:bg-green-700"
                      >
                        {t('apply')}
                      </button>
                      <button
                        onClick={() => copyToClipboard(suggestionAAA, 'sugAAA')}
                        className="p-1.5 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300"
                      >
                        {copiedId === 'sugAAA' ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Preset pairs */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          {t('presets')}
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {PRESET_PAIRS.map(pair => {
            const fg = hexToRgb(pair.fg)
            const bg = hexToRgb(pair.bg)
            let ratio = 1
            if (fg && bg) {
              ratio = getContrastRatio(getLuminance(fg.r, fg.g, fg.b), getLuminance(bg.r, bg.g, bg.b))
            }
            return (
              <button
                key={pair.labelKey}
                onClick={() => handlePreset(pair.fg, pair.bg)}
                className="flex flex-col items-center gap-2 p-3 rounded-lg border-2 border-gray-200 dark:border-gray-700 hover:border-blue-400 dark:hover:border-blue-500 transition-colors group"
              >
                <div
                  className="w-full h-12 rounded-md flex items-center justify-center text-sm font-semibold border border-gray-300 dark:border-gray-600"
                  style={{ backgroundColor: pair.bg, color: pair.fg }}
                >
                  Aa
                </div>
                <div className="text-center">
                  <p className="text-xs text-gray-600 dark:text-gray-400 truncate w-full">
                    {pair.fg} / {pair.bg}
                  </p>
                  <p className="text-xs font-mono text-gray-500 dark:text-gray-500">
                    {ratio.toFixed(1)}:1
                  </p>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Guide */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          {t('guide.title')}
        </h2>
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-3">
              {t('guide.wcag.title')}
            </h3>
            <ul className="space-y-2">
              {(t.raw('guide.wcag.items') as string[]).map((item, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <span className="text-blue-500 mt-0.5 flex-shrink-0">•</span>
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
                <li key={i} className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <span className="text-green-500 mt-0.5 flex-shrink-0">•</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
