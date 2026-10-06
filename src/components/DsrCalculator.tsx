'use client'

// DSR 계산기 — 계산 로직은 src/utils/dsr.ts (근거·확인 필요 항목도 거기 주석). i18n: dsrCalc
import { useState, useMemo, useEffect } from 'react'
import Link from 'next/link'
import { Plus, X, AlertTriangle } from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, CartesianGrid } from 'recharts'
import { useTranslations } from '@/lib/i18n'
import '@/lib/i18n/ns/dsrCalc'
import { useSearchParams } from '@/hooks/useSearchParams'
import ShareResult from '@/components/ShareResult'
import MobileResultLink from '@/components/MobileResultLink'
import {
  DSR_CAP, DSR_APPLY_OVER, CAPITAL_MAX_TERM, annualRepay, existingAnnual, newLoanAnnual, maxNewLoan, stressAdd, regulatoryCap, dsr,
  type Loan, type LoanKind, type Method, type RateType, type Region, type Sector, type NewLoanSpec,
} from '@/utils/dsr'

const EOK = 100_000_000
const MAN = 10_000
const SECTORS: Sector[] = ['bank', 'nonbank']
const KINDS = ['mortgage', 'credit'] as const
const METHODS: Method[] = ['equalPayment', 'equalPrincipal', 'bullet']
const RATE_TYPES: RateType[] = ['variable', 'mixed', 'periodic', 'fixed']
const REGIONS: Region[] = ['capital', 'local']
const EX_KINDS: LoanKind[] = ['mortgage', 'credit', 'revolving', 'installment', 'jeonse']
const TERMS = [10, 15, 20, 25, 30, 35, 40]
const FIXED_YEARS = [5, 10, 15, 20]
const LINKS = ['loan-calculator', 'loan-schedule', 'jeonse-loan', 'bogeumjari-loan', 'acquisition-tax', 'salary-calculator'] as const
const DEFAULT_EX: Loan[] = [{ kind: 'credit', amount: 30_000_000, rate: 5, years: 5, method: 'equalPayment' }]

const parseNum = (s: string) => Number(s.replace(/[^\d]/g, '')) || 0
const pick = <T extends string>(v: string | null, list: readonly T[], def: T): T => (list.includes(v as T) ? (v as T) : def)
const num = (v: string | null, def: number, min: number, max: number) => {
  const n = parseFloat(v ?? '')
  return Number.isFinite(n) && n >= min && n <= max ? n : def
}
function eokMan(v: number): string {
  const eok = Math.floor(v / EOK)
  const man = Math.floor((v % EOK) / MAN)
  return [eok > 0 ? `${eok}억` : '', man > 0 ? `${man.toLocaleString('ko-KR')}만` : ''].filter(Boolean).join(' ') || '0'
}
const pct = (v: number) => `${v.toFixed(1)}%`
const rateStr = (v: number) => `${+v.toFixed(2)}`

// 기존 대출 URL 인코딩: kind.amount.rate.years.method.counted (숫자·코드만)
const KIND_CODE: Record<LoanKind, string> = { mortgage: 'm', credit: 'c', revolving: 'r', installment: 'i', jeonse: 'j' }
const METHOD_CODE: Record<Method, string> = { equalPayment: 'e', equalPrincipal: 'p', bullet: 'b' }
const encodeEx = (ls: Loan[]) =>
  ls.map((l) => [KIND_CODE[l.kind], l.amount, l.rate, l.years, METHOD_CODE[l.method ?? 'equalPayment'], l.counted ? 1 : 0].join('.')).join('_')
function decodeEx(s: string | null): Loan[] | null {
  if (s === null) return null
  if (s === '') return []
  const out: Loan[] = []
  for (const part of s.split('_').slice(0, 10)) {
    const [k, a, r, y, m, c] = part.split('.')
    const kind = EX_KINDS.find((x) => KIND_CODE[x] === k)
    if (!kind) continue
    const method = METHODS.find((x) => METHOD_CODE[x] === m) ?? 'equalPayment'
    out.push({ kind, amount: Math.min(parseNum(a ?? ''), 100 * EOK), rate: num(r ?? null, 5, 0, 30), years: num(y ?? null, 5, 1, 50), method, counted: c === '1' })
  }
  return out
}

export default function DsrCalculator() {
  const t = useTranslations('dsrCalc')
  const sp = useSearchParams()

  const [income, setIncome] = useState(() => Math.min(parseNum(sp.get('inc') ?? '') || 60_000_000, 10 * EOK))
  const [sector, setSector] = useState<Sector>(() => pick(sp.get('sec'), SECTORS, 'bank'))
  const [kind, setKind] = useState<'mortgage' | 'credit'>(() => pick(sp.get('k'), KINDS, 'mortgage'))
  const [amount, setAmount] = useState(() => (sp.get('a') !== null ? Math.min(parseNum(sp.get('a') ?? ''), 100 * EOK) : 300_000_000))
  const [rate, setRate] = useState(() => num(sp.get('r'), 4, 0, 30))
  const [years, setYears] = useState(() => num(sp.get('y'), 30, 1, 50))
  const [method, setMethod] = useState<Method>(() => pick(sp.get('m'), METHODS, 'equalPayment'))
  const [rateType, setRateType] = useState<RateType>(() => pick(sp.get('rt'), RATE_TYPES, 'variable'))
  const [fixedYears, setFixedYears] = useState(() => num(sp.get('fy'), 5, 1, 50))
  const [region, setRegion] = useState<Region>(() => pick(sp.get('reg'), REGIONS, 'capital'))
  const [ex, setEx] = useState<Loan[]>(() => decodeEx(sp.get('ex')) ?? DEFAULT_EX)

  useEffect(() => {
    const q = new URLSearchParams()
    q.set('inc', String(income))
    if (sector !== 'bank') q.set('sec', sector)
    if (kind !== 'mortgage') q.set('k', kind)
    q.set('a', String(amount))
    q.set('r', String(rate))
    if (kind === 'mortgage') {
      q.set('y', String(years))
      if (method !== 'equalPayment') q.set('m', method)
      if (region !== 'capital') q.set('reg', region)
    }
    if (rateType !== 'variable') q.set('rt', rateType)
    if (rateType === 'mixed' || rateType === 'periodic') q.set('fy', String(fixedYears))
    q.set('ex', encodeEx(ex))
    window.history.replaceState(null, '', `?${q}`)
  }, [income, sector, kind, amount, rate, years, method, rateType, fixedYears, region, ex])

  const changeKind = (k: 'mortgage' | 'credit') => {
    if (k === kind) return
    setKind(k)
    if (k === 'credit') { setAmount(50_000_000); setRate(5); if (rateType === 'mixed' || rateType === 'periodic') setRateType('variable') }
    else { setAmount(300_000_000); setRate(4) }
  }
  // 수도권·규제지역 주담대 만기 30년 상한 (지역 변경·URL 입력 모두)
  useEffect(() => { if (region === 'capital' && years > CAPITAL_MAX_TERM) setYears(CAPITAL_MAX_TERM) }, [region, years])
  const updEx = (i: number, patch: Partial<Loan>) => setEx((ls) => ls.map((l, j) => (j === i ? { ...l, ...patch } : l)))

  const cap = DSR_CAP[sector]
  const spec: NewLoanSpec = { kind, rate, years: kind === 'credit' ? 5 : years, method, rateType, fixedYears, region }
  const exAnnual = existingAnnual(ex)
  const limit = maxNewLoan(income, cap, ex, spec, true)
  const limitPlain = maxNewLoan(income, cap, ex, spec, false)
  const withLoan = newLoanAnnual(spec, amount, ex, true)
  const withLoanPlain = newLoanAnnual(spec, amount, ex, false)
  const dsrNow = dsr(income, exAnnual)
  const dsrWith = dsr(income, exAnnual + withLoan.annual)
  const dsrWithPlain = dsr(income, exAnnual + withLoanPlain.annual)
  const addAtLimit = stressAdd(spec, ex.filter((l) => l.kind === 'credit' || l.kind === 'revolving').reduce((s, l) => s + l.amount, 0) + limit)
  const regCap = regulatoryCap(spec, income)
  const totalDebt = ex.filter((l) => l.kind !== 'jeonse' || l.counted).reduce((s, l) => s + l.amount, 0) + amount
  const kindLabel = t(`form.kinds.${kind}`)
  const sectorLabel = t(`form.sectors.${sector}`)
  const won = t('units.won')

  const compare = SECTORS.map((s) => ({ s, plain: maxNewLoan(income, DSR_CAP[s], ex, spec, false), stress: maxNewLoan(income, DSR_CAP[s], ex, spec, true) }))
  const rtList: RateType[] = kind === 'credit' ? ['variable', 'fixed'] : RATE_TYPES
  const byRateType = rtList.map((rt) => {
    const s2 = { ...spec, rateType: rt }
    return { rt, add: kind === 'credit' ? stressAdd(s2, Infinity) : stressAdd(s2), limit: maxNewLoan(income, cap, ex, s2, true) }
  })
  const chart = useMemo(() => {
    const pts = []
    for (let inc = 20_000_000; inc <= 200_000_000; inc += 5_000_000) {
      pts.push({ inc: inc / MAN, plain: maxNewLoan(inc, cap, ex, spec, false) / EOK, stress: maxNewLoan(inc, cap, ex, spec, true) / EOK })
    }
    return pts
  }, [cap, ex, kind, rate, years, method, rateType, fixedYears, region]) // eslint-disable-line react-hooks/exhaustive-deps

  const seg = (on: boolean) =>
    `min-h-10 px-2 py-2 rounded-lg text-sm font-medium transition-colors ${on ? 'bg-primary text-white' : 'bg-soft text-body hover:bg-subtle'}`
  const lbl = 'block text-sm font-medium text-body mb-2'

  const money = (id: string, label: string, value: number, set: (v: number) => void, quick: number[], hint?: string) => (
    <div>
      <label htmlFor={id} className={lbl}>{label}</label>
      <div className="relative">
        <input
          id={id} type="text" inputMode="numeric" value={value ? value.toLocaleString('ko-KR') : ''}
          onChange={(e) => set(Math.min(parseNum(e.target.value), 100 * EOK))}
          aria-describedby={`${id}-u ${id}-h`}
          className="ui-field w-full px-4 py-3 pr-10 tabular-nums"
        />
        <span id={`${id}-u`} className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-muted">{won}</span>
      </div>
      <div className="flex items-center justify-between mt-1.5 gap-2">
        <span id={`${id}-h`} className="text-xs text-muted">{eokMan(value)}{won}{hint ? ` · ${hint}` : ''}</span>
        <div className="flex gap-1">
          {quick.map((q) => (
            <button key={q} type="button" onClick={() => set(value + q)} aria-label={t('a11y.addAmount', { label, amount: eokMan(q) })} className="min-h-10 px-2 py-1 rounded-lg bg-soft text-xs text-body hover:bg-subtle">+{eokMan(q)}</button>
          ))}
        </div>
      </div>
    </div>
  )
  const rateInput = (id: string, label: string, value: number, set: (v: number) => void) => (
    <div>
      <label htmlFor={id} className={lbl}>{label}</label>
      <div className="relative">
        <input id={id} type="number" inputMode="decimal" step="0.1" min="0" max="30" value={value} onChange={(e) => set(Math.min(30, Math.max(0, parseFloat(e.target.value) || 0)))} aria-describedby={`${id}-u`} className="ui-field w-full px-4 py-3 pr-10 tabular-nums" />
        <span id={`${id}-u`} className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-muted">%</span>
      </div>
    </div>
  )

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
        <div className="lg:col-span-1 space-y-6">
          <div className="ui-card p-6 space-y-5">
            {limit > 0 && <MobileResultLink href="#dsr-calculator-result" label={t('res.limitLabel', { sector: sectorLabel, kind: kindLabel })} value={`${eokMan(limit)}${won}`} />}
            <div>
              {money('dsr-inc', t('form.income'), income, setIncome, [], t('form.incomeHint'))}
              <input
                type="range" min={20_000_000} max={200_000_000} step={1_000_000} value={Math.min(Math.max(income, 20_000_000), 200_000_000)}
                onChange={(e) => setIncome(Number(e.target.value))} aria-label={t('form.income')} aria-valuetext={`${eokMan(income)}${won}`}
                className="w-full mt-2 accent-[var(--primary)]"
              />
            </div>
            <div>
              <p id="dsr-sector" className={lbl}>{t('form.sector')}</p>
              <div className="grid grid-cols-2 gap-2" role="group" aria-labelledby="dsr-sector">
                {SECTORS.map((s) => <button key={s} type="button" onClick={() => setSector(s)} aria-pressed={sector === s} className={seg(sector === s)}>{t(`form.sectors.${s}`)}</button>)}
              </div>
            </div>
          </div>

          <div className="ui-card p-6 space-y-5">
            <h2 className="text-lg font-semibold text-fg">{t('form.newTitle')}</h2>
            <div className="grid grid-cols-2 gap-2" role="group" aria-label={t('a11y.kind')}>
              {KINDS.map((k) => <button key={k} type="button" aria-pressed={kind === k} onClick={() => changeKind(k)} className={seg(kind === k)}>{t(`form.kinds.${k}`)}</button>)}
            </div>
            {money('dsr-amt', t('form.amount'), amount, setAmount, kind === 'mortgage' ? [1_000 * MAN, EOK] : [1_000 * MAN])}
            {rateInput('dsr-rate', t('form.rate'), rate, setRate)}
            {kind === 'mortgage' ? (
              <>
                <div>
                  <p id="dsr-region" className={lbl}>{t('form.region')}</p>
                  <div className="grid grid-cols-2 gap-2" role="group" aria-labelledby="dsr-region">
                    {REGIONS.map((r) => <button key={r} type="button" onClick={() => setRegion(r)} aria-pressed={region === r} className={seg(region === r)}>{t(`form.regions.${r}`)}</button>)}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="dsr-years" className={lbl}>{t('form.years')}</label>
                    <select id="dsr-years" value={years} onChange={(e) => { const y = Number(e.target.value); setYears(y); if (fixedYears >= y) setFixedYears(5) }} className="ui-field w-full px-3 py-3">
                      {TERMS.filter((y) => region === 'local' || y <= CAPITAL_MAX_TERM).map((y) => <option key={y} value={y}>{y}{t('units.year')}</option>)}
                    </select>
                  </div>
                  <div>
                    <label htmlFor="dsr-method" className={lbl}>{t('form.method')}</label>
                    <select id="dsr-method" value={method} onChange={(e) => setMethod(e.target.value as Method)} className="ui-field w-full px-3 py-3">
                      {METHODS.map((m) => <option key={m} value={m}>{t(`form.methods.${m}`)}</option>)}
                    </select>
                  </div>
                </div>
                {region === 'capital' && <p className="text-xs text-muted -mt-2">{t('form.capitalTerm')}</p>}
              </>
            ) : (
              <p className="text-xs text-muted">{t('form.creditBasis')}</p>
            )}
            <div>
              <p id="dsr-ratetype" className={lbl}>{t('form.rateType')}</p>
              <div className={`grid gap-2 ${kind === 'mortgage' ? 'grid-cols-4' : 'grid-cols-2'}`} role="group" aria-labelledby="dsr-ratetype">
                {(kind === 'mortgage' ? RATE_TYPES : (['variable', 'fixed'] as RateType[])).map((rt) => (
                  <button key={rt} type="button" onClick={() => setRateType(rt)} aria-pressed={rateType === rt} className={seg(rateType === rt)}>{t(`form.rateTypes.${rt}`)}</button>
                ))}
              </div>
              {(rateType === 'mixed' || rateType === 'periodic') && kind === 'mortgage' && (
                <div className="mt-3">
                  <label htmlFor="dsr-fy" className={lbl}>{t(`form.fixedYears.${rateType}`)}</label>
                  <select id="dsr-fy" value={fixedYears} onChange={(e) => setFixedYears(Number(e.target.value))} className="ui-field w-full px-3 py-3">
                    {FIXED_YEARS.filter((f) => f < years).map((f) => <option key={f} value={f}>{f}{t('units.year')}</option>)}
                  </select>
                </div>
              )}
              <p className="text-xs text-muted mt-1.5">
                {t('form.stressHint', { add: rateStr(stressAdd(spec, Infinity)), rate: rateStr(rate + stressAdd(spec, Infinity)) })}
                {kind === 'credit' && ` ${t('form.creditStress')}`}
                {kind === 'mortgage' && region === 'local' && ` ${t('form.localStress')}`}
              </p>
            </div>
          </div>

          {/* 기존 대출 */}
          <div className="ui-card p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-fg">{t('ex.title')}</h2>
              <button type="button" onClick={() => setEx((ls) => [...ls, { kind: 'credit', amount: 10_000_000, rate: 5, years: 5, method: 'equalPayment' }])} disabled={ex.length >= 10} className="ui-btn-soft min-h-10 px-3 py-1.5 text-sm inline-flex items-center gap-1">
                <Plus className="w-4 h-4" aria-hidden="true" />{t('ex.add')}
              </button>
            </div>
            {ex.length === 0 && <p className="text-sm text-muted">{t('ex.empty')}</p>}
            {ex.map((l, i) => (
              <div key={i} className="bg-subtle rounded-2xl p-4 space-y-3" role="group" aria-label={t('a11y.loanN', { n: i + 1 })}>
                <div className="flex items-center gap-2">
                  <select aria-label={t('ex.kind')} value={l.kind} onChange={(e) => updEx(i, { kind: e.target.value as LoanKind })} className="ui-field flex-1 px-3 py-2 text-sm">
                    {EX_KINDS.map((k) => <option key={k} value={k}>{t(`ex.kinds.${k}`)}</option>)}
                  </select>
                  <button type="button" onClick={() => setEx((ls) => ls.filter((_, j) => j !== i))} aria-label={t('a11y.removeLoan', { n: i + 1 })} className="min-h-10 min-w-10 inline-flex items-center justify-center p-2 rounded-lg text-muted hover:bg-soft">
                    <X className="w-4 h-4" aria-hidden="true" />
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="col-span-2">
                    <label htmlFor={`dsr-ex-a${i}`} className="block text-xs text-muted mb-1">{t(l.kind === 'revolving' ? 'ex.limit' : 'ex.amount')}</label>
                    <input id={`dsr-ex-a${i}`} type="text" inputMode="numeric" value={l.amount ? l.amount.toLocaleString('ko-KR') : ''} onChange={(e) => updEx(i, { amount: Math.min(parseNum(e.target.value), 100 * EOK) })} className="ui-field w-full px-3 py-2 text-sm tabular-nums" />
                  </div>
                  <div>
                    <label htmlFor={`dsr-ex-r${i}`} className="block text-xs text-muted mb-1">{t('ex.rate')}</label>
                    <input id={`dsr-ex-r${i}`} type="number" inputMode="decimal" step="0.1" min="0" max="30" value={l.rate} onChange={(e) => updEx(i, { rate: Math.min(30, Math.max(0, parseFloat(e.target.value) || 0)) })} className="ui-field w-full px-3 py-2 text-sm tabular-nums" />
                  </div>
                  {(l.kind === 'mortgage' || l.kind === 'installment') && (
                    <div>
                      <label htmlFor={`dsr-ex-y${i}`} className="block text-xs text-muted mb-1">{t('ex.years')}</label>
                      <input id={`dsr-ex-y${i}`} type="number" inputMode="numeric" min="1" max="50" value={l.years} onChange={(e) => updEx(i, { years: Math.min(50, Math.max(1, parseInt(e.target.value) || 1)) })} className="ui-field w-full px-3 py-2 text-sm tabular-nums" />
                    </div>
                  )}
                  {l.kind === 'mortgage' && (
                    <select aria-label={t('form.method')} value={l.method ?? 'equalPayment'} onChange={(e) => updEx(i, { method: e.target.value as Method })} className="ui-field col-span-2 px-3 py-2 text-sm">
                      {METHODS.map((m) => <option key={m} value={m}>{t(`form.methods.${m}`)}</option>)}
                    </select>
                  )}
                </div>
                {l.kind === 'jeonse' && (
                  <label className="flex items-start gap-2 text-xs text-body">
                    <input type="checkbox" checked={!!l.counted} onChange={(e) => updEx(i, { counted: e.target.checked })} className="mt-0.5 w-4 h-4 accent-[var(--primary)]" />
                    {t('ex.jeonseCounted')}
                  </label>
                )}
                <p className="text-xs text-muted flex justify-between gap-2">
                  <span>{t(`ex.basis.${l.kind}`)}</span>
                  <span className="tabular-nums text-body shrink-0">{t('ex.annual', { amount: eokMan(annualRepay(l)) })}</span>
                </p>
              </div>
            ))}
            {ex.length > 0 && <p className="text-xs text-muted">{t('ex.stressTip')}</p>}
          </div>
        </div>

        {/* 결과 */}
        <div className="lg:col-span-2 space-y-6">
          <div id="dsr-calculator-result" className="ui-card p-6 space-y-5 scroll-mt-20">
            <div aria-live="polite">
              <p className="text-sm text-muted">{t('res.limitLabel', { sector: sectorLabel, kind: kindLabel })}</p>
              {limit > 0 ? (
                <>
                  <p className="text-3xl font-bold text-fg tabular-nums mt-1">{eokMan(limit)}{won}</p>
                  <p className="text-sm text-sub mt-1">
                    {t('res.stressSub', { add: rateStr(addAtLimit), rate: rateStr(rate + addAtLimit) })}
                    {limitPlain > limit && <span className="text-muted"> · {t('res.noStress', { amount: eokMan(limitPlain), diff: eokMan(limitPlain - limit) })}</span>}
                  </p>
                </>
              ) : (
                <p className="text-lg font-semibold text-amber-700 dark:text-amber-400 mt-1">{t('res.noRoom', { cap })}</p>
              )}
            </div>

            {regCap !== null && limit > regCap && (
              <p className="bg-amber-50 text-amber-800 dark:bg-amber-900/20 dark:text-amber-300 rounded-2xl p-4 text-sm">
                {t(kind === 'credit' ? 'res.regCapCredit' : 'res.regCapMortgage', { amount: eokMan(regCap) })}
              </p>
            )}

            {/* DSR 게이지 */}
            <div className="space-y-3">
              {[
                { k: 'now', label: t('res.dsrNow'), v: dsrNow },
                { k: 'with', label: t('res.dsrWith', { amount: eokMan(amount), kind: kindLabel }), v: dsrWith },
              ].map((g) => (
                <div key={g.k}>
                  <div className="flex items-baseline justify-between mb-1.5">
                    <span className="text-sm text-body">{g.label}</span>
                    <span className={`inline-flex items-center gap-1 text-lg font-bold tabular-nums ${g.v > cap ? 'text-amber-700 dark:text-amber-400' : 'text-fg'}`}>
                      {g.v > cap && <><AlertTriangle className="w-4 h-4" aria-hidden="true" /><span className="sr-only">{t('a11y.overCap', { cap })}</span></>}
                      {pct(g.v)}
                    </span>
                  </div>
                  <div className="relative h-3 bg-track rounded-full overflow-hidden" aria-hidden="true">
                    <div className={`h-full rounded-full ${g.v > cap ? 'bg-amber-500' : 'bg-primary'}`} style={{ width: `${Math.min(100, g.v)}%` }} />
                    <div className="absolute top-0 h-3 w-0.5 bg-fg" style={{ left: `${cap}%` }} aria-hidden />
                  </div>
                </div>
              ))}
              <p className="text-xs text-muted">
                {t(dsrWith > cap ? 'res.over' : 'res.under', { cap })} · {t('res.plainLine', { pct: pct(dsrWithPlain) })}
              </p>
              {totalDebt <= DSR_APPLY_OVER && <p className="text-xs text-muted">{t('res.notApplied')}</p>}
            </div>

            <ShareResult
              card={{
                tool: t('title'),
                label: t('share.label', { income: eokMan(income), sector: sectorLabel, kind: kindLabel }),
                headline: `${eokMan(limit)}${won}`,
                sub: t('res.stressSub', { add: rateStr(addAtLimit), rate: rateStr(rate + addAtLimit) }),
                rows: [
                  { label: t('res.dsrNow'), value: pct(dsrNow) },
                  { label: t('cmp.plain'), value: `${eokMan(limitPlain)}${won}` },
                  { label: t('bd.existing'), value: `${eokMan(exAnnual)}${won}` },
                ],
              }}
              text={t('share.text', { income: eokMan(income), kind: kindLabel, amount: eokMan(limit) })}
            />
          </div>

          {/* 은행 vs 2금융권 · 금리 유형 */}
          <div className="ui-card p-6 space-y-4">
            <div>
              <h2 className="text-lg font-semibold text-fg">{t('cmp.title')}</h2>
              <p className="text-sm text-muted mt-1">{t('cmp.desc')}</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-line text-muted">
                    <th scope="col" className="text-left font-medium py-2">{t('cmp.sector')}</th>
                    <th scope="col" className="text-right font-medium py-2">{t('cmp.plain')}</th>
                    <th scope="col" className="text-right font-medium py-2">{t('cmp.stress')}</th>
                  </tr>
                </thead>
                <tbody>
                  {compare.map((c) => (
                    <tr key={c.s} className={`border-b border-line ${c.s === sector ? 'bg-primary-soft' : ''}`}>
                      <td className={`py-2.5 pl-1 ${c.s === sector ? 'text-primary font-semibold' : 'text-body'}`}>{t(`form.sectors.${c.s}`)}{c.s === sector && <span className="sr-only"> ({t('a11y.selected')})</span>}</td>
                      <td className="py-2.5 text-right tabular-nums text-sub">{eokMan(c.plain)}{won}</td>
                      <td className="py-2.5 pr-1 text-right tabular-nums font-semibold text-fg">{eokMan(c.stress)}{won}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <h3 className="font-semibold text-fg pt-2">{t('rt.title')}</h3>
            <div className={`grid grid-cols-2 gap-3 ${kind === 'mortgage' ? 'sm:grid-cols-4' : ''}`}>
              {byRateType.map((b) => (
                <button key={b.rt} type="button" onClick={() => setRateType(b.rt)} aria-pressed={b.rt === rateType} className={`text-left rounded-2xl p-4 ${b.rt === rateType ? 'bg-primary-soft' : 'bg-subtle hover:bg-soft'}`}>
                  <p className={`text-xs ${b.rt === rateType ? 'text-primary' : 'text-muted'}`}>{t(`form.rateTypes.${b.rt}`)} · +{rateStr(b.add)}%p</p>
                  <p className={`text-lg font-bold tabular-nums mt-1 ${b.rt === rateType ? 'text-primary' : 'text-fg'}`}>{eokMan(b.limit)}{won}</p>
                </button>
              ))}
            </div>
            <p className="text-xs text-faint">{t(kind === 'credit' ? 'rt.noteCredit' : 'rt.note', { fy: fixedYears, years })}</p>
          </div>

          {/* 연소득별 한도 */}
          <div className="ui-card p-6">
            <h2 className="text-lg font-semibold text-fg">{t('inc.title')}</h2>
            <p className="text-sm text-muted mt-1">{t('inc.desc', { sector: sectorLabel })}</p>
            <div className="h-64 mt-4" role="img" aria-label={t('a11y.chart', { income: `${eokMan(income)}${won}`, limit: `${eokMan(limit)}${won}`, plain: `${eokMan(limitPlain)}${won}` })}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chart} margin={{ top: 16, right: 12, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" />
                  <XAxis dataKey="inc" type="number" domain={[2000, 20000]} tickFormatter={(v: number) => eokMan(v * MAN)} tick={{ fontSize: 11, fill: 'var(--muted)' }} stroke="var(--line)" />
                  <YAxis tickFormatter={(v: number) => `${+v.toFixed(1)}억`} tick={{ fontSize: 11, fill: 'var(--muted)' }} width={48} stroke="var(--line)" />
                  <Tooltip
                    labelFormatter={(v) => `${t('form.income')} ${eokMan(Number(v ?? 0) * MAN)}${won}`}
                    formatter={(v, name) => [`${eokMan(Number(v ?? 0) * EOK)}${won}`, name === 'stress' ? t('cmp.stress') : t('cmp.plain')]}
                  />
                  <ReferenceLine x={income / MAN} stroke="var(--fg)" strokeDasharray="2 3" label={{ value: t('inc.now'), position: 'insideTopRight', fontSize: 10, fill: 'var(--fg)' }} />
                  <Line type="monotone" dataKey="plain" stroke="var(--faint)" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="stress" stroke="var(--primary)" strokeWidth={2.5} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* 연간 원리금 내역 */}
          <div className="ui-card p-6 space-y-3">
            <h2 className="text-lg font-semibold text-fg">{t('bd.title')}</h2>
            <div className="divide-y divide-line border-y border-line">
              {ex.map((l, i) => (
                <div key={i} className="flex items-center justify-between py-2.5 text-sm">
                  <span className="text-body">{t(`ex.kinds.${l.kind}`)} {eokMan(l.amount)}{won}</span>
                  <span className="tabular-nums text-fg">{Math.round(annualRepay(l)).toLocaleString('ko-KR')}{won}</span>
                </div>
              ))}
              <div className="flex items-center justify-between py-2.5 text-sm">
                <span className="text-body">{t('bd.newLoan', { kind: kindLabel, amount: eokMan(amount), rate: rateStr(rate + withLoan.add) })}</span>
                <span className="tabular-nums text-fg">{Math.round(withLoan.annual).toLocaleString('ko-KR')}{won}</span>
              </div>
              <div className="flex items-center justify-between py-2.5 text-sm font-semibold">
                <span className="text-fg">{t('bd.total')}</span>
                <span className="tabular-nums text-fg">{Math.round(exAnnual + withLoan.annual).toLocaleString('ko-KR')}{won}</span>
              </div>
            </div>
            <p className="text-sm text-sub tabular-nums">{t('bd.formula', { annual: eokMan(exAnnual + withLoan.annual), income: eokMan(income), pct: pct(dsrWith) })}</p>
          </div>

          <p className="text-xs text-faint">{t('disclaimer.text')}</p>
        </div>
      </div>

      {/* 가이드 */}
      <div className="ui-card p-6 space-y-6">
        <h2 className="text-xl font-semibold text-fg">{t('guide.title')}</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {(['basics', 'stress', 'calc', 'regs', 'raise', 'compare'] as const).map((sec) => (
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
              <li key={s.url}><a href={s.url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">{s.label}</a></li>
            ))}
          </ul>
          <p className="text-xs text-muted">{t('sources.asOf')}</p>
        </div>

        <div className="flex flex-wrap gap-2">
          {LINKS.map((href) => <Link key={href} href={`/${href}/`} className="ui-btn-soft px-3 py-2 text-sm">{t(`links.${href}`)}</Link>)}
        </div>
      </div>
    </div>
  )
}
