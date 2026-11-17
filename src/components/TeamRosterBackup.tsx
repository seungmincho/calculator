'use client'

import { useEffect, useRef, useState } from 'react'
import { useTranslations } from '@/lib/i18n'
import '@/lib/i18n/ns/teamDivider'
import { TEAM_ROSTERS_KEY, MAX_TEAM_ROSTERS, teamRosterStorageError, withTeamRosterLock, writeTeamRosters, type TeamRosterRead } from '@/utils/teamRosters'
import { TEAM_ROSTER_BACKUP_MAX_BYTES, appendSelectedTeamRosters, exportTeamRosterBackup, parseTeamRosterBackup, previewTeamRosterImport, type TeamRosterImportRow } from '@/utils/teamRosterBackup'

export default function TeamRosterBackup({ view, disabled, onImported }: {
  view: TeamRosterRead | null
  disabled: boolean
  onImported: (next: Extract<TeamRosterRead, { ok: true }>) => void
}) {
  const t = useTranslations('teamDivider')
  const [preview, setPreview] = useState<{ rows: TeamRosterImportRow[]; raw: string | null; filename: string } | null>(null)
  const [selected, setSelected] = useState<string[]>([])
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [reading, setReading] = useState(false)
  const [busy, setBusy] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const fileRequest = useRef(0)
  const busyRef = useRef(false)
  const readingRef = useRef(false)
  const available = !!view?.ok && !disabled && !busy
  const existingCount = view?.ok ? view.rosters.length : 0

  useEffect(() => {
    fileRequest.current++
    setPreview(null); setSelected([]); setReading(false)
  }, [view, disabled])
  useEffect(() => () => { fileRequest.current++ }, [])
  useEffect(() => {
    const changed = () => {
      if (document.visibilityState !== 'hidden' || !readingRef.current) return
      fileRequest.current++; readingRef.current = false; setReading(false); setPreview(null); setSelected([])
    }
    document.addEventListener('visibilitychange', changed)
    return () => document.removeEventListener('visibilitychange', changed)
  }, [])

  const clear = () => {
    fileRequest.current++; readingRef.current = false; setPreview(null); setSelected([]); setReading(false); setError(''); setNotice('')
    if (fileRef.current) fileRef.current.value = ''
  }
  const errorCode = (cause: unknown) => {
    const code = cause instanceof Error ? cause.message : ''
    return ['tooLarge', 'wrongFormat', 'unsupported', 'corrupt', 'limit', 'emptySelection', 'invalid', 'conflict'].includes(code) ? code : teamRosterStorageError(cause)
  }

  const readFile = async (file: File | undefined) => {
    if (!file || !view?.ok || !available || busyRef.current) return
    const request = ++fileRequest.current
    const expectedRaw = view.raw
    setPreview(null); setSelected([]); setError(''); setNotice(''); setReading(true); readingRef.current = true
    try {
      if (file.size > TEAM_ROSTER_BACKUP_MAX_BYTES) throw new Error('tooLarge')
      const text = await file.text()
      if (request !== fileRequest.current) return
      if (window.localStorage.getItem(TEAM_ROSTERS_KEY) !== expectedRaw) throw new Error('conflict')
      const backup = parseTeamRosterBackup(text)
      const rows = previewTeamRosterImport(view.rosters, backup.rosters, number => t('backup.copySuffix', { number }), () => crypto.randomUUID())
      setPreview({ rows, raw: expectedRaw, filename: file.name })
      setSelected(rows.filter(row => row.status === 'new').map(row => row.sourceId))
    } catch (cause) { if (request === fileRequest.current) setError(errorCode(cause)) }
    finally { if (request === fileRequest.current) { setReading(false); readingRef.current = false } }
  }

  const download = async () => {
    if (!view?.ok || !available || busyRef.current || !view.rosters.length) return
    const expected = view
    busyRef.current = true; setBusy(true); setError(''); setNotice('')
    let url: string | null = null
    try {
      const text = await withTeamRosterLock(() => {
        if (window.localStorage.getItem(TEAM_ROSTERS_KEY) !== expected.raw) throw new Error('conflict')
        return exportTeamRosterBackup(expected.rosters, new Date().toISOString())
      })
      url = URL.createObjectURL(new Blob([text], { type: 'application/json;charset=utf-8' }))
      const anchor = document.createElement('a')
      anchor.href = url; anchor.download = `toolhub-team-rosters-${new Date().toISOString().slice(0, 10)}.json`
      document.body.appendChild(anchor); anchor.click(); anchor.remove()
      setNotice(t('backup.downloaded'))
    } catch (cause) { setError(errorCode(cause)) }
    finally { if (url) { const objectUrl = url; setTimeout(() => URL.revokeObjectURL(objectUrl), 1000) }; busyRef.current = false; setBusy(false) }
  }

  const applyImport = async () => {
    if (!view?.ok || !preview || !available || busyRef.current) return
    const expected = view
    const pending = preview
    const request = fileRequest.current
    busyRef.current = true; setBusy(true); setError(''); setNotice('')
    try {
      await withTeamRosterLock(() => {
        if (request !== fileRequest.current || pending.raw !== expected.raw) throw new Error('conflict')
        const next = appendSelectedTeamRosters(expected.rosters, pending.rows, selected)
        const result = writeTeamRosters(next, expected.raw, window.localStorage)
        if (!result.ok) { setError(result.error); return }
        setPreview(null); setSelected([])
        onImported({ ok: true, raw: result.raw, rosters: result.rosters })
        setNotice(t('backup.imported', { count: selected.length }))
        if (fileRef.current) fileRef.current.value = ''
      })
    } catch (cause) { setError(errorCode(cause)) }
    finally { busyRef.current = false; setBusy(false) }
  }

  return (
    <section data-team-roster-backup className="border-t border-line pt-3 space-y-3" aria-labelledby="team-roster-backup-title">
      <h3 id="team-roster-backup-title" className="text-sm font-semibold text-fg">{t('backup.title')}</h3>
      <p className="text-xs text-muted">{t('backup.description')}</p>
      <button type="button" onClick={download} disabled={!available || !existingCount} className="ui-btn-soft min-h-11 w-full px-3 py-2 text-sm disabled:opacity-40">{t('backup.download')}</button>
      <label className="block text-sm text-body">{t('backup.file')}
        <input ref={fileRef} type="file" accept=".json,application/json" disabled={!available} onChange={event => readFile(event.target.files?.[0])} className="mt-1 block min-h-11 w-full min-w-0 max-w-full text-base text-body file:mr-2 file:min-h-11 file:rounded-xl file:border-0 file:bg-soft file:px-3 file:text-body" />
      </label>
      {(reading || preview) && <button type="button" onClick={clear} disabled={busy} className="ui-btn-soft min-h-11 px-3 py-2 text-sm">{t('backup.cancel')}</button>}
      {reading && <p role="status" className="text-sm text-sub">{t('backup.reading')}</p>}
      {preview && <div className="rounded-xl bg-subtle p-3 space-y-3">
        <p className="break-all text-sm font-semibold text-fg">{t('backup.preview', { name: preview.filename })}</p>
        <p className="text-xs text-muted">{t('backup.previewHint')}</p>
        {!preview.rows.length && <p className="text-sm text-body">{t('backup.emptyFile')}</p>}
        {preview.rows.map(row => <label key={row.sourceId} className="flex min-h-11 items-start gap-2 rounded-xl border border-line bg-surface p-3">
          <input type="checkbox" checked={selected.includes(row.sourceId)} disabled={row.status === 'duplicate' || busy} onChange={event => setSelected(previous => event.target.checked ? [...previous, row.sourceId] : previous.filter(id => id !== row.sourceId))} aria-label={t('backup.select', { name: row.roster.title })} className="mt-1 h-5 w-5 shrink-0 accent-primary" />
          <span className="min-w-0 space-y-1">
            <span className="block break-all text-sm font-semibold text-fg">{row.roster.title}</span>
            {row.sourceTitle !== row.roster.title && <span className="block break-all text-xs text-muted">{t('backup.originalTitle', { title: row.sourceTitle })}</span>}
            <span className="block text-xs text-sub">{t('backup.summary', { members: row.roster.names.length, teams: row.roster.teamCount, mode: t(`mode.${row.roster.mode}`) })}</span>
            <span className="block text-xs text-sub">{t(`backup.status.${row.status}`)}</span>
          </span>
        </label>)}
        <p className="text-sm text-body tabular-nums">{t('backup.counts', { current: existingCount, selected: selected.length, total: existingCount + selected.length, max: MAX_TEAM_ROSTERS })}</p>
        {existingCount + selected.length > MAX_TEAM_ROSTERS && <p role="alert" className="text-sm text-body">{t('backup.errors.limit')}</p>}
        <button type="button" onClick={applyImport} disabled={!available || !selected.length || existingCount + selected.length > MAX_TEAM_ROSTERS} className="ui-btn min-h-11 w-full px-3 py-2 text-sm disabled:opacity-40">{t('backup.apply')}</button>
      </div>}
      {error && <p role="alert" className="text-sm text-body">{t(`backup.errors.${error}`)}</p>}
      {notice && <p role="status" className="text-sm text-sub">{notice}</p>}
    </section>
  )
}
