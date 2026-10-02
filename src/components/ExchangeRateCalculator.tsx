'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { ArrowUpDown, RefreshCw, ChevronRight } from 'lucide-react'
import { useTranslations } from '@/lib/i18n'
import { useSearchParams } from '@/hooks/useSearchParams'
import ShareResult from '@/components/ShareResult'
import GuideSection from '@/components/GuideSection'
import {
  CURRENCIES, CODES, BANK_KEYS, currency, krwPer, bankRates, budgetRows, parseCache,
  type RateCache,
} from '@/utils/exchangeRate'

type Side = 'f' | 'k'
type Status = 'loading' | 'live' | 'cache' | 'error'

const API = 'https://open.er-api.com/v6/latest/USD'
const CACHE_KEY = 'toolhub-fx-rates'
const QUICK = ['USD', 'JPY', 'EUR', 'CNY', 'VND', 'THB']
const PREFS = [0, 50, 80, 90, 100]
const LINKS = [
  { key: 'worldClock', href: '/world-clock' },
  { key: 'dutchPay', href: '/dutch-pay' },
  { key: 'stock', href: '/stock-calculator' },
]

const num = (s: string) => parseFloat(String(s).replace(/,/g, '')) || 0
const won = (n: number) => Math.round(n).toLocaleString('ko-KR')
const fx = (n: number, dec: number) => n.toLocaleString('ko-KR', { minimumFractionDigits: dec, maximumFractionDigits: dec })
const rate2 = (n: number) => fx(n, 2)
const isDecimal = (s: string) => /^\d*\.?\d*$/.test(s)
/** 입력 칸 서식: 콤마 + (허용 시) 소수 2자리 */
const fmtIn = (s: string, dec: boolean) => {
  let v = s.replace(/[^\d.]/g, '')
  if (!dec) v = v.replace(/\./g, '')
  const [i, ...r] = v.split('.')
  const int = i ? Number(i.slice(0, 15)).toLocaleString('ko-KR') : r.length ? '0' : ''
  return r.length ? `${int}.${r.join('').slice(0, 2)}` : int
}
const pctParam = (v: string | null, d: number) => (v !== null && v !== '' && isDecimal(v) ? v : String(d))

export default function ExchangeRateCalculator() {
  const t = useTranslations('exchangeRateCalculator')
  const sp = useSearchParams()

  // 예전 공유 링크(amount·from·to)도 복원: KRW→외화면 원화 입력, 외화→* 면 외화 입력
  const legacy = (() => {
    const from = sp.get('from'), to = sp.get('to'), amount = sp.get('amount')
    if (!amount || !isDecimal(amount)) return null
    if (from === 'KRW' && to && CODES.includes(to)) return { c: to, s: 'k' as Side, a: amount }
    if (from && CODES.includes(from)) return { c: from, s: 'f' as Side, a: amount }
    return null
  })()
  const initCode = legacy?.c ?? (CODES.includes(sp.get('c') ?? '') ? sp.get('c')! : 'USD')
  const initCur = currency(initCode)

  const [code, setCode] = useState(initCode)
  const [side, setSide] = useState<Side>(() => legacy?.s ?? (sp.get('s') === 'k' ? 'k' : 'f'))
  const [amtText, setAmtText] = useState(() => {
    const a = legacy?.a ?? sp.get('a')
    const s = legacy?.s ?? (sp.get('s') === 'k' ? 'k' : 'f')
    return a && isDecimal(a) ? fmtIn(a, s === 'f' && initCur.dec > 0) : s === 'k' ? '1,000,000' : '100'
  })
  const [cashText, setCashText] = useState(() => pctParam(sp.get('cs'), initCur.cash))
  const [wireText, setWireText] = useState(() => pctParam(sp.get('ws'), initCur.wire))
  const [prefText, setPrefText] = useState(() => pctParam(sp.get('p'), 90))
  const [budgetText, setBudgetText] = useState(() => fmtIn(sp.get('b') && isDecimal(sp.get('b')!) ? sp.get('b')! : '1000000', false))
  const [data, setData] = useState<RateCache | null>(null)
  const [status, setStatus] = useState<Status>('loading')

  const load = useCallback(async () => {
    setStatus('loading')
    try {
      const res = await fetch(API)
      const j = await res.json()
      if (j?.result !== 'success' || !(j.rates?.KRW > 0)) throw new Error('bad response')
      const next: RateCache = { rates: j.rates, updated: j.time_last_update_unix }
      setData(next)
      setStatus('live')
      try { localStorage.setItem(CACHE_KEY, JSON.stringify(next)) } catch { /* 저장 불가: 무시 */ }
    } catch {
      let cached: RateCache | null = null
      try { cached = parseCache(localStorage.getItem(CACHE_KEY)) } catch { /* 접근 불가 */ }
      setData((d) => d ?? cached)
      setStatus(cached ? 'cache' : 'error')
    }
  }, [])

  useEffect(() => {
    // 캐시를 먼저 보여 주고 최신 값으로 교체
    try {
      const cached = parseCache(localStorage.getItem(CACHE_KEY))
      if (cached) setData(cached)
    } catch { /* 접근 불가 */ }
    load()
  }, [load])

  const cur = currency(code)
  const fDec = cur.dec > 0
  const cash = Math.min(50, num(cashText))
  const wire = Math.min(50, num(wireText))
  const pref = Math.min(100, num(prefText))
  const budget = num(budgetText)
  const base = data ? krwPer(data.rates, code) : null
  const amount = num(amtText)
  const foreign = side === 'f' ? amount : base ? amount / base : 0
  const krw = side === 'k' ? amount : base ? amount * base : 0
  const r0 = base ? bankRates(base, cash, wire, 0) : null
  const rp = base ? bankRates(base, cash, wire, pref) : null
  const unitLabel = cur.unit === 100 ? `100 ${code}` : `1 ${code}`
  const name = t(`cur.${code}`)
  const updatedAt = data
    ? new Intl.DateTimeFormat('ko-KR', { timeZone: 'Asia/Seoul', dateStyle: 'medium', timeStyle: 'short' }).format(new Date(data.updated * 1000))
    : ''

  useEffect(() => {
    const p = new URLSearchParams()
    p.set('c', code); p.set('a', String(amount))
    if (side === 'k') p.set('s', 'k')
    if (num(cashText) !== cur.cash) p.set('cs', cashText)
    if (num(wireText) !== cur.wire) p.set('ws', wireText)
    if (pref !== 90) p.set('p', prefText)
    if (budget !== 1_000_000) p.set('b', String(budget))
    const id = setTimeout(() => window.history.replaceState(null, '', `${window.location.pathname}?${p}`), 300)
    return () => clearTimeout(id)
  }, [code, amount, side, cashText, wireText, prefText, pref, budget, cur.cash, cur.wire])

  const pick = (c: string) => {
    if (c === code) return
    const next = currency(c)
    // 외화 입력 중이면 소수 자리 맞춤 (엔·동 → 정수)
    if (side === 'f' && !next.dec) setAmtText(fmtIn(String(Math.round(amount)), false))
    setCode(c)
    setCashText(String(next.cash))
    setWireText(String(next.wire))
  }
  const editForeign = (s: string) => { setSide('f'); setAmtText(fmtIn(s, fDec)) }
  const editKrw = (s: string) => { setSide('k'); setAmtText(fmtIn(s, false)) }
  const swap = () => {
    if (side === 'f') { setSide('k'); setAmtText(won(krw)) } else { setSide('f'); setAmtText(fx(foreign, cur.dec)) }
  }

  const seg = (on: boolean) =>
    `min-h-10 px-2 py-2 rounded-lg text-sm font-medium transition-colors ${on ? 'bg-primary text-white' : 'bg-soft text-body hover:bg-subtle'}`
  const percent = (key: string, value: string, set: (s: string) => void, label: string) => (
    <div>
      <label htmlFor={`fx-${key}`} className="block text-sm font-medium text-body mb-2">{label}</label>
      <div className="relative">
        <input id={`fx-${key}`} inputMode="decimal" value={value} onChange={(e) => isDecimal(e.target.value) && e.target.value.length <= 5 && set(e.target.value)}
          aria-describedby={`fx-${key}-u`}
          className="ui-field w-full px-4 py-3 pr-10 font-semibold tabular-nums" />
        <span id={`fx-${key}-u`} className="absolute right-4 top-1/2 -translate-y-1/2 text-sub">%</span>
      </div>
    </div>
  )
  /** 행 금액: 외화 입력 → 원화, 원화 입력 → 외화 */
  const amountAt = (rate: number) => (side === 'f' ? `${won(foreign * rate)}${t('won')}` : `${fx(krw / rate, cur.dec)} ${code}`)
  const headline = side === 'f' ? `${won(krw)}${t('won')}` : `${fx(foreign, cur.dec)} ${code}`
  const inputLabel = side === 'f' ? `${cur.flag} ${fx(foreign, cur.dec)} ${code}` : `${won(krw)}${t('won')}`
  const saved = r0 && rp ? (side === 'f' ? foreign * (r0.cashBuy - rp.cashBuy) : krw / rp.cashBuy - krw / r0.cashBuy) : 0

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-fg">{t('title')}</h1>
        <p className="text-sm text-muted mt-1">{t('description')}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 입력 */}
        <div className="ui-card p-6 space-y-5 self-start">
          <div>
            <span id="fx-cur" className="block text-sm font-medium text-body mb-2">{t('in.currency')}</span>
            <div className="grid grid-cols-3 gap-2 mb-2" role="group" aria-labelledby="fx-cur">
              {QUICK.map((c) => (
                <button key={c} type="button" onClick={() => pick(c)} aria-pressed={code === c} aria-label={`${c} ${t(`cur.${c}`)}`} className={seg(code === c)}>
                  <span aria-hidden="true">{currency(c).flag}</span> {c}
                </button>
              ))}
            </div>
            <select value={code} onChange={(e) => pick(e.target.value)} aria-label={t('in.currency')} className="ui-field w-full px-4 py-3">
              {CURRENCIES.map((c) => <option key={c.code} value={c.code}>{c.flag} {c.code} · {t(`cur.${c.code}`)}</option>)}
            </select>
          </div>

          <div>
            <label htmlFor="fx-foreign" className="block text-sm font-medium text-body mb-2">{t('in.foreign', { name })}</label>
            <div className="relative">
              <input id="fx-foreign" inputMode={fDec ? 'decimal' : 'numeric'} aria-describedby="fx-foreign-u" value={side === 'f' ? amtText : base ? fx(foreign, cur.dec) : ''} onChange={(e) => editForeign(e.target.value)}
                onFocus={() => side === 'k' && base && editForeign(fx(foreign, cur.dec))}
                className="ui-field w-full px-4 py-3 pr-16 text-lg font-semibold tabular-nums" />
              <span id="fx-foreign-u" className="absolute right-4 top-1/2 -translate-y-1/2 text-sub">{code}</span>
            </div>
          </div>
          <div className="flex justify-center -my-2">
            <button type="button" onClick={swap} aria-label={t('in.swap')} title={t('in.swap')} className="w-10 h-10 inline-flex items-center justify-center rounded-full bg-soft hover:bg-subtle text-body">
              <ArrowUpDown className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>
          <div>
            <label htmlFor="fx-krw" className="block text-sm font-medium text-body mb-2">{t('in.krw')}</label>
            <div className="relative">
              <input id="fx-krw" inputMode="numeric" aria-describedby="fx-krw-u fx-krw-h" value={side === 'k' ? amtText : base ? won(krw) : ''} onChange={(e) => editKrw(e.target.value)}
                onFocus={() => side === 'f' && base && editKrw(won(krw))}
                className="ui-field w-full px-4 py-3 pr-10 text-lg font-semibold tabular-nums" />
              <span id="fx-krw-u" className="absolute right-4 top-1/2 -translate-y-1/2 text-sub">{t('won')}</span>
            </div>
            <span id="fx-krw-h" className="block text-xs text-muted mt-1">{t('in.bothHint')}</span>
          </div>

          <div className="pt-4 border-t border-line space-y-4">
            <div>
              <span id="fx-pref-l" className="block text-sm font-medium text-body mb-2">{t('in.pref')}</span>
              <div className="grid grid-cols-5 gap-1.5 mb-2" role="group" aria-labelledby="fx-pref-l">
                {PREFS.map((v) => (
                  <button key={v} type="button" onClick={() => setPrefText(String(v))} aria-pressed={pref === v} className={seg(pref === v)}>{v}%</button>
                ))}
              </div>
              {percent('pref', prefText, setPrefText, t('in.prefCustom'))}
            </div>
            <div className="grid grid-cols-2 gap-3">
              {percent('cash', cashText, setCashText, t('in.cash'))}
              {percent('wire', wireText, setWireText, t('in.wire'))}
            </div>
            <p className="text-xs text-muted leading-relaxed">{t('in.spreadHint', { code, cash: cur.cash, wire: cur.wire })}</p>
          </div>
        </div>

        {/* 결과 */}
        <div className="lg:col-span-2 space-y-6">
          <div className="ui-card p-6">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted">
              <span>
                {data ? t('src.updated', { time: updatedAt }) : t('src.loading')}
                {' · '}
                <a href="https://www.exchangerate-api.com" target="_blank" rel="noopener noreferrer" className="underline hover:text-fg">{t('src.by')}</a>
              </span>
              <button type="button" onClick={load} disabled={status === 'loading'} aria-busy={status === 'loading'} className="min-h-10 inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-soft hover:bg-subtle text-body disabled:opacity-50">
                <RefreshCw className={`w-3.5 h-3.5 ${status === 'loading' ? 'animate-spin' : ''}`} aria-hidden="true" />{t('src.refresh')}
              </button>
            </div>
            {status === 'cache' && <p role="status" className="mt-3 text-sm rounded-xl p-3 bg-amber-50 text-amber-800 dark:bg-amber-900/20 dark:text-amber-300">{t('src.cached', { time: updatedAt })}</p>}
            {status === 'error' && !data && <p role="alert" className="mt-3 text-sm rounded-xl p-3 bg-amber-50 text-amber-800 dark:bg-amber-900/20 dark:text-amber-300">{t('src.error')}</p>}

            {base && r0 && rp ? (
              <>
                <p className="text-sm text-sub mt-5">{t('res.label', { input: inputLabel })}</p>
                <p className="text-3xl sm:text-4xl font-bold text-fg tabular-nums mt-1 break-all" aria-live="polite">{headline}</p>
                <p className="text-sm text-muted mt-1 tabular-nums">{t('res.base', { unit: unitLabel, rate: rate2(base * cur.unit) })}</p>

                <dl className="grid grid-cols-2 gap-3 mt-5">
                  {(['cashBuy', 'wireSend'] as const).map((k) => (
                    <div key={k} className={`rounded-xl p-3 ${k === 'cashBuy' ? 'bg-primary-soft' : 'bg-subtle'}`}>
                      <dt className={`text-xs ${k === 'cashBuy' ? 'text-primary font-medium' : 'text-sub'}`}>{t(`bank.${k}`)} · {t('res.prefShort', { p: pref })}</dt>
                      <dd className="text-base sm:text-lg font-semibold text-fg tabular-nums mt-0.5">{amountAt(rp[k])}</dd>
                      <dd className="text-xs text-muted tabular-nums">{unitLabel} = {rate2(rp[k] * cur.unit)}{t('won')}</dd>
                    </div>
                  ))}
                </dl>
                {pref > 0 && saved > 0 && (
                  <p className="text-sm text-body mt-3">
                    {side === 'f'
                      ? t('res.savedKrw', { p: pref, v: won(saved) })
                      : t('res.savedForeign', { p: pref, v: `${fx(saved, cur.dec)} ${code}` })}
                  </p>
                )}

                <ShareResult className="mt-5" fileName="exchange-rate"
                  card={{
                    tool: t('title'),
                    label: inputLabel,
                    headline,
                    sub: t('share.sub', { time: updatedAt }),
                    rows: [
                      { label: t('res.baseShort', { unit: unitLabel }), value: `${rate2(base * cur.unit)}${t('won')}` },
                      { label: `${t('bank.cashBuy')} (${t('res.prefShort', { p: pref })})`, value: amountAt(rp.cashBuy) },
                      { label: `${t('bank.cashSell')} (${t('res.prefShort', { p: pref })})`, value: amountAt(rp.cashSell) },
                      { label: `${t('bank.wireSend')} (${t('res.prefShort', { p: pref })})`, value: amountAt(rp.wireSend) },
                    ],
                  }} />
              </>
            ) : status === 'loading' ? (
              <p className="text-sm text-muted mt-5">{t('src.loading')}</p>
            ) : data ? (
              <p className="text-sm text-muted mt-5">{t('src.noCurrency', { code })}</p>
            ) : null}
          </div>

          {/* 은행 환율별 실제 금액 */}
          {base && r0 && rp && (
            <div className="ui-card p-6">
              <h2 className="text-lg font-semibold text-fg">{t('bank.title')}</h2>
              <p className="text-sm text-muted mt-1">{t(side === 'f' ? 'bank.introF' : 'bank.introK', { input: inputLabel })}</p>
              <div className="overflow-x-auto mt-4 -mx-2">
                <table className="w-full min-w-[560px] text-sm tabular-nums">
                  <thead>
                    <tr className="text-left text-sub border-b border-line">
                      <th scope="col" className="py-2 px-2 font-medium">{t('bank.kind')}</th>
                      <th scope="col" className="py-2 px-2 font-medium text-right">{t('bank.rate', { unit: unitLabel })}</th>
                      <th scope="col" className="py-2 px-2 font-medium text-right">{t('bank.noPref')}</th>
                      <th scope="col" className="py-2 px-2 font-medium text-right text-primary">{t('res.prefShort', { p: pref })}</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-line">
                      <td className="py-2.5 px-2 text-fg font-medium">{t('bank.base')}<span className="block text-xs text-muted font-normal">{t('bank.baseDesc')}</span></td>
                      <td className="py-2.5 px-2 text-right text-fg">{rate2(base * cur.unit)}</td>
                      <td className="py-2.5 px-2 text-right text-fg" colSpan={2}>{side === 'f' ? `${won(krw)}${t('won')}` : `${fx(foreign, cur.dec)} ${code}`}</td>
                    </tr>
                    {BANK_KEYS.map((k) => (
                      <tr key={k} className="border-b border-line last:border-0">
                        <td className="py-2.5 px-2 text-fg font-medium">{t(`bank.${k}`)}<span className="block text-xs text-muted font-normal">{t(`bank.desc.${side}.${k}`)}</span></td>
                        <td className="py-2.5 px-2 text-right text-body">{rate2(r0[k] * cur.unit)}<span className="block text-xs text-primary"><span className="sr-only">{t('res.prefShort', { p: pref })} </span>{rate2(rp[k] * cur.unit)}</span></td>
                        <td className="py-2.5 px-2 text-right text-body">{amountAt(r0[k])}</td>
                        <td className="py-2.5 px-2 text-right font-semibold text-fg">{amountAt(rp[k])}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-muted mt-3 leading-relaxed">{t('bank.note', { cash, wire })}</p>
            </div>
          )}
        </div>
      </div>

      {/* 여행 예산: 원화 → 여러 통화 */}
      {data && (
        <div className="ui-card p-6">
          <h2 className="text-lg font-semibold text-fg">{t('budget.title')}</h2>
          <p className="text-sm text-muted mt-1">{t('budget.desc', { p: pref })}</p>
          <div className="mt-4 max-w-xs">
            <label htmlFor="fx-budget" className="block text-sm font-medium text-body mb-2">{t('budget.input')}</label>
            <div className="relative">
              <input id="fx-budget" inputMode="numeric" value={budgetText} onChange={(e) => setBudgetText(fmtIn(e.target.value, false))}
                aria-describedby="fx-budget-u"
                className="ui-field w-full px-4 py-3 pr-10 text-lg font-semibold tabular-nums" />
              <span id="fx-budget-u" className="absolute right-4 top-1/2 -translate-y-1/2 text-sub">{t('won')}</span>
            </div>
          </div>
          <div className="overflow-x-auto mt-4 -mx-2">
            <table className="w-full min-w-[520px] text-sm tabular-nums">
              <thead>
                <tr className="text-left text-sub border-b border-line">
                  <th scope="col" className="py-2 px-2 font-medium">{t('budget.currency')}</th>
                  <th scope="col" className="py-2 px-2 font-medium text-right">{t('budget.base')}</th>
                  <th scope="col" className="py-2 px-2 font-medium text-right">{t('budget.mid')}</th>
                  <th scope="col" className="py-2 px-2 font-medium text-right text-primary">{t('budget.cash', { p: pref })}</th>
                </tr>
              </thead>
              <tbody>
                {budgetRows(budget, data.rates, pref, { code, cash }).map((r) => {
                  const c = currency(r.code)
                  return (
                    <tr key={r.code} onClick={() => pick(r.code)}
                      className={`border-b border-line last:border-0 cursor-pointer ${r.code === code ? 'bg-primary-soft' : 'hover:bg-subtle'}`}>
                      <td className="py-2 px-2 text-fg whitespace-nowrap">
                        {/* 행 클릭은 마우스용, 키보드·스크린리더는 이 버튼으로 통화 선택 */}
                        <button type="button" onClick={(e) => { e.stopPropagation(); pick(r.code) }} aria-pressed={r.code === code} className="min-h-10 text-left">
                          <span aria-hidden="true">{c.flag}</span> {r.code} <span className="text-muted">{t(`cur.${r.code}`)}</span>
                        </button>
                      </td>
                      <td className="py-2 px-2 text-right text-body whitespace-nowrap">{rate2(r.base * c.unit)}{t('won')}{c.unit === 100 && <span className="text-xs text-muted"> /100</span>}</td>
                      <td className="py-2 px-2 text-right text-body">{fx(r.mid, c.dec)}</td>
                      <td className="py-2 px-2 text-right font-semibold text-fg">{fx(r.cash, c.dec)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-muted mt-3 leading-relaxed">{t('budget.note')}</p>
        </div>
      )}

      <div className="bg-subtle rounded-2xl p-5 text-sm text-sub leading-relaxed">{t('disclaimer')}</div>

      <div className="ui-card p-6">
        <h2 className="text-lg font-semibold text-fg mb-3">{t('links.title')}</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {LINKS.map((l) => (
            <Link key={l.key} href={l.href} className="flex items-center justify-between rounded-xl bg-subtle hover:bg-soft px-4 py-3 text-sm text-body">
              {t(`links.${l.key}`)}<ChevronRight className="w-4 h-4 text-faint" aria-hidden="true" />
            </Link>
          ))}
        </div>
      </div>

      <GuideSection namespace="exchangeRateCalculator" />
    </div>
  )
}
