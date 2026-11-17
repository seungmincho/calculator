'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslations } from '@/lib/i18n'
import '@/lib/i18n/ns/characterCounter'
import {
  readWritingVersions, withWritingStorageLock, writeWritingVersions, WRITING_TOTAL_LIMIT, WRITING_VERSION_LIMIT, WRITING_VERSIONS_KEY,
  type WritingRead, type WritingWrite,
} from '@/utils/writingVersions'
import {
  createWritingBackup, prepareWritingImport, previewWritingImport, readWritingBackup, WRITING_BACKUP_MAX_BYTES,
  type WritingBackupError, type WritingBackupRead,
} from '@/utils/writingVersionsBackup'

type ErrorCode = WritingBackupError | 'unavailable' | 'conflict' | 'stale'
type Preview = Extract<WritingBackupRead, { ok: true }> & { filename: string; raw: string | null }

export default function WritingVersionsBackup({ stored, disabled, activeTab, onCommitted, onRefresh }: {
  stored: WritingRead | null; disabled: boolean; activeTab: number
  onCommitted: (result: Extract<WritingWrite, { ok: true }>) => void; onRefresh: () => void
}) {
  const t = useTranslations('characterCounter')
  const [preview, setPreview] = useState<Preview | null>(null)
  const [selected, setSelected] = useState<string[]>([])
  const [reading, setReading] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<ErrorCode | null>(null)
  const [notice, setNotice] = useState<'exported' | 'imported' | 'cancelled' | null>(null)
  const [added, setAdded] = useState(0)
  const generation = useRef(0)
  const hasWork = useRef(false)
  const ownRaw = useRef<string | undefined>(undefined)
  const raw = stored?.ok ? stored.raw : undefined
  const context = useRef({ raw, activeTab, disabled })

  useEffect(() => () => { generation.current++ }, [])
  useEffect(() => {
    const previous = context.current
    context.current = { raw, activeTab, disabled }
    if (previous.raw === raw && previous.activeTab === activeTab && previous.disabled === disabled) return
    if (raw !== undefined && raw === ownRaw.current && previous.activeTab === activeTab && !disabled) {
      ownRaw.current = undefined
      return
    }
    const token = ++generation.current
    const hadWork = hasWork.current
    hasWork.current = false
    queueMicrotask(() => {
      if (generation.current !== token) return
      setPreview(null)
      setSelected([])
      setReading(false)
      setBusy(false)
      if (hadWork) { setError('stale'); setNotice(null) }
    })
  }, [raw, activeTab, disabled])

  const clear = (announce: boolean) => {
    generation.current++
    hasWork.current = false
    setPreview(null)
    setSelected([])
    setReading(false)
    setBusy(false)
    setError(null)
    setNotice(announce ? 'cancelled' : null)
  }

  const choose = async (file?: File) => {
    if (!file || disabled || busy || !stored?.ok) return
    const token = ++generation.current
    const snapshot = stored
    hasWork.current = true
    setPreview(null)
    setSelected([])
    setError(null)
    setNotice(null)
    if (file.size > WRITING_BACKUP_MAX_BYTES) { hasWork.current = false; setError('size'); setReading(false); return }
    setReading(true)
    try {
      const text = await file.text()
      if (token !== generation.current) return
      const result = readWritingBackup(text)
      if (!result.ok) { hasWork.current = false; setError(result.error); return }
      setPreview({ ...result, filename: file.name, raw: snapshot.raw })
      setSelected(previewWritingImport(snapshot.versions, result.versions).filter(row => row.selected).map(row => row.version.id))
    } catch {
      if (token === generation.current) { hasWork.current = false; setError('unavailable') }
    } finally {
      if (token === generation.current) setReading(false)
    }
  }

  const exportFile = () => {
    if (!stored?.ok || disabled || busy) return
    setNotice(null)
    setError(null)
    try {
      const current = readWritingVersions(window.localStorage)
      if (!current.ok) { setError(current.error === 'corrupt' ? 'corrupt' : 'unavailable'); return }
      if (current.raw !== stored.raw) { setError('conflict'); return }
      const json = createWritingBackup(current.versions)
      const url = URL.createObjectURL(new Blob([json], { type: 'application/json;charset=utf-8' }))
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = `writing-versions-${new Date().toISOString().slice(0, 10)}.json`
      document.body.appendChild(anchor)
      try { anchor.click() } finally { anchor.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000) }
      setNotice('exported')
    } catch { setError('unavailable') }
  }

  const rows = useMemo(() => preview && stored?.ok ? previewWritingImport(stored.versions, preview.versions) : [], [preview, stored])
  const selectedRows = rows.filter(row => row.status !== 'duplicate' && selected.includes(row.version.id))
  const currentCount = stored?.ok ? stored.versions.length : 0
  const afterCount = currentCount + selectedRows.length
  const afterText = (stored?.ok ? stored.versions.reduce((sum, version) => sum + version.text.length, 0) : 0)
    + selectedRows.reduce((sum, row) => sum + row.version.text.length, 0)
  const limit = afterCount > WRITING_VERSION_LIMIT ? 'full' : afterText > WRITING_TOTAL_LIMIT ? 'totalLimit' : null

  const addSelected = async () => {
    if (!preview || !stored?.ok || disabled || busy || reading || limit || !selectedRows.length) return
    const token = ++generation.current
    setBusy(true)
    setError(null)
    setNotice(null)
    try {
      const outcome = await withWritingStorageLock(WRITING_VERSIONS_KEY, () => {
        if (token !== generation.current) return { status: 'cancelled' as const }
        const current = readWritingVersions(window.localStorage)
        if (!current.ok) return { status: 'error' as const, error: current.error === 'corrupt' ? 'corrupt' as const : 'unavailable' as const }
        if (current.raw !== preview.raw || current.raw !== stored.raw) return { status: 'error' as const, error: 'conflict' as const }
        const prepared = prepareWritingImport(current.versions, preview.versions, selected, () => crypto.randomUUID())
        if (!prepared.ok) return { status: 'error' as const, error: prepared.error }
        const written = writeWritingVersions(window.localStorage, current.raw, prepared.versions)
        if (!written.ok) return { status: 'error' as const, error: written.error === 'conflict' ? 'conflict' as const : written.error === 'corrupt' ? 'corrupt' as const : 'unavailable' as const }
        ownRaw.current = written.raw
        onCommitted(written)
        return { status: 'done' as const, added: prepared.added }
      })
      if (token !== generation.current) return
      if (outcome.status === 'error') setError(outcome.error)
      else if (outcome.status === 'done') {
        hasWork.current = false
        setAdded(outcome.added)
        setPreview(null)
        setSelected([])
        setNotice('imported')
      }
    } catch {
      if (token === generation.current) setError('unavailable')
    } finally {
      if (token === generation.current) setBusy(false)
    }
  }

  return (
    <section aria-labelledby="writing-backup-title" aria-busy={reading || busy} className="border-t border-line pt-5 space-y-4">
      <div>
        <h3 id="writing-backup-title" className="text-base font-semibold text-fg">{t('backup.title')}</h3>
        <p className="mt-1 text-sm text-sub">{t('backup.description')}</p>
        <p className="mt-2 text-xs text-muted">{t('backup.privacy')}</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <button type="button" disabled={disabled || busy || !stored?.ok || !stored.versions.length} onClick={exportFile}
          className="ui-btn-soft min-h-11 px-4 py-2 text-sm disabled:opacity-45">{t('backup.export')}</button>
        <label className={`ui-btn-soft min-h-11 px-4 py-2 text-sm cursor-pointer focus-within:outline focus-within:outline-2 focus-within:outline-primary ${disabled || busy ? 'opacity-45' : ''}`}>
          {t('backup.choose')}
          <input type="file" accept=".json,application/json" aria-label={t('backup.choose')} disabled={disabled || busy} className="sr-only"
            onChange={event => { const file = event.target.files?.[0]; event.target.value = ''; void choose(file) }} />
        </label>
        {(preview || reading || busy) && <button type="button" onClick={() => clear(true)} className="ui-btn-soft min-h-11 px-4 py-2 text-sm">{t('backup.cancel')}</button>}
      </div>
      {reading && <p role="status" className="text-sm text-sub">{t('backup.reading')}</p>}
      {error && <p role="alert" className="text-sm text-sub">{t(`backup.errors.${error}`)}</p>}
      {(error === 'conflict' || error === 'stale') && <button type="button" onClick={() => { clear(false); onRefresh() }} className="ui-btn-soft min-h-11 px-4 py-2 text-sm">{t('versions.refresh')}</button>}
      {notice && <p role="status" className="text-sm text-primary">{t(`backup.notices.${notice}`, { count: added })}</p>}
      {preview && (
        <div className="space-y-3">
          <p className="text-sm text-body [overflow-wrap:anywhere]">{t('backup.file', { name: preview.filename })}</p>
          <p className="text-xs text-muted">{t('backup.exportedAt', { date: new Date(preview.exportedAt).toLocaleString() })}</p>
          <p className="text-sm text-sub">{t('backup.counts', { current: currentCount, selected: selectedRows.length, after: afterCount, max: WRITING_VERSION_LIMIT })}</p>
          <p className="text-xs text-muted">{t('backup.conflictHint')}</p>
          {rows.length === 0 && <p className="text-sm text-muted">{t('backup.empty')}</p>}
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {rows.map(row => (
              <div key={row.version.id} className="bg-subtle rounded-2xl p-4 min-w-0 space-y-2">
                <label className="flex min-h-11 items-center gap-3 cursor-pointer">
                  <input type="checkbox" checked={selected.includes(row.version.id) && row.status !== 'duplicate'} disabled={busy || row.status === 'duplicate'}
                    onChange={event => setSelected(previous => event.target.checked ? [...previous, row.version.id] : previous.filter(id => id !== row.version.id))}
                    className="h-5 w-5 shrink-0 accent-primary" />
                  <span className="min-w-0 text-sm font-medium text-fg [overflow-wrap:anywhere]">{row.version.name}</span>
                </label>
                <p className="text-xs text-sub">{t(`backup.status.${row.status}`)}</p>
                <p className="text-xs text-muted [overflow-wrap:anywhere]">{t('backup.summary', {
                  title: row.version.title || t('versions.untitled'), count: row.version.text.length.toLocaleString(), tab: row.version.sourceTab,
                  basis: t(`target.basis.${row.version.basis}`), target: row.version.target.toLocaleString(),
                })}</p>
                <details>
                  <summary className="min-h-11 flex items-center text-xs text-body cursor-pointer">{t('backup.viewText')}</summary>
                  <pre className="max-h-40 overflow-y-auto whitespace-pre-wrap [overflow-wrap:anywhere] text-xs text-sub">{row.version.text}</pre>
                </details>
              </div>
            ))}
          </div>
          {limit && <p role="alert" className="text-sm text-sub">{t(`backup.errors.${limit}`)}</p>}
          <button type="button" disabled={disabled || busy || reading || !!limit || !selectedRows.length} onClick={() => void addSelected()}
            className="ui-btn min-h-11 px-4 py-2 text-sm disabled:opacity-45">{t('backup.add')}</button>
        </div>
      )}
    </section>
  )
}
