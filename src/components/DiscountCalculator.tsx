'use client'

import { useState, useMemo, useCallback, useEffect } from 'react'
import { useTranslations } from '@/lib/i18n'
import '@/lib/i18n/ns/discountCalculator'
import { Tag, Copy, Check, RotateCcw, Plus, Percent, X, Link } from 'lucide-react'
import { glassCard, glassInset, glassInput } from '@/lib/glass'

type CalculationMode = 'discountRate' | 'finalPrice' | 'discountAmount'

interface MultiDiscount {
  id: string
  rate: number
}

export default function DiscountCalculator() {
  const t = useTranslations('discountCalculator')
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [copyError, setCopyError] = useState(false)
  const [ready, setReady] = useState(false)
  const [mode, setMode] = useState<CalculationMode>('discountRate')
  const [originalPrice, setOriginalPrice] = useState(100000)
  const [discountRate, setDiscountRate] = useState(20)
  const [discountAmount, setDiscountAmount] = useState(20000)
  const [finalPrice, setFinalPrice] = useState(80000)

  // Multi discount states
  const [multiDiscounts, setMultiDiscounts] = useState<MultiDiscount[]>([
    { id: '1', rate: 20 },
    { id: '2', rate: 10 }
  ])

  // ── Sync main params to URL whenever they change ───────────────────────────
  // Read a shared link after hydration so the first client render matches the static page.
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      const params = new URLSearchParams(window.location.search)
      const requestedMode = params.get('mode')
      if (requestedMode === 'finalPrice' || requestedMode === 'discountAmount') setMode(requestedMode)
      const number = (name: string, fallback: number, max = Number.MAX_SAFE_INTEGER) => {
        const raw = params.get(name)
        if (raw === null || raw.trim() === '') return fallback
        const value = Number(raw)
        return Number.isFinite(value) ? Math.min(max, Math.max(0, value)) : fallback
      }
      setOriginalPrice(number('original', 100000))
      setDiscountRate(number('rate', 20, 100))
      setDiscountAmount(number('amount', 20000))
      setFinalPrice(number('final', 80000))
      setReady(true)
    })
    return () => cancelAnimationFrame(frame)
  }, [])

  // Update the share URL without navigating or resetting the calculator.
  useEffect(() => {
    if (!ready) return
    const params = new URLSearchParams()
    params.set('mode', mode)
    params.set('original', String(originalPrice))
    params.set('rate', String(discountRate))
    params.set('amount', String(discountAmount))
    params.set('final', String(finalPrice))
    window.history.replaceState(null, '', window.location.pathname + '?' + params.toString())
  }, [ready, mode, originalPrice, discountRate, discountAmount, finalPrice])

  // ── Copy helpers ───────────────────────────────────────────────────────────
  const copyToClipboard = useCallback(async (text: string, id: string) => {
    const copyWithSelection = () => {
      const textarea = document.createElement('textarea')
      textarea.value = text
      textarea.style.position = 'fixed'
      textarea.style.left = '-999999px'
      document.body.appendChild(textarea)
      try {
        textarea.select()
        return document.execCommand('copy')
      } finally {
        textarea.remove()
      }
    }
    let succeeded = false
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text)
        succeeded = true
      } else {
        succeeded = copyWithSelection()
      }
    } catch {
      try { succeeded = copyWithSelection() } catch { /* Clipboard permission denied. */ }
    }
    setCopiedId(succeeded ? id : null)
    setCopyError(!succeeded)
    if (succeeded) setTimeout(() => setCopiedId(null), 2000)
  }, [])

  const copyLink = useCallback(() => {
    copyToClipboard(window.location.href, 'link')
  }, [copyToClipboard])

  // Quick rate buttons
  const quickRates = [10, 20, 30, 40, 50, 60, 70, 80, 90]
  const invalidFinalPrice = mode === 'finalPrice' && finalPrice > originalPrice

  // ── Main calculation logic ─────────────────────────────────────────────────
  const result = useMemo(() => {
    const calculatedOriginal = originalPrice
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
        calculatedDiscount = calculatedOriginal > 0 ? 100 : 0
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
    const effectiveRate = originalPrice > 0 ? (totalSavings / originalPrice) * 100 : 0

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
        <h1 className="text-2xl font-bold text-fg">{t('title')}</h1>
        <p className="text-sm text-muted mt-1">{t('description')}</p>
      </div>
      {copyError && <p role="alert" className="fixed bottom-4 right-4 z-50 max-w-sm rounded-xl bg-red-700 px-4 py-3 text-sm text-white shadow-lg">{t('copyFailed')}</p>}

      {/* Main Grid */}
      <div className="grid lg:grid-cols-3 gap-8">
        {/* Left Panel - Settings */}
        <div className="lg:col-span-1">
          <div className={`${glassCard} ${glassInset} p-6 space-y-6`}>
            {/* Mode Tabs */}
            <div>
              <label className="block text-sm font-medium text-body mb-2">
                계산 모드
              </label>
              <div className="flex flex-col gap-2">
                <button
                  onClick={() => setMode('discountRate')}
                  className={`px-4 py-3 rounded-lg font-medium transition-colors text-left ${
                    mode === 'discountRate'
                      ? 'bg-blue-600 text-white'
                      : 'bg-soft text-body hover:bg-gray-200 dark:hover:bg-gray-600'
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
                      : 'bg-soft text-body hover:bg-gray-200 dark:hover:bg-gray-600'
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
                      : 'bg-soft text-body hover:bg-gray-200 dark:hover:bg-gray-600'
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
              <label className="block text-sm font-medium text-body mb-2">
                {t('originalPrice')}
              </label>
              <input
                type="number"
                value={originalPrice}
                onChange={(e) => setOriginalPrice(Math.max(0, Number(e.target.value)))}
                className={`w-full px-3 py-2 ${glassInput} focus:ring-2 focus:ring-blue-500`}
                min="0"
              />
            </div>

            {/* Conditional Inputs Based on Mode */}
            {mode === 'discountRate' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-body mb-2">
                    {t('discountRate')}
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      value={discountRate}
                      onChange={(e) => setDiscountRate(Math.min(100, Math.max(0, Number(e.target.value))))}
                      className={`flex-1 px-3 py-2 ${glassInput} focus:ring-2 focus:ring-blue-500`}
                      min="0"
                      max="100"
                      step="0.1"
                    />
                    <span className="flex items-center px-3 py-2 bg-soft text-body rounded-lg">
                      %
                    </span>
                  </div>
                </div>

                {/* Quick Rate Buttons */}
                <div>
                  <label className="block text-sm font-medium text-body mb-2">
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
                            : 'bg-soft text-body hover:bg-gray-200 dark:hover:bg-gray-600'
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
                <label className="block text-sm font-medium text-body mb-2">
                  {t('finalPrice')}
                </label>
                <input
                  type="number"
                  value={finalPrice}
                  onChange={(e) => setFinalPrice(Math.max(0, Number(e.target.value)))}
                  aria-invalid={invalidFinalPrice}
                  aria-describedby={invalidFinalPrice ? 'discount-final-price-error' : undefined}
                  className={`w-full px-3 py-2 ${glassInput} focus:ring-2 focus:ring-blue-500`}
                  min="0"
                />
              </div>
            )}

            {mode === 'discountAmount' && (
              <div>
                <label className="block text-sm font-medium text-body mb-2">
                  {t('discountAmount')}
                </label>
                <input
                  type="number"
                  value={discountAmount}
                  onChange={(e) => setDiscountAmount(Math.max(0, Number(e.target.value)))}
                  className={`w-full px-3 py-2 ${glassInput} focus:ring-2 focus:ring-blue-500`}
                  min="0"
                />
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-2">
              <button
                onClick={reset}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-soft hover:bg-gray-200 dark:hover:bg-gray-600 text-body rounded-lg transition-colors"
              >
                <RotateCcw className="w-4 h-4" />
                {t('reset')}
              </button>
              <button
                onClick={copyLink}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-subtle hover:bg-blue-100 dark:hover:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg transition-colors"
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
          <div className={`mt-6 ${glassCard} ${glassInset} p-6`}>
            <h3 className="text-lg font-semibold text-fg mb-4">
              {t('multiDiscount')}
            </h3>
            <p className="text-sm text-muted mb-4">
              여러 할인을 순차적으로 적용하여 실질 할인율을 계산합니다
            </p>

            <div className="space-y-3 mb-4">
              {multiDiscounts.map((discount, index) => (
                <div key={discount.id} className="flex items-center gap-2">
                  <span className="text-sm font-medium text-body w-6">
                    {index + 1}.
                  </span>
                  <input
                    type="number"
                    value={discount.rate}
                    onChange={(e) => updateMultiDiscountRate(discount.id, Number(e.target.value))}
                    className={`flex-1 px-3 py-2 ${glassInput} focus:ring-2 focus:ring-blue-500`}
                    min="0"
                    max="100"
                    step="0.1"
                  />
                  <span className="text-body">%</span>
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
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-subtle text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
              >
                <Plus className="w-4 h-4" />
                {t('addDiscount')}
              </button>
            )}

            {/* Multi Discount Result */}
            <div className="mt-4 pt-4 border-t border-line space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-sub">{t('originalPrice')}</span>
                <span className="font-medium text-fg">₩{formatCurrency(originalPrice)}</span>
              </div>
              {multiResult.steps.map((step, index) => (
                <div key={index} className="flex justify-between text-sm">
                  <span className="text-sub">
                    {index + 1}단계 ({formatPercent(step.rate)}% 할인)
                  </span>
                  <span className="font-medium text-fg">₩{formatCurrency(step.price)}</span>
                </div>
              ))}
              <div className="flex justify-between text-sm pt-2 border-t border-line">
                <span className="text-sub">{t('effectiveRate')}</span>
                <span className="font-semibold text-green-600 dark:text-green-400">{formatPercent(multiResult.effectiveRate)}%</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-sub">총 {t('savings')}</span>
                <span className="font-semibold text-orange-600 dark:text-orange-400">₩{formatCurrency(multiResult.totalSavings)}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium text-fg">{t('finalPrice')}</span>
                <span className="text-lg font-bold text-purple-600 dark:text-purple-400">₩{formatCurrency(multiResult.finalPrice)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Panel - Results */}
        <div className="lg:col-span-2">
          <div className={`${glassCard} ${glassInset} p-6 space-y-6`}>
            {invalidFinalPrice && <p id="discount-final-price-error" role="alert" className="rounded-xl bg-amber-50 p-4 text-sm text-amber-800">{t('finalPriceAboveOriginal')}</p>}
            {/* Result Cards Grid */}
            <div className={`grid grid-cols-1 sm:grid-cols-2 gap-4 ${invalidFinalPrice ? 'hidden' : ''}`}>
              {/* Original Price */}
              <div className="bg-primary rounded-xl p-6 text-white">
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
              <div className="bg-primary rounded-xl p-6 text-white">
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
              <div className="bg-primary rounded-xl p-6 text-white">
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
              <div className="bg-primary rounded-xl p-6 text-white">
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
            <div className={`bg-subtle rounded-xl p-6 ${invalidFinalPrice ? 'hidden' : ''}`}>
              <h3 className="text-sm font-semibold text-body mb-5">
                {t('savingsSummary')}
              </h3>

              {/* Stacked bar */}
              <div className="w-full h-10 rounded-lg overflow-hidden flex mb-4" role="img" aria-label="절약 요약 바 차트">
                {/* Final price segment (purple) */}
                {finalPct > 0 && (
                  <div
                    className="bg-primary flex items-center justify-center transition-all duration-500"
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
                    className="bg-primary flex items-center justify-center transition-all duration-500"
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
                  <div className="flex-1 bg-track flex items-center justify-center">
                    <span className="text-gray-500 text-xs">0%</span>
                  </div>
                )}
              </div>

              {/* Legend + values */}
              <div className="grid grid-cols-3 gap-3 text-center">
                {/* Original */}
                <div className="space-y-1">
                  <div className="flex items-center justify-center gap-1.5">
                    <span className="inline-block w-3 h-3 rounded-sm bg-primary flex-shrink-0" />
                    <span className="text-xs text-muted">{t('originalPrice')}</span>
                  </div>
                  <p className="text-sm font-bold text-fg">₩{formatCurrency(result.original)}</p>
                  <p className="text-xs text-faint">100%</p>
                </div>
                {/* Final */}
                <div className="space-y-1">
                  <div className="flex items-center justify-center gap-1.5">
                    <span className="inline-block w-3 h-3 rounded-sm bg-primary flex-shrink-0" />
                    <span className="text-xs text-muted">{t('finalPrice')}</span>
                  </div>
                  <p className="text-sm font-bold text-purple-600 dark:text-purple-400">₩{formatCurrency(result.final)}</p>
                  <p className="text-xs text-faint">{formatPercent(finalPct)}%</p>
                </div>
                {/* Savings */}
                <div className="space-y-1">
                  <div className="flex items-center justify-center gap-1.5">
                    <span className="inline-block w-3 h-3 rounded-sm bg-primary flex-shrink-0" />
                    <span className="text-xs text-muted">{t('savings')}</span>
                  </div>
                  <p className="text-sm font-bold text-orange-600 dark:text-orange-400">₩{formatCurrency(result.savings)}</p>
                  <p className="text-xs text-faint">{formatPercent(savingsPct)}%</p>
                </div>
              </div>

              {/* Summary sentence */}
              {result.savings > 0 && (
                <div className="mt-4 pt-4 border-t border-line text-center">
                  <span className="text-sm text-sub">
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
      <div className={`${glassCard} ${glassInset} p-6`}>
        <h2 className="text-xl font-semibold text-fg mb-6 flex items-center gap-2">
          {t('guide.title')}
        </h2>

        <div className="space-y-6">
          {/* Basic Usage */}
          <div>
            <h3 className="text-lg font-semibold text-fg mb-3">
              {t('guide.basic.title')}
            </h3>
            <ul className="space-y-2">
              {(t.raw('guide.basic.items') as string[]).map((item, index) => (
                <li key={index} className="flex items-start gap-2 text-body">
                  <span className="text-blue-600 dark:text-blue-400 mt-1">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Tips */}
          <div>
            <h3 className="text-lg font-semibold text-fg mb-3">
              {t('guide.tips.title')}
            </h3>
            <ul className="space-y-2">
              {(t.raw('guide.tips.items') as string[]).map((item, index) => (
                <li key={index} className="flex items-start gap-2 text-body">
                  
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
