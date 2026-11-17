'use client'

import { useLayoutEffect, useRef, useState, type ChangeEvent } from 'react'
import { useTranslations } from '@/lib/i18n'
import '@/lib/i18n/ns/fontPreview'
import { useOptionalLanguage } from '@/contexts/LanguageContext'
import { appliedPairWeight, getPairFont } from '@/utils/fontPairing'
import { FONT_PAIR_PROFILE_LIMIT, FONT_PAIR_PROFILE_NAME_LIMIT, readFontPairProfiles, type FontPairProfilesSnapshot } from '@/utils/fontPairProfiles'
import { createFontPairBackup, createFontPairBackupReader, importFontPairBackup, inspectFontPairImport, type FontPairBackup, type FontPairBackupError } from '@/utils/fontPairBackup'
import { createShareResultDownloads } from '@/utils/shareResultActions'

type Ready = Extract<FontPairProfilesSnapshot, { status: 'ready' }>
type Preview = { backup: FontPairBackup; basis: Ready; filename: string }
type Choice = { sourceId: string; name: string; selected: boolean }
interface Props { snapshot: FontPairProfilesSnapshot | null; disabled: boolean; revision?: number; onImported: (snapshot: Ready) => void; onConflict: () => void }

export default function FontPairBackupPanel({ snapshot, disabled, revision = 0, onImported, onConflict }: Props) {
  const t = useTranslations('fontPreview'), language = useOptionalLanguage()?.language ?? 'ko'
  const [preview, setPreview] = useState<Preview | null>(null), [choices, setChoices] = useState<Choice[]>([])
  const [busy, setBusy] = useState<'read' | 'write' | null>(null), [error, setError] = useState<FontPairBackupError | 'downloadFailed' | null>(null)
  const [saved, setSaved] = useState<number | null>(null)
  const fileInput = useRef<HTMLInputElement>(null), chooseButton = useRef<HTMLButtonElement>(null)
  const active = useRef(false), generation = useRef(0), currentContext = useRef('')
  const reader = useRef<ReturnType<typeof createFontPairBackupReader> | null>(null), downloads = useRef<ReturnType<typeof createShareResultDownloads> | null>(null)
  const context = JSON.stringify([snapshot?.status, snapshot?.status === 'ready' ? snapshot.raw : null, disabled, revision, language])
  useLayoutEffect(() => {
    const source = createFontPairBackupReader(), output = createShareResultDownloads()
    reader.current = source; downloads.current = output; output.activate(); active.current = true
    const stop = () => { generation.current++; source.cancel() }
    const suspend = () => { stop(); setBusy(null) }
    const hidden = () => { if (document.visibilityState === 'hidden') suspend() }
    window.addEventListener('pagehide', suspend); document.addEventListener('visibilitychange', hidden)
    return () => { active.current = false; stop(); source.dispose(); output.dispose(); reader.current = null; downloads.current = null; window.removeEventListener('pagehide', suspend); document.removeEventListener('visibilitychange', hidden) }
  }, [])
  useLayoutEffect(() => {
    currentContext.current = context; const ticket = ++generation.current; reader.current?.cancel()
    queueMicrotask(() => { if (active.current && ticket === generation.current) setBusy(null) })
  }, [context])
  const current = (ticket: number) => active.current && generation.current === ticket && currentContext.current === context && document.visibilityState !== 'hidden'
  const blocked = disabled || snapshot?.status !== 'ready'
  const selected = choices.filter(choice => choice.selected).map(({ sourceId, name }) => ({ sourceId, name }))
  const stale = !!preview && (snapshot?.status !== 'ready' || snapshot.raw !== preview.basis.raw)
  const check = preview ? inspectFontPairImport(preview.basis, preview.backup, selected) : null
  const issues = check && !check.ok ? check.rows : []
  const cancel = () => {
    generation.current++; reader.current?.cancel(); setPreview(null); setChoices([]); setBusy(null); setError(null); setSaved(null)
    if (fileInput.current) fileInput.current.value = ''
    chooseButton.current?.focus({ preventScroll: true })
  }
  const read = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]; event.target.value = ''
    if (!file || blocked || !snapshot || snapshot.status !== 'ready' || !reader.current) return
    const ticket = ++generation.current, basis: Ready = { ...snapshot, profiles: [...snapshot.profiles] }
    setBusy('read'); setError(null); setSaved(null); setPreview(null); setChoices([])
    const result = await reader.current.read(file, () => current(ticket))
    if (!current(ticket) || !result) return
    setBusy(null)
    if (!result.ok) { setError(result.error); return }
    setPreview({ backup: result.backup, basis, filename: file.name })
    setChoices(result.backup.profiles.map(profile => ({ sourceId: profile.id, name: profile.name, selected: true })))
  }
  const save = async () => {
    if (blocked || stale || busy || !preview || !check?.ok) return
    const ticket = ++generation.current; setBusy('write'); setError(null); setSaved(null)
    const result = await importFontPairBackup(preview.basis, preview.backup, selected, {
      isCurrent: () => current(ticket),
      onConfirmed: next => {
        if (!current(ticket)) return
        setPreview(null); setChoices([]); setBusy(null); setSaved(selected.length)
        onImported(next)
      },
    })
    if (!current(ticket)) return
    setBusy(null)
    if (!result.ok && result.error !== 'cancelled') {
      setError(result.error)
      if (result.error === 'conflict' || result.error === 'unknownWrite') onConflict()
    }
  }
  const backup = () => {
    if (blocked || busy || snapshot?.status !== 'ready' || !downloads.current) return
    const ticket = ++generation.current, latest = readFontPairProfiles()
    setError(null); setSaved(null)
    if (latest.status !== 'ready') { setError(latest.status); return }
    if (latest.raw !== snapshot.raw) { setError('conflict'); onConflict(); return }
    const result = createFontPairBackup(latest)
    if (!result.ok) { setError(result.error); return }
    try {
      if (downloads.current.download(new Blob([result.text], { type: 'application/json;charset=utf-8' }), 'toolhub-font-pair-profiles.json', () => current(ticket)) === 'failed') setError('downloadFailed')
    } catch { setError('downloadFailed') }
  }
  const edit = (id: string, patch: Partial<Pick<Choice, 'name' | 'selected'>>) => {
    if (busy === 'write') return
    generation.current++; setSaved(null); setError(null)
    setChoices(current => current.map(choice => choice.sourceId === id ? { ...choice, ...patch } : choice))
  }
  return <section data-font-pair-backup="" aria-labelledby="font-pair-backup-title" className="min-w-0 space-y-3 border-t border-line pt-4">
    <h3 id="font-pair-backup-title" className="text-base font-semibold text-fg">{t('pairing.backup.title')}</h3>
    <p className="text-sm text-sub">{t('pairing.backup.description')}</p>
    <div className="flex flex-wrap gap-2">
      <button type="button" data-font-pair-backup-download="" onClick={backup} disabled={blocked || !!busy || !snapshot || snapshot.status !== 'ready' || snapshot.profiles.length === 0} className="ui-btn-soft min-h-11 px-3 py-2 text-sm disabled:opacity-50">{t('pairing.backup.download')}</button>
      <button type="button" ref={chooseButton} data-font-pair-backup-choose="" onClick={() => fileInput.current?.click()} disabled={blocked || busy === 'write'} className="ui-btn-soft min-h-11 px-3 py-2 text-sm disabled:opacity-50">{t('pairing.backup.choose')}</button>
      <input ref={fileInput} type="file" accept=".json,application/json" aria-label={t('pairing.backup.choose')} className="hidden" data-font-pair-backup-file="" onChange={event => { void read(event) }} />
    </div>
    {busy === 'read' && <p role="status" className="text-sm text-sub">{t('pairing.backup.reading')}</p>}
    {error && <p role="alert" data-font-pair-backup-error={error} className="text-sm text-body">{t(`pairing.backup.errors.${error}`)}</p>}
    {saved !== null && <p role="status" data-font-pair-backup-saved="" className="text-sm text-primary">{t('pairing.backup.saved', { count: saved })}</p>}
    {preview && <div data-font-pair-backup-preview="" className="min-w-0 space-y-3">
      <p className="text-sm text-body [overflow-wrap:anywhere]">{t('pairing.backup.preview', { name: preview.filename, count: preview.backup.profiles.length })}</p>
      <p className="text-xs text-sub">{t('pairing.backup.slots', { selected: selected.length, available: FONT_PAIR_PROFILE_LIMIT - preview.basis.profiles.length })}</p>
      {stale && <p role="alert" className="text-sm text-body">{t('pairing.backup.errors.conflict')}</p>}
      {!preview.backup.profiles.length && <p className="text-sm text-sub">{t('pairing.backup.empty')}</p>}
      <ul className="space-y-3">{preview.backup.profiles.map(profile => {
        const choice = choices.find(item => item.sourceId === profile.id), issue = issues.find(item => item.sourceId === profile.id)
        return <li key={profile.id} data-font-pair-backup-row={profile.id} className="min-w-0 rounded-xl bg-subtle p-3">
          <label className="flex min-h-11 items-center gap-2 text-sm text-body"><input type="checkbox" checked={!!choice?.selected} disabled={blocked || !!busy || stale} onChange={event => edit(profile.id, { selected: event.target.checked })} className="size-5 shrink-0 accent-primary" /><span className="[overflow-wrap:anywhere]">{t('pairing.backup.select', { name: profile.name })}</span></label>
          <label className="mt-2 block text-sm text-body">{t('pairing.backup.name')}<input value={choice?.name ?? ''} onChange={event => edit(profile.id, { name: event.target.value })} disabled={blocked || !!busy || stale || !choice?.selected} maxLength={FONT_PAIR_PROFILE_NAME_LIMIT} autoComplete="off" aria-invalid={!!issue} className="ui-field mt-2 min-h-11 w-full min-w-0 px-3 py-2 text-base" /></label>
          {issue && <p role="alert" className="mt-2 text-sm text-body">{t(`pairing.backup.errors.${issue.error}`)}</p>}
          {(['title', 'body'] as const).map(role => <p key={role} className="mt-2 text-xs text-sub [overflow-wrap:anywhere]">{t('pairing.backup.style', { role: t(`pairing.roles.${role}`), font: getPairFont(profile.styles[role].fontId).name, size: profile.styles[role].size, requested: profile.styles[role].weight, applied: appliedPairWeight({ ...profile.styles[role], text: '' }) })}</p>)}
        </li>
      })}</ul>
      {check && !check.ok && !issues.length && <p role="status" className="text-sm text-body">{t(`pairing.backup.errors.${check.error}`)}</p>}
      <button type="button" data-font-pair-backup-confirm="" disabled={blocked || !!busy || stale || !check?.ok} onClick={() => { void save() }} className="ui-btn min-h-11 w-full px-3 py-3 text-sm disabled:opacity-50">{t(busy === 'write' ? 'pairing.backup.saving' : 'pairing.backup.confirm', { count: selected.length })}</button>
      <p className="text-xs text-muted">{t('pairing.backup.keepText')}</p>
    </div>}
    {(preview || busy) && <button type="button" data-font-pair-backup-cancel="" onClick={cancel} className="ui-btn-soft min-h-11 px-3 py-2 text-sm">{t('pairing.backup.cancel')}</button>}
    <p className="text-xs text-muted">{t('pairing.backup.limit')}</p>
  </section>
}
