'use client'

import { useState, useMemo, useEffect } from 'react'
import { ExternalLink } from 'lucide-react'
import { useTranslations } from '@/lib/i18n'
import '@/lib/i18n/ns/savings'
import { useSearchParams } from '@/hooks/useSearchParams'
import ShareResult from '@/components/ShareResult'
import MobileResultLink from '@/components/MobileResultLink'
import GuideSection from '@/components/GuideSection'
import {
  calc, schedule, requiredAmount, savingToDepositRate, depositToSavingRate,
  TAX_RATES, TAX_KEYS, type Kind, type TaxKey,
} from '@/utils/savings'

const won = (n: number) => Math.round(n).toLocaleString('ko-KR')
const pct = (n: number) => (Math.round(n * 100) / 100).toString()
const num = (s: string) => parseFloat(s.replace(/,/g, '')) || 0
const commas = (s: string) => {
  const d = s.replace(/[^\d]/g, '')
  return d ? Number(d).toLocaleString('ko-KR') : ''
}
const PERIODS = [6, 12, 24, 36]
const isTax = (s: string | null): s is TaxKey => !!s && (TAX_KEYS as string[]).includes(s)

interface Product { rate: string; months: string; tax: TaxKey; compound: boolean }
const DEFAULT_CMP: Product[] = [
  { rate: '3.5', months: '12', tax: 'normal', compound: false },
  { rate: '4', months: '24', tax: 'normal', compound: false },
  { rate: '3.2', months: '12', tax: 'coop', compound: false },
]
const parseCmp = (s: string | null): Product[] | null => {
  if (!s) return null
  const list = s.split('~').slice(0, 3).map((x) => {
    const [rate, months, tax, c] = x.split('_')
    return isTax(tax) && +rate >= 0 && +months > 0 ? { rate, months, tax, compound: c === '1' } : null
  })
  return list.length && list.every(Boolean) ? (list as Product[]) : null
}

const LINKS = [
  { key: 'finlife', href: 'https://finlife.fss.or.kr' },
  { key: 'taxAct', href: 'https://www.law.go.kr/법령/소득세법/제129조' },
  { key: 'tsfa', href: 'https://www.law.go.kr/법령/조세특례제한법/제88조의2' },
  { key: 'coop', href: 'https://www.law.go.kr/법령/조세특례제한법/제89조의3' },
  { key: 'kinfa', href: 'https://www.kinfa.or.kr' },
]

export default function SavingsCalculator() {
  const t = useTranslations('savings')
  const sp = useSearchParams()

  const [kind, setKind] = useState<Kind>(() => (sp.get('k') === 'd' ? 'deposit' : 'saving'))
  const [amountText, setAmountText] = useState(() => commas(sp.get('a') || (sp.get('k') === 'd' ? '10000000' : '500000')))
  const [rateText, setRateText] = useState(() => sp.get('r') || '3.5')
  const [monthsText, setMonthsText] = useState(() => sp.get('n') || '12')
  const [compound, setCompound] = useState(() => sp.get('c') === '1')
  const [tax, setTax] = useState<TaxKey>(() => { const x = sp.get('tax'); return isTax(x) ? x : 'normal' })
  const [cmpRateText, setCmpRateText] = useState(() => sp.get('dr') || '3')
  const [goalText, setGoalText] = useState(() => commas(sp.get('g') || '10000000'))
  const [products, setProducts] = useState<Product[]>(() => parseCmp(sp.get('cmp')) || DEFAULT_CMP)

  const amount = num(amountText)
  const rate = Math.min(100, num(rateText))
  const months = Math.min(600, Math.floor(num(monthsText)))
  const goal = num(goalText)
  const cmpRate = Math.min(100, num(cmpRateText))
  const plan = { kind, amount, rate, months, compound, tax }
  const r = useMemo(() => calc(plan), [kind, amount, rate, months, compound, tax]) // eslint-disable-line react-hooks/exhaustive-deps
  const rows = useMemo(() => schedule(plan), [kind, amount, rate, months, compound, tax]) // eslint-disable-line react-hooks/exhaustive-deps
  const isSaving = kind === 'saving'

  // 같은 총원금을 반대 상품(예금↔적금)에 cmpRate% 로 넣었을 때
  const other = calc(isSaving
    ? { kind: 'deposit', amount: r.principal, rate: cmpRate, months, compound: false, tax }
    : { kind: 'saving', amount: months > 0 ? amount / months : 0, rate: cmpRate, months, compound: false, tax })
  const equiv = isSaving ? savingToDepositRate(rate, months) : depositToSavingRate(rate, months)
  const need = requiredAmount(goal, kind, rate, months, compound, tax)
  const cmp = products.map((p) => {
    const n = Math.floor(num(p.months))
    return { p, n, ...calc({ kind, amount, rate: num(p.rate), months: n, compound: p.compound, tax: p.tax }) }
  })
  const best = cmp.reduce((b, x, i) => (x.yearly > cmp[b].yearly ? i : b), 0)

  useEffect(() => {
    const p = new URLSearchParams()
    if (!isSaving) p.set('k', 'd')
    p.set('a', String(amount)); p.set('r', rateText); p.set('n', String(months))
    if (compound) p.set('c', '1')
    if (tax !== 'normal') p.set('tax', tax)
    p.set('dr', cmpRateText); p.set('g', String(goal))
    p.set('cmp', products.map((x) => `${x.rate}_${x.months}_${x.tax}_${x.compound ? 1 : 0}`).join('~'))
    const id = setTimeout(() => window.history.replaceState(null, '', `${window.location.pathname}?${p}`), 300)
    return () => clearTimeout(id)
  }, [isSaving, amount, rateText, months, compound, tax, cmpRateText, goal, products])

  const switchKind = (k: Kind) => {
    if (k === kind) return
    setKind(k)
    setAmountText(k === 'deposit' ? '10,000,000' : '500,000')
  }
  const setProduct = (i: number, patch: Partial<Product>) =>
    setProducts((list) => list.map((x, j) => (j === i ? { ...x, ...patch } : x)))

  const seg = (on: boolean) =>
    `px-2 py-2 rounded-lg text-sm font-medium transition-colors ${on ? 'bg-primary text-white' : 'bg-soft text-body hover:bg-subtle'}`
  const taxLabel = (k: TaxKey) => `${t(`c.tax.${k}`)} ${pct(TAX_RATES[k] * 100)}%`
  const kindLabel = t(isSaving ? 'c.kindShort.saving' : 'c.kindShort.deposit')
  const amountLabel = isSaving ? t('c.share.monthly', { a: won(amount) }) : t('c.share.lump', { a: won(amount) })

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-fg">{t('title')}</h1>
        <p className="text-sm text-muted mt-1">{t('description')}</p>
      </div>

      <div className="grid grid-cols-2 gap-2 max-w-sm" role="tablist">
        {(['saving', 'deposit'] as Kind[]).map((k) => (
          <button key={k} role="tab" aria-selected={kind === k} onClick={() => switchKind(k)} className={seg(kind === k)}>
            {t(`c.kind.${k}`)}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 입력 */}
        <div className="ui-card p-6 space-y-5">
          <MobileResultLink href="#savings-calculator-result" label={t('c.res.maturity', { n: months })} value={`${won(r.maturity)}${t('c.won')}`} />
          <label className="block">
            <span className="block text-sm font-medium text-body mb-2">{t(isSaving ? 'c.in.monthly' : 'c.in.principal')}</span>
            <div className="relative">
              <input inputMode="numeric" value={amountText} onChange={(e) => setAmountText(commas(e.target.value))}
                className="ui-field w-full px-4 py-3 pr-10 text-lg font-semibold tabular-nums" />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sub">{t('c.won')}</span>
            </div>
          </label>
          <label className="block">
            <span className="block text-sm font-medium text-body mb-2">{t('c.in.rate')}</span>
            <div className="relative">
              <input inputMode="decimal" value={rateText} onChange={(e) => /^\d*\.?\d*$/.test(e.target.value) && setRateText(e.target.value)}
                className="ui-field w-full px-4 py-3 pr-10 text-lg font-semibold tabular-nums" />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sub">%</span>
            </div>
          </label>
          <div>
            <label className="block">
              <span className="block text-sm font-medium text-body mb-2">{t('c.in.months')}</span>
              <div className="relative">
                <input inputMode="numeric" value={monthsText} onChange={(e) => /^\d{0,3}$/.test(e.target.value) && setMonthsText(e.target.value)}
                  className="ui-field w-full px-4 py-3 pr-14 text-lg font-semibold tabular-nums" />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sub">{t('c.monthsUnit')}</span>
              </div>
            </label>
            <div className="grid grid-cols-4 gap-2 mt-2">
              {PERIODS.map((m) => (
                <button key={m} onClick={() => setMonthsText(String(m))} aria-pressed={months === m} className={seg(months === m)}>
                  {t('c.nMonths', { n: m })}
                </button>
              ))}
            </div>
          </div>
          <div>
            <span className="block text-sm font-medium text-body mb-2">{t('c.in.method')}</span>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => setCompound(false)} aria-pressed={!compound} className={seg(!compound)}>{t('c.simple')}</button>
              <button onClick={() => setCompound(true)} aria-pressed={compound} className={seg(compound)}>{t('c.compound')}</button>
            </div>
          </div>
          <div>
            <span className="block text-sm font-medium text-body mb-2">{t('c.in.tax')}</span>
            <div className="grid grid-cols-2 gap-2">
              {TAX_KEYS.map((k) => (
                <button key={k} onClick={() => setTax(k)} aria-pressed={tax === k} className={seg(tax === k)}>{taxLabel(k)}</button>
              ))}
            </div>
            <p className="text-xs text-muted mt-2 leading-relaxed">{t(`c.taxHint.${tax}`)}</p>
          </div>
        </div>

        {/* 결과 */}
        <div className="lg:col-span-2 space-y-6">
          <div id="savings-calculator-result" className="ui-card p-6 scroll-mt-20">
            <p className="text-sm text-sub">{t('c.res.maturity', { n: months })}</p>
            <p className="text-3xl sm:text-4xl font-bold text-fg tabular-nums mt-1">{won(r.maturity)}{t('c.won')}</p>
            <p className="text-sm text-muted mt-1">{t('c.res.gross', { a: won(r.maturityGross) })}</p>
            <dl className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5">
              {[
                ['principal', r.principal], ['grossInterest', r.gross], ['tax', r.tax], ['netInterest', r.net],
              ].map(([k, v]) => (
                <div key={k} className="bg-subtle rounded-xl p-3">
                  <dt className="text-xs text-sub">{t(`c.res.${k}`)}</dt>
                  <dd className={`text-base font-semibold tabular-nums mt-0.5 ${k === 'netInterest' ? 'text-primary' : 'text-fg'}`}>
                    {k === 'tax' && Number(v) > 0 ? '−' : ''}{won(Number(v))}{t('c.won')}
                  </dd>
                </div>
              ))}
            </dl>
            {isSaving && !compound && months > 0 && (
              <p className="text-xs text-muted mt-3 tabular-nums">
                {t('c.res.formula', { a: won(amount), r: pct(rate), n: months, k: (months * (months + 1)) / 2, g: won(r.gross) })}
              </p>
            )}
            <ShareResult className="mt-5" fileName="savings"
              card={{
                tool: t('title'),
                label: t('c.share.label', { kind: kindLabel, a: amountLabel, n: months, r: pct(rate) }),
                headline: `${won(r.maturity)}${t('c.won')}`,
                sub: t('c.share.sub', { i: won(r.net), tax: taxLabel(tax) }),
                rows: [
                  { label: t('c.res.principal'), value: `${won(r.principal)}${t('c.won')}` },
                  { label: t('c.res.grossInterest'), value: `${won(r.gross)}${t('c.won')}` },
                  { label: t('c.res.netInterest'), value: `${won(r.net)}${t('c.won')}` },
                  { label: t('c.real.yearly'), value: `${pct(r.yearly)}%` },
                ],
              }} />
          </div>

          {/* 실질 연수익률 */}
          <div className="ui-card p-6">
            <h2 className="text-lg font-semibold text-fg">{t('c.real.title')}</h2>
            <p className="text-2xl font-bold text-fg tabular-nums mt-3">
              {t(isSaving ? 'c.real.savingIs' : 'c.real.depositIs', { r: pct(rate), e: pct(equiv) })}
            </p>
            <p className="text-sm text-sub mt-2 leading-relaxed">
              {t(isSaving ? 'c.real.whySaving' : 'c.real.whyDeposit', { n: months, avg: won(isSaving ? (amount * (months + 1)) / 2 : amount) })}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-5">
              <div className="bg-primary-soft rounded-xl p-4">
                <p className="text-sm text-primary font-medium">{t('c.real.thisOne', { kind: kindLabel, r: pct(rate) })}</p>
                <p className="text-xl font-bold text-fg tabular-nums mt-1">{t('c.real.net', { a: won(r.net) })}</p>
                <p className="text-xs text-sub mt-1">{t('c.real.yearlyIs', { y: pct(r.yearly) })}</p>
              </div>
              <div className="bg-subtle rounded-xl p-4">
                <label className="flex items-center gap-2 text-sm text-body font-medium">
                  {t(isSaving ? 'c.real.ifDeposit' : 'c.real.ifSaving')}
                  <input inputMode="decimal" value={cmpRateText} onChange={(e) => /^\d*\.?\d*$/.test(e.target.value) && setCmpRateText(e.target.value)}
                    aria-label={t('c.real.otherRate')} className="ui-field w-20 px-2 py-1 text-right tabular-nums" />
                  %
                </label>
                <p className="text-xl font-bold text-fg tabular-nums mt-1">{t('c.real.net', { a: won(other.net) })}</p>
                <p className="text-xs text-sub mt-1">{t('c.real.yearlyIs', { y: pct(other.yearly) })}</p>
              </div>
            </div>
            <p className="text-sm text-body mt-3">
              {r.net === other.net ? t('c.real.same')
                : r.net > other.net ? t('c.real.better', { kind: kindLabel, d: won(r.net - other.net) })
                  : t('c.real.worse', { kind: t(isSaving ? 'c.kindShort.deposit' : 'c.kindShort.saving'), d: won(other.net - r.net) })}
            </p>
            {isSaving && <p className="text-xs text-muted mt-1">{t('c.real.note')}</p>}
          </div>

          {/* 월별 잔액 */}
          <details className="ui-card p-6">
            <summary className="font-semibold text-fg cursor-pointer">{t('c.sched.title', { n: months })}</summary>
            <div className="overflow-x-auto mt-4 max-h-96">
              <table className="w-full text-sm tabular-nums">
                <thead className="text-sub">
                  <tr className="border-b border-line">
                    <th className="text-left py-2 font-medium">{t('c.sched.month')}</th>
                    <th className="text-right py-2 font-medium">{t('c.sched.principal')}</th>
                    <th className="text-right py-2 font-medium">{t('c.sched.interest')}</th>
                    <th className="text-right py-2 font-medium">{t('c.sched.balance')}</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((x) => (
                    <tr key={x.month} className="border-b border-line">
                      <td className="py-2 text-body">{t('c.nMonths', { n: x.month })}</td>
                      <td className="py-2 text-right text-body">{won(x.principal)}</td>
                      <td className="py-2 text-right text-body">{won(x.interest)}</td>
                      <td className="py-2 text-right text-fg font-medium">{won(x.balance)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-muted mt-3">{t('c.sched.note')}</p>
          </details>
        </div>
      </div>

      {/* 목표 금액 역산 */}
      <div className="ui-card p-6">
        <h2 className="text-lg font-semibold text-fg">{t('c.goal.title')}</h2>
        <p className="text-sm text-muted mt-1">{t('c.goal.desc', { n: months, r: pct(rate), tax: taxLabel(tax) })}</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4 items-end">
          <label className="block">
            <span className="block text-sm font-medium text-body mb-2">{t('c.goal.target')}</span>
            <div className="relative">
              <input inputMode="numeric" value={goalText} onChange={(e) => setGoalText(commas(e.target.value))}
                className="ui-field w-full px-4 py-3 pr-10 text-lg font-semibold tabular-nums" />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sub">{t('c.won')}</span>
            </div>
          </label>
          <div className="bg-subtle rounded-xl p-4">
            <p className="text-sm text-sub">{t(isSaving ? 'c.goal.needMonthly' : 'c.goal.needPrincipal', { n: months })}</p>
            <p className="text-2xl font-bold text-fg tabular-nums mt-1">{need > 0 ? `${won(need)}${t('c.won')}` : '—'}</p>
          </div>
        </div>
        {need > 0 && (
          <button onClick={() => setAmountText(won(need))} className="ui-btn-soft px-4 py-2 rounded-xl text-sm mt-4">
            {t('c.goal.apply')}
          </button>
        )}
      </div>

      {/* 상품 비교 */}
      <div className="ui-card p-6">
        <h2 className="text-lg font-semibold text-fg">{t('c.cmp.title')}</h2>
        <p className="text-sm text-muted mt-1">{t('c.cmp.desc', { kind: kindLabel, a: amountLabel })}</p>
        <div className="overflow-x-auto mt-4">
          <table className="w-full text-sm tabular-nums min-w-[520px]">
            <thead>
              <tr className="border-b border-line">
                <th className="text-left py-2 font-medium text-sub w-28" />
                {cmp.map((_, i) => (
                  <th key={i} className={`text-right py-2 px-2 font-semibold ${i === best ? 'text-primary' : 'text-fg'}`}>
                    {t('c.cmp.product', { n: i + 1 })}{i === best ? ` · ${t('c.cmp.best')}` : ''}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-line">
                <td className="py-2 text-sub">{t('c.in.rate')}</td>
                {products.map((p, i) => (
                  <td key={i} className="py-2 px-2 text-right">
                    <input inputMode="decimal" value={p.rate} aria-label={`${t('c.cmp.product', { n: i + 1 })} ${t('c.in.rate')}`}
                      onChange={(e) => /^\d*\.?\d*$/.test(e.target.value) && setProduct(i, { rate: e.target.value })}
                      className="ui-field w-20 px-2 py-1 text-right" /> %
                  </td>
                ))}
              </tr>
              <tr className="border-b border-line">
                <td className="py-2 text-sub">{t('c.in.months')}</td>
                {products.map((p, i) => (
                  <td key={i} className="py-2 px-2 text-right">
                    <input inputMode="numeric" value={p.months} aria-label={`${t('c.cmp.product', { n: i + 1 })} ${t('c.in.months')}`}
                      onChange={(e) => /^\d{0,3}$/.test(e.target.value) && setProduct(i, { months: e.target.value })}
                      className="ui-field w-20 px-2 py-1 text-right" /> {t('c.monthsUnit')}
                  </td>
                ))}
              </tr>
              <tr className="border-b border-line">
                <td className="py-2 text-sub">{t('c.in.tax')}</td>
                {products.map((p, i) => (
                  <td key={i} className="py-2 px-2 text-right">
                    <select value={p.tax} onChange={(e) => setProduct(i, { tax: e.target.value as TaxKey })}
                      aria-label={`${t('c.cmp.product', { n: i + 1 })} ${t('c.in.tax')}`} className="ui-field px-2 py-1">
                      {TAX_KEYS.map((k) => <option key={k} value={k}>{taxLabel(k)}</option>)}
                    </select>
                  </td>
                ))}
              </tr>
              <tr className="border-b border-line">
                <td className="py-2 text-sub">{t('c.in.method')}</td>
                {products.map((p, i) => (
                  <td key={i} className="py-2 px-2 text-right">
                    <select value={p.compound ? '1' : '0'} onChange={(e) => setProduct(i, { compound: e.target.value === '1' })}
                      aria-label={`${t('c.cmp.product', { n: i + 1 })} ${t('c.in.method')}`} className="ui-field px-2 py-1">
                      <option value="0">{t('c.simple')}</option>
                      <option value="1">{t('c.compound')}</option>
                    </select>
                  </td>
                ))}
              </tr>
              {([['principal', 'principal'], ['grossInterest', 'gross'], ['tax', 'tax'], ['netInterest', 'net'], ['maturity', 'maturity']] as const).map(([label, key]) => (
                <tr key={key} className="border-b border-line">
                  <td className="py-2 text-sub">{t(`c.cmp.${label}`)}</td>
                  {cmp.map((x, i) => (
                    <td key={i} className={`py-2 px-2 text-right ${key === 'maturity' ? 'font-semibold text-fg' : 'text-body'}`}>{won(x[key])}</td>
                  ))}
                </tr>
              ))}
              <tr>
                <td className="py-2 text-sub">{t('c.real.yearly')}</td>
                {cmp.map((x, i) => (
                  <td key={i} className={`py-2 px-2 text-right font-semibold ${i === best ? 'text-primary' : 'text-fg'}`}>{pct(x.yearly)}%</td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
        <p className="text-xs text-muted mt-3">{t('c.cmp.note')}</p>
      </div>

      {/* 정책 상품·과세 기준 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {(['policy', 'taxRules'] as const).map((k) => (
          <section key={k} className="bg-subtle rounded-2xl p-5">
            <h2 className="font-semibold text-fg mb-3">{t(`c.${k}.title`)}</h2>
            <ul className="space-y-2 list-disc pl-5 text-sm text-sub">
              {(t.raw(`c.${k}.items`) as string[]).map((s, i) => <li key={i}>{s}</li>)}
            </ul>
          </section>
        ))}
      </div>

      <section>
        <h2 className="text-lg font-semibold text-fg mb-3">{t('c.links.title')}</h2>
        <div className="flex flex-wrap gap-2">
          {LINKS.map((l) => (
            <a key={l.key} href={l.href} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-soft hover:bg-subtle text-body text-sm">
              {t(`c.links.${l.key}`)} <ExternalLink className="w-3.5 h-3.5" />
            </a>
          ))}
        </div>
        <p className="text-xs text-muted mt-3">{t('c.links.note')}</p>
      </section>

      <GuideSection namespace="savings" />
    </div>
  )
}
