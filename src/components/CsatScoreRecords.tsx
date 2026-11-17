'use client'

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useTranslations } from '@/lib/i18n'
import '@/lib/i18n/ns/csatGrade'
import {
  CSAT_SCORE_RECORDS_KEY, CSAT_SCORE_RECORD_LIMIT, CSAT_SCORE_RECORD_NAME_LIMIT,
  appendCsatScoreRecord, compareCsatScoreSnapshots, createCsatScoreActionGuard, csatScoreSubject,
  isCsatScoreSnapshot, readCsatScoreRecords, removeCsatScoreRecord, withCsatScoreRecordsLock, writeCsatScoreRecords,
  type CsatScoreError, type CsatScoreField, type CsatScoreRead, type CsatScoreRecord, type CsatScoreSnapshot,
} from '@/utils/csatScoreRecords'

type Pending = { token: number } & ({ kind: 'save'; name: string; snapshot: CsatScoreSnapshot } | { kind: 'load' | 'delete'; record: CsatScoreRecord })
const blockedErrors: CsatScoreError[] = ['corrupt', 'unsupported', 'oversized', 'unavailable', 'quota', 'conflict', 'unverified']

export default function CsatScoreRecords({ current, ready, fromLink, onRestore }: {
  current: CsatScoreSnapshot
  ready: boolean
  fromLink: boolean
  onRestore: (snapshot: CsatScoreSnapshot) => void
}) {
  const t = useTranslations('csatGrade')
  const [guard] = useState(createCsatScoreActionGuard)
  const [view, setView] = useState<CsatScoreRead | null>(null)
  const [name, setName] = useState('')
  const [selectedId, setSelectedId] = useState('')
  const [pending, setPending] = useState<Pending | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<CsatScoreError | null>(null)
  const [notice, setNotice] = useState<{ kind: 'saved' | 'loaded' | 'deleted'; name: string } | null>(null)
  const context = JSON.stringify([ready, current])
  const [observedContext, setObservedContext] = useState(context)
  const cancelRef = useRef<HTMLButtonElement>(null)

  // Clear an obsolete confirmation immediately; the layout effect also invalidates queued lock work.
  if (observedContext !== context) {
    setObservedContext(context)
    if (pending) setError('stale')
    setPending(null)
    setBusy(false)
  }
  useLayoutEffect(() => { guard.update(context) }, [context, guard])

  const refresh = useCallback(() => {
    guard.invalidate()
    setBusy(false); setPending(null); setNotice(null); setError(null); setSelectedId('')
    try { setView(readCsatScoreRecords(window.localStorage)) }
    catch { setView({ ok: false, error: 'unavailable' }) }
  }, [guard])

  useEffect(() => {
    const first = window.setTimeout(refresh, 0)
    const changed = (event: StorageEvent) => {
      if (event.key !== CSAT_SCORE_RECORDS_KEY && event.key !== null) return
      guard.invalidate(); setBusy(false); setPending(null); setNotice(null); setError('conflict')
    }
    window.addEventListener('storage', changed)
    return () => { window.clearTimeout(first); window.removeEventListener('storage', changed); guard.invalidate() }
  }, [guard, refresh])
  useEffect(() => { if (pending) cancelRef.current?.focus() }, [pending])

  const records = view?.ok ? view.store.records : []
  const selected = records.find(record => record.id === selectedId)
  const comparison = useMemo(() => selected ? compareCsatScoreSnapshots(current, selected.snapshot) : [], [current, selected])
  const issue = view && !view.ok ? view.error : error
  const blocked = !!issue && blockedErrors.includes(issue)
  const canAct = !!view?.ok && ready && !blocked && !busy && !pending
  const validCurrent = isCsatScoreSnapshot(current)
  const fieldName = (field: CsatScoreField) => t(field === 'kor' ? 'subjects.korean' : field === 'math' ? 'subjects.math' : field === 'eng' ? 'subjects.english' : field === 'hist' ? 'subjects.koreanHistory' : field === 'inq1' ? 'u.inq1' : 'u.inq2')
  const scoreText = (value: string) => value === '' ? t('records.emptyScore') : t('records.points', { value })

  function beginSave() {
    if (!canAct) return
    if (!validCurrent) { setError('invalid'); return }
    if (!name.trim() || name.trim().length > CSAT_SCORE_RECORD_NAME_LIMIT || /[\u0000-\u001f\u007f]/.test(name)) { setError('name'); return }
    setError(null); setNotice(null)
    setPending({ token: guard.begin(), kind: 'save', name: name.trim(), snapshot: structuredClone(current) })
  }
  function beginRecord(kind: 'load' | 'delete') {
    if (!canAct || !selected) return
    setError(null); setNotice(null)
    setPending({ token: guard.begin(), kind, record: selected })
  }
  function cancel() { guard.invalidate(); setPending(null); setBusy(false) }

  async function confirm() {
    if (!pending || !view?.ok || busy || !ready || blocked || !guard.isCurrent(pending.token)) return
    const action = pending, expected = view, token = action.token
    setBusy(true); setNotice(null)
    try {
      await withCsatScoreRecordsLock(() => {
        if (!guard.isCurrent(token)) return
        const storage = window.localStorage
        if (storage.getItem(CSAT_SCORE_RECORDS_KEY) !== expected.raw) { setError('conflict'); return }
        if (action.kind === 'load') {
          setPending(null); setBusy(false); setError(null)
          setNotice({ kind: 'loaded', name: action.record.name })
          onRestore(structuredClone(action.record.snapshot))
          return
        }
        const id = crypto.randomUUID()
        const next = action.kind === 'save'
          ? appendCsatScoreRecord(expected.store, action.snapshot, action.name, id, new Date().toISOString())
          : removeCsatScoreRecord(expected.store, action.record.id, id)
        const result = writeCsatScoreRecords(storage, expected.raw, next)
        if (!result.ok) { setError(result.error); return }
        setView({ ok: true, raw: result.raw, store: next }); setError(null)
        if (action.kind === 'save') {
          setName(''); setSelectedId(id); setNotice({ kind: 'saved', name: action.name })
        } else { setSelectedId(''); setNotice({ kind: 'deleted', name: action.record.name }) }
      })
    } catch (cause) {
      if (!guard.isCurrent(token)) return
      const message = cause instanceof Error ? cause.message : ''
      setError(message === 'invalid' || message === 'name' || message === 'limit' || message === 'missing' ? message : 'unavailable')
    } finally {
      if (guard.isCurrent(token)) { setPending(null); setBusy(false) }
    }
  }

  return (
    <section className="ui-card min-w-0 p-4 sm:p-6" aria-labelledby="csat-score-records-title">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="csat-score-records-title" className="text-lg font-semibold text-fg">{t('records.title')}</h2>
        <button type="button" onClick={refresh} className="ui-btn-soft min-h-11 px-3 py-2 text-sm">{t('records.refresh')}</button>
      </div>
      <p className="mt-2 text-sm text-sub">{t('records.description', { max: CSAT_SCORE_RECORD_LIMIT })}</p>
      <p className="mt-2 text-xs text-muted">{t(fromLink ? 'records.sharedHint' : 'records.localHint')}</p>
      <p className="mt-2 text-xs text-sub">{t('records.currentBasis', { exam: current.examYear, reference: current.referenceYear })}</p>

      {issue && <p role="alert" className="mt-4 rounded-xl bg-subtle p-3 text-sm text-body">{t(`records.errors.${issue}`)}</p>}
      {!view && <p role="status" className="mt-3 text-sm text-sub">{t('records.loading')}</p>}
      <div className="mt-4 space-y-3">
        <label className="block" htmlFor="csat-score-record-name">
          <span className="mb-1 block text-sm font-medium text-body">{t('records.name')}</span>
          <input id="csat-score-record-name" value={name} maxLength={CSAT_SCORE_RECORD_NAME_LIMIT} onChange={event => setName(event.target.value)} disabled={busy || !!pending} className="ui-field min-h-11 w-full px-3 py-2 text-base" placeholder={t('records.namePlaceholder')} />
        </label>
        <button type="button" onClick={beginSave} disabled={!canAct || !validCurrent || !name.trim() || records.length >= CSAT_SCORE_RECORD_LIMIT} className="ui-btn min-h-11 w-full px-4 py-2.5">{t('records.save')}</button>
        {!validCurrent && <p className="text-sm text-sub">{t('records.errors.invalid')}</p>}
        {records.length >= CSAT_SCORE_RECORD_LIMIT && <p className="text-sm text-sub">{t('records.errors.limit')}</p>}
      </div>
      {view?.ok && records.length === 0 && <p className="mt-4 text-sm text-muted">{t('records.emptyList')}</p>}
      {records.length > 0 && (
        <label className="mt-5 block" htmlFor="csat-score-record-select">
          <span className="mb-1 block text-sm font-medium text-body">{t('records.select')}</span>
          <select id="csat-score-record-select" value={selected?.id ?? ''} onChange={event => { guard.invalidate(); setSelectedId(event.target.value); setNotice(null) }} disabled={busy || !!pending} className="ui-field min-h-11 w-full min-w-0 px-3 py-2 text-base">
            <option value="">{t('records.selectPlaceholder')}</option>
            {[...records].reverse().map(record => <option key={record.id} value={record.id}>{t('records.option', { name: record.name, exam: record.snapshot.examYear, reference: record.snapshot.referenceYear })}</option>)}
          </select>
        </label>
      )}
      {selected && (
        <div id="csat-score-comparison" className="mt-4 space-y-3">
          <h3 className="break-words font-semibold text-fg">{t('records.comparison', { name: selected.name })}</h3>
          <p className="text-xs text-sub">{t('records.savedBasis', { exam: selected.snapshot.examYear, reference: selected.snapshot.referenceYear })}</p>
          <p className="text-xs text-muted">{t('records.savedAt', { date: new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Seoul', dateStyle: 'short', timeStyle: 'short' }).format(new Date(selected.createdAt)) })}</p>
          {(current.examYear !== selected.snapshot.examYear || current.referenceYear !== selected.snapshot.referenceYear) && <p className="rounded-xl bg-subtle p-3 text-sm text-body">{t('records.differentYear')}</p>}
          <p className="text-xs text-sub">{t('records.comparisonNote')}</p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {comparison.map(row => (
              <div key={row.field} data-score-field={row.field} className="min-w-0 rounded-xl bg-subtle p-3">
                <h4 className="text-sm font-semibold text-fg">{fieldName(row.field)}</h4>
                <dl className="mt-2 grid grid-cols-2 gap-3 text-sm">
                  {([['current', current, row.current], ['saved', selected.snapshot, row.saved]] as const).map(([label, snapshot, score]) => <div key={label} className="min-w-0"><dt className="text-sub">{t(`records.${label}`)}</dt><dd className="mt-1 break-words text-xs text-sub">{t(`u.cut.${csatScoreSubject(row.field, snapshot)}`)}</dd><dd className="mt-1 font-semibold text-fg tabular-nums">{scoreText(score)}</dd></div>)}
                </dl>
                <p className="mt-3 text-xs text-sub">{row.reason ? t(`records.reasons.${row.reason}`) : t('records.difference', { value: `${row.difference! > 0 ? '+' : ''}${row.difference}` })}</p>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap gap-2 pt-1">
            <button type="button" onClick={() => beginRecord('load')} disabled={!canAct} className="ui-btn min-h-11 flex-1 px-4 py-2.5">{t('records.load')}</button>
            <button type="button" onClick={() => beginRecord('delete')} disabled={!canAct} className="ui-btn-soft min-h-11 px-4 py-2.5">{t('records.delete')}</button>
          </div>
        </div>
      )}
      {pending && (
        <div role="alertdialog" aria-labelledby="csat-score-confirm-title" aria-describedby="csat-score-confirm-body" className="mt-4 rounded-xl border border-line-strong bg-subtle p-4">
          <h3 id="csat-score-confirm-title" className="font-semibold text-fg">{t(`records.confirm.${pending.kind}Title`)}</h3>
          <p id="csat-score-confirm-body" className="mt-2 break-words text-sm text-body">{t(`records.confirm.${pending.kind}Body`, { name: pending.kind === 'save' ? pending.name : pending.record.name })}</p>
          {pending.kind === 'load' && fromLink && <p className="mt-2 text-sm text-sub">{t('records.sharedRestore')}</p>}
          <div className="mt-4 flex flex-wrap gap-2">
            <button type="button" onClick={() => { void confirm() }} disabled={busy} className="ui-btn min-h-11 px-4 py-2.5">{t(busy ? 'records.working' : `records.confirm.${pending.kind}Action`)}</button>
            <button ref={cancelRef} type="button" onClick={cancel} className="ui-btn-soft min-h-11 px-4 py-2.5">{t('records.cancel')}</button>
          </div>
        </div>
      )}
      {notice && <p role="status" className="mt-3 break-words text-sm text-sub">{t(notice.kind === 'saved' ? 'records.savedDone' : `records.${notice.kind}`, { name: notice.name })}</p>}
    </section>
  )
}
