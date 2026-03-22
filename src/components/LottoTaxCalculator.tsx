'use client'

import { useState, useCallback, useEffect, useMemo } from 'react'
import { useTranslations } from 'next-intl'
import { useRouter, useSearchParams } from 'next/navigation'
import { Copy, Check, Link, RotateCcw, BookOpen, ChevronDown, ChevronUp, TrendingUp, Trophy, Banknote } from 'lucide-react'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts'

const THRESHOLD = 300_000_000 // 3억원
const TAX_FREE_LIMIT = 50_000 // 5만원

interface TaxResult {
  totalPrize: number
  taxBelow300m: number
  taxAbove300m: number
  incomeTaxBelow: number
  localTaxBelow: number
  incomeTaxAbove: number
  localTaxAbove: number
  totalTax: number
  netPrize: number
  effectiveRate: number
  isTaxFree: boolean
}

function calculateLottoTax(prize: number): TaxResult {
  if (prize <= TAX_FREE_LIMIT) {
    return {
      totalPrize: prize,
      taxBelow300m: 0,
      taxAbove300m: 0,
      incomeTaxBelow: 0,
      localTaxBelow: 0,
      incomeTaxAbove: 0,
      localTaxAbove: 0,
      totalTax: 0,
      netPrize: prize,
      effectiveRate: 0,
      isTaxFree: true,
    }
  }

  let taxBelow = 0
  let taxAbove = 0
  let incomeTaxBelow = 0
  let localTaxBelow = 0
  let incomeTaxAbove = 0
  let localTaxAbove = 0

  if (prize <= THRESHOLD) {
    incomeTaxBelow = Math.floor(prize * 0.20)
    localTaxBelow = Math.floor(incomeTaxBelow * 0.10)
    taxBelow = incomeTaxBelow + localTaxBelow
  } else {
    incomeTaxBelow = Math.floor(THRESHOLD * 0.20)
    localTaxBelow = Math.floor(incomeTaxBelow * 0.10)
    taxBelow = incomeTaxBelow + localTaxBelow

    const excess = prize - THRESHOLD
    incomeTaxAbove = Math.floor(excess * 0.30)
    localTaxAbove = Math.floor(incomeTaxAbove * 0.10)
    taxAbove = incomeTaxAbove + localTaxAbove
  }

  const totalTax = taxBelow + taxAbove
  const netPrize = prize - totalTax
  const effectiveRate = prize > 0 ? (totalTax / prize) * 100 : 0

  return {
    totalPrize: prize,
    taxBelow300m: taxBelow,
    taxAbove300m: taxAbove,
    incomeTaxBelow,
    localTaxBelow,
    incomeTaxAbove,
    localTaxAbove,
    totalTax,
    netPrize,
    effectiveRate,
    isTaxFree: false,
  }
}

function formatKRW(value: number): string {
  if (value >= 100_000_000) {
    const eok = Math.floor(value / 100_000_000)
    const remainder = value % 100_000_000
    if (remainder >= 10_000) {
      const man = Math.floor(remainder / 10_000)
      return `${eok}억 ${man.toLocaleString()}만`
    }
    return `${eok}억`
  }
  if (value >= 10_000) {
    const man = Math.floor(value / 10_000)
    return `${man.toLocaleString()}만`
  }
  return value.toLocaleString()
}

const QUICK_AMOUNTS = [
  { label: '100만', value: 1_000_000 },
  { label: '1,000만', value: 10_000_000 },
  { label: '5,000만', value: 50_000_000 },
  { label: '1억', value: 100_000_000 },
  { label: '3억', value: 300_000_000 },
  { label: '5억', value: 500_000_000 },
  { label: '10억', value: 1_000_000_000 },
  { label: '20억', value: 2_000_000_000 },
]

const RANK_PRESETS = [
  { rank: 'rank1', avgPrize: 2_000_000_000 },
  { rank: 'rank2', avgPrize: 60_000_000 },
  { rank: 'rank3', avgPrize: 1_500_000 },
  { rank: 'rank4', avgPrize: 50_000 },
  { rank: 'rank5', avgPrize: 5_000 },
]

const COMPARISON_AMOUNTS = [
  50_000, 1_000_000, 10_000_000, 50_000_000,
  100_000_000, 300_000_000, 500_000_000, 1_000_000_000, 2_000_000_000,
]

const PIE_COLORS = ['#22c55e', '#ef4444']

export default function LottoTaxCalculator() {
  const t = useTranslations('lottoTax')
  const router = useRouter()
  const searchParams = useSearchParams()

  const [prizeInput, setPrizeInput] = useState('')
  const [result, setResult] = useState<TaxResult | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [linkCopied, setLinkCopied] = useState(false)
  const [showGuide, setShowGuide] = useState(false)
  const [showComparison, setShowComparison] = useState(false)

  const updateURL = useCallback((amount: string) => {
    const params = new URLSearchParams(searchParams)
    if (amount) {
      params.set('amount', amount)
    } else {
      params.delete('amount')
    }
    router.replace(`?${params.toString()}`, { scroll: false })
  }, [router, searchParams])

  // Restore from URL
  useEffect(() => {
    const amount = searchParams.get('amount')
    if (!amount) return
    if (/^\d+$/.test(amount)) {
      setPrizeInput(amount)
      setResult(calculateLottoTax(Number(amount)))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleCalculate = useCallback(() => {
    const prize = Number(prizeInput.replace(/,/g, ''))
    if (!prize || prize < 0) return
    const res = calculateLottoTax(prize)
    setResult(res)
    updateURL(String(prize))
  }, [prizeInput, updateURL])

  const handleQuickAmount = useCallback((value: number) => {
    setPrizeInput(String(value))
    const res = calculateLottoTax(value)
    setResult(res)
    updateURL(String(value))
  }, [updateURL])

  const handleReset = useCallback(() => {
    setPrizeInput('')
    setResult(null)
    updateURL('')
  }, [updateURL])

  const copyLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(window.location.href)
      setLinkCopied(true)
      setTimeout(() => setLinkCopied(false), 2000)
    } catch { /* ignore */ }
  }, [])

  const copyToClipboard = useCallback(async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedId(id)
      setTimeout(() => setCopiedId(null), 2000)
    } catch { /* ignore */ }
  }, [])

  const pieData = useMemo(() => {
    if (!result || result.isTaxFree) return []
    return [
      { name: t('chartNetPrize'), value: result.netPrize },
      { name: t('chartTax'), value: result.totalTax },
    ]
  }, [result, t])

  const comparisonData = useMemo(() => {
    return COMPARISON_AMOUNTS.map(amount => {
      const res = calculateLottoTax(amount)
      return {
        label: formatKRW(amount),
        amount,
        tax: res.totalTax,
        net: res.netPrize,
        rate: res.effectiveRate,
      }
    })
  }, [])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleCalculate()
  }, [handleCalculate])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
            {t('title')}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('description')}</p>
        </div>
        <button
          onClick={copyLink}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg transition-colors shrink-0"
        >
          {linkCopied ? <Check className="w-4 h-4 text-green-500" /> : <Link className="w-4 h-4" />}
          {linkCopied ? t('linkCopied') : t('copyLink')}
        </button>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left: Input Panel */}
        <div className="lg:col-span-1 space-y-4">
          {/* Prize Input */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('prizeAmount')}
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={prizeInput ? Number(prizeInput.replace(/,/g, '')).toLocaleString() : ''}
                  onChange={(e) => {
                    const raw = e.target.value.replace(/,/g, '').replace(/[^\d]/g, '')
                    setPrizeInput(raw)
                  }}
                  onKeyDown={handleKeyDown}
                  placeholder={t('prizeAmountPlaceholder')}
                  className="w-full px-4 py-3 pr-12 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-lg font-bold focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 text-sm">
                  {t('won')}
                </span>
              </div>
              {prizeInput && Number(prizeInput) > 0 && (
                <p className="text-xs text-blue-600 dark:text-blue-400 mt-1 font-medium">
                  = {formatKRW(Number(prizeInput))}{t('won')}
                </p>
              )}
            </div>

            {/* Quick amounts */}
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
                {t('quickAmounts')}
              </label>
              <div className="grid grid-cols-4 gap-1.5">
                {QUICK_AMOUNTS.map(({ label, value }) => (
                  <button
                    key={value}
                    onClick={() => handleQuickAmount(value)}
                    className="px-2 py-1.5 text-xs font-medium bg-gray-100 dark:bg-gray-700 hover:bg-blue-100 dark:hover:bg-blue-900 text-gray-700 dark:text-gray-300 hover:text-blue-700 dark:hover:text-blue-300 rounded-lg transition-colors"
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex gap-2">
              <button
                onClick={handleCalculate}
                disabled={!prizeInput}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg font-bold hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                <Banknote className="w-5 h-5" />
                {t('calculate')}
              </button>
              <button
                onClick={handleReset}
                className="px-4 py-3 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg transition-colors"
              >
                <RotateCcw className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Rank presets */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-1.5">
              <Trophy className="w-4 h-4 text-yellow-500" />
              {t('rankPresets')}
            </h3>
            <div className="space-y-2">
              {RANK_PRESETS.map(({ rank, avgPrize }) => (
                <button
                  key={rank}
                  onClick={() => handleQuickAmount(avgPrize)}
                  className="w-full flex items-center justify-between px-3 py-2 bg-gray-50 dark:bg-gray-700 hover:bg-yellow-50 dark:hover:bg-yellow-900/20 rounded-lg transition-colors group"
                >
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300 group-hover:text-yellow-700 dark:group-hover:text-yellow-300">
                    {t(rank)}
                  </span>
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    ~{formatKRW(avgPrize)}{t('won')}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Result Panel */}
        <div className="lg:col-span-2 space-y-4">
          {!result ? (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-16 text-center text-gray-400 dark:text-gray-500">
              <Banknote className="w-16 h-16 mx-auto mb-4 opacity-30" />
              <p>{t('prizeAmountPlaceholder')}</p>
            </div>
          ) : (
            <>
              {/* Main result card */}
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden">
                <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-3">
                  <h2 className="text-white font-semibold">{t('result')}</h2>
                </div>
                <div className="p-6 space-y-6">
                  {/* Net prize highlight */}
                  <div className="text-center">
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">{t('netPrize')}</p>
                    <div className="flex items-center justify-center gap-2">
                      <p className="text-4xl sm:text-5xl font-black text-green-600 dark:text-green-400">
                        {formatKRW(result.netPrize)}
                      </p>
                      <button
                        onClick={() => copyToClipboard(result.netPrize.toLocaleString(), 'net')}
                        className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                      >
                        {copiedId === 'net' ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                      </button>
                    </div>
                    <p className="text-lg text-gray-600 dark:text-gray-400 mt-1">
                      {result.netPrize.toLocaleString()}{t('won')}
                    </p>
                  </div>

                  {result.isTaxFree ? (
                    <div className="bg-green-50 dark:bg-green-950 rounded-xl p-4 text-center">
                      <p className="text-green-700 dark:text-green-300 font-bold text-lg">{t('noTax')}</p>
                    </div>
                  ) : (
                    <>
                      {/* Tax breakdown */}
                      <div className="grid sm:grid-cols-2 gap-4">
                        <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-4 space-y-3">
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('totalPrize')}</p>
                            <p className="text-sm font-bold text-gray-900 dark:text-white">{formatKRW(result.totalPrize)}{t('won')}</p>
                          </div>
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-red-600 dark:text-red-400">{t('totalTax')}</p>
                            <p className="text-sm font-bold text-red-600 dark:text-red-400">-{formatKRW(result.totalTax)}{t('won')}</p>
                          </div>
                          <div className="border-t border-gray-200 dark:border-gray-600 pt-2">
                            <div className="flex items-center justify-between">
                              <p className="text-sm font-medium text-green-600 dark:text-green-400">{t('netPrize')}</p>
                              <p className="text-sm font-bold text-green-600 dark:text-green-400">{formatKRW(result.netPrize)}{t('won')}</p>
                            </div>
                          </div>
                          <div className="flex items-center justify-between pt-1">
                            <p className="text-xs text-gray-500 dark:text-gray-400">{t('effectiveRate')}</p>
                            <p className="text-xs font-bold text-gray-600 dark:text-gray-300">{result.effectiveRate.toFixed(1)}%</p>
                          </div>
                        </div>

                        {/* Pie chart */}
                        <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-4">
                          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2 text-center">{t('chartTitle')}</p>
                          <ResponsiveContainer width="100%" height={160}>
                            <PieChart>
                              <Pie
                                data={pieData}
                                cx="50%"
                                cy="50%"
                                innerRadius={40}
                                outerRadius={65}
                                paddingAngle={2}
                                dataKey="value"
                              >
                                {pieData.map((_, i) => (
                                  <Cell key={i} fill={PIE_COLORS[i]} />
                                ))}
                              </Pie>
                              <Tooltip formatter={(value: number) => value.toLocaleString() + t('won')} />
                            </PieChart>
                          </ResponsiveContainer>
                          <div className="flex justify-center gap-4 mt-1">
                            <span className="flex items-center gap-1 text-xs text-gray-600 dark:text-gray-300">
                              <span className="w-3 h-3 rounded-full bg-green-500 inline-block" />
                              {t('chartNetPrize')} ({(100 - result.effectiveRate).toFixed(1)}%)
                            </span>
                            <span className="flex items-center gap-1 text-xs text-gray-600 dark:text-gray-300">
                              <span className="w-3 h-3 rounded-full bg-red-500 inline-block" />
                              {t('chartTax')} ({result.effectiveRate.toFixed(1)}%)
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Detailed breakdown */}
                      <div className="bg-blue-50 dark:bg-blue-950 rounded-xl p-4 space-y-3">
                        {result.taxBelow300m > 0 && (
                          <div>
                            <p className="text-xs font-semibold text-blue-700 dark:text-blue-300 mb-1">
                              {t('belowThreshold')} — {t('taxRate22')}
                            </p>
                            <div className="grid grid-cols-3 gap-2 text-xs">
                              <div className="bg-white dark:bg-gray-800 rounded-lg p-2 text-center">
                                <p className="text-gray-500 dark:text-gray-400">{t('incomeTax')} (20%)</p>
                                <p className="font-bold text-gray-900 dark:text-white">{result.incomeTaxBelow.toLocaleString()}</p>
                              </div>
                              <div className="bg-white dark:bg-gray-800 rounded-lg p-2 text-center">
                                <p className="text-gray-500 dark:text-gray-400">{t('localTax')} (2%)</p>
                                <p className="font-bold text-gray-900 dark:text-white">{result.localTaxBelow.toLocaleString()}</p>
                              </div>
                              <div className="bg-white dark:bg-gray-800 rounded-lg p-2 text-center">
                                <p className="text-gray-500 dark:text-gray-400">{t('taxBelow300m')}</p>
                                <p className="font-bold text-red-600 dark:text-red-400">{result.taxBelow300m.toLocaleString()}</p>
                              </div>
                            </div>
                          </div>
                        )}
                        {result.taxAbove300m > 0 && (
                          <div>
                            <p className="text-xs font-semibold text-blue-700 dark:text-blue-300 mb-1">
                              {t('aboveThreshold')} — {t('taxRate33')}
                            </p>
                            <div className="grid grid-cols-3 gap-2 text-xs">
                              <div className="bg-white dark:bg-gray-800 rounded-lg p-2 text-center">
                                <p className="text-gray-500 dark:text-gray-400">{t('incomeTax')} (30%)</p>
                                <p className="font-bold text-gray-900 dark:text-white">{result.incomeTaxAbove.toLocaleString()}</p>
                              </div>
                              <div className="bg-white dark:bg-gray-800 rounded-lg p-2 text-center">
                                <p className="text-gray-500 dark:text-gray-400">{t('localTax')} (3%)</p>
                                <p className="font-bold text-gray-900 dark:text-white">{result.localTaxAbove.toLocaleString()}</p>
                              </div>
                              <div className="bg-white dark:bg-gray-800 rounded-lg p-2 text-center">
                                <p className="text-gray-500 dark:text-gray-400">{t('taxAbove300m')}</p>
                                <p className="font-bold text-red-600 dark:text-red-400">{result.taxAbove300m.toLocaleString()}</p>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              </div>
            </>
          )}

          {/* Comparison table */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden">
            <button
              onClick={() => setShowComparison(!showComparison)}
              className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              <span className="flex items-center gap-2 font-semibold text-gray-900 dark:text-white">
                <TrendingUp className="w-5 h-5 text-blue-500" />
                {t('comparisonTitle')}
              </span>
              {showComparison ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
            </button>
            {showComparison && (
              <div className="px-4 pb-4 space-y-4">
                <p className="text-sm text-gray-500 dark:text-gray-400">{t('comparisonDesc')}</p>

                {/* Bar chart */}
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={comparisonData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" className="dark:opacity-20" />
                      <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} tickFormatter={(v: number) => formatKRW(v)} />
                      <Tooltip formatter={(value: number) => value.toLocaleString() + t('won')} />
                      <Bar dataKey="net" name={t('chartNetPrize')} fill="#22c55e" stackId="a" />
                      <Bar dataKey="tax" name={t('chartTax')} fill="#ef4444" stackId="a" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-gray-200 dark:border-gray-700">
                        <th className="text-left py-2 px-2 text-gray-500 dark:text-gray-400">{t('totalPrize')}</th>
                        <th className="text-right py-2 px-2 text-gray-500 dark:text-gray-400">{t('totalTax')}</th>
                        <th className="text-right py-2 px-2 text-gray-500 dark:text-gray-400">{t('netPrize')}</th>
                        <th className="text-right py-2 px-2 text-gray-500 dark:text-gray-400">{t('effectiveRate')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {comparisonData.map((row) => (
                        <tr
                          key={row.amount}
                          onClick={() => handleQuickAmount(row.amount)}
                          className="border-b border-gray-100 dark:border-gray-700 hover:bg-blue-50 dark:hover:bg-blue-900/20 cursor-pointer transition-colors"
                        >
                          <td className="py-2 px-2 font-medium text-gray-900 dark:text-white">{row.label}{t('won')}</td>
                          <td className="py-2 px-2 text-right text-red-600 dark:text-red-400">{formatKRW(row.tax)}</td>
                          <td className="py-2 px-2 text-right text-green-600 dark:text-green-400 font-bold">{formatKRW(row.net)}</td>
                          <td className="py-2 px-2 text-right text-gray-600 dark:text-gray-300">{row.rate.toFixed(1)}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Guide */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden">
        <button
          onClick={() => setShowGuide(!showGuide)}
          className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          aria-expanded={showGuide}
        >
          <span className="flex items-center gap-2 font-semibold text-gray-900 dark:text-white">
            <BookOpen className="w-5 h-5" />
            {t('guide.title')}
          </span>
          {showGuide ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
        </button>
        {showGuide && (
          <div className="px-4 pb-4 space-y-4">
            {(['taxStructure', 'claimProcess', 'tips'] as const).map(section => (
              <div key={section}>
                <h3 className="font-semibold text-gray-800 dark:text-gray-200 mb-2">
                  {t(`guide.${section}.title`)}
                </h3>
                <ul className="space-y-1">
                  {(t.raw(`guide.${section}.items`) as string[]).map((item, i) => (
                    <li key={i} className="text-sm text-gray-600 dark:text-gray-400 flex items-start gap-2">
                      <span className="text-blue-500 mt-0.5">•</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* FAQ */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{t('faqTitle')}</h2>
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <details key={i} className="group">
              <summary className="cursor-pointer font-medium text-gray-800 dark:text-gray-200 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                {t(`faq.q${i}.question`)}
              </summary>
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-400 pl-4 border-l-2 border-blue-300 dark:border-blue-700">
                {t(`faq.q${i}.answer`)}
              </p>
            </details>
          ))}
        </div>
      </div>
    </div>
  )
}
