'use client'

import { useState, useCallback, useMemo } from 'react'
import { useTranslations } from 'next-intl'
import { Copy, Check, ArrowRightLeft, Ruler } from 'lucide-react'

type Category = 'length' | 'weight' | 'temperature' | 'area' | 'volume' | 'data' | 'css'

interface UnitDefinition {
  name: string
  toBase: (value: number) => number
  fromBase: (value: number) => number
}

const UNITS: Record<Category, Record<string, UnitDefinition>> = {
  length: {
    mm: { name: 'mm', toBase: v => v / 1000, fromBase: v => v * 1000 },
    cm: { name: 'cm', toBase: v => v / 100, fromBase: v => v * 100 },
    m: { name: 'm', toBase: v => v, fromBase: v => v },
    km: { name: 'km', toBase: v => v * 1000, fromBase: v => v / 1000 },
    inch: { name: 'inch', toBase: v => v * 0.0254, fromBase: v => v / 0.0254 },
    ft: { name: 'ft', toBase: v => v * 0.3048, fromBase: v => v / 0.3048 },
    yard: { name: 'yard', toBase: v => v * 0.9144, fromBase: v => v / 0.9144 },
    mile: { name: 'mile', toBase: v => v * 1609.344, fromBase: v => v / 1609.344 },
  },
  weight: {
    mg: { name: 'mg', toBase: v => v / 1000000, fromBase: v => v * 1000000 },
    g: { name: 'g', toBase: v => v / 1000, fromBase: v => v * 1000 },
    kg: { name: 'kg', toBase: v => v, fromBase: v => v },
    ton: { name: 'ton', toBase: v => v * 1000, fromBase: v => v / 1000 },
    oz: { name: 'oz', toBase: v => v * 0.0283495, fromBase: v => v / 0.0283495 },
    lb: { name: 'lb', toBase: v => v * 0.453592, fromBase: v => v / 0.453592 },
  },
  temperature: {
    celsius: { name: '°C', toBase: v => v, fromBase: v => v },
    fahrenheit: { name: '°F', toBase: v => (v - 32) * 5/9, fromBase: v => v * 9/5 + 32 },
    kelvin: { name: 'K', toBase: v => v - 273.15, fromBase: v => v + 273.15 },
  },
  area: {
    sqmm: { name: 'mm²', toBase: v => v / 1000000, fromBase: v => v * 1000000 },
    sqcm: { name: 'cm²', toBase: v => v / 10000, fromBase: v => v * 10000 },
    sqm: { name: 'm²', toBase: v => v, fromBase: v => v },
    sqkm: { name: 'km²', toBase: v => v * 1000000, fromBase: v => v / 1000000 },
    pyeong: { name: '평', toBase: v => v * 3.305785, fromBase: v => v / 3.305785 },
    acre: { name: 'acre', toBase: v => v * 4046.86, fromBase: v => v / 4046.86 },
    sqft: { name: 'ft²', toBase: v => v * 0.092903, fromBase: v => v / 0.092903 },
  },
  volume: {
    ml: { name: 'mL', toBase: v => v / 1000, fromBase: v => v * 1000 },
    l: { name: 'L', toBase: v => v, fromBase: v => v },
    cubicm: { name: 'm³', toBase: v => v * 1000, fromBase: v => v / 1000 },
    gallon: { name: 'gallon', toBase: v => v * 3.78541, fromBase: v => v / 3.78541 },
    floz: { name: 'fl oz', toBase: v => v * 0.0295735, fromBase: v => v / 0.0295735 },
  },
  data: {
    bit: { name: 'bit', toBase: v => v / 8, fromBase: v => v * 8 },
    byte: { name: 'B', toBase: v => v, fromBase: v => v },
    kb: { name: 'KB', toBase: v => v * 1024, fromBase: v => v / 1024 },
    mb: { name: 'MB', toBase: v => v * 1024 * 1024, fromBase: v => v / (1024 * 1024) },
    gb: { name: 'GB', toBase: v => v * 1024 * 1024 * 1024, fromBase: v => v / (1024 * 1024 * 1024) },
    tb: { name: 'TB', toBase: v => v * 1024 * 1024 * 1024 * 1024, fromBase: v => v / (1024 * 1024 * 1024 * 1024) },
  },
  css: {
    px: { name: 'px', toBase: v => v, fromBase: v => v },
    rem: { name: 'rem', toBase: v => v * 16, fromBase: v => v / 16 },
    em: { name: 'em', toBase: v => v * 16, fromBase: v => v / 16 },
    pt: { name: 'pt', toBase: v => v * 1.333333, fromBase: v => v / 1.333333 },
    vw: { name: 'vw', toBase: v => v * 19.2, fromBase: v => v / 19.2 }, // assuming 1920px viewport
    vh: { name: 'vh', toBase: v => v * 10.8, fromBase: v => v / 10.8 }, // assuming 1080px viewport
  },
}

export default function UnitConverter() {
  const t = useTranslations('unitConverter')
  const [category, setCategory] = useState<Category>('length')
  const [fromUnit, setFromUnit] = useState('m')
  const [toUnit, setToUnit] = useState('cm')
  const [inputValue, setInputValue] = useState('1')
  const [copied, setCopied] = useState(false)

  const categories: Category[] = ['length', 'weight', 'temperature', 'area', 'volume', 'data', 'css']

  const currentUnits = useMemo(() => UNITS[category], [category])

  const result = useMemo(() => {
    const value = parseFloat(inputValue)
    if (isNaN(value)) return ''

    const baseValue = currentUnits[fromUnit].toBase(value)
    const converted = currentUnits[toUnit].fromBase(baseValue)

    // Format number nicely
    if (Math.abs(converted) >= 1000000 || (Math.abs(converted) < 0.0001 && converted !== 0)) {
      return converted.toExponential(6)
    }
    return converted.toLocaleString(undefined, { maximumFractionDigits: 10 })
  }, [inputValue, fromUnit, toUnit, currentUnits])

  const handleCategoryChange = useCallback((newCategory: Category) => {
    setCategory(newCategory)
    const units = Object.keys(UNITS[newCategory])
    setFromUnit(units[0])
    setToUnit(units[1])
  }, [])

  const handleSwap = useCallback(() => {
    setFromUnit(toUnit)
    setToUnit(fromUnit)
  }, [fromUnit, toUnit])

  const handleCopy = useCallback(async () => {
    if (!result) return
    try {
      await navigator.clipboard.writeText(result)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      const textarea = document.createElement('textarea')
      textarea.value = result
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand('copy')
      document.body.removeChild(textarea)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }, [result])

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <Ruler className="w-7 h-7 text-cyan-500" />
          {t('title')}
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          {t('description')}
        </p>
      </div>

      {/* Category Tabs */}
      <div className="flex flex-wrap gap-2 mb-6">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => handleCategoryChange(cat)}
            className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${
              category === cat
                ? 'bg-cyan-500 text-white shadow-md'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
            }`}
          >
            {t(`categories.${cat}`)}
          </button>
        ))}
      </div>

      {/* Converter */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 p-6 mb-6">
        <div className="grid md:grid-cols-[1fr,auto,1fr] gap-4 items-end">
          {/* From */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('from')}
            </label>
            <div className="flex gap-2">
              <input
                type="number"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                className="flex-1 px-4 py-3 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-lg font-mono"
                placeholder="0"
              />
              <select
                value={fromUnit}
                onChange={(e) => setFromUnit(e.target.value)}
                className="px-4 py-3 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-medium"
              >
                {Object.entries(currentUnits).map(([key, unit]) => (
                  <option key={key} value={key}>{unit.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Swap Button */}
          <button
            onClick={handleSwap}
            className="p-3 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-all self-end mb-1"
            title={t('swap')}
          >
            <ArrowRightLeft className="w-5 h-5" />
          </button>

          {/* To */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('to')}
            </label>
            <div className="flex gap-2">
              <div className="flex-1 px-4 py-3 rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50 text-gray-900 dark:text-white text-lg font-mono">
                {result || '0'}
              </div>
              <select
                value={toUnit}
                onChange={(e) => setToUnit(e.target.value)}
                className="px-4 py-3 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-medium"
              >
                {Object.entries(currentUnits).map(([key, unit]) => (
                  <option key={key} value={key}>{unit.name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Copy Button */}
        <div className="flex justify-center mt-6">
          <button
            onClick={handleCopy}
            disabled={!result}
            className="inline-flex items-center gap-2 px-6 py-2 rounded-lg font-medium bg-cyan-500 hover:bg-cyan-600 text-white transition-all disabled:opacity-50"
          >
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            {copied ? t('copied') : t('copyResult')}
          </button>
        </div>
      </div>

      {/* Quick Conversions */}
      {inputValue && !isNaN(parseFloat(inputValue)) && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 p-6 mb-6">
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">
            {t('quickConversions')}
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {Object.entries(currentUnits).map(([key, unit]) => {
              if (key === fromUnit) return null
              const value = parseFloat(inputValue)
              const baseValue = currentUnits[fromUnit].toBase(value)
              const converted = currentUnits[key].fromBase(baseValue)
              const displayValue = Math.abs(converted) >= 1000000 || (Math.abs(converted) < 0.0001 && converted !== 0)
                ? converted.toExponential(4)
                : converted.toLocaleString(undefined, { maximumFractionDigits: 6 })
              return (
                <div key={key} className="px-3 py-2 rounded-lg bg-gray-50 dark:bg-gray-700/50">
                  <span className="text-xs text-gray-500 dark:text-gray-400">{unit.name}</span>
                  <p className="font-mono text-gray-900 dark:text-white truncate">{displayValue}</p>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Guide */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          {t('guide.title')}
        </h2>
        <div className="grid md:grid-cols-2 gap-6 text-sm text-gray-600 dark:text-gray-400">
          <div>
            <h3 className="font-medium text-gray-700 dark:text-gray-300 mb-2">{t('guide.supported.title')}</h3>
            <ul className="space-y-1">
              {(t.raw('guide.supported.items') as string[]).map((item, idx) => (
                <li key={idx}>• {item}</li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="font-medium text-gray-700 dark:text-gray-300 mb-2">{t('guide.tips.title')}</h3>
            <ul className="space-y-1">
              {(t.raw('guide.tips.items') as string[]).map((item, idx) => (
                <li key={idx}>• {item}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
