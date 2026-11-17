'use client'

import { useId } from 'react'
import { useTranslations } from '@/lib/i18n'
import '@/lib/i18n/ns/notepad'
import type { NotepadDraftView } from '@/utils/notepadDraft'
import type { NotepadError } from '@/utils/notepadPersistence'

export default function NotepadRecovery({ view, settingsError, onRetry, onRecheck, onKeepBoth, onBackup, onRawBackup, onRetrySettings }: {
  view: NotepadDraftView; settingsError?: NotepadError
  onRetry: () => void; onRecheck: () => void; onKeepBoth: (scope: number, raw: string | null) => void
  onBackup: () => void; onRawBackup: (raw: string) => void; onRetrySettings: () => void
}) {
  const t = useTranslations('notepad'), id = useId()
  const candidate = view.external?.ok ? view.external : null
  const current = new Map(view.notes.map(note => [note.id, note]))
  const conflicts = candidate?.value.filter(note => {
    const old = current.get(note.id)
    return old && (old.title !== note.title || old.content !== note.content || old.createdAt !== note.createdAt || old.updatedAt !== note.updatedAt || !!old.pinned !== !!note.pinned)
  }).length ?? 0
  const raw = view.external && 'raw' in view.external ? view.external.raw : view.originalRaw
  const busy = !view.ready || view.status === 'saving'
  const showRecovery = view.status === 'error' || view.status === 'external'
  const button = 'ui-btn-soft min-h-11 px-3 py-2 text-sm disabled:opacity-50'
  return <section data-notepad-recovery="" aria-labelledby={id} className="min-w-0 space-y-3 rounded-xl bg-subtle p-4">
    <h3 id={id} className="text-base font-semibold text-fg">{t('persistence.title')}</h3>
    <p role={view.error ? 'alert' : 'status'} data-notepad-save-status={view.status} className="text-sm text-body">
      {t(!view.ready ? 'persistence.loading' : view.error ? `persistence.errors.${view.error}` : `persistence.${view.status}`)}
    </p>
    {showRecovery && <>
      <p className="text-sm text-sub">{t('persistence.memoryHint')}</p>
      <div className="flex flex-wrap gap-2">
        <button type="button" data-notepad-backup-current="" onClick={onBackup} disabled={!view.ready} className={button}>{t('persistence.backup')}</button>
        <button type="button" data-notepad-save-recheck="" onClick={onRecheck} disabled={busy} className={button}>{t('persistence.recheck')}</button>
        {!candidate && <button type="button" data-notepad-save-retry="" onClick={onRetry} disabled={busy} className={button}>{t('persistence.retry')}</button>}
        {typeof raw === 'string' && <button type="button" data-notepad-backup-raw="" onClick={() => onRawBackup(raw)} className={button}>{t('persistence.rawBackup')}</button>}
      </div>
    </>}
    {candidate && <div data-notepad-external="" className="min-w-0 space-y-3 border-t border-line pt-3">
      <p className="text-sm text-body">{t('persistence.comparison', { current: view.notes.length, external: candidate.value.length, conflicts })}</p>
      {!candidate.value.length && <p className="text-sm text-sub">{t('persistence.externalEmpty')}</p>}
      <details className="min-w-0">
        <summary className="min-h-11 cursor-pointer py-2 text-sm text-body">{t('persistence.showTitles')}</summary>
        <ul className="max-h-48 space-y-1 overflow-auto text-sm text-sub">
          {candidate.value.map(note => <li key={note.id} className="[overflow-wrap:anywhere]">{note.title || t('untitled')}</li>)}
        </ul>
      </details>
      <p className="text-sm text-sub">{t('persistence.keepBothHint')}</p>
      <button type="button" data-notepad-keep-both="" disabled={busy} onClick={() => { if (!busy) onKeepBoth(view.scope, candidate.raw) }} className="ui-btn min-h-11 px-4 py-2 text-sm disabled:opacity-50">{t('persistence.keepBoth')}</button>
    </div>}
    {settingsError && <div className="space-y-2 border-t border-line pt-3">
      <p role="alert" className="text-sm text-body">{t('persistence.settingsFailed')}</p>
      <button type="button" data-notepad-settings-retry="" onClick={onRetrySettings} className={button}>{t('persistence.settingsRetry')}</button>
    </div>}
  </section>
}
