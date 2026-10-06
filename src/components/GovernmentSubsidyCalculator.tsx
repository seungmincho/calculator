'use client'

import { useState, useCallback, useEffect, useMemo } from 'react'
import { useTranslations } from '@/lib/i18n/subsidies'
import { useLanguage } from '@/contexts/LanguageContext'
import {
  Calculator, RotateCcw, ChevronDown, ChevronUp, Link, Check,
  Heart, Home, GraduationCap, Stethoscope, Baby, Landmark, Wallet,
  Shield, HandCoins, Accessibility, AlertTriangle, Banknote
} from 'lucide-react'
import GuideSectionContent from '@/components/GuideSectionContent'
import { glassCard, glassInset, glassInput } from '@/lib/glass'
import { calculatePrograms, getMedianIncome, PROGRAM_SOURCES, type SubsidyInput as UserInput, type HousingType, type HousingRegion, type EligibilityStatus, type ProgramResult } from '@/utils/welfarePolicy'

const DEFAULT_INPUT: UserInput = {
  householdSize: 4,
  incomeBasis: 'gross',
  region: 'unknown',
  monthlyIncome: 200,
  totalAssets: 5000,
  age: 35,
  housingType: 'monthly',
  monthlyRent: 40,
  deposit: 3000,
  hasMinorChildren: false,
  childrenCount: 0,
  isSingleParent: false,
  isDisabled: false,
  isOver65: false,
}

const sharedInputKeys = ['basis', 'region', 'size', 'income', 'assets', 'age', 'housing', 'rent', 'deposit', 'children', 'childCount', 'single', 'disabled', 'over65']

function inputFromUrl(params: URLSearchParams): { input: UserInput; invalidFields: string[] } {
  const input = { ...DEFAULT_INPUT }
  const invalidFields: string[] = []
  const numericFields = [
    ['size', 'householdSize'], ['income', 'monthlyIncome'], ['assets', 'totalAssets'],
    ['age', 'age'], ['rent', 'monthlyRent'], ['deposit', 'deposit'],
  ] as const
  for (const [param, field] of numericFields) {
    const raw = params.get(param)
    if (raw === null) continue
    const value = Number(raw)
    const wholeField = field === 'householdSize' || field === 'age'
    const valid = (wholeField ? /^\d+$/.test(raw) && Number.isSafeInteger(value) : /^\d+(?:\.\d{1,4})?$/.test(raw) && Number.isSafeInteger(Math.round(value * 10_000)))
      && (field !== 'householdSize' || (value >= 1 && value <= 6))
      && (field !== 'age' || value <= 120)
    if (valid) input[field] = value
    else invalidFields.push(param)
  }
  const basis = params.get('basis')
  if (basis !== null) {
    if (basis === 'gross' || basis === 'assessed') input.incomeBasis = basis
    else invalidFields.push('basis')
  }
  const region = params.get('region')
  if (region !== null) {
    if (['unknown', 'seoul', 'gyeonggi', 'metro', 'other'].includes(region)) input.region = region as HousingRegion
    else invalidFields.push('region')
  }
  const housing = params.get('housing')
  if (housing !== null) {
    if (['jeonse', 'monthly', 'own', 'other'].includes(housing)) input.housingType = housing as HousingType
    else invalidFields.push('housing')
  }
  if (params.get('children') === '1') {
    input.hasMinorChildren = true
    const count = params.get('childCount')
    if (count === null) input.childrenCount = 1
    else if (/^[1-9]\d*$/.test(count) && Number.isSafeInteger(Number(count))) input.childrenCount = Number(count)
    else invalidFields.push('childCount')
  }
  for (const key of ['children', 'single', 'disabled', 'over65']) {
    if (params.has(key) && !['', '1'].includes(params.get(key)!)) invalidFields.push(key)
  }
  if (params.get('single') === '1') input.isSingleParent = true
  if (params.get('disabled') === '1') input.isDisabled = true
  if (params.get('over65') === '1') input.isOver65 = true
  return { input, invalidFields }
}

// ── Number Formatting Helpers ──
function formatKoreanMoney(won: number, language: 'ko' | 'en'): string {
  if (language === 'ko') return new Intl.NumberFormat('ko-KR').format(won) + '원'
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'KRW', maximumFractionDigits: 0 }).format(won)
}

function formatNumber(num: number): string {
  return num.toLocaleString(undefined, { maximumFractionDigits: 4 })
}

function parseNumberInput(value: string): number {
  if (!/^(?:\d+|\d{1,3}(?:,\d{3})+)(?:\.\d{1,4})?$/.test(value)) return NaN
  const clean = value.replace(/,/g, '')
  const number = Number(clean)
  return Number.isSafeInteger(Math.round(number * 10_000)) ? number : NaN
}

// ── Program metadata ──
interface ProgramMeta {
  id: string
  icon: React.ReactNode
  color: string
}

const PROGRAM_META: ProgramMeta[] = [
  { id: 'livelihood', icon: <Heart className="w-5 h-5" />, color: 'text-red-500' },
  { id: 'medical', icon: <Stethoscope className="w-5 h-5" />, color: 'text-pink-500' },
  { id: 'housing', icon: <Home className="w-5 h-5" />, color: 'text-blue-500' },
  { id: 'education', icon: <GraduationCap className="w-5 h-5" />, color: 'text-yellow-600' },
  { id: 'childCredit', icon: <Baby className="w-5 h-5" />, color: 'text-purple-500' },
  { id: 'eitc', icon: <Wallet className="w-5 h-5" />, color: 'text-green-600' },
  { id: 'basicPension', icon: <Landmark className="w-5 h-5" />, color: 'text-indigo-500' },
  { id: 'youthRent', icon: <Home className="w-5 h-5" />, color: 'text-cyan-500' },
  { id: 'singleParent', icon: <HandCoins className="w-5 h-5" />, color: 'text-orange-500' },
  { id: 'youthSavings', icon: <Banknote className="w-5 h-5" />, color: 'text-emerald-500' },
  { id: 'emergency', icon: <AlertTriangle className="w-5 h-5" />, color: 'text-amber-500' },
  { id: 'disabilityPension', icon: <Accessibility className="w-5 h-5" />, color: 'text-teal-500' },
]

// ── Component ──
export default function GovernmentSubsidyCalculator() {
  const t = useTranslations('governmentSubsidy')
  const { language } = useLanguage()

  // ── State ──
  const [input, setInput] = useState<UserInput>(() => ({ ...DEFAULT_INPUT }))

  const [results, setResults] = useState<ProgramResult[] | null>(null)
  const [invalidSharedLink, setInvalidSharedLink] = useState(false)
  const [amountText, setAmountText] = useState<Partial<Record<'monthlyIncome' | 'totalAssets' | 'monthlyRent' | 'deposit', string>>>({})
  const [invalidAmounts, setInvalidAmounts] = useState<string[]>([])
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set())
  const [copiedLink, setCopiedLink] = useState(false)

  // ── URL sync ──
  const updateURL = useCallback((params: Record<string, string | number | boolean>) => {
    if (typeof window === 'undefined') return
    const url = new URL(window.location.href)
    Object.entries(params).forEach(([key, value]) => {
      if (value === false || value === '') {
        url.searchParams.delete(key)
      } else {
        url.searchParams.set(key, String(value))
      }
    })
    window.history.replaceState({}, '', url)
  }, [])

  // ── Calculate ──
  const handleCalculate = useCallback(() => {
    const fields: Array<'monthlyIncome' | 'totalAssets' | 'monthlyRent' | 'deposit'> = ['monthlyIncome', 'totalAssets']
    if (input.housingType === 'monthly') fields.push('monthlyRent', 'deposit')
    else if (input.housingType === 'jeonse') fields.push('deposit')
    const invalid = fields.filter(field => !Number.isSafeInteger(Math.round(input[field] * 10_000)) || input[field] < 0)
    setInvalidAmounts(invalid)
    if (invalid.length) {
      setResults(null)
      document.getElementById(`government-${invalid[0]}`)?.focus()
      return
    }
    const r = calculatePrograms(input)
    setResults(r)
    requestAnimationFrame(() => { if (window.matchMedia('(max-width: 1023px)').matches) document.getElementById('government-subsidy-result')?.scrollIntoView({ behavior: 'smooth', block: 'start' }) })
    setInvalidSharedLink(false)
    updateURL({
      basis: input.incomeBasis,
      region: input.region,
      size: input.householdSize,
      income: input.monthlyIncome,
      assets: input.totalAssets,
      age: input.age,
      housing: input.housingType,
      rent: input.monthlyRent,
      deposit: input.deposit,
      children: input.hasMinorChildren ? '1' : '',
      childCount: input.childrenCount,
      single: input.isSingleParent ? '1' : '',
      disabled: input.isDisabled ? '1' : '',
      over65: input.isOver65 ? '1' : '',
    })
  }, [input, updateURL])

  // Restore a shared calculation after hydration, using the current URL values.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (!params.has('size') && !params.has('income')) return
    const { input: restored, invalidFields } = inputFromUrl(params)
    const frame = requestAnimationFrame(() => {
      setInput(restored)
      setAmountText({})
      setInvalidAmounts([])
      setInvalidSharedLink(invalidFields.length > 0)
      setResults(invalidFields.length ? null : calculatePrograms(restored))
    })
    return () => cancelAnimationFrame(frame)
  }, [])

  // ── Reset ──
  const handleReset = useCallback(() => {
    setInput({ ...DEFAULT_INPUT })
    setAmountText({})
    setInvalidAmounts([])
    setResults(null)
    setInvalidSharedLink(false)
    setInvalidAmounts([])
    setExpandedCards(new Set())
    if (typeof window !== 'undefined') {
      window.history.replaceState({}, '', window.location.pathname)
    }
  }, [])

  // ── Copy link ──
  const handleCopyLink = useCallback(async () => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(window.location.href)
      } else {
        const textarea = document.createElement('textarea')
        textarea.value = window.location.href
        textarea.style.position = 'fixed'
        textarea.style.left = '-999999px'
        document.body.appendChild(textarea)
        textarea.select()
        document.execCommand('copy')
        document.body.removeChild(textarea)
      }
      setCopiedLink(true)
      setTimeout(() => setCopiedLink(false), 2000)
    } catch {
      setCopiedLink(true)
      setTimeout(() => setCopiedLink(false), 2000)
    }
  }, [])

  // ── Toggle card ──
  const toggleCard = useCallback((id: string) => {
    setExpandedCards(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  // ── Derived values ──
  const median = useMemo(() => getMedianIncome(input.householdSize), [input.householdSize])
  const incomeRatio = useMemo(() => (input.monthlyIncome * 10_000) / median, [input.monthlyIncome, median])

  const summary = useMemo(() => {
    if (!results) return null
    return { eligibleCount: results.filter(r => r.status === 'eligible').length,
      reviewCount: results.filter(r => r.status === 'borderline').length,
      excludedCount: results.filter(r => r.status === 'ineligible').length }
  }, [results])

  const sortedResults = useMemo(() => {
    if (!results) return []
    return [...results].sort((a, b) => {
      const order = { eligible: 0, borderline: 1, ineligible: 2 }
      return order[a.status] - order[b.status]
    })
  }, [results])

  // ── Input update helper ──
  const updateInput = useCallback(<K extends keyof UserInput>(key: K, value: UserInput[K]) => {
    setInput(prev => ({ ...prev, [key]: value }))
    setResults(null)
    setInvalidSharedLink(false)
    const url = new URL(window.location.href)
    for (const param of sharedInputKeys) url.searchParams.delete(param)
    window.history.replaceState({}, '', url)
  }, [])

  const updateAmount = useCallback((key: 'monthlyIncome' | 'totalAssets' | 'monthlyRent' | 'deposit', value: string) => {
    setAmountText(prev => ({ ...prev, [key]: value }))
    updateInput(key, parseNumberInput(value))
  }, [updateInput])

  // ── Status badge ──
  const StatusBadge = ({ status }: { status: EligibilityStatus }) => {
    if (status === 'eligible') {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
          {t('status.eligible')}
        </span>
      )
    }
    if (status === 'borderline') {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
          {t('status.borderline')}
        </span>
      )
    }
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400">
        {t('status.ineligible')}
      </span>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-fg">{t('title')}</h1>
        <p className="text-sm text-muted mt-1">{t('description')}</p>
        <p className="text-xs text-muted mt-2">{t('policyChecked')}</p>
      </div>

      <div className={`${glassCard} p-5 space-y-2`}>
        <h2 className="font-semibold text-fg">{t('screening.title')}</h2>
        <p className="text-sm text-body">{t('screening.description')}</p>
        <p className="text-sm text-muted">{t('screening.noTotal')}</p>
      </div>
      {/* Main Grid */}
      <div className="grid lg:grid-cols-3 gap-8">
        {/* Left: Input Panel */}
        <div className="lg:col-span-1">
          <div className={`${glassCard} ${glassInset} p-6 space-y-4 sticky top-24`}>
            <h2 className="text-lg font-semibold text-fg flex items-center gap-2">
              {t('input.title')}
            </h2>
            {invalidSharedLink && <p role="alert" className="text-sm text-red-600 dark:text-red-400">{t('input.invalidSharedLink')}</p>}
            {invalidAmounts.length > 0 && <p role="alert" className="text-sm text-red-600 dark:text-red-400">{t('input.invalidAmounts')}</p>}

            {/* 가구원수 */}
            <div>
              <label className="block text-sm font-medium text-body mb-1">
                {t('input.householdSize')}
              </label>
              <select
                value={input.householdSize}
                onChange={e => updateInput('householdSize', parseInt(e.target.value))}
                className={`w-full px-3 py-2 ${glassInput} focus:ring-2 focus:ring-blue-500`}
              >
                {[1, 2, 3, 4, 5, 6].map(n => (
                  <option key={n} value={n}>{t('input.persons', { count: n })}</option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="government-income-basis" className="block text-sm font-medium text-body mb-1">{t('input.incomeBasis')}</label>
              <select id="government-income-basis" value={input.incomeBasis} onChange={e => updateInput('incomeBasis', e.target.value as UserInput['incomeBasis'])} className={`w-full px-3 py-2 ${glassInput}`}>
                <option value="gross">{t('input.gross')}</option>
                <option value="assessed">{t('input.assessed')}</option>
              </select>
              <p className="text-xs text-muted mt-2">{t('input.incomeBasisHint')}</p>
            </div>
            {/* 월 가구소득 */}
            <div>
              <label htmlFor="government-monthlyIncome" className="block text-sm font-medium text-body mb-1">
                {t(input.incomeBasis === 'assessed' ? 'input.assessedMonthlyIncome' : 'input.monthlyIncome')}
              </label>
              <div className="relative">
                <input
                  type="text"
                  id="government-monthlyIncome"
                  inputMode="decimal"
                  aria-invalid={invalidAmounts.includes('monthlyIncome')}
                  value={amountText.monthlyIncome ?? formatNumber(input.monthlyIncome)}
                  onChange={e => updateAmount('monthlyIncome', e.target.value)}
                  className={`w-full px-3 py-2 pr-12 ${glassInput} focus:ring-2 focus:ring-blue-500`}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted">{t('input.manwon')}</span>
              </div>
            </div>

            {/* 총 재산 */}
            <div>
              <label htmlFor="government-totalAssets" className="block text-sm font-medium text-body mb-1">
                {t('input.totalAssets')}
              </label>
              <div className="relative">
                <input
                  type="text"
                  id="government-totalAssets"
                  inputMode="decimal"
                  aria-invalid={invalidAmounts.includes('totalAssets')}
                  value={amountText.totalAssets ?? formatNumber(input.totalAssets)}
                  onChange={e => updateAmount('totalAssets', e.target.value)}
                  className={`w-full px-3 py-2 pr-12 ${glassInput} focus:ring-2 focus:ring-blue-500`}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted">{t('input.manwon')}</span>
              </div>
            </div>

            {/* 나이 */}
            <div>
              <label className="block text-sm font-medium text-body mb-1">
                {t('input.age')}
              </label>
              <div className="relative">
                <input
                  type="number"
                  min={0}
                  max={120}
                  value={input.age}
                  onChange={e => updateInput('age', parseInt(e.target.value) || 0)}
                  className={`w-full px-3 py-2 pr-10 ${glassInput} focus:ring-2 focus:ring-blue-500`}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted">{t('input.years')}</span>
              </div>
            </div>

            <div>
              <label htmlFor="government-region" className="block text-sm font-medium text-body mb-1">{t('input.region')}</label>
              <select id="government-region" value={input.region} onChange={e => updateInput('region', e.target.value as HousingRegion)} className={`w-full px-3 py-2 ${glassInput}`}>
                {(['unknown', 'seoul', 'gyeonggi', 'metro', 'other'] as const).map(region => <option key={region} value={region}>{t(`input.regions.${region}`)}</option>)}
              </select>
            </div>
            {/* 주거 형태 */}
            <div>
              <label className="block text-sm font-medium text-body mb-1">
                {t('input.housingType')}
              </label>
              <div className="grid grid-cols-2 gap-2">
                {(['jeonse', 'monthly', 'own', 'other'] as HousingType[]).map(type => (
                  <button
                    key={type}
                    onClick={() => updateInput('housingType', type)}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      input.housingType === type
                        ? 'bg-blue-600 text-white'
                        : 'bg-soft text-body hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                  >
                    {t(`input.housing.${type}`)}
                  </button>
                ))}
              </div>
            </div>

            {/* 월세/보증금 (conditional) */}
            {input.housingType === 'monthly' && (
              <div className="space-y-3">
                <div>
                  <label htmlFor="government-monthlyRent" className="block text-sm font-medium text-body mb-1">
                    {t('input.monthlyRent')}
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      id="government-monthlyRent"
                      inputMode="decimal"
                      aria-invalid={invalidAmounts.includes('monthlyRent')}
                      value={amountText.monthlyRent ?? formatNumber(input.monthlyRent)}
                      onChange={e => updateAmount('monthlyRent', e.target.value)}
                      className={`w-full px-3 py-2 pr-12 ${glassInput} focus:ring-2 focus:ring-blue-500`}
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted">{t('input.manwon')}</span>
                  </div>
                </div>
                <div>
                  <label htmlFor="government-deposit" className="block text-sm font-medium text-body mb-1">
                    {t('input.deposit')}
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      id="government-deposit"
                      inputMode="decimal"
                      aria-invalid={invalidAmounts.includes('deposit')}
                      value={amountText.deposit ?? formatNumber(input.deposit)}
                      onChange={e => updateAmount('deposit', e.target.value)}
                      className={`w-full px-3 py-2 pr-12 ${glassInput} focus:ring-2 focus:ring-blue-500`}
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted">{t('input.manwon')}</span>
                  </div>
                </div>
              </div>
            )}

            {input.housingType === 'jeonse' && (
              <div>
                <label htmlFor="government-deposit" className="block text-sm font-medium text-body mb-1">
                  {t('input.deposit')}
                </label>
                <div className="relative">
                  <input
                    type="text"
                    id="government-deposit"
                    inputMode="decimal"
                    aria-invalid={invalidAmounts.includes('deposit')}
                    value={amountText.deposit ?? formatNumber(input.deposit)}
                    onChange={e => updateAmount('deposit', e.target.value)}
                    className={`w-full px-3 py-2 pr-12 ${glassInput} focus:ring-2 focus:ring-blue-500`}
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted">{t('input.manwon')}</span>
                </div>
              </div>
            )}

            {/* Toggle checkboxes */}
            <div className="space-y-3 pt-2 border-t border-line">
              <label className="block text-sm font-medium text-body">
                {t('input.specialConditions')}
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={input.hasMinorChildren}
                  onChange={e => {
                    updateInput('hasMinorChildren', e.target.checked)
                    if (!e.target.checked) updateInput('childrenCount', 0)
                    else if (input.childrenCount === 0) updateInput('childrenCount', 1)
                  }}
                  className="accent-blue-600 w-4 h-4"
                />
                <span className="text-sm text-body">{t('input.hasMinorChildren')}</span>
              </label>

              {input.hasMinorChildren && (
                <div className="ml-6">
                  <label className="block text-sm font-medium text-body mb-1">
                    {t('input.childrenCount')}
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={10}
                    value={input.childrenCount}
                    onChange={e => updateInput('childrenCount', parseInt(e.target.value) || 1)}
                    className={`w-20 px-3 py-2 ${glassInput} focus:ring-2 focus:ring-blue-500`}
                  />
                </div>
              )}

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={input.isSingleParent}
                  onChange={e => updateInput('isSingleParent', e.target.checked)}
                  className="accent-blue-600 w-4 h-4"
                />
                <span className="text-sm text-body">{t('input.isSingleParent')}</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={input.isDisabled}
                  onChange={e => updateInput('isDisabled', e.target.checked)}
                  className="accent-blue-600 w-4 h-4"
                />
                <span className="text-sm text-body">{t('input.isDisabled')}</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={input.isOver65}
                  onChange={e => updateInput('isOver65', e.target.checked)}
                  className="accent-blue-600 w-4 h-4"
                />
                <span className="text-sm text-body">{t('input.isOver65')}</span>
              </label>
            </div>

            {/* Buttons */}
            <div className="flex gap-3 pt-2">
              <button
                onClick={handleCalculate}
                className="flex-1 bg-primary hover:bg-blue-700 text-white rounded-lg px-4 py-3 font-medium transition-colors flex items-center justify-center gap-2"
              >
                <Calculator className="w-4 h-4" />
                {t('input.calculate')}
              </button>
              <button
                onClick={handleReset}
                className="bg-soft hover:bg-gray-200 dark:hover:bg-gray-600 text-body rounded-lg px-4 py-3 transition-colors"
                title={t('input.reset')}
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Right: Results Panel */}
        <div className="lg:col-span-2 space-y-6">
          {/* Summary Card */}
          {summary && (
            <div id="government-subsidy-result" className={`${glassCard} ${glassInset} p-6 scroll-mt-20`}>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-fg">
                  {t('result.summaryTitle')}
                </h2>
                <button
                  onClick={handleCopyLink}
                  className="flex items-center gap-1 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
                >
                  {copiedLink ? <Check className="w-4 h-4" /> : <Link className="w-4 h-4" />}
                  {copiedLink ? t('result.copied') : t('result.shareLink')}
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-subtle rounded-xl p-4 text-center">
                  <div className="text-sm text-green-600 dark:text-green-400 mb-1">{t('result.eligibleCount')}</div>
                  <div className="text-3xl font-bold text-sub">
                    {summary.eligibleCount}<span className="text-lg">{t('result.programs')}</span>
                  </div>
                </div>
                <div className="bg-subtle rounded-xl p-4 text-center">
                  <div className="text-sm text-blue-600 dark:text-blue-400 mb-1">{t('result.reviewCount')}</div>
                  <div className="text-2xl font-bold text-sub">
                    {summary.reviewCount}<span className="text-lg">{t('result.programs')}</span>
                  </div>
                </div>
                <div className="bg-subtle rounded-xl p-4 text-center">
                  <div className="text-sm text-indigo-600 dark:text-indigo-400 mb-1">{t('result.excludedCount')}</div>
                  <div className="text-2xl font-bold text-sub">
                    {summary.excludedCount}<span className="text-lg">{t('result.programs')}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Median Income Visualization */}
          {results && (
            <div className={`${glassCard} ${glassInset} p-6`}>
              <h3 className="text-sm font-medium text-body mb-3">
                {t('result.medianComparison')}
              </h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-sub">
                    {t('result.yourIncome')}: {formatNumber(input.monthlyIncome)}{t('input.manwon')}
                  </span>
                  <span className="font-medium text-fg">
                    {t('result.medianPercent', { percent: Math.round(incomeRatio * 100) })}
                  </span>
                </div>
                <div className="relative h-8 bg-track rounded-full overflow-hidden">
                  {/* Threshold markers */}
                  {[32, 40, 48, 50, 60, 100].map(pct => (
                    <div
                      key={pct}
                      className="absolute top-0 bottom-0 w-px bg-gray-400 dark:bg-gray-500"
                      style={{ left: `${Math.min(pct, 100)}%` }}
                    >
                      <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-[10px] text-muted whitespace-nowrap">
                        {pct}%
                      </span>
                    </div>
                  ))}
                  {/* Income bar */}
                  <div
                    className="h-full bg-primary rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(incomeRatio * 100, 100)}%` }}
                  />
                </div>
                <div className="flex justify-between text-[10px] text-faint">
                  <span>{t('result.thresholdLabels.livelihood')}</span>
                  <span>{t('result.thresholdLabels.medical')}</span>
                  <span>{t('result.thresholdLabels.housing')}</span>
                  <span>{t('result.thresholdLabels.education')}</span>
                  <span>{t('result.thresholdLabels.youth')}</span>
                  <span>{t('result.thresholdLabels.median')}</span>
                </div>
              </div>
            </div>
          )}

          {/* Program Cards */}
          {sortedResults.length > 0 && (
            <div className="space-y-3">
              {sortedResults.map(result => {
                const meta = PROGRAM_META.find(m => m.id === result.id)
                const isExpanded = expandedCards.has(result.id)

                return (
                  <div
                    key={result.id}
                    id={`government-program-${result.id}`}
                    className={`${glassCard} ${glassInset} overflow-hidden transition-all ${
                      result.status === 'eligible' ? 'ring-2 ring-green-200 dark:ring-green-800' : ''
                    }`}
                  >
                    <button
                      onClick={() => toggleCard(result.id)}
                      aria-expanded={isExpanded}
                      className="w-full px-6 py-4 flex items-center gap-4 text-left hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors"
                    >
                      <div className={`flex-shrink-0 ${meta?.color ?? 'text-gray-500'}`}>
                        {meta?.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-fg text-sm">
                            {t(`programDetails.${result.id}.name`)}
                          </span>
                          <StatusBadge status={result.status} />
                        </div>
                        <p className="text-xs text-muted mt-1">{t(`reasons.${result.reason}`)}</p>
                        {result.monthlyAmount !== null && (
                          <div className="text-sm text-green-600 dark:text-green-400 mt-0.5">
                            {t('result.estimatedMonthly')}: {formatKoreanMoney(result.monthlyAmount, language)}
                          </div>
                        )}
                      </div>
                      <div className="flex-shrink-0 text-gray-400">
                        {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                      </div>
                    </button>

                    {isExpanded && (
                      <div className="px-6 pb-4 border-t border-line pt-3 space-y-3">
                        {result.threshold !== undefined && <p className="text-sm font-medium text-fg">
                          {t('result.incomeThreshold')}: {formatKoreanMoney(result.threshold, language)}
                        </p>}
                        <p className="text-sm text-muted">{t(`programDetails.${result.id}.check`)}</p>
                        {/* Requirements */}
                        <div>
                          <h4 className="text-xs font-medium text-muted uppercase mb-1">
                            {t('result.requirements')}
                          </h4>
                          <p className="text-sm text-body">
                            {t(`programDetails.${result.id}.requirements`)}
                          </p>
                        </div>

                        {/* Benefit details */}
                        <div>
                          <h4 className="text-xs font-medium text-muted uppercase mb-1">
                            {t('result.benefitDetail')}
                          </h4>
                          <p className="text-sm text-body">
                            {t(`programDetails.${result.id}.benefit`)}
                          </p>
                        </div>

                        {/* Amount breakdown for eligible */}
                        {result.monthlyAmount !== null && (
                          <div className="bg-subtle rounded-lg p-3">
                            <div className="flex justify-between text-sm">
                              <span className="text-sub">{t('result.monthlyEstimate')}</span>
                              <span className="font-bold text-fg">{formatKoreanMoney(result.monthlyAmount, language)}</span>
                            </div>
                            <div className="flex justify-between text-sm mt-1">
                              <span className="text-sub">{t('result.yearlyEstimate')}</span>
                              <span className="font-bold text-fg">{formatKoreanMoney(result.yearlyAmount ?? 0, language)}</span>
                            </div>
                          </div>
                        )}

                        <a className="inline-block text-sm text-blue-600 dark:text-blue-400 underline" href={PROGRAM_SOURCES[result.id]} target="_blank" rel="noopener noreferrer">{t('officialSite')}</a>
                        {result.id === 'youthRent' && <a className="block text-sm text-blue-600 dark:text-blue-400 underline" href="/youth-rent-subsidy/">{t('result.youthCalculator')}</a>}
                        {/* How to apply */}
                        <div>
                          <h4 className="text-xs font-medium text-muted uppercase mb-1">
                            {t('result.howToApply')}
                          </h4>
                          <p className="text-sm text-body">
                            {t(`programDetails.${result.id}.apply`)}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {/* Empty state */}
          {!results && (
            <div className={`${glassCard} ${glassInset} p-12 text-center`}>
              <Shield className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-muted mb-2">
                {t('result.emptyTitle')}
              </h3>
              <p className="text-sm text-faint">
                {t('result.emptyDescription')}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Guide Section */}
      <GuideSectionContent translate={t} />
    </div>
  )
}
