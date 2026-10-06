'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { useTranslations } from '@/lib/i18n'
import '@/lib/i18n/ns/nationalPension'
import { useSearchParams } from '@/hooks/useSearchParams'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Legend } from 'recharts'
import { ExternalLink } from 'lucide-react'
import ShareResult from '@/components/ShareResult'
import MobileResultLink from '@/components/MobileResultLink'
import {
  YEAR, A_VALUE, INCOME_FLOOR, INCOME_CAP, MIN_MONTHS, CPI_2026, calcPension, shifted, cumulative, crossoverAge,
  paybackAge, workReduction, nominal, catchUpCost, replacementRate, childCreditMonths, premiumRate,
} from '@/utils/nationalPension'

const NPS_URL = 'https://www.nps.or.kr'
const SHIFTS = [-5, -3, -1, 0, 1, 3, 5] as const
const INCOME_PRESETS = [2_000_000, 3_000_000, 4_000_000, 5_000_000] as const
const GROWTH = [0, 0.02, 0.03] as const
const won = (n: number) => Math.round(n).toLocaleString('ko-KR')
const num = (v: string | null, def: number, min: number, max: number) => {
  const n = Number(v)
  return v != null && v !== '' && Number.isFinite(n) ? Math.min(max, Math.max(min, Math.round(n))) : def
}

export default function NationalPensionCalculator() {
  const t = useTranslations('nationalPension')
  const sp = useSearchParams()

  const [birth, setBirth] = useState(() => num(sp.get('b'), 1975, 1953, 2007))
  const [start, setStart] = useState(() => num(sp.get('s'), 2002, 1988, 2070))
  const [years, setYears] = useState(() => num(sp.get('y'), 30, 1, 47))
  const [income, setIncome] = useState(() => num(sp.get('i'), 3_000_000, 0, 100_000_000))
  const [employee, setEmployee] = useState(() => sp.get('t') !== 'l')
  const [children, setChildren] = useState(() => num(sp.get('k'), 0, 0, 5))
  const [childNew, setChildNew] = useState(() => sp.get('kn') === '1')
  const [military, setMilitary] = useState(() => num(sp.get('m'), 0, 0, 12))
  const [spouse, setSpouse] = useState(() => sp.get('sp') === '1')
  const [depChildren, setDepChildren] = useState(() => num(sp.get('dc'), 0, 0, 5))
  const [depParents, setDepParents] = useState(() => num(sp.get('dp'), 0, 0, 4))
  const [work, setWork] = useState(() => num(sp.get('w'), 0, 0, 100_000_000))
  const [life, setLife] = useState(() => num(sp.get('le'), 86, 70, 100))
  const [growth, setGrowth] = useState(() => {
    const g = sp.get('g') == null ? NaN : Number(sp.get('g')) / 100
    return (GROWTH as readonly number[]).includes(g) ? g : 0.02
  })
  const [extra, setExtra] = useState(() => num(sp.get('x'), 3, 1, 10))

  // 가입 시작은 18세 이후, 가입 종료는 65세 전(임의계속가입 한도)
  const minStart = Math.max(1988, birth + 18)
  const maxStart = birth + 59
  const s = Math.min(maxStart, Math.max(minStart, start))
  const maxYears = Math.max(1, birth + 65 - s)
  const y = Math.min(maxYears, years)

  useEffect(() => {
    const q = new URLSearchParams({ b: String(birth), s: String(s), y: String(y), i: String(income) })
    if (!employee) q.set('t', 'l')
    if (children) q.set('k', String(children))
    if (childNew) q.set('kn', '1')
    if (military) q.set('m', String(military))
    if (spouse) q.set('sp', '1')
    if (depChildren) q.set('dc', String(depChildren))
    if (depParents) q.set('dp', String(depParents))
    if (work) q.set('w', String(work))
    if (life !== 86) q.set('le', String(life))
    if (growth !== 0.02) q.set('g', String(Math.round(growth * 100)))
    if (extra !== 3) q.set('x', String(extra))
    window.history.replaceState(null, '', `?${q}`)
  }, [birth, s, y, income, employee, children, childNew, military, spouse, depChildren, depParents, work, life, growth, extra])

  const input = { birthYear: birth, startYear: s, years: y, income, employee, children, childNewRule: childNew, militaryMonths: military, spouse, depChildren, depParents }
  const r = calcPension(input)
  const plus = calcPension({ ...input, extraMonths: extra * 12 })
  const gain = plus.monthly - r.monthly
  const cost = catchUpCost(income, extra * 12)
  const nominalMonthly = nominal(r.monthly, YEAR, r.pensionYear, growth)
  const cut = work > 0 ? workReduction(r.basic, work) : 0
  const received = cumulative(r.monthly, r.startAge, life)
  const payback = paybackAge(r.paidSelf, r.monthly, r.startAge)
  const needMonths = Math.max(0, MIN_MONTHS - r.totalMonths)

  const options = useMemo(() => SHIFTS.map((d) => {
    const m = shifted(r.basic, r.dependent, d)
    const age = r.startAge + d
    return { d, age, m, total: cumulative(m, age, life), cross: d === 0 ? null : crossoverAge(r.monthly, r.startAge, m, age) }
  }), [r.basic, r.dependent, r.startAge, r.monthly, life])
  const best = options.reduce((a, b) => (b.total > a.total ? b : a), options[0])

  const chart = useMemo(() => {
    const e = options[0], n = options[3], d = options[6]
    const rows: { age: number; early: number; normal: number; deferred: number }[] = []
    for (let age = e.age; age <= 100; age++) rows.push({ age, early: cumulative(e.m, e.age, age + 1), normal: cumulative(n.m, n.age, age + 1), deferred: cumulative(d.m, d.age, age + 1) })
    return rows
  }, [options])

  const big = (v: number) => (v >= 1e8 ? `${(v / 1e8).toFixed(1)}${t('u.eok')}` : `${won(v / 1e4)}${t('u.man')}`)
  const ym = (months: number) => (months % 12 ? t('u.ym', { y: Math.floor(months / 12), m: months % 12 }) : t('u.yOnly', { y: months / 12 }))
  const seg = (on: boolean) => `min-h-10 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${on ? 'bg-primary text-white' : 'bg-soft text-body hover:bg-subtle'}`
  const startYears = useMemo(() => Array.from({ length: maxStart - minStart + 1 }, (_, i) => minStart + i), [minStart, maxStart])
  const births = useMemo(() => Array.from({ length: 2007 - 1953 + 1 }, (_, i) => 2007 - i), [])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-fg">{t('title')}</h1>
        <p className="text-sm text-muted mt-1">{t('u.subtitle')}</p>
        <Link href="/pension-calculator/" className="inline-block mt-2 text-sm font-semibold text-primary hover:underline">{t('quickLink')}</Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 입력 */}
        <div className="lg:col-span-1 space-y-4">
          <div className="ui-card p-6 space-y-5">
            {r.eligible && <MobileResultLink href="#national-pension-result" label={t('u.res.label', { age: r.startAge, year: r.pensionYear })} value={`${won(r.monthly)}${t('u.won')}`} />}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="np-birth" className="block text-sm font-medium text-body mb-2">{t('u.in.birth')}</label>
                <select id="np-birth" value={birth} onChange={(e) => setBirth(Number(e.target.value))} className="ui-field w-full px-3 py-3">
                  {births.map((b) => <option key={b} value={b}>{t('u.yearOf', { y: b })}</option>)}
                </select>
              </div>
              <div>
                <label htmlFor="np-start" className="block text-sm font-medium text-body mb-2">{t('u.in.start')}</label>
                <select id="np-start" value={s} onChange={(e) => setStart(Number(e.target.value))} className="ui-field w-full px-3 py-3">
                  {startYears.map((v) => <option key={v} value={v}>{t('u.yearOf', { y: v })}</option>)}
                </select>
              </div>
            </div>

            <div>
              <div className="flex items-baseline justify-between mb-2">
                <label htmlFor="np-years" className="text-sm font-medium text-body">{t('u.in.years')}</label>
                <span className="text-sm font-semibold text-fg tabular-nums">{t('u.yOnly', { y })} <span className="text-muted font-normal">({s}~{s + y - 1})</span></span>
              </div>
              <input id="np-years" type="range" min={1} max={maxYears} value={y} aria-valuetext={t('u.yOnly', { y })} aria-describedby="np-years-h" onChange={(e) => setYears(Number(e.target.value))} className="w-full accent-[var(--primary)]" />
              <p id="np-years-h" className="text-xs text-muted mt-1">{t('u.in.yearsHint')}</p>
            </div>

            <div>
              <label htmlFor="np-income" className="block text-sm font-medium text-body mb-2">{t('u.in.income')}</label>
              <div className="relative">
                <input
                  id="np-income" inputMode="numeric" value={income ? won(income) : ''}
                  onChange={(e) => setIncome(Math.min(100_000_000, Number(e.target.value.replace(/[^\d]/g, '')) || 0))}
                  className="ui-field w-full px-4 py-3 pr-10 tabular-nums" placeholder="3,000,000"
                  aria-describedby="np-income-u np-income-h"
                />
                <span id="np-income-u" className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-muted">{t('u.won')}</span>
              </div>
              <div className="flex flex-wrap gap-1.5 mt-2" role="group" aria-label={t('a11y.incomePresets')}>
                {INCOME_PRESETS.map((p) => (
                  <button key={p} type="button" onClick={() => setIncome(p)} aria-pressed={income === p} className={`min-h-10 px-2.5 py-1 rounded-lg text-xs ${income === p ? 'bg-primary text-white' : 'bg-soft text-body hover:bg-subtle'}`}>{big(p)}</button>
                ))}
              </div>
              <p id="np-income-h" className="text-xs text-muted mt-2">{t('u.in.incomeHint', { min: won(INCOME_FLOOR), max: won(INCOME_CAP) })}</p>
            </div>

            <div>
              <p id="np-type" className="text-sm font-medium text-body mb-2">{t('u.in.type')}</p>
              <div className="grid grid-cols-2 gap-2" role="group" aria-labelledby="np-type">
                <button type="button" onClick={() => setEmployee(true)} aria-pressed={employee} className={seg(employee)}>{t('u.in.employee')}</button>
                <button type="button" onClick={() => setEmployee(false)} aria-pressed={!employee} className={seg(!employee)}>{t('u.in.local')}</button>
              </div>
            </div>

            <details className="group border-t border-line pt-4" open={!!(children || military || spouse || depChildren || depParents || work)}>
              <summary className="cursor-pointer text-sm font-semibold text-fg">{t('u.in.more')}</summary>
              <div className="space-y-4 mt-4">
                <div>
                  <p id="np-children" className="text-sm font-medium text-body mb-2">{t('u.in.children')}</p>
                  <div className="grid grid-cols-6 gap-1.5" role="group" aria-labelledby="np-children">
                    {[0, 1, 2, 3, 4, 5].map((n) => <button key={n} type="button" onClick={() => setChildren(n)} aria-pressed={children === n} className={seg(children === n)}>{n}</button>)}
                  </div>
                  <label className="flex items-start gap-2 mt-2 text-sm text-body">
                    <input type="checkbox" checked={childNew} onChange={(e) => setChildNew(e.target.checked)} className="mt-0.5 w-4 h-4 accent-[var(--primary)]" />
                    <span>{t('u.in.childNew')}</span>
                  </label>
                  <p className="text-xs text-muted mt-1">{t('u.in.childCredit', { m: childCreditMonths(children, childNew) })}</p>
                </div>
                <div>
                  <label htmlFor="np-mil" className="block text-sm font-medium text-body mb-2">{t('u.in.military')}</label>
                  <select id="np-mil" value={military} onChange={(e) => setMilitary(Number(e.target.value))} className="ui-field w-full px-3 py-3">
                    <option value={0}>{t('u.in.mil0')}</option>
                    <option value={6}>{t('u.in.mil6')}</option>
                    <option value={12}>{t('u.in.mil12')}</option>
                  </select>
                </div>
                <div>
                  <p className="text-sm font-medium text-body mb-2">{t('u.in.dependents')}</p>
                  <label className="flex items-center gap-2 text-sm text-body">
                    <input type="checkbox" checked={spouse} onChange={(e) => setSpouse(e.target.checked)} className="w-4 h-4 accent-[var(--primary)]" />
                    {t('u.in.spouse')}
                  </label>
                  <div className="grid grid-cols-2 gap-3 mt-2">
                    <label className="text-xs text-muted">{t('u.in.depChildren')}
                      <select value={depChildren} onChange={(e) => setDepChildren(Number(e.target.value))} className="ui-field w-full px-3 py-2 mt-1 text-sm">
                        {[0, 1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n}</option>)}
                      </select>
                    </label>
                    <label className="text-xs text-muted">{t('u.in.depParents')}
                      <select value={depParents} onChange={(e) => setDepParents(Number(e.target.value))} className="ui-field w-full px-3 py-2 mt-1 text-sm">
                        {[0, 1, 2, 3, 4].map((n) => <option key={n} value={n}>{n}</option>)}
                      </select>
                    </label>
                  </div>
                </div>
                <div>
                  <label htmlFor="np-work" className="block text-sm font-medium text-body mb-2">{t('u.in.work')}</label>
                  <div className="relative">
                    <input
                      id="np-work" inputMode="numeric" value={work ? won(work) : ''} placeholder="0"
                      onChange={(e) => setWork(Math.min(100_000_000, Number(e.target.value.replace(/[^\d]/g, '')) || 0))}
                      className="ui-field w-full px-4 py-3 pr-10 tabular-nums"
                      aria-describedby="np-work-u np-work-h"
                    />
                    <span id="np-work-u" className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-muted">{t('u.won')}</span>
                  </div>
                  <p id="np-work-h" className="text-xs text-muted mt-1">{t('u.in.workHint', { v: won(A_VALUE + 2_000_000) })}</p>
                </div>
              </div>
            </details>
          </div>
        </div>

        {/* 결과 */}
        <div className="lg:col-span-2 space-y-6">
          <div id="national-pension-result" className="ui-card p-6 space-y-5 scroll-mt-20">
            {r.eligible ? (
              <>
                <div>
                  <p className="text-sm text-muted">{t('u.res.label', { age: r.startAge, year: r.pensionYear })}</p>
                  <p className="text-3xl sm:text-4xl font-bold text-fg tabular-nums mt-1" aria-live="polite">{won(r.monthly)}{t('u.won')}</p>
                  <p className="text-sm text-sub mt-1 flex flex-wrap items-center gap-x-2">
                    <span>{t('u.res.pv')}</span>
                    <span className="text-faint">·</span>
                    <span>{t('u.res.nominal', { v: won(nominalMonthly), year: r.pensionYear })}</span>
                    <select aria-label={t('u.res.growth')} value={growth} onChange={(e) => setGrowth(Number(e.target.value))} className="ui-field px-2 py-1 text-xs">
                      {GROWTH.map((g) => <option key={g} value={g}>{t('u.res.growthOpt', { p: Math.round(g * 100) })}</option>)}
                    </select>
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="bg-subtle rounded-2xl p-4">
                    <p className="text-sm text-muted">{t('u.res.paid')}</p>
                    <p className="text-xl font-bold text-fg tabular-nums mt-1">{big(r.paidSelf)}{t('u.won')}</p>
                    <p className="text-xs text-muted mt-0.5">{employee ? t('u.res.paidEmp', { v: big(r.paidTotal) }) : t('u.res.paidLocal')}</p>
                  </div>
                  <div className="bg-subtle rounded-2xl p-4">
                    <p className="text-sm text-muted">{t('u.res.received', { age: life })}</p>
                    <p className="text-xl font-bold text-fg tabular-nums mt-1">{big(received)}{t('u.won')}</p>
                    <p className="text-xs text-muted mt-0.5">{t('u.res.ratio', { x: r.paidSelf ? (received / r.paidSelf).toFixed(1) : '-' })}</p>
                  </div>
                  <div className="bg-subtle rounded-2xl p-4">
                    <p className="text-sm text-muted">{t('u.res.payback')}</p>
                    <p className="text-xl font-bold text-primary tabular-nums mt-1">{payback != null ? t('u.ageOf', { a: payback }) : '-'}</p>
                    <p className="text-xs text-muted mt-0.5">{t('u.res.paybackHint')}</p>
                  </div>
                </div>

                <div className="divide-y divide-line border-y border-line text-sm">
                  <Row label={t('u.res.annual')} value={`${won(r.monthly * 12)}${t('u.won')}`} />
                  <Row label={t('u.res.months')} value={r.creditMonths ? t('u.res.monthsCredit', { total: ym(r.totalMonths), credit: r.creditMonths }) : ym(r.totalMonths)} />
                  {r.dependent > 0 && <Row label={t('u.res.dependent')} value={`+${won(r.dependent)}${t('u.won')}`} />}
                  {cut > 0 && <Row label={t('u.res.workCut')} value={`-${won(cut)}${t('u.won')}`} />}
                  {work > 0 && cut === 0 && <Row label={t('u.res.workCut')} value={t('u.res.noCut')} />}
                </div>
              </>
            ) : (
              <div className="bg-amber-50 text-amber-800 rounded-2xl p-5 space-y-1" role="status">
                <p className="font-semibold">{t('u.res.ineligible', { m: r.totalMonths })}</p>
                <p className="text-sm">{t('u.res.ineligibleHint', { need: needMonths })}</p>
              </div>
            )}

            <div className="bg-subtle rounded-2xl p-4 text-sm text-sub">
              <p>{t('u.res.notice')}</p>
              <a href={NPS_URL} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 mt-2 font-semibold text-primary hover:underline">
                {t('u.res.npsLink')} <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
              </a>
            </div>

            {r.eligible && (
              <ShareResult
                card={{
                  tool: t('title'),
                  label: t('u.share.label', { birth, years: y, income: big(income) }),
                  headline: `${won(r.monthly)}${t('u.won')}`,
                  sub: t('u.res.label', { age: r.startAge, year: r.pensionYear }),
                  rows: [
                    { label: t('u.res.paid'), value: `${big(r.paidSelf)}${t('u.won')}` },
                    { label: t('u.res.received', { age: life }), value: `${big(received)}${t('u.won')}` },
                    { label: t('u.cmp.early5'), value: `${won(options[0].m)}${t('u.won')}` },
                    { label: t('u.cmp.defer5'), value: `${won(options[6].m)}${t('u.won')}` },
                  ],
                }}
                text={t('u.share.text', { v: won(r.monthly), age: r.startAge })}
              />
            )}
          </div>

          {r.eligible && (
            <div className="ui-card p-6 space-y-4">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-fg">{t('u.cmp.title')}</h2>
                  <p className="text-sm text-muted mt-1">{t('u.cmp.desc')}</p>
                </div>
                <label className="text-sm text-body w-full sm:w-56">
                  <span className="flex justify-between"><span>{t('u.cmp.life')}</span><span className="font-semibold tabular-nums">{t('u.ageOf', { a: life })}</span></span>
                  <input type="range" min={70} max={100} value={life} aria-valuetext={t('u.ageOf', { a: life })} onChange={(e) => setLife(Number(e.target.value))} className="w-full accent-[var(--primary)]" />
                </label>
              </div>
              <div className="overflow-x-auto -mx-2">
                <table className="w-full text-sm min-w-[480px]">
                  <thead>
                    <tr className="text-muted border-b border-line text-left">
                      <th scope="col" className="py-2 px-2 font-medium">{t('u.cmp.when')}</th>
                      <th scope="col" className="py-2 px-2 font-medium text-right">{t('u.cmp.monthly')}</th>
                      <th scope="col" className="py-2 px-2 font-medium text-right">{t('u.cmp.total', { age: life })}</th>
                      <th scope="col" className="py-2 px-2 font-medium text-right">{t('u.cmp.cross')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {options.map((o) => (
                      <tr key={o.d} className={`border-b border-line ${o === best ? 'bg-primary-soft' : ''}`}>
                        <td className="py-2 px-2 text-body">
                          {o.d === 0 ? t('u.cmp.normal') : o.d < 0 ? t('u.cmp.early', { n: -o.d }) : t('u.cmp.defer', { n: o.d })}
                          <span className="text-muted"> · {t('u.ageOf', { a: o.age })}</span>
                          {o.d !== 0 && <span className="text-xs text-muted"> ({o.d < 0 ? '-' : '+'}{Math.round(Math.abs(o.d) * (o.d < 0 ? 6 : 7.2) * 10) / 10}%)</span>}
                        </td>
                        <td className="py-2 px-2 text-right tabular-nums text-fg">{won(o.m)}</td>
                        <td className={`py-2 px-2 text-right tabular-nums ${o === best ? 'text-primary font-semibold' : 'text-fg'}`}>{big(o.total)}{o === best && <span className="sr-only"> ({t('a11y.best')})</span>}</td>
                        <td className="py-2 px-2 text-right tabular-nums text-muted">{o.cross != null ? t('u.ageOf', { a: o.cross }) : '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-muted">{t('u.cmp.note')}</p>
              {/* 위 표(수령 시기별 월 연금·누적 수령액·역전 나이)와 같은 내용 → 스크린리더에서는 숨김 */}
              <div className="h-72" aria-hidden="true">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chart} margin={{ top: 16, right: 12, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" />
                    <XAxis dataKey="age" tick={{ fontSize: 11, fill: 'var(--muted)' }} stroke="var(--line)" />
                    <YAxis tickFormatter={(v: number) => big(v ?? 0)} tick={{ fontSize: 11, fill: 'var(--muted)' }} width={56} stroke="var(--line)" />
                    <Tooltip labelFormatter={(v) => t('u.ageOf', { a: v ?? 0 })} formatter={(v, name) => [`${big(Number(v ?? 0))}${t('u.won')}`, name ?? '']} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <ReferenceLine x={life} stroke="var(--fg)" strokeDasharray="2 3" label={{ value: t('u.cmp.lifeMark'), position: 'insideTopRight', fontSize: 10, fill: 'var(--fg)' }} />
                    <Line type="linear" dataKey="early" name={t('u.cmp.early5')} stroke="var(--faint)" strokeDasharray="5 4" strokeWidth={2} dot={false} />
                    <Line type="linear" dataKey="normal" name={t('u.cmp.normal')} stroke="var(--primary)" strokeWidth={2.5} dot={false} />
                    <Line type="linear" dataKey="deferred" name={t('u.cmp.defer5')} stroke="var(--fg)" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* 가입기간 늘리기 */}
          <div className="ui-card p-6 space-y-4">
            <div>
              <h2 className="text-lg font-semibold text-fg">{t('u.sim.title')}</h2>
              <p className="text-sm text-muted mt-1">{t('u.sim.desc')}</p>
            </div>
            <label className="block text-sm text-body">
              <span className="flex justify-between"><span>{t('u.sim.extra')}</span><span className="font-semibold tabular-nums">+{t('u.yOnly', { y: extra })}</span></span>
              <input type="range" min={1} max={10} value={extra} aria-valuetext={`+${t('u.yOnly', { y: extra })}`} onChange={(e) => setExtra(Number(e.target.value))} className="w-full accent-[var(--primary)]" />
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="bg-subtle rounded-2xl p-4">
                <p className="text-sm text-muted">{t('u.sim.gain')}</p>
                <p className="text-xl font-bold text-primary tabular-nums mt-1">+{won(gain)}{t('u.won')}</p>
                <p className="text-xs text-muted mt-0.5">{t('u.sim.after', { v: won(plus.monthly) })}</p>
              </div>
              <div className="bg-subtle rounded-2xl p-4">
                <p className="text-sm text-muted">{t('u.sim.cost')}</p>
                <p className="text-xl font-bold text-fg tabular-nums mt-1">{big(cost)}{t('u.won')}</p>
                <p className="text-xs text-muted mt-0.5">{t('u.sim.costHint', { p: Math.round(premiumRate(YEAR) * 1000) / 10 })}</p>
              </div>
              <div className="bg-subtle rounded-2xl p-4">
                <p className="text-sm text-muted">{t('u.sim.payback')}</p>
                <p className="text-xl font-bold text-fg tabular-nums mt-1">{gain > 0 ? t('u.sim.years', { n: (cost / (gain * 12)).toFixed(1) }) : '-'}</p>
                <p className="text-xs text-muted mt-0.5">{t('u.sim.paybackHint')}</p>
              </div>
            </div>
            {!r.eligible && plus.eligible && <p className="text-sm font-semibold text-primary">{t('u.sim.unlock')}</p>}
            <p className="text-xs text-muted">{t('u.sim.note')}</p>
          </div>

          {/* 산출 근거 */}
          <div className="ui-card p-6 space-y-4">
            <h2 className="text-lg font-semibold text-fg">{t('u.detail.title')}</h2>
            <div className="divide-y divide-line border-y border-line text-sm">
              <Row label={t('u.detail.a')} value={`${won(A_VALUE)}${t('u.won')}`} />
              <Row label={t('u.detail.b')} value={`${won(r.B)}${t('u.won')}`} />
              {r.periods.map((p) => (
                <Row
                  key={p.from}
                  label={t('u.detail.period', { from: p.from, to: p.to, m: p.months })}
                  value={p.from >= 2008 && p.from <= 2025 && p.to > p.from
                    ? `${(replacementRate(p.from) * 100).toFixed(1)}% → ${(replacementRate(p.to) * 100).toFixed(1)}%`
                    : `${(p.rate * 100).toFixed(1)}%`}
                />
              ))}
              {r.creditMonths > 0 && <Row label={t('u.detail.credit')} value={t('u.detail.creditVal', { m: r.creditMonths })} />}
            </div>
            <p className="text-xs text-muted">{t('u.detail.formula')}</p>
            <p className="text-xs text-muted">{t('u.detail.cpi', { p: Math.round(CPI_2026 * 1000) / 10 })}</p>
          </div>
        </div>
      </div>

      {/* 가이드 */}
      <div className="ui-card p-6 space-y-6">
        <h2 className="text-xl font-semibold text-fg">{t('u.guide.title')}</h2>
        {(['formula', 'reform', 'timing', 'boost', 'work'] as const).map((k) => (
          <section key={k}>
            <h3 className="text-base font-semibold text-fg mb-2">{t(`u.guide.${k}.title`)}</h3>
            <ul className="space-y-1.5 list-disc pl-5 text-sm text-sub leading-relaxed">
              {(t.raw(`u.guide.${k}.items`) as string[]).map((it, i) => <li key={i}>{it}</li>)}
            </ul>
          </section>
        ))}
        <section>
          <h3 className="text-base font-semibold text-fg mb-3">{t('u.faq.title')}</h3>
          <div className="space-y-4">
            {(t.raw('u.faq.items') as { q: string; a: string }[]).map((f, i) => (
              <div key={i} className="border-b border-line pb-4 last:border-0 last:pb-0">
                <h4 className="font-semibold text-fg mb-1">Q. {f.q}</h4>
                <p className="text-sm text-sub leading-relaxed">{f.a}</p>
              </div>
            ))}
          </div>
        </section>
        <p className="text-xs text-muted">{t('u.guide.source')}</p>
      </div>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2.5">
      <span className="text-sub">{label}</span>
      <span className="text-fg font-medium tabular-nums text-right">{value}</span>
    </div>
  )
}
