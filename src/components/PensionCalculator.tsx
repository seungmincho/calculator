'use client'

import { useState, useCallback, useMemo, useEffect } from 'react'
import { useSearchParams } from '@/hooks/useSearchParams'
import { useTranslations } from '@/lib/i18n'
import '@/lib/i18n/ns/pensionCalculator'
import { Calculator, Info, ChevronDown, ChevronUp, Link, Check } from 'lucide-react'
import { glassCard, glassInset, glassInput } from '@/lib/glass'
import { INSURANCE, pct } from '@/utils/insuranceRates'
import { A_VALUE, INCOME_CAP, INCOME_FLOOR, YEAR, calcByAge } from '@/utils/nationalPension'

interface PensionResult {
  monthlyPension: number
  annualPension: number
  totalEmployeeContribution: number
  totalMonthlyContribution: number
  monthlyEmployeeContribution: number
  monthlyEmployerContribution: number
  pensionRatio: number
  replacementRate: number
  contributionYears: number
  contributionMonths: number
  eligible: boolean
  startAge: number
}

function formatWon(amount: number): string {
  if (amount >= 100_000_000) {
    const eok = Math.floor(amount / 100_000_000)
    const man = Math.round((amount % 100_000_000) / 10_000)
    if (man === 0) return `${eok.toLocaleString()}억원`
    return `${eok.toLocaleString()}억 ${man.toLocaleString()}만원`
  }
  if (amount >= 10_000) {
    const man = Math.round(amount / 10_000)
    return `${man.toLocaleString()}만원`
  }
  return `${Math.round(amount).toLocaleString()}원`
}

function formatWonExact(amount: number): string {
  return `${Math.round(amount).toLocaleString()}원`
}

function calculatePension(
  currentAge: number,
  monthlyIncomeManwon: number,
  startAge: number,
  retirementAge: number
): PensionResult | null {
  if (
    currentAge <= 0 ||
    monthlyIncomeManwon <= 0 ||
    startAge >= retirementAge ||
    startAge >= currentAge ||
    retirementAge > 70 ||
    currentAge > retirementAge
  ) {
    return null
  }

  const monthlyIncomeWon = monthlyIncomeManwon * 10_000
  // 국민연금법 2026 (계수·A값·상하한·보험료율 인상) — 계산은 utils/nationalPension.ts 공용
  const r = calcByAge(currentAge, monthlyIncomeWon, startAge, retirementAge)
  const monthlyPension = r.basic
  const monthlyEmployeeContribution = Math.round(r.B * INSURANCE.pensionRate)

  return {
    monthlyPension,
    annualPension: monthlyPension * 12,
    totalEmployeeContribution: r.paidSelf,
    totalMonthlyContribution: monthlyEmployeeContribution * 2,
    monthlyEmployeeContribution,
    monthlyEmployerContribution: monthlyEmployeeContribution,
    // 연금/납부 비율: 예상 수령 기간 20년(240개월) 가정
    pensionRatio: r.paidSelf > 0 ? (monthlyPension * 240) / r.paidSelf : 0,
    replacementRate: (monthlyPension / monthlyIncomeWon) * 100,
    contributionYears: r.ownMonths / 12,
    contributionMonths: 0,
    eligible: r.eligible,
    startAge: r.startAge,
  }
}

export default function PensionCalculator() {
  const t = useTranslations('pensionCalculator')
  const searchParams = useSearchParams()
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const [currentAge, setCurrentAge] = useState(30)
  const [monthlyIncome, setMonthlyIncome] = useState(300)
  const [startAge, setStartAge] = useState(27)
  const [retirementAge, setRetirementAge] = useState(65)
  const [result, setResult] = useState<PensionResult | null>(null)
  const [hasCalculated, setHasCalculated] = useState(false)
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    formula: false,
    contribution: false,
    tips: false,
  })

  // URL param sync - read on mount
  useEffect(() => {
    const age = searchParams.get('age')
    const income = searchParams.get('income')
    const start = searchParams.get('start')
    const retire = searchParams.get('retire')
    if (age) setCurrentAge(Number(age))
    if (income) setMonthlyIncome(Number(income))
    if (start) setStartAge(Number(start))
    if (retire) setRetirementAge(Number(retire))
  }, [])

  // URL param sync - write on change
  useEffect(() => {
    if (typeof window === 'undefined') return
    const params = new URLSearchParams()
    params.set('age', String(currentAge))
    params.set('income', String(monthlyIncome))
    params.set('start', String(startAge))
    params.set('retire', String(retirementAge))
    window.history.replaceState({}, '', `${window.location.pathname}?${params}`)
  }, [currentAge, monthlyIncome, startAge, retirementAge])

  const copyLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(window.location.href)
    } catch {
      // fallback
    }
    setCopiedId('link')
    setTimeout(() => setCopiedId(null), 2000)
  }, [])

  const toggleSection = useCallback((key: string) => {
    setOpenSections(prev => ({ ...prev, [key]: !prev[key] }))
  }, [])

  const handleCalculate = useCallback(() => {
    const res = calculatePension(currentAge, monthlyIncome, startAge, retirementAge)
    setResult(res)
    setHasCalculated(true)
  }, [currentAge, monthlyIncome, startAge, retirementAge])

  const handleReset = useCallback(() => {
    setCurrentAge(30)
    setMonthlyIncome(300)
    setStartAge(27)
    setRetirementAge(65)
    setResult(null)
    setHasCalculated(false)
  }, [])

  const isValidInput = useMemo(() => {
    return (
      currentAge > 0 &&
      monthlyIncome > 0 &&
      startAge < retirementAge &&
      startAge < currentAge &&
      retirementAge <= 70 &&
      currentAge <= retirementAge
    )
  }, [currentAge, monthlyIncome, startAge, retirementAge])

  const replacementRateColor = useMemo(() => {
    if (!result) return 'text-sub'
    if (result.replacementRate >= 40) return 'text-green-600 dark:text-green-400'
    if (result.replacementRate >= 25) return 'text-yellow-600 dark:text-yellow-400'
    return 'text-red-600 dark:text-red-400'
  }, [result])

  const guideFormulaSections = [
    { key: 'formula', titleKey: 'guide.formula.title', itemsKey: 'guide.formula.items' },
    { key: 'contribution', titleKey: 'guide.contribution.title', itemsKey: 'guide.contribution.items' },
    { key: 'tips', titleKey: 'guide.tips.title', itemsKey: 'guide.tips.items' },
  ]

  return (
    <div className="space-y-8">
      {/* 헤더 */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg mt-0.5">
            <Calculator className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-fg">{t('title')}</h1>
            <p className="text-sm text-muted mt-1">{t('description')}</p>
          </div>
        </div>
        <button
          onClick={copyLink}
          className="flex items-center gap-1.5 shrink-0 px-3 py-2 text-sm bg-soft hover:bg-gray-200 dark:hover:bg-gray-600 text-body rounded-lg transition-colors"
          title="링크 복사"
        >
          {copiedId === 'link' ? <Check className="w-4 h-4 text-green-500" /> : <Link className="w-4 h-4" />}
          <span className="hidden sm:inline">{copiedId === 'link' ? '복사됨' : '링크 복사'}</span>
        </button>
      </div>

      {/* 메인 그리드: 설정(1/3) + 결과(2/3) */}
      <div className="grid lg:grid-cols-3 gap-8">
        {/* 설정 패널 */}
        <div className="lg:col-span-1">
          <div className={`${glassCard} ${glassInset} p-6 space-y-5`}>
            {/* 현재 나이 */}
            <div>
              <label className="block text-sm font-medium text-body mb-1">
                {t('currentAge')}
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={18}
                  max={70}
                  value={currentAge}
                  onChange={e => setCurrentAge(Number(e.target.value))}
                  className={`w-full px-3 py-2 ${glassInput} focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                />
                <span className="text-sm text-muted whitespace-nowrap">{t('yearsLabel')}</span>
              </div>
            </div>

            {/* 월 소득 */}
            <div>
              <label className="block text-sm font-medium text-body mb-1">
                {t('monthlyIncome')}
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={1}
                  max={INCOME_CAP / 10_000}
                  value={monthlyIncome}
                  onChange={e => setMonthlyIncome(Number(e.target.value))}
                  className={`w-full px-3 py-2 ${glassInput} focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                />
                <span className="text-sm text-muted whitespace-nowrap">{t('manwonUnit')}</span>
              </div>
              <p className="text-xs text-faint mt-1">{t('capHint', { min: INCOME_FLOOR / 10_000, max: INCOME_CAP / 10_000 })}</p>
            </div>

            {/* 가입 시작 나이 */}
            <div>
              <label className="block text-sm font-medium text-body mb-1">
                {t('startAge')}
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={18}
                  max={60}
                  value={startAge}
                  onChange={e => setStartAge(Number(e.target.value))}
                  className={`w-full px-3 py-2 ${glassInput} focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                />
                <span className="text-sm text-muted whitespace-nowrap">{t('yearsLabel')}</span>
              </div>
            </div>

            {/* 은퇴 나이 슬라이더 */}
            <div>
              <label className="block text-sm font-medium text-body mb-1">
                {t('retirementAge')}
                <span className="ml-2 font-bold text-blue-600 dark:text-blue-400">{retirementAge}{t('yearsLabel')}</span>
              </label>
              <input
                type="range"
                min={50}
                max={70}
                step={1}
                value={retirementAge}
                onChange={e => setRetirementAge(Number(e.target.value))}
                className="w-full accent-blue-600"
              />
              <div className="flex justify-between text-xs text-faint mt-1">
                <span>50세</span>
                <span>60세</span>
                <span>70세</span>
              </div>
            </div>

            {/* 버튼 */}
            <div className="space-y-2 pt-2">
              <button
                onClick={handleCalculate}
                disabled={!isValidInput}
                className="w-full bg-primary hover:bg-blue-700 text-white rounded-lg px-4 py-3 font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {t('calculate')}
              </button>
              <button
                onClick={handleReset}
                className="w-full bg-soft hover:bg-gray-200 dark:hover:bg-gray-600 text-body rounded-lg px-4 py-2 font-medium transition-all"
              >
                {t('reset')}
              </button>
            </div>
          </div>
        </div>

        {/* 결과 패널 */}
        <div className="lg:col-span-2 space-y-4">
          {hasCalculated && result ? (
            <>
              {/* 메인 결과 카드 */}
              <div className="bg-primary rounded-xl shadow-lg p-6 text-white" aria-live="polite">
                <p className="text-blue-100 text-sm font-medium mb-2">{t('resultTitle')}</p>
                <p className="text-4xl font-bold mb-1">{formatWon(result.monthlyPension)}</p>
                <p className="text-blue-200 text-sm">{t('monthlyPension')} · {t('startAgeNote', { age: result.startAge })}</p>
                {!result.eligible && <p className="text-blue-100 text-sm mt-2">{t('ineligible')}</p>}
                <div className="mt-4 pt-4 border-t border-blue-500 flex items-center gap-2">
                  <span className="text-blue-100 text-sm">{t('annualPension')}:</span>
                  <span className="text-white font-semibold">{formatWon(result.annualPension)}</span>
                </div>
              </div>

              {/* 납부 기간 */}
              <div className={`${glassCard} ${glassInset} p-6`}>
                <h3 className="text-sm font-semibold text-muted uppercase tracking-wide mb-4">
                  {t('contributionYears')}
                </h3>
                <p className="text-3xl font-bold text-fg">
                  {result.contributionYears}{t('yearsLabel')}
                  {result.contributionMonths > 0 && (
                    <span className="text-xl ml-1">{result.contributionMonths}{t('monthsLabel')}</span>
                  )}
                </p>
              </div>

              {/* 납부액 상세 */}
              <div className={`${glassCard} ${glassInset} p-6`}>
                <h3 className="text-sm font-semibold text-muted uppercase tracking-wide mb-4">
                  납부액 상세
                </h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-sub">{t('employeeContribution', { rate: pct(INSURANCE.pensionRate) })}</span>
                    <span className="font-semibold text-fg">
                      {formatWonExact(result.monthlyEmployeeContribution)}/월
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-sub">{t('employerContribution', { rate: pct(INSURANCE.pensionRate) })}</span>
                    <span className="font-semibold text-muted">
                      {formatWonExact(result.monthlyEmployerContribution)}/월
                    </span>
                  </div>
                  <div className="border-t border-line pt-3 flex justify-between items-center">
                    <span className="text-sm font-medium text-body">{t('totalMonthlyContribution')}</span>
                    <span className="font-bold text-fg">
                      {formatWonExact(result.totalMonthlyContribution)}/월
                    </span>
                  </div>
                  <div className="flex justify-between items-center bg-subtle rounded-lg px-3 py-2">
                    <span className="text-sm font-medium text-sub">{t('totalContribution')}</span>
                    <span className="font-bold text-sub">
                      {formatWon(result.totalEmployeeContribution)}
                    </span>
                  </div>
                </div>
              </div>

              {/* 소득대체율 & 연금비율 */}
              <div className="grid sm:grid-cols-2 gap-4">
                <div className={`${glassCard} ${glassInset} p-6`}>
                  <p className="text-sm text-muted mb-1">{t('replacementRate')}</p>
                  <p className={`text-3xl font-bold ${replacementRateColor}`}>
                    {result.replacementRate.toFixed(1)}%
                  </p>
                  <p className="text-xs text-faint mt-2">
                    목표: 40% 이상
                  </p>
                  {/* 소득대체율 바 */}
                  <div className="mt-3 h-2 bg-track rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full transition-all"
                      style={{ width: `${Math.min(100, result.replacementRate / 70 * 100)}%` }}
                    />
                  </div>
                </div>
                <div className={`${glassCard} ${glassInset} p-6`}>
                  <p className="text-sm text-muted mb-1">{t('pensionRatio')}</p>
                  <p className="text-3xl font-bold text-fg">
                    {result.pensionRatio.toFixed(2)}배
                  </p>
                  <p className="text-xs text-faint mt-2">
                    20년 수령 기준
                  </p>
                </div>
              </div>
            </>
          ) : hasCalculated && !result ? (
            <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-xl p-6">
              <p className="text-red-700 dark:text-red-300 font-medium">입력값을 확인해주세요.</p>
              <ul className="text-sm text-red-600 dark:text-red-400 mt-2 space-y-1 list-disc list-inside">
                <li>현재 나이는 가입 시작 나이보다 커야 합니다</li>
                <li>은퇴 나이는 현재 나이보다 커야 합니다</li>
                <li>은퇴 나이는 70세 이하여야 합니다</li>
              </ul>
            </div>
          ) : (
            <div className={`${glassCard} ${glassInset} p-12 flex flex-col items-center justify-center text-center space-y-4`}>
              <div className="p-4 bg-subtle rounded-full">
                <Calculator className="w-12 h-12 text-blue-400 dark:text-blue-500" />
              </div>
              <div>
                <p className="text-lg font-medium text-body">
                  정보를 입력하고 계산하기를 눌러주세요
                </p>
                <p className="text-sm text-faint mt-1">
                  예상 국민연금 수령액을 계산합니다
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 참고 안내 */}
      <div className="bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-xl p-4 flex gap-3">
        <Info className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">{t('noticeTitle')}</p>
          <p className="text-sm text-amber-700 dark:text-amber-400 mt-1">{t('notice')}</p>
          <p className="text-xs text-sub mt-2">
            {t('basis', { year: YEAR, a: A_VALUE.toLocaleString('ko-KR'), rate: pct(INSURANCE.pensionRateTotal), min: INCOME_FLOOR / 10_000, max: INCOME_CAP / 10_000 })}
          </p>
        </div>
      </div>

      {/* 가이드 섹션 */}
      <div className={`${glassCard} ${glassInset} p-6`}>
        <h2 className="text-xl font-semibold text-fg mb-4">
          {t('guide.title')}
        </h2>
        <div className="space-y-3">
          {guideFormulaSections.map(({ key, titleKey, itemsKey }) => (
            <div key={key} className="border border-line rounded-lg overflow-hidden">
              <button
                onClick={() => toggleSection(key)}
                className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-gray-750 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-left"
                aria-expanded={openSections[key]}
              >
                <span className="font-medium text-fg text-sm">
                  {t(titleKey as Parameters<typeof t>[0])}
                </span>
                {openSections[key]
                  ? <ChevronUp className="w-4 h-4 text-gray-500" />
                  : <ChevronDown className="w-4 h-4 text-gray-500" />
                }
              </button>
              {openSections[key] && (
                <ul className="px-4 py-3 space-y-2">
                  {(t.raw(itemsKey as Parameters<typeof t.raw>[0]) as string[]).map((item, idx) => (
                    <li key={idx} className="flex gap-2 text-sm text-sub">
                      <span className="text-blue-500 flex-shrink-0">•</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
