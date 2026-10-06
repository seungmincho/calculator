'use client'

import { useState, useMemo, useEffect } from 'react'
import Link from 'next/link'
import { useTranslations } from '@/lib/i18n'
import '@/lib/i18n/ns/weeklyHolidayPay'
import { useSearchParams } from '@/hooks/useSearchParams'
import ShareResult from '@/components/ShareResult'
import MobileResultLink from '@/components/MobileResultLink'
import { calculateNetSalary } from '@/utils/netSalary'
import { requiredBreak, BREAK_WAIVER_FROM, EI_INCOME_BASIS_FROM } from '@/utils/workHours'
import { todayKST } from '@/utils/dday'
import {
  calcWeek, evenDays, netDayHours, monthlyDeduction, MIN_WAGE_2026, type DeductMode,
} from '@/utils/weeklyHolidayPay'

const won = (n: number) => Math.round(n).toLocaleString('ko-KR')
const hrs = (n: number) => +n.toFixed(2)
const DEDUCTS: DeductMode[] = ['none', 'tax33', 'ins']
const SCENARIOS = [14.5, 15, 20, 30, 40]
const clampH = (v: number) => Math.max(0, Math.min(24, Number.isFinite(v) ? v : 0))

export default function WeeklyHolidayPay() {
  const t = useTranslations('weeklyHolidayPay')
  const sp = useSearchParams()
  const dayNames = t.raw('u.dayNames') as string[]

  const [wageText, setWageText] = useState(() => {
    const w = parseInt(sp.get('wage') || '')
    return (w > 0 ? w : MIN_WAGE_2026).toLocaleString('ko-KR')
  })
  const [mode, setMode] = useState<'even' | 'days'>(() => (sp.get('mode') === 'd' ? 'days' : 'even'))
  const [days, setDays] = useState(() => {
    const d = parseInt(sp.get('days') || '')
    return d >= 1 && d <= 7 ? d : 5
  })
  const [hours, setHours] = useState(() => {
    const h = parseFloat(sp.get('hours') || '')
    return h > 0 && h <= 24 ? h : 4
  })
  const [perDay, setPerDay] = useState<number[]>(() => {
    const dh = (sp.get('dh') || '').split(',').map(Number)
    return dh.length === 7 && dh.every((x) => x >= 0 && x <= 24) ? dh : evenDays(5, 4)
  })
  const [brk, setBrk] = useState(() => {
    const b = parseInt(sp.get('brk') || '')
    return b >= 0 && b <= 240 ? b : 0
  })
  const [deduct, setDeduct] = useState<DeductMode>(() => {
    const d = sp.get('ded') as DeductMode
    return DEDUCTS.includes(d) ? d : 'none'
  })

  // 법 개정 안내는 마운트 후 KST 날짜로 (첫 렌더 = 정적 HTML)
  const [today, setToday] = useState('')
  useEffect(() => setToday(todayKST()), [])

  const wage = parseInt(wageText.replace(/,/g, '')) || 0
  const stay = mode === 'even' ? evenDays(days, hours) : perDay
  const work = stay.map((h) => netDayHours(h, brk))
  const r = useMemo(() => calcWeek(wage, work), [wage, work.join()]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const p = new URLSearchParams()
    p.set('wage', String(wage))
    if (mode === 'days') { p.set('mode', 'd'); p.set('dh', perDay.join(',')) }
    else { p.set('days', String(days)); p.set('hours', String(hours)) }
    if (brk) p.set('brk', String(brk))
    if (deduct !== 'none') p.set('ded', deduct)
    const id = setTimeout(() => window.history.replaceState(null, '', `${window.location.pathname}?${p}`), 300)
    return () => clearTimeout(id)
  }, [wage, mode, days, hours, perDay, brk, deduct])

  const ded = monthlyDeduction(r.monthlyTotal, deduct)
  const incomeTax = useMemo(() => {
    if (deduct !== 'ins' || r.monthlyTotal <= 0) return 0
    const n = calculateNetSalary(r.monthlyTotal * 12, { nonTaxableMonthly: 0 })
    return n ? Math.floor((n.deductions.incomeTax + n.deductions.localIncomeTax) / 12 / 10) * 10 : 0
  }, [deduct, r.monthlyTotal])
  const totalDeduct = ded.total + incomeTax
  const netMonthly = r.monthlyTotal - totalDeduct

  const belowMin = wage > 0 && wage < MIN_WAGE_2026
  const breakShort = work.some((h, i) => stay[i] > 0 && brk < requiredBreak(h * 60))
  const under = calcWeek(wage, [5, 5, 4.5])
  const at15 = calcWeek(wage, evenDays(3, 5))
  const scenarios = SCENARIOS.map((h) => ({ h, ...calcWeek(wage, evenDays(5, h / 5)) }))
  const holidayShare = r.monthlyTotal > 0 ? ((r.monthlyTotal - r.monthlyBase) / r.monthlyTotal) * 100 : 0

  const seg = (on: boolean) =>
    `px-2 py-2 rounded-lg text-sm font-medium transition-colors ${on ? 'bg-primary text-white' : 'bg-soft text-body hover:bg-subtle'}`

  const setDay = (i: number, v: number) => setPerDay((p) => p.map((x, j) => (j === i ? clampH(v) : x)))
  const switchMode = (m: 'even' | 'days') => {
    if (m === 'days' && mode === 'even') setPerDay(evenDays(days, hours))
    setMode(m)
  }

  const faq = t.raw('u.faq.items') as { q: string; a: string }[]
  const sources = t.raw('u.sources.items') as { label: string; url: string }[]

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-fg">{t('title')}</h1>
        <p className="text-sm text-muted mt-1">{t('u.subtitle')}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* 입력 */}
        <div className="lg:col-span-1">
          <div className="ui-card p-6 space-y-5">
            <MobileResultLink href="#weekly-holiday-pay-result" label={t('u.weeklyHolidayPay')} value={`${won(r.holidayPay)}${t('u.won')}`} />
            <div>
              <label htmlFor="whp-wage" className="block text-sm font-medium text-body mb-2">{t('input.hourlyWage')}</label>
              <div className="relative">
                <input
                  id="whp-wage"
                  type="text"
                  inputMode="numeric"
                  value={wageText}
                  onChange={(e) => {
                    const v = e.target.value.replace(/,/g, '')
                    if (v === '' || /^\d{0,7}$/.test(v)) setWageText(v ? parseInt(v).toLocaleString('ko-KR') : '')
                  }}
                  className="ui-field w-full px-4 py-3 pr-10 text-lg tabular-nums"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-muted">{t('u.won')}</span>
              </div>
              <div className="flex items-center justify-between mt-1.5">
                <p className={`text-xs ${belowMin ? 'text-red-600' : 'text-muted'}`}>
                  {belowMin ? t('u.belowMin', { min: won(MIN_WAGE_2026) }) : t('input.hourlyWageHint')}
                </p>
                {wage !== MIN_WAGE_2026 && (
                  <button onClick={() => setWageText(MIN_WAGE_2026.toLocaleString('ko-KR'))} className="text-xs text-primary font-medium">
                    {t('u.useMin')}
                  </button>
                )}
              </div>
            </div>

            <div>
              <span className="block text-sm font-medium text-body mb-2">{t('u.inputMode')}</span>
              <div className="grid grid-cols-2 gap-1.5">
                <button onClick={() => switchMode('even')} aria-pressed={mode === 'even'} className={seg(mode === 'even')}>{t('u.modeEven')}</button>
                <button onClick={() => switchMode('days')} aria-pressed={mode === 'days'} className={seg(mode === 'days')}>{t('u.modeDays')}</button>
              </div>
            </div>

            {mode === 'even' ? (
              <>
                <div>
                  <span className="block text-sm font-medium text-body mb-2">{t('input.workDays')}</span>
                  <div className="grid grid-cols-7 gap-1">
                    {[1, 2, 3, 4, 5, 6, 7].map((d) => (
                      <button key={d} onClick={() => setDays(d)} aria-pressed={days === d} className={seg(days === d)}>{d}</button>
                    ))}
                  </div>
                </div>
                <div>
                  <label htmlFor="whp-hours" className="block text-sm font-medium text-body mb-2">{t('u.dailyStay')}</label>
                  <div className="flex items-center gap-2">
                    <input
                      id="whp-hours"
                      type="number" min={0} max={24} step={0.5}
                      value={hours}
                      onChange={(e) => setHours(clampH(parseFloat(e.target.value)))}
                      className="ui-field w-full px-4 py-2.5 tabular-nums"
                    />
                    <span className="text-sm text-muted">{t('input.hoursUnit')}</span>
                  </div>
                </div>
              </>
            ) : (
              <div>
                <span className="block text-sm font-medium text-body mb-2">{t('u.dailyStay')}</span>
                <div className="grid grid-cols-7 gap-1">
                  {dayNames.map((name, i) => (
                    <label key={name} className="text-center">
                      <span className="block text-xs text-muted mb-1">{name}</span>
                      <input
                        type="number" min={0} max={24} step={0.5}
                        value={perDay[i]}
                        onChange={(e) => setDay(i, parseFloat(e.target.value))}
                        aria-label={`${name} ${t('u.dailyStay')}`}
                        className="ui-field w-full px-0.5 py-2 text-center text-sm tabular-nums"
                      />
                    </label>
                  ))}
                </div>
              </div>
            )}

            <div>
              <label htmlFor="whp-break" className="block text-sm font-medium text-body mb-2">{t('u.breakLabel')}</label>
              <div className="grid grid-cols-4 gap-1.5">
                {[0, 30, 60].map((b) => (
                  <button key={b} onClick={() => setBrk(b)} aria-pressed={brk === b} className={seg(brk === b)}>
                    {t('u.minutes', { n: b })}
                  </button>
                ))}
                <input
                  id="whp-break"
                  type="number" min={0} max={240} step={10}
                  value={brk}
                  onChange={(e) => setBrk(Math.max(0, Math.min(240, parseInt(e.target.value) || 0)))}
                  className="ui-field w-full px-2 py-2 text-center text-sm tabular-nums"
                />
              </div>
              <p className="text-xs text-muted mt-1.5">{t('u.breakHint')}</p>
              {today && <p className="text-xs text-muted mt-1">{t(today >= BREAK_WAIVER_FROM ? 'u.law.breakAfter' : 'u.law.breakBefore')}</p>}
            </div>

            <div>
              <span className="block text-sm font-medium text-body mb-2">{t('u.deductLabel')}</span>
              <div className="grid grid-cols-3 gap-1.5">
                {DEDUCTS.map((d) => (
                  <button key={d} onClick={() => setDeduct(d)} aria-pressed={deduct === d} className={seg(deduct === d)}>
                    {t(`u.deduct.${d}`)}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* 결과 */}
        <div className="lg:col-span-2 space-y-4">
          <div id="weekly-holiday-pay-result" className="ui-card p-6 space-y-6 scroll-mt-20">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-sub">{t('u.weeklyHolidayPay')}</span>
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${r.eligible ? 'bg-primary-soft text-primary' : 'bg-soft text-sub'}`}>
                  {r.eligible ? t('eligible') : t('notEligible')}
                </span>
              </div>
              <div className="text-3xl font-bold text-fg tabular-nums mt-1">
                {won(r.holidayPay)}<span className="text-lg font-semibold ml-1">{t('u.won')}</span>
              </div>
              <p className="text-xs text-muted mt-1">
                {r.eligible
                  ? t('u.formula', { contract: hrs(r.contractHours), holiday: hrs(r.holidayHours), wage: won(wage) })
                  : t('u.formulaNone', { contract: hrs(r.contractHours) })}
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: t('u.weeklyHours'), value: `${hrs(r.workedHours)}${t('input.hoursUnit')}` },
                { label: t('result.weeklyTotal'), value: `${won(r.weeklyTotal)}${t('u.won')}` },
                { label: t('u.monthlyTotal'), value: `${won(r.monthlyTotal)}${t('u.won')}` },
                { label: t('u.effectiveHourly'), value: `${won(r.effectiveHourly)}${t('u.won')}` },
              ].map((s) => (
                <div key={s.label} className="bg-subtle rounded-xl p-3">
                  <div className="text-xs text-muted">{s.label}</div>
                  <div className="text-base font-bold text-fg tabular-nums mt-0.5">{s.value}</div>
                </div>
              ))}
            </div>

            {/* 월 구성 */}
            {r.monthlyTotal > 0 && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-sub">{t('u.monthlyHoursLine', { hours: r.monthlyHours })}</span>
                  <span className="text-muted tabular-nums">{t('u.holidayShare', { pct: holidayShare.toFixed(1) })}</span>
                </div>
                <div className="flex h-3 rounded-full overflow-hidden bg-track">
                  <div className="bg-primary" style={{ width: `${100 - holidayShare}%` }} />
                  <div className="bg-primary opacity-40" style={{ width: `${holidayShare}%` }} />
                </div>
                <div className="flex flex-wrap justify-between gap-2 text-xs text-muted tabular-nums">
                  <span>{t('result.monthlyBase')} {won(r.monthlyBase)}{t('u.won')}</span>
                  <span>{t('u.monthlyHolidayPart')} {won(r.monthlyTotal - r.monthlyBase)}{t('u.won')}</span>
                </div>
              </div>
            )}

            {/* 공제 후 실수령 */}
            {deduct !== 'none' && r.monthlyTotal > 0 && (
              <div className="bg-subtle rounded-2xl p-5 space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-sub">{t('u.monthlyTotal')}</span><span className="text-fg tabular-nums">{won(r.monthlyTotal)}{t('u.won')}</span></div>
                {deduct === 'tax33' ? (
                  <div className="flex justify-between"><span className="text-sub">{t('u.ded.tax33')}</span><span className="text-fg tabular-nums">-{won(ded.tax)}{t('u.won')}</span></div>
                ) : (
                  <>
                    {(['pension', 'health', 'care', 'employment'] as const).map((k) => (
                      <div key={k} className="flex justify-between"><span className="text-sub">{t(`u.ded.${k}`)}</span><span className="text-fg tabular-nums">-{won(ded[k])}{t('u.won')}</span></div>
                    ))}
                    <div className="flex justify-between"><span className="text-sub">{t('u.ded.incomeTax')}</span><span className="text-fg tabular-nums">-{won(incomeTax)}{t('u.won')}</span></div>
                  </>
                )}
                <div className="flex justify-between items-baseline border-t border-line pt-2">
                  <span className="font-semibold text-body">{t('u.netMonthly')}</span>
                  <span className="text-xl font-bold text-primary tabular-nums">{won(netMonthly)}{t('u.won')}</span>
                </div>
                <p className="text-xs text-muted">{t(deduct === 'tax33' ? 'u.ded.tax33Note' : 'u.ded.insNote')}</p>
                {deduct === 'ins' && today && <p className="text-xs text-muted">{t(today >= EI_INCOME_BASIS_FROM ? 'u.law.eiAfter' : 'u.law.eiBefore')}</p>}
              </div>
            )}

            {(!r.eligible || belowMin || r.overtimeHours > 0 || breakShort) && (
              <div className="bg-amber-50 text-amber-800 rounded-2xl p-4 text-sm space-y-1">
                {!r.eligible && <p>{t('u.warnUnder15', { need: hrs(Math.max(0, 15 - r.contractHours)) })}</p>}
                {belowMin && <p>{t('u.warnMinWage', { min: won(MIN_WAGE_2026), diff: won(MIN_WAGE_2026 - wage) })}</p>}
                {r.overtimeHours > 0 && <p>{t('u.warnOvertime', { ot: hrs(r.overtimeHours) })}</p>}
                {breakShort && <p>{t('u.warnBreak')}{today >= BREAK_WAIVER_FROM && ' ' + t('u.law.breakWaiverWarn')}</p>}
              </div>
            )}

            <ShareResult
              card={{
                tool: t('title'),
                label: t('u.share.label', { wage: won(wage), hours: hrs(r.workedHours) }),
                headline: `${won(r.holidayPay)}${t('u.won')}`,
                sub: t('u.share.sub'),
                rows: [
                  { label: t('result.weeklyTotal'), value: `${won(r.weeklyTotal)}${t('u.won')}` },
                  { label: t('u.monthlyTotal'), value: `${won(r.monthlyTotal)}${t('u.won')}` },
                  { label: t('u.effectiveHourly'), value: `${won(r.effectiveHourly)}${t('u.won')}` },
                ],
              }}
              text={t('u.share.text', { hours: hrs(r.workedHours), pay: won(r.holidayPay), monthly: won(r.monthlyTotal) })}
            />
          </div>

          {/* 15시간 쪼개기 비교 */}
          <div className="ui-card p-6 space-y-4">
            <div>
              <h2 className="text-lg font-semibold text-fg">{t('u.split.title')}</h2>
              <p className="text-sm text-muted mt-1">{t('u.split.desc')}</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[{ k: 'under', c: under, h: 14.5 }, { k: 'at15', c: at15, h: 15 }].map(({ k, c, h }) => (
                <div key={k} className={`rounded-xl p-4 ${k === 'at15' ? 'bg-primary-soft' : 'bg-subtle'}`}>
                  <div className={`text-sm font-medium ${k === 'at15' ? 'text-primary' : 'text-sub'}`}>{t('u.split.week', { h })}</div>
                  <div className="text-xl font-bold text-fg tabular-nums mt-1">{won(c.monthlyTotal)}{t('u.won')}</div>
                  <div className="text-xs text-muted mt-1">{t('u.split.detail', { holiday: hrs(c.holidayHours), hours: c.monthlyHours })}</div>
                </div>
              ))}
            </div>
            <p className="text-sm text-body">
              {t('u.split.result', { diff: won(at15.monthlyTotal - under.monthlyTotal) })}
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-line text-muted">
                    <th className="text-left font-medium py-2">{t('scenario.colHours')}</th>
                    <th className="text-right font-medium py-2">{t('scenario.colHolidayPay')}</th>
                    <th className="text-right font-medium py-2">{t('scenario.colMonthlyTotal')}</th>
                    <th className="text-right font-medium py-2">{t('u.effectiveHourly')}</th>
                  </tr>
                </thead>
                <tbody>
                  {scenarios.map((s) => {
                    const cur = Math.abs(s.h - r.workedHours) < 0.01
                    return (
                      <tr key={s.h} className={`border-b border-line ${cur ? 'bg-primary-soft' : ''}`}>
                        <td className={`py-2.5 pl-1 ${cur ? 'text-primary font-semibold' : 'text-body'}`}>
                          {s.h}{t('input.hoursUnit')}{cur && <span className="ml-1.5 text-xs">{t('scenario.current')}</span>}
                        </td>
                        <td className="py-2.5 text-right tabular-nums text-fg">{s.eligible ? `${won(s.holidayPay)}${t('u.won')}` : '-'}</td>
                        <td className="py-2.5 text-right tabular-nums font-semibold text-fg">{won(s.monthlyTotal)}{t('u.won')}</td>
                        <td className="py-2.5 pr-1 text-right tabular-nums text-sub">{won(s.effectiveHourly)}{t('u.won')}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
              <p className="text-xs text-faint mt-2">{t('u.split.footnote')}</p>
            </div>
          </div>
        </div>
      </div>

      {/* 가이드 */}
      <div className="ui-card p-6 space-y-6">
        <h2 className="text-xl font-semibold text-fg">{t('guide.title')}</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {(['calc', 'notes'] as const).map((sec) => (
            <div key={sec}>
              <h3 className="font-semibold text-fg mb-3">{t(`u.guide.${sec}.title`)}</h3>
              <ul className="list-disc pl-5 space-y-2 text-sm text-sub">
                {(t.raw(`u.guide.${sec}.items`) as string[]).map((item, i) => <li key={i}>{item}</li>)}
              </ul>
            </div>
          ))}
        </div>

        <div>
          <h3 className="font-semibold text-fg mb-3">{t('u.faq.title')}</h3>
          <div className="divide-y divide-line border-y border-line">
            {faq.map((f) => (
              <details key={f.q} className="py-3 group">
                <summary className="cursor-pointer text-sm font-medium text-body">{f.q}</summary>
                <p className="text-sm text-sub mt-2 leading-relaxed">{f.a}</p>
              </details>
            ))}
          </div>
        </div>

        <div className="bg-subtle rounded-2xl p-5 text-sm text-sub space-y-2">
          <p className="font-medium text-body">{t('u.sources.title')}</p>
          <ul className="space-y-1">
            {sources.map((s) => (
              <li key={s.url}>
                <a href={s.url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">{s.label}</a>
              </li>
            ))}
          </ul>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link href="/hourly-wage/" className="ui-btn-soft px-3 py-2 text-sm">{t('u.links.hourlyWage')}</Link>
          <Link href="/work-hours-calculator/" className="ui-btn-soft px-3 py-2 text-sm">{t('u.links.workHours')}</Link>
          <Link href="/salary-calculator/" className="ui-btn-soft px-3 py-2 text-sm">{t('u.links.salary')}</Link>
        </div>
      </div>
    </div>
  )
}
