'use client'

import { useState } from 'react'
import { useTranslations } from '@/lib/i18n'
import '@/lib/i18n/ns/youthFutureSavings'
import ShareResult from '@/components/ShareResult'
import MobileResultLink from '@/components/MobileResultLink'
import { useHydrated } from '@/hooks/useHydrated'
import { useSearchParams } from '@/hooks/useSearchParams'
import {
  calcYouthFutureSavings, eligibility, isTier, TIERS, WORKER_TYPES, CONTRIBUTION_RATE, PROPOSED_2027_PREFERRED,
  BASE_RATE, DEFAULT_BONUS, BONUS_MAX, MONTHLY_MAX, TERM_MONTHS, INCOME, SMALL_BIZ_SALES, HOUSEHOLD, ROUNDS, ROUND2_BIRTH,
  type Tier, type WorkerType,
} from '@/utils/youthFutureSavings'

const won = (n: number) => Math.round(n).toLocaleString('ko-KR')
const digits = (s: string, max: number) => s.replace(/\D/g, '').slice(0, max)
// 금리 입력: 정수 2자리 + 소수 2자리
const decimal = (s: string) => {
  const [a, ...b] = s.replace(/[^\d.]/g, '').split('.')
  return b.length ? `${a.slice(0, 2)}.${b.join('').slice(0, 2)}` : a.slice(0, 2)
}
const num = (s: string) => (s.trim() === '' ? 0 : Number(s) || 0)
const pct = (n: number) => String(Math.round(n * 100) / 100)
const RATE_RE = /^\d{1,2}(\.\d{0,2})?$/
const PRESETS = [100_000, 300_000, 500_000]
const md = (iso: string) => `${Number(iso.slice(5, 7))}.${Number(iso.slice(8))}`
const ymd = (iso: string) => `${iso.slice(0, 4)}.${md(iso)}`
const seg = (on: boolean) => `min-h-[44px] rounded-xl text-sm font-medium px-3 ${on ? 'bg-primary text-white' : 'bg-soft text-body hover:bg-subtle'}`

export default function YouthFutureSavings() {
  const t = useTranslations('youthFutureSavings')
  const hydrated = useHydrated()
  const sp = useSearchParams()
  const url = (k: string) => (hydrated ? sp.get(k) : null)

  // 첫 렌더는 기본값(정적 HTML 과 같게), 마운트 후 URL, 사용자가 고치면 그 값
  const [mEdit, setMEdit] = useState<string | null>(null)
  const [baseEdit, setBaseEdit] = useState<string | null>(null)
  const [bonusEdit, setBonusEdit] = useState<string | null>(null)
  const [tierEdit, setTierEdit] = useState<Tier | null>(null)
  const um = url('m'), ub = url('base'), up = url('bonus'), ut = url('type')
  const mText = mEdit ?? (um && /^\d{1,9}$/.test(um) ? um : String(MONTHLY_MAX))
  const baseText = baseEdit ?? (ub && RATE_RE.test(ub) ? ub : String(BASE_RATE))
  const bonusText = bonusEdit ?? (up && RATE_RE.test(up) ? up : String(DEFAULT_BONUS))
  const tier: Tier = tierEdit ?? (isTier(ut) ? ut : 'general')

  const sync = (next: { m?: string; base?: string; bonus?: string; type?: Tier }) => {
    const v = { m: mText, base: baseText, bonus: bonusText, type: tier, ...next }
    const q = new URLSearchParams(window.location.search)
    // 비운 칸은 '0' 으로 — 빼면 받는 쪽이 기본값으로 계산한다
    q.set('m', v.m || '0'); q.set('base', v.base || '0'); q.set('bonus', v.bonus || '0'); q.set('type', v.type)
    history.replaceState(history.state, '', `?${q}`)
  }
  const setTier = (x: Tier) => { setTierEdit(x); sync({ type: x }) }

  const monthlyIn = num(mText), bonusIn = num(bonusText)
  const input = { monthly: monthlyIn, baseRate: num(baseText), bonusRate: bonusIn, tier }
  const r = calcYouthFutureSavings(input)
  const r27 = tier === 'preferred' ? calcYouthFutureSavings(input, PROPOSED_2027_PREFERRED) : null
  const has = r.monthly > 0
  const W = t('won')
  const tierName = (x: Tier) => t(`tiers.${x}`)
  const eq = r.equivalentRate.toFixed(1)

  // 자격 빠른 확인(계산 입력과 별개, URL 에 남기지 않음)
  const [age, setAge] = useState('28')
  const [mil, setMil] = useState('0')
  const [wType, setWType] = useState<WorkerType>('employee')
  const [income, setIncome] = useState('3500')
  const e = eligibility(num(age), num(mil), wType, num(income) * 10_000)
  const ageEntered = age.trim() !== ''

  // 큰 금액: ko 6,000만원·3억원 / en KRW 60M
  const big = (v: number) => (v >= 1e8 && v % 1e8 === 0
    ? t('fmt.eok', { v: v / 1e8, m: v / 1e6 })
    : t('fmt.man', { v: (v / 1e4).toLocaleString('ko-KR'), m: (v / 1e6).toLocaleString('en-US') }))
  const hh = (p: number, d: number) => t('elig.table.household', { p, d })
  const salary = (k: 'general' | 'preferred') => t('elig.table.salary', { s: big(INCOME[k].salary), c: big(INCOME[k].comprehensive) })
  const criteria: { tier: Tier; who: string; personal: string; household: string }[] = [
    { tier: 'general', who: t('types.employee'), personal: salary('general'), household: hh(HOUSEHOLD.general, HOUSEHOLD.generalDual) },
    { tier: 'general', who: t('types.smallBiz'), personal: t('elig.table.sales', { s: big(SMALL_BIZ_SALES.general) }), household: hh(HOUSEHOLD.general, HOUSEHOLD.generalDual) },
    { tier: 'preferred', who: t('types.smeEmployee'), personal: salary('preferred'), household: hh(HOUSEHOLD.preferred, HOUSEHOLD.preferredDual) },
    { tier: 'preferred', who: t('types.smeNewHire'), personal: salary('general'), household: hh(HOUSEHOLD.general, HOUSEHOLD.generalDual) },
    { tier: 'preferred', who: t('types.smallBiz'), personal: t('elig.table.sales', { s: big(SMALL_BIZ_SALES.preferred) }), household: hh(HOUSEHOLD.preferred, HOUSEHOLD.preferredDual) },
    {
      tier: 'taxOnly', who: t('elig.table.anyone'),
      personal: t('elig.table.taxOnlyIncome', { a: big(INCOME.general.salary), b: big(INCOME.taxOnly.salary), c: big(INCOME.general.comprehensive), d: big(INCOME.taxOnly.comprehensive) }),
      household: hh(HOUSEHOLD.general, HOUSEHOLD.generalDual),
    },
  ]

  const faq = t.raw('guide.faq.items') as { q: string; a: string }[]
  const sources = t.raw('guide.sources.items') as { label: string; url: string }[]
  const field = 'ui-field px-4 py-3 w-full pr-12 tabular-nums'
  const unit = 'absolute right-4 top-1/2 -translate-y-1/2 text-sm text-muted'
  const compareRows: [string, string, string][] = [
    [t('compare.principal'), won(r.principal), won(r.regular.principal)],
    [t('compare.interest'), won(r.interest), won(r.regular.gross)],
    [t('compare.tax'), won(0), `-${won(r.regular.tax)}`],
    [t('compare.contribution'), won(r.contribution + r.contributionInterest), won(0)],
  ]

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-fg">{t('title')}</h1>
        <p className="text-sm text-muted mt-1">{t('subtitle')}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="ui-card p-6 space-y-5">
          <MobileResultLink href="#youth-future-savings-result" label={t('result.label')} value={`${won(r.maturity)}${W}`} />
          <h2 className="font-semibold text-fg">{t('input.title')}</h2>
          <div>
            <label htmlFor="yfs-m" className="block text-sm font-medium text-body mb-1.5">{t('input.monthly')}</label>
            <div className="relative">
              <input id="yfs-m" inputMode="numeric" className={field} aria-describedby="yfs-m-hint"
                value={mText === '' ? '' : Number(mText).toLocaleString('ko-KR')}
                onChange={ev => { const v = digits(ev.target.value, 9); setMEdit(v); sync({ m: v }) }} />
              <span className={unit}>{W}</span>
            </div>
            <p id="yfs-m-hint" className="text-xs text-muted mt-1">{t('input.monthlyHint', { max: won(MONTHLY_MAX) })}</p>
            <div className="grid grid-cols-3 gap-2 mt-2" role="group" aria-label={t('input.presets')}>
              {PRESETS.map(p => (
                <button key={p} type="button" aria-pressed={monthlyIn === p}className={seg(monthlyIn === p)}
                  onClick={() => { setMEdit(String(p)); sync({ m: String(p) }) }}>
                  {t('input.preset', { v: p / 10_000 })}
                </button>
              ))}
            </div>
            {monthlyIn > MONTHLY_MAX && <p className="bg-amber-50 text-amber-800 rounded-2xl p-4 text-sm mt-2">{t('input.monthlyOver', { max: won(MONTHLY_MAX) })}</p>}
          </div>

          <div>
            <p className="text-sm font-medium text-body mb-1.5">{t('input.term')}</p>
            <p className="bg-subtle rounded-xl px-4 py-3 text-sm text-body">{t('input.termValue', { n: TERM_MONTHS })}</p>
          </div>

          <div>
            <p id="yfs-tier" className="text-sm font-medium text-body mb-1.5">{t('input.tier')}</p>
            <div className="grid grid-cols-3 gap-2" role="group" aria-labelledby="yfs-tier">
              {TIERS.map(x => (
                <button key={x} type="button" aria-pressed={tier === x} onClick={() => setTier(x)}
                  className={`${seg(tier === x)} py-2 flex flex-col items-center justify-center leading-tight`}>
                  <span>{tierName(x)}</span>
                  <span className={`text-xs mt-0.5 ${tier === x ? 'text-white' : 'text-muted'}`}>{t(`tierRate.${x}`)}</span>
                </button>
              ))}
            </div>
            <p className="text-xs text-muted mt-1.5">{t(`tierDesc.${tier}`)}</p>
            <a href="#yfs-elig" className="inline-block text-xs text-primary hover:underline mt-1 py-1">{t('input.findTier')}</a>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="yfs-base" className="block text-sm font-medium text-body mb-1.5">{t('input.baseRate')}</label>
              <div className="relative">
                <input id="yfs-base" inputMode="decimal" className={field} value={baseText} aria-describedby="yfs-rate-hint"
                  onChange={ev => { const v = decimal(ev.target.value); setBaseEdit(v); sync({ base: v }) }} />
                <span className={unit}>%</span>
              </div>
            </div>
            <div>
              <label htmlFor="yfs-bonus" className="block text-sm font-medium text-body mb-1.5">{t('input.bonusRate')}</label>
              <div className="relative">
                <input id="yfs-bonus" inputMode="decimal" className={field} value={bonusText} aria-describedby="yfs-rate-hint"
                  onChange={ev => { const v = decimal(ev.target.value); setBonusEdit(v); sync({ bonus: v }) }} />
                <span className={unit}>%p</span>
              </div>
            </div>
          </div>
          <p id="yfs-rate-hint" className="text-xs text-muted -mt-3">{t('input.rateHint', { base: pct(BASE_RATE), max: pct(BONUS_MAX) })}</p>
          {bonusIn > BONUS_MAX && <p className="bg-amber-50 text-amber-800 rounded-2xl p-4 text-sm">{t('input.bonusOver', { max: pct(BONUS_MAX) })}</p>}
          <p className="text-sm text-body tabular-nums">{t('input.totalRate', { r: pct(r.rate) })}</p>
        </div>

        <div id="youth-future-savings-result" className="lg:col-span-2 ui-card p-6 space-y-5 scroll-mt-20">
          <div aria-live="polite">
            <p className="text-sm text-sub">{t('result.label')}</p>
            <p className="text-4xl font-bold text-fg tabular-nums mt-1">{won(r.maturity)}{W}</p>
            {has ? (
              <>
                <p className="text-sm text-sub mt-1 tabular-nums">{t('result.summary', { p: won(r.principal), i: won(r.interest + r.contributionInterest), c: won(r.contribution) })}</p>
                <p className="mt-3 inline-block bg-primary-soft text-primary rounded-xl px-3 py-2 text-sm font-semibold tabular-nums">{t('result.equivalent', { r: eq })}</p>
              </>
            ) : <p className="text-sm text-sub mt-1">{t('result.zero')}</p>}
          </div>
          {has && <p className="text-xs text-muted">{t('result.equivalentDesc')}</p>}

          {has && (
            <dl className="divide-y divide-line border-y border-line text-sm tabular-nums">
              {([
                ['principal', r.principal, t('result.rows.principalSub', { m: won(r.monthly), n: r.months })],
                ['interest', r.interest, t('result.rows.interestSub', { r: pct(r.rate) })],
                ['contribution', r.contribution, t('result.rows.contributionSub', { m: won(r.monthlyContribution), p: pct(CONTRIBUTION_RATE[tier] * 100), n: r.months })],
                ['contributionInterest', r.contributionInterest, t('result.rows.contributionInterestSub', { r: pct(r.baseRate) })],
                ['taxSaved', r.taxSaved, t('result.rows.taxSavedSub')],
              ] as const).map(([k, v, sub]) => (
                <div key={k} className="flex items-start justify-between gap-3 py-2.5">
                  <dt className="min-w-0">
                    <span className="text-body">{t(`result.rows.${k}`)}</span>
                    <span className="block text-xs text-muted">{sub}</span>
                  </dt>
                  <dd className={`shrink-0 font-semibold ${k === 'taxSaved' ? 'text-primary' : 'text-fg'}`}>{won(v)}{W}</dd>
                </div>
              ))}
            </dl>
          )}

          {has && (
            <div>
              <h3 className="font-semibold text-fg mb-2">{t('compare.title', { r: pct(r.rate) })}</h3>
              <table className="w-full text-sm tabular-nums">
                <thead>
                  <tr className="text-left text-muted">
                    <th scope="col" className="py-1.5 font-medium">{t('compare.item')}</th>
                    <th scope="col" className="py-1.5 font-medium text-right">{t('compare.ours')}</th>
                    <th scope="col" className="py-1.5 font-medium text-right">{t('compare.regular')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {compareRows.map(([label, a, b]) => (
                    <tr key={label}>
                      <th scope="row" className="py-1.5 text-left font-normal text-sub">{label}</th>
                      <td className="py-1.5 text-right text-body">{a}</td>
                      <td className="py-1.5 text-right text-body">{b}</td>
                    </tr>
                  ))}
                  <tr>
                    <th scope="row" className="py-2 text-left font-semibold text-fg">{t('compare.maturity')}</th>
                    <td className="py-2 text-right font-bold text-fg">{won(r.maturity)}</td>
                    <td className="py-2 text-right font-semibold text-body">{won(r.regular.maturity)}</td>
                  </tr>
                </tbody>
              </table>
              <p className="text-sm text-body mt-2">{t('compare.diff', { v: won(r.gainVsRegular) })}</p>
            </div>
          )}

          {has && r27 && <p className="bg-subtle rounded-2xl p-4 text-sm text-sub">{t('result.proposed', { v: won(r27.maturity), d: won(r27.maturity - r.maturity) })}</p>}
          {has && tier === 'taxOnly' && <p className="bg-subtle rounded-2xl p-4 text-sm text-sub">{t('result.taxOnlyNote')}</p>}
          <p className="bg-amber-50 text-amber-800 rounded-2xl p-4 text-sm">{t('result.early')}</p>
          <p className="text-xs text-muted">{t('result.assumption')}</p>
          {has && (
            <ShareResult
              card={{
                tool: t('result.share.tool'), label: t('result.label'), headline: `${won(r.maturity)}${W}`,
                sub: t('result.share.sub', { m: won(r.monthly), n: r.months, r: pct(r.rate), tier: tierName(tier) }),
                rows: [
                  { label: t('result.rows.contribution'), value: `${won(r.contribution)}${W}` },
                  { label: t('result.share.eqLabel'), value: t('result.share.eqValue', { r: eq }) },
                ],
              }}
              text={t('result.share.text', { m: won(r.monthly), v: won(r.maturity), tier: tierName(tier), r: pct(r.rate), eq })}
            />
          )}
        </div>
      </div>

      <section id="yfs-elig" className="ui-card p-6 space-y-5 scroll-mt-20" aria-labelledby="yfs-elig-title">
        <div>
          <h2 id="yfs-elig-title" className="text-xl font-semibold text-fg">{t('elig.title')}</h2>
          <p className="text-sm text-sub mt-1">{t('elig.desc')}</p>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="yfs-age" className="block text-sm font-medium text-body mb-1.5">{t('elig.age')}</label>
                <div className="relative">
                  <input id="yfs-age" inputMode="numeric" className={field} value={age} onChange={ev => setAge(digits(ev.target.value, 2))} />
                  <span className={unit}>{t('elig.ageUnit')}</span>
                </div>
              </div>
              <div>
                <label htmlFor="yfs-mil" className="block text-sm font-medium text-body mb-1.5">{t('elig.military')}</label>
                <div className="relative">
                  <input id="yfs-mil" inputMode="numeric" className={field} value={mil} aria-describedby="yfs-mil-hint" onChange={ev => setMil(digits(ev.target.value, 3))} />
                  <span className={unit}>{t('elig.monthUnit')}</span>
                </div>
              </div>
            </div>
            <p id="yfs-mil-hint" className="text-xs text-muted -mt-2">{t('elig.militaryHint')}</p>
            <div>
              <p id="yfs-wtype" className="text-sm font-medium text-body mb-1.5">{t('elig.type')}</p>
              <div className="grid grid-cols-2 gap-2" role="group" aria-labelledby="yfs-wtype">
                {WORKER_TYPES.map(x => (
                  <button key={x} type="button" aria-pressed={wType === x} onClick={() => setWType(x)} className={seg(wType === x)}>{t(`types.${x}`)}</button>
                ))}
              </div>
              <p className="text-xs text-muted mt-1.5">{t(`typeDesc.${wType}`)}</p>
            </div>
            <div>
              <label htmlFor="yfs-income" className="block text-sm font-medium text-body mb-1.5">{t(wType === 'smallBiz' ? 'elig.sales' : 'elig.income')}</label>
              <div className="relative">
                <input id="yfs-income" inputMode="numeric" className={`${field} pr-16`} value={income === '' ? '' : Number(income).toLocaleString('ko-KR')}
                  onChange={ev => setIncome(digits(ev.target.value, 7))} />
                <span className={unit}>{t('elig.manwon')}</span>
              </div>
            </div>
          </div>

          <div className="bg-subtle rounded-2xl p-5 space-y-3 text-sm" aria-live="polite">
            {!ageEntered ? <p className="text-sub">{t('elig.result.enterAge')}</p>
              : !e.ageOk ? <p className="font-semibold text-fg">{t('elig.result.ageNo', { c: e.countedAge })}</p>
                : !e.tier ? <p className="font-semibold text-fg">{t('elig.result.incomeNo')}</p>
                  : (
                    <>
                      <p className="text-sub">{t('elig.result.expected')}</p>
                      <p className="text-2xl font-bold text-fg">{tierName(e.tier)} <span className="text-base font-semibold text-primary">{t(`tierRate.${e.tier}`)}</span></p>
                      <p className="text-sub">{t(`elig.result.household.${e.tier === 'preferred' && wType !== 'smeNewHire' ? 'preferred' : 'general'}`)}</p>
                      {e.tier === 'preferred' && wType !== 'smallBiz' && <p className="text-sub">{t('elig.result.tenure')}</p>}
                      <button type="button" onClick={() => { if (e.tier) setTier(e.tier) }} disabled={tier === e.tier}
                        className="ui-btn min-h-[44px] px-4 py-2.5 text-sm disabled:opacity-60">
                        {tier === e.tier ? t('elig.result.applied') : t('elig.result.apply')}
                      </button>
                    </>
                  )}
            {ageEntered && e.ageOk && num(mil) > 0 && <p className="text-xs text-muted">{t('elig.result.counted', { c: e.countedAge })}</p>}
            <p className="text-xs text-muted">{t('elig.result.note')}</p>
          </div>
        </div>

        <div>
          <h3 className="font-semibold text-fg mb-2">{t('elig.table.title')}</h3>
          <ul className="divide-y divide-line border-y border-line text-sm">
            {criteria.map((c, i) => (
              <li key={i} className="grid grid-cols-1 sm:grid-cols-[11rem_1fr] gap-1 sm:gap-4 py-3">
                <span className="flex flex-wrap items-center gap-x-2">
                  <span className="font-semibold text-fg">{tierName(c.tier)}</span>
                  <span className="text-xs text-primary font-semibold">{t(`tierRate.${c.tier}`)}</span>
                  <span className="text-sub">{c.who}</span>
                </span>
                <span className="text-body">
                  <span className="block">{t('elig.table.personal')} {c.personal}</span>
                  <span className="block text-sub">{t('elig.table.householdLabel')} {c.household}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h3 className="font-semibold text-fg mb-2">{t('elig.common.title')}</h3>
          <ul className="list-disc pl-5 space-y-1.5 text-sm text-sub">{(t.raw('elig.common.items') as string[]).map((s, i) => <li key={i}>{s}</li>)}</ul>
        </div>
      </section>

      <section className="ui-card p-6 space-y-4" aria-labelledby="yfs-early">
        <h2 id="yfs-early" className="text-xl font-semibold text-fg">{t('early.title')}</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {(['normal', 'special'] as const).map(k => (
            <div key={k}>
              <h3 className="font-semibold text-fg mb-2">{t(`early.${k}.title`)}</h3>
              <ul className="list-disc pl-5 space-y-1.5 text-sm text-sub">{(t.raw(`early.${k}.items`) as string[]).map((s, i) => <li key={i}>{s}</li>)}</ul>
            </div>
          ))}
        </div>
        <p className="bg-subtle rounded-2xl p-4 text-sm text-sub">{t('early.rejoin')}</p>
      </section>

      <section className="ui-card p-6 space-y-4" aria-labelledby="yfs-schedule">
        <h2 id="yfs-schedule" className="text-xl font-semibold text-fg">{t('schedule.title')}</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {ROUNDS.map(x => (
            <div key={x.round} className="bg-subtle rounded-2xl p-5">
              <h3 className="font-semibold text-fg">{t('schedule.round', { n: x.round })}</h3>
              <dl className="mt-2 space-y-1.5 text-sm tabular-nums">
                {([['apply', x.apply], ['review', x.review], ['notice', x.notice], ['open', x.open]] as const).map(([k, d]) => d && (
                  <div key={k} className="flex justify-between gap-3">
                    <dt className="text-sub">{t(`schedule.${k}`)}</dt>
                    <dd className={k === 'open' ? 'font-semibold text-fg' : 'text-body'}>{t('schedule.range', { a: ymd(d[0]), b: md(d[1]) })}</dd>
                  </div>
                ))}
              </dl>
            </div>
          ))}
          <div className="bg-subtle rounded-2xl p-5">
            <h3 className="font-semibold text-fg">{t('schedule.round', { n: 3 })}</h3>
            <p className="mt-2 text-sm"><span className="inline-block rounded-md bg-amber-50 text-amber-800 px-2 py-0.5 text-xs font-semibold">{t('schedule.check')}</span></p>
            <p className="mt-2 text-sm text-sub">{t('schedule.third')}</p>
          </div>
        </div>
        <ul className="list-disc pl-5 space-y-1.5 text-sm text-sub">
          <li>{t('schedule.birth', { a: ymd(ROUND2_BIRTH[0]), b: ymd(ROUND2_BIRTH[1]) })}</li>
          {(t.raw('schedule.notes') as string[]).map((s, i) => <li key={i}>{s}</li>)}
        </ul>
      </section>

      <div className="ui-card p-6 space-y-6">
        <h2 className="text-xl font-semibold text-fg">{t('guide.title')}</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {(['how', 'tips'] as const).map(sec => (
            <div key={sec}>
              <h3 className="font-semibold text-fg mb-3">{t(`guide.${sec}.title`)}</h3>
              <ul className="list-disc pl-5 space-y-2 text-sm text-sub">{(t.raw(`guide.${sec}.items`) as string[]).map((s, i) => <li key={i}>{s}</li>)}</ul>
            </div>
          ))}
        </div>
        <div>
          <h3 className="font-semibold text-fg mb-3">{t('guide.faq.title')}</h3>
          <div className="divide-y divide-line border-y border-line">
            {faq.map(f => (
              <details key={f.q} className="py-3">
                <summary className="cursor-pointer text-sm font-medium text-body min-h-[24px]">{f.q}</summary>
                <p className="text-sm text-sub mt-2 leading-relaxed">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
        <div className="bg-subtle rounded-2xl p-5 text-sm text-sub space-y-2">
          <p className="font-medium text-body">{t('guide.sources.title')}</p>
          <ul className="space-y-1">{sources.map(s => <li key={s.url}><a href={s.url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">{s.label}</a></li>)}</ul>
          <p className="text-xs text-muted">{t('guide.sources.asOf')}</p>
        </div>
      </div>
    </div>
  )
}
