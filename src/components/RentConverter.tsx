'use client'

import { useState, useMemo, useCallback, useEffect } from 'react'
import { useTranslations } from '@/lib/i18n'
import { useSearchParams } from '@/hooks/useSearchParams'
import { Home, Copy, Check, RotateCcw, BookOpen, ArrowLeftRight, Link } from 'lucide-react'
import { glassCard, glassInset, glassInput } from '@/lib/glass'

type ConversionMode = 'jeonseToWolse' | 'wolseToJeonse'

export default function RentConverter() {
  const t = useTranslations('rentConverter')
  const searchParams = useSearchParams()
  const [mode, setMode] = useState<ConversionMode>(
    (searchParams.get('mode') as ConversionMode) || 'jeonseToWolse'
  )
  const [copiedId, setCopiedId] = useState<string | null>(null)

  // Jeonse to Wolse inputs
  const [jeonseDeposit, setJeonseDeposit] = useState(
    Number(searchParams.get('jd')) || 300000000
  )
  const [wolseDeposit, setWolseDeposit] = useState(
    Number(searchParams.get('wd')) || 100000000
  )
  const [conversionRate, setConversionRate] = useState(
    Number(searchParams.get('cr')) || 4.5
  )

  // Wolse to Jeonse inputs
  const [reverseWolseDeposit, setReverseWolseDeposit] = useState(
    Number(searchParams.get('rwd')) || 100000000
  )
  const [monthlyRent, setMonthlyRent] = useState(
    Number(searchParams.get('mr')) || 750000
  )
  const [reverseConversionRate, setReverseConversionRate] = useState(
    Number(searchParams.get('rcr')) || 4.5
  )

  // Sync URL params when inputs change
  useEffect(() => {
    const url = new URL(window.location.href)
    url.searchParams.set('mode', mode)
    url.searchParams.set('jd', String(jeonseDeposit))
    url.searchParams.set('wd', String(wolseDeposit))
    url.searchParams.set('cr', String(conversionRate))
    url.searchParams.set('rwd', String(reverseWolseDeposit))
    url.searchParams.set('mr', String(monthlyRent))
    url.searchParams.set('rcr', String(reverseConversionRate))
    window.history.replaceState({}, '', url)
  }, [mode, jeonseDeposit, wolseDeposit, conversionRate, reverseWolseDeposit, monthlyRent, reverseConversionRate])

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
        <h1 className="text-2xl font-bold text-fg">{t('title')}</h1>
        <p className="text-sm text-muted mt-1">{t('description')}</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Left Panel - Settings */}
        <div className="lg:col-span-1">
          <div className={`${glassCard} ${glassInset} p-6 space-y-6`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Home className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                <h2 className="text-lg font-semibold text-fg">
                  설정
                </h2>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => copyToClipboard(window.location.href, 'link')}
                  className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                  title={t('copyLink')}
                >
                  {copiedId === 'link' ? (
                    <Check className="w-5 h-5 text-green-500" />
                  ) : (
                    <Link className="w-5 h-5" />
                  )}
                </button>
                <button
                  onClick={resetForm}
                  className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                  title={t('reset')}
                >
                  <RotateCcw className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Mode Tabs */}
            <div className="flex gap-2">
              <button
                onClick={() => setMode('jeonseToWolse')}
                className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
                  mode === 'jeonseToWolse'
                    ? 'bg-primary hover:bg-blue-700 text-white'
                    : 'bg-soft text-body hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                {t('mode.jeonseToWolse')}
              </button>
              <button
                onClick={() => setMode('wolseToJeonse')}
                className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
                  mode === 'wolseToJeonse'
                    ? 'bg-primary hover:bg-blue-700 text-white'
                    : 'bg-soft text-body hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                {t('mode.wolseToJeonse')}
              </button>
            </div>

            {mode === 'jeonseToWolse' ? (
              <>
                {/* Jeonse Deposit */}
                <div>
                  <label className="block text-sm font-medium text-body mb-2">
                    {t('jeonseDeposit')}
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted">
                      ₩
                    </span>
                    <input
                      type="number"
                      value={jeonseDeposit}
                      onChange={(e) => setJeonseDeposit(Number(e.target.value))}
                      className={`${glassInput} pl-8 pr-3 py-2`}
                      min="0"
                      step="10000000"
                    />
                  </div>
                  <p className="text-xs text-muted mt-1">
                    {formatWonUnit(jeonseDeposit)}원
                  </p>
                </div>

                {/* Wolse Deposit */}
                <div>
                  <label className="block text-sm font-medium text-body mb-2">
                    {t('wolseDeposit')}
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted">
                      ₩
                    </span>
                    <input
                      type="number"
                      value={wolseDeposit}
                      onChange={(e) => setWolseDeposit(Number(e.target.value))}
                      className={`${glassInput} pl-8 pr-3 py-2`}
                      min="0"
                      step="10000000"
                    />
                  </div>
                  <p className="text-xs text-muted mt-1">
                    {formatWonUnit(wolseDeposit)}원
                  </p>
                </div>

                {/* Conversion Rate */}
                <div>
                  <label className="block text-sm font-medium text-body mb-2">
                    {t('conversionRate')}
                  </label>
                  <input
                    type="number"
                    value={conversionRate}
                    onChange={(e) => setConversionRate(Number(e.target.value))}
                    className={`${glassInput} px-3 py-2`}
                    min="0"
                    max="20"
                    step="0.1"
                  />
                  <p className="text-xs text-muted mt-1">
                    연율: {conversionRate}%
                  </p>
                </div>
              </>
            ) : (
              <>
                {/* Reverse Wolse Deposit */}
                <div>
                  <label className="block text-sm font-medium text-body mb-2">
                    {t('wolseDeposit')}
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted">
                      ₩
                    </span>
                    <input
                      type="number"
                      value={reverseWolseDeposit}
                      onChange={(e) => setReverseWolseDeposit(Number(e.target.value))}
                      className={`${glassInput} pl-8 pr-3 py-2`}
                      min="0"
                      step="10000000"
                    />
                  </div>
                  <p className="text-xs text-muted mt-1">
                    {formatWonUnit(reverseWolseDeposit)}원
                  </p>
                </div>

                {/* Monthly Rent */}
                <div>
                  <label className="block text-sm font-medium text-body mb-2">
                    {t('monthlyRent')}
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted">
                      ₩
                    </span>
                    <input
                      type="number"
                      value={monthlyRent}
                      onChange={(e) => setMonthlyRent(Number(e.target.value))}
                      className={`${glassInput} pl-8 pr-3 py-2`}
                      min="0"
                      step="10000"
                    />
                  </div>
                  <p className="text-xs text-muted mt-1">
                    {formatWonUnit(monthlyRent)}원
                  </p>
                </div>

                {/* Reverse Conversion Rate */}
                <div>
                  <label className="block text-sm font-medium text-body mb-2">
                    {t('conversionRate')}
                  </label>
                  <input
                    type="number"
                    value={reverseConversionRate}
                    onChange={(e) => setReverseConversionRate(Number(e.target.value))}
                    className={`${glassInput} px-3 py-2`}
                    min="0"
                    max="20"
                    step="0.1"
                  />
                  <p className="text-xs text-muted mt-1">
                    연율: {reverseConversionRate}%
                  </p>
                </div>
              </>
            )}

            {/* Quick Rates */}
            <div>
              <label className="block text-sm font-medium text-body mb-2">
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
                        : 'bg-soft text-body hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                  >
                    {rate}%
                  </button>
                ))}
              </div>
            </div>

            {/* Quick Deposits */}
            <div>
              <label className="block text-sm font-medium text-body mb-2">
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
                    className="px-3 py-2 rounded-lg text-sm font-medium bg-soft text-body hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
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
            <div className="bg-subtle rounded-xl shadow-lg p-6">
              <div className="flex items-start justify-between mb-2">
                <h3 className="text-sm font-medium text-fg">
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
              <p className="text-2xl font-bold text-fg">
                {mode === 'jeonseToWolse'
                  ? `${formatWon(jeonseToWolseResult.monthlyRent)}원`
                  : `${formatWonUnit(wolseToJeonseResult.jeonseDeposit)}원`}
              </p>
              <p className="text-xs text-sub mt-1">
                {mode === 'jeonseToWolse'
                  ? formatWonUnit(jeonseToWolseResult.monthlyRent)
                  : formatWon(wolseToJeonseResult.jeonseDeposit)}
                원
              </p>
            </div>

            <div className="bg-subtle rounded-xl shadow-lg p-6">
              <div className="flex items-start justify-between mb-2">
                <h3 className="text-sm font-medium text-fg">
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
              <p className="text-2xl font-bold text-fg">
                {formatWon(currentResult.yearlyTotal)}원
              </p>
              <p className="text-xs text-sub mt-1">
                {formatWonUnit(currentResult.yearlyTotal)}원
              </p>
            </div>

            <div className="bg-subtle rounded-xl shadow-lg p-6">
              <div className="flex items-start justify-between mb-2">
                <h3 className="text-sm font-medium text-fg">
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
              <p className="text-2xl font-bold text-fg">
                {currentRate}%
              </p>
              <p className="text-xs text-sub mt-1">
                연율 기준
              </p>
            </div>
          </div>

          {/* Formula Display */}
          <div className={`${glassCard} ${glassInset} p-6`}>
            <div className="flex items-center gap-2 mb-4">
              <ArrowLeftRight className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              <h3 className="text-lg font-semibold text-fg">
                계산 공식
              </h3>
            </div>
            <div className="bg-subtle rounded-lg p-4">
              <p className="text-sm font-mono text-body">
                {mode === 'jeonseToWolse'
                  ? '월세 = (전세금 - 월세보증금) × 전환율 ÷ 12'
                  : '전세금 = 월세보증금 + (월세 × 12 ÷ 전환율)'}
              </p>
              <div className="mt-3 pt-3 border-t border-line">
                <p className="text-xs text-sub">
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

          {/* Conversion Rate Comparison Table */}
          <div className={`${glassCard} ${glassInset} p-6`}>
            <h3 className="text-lg font-semibold text-fg mb-4">
              {t('rateComparisonTable.title')}
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-line">
                    <th className="text-left py-2 pr-4 font-medium text-muted">
                      {t('rateComparisonTable.rate')}
                    </th>
                    <th className="text-right py-2 px-4 font-medium text-muted">
                      {mode === 'jeonseToWolse'
                        ? t('rateComparisonTable.monthlyRent')
                        : t('rateComparisonTable.jeonseDeposit')}
                    </th>
                    <th className="text-right py-2 pl-4 font-medium text-muted">
                      {t('rateComparisonTable.yearlyTotal')}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {[2, 3, 4, 5, 6].map((rate) => {
                    let mainValue: number
                    let yearly: number
                    if (mode === 'jeonseToWolse') {
                      const diff = jeonseDeposit - wolseDeposit
                      mainValue = diff > 0 ? Math.round((diff * rate) / 100 / 12) : 0
                      yearly = mainValue * 12
                    } else {
                      yearly = monthlyRent * 12
                      const converted = rate > 0 ? (yearly / rate) * 100 : 0
                      mainValue = Math.round(reverseWolseDeposit + converted)
                    }
                    const isActive = currentRate === rate
                    return (
                      <tr
                        key={rate}
                        className={`border-b border-line transition-colors ${
                          isActive
                            ? 'bg-subtle'
                            : 'hover:bg-gray-50 dark:hover:bg-gray-700'
                        }`}
                      >
                        <td className="py-2 pr-4">
                          <span
                            className={`font-semibold ${
                              isActive
                                ? 'text-sub'
                                : 'text-body'
                            }`}
                          >
                            {rate}%
                            {isActive && (
                              <span className="ml-2 text-xs bg-blue-600 text-white px-1.5 py-0.5 rounded">
                                {t('rateComparisonTable.current')}
                              </span>
                            )}
                          </span>
                        </td>
                        <td className="text-right py-2 px-4 font-medium text-fg">
                          {mode === 'jeonseToWolse'
                            ? `${formatWon(mainValue)}원`
                            : `${formatWonUnit(mainValue)}원`}
                        </td>
                        <td className="text-right py-2 pl-4 text-sub">
                          {formatWonUnit(yearly)}원
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Comparison Section */}
          <div className={`${glassCard} ${glassInset} p-6`}>
            <h3 className="text-lg font-semibold text-fg mb-4">
              전세 vs 월세 비교
            </h3>
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-body">
                    전세 기회비용 (연간)
                  </span>
                  <span className="text-sm font-bold text-blue-600 dark:text-blue-400">
                    {formatWon(currentResult.jeonseOpportunityCost)}원
                  </span>
                </div>
                <div className="w-full bg-track rounded-full h-4">
                  <div
                    className="bg-primary hover:bg-blue-700 h-4 rounded-full transition-all duration-300"
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
                  <span className="text-sm font-medium text-body">
                    연간 월세 총액
                  </span>
                  <span className="text-sm font-bold text-green-600 dark:text-green-400">
                    {formatWon(currentResult.yearlyTotal)}원
                  </span>
                </div>
                <div className="w-full bg-track rounded-full h-4">
                  <div
                    className="bg-primary hover:bg-blue-700 h-4 rounded-full transition-all duration-300"
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

              <div className="mt-4 p-4 bg-subtle rounded-lg">
                <p className="text-sm text-fg">
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
      <div className={`${glassCard} ${glassInset} p-6`}>
        <div className="flex items-center gap-2 mb-6">
          <BookOpen className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
          <h2 className="text-xl font-semibold text-fg">
            {t('guide.title')}
          </h2>
        </div>

        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold text-fg mb-3">
              {t('guide.what.title')}
            </h3>
            <ul className="space-y-2">
              {(t.raw('guide.what.items') as string[]).map((item, index) => (
                <li key={index} className="flex items-start gap-2">
                  <span className="text-blue-600 dark:text-blue-400 mt-1">•</span>
                  <span className="text-body">{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-fg mb-3">
              {t('guide.example.title')}
            </h3>
            <ul className="space-y-2">
              {(t.raw('guide.example.items') as string[]).map((item, index) => (
                <li key={index} className="flex items-start gap-2">
                  <span className="text-green-600 dark:text-green-400 mt-1">•</span>
                  <span className="text-body">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
