'use client'

import { useState, useCallback, useMemo } from 'react'
import { useTranslations } from 'next-intl'
import { Plus, Trash2, ChevronDown, ChevronUp, Baby, Calculator, RefreshCw } from 'lucide-react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Line,
  ComposedChart,
} from 'recharts'
import GuideSection from '@/components/GuideSection'

// ── 2026 수당 기준 상수 ──────────────────────────────────────────────────────
const PARENT_PAY_AGE0 = 1_000_000       // 부모급여 만 0세 (월)
const PARENT_PAY_AGE1 = 500_000         // 부모급여 만 1세 (월)
const CHILD_ALLOWANCE = 100_000         // 아동수당 만 0~8세 (월)
const CHILDCARE_DAYCARE_AGE0 = 514_000  // 만 0세 보육료 (월)
const CHILDCARE_DAYCARE_AGE1 = 452_000  // 만 1세 보육료 (월)
const CHILDCARE_ALLOWANCE_AGE0 = 200_000  // 양육수당 만 0세 (월)
const CHILDCARE_ALLOWANCE_AGE1 = 150_000  // 양육수당 만 1세 (월)
const CHILDCARE_ALLOWANCE_AGE2_5 = 100_000 // 양육수당 만 2~5세 (월)
const WELCOME_GRANT = 2_000_000          // 첫만남이용권 (출생 1회)
const WELCOME_GRANT_TWINS = 4_000_000    // 쌍둥이 첫만남이용권

interface ChildEntry {
  id: string
  birthYear: string
  birthMonth: string
  usesDaycare: boolean
}

interface BenefitBreakdown {
  parentPay: number        // 부모급여 (현금)
  childAllowance: number   // 아동수당
  childcareAllowance: number // 양육수당
  daycareSubsidy: number   // 보육료 바우처 (참고용)
  total: number
  ageYears: number
  ageMonths: number
  ageLabel: string
}

function getAgeInMonths(birthYear: number, birthMonth: number): number {
  const now = new Date()
  const birth = new Date(birthYear, birthMonth - 1, 1)
  return (now.getFullYear() - birth.getFullYear()) * 12 + (now.getMonth() - birth.getMonth())
}

function calcBenefits(ageInMonths: number, usesDaycare: boolean): BenefitBreakdown {
  const ageYears = Math.floor(ageInMonths / 12)
  const remainMonths = ageInMonths % 12
  const ageLabel = `만 ${ageYears}세 ${remainMonths}개월`

  let parentPay = 0
  let childcareAllowance = 0
  let daycareSubsidy = 0
  let childAllowance = 0

  if (ageInMonths < 12) {
    // 만 0세
    if (usesDaycare) {
      daycareSubsidy = CHILDCARE_DAYCARE_AGE0
      parentPay = Math.max(0, PARENT_PAY_AGE0 - CHILDCARE_DAYCARE_AGE0)
    } else {
      parentPay = PARENT_PAY_AGE0
      childcareAllowance = 0 // 부모급여 받으면 양육수당 별도 없음
    }
  } else if (ageInMonths < 24) {
    // 만 1세
    if (usesDaycare) {
      daycareSubsidy = CHILDCARE_DAYCARE_AGE1
      parentPay = Math.max(0, PARENT_PAY_AGE1 - CHILDCARE_DAYCARE_AGE1)
    } else {
      parentPay = PARENT_PAY_AGE1
      childcareAllowance = 0 // 부모급여 받으면 양육수당 별도 없음
    }
  } else if (ageInMonths < 72) {
    // 만 2세~5세
    if (usesDaycare) {
      daycareSubsidy = CHILDCARE_DAYCARE_AGE1 // 보육료 바우처 (참고)
    } else {
      childcareAllowance = CHILDCARE_ALLOWANCE_AGE2_5
    }
  }
  // 만 6세 이상은 부모급여/양육수당 없음

  // 아동수당: 만 0~8세 (96개월 미만)
  if (ageInMonths < 96) {
    childAllowance = CHILD_ALLOWANCE
  }

  const total = parentPay + childAllowance + childcareAllowance

  return {
    parentPay,
    childAllowance,
    childcareAllowance,
    daycareSubsidy,
    total,
    ageYears,
    ageMonths: remainMonths,
    ageLabel,
  }
}

function buildTimelineData() {
  // 가정: 어린이집 미이용 기준 연령별 월 수령액
  const rows = []
  for (let ageYears = 0; ageYears <= 8; ageYears++) {
    const ageInMonths = ageYears * 12
    const b = calcBenefits(ageInMonths, false)
    rows.push({
      age: `${ageYears}세`,
      부모급여: b.parentPay,
      아동수당: b.childAllowance,
      양육수당: b.childcareAllowance,
      월합계: b.total,
    })
  }
  return rows
}

function formatKRW(amount: number): string {
  if (amount === 0) return '0원'
  if (amount >= 10_000) {
    const man = Math.floor(amount / 10_000)
    const rest = amount % 10_000
    if (rest === 0) return `${man.toLocaleString()}만원`
    return `${man.toLocaleString()}만 ${rest.toLocaleString()}원`
  }
  return `${amount.toLocaleString()}원`
}

function calcCumulative(usesDaycare: boolean): number {
  let total = WELCOME_GRANT
  for (let m = 0; m < 96; m++) {
    const b = calcBenefits(m, usesDaycare)
    total += b.total
  }
  return total
}

const COLORS = {
  parentPay: '#6366f1',
  childAllowance: '#22c55e',
  childcareAllowance: '#f59e0b',
}

export default function ChildBenefitCalculator() {
  const t = useTranslations('childBenefit')

  const [children, setChildren] = useState<ChildEntry[]>([
    { id: '1', birthYear: '', birthMonth: '', usesDaycare: false },
  ])
  const [calculated, setCalculated] = useState(false)
  const [showApply, setShowApply] = useState(false)

  const addChild = useCallback(() => {
    if (children.length >= 5) return
    setChildren(prev => [
      ...prev,
      { id: Date.now().toString(), birthYear: '', birthMonth: '', usesDaycare: false },
    ])
    setCalculated(false)
  }, [children.length])

  const removeChild = useCallback((id: string) => {
    setChildren(prev => prev.filter(c => c.id !== id))
    setCalculated(false)
  }, [])

  const updateChild = useCallback((id: string, field: keyof ChildEntry, value: string | boolean) => {
    setChildren(prev => prev.map(c => (c.id === id ? { ...c, [field]: value } : c)))
    setCalculated(false)
  }, [])

  const reset = useCallback(() => {
    setChildren([{ id: '1', birthYear: '', birthMonth: '', usesDaycare: false }])
    setCalculated(false)
    setShowApply(false)
    const url = new URL(window.location.href)
    url.searchParams.delete('children')
    window.history.replaceState({}, '', url)
  }, [])

  const handleCalculate = useCallback(() => {
    const valid = children.every(c => c.birthYear && c.birthMonth)
    if (!valid) return
    setCalculated(true)

    // URL sync
    try {
      const url = new URL(window.location.href)
      const encoded = JSON.stringify(
        children.map(c => ({ y: c.birthYear, m: c.birthMonth, d: c.usesDaycare ? 1 : 0 }))
      )
      url.searchParams.set('children', btoa(encoded))
      window.history.replaceState({}, '', url)
    } catch {
      // ignore
    }
  }, [children])

  const results = useMemo((): BenefitBreakdown[] => {
    if (!calculated) return []
    return children.map(c => {
      if (!c.birthYear || !c.birthMonth) return null
      const ageInMonths = getAgeInMonths(Number(c.birthYear), Number(c.birthMonth))
      if (ageInMonths < 0) return null
      return calcBenefits(ageInMonths, c.usesDaycare)
    }).filter((r): r is BenefitBreakdown => r !== null)
  }, [calculated, children])

  const monthlyTotal = useMemo(() => results.reduce((s, r) => s + r.total, 0), [results])
  const yearlyTotal = useMemo(() => monthlyTotal * 12, [monthlyTotal])

  const timelineData = useMemo(() => buildTimelineData(), [])

  const cumulativeNoDay = useMemo(() => calcCumulative(false), [])

  const applyMethods = useMemo(() => {
    try {
      return t.raw('applyMethods') as string[]
    } catch {
      return []
    }
  }, [t])

  const currentYear = new Date().getFullYear()
  const yearOptions = Array.from({ length: 9 }, (_, i) => currentYear - i)
  const monthOptions = Array.from({ length: 12 }, (_, i) => i + 1)

  const allValid = children.every(c => c.birthYear && c.birthMonth)

  return (
    <div className="space-y-8">
      {/* 헤더 */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <Baby className="w-7 h-7 text-blue-600" />
          {t('title')}
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('description')}</p>
      </div>

      {/* 히어로 통계 카드 3개 */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-indigo-50 dark:bg-indigo-950 rounded-xl p-5 text-center">
          <div className="text-xs text-indigo-600 dark:text-indigo-400 font-medium mb-1">{t('hero.parentPay')}</div>
          <div className="text-2xl font-bold text-indigo-700 dark:text-indigo-300">{t('hero.parentPayAmount')}</div>
          <div className="text-xs text-indigo-500 dark:text-indigo-400 mt-1">{t('hero.parentPaySub')}</div>
        </div>
        <div className="bg-green-50 dark:bg-green-950 rounded-xl p-5 text-center">
          <div className="text-xs text-green-600 dark:text-green-400 font-medium mb-1">{t('hero.childAllowance')}</div>
          <div className="text-2xl font-bold text-green-700 dark:text-green-300">{t('hero.childAllowanceAmount')}</div>
          <div className="text-xs text-green-500 dark:text-green-400 mt-1">{t('hero.childAllowanceSub')}</div>
        </div>
        <div className="bg-amber-50 dark:bg-amber-950 rounded-xl p-5 text-center">
          <div className="text-xs text-amber-600 dark:text-amber-400 font-medium mb-1">{t('hero.welcomeGrant')}</div>
          <div className="text-2xl font-bold text-amber-700 dark:text-amber-300">{t('hero.welcomeGrantAmount')}</div>
          <div className="text-xs text-amber-500 dark:text-amber-400 mt-1">{t('hero.welcomeGrantSub')}</div>
        </div>
      </div>

      {/* 메인 그리드 */}
      <div className="grid lg:grid-cols-3 gap-8">
        {/* 입력 패널 */}
        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 space-y-5">
            <h2 className="font-semibold text-gray-900 dark:text-white">{t('inputTitle')}</h2>

            <div className="space-y-4">
              {children.map((child, idx) => (
                <div key={child.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      {t('childLabel', { n: idx + 1 })}
                    </span>
                    {children.length > 1 && (
                      <button
                        onClick={() => removeChild(child.id)}
                        className="text-red-400 hover:text-red-600 transition-colors"
                        aria-label={t('removeChild')}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  {/* 생년월 선택 */}
                  <div>
                    <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">{t('birthDate')}</label>
                    <div className="flex gap-2">
                      <select
                        value={child.birthYear}
                        onChange={e => updateChild(child.id, 'birthYear', e.target.value)}
                        className="flex-1 px-2 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      >
                        <option value="">{t('selectYear')}</option>
                        {yearOptions.map(y => (
                          <option key={y} value={y}>{y}{t('year')}</option>
                        ))}
                      </select>
                      <select
                        value={child.birthMonth}
                        onChange={e => updateChild(child.id, 'birthMonth', e.target.value)}
                        className="w-24 px-2 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      >
                        <option value="">{t('selectMonth')}</option>
                        {monthOptions.map(m => (
                          <option key={m} value={m}>{m}{t('month')}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* 어린이집 이용 여부 */}
                  <div className="flex items-center justify-between">
                    <label className="text-sm text-gray-700 dark:text-gray-300">{t('usesDaycare')}</label>
                    <button
                      onClick={() => updateChild(child.id, 'usesDaycare', !child.usesDaycare)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 ${
                        child.usesDaycare ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'
                      }`}
                      role="switch"
                      aria-checked={child.usesDaycare}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                          child.usesDaycare ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* 자녀 추가 */}
            {children.length < 5 && (
              <button
                onClick={addChild}
                className="w-full flex items-center justify-center gap-2 py-2 border-2 border-dashed border-blue-300 dark:border-blue-700 text-blue-600 dark:text-blue-400 rounded-lg hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-950 transition-colors text-sm"
              >
                <Plus className="w-4 h-4" />
                {t('addChild')}
              </button>
            )}

            {/* 버튼 */}
            <div className="flex gap-2 pt-2">
              <button
                onClick={handleCalculate}
                disabled={!allValid}
                className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg px-4 py-3 font-medium hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                <Calculator className="w-4 h-4" />
                {t('calculate')}
              </button>
              <button
                onClick={reset}
                className="px-3 py-3 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg transition-colors"
                aria-label={t('reset')}
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* 결과 패널 */}
        <div className="lg:col-span-2 space-y-6">
          {calculated && results.length > 0 ? (
            <>
              {/* 월/연 합계 요약 */}
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
                <h2 className="font-semibold text-gray-900 dark:text-white mb-4">{t('summaryTitle')}</h2>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-blue-50 dark:bg-blue-950 rounded-xl p-4 text-center">
                    <div className="text-xs text-blue-600 dark:text-blue-400 mb-1">{t('monthlyTotal')}</div>
                    <div className="text-3xl font-bold text-blue-700 dark:text-blue-300">
                      {formatKRW(monthlyTotal)}
                    </div>
                    <div className="text-xs text-blue-500 dark:text-blue-400 mt-1">{t('perMonth')}</div>
                  </div>
                  <div className="bg-indigo-50 dark:bg-indigo-950 rounded-xl p-4 text-center">
                    <div className="text-xs text-indigo-600 dark:text-indigo-400 mb-1">{t('yearlyTotal')}</div>
                    <div className="text-3xl font-bold text-indigo-700 dark:text-indigo-300">
                      {formatKRW(yearlyTotal)}
                    </div>
                    <div className="text-xs text-indigo-500 dark:text-indigo-400 mt-1">{t('perYear')}</div>
                  </div>
                </div>
              </div>

              {/* 자녀별 상세 카드 */}
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
                <h2 className="font-semibold text-gray-900 dark:text-white mb-4">{t('detailTitle')}</h2>
                <div className="space-y-4">
                  {results.map((r, i) => (
                    <div key={i} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <span className="font-medium text-gray-900 dark:text-white">
                          {t('childLabel', { n: i + 1 })} — {r.ageLabel}
                        </span>
                        <span className="text-lg font-bold text-blue-600 dark:text-blue-400">
                          {t('monthSuffix', { amount: formatKRW(r.total) })}
                        </span>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-sm">
                        <div className="text-center">
                          <div className="text-xs text-gray-500 dark:text-gray-400">{t('parentPayLabel')}</div>
                          <div className="font-semibold text-indigo-600 dark:text-indigo-400">
                            {r.parentPay > 0 ? formatKRW(r.parentPay) : '-'}
                          </div>
                        </div>
                        <div className="text-center">
                          <div className="text-xs text-gray-500 dark:text-gray-400">{t('childAllowanceLabel')}</div>
                          <div className="font-semibold text-green-600 dark:text-green-400">
                            {r.childAllowance > 0 ? formatKRW(r.childAllowance) : '-'}
                          </div>
                        </div>
                        <div className="text-center">
                          <div className="text-xs text-gray-500 dark:text-gray-400">{t('childcareAllowanceLabel')}</div>
                          <div className="font-semibold text-amber-600 dark:text-amber-400">
                            {r.childcareAllowance > 0 ? formatKRW(r.childcareAllowance) : '-'}
                          </div>
                        </div>
                      </div>
                      {children[i]?.usesDaycare && r.daycareSubsidy > 0 && (
                        <div className="mt-2 text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-700 rounded px-3 py-1.5">
                          {t('daycareNote', { amount: formatKRW(r.daycareSubsidy) })}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* 신청 안내 */}
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
                <button
                  onClick={() => setShowApply(v => !v)}
                  className="w-full flex items-center justify-between text-left"
                >
                  <h2 className="font-semibold text-gray-900 dark:text-white">{t('applyTitle')}</h2>
                  {showApply ? (
                    <ChevronUp className="w-5 h-5 text-gray-400" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-gray-400" />
                  )}
                </button>
                {showApply && applyMethods.length > 0 && (
                  <ul className="mt-4 space-y-2">
                    {applyMethods.map((method, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300">
                        <span className="mt-0.5 w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400 flex items-center justify-center text-xs font-bold shrink-0">
                          {i + 1}
                        </span>
                        {method}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </>
          ) : (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-10 flex flex-col items-center justify-center text-center text-gray-400 dark:text-gray-500 min-h-48">
              <Baby className="w-12 h-12 mb-3 opacity-40" />
              <p className="text-sm">{t('placeholder')}</p>
            </div>
          )}

          {/* 연령별 타임라인 차트 */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
            <h2 className="font-semibold text-gray-900 dark:text-white mb-1">{t('timelineTitle')}</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">{t('timelineSub')}</p>
            <ResponsiveContainer width="100%" height={280}>
              <ComposedChart data={timelineData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-700" />
                <XAxis
                  dataKey="age"
                  tick={{ fontSize: 12, fill: 'currentColor' }}
                  className="text-gray-600 dark:text-gray-400"
                />
                <YAxis
                  yAxisId="left"
                  tickFormatter={v => `${(v / 10000).toFixed(0)}만`}
                  tick={{ fontSize: 11, fill: 'currentColor' }}
                  className="text-gray-600 dark:text-gray-400"
                />
                <Tooltip
                  formatter={(value) => [formatKRW(Number(value)), '']}
                  contentStyle={{ fontSize: 12 }}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar yAxisId="left" dataKey="부모급여" stackId="a" fill={COLORS.parentPay} />
                <Bar yAxisId="left" dataKey="아동수당" stackId="a" fill={COLORS.childAllowance} />
                <Bar yAxisId="left" dataKey="양육수당" stackId="a" fill={COLORS.childcareAllowance} />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="월합계"
                  stroke="#ef4444"
                  strokeWidth={2}
                  dot={false}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          {/* 총 누적 수령액 */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl p-6 text-white">
            <h2 className="font-semibold mb-3">{t('cumulativeTitle')}</h2>
            <div className="text-4xl font-bold mb-1">
              {formatKRW(cumulativeNoDay)}
            </div>
            <p className="text-blue-200 text-sm">{t('cumulativeSub')}</p>
          </div>
        </div>
      </div>

      {/* 가이드 섹션 */}
      <GuideSection namespace="childBenefit" />
    </div>
  )
}
