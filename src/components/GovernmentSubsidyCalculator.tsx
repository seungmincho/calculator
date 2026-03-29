'use client'

import { useState, useCallback, useEffect, useMemo } from 'react'
import { useTranslations } from 'next-intl'
import { useSearchParams } from 'next/navigation'
import {
  Calculator, RotateCcw, ChevronDown, ChevronUp, Link, Copy, Check,
  Heart, Home, GraduationCap, Stethoscope, Baby, Landmark, Wallet,
  Shield, HandCoins, Accessibility, AlertTriangle, Banknote
} from 'lucide-react'
import GuideSection from '@/components/GuideSection'

// ── 2026 Median Income Table (중위소득) ──
const MEDIAN_INCOME: Record<number, number> = {
  1: 2_392_013,
  2: 3_932_658,
  3: 5_025_353,
  4: 6_097_773,
  5: 7_108_192,
  6: 8_064_805,
}

// ── Housing Subsidy Base Rent by Region (주거급여 기준임대료, 월세, 단위: 원) ──
const HOUSING_RENT_SEOUL: Record<number, number> = {
  1: 341_000,
  2: 382_000,
  3: 455_000,
  4: 527_000,
  5: 545_000,
  6: 545_000,
}

// ── Types ──
type HousingType = 'jeonse' | 'monthly' | 'own' | 'other'

interface UserInput {
  householdSize: number
  monthlyIncome: number // 만원
  totalAssets: number   // 만원
  age: number
  housingType: HousingType
  monthlyRent: number   // 만원
  deposit: number       // 만원
  hasMinorChildren: boolean
  childrenCount: number
  isSingleParent: boolean
  isDisabled: boolean
  isOver65: boolean
}

type EligibilityStatus = 'eligible' | 'ineligible' | 'borderline'

interface ProgramResult {
  id: string
  status: EligibilityStatus
  monthlyAmount: number  // 원
  yearlyAmount: number   // 원
  reason: string
}

const DEFAULT_INPUT: UserInput = {
  householdSize: 4,
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

// ── Number Formatting Helpers ──
function formatKoreanMoney(won: number): string {
  if (won >= 100_000_000) {
    const eok = Math.floor(won / 100_000_000)
    const remainder = won % 100_000_000
    if (remainder >= 10_000) {
      return `${eok}억 ${Math.round(remainder / 10_000).toLocaleString()}만원`
    }
    return `${eok}억원`
  }
  if (won >= 10_000) {
    return `${Math.round(won / 10_000).toLocaleString()}만원`
  }
  return `${won.toLocaleString()}원`
}

function formatNumber(num: number): string {
  return num.toLocaleString()
}

function parseNumberInput(value: string): number {
  return parseInt(value.replace(/,/g, ''), 10) || 0
}

// ── Calculation Logic ──
function getMedianIncome(size: number): number {
  return MEDIAN_INCOME[Math.min(Math.max(size, 1), 6)] ?? MEDIAN_INCOME[6]
}

function calculatePrograms(input: UserInput): ProgramResult[] {
  const median = getMedianIncome(input.householdSize)
  const incomeWon = input.monthlyIncome * 10_000 // 만원 → 원
  const assetsWon = input.totalAssets * 10_000
  const incomeRatio = incomeWon / median
  const results: ProgramResult[] = []

  // 1. 기초생활보장 생계급여 — 중위소득 32% 이하
  const livelihood32 = Math.round(median * 0.32)
  if (incomeWon <= livelihood32) {
    const gap = livelihood32 - incomeWon
    results.push({
      id: 'livelihood',
      status: 'eligible',
      monthlyAmount: gap,
      yearlyAmount: gap * 12,
      reason: `income_below_32`,
    })
  } else if (incomeRatio <= 0.40) {
    results.push({
      id: 'livelihood',
      status: 'borderline',
      monthlyAmount: 0,
      yearlyAmount: 0,
      reason: `income_above_32`,
    })
  } else {
    results.push({
      id: 'livelihood',
      status: 'ineligible',
      monthlyAmount: 0,
      yearlyAmount: 0,
      reason: `income_above_32`,
    })
  }

  // 2. 의료급여 — 중위소득 40% 이하
  const medical40 = Math.round(median * 0.40)
  if (incomeWon <= medical40) {
    results.push({
      id: 'medical',
      status: 'eligible',
      monthlyAmount: 0,
      yearlyAmount: 0,
      reason: 'income_below_40',
    })
  } else if (incomeRatio <= 0.50) {
    results.push({
      id: 'medical',
      status: 'borderline',
      monthlyAmount: 0,
      yearlyAmount: 0,
      reason: 'income_above_40',
    })
  } else {
    results.push({
      id: 'medical',
      status: 'ineligible',
      monthlyAmount: 0,
      yearlyAmount: 0,
      reason: 'income_above_40',
    })
  }

  // 3. 주거급여 — 중위소득 48% 이하
  const housing48 = Math.round(median * 0.48)
  const housingRent = HOUSING_RENT_SEOUL[Math.min(Math.max(input.householdSize, 1), 6)] ?? HOUSING_RENT_SEOUL[6]
  if (incomeWon <= housing48) {
    let monthlyAmt = 0
    if (input.housingType === 'monthly') {
      const actualRent = input.monthlyRent * 10_000
      monthlyAmt = Math.min(actualRent, housingRent)
    } else if (input.housingType === 'own') {
      // 자가: 수선비 지원 (연 평균 약 45만원으로 추정)
      monthlyAmt = 37_500
    } else if (input.housingType === 'jeonse') {
      // 전세: 보증금 환산 월 임대료 적용
      monthlyAmt = Math.min(Math.round((input.deposit * 10_000) * 0.04 / 12), housingRent)
    }
    results.push({
      id: 'housing',
      status: 'eligible',
      monthlyAmount: monthlyAmt,
      yearlyAmount: monthlyAmt * 12,
      reason: 'income_below_48',
    })
  } else if (incomeRatio <= 0.55) {
    results.push({
      id: 'housing',
      status: 'borderline',
      monthlyAmount: 0,
      yearlyAmount: 0,
      reason: 'income_above_48',
    })
  } else {
    results.push({
      id: 'housing',
      status: 'ineligible',
      monthlyAmount: 0,
      yearlyAmount: 0,
      reason: 'income_above_48',
    })
  }

  // 4. 교육급여 — 중위소득 50% 이하 + 미성년 자녀
  const edu50 = Math.round(median * 0.50)
  if (input.hasMinorChildren && incomeWon <= edu50) {
    // 평균 기준 중학생 가정: 연 654,000원
    const perChildYearly = 654_000
    const total = perChildYearly * Math.max(input.childrenCount, 1)
    results.push({
      id: 'education',
      status: 'eligible',
      monthlyAmount: Math.round(total / 12),
      yearlyAmount: total,
      reason: 'income_below_50_children',
    })
  } else if (input.hasMinorChildren && incomeRatio <= 0.60) {
    results.push({
      id: 'education',
      status: 'borderline',
      monthlyAmount: 0,
      yearlyAmount: 0,
      reason: 'income_above_50',
    })
  } else {
    results.push({
      id: 'education',
      status: 'ineligible',
      monthlyAmount: 0,
      yearlyAmount: 0,
      reason: input.hasMinorChildren ? 'income_above_50' : 'no_children',
    })
  }

  // 5. 자녀장려금 — 연소득 7,000만원 이하 + 18세 미만 자녀
  const yearlyIncomeMan = input.monthlyIncome * 12
  if (input.hasMinorChildren && yearlyIncomeMan <= 7000) {
    const childCount = Math.max(input.childrenCount, 1)
    const maxPerChild = 1_000_000 // 100만원
    const amount = maxPerChild * childCount
    results.push({
      id: 'childCredit',
      status: 'eligible',
      monthlyAmount: Math.round(amount / 12),
      yearlyAmount: amount,
      reason: 'income_below_7000_children',
    })
  } else if (input.hasMinorChildren && yearlyIncomeMan <= 8000) {
    results.push({
      id: 'childCredit',
      status: 'borderline',
      monthlyAmount: 0,
      yearlyAmount: 0,
      reason: 'income_above_7000',
    })
  } else {
    results.push({
      id: 'childCredit',
      status: 'ineligible',
      monthlyAmount: 0,
      yearlyAmount: 0,
      reason: input.hasMinorChildren ? 'income_above_7000' : 'no_children',
    })
  }

  // 6. 근로장려금 (EITC)
  // 가구 유형 판별: 단독(1인 미혼)/홑벌이(배우자 또는 부양가족)/맞벌이
  let eitcType: 'single' | 'sole' | 'dual' = 'single'
  if (input.householdSize >= 2) {
    eitcType = 'sole' // 간소화: 2인 이상 = 홑벌이 기본
  }
  const eitcLimits = { single: 2200, sole: 3200, dual: 3800 }
  const eitcMax = { single: 1_650_000, sole: 2_850_000, dual: 3_300_000 }
  const eitcLimit = eitcLimits[eitcType]
  const eitcMaxAmount = eitcMax[eitcType]

  if (yearlyIncomeMan <= eitcLimit && assetsWon < 2_400_000_000) {
    // 소득 구간별 장려금 (간소화 계산: 한도의 비율)
    const ratio = 1 - (yearlyIncomeMan / eitcLimit) * 0.5
    const amount = Math.round(eitcMaxAmount * Math.max(ratio, 0.3))
    results.push({
      id: 'eitc',
      status: 'eligible',
      monthlyAmount: Math.round(amount / 12),
      yearlyAmount: amount,
      reason: `eitc_eligible_${eitcType}`,
    })
  } else if (yearlyIncomeMan <= eitcLimit * 1.1) {
    results.push({
      id: 'eitc',
      status: 'borderline',
      monthlyAmount: 0,
      yearlyAmount: 0,
      reason: 'eitc_borderline',
    })
  } else {
    results.push({
      id: 'eitc',
      status: 'ineligible',
      monthlyAmount: 0,
      yearlyAmount: 0,
      reason: 'eitc_income_over',
    })
  }

  // 7. 기초연금 — 65세 이상
  if (input.isOver65 || input.age >= 65) {
    // 소득인정액 하위 70% 기준 (간소화: 중위소득 70% 이하로 판정)
    if (incomeRatio <= 0.70) {
      results.push({
        id: 'basicPension',
        status: 'eligible',
        monthlyAmount: 334_000,
        yearlyAmount: 334_000 * 12,
        reason: 'age_65_income_ok',
      })
    } else {
      results.push({
        id: 'basicPension',
        status: 'borderline',
        monthlyAmount: 0,
        yearlyAmount: 0,
        reason: 'age_65_income_high',
      })
    }
  } else {
    results.push({
      id: 'basicPension',
      status: 'ineligible',
      monthlyAmount: 0,
      yearlyAmount: 0,
      reason: 'age_under_65',
    })
  }

  // 8. 청년월세 한시 특별지원 — 19~34세, 중위소득 60% 이하(본인)
  if (input.age >= 19 && input.age <= 34 && input.housingType === 'monthly') {
    const youth60 = Math.round(getMedianIncome(1) * 0.60) // 1인 기준
    const personalIncome = input.householdSize === 1 ? incomeWon : Math.round(incomeWon / input.householdSize)
    if (personalIncome <= youth60) {
      const actualRent = input.monthlyRent * 10_000
      const support = Math.min(actualRent, 200_000)
      results.push({
        id: 'youthRent',
        status: 'eligible',
        monthlyAmount: support,
        yearlyAmount: support * 12,
        reason: 'youth_rent_eligible',
      })
    } else if (personalIncome <= getMedianIncome(1)) {
      results.push({
        id: 'youthRent',
        status: 'borderline',
        monthlyAmount: 0,
        yearlyAmount: 0,
        reason: 'youth_rent_income_high',
      })
    } else {
      results.push({
        id: 'youthRent',
        status: 'ineligible',
        monthlyAmount: 0,
        yearlyAmount: 0,
        reason: 'youth_rent_income_over',
      })
    }
  } else {
    results.push({
      id: 'youthRent',
      status: 'ineligible',
      monthlyAmount: 0,
      yearlyAmount: 0,
      reason: input.age < 19 || input.age > 34 ? 'age_not_youth' : 'not_monthly_rent',
    })
  }

  // 9. 한부모가족 양육비 — 한부모 + 중위소득 63% 이하
  if (input.isSingleParent && input.hasMinorChildren) {
    const singleParent63 = Math.round(median * 0.63)
    if (incomeWon <= singleParent63) {
      const childCount = Math.max(input.childrenCount, 1)
      const perChild = 200_000
      results.push({
        id: 'singleParent',
        status: 'eligible',
        monthlyAmount: perChild * childCount,
        yearlyAmount: perChild * childCount * 12,
        reason: 'single_parent_eligible',
      })
    } else if (incomeRatio <= 0.72) {
      results.push({
        id: 'singleParent',
        status: 'borderline',
        monthlyAmount: 0,
        yearlyAmount: 0,
        reason: 'single_parent_income_high',
      })
    } else {
      results.push({
        id: 'singleParent',
        status: 'ineligible',
        monthlyAmount: 0,
        yearlyAmount: 0,
        reason: 'single_parent_income_over',
      })
    }
  } else {
    results.push({
      id: 'singleParent',
      status: 'ineligible',
      monthlyAmount: 0,
      yearlyAmount: 0,
      reason: !input.isSingleParent ? 'not_single_parent' : 'no_children',
    })
  }

  // 10. 청년내일저축계좌 — 19~34세, 근로소득 50~250만원, 중위소득 100% 이하
  if (input.age >= 19 && input.age <= 34) {
    const personalIncome = input.householdSize === 1 ? incomeWon : Math.round(incomeWon / input.householdSize)
    const incomeOk = personalIncome >= 500_000 && personalIncome <= 2_500_000
    if (incomeOk && incomeWon <= median) {
      // 중위소득 50% 이하: 30만원 매칭, 초과: 10만원 매칭
      const matching = incomeRatio <= 0.50 ? 300_000 : 100_000
      results.push({
        id: 'youthSavings',
        status: 'eligible',
        monthlyAmount: matching,
        yearlyAmount: matching * 12,
        reason: 'youth_savings_eligible',
      })
    } else if (input.age >= 19 && input.age <= 34 && incomeWon <= median * 1.1) {
      results.push({
        id: 'youthSavings',
        status: 'borderline',
        monthlyAmount: 0,
        yearlyAmount: 0,
        reason: 'youth_savings_borderline',
      })
    } else {
      results.push({
        id: 'youthSavings',
        status: 'ineligible',
        monthlyAmount: 0,
        yearlyAmount: 0,
        reason: 'youth_savings_ineligible',
      })
    }
  } else {
    results.push({
      id: 'youthSavings',
      status: 'ineligible',
      monthlyAmount: 0,
      yearlyAmount: 0,
      reason: 'age_not_youth',
    })
  }

  // 11. 긴급복지지원 — 위기 상황 (항상 안내만)
  const emergencyAmounts: Record<number, number> = {
    1: 713_000, 2: 1_178_000, 3: 1_508_000, 4: 1_621_000, 5: 1_621_000, 6: 1_621_000,
  }
  const emergencyAmt = emergencyAmounts[Math.min(Math.max(input.householdSize, 1), 6)] ?? 1_621_000
  results.push({
    id: 'emergency',
    status: 'borderline', // 위기 상황은 별도 판정 필요
    monthlyAmount: emergencyAmt,
    yearlyAmount: emergencyAmt * 6, // 최대 6개월
    reason: 'emergency_info',
  })

  // 12. 장애인연금 — 18세 이상 중증장애인
  if (input.isDisabled && input.age >= 18) {
    results.push({
      id: 'disabilityPension',
      status: 'eligible',
      monthlyAmount: 403_000,
      yearlyAmount: 403_000 * 12,
      reason: 'disability_eligible',
    })
  } else {
    results.push({
      id: 'disabilityPension',
      status: 'ineligible',
      monthlyAmount: 0,
      yearlyAmount: 0,
      reason: input.isDisabled ? 'age_under_18' : 'not_disabled',
    })
  }

  return results
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
  const searchParams = useSearchParams()

  // ── State ──
  const [input, setInput] = useState<UserInput>(() => {
    const defaults = { ...DEFAULT_INPUT }
    if (typeof window !== 'undefined') {
      const p = new URLSearchParams(window.location.search)
      if (p.get('size')) defaults.householdSize = parseInt(p.get('size')!) || 4
      if (p.get('income')) defaults.monthlyIncome = parseInt(p.get('income')!) || 200
      if (p.get('assets')) defaults.totalAssets = parseInt(p.get('assets')!) || 5000
      if (p.get('age')) defaults.age = parseInt(p.get('age')!) || 35
      if (p.get('housing')) defaults.housingType = (p.get('housing') as HousingType) || 'monthly'
      if (p.get('rent')) defaults.monthlyRent = parseInt(p.get('rent')!) || 40
      if (p.get('deposit')) defaults.deposit = parseInt(p.get('deposit')!) || 3000
      if (p.get('children') === '1') { defaults.hasMinorChildren = true; defaults.childrenCount = parseInt(p.get('childCount')!) || 1 }
      if (p.get('single') === '1') defaults.isSingleParent = true
      if (p.get('disabled') === '1') defaults.isDisabled = true
      if (p.get('over65') === '1') defaults.isOver65 = true
    }
    return defaults
  })

  const [results, setResults] = useState<ProgramResult[] | null>(null)
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set())
  const [copiedLink, setCopiedLink] = useState(false)

  // ── URL sync ──
  const updateURL = useCallback((params: Record<string, string | number | boolean>) => {
    if (typeof window === 'undefined') return
    const url = new URL(window.location.href)
    Object.entries(params).forEach(([key, value]) => {
      if (value === false || value === '' || value === 0) {
        url.searchParams.delete(key)
      } else {
        url.searchParams.set(key, String(value))
      }
    })
    window.history.replaceState({}, '', url)
  }, [])

  // ── Calculate ──
  const handleCalculate = useCallback(() => {
    const r = calculatePrograms(input)
    setResults(r)
    updateURL({
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

  // Auto-calculate on mount if URL has params
  useEffect(() => {
    if (searchParams.get('size') || searchParams.get('income')) {
      handleCalculate()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Reset ──
  const handleReset = useCallback(() => {
    setInput({ ...DEFAULT_INPUT })
    setResults(null)
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
    const eligible = results.filter(r => r.status === 'eligible')
    const totalMonthly = eligible.reduce((sum, r) => sum + r.monthlyAmount, 0)
    const totalYearly = eligible.reduce((sum, r) => sum + r.yearlyAmount, 0)
    return { eligibleCount: eligible.length, totalMonthly, totalYearly }
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
  }, [])

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
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('title')}</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('description')}</p>
      </div>

      {/* Main Grid */}
      <div className="grid lg:grid-cols-3 gap-8">
        {/* Left: Input Panel */}
        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 space-y-4 sticky top-24">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <Calculator className="w-5 h-5 text-blue-500" />
              {t('input.title')}
            </h2>

            {/* 가구원수 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('input.householdSize')}
              </label>
              <select
                value={input.householdSize}
                onChange={e => updateInput('householdSize', parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
              >
                {[1, 2, 3, 4, 5, 6].map(n => (
                  <option key={n} value={n}>{t('input.persons', { count: n })}</option>
                ))}
              </select>
            </div>

            {/* 월 가구소득 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('input.monthlyIncome')}
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={formatNumber(input.monthlyIncome)}
                  onChange={e => updateInput('monthlyIncome', parseNumberInput(e.target.value))}
                  className="w-full px-3 py-2 pr-12 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-500 dark:text-gray-400">{t('input.manwon')}</span>
              </div>
            </div>

            {/* 총 재산 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('input.totalAssets')}
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={formatNumber(input.totalAssets)}
                  onChange={e => updateInput('totalAssets', parseNumberInput(e.target.value))}
                  className="w-full px-3 py-2 pr-12 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-500 dark:text-gray-400">{t('input.manwon')}</span>
              </div>
            </div>

            {/* 나이 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('input.age')}
              </label>
              <div className="relative">
                <input
                  type="number"
                  min={0}
                  max={120}
                  value={input.age}
                  onChange={e => updateInput('age', parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 pr-10 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-500 dark:text-gray-400">{t('input.years')}</span>
              </div>
            </div>

            {/* 주거 형태 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
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
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
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
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t('input.monthlyRent')}
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={formatNumber(input.monthlyRent)}
                      onChange={e => updateInput('monthlyRent', parseNumberInput(e.target.value))}
                      className="w-full px-3 py-2 pr-12 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-500 dark:text-gray-400">{t('input.manwon')}</span>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t('input.deposit')}
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={formatNumber(input.deposit)}
                      onChange={e => updateInput('deposit', parseNumberInput(e.target.value))}
                      className="w-full px-3 py-2 pr-12 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-500 dark:text-gray-400">{t('input.manwon')}</span>
                  </div>
                </div>
              </div>
            )}

            {input.housingType === 'jeonse' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('input.deposit')}
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={formatNumber(input.deposit)}
                    onChange={e => updateInput('deposit', parseNumberInput(e.target.value))}
                    className="w-full px-3 py-2 pr-12 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-500 dark:text-gray-400">{t('input.manwon')}</span>
                </div>
              </div>
            )}

            {/* Toggle checkboxes */}
            <div className="space-y-3 pt-2 border-t border-gray-200 dark:border-gray-700">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
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
                <span className="text-sm text-gray-700 dark:text-gray-300">{t('input.hasMinorChildren')}</span>
              </label>

              {input.hasMinorChildren && (
                <div className="ml-6">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t('input.childrenCount')}
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={10}
                    value={input.childrenCount}
                    onChange={e => updateInput('childrenCount', parseInt(e.target.value) || 1)}
                    className="w-20 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
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
                <span className="text-sm text-gray-700 dark:text-gray-300">{t('input.isSingleParent')}</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={input.isDisabled}
                  onChange={e => updateInput('isDisabled', e.target.checked)}
                  className="accent-blue-600 w-4 h-4"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">{t('input.isDisabled')}</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={input.isOver65}
                  onChange={e => updateInput('isOver65', e.target.checked)}
                  className="accent-blue-600 w-4 h-4"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">{t('input.isOver65')}</span>
              </label>
            </div>

            {/* Buttons */}
            <div className="flex gap-3 pt-2">
              <button
                onClick={handleCalculate}
                className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg px-4 py-3 font-medium hover:from-blue-700 hover:to-indigo-700 transition-colors flex items-center justify-center gap-2"
              >
                <Calculator className="w-4 h-4" />
                {t('input.calculate')}
              </button>
              <button
                onClick={handleReset}
                className="bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg px-4 py-3 transition-colors"
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
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
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
                <div className="bg-green-50 dark:bg-green-950 rounded-xl p-4 text-center">
                  <div className="text-sm text-green-600 dark:text-green-400 mb-1">{t('result.eligibleCount')}</div>
                  <div className="text-3xl font-bold text-green-700 dark:text-green-300">
                    {summary.eligibleCount}<span className="text-lg">{t('result.programs')}</span>
                  </div>
                </div>
                <div className="bg-blue-50 dark:bg-blue-950 rounded-xl p-4 text-center">
                  <div className="text-sm text-blue-600 dark:text-blue-400 mb-1">{t('result.monthlyTotal')}</div>
                  <div className="text-2xl font-bold text-blue-700 dark:text-blue-300">
                    {formatKoreanMoney(summary.totalMonthly)}
                  </div>
                </div>
                <div className="bg-indigo-50 dark:bg-indigo-950 rounded-xl p-4 text-center">
                  <div className="text-sm text-indigo-600 dark:text-indigo-400 mb-1">{t('result.yearlyTotal')}</div>
                  <div className="text-2xl font-bold text-indigo-700 dark:text-indigo-300">
                    {formatKoreanMoney(summary.totalYearly)}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Median Income Visualization */}
          {results && (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                {t('result.medianComparison')}
              </h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">
                    {t('result.yourIncome')}: {formatNumber(input.monthlyIncome)}{t('input.manwon')}
                  </span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {t('result.medianPercent', { percent: Math.round(incomeRatio * 100) })}
                  </span>
                </div>
                <div className="relative h-8 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  {/* Threshold markers */}
                  {[32, 40, 48, 50, 60, 100].map(pct => (
                    <div
                      key={pct}
                      className="absolute top-0 bottom-0 w-px bg-gray-400 dark:bg-gray-500"
                      style={{ left: `${Math.min(pct, 100)}%` }}
                    >
                      <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-[10px] text-gray-500 dark:text-gray-400 whitespace-nowrap">
                        {pct}%
                      </span>
                    </div>
                  ))}
                  {/* Income bar */}
                  <div
                    className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(incomeRatio * 100, 100)}%` }}
                  />
                </div>
                <div className="flex justify-between text-[10px] text-gray-400 dark:text-gray-500">
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
                    className={`bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden transition-all ${
                      result.status === 'eligible' ? 'ring-2 ring-green-200 dark:ring-green-800' : ''
                    }`}
                  >
                    <button
                      onClick={() => toggleCard(result.id)}
                      className="w-full px-6 py-4 flex items-center gap-4 text-left hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors"
                    >
                      <div className={`flex-shrink-0 ${meta?.color ?? 'text-gray-500'}`}>
                        {meta?.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-gray-900 dark:text-white text-sm">
                            {t(`programs.${result.id}.name`)}
                          </span>
                          <StatusBadge status={result.status} />
                        </div>
                        {result.status === 'eligible' && result.monthlyAmount > 0 && (
                          <div className="text-sm text-green-600 dark:text-green-400 mt-0.5">
                            {t('result.estimatedMonthly')}: {formatKoreanMoney(result.monthlyAmount)}
                          </div>
                        )}
                      </div>
                      <div className="flex-shrink-0 text-gray-400">
                        {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                      </div>
                    </button>

                    {isExpanded && (
                      <div className="px-6 pb-4 border-t border-gray-100 dark:border-gray-700 pt-3 space-y-3">
                        {/* Requirements */}
                        <div>
                          <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase mb-1">
                            {t('result.requirements')}
                          </h4>
                          <p className="text-sm text-gray-700 dark:text-gray-300">
                            {t(`programs.${result.id}.requirements`)}
                          </p>
                        </div>

                        {/* Benefit details */}
                        <div>
                          <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase mb-1">
                            {t('result.benefitDetail')}
                          </h4>
                          <p className="text-sm text-gray-700 dark:text-gray-300">
                            {t(`programs.${result.id}.benefit`)}
                          </p>
                        </div>

                        {/* Amount breakdown for eligible */}
                        {result.status === 'eligible' && result.monthlyAmount > 0 && (
                          <div className="bg-green-50 dark:bg-green-950 rounded-lg p-3">
                            <div className="flex justify-between text-sm">
                              <span className="text-green-700 dark:text-green-300">{t('result.monthlyEstimate')}</span>
                              <span className="font-bold text-green-800 dark:text-green-200">{formatKoreanMoney(result.monthlyAmount)}</span>
                            </div>
                            <div className="flex justify-between text-sm mt-1">
                              <span className="text-green-700 dark:text-green-300">{t('result.yearlyEstimate')}</span>
                              <span className="font-bold text-green-800 dark:text-green-200">{formatKoreanMoney(result.yearlyAmount)}</span>
                            </div>
                          </div>
                        )}

                        {/* How to apply */}
                        <div>
                          <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase mb-1">
                            {t('result.howToApply')}
                          </h4>
                          <p className="text-sm text-gray-700 dark:text-gray-300">
                            {t(`programs.${result.id}.apply`)}
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
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-12 text-center">
              <Shield className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-500 dark:text-gray-400 mb-2">
                {t('result.emptyTitle')}
              </h3>
              <p className="text-sm text-gray-400 dark:text-gray-500">
                {t('result.emptyDescription')}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Guide Section */}
      <GuideSection namespace="governmentSubsidy" />
    </div>
  )
}
