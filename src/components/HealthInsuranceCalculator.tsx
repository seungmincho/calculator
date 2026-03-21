'use client'

import { useState, useCallback, useMemo, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Copy, Check, BookOpen, Building2, Home, Users, BarChart3, ChevronDown, ChevronUp, AlertTriangle, CheckCircle2, XCircle, Info, Link } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

// ── Constants: 2025 rates ──
const HEALTH_RATE = 0.0709
const HEALTH_RATE_HALF = 0.03545
const LONG_TERM_CARE_RATE = 0.1295
const PENSION_RATE = 0.09
const PENSION_RATE_HALF = 0.045
const PENSION_CAP_MONTHLY = 6_170_000
const EMPLOYMENT_RATE_EMPLOYEE = 0.009
const POINT_VALUE = 208.4
const REGIONAL_MIN_PREMIUM = 19_780
const INCOME_THRESHOLD_MONTHLY = 280_000

// ── Property score table (simplified from 별표4) ──
const PROPERTY_SCORE_TABLE: { min: number; max: number; score: number }[] = [
  { min: 0, max: 4_500_000, score: 22 },
  { min: 4_500_001, max: 9_000_000, score: 44 },
  { min: 9_000_001, max: 13_500_000, score: 66 },
  { min: 13_500_001, max: 18_000_000, score: 88 },
  { min: 18_000_001, max: 22_500_000, score: 110 },
  { min: 22_500_001, max: 27_000_000, score: 132 },
  { min: 27_000_001, max: 31_500_000, score: 154 },
  { min: 31_500_001, max: 36_000_000, score: 176 },
  { min: 36_000_001, max: 40_500_000, score: 198 },
  { min: 40_500_001, max: 45_000_000, score: 220 },
  { min: 45_000_001, max: 50_000_000, score: 242 },
  { min: 50_000_001, max: 55_000_000, score: 264 },
  { min: 55_000_001, max: 60_000_000, score: 286 },
  { min: 60_000_001, max: 65_000_000, score: 308 },
  { min: 65_000_001, max: 70_000_000, score: 330 },
  { min: 70_000_001, max: 80_000_000, score: 363 },
  { min: 80_000_001, max: 90_000_000, score: 396 },
  { min: 90_000_001, max: 100_000_000, score: 429 },
  { min: 100_000_001, max: 120_000_000, score: 473 },
  { min: 120_000_001, max: 140_000_000, score: 517 },
  { min: 140_000_001, max: 160_000_000, score: 561 },
  { min: 160_000_001, max: 180_000_000, score: 605 },
  { min: 180_000_001, max: 200_000_000, score: 649 },
  { min: 200_000_001, max: 250_000_000, score: 715 },
  { min: 250_000_001, max: 300_000_000, score: 781 },
  { min: 300_000_001, max: 400_000_000, score: 869 },
  { min: 400_000_001, max: 500_000_000, score: 957 },
  { min: 500_000_001, max: 700_000_000, score: 1067 },
  { min: 700_000_001, max: 900_000_000, score: 1133 },
  { min: 900_000_001, max: 1_200_000_000, score: 1199 },
  { min: 1_200_000_001, max: 1_500_000_000, score: 1257 },
  { min: 1_500_000_001, max: Infinity, score: 1315 },
]

function getPropertyScore(amount: number): number {
  if (amount <= 0) return 0
  for (const bracket of PROPERTY_SCORE_TABLE) {
    if (amount >= bracket.min && amount <= bracket.max) {
      return bracket.score
    }
  }
  return PROPERTY_SCORE_TABLE[PROPERTY_SCORE_TABLE.length - 1].score
}

function formatNumber(n: number): string {
  return Math.round(n).toLocaleString('ko-KR')
}

function parseCommaNumber(s: string): number {
  return parseInt(s.replace(/,/g, ''), 10) || 0
}

function formatInputValue(value: string): string {
  const num = value.replace(/[^\d]/g, '')
  if (!num) return ''
  return parseInt(num, 10).toLocaleString('ko-KR')
}

// ── Calculation functions ──

interface WorkplaceResult {
  remuneration: number
  healthInsurance: number
  healthEmployee: number
  healthEmployer: number
  longTermCare: number
  longTermEmployee: number
  longTermEmployer: number
  nationalPension: number
  pensionEmployee: number
  pensionEmployer: number
  employmentInsurance: number
  totalEmployee: number
  totalEmployer: number
  totalAll: number
  netSalary: number
}

function calcWorkplace(monthlySalary: number, nonTaxable: number): WorkplaceResult {
  // 4대보험은 전체 보수월액 기준, 비과세는 소득세 계산에만 적용
  // 단, 실비변상적 급여(출장비 등 법정 비과세)는 보수월액에서 제외 가능
  const remuneration = Math.max(0, monthlySalary - nonTaxable)

  const healthInsurance = Math.floor(remuneration * HEALTH_RATE)
  const healthEmployee = Math.floor(remuneration * HEALTH_RATE_HALF)
  const healthEmployer = Math.floor(remuneration * HEALTH_RATE_HALF)

  const longTermCare = Math.floor(healthInsurance * LONG_TERM_CARE_RATE)
  const longTermEmployee = Math.floor(longTermCare / 2)
  const longTermEmployer = Math.floor(longTermCare / 2)

  const pensionBase = Math.min(remuneration, PENSION_CAP_MONTHLY)
  const nationalPension = Math.floor(pensionBase * PENSION_RATE)
  const pensionEmployee = Math.floor(pensionBase * PENSION_RATE_HALF)
  const pensionEmployer = Math.floor(pensionBase * PENSION_RATE_HALF)

  const employmentInsurance = Math.floor(remuneration * EMPLOYMENT_RATE_EMPLOYEE)

  const totalEmployee = healthEmployee + longTermEmployee + pensionEmployee + employmentInsurance
  // 사업주 고용보험: 0.9%(실업급여) + 0.25~0.85%(고용안정·직능개발, 150인 미만 기준 0.25%)
  const employerEmploymentRate = 0.009 + 0.0025 // 150인 미만 기준
  const totalEmployer = healthEmployer + longTermEmployer + pensionEmployer + Math.floor(remuneration * employerEmploymentRate)
  const totalAll = totalEmployee + totalEmployer

  return {
    remuneration,
    healthInsurance,
    healthEmployee,
    healthEmployer,
    longTermCare,
    longTermEmployee,
    longTermEmployer,
    nationalPension,
    pensionEmployee,
    pensionEmployer,
    employmentInsurance,
    totalEmployee,
    totalEmployer,
    totalAll,
    netSalary: monthlySalary - totalEmployee,
  }
}

interface RegionalResult {
  totalAnnualIncome: number
  monthlyIncome: number
  incomePremium: number
  propertyAmount: number
  propertyScore: number
  propertyPremium: number
  healthPremium: number
  longTermCare: number
  totalPremium: number
}

function calcRegional(
  businessIncome: number,
  employmentIncome: number,
  financialIncome: number,
  otherIncome: number,
  pensionIncome: number,
  propertyTaxBase: number,
  deposit: number,
): RegionalResult {
  const totalAnnualIncome = businessIncome + employmentIncome + financialIncome + otherIncome + pensionIncome
  const monthlyIncome = Math.floor(totalAnnualIncome / 12)

  const calculatedIncomePremium = Math.floor(monthlyIncome * HEALTH_RATE)
  const incomePremium = Math.max(calculatedIncomePremium, REGIONAL_MIN_PREMIUM)

  const depositEvaluation = Math.floor(deposit * 0.30)
  const propertyAmount = Math.max(0, propertyTaxBase + depositEvaluation - 100_000_000)

  const propertyScore = getPropertyScore(propertyAmount)
  const propertyPremium = Math.floor(propertyScore * POINT_VALUE)

  let healthPremium = incomePremium + propertyPremium
  healthPremium = Math.max(healthPremium, REGIONAL_MIN_PREMIUM)

  const longTermCare = Math.floor(healthPremium * LONG_TERM_CARE_RATE)
  const totalPremium = healthPremium + longTermCare

  return {
    totalAnnualIncome,
    monthlyIncome,
    incomePremium,
    propertyAmount,
    propertyScore,
    propertyPremium,
    healthPremium,
    longTermCare,
    totalPremium,
  }
}

interface DependentResult {
  eligible: boolean
  incomePass: boolean
  businessPass: boolean
  propertyPass: boolean
  relationPass: boolean
  incomeDetail: string
  propertyDetail: string
  estimatedRegionalPremium: number | null
}

function calcDependent(
  relationship: string,
  annualIncome: number,
  hasBusinessIncome: boolean,
  businessIncome: number,
  propertyTaxBase: number,
  cohabitation: boolean,
  t: (key: string) => string,
): DependentResult {
  // Income condition
  const incomePass = annualIncome < 20_000_000
  const incomeDetail = `${formatNumber(annualIncome)}${t('unit.won')} ${incomePass ? '<' : '>='} 2,000${t('unit.man')}${t('unit.won')}`

  // Business income condition
  const businessPass = !hasBusinessIncome || businessIncome === 0

  // Property condition
  let propertyPass = false
  if (propertyTaxBase <= 540_000_000) {
    propertyPass = true
  } else if (propertyTaxBase <= 900_000_000) {
    propertyPass = annualIncome <= 10_000_000
  }
  const propertyDetail = `${formatNumber(propertyTaxBase)}${t('unit.won')} ${propertyPass ? '<=' : '>'} 5.4${t('unit.eok')}${t('unit.won')}`

  // Relationship condition
  let relationPass = true
  if (relationship === 'sibling') {
    relationPass = cohabitation
  }

  const eligible = incomePass && businessPass && propertyPass && relationPass

  // Estimate regional premium if not eligible
  let estimatedRegionalPremium: number | null = null
  if (!eligible) {
    const result = calcRegional(
      hasBusinessIncome ? businessIncome : 0,
      annualIncome - (hasBusinessIncome ? businessIncome : 0),
      0, 0, 0,
      propertyTaxBase,
      0,
    )
    estimatedRegionalPremium = result.totalPremium
  }

  return {
    eligible,
    incomePass,
    businessPass,
    propertyPass,
    relationPass,
    incomeDetail,
    propertyDetail,
    estimatedRegionalPremium,
  }
}

// ── Tabs type ──
type TabId = 'workplace' | 'regional' | 'dependent' | 'comparison'

export default function HealthInsuranceCalculator() {
  const t = useTranslations('healthInsurance')
  const searchParams = useSearchParams()
  const [activeTab, setActiveTab] = useState<TabId>(() => {
    const p = searchParams.get('tab')
    return (p && ['workplace', 'regional', 'dependent', 'comparison'].includes(p)) ? p as TabId : 'workplace'
  })
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [linkCopied, setLinkCopied] = useState(false)

  // Tab 1: Workplace
  const [wpSalary, setWpSalary] = useState(() => searchParams.get('salary') || '')
  const [wpIsAnnual, setWpIsAnnual] = useState(() => searchParams.get('annual') === '1')
  const [wpNonTaxable, setWpNonTaxable] = useState(() => searchParams.get('nonTaxable') || '')
  const [showAllInsurance, setShowAllInsurance] = useState(false)

  // Tab 2: Regional
  const [rgBusinessIncome, setRgBusinessIncome] = useState('')
  const [rgEmploymentIncome, setRgEmploymentIncome] = useState('')
  const [rgFinancialIncome, setRgFinancialIncome] = useState('')
  const [rgOtherIncome, setRgOtherIncome] = useState('')
  const [rgPensionIncome, setRgPensionIncome] = useState('')
  const [rgPropertyTaxBase, setRgPropertyTaxBase] = useState('')
  const [rgDeposit, setRgDeposit] = useState('')

  // Tab 3: Dependent
  const [dpRelationship, setDpRelationship] = useState('spouse')
  const [dpAnnualIncome, setDpAnnualIncome] = useState('')
  const [dpHasBusinessIncome, setDpHasBusinessIncome] = useState(false)
  const [dpBusinessIncome, setDpBusinessIncome] = useState('')
  const [dpPropertyTaxBase, setDpPropertyTaxBase] = useState('')
  const [dpCohabitation, setDpCohabitation] = useState(true)

  // Tab 4: Comparison
  const [cmpSalary, setCmpSalary] = useState('')
  const [cmpNonTaxable, setCmpNonTaxable] = useState('')
  const [cmpBusinessIncome, setCmpBusinessIncome] = useState('')
  const [cmpEmploymentIncome, setCmpEmploymentIncome] = useState('')
  const [cmpFinancialIncome, setCmpFinancialIncome] = useState('')
  const [cmpOtherIncome, setCmpOtherIncome] = useState('')
  const [cmpPensionIncome, setCmpPensionIncome] = useState('')
  const [cmpPropertyTaxBase, setCmpPropertyTaxBase] = useState('')
  const [cmpDeposit, setCmpDeposit] = useState('')
  const [cmpCeoSalary, setCmpCeoSalary] = useState('')

  // ── Guide expand ──
  const [showGuide, setShowGuide] = useState(false)

  // ── URL sync ──
  useEffect(() => {
    const url = new URL(window.location.href)
    url.searchParams.set('tab', activeTab)
    if (wpSalary) url.searchParams.set('salary', wpSalary); else url.searchParams.delete('salary')
    if (wpIsAnnual) url.searchParams.set('annual', '1'); else url.searchParams.delete('annual')
    if (wpNonTaxable) url.searchParams.set('nonTaxable', wpNonTaxable); else url.searchParams.delete('nonTaxable')
    window.history.replaceState({}, '', url)
  }, [activeTab, wpSalary, wpIsAnnual, wpNonTaxable])

  const copyLink = useCallback(() => {
    navigator.clipboard?.writeText(window.location.href).then(() => {
      setLinkCopied(true)
      setTimeout(() => setLinkCopied(false), 2000)
    })
  }, [])

  // ── Copy ──
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

  // ── Computed results ──
  const workplaceResult = useMemo(() => {
    const salary = parseCommaNumber(wpSalary)
    if (salary <= 0) return null
    const monthly = wpIsAnnual ? Math.floor(salary / 12) : salary
    return calcWorkplace(monthly, parseCommaNumber(wpNonTaxable))
  }, [wpSalary, wpIsAnnual, wpNonTaxable])

  const regionalResult = useMemo(() => {
    const bi = parseCommaNumber(rgBusinessIncome)
    const ei = parseCommaNumber(rgEmploymentIncome)
    const fi = parseCommaNumber(rgFinancialIncome)
    const oi = parseCommaNumber(rgOtherIncome)
    const pi = parseCommaNumber(rgPensionIncome)
    const pt = parseCommaNumber(rgPropertyTaxBase)
    const dp = parseCommaNumber(rgDeposit)
    if (bi + ei + fi + oi + pi + pt + dp <= 0) return null
    return calcRegional(bi, ei, fi, oi, pi, pt, dp)
  }, [rgBusinessIncome, rgEmploymentIncome, rgFinancialIncome, rgOtherIncome, rgPensionIncome, rgPropertyTaxBase, rgDeposit])

  const dependentResult = useMemo(() => {
    const income = parseCommaNumber(dpAnnualIncome)
    const property = parseCommaNumber(dpPropertyTaxBase)
    if (income <= 0 && property <= 0) return null
    return calcDependent(
      dpRelationship,
      income,
      dpHasBusinessIncome,
      parseCommaNumber(dpBusinessIncome),
      property,
      dpCohabitation,
      t,
    )
  }, [dpRelationship, dpAnnualIncome, dpHasBusinessIncome, dpBusinessIncome, dpPropertyTaxBase, dpCohabitation, t])

  const comparisonResult = useMemo(() => {
    const ceoMonthly = parseCommaNumber(cmpCeoSalary)
    if (ceoMonthly <= 0) return null

    const wp = calcWorkplace(ceoMonthly, parseCommaNumber(cmpNonTaxable))

    const bi = parseCommaNumber(cmpBusinessIncome)
    const ei = parseCommaNumber(cmpEmploymentIncome)
    const fi = parseCommaNumber(cmpFinancialIncome)
    const oi = parseCommaNumber(cmpOtherIncome)
    const pi = parseCommaNumber(cmpPensionIncome)
    const pt = parseCommaNumber(cmpPropertyTaxBase)
    const dp = parseCommaNumber(cmpDeposit)
    const rg = calcRegional(bi, ei, fi, oi, pi, pt, dp)

    // For workplace as CEO: employer portion is effectively also personal cost
    const wpRealCost = wp.healthEmployee + wp.longTermEmployee + wp.healthEmployer + wp.longTermEmployer
    const wpPensionReal = wp.pensionEmployee + wp.pensionEmployer

    return { wp, rg, wpRealCost, wpPensionReal }
  }, [cmpCeoSalary, cmpNonTaxable, cmpBusinessIncome, cmpEmploymentIncome, cmpFinancialIncome, cmpOtherIncome, cmpPensionIncome, cmpPropertyTaxBase, cmpDeposit])

  // ── Tabs ──
  const tabs: { id: TabId; label: string; icon: React.ReactNode }[] = [
    { id: 'workplace', label: t('tabs.workplace'), icon: <Building2 className="w-4 h-4" /> },
    { id: 'regional', label: t('tabs.regional'), icon: <Home className="w-4 h-4" /> },
    { id: 'dependent', label: t('tabs.dependent'), icon: <Users className="w-4 h-4" /> },
    { id: 'comparison', label: t('tabs.comparison'), icon: <BarChart3 className="w-4 h-4" /> },
  ]

  // ── Helper: number input ──
  const NumberInput = ({ value, onChange, placeholder, label, ariaLabel }: {
    value: string; onChange: (v: string) => void; placeholder?: string; label?: string; ariaLabel?: string
  }) => (
    <div>
      {label && <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{label}</label>}
      <div className="relative">
        <input
          type="text"
          inputMode="numeric"
          value={value}
          onChange={(e) => onChange(formatInputValue(e.target.value))}
          placeholder={placeholder || '0'}
          aria-label={ariaLabel || label}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 text-right pr-8"
        />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">{t('unit.won')}</span>
      </div>
    </div>
  )

  // ── Build copy text ──
  const buildWorkplaceCopyText = () => {
    if (!workplaceResult) return ''
    const r = workplaceResult
    const lines = [
      `[${t('title')} - ${t('tabs.workplace')}]`,
      `${t('workplace.remuneration')}: ${formatNumber(r.remuneration)}${t('unit.won')}`,
      '',
      `${t('insurance.healthInsurance')}:`,
      `  ${t('workplace.employee')}: ${formatNumber(r.healthEmployee)}${t('unit.won')}`,
      `  ${t('workplace.employer')}: ${formatNumber(r.healthEmployer)}${t('unit.won')}`,
      `${t('insurance.longTermCare')}:`,
      `  ${t('workplace.employee')}: ${formatNumber(r.longTermEmployee)}${t('unit.won')}`,
      `  ${t('workplace.employer')}: ${formatNumber(r.longTermEmployer)}${t('unit.won')}`,
      '',
      `${t('insurance.myShare')}: ${formatNumber(r.healthEmployee + r.longTermEmployee)}${t('unit.won')}`,
    ]
    if (showAllInsurance) {
      lines.push(
        `${t('insurance.nationalPension')}: ${formatNumber(r.pensionEmployee)}${t('unit.won')}`,
        `${t('insurance.employmentInsurance')}: ${formatNumber(r.employmentInsurance)}${t('unit.won')}`,
        `${t('insurance.total4')}: ${formatNumber(r.totalEmployee)}${t('unit.won')}`,
        `${t('workplace.netSalary')}: ${formatNumber(r.netSalary)}${t('unit.won')}`,
      )
    }
    return lines.join('\n')
  }

  // ── Render ──
  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('title')}</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('description')}</p>
        </div>
        <button onClick={copyLink} className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 transition-colors whitespace-nowrap">
          {linkCopied ? <><Check className="w-4 h-4" />복사됨</> : <><Link className="w-4 h-4" />링크 복사</>}
        </button>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700 overflow-x-auto" role="tablist">
        <div className="flex min-w-max">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              role="tab"
              aria-selected={activeTab === tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === tab.id
                  ? 'border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-400'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab panels */}
      <div role="tabpanel">
        {/* ═══════════════ Tab 1: Workplace ═══════════════ */}
        {activeTab === 'workplace' && (
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Settings */}
            <div className="lg:col-span-1">
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 space-y-4">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{t('tabs.workplace')}</h2>

                <NumberInput
                  value={wpSalary}
                  onChange={setWpSalary}
                  label={wpIsAnnual ? t('workplace.annualSalary') : t('workplace.monthlySalary')}
                  placeholder={wpIsAnnual ? '50,000,000' : '4,000,000'}
                />

                <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={wpIsAnnual}
                    onChange={(e) => setWpIsAnnual(e.target.checked)}
                    className="accent-blue-600"
                  />
                  {t('workplace.inputAsAnnual')}
                </label>

                <NumberInput
                  value={wpNonTaxable}
                  onChange={setWpNonTaxable}
                  label={t('workplace.nonTaxable')}
                  placeholder="200,000"
                />

                <div className="bg-blue-50 dark:bg-blue-950 rounded-lg p-3 text-xs text-blue-700 dark:text-blue-300">
                  <Info className="w-4 h-4 inline mr-1" />
                  {t('workplace.rateInfo')}
                </div>
              </div>
            </div>

            {/* Results */}
            <div className="lg:col-span-2">
              {workplaceResult ? (
                <div className="space-y-4">
                  <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        {t('insurance.healthInsurance')} ({t('insurance.rate2025')})
                      </h3>
                      <button
                        onClick={() => copyToClipboard(buildWorkplaceCopyText(), 'wp')}
                        className="flex items-center gap-1 px-3 py-1.5 text-sm bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg transition-colors"
                      >
                        {copiedId === 'wp' ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                        {copiedId === 'wp' ? t('copied') : t('copy')}
                      </button>
                    </div>

                    <div className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                      {t('workplace.remuneration')}: <span className="font-medium text-gray-900 dark:text-white">{formatNumber(workplaceResult.remuneration)}{t('unit.won')}</span>
                    </div>

                    {/* Health insurance breakdown */}
                    <div className="space-y-3">
                      <PremiumRow
                        label={t('insurance.healthInsurance')}
                        employee={workplaceResult.healthEmployee}
                        employer={workplaceResult.healthEmployer}
                        t={t}
                      />
                      <PremiumRow
                        label={t('insurance.longTermCare')}
                        employee={workplaceResult.longTermEmployee}
                        employer={workplaceResult.longTermEmployer}
                        t={t}
                      />
                      <div className="border-t border-gray-200 dark:border-gray-700 pt-3">
                        <div className="flex justify-between text-sm font-semibold">
                          <span className="text-gray-900 dark:text-white">{t('insurance.myShare')}</span>
                          <span className="text-blue-600 dark:text-blue-400">{formatNumber(workplaceResult.healthEmployee + workplaceResult.longTermEmployee)}{t('unit.won')}</span>
                        </div>
                        <div className="flex justify-between text-sm mt-1">
                          <span className="text-gray-500 dark:text-gray-400">{t('workplace.employerShare')}</span>
                          <span className="text-gray-700 dark:text-gray-300">{formatNumber(workplaceResult.healthEmployer + workplaceResult.longTermEmployer)}{t('unit.won')}</span>
                        </div>
                        <div className="flex justify-between text-sm mt-1">
                          <span className="text-gray-500 dark:text-gray-400">{t('insurance.total')}</span>
                          <span className="text-gray-700 dark:text-gray-300">{formatNumber(workplaceResult.healthInsurance + workplaceResult.longTermCare)}{t('unit.won')}</span>
                        </div>
                      </div>
                    </div>

                    {/* Toggle 4 insurances */}
                    <button
                      onClick={() => setShowAllInsurance(!showAllInsurance)}
                      className="mt-4 flex items-center gap-1 text-sm text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      {showAllInsurance ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      {t('insurance.showAll4')}
                    </button>

                    {showAllInsurance && (
                      <div className="mt-4 space-y-3 border-t border-gray-200 dark:border-gray-700 pt-4">
                        <PremiumRow
                          label={t('insurance.nationalPension')}
                          employee={workplaceResult.pensionEmployee}
                          employer={workplaceResult.pensionEmployer}
                          t={t}
                        />
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-gray-700 dark:text-gray-300">{t('insurance.employmentInsurance')}</span>
                          <span className="text-gray-900 dark:text-white font-medium">{formatNumber(workplaceResult.employmentInsurance)}{t('unit.won')}</span>
                        </div>

                        <div className="border-t border-gray-200 dark:border-gray-700 pt-3">
                          <div className="flex justify-between text-sm font-semibold">
                            <span className="text-gray-900 dark:text-white">{t('insurance.total4')}</span>
                            <span className="text-blue-600 dark:text-blue-400">{formatNumber(workplaceResult.totalEmployee)}{t('unit.won')}</span>
                          </div>
                        </div>

                        <div className="bg-green-50 dark:bg-green-950 rounded-lg p-4 mt-3">
                          <div className="flex justify-between items-center">
                            <span className="text-sm font-semibold text-green-800 dark:text-green-200">{t('workplace.netSalary')}</span>
                            <span className="text-lg font-bold text-green-700 dark:text-green-300">{formatNumber(workplaceResult.netSalary)}{t('unit.won')}</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Annual projection */}
                  <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{t('workplace.annualProjection')}</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-blue-50 dark:bg-blue-950 rounded-lg p-4">
                        <div className="text-xs text-blue-600 dark:text-blue-400">{t('insurance.healthInsurance')} + {t('insurance.longTermCare')}</div>
                        <div className="text-lg font-bold text-blue-700 dark:text-blue-300 mt-1">
                          {formatNumber((workplaceResult.healthEmployee + workplaceResult.longTermEmployee) * 12)}{t('unit.won')}
                        </div>
                        <div className="text-xs text-blue-500 dark:text-blue-400 mt-0.5">{t('unit.perYear')}</div>
                      </div>
                      {showAllInsurance && (
                        <div className="bg-purple-50 dark:bg-purple-950 rounded-lg p-4">
                          <div className="text-xs text-purple-600 dark:text-purple-400">{t('insurance.total4')}</div>
                          <div className="text-lg font-bold text-purple-700 dark:text-purple-300 mt-1">
                            {formatNumber(workplaceResult.totalEmployee * 12)}{t('unit.won')}
                          </div>
                          <div className="text-xs text-purple-500 dark:text-purple-400 mt-0.5">{t('unit.perYear')}</div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-12 text-center text-gray-400 dark:text-gray-500">
                  {t('placeholder.enterSalary')}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ═══════════════ Tab 2: Regional ═══════════════ */}
        {activeTab === 'regional' && (
          <div className="grid lg:grid-cols-3 gap-8">
            <div className="lg:col-span-1 space-y-4">
              {/* Income section */}
              <fieldset className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 space-y-3">
                <legend className="text-lg font-semibold text-gray-900 dark:text-white">{t('regional.incomeSection')}</legend>
                <NumberInput value={rgBusinessIncome} onChange={setRgBusinessIncome} label={t('regional.businessIncome')} />
                <NumberInput value={rgEmploymentIncome} onChange={setRgEmploymentIncome} label={t('regional.employmentIncome')} />
                <NumberInput value={rgFinancialIncome} onChange={setRgFinancialIncome} label={t('regional.financialIncome')} />
                <NumberInput value={rgOtherIncome} onChange={setRgOtherIncome} label={t('regional.otherIncome')} />
                <NumberInput value={rgPensionIncome} onChange={setRgPensionIncome} label={t('regional.pensionIncome')} />
              </fieldset>

              {/* Property section */}
              <fieldset className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 space-y-3">
                <legend className="text-lg font-semibold text-gray-900 dark:text-white">{t('regional.propertySection')}</legend>
                <NumberInput value={rgPropertyTaxBase} onChange={setRgPropertyTaxBase} label={t('regional.propertyTaxBase')} />
                <NumberInput value={rgDeposit} onChange={setRgDeposit} label={t('regional.deposit')} />
              </fieldset>
            </div>

            <div className="lg:col-span-2">
              {regionalResult ? (
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{t('regional.result')}</h3>

                  {/* Income premium */}
                  <div className="space-y-2">
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      {t('regional.totalAnnualIncome')}: <span className="font-medium text-gray-900 dark:text-white">{formatNumber(regionalResult.totalAnnualIncome)}{t('unit.won')}</span>
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      {t('regional.monthlyIncome')}: <span className="font-medium text-gray-900 dark:text-white">{formatNumber(regionalResult.monthlyIncome)}{t('unit.won')}</span>
                    </div>
                  </div>

                  <div className="border-t border-gray-200 dark:border-gray-700 pt-4 space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-700 dark:text-gray-300">{t('regional.incomePremium')}</span>
                      <span className="text-gray-900 dark:text-white font-medium">{formatNumber(regionalResult.incomePremium)}{t('unit.won')}</span>
                    </div>

                    {regionalResult.propertyAmount > 0 && (
                      <>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-700 dark:text-gray-300">{t('regional.propertyPoints')}</span>
                          <span className="text-gray-900 dark:text-white font-medium">{regionalResult.propertyScore}{t('regional.points')}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-700 dark:text-gray-300">{t('regional.propertyPremium')} ({regionalResult.propertyScore} x {POINT_VALUE}{t('unit.won')})</span>
                          <span className="text-gray-900 dark:text-white font-medium">{formatNumber(regionalResult.propertyPremium)}{t('unit.won')}</span>
                        </div>
                      </>
                    )}

                    <div className="border-t border-gray-200 dark:border-gray-700 pt-3">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-700 dark:text-gray-300">{t('insurance.healthInsurance')}</span>
                        <span className="text-gray-900 dark:text-white font-medium">{formatNumber(regionalResult.healthPremium)}{t('unit.won')}</span>
                      </div>
                      <div className="flex justify-between text-sm mt-1">
                        <span className="text-gray-700 dark:text-gray-300">{t('insurance.longTermCare')} ({(LONG_TERM_CARE_RATE * 100).toFixed(2)}%)</span>
                        <span className="text-gray-900 dark:text-white font-medium">{formatNumber(regionalResult.longTermCare)}{t('unit.won')}</span>
                      </div>
                    </div>

                    <div className="border-t border-gray-200 dark:border-gray-700 pt-3">
                      <div className="flex justify-between font-semibold">
                        <span className="text-gray-900 dark:text-white">{t('regional.monthlyTotal')}</span>
                        <span className="text-blue-600 dark:text-blue-400 text-lg">{formatNumber(regionalResult.totalPremium)}{t('unit.won')}</span>
                      </div>
                      <div className="flex justify-between text-sm text-gray-500 dark:text-gray-400 mt-1">
                        <span>{t('unit.perYear')}</span>
                        <span>{formatNumber(regionalResult.totalPremium * 12)}{t('unit.won')}</span>
                      </div>
                    </div>
                  </div>

                  {regionalResult.incomePremium === REGIONAL_MIN_PREMIUM && (
                    <div className="bg-yellow-50 dark:bg-yellow-950 rounded-lg p-3 text-xs text-yellow-700 dark:text-yellow-300 flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                      {t('regional.minimumApplied')}
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-12 text-center text-gray-400 dark:text-gray-500">
                  {t('placeholder.enterIncome')}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ═══════════════ Tab 3: Dependent ═══════════════ */}
        {activeTab === 'dependent' && (
          <div className="grid lg:grid-cols-3 gap-8">
            <div className="lg:col-span-1">
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 space-y-4">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{t('tabs.dependent')}</h2>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('dependent.relationship')}</label>
                  <select
                    value={dpRelationship}
                    onChange={(e) => setDpRelationship(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                  >
                    {(['spouse', 'parent', 'child', 'sibling', 'grandparent', 'grandchild'] as const).map(rel => (
                      <option key={rel} value={rel}>{t(`dependent.relationships.${rel}`)}</option>
                    ))}
                  </select>
                </div>

                <NumberInput value={dpAnnualIncome} onChange={setDpAnnualIncome} label={t('dependent.annualIncome')} />

                <div>
                  <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={dpHasBusinessIncome}
                      onChange={(e) => setDpHasBusinessIncome(e.target.checked)}
                      className="accent-blue-600"
                    />
                    {t('dependent.hasBusinessIncome')}
                  </label>
                </div>

                {dpHasBusinessIncome && (
                  <NumberInput value={dpBusinessIncome} onChange={setDpBusinessIncome} label={t('dependent.businessIncomeAmount')} />
                )}

                <NumberInput value={dpPropertyTaxBase} onChange={setDpPropertyTaxBase} label={t('dependent.propertyTaxBase')} />

                {dpRelationship === 'sibling' && (
                  <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={dpCohabitation}
                      onChange={(e) => setDpCohabitation(e.target.checked)}
                      className="accent-blue-600"
                    />
                    {t('dependent.cohabitation')}
                  </label>
                )}
              </div>
            </div>

            <div className="lg:col-span-2">
              {dependentResult ? (
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6" role="status" aria-live="polite">
                  {/* Result header */}
                  <div className={`flex items-center gap-3 mb-6 p-4 rounded-xl ${
                    dependentResult.eligible
                      ? 'bg-green-50 dark:bg-green-950'
                      : 'bg-red-50 dark:bg-red-950'
                  }`}>
                    {dependentResult.eligible ? (
                      <CheckCircle2 className="w-8 h-8 text-green-600 dark:text-green-400 shrink-0" />
                    ) : (
                      <XCircle className="w-8 h-8 text-red-600 dark:text-red-400 shrink-0" />
                    )}
                    <div>
                      <div className={`text-lg font-bold ${
                        dependentResult.eligible ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-300'
                      }`}>
                        {dependentResult.eligible ? t('dependent.eligible') : t('dependent.notEligible')}
                      </div>
                      <div className={`text-sm ${
                        dependentResult.eligible ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                      }`}>
                        {dependentResult.eligible ? t('dependent.noPremium') : t('dependent.mustPayRegional')}
                      </div>
                    </div>
                  </div>

                  {/* Condition breakdown */}
                  <div className="space-y-3">
                    <h4 className="text-sm font-semibold text-gray-900 dark:text-white">{t('dependent.conditions')}</h4>

                    <ConditionRow
                      pass={dependentResult.incomePass}
                      label={t('dependent.incomeCondition')}
                      detail={dependentResult.incomeDetail}
                    />

                    <ConditionRow
                      pass={dependentResult.businessPass}
                      label={t('dependent.businessCondition')}
                      detail={dependentResult.businessPass ? t('dependent.noBusinessIncome') : t('dependent.hasBusinessIncomeDetail')}
                    />

                    <ConditionRow
                      pass={dependentResult.propertyPass}
                      label={t('dependent.propertyCondition')}
                      detail={dependentResult.propertyDetail}
                    />

                    {dpRelationship === 'sibling' && (
                      <ConditionRow
                        pass={dependentResult.relationPass}
                        label={t('dependent.relationCondition')}
                        detail={dependentResult.relationPass ? t('dependent.cohabitationMet') : t('dependent.cohabitationRequired')}
                      />
                    )}
                  </div>

                  {/* Estimated regional premium if not eligible */}
                  {!dependentResult.eligible && dependentResult.estimatedRegionalPremium !== null && (
                    <div className="mt-6 bg-orange-50 dark:bg-orange-950 rounded-xl p-4">
                      <div className="text-sm text-orange-700 dark:text-orange-300 font-medium mb-1">
                        {t('dependent.switchToRegional')}
                      </div>
                      <div className="text-2xl font-bold text-orange-800 dark:text-orange-200">
                        {t('unit.monthly')} {formatNumber(dependentResult.estimatedRegionalPremium)}{t('unit.won')}
                      </div>
                      <div className="text-sm text-orange-600 dark:text-orange-400 mt-1">
                        {t('unit.perYear')} {formatNumber(dependentResult.estimatedRegionalPremium * 12)}{t('unit.won')}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-12 text-center text-gray-400 dark:text-gray-500">
                  {t('placeholder.enterDependentInfo')}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ═══════════════ Tab 4: Comparison ═══════════════ */}
        {activeTab === 'comparison' && (
          <div className="space-y-8">
            <div className="grid lg:grid-cols-2 gap-8">
              {/* Regional (freelancer) inputs */}
              <fieldset className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 space-y-3">
                <legend className="text-lg font-semibold text-gray-900 dark:text-white">{t('comparison.freelancer')}</legend>
                <NumberInput value={cmpBusinessIncome} onChange={setCmpBusinessIncome} label={t('regional.businessIncome')} />
                <NumberInput value={cmpEmploymentIncome} onChange={setCmpEmploymentIncome} label={t('regional.employmentIncome')} />
                <NumberInput value={cmpFinancialIncome} onChange={setCmpFinancialIncome} label={t('regional.financialIncome')} />
                <NumberInput value={cmpOtherIncome} onChange={setCmpOtherIncome} label={t('regional.otherIncome')} />
                <NumberInput value={cmpPensionIncome} onChange={setCmpPensionIncome} label={t('regional.pensionIncome')} />
                <NumberInput value={cmpPropertyTaxBase} onChange={setCmpPropertyTaxBase} label={t('regional.propertyTaxBase')} />
                <NumberInput value={cmpDeposit} onChange={setCmpDeposit} label={t('regional.deposit')} />
              </fieldset>

              {/* Workplace (incorporated CEO) inputs */}
              <fieldset className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 space-y-3">
                <legend className="text-lg font-semibold text-gray-900 dark:text-white">{t('comparison.incorporated')}</legend>
                <NumberInput value={cmpCeoSalary} onChange={setCmpCeoSalary} label={t('comparison.ceoSalary')} placeholder="4,000,000" />
                <NumberInput value={cmpNonTaxable} onChange={setCmpNonTaxable} label={t('workplace.nonTaxable')} />
                <div className="bg-yellow-50 dark:bg-yellow-950 rounded-lg p-3 text-xs text-yellow-700 dark:text-yellow-300">
                  <AlertTriangle className="w-4 h-4 inline mr-1" />
                  {t('comparison.ceoNote')}
                </div>
              </fieldset>
            </div>

            {/* Comparison results */}
            {comparisonResult ? (
              <div className="space-y-6">
                {/* Comparison table */}
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 overflow-x-auto">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{t('comparison.result')}</h3>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200 dark:border-gray-700">
                        <th scope="col" className="text-left py-2 text-gray-500 dark:text-gray-400 font-medium">{t('comparison.item')}</th>
                        <th scope="col" className="text-right py-2 text-red-600 dark:text-red-400 font-medium">{t('comparison.freelancer')}</th>
                        <th scope="col" className="text-right py-2 text-blue-600 dark:text-blue-400 font-medium">{t('comparison.incorporated')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                      <tr>
                        <td className="py-2 text-gray-700 dark:text-gray-300">{t('insurance.healthInsurance')}</td>
                        <td className="py-2 text-right text-gray-900 dark:text-white">{formatNumber(comparisonResult.rg.healthPremium)}{t('unit.won')}</td>
                        <td className="py-2 text-right text-gray-900 dark:text-white">{formatNumber(comparisonResult.wp.healthEmployee + comparisonResult.wp.healthEmployer)}{t('unit.won')} *</td>
                      </tr>
                      <tr>
                        <td className="py-2 text-gray-700 dark:text-gray-300">{t('insurance.longTermCare')}</td>
                        <td className="py-2 text-right text-gray-900 dark:text-white">{formatNumber(comparisonResult.rg.longTermCare)}{t('unit.won')}</td>
                        <td className="py-2 text-right text-gray-900 dark:text-white">{formatNumber(comparisonResult.wp.longTermEmployee + comparisonResult.wp.longTermEmployer)}{t('unit.won')} *</td>
                      </tr>
                      <tr>
                        <td className="py-2 text-gray-700 dark:text-gray-300">{t('insurance.nationalPension')}</td>
                        <td className="py-2 text-right text-gray-900 dark:text-white">
                          {formatNumber(Math.floor(Math.min(comparisonResult.rg.monthlyIncome, PENSION_CAP_MONTHLY) * PENSION_RATE))}{t('unit.won')} **
                        </td>
                        <td className="py-2 text-right text-gray-900 dark:text-white">{formatNumber(comparisonResult.wp.pensionEmployee + comparisonResult.wp.pensionEmployer)}{t('unit.won')} *</td>
                      </tr>
                      <tr className="font-semibold bg-gray-50 dark:bg-gray-700">
                        <td className="py-3 text-gray-900 dark:text-white">{t('insurance.total')} ({t('insurance.myShare')})</td>
                        <td className="py-3 text-right text-red-600 dark:text-red-400">
                          {formatNumber(
                            comparisonResult.rg.totalPremium +
                            Math.floor(Math.min(comparisonResult.rg.monthlyIncome, PENSION_CAP_MONTHLY) * PENSION_RATE)
                          )}{t('unit.won')}
                        </td>
                        <td className="py-3 text-right text-blue-600 dark:text-blue-400">
                          {formatNumber(comparisonResult.wpRealCost + comparisonResult.wpPensionReal)}{t('unit.won')}
                        </td>
                      </tr>
                    </tbody>
                  </table>

                  <div className="mt-3 text-xs text-gray-500 dark:text-gray-400 space-y-1">
                    <p>* {t('comparison.ceoEmployerNote')}</p>
                    <p>** {t('comparison.regionalPensionNote')}</p>
                  </div>

                  {/* Difference summary */}
                  {(() => {
                    const rgTotal = comparisonResult.rg.totalPremium +
                      Math.floor(Math.min(comparisonResult.rg.monthlyIncome, PENSION_CAP_MONTHLY) * PENSION_RATE)
                    const wpTotal = comparisonResult.wpRealCost + comparisonResult.wpPensionReal
                    const diff = rgTotal - wpTotal
                    const annualDiff = diff * 12

                    return (
                      <div className={`mt-4 p-4 rounded-xl ${diff > 0 ? 'bg-blue-50 dark:bg-blue-950' : 'bg-red-50 dark:bg-red-950'}`}>
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                          <div>
                            <div className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('comparison.difference')}</div>
                            <div className={`text-xl font-bold ${diff > 0 ? 'text-blue-700 dark:text-blue-300' : 'text-red-700 dark:text-red-300'}`}>
                              {diff > 0 ? t('comparison.freelancerMore') : t('comparison.workplaceMore')} {formatNumber(Math.abs(diff))}{t('unit.won')}/{t('unit.month')}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm text-gray-500 dark:text-gray-400">{t('comparison.annualDifference')}</div>
                            <div className="text-lg font-bold text-gray-900 dark:text-white">{formatNumber(Math.abs(annualDiff))}{t('unit.won')}</div>
                          </div>
                        </div>
                      </div>
                    )
                  })()}
                </div>

                {/* Chart */}
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{t('comparison.chartTitle')}</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart
                      data={[
                        {
                          name: t('insurance.healthInsurance'),
                          regional: comparisonResult.rg.healthPremium,
                          workplace: comparisonResult.wp.healthEmployee + comparisonResult.wp.healthEmployer,
                        },
                        {
                          name: t('insurance.longTermCare'),
                          regional: comparisonResult.rg.longTermCare,
                          workplace: comparisonResult.wp.longTermEmployee + comparisonResult.wp.longTermEmployer,
                        },
                        {
                          name: t('insurance.nationalPension'),
                          regional: Math.floor(Math.min(comparisonResult.rg.monthlyIncome, PENSION_CAP_MONTHLY) * PENSION_RATE),
                          workplace: comparisonResult.wp.pensionEmployee + comparisonResult.wp.pensionEmployer,
                        },
                      ]}
                      layout="vertical"
                      margin={{ left: 20, right: 20, top: 5, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" tickFormatter={(v: number) => `${Math.round(v / 10000)}${t('unit.man')}`} />
                      <YAxis type="category" dataKey="name" width={80} />
                      <Tooltip formatter={(value) => `${formatNumber((value as number) ?? 0)}${t('unit.won')}`} />
                      <Legend />
                      <Bar dataKey="regional" name={t('comparison.freelancer')} fill="#ef4444" barSize={20} />
                      <Bar dataKey="workplace" name={t('comparison.incorporated')} fill="#3b82f6" barSize={20} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* Corporate note */}
                <div className="bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-xl p-4">
                  <div className="flex items-start gap-3">
                    <Info className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                    <div className="text-sm text-amber-800 dark:text-amber-200">
                      <strong>{t('comparison.importantNote')}</strong>
                      <p className="mt-1">{t('comparison.corporateNote')}</p>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-12 text-center text-gray-400 dark:text-gray-500">
                {t('placeholder.enterComparison')}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ═══════════════ Guide Section ═══════════════ */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg">
        <button
          onClick={() => setShowGuide(!showGuide)}
          className="w-full flex items-center justify-between p-6 text-left"
        >
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">{t('guide.title')}</h2>
          </div>
          {showGuide ? <ChevronUp className="w-5 h-5 text-gray-500" /> : <ChevronDown className="w-5 h-5 text-gray-500" />}
        </button>

        {showGuide && (
          <div className="px-6 pb-6 space-y-6">
            {/* Rates */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">{t('guide.rates.title')}</h3>
              <ul className="space-y-2">
                {(t.raw('guide.rates.items') as string[]).map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300">
                    <span className="text-blue-500 mt-1 shrink-0">&#8226;</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            {/* Dependent rules */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">{t('guide.dependentRules.title')}</h3>
              <ul className="space-y-2">
                {(t.raw('guide.dependentRules.items') as string[]).map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300">
                    <span className="text-blue-500 mt-1 shrink-0">&#8226;</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            {/* Regional calc */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">{t('guide.regionalCalc.title')}</h3>
              <ul className="space-y-2">
                {(t.raw('guide.regionalCalc.items') as string[]).map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300">
                    <span className="text-blue-500 mt-1 shrink-0">&#8226;</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            {/* Tips */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">{t('guide.tips.title')}</h3>
              <ul className="space-y-2">
                {(t.raw('guide.tips.items') as string[]).map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300">
                    <span className="text-blue-500 mt-1 shrink-0">&#8226;</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Sub-components ──

function PremiumRow({ label, employee, employer, t }: {
  label: string; employee: number; employer: number; t: (key: string) => string
}) {
  return (
    <div>
      <div className="flex justify-between items-center text-sm mb-1">
        <span className="font-medium text-gray-800 dark:text-gray-200">{label}</span>
        <span className="text-gray-500 dark:text-gray-400 text-xs">{formatNumber(employee + employer)}{t('unit.won')}</span>
      </div>
      <div className="flex gap-4 ml-4 text-sm">
        <div className="flex justify-between flex-1">
          <span className="text-gray-500 dark:text-gray-400">{t('workplace.employee')}</span>
          <span className="text-gray-900 dark:text-white">{formatNumber(employee)}{t('unit.won')}</span>
        </div>
        <div className="flex justify-between flex-1">
          <span className="text-gray-500 dark:text-gray-400">{t('workplace.employer')}</span>
          <span className="text-gray-900 dark:text-white">{formatNumber(employer)}{t('unit.won')}</span>
        </div>
      </div>
    </div>
  )
}

function ConditionRow({ pass, label, detail }: { pass: boolean; label: string; detail: string }) {
  return (
    <div className={`flex items-start gap-2 p-3 rounded-lg ${pass ? 'bg-green-50 dark:bg-green-950/50' : 'bg-red-50 dark:bg-red-950/50'}`}>
      {pass ? (
        <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400 shrink-0" />
      ) : (
        <XCircle className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0" />
      )}
      <div>
        <div className={`text-sm font-medium ${pass ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-300'}`}>
          {label}
        </div>
        <div className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">{detail}</div>
      </div>
    </div>
  )
}
