'use client'

import { useEffect, useId, useState, type ReactNode } from 'react'
import Link from 'next/link'
import { useSearchParams } from '@/hooks/useSearchParams'
import { useHydrated } from '@/hooks/useHydrated'
import { useTranslations } from '@/lib/i18n'
import '@/lib/i18n/ns/dividendCalculator'
import ShareResult from '@/components/ShareResult'
import MobileResultLink from '@/components/MobileResultLink'
import { fmtKRW } from '@/utils/bogeumjari'
import {
  atSource, effRate, requiredInvestment, finCheck, maxAmountUnder, highDividend, isaAccount, pensionAccount, reinvest,
  FREQS, FREQ_LIST, isFreq, FIN_THRESHOLD, NHIS_FIN, HD_TABLE, type Freq,
} from '@/utils/dividend'

const won = (n: number) => (Number.isFinite(n) ? Math.round(n).toLocaleString('ko-KR') : '—')
const minus = (n: number) => (Math.round(n) > 0 ? '-' : '') + won(n)
const digits = (s: string) => s.replace(/\D/g, '').slice(0, 13)
const dec = (s: string) => { const m = s.replace(/[^\d.]/g, '').match(/^(\d{0,3})(\.\d{0,3})?/); return m ? m[1] + (m[2] ?? '') : '' }
const num = (s: string) => Number(s) || 0
const pct = (n: number) => (Number.isFinite(n) ? n.toLocaleString('ko-KR', { maximumFractionDigits: 2 }) : '—')
const chip = (on: boolean) => `min-h-[44px] px-3.5 rounded-xl text-sm font-medium ${on ? 'bg-primary text-white' : 'bg-soft text-body hover:bg-subtle'}`
const SIM_YEARS = [5, 10, 20]
const TARGETS = [500_000, 1_000_000, 2_000_000, 3_000_000]
const MAX_AMOUNT = 9_999_999_999_999

type Mode = 'amount' | 'shares'
type Market = 'domestic' | 'overseas'

// 기본값: 1억원 · 연 5% · 매월 (첫 화면에 결과)
const DEFAULTS = {
  mode: 'amount' as Mode, amount: '100000000', yieldPct: '5', shares: '', price: '', dps: '',
  freq: 'monthly' as Freq, market: 'domestic' as Market, foreign: '15', otherFin: '',
  hd: false, isaLow: false, target: '1000000', growth: '0',
}
type Form = typeof DEFAULTS

function fromUrl(sp: URLSearchParams): Form {
  const n = (k: string, d: string) => { const v = sp.get(k); return v != null && /^\d{1,13}$/.test(v) ? v : d }
  const p = (k: string, d: string) => { const v = sp.get(k); return v != null && /^\d{1,3}(\.\d{1,3})?$/.test(v) ? v : d }
  const f = sp.get('freq')
  return {
    mode: sp.get('mode') === 'shares' ? 'shares' : 'amount',
    amount: n('amount', DEFAULTS.amount), yieldPct: p('yield', DEFAULTS.yieldPct),
    shares: n('shares', ''), price: n('price', ''), dps: n('dps', ''),
    freq: isFreq(f) ? f : DEFAULTS.freq, market: sp.get('market') === 'overseas' ? 'overseas' : 'domestic',
    foreign: p('foreign', DEFAULTS.foreign), otherFin: n('other', ''),
    hd: sp.get('hd') === '1', isaLow: sp.get('isa') === 'low',
    target: n('target', DEFAULTS.target), growth: p('growth', DEFAULTS.growth),
  }
}

function toQuery(f: Form): Record<string, string> {
  const sh = f.mode === 'shares', ov = f.market === 'overseas'
  return {
    mode: sh ? 'shares' : '',
    amount: sh ? '' : f.amount || '0', yield: sh ? '' : f.yieldPct || '0',
    shares: sh ? f.shares || '0' : '', price: sh ? f.price || '0' : '', dps: sh ? f.dps || '0' : '',
    freq: f.freq === 'monthly' ? '' : f.freq,
    market: ov ? 'overseas' : '', foreign: ov ? f.foreign || '0' : '',
    other: f.otherFin, hd: f.hd && !ov ? '1' : '', isa: f.isaLow ? 'low' : '',
    target: f.target || '0', growth: f.growth === '0' ? '' : f.growth,
  }
}

export default function DividendCalculator() {
  const t = useTranslations('dividendCalculator')
  const sp = useSearchParams()
  const W = t('won')
  const krw = (n: number) => fmtKRW(n, t)

  // 정적 HTML·첫 렌더는 기본값, hydration 뒤 공유 링크 값, 사용자가 고치면 그 값(edits)
  const hydrated = useHydrated()
  const [edits, setEdits] = useState<Form | null>(null)
  const form = edits ?? (hydrated ? fromUrl(sp) : DEFAULTS)
  const set = (patch: Partial<Form>) => setEdits((prev) => ({ ...(prev ?? form), ...patch }))
  const { mode, amount, yieldPct, shares, price, dps, freq, market, foreign, otherFin, hd, isaLow, target, growth } = form

  // 상태 → URL (고친 뒤에만). 기본값이 0이 아닌 칸은 비워도 '0'으로 남긴다 (빼면 받는 쪽이 기본값으로 계산)
  useEffect(() => {
    if (!edits) return
    const url = new URL(window.location.href)
    for (const [k, v] of Object.entries(toQuery(edits))) { if (v) url.searchParams.set(k, v); else url.searchParams.delete(k) }
    window.history.replaceState(window.history.state, '', url)
  }, [edits])

  const ov = market === 'overseas'
  const fPct = ov ? num(foreign) : null
  const invested = mode === 'amount' ? num(amount) : num(shares) * num(price)
  const yieldN = mode === 'amount' ? Math.min(100, num(yieldPct)) : num(price) > 0 ? (num(dps) / num(price)) * 100 : 0
  const gross = mode === 'amount' ? Math.floor((invested * yieldN) / 100 + 1e-6) : num(shares) * num(dps)
  const n = FREQS[freq]
  const src = atSource(gross, fPct)
  const ready = gross > 0
  const useHd = hd && !ov
  const other = num(otherFin)
  const fin = finCheck(gross, other, useHd)
  const hdr = highDividend(gross)
  const isa = isaAccount(gross, invested, isaLow)
  const pen = pensionAccount(gross)
  const req = requiredInvestment(num(target), yieldN, fPct)
  const tax = effRate(fPct)
  const sim = reinvest({ amount: invested, yieldPct: yieldN, freq, growthPct: num(growth), taxRate: tax, years: SIM_YEARS })
  const maxFin = maxAmountUnder(FIN_THRESHOLD, other, yieldN)
  const maxNhis = maxAmountUnder(NHIS_FIN, other, yieldN)
  const perPay = src.net / n
  const perPayLabel = t(`result.perPay.${freq}`)
  const faq = t.raw('guide.faq.items') as { q: string; a: string }[]
  const sources = t.raw('guide.sources.items') as { label: string; url: string }[]
  const accounts = [
    { key: 'general', tax: src.total, net: src.net },
    { key: 'isa', tax: isa.perYearTax, net: isa.perYearNet },
    { key: 'pension', tax: pen.under70, net: gross - pen.under70 },
  ] as const
  const bestTax = Math.min(...accounts.map((a) => a.tax))

  const switchMode = (m: Mode) => {
    if (m === mode) return
    // 같은 결과가 나오게 서로 환산해 채운다 (주식 수로: 주가 1만원 기준)
    if (m === 'shares' && !shares && !price && !dps) {
      set({ mode: m, price: '10000', shares: String(Math.floor(num(amount) / 10_000)), dps: String(Math.round(num(yieldPct) * 100)) })
    } else if (m === 'amount' && invested > 0 && invested <= MAX_AMOUNT) {
      set({ mode: m, amount: String(invested), yieldPct: String(Math.round(Math.min(100, yieldN) * 1000) / 1000) })
    } else set({ mode: m })
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-fg">{t('title')}</h1>
        <p className="text-sm text-muted mt-1">{t('subtitle')}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── 입력 ── */}
        <div className="lg:col-span-1">
          <div className="ui-card p-6 space-y-5">
            {ready && <MobileResultLink href="#dividend-result" label={perPayLabel} value={`${won(perPay)}${W}`} />}
            <Seg label={t('in.mode')} value={mode} onChange={switchMode}
              options={[{ v: 'amount', label: t('in.modes.amount') }, { v: 'shares', label: t('in.modes.shares') }]} />
            {mode === 'amount' ? (
              <>
                <Field id="dv-amount" label={t('in.amount')} value={amount} onChange={(v) => set({ amount: v })} unit={W} hint={invested > 0 ? krw(invested) : undefined} />
                <Field id="dv-yield" decimal label={t('in.yield')} value={yieldPct} onChange={(v) => set({ yieldPct: v })} unit="%" hint={t('in.yieldHint')} />
              </>
            ) : (
              <>
                <Field id="dv-shares" label={t('in.shares')} value={shares} onChange={(v) => set({ shares: v })} unit={t('unit.share')} />
                <Field id="dv-price" label={t('in.price')} value={price} onChange={(v) => set({ price: v })} unit={W} hint={invested > 0 ? t('in.investedHint', { v: krw(invested) }) : undefined} />
                <Field id="dv-dps" label={t('in.dps')} value={dps} onChange={(v) => set({ dps: v })} unit={W} hint={t('in.dpsHint', { rate: pct(yieldN) })} />
              </>
            )}
            <Seg label={t('in.freq')} value={freq} onChange={(v) => set({ freq: v })} options={FREQ_LIST.map((f) => ({ v: f, label: t(`in.freqs.${f}`) }))} />
            <Seg label={t('in.market')} value={market} onChange={(v) => set({ market: v })}
              options={[{ v: 'domestic', label: t('in.markets.domestic') }, { v: 'overseas', label: t('in.markets.overseas') }]} />
            {ov && <Field id="dv-foreign" decimal label={t('in.foreign')} value={foreign} onChange={(v) => set({ foreign: v })} unit="%" hint={t('in.foreignHint')} />}
            <Field id="dv-other" label={t('in.otherFin')} value={otherFin} onChange={(v) => set({ otherFin: v })} unit={W} hint={t('in.otherFinHint')} />
            {!ov && (
              <label className="flex items-start gap-3 min-h-[44px] cursor-pointer">
                <input type="checkbox" checked={hd} onChange={(e) => set({ hd: e.target.checked })} className="mt-0.5 w-5 h-5 shrink-0 accent-[var(--primary)]" />
                <span>
                  <span className="block text-sm font-medium text-body">{t('in.hd')}</span>
                  <span className="block text-xs text-muted mt-0.5">{t('in.hdHint')}</span>
                </span>
              </label>
            )}
          </div>
        </div>

        {/* ── 결과 ── */}
        <div className="lg:col-span-2 space-y-6">
          <div id="dividend-result" className="ui-card p-6 scroll-mt-20" aria-live="polite">
            {!ready ? (
              <p className="text-sm text-muted">{t('result.empty')}</p>
            ) : (
              <>
                <p className="text-sm text-sub">{perPayLabel}</p>
                <p className="text-3xl sm:text-4xl font-bold text-fg tabular-nums mt-1">{won(perPay)}{W}</p>
                <p className="text-sm text-body mt-2 tabular-nums">{t('result.sub', { gross: won(gross), net: won(src.net) })}</p>
                <dl className="mt-5 space-y-2 text-sm tabular-nums">
                  {n > 1 && <Row label={t('result.perPayGross')} value={`${won(gross / n)}${W}`} />}
                  <Row label={t('result.annualGross')} value={`${won(gross)}${W}`} />
                  {ov && <Row sub label={t('result.foreignTax', { rate: pct(num(foreign)) })} value={`${minus(src.foreign)}${W}`} />}
                  <Row sub label={ov ? t('result.krTax') : t('result.incomeTax')} value={`${minus(src.income)}${W}`} />
                  <Row sub label={t('result.localTax')} value={`${minus(src.local)}${W}`} />
                  <Row label={t('result.taxTotal')} value={`${won(src.total)}${W} (${t('result.taxRate', { rate: pct((src.total / gross) * 100) })})`} />
                  <div className="border-t border-line pt-2 space-y-2">
                    <Row strong label={t('result.annualNet')} value={`${won(src.net)}${W}`} />
                    {freq !== 'monthly' && <Row label={t('result.monthlyAvg')} value={`${won(src.net / 12)}${W}`} />}
                    {invested > 0 && <Row label={t('result.netYield')} value={`${pct((src.net / invested) * 100)}%`} />}
                  </div>
                </dl>
                {useHd && hdr.separate && <p className="text-sm text-body bg-subtle rounded-xl px-4 py-3 mt-4 tabular-nums">{t('result.hdLine', { extra: won(hdr.extra), net: won(hdr.net) })}</p>}
                {fin.over && (
                  <div className="bg-amber-50 text-amber-800 rounded-2xl p-4 text-sm mt-4">
                    <p>{t('result.finLine')}</p>
                    <a href="#dividend-fin" className="inline-flex items-center min-h-[44px] font-medium underline">{t('result.finLink')}</a>
                  </div>
                )}
                <ShareResult
                  className="mt-5"
                  card={{
                    tool: t('title'),
                    label: t('share.label', { amount: krw(invested), rate: pct(yieldN), what: perPayLabel }),
                    headline: `${won(perPay)}${W}`,
                    sub: t('result.sub', { gross: won(gross), net: won(src.net) }),
                    rows: [
                      { label: t('result.annualGross'), value: `${won(gross)}${W}` },
                      { label: t('result.taxTotal'), value: `${won(src.total)}${W}` },
                      { label: t('result.annualNet'), value: `${won(src.net)}${W}` },
                      { label: t('result.monthlyAvg'), value: `${won(src.net / 12)}${W}` },
                    ],
                  }}
                  text={t('share.text', { amount: krw(invested), rate: pct(yieldN), monthly: `${won(src.net / 12)}${W}` })}
                  fileName="dividend"
                />
              </>
            )}
          </div>

          {/* 금융소득 종합과세 · 건강보험료 */}
          <div id="dividend-fin" className="ui-card p-6 space-y-4 scroll-mt-20">
            <h2 className="text-lg font-semibold text-fg">{t('fin.title')}</h2>
            <div>
              <div className="flex justify-between gap-3 text-sm text-body tabular-nums">
                <span>{t('fin.counted')}</span>
                <span className="shrink-0 font-semibold text-fg">{won(fin.counted)}{W}</span>
              </div>
              <div className="h-2 bg-track rounded-full mt-2 overflow-hidden">
                <div className="h-full bg-primary rounded-full" style={{ width: `${Math.min(100, (fin.counted / FIN_THRESHOLD) * 100)}%` }} />
              </div>
              <p className="text-xs text-muted mt-1.5 tabular-nums">
                {useHd ? t('fin.countedHintHd', { div: won(gross), other: won(other) }) : t('fin.countedHint', { div: won(gross), other: won(other) })}
              </p>
            </div>
            <dl className="space-y-2 text-sm tabular-nums">
              {fin.over
                ? <Row label={t('fin.excess')} value={`${won(fin.excess)}${W}`} />
                : <Row label={t('fin.room')} value={`${won(fin.room)}${W}`} />}
              {!useHd && maxFin != null && <Row label={t('fin.maxInvest', { rate: pct(yieldN) })} value={krw(maxFin)} />}
            </dl>
            {fin.over ? (
              <div className="bg-amber-50 text-amber-800 rounded-2xl p-4 text-sm space-y-2">
                <p className="font-semibold tabular-nums">{t('fin.over', { excess: won(fin.excess) })}</p>
                <ul className="list-disc pl-5 space-y-1">
                  {(t.raw('fin.overItems') as string[]).map((x, i) => <li key={i}>{x}</li>)}
                </ul>
                <Link href="/income-tax/" className="inline-flex items-center min-h-[44px] font-medium underline">{t('fin.toIncomeTax')}</Link>
              </div>
            ) : (
              <p className="bg-subtle rounded-2xl p-5 text-sm text-sub">{useHd && fin.total > FIN_THRESHOLD ? t('fin.okHd') : t('fin.ok')}</p>
            )}

            <h3 className="font-semibold text-fg pt-2">{t('fin.nhisTitle')}</h3>
            {fin.nhis ? (
              <div className="bg-amber-50 text-amber-800 rounded-2xl p-4 text-sm space-y-2">
                <p className="font-semibold tabular-nums">{t('fin.nhisOver', { total: won(fin.total) })}</p>
                <ul className="list-disc pl-5 space-y-1">
                  {(t.raw('fin.nhisItems') as string[]).map((x, i) => <li key={i}>{x}</li>)}
                </ul>
              </div>
            ) : (
              <div className="bg-subtle rounded-2xl p-5 text-sm text-sub space-y-1 tabular-nums">
                <p>{t('fin.nhisOk', { room: won(fin.nhisRoom) })}</p>
                {maxNhis != null && <p>{t('fin.nhisMax', { rate: pct(yieldN), max: krw(maxNhis) })}</p>}
              </div>
            )}
            <p className="text-xs text-muted">{t('fin.nhisNote')}</p>
          </div>

          {/* 고배당기업 분리과세 */}
          <div className="ui-card p-6 space-y-4">
            <h2 className="text-lg font-semibold text-fg">{t('hd.title')}</h2>
            <p className="text-sm text-sub">{t('hd.desc')}</p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm tabular-nums min-w-[460px]">
                <thead>
                  <tr className="text-xs text-muted border-b border-line">
                    <th scope="col" className="text-left font-medium py-2 pr-3">{t('hd.col.range')}</th>
                    <th scope="col" className="text-left font-medium py-2 px-3">{t('hd.col.tax')}</th>
                    <th scope="col" className="text-right font-medium py-2 pl-3">{t('hd.col.marginal')}</th>
                  </tr>
                </thead>
                <tbody className="text-body">
                  {HD_TABLE.map((b, i) => {
                    const from = i ? krw(HD_TABLE[i - 1].upTo) : ''
                    const range = i === 0 ? t('hd.upTo', { to: krw(b.upTo) }) : b.upTo === Infinity ? t('hd.over', { from }) : t('hd.range', { from, to: krw(b.upTo) })
                    return (
                      <tr key={b.rate} className="border-b border-line last:border-0">
                        <td className="py-2 pr-3">{range}</td>
                        <td className="py-2 px-3">{i === 0 ? t('hd.flat', { rate: b.rate }) : t('hd.formula', { base: krw(b.base), from, rate: b.rate })}</td>
                        <td className="py-2 pl-3 text-right">{t('hd.withLocal', { rate: pct(b.rate * 1.1) })}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            {ov ? (
              <p className="bg-subtle rounded-2xl p-5 text-sm text-sub">{t('hd.overseas')}</p>
            ) : !useHd ? (
              <p className="text-sm text-muted">{t('hd.offHint')}</p>
            ) : !ready ? null : hdr.separate ? (
              <>
                <dl className="space-y-2 text-sm tabular-nums">
                  <Row label={t('hd.rows.income')} value={`${won(hdr.income)}${W}`} />
                  <Row label={t('hd.rows.local')} value={`${won(hdr.local)}${W}`} />
                  <Row strong label={t('hd.rows.total')} value={`${won(hdr.total)}${W}`} />
                  <Row label={t('hd.rows.withheld')} value={`${won(hdr.withheld)}${W}`} />
                  <Row label={t('hd.rows.extra')} value={`${won(hdr.extra)}${W}`} />
                  <div className="border-t border-line pt-2">
                    <Row strong label={t('hd.rows.net')} value={`${won(hdr.net)}${W}`} />
                  </div>
                </dl>
                <p className="bg-subtle rounded-2xl p-5 text-sm text-sub">{t('hd.compare')}</p>
              </>
            ) : (
              <p className="bg-subtle rounded-2xl p-5 text-sm text-sub">{t('hd.same')}</p>
            )}
            <p className="text-xs text-muted">{t('hd.note')}</p>
          </div>

          {/* 계좌별 비교 */}
          <div className="ui-card p-6 space-y-4">
            <h2 className="text-lg font-semibold text-fg">{t('acct.title')}</h2>
            <p className="text-sm text-sub tabular-nums">{t('acct.desc', { gross: won(gross) })}</p>
            {ov ? (
              <p className="bg-subtle rounded-2xl p-5 text-sm text-sub">{t('acct.overseas')}</p>
            ) : (
              <>
                <Seg label={t('acct.isaType')} value={isaLow ? 'low' : 'normal'} onChange={(v) => set({ isaLow: v === 'low' })}
                  options={[{ v: 'normal', label: t('acct.isaTypes.normal') }, { v: 'low', label: t('acct.isaTypes.low') }]} />
                <div className="overflow-x-auto">
                  <table className="w-full text-sm tabular-nums min-w-[560px]">
                    <thead>
                      <tr className="text-xs text-muted border-b border-line">
                        <th scope="col" className="text-left font-medium py-2 pr-3">{t('acct.col.account')}</th>
                        <th scope="col" className="text-right font-medium py-2 px-3">{t('acct.col.tax')}</th>
                        <th scope="col" className="text-right font-medium py-2 px-3">{t('acct.col.net')}</th>
                        <th scope="col" className="text-left font-medium py-2 pl-3 w-2/5">{t('acct.col.when')}</th>
                      </tr>
                    </thead>
                    <tbody className="text-body">
                      {accounts.map((a) => (
                        <tr key={a.key} className="border-b border-line last:border-0 align-top">
                          <td className="py-3 pr-3">
                            <span className="block font-medium text-fg">{t(`acct.${a.key}.name`)}</span>
                            {ready && a.tax === bestTax && <span className="inline-block mt-1 rounded-full bg-primary text-white px-2 py-0.5 text-[11px] font-medium">{t('acct.best')}</span>}
                          </td>
                          <td className="py-3 px-3 text-right">{won(a.tax)}</td>
                          <td className="py-3 px-3 text-right font-semibold text-fg">{won(a.net)}</td>
                          <td className="py-3 pl-3 text-xs text-sub">
                            {a.key === 'isa' ? t('acct.isa.when', { exempt: krw(isa.exempt) }) : t(`acct.${a.key}.when`)}
                            {a.key === 'pension' && <span className="block mt-1 text-muted">{t('acct.pension.sub', { u80: won(pen.under80), o80: won(pen.over80), other: won(pen.other) })}</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {isa.overflow > 0 && <p className="text-xs text-muted">{t('acct.isaOverflow', { amount: krw(isa.overflow) })}</p>}
                <ul className="list-disc pl-5 space-y-1 text-xs text-sub">
                  {(t.raw('acct.notes') as string[]).map((x, i) => <li key={i}>{x}</li>)}
                </ul>
              </>
            )}
          </div>

          {/* 월 배당 목표 역산 */}
          <div className="ui-card p-6 space-y-4">
            <h2 className="text-lg font-semibold text-fg">{t('target.title')}</h2>
            <p className="text-sm text-sub">{t('target.desc')}</p>
            <div className="flex flex-wrap gap-2" role="group" aria-label={t('target.presets')}>
              {TARGETS.map((v) => (
                <button key={v} type="button" aria-pressed={num(target) === v} onClick={() => set({ target: String(v) })} className={chip(num(target) === v)}>{krw(v)}</button>
              ))}
            </div>
            <div className="max-w-sm">
              <Field id="dv-target" label={t('target.input')} value={target} onChange={(v) => set({ target: v })} unit={W} />
            </div>
            {req ? (
              <div aria-live="polite">
                <p className="text-sm text-sub">{t('target.result')}</p>
                <p className="text-3xl font-bold text-fg tabular-nums mt-1">{krw(req.amount)}</p>
                <p className="text-xs text-muted mt-1 tabular-nums">{t('target.exact', { v: won(req.amount) })}</p>
                <p className="text-sm text-sub mt-2 tabular-nums">{t('target.sub', { rate: pct(yieldN), tax: pct(tax * 100), gross: won(req.gross) })}</p>
                {req.gross + other > FIN_THRESHOLD && <p className="bg-amber-50 text-amber-800 rounded-2xl p-4 text-sm mt-3">{t('target.finWarn')}</p>}
              </div>
            ) : (
              <p className="text-sm text-muted">{t('target.noYield')}</p>
            )}
          </div>

          {/* 재투자 시뮬레이션 */}
          <div className="ui-card p-6 space-y-4">
            <h2 className="text-lg font-semibold text-fg">{t('sim.title')}</h2>
            <p className="text-sm text-sub">{t('sim.desc')}</p>
            <div className="max-w-sm">
              <Field id="dv-growth" decimal label={t('sim.growth')} value={growth} onChange={(v) => set({ growth: v })} unit="%" hint={t('sim.growthHint')} />
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm tabular-nums min-w-[560px]">
                <thead>
                  <tr className="text-xs text-muted border-b border-line">
                    <th scope="col" className="text-left font-medium py-2 pr-3">{t('sim.col.when')}</th>
                    <th scope="col" className="text-right font-medium py-2 px-3">{t('sim.col.value')}</th>
                    <th scope="col" className="text-right font-medium py-2 px-3">{t('sim.col.monthly')}</th>
                    <th scope="col" className="text-right font-medium py-2 pl-3">{t('sim.col.noReinvest')}</th>
                  </tr>
                </thead>
                <tbody className="text-body">
                  <tr className="border-b border-line text-sub">
                    <td className="py-2 pr-3">{t('sim.now')}</td>
                    <td className="py-2 px-3 text-right">{krw(invested)}</td>
                    <td className="py-2 px-3 text-right">{won(src.net / 12)}{W}</td>
                    <td className="py-2 pl-3 text-right">-</td>
                  </tr>
                  {sim.map((r) => (
                    <tr key={r.year} className="border-b border-line last:border-0">
                      <td className="py-2 pr-3">{t('sim.year', { n: r.year })}</td>
                      <td className="py-2 px-3 text-right font-semibold text-fg">{Number.isFinite(r.value) ? krw(r.value) : '—'}</td>
                      <td className="py-2 px-3 text-right">{won(r.monthlyNet)}{W}</td>
                      <td className="py-2 pl-3 text-right">{Number.isFinite(r.noReinvest) ? krw(r.noReinvest) : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-muted">{t('sim.note', { tax: pct(tax * 100) })}</p>
          </div>
        </div>
      </div>

      {/* ── 가이드 (정적 HTML) ── */}
      <div className="ui-card p-6 space-y-6">
        <h2 className="text-xl font-semibold text-fg">{t('guide.title')}</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {(['how', 'accounts', 'highDiv', 'tips'] as const).map((sec) => (
            <div key={sec}>
              <h3 className="font-semibold text-fg mb-3">{t(`guide.${sec}.title`)}</h3>
              <ul className="list-disc pl-5 space-y-2 text-sm text-sub">
                {(t.raw(`guide.${sec}.items`) as string[]).map((item, i) => <li key={i}>{item}</li>)}
              </ul>
            </div>
          ))}
        </div>
        <div>
          <h3 className="font-semibold text-fg mb-3">{t('guide.faq.title')}</h3>
          <div className="divide-y divide-line border-y border-line">
            {faq.map((f) => (
              <details key={f.q} className="py-3">
                <summary className="cursor-pointer text-sm font-medium text-body min-h-[24px]">{f.q}</summary>
                <p className="text-sm text-sub mt-2 leading-relaxed">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
        <div className="bg-subtle rounded-2xl p-5 text-sm text-sub space-y-2">
          <p className="font-medium text-body">{t('guide.sources.title')}</p>
          <ul className="space-y-1">
            {sources.map((s) => (
              <li key={s.url}><a href={s.url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">{s.label}</a></li>
            ))}
          </ul>
          <p className="text-xs text-muted">{t('guide.sources.asOf')}</p>
        </div>
      </div>
      <p className="text-xs text-muted">{t('disclaimer')}</p>
    </div>
  )
}

function Field({ id, label, value, onChange, unit, hint, decimal }: {
  id: string; label: string; value: string; onChange: (v: string) => void; unit: string; hint?: string; decimal?: boolean
}) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-body mb-1.5">{label}</label>
      <div className="relative">
        <input id={id} type="text" inputMode={decimal ? 'decimal' : 'numeric'} autoComplete="off"
          value={decimal ? value : value ? num(value).toLocaleString('ko-KR') : ''}
          onChange={(e) => onChange(decimal ? dec(e.target.value) : digits(e.target.value))}
          placeholder="0" aria-describedby={hint ? `${id}-hint` : undefined}
          className="ui-field w-full min-h-[44px] px-4 py-3 pr-14 text-sm tabular-nums" />
        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-faint pointer-events-none">{unit}</span>
      </div>
      {hint && <p id={`${id}-hint`} className="text-xs text-muted mt-1.5 tabular-nums">{hint}</p>}
    </div>
  )
}

function Seg<T extends string>({ label, value, options, onChange }: {
  label: string; value: T; options: { v: T; label: string }[]; onChange: (v: T) => void
}) {
  const id = useId()
  return (
    <div>
      <p id={id} className="text-sm font-medium text-body mb-1.5">{label}</p>
      <div role="group" aria-labelledby={id} className="flex gap-1 bg-soft rounded-xl p-1">
        {options.map((o) => (
          <button key={o.v} type="button" aria-pressed={value === o.v} onClick={() => onChange(o.v)}
            className={`flex-1 min-h-[44px] rounded-lg px-2 text-sm font-medium ${value === o.v ? 'bg-primary text-white' : 'text-sub hover:text-fg'}`}>
            {o.label}
          </button>
        ))}
      </div>
    </div>
  )
}

function Row({ label, value, strong, sub }: { label: ReactNode; value: string; strong?: boolean; sub?: boolean }) {
  return (
    <div className={`flex justify-between gap-3 ${sub ? 'pl-4 text-xs text-muted' : strong ? 'font-semibold text-fg' : 'text-body'}`}>
      <dt className="min-w-0">{label}</dt>
      <dd className="shrink-0 text-right">{value}</dd>
    </div>
  )
}
