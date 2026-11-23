'use client'

import { useMemo, useState } from 'react'
import { Check, Copy, Minus, Plus } from 'lucide-react'
import { useTranslations } from '@/lib/i18n'
import '@/lib/i18n/ns/charyeCost'
import { useSearchParams } from '@/hooks/useSearchParams'
import { useHydrated } from '@/hooks/useHydrated'
import ShareResult from '@/components/ShareResult'
import MobileResultLink from '@/components/MobileResultLink'
import {
  CATS, CHECKED, CHECK_KEY, DEFAULT, HOLIDAYS, QTY_MAX_MULT, SHOPS, SIZES, SIZE_MULT, SURVEYS, TABLES,
  calc, normalize, parseChecked, parseQuery, scaledQty, toQuery,
  type ItemId, type Line, type State, type Unit,
} from '@/utils/charyeCost'

const num = (n: number) => Math.round(n).toLocaleString('ko-KR')
const dec = (n: number) => n.toLocaleString('ko-KR', { maximumFractionDigits: 2 })
const seg = (on: boolean) => `min-h-11 px-2 py-2 rounded-xl text-sm font-medium transition-colors ${on ? 'bg-primary text-white' : 'bg-soft text-body hover:bg-subtle'}`
const labelCls = 'block text-sm font-medium text-body mb-2'
const GUIDE = ['method', 'tips', 'simple'] as const

export default function CharyeCost() {
  const t = useTranslations('charyeCost')
  const sp = useSearchParams()
  const hydrated = useHydrated()

  // URL → 상태. 하이드레이션 전에는 기본값(정적 HTML 과 같게), 사용자가 고치면 그 값
  const fromUrl = useMemo(() => (hydrated ? parseQuery((k) => sp.get(k)) : DEFAULT), [hydrated, sp])
  const [edited, setEdited] = useState<State | null>(null)
  const st = edited ?? fromUrl
  const commit = (next: State) => {
    const n = normalize(next)
    setEdited(n)
    const qs = toQuery(n)
    window.history.replaceState(window.history.state, '', `${window.location.pathname}${qs ? `?${qs}` : ''}${window.location.hash}`)
  }

  // 장보기 체크: 이 기기에만. 하이드레이션 뒤 한 번 읽고, 사용자가 누를 때만 쓴다
  const [checked, setChecked] = useState<ItemId[] | null>(null)
  if (hydrated && checked === null) {
    let v: ItemId[] = []
    try { v = parseChecked(window.localStorage.getItem(CHECK_KEY)) } catch { /* 저장소 차단 */ }
    setChecked(v)
  }
  const saveChecked = (next: ItemId[]) => {
    setChecked(next)
    try { window.localStorage.setItem(CHECK_KEY, JSON.stringify(next)) } catch { /* 저장소 차단 */ }
  }
  const done = checked ?? []
  const [copied, setCopied] = useState(false)

  const r = calc(st)
  const sv = SURVEYS[st.h]
  const won = (n: number) => t('fmt.won', { n: num(n) })
  const name = (id: ItemId) => t(`item.${id}`)
  const qtyText = (unit: Unit, n: number) =>
    unit === 'g' && n >= 1000 ? t('units.kg', { n: dec(n / 1000) })
      : unit === 'ml' && n >= 1000 ? t('units.l', { n: dec(n / 1000) })
        : t(`units.${unit}`, { n: num(n) })
  const surveyLabel = t('survey.label', {
    holiday: t(`holiday.${st.h}`), y: sv.date.slice(0, 4), m: Number(sv.date.slice(5, 7)), d: Number(sv.date.slice(8, 10)),
  })
  const shopName = t(`shop.${st.s}`)
  const other = st.s === 'market' ? 'mart' : 'market'
  const diffShop = r.byShop[other] - r.byShop[st.s]
  const resultLabel = t('result.label', { holiday: t(`holiday.${st.h}`), table: t(`table.${st.t}`) })

  const setQty = (l: Line, qty: number) => {
    const q = { ...st.q }
    if (qty === scaledQty(l.unit, l.base, st.z)) delete q[l.id]
    else q[l.id] = qty
    commit({ ...st, q })
  }
  const toggle = (id: ItemId) => commit({ ...st, o: st.o.includes(id) ? st.o.filter((x) => x !== id) : [...st.o, id] })

  const listText = () => [
    t('list.header', { label: resultLabel }),
    ...r.included.map((l) => `- ${name(l.id)} ${qtyText(l.unit, l.qty)}`),
    t('list.footer', { shop: shopName, total: won(r.total) }),
    window.location.href,
  ].join('\n')
  const copyList = async () => {
    try { await navigator.clipboard.writeText(listText()); setCopied(true) } catch { setCopied(false) }
    setTimeout(() => setCopied(false), 2000)
  }

  const faq = t.raw('guide.faq.items') as { q: string; a: string }[]
  const sources = t.raw('sources.items') as { label: string; url: string }[]
  const doneCount = r.included.filter((l) => done.includes(l.id)).length
  const edits = Object.keys(st.q).length
  // aT 는 소고기(설도·양지)를 한 품목으로 센다(24개 품목)
  const itemCount = r.included.length - (['beefRound', 'beefBrisket'].every((id) => r.included.some((l) => l.id === id)) ? 1 : 0)

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-fg">{t('title')}</h1>
        <p className="text-sm text-muted mt-1">{t('subtitle')}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* 입력 */}
        <section className="ui-card p-6 space-y-5 min-w-0" aria-labelledby="cc-input">
          <MobileResultLink href="#charye-cost-result" label={resultLabel} value={won(r.total)} />
          <h2 id="cc-input" className="text-lg font-semibold text-fg">{t('input.title')}</h2>

          <div>
            <p id="cc-holiday" className={labelCls}>{t('input.holiday')}</p>
            <div role="group" aria-labelledby="cc-holiday" className="grid grid-cols-2 gap-2">
              {HOLIDAYS.map((h) => (
                <button key={h} type="button" aria-pressed={st.h === h} onClick={() => commit({ ...st, h })} className={seg(st.h === h)}>{t(`holiday.${h}`)}</button>
              ))}
            </div>
            <p className="text-xs text-muted mt-1.5">{t(`input.holidayHint.${st.h}`)}</p>
          </div>

          <div>
            <p id="cc-table" className={labelCls}>{t('input.table')}</p>
            <div role="group" aria-labelledby="cc-table" className="grid grid-cols-2 gap-2">
              {TABLES.map((x) => (
                <button key={x} type="button" aria-pressed={st.t === x} onClick={() => commit({ ...st, t: x, o: [] })} className={seg(st.t === x)}>{t(`table.${x}`)}</button>
              ))}
            </div>
            <p className="text-xs text-muted mt-1.5">{t(`input.tableHint.${st.t}`)}</p>
          </div>

          <div>
            <p id="cc-shop" className={labelCls}>{t('input.shop')}</p>
            <div role="group" aria-labelledby="cc-shop" className="grid grid-cols-2 gap-2">
              {SHOPS.map((x) => (
                <button key={x} type="button" aria-pressed={st.s === x} onClick={() => commit({ ...st, s: x })} className={seg(st.s === x)}>{t(`shop.${x}`)}</button>
              ))}
            </div>
          </div>

          <div>
            <p id="cc-size" className={labelCls}>{t('input.size')}</p>
            <div role="group" aria-labelledby="cc-size" className="grid grid-cols-3 gap-2">
              {SIZES.map((x) => (
                <button key={x} type="button" aria-pressed={st.z === x} onClick={() => commit({ ...st, z: x })} className={seg(st.z === x)}>{t(`size.${x}`)}</button>
              ))}
            </div>
            <p className="text-xs text-muted mt-1.5 tabular-nums">{t('input.sizeHint', { mult: SIZE_MULT[st.z] })}</p>
          </div>

          <p className="bg-subtle rounded-2xl p-4 text-xs text-sub">{t('input.basis', { survey: surveyLabel, regions: sv.regions, markets: sv.markets, marts: sv.marts })}</p>
          {(st.o.length > 0 || edits > 0 || st.z !== 'm') && (
            <button type="button" onClick={() => commit({ ...st, z: 'm', o: [], q: {} })} className="ui-btn-soft w-full min-h-11 px-4 py-2 text-sm">{t('input.reset')}</button>
          )}
        </section>

        {/* 결과 */}
        <div className="lg:col-span-2 min-w-0 space-y-4">
          <section id="charye-cost-result" className="ui-card p-6 space-y-5 scroll-mt-20 min-w-0" aria-labelledby="cc-result-label">
            <div aria-live="polite">
              <p id="cc-result-label" className="text-sm text-sub">{resultLabel}</p>
              <p className="mt-1 text-3xl font-bold text-fg tabular-nums">{won(r.total)}</p>
              <p className="mt-1 text-sm text-body tabular-nums">{t('result.sub', { shop: shopName, n: itemCount, survey: surveyLabel })}</p>
            </div>

            <dl className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {SHOPS.map((x) => (
                <div key={x} className={`rounded-2xl px-4 py-3 ${x === st.s ? 'bg-primary-soft' : 'bg-subtle'}`}>
                  <dt className={`text-xs ${x === st.s ? 'text-primary font-medium' : 'text-sub'}`}>{t(`shop.${x}`)}</dt>
                  <dd className="mt-0.5 text-lg font-bold text-fg tabular-nums">{won(r.byShop[x])}</dd>
                </div>
              ))}
              <div className="bg-subtle rounded-2xl px-4 py-3">
                <dt className="text-xs text-sub">{t('result.mixed')}</dt>
                <dd className="mt-0.5 text-lg font-bold text-fg tabular-nums">{won(r.mixed)}</dd>
              </div>
            </dl>

            <ul className="space-y-1.5 text-sm text-body">
              <li>{diffShop === 0 ? t('result.shopSame') : diffShop > 0
                ? t('result.shopCheaper', { shop: shopName, other: t(`shop.${other}`), diff: won(diffShop) })
                : t('result.shopPricier', { shop: shopName, other: t(`shop.${other}`), diff: won(-diffShop) })}</li>
              <li>{st.t === 'full'
                ? t('result.simpleSave', { full: won(r.full), simple: won(r.simple), diff: won(r.full - r.simple) })
                : t('result.simpleVsFull', { full: won(r.full), diff: won(r.full - r.total) })}</li>
            </ul>

            <div>
              <h3 className="text-sm font-semibold text-fg">{t('result.byCat')}</h3>
              <ul className="mt-2 grid grid-cols-2 sm:grid-cols-3 gap-2">
                {r.byCat.map((c) => (
                  <li key={c.cat} className="bg-subtle rounded-xl px-3 py-2">
                    <p className="text-xs text-sub">{t(`cat.${c.cat}`)} <span className="tabular-nums">{t('result.count', { n: c.count })}</span></p>
                    <p className="text-sm font-semibold text-fg tabular-nums">{won(c.total)}</p>
                  </li>
                ))}
              </ul>
            </div>
            <p className="text-xs text-muted">{t('result.note')}</p>
          </section>

          <ShareResult
            fileName="charye-cost"
            card={{
              tool: t('share.tool'),
              label: resultLabel,
              headline: won(r.total),
              sub: t('result.sub', { shop: shopName, n: itemCount, survey: surveyLabel }),
              rows: [
                { label: t('shop.market'), value: won(r.byShop.market) },
                { label: t('shop.mart'), value: won(r.byShop.mart) },
                { label: t('share.simple'), value: won(r.simple) },
                { label: t('share.size'), value: t(`size.${st.z}`) },
              ],
            }}
            text={t('share.text', { label: resultLabel, total: won(r.total), shop: shopName })}
          />
        </div>
      </div>

      {/* 품목 표 */}
      <section className="ui-card p-6 space-y-4" aria-labelledby="cc-items">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h2 id="cc-items" className="text-lg font-semibold text-fg">{t('items.title')}</h2>
            <p className="text-sm text-muted mt-1">{t('items.desc', { survey: surveyLabel })}</p>
          </div>
          {edits > 0 && (
            <button type="button" onClick={() => commit({ ...st, q: {} })} className="ui-btn-soft min-h-11 px-3 py-2 text-sm">{t('items.resetQty')}</button>
          )}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
          {CATS.map((cat) => {
            const ls = r.lines.filter((l) => l.cat === cat)
            if (!ls.length) return null
            return (
              <div key={cat} className="min-w-0">
                <h3 className="text-sm font-semibold text-fg">{t(`cat.${cat}`)}</h3>
                <ul className="mt-1 divide-y divide-line border-y border-line">
                  {ls.map((l) => {
                    const cheaper = l.price.market === l.price.mart ? null : l.price.market < l.price.mart ? 'market' : 'mart'
                    return (
                      <li key={l.id} className="py-2 space-y-1.5">
                        <div className="flex items-start justify-between gap-3">
                          <label className="flex items-start gap-3 min-h-11 cursor-pointer min-w-0">
                            <input type="checkbox" checked={l.included} onChange={() => toggle(l.id)} className="mt-0.5 w-5 h-5 accent-primary shrink-0" />
                            <span className="min-w-0">
                              <span className={`block text-sm font-medium ${l.included ? 'text-body' : 'text-faint'}`}>{name(l.id)}</span>
                              <span className="block text-xs text-muted tabular-nums">
                                {t('items.price', { qty: qtyText(l.unit, l.base), market: won(l.price.market), mart: won(l.price.mart) })}
                                {cheaper && <span className="ml-1 text-sub">{t(`items.cheaper.${cheaper}`)}</span>}
                              </span>
                            </span>
                          </label>
                          <p className={`shrink-0 text-right text-sm font-semibold tabular-nums ${l.included ? 'text-fg' : 'text-faint'}`}>
                            {l.included ? won(l.cost[st.s]) : t('items.off')}
                          </p>
                        </div>
                        {l.included && (
                          <div className="flex items-center gap-2 pl-8">
                            <div role="group" aria-label={t('items.qtyAria', { item: name(l.id) })} className="flex items-center rounded-xl bg-surface border border-line">
                              <button type="button" disabled={l.qty <= l.step} onClick={() => setQty(l, l.qty - l.step)}
                                aria-label={t('items.minusAria', { item: name(l.id) })} className="inline-flex min-h-11 min-w-11 items-center justify-center text-body disabled:opacity-40">
                                <Minus className="w-4 h-4" aria-hidden="true" />
                              </button>
                              <span className={`min-w-16 text-center text-sm font-semibold tabular-nums ${l.edited ? 'text-primary' : 'text-fg'}`}>{qtyText(l.unit, l.qty)}</span>
                              <button type="button" disabled={l.qty + l.step > l.base * QTY_MAX_MULT} onClick={() => setQty(l, l.qty + l.step)}
                                aria-label={t('items.plusAria', { item: name(l.id) })} className="inline-flex min-h-11 min-w-11 items-center justify-center text-body disabled:opacity-40">
                                <Plus className="w-4 h-4" aria-hidden="true" />
                              </button>
                            </div>
                          </div>
                        )}
                      </li>
                    )
                  })}
                </ul>
              </div>
            )
          })}
        </div>
        <p className="bg-subtle rounded-2xl p-4 text-xs text-sub">{t('items.note')}</p>
      </section>

      {/* 장보기 체크리스트 */}
      <section className="ui-card p-6 space-y-4" aria-labelledby="cc-list">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h2 id="cc-list" className="text-lg font-semibold text-fg">{t('list.title')}</h2>
            <p className="text-sm text-muted mt-1">{t('list.desc')}</p>
          </div>
          <p className="text-sm text-sub tabular-nums" aria-live="polite">{t('list.progress', { done: doneCount, total: r.included.length })}</p>
        </div>
        {CATS.map((cat) => {
          const ls = r.included.filter((l) => l.cat === cat)
          if (!ls.length) return null
          return (
            <div key={cat}>
              <h3 className="text-xs font-semibold text-sub">{t(`cat.${cat}`)}</h3>
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-4">
                {ls.map((l) => {
                  const on = done.includes(l.id)
                  return (
                    <li key={l.id}>
                      <label className="flex items-center gap-3 min-h-11 cursor-pointer">
                        <input type="checkbox" checked={on} disabled={checked === null}
                          onChange={() => saveChecked(on ? done.filter((x) => x !== l.id) : [...done, l.id])}
                          className="w-5 h-5 accent-primary shrink-0" />
                        <span className={`text-sm ${on ? 'text-faint line-through' : 'text-body'}`}>
                          {name(l.id)} <span className="tabular-nums text-sub">{qtyText(l.unit, l.qty)}</span>
                        </span>
                      </label>
                    </li>
                  )
                })}
              </ul>
            </div>
          )
        })}
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={copyList} className="ui-btn inline-flex items-center gap-1.5 min-h-11 px-4 py-2 text-sm">
            {copied ? <Check className="w-4 h-4" aria-hidden="true" /> : <Copy className="w-4 h-4" aria-hidden="true" />}
            {copied ? t('list.copied') : t('list.copy')}
          </button>
          {doneCount > 0 && (
            <button type="button" onClick={() => saveChecked([])} className="ui-btn-soft min-h-11 px-4 py-2 text-sm">{t('list.clear')}</button>
          )}
        </div>
        <p className="text-xs text-muted">{t('list.note')}</p>
      </section>

      {/* 가이드 */}
      <div className="ui-card p-6 space-y-6">
        <h2 className="text-xl font-semibold text-fg">{t('guide.title')}</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {GUIDE.map((sec) => (
            <section key={sec}>
              <h3 className="font-semibold text-fg mb-3">{t(`guide.${sec}.title`)}</h3>
              <ul className="list-disc pl-5 space-y-2 text-sm text-sub">
                {(t.raw(`guide.${sec}.items`) as string[]).map((x) => <li key={x}>{x}</li>)}
              </ul>
            </section>
          ))}
        </div>
        <section>
          <h3 className="font-semibold text-fg mb-3">{t('guide.faq.title')}</h3>
          <div className="divide-y divide-line border-y border-line">
            {faq.map((f) => (
              <details key={f.q} className="py-3">
                <summary className="cursor-pointer text-sm font-medium text-body min-h-11 flex items-center">{f.q}</summary>
                <p className="text-sm text-sub mt-2 leading-relaxed">{f.a}</p>
              </details>
            ))}
          </div>
        </section>
        <section className="bg-subtle rounded-2xl p-5 text-sm text-sub space-y-2">
          <h3 className="font-medium text-body">{t('sources.title')}</h3>
          <ul className="space-y-1">
            {sources.map((x) => (
              <li key={x.url}><a href={x.url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline [overflow-wrap:anywhere]">{x.label}</a></li>
            ))}
          </ul>
          <p className="text-xs text-muted">{t('sources.asOf', { date: CHECKED })}</p>
        </section>
        <p className="text-xs text-muted">{t('disclaimer')}</p>
      </div>
    </div>
  )
}
