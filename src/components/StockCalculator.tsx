'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import { Plus, X, Save, Check } from 'lucide-react'
import { useSearchParams } from '@/hooks/useSearchParams'
import { useTranslations } from '@/lib/i18n'
import '@/lib/i18n/ns/stockCalculator'
import { useCalculationHistory } from '@/hooks/useCalculationHistory'
import CalculationHistory from '@/components/CalculationHistory'
import GuideSection from '@/components/GuideSection'
import ShareResult from '@/components/ShareResult'
import MobileResultLink from '@/components/MobileResultLink'
import {
  trade, breakeven, targetSell, averagePrice, sharesToTarget, usTrade, sellTaxRate, US_DEDUCTION,
  MARKETS, type Market, type Lot,
} from '@/utils/stock'

type Tab = 'trade' | 'avg' | 'target' | 'us'
const TABS: Tab[] = ['trade', 'avg', 'target', 'us']
const TARGET_ROWS = [-10, -5, 0, 5, 10, 20, 30, 50]

const num = (s: string) => { const v = parseFloat(s.replace(/,/g, '')); return Number.isFinite(v) ? v : 0 }
const won = (v: number) => Math.round(v).toLocaleString('ko-KR')
const usd = (v: number) => v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const pct = (v: number) => `${v > 0 ? '+' : ''}${v.toFixed(2)}%`
const signed = (v: number) => `${v > 0 ? '+' : ''}${won(v)}`
/** 입력값에 천 단위 쉼표 (소수점 유지) */
const withCommas = (raw: string) => {
  const [i, d] = raw.split('.')
  const int = i ? Number(i).toLocaleString('en-US') : ''
  return d !== undefined ? `${int || '0'}.${d}` : int
}
const clean = (v: string, decimal: boolean) => {
  const s = v.replace(/[^\d.]/g, '')
  if (!decimal) return s.replace(/\./g, '')
  const [i, ...rest] = s.split('.')
  return rest.length ? `${i}.${rest.join('')}` : i
}
const encodeLots = (lots: { price: string; qty: string }[]) => lots.map(l => `${num(l.price)}x${num(l.qty)}`).join('_')
const decodeLots = (s: string) => s.split('_').map(p => p.split('x')).filter(p => p.length === 2 && p.every(x => /^\d+(\.\d+)?$/.test(x)))
  .map(([price, qty]) => ({ price, qty }))

function Field({ label, value, onChange, unit, decimal = false, hint }: {
  label: string; value: string; onChange: (v: string) => void; unit?: string; decimal?: boolean; hint?: string
}) {
  return (
    <label className="block">
      <span className="block text-sm font-medium text-body mb-1.5">{label}</span>
      <span className="relative block">
        <input
          type="text" inputMode={decimal ? 'decimal' : 'numeric'} value={withCommas(value)}
          onChange={e => onChange(clean(e.target.value, decimal))}
          className="ui-field w-full px-4 py-3 pr-12 tabular-nums"
        />
        {unit && <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-muted pointer-events-none">{unit}</span>}
      </span>
      {hint && <span className="block text-xs text-muted mt-1">{hint}</span>}
    </label>
  )
}

function Seg<T extends string>({ value, options, onChange, label }: { value: T; options: { v: T; label: string }[]; onChange: (v: T) => void; label?: string }) {
  return (
    <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-1 p-1 bg-soft rounded-xl">
      {options.map(o => (
        <button
          key={o.v} type="button" role="radio" aria-checked={value === o.v} onClick={() => onChange(o.v)}
          className={`flex-1 min-w-fit px-3 py-2 rounded-lg text-sm font-medium transition-colors ${value === o.v ? 'bg-primary text-white' : 'text-sub hover:text-fg'}`}
        >{o.label}</button>
      ))}
    </div>
  )
}

function Row({ label, value, strong, sub }: { label: string; value: string; strong?: boolean; sub?: boolean }) {
  return (
    <div className={`flex justify-between gap-4 py-2 ${strong ? 'border-t border-line mt-1 pt-3' : ''}`}>
      <span className={sub ? 'text-muted pl-3' : 'text-sub'}>{label}</span>
      <span className={`tabular-nums text-right ${strong ? 'font-bold text-fg' : 'font-medium text-fg'}`}>{value}</span>
    </div>
  )
}

export default function StockCalculator() {
  const t = useTranslations('stockCalculator')
  const searchParams = useSearchParams()
  const loaded = useRef(false)

  const [tab, setTab] = useState<Tab>('trade')
  // 국내 매매 (매매 손익·목표가 탭 공용)
  const [buy, setBuy] = useState('70000')
  const [sell, setSell] = useState('77000')
  const [qty, setQty] = useState('100')
  const [fee, setFee] = useState('0.015')
  const [market, setMarket] = useState<Market>('kospi')
  const [targetPct, setTargetPct] = useState('10')
  // 물타기
  const [lots, setLots] = useState([{ price: '80000', qty: '10' }, { price: '70000', qty: '20' }])
  const [cur, setCur] = useState('60000')
  const [targetAvg, setTargetAvg] = useState('68000')
  // 미국
  const [ub, setUb] = useState('180')
  const [us, setUs] = useState('210')
  const [uq, setUq] = useState('10')
  const [bfx, setBfx] = useState('1350')
  const [sfx, setSfx] = useState('1400')
  const [uf, setUf] = useState('0.25')
  const [og, setOg] = useState('0')
  const [ogNeg, setOgNeg] = useState(false)

  const [hideAmt, setHideAmt] = useState(true)
  const [saved, setSaved] = useState(false)
  const { histories, isLoading, saveCalculation, removeHistory, clearHistories, loadFromHistory } = useCalculationHistory('stock')

  // URL → 상태 (최초 1회)
  useEffect(() => {
    if (loaded.current) return
    loaded.current = true
    const g = (k: string) => { const v = searchParams.get(k); return v && /^\d+(\.\d+)?$/.test(v) ? v : null }
    const tb = searchParams.get('tab') as Tab
    if (TABS.includes(tb)) setTab(tb)
    const m = searchParams.get('m') as Market
    if (MARKETS.includes(m)) setMarket(m)
    // 예전 링크(purchase/current/shares)도 지원
    const pairs: [string | null, (v: string) => void][] = [
      [g('b') ?? g('purchase'), setBuy], [g('s') ?? g('current'), setSell], [g('q') ?? g('shares'), setQty], [g('f'), setFee],
      [g('tp'), setTargetPct], [g('cur'), setCur], [g('ta'), setTargetAvg],
      [g('ub'), setUb], [g('us'), setUs], [g('uq'), setUq], [g('bfx'), setBfx], [g('sfx'), setSfx], [g('uf'), setUf],
    ]
    for (const [v, set] of pairs) if (v !== null) set(v)
    const tpRaw = searchParams.get('tp')
    if (tpRaw && /^-\d+(\.\d+)?$/.test(tpRaw)) setTargetPct(tpRaw)
    const ogRaw = searchParams.get('og')
    if (ogRaw && /^-?\d+$/.test(ogRaw)) { setOgNeg(ogRaw.startsWith('-')); setOg(ogRaw.replace('-', '')) }
    const lt = searchParams.get('lots')
    if (lt) { const d = decodeLots(lt); if (d.length) setLots(d.slice(0, 20)) }
  }, [searchParams])

  // 상태 → URL
  useEffect(() => {
    if (!loaded.current) return
    const p = new URLSearchParams()
    if (tab !== 'trade') p.set('tab', tab)
    if (tab === 'trade' || tab === 'target') {
      p.set('b', String(num(buy))); p.set('q', String(num(qty))); p.set('f', String(num(fee))); p.set('m', market)
      if (tab === 'trade') p.set('s', String(num(sell)))
      else p.set('tp', targetPct || '0')
    } else if (tab === 'avg') {
      p.set('lots', encodeLots(lots)); p.set('cur', String(num(cur))); p.set('ta', String(num(targetAvg)))
    } else {
      p.set('ub', String(num(ub))); p.set('us', String(num(us))); p.set('uq', String(num(uq)))
      p.set('bfx', String(num(bfx))); p.set('sfx', String(num(sfx))); p.set('uf', String(num(uf)))
      if (num(og)) p.set('og', `${ogNeg ? '-' : ''}${num(og)}`)
    }
    window.history.replaceState(null, '', `${window.location.pathname}?${p}`)
  }, [tab, buy, sell, qty, fee, market, targetPct, lots, cur, targetAvg, ub, us, uq, bfx, sfx, uf, og, ogNeg])

  const base = { buy: num(buy), qty: num(qty), feePct: num(fee), market }
  const tr = useMemo(() => trade({ ...base, sell: num(sell) }), [buy, sell, qty, fee, market]) // eslint-disable-line react-hooks/exhaustive-deps
  const be = useMemo(() => breakeven(base), [buy, qty, fee, market]) // eslint-disable-line react-hooks/exhaustive-deps
  const tPct = parseFloat(targetPct) || 0
  const tg = useMemo(() => targetSell(base, tPct), [buy, qty, fee, market, tPct]) // eslint-disable-line react-hooks/exhaustive-deps
  const avg = useMemo(() => averagePrice(lots.map(l => ({ price: num(l.price), qty: num(l.qty) }) as Lot)), [lots])
  const need = sharesToTarget(avg.avg, avg.qty, num(cur), num(targetAvg))
  const ut = useMemo(() => usTrade({
    buy: num(ub), sell: num(us), qty: num(uq), buyFx: num(bfx), sellFx: num(sfx), feePct: num(uf), otherGain: (ogNeg ? -1 : 1) * num(og),
  }), [ub, us, uq, bfx, sfx, uf, og, ogNeg])

  const W = t('won'), S = t('sharesUnit')
  const marketOpts = MARKETS.map(v => ({ v, label: t(`market.${v}`) }))
  const valid = base.buy > 0 && base.qty > 0

  const saveTrade = () => {
    if (!valid) return
    saveCalculation(
      { purchasePrice: buy, currentPrice: sell, shares: qty, fee, market },
      { returnPercentage: tr.returnPct, totalProfit: tr.profit, isProfit: tr.profit >= 0 },
    )
    setSaved(true); setTimeout(() => setSaved(false), 2000)
  }
  const loadHistory = (id: string) => {
    const i = loadFromHistory(id)
    if (!i) return
    const c = (v: unknown) => String(v ?? '').replace(/,/g, '')
    setTab('trade'); setBuy(c(i.purchasePrice)); setSell(c(i.currentPrice)); setQty(c(i.shares) || '1')
    if (i.fee !== undefined) setFee(c(i.fee))
    if (MARKETS.includes(i.market as Market)) setMarket(i.market as Market)
  }
  const formatHistory = (r: Record<string, unknown>) => `${pct(Number(r.returnPercentage) || 0)} (${signed(Number(r.totalProfit) || 0)}${W})`

  const heroCls = 'ui-hero p-6'
  const resultBox = 'bg-subtle rounded-2xl px-5 py-3 text-sm'
  const tradeInputs = (
    <>
      <div>
        <span className="block text-sm font-medium text-body mb-1.5">{t('market.label')}</span>
        <Seg value={market} options={marketOpts} onChange={setMarket} label={t('market.label')} />
        <p className="text-xs text-muted mt-1">{t('market.rate', { rate: (sellTaxRate(market) * 100).toFixed(2) })}</p>
      </div>
      <Field label={t('fields.buy')} value={buy} onChange={setBuy} unit={W} />
      {tab === 'trade' && <Field label={t('fields.sell')} value={sell} onChange={setSell} unit={W} />}
      <Field label={t('fields.qty')} value={qty} onChange={setQty} unit={S} />
      <Field label={t('fields.fee')} value={fee} onChange={setFee} unit="%" decimal hint={t('fields.feeHint')} />
    </>
  )

  // 공유 카드
  const card = (() => {
    const tool = t('title')
    if (tab === 'trade') return {
      tool, label: t('share.trade'), headline: pct(tr.returnPct),
      sub: hideAmt ? undefined : t('trade.profit', { amount: signed(tr.profit) }),
      rows: [
        { label: t('fields.buy'), value: `${won(base.buy)}${W}` }, { label: t('fields.sell'), value: `${won(num(sell))}${W}` },
        { label: t('breakeven.title'), value: `${won(be.price)}${W}` },
        ...(hideAmt ? [] : [{ label: t('fields.qty'), value: `${won(base.qty)}${S}` }, { label: t('rows.totalCost'), value: `${won(tr.totalCost)}${W}` }]),
      ],
    }
    if (tab === 'target') return {
      tool, label: t('share.target', { pct: pct(tPct) }), headline: `${won(tg.tick)}${W}`,
      rows: [{ label: t('fields.buy'), value: `${won(base.buy)}${W}` }, { label: t('market.label'), value: t(`market.${market}`) }, { label: t('breakeven.title'), value: `${won(be.price)}${W}` }],
    }
    if (tab === 'avg') return {
      tool, label: t('share.avg'), headline: `${won(avg.avg)}${W}`,
      rows: [
        { label: t('avg.lots'), value: t('avg.lotCount', { n: lots.length }) },
        ...(hideAmt ? [] : [{ label: t('avg.totalQty'), value: `${won(avg.qty)}${S}` }]),
        ...(need ? [{ label: t('avg.targetAvg'), value: hideAmt ? `${won(num(targetAvg))}${W}` : t('avg.needShort', { add: won(need.add), avg: won(num(targetAvg)) }) }] : []),
      ],
    }
    return {
      tool, label: t('share.us'), headline: pct(ut.returnPct),
      sub: hideAmt ? undefined : t('us.netLine', { amount: signed(ut.net) }),
      rows: [
        { label: t('us.usdPct'), value: pct(ut.usdPct) },
        { label: t('us.fx'), value: `${won(num(bfx))} → ${won(num(sfx))}${W}` },
        ...(hideAmt ? [] : [{ label: t('us.fxGain'), value: `${signed(ut.fxGain)}${W}` }, { label: t('us.tax'), value: `${won(ut.tax)}${W}` }]),
      ],
    }
  })()

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-fg">{t('title')}</h1>
          <p className="text-sm text-muted mt-1">{t('subtitle')}</p>
        </div>
        <CalculationHistory
          histories={histories} isLoading={isLoading} onLoadHistory={loadHistory}
          onRemoveHistory={removeHistory} onClearHistories={clearHistories} formatResult={formatHistory}
        />
      </div>

      <Seg value={tab} options={TABS.map(v => ({ v, label: t(`tabs.${v}`) }))} onChange={setTab} label={t('title')} />

      <div className="grid lg:grid-cols-5 gap-6">
        {/* 입력 */}
        <div className="lg:col-span-2 ui-card p-6 space-y-4">
          {tab === 'trade' && valid && <MobileResultLink href="#stock-calculator-result" label={t('trade.hero')} value={pct(tr.returnPct)} />}
          {(tab === 'trade' || tab === 'target') && tradeInputs}
          {tab === 'target' && (
            <div>
              <Field label={t('target.pct')} value={targetPct.replace('-', '')} onChange={v => setTargetPct((tPct < 0 ? '-' : '') + v)} unit="%" decimal />
              <div className="flex gap-1 mt-2">
                <button type="button" onClick={() => setTargetPct(String(-Math.abs(tPct)))} className={`px-3 py-1.5 rounded-lg text-xs font-medium ${tPct < 0 ? 'bg-primary text-white' : 'bg-soft text-body'}`}>{t('target.loss')}</button>
                <button type="button" onClick={() => setTargetPct(String(Math.abs(tPct)))} className={`px-3 py-1.5 rounded-lg text-xs font-medium ${tPct >= 0 ? 'bg-primary text-white' : 'bg-soft text-body'}`}>{t('target.gain')}</button>
              </div>
              <input type="range" min={-30} max={100} step={1} value={tPct} onChange={e => setTargetPct(e.target.value)} className="w-full mt-3 accent-[var(--primary)]" aria-label={t('target.pct')} />
            </div>
          )}

          {tab === 'avg' && (
            <>
              <div className="space-y-2">
                <span className="block text-sm font-medium text-body">{t('avg.lots')}</span>
                {lots.map((l, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="w-8 text-xs text-muted shrink-0">{t('avg.lotN', { n: i + 1 })}</span>
                    <input aria-label={t('avg.lotPrice', { n: i + 1 })} inputMode="numeric" value={withCommas(l.price)} placeholder={t('fields.buy')}
                      onChange={e => setLots(ls => ls.map((x, j) => j === i ? { ...x, price: clean(e.target.value, true) } : x))}
                      className="ui-field min-w-0 flex-[3] px-3 py-2.5 tabular-nums" />
                    <input aria-label={t('avg.lotQty', { n: i + 1 })} inputMode="numeric" value={withCommas(l.qty)} placeholder={S}
                      onChange={e => setLots(ls => ls.map((x, j) => j === i ? { ...x, qty: clean(e.target.value, false) } : x))}
                      className="ui-field min-w-0 flex-[2] px-3 py-2.5 tabular-nums" />
                    <button type="button" onClick={() => setLots(ls => ls.filter((_, j) => j !== i))} disabled={lots.length <= 1}
                      aria-label={t('avg.remove')} className="p-2 rounded-lg text-muted hover:bg-soft disabled:opacity-30"><X className="w-4 h-4" /></button>
                  </div>
                ))}
                {lots.length < 20 && (
                  <button type="button" onClick={() => setLots(ls => [...ls, { price: cur, qty: '10' }])} className="ui-btn-soft w-full px-4 py-2 text-sm inline-flex items-center justify-center gap-1">
                    <Plus className="w-4 h-4" />{t('avg.add')}
                  </button>
                )}
              </div>
              <Field label={t('avg.cur')} value={cur} onChange={setCur} unit={W} />
              <Field label={t('avg.targetAvg')} value={targetAvg} onChange={setTargetAvg} unit={W} />
            </>
          )}

          {tab === 'us' && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <Field label={t('us.buy')} value={ub} onChange={setUb} unit="$" decimal />
                <Field label={t('us.sell')} value={us} onChange={setUs} unit="$" decimal />
                <Field label={t('us.buyFx')} value={bfx} onChange={setBfx} unit={W} decimal />
                <Field label={t('us.sellFx')} value={sfx} onChange={setSfx} unit={W} decimal />
              </div>
              <p className="text-xs text-muted -mt-2">{t('us.fxHint')}</p>
              <Field label={t('fields.qty')} value={uq} onChange={setUq} unit={S} decimal />
              <Field label={t('fields.fee')} value={uf} onChange={setUf} unit="%" decimal hint={t('us.feeHint')} />
              <div>
                <Field label={t('us.otherGain')} value={og} onChange={setOg} unit={W} hint={t('us.otherGainHint', { amount: won(US_DEDUCTION) })} />
                <div className="flex gap-1 mt-2">
                  <button type="button" onClick={() => setOgNeg(false)} className={`px-3 py-1.5 rounded-lg text-xs font-medium ${!ogNeg ? 'bg-primary text-white' : 'bg-soft text-body'}`}>{t('us.otherProfit')}</button>
                  <button type="button" onClick={() => setOgNeg(true)} className={`px-3 py-1.5 rounded-lg text-xs font-medium ${ogNeg ? 'bg-primary text-white' : 'bg-soft text-body'}`}>{t('us.otherLoss')}</button>
                </div>
              </div>
            </>
          )}
        </div>

        {/* 결과 */}
        <div className="lg:col-span-3 space-y-4">
          {tab === 'trade' && (valid ? (
            <>
              <div id="stock-calculator-result" className={`${heroCls} scroll-mt-20`}>
                <p className="text-sm text-white/70">{t('trade.hero')}</p>
                <p className="text-4xl font-bold tabular-nums mt-1">{pct(tr.returnPct)}</p>
                <p className="text-lg font-semibold tabular-nums mt-1">{t('trade.profit', { amount: signed(tr.profit) })}</p>
                <p className="text-sm text-white/70 mt-2">{t('trade.gross', { pct: pct(tr.grossPct), cost: won(tr.totalCost) })}</p>
              </div>
              <div className="ui-card p-5">
                <p className="text-sm text-sub">{t('breakeven.title')}</p>
                <p className="text-2xl font-bold text-fg tabular-nums mt-1">{won(be.price)}{W}</p>
                <p className="text-xs text-muted mt-1">{t('breakeven.desc', { tick: won(be.tick), pct: pct(base.buy ? (be.price / base.buy - 1) * 100 : 0) })}</p>
              </div>
              <div className={resultBox}>
                <Row label={t('rows.buyAmount')} value={`${won(tr.buyAmount)}${W}`} />
                <Row label={t('rows.buyFee')} value={`${won(tr.buyFee)}${W}`} sub />
                <Row label={t('rows.sellAmount')} value={`${won(tr.sellAmount)}${W}`} />
                <Row label={t('rows.sellFee')} value={`${won(tr.sellFee)}${W}`} sub />
                {market === 'kospi'
                  ? <><Row label={t('rows.txTax')} value={`${won(tr.txTax)}${W}`} sub /><Row label={t('rows.farmTax')} value={`${won(tr.farmTax)}${W}`} sub /></>
                  : <Row label={t('rows.txTax')} value={`${won(tr.tax)}${W}`} sub />}
                <Row label={t('rows.proceeds')} value={`${won(tr.proceeds)}${W}`} strong />
                <Row label={t('rows.profit')} value={`${signed(tr.profit)}${W}`} />
              </div>
              <button type="button" onClick={saveTrade} className="ui-btn-soft px-4 py-2 text-sm inline-flex items-center gap-1.5">
                {saved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}{saved ? t('saved') : t('save')}
              </button>
            </>
          ) : <p className="ui-card p-6 text-sm text-muted">{t('empty')}</p>)}

          {tab === 'target' && (valid ? (
            <>
              <div className={heroCls}>
                <p className="text-sm text-white/70">{t('target.hero', { pct: pct(tPct) })}</p>
                <p className="text-4xl font-bold tabular-nums mt-1">{won(tg.tick)}{W}</p>
                <p className="text-sm text-white/70 mt-2">{t('target.heroSub', { price: won(tg.price), up: pct((tg.price / base.buy - 1) * 100), profit: signed(trade({ ...base, sell: tg.tick }).profit) })}</p>
              </div>
              <div className="ui-card p-5 overflow-x-auto">
                <h2 className="text-base font-semibold text-fg mb-3">{t('target.table')}</h2>
                <table className="w-full text-sm tabular-nums">
                  <thead><tr className="text-muted text-left">
                    <th className="py-2 font-medium">{t('target.colPct')}</th><th className="py-2 font-medium text-right">{t('target.colPrice')}</th>
                    <th className="py-2 font-medium text-right">{t('target.colChange')}</th><th className="py-2 font-medium text-right">{t('target.colProfit')}</th>
                  </tr></thead>
                  <tbody>
                    {TARGET_ROWS.map(p => {
                      const x = targetSell(base, p)
                      return (
                        <tr key={p} className={`border-t border-line ${p === tPct ? 'bg-primary-soft text-primary' : 'text-fg'}`}>
                          <td className="py-2">{p === 0 ? t('target.be') : pct(p)}</td>
                          <td className="py-2 text-right font-medium">{won(x.tick)}</td>
                          <td className="py-2 text-right">{pct((x.tick / base.buy - 1) * 100)}</td>
                          <td className="py-2 text-right">{signed(trade({ ...base, sell: x.tick }).profit)}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
                <p className="text-xs text-muted mt-3">{t('target.note')}</p>
              </div>
            </>
          ) : <p className="ui-card p-6 text-sm text-muted">{t('empty')}</p>)}

          {tab === 'avg' && (
            <>
              <div className={heroCls}>
                <p className="text-sm text-white/70">{t('avg.hero')}</p>
                <p className="text-4xl font-bold tabular-nums mt-1">{won(avg.avg)}{W}</p>
                <p className="text-sm text-white/70 mt-2">{t('avg.heroSub', { qty: won(avg.qty), amount: won(avg.amount) })}</p>
              </div>
              <div className="ui-card p-5">
                <p className="text-sm text-sub">{t('avg.needTitle', { avg: won(num(targetAvg)) })}</p>
                {need ? (
                  <>
                    <p className="text-2xl font-bold text-fg tabular-nums mt-1">{t('avg.need', { add: won(need.add) })}</p>
                    <p className="text-xs text-muted mt-1">{t('avg.needSub', { amount: won(need.amount), avg: won(need.newAvg), qty: won(need.newQty) })}</p>
                  </>
                ) : <p className="text-sm text-body mt-1">{t('avg.unreachable')}</p>}
              </div>
              {avg.qty > 0 && num(cur) > 0 && (
                <div className={resultBox}>
                  <Row label={t('avg.evalAmount')} value={`${won(num(cur) * avg.qty)}${W}`} />
                  <Row label={t('avg.evalPnl')} value={`${signed(num(cur) * avg.qty - avg.amount)}${W} (${pct((num(cur) / avg.avg - 1) * 100)})`} />
                  <Row label={t('avg.recover')} value={pct((avg.avg / num(cur) - 1) * 100)} />
                </div>
              )}
              <p className="text-xs text-muted">{t('avg.note')}</p>
            </>
          )}

          {tab === 'us' && (
            <>
              <div className={heroCls}>
                <p className="text-sm text-white/70">{t('us.hero')}</p>
                <p className="text-4xl font-bold tabular-nums mt-1">{pct(ut.returnPct)}</p>
                <p className="text-lg font-semibold tabular-nums mt-1">{t('us.netLine', { amount: signed(ut.net) })}</p>
                <p className="text-sm text-white/70 mt-2">{t('us.heroSub', { usd: pct(ut.usdPct), pre: pct(ut.preTaxPct) })}</p>
              </div>
              <div className={resultBox}>
                <Row label={t('us.buyKrw')} value={`${won(ut.buyKrw)}${W} ($${usd(ut.buyUsd)})`} />
                <Row label={t('us.sellKrw')} value={`${won(ut.sellKrw)}${W} ($${usd(ut.sellUsd)})`} />
                <Row label={t('us.fees')} value={`${won(ut.feeKrw)}${W}`} sub />
                <Row label={t('us.gain')} value={`${signed(ut.gain)}${W}`} strong />
                <Row label={t('us.priceGain')} value={`${signed(ut.priceGain)}${W}`} sub />
                <Row label={t('us.fxGain')} value={`${signed(ut.fxGain)}${W}`} sub />
                <Row label={t('us.tax')} value={`${won(ut.tax)}${W}`} />
                <Row label={t('us.net')} value={`${signed(ut.net)}${W}`} strong />
              </div>
              <div className="ui-card p-5 text-sm space-y-1">
                <p className="text-sub">{t('us.breakeven')}</p>
                <p className="text-2xl font-bold text-fg tabular-nums">${usd(ut.breakevenUsd)}</p>
                <p className="text-xs text-muted">{t('us.taxNote', { base: won(ut.taxDetail.base), total: won(ut.taxDetail.total) })}</p>
              </div>
            </>
          )}

          <div className="ui-card p-5 space-y-3">
            <label className="flex items-center gap-2 text-sm text-body cursor-pointer">
              <input type="checkbox" checked={hideAmt} onChange={e => setHideAmt(e.target.checked)} className="accent-[var(--primary)] w-4 h-4" />
              {t('share.hide')}
            </label>
            <ShareResult card={card} text={`${card.label} ${card.headline}`} fileName="toolhub-stock" />
          </div>
        </div>
      </div>

      <div className="bg-subtle rounded-2xl p-5 text-sm text-sub space-y-1.5">
        <h2 className="font-semibold text-fg mb-1">{t('notes.title')}</h2>
        {(t.raw('notes.items') as string[]).map((s, i) => <p key={i}>{s}</p>)}
        <p className="text-xs text-muted pt-1">{t('notes.disclaimer')}</p>
      </div>

      <GuideSection namespace="stockCalculator" />
    </div>
  )
}
