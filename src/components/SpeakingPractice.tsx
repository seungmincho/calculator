'use client'

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Mic, Square } from 'lucide-react'
import { useTranslations } from '@/lib/i18n'
import '@/lib/i18n/ns/speakingPractice'
import { useSearchParams } from '@/hooks/useSearchParams'
import { useSpeakingRecorder } from '@/hooks/useSpeakingRecorder'
import { type SpeakingPreparationSeconds } from '@/utils/speakingPreparation'
import { MAX_SECONDS, MAX_TAKES, MAX_TEXT, basicSpeakingCheck, speakingMetrics, summaryFromParams, type SpeakingMode, type SpeakingTake } from '@/lib/speaking/core'
import { MAX_SPEAKING_TITLE, filterSpeakingRecords, isSpeakingTitle, type SpeakingRecord, type SpeakingRecordFilter, type SpeakingRecordList, type SpeakingStoredBasis, type SpeakingStoredRecord } from '@/lib/speaking/records'
import { deleteCoachingDownload, SpeakingAIClient, type SpeakingProgress } from '@/lib/speaking/client'
import { decodeSpeakingAudio, downloadSpeakingFile } from '@/lib/speaking/audio'
import { deleteSpeakingSession, listSpeakingSessions, saveSpeakingSession } from '@/lib/speaking/storage'
import MobileResultLink from '@/components/MobileResultLink'
import ShareResult from '@/components/ShareResult'

type Progress = SpeakingProgress | { stage: 'decoding'; progress?: number }
const emptySession = (mode: SpeakingMode): SpeakingRecord => ({ version: 1, id: '', mode, createdAt: 0, updatedAt: 0, takes: [] })
const errorKeys = new Set(['noMicrophone', 'microphoneDenied', 'recordingFailed', 'audioTooShort', 'audioTooLong', 'fileTooLarge', 'audioFailed', 'speechFailed', 'noSpeech', 'noWebGPU', 'modelFailed', 'modelTimeout', 'invalidFeedback', 'ungroundedFeedback', 'storageFailed', 'storageBlocked', 'storageFull', 'storageConflict', 'storageCorrupt', 'storageUnsupported', 'storageQuota', 'storageAborted', 'storageDeleteFailed', 'titleInvalid', 'copyFailed', 'textTooShort', 'textTruncated', 'cacheFailed'])
const messageKey = (cause: unknown, fallback: string) => cause instanceof Error && errorKeys.has(cause.message) ? cause.message : fallback

function TakeAudio({ take, label }: { take: SpeakingTake; label: string }) {
  const audio = useRef<HTMLAudioElement>(null)
  useEffect(() => {
    if (!take.audio || !audio.current) return
    const next = URL.createObjectURL(take.audio)
    audio.current.src = next
    return () => URL.revokeObjectURL(next)
  }, [take.audio])
  return take.audio ? <audio ref={audio} controls preload="metadata" aria-label={label} data-speaking-audio="" onPlay={event => {
    document.querySelectorAll<HTMLAudioElement>('audio[data-speaking-audio]').forEach(other => { if (other !== event.currentTarget) other.pause() })
  }} className="w-full min-w-0 h-11" /> : null
}

function BasicCheck({ mode, take }: { mode: SpeakingMode; take: SpeakingTake }) {
  const t = useTranslations('speakingPractice')
  const check = basicSpeakingCheck(mode, take.transcript, take.seconds)
  return <div className="border-t border-line pt-4 space-y-4" data-testid="speaking-basic-check">
    <div><h3 className="font-semibold text-fg">{t('basic.title')}</h3><p className="mt-1 text-xs text-muted">{t('basic.auto')}</p></div>
    <p className="text-sm text-body bg-subtle rounded-xl p-4">{t(`basic.duration.${check.durationStatus}`)}</p>
    {check.hasText ? <>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="bg-subtle rounded-xl p-4"><h4 className="text-sm font-medium text-body">{t('basic.fillers')}</h4><p className="text-xl font-bold text-fg tabular-nums mt-2">{t('basic.count', { count: check.fillerCount })}</p><p className="text-xs text-sub mt-2 break-words">{check.fillers.length ? check.fillers.map(item => t('basic.expression', item)).join(' · ') : t('basic.noFillers')}</p></div>
        <div className="bg-subtle rounded-xl p-4"><h4 className="text-sm font-medium text-body">{t('basic.repeats')}</h4><p className="text-xl font-bold text-fg tabular-nums mt-2">{t('basic.repeatCount', { count: check.repeats.length })}</p><p className="text-xs text-sub mt-2 break-words">{check.repeats.length ? check.repeats.map(item => t('basic.expression', item)).join(' · ') : t('basic.noRepeats')}</p></div>
      </div>
      <div><h4 className="text-sm font-semibold text-fg mb-2">{t('basic.structure')}</h4><ul className="divide-y divide-line">{check.structure.map(item => <li key={item.id} className="flex justify-between gap-3 py-3 text-sm"><span className="text-body">{t(`basic.cues.${item.id}`)}</span><span className="text-sub shrink-0">{t(item.found ? 'basic.found' : 'basic.review')}</span></li>)}</ul></div>
      <p className="text-xs text-muted leading-relaxed">{t('basic.limits')}</p>
      <div className="bg-subtle rounded-xl p-4"><p className="text-sm font-semibold text-fg">{t('next')}</p><p className="text-sm text-body leading-relaxed mt-2">{t(`basic.next.${mode}`)}</p></div>
    </> : <p className="text-sm text-sub">{t('basic.needsText')}</p>}
  </div>
}

export default function SpeakingPractice() {
  const t = useTranslations('speakingPractice')
  const params = useSearchParams()
  const [session, setSession] = useState<SpeakingRecord>(() => emptySession('intro'))
  const [selectedId, setSelectedId] = useState('')
  const [recordList, setRecordList] = useState<SpeakingRecordList>({ records: [], unreadableCount: 0, unsupportedCount: 0, totalCount: 0 })
  const [historyQuery, setHistoryQuery] = useState('')
  const [historyMode, setHistoryMode] = useState<SpeakingRecordFilter>('all')
  const [historyLoading, setHistoryLoading] = useState(true)
  const [historyFailed, setHistoryFailed] = useState(false)
  const [savedRefreshFailed, setSavedRefreshFailed] = useState(false)
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [copied, setCopied] = useState(false)
  const [gpu, setGpu] = useState<boolean | null>(null)
  const [coachingOpen, setCoachingOpen] = useState(false)
  const [coachingAllowed, setCoachingAllowed] = useState(false)
  const [clearingCache, setClearingCache] = useState(false)
  const [cacheRemoved, setCacheRemoved] = useState(false)
  const [progress, setProgress] = useState<Progress | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [shared, setShared] = useState<ReturnType<typeof summaryFromParams>>(null)
  const [preparationSeconds, setPreparationSeconds] = useState<SpeakingPreparationSeconds>(0)
  const ai = useRef<SpeakingAIClient | null>(null)
  const job = useRef(0)
  const mounted = useRef(true)
  const storedBasis = useRef<SpeakingStoredBasis>({ kind: 'absent' })
  const practiceGeneration = useRef(0)
  const editGeneration = useRef(0)
  const storageTask = useRef(0)
  const storageBusy = useRef(false)
  const historyTask = useRef(0)
  const visibleRecords = useMemo(() => filterSpeakingRecords(recordList.records, historyQuery, historyMode), [recordList.records, historyQuery, historyMode])
  const selected = session.takes.find(take => take.id === selectedId) ?? session.takes.at(-1)
  const first = session.takes[0]
  const metrics = speakingMetrics(selected?.transcript ?? '', selected?.seconds ?? null)
  const firstMetrics = speakingMetrics(first?.transcript ?? '', first?.seconds ?? null)
  const selectedNumber = selected ? session.takes.findIndex(take => take.id === selected.id) + 1 : 0

  const refreshRecords = useCallback(async (): Promise<'loaded' | 'failed' | 'stale'> => {
    const task = ++historyTask.current
    setHistoryLoading(true)
    setHistoryFailed(false)
    try {
      const values = await listSpeakingSessions()
      if (!mounted.current || task !== historyTask.current) return 'stale'
      setRecordList(values)
      return 'loaded'
    } catch {
      if (!mounted.current || task !== historyTask.current) return 'stale'
      setHistoryFailed(true)
      return 'failed'
    } finally {
      if (mounted.current && task === historyTask.current) setHistoryLoading(false)
    }
  }, [])

  useEffect(() => {
    mounted.current = true
    const mode = params.get('mode') === 'report' ? 'report' : 'intro'
    setSession(emptySession(mode))
    setShared(summaryFromParams(params))
    void refreshRecords()
    const check = async () => {
      const webgpu = (navigator as Navigator & { gpu?: { requestAdapter(): Promise<unknown> } }).gpu
      try { const adapter = await webgpu?.requestAdapter(); if (mounted.current) setGpu(!!adapter) }
      catch { if (mounted.current) setGpu(false) }
    }
    void check()
    // These refs are cancellation counters/resources, not DOM nodes captured by this effect.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    return () => { mounted.current = false; job.current++; storageTask.current++; historyTask.current++; practiceGeneration.current++; ai.current?.cancel() }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!dirty) return
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = '' }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty])

  const appendTake = useCallback((audio?: Blob, seconds: number | null = null) => {
    editGeneration.current++
    const take: SpeakingTake = { id: crypto.randomUUID(), createdAt: Date.now(), transcript: '', seconds, ...(audio ? { audio } : {}) }
    setSession(previous => ({ ...previous, id: previous.id || crypto.randomUUID(), createdAt: previous.createdAt || Date.now(), updatedAt: Date.now(), takes: [...previous.takes, take].slice(0, MAX_TAKES) }))
    setSelectedId(take.id)
    setDirty(true)
    setSaved(false)
    setSavedRefreshFailed(false)
    setError(null)
    setShared(null)
  }, [])
  const recorder = useSpeakingRecorder(appendTake)
  const busy = !!progress || recorder.recording || recorder.requesting || recorder.preparing || recorder.phase === 'stopping' || saving || clearingCache
  const atLimit = session.takes.length >= MAX_TAKES
  const controls = useRef({ busy, saving, atLimit, preparationSeconds })
  useLayoutEffect(() => { controls.current = { busy, saving, atLimit, preparationSeconds } }, [busy, saving, atLimit, preparationSeconds])
  const canInteract = (duringSave = false) => mounted.current && !recorder.isBusy() && (!controls.current.busy || (duringSave && controls.current.saving))
  const startRecording = () => {
    if (!canInteract() || controls.current.atLimit) return
    setError(null); void recorder.start(controls.current.preparationSeconds)
  }

  const updateTake = (id: string, patch: Partial<SpeakingTake>) => {
    editGeneration.current++
    setSession(previous => ({ ...previous, updatedAt: Date.now(), takes: previous.takes.map(take => take.id === id ? { ...take, ...patch } : take) }))
    setDirty(true)
    setSaved(false)
    setSavedRefreshFailed(false)
  }

  const updateTitle = (title: string) => {
    if (!canInteract(true)) return
    if (!isSpeakingTitle(title)) { setError('titleInvalid'); return }
    editGeneration.current++
    setSession(previous => ({ ...previous, title, updatedAt: Date.now() }))
    setDirty(true); setSaved(false); setSavedRefreshFailed(false)
  }

  const begin = (mode: SpeakingMode) => {
    if (!canInteract()) return
    if (dirty && !window.confirm(t('switchConfirm'))) return
    practiceGeneration.current++; editGeneration.current++
    storedBasis.current = { kind: 'absent' }
    setSavedRefreshFailed(false)
    setSession(emptySession(mode)); setSelectedId(''); setDirty(false); setSaved(false); setError(null); setShared(null)
  }

  const cancel = () => { job.current++; ai.current?.cancel(); setProgress(null) }
  const transcribe = async () => {
    if (!selected?.audio || !canInteract()) return
    const task = ++job.current, id = selected.id
    setError(null); setProgress({ stage: 'decoding' })
    try {
      const { audio, seconds } = await decodeSpeakingAudio(selected.audio)
      if (task !== job.current) return
      const energy = audio.reduce((sum, sample) => sum + sample * sample, 0) / audio.length
      if (energy < 1e-7) throw new Error('noSpeech')
      ai.current ??= new SpeakingAIClient()
      const text = await ai.current.transcribe(audio, next => { if (task === job.current) setProgress(next) })
      if (task !== job.current) return
      if (!text) throw new Error('noSpeech')
      updateTake(id, { transcript: text.slice(0, MAX_TEXT), seconds, feedback: undefined })
      if (text.length > MAX_TEXT) setError('textTruncated')
    } catch (cause) { if (task === job.current) setError(messageKey(cause, 'speechFailed')) }
    finally { if (task === job.current) setProgress(null) }
  }

  const feedback = async () => {
    if (!selected || !canInteract() || !coachingAllowed || gpu !== true) return
    const transcript = selected.transcript.trim()
    if (transcript.length < 10) { setError('textTooShort'); return }
    const task = ++job.current, id = selected.id
    setError(null); setCacheRemoved(false); setProgress({ stage: 'modelLoading', progress: 0 })
    try {
      ai.current ??= new SpeakingAIClient()
      const result = await ai.current.feedback(session.mode, transcript, next => { if (task === job.current) setProgress(next) })
      if (task === job.current) updateTake(id, { feedback: result })
    } catch (cause) { if (task === job.current) { ai.current?.cancel(); setError(messageKey(cause, 'modelFailed')) } }
    finally { if (task === job.current) setProgress(null) }
  }

  const removeCoachingDownload = async () => {
    if (!canInteract()) return
    setClearingCache(true); setError(null); setCacheRemoved(false); setCoachingAllowed(false)
    ai.current?.releaseCoaching()
    try { await deleteCoachingDownload(); if (mounted.current) setCacheRemoved(true) }
    catch { if (mounted.current) setError('cacheFailed') }
    finally { if (mounted.current) setClearingCache(false) }
  }

  const importAudio = async (file: File | undefined) => {
    if (!file || !canInteract() || controls.current.atLimit) return
    const task = ++job.current
    setError(null); setProgress({ stage: 'decoding' })
    try {
      const decoded = await decodeSpeakingAudio(file)
      if (task === job.current) appendTake(file, decoded.seconds)
    } catch (cause) { if (task === job.current) setError(messageKey(cause, 'audioFailed')) }
    finally { if (task === job.current) setProgress(null) }
  }

  const save = async () => {
    if (!session.takes.length || !canInteract() || storageBusy.current) return
    const task = ++storageTask.current, practice = practiceGeneration.current, edit = editGeneration.current
    storageBusy.current = true
    setSaving(true); setError(null); setSavedRefreshFailed(false)
    try {
      const committed = await saveSpeakingSession(session, storedBasis.current)
      if (!mounted.current || task !== storageTask.current) return
      // A successful commit supplies its own basis; a later list failure cannot undo it.
      if (practice === practiceGeneration.current) {
        storedBasis.current = committed.basis
        const unchanged = edit === editGeneration.current
        setSession(previous => unchanged ? committed.session : { ...previous, revision: committed.session.revision })
        setDirty(!unchanged); setSaved(unchanged)
      }
      setRecordList(previous => {
        const existed = previous.records.some(record => record.session.id === committed.session.id)
        return { ...previous, totalCount: previous.totalCount + (existed ? 0 : 1),
          records: [committed, ...previous.records.filter(record => record.session.id !== committed.session.id)].sort((a, b) => b.session.updatedAt - a.session.updatedAt) }
      })
      const refresh = await refreshRecords()
      if (mounted.current && task === storageTask.current && practice === practiceGeneration.current && edit === editGeneration.current) setSavedRefreshFailed(refresh === 'failed')
    } catch (cause) {
      if (mounted.current && task === storageTask.current && practice === practiceGeneration.current) setError(messageKey(cause, 'storageFailed'))
    } finally {
      if (task === storageTask.current) {
        storageBusy.current = false
        if (mounted.current) setSaving(false)
      }
    }
  }
  const openRecord = (record: SpeakingStoredRecord) => {
    if (!canInteract()) return
    if (dirty && !window.confirm(t('switchConfirm'))) return
    practiceGeneration.current++; editGeneration.current++
    storedBasis.current = { ...record.basis }
    setSession(structuredClone(record.session)); setSelectedId(record.session.takes.at(-1)?.id ?? '')
    setDirty(false); setSaved(true); setSavedRefreshFailed(false); setError(null); setShared(null)
  }
  const removeRecord = async (record: SpeakingStoredRecord) => {
    if (!canInteract() || storageBusy.current) return
    if (!window.confirm(t('deleteConfirm'))) return
    const task = ++storageTask.current, practice = practiceGeneration.current
    const currentId = session.id, id = record.session.id
    storageBusy.current = true
    setSaving(true); setError(null); setSavedRefreshFailed(false)
    try {
      await deleteSpeakingSession(id, record.basis)
      if (!mounted.current || task !== storageTask.current) return
      setRecordList(previous => ({ ...previous, totalCount: Math.max(0, previous.totalCount - 1), records: previous.records.filter(item => item.session.id !== id) }))
      if (practice === practiceGeneration.current && currentId === id) {
        storedBasis.current = { kind: 'absent' }
        setSession(previous => { const next = { ...previous }; delete next.revision; return next })
        setSaved(false); setDirty(true)
      }
      await refreshRecords()
    } catch (cause) {
      if (mounted.current && task === storageTask.current && practice === practiceGeneration.current) setError(cause instanceof Error && cause.message === 'storageFailed' ? 'storageDeleteFailed' : messageKey(cause, 'storageDeleteFailed'))
    } finally {
      if (task === storageTask.current) {
        storageBusy.current = false
        if (mounted.current) setSaving(false)
      }
    }
  }

  const exportText = () => {
    const lines = [t('title'), t(`modes.${session.mode}.label`), ...(session.title?.trim() ? [t('records.exportName', { name: session.title.trim() })] : []), ...session.takes.flatMap((take, index) => {
      const check = basicSpeakingCheck(session.mode, take.transcript, take.seconds)
      return [
      '', t('take', { number: index + 1 }), take.seconds === null ? t('noDuration') : t('seconds', { value: Math.round(take.seconds) }),
      t('basic.title'), t(`basic.duration.${check.durationStatus}`), ...(check.hasText ? [
        `${t('basic.fillers')}: ${t('basic.count', { count: check.fillerCount })}`,
        `${t('basic.repeats')}: ${check.repeats.map(item => t('basic.expression', item)).join(', ') || t('basic.noRepeats')}`,
        ...check.structure.map(item => `${t(`basic.cues.${item.id}`)}: ${t(item.found ? 'basic.found' : 'basic.review')}`), t('basic.limits'),
      ] : [t('basic.needsText')]),
      t('before'), take.transcript, ...(take.feedback ? [t('strength'), take.feedback.strengthQuote, take.feedback.strength, t('improve'), take.feedback.improveQuote, take.feedback.improve, t('after'), take.feedback.rewrite, t('next'), take.feedback.next, take.feedback.model] : []),
    ] })]
    downloadSpeakingFile(new Blob(['\uFEFF' + lines.join('\n')], { type: 'text/plain;charset=utf-8' }), `toolhub-speaking-${session.mode}.txt`)
  }
  const exportAudio = () => {
    if (!selected?.audio) return
    const type = selected.audio.type
    const extension = /mp4|m4a/.test(type) ? 'm4a' : type.includes('wav') ? 'wav' : type.includes('ogg') ? 'ogg' : /mpeg|mp3/.test(type) ? 'mp3' : type.includes('flac') ? 'flac' : type.includes('aac') ? 'aac' : type.includes('aiff') ? 'aiff' : 'webm'
    downloadSpeakingFile(selected.audio, `toolhub-speaking-${selectedNumber}.${extension}`)
  }
  const copyRewrite = async () => {
    if (!selected?.feedback) return
    try { await navigator.clipboard.writeText(selected.feedback.rewrite); setCopied(true); setTimeout(() => setCopied(false), 2000) }
    catch { setError('copyFailed') }
  }

  const shareUrl = useMemo(() => {
    if (typeof window === 'undefined') return undefined
    const url = new URL('/speaking-practice/', window.location.origin)
    url.searchParams.set('summary', '1'); url.searchParams.set('mode', session.mode); url.searchParams.set('words', String(metrics.words))
    if (metrics.seconds) url.searchParams.set('seconds', String(Math.min(MAX_SECONDS, metrics.seconds)))
    return url.toString()
  }, [session.mode, metrics.words, metrics.seconds])
  const durationText = (seconds: number | null) => seconds === null ? t('noDuration') : t('seconds', { value: seconds })
  const activeError = error ?? recorder.error

  return <div className="space-y-5 sm:space-y-7">
    <header className="space-y-2 sm:space-y-3">
      <p className="text-sm font-semibold text-primary">{t('target')}</p>
      <h1 className="text-2xl sm:text-4xl font-bold tracking-tight text-fg">{t('title')}</h1>
      <p className="max-w-2xl text-sm sm:text-base text-sub leading-relaxed">{t('description')}</p>
      <p className="text-xs text-muted max-w-2xl">{t('privacySummary')}</p>
    </header>

    {shared && <section className="ui-card p-5 space-y-2" aria-label={t('sharedSummary')}>
      <p className="text-sm font-semibold text-sub">{t('sharedSummary')} · {t(`modes.${shared.mode}.label`)}</p>
      <p className="text-3xl font-bold text-fg tabular-nums">{shared.seconds ? t('seconds', { value: shared.seconds }) : t('words', { value: shared.words })}</p>
      {shared.seconds && <p className="text-sub">{t('words', { value: shared.words })}</p>}
      <p className="text-xs text-muted">{t('sharedHint')}</p>
    </section>}

    <div className="flex flex-wrap justify-between gap-3 items-center">
      <div className="grid grid-cols-2 bg-soft rounded-2xl p-1 gap-1 w-full sm:w-80" role="group" aria-label={t('modeLabel')}>
        {(['intro', 'report'] as const).map(mode => <button key={mode} data-speaking-mode={mode} disabled={busy} aria-pressed={session.mode === mode} onClick={() => { if (mode !== session.mode) begin(mode) }} className={`min-h-11 rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors motion-reduce:transition-none disabled:opacity-50 ${session.mode === mode ? 'bg-primary text-white' : 'text-sub hover:bg-track'}`}>{t(`modes.${mode}.label`)}</button>)}
      </div>
      {session.takes.length > 0 && <button data-speaking-new="" className="ui-btn-soft min-h-11 px-4 py-2" disabled={busy} onClick={() => begin(session.mode)}>{t('newSession')}</button>}
    </div>

    {(progress || activeError) && <div className="sticky top-16 z-20 space-y-2">
      {progress && <div className="ui-card p-4 space-y-3" role="status" aria-live="polite">
          <div className="flex justify-between gap-3 text-sm text-body"><span>{t(`stages.${progress.stage}`)}</span>{progress.progress !== undefined && <span className="tabular-nums">{t('loadingProgress', { percent: Math.round(Math.max(0, Math.min(1, progress.progress)) * 100) })}</span>}</div>
          <progress aria-label={t(`stages.${progress.stage}`)} max={1} value={progress.progress} className="w-full h-2 accent-primary" />
          <button onClick={cancel} className="ui-btn-soft min-h-11 px-4 py-2">{t('cancel')}</button>
        </div>}
        {activeError && <p role="alert" className="bg-amber-50 text-amber-800 text-sm leading-relaxed p-4 rounded-xl">{t(`errors.${activeError}`)}</p>}
    </div>}

    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
      <section className="ui-card p-4 sm:p-7 space-y-3 sm:space-y-5 min-w-0" aria-label={t('stepRecord')}>
        <MobileResultLink href="#speaking-practice-result" label={t('jumpResult')} value={selected ? t('take', { number: selectedNumber }) : t('basic.title')} />
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted"><span className="text-primary font-semibold">{t('stepRecord')}</span><span>{t('stepReview')}</span><span>{t('stepRetry')}</span></div>
        <div><h2 className="text-lg sm:text-xl font-semibold text-fg leading-relaxed break-keep">{t(`modes.${session.mode}.question`)}</h2><p className="text-sm text-sub mt-2">{t(`modes.${session.mode}.hint`)}</p></div>

        <div>
          <label htmlFor="speaking-session-title" className="block text-sm font-semibold text-body mb-2">{t('records.nameLabel')}</label>
          <input id="speaking-session-title" data-speaking-title="" value={session.title ?? ''} maxLength={MAX_SPEAKING_TITLE} disabled={busy && !saving} onChange={event => updateTitle(event.target.value)} placeholder={t('records.namePlaceholder')} className="ui-field w-full min-h-11 px-4 py-3 text-base" />
          <div className="flex justify-between gap-3 mt-2 text-xs text-muted"><p>{t('records.nameHint')}</p><span className="shrink-0 tabular-nums">{t('chars', { count: (session.title ?? '').length, max: MAX_SPEAKING_TITLE })}</span></div>
        </div>

        <fieldset className="space-y-2" disabled={busy}>
          <legend className="mb-2 text-sm font-semibold text-body">{t('preparation.label')}</legend>
          <div className="grid grid-cols-3 gap-2">{([0, 3, 5] as const).map(delay => <button key={delay} type="button" data-speaking-preparation={delay} aria-pressed={preparationSeconds === delay}
            onClick={() => { if (canInteract()) setPreparationSeconds(delay) }} disabled={busy}
            className={`min-h-11 rounded-xl px-2 py-2 text-sm font-medium disabled:opacity-50 ${preparationSeconds === delay ? 'bg-primary text-white' : 'bg-soft text-body'}`}>{t(delay === 0 ? 'preparation.immediate' : delay === 3 ? 'preparation.three' : 'preparation.five')}</button>)}</div>
          <p className="text-xs leading-relaxed text-muted">{t('preparation.hint')}</p>
        </fieldset>
        <div data-speaking-recorder-phase={recorder.phase} className="rounded-2xl bg-subtle p-4 sm:p-5 text-center">
          {recorder.preparing && <div className="mb-3 space-y-2"><p data-speaking-countdown={recorder.remaining} className="text-5xl font-bold tabular-nums text-fg" aria-hidden="true">{recorder.remaining}</p><p className="text-sm text-body" role="status" aria-live="polite">{t('preparation.remaining', { seconds: recorder.remaining })}</p></div>}
          <p className="text-5xl font-bold tabular-nums text-fg" role="timer" aria-label={t('durationLabel')}>{String(Math.floor(recorder.seconds / 60)).padStart(2, '0')}:{String(recorder.seconds % 60).padStart(2, '0')}</p>
          <div className="h-1.5 rounded-full bg-track overflow-hidden my-3 sm:my-4" role="meter" aria-label={t('microphoneLevel')} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(recorder.level * 100)}><div className="h-full bg-primary rounded-full motion-reduce:transition-none transition-[width]" style={{ width: `${recorder.level * 100}%` }} /></div>
          <button data-speaking-record="" className="ui-btn w-full sm:w-auto min-h-12 px-6 py-3 inline-flex items-center justify-center gap-2 disabled:opacity-40" disabled={!recorder.recording && (busy || atLimit)} onClick={() => { if (recorder.recording) recorder.stop(); else startRecording() }}>
            {recorder.recording ? <Square size={18} aria-hidden="true" /> : <Mic size={18} aria-hidden="true" />}{t(recorder.recording ? 'stop' : recorder.requesting ? 'requesting' : recorder.preparing ? 'preparation.preparing' : recorder.phase === 'stopping' ? 'preparation.finishing' : session.takes.length ? 'rerecord' : 'record')}
          </button>
          {(recorder.requesting || recorder.preparing) && <button data-speaking-record-cancel="" onClick={recorder.cancelRequest} className="ui-btn-soft mt-2 sm:mt-0 sm:ml-2 min-h-11 px-3 py-2">{t('cancel')}</button>}
          <p className="text-xs text-muted mt-3 leading-relaxed">{t(recorder.recording ? 'recordingHint' : atLimit ? 'takeLimit' : 'idleHint')}</p>
        </div>

        <div className="flex flex-wrap gap-2">
          <label className={`ui-btn-soft inline-flex items-center px-4 py-2.5 min-h-11 text-sm cursor-pointer ${busy || atLimit ? 'opacity-40' : ''}`}>
            {t('upload')}<input data-speaking-file="" type="file" accept="audio/*" aria-label={t('upload')} disabled={busy || atLimit} className="sr-only" onChange={event => { const file = event.target.files?.[0]; event.target.value = ''; void importAudio(file) }} />
          </label>
          <button data-speaking-text-take="" className="ui-btn-soft px-4 py-2.5 min-h-11 text-sm disabled:opacity-40" disabled={busy || atLimit} onClick={() => { if (canInteract() && !controls.current.atLimit) appendTake() }}>{t('textTake')}</button>
        </div>
        <p className="text-xs text-muted">{t('uploadHint')}</p>

        {session.takes.length > 0 && <>
          <div className="flex flex-wrap gap-2" role="group" aria-label={t('compareTitle')}>{session.takes.map((take, index) => <button key={take.id} data-speaking-take={take.id} disabled={busy} aria-pressed={take.id === selected?.id} className={`rounded-xl min-h-11 px-3 py-2 text-sm ${take.id === selected?.id ? 'bg-primary text-white' : 'bg-soft text-sub'}`} onClick={() => { if (canInteract()) { setSelectedId(take.id); setError(null) } }}>{t('take', { number: index + 1 })}</button>)}</div>
          {selected && <>
            <TakeAudio take={selected} label={t('take', { number: selectedNumber })} />
            {selected.audio && <div className="space-y-2"><button onClick={() => void transcribe()} disabled={busy} className="ui-btn-soft px-4 py-2.5 min-h-11 w-full disabled:opacity-40">{t('transcribe')}</button><p className="text-xs text-muted leading-relaxed">{t('speechDownload')}</p></div>}
            <div><label htmlFor="speaking-transcript" className="block text-sm font-semibold text-body mb-2">{t('transcript')}</label>
              <textarea id="speaking-transcript" value={selected.transcript} maxLength={MAX_TEXT} disabled={busy && !saving} rows={7} placeholder={t('placeholder')} onChange={event => { if (canInteract(true)) updateTake(selected.id, { transcript: event.target.value, feedback: undefined }) }} className="ui-field w-full min-h-40 px-4 py-3 text-base leading-relaxed resize-y" />
              <div className="flex justify-between items-start gap-3 mt-2 text-xs text-muted"><p>{t('transcriptHint')}</p><span className="shrink-0 tabular-nums">{t('chars', { count: selected.transcript.length, max: MAX_TEXT })}</span></div>
            </div>
            <a href="#speaking-practice-result" className="ui-btn flex justify-center items-center w-full min-h-12 px-4 py-3">{t('basic.view')}</a>
            <p className="text-xs text-muted">{t('basic.noDownload')}</p>
          </>}
        </>}

      </section>

      <section id="speaking-practice-result" className="space-y-5 min-w-0 scroll-mt-20" aria-label={t('resultTitle')}>
        {!selected ? <div className="ui-card bg-subtle p-5 sm:p-7 space-y-5">
          <p className="text-xs font-semibold text-primary">{t('sampleBadge')}</p>
          <h2 className="text-2xl font-semibold text-fg leading-snug">{t('sampleTitle')}</h2>
          <div className="space-y-2"><p className="text-xs font-semibold text-muted">{t('basic.sample')}</p><p className="text-body leading-relaxed">{t(`modes.${session.mode}.sample`)}</p></div>
          <p className="text-sm text-body">{t('basic.preview')}</p>
          <p className="text-xs text-muted leading-relaxed">{t('sampleNote')}</p>
        </div> : <>
          <div className="ui-card p-5 sm:p-7 space-y-5">
            <div className="flex justify-between gap-2 items-center"><h2 className="text-lg font-semibold text-fg">{t('resultTitle')}</h2><span className="text-xs text-sub">{t('take', { number: selectedNumber })}</span></div>
            <div className="grid grid-cols-3 gap-3">
              {[{ label: t('durationLabel'), value: durationText(metrics.seconds) }, { label: t('wordsLabel'), value: t('words', { value: metrics.words }) }, { label: t('paceLabel'), value: metrics.pace === null ? t('noPace') : t('pace', { value: metrics.pace }) }].map(stat => <div key={stat.label} className="min-w-0"><p className="text-xs text-muted">{stat.label}</p><p className="text-lg sm:text-xl font-bold text-fg tabular-nums mt-1 break-words">{stat.value}</p></div>)}
            </div>
            <p className="text-xs text-muted leading-relaxed">{t('metricsNote')}</p>
            <BasicCheck mode={session.mode} take={selected} />
            <button data-speaking-rerecord="" disabled={busy || atLimit} onClick={startRecording} className="ui-btn w-full min-h-12 py-3 px-4 disabled:opacity-40">{t('basic.retry')}</button>
            {selected.feedback ? <div className="space-y-5" data-testid="speaking-feedback">
              <h3 className="font-semibold text-fg border-t border-line pt-4">{t('coaching.result')}</h3>
              {[{ title: t('strength'), text: selected.feedback.strength, quote: selected.feedback.strengthQuote }, { title: t('improve'), text: selected.feedback.improve, quote: selected.feedback.improveQuote }].map(item => <div key={item.title} className="border-t border-line pt-4"><h3 className="font-semibold text-fg mb-2">{item.title}</h3>{item.quote && <blockquote className="text-sm text-sub border-l-2 border-line-strong pl-3 mb-2">“{item.quote}”</blockquote>}<p className="text-sm text-body leading-relaxed">{item.text}</p></div>)}
              <div className="bg-subtle rounded-2xl p-5"><h3 className="text-sm font-semibold text-fg mb-3">{t('after')}</h3><p className="text-body whitespace-pre-wrap leading-relaxed">{selected.feedback.rewrite}</p><button onClick={() => void copyRewrite()} className="ui-btn-soft px-3 py-2 min-h-11 text-sm mt-3">{t(copied ? 'copied' : 'copy')}</button></div>
              <div><h3 className="font-semibold text-fg mb-2">{t('next')}</h3><p className="text-sm text-body leading-relaxed">{selected.feedback.next}</p></div>
              <p className="text-xs text-muted leading-relaxed">{t('feedbackNote')}</p>
              <p className="text-xs text-faint break-all">{selected.feedback.model}</p>
            </div> : null}
          </div>

          {first && selected.id !== first.id && <div className="ui-card p-5 sm:p-7 space-y-4" data-testid="speaking-comparison">
            <h2 className="text-lg font-semibold text-fg">{t('compareTitle')}</h2><p className="text-sm text-sub">{t('compareHint')}</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">{[{ take: first, stats: firstMetrics, label: t('firstTake') }, { take: selected, stats: metrics, label: t('currentTake') }].map(({ take, stats, label }) => <div key={take.id} className="bg-subtle rounded-2xl p-4 min-w-0 space-y-3"><h3 className="font-semibold text-fg">{label}</h3><p className="text-xl font-bold text-fg tabular-nums">{durationText(stats.seconds)}</p><p className="text-xs text-sub">{t('words', { value: stats.words })}{stats.pace !== null ? ` · ${t('pace', { value: stats.pace })}` : ''}</p>{stats.targetGap !== null && <p className="text-xs text-muted">{t('gapLabel')} · {t('seconds', { value: stats.targetGap })}</p>}{take.transcript.trim() && <p className="text-xs text-sub">{t('basic.comparison', { fillers: basicSpeakingCheck(session.mode, take.transcript, take.seconds).fillerCount, repeats: basicSpeakingCheck(session.mode, take.transcript, take.seconds).repeats.length })}</p>}<TakeAudio take={take} label={label} /><p className="text-sm leading-relaxed text-body whitespace-pre-wrap break-words">{take.transcript}</p></div>)}</div>
          </div>}

          <div className="ui-card p-5 space-y-3">
            <button data-speaking-save="" disabled={busy} onClick={() => void save()} className="ui-btn w-full min-h-11 px-4 py-3 disabled:opacity-40">{t(saved && !dirty ? 'saved' : 'save')}</button>
            <p className="text-xs text-sub" role="status">{dirty ? t('unsaved') : saved ? t('saved') : ''}</p>
            {savedRefreshFailed && <p className="text-sm text-sub" role="status">{t('records.savedRefreshFailed')}</p>}
            <div className="flex flex-wrap gap-2"><button disabled={busy} onClick={exportText} className="ui-btn-soft min-h-11 px-3 py-2 text-sm">{t('exportText')}</button>{selected.audio && <button onClick={exportAudio} className="ui-btn-soft min-h-11 px-3 py-2 text-sm">{t('exportAudio')}</button>}</div>
            <p className="text-xs text-muted">{t('exportHint')}</p>
          </div>

          <section className="ui-card p-5 space-y-3" aria-label={t('coaching.title')}>
            <h2 className="text-lg font-semibold text-fg">{t('coaching.title')}</h2><p className="text-sm text-sub leading-relaxed">{t('coaching.description')}</p>
            <button disabled={busy} aria-expanded={coachingOpen} aria-controls="speaking-coaching-options" onClick={() => { setCoachingOpen(!coachingOpen); setCoachingAllowed(false); ai.current?.releaseCoaching() }} className="ui-btn-soft w-full min-h-11 px-4 py-3 disabled:opacity-40">{t(coachingOpen ? 'coaching.close' : 'coaching.open')}</button>
            {coachingOpen && <div id="speaking-coaching-options" className="space-y-3 pt-2">
              <p className="text-sm text-body leading-relaxed">{t('modelHint')}</p>
              <p className="text-xs text-sub" role="status">{t(gpu === null ? 'gpuCheck' : gpu ? 'gpuReady' : 'gpuUnavailable')}</p>
              <label className="flex items-start gap-3 min-h-11 bg-subtle rounded-xl p-4 text-sm text-body leading-relaxed cursor-pointer"><input type="checkbox" checked={coachingAllowed} disabled={busy || gpu !== true} onChange={event => { setCoachingAllowed(event.target.checked); if (!event.target.checked) ai.current?.releaseCoaching() }} className="mt-1 h-5 w-5 shrink-0 accent-primary" /><span>{t('coaching.consent')}</span></label>
              <button onClick={() => void feedback()} disabled={busy || !coachingAllowed || gpu !== true || selected.transcript.trim().length < 10} className="ui-btn w-full min-h-12 px-4 py-3 disabled:opacity-40">{t(selected.feedback ? 'feedbackAgain' : 'feedback')}</button>
              <button disabled={busy} onClick={() => void removeCoachingDownload()} className="ui-btn-soft w-full min-h-11 px-4 py-2 text-sm disabled:opacity-40">{t(clearingCache ? 'coaching.removing' : 'coaching.remove')}</button>
              <p className="text-xs text-muted" role="status">{t(cacheRemoved ? 'coaching.removed' : 'coaching.cacheHint')}</p>
            </div>}
          </section>

          <details className="ui-card p-5"><summary className="min-h-11 text-sm font-semibold text-fg cursor-pointer">{t('shareTitle')}</summary><p className="text-xs text-muted mb-4">{t('shareHint')}</p><ShareResult url={shareUrl} text={t('shareText')} fileName="toolhub-speaking-summary" card={{ tool: t('title'), label: t('shareLabel', { mode: t(`modes.${session.mode}.label`) }), headline: metrics.seconds === null ? t('words', { value: metrics.words }) : t('seconds', { value: metrics.seconds }), rows: [{ label: t('wordsLabel'), value: t('words', { value: metrics.words }) }, { label: t('paceLabel'), value: metrics.pace === null ? t('noPace') : t('pace', { value: metrics.pace }) }] }} /></details>
        </>}
      </section>
    </div>

    <section data-speaking-history="" className="ui-card p-5 sm:p-7 space-y-4" aria-label={t('historyTitle')}>
      <h2 className="text-xl font-semibold text-fg">{t('historyTitle')}</h2><p className="text-sm text-sub leading-relaxed max-w-3xl">{t('historyHint')}</p>
      <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-3">
        <div><label htmlFor="speaking-history-search" className="block text-sm text-body mb-2">{t('records.searchLabel')}</label><input id="speaking-history-search" type="search" value={historyQuery} onChange={event => setHistoryQuery(event.target.value)} placeholder={t('records.searchPlaceholder')} className="ui-field w-full min-h-11 px-4 py-3 text-base" /></div>
        <div><label htmlFor="speaking-history-filter" className="block text-sm text-body mb-2">{t('records.filterLabel')}</label><select id="speaking-history-filter" value={historyMode} onChange={event => setHistoryMode(event.target.value as SpeakingRecordFilter)} className="ui-field w-full min-h-11 px-4 py-3 text-base"><option value="all">{t('records.allModes')}</option><option value="intro">{t('modes.intro.label')}</option><option value="report">{t('modes.report.label')}</option></select></div>
      </div>
      <button data-speaking-refresh="" disabled={historyLoading || saving} onClick={() => void refreshRecords().then(result => { if (mounted.current && result === 'loaded') setSavedRefreshFailed(false) })} className="ui-btn-soft min-h-11 px-4 py-2 text-sm disabled:opacity-40">{t('records.refresh')}</button>
      <p className="text-xs text-muted">{t('records.refreshHint')}</p>
      {historyFailed && <p role="alert" className="text-sm text-sub">{t('records.refreshFailed')}</p>}
      {recordList.unreadableCount > 0 && <p role="status" className="text-sm text-sub">{t('records.unreadable', { count: recordList.unreadableCount })}</p>}
      {recordList.unsupportedCount > 0 && <p role="status" className="text-sm text-sub">{t('records.unsupported', { count: recordList.unsupportedCount })}</p>}
      {historyLoading ? <p className="text-sm text-muted">{t('historyLoading')}</p> : visibleRecords.length === 0 ? <p className="text-sm text-muted py-5">{t(historyFailed ? 'records.listUnavailable' : recordList.records.length === 0 ? recordList.totalCount > 0 ? 'records.noReadable' : 'noHistory' : 'records.noMatches')}</p> : <ul className="divide-y divide-line">{visibleRecords.map(record => <li key={record.session.id} data-speaking-record={record.session.id} className="flex flex-wrap items-center justify-between gap-3 py-4"><div className="min-w-0 max-w-full"><p data-speaking-record-title="" className="text-sm font-semibold text-fg break-words">{record.session.title?.trim() || t('historyItem', { mode: t(`modes.${record.session.mode}.label`), count: record.session.takes.length })}</p>{record.session.title?.trim() && <p className="text-xs text-sub mt-1">{t('historyItem', { mode: t(`modes.${record.session.mode}.label`), count: record.session.takes.length })}</p>}<time dateTime={new Date(record.session.updatedAt).toISOString()} className="text-xs text-muted">{new Date(record.session.updatedAt).toLocaleString('ko-KR')}</time></div><div className="flex gap-2"><button disabled={busy} onClick={() => openRecord(record)} className="ui-btn-soft min-h-11 px-4 py-2 text-sm">{t('open')}</button><button disabled={busy} onClick={() => void removeRecord(record)} className="min-h-11 px-3 py-2 text-sm text-muted hover:text-fg">{t('remove')}</button></div></li>)}</ul>}
    </section>

    <section className="ui-card p-5 sm:p-7 space-y-4"><h2 className="text-xl font-semibold text-fg">{t('guideTitle')}</h2><ol className="list-decimal pl-5 text-sm text-body space-y-3 leading-relaxed">{(t.raw('guideSteps') as string[]).map(step => <li key={step}>{step}</li>)}</ol><div className="divide-y divide-line">{(t.raw('faq') as { q: string; a: string }[]).map(item => <details key={item.q} className="py-3"><summary className="min-h-11 cursor-pointer text-sm font-semibold text-fg">{item.q}</summary><p className="text-sm text-sub leading-relaxed pb-2">{item.a}</p></details>)}</div><p className="text-xs text-muted">{t('modelsTitle')}: <a className="text-primary hover:underline" href="https://huggingface.co/onnx-community/whisper-tiny" target="_blank" rel="noopener noreferrer">Whisper tiny</a> · <a className="text-primary hover:underline" href="https://huggingface.co/Qwen/Qwen3-1.7B" target="_blank" rel="noopener noreferrer">Qwen3</a> · <a className="text-primary hover:underline" href="https://webllm.mlc.ai/" target="_blank" rel="noopener noreferrer">WebLLM</a></p></section>
  </div>
}
