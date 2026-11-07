'use client'

import { useMemo, useState, type ReactNode } from 'react'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceDot } from 'recharts'
import { useTranslations } from '@/lib/i18n'
import '@/lib/i18n/ns/eitc'
import ShareResult from '@/components/ShareResult'
import MobileResultLink from '@/components/MobileResultLink'
import { useSearchParams } from '@/hooks/useSearchParams'
import { useHydrated } from '@/hooks/useHydrated'
import { fmtKRW } from '@/utils/bogeumjari'
import {
  EITC, CTC, PROPERTY, RATES, TWO_MIN, LATE_PCT, HALF_PCT, INCOME_YEARS, calcEitc,
  type EitcInput, type Household, type Method, type RateKey,
} from '@/utils/eitc'

const won = (n: number) => Math.round(n).toLocaleString('ko-KR')
const digits = (s: string, max = 9) => s.replace(/\D/g, '').slice(0, max)
const num = (s: string) => Number(s) || 0
const MAN = 10_000

// 첫 화면 기본값: 단독가구, 근로소득 총급여 1,200만원, 재산 1억원 → 점감 구간 1,270,000원
// 소득·재산은 만원, 자녀세액공제는 원 단위로 입력한다.
const DEFAULTS = { h: 's', w: '1200', b: '0', r: 'personal', o: '0', p: '10000', c: '0', cc: '0', m: 'r' }
type Key = keyof typeof DEFAULTS
const HOUSEHOLDS: [string, Household][] = [['s', 'single'], ['o', 'one'], ['t', 'two']]
const METHODS: [string, Method][] = [['r', 'regular'], ['l', 'late'], ['h', 'half']]
const RATE_KEYS = Object.keys(RATES) as RateKey[]
const CODES: Partial<Record<Key, string[]>> = { h: ['s', 'o', 't'], m: ['r', 'l', 'h'], r: RATE_KEYS }
const MAX_KIDS = 10
const DELTAS = [1_000_000, 3_000_000, 5_000_000]
const SOURCES = [
  ['act', 'https://www.law.go.kr/법령/조세특례제한법/제100조의5'],
  ['actChild', 'https://www.law.go.kr/법령/조세특례제한법/제100조의30'],
  ['decree', 'https://www.law.go.kr/법령/조세특례제한법시행령/제100조의6'],
  ['table', 'https://www.law.go.kr/법령별표서식/(조세특례제한법%20시행령,20260918,별표11)'],
  ['tableChild', 'https://www.law.go.kr/법령별표서식/(조세특례제한법%20시행령,20260918,별표11의2)'],
  ['ntsEligibility', 'https://www.nts.go.kr/nts/cm/cntnts/cntntsView.do?mi=2452&cntntsId=7783'],
  ['ntsPayment', 'https://www.nts.go.kr/nts/cm/cntnts/cntntsView.do?mi=2453&cntntsId=7784'],
  ['press2026', 'https://www.korea.kr/news/policyNewsView.do?newsId=148963769'],
  ['pressHalf', 'https://www.korea.kr/news/policyNewsView.do?newsId=148971068'],
  ['reform2027', 'https://www.korea.kr/multi/visualNewsView.do?newsId=148969661'],
] as const

export default function Eitc() {
  const t = useTranslations('eitc')
  const sp = useSearchParams()
  const hydrated = useHydrated()

  // URL → 값. 하이드레이션 전에는 기본값이라 첫 렌더가 정적 HTML과 같다. 사용자가 고치면 그 값이 우선.
  const fromUrl = useMemo(() => {
    const next = { ...DEFAULTS }
    if (!hydrated) return next
    for (const k of Object.keys(DEFAULTS) as Key[]) {
      const q = sp.get(k)
      const ok = CODES[k] ? CODES[k]!.includes(q ?? '') : k === 'c' ? /^\d{1,2}$/.test(q ?? '') && num(q!) <= MAX_KIDS : /^\d{1,10}$/.test(q ?? '')
      if (q != null && ok) next[k] = q
    }
    return next
  }, [hydrated, sp])
  const [edited, setEdited] = useState<typeof DEFAULTS | null>(null)
  const v = edited ?? fromUrl

  // 값 → URL: 기본값과 다른 값만. 비운 칸은 '0'으로 남겨 받는 쪽이 기본값으로 바꾸지 않게 한다.
  const set = (k: Key, val: string) => {
    const next = { ...v, [k]: val }
    setEdited(next)
    const url = new URL(window.location.href)
    for (const key of Object.keys(DEFAULTS) as Key[]) {
      const q = CODES[key] ? next[key] : next[key] || '0'
      if (q !== DEFAULTS[key]) url.searchParams.set(key, q)
      else url.searchParams.delete(key)
    }
    window.history.replaceState(window.history.state, '', url)
  }

  const household = HOUSEHOLDS.find(([c]) => c === v.h)![1]
  const method = METHODS.find(([c]) => c === v.m)![1]
  const rate = v.r as RateKey
  const input: EitcInput = useMemo(() => ({
    household, method, rate,
    wage: num(v.w) * MAN, business: num(v.b) * MAN, other: num(v.o) * MAN, property: num(v.p) * MAN,
    children: num(v.c), childCredit: num(v.cc),
  }), [v, household, method, rate])
  const r = useMemo(() => calcEitc(input), [input])

  const krw = (n: number) => fmtKRW(n, t)
  const W = (n: number) => t('unit.won', { v: won(n) })
  const hh = t(`input.households.${r.household}`)
  const rule = EITC[r.household]
  const kidsOn = household !== 'single'

  // 곡선: 지금 입력(재산·신청 방식·그 밖의 소득)에서 총급여액 등만 바꿔 본 근로장려금
  const chart = useMemo(() => {
    const top = EITC[household].limit + 2_000_000
    const data: { x: number; y: number }[] = []
    for (let x = 0; x <= top; x += 100_000) data.push({ x: x / MAN, y: calcEitc({ ...input, wage: x, business: 0 }).eitc.amount })
    return { data, top: top / MAN }
  }, [input, household])
  const sel = EITC[household] // 곡선은 고른 가구 유형 기준(맞벌이 600만원 미만 구간은 홑벌이 금액)
  const ticks = [0, sel.up / MAN, sel.flatEnd / MAN, sel.limit / MAN]

  const byType = HOUSEHOLDS.map(([, k]) => [k, calcEitc({ ...input, household: k })] as const)
  const deltas = DELTAS.map((d) => [d, calcEitc({ ...input, wage: input.wage + d })] as const)
  const sign = (n: number) => (n > 0 ? `+${won(n)}` : n < 0 ? `−${won(-n)}` : '0')

  const eReason = r.eitc.reason
  const cReason = r.ctc.reason
  const slope = Math.round((rule.max * 1_000_000) / (rule.limit - rule.flatEnd))
  const years = { a: INCOME_YEARS[0], b: INCOME_YEARS[1] }
  const faq = t.raw('guide.faq.items') as { q: string; a: string }[]

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-fg">{t('title')}</h1>
        <p className="text-sm text-muted mt-1">{t('subtitle', years)}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="ui-card p-6 space-y-5 min-w-0">
          <MobileResultLink href="#eitc-result" label={t('result.sumLabel')} value={W(r.sum)} />
          <h2 className="font-semibold text-fg">{t('input.title')}</h2>

          <Seg id="eitc-h" label={t('input.household')} hint={t(`input.householdHint.${household}`)} cols="grid-cols-3"
            options={HOUSEHOLDS.map(([c, k]) => [c, t(`input.households.${k}`)])} value={v.h} onChange={(c) => set('h', c)} />

          <fieldset className="space-y-4">
            <legend className="text-sm font-semibold text-fg mb-3">{t('input.incomeTitle')}</legend>
            <Num id="eitc-w" label={kidsOn ? t('input.wageCouple') : t('input.wage')} hint={t('input.wageHint')} unit={t('unit.man')}
              value={v.w} reading={krw(num(v.w) * MAN)} onChange={(x) => set('w', x)} />
            <Num id="eitc-b" label={t('input.business')} hint={t('input.businessHint')} unit={t('unit.man')}
              value={v.b} reading={krw(num(v.b) * MAN)} onChange={(x) => set('b', x)} />
            {num(v.b) > 0 && (
              <div>
                <label htmlFor="eitc-r" className="block text-sm font-medium text-body mb-1.5">{t('input.rate')}</label>
                <select id="eitc-r" value={rate} onChange={(e) => set('r', e.target.value)} aria-describedby="eitc-r-hint"
                  className="ui-field w-full min-h-[44px] px-4 py-3 text-sm">
                  {RATE_KEYS.map((k) => <option key={k} value={k}>{t(`input.rates.${k}`, { p: RATES[k] })}</option>)}
                </select>
                <p id="eitc-r-hint" className="text-xs text-muted mt-1">{t('input.rateHint', { v: W(Math.floor((input.business * RATES[rate]) / 100)) })}</p>
              </div>
            )}
            <Num id="eitc-o" label={t('input.other')} hint={t('input.otherHint')} unit={t('unit.man')}
              value={v.o} reading={krw(num(v.o) * MAN)} onChange={(x) => set('o', x)} />
          </fieldset>

          <fieldset className="space-y-4">
            <legend className="text-sm font-semibold text-fg mb-3">{t('input.familyTitle')}</legend>
            <Num id="eitc-p" label={t('input.property')} hint={t('input.propertyHint')} unit={t('unit.man')}
              value={v.p} reading={krw(num(v.p) * MAN)} onChange={(x) => set('p', x)} />
            {kidsOn ? (
              <>
                <Stepper id="eitc-c" label={t('input.children')} hint={t('input.childrenHint')} value={num(v.c)} max={MAX_KIDS}
                  unit={t('unit.people')} minus={t('input.minus')} plus={t('input.plus')} onChange={(n) => set('c', String(n))} />
                {num(v.c) > 0 && (
                  <Num id="eitc-cc" label={t('input.childCredit')} hint={t('input.childCreditHint')} unit={t('unit.wonShort')}
                    value={v.cc} onChange={(x) => set('cc', x)} />
                )}
              </>
            ) : (
              <p className="text-xs text-muted">{t('input.childrenSingle')}</p>
            )}
          </fieldset>

          <Seg id="eitc-m" label={t('input.method')} hint={t(`input.methodHint.${method}`, { p: LATE_PCT, h: HALF_PCT })} cols="grid-cols-3"
            options={METHODS.map(([c, k]) => [c, t(`input.methods.${k}`)])} value={v.m} onChange={(c) => set('m', c)} />
        </div>

        <div id="eitc-result" className="lg:col-span-2 ui-card p-6 space-y-6 scroll-mt-20 min-w-0" aria-live="polite">
          <div className="space-y-4">
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm text-sub">{t('result.eitcLabel')}</p>
                {r.eitc.phase && <span className="rounded-lg px-2.5 py-1 text-xs font-semibold bg-primary-soft text-primary">{t(`phase.name.${r.eitc.phase}`)}</span>}
                <span className="text-xs text-muted">{t('result.basis', { ...years, hh })}</span>
              </div>
              <p className="text-3xl font-bold text-fg tabular-nums [overflow-wrap:anywhere]">{W(r.eitc.amount)}</p>
            </div>
            <dl className="grid grid-cols-2 gap-3">
              <div className="bg-subtle rounded-2xl p-4 min-w-0">
                <dt className="text-xs text-sub">{t('result.ctcLabel')}</dt>
                <dd className="text-xl font-bold text-fg tabular-nums [overflow-wrap:anywhere]">{W(r.ctc.amount)}</dd>
              </div>
              <div className="bg-subtle rounded-2xl p-4 min-w-0">
                <dt className="text-xs text-sub">{t('result.sumLabel')}</dt>
                <dd className="text-xl font-bold text-fg tabular-nums [overflow-wrap:anywhere]">{W(r.sum)}</dd>
              </div>
            </dl>
          </div>

          <div className="bg-subtle rounded-2xl p-5 text-sm text-body space-y-2">
            {eReason ? (
              <p>{t(`reason.${eReason}`, { total: krw(r.total), limit: krw(r.limit), hh, cap: krw(PROPERTY.cap) })}</p>
            ) : r.eitc.phase && (
              <p>{t(`phase.text.${r.eitc.phase}`, { x: krw(r.earned), up: krw(rule.up), flat: krw(rule.flatEnd), limit: krw(rule.limit), max: W(rule.max), slope: won(slope) })}</p>
            )}
            {kidsOn && (cReason === 'income' || cReason === 'credit') && (
              <p>{t(`ctcReason.${cReason}`, { total: krw(r.total), limit: krw(CTC.limit) })}</p>
            )}
            {kidsOn && cReason === 'noChildren' && <p className="text-sub">{t('ctcReason.noChildren')}</p>}
          </div>

          {r.downgraded && <p className="bg-amber-50 text-amber-800 rounded-2xl p-4 text-sm">{t('warn.downgraded', { v: krw(TWO_MIN) })}</p>}
          {r.propertyHalf && <p className="bg-amber-50 text-amber-800 rounded-2xl p-4 text-sm">{t('warn.propertyHalf', { half: krw(PROPERTY.half), cap: krw(PROPERTY.cap) })}</p>}
          {r.halfInvalid && <p className="bg-amber-50 text-amber-800 rounded-2xl p-4 text-sm">{t('warn.halfInvalid')}</p>}
          {r.method === 'late' && r.sum > 0 && <p className="bg-amber-50 text-amber-800 rounded-2xl p-4 text-sm">{t('warn.late', { p: LATE_PCT })}</p>}
          {r.eitc.minApplied && <p className="bg-subtle rounded-2xl p-4 text-sm text-sub">{t('note.eitcMin', { from: W(r.eitc.reduced), to: W(r.eitc.amount) })}</p>}
          {r.ctc.minApplied && <p className="bg-subtle rounded-2xl p-4 text-sm text-sub">{t('note.ctcMin', { v: W(CTC.min) })}</p>}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <section aria-labelledby="eitc-breakdown">
              <h3 id="eitc-breakdown" className="font-semibold text-fg mb-3">{t('breakdown.title')}</h3>
              <dl className="space-y-1.5 text-sm tabular-nums">
                <Row label={t('breakdown.wage')} value={W(input.wage)} />
                {input.business > 0 && <Row label={t('breakdown.business', { p: RATES[rate] })} value={W(r.earned - input.wage)} />}
                <Row strong label={t('breakdown.earned')} value={W(r.earned)} />
                {input.other > 0 && <Row label={t('breakdown.other')} value={W(input.other)} />}
                <Row label={t('breakdown.total')} value={W(r.total)} />
                <Row sub label={t('breakdown.limit', { hh })} value={t('breakdown.under', { v: krw(r.limit) })} />
                <Row className="pt-3" label={t('breakdown.table')} value={W(r.eitc.base)} />
                {r.propertyHalf && r.eitc.base > 0 && <Row sub label={t('breakdown.half')} value={`× 50%`} />}
                {r.method === 'late' && r.eitc.base > 0 && <Row sub label={t('breakdown.late')} value={`× ${LATE_PCT}%`} />}
                {r.eitc.minApplied && <Row sub label={t('breakdown.min')} value={W(r.eitc.amount)} />}
                <Row strong className="mt-2 pt-2 border-t border-line" label={t('result.eitcLabel')} value={W(r.eitc.amount)} />
              </dl>
            </section>

            <section aria-labelledby="eitc-ctc">
              <h3 id="eitc-ctc" className="font-semibold text-fg mb-3">{t('breakdown.ctcTitle')}</h3>
              {r.ctc.base > 0 ? (
                <dl className="space-y-1.5 text-sm tabular-nums">
                  <Row label={t('breakdown.perChild')} value={W(r.ctc.perChild)} />
                  <Row label={t('breakdown.kids', { n: r.ctc.kids })} value={W(r.ctc.base)} />
                  {(r.propertyHalf || r.method === 'late') && <Row sub label={t('breakdown.reduced')} value={W(r.ctc.reduced)} />}
                  {r.ctc.credit > 0 && <Row sub label={t('breakdown.credit')} value={`−${won(r.ctc.credit)}`} />}
                  <Row strong className="mt-2 pt-2 border-t border-line" label={t('result.ctcLabel')} value={W(r.ctc.amount)} />
                </dl>
              ) : (
                <p className="text-sm text-sub">{t('breakdown.ctcNone')}</p>
              )}
              <ul className="mt-4 bg-subtle rounded-2xl p-4 text-xs text-sub space-y-1.5 tabular-nums">
                <li>{t('limits.eitc', { s: krw(EITC.single.max), o: krw(EITC.one.max), t: krw(EITC.two.max) })}</li>
                <li>{t('limits.ctc', { v: krw(CTC.max), c: krw(CTC.max - CTC.cut), l: krw(CTC.limit) })}</li>
                <li>{t('limits.property', { half: krw(PROPERTY.half), cap: krw(PROPERTY.cap) })}</li>
              </ul>
            </section>
          </div>

          <section aria-labelledby="eitc-pay" className="space-y-2">
            <h3 id="eitc-pay" className="font-semibold text-fg">{t('pay.title')}</h3>
            {r.half && (
              <dl className="grid grid-cols-2 gap-3 text-sm tabular-nums">
                <div className="bg-subtle rounded-2xl p-4 min-w-0">
                  <dt className="text-xs text-sub">{t('pay.first', { p: HALF_PCT })}</dt>
                  <dd className="font-semibold text-fg">{W(r.half.first)}</dd>
                </div>
                <div className="bg-subtle rounded-2xl p-4 min-w-0">
                  <dt className="text-xs text-sub">{t('pay.second')}</dt>
                  <dd className="font-semibold text-fg">{W(r.half.second)}</dd>
                </div>
              </dl>
            )}
            {r.half?.deferred && <p className="text-sm text-sub">{t('pay.deferred')}</p>}
            <p className="text-sm text-sub">{t(`pay.${r.method}`)}</p>
          </section>

          <section aria-labelledby="eitc-chart">
            <h3 id="eitc-chart" className="font-semibold text-fg mb-1">{t('chart.title', { hh: t(`input.households.${household}`) })}</h3>
            <p className="text-xs text-muted mb-3">{t('chart.summary', { up: krw(sel.up), flat: krw(sel.flatEnd), limit: krw(sel.limit), max: W(sel.max), x: krw(r.earned), v: W(r.eitc.amount) })}</p>
            <div className="h-56 min-w-0" role="img" aria-label={t('chart.aria', { hh, x: krw(r.earned), v: W(r.eitc.amount) })}>
              {hydrated && (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chart.data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" />
                    <XAxis dataKey="x" type="number" domain={[0, chart.top]} ticks={ticks} tickFormatter={(x: number) => x.toLocaleString()} tick={{ fontSize: 11, fill: 'var(--muted)' }} />
                    <YAxis width={40} tickFormatter={(y: number) => String(Math.round(y / MAN))} tick={{ fontSize: 11, fill: 'var(--muted)' }} />
                    <Tooltip formatter={(y) => [W(Number(y ?? 0)), t('result.eitcLabel')]} labelFormatter={(x) => t('chart.x', { v: krw(Number(x ?? 0) * MAN) })} />
                    <Line type="stepAfter" dataKey="y" stroke="var(--primary)" strokeWidth={2.5} dot={false} isAnimationActive={false} />
                    {r.earned / MAN <= chart.top && <ReferenceDot x={r.earned / MAN} y={r.eitc.amount} r={6} fill="var(--primary)" stroke="var(--surface)" strokeWidth={2} />}
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
            <p className="text-xs text-muted mt-2">{t('chart.axes')}</p>
          </section>

          <section aria-labelledby="eitc-compare" className="space-y-3">
            <h3 id="eitc-compare" className="font-semibold text-fg">{t('compare.title')}</h3>
            <div className="relative overflow-x-auto">
              <table className="w-full text-sm tabular-nums">
                <caption className="sr-only">{t('compare.caption', { x: krw(r.earned) })}</caption>
                <thead>
                  <tr className="text-xs text-sub text-left">
                    <th scope="col" className="py-2 pr-2 font-medium">{t('compare.type')}</th>
                    <th scope="col" className="py-2 px-2 font-medium text-right">{t('result.eitcLabel')}</th>
                    <th scope="col" className="py-2 px-2 font-medium text-right">{t('result.ctcLabel')}</th>
                    <th scope="col" className="py-2 pl-2 font-medium text-right">{t('compare.sum')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {byType.map(([k, x]) => (
                    <tr key={k} className={k === household ? 'bg-primary-soft text-primary' : 'text-body'}>
                      <th scope="row" className="py-2 pr-2 text-left font-medium whitespace-nowrap">{t(`input.households.${k}`)}{x.downgraded ? '*' : ''}</th>
                      <td className="py-2 px-2 text-right">{won(x.eitc.amount)}</td>
                      <td className="py-2 px-2 text-right">{k === 'single' ? '–' : won(x.ctc.amount)}</td>
                      <td className="py-2 pl-2 text-right font-semibold">{won(x.sum)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-muted">{t('compare.note', { n: kidsOn ? r.ctc.kids : 0 })}{byType.some(([, x]) => x.downgraded) ? ` ${t('compare.downgraded', { v: krw(TWO_MIN) })}` : ''}</p>
            <ul className="space-y-1.5 text-sm tabular-nums">
              {deltas.map(([d, x]) => (
                <li key={d} className="flex flex-wrap justify-between gap-x-3 gap-y-0.5">
                  <span className="text-body">{t('compare.delta', { d: krw(d), x: krw(x.earned) })}</span>
                  <span className="text-fg font-medium">{W(x.sum)} <span className="text-sub font-normal">({sign(x.sum - r.sum)})</span></span>
                </li>
              ))}
            </ul>
          </section>

          <p className="text-xs text-muted">{t('result.disclaimer')}</p>
          <ShareResult
            card={{
              tool: t('share.tool'), label: t('result.eitcLabel'), headline: W(r.eitc.amount),
              sub: t('share.sub', { ...years, hh }),
              rows: [
                { label: t('result.ctcLabel'), value: W(r.ctc.amount) },
                { label: t('result.sumLabel'), value: W(r.sum) },
                { label: t('breakdown.earned'), value: krw(r.earned) },
              ],
            }}
            text={r.sum > 0 ? t('share.text', { hh, x: krw(r.earned), e: W(r.eitc.amount), c: W(r.ctc.amount), s: W(r.sum) }) : t('share.textNone', { hh, x: krw(r.earned) })}
          />
        </div>
      </div>

      <div className="ui-card p-6 space-y-6">
        <h2 className="text-xl font-semibold text-fg">{t('guide.title')}</h2>
        <div className="bg-subtle rounded-2xl p-5 text-sm text-sub space-y-1">
          <p className="font-medium text-body">{t('guide.next.title')}</p>
          <p>{t('guide.next.body')}</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {(['calc', 'apply', 'household', 'property', 'child', 'tips'] as const).map((sec) => (
            <div key={sec}>
              <h3 className="font-semibold text-fg mb-3">{t(`guide.${sec}.title`)}</h3>
              <ul className="list-disc pl-5 space-y-2 text-sm text-sub">
                {(t.raw(`guide.${sec}.items`) as string[]).map((s, i) => <li key={i}>{s}</li>)}
              </ul>
            </div>
          ))}
        </div>
        <div>
          <h3 className="font-semibold text-fg mb-3">{t('guide.faq.title')}</h3>
          <div className="divide-y divide-line border-y border-line">
            {faq.map((f) => (
              <details key={f.q} className="py-3">
                <summary className="cursor-pointer text-sm font-medium text-body min-h-[44px] flex items-center">{f.q}</summary>
                <p className="text-sm text-sub mt-2 leading-relaxed">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
        <div className="bg-subtle rounded-2xl p-5 text-sm text-sub space-y-2">
          <p className="font-medium text-body">{t('guide.sources.title')}</p>
          <ul className="space-y-1">
            {SOURCES.map(([k, url]) => (
              <li key={k}><a href={url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">{t(`guide.sources.items.${k}`)}</a></li>
            ))}
          </ul>
          <p className="text-xs text-muted">{t('guide.sources.asOf')}</p>
        </div>
      </div>
    </div>
  )
}

function Seg({ id, label, hint, options, value, onChange, cols }: {
  id: string; label: string; hint?: string; options: [string, string][]; value: string; onChange: (v: string) => void; cols: string
}) {
  return (
    <div>
      <p id={id} className="block text-sm font-medium text-body mb-1.5">{label}</p>
      <div className={`grid ${cols} gap-2`} role="group" aria-labelledby={id} aria-describedby={hint ? `${id}-hint` : undefined}>
        {options.map(([c, text]) => (
          <button key={c} type="button" aria-pressed={c === value} onClick={() => onChange(c)}
            className={`min-h-[44px] px-2 rounded-xl text-sm font-medium ${c === value ? 'bg-primary text-white' : 'bg-soft text-body hover:bg-subtle'}`}>
            {text}
          </button>
        ))}
      </div>
      {hint && <p id={`${id}-hint`} className="text-xs text-muted mt-1.5">{hint}</p>}
    </div>
  )
}

function Num({ id, label, hint, unit, value, onChange, reading }: {
  id: string; label: string; hint?: string; unit: string; value: string; onChange: (v: string) => void; reading?: string
}) {
  const describedBy = [reading && num(value) > 0 ? `${id}-reading` : '', hint ? `${id}-hint` : ''].filter(Boolean).join(' ') || undefined
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-body mb-1.5">{label}</label>
      <div className="relative">
        <input id={id} type="text" inputMode="numeric" autoComplete="off" value={value ? num(value).toLocaleString('ko-KR') : ''}
          onChange={(e) => onChange(digits(e.target.value))} placeholder="0" aria-describedby={describedBy}
          className="ui-field w-full px-4 py-3 pr-14 text-sm tabular-nums" />
        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-faint">{unit}</span>
      </div>
      {reading && num(value) > 0 && <p id={`${id}-reading`} className="text-xs text-sub mt-1 tabular-nums">{reading}</p>}
      {hint && <p id={`${id}-hint`} className="text-xs text-muted mt-1">{hint}</p>}
    </div>
  )
}

function Stepper({ id, label, hint, value, max, unit, minus, plus, onChange }: {
  id: string; label: string; hint?: string; value: number; max: number; unit: string; minus: string; plus: string; onChange: (n: number) => void
}) {
  const btn = 'min-h-[44px] min-w-[44px] rounded-xl bg-soft text-body hover:bg-subtle text-lg font-medium disabled:text-faint disabled:hover:bg-soft'
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-body mb-1.5">{label}</label>
      <div className="flex items-center gap-2">
        <button type="button" className={btn} aria-label={minus} disabled={value <= 0} onClick={() => onChange(Math.max(0, value - 1))}>−</button>
        <div className="relative flex-1">
          <input id={id} type="text" inputMode="numeric" autoComplete="off" value={String(value)} aria-describedby={hint ? `${id}-hint` : undefined}
            onChange={(e) => onChange(Math.min(max, num(digits(e.target.value, 2))))} className="ui-field w-full px-4 py-3 pr-10 text-sm text-center tabular-nums" />
          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-faint">{unit}</span>
        </div>
        <button type="button" className={btn} aria-label={plus} disabled={value >= max} onClick={() => onChange(Math.min(max, value + 1))}>+</button>
      </div>
      {hint && <p id={`${id}-hint`} className="text-xs text-muted mt-1">{hint}</p>}
    </div>
  )
}

function Row({ label, value, strong, sub, className = '' }: { label: ReactNode; value: string; strong?: boolean; sub?: boolean; className?: string }) {
  return (
    <div className={`flex justify-between gap-3 ${sub ? 'pl-3 text-xs text-muted' : strong ? 'font-semibold text-fg' : 'text-body'} ${className}`}>
      <dt className="min-w-0">{label}</dt>
      <dd className="shrink-0 text-right">{value}</dd>
    </div>
  )
}
