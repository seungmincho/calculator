'use client'

/**
 * AverageCalculator - 평균 계산기
 * Translation namespace: averageCalc
 *
 * Translation keys used:
 * - title, description
 * - inputLabel, inputPlaceholder, inputHelp
 * - weightedMode, weightedValue, weightedWeight, addPair, removePair
 * - clearAll, calculate
 * - arithmetic, arithmeticDesc
 * - weighted, weightedDesc
 * - geometric, geometricDesc, geometricError
 * - harmonic, harmonicDesc, harmonicError
 * - statsTitle
 * - statSum, statCount, statMax, statMin, statRange
 * - statVariance, statStdDev, statMedian
 * - resultLabel
 * - guide.title
 * - guide.arithmetic.title, guide.arithmetic.items (array)
 * - guide.weighted.title, guide.weighted.items (array)
 * - guide.geometric.title, guide.geometric.items (array)
 * - guide.harmonic.title, guide.harmonic.items (array)
 */

import { useState, useCallback, useMemo } from 'react'
import { useTranslations } from 'next-intl'
import { Copy, Check, Calculator, Plus, Trash2, BookOpen, BarChart3 } from 'lucide-react'

interface WeightedPair {
  id: number
  value: string
  weight: string
}

let pairIdCounter = 2

export default function AverageCalculator() {
  const t = useTranslations('averageCalc')
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [inputText, setInputText] = useState('')
  const [isWeightedMode, setIsWeightedMode] = useState(false)
  const [weightedPairs, setWeightedPairs] = useState<WeightedPair[]>([
    { id: 0, value: '', weight: '1' },
    { id: 1, value: '', weight: '1' },
  ])

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

  // Parse numbers from textarea (comma or newline separated)
  const numbers = useMemo<number[]>(() => {
    if (isWeightedMode) return []
    const parts = inputText
      .split(/[,\n]+/)
      .map(s => s.trim())
      .filter(s => s.length > 0)
      .map(Number)
      .filter(n => !isNaN(n))
    return parts
  }, [inputText, isWeightedMode])

  // Parse weighted pairs
  const validPairs = useMemo(() => {
    if (!isWeightedMode) return []
    return weightedPairs
      .filter(p => p.value.trim() !== '' && p.weight.trim() !== '')
      .map(p => ({ value: Number(p.value), weight: Number(p.weight) }))
      .filter(p => !isNaN(p.value) && !isNaN(p.weight) && p.weight > 0)
  }, [weightedPairs, isWeightedMode])

  const activeNumbers = isWeightedMode ? validPairs.map(p => p.value) : numbers
  const hasData = activeNumbers.length > 0

  // ---- Averages ----
  const arithmeticMean = useMemo(() => {
    if (!hasData) return null
    const sum = activeNumbers.reduce((a, b) => a + b, 0)
    return sum / activeNumbers.length
  }, [activeNumbers, hasData])

  const weightedMean = useMemo(() => {
    if (!isWeightedMode || validPairs.length === 0) return null
    const weightedSum = validPairs.reduce((acc, p) => acc + p.value * p.weight, 0)
    const weightSum = validPairs.reduce((acc, p) => acc + p.weight, 0)
    if (weightSum === 0) return null
    return weightedSum / weightSum
  }, [validPairs, isWeightedMode])

  const geometricMean = useMemo<{ value: number | null; error: boolean }>(() => {
    if (!hasData) return { value: null, error: false }
    if (activeNumbers.some(n => n <= 0)) return { value: null, error: true }
    const logSum = activeNumbers.reduce((acc, n) => acc + Math.log(n), 0)
    return { value: Math.exp(logSum / activeNumbers.length), error: false }
  }, [activeNumbers, hasData])

  const harmonicMean = useMemo<{ value: number | null; error: boolean }>(() => {
    if (!hasData) return { value: null, error: false }
    if (activeNumbers.some(n => n === 0)) return { value: null, error: true }
    const reciprocalSum = activeNumbers.reduce((acc, n) => acc + 1 / n, 0)
    return { value: activeNumbers.length / reciprocalSum, error: false }
  }, [activeNumbers, hasData])

  // ---- Statistics ----
  const stats = useMemo(() => {
    if (!hasData) return null
    const sorted = [...activeNumbers].sort((a, b) => a - b)
    const n = sorted.length
    const sum = sorted.reduce((a, b) => a + b, 0)
    const mean = sum / n
    const max = sorted[n - 1]
    const min = sorted[0]
    const range = max - min
    const variance = sorted.reduce((acc, v) => acc + (v - mean) ** 2, 0) / n
    const stdDev = Math.sqrt(variance)
    const median = n % 2 === 1
      ? sorted[Math.floor(n / 2)]
      : (sorted[n / 2 - 1] + sorted[n / 2]) / 2

    return { sum, count: n, max, min, range, variance, stdDev, median }
  }, [activeNumbers, hasData])

  const formatNum = (n: number) => {
    if (Number.isInteger(n) && Math.abs(n) < 1e15) return n.toLocaleString()
    return parseFloat(n.toPrecision(10)).toString()
  }

  // Weighted pair handlers
  const addPair = useCallback(() => {
    setWeightedPairs(prev => [...prev, { id: pairIdCounter++, value: '', weight: '1' }])
  }, [])

  const removePair = useCallback((id: number) => {
    setWeightedPairs(prev => prev.length <= 2 ? prev : prev.filter(p => p.id !== id))
  }, [])

  const updatePair = useCallback((id: number, field: 'value' | 'weight', val: string) => {
    setWeightedPairs(prev => prev.map(p => p.id === id ? { ...p, [field]: val } : p))
  }, [])

  const handleClear = useCallback(() => {
    setInputText('')
    setWeightedPairs([
      { id: pairIdCounter++, value: '', weight: '1' },
      { id: pairIdCounter++, value: '', weight: '1' },
    ])
  }, [])

  const averageCards: { key: string; label: string; desc: string; value: number | null; error?: string }[] = [
    {
      key: 'arithmetic',
      label: t('arithmetic'),
      desc: t('arithmeticDesc'),
      value: arithmeticMean,
    },
    {
      key: 'weighted',
      label: t('weighted'),
      desc: t('weightedDesc'),
      value: isWeightedMode ? weightedMean : arithmeticMean,
    },
    {
      key: 'geometric',
      label: t('geometric'),
      desc: t('geometricDesc'),
      value: geometricMean.value,
      error: geometricMean.error ? t('geometricError') : undefined,
    },
    {
      key: 'harmonic',
      label: t('harmonic'),
      desc: t('harmonicDesc'),
      value: harmonicMean.value,
      error: harmonicMean.error ? t('harmonicError') : undefined,
    },
  ]

  const statRows = stats ? [
    { key: 'statSum', value: formatNum(stats.sum) },
    { key: 'statCount', value: stats.count.toString() },
    { key: 'statMax', value: formatNum(stats.max) },
    { key: 'statMin', value: formatNum(stats.min) },
    { key: 'statRange', value: formatNum(stats.range) },
    { key: 'statVariance', value: formatNum(stats.variance) },
    { key: 'statStdDev', value: formatNum(stats.stdDev) },
    { key: 'statMedian', value: formatNum(stats.median) },
  ] : []

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <Calculator className="w-7 h-7 text-blue-600" />
          {t('title')}
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('description')}</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Left: Input */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 space-y-4">
            {/* Weighted mode toggle */}
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={isWeightedMode}
                onChange={e => setIsWeightedMode(e.target.checked)}
                className="w-4 h-4 accent-blue-600 rounded"
              />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {t('weightedMode')}
              </span>
            </label>

            {!isWeightedMode ? (
              <>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  {t('inputLabel')}
                </label>
                <textarea
                  value={inputText}
                  onChange={e => setInputText(e.target.value)}
                  rows={8}
                  placeholder={t('inputPlaceholder')}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 resize-y text-sm font-mono"
                />
                <p className="text-xs text-gray-400 dark:text-gray-500">{t('inputHelp')}</p>
              </>
            ) : (
              <div className="space-y-3">
                <div className="grid grid-cols-[1fr_1fr_32px] gap-2 text-xs font-medium text-gray-500 dark:text-gray-400">
                  <span>{t('weightedValue')}</span>
                  <span>{t('weightedWeight')}</span>
                  <span />
                </div>
                {weightedPairs.map(pair => (
                  <div key={pair.id} className="grid grid-cols-[1fr_1fr_32px] gap-2 items-center">
                    <input
                      type="number"
                      value={pair.value}
                      onChange={e => updatePair(pair.id, 'value', e.target.value)}
                      placeholder="0"
                      className="w-full px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500"
                    />
                    <input
                      type="number"
                      value={pair.weight}
                      onChange={e => updatePair(pair.id, 'weight', e.target.value)}
                      placeholder="1"
                      min="0"
                      step="0.1"
                      className="w-full px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                      onClick={() => removePair(pair.id)}
                      disabled={weightedPairs.length <= 2}
                      className="p-1 text-red-400 hover:text-red-600 disabled:opacity-30 disabled:cursor-not-allowed"
                      aria-label={t('removePair')}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                <button
                  onClick={addPair}
                  className="flex items-center gap-1 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-medium"
                >
                  <Plus className="w-4 h-4" />
                  {t('addPair')}
                </button>
              </div>
            )}

            <button
              onClick={handleClear}
              className="w-full bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg px-4 py-2 text-sm font-medium transition-colors"
            >
              {t('clearAll')}
            </button>
          </div>
        </div>

        {/* Right: Results */}
        <div className="lg:col-span-2 space-y-6">
          {/* Average cards */}
          <div className="grid sm:grid-cols-2 gap-4">
            {averageCards.map(card => (
              <div
                key={card.key}
                className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-5 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                    {card.label}
                  </h3>
                  {card.value != null && (
                    <button
                      onClick={() => copyToClipboard(formatNum(card.value!), card.key)}
                      className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                      aria-label="Copy"
                    >
                      {copiedId === card.key ? (
                        <Check className="w-4 h-4 text-green-500" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </button>
                  )}
                </div>
                <p className="text-xs text-gray-400 dark:text-gray-500">{card.desc}</p>
                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {card.error ? (
                    <span className="text-sm text-red-500 dark:text-red-400 font-normal">{card.error}</span>
                  ) : card.value != null ? (
                    formatNum(card.value)
                  ) : (
                    <span className="text-gray-300 dark:text-gray-600">-</span>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Statistics table */}
          {stats && (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-indigo-500" />
                {t('statsTitle')}
              </h2>
              <div className="grid sm:grid-cols-2 gap-x-8 gap-y-2">
                {statRows.map(row => (
                  <div
                    key={row.key}
                    className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-700 last:border-b-0"
                  >
                    <span className="text-sm text-gray-600 dark:text-gray-400">{t(row.key)}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-900 dark:text-white font-mono">
                        {row.value}
                      </span>
                      <button
                        onClick={() => copyToClipboard(row.value, row.key)}
                        className="p-0.5 text-gray-300 hover:text-gray-500 dark:text-gray-600 dark:hover:text-gray-400"
                        aria-label="Copy"
                      >
                        {copiedId === row.key ? (
                          <Check className="w-3.5 h-3.5 text-green-500" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Empty state */}
          {!hasData && (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-12 text-center">
              <Calculator className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
              <p className="text-gray-400 dark:text-gray-500 text-sm">{t('inputHelp')}</p>
            </div>
          )}
        </div>
      </div>

      {/* Guide */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-blue-500" />
          {t('guide.title')}
        </h2>
        <div className="grid sm:grid-cols-2 gap-6">
          {(['arithmetic', 'weighted', 'geometric', 'harmonic'] as const).map(section => (
            <div key={section} className="space-y-2">
              <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                {t(`guide.${section}.title`)}
              </h3>
              <ul className="space-y-1">
                {(t.raw(`guide.${section}.items`) as string[]).map((item, i) => (
                  <li key={i} className="text-xs text-gray-600 dark:text-gray-400 flex items-start gap-1.5">
                    <span className="text-blue-400 mt-0.5">&#8226;</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
