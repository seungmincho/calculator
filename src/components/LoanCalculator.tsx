'use client'

import { useState, useMemo, useEffect } from 'react'
import { ArrowRight, Save, Check } from 'lucide-react'
import { useSearchParams } from '@/hooks/useSearchParams'
import { useTranslations } from '@/lib/i18n'
import { useCalculationHistory } from '@/hooks/useCalculationHistory'
import CalculationHistory from '@/components/CalculationHistory'
import ShareResult from '@/components/ShareResult'
import GuideSection from '@/components/GuideSection'
import { schedule, type Method } from '@/utils/loanSchedule'
import { maxPrincipal, annualRepay } from '@/utils/loanQuick'
import { LEGACY_TYPE, saveLoanHistory, restoreLoanHistory } from '@/utils/loanHistory'

type QMethod = Exclude<Method, 'graduated'>
const METHODS: QMethod[] = ['equalPayment', 'equalPrincipal', 'bullet']
const METHOD_KEY: Record<QMethod, string> = {
  equalPayment: 'input.equalInstallment', equalPrincipal: 'input.equalPrincipal', bullet: 'input.bulletPayment',
}
const RATE_DELTAS = [-1, -0.5, 0, 0.5, 1, 2]
const DSR_LIMIT = 40

const DEFAULTS = { mode: 'calc' as 'calc' | 'rev', am: 30000, pay: 150, r: 4.5, t: 30, m: 'equalPayment' as QMethod, gr: 0, inc: 6000, ex: 0 }
type State = typeof DEFAULTS
const NUM_KEYS = ['am', 'pay', 'r', 't', 'gr', 'inc', 'ex'] as const

// 예전 링크(amount=원, rate, term=년, types=equal-payment,...) 호환
function decode(sp: URLSearchParams): State {
  let s = { ...DEFAULTS }
  const num = (k: string) => { const v = sp.get(k); const n = v === null || v === '' ? NaN : Number(v.replace(/,/g, '')); return Number.isFinite(n) ? Math.max(0, n) : undefined }
  const amount = num('amount')
  if (amount !== undefined) s.am = amount / 1e4
  s.r = num('rate') ?? s.r
  s.t = num('term') ?? s.t
  const legacy = LEGACY_TYPE[(sp.get('types') ?? '').split(',')[0]]
  if (legacy) s = { ...s, ...legacy }
  for (const k of NUM_KEYS) { const v = num(k); if (v !== undefined) s[k] = v }
  if ((METHODS as string[]).includes(sp.get('m') ?? '')) s.m = sp.get('m') as QMethod
  if (sp.get('mode') === 'rev') s.mode = 'rev'
  return s
}

export default function LoanCalculator() {
  const t = useTranslations('loan')
  const searchParams = useSearchParams()
  const [s, setS] = useState<State>(() => decode(searchParams))
  const set = <K extends keyof State>(k: K, v: State[K]) => setS((p) => ({ ...p, [k]: v }))
  const setNum = (k: keyof State) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const n = Number(e.target.value); setS((p) => ({ ...p, [k]: Number.isFinite(n) ? Math.max(0, n) : 0 }))
  }
  const [saved, setSaved] = useState(false)
  const { histories, isLoading, saveCalculation, removeHistory, clearHistories, loadFromHistory } = useCalculationHistory('loan')

  useEffect(() => {
    const url = new URL(window.location.href)
    for (const old of ['amount', 'rate', 'term', 'types']) url.searchParams.delete(old)
    for (const [k, v] of Object.entries(s)) {
      if (k === (s.mode === 'rev' ? 'am' : 'pay')) url.searchParams.delete(k)
      else url.searchParams.set(k, String(v))
    }
    window.history.replaceState({}, '', url)
  }, [s])

  // ── 표기 ──
  const won = (v: number) => `${Math.round(v).toLocaleString('ko-KR')}${t('wonUnit')}`
  const short = (v: number) => {
    const sign = v < 0 ? '-' : ''
    const a = Math.abs(Math.round(v))
    const eok = Math.floor(a / 1e8), man = Math.floor((a % 1e8) / 1e4)
    if (eok) return `${sign}${eok}${t('unit.eok')}${man ? ` ${man.toLocaleString('ko-KR')}${t('unit.man')}` : ''}${t('wonUnit')}`
    if (man) return `${sign}${man.toLocaleString('ko-KR')}${t('unit.man')}${t('wonUnit')}`
    return `${sign}${won(a)}`
  }
  const termText = (months: number) => {
    const y = Math.floor(months / 12), m = months % 12
    return y && m ? t('term.mixed', { y, m }) : y ? t('term.years', { n: y }) : t('term.months', { n: m })
  }
  const methodName = (m: QMethod) => t(METHOD_KEY[m])
  const signed = (v: number, f: (x: number) => string) => `${v > 0 ? '+' : ''}${f(v)}`

  // ── 계산 ──
  const months = Math.round(s.t * 12)
  const termOk = months > 0 && months <= 600 && s.gr < months && s.r < 100
  const revMax = useMemo(() => termOk && s.mode === 'rev'
    ? Object.fromEntries(METHODS.map((m) => [m, maxPrincipal(s.pay * 1e4, s.r, months, s.gr, m)])) as Record<QMethod, number>
    : null, [termOk, s.mode, s.pay, s.r, months, s.gr])
  const principal = revMax ? revMax[s.m] : Math.round(s.am * 1e4)
  const valid = termOk && principal > 0 && Number.isFinite(principal)
  const byMethod = useMemo(() => valid ? METHODS.map((m) => ({ m, r: schedule({ principal, rate: s.r, months, grace: s.gr, method: m }) })) : [],
    [valid, principal, s.r, months, s.gr])
  const res = byMethod.find((x) => x.m === s.m)?.r ?? null
  const cheapest = byMethod.length ? byMethod.reduce((a, b) => (b.r.totalInterest < a.r.totalInterest ? b : a)).m : null
  const rateRows = useMemo(() => valid
    ? RATE_DELTAS.filter((d) => s.r + d >= 0).map((d) => ({ d, r: schedule({ principal, rate: s.r + d, months, grace: s.gr, method: s.m }) }))
    : [], [valid, principal, s.r, months, s.gr, s.m])
  const rateCur = rateRows.find((x) => x.d === 0)?.r
  const ratePlus1 = rateRows.find((x) => x.d === 1)?.r

  const annual = res ? annualRepay(res) : 0
  const income = s.inc * 1e4
  const dsr = income > 0 ? (annual + s.ex * 1e4) / income * 100 : null
  const room = income * DSR_LIMIT / 100 - s.ex * 1e4 - annual

  // ── 히어로 ──
  const hero = (() => {
    if (!res) return null
    const desc = { rate: s.r, term: termText(months), method: methodName(s.m) }
    if (s.mode === 'rev') return {
      label: t('hero.revLabel', { pay: short(s.pay * 1e4), ...desc }),
      title: t('hero.revTitle'), value: short(principal),
      sub: t('hero.revSub', { pay: won(res.firstPayment), interest: short(res.totalInterest) }),
    }
    const label = t('hero.label', { amount: short(principal), ...desc })
    if (s.m === 'bullet') return { label, title: t('hero.monthlyInterest'), value: won(res.firstPayment), sub: t('hero.bulletEnd', { amount: short(principal) }) }
    if (s.m === 'equalPrincipal') return { label, title: t('hero.firstMonth'), value: won(res.firstPayment), sub: t('hero.lastMonth', { amount: won(res.lastPayment) }) }
    return { label, title: t('hero.monthly'), value: won(res.firstPayment), sub: '' }
  })()

  const scheduleHref = `/loan-schedule/?am=${principal / 1e4}&r=${s.r}&t=${s.t}&m=${s.m}&gr=${s.gr}`

  // ── 계산 이력 (localStorage.ts 제목 생성기가 loanAmount·loanTerm을 읽음) ──
  const handleSave = () => {
    if (!res) return
    const ok = saveCalculation(
      saveLoanHistory(s, principal),
      { results: [{ monthlyPayment: res.firstPayment, totalPayment: res.totalPayment }] },
    )
    if (ok) { setSaved(true); setTimeout(() => setSaved(false), 2000) }
  }
  const handleLoad = (id: string) => {
    const inp = loadFromHistory(id) as Record<string, unknown> | null
    if (!inp) return
    setS((p) => restoreLoanHistory(inp, p))
  }
  const formatHistory = (result: Record<string, unknown>) => {
    const r = (Array.isArray(result.results) ? result.results[0] : null) as Record<string, unknown> | null
    return r ? t('history.format', { monthly: won(Number(r.monthlyPayment) || 0), total: won(Number(r.totalPayment) || 0) }) : ''
  }

  // ── UI 조각 ──
  const chip = (active: boolean) =>
    `px-3 py-2 rounded-xl text-sm font-medium transition-colors ${active ? 'bg-primary text-white' : 'bg-soft text-body hover:bg-subtle'}`
  const field = (k: keyof State, label: string, opts: { step?: number; hint?: string; suffix?: string; max?: number } = {}) => (
    <div>
      <label htmlFor={`lc-${k}`} className="block text-sm font-medium text-body mb-2">{label}</label>
      <div className="relative">
        <input id={`lc-${k}`} type="number" inputMode="decimal" min={0} max={opts.max} step={opts.step ?? 1} value={s[k] as number}
          onChange={setNum(k)} className={`ui-field px-4 py-3 tabular-nums ${opts.suffix ? 'pr-14' : ''}`} />
        {opts.suffix && <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-muted">{opts.suffix}</span>}
      </div>
      {opts.hint && <p className="text-xs text-muted mt-1">{opts.hint}</p>}
    </div>
  )
  const th = 'px-3 py-2.5 text-xs font-medium text-muted whitespace-nowrap'
  const td = 'px-3 py-2 tabular-nums whitespace-nowrap'

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-fg">{t('title')}</h1>
          <p className="text-sm text-muted mt-1">{t('description')}</p>
        </div>
        <CalculationHistory histories={histories} isLoading={isLoading} onLoadHistory={handleLoad}
          onRemoveHistory={removeHistory} onClearHistories={clearHistories} formatResult={formatHistory} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* 입력 */}
        <div className="lg:col-span-1 space-y-6">
          <div className="ui-card p-6 space-y-4">
            <div className="grid grid-cols-2 gap-1 bg-soft p-1 rounded-xl" role="tablist">
              {(['calc', 'rev'] as const).map((m) => (
                <button key={m} type="button" role="tab" aria-selected={s.mode === m} onClick={() => set('mode', m)}
                  className={`px-2 py-2 rounded-lg text-sm font-medium transition-colors ${s.mode === m ? 'bg-primary text-white' : 'text-sub hover:text-body'}`}>
                  {t(`mode.${m}`)}
                </button>
              ))}
            </div>

            {s.mode === 'calc' ? (
              <div>
                {field('am', t('input.loanAmount'), { step: 1000, suffix: t('unitManwon'), hint: short(s.am * 1e4) })}
                <div className="flex flex-wrap gap-2 mt-2">
                  {[10000, 20000, 30000, 50000].map((v) => (
                    <button key={v} type="button" onClick={() => set('am', v)} className={chip(s.am === v)}>{short(v * 1e4)}</button>
                  ))}
                </div>
              </div>
            ) : (
              <div>
                {field('pay', t('payBudget'), { step: 10, suffix: t('unitManwon'), hint: `${short(s.pay * 1e4)} · ${t('payBudgetHint')}` })}
                <div className="flex flex-wrap gap-2 mt-2">
                  {[50, 100, 150, 200].map((v) => (
                    <button key={v} type="button" onClick={() => set('pay', v)} className={chip(s.pay === v)}>{short(v * 1e4)}</button>
                  ))}
                </div>
              </div>
            )}

            {field('r', t('input.interestRate'), { step: 0.05, suffix: '%', max: 30 })}

            <div>
              {field('t', t('input.loanTerm'), { suffix: t('input.years'), max: 50 })}
              <div className="flex flex-wrap gap-2 mt-2">
                {[10, 20, 30, 40].map((y) => (
                  <button key={y} type="button" onClick={() => set('t', y)} className={chip(s.t === y)}>{t('term.years', { n: y })}</button>
                ))}
              </div>
            </div>

            <div>
              <p className="block text-sm font-medium text-body mb-2">{t('input.loanType')}</p>
              <div className="grid grid-cols-3 gap-2">
                {METHODS.map((m) => (
                  <button key={m} type="button" onClick={() => set('m', m)} className={`${chip(s.m === m)} px-1`} aria-pressed={s.m === m}>{methodName(m)}</button>
                ))}
              </div>
            </div>

            <div>
              {field('gr', t('input.gracePeriod'), { suffix: t('input.months'), hint: t('graceHint') })}
              <div className="flex flex-wrap gap-2 mt-2">
                {[0, 12, 24, 36].map((v) => (
                  <button key={v} type="button" onClick={() => set('gr', v)} className={chip(s.gr === v)}>{v ? t('term.months', { n: v }) : t('none')}</button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* 결과 */}
        <div className="lg:col-span-2 space-y-6 min-w-0">
          {!valid && (
            <div className="bg-amber-50 text-amber-800 rounded-2xl p-4 text-sm">
              {s.gr >= months && months > 0 ? t('warn.graceTooLong') : principal === Infinity ? t('warn.unlimited') : t('warn.invalid')}
            </div>
          )}

          {res && hero && <>
            <div className="ui-hero p-6">
              <p className="text-sm text-white/70">{hero.label}</p>
              <p className="text-sm text-white/90 mt-3">{hero.title}</p>
              <p className="text-3xl font-bold tabular-nums">{hero.value}</p>
              {hero.sub && <p className="text-sm text-white/80 mt-1 tabular-nums">{hero.sub}</p>}
              {s.gr > 0 && <p className="text-sm text-white/80 mt-1 tabular-nums">{t('hero.graceNote', { months: s.gr, amount: won(res.graceInterest) })}</p>}
              {revMax ? (
                <div className="mt-5 pt-4 border-t border-white/20 text-sm">
                  <p className="text-white/70 mb-2">{t('hero.revByMethod')}</p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {METHODS.map((m) => (
                      <div key={m} className="flex sm:block justify-between">
                        <p className="text-white/70">{methodName(m)}</p>
                        <p className="font-bold tabular-nums">{Number.isFinite(revMax[m]) ? short(revMax[m]) : '—'}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-5 pt-4 border-t border-white/20 text-sm">
                  <div><p className="text-white/70">{t('result.totalInterest')}</p><p className="text-lg font-bold tabular-nums">{short(res.totalInterest)}</p></div>
                  <div><p className="text-white/70">{t('result.totalPayment')}</p><p className="text-lg font-bold tabular-nums">{short(res.totalPayment)}</p></div>
                  <div><p className="text-white/70">{t('result.interestRatio')}</p><p className="text-lg font-bold tabular-nums">{(res.totalInterest / principal * 100).toFixed(1)}%</p></div>
                </div>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <ShareResult
                card={{
                  tool: t('title'),
                  label: hero.label,
                  headline: hero.value,
                  sub: hero.title,
                  rows: [
                    { label: t('result.totalInterest'), value: short(res.totalInterest) },
                    { label: t('result.totalPayment'), value: short(res.totalPayment) },
                  ],
                }}
                text={`${t('title')} · ${hero.title} ${hero.value} · ${t('result.totalInterest')} ${short(res.totalInterest)}`}
                fileName="toolhub-loan"
              />
              <button type="button" onClick={handleSave} className="ui-btn-soft px-3 py-2 text-sm inline-flex items-center gap-1.5">
                {saved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />} {saved ? t('history.saved') : t('history.save')}
              </button>
            </div>

            {/* 상환 방식 비교 */}
            <div className="ui-card p-6">
              <h2 className="text-lg font-semibold text-fg">{t('cmp.title')}</h2>
              <p className="text-sm text-muted mt-1">{t('cmp.desc')}</p>
              <div className="overflow-x-auto mt-4">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-line text-left">
                      <th className={th}>{t('input.loanType')}</th>
                      <th className={`${th} text-right`}>{t('cmp.first')}</th>
                      <th className={`${th} text-right`}>{t('cmp.last')}</th>
                      <th className={`${th} text-right`}>{t('result.totalInterest')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {byMethod.map(({ m, r }) => (
                      <tr key={m} onClick={() => set('m', m)}
                        className={`border-b border-line last:border-0 cursor-pointer ${m === s.m ? 'bg-primary-soft text-primary' : 'text-body hover:bg-subtle'}`}>
                        <td className={`${td} font-medium`}>
                          {methodName(m)}
                          {m === cheapest && <span className="ml-2 text-xs font-semibold text-primary">{t('cmp.cheapest')}</span>}
                        </td>
                        <td className={`${td} text-right`}>{won(r.firstPayment)}</td>
                        <td className={`${td} text-right`}>{won(r.lastPayment)}</td>
                        <td className={`${td} text-right font-semibold`}>{short(r.totalInterest)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {byMethod.length === 3 && (
                <ul className="text-sm text-sub mt-3 space-y-1">
                  <li>{t('cmp.note', {
                    amount: short(byMethod[0].r.totalInterest - byMethod[1].r.totalInterest),
                    first: won(byMethod[1].r.firstPayment - byMethod[0].r.firstPayment),
                  })}</li>
                  <li>{t('cmp.bulletNote', { amount: short(byMethod[2].r.totalInterest - byMethod[0].r.totalInterest) })}</li>
                </ul>
              )}
            </div>

            {/* 금리 변화 */}
            <div className="ui-card p-6">
              <h2 className="text-lg font-semibold text-fg">{t('rate.title')}</h2>
              <p className="text-sm text-muted mt-1">{t('rate.desc', { method: methodName(s.m) })}</p>
              <div className="overflow-x-auto mt-4">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-line text-left">
                      <th className={th}>{t('rate.col')}</th>
                      <th className={`${th} text-right`}>{t('cmp.first')}</th>
                      <th className={`${th} text-right`}>{t('rate.change')}</th>
                      <th className={`${th} text-right`}>{t('result.totalInterest')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rateRows.map(({ d, r }) => (
                      <tr key={d} className={`border-b border-line last:border-0 ${d === 0 ? 'bg-primary-soft text-primary' : 'text-body'}`}>
                        <td className={`${td} font-medium`}>{+(s.r + d).toFixed(2)}% {d !== 0 && <span className="text-xs text-muted">({d > 0 ? '+' : ''}{d}%p)</span>}</td>
                        <td className={`${td} text-right`}>{won(r.firstPayment)}</td>
                        <td className={`${td} text-right`}>{d === 0 ? t('rate.current') : `${signed(r.firstPayment - rateCur!.firstPayment, won)}`}</td>
                        <td className={`${td} text-right`}>{short(r.totalInterest)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {rateCur && ratePlus1 && (
                <p className="text-sm text-sub mt-3">{t('rate.note', {
                  amount: won(ratePlus1.firstPayment - rateCur.firstPayment),
                  interest: short(ratePlus1.totalInterest - rateCur.totalInterest),
                })}</p>
              )}
            </div>

            {/* DSR */}
            <div className="ui-card p-6 space-y-4">
              <div>
                <h2 className="text-lg font-semibold text-fg">{t('dsr.title')}</h2>
                <p className="text-sm text-muted mt-1">{t('dsr.desc')}</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {field('inc', t('dsr.income'), { step: 100, suffix: t('unitManwon'), hint: short(income) })}
                {field('ex', t('dsr.existing'), { step: 100, suffix: t('unitManwon'), hint: t('dsr.existingHint') })}
              </div>
              {dsr === null ? (
                <p className="text-sm text-muted">{t('dsr.needIncome')}</p>
              ) : (
                <div className="bg-subtle rounded-2xl p-5 space-y-3">
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="text-sm text-sub">{t('dsr.result')}</p>
                    <p className={`text-3xl font-bold tabular-nums ${dsr > DSR_LIMIT ? 'text-amber-600' : 'text-fg'}`}>{dsr.toFixed(1)}%</p>
                  </div>
                  <div className="relative h-2 rounded-full bg-track overflow-hidden" aria-hidden>
                    <div className={`h-full rounded-full ${dsr > DSR_LIMIT ? 'bg-amber-500' : 'bg-primary'}`} style={{ width: `${Math.min(100, dsr)}%` }} />
                    <div className="absolute top-0 h-full w-0.5 bg-fg opacity-40" style={{ left: `${DSR_LIMIT}%` }} />
                  </div>
                  <ul className="text-sm text-sub space-y-1 tabular-nums">
                    <li>{t('dsr.thisLoan', { amount: won(annual) })}</li>
                    <li>{room >= 0
                      ? t('dsr.room', { amount: won(room), monthly: won(room / 12) })
                      : t('dsr.over', { pct: (dsr - DSR_LIMIT).toFixed(1) })}</li>
                  </ul>
                </div>
              )}
              <ul className="text-xs text-muted space-y-1 list-disc pl-4">
                <li>{t('dsr.limitNote')}</li>
                <li>{t('dsr.stressNote')}</li>
                <li>{t('dsr.calcNote')}</li>
              </ul>
              <a href="/dsr-calculator/" className="inline-flex items-center gap-1 text-sm text-primary hover:underline">
                {t('dsr.more')} <ArrowRight className="w-3.5 h-3.5" />
              </a>
            </div>

            <p className="text-xs text-muted">{t('note.rounding')}</p>
          </>}

          {/* 관련 도구 */}
          <div className="ui-card p-6">
            <h2 className="text-lg font-semibold text-fg">{t('links.title')}</h2>
            <div className="mt-3 divide-y divide-line">
              {[
                { href: valid ? scheduleHref : '/loan-schedule/', label: t('links.schedule'), desc: t('links.scheduleDesc') },
                { href: '/jeonse-loan/', label: t('links.jeonse'), desc: t('links.jeonseDesc') },
                { href: '/bogeumjari-loan/', label: t('links.bogeumjari'), desc: t('links.bogeumjariDesc') },
              ].map((l) => (
                <a key={l.label} href={l.href} className="flex items-center justify-between gap-3 py-3 group">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-fg group-hover:text-primary">{l.label}</p>
                    <p className="text-xs text-muted">{l.desc}</p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-faint shrink-0" />
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>

      <GuideSection namespace="loan" defaultOpen />
    </div>
  )
}
