'use client'

import { useState, useEffect, useMemo, type ReactNode } from 'react'
import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { useTranslations } from '@/lib/i18n'
import { useSearchParams } from '@/hooks/useSearchParams'
import ShareResult from '@/components/ShareResult'
import { RELIEF_LIMIT, type Owner, type Relief } from '@/utils/acquisitionTax'
import { totalCost, LEGAL_FEE, type CostInput, type RepayMethod } from '@/utils/realEstateCost'

// 조정대상지역(2026.7.1): 서울 전역 + 경기 일부 — 목록은 /acquisition-tax 와 같음. 국민주택채권은 서울·광역시가 높은 요율
const REGIONS = ['seoul', 'gyeonggiAdj', 'metroCity', 'other'] as const
type Region = (typeof REGIONS)[number]
const OWNERS: Owner[] = ['1', '2temp', '2', '3', '4']
const RELIEFS: Relief[] = ['none', 'first', 'firstSmall', 'birth']
const METHODS: RepayMethod[] = ['equalPayment', 'equalPrincipal']
const YEARS = [10, 15, 20, 25, 30, 35, 40, 50]
const SCENARIOS = [3, 5, 7, 9, 12, 15]
const EOK = 100_000_000
const MAX = 1_000_000_000_000

const won = (v: number) => Math.round(v).toLocaleString('ko-KR')
const parseNum = (s: string | null) => Number((s ?? '').replace(/[^\d]/g, '')) || 0
const pick = <T extends string>(v: string | null, list: readonly T[], def: T): T => (list.includes(v as T) ? (v as T) : def)
const numOr = (v: string | null, def: number) => (v !== null && v !== '' && Number.isFinite(Number(v)) ? Number(v) : def)

function MoneyInput({ id, label, value, onChange, unit, hint }: {
  id: string; label: ReactNode; value: number; onChange: (v: number) => void; unit: string; hint?: ReactNode
}) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-body mb-2">{label}</label>
      <div className="relative">
        <input
          id={id} type="text" inputMode="numeric" value={value ? value.toLocaleString('ko-KR') : ''}
          onChange={(e) => onChange(Math.min(parseNum(e.target.value), MAX))}
          aria-describedby={hint ? `${id}-u ${id}-h` : `${id}-u`}
          className="ui-field w-full px-4 py-3 pr-10 tabular-nums"
        />
        <span id={`${id}-u`} className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-muted">{unit}</span>
      </div>
      {hint && <p id={`${id}-h`} className="text-xs text-muted mt-1.5">{hint}</p>}
    </div>
  )
}

export default function RealEstateCalculator() {
  const t = useTranslations('realEstate')
  const sp = useSearchParams()

  const [price, setPrice] = useState(() => parseNum(sp.get('p')) || 7 * EOK)
  const [region, setRegion] = useState<Region>(() => pick(sp.get('rg'), REGIONS, 'seoul'))
  const [area, setArea] = useState(() => sp.get('a') ?? '84')
  const [owner, setOwner] = useState<Owner>(() => pick(sp.get('o'), OWNERS, '1'))
  const [relief, setRelief] = useState<Relief>(() => pick(sp.get('rl'), RELIEFS, 'none'))
  const [byLtv, setByLtv] = useState(() => sp.get('lm') !== 'amt')
  const [ltv, setLtv] = useState(() => Math.min(100, Math.max(0, numOr(sp.get('ltv'), 40))))
  const [loanAmt, setLoanAmt] = useState(() => parseNum(sp.get('loan')) || 3 * EOK)
  const [rate, setRate] = useState(() => sp.get('r') ?? '4.0')
  const [years, setYears] = useState(() => numOr(sp.get('y'), 30))
  const [method, setMethod] = useState<RepayMethod>(() => (sp.get('m') === 'ep' ? 'equalPrincipal' : 'equalPayment'))
  const [income, setIncome] = useState(() => numOr(sp.get('inc'), 60_000_000))
  const [vat, setVat] = useState(() => sp.get('vat') !== '0')
  const [legal, setLegal] = useState(() => numOr(sp.get('lg'), LEGAL_FEE))
  const [other, setOther] = useState(() => numOr(sp.get('etc'), 2_000_000))

  useEffect(() => {
    const q = new URLSearchParams()
    q.set('p', String(price))
    q.set('rg', region)
    q.set('a', area)
    if (owner !== '1') q.set('o', owner)
    if (owner === '1' && relief !== 'none') q.set('rl', relief)
    if (byLtv) q.set('ltv', String(ltv))
    else { q.set('lm', 'amt'); q.set('loan', String(loanAmt)) }
    q.set('r', rate)
    q.set('y', String(years))
    if (method === 'equalPrincipal') q.set('m', 'ep')
    q.set('inc', String(income))
    if (!vat) q.set('vat', '0')
    if (legal !== LEGAL_FEE) q.set('lg', String(legal))
    q.set('etc', String(other))
    window.history.replaceState(null, '', `?${q}`)
  }, [price, region, area, owner, relief, byLtv, ltv, loanAmt, rate, years, method, income, vat, legal, other])

  const areaNum = parseFloat(area) || 0
  const input: CostInput = {
    price,
    owner,
    adjusted: region === 'seoul' || region === 'gyeonggiAdj',
    metro: region === 'seoul' || region === 'metroCity',
    over85: areaNum > 85,
    relief: owner === '1' ? relief : 'none',
    loan: byLtv ? Math.round((price * ltv) / 100 / 10_000) * 10_000 : loanAmt,
    rate: parseFloat(rate) || 0,
    years,
    method,
    brokerVat: vat,
    legal,
    other,
    income,
  }
  const r = totalCost(input)

  // 매매가 시나리오: 같은 LTV 비율·조건으로 가격만 바꿈
  const scenarios = useMemo(() => {
    const ratio = price ? r.loan / price : 0
    const list = [...new Set([...SCENARIOS.map((x) => x * EOK), price])].filter((p) => p > 0).sort((a, b) => a - b)
    return list.map((p) => ({ p, res: totalCost({ ...input, price: p, loan: Math.round((p * ratio) / 10_000) * 10_000 }) }))
  }, [price, r.loan, JSON.stringify(input)]) // eslint-disable-line react-hooks/exhaustive-deps

  const W = (v: number) => t('u.wonFmt', { v: won(v) })
  const short = (v: number) => t('u.shortFmt', { eok: +(v / EOK).toFixed(2), m: won(v / 1_000_000) })
  const pctOf = (v: number) => (price ? ((v / price) * 100).toFixed(2) : '0')

  const chart = [
    { k: 'tax', v: r.tax.total },
    { k: 'broker', v: r.broker + r.brokerVat },
    { k: 'registration', v: r.registration },
    { k: 'other', v: r.other },
  ].map((x) => ({ ...x, name: t(`u.chart.${x.k}`) }))

  const seg = (on: boolean) =>
    `min-h-10 px-2 py-2 rounded-lg text-sm font-medium transition-colors ${on ? 'bg-primary text-white' : 'bg-soft text-body hover:bg-subtle'}`
  const toolLink = (href: string, key: string) => (
    <Link href={href} className="inline-flex items-center text-xs font-medium text-primary hover:underline">
      {t(key)}<ChevronRight className="w-3 h-3" aria-hidden="true" />
    </Link>
  )
  const faq = t.raw('u.faq.items') as { q: string; a: string }[]
  const steps = t.raw('u.steps.items') as string[]
  const sources = t.raw('u.sources.items') as { label: string; url: string }[]
  const ownerLabel = `${t(`u.region.${region}`)} · ${t(`u.owner.${owner}`)}`

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-fg">{t('title')}</h1>
        <p className="text-sm text-muted mt-1">{t('u.subtitle')}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* 입력 */}
        <div className="lg:col-span-1 space-y-6">
          <div className="ui-card p-6 space-y-5">
            <h2 className="text-lg font-semibold text-fg">{t('u.house.title')}</h2>
            <div>
              <MoneyInput id="re-price" label={t('u.house.price')} value={price} onChange={setPrice} unit={t('u.won')} hint={short(price)} />
              <input
                type="range" min={EOK} max={30 * EOK} step={EOK / 10} value={Math.min(Math.max(price, EOK), 30 * EOK)}
                onChange={(e) => setPrice(Number(e.target.value))} aria-label={t('u.house.price')} aria-valuetext={short(price)}
                className="w-full mt-2 accent-[var(--primary)]"
              />
            </div>

            <div>
              <label htmlFor="re-region" className="block text-sm font-medium text-body mb-2">{t('u.region.label')}</label>
              <select id="re-region" value={region} onChange={(e) => setRegion(e.target.value as Region)} aria-describedby="re-region-h" className="ui-field w-full px-4 py-3">
                {REGIONS.map((g) => <option key={g} value={g}>{t(`u.region.${g}`)}</option>)}
              </select>
              <p id="re-region-h" className="text-xs text-muted mt-1.5">{t(input.adjusted ? 'u.region.isAdj' : 'u.region.isNon')}</p>
            </div>

            <div>
              <label htmlFor="re-area" className="block text-sm font-medium text-body mb-2">{t('u.house.area')}</label>
              <div className="relative">
                <input id="re-area" type="number" inputMode="decimal" min={0} value={area} onChange={(e) => setArea(e.target.value)} aria-describedby="re-area-u re-area-h" className="ui-field w-full px-4 py-3 pr-10" />
                <span id="re-area-u" className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-muted">㎡</span>
              </div>
              <p id="re-area-h" className="text-xs text-muted mt-1.5">{t(input.over85 ? 'u.house.over85' : 'u.house.under85')}</p>
            </div>

            <div>
              <p id="re-owner" className="block text-sm font-medium text-body mb-2">{t('u.owner.label')}</p>
              <div className="grid grid-cols-3 gap-2" role="group" aria-labelledby="re-owner">
                {OWNERS.map((o) => (
                  <button key={o} type="button" onClick={() => setOwner(o)} aria-pressed={owner === o} className={seg(owner === o)}>{t(`u.owner.${o}`)}</button>
                ))}
              </div>
              <p className="text-xs text-muted mt-1.5">{t('u.owner.hint')}</p>
            </div>

            {owner === '1' && (
              <div>
                <label htmlFor="re-relief" className="block text-sm font-medium text-body mb-2">{t('u.relief.label')}</label>
                <select id="re-relief" value={relief} onChange={(e) => setRelief(e.target.value as Relief)} className="ui-field w-full px-4 py-3">
                  {RELIEFS.map((x) => <option key={x} value={x}>{t(`u.relief.${x}`)}</option>)}
                </select>
                {relief !== 'none' && <p className="text-xs text-muted mt-1.5">{t(`u.relief.${relief}Hint`, { limit: won(RELIEF_LIMIT[relief]) })}</p>}
              </div>
            )}
          </div>

          <div className="ui-card p-6 space-y-5">
            <h2 className="text-lg font-semibold text-fg">{t('u.loan.title')}</h2>
            <div className="grid grid-cols-2 gap-2" role="group" aria-label={t('a11y.loanInput')}>
              <button type="button" onClick={() => setByLtv(true)} aria-pressed={byLtv} className={seg(byLtv)}>{t('u.loan.byLtv')}</button>
              <button type="button" onClick={() => setByLtv(false)} aria-pressed={!byLtv} className={seg(!byLtv)}>{t('u.loan.byAmount')}</button>
            </div>
            {byLtv ? (
              <div>
                <label htmlFor="re-ltv" className="flex justify-between text-sm font-medium text-body mb-2">
                  <span>{t('u.loan.ltv')}</span><span className="tabular-nums text-fg">{ltv}% · {short(r.loan)}</span>
                </label>
                <input id="re-ltv" type="range" min={0} max={80} step={5} value={ltv} aria-valuetext={`${ltv}% · ${short(r.loan)}`} onChange={(e) => setLtv(Number(e.target.value))} className="w-full accent-[var(--primary)]" />
              </div>
            ) : (
              <MoneyInput id="re-loan" label={t('u.loan.amount')} value={loanAmt} onChange={setLoanAmt} unit={t('u.won')}
                hint={`${short(loanAmt)} · LTV ${r.ltv.toFixed(1)}%`} />
            )}
            <p className="text-xs text-muted -mt-2">{t('u.loan.ltvHint')}</p>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="re-rate" className="block text-sm font-medium text-body mb-2">{t('u.loan.rate')}</label>
                <div className="relative">
                  <input id="re-rate" type="text" inputMode="decimal" value={rate}
                    onChange={(e) => /^\d{0,2}(\.\d{0,2})?$/.test(e.target.value) && setRate(e.target.value)}
                    aria-describedby="re-rate-u"
                    className="ui-field w-full px-4 py-3 pr-8 tabular-nums" />
                  <span id="re-rate-u" className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-muted">%</span>
                </div>
              </div>
              <div>
                <label htmlFor="re-years" className="block text-sm font-medium text-body mb-2">{t('u.loan.years')}</label>
                <select id="re-years" value={years} onChange={(e) => setYears(Number(e.target.value))} className="ui-field w-full px-4 py-3">
                  {(YEARS.includes(years) ? YEARS : [...YEARS, years].sort((a, b) => a - b)).map((y) => <option key={y} value={y}>{t('u.loan.yearsOpt', { y })}</option>)}
                </select>
              </div>
            </div>

            <div>
              <p id="re-method" className="block text-sm font-medium text-body mb-2">{t('u.loan.method')}</p>
              <div className="grid grid-cols-2 gap-2" role="group" aria-labelledby="re-method">
                {METHODS.map((m) => <button key={m} type="button" onClick={() => setMethod(m)} aria-pressed={method === m} className={seg(method === m)}>{t(`u.loan.${m}`)}</button>)}
              </div>
            </div>

            <MoneyInput id="re-income" label={t('u.loan.income')} value={income} onChange={setIncome} unit={t('u.won')} hint={t('u.loan.incomeHint')} />
          </div>

          <div className="ui-card p-6 space-y-5">
            <h2 className="text-lg font-semibold text-fg">{t('u.extra.title')}</h2>
            <label htmlFor="re-vat" className="flex items-start gap-2.5 cursor-pointer">
              <input id="re-vat" type="checkbox" checked={vat} onChange={(e) => setVat(e.target.checked)} className="mt-0.5 w-4 h-4 accent-[var(--primary)]" />
              <span className="text-sm text-body">{t('u.extra.vat')}<span className="block text-xs text-muted mt-0.5">{t('u.extra.vatHint')}</span></span>
            </label>
            <MoneyInput id="re-legal" label={t('u.extra.legal')} value={legal} onChange={setLegal} unit={t('u.won')} hint={t('u.extra.legalHint')} />
            <MoneyInput id="re-other" label={t('u.extra.other')} value={other} onChange={setOther} unit={t('u.won')}
              hint={<>{t('u.extra.otherHint')} {toolLink('/moving-cost', 'u.link.moving')}</>} />
          </div>
        </div>

        {/* 결과 */}
        <div className="lg:col-span-2 space-y-6">
          <div className="ui-card p-6 space-y-5">
            <div>
              <p className="text-sm text-muted">{t('u.result.label', { price: short(price) })}</p>
              <p className="text-3xl font-bold text-fg tabular-nums mt-1" aria-live="polite">{W(r.cash)}</p>
              <p className="text-sm text-sub mt-1">
                {t('u.result.sub', { equity: short(r.equity), fees: W(r.fees), pct: pctOf(r.fees) })}
              </p>
            </div>

            <div className="divide-y divide-line border-y border-line">
              <div className="flex items-center justify-between py-3 gap-3">
                <div>
                  <p className="text-sm font-medium text-body">{t('u.result.equity')}</p>
                  <p className="text-xs text-muted">{t('u.result.equityHint', { loan: short(r.loan) })}</p>
                </div>
                <p className="text-base font-semibold text-fg tabular-nums">{W(r.equity)}</p>
              </div>
              <div className="flex items-center justify-between py-3 gap-3">
                <div>
                  <p className="text-sm font-medium text-body">{t('u.result.tax')}</p>
                  <p className="text-xs text-muted">
                    {t('u.result.taxHint', { rate: (r.tax.rate * 100).toFixed(4).replace(/\.?0+$/, ''), eff: r.tax.effRate.toFixed(2) })} {toolLink('/acquisition-tax', 'u.link.tax')}
                  </p>
                </div>
                <p className="text-base font-semibold text-fg tabular-nums">{W(r.tax.total)}</p>
              </div>
              <div className="flex items-center justify-between py-3 gap-3">
                <div>
                  <p className="text-sm font-medium text-body">{t('u.result.broker')}</p>
                  <p className="text-xs text-muted">
                    {vat ? t('u.result.brokerVat', { fee: won(r.broker), vat: won(r.brokerVat) }) : t('u.result.brokerNoVat')} {toolLink('/brokerage-fee', 'u.link.broker')}
                  </p>
                </div>
                <p className="text-base font-semibold text-fg tabular-nums">{W(r.broker + r.brokerVat)}</p>
              </div>
              <div className="py-3 space-y-1.5">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-medium text-body">{t('u.result.registration')}</p>
                  <p className="text-base font-semibold text-fg tabular-nums">{W(r.registration)}</p>
                </div>
                {(['bond', 'stamp', 'legal'] as const).map((k) => (
                  <div key={k} className="flex items-center justify-between text-xs text-muted pl-3">
                    <span>{t(`u.result.${k}`)}</span><span className="tabular-nums">{W(r[k])}</span>
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-between py-3 gap-3">
                <p className="text-sm font-medium text-body">{t('u.result.other')}</p>
                <p className="text-base font-semibold text-fg tabular-nums">{W(r.other)}</p>
              </div>
            </div>

            {r.tax.relief > 0 && (
              <div className="bg-primary-soft text-primary rounded-2xl p-4 text-sm">
                {t('u.result.reliefApplied', { name: t(`u.relief.${relief}`), amount: won(r.tax.relief + (r.tax.eduGross - r.tax.edu)) })}
              </div>
            )}
            {(r.tax.heavy || r.tax.reliefBlocked === 'price') && (
              <div className="bg-amber-50 text-amber-800 rounded-2xl p-4 text-sm space-y-1">
                {r.tax.heavy && <p>{t('u.result.heavyWarn', { rate: (r.tax.rate * 100).toFixed(0) })}</p>}
                {r.tax.reliefBlocked === 'price' && <p>{t('u.result.reliefPriceBlocked')}</p>}
              </div>
            )}

            <ShareResult
              card={{
                tool: t('title'),
                label: t('u.share.label', { price: short(price) }),
                headline: W(r.cash),
                sub: `${ownerLabel} · ${t('u.share.loan', { loan: short(r.loan), monthly: won(r.monthly) })}`,
                rows: [
                  { label: t('u.result.equity'), value: W(r.equity) },
                  { label: t('u.result.tax'), value: W(r.tax.total) },
                  { label: t('u.result.broker'), value: W(r.broker + r.brokerVat) },
                  { label: t('u.result.registration'), value: W(r.registration) },
                  { label: t('u.result.other'), value: W(r.other) },
                ],
              }}
              text={t('u.share.text', { price: short(price), cash: W(r.cash), fees: W(r.fees) })}
            />
          </div>

          {/* 대출 */}
          <div className="ui-card p-6 space-y-4">
            <div className="flex items-start justify-between gap-3">
              <h2 className="text-lg font-semibold text-fg">{t('u.repay.title')}</h2>
              {toolLink('/loan-calculator', 'u.link.loan')}
            </div>
            {r.loan > 0 ? (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { k: method === 'equalPrincipal' ? 'firstMonth' : 'monthly', v: W(r.monthly), big: true },
                    { k: 'interest', v: W(r.totalInterest) },
                    { k: 'ltv', v: `${r.ltv.toFixed(1)}%` },
                    { k: 'dsr', v: r.dsr === null ? '-' : `${r.dsr.toFixed(1)}%` },
                  ].map((x) => (
                    <div key={x.k} className="bg-subtle rounded-2xl p-4">
                      <p className="text-xs text-muted">{t(`u.repay.${x.k}`)}</p>
                      <p className={`${x.big ? 'text-xl' : 'text-lg'} font-bold text-fg tabular-nums mt-1`}>{x.v}</p>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-muted">
                  {t('u.repay.dsrNote')} {toolLink('/dsr-calculator', 'u.link.dsr')}
                </p>
                {r.dsr !== null && r.dsr > 40 && (
                  <div className="bg-amber-50 text-amber-800 rounded-2xl p-4 text-sm">{t('u.repay.dsrWarn', { dsr: r.dsr.toFixed(1) })}</div>
                )}
              </>
            ) : (
              <p className="text-sm text-muted">{t('u.repay.noLoan')}</p>
            )}
          </div>

          {/* 부대비용 구성 */}
          <div className="ui-card p-6">
            <h2 className="text-lg font-semibold text-fg">{t('u.chart.title')}</h2>
            <p className="text-sm text-muted mt-1">{t('u.chart.desc', { fees: W(r.fees), pct: pctOf(r.fees) })}</p>
            {/* 위 결과 카드의 항목별 금액과 같은 데이터 → 스크린리더에서는 숨김 */}
            <div className="h-52 mt-4" aria-hidden="true">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chart} layout="vertical" margin={{ top: 0, right: 16, left: 0, bottom: 0 }}>
                  <XAxis type="number" hide />
                  <YAxis type="category" dataKey="name" width={92} tick={{ fontSize: 12, fill: 'var(--muted)' }} stroke="var(--line)" />
                  <Tooltip cursor={{ fill: 'var(--soft)' }} formatter={(v) => [W(Number(v ?? 0)), '']} />
                  <Bar dataKey="v" radius={[0, 6, 6, 0]}>
                    {chart.map((x) => <Cell key={x.k} fill={x.k === 'tax' ? 'var(--primary)' : 'var(--faint)'} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* 매매가 시나리오 */}
          <div className="ui-card p-6 space-y-4">
            <div>
              <h2 className="text-lg font-semibold text-fg">{t('u.scenario.title')}</h2>
              <p className="text-sm text-muted mt-1">{t('u.scenario.desc', { ltv: r.ltv.toFixed(0), cond: ownerLabel })}</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm whitespace-nowrap">
                <thead>
                  <tr className="border-b border-line text-muted">
                    {(['price', 'loan', 'fees', 'cash', 'monthly'] as const).map((k, i) => (
                      <th key={k} scope="col" className={`${i ? 'text-right' : 'text-left'} font-medium py-2 px-1`}>{t(`u.scenario.${k}`)}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {scenarios.map(({ p, res }) => {
                    const cur = p === price
                    return (
                      <tr key={p} className={`border-b border-line ${cur ? 'bg-primary-soft' : ''}`}>
                        <td className="py-2.5 px-1">
                          <button type="button" onClick={() => setPrice(p)} aria-pressed={cur} aria-label={t('a11y.usePrice', { price: short(p) })} className={`min-h-10 tabular-nums ${cur ? 'text-primary font-semibold' : 'text-body hover:text-primary'}`}>{short(p)}</button>
                        </td>
                        <td className="py-2.5 px-1 text-right tabular-nums text-sub">{short(res.loan)}</td>
                        <td className="py-2.5 px-1 text-right tabular-nums text-sub">{W(res.fees)}</td>
                        <td className="py-2.5 px-1 text-right tabular-nums font-semibold text-fg">{short(res.cash)}</td>
                        <td className="py-2.5 px-1 text-right tabular-nums text-sub">{W(res.monthly)}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-faint">{t('u.scenario.note')}</p>
          </div>
        </div>
      </div>

      {/* 가이드 */}
      <div className="ui-card p-6 space-y-8">
        <div>
          <h2 className="text-xl font-semibold text-fg mb-4">{t('u.steps.title')}</h2>
          <ol className="space-y-2 text-sm text-body list-decimal list-inside">
            {steps.map((s) => <li key={s}>{s}</li>)}
          </ol>
          <div className="flex flex-wrap gap-x-4 gap-y-2 mt-4">
            {toolLink('/acquisition-tax', 'u.link.tax')}
            {toolLink('/brokerage-fee', 'u.link.broker')}
            {toolLink('/dsr-calculator', 'u.link.dsr')}
            {toolLink('/loan-calculator', 'u.link.loan')}
            {toolLink('/bogeumjari-loan', 'u.link.bogeumjari')}
            {toolLink('/capital-gains-tax', 'u.link.capitalGains')}
            {toolLink('/comprehensive-property-tax', 'u.link.propertyTax')}
            {toolLink('/jeonse-loan', 'u.link.jeonse')}
          </div>
        </div>

        <div>
          <h2 className="text-xl font-semibold text-fg mb-4">{t('u.faq.title')}</h2>
          <div className="divide-y divide-line">
            {faq.map((f) => (
              <details key={f.q} className="py-3 group">
                <summary className="cursor-pointer text-sm font-medium text-fg">{f.q}</summary>
                <p className="text-sm text-sub mt-2 leading-relaxed">{f.a}</p>
              </details>
            ))}
          </div>
        </div>

        <div className="bg-subtle rounded-2xl p-5 text-sm text-sub space-y-2">
          <p className="font-medium text-body">{t('u.sources.title')}</p>
          <ul className="space-y-1">
            {sources.map((s) => (
              <li key={s.url}><a href={s.url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">{s.label}</a></li>
            ))}
          </ul>
          <p className="text-xs text-muted">{t('u.sources.asOf')}</p>
        </div>
      </div>
    </div>
  )
}
