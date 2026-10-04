'use client'

import { useState, useEffect, useRef, type KeyboardEvent } from 'react'
import Link from 'next/link'
import { ExternalLink } from 'lucide-react'
import { useTranslations } from '@/lib/i18n'
import '@/lib/i18n/ns/minimumWage'
import { useSearchParams } from '@/hooks/useSearchParams'
import ShareResult from '@/components/ShareResult'
import {
  YEARS, DEFAULT_YEAR, HOURS_TABLE, calcMinWage, checkWage, hourlyFor, raiseFrom, type Year,
} from '@/utils/minimumWageCalc'

type Mode = 'ft' | 'pt'
type PayType = 'hourly' | 'monthly'

const HOUR_PRESETS = [15, 20, 25, 30, 35] as const
const DAY_OPTS = [1, 2, 3, 4, 5, 6, 7] as const
const MAX_HOURS = 52
const MAX_PAY = 100_000_000
const REPORT_URL = 'https://labor.moel.go.kr/minwonSysInfo/minwagesys.do'

const won = (n: number) => Math.round(n).toLocaleString('ko-KR')
const dec = (n: number) => n.toLocaleString('ko-KR', { maximumFractionDigits: 1 })
const digits = (s: string) => s.replace(/[^\d]/g, '')
const intParam = (v: string | null, def: number, min: number, max: number) => {
  const n = Number(v)
  return v != null && v !== '' && Number.isInteger(n) && n >= min ? Math.min(n, max) : def
}

/** 라디오 의미의 세그먼트 버튼 (방향키로 이동) */
function Segmented<T extends string | number>({
  label, options, value, onChange, render, cols,
}: {
  label: string
  options: readonly T[]
  value: T
  onChange: (v: T) => void
  render: (v: T) => string
  cols: string
}) {
  const refs = useRef<(HTMLButtonElement | null)[]>([])
  const onKey = (e: KeyboardEvent, i: number) => {
    const step = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0
    if (!step) return
    e.preventDefault()
    const next = (i + step + options.length) % options.length
    onChange(options[next])
    refs.current[next]?.focus()
  }
  return (
    <div role="radiogroup" aria-label={label} className={`grid ${cols} gap-2`}>
      {options.map((o, i) => {
        const on = o === value
        return (
          <button
            key={String(o)} ref={(el) => { refs.current[i] = el }} type="button" role="radio" aria-checked={on}
            tabIndex={on ? 0 : -1} onClick={() => onChange(o)} onKeyDown={(e) => onKey(e, i)}
            className={`min-h-[44px] px-2 py-2 rounded-lg text-sm font-medium transition-colors ${on ? 'bg-primary text-white' : 'bg-soft text-body hover:bg-subtle'}`}
          >
            {render(o)}
          </button>
        )
      })}
    </div>
  )
}

export default function MinimumWageCalculator() {
  const t = useTranslations('minimumWage')
  const sp = useSearchParams()

  const [year, setYear] = useState<Year>(() => (YEARS.includes(Number(sp.get('y')) as Year) ? (Number(sp.get('y')) as Year) : DEFAULT_YEAR))
  const [mode, setMode] = useState<Mode>(() => (sp.get('m') === 'pt' ? 'pt' : 'ft'))
  const [hours, setHours] = useState(() => intParam(sp.get('h'), 20, 1, MAX_HOURS))
  const [days, setDays] = useState(() => intParam(sp.get('d'), 5, 1, 7))
  const [payType, setPayType] = useState<PayType>(() => (sp.get('wt') === 'm' ? 'monthly' : 'hourly'))
  const [pay, setPay] = useState(() => intParam(sp.get('w'), 0, 1, MAX_PAY))
  const [probation, setProbation] = useState(() => sp.get('p') === '1')

  useEffect(() => {
    const q = new URLSearchParams()
    if (year !== DEFAULT_YEAR) q.set('y', String(year))
    if (mode === 'pt') { q.set('m', 'pt'); q.set('h', String(hours)); q.set('d', String(days)) }
    if (pay > 0) { q.set('w', String(pay)); if (payType === 'monthly') q.set('wt', 'm') }
    if (probation) q.set('p', '1')
    const s = q.toString()
    window.history.replaceState(null, '', s ? `?${s}` : window.location.pathname)
  }, [year, mode, hours, days, payType, pay, probation])

  const effHours = mode === 'ft' ? 40 : hours
  const effDays = mode === 'ft' ? 5 : days
  const r = calcMinWage(year, effHours, effDays)
  const raise = raiseFrom(year)
  const minHourly = hourlyFor(year, probation)
  const c = checkWage(pay, payType, minHourly, r.monthlyHours)
  const basis = mode === 'ft' ? t('u.basisFt') : t('u.basisPt', { h: dec(r.hours), d: r.days, mh: r.monthlyHours })
  const W = t('won')

  const rows = [
    { key: 'daily', value: r.daily, hint: t('u.rows.dailyHint', { h: dec(r.dailyHours) }) },
    { key: 'weekly', value: r.weekly, hint: r.eligible ? t('u.rows.weeklyOn', { h: dec(r.holidayHours) }) : t('u.rows.weeklyOff') },
    { key: 'monthly', value: r.monthly, hint: t('u.rows.monthlyHint', { h: r.monthlyHours }) },
    { key: 'yearly', value: r.yearly, hint: t('u.rows.yearlyHint') },
  ] as const

  const card = c.below
    ? {
        tool: t('title'),
        label: t('u.share.belowLabel', { year }),
        headline: t('u.share.belowHeadline', { gap: won(c.gapHourly) }),
        sub: t('u.share.belowSub', { month: won(c.shortMonthly), yearly: won(c.shortYearly) }),
        rows: [
          { label: t('u.share.myHourly'), value: `${won(c.myHourly)}${W}` },
          { label: t('u.share.minHourly'), value: `${won(minHourly)}${W}` },
          { label: t('u.rows.monthly'), value: `${won(r.monthly)}${W}` },
        ],
      }
    : {
        tool: t('title'),
        label: t('u.share.label', { year }),
        headline: `${won(r.hourly)}${W}`,
        sub: t('u.share.sub', { monthly: won(r.monthly), basis }),
        rows: rows.map((x) => ({ label: t(`u.rows.${x.key}`), value: `${won(x.value)}${W}` })),
      }
  const shareText = c.below
    ? t('u.share.belowText', { year, gap: won(c.gapHourly) })
    : t('u.share.text', { year, wage: won(r.hourly), monthly: won(r.monthly) })

  const faq = t.raw('guide.faq.items') as { q: string; a: string }[]
  const sources = t.raw('guide.sources.items') as { label: string; url: string }[]

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-fg">{t('title')}</h1>
        <p className="text-sm text-muted mt-1">{t('subtitle')}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* 입력 */}
        <div className="lg:col-span-1">
          <div className="ui-card p-6 space-y-5">
            <div>
              <p className="text-sm font-medium text-body mb-2">{t('u.year.label')}</p>
              <Segmented label={t('u.year.label')} options={YEARS} value={year} onChange={setYear} render={(y) => t('u.year.opt', { year: y })} cols="grid-cols-2" />
              <p className="text-xs text-muted mt-1.5">{t(`u.year.hint${year}`)}</p>
            </div>

            <div>
              <p className="text-sm font-medium text-body mb-2">{t('u.mode.label')}</p>
              <Segmented label={t('u.mode.label')} options={['ft', 'pt'] as const} value={mode} onChange={setMode} render={(m) => t(`u.mode.${m}`)} cols="grid-cols-2" />
            </div>

            {mode === 'pt' && (
              <>
                <div>
                  <label htmlFor="mw-hours" className="block text-sm font-medium text-body mb-2">{t('u.hours')}</label>
                  <div className="relative">
                    <input
                      id="mw-hours" type="text" inputMode="numeric" value={hours ? String(hours) : ''}
                      onChange={(e) => setHours(Math.min(Number(digits(e.target.value)) || 0, MAX_HOURS))}
                      className="ui-field w-full px-4 py-3 pr-14 tabular-nums" aria-describedby="mw-hours-hint"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-muted">{t('u.hoursUnit')}</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {HOUR_PRESETS.map((n) => (
                      <button
                        key={n} type="button" onClick={() => setHours(n)} aria-pressed={hours === n}
                        className={`min-h-[44px] px-3 py-2 rounded-lg text-sm transition-colors ${hours === n ? 'bg-primary text-white' : 'bg-soft text-body hover:bg-subtle'}`}
                      >
                        {t('u.hourOpt', { n })}
                      </button>
                    ))}
                  </div>
                  <p id="mw-hours-hint" className="text-xs text-muted mt-1.5">
                    {r.eligible ? t('u.hoursHint', { h: dec(r.dailyHours), hol: dec(r.holidayHours) }) : t('u.noHoliday')}
                  </p>
                </div>

                <div>
                  <label htmlFor="mw-days" className="block text-sm font-medium text-body mb-2">{t('u.days')}</label>
                  <select id="mw-days" value={days} onChange={(e) => setDays(Number(e.target.value))} className="ui-field w-full px-4 py-3 min-h-[44px]">
                    {DAY_OPTS.map((n) => <option key={n} value={n}>{t('u.dayOpt', { n })}</option>)}
                  </select>
                  {r.clipped && <p className="text-xs bg-amber-50 text-amber-800 rounded-lg p-2 mt-2">{t('u.clipped', { d: r.days, max: dec(r.hours) })}</p>}
                </div>
              </>
            )}
          </div>
        </div>

        {/* 결과 */}
        <div className="lg:col-span-2 space-y-6">
          <div className="ui-card p-6 space-y-5">
            <div aria-live="polite">
              <p className="text-sm text-muted">{t('u.resultLabel', { year })}</p>
              <p className="text-3xl font-bold text-fg tabular-nums mt-1">{won(r.hourly)}{W}</p>
              {raise.diff > 0 && (
                <p className="text-sm text-sub mt-1">{t('u.raise', { prevYear: year - 1, prev: won(raise.prev), diff: won(raise.diff), rate: raise.rate.toFixed(1) })}</p>
              )}
              <p className="text-xs text-muted mt-1">{basis}</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {rows.map((x) => {
                const hi = x.key === 'monthly'
                return (
                  <div key={x.key} className={`rounded-2xl p-4 ${hi ? 'bg-primary-soft' : 'bg-subtle'}`}>
                    <p className={`text-sm ${hi ? 'text-primary font-medium' : 'text-muted'}`}>{t(`u.rows.${x.key}`)}</p>
                    <p className="text-lg sm:text-xl font-bold text-fg tabular-nums mt-1">{won(x.value)}{W}</p>
                    <p className="text-xs text-muted mt-0.5">{x.hint}</p>
                  </div>
                )
              })}
            </div>

            <div className="text-sm text-sub space-y-1">
              {raise.diff > 0 && <p>{t('u.monthlyRaise', { prevYear: year - 1, diff: won(raise.diff * r.monthlyHours) })}</p>}
              <p className="text-xs text-muted">{t('u.note')}</p>
            </div>

            <ShareResult card={card} text={shareText} fileName={`minimum-wage-${year}`} />
          </div>

          {/* 내 임금 위반 체크 */}
          <div className="ui-card p-6 space-y-4">
            <div>
              <h2 className="text-lg font-semibold text-fg">{t('u.check.title')}</h2>
              <p className="text-sm text-muted mt-1">{t('u.check.desc')}</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-body mb-2">{t('u.check.typeLabel')}</p>
                <Segmented label={t('u.check.typeLabel')} options={['hourly', 'monthly'] as const} value={payType} onChange={setPayType} render={(v) => t(`u.check.type${v === 'hourly' ? 'Hourly' : 'Monthly'}`)} cols="grid-cols-2" />
              </div>
              <div>
                <label htmlFor="mw-pay" className="block text-sm font-medium text-body mb-2">{t(payType === 'hourly' ? 'u.check.inputHourly' : 'u.check.inputMonthly')}</label>
                <div className="relative">
                  <input
                    id="mw-pay" type="text" inputMode="numeric" value={pay ? won(pay) : ''}
                    onChange={(e) => setPay(Math.min(Number(digits(e.target.value)) || 0, MAX_PAY))}
                    placeholder={won(payType === 'hourly' ? minHourly : minHourly * r.monthlyHours)}
                    className="ui-field w-full px-4 py-3 pr-12 tabular-nums" aria-describedby="mw-pay-hint"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-muted">{W.trim()}</span>
                </div>
              </div>
            </div>
            <p id="mw-pay-hint" className="text-xs text-muted">
              {payType === 'hourly' ? t('u.check.hintHourly') : t('u.check.hintMonthly', { mh: r.monthlyHours })}
            </p>

            <label className="flex items-start gap-3 min-h-[44px] cursor-pointer">
              <input type="checkbox" checked={probation} onChange={(e) => setProbation(e.target.checked)} className="w-5 h-5 mt-0.5 accent-primary shrink-0" />
              <span className="text-sm text-body">{t('u.check.probation')}</span>
            </label>
            {probation && <p className="text-xs text-muted -mt-2">{t('u.check.probationHint', { wage: won(minHourly) })}</p>}

            <div aria-live="polite">
              {pay <= 0 ? (
                <p className="bg-subtle rounded-2xl p-4 text-sm text-sub">{t('u.check.empty')}</p>
              ) : c.below ? (
                <div className="bg-amber-50 text-amber-800 rounded-2xl p-4 space-y-1">
                  <p className="font-semibold">{t('u.check.below')}</p>
                  <p className="text-sm">{t('u.check.belowDetail', { gap: won(c.gapHourly), month: won(c.shortMonthly), yearly: won(c.shortYearly) })}</p>
                  <p className="text-xs tabular-nums">{t('u.check.myHourly', { wage: won(c.myHourly), min: won(minHourly) })}</p>
                </div>
              ) : (
                <div className="bg-primary-soft rounded-2xl p-4 space-y-1">
                  <p className="font-semibold text-primary">{t('u.check.ok')}</p>
                  <p className="text-sm text-body">{t('u.check.okDetail', { surplus: won(c.surplusHourly) })}</p>
                  <p className="text-xs text-sub tabular-nums">{t('u.check.myHourly', { wage: won(c.myHourly), min: won(minHourly) })}</p>
                </div>
              )}
            </div>
            {c.below && (
              <div className="text-sm text-sub space-y-2">
                <p>{t('u.check.action')}</p>
                <a href={REPORT_URL} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 min-h-[44px] text-primary hover:underline">
                  {t('u.check.reportLink')} <ExternalLink className="w-4 h-4" aria-hidden="true" />
                </a>
              </div>
            )}
          </div>

          {/* 근무시간별 월급 표 */}
          <div className="ui-card p-6 space-y-4">
            <div>
              <h2 className="text-lg font-semibold text-fg">{t('u.table.title', { year })}</h2>
              <p className="text-sm text-muted mt-1">{t('u.table.desc')}</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm tabular-nums">
                <caption className="sr-only">{t('u.table.caption', { year })}</caption>
                <thead>
                  <tr className="border-b border-line text-muted">
                    <th scope="col" className="text-left font-medium py-2 pr-2">{t('u.table.colHours')}</th>
                    <th scope="col" className="text-right font-medium py-2 px-2">{t('u.table.colHoliday')}</th>
                    <th scope="col" className="text-right font-medium py-2 px-2">{t('u.table.colMonthlyHours')}</th>
                    <th scope="col" className="text-right font-medium py-2 pl-2">{t('u.table.colMonthly')}</th>
                  </tr>
                </thead>
                <tbody>
                  {HOURS_TABLE.map((h) => {
                    const x = calcMinWage(year, h, 5)
                    const on = h === r.hours
                    return (
                      <tr key={h} className={`border-b border-line ${on ? 'bg-primary-soft' : ''}`} aria-current={on ? 'true' : undefined}>
                        <th scope="row" className={`text-left font-medium py-3 pr-2 ${on ? 'text-primary' : 'text-body'}`}>{t('u.table.hoursCell', { h })}</th>
                        <td className="text-right py-3 px-2 text-sub">{t('u.table.hoursCell', { h: dec(x.holidayHours) })}</td>
                        <td className="text-right py-3 px-2 text-sub">{t('u.table.hoursCell', { h: x.monthlyHours })}</td>
                        <td className="text-right py-3 pl-2 font-semibold text-fg">{won(x.monthly)}{W}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-muted">{t('u.table.note')}</p>
          </div>

          <p className="text-xs text-faint">{t('u.disclaimer')}</p>
        </div>
      </div>

      {/* 가이드 */}
      <div className="ui-card p-6 space-y-6">
        <h2 className="text-xl font-semibold text-fg">{t('guide.title')}</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {(['decision', 'scope', 'inclusion', 'probation', 'violation'] as const).map((sec) => (
            <div key={sec}>
              <h3 className="font-semibold text-fg mb-3">{t(`guide.${sec}.title`)}</h3>
              <ul className="list-disc pl-5 space-y-2 text-sm text-sub">
                {(t.raw(`guide.${sec}.items`) as string[]).map((item, i) => <li key={i}>{item}</li>)}
              </ul>
            </div>
          ))}
        </div>

        <div>
          <h3 className="font-semibold text-fg mb-3">{t('guide.faq.title')}</h3>
          <div className="divide-y divide-line border-y border-line">
            {faq.map((f) => (
              <details key={f.q} className="py-3">
                <summary className="cursor-pointer text-sm font-medium text-body min-h-[24px]">{f.q}</summary>
                <p className="text-sm text-sub mt-2 leading-relaxed">{f.a}</p>
              </details>
            ))}
          </div>
        </div>

        <div className="bg-subtle rounded-2xl p-5 text-sm text-sub space-y-2">
          <p className="font-medium text-body">{t('guide.sources.title')}</p>
          <ul className="space-y-1">
            {sources.map((s) => (
              <li key={s.url}><a href={s.url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">{s.label}</a></li>
            ))}
          </ul>
          <p className="text-xs text-muted">{t('guide.sources.asOf')}</p>
        </div>

        <div>
          <h3 className="font-semibold text-fg mb-3">{t('guide.links.title')}</h3>
          <div className="flex flex-wrap gap-2">
            {(['hourly-wage', 'weekly-holiday-pay', 'work-hours-calculator', 'salary-calculator'] as const).map((href) => (
              <Link key={href} href={`/${href}/`} className="ui-btn-soft min-h-[44px] inline-flex items-center px-3 py-2 text-sm">{t(`guide.links.${href}`)}</Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
