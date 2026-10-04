'use client'

import { useState, useEffect, type ReactNode } from 'react'
import Link from 'next/link'
import { useTranslations } from '@/lib/i18n'
import { useSearchParams } from '@/hooks/useSearchParams'
import ShareResult from '@/components/ShareResult'
import { krwPer, parseCache, type RateCache } from '@/utils/exchangeRate'
import {
  CURRENCIES, RATE_UNIT, FALLBACK_RATES, FALLBACK_DATE, ITEMS, ITEM_IDS, item, calc,
  type Origin, type Clearance, type Cur, type ItemId, type TaxKey,
} from '@/utils/customsDuty'

// 환율 계산기(ExchangeRateCalculator)와 같은 출처·캐시 키 → 받아 둔 시세를 같이 씀
const FX_API = 'https://open.er-api.com/v6/latest/USD'
const FX_CACHE = 'toolhub-fx-rates'
const UNIPASS_FX = 'https://unipass.customs.go.kr/csp/index.do?tgMenuId=MYC_MNU_00000339'
const LINKS = ['exchange-calculator', 'discount-calculator', 'vat-calculator'] as const

const num = (s: string | null | undefined) => {
  const n = parseFloat(String(s ?? '').replace(/,/g, ''))
  return Number.isFinite(n) && n > 0 ? n : 0
}
const isNum = (s: string | null): s is string => s != null && /^\d{1,12}(\.\d{1,2})?$/.test(s)
/** 입력 칸 서식: 콤마 + 소수 2자리 */
const fmtIn = (s: string) => {
  const v = s.replace(/[^\d.]/g, '')
  const [i, ...r] = v.split('.')
  const int = i ? Number(i.slice(0, 12)).toLocaleString('ko-KR') : r.length ? '0' : ''
  return r.length ? `${int}.${r.join('').slice(0, 2)}` : int
}
const won = (n: number) => Math.round(n).toLocaleString('ko-KR')
const usd = (n: number) => n.toLocaleString('en-US', { minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 })
const money = (n: number, c: Cur) => n.toLocaleString('ko-KR', { maximumFractionDigits: c === 'KRW' || c === 'JPY' ? 0 : 2 })
const pick = <T extends string>(v: string | null, list: readonly T[], def: T): T => ((list as readonly string[]).includes(v ?? '') ? (v as T) : def)

type Auto = { rates: Record<Cur, number>; src: 'fallback' | 'cache' | 'live'; updated: number }

export default function CustomsDutyCalculator() {
  const t = useTranslations('customsDuty')
  const sp = useSearchParams()
  const p = (k: string, def: string) => {
    const v = sp.get(k)
    return isNum(v) ? fmtIn(v) : def
  }

  const [origin, setOrigin] = useState<Origin>(() => (sp.get('o') === 'ot' ? 'other' : 'us'))
  const [itemId, setItemId] = useState<ItemId>(() => pick(sp.get('it'), ITEM_IDS, 'shoes'))
  const [clearance, setClearance] = useState<Clearance>(() => {
    const c = sp.get('c')
    return c === 'g' ? 'general' : c === 'l' ? 'list' : item(pick(sp.get('it'), ITEM_IDS, 'shoes')).clearance
  })
  const [cur, setCur] = useState<Cur>(() => pick(sp.get('cur'), CURRENCIES, 'USD'))
  const [price, setPrice] = useState(() => p('p', '230'))
  const [local, setLocal] = useState(() => p('lx', ''))
  const [ship, setShip] = useState(() => p('sh', '18'))
  const [other, setOther] = useState(() => p('ot', ''))
  const [customRate, setCustomRate] = useState(() => p('dr', '8'))
  const [fta, setFta] = useState(() => sp.get('fta') === '1')
  // null = 자동 환율, 문자열 = 직접 입력
  const [rateText, setRateText] = useState<string | null>(() => (isNum(sp.get('r')) ? fmtIn(sp.get('r')!) : null))
  const [usdText, setUsdText] = useState<string | null>(() => (isNum(sp.get('ur')) ? fmtIn(sp.get('ur')!) : null))
  const [auto, setAuto] = useState<Auto>({ rates: FALLBACK_RATES, src: 'fallback', updated: 0 })

  useEffect(() => {
    const applyFx = (c: RateCache, src: 'cache' | 'live') => {
      const rates = { ...FALLBACK_RATES }
      for (const k of CURRENCIES) {
        const v = krwPer(c.rates, k)
        if (v) rates[k] = Math.round(v * RATE_UNIT[k] * 100) / 100
      }
      setAuto({ rates, src, updated: c.updated })
    }
    try {
      const c = parseCache(localStorage.getItem(FX_CACHE))
      if (c) applyFx(c, 'cache')
    } catch { /* 저장소 접근 불가 */ }
    let alive = true
    fetch(FX_API)
      .then((res) => res.json())
      .then((j) => {
        if (!alive || j?.result !== 'success' || !(j.rates?.KRW > 0)) return
        const next: RateCache = { rates: j.rates, updated: j.time_last_update_unix }
        try { localStorage.setItem(FX_CACHE, JSON.stringify(next)) } catch { /* 저장 불가 */ }
        applyFx(next, 'live')
      })
      .catch(() => { /* 오프라인: 캐시·기본값 유지 */ })
    return () => { alive = false }
  }, [])

  const it = item(itemId)
  const luxury = 'luxury' in it
  const baseRate = itemId === 'custom' ? Math.min(num(customRate), 100) : it.rate
  const dutyRate = fta ? 0 : baseRate
  const rateShown = rateText ?? fmtIn(String(auto.rates[cur]))
  const rate = cur === 'KRW' ? 1 : (num(rateShown) || auto.rates[cur]) / RATE_UNIT[cur] // 빈칸이면 자동 환율
  const usdShown = usdText ?? fmtIn(String(auto.rates.USD))
  const usdRate = cur === 'USD' ? rate : num(usdShown) || auto.rates.USD
  const goodsFx = num(price) + num(local) + num(other)

  const r = calc({
    origin, clearance, cur, price: num(price), local: num(local), ship: num(ship), other: num(other),
    rate, usdRate, dutyRate, luxury,
  })

  useEffect(() => {
    const q = new URLSearchParams()
    if (origin === 'other') q.set('o', 'ot')
    q.set('it', itemId)
    if (clearance !== item(itemId).clearance) q.set('c', clearance === 'general' ? 'g' : 'l')
    if (cur !== 'USD') q.set('cur', cur)
    q.set('p', String(num(price)))
    if (num(local)) q.set('lx', String(num(local)))
    q.set('sh', String(num(ship)))
    if (num(other)) q.set('ot', String(num(other)))
    if (itemId === 'custom') q.set('dr', String(num(customRate)))
    if (fta) q.set('fta', '1')
    if (rateText != null && cur !== 'KRW') q.set('r', String(num(rateText)))
    if (usdText != null && cur !== 'USD') q.set('ur', String(num(usdText)))
    const id = setTimeout(() => window.history.replaceState(null, '', `${window.location.pathname}?${q}`), 300)
    return () => clearTimeout(id)
  }, [origin, itemId, clearance, cur, price, local, ship, other, customRate, fta, rateText, usdText])

  const way = t(`u.clearance.${clearance}`)
  const fxSuffix = cur === 'KRW' ? t('u.won') : cur
  const unitLabel = cur === 'JPY' ? '100 JPY' : `1 ${cur}`
  const updatedAt = auto.updated
    ? new Intl.DateTimeFormat('ko-KR', { timeZone: 'Asia/Seoul', dateStyle: 'medium', timeStyle: 'short' }).format(new Date(auto.updated * 1000))
    : ''
  const rateSrc = auto.src === 'fallback' ? t('u.rate.fallback', { date: FALLBACK_DATE }) : t('u.rate.market', { time: updatedAt })
  const limitRow = clearance === 'general' ? 2 : origin === 'us' ? 0 : 1
  const fill = Math.min(100, r.limit ? (r.goodsUsd / r.limit) * 100 : 0)
  const taxRows: { k: TaxKey; label: string; show: boolean }[] = [
    { k: 'duty', label: t('u.row.duty', { rate: dutyRate }), show: true },
    { k: 'excise', label: t('u.row.excise'), show: luxury },
    { k: 'edu', label: t('u.row.edu'), show: luxury },
    { k: 'vat', label: t('u.row.vat'), show: true },
  ]
  const faq = t.raw('guide.faq.items') as { q: string; a: string }[]
  const sources = t.raw('guide.sources.items') as { label: string; url: string }[]

  const changeItem = (id: ItemId) => {
    setItemId(id)
    setClearance(item(id).clearance)
  }
  const changeCur = (c: Cur) => {
    setCur(c)
    setRateText(null)
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
            <Seg
              name="cd-origin" legend={t('u.origin.label')} value={origin} onChange={setOrigin} cols="grid-cols-2"
              options={(['us', 'other'] as const).map((v) => ({ value: v, label: t(`u.origin.${v}`) }))}
              hint={t('u.origin.hint')}
            />

            <div>
              <label htmlFor="cd-item" className="block text-sm font-medium text-body mb-2">{t('u.item.label')}</label>
              <select id="cd-item" value={itemId} onChange={(e) => changeItem(e.target.value as ItemId)} className="ui-field w-full px-4 py-3" aria-describedby="cd-item-hint">
                {ITEMS.map((x) => (
                  <option key={x.id} value={x.id}>
                    {x.id === 'custom' ? t('u.item.opt.custom') : t('u.item.optRate', { name: t(`u.item.opt.${x.id}`), rate: x.rate })}
                  </option>
                ))}
              </select>
              <p id="cd-item-hint" className="text-xs text-muted mt-1.5">{t(`u.item.hint.${itemId}`)}</p>
              {itemId === 'custom' && (
                <div className="mt-3">
                  <label htmlFor="cd-dr" className="block text-sm font-medium text-body mb-2">{t('u.item.customRate')}</label>
                  <Suffixed id="cd-dr" value={customRate} onChange={(v) => setCustomRate(fmtIn(v))} suffix="%" />
                </div>
              )}
              <label className="flex items-start gap-2 mt-3 min-h-11 cursor-pointer">
                <input type="checkbox" checked={fta} onChange={(e) => setFta(e.target.checked)} className="mt-0.5 h-5 w-5 shrink-0 accent-primary" />
                <span>
                  <span className="block text-sm text-body">{t('u.fta.label')}</span>
                  <span className="block text-xs text-muted mt-0.5">{t('u.fta.hint')}</span>
                </span>
              </label>
            </div>

            <Seg
              name="cd-clearance" legend={t('u.clearance.label')} value={clearance} onChange={setClearance} cols="grid-cols-2"
              options={(['list', 'general'] as const).map((v) => ({ value: v, label: t(`u.clearance.${v}`) }))}
              hint={t(`u.clearance.hint.${clearance}`)}
            />

            <Seg
              name="cd-cur" legend={t('u.cur.label')} value={cur} onChange={changeCur} cols="grid-cols-3"
              options={CURRENCIES.map((c) => ({ value: c, label: t(`u.cur.${c}`) }))}
            />

            <div>
              <label htmlFor="cd-price" className="block text-sm font-medium text-body mb-2">{t('u.price')}</label>
              <Suffixed id="cd-price" value={price} onChange={(v) => setPrice(fmtIn(v))} suffix={fxSuffix} />
            </div>
            <div>
              <label htmlFor="cd-local" className="block text-sm font-medium text-body mb-2">{t('u.local')}</label>
              <Suffixed id="cd-local" value={local} onChange={(v) => setLocal(fmtIn(v))} suffix={fxSuffix} placeholder="0" describedBy="cd-local-hint" />
              <p id="cd-local-hint" className="text-xs text-muted mt-1.5">{t('u.localHint')}</p>
            </div>
            <div>
              <label htmlFor="cd-ship" className="block text-sm font-medium text-body mb-2">{t('u.ship')}</label>
              <Suffixed id="cd-ship" value={ship} onChange={(v) => setShip(fmtIn(v))} suffix={fxSuffix} placeholder="0" describedBy="cd-ship-hint" />
              <p id="cd-ship-hint" className="text-xs text-muted mt-1.5">{t('u.shipHint')}</p>
            </div>

            {cur !== 'KRW' && (
              <div>
                <label htmlFor="cd-rate" className="block text-sm font-medium text-body mb-2">{t('u.rate.label', { unit: unitLabel })}</label>
                <Suffixed id="cd-rate" value={rateShown} onChange={(v) => setRateText(fmtIn(v))} suffix={t('u.won')} describedBy="cd-rate-src" />
                <p id="cd-rate-src" className="text-xs text-muted mt-1.5">{rateText != null ? t('u.rate.manual') : rateSrc}</p>
                {rateText != null && (
                  <button type="button" onClick={() => setRateText(null)} className="ui-btn-soft px-3 py-2 text-sm mt-2 min-h-11">{t('u.rate.reset')}</button>
                )}
              </div>
            )}
            {cur !== 'USD' && (
              <div>
                <label htmlFor="cd-usd" className="block text-sm font-medium text-body mb-2">{t('u.rate.usdLabel')}</label>
                <Suffixed id="cd-usd" value={usdShown} onChange={(v) => setUsdText(fmtIn(v))} suffix={t('u.won')} describedBy="cd-usd-hint" />
                <p id="cd-usd-hint" className="text-xs text-muted mt-1.5">{usdText != null ? t('u.rate.manual') : t('u.rate.usdHint')}</p>
                {usdText != null && (
                  <button type="button" onClick={() => setUsdText(null)} className="ui-btn-soft px-3 py-2 text-sm mt-2 min-h-11">{t('u.rate.reset')}</button>
                )}
              </div>
            )}
            <p className="text-xs text-muted">
              {t('u.rate.hint')}{' '}
              <a href={UNIPASS_FX} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">{t('u.rate.official')}</a>
            </p>

            <div>
              <label htmlFor="cd-other" className="block text-sm font-medium text-body mb-2">{t('u.other')}</label>
              <Suffixed id="cd-other" value={other} onChange={(v) => setOther(fmtIn(v))} suffix={fxSuffix} placeholder="0" describedBy="cd-other-hint" />
              <p id="cd-other-hint" className="text-xs text-muted mt-1.5">{t('u.otherHint')}</p>
            </div>
          </div>
        </div>

        {/* 결과 */}
        <div className="lg:col-span-2 space-y-6">
          <div className="ui-card p-6 space-y-5">
            <div aria-live="polite" aria-atomic="true">
              <p className={`inline-block rounded-full px-3 py-1 text-sm font-semibold ${r.exempt ? 'bg-primary-soft text-primary' : 'bg-amber-50 text-amber-800'}`}>
                {r.exempt ? t('u.res.exempt', { way }) : t('u.res.taxed', { way })}
              </p>
              <p className="text-sm text-muted mt-3">{t('u.res.label')}</p>
              <p className="text-3xl font-bold text-fg tabular-nums mt-1">{won(r.total)}{t('u.won')}</p>
              <p className="text-sm text-sub mt-2">
                {r.exempt
                  ? cur === 'USD'
                    ? t('u.res.remain', { goods: usd(r.goodsUsd), limit: r.limit, remain: usd(r.remainUsd) })
                    : t('u.res.remainFx', { goods: usd(r.goodsUsd), limit: r.limit, remain: usd(r.remainUsd), fx: money(r.remainFx, cur), cur: fxSuffix.trim() })
                  : t('u.res.over', { goods: usd(r.goodsUsd), limit: r.limit, over: usd(r.overUsd) })}
              </p>
            </div>

            <div aria-hidden="true">
              <div className="h-2 rounded-full bg-track overflow-hidden">
                <div className={`h-2 rounded-full ${r.exempt ? 'bg-primary' : 'bg-amber-500'}`} style={{ width: `${fill}%` }} />
              </div>
              <div className="flex justify-between text-xs text-muted mt-1 tabular-nums">
                <span>$0</span>
                <span>{t('u.res.limitTick', { limit: r.limit })}</span>
              </div>
            </div>

            <div className="divide-y divide-line border-y border-line text-sm">
              <Row
                label={t('u.row.goods')}
                value={cur === 'USD' ? `$${usd(r.goodsUsd)}` : `${money(goodsFx, cur)} ${fxSuffix} ≈ $${usd(r.goodsUsd)}`}
              />
              <Row label={t('u.row.value')} value={r.exempt ? t('u.row.none') : `${won(r.value)}${t('u.won')}`} />
              {taxRows.filter((x) => x.show).map((x) => (
                <Row
                  key={x.k}
                  label={x.label}
                  value={r.waived.includes(x.k) ? t('u.row.waived', { amount: won(r.raw[x.k]) }) : `${won(r.tax[x.k])}${t('u.won')}`}
                />
              ))}
              <Row label={t('u.row.total')} value={`${won(r.total)}${t('u.won')}`} strong />
              <Row label={t('u.row.paid')} value={`${won(r.paidKrw)}${t('u.won')}`} />
              <Row label={t('u.row.totalKrw')} value={`${won(r.totalKrw)}${t('u.won')}`} strong />
            </div>

            {r.combined && (
              <Note tone="warn">{t('u.warn.combined', { own: usd(r.ownUsd), goods: usd(r.goodsUsd), limit: r.limit })}</Note>
            )}
            {r.shipRisk && <Note>{t('u.warn.ship', { limit: r.limit })}</Note>}
            {r.waived.length > 0 && <Note>{t('u.warn.min')}</Note>}
            {origin === 'us' && clearance === 'general' && <Note>{t('u.warn.usGeneral')}</Note>}
            {luxury && <Note>{t('u.warn.luxury')}</Note>}

            <ShareResult
              card={{
                tool: t('title'),
                label: r.exempt ? t('u.share.labelExempt') : t('u.share.labelTaxed'),
                headline: `${won(r.total)}${t('u.won')}`,
                sub: `${t(`u.item.opt.${itemId}`)} · ${t(`u.origin.${origin}`)} · ${way}`,
                rows: [
                  { label: t('u.row.goods'), value: `$${usd(r.goodsUsd)} / $${r.limit}` },
                  { label: t('u.row.duty', { rate: dutyRate }), value: `${won(r.tax.duty)}${t('u.won')}` },
                  { label: t('u.row.vat'), value: `${won(r.tax.vat)}${t('u.won')}` },
                  { label: t('u.row.totalKrw'), value: `${won(r.totalKrw)}${t('u.won')}` },
                ],
              }}
              text={r.exempt
                ? t('u.share.textExempt', { goods: usd(r.goodsUsd), limit: r.limit })
                : t('u.share.textTaxed', { goods: usd(r.goodsUsd), tax: won(r.total) })}
            />
          </div>

          {/* 면세 한도 한눈에 */}
          <div className="ui-card p-6 space-y-4">
            <h2 className="text-lg font-semibold text-fg">{t('u.limits.title')}</h2>
            <div className="divide-y divide-line border-y border-line text-sm">
              {(t.raw('u.limits.rows') as string[][]).map(([label, amount], i) => (
                <div key={label} className={`flex items-center justify-between gap-4 py-2.5 px-1 ${i === limitRow ? 'bg-primary-soft' : ''}`}>
                  <span className={i === limitRow ? 'text-primary font-semibold' : 'text-body'}>
                    {label}{i === limitRow && <span className="sr-only"> {t('u.limits.current')}</span>}
                  </span>
                  <span className="tabular-nums font-semibold text-fg">{amount}</span>
                </div>
              ))}
            </div>
            <ul className="list-disc pl-5 space-y-1.5 text-sm text-sub">
              {(t.raw('u.limits.formula') as string[]).map((s) => <li key={s}>{s}</li>)}
            </ul>
          </div>

          <p className="text-xs text-faint">{t('u.disclaimer')}</p>
        </div>
      </div>

      {/* 가이드 */}
      <div className="ui-card p-6 space-y-6">
        <h2 className="text-xl font-semibold text-fg">{t('guide.title')}</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {(['clearance', 'combined', 'refund', 'tips'] as const).map((sec) => (
            <div key={sec}>
              <h3 className="font-semibold text-fg mb-3">{t(`guide.${sec}.title`)}</h3>
              <ul className="list-disc pl-5 space-y-2 text-sm text-sub">
                {(t.raw(`guide.${sec}.items`) as string[]).map((s) => <li key={s}>{s}</li>)}
              </ul>
            </div>
          ))}
        </div>

        <div>
          <h3 className="font-semibold text-fg mb-3">{t('guide.faq.title')}</h3>
          <div className="divide-y divide-line border-y border-line">
            {faq.map((f) => (
              <details key={f.q} className="py-3">
                <summary className="cursor-pointer text-sm font-medium text-body min-h-11 flex items-center">{f.q}</summary>
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
          {LINKS.map((href) => (
            <Link key={href} href={`/${href}/`} className="ui-btn-soft px-3 py-2 text-sm min-h-11 inline-flex items-center">{t(`guide.links.${href}`)}</Link>
          ))}
        </div>
      </div>
    </div>
  )
}

/** 세그먼트 버튼 = 네이티브 라디오 (화살표 키·스크린리더 지원) */
function Seg<T extends string>({ name, legend, value, options, onChange, cols, hint }: {
  name: string
  legend: string
  value: T
  options: { value: T; label: string }[]
  onChange: (v: T) => void
  cols: string
  hint?: string
}) {
  return (
    <fieldset>
      <legend className="block text-sm font-medium text-body mb-2">{legend}</legend>
      <div className={`grid gap-2 ${cols}`}>
        {options.map((o) => (
          <label key={o.value} className="relative">
            <input type="radio" name={name} value={o.value} checked={value === o.value} onChange={() => onChange(o.value)} className="peer sr-only" />
            <span className="flex min-h-11 cursor-pointer items-center justify-center rounded-lg px-2 py-2 text-center text-sm font-medium transition-colors bg-soft text-body hover:bg-subtle peer-checked:bg-primary peer-checked:text-white peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-primary">
              {o.label}
            </span>
          </label>
        ))}
      </div>
      {hint && <p className="text-xs text-muted mt-1.5">{hint}</p>}
    </fieldset>
  )
}

function Suffixed({ id, value, onChange, suffix, placeholder, describedBy }: {
  id: string
  value: string
  onChange: (v: string) => void
  suffix: string
  placeholder?: string
  describedBy?: string
}) {
  return (
    <div className="relative">
      <input
        id={id} type="text" inputMode="decimal" autoComplete="off" value={value} placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)} aria-describedby={describedBy}
        className="ui-field w-full px-4 py-3 pr-16 tabular-nums"
      />
      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-muted pointer-events-none">{suffix}</span>
    </div>
  )
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4 py-2.5">
      <span className="text-body">{label}</span>
      <span className={`tabular-nums text-right ${strong ? 'font-semibold text-fg' : 'text-sub'}`}>{value}</span>
    </div>
  )
}

function Note({ children, tone }: { children: ReactNode; tone?: 'warn' }) {
  return (
    <p className={`rounded-2xl p-4 text-sm ${tone === 'warn' ? 'bg-amber-50 text-amber-800' : 'bg-subtle text-sub'}`}>{children}</p>
  )
}
