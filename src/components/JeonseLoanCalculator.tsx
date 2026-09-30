'use client'

/**
 * JeonseLoanCalculator - 전세자금대출 계산기 (namespace: jeonseLoanCalc)
 * 계산 로직: src/utils/jeonseLoan.ts (기금e든든 2026-10-01 조회 기준), 검증: scripts/check-jeonse-loan.ts
 */

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { useSearchParams } from '@/hooks/useSearchParams'
import { useTranslations } from '@/lib/i18n'
import { CheckCircle2, XCircle } from 'lucide-react'
import ShareResult from '@/components/ShareResult'
import { BASE_RATE, legalCapRate, jeonseToWolse } from '@/utils/rentConvert'
import {
  PRODUCTS, SOURCE_DATE, quote, bestProduct, payment, hugRate, hugFee, hugDiscount,
  type Product, type Profile, type Repayment, type HouseType, type DebtBand,
} from '@/utils/jeonseLoan'

const DEFAULTS = {
  dep: 200_000_000, inc: 45_000_000, asset: 200_000_000, age: 30, kids: 0,
  mar: 0, nb: 0, dual: 0, sme: 0, home: 1, area: 1, ec: 0,
  want: 0, br: 4.0, yrs: 2, conv: legalCapRate(BASE_RATE.rate), dr: 70,
}
type NumKey = keyof typeof DEFAULTS
interface State extends Record<NumKey, number> {
  loc: 'capital' | 'local'
  prod: Product | 'auto'
  rp: Repayment
  ht: HouseType
}

const PERIODS = [2, 4, 6, 8, 10]
const TOGGLES: NumKey[] = ['home', 'area', 'mar', 'nb', 'dual', 'sme', 'ec']

// 예전 공유 링크 파라미터 → 새 키
const LEGACY: Record<string, string> = { deposit: 'dep', income: 'inc', loan: 'want', rate: 'br', period: 'yrs', location: 'loc', type: 'prod', repayment: 'rp' }

function decode(input: URLSearchParams): State {
  const sp = new URLSearchParams(input)
  for (const [o, n] of Object.entries(LEGACY)) if (sp.has(o) && !sp.has(n)) sp.set(n, sp.get(o)!)
  const s = {} as State
  for (const k of Object.keys(DEFAULTS) as NumKey[]) {
    const v = sp.get(k)
    const n = v === null || v === '' ? NaN : Number(v)
    s[k] = Number.isFinite(n) && n >= 0 ? n : DEFAULTS[k]
  }
  if (![70, 80, 100].includes(s.dr)) s.dr = 70
  s.loc = sp.get('loc') === 'local' ? 'local' : 'capital'
  const p = sp.get('prod') as Product
  s.prod = PRODUCTS.includes(p) ? p : 'auto'
  s.rp = sp.get('rp') === 'equalPrincipalInterest' ? 'equalPrincipalInterest' : 'bullet'
  s.ht = sp.get('ht') === 'apt' ? 'apt' : 'other'
  return s
}

const seg = (on: boolean) =>
  `px-3 py-2 rounded-xl text-sm font-medium transition-colors ${on ? 'bg-primary text-white' : 'bg-soft text-body hover:bg-subtle'}`

export default function JeonseLoanCalculator() {
  const t = useTranslations('jeonseLoanCalc')
  const searchParams = useSearchParams()
  const [s, setS] = useState<State>(() => decode(searchParams))
  const set = <K extends keyof State>(k: K, v: State[K]) =>
    setS((p) => ({ ...p, [k]: typeof v === 'number' ? (Number.isFinite(v) ? Math.max(0, v) : 0) : v }))

  useEffect(() => {
    const url = new URL(window.location.href)
    for (const old of ['type', 'deposit', 'loan', 'location', 'income', 'children', 'rate', 'repayment', 'period']) url.searchParams.delete(old)
    for (const k of Object.keys(DEFAULTS) as NumKey[]) url.searchParams.set(k, String(s[k]))
    url.searchParams.set('loc', s.loc)
    url.searchParams.set('prod', s.prod)
    url.searchParams.set('rp', s.rp)
    url.searchParams.set('ht', s.ht)
    window.history.replaceState({}, '', url)
  }, [s])

  const won = (v: number) => `${new Intl.NumberFormat('ko-KR').format(Math.round(v))}${t('unit.wonShort')}`
  const short = (v: number) => {
    const a = Math.abs(Math.round(v))
    const eok = Math.floor(a / 1e8), man = Math.floor((a % 1e8) / 1e4)
    const sign = v < 0 ? '-' : ''
    if (eok) return `${sign}${eok}${t('unit.eokShort')}${man ? ` ${man.toLocaleString('ko-KR')}${t('unit.manShort')}` : ''}${t('unit.wonShort')}`
    if (man) return `${sign}${man.toLocaleString('ko-KR')}${t('unit.manShort')}${t('unit.wonShort')}`
    return `${sign}${won(a)}`
  }

  const profile: Profile = {
    deposit: s.dep, location: s.loc, income: s.inc, netAsset: s.asset, age: s.age,
    married: s.mar, kids: Math.min(3, Math.round(s.kids)), newborn: s.nb, dual: s.dual, sme: s.sme,
    homeless: s.home, area: s.area, econtract: s.ec, want: s.want, bankRate: s.br,
  }
  const quotes = useMemo(() => PRODUCTS.map((p) => quote(p, profile)), [JSON.stringify(profile)]) // eslint-disable-line react-hooks/exhaustive-deps
  const best = bestProduct(profile)
  const product: Product = s.prod === 'auto' ? best : s.prod
  const q = quotes.find((x) => x.product === product)!
  const pay = payment(q.loan, q.rate, s.yrs, s.rp)
  const pay2y = payment(q.loan, q.rate, 2, s.rp)
  const pName = (p: Product) => t(`product.${p}.label`)

  // 월세 대안: 같은 집을 '내 돈'만 보증금으로 넣고 월세로 살 때
  const wolse = jeonseToWolse(s.dep, q.own, s.conv)
  const wolseDiff = wolse - pay.monthlyInterest
  // HUG 전세보증금반환보증 (2년 계약)
  const hugDisc = hugDiscount(s.inc, s.mar === 1, profile.kids)
  const hRate = hugRate(s.dep, s.ht, s.dr as DebtBand)
  const hFee = hugFee(s.dep, s.ht, s.dr as DebtBand, 730, hugDisc)

  const moneyField = (k: NumKey, label: string, hint?: string) => (
    <div>
      <label htmlFor={`jl-${k}`} className="block text-sm font-medium text-body mb-2">{label}</label>
      <input id={`jl-${k}`} type="number" inputMode="numeric" min={0} step={10_000_000} value={s[k]}
        onChange={(e) => set(k, Number(e.target.value))} className="ui-field px-4 py-3 tabular-nums" />
      <p className="text-xs text-muted mt-1">{hint ?? short(s[k])}</p>
    </div>
  )

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-fg">{t('title')}</h1>
        <p className="text-sm text-muted mt-1">{t('description')}</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* ── 입력 ── */}
        <div className="lg:col-span-1 space-y-6">
          <div className="ui-card p-6 space-y-4">
            <h2 className="text-lg font-semibold text-fg">{t('field.profileTitle')}</h2>
            {moneyField('dep', t('field.deposit'))}
            <div>
              <p className="block text-sm font-medium text-body mb-2">{t('field.location')}</p>
              <div className="grid grid-cols-2 gap-2">
                {(['capital', 'local'] as const).map((l) => (
                  <button key={l} type="button" onClick={() => set('loc', l)} className={seg(s.loc === l)} aria-pressed={s.loc === l}>
                    {t(`field.${l}`)}
                  </button>
                ))}
              </div>
            </div>
            {moneyField('inc', t('field.income'))}
            {moneyField('asset', t('field.netAsset'))}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="jl-age" className="block text-sm font-medium text-body mb-2">{t('field.age')}</label>
                <input id="jl-age" type="number" inputMode="numeric" min={0} max={100} value={s.age}
                  onChange={(e) => set('age', Number(e.target.value))} className="ui-field px-4 py-3 tabular-nums" />
              </div>
              <div>
                <label htmlFor="jl-kids" className="block text-sm font-medium text-body mb-2">{t('field.kids')}</label>
                <select id="jl-kids" value={Math.min(3, s.kids)} onChange={(e) => set('kids', Number(e.target.value))} className="ui-field px-4 py-3">
                  {[0, 1, 2, 3].map((n) => <option key={n} value={n}>{t(`field.kids${n}`)}</option>)}
                </select>
              </div>
            </div>
            <div className="space-y-2">
              {TOGGLES.filter((k) => k !== 'dual' || s.nb === 1).map((k) => (
                <label key={k} className="flex items-start gap-3 text-sm text-body cursor-pointer">
                  <input type="checkbox" checked={s[k] === 1} onChange={(e) => set(k, e.target.checked ? 1 : 0)}
                    className="mt-0.5 w-4 h-4 accent-[var(--primary)]" />
                  <span>{t(`field.toggle.${k}`)}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="ui-card p-6 space-y-4">
            <h2 className="text-lg font-semibold text-fg">{t('field.loanTitle')}</h2>
            {moneyField('want', t('field.want'), s.want > 0 ? short(s.want) : t('field.wantMax'))}
            <div>
              <p className="block text-sm font-medium text-body mb-2">{t('repayment.title')}</p>
              <div className="grid grid-cols-2 gap-2">
                {(['bullet', 'equalPrincipalInterest'] as const).map((r) => (
                  <button key={r} type="button" onClick={() => set('rp', r)} className={seg(s.rp === r)} aria-pressed={s.rp === r}>
                    {t(`repayment.${r}`)}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="block text-sm font-medium text-body mb-2">{t('repayment.period')}</p>
              <div className="flex flex-wrap gap-2">
                {PERIODS.map((p) => (
                  <button key={p} type="button" onClick={() => set('yrs', p)} className={seg(s.yrs === p)} aria-pressed={s.yrs === p}>
                    {p}{t('repayment.years')}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label htmlFor="jl-br" className="block text-sm font-medium text-body mb-2">{t('field.bankRate')}</label>
              <input id="jl-br" type="number" inputMode="decimal" min={0} max={20} step={0.05} value={s.br}
                onChange={(e) => set('br', Number(e.target.value))} className="ui-field px-4 py-3 tabular-nums" />
              <p className="text-xs text-muted mt-1">{t('field.bankRateHint')}</p>
            </div>
          </div>
        </div>

        {/* ── 결과 ── */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex flex-wrap gap-2" role="tablist" aria-label={t('compare.title')}>
            {PRODUCTS.map((p) => (
              <button key={p} type="button" role="tab" aria-selected={product === p} onClick={() => set('prod', p)} className={seg(product === p)}>
                {pName(p)}{p === best && <span className={`ml-1 text-xs ${product === p ? 'text-white/80' : 'text-primary'}`}>{t('compare.best')}</span>}
              </button>
            ))}
          </div>

          <div className="ui-hero p-6">
            <p className="text-sm text-white/70">{t('hero.label', { product: pName(product) })}</p>
            <p className="text-3xl font-bold tabular-nums mt-1">{short(q.loan)}</p>
            <p className="text-sm text-white/70 mt-2 tabular-nums">
              {t('hero.rateLine', { rate: q.rate.toFixed(2), monthly: won(pay.monthly), kind: s.rp === 'bullet' ? t('hero.interest') : t('hero.payment') })}
            </p>
            <div className="grid grid-cols-2 gap-4 mt-5 pt-4 border-t border-white/20">
              <div>
                <p className="text-xs text-white/70">{t('hero.own')}</p>
                <p className="text-lg font-semibold tabular-nums">{short(q.own)}</p>
              </div>
              <div>
                <p className="text-xs text-white/70">{t('hero.interest2y')}</p>
                <p className="text-lg font-semibold tabular-nums">{short(pay2y.totalInterest)}</p>
              </div>
            </div>
          </div>

          {!q.eligible && <div className="bg-amber-50 text-amber-800 rounded-2xl p-4 text-sm">{t('warn.notEligible', { product: pName(product) })}</div>}
          {s.want > q.limit && <div className="bg-amber-50 text-amber-800 rounded-2xl p-4 text-sm">{t('warn.overLimit', { limit: short(q.limit) })}</div>}

          <ShareResult
            card={{
              tool: t('title'),
              label: t('hero.label', { product: pName(product) }),
              headline: short(q.loan),
              sub: t('share.sub', { rate: q.rate.toFixed(2), date: SOURCE_DATE }),
              rows: [
                { label: s.rp === 'bullet' ? t('hero.interest') : t('hero.payment'), value: won(pay.monthly) },
                { label: t('hero.own'), value: short(q.own) },
                { label: t('hero.interest2y'), value: short(pay2y.totalInterest) },
              ],
            }}
            fileName="jeonse-loan"
          />

          {/* 자격 체크 + 금리 구성 */}
          <div className="grid md:grid-cols-2 gap-6">
            <div className="ui-card p-6">
              <h3 className="text-lg font-semibold text-fg mb-4">{t('check.title', { product: pName(product) })}</h3>
              <ul className="space-y-3">
                {q.checks.map((c) => (
                  <li key={c.key} className="flex items-start gap-3 text-sm">
                    {c.pass
                      ? <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0" aria-label={t('check.pass')} />
                      : <XCircle className="w-5 h-5 text-red-500 flex-shrink-0" aria-label={t('check.fail')} />}
                    <span className={c.pass ? 'text-body' : 'text-red-600 dark:text-red-400'}>
                      {t(`check.${c.key}`)}
                      {c.value !== undefined && <span className="text-muted"> · {t('check.limit', { value: short(c.value) })}</span>}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="ui-card p-6">
              <h3 className="text-lg font-semibold text-fg mb-4">{t('rate.title')}</h3>
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between"><dt className="text-sub">{product === 'bank' ? t('rate.bankInput') : t('rate.table')}</dt><dd className="tabular-nums text-fg">{q.baseRate.toFixed(2)}%</dd></div>
                {q.local > 0 && <div className="flex justify-between"><dt className="text-sub">{t('rate.local')}</dt><dd className="tabular-nums text-primary">-{q.local.toFixed(2)}%p</dd></div>}
                {q.discounts.map((d) => (
                  <div key={d.key} className="flex justify-between"><dt className="text-sub">{t(`rate.discount.${d.key}`)}</dt><dd className="tabular-nums text-primary">-{d.value.toFixed(2)}%p</dd></div>
                ))}
                {q.discounts.length > 0 && q.discountTotal < q.discounts.reduce((a, d) => a + d.value, 0) - 1e-9 && (
                  <p className="text-xs text-muted">{t('rate.capNote', { cap: q.discountTotal.toFixed(1) })}</p>
                )}
                <div className="flex justify-between pt-2 border-t border-line font-semibold"><dt className="text-fg">{t('rate.final')}</dt><dd className="tabular-nums text-fg">{q.rate.toFixed(2)}%</dd></div>
                <div className="flex justify-between"><dt className="text-sub">{t('rate.limit')}</dt><dd className="tabular-nums text-fg">{short(q.limit)}</dd></div>
              </dl>
              {product !== 'bank' && <p className="text-xs text-muted mt-3">{t('rate.floorNote')}</p>}
            </div>
          </div>

          {/* 상품 비교 */}
          <div className="ui-card p-6">
            <h3 className="text-lg font-semibold text-fg mb-4">{t('compare.title')}</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-muted border-b border-line">
                    <th className="py-2 pr-3 font-medium">{t('compare.product')}</th>
                    <th className="py-2 pr-3 font-medium">{t('compare.eligible')}</th>
                    <th className="py-2 pr-3 font-medium text-right">{t('compare.limit')}</th>
                    <th className="py-2 pr-3 font-medium text-right">{t('compare.rate')}</th>
                    <th className="py-2 font-medium text-right">{t('compare.monthly')}</th>
                  </tr>
                </thead>
                <tbody>
                  {quotes.map((x) => (
                    <tr key={x.product} onClick={() => set('prod', x.product)}
                      className={`border-b border-line last:border-0 cursor-pointer ${x.product === product ? 'bg-primary-soft' : 'hover:bg-subtle'}`}>
                      <td className={`py-2 pr-3 ${x.product === product ? 'text-primary font-semibold' : 'text-fg'}`}>
                        {pName(x.product)}
                        <span className="block text-xs text-muted font-normal">{t(`product.${x.product}.sub`)}</span>
                      </td>
                      <td className={`py-2 pr-3 ${x.eligible ? 'text-primary' : 'text-red-600 dark:text-red-400'}`}>{x.eligible ? t('check.pass') : t('check.fail')}</td>
                      <td className="py-2 pr-3 text-right tabular-nums text-body">{short(x.loan)}</td>
                      <td className="py-2 pr-3 text-right tabular-nums text-body">{x.rate.toFixed(2)}%</td>
                      <td className="py-2 text-right tabular-nums text-body">{won(payment(x.loan, x.rate, s.yrs, s.rp).monthly)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-muted mt-3">{t('compare.note')}</p>
          </div>

          {/* 월세 대안 + HUG 보증료 */}
          <div className="grid md:grid-cols-2 gap-6">
            <div className="ui-card p-6 space-y-3">
              <h3 className="text-lg font-semibold text-fg">{t('wolse.title')}</h3>
              <p className="text-sm text-sub">{t('wolse.desc', { own: short(q.own) })}</p>
              <div>
                <label htmlFor="jl-conv" className="block text-sm font-medium text-body mb-2">{t('wolse.conv')}</label>
                <input id="jl-conv" type="number" inputMode="decimal" min={0} max={20} step={0.1} value={s.conv}
                  onChange={(e) => set('conv', Number(e.target.value))} className="ui-field px-4 py-3 tabular-nums" />
                <p className="text-xs text-muted mt-1">{t('wolse.convHint', { cap: legalCapRate(BASE_RATE.rate), date: BASE_RATE.date })}</p>
              </div>
              <div className="bg-subtle rounded-2xl p-4 space-y-1 text-sm">
                <div className="flex justify-between"><span className="text-sub">{t('wolse.rent')}</span><span className="tabular-nums text-fg font-semibold">{won(wolse)}</span></div>
                <div className="flex justify-between"><span className="text-sub">{t('wolse.interest')}</span><span className="tabular-nums text-fg font-semibold">{won(pay.monthlyInterest)}</span></div>
              </div>
              <p className="text-sm text-body">
                {wolseDiff >= 0 ? t('wolse.jeonseCheaper', { diff: won(wolseDiff) }) : t('wolse.wolseCheaper', { diff: won(-wolseDiff) })}
              </p>
              <Link href="/rent-converter/" className="text-sm text-primary underline">{t('wolse.link')}</Link>
            </div>

            <div className="ui-card p-6 space-y-3">
              <h3 className="text-lg font-semibold text-fg">{t('hug.title')}</h3>
              <p className="text-sm text-sub">{t('hug.desc')}</p>
              <div className="grid grid-cols-2 gap-2">
                {(['apt', 'other'] as const).map((h) => (
                  <button key={h} type="button" onClick={() => set('ht', h)} className={seg(s.ht === h)} aria-pressed={s.ht === h}>{t(`hug.${h}`)}</button>
                ))}
              </div>
              <div>
                <p className="block text-sm font-medium text-body mb-2">{t('hug.debt')}</p>
                <div className="grid grid-cols-3 gap-2">
                  {([70, 80, 100] as const).map((d) => (
                    <button key={d} type="button" onClick={() => set('dr', d)} className={seg(s.dr === d)} aria-pressed={s.dr === d}>{t(`hug.debt${d}`)}</button>
                  ))}
                </div>
                <p className="text-xs text-muted mt-1">{t('hug.debtHint')}</p>
              </div>
              <div className="bg-subtle rounded-2xl p-4 space-y-1 text-sm">
                <div className="flex justify-between"><span className="text-sub">{t('hug.rate')}</span><span className="tabular-nums text-fg">{t('hug.rateValue', { rate: hRate.toFixed(3) })}</span></div>
                <div className="flex justify-between"><span className="text-sub">{t('hug.discount')}</span><span className="tabular-nums text-fg">{hugDisc > 0 ? `${Math.round(hugDisc * 100)}%` : '—'}</span></div>
                <div className="flex justify-between"><span className="text-sub">{t('hug.fee')}</span><span className="tabular-nums text-fg font-semibold">{won(hFee)}</span></div>
              </div>
              <p className="text-xs text-muted">{t('hug.note')}</p>
            </div>
          </div>

          {/* 출처 */}
          <div className="bg-subtle rounded-2xl p-5 text-sm text-sub space-y-2">
            <p className="font-medium text-body">{t('source.title', { date: SOURCE_DATE })}</p>
            <ul className="space-y-1 list-disc pl-5">
              <li><a href="https://nhuf.molit.go.kr/FP/FP05/FP0502/FP05020101.jsp" target="_blank" rel="noopener noreferrer" className="underline">{t('source.nhuf')}</a></li>
              <li><a href="https://www.khug.or.kr/hug/web/ig/dr/igdr000001.jsp" target="_blank" rel="noopener noreferrer" className="underline">{t('source.hug')}</a></li>
              <li><a href="https://www.hf.go.kr/ko/sub02/sub02_01_02.do" target="_blank" rel="noopener noreferrer" className="underline">{t('source.hf')}</a></li>
            </ul>
            <p className="text-xs">{t('source.caveat')}</p>
          </div>
          <p className="text-xs text-faint leading-relaxed">{t('disclaimer')}</p>
        </div>
      </div>

      {/* 가이드 */}
      <div className="ui-card p-6">
        <h2 className="text-xl font-semibold text-fg mb-6">{t('guide.title')}</h2>
        <div className="grid md:grid-cols-3 gap-6">
          {(['overview', 'rates', 'tips'] as const).map((sec) => (
            <div key={sec}>
              <h3 className="font-semibold text-fg mb-3">{t(`guide.${sec}.title`)}</h3>
              <ul className="space-y-2 list-disc pl-5 text-sm text-sub">
                {(t.raw(`guide.${sec}.items`) as string[]).map((item, i) => <li key={i}>{item}</li>)}
              </ul>
            </div>
          ))}
        </div>
        <h3 className="font-semibold text-fg mt-8 mb-3">{t('faq.title')}</h3>
        <div className="space-y-3">
          {(t.raw('faq.items') as { q: string; a: string }[]).map((f, i) => (
            <details key={i} className="bg-subtle rounded-2xl p-4">
              <summary className="font-medium text-fg cursor-pointer">{f.q}</summary>
              <p className="text-sm text-sub mt-2">{f.a}</p>
            </details>
          ))}
        </div>
      </div>
    </div>
  )
}
