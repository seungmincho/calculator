'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { useTranslations } from '@/lib/i18n'
import '@/lib/i18n/ns/prepaymentFee'
import { useSearchParams } from '@/hooks/useSearchParams'
import { useHydrated } from '@/hooks/useHydrated'
import ShareResult from '@/components/ShareResult'
import MobileResultLink from '@/components/MobileResultLink'
import { todayKST, addYears, addMonths, daysBetween, isValidDate, ymd } from '@/utils/dday'
import type { Method } from '@/utils/loanSchedule'
import { LOAN_KINDS, PRESETS, presetRate, prepaymentFee, prepayEffect, refinance, stampTax, REFORM_DATE, FEE_DAYS, type LoanKind } from '@/utils/prepaymentFee'

// 계산은 prepaymentFee.ts(수수료·인지세) → loanSchedule.ts schedule()(이자).
// URL(기본값과 다를 때만): k 종류 · ld 실행일 · rd 갚을 날 · b 잔액 · r 금리 · y 남은 기간(년) · mt 상환방식 · f 수수료율
//   · a 갚을 금액 · fr 면제 금액 · nr 새 금리 · ny 새 기간(년) · c 기타 비용
const METHODS: Method[] = ['equalPayment', 'equalPrincipal', 'bullet']
const BANK = LOAN_KINDS.filter((k) => PRESETS[k].before !== undefined)
const POLICY = LOAN_KINDS.filter((k) => PRESETS[k].before === undefined)
const AMOUNT_PRESETS = [10_000_000, 30_000_000, 50_000_000, 100_000_000]
const WHEN_MONTHS = [3, 6, 12, 24]
const MAX = 10_000_000_000
const NEXT = { schedule: '/loan-schedule/', loan: '/loan-calculator/', dsr: '/dsr-calculator/', bogeumjari: '/bogeumjari-loan/' } as const

interface S {
  kind: LoanKind; start: string | null; repay: string | null; balance: number; rate: number; years: number; method: Method
  feeRate: number | null; amount: number; free: number; newRate: number; newYears: number | null; costs: number
}
// 실행일 기본 = 오늘부터 1년 전, 갚을 날 기본 = 오늘 (null)
const DEF: S = {
  kind: 'mortgageFixed', start: null, repay: null, balance: 300_000_000, rate: 4.3, years: 29, method: 'equalPayment',
  feeRate: null, amount: 100_000_000, free: 0, newRate: 3.8, newYears: null, costs: 0,
}

const won = (n: number) => Math.round(n).toLocaleString('ko-KR')
const man = (n: number) => (n / 10_000).toLocaleString('ko-KR', { maximumFractionDigits: 0 })
const mil = (n: number) => (n / 1_000_000).toLocaleString('en-US', { maximumFractionDigits: 2 })
const dot = (d: string) => d.replace(/-/g, '.')
const digits = (s: string) => s.replace(/[^\d]/g, '')
const money = (v: string | null) => (v && /^\d{1,11}$/.test(v) ? Number(v) : null)
const pct = (v: string | null) => { const n = v === null || v === '' ? NaN : Number(v); return Number.isFinite(n) && n >= 0 && n <= 30 ? n : null }
const yrs = (v: string | null) => { const n = Number(v); return v && Number.isInteger(n) && n >= 1 && n <= 50 ? n : null }
const date = (v: string | null) => (isValidDate(v) ? v : null)

function decode(sp: URLSearchParams): S {
  const kind = sp.get('k') as LoanKind
  const mt = sp.get('mt') as Method
  return {
    kind: LOAN_KINDS.includes(kind) ? kind : DEF.kind,
    start: date(sp.get('ld')), repay: date(sp.get('rd')),
    balance: money(sp.get('b')) ?? DEF.balance, rate: pct(sp.get('r')) ?? DEF.rate, years: yrs(sp.get('y')) ?? DEF.years,
    method: METHODS.includes(mt) ? mt : DEF.method, feeRate: pct(sp.get('f')),
    amount: money(sp.get('a')) ?? DEF.amount, free: money(sp.get('fr')) ?? DEF.free,
    newRate: pct(sp.get('nr')) ?? DEF.newRate, newYears: yrs(sp.get('ny')), costs: money(sp.get('c')) ?? DEF.costs,
  }
}

function encode(s: S): string {
  const q = new URLSearchParams()
  const put = (k: string, v: unknown, d: unknown) => { if (v !== null && v !== d) q.set(k, String(v)) }
  put('k', s.kind, DEF.kind); put('ld', s.start, null); put('rd', s.repay, null)
  put('b', s.balance, DEF.balance); put('r', s.rate, DEF.rate); put('y', s.years, DEF.years); put('mt', s.method, DEF.method)
  put('f', s.feeRate, null); put('a', s.amount, DEF.amount); put('fr', s.free, DEF.free)
  put('nr', s.newRate, DEF.newRate); put('ny', s.newYears, null); put('c', s.costs, DEF.costs)
  return q.toString()
}

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

function NumInput({ id, label, value, onChange, unit, step, max }: { id: string; label: string; value: number; onChange: (n: number) => void; unit: string; step: number; max: number }) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-body mb-2">{label}</label>
      <div className="relative">
        <input
          id={id} type="number" inputMode="decimal" min={0} max={max} step={step} value={value}
          onChange={(e) => { const n = Number(e.target.value); onChange(Number.isFinite(n) ? Math.min(Math.max(0, n), max) : 0) }}
          className="ui-field w-full px-4 py-3 pr-12 tabular-nums"
        />
        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-muted">{unit}</span>
      </div>
    </div>
  )
}

export default function PrepaymentFeeCalculator({ buildDate }: { buildDate: string }) {
  const t = useTranslations('prepaymentFee')
  const sp = useSearchParams()
  const hydrated = useHydrated()
  // 하이드레이션 전에는 빌드 날짜·기본값 → 첫 렌더가 정적 HTML과 같다. 사용자가 고치면 그 값이 우선
  const today = hydrated ? todayKST() : buildDate
  const fromUrl = useMemo(() => (hydrated ? decode(sp) : DEF), [hydrated, sp])
  const [edited, setEdited] = useState<S | null>(null)
  const s = edited ?? fromUrl
  const set = (patch: Partial<S>) => {
    const next = { ...s, ...patch }
    setEdited(next)
    const q = encode(next)
    window.history.replaceState(window.history.state, '', q ? `?${q}` : window.location.pathname)
  }

  // ── 계산 ──
  const start = s.start ?? addYears(today, -1)
  const repay = s.repay ?? today
  const months = s.years * 12
  const newMonths = (s.newYears ?? s.years) * 12
  const feeRate = s.feeRate ?? presetRate(s.kind, start)
  const waivedUntil = PRESETS[s.kind].waivedUntil
  const termDays = months > 0 ? daysBetween(start, addMonths(repay, months)) : undefined
  const feeIn = { rate: feeRate, start, termDays, free: s.free, waivedUntil }
  const amount = s.balance > 0 ? Math.min(s.amount, s.balance) : s.amount
  const f = prepaymentFee({ ...feeIn, amount, repay })
  const loan = { balance: s.balance, rate: s.rate, months, method: s.method }
  const valid = s.balance > 0 && months > 0 && newMonths > 0
  // ponytail: 매 렌더 schedule() 4번(최대 600회차) — 1ms 안팎이라 메모 없이
  const effect = valid && amount > 0 ? prepayEffect(loan, amount) : null
  const refiFee = prepaymentFee({ ...feeIn, amount: s.balance, repay })
  const stampTotal = stampTax(s.balance)
  const stamp = stampTotal / 2
  const wait = (() => {
    if (refiFee.status !== 'charged') return 0
    const g = ymd(repay, refiFee.freeDate)
    return g.totalMonths + (g.days > 0 ? 1 : 0)
  })()
  const refi = valid ? refinance(loan, s.newRate, newMonths, refiFee.fee, stamp + s.costs, wait) : null

  const whenRows = f.status === 'invalid' ? [] : [
    { label: t('when.now', { date: dot(repay) }), d: repay },
    ...WHEN_MONTHS.map((n) => ({ n, d: addMonths(repay, n) })).filter((x) => x.d < f.freeDate).map((x) => ({ label: t('when.after', { n: x.n, date: dot(x.d) }), d: x.d })),
    ...(f.left > 0 ? [{ label: t('when.free', { date: dot(f.freeDate) }), d: f.freeDate }] : []),
  ].map((x) => ({ ...x, r: prepaymentFee({ ...feeIn, amount, repay: x.d }) }))

  // ── 표시 ──
  const W = t('won')
  const rateHint = s.feeRate !== null ? t('loan.rateHint.custom')
    : s.kind === 'bogeumjari' || s.kind === 'didimdol' ? t(`loan.rateHint.${s.kind}`, { rate: feeRate })
      : t(start < REFORM_DATE ? 'loan.rateHint.before' : 'loan.rateHint.after', { rate: feeRate })
  const statusText = t(`result.status.${f.status}`, { elapsed: f.elapsed, left: f.left, freeDate: dot(f.freeDate) })
  const shareVars = { amount: t('manUnit', { n: man(amount), m: mil(amount) }), rate: feeRate, fee: won(f.fee), left: f.left }
  const card = {
    tool: t('title'),
    label: t('share.label', shareVars),
    headline: f.fee > 0 ? t('share.headline', shareVars) : t('share.headlineZero'),
    sub: statusText,
    rows: [
      { label: t('result.rows.chargeable'), value: `${won(f.chargeable)}${W}` },
      { label: t('result.rows.days'), value: t('result.daysValue', { left: f.left, base: f.base }) },
      { label: t('result.rows.freeDate'), value: dot(f.freeDate) },
      ...(refi ? [{ label: t('share.refi'), value: `${won(refi.net)}${W}` }] : []),
    ],
  }
  const row = (label: string, value: string, strong = false) => (
    <div className={`flex justify-between gap-3 ${strong ? 'border-t border-line pt-1.5' : ''}`}>
      <dt className={strong ? 'font-semibold text-fg' : 'text-sub'}>{label}</dt>
      <dd className={`tabular-nums ${strong ? 'font-bold text-primary' : 'text-fg'}`}>{value}</dd>
    </div>
  )

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
            <MobileResultLink href="#prepayment-fee-result" label={t('result.label')} value={`${won(f.fee)}${W}`} />
            <h2 className="text-sm font-semibold text-fg">{t('loan.title')}</h2>

            <div>
              <label htmlFor="pf-kind" className="block text-sm font-medium text-body mb-2">{t('loan.kind')}</label>
              <select id="pf-kind" value={s.kind} onChange={(e) => set({ kind: e.target.value as LoanKind, feeRate: null })} className="ui-field w-full px-4 py-3">
                <optgroup label={t('loan.groupBank')}>
                  {BANK.map((k) => <option key={k} value={k}>{t(`loan.kinds.${k}`)}</option>)}
                </optgroup>
                <optgroup label={t('loan.groupPolicy')}>
                  {POLICY.map((k) => <option key={k} value={k}>{t(`loan.kinds.${k}`)}</option>)}
                </optgroup>
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2 gap-4">
              <div>
                <label htmlFor="pf-start" className="block text-sm font-medium text-body mb-2">{t('loan.start')}</label>
                <input id="pf-start" type="date" value={start} max={repay} onChange={(e) => isValidDate(e.target.value) && set({ start: e.target.value })} className="ui-field w-full px-4 py-3" />
              </div>
              <div>
                <label htmlFor="pf-repay" className="block text-sm font-medium text-body mb-2">{t('loan.repay')}</label>
                <input id="pf-repay" type="date" value={repay} min={start} onChange={(e) => isValidDate(e.target.value) && set({ repay: e.target.value })} className="ui-field w-full px-4 py-3" />
              </div>
            </div>

            <MoneyInput id="pf-balance" label={t('loan.balance')} value={s.balance} unit={W} onChange={(n) => set({ balance: n })} />
            <div className="grid grid-cols-2 gap-4">
              <NumInput id="pf-rate" label={t('loan.rate')} value={s.rate} unit="%" step={0.01} max={30} onChange={(n) => set({ rate: n })} />
              <NumInput id="pf-years" label={t('loan.years')} value={s.years} unit={t('loan.yearsUnit')} step={1} max={50} onChange={(n) => set({ years: Math.round(n) })} />
            </div>
            <div>
              <label htmlFor="pf-method" className="block text-sm font-medium text-body mb-2">{t('loan.method')}</label>
              <select id="pf-method" value={s.method} onChange={(e) => set({ method: e.target.value as Method })} className="ui-field w-full px-4 py-3">
                {METHODS.map((m) => <option key={m} value={m}>{t(`loan.methods.${m}`)}</option>)}
              </select>
            </div>

            <div>
              <NumInput id="pf-fee-rate" label={t('loan.feeRate')} value={feeRate} unit="%" step={0.01} max={30} onChange={(n) => set({ feeRate: n })} />
              <p className="text-xs text-muted mt-1.5">
                {rateHint}
                {s.feeRate !== null && (
                  <> <button type="button" onClick={() => set({ feeRate: null })} className="text-primary font-medium hover:underline">{t('loan.reset')}</button></>
                )}
              </p>
            </div>

            <div className="border-t border-line pt-5 space-y-5">
              <h2 className="text-sm font-semibold text-fg">{t('pay.title')}</h2>
              <div>
                <MoneyInput id="pf-amount" label={t('pay.amount')} value={s.amount} unit={W} onChange={(n) => set({ amount: n })} />
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {[...AMOUNT_PRESETS, s.balance].map((n, i) => (
                    <button
                      key={i} type="button" onClick={() => set({ amount: n })} aria-pressed={s.amount === n}
                      className={`min-h-[44px] px-3 py-2 rounded-lg text-sm tabular-nums transition-colors ${s.amount === n ? 'bg-primary text-white' : 'bg-soft text-body hover:bg-subtle'}`}
                    >
                      {i === AMOUNT_PRESETS.length ? t('all') : t('manUnit', { n: man(n), m: mil(n) })}
                    </button>
                  ))}
                </div>
              </div>
              <MoneyInput id="pf-free" label={t('pay.free')} value={s.free} unit={W} hint={t('pay.freeHint')} onChange={(n) => set({ free: n })} />
            </div>
          </div>
        </div>

        {/* 결과 */}
        <div className="lg:col-span-2 space-y-6">
          <div id="prepayment-fee-result" className="ui-card p-6 space-y-5 scroll-mt-20">
            <div aria-live="polite">
              <p className="text-sm text-muted">{t('result.label')}</p>
              <p className="text-3xl font-bold text-fg tabular-nums mt-1">{won(f.fee)}{W}</p>
              <p className="text-sm text-sub mt-1">{statusText}</p>
              {f.status === 'charged' && (
                <p className="text-sm text-muted mt-1 tabular-nums">{t('result.formula', { amount: won(f.chargeable), rate: feeRate, left: f.left, base: f.base })}</p>
              )}
            </div>

            <dl className="space-y-1.5 text-sm">
              {row(t('result.rows.chargeable'), `${won(f.chargeable)}${W}`)}
              {row(t('result.rows.feeRate'), `${feeRate}%`)}
              {row(t('result.rows.days'), t('result.daysValue', { left: f.left, base: f.base }))}
              {row(t('result.rows.freeDate'), dot(f.freeDate))}
            </dl>
            {f.base < FEE_DAYS &&<p className="text-xs text-muted">{t('result.shortTerm', { base: f.base })}</p>}

            {effect && effect.saved > 0 && (
              <div className="rounded-2xl p-4 bg-subtle text-sm text-body space-y-1">
                <p>{t(s.method === 'bullet' ? 'result.effectBullet' : 'result.effect', { amount: won(effect.amount), saved: won(effect.saved), before: won(effect.payBefore), after: won(effect.payAfter) })}</p>
                {effect.saved > f.fee && <p className="font-medium text-fg">{t('result.effectNet', { net: won(effect.saved - f.fee) })}</p>}
                <p className="text-xs text-muted">
                  {t('result.detail')}{' '}
                  <Link href="/loan-schedule/" className="text-primary font-medium hover:underline">{t('result.detailLink')}</Link>
                </p>
              </div>
            )}

            <ShareResult card={card} text={t('share.text', shareVars)} fileName="prepayment-fee" />
          </div>

          {whenRows.length > 1 && (
            <section aria-labelledby="pf-when" className="ui-card p-6 space-y-4">
              <div>
                <h2 id="pf-when" className="text-lg font-semibold text-fg">{t('when.title')}</h2>
                <p className="text-sm text-muted mt-1">{t('when.desc')}</p>
              </div>
              <div className="relative overflow-x-auto">
                <table className="w-full text-sm tabular-nums">
                  <caption className="sr-only">{t('when.title')}</caption>
                  <thead>
                    <tr className="border-b border-line text-muted">
                      <th scope="col" className="text-left font-medium py-2 pr-2">{t('when.cols.date')}</th>
                      <th scope="col" className="text-right font-medium py-2 px-2">{t('when.cols.left')}</th>
                      <th scope="col" className="text-right font-medium py-2 pl-2">{t('when.cols.fee')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {whenRows.map((x) => (
                      <tr key={x.d} className="border-b border-line">
                        <th scope="row" className="text-left font-medium py-3 pr-2 text-body">{x.label}</th>
                        <td className="text-right py-3 px-2 text-sub">{x.r.left}</td>
                        <td className="text-right py-3 pl-2 text-fg">{won(x.r.fee)}{W}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {/* 갈아타기 */}
          <section aria-labelledby="pf-refi" className="ui-card p-6 space-y-5">
            <div>
              <h2 id="pf-refi" className="text-lg font-semibold text-fg">{t('refi.title')}</h2>
              <p className="text-sm text-muted mt-1">{t('refi.desc')}</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <NumInput id="pf-new-rate" label={t('refi.newRate')} value={s.newRate} unit="%" step={0.01} max={30} onChange={(n) => set({ newRate: n })} />
              <NumInput id="pf-new-years" label={t('refi.newYears')} value={s.newYears ?? s.years} unit={t('loan.yearsUnit')} step={1} max={50} onChange={(n) => set({ newYears: Math.round(n) })} />
              <MoneyInput id="pf-costs" label={t('refi.costs')} value={s.costs} unit={W} onChange={(n) => set({ costs: n })} />
            </div>
            <p className="text-xs text-muted">{t('refi.costsHint')}</p>

            {refi && (
              <div aria-live="polite" className="space-y-4">
                <div>
                  <p className="text-sm text-muted">{refi.net >= 0 ? t('refi.gain') : t('refi.loss')}</p>
                  <p className="text-2xl font-bold text-fg tabular-nums mt-1">{won(Math.abs(refi.net))}{W}</p>
                  <p className="text-sm text-sub mt-1">
                    {refi.breakEven !== null ? t('refi.breakEven', { n: refi.breakEven }) : t('refi.noBreakEven')}
                    {' '}{t('refi.pay', { cur: won(refi.payCur), next: won(refi.payNew) })}
                  </p>
                </div>
                <dl className="space-y-1.5 text-sm">
                  {row(t('refi.rows.curInterest'), `${won(refi.curInterest)}${W}`)}
                  {row(t('refi.rows.newInterest'), `${won(refi.newInterest)}${W}`)}
                  {row(t('refi.rows.saving'), `${won(refi.saving)}${W}`)}
                  {row(t('refi.rows.fee'), `−${won(refiFee.fee)}${W}`)}
                  {row(t('refi.rows.stamp'), `−${won(stamp)}${W}`)}
                  {s.costs > 0 && row(t('refi.rows.costs'), `−${won(s.costs)}${W}`)}
                  {row(t('refi.rows.net'), `${won(refi.net)}${W}`, true)}
                </dl>
                <p className="text-xs text-muted">{t('refi.stampNote', { amount: won(s.balance), total: won(stampTotal) })}</p>
                {newMonths > months && <p className="text-sm text-sub">{t('refi.longer')}</p>}

                {refi.waitNet !== null && (
                  <div className="rounded-2xl p-4 bg-subtle text-sm space-y-2">
                    <p className="font-semibold text-fg">{t('refi.wait.title')}</p>
                    <dl className="space-y-1.5">
                      {row(t('refi.wait.now'), `${won(refi.net)}${W}`)}
                      {row(t('refi.wait.later', { date: dot(refiFee.freeDate), n: wait }), `${won(refi.waitNet)}${W}`)}
                    </dl>
                    <p className="text-body">
                      {refi.net >= refi.waitNet ? t('refi.wait.nowBetter', { diff: won(refi.net - refi.waitNet) }) : t('refi.wait.laterBetter', { diff: won(refi.waitNet - refi.net) })}
                    </p>
                    <p className="text-xs text-muted">{t('refi.wait.note')}</p>
                  </div>
                )}
                <p className="text-xs text-muted">{t('refi.note')}</p>
              </div>
            )}
          </section>
        </div>
      </div>

      {/* 요율표 */}
      <section aria-labelledby="pf-rates" className="ui-card p-6 space-y-4">
        <div>
          <h2 id="pf-rates" className="text-lg font-semibold text-fg">{t('rates.title')}</h2>
          <p className="text-sm text-muted mt-1">{t('rates.desc')}</p>
        </div>
        <div className="relative overflow-x-auto">
          <table className="w-full text-sm tabular-nums">
            <caption className="sr-only">{t('rates.title')}</caption>
            <thead>
              <tr className="border-b border-line text-muted">
                <th scope="col" className="text-left font-medium py-2 pr-2">{t('rates.cols.kind')}</th>
                <th scope="col" className="text-right font-medium py-2 px-2">{t('rates.cols.before')}</th>
                <th scope="col" className="text-right font-medium py-2 pl-2">{t('rates.cols.after')}</th>
              </tr>
            </thead>
            <tbody>
              {LOAN_KINDS.map((k) => {
                const p = PRESETS[k]
                return (
                  <tr key={k} className={`border-b border-line ${k === s.kind ? 'bg-primary-soft' : ''}`}>
                    <th scope="row" className={`text-left font-medium py-3 pr-2 ${k === s.kind ? 'text-primary' : 'text-body'}`}>{t(`loan.kinds.${k}`)}</th>
                    <td className="text-right py-3 px-2 text-sub">{p.before !== undefined ? `${p.before}%` : t('rates.none')}</td>
                    <td className="text-right py-3 pl-2 text-fg">{p.before !== undefined ? `${p.after}%` : t('rates.cap', { rate: p.after })}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section aria-labelledby="pf-tips" className="ui-card p-6 space-y-3">
        <h2 id="pf-tips" className="text-lg font-semibold text-fg">{t('tips.title')}</h2>
        <ul className="list-disc pl-5 space-y-1.5 text-sm text-sub">
          {(t.raw('tips.items') as string[]).map((x, i) => <li key={i}>{x}</li>)}
        </ul>
      </section>

      <section aria-labelledby="pf-next" className="ui-card p-6 space-y-3">
        <h2 id="pf-next" className="text-lg font-semibold text-fg">{t('next.title')}</h2>
        <ul className="grid gap-2 sm:grid-cols-2">
          {(Object.keys(NEXT) as (keyof typeof NEXT)[]).map((k) => (
            <li key={k}>
              <Link href={NEXT[k]} className="block rounded-2xl p-4 bg-subtle hover:bg-soft transition-colors min-h-[44px]">
                <span className="block text-sm font-semibold text-fg">{t(`next.${k}.title`)}</span>
                <span className="block text-xs text-muted mt-1">{t(`next.${k}.desc`)}</span>
              </Link>
            </li>
          ))}
        </ul>
        <p className="text-xs text-muted">{t('source')}</p>
      </section>
    </div>
  )
}
