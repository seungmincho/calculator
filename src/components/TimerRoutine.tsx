'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslations } from '@/lib/i18n'
import '@/lib/i18n/ns/timer'
import { formatClock } from '@/utils/timer'
import MobileResultLink from '@/components/MobileResultLink'
import {
  TIMER_ROUTINES_KEY, ROUTINE_LIMITS, advanceRoutine, appendRoutineProfile, isTimerRoutine,
  pauseRoutine, readRoutineStore, resumeRoutine, routineStageRemaining, routineStorageError,
  routineTotalRemaining, routineTotalSeconds, skipRoutine, startRoutine, withRoutineStorageLock, writeRoutineStore,
  type RoutineError, type RoutineRead, type RoutineRun, type TimerRoutineConfig,
} from '@/utils/timerRoutine'

interface DraftStage { id: number; name: string; seconds: string }

export default function TimerRoutine({ otherRunning, onRequestStart, onRunningChange, onSignal }: {
  otherRunning: boolean
  onRequestStart: () => boolean
  onRunningChange: (running: boolean) => void
  onSignal: () => void
}) {
  const t = useTranslations('timer')
  const [name, setName] = useState(() => t('routine.example.name'))
  const [stages, setStages] = useState<DraftStage[]>(() => [
    { id: 0, name: t('routine.example.warmup'), seconds: '60' },
    { id: 1, name: t('routine.example.exercise'), seconds: '120' },
    { id: 2, name: t('routine.example.rest'), seconds: '30' },
  ])
  const [repeats, setRepeats] = useState('2')
  const [run, setRun] = useState<RoutineRun | null>(null)
  const runRef = useRef<RoutineRun | null>(null)
  const nextStageId = useRef(3)
  const [now, setNow] = useState(0)
  const [notice, setNotice] = useState('')
  const [view, setView] = useState<RoutineRead | null>(null)
  const [storageError, setStorageError] = useState<RoutineError | null>(null)
  const [selectedId, setSelectedId] = useState('')
  const [deletePending, setDeletePending] = useState(false)
  const [busy, setBusy] = useState(false)
  const busyRef = useRef(false)
  const draft: TimerRoutineConfig = { name: name.trim(), stages: stages.map(stage => ({ name: stage.name.trim(), seconds: Number(stage.seconds) })), repeats: Number(repeats) }
  const validDraft = isTimerRoutine(draft)
  const editingLocked = run?.status === 'running' || run?.status === 'paused'

  const commitRun = useCallback((next: RoutineRun | null) => {
    runRef.current = next
    setRun(next)
    onRunningChange(next?.status === 'running')
  }, [onRunningChange])

  const tick = useCallback(() => {
    const current = runRef.current
    if (current?.status !== 'running') return
    const time = Date.now()
    const next = advanceRoutine(current, time)
    setNow(time)
    if (next.run !== current) {
      commitRun(next.run)
      // One signal for the latest boundary even if a sleeping tab missed many stages.
      if (next.crossed > 0) onSignal()
    }
  }, [commitRun, onSignal])

  useEffect(() => {
    if (run?.status !== 'running') return
    const interval = setInterval(tick, 200)
    const deadline = setTimeout(tick, Math.max(0, run.deadline - Date.now()) + 10)
    document.addEventListener('visibilitychange', tick)
    window.addEventListener('focus', tick)
    return () => {
      clearInterval(interval); clearTimeout(deadline)
      document.removeEventListener('visibilitychange', tick); window.removeEventListener('focus', tick)
    }
  }, [run?.status, run?.deadline, tick])

  const refresh = useCallback(() => {
    try { setView(readRoutineStore(window.localStorage)) }
    catch (error) { setView({ ok: false, error: routineStorageError(error) }) }
    setStorageError(null); setSelectedId(''); setDeletePending(false); setNotice('')
  }, [])

  useEffect(() => {
    refresh()
    const changed = (event: StorageEvent) => {
      if (event.key !== TIMER_ROUTINES_KEY && event.key !== null) return
      setStorageError('conflict'); setDeletePending(false); setNotice('')
    }
    window.addEventListener('storage', changed)
    return () => window.removeEventListener('storage', changed)
  }, [refresh])

  const begin = () => {
    if (busyRef.current || otherRunning || !validDraft || !onRequestStart()) return
    const time = Date.now()
    const next = runRef.current?.status === 'paused' ? resumeRoutine(runRef.current, time) : startRoutine(draft, time)
    commitRun(next); setNow(time); setNotice('')
  }
  const pause = () => {
    const current = runRef.current
    if (current?.status !== 'running') return
    const time = Date.now()
    const next = advanceRoutine(current, time)
    commitRun(pauseRoutine(next.run, time)); setNow(time)
    if (next.crossed > 0) onSignal()
  }
  const skip = () => {
    const current = runRef.current
    if (!current || current.status === 'done') return
    const time = Date.now()
    commitRun(skipRoutine(current, time)); setNow(time); setNotice(t('routine.skipped'))
  }
  const reset = () => { commitRun(null); setNotice(t('routine.resetNotice')) }
  const edit = (action: () => void) => {
    if (editingLocked || busyRef.current) return
    if (runRef.current) commitRun(null)
    action(); setNotice('')
  }

  const profiles = view?.ok ? view.store.profiles : []
  const selected = profiles.find(profile => profile.id === selectedId)
  const issue = view && !view.ok ? view.error : storageError
  const canStore = !!view?.ok && storageError !== 'conflict' && !busy && !editingLocked

  const manageProfile = async (action: 'save' | 'load' | 'delete') => {
    if (!view?.ok || !canStore || busyRef.current || (action === 'save' ? !validDraft : !selected)) return
    const expected = view
    const target = selected
    busyRef.current = true; setBusy(true); setNotice('')
    try {
      await withRoutineStorageLock(() => {
        const storage = window.localStorage
        if (storage.getItem(TIMER_ROUTINES_KEY) !== expected.raw) { setStorageError('conflict'); return }
        if (action === 'load' && target) {
          const restored = structuredClone(target.routine)
          commitRun(null)
          setName(restored.name); setRepeats(String(restored.repeats))
          setStages(restored.stages.map(stage => ({ id: nextStageId.current++, name: stage.name, seconds: String(stage.seconds) })))
          setNotice(t('routine.loaded', { name: restored.name })); setStorageError(null)
          return
        }
        const id = crypto.randomUUID()
        const next = action === 'save'
          ? appendRoutineProfile(expected.store, draft, id, new Date().toISOString())
          : { ...expected.store, revision: id, profiles: expected.store.profiles.filter(profile => profile.id !== target?.id) }
        const result = writeRoutineStore(storage, expected.raw, next)
        if (!result.ok) { setStorageError(result.error); return }
        setView({ ok: true, store: next, raw: result.raw }); setStorageError(null)
        setSelectedId(action === 'save' ? id : '')
        setNotice(t(action === 'save' ? 'routine.saved' : 'routine.deleted'))
      })
    } catch (error) {
      const code = error instanceof Error ? error.message : ''
      setStorageError(code === 'invalid' || code === 'limit' || code === 'duplicate' ? code : routineStorageError(error))
    } finally { busyRef.current = false; setBusy(false); setDeletePending(false) }
  }

  const shown = run?.routine ?? (validDraft ? draft : null)
  const currentCursor = run && shown ? Math.min(run.cursor, shown.stages.length * shown.repeats - 1) : 0
  const stepIndex = shown ? currentCursor % shown.stages.length : 0
  const cycle = shown ? Math.floor(currentCursor / shown.stages.length) + 1 : 1
  const remaining = run ? routineStageRemaining(run, now) : shown ? shown.stages[0].seconds * 1000 : 0
  const totalRemaining = run ? routineTotalRemaining(run, now) : shown ? routineTotalSeconds(shown) * 1000 : 0

  return (
    <section data-timer-routine className="ui-card min-w-0 p-4 sm:p-6 space-y-5" aria-labelledby="timer-routine-title">
      <div>
        <h2 id="timer-routine-title" className="text-xl font-bold text-fg">{t('routine.title')}</h2>
        <p className="mt-1 text-sm text-sub">{t('routine.description')}</p>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="min-w-0 space-y-4">
          <MobileResultLink href="#timer-routine-result" label={t('routine.title')} value={formatClock(totalRemaining, { down: true })} />
          {editingLocked && <p className="rounded-xl bg-subtle p-3 text-sm text-body">{t('routine.editLocked')}</p>}
          <fieldset disabled={editingLocked || busy} className="min-w-0 space-y-3">
            <label className="block text-sm text-body">{t('routine.name')}
              <input value={name} maxLength={ROUTINE_LIMITS.name} onChange={event => edit(() => setName(event.target.value))} className="ui-field mt-1 min-h-11 px-3 py-2 text-base" />
            </label>
            <ol className="space-y-3">
              {stages.map((stage, index) => <li key={stage.id} className="rounded-xl bg-subtle p-3 space-y-2">
                <label className="block text-sm text-body">{t('routine.stageName', { number: index + 1 })}
                  <input value={stage.name} maxLength={ROUTINE_LIMITS.name} onChange={event => edit(() => setStages(previous => previous.map(item => item.id === stage.id ? { ...item, name: event.target.value } : item)))} className="ui-field mt-1 min-h-11 px-3 py-2 text-base" />
                </label>
                <div className="flex flex-wrap items-end gap-2">
                  <label className="block min-w-0 flex-1 text-sm text-body">{t('routine.stageSeconds', { number: index + 1 })}
                    <input type="number" inputMode="numeric" min={1} max={ROUTINE_LIMITS.seconds} step={1} value={stage.seconds} onChange={event => edit(() => setStages(previous => previous.map(item => item.id === stage.id ? { ...item, seconds: event.target.value } : item)))} className="ui-field mt-1 min-h-11 px-3 py-2 text-base tabular-nums" />
                  </label>
                  <button type="button" onClick={() => edit(() => setStages(previous => previous.filter(item => item.id !== stage.id)))} disabled={stages.length <= 1} aria-label={t('routine.removeStage', { number: index + 1 })} className="ui-btn-soft min-h-11 px-3 py-2 text-sm disabled:opacity-40">{t('routine.remove')}</button>
                </div>
              </li>)}
            </ol>
            <button type="button" disabled={stages.length >= ROUTINE_LIMITS.stages} onClick={() => edit(() => { const stage = { id: nextStageId.current++, name: t('routine.newStage', { number: stages.length + 1 }), seconds: '60' }; setStages(previous => [...previous, stage]) })} className="ui-btn-soft min-h-11 px-4 py-2 text-sm disabled:opacity-40">{t('routine.addStage')}</button>
            <label className="block text-sm text-body">{t('routine.repeats')}
              <input type="number" inputMode="numeric" min={1} max={ROUTINE_LIMITS.repeats} step={1} value={repeats} onChange={event => edit(() => setRepeats(event.target.value))} className="ui-field mt-1 min-h-11 px-3 py-2 text-base tabular-nums" />
            </label>
          </fieldset>
          <p className="text-xs text-muted">{t('routine.limits')}</p>
          {!validDraft && <p role="alert" className="text-sm text-body">{t('routine.errors.invalid')}</p>}
        </div>
        <div className="min-w-0 space-y-4">
          <div id="timer-routine-result" data-routine-status={run?.status ?? 'idle'} data-routine-step={stepIndex} data-routine-cycle={cycle} className="rounded-2xl bg-subtle p-4 sm:p-5 space-y-3 scroll-mt-20">
            <p className="text-sm font-semibold text-fg" role="status">{t(`routine.status.${run?.status ?? 'idle'}`)}</p>
            {shown && <>
              <p className="break-words text-lg font-semibold text-fg">{shown.stages[stepIndex].name}</p>
              <p className="text-sm text-sub">{t('routine.position', { cycle, repeats: shown.repeats, step: stepIndex + 1, stages: shown.stages.length })}</p>
            </>}
            <p data-routine-remaining={remaining} className="text-4xl sm:text-5xl font-bold text-fg tabular-nums">{formatClock(remaining, { down: true })}</p>
            <p data-routine-total-remaining={totalRemaining} className="text-sm text-sub tabular-nums">{t('routine.totalRemaining', { time: formatClock(totalRemaining, { down: true }) })}</p>
            <div className="flex flex-wrap gap-2">
              {run?.status === 'running'
                ? <button type="button" onClick={pause} className="ui-btn min-h-11 px-4 py-2 text-sm">{t('routine.pause')}</button>
                : <button type="button" onClick={begin} disabled={otherRunning || !validDraft || busy} className="ui-btn min-h-11 px-4 py-2 text-sm disabled:opacity-40">{t(run?.status === 'paused' ? 'routine.resume' : 'routine.start')}</button>}
              <button type="button" onClick={skip} disabled={!editingLocked} className="ui-btn-soft min-h-11 px-4 py-2 text-sm disabled:opacity-40">{t('routine.skip')}</button>
              <button type="button" onClick={reset} disabled={!run} className="ui-btn-soft min-h-11 px-4 py-2 text-sm disabled:opacity-40">{t('routine.reset')}</button>
            </div>
          </div>
          {otherRunning && <p className="text-sm text-body">{t('routine.otherRunning')}</p>}
          <p className="text-sm text-sub">{t('routine.soundHint')}</p>
          <p className="text-xs text-muted">{t('routine.backgroundHint')}</p>
          <div className="border-t border-line pt-4 space-y-3">
            <h3 className="text-sm font-semibold text-fg">{t('routine.profiles')}</h3>
            <p className="text-xs text-muted">{t('routine.storageHint')}</p>
            <button type="button" onClick={() => manageProfile('save')} disabled={!canStore || !validDraft} className="ui-btn-soft min-h-11 px-4 py-2 text-sm disabled:opacity-40">{t('routine.save')}</button>
            {profiles.length > 0 && <>
              <label className="block text-sm text-body">{t('routine.savedList', { count: profiles.length })}
                <select value={selectedId} disabled={editingLocked || busy} onChange={event => { setSelectedId(event.target.value); setDeletePending(false) }} className="ui-field mt-1 min-h-11 px-3 py-2 text-base">
                  <option value="">{t('routine.choose')}</option>
                  {profiles.map(profile => <option key={profile.id} value={profile.id}>{profile.routine.name}</option>)}
                </select>
              </label>
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => manageProfile('load')} disabled={!canStore || !selected} className="ui-btn-soft min-h-11 px-4 py-2 text-sm disabled:opacity-40">{t('routine.load')}</button>
                <button type="button" onClick={() => setDeletePending(true)} disabled={!canStore || !selected} className="ui-btn-soft min-h-11 px-4 py-2 text-sm disabled:opacity-40">{t('routine.delete')}</button>
              </div>
            </>}
            {deletePending && selected && <div className="rounded-xl bg-subtle p-3 space-y-2">
              <p className="text-sm text-body">{t('routine.deleteConfirm', { name: selected.routine.name })}</p>
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => manageProfile('delete')} disabled={!canStore} className="ui-btn min-h-11 px-4 py-2 text-sm disabled:opacity-40">{t('routine.confirmDelete')}</button>
                <button type="button" onClick={() => setDeletePending(false)} className="ui-btn-soft min-h-11 px-4 py-2 text-sm">{t('routine.cancel')}</button>
              </div>
            </div>}
            {issue && <div role="alert" className="rounded-xl bg-subtle p-3 space-y-2">
              <p className="text-sm text-body">{t(`routine.errors.${issue}`)}</p>
              <button type="button" onClick={refresh} disabled={busy} className="ui-btn-soft min-h-11 px-4 py-2 text-sm">{t('routine.refresh')}</button>
            </div>}
          </div>
          {notice && <p role="status" className="text-sm text-sub">{notice}</p>}
        </div>
      </div>
    </section>
  )
}
