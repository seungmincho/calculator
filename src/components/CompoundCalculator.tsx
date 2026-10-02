'use client'

import { useState, useMemo, useEffect, useId } from 'react'
import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { useTranslations } from '@/lib/i18n'
import { useSearchParams } from '@/hooks/useSearchParams'
import ShareResult from '@/components/ShareResult'
import GuideSection from '@/components/GuideSection'
import {
  simulate, simpleInterest, doublingYears, rule72, effectiveAnnual, annualizedReturn, realValue, realRate,
  requiredMonthly, requiredRate, FREQS, TAX_KEYS, TAX_RATES,
  type Freq, type TaxKey, type TaxTiming, type DepositTiming, type Plan,
} from '@/utils/compound'

type Mode = 'lump' | 'dca' | 'goal'
type Solve = 'monthly' | 'rate'

const won = (n: number) => Math.round(n).toLocaleString('ko-KR')
const pct = (n: number) => (Math.round(n * 100) / 100).toString()
const yrs = (n: number) => (Math.round(n * 10) / 10).toString()
const num = (s: string) => parseFloat(String(s).replace(/,/g, '')) || 0
const commas = (s: string) => {
  const d = String(s).replace(/[^\d]/g, '')
  return d ? Number(d).toLocaleString('ko-KR') : ''
}
const compact = new Intl.NumberFormat('ko-KR', { notation: 'compact', maximumFractionDigits: 1 })
const isDecimal = (s: string) => /^\d*\.?\d*$/.test(s)
const oneOf = <T extends string>(v: string | null, list: readonly T[], d: T): T => (list.includes(v as T) ? (v as T) : d)
const DEFAULT_SC = ['3', '5', '7']
const LINKS = [
  { key: 'savings', href: '/savings-calculator' },
  { key: 'investment', href: '/investment-calculator' },
  { key: 'cagr', href: '/cagr-calculator' },
]

export default function CompoundCalculator() {
  const t = useTranslations('compoundCalculator')
  const sp = useSearchParams()
  const uid = useId()

  // 예전 공유 링크(p·r·t·pt·f·md) 그대로 복원, md>0 이면 적립식
  const [mode, setMode] = useState<Mode>(() => oneOf(sp.get('m'), ['lump', 'dca', 'goal'] as const, Number(sp.get('md')) > 0 ? 'dca' : 'lump'))
  const [principalText, setPrincipalText] = useState(() => commas(sp.get('p') ?? '10000000'))
  const [monthlyText, setMonthlyText] = useState(() => commas(sp.get('md') || '500000'))
  const [rateText, setRateText] = useState(() => (isDecimal(sp.get('r') ?? '') && sp.get('r')) || '5')
  const [periodText, setPeriodText] = useState(() => (isDecimal(sp.get('t') ?? '') && sp.get('t')) || '10')
  const [unit, setUnit] = useState<'years' | 'months'>(() => (sp.get('pt') === 'months' ? 'months' : 'years'))
  const [freq, setFreq] = useState<Freq>(() => oneOf(sp.get('f'), FREQS, 'yearly'))
  const [timing, setTiming] = useState<DepositTiming>(() => (sp.get('dt') === 'end' ? 'end' : 'begin'))
  const [tax, setTax] = useState<TaxKey>(() => oneOf(sp.get('tax'), TAX_KEYS, 'normal'))
  const [taxTiming, setTaxTiming] = useState<TaxTiming>(() => (sp.get('tt') === 'yearly' ? 'yearly' : 'maturity'))
  const [infText, setInfText] = useState(() => (isDecimal(sp.get('inf') ?? '') && sp.get('inf')) || '2')
  const [goalText, setGoalText] = useState(() => commas(sp.get('g') || '100000000'))
  const [solve, setSolve] = useState<Solve>(() => (sp.get('gs') === 'rate' ? 'rate' : 'monthly'))
  const [scenarios, setScenarios] = useState<string[]>(() => {
    const s = (sp.get('sc') ?? '').split('~')
    return s.length === 3 && s.every((x) => x !== '' && isDecimal(x)) ? s : DEFAULT_SC
  })

  const principal = num(principalText)
  const monthlyInput = num(monthlyText)
  const rateInput = Math.min(100, num(rateText))
  const months = Math.min(1200, Math.max(0, unit === 'years' ? Math.round(num(periodText) * 12) : Math.floor(num(periodText))))
  const inf = Math.min(30, num(infText))
  const goal = num(goalText)
  const isGoal = mode === 'goal'
  const usesMonthly = mode === 'dca' || (isGoal && solve === 'rate')
  const showMonthly = mode === 'dca' || isGoal

  const common = { principal, months, freq, timing, tax, taxTiming }
  const solvedMonthly = isGoal && solve === 'monthly' ? requiredMonthly(goal, { ...common, rate: rateInput }) : null
  const solvedRate = isGoal && solve === 'rate' ? requiredRate(goal, { ...common, monthly: monthlyInput }) : null
  const plan: Plan = {
    ...common,
    monthly: mode === 'lump' ? 0 : solvedMonthly ?? monthlyInput,
    rate: solvedRate ?? rateInput,
  }
  const res = useMemo(() => simulate(plan), [principal, plan.monthly, plan.rate, months, freq, timing, tax, taxTiming]) // eslint-disable-line react-hooks/exhaustive-deps
  const simple = simpleInterest(plan)
  const irr = annualizedReturn(plan, res.value)
  const eff = effectiveAnnual(plan.rate, freq)
  const dbl = doublingYears(plan.rate, freq)
  const dblTax = tax === 'free' ? null : doublingYears(plan.rate, freq, tax, taxTiming)
  const today = realValue(res.value, months, inf)
  const real = irr === null ? null : realRate(irr, inf)
  const sc = scenarios.map((s) => {
    const rate = Math.min(100, num(s))
    const r = simulate({ ...plan, rate })
    return { rate, value: r.value, net: r.net, dbl: doublingYears(rate, freq) }
  })
  const chart = useMemo(() => [
    { label: t('c.chart.start'), principal: plan.principal, interest: 0 },
    ...res.rows.map((r) => ({ label: dur(r.months), principal: r.principal, interest: Math.max(0, r.value - r.principal) })),
  ], [res]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const p = new URLSearchParams()
    p.set('m', mode); p.set('p', String(principal))
    if (showMonthly) p.set('md', String(monthlyInput))
    p.set('r', rateText); p.set('t', periodText); p.set('pt', unit); p.set('f', freq)
    if (timing === 'end') p.set('dt', 'end')
    p.set('tax', tax)
    if (taxTiming === 'yearly') p.set('tt', 'yearly')
    p.set('inf', infText)
    if (isGoal) { p.set('g', String(goal)); p.set('gs', solve) }
    if (scenarios.join('~') !== DEFAULT_SC.join('~')) p.set('sc', scenarios.join('~'))
    const id = setTimeout(() => window.history.replaceState(null, '', `${window.location.pathname}?${p}`), 300)
    return () => clearTimeout(id)
  }, [mode, principal, showMonthly, monthlyInput, rateText, periodText, unit, freq, timing, tax, taxTiming, infText, isGoal, goal, solve, scenarios])

  function dur(m: number) {
    const y = Math.floor(m / 12), r = m % 12
    return y && r ? t('c.dur.ym', { y, m: r }) : y ? t('c.dur.y', { y }) : t('c.dur.m', { m: r })
  }
  const switchMode = (m: Mode) => {
    if (m === mode) return
    if (m === 'dca') setPrincipalText('0')
    if (m === 'lump' && principal === 0) setPrincipalText('10,000,000')
    if (m !== 'lump' && monthlyInput === 0) setMonthlyText('500,000')
    setMode(m)
  }

  const seg = (on: boolean) =>
    `min-h-10 px-2 py-2 rounded-lg text-sm font-medium transition-colors ${on ? 'bg-primary text-white' : 'bg-soft text-body hover:bg-subtle'}`
  const taxLabel = (k: TaxKey) => `${t(`c.tax.${k}`)} ${pct(TAX_RATES[k] * 100)}%`
  const freqLabel = t(`frequency.${freq}`)
  const n = dur(months)
  const shareLabel = isGoal
    ? t('c.share.goal', { n, g: won(goal) })
    : plan.monthly > 0
      ? t(principal > 0 ? 'c.share.dcaWithP' : 'c.share.dca', { p: won(principal), m: won(plan.monthly), r: pct(plan.rate), f: freqLabel, n })
      : t('c.share.lump', { p: won(principal), r: pct(plan.rate), f: freqLabel, n })
  const goalHeadline = solve === 'monthly'
    ? t('c.res.perMonth', { a: won(solvedMonthly ?? 0) })
    : solvedRate === null ? '—' : t('c.res.perYear', { r: pct(solvedRate) })

  const money = (key: string, value: string, set: (s: string) => void, label: string) => (
    <div>
      <label htmlFor={`${uid}-${key}`} className="block text-sm font-medium text-body mb-2">{label}</label>
      <div className="relative">
        <input id={`${uid}-${key}`} inputMode="numeric" value={value} onChange={(e) => set(commas(e.target.value))}
          aria-describedby={`${uid}-${key}-u${value ? ` ${uid}-${key}-h` : ''}`}
          className="ui-field w-full px-4 py-3 pr-10 text-lg font-semibold tabular-nums" />
        <span id={`${uid}-${key}-u`} className="absolute right-4 top-1/2 -translate-y-1/2 text-sub">{t('c.won')}</span>
      </div>
      {value && <span id={`${uid}-${key}-h`} className="block text-xs text-muted mt-1 tabular-nums">{compact.format(num(value))}{t('c.won')}</span>}
    </div>
  )
  const percent = (key: string, value: string, set: (s: string) => void, label: string, hint?: string) => (
    <div>
      <label htmlFor={`${uid}-${key}`} className="block text-sm font-medium text-body mb-2">{label}</label>
      <div className="relative">
        <input id={`${uid}-${key}`} inputMode="decimal" value={value} onChange={(e) => isDecimal(e.target.value) && set(e.target.value)}
          aria-describedby={`${uid}-${key}-u${hint ? ` ${uid}-${key}-h` : ''}`}
          className="ui-field w-full px-4 py-3 pr-10 text-lg font-semibold tabular-nums" />
        <span id={`${uid}-${key}-u`} className="absolute right-4 top-1/2 -translate-y-1/2 text-sub">%</span>
      </div>
      {hint && <span id={`${uid}-${key}-h`} className="block text-xs text-muted mt-1">{hint}</span>}
    </div>
  )

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-fg">{t('title')}</h1>
        <p className="text-sm text-muted mt-1">{t('description')}</p>
      </div>

      <div className="grid grid-cols-3 gap-2 max-w-md" role="group" aria-label={t('a11y.mode')}>
        {(['lump', 'dca', 'goal'] as Mode[]).map((m) => (
          <button key={m} type="button" aria-pressed={mode === m} onClick={() => switchMode(m)} className={seg(mode === m)}>
            {t(`c.mode.${m}`)}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 입력 */}
        <div className="ui-card p-6 space-y-5 self-start">
          {isGoal && (
            <>
              {money('goal', goalText, setGoalText, t('c.in.goal'))}
              <div>
                <span id={`${uid}-solve`} className="block text-sm font-medium text-body mb-2">{t('c.in.solve')}</span>
                <div className="grid grid-cols-2 gap-2" role="group" aria-labelledby={`${uid}-solve`}>
                  {(['monthly', 'rate'] as Solve[]).map((s) => (
                    <button key={s} type="button" onClick={() => setSolve(s)} aria-pressed={solve === s} className={seg(solve === s)}>{t(`c.solve.${s}`)}</button>
                  ))}
                </div>
              </div>
            </>
          )}
          {money('principal', principalText, setPrincipalText, t(mode === 'lump' ? 'c.in.principal' : 'c.in.initial'))}
          {usesMonthly && money('monthly', monthlyText, setMonthlyText, t('c.in.monthly'))}
          {!(isGoal && solve === 'rate') && percent('rate', rateText, setRateText, t('c.in.rate'))}
          <div>
            <label htmlFor={`${uid}-period`} className="block text-sm font-medium text-body mb-2">{t('c.in.period')}</label>
            <div className="grid grid-cols-3 gap-2">
              <input id={`${uid}-period`} inputMode="decimal" value={periodText}
                onChange={(e) => isDecimal(e.target.value) && e.target.value.length <= 5 && setPeriodText(e.target.value)}
                className="ui-field col-span-2 w-full px-4 py-3 text-lg font-semibold tabular-nums" />
              <select value={unit} onChange={(e) => setUnit(e.target.value as 'years' | 'months')} aria-label={t('a11y.periodUnit')} className="ui-field px-3 py-3">
                <option value="years">{t('periodUnit.years')}</option>
                <option value="months">{t('periodUnit.months')}</option>
              </select>
            </div>
            {unit === 'years' && months % 12 !== 0 && <span className="block text-xs text-muted mt-1">{n}</span>}
          </div>
          <div>
            <label htmlFor={`${uid}-freq`} className="block text-sm font-medium text-body mb-2">{t('c.in.freq')}</label>
            <select id={`${uid}-freq`} value={freq} onChange={(e) => setFreq(e.target.value as Freq)} aria-describedby={`${uid}-freq-h`} className="ui-field w-full px-4 py-3">
              {FREQS.map((f) => <option key={f} value={f}>{t(`frequency.${f}`)}</option>)}
            </select>
            <span id={`${uid}-freq-h`} className="block text-xs text-muted mt-1">{t('c.freqHint', { r: pct(plan.rate), e: pct(eff) })}</span>
          </div>
          {showMonthly && (
            <div>
              <span id={`${uid}-timing`} className="block text-sm font-medium text-body mb-2">{t('c.in.timing')}</span>
              <div className="grid grid-cols-2 gap-2" role="group" aria-labelledby={`${uid}-timing`}>
                {(['begin', 'end'] as DepositTiming[]).map((x) => (
                  <button key={x} type="button" onClick={() => setTiming(x)} aria-pressed={timing === x} className={seg(timing === x)}>{t(`c.timing.${x}`)}</button>
                ))}
              </div>
              <p className="text-xs text-muted mt-2 leading-relaxed">{t('c.timingHint')}</p>
            </div>
          )}
          <div>
            <span id={`${uid}-tax`} className="block text-sm font-medium text-body mb-2">{t('c.in.tax')}</span>
            <div className="grid grid-cols-3 gap-2" role="group" aria-labelledby={`${uid}-tax`}>
              {TAX_KEYS.map((k) => (
                <button key={k} type="button" onClick={() => setTax(k)} aria-pressed={tax === k} className={`${seg(tax === k)} leading-tight`}>
                  {t(`c.tax.${k}`)}<span className="block text-xs opacity-80">{pct(TAX_RATES[k] * 100)}%</span>
                </button>
              ))}
            </div>
          </div>
          {tax !== 'free' && (
            <div>
              <span id={`${uid}-taxTiming`} className="block text-sm font-medium text-body mb-2">{t('c.in.taxTiming')}</span>
              <div className="grid grid-cols-2 gap-2" role="group" aria-labelledby={`${uid}-taxTiming`}>
                {(['maturity', 'yearly'] as TaxTiming[]).map((x) => (
                  <button key={x} type="button" onClick={() => setTaxTiming(x)} aria-pressed={taxTiming === x} className={seg(taxTiming === x)}>{t(`c.taxTiming.${x}`)}</button>
                ))}
              </div>
              <p className="text-xs text-muted mt-2 leading-relaxed">{t(`c.taxHint.${taxTiming}`)}</p>
            </div>
          )}
          {percent('inf', infText, setInfText, t('c.in.inflation'), t('c.inflationHint'))}
        </div>

        {/* 결과 */}
        <div className="lg:col-span-2 space-y-6">
          <div className="ui-card p-6">
            {isGoal && (
              <div className="mb-5 pb-5 border-b border-line">
                <p className="text-sm text-sub">{t(solve === 'monthly' ? 'c.res.goalMonthly' : 'c.res.goalRate', { n, g: won(goal) })}</p>
                <p className="text-3xl sm:text-4xl font-bold text-primary tabular-nums mt-1" aria-live="polite">{goalHeadline}</p>
                {solve === 'monthly' && solvedMonthly === 0 && <p className="text-sm text-muted mt-1">{t('c.res.goalEnough')}</p>}
                {solve === 'rate' && solvedRate === 0 && <p className="text-sm text-muted mt-1">{t('c.res.goalEnough')}</p>}
                {solve === 'rate' && solvedRate === null && <p className="text-sm text-amber-700 dark:text-amber-400 mt-1">{t('c.res.goalImpossible')}</p>}
              </div>
            )}
            <p className="text-sm text-sub">{t('c.res.value', { n })}</p>
            <p className="text-3xl sm:text-4xl font-bold text-fg tabular-nums mt-1" aria-live={isGoal ? undefined : 'polite'}>{won(res.value)}{t('c.won')}</p>
            <p className="text-sm text-muted mt-1 tabular-nums">
              {compact.format(res.value)}{t('c.won')}{tax !== 'free' && ` · ${t('c.res.preTax', { a: won(res.preTax) })}`}
            </p>
            <dl className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5">
              {([['principal', res.principal], ['gross', res.gross], ['tax', res.tax], ['net', res.net]] as const).map(([k, v]) => (
                <div key={k} className="bg-subtle rounded-xl p-3">
                  <dt className="text-xs text-sub">{t(`c.res.${k}`)}</dt>
                  <dd className={`text-base font-semibold tabular-nums mt-0.5 ${k === 'net' ? 'text-primary' : 'text-fg'}`}>
                    {k === 'tax' && v > 0 ? '−' : ''}{won(v)}{t('c.won')}
                  </dd>
                </div>
              ))}
            </dl>
            <dl className="grid grid-cols-1 sm:grid-cols-3 gap-x-6 gap-y-2 mt-4 text-sm">
              {[
                ['totalReturn', res.principal > 0 ? `${pct((res.net / res.principal) * 100)}%` : '—'],
                ['effective', `${pct(eff)}%`],
                ['irr', irr === null ? '—' : `${pct(irr)}%`],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between sm:block">
                  <dt className="text-sub">{t(`c.res.${k}`)}</dt>
                  <dd className="font-semibold text-fg tabular-nums">{v}</dd>
                </div>
              ))}
            </dl>
            <ShareResult className="mt-5" fileName="compound"
              card={{
                tool: t('title'),
                label: shareLabel,
                headline: isGoal ? goalHeadline : `${won(res.value)}${t('c.won')}`,
                sub: isGoal ? t('c.share.goalSub', { v: won(res.value) }) : t('c.share.sub', { i: won(res.net), tax: taxLabel(tax) }),
                rows: [
                  { label: t('c.res.principal'), value: `${won(res.principal)}${t('c.won')}` },
                  { label: t('c.res.net'), value: `${won(res.net)}${t('c.won')}` },
                  { label: t('c.simple.diff'), value: `${won(res.gross - simple)}${t('c.won')}` },
                  ...(dbl === null ? [] : [{ label: t('c.double.short'), value: t('c.yearsDec', { y: yrs(dbl) }) }]),
                ],
              }} />
          </div>

          {/* 72의 법칙 */}
          <div className="ui-card p-6">
            <h2 className="text-lg font-semibold text-fg">{t('c.double.title')}</h2>
            {dbl === null ? (
              <p className="text-sm text-muted mt-3">{t('c.double.none')}</p>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4">
                  <div className="bg-subtle rounded-xl p-4">
                    <p className="text-xs text-sub">{t('c.double.rule')}</p>
                    <p className="text-xl font-bold text-fg tabular-nums mt-1">{t('c.yearsDec', { y: yrs(rule72(plan.rate) ?? 0) })}</p>
                    <p className="text-xs text-muted mt-1 tabular-nums">72 ÷ {pct(plan.rate)}</p>
                  </div>
                  <div className="bg-primary-soft rounded-xl p-4">
                    <p className="text-xs text-primary font-medium">{t('c.double.exact', { f: freqLabel })}</p>
                    <p className="text-xl font-bold text-fg tabular-nums mt-1">{t('c.yearsDec', { y: yrs(dbl) })}</p>
                    <p className="text-xs text-muted mt-1 tabular-nums">ln 2 ÷ ln(1 + {pct(eff)}%)</p>
                  </div>
                  {dblTax !== null && (
                    <div className="bg-subtle rounded-xl p-4">
                      <p className="text-xs text-sub">{t('c.double.afterTax', { tax: taxLabel(tax) })}</p>
                      <p className="text-xl font-bold text-fg tabular-nums mt-1">{t('c.yearsDec', { y: yrs(dblTax) })}</p>
                      <p className="text-xs text-muted mt-1">{t(`c.taxTiming.${taxTiming}`)}</p>
                    </div>
                  )}
                </div>
                <p className="text-xs text-muted mt-3 leading-relaxed">{t('c.double.note')}</p>
              </>
            )}
          </div>

          {/* 자산 성장 그래프 */}
          {res.rows.length > 0 && (
            <div className="ui-card p-6">
              <h2 className="text-lg font-semibold text-fg mb-4">{t('c.chart.title')}</h2>
              {/* 같은 데이터가 아래 연도별 표에 있으므로 스크린리더에서는 숨김 */}
              <div className="h-64 sm:h-72" aria-hidden="true">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chart} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" />
                    <XAxis dataKey="label" tick={{ fontSize: 11, fill: 'var(--muted)' }} stroke="var(--line)" interval="preserveStartEnd" minTickGap={16} />
                    <YAxis tickFormatter={(v) => compact.format(Number(v ?? 0))} tick={{ fontSize: 11, fill: 'var(--muted)' }} width={52} stroke="var(--line)" />
                    <Tooltip
                      formatter={(value, name) => [`${won(Number(value ?? 0))}${t('c.won')}`, t(name === 'principal' ? 'c.chart.principal' : 'c.chart.interest')]}
                      contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid var(--line)', background: 'var(--surface)', color: 'var(--fg)' }}
                    />
                    <Area type="monotone" dataKey="principal" stackId="1" stroke="#8b95a1" fill="#8b95a1" fillOpacity={0.3} />
                    <Area type="monotone" dataKey="interest" stackId="1" stroke="#3182F6" fill="#3182F6" fillOpacity={0.4} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              <div className="flex justify-center gap-6 mt-2 text-xs text-muted" aria-hidden="true">
                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm inline-block bg-faint opacity-60" />{t('c.chart.principal')}</span>
                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm inline-block bg-primary opacity-60" />{t('c.chart.interest')}</span>
              </div>
            </div>
          )}

          {/* 단리 vs 복리 */}
          <div className="ui-card p-6">
            <h2 className="text-lg font-semibold text-fg">{t('c.simple.title')}</h2>
            <p className="text-sm text-muted mt-1">{t('c.simple.desc')}</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4">
              <div className="bg-subtle rounded-xl p-4">
                <p className="text-xs text-sub">{t('c.simple.simple')}</p>
                <p className="text-xl font-bold text-fg tabular-nums mt-1">{won(simple)}{t('c.won')}</p>
              </div>
              <div className="bg-subtle rounded-xl p-4">
                <p className="text-xs text-sub">{t('c.simple.compound', { f: freqLabel })}</p>
                <p className="text-xl font-bold text-fg tabular-nums mt-1">{won(res.gross)}{t('c.won')}</p>
              </div>
              <div className="bg-primary-soft rounded-xl p-4">
                <p className="text-xs text-primary font-medium">{t('c.simple.diff')}</p>
                <p className="text-xl font-bold text-fg tabular-nums mt-1">+{won(res.gross - simple)}{t('c.won')}</p>
                {simple > 0 && <p className="text-xs text-muted mt-1">{t('c.simple.ratio', { x: pct(res.gross / simple) })}</p>}
              </div>
            </div>
            {tax !== 'free' && taxTiming === 'yearly' && <p className="text-xs text-muted mt-3">{t('c.simple.yearlyNote')}</p>}
          </div>

          {/* 물가 반영 */}
          <div className="ui-card p-6">
            <h2 className="text-lg font-semibold text-fg">{t('c.real.title')}</h2>
            <p className="text-2xl font-bold text-fg tabular-nums mt-3">{t('c.real.today', { a: won(today) })}</p>
            <p className="text-sm text-sub mt-2 leading-relaxed">{t('c.real.desc', { i: pct(inf), n, v: won(res.value), a: won(today) })}</p>
            {real !== null && irr !== null && (
              <div className="bg-subtle rounded-xl p-4 mt-4">
                <p className="text-xs text-sub">{t('c.real.rate')}</p>
                <p className="text-xl font-bold text-fg tabular-nums mt-1">{pct(real)}%</p>
                <p className="text-xs text-muted mt-1 tabular-nums">{t('c.real.formula', { r: pct(irr), i: pct(inf) })}</p>
              </div>
            )}
            {real !== null && real < 0 && <p className="text-sm text-amber-700 dark:text-amber-400 mt-3">{t('c.real.loss')}</p>}
          </div>
        </div>
      </div>

      {/* 수익률 시나리오 */}
      <div className="ui-card p-6">
        <h2 className="text-lg font-semibold text-fg">{t('c.sc.title')}</h2>
        <p className="text-sm text-muted mt-1">{t('c.sc.desc')}</p>
        <div className="overflow-x-auto mt-4">
          <table className="w-full text-sm tabular-nums min-w-[480px]">
            <thead>
              <tr className="border-b border-line">
                <th scope="col" className="text-left py-2 font-medium text-sub"><span className="sr-only">{t('a11y.item')}</span></th>
                <th className="text-right py-2 px-2 font-semibold text-primary">{t('c.sc.current')}</th>
                {scenarios.map((_, i) => <th key={i} className="text-right py-2 px-2 font-semibold text-fg">{t('c.sc.name', { n: i + 1 })}</th>)}
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-line">
                <td className="py-2 text-sub">{t('c.sc.rate')}</td>
                <td className="py-2 px-2 text-right text-fg">{pct(plan.rate)}%</td>
                {scenarios.map((s, i) => (
                  <td key={i} className="py-2 px-2 text-right">
                    <input inputMode="decimal" value={s} aria-label={`${t('c.sc.name', { n: i + 1 })} ${t('c.sc.rate')}`}
                      onChange={(e) => isDecimal(e.target.value) && setScenarios((l) => l.map((x, j) => (j === i ? e.target.value : x)))}
                      className="ui-field w-20 px-2 py-1 text-right" /> %
                  </td>
                ))}
              </tr>
              {([['value', 'value'], ['net', 'net']] as const).map(([label, key]) => (
                <tr key={key} className="border-b border-line">
                  <td className="py-2 text-sub">{t(`c.sc.${label}`)}</td>
                  <td className={`py-2 px-2 text-right ${key === 'value' ? 'font-semibold text-primary' : 'text-body'}`}>{won(res[key])}</td>
                  {sc.map((x, i) => <td key={i} className={`py-2 px-2 text-right ${key === 'value' ? 'font-semibold text-fg' : 'text-body'}`}>{won(x[key])}</td>)}
                </tr>
              ))}
              <tr>
                <td className="py-2 text-sub">{t('c.sc.double')}</td>
                <td className="py-2 px-2 text-right text-body">{dbl === null ? '—' : t('c.yearsDec', { y: yrs(dbl) })}</td>
                {sc.map((x, i) => <td key={i} className="py-2 px-2 text-right text-body">{x.dbl === null ? '—' : t('c.yearsDec', { y: yrs(x.dbl) })}</td>)}
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* 연도별 표 */}
      {res.rows.length > 0 && (
        <div className="ui-card p-6">
          <h2 className="text-lg font-semibold text-fg">{t('c.table.title')}</h2>
          <div className="overflow-x-auto mt-4 max-h-[28rem]">
            <table className="w-full text-sm tabular-nums min-w-[560px]">
              <thead className="text-sub sticky top-0 bg-surface">
                <tr className="border-b border-line">
                  <th className="text-left py-2 font-medium">{t('c.table.year')}</th>
                  <th className="text-right py-2 px-2 font-medium">{t('c.table.principal')}</th>
                  <th className="text-right py-2 px-2 font-medium">{t('c.table.interest')}</th>
                  <th className="text-right py-2 px-2 font-medium">{t('c.table.gross')}</th>
                  {tax !== 'free' && <th className="text-right py-2 px-2 font-medium">{t('c.table.tax')}</th>}
                  <th className="text-right py-2 pl-2 font-medium">{t('c.table.value')}</th>
                </tr>
              </thead>
              <tbody>
                {res.rows.map((r) => (
                  <tr key={r.months} className="border-b border-line">
                    <td className="py-2 text-body whitespace-nowrap">{dur(r.months)}</td>
                    <td className="py-2 px-2 text-right text-body">{won(r.principal)}</td>
                    <td className="py-2 px-2 text-right text-body">{won(r.interest)}</td>
                    <td className="py-2 px-2 text-right text-body">{won(r.gross)}</td>
                    {tax !== 'free' && <td className="py-2 px-2 text-right text-body">{won(r.tax)}</td>}
                    <td className="py-2 pl-2 text-right text-fg font-medium">{won(r.value)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-muted mt-3">{t(tax === 'free' ? 'c.table.noteFree' : `c.table.note.${taxTiming}`)}</p>
        </div>
      )}

      {/* 계산 방식 */}
      <section className="bg-subtle rounded-2xl p-5">
        <h2 className="font-semibold text-fg mb-3">{t('c.method.title')}</h2>
        <ul className="space-y-2 list-disc pl-5 text-sm text-sub">
          {(t.raw('c.method.items') as string[]).map((s, i) => <li key={i}>{s}</li>)}
        </ul>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-fg mb-3">{t('c.links.title')}</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {LINKS.map((l) => (
            <Link key={l.key} href={`${l.href}/`} className="ui-card p-4 flex items-center justify-between gap-2 hover:bg-subtle transition-colors">
              <span>
                <span className="block font-medium text-fg">{t(`c.links.${l.key}.title`)}</span>
                <span className="block text-xs text-muted mt-0.5">{t(`c.links.${l.key}.desc`)}</span>
              </span>
              <ChevronRight className="w-4 h-4 text-faint shrink-0" aria-hidden="true" />
            </Link>
          ))}
        </div>
      </section>

      <GuideSection namespace="compoundCalculator" />
    </div>
  )
}
