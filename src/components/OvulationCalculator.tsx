'use client'

import { useState, useCallback, useEffect, useMemo, useRef } from 'react'
import Link from 'next/link'
import { useTranslations } from '@/lib/i18n'
import { useSearchParams } from '@/hooks/useSearchParams'
import DatePicker from '@/components/ui/DatePicker'
import GuideSection from '@/components/GuideSection'
import { Minus, Plus, X, Download } from 'lucide-react'
import { todayKST, isValidDate, addDays, daysBetween, weekday, monthGrid, ddayLabel } from '@/utils/dday'
import { dueDate } from '@/utils/dueDate'
import {
  type Settings, type DayType, type IcsSpan,
  CYCLE_MIN, CYCLE_MAX, LUTEAL_MIN, LUTEAL_MAX, PERIOD_MIN, PERIOD_MAX,
  cycleFrom, currentStart, forecast, cycleStats, rangeWindow, dayType, buildIcs,
} from '@/utils/ovulation'

// 개인 건강 정보 → URL 대신 이 브라우저 localStorage에만 저장
const STORE_KEY = 'toolhub-ovulation'
const MONTHS_SHOWN = 6
const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n))

const CELL: Record<DayType, string> = {
  period: 'bg-rose-500/20 text-fg',
  fertile: 'bg-primary-soft text-fg',
  peak: 'bg-primary/40 text-fg font-semibold',
  ovulation: 'bg-primary text-white font-bold',
  range: 'border border-dashed border-primary/60 text-body',
}
const LEGEND: DayType[] = ['period', 'fertile', 'peak', 'ovulation', 'range']

function Stepper({ id, label, hint, value, min, max, unit, onChange, decLabel, incLabel }: {
  id: string; label: string; hint?: string; value: number; min: number; max: number; unit: string; onChange: (n: number) => void
  decLabel: string; incLabel: string
}) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-body mb-2">{label}</label>
      <div className="flex items-center gap-2">
        <button type="button" onClick={() => onChange(clamp(value - 1, min, max))} aria-label={decLabel} aria-controls={id} className="p-3 rounded-xl bg-soft hover:bg-track text-body">
          <Minus className="w-4 h-4" aria-hidden="true" />
        </button>
        <input
          id={id} type="number" inputMode="numeric" min={min} max={max} value={value}
          onChange={e => { const n = parseInt(e.target.value, 10); if (Number.isFinite(n)) onChange(clamp(n, min, max)) }}
          aria-describedby={hint ? `${id}-u ${id}-h` : `${id}-u`}
          className="ui-field w-20 px-3 py-3 text-center tabular-nums"
        />
        <button type="button" onClick={() => onChange(clamp(value + 1, min, max))} aria-label={incLabel} aria-controls={id} className="p-3 rounded-xl bg-soft hover:bg-track text-body">
          <Plus className="w-4 h-4" aria-hidden="true" />
        </button>
        <span id={`${id}-u`} className="text-sm text-sub">{unit}</span>
      </div>
      {hint && <p id={`${id}-h`} className="text-xs text-muted mt-2">{hint}</p>}
    </div>
  )
}

export default function OvulationCalculator() {
  const t = useTranslations('ovulationCalculator')
  const sp = useSearchParams()

  const [today, setToday] = useState('')
  const [s, setS] = useState<Settings>({ lastPeriod: '', cycle: 28, period: 5, luteal: 14 })
  const [history, setHistory] = useState<string[]>([])
  const [newRecord, setNewRecord] = useState('')
  const touched = useRef(false)

  // 초기화: localStorage → 예전 공유 링크(?date=&cycle=&period=)는 읽고 주소에서 지움 → 없으면 오늘 기준 예시
  const inited = useRef(false)
  useEffect(() => {
    if (inited.current) return
    inited.current = true
    const now = todayKST()
    setToday(now)
    let next: Settings = { lastPeriod: addDays(now, -10), cycle: 28, period: 5, luteal: 14 }
    try {
      const saved = JSON.parse(localStorage.getItem(STORE_KEY) || 'null')
      if (saved && isValidDate(saved.lastPeriod)) {
        next = {
          lastPeriod: saved.lastPeriod,
          cycle: clamp(Number(saved.cycle) || 28, CYCLE_MIN, CYCLE_MAX),
          period: clamp(Number(saved.period) || 5, PERIOD_MIN, PERIOD_MAX),
          luteal: clamp(Number(saved.luteal) || 14, LUTEAL_MIN, LUTEAL_MAX),
        }
        if (Array.isArray(saved.history)) setHistory(saved.history.filter(isValidDate))
      }
    } catch { /* 저장 안 됨 */ }
    const d = sp.get('date')
    if (isValidDate(d)) {
      next = { ...next, lastPeriod: d }
      const c = parseInt(sp.get('cycle') ?? '', 10)
      if (c >= CYCLE_MIN && c <= CYCLE_MAX) next.cycle = c
      const p = parseInt(sp.get('period') ?? '', 10)
      if (p >= PERIOD_MIN && p <= PERIOD_MAX) next.period = p
      window.history.replaceState({}, '', window.location.pathname)
    }
    setS(next)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!touched.current) return
    try { localStorage.setItem(STORE_KEY, JSON.stringify({ ...s, history })) } catch { /* 사생활 모드 등 */ }
  }, [s, history])

  const update = useCallback((patch: Partial<Settings>) => { touched.current = true; setS(prev => ({ ...prev, ...patch })) }, [])

  const stats = useMemo(() => cycleStats(history), [history])

  const setRecords = useCallback((list: string[]) => {
    touched.current = true
    const sorted = [...new Set(list)].sort()
    setHistory(sorted)
    const st = cycleStats(sorted)
    setS(prev => ({
      ...prev,
      lastPeriod: sorted.length && sorted[sorted.length - 1] > prev.lastPeriod ? sorted[sorted.length - 1] : prev.lastPeriod,
      cycle: st ? st.avg : prev.cycle,
    }))
  }, [])

  const addRecord = useCallback(() => {
    if (!isValidDate(newRecord)) return
    setRecords([...history, newRecord])
    setNewRecord('')
  }, [newRecord, history, setRecords])

  const clearAll = useCallback(() => {
    try { localStorage.removeItem(STORE_KEY) } catch { /* noop */ }
    touched.current = false
    setHistory([])
    setS({ lastPeriod: addDays(today, -10), cycle: 28, period: 5, luteal: 14 })
  }, [today])

  // ── 결과 ──
  const r = useMemo(() => {
    if (!today || !isValidDate(s.lastPeriod)) return null
    const cur = cycleFrom(currentStart(s, today), s)
    const [y, m] = today.split('-').map(Number)
    const months = Array.from({ length: MONTHS_SHOWN }, (_, i) => ({ y: y + Math.floor((m - 1 + i) / 12), m: ((m - 1 + i) % 12) + 1 }))
    const last = months[MONTHS_SHOWN - 1]
    const until = addDays(`${last.y + (last.m === 12 ? 1 : 0)}-${String((last.m % 12) + 1).padStart(2, '0')}-01`, -1)
    const cycles = forecast(s, today, until)
    const upcoming = Array.from({ length: MONTHS_SHOWN }, (_, i) => cycleFrom(addDays(cur.start, i * s.cycle), s))
    const ranges = stats?.irregular ? cycles.map(c => rangeWindow(c.start, stats.min, stats.max, s.luteal)) : []
    const lateBy = daysBetween(addDays(s.lastPeriod, s.cycle), today) // ≥0 이면 입력한 생리일 기준 예정일이 지남
    return { cur, months, cycles, upcoming, ranges, lateBy, todayType: dayType(today, [cur]), edd: dueDate({ method: 'conception', date: cur.ovulation }) }
  }, [today, s, stats])

  const fmt = useCallback((d: string) => {
    const months = t.raw('months') as string[]
    const wd = t.raw('weekdays') as string[]
    const [, m, day] = d.split('-').map(Number)
    return t('dateFmt', { mon: months[m - 1], d: day, w: wd[weekday(d)] })
  }, [t])
  const fmtFull = useCallback((d: string) => t('dateFull', { y: d.slice(0, 4), rest: fmt(d) }), [t, fmt])

  const status = useMemo(() => {
    if (!r) return ''
    const { cur, todayType } = r
    if (todayType === 'period') return t('status.period', { n: daysBetween(cur.start, today) + 1 })
    if (todayType === 'ovulation') return t('status.ovulation')
    if (todayType === 'peak') return t('status.peak')
    if (todayType === 'fertile') return t('status.fertile')
    if (today < cur.fertileStart) return t('status.beforeFertile', { n: daysBetween(today, cur.fertileStart) })
    return t('status.afterFertile', { n: daysBetween(today, cur.nextStart) })
  }, [r, t, today])

  const exportIcs = useCallback(() => {
    if (!r) return
    const spans: IcsSpan[] = []
    r.upcoming.forEach((c, i) => {
      if (c.fertileEnd >= today) spans.push({ uid: `ovu-f-${c.start}`, start: c.fertileStart, end: c.fertileEnd, title: t('ics.fertile') })
      if (c.ovulation >= today) spans.push({ uid: `ovu-o-${c.start}`, start: c.ovulation, end: c.ovulation, title: t('ics.ovulation') })
      spans.push({ uid: `ovu-p-${c.nextStart}-${i}`, start: c.nextStart, end: addDays(c.nextStart, s.period - 1), title: t('ics.period') })
    })
    const blob = new Blob([buildIcs(spans, today)], { type: 'text/calendar;charset=utf-8' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = 'cycle-forecast.ics'
    a.click()
    setTimeout(() => URL.revokeObjectURL(a.href), 1000)
  }, [r, s.period, t, today])

  const weekdays = t.raw('weekdays') as string[]
  const monthNames = t.raw('months') as string[]

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-fg">{t('title')}</h1>
        <p className="text-sm text-muted mt-1">{t('description')}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* ── 입력 ── */}
        <div className="lg:col-span-1 space-y-4">
          <div className="ui-card p-6 space-y-5">
            <div role="group" aria-labelledby="ov-last">
              <p id="ov-last" className="text-sm font-medium text-body mb-2">{t('lastPeriod')}</p>
              <DatePicker
                label={t('lastPeriod')}
                value={s.lastPeriod}
                onChange={d => update({ lastPeriod: d })}
                maxDate={today ? new Date(today + 'T00:00:00') : undefined}
                placeholder={t('lastPeriod')}
              />
            </div>
            <Stepper id="ov-cycle" label={t('cycleLength')} hint={t('cycleHint')} value={s.cycle} min={CYCLE_MIN} max={CYCLE_MAX} unit={t('days')} onChange={n => update({ cycle: n })}
              decLabel={t('a11y.decrease', { label: t('cycleLength') })} incLabel={t('a11y.increase', { label: t('cycleLength') })} />
            <Stepper id="ov-period" label={t('periodLength')} value={s.period} min={PERIOD_MIN} max={PERIOD_MAX} unit={t('days')} onChange={n => update({ period: n })}
              decLabel={t('a11y.decrease', { label: t('periodLength') })} incLabel={t('a11y.increase', { label: t('periodLength') })} />
            <Stepper id="ov-luteal" label={t('luteal')} hint={t('lutealHint')} value={s.luteal} min={LUTEAL_MIN} max={LUTEAL_MAX} unit={t('days')} onChange={n => update({ luteal: n })}
              decLabel={t('a11y.decrease', { label: t('luteal') })} incLabel={t('a11y.increase', { label: t('luteal') })} />
          </div>

          {/* 기록 → 평균 주기 */}
          <div className="ui-card p-6 space-y-4">
            <div>
              <h2 className="text-base font-semibold text-fg">{t('records.title')}</h2>
              <p className="text-xs text-muted mt-1">{t('records.hint')}</p>
            </div>
            <div className="flex gap-2" role="group" aria-label={t('records.pick')}>
              <DatePicker
                label={t('records.pick')}
                value={newRecord}
                onChange={setNewRecord}
                maxDate={today ? new Date(today + 'T00:00:00') : undefined}
                placeholder={t('records.pick')}
                className="flex-1"
              />
              <button type="button" onClick={addRecord} disabled={!newRecord} className="ui-btn min-h-10 px-4 py-2 text-sm disabled:opacity-40">
                {t('records.add')}
              </button>
            </div>
            {history.length > 0 && (
              <ul className="flex flex-wrap gap-2" aria-label={t('records.title')}>
                {history.map(d => (
                  <li key={d} className="inline-flex items-center gap-1 pl-3 pr-1 py-1 rounded-full bg-soft text-sm text-body tabular-nums">
                    {d}
                    {/* after: 가상 요소로 레이아웃은 그대로 두고 터치 영역만 40px 가까이 확장 */}
                    <button type="button" onClick={() => setRecords(history.filter(x => x !== d))} aria-label={t('a11y.removeRecord', { date: d })} className="relative p-1 rounded-full hover:bg-track after:absolute after:-inset-2.5 after:content-['']">
                      <X className="w-3.5 h-3.5" aria-hidden="true" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {stats ? (
              <div className="bg-subtle rounded-2xl p-4 text-sm text-sub space-y-1">
                <p className="text-body font-medium">{t('records.stats', { n: stats.lengths.length, avg: stats.avg, min: stats.min, max: stats.max })}</p>
                {s.cycle === stats.avg ? (
                  <p>{t('records.applied', { avg: stats.avg })}</p>
                ) : (
                  <button type="button" onClick={() => update({ cycle: stats.avg })} className="text-primary font-medium hover:underline">
                    {t('records.apply', { avg: stats.avg })}
                  </button>
                )}
                {stats.excluded > 0 && <p>{t('records.excluded', { n: stats.excluded })}</p>}
              </div>
            ) : history.length > 0 && <p className="text-xs text-muted">{t('records.needMore')}</p>}
            <button type="button" onClick={clearAll} className="min-h-10 text-xs text-muted hover:text-body underline">{t('records.clear')}</button>
          </div>
        </div>

        {/* ── 결과 ── */}
        <div className="lg:col-span-2 space-y-4">
          {!r ? (
            <div className="ui-card p-6 text-center text-muted">{t('enterDate')}</div>
          ) : (
            <>
              <div className="ui-hero p-6 sm:p-8" aria-live="polite">
                <p className="text-sm text-white/70">{t('nextPeriod')}</p>
                <p className="text-3xl sm:text-4xl font-bold mt-1 tabular-nums">{fmtFull(r.cur.nextStart)}</p>
                <p className="text-sm text-white/80 mt-1 tabular-nums">{ddayLabel(daysBetween(today, r.cur.nextStart))}</p>
                <p className="mt-5 text-base font-semibold">{status}</p>
              </div>

              <div className="bg-amber-50 text-amber-800 rounded-2xl p-4 text-sm">{t('contraceptionWarning')}</div>

              {r.lateBy >= 0 && (
                <div className="bg-subtle rounded-2xl p-4 text-sm text-sub">{t('lateNote', { date: fmt(addDays(s.lastPeriod, s.cycle)), n: r.lateBy })}</div>
              )}

              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: t('ovulationDate'), value: fmt(r.cur.ovulation) },
                  { label: t('fertileWindow'), value: `${fmt(r.cur.fertileStart)} ~ ${fmt(r.cur.fertileEnd)}` },
                  { label: t('peakDays'), value: `${fmt(r.cur.peakStart)} ~ ${fmt(r.cur.ovulation)}` },
                  { label: t('dueIfPregnant'), value: fmtFull(r.edd) },
                ].map(x => (
                  <div key={x.label} className="ui-card p-4">
                    <p className="text-xs text-muted">{x.label}</p>
                    <p className="text-base sm:text-lg font-bold text-fg tabular-nums mt-0.5">{x.value}</p>
                  </div>
                ))}
              </div>
              <p className="text-sm text-sub">
                {t('dueHint')}{' '}
                <Link href="/due-date/" className="text-primary font-medium hover:underline">{t('dueDateLink')}</Link>
              </p>

              {stats?.irregular && (
                <div className="ui-card p-5 text-sm space-y-2">
                  <p className="font-semibold text-fg">{t('irregular.title', { min: stats.min, max: stats.max })}</p>
                  <p className="text-sub">{t('irregular.ovulation', { from: fmt(addDays(r.cur.start, stats.min - s.luteal)), to: fmt(addDays(r.cur.start, stats.max - s.luteal)) })}</p>
                  <p className="text-sub">{t('irregular.period', { from: fmt(addDays(r.cur.start, stats.min)), to: fmt(addDays(r.cur.start, stats.max)) })}</p>
                  <p className="text-sub">{t('irregular.range', { from: fmt(rangeWindow(r.cur.start, stats.min, stats.max, s.luteal).start), to: fmt(rangeWindow(r.cur.start, stats.min, stats.max, s.luteal).end) })}</p>
                  <p className="text-muted text-xs">{t('irregular.note')}</p>
                </div>
              )}

              {/* 향후 6주기 */}
              <div className="ui-card p-5">
                <div className="flex items-center justify-between gap-3 mb-3">
                  <h2 className="text-base font-semibold text-fg">{t('upcoming')}</h2>
                  <button type="button" onClick={exportIcs} className="ui-btn-soft px-3 py-2 text-sm inline-flex items-center gap-1.5">
                    <Download className="w-4 h-4" aria-hidden="true" />{t('ics.button')}
                  </button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm tabular-nums">
                    <thead>
                      <tr className="text-left text-xs text-muted">
                        <th scope="col" className="py-2 pr-3 font-medium">{t('ovulationDate')}</th>
                        <th scope="col" className="py-2 pr-3 font-medium">{t('fertileWindow')}</th>
                        <th scope="col" className="py-2 font-medium">{t('nextPeriod')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line">
                      {r.upcoming.map(c => (
                        <tr key={c.start} className="text-body">
                          <td className="py-2 pr-3 whitespace-nowrap">{fmt(c.ovulation)}</td>
                          <td className="py-2 pr-3 whitespace-nowrap">{fmt(c.fertileStart)} ~ {fmt(c.fertileEnd)}</td>
                          <td className="py-2 whitespace-nowrap font-medium text-fg">{c.nextStart.slice(0, 4) !== today.slice(0, 4) ? fmtFull(c.nextStart) : fmt(c.nextStart)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="text-xs text-muted mt-3">{t('ics.hint')}</p>
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── 6개월 달력 ── */}
      {r && (
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-fg">{t('calendar')}</h2>
          <ul className="flex flex-wrap gap-x-4 gap-y-2 text-sm text-sub" aria-label={t('legend')}>
            {LEGEND.filter(k => k !== 'range' || r.ranges.length > 0).map(k => (
              <li key={k} className="flex items-center gap-2">
                <span className={`w-4 h-4 rounded inline-block ${CELL[k]}`} aria-hidden="true" />{t(`legendItems.${k}`)}
              </li>
            ))}
            <li className="flex items-center gap-2"><span className="w-4 h-4 rounded inline-block ring-2 ring-fg ring-inset" aria-hidden="true" />{t('legendItems.today')}</li>
          </ul>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {r.months.map(({ y, m }) => (
              <div key={`${y}-${m}`} className="ui-card p-4">
                <h3 className="text-sm font-semibold text-fg text-center mb-3">{t('monthTitle', { y, mon: monthNames[m - 1] })}</h3>
                <div className="grid grid-cols-7 gap-1">
                  {weekdays.map((wd, i) => <div key={i} className="text-center text-xs text-muted py-1">{wd}</div>)}
                  {monthGrid(y, m).map((d, i) => {
                    if (!d) return <div key={`e-${i}`} />
                    const type = dayType(d, r.cycles, r.ranges)
                    return (
                      <div
                        key={d}
                        title={type ? t(`legendItems.${type}`) : undefined}
                        className={`text-center text-sm py-1.5 rounded-lg tabular-nums ${type ? CELL[type] : 'text-body'} ${d === today ? 'ring-2 ring-fg ring-inset' : ''}`}
                      >
                        {Number(d.slice(8))}
                        {/* 색으로만 구분되는 날짜 유형을 스크린리더에 텍스트로 */}
                        {type && <span className="sr-only"> {t(`legendItems.${type}`)}</span>}
                        {d === today && <span className="sr-only"> {t('legendItems.today')}</span>}
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <GuideSection namespace="ovulationCalculator" />

      <div className="ui-card p-6 text-sm">
        <h2 className="text-base font-semibold text-fg mb-3">{t('sources.title')}</h2>
        <ul className="space-y-1.5 text-sub">
          {(t.raw('sources.items') as { label: string; url: string }[]).map(x => (
            <li key={x.url}><a href={x.url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">{x.label}</a></li>
          ))}
        </ul>
        <p className="text-xs text-muted mt-4">{t('disclaimer')}</p>
      </div>
    </div>
  )
}
