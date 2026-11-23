'use client'

import { useMemo, useState, useSyncExternalStore } from 'react'
import { useTranslations } from '@/lib/i18n'
import '@/lib/i18n/ns/tireSize'
import { useSearchParams } from '@/hooks/useSearchParams'
import { useHydrated } from '@/hooks/useHydrated'
import ShareResult from '@/components/ShareResult'
import MobileResultLink from '@/components/MobileResultLink'
import {
  AGE_CHECK, AGE_REPLACE, CHECKED, DEFAULT, LOAD_KG, MM_PER_INCH, PRESETS, SOURCES, SPEED_KMH,
  compare, dims, formatSize, inchUps, parseDot, parseSize, parseState, toQuery, type Size, type State,
} from '@/utils/tireSize'

const f1 = (n: number) => n.toLocaleString('ko-KR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })
const f0 = (n: number) => Math.round(n).toLocaleString('ko-KR')
const signed = (n: number, d = 2) => `${n > 0 ? '+' : n < 0 ? '-' : ''}${Math.abs(n).toFixed(d)}`
const sizeOf = (s: string): Size => { const r = parseSize(s); return r.ok ? r.size : (parseSize(DEFAULT.a) as { ok: true; size: Size }).size }
// 오늘(로컬 날짜의 UTC 0시). 서버·첫 렌더는 0
const subscribeDay = (cb: () => void) => { const id = setInterval(cb, 60_000); return () => clearInterval(id) }
const dayNow = () => { const d = new Date(); return Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) }
const dayServer = () => 0
const SPEEDS = [60, 80, 100, 120] as const
const GUIDE = ['inchUp', 'dot', 'season'] as const
const SOURCE_KEYS = ['rule', 'michelinSize', 'michelinAge', 'continental', 'michelinFaq', 'hankookWinter'] as const
const KEYS = ['a', 'b'] as const

const chip = (on: boolean) => `min-h-11 px-3 py-2 rounded-xl text-sm font-medium tabular-nums transition-colors ${on ? 'bg-primary text-white' : 'bg-soft text-body hover:bg-subtle'}`
const labelCls = 'block text-sm font-medium text-body mb-1.5'
const warnCls = 'bg-amber-50 text-amber-800 rounded-2xl px-4 py-3 text-sm'

export default function TireSize() {
  const t = useTranslations('tireSize')
  const sp = useSearchParams()
  const hydrated = useHydrated()
  const today = useSyncExternalStore(subscribeDay, dayNow, dayServer)

  // URL → 값. 하이드레이션 전에는 기본값. 사용자가 고치면 그 값이 우선, URL 은 기본값과 다른 것만
  const fromUrl = useMemo(() => (hydrated ? parseState((k) => sp.get(k)) : DEFAULT), [hydrated, sp])
  const [edited, setEdited] = useState<State | null>(null)
  const s = edited ?? fromUrl
  const [draft, setDraft] = useState<Record<'a' | 'b', string | null>>({ a: null, b: null })
  const [dot, setDot] = useState('')

  const commit = (next: State) => {
    setEdited(next)
    const qs = toQuery(next)
    window.history.replaceState(window.history.state, '', `${window.location.pathname}${qs ? `?${qs}` : ''}${window.location.hash}`)
  }
  const setTire = (k: 'a' | 'b', v: string) => { setDraft((d) => ({ ...d, [k]: null })); commit({ ...s, [k]: v }) }

  const A = sizeOf(s.a), B = sizeOf(s.b)
  const da = dims(A), db = dims(B)
  const cmp = compare(A, B)
  const pct = signed(cmp.pct)
  const actual100 = f1(cmp.actualAt(100))
  const ups = inchUps(A)
  const loadLower = A.li !== null && B.li !== null && B.li < A.li
  const speedLower = A.speed && B.speed ? SPEED_KMH[B.speed] < SPEED_KMH[A.speed] : false
  const label = t('result.label', { a: s.a, b: s.b })
  const bare = (z: Size) => formatSize({ ...z, li: null, speed: null, xl: false })
  const aBare = bare(A), bBare = bare(B)

  const consName = (z: Size) => t(`result.cons.${z.cons || 'R'}`)
  const loadVal = (z: Size) => (z.li === null ? '—' : t('result.loadVal', { kg: LOAD_KG[z.li].toLocaleString('ko-KR'), li: z.li }))
  const speedVal = (z: Size) => (!z.speed ? '—' : z.speed === 'Y' ? t('result.speedY') : t('result.speedVal', { kmh: SPEED_KMH[z.speed], s: z.speed }))
  const rows: [string, string, string][] = [
    ['width', `${A.width}mm`, `${B.width}mm`],
    ['aspect', `${A.aspect}%`, `${B.aspect}%`],
    ['rim', t('result.inch', { n: A.rim }), t('result.inch', { n: B.rim })],
    ['sidewall', `${f1(da.sidewall)}mm`, `${f1(db.sidewall)}mm`],
    ['diameter', `${f1(da.diameter)}mm`, `${f1(db.diameter)}mm`],
    ['circumference', `${f0(da.circumference)}mm`, `${f0(db.circumference)}mm`],
    ['revs', f1(da.revsPerKm), f1(db.revsPerKm)],
    ['load', loadVal(A), loadVal(B)],
    ['speed', speedVal(A), speedVal(B)],
    ['cons', consName(A), consName(B)],
  ]

  // 옆모습: 큰 쪽 외경 = 150px, 땅에 붙여 그린다
  const ground = 168
  const sc = 150 / Math.max(da.diameter, db.diameter)
  const tires = [{ k: 'A', z: A, d: da.diameter, cx: 80 }, { k: 'B', z: B, d: db.diameter, cx: 240 }]
  const topA = ground - da.diameter * sc

  const dotR = today ? parseDot(dot, today) : null
  const faq = t.raw('guide.faq.items') as { q: string; a: string }[]
  const parts = t.raw('guide.anatomy.parts') as { code: string; label: string }[]

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-fg">{t('title')}</h1>
        <p className="text-sm text-muted mt-1">{t('subtitle')}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* 입력 */}
        <section className="ui-card p-6 space-y-6 min-w-0" aria-labelledby="ts-input">
          <MobileResultLink href="#tire-size-result" label={t('result.mobileLabel')} value={`${pct}%`} />
          <h2 id="ts-input" className="text-lg font-semibold text-fg">{t('input.title')}</h2>

          {KEYS.map((k) => {
            const text = draft[k] ?? s[k]
            const r = parseSize(text)
            const bad = !r.ok
            return (
              <div key={k}>
                <label htmlFor={`ts-${k}`} className={labelCls}>{t(`input.${k}`)}</label>
                <input
                  id={`ts-${k}`} autoComplete="off" spellCheck={false} value={text} placeholder={t('input.placeholder')}
                  onChange={(e) => {
                    const v = e.target.value.slice(0, 40)
                    setDraft((d) => ({ ...d, [k]: v }))
                    const p = parseSize(v)
                    if (p.ok) commit({ ...s, [k]: formatSize(p.size) })
                  }}
                  onBlur={() => { if (parseSize(text).ok) setDraft((d) => ({ ...d, [k]: null })) }}
                  aria-invalid={bad || undefined} aria-describedby={`ts-${k}-hint`}
                  className="ui-field w-full min-h-11 px-4 py-3 text-base tabular-nums uppercase"
                />
                <p id={`ts-${k}-hint`} className={bad ? 'mt-1.5 rounded-lg bg-amber-50 px-2 py-1 text-xs text-amber-800' : 'mt-1.5 text-xs text-muted'}>
                  {r.ok ? t(`input.${k}Hint`) : t(`input.err.${r.err}`)}
                </p>
                {k === 'a' && (
                  <div className="mt-3">
                    <p id="ts-presets" className="text-xs text-sub mb-2">{t('input.presets')}</p>
                    <div role="group" aria-labelledby="ts-presets" className="flex flex-wrap gap-2">
                      {PRESETS.map((p) => (
                        <button key={p} type="button" aria-pressed={aBare === p}
                          onClick={() => setTire('a', p)} className={chip(aBare === p)}>{p}</button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )
          })}

          <button type="button" onClick={() => { setDraft({ a: null, b: null }); commit({ a: s.b, b: s.a }) }} className="ui-btn-soft min-h-11 px-4 py-2 text-sm w-full">
            {t('input.swap')}
          </button>
        </section>

        {/* 결과 */}
        <div className="lg:col-span-2 min-w-0 space-y-4">
          <section id="tire-size-result" className="ui-card p-6 space-y-5 scroll-mt-20 min-w-0" aria-labelledby="ts-result-label">
            <div aria-live="polite">
              <p id="ts-result-label" className="text-sm text-sub">{label}</p>
              <p className="mt-1 text-3xl font-bold text-fg tabular-nums">{t('result.headline', { pct })}</p>
              <p className="mt-1 text-sm text-body tabular-nums">
                {t(cmp.diffMm === 0 ? 'result.same' : cmp.diffMm > 0 ? 'result.bigger' : 'result.smaller', { mm: f1(Math.abs(cmp.diffMm)) })}
                {' · '}{t('result.speedo', { actual: actual100 })}
              </p>
            </div>

            {cmp.band === 'tight'
              ? <p className="bg-subtle rounded-2xl px-4 py-3 text-sm text-sub">{t('result.band.tight')}</p>
              : <p className={warnCls}>{t(`result.band.${cmp.band}`)}</p>}
            {loadLower && <p className={warnCls}>{t('result.loadLower', { a: A.li ?? 0, b: B.li ?? 0 })}</p>}
            {speedLower && <p className={warnCls}>{t('result.speedLower', { a: A.speed ?? '', b: B.speed ?? '' })}</p>}
            {(A.li === null || B.li === null) && <p className="text-xs text-muted">{t('result.noService')}</p>}

            {/* 옆모습 */}
            <svg viewBox="0 0 320 190" className="w-full max-w-md mx-auto" role="img" aria-label={t('result.svgAria', { a: f1(da.diameter), b: f1(db.diameter) })}>
              <line x1="10" x2="310" y1={ground} y2={ground} className="stroke-line-strong" strokeWidth="2" />
              <line x1="10" x2="310" y1={topA} y2={topA} className="stroke-primary" strokeWidth="1.5" strokeDasharray="5 4" />
              {tires.map(({ k, z, d, cx }) => {
                const r = (d / 2) * sc, rr = ((z.rim * MM_PER_INCH) / 2) * sc
                return (
                  <g key={k}>
                    <circle cx={cx} cy={ground - r} r={r} className="fill-sub" />
                    <circle cx={cx} cy={ground - r} r={rr} className="fill-surface stroke-line-strong" strokeWidth="2" />
                    <circle cx={cx} cy={ground - r} r={rr * 0.28} className="fill-track" />
                    <text x={cx} y={184} textAnchor="middle" className="fill-body text-[11px] font-semibold tabular-nums">{k} · {f1(d)}mm</text>
                  </g>
                )
              })}
            </svg>

            {/* 속도계 */}
            <div>
              <h3 className="text-sm font-semibold text-fg mb-2">{t('result.speedoTitle')}</h3>
              <dl className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {SPEEDS.map((v) => (
                  <div key={v} className="bg-subtle rounded-2xl px-4 py-3">
                    <dt className="text-xs text-sub">{t('result.shown', { v })}</dt>
                    <dd className="mt-0.5 text-base font-semibold text-fg tabular-nums">{t('result.actual', { v: f1(cmp.actualAt(v)) })}</dd>
                  </div>
                ))}
              </dl>
              <p className="mt-2 text-xs text-muted">{t('result.speedoHow')}</p>
            </div>

            {/* 규격 비교 */}
            <div className="overflow-x-auto">
              <table className="w-full min-w-[20rem] text-sm">
                <caption className="sr-only">{t('result.table.caption')}</caption>
                <thead>
                  <tr className="border-b border-line text-left text-sub">
                    <th scope="col" className="py-2 pr-3 font-medium">{t('result.table.item')}</th>
                    <th scope="col" className="py-2 pr-3 font-medium tabular-nums">A {s.a}</th>
                    <th scope="col" className="py-2 font-medium tabular-nums">B {s.b}</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map(([k, va, vb]) => (
                    <tr key={k} className="border-b border-line">
                      <th scope="row" className="py-2 pr-3 text-left font-normal text-sub whitespace-nowrap">{t(`result.table.${k}`)}</th>
                      <td className="py-2 pr-3 text-body tabular-nums">{va}</td>
                      <td className="py-2 text-body tabular-nums">{vb}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* 인치업 후보 */}
            <div className="rounded-2xl border border-line p-4 space-y-3">
              <h3 className="text-sm font-semibold text-fg">{t('result.inchUp.title', { a: aBare })}</h3>
              <p className="text-xs text-muted">{t('result.inchUp.desc')}</p>
              {ups.map((g) => (
                <div key={g.rim} className="flex flex-wrap items-center gap-2">
                  <span className="text-sm text-sub w-14 shrink-0">{t('result.inch', { n: g.rim })}</span>
                  {g.sizes.length === 0 ? <span className="text-sm text-muted">{t('result.inchUp.none')}</span> : g.sizes.map((c) => {
                    const on = bBare === c.label
                    return (
                      <button key={c.label} type="button" aria-pressed={on} onClick={() => setTire('b', c.label)} className={chip(on)}
                        aria-label={t('result.inchUp.aria', { size: c.label, pct: signed(c.pct) })}>
                        {c.label} <span className="opacity-80">{signed(c.pct)}%</span>
                      </button>
                    )
                  })}
                </div>
              ))}
            </div>

            <p className="text-xs text-muted leading-relaxed">{t('result.disclaimer')}</p>
          </section>

          <ShareResult
            fileName="tire-size"
            card={{
              tool: t('share.tool'),
              label,
              headline: t('result.headline', { pct }),
              sub: t('result.speedo', { actual: actual100 }),
              rows: [
                { label: t('share.rows.a'), value: `${f1(da.diameter)}mm · ${loadVal(A)}` },
                { label: t('share.rows.b'), value: `${f1(db.diameter)}mm · ${loadVal(B)}` },
                { label: t('share.rows.sidewall'), value: `${f1(da.sidewall)} → ${f1(db.sidewall)}mm` },
              ],
            }}
            text={t('share.text', { a: s.a, b: s.b, pct, actual: actual100 })}
          />
        </div>
      </div>

      {/* 제조일 */}
      <section className="ui-card p-6 space-y-4" aria-labelledby="ts-dot">
        <div>
          <h2 id="ts-dot" className="text-lg font-semibold text-fg">{t('dot.title')}</h2>
          <p className="text-sm text-muted mt-1">{t('dot.desc')}</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:items-start">
          <div>
            <label htmlFor="ts-dot-input" className={labelCls}>{t('dot.label')}</label>
            <input id="ts-dot-input" inputMode="numeric" autoComplete="off" value={dot} placeholder="2524"
              onChange={(e) => setDot(e.target.value.slice(0, 30))} aria-describedby="ts-dot-hint"
              className="ui-field w-full min-h-11 px-4 py-3 text-base tabular-nums" />
            <p id="ts-dot-hint" className="mt-1.5 text-xs text-muted">{t('dot.hint')}</p>
          </div>
          <div aria-live="polite" className="min-w-0">
            {!dotR || (!dotR.ok && dotR.err === 'empty') ? (
              <p className="bg-subtle rounded-2xl p-5 text-sm text-sub">{t('dot.empty')}</p>
            ) : !dotR.ok ? (
              <p className={warnCls}>{t(`dot.err.${dotR.err}`)}</p>
            ) : (
              <div className={dotR.status === 'ok' ? 'bg-subtle rounded-2xl p-5 space-y-1' : 'bg-amber-50 text-amber-800 rounded-2xl p-5 space-y-1'}>
                <p className={`text-sm ${dotR.status === 'ok' ? 'text-sub' : ''}`}>{t('dot.made', { year: dotR.year, week: dotR.week, month: dotR.month })}</p>
                <p className={`text-2xl font-bold tabular-nums ${dotR.status === 'ok' ? 'text-fg' : ''}`}>{t('dot.age', { age: f1(dotR.age) })}</p>
                <p className={`text-sm ${dotR.status === 'ok' ? 'text-body' : ''}`}>{t(`dot.status.${dotR.status}`, { check: AGE_CHECK, replace: AGE_REPLACE })}</p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* 가이드 */}
      <div className="ui-card p-6 space-y-6">
        <h2 className="text-xl font-semibold text-fg">{t('guide.title')}</h2>
        <section>
          <h3 className="font-semibold text-fg mb-3">{t('guide.anatomy.title')}</h3>
          <ol className="flex flex-wrap gap-2" aria-label={t('guide.anatomy.aria')}>
            {parts.map((p) => (
              <li key={p.code} className="bg-subtle rounded-xl px-3 py-2 min-w-[5.5rem]">
                <span className="block text-lg font-bold text-fg tabular-nums">{p.code}</span>
                <span className="block text-xs text-sub">{p.label}</span>
              </li>
            ))}
          </ol>
          <ul className="list-disc pl-5 space-y-2 text-sm text-sub mt-4">
            {(t.raw('guide.anatomy.items') as string[]).map((x) => <li key={x}>{x}</li>)}
          </ul>
        </section>
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
            {SOURCE_KEYS.map((k) => (
              <li key={k}><a href={SOURCES[k]} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline [overflow-wrap:anywhere]">{t(`sources.${k}`)}</a></li>
            ))}
          </ul>
          <p className="text-xs text-muted">{t('sources.asOf', { date: CHECKED })}</p>
        </section>
      </div>
    </div>
  )
}
