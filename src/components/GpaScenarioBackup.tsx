'use client'

import { useEffect, useRef, useState } from 'react'
import { useTranslations } from '@/lib/i18n'
import '@/lib/i18n/ns/gpaCalculator'
import { GPA_SCENARIOS_KEY, GPA_SCENARIO_LIMIT, gpaStorageError, withGpaStorageLock, writeGpaScenarios, type GpaReadResult } from '@/utils/gpaScenarios'
import { GPA_BACKUP_MAX_BYTES, mergeGpaScenarioBackup, parseGpaScenarioBackup, previewGpaScenarioBackup, serializeGpaScenarioBackup, type GpaScenarioBackup as Backup } from '@/utils/gpaScenarioBackup'

type Preview = { backup: Backup; expectedRaw: string | null; filename: string }

export default function GpaScenarioBackup({ view, disabled, onCommitted }: {
  view: GpaReadResult | null
  disabled: boolean
  onCommitted: (result: Extract<GpaReadResult, { ok: true }>) => void
}) {
  const t = useTranslations('gpaCalculator')
  const [preview, setPreview] = useState<Preview | null>(null)
  const [selected, setSelected] = useState<string[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const input = useRef<HTMLInputElement>(null)
  const generation = useRef(0)
  const hasPreviewWork = useRef(false)
  const currentRaw = view?.ok ? view.raw : undefined
  const previousRaw = useRef(currentRaw)

  useEffect(() => {
    if (previousRaw.current !== currentRaw) {
      previousRaw.current = currentRaw
      const token = ++generation.current
      const hadWork = hasPreviewWork.current
      hasPreviewWork.current = false
      queueMicrotask(() => {
        if (token !== generation.current) return
        setPreview(null); setSelected([]); setBusy(false)
        if (hadWork) { setError('stale'); setNotice('') }
      })
    }
  }, [currentRaw])

  useEffect(() => {
    const requestGeneration = generation
    const invalidate = () => {
      if (!hasPreviewWork.current) return
      generation.current++
      hasPreviewWork.current = false
      setPreview(null); setSelected([]); setBusy(false); setNotice(''); setError('stale')
    }
    const storageChanged = (event: StorageEvent) => { if (event.key === GPA_SCENARIOS_KEY || event.key === null) invalidate() }
    const visibilityChanged = () => { if (document.visibilityState === 'hidden') invalidate() }
    window.addEventListener('storage', storageChanged)
    document.addEventListener('visibilitychange', visibilityChanged)
    return () => { requestGeneration.current++; window.removeEventListener('storage', storageChanged); document.removeEventListener('visibilitychange', visibilityChanged) }
  }, [])

  const available = !!view?.ok && !disabled && !busy
  const validPreview = view?.ok && preview?.expectedRaw === view.raw ? preview : null
  const items = view?.ok && validPreview ? previewGpaScenarioBackup(view.store, validPreview.backup) : []
  const selectedCount = selected.length
  const resultingCount = (view?.ok ? view.store.scenarios.length : 0) + selectedCount
  const errorCode = (cause: unknown) => {
    const code = cause instanceof Error ? cause.message : ''
    return ['invalidFile', 'fileTooLarge', 'unsupported', 'selection', 'limit', 'stale', 'download'].includes(code) ? code : gpaStorageError(cause)
  }

  function cancel() {
    generation.current++
    hasPreviewWork.current = false
    setPreview(null); setSelected([]); setError(''); setNotice(''); setBusy(false)
    if (input.current) input.current.value = ''
  }

  async function readFile(file: File | undefined) {
    const token = ++generation.current
    hasPreviewWork.current = false
    setPreview(null); setSelected([]); setError(''); setNotice(''); setBusy(false)
    if (!file || !view?.ok || disabled) return
    const expected = view
    hasPreviewWork.current = true
    setBusy(true)
    try {
      if (file.size > GPA_BACKUP_MAX_BYTES) throw new Error('fileTooLarge')
      const raw = await file.text()
      if (token !== generation.current) return
      const backup = parseGpaScenarioBackup(raw)
      if (localStorage.getItem(GPA_SCENARIOS_KEY) !== expected.raw) throw new Error('stale')
      const nextItems = previewGpaScenarioBackup(expected.store, backup)
      setPreview({ backup, expectedRaw: expected.raw, filename: file.name })
      setSelected(nextItems.filter(item => item.status === 'new').map(item => item.scenario.id))
    } catch (cause) { if (token === generation.current) { hasPreviewWork.current = false; setError(errorCode(cause)) } }
    finally { if (token === generation.current) setBusy(false) }
  }

  function download() {
    if (!available || !view?.ok) return
    setError(''); setNotice('')
    let url: string | null = null
    let anchor: HTMLAnchorElement | null = null
    try {
      if (localStorage.getItem(GPA_SCENARIOS_KEY) !== view.raw) throw new Error('stale')
      const raw = serializeGpaScenarioBackup(view.store)
      url = URL.createObjectURL(new Blob([raw], { type: 'application/json;charset=utf-8' }))
      anchor = document.createElement('a')
      anchor.href = url; anchor.download = `toolhub-gpa-scenarios-${new Date().toISOString().slice(0, 10)}.json`
      document.body.appendChild(anchor); anchor.click()
      setNotice(t('scenarioBackup.downloaded', { count: view.store.scenarios.length }))
    } catch (cause) { setError(errorCode(cause) === 'unavailable' ? 'download' : errorCode(cause)) }
    finally { anchor?.remove(); if (url) { const objectUrl = url; setTimeout(() => URL.revokeObjectURL(objectUrl), 1000) } }
  }

  async function addSelected() {
    if (!available || !view?.ok || !validPreview) return
    const token = generation.current
    const expected = view
    const importPreview = validPreview
    const selection = [...selected]
    setBusy(true); setError(''); setNotice('')
    try {
      await withGpaStorageLock(GPA_SCENARIOS_KEY, () => {
        if (token !== generation.current || localStorage.getItem(GPA_SCENARIOS_KEY) !== expected.raw) throw new Error('stale')
        const next = mergeGpaScenarioBackup(expected.store, importPreview.backup, selection, () => crypto.randomUUID())
        const result = writeGpaScenarios(localStorage, expected.raw, next)
        if (!result.ok) throw new Error(result.error)
        onCommitted({ ok: true, raw: result.raw, store: next })
        hasPreviewWork.current = false
        setPreview(null); setSelected([])
        if (input.current) input.current.value = ''
        setNotice(t('scenarioBackup.added', { count: selection.length }))
      })
    } catch (cause) {
      if (token !== generation.current) return
      const code = cause instanceof Error ? cause.message : ''
      setError(['conflict', 'quota', 'corrupt', 'unavailable'].includes(code) ? code : errorCode(cause))
      if (code === 'stale' || code === 'conflict') { setPreview(null); setSelected([]) }
    } finally { if (token === generation.current) setBusy(false) }
  }

  return (
    <section className="mt-6 min-w-0 border-t border-line pt-5" aria-labelledby="gpa-backup-title">
      <h3 id="gpa-backup-title" className="font-semibold text-fg">{t('scenarioBackup.title')}</h3>
      <p className="mt-2 text-sm text-sub">{t('scenarioBackup.description')}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" disabled={!available} onClick={download} className="ui-btn-soft min-h-11 px-4 py-2 text-sm disabled:opacity-50">{t('scenarioBackup.download')}</button>
        <label className="ui-btn-soft flex min-h-11 cursor-pointer items-center px-4 py-2 text-sm">
          {t('scenarioBackup.chooseFile')}
          <input ref={input} type="file" accept=".json,application/json" aria-label={t('scenarioBackup.chooseFile')} disabled={!view?.ok || disabled} className="sr-only" onChange={event => { const file = event.currentTarget.files?.[0]; event.currentTarget.value = ''; void readFile(file) }} />
        </label>
        {(preview || busy) && <button type="button" onClick={cancel} className="ui-btn-soft min-h-11 px-4 py-2 text-sm">{t('scenarioBackup.cancel')}</button>}
      </div>
      <p className="mt-2 text-xs text-muted">{t('scenarioBackup.limit', { max: GPA_SCENARIO_LIMIT })}</p>
      {busy && <p role="status" className="mt-2 text-sm text-sub">{t('scenarioBackup.working')}</p>}
      {validPreview && (
        <div className="mt-4 space-y-3">
          <p className="break-all text-sm text-body">{t('scenarioBackup.preview', { name: validPreview.filename })}</p>
          {!items.length && <p className="text-sm text-sub">{t('scenarioBackup.empty')}</p>}
          <div className="space-y-2" role="group" aria-label={t('scenarioBackup.selectItems')}>
            {items.map(({ scenario, status }) => (
              <label key={scenario.id} className="flex min-h-11 items-start gap-3 rounded-xl border border-line bg-subtle p-3">
                <input type="checkbox" checked={selected.includes(scenario.id)} disabled={status === 'duplicate' || !available} onChange={event => setSelected(prev => event.target.checked ? [...prev, scenario.id] : prev.filter(id => id !== scenario.id))} className="mt-1 h-5 w-5 shrink-0 accent-primary" />
                <span className="min-w-0 text-sm"><span className="block break-words font-medium text-fg">{scenario.name}</span><span className="mt-1 block text-sub">{t('scenarioBackup.summary', { scale: scenario.snapshot.scale, semesters: scenario.snapshot.semesters.length, courses: scenario.snapshot.semesters.reduce((total, semester) => total + semester.courses.length, 0) })}</span><span className="mt-1 block text-sub">{t(`scenarioBackup.status.${status}`)}</span></span>
              </label>
            ))}
          </div>
          <p className="text-sm text-sub tabular-nums">{t('scenarioBackup.count', { existing: view?.ok ? view.store.scenarios.length : 0, selected: selectedCount, total: resultingCount, max: GPA_SCENARIO_LIMIT })}</p>
          {resultingCount > GPA_SCENARIO_LIMIT && <p role="alert" className="text-sm text-sub">{t('scenarioBackup.errors.limit')}</p>}
          <button type="button" onClick={addSelected} disabled={!available || !selectedCount || resultingCount > GPA_SCENARIO_LIMIT} className="ui-btn min-h-11 px-4 py-2 text-sm disabled:opacity-50">{t('scenarioBackup.add')}</button>
        </div>
      )}
      {error && <p role="alert" className="mt-3 text-sm text-sub">{t(`scenarioBackup.errors.${error}`)}</p>}
      {notice && <p role="status" className="mt-3 text-sm text-sub">{notice}</p>}
    </section>
  )
}
