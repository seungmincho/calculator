'use client'

import { useState } from 'react'
import { useTranslations } from '@/lib/i18n'
import '@/lib/i18n/ns/meetingMinutes'
import type { ActionItem } from '@/utils/meetingMinutes'

const MAX_SELECTION = 50

function itemProblems(item: ActionItem): string[] {
  const problems: string[] = []
  if (!item.id.trim() || item.id.length > 80) problems.push('invalidIdentity')
  if (!item.task.trim()) problems.push('emptyTask')
  if (item.task.length > 6000) problems.push('taskTooLong')
  if (item.assignee.length > 120) problems.push('assigneeTooLong')
  if (item.dueDate) {
    const timestamp = Date.parse(`${item.dueDate}T00:00:00Z`)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(item.dueDate) || Number(item.dueDate.slice(0, 4)) < 1 || !Number.isFinite(timestamp) || new Date(timestamp).toISOString().slice(0, 10) !== item.dueDate) problems.push('invalidDate')
  }
  if (!['pending', 'in-progress', 'done'].includes(item.status)) problems.push('invalidStatus')
  return problems
}

export default function MeetingActionExportPanel({ actions, meetingTitle, ready, blocked, onSend, onReviewActions, onAddAction }: {
  actions: ActionItem[]
  meetingTitle: string
  ready: boolean
  blocked: boolean
  onSend: (items: ActionItem[]) => void
  onReviewActions: () => void
  onAddAction: () => void
}) {
  const t = useTranslations('meetingMinutes')
  const [expanded, setExpanded] = useState(false)
  const [selection, setSelection] = useState<string[]>([])
  const [notice, setNotice] = useState('')
  const checked = new Set(selection)
  const rows = actions.map(action => ({ action, problems: itemProblems(action) }))
  const eligible = rows.filter(row => !row.problems.length)
  const invalidCount = rows.length - eligible.length
  const selected = rows.filter(row => checked.has(row.action.id))
  const totalTooLong = selected.reduce((sum, row) => sum + row.action.task.length, 0) > 30000
  const titleTooLong = meetingTitle.length > 120
  const canSend = ready && !blocked && !!selected.length && selected.length <= MAX_SELECTION && !totalTooLong && !titleTooLong && selected.every(row => !row.problems.length)

  const send = () => {
    if (!canSend) return
    try {
      onSend(selected.map(row => row.action))
      setNotice('opened')
    } catch (error) {
      const code = error instanceof Error ? error.message : ''
      setNotice(['storageFailed', 'popupBlocked', 'handoffFailed'].includes(code) ? code : 'invalidSelection')
    }
  }

  return <section aria-labelledby="meeting-kanban-title" className="ui-card p-4 sm:p-6 space-y-4 print:hidden">
    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
      <div className="min-w-0">
        <h2 id="meeting-kanban-title" className="text-lg font-bold text-fg">{t('kanban.title')}</h2>
        <p className="mt-1 text-sm text-body">{t('kanban.description')}</p>
      </div>
      {actions.length > 0 && <button type="button" aria-expanded={expanded} aria-controls="meeting-kanban-selection" onClick={() => setExpanded(value => !value)} className="ui-btn-soft min-h-11 shrink-0 px-4 py-2 text-sm">{t(expanded ? 'kanban.close' : 'kanban.open')}</button>}
    </div>
    <p className="text-sm text-sub">{t('kanban.copyHint')}</p>
    {!ready ? <p role="status" className="text-sm text-muted">{t('kanban.loading')}</p> : actions.length === 0 && <div className="bg-subtle rounded-2xl p-4 space-y-2">
      <p className="text-sm text-body">{t('kanban.empty')}</p>
      <button type="button" onClick={onAddAction} className="ui-btn-soft min-h-11 px-3 py-2 text-sm">{t('kanban.addAction')}</button>
    </div>}

    {expanded && actions.length > 0 && <div id="meeting-kanban-selection" className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <p role="status" className="text-sm font-semibold text-primary">{t('kanban.selected', { count: selected.length })}</p>
        <button type="button" onClick={() => { setSelection(eligible.slice(0, MAX_SELECTION).map(row => row.action.id)); setNotice('') }} disabled={!eligible.length} className="ui-btn-soft min-h-11 px-3 py-2 text-sm disabled:opacity-40">{t(eligible.length > MAX_SELECTION ? 'kanban.selectFirst' : 'kanban.selectAll')}</button>
        <button type="button" onClick={() => { setSelection([]); setNotice('') }} disabled={!selected.length} className="ui-btn-soft min-h-11 px-3 py-2 text-sm disabled:opacity-40">{t('kanban.clear')}</button>
      </div>
      {invalidCount > 0 && <p className="text-sm text-body">{t('kanban.invalidItems', { count: invalidCount })}</p>}
      {titleTooLong && <p role="alert" className="text-sm text-body">{t('kanban.titleTooLong')}</p>}
      <ol className="space-y-3">
        {rows.map(({ action, problems }, index) => <li key={action.id} className={`min-w-0 rounded-2xl border p-3 sm:p-4 ${checked.has(action.id) ? 'border-primary bg-primary-soft' : 'border-line bg-subtle'}`}>
          <label className="flex min-h-11 items-start gap-3 text-sm text-body cursor-pointer">
            <input type="checkbox" checked={checked.has(action.id)} disabled={!checked.has(action.id) && (!!problems.length || selected.length >= MAX_SELECTION)} onChange={event => {
              setSelection(previous => event.target.checked ? [...previous.filter(id => actions.some(action => action.id === id)), action.id] : previous.filter(id => id !== action.id))
              setNotice('')
            }} aria-label={t('kanban.selectAction', { number: index + 1 })} aria-describedby={problems.length ? `meeting-action-problems-${index}` : undefined} className="mt-0.5 h-5 w-5 shrink-0 accent-primary" />
            <span className="min-w-0 flex-1">
              <span className="block text-xs text-muted mb-1">{t('kanban.actionNumber', { number: index + 1 })}</span>
              <span className="block max-h-40 overflow-y-auto whitespace-pre-wrap break-words">{action.task || t('kanban.emptyTask')}</span>
            </span>
          </label>
          <dl className="mt-2 grid grid-cols-1 gap-2 text-sm sm:grid-cols-3">
            <div className="min-w-0"><dt className="text-muted">{t('assignee')}</dt><dd className="text-body break-words">{action.assignee || t('kanban.unassigned')}</dd></div>
            <div className="min-w-0"><dt className="text-muted">{t('dueDate')}</dt><dd className="text-body break-words">{action.dueDate || t('kanban.noDueDate')}</dd></div>
            <div className="min-w-0"><dt className="text-muted">{t('status')}</dt><dd className="text-body">{t(action.status === 'done' ? 'done' : action.status === 'in-progress' ? 'inProgress' : action.status === 'pending' ? 'pending' : 'kanban.invalidStatus')}</dd></div>
          </dl>
          {problems.length > 0 && <ul id={`meeting-action-problems-${index}`} className="mt-3 space-y-1 text-sm text-body">{problems.map(problem => <li key={problem}>{t(`kanban.${problem}`)}</li>)}</ul>}
        </li>)}
      </ol>
      <div className="space-y-2" aria-live="polite">
        {!selected.length && <p className="text-sm text-muted">{t('kanban.noSelection')}</p>}
        {selected.length >= MAX_SELECTION && <p className="text-sm text-sub">{t('kanban.limitReached')}</p>}
        {totalTooLong && <p role="alert" className="text-sm text-body">{t('kanban.totalTooLong')}</p>}
        {blocked && <p role="alert" className="text-sm text-body">{t('kanban.blocked')}</p>}
      </div>
      <p className="text-xs text-muted">{t('kanban.sendHint')}</p>
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={send} disabled={!canSend} className="ui-btn min-h-11 px-4 py-3 text-sm disabled:opacity-40">{t('kanban.send', { count: selected.length })}</button>
        <button type="button" onClick={onReviewActions} className="ui-btn-soft min-h-11 px-4 py-3 text-sm">{t('kanban.reviewActions')}</button>
      </div>
    </div>}
    {notice && <p role={notice === 'opened' ? 'status' : 'alert'} className="text-sm text-body">{t(`kanban.${notice}`)}</p>}
  </section>
}
