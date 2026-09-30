'use client'

/**
 * PercentCalculator — 자주 묻는 퍼센트 질문 8가지를 카드로 동시에 실시간 계산
 * Translation namespace: percentCalculator
 * 계산 로직: src/utils/percent.ts (회귀: node scripts/check-percent.ts)
 */

import { useState, useMemo, useEffect, useRef, useCallback, type ReactNode } from 'react'
import Link from 'next/link'
import { useSearchParams } from '@/hooks/useSearchParams'
import { useTranslations } from '@/lib/i18n'
import { Copy, Check, Plus, X, RotateCcw, ArrowRight } from 'lucide-react'
import GuideSection from '@/components/GuideSection'
import {
  parseNum, parseQuery, round, fmt, fmtKo, percentOf, ratio, change, discount, originalPrice, chainRate, vatSplit,
  type Query,
} from '@/utils/percent'

type F = 'a' | 'b' | 'p' | 'w' | 'f' | 't' | 'dp' | 'dr' | 'rs' | 'rr' | 'cp' | 'x' | 'y' | 'v'
type CardId = 'of' | 'ratio' | 'change' | 'discount' | 'reverse' | 'chain' | 'pp' | 'vat'

const DEF: Record<F, string> = {
  a: '50000', b: '15', p: '300', w: '1200', f: '30000', t: '40000', dp: '89000', dr: '30',
  rs: '62300', rr: '30', cp: '100000', x: '3', y: '5', v: '110000',
}
const DEF_CHAIN = ['30', '20']
const DEF_DEC = 2
const KEYS = Object.keys(DEF) as F[]
const QUICK = [5, 10, 15, 20, 30, 50]

interface Res {
  main: string
  copy: string
  formula: string
  sub?: ReactNode
}
type Out = Res | { error: string }

const seg = (on: boolean) =>
  `px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${on ? 'bg-primary text-white' : 'bg-soft text-body hover:bg-subtle'}`
const raw = (n: number) => fmt(n, 10)
const signed = (s: string, n: number) => (n > 0 ? `+${s}` : s)

function Field({ id, label, value, onChange, suffix }: { id: string; label: string; value: string; onChange: (v: string) => void; suffix?: string }) {
  return (
    <div className="min-w-0 flex-1">
      <label htmlFor={id} className="block text-xs font-medium text-sub mb-1">{label}</label>
      <div className="relative">
        <input
          id={id} type="text" inputMode="decimal" autoComplete="off" value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`ui-field px-3 py-2.5 text-right tabular-nums ${suffix ? 'pr-8' : ''}`}
        />
        {suffix && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-faint">{suffix}</span>}
      </div>
    </div>
  )
}

export default function PercentCalculator() {
  const t = useTranslations('percentCalculator')
  const searchParams = useSearchParams()
  const ready = useRef(false)

  const [v, setV] = useState<Record<F, string>>(DEF)
  const [chain, setChain] = useState<string[]>(DEF_CHAIN)
  const [dec, setDec] = useState(DEF_DEC)
  const [ko, setKo] = useState(false)
  const [showFormula, setShowFormula] = useState(true)
  const [q, setQ] = useState('')
  const [hit, setHit] = useState<CardId | null>(null)
  const [copied, setCopied] = useState<string | null>(null)

  const set = (k: F) => (val: string) => setV((s) => ({ ...s, [k]: val }))

  // URL → 상태 (한 번)
  useEffect(() => {
    if (ready.current) return
    const next = { ...DEF }
    for (const k of KEYS) { const g = searchParams.get(k); if (g !== null) next[k] = g }
    setV(next)
    const c = searchParams.get('c')
    if (c) setChain(c.split(',').slice(0, 5))
    const d = Number(searchParams.get('d'))
    if (searchParams.get('d') !== null && d >= 0 && d <= 4) setDec(Math.trunc(d))
    setKo(searchParams.get('k') === '1')
    ready.current = true
  }, [searchParams])

  // 상태 → URL (기본값과 다른 것만)
  useEffect(() => {
    if (!ready.current) return
    const p = new URLSearchParams()
    for (const k of KEYS) if (v[k] !== DEF[k]) p.set(k, v[k])
    if (chain.join(',') !== DEF_CHAIN.join(',')) p.set('c', chain.join(','))
    if (dec !== DEF_DEC) p.set('d', String(dec))
    if (ko) p.set('k', '1')
    const qs = p.toString()
    window.history.replaceState(null, '', `${window.location.pathname}${qs ? `?${qs}` : ''}`)
  }, [v, chain, dec, ko])

  const copy = useCallback(async (text: string, id: string) => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text)
      } else {
        const ta = document.createElement('textarea')
        ta.value = text
        ta.style.position = 'fixed'
        ta.style.left = '-999999px'
        document.body.appendChild(ta)
        ta.select()
        document.execCommand('copy')
        document.body.removeChild(ta)
      }
    } catch { /* 복사 실패해도 UI는 그대로 */ }
    setCopied(id)
    setTimeout(() => setCopied(null), 1500)
  }, [])

  const results = useMemo<Record<CardId, Out>>(() => {
    const num = (x: number) => (ko ? fmtKo(x, dec) : fmt(x, dec))
    const pct = (x: number) => `${fmt(x, dec)}%`
    const cp = (x: number) => String(round(x, dec))
    const E = (k: string) => ({ error: t(`errors.${k}`) })
    // 필수 입력 → 숫자 배열 | 오류
    const need = (...ks: F[]): number[] | { error: string } => {
      if (ks.some((k) => !v[k].trim())) return E('empty')
      const ns = ks.map((k) => parseNum(v[k]))
      return ns.some((n) => n === null) ? E('invalid') : (ns as number[])
    }
    const out = {} as Record<CardId, Out>

    let r = need('a', 'b')
    if ('error' in r) out.of = r
    else {
      const [a, p] = r, x = percentOf(a, p)
      out.of = { main: num(x), copy: cp(x), formula: `${raw(a)} × ${raw(p)} ÷ 100 = ${fmt(x, dec)}` }
    }

    r = need('p', 'w')
    if ('error' in r) out.ratio = r
    else {
      const [part, whole] = r, x = ratio(part, whole)
      out.ratio = x === null ? E('zeroBase') : {
        main: pct(x), copy: cp(x), formula: `${raw(part)} ÷ ${raw(whole)} × 100 = ${pct(x)}`,
        sub: (
          <div className="h-2 bg-track rounded-full overflow-hidden" aria-hidden>
            <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${Math.min(100, Math.max(0, x))}%` }} />
          </div>
        ),
      }
    }

    r = need('f', 't')
    if ('error' in r) out.change = r
    else {
      const [from, to] = r, { pct: x, diff } = change(from, to)
      out.change = x === null ? E('zeroBase') : {
        main: signed(pct(x), x), copy: cp(x),
        formula: `(${raw(to)} − ${raw(from)}) ÷ ${raw(Math.abs(from))} × 100 = ${signed(pct(x), x)}`,
        sub: (
          <p>
            {t(x > 0 ? 'change.up' : x < 0 ? 'change.down' : 'change.same')} · {t('change.diff')} {signed(num(diff), diff)}
            {from < 0 && <span className="block text-xs text-muted mt-1">{t('change.negBase')}</span>}
          </p>
        ),
      }
    }

    r = need('dp', 'dr')
    if ('error' in r) out.discount = r
    else {
      const [price, rate] = r
      if (price < 0) out.discount = E('negative')
      else if (rate < 0 || rate > 100) out.discount = E('rateRange')
      else {
        const { sale, off } = discount(price, rate)
        out.discount = {
          main: num(sale), copy: cp(sale),
          formula: `${raw(price)} × (1 − ${raw(rate)}%) = ${fmt(sale, dec)}`,
          sub: <p>{t('discount.off')} {num(off)}</p>,
        }
      }
    }

    r = need('rs', 'rr')
    if ('error' in r) out.reverse = r
    else {
      const [sale, rate] = r
      const x = rate < 0 ? null : originalPrice(sale, rate)
      if (sale < 0) out.reverse = E('negative')
      else if (x === null) out.reverse = E(rate >= 100 ? 'rate100' : 'rateRange')
      else out.reverse = {
        main: num(x), copy: cp(x),
        formula: `${raw(sale)} ÷ (1 − ${raw(rate)}%) = ${fmt(x, dec)}`,
        sub: <p>{t('reverse.off')} {num(x - sale)}</p>,
      }
    }

    const rates = chain.map((s) => (s.trim() ? parseNum(s) : null))
    if (chain.some((s) => !s.trim())) out.chain = E('empty')
    else if (rates.some((n) => n === null)) out.chain = E('invalid')
    else if ((rates as number[]).some((n) => n < 0 || n > 100)) out.chain = E('rateRange')
    else {
      const rs = rates as number[], x = chainRate(rs)
      const sum = rs.reduce((s, n) => s + n, 0)
      const price = v.cp.trim() ? parseNum(v.cp) : null
      out.chain = {
        main: pct(x), copy: cp(x),
        formula: `1 − ${rs.map((n) => `(1 − ${raw(n)}%)`).join(' × ')} = ${pct(x)}`,
        sub: (
          <p>
            {rs.length > 1 && <>{t('chain.notSum', { sum: fmt(sum, dec) })}<br /></>}
            {price !== null && price >= 0 && <>{t('chain.final')} {num(price * (1 - x / 100))}</>}
          </p>
        ),
      }
    }

    r = need('x', 'y')
    if ('error' in r) out.pp = r
    else {
      const [x0, y0] = r, d = y0 - x0, rel = change(x0, y0).pct
      out.pp = {
        main: `${signed(fmt(d, dec), d)}%p`, copy: cp(d),
        formula: `${raw(y0)}% − ${raw(x0)}% = ${signed(fmt(d, dec), d)}%p`,
        sub: <p>{rel === null ? t('pp.relNone') : t('pp.rel', { v: signed(pct(rel), rel) })}</p>,
      }
    }

    r = need('v')
    if ('error' in r) out.vat = r
    else {
      const { supply, vat } = vatSplit(r[0])
      out.vat = {
        main: num(supply), copy: cp(supply),
        formula: `${raw(r[0])} ÷ 1.1 = ${fmt(supply, dec)}`,
        sub: <p>{t('vat.tax')} {num(vat)}</p>,
      }
    }
    return out
  }, [v, chain, dec, ko, t])

  // 한 줄 입력 → 해당 카드 입력칸에 반영
  const onQuery = (text: string) => {
    setQ(text)
    const pq: Query | null = parseQuery(text)
    if (!pq) { setHit(null); return }
    const S = (n: number) => String(n)
    const patch: Partial<Record<F, string>> =
      pq.kind === 'of' ? { a: S(pq.a), b: S(pq.p) }
      : pq.kind === 'ratio' ? { p: S(pq.part), w: S(pq.whole) }
      : pq.kind === 'change' ? { f: S(pq.from), t: S(pq.to) }
      : pq.kind === 'discount' ? { dp: S(pq.price), dr: S(pq.rate) }
      : { rs: S(pq.sale), rr: S(pq.rate) }
    setV((s) => ({ ...s, ...patch }))
    setHit(pq.kind)
  }

  const reset = () => { setV(DEF); setChain(DEF_CHAIN); setQ(''); setHit(null) }

  const card = (id: CardId, inputs: ReactNode, extra?: ReactNode) => {
    const res = results[id]
    return (
      <section key={id} className={`ui-card p-5 flex flex-col gap-4 ${hit === id ? 'ring-2 ring-primary' : ''}`} aria-labelledby={`pc-${id}`}>
        <h2 id={`pc-${id}`} className="text-base font-semibold text-fg">{t(`${id}.title`)}</h2>
        <div className="flex gap-2 items-end">{inputs}</div>
        {extra}
        <div className="bg-subtle rounded-2xl p-4 mt-auto" aria-live="polite">
          {'error' in res ? (
            <p className="text-sm text-amber-700 dark:text-amber-400 py-2">{res.error}</p>
          ) : (
            <>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-xs text-muted">{t(`${id}.result`)}</p>
                  <p className="text-3xl font-bold text-fg tabular-nums break-all">{res.main}</p>
                </div>
                <button
                  type="button" onClick={() => copy(res.copy, id)}
                  className="shrink-0 p-2 rounded-lg text-sub hover:bg-soft transition-colors"
                  aria-label={t('copy')} title={t('copy')}
                >
                  {copied === id ? <Check className="w-4 h-4 text-primary" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
              {res.sub && <div className="text-sm text-sub mt-2">{res.sub}</div>}
              {showFormula && (
                <p className="text-xs text-muted mt-2 font-mono break-all tabular-nums">{res.formula}</p>
              )}
            </>
          )}
        </div>
      </section>
    )
  }

  const chips = (k: F) => (
    <div className="flex flex-wrap gap-1.5">
      {QUICK.map((n) => (
        <button key={n} type="button" onClick={() => set(k)(String(n))} className={`${seg(parseNum(v[k]) === n)} text-xs px-2.5 py-1`}>
          {n}%
        </button>
      ))}
    </div>
  )

  const hitRes = hit ? results[hit] : null

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-fg">{t('title')}</h1>
        <p className="text-sm text-muted mt-1">{t('subtitle')}</p>
      </div>

      {/* 한 줄 입력 */}
      <div className="ui-card p-5 space-y-3">
        <label htmlFor="pc-q" className="block text-sm font-medium text-body">{t('smart.label')}</label>
        <input
          id="pc-q" type="text" value={q} onChange={(e) => onQuery(e.target.value)}
          placeholder={t('smart.placeholder')} autoComplete="off"
          className="ui-field px-4 py-3 text-base"
        />
        {q.trim() && (
          hitRes && !('error' in hitRes) ? (
            <p className="text-sm text-body flex flex-wrap items-center gap-2">
              <span className="text-muted">{t(`${hit}.title`)}</span>
              <ArrowRight className="w-4 h-4 text-faint" aria-hidden />
              <strong className="text-lg text-primary tabular-nums">{hitRes.main}</strong>
            </p>
          ) : (
            <p className="text-sm text-muted">{hitRes && 'error' in hitRes ? hitRes.error : t('smart.fail')}</p>
          )
        )}
      </div>

      {/* 표시 설정 */}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-3 text-sm">
        <div className="flex items-center gap-2" role="group" aria-label={t('settings.decimals')}>
          <span className="text-sub">{t('settings.decimals')}</span>
          {[0, 1, 2, 3, 4].map((d) => (
            <button key={d} type="button" onClick={() => setDec(d)} className={seg(dec === d)} aria-pressed={dec === d}>{d}</button>
          ))}
        </div>
        <button type="button" onClick={() => setKo(!ko)} className={seg(ko)} aria-pressed={ko}>{t('settings.koUnit')}</button>
        <button type="button" onClick={() => setShowFormula(!showFormula)} className={seg(showFormula)} aria-pressed={showFormula}>{t('settings.formula')}</button>
        <button type="button" onClick={reset} className="ml-auto inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-sub hover:bg-soft">
          <RotateCcw className="w-4 h-4" aria-hidden />{t('settings.reset')}
        </button>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {card('of', <>
          <Field id="pc-a" label={t('of.a')} value={v.a} onChange={set('a')} />
          <Field id="pc-b" label={t('of.p')} value={v.b} onChange={set('b')} suffix="%" />
        </>, chips('b'))}

        {card('ratio', <>
          <Field id="pc-p" label={t('ratio.part')} value={v.p} onChange={set('p')} />
          <Field id="pc-w" label={t('ratio.whole')} value={v.w} onChange={set('w')} />
        </>)}

        {card('change', <>
          <Field id="pc-f" label={t('change.from')} value={v.f} onChange={set('f')} />
          <Field id="pc-t" label={t('change.to')} value={v.t} onChange={set('t')} />
        </>)}

        {card('discount', <>
          <Field id="pc-dp" label={t('discount.price')} value={v.dp} onChange={set('dp')} />
          <Field id="pc-dr" label={t('discount.rate')} value={v.dr} onChange={set('dr')} suffix="%" />
        </>, chips('dr'))}

        {card('reverse', <>
          <Field id="pc-rs" label={t('reverse.sale')} value={v.rs} onChange={set('rs')} />
          <Field id="pc-rr" label={t('reverse.rate')} value={v.rr} onChange={set('rr')} suffix="%" />
        </>)}

        {card('chain', <>
          <Field id="pc-cp" label={t('chain.price')} value={v.cp} onChange={set('cp')} />
        </>, (
          <div className="space-y-2">
            {chain.map((s, i) => (
              <div key={i} className="flex items-end gap-2">
                <Field
                  id={`pc-c${i}`} label={t('chain.step', { n: i + 1 })} value={s} suffix="%"
                  onChange={(val) => setChain((c) => c.map((x, j) => (j === i ? val : x)))}
                />
                {chain.length > 1 && (
                  <button
                    type="button" onClick={() => setChain((c) => c.filter((_, j) => j !== i))}
                    className="p-2.5 rounded-lg text-sub hover:bg-soft" aria-label={t('chain.remove')}
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
            {chain.length < 5 && (
              <button type="button" onClick={() => setChain((c) => [...c, '10'])} className="ui-btn-soft px-3 py-2 text-sm">
                <Plus className="w-4 h-4" aria-hidden />{t('chain.add')}
              </button>
            )}
          </div>
        ))}

        {card('pp', <>
          <Field id="pc-x" label={t('pp.before')} value={v.x} onChange={set('x')} suffix="%" />
          <Field id="pc-y" label={t('pp.after')} value={v.y} onChange={set('y')} suffix="%" />
        </>, <p className="text-xs text-muted leading-relaxed">{t('pp.explain')}</p>)}

        {card('vat', <>
          <Field id="pc-v" label={t('vat.total')} value={v.v} onChange={set('v')} />
        </>, (
          <Link href="/vat-calculator/" className="text-sm text-primary font-medium inline-flex items-center gap-1 hover:underline">
            {t('vat.link')}<ArrowRight className="w-4 h-4" aria-hidden />
          </Link>
        ))}
      </div>

      <p className="text-xs text-muted">{t('inputHint')}</p>

      <GuideSection namespace="percentCalculator" />
    </div>
  )
}
