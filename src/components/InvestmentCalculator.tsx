'use client'

import { useState, useMemo, useEffect } from 'react'
import { useSearchParams } from '@/hooks/useSearchParams'
import { useTranslations } from '@/lib/i18n'
import '@/lib/i18n/ns/investmentCalculator'
import { RotateCcw, ArrowRight } from 'lucide-react'
import { ComposedChart, Area, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts'
import ShareResult from '@/components/ShareResult'
import {
  futureValue, yearly, realValue, totalReturnPct, requiredMonthly, requiredRate, requiredMonths,
  fourPercentMonthly, payoutMonthly, compareAccounts, type Compounding, type AgeBand, type PlanInput,
} from '@/utils/investment'

type Mode = 'dca' | 'lump' | 'goal'
const MODES: Mode[] = ['dca', 'lump', 'goal']
const SPREAD = 3 // 보수/공격 = 입력 수익률 ∓ 3%p

// 금액 입력은 만원 단위
const DEFAULTS = {
  mode: 'dca' as Mode, init: 0, mon: 50, r: 7, y: 20, g: 0, c: 'annual' as Compounding,
  inf: 2, real: 0, goal: 50000, isaLow: 0, low: 0, age: '55' as AgeBand, wy: 25,
}
type State = typeof DEFAULTS

function decode(sp: URLSearchParams): State {
  const s = { ...DEFAULTS }
  const num = (k: string) => { const v = sp.get(k); const n = v === null || v === '' ? NaN : Number(v); return Number.isFinite(n) ? n : undefined }
  // 예전 링크 호환: type, initial/monthly(원), return, period, inflation
  const type = sp.get('type')
  if (type === 'lumpSum') s.mode = 'lump'
  const oi = num('initial'), om = num('monthly')
  if (oi !== undefined) s.init = oi / 1e4
  if (om !== undefined) s.mon = om / 1e4
  s.r = num('return') ?? s.r; s.y = num('period') ?? s.y; s.inf = num('inflation') ?? s.inf
  for (const k of ['init', 'mon', 'y', 'g', 'inf', 'real', 'goal', 'isaLow', 'low', 'wy'] as const) {
    const v = num(k); if (v !== undefined) s[k] = Math.max(0, v)
  }
  const r = num('r'); if (r !== undefined) s.r = Math.min(100, Math.max(-50, r))
  s.y = Math.min(60, s.y)
  const mode = sp.get('mode'); if ((MODES as string[]).includes(mode ?? '')) s.mode = mode as Mode
  if (sp.get('c') === 'monthly') s.c = 'monthly'
  const age = sp.get('age'); if (age === '70' || age === '80') s.age = age
  return s
}

export default function InvestmentCalculator() {
  const t = useTranslations('investmentCalculator')
  const tl = useTranslations('footer')
  const searchParams = useSearchParams()
  const [s, setS] = useState<State>(() => decode(searchParams))
  const set = <K extends keyof State>(k: K, v: State[K]) => setS((p) => ({ ...p, [k]: v }))
  const setNum = (k: keyof State, min = 0) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const n = Number(e.target.value); setS((p) => ({ ...p, [k]: Number.isFinite(n) ? Math.max(min, n) : 0 }))
  }

  useEffect(() => {
    const url = new URL(window.location.href)
    for (const old of ['type', 'initial', 'monthly', 'return', 'period', 'inflation']) url.searchParams.delete(old)
    for (const [k, v] of Object.entries(s)) url.searchParams.set(k, String(v))
    window.history.replaceState({}, '', url)
  }, [s])

  const won = (v: number) => `${Math.round(v).toLocaleString('ko-KR')}${t('won')}`
  const short = (v: number) => {
    const sign = v < 0 ? '-' : ''
    const a = Math.abs(Math.round(v))
    const eok = Math.floor(a / 1e8), man = Math.floor((a % 1e8) / 1e4)
    if (eok) return `${sign}${eok}${t('eok')}${man ? ` ${man.toLocaleString('ko-KR')}${t('man')}` : ''}${t('won')}`
    if (man) return `${sign}${man.toLocaleString('ko-KR')}${t('man')}${t('won')}`
    return `${sign}${won(a)}`
  }
  // 공유 문구용 대략값: 2.55억 → "2.6억"
  const approx = (v: number) => v >= 1e8 ? `${(v / 1e8).toFixed(1).replace(/\.0$/, '')}${t('eok')}` : short(v)
  const pct = (v: number) => `${v.toFixed(1)}%`

  const plan: PlanInput = {
    initial: s.init * 1e4, monthly: s.mode === 'lump' ? 0 : s.mon * 1e4, rate: s.r, years: s.y, growth: s.mode === 'lump' ? 0 : s.g, compounding: s.c,
  }
  const valid = s.y > 0 && plan.initial + plan.monthly > 0
  const deflate = (v: number, year: number) => (s.real ? realValue(v, year, s.inf) : v)

  const calc = useMemo(() => {
    if (!valid) return null
    const rates = [Math.max(-50, s.r - SPREAD), s.r, s.r + SPREAD]
    const byRate = rates.map((r) => yearly({ ...plan, rate: r }))
    const rows = byRate[1]
    const last = rows[rows.length - 1]
    return { rates, byRate, rows, last, accounts: compareAccounts(plan, { isaLow: !!s.isaLow, lowIncome: !!s.low, age: s.age }) }
  }, [valid, s.r, s.init, s.mon, s.y, s.g, s.c, s.mode, s.isaLow, s.low, s.age]) // eslint-disable-line react-hooks/exhaustive-deps

  const goal = useMemo(() => {
    if (s.mode !== 'goal' || s.goal <= 0) return null
    const target = s.goal * 1e4
    const base = { initial: plan.initial, growth: s.g, compounding: s.c }
    return {
      monthly: s.y > 0 ? requiredMonthly(target, { ...base, rate: s.r, years: s.y }) : Infinity,
      rate: s.y > 0 ? requiredRate(target, { ...base, monthly: plan.monthly, years: s.y }) : null,
      months: requiredMonths(target, { ...base, monthly: plan.monthly, rate: s.r }),
    }
  }, [s.mode, s.goal, s.init, s.mon, s.r, s.y, s.g, s.c]) // eslint-disable-line react-hooks/exhaustive-deps

  const planText = s.mode === 'lump'
    ? t('hero.lumpPlan', { a: short(plan.initial), y: s.y })
    : `${plan.initial > 0 ? `${short(plan.initial)} + ` : ''}${t('hero.monthlyPlan', { m: short(plan.monthly), y: s.y })}`
  const heroLabel = `${planText} · ${t('hero.rate', { r: s.r })}`

  const chip = (active: boolean) =>
    `px-3 py-2 rounded-xl text-sm font-medium transition-colors ${active ? 'bg-primary text-white' : 'bg-soft text-body hover:bg-subtle'}`
  const field = (k: keyof State, label: string, opts: { step?: number; hint?: string; suffix?: string; min?: number; max?: number } = {}) => (
    <div>
      <label htmlFor={`iv-${k}`} className="block text-sm font-medium text-body mb-2">{label}</label>
      <div className="relative">
        <input id={`iv-${k}`} type="number" inputMode="decimal" min={opts.min ?? 0} max={opts.max} step={opts.step ?? 1} value={s[k] as number}
          onChange={setNum(k, opts.min ?? 0)} className={`ui-field px-4 py-3 tabular-nums ${opts.suffix ? 'pr-14' : ''}`} />
        {opts.suffix && <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-muted">{opts.suffix}</span>}
      </div>
      {opts.hint && <p className="text-xs text-muted mt-1">{opts.hint}</p>}
    </div>
  )
  const th = 'px-3 py-2.5 text-xs font-medium text-muted whitespace-nowrap'
  const td = 'px-3 py-2 tabular-nums whitespace-nowrap'
  const scName = [t('sc.cons'), t('sc.base'), t('sc.agg')]

  const chartData = calc?.rows.map((row, idx) => ({
    year: row.year,
    principal: deflate(row.principal, row.year),
    profit: deflate(row.value, row.year) - deflate(row.principal, row.year),
    cons: deflate(calc.byRate[0][idx].value, row.year),
    agg: deflate(calc.byRate[2][idx].value, row.year),
  })) ?? []

  const accountRows = calc ? ([
    ['general', calc.accounts.general], ['isa', calc.accounts.isa], ['pension', calc.accounts.pension],
  ] as const) : []
  const best = accountRows.length ? [...accountRows].sort((a, b) => b[1].net - a[1].net)[0] : null

  const monthsText = (m: number) => {
    const y = Math.floor(m / 12), mm = m % 12
    return mm ? t('hero.yearsMonths', { y, m: mm }) : t('hero.yearsOnly', { y })
  }

  const links: [string, string][] = [
    ['/compound-calculator/', 'compoundCalculator'], ['/cagr-calculator/', 'cagrCalculator'],
    ['/savings-calculator/', 'savingsCalculator'], ['/stock-calculator/', 'stockCalculator'], ['/retirement-calculator/', 'retirementCalculator'],
  ]

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-fg">{t('title')}</h1>
        <p className="text-sm text-muted mt-1">{t('description')}</p>
        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
          {links.map(([href, key]) => (
            <a key={href} href={href} className="inline-flex items-center gap-1 text-sm text-primary hover:underline">
              {tl(`links.${key}`)} <ArrowRight className="w-3.5 h-3.5" />
            </a>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 max-w-md">
        {MODES.map((m) => (
          <button key={m} type="button" onClick={() => set('mode', m)} className={chip(s.mode === m)} aria-pressed={s.mode === m}>
            {m === 'lump' ? t('lumpSum') : m === 'dca' ? t('dca') : t('mode.goal')}
          </button>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* 입력 */}
        <div className="lg:col-span-1 space-y-6">
          <div className="ui-card p-6 space-y-4">
            {s.mode === 'goal' && field('goal', t('f.target'), { step: 1000, suffix: t('f.unitMan'), hint: short(s.goal * 1e4) })}
            {field('init', t('initialAmount'), { step: 100, suffix: t('f.unitMan'), hint: s.init ? short(s.init * 1e4) : undefined })}
            {s.mode !== 'lump' && field('mon', t('monthlyContribution'), { step: 10, suffix: t('f.unitMan'), hint: s.mon ? short(s.mon * 1e4) : undefined })}
            {field('r', t('annualReturn'), { step: 0.5, suffix: '%', min: -50, max: 100 })}
            <div>
              {field('y', t('investmentPeriod'), { suffix: t('years'), max: 60 })}
              <div className="flex flex-wrap gap-2 mt-2">
                {[5, 10, 20, 30].map((y) => (
                  <button key={y} type="button" onClick={() => set('y', y)} className={chip(s.y === y)}>{t('hero.yearsOnly', { y })}</button>
                ))}
              </div>
            </div>
            {s.mode !== 'lump' && field('g', t('f.growth'), { step: 1, suffix: '%', max: 30, hint: t('f.growthHint') })}
            <div>
              <p className="block text-sm font-medium text-body mb-2">{t('f.compounding')}</p>
              <div className="grid grid-cols-2 gap-2">
                {(['annual', 'monthly'] as const).map((c) => (
                  <button key={c} type="button" onClick={() => set('c', c)} className={chip(s.c === c)} aria-pressed={s.c === c}>{t(`f.${c}`)}</button>
                ))}
              </div>
              <p className="text-xs text-muted mt-1">{t(`f.${s.c}Hint`)}</p>
            </div>
            {field('inf', t('inflationRate'), { step: 0.5, suffix: '%', max: 30 })}
            <label className="flex items-center gap-2 text-sm text-body cursor-pointer">
              <input type="checkbox" checked={!!s.real} onChange={(e) => set('real', e.target.checked ? 1 : 0)} className="w-4 h-4 accent-[var(--primary)]" />
              {t('f.realToggle')}
            </label>
            <button type="button" onClick={() => setS({ ...DEFAULTS, mode: s.mode })} className="ui-btn-soft px-4 py-2 inline-flex items-center gap-1.5 text-sm">
              <RotateCcw className="w-4 h-4" /> {t('reset')}
            </button>
          </div>
        </div>

        {/* 결과 */}
        <div className="lg:col-span-2 space-y-6">
          {!valid && <div className="bg-amber-50 text-amber-800 rounded-2xl p-4 text-sm">{t('warn.invalid')}</div>}

          {/* 목표 역산 */}
          {goal && (
            <div className="ui-hero p-6">
              <p className="text-sm text-white/70">{t('hero.goalLabel', { target: short(s.goal * 1e4), y: s.y, r: s.r })}</p>
              <p className="text-sm text-white/90 mt-3">{t('hero.needMonthly')}</p>
              <p className="text-3xl font-bold tabular-nums">
                {goal.monthly === 0 ? t('hero.achieved') : Number.isFinite(goal.monthly) ? won(Math.ceil(goal.monthly / 1000) * 1000) : t('hero.unreachable')}
              </p>
              <div className="grid grid-cols-2 gap-4 mt-5 pt-4 border-t border-white/20 text-sm">
                <div>
                  <p className="text-white/70">{t('hero.needRate', { m: short(plan.monthly), y: s.y })}</p>
                  <p className="text-lg font-bold tabular-nums">{goal.rate === null ? t('hero.unreachable') : t('hero.rate', { r: goal.rate.toFixed(2) })}</p>
                </div>
                <div>
                  <p className="text-white/70">{t('hero.needYears', { m: short(plan.monthly), r: s.r })}</p>
                  <p className="text-lg font-bold tabular-nums">{goal.months === null ? t('hero.unreachable') : monthsText(goal.months)}</p>
                </div>
              </div>
            </div>
          )}

          {calc && <>
            {s.mode !== 'goal' && (
              <>
                <div className="ui-hero p-6">
                  <p className="text-sm text-white/70">{heroLabel}</p>
                  <p className="text-sm text-white/90 mt-3">{t('hero.after', { y: s.y })}</p>
                  <p className="text-3xl font-bold tabular-nums">{short(calc.last.value)}</p>
                  {s.inf > 0 && <p className="text-sm text-white/80 mt-1 tabular-nums">{t('hero.real', { inf: s.inf, v: short(realValue(calc.last.value, s.y, s.inf)) })}</p>}
                  <div className="grid grid-cols-3 gap-4 mt-5 pt-4 border-t border-white/20 text-sm">
                    <div><p className="text-white/70">{t('totalInvested')}</p><p className="text-lg font-bold tabular-nums">{short(calc.last.principal)}</p></div>
                    <div><p className="text-white/70">{t('profit')}</p><p className="text-lg font-bold tabular-nums">{short(calc.last.profit)}</p></div>
                    <div><p className="text-white/70">{t('totalReturn')}</p><p className="text-lg font-bold tabular-nums">{pct(totalReturnPct(calc.last.value, calc.last.principal))}</p></div>
                  </div>
                </div>
                <ShareResult
                  card={{
                    tool: t('title'),
                    label: heroLabel,
                    headline: t('share.headline', { v: approx(calc.last.value) }),
                    sub: t('hero.after', { y: s.y }),
                    rows: [
                      { label: t('totalInvested'), value: short(calc.last.principal) },
                      { label: t('profit'), value: short(calc.last.profit) },
                    ],
                  }}
                  text={`${planText} → ${t('share.headline', { v: approx(calc.last.value) })} (${t('hero.rate', { r: s.r })})`}
                  fileName="toolhub-investment"
                />
              </>
            )}

            {/* 시나리오 */}
            <div className="ui-card p-6">
              <h2 className="text-lg font-semibold text-fg">{t('sc.title')}</h2>
              <p className="text-sm text-muted mt-1">{t('sc.desc', { d: SPREAD })}{s.real ? ` · ${t('f.realToggle')}` : ''}</p>
              <div className="grid grid-cols-3 gap-2 mt-4">
                {calc.byRate.map((rows, i) => {
                  const l = rows[rows.length - 1]
                  return (
                    <div key={i} className={`rounded-2xl p-4 ${i === 1 ? 'bg-primary-soft' : 'bg-subtle'}`}>
                      <p className={`text-xs font-medium ${i === 1 ? 'text-primary' : 'text-sub'}`}>{scName[i]} · {t('hero.rate', { r: calc.rates[i] })}</p>
                      <p className="text-lg sm:text-xl font-bold text-fg tabular-nums mt-1">{short(deflate(l.value, l.year))}</p>
                      <p className="text-xs text-muted tabular-nums mt-0.5">{t('profit')} {short(deflate(l.value, l.year) - deflate(l.principal, l.year))}</p>
                    </div>
                  )
                })}
              </div>
              <div className="h-72 mt-6">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" vertical={false} />
                    <XAxis dataKey="year" tick={{ fontSize: 11, fill: 'var(--muted)' }} tickFormatter={(y: number) => t('hero.yearsOnly', { y })} />
                    <YAxis tick={{ fontSize: 11, fill: 'var(--muted)' }} width={64}
                      tickFormatter={(v: number) => v >= 1e8 ? `${(v / 1e8).toFixed(1)}${t('eok')}` : `${Math.round(v / 1e4).toLocaleString('ko-KR')}${t('man')}`} />
                    <Tooltip
                      labelFormatter={(y) => t('hero.yearsOnly', { y: Number(y ?? 0) })}
                      formatter={(v, name) => [short(Number(v ?? 0)), String(name ?? '')]}
                      contentStyle={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 12, fontSize: 12 }}
                    />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Area type="monotone" dataKey="principal" stackId="a" name={t('chart.principal')} stroke="var(--line-strong)" fill="var(--line-strong)" fillOpacity={0.6} />
                    <Area type="monotone" dataKey="profit" stackId="a" name={`${t('chart.profit')} (${scName[1]})`} stroke="var(--primary)" fill="var(--primary)" fillOpacity={0.35} />
                    <Line type="monotone" dataKey="agg" name={scName[2]} stroke="var(--primary)" strokeDasharray="5 4" dot={false} />
                    <Line type="monotone" dataKey="cons" name={scName[0]} stroke="var(--muted)" strokeDasharray="5 4" dot={false} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* 인출 */}
            <div className="ui-card p-6">
              <h2 className="text-lg font-semibold text-fg">{t('wd.title', { y: s.y })}</h2>
              <p className="text-sm text-muted mt-1">{t('wd.desc', { v: short(calc.last.value) })}</p>
              <div className="flex flex-wrap gap-2 mt-4">
                {[10, 20, 25, 30].map((y) => (
                  <button key={y} type="button" onClick={() => set('wy', y)} className={chip(s.wy === y)}>{t('wd.over', { y })}</button>
                ))}
              </div>
              <div className="grid sm:grid-cols-2 gap-3 mt-4">
                <div className="bg-subtle rounded-2xl p-5">
                  <p className="text-sm text-sub">{t('wd.payout', { y: s.wy, r: calc.rates[0] })}</p>
                  <p className="text-2xl font-bold text-fg tabular-nums mt-1">{won(payoutMonthly(calc.last.value, calc.rates[0], s.wy, s.c))}</p>
                  {s.inf > 0 && <p className="text-xs text-muted mt-1 tabular-nums">{t('wd.realNote', { v: won(realValue(payoutMonthly(calc.last.value, calc.rates[0], s.wy, s.c), s.y, s.inf)) })}</p>}
                </div>
                <div className="bg-subtle rounded-2xl p-5">
                  <p className="text-sm text-sub">{t('wd.rule4')}</p>
                  <p className="text-2xl font-bold text-fg tabular-nums mt-1">{won(fourPercentMonthly(calc.last.value))}</p>
                  <p className="text-xs text-muted mt-1">{t('wd.rule4Desc')}</p>
                </div>
              </div>
            </div>

            {/* 계좌별 세금 */}
            <div className="ui-card p-6">
              <h2 className="text-lg font-semibold text-fg">{t('tax.title')}</h2>
              <p className="text-sm text-muted mt-1">{t('tax.desc', { v: short(calc.last.value) })}</p>
              <div className="flex flex-wrap gap-2 mt-4">
                <button type="button" onClick={() => set('isaLow', s.isaLow ? 0 : 1)} className={chip(!!s.isaLow)} aria-pressed={!!s.isaLow}>{t('tax.isaLow')}</button>
                <button type="button" onClick={() => set('low', s.low ? 0 : 1)} className={chip(!!s.low)} aria-pressed={!!s.low}>{t('tax.lowIncome')}</button>
              </div>
              <div className="flex flex-wrap items-center gap-2 mt-2">
                <span className="text-sm text-body mr-1">{t('tax.age')}</span>
                {(['55', '70', '80'] as const).map((a) => (
                  <button key={a} type="button" onClick={() => set('age', a)} className={chip(s.age === a)} aria-pressed={s.age === a}>{t(`tax.age${a}`)}</button>
                ))}
              </div>
              <div className="overflow-x-auto mt-4 -mx-2">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-line text-right">
                      <th className={`${th} text-left`}>{t('tax.account')}</th>
                      <th className={th}>{t('tax.value')}</th>
                      <th className={th}>{t('tax.tax')}</th>
                      <th className={th}>{t('tax.credit')}</th>
                      <th className={th}>{t('tax.net')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {accountRows.map(([k, a]) => (
                      <tr key={k} className={`border-b border-line text-right ${best?.[0] === k ? 'bg-primary-soft' : ''}`}>
                        <td className={`${td} text-left`}>
                          <p className={`font-medium ${best?.[0] === k ? 'text-primary' : 'text-fg'}`}>{t(`tax.${k}`)}</p>
                          <p className="text-xs text-muted">{t(`tax.${k}Rule`)}</p>
                          {a.overflow > 0 && <p className="text-xs text-amber-700">{t('tax.overflow', { v: short(a.overflow) })}</p>}
                        </td>
                        <td className={`${td} text-body`}>{short(a.value)}</td>
                        <td className={`${td} text-body`}>{a.tax ? `-${short(a.tax)}` : '0'}</td>
                        <td className={`${td} text-body`}>{a.credit ? `+${short(a.credit)}` : '-'}</td>
                        <td className={`${td} font-semibold text-fg`}>{short(a.net)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {best && best[0] !== 'general' && (
                <p className="text-sm text-body mt-3">{t('tax.best', { name: t(`tax.${best[0]}`), v: short(best[1].net - calc.accounts.general.net) })}</p>
              )}
              {s.y < 3 && <p className="text-sm text-amber-700 mt-2">{t('tax.isaShort')}</p>}
              <ul className="bg-subtle rounded-2xl p-5 text-xs text-sub space-y-1.5 mt-4 list-disc list-inside">
                {(t.raw('tax.notes') as string[]).map((n, i) => <li key={i}>{n}</li>)}
              </ul>
            </div>

            {/* 연도별 표 */}
            <div className="ui-card overflow-hidden">
              <div className="px-4 py-3 border-b border-line">
                <h2 className="text-lg font-semibold text-fg">{t('tableTitle')}</h2>
                {!!s.real && <p className="text-xs text-muted">{t('f.realToggle')}</p>}
              </div>
              <div className="overflow-x-auto max-h-[28rem]">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-surface">
                    <tr className="border-b border-line text-right">
                      <th className={`${th} text-left`}>{t('year')}</th>
                      <th className={th}>{t('cumInvested')}</th>
                      <th className={th}>{t('tbl.profit')}</th>
                      <th className={th}>{t('totalAsset')}</th>
                      <th className={th}>{scName[0]} / {scName[2]}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {calc.rows.map((row, idx) => (
                      <tr key={row.year} className="border-b border-line text-right">
                        <td className={`${td} text-left text-fg`}>{t('hero.yearsOnly', { y: row.year })}</td>
                        <td className={`${td} text-body`}>{short(deflate(row.principal, row.year))}</td>
                        <td className={`${td} text-body`}>{short(deflate(row.value, row.year) - deflate(row.principal, row.year))}</td>
                        <td className={`${td} font-semibold text-fg`}>{short(deflate(row.value, row.year))}</td>
                        <td className={`${td} text-muted`}>{short(deflate(calc.byRate[0][idx].value, row.year))} / {short(deflate(calc.byRate[2][idx].value, row.year))}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>}

          <p className="bg-subtle rounded-2xl p-5 text-xs text-sub">{t('disclaimer')}</p>
        </div>
      </div>

      {/* 가이드 */}
      <div className="ui-card p-6 space-y-6">
        <div>
          <h2 className="text-xl font-semibold text-fg">{t('guide.whatIs.title')}</h2>
          <p className="text-sm text-body mt-2 leading-relaxed">{t('guide.whatIs.description')}</p>
        </div>
        <div>
          <h3 className="text-base font-semibold text-fg mb-2">{t('guide.formulas.title')}</h3>
          <ul className="space-y-1.5 text-sm text-sub list-disc list-inside">
            {(t.raw('guide.formulas.items') as string[]).map((item, i) => <li key={i}>{item}</li>)}
          </ul>
        </div>
        <div>
          <h3 className="text-base font-semibold text-fg mb-2">{t('guide.faq.title')}</h3>
          <div className="space-y-3">
            {(t.raw('guide.faq.items') as { q: string; a: string }[]).map((f, i) => (
              <div key={i}>
                <p className="text-sm font-medium text-fg">{f.q}</p>
                <p className="text-sm text-sub mt-1">{f.a}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
