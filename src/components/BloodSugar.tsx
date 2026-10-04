'use client'

import { useState, useCallback, useEffect, useMemo } from 'react'
import { useTranslations } from '@/lib/i18n'
import '@/lib/i18n/ns/bloodSugar'
import { useSearchParams } from '@/hooks/useSearchParams'
import { Trash2, Download, AlertTriangle, Link, Check } from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceArea } from 'recharts'
import {
  CTXS, type Ctx, type Unit, type Tone, type SugarRecord,
  classify, classifyA1c, eAG, toMg, toMmol, fmt, validMg, MIN_MG, MAX_MG,
  sanitizeRecords, sortRecords, inPeriod, stats as calcStats, measuredAt, localDate, localTime, csvCell,
} from '@/utils/bloodSugar'

const STORAGE_KEY = 'bloodSugarRecords' // 형식 변경 없음 (value는 mg/dL)
const CTX_KEY: Record<Ctx, string> = {
  fasting: 'timingFasting', beforeMeal: 'timingBeforeMeal', afterMeal: 'timingAfterMeal', bedtime: 'timingBedtime', random: 'timingRandom',
}
const TONE_TEXT: Record<Tone, string> = { danger: 'text-red-600', warn: 'text-amber-700', ok: 'text-fg' }
const UNIT_LABEL: Record<Unit, string> = { mg: 'mg/dL', mmol: 'mmol/L' }

function loadRecords(): SugarRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? sanitizeRecords(JSON.parse(raw)) : []
  } catch {
    return []
  }
}

function saveRecords(records: SugarRecord[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records))
  } catch {
    // ignore storage errors
  }
}

export default function BloodSugar() {
  const t = useTranslations('bloodSugar')
  const searchParams = useSearchParams()

  const [unit, setUnit] = useState<Unit>(() => (searchParams.get('unit') === 'mmol' ? 'mmol' : 'mg'))
  const [valueInput, setValueInput] = useState(() => searchParams.get('value') ?? (searchParams.get('unit') === 'mmol' ? '5.3' : '95'))
  const [ctx, setCtx] = useState<Ctx>(() => {
    const p = searchParams.get('timing')
    return CTXS.includes(p as Ctx) ? (p as Ctx) : 'fasting'
  })
  const [a1cInput, setA1cInput] = useState(() => searchParams.get('a1c') ?? '5.5')
  const [records, setRecords] = useState<SugarRecord[]>([])
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')
  const [today, setToday] = useState('')
  const [note, setNote] = useState('')
  const [error, setError] = useState('')
  const [period, setPeriod] = useState<7 | 30 | 90>(30)
  const [linkCopied, setLinkCopied] = useState(false)

  useEffect(() => {
    const now = new Date()
    setRecords(loadRecords())
    setDate(localDate(now))
    setTime(localTime(now))
    setToday(localDate(now))
  }, [])

  useEffect(() => {
    const url = new URL(window.location.href)
    if (valueInput) url.searchParams.set('value', valueInput)
    else url.searchParams.delete('value')
    url.searchParams.set('timing', ctx)
    if (unit === 'mmol') url.searchParams.set('unit', 'mmol')
    else url.searchParams.delete('unit')
    if (a1cInput) url.searchParams.set('a1c', a1cInput)
    else url.searchParams.delete('a1c')
    window.history.replaceState({}, '', url)
  }, [valueInput, ctx, unit, a1cInput])

  const u = UNIT_LABEL[unit]
  const d = useCallback((mg: number) => fmt(mg, unit), [unit])
  const ctxLabel = useCallback((c: Ctx) => t(CTX_KEY[c]), [t])

  const num = parseFloat(valueInput)
  const mg = unit === 'mg' ? num : toMg(num)
  const valid = validMg(mg)
  const level = valid ? classify(mg, ctx) : null

  const a1c = parseFloat(a1cInput)
  const a1cValid = Number.isFinite(a1c) && a1c >= 3 && a1c <= 20
  const a1cKey = a1cValid ? classifyA1c(a1c) : null
  const a1cEag = a1cValid ? eAG(a1c) : 0

  const switchUnit = (next: Unit) => {
    if (next === unit) return
    if (Number.isFinite(num)) setValueInput(next === 'mmol' ? toMmol(num).toFixed(1) : String(Math.round(toMg(num))))
    setUnit(next)
  }

  const copyLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(window.location.href)
    } catch {
      // ignore
    }
    setLinkCopied(true)
    setTimeout(() => setLinkCopied(false), 2000)
  }, [])

  const handleSubmit = () => {
    if (!valid) {
      setError(t('u.errValue', { min: d(MIN_MG), max: d(MAX_MG), u }))
      return
    }
    if (!date) {
      setError(t('u.errDate'))
      return
    }
    setError('')
    const record: SugarRecord = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      value: Math.round(mg * 10) / 10,
      timing: ctx,
      date,
      time: time || '00:00',
      note: note.trim(),
      createdAt: Date.now(),
    }
    setRecords(prev => {
      const next = [record, ...prev]
      saveRecords(next)
      return next
    })
    setNote('')
  }

  const handleDelete = useCallback((id: string) => {
    setRecords(prev => {
      const next = prev.filter(r => r.id !== id)
      saveRecords(next)
      return next
    })
  }, [])

  const handleClearAll = useCallback(() => {
    if (!window.confirm(t('clearConfirm'))) return
    setRecords([])
    saveRecords([])
  }, [t])

  const sorted = useMemo(() => sortRecords(records), [records])

  const handleExportCsv = () => {
    if (sorted.length === 0) return
    const headers = [t('colDate'), t('colValue'), t('u.colMmol'), t('colTiming'), t('colStatus'), t('colNote')]
    const rows = sorted.map(r => [
      csvCell(`${r.date} ${r.time}`),
      r.value,
      toMmol(r.value).toFixed(1),
      csvCell(ctxLabel(r.timing)),
      csvCell(t(`u.lv.${classify(r.value, r.timing).key}`)),
      csvCell(r.note),
    ].join(','))
    const csv = [headers.map(csvCell).join(','), ...rows].join('\n')
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `blood-sugar-${today || 'export'}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const periodRecs = useMemo(() => (today ? inPeriod(sorted, period, today) : []), [sorted, period, today])
  const st = useMemo(() => calcStats(periodRecs), [periodRecs])
  const chartData = useMemo(
    () => [...periodRecs].reverse().map(r => ({ ts: measuredAt(r), v: unit === 'mg' ? r.value : Math.round(toMmol(r.value) * 10) / 10 })),
    [periodRecs, unit],
  )
  const lo = unit === 'mg' ? 70 : 3.9
  const hi = unit === 'mg' ? 180 : 10.0
  const tsLabel = (ts: number) => { const x = new Date(ts); return `${x.getMonth() + 1}/${x.getDate()}` }

  const criteria = ctx === 'fasting'
    ? t('u.crit.fasting', { a: d(100), b: d(125), c: d(126), u })
    : ctx === 'afterMeal'
      ? t('u.crit.afterMeal', { a: d(140), b: d(199), c: d(200), u })
      : t('u.crit.other', { c: d(200), u })
  const target = ctx === 'fasting' || ctx === 'beforeMeal'
    ? t('u.targetPre', { a: d(80), b: d(130), u })
    : ctx === 'afterMeal' ? t('u.targetPost', { a: d(180), u }) : ''

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-fg">{t('title')}</h1>
          <p className="text-sm text-muted mt-1">{t('description')}</p>
        </div>
        <button type="button" onClick={copyLink} className="ui-btn-soft px-3 py-2 text-sm shrink-0">
          {linkCopied ? <Check className="w-4 h-4" /> : <Link className="w-4 h-4" />}
          {linkCopied ? t('u.copied') : t('u.copyLink')}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* 입력 */}
        <div className="lg:col-span-1">
          <div className="ui-card p-6 space-y-5">
            <div>
              <p className="block text-sm font-medium text-body mb-2">{t('timing')}</p>
              <div className="grid grid-cols-2 gap-2">
                {CTXS.map(c => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setCtx(c)}
                    aria-pressed={ctx === c}
                    className={`px-3 py-2 rounded-xl text-sm font-medium transition-colors ${c === 'random' ? 'col-span-2' : ''} ${
                      ctx === c ? 'bg-primary text-white' : 'bg-soft text-body hover:bg-subtle'
                    }`}
                  >
                    {ctxLabel(c)}
                  </button>
                ))}
              </div>
              <p className="text-xs text-muted mt-2">{t(`u.ctxHint.${ctx}`)}</p>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label htmlFor="bs-value" className="text-sm font-medium text-body">{t('u.valueLabel')}</label>
                <div className="flex rounded-lg bg-soft p-0.5 text-xs" role="group" aria-label={t('u.unitLabel')}>
                  {(['mg', 'mmol'] as Unit[]).map(x => (
                    <button key={x} type="button" onClick={() => switchUnit(x)} aria-pressed={unit === x}
                      className={`px-2.5 py-1 rounded-md font-medium ${unit === x ? 'bg-primary text-white' : 'text-sub'}`}>
                      {UNIT_LABEL[x]}
                    </button>
                  ))}
                </div>
              </div>
              <div className="relative">
                <input
                  id="bs-value"
                  type="number"
                  inputMode="decimal"
                  min={d(MIN_MG)}
                  max={d(MAX_MG)}
                  step={unit === 'mg' ? 1 : 0.1}
                  value={valueInput}
                  onChange={e => setValueInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleSubmit() }}
                  className="ui-field w-full px-4 py-3 pr-20 text-lg tabular-nums"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-muted">{u}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="bs-date" className="block text-sm font-medium text-body mb-1">{t('date')}</label>
                <input id="bs-date" type="date" value={date} onChange={e => setDate(e.target.value)} className="ui-field w-full px-3 py-2 text-sm" />
              </div>
              <div>
                <label htmlFor="bs-time" className="block text-sm font-medium text-body mb-1">{t('time')}</label>
                <input id="bs-time" type="time" value={time} onChange={e => setTime(e.target.value)} className="ui-field w-full px-3 py-2 text-sm" />
              </div>
            </div>

            <div>
              <label htmlFor="bs-note" className="block text-sm font-medium text-body mb-1">{t('note')}</label>
              <input id="bs-note" type="text" value={note} onChange={e => setNote(e.target.value)} placeholder={t('notePlaceholder')}
                maxLength={100} className="ui-field w-full px-3 py-2 text-sm" />
            </div>

            {error && <p className="text-sm text-red-600" role="alert">{error}</p>}

            <button type="button" onClick={handleSubmit} className="ui-btn w-full px-4 py-3">{t('submit')}</button>
            <p className="text-xs text-muted">{t('u.privacy')}</p>
          </div>
        </div>

        {/* 판정 */}
        <div className="lg:col-span-2 space-y-4">
          {level ? (
            <div className="ui-hero p-6 sm:p-8" aria-live="polite">
              <p className="text-sm text-white/70">{t('u.heroLabel', { ctx: ctxLabel(ctx) })}</p>
              <p className="mt-1 flex flex-wrap items-baseline gap-x-3">
                <span className="text-5xl font-bold tabular-nums">{d(mg)}</span>
                <span className="text-lg text-white/80">{u}</span>
                <span className="text-sm text-white/70 tabular-nums">
                  {t('u.otherUnit', { v: fmt(mg, unit === 'mg' ? 'mmol' : 'mg'), u: UNIT_LABEL[unit === 'mg' ? 'mmol' : 'mg'] })}
                </span>
              </p>
              <p className="mt-4 inline-block rounded-full bg-white/20 px-3 py-1 text-sm font-semibold">{t(`u.lv.${level.key}`)}</p>
              <p className="mt-3 text-sm text-white/90 leading-relaxed">{t(`u.lvDesc.${level.key}`)}</p>
              <p className="mt-4 text-xs text-white/70 leading-relaxed">{criteria}</p>
            </div>
          ) : (
            <div className="bg-amber-50 text-amber-800 rounded-2xl p-5 flex gap-3">
              <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
              <p className="text-sm">{t('u.errValue', { min: d(MIN_MG), max: d(MAX_MG), u })}</p>
            </div>
          )}

          {level && (level.key === 'low' || level.key === 'low2') && (
            <div className="bg-amber-50 text-amber-800 rounded-2xl p-5" role="alert">
              <p className="font-semibold flex items-center gap-2"><AlertTriangle className="w-4 h-4 shrink-0" />{t('u.hypo.title')}</p>
              <ol className="mt-3 space-y-1.5 text-sm list-decimal pl-5">
                {(t.raw('u.hypo.steps') as string[]).map((s, i) => <li key={i}>{s}</li>)}
              </ol>
              <p className="mt-3 text-sm font-medium">{t('u.hypo.emergency')}</p>
            </div>
          )}

          <div className="bg-subtle rounded-2xl p-5 text-sm text-sub space-y-2">
            {target && <p>{target}</p>}
            {ctx === 'afterMeal' && <p>{t('u.ogttNote')}</p>}
            <p>{t('u.diagNote')}</p>
          </div>

          {/* 당화혈색소 */}
          <div className="ui-card p-6">
            <h2 className="text-lg font-semibold text-fg">{t('u.a1c.title')}</h2>
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-4 items-start">
              <div>
                <label htmlFor="bs-a1c" className="block text-sm font-medium text-body mb-1">{t('u.a1c.label')}</label>
                <div className="relative">
                  <input id="bs-a1c" type="number" inputMode="decimal" min={3} max={20} step={0.1} value={a1cInput}
                    onChange={e => setA1cInput(e.target.value)} className="ui-field w-full px-4 py-3 pr-10 tabular-nums" />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-muted">%</span>
                </div>
              </div>
              {a1cKey ? (
                <>
                  <div className="bg-subtle rounded-xl p-4">
                    <p className="text-xs text-muted">{t('u.a1c.result')}</p>
                    <p className={`text-xl font-bold mt-1 ${TONE_TEXT[a1cKey === 'normal' ? 'ok' : a1cKey === 'pre' ? 'warn' : 'danger']}`}>{t(`u.a1c.lv.${a1cKey}`)}</p>
                  </div>
                  <div className="bg-subtle rounded-xl p-4">
                    <p className="text-xs text-muted">{t('u.a1c.eag')}</p>
                    <p className="text-xl font-bold text-fg tabular-nums mt-1">{d(a1cEag)} <span className="text-sm font-normal text-muted">{u}</span></p>
                  </div>
                </>
              ) : (
                <p className="sm:col-span-2 text-sm text-amber-700">{t('u.a1c.err')}</p>
              )}
            </div>
            <ul className="mt-4 space-y-1 text-xs text-muted">
              <li>{t('u.a1c.crit')}</li>
              <li>{t('u.a1c.formula')}</li>
              <li>{t('u.a1c.target')}</li>
            </ul>
          </div>
        </div>
      </div>

      {/* 기록 */}
      <div className="ui-card p-6 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-fg">{t('history')}</h2>
          <div className="flex flex-wrap gap-2">
            <div className="flex rounded-lg bg-soft p-0.5 text-sm" role="group" aria-label={t('statistics')}>
              {([7, 30, 90] as const).map(p => (
                <button key={p} type="button" onClick={() => setPeriod(p)} aria-pressed={period === p}
                  className={`px-3 py-1 rounded-md font-medium ${period === p ? 'bg-primary text-white' : 'text-sub'}`}>
                  {t('u.periodDays', { n: p })}
                </button>
              ))}
            </div>
            {records.length > 0 && (
              <>
                <button type="button" onClick={handleExportCsv} className="ui-btn-soft px-3 py-1.5 text-sm">
                  <Download className="w-4 h-4" />{t('exportCsv')}
                </button>
                <button type="button" onClick={handleClearAll} className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-soft hover:bg-subtle text-body rounded-xl">
                  <Trash2 className="w-4 h-4" />{t('clearAll')}
                </button>
              </>
            )}
          </div>
        </div>

        {records.length === 0 ? (
          <p className="text-center text-muted py-8">{t('historyEmpty')}</p>
        ) : !st ? (
          <p className="text-sm text-muted text-center py-4">{t('statsNoData')}</p>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {([['statsAvg', d(st.avg)], ['statsMin', d(st.min)], ['statsMax', d(st.max)], ['statsCount', String(st.count)]] as const).map(([k, v]) => (
                <div key={k} className="bg-subtle rounded-xl p-3">
                  <p className="text-xs text-muted">{t(k)}</p>
                  <p className="text-xl font-bold text-fg tabular-nums">{v} <span className="text-xs font-normal text-faint">{k === 'statsCount' ? '' : u}</span></p>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-sm font-semibold text-body">{t('u.tirTitle')}</h3>
                <div className="mt-3 flex h-3 rounded-full overflow-hidden bg-track" aria-hidden>
                  <div className="bg-amber-500" style={{ width: `${st.tir.below}%` }} />
                  <div className="bg-primary" style={{ width: `${st.tir.inRange}%` }} />
                  <div className="bg-red-500" style={{ width: `${st.tir.above}%` }} />
                </div>
                <dl className="mt-3 grid grid-cols-3 gap-2 text-sm">
                  {([['tirBelow', st.tir.below], ['tirIn', st.tir.inRange], ['tirAbove', st.tir.above]] as const).map(([k, v]) => (
                    <div key={k}>
                      <dt className="text-xs text-muted">{t(`u.${k}`, { lo: d(70), hi: d(180), u })}</dt>
                      <dd className="font-bold text-fg tabular-nums">{v}%</dd>
                    </div>
                  ))}
                </dl>
                <p className="mt-2 text-xs text-muted">{t('u.tirNote')}</p>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-body">{t('u.ctxAvgTitle')}</h3>
                <ul className="mt-3 divide-y divide-line text-sm">
                  {CTXS.filter(c => st.byCtx[c]).map(c => {
                    const s = st.byCtx[c]!
                    const lv = classify(s.avg, c)
                    return (
                      <li key={c} className="flex items-center justify-between gap-2 py-2">
                        <span className="text-body">{ctxLabel(c)} <span className="text-xs text-faint">{t('u.countN', { n: s.count })}</span></span>
                        <span className="text-right">
                          <span className="font-bold text-fg tabular-nums">{d(s.avg)}</span>
                          <span className={`ml-2 text-xs ${TONE_TEXT[lv.tone]}`}>{t(`u.lv.${lv.key}`)}</span>
                        </span>
                      </li>
                    )
                  })}
                </ul>
              </div>
            </div>

            {chartData.length > 1 && (
              <div>
                <div className="flex items-baseline justify-between gap-2">
                  <h3 className="text-sm font-semibold text-body">{t('u.chartTitle')}</h3>
                  <p className="text-xs text-muted">{t('u.chartBand', { lo: d(70), hi: d(180), u })}</p>
                </div>
                <div className="h-56 mt-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData} margin={{ top: 8, right: 12, left: -16, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" />
                      <ReferenceArea y1={lo} y2={hi} fill="var(--primary)" fillOpacity={0.08} stroke="none" />
                      <XAxis dataKey="ts" type="number" scale="time" domain={['dataMin', 'dataMax']} tickFormatter={tsLabel}
                        tick={{ fontSize: 11, fill: 'var(--muted)' }} />
                      <YAxis domain={[(m: number) => Math.min(m, lo) * 0.9, (m: number) => Math.max(m, hi) * 1.05]}
                        tickFormatter={(v: number) => (unit === 'mg' ? String(Math.round(v)) : v.toFixed(1))} tick={{ fontSize: 11, fill: 'var(--muted)' }} />
                      <Tooltip
                        labelFormatter={(ts) => { const x = new Date(Number(ts)); return `${localDate(x)} ${localTime(x)}` }}
                        formatter={(v) => [`${v ?? 0} ${u}`, t('u.chartValue')]}
                        contentStyle={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 12, color: 'var(--fg)' }}
                      />
                      <Line type="monotone" dataKey="v" stroke="var(--primary)" strokeWidth={2} dot={{ r: 3 }} isAnimationActive={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
          </>
        )}

        {records.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line">
                  <th className="text-left py-2 pr-3 font-medium text-sub whitespace-nowrap">{t('colDate')}</th>
                  <th className="text-right py-2 pr-3 font-medium text-sub whitespace-nowrap">{u}</th>
                  <th className="text-left py-2 pr-3 font-medium text-sub whitespace-nowrap">{t('colTiming')}</th>
                  <th className="text-left py-2 pr-3 font-medium text-sub whitespace-nowrap">{t('colStatus')}</th>
                  <th className="text-left py-2 pr-3 font-medium text-sub">{t('colNote')}</th>
                  <th className="py-2"><span className="sr-only">{t('deleteRecord')}</span></th>
                </tr>
              </thead>
              <tbody>
                {sorted.map(r => {
                  const lv = classify(r.value, r.timing)
                  return (
                    <tr key={r.id} className="border-b border-line">
                      <td className="py-2.5 pr-3 text-sub whitespace-nowrap tabular-nums">
                        {r.date}<br /><span className="text-xs text-faint">{r.time}</span>
                      </td>
                      <td className="py-2.5 pr-3 text-right font-bold text-fg whitespace-nowrap tabular-nums">{d(r.value)}</td>
                      <td className="py-2.5 pr-3 text-body whitespace-nowrap">{ctxLabel(r.timing)}</td>
                      <td className={`py-2.5 pr-3 whitespace-nowrap text-xs font-medium ${TONE_TEXT[lv.tone]}`}>{t(`u.lv.${lv.key}`)}</td>
                      <td className="py-2.5 pr-3 text-muted max-w-[140px] truncate">{r.note || '—'}</td>
                      <td className="py-2.5">
                        <button type="button" onClick={() => handleDelete(r.id)} aria-label={t('deleteRecord')}
                          className="p-1.5 rounded-lg text-faint hover:text-body hover:bg-soft">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 가이드 */}
      <div className="ui-card p-6 space-y-8">
        <div>
          <h2 className="text-xl font-semibold text-fg">{t('u.g.title')}</h2>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm min-w-[480px]">
              <thead>
                <tr className="border-b border-line text-left">
                  {(t.raw('u.g.tableHead') as string[]).map((h, i) => (
                    <th key={i} className="py-2 pr-3 font-medium text-sub">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(t.raw('u.g.rows') as string[][]).map((row, i) => (
                  <tr key={i} className="border-b border-line">
                    {row.map((c, j) => (
                      <td key={j} className={`py-2.5 pr-3 ${j === 0 ? 'text-body font-medium' : 'text-sub tabular-nums'}`}>{c}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-xs text-muted">{t('u.g.tableUnit')}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {(['diag', 'hypo', 'tips'] as const).map(s => (
            <div key={s}>
              <h3 className="font-semibold text-body">{t(`u.g.${s}Title`)}</h3>
              <ul className="mt-3 space-y-2 text-sm text-sub list-disc pl-5">
                {(t.raw(`u.g.${s}Items`) as string[]).map((item, i) => <li key={i}>{item}</li>)}
              </ul>
            </div>
          ))}
        </div>

        <div className="bg-subtle rounded-2xl p-5 text-sm text-sub">
          <p className="font-semibold text-body">{t('u.g.sourcesTitle')}</p>
          <ul className="mt-2 space-y-1 text-xs list-disc pl-5">
            {(t.raw('u.g.sources') as string[]).map((s, i) => <li key={i}>{s}</li>)}
          </ul>
          <p className="mt-4 flex gap-2 text-amber-800"><AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />{t('disclaimer')}</p>
        </div>
      </div>
    </div>
  )
}
