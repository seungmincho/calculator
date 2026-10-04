'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { useTranslations } from '@/lib/i18n'
import '@/lib/i18n/ns/sleepCalculator'
import { useSearchParams } from '@/hooks/useSearchParams'
import { AlertTriangle, Copy, Check } from 'lucide-react'
import ShareResult from '@/components/ShareResult'
import {
  AGES, AGE_SELECT, CYCLE, LATENCY, CAFFEINE_CUTOFF_H, DAY, clamp, parseHM, fmtHM, fmt12,
  bedtimes, wakeTimes, naps, isPast, sleepDebt, caffeineCutoff, type AgeKey, type Opt,
} from '@/utils/sleep'

type Mode = 'wake' | 'bed' | 'nap'
const MODES: Mode[] = ['wake', 'bed', 'nap']
const DEBT_KEY = 'toolhub.sleepDebt'
const AGE_KEYS = Object.keys(AGES) as AgeKey[]
const ageLabelKey = (a: AgeKey) => `age${a[0].toUpperCase()}${a.slice(1)}`

export default function SleepCalculator() {
  const t = useTranslations('sleepCalculator')
  const sp = useSearchParams()

  // 구버전 파라미터(mode=sleepNow|wakeAt, fallAsleep) 호환
  const [mode, setMode] = useState<Mode>(() => {
    const m = sp.get('mode')
    if (m === 'sleepNow') return 'bed'
    return MODES.includes(m as Mode) ? (m as Mode) : 'wake'
  })
  const [wake, setWake] = useState<number>(() => parseHM(sp.get('wake')) ?? 7 * 60)
  // null = 지금
  const [bed, setBed] = useState<number | null>(() => parseHM(sp.get('bed')))
  const [napAt, setNapAt] = useState<number | null>(() => parseHM(sp.get('nap')))
  const [cycle, setCycle] = useState<number>(() => clamp(Number(sp.get('cycle')) || CYCLE.def, CYCLE.min, CYCLE.max))
  const [latency, setLatency] = useState<number>(() => {
    const v = sp.get('lat') ?? sp.get('fallAsleep')
    return v != null && v !== '' && !isNaN(+v) ? clamp(Math.round(+v), LATENCY.min, LATENCY.max) : LATENCY.def
  })
  const [age, setAge] = useState<AgeKey>(() => (AGE_SELECT.includes(sp.get('age') as AgeKey) ? (sp.get('age') as AgeKey) : 'adult'))
  const [h12, setH12] = useState(() => sp.get('h12') === '1')
  const [pick, setPick] = useState<number | null>(null) // 선택한 옵션 key (주기 수 / 낮잠 분)
  const [copied, setCopied] = useState(false)

  // 현재 시각은 마운트 후에만(SSR/하이드레이션 일치). 그전엔 '지금' = 23:00 가정.
  const [now, setNow] = useState<number | null>(null)
  useEffect(() => {
    const tick = () => { const d = new Date(); setNow(d.getHours() * 60 + d.getMinutes()) }
    tick()
    const id = setInterval(tick, 20_000)
    return () => clearInterval(id)
  }, [])

  // 수면 부채(localStorage)
  const [debtH, setDebtH] = useState<(number | null)[]>(() => Array(7).fill(null))
  const [target, setTarget] = useState(8)
  const [debtLoaded, setDebtLoaded] = useState(false)
  useEffect(() => {
    try {
      const d = JSON.parse(localStorage.getItem(DEBT_KEY) ?? 'null')
      if (Array.isArray(d?.h) && d.h.length === 7) setDebtH(d.h.map((v: unknown) => (typeof v === 'number' ? v : null)))
      if (typeof d?.target === 'number') setTarget(d.target)
    } catch { /* 저장소 차단: 무시 */ }
    setDebtLoaded(true)
  }, [])
  useEffect(() => {
    if (!debtLoaded) return
    try { localStorage.setItem(DEBT_KEY, JSON.stringify({ h: debtH, target })) } catch { /* 무시 */ }
  }, [debtH, target, debtLoaded])

  useEffect(() => {
    const url = new URL(window.location.href)
    const q = url.searchParams
    q.set('mode', mode)
    q.set('wake', fmtHM(wake))
    q.set('bed', bed == null ? 'now' : fmtHM(bed))
    if (mode === 'nap') q.set('nap', napAt == null ? 'now' : fmtHM(napAt)); else q.delete('nap')
    q.set('cycle', String(cycle))
    q.set('lat', String(latency))
    q.set('age', age)
    if (h12) q.set('h12', '1'); else q.delete('h12')
    q.delete('fallAsleep')
    window.history.replaceState({}, '', url)
  }, [mode, wake, bed, napAt, cycle, latency, age, h12])

  const clock = useCallback((min: number) => {
    if (!h12) return fmtHM(min)
    const c = fmt12(min)
    return t('u.clock12', { p: c.pm ? t('u.pm') : t('u.am'), hm: c.hm })
  }, [h12, t])
  const dur = useCallback((min: number) => {
    const h = Math.floor(min / 60), m = Math.round(min % 60)
    return m ? t('u.durHM', { h, m }) : t('u.durH', { h })
  }, [t])

  const bedMin = bed ?? now ?? 23 * 60
  const napMin = napAt ?? now ?? 14 * 60
  const [lo, hi] = AGES[age]

  const opts: Opt[] = useMemo(
    () => (mode === 'wake' ? bedtimes(wake, cycle, latency, age) : wakeTimes(bedMin, cycle, latency, age)),
    [mode, wake, bedMin, cycle, latency, age],
  )
  const past = (o: Opt) => mode === 'wake' && now != null && isPast(now, wake, o, latency)
  const napOpts = useMemo(() => naps(napMin, cycle, latency), [napMin, cycle, latency])

  // 기본 선택: 권장 범위 안에서 가장 짧은(=가장 늦게 자도 / 가장 일찍 일어나도 되는) 옵션
  const inRange = opts.filter((o) => o.inRange && !past(o))
  const defaultPick = (inRange[inRange.length - 1] ?? opts.find((o) => !past(o)) ?? opts[0]).cycles
  const sel = opts.find((o) => o.cycles === pick) ?? opts.find((o) => o.cycles === defaultPick)!
  const nap = napOpts.find((n) => n.len === pick) ?? napOpts[1]
  const allPast = mode === 'wake' && now != null && opts.every((o) => !o.inRange || past(o))
  const availMin = now == null ? 0 : ((wake - now + DAY) % DAY || DAY) - latency

  // 선택 결과(취침=누울 시각, 기상=알람)
  const lieDown = mode === 'wake' ? sel.time : mode === 'bed' ? bedMin : napMin
  const alarm = mode === 'wake' ? wake : mode === 'bed' ? sel.time : nap.time
  const sleepLen = mode === 'nap' ? nap.len : sel.sleepMin
  const recTimes = mode === 'nap' ? [] : opts.filter((o) => o.inRange && !past(o)).map((o) => clock(o.time))
  const nowLabel = now == null ? '' : clock(now)

  const heroLabel =
    mode === 'wake' ? t('u.heroWake', { time: clock(wake) })
      : mode === 'bed' ? (bed == null ? (now == null ? t('modeNow') : t('u.heroNow', { time: nowLabel })) : t('u.heroBed', { time: clock(bedMin) }))
        : napAt == null ? t('u.heroNapNow') : t('u.heroNap', { time: clock(napMin) })
  const heroTime = mode === 'wake' ? clock(sel.time) : clock(alarm)
  const heroSub = mode === 'nap'
    ? t('u.napSub', { len: nap.len })
    : t('u.optSub', { c: sel.cycles, d: dur(sel.sleepMin) })

  const alarmText = t('u.alarmText', { bed: clock(lieDown), wake: clock(alarm), d: dur(sleepLen) })
  const copyAlarm = useCallback(async () => {
    try { await navigator.clipboard.writeText(alarmText) } catch { /* 권한 없음 */ }
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [alarmText])

  const shareHeadline = mode === 'nap'
    ? t('u.share.nap', { start: clock(napMin), wake: clock(nap.time) })
    : mode === 'wake'
      ? t('u.share.wake', { wake: clock(wake), list: (recTimes.length ? recTimes : [clock(sel.time)]).join(t('u.or')) })
      : t('u.share.bed', { bed: clock(bedMin), list: (recTimes.length ? recTimes : [clock(sel.time)]).join(t('u.or')) })

  const debt = sleepDebt(debtH, target)
  const days = (t.raw('u.debt.days') as string[] | undefined) ?? []

  const seg = (active: boolean) =>
    `px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${active ? 'bg-primary text-white' : 'bg-soft text-body hover:bg-subtle'}`

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-fg">{t('title')}</h1>
        <p className="text-sm text-muted mt-1">{t('description')}</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* ── 입력 ── */}
        <div className="lg:col-span-1 space-y-6">
          <div className="ui-card p-6 space-y-5">
            <div className="grid grid-cols-3 gap-2" role="group" aria-label={t('u.modeLabel')}>
              {MODES.map((m) => (
                <button key={m} onClick={() => { setMode(m); setPick(null) }} aria-pressed={mode === m} className={seg(mode === m)}>
                  {t(`u.modes.${m}`)}
                </button>
              ))}
            </div>

            {mode === 'wake' && (
              <div>
                <label htmlFor="sl-wake" className="block text-sm font-medium text-body mb-2">{t('wakeUpAt')}</label>
                <input id="sl-wake" type="time" value={fmtHM(wake)}
                  onChange={(e) => { const m = parseHM(e.target.value); if (m != null) { setWake(m); setPick(null) } }}
                  className="ui-field px-4 py-3 text-lg tabular-nums" />
              </div>
            )}

            {(mode === 'bed' || mode === 'nap') && (() => {
              const val = mode === 'bed' ? bed : napAt
              const set = mode === 'bed' ? setBed : setNapAt
              const shown = mode === 'bed' ? bedMin : napMin
              return (
                <div>
                  <label htmlFor="sl-bed" className="block text-sm font-medium text-body mb-2">
                    {mode === 'bed' ? t('u.bedAt') : t('u.napAt')}
                  </label>
                  <div className="grid grid-cols-2 gap-2 mb-2">
                    <button onClick={() => { set(null); setPick(null) }} aria-pressed={val == null} className={seg(val == null)}>
                      {t('u.now')}{val == null && now != null ? ` ${fmtHM(now)}` : ''}
                    </button>
                    <button onClick={() => { set(shown); setPick(null) }} aria-pressed={val != null} className={seg(val != null)}>
                      {t('u.pickTime')}
                    </button>
                  </div>
                  {val != null && (
                    <input id="sl-bed" type="time" value={fmtHM(val)}
                      onChange={(e) => { const m = parseHM(e.target.value); if (m != null) { set(m); setPick(null) } }}
                      className="ui-field px-4 py-3 text-lg tabular-nums" />
                  )}
                </div>
              )
            })()}

            {mode !== 'nap' && (
              <div>
                <p className="text-sm font-medium text-body mb-2">{t('ageGroupLabel')}</p>
                <div className="grid grid-cols-2 gap-2">
                  {AGE_SELECT.map((a) => (
                    <button key={a} onClick={() => { setAge(a); setPick(null) }} aria-pressed={age === a} className={`${seg(age === a)} text-xs`}>
                      {t(ageLabelKey(a))}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div>
              <div className="flex justify-between text-sm mb-2">
                <label htmlFor="sl-lat" className="font-medium text-body">{t('fallAsleepTime')}</label>
                <span className="text-fg font-semibold tabular-nums">{latency}{t('minutes')}</span>
              </div>
              <input id="sl-lat" type="range" min={LATENCY.min} max={LATENCY.max} step={1} value={latency}
                onChange={(e) => { setLatency(+e.target.value); setPick(null) }} className="w-full accent-[var(--primary)]" />
              <p className="text-xs text-muted mt-1">{t('u.latNote')}</p>
            </div>

            <div>
              <div className="flex justify-between text-sm mb-2">
                <label htmlFor="sl-cycle" className="font-medium text-body">{t('u.cycleLen')}</label>
                <span className="text-fg font-semibold tabular-nums">{cycle}{t('minutes')}</span>
              </div>
              <input id="sl-cycle" type="range" min={CYCLE.min} max={CYCLE.max} step={5} value={cycle}
                onChange={(e) => { setCycle(+e.target.value); setPick(null) }} className="w-full accent-[var(--primary)]" />
              <p className="text-xs text-muted mt-1">{t('u.cycleNote')}</p>
            </div>

            <div className="grid grid-cols-2 gap-2" role="group" aria-label={t('u.clockFormat')}>
              <button onClick={() => setH12(false)} aria-pressed={!h12} className={seg(!h12)}>{t('u.h24')}</button>
              <button onClick={() => setH12(true)} aria-pressed={h12} className={seg(h12)}>{t('u.h12')}</button>
            </div>
          </div>
        </div>

        {/* ── 결과 ── */}
        <div className="lg:col-span-2 space-y-6">
          <div className="ui-hero p-6 sm:p-8">
            <p className="text-sm text-white/70">{heroLabel}</p>
            <p className="text-sm text-white/70 mt-3">{mode === 'wake' ? t('u.heroBedtime') : t('u.heroAlarm')}</p>
            <p className="text-4xl sm:text-5xl font-bold tabular-nums mt-1">{heroTime}</p>
            <p className="text-sm text-white/80 mt-2 tabular-nums">{heroSub}</p>
            <div className="mt-6 pt-4 border-t border-white/20 flex flex-wrap items-center justify-between gap-3 text-sm">
              <span className="text-white/80 tabular-nums">{alarmText}</span>
              <button onClick={copyAlarm} className="inline-flex items-center gap-1.5 bg-white/15 hover:bg-white/25 rounded-xl px-3 py-2 font-medium">
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copied ? t('linkCopied') : t('u.copyAlarm')}
              </button>
            </div>
          </div>

          <ShareResult
            card={{
              tool: t('title'),
              label: heroLabel,
              headline: mode === 'wake' ? clock(sel.time) : clock(alarm),
              sub: shareHeadline,
              rows: mode === 'nap'
                ? napOpts.map((n) => ({ label: t('u.napLen', { len: n.len }), value: clock(n.time) }))
                : opts.filter((o) => !past(o)).slice(0, 5).map((o) => ({ label: t('u.optSub', { c: o.cycles, d: dur(o.sleepMin) }), value: clock(o.time) })),
            }}
            text={shareHeadline}
            fileName="sleep-calculator"
          />

          {allPast && (
            <div className="bg-amber-50 text-amber-800 rounded-2xl p-5 flex gap-3 text-sm">
              <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
              <p>{t('u.warnPast', { lo, d: dur(Math.max(0, availMin)) })}</p>
            </div>
          )}

          {/* 옵션 목록 */}
          <div className="ui-card p-6">
            <h2 className="text-lg font-semibold text-fg">
              {mode === 'wake' ? t('resultTitleBedTime') : mode === 'bed' ? t('resultTitleWakeUp') : t('u.napTitle')}
            </h2>
            {mode !== 'nap' && <p className="text-xs text-muted mt-1">{t('u.rangeNote', { lo, hi, age: t(ageLabelKey(age)) })}</p>}
            <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-3 mt-4">
              {mode === 'nap'
                ? napOpts.map((n) => {
                  const on = n.len === nap.len
                  return (
                    <button key={n.len} onClick={() => setPick(n.len)} aria-pressed={on}
                      className={`text-left rounded-2xl p-4 border transition-colors ${on ? 'bg-primary-soft border-primary' : 'bg-surface border-line hover:bg-subtle'}`}>
                      <div className="flex items-center justify-between gap-2">
                        <span className={`text-xs font-semibold ${on ? 'text-primary' : 'text-sub'}`}>{t('u.napLen', { len: n.len })}</span>
                        {n.len === 20 && <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-primary text-white">{t('recommended')}</span>}
                      </div>
                      <p className="text-2xl font-bold text-fg tabular-nums mt-2">{clock(n.time)}</p>
                      <p className="text-xs text-muted mt-1">{t(n.full ? 'u.napFull' : n.len === 20 ? 'u.napPower' : 'u.napShort')}</p>
                    </button>
                  )
                })
                : opts.map((o) => {
                  const on = o.cycles === sel.cycles
                  const gone = past(o)
                  return (
                    <button key={o.cycles} onClick={() => setPick(o.cycles)} aria-pressed={on}
                      className={`text-left rounded-2xl p-4 border transition-colors ${on ? 'bg-primary-soft border-primary' : 'bg-surface border-line hover:bg-subtle'} ${gone ? 'opacity-50' : ''}`}>
                      <div className="flex items-center justify-between gap-2">
                        <span className={`text-xs font-semibold ${on ? 'text-primary' : 'text-sub'}`}>{t('u.cycles', { c: o.cycles })}</span>
                        {gone ? <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-soft text-muted">{t('u.past')}</span>
                          : o.inRange ? <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-primary text-white">{t('recommended')}</span>
                            : o.short ? <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-800">{t('u.short')}</span>
                              : null}
                      </div>
                      <p className="text-2xl font-bold text-fg tabular-nums mt-2">
                        {clock(o.time)}
                        {mode === 'bed' && o.day > 0 && <span className="text-xs font-medium text-muted ml-1.5">{t('u.nextDay')}</span>}
                      </p>
                      <p className="text-xs text-muted mt-1 tabular-nums">{t('totalSleep')} {dur(o.sleepMin)}</p>
                    </button>
                  )
                })}
            </div>
            {mode !== 'nap' && sel.short && (
              <p className="mt-4 bg-amber-50 text-amber-800 rounded-2xl p-4 text-sm">{t('u.warnShort', { d: dur(sel.sleepMin), lo, hi })}</p>
            )}
          </div>

          <div className="bg-subtle rounded-2xl p-5 text-sm text-sub space-y-2">
            {mode !== 'nap' && <p>{t('u.caffeine', { time: clock(caffeineCutoff(lieDown)), h: CAFFEINE_CUTOFF_H })}</p>}
            {mode === 'nap' && <p>{t('u.napNote')}</p>}
            <p>{t('cycleExplanation')}</p>
          </div>

          {/* 수면 부채 */}
          <div className="ui-card p-6">
            <h2 className="text-lg font-semibold text-fg">{t('u.debt.title')}</h2>
            <p className="text-xs text-muted mt-1">{t('u.debt.note')}</p>
            <div className="grid grid-cols-7 gap-1.5 mt-4">
              {days.map((d, i) => (
                <label key={d} className="text-center text-xs text-sub">
                  {d}
                  <input type="number" inputMode="decimal" min={0} max={24} step={0.5} placeholder="-" value={debtH[i] ?? ''}
                    aria-label={t('u.debt.dayAria', { d })}
                    onChange={(e) => {
                      const v = e.target.value === '' ? null : clamp(+e.target.value, 0, 24)
                      setDebtH((p) => p.map((x, j) => (j === i ? v : x)))
                    }}
                    className="ui-field px-1 py-2 mt-1 text-center text-sm tabular-nums" />
                </label>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-3 mt-4">
              <label htmlFor="sl-target" className="text-sm text-body">{t('u.debt.target')}</label>
              <input id="sl-target" type="number" min={4} max={12} step={0.5} value={target}
                onChange={(e) => setTarget(clamp(+e.target.value || 8, 4, 12))} className="ui-field px-3 py-2 w-20 text-center tabular-nums" />
              <span className="text-sm text-muted">{t('hoursLabel')}</span>
              <button onClick={() => setDebtH(Array(7).fill(null))} className="ml-auto text-xs text-muted hover:text-body">{t('u.debt.reset')}</button>
            </div>
            <div className="grid grid-cols-2 gap-3 mt-4">
              <div className="bg-subtle rounded-2xl p-4">
                <p className="text-xs text-muted">{t('u.debt.deficit')}</p>
                <p className="text-3xl font-bold text-fg tabular-nums mt-1">{dur(debt.deficit * 60)}</p>
              </div>
              <div className="bg-subtle rounded-2xl p-4">
                <p className="text-xs text-muted">{t('u.debt.avg', { n: debt.days })}</p>
                <p className="text-3xl font-bold text-fg tabular-nums mt-1">{debt.days ? dur(debt.avg * 60) : '-'}</p>
              </div>
            </div>
            {debt.deficit >= 5 && <p className="mt-3 bg-amber-50 text-amber-800 rounded-2xl p-4 text-sm">{t('u.debt.warn')}</p>}
            <p className="text-xs text-muted mt-3">{t('u.debt.tip')}</p>
          </div>

          {/* 연령별 권장 수면 */}
          <div className="ui-card p-6">
            <h2 className="text-lg font-semibold text-fg">{t('ageGroupTitle')}</h2>
            <div className="overflow-x-auto mt-4">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-line text-muted">
                    <th className="text-left py-2 px-3 font-medium">{t('ageGroupLabel')}</th>
                    <th className="text-right py-2 px-3 font-medium">{t('recommendedHours')}</th>
                  </tr>
                </thead>
                <tbody>
                  {AGE_KEYS.map((a) => (
                    <tr key={a} className={`border-b border-line last:border-0 ${a === age ? 'bg-primary-soft text-primary font-medium' : 'text-body'}`}>
                      <td className="py-2 px-3">{t(ageLabelKey(a))}</td>
                      <td className="py-2 px-3 text-right tabular-nums">{AGES[a][0]}-{AGES[a][1]} {t('hoursLabel')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-muted mt-3">{t('ageGroupSource')}</p>
          </div>
        </div>
      </div>

      {/* 가이드 */}
      <div className="ui-card p-6 space-y-6">
        <h2 className="text-xl font-semibold text-fg">{t('guideTitle')}</h2>
        <div className="grid md:grid-cols-3 gap-6">
          {(['Habits', 'Science', 'Tips'] as const).map((s) => (
            <div key={s}>
              <h3 className="font-medium text-fg mb-2">{t(`guide${s}Title`)}</h3>
              <ul className="space-y-1.5 text-sm text-body list-disc list-inside">
                {(t.raw(`guide${s}Items`) as string[]).map((item) => <li key={item}>{item}</li>)}
              </ul>
            </div>
          ))}
        </div>
        <div className="bg-subtle rounded-2xl p-5 text-sm text-sub">
          <p className="font-semibold text-body mb-2">{t('u.sourcesTitle')}</p>
          <ul className="space-y-1 list-disc list-inside">
            {((t.raw('u.sources') as string[] | undefined) ?? []).map((s) => <li key={s}>{s}</li>)}
          </ul>
        </div>
      </div>
    </div>
  )
}
