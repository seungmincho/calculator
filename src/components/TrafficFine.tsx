'use client'

import { useMemo, useState } from 'react'
import { useTranslations } from '@/lib/i18n'
import '@/lib/i18n/ns/trafficFine'
import { useSearchParams } from '@/hooks/useSearchParams'
import { useHydrated } from '@/hooks/useHydrated'
import ShareResult from '@/components/ShareResult'
import MobileResultLink from '@/components/MobileResultLink'
import {
  CHECKED, DEFAULT, LIM_RANGE, PTS_RANGE, REVOKE, SOURCES, SPD_RANGE, SUSPEND_AT, VEHS, VIDS, ZONES,
  calc, finePlan, inputOf, parseState, toQuery, verdict, zoneApplies, type State, type Vid,
} from '@/utils/trafficFine'

const digits = (v: string) => v.replace(/\D/g, '').slice(0, 3)
const inRange = (s: string, [lo, hi]: readonly [number, number]) => /^\d+$/.test(s) && Number(s) >= lo && Number(s) <= hi
const LIMITS = [30, 50, 60, 80, 100, 110] as const
const GUIDE = ['diff', 'pay', 'points', 'zone'] as const
const SOURCE_KEYS = ['enf', 'rule', 'act', 'qa', 'efine'] as const

const seg = (on: boolean) => `min-h-11 px-3 py-2 rounded-xl text-sm font-medium transition-colors ${on ? 'bg-primary text-white' : 'bg-soft text-body hover:bg-subtle'}`
const optCard = (on: boolean) => `min-h-11 w-full rounded-xl border px-3 py-2 text-left text-sm font-medium transition-colors ${on ? 'bg-primary-soft text-primary border-primary' : 'bg-surface text-body border-line hover:bg-soft'}`
const labelCls = 'block text-sm font-medium text-body mb-1.5'
const warnCls = 'bg-amber-50 text-amber-800 rounded-2xl px-4 py-3 text-sm'
const unitCls = 'absolute right-4 top-1/2 -translate-y-1/2 text-sm text-muted pointer-events-none'
const hintCls = (bad: boolean) => (bad ? 'mt-1.5 rounded-lg bg-amber-50 px-2 py-1 text-xs text-amber-800' : 'mt-1.5 text-xs text-muted')

export default function TrafficFine() {
  const t = useTranslations('trafficFine')
  const money = (n: number) => t('result.won', { v: n.toLocaleString('ko-KR') })
  const sp = useSearchParams()
  const hydrated = useHydrated()

  // URL → 값. 하이드레이션 전에는 기본값. 사용자가 고치면 그 값이 우선, URL 은 기본값과 다른 것만
  const fromUrl = useMemo(() => (hydrated ? parseState((k) => sp.get(k)) : DEFAULT), [hydrated, sp])
  const [edited, setEdited] = useState<State | null>(null)
  const s = edited ?? fromUrl
  const [limDraft, setLimDraft] = useState<string | null>(null)
  const [spdDraft, setSpdDraft] = useState<string | null>(null)
  const [ptsDraft, setPtsDraft] = useState<string | null>(null)

  const commit = (next: State) => {
    setEdited(next)
    const qs = toQuery(next)
    window.history.replaceState(window.history.state, '', `${window.location.pathname}${qs ? `?${qs}` : ''}${window.location.hash}`)
  }

  const input = inputOf(s)
  const r = calc(input)
  const isSpeed = s.v === 'speed'
  const isParking = s.v === 'parking' || s.v === 'hydrant'
  const zoneName = t(`zone.${s.zone}`)
  const vName = t(`v.${s.v}.name`)
  const vehName = t(`veh.${s.veh}.name`)
  const pts = r?.points ?? 0
  const v = verdict(s.pts, pts)
  const plan = r?.fine ? finePlan(r.fine) : null
  const label = isSpeed && r ? t('result.labelSpeed', { v: vName, over: input.over, veh: vehName }) : t('result.label', { v: vName, veh: vehName })

  const limText = limDraft ?? String(s.lim)
  const spdText = spdDraft ?? String(s.spd)
  const ptsText = ptsDraft ?? String(s.pts)
  const limBad = !inRange(limText, LIM_RANGE)
  const spdBad = !inRange(spdText, SPD_RANGE)
  const ptsBad = !inRange(ptsText, PTS_RANGE)

  const penaltyText = r?.penalty != null ? money(r.penalty) : '—'
  const fineText = r ? (r.crime ? t('result.crimeCard') : r.fine != null ? money(r.fine) : '—') : '—'
  const headline = !r ? t('result.none') : [
    r.penalty != null ? t('share.penaltyPart', { v: money(r.penalty) }) : null,
    r.crime ? t('result.crimeCard') : r.fine != null ? t('share.finePart', { v: money(r.fine), pts: r.points }) : null,
  ].filter(Boolean).join(' · ')

  const faq = t.raw('guide.faq.items') as { q: string; a: string }[]

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-fg">{t('title')}</h1>
        <p className="text-sm text-muted mt-1">{t('subtitle')}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* 입력 */}
        <section className="ui-card p-6 space-y-6 min-w-0" aria-labelledby="tf-input">
          <MobileResultLink href="#traffic-fine-result" label={label} value={headline} />
          <h2 id="tf-input" className="text-lg font-semibold text-fg">{t('input.title')}</h2>

          <div>
            <p id="tf-v" className={labelCls}>{t('input.violation')}</p>
            <div role="group" aria-labelledby="tf-v" className="grid grid-cols-2 gap-2">
              {VIDS.map((id: Vid) => (
                <button key={id} type="button" aria-pressed={s.v === id} onClick={() => commit({ ...s, v: id })} className={optCard(s.v === id)}>
                  {t(`v.${id}.name`)}
                </button>
              ))}
            </div>
            <p className="mt-1.5 text-xs text-muted">{t(`v.${s.v}.desc`)}</p>
          </div>

          {isSpeed && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="min-w-0">
                  <label htmlFor="tf-lim" className={labelCls}>{t('input.limit')}</label>
                  <div className="relative">
                    <input id="tf-lim" inputMode="numeric" autoComplete="off" value={limText} aria-invalid={limBad || undefined} aria-describedby="tf-speed-hint"
                      onChange={(e) => { const x = digits(e.target.value); setLimDraft(x); if (inRange(x, LIM_RANGE)) commit({ ...s, lim: Number(x) }) }}
                      onBlur={() => setLimDraft(null)}
                      className="ui-field w-full min-h-11 px-4 py-3 pr-14 text-base tabular-nums" />
                    <span className={unitCls}>km/h</span>
                  </div>
                </div>
                <div className="min-w-0">
                  <label htmlFor="tf-spd" className={labelCls}>{t('input.speed')}</label>
                  <div className="relative">
                    <input id="tf-spd" inputMode="numeric" autoComplete="off" value={spdText} aria-invalid={spdBad || undefined} aria-describedby="tf-speed-hint"
                      onChange={(e) => { const x = digits(e.target.value); setSpdDraft(x); if (inRange(x, SPD_RANGE)) commit({ ...s, spd: Number(x) }) }}
                      onBlur={() => setSpdDraft(null)}
                      className="ui-field w-full min-h-11 px-4 py-3 pr-14 text-base tabular-nums" />
                    <span className={unitCls}>km/h</span>
                  </div>
                </div>
              </div>
              <div role="group" aria-label={t('input.limitPresets')} className="flex flex-wrap gap-2">
                {LIMITS.map((l) => (
                  <button key={l} type="button" aria-pressed={s.lim === l} onClick={() => { setLimDraft(null); commit({ ...s, lim: l }) }} className={seg(s.lim === l)}>{l}</button>
                ))}
              </div>
              <p id="tf-speed-hint" className={hintCls(limBad || spdBad)}>
                {limBad || spdBad ? t('input.speedErr', { lmin: LIM_RANGE[0], lmax: LIM_RANGE[1], smax: SPD_RANGE[1] })
                  : input.over > 0 ? t('input.over', { n: input.over }) : t('input.under')}
              </p>
            </div>
          )}

          <div>
            <p id="tf-veh" className={labelCls}>{t('input.vehicle')}</p>
            <div role="group" aria-labelledby="tf-veh" className="flex flex-wrap gap-2">
              {VEHS.map((x) => (
                <button key={x} type="button" aria-pressed={s.veh === x} onClick={() => commit({ ...s, veh: x })} className={seg(s.veh === x)}>{t(`veh.${x}.name`)}</button>
              ))}
            </div>
            <p className="mt-1.5 text-xs text-muted">{t(`veh.${s.veh}.desc`)}</p>
          </div>

          <div>
            <p id="tf-zone" className={labelCls}>{t('input.zone')}</p>
            <div role="group" aria-labelledby="tf-zone" className="flex flex-wrap gap-2">
              {ZONES.map((z) => (
                <button key={z} type="button" aria-pressed={s.zone === z} onClick={() => commit({ ...s, zone: z })} className={seg(s.zone === z)}>{t(`zone.${z}`)}</button>
              ))}
            </div>
            {s.zone !== 'none' && (
              <label className="mt-3 flex min-h-11 items-center gap-3 text-sm text-body">
                <input type="checkbox" checked={s.hours} onChange={(e) => commit({ ...s, hours: e.target.checked })} className="h-5 w-5 accent-primary" />
                {t('input.hours')}
              </label>
            )}
          </div>

          {isParking && (
            <label className="flex min-h-11 items-center gap-3 text-sm text-body">
              <input type="checkbox" checked={s.two} onChange={(e) => commit({ ...s, two: e.target.checked })} className="h-5 w-5 accent-primary" />
              {t('input.twoHour')}
            </label>
          )}
        </section>

        {/* 결과 */}
        <div className="lg:col-span-2 min-w-0 space-y-4">
          <section id="traffic-fine-result" className="ui-card p-6 space-y-5 scroll-mt-20 min-w-0" aria-labelledby="tf-result-label">
            <div aria-live="polite" className="space-y-4">
              <p id="tf-result-label" className="text-sm text-sub">{label}</p>
              {!r ? <p className="text-base text-body">{t('result.none')}</p> : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="bg-subtle rounded-2xl p-4 min-w-0">
                    <p className="text-sm text-sub">{t('result.penaltyTitle')}</p>
                    <p className="mt-1 text-3xl font-bold text-fg tabular-nums">{penaltyText}</p>
                    <p className="mt-1 text-xs text-sub">{r.penalty != null ? t('result.penaltyWho') : t('result.noPenalty')}</p>
                    {r.penaltyCut != null && <p className="mt-2 text-sm text-body tabular-nums">{t('result.cut', { v: money(r.penaltyCut) })}</p>}
                  </div>
                  <div className="bg-subtle rounded-2xl p-4 min-w-0">
                    <p className="text-sm text-sub">{t('result.fineTitle')}</p>
                    <p className="mt-1 text-3xl font-bold text-fg tabular-nums">{fineText}</p>
                    <p className="mt-1 text-xs text-sub">{t('result.fineWho', { pts: r.points })}</p>
                    {r.fineHw != null && <p className="mt-2 text-sm text-body tabular-nums">{t('result.distanceHw', { v: money(r.fineHw) })}</p>}
                  </div>
                </div>
              )}
            </div>

            {r?.crime && <p className={warnCls}>{t(`result.crime.${r.crime}`, { pts: r.points })}</p>}
            {r && (
              <ul className="space-y-1.5 text-sm text-sub list-disc pl-5">
                {s.zone !== 'none' && (r.zoneOn ? <li>{t('result.zoneOn', { zone: zoneName })}</li>
                  : !zoneApplies(s.v) ? <li>{t('result.zoneNa')}</li>
                  : !s.hours ? <li>{t('result.zoneOff', { zone: zoneName })}</li> : null)}
                {r.zoneOn && s.v === 'crosswalk' && <li>{t('result.zoneCrosswalk')}</li>}
                {r.penalty != null && r.penaltyCut == null && <li>{t('result.noCut')}</li>}
                {isParking && s.two && r.penalty != null && <li>{t('result.twoHourOn')}</li>}
                {s.v === 'belt' && <li>{t('result.beltPassenger')}</li>}
                {s.v === 'intersection' && <li>{t('result.intersectionNote')}</li>}
                <li>{t('result.convert')}</li>
              </ul>
            )}

            {plan && (
              <div>
                <h3 className="text-sm font-semibold text-fg mb-2">{t('plan.title')}</h3>
                <dl className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {(['first', 'second', 'court'] as const).map((k) => (
                    <div key={k} className="bg-subtle rounded-2xl px-4 py-3">
                      <dt className="text-xs text-sub">{t(`plan.${k}`)}</dt>
                      <dd className="mt-0.5 text-base font-semibold text-fg tabular-nums">{money(plan[k])}</dd>
                    </div>
                  ))}
                </dl>
                <p className="mt-2 text-xs text-muted">{t('plan.note')}</p>
              </div>
            )}

            {/* 누적 벌점 */}
            <div className="rounded-2xl border border-line p-4 space-y-3">
              <h3 className="text-sm font-semibold text-fg">{t('points.title')}</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:items-start">
                <div className="min-w-0">
                  <label htmlFor="tf-pts" className={labelCls}>{t('points.label')}</label>
                  <div className="relative">
                    <input id="tf-pts" inputMode="numeric" autoComplete="off" value={ptsText} aria-invalid={ptsBad || undefined} aria-describedby="tf-pts-hint"
                      onChange={(e) => { const x = digits(e.target.value); setPtsDraft(x); if (inRange(x, PTS_RANGE)) commit({ ...s, pts: Number(x) }) }}
                      onBlur={() => setPtsDraft(null)}
                      className="ui-field w-full min-h-11 px-4 py-3 pr-10 text-base tabular-nums" />
                    <span className={unitCls}>{t('points.unit')}</span>
                  </div>
                  <p id="tf-pts-hint" className={hintCls(ptsBad)}>{ptsBad ? t('points.err', { max: PTS_RANGE[1] }) : t('points.hint')}</p>
                </div>
                <div aria-live="polite" className={v.status === 'ok' ? 'bg-subtle rounded-2xl p-4' : 'bg-amber-50 text-amber-800 rounded-2xl p-4'}>
                  <p className={`text-sm ${v.status === 'ok' ? 'text-sub' : ''}`}>{pts > 0 ? t('points.add', { pts }) : t('points.zero')}</p>
                  <p className={`mt-0.5 text-2xl font-bold tabular-nums ${v.status === 'ok' ? 'text-fg' : ''}`}>{t('points.total', { total: v.total })}</p>
                  <p className={`mt-1 text-sm ${v.status === 'ok' ? 'text-body' : ''}`}>
                    {v.status === 'revoke' ? t('points.revoke', { y1: REVOKE.y1 }) : v.status === 'suspend' ? t('points.suspend', { days: v.days }) : t('points.ok', { left: v.toSuspend, at: SUSPEND_AT })}
                  </p>
                </div>
              </div>
              <p className="text-xs text-muted">{t('points.rules', { at: SUSPEND_AT, y1: REVOKE.y1, y2: REVOKE.y2, y3: REVOKE.y3 })}</p>
            </div>

            <p className="text-xs text-muted leading-relaxed">{t('result.disclaimer')}</p>
          </section>

          {r && (
            <ShareResult
              fileName="traffic-fine"
              card={{
                tool: t('share.tool'),
                label: r.zoneOn ? `${label} · ${zoneName}` : label,
                headline,
                sub: t('share.sub'),
                rows: [
                  { label: t('result.penaltyTitle'), value: penaltyText },
                  { label: t('result.fineTitle'), value: fineText },
                  { label: t('share.rows.points'), value: t('result.ptsShort', { n: r.points }) },
                  ...(r.penaltyCut != null ? [{ label: t('share.rows.cut'), value: money(r.penaltyCut) }] : []),
                  ...(s.pts > 0 ? [{ label: t('share.rows.total'), value: t('points.total', { total: v.total }) }] : []),
                ],
              }}
              text={t('share.text', { label, headline })}
            />
          )}

          {/* 위반별 한눈에 */}
          <details className="ui-card p-6">
            <summary className="cursor-pointer min-h-11 flex items-center text-base font-semibold text-fg">{t('table.title', { veh: vehName })}</summary>
            <div className="overflow-x-auto mt-3">
              <table className="w-full min-w-[22rem] text-sm">
                <caption className="sr-only">{t('table.title', { veh: vehName })}</caption>
                <thead>
                  <tr className="border-b border-line text-left text-sub">
                    <th scope="col" className="py-2 pr-3 font-medium">{t('table.violation')}</th>
                    <th scope="col" className="py-2 pr-3 font-medium">{t('result.penaltyTitle')}</th>
                    <th scope="col" className="py-2 pr-3 font-medium">{t('result.fineTitle')}</th>
                    <th scope="col" className="py-2 font-medium">{t('table.points')}</th>
                  </tr>
                </thead>
                <tbody>
                  {VIDS.filter((id) => id !== 'speed').map((id) => {
                    const x = calc({ v: id, veh: s.veh, zone: 'none', hours: true, over: 0, twoHour: false })
                    return (
                      <tr key={id} className={`border-b border-line ${id === s.v ? 'bg-primary-soft text-primary font-semibold' : 'text-body'}`}>
                        <th scope="row" className="py-2 pr-3 text-left font-normal">{t(`v.${id}.name`)}</th>
                        <td className="py-2 pr-3 tabular-nums whitespace-nowrap">{x?.penalty != null ? money(x.penalty) : '—'}</td>
                        <td className="py-2 pr-3 tabular-nums whitespace-nowrap">{x?.fine != null ? money(x.fine) : '—'}</td>
                        <td className="py-2 tabular-nums">{x?.points ?? 0}</td>
                      </tr>
                    )
                  })}
                  {[5, 25, 45, 65, 85, 105].map((over) => {
                    const x = calc({ v: 'speed', veh: s.veh, zone: 'none', hours: true, over, twoHour: false })
                    return (
                      <tr key={over} className="border-b border-line text-body">
                        <th scope="row" className="py-2 pr-3 text-left font-normal">{t(`table.speed.${x?.band ?? 'b20'}`)}</th>
                        <td className="py-2 pr-3 tabular-nums whitespace-nowrap">{x?.penalty != null ? money(x.penalty) : '—'}</td>
                        <td className="py-2 pr-3 tabular-nums whitespace-nowrap">{x?.crime ? t('table.crime') : x?.fine != null ? money(x.fine) : '—'}</td>
                        <td className="py-2 tabular-nums">{x?.points ?? 0}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            <p className="mt-2 text-xs text-muted">{t('table.note')}</p>
          </details>
        </div>
      </div>

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
          </ul>
          <p className="text-xs text-muted">{t('sources.asOf', { date: CHECKED })}</p>
        </section>
        <p className="text-xs text-muted leading-relaxed">{t('guide.disclaimer')}</p>
      </div>
    </div>
  )
}
