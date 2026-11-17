'use client'

import { useState } from 'react'
import { useTranslations } from '@/lib/i18n'
import '@/lib/i18n/ns/kanbanMeetingImportPanel'
import type { KanbanColumn, MeetingImportTarget, MeetingKanbanHandoff, TaskStatus } from '@/utils/meetingKanban'

const STATUSES: TaskStatus[] = ['pending', 'in-progress', 'done']

interface Props {
  payload: MeetingKanbanHandoff | null
  columns: KanbanColumn[]
  disabled: boolean
  error: string
  onImport: (target: MeetingImportTarget) => void
  onClose: () => void
}

export default function KanbanMeetingImportPanel({ payload, columns, disabled, error, onImport, onClose }: Props) {
  const t = useTranslations('kanbanMeetingImportPanel')
  const [mode, setMode] = useState<'new-columns' | 'existing'>('new-columns')
  const [columnIds, setColumnIds] = useState<Record<TaskStatus, string>>({ pending: '', 'in-progress': '', done: '' })
  const [titles, setTitles] = useState<Record<TaskStatus, string>>(() => Object.fromEntries(
    STATUSES.map((status) => [status, `${(payload?.meetingTitle ?? '').slice(0, 100).replace(/[\uD800-\uDBFF]$/, '')} · ${t(`status.${status}`)}`.slice(0, 120)]),
  ) as Record<TaskStatus, string>)

  if (!payload) return (
    <section aria-labelledby="meeting-import-title" className="ui-card space-y-4 p-5">
      <h2 id="meeting-import-title" className="text-xl font-semibold text-fg">{t('title')}</h2>
      <p role="alert" className="text-sm text-body">{t('invalidHandoff')}</p>
      <button type="button" className="ui-btn-soft min-h-11 px-4 py-2" onClick={onClose}>{t('close')}</button>
    </section>
  )

  const existingSources = new Set(columns.flatMap((column) => column.cards.flatMap((card) =>
    card.meetingSource ? [JSON.stringify([card.meetingSource.meetingId, card.meetingSource.actionId])] : [],
  )))
  const newItems = payload.items.filter((item) => !existingSources.has(JSON.stringify([payload.meetingId, item.id])))
  const newStatuses = STATUSES.filter((status) => newItems.some((item) => item.status === status))
  const duplicateCount = payload.items.length - newItems.length

  return (
    <section aria-labelledby="meeting-import-title" className="ui-card min-w-0 space-y-5 p-5 sm:p-6">
      <div className="space-y-2">
        <h2 id="meeting-import-title" className="text-xl font-semibold text-fg">{t('title')}</h2>
        <p className="break-words text-base font-medium text-body">{payload.meetingTitle}</p>
        <p className="text-sm text-sub">{t('summary', { total: payload.items.length, added: newItems.length, skipped: duplicateCount })}</p>
      </div>
      <div className="space-y-2 rounded-2xl bg-subtle p-4 text-sm text-sub">
        <p>{t('copyNotice')}</p>
        <p>{t('priorityNotice')}</p>
        <p>{t('duplicateNotice')}</p>
      </div>
      {error && <p role="alert" className="rounded-xl border border-line bg-subtle p-3 text-sm text-body">{error}</p>}
      <details className="rounded-xl border border-line p-3">
        <summary className="flex min-h-11 cursor-pointer items-center text-sm font-medium text-body">{t('preview', { count: payload.items.length })}</summary>
        <ul className="mt-3 max-h-72 space-y-3 overflow-y-auto">
          {payload.items.map((item) => <li key={item.id} className="space-y-1 rounded-xl bg-subtle p-3">
            <p className="whitespace-pre-wrap break-words text-sm text-body">{item.task}</p>
            <p className="break-words text-xs text-sub">{t('itemDetails', { assignee: item.assignee || t('unassigned'), dueDate: item.dueDate || t('noDueDate'), status: t(`status.${item.status}`) })}</p>
          </li>)}
        </ul>
      </details>
      <form className="min-w-0 space-y-5" onSubmit={(event) => {
        event.preventDefault()
        onImport(mode === 'new-columns' ? { kind: 'new-columns', titles } : { kind: 'existing', columnIds })
      }}>
        <fieldset disabled={disabled} className="min-w-0 space-y-5 disabled:opacity-60">
          <legend className="mb-3 text-sm font-medium text-body">{t('destination')}</legend>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <button type="button" aria-pressed={mode === 'new-columns'} onClick={() => setMode('new-columns')}
              className={`min-h-11 rounded-xl px-4 py-3 text-sm font-medium ${mode === 'new-columns' ? 'bg-primary text-white' : 'bg-soft text-body'}`}>{t('newColumns')}</button>
            <button type="button" aria-pressed={mode === 'existing'} disabled={columns.length === 0} onClick={() => setMode('existing')}
              className={`min-h-11 rounded-xl px-4 py-3 text-sm font-medium disabled:opacity-50 ${mode === 'existing' ? 'bg-primary text-white' : 'bg-soft text-body'}`}>{t('existingColumns')}</button>
          </div>
          <p className="text-sm text-sub">{t(mode === 'new-columns' ? 'newColumnsHint' : 'existingColumnsHint')}</p>
          {newStatuses.length === 0 ? <p className="rounded-xl bg-subtle p-4 text-sm text-body">{t('allDuplicates')}</p> : (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
              {newStatuses.map((status) => <div key={status} className="min-w-0">
                <label htmlFor={`meeting-import-${status}`} className="mb-1 block text-sm font-medium text-body">{t(mode === 'new-columns' ? 'columnTitle' : 'columnTarget', { status: t(`status.${status}`) })}</label>
                {mode === 'new-columns' ? <input id={`meeting-import-${status}`} className="ui-field min-h-11 w-full px-3 py-2 text-base" maxLength={120} required value={titles[status]} onChange={(event) => setTitles((current) => ({ ...current, [status]: event.target.value }))} /> :
                  <select id={`meeting-import-${status}`} className="ui-field min-h-11 w-full px-3 py-2 text-base" required value={columnIds[status]} onChange={(event) => setColumnIds((current) => ({ ...current, [status]: event.target.value }))}>
                    <option value="">{t('selectColumn')}</option>
                    {columns.map((column) => <option key={column.id} value={column.id}>{column.title}</option>)}
                  </select>}
              </div>)}
            </div>
          )}
          <button type="submit" className="ui-btn min-h-11 w-full px-4 py-3 sm:w-auto">{t('importButton', { count: newItems.length })}</button>
        </fieldset>
        <button type="button" className="ui-btn-soft min-h-11 w-full px-4 py-3 sm:w-auto" onClick={onClose}>{t('close')}</button>
      </form>
    </section>
  )
}
