'use client'

import { useState, useMemo, useEffect } from 'react'
import Link from 'next/link'
import { ExternalLink } from 'lucide-react'
import { useTranslations } from '@/lib/i18n'
import { useSearchParams } from '@/hooks/useSearchParams'
import DatePicker from '@/components/ui/DatePicker'
import ShareResult from '@/components/ShareResult'
import { addMonths, isValidDate, todayKST } from '@/utils/dday'
import {
  FLOOR, RH, monthRule, plan, compareOrders, rows, reducedHours, maxReduceMonths,
  type Who, type Order, type Row,
} from '@/utils/parentalLeave'

const WHOS: Who[] = ['both', 'one', 'single']
const ORDERS: Order[] = ['mom', 'dad', 'same']
const FALLBACK_START = '2026-10-01'
const MONTHS = Array.from({ length: 18 }, (_, i) => i + 1)
const CAP_GROUPS: [number, string][] = [[1, '1~2'], [3, '3'], [4, '4'], [5, '5'], [6, '6'], [7, '7~18']]

const LINKS = [
  { key: 'work24', href: 'https://www.work24.go.kr' },
  { key: 'law', href: 'https://www.law.go.kr/법령/고용보험법' },
  { key: 'decree', href: 'https://www.law.go.kr/법령/고용보험법시행령' },
  { key: 'moel', href: 'https://www.moel.go.kr/news/enews/report/enewsView.do?news_seq=17133' },
  { key: 'korea', href: 'https://www.korea.kr/news/policyNewsView.do?newsId=148957375' },
]

const won = (n: number) => `${Math.round(n).toLocaleString('ko-KR')}원`
const man = (n: number) => `${(n / 10000).toLocaleString('ko-KR', { maximumFractionDigits: 1 })}만`
const dot = (d: string) => d.replaceAll('-', '.')
const pick = <T extends string>(v: string | null, list: readonly T[]) => (v && (list as readonly string[]).includes(v) ? (v as T) : null)
/** 예전 링크의 YYYY-MM 도 받음 */
const toDate = (v: string | null) => (v && /^\d{4}-\d{2}$/.test(v) ? `${v}-01` : isValidDate(v) ? v : null)
const num = (v: string | null) => Number(v) || 0

export default function ParentalLeaveCalculator() {
  const t = useTranslations('parentalLeave')
  const searchParams = useSearchParams()

  const [who, setWho] = useState<Who>('both')
  const [order, setOrder] = useState<Order>('mom')
  const [start, setStart] = useState(FALLBACK_START)
  const [birth, setBirth] = useState(addMonths(FALLBACK_START, -3))
  const [momWage, setMomWage] = useState(3_000_000)
  const [momMonths, setMomMonths] = useState(12)
  const [dadWage, setDadWage] = useState(3_500_000)
  const [dadMonths, setDadMonths] = useState(6)
  const [rhWho, setRhWho] = useState<'mom' | 'dad'>('mom')
  const [rhBefore, setRhBefore] = useState(40)
  const [rhAfter, setRhAfter] = useState(30)
  const [rhMonths, setRhMonths] = useState(12)
  const [ready, setReady] = useState(false)

  // URL → 상태 (예전 링크 wage/type/duration/sixPlusSix/childBirth/start 호환)
  useEffect(() => {
    const g = (k: string) => searchParams.get(k)
    const w = pick(g('who'), WHOS) ?? (g('sixPlusSix') === '0' ? 'one' : g('sixPlusSix') === '1' ? 'both' : null)
    if (w) setWho(w)
    const o = pick(g('order'), ORDERS); if (o) setOrder(o)
    const wage = num(g('wage')); if (wage > 0) setMomWage(g('type') === 'annual' ? Math.floor(wage / 12) : wage)
    const d = num(g('duration')); if (d >= 1 && d <= 18) setMomMonths(d)
    const fw = num(g('fwage')); if (fw > 0) setDadWage(fw)
    const fd = num(g('fduration')); if (fd >= 1 && fd <= 18) setDadMonths(fd)
    const s = toDate(g('start')) ?? todayKST()
    setStart(s)
    setBirth(toDate(g('birth')) ?? toDate(g('childBirth')) ?? addMonths(s, -3))
    const rb = num(g('rb')); if ([40, 35, 30].includes(rb)) setRhBefore(rb)
    const ra = num(g('ra')); if (ra >= RH.minAfter && ra <= RH.maxAfter) setRhAfter(ra)
    setReady(true)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 상태 → URL
  useEffect(() => {
    if (!ready) return
    const url = new URL(window.location.href)
    const sp = url.searchParams
    ;['type', 'sixPlusSix', 'childBirth'].forEach((k) => sp.delete(k))
    sp.set('who', who); sp.set('wage', String(momWage)); sp.set('duration', String(momMonths)); sp.set('start', start)
    if (who === 'both') {
      sp.set('order', order); sp.set('fwage', String(dadWage)); sp.set('fduration', String(dadMonths)); sp.set('birth', birth)
    } else ['order', 'fwage', 'fduration', 'birth'].forEach((k) => sp.delete(k))
    sp.set('rb', String(rhBefore)); sp.set('ra', String(rhAfter))
    window.history.replaceState({}, '', url)
  }, [ready, who, order, start, birth, momWage, momMonths, dadWage, dadMonths, rhBefore, rhAfter])

  const input = { who, order, start, birth, momWage, momMonths, dadWage, dadMonths }
  const p = useMemo(() => plan(input), [who, order, start, birth, momWage, momMonths, dadWage, dadMonths]) // eslint-disable-line react-hooks/exhaustive-deps
  const scenarios = useMemo(() => (who === 'both' ? compareOrders(input) : []), [who, start, birth, momWage, momMonths, dadWage, dadMonths]) // eslint-disable-line react-hooks/exhaustive-deps

  const both = who === 'both'
  const rhWage = both && rhWho === 'dad' ? dadWage : momWage
  const after = Math.min(rhAfter, rhBefore - 1)
  const rh = reducedHours(rhWage, rhBefore, after)
  const leaveCmp = rows(rhWage, rhMonths, start, 0, who === 'single')
  const leaveCmpTotal = leaveCmp.reduce((s, r) => s + r.amount, 0)
  const usedLeave = both && rhWho === 'dad' ? p.dadMonths : p.momMonths

  const months = p.momMonths + p.dadMonths
  const monthlyMax = Math.max(...p.calendar.map((c) => c.mom + c.dad))
  const parent = (k: 'mom' | 'dad') => (both ? t(`p.${k}`) : t('p.me'))

  const seg = (on: boolean) => `px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${on ? 'bg-primary text-white' : 'bg-soft text-body hover:bg-subtle'}`
  const label = 'block text-sm font-medium text-body mb-2'

  const wageField = (id: string, text: string, value: number, set: (n: number) => void) => (
    <div>
      <label htmlFor={id} className={label}>{text}</label>
      <div className="relative">
        <input
          id={id} type="text" inputMode="numeric"
          value={value ? value.toLocaleString('ko-KR') : ''}
          onChange={(e) => set(Number(e.target.value.replace(/[^0-9]/g, '')) || 0)}
          className="ui-field w-full px-4 py-3 pr-10 tabular-nums"
        />
        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-muted text-sm">{t('p.won')}</span>
      </div>
    </div>
  )
  const monthField = (id: string, text: string, value: number, set: (n: number) => void) => (
    <div>
      <label htmlFor={id} className={label}>{text}</label>
      <select id={id} value={value} onChange={(e) => set(Number(e.target.value))} className="ui-field w-full px-4 py-3">
        {MONTHS.map((n) => <option key={n} value={n}>{t('p.monthsOption', { n })}</option>)}
      </select>
    </div>
  )
  const tag = (r: Row) =>
    r.kind === 'special' ? t('p.tag.special') : r.kind === 'single' ? t('p.tag.single')
      : r.applied === 'cap' ? t('p.tag.cap') : r.applied === 'floor' ? t('p.tag.floor') : `${r.rate * 100}%`
  const cell = (r?: Row) => r ? (
    <td className={`px-3 py-2.5 text-right tabular-nums ${r.kind === 'special' ? 'bg-primary-soft text-primary' : 'text-fg'}`}>
      <div className="font-semibold">{won(r.amount)}</div>
      <div className="text-xs opacity-80">{t('p.table.nth', { n: r.n })} · {tag(r)}</div>
    </td>
  ) : <td className="px-3 py-2.5 text-right text-faint">-</td>

  const status = both
    ? p.eligible66 ? t('p.res.ok66', { n: p.special }) : t('p.res.no66')
    : who === 'single' ? t('p.res.single') : t('p.res.oneHint')

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-fg">{t('title')}</h1>
        <p className="text-sm text-muted mt-1">{t('description')}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
        {/* 입력 */}
        <div className="lg:col-span-1">
          <div className="ui-card p-6 space-y-6">
            <div>
              <span className={label}>{t('p.who.label')}</span>
              <div className="grid grid-cols-3 gap-2">
                {WHOS.map((w) => <button key={w} type="button" className={seg(who === w)} onClick={() => setWho(w)}>{t(`p.who.${w}`)}</button>)}
              </div>
            </div>

            <div>
              <span className={label}>{both ? t('p.startFirst') : t('p.start')}</span>
              <DatePicker label={both ? t('p.startFirst') : t('p.start')} value={start} onChange={setStart} />
            </div>

            {wageField('pl-mw', both ? t('p.wageOf', { who: t('p.mom') }) : t('p.wage'), momWage, setMomWage)}
            {monthField('pl-mm', both ? t('p.monthsOf', { who: t('p.mom') }) : t('p.months'), momMonths, setMomMonths)}

            {both && (
              <>
                {wageField('pl-dw', t('p.wageOf', { who: t('p.dad') }), dadWage, setDadWage)}
                {monthField('pl-dm', t('p.monthsOf', { who: t('p.dad') }), dadMonths, setDadMonths)}
                <div>
                  <span className={label}>{t('p.order.label')}</span>
                  <div className="grid grid-cols-3 gap-2">
                    {ORDERS.map((o) => <button key={o} type="button" className={seg(order === o)} onClick={() => setOrder(o)}>{t(`p.order.${o}`)}</button>)}
                  </div>
                </div>
                <div>
                  <span className={label}>{t('p.birth')}</span>
                  <DatePicker label={t('p.birth')} value={birth} onChange={setBirth} />
                  <p className="text-xs text-muted mt-1.5">{t('p.birthHint')}</p>
                </div>
              </>
            )}
            <p className="text-xs text-muted">{t('p.wageHint')}</p>
          </div>
        </div>

        {/* 결과 */}
        <div className="lg:col-span-2 space-y-6">
          <div className="ui-card p-6">
            <p className="text-sm text-sub">{both ? t('p.res.totalBoth') : t('p.res.total')}</p>
            <p className="text-3xl font-bold text-fg tabular-nums mt-1">{won(p.total)}</p>
            <p className="text-sm text-muted mt-1">{dot(start)} ~ {dot(p.end)} · {t('p.monthsOption', { n: months })}</p>

            <div className={`mt-4 rounded-2xl p-4 text-sm ${both && !p.eligible66 ? 'bg-amber-50 text-amber-800' : 'bg-primary-soft text-primary'}`} role="status">
              {status}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-4">
              {[
                { k: parent('mom'), v: won(p.momTotal) },
                ...(both ? [{ k: parent('dad'), v: won(p.dadTotal) }] : []),
                { k: t('p.res.monthlyAvg'), v: won(months ? p.total / months : 0) },
                { k: t('p.res.monthlyMax'), v: won(monthlyMax) },
              ].map((x) => (
                <div key={x.k} className="bg-subtle rounded-2xl p-4">
                  <p className="text-xs text-muted">{x.k}</p>
                  <p className="font-semibold text-fg tabular-nums mt-1">{x.v}</p>
                </div>
              ))}
            </div>

            {(p.clampedMom || p.clampedDad) && (
              <p className="mt-4 rounded-2xl p-4 text-sm bg-amber-50 text-amber-800">{t('p.res.clamped')}</p>
            )}
            {p.retro > 0 && (
              <p className="mt-4 rounded-2xl p-4 text-sm bg-subtle text-sub">
                {t('p.res.retro', { who: parent(order === 'dad' ? 'dad' : 'mom'), amount: won(p.retro) })}
              </p>
            )}

            <ShareResult
              className="mt-6"
              card={{
                tool: t('title'),
                label: both ? t('p.share.labelBoth', { m: p.momMonths, d: p.dadMonths }) : t('p.share.label', { n: p.momMonths }),
                headline: won(p.total),
                sub: status,
                rows: [
                  { label: parent('mom'), value: won(p.momTotal) },
                  ...(both ? [{ label: parent('dad'), value: won(p.dadTotal) }] : []),
                  { label: t('p.res.monthlyMax'), value: won(monthlyMax) },
                  { label: t('p.share.period'), value: `${dot(start)} ~ ${dot(p.end)}` },
                ],
              }}
              text={t('p.share.text', { amount: won(p.total) })}
            />
          </div>

          {/* 월별 지급표 */}
          <div className="ui-card p-6">
            <h2 className="text-lg font-semibold text-fg">{t('p.table.title')}</h2>
            <p className="text-sm text-muted mt-1">{t('p.table.desc')}</p>
            <div className="overflow-x-auto mt-4 -mx-2">
              <table className="w-full text-sm min-w-[420px]">
                <thead>
                  <tr className="border-b border-line text-muted">
                    <th scope="col" className="px-3 py-2 text-left font-medium">{t('p.table.month')}</th>
                    <th scope="col" className="px-3 py-2 text-right font-medium">{parent('mom')}</th>
                    {both && <th scope="col" className="px-3 py-2 text-right font-medium">{parent('dad')}</th>}
                    {both && <th scope="col" className="px-3 py-2 text-right font-medium">{t('p.table.sum')}</th>}
                  </tr>
                </thead>
                <tbody>
                  {p.calendar.map((c) => (
                    <tr key={c.ym} className="border-b border-line">
                      <th scope="row" className="px-3 py-2.5 text-left font-medium text-body whitespace-nowrap">
                        {c.ym.replace('-', '.')}
                        <div className="text-xs text-muted font-normal">{dot((c.momRow ?? c.dadRow)!.from).slice(5)}~{dot((c.momRow ?? c.dadRow)!.to).slice(5)}</div>
                      </th>
                      {cell(c.momRow)}
                      {both && cell(c.dadRow)}
                      {both && <td className="px-3 py-2.5 text-right font-semibold text-fg tabular-nums">{won(c.mom + c.dad)}</td>}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-muted mt-3">{t('p.table.note')}</p>
          </div>

          {/* 순서 비교 */}
          {both && (
            <div className="ui-card p-6">
              <h2 className="text-lg font-semibold text-fg">{t('p.cmp.title')}</h2>
              <p className="text-sm text-muted mt-1">{t('p.cmp.desc')}</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4">
                {scenarios.map((s) => (
                  <button
                    key={s.order} type="button" onClick={() => setOrder(s.order)} aria-pressed={order === s.order}
                    className={`text-left rounded-2xl p-4 border transition-colors ${order === s.order ? 'bg-primary-soft border-primary' : 'bg-surface border-line hover:bg-subtle'}`}
                  >
                    <p className={`text-sm font-semibold ${order === s.order ? 'text-primary' : 'text-fg'}`}>{t(`p.order.${s.order}`)}</p>
                    <p className="text-xl font-bold text-fg tabular-nums mt-1">{won(s.total)}</p>
                    <dl className="mt-3 space-y-1 text-xs">
                      {[
                        [t('p.cmp.six'), s.eligible66 ? t('p.cmp.sixYes', { n: s.special }) : t('p.cmp.sixNo')],
                        [t('p.cmp.care'), t('p.monthsOption', { n: s.careMonths })],
                        [t('p.cmp.lowest'), won(s.lowest)],
                        [t('p.cmp.end'), dot(s.end)],
                      ].map(([k, v]) => (
                        <div key={k} className="flex justify-between gap-2"><dt className="text-muted">{k}</dt><dd className="text-body tabular-nums">{v}</dd></div>
                      ))}
                    </dl>
                  </button>
                ))}
              </div>
              <p className="text-xs text-muted mt-3">{t('p.cmp.note')}</p>
            </div>
          )}

          {/* 육아휴직 vs 근로시간 단축 */}
          <div className="ui-card p-6">
            <h2 className="text-lg font-semibold text-fg">{t('p.rh.title')}</h2>
            <p className="text-sm text-muted mt-1">{t('p.rh.desc')}</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4">
              {both && (
                <div className="sm:col-span-3 grid grid-cols-2 gap-2">
                  {(['mom', 'dad'] as const).map((k) => <button key={k} type="button" className={seg(rhWho === k)} onClick={() => setRhWho(k)}>{t(`p.${k}`)}</button>)}
                </div>
              )}
              <div>
                <label htmlFor="pl-rb" className={label}>{t('p.rh.before')}</label>
                <select id="pl-rb" value={rhBefore} onChange={(e) => setRhBefore(Number(e.target.value))} className="ui-field w-full px-4 py-3">
                  {[40, 35, 30].map((h) => <option key={h} value={h}>{t('p.rh.hours', { h })}</option>)}
                </select>
              </div>
              <div>
                <label htmlFor="pl-ra" className={label}>{t('p.rh.after')}</label>
                <select id="pl-ra" value={after} onChange={(e) => setRhAfter(Number(e.target.value))} className="ui-field w-full px-4 py-3">
                  {Array.from({ length: Math.min(RH.maxAfter, rhBefore - 1) - RH.minAfter + 1 }, (_, i) => RH.minAfter + i).map((h) => (
                    <option key={h} value={h}>{t('p.rh.hours', { h })}</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="pl-rm" className={label}>{t('p.rh.months')}</label>
                <select id="pl-rm" value={rhMonths} onChange={(e) => setRhMonths(Number(e.target.value))} className="ui-field w-full px-4 py-3">
                  {MONTHS.slice(0, 12).map((n) => <option key={n} value={n}>{t('p.monthsOption', { n })}</option>)}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
              <div className="bg-subtle rounded-2xl p-4">
                <p className="text-sm text-sub">{t('p.rh.leaveBox', { n: rhMonths })}</p>
                <p className="text-2xl font-bold text-fg tabular-nums mt-1">{won(leaveCmpTotal)}</p>
                <p className="text-xs text-muted mt-1">{t('p.rh.perMonth', { amount: won(leaveCmpTotal / rhMonths) })}</p>
              </div>
              <div className="bg-subtle rounded-2xl p-4">
                <p className="text-sm text-sub">{t('p.rh.reduceBox', { n: rhMonths, h: after })}</p>
                <p className="text-2xl font-bold text-fg tabular-nums mt-1">{won(rh.total * rhMonths)}</p>
                <p className="text-xs text-muted mt-1">{t('p.rh.perMonth', { amount: won(rh.total) })}</p>
              </div>
            </div>
            <dl className="mt-4 space-y-2 text-sm">
              {[
                [t('p.rh.first', { h: Math.min(rh.cut, 10) }), won(rh.first)],
                [t('p.rh.rest', { h: Math.max(rh.cut - 10, 0) }), won(rh.rest)],
                [t('p.rh.company', { h: after }), won(rh.company)],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between gap-3"><dt className="text-sub">{k}</dt><dd className="text-fg tabular-nums">{v}</dd></div>
              ))}
            </dl>
            <p className="text-xs text-muted mt-3">
              {t('p.rh.note', { used: usedLeave, max: maxReduceMonths(usedLeave) })}
            </p>
          </div>
        </div>
      </div>

      {/* 가이드 */}
      <div className="ui-card p-6 space-y-8">
        <section>
          <h2 className="text-xl font-semibold text-fg mb-1">{t('p.rules.title')}</h2>
          <p className="text-sm text-muted mb-4">{t('p.rules.desc', { floor: man(FLOOR) })}</p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[360px]">
              <thead>
                <tr className="border-b border-line text-muted">
                  <th scope="col" className="px-3 py-2 text-left font-medium">{t('p.rules.month')}</th>
                  <th scope="col" className="px-3 py-2 text-right font-medium">{t('p.rules.general')}</th>
                  <th scope="col" className="px-3 py-2 text-right font-medium">{t('p.rules.single')}</th>
                  <th scope="col" className="px-3 py-2 text-right font-medium text-primary">{t('p.rules.special')}</th>
                </tr>
              </thead>
              <tbody>
                {CAP_GROUPS.map(([n, lbl]) => {
                  const g = monthRule(n, false, false), s = monthRule(n, false, true), sp = monthRule(n, true, false)
                  return (
                    <tr key={lbl} className="border-b border-line tabular-nums">
                      <th scope="row" className="px-3 py-2 text-left font-medium text-body">{t('p.rules.nth', { n: lbl })}</th>
                      <td className="px-3 py-2 text-right text-body">{g.rate * 100}% · {man(g.cap)}</td>
                      <td className="px-3 py-2 text-right text-body">{s.rate * 100}% · {man(s.cap)}</td>
                      <td className="px-3 py-2 text-right text-primary font-medium">{sp.rate * 100}% · {man(sp.cap)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-fg mb-4">{t('p.steps.title')}</h2>
          <ol className="space-y-3">
            {(t.raw('p.steps.items') as string[]).map((s, i) => (
              <li key={i} className="flex gap-3 text-sm text-body">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-white text-xs font-bold flex items-center justify-center">{i + 1}</span>
                <span className="pt-0.5">{s}</span>
              </li>
            ))}
          </ol>
        </section>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {(['flow', 'rhRules'] as const).map((k) => (
            <section key={k} className="bg-subtle rounded-2xl p-5">
              <h3 className="font-semibold text-fg mb-3">{t(`p.${k}.title`)}</h3>
              <ul className="space-y-2 list-disc pl-5 text-sm text-sub">
                {(t.raw(`p.${k}.items`) as string[]).map((s, i) => <li key={i}>{s}</li>)}
              </ul>
            </section>
          ))}
        </div>

        <section className="bg-amber-50 text-amber-800 rounded-2xl p-5">
          <h3 className="font-semibold mb-3">{t('p.caution.title')}</h3>
          <ul className="space-y-2 list-disc pl-5 text-sm">
            {(t.raw('p.caution.items') as string[]).map((s, i) => <li key={i}>{s}</li>)}
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-fg mb-4">{t('p.faq.title')}</h2>
          <div className="space-y-2">
            {(t.raw('p.faq.items') as { q: string; a: string }[]).map((f, i) => (
              <details key={i} className="bg-subtle rounded-2xl p-4">
                <summary className="font-medium text-fg cursor-pointer">{f.q}</summary>
                <p className="text-sm text-sub mt-2 leading-relaxed">{f.a}</p>
              </details>
            ))}
          </div>
        </section>

        <section>
          <h3 className="font-semibold text-fg mb-3">{t('p.related.title')}</h3>
          <div className="flex flex-wrap gap-2">
            {(['/child-benefit', '/due-date'] as const).map((href, i) => (
              <Link key={href} href={`${href}/`} className="inline-flex items-center px-4 py-2 rounded-xl bg-soft hover:bg-subtle text-body text-sm">
                {(t.raw('p.related.items') as string[])[i]}
              </Link>
            ))}
          </div>
        </section>

        <section>
          <h3 className="font-semibold text-fg mb-3">{t('p.links.title')}</h3>
          <div className="flex flex-wrap gap-2">
            {LINKS.map((l) => (
              <a key={l.key} href={l.href} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-soft hover:bg-subtle text-body text-sm">
                {t(`p.links.${l.key}`)} <ExternalLink className="w-3.5 h-3.5" />
              </a>
            ))}
          </div>
          <p className="text-xs text-muted mt-3">{t('p.links.note')}</p>
        </section>
      </div>
    </div>
  )
}
