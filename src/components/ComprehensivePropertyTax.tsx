'use client'

import { useState, useMemo, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { Calculator, Plus, Trash2, RotateCcw, ChevronDown, ChevronUp, Info, BookOpen } from 'lucide-react'

// ── Utilities ──

function formatWon(value: number): string {
  return Math.round(value).toLocaleString('ko-KR')
}

function formatEokMan(value: number): string {
  const abs = Math.abs(value)
  const rounded = Math.round(abs)
  if (rounded === 0) return '0'
  const eok = Math.floor(rounded / 100_000_000)
  const man = Math.floor((rounded % 100_000_000) / 10_000)
  const parts: string[] = []
  if (eok > 0) parts.push(`${eok.toLocaleString('ko-KR')}억`)
  if (man > 0) parts.push(`${man.toLocaleString('ko-KR')}만`)
  const remainder = rounded % 10_000
  if (remainder > 0 && eok === 0 && man === 0) parts.push(`${remainder.toLocaleString('ko-KR')}`)
  if (parts.length === 0) return '0'
  return (value < 0 ? '-' : '') + parts.join(' ')
}

function parseNumber(str: string): number {
  return Number(str.replace(/,/g, '')) || 0
}

function formatInput(str: string): string {
  const num = str.replace(/[^\d]/g, '')
  if (!num) return ''
  return Number(num).toLocaleString('ko-KR')
}

// ── Types ──

type TaxpayerType = 'single' | 'general' | 'threeplus' | 'corp'
type ElderlyType = 'none' | '60-65' | '65-70' | '70+'
type HoldingPeriod = 'none' | '5-10' | '10-15' | '15+'

interface Property {
  id: number
  price: string
}

interface TaxResult {
  totalAssessed: number
  fairMarketValue: number
  deduction: number
  taxBase: number
  grossTax: number
  elderlyCreditRate: number
  holdingCreditRate: number
  combinedCreditRate: number
  creditAmount: number
  taxAfterCredits: number
  ceilingApplied: boolean
  ceilingRate: number
  taxAfterCeiling: number
  farmlandTax: number
  totalPayable: number
  effectiveRate: number
  appliedBracketIndex: number
}

// ── Tax brackets ──

interface TaxBracket {
  limit: number   // bracket width (not cumulative), Infinity for last
  rate: number
  label: string
}

const GENERAL_BRACKETS: TaxBracket[] = [
  { limit: 300_000_000, rate: 0.005, label: '~3억' },
  { limit: 300_000_000, rate: 0.007, label: '3~6억' },
  { limit: 600_000_000, rate: 0.010, label: '6~12억' },
  { limit: 1_300_000_000, rate: 0.013, label: '12~25억' },
  { limit: 2_500_000_000, rate: 0.015, label: '25~50억' },
  { limit: 4_400_000_000, rate: 0.020, label: '50~94억' },
  { limit: Infinity, rate: 0.027, label: '94억 초과' },
]

const THREEPLUS_BRACKETS: TaxBracket[] = [
  { limit: 300_000_000, rate: 0.012, label: '~3억' },
  { limit: 300_000_000, rate: 0.016, label: '3~6억' },
  { limit: 600_000_000, rate: 0.022, label: '6~12억' },
  { limit: 1_300_000_000, rate: 0.036, label: '12~25억' },
  { limit: 2_500_000_000, rate: 0.050, label: '25~50억' },
  { limit: 4_400_000_000, rate: 0.050, label: '50~94억' },
  { limit: Infinity, rate: 0.060, label: '94억 초과' },
]

function calculateProgressiveTax(taxBase: number, brackets: TaxBracket[]): { tax: number; bracketIndex: number } {
  let tax = 0
  let remaining = taxBase
  let bracketIndex = 0
  for (let i = 0; i < brackets.length; i++) {
    if (remaining <= 0) break
    const taxable = Math.min(remaining, brackets[i].limit)
    tax += taxable * brackets[i].rate
    remaining -= taxable
    bracketIndex = i
  }
  return { tax, bracketIndex }
}

function getElderlyRate(type: ElderlyType): number {
  switch (type) {
    case '60-65': return 0.10
    case '65-70': return 0.20
    case '70+': return 0.30
    default: return 0
  }
}

function getHoldingRate(period: HoldingPeriod): number {
  switch (period) {
    case '5-10': return 0.20
    case '10-15': return 0.40
    case '15+': return 0.50
    default: return 0
  }
}

// ── Main Component ──

export default function ComprehensivePropertyTax() {
  const t = useTranslations('comprehensivePropertyTax')

  // State
  const [taxpayerType, setTaxpayerType] = useState<TaxpayerType>('general')
  const [properties, setProperties] = useState<Property[]>([{ id: 1, price: '' }])
  const [elderlyType, setElderlyType] = useState<ElderlyType>('none')
  const [holdingPeriod, setHoldingPeriod] = useState<HoldingPeriod>('none')
  const [prevYearTax, setPrevYearTax] = useState('')
  const [nextId, setNextId] = useState(2)
  const [showRateTable, setShowRateTable] = useState(false)
  const [showSteps, setShowSteps] = useState(true)

  // Handlers
  const addProperty = useCallback(() => {
    if (properties.length >= 10) return
    setProperties(prev => [...prev, { id: nextId, price: '' }])
    setNextId(prev => prev + 1)
  }, [properties.length, nextId])

  const removeProperty = useCallback((id: number) => {
    setProperties(prev => prev.length > 1 ? prev.filter(p => p.id !== id) : prev)
  }, [])

  const updatePropertyPrice = useCallback((id: number, value: string) => {
    setProperties(prev => prev.map(p => p.id === id ? { ...p, price: formatInput(value) } : p))
  }, [])

  const handleReset = useCallback(() => {
    setTaxpayerType('general')
    setProperties([{ id: 1, price: '' }])
    setElderlyType('none')
    setHoldingPeriod('none')
    setPrevYearTax('')
    setNextId(2)
  }, [])

  // Calculation
  const totalAssessed = useMemo(() => {
    return properties.reduce((sum, p) => sum + parseNumber(p.price), 0)
  }, [properties])

  const result = useMemo((): TaxResult | null => {
    if (totalAssessed <= 0) return null

    // Step 1: Total assessed
    const fairMarketValue = totalAssessed * 0.60

    // Step 3: Deduction
    let deduction: number
    if (taxpayerType === 'corp') {
      deduction = 0
    } else if (taxpayerType === 'single') {
      deduction = 1_200_000_000
    } else {
      deduction = 900_000_000
    }

    const taxBase = Math.max(0, fairMarketValue - deduction)

    if (taxBase <= 0) {
      return {
        totalAssessed, fairMarketValue, deduction, taxBase: 0,
        grossTax: 0, elderlyCreditRate: 0, holdingCreditRate: 0,
        combinedCreditRate: 0, creditAmount: 0, taxAfterCredits: 0,
        ceilingApplied: false, ceilingRate: 0, taxAfterCeiling: 0,
        farmlandTax: 0, totalPayable: 0, effectiveRate: 0, appliedBracketIndex: -1,
      }
    }

    // Step 4: Tax rate
    let grossTax: number
    let appliedBracketIndex: number
    if (taxpayerType === 'corp') {
      grossTax = taxBase * 0.05
      appliedBracketIndex = -1
    } else if (taxpayerType === 'threeplus') {
      const r = calculateProgressiveTax(taxBase, THREEPLUS_BRACKETS)
      grossTax = r.tax
      appliedBracketIndex = r.bracketIndex
    } else {
      const r = calculateProgressiveTax(taxBase, GENERAL_BRACKETS)
      grossTax = r.tax
      appliedBracketIndex = r.bracketIndex
    }

    // Step 5: Credits (single only)
    const elderlyCreditRate = taxpayerType === 'single' ? getElderlyRate(elderlyType) : 0
    const holdingCreditRate = taxpayerType === 'single' ? getHoldingRate(holdingPeriod) : 0
    const combinedCreditRate = Math.min(elderlyCreditRate + holdingCreditRate, 0.80)
    const creditAmount = grossTax * combinedCreditRate
    const taxAfterCredits = grossTax - creditAmount

    // Step 6: Ceiling
    const prevTaxVal = parseNumber(prevYearTax)
    let ceilingApplied = false
    let ceilingRate = 0
    let taxAfterCeiling = taxAfterCredits

    if (prevTaxVal > 0) {
      ceilingRate = (taxpayerType === 'threeplus' || taxpayerType === 'corp') ? 3.0 : 1.5
      const ceiling = prevTaxVal * ceilingRate
      if (taxAfterCredits > ceiling) {
        taxAfterCeiling = ceiling
        ceilingApplied = true
      }
    }

    // Step 7: Farmland tax
    const farmlandTax = taxAfterCeiling * 0.20

    // Step 8: Total
    const totalPayable = taxAfterCeiling + farmlandTax
    const effectiveRate = totalAssessed > 0 ? (totalPayable / totalAssessed) * 100 : 0

    return {
      totalAssessed, fairMarketValue, deduction, taxBase,
      grossTax, elderlyCreditRate, holdingCreditRate,
      combinedCreditRate, creditAmount, taxAfterCredits,
      ceilingApplied, ceilingRate, taxAfterCeiling,
      farmlandTax, totalPayable, effectiveRate, appliedBracketIndex,
    }
  }, [totalAssessed, taxpayerType, elderlyType, holdingPeriod, prevYearTax])

  const activeBrackets = taxpayerType === 'threeplus' ? THREEPLUS_BRACKETS : GENERAL_BRACKETS
  const isSingle = taxpayerType === 'single'

  const taxpayerOptions: { value: TaxpayerType; labelKey: string }[] = [
    { value: 'single', labelKey: 'single' },
    { value: 'general', labelKey: 'general' },
    { value: 'threeplus', labelKey: 'threeplus' },
    { value: 'corp', labelKey: 'corp' },
  ]

  const elderlyOptions: { value: ElderlyType; labelKey: string }[] = [
    { value: 'none', labelKey: 'none' },
    { value: '60-65', labelKey: '60to65' },
    { value: '65-70', labelKey: '65to70' },
    { value: '70+', labelKey: 'over70' },
  ]

  const holdingOptions: { value: HoldingPeriod; labelKey: string }[] = [
    { value: 'none', labelKey: 'none' },
    { value: '5-10', labelKey: '5to10' },
    { value: '10-15', labelKey: '10to15' },
    { value: '15+', labelKey: 'over15' },
  ]

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

      {/* Main Grid */}
      <div className="grid lg:grid-cols-3 gap-8">
        {/* ── Left: Input Panel ── */}
        <div className="lg:col-span-1 space-y-4">
          {/* Taxpayer Type */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 space-y-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              {t('taxpayerType.label')}
            </h2>
            <div className="grid grid-cols-2 gap-2">
              {taxpayerOptions.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setTaxpayerType(opt.value)}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    taxpayerType === opt.value
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  {t(`taxpayerType.${opt.labelKey}`)}
                </button>
              ))}
            </div>

            {/* Elderly & Holding (single only) */}
            {isSingle && (
              <div className="space-y-3 pt-2 border-t border-gray-200 dark:border-gray-700">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t('elderly.label')}
                  </label>
                  <select
                    value={elderlyType}
                    onChange={e => setElderlyType(e.target.value as ElderlyType)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                  >
                    {elderlyOptions.map(opt => (
                      <option key={opt.value} value={opt.value}>
                        {t(`elderly.${opt.labelKey}`)}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t('holdingPeriod.label')}
                  </label>
                  <select
                    value={holdingPeriod}
                    onChange={e => setHoldingPeriod(e.target.value as HoldingPeriod)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                  >
                    {holdingOptions.map(opt => (
                      <option key={opt.value} value={opt.value}>
                        {t(`holdingPeriod.${opt.labelKey}`)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}
          </div>

          {/* Property List */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 space-y-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              {t('property.label')}
            </h2>
            <div className="space-y-3">
              {properties.map((prop, idx) => (
                <div key={prop.id} className="flex items-center gap-2">
                  <span className="text-sm text-gray-500 dark:text-gray-400 w-8 shrink-0">
                    {idx + 1}.
                  </span>
                  <div className="relative flex-1">
                    <input
                      type="text"
                      inputMode="numeric"
                      value={prop.price}
                      onChange={e => updatePropertyPrice(prop.id, e.target.value)}
                      placeholder={t('property.pricePlaceholder')}
                      className="w-full px-3 py-2 pr-8 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 text-right"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">
                      {t('units.won')}
                    </span>
                  </div>
                  {properties.length > 1 && (
                    <button
                      onClick={() => removeProperty(prop.id)}
                      className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-950 rounded-lg transition-colors"
                      aria-label={t('property.remove')}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>

            {properties.length < 10 && (
              <button
                onClick={addProperty}
                className="w-full flex items-center justify-center gap-1 py-2 text-sm text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900 transition-colors"
              >
                <Plus className="w-4 h-4" />
                {t('property.add')}
              </button>
            )}

            {/* Total assessed */}
            <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {t('property.total')}
                </span>
                <span className="text-lg font-bold text-blue-600 dark:text-blue-400">
                  {totalAssessed > 0 ? `${formatEokMan(totalAssessed)}원` : '-'}
                </span>
              </div>
            </div>
          </div>

          {/* Previous Year Tax */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 space-y-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              {t('prevYearTax.label')}
            </label>
            <div className="relative">
              <input
                type="text"
                inputMode="numeric"
                value={prevYearTax}
                onChange={e => setPrevYearTax(formatInput(e.target.value))}
                placeholder={t('prevYearTax.placeholder')}
                className="w-full px-3 py-2 pr-8 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 text-right"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">
                {t('units.won')}
              </span>
            </div>
            <p className="text-xs text-gray-400 dark:text-gray-500 flex items-start gap-1">
              <Info className="w-3 h-3 mt-0.5 shrink-0" />
              {t('prevYearTax.helpText')}
            </p>
          </div>

          {/* Reset */}
          <button
            onClick={handleReset}
            className="w-full flex items-center justify-center gap-2 py-3 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            {t('reset')}
          </button>
        </div>

        {/* ── Right: Results Panel ── */}
        <div className="lg:col-span-2 space-y-6">
          {/* Not subject message */}
          {result && result.taxBase <= 0 && (
            <div className="bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-xl p-6 text-center">
              <p className="text-lg font-semibold text-green-700 dark:text-green-300">
                {t('result.notSubject')}
              </p>
              <p className="text-sm text-green-600 dark:text-green-400 mt-2">
                {t('result.notSubjectDetail', {
                  total: formatEokMan(result.totalAssessed),
                  fairMarket: formatEokMan(result.fairMarketValue),
                  deduction: formatEokMan(result.deduction),
                })}
              </p>
            </div>
          )}

          {/* No input placeholder */}
          {!result && (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-12 text-center">
              <Calculator className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400 dark:text-gray-500">{t('result.placeholder')}</p>
            </div>
          )}

          {/* Summary Card */}
          {result && result.taxBase > 0 && (
            <>
              <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl shadow-lg p-6 text-white">
                <h2 className="text-lg font-semibold mb-4">{t('result.title')}</h2>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-blue-200 text-sm">{t('result.baseTax')}</p>
                    <p className="text-xl font-bold">{formatEokMan(result.taxAfterCeiling)}원</p>
                  </div>
                  <div>
                    <p className="text-blue-200 text-sm">{t('result.farmlandTax')}</p>
                    <p className="text-xl font-bold">{formatEokMan(result.farmlandTax)}원</p>
                  </div>
                  <div className="col-span-2 pt-3 border-t border-blue-400">
                    <p className="text-blue-200 text-sm">{t('result.totalTax')}</p>
                    <p className="text-3xl font-bold">{formatEokMan(result.totalPayable)}원</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-blue-200 text-sm">{t('result.effectiveRate')}</p>
                    <p className="text-lg font-semibold">{result.effectiveRate.toFixed(3)}%</p>
                  </div>
                </div>
              </div>

              {/* Step-by-step Breakdown */}
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden">
                <button
                  onClick={() => setShowSteps(!showSteps)}
                  className="w-full flex items-center justify-between p-6 text-left"
                >
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                    {t('steps.title')}
                  </h2>
                  {showSteps ? <ChevronUp className="w-5 h-5 text-gray-500" /> : <ChevronDown className="w-5 h-5 text-gray-500" />}
                </button>

                {showSteps && (
                  <div className="px-6 pb-6 space-y-4">
                    {/* Step 1 */}
                    <StepItem
                      num={1}
                      label={t('steps.step1.label')}
                      value={`${formatWon(result.totalAssessed)}원`}
                      desc={t('steps.step1.desc', { count: properties.filter(p => parseNumber(p.price) > 0).length.toString() })}
                    />

                    {/* Step 2 */}
                    <StepItem
                      num={2}
                      label={t('steps.step2.label')}
                      value={`${formatWon(result.fairMarketValue)}원`}
                      desc={t('steps.step2.desc')}
                    />

                    {/* Step 3 */}
                    <StepItem
                      num={3}
                      label={t('steps.step3.label')}
                      value={`${formatWon(result.taxBase)}원`}
                      desc={t('steps.step3.desc', { deduction: formatEokMan(result.deduction) })}
                    />

                    {/* Step 4 */}
                    <StepItem
                      num={4}
                      label={t('steps.step4.label')}
                      value={`${formatWon(result.grossTax)}원`}
                      desc={
                        taxpayerType === 'corp'
                          ? t('steps.step4.corpDesc')
                          : t('steps.step4.desc', { type: t(`taxpayerType.${taxpayerType === 'threeplus' ? 'threeplus' : taxpayerType}`) })
                      }
                    />

                    {/* Step 5 - Credits */}
                    {isSingle && result.combinedCreditRate > 0 && (
                      <StepItem
                        num={5}
                        label={t('steps.step5.label')}
                        value={`-${formatWon(result.creditAmount)}원`}
                        desc={t('steps.step5.desc', {
                          elderly: `${(result.elderlyCreditRate * 100).toFixed(0)}%`,
                          holding: `${(result.holdingCreditRate * 100).toFixed(0)}%`,
                          combined: `${(result.combinedCreditRate * 100).toFixed(0)}%`,
                        })}
                        badge={t('steps.step5.badge')}
                        badgeColor="green"
                      />
                    )}

                    {/* Step 6 - Ceiling */}
                    {parseNumber(prevYearTax) > 0 && (
                      <StepItem
                        num={6}
                        label={t('steps.step6.label')}
                        value={
                          result.ceilingApplied
                            ? `${formatWon(result.taxAfterCeiling)}원`
                            : t('steps.step6.notApplied')
                        }
                        desc={
                          result.ceilingApplied
                            ? t('steps.step6.appliedDesc', { rate: `${(result.ceilingRate * 100).toFixed(0)}%` })
                            : t('steps.step6.notAppliedDesc')
                        }
                        badge={result.ceilingApplied ? t('steps.step6.appliedBadge') : undefined}
                        badgeColor="orange"
                      />
                    )}

                    {/* Step 7 */}
                    <StepItem
                      num={7}
                      label={t('steps.step7.label')}
                      value={`${formatWon(result.farmlandTax)}원`}
                      desc={t('steps.step7.desc')}
                    />

                    {/* Step 8 */}
                    <StepItem
                      num={8}
                      label={t('steps.step8.label')}
                      value={`${formatWon(result.totalPayable)}원`}
                      desc={t('steps.step8.desc')}
                      highlight
                    />
                  </div>
                )}
              </div>

              {/* Tax Rate Table */}
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden">
                <button
                  onClick={() => setShowRateTable(!showRateTable)}
                  className="w-full flex items-center justify-between p-6 text-left"
                >
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                    {t('rateTable.title')}
                  </h2>
                  {showRateTable ? <ChevronUp className="w-5 h-5 text-gray-500" /> : <ChevronDown className="w-5 h-5 text-gray-500" />}
                </button>

                {showRateTable && (
                  <div className="px-6 pb-6">
                    {taxpayerType === 'corp' ? (
                      <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 text-center">
                        <p className="text-gray-700 dark:text-gray-300">{t('rateTable.corpFlat')}</p>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b border-gray-200 dark:border-gray-700">
                              <th className="text-left py-2 px-3 text-gray-500 dark:text-gray-400 font-medium">
                                {t('rateTable.taxBase')}
                              </th>
                              <th className="text-right py-2 px-3 text-gray-500 dark:text-gray-400 font-medium">
                                {t('rateTable.rate')}
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {activeBrackets.map((bracket, idx) => (
                              <tr
                                key={idx}
                                className={`border-b border-gray-100 dark:border-gray-700 ${
                                  idx === result.appliedBracketIndex
                                    ? 'bg-blue-50 dark:bg-blue-950 font-semibold'
                                    : ''
                                }`}
                              >
                                <td className="py-2 px-3 text-gray-700 dark:text-gray-300">
                                  {bracket.label}
                                  {idx === result.appliedBracketIndex && (
                                    <span className="ml-2 text-xs bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-full">
                                      {t('rateTable.current')}
                                    </span>
                                  )}
                                </td>
                                <td className="py-2 px-3 text-right text-gray-700 dark:text-gray-300">
                                  {(bracket.rate * 100).toFixed(1)}%
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Guide Section */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-blue-600" />
          {t('guide.title')}
        </h2>
        <div className="grid md:grid-cols-2 gap-6">
          {(['overview', 'rates', 'credits', 'tips'] as const).map(section => (
            <div key={section} className="space-y-2">
              <h3 className="font-semibold text-gray-800 dark:text-gray-200">
                {t(`guide.${section}.title`)}
              </h3>
              <ul className="space-y-1">
                {(t.raw(`guide.${section}.items`) as string[]).map((item, i) => (
                  <li key={i} className="text-sm text-gray-600 dark:text-gray-400 flex items-start gap-2">
                    <span className="text-blue-500 mt-0.5">&#8226;</span>
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

// ── Step Item Component ──

function StepItem({
  num, label, value, desc, badge, badgeColor, highlight,
}: {
  num: number
  label: string
  value: string
  desc: string
  badge?: string
  badgeColor?: 'green' | 'orange'
  highlight?: boolean
}) {
  return (
    <div className={`flex items-start gap-3 p-3 rounded-lg ${
      highlight ? 'bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800' : 'bg-gray-50 dark:bg-gray-700'
    }`}>
      <span className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold ${
        highlight ? 'bg-blue-600 text-white' : 'bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-300'
      }`}>
        {num}
      </span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium text-gray-800 dark:text-gray-200">{label}</span>
          {badge && (
            <span className={`text-xs px-2 py-0.5 rounded-full ${
              badgeColor === 'green'
                ? 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300'
                : 'bg-orange-100 dark:bg-orange-900 text-orange-700 dark:text-orange-300'
            }`}>
              {badge}
            </span>
          )}
        </div>
        <p className={`text-sm mt-0.5 ${highlight ? 'text-blue-700 dark:text-blue-300 font-bold' : 'text-gray-900 dark:text-white font-semibold'}`}>
          {value}
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{desc}</p>
      </div>
    </div>
  )
}
