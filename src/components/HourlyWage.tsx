'use client'

import { useState, useMemo, useCallback, useEffect, Suspense } from 'react'
import Link from 'next/link'
import { useTranslations } from '@/lib/i18n'
import { useSearchParams } from '@/hooks/useSearchParams'
import { MIN_WAGE_2026, WEEKS_PER_MONTH } from '@/utils/workHours'
import { calculateNetSalary } from '@/utils/netSalary'

type InputType = 'hourly' | 'daily' | 'monthly' | 'yearly'
const TYPES: InputType[] = ['hourly', 'daily', 'monthly', 'yearly']
const PRESETS = [15, 20, 30, 40]
const AVG_ANNUAL_SALARY_KR = 42_000_000 // 한국 근로자 평균 연봉 약 4,200만원 (2024 기준)

/**
 * 주휴시간 = 주 소정근로시간/40 × 8 (주 15시간 이상, 최대 8)
 * 월 소정근로시간 = (주 소정근로 + 주휴) × 365/7/12, 정수 반올림 → 주 40시간 = 209시간
 */
export function wageTable(type: InputType, amount: number, weeklyHours: number, daysPerWeek: number, holiday: boolean) {
  const holidayHours = holiday && weeklyHours >= 15 ? Math.min(8, (weeklyHours / 40) * 8) : 0
  const monthlyHours = Math.round((weeklyHours + holidayHours) * WEEKS_PER_MONTH)
  const dailyHours = weeklyHours / daysPerWeek
  const hourly =
    type === 'hourly' ? amount
    : type === 'daily' ? amount / dailyHours
    : type === 'monthly' ? amount / monthlyHours
    : amount / 12 / monthlyHours
  const monthly = hourly * monthlyHours
  return {
    hourly,
    daily: hourly * dailyHours,
    weekly: hourly * (weeklyHours + holidayHours),
    monthly,
    yearly: monthly * 12,
    holidayHours,
    monthlyHours,
    dailyHours,
    holidayPayMonthly: hourly * holidayHours * WEEKS_PER_MONTH,
  }
}

const won = (v: number) => Math.round(v).toLocaleString('ko-KR')

function HourlyWageInner() {
  const t = useTranslations('hourlyWage')
  const sp = useSearchParams()

  const [inputType, setInputType] = useState<InputType>(() => {
    const ty = sp.get('type') as InputType
    return TYPES.includes(ty) ? ty : 'hourly'
  })
  const [amount, setAmount] = useState<string>(() => {
    const w = parseInt(sp.get('wage') || '')
    return (w > 0 ? w : MIN_WAGE_2026).toLocaleString('ko-KR')
  })
  const [daysPerWeek, setDaysPerWeek] = useState<number>(() => {
    const d = parseFloat(sp.get('days') || '')
    return d > 0 && d <= 7 ? d : 5
  })
  const [weeklyHours, setWeeklyHours] = useState<number>(() => {
    const wh = parseFloat(sp.get('wh') || '')
    if (wh > 0 && wh <= 68) return wh
    // 구버전 공유 링크: hours(1일) × days
    const h = parseFloat(sp.get('hours') || '')
    const d = parseFloat(sp.get('days') || '') || 5
    return h > 0 ? Math.min(68, h * d) : 40
  })
  const [holiday, setHoliday] = useState<boolean>(() => sp.get('hol') !== '0')
  const [copied, setCopied] = useState(false)

  const shareUrl = useCallback(() => {
    const p = new URLSearchParams()
    const raw = amount.replace(/,/g, '')
    if (raw) p.set('wage', raw)
    if (inputType !== 'hourly') p.set('type', inputType)
    if (weeklyHours !== 40) p.set('wh', String(weeklyHours))
    if (daysPerWeek !== 5) p.set('days', String(daysPerWeek))
    if (!holiday) p.set('hol', '0')
    const qs = p.toString()
    return `${window.location.pathname}${qs ? '?' + qs : ''}`
  }, [amount, inputType, weeklyHours, daysPerWeek, holiday])

  useEffect(() => {
    const id = setTimeout(() => window.history.replaceState(null, '', shareUrl()), 300)
    return () => clearTimeout(id)
  }, [shareUrl])

  const amt = parseFloat(amount.replace(/,/g, '')) || 0
  const r = useMemo(
    () => (amt > 0 ? wageTable(inputType, amt, weeklyHours, daysPerWeek, holiday) : null),
    [amt, inputType, weeklyHours, daysPerWeek, holiday]
  )
  const net = useMemo(() => (r ? calculateNetSalary(r.yearly, { nonTaxableMonthly: 0 }) : null), [r])

  const handleReset = () => {
    setInputType('hourly')
    setAmount(MIN_WAGE_2026.toLocaleString('ko-KR'))
    setWeeklyHours(40)
    setDaysPerWeek(5)
    setHoliday(true)
  }

  const handleCopyLink = useCallback(async () => {
    const url = window.location.origin + shareUrl()
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
      // silent
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [shareUrl])

  const minPct = r ? Math.round((r.hourly / MIN_WAGE_2026) * 100) : 0
  const isAbove = r ? Math.round(r.hourly) >= MIN_WAGE_2026 : true
  // 바 스케일: 최저임금의 150%까지, 최저임금 마커는 2/3 지점
  const barWidth = r ? Math.min(100, (r.hourly / (MIN_WAGE_2026 * 1.5)) * 100) : 0

  const rows: { key: InputType | 'weekly'; gross: number; net?: number }[] = r
    ? [
        { key: 'hourly', gross: r.hourly },
        { key: 'daily', gross: r.daily },
        { key: 'weekly', gross: r.weekly },
        { key: 'monthly', gross: r.monthly, net: net?.netMonthly },
        { key: 'yearly', gross: r.yearly, net: net?.netAnnual },
      ]
    : []

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-fg">{t('title')}</h1>
          <p className="text-sm text-muted mt-1">{t('description')}</p>
        </div>
        <button onClick={handleCopyLink} className="ui-btn-soft px-3 py-2 text-sm font-medium shrink-0">
          {copied ? t('copied') : t('copyLink')}
        </button>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* 입력 */}
        <div className="lg:col-span-1">
          <div className="ui-card p-6 space-y-5">
            <div>
              <label className="block text-sm font-medium text-body mb-2">{t('inputType')}</label>
              <div className="grid grid-cols-4 gap-1.5">
                {TYPES.map((type) => (
                  <button
                    key={type}
                    onClick={() => setInputType(type)}
                    aria-pressed={inputType === type}
                    className={`px-2 py-2 rounded-lg text-sm font-medium transition-colors ${
                      inputType === type ? 'bg-primary text-white' : 'bg-soft text-body hover:bg-subtle'
                    }`}
                  >
                    {t(type)}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label htmlFor="hw-amount" className="block text-sm font-medium text-body mb-2">
                {t(inputType)} {t('amount')}
              </label>
              <input
                id="hw-amount"
                type="text"
                inputMode="numeric"
                value={amount}
                onChange={(e) => {
                  const value = e.target.value.replace(/,/g, '')
                  if (value === '' || /^\d+$/.test(value)) {
                    setAmount(value ? parseInt(value).toLocaleString('ko-KR') : '')
                  }
                }}
                placeholder={t('amountPlaceholder')}
                className="ui-field w-full px-4 py-3 text-lg tabular-nums"
              />
            </div>

            <div>
              <label htmlFor="hw-weekly" className="block text-sm font-medium text-body mb-2">
                {t('weeklyHours')}
              </label>
              <div className="grid grid-cols-4 gap-1.5 mb-2">
                {PRESETS.map((h) => (
                  <button
                    key={h}
                    onClick={() => setWeeklyHours(h)}
                    aria-pressed={weeklyHours === h}
                    className={`px-2 py-1.5 rounded-lg text-sm transition-colors ${
                      weeklyHours === h ? 'bg-primary text-white' : 'bg-soft text-body hover:bg-subtle'
                    }`}
                  >
                    {h}{t('hours')}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <input
                  id="hw-weekly"
                  type="number"
                  value={weeklyHours}
                  onChange={(e) => setWeeklyHours(Math.max(1, Math.min(68, parseFloat(e.target.value) || 1)))}
                  min={1}
                  max={68}
                  step={0.5}
                  className="ui-field w-full px-4 py-2"
                />
                <span className="text-sm text-muted whitespace-nowrap">{t('hours')}</span>
              </div>
            </div>

            <div>
              <label htmlFor="hw-days" className="block text-sm font-medium text-body mb-2">
                {t('workDaysPerWeek')}
              </label>
              <div className="flex items-center gap-2">
                <input
                  id="hw-days"
                  type="number"
                  value={daysPerWeek}
                  onChange={(e) => setDaysPerWeek(Math.max(1, Math.min(7, parseFloat(e.target.value) || 1)))}
                  min={1}
                  max={7}
                  step={1}
                  className="ui-field w-full px-4 py-2"
                />
                <span className="text-sm text-muted whitespace-nowrap">{t('days')}</span>
              </div>
              {r && <p className="text-xs text-muted mt-1">{t('dailyHoursNote', { hours: +r.dailyHours.toFixed(2) })}</p>}
            </div>

            <label className="flex items-start gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={holiday}
                onChange={(e) => setHoliday(e.target.checked)}
                className="mt-1 accent-blue-600"
              />
              <span>
                <span className="block text-sm font-medium text-body">{t('includeHoliday')}</span>
                <span className="block text-xs text-muted">{t('includeHolidayHint')}</span>
              </span>
            </label>

            <button onClick={handleReset} className="ui-btn-soft w-full px-4 py-2 font-medium">
              {t('reset')}
            </button>
          </div>
        </div>

        {/* 결과 */}
        <div className="lg:col-span-2">
          <div className="ui-card p-6 space-y-6">
            {r ? (
              <>
                <div>
                  <div className="text-sm text-sub">{t('result.monthlyWage')}</div>
                  <div className="text-3xl font-bold text-fg tabular-nums mt-1">
                    {won(r.monthly)}
                    <span className="text-lg font-semibold ml-1">{t('result.won')}</span>
                  </div>
                  <p className="text-xs text-muted mt-1">
                    {t('formula', {
                      hourly: won(r.hourly),
                      weekly: weeklyHours,
                      holiday: +r.holidayHours.toFixed(2),
                      monthlyHours: r.monthlyHours,
                    })}
                  </p>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-line text-muted">
                        <th className="text-left font-medium py-2">{t('result.title')}</th>
                        <th className="text-right font-medium py-2">{t('pretax')}</th>
                        <th className="text-right font-medium py-2">{t('aftertax')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((row) => (
                        <tr key={row.key} className={`border-b border-line ${row.key === inputType ? 'bg-subtle' : ''}`}>
                          <td className="py-2.5 pl-1 text-body">
                            {row.key === 'weekly' ? t('weekly') : t(`result.${row.key}Wage`)}
                            {row.key === inputType && <span className="ml-1.5 text-xs text-primary">{t('inputMark')}</span>}
                          </td>
                          <td className="py-2.5 text-right font-semibold text-fg tabular-nums">{won(row.gross)}{t('result.won')}</td>
                          <td className="py-2.5 pr-1 text-right text-sub tabular-nums">
                            {row.net !== undefined ? `${won(row.net)}${t('result.won')}` : '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <p className="text-xs text-muted mt-2">{t('netNote')}</p>
                </div>

                {r.holidayHours > 0 ? (
                  <p className="text-sm text-sub bg-subtle rounded-xl p-4">
                    {t('holidayPay', { hours: +r.holidayHours.toFixed(2), amount: won(r.holidayPayMonthly) })}
                  </p>
                ) : (
                  <p className="text-sm text-sub bg-subtle rounded-xl p-4">
                    {weeklyHours < 15 ? t('holidayUnder15') : t('holidayExcluded')}
                  </p>
                )}

                {/* 최저임금 비교 */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-fg">{t('minWage.title', { wage: won(MIN_WAGE_2026) })}</h3>
                    <span className={`text-sm font-bold tabular-nums ${isAbove ? 'text-fg' : 'text-red-600'}`}>{minPct}%</span>
                  </div>
                  <div className="relative h-3 bg-track rounded-full">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${isAbove ? 'bg-primary' : 'bg-red-500'}`}
                      style={{ width: `${barWidth}%` }}
                    />
                    <div className="absolute top-[-4px] bottom-[-4px] w-0.5 bg-fg" style={{ left: `${100 / 1.5}%` }} aria-hidden />
                  </div>
                  <div className="flex justify-between text-xs text-muted">
                    <span>{t('minWage.mine', { wage: won(r.hourly) })}</span>
                    <span>{t('minWage.monthlyMin', { hours: r.monthlyHours, amount: won(MIN_WAGE_2026 * r.monthlyHours) })}</span>
                  </div>
                  <p className={`text-sm font-medium ${isAbove ? 'text-body' : 'text-red-600'}`}>
                    {isAbove
                      ? t('minWage.above', { diff: won(r.hourly - MIN_WAGE_2026) })
                      : t('minWage.below', { diff: won(MIN_WAGE_2026 - r.hourly) })}
                  </p>
                  {!isAbove && !holiday && (inputType === 'monthly' || inputType === 'yearly') && (
                    <p className="text-xs text-muted">{t('minWage.holidayNote')}</p>
                  )}
                  <p className="text-xs text-muted">
                    {t('avgCompare', { percent: Math.round((r.yearly / AVG_ANNUAL_SALARY_KR) * 100) })}
                  </p>
                </div>

                <div className="flex flex-wrap gap-2 pt-2 border-t border-line">
                  <Link href="/weekly-holiday-pay/" className="ui-btn-soft px-3 py-2 text-sm">
                    {t('links.weeklyHolidayPay')}
                  </Link>
                  <Link href="/work-hours-calculator/" className="ui-btn-soft px-3 py-2 text-sm">
                    {t('links.workHours')}
                  </Link>
                </div>
              </>
            ) : (
              <p className="text-center py-12 text-muted">{t('amountPlaceholder')}</p>
            )}
          </div>
        </div>
      </div>

      <div className="ui-card p-6">
        <h2 className="text-xl font-semibold text-fg mb-6">{t('guide.title')}</h2>
        <div className="grid md:grid-cols-2 gap-6">
          {(['conversion', 'tips'] as const).map((sec) => (
            <div key={sec}>
              <h3 className="font-semibold text-fg mb-3">{t(`guide.${sec}.title`)}</h3>
              <ul className="list-disc pl-5 space-y-2 text-sm text-sub">
                {(t.raw(`guide.${sec}.items`) as string[]).map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default function HourlyWage() {
  return (
    <Suspense fallback={<div className="text-center py-12 text-muted">Loading...</div>}>
      <HourlyWageInner />
    </Suspense>
  )
}
