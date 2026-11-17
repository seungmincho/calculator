'use client'

import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState, type FormEvent } from 'react'
import { useHydrated } from '@/hooks/useHydrated'
import { useTranslations } from '@/lib/i18n'
import '@/lib/i18n/ns/textToSpeech'
import {
  TTS_READING_KEY, TTS_READING_LIMITS, createTtsReadingRecord, loadTtsReadingRecord, readTtsReadingRecords, writeTtsReadingAction,
  type TtsReadingDraft, type TtsReadingError, type TtsReadingLoad, type TtsReadingRead, type TtsReadingRecord, type TtsReadingResult,
} from '@/utils/ttsReadingRecords'

export interface TtsReadingListProps {
  ready: boolean
  /** Increase for explicit manuscript/settings/playback actions, not automatic speech progress. */
  inputRevision: number
  capture: () => TtsReadingResult<TtsReadingDraft>
  /** Synchronous explicit application; must stop old speech and must not start new speech. */
  onApply: (loaded: TtsReadingLoad) => boolean
}
type Notice = { error: TtsReadingError } | { success: 'saved' | 'deleted' | 'loaded' | 'positionChanged' | 'refreshed' }
type Selection = { kind: 'load' | 'delete'; id: string }
const makeId = () => typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`

export default function TtsReadingList({ ready, inputRevision, capture, onApply }: TtsReadingListProps) {
  const t = useTranslations('textToSpeech'), hydrated = useHydrated(), id = useId()
  const [snapshot, setSnapshot] = useState<TtsReadingRead | null>(null), [name, setName] = useState(''), [selection, setSelection] = useState<Selection | null>(null)
  const [notice, setNotice] = useState<Notice | null>(null), [busy, setBusy] = useState(false), [blocked, setBlocked] = useState(false)
  const mounted = useRef(false), generation = useRef(0), revisionRef = useRef(inputRevision), working = useRef(false), abort = useRef<AbortController | null>(null)
  if (hydrated && snapshot === null) setSnapshot(readTtsReadingRecords())
  const invalidate = useCallback(() => { generation.current++; abort.current?.abort(); abort.current = null; working.current = false }, [])
  useLayoutEffect(() => {
    mounted.current = true
    return () => { mounted.current = false; invalidate() }
  }, [invalidate])
  useLayoutEffect(() => {
    revisionRef.current = inputRevision
    invalidate()
    const ticket = generation.current
    queueMicrotask(() => { if (mounted.current && generation.current === ticket) { setBusy(false); setSelection(null) } })
  }, [inputRevision, invalidate])
  useEffect(() => {
    const changed = (event: StorageEvent) => {
      if (event.key !== null && event.key !== TTS_READING_KEY) return
      if (event.key === TTS_READING_KEY && snapshot?.ok && event.newValue === snapshot.snapshot.raw) return
      invalidate(); setBusy(false); setSelection(null); setBlocked(true); setNotice({ error: 'conflict' })
    }
    window.addEventListener('storage', changed)
    return () => window.removeEventListener('storage', changed)
  }, [snapshot, invalidate])
  const records = snapshot?.ok ? snapshot.snapshot.records : []
  const disabled = !ready || !snapshot?.ok || blocked || busy
  const error = snapshot && !snapshot.ok ? snapshot.error : notice && 'error' in notice ? notice.error : null
  const refresh = () => {
    invalidate(); setBusy(false); setSelection(null)
    const next = readTtsReadingRecords(); setSnapshot(next); setBlocked(false)
    setNotice(next.ok ? { success: 'refreshed' } : { error: next.error })
  }
  const execute = async (action: Selection | { kind: 'add'; record: TtsReadingRecord }) => {
    if (disabled || working.current || !mounted.current || !snapshot?.ok) return
    const ticket = ++generation.current, input = revisionRef.current, controller = new AbortController()
    abort.current = controller; working.current = true; setBusy(true); setNotice(null)
    const current = () => mounted.current && generation.current === ticket && revisionRef.current === input && !controller.signal.aborted
    try {
      if (action.kind === 'load') {
        const result = await loadTtsReadingRecord(snapshot.snapshot, action.id, { current, signal: controller.signal })
        if (!current()) return
        if (!result.ok) { setNotice({ error: result.error }); if (result.error !== 'canceled') setBlocked(true); return }
        // End ownership before the parent increments its revision for this explicit apply.
        working.current = false; setBusy(false); abort.current = null; setSelection(null)
        if (!onApply(result.value)) { setNotice({ error: 'canceled' }); return }
        setNotice({ success: result.value.positionMatched ? 'loaded' : 'positionChanged' })
      } else {
        const mutation = action.kind === 'add' ? { kind: 'add' as const, record: action.record } : { kind: 'delete' as const, id: action.id }
        const result = await writeTtsReadingAction(snapshot.snapshot, mutation, makeId(), { current, signal: controller.signal })
        if (!current()) return
        if (!result.ok) {
          setNotice({ error: result.error })
          if (!['invalidName', 'duplicateName', 'limit', 'invalidAction', 'invalidPosition', 'invalidSettings', 'voiceTooLong', 'textTooLong', 'noSentences', 'notFound', 'canceled'].includes(result.error)) setBlocked(true)
          return
        }
        setSnapshot(result); setSelection(null); setNotice({ success: action.kind === 'add' ? 'saved' : 'deleted' }); if (action.kind === 'add') setName('')
      }
    } catch { if (current()) { setNotice({ error: 'unavailable' }); setBlocked(true) } }
    finally { if (current()) { working.current = false; setBusy(false); abort.current = null } }
  }
  const save = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (disabled || working.current) return
    const draft = capture()
    if (!draft.ok) { setNotice({ error: draft.error }); return }
    const created = createTtsReadingRecord(draft.value, makeId(), name, Date.now())
    if (!created.ok) { setNotice({ error: created.error }); return }
    void execute({ kind: 'add', record: created.value })
  }
  return <section data-tts-reading-list="" className="min-w-0 space-y-4 border-t border-line pt-4" aria-labelledby={`${id}-title`}>
    <div><h2 id={`${id}-title`} className="text-base font-semibold text-fg">{t('readingList.title')}</h2><p className="mt-1 text-sm text-sub">{t('readingList.description')}</p></div>
    <form onSubmit={save} className="space-y-2">
      <label htmlFor={`${id}-name`} className="block text-sm font-medium text-body">{t('readingList.name')}</label>
      <input id={`${id}-name`} data-tts-reading-name="" value={name} onChange={event => setName(event.target.value)} disabled={disabled} maxLength={TTS_READING_LIMITS.name} autoComplete="off" className="ui-field min-h-11 min-w-0 w-full px-3 py-3 text-base" />
      <p className="text-xs text-muted">{t('readingList.limits')}</p>
      <button type="submit" data-tts-reading-save="" disabled={disabled || !name.trim() || records.length >= TTS_READING_LIMITS.records} className="ui-btn min-h-11 w-full px-3 py-3 disabled:opacity-50">{t(busy ? 'readingList.working' : 'readingList.save')}</button>
    </form>
    {error && <p data-tts-reading-error={error} role="alert" className="text-sm text-body">{t(`readingList.errors.${error}`)}</p>}
    {!error && notice && 'success' in notice && <p data-tts-reading-success={notice.success} role="status" className="text-sm text-primary">{t(`readingList.${notice.success}`)}</p>}
    {!ready || snapshot === null ? <p role="status" className="text-sm text-sub">{t('readingList.loading')}</p> : records.length === 0 && snapshot.ok && <p className="text-sm text-sub">{t('readingList.empty')}</p>}
    <p className="text-sm text-sub">{t('readingList.count', { count: records.length, max: TTS_READING_LIMITS.records })}</p>
    {records.length >= TTS_READING_LIMITS.records && <p className="text-sm text-sub">{t('readingList.errors.limit')}</p>}
    <ol className="space-y-3">
      {records.map(record => <li key={record.id} data-tts-reading-record={record.id} className="min-w-0 space-y-2 rounded-xl bg-subtle p-3">
        <h3 className="text-base font-semibold text-fg [overflow-wrap:anywhere]">{record.name}</h3>
        <p className="text-xs text-muted"><time dateTime={new Date(record.createdAt).toISOString()}>{new Date(record.createdAt).toISOString().split('T')[0]}</time> · {t('readingList.summary', { count: record.text.length, sentence: record.position.index + 1 })}</p>
        <p className="text-sm text-body [overflow-wrap:anywhere]">{Array.from(record.position.text.replace(/\s+/g, ' ')).slice(0, 60).join('')}{Array.from(record.position.text.replace(/\s+/g, ' ')).length > 60 ? '…' : ''}</p>
        {selection?.id === record.id ? <div className="space-y-2">
          <p className="text-sm text-body">{t(selection.kind === 'load' ? 'readingList.loadPrompt' : 'readingList.deletePrompt', { name: record.name })}</p>
          <div className="flex flex-wrap gap-2"><button type="button" data-tts-reading-confirm={selection.kind} disabled={disabled} onClick={() => { void execute(selection) }} className="ui-btn min-h-11 px-3 py-2 text-sm disabled:opacity-50">{t(selection.kind === 'load' ? 'readingList.loadConfirm' : 'readingList.deleteConfirm')}</button><button type="button" data-tts-reading-cancel="" disabled={busy} onClick={() => setSelection(null)} className="ui-btn-soft min-h-11 px-3 py-2 text-sm">{t('readingList.cancel')}</button></div>
        </div> : <div className="flex flex-wrap gap-2"><button type="button" data-tts-reading-load={record.id} disabled={disabled} onClick={() => setSelection({ kind: 'load', id: record.id })} className="ui-btn min-h-11 px-3 py-2 text-sm disabled:opacity-50">{t('readingList.load')}</button><button type="button" data-tts-reading-delete={record.id} disabled={disabled} onClick={() => setSelection({ kind: 'delete', id: record.id })} className="ui-btn-soft min-h-11 px-3 py-2 text-sm disabled:opacity-50">{t('readingList.delete')}</button></div>}
      </li>)}
    </ol>
    <button type="button" data-tts-reading-refresh="" disabled={!hydrated} onClick={refresh} className="ui-btn-soft min-h-11 w-full px-3 py-2 text-sm">{t('readingList.refresh')}</button>
  </section>
}
