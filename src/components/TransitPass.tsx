'use client'

import { useMemo, useState, useSyncExternalStore, type ReactNode } from 'react'
import { useTranslations } from '@/lib/i18n'
import '@/lib/i18n/ns/transitPass'
import { useSearchParams } from '@/hooks/useSearchParams'
import { useHydrated } from '@/hooks/useHydrated'
import ShareResult from '@/components/ShareResult'
import MobileResultLink from '@/components/MobileResultLink'
import { todayKST } from '@/utils/dday'
import {
  AMT_RANGE, BASE, CHECKED, DEFAULT, FARE_RANGE, GROUPS, METHODS, MIN_TRIPS, OFFPEAK_END, RATE, REGIONS, SOURCES,
  TRIPS_RANGE, WIDE_FARE, WIDE_FARE_RANGE, baseOf, breakeven, parseState, plusOverGeneral, refunds, toQuery, usageOf,
  type Mode, type State,
} from '@/utils/transitPass'

const won = (n: number) => Math.round(n).toLocaleString('ko-KR')
const pctOf = (r: number) => (Math.round(r * 1000) / 10).toLocaleString('ko-KR')
const noSub = () => () => {}

const labelCls = 'block text-sm font-medium text-body mb-1.5'
const hintCls = 'mt-1.5 text-xs text-muted'
const errCls = 'mt-1.5 rounded-lg bg-amber-50 px-2 py-1 text-xs text-amber-800'
const unitCls = 'absolute right-4 top-1/2 -translate-y-1/2 text-sm text-muted pointer-events-none'
const warnCls = 'bg-amber-50 text-amber-800 rounded-2xl px-4 py-3 text-sm'
const chip = (on: boolean) => `min-h-11 px-3 py-2 rounded-xl text-sm font-medium transition-colors ${on ? 'bg-primary text-white' : 'bg-soft text-body hover:bg-subtle'}`

/** 정수 입력 하나: 입력 중에는 글자 그대로, 범위 안이면 바로 반영 */
function IntField({ id, label, value, unit, range, onCommit, hint, err }: {
  id: string; label: string; value: number; unit: string; range: readonly [number, number]
  onCommit: (n: number) => void; hint?: ReactNode; err: string
}) {
  const [draft, setDraft] = useState<string | null>(null)
  const text = draft ?? value.toLocaleString('ko-KR')
  const n = Number(text.replace(/,/g, ''))
  const bad = !/\d/.test(text) || !(Number.isInteger(n) && n >= range[0] && n <= range[1])
  return (
    <div className="min-w-0">
      <label htmlFor={id} className={labelCls}>{label}</label>
      <div className="relative">
        <input
          id={id} inputMode="numeric" autoComplete="off" value={text}
          onChange={(e) => {
            const d = e.target.value.replace(/[^\d]/g, '').replace(/^0+(?=\d)/, '').slice(0, 9)
            const v = d ? Number(d).toLocaleString('ko-KR') : ''
            setDraft(v)
            if (d && Number(d) >= range[0] && Number(d) <= range[1]) onCommit(Number(d))
          }}
          onBlur={() => setDraft(null)}
          aria-invalid={bad || undefined} aria-describedby={`${id}-hint`}
          className="ui-field w-full min-h-11 px-4 py-3 pr-12 text-base tabular-nums"
        />
        <span className={unitCls}>{unit}</span>
      </div>
      <p id={`${id}-hint`} className={bad ? errCls : hintCls}>{bad ? err : hint}</p>
    </div>
  )
}

export default function TransitPass() {
  const t = useTranslations('transitPass')
  const sp = useSearchParams()
  const hydrated = useHydrated()
  // 오늘(KST)은 마운트 뒤에만. 서버·첫 렌더는 null 이라 시차 출퇴근 환급을 기간 안으로 본다
  const today = useSyncExternalStore(noSub, todayKST, () => null)
  const offpeakOn = today === null || today <= OFFPEAK_END

  const fromUrl = useMemo(() => (hydrated ? parseState((k) => sp.get(k)) : DEFAULT), [hydrated, sp])
  const [edited, setEdited] = useState<State | null>(null)
  const s = edited ?? fromUrl
  const commit = (next: State) => {
    setEdited(next)
    const qs = toQuery(next)
    window.history.replaceState(window.history.state, '', `${window.location.pathname}${qs ? `?${qs}` : ''}${window.location.hash}`)
  }
  const setMode = (m: Mode) => {
    if (m === s.m) return
    // 회당 → 월 금액으로 바꿀 때는 지금 합계를 그대로 옮겨 결과가 바뀌지 않게
    if (m === 'amt') { const u = usageOf(s); commit({ ...s, m, a: u.total, t: u.trips, wa: s.w ? u.wide : s.wa }) } else commit({ ...s, m })
  }

  const u = usageOf(s)
  const r = refunds(u, s.r, s.g, offpeakOn)
  const be = breakeven(u, s.r, s.g, offpeakOn)
  const [b1, b2] = baseOf(s.r, s.g)
  const avgFare = u.trips > 0 ? u.total / u.trips : 0
  const beTrips = be && avgFare > 0 ? Math.ceil(be.amount / avgFare) : null
  const pog = plusOverGeneral(s.r, s.g)
  const maxBar = Math.max(u.total, 1)
  const methodName = (m: string) => t(`method.${m}`)
  const won0 = (n: number) => t('won', { n: won(n) })
  const resultLabel = r.eligible ? t('result.label', { method: methodName(r.best) }) : t('result.labelNone')
  const youthLabel = s.r === 'seoul' ? 'youthSeoul' : 'youth'

  const faq = t.raw('guide.faq.items') as { q: string; a: string }[]
  const compareRows = t.raw('guide.compare.rows') as { name: string; how: string; modes: string; note: string }[]
  const GUIDE = ['howTo', 'caution'] as const
  const SOURCE_KEYS = ['intro', 'accm', 'pay', 'notice', 'seoulPass', 'climateEnd', 'seoulNews'] as const
  const AREAS = ['capital', 'local', 'pref', 'special'] as const

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-fg">{t('title')}</h1>
        <p className="text-sm text-muted mt-1">{t('subtitle')}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* 입력 */}
        <section className="ui-card p-6 space-y-6 min-w-0" aria-labelledby="tp-input">
          <MobileResultLink href="#transit-pass-result" label={resultLabel} value={t('result.perMonth', { n: won(r.refund) })} />
          <h2 id="tp-input" className="text-lg font-semibold text-fg">{t('input.title')}</h2>

          <div>
            <p id="tp-region" className={labelCls}>{t('input.region')}</p>
            <div role="group" aria-labelledby="tp-region" className="flex flex-wrap gap-2">
              {REGIONS.map((x) => (
                <button key={x} type="button" aria-pressed={s.r === x} onClick={() => s.r !== x && commit({ ...s, r: x })} className={chip(s.r === x)}>{t(`region.${x}`)}</button>
              ))}
            </div>
            <p className={hintCls}>{t(`regionHint.${s.r}`)}</p>
          </div>

          <div>
            <p id="tp-group" className={labelCls}>{t('input.group')}</p>
            <div role="group" aria-labelledby="tp-group" className="flex flex-wrap gap-2">
              {GROUPS.map((x) => (
                <button key={x} type="button" aria-pressed={s.g === x} onClick={() => s.g !== x && commit({ ...s, g: x })} className={chip(s.g === x)}>{t(`group.${x}`)}</button>
              ))}
            </div>
            <p className={hintCls}>{t(`groupHint.${s.g === 'youth' ? youthLabel : s.g}`)}</p>
          </div>

          <div>
            <p id="tp-mode" className={labelCls}>{t('input.mode')}</p>
            <div role="group" aria-labelledby="tp-mode" className="grid grid-cols-2 gap-2">
              {(['trip', 'amt'] as const).map((m) => (
                <button key={m} type="button" aria-pressed={s.m === m} onClick={() => setMode(m)} className={chip(s.m === m)}>{t(`input.modes.${m}`)}</button>
              ))}
            </div>
          </div>

          {s.m === 'trip' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2 gap-4">
              <IntField id="tp-fare" label={t(s.w ? 'input.fareUnder' : 'input.fare')} value={s.f} unit={t('unit.won')} range={FARE_RANGE}
                onCommit={(n) => commit({ ...s, f: n })} hint={t('input.fareHint')}
                err={t('input.fareErr', { min: won(FARE_RANGE[0]), max: won(FARE_RANGE[1]) })} />
              <IntField id="tp-trips" label={t(s.w ? 'input.tripsUnder' : 'input.trips')} value={s.n} unit={t('unit.times')} range={TRIPS_RANGE}
                onCommit={(n) => commit({ ...s, n })} hint={t('input.tripsHint')}
                err={t('input.tripsErr', { max: TRIPS_RANGE[1] })} />
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2 gap-4">
              <IntField id="tp-amt" label={t('input.amount')} value={s.a} unit={t('unit.won')} range={AMT_RANGE}
                onCommit={(n) => commit({ ...s, a: n })} hint={t('input.amountHint')}
                err={t('input.amountErr', { max: won(AMT_RANGE[1]) })} />
              <IntField id="tp-amt-trips" label={t('input.tripsTotal')} value={s.t} unit={t('unit.times')} range={TRIPS_RANGE}
                onCommit={(n) => commit({ ...s, t: n })} hint={t('input.tripsHint')}
                err={t('input.tripsErr', { max: TRIPS_RANGE[1] })} />
            </div>
          )}

          <div className="space-y-4">
            <label className="flex min-h-11 items-start gap-3 cursor-pointer">
              <input type="checkbox" checked={s.w} onChange={(e) => commit({ ...s, w: e.target.checked })}
                className="mt-1 h-5 w-5 shrink-0 accent-primary" />
              <span className="text-sm text-body">
                <span className="block font-medium">{t('input.wide')}</span>
                <span className="block text-xs text-muted mt-0.5">{t('input.wideHint', { fare: won(WIDE_FARE) })}</span>
              </span>
            </label>
            {s.w && (s.m === 'trip' ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2 gap-4">
                <IntField id="tp-wfare" label={t('input.wideFare')} value={s.wf} unit={t('unit.won')} range={WIDE_FARE_RANGE}
                  onCommit={(n) => commit({ ...s, wf: n })} hint={t('input.wideFareHint')}
                  err={t('input.wideFareErr', { min: won(WIDE_FARE_RANGE[0]), max: won(WIDE_FARE_RANGE[1]) })} />
                <IntField id="tp-wtrips" label={t('input.wideTrips')} value={s.wn} unit={t('unit.times')} range={TRIPS_RANGE}
                  onCommit={(n) => commit({ ...s, wn: n })}
                  err={t('input.tripsErr', { max: TRIPS_RANGE[1] })} />
              </div>
            ) : (
              <IntField id="tp-wamt" label={t('input.wideAmount')} value={s.wa} unit={t('unit.won')} range={AMT_RANGE}
                onCommit={(n) => commit({ ...s, wa: n })} hint={s.wa > s.a ? t('input.wideAmountOver') : t('input.wideAmountHint')}
                err={t('input.amountErr', { max: won(AMT_RANGE[1]) })} />
            ))}
          </div>

          {offpeakOn && (
            <IntField id="tp-offpeak" label={t('input.offpeak')} value={s.o} unit={t('unit.times')} range={TRIPS_RANGE}
              onCommit={(n) => commit({ ...s, o: n })} hint={t('input.offpeakHint', { end: OFFPEAK_END })}
              err={t('input.tripsErr', { max: TRIPS_RANGE[1] })} />
          )}

          <p className="bg-subtle rounded-2xl px-4 py-3 text-sm text-body tabular-nums">
            {t('input.summary', { total: won(u.total), trips: u.trips, wide: won(u.wide) })}
          </p>
        </section>

        {/* 결과 */}
        <div className="lg:col-span-2 min-w-0 space-y-4">
          <section id="transit-pass-result" className="ui-card p-6 space-y-5 scroll-mt-20 min-w-0" aria-labelledby="tp-result-label">
            <div aria-live="polite">
              <p id="tp-result-label" className="text-sm text-sub">{resultLabel}</p>
              <p className="mt-1 text-3xl font-bold text-fg tabular-nums">{t('result.perMonth', { n: won(r.refund) })}</p>
              <p className="mt-1 text-sm text-body tabular-nums">{t('result.pay', { pay: won(r.pay), total: won(u.total), year: won(r.refund * 12) })}</p>
            </div>

            {!r.eligible && (
              <p className={warnCls}>{t('result.under15', { min: MIN_TRIPS, trips: u.trips, need: MIN_TRIPS - u.trips })}</p>
            )}

            {/* 세 방식 비교 막대 */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-fg">{t('bars.title')}</h3>
              <ul className="space-y-3">
                {METHODS.map((m) => {
                  const v = r.by[m]
                  const on = r.eligible && m === r.best
                  return (
                    <li key={m} className={`rounded-2xl px-4 py-3 ${on ? 'bg-primary-soft' : 'bg-subtle'}`}>
                      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                        <p className={`text-sm font-semibold ${on ? 'text-primary' : 'text-body'}`}>
                          {methodName(m)}{on && <span className="ml-2 text-xs font-medium">{t('bars.applied')}</span>}
                        </p>
                        <p className="text-sm tabular-nums text-body">
                          {t('bars.value', { refund: won(v), pay: won(u.total - v) })}
                        </p>
                      </div>
                      <div className="mt-2 h-2.5 rounded-full bg-track overflow-hidden" aria-hidden="true">
                        <div className={`h-full rounded-full ${on ? 'bg-primary' : 'bg-faint'}`} style={{ width: `${Math.min(100, (v / maxBar) * 100)}%` }} />
                      </div>
                      <p className="mt-1.5 text-xs text-muted">
                        {m === 'basic'
                          ? t('methodRule.basic', { rate: pctOf(RATE[s.g]) })
                          : t(`methodRule.${m}`, { base: won(m === 'general' ? b1 : b2) })}
                      </p>
                    </li>
                  )
                })}
              </ul>
              <p className="text-xs text-muted">{t('bars.auto')}</p>
            </div>

            {/* 손익분기 */}
            <div className="rounded-2xl border border-line p-4 space-y-2 text-sm text-body">
              <h3 className="font-semibold text-fg">{t('breakeven.title')}</h3>
              {be ? (
                <p className="tabular-nums">
                  {beTrips !== null
                    ? t('breakeven.at', { amount: won(be.amount), method: methodName(be.method), fare: won(avgFare), trips: beTrips })
                    : t('breakeven.atAmount', { amount: won(be.amount), method: methodName(be.method) })}
                </p>
              ) : (
                <p className="tabular-nums">{t(`breakeven.already.${r.best === 'plus' ? 'plus' : 'general'}`, { base: won(r.best === 'plus' ? b2 : b1) })}</p>
              )}
              {/* 3천원 이상 금액이 차이를 넘어도 전체가 플러스형 기준금액 이하면 둘 다 0원이라 비교 문장을 띄우지 않는다 */}
              {s.w && (r.by.plus > r.by.general || u.wide <= pog) && (
                <p className="tabular-nums">
                  {t(r.by.plus > r.by.general ? 'breakeven.plusNow' : 'breakeven.plusAt', { x: won(pog), wide: won(u.wide) })}
                </p>
              )}
              {offpeakOn && s.o > 0 && <p className="text-xs text-muted">{t('breakeven.offpeak', { end: OFFPEAK_END })}</p>}
            </div>

            {/* 기후동행카드 */}
            {s.r === 'seoul' && (
              <div className="bg-subtle rounded-2xl p-5 text-sm text-sub space-y-2">
                <h3 className="font-semibold text-body">{t('climate.title')}</h3>
                <p>{t('climate.ended')}</p>
                <p className="tabular-nums">{t('climate.compare', { pay: won(r.pay), total: won(u.total) })}</p>
                <p>{t('climate.youth')}</p>
              </div>
            )}

            <p className="text-xs text-muted leading-relaxed">{t('result.disclaimer')}</p>
          </section>

          <ShareResult
            fileName="transit-pass"
            card={{
              tool: t('share.tool'),
              label: t('share.label', { region: t(`region.${s.r}`), group: t(`group.${s.g}`), total: won(u.total), trips: u.trips }),
              headline: r.eligible ? t('share.headline', { method: methodName(r.best), n: won(r.refund) }) : t('share.headlineNone'),
              sub: t('share.sub', { pay: won(r.pay), year: won(r.refund * 12) }),
              rows: METHODS.map((m) => ({ label: methodName(m), value: won0(r.by[m]) })),
            }}
            text={r.eligible ? t('share.text', { method: methodName(r.best), n: won(r.refund), total: won(u.total) }) : t('share.headlineNone')}
          />
        </div>
      </div>

      {/* 가이드 */}
      <div className="ui-card p-6 space-y-6">
        <h2 className="text-xl font-semibold text-fg">{t('guide.title')}</h2>

        <section className="space-y-3">
          <h3 className="font-semibold text-fg">{t('guide.compare.title')}</h3>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[36rem] text-sm">
              <caption className="sr-only">{t('guide.compare.title')}</caption>
              <thead>
                <tr className="border-b border-line text-left text-sub">
                  {(['name', 'how', 'modes', 'note'] as const).map((c) => <th key={c} scope="col" className="py-2 pr-3 font-medium">{t(`guide.compare.cols.${c}`)}</th>)}
                </tr>
              </thead>
              <tbody>
                {compareRows.map((row) => (
                  <tr key={row.name} className="border-b border-line text-body align-top">
                    <th scope="row" className="py-2 pr-3 font-medium text-left whitespace-nowrap">{row.name}</th>
                    <td className="py-2 pr-3">{row.how}</td>
                    <td className="py-2 pr-3">{row.modes}</td>
                    <td className="py-2 pr-3">{row.note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="space-y-3">
          <h3 className="font-semibold text-fg">{t('guide.base.title')}</h3>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[34rem] text-sm tabular-nums">
              <caption className="sr-only">{t('guide.base.caption')}</caption>
              <thead>
                <tr className="border-b border-line text-left text-sub">
                  <th scope="col" className="py-2 pr-3 font-medium">{t('guide.base.area')}</th>
                  {([0, 1, 2] as const).map((i) => <th key={i} scope="col" className="py-2 pr-3 font-medium">{t(`guide.base.tier${i}`)}</th>)}
                </tr>
              </thead>
              <tbody>
                {AREAS.map((a) => (
                  <tr key={a} className="border-b border-line text-body">
                    <th scope="row" className="py-2 pr-3 font-medium text-left whitespace-nowrap">{t(`guide.base.areas.${a}`)}</th>
                    {BASE[a].map(([g, p], i) => <td key={i} className="py-2 pr-3 whitespace-nowrap">{won(g)} / {won(p)}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-muted">{t('guide.base.note')}</p>
        </section>

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
          </ul>
          <p className="text-xs text-muted">{t('sources.asOf', { date: CHECKED })}</p>
        </section>
      </div>
    </div>
  )
}
