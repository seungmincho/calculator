'use client'

import { useState, useMemo, useEffect } from 'react'
import { useTranslations } from '@/lib/i18n'
import '@/lib/i18n/ns/rentConverter'
import { useSearchParams } from '@/hooks/useSearchParams'
import { RotateCcw } from 'lucide-react'
import ShareResult from '@/components/ShareResult'
import MobileResultLink from '@/components/MobileResultLink'
import GuideSection from '@/components/GuideSection'
import {
  BASE_RATE, legalCapRate, jeonseToWolse, wolseToJeonse, rentCreditRate,
  housingCost, breakevenRate, renewalCap,
} from '@/utils/rentConvert'

type Mode = 'jeonseToWolse' | 'wolseToJeonse'

const DEFAULTS = {
  jd: 300_000_000, wd: 100_000_000, mr: 750_000,
  cr: legalCapRate(BASE_RATE.rate), br: BASE_RATE.rate,
  nd: -1, // -1 = 전세금과 보증금의 중간 (반전세 기본값)
  yrs: 2, cash: 100_000_000, lr: 4, dr: 3, sal: 50_000_000, tc: 1,
  rd: 100_000_000, rr: 800_000,
}
type State = typeof DEFAULTS & { mode: Mode }
type NumKey = keyof typeof DEFAULTS

function decode(sp: URLSearchParams): State {
  const num = (k: string, def: number) => {
    const v = sp.get(k)
    const n = v === null || v === '' ? NaN : Number(v)
    return Number.isFinite(n) ? n : def
  }
  const mode: Mode = sp.get('mode') === 'wolseToJeonse' ? 'wolseToJeonse' : 'jeonseToWolse'
  const s = { mode } as State
  for (const k of Object.keys(DEFAULTS) as NumKey[]) s[k] = num(k, DEFAULTS[k])
  // 예전 링크 호환 (월세→전세 모드는 rwd/rcr 사용)
  if (mode === 'wolseToJeonse') { s.wd = num('rwd', s.wd); s.cr = num('rcr', s.cr) }
  return s
}

export default function RentConverter() {
  const t = useTranslations('rentConverter')
  const searchParams = useSearchParams()
  const [s, setS] = useState<State>(() => decode(searchParams))
  const set = (k: NumKey, v: number) => setS((p) => ({ ...p, [k]: Number.isFinite(v) ? Math.max(0, v) : 0 }))

  useEffect(() => {
    const url = new URL(window.location.href)
    for (const old of ['rwd', 'rcr']) url.searchParams.delete(old)
    url.searchParams.set('mode', s.mode)
    for (const k of Object.keys(DEFAULTS) as NumKey[]) url.searchParams.set(k, String(s[k]))
    window.history.replaceState({}, '', url)
  }, [s])

  const won = (v: number) => `${new Intl.NumberFormat('ko-KR').format(Math.round(v))}${t('unit.won')}`
  const short = (v: number) => {
    const sign = v < 0 ? '-' : ''
    const a = Math.abs(Math.round(v))
    const eok = Math.floor(a / 1e8), man = Math.floor((a % 1e8) / 1e4)
    if (eok) return `${sign}${eok}${t('unit.eok')}${man ? ` ${man.toLocaleString('ko-KR')}${t('unit.man')}` : ''}${t('unit.won')}`
    if (man) return `${sign}${man.toLocaleString('ko-KR')}${t('unit.man')}${t('unit.won')}`
    return `${sign}${won(a)}`
  }

  const cap = legalCapRate(s.br)
  const rate = s.cr
  // 등가 전세금 J, 월세 계약 (보증금 W, 월세 R)
  const W = s.wd
  const R = s.mode === 'jeonseToWolse' ? jeonseToWolse(s.jd, W, rate) : s.mr
  const J = s.mode === 'jeonseToWolse' ? s.jd : wolseToJeonse(W, s.mr, rate)
  const invalid = s.mode === 'jeonseToWolse' && W >= s.jd
  const nd = Math.min(J, s.nd < 0 ? Math.round((J + W) / 2 / 1e7) * 1e7 : s.nd)
  const ndRent = jeonseToWolse(J, nd, rate)
  const per10m = jeonseToWolse(1e7, 0, rate)

  const creditRate = rentCreditRate(s.sal, s.tc === 1)
  const rates = { loanRate: s.lr, depositRate: s.dr }
  const base = { years: s.yrs, cash: s.cash, creditRate }
  const scenarios = useMemo(() => {
    const list = [
      { key: 'jeonse', deposit: J, monthlyRent: 0 },
      { key: 'half', deposit: nd, monthlyRent: ndRent },
      { key: 'wolse', deposit: W, monthlyRent: R },
    ]
    return list.map((x) => ({ ...x, cost: housingCost({ ...base, ...rates, ...x }) }))
  }, [J, W, R, nd, ndRent, s.yrs, s.cash, s.lr, s.dr, creditRate]) // eslint-disable-line react-hooks/exhaustive-deps
  const best = scenarios.reduce((a, b) => (b.cost.net < a.cost.net ? b : a))
  const beKey = J > s.cash ? 'loanRate' : 'depositRate'
  const be = breakevenRate({ ...base, deposit: J, monthlyRent: 0 }, { ...base, deposit: W, monthlyRent: R }, rates, beKey)
  const renewal = renewalCap(s.rd, s.rr, rate)

  const headline = s.mode === 'jeonseToWolse' ? won(R) : short(J)
  const headLabel = s.mode === 'jeonseToWolse'
    ? t('hero.monthly', { jeonse: short(s.jd), deposit: short(W) })
    : t('hero.jeonse', { deposit: short(W), rent: won(s.mr) })

  const moneyField = (k: NumKey, label: string, step = 10_000_000) => (
    <div>
      <label htmlFor={`rc-${k}`} className="block text-sm font-medium text-body mb-2">{label}</label>
      <input id={`rc-${k}`} type="number" inputMode="numeric" min={0} step={step} value={s[k]}
        onChange={(e) => set(k, Number(e.target.value))} className="ui-field px-4 py-3 tabular-nums" />
      <p className="text-xs text-muted mt-1">{short(s[k])}</p>
    </div>
  )
  const pctField = (k: NumKey, label: string, hint?: string) => (
    <div>
      <label htmlFor={`rc-${k}`} className="block text-sm font-medium text-body mb-2">{label}</label>
      <input id={`rc-${k}`} type="number" inputMode="decimal" min={0} max={30} step={0.05} value={s[k]}
        onChange={(e) => set(k, Number(e.target.value))} className="ui-field px-4 py-3 tabular-nums" />
      {hint && <p className="text-xs text-muted mt-1">{hint}</p>}
    </div>
  )
  const chip = (active: boolean) =>
    `px-3 py-2 rounded-xl text-sm font-medium transition-colors ${active ? 'bg-primary text-white' : 'bg-soft text-body hover:bg-subtle'}`

  const rateChips = Array.from(new Set([cap, 4, 4.5, 5.5, 6])).sort((a, b) => a - b)

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-fg">{t('title')}</h1>
        <p className="text-sm text-muted mt-1">{t('description')}</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* 입력 */}
        <div className="lg:col-span-1">
          <div className="ui-card p-6 space-y-5">
            <MobileResultLink href="#rent-converter-result" label={headLabel} value={invalid ? '—' : headline} />
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-fg">{t('settings')}</h2>
              <button onClick={() => setS({ ...DEFAULTS, mode: s.mode })} className="p-2 text-muted hover:text-body" title={t('reset')} aria-label={t('reset')}>
                <RotateCcw className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2" role="tablist">
              {(['jeonseToWolse', 'wolseToJeonse'] as Mode[]).map((m) => (
                <button key={m} role="tab" aria-selected={s.mode === m} onClick={() => setS((p) => ({ ...p, mode: m }))} className={chip(s.mode === m)}>
                  {t(`mode.${m}`)}
                </button>
              ))}
            </div>

            {s.mode === 'jeonseToWolse' ? (
              <>
                {moneyField('jd', t('jeonseDeposit'))}
                {moneyField('wd', t('wolseDeposit'))}
              </>
            ) : (
              <>
                {moneyField('wd', t('wolseDeposit'))}
                {moneyField('mr', t('monthlyRent'), 10_000)}
              </>
            )}

            <div>
              {pctField('cr', t('conversionRate'))}
              <div className="flex flex-wrap gap-2 mt-2">
                {rateChips.map((r) => (
                  <button key={r} onClick={() => set('cr', r)} className={chip(rate === r)}>
                    {r === cap ? t('rate.capChip', { rate: r }) : `${r}%`}
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-subtle rounded-2xl p-4 space-y-3">
              {pctField('br', t('rate.baseRate'), t('rate.baseRateHint', { rate: BASE_RATE.rate, date: BASE_RATE.date }))}
              <p className="text-sm text-sub">{t('rate.capFormula', { base: s.br, cap })}</p>
              <p className="text-xs text-muted">
                <a href="https://www.bok.or.kr/portal/singl/baseRate/list.do?dataSeCd=01&menuNo=200643" target="_blank" rel="noopener noreferrer" className="underline">{t('rate.bokLink')}</a>
                {' · '}
                <a href="https://www.reb.or.kr/r-one/" target="_blank" rel="noopener noreferrer" className="underline">{t('rate.marketLink')}</a>
              </p>
            </div>
          </div>
        </div>

        {/* 결과 */}
        <div className="lg:col-span-2 space-y-6">
          <div id="rent-converter-result" className="ui-hero p-6 scroll-mt-20">
            <p className="text-sm text-white/70">{headLabel}</p>
            <p className="text-3xl font-bold tabular-nums mt-1">{invalid ? '—' : headline}</p>
            <p className="text-sm text-white/70 mt-2 tabular-nums">
              {s.mode === 'jeonseToWolse'
                ? t('hero.formulaMonthly', { diff: short(s.jd - W), rate, result: won(R) })
                : t('hero.formulaJeonse', { deposit: short(W), rent: won(s.mr), rate, result: short(J) })}
            </p>
          </div>

          {invalid && <div className="bg-amber-50 text-amber-800 rounded-2xl p-4 text-sm">{t('warn.depositTooHigh')}</div>}
          {rate > cap && <div className="bg-amber-50 text-amber-800 rounded-2xl p-4 text-sm">{t('warn.overCap', { rate, cap })}</div>}

          <ShareResult
            card={{
              tool: t('title'),
              label: headLabel,
              headline: invalid ? '—' : headline,
              sub: t('share.sub', { rate, cap }),
              rows: [
                { label: t('scenario.best'), value: t(`scenario.${best.key}`) },
                { label: t('scenario.net', { years: s.yrs }), value: short(best.cost.net) },
              ],
            }}
            fileName="rent-converter"
          />

          {/* 보증금 조정 */}
          <div className="ui-card p-6 space-y-4">
            <h3 className="text-lg font-semibold text-fg">{t('adjust.title')}</h3>
            <p className="text-sm text-muted">{t('adjust.desc', { amount: won(per10m) })}</p>
            <input type="range" min={0} max={Math.max(J, 1e7)} step={1e7} value={nd} aria-label={t('adjust.deposit')}
              onChange={(e) => set('nd', Number(e.target.value))} className="w-full accent-[var(--primary)]" />
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-subtle rounded-2xl p-4">
                <p className="text-sm text-sub">{t('adjust.deposit')}</p>
                <p className="text-xl font-bold text-fg tabular-nums">{short(nd)}</p>
              </div>
              <div className="bg-subtle rounded-2xl p-4">
                <p className="text-sm text-sub">{t('adjust.rent')}</p>
                <p className="text-xl font-bold text-fg tabular-nums">{won(ndRent)}</p>
                <p className="text-xs text-muted mt-1 tabular-nums">{t('adjust.vs', { diff: `${ndRent > R ? '+' : ''}${won(ndRent - R)}` })}</p>
              </div>
            </div>
          </div>

          {/* 2년 총비용 비교 */}
          <div className="ui-card p-6 space-y-4">
            <h3 className="text-lg font-semibold text-fg">{t('scenario.title', { years: s.yrs })}</h3>
            <div className="bg-subtle rounded-2xl p-4 grid sm:grid-cols-3 gap-4">
              {pctField('yrs', t('scenario.years'))}
              {pctField('lr', t('scenario.loanRate'))}
              {pctField('dr', t('scenario.depositRate'))}
              <div className="sm:col-span-1">{moneyField('cash', t('scenario.cash'))}</div>
              <div className="sm:col-span-1">{moneyField('sal', t('scenario.salary'), 1_000_000)}</div>
              <label className="flex items-start gap-2 text-sm text-body sm:pt-8">
                <input type="checkbox" checked={s.tc === 1} onChange={(e) => set('tc', e.target.checked ? 1 : 0)} className="mt-0.5" />
                <span>{t('scenario.creditEligible')}<span className="block text-xs text-muted">{t('scenario.creditRate', { rate: Math.round(creditRate * 100) })}</span></span>
              </label>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm tabular-nums">
                <thead>
                  <tr className="border-b border-line text-muted">
                    <th className="text-left py-2 pr-3 font-medium">{t('scenario.item')}</th>
                    {scenarios.map((x) => (
                      <th key={x.key} className={`text-right py-2 px-3 font-medium ${x.key === best.key ? 'text-primary' : ''}`}>{t(`scenario.${x.key}`)}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {([
                    ['deposit', (x: typeof scenarios[number]) => short(x.deposit)],
                    ['monthly', (x: typeof scenarios[number]) => won(x.monthlyRent)],
                    ['loan', (x: typeof scenarios[number]) => short(x.cost.loan)],
                    ['interest', (x: typeof scenarios[number]) => short(x.cost.interest)],
                    ['opportunity', (x: typeof scenarios[number]) => short(x.cost.opportunity)],
                    ['rentTotal', (x: typeof scenarios[number]) => short(x.cost.rent)],
                    ['credit', (x: typeof scenarios[number]) => `-${short(x.cost.credit)}`],
                  ] as const).map(([k, f]) => (
                    <tr key={k} className="border-b border-line">
                      <td className="py-2 pr-3 text-sub">{t(`scenario.row.${k}`)}</td>
                      {scenarios.map((x) => <td key={x.key} className="text-right py-2 px-3 text-body">{f(x)}</td>)}
                    </tr>
                  ))}
                  <tr>
                    <td className="py-3 pr-3 font-semibold text-fg">{t('scenario.net', { years: s.yrs })}</td>
                    {scenarios.map((x) => (
                      <td key={x.key} className={`text-right py-3 px-3 font-bold ${x.key === best.key ? 'bg-primary-soft text-primary rounded-lg' : 'text-fg'}`}>{short(x.cost.net)}</td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="bg-subtle rounded-2xl p-5 text-sub text-sm space-y-2">
              <p className="text-fg font-semibold">
                {t('scenario.verdict', { best: t(`scenario.${best.key}`), save: short(Math.max(...scenarios.map((x) => x.cost.net)) - best.cost.net) })}
              </p>
              <p>
                {be === null
                  ? t('scenario.noBreakeven')
                  : t(beKey === 'loanRate' ? 'scenario.breakevenLoan' : 'scenario.breakevenDeposit', { rate: be })}
              </p>
              <p className="text-xs text-muted">{t('scenario.note')}</p>
            </div>
          </div>

          {/* 전환율별 비교 */}
          <div className="ui-card p-6">
            <h3 className="text-lg font-semibold text-fg mb-4">{t('rateComparisonTable.title')}</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm tabular-nums">
                <thead>
                  <tr className="border-b border-line text-muted">
                    <th className="text-left py-2 pr-4 font-medium">{t('rateComparisonTable.rate')}</th>
                    <th className="text-right py-2 px-4 font-medium">
                      {s.mode === 'jeonseToWolse' ? t('rateComparisonTable.monthlyRent') : t('rateComparisonTable.jeonseDeposit')}
                    </th>
                    <th className="text-right py-2 pl-4 font-medium">{t('rateComparisonTable.yearlyTotal')}</th>
                  </tr>
                </thead>
                <tbody>
                  {Array.from(new Set([3, 4, cap, 5, 6, 7])).sort((a, b) => a - b).map((r) => {
                    const rent = s.mode === 'jeonseToWolse' ? jeonseToWolse(s.jd, W, r) : s.mr
                    const active = r === rate
                    return (
                      <tr key={r} className={`border-b border-line ${active ? 'bg-primary-soft text-primary' : ''}`}>
                        <td className="py-2 pr-4 font-semibold">
                          {r}%{r === cap && <span className="ml-2 text-xs text-muted">{t('rate.capTag')}</span>}
                        </td>
                        <td className="text-right py-2 px-4 font-medium">
                          {s.mode === 'jeonseToWolse' ? won(rent) : short(wolseToJeonse(W, s.mr, r))}
                        </td>
                        <td className="text-right py-2 pl-4">{short(rent * 12)}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* 갱신 5% 상한 */}
          <div className="ui-card p-6 space-y-4">
            <h3 className="text-lg font-semibold text-fg">{t('renewal.title')}</h3>
            <p className="text-sm text-muted">{t('renewal.desc', { rate })}</p>
            <div className="grid sm:grid-cols-2 gap-4">
              {moneyField('rd', t('renewal.deposit'))}
              {moneyField('rr', t('renewal.rent'), 10_000)}
            </div>
            <div className="grid sm:grid-cols-3 gap-4">
              {([
                ['converted', short(renewal.converted), short(renewal.maxConverted)],
                ['depositOnly', short(s.rd), short(renewal.maxDepositOnly)],
                ['rentOnly', won(s.rr), won(renewal.maxRentOnly)],
              ] as const).map(([k, from, to]) => (
                <div key={k} className="bg-subtle rounded-2xl p-4">
                  <p className="text-sm text-sub">{t(`renewal.${k}`)}</p>
                  <p className="text-xs text-muted mt-1 tabular-nums">{from} →</p>
                  <p className="text-lg font-bold text-fg tabular-nums">{to}</p>
                </div>
              ))}
            </div>
            <p className="text-xs text-muted">{t('renewal.note')}</p>
          </div>
        </div>
      </div>

      <div className="ui-card p-6">
        <h2 className="text-lg font-semibold text-fg mb-3">{t('sources.title')}</h2>
        <ul className="space-y-1 text-sm text-sub list-disc list-inside">
          {(t.raw('sources.items') as string[]).map((x) => <li key={x}>{x}</li>)}
        </ul>
      </div>

      <GuideSection namespace="rentConverter" />
    </div>
  )
}
