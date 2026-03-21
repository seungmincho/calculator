'use client'

import { useState, useMemo, useCallback, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { useRouter, useSearchParams } from 'next/navigation'
import { Tag, Copy, Check, RotateCcw, Plus, BookOpen, Percent, X, Link } from 'lucide-react'

type CalculationMode = 'discountRate' | 'finalPrice' | 'discountAmount'

interface MultiDiscount {
  id: string
  rate: number
}

export default function DiscountCalculator() {
  const t = useTranslations('discountCalculator')
  const router = useRouter()
  const searchParams = useSearchParams()
  const [copiedId, setCopiedId] = useState<string | null>(null)

  // ── Initialise from URL params (first render) ──────────────────────────────
  const initMode = (): CalculationMode => {
    const m = searchParams.get('mode')
    if (m === 'finalPrice' || m === 'discountAmount') return m
    return 'discountRate'
  }

  // Calculation mode
  const [mode, setMode] = useState<CalculationMode>(initMode)

  // Input states — seeded from URL if present
  const [originalPrice, setOriginalPrice] = useState<number>(() => {
    const v = searchParams.get('original')
    return v !== null && !isNaN(Number(v)) ? Math.max(0, Number(v)) : 100000
  })
  const [discountRate, setDiscountRate] = useState<number>(() => {
    const v = searchParams.get('rate')
    return v !== null && !isNaN(Number(v)) ? Math.min(100, Math.max(0, Number(v))) : 20
  })
  const [discountAmount, setDiscountAmount] = useState<number>(() => {
    const v = searchParams.get('amount')
    return v !== null && !isNaN(Number(v)) ? Math.max(0, Number(v)) : 20000
  })
  const [finalPrice, setFinalPrice] = useState<number>(() => {
    const v = searchParams.get('final')
    return v !== null && !isNaN(Number(v)) ? Math.max(0, Number(v)) : 80000
  })

  // Multi discount states
  const [multiDiscounts, setMultiDiscounts] = useState<MultiDiscount[]>([
    { id: '1', rate: 20 },
    { id: '2', rate: 10 }
  ])

  // ── Sync main params to URL whenever they change ───────────────────────────
  useEffect(() => {
    const params = new URLSearchParams()
    params.set('mode', mode)
    params.set('original', String(originalPrice))
    params.set('rate', String(discountRate))
    params.set('amount', String(discountAmount))
    params.set('final', String(finalPrice))
    router.replace(`?${params.toString()}`, { scroll: false })
  }, [mode, originalPrice, discountRate, discountAmount, finalPrice, router])

  // ── Copy helpers ───────────────────────────────────────────────────────────
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

  const copyLink = useCallback(() => {
    copyToClipboard(window.location.href, 'link')
  }, [copyToClipboard])

  // Quick rate buttons
  const quickRates = [10, 20, 30, 40, 50, 60, 70, 80, 90]

  // ── Main calculation logic ─────────────────────────────────────────────────
  const result = useMemo(() => {
    let calculatedOriginal = originalPrice
    let calculatedDiscount = discountRate
    let calculatedSavings = 0
    let calculatedFinal = 0

    if (mode === 'discountRate') {
      calculatedSavings = (calculatedOriginal * calculatedDiscount) / 100
      calculatedFinal = calculatedOriginal - calculatedSavings
    } else if (mode === 'finalPrice') {
      if (finalPrice >= calculatedOriginal) {
        calculatedDiscount = 0
        calculatedSavings = 0
        calculatedFinal = finalPrice
      } else {
        calculatedSavings = calculatedOriginal - finalPrice
        calculatedDiscount = (calculatedSavings / calculatedOriginal) * 100
        calculatedFinal = finalPrice
      }
    } else if (mode === 'discountAmount') {
      if (discountAmount >= calculatedOriginal) {
        calculatedDiscount = 100
        calculatedSavings = calculatedOriginal
        calculatedFinal = 0
      } else {
        calculatedSavings = discountAmount
        calculatedDiscount = (calculatedSavings / calculatedOriginal) * 100
        calculatedFinal = calculatedOriginal - calculatedSavings
      }
    }

    return {
      original: calculatedOriginal,
      discountRate: calculatedDiscount,
      savings: calculatedSavings,
      final: calculatedFinal
    }
  }, [mode, originalPrice, discountRate, discountAmount, finalPrice])

  // ── Multi discount calculation ─────────────────────────────────────────────
  const multiResult = useMemo(() => {
    let current = originalPrice
    const steps: Array<{ rate: number; price: number; savings: number }> = []

    multiDiscounts.forEach(discount => {
      const savings = (current * discount.rate) / 100
      const newPrice = current - savings
      steps.push({ rate: discount.rate, price: newPrice, savings })
      current = newPrice
    })

    const totalSavings = originalPrice - current
    const effectiveRate = (totalSavings / originalPrice) * 100

    return {
      finalPrice: current,
      totalSavings,
      effectiveRate,
      steps
    }
  }, [originalPrice, multiDiscounts])

  // ── Formatters ─────────────────────────────────────────────────────────────
  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('ko-KR', { style: 'decimal', maximumFractionDigits: 0 }).format(Math.round(value))

  const formatPercent = (value: number) =>
    new Intl.NumberFormat('ko-KR', {
      style: 'decimal',
      minimumFractionDigits: 1,
      maximumFractionDigits: 2
    }).format(value)

  // ── Multi discount helpers ─────────────────────────────────────────────────
  const addMultiDiscount = () => {
    if (multiDiscounts.length < 3) {
      setMultiDiscounts([...multiDiscounts, { id: Date.now().toString(), rate: 10 }])
    }
  }

  const removeMultiDiscount = (id: string) => {
    if (multiDiscounts.length > 1) {
      setMultiDiscounts(multiDiscounts.filter(d => d.id !== id))
    }
  }

  const updateMultiDiscountRate = (id: string, rate: number) => {
    setMultiDiscounts(multiDiscounts.map(d =>
      d.id === id ? { ...d, rate: Math.min(100, Math.max(0, rate)) } : d
    ))
  }

  // ── Reset ──────────────────────────────────────────────────────────────────
  const reset = () => {
    setMode('discountRate')
    setOriginalPrice(100000)
    setDiscountRate(20)
    setDiscountAmount(20000)
    setFinalPrice(80000)
    setMultiDiscounts([
      { id: '1', rate: 20 },
      { id: '2', rate: 10 }
    ])
  }

  // ── Derived bar widths ─────────────────────────────────────────────────────
  const finalPct = result.original > 0
    ? Math.max(0, Math.min(100, (result.final / result.original) * 100))
    : 0
  const savingsPct = result.original > 0
    ? Math.max(0, Math.min(100, (result.savings / result.original) * 100))
    : 0

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('title')}</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('description')}</p>
      </div>

      {/* Main Grid */}
      <div className="grid lg:grid-cols-3 gap-8">
        {/* Left Panel - Settings */}
        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 space-y-6">
            {/* Mode Tabs */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                계산 모드
              </label>
              <div className="flex flex-col gap-2">
                <button
                  onClick={() => setMode('discountRate')}
                  className={`px-4 py-3 rounded-lg font-medium transition-colors text-left ${
                    mode === 'discountRate'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Percent className="w-4 h-4" />
                    <span>{t('mode.discountRate')}</span>
                  </div>
                </button>
                <button
                  onClick={() => setMode('finalPrice')}
                  className={`px-4 py-3 rounded-lg font-medium transition-colors text-left ${
                    mode === 'finalPrice'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Tag className="w-4 h-4" />
                    <span>{t('mode.finalPrice')}</span>
                  </div>
                </button>
                <button
                  onClick={() => setMode('discountAmount')}
                  className={`px-4 py-3 rounded-lg font-medium transition-colors text-left ${
                    mode === 'discountAmount'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Tag className="w-4 h-4" />
                    <span>{t('mode.discountAmount')}</span>
                  </div>
                </button>
              </div>
            </div>

            {/* Original Price Input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('originalPrice')}
              </label>
              <input
                type="number"
                value={originalPrice}
                onChange={(e) => setOriginalPrice(Math.max(0, Number(e.target.value)))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                min="0"
              />
            </div>

            {/* Conditional Inputs Based on Mode */}
            {mode === 'discountRate' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t('discountRate')}
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      value={discountRate}
                      onChange={(e) => setDiscountRate(Math.min(100, Math.max(0, Number(e.target.value))))}
                      className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                      min="0"
                      max="100"
                      step="0.1"
                    />
                    <span className="flex items-center px-3 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg">
                      %
                    </span>
                  </div>
                </div>

                {/* Quick Rate Buttons */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t('quickRates')}
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {quickRates.map(rate => (
                      <button
                        key={rate}
                        onClick={() => setDiscountRate(rate)}
                        className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                          discountRate === rate
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                        }`}
                      >
                        {rate}%
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}

            {mode === 'finalPrice' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('finalPrice')}
                </label>
                <input
                  type="number"
                  value={finalPrice}
                  onChange={(e) => setFinalPrice(Math.max(0, Number(e.target.value)))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                  min="0"
                />
              </div>
            )}

            {mode === 'discountAmount' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('discountAmount')}
                </label>
                <input
                  type="number"
                  value={discountAmount}
                  onChange={(e) => setDiscountAmount(Math.max(0, Number(e.target.value)))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                  min="0"
                />
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-2">
              <button
                onClick={reset}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg transition-colors"
              >
                <RotateCcw className="w-4 h-4" />
                {t('reset')}
              </button>
              <button
                onClick={copyLink}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg transition-colors"
                title={t('copyLink')}
              >
                {copiedId === 'link' ? (
                  <>
                    <Check className="w-4 h-4" />
                    <span className="text-sm font-medium">{t('copied')}</span>
                  </>
                ) : (
                  <>
                    <Link className="w-4 h-4" />
                    <span className="text-sm font-medium">{t('copyLink')}</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Multi Discount Section */}
          <div className="mt-6 bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              {t('multiDiscount')}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              여러 할인을 순차적으로 적용하여 실질 할인율을 계산합니다
            </p>

            <div className="space-y-3 mb-4">
              {multiDiscounts.map((discount, index) => (
                <div key={discount.id} className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300 w-6">
                    {index + 1}.
                  </span>
                  <input
                    type="number"
                    value={discount.rate}
                    onChange={(e) => updateMultiDiscountRate(discount.id, Number(e.target.value))}
                    className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                    min="0"
                    max="100"
                    step="0.1"
                  />
                  <span className="text-gray-700 dark:text-gray-300">%</span>
                  {multiDiscounts.length > 1 && (
                    <button
                      onClick={() => removeMultiDiscount(discount.id)}
                      className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                      title="할인 제거"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>

            {multiDiscounts.length < 3 && (
              <button
                onClick={addMultiDiscount}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
              >
                <Plus className="w-4 h-4" />
                {t('addDiscount')}
              </button>
            )}

            {/* Multi Discount Result */}
            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">{t('originalPrice')}</span>
                <span className="font-medium text-gray-900 dark:text-white">₩{formatCurrency(originalPrice)}</span>
              </div>
              {multiResult.steps.map((step, index) => (
                <div key={index} className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">
                    {index + 1}단계 ({formatPercent(step.rate)}% 할인)
                  </span>
                  <span className="font-medium text-gray-900 dark:text-white">₩{formatCurrency(step.price)}</span>
                </div>
              ))}
              <div className="flex justify-between text-sm pt-2 border-t border-gray-200 dark:border-gray-700">
                <span className="text-gray-600 dark:text-gray-400">{t('effectiveRate')}</span>
                <span className="font-semibold text-green-600 dark:text-green-400">{formatPercent(multiResult.effectiveRate)}%</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">총 {t('savings')}</span>
                <span className="font-semibold text-orange-600 dark:text-orange-400">₩{formatCurrency(multiResult.totalSavings)}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium text-gray-900 dark:text-white">{t('finalPrice')}</span>
                <span className="text-lg font-bold text-purple-600 dark:text-purple-400">₩{formatCurrency(multiResult.finalPrice)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Panel - Results */}
        <div className="lg:col-span-2">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 space-y-6">
            {/* Result Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Original Price */}
              <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-6 text-white">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium opacity-90">{t('originalPrice')}</h3>
                  <button
                    onClick={() => copyToClipboard(formatCurrency(result.original), 'original')}
                    className="p-1 hover:bg-white/20 rounded transition-colors"
                    title={t('copy')}
                  >
                    {copiedId === 'original' ? (
                      <Check className="w-4 h-4" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </button>
                </div>
                <div className="text-3xl font-bold">₩{formatCurrency(result.original)}</div>
              </div>

              {/* Discount Rate */}
              <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-6 text-white">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium opacity-90">{t('discountRate')}</h3>
                  <button
                    onClick={() => copyToClipboard(formatPercent(result.discountRate), 'rate')}
                    className="p-1 hover:bg-white/20 rounded transition-colors"
                    title={t('copy')}
                  >
                    {copiedId === 'rate' ? (
                      <Check className="w-4 h-4" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </button>
                </div>
                <div className="text-3xl font-bold">{formatPercent(result.discountRate)}%</div>
              </div>

              {/* Savings */}
              <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl p-6 text-white">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium opacity-90">{t('savings')}</h3>
                  <button
                    onClick={() => copyToClipboard(formatCurrency(result.savings), 'savings')}
                    className="p-1 hover:bg-white/20 rounded transition-colors"
                    title={t('copy')}
                  >
                    {copiedId === 'savings' ? (
                      <Check className="w-4 h-4" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </button>
                </div>
                <div className="text-3xl font-bold">₩{formatCurrency(result.savings)}</div>
              </div>

              {/* Final Price */}
              <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-6 text-white">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium opacity-90">{t('finalPrice')}</h3>
                  <button
                    onClick={() => copyToClipboard(formatCurrency(result.final), 'final')}
                    className="p-1 hover:bg-white/20 rounded transition-colors"
                    title={t('copy')}
                  >
                    {copiedId === 'final' ? (
                      <Check className="w-4 h-4" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </button>
                </div>
                <div className="text-3xl font-bold">₩{formatCurrency(result.final)}</div>
              </div>
            </div>

            {/* ── Savings Summary Bar ────────────────────────────────────────── */}
            <div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-6">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-5">
                {t('savingsSummary')}
              </h3>

              {/* Stacked bar */}
              <div className="w-full h-10 rounded-lg overflow-hidden flex mb-4" role="img" aria-label="절약 요약 바 차트">
                {/* Final price segment (purple) */}
                {finalPct > 0 && (
                  <div
                    className="bg-gradient-to-r from-purple-500 to-purple-600 flex items-center justify-center transition-all duration-500"
                    style={{ width: `${finalPct}%` }}
                  >
                    {finalPct >= 12 && (
                      <span className="text-white text-xs font-semibold px-1 whitespace-nowrap overflow-hidden text-ellipsis max-w-full">
                        {formatPercent(finalPct)}%
                      </span>
                    )}
                  </div>
                )}
                {/* Savings segment (orange) */}
                {savingsPct > 0 && (
                  <div
                    className="bg-gradient-to-r from-orange-400 to-orange-500 flex items-center justify-center transition-all duration-500"
                    style={{ width: `${savingsPct}%` }}
                  >
                    {savingsPct >= 12 && (
                      <span className="text-white text-xs font-semibold px-1 whitespace-nowrap overflow-hidden text-ellipsis max-w-full">
                        {formatPercent(savingsPct)}%
                      </span>
                    )}
                  </div>
                )}
                {/* 100% case — no savings */}
                {savingsPct === 0 && finalPct === 0 && (
                  <div className="flex-1 bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                    <span className="text-gray-500 text-xs">0%</span>
                  </div>
                )}
              </div>

              {/* Legend + values */}
              <div className="grid grid-cols-3 gap-3 text-center">
                {/* Original */}
                <div className="space-y-1">
                  <div className="flex items-center justify-center gap-1.5">
                    <span className="inline-block w-3 h-3 rounded-sm bg-gradient-to-r from-blue-500 to-blue-600 flex-shrink-0" />
                    <span className="text-xs text-gray-500 dark:text-gray-400">{t('originalPrice')}</span>
                  </div>
                  <p className="text-sm font-bold text-gray-900 dark:text-white">₩{formatCurrency(result.original)}</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500">100%</p>
                </div>
                {/* Final */}
                <div className="space-y-1">
                  <div className="flex items-center justify-center gap-1.5">
                    <span className="inline-block w-3 h-3 rounded-sm bg-gradient-to-r from-purple-500 to-purple-600 flex-shrink-0" />
                    <span className="text-xs text-gray-500 dark:text-gray-400">{t('finalPrice')}</span>
                  </div>
                  <p className="text-sm font-bold text-purple-600 dark:text-purple-400">₩{formatCurrency(result.final)}</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500">{formatPercent(finalPct)}%</p>
                </div>
                {/* Savings */}
                <div className="space-y-1">
                  <div className="flex items-center justify-center gap-1.5">
                    <span className="inline-block w-3 h-3 rounded-sm bg-gradient-to-r from-orange-400 to-orange-500 flex-shrink-0" />
                    <span className="text-xs text-gray-500 dark:text-gray-400">{t('savings')}</span>
                  </div>
                  <p className="text-sm font-bold text-orange-600 dark:text-orange-400">₩{formatCurrency(result.savings)}</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500">{formatPercent(savingsPct)}%</p>
                </div>
              </div>

              {/* Summary sentence */}
              {result.savings > 0 && (
                <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 text-center">
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    {t('summaryText', {
                      original: `₩${formatCurrency(result.original)}`,
                      rate: formatPercent(result.discountRate),
                      savings: `₩${formatCurrency(result.savings)}`,
                      final: `₩${formatCurrency(result.final)}`
                    })}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Guide Section */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
          <BookOpen className="w-5 h-5" />
          {t('guide.title')}
        </h2>

        <div className="space-y-6">
          {/* Basic Usage */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
              {t('guide.basic.title')}
            </h3>
            <ul className="space-y-2">
              {(t.raw('guide.basic.items') as string[]).map((item, index) => (
                <li key={index} className="flex items-start gap-2 text-gray-700 dark:text-gray-300">
                  <span className="text-blue-600 dark:text-blue-400 mt-1">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Tips */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
              {t('guide.tips.title')}
            </h3>
            <ul className="space-y-2">
              {(t.raw('guide.tips.items') as string[]).map((item, index) => (
                <li key={index} className="flex items-start gap-2 text-gray-700 dark:text-gray-300">
                  <span className="text-purple-600 dark:text-purple-400 mt-1">💡</span>
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
