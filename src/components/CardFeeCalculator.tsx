'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { useTranslations } from '@/lib/i18n'
import '@/lib/i18n/ns/cardFeeCalculator'
import { useSearchParams } from '@/hooks/useSearchParams'
import { useHydrated } from '@/hooks/useHydrated'
import ShareResult from '@/components/ShareResult'
import MobileResultLink from '@/components/MobileResultLink'
import { CARD_LIMIT } from '@/utils/vat'
import { analyze, classify, BRACKETS, RATES, UPPER, VAT_ELIGIBLE_MAX, DEFAULTS, type Bracket, type Input } from '@/utils/cardFee'

// URL: b 구간 · m 월 카드매출 · c 체크카드 비중(%) · cr/ch 고친 수수료율(%) · corp=1 법인. 기본값과 다른 것만
const CODE: Record<Bracket, string> = { small: 's', mid1: 'm1', mid2: 'm2', mid3: 'm3', general: 'g' }
const DEF: Input = { ...DEFAULTS, rates: RATES[DEFAULTS.bracket] }
const MONTHLY_PRESETS = [5_000_000, 10_000_000, 20_000_000, 30_000_000, 50_000_000]
const MAX = 10_000_000_000
const NEXT = { vat: '/vat-calculator/', margin: '/margin-calculator/', income: '/income-tax/' } as const

const won = (n: number) => Math.round(n).toLocaleString('ko-KR')
const man = (n: number) => (n / 10_000).toLocaleString('ko-KR', { maximumFractionDigits: 0 })
/** 영어 문구용 백만 단위 */
const mil = (n: number) => (n / 1_000_000).toLocaleString('en-US', { maximumFractionDigits: 2 })
const pct = (n: number) => n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 3 })
const digits = (s: string) => s.replace(/[^\d]/g, '')
const amount = (v: string | null) => (v && /^\d{1,11}$/.test(v) ? Number(v) : null)
const rate = (v: string | null) => (v && /^\d{1,2}(\.\d{1,3})?$/.test(v) && Number(v) <= 10 ? Number(v) : null)
const share = (v: string | null) => (v && /^\d{1,3}$/.test(v) && Number(v) <= 100 ? Number(v) : null)

function MoneyInput({ id, label, value, onChange, hint, unit, placeholder = '0' }: { id: string; label: string; value: number; onChange: (n: number) => void; hint?: string; unit: string; placeholder?: string }) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-body mb-2">{label}</label>
      <div className="relative">
        <input
          id={id} type="text" inputMode="numeric" value={value ? won(value) : ''} placeholder={placeholder}
          onChange={(e) => onChange(Math.min(Number(digits(e.target.value)) || 0, MAX))}
          className="ui-field w-full px-4 py-3 pr-12 tabular-nums" aria-describedby={hint ? `${id}-hint` : undefined}
        />
        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-muted">{unit}</span>
      </div>
      {hint && <p id={`${id}-hint`} className="text-xs text-muted mt-1.5">{hint}</p>}
    </div>
  )
}

function RateInput({ id, label, value, onChange }: { id: string; label: string; value: number; onChange: (n: number) => void }) {
  return (
    <div>
      <label htmlFor={id} className="block text-xs font-medium text-sub mb-1.5">{label}</label>
      <div className="relative">
        <input
          id={id} type="number" inputMode="decimal" min={0} max={10} step={0.01} value={value}
          onChange={(e) => onChange(Math.min(10, Math.max(0, Number(e.target.value) || 0)))}
          className="ui-field w-full px-4 py-3 pr-9 tabular-nums"
        />
        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-muted">%</span>
      </div>
    </div>
  )
}

const chip = (on: boolean) => `min-h-[44px] px-3 py-2 rounded-lg text-sm transition-colors ${on ? 'bg-primary text-white' : 'bg-soft text-body hover:bg-subtle'}`

export default function CardFeeCalculator() {
  const t = useTranslations('cardFeeCalculator')
  const sp = useSearchParams()
  const hydrated = useHydrated()

  // URL → 값. 하이드레이션 전에는 기본값이라 첫 렌더가 정적 HTML과 같다. 사용자가 고치면 그 값이 우선
  const fromUrl = useMemo((): Input => {
    if (!hydrated) return DEF
    const bracket = BRACKETS.find((b) => CODE[b] === sp.get('b')) ?? DEF.bracket
    return {
      bracket,
      monthly: amount(sp.get('m')) ?? DEF.monthly,
      checkShare: share(sp.get('c')) ?? DEF.checkShare,
      rates: { credit: rate(sp.get('cr')) ?? RATES[bracket].credit, check: rate(sp.get('ch')) ?? RATES[bracket].check },
      corp: sp.get('corp') === '1',
    }
  }, [hydrated, sp])
  const [edited, setEdited] = useState<Input | null>(null)
  const s = edited ?? fromUrl
  const [annual, setAnnual] = useState(0) // 연매출로 구간 찾기 (URL에는 구간만)

  const update = (patch: Partial<Input>) => {
    const next = { ...s, ...patch }
    setEdited(next)
    const q = new URLSearchParams()
    if (next.bracket !== DEF.bracket) q.set('b', CODE[next.bracket])
    if (next.monthly !== DEF.monthly) q.set('m', String(next.monthly))
    if (next.checkShare !== DEF.checkShare) q.set('c', String(next.checkShare))
    if (next.rates.credit !== RATES[next.bracket].credit) q.set('cr', String(next.rates.credit))
    if (next.rates.check !== RATES[next.bracket].check) q.set('ch', String(next.rates.check))
    if (next.corp) q.set('corp', '1')
    const qs = q.toString()
    window.history.replaceState(window.history.state, '', qs ? `?${qs}` : window.location.pathname)
  }
  const setBracket = (b: Bracket) => update({ bracket: b, rates: RATES[b] })
  const setMonthly = (n: number) => update({ monthly: n })

  const r = analyze(s)
  const W = t('won')
  const custom = s.rates.credit !== RATES[s.bracket].credit || s.rates.check !== RATES[s.bracket].check
  const over = r.annualCard > UPPER[s.bracket]
  const upLosesCredit = !!r.up && r.eligible && UPPER[r.up.bracket] > VAT_ELIGIBLE_MAX
  const bName = (b: Bracket) => t(`brackets.${b}.name`)
  const vatLink = `/vat-calculator/?${new URLSearchParams({ tab: 'report', sales: String(Math.round((s.monthly * 6) / 1.1)), card: String(s.monthly * 6) })}`

  const vars = {
    monthly: man(s.monthly), monthlyM: mil(s.monthly), bracket: bName(s.bracket),
    fee: won(r.annualFee), monthlyFee: won(r.monthlyFee), credit: won(r.taxCredit), net: won(r.net),
  }
  const card = {
    tool: t('title'),
    label: t('share.label', vars),
    headline: t('share.headline', vars),
    sub: r.eligible ? t('share.sub', vars) : t('share.subNone', vars),
    rows: [
      { label: t('rates.credit'), value: `${pct(s.rates.credit)}%` },
      { label: t('rates.check'), value: `${pct(s.rates.check)}%` },
      { label: t('result.monthly'), value: `${won(r.monthlyFee)}${W}` },
      { label: t('result.label'), value: `${won(r.annualFee)}${W}` },
      ...(r.eligible ? [{ label: t('vat.credit'), value: `${won(r.taxCredit)}${W}` }, { label: t('vat.net'), value: `${won(r.net)}${W}` }] : []),
    ],
  }

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
            <MobileResultLink href="#card-fee-calculator-result" label={t('result.label')} value={`${won(r.annualFee)}${W}`} />

            <fieldset>
              <legend className="block text-sm font-medium text-body mb-2">{t('bracket.label')}</legend>
              <div className="flex flex-wrap gap-1.5">
                {BRACKETS.map((b) => (
                  <button key={b} type="button" onClick={() => { setAnnual(0); setBracket(b) }} aria-pressed={s.bracket === b} className={chip(s.bracket === b)}>
                    {bName(b)} <span className="opacity-80">{t(`brackets.${b}.range`)}</span>
                  </button>
                ))}
              </div>
              <p className="text-xs text-muted mt-1.5">{t('bracket.hint')}</p>
            </fieldset>

            <MoneyInput
              id="cf-annual" label={t('annual.label')} value={annual} unit={W} hint={t('annual.hint')} placeholder={t('annual.placeholder')}
              onChange={(n) => { setAnnual(n); if (n > 0) setBracket(classify(n)) }}
            />

            <div className="border-t border-line pt-5">
              <MoneyInput id="cf-monthly" label={t('monthly.label')} value={s.monthly} onChange={setMonthly} unit={W} hint={t('monthly.hint')} />
              <div className="flex flex-wrap gap-1.5 mt-2">
                {MONTHLY_PRESETS.map((n) => (
                  <button key={n} type="button" onClick={() => setMonthly(n)} aria-pressed={s.monthly === n} className={`${chip(s.monthly === n)} tabular-nums`}>
                    {t('manUnit', { n: man(n), m: mil(n) })}
                  </button>
                ))}
              </div>
              {over && <p className="text-xs text-amber-800 bg-amber-50 rounded-xl px-3 py-2 mt-2">{t('monthly.over', { card: won(r.annualCard), bracket: bName(s.bracket) })}</p>}
            </div>

            <div>
              <label htmlFor="cf-check" className="flex justify-between text-sm font-medium text-body mb-2">
                <span>{t('checkShare.label')}</span>
                <span className="tabular-nums text-fg">{s.checkShare}%</span>
              </label>
              <input
                id="cf-check" type="range" min={0} max={100} step={5} value={s.checkShare}
                onChange={(e) => update({ checkShare: Number(e.target.value) })}
                className="w-full accent-primary" aria-describedby="cf-check-hint"
              />
              <p id="cf-check-hint" className="text-xs text-muted mt-1.5">{t('checkShare.hint', { credit: won(r.credit), check: won(r.check) })}</p>
            </div>

            <div className="border-t border-line pt-5 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <RateInput id="cf-rate-credit" label={t('rates.credit')} value={s.rates.credit} onChange={(n) => update({ rates: { ...s.rates, credit: n } })} />
                <RateInput id="cf-rate-check" label={t('rates.check')} value={s.rates.check} onChange={(n) => update({ rates: { ...s.rates, check: n } })} />
              </div>
              <p className="text-xs text-muted">{s.bracket === 'general' ? t('rates.hintGeneral') : t('rates.hint')}</p>
              {custom && (
                <button type="button" onClick={() => update({ rates: RATES[s.bracket] })} className="ui-btn-soft px-4 py-2 text-sm">
                  {t('rates.reset', { bracket: bName(s.bracket) })}
                </button>
              )}
            </div>

            <fieldset className="border-t border-line pt-5">
              <legend className="block text-sm font-medium text-body mb-2">{t('type.label')}</legend>
              <div className="grid grid-cols-2 gap-1.5">
                {[false, true].map((c) => (
                  <button key={String(c)} type="button" onClick={() => update({ corp: c })} aria-pressed={s.corp === c} className={chip(s.corp === c)}>
                    {t(c ? 'type.corp' : 'type.individual')}
                  </button>
                ))}
              </div>
            </fieldset>
          </div>
        </div>

        {/* 결과 */}
        <div className="lg:col-span-2 space-y-6">
          <div id="card-fee-calculator-result" className="ui-card p-6 space-y-5 scroll-mt-20">
            <div aria-live="polite">
              <p className="text-sm text-muted">{t('result.label')}</p>
              <p className="text-3xl font-bold text-fg tabular-nums mt-1">{won(r.annualFee)}{W}</p>
              <p className="text-sm text-sub mt-1">{t('result.sub', { monthlyFee: won(r.monthlyFee), effective: pct(r.effective) })}</p>
            </div>

            <dl className="space-y-1.5 text-sm">
              <div className="flex justify-between gap-3">
                <dt className="text-sub">{t('result.creditRow', { sales: won(r.credit), rate: pct(s.rates.credit) })}</dt>
                <dd className="tabular-nums text-fg">{won(r.creditFee)}{W}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-sub">{t('result.checkRow', { sales: won(r.check), rate: pct(s.rates.check) })}</dt>
                <dd className="tabular-nums text-fg">{won(r.checkFee)}{W}</dd>
              </div>
              <div className="flex justify-between gap-3 border-t border-line pt-1.5">
                <dt className="font-semibold text-fg">{t('result.monthly')}</dt>
                <dd className="tabular-nums font-bold text-fg">{won(r.monthlyFee)}{W}</dd>
              </div>
            </dl>

            {/* 부가세 세액공제 */}
            <div className="rounded-2xl p-5 bg-subtle space-y-2">
              <p className="text-sm font-semibold text-fg">{t('vat.title')}</p>
              {r.eligible ? (
                <>
                  <dl className="space-y-1.5 text-sm">
                    <div className="flex justify-between gap-3"><dt className="text-sub">{t('vat.credit')}</dt><dd className="tabular-nums text-fg">{won(r.taxCredit)}{W}</dd></div>
                    <div className="flex justify-between gap-3 border-t border-line pt-1.5"><dt className="font-semibold text-fg">{t('vat.net')}</dt><dd className="tabular-nums font-bold text-primary">{won(r.net)}{W}</dd></div>
                  </dl>
                  <p className="text-sm text-sub">
                    {r.net < 0 ? t('vat.netNegative', { n: won(-r.net) }) : t('vat.netPositive', { n: won(r.net) })}
                    {r.taxCredit >= CARD_LIMIT && ` ${t('vat.capped')}`}
                  </p>
                  <p className="text-sm text-sub">{t('vat.proposal', { credit: won(r.taxCredit2027), net: won(r.net2027) })}</p>
                </>
              ) : (
                <p className="text-sm text-sub">{s.corp ? t('vat.noneCorp') : t('vat.noneLarge')}</p>
              )}
              <p className="text-xs text-muted">{t('vat.note')}</p>
            </div>

            <ShareResult card={card} text={t('share.text', vars)} fileName="card-fee-calculator" />
            <div className="space-y-2">
              <Link href={vatLink} className="ui-btn inline-block px-4 py-3 text-sm">{t('actions.vat')}</Link>
              <p className="text-xs text-muted">{t('actions.vatNote')}</p>
            </div>
          </div>

          {/* 구간이 바뀌면 */}
          <section aria-labelledby="cf-compare" className="ui-card p-6 space-y-4">
            <div>
              <h2 id="cf-compare" className="text-lg font-semibold text-fg">{t('compare.title')}</h2>
              <p className="text-sm text-muted mt-1">{t('compare.desc', { monthly: man(s.monthly), monthlyM: mil(s.monthly) })}</p>
            </div>
            <div className="relative overflow-x-auto">
              <table className="w-full text-sm tabular-nums">
                <caption className="sr-only">{t('compare.title')}</caption>
                <thead>
                  <tr className="border-b border-line text-muted">
                    <th scope="col" className="text-left font-medium py-2 pr-2">{t('compare.cols.bracket')}</th>
                    <th scope="col" className="text-right font-medium py-2 px-2">{t('compare.cols.rates')}</th>
                    <th scope="col" className="text-right font-medium py-2 px-2">{t('compare.cols.fee')}</th>
                    <th scope="col" className="text-right font-medium py-2 pl-2">{t('compare.cols.diff')}</th>
                  </tr>
                </thead>
                <tbody>
                  {r.compare.map((x) => {
                    const cur = x.bracket === s.bracket
                    return (
                      <tr key={x.bracket} className={`border-b border-line ${cur ? 'bg-primary-soft' : ''}`} aria-current={cur ? 'true' : undefined}>
                        <th scope="row" className={`text-left font-medium py-3 pr-2 pl-2 ${cur ? 'text-primary' : 'text-body'}`}>
                          {bName(x.bracket)} <span className="block text-xs font-normal text-muted">{t(`brackets.${x.bracket}.range`)}</span>
                        </th>
                        <td className="text-right py-3 px-2 text-sub">{pct(x.rates.credit)} / {pct(x.rates.check)}%</td>
                        <td className="text-right py-3 px-2 text-fg">{won(x.fee)}</td>
                        <td className={`text-right py-3 pl-2 pr-2 ${cur ? 'text-primary' : x.diff > 0 ? 'text-fg font-medium' : 'text-sub'}`}>
                          {cur ? t('compare.current') : `${x.diff > 0 ? '+' : ''}${won(x.diff)}`}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            <p className="rounded-2xl p-4 bg-subtle text-sm text-body" aria-live="polite">
              {r.up ? t('compare.up', { upper: t(`brackets.${s.bracket}.upper`), next: bName(r.up.bracket), diff: won(r.up.diff) }) : t('compare.top')}
              {upLosesCredit && ` ${t('compare.loseCredit', { credit: won(r.taxCredit) })}`}
            </p>
            <p className="text-xs text-muted">{t('compare.note')}</p>
          </section>

          {/* 신규가맹점 환급 */}
          <section aria-labelledby="cf-new" className="ui-card p-6 space-y-3">
            <h2 id="cf-new" className="text-lg font-semibold text-fg">{t('newMerchant.title')}</h2>
            <p className="text-sm text-sub">{t('newMerchant.desc')}</p>
            {r.refundMonthly > 0 && (
              <p className="rounded-2xl p-4 bg-subtle text-sm text-body">
                {t('newMerchant.estimate', { monthly: man(s.monthly), monthlyM: mil(s.monthly), refund: won(r.refundMonthly), credit: pct(RATES.general.credit), check: pct(RATES.general.check) })}
              </p>
            )}
            <p className="text-xs text-muted">{t('newMerchant.note')}</p>
          </section>
        </div>
      </div>

      <section aria-labelledby="cf-tips" className="ui-card p-6 space-y-3">
        <h2 id="cf-tips" className="text-lg font-semibold text-fg">{t('tips.title')}</h2>
        <ul className="list-disc pl-5 space-y-1.5 text-sm text-sub">
          {(t.raw('tips.items') as string[]).map((x, i) => <li key={i}>{x}</li>)}
        </ul>
      </section>

      <section aria-labelledby="cf-next" className="ui-card p-6 space-y-3">
        <h2 id="cf-next" className="text-lg font-semibold text-fg">{t('next.title')}</h2>
        <ul className="grid gap-2 sm:grid-cols-3">
          {(Object.keys(NEXT) as (keyof typeof NEXT)[]).map((k) => (
            <li key={k}>
              <Link href={NEXT[k]} className="block rounded-2xl p-4 bg-subtle hover:bg-soft transition-colors min-h-[44px]">
                <span className="block text-sm font-semibold text-fg">{t(`next.${k}.title`)}</span>
                <span className="block text-xs text-muted mt-1">{t(`next.${k}.desc`)}</span>
              </Link>
            </li>
          ))}
        </ul>
        <p className="text-xs text-muted">{t('source')}</p>
      </section>
    </div>
  )
}
