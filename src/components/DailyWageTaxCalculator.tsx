'use client'

import { useState, useEffect, useRef, type KeyboardEvent } from 'react'
import Link from 'next/link'
import { useTranslations } from '@/lib/i18n'
import '@/lib/i18n/ns/dailyWageTax'
import { useSearchParams } from '@/hooks/useSearchParams'
import ShareResult from '@/components/ShareResult'
import MobileResultLink from '@/components/MobileResultLink'
import { calcDailyWageTax, compare33, socialEstimate, MAX_DAYS, MEAL_MONTHLY_CAP, type PayMode } from '@/utils/dailyWageTax'

const MODES = ['day', 'week', 'month'] as const
const WAGE_PRESETS = [150_000, 187_000, 200_000, 250_000, 300_000] as const
const WEEK_DAYS = [1, 2, 3, 4, 5, 6, 7] as const
const DEF = { wage: 200_000, days: 20, mode: 'day' as PayMode, weekDays: 5 }
const MAX_WAGE = 10_000_000

const won = (n: number) => Math.round(n).toLocaleString('ko-KR')
const digits = (s: string) => s.replace(/[^\d]/g, '')
const intParam = (v: string | null, def: number, min: number, max: number) => {
  const n = Number(v)
  return v != null && v !== '' && Number.isInteger(n) && n >= min ? Math.min(n, max) : def
}

/** 라디오 의미의 세그먼트 버튼 (방향키로 이동) */
function Segmented<T extends string>({ label, options, value, onChange, render }: {
  label: string
  options: readonly T[]
  value: T
  onChange: (v: T) => void
  render: (v: T) => string
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
    <div role="radiogroup" aria-label={label} className="grid grid-cols-3 gap-2">
      {options.map((o, i) => {
        const on = o === value
        return (
          <button
            key={o} ref={(el) => { refs.current[i] = el }} type="button" role="radio" aria-checked={on}
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

export default function DailyWageTaxCalculator() {
  const t = useTranslations('dailyWageTax')
  const sp = useSearchParams()

  const [wage, setWage] = useState(() => intParam(sp.get('w'), DEF.wage, 0, MAX_WAGE))
  const [days, setDays] = useState(() => intParam(sp.get('d'), DEF.days, 1, MAX_DAYS))
  const [mode, setMode] = useState<PayMode>(() => (MODES.find((m) => m === sp.get('m')) ?? DEF.mode))
  const [weekDays, setWeekDays] = useState(() => intParam(sp.get('wd'), DEF.weekDays, 1, 7))
  const [meal, setMeal] = useState(() => intParam(sp.get('ml'), 0, 0, MEAL_MONTHLY_CAP))
  const [ei, setEi] = useState(() => sp.get('ei') !== '0')

  useEffect(() => {
    const q = new URLSearchParams()
    if (wage !== DEF.wage) q.set('w', String(wage))
    if (days && days !== DEF.days) q.set('d', String(days))
    if (mode !== DEF.mode) q.set('m', mode)
    if (mode === 'week' && weekDays !== DEF.weekDays) q.set('wd', String(weekDays))
    if (meal > 0) q.set('ml', String(meal))
    if (!ei) q.set('ei', '0')
    const s = q.toString()
    window.history.replaceState(null, '', s ? `?${s}` : window.location.pathname)
  }, [wage, days, mode, weekDays, meal, ei])

  const r = calcDailyWageTax({ wage, days, mode, weekDays, meal, employment: ei })
  const tax = r.incomeTax + r.localTax
  const cmp = compare33(r.gross, tax)
  const social = socialEstimate(r.taxable)
  const W = t('won')
  const rate = (n: number) => (r.gross > 0 ? ((n / r.gross) * 100).toFixed(2) : '0')

  const rows = [
    { key: 'gross', day: r.wage, total: r.gross },
    ...(r.nonTaxable > 0 ? [{ key: 'nonTaxable', day: r.meal, total: r.nonTaxable }] : []),
    { key: 'incomeTax', day: r.perDay.incomeTax, total: r.incomeTax, minus: true },
    { key: 'localTax', day: r.perDay.localTax, total: r.localTax, minus: true },
    { key: 'employment', day: r.perDay.employment, total: r.employment, minus: true },
  ]

  const card = {
    tool: t('title'),
    label: t('u.share.label', { days: r.days }),
    headline: t('u.share.headline', { wage: won(r.wage), net: won(r.perDay.net) }),
    sub: t('u.share.sub', { days: r.days, net: won(r.net), ded: won(r.deductions) }),
    rows: [
      { label: t('u.rows.incomeTax'), value: `${won(r.incomeTax)}${W}` },
      { label: t('u.rows.localTax'), value: `${won(r.localTax)}${W}` },
      { label: t('u.rows.employment'), value: `${won(r.employment)}${W}` },
      { label: t('u.share.cmp33'), value: `${won(cmp.total)}${W}` },
    ],
  }
  const shareText = t('u.share.text', { wage: won(r.wage), net: won(r.perDay.net), days: r.days, total: won(r.net) })

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
            <MobileResultLink href="#daily-wage-tax-result" label={t('u.result.label', { days: r.days })} value={`${won(r.net)}${W}`} />
            <div>
              <label htmlFor="dw-wage" className="block text-sm font-medium text-body mb-2">{t('u.wage')}</label>
              <div className="relative">
                <input
                  id="dw-wage" type="text" inputMode="numeric" value={wage ? won(wage) : ''}
                  onChange={(e) => setWage(Math.min(Number(digits(e.target.value)) || 0, MAX_WAGE))}
                  className="ui-field w-full px-4 py-3 pr-12 tabular-nums" aria-describedby="dw-wage-hint"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-muted">{W.trim()}</span>
              </div>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {WAGE_PRESETS.map((n) => (
                  <button
                    key={n} type="button" onClick={() => setWage(n)} aria-pressed={wage === n}
                    className={`min-h-[44px] px-3 py-2 rounded-lg text-sm tabular-nums transition-colors ${wage === n ? 'bg-primary text-white' : 'bg-soft text-body hover:bg-subtle'}`}
                  >
                    {won(n)}
                  </button>
                ))}
              </div>
              <p id="dw-wage-hint" className="text-xs text-muted mt-1.5">{t('u.wageHint')}</p>
            </div>

            <div>
              <label htmlFor="dw-days" className="block text-sm font-medium text-body mb-2">{t('u.days')}</label>
              <div className="relative">
                <input
                  id="dw-days" type="text" inputMode="numeric" value={days ? String(days) : ''}
                  onChange={(e) => setDays(Math.min(Number(digits(e.target.value)) || 0, MAX_DAYS))}
                  className="ui-field w-full px-4 py-3 pr-12 tabular-nums" aria-describedby="dw-days-hint"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-muted">{t('u.daysUnit')}</span>
              </div>
              <p id="dw-days-hint" className="text-xs text-muted mt-1.5">{t('u.daysHint')}</p>
            </div>

            <div>
              <p className="text-sm font-medium text-body mb-2">{t('u.mode.label')}</p>
              <Segmented label={t('u.mode.label')} options={MODES} value={mode} onChange={setMode} render={(m) => t(`u.mode.${m}`)} />
              <p className="text-xs text-muted mt-1.5">{t(`u.mode.hint_${mode}`)}</p>
            </div>

            {mode === 'week' && (
              <div>
                <label htmlFor="dw-weekdays" className="block text-sm font-medium text-body mb-2">{t('u.weekDays')}</label>
                <select id="dw-weekdays" value={weekDays} onChange={(e) => setWeekDays(Number(e.target.value))} className="ui-field w-full px-4 py-3 min-h-[44px]">
                  {WEEK_DAYS.map((n) => <option key={n} value={n}>{t('u.weekDayOpt', { n })}</option>)}
                </select>
              </div>
            )}

            <div>
              <label htmlFor="dw-meal" className="block text-sm font-medium text-body mb-2">{t('u.meal')}</label>
              <div className="relative">
                <input
                  id="dw-meal" type="text" inputMode="numeric" value={meal ? won(meal) : ''} placeholder="0"
                  onChange={(e) => setMeal(Math.min(Number(digits(e.target.value)) || 0, MEAL_MONTHLY_CAP))}
                  className="ui-field w-full px-4 py-3 pr-12 tabular-nums" aria-describedby="dw-meal-hint"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-muted">{W.trim()}</span>
              </div>
              <p id="dw-meal-hint" className="text-xs text-muted mt-1.5">
                {t('u.mealHint', { max: won(Math.floor(MEAL_MONTHLY_CAP / r.days)) })}
              </p>
            </div>

            <label className="flex items-start gap-3 min-h-[44px] cursor-pointer">
              <input type="checkbox" checked={ei} onChange={(e) => setEi(e.target.checked)} className="w-5 h-5 mt-0.5 accent-primary shrink-0" />
              <span className="text-sm text-body">
                {t('u.ei')}
                <span className="block text-xs text-muted mt-0.5">{t('u.eiHint')}</span>
              </span>
            </label>
          </div>
        </div>

        {/* 결과 */}
        <div className="lg:col-span-2 space-y-6">
          <div id="daily-wage-tax-result" className="ui-card p-6 space-y-5 scroll-mt-20">
            <div aria-live="polite">
              <p className="text-sm text-muted">{t('u.result.label', { days: r.days })}</p>
              <p className="text-3xl font-bold text-fg tabular-nums mt-1">{won(r.net)}{W}</p>
              <p className="text-sm text-sub mt-1">{t('u.result.sub', { wage: won(r.wage), days: r.days, gross: won(r.gross), ded: won(r.deductions) })}</p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className="rounded-2xl p-4 bg-primary-soft">
                <p className="text-sm text-primary font-medium">{t('u.result.perDayNet')}</p>
                <p className="text-lg sm:text-xl font-bold text-fg tabular-nums mt-1">{won(r.perDay.net)}{W}</p>
              </div>
              <div className="rounded-2xl p-4 bg-subtle">
                <p className="text-sm text-muted">{t('u.result.dayTax')}</p>
                <p className="text-lg sm:text-xl font-bold text-fg tabular-nums mt-1">{won(r.perDay.incomeTax + r.perDay.localTax)}{W}</p>
              </div>
              <div className="rounded-2xl p-4 bg-subtle col-span-2 sm:col-span-1">
                <p className="text-sm text-muted">{t('u.result.effRate')}</p>
                <p className="text-lg sm:text-xl font-bold text-fg tabular-nums mt-1">{rate(r.deductions)}%</p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm tabular-nums">
                <caption className="sr-only">{t('u.table.caption')}</caption>
                <thead>
                  <tr className="border-b border-line text-muted">
                    <th scope="col" className="text-left font-medium py-2 pr-2">{t('u.table.colItem')}</th>
                    <th scope="col" className="text-right font-medium py-2 px-2">{t('u.table.colDay')}</th>
                    <th scope="col" className="text-right font-medium py-2 pl-2">{t('u.table.colTotal', { days: r.days })}</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((x) => (
                    <tr key={x.key} className="border-b border-line">
                      <th scope="row" className="text-left font-medium py-3 pr-2 text-body">{t(`u.rows.${x.key}`)}</th>
                      <td className="text-right py-3 px-2 text-sub">{x.minus && x.day > 0 ? '−' : ''}{won(x.day)}{W}</td>
                      <td className="text-right py-3 pl-2 text-fg">{x.minus && x.total > 0 ? '−' : ''}{won(x.total)}{W}</td>
                    </tr>
                  ))}
                  <tr>
                    <th scope="row" className="text-left font-semibold py-3 pr-2 text-fg">{t('u.rows.net')}</th>
                    <td className="text-right py-3 px-2 font-semibold text-fg">{won(r.perDay.net)}{W}</td>
                    <td className="text-right py-3 pl-2 font-bold text-primary">{won(r.net)}{W}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="bg-subtle rounded-2xl p-4 text-sm text-sub space-y-1.5">
              <p className="tabular-nums">
                {r.dayTax > 0
                  ? t('u.formula', { taxable: won(r.taxableDay), tax: won(r.dayTax), local: won(Math.floor(r.dayTax / 10)) })
                  : t('u.formulaNone')}
              </p>
              {r.exempted > 0 && <p>{t('u.small.exempt', { amount: won(r.exempted), payments: r.payments })}</p>}
              {r.exempted > 0 && r.lumpTax > 0 && <p>{t('u.small.lump', { days: r.days, tax: won(r.lumpTax), local: won(r.lumpLocal) })}</p>}
              {mode !== 'day' && r.dayTax > 0 && r.dayTax < 1000 && r.exempted === 0 && <p>{t('u.small.daily', { tax: won(r.dayTax) })}</p>}
              <p className="text-xs text-muted">{t('u.separate')}</p>
            </div>

            <ShareResult card={card} text={shareText} fileName={`daily-wage-tax-${r.wage}`} />
          </div>

          {/* 3.3% 비교 */}
          <div className="ui-card p-6 space-y-4">
            <div>
              <h2 className="text-lg font-semibold text-fg">{t('u.cmp.title')}</h2>
              <p className="text-sm text-muted mt-1">{t('u.cmp.desc', { gross: won(r.gross) })}</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl p-4 bg-primary-soft">
                <p className="text-sm text-primary font-medium">{t('u.cmp.daily')}</p>
                <p className="text-lg sm:text-xl font-bold text-fg tabular-nums mt-1">{won(tax)}{W}</p>
                <p className="text-xs text-muted mt-0.5">{t('u.cmp.rate', { rate: rate(tax) })}</p>
              </div>
              <div className="rounded-2xl p-4 bg-subtle">
                <p className="text-sm text-muted">{t('u.cmp.biz')}</p>
                <p className="text-lg sm:text-xl font-bold text-fg tabular-nums mt-1">{won(cmp.total)}{W}</p>
                <p className="text-xs text-muted mt-0.5">{t('u.cmp.bizDetail', { tax: won(cmp.incomeTax), local: won(cmp.localTax) })}</p>
              </div>
            </div>
            <p className="text-sm font-medium text-body" aria-live="polite">
              {cmp.diff > 0 ? t('u.cmp.more', { diff: won(cmp.diff) }) : t('u.cmp.same')}
            </p>
            <ul className="list-disc pl-5 space-y-1.5 text-sm text-sub">
              {(t.raw('u.cmp.points') as string[]).map((p, i) => <li key={i}>{p}</li>)}
            </ul>
          </div>

          {/* 4대보험 조건 */}
          <div className="ui-card p-6 space-y-4">
            <h2 className="text-lg font-semibold text-fg">{t('u.ins.title')}</h2>
            <ul className="space-y-3 text-sm">
              {(t.raw('u.ins.items') as { name: string; rule: string }[]).map((x) => (
                <li key={x.name} className="flex flex-col sm:flex-row sm:gap-3">
                  <span className="font-medium text-body sm:w-24 shrink-0">{x.name}</span>
                  <span className="text-sub">{x.rule}</span>
                </li>
              ))}
            </ul>
            <p className="bg-subtle rounded-2xl p-4 text-sm text-sub" aria-live="polite">
              {r.days >= 8
                ? t('u.ins.estimate', { pension: won(social.pension), health: won(social.health), care: won(social.care), total: won(social.total) })
                : t('u.ins.under8')}
            </p>
          </div>

          <p className="text-xs text-faint">{t('u.disclaimer')}</p>
        </div>
      </div>

      {/* 가이드 */}
      <div className="ui-card p-6 space-y-6">
        <h2 className="text-xl font-semibold text-fg">{t('guide.title')}</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {(['formula', 'smallTax', 'vs33', 'worker', 'employer'] as const).map((sec) => (
            <div key={sec}>
              <h3 className="font-semibold text-fg mb-3">{t(`guide.${sec}.title`)}</h3>
              <ul className="list-disc pl-5 space-y-2 text-sm text-sub">
                {(t.raw(`guide.${sec}.items`) as string[]).map((item, i) => <li key={i}>{item}</li>)}
              </ul>
            </div>
          ))}
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
            {(['freelancer-tax', 'minimum-wage', 'weekly-holiday-pay', 'unemployment-benefit', 'pay-slip'] as const).map((href) => (
              <Link key={href} href={`/${href}/`} className="ui-btn-soft min-h-[44px] inline-flex items-center px-3 py-2 text-sm">{t(`guide.links.${href}`)}</Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
