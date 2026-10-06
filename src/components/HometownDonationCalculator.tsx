'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import Link from 'next/link'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, ReferenceArea, ReferenceDot, CartesianGrid } from 'recharts'
import { useTranslations } from '@/lib/i18n'
import '@/lib/i18n/ns/hometownDonation'
import { useSearchParams } from '@/hooks/useSearchParams'
import ShareResult from '@/components/ShareResult'
import MobileResultLink from '@/components/MobileResultLink'
import AddToCalendar, { useDeadlineEvent } from '@/components/AddToCalendar'
import { TAX_YEAR } from '@/utils/yearEndTax'
import { donate, breakEven, curve, compare, chartMax, CAP, PRESETS } from '@/utils/hometownDonation'

// 계산은 hometownDonation.ts → yearEndTax.ts(연말정산 계산기와 같은 함수). URL 키 a(기부액)·s(총급여)·p(이미 기부한 금액).
// /year-end-tax는 s·ht(고향사랑기부금 합계)를 읽고, 이 페이지로 s·a를 넘긴다 (양방향 링크)
const DEF = { amount: 200_000, salary: 0, prior: 0 } // 첫 화면: 20만원 → "3,999원 이득"
const MAX = 10_000_000_000
const STEP = 10_000
const SLIDER_MAX = 1_000_000

const won = (n: number) => Math.round(n).toLocaleString('ko-KR')
const man = (n: number) => (n / 10_000).toLocaleString('ko-KR', { maximumFractionDigits: 1 })
/** 영어 문구용 (100K, 1M) */
const short = (n: number) => (Math.abs(n) >= 1_000_000 ? `${(n / 1_000_000).toLocaleString('en-US', { maximumFractionDigits: 1 })}M` : `${(n / 1_000).toLocaleString('en-US', { maximumFractionDigits: 0 })}K`)
const digits = (s: string) => s.replace(/[^\d]/g, '')
const amountOf = (v: string | null) => (v && /^\d{1,11}$/.test(v) ? Number(v) : null)

function MoneyInput({ id, label, value, onChange, hint, unit, max = MAX, placeholder = '0' }: {
  id: string; label: string; value: number; onChange: (n: number) => void; hint?: string; unit: string; max?: number; placeholder?: string
}) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-body mb-2">{label}</label>
      <div className="relative">
        <input
          id={id} type="text" inputMode="numeric" value={value ? won(value) : ''} placeholder={placeholder}
          onChange={(e) => onChange(Math.min(Number(digits(e.target.value)) || 0, max))}
          className="ui-field w-full px-4 py-3 pr-12 tabular-nums" aria-describedby={hint ? `${id}-hint` : undefined}
        />
        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-muted">{unit}</span>
      </div>
      {hint && <p id={`${id}-hint`} className="text-xs text-muted mt-1.5">{hint}</p>}
    </div>
  )
}

export default function HometownDonationCalculator() {
  const t = useTranslations('hometownDonation')
  const sp = useSearchParams()
  const deadlineEvent = useDeadlineEvent()
  const [amount, setAmount] = useState(DEF.amount)
  const [salary, setSalary] = useState(DEF.salary)
  const [prior, setPrior] = useState(DEF.prior)

  // URL → 상태 (마운트 후 1회 — 첫 렌더는 기본값으로 정적 HTML과 같게. 다시 읽으면 아래 쓰기 effect가 공유 링크를 덮음)
  const loaded = useRef(false)
  useEffect(() => {
    if (loaded.current) return
    loaded.current = true
    const a = amountOf(sp.get('a'))
    if (a !== null) setAmount(Math.min(a, CAP))
    setSalary(amountOf(sp.get('s')) ?? DEF.salary)
    setPrior(Math.min(amountOf(sp.get('p')) ?? DEF.prior, CAP))
  }, [sp])

  useEffect(() => {
    if (!loaded.current) return
    const q = new URLSearchParams({ a: String(amount) })
    if (salary) q.set('s', String(salary))
    if (prior) q.set('p', String(prior))
    window.history.replaceState(window.history.state, '', `?${q}`)
  }, [amount, salary, prior])

  const r = donate({ amount, salary, prior })
  // 곡선·0원 지점·비교표는 기부액과 무관 → 슬라이더를 움직일 때 다시 계산하지 않게
  const cm = chartMax(r.amount)
  const { be, points, rows } = useMemo(() => {
    const x = { salary, prior }
    return { be: breakEven(x), points: curve(x, cm), rows: compare(x) }
  }, [salary, prior, cm])
  const W = t('won')
  const gain = r.cost < 0
  const costText = (n: number) => (n < 0 ? t('result.gain', { amount: won(-n) }) : t('result.cost', { amount: won(n) }))
  const axis = (n: number) => t('axis', { n: man(n), e: short(n) })
  const sliderMax = Math.min(SLIDER_MAX, CAP - r.prior)
  const fullLink = `/year-end-tax/?${new URLSearchParams(
    Object.entries({ s: salary, ht: r.prior + r.amount }).filter(([, v]) => v > 0).map(([k, v]) => [k, String(v)]),
  )}`

  const card = {
    tool: t('title'),
    label: t('share.label', { amount: won(r.amount) }),
    headline: gain ? t('share.headlineGain', { gain: won(-r.cost) }) : t('share.headlineCost', { cost: won(r.cost) }),
    sub: t('share.sub', { saving: won(r.saving), gift: won(r.gift) }),
    rows: [
      { label: t('rows.amount'), value: `${won(r.amount)}${W}` },
      { label: t('rows.saving'), value: `${won(r.saving)}${W}` },
      { label: t('rows.gift'), value: `${won(r.gift)}${W}` },
      { label: t('rows.cost'), value: costText(r.cost) },
    ],
  }
  const shareText = t(gain ? 'share.textGain' : 'share.textCost', { amount: won(r.amount), saving: won(r.saving), gift: won(r.gift), gain: won(-r.cost), cost: won(r.cost) })

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-fg">{t('title')}</h1>
        <p className="text-sm text-muted mt-1">{t('subtitle', { year: TAX_YEAR })}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* 입력 */}
        <div className="lg:col-span-1">
          <div className="ui-card p-6 space-y-5">
            <MobileResultLink href="#hometown-donation-result" label={t('result.label')} value={costText(r.cost)} />
            <div>
              <MoneyInput id="hd-amount" label={t('amount')} value={amount} onChange={setAmount} unit={W} max={CAP} hint={t('amountHint')} />
              <div className="flex flex-wrap gap-1.5 mt-2">
                {PRESETS.map((n) => (
                  <button
                    key={n} type="button" onClick={() => setAmount(n)} aria-pressed={amount === n}
                    className={`min-h-[44px] px-3 py-2 rounded-lg text-sm tabular-nums transition-colors ${amount === n ? 'bg-primary text-white' : 'bg-soft text-body hover:bg-subtle'}`}
                  >
                    {t('manUnit', { n: man(n), e: short(n) })}
                  </button>
                ))}
              </div>
            </div>
            <MoneyInput id="hd-salary" label={t('salary')} value={salary} onChange={setSalary} unit={W} hint={t('salaryHint')} placeholder={t('optional')} />
            <MoneyInput id="hd-prior" label={t('prior')} value={prior} onChange={setPrior} unit={W} max={CAP} hint={t('priorHint')} placeholder={t('optional')} />
          </div>
        </div>

        {/* 결과 */}
        <div className="lg:col-span-2 space-y-6">
          <div id="hometown-donation-result" className="ui-card p-6 space-y-5 scroll-mt-20">
            <div aria-live="polite">
              <p className="text-sm text-muted">{t('result.label')}</p>
              <p className={`text-3xl font-bold tabular-nums mt-1 ${gain ? 'text-primary' : 'text-fg'}`}>{costText(r.cost)}</p>
              <p className="text-sm text-sub mt-1">
                {r.amount === 0
                  ? t('result.zero')
                  : t(gain ? 'result.detailGain' : 'result.detailCost', { amount: won(r.amount), saving: won(r.saving), gift: won(r.gift), gain: won(-r.cost), cost: won(r.cost) })}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="rounded-2xl p-4 bg-subtle">
                <p className="text-sm text-muted">{t('tiles.saving')}</p>
                <p className="text-lg font-bold text-fg tabular-nums mt-1">{won(r.saving)}{W}</p>
                <p className="text-xs text-muted mt-1">
                  {salary > 0 ? t('tiles.savingReal') : t('tiles.savingSub', { income: won(r.income), local: won(r.local) })}
                </p>
              </div>
              <div className="rounded-2xl p-4 bg-subtle">
                <p className="text-sm text-muted">{t('tiles.gift')}</p>
                <p className="text-lg font-bold text-fg tabular-nums mt-1">{won(r.gift)}{W}</p>
                <p className="text-xs text-muted mt-1">{t('tiles.giftSub')}</p>
              </div>
              <div className="rounded-2xl p-4 bg-subtle">
                <p className="text-sm text-muted">{t('tiles.benefit')}</p>
                <p className="text-lg font-bold text-fg tabular-nums mt-1">{won(r.benefit)}{W}</p>
                <p className="text-xs text-muted mt-1">{t('tiles.benefitSub', { amount: won(r.amount) })}</p>
              </div>
            </div>

            {r.capped && (
              <div className="rounded-2xl p-4 bg-amber-50 text-amber-800 text-sm space-y-1" role="note">
                <p className="font-semibold">{t('warn.capTitle')}</p>
                <p>{t('warn.capBody', { tax: won(r.taxLeft ?? 0), nominal: won(r.nominal), saving: won(r.saving), lost: won(r.lost) })}</p>
                <p>{t('warn.capTip')}</p>
              </div>
            )}
            {salary > 0 && !r.capped && (
              <p className="rounded-2xl p-4 bg-subtle text-sm text-sub">{t('info.salaryOk', { salary: won(salary), tax: won(r.taxLeft ?? 0) })}</p>
            )}
            {salary === 0 && <p className="text-xs text-muted">{t('info.noSalary')}</p>}
            {r.over > 0 && <p className="text-sm text-sub">{t('over', { over: won(r.over) })}</p>}

            {/* 구간별 공제 */}
            <div>
              <h2 className="text-base font-semibold text-fg">{t('bands.title')}</h2>
              <div className="overflow-x-auto mt-2">
                <table className="w-full text-sm tabular-nums">
                  <caption className="sr-only">{t('bands.title')}</caption>
                  <thead>
                    <tr className="border-b border-line text-muted">
                      <th scope="col" className="text-left font-medium py-2 pr-2">{t('bands.range')}</th>
                      <th scope="col" className="text-right font-medium py-2 px-2">{t('bands.amount')}</th>
                      <th scope="col" className="text-right font-medium py-2 px-2">{t('bands.rate')}</th>
                      <th scope="col" className="text-right font-medium py-2 pl-2">{t('bands.credit')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {r.bands.map((b, i) => (
                      <tr key={i} className="border-b border-line">
                        <th scope="row" className="text-left font-medium py-3 pr-2 text-body">{t(`bands.t${i + 1}`)}</th>
                        <td className="text-right py-3 px-2 text-sub">{won(b.amount)}</td>
                        <td className="text-right py-3 px-2 text-sub">{t(`bands.r${i + 1}`)}</td>
                        <td className="text-right py-3 pl-2 text-fg">{won(b.income)}</td>
                      </tr>
                    ))}
                    <tr className="border-b border-line">
                      <th scope="row" className="text-left font-medium py-3 pr-2 text-body">{t('bands.local')}</th>
                      <td /><td className="text-right py-3 px-2 text-sub">10%</td>
                      <td className="text-right py-3 pl-2 text-fg">{won(r.local)}</td>
                    </tr>
                    <tr>
                      <th scope="row" className="text-left font-semibold py-3 pr-2 text-fg">{t('bands.total')}</th>
                      <td className="text-right py-3 px-2 font-semibold text-fg">{won(r.amount)}</td>
                      <td />
                      <td className="text-right py-3 pl-2 font-bold text-primary">{won(r.nominal)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-muted mt-2">{r.prior > 0 ? t('bands.notePrior', { prior: won(r.prior) }) : t('bands.note')}</p>
            </div>

            <p className="text-sm text-sub">{t('deadline', { year: TAX_YEAR })}</p>
            <div className="flex flex-wrap gap-2">
              <Link href={fullLink} prefetch={false} className="ui-btn inline-flex items-center min-h-11 px-4 py-3 text-sm">{t('yearEnd')}</Link>
              <AddToCalendar file={`hometown-donation-${TAX_YEAR}.ics`} events={[deadlineEvent('hometown', `${TAX_YEAR}-12-31`, '/hometown-donation', 7)]} />
            </div>
            <ShareResult card={card} text={shareText} fileName="hometown-donation" />
          </div>

          {/* 시뮬레이션 */}
          <div className="ui-card p-6 space-y-4">
            <div>
              <h2 className="text-lg font-semibold text-fg">{t('sim.title')}</h2>
              <p className="text-sm text-muted mt-1">{t('sim.desc')}</p>
            </div>
            <div>
              <div className="flex items-baseline justify-between gap-3">
                <label htmlFor="hd-slider" className="text-sm font-medium text-body">{t('sim.slider')}</label>
                <span className="text-sm font-semibold text-fg tabular-nums">{won(r.amount)}{W}</span>
              </div>
              <input
                id="hd-slider" type="range" min={0} max={sliderMax} step={STEP} value={Math.min(r.amount, sliderMax)}
                onChange={(e) => setAmount(Number(e.target.value))}
                aria-valuetext={`${won(r.amount)}${W}, ${t('result.label')} ${costText(r.cost)}`}
                className="w-full mt-3 h-11 accent-[var(--primary)] cursor-pointer"
              />
            </div>

            <p className={`rounded-2xl p-4 text-sm ${be > 0 ? 'bg-primary-soft text-body' : 'bg-subtle text-sub'}`}>
              {be > 0 ? t('sim.breakEven', { amount: won(be) }) : t('sim.noBreakEven')}
            </p>

            <div className="h-64" role="img" aria-label={t('chart.label')}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={points} margin={{ top: 16, right: 12, left: 4, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" />
                  <XAxis dataKey="a" type="number" domain={[0, 'dataMax']} tickFormatter={axis} tick={{ fontSize: 11, fill: 'var(--muted)' }} />
                  <YAxis tickFormatter={axis} tick={{ fontSize: 11, fill: 'var(--muted)' }} width={52} />
                  <Tooltip
                    contentStyle={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 12, fontSize: 12, color: 'var(--fg)' }}
                    labelFormatter={(v) => t('chart.tipAmount', { amount: won(Number(v ?? 0)) })}
                    formatter={(v) => [costText(Number(v ?? 0)), t('chart.tipCost')]}
                  />
                  {be > 0 && <ReferenceArea x1={0} x2={be} fill="var(--primary)" fillOpacity={0.08} />}
                  <ReferenceLine y={0} stroke="var(--line-strong)" />
                  {be > 0 && <ReferenceLine x={be} stroke="var(--primary)" strokeDasharray="4 3" label={{ value: t('chart.zero'), position: 'top', fontSize: 10, fill: 'var(--primary)' }} />}
                  <Line type="linear" dataKey="cost" stroke="var(--primary)" strokeWidth={2.5} dot={false} isAnimationActive={false} />
                  <ReferenceDot x={r.amount} y={r.cost} r={5} fill="var(--primary)" stroke="var(--surface)" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <p className="text-xs text-muted">{t('chart.note')}</p>

            <div className="overflow-x-auto">
              <table className="w-full text-sm tabular-nums">
                <caption className="text-left text-base font-semibold text-fg mb-2">{t('table.title')}</caption>
                <thead>
                  <tr className="border-b border-line text-muted">
                    <th scope="col" className="text-left font-medium py-2 pr-2">{t('table.amount')}</th>
                    <th scope="col" className="text-right font-medium py-2 px-2">{t('table.saving')}</th>
                    <th scope="col" className="text-right font-medium py-2 px-2">{t('table.gift')}</th>
                    <th scope="col" className="text-right font-medium py-2 pl-2">{t('table.cost')}</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, i) => {
                    const on = PRESETS[i] === amount
                    return (
                      <tr key={i} className={`border-b border-line ${on ? 'bg-primary-soft' : ''}`} aria-current={on ? 'true' : undefined}>
                        <th scope="row" className="text-left font-medium py-3 pr-2 text-body">
                          <button type="button" onClick={() => setAmount(PRESETS[i])} className="min-h-11 text-left hover:underline">
                            {t('manUnit', { n: man(PRESETS[i]), e: short(PRESETS[i]) })}
                          </button>
                        </th>
                        <td className="text-right py-3 px-2 text-sub">{won(row.saving)}</td>
                        <td className="text-right py-3 px-2 text-sub">{won(row.gift)}</td>
                        <td className={`text-right py-3 pl-2 font-semibold ${row.cost < 0 ? 'text-primary' : 'text-fg'}`}>{costText(row.cost)}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-muted">{t('table.note')}</p>
          </div>

          {/* 가이드 */}
          <div className="ui-card p-6 space-y-4">
            <h2 className="text-lg font-semibold text-fg">{t('guide.title')}</h2>
            <ul className="list-disc pl-5 space-y-1.5 text-sm text-sub">
              {(t.raw('guide.items') as string[]).map((s, i) => <li key={i}>{s}</li>)}
            </ul>
          </div>

          <div className="ui-card p-6 space-y-4">
            <h2 className="text-lg font-semibold text-fg">{t('how.title')}</h2>
            <ol className="list-decimal pl-5 space-y-1.5 text-sm text-sub">
              {(t.raw('how.items') as string[]).map((s, i) => <li key={i}>{s}</li>)}
            </ol>
            <div className="rounded-2xl p-5 bg-subtle space-y-2">
              <p className="text-sm font-semibold text-fg">{t('pending.title')}</p>
              <ul className="list-disc pl-5 space-y-1.5 text-sm text-sub">
                {(t.raw('pending.items') as string[]).map((s, i) => <li key={i}>{s}</li>)}
              </ul>
            </div>
            <p className="text-xs text-muted">{t('source')}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
