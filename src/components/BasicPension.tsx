'use client'

import { useMemo, useState, type ReactNode } from 'react'
import { useTranslations } from '@/lib/i18n'
import '@/lib/i18n/ns/basicPension'
import ShareResult from '@/components/ShareResult'
import MobileResultLink from '@/components/MobileResultLink'
import { useSearchParams } from '@/hooks/useSearchParams'
import { useHydrated } from '@/hooks/useHydrated'
import { fmtKRW } from '@/utils/bogeumjari'
import {
  BASE, BP_YEAR, LIMITS, FINANCIAL_DEDUCTION, INTEREST_DEDUCTION, WORK_DEDUCTION, LUXURY_CAR, CONVERSION_PCT,
  calcBasicPension, type Household, type Region,
} from '@/utils/basicPension'

const won = (n: number) => Math.round(n).toLocaleString('ko-KR')
const digits = (s: string) => s.replace(/\D/g, '').slice(0, 13)
const num = (s: string) => Number(s) || 0
const MAN = 10_000

// 첫 화면 기본값: 대도시 단독, 국민연금 월 40만원, 주택 시가표준액 3억, 예금 3천만원 → 수급·전액
// 월 소득은 원, 재산은 만원 단위로 입력한다.
const DEFAULTS = {
  h: 's', r: 'm', w1: '0', w2: '0', p1: '400000', p2: '0', a1: '', a2: '', o: '0', i: '0',
  pr: '30000', dp: '0', fn: '3000', db: '0', car: '0', fr: '0', cx: '', jk: '',
}
type Key = keyof typeof DEFAULTS
const HOUSEHOLDS: [string, Household][] = [['s', 'single'], ['c2', 'couple2'], ['c1', 'couple1']]
const REGIONS: [string, Region][] = [['m', 'metro'], ['c', 'city'], ['r', 'rural']]
const CODES: Record<string, string[]> = { h: ['s', 'c2', 'c1'], r: ['m', 'c', 'r'], cx: ['', '1'], jk: ['', '1'] }
const SOURCES = [
  ['notice', 'https://www.law.go.kr/LSW/admRulLsInfoR.do?admRulSeq=2100000283276'],
  ['act', 'https://www.law.go.kr/법령/기초연금법'],
  ['decree', 'https://www.law.go.kr/법령/기초연금법시행령'],
  ['rule', 'https://www.law.go.kr/법령/기초연금법시행규칙'],
  ['pressThreshold', 'https://www.mohw.go.kr/board.es?act=view&bid=0027&list_no=1488478&mid=a10503000000'],
  ['pressBase', 'https://mohw.go.kr/board.es?act=view&bid=0027&list_no=1488572&mid=a10503000000'],
  ['portal', 'https://basicpension.mohw.go.kr/menu.es?mid=a10103010000'],
  ['budget2027', 'https://www.korea.kr/news/policyNewsView.do?newsId=148971270'],
] as const

export default function BasicPension() {
  const t = useTranslations('basicPension')
  const sp = useSearchParams()
  const hydrated = useHydrated()

  // URL → 값. 하이드레이션 전에는 기본값이라 첫 렌더가 정적 HTML과 같다. 사용자가 고치면 그 값이 우선.
  const fromUrl = useMemo(() => {
    const next = { ...DEFAULTS }
    if (!hydrated) return next
    for (const k of Object.keys(DEFAULTS) as Key[]) {
      const q = sp.get(k)
      if (q != null && (CODES[k] ? CODES[k].includes(q) : /^\d{1,13}$/.test(q))) next[k] = q
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
      const q = CODES[key] || key === 'a1' || key === 'a2' ? next[key] : next[key] || '0'
      if (q !== DEFAULTS[key]) url.searchParams.set(key, q)
      else url.searchParams.delete(key)
    }
    window.history.replaceState(window.history.state, '', url)
  }

  const household = HOUSEHOLDS.find(([c]) => c === v.h)![1]
  const region = REGIONS.find(([c]) => c === v.r)![1]
  const couple = household !== 'single'
  const optA = (s: string) => (s === '' ? null : num(s))
  const r = useMemo(() => calcBasicPension({
    household, region,
    self: { work: num(v.w1), nps: num(v.p1), a: optA(v.a1) },
    spouse: { work: num(v.w2), nps: num(v.p2), a: optA(v.a2) },
    other: num(v.o), interest: num(v.i), freeRent: num(v.fr) * MAN,
    property: num(v.pr) * MAN, deposit: num(v.dp) * MAN, car: num(v.car) * MAN, carExempt: v.cx === '1',
    financial: num(v.fn) * MAN, debt: num(v.db) * MAN, jikyeok: v.jk === '1',
  }), [v, household, region])

  const krw = (n: number) => fmtKRW(n, t)
  const W = (n: number) => t('unit.won', { v: won(n) })
  const range = (lo: number, hi: number) => (lo === hi ? W(lo) : t('unit.range', { lo: won(lo), hi: won(hi) }))
  const pair = (lo: number[], hi: number[]) => {
    const each = lo.map((x, i) => range(x, hi[i]))
    return each.length === 1 ? each[0] : t('steps.pair', { a: each[0], b: each[1] })
  }
  const amount = range(r.total.lo, r.total.hi)
  const status = v.jk === '1' ? 'jikyeok' : r.eligible ? 'eligible' : 'over'
  const headline = r.eligible ? amount : t(`result.status.${status}`)
  const hh = t(`input.households.${household}`)
  const ratio = Math.min(100, (r.recognized / r.threshold) * 100)
  const showA = (p: string) => num(p) > LIMITS.full150
  const anyRange = r.linked.some((l) => l.rule === 'range')
  const reversal = r.lo.reversal || r.hi.reversal

  const faq = t.raw('guide.faq.items') as { q: string; a: string }[]

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-fg">{t('title')}</h1>
        <p className="text-sm text-muted mt-1">{t('subtitle')}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="ui-card p-6 space-y-5 min-w-0">
          <MobileResultLink href="#basic-pension-result" label={t('result.label')} value={headline} />
          <h2 className="font-semibold text-fg">{t('input.title')}</h2>

          <Seg label={t('input.household')} hint={t(`input.householdHint.${household}`)} id="bp-h"
            options={HOUSEHOLDS.map(([c, h]) => [c, t(`input.households.${h}`)])} value={v.h} onChange={(c) => set('h', c)} cols="grid-cols-1" />
          <Seg label={t('input.region')} hint={t(`input.regionHint.${region}`)} id="bp-r"
            options={REGIONS.map(([c, x]) => [c, t(`input.regions.${x}`)])} value={v.r} onChange={(c) => set('r', c)} cols="grid-cols-3" />

          <fieldset className="space-y-4">
            <legend className="text-sm font-semibold text-fg mb-3">{t('input.incomeTitle')}</legend>
            <Num id="bp-w1" label={couple ? t('input.workSelf') : t('input.work')} hint={t('input.workHint', { d: won(WORK_DEDUCTION) })} unit={t('unit.wonShort')} value={v.w1} onChange={(x) => set('w1', x)} />
            {couple && <Num id="bp-w2" label={t('input.workSpouse')} unit={t('unit.wonShort')} value={v.w2} onChange={(x) => set('w2', x)} />}
            <Num id="bp-p1" label={couple ? t('input.npsSelf') : t('input.nps')} hint={t('input.npsHint', { v: won(LIMITS.full150) })} unit={t('unit.wonShort')} value={v.p1} onChange={(x) => set('p1', x)} />
            {showA(v.p1) && <Num id="bp-a1" label={t('input.a')} hint={t('input.aHint')} unit={t('unit.wonShort')} value={v.a1} onChange={(x) => set('a1', x)} placeholder={t('input.aPlaceholder')} />}
            {couple && <Num id="bp-p2" label={t('input.npsSpouse')} hint={household === 'couple1' ? t('input.npsSpouseHint') : undefined} unit={t('unit.wonShort')} value={v.p2} onChange={(x) => set('p2', x)} />}
            {household === 'couple2' && showA(v.p2) && <Num id="bp-a2" label={t('input.aSpouse')} hint={t('input.aHint')} unit={t('unit.wonShort')} value={v.a2} onChange={(x) => set('a2', x)} placeholder={t('input.aPlaceholder')} />}
            <Num id="bp-o" label={t('input.other')} hint={t('input.otherHint')} unit={t('unit.wonShort')} value={v.o} onChange={(x) => set('o', x)} />
            <Num id="bp-i" label={t('input.interest')} hint={t('input.interestHint', { d: won(INTEREST_DEDUCTION) })} unit={t('unit.wonShort')} value={v.i} onChange={(x) => set('i', x)} />
          </fieldset>

          <fieldset className="space-y-4">
            <legend className="text-sm font-semibold text-fg mb-3">{t('input.propertyTitle')}</legend>
            <Num id="bp-pr" label={t('input.property')} hint={t('input.propertyHint')} unit={t('unit.man')} value={v.pr} reading={krw(num(v.pr) * MAN)} onChange={(x) => set('pr', x)} />
            <Num id="bp-dp" label={t('input.deposit')} hint={t('input.depositHint')} unit={t('unit.man')} value={v.dp} reading={krw(num(v.dp) * MAN)} onChange={(x) => set('dp', x)} />
            <Num id="bp-fn" label={t('input.financial')} hint={t('input.financialHint', { d: krw(FINANCIAL_DEDUCTION) })} unit={t('unit.man')} value={v.fn} reading={krw(num(v.fn) * MAN)} onChange={(x) => set('fn', x)} />
            <Num id="bp-db" label={t('input.debt')} hint={t('input.debtHint')} unit={t('unit.man')} value={v.db} reading={krw(num(v.db) * MAN)} onChange={(x) => set('db', x)} />
            <Num id="bp-car" label={t('input.car')} hint={t('input.carHint', { v: krw(LUXURY_CAR) })} unit={t('unit.man')} value={v.car} reading={krw(num(v.car) * MAN)} onChange={(x) => set('car', x)} />
            {num(v.car) * MAN >= LUXURY_CAR && (
              <Check id="bp-cx" label={t('input.carExempt')} checked={v.cx === '1'} onChange={(c) => set('cx', c ? '1' : '')} />
            )}
          </fieldset>

          <fieldset className="space-y-4">
            <legend className="text-sm font-semibold text-fg mb-3">{t('input.extraTitle')}</legend>
            <Num id="bp-fr" label={t('input.freeRent')} hint={t('input.freeRentHint')} unit={t('unit.man')} value={v.fr} reading={krw(num(v.fr) * MAN)} onChange={(x) => set('fr', x)} />
            <Check id="bp-jk" label={t('input.jikyeok')} hint={t('input.jikyeokHint')} checked={v.jk === '1'} onChange={(c) => set('jk', c ? '1' : '')} />
          </fieldset>
        </div>

        <div id="basic-pension-result" className="lg:col-span-2 ui-card p-6 space-y-6 scroll-mt-20 min-w-0" aria-live="polite">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm text-sub">{t('result.label')}</p>
              <span className={`rounded-lg px-2.5 py-1 text-xs font-semibold ${r.eligible ? 'bg-primary text-white' : 'bg-red-50 text-red-700'}`}>{t(`result.badge.${status}`)}</span>
            </div>
            <p className="text-3xl font-bold text-fg tabular-nums [overflow-wrap:anywhere]">{headline}</p>
            {r.eligible && household === 'couple2' && <p className="text-sm text-body tabular-nums">{pair(r.lo.final, r.hi.final)}</p>}
            {r.eligible && !r.exact && <p className="text-sm text-sub">{t('result.rangeNote')}</p>}
          </div>

          <div className="bg-subtle rounded-2xl p-5 space-y-3">
            <div className="flex flex-wrap justify-between gap-2 text-sm">
              <span className="text-body">{t('result.recognized')} <strong className="text-fg tabular-nums">{W(r.recognized)}</strong></span>
              <span className="text-body">{t('result.threshold', { year: BP_YEAR, hh })} <strong className="text-fg tabular-nums">{W(r.threshold)}</strong></span>
            </div>
            <div className="h-2.5 rounded-full bg-track overflow-hidden" role="img" aria-label={t('result.gauge', { p: Math.round((r.recognized / r.threshold) * 100) })}>
              <div className={`h-full rounded-full ${r.margin >= 0 ? 'bg-primary' : 'bg-red-500'}`} style={{ width: `${ratio}%` }} />
            </div>
            <p className="text-sm text-body">
              {r.margin >= 0
                ? t('result.margin', { v: won(r.margin), p: krw(r.margin * 300) })
                : t('result.over', { v: won(-r.margin), p: krw(-r.margin * 300) })}
            </p>
          </div>

          {v.jk === '1' && <p className="bg-amber-50 text-amber-800 rounded-2xl p-4 text-sm">{t('warn.jikyeok')}</p>}
          {r.property.luxury && <p className="bg-amber-50 text-amber-800 rounded-2xl p-4 text-sm">{t('warn.luxury', { v: krw(LUXURY_CAR) })}</p>}
          {r.eligible && anyRange && <p className="bg-amber-50 text-amber-800 rounded-2xl p-4 text-sm">{t('warn.range', { v: won(LIMITS.full150) })}</p>}
          {r.eligible && reversal && <p className="bg-subtle rounded-2xl p-4 text-sm text-sub">{t('result.reversalNote')}</p>}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <section aria-labelledby="bp-breakdown">
              <h3 id="bp-breakdown" className="font-semibold text-fg mb-3">{t('breakdown.title')}</h3>
              <dl className="space-y-1.5 text-sm tabular-nums">
                <Row label={t('breakdown.work')} value={W(r.income.work + r.income.workSpouse)} />
                <Row label={t('breakdown.nps')} value={W(r.income.nps + r.income.npsSpouse)} />
                {r.income.other > 0 && <Row label={t('breakdown.other')} value={W(r.income.other)} />}
                {r.income.interest > 0 && <Row label={t('breakdown.interest')} value={W(r.income.interest)} />}
                {r.income.freeRent > 0 && <Row label={t('breakdown.freeRent')} value={W(r.income.freeRent)} />}
                <Row strong label={t('breakdown.income')} value={W(r.income.total)} />
                <Row className="pt-3" label={t('breakdown.general')} value={krw(r.property.general)} />
                <Row sub label={t('breakdown.basic', { region: t(`input.regions.${region}`) })} value={`-${krw(Math.min(r.property.general, r.property.basic))}`} />
                <Row sub label={t('breakdown.financial', { d: krw(FINANCIAL_DEDUCTION) })} value={krw(r.property.financialNet)} />
                {num(v.db) > 0 && <Row sub label={t('breakdown.debt')} value={`-${krw(num(v.db) * MAN)}`} />}
                <Row label={t('breakdown.net')} value={krw(r.property.net)} />
                <Row sub label={t('breakdown.converted', { p: CONVERSION_PCT })} value={W(r.property.converted)} />
                {r.property.luxury && <Row sub label={t('breakdown.luxury')} value={W(r.property.luxuryIncome)} />}
                <Row strong label={t('breakdown.property')} value={W(r.property.total)} />
                <Row strong className="mt-2 pt-2 border-t border-line" label={t('breakdown.total')} value={W(r.recognized)} />
              </dl>
            </section>

            <section aria-labelledby="bp-steps">
              <h3 id="bp-steps" className="font-semibold text-fg mb-3">{t('steps.title')}</h3>
              {r.eligible ? (
                <dl className="space-y-1.5 text-sm tabular-nums">
                  <Row label={t('steps.base')} value={W(BASE)} />
                  <Row label={t('steps.linked')} value={pair(r.lo.afterLink, r.hi.afterLink)} />
                  {household === 'couple2' && <Row label={t('steps.couple')} value={pair(r.lo.afterCouple, r.hi.afterCouple)} />}
                  {reversal && <Row label={t('steps.reversal')} value={pair(r.lo.final, r.hi.final)} />}
                  <Row strong className="mt-2 pt-2 border-t border-line" label={household === 'couple2' ? t('steps.finalCouple') : t('steps.final')} value={amount} />
                </dl>
              ) : (
                <p className="text-sm text-sub">{t(`steps.none.${status}`)}</p>
              )}
              <ul className="mt-4 bg-subtle rounded-2xl p-4 text-xs text-sub space-y-1.5 tabular-nums">
                <li>{t('limits.max', { v: won(BASE), c: won(LIMITS.coupleMax), e: won(LIMITS.coupleMax / 2) })}</li>
                <li>{t('limits.min', { v: won(LIMITS.min), c: won(LIMITS.coupleMin) })}</li>
                <li>{t('limits.nps', { v: won(LIMITS.full150), a: won(LIMITS.addOn) })}</li>
              </ul>
            </section>
          </div>

          <p className="text-xs text-muted">{t('result.disclaimer')}</p>
          <ShareResult
            card={{
              tool: t('share.tool'), label: t('result.label'), headline,
              sub: t('share.sub', { hh, year: BP_YEAR }),
              rows: [
                { label: t('result.recognized'), value: W(r.recognized) },
                { label: t('share.threshold'), value: W(r.threshold) },
              ],
            }}
            text={status === 'eligible' ? t('share.text', { hh, amount, recognized: W(r.recognized) })
              : status === 'over' ? t('share.textOver', { hh, recognized: W(r.recognized), threshold: W(r.threshold) })
                : t('share.textJikyeok', { hh })}
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
          {(['calc', 'eligibility', 'reduction', 'tips'] as const).map((sec) => (
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
            className={`min-h-[44px] px-3 rounded-xl text-sm font-medium ${c === value ? 'bg-primary text-white' : 'bg-soft text-body hover:bg-subtle'}`}>
            {text}
          </button>
        ))}
      </div>
      {hint && <p id={`${id}-hint`} className="text-xs text-muted mt-1.5">{hint}</p>}
    </div>
  )
}

function Num({ id, label, hint, unit, value, onChange, reading, placeholder = '0' }: {
  id: string; label: string; hint?: string; unit: string; value: string; onChange: (v: string) => void; reading?: string; placeholder?: string
}) {
  const describedBy = [reading && num(value) > 0 ? `${id}-reading` : '', hint ? `${id}-hint` : ''].filter(Boolean).join(' ') || undefined
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-body mb-1.5">{label}</label>
      <div className="relative">
        <input id={id} type="text" inputMode="numeric" autoComplete="off" value={value ? num(value).toLocaleString('ko-KR') : ''}
          onChange={(e) => onChange(digits(e.target.value))} placeholder={placeholder} aria-describedby={describedBy}
          className="ui-field w-full px-4 py-3 pr-14 text-sm tabular-nums" />
        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-faint">{unit}</span>
      </div>
      {reading && num(value) > 0 && <p id={`${id}-reading`} className="text-xs text-sub mt-1 tabular-nums">{reading}</p>}
      {hint && <p id={`${id}-hint`} className="text-xs text-muted mt-1">{hint}</p>}
    </div>
  )
}

function Check({ id, label, hint, checked, onChange }: { id: string; label: string; hint?: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div>
      <label htmlFor={id} className="flex items-start gap-3 min-h-[44px] py-2 cursor-pointer text-sm text-body">
        <input id={id} type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)}
          aria-describedby={hint ? `${id}-hint` : undefined} className="mt-0.5 h-5 w-5 shrink-0 accent-[var(--primary)]" />
        <span>{label}</span>
      </label>
      {hint && <p id={`${id}-hint`} className="text-xs text-muted pl-8">{hint}</p>}
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
