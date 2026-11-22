'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useTranslations } from '@/lib/i18n'
import '@/lib/i18n/ns/studentLoanRepayment'
import { useSearchParams } from '@/hooks/useSearchParams'
import { useHydrated } from '@/hooks/useHydrated'
import ShareResult from '@/components/ShareResult'
import MobileResultLink from '@/components/MobileResultLink'
import { earnedIncomeDeduction } from '@/utils/yearEndTax'
import {
  CHECKED, DEFAULT, MAN, MAX_YEARS, RANGES, REPAY_RATE, SOURCES,
  clean, parseState, payoffAt, simulateGen, simulateIcl, toQuery,
  type Kind, type Plan, type State, type YearRow,
} from '@/utils/studentLoanRepayment'

type NumKey = keyof typeof RANGES
const GUIDE = ['howTo', 'method', 'tips'] as const
const SOURCE_KEYS = ['act', 'decree', 'nts', 'plan1', 'plan2', 'kosaf'] as const
const YEARS = Array.from({ length: RANGES.y[1] - RANGES.y[0] + 1 }, (_, i) => RANGES.y[0] + i)

const num = (n: number) => Math.round(n).toLocaleString('ko-KR')
const fmt1 = (n: number) => (Math.round(n * 10) / 10).toLocaleString('ko-KR', { maximumFractionDigits: 1 })
const seg = (on: boolean) => `min-h-11 px-3 py-2 rounded-xl text-sm font-medium transition-colors ${on ? 'bg-primary text-white' : 'bg-soft text-body hover:bg-subtle'}`
const labelCls = 'block text-sm font-medium text-body mb-1.5'
const hintCls = 'mt-1.5 text-xs text-muted'
const errCls = 'mt-1.5 rounded-lg bg-amber-50 px-2 py-1 text-xs text-amber-800'
const unitCls = 'absolute right-4 top-1/2 -translate-y-1/2 text-sm text-muted pointer-events-none'
const statCls = 'bg-subtle rounded-2xl px-4 py-3 min-w-0'
const linkCls = 'text-primary hover:underline'

function NumField({ id, k, label, unit, value, hint, err, onCommit }: {
  id: string; k: NumKey; label: string; unit: string; value: number; hint?: string; err: string; onCommit: (v: number) => void
}) {
  const [draft, setDraft] = useState<string | null>(null)
  const text = draft ?? String(value)
  const ok = (s: string) => s.trim() !== '' && clean(k, Number(s)) !== null
  const bad = !ok(text)
  return (
    <div>
      <label htmlFor={id} className={labelCls}>{label}</label>
      <div className="relative">
        <input
          id={id} inputMode={RANGES[k][0] < 0 ? 'text' : 'decimal'} autoComplete="off" value={text}
          onChange={(e) => {
            const v = e.target.value.replace(/[^\d.-]/g, '').slice(0, 8)
            setDraft(v)
            if (ok(v)) onCommit(clean(k, Number(v))!)
          }}
          onBlur={() => setDraft(null)}
          aria-invalid={bad || undefined} aria-describedby={`${id}-hint`}
          className="ui-field w-full min-h-11 px-4 py-3 pr-16 text-base tabular-nums"
        />
        <span className={unitCls}>{unit}</span>
      </div>
      <p id={`${id}-hint`} className={bad ? errCls : hintCls}>{bad ? err : hint}</p>
    </div>
  )
}

/** 연말 잔액 막대 */
function BalanceBars({ rows, start, label }: { rows: YearRow[]; start: number; label: string }) {
  const max = Math.max(start, ...rows.map((r) => r.balance), 1)
  return (
    <figure className="space-y-2">
      <div role="img" aria-label={label} className="flex items-end gap-px h-32 border-b border-line">
        {rows.map((r) => (
          <div key={r.year} title={`${r.year} · ${num(r.balance)}`} className="flex-1 min-w-0 bg-primary rounded-t-sm" style={{ height: `${Math.max((r.balance / max) * 100, r.balance > 0 ? 2 : 0)}%` }} />
        ))}
      </div>
      {rows.length > 0 && (
        <figcaption className="flex justify-between text-xs text-muted tabular-nums">
          <span>{rows[0].year}</span><span>{rows[rows.length - 1].year}</span>
        </figcaption>
      )}
    </figure>
  )
}

export default function StudentLoanRepayment() {
  const t = useTranslations('studentLoanRepayment')
  const sp = useSearchParams()
  const hydrated = useHydrated()

  // URL → 값. 하이드레이션 전에는 기본값이라 첫 렌더가 정적 HTML 과 같다. 고치면 그 값이 우선, URL 은 기본값과 다른 것만
  const fromUrl = useMemo(() => (hydrated ? parseState((k) => sp.get(k)) : DEFAULT), [hydrated, sp])
  const [edited, setEdited] = useState<State | null>(null)
  const s = edited ?? fromUrl
  const commit = (patch: Partial<State>) => {
    const next = { ...s, ...patch }
    setEdited(next)
    const qs = toQuery(next)
    window.history.replaceState(window.history.state, '', `${window.location.pathname}${qs ? `?${qs}` : ''}${window.location.hash}`)
  }

  const icl = useMemo(() => simulateIcl(s), [s])
  const gen = useMemo(() => simulateGen(s), [s])
  const extraWon = s.x * MAN
  const withExtra = useMemo(() => (s.k === 'icl' ? simulateIcl(s, extraWon) : simulateGen(s, extraWon)), [s, extraWon])

  const won = (n: number) => t('won', { v: num(n) })
  const man = (n: number) => t('man', { v: fmt1(n / MAN), k: num(n / 1000) })
  const when = (p: Plan<YearRow>) => {
    if (p.months === null) return t('result.never', { n: MAX_YEARS })
    if (p.months === 0) return t('result.none')
    const at = payoffAt(s.y, p.months)
    return t('result.at', { y: at.year, m: at.month })
  }
  const dur = (months: number) => {
    const y = Math.floor(months / 12), m = months % 12
    return y && m ? t('dur.ym', { y, m }) : y ? t('dur.y', { y }) : t('dur.m', { m })
  }
  const payoffYear = (p: Plan<YearRow>) => (p.months ? payoffAt(s.y, p.months).year : null)

  const first = icl.rows[0]
  const firstDue = icl.rows.find((r) => r.due > 0) ?? null
  const rateLabel = Math.round((s.u ? REPAY_RATE.grad : REPAY_RATE.ug) * 100)
  const iclMonthly = first ? first.due / 12 : 0
  const nothing = s.b === 0

  const plan: Plan<YearRow> = s.k === 'icl' ? icl : gen
  const kindName = t(`input.kinds.${s.k}`)
  const mainValue = s.k === 'icl' ? won(iclMonthly) : won(gen.payment)
  const resultLabel = s.k === 'icl' ? t('result.iclLabel', { y: s.y }) : t('result.genLabel')

  // 공유: '취업 후 상환 · 월 약 n만 원 · 20xx년 완납'
  const monthlyShort = s.k === 'icl'
    ? (firstDue ? t('share.monthly', { v: man(firstDue.due / 12) }) : t('share.noDue'))
    : t('share.monthly', { v: man(gen.payment) })
  const py = payoffYear(plan)
  const headline = [kindName, monthlyShort, py ? t('share.payoff', { y: py }) : t('share.never', { n: MAX_YEARS })].join(' · ')

  const other: Kind = s.k === 'icl' ? 'gen' : 'icl'
  const otherPlan = s.k === 'icl' ? gen : icl
  const diff = icl.totalInterest - gen.totalInterest
  const compareKey = icl.months === null ? 'iclNever' : Math.abs(diff) < 1000 ? 'same' : diff > 0 ? 'genLess' : 'iclLess'
  const saved = plan.months !== null && withExtra.months !== null ? plan.months - withExtra.months : null

  const faq = t.raw('guide.faq.items') as { q: string; a: string }[]
  const err = (k: NumKey) => t('input.err', { min: RANGES[k][0], max: RANGES[k][1] })

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-fg">{t('title')}</h1>
        <p className="text-sm text-muted mt-1">{t('subtitle')}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* 입력 */}
        <section className="ui-card p-6 space-y-6 min-w-0" aria-labelledby="slr-input">
          <MobileResultLink href="#student-loan-repayment-result" label={resultLabel} value={mainValue} />
          <h2 id="slr-input" className="text-lg font-semibold text-fg">{t('input.title')}</h2>

          <div>
            <p id="slr-kind" className={labelCls}>{t('input.kind')}</p>
            <div role="group" aria-labelledby="slr-kind" className="grid grid-cols-2 gap-2">
              {(['icl', 'gen'] as const).map((k) => (
                <button key={k} type="button" aria-pressed={s.k === k} onClick={() => commit({ k })} className={seg(s.k === k)}>{t(`input.kinds.${k}`)}</button>
              ))}
            </div>
            <p className={hintCls}>{t(`input.kindHint.${s.k}`)}</p>
          </div>

          <NumField id="slr-b" k="b" label={t('input.balance')} unit={t('input.unitMan')} value={s.b} hint={t('input.balanceHint')} err={err('b')} onCommit={(b) => commit({ b })} />
          <NumField id="slr-r" k="r" label={t('input.rate')} unit="%" value={s.r} hint={t(`input.rateHint.${s.k}`)} err={err('r')} onCommit={(r) => commit({ r })} />
          <NumField id="slr-s" k="s" label={t('input.salary')} unit={t('input.unitMan')} value={s.s} hint={t('input.salaryHint')} err={err('s')} onCommit={(v) => commit({ s: v })} />
          <NumField id="slr-n" k="n" label={t('input.nontax')} unit={t('input.unitMan')} value={s.n} hint={t('input.nontaxHint')} err={err('n')} onCommit={(n) => commit({ n })} />

          <div>
            <label htmlFor="slr-y" className={labelCls}>{t('input.start')}</label>
            <select id="slr-y" value={s.y} onChange={(e) => commit({ y: Number(e.target.value) })} aria-describedby="slr-y-hint"
              className="ui-field w-full min-h-11 px-3 py-3 text-base tabular-nums">
              {YEARS.map((y) => <option key={y} value={y}>{t('input.yearOpt', { y })}</option>)}
            </select>
            <p id="slr-y-hint" className={hintCls}>{t(`input.startHint.${s.k}`)}</p>
          </div>

          {s.k === 'icl' ? (
            <>
              <div>
                <p id="slr-u" className={labelCls}>{t('input.degree')}</p>
                <div role="group" aria-labelledby="slr-u" className="grid grid-cols-2 gap-2">
                  {([false, true] as const).map((u) => (
                    <button key={String(u)} type="button" aria-pressed={s.u === u} onClick={() => commit({ u })} className={seg(s.u === u)}>{t(`input.degrees.${u ? 'grad' : 'ug'}`)}</button>
                  ))}
                </div>
                <p className={hintCls}>{t('input.degreeHint')}</p>
              </div>
              <div>
                <label className="flex min-h-11 items-center gap-3 text-sm font-medium text-body cursor-pointer">
                  <input type="checkbox" checked={s.f} onChange={(e) => commit({ f: e.target.checked })} className="h-5 w-5 accent-primary" aria-describedby="slr-f-hint" />
                  {t('input.free')}
                </label>
                <p id="slr-f-hint" className={hintCls}>
                  {t('input.freeHint')}{' '}
                  <Link href="/national-scholarship" className={linkCls}>{t('input.freeLink')}</Link>
                </p>
              </div>
            </>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="slr-d" className={labelCls}>{t('input.defer')}</label>
                <select id="slr-d" value={s.d} onChange={(e) => commit({ d: Number(e.target.value) })} className="ui-field w-full min-h-11 px-3 py-3 text-base tabular-nums">
                  {Array.from({ length: RANGES.d[1] + 1 }, (_, n) => <option key={n} value={n}>{t('input.yearsOpt', { n })}</option>)}
                </select>
              </div>
              <div>
                <label htmlFor="slr-m" className={labelCls}>{t('input.term')}</label>
                <select id="slr-m" value={s.m} onChange={(e) => commit({ m: Number(e.target.value) })} className="ui-field w-full min-h-11 px-3 py-3 text-base tabular-nums">
                  {Array.from({ length: RANGES.m[1] }, (_, i) => <option key={i + 1} value={i + 1}>{t('input.yearsOpt', { n: i + 1 })}</option>)}
                </select>
              </div>
              <p className="col-span-2 -mt-1 text-xs text-muted">{t('input.genHint')}</p>
            </div>
          )}

          <fieldset className="space-y-4 border-t border-line pt-5">
            <legend className="text-sm font-semibold text-fg">{t('input.assume')}</legend>
            <NumField id="slr-g" k="g" label={t('input.growth')} unit="%" value={s.g} hint={t('input.growthHint')} err={err('g')} onCommit={(g) => commit({ g })} />
            <NumField id="slr-h" k="h" label={t('input.thrGrowth')} unit="%" value={s.h} hint={t('input.thrGrowthHint')} err={err('h')} onCommit={(h) => commit({ h })} />
          </fieldset>
        </section>

        {/* 결과 */}
        <div className="lg:col-span-2 min-w-0 space-y-4">
          <section id="student-loan-repayment-result" className="ui-card p-6 space-y-5 scroll-mt-20 min-w-0" aria-labelledby="slr-result-label">
            <div aria-live="polite">
              <p id="slr-result-label" className="text-sm text-sub">{resultLabel}</p>
              {nothing ? (
                <p className="mt-2 text-base text-body">{t('result.none')}</p>
              ) : s.k === 'icl' && first ? (
                <>
                  <p className="mt-1 text-3xl font-bold text-fg tabular-nums">{won(iclMonthly)}</p>
                  {first.due > 0 ? (
                    <p className="mt-1 text-sm text-body tabular-nums">{t('result.iclAnnual', { v: won(first.due), y: s.y + 1, y2: s.y + 2 })}</p>
                  ) : (
                    <div className="mt-2 space-y-1 text-sm text-body">
                      <p>{t('result.zeroWhy', { y: s.y, gross: won(first.gross), thr: won(first.thrGross) })}</p>
                      <p>{firstDue ? t('result.firstDue', { y: firstDue.year, v: won(firstDue.due / 12) }) : t('result.noDue', { n: MAX_YEARS })}</p>
                    </div>
                  )}
                  {first.min && first.due > 0 && <p className="mt-1 text-xs text-muted">{t('result.minApplied', { raw: won(first.raw) })}</p>}
                </>
              ) : (
                <>
                  <p className="mt-1 text-3xl font-bold text-fg tabular-nums">{won(gen.payment)}</p>
                  <p className="mt-1 text-sm text-body tabular-nums">
                    {t('result.genSub', { y: s.y + s.d, m: s.m })}
                    {s.d > 0 && ` · ${t('result.genGrace', { d: s.d, v: won(gen.graceInterest) })}`}
                  </p>
                </>
              )}
            </div>

            {!nothing && (
              <>
                {s.k === 'icl' && first && (
                  <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {[
                      ['gross', won(first.gross), t('result.bd.grossVal', { salary: won(first.salary), nt: won(first.salary - first.gross) })],
                      ['income', won(first.income), t('result.bd.incomeVal', { ded: won(earnedIncomeDeduction(first.gross)) })],
                      ['thr', won(first.thrIncome), t('result.bd.thrVal', { thr: won(first.thrGross), basis: t(`basis.${first.basis}`) })],
                      ['excess', won(Math.max(0, first.income - first.thrIncome)), t('result.bd.excessVal', { rate: rateLabel })],
                    ].map(([k, v, sub]) => (
                      <div key={k} className={statCls}>
                        <dt className="text-xs text-sub">{t(`result.bd.${k}`)}</dt>
                        <dd className="mt-0.5 text-base font-semibold text-fg tabular-nums">{v}</dd>
                        <dd className="text-xs text-muted tabular-nums [overflow-wrap:anywhere]">{sub}</dd>
                      </div>
                    ))}
                  </dl>
                )}

                <dl className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {[
                    ['payoff', when(plan)],
                    ['totalInterest', won(plan.totalInterest)],
                    ['totalPaid', won(plan.totalPaid)],
                  ].map(([k, v]) => (
                    <div key={k} className={statCls}>
                      <dt className="text-xs text-sub">{t(`result.${k}`)}</dt>
                      <dd className="mt-0.5 text-base font-semibold text-fg tabular-nums">{v}</dd>
                    </div>
                  ))}
                </dl>
                {s.k === 'icl' && icl.months === null && <p className="bg-amber-50 text-amber-800 rounded-2xl px-4 py-3 text-sm">{t('result.neverWarn', { n: MAX_YEARS })}</p>}

                <div className="space-y-2">
                  <h3 className="text-sm font-semibold text-fg">{t('chart.title')}</h3>
                  <BalanceBars rows={plan.rows} start={s.b * MAN}
                    label={t('chart.aria', { y0: s.y, v0: won(s.b * MAN), y1: plan.rows[plan.rows.length - 1]?.year ?? s.y, v1: won(plan.rows[plan.rows.length - 1]?.balance ?? 0) })} />
                </div>

                <details className="rounded-2xl bg-subtle" open>
                  <summary className="cursor-pointer min-h-11 flex items-center px-4 text-sm font-medium text-body">{t('table.title')}</summary>
                  <div className="overflow-x-auto px-4 pb-4">
                    {s.k === 'icl' ? (
                      <table className="w-full min-w-[44rem] text-sm tabular-nums">
                        <caption className="sr-only">{t('table.caption', { kind: kindName })}</caption>
                        <thead>
                          <tr className="border-b border-line text-left text-sub">
                            {(['year', 'salary', 'income', 'thr', 'due', 'interest', 'paid', 'balance'] as const).map((c) => (
                              <th key={c} scope="col" className="py-2 pr-3 font-medium whitespace-nowrap">{t(`table.icl.${c}`)}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {icl.rows.map((r) => (
                            <tr key={r.year} className="border-b border-line text-body">
                              <th scope="row" className="py-2 pr-3 font-medium text-left whitespace-nowrap">{r.year}</th>
                              <td className="py-2 pr-3 whitespace-nowrap">{num(r.salary)}</td>
                              <td className="py-2 pr-3 whitespace-nowrap">{num(r.income)}</td>
                              <td className="py-2 pr-3 whitespace-nowrap">{num(r.thrIncome)}{r.basis !== 'official' && <span className="ml-1 text-xs text-muted">{t(`basis.${r.basis}`)}</span>}</td>
                              <td className="py-2 pr-3 whitespace-nowrap font-semibold text-fg">{num(r.due)}{r.min && r.due > 0 && <span className="ml-1 text-xs font-normal text-muted">{t('table.min')}</span>}</td>
                              <td className="py-2 pr-3 whitespace-nowrap">{num(r.interest)}</td>
                              <td className="py-2 pr-3 whitespace-nowrap">{num(r.paid)}</td>
                              <td className="py-2 pr-3 whitespace-nowrap">{num(r.balance)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : (
                      <table className="w-full min-w-[28rem] text-sm tabular-nums">
                        <caption className="sr-only">{t('table.caption', { kind: kindName })}</caption>
                        <thead>
                          <tr className="border-b border-line text-left text-sub">
                            {(['year', 'interest', 'principal', 'paid', 'balance'] as const).map((c) => (
                              <th key={c} scope="col" className="py-2 pr-3 font-medium whitespace-nowrap">{t(`table.gen.${c}`)}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {gen.rows.map((r) => (
                            <tr key={r.year} className="border-b border-line text-body">
                              <th scope="row" className="py-2 pr-3 font-medium text-left whitespace-nowrap">{r.year}</th>
                              <td className="py-2 pr-3 whitespace-nowrap">{num(r.interest)}</td>
                              <td className="py-2 pr-3 whitespace-nowrap">{num(r.principal)}</td>
                              <td className="py-2 pr-3 whitespace-nowrap">{num(r.paid)}</td>
                              <td className="py-2 pr-3 whitespace-nowrap">{num(r.balance)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                    <p className="mt-2 text-xs text-muted">{t(`table.note.${s.k}`)}</p>
                  </div>
                </details>
                {s.k === 'icl' && <p className="text-xs text-muted leading-relaxed">{t('result.basisNote')}</p>}
              </>
            )}
            <p className="text-xs text-muted leading-relaxed">{t('result.disclaimer')}</p>
          </section>

          {!nothing && (
            <ShareResult
              fileName="student-loan-repayment"
              card={{
                tool: t('share.tool'),
                label: t('share.label', { b: man(s.b * MAN), s: man(s.s * MAN) }),
                headline,
                sub: t('share.sub', { r: s.r, v: won(plan.totalInterest) }),
                rows: [
                  ...(s.k === 'icl' && first ? [{ label: t('share.rows.due', { y: s.y }), value: won(first.due) }] : [{ label: t('share.rows.payment'), value: won(gen.payment) }]),
                  { label: t('result.payoff'), value: when(plan) },
                  { label: t('result.totalInterest'), value: won(plan.totalInterest) },
                  { label: t('share.rows.other', { kind: t(`input.kinds.${other}`) }), value: `${when(otherPlan)} · ${won(otherPlan.totalInterest)}` },
                ],
              }}
              text={t('share.text', { kind: kindName, b: man(s.b * MAN), s: man(s.s * MAN), head: headline, v: won(plan.totalInterest) })}
            />
          )}
        </div>
      </div>

      {!nothing && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* 두 방식 비교 */}
          <section className="ui-card p-6 space-y-4 min-w-0" aria-labelledby="slr-compare">
            <h2 id="slr-compare" className="text-lg font-semibold text-fg">{t('compare.title')}</h2>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[18rem] text-sm tabular-nums">
                <caption className="sr-only">{t('compare.caption')}</caption>
                <thead>
                  <tr className="border-b border-line text-left text-sub">
                    <th scope="col" className="py-2 pr-3 font-medium"><span className="sr-only">{t('compare.item')}</span></th>
                    {(['icl', 'gen'] as const).map((k) => (
                      <th key={k} scope="col" className={`py-2 pr-3 font-semibold ${s.k === k ? 'text-primary' : 'text-fg'}`}>{t(`input.kinds.${k}`)}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="text-body">
                  <tr className="border-b border-line">
                    <th scope="row" className="py-2 pr-3 text-left font-medium text-sub">{t('compare.monthly')}</th>
                    <td className="py-2 pr-3">{firstDue ? t('compare.iclMonthly', { y: firstDue.year + 1, v: won(firstDue.due / 12) }) : t('compare.iclNone')}</td>
                    <td className="py-2 pr-3">{s.d > 0 ? t('compare.genMonthlyGrace', { a: won(gen.graceInterest), b: won(gen.payment) }) : won(gen.payment)}</td>
                  </tr>
                  <tr className="border-b border-line">
                    <th scope="row" className="py-2 pr-3 text-left font-medium text-sub">{t('result.payoff')}</th>
                    <td className="py-2 pr-3">{when(icl)}</td>
                    <td className="py-2 pr-3">{when(gen)}</td>
                  </tr>
                  <tr className="border-b border-line">
                    <th scope="row" className="py-2 pr-3 text-left font-medium text-sub">{t('result.totalInterest')}</th>
                    <td className="py-2 pr-3 font-semibold text-fg">{won(icl.totalInterest)}</td>
                    <td className="py-2 pr-3 font-semibold text-fg">{won(gen.totalInterest)}</td>
                  </tr>
                  <tr>
                    <th scope="row" className="py-2 pr-3 text-left font-medium text-sub">{t('compare.rate')}</th>
                    <td className="py-2 pr-3">{t('compare.rateIcl', { r: s.r })}</td>
                    <td className="py-2 pr-3">{t('compare.rateGen', { r: s.r })}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="text-sm text-body">{t(`compare.${compareKey}`, { v: won(Math.abs(diff)), pay: won(gen.payment), n: MAX_YEARS })}</p>
            <ul className="list-disc pl-5 space-y-1 text-sm text-sub">
              {(t.raw('compare.points') as string[]).map((x) => <li key={x}>{x}</li>)}
            </ul>
          </section>

          {/* 추가 상환 */}
          <section className="ui-card p-6 space-y-4 min-w-0" aria-labelledby="slr-extra">
            <h2 id="slr-extra" className="text-lg font-semibold text-fg">{t('extra.title', { kind: kindName })}</h2>
            <NumField id="slr-x" k="x" label={t('extra.amount')} unit={t('input.unitMan')} value={s.x} hint={t(`extra.hint.${s.k}`)} err={err('x')} onCommit={(x) => commit({ x })} />
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3" aria-live="polite">
              <div className={statCls}>
                <dt className="text-xs text-sub">{t('extra.base')}</dt>
                <dd className="mt-0.5 text-base font-semibold text-fg tabular-nums">{when(plan)}</dd>
                <dd className="text-xs text-muted tabular-nums">{t('extra.interest', { v: won(plan.totalInterest) })}</dd>
              </div>
              <div className="bg-primary-soft rounded-2xl px-4 py-3 min-w-0">
                <dt className="text-xs text-primary">{t('extra.with', { v: man(extraWon) })}</dt>
                <dd className="mt-0.5 text-base font-semibold text-fg tabular-nums">{when(withExtra)}</dd>
                <dd className="text-xs text-body tabular-nums">{t('extra.interest', { v: won(withExtra.totalInterest) })}</dd>
              </div>
            </dl>
            <p className="text-sm text-body">
              {s.x === 0 ? t('extra.zero')
                : saved !== null ? t(saved > 0 ? 'extra.saved' : 'extra.same', { dur: dur(saved), v: won(plan.totalInterest - withExtra.totalInterest) })
                  : withExtra.months !== null ? t('extra.nowDone', { at: when(withExtra) })
                    : t('extra.stillNever', { n: MAX_YEARS })}
            </p>
          </section>
        </div>
      )}

      {/* 가이드 */}
      <div className="ui-card p-6 space-y-6">
        <h2 className="text-xl font-semibold text-fg">{t('guide.title')}</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {GUIDE.map((sec) => (
            <section key={sec} className="min-w-0">
              <h3 className="font-semibold text-fg mb-3">{t(`guide.${sec}.title`)}</h3>
              <ul className="list-disc pl-5 space-y-2 text-sm text-sub">
                {(t.raw(`guide.${sec}.items`) as string[]).map((x) => <li key={x}>{x}</li>)}
              </ul>
            </section>
          ))}
        </div>
        <p className="text-sm text-sub">
          {t('guide.links.lead')}{' '}
          <Link href="/national-scholarship" className={linkCls}>{t('guide.links.scholarship')}</Link>{' · '}
          <Link href="/education-tax-credit" className={linkCls}>{t('guide.links.taxCredit')}</Link>{' · '}
          <Link href="/salary-calculator" className={linkCls}>{t('guide.links.salary')}</Link>
        </p>
        <section>
          <h3 className="font-semibold text-fg mb-3">{t('guide.faq.title')}</h3>
          <div className="divide-y divide-line border-y border-line">
            {faq.map((f) => (
              <details key={f.q} className="py-3">
                <summary className="cursor-pointer text-sm font-medium text-body min-h-11 flex items-center">{f.q}</summary>
                <p className="text-sm text-sub mt-2 leading-relaxed">{f.a}</p>
              </details>
            ))}
          </div>
        </section>
        <section className="bg-subtle rounded-2xl p-5 text-sm text-sub space-y-2">
          <h3 className="font-medium text-body">{t('sources.title')}</h3>
          <ul className="space-y-1">
            {SOURCE_KEYS.map((k) => (
              <li key={k}><a href={SOURCES[k]} target="_blank" rel="noopener noreferrer" className={`${linkCls} [overflow-wrap:anywhere]`}>{t(`sources.${k}`)}</a></li>
            ))}
          </ul>
          <p className="text-xs text-muted">{t('sources.asOf', { date: CHECKED })}</p>
        </section>
      </div>
    </div>
  )
}
