'use client'

import { useState, useMemo, useEffect } from 'react'
import Link from 'next/link'
import { useTranslations } from '@/lib/i18n'
import '@/lib/i18n/ns/brokerageFee'
import { useSearchParams } from '@/hooks/useSearchParams'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, CartesianGrid } from 'recharts'
import ShareResult from '@/components/ShareResult'
import { calcFee, brackets, VAT_RATE, type Deal, type Prop, type VatType } from '@/utils/brokerageFee'

const DEALS: Deal[] = ['sale', 'jeonse', 'monthly']
const PROPS: Prop[] = ['house', 'officetel', 'officetelEtc', 'nonHouse']
const VATS: VatType[] = ['general', 'simple', 'none']
const EOK = 100_000_000
const MAN = 10_000
const DEFAULTS: Record<Deal, [number, number]> = { sale: [6 * EOK, 0], jeonse: [3 * EOK, 0], monthly: [5_000 * MAN, 100 * MAN] }
const LINKS = ['acquisition-tax', 'rent-converter', 'jeonse-loan', 'lease-contract'] as const

const won = (v: number) => Math.round(v).toLocaleString('ko-KR')
const pct = (v: number) => `${(v * 100).toFixed(3).replace(/\.?0+$/, '')}%`
const parseNum = (s: string) => Number(s.replace(/[^\d]/g, '')) || 0
function eokMan(v: number): string {
  const eok = Math.floor(v / EOK)
  const man = Math.floor((v % EOK) / MAN)
  return [eok > 0 ? `${eok}억` : '', man > 0 ? `${man.toLocaleString('ko-KR')}만` : ''].filter(Boolean).join(' ') || '0'
}
const short = (v: number) => (v >= EOK ? `${v / EOK}억` : `${v / 10_000_000}천만`)
const pick = <T extends string>(v: string | null, list: readonly T[], def: T): T => (list.includes(v as T) ? (v as T) : def)

export default function BrokerageFeeCalculator() {
  const t = useTranslations('brokerageFee')
  const sp = useSearchParams()

  const [deal, setDeal] = useState<Deal>(() => pick(sp.get('d'), DEALS, 'sale'))
  const [prop, setProp] = useState<Prop>(() => pick(sp.get('p'), PROPS, 'house'))
  const [amt, setAmt] = useState(() => parseNum(sp.get('a') ?? '') || DEFAULTS[deal][0])
  const [rent, setRent] = useState(() => (sp.get('r') !== null ? parseNum(sp.get('r') ?? '') : DEFAULTS.monthly[1]))
  const [vat, setVat] = useState<VatType>(() => pick(sp.get('v'), VATS, 'general'))
  // 협의 요율 (null = 상한 요율)
  const [nego, setNego] = useState<number | null>(() => {
    const n = parseFloat(sp.get('n') ?? '')
    return Number.isFinite(n) && n >= 0 ? n / 100 : null
  })
  // 전세 vs 월세 비교
  const [cj, setCj] = useState(3 * EOK)
  const [cd, setCd] = useState(1 * EOK)
  const [cr, setCr] = useState(80 * MAN)

  useEffect(() => {
    const q = new URLSearchParams()
    if (deal !== 'sale') q.set('d', deal)
    if (prop !== 'house') q.set('p', prop)
    q.set('a', String(amt))
    if (deal === 'monthly') q.set('r', String(rent))
    if (vat !== 'general') q.set('v', vat)
    if (nego !== null) q.set('n', String(+(nego * 100).toFixed(3)))
    window.history.replaceState(null, '', `?${q}`)
  }, [deal, prop, amt, rent, vat, nego])

  const changeDeal = (d: Deal) => {
    if (d === deal) return
    setDeal(d); setAmt(DEFAULTS[d][0]); setRent(DEFAULTS[d][1]); setNego(null)
  }

  const input = { deal, prop, deposit: amt, rent: deal === 'monthly' ? rent : 0, vat }
  const r = calcFee({ ...input, rate: nego ?? undefined })
  const cut = calcFee({ ...input, rate: Math.max(0, r.rate - 0.001) })
  const saving = r.total - cut.total
  const negoSaved = calcFee(input).total - r.total
  const list = brackets(prop, deal)
  const lease = deal !== 'sale'
  const [pa, pb] = lease ? ['landlord', 'tenant'] : ['seller', 'buyer']
  const vatPct = `${VAT_RATE[vat] * 100}%`
  const capHit = r.cap !== null && r.fee === r.cap && r.amount * r.rate > r.cap

  // 거래금액별 중개보수 곡선 (상한 요율, 한쪽 부담, 부가세 포함)
  const chart = useMemo(() => {
    const max = Math.max(20, Math.ceil(r.amount / EOK) + 1)
    return Array.from({ length: max * 4 }, (_, k) => {
      const p = (k + 1) * 0.25
      return { p, fee: Math.round(calcFee({ deal: lease ? 'jeonse' : 'sale', prop, deposit: p * EOK, vat }).total / MAN) }
    })
  }, [lease, prop, vat, r.amount])

  const cJ = calcFee({ deal: 'jeonse', prop, deposit: cj, vat })
  const cM = calcFee({ deal: 'monthly', prop, deposit: cd, rent: cr, vat })
  const cDiff = cM.total - cJ.total

  const seg = (on: boolean) =>
    `px-2 py-2 rounded-lg text-sm font-medium transition-colors ${on ? 'bg-primary text-white' : 'bg-soft text-body hover:bg-subtle'}`
  const opt = (on: boolean) =>
    `w-full text-left px-3 py-2.5 rounded-xl border text-sm transition-colors ${on ? 'border-primary bg-primary-soft text-primary font-medium' : 'border-line text-body hover:bg-subtle'}`

  const money = (id: string, label: string, value: number, set: (v: number) => void, quick: number[]) => (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-body mb-2">{label}</label>
      <div className="relative">
        <input
          id={id} type="text" inputMode="numeric" value={value ? value.toLocaleString('ko-KR') : ''}
          onChange={(e) => set(Math.min(parseNum(e.target.value), 1_000_000_000_000))}
          className="ui-field w-full px-4 py-3 pr-10 tabular-nums"
        />
        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-muted">{t('units.won')}</span>
      </div>
      <div className="flex items-center justify-between mt-1.5 gap-2">
        <span className="text-xs text-muted">{eokMan(value)}{t('units.won')}</span>
        <div className="flex gap-1">
          {quick.map((q) => (
            <button key={q} onClick={() => set(value + q)} className="px-2 py-1 rounded-lg bg-soft text-xs text-body hover:bg-subtle">
              +{eokMan(q)}
            </button>
          ))}
        </div>
      </div>
    </div>
  )

  const rangeLabel = (i: number) => {
    if (list.length === 1) return t('table.all')
    const b = list[i]
    const prev = list[i - 1]
    if (!prev) return t('table.under', { b: short(b.upTo!) })
    if (b.upTo === null) return t('table.over', { a: short(prev.upTo!) })
    return t('table.range', { a: short(prev.upTo!), b: short(b.upTo) })
  }

  const dealLabel = `${t(`prop.${prop}`)} ${t(`deal.${deal}`)}`
  const faq = t.raw('faq.items') as { q: string; a: string }[]
  const sources = t.raw('sources.items') as { label: string; url: string }[]

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
            <div className="grid grid-cols-3 gap-2" role="tablist">
              {DEALS.map((d) => (
                <button key={d} role="tab" aria-selected={deal === d} onClick={() => changeDeal(d)} className={seg(deal === d)}>
                  {t(`deal.${d}`)}
                </button>
              ))}
            </div>

            <div>
              <p className="block text-sm font-medium text-body mb-2">{t('prop.label')}</p>
              <div className="space-y-2">
                {PROPS.map((p) => (
                  <button key={p} onClick={() => { setProp(p); setNego(null) }} className={opt(prop === p)}>
                    {t(`prop.${p}`)}
                    <span className="block text-xs font-normal text-muted mt-0.5">{t(`propHint.${p}`)}</span>
                  </button>
                ))}
              </div>
            </div>

            {money('bf-amt', t(`amount.${deal}`), amt, setAmt, deal === 'monthly' ? [1_000 * MAN, 5_000 * MAN] : [1_000 * MAN, 5_000 * MAN, EOK])}
            {deal === 'monthly' && (
              <>
                {money('bf-rent', t('amount.rent'), rent, setRent, [10 * MAN, 50 * MAN])}
                <p className="text-xs text-muted -mt-2">
                  {t('monthlyFormula', { amount: eokMan(r.amount), mult: amt + rent * 100 < 50_000_000 ? 70 : 100 })}
                  {amt + rent * 100 < 50_000_000 && <span className="block mt-0.5">{t('monthlyUnder')}</span>}
                </p>
              </>
            )}

            <div>
              <p className="block text-sm font-medium text-body mb-2">{t('vat.label')}</p>
              <div className="grid grid-cols-3 gap-2">
                {VATS.map((v) => (
                  <button key={v} onClick={() => setVat(v)} className={seg(vat === v)}>{t(`vat.${v}`)}</button>
                ))}
              </div>
              <p className="text-xs text-muted mt-1.5">{t(`vat.hint.${vat}`)}</p>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label htmlFor="bf-nego" className="text-sm font-medium text-body">{t('nego.label')}</label>
                <span className="text-sm font-semibold text-primary tabular-nums">{pct(r.rate)}</span>
              </div>
              <input
                id="bf-nego" type="range" min={0} max={r.maxRate * 10_000} step={1} value={Math.round(r.rate * 10_000)}
                onChange={(e) => { const v = Number(e.target.value) / 10_000; setNego(v >= r.maxRate ? null : v) }}
                className="w-full accent-[var(--primary)]"
              />
              <div className="flex items-center justify-between mt-1">
                <p className="text-xs text-muted">{t('nego.hint', { max: pct(r.maxRate) })}</p>
                {nego !== null && <button onClick={() => setNego(null)} className="text-xs text-primary hover:underline">{t('nego.reset')}</button>}
              </div>
            </div>
          </div>
        </div>

        {/* 결과 */}
        <div className="lg:col-span-2 space-y-6">
          <div className="ui-card p-6 space-y-5">
            <div>
              <p className="text-sm text-muted">{t('result.label', { deal: dealLabel, amount: eokMan(r.amount) })}</p>
              <p className="text-3xl font-bold text-fg tabular-nums mt-1">{won(r.total)}{t('units.won')}</p>
              <p className="text-sm text-sub mt-1">
                {t(nego === null ? 'result.maxRate' : 'result.negoRate')} <span className="font-semibold text-primary tabular-nums">{pct(r.rate)}</span>
                {capHit && <span className="text-muted"> · {t('result.capApplied', { cap: won(r.cap!) })}</span>}
                <span className="text-muted"> · {t('result.vatIncl', { rate: vatPct })}</span>
              </p>
            </div>

            <div className="divide-y divide-line border-y border-line">
              {[
                { k: 'amount', v: r.amount },
                { k: 'fee', v: r.fee },
                { k: 'vat', v: r.vat },
              ].map((row) => (
                <div key={row.k} className="flex items-center justify-between py-3">
                  <span className="text-sm text-body">{t(`result.${row.k}`, { rate: vatPct })}</span>
                  <span className="text-base font-semibold text-fg tabular-nums">{won(row.v)}{t('units.won')}</span>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                { label: t('result.each', { party: t(`party.${pa}`) }), v: r.total },
                { label: t('result.each', { party: t(`party.${pb}`) }), v: r.total },
                { label: t('result.both'), v: r.total * 2 },
              ].map((b, i) => (
                <div key={i} className={`rounded-2xl p-4 ${i === 2 ? 'bg-primary-soft' : 'bg-subtle'}`}>
                  <p className={`text-xs ${i === 2 ? 'text-primary' : 'text-muted'}`}>{b.label}</p>
                  <p className={`text-lg font-bold tabular-nums mt-1 ${i === 2 ? 'text-primary' : 'text-fg'}`}>{won(b.v)}{t('units.won')}</p>
                </div>
              ))}
            </div>

            <div className="bg-subtle rounded-2xl p-4 text-sm text-sub space-y-1">
              {negoSaved > 0 && <p className="text-body font-medium">{t('result.negoSaved', { amount: won(negoSaved), both: won(negoSaved * 2) })}</p>}
              {saving > 0 && <p>{t('result.cut', { amount: won(saving), rate: pct(cut.rate) })}</p>}
              <p>{t(prop === 'officetelEtc' || prop === 'nonHouse' ? 'result.noteOther' : 'result.noteMax')}</p>
            </div>

            <ShareResult
              card={{
                tool: t('title'),
                label: t('share.label', { deal: dealLabel, amount: eokMan(r.amount) }),
                headline: `${won(r.total)}${t('units.won')}`,
                sub: `${t('result.maxRate')} ${pct(r.rate)} · ${t('result.vatIncl', { rate: vatPct })}`,
                rows: [
                  { label: t('result.fee'), value: `${won(r.fee)}${t('units.won')}` },
                  { label: t('result.vat', { rate: vatPct }), value: `${won(r.vat)}${t('units.won')}` },
                  { label: t('result.both'), value: `${won(r.total * 2)}${t('units.won')}` },
                ],
              }}
              text={t('share.text', { deal: dealLabel, amount: eokMan(r.amount), fee: won(r.total) })}
            />
          </div>

          {/* 요율표 */}
          <div className="ui-card p-6 space-y-4">
            <div>
              <h2 className="text-lg font-semibold text-fg">{t('table.title', { deal: dealLabel })}</h2>
              <p className="text-sm text-muted mt-1">{t(`table.desc.${prop}`)}</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-line text-muted">
                    {(t.raw('table.head') as string[]).map((h, i) => (
                      <th key={h} className={`font-medium py-2 ${i === 0 ? 'text-left' : 'text-right'}`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {list.map((b, i) => {
                    const cur = i === r.idx
                    return (
                      <tr key={i} className={`border-b border-line ${cur ? 'bg-primary-soft' : ''}`}>
                        <td className={`py-2.5 pl-1 ${cur ? 'text-primary font-semibold' : 'text-body'}`}>
                          {rangeLabel(i)}{cur && <span className="ml-1.5 text-xs">{t('table.now')}</span>}
                        </td>
                        <td className="py-2.5 text-right tabular-nums text-sub">{list.length === 1 && prop !== 'officetel' ? t('table.within', { rate: pct(b.rate) }) : pct(b.rate)}</td>
                        <td className="py-2.5 pr-1 text-right tabular-nums text-sub">{b.cap ? `${won(b.cap)}${t('units.won')}` : t('table.noCap')}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-faint">{t('table.note')}</p>
          </div>

          {/* 전세 vs 월세 */}
          <div className="ui-card p-6 space-y-4">
            <div>
              <h2 className="text-lg font-semibold text-fg">{t('compare.title')}</h2>
              <p className="text-sm text-muted mt-1">{t('compare.desc')}</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {money('bf-cj', t('compare.jeonse'), cj, setCj, [])}
              {money('bf-cd', t('compare.deposit'), cd, setCd, [])}
              {money('bf-cr', t('compare.rent'), cr, setCr, [])}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[{ k: 'jeonseFee', res: cJ }, { k: 'monthlyFee', res: cM }].map(({ k, res }) => (
                <div key={k} className="bg-subtle rounded-2xl p-4">
                  <p className="text-sm text-muted">{t(`compare.${k}`)}</p>
                  <p className="text-2xl font-bold text-fg tabular-nums mt-1">{won(res.total)}{t('units.won')}</p>
                  <p className="text-xs text-muted mt-1 tabular-nums">{t('compare.amountLine', { amount: eokMan(res.amount), rate: pct(res.rate) })}</p>
                </div>
              ))}
            </div>
            <p className="text-sm font-medium text-body">
              {cDiff === 0 ? t('compare.same') : t(cDiff < 0 ? 'compare.cheaper' : 'compare.pricier', { amount: won(Math.abs(cDiff)) })}
            </p>
            <p className="text-xs text-faint">{t('compare.note')}</p>
          </div>

          {/* 거래금액별 복비 */}
          <div className="ui-card p-6">
            <h2 className="text-lg font-semibold text-fg">{t('chart.title', { deal: dealLabel })}</h2>
            <p className="text-sm text-muted mt-1">{t('chart.desc')}</p>
            <div className="h-64 mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chart} margin={{ top: 16, right: 12, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" />
                  <XAxis dataKey="p" type="number" domain={[0, 'dataMax']} tickFormatter={(v: number) => `${v}억`} tick={{ fontSize: 11, fill: 'var(--muted)' }} stroke="var(--line)" />
                  <YAxis tickFormatter={(v: number) => `${v.toLocaleString()}만`} tick={{ fontSize: 11, fill: 'var(--muted)' }} width={56} stroke="var(--line)" />
                  <Tooltip
                    labelFormatter={(v) => `${t('chart.x')} ${v}억`}
                    formatter={(v) => [`${Number(v ?? 0).toLocaleString()}만${t('units.won')}`, t('chart.fee')]}
                  />
                  <ReferenceLine x={r.amount / EOK} stroke="var(--fg)" strokeDasharray="2 3" label={{ value: t('chart.now'), position: 'insideTopRight', fontSize: 10, fill: 'var(--fg)' }} />
                  <Line type="linear" dataKey="fee" stroke="var(--primary)" strokeWidth={2.5} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <p className="text-xs text-faint">{t('disclaimer')}</p>
        </div>
      </div>

      {/* 가이드 */}
      <div className="ui-card p-6 space-y-6">
        <h2 className="text-xl font-semibold text-fg">{t('guide.title')}</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {(['amount', 'pay', 'doc', 'receipt', 'cancel', 'region'] as const).map((sec) => (
            <div key={sec}>
              <h3 className="font-semibold text-fg mb-3">{t(`guide.${sec}.title`)}</h3>
              <ul className="list-disc pl-5 space-y-2 text-sm text-sub">
                {(t.raw(`guide.${sec}.items`) as string[]).map((item, i) => <li key={i}>{item}</li>)}
              </ul>
            </div>
          ))}
        </div>

        <div>
          <h3 className="font-semibold text-fg mb-3">{t('faq.title')}</h3>
          <div className="divide-y divide-line border-y border-line">
            {faq.map((f) => (
              <details key={f.q} className="py-3">
                <summary className="cursor-pointer text-sm font-medium text-body">{f.q}</summary>
                <p className="text-sm text-sub mt-2 leading-relaxed">{f.a}</p>
              </details>
            ))}
          </div>
        </div>

        <div className="bg-subtle rounded-2xl p-5 text-sm text-sub space-y-2">
          <p className="font-medium text-body">{t('sources.title')}</p>
          <ul className="space-y-1">
            {sources.map((s) => (
              <li key={s.url}>
                <a href={s.url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">{s.label}</a>
              </li>
            ))}
          </ul>
          <p className="text-xs text-muted">{t('sources.asOf')}</p>
        </div>

        <div className="flex flex-wrap gap-2">
          {LINKS.map((href) => (
            <Link key={href} href={`/${href}/`} className="ui-btn-soft px-3 py-2 text-sm">{t(`links.${href}`)}</Link>
          ))}
        </div>
      </div>
    </div>
  )
}
