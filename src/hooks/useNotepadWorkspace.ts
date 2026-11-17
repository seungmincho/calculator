'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { DEFAULT_SETTINGS, SETTINGS_KEY, STORAGE_KEY, newId, type Note, type Settings } from '@/utils/notepad'
import { createNotepadDraft } from '@/utils/notepadDraft'
import { createNotepadImporter, mergeImportedNotes, type NotepadImportFile, type NotepadImportReport } from '@/utils/notepadImport'
import { commitNotepadSettings, readNotepadSettings, type NotepadError, type NotepadRead } from '@/utils/notepadPersistence'

const storage = { getItem: (key: string) => localStorage.getItem(key), setItem: (key: string, value: string) => localStorage.setItem(key, value) }
export interface NotepadImportSummary { added: number; conflicts: number; duplicates: number; failures: NotepadImportReport['failures']; undoToken: number | null; scope: number }

/** Browser lifetime only; draft/storage/import decisions stay in the independently tested ports. */
export function useNotepadWorkspace() {
  const [controller] = useState(() => createNotepadDraft({ storage, onChange: next => setView(next) }))
  const [view, setView] = useState(() => controller.snapshot())
  const [importer] = useState(() => createNotepadImporter())
  const [importStatus, setImportStatus] = useState<'idle' | 'reading' | 'cancelled' | 'complete'>('idle')
  const [importSummary, setImportSummary] = useState<NotepadImportSummary | null>(null)
  const [settings, setSettings] = useState<Settings>({ ...DEFAULT_SETTINGS })
  const [settingsError, setSettingsError] = useState<NotepadError | undefined>()
  const [downloadFailed, setDownloadFailed] = useState(false)
  const life = useRef({ active: false, importRequest: 0, reading: false })
  const settingsControl = useRef({ initialized: false, value: { ...DEFAULT_SETTINGS }, basis: { ok: false, error: 'unavailable' } as NotepadRead<Settings>, revision: 0, pending: null as AbortController | null, blocked: true })
  const urls = useRef(new Map<string, ReturnType<typeof setTimeout>>())
  const cancelImport = useCallback(() => {
    life.current.importRequest++; importer.cancel()
    if (life.current.reading) { life.current.reading = false; if (life.current.active) setImportStatus('cancelled') }
  }, [importer])
  useEffect(() => {
    const ownedLife = life.current, setting = settingsControl.current, ownedUrls = urls.current
    ownedLife.active = true; controller.activate(); importer.activate()
    const initial = setTimeout(() => {
      if (!ownedLife.active) return
      if (!controller.snapshot().ready) {
        const now = Date.now(), result = controller.initialize({ id: newId(), title: '', content: '', createdAt: now, updatedAt: now })
        const latest = [...result.notes].sort((a, b) => Number(!!b.pinned) - Number(!!a.pinned) || b.updatedAt - a.updatedAt)[0]
        if (latest) controller.select(latest.id)
      }
      if (!setting.initialized) {
        setting.initialized = true; setting.basis = readNotepadSettings(storage); setting.blocked = !setting.basis.ok
        if (setting.basis.ok) { setting.value = setting.basis.value; setSettings(setting.value) }
        else setSettingsError(setting.basis.error)
      }
    }, 0)
    const invalidateSettings = () => { setting.revision++; setting.pending?.abort(); setting.pending = null }
    const onStorage = (event: StorageEvent) => {
      if (!ownedLife.active) return
      if (event.key === STORAGE_KEY || event.key === null) {
        const before = controller.snapshot().scope; controller.externalChange()
        if (controller.snapshot().scope !== before) cancelImport()
      }
      if (event.key === SETTINGS_KEY || event.key === null) {
        const read = readNotepadSettings(storage)
        if (!read.ok || !setting.basis.ok || read.raw !== setting.basis.raw) { invalidateSettings(); setting.blocked = true; setSettingsError(read.ok ? 'conflict' : read.error) }
      }
    }
    const hidden = () => { if (document.visibilityState === 'hidden') { cancelImport(); controller.hide() } }
    const pagehide = () => { cancelImport(); controller.pagehide(); ownedLife.active = false; importer.dispose(); invalidateSettings() }
    const pageshow = () => { ownedLife.active = true; importer.activate(); controller.pageshow() }
    window.addEventListener('storage', onStorage); window.addEventListener('pagehide', pagehide); window.addEventListener('pageshow', pageshow); document.addEventListener('visibilitychange', hidden)
    return () => {
      clearTimeout(initial); cancelImport(); ownedLife.active = false; controller.dispose(); importer.dispose(); invalidateSettings()
      for (const [url, timer] of ownedUrls) { clearTimeout(timer); URL.revokeObjectURL(url) } ownedUrls.clear()
      window.removeEventListener('storage', onStorage); window.removeEventListener('pagehide', pagehide); window.removeEventListener('pageshow', pageshow); document.removeEventListener('visibilitychange', hidden)
    }
  }, [controller, importer, cancelImport])
  const edit = useCallback((next: readonly Note[], selected: string | null, undoable = false) => {
    if (!life.current.active || !controller.snapshot().ready) return false
    cancelImport(); setImportSummary(null); setDownloadFailed(false)
    return undoable ? controller.editUndoable(next, selected) : controller.edit(next, selected)
  }, [controller, cancelImport])
  const importFiles = async (files: readonly NotepadImportFile[]): Promise<NotepadImportSummary | null> => {
    if (!life.current.active || !controller.snapshot().ready || !files.length) return null
    cancelImport()
    const request = ++life.current.importRequest, scope = controller.snapshot().scope
    const current = () => life.current.active && request === life.current.importRequest && scope === controller.snapshot().scope
    life.current.reading = true; setImportStatus('reading'); setImportSummary(null)
    const report = await importer.read(files, current)
    if (!report || !current()) return null
    life.current.reading = false
    const before = controller.snapshot(), merged = mergeImportedNotes(before.notes, report.notes)
    const changed = controller.editUndoable(merged.notes, before.activeId)
    const result = { added: merged.added, conflicts: merged.conflicts, duplicates: merged.duplicates, failures: report.failures, undoToken: changed ? controller.snapshot().undoToken : null, scope: controller.snapshot().scope }
    setImportSummary(result); setImportStatus('complete'); return result
  }
  const saveSettings = async (value: Settings, retry = false) => {
    const control = settingsControl.current
    if (!life.current.active || !control.initialized) return
    control.revision++; control.pending?.abort(); control.pending = null
    if (retry) { control.basis = readNotepadSettings(storage); control.blocked = !control.basis.ok }
    control.value = { ...value }; setSettings(control.value)
    if (!control.basis.ok || control.blocked) { setSettingsError(control.basis.ok ? 'conflict' : control.basis.error); return }
    const request = control.revision, signal = new AbortController(); control.pending = signal
    const current = () => life.current.active && request === control.revision && !signal.signal.aborted
    const result = await commitNotepadSettings(control.basis.raw, control.value, { storage, signal: signal.signal, current, onConfirmed: confirmed => { control.basis = confirmed; control.blocked = false } })
    if (!current()) return
    control.pending = null
    if (result.ok) setSettingsError(undefined)
    else if (result.error !== 'cancelled') { control.blocked = true; setSettingsError(result.error) }
  }
  const download = useCallback((name: string, text: string, mime: string) => {
    if (!life.current.active || !controller.snapshot().ready) return
    let url: string | null = null
    try {
      url = URL.createObjectURL(new Blob([text], { type: mime }))
      const link = document.createElement('a'); link.href = url; link.download = name
      try { document.body.appendChild(link); link.click() } finally { link.remove() }
      const owned = url
      const timer = setTimeout(() => { if (urls.current.get(owned) === timer) { urls.current.delete(owned); URL.revokeObjectURL(owned) } }, 1000)
      urls.current.set(owned, timer); setDownloadFailed(false)
    } catch { if (url) URL.revokeObjectURL(url); setDownloadFailed(true) }
  }, [controller])
  return {
    view, controller, edit, settings, settingsError, importStatus, importSummary, importFiles, cancelImport, download, downloadFailed,
    editSettings: (patch: Partial<Settings>) => saveSettings({ ...settingsControl.current.value, ...patch }),
    retrySettings: () => saveSettings(settingsControl.current.value, true),
    recheck() { cancelImport(); controller.recheckExternal() },
    retry() { cancelImport(); return controller.retry() },
    keepBoth(scope: number, raw: string | null) { cancelImport(); return controller.applyMergedExternal(scope, raw) },
    undo(token: number) { cancelImport(); return controller.undo(token) },
  }
}
