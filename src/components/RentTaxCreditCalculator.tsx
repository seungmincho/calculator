'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useTranslations } from '@/lib/i18n'
import '@/lib/i18n/ns/rentTaxCredit'
import { useSearchParams } from '@/hooks/useSearchParams'
import ShareResult from '@/components/ShareResult'
import MobileResultLink from '@/components/MobileResultLink'
import { TAX_YEAR } from '@/utils/yearEndTax'
import {
  CHECKS, RENT_RULES, RULE_YEARS, REF_DATE, eligibility, rentResult, cashReceiptMax, pastYears, ruleMax, tierOf, tierRate, kstToday,
  type CheckId, type Tier,
} from '@/utils/rentTaxCredit'

// 올해 금액은 yearEndTax.ts(연말정산 계산기와 같은 함수). URL: s=총급여, r=월세(월), m=개월, no=아니오 항목. 연말정산 계산기에서 오는 mr(연간 월세)도 받음
const SALARY_PRESETS = [30_000_000, 40_000_000, 55_000_000, 70_000_000, 80_000_000]
const RENT_PRESETS = [400_000, 500_000, 600_000, 800_000, 1_000_000]
const DEF = { salary: 50_000_000, rent: 600_000, months: 12 }
const MAX = 10_000_000_000
const TIERS: Tier[] = ['low', 'mid', 'over']
const LINKS = ['cardDeduction', 'medical', 'pension', 'youthRent', 'rentConverter'] as const
const LINK_HREF: Record<(typeof LINKS)[number], string> = {
  cardDeduction: '/card-deduction/', medical: '/medical-tax-credit/', pension: '/pension-tax-credit/',
  youthRent: '/youth-rent-subsidy/', rentConverter: '/rent-converter/',
}

const won = (n: number) => Math.round(n).toLocaleString('ko-KR')
const man = (n: number) => Math.floor(n / 10_000).toLocaleString('ko-KR')
/** 영어 문구용 백만 단위 */
const mil = (n: number) => (n / 1_000_000).toLocaleString('en-US', { maximumFractionDigits: 1 })
const pct = (r: number) => Math.round(r * 100)
const digits = (s: string) => s.replace(/[^\d]/g, '')
const amount = (v: string | null) => (v && /^\d{1,11}$/.test(v) ? Number(v) : null)
const monthsParam = (v: string | null) => { const n = amount(v); return n !== null && n >= 1 && n <= 12 ? n : null }
const isCheck = (v: string): v is CheckId => (CHECKS as readonly string[]).includes(v)

function MoneyInput({ id, label, value, onChange, hint, unit }: { id: string; label: string; value: number; onChange: (n: number) => void; hint?: string; unit: string }) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-body mb-2">{label}</label>
      <div className="relative">
        <input
          id={id} type="text" inputMode="numeric" value={value ? won(value) : ''} placeholder="0"
          onChange={(e) => onChange(Math.min(Number(digits(e.target.value)) || 0, MAX))}
          className="ui-field w-full px-4 py-3 pr-12 tabular-nums" aria-describedby={hint ? `${id}-hint` : undefined}
        />
        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-muted">{unit}</span>
      </div>
      {hint && <p id={`${id}-hint`} className="text-xs text-muted mt-1.5">{hint}</p>}
    </div>
  )
}

const chip = (on: boolean) => `min-h-[44px] px-3 py-2 rounded-lg text-sm tabular-nums transition-colors ${on ? 'bg-primary text-white' : 'bg-soft text-body hover:bg-subtle'}`

export default function RentTaxCreditCalculator() {
  const t = useTranslations('rentTaxCredit')
  const sp = useSearchParams()
  const [salary, setSalary] = useState(DEF.salary)
  const [rent, setRent] = useState(DEF.rent)
  const [months, setMonths] = useState(DEF.months)
  const [no, setNo] = useState<Set<CheckId>>(() => new Set())
  const [today, setToday] = useState(REF_DATE)
  const [pastEdit, setPastEdit] = useState<Record<number, { months?: number; tier?: Tier }>>({})

  // URL → 상태 (마운트 후 1회. 첫 렌더는 기본값·REF_DATE라 정적 HTML과 같음)
  const loaded = useRef(false)
  useEffect(() => {
    if (loaded.current) return
    loaded.current = true
    setToday(kstToday())
    setSalary(amount(sp.get('s')) ?? DEF.salary)
    const r = amount(sp.get('r'))
    const mr = amount(sp.get('mr'))
    if (r === null && mr !== null) {
      setRent(Math.round(mr / 12))
      setMonths(12)
    } else {
      setRent(r ?? DEF.rent)
      setMonths(monthsParam(sp.get('m')) ?? DEF.months)
    }
    setNo(new Set((sp.get('no') ?? '').split(',').filter(isCheck)))
  }, [sp])

  useEffect(() => {
    if (!loaded.current) return
    const q = new URLSearchParams({ s: String(salary), r: String(rent) })
    if (months !== 12) q.set('m', String(months))
    if (no.size) q.set('no', CHECKS.filter((c) => no.has(c)).join(','))
    window.history.replaceState(window.history.state, '', `?${q}`)
  }, [salary, rent, months, no])

  const annual = rent * months
  const elig = eligibility(salary, no)
  const res = rentResult(salary, annual)
  const saving = elig.ok ? res.saving : 0
  const cash = cashReceiptMax(salary, annual)
  const rule = RENT_RULES[TAX_YEAR]
  const W = t('won')
  const setAnswer = (c: CheckId, yes: boolean) => setNo((s) => { const n = new Set(s); if (yes) n.delete(c); else n.add(c); return n })

  const past = pastYears(today)
  const pastRows = past.years.map((p) => {
    const e = pastEdit[p.year] ?? {}
    const tier = e.tier ?? tierOf(salary, p.rule)
    const m = e.months ?? 12
    return { ...p, tier, months: m, max: ruleMax(p.rule, tier, rent * m) }
  })
  const pastTotal = pastRows.reduce((a, p) => a + p.max, 0)
  const editPast = (year: number, patch: { months?: number; tier?: Tier }) => setPastEdit((s) => ({ ...s, [year]: { ...s[year], ...patch } }))

  const yearEndLink = `/year-end-tax/?${new URLSearchParams({ s: String(salary), mr: String(annual) })}`
  const card = {
    tool: t('title'),
    label: t('share.label', { salary: man(salary), rent: man(rent), salaryM: mil(salary), rentM: mil(rent) }),
    headline: t('share.headline', { amount: man(saving), amountFull: won(saving) }),
    sub: elig.ok ? t('share.sub', { year: TAX_YEAR }) : t('share.subNot'),
    rows: [
      { label: t('share.rows.rate'), value: elig.ok ? `${pct(res.rate)}%` : '-' },
      { label: t('share.rows.base'), value: `${won(res.base)}${W}` },
      { label: t('share.rows.saving'), value: `${won(saving)}${W}` },
      { label: t('share.rows.past'), value: `${won(pastTotal)}${W}` },
    ],
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-fg">{t('title')}</h1>
        <p className="text-sm text-muted mt-1">{t('subtitle', { year: TAX_YEAR })}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* 입력 + 자격 체크 */}
        <div className="lg:col-span-1 space-y-6">
          <div className="ui-card p-6 space-y-5">
            <MobileResultLink href="#rent-tax-credit-result" label={t('result.label', { year: TAX_YEAR })} value={`${won(saving)}${W}`} />
            <div>
              <MoneyInput id="rtc-salary" label={t('salary')} value={salary} onChange={setSalary} unit={W} hint={t('salaryHint')} />
              <div className="flex flex-wrap gap-1.5 mt-2">
                {SALARY_PRESETS.map((n) => (
                  <button key={n} type="button" onClick={() => setSalary(n)} aria-pressed={salary === n} className={chip(salary === n)}>
                    {t('manUnit', { n: man(n), m: mil(n) })}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <MoneyInput id="rtc-rent" label={t('rent')} value={rent} onChange={setRent} unit={W} hint={t('rentHint')} />
              <div className="flex flex-wrap gap-1.5 mt-2">
                {RENT_PRESETS.map((n) => (
                  <button key={n} type="button" onClick={() => setRent(n)} aria-pressed={rent === n} className={chip(rent === n)}>
                    {t('manUnit', { n: man(n), m: mil(n) })}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label htmlFor="rtc-months" className="block text-sm font-medium text-body mb-2">{t('months', { year: TAX_YEAR })}</label>
              <select id="rtc-months" value={months} onChange={(e) => setMonths(Number(e.target.value))} className="ui-field w-full px-4 py-3 min-h-[44px]" aria-describedby="rtc-months-hint">
                {Array.from({ length: 12 }, (_, i) => 12 - i).map((n) => <option key={n} value={n}>{t('monthsOpt', { n })}</option>)}
              </select>
              <p id="rtc-months-hint" className="text-xs text-muted mt-1.5">{t('monthsHint', { amount: won(annual) })}</p>
            </div>
          </div>

          <div className="ui-card p-6">
            <h2 className="text-lg font-semibold text-fg">{t('check.title')}</h2>
            <p className="text-sm text-muted mt-1">{t('check.desc', { year: TAX_YEAR })}</p>
            <ul className="mt-3 divide-y divide-line">
              {CHECKS.map((c) => (
                <li key={c} className="py-4">
                  <p id={`rtc-q-${c}`} className="text-sm font-medium text-body">{t(`check.${c}.q`)}</p>
                  <p className="text-xs text-muted mt-1">{t(`check.${c}.hint`, { year: TAX_YEAR })}</p>
                  <div role="radiogroup" aria-labelledby={`rtc-q-${c}`} className="grid grid-cols-2 gap-2 mt-2">
                    {[true, false].map((yes) => {
                      const on = no.has(c) !== yes
                      return (
                        <button key={String(yes)} type="button" role="radio" aria-checked={on} onClick={() => setAnswer(c, yes)}
                          className={`min-h-[44px] px-2 py-2 rounded-lg text-sm font-medium transition-colors ${on ? 'bg-primary text-white' : 'bg-soft text-body hover:bg-subtle'}`}>
                          {t(yes ? 'check.yes' : 'check.no')}
                        </button>
                      )
                    })}
                  </div>
                  {no.has(c) && <p className="text-sm text-amber-700 dark:text-amber-400 mt-2">{t(`check.${c}.fail`)}</p>}
                </li>
              ))}
              <li className="py-4">
                <p className="text-sm font-medium text-body">{t('check.salary.q')}</p>
                <p className="text-xs text-muted mt-1">{t('check.salary.hint')}</p>
                {salary > rule.cap
                  ? <p className="text-sm text-amber-700 dark:text-amber-400 mt-2">{t('check.salary.fail', { salary: won(salary) })}</p>
                  : <p className="text-sm text-sub mt-2">{t('check.salary.ok', { salary: won(salary), rate: pct(res.rate) })}</p>}
              </li>
            </ul>
          </div>
        </div>

        {/* 결과 */}
        <div className="lg:col-span-2 space-y-6">
          <div id="rent-tax-credit-result" className="ui-card p-6 space-y-5 scroll-mt-20">
            <h2 className="text-lg font-semibold text-fg">{t('result.title')}</h2>
            <div aria-live="polite">
              <p className="text-sm text-muted">{t('result.label', { year: TAX_YEAR })}</p>
              <p className="text-3xl font-bold text-fg tabular-nums mt-1">{won(saving)}{W}</p>
              <p className="text-sm text-sub mt-1">
                {!elig.ok ? t('result.notEligible')
                  : annual === 0 ? t('result.noRent')
                  : res.max - saving <= 10 ? t('result.full', { max: won(res.max) }) // 지방소득세 절사 차이 몇 원은 전액으로 봄
                  : t('result.capped', { tax: won(res.taxBefore), max: won(res.max), saving: won(saving) })}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl p-4 bg-subtle">
                <p className="text-sm text-muted">{t('result.rate')}</p>
                <p className="text-lg font-bold text-fg tabular-nums mt-1">{res.rate ? `${pct(res.rate)}%` : '-'}</p>
                <p className="text-xs text-muted mt-1">{t(salary <= 55_000_000 ? 'result.rateLow' : salary <= rule.cap ? 'result.rateMid' : 'result.rateOver')}</p>
              </div>
              <div className="rounded-2xl p-4 bg-subtle">
                <p className="text-sm text-muted">{t('result.base')}</p>
                <p className="text-lg font-bold text-fg tabular-nums mt-1">{won(res.base)}{W}</p>
                <p className="text-xs text-muted mt-1">{annual > rule.limit ? t('result.baseCapped', { paid: won(annual) }) : t('result.baseLimit')}</p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm tabular-nums">
                <caption className="sr-only">{t('result.caption')}</caption>
                <tbody>
                  <tr className="border-b border-line">
                    <th scope="row" className="text-left font-medium py-3 pr-2 text-body">{t('result.credit')}</th>
                    <td className="text-right py-3 pl-2 text-sub">{won(res.credit)}{W}</td>
                  </tr>
                  <tr className="border-b border-line">
                    <th scope="row" className="text-left font-medium py-3 pr-2 text-body">{t('result.max')}</th>
                    <td className="text-right py-3 pl-2 text-sub">{won(res.max)}{W}</td>
                  </tr>
                  <tr className="border-b border-line">
                    <th scope="row" className="text-left font-medium py-3 pr-2 text-body">{t('result.tax')}</th>
                    <td className="text-right py-3 pl-2 text-sub">{won(res.taxBefore)}{W}</td>
                  </tr>
                  <tr className="border-b border-line">
                    <th scope="row" className="text-left font-semibold py-3 pr-2 text-fg">{t('result.saving')}</th>
                    <td className="text-right py-3 pl-2 font-bold text-primary">{won(saving)}{W}</td>
                  </tr>
                  <tr>
                    <th scope="row" className="text-left font-medium py-3 pr-2 text-body">{t('result.cash')}</th>
                    <td className="text-right py-3 pl-2 text-sub">{won(cash)}{W}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="text-sm text-sub">{t(cash > saving ? 'result.cashBetter' : 'result.cashNote')}</p>
            {elig.ok && res.standardBefore && <p className="text-xs text-muted">{t('result.standard')}</p>}
            <p className="text-xs text-muted">{t('result.assumption')}</p>

            <ShareResult card={card} text={t('share.text', { salary: man(salary), rent: man(rent), salaryM: mil(salary), rentM: mil(rent), amount: won(saving) })} fileName="rent-tax-credit" />
            <div className="flex flex-wrap gap-2">
              <Link href={yearEndLink} className="ui-btn px-4 py-3 text-sm">{t('result.toYearEnd')}</Link>
            </div>
          </div>

          {/* 지난 5년 경정청구 */}
          <div className="ui-card p-6 space-y-4">
            <div>
              <h2 className="text-lg font-semibold text-fg">{t('past.title')}</h2>
              <p className="text-sm text-muted mt-1">{t('past.desc', { today })}</p>
            </div>
            <ul className="space-y-3">
              {pastRows.map((p) => (
                <li key={p.year} className="rounded-2xl p-4 bg-subtle">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <p className="font-semibold text-fg">{t('past.year', { year: p.year })}</p>
                    <p className="text-xs text-muted tabular-nums">{t('past.deadline', { date: p.deadline })} · {t(`past.route.${p.route}`)}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-2 mt-3">
                    <div>
                      <label htmlFor={`rtc-pm-${p.year}`} className="block text-xs text-muted mb-1">{t('past.months')}</label>
                      <select id={`rtc-pm-${p.year}`} value={p.months} onChange={(e) => editPast(p.year, { months: Number(e.target.value) })} className="ui-field w-full px-3 py-2 min-h-[44px] text-sm">
                        {Array.from({ length: 13 }, (_, i) => 12 - i).map((n) => <option key={n} value={n}>{n ? t('monthsOpt', { n }) : t('past.none')}</option>)}
                      </select>
                    </div>
                    <div>
                      <label htmlFor={`rtc-pt-${p.year}`} className="block text-xs text-muted mb-1">{t('past.tier')}</label>
                      <select id={`rtc-pt-${p.year}`} value={p.tier} onChange={(e) => editPast(p.year, { tier: e.target.value as Tier })} className="ui-field w-full px-3 py-2 min-h-[44px] text-sm">
                        {TIERS.map((k) => <option key={k} value={k}>{t(`past.tiers.${k}`, { cap: man(p.rule.cap), capM: mil(p.rule.cap) })}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-baseline justify-between gap-2 mt-3">
                    <p className="text-xs text-muted">{t('past.rule', { rate: pct(tierRate(p.rule, p.tier)), limit: man(p.rule.limit), limitM: mil(p.rule.limit) })}</p>
                    <p className="font-bold text-fg tabular-nums">{t('past.amount', { amount: won(p.max) })}</p>
                  </div>
                </li>
              ))}
            </ul>
            <div className="flex items-baseline justify-between gap-3 border-t border-line pt-4" aria-live="polite">
              <p className="font-semibold text-fg">{t('past.total')}</p>
              <p className="text-2xl font-bold text-primary tabular-nums">{won(pastTotal)}{W}</p>
            </div>
            <p className="text-xs text-muted">{t('past.totalNote', { rent: won(rent) })}</p>
            {past.unverified.length > 0 && <p className="text-xs text-muted">{t('past.unverified', { years: past.unverified.join(', ') })}</p>}
            <p className="text-xs text-muted">{t('past.deadlineNote')}</p>

            <div className="overflow-x-auto">
              <table className="w-full text-sm tabular-nums">
                <caption className="text-left text-sm font-semibold text-fg pb-2">{t('rules.caption')}</caption>
                <thead>
                  <tr className="border-b border-line text-muted">
                    <th scope="col" className="text-left font-medium py-2 pr-2">{t('rules.year')}</th>
                    <th scope="col" className="text-right font-medium py-2 px-2">{t('rules.rate')}</th>
                    <th scope="col" className="text-right font-medium py-2 px-2">{t('rules.cap')}</th>
                    <th scope="col" className="text-right font-medium py-2 px-2">{t('rules.limit')}</th>
                    <th scope="col" className="text-right font-medium py-2 pl-2">{t('rules.home')}</th>
                  </tr>
                </thead>
                <tbody>
                  {RULE_YEARS.map((y) => {
                    const r = RENT_RULES[y]
                    return (
                      <tr key={y} className="border-b border-line">
                        <th scope="row" className="text-left font-medium py-3 pr-2 text-body">{y}</th>
                        <td className="text-right py-3 px-2 text-sub">{pct(r.rate55)}% / {pct(r.rate)}%</td>
                        <td className="text-right py-3 px-2 text-sub">{t('manUnit', { n: man(r.cap), m: mil(r.cap) })}</td>
                        <td className="text-right py-3 px-2 text-sub">{t('manUnit', { n: man(r.limit), m: mil(r.limit) })}</td>
                        <td className="text-right py-3 pl-2 text-sub">{t('manUnit', { n: man(r.homeValue), m: mil(r.homeValue) })}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            <ul className="list-disc pl-5 space-y-1 text-xs text-muted">
              {(t.raw('rules.notes') as string[]).map((x, i) => <li key={i}>{x}</li>)}
            </ul>
          </div>

          {/* 가이드 */}
          {(['docs', 'claim', 'cash', 'youth', 'changes'] as const).map((g) => (
            <div key={g} className="ui-card p-6 space-y-3">
              <h2 className="text-lg font-semibold text-fg">{t(`guide.${g}.title`)}</h2>
              <ul className="list-disc pl-5 space-y-1.5 text-sm text-sub">
                {(t.raw(`guide.${g}.items`) as string[]).map((x, i) => <li key={i}>{x}</li>)}
              </ul>
            </div>
          ))}

          <div className="ui-card p-6 space-y-3">
            <h2 className="text-lg font-semibold text-fg">{t('links.title')}</h2>
            <div className="flex flex-wrap gap-2">
              <Link href={yearEndLink} className="ui-btn-soft px-4 py-2 min-h-[44px] inline-flex items-center rounded-xl text-sm">{t('links.yearEnd')}</Link>
              {LINKS.map((k) => (
                <Link key={k} href={LINK_HREF[k]} className="ui-btn-soft px-4 py-2 min-h-[44px] inline-flex items-center rounded-xl text-sm">{t(`links.${k}`)}</Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
