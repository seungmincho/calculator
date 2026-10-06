'use client'

import { useState, useEffect, type ReactNode } from 'react'
import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import { useTranslations } from '@/lib/i18n'
import '@/lib/i18n/ns/carLoan'
import { useSearchParams } from '@/hooks/useSearchParams'
import GuideSection from '@/components/GuideSection'
import ShareResult from '@/components/ShareResult'
import MobileResultLink from '@/components/MobileResultLink'
import { carLoan, burden, burdenLevel, FUELS, TERMS, MAX_RATE, type Fuel, type CarLoanInput } from '@/utils/carLoan'

const DOWN_PCTS = [0, 20, 30] as const
const CMP_TERMS = [36, 48, 60] as const
const MAX = 10_000_000_000

const won = (v: number) => Math.round(v).toLocaleString('ko-KR')
const parseNum = (s: string | null) => Number((s ?? '').replace(/[^\d]/g, '')) || 0
const numOr = (v: string | null, def: number) => (v !== null && v !== '' && Number.isFinite(Number(v)) ? Number(v) : def)
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))

export default function CarLoanCalculator() {
  const t = useTranslations('carLoan')
  const sp = useSearchParams()

  const [price, setPrice] = useState(() => parseNum(sp.get('p')) || 35_000_000)
  const [options, setOptions] = useState(() => parseNum(sp.get('o')))
  const [discount, setDiscount] = useState(() => parseNum(sp.get('dc')))
  const [byPct, setByPct] = useState(() => sp.get('dm') !== 'amt')
  const [downPct, setDownPct] = useState(() => clamp(numOr(sp.get('dp'), 30), 0, 100))
  const [downAmt, setDownAmt] = useState(() => parseNum(sp.get('d')) || 10_000_000)
  const [months, setMonths] = useState(() => { const m = numOr(sp.get('m'), 48); return (TERMS as readonly number[]).includes(m) ? m : 48 })
  const [rate, setRate] = useState(() => (/^\d{1,2}(\.\d{1,2})?$/.test(sp.get('r') ?? '') ? sp.get('r')! : '6.0'))
  const [balloonOn, setBalloonOn] = useState(() => numOr(sp.get('b'), 0) > 0)
  const [balloonPct, setBalloonPct] = useState(() => clamp(numOr(sp.get('b'), 0), 0, 60) || 30)
  const [fuel, setFuel] = useState<Fuel>(() => (FUELS.includes(sp.get('f') as Fuel) ? (sp.get('f') as Fuel) : 'normal'))
  const [extra, setExtra] = useState(() => parseNum(sp.get('x')))
  const [income, setIncome] = useState(() => numOr(sp.get('inc'), 3_000_000))
  const [insurance, setInsurance] = useState(() => numOr(sp.get('ins'), 100_000))
  const [running, setRunning] = useState(() => numOr(sp.get('run'), 150_000))

  useEffect(() => {
    const q = new URLSearchParams()
    q.set('p', String(price))
    if (options) q.set('o', String(options))
    if (discount) q.set('dc', String(discount))
    if (byPct) q.set('dp', String(downPct))
    else { q.set('dm', 'amt'); q.set('d', String(downAmt)) }
    q.set('m', String(months))
    q.set('r', rate)
    if (balloonOn) q.set('b', String(balloonPct))
    if (fuel !== 'normal') q.set('f', fuel)
    if (extra) q.set('x', String(extra))
    q.set('inc', String(income))
    q.set('ins', String(insurance))
    q.set('run', String(running))
    window.history.replaceState(null, '', `?${q}`)
  }, [price, options, discount, byPct, downPct, downAmt, months, rate, balloonOn, balloonPct, fuel, extra, income, insurance, running])

  const carPrice = Math.max(0, price + options - discount)
  const input: CarLoanInput = {
    price, options, discount,
    down: byPct ? Math.round((carPrice * downPct) / 100) : downAmt,
    months, rate: parseFloat(rate) || 0,
    balloonPct: balloonOn ? balloonPct : 0,
    fuel, extra,
  }
  const r = carLoan(input)
  const cmpBalloon = balloonOn ? balloonPct : 30
  const normal = carLoan({ ...input, balloonPct: 0 })
  const deferred = carLoan({ ...input, balloonPct: cmpBalloon })
  const curDownPct = carPrice ? Math.round((r.down / carPrice) * 100) : 0

  const carMonthly = r.monthly + insurance + running
  const bp = burden(carMonthly, income)

  const W = (v: number) => t('u.wonFmt', { v: won(v) })
  const kor = (v: number) => {
    const eok = Math.floor(v / 1e8), man = Math.floor((v % 1e8) / 1e4)
    const key = v < 1e4 ? 'won' : eok && man ? 'eokMan' : eok ? 'eok' : 'man'
    return t(`u.kor.${key}`, { eok, man: man.toLocaleString('ko-KR'), v: won(v) })
  }

  const seg = (on: boolean) =>
    `min-h-[44px] px-2 py-2 rounded-lg text-sm font-medium transition-colors ${on ? 'bg-primary text-white' : 'bg-soft text-body hover:bg-subtle'}`
  const toolLink = (href: string, key: string) => (
    <Link key={href} href={href} className="inline-flex items-center text-xs font-medium text-primary hover:underline">
      {t(key)}<ChevronRight className="w-3 h-3" aria-hidden="true" />
    </Link>
  )

  const money = (id: string, label: ReactNode, value: number, onChange: (v: number) => void, hint?: ReactNode) => (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-body mb-2">{label}</label>
      <div className="relative">
        <input
          id={id} type="text" inputMode="numeric" autoComplete="off"
          value={value ? value.toLocaleString('ko-KR') : ''} placeholder="0"
          onChange={(e) => onChange(Math.min(parseNum(e.target.value), MAX))}
          aria-describedby={`${id}-hint`}
          className="ui-field w-full px-4 py-3 pr-10 tabular-nums"
        />
        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-muted" aria-hidden="true">{t('u.won')}</span>
      </div>
      <p id={`${id}-hint`} className="text-xs text-muted mt-1.5">{value ? kor(value) : null}{hint && value ? ' · ' : null}{hint}</p>
    </div>
  )

  const row = (label: ReactNode, value: string, hint?: ReactNode, strong = false) => (
    <div className="flex items-center justify-between py-3 gap-3">
      <div>
        <p className={`text-sm ${strong ? 'font-semibold text-fg' : 'font-medium text-body'}`}>{label}</p>
        {hint && <p className="text-xs text-muted">{hint}</p>}
      </div>
      <p className={`tabular-nums text-right ${strong ? 'text-lg font-bold text-fg' : 'text-base font-semibold text-fg'}`}>{value}</p>
    </div>
  )

  const level = bp === null ? null : burdenLevel(bp)
  const kinds = ['loan', 'lease', 'rent'] as const
  const aspects = t.raw('u.kinds.aspects') as string[]

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-fg">{t('title')}</h1>
        <p className="text-sm text-muted mt-1">{t('u.subtitle')}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* 입력 */}
        <div className="lg:col-span-1 space-y-6">
          <div className="ui-card p-6 space-y-5">
            <MobileResultLink href="#car-loan-calculator-result" label={t('u.result.label', { price: kor(r.carPrice), months })} value={W(r.monthly)} />
            <h2 className="text-lg font-semibold text-fg">{t('u.car.title')}</h2>
            {money('cl-price', t('u.car.price'), price, setPrice)}
            <div className="grid grid-cols-2 gap-3">
              {money('cl-options', t('u.car.options'), options, setOptions)}
              {money('cl-discount', t('u.car.discount'), discount, setDiscount)}
            </div>
            <p className="text-xs text-muted -mt-2">{t('u.car.carPrice', { v: W(carPrice) })}</p>
            <fieldset>
              <legend className="block text-sm font-medium text-body mb-2">{t('u.car.fuel')}</legend>
              <div className="grid grid-cols-3 gap-2">
                {FUELS.map((f) => <button key={f} type="button" aria-pressed={fuel === f} onClick={() => setFuel(f)} className={seg(fuel === f)}>{t(`u.fuel.${f}`)}</button>)}
              </div>
              <p className="text-xs text-muted mt-1.5">{t(`u.fuel.${fuel}Hint`)}</p>
            </fieldset>
          </div>

          <div className="ui-card p-6 space-y-5">
            <h2 className="text-lg font-semibold text-fg">{t('u.loan.title')}</h2>
            <fieldset>
              <legend className="block text-sm font-medium text-body mb-2">{t('u.loan.down')}</legend>
              <div className="grid grid-cols-2 gap-2 mb-2">
                <button type="button" aria-pressed={byPct} onClick={() => setByPct(true)} className={seg(byPct)}>{t('u.loan.byPct')}</button>
                <button type="button" aria-pressed={!byPct} onClick={() => setByPct(false)} className={seg(!byPct)}>{t('u.loan.byAmount')}</button>
              </div>
              {byPct ? (
                <div>
                  <label htmlFor="cl-downpct" className="flex justify-between text-sm text-body mb-1">
                    <span>{t('u.loan.downPct')}</span><span className="tabular-nums text-fg">{downPct}% · {kor(r.down)}</span>
                  </label>
                  <input id="cl-downpct" type="range" min={0} max={70} step={5} value={downPct} onChange={(e) => setDownPct(Number(e.target.value))} className="w-full h-11 accent-[var(--primary)]" />
                </div>
              ) : (
                money('cl-down', t('u.loan.downAmount'), downAmt, setDownAmt, t('u.loan.downPctOf', { pct: curDownPct }))
              )}
            </fieldset>

            <fieldset>
              <legend className="block text-sm font-medium text-body mb-2">{t('u.loan.months')}</legend>
              <div className="grid grid-cols-5 gap-2">
                {TERMS.map((m) => <button key={m} type="button" aria-pressed={months === m} onClick={() => setMonths(m)} className={seg(months === m)}>{m}</button>)}
              </div>
              <p className="text-xs text-muted mt-1.5">{t('u.loan.monthsHint', { y: months / 12 })}</p>
            </fieldset>

            <div>
              <label htmlFor="cl-rate" className="block text-sm font-medium text-body mb-2">{t('u.loan.rate')}</label>
              <div className="relative">
                <input id="cl-rate" type="text" inputMode="decimal" autoComplete="off" value={rate} aria-describedby="cl-rate-hint"
                  onChange={(e) => /^\d{0,2}(\.\d{0,2})?$/.test(e.target.value) && setRate(e.target.value)}
                  className="ui-field w-full px-4 py-3 pr-8 tabular-nums" />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-muted" aria-hidden="true">%</span>
              </div>
              <p id="cl-rate-hint" className="text-xs text-muted mt-1.5">{t('u.loan.rateHint', { max: MAX_RATE })}</p>
              {(parseFloat(rate) || 0) > MAX_RATE && <p className="text-xs text-amber-800 mt-1" role="alert">{t('u.loan.rateOver', { max: MAX_RATE })}</p>}
            </div>

            <fieldset>
              <legend className="block text-sm font-medium text-body mb-2">{t('u.loan.type')}</legend>
              <div className="grid grid-cols-2 gap-2">
                <button type="button" aria-pressed={!balloonOn} onClick={() => setBalloonOn(false)} className={seg(!balloonOn)}>{t('u.loan.normal')}</button>
                <button type="button" aria-pressed={balloonOn} onClick={() => setBalloonOn(true)} className={seg(balloonOn)}>{t('u.loan.balloon')}</button>
              </div>
              {balloonOn && (
                <div className="mt-3">
                  <label htmlFor="cl-balloon" className="flex justify-between text-sm text-body mb-1">
                    <span>{t('u.loan.balloonPct')}</span><span className="tabular-nums text-fg">{balloonPct}% · {kor(r.balloon)}</span>
                  </label>
                  <input id="cl-balloon" type="range" min={10} max={60} step={5} value={balloonPct} onChange={(e) => setBalloonPct(Number(e.target.value))} className="w-full h-11 accent-[var(--primary)]" />
                </div>
              )}
              <p className="text-xs text-muted mt-1.5">{t(balloonOn ? 'u.loan.balloonHint' : 'u.loan.normalHint')}</p>
            </fieldset>

            {money('cl-extra', t('u.loan.extra'), extra, setExtra, t('u.loan.extraHint'))}
          </div>
        </div>

        {/* 결과 */}
        <div className="lg:col-span-2 space-y-6">
          <section id="car-loan-calculator-result" className="ui-card p-6 space-y-5 scroll-mt-20" aria-labelledby="cl-result-title">
            <div aria-live="polite">
              <h2 id="cl-result-title" className="text-sm text-muted">{t('u.result.label', { price: kor(r.carPrice), months })}</h2>
              <p className="text-3xl font-bold text-fg tabular-nums mt-1">{W(r.monthly)}</p>
              <p className="text-sm text-sub mt-1">
                {t('u.result.sub', { principal: kor(r.principal), rate: input.rate, interest: W(r.totalInterest) })}
              </p>
              {r.balloon > 0 && <p className="text-sm text-body mt-2">{t('u.result.balloonDue', { months, v: W(r.balloon) })}</p>}
            </div>

            <div className="divide-y divide-line border-y border-line">
              {row(t('u.result.carPrice'), W(r.carPrice))}
              {row(t('u.result.down'), W(r.down), t('u.result.downHint', { pct: curDownPct }))}
              {row(t('u.result.principal'), W(r.principal))}
              {row(t('u.result.interest'), W(r.totalInterest), t('u.result.interestHint', { pct: r.principal ? ((r.totalInterest / r.principal) * 100).toFixed(1) : '0' }))}
              {row(t('u.result.tax'), W(r.tax.pay),
                <>{r.tax.relief > 0 ? t('u.result.taxRelief', { tax: W(r.tax.tax), relief: W(r.tax.relief) }) : t('u.result.taxHint', { rate: fuel === 'light' ? 4 : 7 })} {toolLink('/car-tax-calculator', 'u.link.carTax')}</>)}
              {row(t('u.result.extra'), W(r.extra), extra ? undefined : t('u.result.extraZero'))}
              {row(t('u.result.total'), W(r.total), t('u.result.totalHint'), true)}
            </div>

            <div className="bg-subtle rounded-2xl p-4 flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-body">{t('u.result.upfront')}</p>
                <p className="text-xs text-muted">{t('u.result.upfrontHint')}</p>
              </div>
              <p className="text-lg font-bold text-fg tabular-nums">{W(r.upfront)}</p>
            </div>

            <ShareResult
              card={{
                tool: t('title'),
                label: t('u.share.label', { price: kor(r.carPrice), months }),
                headline: W(r.monthly),
                sub: t('u.share.sub', { down: kor(r.down), rate: input.rate }),
                rows: [
                  { label: t('u.result.principal'), value: W(r.principal) },
                  { label: t('u.result.interest'), value: W(r.totalInterest) },
                  ...(r.balloon > 0 ? [{ label: t('u.compare.balloonDue'), value: W(r.balloon) }] : []),
                  { label: t('u.result.tax'), value: W(r.tax.pay) },
                  { label: t('u.result.total'), value: W(r.total) },
                ],
              }}
              text={t('u.share.text', { price: kor(r.carPrice), months, monthly: W(r.monthly), total: W(r.total) })}
            />
          </section>

          {/* 기간·선수금 비교 */}
          <section className="ui-card p-6 space-y-4" aria-labelledby="cl-grid-title">
            <div>
              <h2 id="cl-grid-title" className="text-lg font-semibold text-fg">{t('u.grid.title')}</h2>
              <p className="text-sm text-muted mt-1">{t('u.grid.desc', { rate: input.rate })}</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm whitespace-nowrap">
                <caption className="sr-only">{t('u.grid.title')}</caption>
                <thead>
                  <tr className="border-b border-line text-muted">
                    <th scope="col" className="text-left font-medium py-2 px-1">{t('u.grid.term')}</th>
                    {DOWN_PCTS.map((d) => <th key={d} scope="col" className="text-right font-medium py-2 px-1">{t('u.grid.down', { pct: d })}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {CMP_TERMS.map((m) => (
                    <tr key={m} className="border-b border-line">
                      <th scope="row" className="text-left font-medium text-body py-2.5 px-1">{t('u.grid.months', { m })}</th>
                      {DOWN_PCTS.map((d) => {
                        const x = carLoan({ ...input, months: m, down: Math.round((carPrice * d) / 100) })
                        const cur = months === m && byPct && downPct === d
                        return (
                          <td key={d} className={`py-1.5 px-1 text-right ${cur ? 'bg-primary-soft' : ''}`}>
                            <button type="button" onClick={() => { setMonths(m); setByPct(true); setDownPct(d) }}
                              aria-label={t('u.grid.apply', { m, pct: d, monthly: W(x.monthly) })}
                              className="min-h-[44px] w-full text-right rounded-lg px-2 hover:bg-soft">
                              <span className={`block tabular-nums ${cur ? 'text-primary font-bold' : 'text-fg font-semibold'}`}>{W(x.monthly)}{cur && <span className="ml-1 text-xs">{t('u.grid.current')}</span>}</span>
                              <span className="block text-xs text-muted tabular-nums">{t('u.grid.interest', { v: W(x.totalInterest) })}</span>
                            </button>
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-faint">{t('u.grid.note')}</p>
          </section>

          {/* 일반 vs 유예 */}
          <section className="ui-card p-6 space-y-4" aria-labelledby="cl-cmp-title">
            <div>
              <h2 id="cl-cmp-title" className="text-lg font-semibold text-fg">{t('u.compare.title')}</h2>
              <p className="text-sm text-muted mt-1">{t('u.compare.desc', { pct: cmpBalloon })}</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm whitespace-nowrap">
                <caption className="sr-only">{t('u.compare.title')}</caption>
                <thead>
                  <tr className="border-b border-line text-muted">
                    <th scope="col" className="text-left font-medium py-2 px-1"><span className="sr-only">{t('u.compare.item')}</span></th>
                    <th scope="col" className="text-right font-medium py-2 px-1">{t('u.loan.normal')}</th>
                    <th scope="col" className="text-right font-medium py-2 px-1">{t('u.compare.balloonCol', { pct: cmpBalloon })}</th>
                  </tr>
                </thead>
                <tbody>
                  {([
                    ['monthly', normal.monthly, deferred.monthly],
                    ['balloonDue', 0, deferred.balloon],
                    ['interest', normal.totalInterest, deferred.totalInterest],
                    ['total', normal.total, deferred.total],
                  ] as const).map(([k, a, b]) => (
                    <tr key={k} className="border-b border-line">
                      <th scope="row" className="text-left font-medium text-body py-2.5 px-1">{t(`u.compare.${k}`)}</th>
                      <td className="py-2.5 px-1 text-right tabular-nums text-fg">{W(a)}</td>
                      <td className="py-2.5 px-1 text-right tabular-nums text-fg">{W(b)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-sm text-sub">
              {t('u.compare.summary', { diff: W(Math.abs(normal.monthly - deferred.monthly)), extra: W(deferred.totalInterest - normal.totalInterest), due: W(deferred.balloon) })}
            </p>
          </section>

          {/* 상환 스케줄 */}
          <details className="ui-card p-6 group">
            <summary className="cursor-pointer min-h-[44px] flex items-center justify-between text-lg font-semibold text-fg">
              {t('u.schedule.title', { n: r.rows.length })}
              <ChevronRight className="w-5 h-5 text-muted transition-transform group-open:rotate-90" aria-hidden="true" />
            </summary>
            {r.rows.length ? (
              <div className="overflow-x-auto mt-4">
                <table className="w-full text-sm whitespace-nowrap">
                  <caption className="sr-only">{t('u.schedule.caption')}</caption>
                  <thead>
                    <tr className="border-b border-line text-muted">
                      {(['n', 'payment', 'principal', 'interest', 'balance'] as const).map((k, i) => (
                        <th key={k} scope="col" className={`${i ? 'text-right' : 'text-left'} font-medium py-2 px-1`}>{t(`u.schedule.${k}`)}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {r.rows.map((x) => (
                      <tr key={x.n} className="border-b border-line">
                        <td className="py-2 px-1 text-body tabular-nums">{x.n}</td>
                        <td className="py-2 px-1 text-right tabular-nums text-fg">{won(x.payment)}</td>
                        <td className="py-2 px-1 text-right tabular-nums text-sub">{won(x.principal)}</td>
                        <td className="py-2 px-1 text-right tabular-nums text-sub">{won(x.interest)}</td>
                        <td className="py-2 px-1 text-right tabular-nums text-sub">{won(x.balance)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <p className="text-xs text-faint mt-3">{t(r.balloon > 0 ? 'u.schedule.noteBalloon' : 'u.schedule.note')}</p>
              </div>
            ) : (
              <p className="text-sm text-muted mt-4">{t('u.schedule.empty')}</p>
            )}
          </details>

          {/* 월 소득 대비 */}
          <section className="ui-card p-6 space-y-5" aria-labelledby="cl-budget-title">
            <div>
              <h2 id="cl-budget-title" className="text-lg font-semibold text-fg">{t('u.budget.title')}</h2>
              <p className="text-sm text-muted mt-1">{t('u.budget.desc')}</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {money('cl-income', t('u.budget.income'), income, setIncome)}
              {money('cl-ins', t('u.budget.insurance'), insurance, setInsurance)}
              {money('cl-run', t('u.budget.running'), running, setRunning)}
            </div>
            <div aria-live="polite" className="bg-subtle rounded-2xl p-5 space-y-3">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm text-body">{t('u.budget.carMonthly', { pay: W(r.monthly), etc: W(insurance + running) })}</p>
                <p className="text-lg font-bold text-fg tabular-nums">{W(carMonthly)}</p>
              </div>
              {bp !== null && level ? (
                <>
                  <div className="h-2 rounded-full bg-track overflow-hidden" aria-hidden="true">
                    <div className={`h-full rounded-full ${level === 'high' ? 'bg-amber-500' : 'bg-primary'}`} style={{ width: `${Math.min(100, bp)}%` }} />
                  </div>
                  <p className="text-sm font-medium text-fg">{t(`u.budget.${level}`, { pct: bp.toFixed(1) })}</p>
                </>
              ) : (
                <p className="text-sm text-muted">{t('u.budget.noIncome')}</p>
              )}
              <p className="text-xs text-muted">{t('u.budget.note')} {toolLink('/annual-car-tax', 'u.link.annualTax')}</p>
            </div>
          </section>
        </div>
      </div>

      {/* 할부·리스·렌트 개념 비교 */}
      <section className="ui-card p-6 space-y-4" aria-labelledby="cl-kinds-title">
        <div>
          <h2 id="cl-kinds-title" className="text-xl font-semibold text-fg">{t('u.kinds.title')}</h2>
          <p className="text-sm text-muted mt-1">{t('u.kinds.desc')}</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <caption className="sr-only">{t('u.kinds.title')}</caption>
            <thead>
              <tr className="border-b border-line text-muted">
                <th scope="col" className="text-left font-medium py-2 px-2 whitespace-nowrap"><span className="sr-only">{t('u.compare.item')}</span></th>
                {kinds.map((k) => <th key={k} scope="col" className="text-left font-medium py-2 px-2 whitespace-nowrap">{t(`u.kinds.${k}.name`)}</th>)}
              </tr>
            </thead>
            <tbody>
              {aspects.map((a, i) => (
                <tr key={a} className="border-b border-line align-top">
                  <th scope="row" className="text-left font-medium text-body py-2.5 px-2 whitespace-nowrap">{a}</th>
                  {kinds.map((k) => <td key={k} className="py-2.5 px-2 text-sub min-w-[9rem]">{(t.raw(`u.kinds.${k}.cells`) as string[])[i]}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-sm text-sub">{t('u.kinds.note')}</p>
        <div className="flex flex-wrap gap-x-4 gap-y-2 pt-2">
          {toolLink('/car-tax-calculator', 'u.link.carTax')}
          {toolLink('/annual-car-tax', 'u.link.annualTax')}
          {toolLink('/fuel-calculator', 'u.link.fuel')}
          {toolLink('/car-maintenance', 'u.link.maintenance')}
          {toolLink('/ev-subsidy', 'u.link.ev')}
          {toolLink('/loan-calculator', 'u.link.loan')}
          {toolLink('/loan-schedule', 'u.link.schedule')}
          {toolLink('/dsr-calculator', 'u.link.dsr')}
        </div>
      </section>

      <GuideSection namespace="carLoan" />
    </div>
  )
}
