'use client'

import { useState, useMemo, useEffect, useRef } from 'react'
import { useSearchParams } from '@/hooks/useSearchParams'
import { useTranslations } from '@/lib/i18n'
import '@/lib/i18n/ns/parkingFee'
import { Plus, X } from 'lucide-react'
import ShareResult from '@/components/ShareResult'
import {
  PRESETS, SEOUL_SOURCE, calcFee, nextIncrease, timeline, parseLocal, minutesBetween, clockAt, encodeRule, decodeRule,
  type FeeRule, type PresetKey,
} from '@/utils/parkingFee'

interface Lot { name: string; rule: FeeRule }

const PRESET_KEYS = Object.keys(PRESETS) as PresetKey[]
const ABC = ['A', 'B', 'C']
const DISCOUNTS = [0, 50, 80]
const DEFAULT_ENTRY = '2026-10-01T10:00'
const cloneRule = (k: PresetKey): FeeRule => ({ ...PRESETS[k], tiers: PRESETS[k].tiers.map((x) => ({ ...x })) })
const defaultLots = (): Lot[] => [{ name: '', rule: cloneRule('private') }, { name: '', rule: cloneRule('seoul2') }]
const won = (n: number) => Math.round(n).toLocaleString('ko-KR')
const int = (v: string | null, d: number) => { const n = parseInt(v ?? '', 10); return Number.isFinite(n) ? n : d }
const pad = (n: number) => String(n).padStart(2, '0')
const localStamp = (d: Date, h: number, m = 0) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(h)}:${pad(m)}`
const seg = (on: boolean) =>
  `px-3 py-2 rounded-lg text-sm font-medium transition-colors ${on ? 'bg-primary text-white' : 'bg-soft text-body hover:bg-subtle'}`

export default function ParkingFee() {
  const t = useTranslations('parkingFee')
  const searchParams = useSearchParams()
  const ready = useRef(false)

  const [mode, setMode] = useState<'dur' | 'time'>('dur')
  const [entry, setEntry] = useState(DEFAULT_ENTRY)
  const [exit, setExit] = useState('2026-10-01T12:30')
  const [durH, setDurH] = useState(2)
  const [durM, setDurM] = useState(30)
  const [discount, setDiscount] = useState(0)
  const [customDisc, setCustomDisc] = useState(false)
  const [lots, setLots] = useState<Lot[]>(defaultLots)
  const [active, setActive] = useState(0)

  // URL → 상태 (한 번)
  useEffect(() => {
    if (ready.current) return
    const g = (k: string) => searchParams.get(k)
    if (g('m') === 't') setMode('time')
    const inn = g('in'), out = g('out')
    if (inn && parseLocal(inn)) setEntry(inn)
    else { const today = new Date(); setEntry(localStamp(today, 10)); setExit(localStamp(today, 12, 30)) }
    if (out && parseLocal(out)) setExit(out)
    setDurH(Math.min(24 * 30, Math.max(0, int(g('h'), 2))))
    setDurM(Math.min(59, Math.max(0, int(g('mi'), 30))))
    const dc = Math.min(100, Math.max(0, int(g('dc'), 0)))
    setDiscount(dc); setCustomDisc(!DISCOUNTS.includes(dc))
    const fromUrl: Lot[] = []
    for (let i = 0; i < 3; i++) {
      const r = decodeRule(g(`l${i}`))
      if (r) fromUrl.push({ name: (g(`n${i}`) ?? '').slice(0, 20), rule: r })
    }
    if (fromUrl.length) setLots(fromUrl)
    setActive(Math.min(Math.max(0, int(g('a'), 0)), (fromUrl.length || 2) - 1))
    ready.current = true
  }, [searchParams])

  // 상태 → URL (공유 링크가 결과를 재현)
  useEffect(() => {
    if (!ready.current) return
    const p = new URLSearchParams()
    if (mode === 'time') { p.set('m', 't'); p.set('out', exit) } else { p.set('h', String(durH)); p.set('mi', String(durM)) }
    p.set('in', entry)
    if (discount) p.set('dc', String(discount))
    lots.forEach((l, i) => { p.set(`l${i}`, encodeRule(l.rule)); if (l.name) p.set(`n${i}`, l.name) })
    if (active) p.set('a', String(active))
    window.history.replaceState(null, '', `${window.location.pathname}?${p}`)
  }, [mode, entry, exit, durH, durM, discount, lots, active])

  const start = parseLocal(entry)?.start ?? parseLocal(DEFAULT_ENTRY)!.start
  const total = mode === 'dur' ? durH * 60 + durM : minutesBetween(entry, exit)
  const lotName = (i: number) => lots[i]?.name || t('lots.defaultName', { n: ABC[i] })

  const fmtDur = (min: number) => {
    const d = Math.floor(min / 1440), h = Math.floor((min % 1440) / 60), m = min % 60
    return [d && `${d}${t('days')}`, h && `${h}${t('hours')}`, (m || (!d && !h)) && `${m}${t('minutes')}`].filter(Boolean).join(' ')
  }
  const fmtClock = (offset: number) => {
    const c = clockAt(start, offset)
    return c.plusDays ? `${c.hhmm} ${t('nextDay', { n: c.plusDays })}` : c.hhmm
  }

  const results = useMemo(
    () => (total == null ? null : lots.map((l) => calcFee(l.rule, total, start, discount))),
    [lots, total, start.dow, start.mod, discount], // eslint-disable-line react-hooks/exhaustive-deps
  )
  const cur = lots[Math.min(active, lots.length - 1)]
  const res = results?.[Math.min(active, lots.length - 1)]
  const next = useMemo(
    () => (total == null ? null : nextIncrease(cur.rule, total, start, discount)),
    [cur, total, start.dow, start.mod, discount], // eslint-disable-line react-hooks/exhaustive-deps
  )
  const tl = useMemo(
    () => (total == null || total === 0 ? [] : timeline(cur.rule, total, start, discount)),
    [cur, total, start.dow, start.mod, discount], // eslint-disable-line react-hooks/exhaustive-deps
  )
  const minFee = results ? Math.min(...results.map((r) => r.fee)) : 0
  const cheapestIdx = results ? results.findIndex((r) => r.fee === minFee) : -1

  const setRule = (patch: Partial<FeeRule>) =>
    setLots((ls) => ls.map((l, i) => (i === active ? { ...l, rule: { ...l.rule, ...patch } } : l)))
  const setName = (name: string) => setLots((ls) => ls.map((l, i) => (i === active ? { ...l, name: name.slice(0, 20) } : l)))
  const setTier = (idx: number, key: 'amount' | 'min', v: number) => {
    const tiers = [0, 1, 2].map((i) => ({ amount: cur.rule.tiers[i]?.amount ?? 0, min: cur.rule.tiers[i]?.min ?? 0 }))
    tiers[idx][key] = v
    setRule({ tiers })
  }
  const addLot = () => { if (lots.length < 3) { setLots([...lots, { name: '', rule: cloneRule('mart') }]); setActive(lots.length) } }
  const removeLot = (i: number) => {
    if (lots.length < 2) return
    setLots(lots.filter((_, j) => j !== i))
    setActive((a) => Math.max(0, a >= i ? a - 1 : a))
  }
  const reset = () => {
    setMode('dur'); setDurH(2); setDurM(30); setDiscount(0); setCustomDisc(false); setLots(defaultLots()); setActive(0)
    const today = new Date(); setEntry(localStamp(today, 10)); setExit(localStamp(today, 12, 30))
  }
  const presetOf = (r: FeeRule) => PRESET_KEYS.find((k) => encodeRule(PRESETS[k]) === encodeRule(r))
  const activePreset = presetOf(cur.rule)

  const heroLabel = total != null ? t('hero.label', { time: fmtDur(total), name: lotName(active) }) : ''
  const heroSub = !res || !next ? (res ? t('hero.noMore') : '')
    : t('hero.next', { after: fmtDur(next.after), clock: fmtClock((total ?? 0) + next.after), fee: won(next.fee) })
  const others = results && lots.length > 1 ? results.map((r, i) => ({ i, fee: r.fee })).filter((x) => x.i !== active) : []

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-fg">{t('title')}</h1>
        <p className="text-sm text-muted mt-1">{t('description')}</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* 입력 */}
        <div className="lg:col-span-1 space-y-6">
          <div className="ui-card p-6 space-y-4">
            <h2 className="text-lg font-semibold text-fg">{t('duration')}</h2>
            <div className="grid grid-cols-2 gap-2">
              <button className={seg(mode === 'dur')} onClick={() => setMode('dur')}>{t('mode.duration')}</button>
              <button className={seg(mode === 'time')} onClick={() => setMode('time')}>{t('mode.times')}</button>
            </div>
            <div>
              <label htmlFor="pf-in" className="block text-sm font-medium text-body mb-2">{t('startTime')}</label>
              <input id="pf-in" type="datetime-local" value={entry} onChange={(e) => e.target.value && setEntry(e.target.value)} className="ui-field w-full px-4 py-3" />
            </div>
            {mode === 'dur' ? (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <Num id="pf-h" label={t('hours')} value={durH} max={720} onChange={setDurH} />
                  <Num id="pf-m" label={t('minutes')} value={durM} max={59} onChange={setDurM} />
                </div>
                <div className="flex flex-wrap gap-2">
                  {[30, 60, 120, 180, 300, 600].map((m) => (
                    <button key={m} className={seg(total === m)} onClick={() => { setDurH(Math.floor(m / 60)); setDurM(m % 60) }}>{fmtDur(m)}</button>
                  ))}
                </div>
                {total != null && <p className="text-sm text-muted">{t('exitAt', { time: fmtClock(total) })}</p>}
              </>
            ) : (
              <div>
                <label htmlFor="pf-out" className="block text-sm font-medium text-body mb-2">{t('endTime')}</label>
                <input id="pf-out" type="datetime-local" value={exit} onChange={(e) => e.target.value && setExit(e.target.value)} className="ui-field w-full px-4 py-3" />
                {total == null
                  ? <p className="text-sm text-red-600 mt-2">{t('timeError')}</p>
                  : <p className="text-sm text-muted mt-2">{t('result.totalTime')}: {fmtDur(total)}</p>}
              </div>
            )}
            <p className="text-xs text-faint">{t('entryHint')}</p>
          </div>

          <div className="ui-card p-6 space-y-3">
            <h2 className="text-lg font-semibold text-fg">{t('discount.title')}</h2>
            <div className="grid grid-cols-2 gap-2">
              {DISCOUNTS.map((d, i) => (
                <button key={d} className={seg(!customDisc && discount === d)} onClick={() => { setCustomDisc(false); setDiscount(d) }}>
                  {t(['discount.none', 'discount.compact', 'discount.disabled'][i])}
                </button>
              ))}
              <button className={seg(customDisc)} onClick={() => setCustomDisc(true)}>{t('discount.custom')}</button>
            </div>
            {customDisc && <Num id="pf-dc" label={t('discount.pct')} value={discount} max={100} onChange={setDiscount} />}
            <p className="text-xs text-muted">{t('discount.hint')}</p>
          </div>

          <button onClick={reset} className="ui-btn-soft w-full px-4 py-2">{t('reset')}</button>
        </div>

        {/* 결과 + 주차장 */}
        <div className="lg:col-span-2 space-y-6">
          {res ? (
            <>
              <div className="ui-hero p-6">
                <div className="text-sm text-white/70">{heroLabel}</div>
                <div className="text-4xl font-bold mt-2 tabular-nums">{won(res.fee)}{t('result.won')}</div>
                <div className="text-sm text-white/80 mt-2">
                  {res.grace ? t('result.grace') : res.charged === 0 ? t('hero.free') : null}
                  {(res.grace || res.charged === 0) && ' · '}{heroSub}
                </div>
                {others.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-4">
                    {cheapestIdx === active && others.every((o) => o.fee > res.fee) && <span className="rounded-full bg-white/15 px-3 py-1 text-sm">{t('hero.cheapest')}</span>}
                    {others.map((o) => (
                      <span key={o.i} className="rounded-full bg-white/15 px-3 py-1 text-sm">
                        {o.fee === res.fee ? t('hero.same', { name: lotName(o.i) })
                          : t(res.fee > o.fee ? 'hero.moreThan' : 'hero.lessThan', { name: lotName(o.i), diff: won(Math.abs(res.fee - o.fee)) })}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <ShareResult
                card={{
                  tool: t('title'),
                  label: heroLabel,
                  headline: `${won(res.fee)}${t('result.won')}`,
                  sub: heroSub || undefined,
                  rows: lots.length > 1 && results
                    ? lots.map((_, i) => ({ label: lotName(i), value: `${won(results[i].fee)}${t('result.won')}` }))
                    : [{ label: t('result.chargedTime'), value: fmtDur(res.charged) }, { label: t('result.baseFee'), value: `${won(res.baseFee)}${t('result.won')}` }],
                }}
                text={t('share.text', { time: fmtDur(total ?? 0), name: lotName(active), fee: won(res.fee) })}
                fileName="parking-fee"
              />

              {lots.length > 1 && results && (
                <div className="ui-card p-6">
                  <h2 className="text-lg font-semibold text-fg">{t('compare.title')}</h2>
                  <p className="text-sm text-muted mt-1">{t('compare.hint', { time: fmtDur(total ?? 0) })}</p>
                  <div className={`grid gap-3 mt-4 ${lots.length === 3 ? 'sm:grid-cols-3' : 'sm:grid-cols-2'}`}>
                    {lots.map((_, i) => {
                      const best = results[i].fee === minFee
                      return (
                        <button key={i} onClick={() => setActive(i)}
                          className={`text-left rounded-2xl border p-4 transition-colors ${best ? 'bg-primary-soft border-primary' : 'border-line hover:bg-subtle'} ${i === active ? 'ring-2 ring-primary' : ''}`}>
                          <div className="flex items-center justify-between gap-2">
                            <span className={`text-sm font-medium ${best ? 'text-primary' : 'text-sub'}`}>{lotName(i)}</span>
                            {best && <span className="text-xs font-semibold rounded-full bg-primary text-white px-2 py-0.5">{t('compare.cheapest')}</span>}
                          </div>
                          <div className="text-2xl font-bold text-fg tabular-nums mt-1">{won(results[i].fee)}{t('result.won')}</div>
                          {!best && <div className="text-xs text-muted tabular-nums">{t('compare.diff', { diff: won(results[i].fee - minFee) })}</div>}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}

              <div className="ui-card p-6 grid md:grid-cols-2 gap-6">
                <div>
                  <h2 className="text-lg font-semibold text-fg mb-2">{t('result.title')}</h2>
                  <dl className="divide-y divide-line text-sm">
                    <Row label={t('result.totalTime')} value={fmtDur(res.total)} />
                    {res.free > 0 && <Row label={t('result.freeTime')} value={`-${fmtDur(res.free)}`} />}
                    <Row label={t('result.chargedTime')} value={fmtDur(res.charged)} />
                    {res.baseFee > 0 && <Row label={t('result.baseFee')} value={`${won(res.baseFee)}${t('result.won')}`} />}
                    {res.extraUnits > 0 && <Row label={t('result.extra', { n: res.extraUnits })} value={`${won(res.extraFee)}${t('result.won')}`} />}
                    {res.timeSaving > 0 && <Row label={t('result.timeSaving')} value={`-${won(res.timeSaving)}${t('result.won')}`} />}
                    {res.capSaving > 0 && <Row label={t('result.capSaving', { n: res.capDays })} value={`-${won(res.capSaving)}${t('result.won')}`} />}
                    {res.discount > 0 && <Row label={t('result.discount')} value={`-${won(res.discount)}${t('result.won')}`} />}
                    <Row label={t('result.total')} value={`${won(res.fee)}${t('result.won')}`} strong />
                  </dl>
                </div>
                {tl.length > 0 && (
                  <div>
                    <h2 className="text-lg font-semibold text-fg mb-2">{t('timeline.title')}</h2>
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-muted text-left">
                          <th className="py-1.5 font-medium">{t('timeline.time')}</th>
                          <th className="py-1.5 font-medium">{t('timeline.clock')}</th>
                          <th className="py-1.5 font-medium text-right">{t('timeline.fee')}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-line tabular-nums">
                        {tl.map((row, i) => (
                          <tr key={row.min} className={i === tl.length - 1 ? 'font-semibold text-fg' : 'text-body'}>
                            <td className="py-1.5">{fmtDur(row.min)}</td>
                            <td className="py-1.5 text-sub">{fmtClock(row.min)}</td>
                            <td className="py-1.5 text-right">{won(row.fee)}{t('result.won')}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="ui-card p-6 text-sm text-muted">{t('timeError')}</div>
          )}

          {/* 주차장 요금 설정 */}
          <div className="ui-card p-6 space-y-5">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-lg font-semibold text-fg">{t('settings.title')}</h2>
              {lots.length < 3 && (
                <button onClick={addLot} className="ui-btn-soft px-3 py-1.5 text-sm inline-flex items-center gap-1"><Plus className="w-4 h-4" />{t('lots.add')}</button>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {lots.map((_, i) => (
                <span key={i} className="inline-flex">
                  <button className={`${seg(i === active)} ${lots.length > 1 ? 'rounded-r-none' : ''}`} onClick={() => setActive(i)}>{lotName(i)}</button>
                  {lots.length > 1 && (
                    <button aria-label={t('lots.remove')} onClick={() => removeLot(i)}
                      className={`${seg(i === active)} rounded-l-none px-2`}><X className="w-3.5 h-3.5" /></button>
                  )}
                </span>
              ))}
            </div>

            <div>
              <label htmlFor="pf-name" className="block text-sm font-medium text-body mb-2">{t('lots.name')}</label>
              <input id="pf-name" value={cur.name} placeholder={t('lots.defaultName', { n: ABC[active] })} onChange={(e) => setName(e.target.value)} className="ui-field w-full px-4 py-3" />
            </div>

            <div>
              <div className="text-sm font-medium text-body mb-2">{t('presets.title')}</div>
              <div className="flex flex-wrap gap-2">
                {PRESET_KEYS.map((k) => (
                  <button key={k} className={seg(activePreset === k)} onClick={() => setRule(cloneRule(k))}>{t(`presets.${k}`)}</button>
                ))}
              </div>
              <p className="text-xs text-muted mt-2">
                {t('presets.seoulNote')}{' '}
                <a href={SEOUL_SOURCE} target="_blank" rel="noopener noreferrer" className="text-primary underline">{t('presets.source')}</a>
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Num id="pf-bm" label={t('settings.baseMinutes')} value={cur.rule.baseMin} onChange={(v) => setRule({ baseMin: v })} />
              <Num id="pf-bf" label={t('settings.baseFee')} value={cur.rule.baseFee} step={100} onChange={(v) => setRule({ baseFee: v })} />
              <Num id="pf-um" label={t('settings.additionalMinutes')} value={cur.rule.unitMin} min={1} onChange={(v) => setRule({ unitMin: v })} />
              <Num id="pf-uf" label={t('settings.additionalFee')} value={cur.rule.unitFee} step={100} onChange={(v) => setRule({ unitFee: v })} />
              <Num id="pf-max" label={t('settings.dailyMax')} value={cur.rule.dailyMax} step={1000} onChange={(v) => setRule({ dailyMax: v })} hint={t('settings.dailyMaxHint')} />
              <Num id="pf-gr" label={t('settings.graceMin')} value={cur.rule.graceMin} onChange={(v) => setRule({ graceMin: v })} hint={t('settings.graceHint')} />
            </div>

            <details className="bg-subtle rounded-2xl p-4" open={cur.rule.freeMin > 0 || cur.rule.tiers.length > 0}>
              <summary className="cursor-pointer text-sm font-medium text-body">{t('settings.freeTitle')}</summary>
              <div className="space-y-3 mt-3">
                <div className="grid grid-cols-2 gap-3">
                  <Num id="pf-free" label={t('settings.freeMinutes')} value={cur.rule.freeMin} onChange={(v) => setRule({ freeMin: v })} />
                  <Num id="pf-spend" label={t('settings.spend')} value={cur.rule.spend} step={10000} onChange={(v) => setRule({ spend: v })} />
                </div>
                {[0, 1, 2].map((i) => (
                  <div key={i} className="grid grid-cols-2 gap-3">
                    <Num id={`pf-ta${i}`} label={t('settings.tierAmount')} value={cur.rule.tiers[i]?.amount ?? 0} step={10000} onChange={(v) => setTier(i, 'amount', v)} />
                    <Num id={`pf-tm${i}`} label={t('settings.tierMin')} value={cur.rule.tiers[i]?.min ?? 0} step={30} onChange={(v) => setTier(i, 'min', v)} />
                  </div>
                ))}
                <p className="text-xs text-muted">{t('settings.tierHint')}</p>
              </div>
            </details>

            <details className="bg-subtle rounded-2xl p-4" open={cur.rule.nightPct > 0 || cur.rule.weekendPct > 0}>
              <summary className="cursor-pointer text-sm font-medium text-body">{t('settings.timeTitle')}</summary>
              <div className="space-y-3 mt-3">
                <div className="grid grid-cols-3 gap-3">
                  <Num id="pf-ns" label={t('settings.nightStart')} value={cur.rule.nightStart} max={23} onChange={(v) => setRule({ nightStart: v })} />
                  <Num id="pf-ne" label={t('settings.nightEnd')} value={cur.rule.nightEnd} max={23} onChange={(v) => setRule({ nightEnd: v })} />
                  <Num id="pf-np" label={t('settings.nightPct')} value={cur.rule.nightPct} max={100} onChange={(v) => setRule({ nightPct: v })} />
                </div>
                <Num id="pf-wp" label={t('settings.weekendPct')} value={cur.rule.weekendPct} max={100} onChange={(v) => setRule({ weekendPct: v })} />
                <p className="text-xs text-muted">{t('settings.timeHint')}</p>
              </div>
            </details>
          </div>
        </div>
      </div>

      {/* 가이드 */}
      <div className="ui-card p-6 space-y-6">
        <h2 className="text-xl font-semibold text-fg">{t('guide.title')}</h2>
        {(['structure', 'tips'] as const).map((s) => (
          <div key={s}>
            <h3 className="text-lg font-semibold text-fg mb-3">{t(`guide.${s}.title`)}</h3>
            <ul className="space-y-2 list-disc pl-5 text-body">
              {((t.raw(`guide.${s}.items`) as string[]) ?? []).map((item, i) => <li key={i}>{item}</li>)}
            </ul>
          </div>
        ))}
        <div>
          <h3 className="text-lg font-semibold text-fg mb-3">{t('guide.faq.title')}</h3>
          <div className="space-y-4">
            {((t.raw('guide.faq.items') as { q: string; a: string }[]) ?? []).map((f, i) => (
              <div key={i}>
                <div className="font-medium text-fg">{f.q}</div>
                <p className="text-sm text-sub mt-1">{f.a}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function Num({ id, label, value, onChange, min = 0, max, step = 1, hint }: {
  id: string; label: string; value: number; onChange: (v: number) => void; min?: number; max?: number; step?: number; hint?: string
}) {
  return (
    <div>
      <label htmlFor={id} className="block text-xs font-medium text-sub mb-1.5">{label}</label>
      <input id={id} type="number" inputMode="numeric" min={min} max={max} step={step} value={value}
        onChange={(e) => { const n = parseInt(e.target.value, 10); onChange(Math.min(max ?? Infinity, Math.max(min, Number.isFinite(n) ? n : min))) }}
        className="ui-field w-full px-3 py-2.5 tabular-nums" />
      {hint && <p className="text-xs text-faint mt-1">{hint}</p>}
    </div>
  )
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between py-2.5">
      <dt className={strong ? 'font-semibold text-fg' : 'text-sub'}>{label}</dt>
      <dd className={`tabular-nums ${strong ? 'text-lg font-bold text-fg' : 'text-body'}`}>{value}</dd>
    </div>
  )
}
