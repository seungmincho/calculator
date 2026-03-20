'use client'

import { useState, useCallback, useEffect, useMemo } from 'react'
import { useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Copy, Check, BookOpen, Baby, Users, Clock, ChevronDown, ChevronUp, Share2, AlertTriangle, Info } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

// ── Types ──
interface MonthlyBenefit {
  month: number
  payRate: number
  cap: number
  benefit: number
  vsWage: number
  isEnhanced: boolean
  isLowerLimit: boolean
  isUpperLimit: boolean
}

interface IndividualResult {
  months: MonthlyBenefit[]
  totalBenefit: number
  monthlyAverage: number
  incomeReplacement: number
  incomeLoss: number
  wage: number
}

interface CoupleResult {
  father: IndividualResult
  mother: IndividualResult
  combinedTotal: number
  timeline: TimelineMonth[]
}

interface TimelineMonth {
  monthLabel: string
  fatherBenefit: number
  motherBenefit: number
  fatherActive: boolean
  motherActive: boolean
  fatherEnhanced: boolean
  motherEnhanced: boolean
}

interface ReducedHoursResult {
  first10hBenefit: number
  remainingBenefit: number
  totalBenefit: number
  companyPay: number
  totalIncome: number
  reducedHours: number
}

// ── Helpers ──
const formatNumber = (num: number): string => {
  return Math.floor(num).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}

const parseCommaNumber = (str: string): number => {
  return parseInt(str.replace(/,/g, ''), 10) || 0
}

const formatCommaInput = (value: string): string => {
  const num = value.replace(/[^\d]/g, '')
  if (!num) return ''
  return parseInt(num, 10).toLocaleString('ko-KR')
}

const getCurrentMonth = (): string => {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

const monthDiff = (startYM: string, endYM: string): number => {
  const [sy, sm] = startYM.split('-').map(Number)
  const [ey, em] = endYM.split('-').map(Number)
  return (ey - sy) * 12 + (em - sm)
}

// ── Calculation Logic ──
const SIX_PLUS_SIX_CAPS = [2500000, 2500000, 3000000, 3500000, 4000000, 4500000]
const MIN_BENEFIT = 700000

function calcIndividual(
  wage: number,
  duration: number,
  isSixPlusSix: boolean,
  childBirth?: string,
  leaveStart?: string,
): IndividualResult {
  const months: MonthlyBenefit[] = []

  for (let i = 1; i <= duration; i++) {
    let payRate: number
    let cap: number
    let isEnhanced = false

    if (isSixPlusSix && i <= 6) {
      payRate = 1.0
      cap = SIX_PLUS_SIX_CAPS[i - 1]
      isEnhanced = true
    } else if (i <= 3) {
      payRate = 1.0
      cap = 2500000
    } else if (i <= 6) {
      payRate = 1.0
      cap = 2000000
    } else {
      payRate = 0.8
      cap = 1600000
    }

    let benefit = Math.min(wage * payRate, cap)
    const isUpperLimit = wage * payRate > cap
    const isLowerLimit = benefit < MIN_BENEFIT && wage > 0
    benefit = Math.max(benefit, MIN_BENEFIT)
    if (wage === 0) benefit = 0

    months.push({
      month: i,
      payRate,
      cap,
      benefit,
      vsWage: wage > 0 ? (benefit / wage) * 100 : 0,
      isEnhanced,
      isLowerLimit,
      isUpperLimit,
    })
  }

  const totalBenefit = months.reduce((s, m) => s + m.benefit, 0)
  const monthlyAverage = duration > 0 ? totalBenefit / duration : 0
  const incomeReplacement = wage > 0 ? (monthlyAverage / wage) * 100 : 0
  const incomeLoss = wage * duration - totalBenefit

  return { months, totalBenefit, monthlyAverage, incomeReplacement, incomeLoss, wage }
}

function calcCouple(
  fatherWage: number,
  motherWage: number,
  fatherStart: string,
  motherStart: string,
  fatherDuration: number,
  motherDuration: number,
  childBirth: string,
): CoupleResult {
  // Check 6+6 eligibility: child <= 18 months at either parent's leave start
  const childAge1 = fatherStart ? monthDiff(childBirth, fatherStart) : 999
  const childAge2 = motherStart ? monthDiff(childBirth, motherStart) : 999
  const sixPlusSixEligible = childBirth && Math.min(childAge1, childAge2) <= 18

  const fatherResult = calcIndividual(fatherWage, fatherDuration, !!sixPlusSixEligible, childBirth, fatherStart)
  const motherResult = calcIndividual(motherWage, motherDuration, !!sixPlusSixEligible, childBirth, motherStart)

  // Build timeline
  const baseMonth = fatherStart && motherStart
    ? (fatherStart < motherStart ? fatherStart : motherStart)
    : fatherStart || motherStart || getCurrentMonth()

  const [baseY, baseM] = baseMonth.split('-').map(Number)
  const fatherOffset = fatherStart ? monthDiff(baseMonth, fatherStart) : 0
  const motherOffset = motherStart ? monthDiff(baseMonth, motherStart) : 0
  const totalMonths = Math.max(fatherOffset + fatherDuration, motherOffset + motherDuration)

  const timeline: TimelineMonth[] = []
  for (let i = 0; i < totalMonths; i++) {
    const calMonth = baseM + i
    const y = baseY + Math.floor((calMonth - 1) / 12)
    const m = ((calMonth - 1) % 12) + 1

    const fatherMonthIdx = i - fatherOffset
    const motherMonthIdx = i - motherOffset
    const fatherActive = fatherMonthIdx >= 0 && fatherMonthIdx < fatherDuration
    const motherActive = motherMonthIdx >= 0 && motherMonthIdx < motherDuration

    const fatherBenefit = fatherActive ? (fatherResult.months[fatherMonthIdx]?.benefit ?? 0) : 0
    const motherBenefit = motherActive ? (motherResult.months[motherMonthIdx]?.benefit ?? 0) : 0
    const fatherEnhanced = fatherActive && (fatherResult.months[fatherMonthIdx]?.isEnhanced ?? false)
    const motherEnhanced = motherActive && (motherResult.months[motherMonthIdx]?.isEnhanced ?? false)

    timeline.push({
      monthLabel: `${y}.${String(m).padStart(2, '0')}`,
      fatherBenefit,
      motherBenefit,
      fatherActive,
      motherActive,
      fatherEnhanced,
      motherEnhanced,
    })
  }

  return {
    father: fatherResult,
    mother: motherResult,
    combinedTotal: fatherResult.totalBenefit + motherResult.totalBenefit,
    timeline,
  }
}

function calcReducedHours(wage: number, beforeHours: number, afterHours: number): ReducedHoursResult {
  const reducedHours = beforeHours - afterHours
  if (reducedHours <= 0 || beforeHours <= 0) {
    return { first10hBenefit: 0, remainingBenefit: 0, totalBenefit: 0, companyPay: 0, totalIncome: 0, reducedHours: 0 }
  }

  const first10h = Math.min(reducedHours, 10)
  const remainingH = Math.max(reducedHours - 10, 0)

  const first10hBenefit = Math.min(wage * (first10h / beforeHours), 550000)
  const remainingBenefit = remainingH > 0
    ? Math.min(wage * (remainingH / beforeHours) * 0.8, 1500000)
    : 0
  const totalBenefit = first10hBenefit + remainingBenefit
  const companyPay = wage * (afterHours / beforeHours)
  const totalIncome = totalBenefit + companyPay

  return { first10hBenefit, remainingBenefit, totalBenefit, companyPay, totalIncome, reducedHours }
}

// ── Component ──
export default function ParentalLeaveCalculator() {
  const t = useTranslations('parentalLeave')
  const searchParams = useSearchParams()

  // Tab state
  const [activeTab, setActiveTab] = useState<'individual' | 'couple'>('individual')

  // Individual tab inputs
  const [wage, setWage] = useState('')
  const [isAnnual, setIsAnnual] = useState(false)
  const [leaveStart, setLeaveStart] = useState(getCurrentMonth())
  const [leaveDuration, setLeaveDuration] = useState(12)
  const [isSixPlusSix, setIsSixPlusSix] = useState(false)
  const [childBirth, setChildBirth] = useState('')
  const [spouseLeaveStart, setSpouseLeaveStart] = useState('')
  const [spouseLeaveDuration, setSpouseLeaveDuration] = useState(6)

  // Couple tab inputs
  const [fatherWage, setFatherWage] = useState('')
  const [motherWage, setMotherWage] = useState('')
  const [fatherStart, setFatherStart] = useState('')
  const [motherStart, setMotherStart] = useState('')
  const [fatherDuration, setFatherDuration] = useState(6)
  const [motherDuration, setMotherDuration] = useState(12)
  const [coupleChildBirth, setCoupleChildBirth] = useState('')

  // Reduced hours
  const [showReducedHours, setShowReducedHours] = useState(false)
  const [beforeHours, setBeforeHours] = useState(40)
  const [afterHours, setAfterHours] = useState(25)

  // Copy state
  const [copiedId, setCopiedId] = useState<string | null>(null)

  // ── URL State Sync ──
  useEffect(() => {
    const w = searchParams.get('wage')
    const tp = searchParams.get('type')
    const dur = searchParams.get('duration')
    const six = searchParams.get('sixPlusSix')
    const cb = searchParams.get('childBirth')
    const st = searchParams.get('start')

    if (w) setWage(formatCommaInput(w))
    if (tp === 'annual') setIsAnnual(true)
    if (dur) setLeaveDuration(Math.min(18, Math.max(1, parseInt(dur) || 12)))
    if (six === '1') setIsSixPlusSix(true)
    if (cb) setChildBirth(cb)
    if (st) setLeaveStart(st)
  }, [searchParams])

  const updateURL = useCallback((params: Record<string, string>) => {
    const url = new URL(window.location.href)
    Object.entries(params).forEach(([key, value]) => {
      if (value) {
        url.searchParams.set(key, value)
      } else {
        url.searchParams.delete(key)
      }
    })
    window.history.replaceState({}, '', url.toString())
  }, [])

  // ── Compute individual result ──
  const individualResult = useMemo(() => {
    const rawWage = parseCommaNumber(wage)
    const monthlyWage = isAnnual ? Math.floor(rawWage / 12) : rawWage
    if (monthlyWage <= 0) return null

    // Check 6+6 eligibility: 자녀 생년월 필수, 생후 18개월 이내
    let eligible66 = isSixPlusSix && !!childBirth
    if (eligible66 && childBirth && leaveStart) {
      const childAgeAtStart = monthDiff(childBirth, leaveStart)
      if (childAgeAtStart > 18) eligible66 = false
    }

    return calcIndividual(monthlyWage, leaveDuration, eligible66, childBirth, leaveStart)
  }, [wage, isAnnual, leaveDuration, isSixPlusSix, childBirth, leaveStart])

  // ── Compute couple result ──
  const coupleResult = useMemo(() => {
    const fw = parseCommaNumber(fatherWage)
    const mw = parseCommaNumber(motherWage)
    if (fw <= 0 && mw <= 0) return null
    if (!fatherStart && !motherStart) return null

    return calcCouple(fw, mw, fatherStart, motherStart, fatherDuration, motherDuration, coupleChildBirth)
  }, [fatherWage, motherWage, fatherStart, motherStart, fatherDuration, motherDuration, coupleChildBirth])

  // ── Reduced hours ──
  const reducedResult = useMemo(() => {
    const monthlyWage = isAnnual ? Math.floor(parseCommaNumber(wage) / 12) : parseCommaNumber(wage)
    if (monthlyWage <= 0) return null
    return calcReducedHours(monthlyWage, beforeHours, afterHours)
  }, [wage, isAnnual, beforeHours, afterHours])

  // ── 6+6 eligibility warning ──
  const sixPlusSixWarning = useMemo(() => {
    if (!isSixPlusSix || !childBirth || !leaveStart) return null
    const age = monthDiff(childBirth, leaveStart)
    if (age > 18) return t('warnings.childOver18Months')
    return null
  }, [isSixPlusSix, childBirth, leaveStart, t])

  // ── Chart data ──
  const chartData = useMemo(() => {
    if (!individualResult) return []
    const monthlyWage = individualResult.wage
    return individualResult.months.map((m) => ({
      name: `${m.month}${t('results.monthUnit')}`,
      benefit: Math.floor(m.benefit / 10000),
      wage: Math.floor(monthlyWage / 10000),
    }))
  }, [individualResult, t])

  const coupleChartData = useMemo(() => {
    if (!coupleResult) return []
    return coupleResult.timeline.map((m) => ({
      name: m.monthLabel,
      father: Math.floor(m.fatherBenefit / 10000),
      mother: Math.floor(m.motherBenefit / 10000),
    }))
  }, [coupleResult])

  // ── Copy handler ──
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

  // ── Share handler ──
  const handleShare = useCallback(() => {
    const rawWage = parseCommaNumber(wage)
    updateURL({
      wage: String(rawWage),
      type: isAnnual ? 'annual' : 'monthly',
      duration: String(leaveDuration),
      sixPlusSix: isSixPlusSix ? '1' : '0',
      childBirth: childBirth || '',
      start: leaveStart || '',
    })
    copyToClipboard(window.location.href, 'share')
  }, [wage, isAnnual, leaveDuration, isSixPlusSix, childBirth, leaveStart, updateURL, copyToClipboard])

  // ── Wage change handler with comma formatting ──
  const handleWageChange = useCallback((value: string, setter: (v: string) => void) => {
    setter(formatCommaInput(value))
  }, [])

  // Duration options
  const durationOptions = Array.from({ length: 18 }, (_, i) => i + 1)

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <Baby className="w-7 h-7 text-pink-500" />
          {t('title')}
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('description')}</p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 dark:border-gray-700">
        <button
          onClick={() => setActiveTab('individual')}
          className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'individual'
              ? 'border-blue-500 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
          }`}
        >
          {t('tabs.individual')}
        </button>
        <button
          onClick={() => setActiveTab('couple')}
          className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'couple'
              ? 'border-blue-500 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
          }`}
        >
          <Users className="w-4 h-4 inline mr-1" />
          {t('tabs.couple')}
        </button>
      </div>

      {/* Tab 1: Individual */}
      {activeTab === 'individual' && (
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Settings Panel */}
          <div className="lg:col-span-1">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 space-y-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{t('inputs.settings')}</h2>

              {/* Wage input */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('inputs.ordinaryWage')}
                </label>
                <div className="flex items-center gap-2 mb-2">
                  <label className="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isAnnual}
                      onChange={(e) => setIsAnnual(e.target.checked)}
                      className="accent-blue-600"
                    />
                    {t('inputs.inputAsAnnual')}
                  </label>
                </div>
                <div className="relative">
                  <input
                    type="text"
                    inputMode="numeric"
                    value={wage}
                    onChange={(e) => handleWageChange(e.target.value, setWage)}
                    placeholder={t('inputs.ordinaryWagePlaceholder')}
                    aria-label={t('inputs.ordinaryWage')}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 pr-10"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">
                    {t('inputs.won')}
                  </span>
                </div>
                {isAnnual && wage && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {t('inputs.monthlyConverted')}: {formatNumber(Math.floor(parseCommaNumber(wage) / 12))}{t('inputs.won')}
                  </p>
                )}
              </div>

              {/* Leave start month */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('inputs.leaveStartMonth')}
                </label>
                <input
                  type="month"
                  value={leaveStart}
                  onChange={(e) => setLeaveStart(e.target.value)}
                  aria-label={t('inputs.leaveStartMonth')}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Leave duration */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('inputs.leaveDuration')}
                </label>
                <select
                  value={leaveDuration}
                  onChange={(e) => setLeaveDuration(parseInt(e.target.value))}
                  aria-label={t('inputs.leaveDuration')}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                >
                  {durationOptions.map((n) => (
                    <option key={n} value={n}>
                      {n}{t('inputs.monthsLabel')}
                    </option>
                  ))}
                </select>
              </div>

              {/* 6+6 toggle */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('inputs.sixPlusSix')}
                </label>
                <div className="flex gap-3">
                  <label className="flex items-center gap-1 cursor-pointer">
                    <input
                      type="radio"
                      name="sixPlusSix"
                      checked={isSixPlusSix}
                      onChange={() => setIsSixPlusSix(true)}
                      className="accent-blue-600"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">{t('inputs.apply')}</span>
                  </label>
                  <label className="flex items-center gap-1 cursor-pointer">
                    <input
                      type="radio"
                      name="sixPlusSix"
                      checked={!isSixPlusSix}
                      onChange={() => setIsSixPlusSix(false)}
                      className="accent-blue-600"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">{t('inputs.notApply')}</span>
                  </label>
                </div>
              </div>

              {/* Conditional 6+6 fields */}
              {isSixPlusSix && (
                <div className="space-y-4 border-l-2 border-pink-300 dark:border-pink-700 pl-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      {t('inputs.childBirthMonth')}
                    </label>
                    <input
                      type="month"
                      value={childBirth}
                      onChange={(e) => setChildBirth(e.target.value)}
                      aria-label={t('inputs.childBirthMonth')}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      {t('inputs.spouseLeaveStart')}
                    </label>
                    <input
                      type="month"
                      value={spouseLeaveStart}
                      onChange={(e) => setSpouseLeaveStart(e.target.value)}
                      aria-label={t('inputs.spouseLeaveStart')}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      {t('inputs.spouseLeaveDuration')}
                    </label>
                    <select
                      value={spouseLeaveDuration}
                      onChange={(e) => setSpouseLeaveDuration(parseInt(e.target.value))}
                      aria-label={t('inputs.spouseLeaveDuration')}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                    >
                      {durationOptions.map((n) => (
                        <option key={n} value={n}>
                          {n}{t('inputs.monthsLabel')}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {/* 6+6 eligibility warning */}
              {sixPlusSixWarning && (
                <div className="flex items-start gap-2 bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
                  <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-yellow-700 dark:text-yellow-300">{sixPlusSixWarning}</p>
                </div>
              )}

              {/* Abolished post-pay info */}
              <div className="flex items-start gap-2 bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
                <Info className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-gray-500 dark:text-gray-400 line-through">
                  {t('warnings.abolishedPostPay')}
                </p>
              </div>

              {/* Share button */}
              <button
                onClick={handleShare}
                className="w-full flex items-center justify-center gap-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors"
              >
                {copiedId === 'share' ? <Check className="w-4 h-4" /> : <Share2 className="w-4 h-4" />}
                {copiedId === 'share' ? t('shared') : t('share')}
              </button>
            </div>
          </div>

          {/* Results Panel */}
          <div className="lg:col-span-2 space-y-6">
            {individualResult ? (
              <>
                {/* Summary Cards */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <SummaryCard
                    label={t('results.totalBenefit')}
                    value={`${formatNumber(individualResult.totalBenefit)}${t('inputs.won')}`}
                    sub={`${formatNumber(Math.floor(individualResult.totalBenefit / 10000))}${t('results.manwon')}`}
                    color="blue"
                  />
                  <SummaryCard
                    label={t('results.monthlyAverage')}
                    value={`${formatNumber(Math.floor(individualResult.monthlyAverage))}${t('inputs.won')}`}
                    color="green"
                  />
                  <SummaryCard
                    label={t('results.incomeReplacement')}
                    value={`${individualResult.incomeReplacement.toFixed(1)}%`}
                    color="purple"
                  />
                  <SummaryCard
                    label={t('results.incomeLoss')}
                    value={`${formatNumber(individualResult.incomeLoss)}${t('inputs.won')}`}
                    sub={`${formatNumber(Math.floor(individualResult.incomeLoss / 10000))}${t('results.manwon')}`}
                    color="red"
                  />
                </div>

                {/* Monthly Table */}
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{t('results.monthlyTable')}</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm" aria-label={t('results.monthlyTable')}>
                      <thead>
                        <tr className="border-b border-gray-200 dark:border-gray-700">
                          <th scope="col" className="text-left py-2 px-2 text-gray-500 dark:text-gray-400 font-medium">{t('results.monthCol')}</th>
                          <th scope="col" className="text-right py-2 px-2 text-gray-500 dark:text-gray-400 font-medium">{t('results.payRate')}</th>
                          <th scope="col" className="text-right py-2 px-2 text-gray-500 dark:text-gray-400 font-medium">{t('results.cap')}</th>
                          <th scope="col" className="text-right py-2 px-2 text-gray-500 dark:text-gray-400 font-medium">{t('results.actualBenefit')}</th>
                          <th scope="col" className="text-right py-2 px-2 text-gray-500 dark:text-gray-400 font-medium">{t('results.vsWage')}</th>
                          <th scope="col" className="text-center py-2 px-2 text-gray-500 dark:text-gray-400 font-medium">{t('results.note')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {individualResult.months.map((m) => (
                          <tr key={m.month} className={`border-b border-gray-100 dark:border-gray-700 ${m.isEnhanced ? 'bg-pink-50 dark:bg-pink-950' : ''}`}>
                            <th scope="row" className="py-2 px-2 text-gray-900 dark:text-white font-medium">
                              {m.month}{t('results.monthUnit')}
                            </th>
                            <td className="text-right py-2 px-2 text-gray-700 dark:text-gray-300">{Math.floor(m.payRate * 100)}%</td>
                            <td className="text-right py-2 px-2 text-gray-700 dark:text-gray-300">{formatNumber(m.cap)}</td>
                            <td className="text-right py-2 px-2 font-semibold text-blue-600 dark:text-blue-400">{formatNumber(m.benefit)}</td>
                            <td className="text-right py-2 px-2 text-gray-700 dark:text-gray-300">{m.vsWage.toFixed(1)}%</td>
                            <td className="text-center py-2 px-2">
                              {m.isEnhanced && (
                                <span className="inline-block text-xs bg-pink-100 dark:bg-pink-900 text-pink-700 dark:text-pink-300 rounded px-1.5 py-0.5">
                                  {t('results.enhanced')}
                                </span>
                              )}
                              {m.isLowerLimit && (
                                <span className="inline-block text-xs bg-orange-100 dark:bg-orange-900 text-orange-700 dark:text-orange-300 rounded px-1.5 py-0.5">
                                  {t('results.lowerLimit')}
                                </span>
                              )}
                              {m.isUpperLimit && !m.isLowerLimit && (
                                <span className="inline-block text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded px-1.5 py-0.5">
                                  {t('results.upperLimit')}
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {/* Copy summary */}
                  <div className="mt-4 flex justify-end">
                    <button
                      onClick={() => {
                        const lines = individualResult.months.map(
                          (m) => `${m.month}${t('results.monthUnit')}: ${formatNumber(m.benefit)}${t('inputs.won')} (${m.vsWage.toFixed(1)}%)`
                        )
                        lines.push(`---`)
                        lines.push(`${t('results.totalBenefit')}: ${formatNumber(individualResult.totalBenefit)}${t('inputs.won')}`)
                        lines.push(`${t('results.monthlyAverage')}: ${formatNumber(Math.floor(individualResult.monthlyAverage))}${t('inputs.won')}`)
                        lines.push(`${t('results.incomeReplacement')}: ${individualResult.incomeReplacement.toFixed(1)}%`)
                        copyToClipboard(lines.join('\n'), 'table')
                      }}
                      className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                    >
                      {copiedId === 'table' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      {copiedId === 'table' ? t('copied') : t('copyResult')}
                    </button>
                  </div>
                </div>

                {/* Bar Chart */}
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{t('results.chartTitle')}</h3>
                  <div className="h-80" aria-label={t('results.chartTitle')}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                        <YAxis tick={{ fontSize: 12 }} tickFormatter={(v: number) => `${v}`} label={{ value: t('results.manwonUnit'), angle: -90, position: 'insideLeft', style: { fontSize: 12 } }} />
                        <Tooltip formatter={(value, name) => [`${value}${t('results.manwonUnit')}`, (name as string) === 'wage' ? t('results.wageLabel') : t('results.benefitLabel')]} />
                        <Legend formatter={(value: string) => (value === 'wage' ? t('results.wageLabel') : t('results.benefitLabel'))} />
                        <Bar dataKey="wage" fill="#d1d5db" name="wage" radius={[2, 2, 0, 0]} />
                        <Bar dataKey="benefit" fill="#3b82f6" name="benefit" radius={[2, 2, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </>
            ) : (
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-12 text-center">
                <Baby className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                <p className="text-gray-500 dark:text-gray-400">{t('results.placeholder')}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 2: Couple */}
      {activeTab === 'couple' && (
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Couple Settings */}
          <div className="lg:col-span-1 space-y-4">
            {/* Father */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 space-y-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <span className="w-6 h-6 bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300 rounded-full flex items-center justify-center text-xs font-bold">{t('couple.fatherShort')}</span>
                {t('couple.fatherSection')}
              </h2>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('inputs.fatherWage')}</label>
                <div className="relative">
                  <input
                    type="text"
                    inputMode="numeric"
                    value={fatherWage}
                    onChange={(e) => handleWageChange(e.target.value, setFatherWage)}
                    placeholder={t('inputs.ordinaryWagePlaceholder')}
                    aria-label={t('inputs.fatherWage')}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 pr-10"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">{t('inputs.won')}</span>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('inputs.fatherLeaveStart')}</label>
                <input
                  type="month"
                  value={fatherStart}
                  onChange={(e) => setFatherStart(e.target.value)}
                  aria-label={t('inputs.fatherLeaveStart')}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('inputs.fatherLeaveDuration')}</label>
                <select
                  value={fatherDuration}
                  onChange={(e) => setFatherDuration(parseInt(e.target.value))}
                  aria-label={t('inputs.fatherLeaveDuration')}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                >
                  {durationOptions.map((n) => (
                    <option key={n} value={n}>{n}{t('inputs.monthsLabel')}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Mother */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 space-y-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <span className="w-6 h-6 bg-pink-100 dark:bg-pink-900 text-pink-600 dark:text-pink-300 rounded-full flex items-center justify-center text-xs font-bold">{t('couple.motherShort')}</span>
                {t('couple.motherSection')}
              </h2>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('inputs.motherWage')}</label>
                <div className="relative">
                  <input
                    type="text"
                    inputMode="numeric"
                    value={motherWage}
                    onChange={(e) => handleWageChange(e.target.value, setMotherWage)}
                    placeholder={t('inputs.ordinaryWagePlaceholder')}
                    aria-label={t('inputs.motherWage')}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 pr-10"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">{t('inputs.won')}</span>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('inputs.motherLeaveStart')}</label>
                <input
                  type="month"
                  value={motherStart}
                  onChange={(e) => setMotherStart(e.target.value)}
                  aria-label={t('inputs.motherLeaveStart')}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('inputs.motherLeaveDuration')}</label>
                <select
                  value={motherDuration}
                  onChange={(e) => setMotherDuration(parseInt(e.target.value))}
                  aria-label={t('inputs.motherLeaveDuration')}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                >
                  {durationOptions.map((n) => (
                    <option key={n} value={n}>{n}{t('inputs.monthsLabel')}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Child birth */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 space-y-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{t('inputs.childBirthMonth')}</h2>
              <input
                type="month"
                value={coupleChildBirth}
                onChange={(e) => setCoupleChildBirth(e.target.value)}
                aria-label={t('inputs.childBirthMonth')}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400">{t('couple.childBirthHint')}</p>
            </div>
          </div>

          {/* Couple Results */}
          <div className="lg:col-span-2 space-y-6">
            {coupleResult ? (
              <>
                {/* Combined Summary */}
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{t('couple.summary')}</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm" aria-label={t('couple.summary')}>
                      <thead>
                        <tr className="border-b border-gray-200 dark:border-gray-700">
                          <th scope="col" className="text-left py-2 px-3 text-gray-500 dark:text-gray-400 font-medium">{t('couple.item')}</th>
                          <th scope="col" className="text-right py-2 px-3 text-blue-600 dark:text-blue-400 font-medium">{t('couple.father')}</th>
                          <th scope="col" className="text-right py-2 px-3 text-pink-600 dark:text-pink-400 font-medium">{t('couple.mother')}</th>
                          <th scope="col" className="text-right py-2 px-3 text-gray-900 dark:text-white font-medium">{t('couple.total')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="border-b border-gray-100 dark:border-gray-700">
                          <th scope="row" className="text-left py-2 px-3 text-gray-700 dark:text-gray-300">{t('couple.period')}</th>
                          <td className="text-right py-2 px-3 text-gray-900 dark:text-white">{fatherDuration}{t('inputs.monthsLabel')}</td>
                          <td className="text-right py-2 px-3 text-gray-900 dark:text-white">{motherDuration}{t('inputs.monthsLabel')}</td>
                          <td className="text-right py-2 px-3 text-gray-900 dark:text-white font-semibold">{fatherDuration + motherDuration}{t('inputs.monthsLabel')}</td>
                        </tr>
                        <tr className="border-b border-gray-100 dark:border-gray-700">
                          <th scope="row" className="text-left py-2 px-3 text-gray-700 dark:text-gray-300">{t('results.totalBenefit')}</th>
                          <td className="text-right py-2 px-3 text-blue-600 dark:text-blue-400 font-semibold">{formatNumber(coupleResult.father.totalBenefit)}</td>
                          <td className="text-right py-2 px-3 text-pink-600 dark:text-pink-400 font-semibold">{formatNumber(coupleResult.mother.totalBenefit)}</td>
                          <td className="text-right py-2 px-3 text-gray-900 dark:text-white font-bold">{formatNumber(coupleResult.combinedTotal)}</td>
                        </tr>
                        <tr className="border-b border-gray-100 dark:border-gray-700">
                          <th scope="row" className="text-left py-2 px-3 text-gray-700 dark:text-gray-300">{t('results.monthlyAverage')}</th>
                          <td className="text-right py-2 px-3 text-gray-900 dark:text-white">{formatNumber(Math.floor(coupleResult.father.monthlyAverage))}</td>
                          <td className="text-right py-2 px-3 text-gray-900 dark:text-white">{formatNumber(Math.floor(coupleResult.mother.monthlyAverage))}</td>
                          <td className="text-right py-2 px-3 text-gray-500 dark:text-gray-400">-</td>
                        </tr>
                        <tr>
                          <th scope="row" className="text-left py-2 px-3 text-gray-700 dark:text-gray-300">{t('results.incomeReplacement')}</th>
                          <td className="text-right py-2 px-3 text-gray-900 dark:text-white">{coupleResult.father.incomeReplacement.toFixed(1)}%</td>
                          <td className="text-right py-2 px-3 text-gray-900 dark:text-white">{coupleResult.mother.incomeReplacement.toFixed(1)}%</td>
                          <td className="text-right py-2 px-3 text-gray-500 dark:text-gray-400">-</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Timeline */}
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{t('couple.timeline')}</h3>
                  <div className="overflow-x-auto">
                    <div className="min-w-[600px]">
                      {/* Father row */}
                      <div className="flex items-center gap-2 mb-3">
                        <span className="w-8 text-sm font-medium text-blue-600 dark:text-blue-400 flex-shrink-0">{t('couple.father')}</span>
                        <div className="flex-1 flex gap-0.5">
                          {coupleResult.timeline.map((m, i) => (
                            <div
                              key={`f-${i}`}
                              className={`flex-1 h-10 rounded-sm flex items-center justify-center text-xs font-medium ${
                                m.fatherActive
                                  ? m.fatherEnhanced
                                    ? 'bg-blue-500 text-white'
                                    : 'bg-blue-300 dark:bg-blue-700 text-blue-900 dark:text-blue-100'
                                  : 'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500'
                              }`}
                              title={m.fatherActive ? `${formatNumber(m.fatherBenefit)}${t('inputs.won')}` : ''}
                            >
                              {m.fatherActive ? `${Math.floor(m.fatherBenefit / 10000)}` : ''}
                            </div>
                          ))}
                        </div>
                      </div>
                      {/* Mother row */}
                      <div className="flex items-center gap-2 mb-2">
                        <span className="w-8 text-sm font-medium text-pink-600 dark:text-pink-400 flex-shrink-0">{t('couple.mother')}</span>
                        <div className="flex-1 flex gap-0.5">
                          {coupleResult.timeline.map((m, i) => (
                            <div
                              key={`m-${i}`}
                              className={`flex-1 h-10 rounded-sm flex items-center justify-center text-xs font-medium ${
                                m.motherActive
                                  ? m.motherEnhanced
                                    ? 'bg-pink-500 text-white'
                                    : 'bg-pink-300 dark:bg-pink-700 text-pink-900 dark:text-pink-100'
                                  : 'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500'
                              }`}
                              title={m.motherActive ? `${formatNumber(m.motherBenefit)}${t('inputs.won')}` : ''}
                            >
                              {m.motherActive ? `${Math.floor(m.motherBenefit / 10000)}` : ''}
                            </div>
                          ))}
                        </div>
                      </div>
                      {/* Month labels */}
                      <div className="flex items-center gap-2">
                        <span className="w-8 flex-shrink-0" />
                        <div className="flex-1 flex gap-0.5">
                          {coupleResult.timeline.map((m, i) => (
                            <div key={`l-${i}`} className="flex-1 text-center text-xs text-gray-400 dark:text-gray-500 truncate">
                              {m.monthLabel}
                            </div>
                          ))}
                        </div>
                      </div>
                      {/* Legend */}
                      <div className="flex flex-wrap gap-4 mt-4 text-xs text-gray-500 dark:text-gray-400">
                        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-blue-500" /> {t('couple.fatherEnhanced')}</span>
                        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-blue-300 dark:bg-blue-700" /> {t('couple.fatherStandard')}</span>
                        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-pink-500" /> {t('couple.motherEnhanced')}</span>
                        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-pink-300 dark:bg-pink-700" /> {t('couple.motherStandard')}</span>
                        <span className="text-gray-400">({t('results.manwonUnit')})</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Couple Chart */}
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{t('couple.householdIncome')}</h3>
                  <div className="h-72" aria-label={t('couple.householdIncome')}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={coupleChartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis dataKey="name" tick={{ fontSize: 11 }} angle={-45} textAnchor="end" height={60} />
                        <YAxis tick={{ fontSize: 12 }} label={{ value: t('results.manwonUnit'), angle: -90, position: 'insideLeft', style: { fontSize: 12 } }} />
                        <Tooltip formatter={(value, name) => [`${value}${t('results.manwonUnit')}`, (name as string) === 'father' ? t('couple.father') : t('couple.mother')]} />
                        <Legend formatter={(value: string) => (value === 'father' ? t('couple.father') : t('couple.mother'))} />
                        <Bar dataKey="father" stackId="a" fill="#3b82f6" name="father" />
                        <Bar dataKey="mother" stackId="a" fill="#ec4899" name="mother" radius={[2, 2, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </>
            ) : (
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-12 text-center">
                <Users className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                <p className="text-gray-500 dark:text-gray-400">{t('couple.placeholder')}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Reduced Hours Section */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg">
        <button
          onClick={() => setShowReducedHours(!showReducedHours)}
          className="w-full flex items-center justify-between px-6 py-4 text-left"
          aria-expanded={showReducedHours}
        >
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-green-500" />
            <span className="text-lg font-semibold text-gray-900 dark:text-white">{t('reducedHours.title')}</span>
          </div>
          {showReducedHours ? (
            <ChevronUp className="w-5 h-5 text-gray-400" />
          ) : (
            <ChevronDown className="w-5 h-5 text-gray-400" />
          )}
        </button>

        {showReducedHours && (
          <div className="px-6 pb-6 space-y-4 border-t border-gray-100 dark:border-gray-700 pt-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">{t('reducedHours.description')}</p>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('reducedHours.beforeHours')}
                </label>
                <select
                  value={beforeHours}
                  onChange={(e) => setBeforeHours(parseInt(e.target.value))}
                  aria-label={t('reducedHours.beforeHours')}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                >
                  {[40, 35, 30].map((h) => (
                    <option key={h} value={h}>{h}{t('reducedHours.hoursPerWeek')}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('reducedHours.afterHours')}
                </label>
                <select
                  value={afterHours}
                  onChange={(e) => setAfterHours(parseInt(e.target.value))}
                  aria-label={t('reducedHours.afterHours')}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                >
                  {Array.from({ length: beforeHours - 14 }, (_, i) => 15 + i).map((h) => (
                    <option key={h} value={h}>{h}{t('reducedHours.hoursPerWeek')}</option>
                  ))}
                </select>
              </div>
            </div>

            {reducedResult && reducedResult.reducedHours > 0 && (
              <div className="bg-green-50 dark:bg-green-950 rounded-xl p-4 space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">{t('reducedHours.reducedTime')}</span>
                  <span className="font-medium text-gray-900 dark:text-white">{reducedResult.reducedHours}{t('reducedHours.hoursPerWeek')}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">{t('reducedHours.first10h')}</span>
                  <span className="font-medium text-gray-900 dark:text-white">{formatNumber(Math.floor(reducedResult.first10hBenefit))}{t('inputs.won')}</span>
                </div>
                {reducedResult.remainingBenefit > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">{t('reducedHours.remaining')}</span>
                    <span className="font-medium text-gray-900 dark:text-white">{formatNumber(Math.floor(reducedResult.remainingBenefit))}{t('inputs.won')}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">{t('reducedHours.govBenefit')}</span>
                  <span className="font-medium text-green-700 dark:text-green-400">{formatNumber(Math.floor(reducedResult.totalBenefit))}{t('inputs.won')}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">{t('reducedHours.companyPay')}</span>
                  <span className="font-medium text-gray-900 dark:text-white">{formatNumber(Math.floor(reducedResult.companyPay))}{t('inputs.won')}</span>
                </div>
                <div className="border-t border-green-200 dark:border-green-800 pt-2 flex justify-between text-sm font-semibold">
                  <span className="text-gray-700 dark:text-gray-300">{t('reducedHours.totalIncome')}</span>
                  <span className="text-green-700 dark:text-green-400">{formatNumber(Math.floor(reducedResult.totalIncome))}{t('inputs.won')}</span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Guide Section */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
          <BookOpen className="w-5 h-5" />
          {t('guide.title')}
        </h2>
        <div className="space-y-6">
          {/* 2025 Changes */}
          <div>
            <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-3">{t('guide.changes2025.title')}</h3>
            <ul className="space-y-2">
              {(t.raw('guide.changes2025.items') as string[]).map((item, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <span className="text-blue-500 mt-1 flex-shrink-0">&#8226;</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>

          {/* General vs 6+6 */}
          <div>
            <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-3">{t('guide.comparison.title')}</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th scope="col" className="text-left py-2 px-2 text-gray-500 dark:text-gray-400 font-medium">{t('guide.comparison.monthCol')}</th>
                    <th scope="col" className="text-right py-2 px-2 text-gray-500 dark:text-gray-400 font-medium">{t('guide.comparison.general')}</th>
                    <th scope="col" className="text-right py-2 px-2 text-pink-500 font-medium">{t('guide.comparison.sixPlusSix')}</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { months: '1~2', general: '100% (250)', six: '100% (250)' },
                    { months: '3', general: '100% (250)', six: '100% (300)' },
                    { months: '4', general: '100% (200)', six: '100% (350)' },
                    { months: '5', general: '100% (200)', six: '100% (400)' },
                    { months: '6', general: '100% (200)', six: '100% (450)' },
                    { months: '7~18', general: '80% (160)', six: '80% (160)' },
                  ].map((row) => (
                    <tr key={row.months} className="border-b border-gray-100 dark:border-gray-700">
                      <td className="py-2 px-2 text-gray-700 dark:text-gray-300">{row.months}{t('results.monthUnit')}</td>
                      <td className="text-right py-2 px-2 text-gray-700 dark:text-gray-300">{row.general}{t('results.manwonUnit')}</td>
                      <td className="text-right py-2 px-2 text-pink-600 dark:text-pink-400 font-medium">{row.six}{t('results.manwonUnit')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">{t('guide.comparison.note')}</p>
          </div>

          {/* Eligibility */}
          <div>
            <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-3">{t('guide.eligibility.title')}</h3>
            <ul className="space-y-2">
              {(t.raw('guide.eligibility.items') as string[]).map((item, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
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

// ── Summary Card Component ──
function SummaryCard({ label, value, sub, color }: { label: string; value: string; sub?: string; color: 'blue' | 'green' | 'purple' | 'red' }) {
  const colorMap = {
    blue: 'bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800',
    green: 'bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800',
    purple: 'bg-purple-50 dark:bg-purple-950 border-purple-200 dark:border-purple-800',
    red: 'bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800',
  }

  return (
    <div className={`rounded-xl border p-4 ${colorMap[color]}`}>
      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{label}</p>
      <p className="text-lg font-bold text-gray-900 dark:text-white leading-tight">{value}</p>
      {sub && <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{sub}</p>}
    </div>
  )
}
