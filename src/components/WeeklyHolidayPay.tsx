'use client'

import { useState, useMemo, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { Copy, Check, BookOpen, AlertTriangle, Info } from 'lucide-react'
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

export default function WeeklyHolidayPay() {
  const t = useTranslations('weeklyHolidayPay')

  const [hourlyWage, setHourlyWage] = useState(10030)
  const [workDays, setWorkDays] = useState(5)
  const [dailyHours, setDailyHours] = useState(8)
  const [weeksPerMonth, setWeeksPerMonth] = useState(4.345)
  const [copied, setCopied] = useState(false)

  const result = useMemo<CalcResult>(() => {
    const weeklyHours = workDays * dailyHours
    const eligible = weeklyHours >= 15
    // 주휴시간 = (주간 총 근로시간 / 40) × 8, 최대 8시간
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

  return (
    <div className="space-y-8">
      {/* 헤더 */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('title')}</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('description')}</p>
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
            </div>
          </div>

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
