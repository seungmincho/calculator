'use client'

import { useState, useMemo, useCallback, useEffect, Suspense } from 'react'
import { useTranslations } from 'next-intl'
import { useSearchParams, useRouter, usePathname } from 'next/navigation'
import { Copy, Check, BookOpen, AlertTriangle, Info, Link, Sparkles, Loader2, X } from 'lucide-react'
import { useChromeAI } from '@/hooks/useChromeAI'
import dynamic from 'next/dynamic'

const ReactECharts = dynamic(() => import('echarts-for-react'), { ssr: false })

const formatWon = (n: number) => Math.round(n).toLocaleString('ko-KR') + '원'

interface CalcResult {
  weeklyHours: number
  holidayHours: number
  weeklyBase: number
  holidayPay: number
  weeklyTotal: number
  monthlyBase: number
  monthlyTotal: number
  annualTotal: number
  eligible: boolean
  baseRatio: number
  holidayRatio: number
}

// Scenario comparison row for a given weekly total hours
function calcScenario(hourlyWage: number, totalWeeklyHours: number, weeksPerMonth: number) {
  const eligible = totalWeeklyHours >= 15
  const holidayHours = eligible ? Math.min((totalWeeklyHours / 40) * 8, 8) : 0
  const weeklyBase = hourlyWage * totalWeeklyHours
  const holidayPay = eligible ? hourlyWage * holidayHours : 0
  const weeklyTotal = weeklyBase + holidayPay
  const monthlyTotal = weeklyTotal * weeksPerMonth
  return { weeklyBase, holidayPay, weeklyTotal, monthlyTotal, eligible, holidayHours }
}

const SCENARIO_HOURS = [15, 20, 30, 40]

function WeeklyHolidayPayInner() {
  const t = useTranslations('weeklyHolidayPay')
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()

  // Parse initial state from URL params
  const [hourlyWage, setHourlyWage] = useState(() => {
    const v = searchParams.get('wage')
    return v ? Number(v) : 10030
  })
  const [workDays, setWorkDays] = useState(() => {
    const v = searchParams.get('days')
    return v ? Number(v) : 5
  })
  const [dailyHours, setDailyHours] = useState(() => {
    const v = searchParams.get('hours')
    return v ? Number(v) : 8
  })
  const [weeksPerMonth, setWeeksPerMonth] = useState(() => {
    const v = searchParams.get('weeks')
    return v ? Number(v) : 4.345
  })

  const [copied, setCopied] = useState(false)
  const [copiedLink, setCopiedLink] = useState(false)

  // Chrome AI (Gemini Nano) — progressive enhancement
  const { isAvailable: aiAvailable, summary: aiSummary, loading: aiLoading, downloadProgress, summarize: aiSummarize, clearSummary: aiClear } = useChromeAI()

  // Sync state to URL whenever inputs change
  useEffect(() => {
    const params = new URLSearchParams()
    params.set('wage', String(hourlyWage))
    params.set('days', String(workDays))
    params.set('hours', String(dailyHours))
    params.set('weeks', String(weeksPerMonth))
    router.replace(`${pathname}?${params.toString()}`, { scroll: false })
  }, [hourlyWage, workDays, dailyHours, weeksPerMonth, router, pathname])

  const result = useMemo<CalcResult>(() => {
    const weeklyHours = workDays * dailyHours
    const eligible = weeklyHours >= 15
    const holidayHours = eligible ? Math.min((weeklyHours / 40) * 8, 8) : 0
    const weeklyBase = hourlyWage * dailyHours * workDays
    const holidayPay = eligible ? hourlyWage * holidayHours : 0
    const weeklyTotal = weeklyBase + holidayPay
    const monthlyBase = weeklyBase * weeksPerMonth
    const monthlyTotal = weeklyTotal * weeksPerMonth
    const annualTotal = monthlyTotal * 12
    const baseRatio = weeklyTotal > 0 ? (weeklyBase / weeklyTotal) * 100 : 100
    const holidayRatio = weeklyTotal > 0 ? (holidayPay / weeklyTotal) * 100 : 0

    return {
      weeklyHours,
      holidayHours,
      weeklyBase,
      holidayPay,
      weeklyTotal,
      monthlyBase,
      monthlyTotal,
      annualTotal,
      eligible,
      baseRatio,
      holidayRatio,
    }
  }, [hourlyWage, workDays, dailyHours, weeksPerMonth])

  // Scenario comparison data
  const scenarios = useMemo(() =>
    SCENARIO_HOURS.map(h => ({
      hours: h,
      ...calcScenario(hourlyWage, h, weeksPerMonth),
    })),
    [hourlyWage, weeksPerMonth]
  )

  const chartOption = useMemo(() => {
    if (!result.eligible || result.weeklyTotal === 0) return {}
    return {
      tooltip: {
        trigger: 'item' as const,
        formatter: (params: { name: string; value: number; percent: number; marker: string }) =>
          `${params.marker} ${params.name}: ${Math.round(params.value).toLocaleString('ko-KR')}원 (${Math.round(params.percent ?? 0)}%)`
      },
      legend: {
        bottom: 0,
        textStyle: { fontSize: 12 }
      },
      series: [{
        type: 'pie' as const,
        radius: ['38%', '65%'],
        center: ['50%', '45%'],
        avoidLabelOverlap: true,
        itemStyle: { borderRadius: 6, borderColor: '#fff', borderWidth: 2 },
        label: { show: true, formatter: '{b}\n{d}%', fontSize: 12 },
        data: [
          {
            value: result.weeklyBase,
            name: t('result.weeklyBase'),
            itemStyle: { color: '#3B82F6' }
          },
          {
            value: result.holidayPay,
            name: t('result.holidayPay'),
            itemStyle: { color: '#10B981' }
          }
        ]
      }]
    }
  }, [result, t])

  const copyResult = useCallback(async () => {
    const lines = [
      `[${t('title')}]`,
      `${t('input.hourlyWage')}: ${formatWon(hourlyWage)}`,
      `${t('input.workDays')}: ${workDays}${t('input.daysUnit')}`,
      `${t('input.dailyHours')}: ${dailyHours}${t('input.hoursUnit')}`,
      `${t('input.weeksPerMonth')}: ${weeksPerMonth}${t('input.weeksUnit')}`,
      '',
      `${t('result.weeklyHours')}: ${result.weeklyHours}${t('input.hoursUnit')}`,
      `${t('result.holidayHours')}: ${result.holidayHours.toFixed(2)}${t('input.hoursUnit')}`,
      `${t('result.weeklyBase')}: ${formatWon(result.weeklyBase)}`,
      `${t('result.holidayPay')}: ${formatWon(result.holidayPay)}`,
      `${t('result.weeklyTotal')}: ${formatWon(result.weeklyTotal)}`,
      `${t('result.monthlyTotal')}: ${formatWon(result.monthlyTotal)}`,
      `${t('result.annualTotal')}: ${formatWon(result.annualTotal)}`,
    ]
    const text = lines.join('\n')
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text)
      } else {
        const ta = document.createElement('textarea')
        ta.value = text
        ta.style.position = 'fixed'
        ta.style.left = '-999999px'
        document.body.appendChild(ta)
        ta.select()
        document.execCommand('copy')
        document.body.removeChild(ta)
      }
    } catch {
      // ignore
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [hourlyWage, workDays, dailyHours, weeksPerMonth, result, t])

  const copyLink = useCallback(async () => {
    const url = window.location.href
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url)
      } else {
        const ta = document.createElement('textarea')
        ta.value = url
        ta.style.position = 'fixed'
        ta.style.left = '-999999px'
        document.body.appendChild(ta)
        ta.select()
        document.execCommand('copy')
        document.body.removeChild(ta)
      }
    } catch {
      // ignore
    }
    setCopiedLink(true)
    setTimeout(() => setCopiedLink(false), 2000)
  }, [])

  return (
    <div className="space-y-8">
      {/* 헤더 */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('title')}</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('description')}</p>
        </div>
        <button
          onClick={copyLink}
          className="flex items-center gap-1.5 text-sm px-3 py-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors flex-shrink-0"
          aria-label={t('copyLink')}
        >
          {copiedLink ? <Check className="w-4 h-4 text-green-500" /> : <Link className="w-4 h-4" />}
          <span>{copiedLink ? t('linkCopied') : t('copyLink')}</span>
        </button>
      </div>

      {/* 메인 그리드 */}
      <div className="grid lg:grid-cols-3 gap-8">

        {/* 입력 패널 */}
        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 space-y-5">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{t('input.title')}</h2>

            {/* 시급 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('input.hourlyWage')}
              </label>
              <div className="relative">
                <input
                  type="number"
                  min={0}
                  value={hourlyWage}
                  onChange={e => setHourlyWage(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent pr-8"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400 text-sm">원</span>
              </div>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{t('input.hourlyWageHint')}</p>
            </div>

            {/* 주간 근무일수 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('input.workDays')}
              </label>
              <div className="flex gap-2 flex-wrap">
                {[1, 2, 3, 4, 5, 6].map(d => (
                  <button
                    key={d}
                    onClick={() => setWorkDays(d)}
                    className={`flex-1 min-w-[2.5rem] py-2 rounded-lg text-sm font-medium transition-colors ${
                      workDays === d
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                  >
                    {d}{t('input.daysUnit')}
                  </button>
                ))}
              </div>
            </div>

            {/* 1일 근무시간 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('input.dailyHours')}
                <span className="ml-1 text-blue-600 dark:text-blue-400 font-semibold">{dailyHours}{t('input.hoursUnit')}</span>
              </label>
              <input
                type="range"
                min={1}
                max={12}
                step={0.5}
                value={dailyHours}
                onChange={e => setDailyHours(Number(e.target.value))}
                className="w-full accent-blue-600"
              />
              <div className="flex justify-between text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                <span>1{t('input.hoursUnit')}</span>
                <span>12{t('input.hoursUnit')}</span>
              </div>
            </div>

            {/* 월 근무 주수 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('input.weeksPerMonth')}
              </label>
              <div className="relative">
                <input
                  type="number"
                  min={1}
                  max={6}
                  step={0.001}
                  value={weeksPerMonth}
                  onChange={e => setWeeksPerMonth(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent pr-12"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400 text-sm">{t('input.weeksUnit')}</span>
              </div>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{t('input.weeksPerMonthHint')}</p>
            </div>

            {/* 주간 근무시간 요약 */}
            <div className={`rounded-lg p-3 text-sm font-medium text-center ${
              result.eligible
                ? 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                : 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300'
            }`}>
              {t('result.weeklyHours')}: {result.weeklyHours}{t('input.hoursUnit')} &nbsp;|&nbsp;
              {result.eligible ? t('eligible') : t('notEligible')}
            </div>
          </div>
        </div>

        {/* 결과 패널 */}
        <div className="lg:col-span-2 space-y-6">

          {/* 주휴수당 미발생 경고 */}
          {!result.eligible && (
            <div className="bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 flex gap-3">
              <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-yellow-800 dark:text-yellow-200">{t('warning.title')}</p>
                <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">{t('warning.message')}</p>
              </div>
            </div>
          )}

          {/* 결과 카드 */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{t('result.title')}</h2>
              <button
                onClick={copyResult}
                className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                aria-label={t('copyResult')}
              >
                {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                {copied ? t('copied') : t('copy')}
              </button>
            </div>

            <div className="space-y-3">
              {/* 주간 분석 */}
              <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">{t('result.weeklySection')}</p>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600 dark:text-gray-400">{t('result.weeklyHours')}</span>
                    <span className="text-sm font-medium text-gray-900 dark:text-white">{result.weeklyHours}{t('input.hoursUnit')}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600 dark:text-gray-400">{t('result.holidayHours')}</span>
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      {result.eligible ? `${result.holidayHours.toFixed(2)}${t('input.hoursUnit')}` : '-'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600 dark:text-gray-400">{t('result.weeklyBase')}</span>
                    <span className="text-sm font-medium text-blue-600 dark:text-blue-400">{formatWon(result.weeklyBase)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600 dark:text-gray-400">{t('result.holidayPay')}</span>
                    <span className={`text-sm font-medium ${result.eligible ? 'text-green-600 dark:text-green-400' : 'text-gray-400 dark:text-gray-500'}`}>
                      {result.eligible ? formatWon(result.holidayPay) : '-'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center border-t border-gray-200 dark:border-gray-600 pt-2 mt-2">
                    <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">{t('result.weeklyTotal')}</span>
                    <span className="text-base font-bold text-gray-900 dark:text-white">{formatWon(result.weeklyTotal)}</span>
                  </div>
                </div>
              </div>

              {/* 월/연 환산 */}
              <div className="bg-blue-50 dark:bg-blue-950 rounded-lg p-4">
                <p className="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wide mb-3">{t('result.monthlySection')}</p>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600 dark:text-gray-400">{t('result.monthlyBase')}</span>
                    <span className="text-sm font-medium text-gray-900 dark:text-white">{formatWon(result.monthlyBase)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">{t('result.monthlyTotal')}</span>
                    <span className="text-lg font-bold text-blue-600 dark:text-blue-400">{formatWon(result.monthlyTotal)}</span>
                  </div>
                  <div className="flex justify-between items-center border-t border-blue-200 dark:border-blue-800 pt-2 mt-2">
                    <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">{t('result.annualTotal')}</span>
                    <span className="text-lg font-bold text-indigo-600 dark:text-indigo-400">{formatWon(result.annualTotal)}</span>
                  </div>
                </div>
              </div>

              {/* 월 급여 구성 시각화 (스택 바) */}
              {result.monthlyTotal > 0 && (
                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                  <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">{t('result.monthlyBarTitle')}</p>
                  <div className="space-y-2">
                    <div className="flex h-7 rounded-lg overflow-hidden w-full">
                      <div
                        className="bg-blue-500 flex items-center justify-center transition-all duration-300"
                        style={{ width: `${result.baseRatio}%` }}
                        title={`${t('result.monthlyBase')}: ${formatWon(result.monthlyBase)}`}
                      >
                        {result.baseRatio > 20 && (
                          <span className="text-white text-xs font-semibold px-1 truncate">
                            {result.baseRatio.toFixed(0)}%
                          </span>
                        )}
                      </div>
                      {result.eligible && result.holidayRatio > 0 && (
                        <div
                          className="bg-emerald-500 flex items-center justify-center transition-all duration-300"
                          style={{ width: `${result.holidayRatio}%` }}
                          title={`${t('result.holidayPay')}: ${formatWon(result.holidayPay)}`}
                        >
                          {result.holidayRatio > 10 && (
                            <span className="text-white text-xs font-semibold px-1 truncate">
                              {result.holidayRatio.toFixed(0)}%
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-xs text-gray-600 dark:text-gray-400">
                      <span className="flex items-center gap-1.5">
                        <span className="inline-block w-3 h-3 rounded-sm bg-blue-500"></span>
                        {t('result.monthlyBase')} {formatWon(result.monthlyBase)}
                      </span>
                      {result.eligible && (
                        <span className="flex items-center gap-1.5">
                          <span className="inline-block w-3 h-3 rounded-sm bg-emerald-500"></span>
                          {t('result.holidayPay')} {formatWon(result.monthlyTotal - result.monthlyBase)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* AI 요약 (Chrome Built-in AI — progressive enhancement) */}
          {aiAvailable && result.monthlyTotal > 0 && (
            <div className="bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-950/30 dark:to-indigo-950/30 border border-purple-200 dark:border-purple-800 rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                  <span className="text-sm font-semibold text-purple-800 dark:text-purple-200">AI 요약</span>
                  <span className="text-[10px] px-1.5 py-0.5 bg-purple-200 dark:bg-purple-800 text-purple-700 dark:text-purple-300 rounded-full">Chrome AI</span>
                </div>
                {aiSummary && (
                  <button onClick={aiClear} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {!aiSummary && !aiLoading && (
                <button
                  onClick={() => {
                    const text = [
                      `주휴수당 계산 결과:`,
                      `시급: ${formatWon(hourlyWage)}`,
                      `주 ${workDays}일, 하루 ${dailyHours}시간 근무 (주 ${result.weeklyHours}시간)`,
                      `주휴수당 대상: ${result.eligible ? '해당 (주 15시간 이상)' : '미해당 (주 15시간 미만)'}`,
                      result.eligible ? `주휴수당: ${formatWon(result.holidayPay)} (주휴시간 ${result.holidayHours.toFixed(1)}시간)` : '',
                      `월 기본급: ${formatWon(result.monthlyBase)}`,
                      `월 총액 (주휴수당 포함): ${formatWon(result.monthlyTotal)}`,
                      `연간 총액: ${formatWon(result.annualTotal)}`,
                      `급여 구성: 기본급 ${result.baseRatio.toFixed(0)}% + 주휴수당 ${result.holidayRatio.toFixed(0)}%`,
                    ].filter(Boolean).join('\n')
                    aiSummarize(text, '한국 근로기준법 기반 주휴수당 계산 결과입니다. 핵심 수치와 근로자에게 중요한 정보를 한국어로 간단히 요약해주세요.')
                  }}
                  className="w-full text-sm text-purple-700 dark:text-purple-300 hover:text-purple-900 dark:hover:text-purple-100 bg-white/60 dark:bg-gray-800/60 hover:bg-white dark:hover:bg-gray-800 rounded-lg px-4 py-2.5 transition-colors flex items-center justify-center gap-2"
                >
                  <Sparkles className="w-4 h-4" />
                  계산 결과 AI로 요약하기
                </button>
              )}

              {aiLoading && (
                <div className="flex items-center gap-2 text-sm text-purple-600 dark:text-purple-400 py-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {downloadProgress !== null ? `AI 모델 다운로드 중... ${downloadProgress}%` : 'AI가 분석 중...'}
                </div>
              )}

              {aiSummary && (
                <p className="text-sm text-gray-800 dark:text-gray-200 leading-relaxed whitespace-pre-line">
                  {aiSummary}
                </p>
              )}
            </div>
          )}

          {/* 도넛 차트 */}
          {result.eligible && result.weeklyTotal > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
              <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-2">{t('result.chartTitle')}</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
                {t('result.baseRatio')}: {result.baseRatio.toFixed(1)}% &nbsp;|&nbsp;
                {t('result.holidayRatio')}: {result.holidayRatio.toFixed(1)}%
              </p>
              <ReactECharts option={chartOption} style={{ height: '280px' }} />
            </div>
          )}
        </div>
      </div>

      {/* 시나리오 비교 테이블 */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">{t('scenario.title')}</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">{t('scenario.description')}</p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700">
                <th className="text-left py-2 pr-4 font-semibold text-gray-700 dark:text-gray-300 whitespace-nowrap">{t('scenario.colHours')}</th>
                <th className="text-right py-2 px-3 font-semibold text-gray-700 dark:text-gray-300 whitespace-nowrap">{t('scenario.colEligible')}</th>
                <th className="text-right py-2 px-3 font-semibold text-blue-600 dark:text-blue-400 whitespace-nowrap">{t('scenario.colWeeklyBase')}</th>
                <th className="text-right py-2 px-3 font-semibold text-emerald-600 dark:text-emerald-400 whitespace-nowrap">{t('scenario.colHolidayPay')}</th>
                <th className="text-right py-2 pl-3 font-semibold text-gray-700 dark:text-gray-300 whitespace-nowrap">{t('scenario.colMonthlyTotal')}</th>
              </tr>
            </thead>
            <tbody>
              {scenarios.map((s) => {
                const isCurrent = result.weeklyHours === s.hours
                return (
                  <tr
                    key={s.hours}
                    className={`border-b border-gray-100 dark:border-gray-700/50 transition-colors ${
                      isCurrent
                        ? 'bg-blue-50 dark:bg-blue-900/20'
                        : 'hover:bg-gray-50 dark:hover:bg-gray-700/30'
                    }`}
                  >
                    <td className="py-3 pr-4 font-medium text-gray-900 dark:text-white whitespace-nowrap">
                      {s.hours}{t('input.hoursUnit')}
                      {isCurrent && (
                        <span className="ml-2 text-xs bg-blue-600 text-white rounded px-1.5 py-0.5">{t('scenario.current')}</span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-right">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                        s.eligible
                          ? 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300'
                          : 'bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400'
                      }`}>
                        {s.eligible ? t('eligible') : t('notEligible')}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right text-blue-600 dark:text-blue-400 font-medium">{formatWon(s.weeklyBase)}</td>
                    <td className="py-3 px-3 text-right font-medium">
                      {s.eligible
                        ? <span className="text-emerald-600 dark:text-emerald-400">{formatWon(s.holidayPay)}</span>
                        : <span className="text-gray-400 dark:text-gray-500">-</span>
                      }
                    </td>
                    <td className="py-3 pl-3 text-right font-bold text-gray-900 dark:text-white">{formatWon(s.monthlyTotal)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-3">{t('scenario.footnote')}</p>
      </div>

      {/* 15시간 룰 안내 */}
      <div className="bg-blue-50 dark:bg-blue-950 rounded-xl p-6 flex gap-4">
        <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
        <div>
          <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">{t('info.title')}</h3>
          <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1 list-disc list-inside">
            {(t.raw('info.items') as string[]).map((item, i) => (
              <li key={i}>{item}</li>
            ))}
          </ul>
        </div>
      </div>

      {/* 가이드 섹션 */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
        <div className="flex items-center gap-2 mb-6">
          <BookOpen className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">{t('guide.title')}</h2>
        </div>
        <div className="grid md:grid-cols-2 gap-6">
          {/* 섹션 1: 계산 방법 */}
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white mb-3">{t('guide.calc.title')}</h3>
            <ul className="space-y-2">
              {(t.raw('guide.calc.items') as string[]).map((item, i) => (
                <li key={i} className="flex gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <span className="flex-shrink-0 w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300 text-xs flex items-center justify-center font-bold">{i + 1}</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
          {/* 섹션 2: 주의사항 */}
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white mb-3">{t('guide.notes.title')}</h3>
            <ul className="space-y-2">
              {(t.raw('guide.notes.items') as string[]).map((item, i) => (
                <li key={i} className="flex gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <span className="flex-shrink-0 text-amber-500">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function WeeklyHolidayPay() {
  return (
    <Suspense fallback={<div className="text-center py-12 text-gray-500 dark:text-gray-400">Loading...</div>}>
      <WeeklyHolidayPayInner />
    </Suspense>
  )
}
