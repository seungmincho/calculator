'use client'

import { useMemo, useState, useSyncExternalStore, type FormEvent } from 'react'
import { useTranslations } from '@/lib/i18n'
import '@/lib/i18n/ns/feverMedicineDose'
import { useSearchParams } from '@/hooks/useSearchParams'
import { useHydrated } from '@/hooks/useHydrated'
import ShareResult from '@/components/ShareResult'
import MobileResultLink from '@/components/MobileResultLink'
import {
  A_RANGE, CHECKED, CROSS_HOURS, C_RANGE, DAY, DEFAULT, INGS, LOG_KEY, PRODUCTS, RULES, SOURCES, TABLES, W_RANGE,
  dailyMaxMg, doseMaxMg, doseRange, floor1, gates, labelRow, nextDose, parseLog, parseState, productOf, resolve, rowWithin,
  timeToEpoch, toQuery, type Dose, type Ing, type State,
} from '@/utils/feverMedicineDose'

const fmt = (n: number) => n.toLocaleString('ko-KR', { maximumFractionDigits: 1 })
const span = (lo: number, hi: number) => (lo === hi ? fmt(lo) : `${fmt(lo)}~${fmt(hi)}`)
const pad = (n: number) => String(n).padStart(2, '0')
const hm = (t: number) => { const d = new Date(t); return `${pad(d.getHours())}:${pad(d.getMinutes())}` }
const decimal = (v: string) => v.replace(/[^\d.]/g, '').replace(/(\..*)\./g, '$1').slice(0, 5)
const inRange = (s: string, [lo, hi]: readonly [number, number]) => s.trim() !== '' && Number(s) >= lo && Number(s) <= hi
// 시계는 마운트 뒤에만(서버·첫 렌더는 0). 분 단위라 스냅샷이 1분 동안 같다
const subscribeClock = (cb: () => void) => { const id = setInterval(cb, 15_000); return () => clearInterval(id) }
const epochNow = () => Date.now() // 이벤트 핸들러에서만 부른다
const minuteNow = () => Math.floor(epochNow() / 60_000) * 60_000
const serverNow = () => 0
const ML_RANGE = [0.1, 50] as const
const GUIDE = ['ingredients', 'alternate', 'doctor', 'measure'] as const
const SOURCE_KEYS = ['mfds2025', 'mfds2023', 'msd'] as const

const seg = (on: boolean) => `min-h-11 px-3 py-2 rounded-xl text-sm font-medium transition-colors ${on ? 'bg-primary text-white' : 'bg-soft text-body hover:bg-subtle'}`
const optCard = (on: boolean) => `min-h-11 w-full rounded-xl border px-3 py-2.5 text-left transition-colors ${on ? 'bg-primary-soft text-primary border-primary' : 'bg-surface text-body border-line hover:bg-soft'}`
const labelCls = 'block text-sm font-medium text-body mb-1.5'
const warnCls = 'bg-amber-50 text-amber-800 rounded-2xl px-4 py-3 text-sm'
const unitCls = 'absolute right-4 top-1/2 -translate-y-1/2 text-sm text-muted pointer-events-none'

export default function FeverMedicineDose() {
  const t = useTranslations('feverMedicineDose')
  const sp = useSearchParams()
  const hydrated = useHydrated()
  const now = useSyncExternalStore(subscribeClock, minuteNow, serverNow)

  // URL → 값. 하이드레이션 전에는 기본값이라 첫 렌더가 정적 HTML 과 같다. 사용자가 고치면 그 값이 우선, URL 은 기본값과 다른 것만
  const fromUrl = useMemo(() => (hydrated ? parseState((k) => sp.get(k)) : DEFAULT), [hydrated, sp])
  const [edited, setEdited] = useState<State | null>(null)
  const s = edited ?? fromUrl
  const [wDraft, setWDraft] = useState<string | null>(null)
  const [cDraft, setCDraft] = useState<string | null>(null)

  const commit = (next: State) => {
    setEdited(next)
    const qs = toQuery(next)
    window.history.replaceState(window.history.state, '', `${window.location.pathname}${qs ? `?${qs}` : ''}${window.location.hash}`)
  }
  const pick = (p: string) => {
    const prod = productOf(p)
    setCDraft(null)
    commit({ ...s, p, c: prod ? prod.conc : RULES[p as Ing].stdConc })
  }

  const { ing, conc, product, std } = resolve(s.p, s.c)
  const wText = wDraft ?? String(s.w)
  const cText = cDraft ?? String(conc)
  const wBad = !inRange(wText, W_RANGE)
  const cBad = !product && !inRange(cText, C_RANGE)
  const w = s.w
  const g = gates(ing, s.a)
  const showDose = !wBad && !cBad && !g.tooYoung
  const range = doseRange(ing, w, conc)
  const rule = RULES[ing]
  const table = TABLES[ing]
  const rowIdx = std ? labelRow(ing, w, s.a) : null
  const row = rowIdx === null ? null : table.rows[rowIdx]
  const refProduct = productOf(table.ref)!
  const sameTable = PRODUCTS.filter((p) => p.ing === ing && p.id !== table.ref).map((p) => p.name)
  const dMax = dailyMaxMg(ing, w)
  const ingName = t(`ing.${ing}`)
  const productName = product ? product.name : t('result.genericName', { ing: ingName, c: fmt(conc) })
  const doseMl = span(range.ml[0], range.ml[1])
  const resultLabel = t('result.label', { w: fmt(w), ing: ingName })
  const years = Math.floor(s.a / 12)
  const months = s.a % 12

  // ── 복용 기록: 하이드레이션 뒤 한 번만 읽는다
  const [log, setLog] = useState<Dose[]>([])
  const [loaded, setLoaded] = useState(false)
  const [storageOk, setStorageOk] = useState(true)
  const [logIng, setLogIng] = useState<Ing | null>(null)
  const [mlDraft, setMlDraft] = useState<string | null>(null)
  const [timeDraft, setTimeDraft] = useState<string | null>(null)
  const [confirmClear, setConfirmClear] = useState(false)
  if (hydrated && now > 0 && !loaded) {
    setLoaded(true)
    try { setLog(parseLog(window.localStorage.getItem(LOG_KEY), now)) } catch { setStorageOk(false) }
  }
  const persist = (next: Dose[]) => {
    setLog(next)
    try { window.localStorage.setItem(LOG_KEY, JSON.stringify(next)); setStorageOk(true) } catch { setStorageOk(false) }
  }
  const fIng = logIng ?? ing
  const fConc = fIng === ing ? conc : RULES[fIng].stdConc
  // 기본 mL: 허가 표 줄이 한 값이고 체중 범위 안이면 그 값, 아니면 체중 범위 하한
  const suggested = fIng === ing && showDose ? (row && row.ml[0] === row.ml[1] && rowWithin(row, range.ml) ? row.ml[0] : range.ml[0]) : null
  const mlText = mlDraft ?? (suggested === null ? '' : String(suggested))
  const mlBad = !inRange(mlText, ML_RANGE)
  const timeText = timeDraft ?? (now ? hm(now) : '')
  const add = (e: FormEvent) => {
    e.preventDefault()
    if (mlBad) return
    const at = epochNow()
    const when = timeDraft ? timeToEpoch(timeDraft, at) : at
    if (when === null) return
    const ml = Math.round(Number(mlText) * 10) / 10
    persist(parseLog(JSON.stringify([...log, { t: when, ing: fIng, ml, mg: Math.round(ml * fConc * 10) / 10 }]), at))
    setMlDraft(null)
    setTimeDraft(null)
    setConfirmClear(false)
  }
  const dayLabel = (at: number) => {
    const a = new Date(at), b = new Date(now)
    a.setHours(0, 0, 0, 0)
    b.setHours(0, 0, 0, 0)
    const n = Math.round((b.getTime() - a.getTime()) / DAY)
    return n === 0 ? t('log.day.today') : n === 1 ? t('log.day.yesterday') : n === -1 ? t('log.day.tomorrow') : t('log.day.ago', { n })
  }
  const statusIngs = INGS.filter((i) => i === ing || log.some((d) => d.ing === i))
  const recent = log.filter((d) => d.t > now - DAY)
  const mixedNsaid = recent.some((d) => d.ing === 'ibu') && recent.some((d) => d.ing === 'dexi')

  const faq = t.raw('guide.faq.items') as { q: string; a: string }[]
  const redFlags = t.raw('redFlags.items') as string[]

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-fg">{t('title')}</h1>
        <p className="text-sm text-muted mt-1">{t('subtitle')}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* 입력 */}
        <section className="ui-card p-6 space-y-6 min-w-0" aria-labelledby="fmd-input">
          <MobileResultLink href="#fever-medicine-dose-result" label={resultLabel} value={showDose ? `${doseMl} mL` : '—'} />
          <h2 id="fmd-input" className="text-lg font-semibold text-fg">{t('input.title')}</h2>

          <div>
            <label htmlFor="fmd-weight" className={labelCls}>{t('input.weight')}</label>
            <div className="relative">
              <input
                id="fmd-weight" inputMode="decimal" autoComplete="off" value={wText}
                onChange={(e) => {
                  const v = decimal(e.target.value)
                  setWDraft(v)
                  if (inRange(v, W_RANGE)) commit({ ...s, w: Math.round(Number(v) * 10) / 10 })
                }}
                onBlur={() => setWDraft(null)}
                aria-invalid={wBad || undefined} aria-describedby="fmd-weight-hint"
                className="ui-field w-full min-h-11 px-4 py-3 pr-12 text-base tabular-nums"
              />
              <span className={unitCls}>kg</span>
            </div>
            <p id="fmd-weight-hint" className={wBad ? 'mt-1.5 rounded-lg bg-amber-50 px-2 py-1 text-xs text-amber-800' : 'mt-1.5 text-xs text-muted'}>
              {wBad ? t('input.weightErr', { min: W_RANGE[0], max: W_RANGE[1] }) : t('input.weightHint')}
            </p>
          </div>

          <fieldset>
            <legend className={labelCls}>{t('input.age')}</legend>
            <div className="grid grid-cols-2 gap-3">
              <select id="fmd-years" aria-label={t('input.yearsAria')} value={years}
                onChange={(e) => commit({ ...s, a: Math.min(Number(e.target.value) * 12 + months, A_RANGE[1]) })}
                className="ui-field w-full min-h-11 px-3 py-3 text-base tabular-nums">
                {Array.from({ length: A_RANGE[1] / 12 + 1 }, (_, y) => <option key={y} value={y}>{t('input.yearsOpt', { n: y })}</option>)}
              </select>
              <select id="fmd-months" aria-label={t('input.monthsAria')} value={months} disabled={years * 12 >= A_RANGE[1]}
                onChange={(e) => commit({ ...s, a: Math.min(years * 12 + Number(e.target.value), A_RANGE[1]) })}
                className="ui-field w-full min-h-11 px-3 py-3 text-base tabular-nums disabled:opacity-50">
                {Array.from({ length: 12 }, (_, m) => <option key={m} value={m}>{t('input.monthsOpt', { n: m })}</option>)}
              </select>
            </div>
            <p className="mt-1.5 text-xs text-muted tabular-nums">{t('input.ageHint', { n: s.a })}</p>
          </fieldset>

          <div>
            <p id="fmd-ing" className={labelCls}>{t('input.ingredient')}</p>
            <div role="group" aria-labelledby="fmd-ing" className="flex flex-wrap gap-2">
              {INGS.map((i) => (
                <button key={i} type="button" aria-pressed={ing === i} onClick={() => ing !== i && pick(i)} className={seg(ing === i)}>{t(`ing.${i}`)}</button>
              ))}
            </div>
            <p className="mt-1.5 text-xs text-muted">{t('input.ingredientHint')}</p>
          </div>

          <div>
            <p id="fmd-product" className={labelCls}>{t('input.product')}</p>
            <div role="group" aria-labelledby="fmd-product" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-2">
              <button type="button" aria-pressed={!product} onClick={() => product && pick(ing)} className={optCard(!product)}>
                <span className="block text-sm font-semibold">{t('input.generic')}</span>
                <span className="block text-xs mt-0.5 opacity-80">{t('input.genericDesc')}</span>
              </button>
              {PRODUCTS.filter((p) => p.ing === ing).map((p) => (
                <button key={p.id} type="button" aria-pressed={product?.id === p.id} onClick={() => pick(p.id)} className={optCard(product?.id === p.id)}>
                  <span className="block text-sm font-semibold">{p.name}</span>
                  <span className="block text-xs mt-0.5 opacity-80 tabular-nums">{t('input.productDesc', { maker: p.maker, c: p.conc })}</span>
                </button>
              ))}
            </div>
          </div>

          {!product && (
            <div>
              <label htmlFor="fmd-conc" className={labelCls}>{t('input.conc')}</label>
              <div className="relative">
                <input
                  id="fmd-conc" inputMode="decimal" autoComplete="off" value={cText}
                  onChange={(e) => {
                    const v = decimal(e.target.value)
                    setCDraft(v)
                    if (inRange(v, C_RANGE)) commit({ ...s, c: Math.round(Number(v) * 10) / 10 })
                  }}
                  onBlur={() => setCDraft(null)}
                  aria-invalid={cBad || undefined} aria-describedby="fmd-conc-hint"
                  className="ui-field w-full min-h-11 px-4 py-3 pr-20 text-base tabular-nums"
                />
                <span className={unitCls}>mg/mL</span>
              </div>
              <p id="fmd-conc-hint" className={cBad ? 'mt-1.5 rounded-lg bg-amber-50 px-2 py-1 text-xs text-amber-800' : 'mt-1.5 text-xs text-muted'}>
                {cBad ? t('input.concErr', { min: C_RANGE[0], max: C_RANGE[1] }) : t('input.concHint', { c: rule.stdConc })}
              </p>
            </div>
          )}
        </section>

        {/* 결과 */}
        <div className="lg:col-span-2 min-w-0 space-y-4">
          <section id="fever-medicine-dose-result" className="ui-card p-6 space-y-5 scroll-mt-20 min-w-0" aria-labelledby="fmd-result-label">
            {g.under3m && <p role="alert" className="bg-red-50 text-red-700 rounded-2xl px-4 py-3 text-sm font-medium">{t('result.under3m')}</p>}

            <div aria-live="polite">
              <p id="fmd-result-label" className="text-sm text-sub">{resultLabel}</p>
              {showDose ? (
                <>
                  <p className="mt-1 text-3xl font-bold text-fg tabular-nums">{doseMl} mL</p>
                  <p className="mt-1 text-sm text-body tabular-nums">
                    {t('result.mg', { mg: span(range.mg[0], range.mg[1]), kLo: rule.mgPerKg[0], kHi: rule.mgPerKg[1], c: fmt(conc) })}
                  </p>
                </>
              ) : g.tooYoung && !wBad && !cBad ? (
                <div className={`${warnCls} mt-2 space-y-1`}>
                  <p>{t('result.tooYoung', { ing: ingName, m: rule.minMonths })}</p>
                  {ing !== 'apap' && s.a >= RULES.apap.minMonths && <p>{t('result.tooYoungApap', { m: RULES.apap.minMonths })}</p>}
                </div>
              ) : (
                <p className="mt-2 text-base text-body">{t('result.invalid')}</p>
              )}
            </div>

            {showDose && (
              <>
                <dl className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {[
                    ['interval', t(`result.intervalVal.${ing}`)],
                    ['times', t('result.timesVal', { n: rule.maxTimes })],
                    ['daily', t('result.dailyVal', { mg: fmt(floor1(dMax)), ml: fmt(floor1(dMax / conc)) })],
                  ].map(([k, v]) => (
                    <div key={k} className="bg-subtle rounded-2xl px-4 py-3">
                      <dt className="text-xs text-sub">{t(`result.${k}`)}</dt>
                      <dd className="mt-0.5 text-base font-semibold text-fg tabular-nums">{v}</dd>
                    </div>
                  ))}
                </dl>
                <ul className="space-y-1 text-xs text-muted">
                  <li>{t('result.dailyHow', { n: rule.maxTimes })}</li>
                  {range.capped && <li>{t('result.capped', { max: rule.maxDoseMg ?? 0, why: t(`result.cappedWhy.${ing}`) })}</li>}
                  {rule.maxDailyMg !== undefined && dMax >= rule.maxDailyMg && <li>{t('result.dailyCap')}</li>}
                  {ing === 'dexi' && <li>{t('result.dexiInterval')}</li>}
                </ul>

                {g.under2 && <p className={warnCls}>{t('result.under2')}</p>}

                {/* 제품 허가 표의 해당 줄 */}
                <div className="rounded-2xl border border-line p-4 space-y-3">
                  <h3 className="text-sm font-semibold text-fg">{t('label.title')}</h3>
                  {!std ? <p className="text-sm text-sub">{t('label.noStd', { c: rule.stdConc })}</p> : (
                    <>
                      <p className="text-xs text-muted">
                        {t('label.from', { name: refProduct.name })}
                        {sameTable.length > 0 && ` ${t('label.sameValues', { names: sameTable.join('·') })}`}
                      </p>
                      {row ? (
                        <>
                          <dl className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-2">
                            {table.cols.map((col, i) => (
                              <div key={col} className="min-w-0">
                                <dt className="text-xs text-sub">{t(`label.cols.${col}`)}</dt>
                                <dd className="text-sm font-semibold text-fg tabular-nums [overflow-wrap:anywhere]">{row.cells[i]}</dd>
                              </div>
                            ))}
                          </dl>
                          <p className="text-xs text-muted">{t(`label.by.${table.by}`)}</p>
                          {rowWithin(row, range.ml)
                            ? <p className="text-sm text-body">{t('label.match')}</p>
                            : <p className={warnCls}>{t('label.differ')}</p>}
                        </>
                      ) : <p className={warnCls}>{t('label.none')}</p>}
                      <details className="rounded-xl bg-subtle">
                        <summary className="cursor-pointer min-h-11 flex items-center px-4 text-sm font-medium text-body">{t('label.all')}</summary>
                        <div className="overflow-x-auto px-4 pb-4">
                          <table className="w-full min-w-[20rem] text-sm">
                            <caption className="sr-only">{t('label.caption', { name: refProduct.name })}</caption>
                            <thead>
                              <tr className="border-b border-line text-left text-sub">
                                {table.cols.map((col) => <th key={col} scope="col" className="py-2 pr-3 font-medium">{t(`label.cols.${col}`)}</th>)}
                              </tr>
                            </thead>
                            <tbody>
                              {table.rows.map((r, i) => (
                                <tr key={r.cells[0]} className={`border-b border-line ${i === rowIdx ? 'bg-primary-soft text-primary font-semibold' : 'text-body'}`}>
                                  {r.cells.map((c, j) => <td key={j} className="py-2 pr-3 tabular-nums whitespace-nowrap">{c}</td>)}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </details>
                      <a href={(product ?? refProduct).url} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center text-sm font-medium text-primary hover:underline">
                        {t('label.link', { name: (product ?? refProduct).name })}
                      </a>
                    </>
                  )}
                </div>
              </>
            )}

            <p className="text-xs text-muted leading-relaxed">{t('result.disclaimer')}</p>
          </section>

          {showDose && (
            <ShareResult
              fileName="fever-medicine-dose"
              card={{
                tool: t('share.tool'),
                label: resultLabel,
                headline: t('share.headline', { ml: doseMl }),
                sub: t('share.sub', { product: productName, w: fmt(w) }),
                rows: [
                  { label: t('share.rows.mg'), value: `${span(range.mg[0], range.mg[1])}mg` },
                  { label: t('result.interval'), value: t(`result.intervalVal.${ing}`) },
                  { label: t('share.rows.daily'), value: `${t('result.timesVal', { n: rule.maxTimes })} · ${fmt(floor1(dMax))}mg` },
                  ...(row ? [{ label: t('share.rows.label'), value: row.cells.join(' · ') }] : []),
                ],
              }}
              text={t('share.text', { w: fmt(w), product: productName, ml: doseMl, mg: span(range.mg[0], range.mg[1]), interval: t(`result.intervalVal.${ing}`) })}
            />
          )}

          <section className="bg-amber-50 text-amber-800 rounded-2xl p-5 text-sm space-y-2" aria-labelledby="fmd-red">
            <h2 id="fmd-red" className="font-semibold">{t('redFlags.title')}</h2>
            <ul className="list-disc pl-5 space-y-1">{redFlags.map((x) => <li key={x}>{x}</li>)}</ul>
            <p className="text-xs">{t('redFlags.src')}</p>
          </section>
        </div>
      </div>

      {/* 복용 기록 */}
      <section className="ui-card p-6 space-y-5" aria-labelledby="fmd-log">
        <div>
          <h2 id="fmd-log" className="text-lg font-semibold text-fg">{t('log.title')}</h2>
          <p className="text-sm text-muted mt-1">{t('log.desc')}</p>
        </div>

        {log.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {statusIngs.map((i) => {
              const r = nextDose(log, i, now, w)
              return (
                <div key={i} className="bg-subtle rounded-2xl px-4 py-3 min-w-0">
                  <p className="text-sm font-medium text-body">{t(`ing.${i}`)}</p>
                  <p className="mt-0.5 text-base font-semibold text-fg tabular-nums">
                    {r.at === null ? t('log.ready') : t('log.after', { when: dayLabel(r.at), time: hm(r.at) })}
                  </p>
                  {r.reason && <p className="text-xs text-sub">{t(`log.reason.${r.reason}`, { h: RULES[i].minHours, n: r.maxTimes, c: CROSS_HOURS })}</p>}
                  <p className="mt-1 text-xs text-muted tabular-nums">{t('log.usage', { n: r.count, max: r.maxTimes, mg: fmt(r.mg), maxMg: fmt(floor1(r.maxMg)) })}</p>
                </div>
              )
            })}
          </div>
        )}
        {mixedNsaid && <p className={warnCls}>{t('log.mixedNsaid')}</p>}

        <form onSubmit={add} className="grid grid-cols-1 sm:grid-cols-[auto_1fr_1fr_auto] gap-3 sm:items-end">
          <div className="min-w-0">
            <label htmlFor="fmd-log-ing" className={labelCls}>{t('log.ing')}</label>
            <select id="fmd-log-ing" value={fIng} onChange={(e) => { setLogIng(e.target.value as Ing); setMlDraft(null) }}
              className="ui-field w-full min-h-11 px-3 py-3 text-base">
              {INGS.map((i) => <option key={i} value={i}>{t(`ing.${i}`)}</option>)}
            </select>
          </div>
          <div className="min-w-0">
            <label htmlFor="fmd-log-ml" className={labelCls}>{t('log.ml')}</label>
            <div className="relative">
              <input id="fmd-log-ml" inputMode="decimal" autoComplete="off" value={mlText} aria-describedby="fmd-log-ml-hint"
                onChange={(e) => setMlDraft(decimal(e.target.value))}
                className="ui-field w-full min-h-11 px-4 py-3 pr-12 text-base tabular-nums" />
              <span className={unitCls}>mL</span>
            </div>
          </div>
          <div className="min-w-0">
            <label htmlFor="fmd-log-time" className={labelCls}>{t('log.time')}</label>
            <input id="fmd-log-time" type="time" value={timeText} onChange={(e) => setTimeDraft(e.target.value)}
              className="ui-field w-full min-h-11 px-4 py-3 text-base tabular-nums" />
          </div>
          <button type="submit" disabled={mlBad || !loaded} className="ui-btn min-h-11 px-4 py-3 disabled:opacity-50">{t('log.add')}</button>
        </form>
        <div id="fmd-log-ml-hint" className="text-xs text-muted tabular-nums -mt-2 space-y-0.5">
          {mlText.trim() !== '' && (mlBad
            ? <p className="inline-block rounded-lg bg-amber-50 px-2 py-1 text-amber-800">{t('log.mlErr', { min: ML_RANGE[0], max: ML_RANGE[1] })}</p>
            : <p>{t('log.mgPreview', { mg: fmt(Math.round(Number(mlText) * fConc * 10) / 10), c: fmt(fConc) })}</p>)}
          <p>{t('log.timeHint')}</p>
        </div>
        {!storageOk && <p className={warnCls}>{t('log.storageError')}</p>}

        {log.length === 0 ? <p className="bg-subtle rounded-2xl p-5 text-sm text-sub">{t('log.empty')}</p> : (
          <>
            <ul className="divide-y divide-line border-y border-line">
              {log.map((d, i) => ({ d, i })).reverse().map(({ d, i }) => {
                const over = d.mg > doseMaxMg(d.ing, w) + 1e-6
                return (
                  <li key={`${d.t}-${i}`} className="flex items-center justify-between gap-3 py-2.5">
                    <div className="min-w-0 text-sm">
                      <p className="text-body tabular-nums">
                        <span className="font-semibold text-fg">{dayLabel(d.t)} {hm(d.t)}</span>
                        <span className="ml-2">{t(`ing.${d.ing}`)}</span>
                        <span className="ml-2">{t('log.amount', { ml: fmt(d.ml), mg: fmt(d.mg) })}</span>
                      </p>
                      {over && <p className="mt-1 inline-block rounded-lg bg-amber-50 px-2 py-0.5 text-xs text-amber-800">{t('log.overDose', { mg: fmt(floor1(doseMaxMg(d.ing, w))) })}</p>}
                    </div>
                    <button type="button" onClick={() => persist(log.filter((_, j) => j !== i))}
                      aria-label={t('log.deleteAria', { time: hm(d.t), ing: t(`ing.${d.ing}`) })}
                      className="ui-btn-soft min-h-11 px-3 py-2 text-sm shrink-0">{t('log.delete')}</button>
                  </li>
                )
              })}
            </ul>
            <button type="button" onClick={() => { if (confirmClear) { persist([]); setConfirmClear(false) } else setConfirmClear(true) }}
              className={`min-h-11 px-4 py-2 rounded-xl text-sm ${confirmClear ? 'bg-amber-50 text-amber-800' : 'bg-soft text-body hover:bg-subtle'}`}>
              {t(confirmClear ? 'log.clearConfirm' : 'log.clear')}
            </button>
          </>
        )}
        <p className="bg-subtle rounded-2xl p-5 text-sm text-sub">{t('log.crossNote', { c: CROSS_HOURS })}</p>
      </section>

      {/* 가이드 */}
      <div className="ui-card p-6 space-y-6">
        <h2 className="text-xl font-semibold text-fg">{t('guide.title')}</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
            {SOURCE_KEYS.map((k) => (
              <li key={k}><a href={SOURCES[k]} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline [overflow-wrap:anywhere]">{t(`sources.${k}`)}</a></li>
            ))}
            {PRODUCTS.map((p) => (
              <li key={p.id}><a href={p.url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline [overflow-wrap:anywhere]">{t('sources.product', { name: p.name, maker: p.maker })}</a></li>
            ))}
          </ul>
          <p className="text-xs text-muted">{t('sources.method')}</p>
          <p className="text-xs text-muted">{t('sources.asOf', { date: CHECKED })}</p>
        </section>
      </div>
    </div>
  )
}
