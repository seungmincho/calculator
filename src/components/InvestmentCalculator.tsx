'use client'

import { useState, useCallback, useMemo } from 'react'
import { useTranslations } from 'next-intl'
import { TrendingUp, Calculator, BarChart3, ArrowUpRight, ArrowDownRight, RefreshCw, BookOpen } from 'lucide-react'
import dynamic from 'next/dynamic'

const ReactECharts = dynamic(() => import('echarts-for-react'), { ssr: false })

type InvestmentType = 'lumpSum' | 'dca' | 'comparison'

interface YearlyData {
  year: number
  cumInvested: number
  yearProfit: number
  totalAsset: number
  realAssetValue: number
}

interface InvestmentResult {
  totalInvested: number
  finalAmount: number
  profit: number
  totalReturnPct: number
  cagr: number
  realReturnPct: number
  realValue: number
  yearlyData: YearlyData[]
}

const formatKRW = (value: number): string => {
  return Math.round(value).toLocaleString('ko-KR')
}

const formatInputNumber = (value: string): string => {
  const num = value.replace(/[^0-9]/g, '')
  if (!num) return ''
  return parseInt(num, 10).toLocaleString('ko-KR')
}

const parseInputNumber = (value: string): number => {
  return parseInt(value.replace(/[^0-9]/g, ''), 10) || 0
}

export default function InvestmentCalculator() {
  const t = useTranslations('investmentCalculator')

  const [investmentType, setInvestmentType] = useState<InvestmentType>('lumpSum')
  const [initialAmount, setInitialAmount] = useState('10,000,000')
  const [monthlyContribution, setMonthlyContribution] = useState('500,000')
  const [annualReturn, setAnnualReturn] = useState('7')
  const [investmentPeriod, setInvestmentPeriod] = useState('10')
  const [inflationRate, setInflationRate] = useState('3')
  const [result, setResult] = useState<InvestmentResult | null>(null)
  const [comparisonResult, setComparisonResult] = useState<{ lumpSum: InvestmentResult; dca: InvestmentResult } | null>(null)
  const [showTable, setShowTable] = useState(false)

  const calculateLumpSum = useCallback((initial: number, rate: number, years: number, inflation: number): InvestmentResult => {
    const monthlyRate = rate / 100 / 12
    const yearlyData: YearlyData[] = []

    let currentValue = initial

    for (let y = 1; y <= years; y++) {
      const startValue = y === 1 ? initial : yearlyData[y - 2].totalAsset
      let endValue = startValue
      for (let m = 0; m < 12; m++) {
        endValue = endValue * (1 + monthlyRate)
      }
      const yearProfit = endValue - startValue
      const realValue = endValue / Math.pow(1 + inflation / 100, y)

      yearlyData.push({
        year: y,
        cumInvested: initial,
        yearProfit: Math.round(yearProfit),
        totalAsset: Math.round(endValue),
        realAssetValue: Math.round(realValue),
      })

      currentValue = endValue
    }

    const finalAmount = currentValue
    const profit = finalAmount - initial
    const totalReturnPct = (profit / initial) * 100
    const cagr = (Math.pow(finalAmount / initial, 1 / years) - 1) * 100
    const realFinalValue = finalAmount / Math.pow(1 + inflation / 100, years)
    const realReturnPct = (Math.pow(realFinalValue / initial, 1 / years) - 1) * 100

    return {
      totalInvested: initial,
      finalAmount: Math.round(finalAmount),
      profit: Math.round(profit),
      totalReturnPct,
      cagr,
      realReturnPct,
      realValue: Math.round(realFinalValue),
      yearlyData,
    }
  }, [])

  const calculateDCA = useCallback((initial: number, monthly: number, rate: number, years: number, inflation: number): InvestmentResult => {
    const monthlyRate = rate / 100 / 12
    const yearlyData: YearlyData[] = []

    let currentValue = initial
    let totalContributed = initial

    for (let y = 1; y <= years; y++) {
      const startValue = currentValue
      const startContributed = totalContributed

      for (let m = 0; m < 12; m++) {
        currentValue = (currentValue + monthly) * (1 + monthlyRate)
        totalContributed += monthly
      }

      const yearProfit = currentValue - startValue - (totalContributed - startContributed)
      const realValue = currentValue / Math.pow(1 + inflation / 100, y)

      yearlyData.push({
        year: y,
        cumInvested: Math.round(totalContributed),
        yearProfit: Math.round(yearProfit),
        totalAsset: Math.round(currentValue),
        realAssetValue: Math.round(realValue),
      })
    }

    const finalAmount = currentValue
    const profit = finalAmount - totalContributed
    const totalReturnPct = (profit / totalContributed) * 100
    const cagr = totalContributed > 0 ? (Math.pow(finalAmount / totalContributed, 1 / years) - 1) * 100 : 0
    const realFinalValue = finalAmount / Math.pow(1 + inflation / 100, years)
    const realReturnPct = totalContributed > 0
      ? (Math.pow(realFinalValue / totalContributed, 1 / years) - 1) * 100
      : 0

    return {
      totalInvested: Math.round(totalContributed),
      finalAmount: Math.round(finalAmount),
      profit: Math.round(profit),
      totalReturnPct,
      cagr,
      realReturnPct,
      realValue: Math.round(realFinalValue),
      yearlyData,
    }
  }, [])

  const handleCalculate = useCallback(() => {
    const initial = parseInputNumber(initialAmount)
    const monthly = parseInputNumber(monthlyContribution)
    const rate = parseFloat(annualReturn) || 0
    const years = parseInt(investmentPeriod, 10) || 0
    const inflation = parseFloat(inflationRate) || 0

    if (years <= 0 || rate <= 0) return

    if (investmentType === 'lumpSum') {
      if (initial <= 0) return
      setResult(calculateLumpSum(initial, rate, years, inflation))
      setComparisonResult(null)
    } else if (investmentType === 'dca') {
      if (initial <= 0 && monthly <= 0) return
      setResult(calculateDCA(initial, monthly, rate, years, inflation))
      setComparisonResult(null)
    } else {
      if (initial <= 0) return
      const totalMonthlyForDCA = Math.round(initial / (years * 12))
      const lumpSumRes = calculateLumpSum(initial, rate, years, inflation)
      const dcaRes = calculateDCA(0, totalMonthlyForDCA, rate, years, inflation)
      setComparisonResult({ lumpSum: lumpSumRes, dca: dcaRes })
      setResult(null)
    }
  }, [initialAmount, monthlyContribution, annualReturn, investmentPeriod, inflationRate, investmentType, calculateLumpSum, calculateDCA])

  const handleReset = useCallback(() => {
    setInitialAmount('10,000,000')
    setMonthlyContribution('500,000')
    setAnnualReturn('7')
    setInvestmentPeriod('10')
    setInflationRate('3')
    setResult(null)
    setComparisonResult(null)
    setShowTable(false)
  }, [])

  const chartOption = useMemo(() => {
    if (!result) return {}
    const years = result.yearlyData.map(d => `${d.year}${t('yearLabel')}`)
    const invested = result.yearlyData.map(d => d.cumInvested)
    const assets = result.yearlyData.map(d => d.totalAsset)
    const real = result.yearlyData.map(d => d.realAssetValue)

    return {
      tooltip: {
        trigger: 'axis',
        formatter: (params: Array<{seriesName: string; value: number; marker: string; axisValue?: string}>) => {
          let html = `<div style="font-weight:600">${params[0]?.axisValue ?? ''}</div>`
          params.forEach(p => {
            html += `<div>${p.marker} ${p.seriesName}: ${Math.round(p.value).toLocaleString('ko-KR')}${t('won')}</div>`
          })
          return html
        }
      },
      legend: { data: [t('investedAmount'), t('assetValue'), t('realValueLabel')], bottom: 0 },
      grid: { left: '3%', right: '4%', bottom: '15%', containLabel: true },
      xAxis: { type: 'category', data: years, boundaryGap: false },
      yAxis: {
        type: 'value',
        axisLabel: {
          formatter: (value: number) => {
            if (value >= 100000000) return `${(value / 100000000).toFixed(1)}${t('eok')}`
            if (value >= 10000) return `${(value / 10000).toFixed(0)}${t('man')}`
            return value.toLocaleString('ko-KR')
          }
        }
      },
      series: [
        {
          name: t('investedAmount'),
          type: 'line',
          smooth: true,
          areaStyle: { opacity: 0.3, color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: 'rgba(59,130,246,0.4)' }, { offset: 1, color: 'rgba(59,130,246,0.05)' }] } },
          lineStyle: { width: 2, color: '#3B82F6' },
          itemStyle: { color: '#3B82F6' },
          data: invested,
        },
        {
          name: t('assetValue'),
          type: 'line',
          smooth: true,
          areaStyle: { opacity: 0.3, color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: 'rgba(16,185,129,0.4)' }, { offset: 1, color: 'rgba(16,185,129,0.05)' }] } },
          lineStyle: { width: 2, color: '#10B981' },
          itemStyle: { color: '#10B981' },
          data: assets,
        },
        {
          name: t('realValueLabel'),
          type: 'line',
          smooth: true,
          lineStyle: { width: 2, type: 'dashed', color: '#F59E0B' },
          itemStyle: { color: '#F59E0B' },
          data: real,
        },
      ],
    }
  }, [result, t])

  const comparisonChartOption = useMemo(() => {
    if (!comparisonResult) return {}
    const years = comparisonResult.lumpSum.yearlyData.map(d => `${d.year}${t('yearLabel')}`)
    const lumpSumData = comparisonResult.lumpSum.yearlyData.map(d => d.totalAsset)
    const dcaData = comparisonResult.dca.yearlyData.map(d => d.totalAsset)

    return {
      tooltip: {
        trigger: 'axis',
        formatter: (params: Array<{seriesName: string; value: number; marker: string; axisValue?: string}>) => {
          let html = `<div style="font-weight:600">${params[0]?.axisValue ?? ''}</div>`
          params.forEach(p => {
            html += `<div>${p.marker} ${p.seriesName}: ${Math.round(p.value).toLocaleString('ko-KR')}${t('won')}</div>`
          })
          return html
        }
      },
      legend: { data: [t('vs.lumpSumResult'), t('vs.dcaResult')], bottom: 0 },
      grid: { left: '3%', right: '4%', bottom: '15%', containLabel: true },
      xAxis: { type: 'category', data: years, boundaryGap: false },
      yAxis: {
        type: 'value',
        axisLabel: {
          formatter: (value: number) => {
            if (value >= 100000000) return `${(value / 100000000).toFixed(1)}${t('eok')}`
            if (value >= 10000) return `${(value / 10000).toFixed(0)}${t('man')}`
            return value.toLocaleString('ko-KR')
          }
        }
      },
      series: [
        {
          name: t('vs.lumpSumResult'),
          type: 'line',
          smooth: true,
          areaStyle: { opacity: 0.3, color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: 'rgba(59,130,246,0.4)' }, { offset: 1, color: 'rgba(59,130,246,0.05)' }] } },
          lineStyle: { width: 2, color: '#3B82F6' },
          itemStyle: { color: '#3B82F6' },
          data: lumpSumData,
        },
        {
          name: t('vs.dcaResult'),
          type: 'line',
          smooth: true,
          areaStyle: { opacity: 0.3, color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: 'rgba(16,185,129,0.4)' }, { offset: 1, color: 'rgba(16,185,129,0.05)' }] } },
          lineStyle: { width: 2, color: '#10B981' },
          itemStyle: { color: '#10B981' },
          data: dcaData,
        },
      ],
    }
  }, [comparisonResult, t])

  const activeResult = result
  const displayData = activeResult?.yearlyData ?? []

  const renderResultCard = (res: InvestmentResult, label?: string) => (
    <div className="space-y-4">
      {label && (
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{label}</h3>
      )}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <div className="bg-blue-50 dark:bg-blue-950 rounded-xl p-4">
          <p className="text-xs text-blue-600 dark:text-blue-400 mb-1">{t('totalInvested')}</p>
          <p className="text-lg font-bold text-blue-900 dark:text-blue-100">{formatKRW(res.totalInvested)}<span className="text-sm font-normal">{t('won')}</span></p>
        </div>
        <div className="bg-green-50 dark:bg-green-950 rounded-xl p-4">
          <p className="text-xs text-green-600 dark:text-green-400 mb-1">{t('finalAmount')}</p>
          <p className="text-lg font-bold text-green-900 dark:text-green-100">{formatKRW(res.finalAmount)}<span className="text-sm font-normal">{t('won')}</span></p>
        </div>
        <div className={`rounded-xl p-4 ${res.profit >= 0 ? 'bg-emerald-50 dark:bg-emerald-950' : 'bg-red-50 dark:bg-red-950'}`}>
          <p className={`text-xs mb-1 ${res.profit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>{t('profit')}</p>
          <p className={`text-lg font-bold flex items-center gap-1 ${res.profit >= 0 ? 'text-emerald-900 dark:text-emerald-100' : 'text-red-900 dark:text-red-100'}`}>
            {res.profit >= 0 ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
            {formatKRW(Math.abs(res.profit))}<span className="text-sm font-normal">{t('won')}</span>
          </p>
        </div>
        <div className="bg-purple-50 dark:bg-purple-950 rounded-xl p-4">
          <p className="text-xs text-purple-600 dark:text-purple-400 mb-1">{t('totalReturn')}</p>
          <p className="text-lg font-bold text-purple-900 dark:text-purple-100">{res.totalReturnPct.toFixed(2)}%</p>
        </div>
        <div className="bg-indigo-50 dark:bg-indigo-950 rounded-xl p-4">
          <p className="text-xs text-indigo-600 dark:text-indigo-400 mb-1">{t('cagr')}</p>
          <p className="text-lg font-bold text-indigo-900 dark:text-indigo-100">{res.cagr.toFixed(2)}%</p>
        </div>
        <div className="bg-amber-50 dark:bg-amber-950 rounded-xl p-4">
          <p className="text-xs text-amber-600 dark:text-amber-400 mb-1">{t('realReturn')}</p>
          <p className="text-lg font-bold text-amber-900 dark:text-amber-100">{res.realReturnPct.toFixed(2)}%</p>
        </div>
      </div>
      <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-4">
        <p className="text-sm text-gray-600 dark:text-gray-300">
          {t('inflationAdjusted')}: <span className="font-semibold text-gray-900 dark:text-white">{formatKRW(res.realValue)}{t('won')}</span>
        </p>
      </div>
    </div>
  )

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-2">
          <TrendingUp className="w-8 h-8 text-blue-600 dark:text-blue-400" />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('title')}</h1>
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400">{t('description')}</p>
      </div>

      {/* Investment Type Tabs */}
      <div className="flex gap-2 bg-white dark:bg-gray-800 rounded-xl shadow-lg p-2">
        {(['lumpSum', 'dca', 'comparison'] as InvestmentType[]).map((type) => (
          <button
            key={type}
            onClick={() => {
              setInvestmentType(type)
              setResult(null)
              setComparisonResult(null)
            }}
            className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
              investmentType === type
                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
          >
            {t(type)}
          </button>
        ))}
      </div>

      {/* Main Grid */}
      <div className="grid lg:grid-cols-3 gap-8">
        {/* Settings Panel */}
        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 space-y-5">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <Calculator className="w-5 h-5 text-blue-600" />
              {t('investmentType')}
            </h2>

            {/* Initial Amount */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('initialAmount')}
              </label>
              <div className="relative">
                <input
                  type="text"
                  inputMode="numeric"
                  value={initialAmount}
                  onChange={(e) => setInitialAmount(formatInputNumber(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 pr-8"
                  placeholder="10,000,000"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">{t('won')}</span>
              </div>
            </div>

            {/* Monthly Contribution (DCA mode only) */}
            {investmentType === 'dca' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('monthlyContribution')}
                </label>
                <div className="relative">
                  <input
                    type="text"
                    inputMode="numeric"
                    value={monthlyContribution}
                    onChange={(e) => setMonthlyContribution(formatInputNumber(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 pr-8"
                    placeholder="500,000"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">{t('won')}</span>
                </div>
              </div>
            )}

            {/* Annual Return */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('annualReturn')}
              </label>
              <div className="relative">
                <input
                  type="number"
                  inputMode="decimal"
                  value={annualReturn}
                  onChange={(e) => setAnnualReturn(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 pr-8"
                  placeholder="7"
                  step="0.1"
                  min="0"
                  max="100"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">%</span>
              </div>
            </div>

            {/* Investment Period */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('investmentPeriod')}
              </label>
              <div className="relative">
                <input
                  type="number"
                  inputMode="numeric"
                  value={investmentPeriod}
                  onChange={(e) => setInvestmentPeriod(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 pr-12"
                  placeholder="10"
                  min="1"
                  max="50"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">{t('years')}</span>
              </div>
            </div>

            {/* Inflation Rate */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('inflationRate')}
              </label>
              <div className="relative">
                <input
                  type="number"
                  inputMode="decimal"
                  value={inflationRate}
                  onChange={(e) => setInflationRate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 pr-8"
                  placeholder="3"
                  step="0.1"
                  min="0"
                  max="30"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">%</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-2">
              <button
                onClick={handleCalculate}
                className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg px-4 py-3 font-medium hover:from-blue-700 hover:to-indigo-700 transition-colors flex items-center justify-center gap-2"
              >
                <Calculator className="w-4 h-4" />
                {t('calculate')}
              </button>
              <button
                onClick={handleReset}
                className="bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg px-4 py-3 transition-colors"
                title={t('reset')}
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>

            {/* Comparison mode explanation */}
            {investmentType === 'comparison' && (
              <div className="bg-blue-50 dark:bg-blue-950 rounded-lg p-3">
                <p className="text-xs text-blue-700 dark:text-blue-300">
                  {t('vs.title')}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Results Panel */}
        <div className="lg:col-span-2 space-y-6">
          {/* Single Result */}
          {result && (
            <>
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
                {renderResultCard(result)}
              </div>

              {/* Chart */}
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-blue-600" />
                  {t('chartTitle')}
                </h3>
                <ReactECharts option={chartOption} style={{ height: '350px' }} />
              </div>

              {/* Yearly Table */}
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-indigo-600" />
                    {t('tableTitle')}
                  </h3>
                  <button
                    onClick={() => setShowTable(!showTable)}
                    className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    {showTable ? t('hideTable') : t('showTable')}
                  </button>
                </div>
                {showTable && (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-200 dark:border-gray-700">
                          <th className="py-2 px-3 text-left text-gray-600 dark:text-gray-400 font-medium">{t('year')}</th>
                          <th className="py-2 px-3 text-right text-gray-600 dark:text-gray-400 font-medium">{t('cumInvested')}</th>
                          <th className="py-2 px-3 text-right text-gray-600 dark:text-gray-400 font-medium">{t('yearProfit')}</th>
                          <th className="py-2 px-3 text-right text-gray-600 dark:text-gray-400 font-medium">{t('totalAsset')}</th>
                          <th className="py-2 px-3 text-right text-gray-600 dark:text-gray-400 font-medium">{t('realAssetValue')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {displayData.map((row) => (
                          <tr key={row.year} className="border-b border-gray-100 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/30">
                            <td className="py-2 px-3 text-gray-900 dark:text-white">{row.year}{t('yearLabel')}</td>
                            <td className="py-2 px-3 text-right text-gray-700 dark:text-gray-300">{formatKRW(row.cumInvested)}</td>
                            <td className={`py-2 px-3 text-right font-medium ${row.yearProfit >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                              {row.yearProfit >= 0 ? '+' : ''}{formatKRW(row.yearProfit)}
                            </td>
                            <td className="py-2 px-3 text-right font-semibold text-gray-900 dark:text-white">{formatKRW(row.totalAsset)}</td>
                            <td className="py-2 px-3 text-right text-amber-600 dark:text-amber-400">{formatKRW(row.realAssetValue)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          )}

          {/* Comparison Results */}
          {comparisonResult && (
            <>
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 space-y-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-blue-600" />
                  {t('vs.title')}
                </h3>

                <div className="grid md:grid-cols-2 gap-6">
                  <div className="border border-blue-200 dark:border-blue-800 rounded-xl p-4">
                    {renderResultCard(comparisonResult.lumpSum, t('vs.lumpSumResult'))}
                  </div>
                  <div className="border border-green-200 dark:border-green-800 rounded-xl p-4">
                    {renderResultCard(comparisonResult.dca, t('vs.dcaResult'))}
                  </div>
                </div>

                {/* Difference Summary */}
                <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-4">
                  <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">{t('vs.difference')}</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-gray-500 dark:text-gray-400">{t('finalAmount')}</p>
                      <p className={`font-bold ${comparisonResult.lumpSum.finalAmount >= comparisonResult.dca.finalAmount ? 'text-blue-600' : 'text-green-600'}`}>
                        {comparisonResult.lumpSum.finalAmount >= comparisonResult.dca.finalAmount ? t('lumpSum') : t('dca')}
                        {' +'}
                        {formatKRW(Math.abs(comparisonResult.lumpSum.finalAmount - comparisonResult.dca.finalAmount))}{t('won')}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-500 dark:text-gray-400">{t('cagr')}</p>
                      <p className={`font-bold ${comparisonResult.lumpSum.cagr >= comparisonResult.dca.cagr ? 'text-blue-600' : 'text-green-600'}`}>
                        {comparisonResult.lumpSum.cagr >= comparisonResult.dca.cagr ? t('lumpSum') : t('dca')}
                        {' +'}
                        {Math.abs(comparisonResult.lumpSum.cagr - comparisonResult.dca.cagr).toFixed(2)}%
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Comparison Chart */}
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-blue-600" />
                  {t('chartTitle')}
                </h3>
                <ReactECharts option={comparisonChartOption} style={{ height: '350px' }} />
              </div>
            </>
          )}

          {/* No result placeholder */}
          {!result && !comparisonResult && (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-12 text-center">
              <TrendingUp className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
              <p className="text-gray-500 dark:text-gray-400">{t('noResult')}</p>
            </div>
          )}
        </div>
      </div>

      {/* Guide Section */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-blue-600" />
          {t('guide.title')}
        </h2>

        <div className="grid md:grid-cols-3 gap-6">
          {/* Concepts */}
          <div>
            <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-3">{t('guide.concepts.title')}</h3>
            <ul className="space-y-2">
              {(t.raw('guide.concepts.items') as string[]).map((item, i) => (
                <li key={i} className="text-sm text-gray-600 dark:text-gray-400 flex items-start gap-2">
                  <span className="text-blue-500 mt-0.5">&#x2022;</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>

          {/* Formulas */}
          <div>
            <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-3">{t('guide.formulas.title')}</h3>
            <ul className="space-y-2">
              {(t.raw('guide.formulas.items') as string[]).map((item, i) => (
                <li key={i} className="text-sm text-gray-600 dark:text-gray-400 flex items-start gap-2">
                  <span className="text-indigo-500 mt-0.5">&#x2022;</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>

          {/* Tips */}
          <div>
            <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-3">{t('guide.tips.title')}</h3>
            <ul className="space-y-2">
              {(t.raw('guide.tips.items') as string[]).map((item, i) => (
                <li key={i} className="text-sm text-gray-600 dark:text-gray-400 flex items-start gap-2">
                  <span className="text-green-500 mt-0.5">&#x2022;</span>
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
