'use client'

import { useState, useMemo, useCallback, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { Calculator, Copy, Check, BookOpen, AlertCircle, Info, Link } from 'lucide-react'
import dynamic from 'next/dynamic'
import { useSearchParams } from 'next/navigation'

const ReactECharts = dynamic(() => import('echarts-for-react'), { ssr: false })

// ── 2026 상수 ──
const DAILY_BENEFIT_CAP = 66_000          // 일일 상한액
const DAILY_BENEFIT_FLOOR = 63_104        // 일일 하한액 (최저임금 10,030원 × 80% × 8h)
const BENEFIT_RATE = 0.6                  // 평균임금 60%

// 구직급여 지급 기간 (일수) 테이블
// [age group][insurance period]: days
// age group: 0 = 50세 미만, 1 = 50세 이상/장애인
// insurance period: 0=1년미만, 1=1~3년, 2=3~5년, 3=5~10년, 4=10년이상
const BENEFIT_DAYS: number[][] = [
  [120, 150, 180, 210, 240], // 50세 미만
  [120, 180, 210, 240, 270], // 50세 이상 / 장애인
]

type AgeGroup = 'under50' | 'over50'
type InsurancePeriod = 'under1' | '1to3' | '3to5' | '5to10' | 'over10'
type SeparationReason = 'involuntary' | 'voluntary'

function getInsurancePeriodIndex(period: InsurancePeriod): number {
  const map: Record<InsurancePeriod, number> = {
    under1: 0,
    '1to3': 1,
    '3to5': 2,
    '5to10': 3,
    over10: 4,
  }
  return map[period]
}

function getAgeGroupIndex(age: AgeGroup): number {
  return age === 'under50' ? 0 : 1
}

function calcBenefitDays(age: AgeGroup, period: InsurancePeriod): number {
  return BENEFIT_DAYS[getAgeGroupIndex(age)][getInsurancePeriodIndex(period)]
}

function calcDailyBenefit(avgDailyWage: number): number {
  const raw = Math.floor(avgDailyWage * BENEFIT_RATE)
  return Math.min(Math.max(raw, DAILY_BENEFIT_FLOOR), DAILY_BENEFIT_CAP)
}

const formatNumber = (n: number) => n.toLocaleString('ko-KR')
const formatWon = (n: number) => `${formatNumber(n)}원`
const parseNum = (v: string) => parseInt(v.replace(/[^0-9]/g, ''), 10) || 0

interface CalcResult {
  dailyBenefit: number
  benefitDays: number
  totalBenefit: number
  monthlyEstimate: number
  cappedAt: 'cap' | 'floor' | 'none'
}

export default function UnemploymentBenefit() {
  const t = useTranslations('unemploymentBenefit')
  const searchParams = useSearchParams()

  const [ageGroup, setAgeGroup] = useState<AgeGroup>('under50')
  const [insurancePeriod, setInsurancePeriod] = useState<InsurancePeriod>('1to3')
  const [avgDailyWageStr, setAvgDailyWageStr] = useState('')
  const [separationReason, setSeparationReason] = useState<SeparationReason>('involuntary')
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [hasCalculated, setHasCalculated] = useState(false)
  const [result, setResult] = useState<CalcResult | null>(null)

  // ── URL 파라미터 초기화 ──
  useEffect(() => {
    const age = searchParams.get('age') as AgeGroup | null
    const period = searchParams.get('period') as InsurancePeriod | null
    const wage = searchParams.get('wage')
    const reason = searchParams.get('reason') as SeparationReason | null

    const validAges: AgeGroup[] = ['under50', 'over50']
    const validPeriods: InsurancePeriod[] = ['under1', '1to3', '3to5', '5to10', 'over10']
    const validReasons: SeparationReason[] = ['involuntary', 'voluntary']

    if (age && validAges.includes(age)) setAgeGroup(age)
    if (period && validPeriods.includes(period)) setInsurancePeriod(period)
    if (reason && validReasons.includes(reason)) setSeparationReason(reason)
    if (wage) {
      const num = parseInt(wage, 10)
      if (!isNaN(num) && num > 0) setAvgDailyWageStr(num.toLocaleString('ko-KR'))
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── URL 동기화 ──
  const updateURL = useCallback((params: {
    age: AgeGroup
    period: InsurancePeriod
    wage: string
    reason: SeparationReason
  }) => {
    const url = new URL(window.location.href)
    url.searchParams.set('age', params.age)
    url.searchParams.set('period', params.period)
    url.searchParams.set('reason', params.reason)
    const wageNum = parseInt(params.wage.replace(/[^0-9]/g, ''), 10)
    if (wageNum > 0) url.searchParams.set('wage', String(wageNum))
    else url.searchParams.delete('wage')
    window.history.replaceState({}, '', url)
  }, [])

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

  const handleCalculate = useCallback(() => {
    const avgDailyWage = parseNum(avgDailyWageStr)
    if (avgDailyWage <= 0) return

    const daily = calcDailyBenefit(avgDailyWage)
    const days = calcBenefitDays(ageGroup, insurancePeriod)
    const total = daily * days
    const monthly = daily * 30

    let cappedAt: CalcResult['cappedAt'] = 'none'
    const raw = Math.floor(avgDailyWage * BENEFIT_RATE)
    if (raw >= DAILY_BENEFIT_CAP) cappedAt = 'cap'
    else if (raw <= DAILY_BENEFIT_FLOOR) cappedAt = 'floor'

    setResult({ dailyBenefit: daily, benefitDays: days, totalBenefit: total, monthlyEstimate: monthly, cappedAt })
    setHasCalculated(true)
  }, [avgDailyWageStr, ageGroup, insurancePeriod])

  const handleReset = useCallback(() => {
    setAgeGroup('under50')
    setInsurancePeriod('1to3')
    setAvgDailyWageStr('')
    setSeparationReason('involuntary')
    setResult(null)
    setHasCalculated(false)
    const url = new URL(window.location.href)
    ;['age', 'period', 'wage', 'reason'].forEach((k) => url.searchParams.delete(k))
    window.history.replaceState({}, '', url)
  }, [])

  const handleWageInput = useCallback((v: string) => {
    const digits = v.replace(/[^0-9]/g, '')
    const formatted = digits ? Number(digits).toLocaleString('ko-KR') : ''
    setAvgDailyWageStr(formatted)
    updateURL({ age: ageGroup, period: insurancePeriod, wage: formatted, reason: separationReason })
  }, [ageGroup, insurancePeriod, separationReason, updateURL])

  const handleAgeGroup = useCallback((a: AgeGroup) => {
    setAgeGroup(a)
    updateURL({ age: a, period: insurancePeriod, wage: avgDailyWageStr, reason: separationReason })
  }, [insurancePeriod, avgDailyWageStr, separationReason, updateURL])

  const handleInsurancePeriod = useCallback((p: InsurancePeriod) => {
    setInsurancePeriod(p)
    updateURL({ age: ageGroup, period: p, wage: avgDailyWageStr, reason: separationReason })
  }, [ageGroup, avgDailyWageStr, separationReason, updateURL])

  const handleSeparationReason = useCallback((r: SeparationReason) => {
    setSeparationReason(r)
    updateURL({ age: ageGroup, period: insurancePeriod, wage: avgDailyWageStr, reason: r })
  }, [ageGroup, insurancePeriod, avgDailyWageStr, updateURL])

  const chartOption = useMemo(() => {
    if (!result) return {}
    const months = Math.floor(result.benefitDays / 30)
    const remainDays = result.benefitDays % 30
    return {
      tooltip: {
        trigger: 'item',
        formatter: (p: { name: string; value: number }) => `${p.name}: ${formatWon(p.value)}`,
      },
      legend: { bottom: 0, textStyle: { color: '#6b7280' } },
      series: [
        {
          type: 'pie',
          radius: ['45%', '70%'],
          avoidLabelOverlap: false,
          label: { show: false },
          emphasis: { label: { show: true, fontSize: 14, fontWeight: 'bold' } },
          data: [
            ...(months > 0
              ? Array.from({ length: months }, (_, i) => ({
                  name: `${i + 1}${t('chart.month')}`,
                  value: result.dailyBenefit * 30,
                }))
              : []),
            ...(remainDays > 0
              ? [{ name: t('chart.remaining'), value: result.dailyBenefit * remainDays }]
              : []),
          ],
        },
      ],
    }
  }, [result, t])

  const resultText = useMemo(() => {
    if (!result) return ''
    return [
      `[${t('title')}]`,
      `${t('result.dailyBenefit')}: ${formatWon(result.dailyBenefit)}`,
      `${t('result.benefitDays')}: ${result.benefitDays}${t('result.days')}`,
      `${t('result.monthlyEstimate')}: ${formatWon(result.monthlyEstimate)}`,
      `${t('result.totalBenefit')}: ${formatWon(result.totalBenefit)}`,
    ].join('\n')
  }, [result, t])

  const isVoluntary = separationReason === 'voluntary'

  return (
    <div className="space-y-8">
      {/* 헤더 */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Calculator className="w-7 h-7 text-blue-600" />
            {t('title')}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('description')}</p>
        </div>
        <button
          onClick={() => copyToClipboard(window.location.href, 'link')}
          className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors whitespace-nowrap flex-shrink-0 mt-1"
          title="링크 복사"
        >
          {copiedId === 'link' ? (
            <Check className="w-4 h-4 text-green-500" />
          ) : (
            <Link className="w-4 h-4" />
          )}
          {copiedId === 'link' ? '복사됨' : '링크 복사'}
        </button>
      </div>

      {/* 자발적 이직 경고 */}
      {isVoluntary && (
        <div className="flex items-start gap-3 bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-xl p-4">
          <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-yellow-800 dark:text-yellow-200">{t('voluntaryWarning')}</p>
        </div>
      )}

      {/* 메인 그리드 */}
      <div className="grid lg:grid-cols-3 gap-8">
        {/* 입력 패널 */}
        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 space-y-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{t('form.title')}</h2>

            {/* 이직사유 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('form.separationReason')}
              </label>
              <div className="grid grid-cols-2 gap-2">
                {(['involuntary', 'voluntary'] as const).map((r) => (
                  <button
                    key={r}
                    onClick={() => handleSeparationReason(r)}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      separationReason === r
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                  >
                    {t(`form.reason.${r}`)}
                  </button>
                ))}
              </div>
            </div>

            {/* 나이 그룹 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('form.ageGroup')}
              </label>
              <div className="grid grid-cols-2 gap-2">
                {(['under50', 'over50'] as const).map((a) => (
                  <button
                    key={a}
                    onClick={() => handleAgeGroup(a)}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      ageGroup === a
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                  >
                    {t(`form.age.${a}`)}
                  </button>
                ))}
              </div>
            </div>

            {/* 고용보험 가입기간 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('form.insurancePeriod')}
              </label>
              <select
                value={insurancePeriod}
                onChange={(e) => handleInsurancePeriod(e.target.value as InsurancePeriod)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {(['under1', '1to3', '3to5', '5to10', 'over10'] as const).map((p) => (
                  <option key={p} value={p}>
                    {t(`form.period.${p}`)}
                  </option>
                ))}
              </select>
            </div>

            {/* 평균임금 (일) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('form.avgDailyWage')}
              </label>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">{t('form.avgDailyWageHint')}</p>
              <div className="relative">
                <input
                  type="text"
                  inputMode="numeric"
                  value={avgDailyWageStr}
                  onChange={(e) => handleWageInput(e.target.value)}
                  placeholder={t('form.wagePlaceholder')}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent pr-8"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400 text-sm">
                  {t('form.wonUnit')}
                </span>
              </div>
            </div>

            {/* 버튼 */}
            <div className="flex gap-2">
              <button
                onClick={handleCalculate}
                disabled={!avgDailyWageStr || isVoluntary}
                className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg px-4 py-3 font-medium hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {t('form.calculate')}
              </button>
              <button
                onClick={handleReset}
                className="px-4 py-3 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg transition-colors text-sm font-medium"
              >
                {t('form.reset')}
              </button>
            </div>
          </div>
        </div>

        {/* 결과 패널 */}
        <div className="lg:col-span-2">
          {hasCalculated && result ? (
            <div className="space-y-4">
              {/* 상한/하한 안내 */}
              {result.cappedAt !== 'none' && (
                <div className="flex items-start gap-3 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
                  <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-blue-800 dark:text-blue-200">
                    {result.cappedAt === 'cap' ? t('result.capNotice') : t('result.floorNotice')}
                  </p>
                </div>
              )}

              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{t('result.title')}</h2>
                  <button
                    onClick={() => copyToClipboard(resultText, 'result')}
                    className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                  >
                    {copiedId === 'result' ? (
                      <Check className="w-4 h-4 text-green-500" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                    {copiedId === 'result' ? t('copied') : t('copy')}
                  </button>
                </div>

                {/* 수치 카드 그리드 */}
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="bg-blue-50 dark:bg-blue-950 rounded-xl p-4">
                    <p className="text-xs text-blue-600 dark:text-blue-400 font-medium mb-1">{t('result.dailyBenefit')}</p>
                    <p className="text-xl font-bold text-blue-700 dark:text-blue-300">{formatWon(result.dailyBenefit)}</p>
                    <p className="text-xs text-blue-500 dark:text-blue-400 mt-0.5">{t('result.perDay')}</p>
                  </div>
                  <div className="bg-indigo-50 dark:bg-indigo-950 rounded-xl p-4">
                    <p className="text-xs text-indigo-600 dark:text-indigo-400 font-medium mb-1">{t('result.benefitDays')}</p>
                    <p className="text-xl font-bold text-indigo-700 dark:text-indigo-300">
                      {result.benefitDays}{t('result.days')}
                    </p>
                    <p className="text-xs text-indigo-500 dark:text-indigo-400 mt-0.5">
                      {t('result.aboutMonths', { months: Math.floor(result.benefitDays / 30) })}
                    </p>
                  </div>
                  <div className="bg-purple-50 dark:bg-purple-950 rounded-xl p-4">
                    <p className="text-xs text-purple-600 dark:text-purple-400 font-medium mb-1">{t('result.monthlyEstimate')}</p>
                    <p className="text-xl font-bold text-purple-700 dark:text-purple-300">{formatWon(result.monthlyEstimate)}</p>
                    <p className="text-xs text-purple-500 dark:text-purple-400 mt-0.5">{t('result.per30days')}</p>
                  </div>
                  <div className="bg-green-50 dark:bg-green-950 rounded-xl p-4">
                    <p className="text-xs text-green-600 dark:text-green-400 font-medium mb-1">{t('result.totalBenefit')}</p>
                    <p className="text-xl font-bold text-green-700 dark:text-green-300">{formatWon(result.totalBenefit)}</p>
                    <p className="text-xs text-green-500 dark:text-green-400 mt-0.5">{t('result.totalLabel')}</p>
                  </div>
                </div>

                {/* 도넛 차트 */}
                <div>
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">{t('chart.title')}</p>
                  <ReactECharts
                    option={chartOption}
                    style={{ height: 260 }}
                    theme="auto"
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 flex flex-col items-center justify-center min-h-64 text-center">
              <Calculator className="w-12 h-12 text-gray-300 dark:text-gray-600 mb-3" />
              <p className="text-gray-500 dark:text-gray-400 text-sm">
                {isVoluntary ? t('voluntaryBlocked') : t('placeholder')}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* 지급 기간 표 */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 overflow-x-auto">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{t('table.title')}</h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 dark:bg-gray-700">
              <th className="px-4 py-2 text-left text-gray-600 dark:text-gray-300 font-medium">{t('table.ageGroup')}</th>
              <th className="px-4 py-2 text-center text-gray-600 dark:text-gray-300 font-medium">{t('table.under1')}</th>
              <th className="px-4 py-2 text-center text-gray-600 dark:text-gray-300 font-medium">{t('table.1to3')}</th>
              <th className="px-4 py-2 text-center text-gray-600 dark:text-gray-300 font-medium">{t('table.3to5')}</th>
              <th className="px-4 py-2 text-center text-gray-600 dark:text-gray-300 font-medium">{t('table.5to10')}</th>
              <th className="px-4 py-2 text-center text-gray-600 dark:text-gray-300 font-medium">{t('table.over10')}</th>
            </tr>
          </thead>
          <tbody>
            {(
              [
                { key: 'under50', label: t('table.ageUnder50'), days: BENEFIT_DAYS[0] },
                { key: 'over50', label: t('table.ageOver50'), days: BENEFIT_DAYS[1] },
              ] as const
            ).map(({ key, label, days }) => (
              <tr key={key} className="border-t border-gray-100 dark:border-gray-700">
                <td className="px-4 py-3 text-gray-700 dark:text-gray-300 font-medium">{label}</td>
                {days.map((d, i) => (
                  <td key={i} className="px-4 py-3 text-center text-gray-900 dark:text-white font-semibold">
                    {d}{t('result.days')}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 가이드 섹션 */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-blue-600" />
          {t('guide.title')}
        </h2>
        <div className="grid md:grid-cols-2 gap-6">
          {/* 수급 요건 */}
          <div className="bg-blue-50 dark:bg-blue-950 rounded-xl p-5">
            <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-3">{t('guide.eligibility.title')}</h3>
            <ul className="space-y-2">
              {(t.raw('guide.eligibility.items') as string[]).map((item, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-blue-800 dark:text-blue-200">
                  <span className="mt-0.5 w-1.5 h-1.5 bg-blue-500 rounded-full flex-shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          {/* 신청 방법 */}
          <div className="bg-indigo-50 dark:bg-indigo-950 rounded-xl p-5">
            <h3 className="font-semibold text-indigo-900 dark:text-indigo-100 mb-3">{t('guide.howToApply.title')}</h3>
            <ul className="space-y-2">
              {(t.raw('guide.howToApply.items') as string[]).map((item, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-indigo-800 dark:text-indigo-200">
                  <span className="flex-shrink-0 w-5 h-5 bg-indigo-500 text-white rounded-full text-xs flex items-center justify-center font-bold">
                    {i + 1}
                  </span>
                  {item}
                </li>
              ))}
            </ul>
          </div>

          {/* 연장급여 */}
          <div className="bg-purple-50 dark:bg-purple-950 rounded-xl p-5">
            <h3 className="font-semibold text-purple-900 dark:text-purple-100 mb-3">{t('guide.extended.title')}</h3>
            <ul className="space-y-2">
              {(t.raw('guide.extended.items') as string[]).map((item, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-purple-800 dark:text-purple-200">
                  <span className="mt-0.5 w-1.5 h-1.5 bg-purple-500 rounded-full flex-shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          {/* 주의사항 */}
          <div className="bg-yellow-50 dark:bg-yellow-950 rounded-xl p-5">
            <h3 className="font-semibold text-yellow-900 dark:text-yellow-100 mb-3">{t('guide.caution.title')}</h3>
            <ul className="space-y-2">
              {(t.raw('guide.caution.items') as string[]).map((item, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-yellow-800 dark:text-yellow-200">
                  <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 text-yellow-600" />
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
