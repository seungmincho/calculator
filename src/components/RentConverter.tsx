'use client'

import { useState, useMemo, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { Home, Copy, Check, RotateCcw, BookOpen, ArrowLeftRight } from 'lucide-react'

type ConversionMode = 'jeonseToWolse' | 'wolseToJeonse'

export default function RentConverter() {
  const t = useTranslations('rentConverter')
  const [mode, setMode] = useState<ConversionMode>('jeonseToWolse')
  const [copiedId, setCopiedId] = useState<string | null>(null)

  // Jeonse to Wolse inputs
  const [jeonseDeposit, setJeonseDeposit] = useState(300000000) // 3억
  const [wolseDeposit, setWolseDeposit] = useState(100000000) // 1억
  const [conversionRate, setConversionRate] = useState(4.5)

  // Wolse to Jeonse inputs
  const [reverseWolseDeposit, setReverseWolseDeposit] = useState(100000000) // 1억
  const [monthlyRent, setMonthlyRent] = useState(750000) // 75만
  const [reverseConversionRate, setReverseConversionRate] = useState(4.5)

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

  const jeonseToWolseResult = useMemo(() => {
    const difference = jeonseDeposit - wolseDeposit
    if (difference <= 0 || conversionRate <= 0) {
      return {
        monthlyRent: 0,
        yearlyTotal: 0,
        jeonseOpportunityCost: 0,
      }
    }

    const monthly = (difference * conversionRate) / 100 / 12
    const yearly = monthly * 12
    const jeonseOpportunity = jeonseDeposit * conversionRate / 100

    return {
      monthlyRent: Math.round(monthly),
      yearlyTotal: Math.round(yearly),
      jeonseOpportunityCost: Math.round(jeonseOpportunity),
    }
  }, [jeonseDeposit, wolseDeposit, conversionRate])

  const wolseToJeonseResult = useMemo(() => {
    if (monthlyRent <= 0 || reverseConversionRate <= 0) {
      return {
        jeonseDeposit: reverseWolseDeposit,
        yearlyTotal: 0,
        jeonseOpportunityCost: 0,
      }
    }

    const yearlyRent = monthlyRent * 12
    const convertedAmount = (yearlyRent / reverseConversionRate) * 100
    const totalJeonse = reverseWolseDeposit + convertedAmount
    const jeonseOpportunity = totalJeonse * reverseConversionRate / 100

    return {
      jeonseDeposit: Math.round(totalJeonse),
      yearlyTotal: yearlyRent,
      jeonseOpportunityCost: Math.round(jeonseOpportunity),
    }
  }, [reverseWolseDeposit, monthlyRent, reverseConversionRate])

  const formatWon = (value: number) => {
    return new Intl.NumberFormat('ko-KR').format(value)
  }

  const formatWonUnit = (value: number) => {
    if (value >= 100000000) {
      const eok = Math.floor(value / 100000000)
      const man = Math.floor((value % 100000000) / 10000)
      if (man === 0) return `${eok}억`
      return `${eok}억 ${man}만`
    } else if (value >= 10000) {
      return `${Math.floor(value / 10000)}만`
    }
    return formatWon(value)
  }

  const quickRates = [3, 3.5, 4, 4.5, 5, 5.5, 6]
  const quickDeposits = [50000000, 100000000, 150000000, 200000000, 250000000, 300000000, 400000000, 500000000]

  const resetForm = () => {
    if (mode === 'jeonseToWolse') {
      setJeonseDeposit(300000000)
      setWolseDeposit(100000000)
      setConversionRate(4.5)
    } else {
      setReverseWolseDeposit(100000000)
      setMonthlyRent(750000)
      setReverseConversionRate(4.5)
    }
  }

  const currentResult = mode === 'jeonseToWolse' ? jeonseToWolseResult : wolseToJeonseResult
  const currentRate = mode === 'jeonseToWolse' ? conversionRate : reverseConversionRate

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('title')}</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('description')}</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Left Panel - Settings */}
        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Home className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  설정
                </h2>
              </div>
              <button
                onClick={resetForm}
                className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                title={t('reset')}
              >
                <RotateCcw className="w-5 h-5" />
              </button>
            </div>

            {/* Mode Tabs */}
            <div className="flex gap-2">
              <button
                onClick={() => setMode('jeonseToWolse')}
                className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
                  mode === 'jeonseToWolse'
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                {t('mode.jeonseToWolse')}
              </button>
              <button
                onClick={() => setMode('wolseToJeonse')}
                className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
                  mode === 'wolseToJeonse'
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                {t('mode.wolseToJeonse')}
              </button>
            </div>

            {mode === 'jeonseToWolse' ? (
              <>
                {/* Jeonse Deposit */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t('jeonseDeposit')}
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400">
                      ₩
                    </span>
                    <input
                      type="number"
                      value={jeonseDeposit}
                      onChange={(e) => setJeonseDeposit(Number(e.target.value))}
                      className="w-full pl-8 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                      min="0"
                      step="10000000"
                    />
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {formatWonUnit(jeonseDeposit)}원
                  </p>
                </div>

                {/* Wolse Deposit */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t('wolseDeposit')}
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400">
                      ₩
                    </span>
                    <input
                      type="number"
                      value={wolseDeposit}
                      onChange={(e) => setWolseDeposit(Number(e.target.value))}
                      className="w-full pl-8 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                      min="0"
                      step="10000000"
                    />
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {formatWonUnit(wolseDeposit)}원
                  </p>
                </div>

                {/* Conversion Rate */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t('conversionRate')}
                  </label>
                  <input
                    type="number"
                    value={conversionRate}
                    onChange={(e) => setConversionRate(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                    min="0"
                    max="20"
                    step="0.1"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    연율: {conversionRate}%
                  </p>
                </div>
              </>
            ) : (
              <>
                {/* Reverse Wolse Deposit */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t('wolseDeposit')}
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400">
                      ₩
                    </span>
                    <input
                      type="number"
                      value={reverseWolseDeposit}
                      onChange={(e) => setReverseWolseDeposit(Number(e.target.value))}
                      className="w-full pl-8 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                      min="0"
                      step="10000000"
                    />
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {formatWonUnit(reverseWolseDeposit)}원
                  </p>
                </div>

                {/* Monthly Rent */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t('monthlyRent')}
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400">
                      ₩
                    </span>
                    <input
                      type="number"
                      value={monthlyRent}
                      onChange={(e) => setMonthlyRent(Number(e.target.value))}
                      className="w-full pl-8 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                      min="0"
                      step="10000"
                    />
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {formatWonUnit(monthlyRent)}원
                  </p>
                </div>

                {/* Reverse Conversion Rate */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t('conversionRate')}
                  </label>
                  <input
                    type="number"
                    value={reverseConversionRate}
                    onChange={(e) => setReverseConversionRate(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                    min="0"
                    max="20"
                    step="0.1"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    연율: {reverseConversionRate}%
                  </p>
                </div>
              </>
            )}

            {/* Quick Rates */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('quickRates')}
              </label>
              <div className="grid grid-cols-4 gap-2">
                {quickRates.map((rate) => (
                  <button
                    key={rate}
                    onClick={() => {
                      if (mode === 'jeonseToWolse') {
                        setConversionRate(rate)
                      } else {
                        setReverseConversionRate(rate)
                      }
                    }}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      currentRate === rate
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                  >
                    {rate}%
                  </button>
                ))}
              </div>
            </div>

            {/* Quick Deposits */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('quickDeposits')}
              </label>
              <div className="grid grid-cols-2 gap-2">
                {quickDeposits.map((deposit) => (
                  <button
                    key={deposit}
                    onClick={() => {
                      if (mode === 'jeonseToWolse') {
                        setJeonseDeposit(deposit)
                      } else {
                        setReverseWolseDeposit(deposit)
                      }
                    }}
                    className="px-3 py-2 rounded-lg text-sm font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                  >
                    {formatWonUnit(deposit)}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Right Panel - Results */}
        <div className="lg:col-span-2 space-y-6">
          {/* Result Cards */}
          <div className="grid md:grid-cols-3 gap-4">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900 rounded-xl shadow-lg p-6">
              <div className="flex items-start justify-between mb-2">
                <h3 className="text-sm font-medium text-blue-900 dark:text-blue-100">
                  {mode === 'jeonseToWolse'
                    ? '예상 월세'
                    : '예상 전세금'}
                </h3>
                <button
                  onClick={() =>
                    copyToClipboard(
                      String(
                        mode === 'jeonseToWolse'
                          ? jeonseToWolseResult.monthlyRent
                          : wolseToJeonseResult.jeonseDeposit
                      ),
                      'main'
                    )
                  }
                  className="p-1 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
                >
                  {copiedId === 'main' ? (
                    <Check className="w-4 h-4" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </button>
              </div>
              <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">
                {mode === 'jeonseToWolse'
                  ? `${formatWon(jeonseToWolseResult.monthlyRent)}원`
                  : `${formatWonUnit(wolseToJeonseResult.jeonseDeposit)}원`}
              </p>
              <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                {mode === 'jeonseToWolse'
                  ? formatWonUnit(jeonseToWolseResult.monthlyRent)
                  : formatWon(wolseToJeonseResult.jeonseDeposit)}
                원
              </p>
            </div>

            <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950 dark:to-green-900 rounded-xl shadow-lg p-6">
              <div className="flex items-start justify-between mb-2">
                <h3 className="text-sm font-medium text-green-900 dark:text-green-100">
                  연간 월세 합계
                </h3>
                <button
                  onClick={() =>
                    copyToClipboard(String(currentResult.yearlyTotal), 'yearly')
                  }
                  className="p-1 text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300"
                >
                  {copiedId === 'yearly' ? (
                    <Check className="w-4 h-4" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </button>
              </div>
              <p className="text-2xl font-bold text-green-900 dark:text-green-100">
                {formatWon(currentResult.yearlyTotal)}원
              </p>
              <p className="text-xs text-green-700 dark:text-green-300 mt-1">
                {formatWonUnit(currentResult.yearlyTotal)}원
              </p>
            </div>

            <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950 dark:to-purple-900 rounded-xl shadow-lg p-6">
              <div className="flex items-start justify-between mb-2">
                <h3 className="text-sm font-medium text-purple-900 dark:text-purple-100">
                  전환율
                </h3>
                <button
                  onClick={() => copyToClipboard(String(currentRate), 'rate')}
                  className="p-1 text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300"
                >
                  {copiedId === 'rate' ? (
                    <Check className="w-4 h-4" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </button>
              </div>
              <p className="text-2xl font-bold text-purple-900 dark:text-purple-100">
                {currentRate}%
              </p>
              <p className="text-xs text-purple-700 dark:text-purple-300 mt-1">
                연율 기준
              </p>
            </div>
          </div>

          {/* Formula Display */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
            <div className="flex items-center gap-2 mb-4">
              <ArrowLeftRight className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                계산 공식
              </h3>
            </div>
            <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
              <p className="text-sm font-mono text-gray-700 dark:text-gray-300">
                {mode === 'jeonseToWolse'
                  ? '월세 = (전세금 - 월세보증금) × 전환율 ÷ 12'
                  : '전세금 = 월세보증금 + (월세 × 12 ÷ 전환율)'}
              </p>
              <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  {mode === 'jeonseToWolse' ? (
                    <>
                      ({formatWonUnit(jeonseDeposit)} - {formatWonUnit(wolseDeposit)}) × {conversionRate}% ÷ 12 = {formatWonUnit(jeonseToWolseResult.monthlyRent)}원
                    </>
                  ) : (
                    <>
                      {formatWonUnit(reverseWolseDeposit)} + ({formatWonUnit(monthlyRent)} × 12 ÷ {reverseConversionRate}%) = {formatWonUnit(wolseToJeonseResult.jeonseDeposit)}원
                    </>
                  )}
                </p>
              </div>
            </div>
          </div>

          {/* Comparison Section */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              전세 vs 월세 비교
            </h3>
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    전세 기회비용 (연간)
                  </span>
                  <span className="text-sm font-bold text-blue-600 dark:text-blue-400">
                    {formatWon(currentResult.jeonseOpportunityCost)}원
                  </span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-4">
                  <div
                    className="bg-gradient-to-r from-blue-500 to-blue-600 h-4 rounded-full transition-all duration-300"
                    style={{
                      width: `${
                        Math.min(
                          (currentResult.jeonseOpportunityCost /
                            Math.max(
                              currentResult.jeonseOpportunityCost,
                              currentResult.yearlyTotal
                            )) *
                            100,
                          100
                        )
                      }%`,
                    }}
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    연간 월세 총액
                  </span>
                  <span className="text-sm font-bold text-green-600 dark:text-green-400">
                    {formatWon(currentResult.yearlyTotal)}원
                  </span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-4">
                  <div
                    className="bg-gradient-to-r from-green-500 to-green-600 h-4 rounded-full transition-all duration-300"
                    style={{
                      width: `${
                        Math.min(
                          (currentResult.yearlyTotal /
                            Math.max(
                              currentResult.jeonseOpportunityCost,
                              currentResult.yearlyTotal
                            )) *
                            100,
                          100
                        )
                      }%`,
                    }}
                  />
                </div>
              </div>

              <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-950 rounded-lg">
                <p className="text-sm text-blue-900 dark:text-blue-100">
                  {currentResult.jeonseOpportunityCost > currentResult.yearlyTotal
                    ? '전세 기회비용이 더 큽니다. 월세가 유리할 수 있습니다.'
                    : '월세 총액이 더 큽니다. 전세가 유리할 수 있습니다.'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Guide Section */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
        <div className="flex items-center gap-2 mb-6">
          <BookOpen className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            {t('guide.title')}
          </h2>
        </div>

        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
              {t('guide.what.title')}
            </h3>
            <ul className="space-y-2">
              {(t.raw('guide.what.items') as string[]).map((item, index) => (
                <li key={index} className="flex items-start gap-2">
                  <span className="text-blue-600 dark:text-blue-400 mt-1">•</span>
                  <span className="text-gray-700 dark:text-gray-300">{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
              {t('guide.example.title')}
            </h3>
            <ul className="space-y-2">
              {(t.raw('guide.example.items') as string[]).map((item, index) => (
                <li key={index} className="flex items-start gap-2">
                  <span className="text-green-600 dark:text-green-400 mt-1">•</span>
                  <span className="text-gray-700 dark:text-gray-300">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
