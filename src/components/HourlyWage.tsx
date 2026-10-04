'use client'

import { useState, useMemo, useCallback, useEffect } from 'react'
import Link from 'next/link'
import { useTranslations } from '@/lib/i18n'
import { useSearchParams } from '@/hooks/useSearchParams'
import { MIN_WAGE_2026, calcPay, shiftMinutes } from '@/utils/workHours'
import { MIN_WAGE_2027 } from '@/utils/minimumWage'
import { wageTable, type WageType } from '@/utils/weeklyHolidayPay'
import { calculateNetSalary } from '@/utils/netSalary'
import ShareResult from '@/components/ShareResult'

type InputType = WageType
const TYPES: InputType[] = ['hourly', 'daily', 'weekly', 'monthly', 'yearly']
const PRESETS = [15, 20, 30, 40]
const AVG_ANNUAL_SALARY_KR = 42_000_000 // 한국 근로자 평균 연봉 약 4,200만원 (2024 기준)

const won = (v: number) => Math.round(v).toLocaleString('ko-KR')

export default function HourlyWage() {
  const t = useTranslations('hourlyWage')
  const sp = useSearchParams()

  const [inputType, setInputType] = useState<InputType>('hourly')
  const [amount, setAmount] = useState<string>(MIN_WAGE_2026.toLocaleString('ko-KR'))
  const [daysPerWeek, setDaysPerWeek] = useState<number>(5)
  const [weeklyHours, setWeeklyHours] = useState<number>(40)
  const [holiday, setHoliday] = useState<boolean>(true)
  const [dStart, setDStart] = useState('09:00')
  const [dEnd, setDEnd] = useState('18:00')
  const [dHoliday, setDHoliday] = useState(false)
  const [small, setSmall] = useState(false)

  // 공유 링크 복원은 마운트 후 1회 → 정적 HTML과 hydration 첫 렌더는 항상 기본값
  useEffect(() => {
    const ty = sp.get('type') as InputType
    if (TYPES.includes(ty)) setInputType(ty)
    const w = parseInt(sp.get('wage') || '')
    if (w > 0) setAmount(w.toLocaleString('ko-KR'))
    const d = parseFloat(sp.get('days') || '')
    if (d > 0 && d <= 7) setDaysPerWeek(d)
    const wh = parseFloat(sp.get('wh') || '')
    const h = parseFloat(sp.get('hours') || '') // 구버전 공유 링크: hours(1일) × days
    if (wh > 0 && wh <= 68) setWeeklyHours(wh)
    else if (h > 0) setWeeklyHours(Math.min(68, h * (d || 5)))
    if (sp.get('hol') === '0') setHoliday(false)
    const hm = (v: string | null) => v && /^\d{2}:\d{2}$/.test(v)
    const ds = sp.get('ds'), de = sp.get('de')
    if (hm(ds)) setDStart(ds!)
    if (hm(de)) setDEnd(de!)
    if (sp.get('dhol') === '1') setDHoliday(true)
    if (sp.get('small') === '1') setSmall(true)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const shareUrl = useCallback(() => {
    const p = new URLSearchParams()
    const raw = amount.replace(/,/g, '')
    if (raw) p.set('wage', raw)
    if (inputType !== 'hourly') p.set('type', inputType)
    if (weeklyHours !== 40) p.set('wh', String(weeklyHours))
    if (daysPerWeek !== 5) p.set('days', String(daysPerWeek))
    if (!holiday) p.set('hol', '0')
    if (dStart !== '09:00') p.set('ds', dStart)
    if (dEnd !== '18:00') p.set('de', dEnd)
    if (dHoliday) p.set('dhol', '1')
    if (small) p.set('small', '1')
    const qs = p.toString()
    return `${window.location.pathname}${qs ? '?' + qs : ''}`
  }, [amount, inputType, weeklyHours, daysPerWeek, holiday, dStart, dEnd, dHoliday, small])

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

  // 하루 근무 (연장·야간·휴일 가산) — 법정 최소 휴게 자동 적용
  const day = useMemo(
    () => (r ? calcPay([{ week: 'd', start: dStart, end: dEnd, breakMin: -1, holiday: dHoliday }], r.hourly, small) : null),
    [r, dStart, dEnd, dHoliday, small]
  )
  const typeLabel = (ty: InputType) => (ty === 'weekly' ? t('u.weeklyShort') : t(ty))

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
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* 입력 */}
        <div className="lg:col-span-1">
          <div className="ui-card p-6 space-y-5">
            <div>
              <label className="block text-sm font-medium text-body mb-2">{t('inputType')}</label>
              <div className="grid grid-cols-5 gap-1">
                {TYPES.map((type) => (
                  <button
                    key={type}
                    onClick={() => setInputType(type)}
                    aria-pressed={inputType === type}
                    className={`px-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                      inputType === type ? 'bg-primary text-white' : 'bg-soft text-body hover:bg-subtle'
                    }`}
                  >
                    {typeLabel(type)}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label htmlFor="hw-amount" className="block text-sm font-medium text-body mb-2">
                {typeLabel(inputType)} {t('amount')}
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
        <div className="lg:col-span-2 space-y-4">
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
                            {row.key === 'weekly' ? (holiday ? t('weekly') : t('u.weeklyShort')) : t(`result.${row.key}Wage`)}
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
                  <p className={`text-sm font-medium ${isAbove ? 'text-body' : 'text-red-600'}`} aria-live="polite">
                    {isAbove
                      ? t('minWage.above', { diff: won(r.hourly - MIN_WAGE_2026) })
                      : t('minWage.below', { diff: won(MIN_WAGE_2026 - r.hourly) })}
                  </p>
                  {!isAbove && !holiday && (inputType === 'monthly' || inputType === 'yearly') && (
                    <p className="text-xs text-muted">{t('minWage.holidayNote')}</p>
                  )}
                  <p className="text-xs text-muted">
                    {t('minWage.next', { wage: won(MIN_WAGE_2027), hours: r.monthlyHours, amount: won(MIN_WAGE_2027 * r.monthlyHours) })}
                    {isAbove && Math.round(r.hourly) < MIN_WAGE_2027 && ` ${t('minWage.nextBelow', { diff: won(MIN_WAGE_2027 - r.hourly) })}`}
                  </p>
                  <p className="text-xs text-muted">
                    {t('avgCompare', { percent: Math.round((r.yearly / AVG_ANNUAL_SALARY_KR) * 100) })}
                  </p>
                </div>

                <ShareResult
                  className="pt-4 border-t border-line"
                  card={{
                    tool: t('title'),
                    label: t('u.share.label', { type: typeLabel(inputType), amount: amount, hours: weeklyHours }),
                    headline: `${t('hourly')} ${won(r.hourly)}${t('result.won')}`,
                    sub: t('u.share.sub', { pct: minPct }),
                    rows: [
                      { label: t('result.dailyWage'), value: `${won(r.daily)}${t('result.won')}` },
                      { label: t('u.weeklyShort'), value: `${won(r.weekly)}${t('result.won')}` },
                      { label: t('result.monthlyWage'), value: `${won(r.monthly)}${t('result.won')}` },
                      { label: t('result.yearlyWage'), value: `${won(r.yearly)}${t('result.won')}` },
                    ],
                  }}
                />
              </>
            ) : (
              <p className="text-center py-12 text-muted">{t('amountPlaceholder')}</p>
            )}
          </div>

          {/* 하루 근무 가산수당 */}
          {r && day && (
            <div className="ui-card p-6 space-y-4">
              <div>
                <h2 className="text-lg font-semibold text-fg">{t('u.day.title')}</h2>
                <p className="text-sm text-muted mt-1">{t('u.day.desc', { wage: won(r.hourly) })}</p>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 items-end">
                <label className="block">
                  <span className="block text-sm font-medium text-body mb-1.5">{t('u.day.start')}</span>
                  <input type="time" value={dStart} onChange={(e) => e.target.value && setDStart(e.target.value)} className="ui-field w-full px-3 py-2 tabular-nums" />
                </label>
                <label className="block">
                  <span className="block text-sm font-medium text-body mb-1.5">{t('u.day.end')}</span>
                  <input type="time" value={dEnd} onChange={(e) => e.target.value && setDEnd(e.target.value)} className="ui-field w-full px-3 py-2 tabular-nums" />
                </label>
                <button onClick={() => setDHoliday(!dHoliday)} aria-pressed={dHoliday}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${dHoliday ? 'bg-primary text-white' : 'bg-soft text-body hover:bg-subtle'}`}>
                  {t('u.day.holiday')}
                </button>
                <button onClick={() => setSmall(!small)} aria-pressed={small}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${small ? 'bg-primary text-white' : 'bg-soft text-body hover:bg-subtle'}`}>
                  {t('u.day.small')}
                </button>
              </div>
              <div className="flex items-baseline justify-between gap-3 flex-wrap">
                <span className="text-sm text-sub">{t('u.day.total', { hours: +day.totalHours.toFixed(2), brk: shiftMinutes({ start: dStart, end: dEnd, breakMin: -1 }).brk })}</span>
                <span className="text-2xl font-bold text-fg tabular-nums">{won(day.totalPay)}{t('result.won')}</span>
              </div>
              <div className="bg-subtle rounded-2xl p-4 space-y-1.5 text-sm">
                {([
                  ['basic', day.basicPay, day.basicHours],
                  ['overtime', day.overtimePay, day.overtimeHours],
                  ['night', day.nightPay, day.nightHours],
                  ['holidayWork', day.holidayPay + day.holidayOverPay, day.holidayHours + day.holidayOver8Hours],
                ] as const).filter(([k, v]) => k === 'basic' || v > 0).map(([k, v, h]) => (
                  <div key={k} className="flex justify-between">
                    <span className="text-sub">{t(`u.day.${k}`, { hours: +h.toFixed(2) })}</span>
                    <span className="text-fg tabular-nums">{won(v)}{t('result.won')}</span>
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted">{small ? t('u.day.smallNote') : t('u.day.note')}</p>
            </div>
          )}
        </div>
      </div>

      <div className="ui-card p-6 space-y-6">
        <h2 className="text-xl font-semibold text-fg">{t('guide.title')}</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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

        <div>
          <h3 className="font-semibold text-fg mb-3">{t('u.faq.title')}</h3>
          <div className="divide-y divide-line border-y border-line">
            {(t.raw('u.faq.items') as { q: string; a: string }[]).map((f) => (
              <details key={f.q} className="py-3">
                <summary className="cursor-pointer text-sm font-medium text-body">{f.q}</summary>
                <p className="text-sm text-sub mt-2 leading-relaxed">{f.a}</p>
              </details>
            ))}
          </div>
        </div>

        <div className="bg-subtle rounded-2xl p-5 text-sm text-sub space-y-2">
          <p className="font-medium text-body">{t('u.sources.title')}</p>
          <ul className="space-y-1">
            {(t.raw('u.sources.items') as { label: string; url: string }[]).map((src) => (
              <li key={src.url}>
                <a href={src.url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">{src.label}</a>
              </li>
            ))}
          </ul>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link href="/weekly-holiday-pay/" className="ui-btn-soft px-3 py-2 text-sm">{t('links.weeklyHolidayPay')}</Link>
          <Link href="/work-hours-calculator/" className="ui-btn-soft px-3 py-2 text-sm">{t('links.workHours')}</Link>
          <Link href="/salary-calculator/" className="ui-btn-soft px-3 py-2 text-sm">{t('u.links.salary')}</Link>
        </div>
      </div>
    </div>
  )
}
