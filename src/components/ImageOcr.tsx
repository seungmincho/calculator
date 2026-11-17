'use client'

import { useState, useCallback, useRef, useEffect, useMemo, useLayoutEffect, DragEvent } from 'react'
import { useTranslations } from '@/lib/i18n'
import '@/lib/i18n/ns/imageOcr'
import { Copy, Check, Download, Upload, Camera, RotateCcw, RotateCw, X, Loader2, AlertCircle } from 'lucide-react'
import type { Worker } from 'tesseract.js'
import { preprocessPixels, prepScale, type PrepMode, type CleanOptions } from '@/utils/ocr'
import { saveTextHandoff, TEXT_HANDOFF_LIMIT } from '@/utils/textHandoff'
import { createOcrQueue, appendOcrItems, beginOcrJob, completeOcrJob, editOcrText, rotateOcrItem, removeOcrItem, setOcrPaused, retryOcrFailures, prepareOcrConfirmation, applyOcrConfirmation, isOcrJobCurrent, ocrItemText, type OcrQueueState, type OcrQueueItem, type OcrQueueJob, type OcrConfirmedAction, type OcrConfirmation } from '@/utils/ocrQueue'
import { createOcrWorkerSession, type OcrSessionRun } from '@/lib/ocr/workerSession'
import { useOptionalLanguage } from '@/contexts/LanguageContext'
import OcrCopyRecovery, { type OcrCopyFailure } from '@/components/OcrCopyRecovery'
import { copyShareResultLink, createShareResultRequests, type ShareResultToken } from '@/utils/shareResultActions'
import { downloadOcrText } from '@/utils/ocrOutput'

type OcrOutputOwner = ReturnType<typeof createShareResultRequests>
type OcrOutputState = { owner: OcrOutputOwner; token: ShareResultToken } & (
  { kind: 'copy'; id: 'result' | 'all'; text: string; label: string; status: 'copying' | 'copied' | 'failed' } |
  { kind: 'notice'; code: 'empty' | 'downloadStarted' | 'downloadFailed' }
)

interface OcrWord { text: string; confidence: number; x0: number; y0: number; x1: number; y1: number }
type Item = OcrQueueItem<File> & { readonly words: readonly OcrWord[]; readonly conf: number; readonly key: string }
type Recognition = Awaited<ReturnType<Worker['recognize']>>
type OcrSession = ReturnType<typeof createOcrWorkerSession<HTMLCanvasElement, Recognition>>

const LANGUAGE_OPTIONS = [
  { code: 'kor', labelKey: 'languages.kor' },
  { code: 'eng', labelKey: 'languages.eng' },
  { code: 'jpn', labelKey: 'languages.jpn' },
  { code: 'chi_sim', labelKey: 'languages.chiSim' },
  { code: 'chi_tra', labelKey: 'languages.chiTra' },
]
const PREP_MODES: PrepMode[] = ['off', 'gray', 'binary']
const LOW_CONF = 60

const prepKey = (it: Item, mode: PrepMode) => `${it.id}|${it.rotation}|${mode}`

/** 회전 + 확대 + 흑백/이진화된 인식용 캔버스 */
async function prepareCanvas(file: File, rotation: number, mode: PrepMode): Promise<HTMLCanvasElement> {
  const src = URL.createObjectURL(file)
  try {
    const img = new Image()
    img.src = src
    await img.decode()
    const s = prepScale(img.naturalWidth, img.naturalHeight, mode)
    const w = Math.round(img.naturalWidth * s), h = Math.round(img.naturalHeight * s)
    const swap = rotation === 90 || rotation === 270
    const canvas = document.createElement('canvas')
    canvas.width = swap ? h : w
    canvas.height = swap ? w : h
    const ctx = canvas.getContext('2d', { willReadFrequently: true })!
    ctx.imageSmoothingQuality = 'high'
    ctx.translate(canvas.width / 2, canvas.height / 2)
    ctx.rotate((rotation * Math.PI) / 180)
    ctx.drawImage(img, -w / 2, -h / 2, w, h)
    if (mode !== 'off') {
      const data = ctx.getImageData(0, 0, canvas.width, canvas.height)
      preprocessPixels(data.data, mode)
      ctx.putImageData(data, 0, 0)
    }
    return canvas
  } finally {
    URL.revokeObjectURL(src)
  }
}

export default function ImageOcr() {
  const t = useTranslations('imageOcr')
  const language = useOptionalLanguage()?.language ?? 'ko'

  const [queue, setQueue] = useState(() => createOcrQueue<File>())
  const [activeId, setActiveId] = useState<number | null>(null)
  const [selectedLangs, setSelectedLangs] = useState<string[]>(['kor', 'eng'])
  const [mode, setMode] = useState<PrepMode>('gray')
  const clean = queue.clean
  const [confirmation, setConfirmation] = useState<OcrConfirmation | null>(null)
  const [confirmationChanged, setConfirmationChanged] = useState(false)
  const [retryQueued, setRetryQueued] = useState(false)
  const [view, setView] = useState<'prepared' | 'original'>('prepared')
  const [showConfidence, setShowConfidence] = useState(true)
  const [prepared, setPrepared] = useState<{ key: string; url: string; w: number; h: number } | null>(null)
  const [stage, setStage] = useState('')
  const [progress, setProgress] = useState(0)
  const [outputState, setOutputState] = useState<OcrOutputState | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [handoffError, setHandoffError] = useState('')
  const [textSelection, setTextSelection] = useState<[number, number]>([0, 0])
  const resultTextRef = useRef<HTMLTextAreaElement>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const nextId = useRef(1)
  const queueRef = useRef(queue), sessionRef = useRef<OcrSession | null>(null), mounted = useRef(false)
  const activeRun = useRef<{ job: OcrQueueJob; request: OcrSessionRun<Recognition> | null } | null>(null)
  const dispatch = useCallback((change: (state: OcrQueueState<File>) => OcrQueueState<File>) => {
    const next = change(queueRef.current); queueRef.current = next; setQueue(next)
  }, [])
  const items: Item[] = queue.items.map(item => ({ ...item, words: item.success?.words ?? [], conf: item.success?.confidence ?? 0, key: item.success ? `${item.id}|${item.success.settings.rotation}|${item.success.settings.mode}` : '' }))
  const itemsRef = useRef(items)
  itemsRef.current = items

  const active = items.find(i => i.id === activeId) ?? null
  const busy = queue.active !== null
  const outputScope = JSON.stringify([queue.revision, activeId, selectedLangs.join('+'), mode, language, t('output.current'), t('output.failed', { label: '' })])
  const outputOwner = useMemo(() => createShareResultRequests(outputScope), [outputScope])
  const outputOwnerRef = useRef(outputOwner)
  useLayoutEffect(() => {
    outputOwnerRef.current = outputOwner; outputOwner.activate()
    return () => outputOwner.dispose()
  }, [outputOwner])
  const outputCurrent = () => mounted.current && outputOwnerRef.current === outputOwner && queueRef.current.revision === queue.revision
  const output = outputState?.owner === outputOwner && outputOwner.current(outputState.token) ? outputState : null
  const copiedId = output?.kind === 'copy' && output.status === 'copied' ? output.id : null
  const failureCurrent = (failure: OcrCopyFailure) => outputCurrent() && output?.kind === 'copy' && output.status === 'failed' && output === failure && outputOwner.current(output.token)

  // 언마운트 시 워커 종료 + 미리보기 URL 해제
  useEffect(() => {
    mounted.current = true
    const session = createOcrWorkerSession<HTMLCanvasElement, Recognition>({ async create(langs, logger, current) {
      const { createWorker } = await import('tesseract.js')
      if (!current()) throw Error('Cancelled OCR initialization')
      // Tesseract rejects its job promise and also throws without an error handler.
      // The session handles the rejection and preserves the previous manuscript.
      const worker = await createWorker(langs, 1, { logger, errorHandler: () => {} })
      return {
        reinitialize: (nextLangs, jobId) => worker.reinitialize(nextLangs, undefined, undefined, jobId),
        recognize: (canvas, jobId) => worker.recognize(canvas, {}, { text: true, blocks: true }, jobId),
        terminate: () => worker.terminate(),
      }
    } })
    sessionRef.current = session
    return () => {
      mounted.current = false; session.dispose()
      if (sessionRef.current === session) sessionRef.current = null
      itemsRef.current.forEach(i => URL.revokeObjectURL(i.url))
    }
  }, [])

  const addFiles = useCallback((files: File[]) => {
    const imgs = files.filter(f => f.type.startsWith('image/'))
    if (!imgs.length) return
    const added = imgs.map(file => ({ id: nextId.current++, file, url: URL.createObjectURL(file) }))
    dispatch(prev => appendOcrItems(prev, added))
    setActiveId(added[0].id)
  }, [dispatch])

  // Ctrl+V 붙여넣기 (페이지 어디서나)
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const files = Array.from(e.clipboardData?.items ?? [])
        .filter(it => it.type.startsWith('image/'))
        .map(it => it.getAsFile())
        .filter((f): f is File => !!f)
      if (files.length) { e.preventDefault(); addFiles(files) }
    }
    document.addEventListener('paste', onPaste)
    return () => document.removeEventListener('paste', onPaste)
  }, [addFiles])

  // 대기열 처리: pending 하나씩 순서대로
  useEffect(() => {
    const session = sessionRef.current
    if (!session || !mounted.current) return
    const started = beginOcrJob(queueRef.current, { langs: selectedLangs.join('+'), mode })
    const job = started.job
    if (!job) return
    const source = started.state.items.find(item => item.id === job.itemId)!
    dispatch(() => started.state)
    const run = { job, request: null as OcrSessionRun<Recognition> | null }; activeRun.current = run
    const current = () => mounted.current && sessionRef.current === session && isOcrJobCurrent(queueRef.current, job)
    setProgress(0)
    setStage('initializing')
    ;(async () => {
      try {
        const canvas = await prepareCanvas(source.file, job.settings.rotation, job.settings.mode)
        if (!current()) return
        run.request = session.run({ source: canvas, langs: job.settings.langs, isCurrent: current,
          onPhase: phase => { if (current()) setStage(phase) },
          onProgress: message => { if (current()) { setStage(message.status); setProgress(Math.round((message.progress ?? 0) * 100)) } },
        })
        const outcome = await run.request.done
        if (!current()) return
        if (outcome.status !== 'done') { dispatch(state => completeOcrJob(state, job, null)); return }
        const { data } = outcome.result
        const words: OcrWord[] = []
        for (const b of data.blocks ?? []) for (const p of b.paragraphs) for (const l of p.lines) for (const w of l.words) {
          if (w.text.trim()) words.push({ text: w.text, confidence: w.confidence, ...w.bbox })
        }
        dispatch(state => completeOcrJob(state, job, { raw: data.text, words, confidence: data.confidence }))
      } catch {
        if (current()) dispatch(state => completeOcrJob(state, job, null))
      } finally {
        if (activeRun.current === run) { activeRun.current = null; if (mounted.current) setStage('') }
      }
    })()
  }, [queue, selectedLangs, mode, dispatch])

  // 인식용 이미지 미리보기 (보정 전/후 비교)
  const activeKey = active ? prepKey(active, mode) : ''
  useEffect(() => {
    let cancelled = false
    let url = ''
    queueMicrotask(() => { if (!cancelled) setPrepared(null) })
    if (!active) return () => { cancelled = true }
    prepareCanvas(active.file, active.rotation, mode).then(c => c.toBlob(b => {
      if (cancelled || !b) return
      url = URL.createObjectURL(b)
      setPrepared({ key: activeKey, url, w: c.width, h: c.height })
    }, 'image/png')).catch(() => { if (!cancelled) setPrepared(null) })
    return () => { cancelled = true; if (url) URL.revokeObjectURL(url) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeKey])

  const updateItem = (id: number, patch: { edited?: string; rotation?: number }) => dispatch(state => patch.edited !== undefined ? editOcrText(state, id, patch.edited) : patch.rotation !== undefined ? rotateOcrItem(state, id, patch.rotation) : state)

  const textOf = useCallback((i: Item) => ocrItemText(i, clean), [clean])
  const readRecognizedText = (selectionOnly: boolean) => {
    if (!outputCurrent() || !active?.success) return
    outputOwner.invalidate(); setOutputState(null)
    const text = textOf(active)
    const textarea = resultTextRef.current
    const selected = selectionOnly && textarea ? text.slice(textarea.selectionStart, textarea.selectionEnd) : text
    try { saveTextHandoff(selected); window.location.assign('/text-to-speech/?from=ocr') }
    catch (cause) { setHandoffError(cause instanceof Error && cause.message === 'textTooLong' ? 'handoff.tooLong' : 'handoff.storageFailed') }
  }

  const removeItem = (id: number) => {
    const it = items.find(i => i.id === id)
    if (it) URL.revokeObjectURL(it.url)
    const wasRunning = queueRef.current.active?.itemId === id
    const rest = items.filter(i => i.id !== id)
    dispatch(state => removeOcrItem(state, id))
    if (wasRunning) { activeRun.current?.request?.cancel(); sessionRef.current?.cancelAll() }
    if (activeId === id) setActiveId(rest[0]?.id ?? null)
  }

  const applyAction = (permission: OcrConfirmation) => {
    const oldItems = queueRef.current.items, result = applyOcrConfirmation(queueRef.current, permission)
    setConfirmation(null)
    if (!result.ok) { setConfirmationChanged(true); return }
    dispatch(() => result.state); setConfirmationChanged(false)
    if (permission.action.kind === 'reset') {
      sessionRef.current?.cancelAll(); oldItems.forEach(item => URL.revokeObjectURL(item.url)); setActiveId(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }
  const requestAction = (action: OcrConfirmedAction) => {
    const permission = prepareOcrConfirmation(queueRef.current, action)
    setConfirmationChanged(false)
    if (permission.editedCount > 0) setConfirmation(permission); else applyAction(permission)
  }
  const handleReset = () => requestAction({ kind: 'reset' })
  const rerun = (all: boolean) => requestAction({ kind: 'rerun', ids: queueRef.current.items.filter(item => all || item.id === activeId).map(item => item.id) })

  const toggleLanguage = (code: string) =>
    setSelectedLangs(prev => prev.includes(code) ? (prev.length === 1 ? prev : prev.filter(l => l !== code)) : [...prev, code])

  const setCleanOpt = (k: keyof CleanOptions, v: boolean) => {
    requestAction({ kind: 'cleanup', clean: { ...queueRef.current.clean, [k]: v } })
  }

  const copyToClipboard = async (text: string, id: 'result' | 'all') => {
    if (!outputCurrent()) return
    const token = outputOwner.begin()
    if (!token) return
    if (!text) { setOutputState({ owner: outputOwner, token, kind: 'notice', code: 'empty' }); return }
    const snapshot = Object.freeze({ owner: outputOwner, token, kind: 'copy' as const, id, text, label: t(id === 'result' ? 'output.current' : 'output.all'), status: 'copying' as const })
    setOutputState(snapshot)
    const current = () => outputCurrent() && outputOwner.current(token)
    const outcome = await copyShareResultLink(text, current)
    if (!current() || outcome === 'stale') return
    setOutputState(Object.freeze({ ...snapshot, status: outcome }))
    if (outcome === 'copied') outputOwner.later(token, () => setOutputState(previous => previous?.token === token ? null : previous), 2000)
  }

  const doneItems = items.filter(i => i.success !== null)
  const allText = doneItems.map(textOf).join('\n\n')

  const handleDownloadTxt = () => {
    if (!outputCurrent()) return
    const token = outputOwner.begin()
    if (!token) return
    const outcome = downloadOcrText(allText, () => outputCurrent() && outputOwner.current(token))
    if (outcome !== 'stale' && outputOwner.current(token)) setOutputState({ owner: outputOwner, token, kind: 'notice', code: outcome === 'started' ? 'downloadStarted' : outcome === 'empty' ? 'empty' : 'downloadFailed' })
  }

  const hasFiles = (e: DragEvent<HTMLDivElement>) => e.dataTransfer.types.includes('Files')
  const onDragOver = (e: DragEvent<HTMLDivElement>) => { if (!hasFiles(e)) return; e.preventDefault(); setIsDragging(true) }
  const onDragLeave = (e: DragEvent<HTMLDivElement>) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setIsDragging(false)
  }
  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    if (!hasFiles(e)) return
    e.preventDefault()
    setIsDragging(false)
    addFiles(Array.from(e.dataTransfer.files))
  }

  const stageLabel = stage === 'waiting' ? t('jobs.resourceWaiting') : stage.includes('recogniz') ? t('stages.recognize')
    : stage.includes('traineddata') ? t('stages.download')
    : t('stages.init')
  const runningIdx = items.findIndex(i => i.status === 'running')
  const lowWords = active?.words.filter(w => w.confidence < LOW_CONF) ?? []
  const overlayOk = !!active?.success && !!prepared && active.key === prepared.key && prepared.key === activeKey
  const failedCount = items.filter(item => item.status === 'error').length
  const waitingCount = items.filter(item => item.status === 'pending').length
  const settingsChanged = active?.success && (active.success.settings.langs !== selectedLangs.join('+') || active.success.settings.mode !== mode || active.success.settings.rotation !== active.rotation)

  const segBtn = (on: boolean) =>
    `min-h-11 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${on ? 'bg-primary text-white' : 'text-body hover:bg-subtle'}`

  const guideList = (key: string) => {
    const v = t.raw(key)
    return Array.isArray(v) ? (v as string[]) : []
  }
  const faqItems = (() => {
    const v = t.raw('guide.faq.items')
    return Array.isArray(v) ? (v as { q: string; a: string }[]) : []
  })()

  return (
    <div className="space-y-8" data-ocr-root data-ocr-paused={queue.paused} data-ocr-running={queue.active?.itemId ?? ''} onDragOver={onDragOver} onDragLeave={onDragLeave} onDrop={onDrop}>
      <div>
        <h1 className="text-2xl font-bold text-fg">{t('title')}</h1>
        <p className="text-sm text-muted mt-1">{t('description')}</p>
        <p className="text-xs text-sub mt-2">{t('privacy')}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 설정 */}
        <div className="lg:col-span-1 min-w-0">
          <div className="ui-card p-6 space-y-5">
            <div>
              <h2 className="text-lg font-semibold text-fg mb-3">{t('upload')}</h2>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className={`w-full border-2 border-dashed rounded-xl p-6 text-center transition-colors ${
                  isDragging ? 'border-primary bg-primary-soft' : 'border-line-strong hover:border-primary'
                }`}
              >
                <Upload className="w-10 h-10 mx-auto mb-2 text-faint" />
                <p className="text-sm text-sub mb-1">{t('uploadDragDrop')}</p>
                <p className="text-xs text-muted">{t('pasteHint')}</p>
              </button>
              <input ref={fileInputRef} data-ocr-upload type="file" accept="image/*" multiple className="hidden"
                onChange={e => { addFiles(Array.from(e.target.files ?? [])); e.target.value = '' }} />
              <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden"
                onChange={e => { addFiles(Array.from(e.target.files ?? [])); e.target.value = '' }} />
              <button type="button" onClick={() => cameraInputRef.current?.click()}
                className="md:hidden mt-2 w-full ui-btn-soft px-4 py-2.5">
                <Camera className="w-4 h-4" />{t('camera')}
              </button>
            </div>

            {items.length > 0 && (
              <div>
                <p className="text-sm font-medium text-body mb-2">{t('queue', { n: items.length })}</p>
                <div className="flex flex-wrap gap-2">
                  {items.map(it => (
                    <div key={it.id} className="relative">
                      <button type="button" data-ocr-select={it.id} data-ocr-status={it.status} onClick={() => setActiveId(it.id)}
                        aria-label={it.file.name}
                        className={`block w-16 h-16 rounded-lg overflow-hidden border-2 ${it.id === activeId ? 'border-primary' : 'border-line'}`}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={it.url} alt="" className="w-full h-full object-cover" />
                        {(it.status === 'running' || it.status === 'pending') && (
                          <span className="absolute inset-0 flex items-center justify-center bg-surface/70">
                            <Loader2 className={`w-5 h-5 text-primary ${it.status === 'running' ? 'animate-spin' : ''}`} />
                          </span>
                        )}
                        {it.status === 'error' && (
                          <span className="absolute inset-0 flex items-center justify-center bg-surface/70">
                            <AlertCircle className="w-5 h-5 text-amber-600" />
                          </span>
                        )}
                      </button>
                      <button type="button" data-ocr-remove={it.id} onClick={() => removeItem(it.id)} aria-label={t('remove')}
                        className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-fg text-canvas flex items-center justify-center">
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {items.length > 0 && <section className="bg-subtle rounded-2xl p-4 space-y-3" aria-label={t('jobs.title')}>
              <p className="text-sm text-body">{t('jobs.waitingCount', { count: waitingCount })} · {t('jobs.failedCount', { count: failedCount })}</p>
              <div className="flex flex-wrap gap-2">
                <button type="button" data-ocr-pause onClick={() => { dispatch(state => setOcrPaused(state, !state.paused)); setRetryQueued(false) }} className="ui-btn-soft min-h-11 px-3 py-2">{t(queue.paused ? 'jobs.resume' : 'jobs.pause')}</button>
                <button type="button" data-ocr-retry-failed disabled={!failedCount} onClick={() => { dispatch(retryOcrFailures); setRetryQueued(true) }} className="ui-btn-soft min-h-11 px-3 py-2 disabled:opacity-40">{t('jobs.retryFailed')}</button>
              </div>
              <p className="text-xs text-muted">{t('jobs.pauseHint')}</p>
              {queue.paused && <p role="status" data-ocr-pause-status className="text-sm text-body">{t(busy ? 'jobs.pausing' : 'jobs.paused')}</p>}
              {queue.paused && retryQueued && <p role="status" className="text-sm text-body">{t('jobs.retryPaused')}</p>}
            </section>}

            <div>
              <p className="text-sm font-medium text-body mb-2">{t('language')}</p>
              <div className="flex flex-wrap gap-2">
                {LANGUAGE_OPTIONS.map(lang => (
                  <button key={lang.code} type="button" data-ocr-language={lang.code} onClick={() => toggleLanguage(lang.code)}
                    aria-pressed={selectedLangs.includes(lang.code)}
                    className={`min-h-11 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                      selectedLangs.includes(lang.code) ? 'bg-primary text-white' : 'bg-soft text-body hover:bg-subtle'
                    }`}>
                    {t(lang.labelKey)}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="text-sm font-medium text-body mb-2">{t('prep.title')}</p>
              <div className="flex gap-1 p-1 bg-soft rounded-xl">
                {PREP_MODES.map(m => (
                  <button key={m} type="button" data-ocr-prep={m} onClick={() => setMode(m)} aria-pressed={mode === m}
                    className={`flex-1 ${segBtn(mode === m)}`}>
                    {t(`prep.${m}`)}
                  </button>
                ))}
              </div>
              <p className="text-xs text-muted mt-2">{t(`prep.${mode}Hint`)}</p>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium text-body">{t('cleanup.title')}</p>
              {(['fixKoreanSpaces', 'joinLines'] as const).map(k => (
                <label key={k} className="flex min-h-11 items-start gap-2 cursor-pointer">
                  <input type="checkbox" data-ocr-clean={k} checked={clean[k]} onChange={e => setCleanOpt(k, e.target.checked)}
                    className="w-4 h-4 mt-0.5 accent-blue-600" />
                  <span className="text-sm text-body">{t(`cleanup.${k}`)}</span>
                </label>
              ))}
            </div>

            <div className="space-y-2">
              <button type="button" data-ocr-rerun="active" onClick={() => rerun(false)} disabled={!active || active.status === 'running'}
                className="w-full ui-btn px-4 py-3">
                {active?.success ? t('rerun') : t('recognize')}
              </button>
              {items.length > 1 && (
                <button type="button" data-ocr-rerun="all" onClick={() => rerun(true)} disabled={busy}
                  className="w-full ui-btn-soft px-4 py-2.5 disabled:opacity-50">
                  {t('rerunAll')}
                </button>
              )}
              <button type="button" data-ocr-reset onClick={handleReset} disabled={!items.length}
                className="w-full bg-soft hover:bg-subtle text-body rounded-xl px-4 py-2.5 font-medium disabled:opacity-50 flex items-center justify-center gap-2">
                <RotateCcw className="w-4 h-4" />{t('reset')}
              </button>
              <p className="text-xs text-muted">{t('rerunHint')}</p>
            </div>

            {confirmation && <section data-ocr-confirmation={confirmation.action.kind} aria-labelledby="ocr-confirm-title" className="bg-subtle rounded-2xl p-4 space-y-3">
              <h3 id="ocr-confirm-title" className="font-semibold text-fg">{t('jobs.confirmation.title')}</h3>
              <p className="text-sm text-body">{t(`jobs.confirmation.${confirmation.action.kind}`, { count: confirmation.editedCount })}</p>
              {confirmation.action.kind === 'rerun' && <p className="text-sm text-sub">{t('jobs.confirmation.newEditHint')}</p>}
              <div className="flex flex-wrap gap-2">
                <button type="button" data-ocr-confirm onClick={() => applyAction(confirmation)} className="ui-btn min-h-11 px-3 py-2">{t(confirmation.action.kind === 'rerun' ? 'jobs.confirmation.confirmRerun' : confirmation.action.kind === 'cleanup' ? 'jobs.confirmation.confirmCleanup' : 'jobs.confirmation.confirmReset')}</button>
                <button type="button" data-ocr-confirm-cancel onClick={() => setConfirmation(null)} className="ui-btn-soft min-h-11 px-3 py-2">{t('jobs.confirmation.cancel')}</button>
              </div>
            </section>}
            {confirmationChanged && <p role="alert" data-ocr-confirm-changed className="text-sm text-body">{t('jobs.confirmation.changed')}</p>}

            {runningIdx >= 0 && (
              <div className="space-y-2" aria-live="polite">
                <div className="flex items-center justify-between text-sm gap-2">
                  <span className="text-sub">
                    {stageLabel}{items.length > 1 ? ` · ${t('imageOf', { n: runningIdx + 1, total: items.length })}` : ''}
                  </span>
                  <span className="text-primary font-medium tabular-nums">{progress}%</span>
                </div>
                <div className="w-full h-2 bg-track rounded-full overflow-hidden">
                  <div className="h-full bg-primary rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
                </div>
                {!stage.includes('recogniz') && <p className="text-xs text-muted">{t('modelNote')}</p>}
              </div>
            )}
          </div>
        </div>

        {/* 미리보기 + 결과 */}
        <div className="lg:col-span-2 space-y-6 min-w-0">
          {active && (
            <div className="ui-card p-4 sm:p-6 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex gap-1 p-1 bg-soft rounded-xl">
                  <button type="button" onClick={() => setView('prepared')} className={segBtn(view === 'prepared')}>{t('view.prepared')}</button>
                  <button type="button" onClick={() => setView('original')} className={segBtn(view === 'original')}>{t('view.original')}</button>
                </div>
                <div className="flex items-center gap-1">
                  <button type="button" data-ocr-rotate="left" onClick={() => updateItem(active.id, { rotation: (active.rotation + 270) % 360 })}
                    title={t('rotateLeft')} aria-label={t('rotateLeft')}
                    className="min-h-11 min-w-11 p-2 bg-soft hover:bg-subtle text-body rounded-lg"><RotateCcw className="w-4 h-4" /></button>
                  <span className="text-xs text-muted w-10 text-center tabular-nums">{active.rotation}°</span>
                  <button type="button" data-ocr-rotate="right" onClick={() => updateItem(active.id, { rotation: (active.rotation + 90) % 360 })}
                    title={t('rotateRight')} aria-label={t('rotateRight')}
                    className="min-h-11 min-w-11 p-2 bg-soft hover:bg-subtle text-body rounded-lg"><RotateCw className="w-4 h-4" /></button>
                </div>
              </div>

              <div className="relative bg-subtle rounded-xl overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  data-ocr-preview
                  src={view === 'original' || prepared?.key !== activeKey ? active.url : prepared.url}
                  alt={t('previewAlt')}
                  className="block w-full h-auto max-h-[420px] object-contain"
                />
                {view === 'prepared' && overlayOk && showConfidence && prepared && (
                  <svg className="absolute inset-0 w-full h-full pointer-events-none text-amber-500"
                    viewBox={`0 0 ${prepared.w} ${prepared.h}`} preserveAspectRatio="xMidYMid meet" aria-hidden>
                    {lowWords.map((w, i) => (
                      <rect key={i} x={w.x0} y={w.y0} width={w.x1 - w.x0} height={w.y1 - w.y0}
                        fill="currentColor" fillOpacity={0.2} stroke="currentColor" strokeWidth={Math.max(2, prepared.w / 400)} />
                    ))}
                  </svg>
                )}
              </div>
              {!!settingsChanged && (
                <p data-ocr-settings-changed className="text-sm text-sub">{t('jobs.settingsChanged')}</p>
              )}
            </div>
          )}

          <div className="ui-card p-4 sm:p-6 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-lg font-semibold text-fg">{t('result')}</h2>
              {doneItems.length > 0 && (
                <div className="flex flex-wrap items-center gap-2">
                  {active?.success && (
                    <button type="button" data-ocr-output-copy="result" onClick={() => void copyToClipboard(textOf(active), 'result')}
                      disabled={output?.kind === 'copy' && output.id === 'result' && output.status === 'copying'} className="ui-btn-soft min-h-11 px-3 py-2 text-sm disabled:opacity-50">
                      {copiedId === 'result' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      {copiedId === 'result' ? t('copied') : t('copy')}
                    </button>
                  )}
                  {doneItems.length > 1 && (
                    <button type="button" data-ocr-output-copy="all" onClick={() => void copyToClipboard(allText, 'all')}
                      disabled={output?.kind === 'copy' && output.id === 'all' && output.status === 'copying'} className="ui-btn-soft min-h-11 px-3 py-2 text-sm disabled:opacity-50">
                      {copiedId === 'all' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      {copiedId === 'all' ? t('copied') : t('copyAll')}
                    </button>
                  )}
                  <button type="button" data-ocr-output-download onClick={handleDownloadTxt} className="ui-btn min-h-11 px-3 py-2 text-sm">
                    <Download className="w-4 h-4" />{t('downloadTxt')}
                  </button>
                </div>
              )}
            </div>

            {doneItems.length > 1 && <p className="text-xs text-muted">{t('output.available', { count: doneItems.length })}</p>}
            {output && (output.kind !== 'copy' || output.status !== 'failed') && <p data-ocr-output-status={output.kind === 'copy' ? output.status : output.code} role="status" aria-live="polite" className="text-sm text-body">{output.kind === 'copy' ? t(`output.${output.status}`, { label: output.label }) : t(`output.${output.code}`)}</p>}
            {output?.kind === 'copy' && output.status === 'failed' && <div data-ocr-output-status="failed"><OcrCopyRecovery failure={output} isCurrent={failureCurrent}
              onRetry={failure => { if (failureCurrent(failure)) void copyToClipboard(failure.text, output.id) }}
              onClose={failure => { if (failureCurrent(failure)) { outputOwner.invalidate(); setOutputState(null) } }} /></div>}

            {active?.success ? (
              <>
                {active.status !== 'done' && <p data-ocr-previous role="status" className="text-sm text-sub">{t('jobs.previousResult')}</p>}
                {active.status === 'error' && <p role="alert" className="text-sm text-body">{t('jobs.workerUnavailable')}</p>}
                {active.status === 'done' && (active.success.raw === '' || active.keptEdited) && <p data-ocr-result-notice role="status" className="text-sm text-body">{t(active.success.raw === '' ? active.edited !== null ? 'jobs.emptyEditedRetained' : 'jobs.emptyResult' : 'jobs.editedRetained')}</p>}
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                  <span className="text-sub">{t('avgConfidence')} <b className="text-fg tabular-nums">{Math.round(active.conf)}%</b></span>
                  <span className="text-sub">{t('lowCount', { n: lowWords.length })}</span>
                  {lowWords.length > 0 && (
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={showConfidence} onChange={e => setShowConfidence(e.target.checked)}
                        className="w-4 h-4 accent-blue-600" />
                      <span className="text-body">{t('showConfidence')}</span>
                    </label>
                  )}
                </div>
                <textarea
                  ref={resultTextRef}
                  data-ocr-text
                  value={textOf(active)}
                  onSelect={event => setTextSelection([event.currentTarget.selectionStart, event.currentTarget.selectionEnd])}
                  onChange={e => updateItem(active.id, { edited: e.target.value })}
                  rows={12}
                  aria-label={t('result')}
                  className="ui-field px-4 py-3 text-base leading-relaxed resize-y"
                />
                <div className="bg-subtle rounded-2xl p-4 space-y-3">
                  <p className="text-sm font-semibold text-body">{t('handoff.title')}</p>
                  <div className="flex flex-wrap gap-2">
                    <button type="button" onClick={() => readRecognizedText(false)} disabled={!textOf(active).trim() || textOf(active).length > TEXT_HANDOFF_LIMIT} className="ui-btn min-h-11 px-3 py-2 text-sm disabled:opacity-40">{t('handoff.read')}</button>
                    <button type="button" onClick={() => readRecognizedText(true)} disabled={textSelection[0] === textSelection[1]} className="ui-btn-soft min-h-11 px-3 py-2 text-sm disabled:opacity-40">{t('handoff.selection')}</button>
                  </div>
                  <p className="text-xs text-muted">{t('handoff.hint')}</p>
                  {handoffError && <p role="alert" className="text-sm text-body">{t(handoffError)}</p>}
                </div>
                {showConfidence && lowWords.length > 0 && (
                  <div>
                    <p className="text-xs text-muted mb-2">{t('lowWordsHint')}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {lowWords.slice(0, 40).map((w, i) => (
                        <span key={i} title={`${t('confidence')}: ${w.confidence.toFixed(0)}%`}
                          className="px-2 py-0.5 rounded-md text-sm bg-soft text-fg border-b-2 border-amber-500">
                          {w.text} <span className="text-xs tabular-nums">{w.confidence.toFixed(0)}%</span>
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-14">
                <p className="text-muted">
                  {!active ? t('noImage') : active.status === 'error' ? t('error') : queue.paused && active.status === 'pending' ? t('jobs.paused') : t('recognizing')}
                </p>
                <p className="text-sm text-faint mt-1">{t('resultPlaceholder')}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 가이드 (항상 펼침) */}
      <div className="ui-card p-6 space-y-6">
        <h2 className="text-xl font-semibold text-fg">{t('guide.title')}</h2>
        <div>
          <h3 className="text-lg font-semibold text-fg mb-2">{t('guide.whatIs.title')}</h3>
          <p className="text-sub leading-relaxed">{t('guide.whatIs.description')}</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {(['howToUse', 'features', 'tips'] as const).map(sec => (
            <div key={sec}>
              <h3 className="text-lg font-semibold text-fg mb-3">{t(`guide.${sec}.title`)}</h3>
              <ul className="space-y-2">
                {guideList(`guide.${sec}.items`).map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-sub">
                    <span className="text-primary mt-0.5">•</span><span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div>
          <h3 className="text-lg font-semibold text-fg mb-3">{t('guide.faq.title')}</h3>
          <div className="space-y-3">
            {faqItems.map((f, i) => (
              <div key={i} className="bg-subtle rounded-2xl p-5">
                <p className="font-medium text-fg">{f.q}</p>
                <p className="text-sm text-sub mt-1 leading-relaxed">{f.a}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
