'use client'

import { useEffect, useRef, useState } from 'react'
import { useHydrated } from '@/hooks/useHydrated'
import { useTranslations } from '@/lib/i18n'
import '@/lib/i18n/ns/decisionTools'
import { localDateKey, MEAL_HISTORY_KEY, type MealRecord } from '@/utils/mealHistory'
import {
  MEAL_PLAN_KEY, MEAL_PLAN_LIMIT, MEAL_PLAN_MENU_LIMIT, fillMealPlanBlanks, mealPlanText, mealPlanWeek, mealPlanHistoryState,
  readMealPlan, writeMealPlanChanges, type MealPlanSnapshot,
} from '@/utils/mealPlan'

type Notice = { key: string; error?: boolean; values?: Record<string, string | number> }

export default function MealPlanPanel({ candidates, today, history, ready, busy, onAddMeal }: {
  candidates: string[]
  today: string
  history: MealRecord[]
  ready: boolean
  busy: boolean
  onAddMeal: (name: string, date: string) => boolean
}) {
  const t = useTranslations('decisionTools')
  const hydrated = useHydrated()
  const [initialized, setInitialized] = useState(false)
  const [start, setStart] = useState('')
  const [snapshot, setSnapshot] = useState<MealPlanSnapshot | null>(null)
  const [draft, setDraft] = useState<Record<string, string>>({})
  const [notice, setNotice] = useState<Notice | null>(null)
  const [working, setWorking] = useState(false)
  const [conflict, setConflict] = useState(false)
  const [confirmRefresh, setConfirmRefresh] = useState(false)
  const revision = useRef(0)

  if (hydrated && !initialized) {
    setInitialized(true)
    setStart(localDateKey())
    setSnapshot(readMealPlan())
  }

  useEffect(() => {
    const changed = (event: StorageEvent) => {
      if (event.key !== null && event.key !== MEAL_PLAN_KEY) return
      if (snapshot?.status === 'ready' && (event.key === null || event.newValue !== snapshot.raw)) {
        setConflict(true)
        setNotice(null)
      }
    }
    window.addEventListener('storage', changed)
    return () => window.removeEventListener('storage', changed)
  }, [snapshot])

  const entries = snapshot?.status === 'ready' ? snapshot.entries : []
  const week = mealPlanWeek(start, entries, draft)
  const changes = Object.entries(draft)
    .filter(([date, menu]) => menu.trim() !== (entries.find((entry) => entry.date === date)?.menu ?? ''))
    .map(([date, menu]) => ({ date, menu }))
  const blocked = snapshot?.status !== 'ready' || conflict || working || busy
  const storageError = snapshot && snapshot.status !== 'ready' ? snapshot.status : conflict ? 'conflict' : null

  const edit = (date: string, menu: string) => {
    revision.current++
    setDraft((previous) => ({ ...previous, [date]: menu }))
    setNotice(null)
  }
  const fill = () => {
    if (!week || blocked) return
    const filled = fillMealPlanBlanks(week, candidates)
    if (!filled.ok) { setNotice({ key: `mealPlan.errors.${filled.error}`, error: true }); return }
    revision.current++
    setDraft((previous) => ({ ...previous, ...Object.fromEntries(filled.changes.map((entry) => [entry.date, entry.menu])) }))
    setNotice({ key: 'mealPlan.filled', values: { filled: filled.filled, remaining: filled.remaining, skipped: filled.skippedCandidates } })
  }
  const save = async () => {
    if (blocked || !snapshot || !week || !changes.length) return
    setWorking(true)
    setNotice(null)
    try {
      const commit = () => writeMealPlanChanges(snapshot, changes)
      const result = navigator.locks ? await navigator.locks.request(MEAL_PLAN_KEY, commit) : commit()
      if (!result.ok) {
        if (result.error === 'conflict') setConflict(true)
        setNotice({ key: `mealPlan.errors.${result.error}`, error: true })
        return
      }
      setSnapshot(result.snapshot)
      setDraft((previous) => {
        const next = { ...previous }
        changes.forEach((change) => { if (next[change.date] === change.menu) delete next[change.date] })
        return next
      })
      setNotice({ key: 'mealPlan.saved', values: { count: changes.length } })
    } catch { setNotice({ key: 'mealPlan.errors.unavailable', error: true }) }
    finally { setWorking(false) }
  }
  const refresh = () => {
    revision.current++
    const next = readMealPlan()
    setSnapshot(next)
    setDraft({})
    setConflict(false)
    setConfirmRefresh(false)
    setNotice(next.status === 'ready' ? { key: 'mealPlan.refreshed' } : { key: `mealPlan.errors.${next.status}`, error: true })
  }
  const addToHistory = async (menu: string, date: string) => {
    const name = menu.trim()
    if (!ready || working || busy) return
    const state = mealPlanHistoryState({ date, menu: name }, localDateKey(), history)
    if (state !== 'ready') {
      setNotice({ key: state === 'duplicate' ? 'mealPlan.historyDuplicate' : 'mealPlan.historyFailed', error: true })
      return
    }
    setWorking(true)
    setNotice(null)
    try {
      const add = () => onAddMeal(name, date)
      const added = navigator.locks ? await navigator.locks.request(MEAL_HISTORY_KEY, add) : add()
      setNotice(added ? { key: 'mealPlan.historyAdded', values: { date, menu: name } } : { key: 'mealPlan.historyFailed', error: true })
    } catch { setNotice({ key: 'mealPlan.historyFailed', error: true }) }
    finally { setWorking(false) }
  }
  const copyWeek = async () => {
    if (!week) return
    const currentRevision = revision.current
    setNotice(null)
    try {
      const text = mealPlanText(week, t('mealPlan.emptyMenu'))
      if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(text)
      else {
        const textarea = document.createElement('textarea')
        textarea.value = text
        textarea.style.position = 'fixed'
        textarea.style.left = '-999999px'
        document.body.appendChild(textarea)
        try { textarea.select(); if (!document.execCommand('copy')) throw new Error('Copy failed') }
        finally { textarea.remove() }
      }
      if (revision.current === currentRevision) setNotice({ key: 'mealPlan.copied' })
    } catch { if (revision.current === currentRevision) setNotice({ key: 'mealPlan.copyFailed', error: true }) }
  }
  const downloadWeek = () => {
    if (!week) return
    setNotice(null)
    let url: string | undefined
    try {
      url = URL.createObjectURL(new Blob([mealPlanText(week, t('mealPlan.emptyMenu'))], { type: 'text/plain;charset=utf-8' }))
      const link = document.createElement('a')
      link.href = url
      link.download = `meal-plan-${start}.txt`
      document.body.appendChild(link)
      try { link.click() } finally { link.remove() }
    } catch { setNotice({ key: 'mealPlan.downloadFailed', error: true }) }
    finally { if (url) { const downloadUrl = url; setTimeout(() => URL.revokeObjectURL(downloadUrl), 1000) } }
  }

  return (
    <section id="meal-plan" className="ui-card min-w-0 space-y-4 p-4 scroll-mt-20" aria-labelledby="meal-plan-title">
      <h2 id="meal-plan-title" className="font-semibold text-fg">{t('mealPlan.title')}</h2>
      <p className="text-sm text-sub">{t('mealPlan.description')}</p>
      <div>
        <label htmlFor="meal-plan-start" className="mb-1 block text-sm font-medium text-body">{t('mealPlan.start')}</label>
        <input id="meal-plan-start" type="date" min="2000-01-01" max="2200-12-25" value={start} onChange={(event) => { revision.current++; setStart(event.target.value); setNotice(null) }} disabled={!initialized || working} className="ui-field min-h-11 min-w-0 w-full px-3 py-3 text-base" aria-describedby="meal-plan-date-hint" />
        <p id="meal-plan-date-hint" className="mt-1 text-xs text-muted">{t('mealPlan.dateHint')}</p>
      </div>
      {initialized && !week && <p role="alert" className="text-sm text-body">{t('mealPlan.errors.invalidWeek')}</p>}
      <button type="button" onClick={fill} disabled={blocked || !week} className="ui-btn-soft min-h-11 px-3 py-2 text-sm disabled:opacity-50">{t('mealPlan.fill')}</button>
      <p className="text-xs text-muted">{t('mealPlan.fillHint', { count: candidates.length })}</p>
      {week && (
        <ul className="space-y-3" aria-label={t('mealPlan.weekList')}>
          {week.map((entry) => {
            const historyState = mealPlanHistoryState(entry, today, history)
            const recorded = historyState === 'duplicate'
            return <li key={entry.date} className="rounded-xl bg-subtle p-3 space-y-2">
              <label htmlFor={`meal-plan-${entry.date}`} className="block text-sm font-medium text-body">{t('mealPlan.menuLabel', { date: entry.date })}</label>
              <input id={`meal-plan-${entry.date}`} value={entry.menu} maxLength={MEAL_PLAN_MENU_LIMIT} onChange={(event) => edit(entry.date, event.target.value)} placeholder={t('mealPlan.menuPlaceholder')} autoComplete="off" disabled={working || busy} className="ui-field min-h-11 min-w-0 w-full px-3 py-3 text-base" />
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => edit(entry.date, '')} disabled={!entry.menu || working || busy} className="ui-btn-soft min-h-11 px-3 py-2 text-sm disabled:opacity-50">{t('mealPlan.clearDay')}</button>
                {(historyState === 'ready' || recorded) && <button type="button" onClick={() => { void addToHistory(entry.menu, entry.date) }} disabled={!ready || working || busy || recorded} className="ui-btn-soft min-h-11 px-3 py-2 text-sm disabled:opacity-50">{t(recorded ? 'mealPlan.alreadyRecorded' : 'mealPlan.addHistory')}</button>}
              </div>
            </li>
          })}
        </ul>
      )}
      <p className="text-sm text-sub">{t('mealPlan.pending', { count: changes.length, saved: entries.length, max: MEAL_PLAN_LIMIT })}</p>
      <button type="button" onClick={() => { void save() }} disabled={blocked || !week || !changes.length} className="ui-btn min-h-11 w-full px-4 py-3 disabled:opacity-50">{t(working ? 'mealPlan.working' : 'mealPlan.save')}</button>
      <p className="text-xs text-muted">{t('mealPlan.saveHint')}</p>
      {storageError && <p role="alert" className="text-sm text-body">{t(`mealPlan.errors.${storageError}`)}</p>}
      {notice && <p role={notice.error ? 'alert' : 'status'} className="text-sm text-body [overflow-wrap:anywhere]">{t(notice.key, notice.values)}</p>}
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => { void copyWeek() }} disabled={!week} className="ui-btn-soft min-h-11 px-3 py-2 text-sm disabled:opacity-50">{t('mealPlan.copy')}</button>
        <button type="button" onClick={downloadWeek} disabled={!week} className="ui-btn-soft min-h-11 px-3 py-2 text-sm disabled:opacity-50">{t('mealPlan.download')}</button>
        <button type="button" onClick={() => { if (changes.length) setConfirmRefresh(true); else refresh() }} disabled={!initialized || working} className="ui-btn-soft min-h-11 px-3 py-2 text-sm disabled:opacity-50">{t('mealPlan.refresh')}</button>
      </div>
      {confirmRefresh && <div className="rounded-xl bg-subtle p-3 space-y-2">
        <p className="text-sm text-body">{t('mealPlan.refreshPrompt', { count: changes.length })}</p>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={refresh} disabled={working} className="ui-btn min-h-11 px-3 py-2 text-sm">{t('mealPlan.refreshConfirm')}</button>
          <button type="button" onClick={() => setConfirmRefresh(false)} className="ui-btn-soft min-h-11 px-3 py-2 text-sm">{t('mealPlan.cancel')}</button>
        </div>
      </div>}
      <p className="text-xs text-muted">{t('mealPlan.exportHint')}</p>
      <p className="text-xs text-muted">{t('mealPlan.localOnly')}</p>
    </section>
  )
}
