'use client'

import { useState, useCallback, useMemo } from 'react'
import { useTranslations } from 'next-intl'
import { Copy, Check, ChevronDown, ChevronUp, BookOpen } from 'lucide-react'

type CssUnit = 'px' | 'rem' | 'em' | 'vw' | 'vh' | '%' | 'pt' | 'cm' | 'mm' | 'in'

const ALL_UNITS: CssUnit[] = ['px', 'rem', 'em', 'vw', 'vh', '%', 'pt', 'cm', 'mm', 'in']

const UNIT_COLORS: Record<CssUnit, string> = {
  px: 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300',
  rem: 'bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300',
  em: 'bg-violet-100 dark:bg-violet-900 text-violet-700 dark:text-violet-300',
  vw: 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300',
  vh: 'bg-teal-100 dark:bg-teal-900 text-teal-700 dark:text-teal-300',
  '%': 'bg-orange-100 dark:bg-orange-900 text-orange-700 dark:text-orange-300',
  pt: 'bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300',
  cm: 'bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-300',
  mm: 'bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-300',
  in: 'bg-pink-100 dark:bg-pink-900 text-pink-700 dark:text-pink-300',
}

interface ConversionSettings {
  rootFontSize: number
  parentFontSize: number
  viewportWidth: number
  viewportHeight: number
}

function toPx(value: number, unit: CssUnit, settings: ConversionSettings): number {
  switch (unit) {
    case 'px': return value
    case 'rem': return value * settings.rootFontSize
    case 'em': return value * settings.parentFontSize
    case 'vw': return (value / 100) * settings.viewportWidth
    case 'vh': return (value / 100) * settings.viewportHeight
    case '%': return (value / 100) * settings.parentFontSize
    case 'pt': return value / 0.75
    case 'cm': return value * 37.7952755906
    case 'mm': return value * 3.77952755906
    case 'in': return value * 96
    default: return value
  }
}

function fromPx(px: number, unit: CssUnit, settings: ConversionSettings): number {
  switch (unit) {
    case 'px': return px
    case 'rem': return px / settings.rootFontSize
    case 'em': return px / settings.parentFontSize
    case 'vw': return (px / settings.viewportWidth) * 100
    case 'vh': return (px / settings.viewportHeight) * 100
    case '%': return (px / settings.parentFontSize) * 100
    case 'pt': return px * 0.75
    case 'cm': return px / 37.7952755906
    case 'mm': return px / 3.77952755906
    case 'in': return px / 96
    default: return px
  }
}

function formatValue(val: number): string {
  if (!isFinite(val) || isNaN(val)) return '—'
  if (Math.abs(val) >= 1000000) return val.toExponential(3)
  const decimals = Math.abs(val) >= 100 ? 4 : Math.abs(val) >= 10 ? 5 : 6
  const str = val.toPrecision(decimals)
  // Remove trailing zeros after decimal
  return parseFloat(str).toString()
}

export default function CssUnitConverter() {
  const t = useTranslations('cssUnitConverter')

  const [inputValue, setInputValue] = useState<string>('16')
  const [selectedUnit, setSelectedUnit] = useState<CssUnit>('px')
  const [settings, setSettings] = useState<ConversionSettings>({
    rootFontSize: 16,
    parentFontSize: 16,
    viewportWidth: 1920,
    viewportHeight: 1080,
  })
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [showGuide, setShowGuide] = useState(false)

  const numericValue = useMemo(() => {
    const n = parseFloat(inputValue)
    return isNaN(n) ? 0 : n
  }, [inputValue])

  const conversions = useMemo(() => {
    const pxValue = toPx(numericValue, selectedUnit, settings)
    return ALL_UNITS.map(unit => ({
      unit,
      value: unit === selectedUnit ? numericValue : fromPx(pxValue, unit, settings),
      formatted: unit === selectedUnit ? formatValue(numericValue) : formatValue(fromPx(pxValue, unit, settings)),
    }))
  }, [numericValue, selectedUnit, settings])

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

  const handleSettingChange = useCallback((key: keyof ConversionSettings, raw: string) => {
    const val = parseFloat(raw)
    if (!isNaN(val) && val > 0) {
      setSettings(prev => ({ ...prev, [key]: val }))
    }
  }, [])

  const UNIT_LABELS: Record<CssUnit, string> = {
    px: 'pixels',
    rem: 'root EM',
    em: 'EM',
    vw: 'viewport width',
    vh: 'viewport height',
    '%': 'percent',
    pt: 'points',
    cm: 'centimeters',
    mm: 'millimeters',
    in: 'inches',
  }

  const quickRefHeaders = t.raw('quickRefHeaders') as string[]
  const quickRefRows = t.raw('quickRefRows') as string[][]
  const guideAbsoluteItems = t.raw('guideAbsoluteItems') as string[]
  const guideRelativeItems = t.raw('guideRelativeItems') as string[]
  const guideViewportItems = t.raw('guideViewportItems') as string[]
  const guideTipsItems = t.raw('guideTipsItems') as string[]

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('title')}</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('description')}</p>
      </div>

      {/* Main grid */}
      <div className="grid lg:grid-cols-3 gap-8">
        {/* Left: Input + Settings */}
        <div className="lg:col-span-1 space-y-4">
          {/* Input card */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('inputLabel')}
              </label>
              <input
                type="number"
                value={inputValue}
                onChange={e => setInputValue(e.target.value)}
                placeholder={t('inputPlaceholder')}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg font-mono"
                aria-label={t('inputLabel')}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('unitLabel')}
              </label>
              <div className="grid grid-cols-5 gap-1.5">
                {ALL_UNITS.map(unit => (
                  <button
                    key={unit}
                    onClick={() => setSelectedUnit(unit)}
                    className={`py-2 rounded-lg text-sm font-bold transition-all ${
                      selectedUnit === unit
                        ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md scale-105'
                        : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300'
                    }`}
                    aria-pressed={selectedUnit === unit}
                  >
                    {unit}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Settings card */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 space-y-4">
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">{t('settingsTitle')}</h2>

            <div>
              <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">{t('rootFontSize')}</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  defaultValue={settings.rootFontSize}
                  onBlur={e => handleSettingChange('rootFontSize', e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSettingChange('rootFontSize', (e.target as HTMLInputElement).value)}
                  min="1"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 text-sm"
                  aria-label={t('rootFontSize')}
                />
                <span className="text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap">px</span>
              </div>
            </div>

            <div>
              <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">{t('parentFontSize')}</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  defaultValue={settings.parentFontSize}
                  onBlur={e => handleSettingChange('parentFontSize', e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSettingChange('parentFontSize', (e.target as HTMLInputElement).value)}
                  min="1"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 text-sm"
                  aria-label={t('parentFontSize')}
                />
                <span className="text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap">px</span>
              </div>
            </div>

            <div>
              <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">{t('viewportWidth')}</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  defaultValue={settings.viewportWidth}
                  onBlur={e => handleSettingChange('viewportWidth', e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSettingChange('viewportWidth', (e.target as HTMLInputElement).value)}
                  min="1"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 text-sm"
                  aria-label={t('viewportWidth')}
                />
                <span className="text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap">px</span>
              </div>
            </div>

            <div>
              <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">{t('viewportHeight')}</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  defaultValue={settings.viewportHeight}
                  onBlur={e => handleSettingChange('viewportHeight', e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSettingChange('viewportHeight', (e.target as HTMLInputElement).value)}
                  min="1"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 text-sm"
                  aria-label={t('viewportHeight')}
                />
                <span className="text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap">px</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Results */}
        <div className="lg:col-span-2">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
            <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-4">{t('resultsTitle')}</h2>
            <div className="grid sm:grid-cols-2 gap-3">
              {conversions.map(({ unit, value, formatted }) => {
                const isActive = unit === selectedUnit
                const copyId = `result-${unit}`
                const isCopied = copiedId === copyId
                const displayText = `${formatted}${unit}`

                return (
                  <div
                    key={unit}
                    className={`flex items-center justify-between p-4 rounded-xl border-2 transition-all ${
                      isActive
                        ? 'border-blue-500 dark:border-blue-400 bg-blue-50 dark:bg-blue-950'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className={`inline-block px-2 py-1 rounded-md text-xs font-bold min-w-[2.5rem] text-center ${UNIT_COLORS[unit]}`}>
                        {unit}
                      </span>
                      <div className="min-w-0">
                        <div className="font-mono font-semibold text-gray-900 dark:text-white text-base truncate">
                          {formatted}
                          <span className="text-gray-400 dark:text-gray-500 text-sm ml-0.5">{unit}</span>
                        </div>
                        <div className="text-xs text-gray-400 dark:text-gray-500">{UNIT_LABELS[unit]}</div>
                      </div>
                    </div>
                    <button
                      onClick={() => copyToClipboard(displayText, copyId)}
                      className="ml-2 shrink-0 p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                      aria-label={isCopied ? t('copySuccess') : t('copy')}
                      title={isCopied ? t('copySuccess') : t('copy')}
                    >
                      {isCopied
                        ? <Check className="w-4 h-4 text-green-500" />
                        : <Copy className="w-4 h-4" />
                      }
                    </button>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Quick Reference Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">{t('quickRefTitle')}</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">{t('quickRefDesc')}</p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700">
                {quickRefHeaders.map((header, i) => (
                  <th key={i} className="text-left py-2 px-3 font-semibold text-gray-700 dark:text-gray-300">
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {quickRefRows.map((row, i) => (
                <tr key={i} className={`border-b border-gray-100 dark:border-gray-700 ${i % 2 === 0 ? 'bg-gray-50 dark:bg-gray-750' : ''}`}>
                  {row.map((cell, j) => (
                    <td key={j} className={`py-2.5 px-3 ${j === 0 ? 'font-semibold text-blue-600 dark:text-blue-400 font-mono' : j === 1 ? 'text-gray-600 dark:text-gray-400' : 'font-mono text-gray-700 dark:text-gray-300'}`}>
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Guide Section */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
        <button
          onClick={() => setShowGuide(prev => !prev)}
          className="w-full flex items-center justify-between text-left"
          aria-expanded={showGuide}
        >
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">{t('guideTitle')}</h2>
          </div>
          {showGuide ? <ChevronUp className="w-5 h-5 text-gray-500" /> : <ChevronDown className="w-5 h-5 text-gray-500" />}
        </button>

        {showGuide && (
          <div className="mt-6 space-y-6">
            {/* Absolute Units */}
            <div className="bg-blue-50 dark:bg-blue-950 rounded-xl p-5">
              <h3 className="text-base font-semibold text-blue-800 dark:text-blue-200 mb-3">{t('guideAbsoluteTitle')}</h3>
              <ul className="space-y-2">
                {guideAbsoluteItems.map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-blue-700 dark:text-blue-300">
                    <span className="mt-1 w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            {/* Relative Units */}
            <div className="bg-purple-50 dark:bg-purple-950 rounded-xl p-5">
              <h3 className="text-base font-semibold text-purple-800 dark:text-purple-200 mb-3">{t('guideRelativeTitle')}</h3>
              <ul className="space-y-2">
                {guideRelativeItems.map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-purple-700 dark:text-purple-300">
                    <span className="mt-1 w-1.5 h-1.5 rounded-full bg-purple-400 shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            {/* Viewport Units */}
            <div className="bg-green-50 dark:bg-green-950 rounded-xl p-5">
              <h3 className="text-base font-semibold text-green-800 dark:text-green-200 mb-3">{t('guideViewportTitle')}</h3>
              <ul className="space-y-2">
                {guideViewportItems.map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-green-700 dark:text-green-300">
                    <span className="mt-1 w-1.5 h-1.5 rounded-full bg-green-400 shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            {/* Tips */}
            <div className="bg-orange-50 dark:bg-orange-950 rounded-xl p-5">
              <h3 className="text-base font-semibold text-orange-800 dark:text-orange-200 mb-3">{t('guideTipsTitle')}</h3>
              <ul className="space-y-2">
                {guideTipsItems.map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-orange-700 dark:text-orange-300">
                    <span className="mt-1 w-1.5 h-1.5 rounded-full bg-orange-400 shrink-0" />
                    {item}
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
