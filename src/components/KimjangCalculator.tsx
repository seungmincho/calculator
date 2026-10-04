'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { Copy, Check, RotateCcw } from 'lucide-react'
import { useTranslations } from '@/lib/i18n'
import '@/lib/i18n/ns/kimjangCalculator'
import { useSearchParams } from '@/hooks/useSearchParams'
import ShareResult from '@/components/ShareResult'
import {
  ITEMS, ITEM_IDS, OPTIONAL_IDS, DEFAULT_ON, METHODS, TASTES, AT_TOTAL_2025, BOX_KG,
  calc, compareMethods, headsFromKg, kgFromHeads, recommendHeads,
  type ItemId, type Method, type Taste, type Unit,
} from '@/utils/kimjang'

const HEAD_PRESETS = [10, 20, 30, 40] as const
const KG_PRESETS = [10, 20, 40, 60] as const
const FAMILY = [1, 2, 3, 4, 5, 6, 7, 8] as const
const MAX_HEADS = 500
const MAX_KG = 1000
const LS_KEY = 'kimjang-checklist-v1'

const won = (n: number) => Math.round(n).toLocaleString('ko-KR')
const dec = (n: number) => (Math.round(n * 10) / 10).toLocaleString('ko-KR', { maximumFractionDigits: 1 })
const man = (n: number) => (Math.round(n / 1000) / 10).toLocaleString('ko-KR', { maximumFractionDigits: 1 })
const digits = (s: string) => s.replace(/[^\d]/g, '')
const numParam = (v: string | null, def: number, max: number) => {
  const n = Number(v)
  return v != null && v !== '' && Number.isFinite(n) && n > 0 ? Math.min(n, max) : def
}
const sameSet = (a: readonly string[], b: readonly string[]) => a.length === b.length && a.every((x) => b.includes(x))

export default function KimjangCalculator() {
  const t = useTranslations('kimjangCalculator')
  const sp = useSearchParams()

  const [basis, setBasis] = useState<'head' | 'kg'>(() => (sp.get('kg') ? 'kg' : 'head'))
  const [heads, setHeads] = useState(() => numParam(sp.get('n'), 20, MAX_HEADS))
  const [kg, setKg] = useState(() => numParam(sp.get('kg'), 40, MAX_KG))
  const [family, setFamily] = useState(4)
  const [method, setMethod] = useState<Method>(() => (sp.get('m') === 'buy' ? 'buy' : 'self'))
  const [taste, setTaste] = useState<Taste>(() => {
    const v = sp.get('t') as Taste | null
    return v && TASTES.includes(v) ? v : 'basic'
  })
  const [enabled, setEnabled] = useState<ItemId[]>(() => {
    const o = sp.get('o')
    return o == null ? [...DEFAULT_ON] : (o.split('.').filter((id) => OPTIONAL_IDS.includes(id as ItemId)) as ItemId[])
  })
  const [prices, setPrices] = useState<Partial<Record<ItemId, number>>>(() => {
    const out: Partial<Record<ItemId, number>> = {}
    for (const pair of (sp.get('p') ?? '').split('_')) {
      const [id, v] = pair.split('-')
      const n = Number(v)
      if (ITEM_IDS.includes(id as ItemId) && v !== '' && Number.isFinite(n) && n >= 0) out[id as ItemId] = n
    }
    return out
  })
  const [checked, setChecked] = useState<ItemId[]>([])
  const [copied, setCopied] = useState(false)

  // 체크리스트: 이 기기에만 저장 (첫 렌더 이후 읽어 하이드레이션 불일치 방지)
  useEffect(() => {
    try {
      const v = JSON.parse(localStorage.getItem(LS_KEY) ?? '[]')
      if (Array.isArray(v)) setChecked(v.filter((id) => ITEM_IDS.includes(id)))
    } catch { /* 저장소 차단: 무시 */ }
  }, [])
  const toggleCheck = (id: ItemId) => {
    setChecked((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
      try { localStorage.setItem(LS_KEY, JSON.stringify(next)) } catch { /* 무시 */ }
      return next
    })
  }
  const clearChecks = () => {
    setChecked([])
    try { localStorage.removeItem(LS_KEY) } catch { /* 무시 */ }
  }

  useEffect(() => {
    const q = new URLSearchParams()
    if (basis === 'kg') q.set('kg', String(kg))
    else if (heads !== 20) q.set('n', String(heads))
    if (method === 'buy') q.set('m', 'buy')
    if (taste !== 'basic') q.set('t', taste)
    if (!sameSet(enabled, DEFAULT_ON)) q.set('o', enabled.join('.'))
    const p = Object.entries(prices).map(([id, v]) => `${id}-${v}`).join('_')
    if (p) q.set('p', p)
    const s = q.toString()
    window.history.replaceState(null, '', s ? `?${s}` : window.location.pathname)
  }, [basis, heads, kg, method, taste, enabled, prices])

  const effHeads = basis === 'head' ? heads : headsFromKg(kg)
  const input = { heads: effHeads, method, taste, enabled, prices }
  const r = calc(input)
  const cmp = compareMethods(input)
  const rec = recommendHeads(family)
  const what = basis === 'head' ? t('u.what.head', { n: dec(heads) }) : t('u.what.kg', { kg: dec(kg), n: dec(effHeads) })
  const name = (id: ItemId) => t(`items.${id}`)
  const chili = r.lines.find((l) => l.id === 'chili')
  const edited = Object.keys(prices).length > 0

  const fmtQty = (unit: Unit, q: number, roundUp = false) => {
    if (unit === 'kg') {
      if (q < 1) return `${(roundUp ? Math.ceil(q * 100 - 1e-9) * 10 : Math.round(q * 1000)).toLocaleString('ko-KR')}${t('units.g')}`
      return `${dec(roundUp ? Math.ceil(q * 10 - 1e-9) / 10 : q)}${t('units.kg')}`
    }
    return `${dec(roundUp ? Math.ceil(q - 1e-9) : q)}${t(`units.${unit}`)}`
  }

  const setPrice = (id: ItemId, raw: string) => {
    const d = digits(raw)
    setPrices((prev) => ({ ...prev, [id]: d === '' ? 0 : Math.min(Number(d), 10_000_000) }))
  }
  const toggleOpt = (id: ItemId) => setEnabled((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))

  const copyList = useCallback(async () => {
    const text = [
      t('list.header', { what }),
      ...r.lines.map((l) => `- ${name(l.id)} ${fmtQty(l.unit, l.qty, true)}`),
      t('list.footer', { man: man(r.total) }),
      window.location.href,
    ].join('\n')
    try {
      if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(text)
      else {
        const ta = document.createElement('textarea')
        ta.value = text
        ta.style.position = 'fixed'
        ta.style.left = '-999999px'
        document.body.appendChild(ta)
        ta.select()
        document.execCommand('copy')
        document.body.removeChild(ta)
      }
    } catch { /* 권한 없음: 무시 */ }
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [r.lines, r.total, what]) // eslint-disable-line react-hooks/exhaustive-deps

  const seg = (on: boolean) =>
    `min-h-[44px] px-2 py-2 rounded-lg text-sm font-medium transition-colors ${on ? 'bg-primary text-white' : 'bg-soft text-body hover:bg-subtle'}`
  const chip = (on: boolean) =>
    `min-h-[44px] px-3 py-2 rounded-lg text-sm transition-colors ${on ? 'bg-primary text-white' : 'bg-soft text-body hover:bg-subtle'}`
  const cheaper: Method = cmp.self <= cmp.buy ? 'self' : 'buy'
  const diff = Math.abs(cmp.self - cmp.buy)
  const faq = t.raw('guide.faq.items') as { q: string; a: string }[]
  const sources = t.raw('guide.sources.items') as { label: string; url: string }[]
  const doneCount = r.lines.filter((l) => checked.includes(l.id)).length

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
            <div>
              <p className="block text-sm font-medium text-body mb-2">{t('u.basis.label')}</p>
              <div className="grid grid-cols-2 gap-2">
                {(['head', 'kg'] as const).map((b) => (
                  <button key={b} type="button" onClick={() => setBasis(b)} className={seg(basis === b)} aria-pressed={basis === b}>{t(`u.basis.${b}`)}</button>
                ))}
              </div>
            </div>

            {basis === 'head' ? (
              <div>
                <label htmlFor="kj-heads" className="block text-sm font-medium text-body mb-2">{t('u.heads')}</label>
                <div className="relative">
                  <input
                    id="kj-heads" type="text" inputMode="numeric" value={heads ? String(heads) : ''}
                    onChange={(e) => setHeads(Math.min(Number(digits(e.target.value)) || 0, MAX_HEADS))}
                    className="ui-field w-full px-4 py-3 pr-14 tabular-nums" aria-describedby="kj-heads-hint"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-muted">{t('units.head')}</span>
                </div>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {HEAD_PRESETS.map((n) => (
                    <button key={n} type="button" onClick={() => setHeads(n)} className={chip(heads === n)} aria-pressed={heads === n}>{t('u.headOpt', { n })}</button>
                  ))}
                </div>
                <p id="kj-heads-hint" className="text-xs text-muted mt-1.5">{t('u.headsHint', { kg: dec(kgFromHeads(heads)) })}</p>
              </div>
            ) : (
              <div>
                <label htmlFor="kj-kg" className="block text-sm font-medium text-body mb-2">{t('u.kg')}</label>
                <div className="relative">
                  <input
                    id="kj-kg" type="text" inputMode="numeric" value={kg ? String(kg) : ''}
                    onChange={(e) => setKg(Math.min(Number(digits(e.target.value)) || 0, MAX_KG))}
                    className="ui-field w-full px-4 py-3 pr-14 tabular-nums" aria-describedby="kj-kg-hint"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-muted">{t('units.kg')}</span>
                </div>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {KG_PRESETS.map((n) => (
                    <button key={n} type="button" onClick={() => setKg(n)} className={chip(kg === n)} aria-pressed={kg === n}>{t('u.kgOpt', { n })}</button>
                  ))}
                </div>
                <p id="kj-kg-hint" className="text-xs text-muted mt-1.5">{t('u.kgHint', { n: dec(effHeads) })}</p>
              </div>
            )}

            <div className="bg-subtle rounded-2xl p-4 space-y-2">
              <label htmlFor="kj-family" className="block text-sm font-medium text-body">{t('u.family.label')}</label>
              <select id="kj-family" value={family} onChange={(e) => setFamily(Number(e.target.value))} className="ui-field w-full px-4 py-3">
                {FAMILY.map((n) => <option key={n} value={n}>{t('u.family.opt', { n })}</option>)}
              </select>
              <p className="text-xs text-muted">{t('u.family.rec', { n: family, heads: rec })}</p>
              <button
                type="button" onClick={() => { setBasis('head'); setHeads(rec) }}
                className="ui-btn-soft w-full min-h-[44px] px-4 py-2 text-sm"
              >
                {t('u.family.apply', { heads: rec })}
              </button>
            </div>

            <div>
              <p className="block text-sm font-medium text-body mb-2">{t('u.method.label')}</p>
              <div className="grid grid-cols-2 gap-2">
                {METHODS.map((m) => (
                  <button key={m} type="button" onClick={() => setMethod(m)} className={seg(method === m)} aria-pressed={method === m}>{t(`u.method.${m}`)}</button>
                ))}
              </div>
              <p className="text-xs text-muted mt-1.5">{t(`u.method.hint.${method}`)}</p>
            </div>

            <div>
              <p className="block text-sm font-medium text-body mb-2">{t('u.taste.label')}</p>
              <div className="grid grid-cols-3 gap-2">
                {TASTES.map((x) => (
                  <button key={x} type="button" onClick={() => setTaste(x)} className={seg(taste === x)} aria-pressed={taste === x}>{t(`u.taste.${x}`)}</button>
                ))}
              </div>
              <p className="text-xs text-muted mt-1.5">{t(`u.taste.hint.${taste}`)}</p>
            </div>

            <div>
              <p className="block text-sm font-medium text-body mb-2">{t('u.optional.label')}</p>
              <div className="flex flex-wrap gap-1.5">
                {OPTIONAL_IDS.map((id) => (
                  <button key={id} type="button" onClick={() => toggleOpt(id)} className={chip(enabled.includes(id))} aria-pressed={enabled.includes(id)}>{name(id)}</button>
                ))}
              </div>
              <p className="text-xs text-muted mt-1.5">{t('u.optional.hint')}</p>
            </div>
          </div>
        </div>

        {/* 결과 */}
        <div className="lg:col-span-2 space-y-6">
          <div className="ui-card p-6 space-y-5">
            <div aria-live="polite">
              <p className="text-sm text-muted">{t('u.resultLabel', { what })}</p>
              <p className="text-3xl font-bold text-fg tabular-nums mt-1">{won(r.total)}{t('u.won')}</p>
              <p className="text-sm text-sub mt-1">
                {t('u.resultSub', { man: man(r.total), count: r.lines.length, method: t(`u.method.${method}`), taste: t(`u.taste.${taste}`) })}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {METHODS.map((m) => (
                <div key={m} className={`rounded-2xl p-4 ${m === method ? 'bg-primary-soft' : 'bg-subtle'}`}>
                  <p className={`text-sm ${m === method ? 'text-primary font-medium' : 'text-muted'}`}>{t(`u.method.${m}`)}</p>
                  <p className="text-xl font-bold text-fg tabular-nums mt-1">{won(cmp[m])}{t('u.won')}</p>
                </div>
              ))}
              <div className="bg-subtle rounded-2xl p-4">
                <p className="text-sm text-muted">{t('u.yield.label')}</p>
                <p className="text-xl font-bold text-fg tabular-nums mt-1">{t('u.yield.value', { kg: dec(r.yieldKg) })}</p>
              </div>
            </div>

            <div className="text-sm text-sub space-y-1">
              <p>{diff < 100 ? t('u.compare.same') : t('u.compare.cheaper', { method: t(`u.method.${cheaper}`), diff: won(diff) })}</p>
              <p className="text-xs text-muted">{t('u.yield.note', { salted: dec(r.saltedKg), sauce: dec(r.sauceKg) })}</p>
            </div>

            <ShareResult
              card={{
                tool: t('title'),
                label: t('u.resultLabel', { what }),
                headline: `${won(r.total)}${t('u.won')}`,
                sub: t('u.share.sub', { man: man(r.total), method: t(`u.method.${method}`) }),
                rows: [
                  { label: t('u.method.self'), value: `${won(cmp.self)}${t('u.won')}` },
                  { label: t('u.method.buy'), value: `${won(cmp.buy)}${t('u.won')}` },
                  ...(chili ? [{ label: name('chili'), value: fmtQty('kg', chili.qty) }] : []),
                  { label: t('u.yield.label'), value: t('u.yield.value', { kg: dec(r.yieldKg) }) },
                ],
              }}
              text={t('u.share.text', { what, man: man(r.total) })}
              fileName="kimjang-cost"
            />
          </div>

          {/* 재료별 양·비용 */}
          <div className="ui-card p-6 space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <h2 className="text-lg font-semibold text-fg">{t('u.table.title')}</h2>
                <p className="text-sm text-muted mt-1">{t('u.table.hint')}</p>
              </div>
              {edited && (
                <button type="button" onClick={() => setPrices({})} className="ui-btn-soft inline-flex items-center gap-1.5 min-h-[44px] px-3 py-2 text-sm">
                  <RotateCcw className="w-4 h-4" aria-hidden="true" /> {t('u.table.reset')}
                </button>
              )}
            </div>
            <ul className="divide-y divide-line border-y border-line">
              {r.lines.map((l) => {
                const it = ITEMS.find((x) => x.id === l.id)!
                const priceUnit = l.per !== 1 ? t('units.perBox', { kg: BOX_KG }) : t(`units.per.${l.unit}`)
                return (
                  <li key={l.id} className="py-3 grid grid-cols-[1fr_auto] gap-x-3 gap-y-2 items-center">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-body">
                        {name(l.id)}
                        {it.ref && <span className="ml-1.5 align-middle text-[11px] font-normal text-muted bg-soft rounded px-1.5 py-0.5">{t('u.table.refBadge')}</span>}
                      </p>
                      <p className="text-sm text-sub tabular-nums">
                        {fmtQty(l.unit, l.qty)}
                        {l.id === 'saltedCabbage' && ` · ${t('u.table.boxes', { n: dec(r.boxes) })}`}
                      </p>
                    </div>
                    <p className="text-right tabular-nums font-semibold text-fg">{won(l.cost)}{t('u.won')}</p>
                    <div className="col-span-2 flex items-center gap-2">
                      <label htmlFor={`kj-price-${l.id}`} className="text-xs text-muted shrink-0">{t('u.table.price')}</label>
                      <input
                        id={`kj-price-${l.id}`} type="text" inputMode="numeric"
                        value={l.edited && l.price === 0 ? '' : won(l.price)}
                        onChange={(e) => setPrice(l.id, e.target.value)}
                        aria-label={t('u.table.priceAria', { item: name(l.id) })}
                        className={`ui-field w-32 min-h-[44px] px-3 py-2 text-sm text-right tabular-nums ${l.edited ? 'border-primary' : ''}`}
                      />
                      <span className="text-xs text-muted">{priceUnit}</span>
                    </div>
                  </li>
                )
              })}
            </ul>
            <div className="flex items-center justify-between text-sm">
              <span className="text-body font-medium">{t('u.table.total')}</span>
              <span className="tabular-nums font-bold text-fg">{won(r.total)}{t('u.won')}</span>
            </div>
            <div className="bg-subtle rounded-2xl p-4 text-xs text-sub space-y-1">
              <p>{t('u.table.atNote', { total: won(AT_TOTAL_2025) })}</p>
              <p>{t('u.table.refNote')}</p>
            </div>
          </div>

          {/* 장보기 체크리스트 */}
          <div className="ui-card p-6 space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <h2 className="text-lg font-semibold text-fg">{t('list.title')}</h2>
                <p className="text-sm text-muted mt-1">{t('list.desc')}</p>
              </div>
              <p className="text-sm text-sub tabular-nums" aria-live="polite">{t('list.progress', { done: doneCount, total: r.lines.length })}</p>
            </div>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-4">
              {r.lines.map((l) => (
                <li key={l.id}>
                  <label className="flex items-center gap-3 min-h-[44px] cursor-pointer">
                    <input type="checkbox" checked={checked.includes(l.id)} onChange={() => toggleCheck(l.id)} className="w-5 h-5 accent-primary shrink-0" />
                    <span className={`text-sm ${checked.includes(l.id) ? 'text-faint line-through' : 'text-body'}`}>
                      {name(l.id)} <span className="tabular-nums text-sub">{fmtQty(l.unit, l.qty, true)}</span>
                    </span>
                  </label>
                </li>
              ))}
            </ul>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={copyList} className="ui-btn inline-flex items-center gap-1.5 min-h-[44px] px-4 py-2 text-sm">
                {copied ? <Check className="w-4 h-4" aria-hidden="true" /> : <Copy className="w-4 h-4" aria-hidden="true" />}
                {copied ? t('list.copied') : t('list.copy')}
              </button>
              {doneCount > 0 && (
                <button type="button" onClick={clearChecks} className="ui-btn-soft min-h-[44px] px-4 py-2 text-sm">{t('list.clear')}</button>
              )}
            </div>
            <p className="text-xs text-faint">{t('list.note')}</p>
          </div>

          <p className="text-xs text-faint">{t('u.disclaimer')}</p>
        </div>
      </div>

      {/* 가이드 */}
      <div className="ui-card p-6 space-y-6">
        <h2 className="text-xl font-semibold text-fg">{t('guide.title')}</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {(['salting', 'paste', 'storage', 'timing', 'tips'] as const).map((sec) => (
            <div key={sec}>
              <h3 className="font-semibold text-fg mb-3">{t(`guide.${sec}.title`)}</h3>
              <ul className="list-disc pl-5 space-y-2 text-sm text-sub">
                {(t.raw(`guide.${sec}.items`) as string[]).map((item, i) => <li key={i}>{item}</li>)}
              </ul>
            </div>
          ))}
        </div>

        <div>
          <h3 className="font-semibold text-fg mb-3">{t('guide.faq.title')}</h3>
          <div className="divide-y divide-line border-y border-line">
            {faq.map((f) => (
              <details key={f.q} className="py-3">
                <summary className="cursor-pointer text-sm font-medium text-body min-h-[24px]">{f.q}</summary>
                <p className="text-sm text-sub mt-2 leading-relaxed">{f.a}</p>
              </details>
            ))}
          </div>
        </div>

        <div className="bg-subtle rounded-2xl p-5 text-sm text-sub space-y-2">
          <p className="font-medium text-body">{t('guide.sources.title')}</p>
          <ul className="space-y-1">
            {sources.map((s) => (
              <li key={s.url}><a href={s.url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">{s.label}</a></li>
            ))}
          </ul>
          <p className="text-xs text-muted">{t('guide.sources.asOf')}</p>
        </div>

        <div className="flex flex-wrap gap-2">
          {(['dutch-pay', 'budget-calculator', 'discount-calculator'] as const).map((href) => (
            <Link key={href} href={`/${href}/`} className="ui-btn-soft min-h-[44px] inline-flex items-center px-3 py-2 text-sm">{t(`guide.links.${href}`)}</Link>
          ))}
        </div>
      </div>
    </div>
  )
}
