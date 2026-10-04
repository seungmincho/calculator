'use client'

/**
 * SalesCommissionCalculator — 영업 커미션·인센티브 계산기 + 오픈마켓 판매수수료 비교
 * Translation namespace: salesCommissionCalc  (영업 커미션 = sc.*, 오픈마켓 = input/category/platform/naver/elevenst/fee/result/compare/notes/guide)
 * 계산 로직: src/utils/salesCommission.ts, 오픈마켓 src/utils/marketplaceFees.ts (회귀: node scripts/check-sales-commission.ts)
 */

import { useState, useMemo, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useSearchParams } from '@/hooks/useSearchParams'
import { useTranslations } from '@/lib/i18n'
import '@/lib/i18n/ns/salesCommissionCalc'
import { Plus, X } from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ResponsiveContainer } from 'recharts'
import ShareResult from '@/components/ShareResult'
import {
  PLAN_A, PLAN_B, calc, rawCommission, supplyValue, nextBoundary, niceStep, encodePlan, decodePlan,
  type Plan, type Structure, type TaxMode, type Tier,
} from '@/utils/salesCommission'
// 오픈마켓 요율·출처(확인일)·계산: src/utils/marketplaceFees.ts
import {
  marketFees, CATEGORY_KEYS, PLATFORM_KEYS, NAVER_TIERS, NAVER_ORDER_MGMT, NAVER_SALES, COUPANG_SALES, ELEVENST_DEFAULT,
  type CategoryKey, type NaverTier, type NaverInflow, type MarketInput,
} from '@/utils/marketplaceFees'

const STRUCTURES: Structure[] = ['flat', 'tiered', 'target', 'perDeal']
const TAXES: TaxMode[] = ['freelance', 'employee', 'none']
const TAX_CODE: Record<TaxMode, string> = { freelance: 'f', employee: 'e', none: 'n' }
const DEFAULT_SALES = 25_000_000

const won = (n: number) => Math.round(n).toLocaleString('ko-KR')
const num = (v: string | null, d: number) => { const n = Number(v); return v != null && v !== '' && Number.isFinite(n) && n >= 0 ? n : d }
const seg = (on: boolean) =>
  `px-3 py-2 rounded-lg text-sm font-medium transition-colors ${on ? 'bg-primary text-white' : 'bg-soft text-body hover:bg-subtle'}`
const chartMaxFor = (sales: number) => Math.max(100_000_000, Math.ceil((sales * 1.5) / 10_000_000) * 10_000_000)

function Money({ id, label, value, onChange, hint, disabled }: { id: string; label: string; value: number; onChange: (n: number) => void; hint?: string; disabled?: boolean }) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-body mb-1.5">{label}</label>
      <input
        id={id} type="text" inputMode="numeric" disabled={disabled}
        value={value ? value.toLocaleString('ko-KR') : '0'}
        onChange={(e) => onChange(Math.min(1e13, Number(e.target.value.replace(/[^0-9]/g, '')) || 0))}
        className="ui-field w-full px-4 py-2.5 text-right tabular-nums disabled:opacity-60"
      />
      {hint && <p className="text-xs text-muted mt-1">{hint}</p>}
    </div>
  )
}

function Pct({ id, label, value, onChange, max = 100, step = 0.1, hint }: { id: string; label: string; value: number; onChange: (n: number) => void; max?: number; step?: number; hint?: string }) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-body mb-1.5">{label}</label>
      <input
        id={id} type="number" min={0} max={max} step={step} value={value}
        onChange={(e) => onChange(Math.min(max, Math.max(0, Number(e.target.value) || 0)))}
        className="ui-field w-full px-4 py-2.5 text-right tabular-nums"
      />
      {hint && <p className="text-xs text-muted mt-1">{hint}</p>}
    </div>
  )
}

export default function SalesCommissionCalculator() {
  const t = useTranslations('salesCommissionCalc')
  const searchParams = useSearchParams()
  const ready = useRef(false)

  const [mode, setMode] = useState<'commission' | 'market'>('market')
  // 영업 커미션
  const [sales, setSales] = useState(DEFAULT_SALES)
  const [chartMax, setChartMax] = useState(chartMaxFor(DEFAULT_SALES))
  const [vatIncl, setVatIncl] = useState(false)
  const [tax, setTax] = useState<TaxMode>('freelance')
  const [plans, setPlans] = useState<Plan[]>([PLAN_A])
  const [active, setActive] = useState(0)
  // 오픈마켓
  const [price, setPrice] = useState(30_000)
  const [shipping, setShipping] = useState(3_000)
  const [category, setCategory] = useState<CategoryKey>('fashion')
  const [naverTier, setNaverTier] = useState<NaverTier>('micro')
  const [inflow, setInflow] = useState<NaverInflow>('normal')
  const [elevenstRate, setElevenstRate] = useState(ELEVENST_DEFAULT)

  // URL → 상태 (한 번)
  useEffect(() => {
    if (ready.current) return
    const g = (k: string) => searchParams.get(k)
    if (g('mode') === 'commission') setMode('commission')
    const s = num(g('s'), DEFAULT_SALES)
    setSales(s); setChartMax(chartMaxFor(s))
    setVatIncl(g('v') === '1')
    const tx = TAXES.find((k) => TAX_CODE[k] === g('tx')); if (tx) setTax(tx)
    const a = decodePlan(g('a')), b = decodePlan(g('b'))
    if (a || b) setPlans([a ?? PLAN_A, ...(b ? [b] : [])])
    setPrice(num(g('p'), 30_000)); setShipping(num(g('sh'), 3_000))
    const c = CATEGORY_KEYS.find((k) => k === g('c')); if (c) setCategory(c)
    const nt = NAVER_TIERS.find((k) => k === g('nt')); if (nt) setNaverTier(nt)
    if (g('ni') === 'm') setInflow('marketing')
    setElevenstRate(Math.min(30, num(g('er'), ELEVENST_DEFAULT)))
    ready.current = true
  }, [searchParams])

  // 상태 → URL (공유 링크가 결과를 재현)
  useEffect(() => {
    if (!ready.current) return
    const p = new URLSearchParams()
    if (mode === 'market') {
      p.set('p', String(price)); p.set('sh', String(shipping)); p.set('c', category); p.set('nt', naverTier)
      if (inflow === 'marketing') p.set('ni', 'm')
      if (elevenstRate !== ELEVENST_DEFAULT) p.set('er', String(elevenstRate))
    } else {
      p.set('mode', 'commission'); p.set('s', String(sales)); if (vatIncl) p.set('v', '1'); p.set('tx', TAX_CODE[tax])
      p.set('a', encodePlan(plans[0])); if (plans[1]) p.set('b', encodePlan(plans[1]))
    }
    window.history.replaceState(null, '', `${window.location.pathname}?${p}`)
  }, [mode, sales, vatIncl, tax, plans, price, shipping, category, naverTier, inflow, elevenstRate])

  const idx = Math.min(active, plans.length - 1)
  const plan = plans[idx]
  const planName = (i: number) => t(i === 0 ? 'sc.plan.a' : 'sc.plan.b')
  const setPlan = (patch: Partial<Plan>) => setPlans((ps) => ps.map((p, i) => (i === idx ? { ...p, ...patch } : p)))
  const setTier = (i: number, patch: Partial<Tier>) => setPlan({ tiers: plan.tiers.map((x, j) => (j === i ? { ...x, ...patch } : x)) })

  const results = useMemo(() => plans.map((p) => calc(p, sales, vatIncl, tax)), [plans, sales, vatIncl, tax])
  const res = results[idx]
  const headlineValue = tax === 'freelance' ? res.net : res.gross

  // 인사이트: +증분 매출 효과, 다음 경계
  const step = niceStep(sales * 0.1)
  const stepGain = calc(plan, sales + step, vatIncl, tax).commission - res.commission
  const vatMul = vatIncl ? 1.1 : 1
  const boundary = nextBoundary(plan, res.sales) // 공급가액 기준
  const boundaryInput = boundary != null ? Math.ceil(boundary * vatMul) : null
  const atBoundary = boundaryInput != null ? calc(plan, boundaryInput, vatIncl, tax).commission : 0

  // 커브 데이터 (입력 매출 기준 x축)
  const chart = useMemo(() => {
    const n = 60
    return Array.from({ length: n + 1 }, (_, i) => {
      const x = Math.round((chartMax * i) / n)
      const row: Record<string, number> = { x: x / 10_000 }
      plans.forEach((p, j) => { row[`p${j}`] = Math.floor((rawCommission(p, supplyValue(x, vatIncl)) * p.split) / 100 + p.base) / 10_000 })
      return row
    })
  }, [plans, chartMax, vatIncl])

  // A vs B 손익분기 매출 (A가 B 이상이 되는 최저 매출, 10만원 단위 탐색)
  const crossover = useMemo(() => {
    if (plans.length < 2) return null
    const net = (p: Plan, s: number) => calc(p, s, vatIncl, tax).net
    const aLeads = net(plans[0], 0) >= net(plans[1], 0)
    for (let s = 100_000; s <= chartMax * 2; s += 100_000) {
      if ((net(plans[0], s) >= net(plans[1], s)) !== aLeads) return { sales: s, winner: aLeads ? 1 : 0 }
    }
    return null
  }, [plans, vatIncl, tax, chartMax])

  // 누진 구간별 내역
  const tierRows = useMemo(() => {
    if (plan.structure !== 'tiered') return []
    const ts = [...plan.tiers].sort((a, b) => a.from - b.from)
    return ts.map((x, i) => {
      const hi = ts[i + 1]?.from ?? Infinity
      const part = plan.tierMode === 'marginal' ? Math.max(0, Math.min(res.sales, hi) - x.from) : (res.sales >= x.from && res.sales < hi ? res.sales : 0)
      return { from: x.from, to: hi, rate: x.rate, part, amount: Math.floor((part * x.rate) / 100 + 1e-6) }
    })
  }, [plan, res.sales])

  const reset = () => { setSales(DEFAULT_SALES); setChartMax(chartMaxFor(DEFAULT_SALES)); setVatIncl(false); setTax('freelance'); setPlans([PLAN_A]); setActive(0) }

  const heroLabel = t('sc.hero.label', { sales: won(sales), plan: planName(idx) })
  const heroTitle = t(tax === 'freelance' ? 'sc.hero.net' : 'sc.hero.gross')
  const insightStep = t('sc.insight.step', { step: won(step), gain: won(stepGain) })
  const insightNext = boundaryInput != null
    ? t('sc.insight.next', { left: won(boundaryInput - sales), at: won(boundaryInput), gain: won(atBoundary - res.commission) })
    : t('sc.insight.noNext')

  // ── 오픈마켓 ──
  // 세 곳 모두 같은 판매가·배송비, 건당 수수료(부가세 포함)로 비교. 월정액·광고비는 제외.
  const mkInput: MarketInput = { price, shipping, category, tier: naverTier, inflow, elevenstRate }
  const market = PLATFORM_KEYS.map((pk) => marketFees(pk, mkInput))
  const best = market.reduce((a, b) => (b.total < a.total ? b : a))
  const assumptions = t('result.assumptions', {
    tier: t(`naver.tier.${naverTier}`), inflow: t(`naver.inflow.${inflow}`), category: t(`category.${category}`),
    coupang: COUPANG_SALES[category], elevenst: elevenstRate,
  })

  const rowsBreakdown: { label: string; m: number; strong?: boolean; minus?: boolean }[] = [
    ...(vatIncl ? [{ label: t('sc.table.supply'), m: res.sales }] : []),
    { label: t('sc.table.raw'), m: res.raw },
    ...(plan.split < 100 ? [{ label: t('sc.table.mine', { split: plan.split }), m: res.commission }] : []),
    ...(plan.base ? [{ label: t('sc.table.base'), m: res.base }] : []),
    { label: t('sc.table.gross'), m: res.gross, strong: tax !== 'freelance' },
    ...(tax === 'freelance' ? [
      { label: t('sc.table.incomeTax'), m: res.tax.incomeTax, minus: true },
      { label: t('sc.table.localTax'), m: res.tax.localTax, minus: true },
      { label: t('sc.table.net'), m: res.net, strong: true },
    ] : []),
  ]

  const compareRows: { label: string; v: (i: number) => number }[] = [
    { label: t('sc.table.raw'), v: (i) => results[i].commission },
    { label: t('sc.table.base'), v: (i) => results[i].base },
    { label: t('sc.table.gross'), v: (i) => results[i].gross },
    ...(tax === 'freelance' ? [
      { label: t('sc.table.withholding'), v: (i: number) => results[i].tax.total },
      { label: t('sc.table.net'), v: (i: number) => results[i].net },
    ] : []),
    { label: t('sc.table.annual'), v: (i) => results[i].net * 12 },
  ]

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-fg">{t('title')}</h1>
        <p className="text-sm text-muted mt-1">{t('description')}</p>
        <p className="text-sm text-sub mt-2">
          {t('sc.intentNote')}{' '}
          <Link href="/bonus-calculator" className="font-semibold text-primary underline underline-offset-2">{t('sc.link.bonus')}</Link>
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2 max-w-md" role="tablist">
        <button role="tab" aria-selected={mode === 'market'} className={seg(mode === 'market')} onClick={() => setMode('market')}>{t('mode.market')}</button>
        <button role="tab" aria-selected={mode === 'commission'} className={seg(mode === 'commission')} onClick={() => setMode('commission')}>{t('mode.commission')}</button>
      </div>

      {/* ───────────── 영업 커미션 ───────────── */}
      <section hidden={mode !== 'commission'} className="space-y-8">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* 입력 */}
          <div className="lg:col-span-1 space-y-6">
            <div className="ui-card p-6 space-y-4">
              <Money id="sc-sales" label={t('sc.sales')} value={sales} onChange={(n) => { setSales(n); setChartMax(chartMaxFor(n)) }} />
              <input
                type="range" min={0} max={chartMax} step={100_000} value={Math.min(sales, chartMax)}
                onChange={(e) => setSales(Number(e.target.value))} aria-label={t('sc.slider')}
                className="w-full accent-primary"
              />
              <div className="flex flex-wrap gap-2">
                {[5_000_000, 10_000_000, 30_000_000, 50_000_000, 100_000_000].map((v) => (
                  <button key={v} className={seg(sales === v)} onClick={() => { setSales(v); setChartMax(chartMaxFor(v)) }}>{t('sc.presetMan', { n: won(v / 10_000), m: won(v / 1_000_000) })}</button>
                ))}
              </div>
              <div>
                <p className="text-sm font-medium text-body mb-1.5">{t('sc.vat.title')}</p>
                <div className="grid grid-cols-2 gap-2">
                  <button className={seg(!vatIncl)} onClick={() => setVatIncl(false)}>{t('sc.vat.excl')}</button>
                  <button className={seg(vatIncl)} onClick={() => setVatIncl(true)}>{t('sc.vat.incl')}</button>
                </div>
                <p className="text-xs text-muted mt-1">{t('sc.vat.hint')}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-body mb-1.5">{t('sc.tax.title')}</p>
                <div className="grid grid-cols-3 gap-2">
                  {TAXES.map((k) => <button key={k} className={seg(tax === k)} onClick={() => setTax(k)}>{t(`sc.tax.${k}`)}</button>)}
                </div>
                <p className="text-xs text-muted mt-1">{t(`sc.tax.${tax}Hint`)}</p>
              </div>
            </div>

            <div className="ui-card p-6 space-y-4">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-lg font-semibold text-fg">{t('sc.plan.title')}</h2>
                {plans.length < 2 ? (
                  <button className="ui-btn-soft px-3 py-1.5 text-sm inline-flex items-center gap-1" onClick={() => { setPlans([plans[0], PLAN_B]); setActive(1) }}>
                    <Plus className="w-4 h-4" aria-hidden />{t('sc.plan.addB')}
                  </button>
                ) : (
                  <button className="ui-btn-soft px-3 py-1.5 text-sm inline-flex items-center gap-1" onClick={() => { setPlans([plans[0]]); setActive(0) }}>
                    <X className="w-4 h-4" aria-hidden />{t('sc.plan.removeB')}
                  </button>
                )}
              </div>
              {plans.length > 1 && (
                <div className="grid grid-cols-2 gap-2">
                  {plans.map((_, i) => <button key={i} className={seg(idx === i)} onClick={() => setActive(i)}>{planName(i)}</button>)}
                </div>
              )}

              <div>
                <p className="text-sm font-medium text-body mb-1.5">{t('sc.structure.title')}</p>
                <div className="grid grid-cols-2 gap-2">
                  {STRUCTURES.map((k) => <button key={k} className={seg(plan.structure === k)} onClick={() => setPlan({ structure: k })}>{t(`sc.structure.${k}`)}</button>)}
                </div>
                <p className="text-xs text-muted mt-1.5">{t(`sc.structure.${plan.structure}Desc`)}</p>
              </div>

              {plan.structure === 'flat' && <Pct id="sc-rate" label={t('sc.field.rate')} value={plan.rate} onChange={(rate) => setPlan({ rate })} />}

              {plan.structure === 'tiered' && (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <button className={seg(plan.tierMode === 'marginal')} onClick={() => setPlan({ tierMode: 'marginal' })}>{t('sc.field.marginal')}</button>
                    <button className={seg(plan.tierMode === 'whole')} onClick={() => setPlan({ tierMode: 'whole' })}>{t('sc.field.whole')}</button>
                  </div>
                  <p className="text-xs text-muted">{t(plan.tierMode === 'marginal' ? 'sc.field.marginalHint' : 'sc.field.wholeHint')}</p>
                  {plan.tiers.map((x, i) => (
                    <div key={i} className="flex items-end gap-2">
                      <div className="flex-1"><Money id={`sc-tf${i}`} label={t('sc.field.tierFrom')} value={x.from} disabled={i === 0} onChange={(from) => setTier(i, { from })} /></div>
                      <div className="w-24"><Pct id={`sc-tr${i}`} label={t('sc.field.tierRate')} value={x.rate} onChange={(rate) => setTier(i, { rate })} /></div>
                      {i > 0 && (
                        <button aria-label={t('sc.field.removeTier')} className="ui-btn-soft p-2.5 mb-0.5" onClick={() => setPlan({ tiers: plan.tiers.filter((_, j) => j !== i) })}>
                          <X className="w-4 h-4" aria-hidden />
                        </button>
                      )}
                    </div>
                  ))}
                  {plan.tiers.length < 6 && (
                    <button className="ui-btn-soft w-full px-3 py-2 text-sm" onClick={() => {
                      const last = plan.tiers[plan.tiers.length - 1]
                      setPlan({ tiers: [...plan.tiers, { from: (last?.from ?? 0) + 20_000_000, rate: (last?.rate ?? 0) + 2 }] })
                    }}>{t('sc.field.addTier')}</button>
                  )}
                </div>
              )}

              {plan.structure === 'target' && (
                <div className="space-y-3">
                  <Money id="sc-target" label={t('sc.field.target')} value={plan.target} onChange={(target) => setPlan({ target })} />
                  <div className="grid grid-cols-2 gap-3">
                    <Pct id="sc-trate" label={t('sc.field.targetRate')} value={plan.targetRate} onChange={(targetRate) => setPlan({ targetRate })} />
                    <Pct id="sc-accel" label={t('sc.field.accel')} value={plan.accel} max={10} onChange={(accel) => setPlan({ accel })} />
                  </div>
                  <Pct id="sc-th" label={t('sc.field.threshold')} value={plan.threshold} max={200} step={5} hint={t('sc.field.thresholdHint')} onChange={(threshold) => setPlan({ threshold })} />
                </div>
              )}

              {plan.structure === 'perDeal' && (
                <div className="space-y-3">
                  <Money id="sc-pd" label={t('sc.field.perDeal')} value={plan.perDeal} onChange={(perDeal) => setPlan({ perDeal })} />
                  <Money id="sc-avg" label={t('sc.field.avgDeal')} value={plan.avgDeal} hint={t('sc.field.avgDealHint')} onChange={(avgDeal) => setPlan({ avgDeal })} />
                </div>
              )}

              <Money id="sc-base" label={t('sc.field.base')} value={plan.base} hint={t('sc.field.baseHint')} onChange={(base) => setPlan({ base })} />
              <Pct id="sc-split" label={t('sc.field.split')} value={plan.split} step={5} hint={t('sc.field.splitHint')} onChange={(split) => setPlan({ split })} />
            </div>

            <button onClick={reset} className="ui-btn-soft w-full px-4 py-2">{t('sc.reset')}</button>
          </div>

          {/* 결과 */}
          <div className="lg:col-span-2 space-y-6">
            <div className="ui-hero p-6">
              <div className="text-sm text-white/70">{heroLabel}</div>
              <div className="text-sm text-white/80 mt-3">{heroTitle}</div>
              <div className="text-4xl font-bold mt-1 tabular-nums">{won(headlineValue)}{t('input.unit')}</div>
              <div className="text-sm text-white/80 mt-2">
                {tax === 'freelance' && <>{t('sc.hero.grossWithTax', { gross: won(res.gross), tax: won(res.tax.total) })} · </>}
                {t('sc.hero.eff', { rate: res.effRate.toFixed(2) })}
                {res.attainment != null && <> · {t('sc.hero.attainment', { pct: res.attainment.toFixed(1) })}</>}
                {res.deals != null && <> · {t('sc.hero.deals', { n: res.deals })}</>}
              </div>
              <div className="flex flex-wrap gap-2 mt-4">
                <span className="rounded-full bg-white/15 px-3 py-1 text-sm">{t('sc.hero.annual', { amount: won(headlineValue * 12) })}</span>
                {plans.length > 1 && (() => {
                  const other = results[1 - idx]
                  const diff = res.net - other.net
                  return (
                    <span className="rounded-full bg-white/15 px-3 py-1 text-sm">
                      {diff === 0 ? t('sc.hero.same', { name: planName(1 - idx) })
                        : t(diff > 0 ? 'sc.hero.moreThan' : 'sc.hero.lessThan', { name: planName(1 - idx), diff: won(Math.abs(diff)) })}
                    </span>
                  )
                })()}
              </div>
            </div>

            <ShareResult
              card={{
                tool: t('title'),
                label: heroLabel,
                headline: `${won(headlineValue)}${t('input.unit')}`,
                sub: `${heroTitle} · ${t('sc.hero.eff', { rate: res.effRate.toFixed(2) })}`,
                rows: plans.length > 1
                  ? plans.map((_, i) => ({ label: planName(i), value: `${won(results[i].net)}${t('input.unit')}` }))
                  : [
                    { label: t('sc.table.gross'), value: `${won(res.gross)}${t('input.unit')}` },
                    { label: t('sc.table.annual'), value: `${won(headlineValue * 12)}${t('input.unit')}` },
                  ],
              }}
              text={t('sc.share', { sales: won(sales), amount: won(headlineValue) })}
              fileName="sales-commission"
            />

            {/* 인사이트 */}
            <div className="ui-card p-6 space-y-2">
              <h2 className="text-lg font-semibold text-fg">{t('sc.insight.title')}</h2>
              <p className="text-body">{insightStep}</p>
              <p className="text-body">{insightNext}</p>
              {plan.structure === 'tiered' && plan.tierMode === 'whole' && boundaryInput != null && (
                <p className="text-sm text-amber-800 bg-amber-50 rounded-xl px-4 py-3">{t('sc.insight.cliff')}</p>
              )}
            </div>

            {/* 내역 */}
            <div className="ui-card p-6">
              <h2 className="text-lg font-semibold text-fg mb-4">{t('sc.table.title', { plan: planName(idx) })}</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-line text-muted">
                      <th className="text-left py-2 font-medium">{t('sc.table.item')}</th>
                      <th className="text-right py-2 font-medium">{t('sc.table.monthly')}</th>
                      <th className="text-right py-2 font-medium">{t('sc.table.yearly')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {rowsBreakdown.map((r) => (
                      <tr key={r.label} className={r.strong ? 'font-semibold text-fg' : 'text-body'}>
                        <td className="py-2">{r.label}</td>
                        <td className="py-2 text-right tabular-nums">{r.minus ? '-' : ''}{won(r.m)}</td>
                        <td className="py-2 text-right tabular-nums">{r.minus ? '-' : ''}{won(r.m * 12)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {tierRows.length > 0 && (
                <div className="mt-5 bg-subtle rounded-2xl p-4 overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-muted">
                        <th className="text-left py-1.5 font-medium">{t('sc.table.tierRange')}</th>
                        <th className="text-right py-1.5 font-medium">{t('sc.field.tierRate')}</th>
                        <th className="text-right py-1.5 font-medium">{t('sc.table.tierBase')}</th>
                        <th className="text-right py-1.5 font-medium">{t('sc.table.tierAmount')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tierRows.map((r) => (
                        <tr key={r.from} className={r.part > 0 ? 'text-fg' : 'text-faint'}>
                          <td className="py-1.5">{r.to === Infinity ? t('sc.table.rangeOver', { from: won(r.from) }) : t('sc.table.range', { from: won(r.from), to: won(r.to) })}</td>
                          <td className="py-1.5 text-right tabular-nums">{r.rate}%</td>
                          <td className="py-1.5 text-right tabular-nums">{won(r.part)}</td>
                          <td className="py-1.5 text-right tabular-nums">{won(r.amount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              <p className="text-xs text-muted mt-3">{t('sc.table.note')}</p>
            </div>

            {/* A vs B */}
            {plans.length > 1 && (
              <div className="ui-card p-6">
                <h2 className="text-lg font-semibold text-fg mb-4">{t('sc.compare.title')}</h2>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-line text-muted">
                        <th className="text-left py-2 font-medium">{t('sc.table.item')}</th>
                        {plans.map((_, i) => <th key={i} className="text-right py-2 font-medium">{planName(i)} · {t(`sc.structure.${plans[i].structure}`)}</th>)}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line">
                      {compareRows.map((r) => {
                        const v0 = r.v(0), v1 = r.v(1)
                        return (
                          <tr key={r.label} className="text-body">
                            <td className="py-2">{r.label}</td>
                            {[v0, v1].map((v, i) => <td key={i} className="py-2 text-right tabular-nums">{won(v)}</td>)}
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
                <p className="text-sm text-body mt-4">
                  {crossover ? t('sc.compare.crossover', { sales: won(crossover.sales), name: planName(crossover.winner) }) : t('sc.compare.noCrossover')}
                </p>
              </div>
            )}

            {/* 커브 */}
            <div className="ui-card p-6">
              <h2 className="text-lg font-semibold text-fg">{t('sc.chart.title')}</h2>
              <p className="text-sm text-muted mt-1 mb-4">{t('sc.chart.desc')}</p>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chart} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                    <CartesianGrid stroke="var(--line)" strokeDasharray="3 3" />
                    <XAxis dataKey="x" type="number" domain={[0, chartMax / 10_000]} tick={{ fontSize: 12, fill: 'var(--muted)' }} stroke="var(--line)"
                      tickFormatter={(v: number) => won(v)} />
                    <YAxis tick={{ fontSize: 12, fill: 'var(--muted)' }} stroke="var(--line)" width={56} tickFormatter={(v: number) => won(v)} />
                    <Tooltip
                      formatter={(v, name) => [`${won(Number(v ?? 0))}${t('sc.chart.man')}`, planName(name === 'p1' ? 1 : 0)]}
                      labelFormatter={(v) => t('sc.chart.tooltipSales', { n: won(Number(v ?? 0)) })}
                    />
                    <ReferenceLine x={Math.min(sales, chartMax) / 10_000} stroke="var(--fg)" strokeDasharray="4 3" />
                    <Line type="linear" dataKey="p0" stroke="var(--primary)" strokeWidth={2} dot={false} isAnimationActive={false} />
                    {plans.length > 1 && <Line type="linear" dataKey="p1" stroke="var(--muted)" strokeWidth={2} strokeDasharray="6 4" dot={false} isAnimationActive={false} />}
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <p className="text-xs text-muted mt-2">{t('sc.chart.axis')}</p>
            </div>

            {tax === 'employee' && (
              <div className="bg-subtle rounded-2xl p-5 text-sub text-sm">
                {t('sc.employeeNote')}{' '}
                <Link href="/bonus-calculator" className="font-semibold text-primary underline underline-offset-2">{t('sc.link.bonus')}</Link>
                {' · '}
                <Link href="/salary-calculator" className="font-semibold text-primary underline underline-offset-2">{t('sc.link.salary')}</Link>
              </div>
            )}
          </div>
        </div>

        {/* 가이드 */}
        <div className="ui-card p-6 space-y-6">
          <h2 className="text-xl font-semibold text-fg">{t('sc.guide.title')}</h2>
          <div>
            <h3 className="text-base font-semibold text-body mb-2">{t('sc.guide.structures.title')}</h3>
            <ul className="space-y-1.5 text-sm text-sub list-disc pl-5">
              {(t.raw('sc.guide.structures.items') as string[]).map((x) => <li key={x}>{x}</li>)}
            </ul>
          </div>
          <div>
            <h3 className="text-base font-semibold text-body mb-2">{t('sc.guide.tiered.title')}</h3>
            <p className="text-sm text-sub mb-3">{t('sc.guide.tiered.intro')}</p>
            <div className="bg-subtle rounded-2xl p-5 text-sm text-sub space-y-1.5">
              {(t.raw('sc.guide.tiered.example') as string[]).map((x) => <p key={x}>{x}</p>)}
            </div>
          </div>
          <div>
            <h3 className="text-base font-semibold text-body mb-2">{t('sc.guide.tax.title')}</h3>
            <ul className="space-y-1.5 text-sm text-sub list-disc pl-5">
              {(t.raw('sc.guide.tax.items') as string[]).map((x) => <li key={x}>{x}</li>)}
            </ul>
            <p className="text-xs text-muted mt-3">
              {t('sc.guide.tax.sources')}{' '}
              <a href="https://www.law.go.kr/법령/소득세법" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">{t('sc.guide.tax.lawIncome')}</a>
              {' · '}
              <a href="https://www.law.go.kr/법령/국고금관리법" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">{t('sc.guide.tax.lawTreasury')}</a>
              {' · '}
              <a href="https://www.nts.go.kr" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">{t('sc.guide.tax.nts')}</a>
            </p>
          </div>
          <div>
            <h3 className="text-base font-semibold text-body mb-3">{t('sc.guide.faq.title')}</h3>
            <div className="space-y-3">
              {(t.raw('sc.guide.faq.items') as { q: string; a: string }[]).map((f) => (
                <div key={f.q}>
                  <p className="text-sm font-semibold text-fg">{f.q}</p>
                  <p className="text-sm text-sub mt-1">{f.a}</p>
                </div>
              ))}
            </div>
          </div>
          <p className="text-sm text-sub">
            {t('sc.guide.related')}{' '}
            <Link href="/freelancer-tax" className="text-primary underline underline-offset-2">{t('sc.link.freelancer')}</Link>
            {' · '}
            <Link href="/bonus-calculator" className="text-primary underline underline-offset-2">{t('sc.link.bonus')}</Link>
          </p>
        </div>
      </section>

      {/* ───────────── 오픈마켓 판매수수료 ───────────── */}
      <section hidden={mode !== 'market'} className="space-y-8">
        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1">
            <div className="ui-card p-6 space-y-4">
              <Money id="mk-price" label={t('input.sellingPrice')} value={price} onChange={setPrice} />
              <Money id="mk-ship" label={t('input.shippingCost')} value={shipping} onChange={setShipping} />
              <div>
                <label htmlFor="mk-cat" className="block text-sm font-medium text-body mb-1.5">{t('input.category')}</label>
                <select id="mk-cat" value={category} onChange={(e) => setCategory(e.target.value as CategoryKey)} className="ui-field w-full px-4 py-2.5">
                  {CATEGORY_KEYS.map((key) => <option key={key} value={key}>{t(`category.${key}`)} · {COUPANG_SALES[key]}%</option>)}
                </select>
                <p className="text-xs text-muted mt-1">{t('input.categoryHint')}</p>
              </div>
              <div className="border-t border-line pt-4 space-y-4">
                <p className="text-sm font-semibold text-fg">{t('naver.title')}</p>
                <div>
                  <label htmlFor="mk-tier" className="block text-sm font-medium text-body mb-1.5">{t('naver.tierLabel')}</label>
                  <select id="mk-tier" value={naverTier} onChange={(e) => setNaverTier(e.target.value as NaverTier)} className="ui-field w-full px-4 py-2.5">
                    {NAVER_TIERS.map((k) => <option key={k} value={k}>{t(`naver.tier.${k}`)} · {NAVER_ORDER_MGMT[k]}%</option>)}
                  </select>
                </div>
                <div>
                  <p className="text-sm font-medium text-body mb-1.5">{t('naver.inflowLabel')}</p>
                  <div className="grid grid-cols-2 gap-2">
                    {(['normal', 'marketing'] as const).map((k) => (
                      <button key={k} aria-pressed={inflow === k} className={seg(inflow === k)} onClick={() => setInflow(k)}>{t(`naver.inflow.${k}`)} · {NAVER_SALES[k]}%</button>
                    ))}
                  </div>
                  <p className="text-xs text-muted mt-1">{t('naver.inflowHint')}</p>
                </div>
              </div>
              <div className="border-t border-line pt-4">
                <Pct id="mk-11st" label={t('elevenst.rateLabel')} value={elevenstRate} max={30} hint={t('elevenst.rateHint')} onChange={setElevenstRate} />
              </div>
            </div>
          </div>
          <div className="lg:col-span-2 space-y-6">
            {price > 0 ? (
              <>
                <div className="ui-hero p-6">
                  <div className="text-sm text-white/70">{t('sc.market.heroLabel', { platform: t(`platform.${best.platform}`), rate: best.effRate.toFixed(2) })}</div>
                  <div className="text-4xl font-bold mt-2 tabular-nums">{won(best.settlement)}{t('input.unit')}</div>
                  <div className="text-sm text-white/80 mt-2">{t('result.commissionAmount')} {won(best.total)}{t('input.unit')}</div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {market.map((r) => (
                    <div key={r.platform} className={`ui-card p-5 ${r.platform === best.platform ? 'border-primary bg-primary-soft' : ''}`}>
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-base font-bold text-fg">{t(`platform.${r.platform}`)}</h3>
                        {r.platform === best.platform && <span className="text-xs font-semibold bg-primary text-white px-2 py-0.5 rounded-full">{t('result.bestLabel')}</span>}
                      </div>
                      <dl className="space-y-2 text-sm">
                        {r.lines.filter((l) => l.base > 0).map((l) => (
                          <div key={l.key} className="flex justify-between gap-2">
                            <dt className="text-muted">{t(`fee.${r.platform}.${l.key}`)} {l.rate}%</dt>
                            <dd className="text-body tabular-nums">{won(l.amount)}</dd>
                          </div>
                        ))}
                        {r.vat > 0 && <div className="flex justify-between gap-2"><dt className="text-muted">{t('fee.vat')}</dt><dd className="text-body tabular-nums">{won(r.vat)}</dd></div>}
                        <div className="flex justify-between gap-2"><dt className="text-muted">{t('result.commissionAmount')} · {r.effRate.toFixed(2)}%</dt><dd className="text-body tabular-nums">{won(r.total)}{t('input.unit')}</dd></div>
                        <div className="flex justify-between gap-2 border-t border-line pt-2"><dt className="font-medium text-body">{t('result.settlementAmount')}</dt><dd className="font-bold text-fg tabular-nums">{won(r.settlement)}{t('input.unit')}</dd></div>
                      </dl>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-muted">{assumptions}</p>
              </>
            ) : (
              <div className="ui-card p-8 text-center text-muted">{t('result.noInput')}</div>
            )}
          </div>
        </div>

        <div className="ui-card p-6">
          <h2 className="text-lg font-semibold text-fg">{t('compare.title')}</h2>
          <p className="text-sm text-muted mt-1 mb-4">{t('compare.note')}</p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line text-muted">
                  <th className="text-left py-3 px-2 font-medium">{t('compare.categoryHeader')}</th>
                  {PLATFORM_KEYS.map((pk) => <th key={pk} className="text-center py-3 px-2 font-medium">{t(`platform.${pk}`)}</th>)}
                  <th className="text-center py-3 px-2 font-medium">{t('compare.lowestLabel')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {CATEGORY_KEYS.map((ck) => {
                  const row = PLATFORM_KEYS.map((pk) => marketFees(pk, { ...mkInput, category: ck }))
                  const min = Math.min(...row.map((r) => r.total))
                  return (
                    <tr key={ck} className={ck === category ? 'bg-primary-soft' : ''}>
                      <td className="py-2.5 px-2 text-fg font-medium">{t(`category.${ck}`)}</td>
                      {row.map((r) => (
                        <td key={r.platform} className={`text-center py-2.5 px-2 tabular-nums ${r.total === min ? 'text-primary font-bold' : 'text-sub'}`}>
                          {won(r.total)}{r.platform === 'coupang' && <span className="block text-xs font-normal text-muted">{COUPANG_SALES[ck]}%</span>}
                        </td>
                      ))}
                      <td className="text-center py-2.5 px-2 text-primary font-semibold text-xs">
                        {row.filter((r) => r.total === min).map((r) => t(`platform.${r.platform}`)).join(', ')}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-subtle rounded-2xl p-5">
          <h2 className="text-base font-semibold text-fg mb-2">{t('notes.title')}</h2>
          <ul className="space-y-1.5 text-sm text-sub list-disc pl-5">
            {(t.raw('notes.items') as string[]).map((item) => <li key={item}>{item}</li>)}
          </ul>
        </div>

        <div className="ui-card p-6 space-y-6">
          <h2 className="text-xl font-semibold text-fg">{t('guide.title')}</h2>
          {(['commission', 'settlement', 'tips'] as const).map((section) => (
            <div key={section}>
              <h3 className="text-base font-semibold text-body mb-2">{t(`guide.${section}.title`)}</h3>
              <ul className="space-y-1.5 text-sm text-sub list-disc pl-5">
                {(t.raw(`guide.${section}.items`) as string[]).map((item) => <li key={item}>{item}</li>)}
              </ul>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
