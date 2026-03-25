'use client'

import { useState, useEffect, useCallback, useMemo, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Calculator, RotateCcw, Copy, Check, ChevronDown, ChevronUp, TrendingUp, AlertTriangle } from 'lucide-react'
import dynamic from 'next/dynamic'
import GuideSection from '@/components/GuideSection'

const ReactECharts = dynamic(() => import('echarts-for-react'), { ssr: false })

// ── Tax calculation engine (2025 Korean tax law) ──

interface DeductionBreakdown {
  nationalPension: number
  healthInsurance: number
  longTermCare: number
  employmentInsurance: number
  incomeTax: number
  localIncomeTax: number
  total: number
}

interface TaxResult {
  gross: number
  taxableIncome: number
  workIncomeDeduction: number
  personalDeduction: number
  deductions: DeductionBreakdown
  netAnnual: number
  effectiveTaxRate: number
  marginalRate: number
  bracketLabel: string
}

function calcWorkIncomeDeduction(gross: number): number {
  let d = 0
  if (gross <= 5_000_000) {
    d = gross * 0.7
  } else if (gross <= 15_000_000) {
    d = 3_500_000 + (gross - 5_000_000) * 0.4
  } else if (gross <= 45_000_000) {
    d = 7_500_000 + (gross - 15_000_000) * 0.15
  } else if (gross <= 100_000_000) {
    d = 12_000_000 + (gross - 45_000_000) * 0.05
  } else {
    d = 14_750_000 + (gross - 100_000_000) * 0.02
  }
  return Math.min(d, 20_000_000)
}

const TAX_BRACKETS = [
  { limit: 14_000_000, rate: 0.06, cumulative: 0, label: 'b1' },
  { limit: 50_000_000, rate: 0.15, cumulative: 840_000, label: 'b2' },
  { limit: 88_000_000, rate: 0.24, cumulative: 6_240_000, label: 'b3' },
  { limit: 150_000_000, rate: 0.35, cumulative: 15_360_000, label: 'b4' },
  { limit: 300_000_000, rate: 0.38, cumulative: 37_060_000, label: 'b5' },
  { limit: 500_000_000, rate: 0.40, cumulative: 94_060_000, label: 'b6' },
  { limit: 1_000_000_000, rate: 0.42, cumulative: 174_060_000, label: 'b7' },
  { limit: Infinity, rate: 0.45, cumulative: 384_060_000, label: 'b8' },
]

function calcIncomeTax(taxableIncome: number): { tax: number; marginalRate: number; bracketLabel: string } {
  if (taxableIncome <= 0) return { tax: 0, marginalRate: 0.06, bracketLabel: 'b1' }
  let tax = 0
  let marginalRate = 0.06
  let bracketLabel = 'b1'
  let prev = 0
  for (const b of TAX_BRACKETS) {
    if (taxableIncome <= b.limit) {
      tax = b.cumulative + (taxableIncome - prev) * b.rate
      marginalRate = b.rate
      bracketLabel = b.label
      break
    }
    prev = b.limit
  }
  return { tax: Math.floor(tax), marginalRate, bracketLabel }
}

function calculateTax(grossAnnual: number, nonTaxableAnnual: number, dependents: number, children: number): TaxResult {
  const taxableAnnual = Math.max(0, grossAnnual - nonTaxableAnnual)

  // 4대보험
  const pensionCap = 29_160_000
  const nationalPension = Math.floor(Math.min(taxableAnnual, pensionCap) * 0.045)
  const healthInsurance = Math.floor(taxableAnnual * 0.03545)
  const longTermCare = Math.floor(healthInsurance * 0.1295)
  const employmentInsurance = Math.floor(taxableAnnual * 0.009)

  // 소득공제
  const workIncomeDeduction = calcWorkIncomeDeduction(grossAnnual)
  const personalDeduction = 1_500_000 + Math.max(0, dependents - 1) * 1_500_000 + children * 1_500_000
  const workIncome = grossAnnual - workIncomeDeduction
  const totalDeduction = nationalPension + personalDeduction
  const taxableIncome = Math.max(0, workIncome - totalDeduction)

  const { tax: incomeTax, marginalRate, bracketLabel } = calcIncomeTax(taxableIncome)
  const localIncomeTax = Math.floor(incomeTax * 0.1)

  const totalDeductions = nationalPension + healthInsurance + longTermCare + employmentInsurance + incomeTax + localIncomeTax

  return {
    gross: grossAnnual,
    taxableIncome,
    workIncomeDeduction,
    personalDeduction,
    deductions: {
      nationalPension,
      healthInsurance,
      longTermCare,
      employmentInsurance,
      incomeTax,
      localIncomeTax,
      total: totalDeductions,
    },
    netAnnual: grossAnnual - totalDeductions,
    effectiveTaxRate: grossAnnual > 0 ? (totalDeductions / grossAnnual) * 100 : 0,
    marginalRate,
    bracketLabel,
  }
}

// ── Helpers ──

function formatNumber(n: number): string {
  return Math.floor(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}

function parseFormatted(s: string): number {
  return parseInt(s.replace(/,/g, ''), 10) || 0
}

function formatInputValue(value: string): string {
  const num = value.replace(/[^\d]/g, '')
  if (!num) return ''
  return parseInt(num, 10).toLocaleString('en-US')
}

// ── Component ──

function BonusCalculatorContent() {
  const searchParams = useSearchParams()
  const t = useTranslations('bonusCalculator')

  // Input state
  const [salary, setSalary] = useState('')
  const [bonusType, setBonusType] = useState('ps')
  const [bonusMethod, setBonusMethod] = useState<'percent' | 'amount'>('percent')
  const [bonusPercent, setBonusPercent] = useState(100)
  const [bonusAmount, setBonusAmount] = useState('')
  const [dependents, setDependents] = useState(1)
  const [children, setChildren] = useState(0)
  const [nonTaxable, setNonTaxable] = useState('200,000')
  const [activeTab, setActiveTab] = useState(0)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [showDetail, setShowDetail] = useState(false)

  // URL params → state (on mount)
  useEffect(() => {
    const s = searchParams.get('salary')
    const bp = searchParams.get('bonusPercent')
    const ba = searchParams.get('bonusAmount')
    const bt = searchParams.get('bonusType')
    const d = searchParams.get('dependents')
    const c = searchParams.get('children')
    const nt = searchParams.get('nonTaxable')
    const bm = searchParams.get('bonusMethod')

    if (s) setSalary(formatInputValue(s))
    if (bp) { setBonusPercent(parseInt(bp) || 100); setBonusMethod('percent') }
    if (ba) { setBonusAmount(formatInputValue(ba)); setBonusMethod('amount') }
    if (bm === 'amount') setBonusMethod('amount')
    if (bt) setBonusType(bt)
    if (d) setDependents(parseInt(d) || 1)
    if (c) setChildren(parseInt(c) || 0)
    if (nt) setNonTaxable(formatInputValue(nt))
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // State → URL params
  const syncURL = useCallback(() => {
    const url = new URL(window.location.href)
    url.search = ''
    if (salary) url.searchParams.set('salary', salary.replace(/,/g, ''))
    url.searchParams.set('bonusMethod', bonusMethod)
    if (bonusMethod === 'percent') url.searchParams.set('bonusPercent', String(bonusPercent))
    else if (bonusAmount) url.searchParams.set('bonusAmount', bonusAmount.replace(/,/g, ''))
    if (bonusType !== 'ps') url.searchParams.set('bonusType', bonusType)
    if (dependents !== 1) url.searchParams.set('dependents', String(dependents))
    if (children !== 0) url.searchParams.set('children', String(children))
    const ntVal = nonTaxable.replace(/,/g, '')
    if (ntVal !== '200000') url.searchParams.set('nonTaxable', ntVal)
    window.history.replaceState({}, '', url.toString())
  }, [salary, bonusMethod, bonusPercent, bonusAmount, bonusType, dependents, children, nonTaxable])

  useEffect(() => {
    const timer = setTimeout(syncURL, 300)
    return () => clearTimeout(timer)
  }, [syncURL])

  // ── Calculations ──

  const annualSalary = parseFormatted(salary)
  const nonTaxableAnnual = parseFormatted(nonTaxable) * 12

  const bonusGross = useMemo(() => {
    if (bonusMethod === 'percent') return Math.floor(annualSalary * (bonusPercent / 100))
    return parseFormatted(bonusAmount)
  }, [bonusMethod, annualSalary, bonusPercent, bonusAmount])

  const salaryOnlyResult = useMemo(() => {
    if (annualSalary <= 0) return null
    return calculateTax(annualSalary, nonTaxableAnnual, dependents, children)
  }, [annualSalary, nonTaxableAnnual, dependents, children])

  const withBonusResult = useMemo(() => {
    if (annualSalary <= 0 || bonusGross <= 0) return null
    return calculateTax(annualSalary + bonusGross, nonTaxableAnnual, dependents, children)
  }, [annualSalary, bonusGross, nonTaxableAnnual, dependents, children])

  const bonusDeductions = useMemo(() => {
    if (!salaryOnlyResult || !withBonusResult) return null
    const diff = (key: keyof DeductionBreakdown) => withBonusResult.deductions[key] - salaryOnlyResult.deductions[key]
    const totalDiff = diff('total')
    return {
      nationalPension: diff('nationalPension'),
      healthInsurance: diff('healthInsurance'),
      longTermCare: diff('longTermCare'),
      employmentInsurance: diff('employmentInsurance'),
      incomeTax: diff('incomeTax'),
      localIncomeTax: diff('localIncomeTax'),
      total: totalDiff,
      net: bonusGross - totalDiff,
      takeHomeRate: bonusGross > 0 ? ((bonusGross - totalDiff) / bonusGross) * 100 : 0,
      effectiveRate: bonusGross > 0 ? (totalDiff / bonusGross) * 100 : 0,
    }
  }, [salaryOnlyResult, withBonusResult, bonusGross])

  // Simulation data
  const simulationData = useMemo(() => {
    if (annualSalary <= 0) return []
    const ratios = [50, 100, 150, 200, 300, 500]
    return ratios.map(ratio => {
      const gross = Math.floor(annualSalary * (ratio / 100))
      const base = calculateTax(annualSalary, nonTaxableAnnual, dependents, children)
      const combined = calculateTax(annualSalary + gross, nonTaxableAnnual, dependents, children)
      const totalDed = combined.deductions.total - base.deductions.total
      const net = gross - totalDed
      return {
        ratio,
        gross,
        deductions: totalDed,
        net,
        netRate: gross > 0 ? (net / gross) * 100 : 0,
        isCurrent: bonusMethod === 'percent' && ratio === bonusPercent,
      }
    })
  }, [annualSalary, nonTaxableAnnual, dependents, children, bonusPercent, bonusMethod])

  const bracketChanged = salaryOnlyResult && withBonusResult && salaryOnlyResult.bracketLabel !== withBonusResult.bracketLabel

  // Copy URL
  const copyToClipboard = useCallback(async () => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(window.location.href)
      } else {
        const ta = document.createElement('textarea')
        ta.value = window.location.href
        ta.style.position = 'fixed'
        ta.style.left = '-999999px'
        document.body.appendChild(ta)
        ta.select()
        document.execCommand('copy')
        document.body.removeChild(ta)
      }
      setCopiedId('url')
      setTimeout(() => setCopiedId(null), 2000)
    } catch { /* ignore */ }
  }, [])

  const handleReset = useCallback(() => {
    setSalary('')
    setBonusType('ps')
    setBonusMethod('percent')
    setBonusPercent(100)
    setBonusAmount('')
    setDependents(1)
    setChildren(0)
    setNonTaxable('200,000')
    window.history.replaceState({}, '', window.location.pathname)
  }, [])

  const tabs = ['result', 'simulation', 'taxAnalysis']

  // ── Chart options ──

  const simulationChartOption = useMemo(() => {
    if (simulationData.length === 0) return {}
    return {
      tooltip: {
        trigger: 'axis',
        formatter: (params: Array<{ name: string; seriesName: string; value: number }>) => {
          const items = params.map(p => `${p.seriesName}: ${formatNumber(p.value)}${t('chart.won') || '원'}`)
          return `${params[0].name}<br/>${items.join('<br/>')}`
        },
      },
      legend: { bottom: 0, textStyle: { color: '#9CA3AF' } },
      grid: { top: 20, right: 20, bottom: 40, left: 80 },
      xAxis: {
        type: 'category',
        data: simulationData.map(d => `${d.ratio}%`),
        axisLabel: { color: '#9CA3AF' },
      },
      yAxis: {
        type: 'value',
        axisLabel: {
          color: '#9CA3AF',
          formatter: (v: number) => `${Math.floor(v / 10000)}${t('chart.manwon') || '만'}`,
        },
      },
      series: [
        {
          name: t('simulation.grossBonus'),
          type: 'bar',
          data: simulationData.map(d => d.gross),
          itemStyle: { color: '#3B82F6' },
        },
        {
          name: t('simulation.netBonus'),
          type: 'bar',
          data: simulationData.map(d => d.net),
          itemStyle: { color: '#10B981' },
        },
      ],
    }
  }, [simulationData, t])

  const deductionPieOption = useMemo(() => {
    if (!bonusDeductions) return {}
    const items = [
      { name: t('result.nationalPension'), value: bonusDeductions.nationalPension },
      { name: t('result.healthInsurance'), value: bonusDeductions.healthInsurance },
      { name: t('result.longTermCare'), value: bonusDeductions.longTermCare },
      { name: t('result.employmentInsurance'), value: bonusDeductions.employmentInsurance },
      { name: t('result.incomeTax'), value: bonusDeductions.incomeTax },
      { name: t('result.localTax'), value: bonusDeductions.localIncomeTax },
    ].filter(i => i.value > 0)
    return {
      tooltip: {
        trigger: 'item',
        formatter: (p: { name: string; value: number; percent: number }) => `${p.name}: ${formatNumber(p.value)}${t('chart.won') || '원'} (${p.percent.toFixed(1)}%)`,
      },
      legend: { bottom: 0, textStyle: { color: '#9CA3AF' } },
      series: [
        {
          type: 'pie',
          radius: ['40%', '70%'],
          center: ['50%', '45%'],
          data: items,
          label: { show: false },
          emphasis: {
            label: { show: true, fontWeight: 'bold' },
          },
          itemStyle: {
            borderRadius: 4,
            borderColor: 'transparent',
            borderWidth: 2,
          },
          color: ['#3B82F6', '#10B981', '#8B5CF6', '#F59E0B', '#EF4444', '#EC4899'],
        },
      ],
    }
  }, [bonusDeductions, t])

  const hasResult = !!(salaryOnlyResult && bonusDeductions)

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
        {/* ── Input Panel (1/3) ── */}
        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 space-y-5 sticky top-24">
            {/* Annual salary */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('annualSalary')}
              </label>
              <input
                type="text"
                inputMode="numeric"
                value={salary}
                onChange={e => setSalary(formatInputValue(e.target.value))}
                placeholder={t('annualSalaryPlaceholder')}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 text-right"
              />
            </div>

            {/* Bonus type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('bonusType')}
              </label>
              <select
                value={bonusType}
                onChange={e => setBonusType(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
              >
                {['ps', 'pi', 'management', 'individual', 'custom'].map(key => (
                  <option key={key} value={key}>{t(`bonusTypes.${key}`)}</option>
                ))}
              </select>
            </div>

            {/* Bonus input method toggle */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('bonusInput')}
              </label>
              <div className="flex rounded-lg overflow-hidden border border-gray-300 dark:border-gray-600">
                <button
                  onClick={() => setBonusMethod('percent')}
                  className={`flex-1 py-2 text-sm font-medium transition-colors ${
                    bonusMethod === 'percent'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  {t('byPercent')}
                </button>
                <button
                  onClick={() => setBonusMethod('amount')}
                  className={`flex-1 py-2 text-sm font-medium transition-colors ${
                    bonusMethod === 'amount'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  {t('byAmount')}
                </button>
              </div>
            </div>

            {/* Bonus percent slider OR amount input */}
            {bonusMethod === 'percent' ? (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('bonusPercent')}: <span className="text-blue-600 dark:text-blue-400 font-bold">{bonusPercent}%</span>
                </label>
                <input
                  type="range"
                  min={0}
                  max={500}
                  step={10}
                  value={bonusPercent}
                  onChange={e => setBonusPercent(parseInt(e.target.value))}
                  className="w-full accent-blue-600"
                />
                <div className="flex justify-between text-xs text-gray-400 mt-1">
                  <span>0%</span>
                  <span>100%</span>
                  <span>200%</span>
                  <span>300%</span>
                  <span>500%</span>
                </div>
                {annualSalary > 0 && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    = {formatNumber(bonusGross)}{t('chart.won')}
                  </p>
                )}
              </div>
            ) : (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('bonusAmount')}
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={bonusAmount}
                  onChange={e => setBonusAmount(formatInputValue(e.target.value))}
                  placeholder={t('bonusAmountPlaceholder')}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 text-right"
                />
              </div>
            )}

            {/* Dependents */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('dependents')}
                </label>
                <select
                  value={dependents}
                  onChange={e => setDependents(parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                >
                  {[1, 2, 3, 4, 5, 6, 7, 8].map(n => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('childrenUnder20')}
                </label>
                <select
                  value={children}
                  onChange={e => setChildren(parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                >
                  {[0, 1, 2, 3, 4, 5].map(n => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Non-taxable */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('nonTaxable')}
              </label>
              <input
                type="text"
                inputMode="numeric"
                value={nonTaxable}
                onChange={e => setNonTaxable(formatInputValue(e.target.value))}
                placeholder={t('nonTaxablePlaceholder')}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 text-right"
              />
            </div>

            {/* Buttons */}
            <div className="flex gap-3">
              <button
                onClick={copyToClipboard}
                className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg px-4 py-3 font-medium hover:from-blue-700 hover:to-indigo-700 flex items-center justify-center gap-2 transition-all"
              >
                {copiedId === 'url' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copiedId === 'url' ? t('share.copied') : t('share.copy')}
              </button>
              <button
                onClick={handleReset}
                className="bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg px-4 py-3 font-medium flex items-center gap-2 transition-colors"
              >
                <RotateCcw className="w-4 h-4" />
                {t('reset')}
              </button>
            </div>
          </div>
        </div>

        {/* ── Result Panel (2/3) ── */}
        <div className="lg:col-span-2 space-y-6">
          {!hasResult ? (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-12 text-center">
              <Calculator className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
              <p className="text-gray-500 dark:text-gray-400 text-lg">{t('description')}</p>
            </div>
          ) : (
            <>
              {/* Tabs */}
              <div className="border-b border-gray-200 dark:border-gray-700">
                <nav className="flex gap-6">
                  {tabs.map((tab, idx) => (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(idx)}
                      className={`pb-3 px-1 text-sm font-medium transition-colors ${
                        activeTab === idx
                          ? 'border-b-2 border-blue-600 text-blue-600 dark:text-blue-400'
                          : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                      }`}
                    >
                      {t(`${tab}.title`)}
                    </button>
                  ))}
                </nav>
              </div>

              {/* Tab 0: Result */}
              {activeTab === 0 && bonusDeductions && salaryOnlyResult && withBonusResult && (
                <div className="space-y-6">
                  {/* Hero card */}
                  <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl shadow-lg p-6 text-white">
                    <p className="text-sm opacity-80">{t('result.bonusNet')}</p>
                    <p className="text-3xl font-bold mt-1">
                      {formatNumber(bonusDeductions.net)}{t('chart.won')}
                    </p>
                    <div className="flex gap-6 mt-3 text-sm opacity-90">
                      <span>{t('result.bonusGross')}: {formatNumber(bonusGross)}{t('chart.won')}</span>
                      <span>{t('result.totalDeduction')}: {formatNumber(bonusDeductions.total)}{t('chart.won')}</span>
                    </div>
                    <div className="flex gap-6 mt-2 text-sm">
                      <span className="bg-white/20 rounded-full px-3 py-0.5">
                        {t('result.effectiveRate')}: {bonusDeductions.effectiveRate.toFixed(1)}%
                      </span>
                      <span className="bg-white/20 rounded-full px-3 py-0.5">
                        {t('simulation.netRate')}: {bonusDeductions.takeHomeRate.toFixed(1)}%
                      </span>
                    </div>
                  </div>

                  {/* Before / After comparison cards */}
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-5">
                      <p className="text-sm text-gray-500 dark:text-gray-400">{t('result.salaryOnly')}</p>
                      <p className="text-xl font-bold text-gray-900 dark:text-white mt-1">
                        {formatNumber(salaryOnlyResult.netAnnual)}{t('chart.won')}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        {t('result.totalAnnual')}: {formatNumber(salaryOnlyResult.gross)}{t('chart.won')}
                      </p>
                    </div>
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-5">
                      <p className="text-sm text-gray-500 dark:text-gray-400">{t('result.withBonus')}</p>
                      <p className="text-xl font-bold text-blue-600 dark:text-blue-400 mt-1">
                        {formatNumber(withBonusResult.netAnnual)}{t('chart.won')}
                      </p>
                      <div className="flex items-center gap-1 text-xs mt-1">
                        <TrendingUp className="w-3 h-3 text-green-500" />
                        <span className="text-green-600 dark:text-green-400">
                          +{formatNumber(withBonusResult.netAnnual - salaryOnlyResult.netAnnual)}{t('chart.won')}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Deduction breakdown */}
                  <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
                    <button
                      onClick={() => setShowDetail(!showDetail)}
                      className="w-full flex items-center justify-between text-left"
                    >
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        {t('chart.deductionBreakdown')}
                      </h3>
                      {showDetail ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
                    </button>

                    {showDetail && (
                      <div className="mt-4 overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400">
                              <th className="text-left py-2 pr-4"></th>
                              <th className="text-right py-2 px-2">{t('result.salaryOnly')}</th>
                              <th className="text-right py-2 px-2">{t('result.withBonus')}</th>
                              <th className="text-right py-2 pl-2">{t('taxAnalysis.difference')}</th>
                            </tr>
                          </thead>
                          <tbody>
                            {([
                              ['nationalPension', 'result.nationalPension'],
                              ['healthInsurance', 'result.healthInsurance'],
                              ['longTermCare', 'result.longTermCare'],
                              ['employmentInsurance', 'result.employmentInsurance'],
                              ['incomeTax', 'result.incomeTax'],
                              ['localIncomeTax', 'result.localTax'],
                            ] as const).map(([key, label]) => (
                              <tr key={key} className="border-b border-gray-100 dark:border-gray-700/50">
                                <td className="py-2 pr-4 text-gray-700 dark:text-gray-300">{t(label)}</td>
                                <td className="py-2 px-2 text-right text-gray-600 dark:text-gray-400">
                                  {formatNumber(salaryOnlyResult.deductions[key])}
                                </td>
                                <td className="py-2 px-2 text-right text-gray-600 dark:text-gray-400">
                                  {formatNumber(withBonusResult.deductions[key])}
                                </td>
                                <td className="py-2 pl-2 text-right font-medium text-red-600 dark:text-red-400">
                                  +{formatNumber(bonusDeductions[key])}
                                </td>
                              </tr>
                            ))}
                            <tr className="font-bold">
                              <td className="py-2 pr-4 text-gray-900 dark:text-white">{t('result.totalDeduction')}</td>
                              <td className="py-2 px-2 text-right text-gray-900 dark:text-white">
                                {formatNumber(salaryOnlyResult.deductions.total)}
                              </td>
                              <td className="py-2 px-2 text-right text-gray-900 dark:text-white">
                                {formatNumber(withBonusResult.deductions.total)}
                              </td>
                              <td className="py-2 pl-2 text-right text-red-600 dark:text-red-400">
                                +{formatNumber(bonusDeductions.total)}
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Tab 1: Simulation */}
              {activeTab === 1 && simulationData.length > 0 && (
                <div className="space-y-6">
                  <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                      {t('simulation.title')}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">{t('simulation.description')}</p>

                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400">
                            <th className="text-left py-2">{t('simulation.ratio')}</th>
                            <th className="text-right py-2">{t('simulation.grossBonus')}</th>
                            <th className="text-right py-2">{t('simulation.tax')}</th>
                            <th className="text-right py-2">{t('simulation.netBonus')}</th>
                            <th className="text-right py-2">{t('simulation.netRate')}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {simulationData.map(row => (
                            <tr
                              key={row.ratio}
                              className={`border-b border-gray-100 dark:border-gray-700/50 ${
                                row.isCurrent
                                  ? 'bg-blue-50 dark:bg-blue-950/30 font-semibold'
                                  : ''
                              }`}
                            >
                              <td className="py-2 text-gray-700 dark:text-gray-300">
                                {row.ratio}%
                                {row.isCurrent && (
                                  <span className="ml-2 text-xs bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-full">
                                    {t('simulation.current')}
                                  </span>
                                )}
                              </td>
                              <td className="py-2 text-right text-gray-600 dark:text-gray-400">
                                {formatNumber(row.gross)}
                              </td>
                              <td className="py-2 text-right text-red-600 dark:text-red-400">
                                {formatNumber(row.deductions)}
                              </td>
                              <td className="py-2 text-right text-blue-600 dark:text-blue-400 font-medium">
                                {formatNumber(row.net)}
                              </td>
                              <td className="py-2 text-right text-gray-600 dark:text-gray-400">
                                {row.netRate.toFixed(1)}%
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Bar chart */}
                  <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
                    <ReactECharts option={simulationChartOption} style={{ height: 320 }} />
                  </div>
                </div>
              )}

              {/* Tab 2: Tax Analysis */}
              {activeTab === 2 && salaryOnlyResult && withBonusResult && bonusDeductions && (
                <div className="space-y-6">
                  <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                      {t('taxAnalysis.title')}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">{t('taxAnalysis.description')}</p>

                    {/* Bracket warning */}
                    {bracketChanged && (
                      <div className="flex items-start gap-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-4 mb-6">
                        <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                        <p className="text-sm text-amber-800 dark:text-amber-200">{t('taxAnalysis.bracketWarning')}</p>
                      </div>
                    )}

                    {/* Side by side */}
                    <div className="grid sm:grid-cols-2 gap-6">
                      {/* Without bonus */}
                      <div className="border border-gray-200 dark:border-gray-700 rounded-xl p-5 space-y-3">
                        <h4 className="font-semibold text-gray-900 dark:text-white">{t('taxAnalysis.withoutBonus')}</h4>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-500 dark:text-gray-400">{t('taxAnalysis.taxBracket')}</span>
                            <span className="text-gray-900 dark:text-white font-medium">
                              {t(`taxAnalysis.brackets.${salaryOnlyResult.bracketLabel}`)}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-500 dark:text-gray-400">{t('taxAnalysis.marginalRate')}</span>
                            <span className="text-gray-900 dark:text-white font-medium">
                              {(salaryOnlyResult.marginalRate * 100).toFixed(0)}%
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-500 dark:text-gray-400">{t('taxAnalysis.totalIncomeTax')}</span>
                            <span className="text-gray-900 dark:text-white font-medium">
                              {formatNumber(salaryOnlyResult.deductions.incomeTax + salaryOnlyResult.deductions.localIncomeTax)}{t('chart.won')}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-500 dark:text-gray-400">{t('result.effectiveRate')}</span>
                            <span className="text-gray-900 dark:text-white font-medium">
                              {salaryOnlyResult.effectiveTaxRate.toFixed(1)}%
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* With bonus */}
                      <div className="border-2 border-blue-300 dark:border-blue-700 rounded-xl p-5 space-y-3 bg-blue-50/50 dark:bg-blue-950/20">
                        <h4 className="font-semibold text-blue-700 dark:text-blue-300">{t('taxAnalysis.withBonus')}</h4>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-500 dark:text-gray-400">{t('taxAnalysis.taxBracket')}</span>
                            <span className={`font-medium ${bracketChanged ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-white'}`}>
                              {t(`taxAnalysis.brackets.${withBonusResult.bracketLabel}`)}
                              {bracketChanged && <TrendingUp className="w-3 h-3 inline ml-1" />}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-500 dark:text-gray-400">{t('taxAnalysis.marginalRate')}</span>
                            <span className={`font-medium ${bracketChanged ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-white'}`}>
                              {(withBonusResult.marginalRate * 100).toFixed(0)}%
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-500 dark:text-gray-400">{t('taxAnalysis.totalIncomeTax')}</span>
                            <span className="text-blue-700 dark:text-blue-300 font-medium">
                              {formatNumber(withBonusResult.deductions.incomeTax + withBonusResult.deductions.localIncomeTax)}{t('chart.won')}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-500 dark:text-gray-400">{t('result.effectiveRate')}</span>
                            <span className="text-blue-700 dark:text-blue-300 font-medium">
                              {withBonusResult.effectiveTaxRate.toFixed(1)}%
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Difference summary */}
                    <div className="mt-6 bg-gray-50 dark:bg-gray-700/50 rounded-xl p-5">
                      <h4 className="font-semibold text-gray-900 dark:text-white mb-3">{t('taxAnalysis.difference')}</h4>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
                        <div>
                          <p className="text-xs text-gray-500 dark:text-gray-400">{t('result.incomeTax')}</p>
                          <p className="text-lg font-bold text-red-600 dark:text-red-400">
                            +{formatNumber(bonusDeductions.incomeTax)}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 dark:text-gray-400">{t('result.localTax')}</p>
                          <p className="text-lg font-bold text-red-600 dark:text-red-400">
                            +{formatNumber(bonusDeductions.localIncomeTax)}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 dark:text-gray-400">{t('result.totalDeduction')}</p>
                          <p className="text-lg font-bold text-red-600 dark:text-red-400">
                            +{formatNumber(bonusDeductions.total)}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 dark:text-gray-400">{t('result.bonusNet')}</p>
                          <p className="text-lg font-bold text-green-600 dark:text-green-400">
                            {formatNumber(bonusDeductions.net)}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Pie chart */}
                  <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
                    <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-4">
                      {t('chart.deductionBreakdown')}
                    </h3>
                    <ReactECharts option={deductionPieOption} style={{ height: 300 }} />
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Guide */}
      <GuideSection namespace="bonusCalculator" />
    </div>
  )
}

export default function BonusCalculator() {
  return (
    <Suspense fallback={<div className="text-center py-12 text-gray-500">Loading...</div>}>
      <BonusCalculatorContent />
    </Suspense>
  )
}
