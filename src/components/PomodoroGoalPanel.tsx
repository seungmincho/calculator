'use client'

import { useCallback, useEffect, useState } from 'react'
import { useTranslations } from '@/lib/i18n'
import '@/lib/i18n/ns/pomodoroTimer'
import {
  DEFAULT_POMODORO_GOAL, POMODORO_GOAL_KEY, POMODORO_GOAL_MAX, POMODORO_GOAL_MIN,
  isPomodoroGoal, parsePomodoroGoal, pomodoroStatsCsv, readPomodoroValue, savePomodoroGoal, withPomodoroLock,
  type PomodoroDailyStat, type PomodoroRead, type PomodoroStoreError, type PomodoroWrite,
} from '@/utils/pomodoroGoal'

export type PomodoroStatsStatus = 'loading' | 'ready' | 'corrupt' | 'unavailable' | 'failed' | 'conflict'

export default function PomodoroGoalPanel({ dailyStats, today, statsStatus, onRetryStats }: {
  dailyStats: PomodoroDailyStat[]; today: string; statsStatus: PomodoroStatsStatus; onRetryStats: () => void
}) {
  const t = useTranslations('pomodoroTimer')
  const [stored, setStored] = useState<PomodoroRead<number> | null>(null)
  const [goal, setGoal] = useState(DEFAULT_POMODORO_GOAL)
  const [input, setInput] = useState(String(DEFAULT_POMODORO_GOAL))
  const [error, setError] = useState<PomodoroStoreError | null>(null)
  const [notice, setNotice] = useState<'saved' | 'downloaded' | 'downloadFailed' | null>(null)
  const [stale, setStale] = useState(false)
  const [busy, setBusy] = useState(false)

  const reload = useCallback((replaceInput: boolean) => {
    let result: PomodoroRead<number>
    try { result = readPomodoroValue(window.localStorage, POMODORO_GOAL_KEY, parsePomodoroGoal) }
    catch { result = { ok: false, error: 'unavailable' } }
    setStored(result)
    setError(result.ok ? null : result.error)
    setStale(false)
    setNotice(null)
    if (result.ok) {
      setGoal(result.value)
      if (replaceInput) setInput(String(result.value))
    }
  }, [])

  useEffect(() => {
    let active = true
    queueMicrotask(() => { if (active) reload(true) })
    return () => { active = false }
  }, [reload])

  useEffect(() => {
    const changed = (event: StorageEvent) => {
      if (event.key !== POMODORO_GOAL_KEY && event.key !== null) return
      if (stored?.ok && event.newValue === stored.raw) return
      setStale(true)
      setError('conflict')
      setNotice(null)
    }
    window.addEventListener('storage', changed)
    return () => window.removeEventListener('storage', changed)
  }, [stored])

  const save = async () => {
    if (!stored?.ok || stale || busy) return
    const target = /^\d+$/.test(input) ? Number(input) : NaN
    if (!isPomodoroGoal(target)) { setError('invalid'); setNotice(null); return }
    setBusy(true)
    let result: PomodoroWrite
    try { result = await withPomodoroLock(POMODORO_GOAL_KEY, () => savePomodoroGoal(window.localStorage, stored.raw, target)) }
    catch { result = { ok: false, error: 'unavailable' } }
    setBusy(false)
    if (!result.ok) {
      setError(result.error)
      setNotice(null)
      if (result.error === 'conflict') setStale(true)
      return
    }
    setStored({ ok: true, raw: result.raw, value: target })
    setGoal(target)
    setInput(String(target))
    setError(null)
    setNotice('saved')
  }

  const download = () => {
    try {
      const csv = pomodoroStatsCsv(dailyStats, today, [t('goal.csvDate'), t('goal.csvCount'), t('goal.csvMinutes')])
      const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = `pomodoro-${today}-7days.csv`
      document.body.appendChild(anchor)
      try { anchor.click() } finally { anchor.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000) }
      setNotice('downloaded')
    } catch { setNotice('downloadFailed') }
  }

  const completed = dailyStats.find(row => row.date === today)?.count ?? 0
  const percent = Math.min(100, Math.round(completed / goal * 100))
  const canExport = !!today && (statsStatus === 'ready' || statsStatus === 'failed' || statsStatus === 'conflict')

  return (
    <section aria-labelledby="pomodoro-goal-title" aria-busy={busy} className="ui-card min-w-0 p-4 sm:p-5 space-y-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="pomodoro-goal-title" className="text-base font-semibold text-fg">{t('goal.title')}</h2>
        <span className="text-lg font-bold text-primary tabular-nums">{t('goal.progress', { count: completed, goal })}</span>
      </div>
      <div role="progressbar" aria-label={t('goal.title')} aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent}
        aria-valuetext={t('goal.progress', { count: completed, goal })} className="bg-track h-2 rounded-full overflow-hidden">
        <div className="bg-primary h-full rounded-full" style={{ width: `${percent}%` }} />
      </div>
      <p className="text-xs text-sub">{t(completed >= goal ? 'goal.reached' : 'goal.remaining', { count: Math.max(0, goal - completed) })}</p>
      <form noValidate onSubmit={event => { event.preventDefault(); void save() }} className="flex flex-wrap items-end gap-2">
        <label className="block">
          <span className="block text-xs font-medium text-body">{t('goal.label')}</span>
          <input type="number" min={POMODORO_GOAL_MIN} max={POMODORO_GOAL_MAX} step={1} inputMode="numeric" value={input}
            onChange={event => { setInput(event.target.value); setNotice(null) }} disabled={busy}
            className="ui-field min-h-11 w-24 mt-1 px-3 py-2 text-base tabular-nums" />
        </label>
        <button type="submit" disabled={!stored?.ok || stale || busy} className="ui-btn min-h-11 px-4 py-2 text-sm disabled:opacity-45">{t('goal.save')}</button>
        <button type="button" disabled={!canExport} onClick={download} className="ui-btn-soft min-h-11 px-4 py-2 text-sm disabled:opacity-45">{t('goal.export')}</button>
      </form>
      <p className="text-xs text-muted">{t('goal.scope')}</p>
      <p className="text-xs text-muted">{t('goal.exportNote')}</p>
      {error && <p role="alert" className="text-sm text-sub">{t(`goal.errors.${error}`)}</p>}
      {(error === 'corrupt' || error === 'unavailable' || stale) && <button type="button" disabled={busy} onClick={() => reload(false)} className="ui-btn-soft min-h-11 px-4 py-2 text-sm">{t('goal.reload')}</button>}
      {statsStatus !== 'ready' && statsStatus !== 'loading' && <p role="alert" className="text-sm text-sub">{t(`goal.statsErrors.${statsStatus}`)}</p>}
      {statsStatus === 'failed' && <button type="button" onClick={onRetryStats} className="ui-btn-soft min-h-11 px-4 py-2 text-sm">{t('goal.retryStats')}</button>}
      {notice && <p role={notice === 'downloadFailed' ? 'alert' : 'status'} className="text-sm text-sub">{t(`goal.notices.${notice}`)}</p>}
    </section>
  )
}
