'use client'

import { useState, useCallback, useMemo, useEffect, useRef } from 'react'
import { useTranslations } from '@/lib/i18n'
import { useSearchParams } from '@/hooks/useSearchParams'
import { Copy, Check, X, ArrowLeftRight } from 'lucide-react'
import ShareResult from '@/components/ShareResult'
import {
  toRoman, parseRoman, parseNumber, romanParts, unicodeRoman, dateToRoman, looksNumeric, overline,
  MAX_STD, type Reason, type DateOrder,
} from '@/utils/romanNumeral'

const DEF_N = '2026'
const QUICK = ['2026', '2027', '2000', '1999', 'Ⅻ', 'XIV', 'IV', 'IX', 'XL', 'XC', 'CD', 'CM']
const SYMBOLS: [string, number][] = [
  ['I', 1], ['V', 5], ['X', 10], ['L', 50], ['C', 100], ['D', 500], ['M', 1000],
  [overline('V'), 5000], [overline('X'), 10000], [overline('L'), 50000],
]
const SEPS = [
  { id: 'dot', v: '.' }, { id: 'mid', v: ' · ' }, { id: 'dash', v: '-' }, { id: 'slash', v: '/' }, { id: 'space', v: ' ' },
] as const
const ORDERS: DateOrder[] = ['ymd', 'mdy', 'dmy']
const ONE_TO_100 = Array.from({ length: 100 }, (_, i) => i + 1)
const YEARS = Array.from({ length: 56 }, (_, i) => 1980 + i)
const UNI = [...Array.from({ length: 12 }, (_, i) => i + 1), 50, 100, 500, 1000]

const pad = (n: number) => String(n).padStart(2, '0')
const todayStr = () => { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` }

type Result =
  | { kind: 'ok'; numeric: boolean; value: number; roman: string }
  | { kind: 'nonStandard'; reason: Reason; detail: string; value: number; canonical: string; input: string }
  | { kind: 'error'; reason: Reason; detail: string }

export default function RomanNumeral() {
  const t = useTranslations('romanNumeral')
  const sp = useSearchParams()
  const topRef = useRef<HTMLDivElement>(null)

  const [input, setInput] = useState(() => sp.get('n') ?? DEF_N)
  const [date, setDate] = useState(() => sp.get('d') ?? '')
  const [order, setOrder] = useState<DateOrder>(() => (ORDERS as string[]).includes(sp.get('o') ?? '') ? sp.get('o') as DateOrder : 'ymd')
  const [sepId, setSepId] = useState(() => SEPS.find((s) => s.id === sp.get('s'))?.id ?? 'dot')
  const [table, setTable] = useState<'n' | 'y'>('n')
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const today = useRef('')

  // 날짜 기본값 = 오늘 (서버 렌더와 달라지지 않게 마운트 후)
  useEffect(() => {
    today.current = todayStr()
    setDate((d) => d || today.current)
  }, [])

  // URL 동기화 (기본값과 다른 것만)
  useEffect(() => {
    const id = setTimeout(() => {
      const p = new URLSearchParams()
      if (input.trim() && input !== DEF_N) p.set('n', input.trim())
      if (date && date !== today.current) p.set('d', date)
      if (order !== 'ymd') p.set('o', order)
      if (sepId !== 'dot') p.set('s', sepId)
      const qs = p.toString()
      window.history.replaceState(null, '', `${window.location.pathname}${qs ? `?${qs}` : ''}`)
    }, 300)
    return () => clearTimeout(id)
  }, [input, date, order, sepId])

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
    } catch { /* 권한 없음: 표시만 */ }
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }, [])

  const result = useMemo((): Result => {
    if (looksNumeric(input)) {
      const p = parseNumber(input)
      return p.ok ? { kind: 'ok', numeric: true, value: p.value, roman: toRoman(p.value) } : { kind: 'error', reason: p.reason, detail: '' }
    }
    const p = parseRoman(input)
    if (p.ok) return { kind: 'ok', numeric: false, value: p.value, roman: p.canonical }
    if (p.canonical) return { kind: 'nonStandard', reason: p.reason!, detail: p.detail ?? '', value: p.value, canonical: p.canonical, input: input.trim() }
    return { kind: 'error', reason: p.reason!, detail: p.detail ?? '' }
  }, [input])

  const okValue = result.kind === 'ok' ? result.value : result.kind === 'nonStandard' ? result.value : 0
  const okRoman = result.kind === 'ok' ? result.roman : result.kind === 'nonStandard' ? result.canonical : ''
  const parts = useMemo(() => romanParts(okValue), [okValue])
  const sep = SEPS.find((s) => s.id === sepId)!.v
  const dateRes = useMemo(() => dateToRoman(date, order, sep), [date, order, sep])
  const dateLabels = order === 'ymd' ? ['year', 'month', 'day'] : order === 'mdy' ? ['month', 'day', 'year'] : ['day', 'month', 'year']

  const pick = (v: string | number) => {
    setInput(String(v))
    topRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const copyBtn = (text: string, id: string, light = false) => (
    <button
      onClick={() => copy(text, id)}
      className={`shrink-0 w-10 h-10 inline-flex items-center justify-center rounded-xl transition-colors ${light ? 'hover:bg-white/15 text-white' : 'hover:bg-soft text-sub'}`}
      aria-label={t('copy')}
      title={copiedId === id ? t('copied') : t('copy')}
    >
      {copiedId === id ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
    </button>
  )

  const chip = (active: boolean) =>
    `min-h-10 px-3 rounded-xl text-sm font-medium transition-colors ${active ? 'bg-primary text-white' : 'bg-soft text-body hover:bg-subtle'}`

  const variants = result.kind === 'ok' ? [
    { id: 'upper', label: t('variant.upper'), text: result.roman, serif: true },
    { id: 'lower', label: t('variant.lower'), text: result.roman.toLowerCase(), serif: true },
    ...(unicodeRoman(result.value) ? [
      { id: 'uni', label: t('variant.unicode'), text: unicodeRoman(result.value), serif: true },
      { id: 'unil', label: t('variant.unicodeLower'), text: unicodeRoman(result.value, true), serif: true },
    ] : []),
    { id: 'arabic', label: t('arabicNumber'), text: result.value.toLocaleString('en-US'), serif: false },
  ] : []

  return (
    <div className="space-y-8">
      <div ref={topRef} className="scroll-mt-20">
        <h1 className="text-2xl font-bold text-fg">{t('title')}</h1>
        <p className="text-sm text-muted mt-1">{t('description')}</p>
      </div>

      {/* 변환기 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
        <div className="lg:col-span-1">
          <div className="ui-card p-6 space-y-6">
            <div>
              <label htmlFor="roman-input" className="block text-sm font-medium text-body mb-2">{t('inputLabel')}</label>
              <div className="relative">
                <input
                  id="roman-input"
                  type="text"
                  inputMode="text"
                  autoComplete="off"
                  spellCheck={false}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={t('inputPlaceholder')}
                  className="ui-field w-full pl-4 pr-12 py-3 text-lg font-serif"
                />
                {input && (
                  <button
                    onClick={() => setInput('')}
                    className="absolute right-1 top-1/2 -translate-y-1/2 w-10 h-10 inline-flex items-center justify-center rounded-xl text-muted hover:bg-soft"
                    aria-label={t('reset')}
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
              <p className="text-xs text-muted mt-2">{t('inputHint')}</p>
            </div>

            <div>
              <div className="text-sm font-medium text-body mb-2">{t('quickNumbers')}</div>
              <div className="grid grid-cols-4 gap-2">
                {QUICK.map((q) => (
                  <button key={q} onClick={() => setInput(q)} className={`${chip(input === q)} font-serif`}>{q}</button>
                ))}
              </div>
            </div>

            <div>
              <div className="text-sm font-medium text-body mb-2">{t('referenceTable')}</div>
              <div className="grid grid-cols-5 gap-2">
                {SYMBOLS.map(([r, v]) => (
                  <button key={v} onClick={() => setInput(String(v))} className="bg-subtle hover:bg-soft rounded-xl py-2 text-center transition-colors">
                    <div className="font-serif text-lg font-bold text-fg">{r}</div>
                    <div className="text-[11px] text-sub tabular-nums">{v.toLocaleString('en-US')}</div>
                  </button>
                ))}
              </div>
              <p className="text-xs text-muted mt-2">{t('maxNumber')}</p>
            </div>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-4" aria-live="polite">
          {result.kind === 'ok' && (
            <div className="ui-hero p-6">
              <div className="flex items-start justify-between gap-3">
                <div className="text-sm text-white/70 break-all">
                  {result.numeric
                    ? t('labelToRoman', { n: result.value.toLocaleString('en-US') })
                    : t('labelToArabic', { r: result.roman })}
                </div>
                {copyBtn(result.numeric ? result.roman : String(result.value), 'hero', true)}
              </div>
              <div className={`mt-1 font-bold break-all leading-tight ${result.numeric ? 'font-serif text-4xl sm:text-5xl' : 'text-4xl sm:text-5xl tabular-nums'}`}>
                {result.numeric ? result.roman : result.value.toLocaleString('en-US')}
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-white/70">
                <span className={result.numeric ? 'tabular-nums' : 'font-serif'}>
                  = {result.numeric ? result.value.toLocaleString('en-US') : result.roman}
                </span>
                {result.value > MAX_STD && <span className="px-2 py-0.5 rounded-lg bg-white/15 text-white text-xs">{t('extended')}</span>}
              </div>
            </div>
          )}

          {result.kind === 'nonStandard' && (
            <div className="rounded-2xl p-5 bg-amber-50 text-amber-800 space-y-3">
              <div className="font-semibold">{t('nonStandard', { r: result.input.toUpperCase() })}</div>
              <p className="text-sm">{t(`reason.${result.reason}`, { d: result.detail })}</p>
              <p className="text-sm">
                {t('lenientRead', { v: result.value.toLocaleString('en-US'), c: result.canonical })}
              </p>
              <button onClick={() => setInput(result.canonical)} className="ui-btn px-4 min-h-10 text-sm">
                {t('useCanonical', { c: result.canonical })}
              </button>
            </div>
          )}

          {result.kind === 'error' && (
            <div className="rounded-2xl p-5 bg-amber-50 text-amber-800 text-sm">
              {t(`reason.${result.reason}`, { d: result.detail })}
            </div>
          )}

          {parts.length > 0 && (
            <div className="ui-card p-6">
              <div className="flex items-center justify-between gap-3 mb-4">
                <h2 className="text-base font-semibold text-fg">{t('breakdown')}</h2>
                {result.kind === 'ok' && (
                  <button onClick={() => setInput(result.numeric ? result.roman : String(result.value))} className="ui-btn-soft px-3 min-h-10 text-sm inline-flex items-center gap-1.5">
                    <ArrowLeftRight className="w-4 h-4" />
                    {t('swap')}
                  </button>
                )}
              </div>
              <div className="flex flex-wrap items-stretch gap-2">
                {parts.map((p, i) => (
                  <div key={i} className="flex items-center gap-2">
                    {i > 0 && <span className="text-faint">+</span>}
                    <div className="bg-subtle rounded-xl px-3 py-2 text-center">
                      <div className="font-serif text-xl font-bold text-fg">{p.roman}</div>
                      <div className="text-xs text-sub tabular-nums">{p.value.toLocaleString('en-US')}</div>
                    </div>
                  </div>
                ))}
                <div className="flex items-center gap-2">
                  <span className="text-faint">=</span>
                  <div className="px-1 text-center">
                    <div className="font-serif text-xl font-bold text-primary break-all">{okRoman}</div>
                    <div className="text-xs text-sub tabular-nums">{okValue.toLocaleString('en-US')}</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {variants.length > 0 && (
            <div className="ui-card p-2">
              <div className="px-4 pt-3 pb-1 text-sm font-semibold text-fg">{t('variants')}</div>
              {variants.map((v) => (
                <div key={v.id} className="flex items-center justify-between gap-3 px-4 py-1">
                  <span className="text-sm text-sub shrink-0">{v.label}</span>
                  <span className="flex items-center gap-1 min-w-0">
                    <span className={`text-fg font-medium break-all text-right ${v.serif ? 'font-serif text-lg' : 'tabular-nums'}`}>{v.text}</span>
                    {copyBtn(v.text.replace(/,/g, ''), v.id)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 날짜 → 로마 숫자 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
        <div className="lg:col-span-1">
          <div className="ui-card p-6 space-y-5">
            <div>
              <h2 className="text-lg font-semibold text-fg">{t('date.title')}</h2>
              <p className="text-sm text-muted mt-1">{t('date.desc')}</p>
            </div>
            <div>
              <label htmlFor="roman-date" className="block text-sm font-medium text-body mb-2">{t('date.label')}</label>
              <input
                id="roman-date"
                type="date"
                min="0001-01-01"
                max="3999-12-31"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="ui-field w-full px-4 py-3"
              />
            </div>
            <div>
              <div className="text-sm font-medium text-body mb-2">{t('date.order')}</div>
              <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-1 gap-2">
                {ORDERS.map((o) => (
                  <button key={o} onClick={() => setOrder(o)} className={chip(order === o)}>{t(`date.order_${o}`)}</button>
                ))}
              </div>
            </div>
            <div>
              <div className="text-sm font-medium text-body mb-2">{t('date.sep')}</div>
              <div className="grid grid-cols-5 gap-2">
                {SEPS.map((s) => (
                  <button key={s.id} onClick={() => setSepId(s.id)} className={chip(sepId === s.id)} aria-label={t(`date.sep_${s.id}`)} title={t(`date.sep_${s.id}`)}>
                    {s.id === 'space' ? '␣' : s.v.trim()}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-4">
          {dateRes ? (
            <>
              <div className="ui-hero p-6">
                <div className="flex items-start justify-between gap-3">
                  <div className="text-sm text-white/70">{t('date.resultLabel', { date: date.replace(/-/g, '.') })}</div>
                  {copyBtn(dateRes.roman, 'date', true)}
                </div>
                <div className="mt-1 font-serif font-bold text-3xl sm:text-5xl break-all leading-tight">{dateRes.roman}</div>
                <div className="mt-3 font-serif text-sm text-white/70 break-all">{dateRes.roman.toLowerCase()}</div>
              </div>
              <div className="ui-card p-2">
                {dateRes.parts.map((r, i) => (
                  <div key={i} className="flex items-center justify-between gap-3 px-4 py-1">
                    <span className="text-sm text-sub shrink-0">{t(`date.${dateLabels[i]}`)}</span>
                    <span className="flex items-center gap-1 min-w-0">
                      <span className="text-fg font-medium font-serif text-lg break-all text-right">{r}</span>
                      {copyBtn(r, `date${i}`)}
                    </span>
                  </div>
                ))}
              </div>
              <ShareResult
                fileName="roman-date"
                card={{
                  tool: t('title'),
                  label: t('date.resultLabel', { date: date.replace(/-/g, '.') }),
                  headline: dateRes.roman,
                  rows: dateRes.parts.map((r, i) => ({ label: t(`date.${dateLabels[i]}`), value: r })),
                }}
                text={`${date.replace(/-/g, '.')} = ${dateRes.roman}`}
              />
            </>
          ) : (
            <div className="ui-card p-6 text-sm text-muted">{t('date.invalid')}</div>
          )}
        </div>
      </div>

      {/* 유니코드 문자 */}
      <div className="ui-card p-6 space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-fg">{t('unicode.title')}</h2>
          <p className="text-sm text-muted mt-1">{t('unicode.desc')}</p>
        </div>
        {([false, true] as const).map((lower) => (
          <div key={String(lower)}>
            <div className="text-sm font-medium text-body mb-2">{lower ? t('unicode.lower') : t('unicode.upper')}</div>
            <div className="grid grid-cols-6 sm:grid-cols-8 lg:grid-cols-16 gap-2">
              {UNI.map((n) => {
                const ch = unicodeRoman(n, lower)
                const id = `u${lower ? 'l' : 'u'}${n}`
                return (
                  <button
                    key={n}
                    onClick={() => copy(ch, id)}
                    className={`min-h-12 rounded-xl text-center transition-colors ${copiedId === id ? 'bg-primary text-white' : 'bg-subtle hover:bg-soft text-fg'}`}
                    aria-label={`${ch} = ${n}, ${t('copy')}`}
                  >
                    <div className="text-xl leading-tight">{ch}</div>
                    <div className={`text-[10px] tabular-nums ${copiedId === id ? 'text-white/80' : 'text-sub'}`}>{copiedId === id ? t('copied') : n}</div>
                  </button>
                )
              })}
            </div>
          </div>
        ))}
        <p className="text-xs text-muted">{t('unicode.note')}</p>
      </div>

      {/* 빠른 참조표 */}
      <div className="ui-card p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-fg">{t('table.title')}</h2>
          <div className="flex gap-2">
            <button onClick={() => setTable('n')} className={chip(table === 'n')}>{t('table.tabNumbers')}</button>
            <button onClick={() => setTable('y')} className={chip(table === 'y')}>{t('table.tabYears')}</button>
          </div>
        </div>
        <p className="text-xs text-muted">{t('table.hint')}</p>
        <div className={`grid gap-2 ${table === 'n' ? 'grid-cols-4 sm:grid-cols-5 lg:grid-cols-10' : 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4'}`}>
          {(table === 'n' ? ONE_TO_100 : YEARS).map((n) => (
            <button
              key={n}
              onClick={() => pick(n)}
              className={`min-h-10 rounded-xl px-2 py-1.5 transition-colors ${String(n) === input ? 'bg-primary-soft text-primary' : 'bg-subtle hover:bg-soft'} ${table === 'y' ? 'flex items-center justify-between gap-2' : 'text-center'}`}
            >
              <div className={`text-xs tabular-nums ${String(n) === input ? 'text-primary' : 'text-sub'}`}>{n}</div>
              <div className={`font-serif font-semibold break-all ${table === 'n' ? 'text-sm' : 'text-sm sm:text-base'} ${String(n) === input ? 'text-primary' : 'text-fg'}`}>{toRoman(n)}</div>
            </button>
          ))}
        </div>
      </div>

      {/* 가이드 */}
      <div className="ui-card p-6 space-y-8">
        <h2 className="text-xl font-semibold text-fg">{t('guide.title')}</h2>

        <section>
          <h3 className="text-lg font-semibold text-fg mb-2">{t('guide.whatIs.title')}</h3>
          <p className="text-body leading-relaxed">{t('guide.whatIs.description')}</p>
        </section>

        <section>
          <h3 className="text-lg font-semibold text-fg mb-3">{t('guide.rules.title')}</h3>
          <ul className="space-y-2 list-disc pl-5 text-body">
            {(t.raw('guide.rules.items') as string[]).map((item, i) => <li key={i}>{item}</li>)}
          </ul>
        </section>

        <section>
          <h3 className="text-lg font-semibold text-fg mb-3">{t('guide.examples.title')}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {(t.raw('guide.examples.items') as string[]).map((ex, i) => (
              <div key={i} className="bg-subtle rounded-xl p-3 font-mono text-sm text-body break-all">{ex}</div>
            ))}
          </div>
        </section>

        <section>
          <h3 className="text-lg font-semibold text-fg mb-3">{t('guide.howToUse.title')}</h3>
          <ol className="space-y-2 text-body">
            {(t.raw('guide.howToUse.items') as string[]).map((item, i) => <li key={i}>{item}</li>)}
          </ol>
        </section>

        <section>
          <h3 className="text-lg font-semibold text-fg mb-3">{t('guide.tips.title')}</h3>
          <ul className="space-y-2 list-disc pl-5 text-body">
            {(t.raw('guide.tips.items') as string[]).map((item, i) => <li key={i}>{item}</li>)}
          </ul>
        </section>

        <section>
          <h3 className="text-lg font-semibold text-fg mb-3">{t('guide.faq.title')}</h3>
          <div className="space-y-4">
            {(t.raw('guide.faq.items') as { q: string; a: string }[]).map((f, i) => (
              <div key={i}>
                <div className="font-medium text-fg">Q. {f.q}</div>
                <p className="text-body mt-1 leading-relaxed">{f.a}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}
