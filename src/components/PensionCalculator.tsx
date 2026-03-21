'use client'

import { useState, useCallback, useMemo, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Calculator, Info, ChevronDown, ChevronUp, Link, Check } from 'lucide-react'

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
}

const A_VALUE = 2_860_000 // 2024년 기준 전체 가입자 평균 소득 (원)
const UPPER_INCOME_LIMIT = 6_170_000 // 2024년 상한 기준소득월액 (원)
const CONTRIBUTION_RATE = 0.09
const EMPLOYEE_RATE = 0.045

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
  // 상한액 적용
  const cappedIncome = Math.min(monthlyIncomeWon, UPPER_INCOME_LIMIT)

  const totalMonths = (retirementAge - startAge) * 12
  const contributionYears = retirementAge - startAge
  const contributionMonths = totalMonths % 12

  // 기본연금액 간이 계산
  // 기본연금액 = 1.2 × (A + B) × (가입월수 / 480)
  // B값 = 가입자 본인 평균 기준소득월액 (현재 소득으로 대체)
  const bValue = cappedIncome
  const baseFormula = 1.2 * (A_VALUE + bValue) * (totalMonths / 480)

  // 20년 초과 가산 (초과 12개월마다 5%)
  const extraMonths = Math.max(0, totalMonths - 240)
  const extraBonus = baseFormula * 0.05 * (extraMonths / 12)

  const monthlyPension = Math.round(baseFormula + extraBonus)
  const annualPension = monthlyPension * 12

  const monthlyEmployeeContribution = Math.round(cappedIncome * EMPLOYEE_RATE)
  const monthlyEmployerContribution = Math.round(cappedIncome * EMPLOYEE_RATE)
  const totalMonthlyContribution = Math.round(cappedIncome * CONTRIBUTION_RATE)
  const totalEmployeeContribution = monthlyEmployeeContribution * totalMonths

  // 연금/납부 비율: 예상 수령 기간을 20년(240개월)으로 가정
  const expectedReceiveMonths = 240
  const totalExpectedPension = monthlyPension * expectedReceiveMonths
  const pensionRatio = totalEmployeeContribution > 0
    ? (totalExpectedPension / totalEmployeeContribution)
    : 0

  // 소득대체율 (월 연금 / 월 소득)
  const replacementRate = monthlyIncomeWon > 0
    ? (monthlyPension / monthlyIncomeWon) * 100
    : 0

  return {
    monthlyPension,
    annualPension,
    totalEmployeeContribution,
    totalMonthlyContribution,
    monthlyEmployeeContribution,
    monthlyEmployerContribution,
    pensionRatio,
    replacementRate,
    contributionYears,
    contributionMonths,
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
    if (!result) return 'text-gray-600 dark:text-gray-300'
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
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('title')}</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('description')}</p>
          </div>
        </div>
        <button
          onClick={copyLink}
          className="flex items-center gap-1.5 shrink-0 px-3 py-2 text-sm bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg transition-colors"
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
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 space-y-5">
            {/* 현재 나이 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('currentAge')}
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={18}
                  max={70}
                  value={currentAge}
                  onChange={e => setCurrentAge(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <span className="text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap">{t('yearsLabel')}</span>
              </div>
            </div>

            {/* 월 소득 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('monthlyIncome')}
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={1}
                  max={617}
                  value={monthlyIncome}
                  onChange={e => setMonthlyIncome(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <span className="text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap">{t('manwonUnit')}</span>
              </div>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">상한: 617만원</p>
            </div>

            {/* 가입 시작 나이 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('startAge')}
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={18}
                  max={60}
                  value={startAge}
                  onChange={e => setStartAge(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <span className="text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap">{t('yearsLabel')}</span>
              </div>
            </div>

            {/* 은퇴 나이 슬라이더 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
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
              <div className="flex justify-between text-xs text-gray-400 dark:text-gray-500 mt-1">
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
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg px-4 py-3 font-medium hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {t('calculate')}
              </button>
              <button
                onClick={handleReset}
                className="w-full bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg px-4 py-2 font-medium transition-all"
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
              <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-xl shadow-lg p-6 text-white">
                <p className="text-blue-100 text-sm font-medium mb-2">{t('resultTitle')}</p>
                <p className="text-4xl font-bold mb-1">{formatWon(result.monthlyPension)}</p>
                <p className="text-blue-200 text-sm">{t('monthlyPension')}</p>
                <div className="mt-4 pt-4 border-t border-blue-500 flex items-center gap-2">
                  <span className="text-blue-100 text-sm">{t('annualPension')}:</span>
                  <span className="text-white font-semibold">{formatWon(result.annualPension)}</span>
                </div>
              </div>

              {/* 납부 기간 */}
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
                <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-4">
                  {t('contributionYears')}
                </h3>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">
                  {result.contributionYears}{t('yearsLabel')}
                  {result.contributionMonths > 0 && (
                    <span className="text-xl ml-1">{result.contributionMonths}{t('monthsLabel')}</span>
                  )}
                </p>
              </div>

              {/* 납부액 상세 */}
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
                <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-4">
                  납부액 상세
                </h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600 dark:text-gray-300">{t('employeeContribution')}</span>
                    <span className="font-semibold text-gray-900 dark:text-white">
                      {formatWonExact(result.monthlyEmployeeContribution)}/월
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600 dark:text-gray-300">{t('employerContribution')}</span>
                    <span className="font-semibold text-gray-500 dark:text-gray-400">
                      {formatWonExact(result.monthlyEmployerContribution)}/월
                    </span>
                  </div>
                  <div className="border-t border-gray-200 dark:border-gray-700 pt-3 flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-200">{t('totalMonthlyContribution')}</span>
                    <span className="font-bold text-gray-900 dark:text-white">
                      {formatWonExact(result.totalMonthlyContribution)}/월
                    </span>
                  </div>
                  <div className="flex justify-between items-center bg-blue-50 dark:bg-blue-950 rounded-lg px-3 py-2">
                    <span className="text-sm font-medium text-blue-700 dark:text-blue-300">{t('totalContribution')}</span>
                    <span className="font-bold text-blue-700 dark:text-blue-300">
                      {formatWon(result.totalEmployeeContribution)}
                    </span>
                  </div>
                </div>
              </div>

              {/* 소득대체율 & 연금비율 */}
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">{t('replacementRate')}</p>
                  <p className={`text-3xl font-bold ${replacementRateColor}`}>
                    {result.replacementRate.toFixed(1)}%
                  </p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
                    목표: 40% 이상
                  </p>
                  {/* 소득대체율 바 */}
                  <div className="mt-3 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full transition-all"
                      style={{ width: `${Math.min(100, result.replacementRate / 70 * 100)}%` }}
                    />
                  </div>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">{t('pensionRatio')}</p>
                  <p className="text-3xl font-bold text-gray-900 dark:text-white">
                    {result.pensionRatio.toFixed(2)}배
                  </p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
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
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-12 flex flex-col items-center justify-center text-center space-y-4">
              <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-full">
                <Calculator className="w-12 h-12 text-blue-400 dark:text-blue-500" />
              </div>
              <div>
                <p className="text-lg font-medium text-gray-700 dark:text-gray-300">
                  정보를 입력하고 계산하기를 눌러주세요
                </p>
                <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
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
        </div>
      </div>

      {/* 가이드 섹션 */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          {t('guide.title')}
        </h2>
        <div className="space-y-3">
          {guideFormulaSections.map(({ key, titleKey, itemsKey }) => (
            <div key={key} className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
              <button
                onClick={() => toggleSection(key)}
                className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-gray-750 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-left"
                aria-expanded={openSections[key]}
              >
                <span className="font-medium text-gray-900 dark:text-white text-sm">
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
                    <li key={idx} className="flex gap-2 text-sm text-gray-600 dark:text-gray-300">
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
