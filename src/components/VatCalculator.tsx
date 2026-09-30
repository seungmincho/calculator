'use client'

import { useState, useMemo, useCallback, useEffect, useRef } from 'react'
import { useSearchParams } from '@/hooks/useSearchParams'
import { useTranslations } from '@/lib/i18n'
import { Copy, Check, Plus, Trash2, Link2 } from 'lucide-react'
import ShareResult from '@/components/ShareResult'
import GuideSection from '@/components/GuideSection'
import {
  fromSupply, fromTotal, fromVat, invoice, encodeLines, decodeLines, generalReturn, simpleReturn, nextDeadline,
  SIMPLE_RATES, SIMPLE_THRESHOLD, SIMPLE_EXEMPT, CARD_LIMIT,
  type Rounding, type TaxKind, type Line, type SimpleIndustry,
} from '@/utils/vat'

type Tab = 'quick' | 'items' | 'report'
type Mode = 'fromSupply' | 'fromTotal' | 'fromVat'
type Payer = 'general' | 'simple'

const TABS: Tab[] = ['quick', 'items', 'report']
const MODES: Mode[] = ['fromSupply', 'fromTotal', 'fromVat']
const KINDS: TaxKind[] = ['taxable', 'zero', 'exempt']
const INDUSTRIES = Object.keys(SIMPLE_RATES) as SimpleIndustry[]
const QUICK = [10_000, 50_000, 100_000, 500_000, 1_000_000, 5_000_000, 10_000_000, 50_000_000, 100_000_000]
const DEFAULT_AMOUNT = 1_000_000
const DEF = { sales: 50_000_000, pur: 20_000_000, card: 22_000_000 }

const won = (n: number) => Math.round(n).toLocaleString('ko-KR')
const num = (v: string | null, d: number) => { const n = Number(v); return v != null && v !== '' && Number.isFinite(n) && n >= 0 ? n : d }
const seg = (on: boolean) =>
  `px-3 py-2 rounded-lg text-sm font-medium transition-colors ${on ? 'bg-primary text-white' : 'bg-soft text-body hover:bg-subtle'}`

function Money({ id, label, value, onChange, hint }: { id: string; label: string; value: number; onChange: (n: number) => void; hint?: string }) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-body mb-1.5">{label}</label>
      <input
        id={id} type="text" inputMode="numeric"
        value={value ? value.toLocaleString('ko-KR') : ''}
        placeholder="0"
        onChange={(e) => onChange(Math.min(1e13, Number(e.target.value.replace(/[^0-9]/g, '')) || 0))}
        className="ui-field w-full px-4 py-2.5 text-right tabular-nums"
      />
      {hint && <p className="text-xs text-muted mt-1">{hint}</p>}
    </div>
  )
}

export default function VatCalculator() {
  const t = useTranslations('vatCalculator')
  const searchParams = useSearchParams()
  const ready = useRef(false)

  const defaultLines = useCallback((): Line[] => [
    { name: t('items.sample1'), qty: 1, price: 1_500_000, kind: 'taxable' },
    { name: t('items.sample2'), qty: 3, price: 33_000, kind: 'taxable' },
  ], [t])

  const [tab, setTab] = useState<Tab>('quick')
  const [mode, setMode] = useState<Mode>('fromSupply')
  const [amount, setAmount] = useState(DEFAULT_AMOUNT)
  const [rounding, setRounding] = useState<Rounding>('floor')
  const [lines, setLines] = useState<Line[]>(defaultLines)
  const [inclusive, setInclusive] = useState(false)
  const [payer, setPayer] = useState<Payer>('general')
  const [sales, setSales] = useState(DEF.sales)
  const [purchases, setPurchases] = useState(DEF.pur)
  const [cardSales, setCardSales] = useState(DEF.card)
  const [cardEligible, setCardEligible] = useState(true)
  const [eFiling, setEFiling] = useState(true)
  const [industry, setIndustry] = useState<SimpleIndustry>('retail')
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [today, setToday] = useState<Date | null>(null)

  // URL → 상태 (한 번)
  useEffect(() => {
    if (ready.current) return
    const g = (k: string) => searchParams.get(k)
    const tb = TABS.find((x) => x === g('tab')); if (tb) setTab(tb)
    const m = MODES.find((x) => x === g('type')); if (m) setMode(m)
    setAmount(num(g('amount'), DEFAULT_AMOUNT))
    if (g('rnd') === 'round') setRounding('round')
    const it = g('items'); if (it) { const d = decodeLines(it); if (d.length) setLines(d) }
    setInclusive(g('incl') === '1')
    if (g('tp') === 'simple') setPayer('simple')
    setSales(num(g('sales'), DEF.sales)); setPurchases(num(g('pur'), DEF.pur)); setCardSales(num(g('card'), DEF.card))
    setCardEligible(g('elig') !== '0'); setEFiling(g('ef') !== '0')
    const ind = INDUSTRIES.find((x) => x === g('ind')); if (ind) setIndustry(ind)
    setToday(new Date())
    ready.current = true
  }, [searchParams])

  // 상태 → URL (공유 링크가 결과를 재현)
  useEffect(() => {
    if (!ready.current) return
    const p = new URLSearchParams()
    if (tab !== 'quick') p.set('tab', tab)
    if (tab === 'quick') { p.set('type', mode); p.set('amount', String(amount)) }
    if (tab === 'items') { p.set('items', encodeLines(lines)); if (inclusive) p.set('incl', '1') }
    if (tab !== 'report' && rounding === 'round') p.set('rnd', 'round')
    if (tab === 'report') {
      if (payer === 'simple') { p.set('tp', 'simple'); p.set('ind', industry) }
      p.set('sales', String(sales)); p.set('pur', String(purchases)); p.set('card', String(cardSales))
      if (payer === 'general' && !cardEligible) p.set('elig', '0')
      if (!eFiling) p.set('ef', '0')
    }
    window.history.replaceState(null, '', `${window.location.pathname}?${p}`)
  }, [tab, mode, amount, rounding, lines, inclusive, payer, sales, purchases, cardSales, cardEligible, eFiling, industry])

  const copy = useCallback(async (text: string, id: string) => {
    try {
      if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(text)
      else {
        const ta = document.createElement('textarea')
        ta.value = text; ta.style.position = 'fixed'; ta.style.left = '-999999px'
        document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta)
      }
    } catch { /* 권한 없음: 표시만 */ }
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }, [])

  const CopyBtn = ({ text, id, label, onHero }: { text: string; id: string; label?: string; onHero?: boolean }) => (
    <button
      type="button" onClick={() => copy(text, id)} aria-label={label ?? t('copy')}
      className={`inline-flex items-center gap-1.5 rounded-lg text-sm font-medium transition-colors ${label ? 'px-3 py-1.5' : 'p-1.5'} ${onHero ? 'hover:bg-white/15 text-white' : 'bg-soft hover:bg-subtle text-body'}`}
    >
      {copiedId === id ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
      {label && <span>{copiedId === id ? t('copied') : label}</span>}
    </button>
  )

  // ── 단일 계산 ──
  const quick = useMemo(() => {
    if (mode === 'fromSupply') return { ...fromSupply(amount, rounding), gap: 0 }
    if (mode === 'fromTotal') return fromTotal(amount, rounding)
    return { ...fromVat(amount), gap: 0 }
  }, [mode, amount, rounding])
  const invoiceLine = (s: { supply: number; vat: number; total: number }) =>
    t('invoiceLine', { supply: won(s.supply), vat: won(s.vat), total: won(s.total) })
  const heroValue = mode === 'fromSupply' ? quick.total : quick.supply
  const heroLabel = mode === 'fromSupply' ? t('short.total') : t('short.supply')

  // ── 여러 품목 ──
  const inv = useMemo(() => invoice(lines, inclusive, rounding), [lines, inclusive, rounding])
  const setLine = (i: number, patch: Partial<Line>) => setLines((ls) => ls.map((l, j) => (j === i ? { ...l, ...patch } : l)))
  const itemsTsv = [
    [t('items.name'), t('items.qty'), t('items.price'), t('items.kind'), t('short.supply'), t('short.vat'), t('short.total')].join('\t'),
    ...inv.lines.map((l) => [l.name, l.qty, l.price, t(`kind.${l.kind}`), l.supply, l.vat, l.total].join('\t')),
    [t('items.sum'), '', '', '', inv.taxableSupply + inv.zeroSupply + inv.exempt, inv.vat, inv.total].join('\t'),
  ].join('\n')

  // ── 신고 예상 ──
  const ret = useMemo(() => payer === 'general'
    ? generalReturn({ sales, purchases, cardSales, cardEligible, eFiling })
    : simpleReturn({ sales, purchases, cardSales, eFiling, industry }),
  [payer, sales, purchases, cardSales, cardEligible, eFiling, industry])
  const deadline = today ? nextDeadline(today, payer === 'simple') : null
  const refund = ret.payable < 0

  const roundingControl = (
    <div>
      <span className="block text-sm font-medium text-body mb-1.5">{t('rounding.label')}</span>
      <div className="flex gap-1.5">
        {(['floor', 'round'] as Rounding[]).map((r) => (
          <button key={r} type="button" onClick={() => setRounding(r)} className={seg(rounding === r)} aria-pressed={rounding === r}>
            {t(`rounding.${r}`)}
          </button>
        ))}
      </div>
      <p className="text-xs text-muted mt-1">{t('rounding.hint')}</p>
    </div>
  )

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-fg">{t('title')}</h1>
          <p className="text-sm text-muted mt-1">{t('subtitle')}</p>
        </div>
        <button type="button" onClick={() => copy(window.location.href, 'link')} className="ui-btn-soft shrink-0 px-3 py-2 text-sm inline-flex items-center gap-1.5">
          {copiedId === 'link' ? <Check className="w-4 h-4" /> : <Link2 className="w-4 h-4" />}
          {copiedId === 'link' ? t('linkCopied') : t('copyLink')}
        </button>
      </div>

      <div className="flex flex-wrap gap-1.5" role="tablist">
        {TABS.map((x) => (
          <button key={x} type="button" role="tab" aria-selected={tab === x} onClick={() => setTab(x)} className={seg(tab === x)}>
            {t(`tab.${x}`)}
          </button>
        ))}
      </div>

      {/* ── 단일 계산 ── */}
      {tab === 'quick' && (
        <div className="grid lg:grid-cols-3 gap-8">
          <div className="ui-card p-6 space-y-5">
            <div>
              <span className="block text-sm font-medium text-body mb-1.5">{t('calcMode')}</span>
              <div className="grid grid-cols-1 gap-1.5">
                {MODES.map((m) => (
                  <button key={m} type="button" onClick={() => setMode(m)} className={`${seg(mode === m)} text-left`} aria-pressed={mode === m}>
                    {t(`mode.${m}`)}
                  </button>
                ))}
              </div>
            </div>
            <Money id="vat-amount" label={t(`amountFor.${mode}`)} value={amount} onChange={setAmount} />
            <div className="flex flex-wrap gap-1.5">
              {QUICK.map((v) => (
                <button key={v} type="button" onClick={() => setAmount(v)} className={seg(amount === v)}>
                  {t(`quickLabel.${v}`)}
                </button>
              ))}
            </div>
            {mode !== 'fromVat' && roundingControl}
          </div>

          <div className="lg:col-span-2 space-y-4">
            <div className="ui-hero p-6">
              <div className="flex items-start justify-between gap-3">
                <p className="text-sm text-white/70">{heroLabel}</p>
                <CopyBtn text={String(heroValue)} id="hero" onHero />
              </div>
              <p className="text-3xl sm:text-4xl font-bold tabular-nums mt-1">{won(heroValue)}{t('won')}</p>
              <p className="text-sm text-white/70 mt-2">{t('vatIs', { vat: won(quick.vat) })}</p>
            </div>

            <div className="ui-card p-6">
              <div className="flex items-center justify-between gap-2 mb-3">
                <h2 className="text-base font-semibold text-fg">{t('receipt')}</h2>
                <CopyBtn text={invoiceLine(quick)} id="line" label={t('copyInvoiceLine')} />
              </div>
              <dl className="divide-y divide-line">
                {([['supply', quick.supply], ['vat', quick.vat], ['total', quick.total]] as const).map(([k, v]) => (
                  <div key={k} className="flex items-center justify-between py-3 gap-2">
                    <dt className="text-sm text-sub">{t(`short.${k}`)}</dt>
                    <dd className="flex items-center gap-2">
                      <span className={`tabular-nums ${k === 'total' ? 'text-lg font-bold text-fg' : 'font-semibold text-fg'}`}>{won(v)}{t('won')}</span>
                      <CopyBtn text={String(v)} id={k} />
                    </dd>
                  </div>
                ))}
              </dl>
              {quick.gap !== 0 && (
                <p className="mt-3 bg-amber-50 text-amber-800 rounded-xl p-4 text-sm">
                  {t('gapNote', { supply: won(quick.supply), check: won(quick.vat - quick.gap), vat: won(quick.vat), total: won(quick.total) })}
                </p>
              )}
              {mode === 'fromVat' && <p className="mt-3 text-xs text-muted">{t('fromVatNote')}</p>}
              <p className="mt-3 text-xs text-muted">{t(mode === 'fromTotal' ? 'formula.fromTotal' : 'formula.fromSupply')}</p>
            </div>

            <ShareResult
              card={{
                tool: t('title'), label: t('share.label', { mode: t(`mode.${mode}`), amount: won(amount) }), headline: `${won(heroValue)}${t('won')}`,
                rows: [{ label: t('short.supply'), value: won(quick.supply) }, { label: t('short.vat'), value: won(quick.vat) }, { label: t('short.total'), value: won(quick.total) }],
              }}
              text={invoiceLine(quick)}
              fileName="vat"
            />
          </div>
        </div>
      )}

      {/* ── 여러 품목 ── */}
      {tab === 'items' && (
        <div className="space-y-6">
          <div className="ui-card p-6 space-y-4">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <span className="block text-sm font-medium text-body mb-1.5">{t('items.priceBasis')}</span>
                <div className="flex gap-1.5">
                  <button type="button" onClick={() => setInclusive(false)} className={seg(!inclusive)} aria-pressed={!inclusive}>{t('items.exclusive')}</button>
                  <button type="button" onClick={() => setInclusive(true)} className={seg(inclusive)} aria-pressed={inclusive}>{t('items.inclusive')}</button>
                </div>
              </div>
              {roundingControl}
            </div>

            <div className="space-y-3">
              {inv.lines.map((l, i) => (
                <div key={i} className="bg-subtle rounded-2xl p-3 space-y-2">
                  <div className="flex flex-wrap gap-2">
                    <input
                      aria-label={t('items.name')} value={l.name} placeholder={`${t('items.name')} ${i + 1}`}
                      onChange={(e) => setLine(i, { name: e.target.value })}
                      className="ui-field px-3 py-2 text-sm w-full sm:flex-1 sm:w-auto min-w-0"
                    />
                    <input
                      aria-label={t('items.qty')} type="number" min={0} step="any" value={l.qty || ''} placeholder={t('items.qty')}
                      onChange={(e) => setLine(i, { qty: Math.max(0, Number(e.target.value) || 0) })}
                      className="ui-field px-3 py-2 text-sm w-20 text-right tabular-nums"
                    />
                    <input
                      aria-label={t('items.price')} type="text" inputMode="numeric" value={l.price ? l.price.toLocaleString('ko-KR') : ''} placeholder={t('items.price')}
                      onChange={(e) => setLine(i, { price: Math.min(1e12, Number(e.target.value.replace(/[^0-9]/g, '')) || 0) })}
                      className="ui-field px-3 py-2 text-sm flex-1 sm:flex-none sm:w-36 min-w-0 text-right tabular-nums"
                    />
                    <select
                      aria-label={t('items.kind')} value={l.kind} onChange={(e) => setLine(i, { kind: e.target.value as TaxKind })}
                      className="ui-field px-3 py-2 text-sm"
                    >
                      {KINDS.map((k) => <option key={k} value={k}>{t(`kind.${k}`)}</option>)}
                    </select>
                    <button
                      type="button" onClick={() => setLines((ls) => ls.filter((_, j) => j !== i))} disabled={lines.length === 1}
                      aria-label={t('items.remove')} className="p-2 text-faint hover:text-red-500 disabled:opacity-30"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <p className="text-xs text-sub tabular-nums px-1">
                    {t('items.lineResult', { supply: won(l.supply), vat: won(l.vat), total: won(l.total) })}
                  </p>
                </div>
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button" disabled={lines.length >= 50}
                onClick={() => setLines((ls) => [...ls, { name: '', qty: 1, price: 0, kind: 'taxable' }])}
                className="ui-btn-soft px-4 py-2 text-sm inline-flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />{t('batchAdd')}
              </button>
              <button type="button" onClick={() => setLines(defaultLines())} className="ui-btn-soft px-4 py-2 text-sm">{t('reset')}</button>
            </div>
          </div>

          <div className="grid lg:grid-cols-2 gap-6">
            <div className="ui-hero p-6">
              <p className="text-sm text-white/70">{t('items.grandTotal')}</p>
              <p className="text-3xl sm:text-4xl font-bold tabular-nums mt-1">{won(inv.total)}{t('won')}</p>
              <p className="text-sm text-white/70 mt-2">{t('vatIs', { vat: won(inv.vat) })}</p>
            </div>
            <div className="ui-card p-6">
              <div className="flex items-center justify-between gap-2 mb-3">
                <h2 className="text-base font-semibold text-fg">{t('receipt')}</h2>
                <div className="flex gap-1.5">
                  <CopyBtn text={invoiceLine({ supply: inv.taxableSupply + inv.zeroSupply, vat: inv.vat, total: inv.taxableSupply + inv.zeroSupply + inv.vat })} id="invLine" label={t('copyInvoiceLine')} />
                  <CopyBtn text={itemsTsv} id="tsv" label={t('items.copyTable')} />
                </div>
              </div>
              <dl className="divide-y divide-line text-sm">
                {([
                  ['items.taxableSupply', inv.taxableSupply],
                  ['items.zeroSupply', inv.zeroSupply],
                  ['short.vat', inv.vat],
                  ['items.exemptAmount', inv.exempt],
                ] as const).map(([k, v]) => (
                  <div key={k} className="flex justify-between py-2.5 gap-2">
                    <dt className="text-sub">{t(k)}</dt><dd className="font-semibold text-fg tabular-nums">{won(v)}{t('won')}</dd>
                  </div>
                ))}
                <div className="flex justify-between py-2.5 gap-2">
                  <dt className="text-fg font-semibold">{t('items.grandTotal')}</dt><dd className="text-lg font-bold text-fg tabular-nums">{won(inv.total)}{t('won')}</dd>
                </div>
              </dl>
              {inv.vat !== inv.vatOnSum && (
                <p className="mt-3 bg-amber-50 text-amber-800 rounded-xl p-4 text-sm">
                  {t('items.sumGapNote', { lines: won(inv.vat), sum: won(inv.vatOnSum) })}
                </p>
              )}
              {inv.exempt > 0 && <p className="mt-3 text-xs text-muted">{t('items.exemptNote')}</p>}
            </div>
          </div>
        </div>
      )}

      {/* ── 부가세 신고 예상 ── */}
      {tab === 'report' && (
        <div className="grid lg:grid-cols-3 gap-8">
          <div className="ui-card p-6 space-y-5">
            <div>
              <span className="block text-sm font-medium text-body mb-1.5">{t('report.payer')}</span>
              <div className="flex gap-1.5">
                {(['general', 'simple'] as Payer[]).map((p) => (
                  <button key={p} type="button" onClick={() => setPayer(p)} className={seg(payer === p)} aria-pressed={payer === p}>
                    {t(`report.${p}`)}
                  </button>
                ))}
              </div>
            </div>
            {payer === 'simple' && (
              <div>
                <label htmlFor="vat-ind" className="block text-sm font-medium text-body mb-1.5">{t('report.industry')}</label>
                <select id="vat-ind" value={industry} onChange={(e) => setIndustry(e.target.value as SimpleIndustry)} className="ui-field w-full px-4 py-2.5">
                  {INDUSTRIES.map((k) => <option key={k} value={k}>{t(`industry.${k}`)} ({SIMPLE_RATES[k]}%)</option>)}
                </select>
              </div>
            )}
            <Money id="vat-sales" label={t(`report.sales.${payer}`)} value={sales} onChange={setSales} />
            <Money id="vat-pur" label={t(`report.purchases.${payer}`)} value={purchases} onChange={setPurchases} hint={t(`report.purchasesHint.${payer}`)} />
            <Money id="vat-card" label={t('report.cardSales')} value={cardSales} onChange={setCardSales} hint={t('report.cardSalesHint')} />
            {payer === 'general' && (
              <label className="flex items-start gap-2 text-sm text-body">
                <input type="checkbox" checked={cardEligible} onChange={(e) => setCardEligible(e.target.checked)} className="mt-0.5" />
                <span>{t('report.cardEligible')}</span>
              </label>
            )}
            <label className="flex items-start gap-2 text-sm text-body">
              <input type="checkbox" checked={eFiling} onChange={(e) => setEFiling(e.target.checked)} className="mt-0.5" />
              <span>{t('report.eFiling')}</span>
            </label>
          </div>

          <div className="lg:col-span-2 space-y-4">
            <div className="ui-hero p-6">
              <p className="text-sm text-white/70">{t(refund ? 'report.refundLabel' : 'report.payableLabel')}</p>
              <p className="text-3xl sm:text-4xl font-bold tabular-nums mt-1">{won(Math.abs(ret.payable))}{t('won')}</p>
              {deadline && (
                <p className="text-sm text-white/70 mt-2">
                  {t('report.deadline', { date: deadline.date, dday: deadline.dday === 0 ? 'D-Day' : `D-${deadline.dday}`, period: t(`report.period.${deadline.period}`, { year: deadline.year }) })}
                </p>
              )}
            </div>

            <div className="ui-card p-6">
              <h2 className="text-base font-semibold text-fg mb-3">{t('report.breakdown')}</h2>
              <dl className="divide-y divide-line text-sm">
                {([
                  [`report.outputTax.${payer}`, ret.outputTax, ''],
                  [`report.inputTax.${payer}`, ret.inputTax, '−'],
                  ['report.cardCredit', ret.cardCredit, '−'],
                  ['report.eFilingCredit', ret.eFilingCredit, '−'],
                ] as const).map(([k, v, sign]) => (
                  <div key={k} className="flex justify-between py-2.5 gap-2">
                    <dt className="text-sub">{t(k)}</dt><dd className="font-semibold text-fg tabular-nums">{sign}{won(v)}{t('won')}</dd>
                  </div>
                ))}
                <div className="flex justify-between py-2.5 gap-2">
                  <dt className="text-fg font-semibold">{t(refund ? 'report.refundLabel' : 'report.payableLabel')}</dt>
                  <dd className="text-lg font-bold text-fg tabular-nums">{won(Math.abs(ret.payable))}{t('won')}</dd>
                </div>
              </dl>
              <p className="mt-3 text-xs text-muted">{t(`report.formula.${payer}`, { rate: SIMPLE_RATES[industry] })}</p>
              <div className="mt-3 space-y-2">
                {ret.exempt && <p className="bg-subtle rounded-2xl p-4 text-sm text-sub">{t('report.exemptNote', { amount: won(SIMPLE_EXEMPT) })}</p>}
                {ret.overThreshold && <p className="bg-amber-50 text-amber-800 rounded-xl p-4 text-sm">{t('report.overThresholdNote', { amount: won(SIMPLE_THRESHOLD) })}</p>}
                {ret.cardCredit >= CARD_LIMIT && <p className="bg-subtle rounded-2xl p-4 text-sm text-sub">{t('report.cardLimitNote')}</p>}
                <p className="bg-subtle rounded-2xl p-4 text-sm text-sub">{t('report.cardSunsetNote')}</p>
                <p className="text-xs text-muted">{t('report.disclaimer')}</p>
              </div>
            </div>

            <ShareResult
              card={{
                tool: t('title'), label: t(refund ? 'report.refundLabel' : 'report.payableLabel'), headline: `${won(Math.abs(ret.payable))}${t('won')}`,
                sub: t(`report.${payer}`),
                rows: [
                  { label: t(`report.outputTax.${payer}`), value: won(ret.outputTax) },
                  { label: t(`report.inputTax.${payer}`), value: won(ret.inputTax) },
                  { label: t('report.cardCredit'), value: won(ret.cardCredit) },
                ],
              }}
              fileName="vat-return"
            />
          </div>
        </div>
      )}

      <div className="ui-card p-6">
        <h2 className="text-base font-semibold text-fg mb-3">{t('sources.title')}</h2>
        <ul className="space-y-1.5 text-sm text-sub list-disc list-inside">
          {(t.raw('sources.items') as string[]).map((s, i) => <li key={i}>{s}</li>)}
        </ul>
        <p className="text-sm mt-3">
          <a href="https://www.law.go.kr/법령/부가가치세법" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">{t('sources.law')}</a>
          <span className="text-faint mx-2">·</span>
          <a href="https://www.hometax.go.kr" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">{t('sources.hometax')}</a>
          <span className="text-faint mx-2">·</span>
          <a href="https://www.nts.go.kr" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">{t('sources.nts')}</a>
        </p>
      </div>

      <GuideSection namespace="vatCalculator" />
    </div>
  )
}
