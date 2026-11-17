'use client'

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useTranslations } from '@/lib/i18n'
import '@/lib/i18n/ns/gradeCalc'
import {
  GRADE_RECORDS_KEY, GRADE_RECORD_LIMITS, appendGradeSavedRecord, gradeRecordStorageError,
  isGradeRecordSnapshot, readGradeSavedRecords, removeGradeSavedRecord, summarizeGradeRecord,
  withGradeRecordLock, writeGradeSavedRecords,
  type GradeRecordError, type GradeRecordRead, type GradeRecordSnapshot,
} from '@/utils/gradeSavedRecords'

export default function GradeSavedRecords({ current, ready, onRestore }: {
  current: GradeRecordSnapshot
  ready: boolean
  onRestore: (snapshot: GradeRecordSnapshot) => void
}) {
  const t = useTranslations('gradeCalc')
  const [view, setView] = useState<GradeRecordRead | null>(null)
  const [name, setName] = useState('')
  const [selectedId, setSelectedId] = useState('')
  const [confirm, setConfirm] = useState<'load' | 'delete' | null>(null)
  const [error, setError] = useState<GradeRecordError | null>(null)
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)
  const busyRef = useRef(false)
  const mountedRef = useRef(false)
  const pendingRef = useRef<AbortController | null>(null)
  const inputSignature = JSON.stringify(current)
  const latestRef = useRef({ inputSignature, ready, selectedId })

  useLayoutEffect(() => { latestRef.current = { inputSignature, ready, selectedId } }, [inputSignature, ready, selectedId])
  useEffect(() => {
    mountedRef.current = true
    return () => { mountedRef.current = false; pendingRef.current?.abort() }
  }, [])

  const refresh = useCallback(() => {
    try { setView(readGradeSavedRecords(window.localStorage)) }
    catch (cause) { setView({ ok: false, error: gradeRecordStorageError(cause) }) }
    setSelectedId(''); setConfirm(null); setError(null); setNotice('')
  }, [])

  useEffect(() => {
    refresh()
    const changed = (event: StorageEvent) => {
      if (event.key !== GRADE_RECORDS_KEY && event.key !== null) return
      setError('conflict'); setConfirm(null); setNotice('')
    }
    window.addEventListener('storage', changed)
    return () => window.removeEventListener('storage', changed)
  }, [refresh])

  const records = view?.ok ? view.store.records : []
  const selected = records.find(record => record.id === selectedId)
  const issue = view && !view.ok ? view.error : error
  const needsRefresh = !!error && ['conflict', 'unconfirmed', 'unavailable', 'quota'].includes(error)
  const canManage = ready && !!view?.ok && !needsRefresh && !busy
  const currentValid = isGradeRecordSnapshot(current)

  async function act(action: 'save' | 'load' | 'delete') {
    if (!canManage || !view?.ok || busyRef.current || (action === 'save' ? !name.trim() || !currentValid : !selected)) return
    const expected = view
    const target = selected
    const controller = new AbortController()
    pendingRef.current = controller
    busyRef.current = true; setBusy(true); setNotice('')
    try {
      await withGradeRecordLock(() => {
        if (!mountedRef.current || controller.signal.aborted) return
        const latest = latestRef.current
        if (!latest.ready || (action === 'load' && (latest.inputSignature !== inputSignature || latest.selectedId !== target?.id))) { setError('changed'); return }
        const storage = window.localStorage
        if (storage.getItem(GRADE_RECORDS_KEY) !== expected.raw) { setError('conflict'); return }
        if (action === 'load' && target) {
          onRestore(structuredClone(target.snapshot))
          setNotice(t('records.loaded', { name: target.name })); setError(null)
          return
        }
        const id = crypto.randomUUID()
        const next = action === 'save'
          ? appendGradeSavedRecord(expected.store, current, name, id, new Date().toISOString())
          : removeGradeSavedRecord(expected.store, target!.id, id)
        const result = writeGradeSavedRecords(storage, expected.raw, next)
        if (!result.ok) { setError(result.error); return }
        setView({ ok: true, raw: result.raw, store: next }); setError(null)
        if (action === 'save') { setName(''); setSelectedId(id) }
        else setSelectedId('')
        setNotice(t(action === 'save' ? 'records.saved' : 'records.deleted'))
      }, controller.signal)
    } catch (cause) {
      if (!mountedRef.current || controller.signal.aborted) return
      const code = cause instanceof Error ? cause.message : ''
      setError(code === 'name' || code === 'invalid' || code === 'limit' ? code : gradeRecordStorageError(cause))
    } finally {
      if (pendingRef.current === controller) pendingRef.current = null
      busyRef.current = false
      if (mountedRef.current) { setBusy(false); setConfirm(null) }
    }
  }

  return (
    <section data-grade-records aria-labelledby="grade-records-title" className="ui-card p-5 sm:p-6 space-y-4 min-w-0">
      <h2 id="grade-records-title" className="text-lg font-semibold text-fg">{t('records.title')}</h2>
      <p className="text-sm text-sub">{t('records.description')}</p>
      <p className="text-xs text-muted">{t('records.storageHint')}</p>
      <div className="grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_auto] items-end gap-2">
        <label className="block min-w-0 text-sm text-body">{t('records.name')}
          <input value={name} maxLength={GRADE_RECORD_LIMITS.name} disabled={busy} onChange={event => setName(event.target.value)} className="ui-field mt-1 w-full min-h-11 px-3 py-2 text-base" />
        </label>
        <button type="button" onClick={() => act('save')} disabled={!canManage || !name.trim() || !currentValid || records.length >= GRADE_RECORD_LIMITS.count} className="ui-btn min-h-11 px-4 py-2 text-sm disabled:opacity-40">{t('records.save')}</button>
      </div>
      {ready && !currentValid && <p className="text-sm text-body">{t('records.inputLimit')}</p>}
      {records.length >= GRADE_RECORD_LIMITS.count && <p className="text-sm text-sub">{t('records.errors.limit')}</p>}
      <p className="text-sm text-sub">{t('records.count', { count: records.length })}</p>
      {records.length > 0 && <>
        <label className="block min-w-0 text-sm text-body">{t('records.savedList')}
          <select value={selectedId} disabled={busy} onChange={event => { setSelectedId(event.target.value); setConfirm(null); setNotice('') }} className="ui-field mt-1 w-full max-w-full min-w-0 min-h-11 px-3 py-2 text-base">
            <option value="">{t('records.choose')}</option>
            {records.map(record => {
              const summary = summarizeGradeRecord(record.snapshot)
              return <option key={record.id} value={record.id}>{t('records.option', { name: record.name, system: record.snapshot.system, count: summary.validCount, units: summary.units })}</option>
            })}
          </select>
        </label>
        {selected && <div className="rounded-xl bg-subtle p-4 space-y-3 min-w-0">
          <p className="font-medium text-fg break-words">{selected.name}</p>
          <p className="text-sm text-sub">{t('records.details', { year: selected.snapshot.entryYear, system: selected.snapshot.system, count: selected.snapshot.rows.length })}</p>
          <p className="text-xs text-muted">{t('records.savedAt', { date: new Date(selected.createdAt).toLocaleString() })}</p>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => setConfirm('load')} disabled={!canManage} className="ui-btn min-h-11 px-4 py-2 text-sm disabled:opacity-40">{t('records.load')}</button>
            <button type="button" onClick={() => setConfirm('delete')} disabled={!canManage} className="ui-btn-soft min-h-11 px-4 py-2 text-sm disabled:opacity-40">{t('records.delete')}</button>
          </div>
        </div>}
      </>}
      {confirm && selected && <div role="group" aria-label={t(confirm === 'load' ? 'records.confirmLoad' : 'records.confirmDelete')} className="rounded-xl border border-line p-4 space-y-3">
        <p className="text-sm text-body break-words">{t(confirm === 'load' ? 'records.loadConfirm' : 'records.deleteConfirm', { name: selected.name })}</p>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => act(confirm)} disabled={!canManage} className="ui-btn min-h-11 px-4 py-2 text-sm disabled:opacity-40">{t(confirm === 'load' ? 'records.confirmLoad' : 'records.confirmDelete')}</button>
          <button type="button" onClick={() => { pendingRef.current?.abort(); setConfirm(null) }} className="ui-btn-soft min-h-11 px-4 py-2 text-sm">{t('records.cancel')}</button>
        </div>
      </div>}
      {issue && <div role="alert" className="rounded-xl bg-subtle p-4 space-y-3">
        <p className="text-sm text-body">{t(`records.errors.${issue}`)}</p>
        <button type="button" onClick={refresh} disabled={busy} className="ui-btn-soft min-h-11 px-4 py-2 text-sm">{t('records.refresh')}</button>
      </div>}
      {notice && <p role="status" className="text-sm text-sub">{notice}</p>}
    </section>
  )
}
