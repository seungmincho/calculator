'use client'

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useTranslations } from '@/lib/i18n'
import '@/lib/i18n/ns/csatGrade'
import CsatDirectGradePanel from '@/components/CsatDirectGradePanel'
import { createCsatScoreActionGuard, type CsatScoreError, type CsatScoreSnapshot } from '@/utils/csatScoreRecords'
import {
  CSAT_GOALS_KEY, CSAT_GOAL_LIMIT, CSAT_GOAL_NAME_LIMIT, deleteCsatGoal, evaluateCsatGoal, isCsatGoalCondition,
  readCsatGoals, saveCsatGoal, withCsatGoalsLock, writeCsatGoals,
  type CsatGoal, type CsatGoalEvaluation, type CsatGoalRead,
} from '@/utils/csatGoals'

/** Shared by the one-off comparison and every saved condition. */
export function CsatGoalEvaluationView({ result }: { result: CsatGoalEvaluation }) {
  const t = useTranslations('csatGrade')
  const label = result.status === 'invalidCondition' ? t('goals.invalidCondition', { min: result.areas, max: result.areas * 9 })
    : result.status === 'needsInput' ? t('goals.needsInput', { count: result.available.length, required: result.areas })
      : result.status === 'within' ? t('goals.within') : t('goals.over', { amount: result.over ?? 0 })
  return (
    <div data-goal-status={result.status} className="space-y-2">
      <p className={`text-lg font-bold ${result.status === 'within' ? 'text-primary' : 'text-fg'}`}>{label}</p>
      {result.sum !== null && <p className="text-sm text-body tabular-nums">{t('goals.sum', { areas: result.areas, sum: result.sum, max: result.maxSum })}</p>}
      <p className="text-xs text-sub">{t('goals.scope', { count: result.available.length })}</p>
      {result.used.length > 0 && <div>
        <p className="text-xs font-medium text-body">{t(result.status === 'needsInput' ? 'goals.availableAreas' : 'goals.usedAreas')}</p>
        <ul data-goal-used-areas className="mt-1 space-y-1 text-xs text-sub">
          {result.used.map(area => <li key={area.id} data-goal-area={area.id} data-score-field={area.field}>{t('goals.areaGrade', { subject: t(`u.cut.${area.subject}`), grade: area.grade })}</li>)}
        </ul>
      </div>}
      {result.inquiryConflict && <p className="text-xs text-body">{t('goals.inquiryConflict')}</p>}
      {!result.inquiryConflict && result.duplicateInquiry && <p className="text-xs text-sub">{t('goals.duplicateInquiry')}</p>}
      {result.singleInquiry && <p className="text-xs text-sub">{t('goals.singleInquiry', { subject: t(`u.cut.${result.singleInquiry.subject}`) })}</p>}
      {result.invalidFields.length > 0 && <p className="text-xs text-body">{t('goals.invalidScores', { fields: result.invalidFields.map(field => t(field === 'kor' ? 'subjects.korean' : field === 'math' ? 'subjects.math' : field === 'eng' ? 'subjects.english' : field === 'inq1' ? 'u.inq1' : 'u.inq2')).join(', ') })}</p>}
    </div>
  )
}

type Draft = { name: string; areas: string; maxSum: string }
type Pending = { token: number } & ({ kind: 'save' | 'update'; input: { name: string; areas: number; maxSum: number }; id: string | null } | { kind: 'delete'; goal: CsatGoal })
const initialDraft: Draft = { name: '', areas: '3', maxSum: '7' }
const blockedErrors: CsatScoreError[] = ['corrupt', 'unsupported', 'oversized', 'unavailable', 'quota', 'conflict', 'unverified']

export default function CsatGoalConditions({ current, ready }: { current: CsatScoreSnapshot; ready: boolean }) {
  const t = useTranslations('csatGrade')
  const [guard] = useState(createCsatScoreActionGuard)
  const [view, setView] = useState<CsatGoalRead | null>(null)
  const [draft, setDraft] = useState<Draft>(initialDraft)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [pending, setPending] = useState<Pending | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<CsatScoreError | null>(null)
  const [notice, setNotice] = useState<{ kind: 'saved' | 'updated' | 'deleted'; name: string } | null>(null)
  const context = JSON.stringify([ready, current, draft, editingId])
  const [observedContext, setObservedContext] = useState(context)
  const cancelRef = useRef<HTMLButtonElement>(null)
  if (observedContext !== context) {
    setObservedContext(context)
    if (pending) setError('stale')
    setPending(null); setBusy(false)
  }
  useLayoutEffect(() => { guard.update(context) }, [context, guard])
  const refresh = useCallback(() => {
    guard.invalidate(); setPending(null); setBusy(false); setError(null); setNotice(null); setEditingId(null)
    try { setView(readCsatGoals(window.localStorage)) }
    catch { setView({ ok: false, error: 'unavailable' }) }
  }, [guard])
  useEffect(() => {
    const first = window.setTimeout(refresh, 0)
    const changed = (event: StorageEvent) => {
      if (event.key !== CSAT_GOALS_KEY && event.key !== null) return
      guard.invalidate(); setPending(null); setBusy(false); setNotice(null); setError('conflict')
    }
    window.addEventListener('storage', changed)
    return () => { window.clearTimeout(first); window.removeEventListener('storage', changed); guard.invalidate() }
  }, [guard, refresh])
  useEffect(() => { if (pending) cancelRef.current?.focus() }, [pending])

  const goals = view?.ok ? view.store.goals : []
  const issue = view && !view.ok ? view.error : error
  const blocked = !!issue && blockedErrors.includes(issue)
  const canAct = ready && !!view?.ok && !blocked && !busy && !pending
  const input = { name: draft.name.trim(), areas: Number(draft.areas), maxSum: /^\d{1,2}$/.test(draft.maxSum) ? Number(draft.maxSum) : NaN }
  const validCondition = isCsatGoalCondition(input)
  const editing = goals.find(goal => goal.id === editingId)

  function beginSave() {
    if (!canAct) return
    if (!input.name || input.name.length > CSAT_GOAL_NAME_LIMIT || /[\u0000-\u001f\u007f]/.test(input.name)) { setError('name'); return }
    if (!validCondition) { setError('invalid'); return }
    if (editingId && !editing) { setError('missing'); return }
    setNotice(null); setError(null)
    setPending({ kind: editingId ? 'update' : 'save', token: guard.begin(), input, id: editingId })
  }
  function edit(goal: CsatGoal) {
    if (!canAct) return
    guard.invalidate(); setEditingId(goal.id); setDraft({ name: goal.name, areas: String(goal.areas), maxSum: String(goal.maxSum) }); setNotice(null); setError(null)
  }
  function newDraft() { guard.invalidate(); setPending(null); setBusy(false); setEditingId(null); setDraft(initialDraft); setNotice(null) }
  function cancel() { guard.invalidate(); setPending(null); setBusy(false) }
  async function confirm() {
    if (!pending || !view?.ok || busy || !ready || blocked || !guard.isCurrent(pending.token)) return
    const action = pending, expected = view, token = action.token
    setBusy(true); setNotice(null)
    try {
      await withCsatGoalsLock(() => {
        if (!guard.isCurrent(token)) return
        const storage = window.localStorage
        if (storage.getItem(CSAT_GOALS_KEY) !== expected.raw) { setError('conflict'); return }
        const revision = crypto.randomUUID()
        const next = action.kind === 'delete'
          ? deleteCsatGoal(expected.store, action.goal.id, revision)
          : saveCsatGoal(expected.store, action.input, action.id ?? crypto.randomUUID(), revision, new Date().toISOString(), action.kind === 'update')
        const written = writeCsatGoals(storage, expected.raw, next)
        if (!written.ok) { setError(written.error); return }
        setView({ ok: true, raw: written.raw, store: next }); setError(null); setPending(null); setBusy(false)
        setNotice({ kind: action.kind === 'delete' ? 'deleted' : action.kind === 'update' ? 'updated' : 'saved', name: action.kind === 'delete' ? action.goal.name : action.input.name })
        if (action.kind !== 'delete' || action.goal.id === editingId) { setEditingId(null); setDraft(initialDraft) }
      })
    } catch (cause) {
      if (!guard.isCurrent(token)) return
      const message = cause instanceof Error ? cause.message : ''
      setError(message === 'invalid' || message === 'name' || message === 'limit' || message === 'missing' ? message : 'unavailable')
    } finally { if (guard.isCurrent(token)) { setPending(null); setBusy(false) } }
  }

  return (
    <section className="ui-card min-w-0 p-4 sm:p-6" aria-labelledby="csat-goals-title">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="csat-goals-title" className="text-lg font-semibold text-fg">{t('goals.title')}</h2>
        <button type="button" onClick={refresh} className="ui-btn-soft min-h-11 px-3 py-2 text-sm">{t('goals.refresh')}</button>
      </div>
      <p className="mt-2 text-sm text-sub">{t('goals.description', { max: CSAT_GOAL_LIMIT })}</p>
      <p className="mt-2 text-xs text-sub">{t('goals.basis', { year: current.referenceYear })}</p>
      <p className="mt-2 text-xs text-muted">{t('goals.localOnly')}</p>
      {issue && <p role="alert" className="mt-3 rounded-xl bg-subtle p-3 text-sm text-body">{t(`goals.errors.${issue}`)}</p>}
      {!view && <p role="status" className="mt-3 text-sm text-sub">{t('goals.loading')}</p>}

      <div className="mt-4 space-y-3">
        <h3 className="font-medium text-fg">{t(editingId ? 'goals.editing' : 'goals.adding')}</h3>
        <label className="block" htmlFor="csat-goal-name"><span className="mb-1 block text-sm text-body">{t('goals.name')}</span><input id="csat-goal-name" value={draft.name} maxLength={CSAT_GOAL_NAME_LIMIT} disabled={busy || !!pending} onChange={event => setDraft(value => ({ ...value, name: event.target.value }))} className="ui-field min-h-11 w-full px-3 py-2 text-base" /></label>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="block" htmlFor="csat-goal-areas"><span className="mb-1 block text-sm text-body">{t('goals.areas')}</span><select id="csat-goal-areas" value={draft.areas} disabled={busy || !!pending} onChange={event => setDraft(value => ({ ...value, areas: event.target.value }))} className="ui-field min-h-11 w-full px-3 py-2 text-base">{[2, 3, 4].map(areas => <option key={areas} value={areas}>{t('u.nSum', { n: areas })}</option>)}</select></label>
          <label className="block" htmlFor="csat-goal-max"><span className="mb-1 block text-sm text-body">{t('goals.maxSum')}</span><input id="csat-goal-max" type="number" inputMode="numeric" min={Number(draft.areas)} max={Number(draft.areas) * 9} step={1} value={draft.maxSum} disabled={busy || !!pending} onChange={event => setDraft(value => ({ ...value, maxSum: event.target.value }))} className="ui-field min-h-11 w-full px-3 py-2 text-base" /></label>
        </div>
        {!validCondition && <p className="text-sm text-sub">{t('goals.invalidCondition', { min: Number(draft.areas), max: Number(draft.areas) * 9 })}</p>}
        <div className="flex flex-wrap gap-2">
          <button type="button" disabled={!canAct || !input.name || !validCondition || (!editingId && goals.length >= CSAT_GOAL_LIMIT)} onClick={beginSave} className="ui-btn min-h-11 flex-1 px-4 py-2.5">{t(editingId ? 'goals.update' : 'goals.save')}</button>
          {editingId && <button type="button" onClick={newDraft} className="ui-btn-soft min-h-11 px-4 py-2.5">{t('goals.stopEditing')}</button>}
        </div>
        {goals.length >= CSAT_GOAL_LIMIT && !editingId && <p className="text-sm text-sub">{t('goals.errors.limit')}</p>}
      </div>
      {view?.ok && !goals.length && <p className="mt-4 text-sm text-muted">{t('goals.empty')}</p>}
      <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
        {goals.map(goal => <article key={goal.id} data-csat-goal-id={goal.id} className="min-w-0 rounded-xl bg-subtle p-4">
          <h3 className="break-words font-semibold text-fg">{goal.name}</h3>
          <p className="my-2 text-sm text-body">{t('goals.condition', { areas: goal.areas, max: goal.maxSum })}</p>
          <CsatGoalEvaluationView result={evaluateCsatGoal(current, goal)} />
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" onClick={() => edit(goal)} disabled={!canAct} aria-label={t('goals.editAria', { name: goal.name })} className="ui-btn-soft min-h-11 px-3 py-2 text-sm">{t('goals.edit')}</button>
            <button type="button" onClick={() => { if (!canAct) return; setError(null); setNotice(null); setPending({ kind: 'delete', token: guard.begin(), goal }) }} disabled={!canAct} aria-label={t('goals.deleteAria', { name: goal.name })} className="ui-btn-soft min-h-11 px-3 py-2 text-sm">{t('goals.delete')}</button>
          </div>
        </article>)}
      </div>
      {pending && <div role="alertdialog" aria-labelledby="csat-goal-confirm-title" aria-describedby="csat-goal-confirm-body" className="mt-4 rounded-xl border border-line-strong bg-subtle p-4">
        <h3 id="csat-goal-confirm-title" className="font-semibold text-fg">{t(`goals.confirm.${pending.kind}Title`)}</h3>
        <p id="csat-goal-confirm-body" className="mt-2 break-words text-sm text-body">{t(`goals.confirm.${pending.kind}Body`, { name: pending.kind === 'delete' ? pending.goal.name : pending.input.name })}</p>
        <div className="mt-3 flex flex-wrap gap-2"><button type="button" onClick={() => { void confirm() }} disabled={busy} className="ui-btn min-h-11 px-4 py-2.5">{t(busy ? 'goals.working' : `goals.confirm.${pending.kind}Action`)}</button><button ref={cancelRef} type="button" onClick={cancel} className="ui-btn-soft min-h-11 px-4 py-2.5">{t('goals.cancel')}</button></div>
      </div>}
      {notice && <p role="status" className="mt-3 break-words text-sm text-sub">{t(`goals.${notice.kind}`, { name: notice.name })}</p>}
      <CsatDirectGradePanel goals={goals} ready={ready && view !== null} blocked={blocked} />
    </section>
  )
}
