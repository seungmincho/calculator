'use client'

import { useState, useMemo, useEffect, useCallback, Fragment } from 'react'
import { useTranslations } from '@/lib/i18n'
import '@/lib/i18n/ns/loanSchedule'
import { useSearchParams } from '@/hooks/useSearchParams'
import { Copy, Check, Download, Printer, ChevronDown, ChevronRight, RotateCcw, ArrowRight } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts'
import ShareResult from '@/components/ShareResult'
import MobileResultLink from '@/components/MobileResultLink'
import GuideSection from '@/components/GuideSection'
import { schedule, yearly, payDate, type Method, type PrepayMode, type LoanInput, type LoanResult } from '@/utils/loanSchedule'

const METHODS: Method[] = ['equalPayment', 'equalPrincipal', 'bullet', 'graduated']
const METHOD_KEY: Record<Method, string> = {
  equalPayment: 'typeEqualPayment', equalPrincipal: 'typeEqualPrincipal', bullet: 'typeBullet', graduated: 'typeGraduated',
}

const DEFAULTS = {
  am: 30000, r: 4.5, t: 30, tu: 'y' as 'y' | 'm', m: 'equalPayment' as Method, gr: 0, gw: 2, st: '',
  rc: 0, nr: 5.5, pm: 36, pa: 0, pf: 0.65, pmode: 'shorten' as PrepayMode,
  cmp: 0, bam: 30000, br: 4.0, bt: 30, bm: 'equalPrincipal' as Method, bgr: 0,
}
type State = typeof DEFAULTS

function decode(sp: URLSearchParams): State {
  const s = { ...DEFAULTS }
  const num = (k: string) => { const v = sp.get(k); const n = v === null || v === '' ? NaN : Number(v); return Number.isFinite(n) ? n : undefined }
  const meth = (v: string | null) => (METHODS as string[]).includes(v ?? '') ? v as Method : undefined
  // 예전 링크 호환: amount+unit, rate, term+termUnit, type, grace, start
  const legacy = num('amount')
  if (legacy !== undefined) { const u = sp.get('unit'); s.am = u === 'won' ? legacy / 1e4 : u === 'eokwon' ? legacy * 1e4 : legacy }
  s.r = num('rate') ?? s.r; s.t = num('term') ?? s.t
  if (sp.get('termUnit') === 'months') s.tu = 'm'
  s.m = meth(sp.get('type')) ?? s.m; s.gr = num('grace') ?? s.gr; s.st = sp.get('start') ?? s.st
  for (const k of ['am', 'r', 't', 'gr', 'gw', 'rc', 'nr', 'pm', 'pa', 'pf', 'cmp', 'bam', 'br', 'bt', 'bgr'] as const) {
    const v = num(k); if (v !== undefined) s[k] = Math.max(0, v)
  }
  if (sp.get('tu') === 'm' || sp.get('tu') === 'y') s.tu = sp.get('tu') as 'y' | 'm'
  s.m = meth(sp.get('m')) ?? s.m; s.bm = meth(sp.get('bm')) ?? s.bm
  if (sp.get('pmode') === 'reduce') s.pmode = 'reduce'
  if (sp.get('st') && /^\d{4}-\d{2}-\d{2}$/.test(sp.get('st')!)) s.st = sp.get('st')!
  return s
}

export default function LoanSchedule() {
  const t = useTranslations('loanSchedule')
  const searchParams = useSearchParams()
  const [s, setS] = useState<State>(() => decode(searchParams))
  const set = <K extends keyof State>(k: K, v: State[K]) => setS((p) => ({ ...p, [k]: v }))
  const setNum = (k: keyof State) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const n = Number(e.target.value); setS((p) => ({ ...p, [k]: Number.isFinite(n) ? Math.max(0, n) : 0 }))
  }
  const [open, setOpen] = useState<Set<number>>(() => new Set([1]))
  const [copied, setCopied] = useState(false)

  // 시작일 기본값 = 오늘 (서버 렌더와 어긋나지 않게 클라이언트에서만 채움)
  useEffect(() => {
    if (!s.st) { const d = new Date(); set('st', `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`) }
  }, [s.st])

  useEffect(() => {
    const url = new URL(window.location.href)
    for (const old of ['amount', 'unit', 'rate', 'term', 'termUnit', 'type', 'grace', 'start', 'extra']) url.searchParams.delete(old)
    for (const [k, v] of Object.entries(s)) {
      if (k.startsWith('b') && !s.cmp) url.searchParams.delete(k)
      else url.searchParams.set(k, String(v))
    }
    window.history.replaceState({}, '', url)
  }, [s])

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
  const methodName = (m: Method) => t(METHOD_KEY[m])

  // ── 계산 ──
  const months = Math.round(s.tu === 'y' ? s.t * 12 : s.t)
  const valid = s.am > 0 && months > 0 && months <= 600 && s.gr < months
  const input: LoanInput = useMemo(() => ({
    principal: s.am * 1e4, rate: s.r, months, grace: s.gr, method: s.m, growth: s.gw,
    rateChangeMonth: s.rc > 0 && s.rc < months ? s.rc : 0, newRate: s.nr,
  }), [s.am, s.r, months, s.gr, s.m, s.gw, s.rc, s.nr])
  const prepay = s.pa > 0 && s.pm > 0 && s.pm < months ? { month: s.pm, amount: s.pa * 1e4, feeRate: s.pf, mode: s.pmode } : null

  const res = useMemo<LoanResult | null>(() => valid ? schedule({ ...input, prepay }) : null,
    [valid, input, prepay?.month, prepay?.amount, prepay?.feeRate, prepay?.mode]) // eslint-disable-line react-hooks/exhaustive-deps
  const byMethod = useMemo(() => valid ? METHODS.map((m) => ({ m, r: schedule({ ...input, method: m }) })) : [], [valid, input])
  const prepayCmp = useMemo(() => {
    if (!valid || !prepay) return null
    const none = schedule(input)
    return {
      none,
      shorten: schedule({ ...input, prepay: { ...prepay, mode: 'shorten' } }),
      reduce: schedule({ ...input, prepay: { ...prepay, mode: 'reduce' } }),
    }
  }, [valid, input, prepay?.month, prepay?.amount, prepay?.feeRate]) // eslint-disable-line react-hooks/exhaustive-deps
  const bMonths = Math.round(s.bt * 12)
  const resB = useMemo(() => s.cmp && s.bam > 0 && bMonths > 0 && bMonths <= 600 && s.bgr < bMonths
    ? schedule({ principal: s.bam * 1e4, rate: s.br, months: bMonths, grace: s.bgr, method: s.bm, growth: s.gw }) : null,
  [s.cmp, s.bam, s.br, bMonths, s.bgr, s.bm, s.gw])
  const years = useMemo(() => res ? yearly(res.rows) : [], [res])
  const showRate = input.rateChangeMonth! > 0
  const negAmort = !!res?.rows.some((x) => x.principal < 0)

  // ── 내보내기 ──
  const header = [t('period'), t('date'), t('table.rate'), t('monthlyPayment'), t('principalPayment'), t('interestPayment'), t('table.prepay'), t('table.fee'), t('remainingBalance')]
  const lines = () => res ? res.rows.map((x) => [x.n, payDate(s.st, x.n), x.rate, x.payment, x.principal, x.interest, x.prepay, x.fee, x.balance]) : []
  const downloadCSV = () => {
    const csv = '﻿' + [header, ...lines()].map((r) => r.join(',')).join('\n')
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }))
    a.download = `loan-schedule-${s.am}-${s.r}-${months}.csv`
    a.click()
    setTimeout(() => URL.revokeObjectURL(a.href), 1000)
  }
  const copyTSV = async () => {
    try { await navigator.clipboard.writeText([header, ...lines()].map((r) => r.join('\t')).join('\n')) } catch { /* 권한 없음 */ }
    setCopied(true); setTimeout(() => setCopied(false), 2000)
  }
  const printAll = useCallback(() => {
    setOpen(new Set(years.map((y) => y.year)))
    setTimeout(() => window.print(), 100)
  }, [years])
  const toggleYear = (y: number) => setOpen((p) => { const n = new Set(p); if (n.has(y)) n.delete(y); else n.add(y); return n })

  // ── 히어로 ──
  const hero = (() => {
    if (!res) return null
    if (s.m === 'bullet') return { label: t('hero.monthlyInterest'), value: won(res.rows[0].interest), sub: t('hero.bulletEnd', { amount: short(s.am * 1e4) }) }
    if (s.m === 'equalPrincipal') return { label: t('hero.firstMonth'), value: won(res.firstPayment), sub: t('hero.lastMonth', { amount: won(res.lastPayment) }) }
    if (s.m === 'graduated') return { label: t('hero.firstYear'), value: won(res.firstPayment), sub: t('hero.maxMonth', { amount: won(res.maxPayment) }) }
    return { label: t('hero.monthly'), value: won(res.firstPayment), sub: '' }
  })()
  const rateChangeRow = showRate && res ? res.rows.find((x) => x.n === input.rateChangeMonth! + 1 && !x.grace) : undefined

  const chip = (active: boolean) =>
    `px-3 py-2 rounded-xl text-sm font-medium transition-colors ${active ? 'bg-primary text-white' : 'bg-soft text-body hover:bg-subtle'}`
  const field = (k: keyof State, label: string, opts: { step?: number; hint?: string; suffix?: string; max?: number } = {}) => (
    <div>
      <label htmlFor={`ls-${k}`} className="block text-sm font-medium text-body mb-2">{label}</label>
      <div className="relative">
        <input id={`ls-${k}`} type="number" inputMode="decimal" min={0} max={opts.max} step={opts.step ?? 1} value={s[k] as number}
          onChange={setNum(k)} className={`ui-field px-4 py-3 tabular-nums ${opts.suffix ? 'pr-14' : ''}`} />
        {opts.suffix && <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-muted">{opts.suffix}</span>}
      </div>
      {opts.hint && <p className="text-xs text-muted mt-1">{opts.hint}</p>}
    </div>
  )
  const methodChips = (k: 'm' | 'bm') => (
    <div className="grid grid-cols-2 gap-2">
      {METHODS.map((m) => (
        <button key={m} type="button" onClick={() => set(k, m)} className={chip(s[k] === m)} aria-pressed={s[k] === m}>{methodName(m)}</button>
      ))}
    </div>
  )
  const th = 'px-3 py-2.5 text-xs font-medium text-muted whitespace-nowrap'
  const td = 'px-3 py-2 tabular-nums whitespace-nowrap'

  return (
    <div className="space-y-8">
      <div className="print:hidden">
        <h1 className="text-2xl font-bold text-fg">{t('title')}</h1>
        <p className="text-sm text-muted mt-1">{t('description')}</p>
        <a href="/loan-calculator/" className="inline-flex items-center gap-1 text-sm text-primary mt-2 hover:underline">
          {t('link.calculator')} <ArrowRight className="w-3.5 h-3.5" />
        </a>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* 입력 */}
        <div className="lg:col-span-1 space-y-6 print:hidden">
          <div className="ui-card p-6 space-y-4">
            {hero && <MobileResultLink href="#loan-schedule-result" label={hero.label} value={hero.value} />}
            {field('am', t('loanAmount'), { step: 1000, suffix: t('unitManwon'), hint: short(s.am * 1e4) })}
            {field('r', t('annualRate'), { step: 0.05, suffix: '%', max: 30 })}
            <div>
              <label htmlFor="ls-t" className="block text-sm font-medium text-body mb-2">{t('loanTerm')}</label>
              <div className="flex gap-2">
                <input id="ls-t" type="number" inputMode="numeric" min={1} value={s.t} onChange={setNum('t')} className="ui-field px-4 py-3 tabular-nums flex-1 min-w-0" />
                {(['y', 'm'] as const).map((u) => (
                  <button key={u} type="button" onClick={() => set('tu', u)} className={chip(s.tu === u)} aria-pressed={s.tu === u}>
                    {u === 'y' ? t('unitYears') : t('unitMonths')}
                  </button>
                ))}
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                {[10, 20, 30, 40].map((y) => (
                  <button key={y} type="button" onClick={() => setS((p) => ({ ...p, t: y, tu: 'y' }))} className={chip(s.tu === 'y' && s.t === y)}>{t('term.years', { n: y })}</button>
                ))}
              </div>
            </div>
            <div>
              <p className="block text-sm font-medium text-body mb-2">{t('repaymentType')}</p>
              {methodChips('m')}
            </div>
            {s.m === 'graduated' && field('gw', t('growth'), { step: 0.5, suffix: '%', hint: t('growthHint') })}
            {field('gr', t('gracePeriod'), { suffix: t('monthsLabel'), hint: t('graceHint') })}
            <div>
              <label htmlFor="ls-st" className="block text-sm font-medium text-body mb-2">{t('startDate')}</label>
              <input id="ls-st" type="date" value={s.st} onChange={(e) => set('st', e.target.value)} className="ui-field px-4 py-3" />
            </div>
            <button type="button" onClick={() => setS({ ...DEFAULTS, st: s.st })} className="ui-btn-soft px-4 py-2 inline-flex items-center gap-1.5 text-sm">
              <RotateCcw className="w-4 h-4" /> {t('reset')}
            </button>
          </div>

          <div className="ui-card p-6 space-y-4">
            <div>
              <h2 className="text-lg font-semibold text-fg">{t('rateChange.title')}</h2>
              <p className="text-sm text-muted mt-1">{t('rateChange.desc')}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {[0, 36, 60, 120].map((m) => (
                <button key={m} type="button" onClick={() => set('rc', m)} className={chip(s.rc === m)}>
                  {m ? t('rateChange.preset', { n: m / 12 }) : t('rateChange.none')}
                </button>
              ))}
            </div>
            {s.rc > 0 && <>
              {field('rc', t('rateChange.month'), { suffix: t('monthsLabel') })}
              {field('nr', t('rateChange.newRate'), { step: 0.05, suffix: '%', max: 30 })}
            </>}
          </div>

          <div className="ui-card p-6 space-y-4">
            <div>
              <h2 className="text-lg font-semibold text-fg">{t('prepay.title')}</h2>
              <p className="text-sm text-muted mt-1">{t('prepay.desc')}</p>
            </div>
            {field('pa', t('prepay.amount'), { step: 1000, suffix: t('unitManwon'), hint: s.pa > 0 ? short(s.pa * 1e4) : undefined })}
            {field('pm', t('prepay.month'), { suffix: t('periodSuffix'), hint: s.st ? t('prepay.monthHint', { date: payDate(s.st, s.pm) }) : undefined })}
            {field('pf', t('prepay.feeRate'), { step: 0.05, suffix: '%', max: 5, hint: t('prepay.feeHint') })}
            <div>
              <p className="block text-sm font-medium text-body mb-2">{t('prepay.mode')}</p>
              <div className="grid grid-cols-2 gap-2">
                {(['shorten', 'reduce'] as const).map((m) => (
                  <button key={m} type="button" onClick={() => set('pmode', m)} className={chip(s.pmode === m)} aria-pressed={s.pmode === m}>{t(`prepay.${m}`)}</button>
                ))}
              </div>
            </div>
            <p className="text-xs text-muted">
              {t('prepay.feeFormula')}{' '}
              <a href="https://www.fsc.go.kr/edu/news/83839" target="_blank" rel="noopener noreferrer" className="underline">{t('prepay.source')}</a>
            </p>
          </div>
        </div>

        {/* 결과 */}
        <div className="lg:col-span-2 space-y-6">
          {!valid && <div className="bg-amber-50 text-amber-800 rounded-2xl p-4 text-sm">{s.gr >= months && months > 0 ? t('warn.graceTooLong') : t('warn.invalid')}</div>}

          {res && hero && <>
            <div id="loan-schedule-result" className="ui-hero p-6 scroll-mt-20">
              <p className="text-sm text-white/70">{t('hero.label', { amount: short(s.am * 1e4), rate: s.r, term: termText(months), method: methodName(s.m) })}</p>
              <p className="text-sm text-white/90 mt-3">{hero.label}</p>
              <p className="text-3xl font-bold tabular-nums">{hero.value}</p>
              {hero.sub && <p className="text-sm text-white/80 mt-1 tabular-nums">{hero.sub}</p>}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-5 pt-4 border-t border-white/20 text-sm">
                <div><p className="text-white/70">{t('totalInterest')}</p><p className="text-lg font-bold tabular-nums">{short(res.totalInterest)}</p></div>
                <div><p className="text-white/70">{t('totalPayment')}</p><p className="text-lg font-bold tabular-nums">{short(res.totalPayment)}</p></div>
                <div><p className="text-white/70">{t('interestRatio')}</p><p className="text-lg font-bold tabular-nums">{(res.totalInterest / (s.am * 1e4) * 100).toFixed(1)}%</p></div>
              </div>
              {(s.gr > 0 || rateChangeRow || prepay) && (
                <ul className="mt-4 space-y-1 text-sm text-white/80 tabular-nums">
                  {s.gr > 0 && <li>{t('hero.graceNote', { months: s.gr, amount: won(res.graceInterest) })}</li>}
                  {rateChangeRow && <li>{t('hero.rateChange', { month: rateChangeRow.n, rate: s.nr, amount: won(rateChangeRow.payment) })}</li>}
                  {prepay && <li>{t('hero.prepay', { month: prepay.month, amount: short(res.rows[prepay.month - 1]?.prepay ?? 0), fee: won(res.fee), months: termText(res.months) })}</li>}
                </ul>
              )}
            </div>

            {negAmort && <div className="bg-amber-50 text-amber-800 rounded-2xl p-4 text-sm">{t('warn.negative')}</div>}

            <div className="print:hidden">
              <ShareResult
                card={{
                  tool: t('title'),
                  label: `${t('hero.label', { amount: short(s.am * 1e4), rate: s.r, term: termText(months), method: methodName(s.m) })}`,
                  headline: hero.value,
                  sub: hero.label,
                  rows: [
                    { label: t('totalInterest'), value: short(res.totalInterest) },
                    { label: t('totalPayment'), value: short(res.totalPayment) },
                  ],
                }}
                text={`${t('title')} · ${hero.label} ${hero.value} · ${t('totalInterest')} ${short(res.totalInterest)}`}
                fileName="toolhub-loan-schedule"
              />
            </div>

            {/* 상환 방식 비교 */}
            <div className="ui-card p-6 print:hidden">
              <h2 className="text-lg font-semibold text-fg">{t('methods.title')}</h2>
              <div className="overflow-x-auto mt-4">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-line text-left">
                      <th className={th}>{t('repaymentType')}</th>
                      <th className={`${th} text-right`}>{t('methods.first')}</th>
                      <th className={`${th} text-right`}>{t('methods.max')}</th>
                      <th className={`${th} text-right`}>{t('totalInterest')}</th>
                      <th className={`${th} text-right`}>{t('methods.diff')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {byMethod.map(({ m, r }) => {
                      const cur = byMethod.find((x) => x.m === s.m)!.r
                      const d = r.totalInterest - cur.totalInterest
                      return (
                        <tr key={m} onClick={() => set('m', m)}
                          className={`border-b border-line last:border-0 cursor-pointer ${m === s.m ? 'bg-primary-soft text-primary' : 'text-body hover:bg-subtle'}`}>
                          <td className={`${td} font-medium`}>{methodName(m)}</td>
                          <td className={`${td} text-right`}>{won(r.firstPayment)}</td>
                          <td className={`${td} text-right`}>{won(r.maxPayment)}</td>
                          <td className={`${td} text-right`}>{short(r.totalInterest)}</td>
                          <td className={`${td} text-right`}>{m === s.m ? t('methods.current') : `${d > 0 ? '+' : ''}${short(d)}`}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
              {byMethod.length > 0 && (() => {
                const ep = byMethod[0].r, eq = byMethod[1].r
                return <p className="text-sm text-sub mt-3">{t('methods.note', { amount: short(ep.totalInterest - eq.totalInterest), first: won(eq.firstPayment - ep.firstPayment) })}</p>
              })()}
            </div>

            {/* 중도상환 비교 */}
            {prepayCmp && (
              <div className="ui-card p-6 print:hidden">
                <h2 className="text-lg font-semibold text-fg">{t('prepay.cmpTitle')}</h2>
                <p className="text-sm text-muted mt-1">{t('prepay.cmpDesc', { month: prepay!.month, amount: short(prepay!.amount), fee: won(prepayCmp.shorten.fee) })}</p>
                <div className="overflow-x-auto mt-4">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-line text-left">
                        <th className={th}></th>
                        <th className={`${th} text-right`}>{t('prepay.colMonths')}</th>
                        <th className={`${th} text-right`}>{t('prepay.colAfter')}</th>
                        <th className={`${th} text-right`}>{t('totalInterest')}</th>
                        <th className={`${th} text-right`}>{t('prepay.colSaved')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(['none', 'shorten', 'reduce'] as const).map((k) => {
                        const r = prepayCmp[k]
                        const after = r.rows[Math.min(prepay!.month, r.rows.length - 1)]?.payment ?? 0
                        const saved = prepayCmp.none.totalInterest - r.totalInterest - r.fee
                        const sel = k === s.pmode
                        return (
                          <tr key={k} onClick={k === 'none' ? undefined : () => set('pmode', k)}
                            className={`border-b border-line last:border-0 ${k === 'none' ? 'text-sub' : 'cursor-pointer'} ${sel ? 'bg-primary-soft text-primary' : k === 'none' ? '' : 'text-body hover:bg-subtle'}`}>
                            <td className={`${td} font-medium`}>{t(`prepay.${k}`)}</td>
                            <td className={`${td} text-right`}>{termText(r.months)}</td>
                            <td className={`${td} text-right`}>{won(after)}</td>
                            <td className={`${td} text-right`}>{short(r.totalInterest)}</td>
                            <td className={`${td} text-right font-semibold`}>{k === 'none' ? '—' : short(saved)}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
                <p className="text-sm text-sub mt-3">
                  {t('prepay.verdict', {
                    months: prepayCmp.none.months - prepayCmp.shorten.months,
                    diff: short(prepayCmp.reduce.totalInterest - prepayCmp.shorten.totalInterest),
                    drop: won((prepayCmp.none.rows[prepay!.month]?.payment ?? 0) - (prepayCmp.reduce.rows[prepay!.month]?.payment ?? 0)),
                  })}
                </p>
              </div>
            )}

            {/* 연도별 차트 */}
            <div className="ui-card p-6 print:hidden">
              <h2 className="text-lg font-semibold text-fg">{t('chart.title')}</h2>
              <div className="h-72 mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={years} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" vertical={false} />
                    <XAxis dataKey="year" tick={{ fontSize: 11, fill: 'var(--muted)' }} tickFormatter={(y: number) => t('chart.year', { n: y })} />
                    <YAxis tick={{ fontSize: 11, fill: 'var(--muted)' }} tickFormatter={(v: number) => `${Math.round(v / 1e4).toLocaleString('ko-KR')}${t('unit.man')}`} width={64} />
                    <Tooltip
                      labelFormatter={(y) => t('chart.year', { n: Number(y ?? 0) })}
                      formatter={(v, name) => [won(Number(v ?? 0)), String(name ?? '')]}
                      contentStyle={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 12, fontSize: 12 }}
                    />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Bar dataKey="principal" stackId="a" name={t('principalPayment')} fill="var(--primary)" />
                    {prepay && <Bar dataKey="prepay" stackId="a" name={t('table.prepay')} fill="#90c2ff" />}
                    <Bar dataKey="interest" stackId="a" name={t('interestPayment')} fill="var(--line-strong)" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* 상환 스케줄표 */}
            <div className="ui-card overflow-hidden print:border-0">
              <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 border-b border-line">
                <div>
                  <h2 className="text-lg font-semibold text-fg">{t('scheduleTitle')}</h2>
                  <p className="text-xs text-muted print:hidden">{t('table.hint')}</p>
                </div>
                <div className="flex flex-wrap gap-2 print:hidden">
                  <button type="button" onClick={() => setOpen(open.size >= years.length ? new Set() : new Set(years.map((y) => y.year)))} className="ui-btn-soft px-3 py-1.5 text-xs">
                    {open.size >= years.length ? t('table.collapseAll') : t('table.expandAll')}
                  </button>
                  <button type="button" onClick={copyTSV} className="ui-btn-soft px-3 py-1.5 text-xs inline-flex items-center gap-1">
                    {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />} {copied ? t('copied') : t('table.tsv')}
                  </button>
                  <button type="button" onClick={downloadCSV} className="ui-btn-soft px-3 py-1.5 text-xs inline-flex items-center gap-1">
                    <Download className="w-3.5 h-3.5" /> {t('table.csv')}
                  </button>
                  <button type="button" onClick={printAll} className="ui-btn-soft px-3 py-1.5 text-xs inline-flex items-center gap-1">
                    <Printer className="w-3.5 h-3.5" /> {t('table.print')}
                  </button>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-subtle border-b border-line">
                      <th className={`${th} text-left`}>{t('period')}</th>
                      <th className={`${th} text-left`}>{t('date')}</th>
                      {showRate && <th className={`${th} text-right`}>{t('table.rate')}</th>}
                      <th className={`${th} text-right`}>{t('monthlyPayment')}</th>
                      <th className={`${th} text-right`}>{t('principalPayment')}</th>
                      <th className={`${th} text-right`}>{t('interestPayment')}</th>
                      {prepay && <th className={`${th} text-right`}>{t('table.prepay')}</th>}
                      <th className={`${th} text-right`}>{t('remainingBalance')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {years.map((y) => {
                      const isOpen = open.has(y.year)
                      return (
                        <Fragment key={y.year}>
                          <tr onClick={() => toggleYear(y.year)} className="border-b border-line cursor-pointer bg-surface hover:bg-subtle font-medium text-fg" aria-expanded={isOpen}>
                            <td className={td} colSpan={2}>
                              <span className="inline-flex items-center gap-1">
                                {isOpen ? <ChevronDown className="w-4 h-4 print:hidden" /> : <ChevronRight className="w-4 h-4 print:hidden" />}
                                {t('table.year', { n: y.year })} <span className="text-xs text-muted font-normal">{t('table.range', { from: y.from, to: y.to })}</span>
                              </span>
                            </td>
                            {showRate && <td className={td}></td>}
                            <td className={`${td} text-right`}>{won(y.principal + y.interest)}</td>
                            <td className={`${td} text-right`}>{won(y.principal)}</td>
                            <td className={`${td} text-right`}>{won(y.interest)}</td>
                            {prepay && <td className={`${td} text-right`}>{y.prepay ? won(y.prepay) : ''}</td>}
                            <td className={`${td} text-right`}>{won(y.balance)}</td>
                          </tr>
                          {isOpen && res.rows.slice(y.from - 1, y.to).map((x) => (
                            <tr key={x.n} className="border-b border-line text-body">
                              <td className={`${td} pl-8`}>
                                {x.n}
                                {x.grace && <span className="ml-1 text-[10px] px-1.5 py-0.5 rounded bg-soft text-sub">{t('graceLabel')}</span>}
                              </td>
                              <td className={`${td} text-sub text-xs`}>{payDate(s.st, x.n)}</td>
                              {showRate && <td className={`${td} text-right text-sub`}>{x.rate}%</td>}
                              <td className={`${td} text-right text-fg`}>{won(x.payment)}</td>
                              <td className={`${td} text-right`}>{won(x.principal)}</td>
                              <td className={`${td} text-right`}>{won(x.interest)}</td>
                              {prepay && <td className={`${td} text-right`}>{x.prepay ? <>{won(x.prepay)}{x.fee > 0 && <span className="block text-[10px] text-muted">{t('table.fee')} {won(x.fee)}</span>}</> : ''}</td>}
                              <td className={`${td} text-right`}>{won(x.balance)}</td>
                            </tr>
                          ))}
                        </Fragment>
                      )
                    })}
                    <tr className="bg-subtle font-semibold text-fg">
                      <td className={td} colSpan={showRate ? 3 : 2}>{t('table.total')}</td>
                      <td className={`${td} text-right`}>{won(res.rows.reduce((a, x) => a + x.payment, 0))}</td>
                      <td className={`${td} text-right`}>{won(res.rows.reduce((a, x) => a + x.principal, 0))}</td>
                      <td className={`${td} text-right`}>{won(res.totalInterest)}</td>
                      {prepay && <td className={`${td} text-right`}>{won(res.rows.reduce((a, x) => a + x.prepay, 0))}</td>}
                      <td className={td}></td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-muted px-4 py-3 border-t border-line">{t('note.dayCount')}</p>
            </div>
          </>}
        </div>
      </div>

      {/* A/B 비교 */}
      <div className="ui-card p-6 space-y-4 print:hidden">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-lg font-semibold text-fg">{t('cmp.title')}</h2>
            <p className="text-sm text-muted mt-1">{t('cmp.desc')}</p>
          </div>
          <button type="button" onClick={() => set('cmp', s.cmp ? 0 : 1)} className={chip(!!s.cmp)} aria-pressed={!!s.cmp}>{t('cmp.toggle')}</button>
        </div>
        {!!s.cmp && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="space-y-4 bg-subtle rounded-2xl p-5">
              <p className="font-semibold text-fg">{t('loanB')}</p>
              {field('bam', t('loanAmount'), { step: 1000, suffix: t('unitManwon'), hint: short(s.bam * 1e4) })}
              {field('br', t('annualRate'), { step: 0.05, suffix: '%', max: 30 })}
              {field('bt', t('loanTerm'), { suffix: t('unitYears') })}
              {field('bgr', t('gracePeriod'), { suffix: t('monthsLabel') })}
              <div>
                <p className="block text-sm font-medium text-body mb-2">{t('repaymentType')}</p>
                {methodChips('bm')}
              </div>
            </div>
            <div className="lg:col-span-2 overflow-x-auto">
              {res && resB ? (() => {
                const a = schedule(input) // A는 중도상환 없이 같은 조건으로 비교
                const rows: [string, number, number, (v: number) => string][] = [
                  [t('methods.first'), a.firstPayment, resB.firstPayment, won],
                  [t('methods.max'), a.maxPayment, resB.maxPayment, won],
                  [t('totalInterest'), a.totalInterest, resB.totalInterest, short],
                  [t('totalPayment'), a.totalPayment, resB.totalPayment, short],
                  [t('cmp.months'), a.months, resB.months, (v) => (v < 0 ? '-' : '') + termText(Math.abs(v))],
                ]
                const better = a.totalInterest === resB.totalInterest ? null : a.totalInterest < resB.totalInterest ? t('loanA') : t('loanB')
                return <>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-line text-left">
                        <th className={th}></th>
                        <th className={`${th} text-right`}>{t('loanA')}<span className="block font-normal">{short(s.am * 1e4)} · {s.r}% · {methodName(s.m)}</span></th>
                        <th className={`${th} text-right`}>{t('loanB')}<span className="block font-normal">{short(s.bam * 1e4)} · {s.br}% · {methodName(s.bm)}</span></th>
                        <th className={`${th} text-right`}>{t('cmp.diff')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map(([label, va, vb, f]) => (
                        <tr key={label} className="border-b border-line last:border-0 text-body">
                          <td className={`${td} text-sub`}>{label}</td>
                          <td className={`${td} text-right`}>{f(va)}</td>
                          <td className={`${td} text-right`}>{f(vb)}</td>
                          <td className={`${td} text-right font-semibold text-fg`}>{vb - va > 0 ? '+' : ''}{f(vb - va)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {better && <p className="text-sm text-sub mt-3">{t('cmp.better', { loan: better, amount: short(Math.abs(a.totalInterest - resB.totalInterest)) })}</p>}
                </>
              })() : <p className="text-sm text-muted">{t('warn.invalid')}</p>}
            </div>
          </div>
        )}
      </div>

      <div className="print:hidden">
        <GuideSection namespace="loanSchedule" />
      </div>
    </div>
  )
}
