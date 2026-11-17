'use client'

import { useState, useCallback, useRef, useEffect, useLayoutEffect, useId } from 'react'
import { useTranslations } from '@/lib/i18n'
import '@/lib/i18n/ns/imageConverter'
import { Upload, Download, X, Loader2, Image as ImageIcon } from 'lucide-react'
import GuideSection from '@/components/GuideSection'
import MobileResultLink from '@/components/MobileResultLink'
import { detectEncoders, formatBytes, savingsPct } from '@/utils/imageCompress'
import { convertImage, convertName, nativeHeic, parseSettings, needsBg, usesQuality, CONVERT_FORMATS, DEFAULTS, FORMAT_LABEL, type ConvertFormat, type ConvertOptions } from '@/utils/imageConvert'
import { createImageConversionQueue, imageConversionKey, type ConversionSnapshot } from '@/utils/imageConversionQueue'
import { createImageConversionImports } from '@/utils/imageConversionImports'
import { captureImageConversionZip, createImageConversionZip, imageConversionSettingsUrl, type ConversionZipState } from '@/utils/imageConversionActions'
import { createShareResultDownloads } from '@/utils/shareResultActions'

type ErrorKind = 'heic' | 'decode' | 'encode' | 'format'
interface CompareRow { name: string; use: string; alpha: string; compression: string; compat: string }
type Model = { options: ConvertOptions; ready: boolean; revision: number }
type Runtime = { epoch: number; notice: number; queue: ReturnType<typeof createImageConversionQueue>; imports: ReturnType<typeof createImageConversionImports>; zip: ReturnType<typeof createImageConversionZip>; downloads: ReturnType<typeof createShareResultDownloads> }
const initialSnapshot = (): ConversionSnapshot => ({ items: [], options: { ...DEFAULTS }, key: imageConversionKey(DEFAULTS), settling: false, paused: false, activeId: null, phase: 'idle' })
const settingsSignature = () => { const query = new URLSearchParams(window.location.search); return JSON.stringify(['f','q','bg'].map(key => query.getAll(key))) }
const normalizeOptions = (options: ConvertOptions, encoders: { webp: boolean; avif: boolean } | null) => encoders && (options.format === 'avif' && !encoders.avif || options.format === 'webp' && !encoders.webp) ? { ...options, format: DEFAULTS.format } : options

export default function ImageConverter() {
  const t = useTranslations('imageConverter')
  const uidBase = useId(), fmtLabelId = `${uidBase}-fmt`
  const [model, setModel] = useState<Model>({ options: { ...DEFAULTS }, ready: false, revision: 0 })
  const live = useRef(model), earlyIntent = useRef(false), observedQuery = useRef('')
  const runtime = useRef<Runtime | null>(null), epoch = useRef(0)
  const [view, setView] = useState<{ epoch: number; snapshot: ConversionSnapshot }>({ epoch: 0, snapshot: initialSnapshot() })
  const [enc, setEnc] = useState<{ webp: boolean; avif: boolean } | null>(null), encRef = useRef(enc)
  const [heicNative, setHeicNative] = useState<boolean | null>(null)
  const [isDragging, setIsDragging] = useState(false), [skipped, setSkipped] = useState(0), [reading, setReading] = useState(0)
  const [importFailed, setImportFailed] = useState(false), [urlFailed, setUrlFailed] = useState(false), [downloadFailed, setDownloadFailed] = useState(false)
  const [zipState, setZipState] = useState<ConversionZipState>({ status: 'idle' })
  const fileInputRef = useRef<HTMLInputElement>(null)
  const snapshot = view.snapshot, { format, quality, bg } = model.options
  const jobKey = imageConversionKey(model.options), zipping = zipState.status === 'working'
  const currentRuntime = () => runtime.current?.epoch === view.epoch ? runtime.current : null
  const commitSettings = useCallback((options: ConvertOptions, explicit = true, ready = live.current.ready) => {
    const rt = runtime.current
    if (!rt) return
    if (explicit && !live.current.ready) earlyIntent.current = true
    const next = normalizeOptions(options, encRef.current), changed = imageConversionKey(next) !== imageConversionKey(live.current.options)
    if (changed) rt.zip.cancel()
    const value = { options: { ...next }, ready, revision: live.current.revision + 1 }
    live.current = value; setModel(value); setUrlFailed(false); setDownloadFailed(false)
    rt.queue.setOptions(value.options, ready ? 250 : 0)
  }, [])
  const setFormat = (value: ConvertFormat) => commitSettings({ ...live.current.options, format: value })
  const setQuality = (value: number) => commitSettings({ ...live.current.options, quality: value })
  const setBg = (value: string) => commitSettings({ ...live.current.options, bg: value })

  useLayoutEffect(() => {
    const ownEpoch = ++epoch.current
    let sequence = 0
    let rt: Runtime | null = null
    const owns = () => rt !== null && runtime.current === rt
    const queue = createImageConversionQueue({ options: live.current.options,
      process: async (file, options) => { const output = await convertImage(file, options); return { ...output, url: URL.createObjectURL(output.blob) } },
      release: output => URL.revokeObjectURL(output.url),
      onChange: value => { if (owns()) setView({ epoch: ownEpoch, snapshot: value }) },
    })
    queue.pause()
    const downloads = createShareResultDownloads(); downloads.activate()
    const zip = createImageConversionZip({
      encode: async entries => { const JSZip = (await import('jszip')).default; const archive = new JSZip(); for (const entry of entries) archive.file(entry.name, entry.blob); return archive.generateAsync({ type: 'blob', compression: 'STORE' }) },
      download: (blob, captured) => {
        const current = () => owns() && imageConversionKey(live.current.options) === captured.key
        const extension = FORMAT_LABEL[captured.key.split('|')[0] as ConvertFormat].toLowerCase()
        const outcome = downloads.download(blob, `images_${extension}.zip`, current)
        if (outcome === 'failed') throw new Error('download')
      },
      onChange: value => { if (owns()) setZipState(value) },
    })
    const imports = createImageConversionImports({
      add: rows => { if (owns()) queue.add(rows.map(row => ({ ...row, id: `${uidBase}-${ownEpoch}-${++sequence}` }))) },
      onChange: value => { if (owns()) setReading(value) },
    })
    rt = { epoch: ownEpoch, notice: 0, queue, imports, zip, downloads }
    runtime.current = rt; setView({ epoch: ownEpoch, snapshot: queue.getSnapshot() }); setReading(0); setZipState(zip.getSnapshot())
    if (live.current.ready) queue.resume()
    return () => { if (owns()) runtime.current = null; imports.dispose(); zip.dispose(); queue.dispose(); downloads.dispose() }
  }, [uidBase])

  useEffect(() => {
    const rt = runtime.current
    let active = true
    const owns = () => active && runtime.current === rt
    setHeicNative(nativeHeic(navigator.userAgent))
    detectEncoders().then(value => {
      if (!owns()) return
      encRef.current = value; setEnc(value)
      const next = normalizeOptions(live.current.options, encRef.current)
      if (imageConversionKey(next) !== imageConversionKey(live.current.options)) commitSettings(next, false)
    }).catch(() => { if (owns()) { const value = { webp: false, avif: false }; encRef.current = value; setEnc(value); const next = normalizeOptions(live.current.options, encRef.current); if (imageConversionKey(next) !== imageConversionKey(live.current.options)) commitSettings(next, false) } })
    const restore = (initial: boolean) => {
      if (!owns()) return
      const params = new URLSearchParams(window.location.search)
      const options = initial && earlyIntent.current ? live.current.options : parseSettings(params.get('f'), params.get('q'), params.get('bg'))
      commitSettings(options, false, true); observedQuery.current = settingsSignature()
      if (initial) rt?.queue.resume()
    }
    const timer = window.setTimeout(function restoreInitialImageConversion() { if (!live.current.ready) restore(true) }, 0)
    const pop = () => { if (owns() && observedQuery.current !== settingsSignature()) restore(!live.current.ready) }
    window.addEventListener('popstate', pop)
    return () => { active = false; window.clearTimeout(timer); window.removeEventListener('popstate', pop) }
  }, [commitSettings])

  useEffect(() => {
    if (!model.ready) return
    const rt = runtime.current
    const timer = window.setTimeout(function writeImageConversionSettings() {
      if (!rt || runtime.current !== rt || live.current !== model) return
      const href = imageConversionSettingsUrl(window.location.href, model.options)
      try { if (!href) throw new Error('url'); if (href !== window.location.href) window.history.replaceState(window.history.state, '', href); observedQuery.current = settingsSignature(); setUrlFailed(false) }
      catch { setUrlFailed(true) }
    }, 250)
    return () => window.clearTimeout(timer)
  }, [model])

  const addFiles = useCallback((list: FileList | File[]) => {
    const rt = runtime.current
    if (!rt) return
    const notice = ++rt.notice
    setImportFailed(false)
    void rt.imports.add(Array.from(list)).then(outcome => {
      if (runtime.current !== rt || notice !== rt.notice || outcome.status === 'stale') return
      setSkipped(outcome.skipped); setImportFailed(outcome.status === 'failed')
    })
  }, [])
  useEffect(() => {
    const paste = (event: ClipboardEvent) => { const files = Array.from(event.clipboardData?.files ?? []); if (files.length) { event.preventDefault(); addFiles(files) } }
    window.addEventListener('paste', paste); return () => window.removeEventListener('paste', paste)
  }, [addFiles])

  const removeItem = (id: string) => currentRuntime()?.queue.remove(id)
  const reset = () => { const rt = currentRuntime(); if (!rt) return; rt.notice++; rt.imports.clear(); rt.zip.cancel(); rt.queue.clear(); setSkipped(0); setImportFailed(false); setDownloadFailed(false) }
  const items = snapshot.items.map(item => ({ ...item, key: item.attemptKey,
    out: item.lastSuccess && { ...item.lastSuccess.output, format: item.lastSuccess.options.format },
    error: item.error ? ((item.error as Error).message === 'decode' ? item.src === 'heic' ? 'heic' : 'decode' : (item.error as Error).message === 'format' ? 'format' : 'encode') as ErrorKind : undefined,
  }))
  const done = items.filter(item => !snapshot.settling && item.status === 'done' && item.attemptKey === jobKey && item.lastSuccess?.key === jobKey)
  const failed = items.filter(item => item.status === 'error' && item.attemptKey === jobKey)
  const pending = items.length - done.length - failed.length
  const totalIn = done.reduce((sum, item) => sum + item.file.size, 0), totalOut = done.reduce((sum, item) => sum + item.out!.blob.size, 0)
  const totalPct = savingsPct(totalIn, totalOut), hasHeicError = failed.some(item => item.error === 'heic')
  const change = (pct: number) => pct > 0 ? t('smaller', { pct }) : pct < 0 ? t('larger', { pct: -pct }) : t('same')
  const settingsLabel = (options: ConvertOptions) => [FORMAT_LABEL[options.format], usesQuality(options.format) ? t('queue.qualitySetting', { quality: options.quality }) : '', needsBg(options.format) ? t('queue.backgroundSetting', { color: options.bg }) : ''].filter(Boolean).join(' · ')
  const downloadItem = (id: string, success: NonNullable<ConversionSnapshot['items'][number]['lastSuccess']>) => {
    const rt = currentRuntime(); if (!rt) return
    const current = () => runtime.current === rt && rt.queue.getSnapshot().items.find(item => item.id === id)?.lastSuccess === success
    const item = rt.queue.getSnapshot().items.find(item => item.id === id)
    if (!item || !current()) return
    const outcome = rt.downloads.download(success.output.blob, convertName(item.file.name, success.options.format), current)
    if (outcome !== 'stale') setDownloadFailed(outcome === 'failed')
  }
  const downloadAll = () => {
    const rt = currentRuntime()
    if (!rt || live.current !== model || !model.ready || rt.queue.getSnapshot().key !== jobKey || rt.zip.getSnapshot() !== zipState) return
    const captured = captureImageConversionZip(rt.queue.getSnapshot())
    if (!captured.entries.length) return
    setDownloadFailed(false)
    if (captured.entries.length === 1) {
      rt.zip.cancel()
      const entry = captured.entries[0]
      const outcome = rt.downloads.download(entry.blob, entry.name, () => runtime.current === rt && rt.queue.getSnapshot().key === captured.key && !rt.queue.getSnapshot().settling)
      if (outcome !== 'stale') setDownloadFailed(outcome === 'failed')
    } else void rt.zip.run(captured)
  }
  const status = !items.length ? '' : t(`queue.${snapshot.settling ? 'settling' : snapshot.phase}`)
  const compareRows = t.raw('compare.rows') as CompareRow[], heicSteps = t.raw('heicHelp.items') as string[]
  return (
    <div className="space-y-8" data-image-converter data-conversion-ready={model.ready}>
      <div>
        <h1 className="text-2xl font-bold text-fg">{t('title')}</h1>
        <p className="text-sm text-muted mt-1">{t('description')}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
        {/* ── 왼쪽: 업로드 + 설정 ── */}
        <div className="lg:col-span-1 space-y-6 min-w-0">
          <div className="ui-card p-5 space-y-3">
            <MobileResultLink href="#image-converter-result" label={t('resultTitle')} value={String(done.length)} />
            <button
              type="button"
              className={`w-full border-2 border-dashed rounded-xl p-6 text-center transition-colors ${
                isDragging ? 'border-primary bg-primary-soft' : 'border-line-strong hover:border-primary'
              }`}
              onClick={() => fileInputRef.current?.click()}
              onDrop={(e) => { e.preventDefault(); setIsDragging(false); if (e.dataTransfer.files.length) addFiles(e.dataTransfer.files) }}
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
              onDragLeave={(e) => { e.preventDefault(); setIsDragging(false) }}
              aria-describedby={`${uidBase}-drop-hint`}
            >
              <Upload className="mx-auto mb-3 text-faint" size={36} aria-hidden />
              <span className="block text-sm font-medium text-body">{t('dropzone')}</span>
              <span id={`${uidBase}-drop-hint`} className="block text-xs text-muted mt-1">{t('dropzoneHint')}</span>
            </button>
            <input
              ref={fileInputRef}
              data-conversion-input
              type="file"
              accept="image/*,.heic,.heif"
              multiple
              className="hidden"
              tabIndex={-1}
              aria-hidden
              onChange={(e) => { if (e.target.files?.length) addFiles(e.target.files); e.target.value = '' }}
            />
            <p className="text-xs text-muted leading-relaxed">{t('privacyNote')}</p>
            {heicNative !== null && (
              <p className="text-xs text-muted leading-relaxed">
                {heicNative ? t('heicNative') : t('heicNoNative')}{' '}
                {!heicNative && <a href="#heic-help" className="text-primary underline underline-offset-2">{t('heicHelpLink')}</a>}
              </p>
            )}
            {skipped > 0 && <p className="text-xs text-amber-700" role="alert">{t('skippedFiles', { n: skipped })}</p>}
            {reading > 0 && <p data-conversion-reading role="status" className="text-xs text-sub">{t('queue.reading', { n: reading })}</p>}
            {importFailed && <p data-conversion-import-error role="alert" className="text-sm text-body">{t('queue.importFailed')}</p>}
          </div>

          <div className="ui-card p-5 space-y-6">
            <div>
              <p id={fmtLabelId} className="text-sm font-semibold text-fg mb-2">{t('outputFormat')}</p>
              <div role="group" aria-labelledby={fmtLabelId} className="grid grid-cols-4 gap-1 bg-soft rounded-xl p-1">
                {CONVERT_FORMATS.filter((f) => f !== 'avif' || enc?.avif).map((f) => (
                  <button
                    key={f}
                    data-conversion-format={f}
                    type="button"
                    onClick={() => setFormat(f)}
                    aria-pressed={format === f}
                    disabled={f === 'webp' && enc?.webp === false}
                    className={`min-h-11 rounded-lg text-sm font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                      format === f ? 'bg-primary text-white' : 'text-sub hover:text-fg'
                    }`}
                  >
                    {FORMAT_LABEL[f]}
                  </button>
                ))}
              </div>
              <p className="text-xs text-muted mt-2 leading-relaxed">{t(`formatHint.${format}`)}</p>
              {enc?.webp === false && <p className="text-xs text-muted mt-1 leading-relaxed">{t('webpUnsupported')}</p>}
            </div>

            {usesQuality(format) ? (
              <div>
                <label htmlFor={`${uidBase}-q`} className="flex items-center justify-between text-sm font-medium text-body mb-2">
                  <span>{t('quality')}</span>
                  <span className="tabular-nums text-fg font-semibold">{t('qualityPercent', { value: quality })}</span>
                </label>
                <input
                  id={`${uidBase}-q`}
                  data-conversion-quality
                  type="range" min={10} max={100} step={5}
                  value={quality}
                  onChange={(e) => setQuality(Number(e.target.value))}
                  aria-describedby={`${uidBase}-q-hint`}
                  className="w-full h-11 accent-primary cursor-pointer"
                />
                <p id={`${uidBase}-q-hint`} className="text-xs text-muted leading-relaxed">{t('qualityHint')}</p>
              </div>
            ) : (
              <p className="text-xs text-muted leading-relaxed">{t('pngNote')}</p>
            )}

            {needsBg(format) && (
              <div className="flex items-center gap-3">
                <input
                  id={`${uidBase}-bg`} type="color" value={bg} onChange={(e) => setBg(e.target.value)}
                  data-conversion-bg
                  aria-describedby={`${uidBase}-bg-hint`}
                  className="w-11 h-11 rounded-xl border border-line-strong bg-surface cursor-pointer shrink-0"
                />
                <div className="min-w-0">
                  <label htmlFor={`${uidBase}-bg`} className="block text-sm font-medium text-body">{t('bgColor')}</label>
                  <p id={`${uidBase}-bg-hint`} className="text-xs text-muted leading-relaxed">{t('bgHint')}</p>
                </div>
              </div>
            )}

            <p className="text-xs text-muted leading-relaxed bg-subtle rounded-xl p-3">{t('metaNote')}</p>

            {urlFailed && <p data-conversion-url-error role="status" className="text-sm text-body">{t('queue.urlWriteFailed')}</p>}
            <button type="button" data-conversion-action="clear" onClick={reset} disabled={!items.length && !reading} className="ui-btn-soft w-full px-4 py-3 min-h-11 disabled:opacity-40 disabled:cursor-not-allowed">
              {t('reset')}
            </button>
          </div>
        </div>

        {/* ── 오른쪽: 결과 ── */}
        <div id="image-converter-result" className="lg:col-span-2 space-y-6 min-w-0 scroll-mt-20">
          <section data-conversion-controls data-conversion-phase={snapshot.phase} data-conversion-settling={snapshot.settling} className="ui-card p-5 space-y-3" aria-labelledby={`${uidBase}-queue`}>
            <h2 id={`${uidBase}-queue`} className="text-lg font-semibold text-fg">{t('queue.title')}</h2>
            <div className="flex flex-wrap gap-2">
              <button type="button" data-conversion-action={snapshot.paused ? 'resume' : 'pause'} disabled={!model.ready} onClick={() => { const rt = currentRuntime(); if (!rt || !live.current.ready) return; if (rt.queue.getSnapshot().paused) rt.queue.resume(); else rt.queue.pause() }} className="ui-btn-soft min-h-11 px-4 py-2 text-sm disabled:opacity-40">{t(snapshot.paused ? 'queue.resume' : 'queue.pause')}</button>
              <button type="button" data-conversion-action="retry" disabled={!model.ready || snapshot.settling || !failed.length} onClick={() => { if (live.current.ready) currentRuntime()?.queue.retryFailed() }} className="ui-btn-soft min-h-11 px-4 py-2 text-sm disabled:opacity-40">{t('queue.retryFailed', { n: failed.length })}</button>
            </div>
            <p className="text-xs text-sub">{t('queue.counts', { done: done.length, failed: failed.length, waiting: pending })}</p>
            <p className="text-xs text-muted">{t(snapshot.paused ? 'queue.pausedHint' : 'queue.pauseHint')}</p>
            <p className="text-xs text-muted">{t('queue.currentOnly')}</p>
          </section>
          <p role="status" aria-live="polite" className={status ? 'text-sm text-sub' : 'sr-only'}>{status}</p>
          {failed.length > 0 && (
            <p role="alert" className="text-sm text-red-600">{t('statusFailed', { n: failed.length })}</p>
          )}

          {done.length > 0 && (
            <div className="ui-card p-6 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
              <div>
                <p className="text-sm text-sub">{t('summaryLabel', { n: done.length })}</p>
                <p className="text-3xl font-bold text-fg tabular-nums mt-1">{formatBytes(totalOut)}</p>
                <p className="text-sm text-sub tabular-nums mt-1">
                  {t('summaryFrom', { size: formatBytes(totalIn) })} · <span className={totalPct > 0 ? 'text-primary font-semibold' : ''}>{change(totalPct)}</span>
                </p>
              </div>
              <button type="button" data-conversion-download-all onClick={downloadAll} disabled={!model.ready || snapshot.settling || zipping} className="ui-btn px-5 py-3 min-h-11 inline-flex items-center justify-center gap-2">
                <Download size={18} aria-hidden />
                {zipping ? t('zipping') : done.length > 1 ? t('downloadZip', { n: done.length }) : t('download')}
              </button>
            </div>
          )}

          <div className="space-y-2">
            <p className="text-xs text-muted">{t('queue.zipHint')}</p>
            {zipping && <div data-conversion-zip-state="working" className="flex flex-wrap items-center gap-2"><p role="status" className="text-sm text-body">{t('queue.zipWorking')}</p><button type="button" data-conversion-action="cancelZip" onClick={() => { const rt = currentRuntime(); if (rt?.zip.getSnapshot() === zipState) rt.zip.cancel() }} className="ui-btn-soft min-h-11 px-4 py-2 text-sm">{t('queue.cancelZip')}</button></div>}
            {zipState.status === 'canceled' && <p data-conversion-zip-state="canceled" role="status" className="text-sm text-sub">{t('queue.zipCanceled')}</p>}
            {zipState.status === 'failed' && <div data-conversion-zip-state="failed" className="space-y-2"><p role="alert" className="text-sm text-body">{t('queue.zipFailed')}</p><button type="button" data-conversion-action="retryZip" disabled={!done.length || snapshot.settling} onClick={downloadAll} className="ui-btn-soft min-h-11 px-4 py-2 text-sm disabled:opacity-40">{t('queue.retryZip')}</button></div>}
            {downloadFailed && <p data-conversion-download-error role="alert" className="text-sm text-body">{t('queue.downloadFailed')}</p>}
          </div>

          {hasHeicError && (
            <div role="alert" className="bg-amber-50 text-amber-800 rounded-2xl p-5 text-sm leading-relaxed">
              <p className="font-semibold">{t('heicErrorTitle')}</p>
              <p className="mt-1">{t('heicErrorBody')} <a href="#heic-help" className="underline underline-offset-2">{t('heicHelpLink')}</a></p>
            </div>
          )}

          <div className="ui-card p-5">
            <h2 className="text-lg font-semibold text-fg mb-2">{t('resultTitle')}</h2>
            {items.length === 0 ? (
              <div className="text-center py-12">
                <ImageIcon className="mx-auto mb-3 text-faint" size={40} aria-hidden />
                <p className="text-sm text-muted">{t('empty')}</p>
              </div>
            ) : (
              <ul className="divide-y divide-line">
                {items.map((it) => {
                  const fresh = !snapshot.settling && it.key === jobKey
                  const busy = it.status === 'processing'
                  const outSize = it.out?.blob.size ?? 0
                  return (
                    <li key={it.id} data-conversion-row={it.id} data-conversion-status={it.status} className="flex flex-wrap items-center gap-3 py-3">
                      <div className="w-16 h-16 rounded-xl bg-subtle overflow-hidden shrink-0 flex items-center justify-center">
                        {it.out ? (
                          <img src={it.out.url} alt={it.file.name} className="w-full h-full object-cover" />
                        ) : busy ? (
                          <Loader2 className="animate-spin text-faint" size={22} aria-hidden />
                        ) : (
                          <ImageIcon className="text-faint" size={22} aria-hidden />
                        )}
                      </div>
                      <div className="min-w-0 flex-1 basis-32">
                        <p className="text-sm font-medium text-fg truncate" title={it.file.name}>{it.file.name}</p>
                        <p className="text-xs text-sub tabular-nums mt-0.5">
                          {FORMAT_LABEL[it.src]} {formatBytes(it.file.size)}
                          {it.out && <> → {FORMAT_LABEL[it.out.format]} {formatBytes(outSize)} · {change(savingsPct(it.file.size, outSize))}</>}
                        </p>
                        {it.out && (
                          <p className="text-xs text-muted tabular-nums mt-0.5">
                            {it.out.width}×{it.out.height}px
                            {it.out.downscaled && <> · {t('downscaled')}</>}
                          </p>
                        )}
                        {it.lastSuccess && <p data-conversion-success={fresh && it.status === 'done' ? 'current' : 'previous'} className="text-xs text-sub mt-1">{t(fresh && it.status === 'done' ? 'queue.currentSuccess' : 'queue.previousSuccess', { settings: settingsLabel(it.lastSuccess.options) })}</p>}
                        {(it.status === 'pending' || busy) && <p className="text-xs text-muted mt-0.5">{busy ? t('itemWorking') : t('itemWaiting')}</p>}
                        {fresh && it.error && <p className="text-xs text-red-600 mt-0.5 leading-relaxed">{t(`error.${it.error}`)}</p>}
                      </div>
                      <div className="flex w-full justify-end gap-2 sm:w-auto">
                      {it.lastSuccess && (
                        <button
                          type="button"
                          data-conversion-download={it.id}
                          onClick={() => downloadItem(it.id, it.lastSuccess!)}
                          aria-label={t('queue.downloadResult', { name: convertName(it.file.name, it.lastSuccess.options.format), settings: settingsLabel(it.lastSuccess.options) })}
                          className="min-h-11 min-w-11 inline-flex items-center justify-center rounded-xl bg-soft text-body hover:bg-subtle shrink-0"
                        >
                          <Download size={18} aria-hidden />
                        </button>
                      )}
                      <button
                        type="button"
                        data-conversion-remove={it.id}
                        onClick={() => removeItem(it.id)}
                        aria-label={t('remove', { name: it.file.name })}
                        className="min-h-11 min-w-11 inline-flex items-center justify-center rounded-xl text-muted hover:bg-soft hover:text-fg shrink-0"
                      >
                        <X size={18} aria-hidden />
                      </button>
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        </div>
      </div>

      {/* ── 형식 비교 ── */}
      <section className="ui-card p-6" aria-labelledby={`${uidBase}-cmp`}>
        <h2 id={`${uidBase}-cmp`} className="text-xl font-semibold text-fg mb-4">{t('compare.title')}</h2>
        <div className="overflow-x-auto -mx-2 px-2">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="text-left text-sub border-b border-line">
                {(['format', 'use', 'alpha', 'compression', 'compat'] as const).map((h) => (
                  <th key={h} scope="col" className="py-2 pr-4 font-medium">{t(`compare.headers.${h}`)}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {compareRows.map((r) => (
                <tr key={r.name} className="align-top">
                  <th scope="row" className="py-3 pr-4 text-left font-semibold text-fg whitespace-nowrap">{r.name}</th>
                  <td className="py-3 pr-4 text-body">{r.use}</td>
                  <td className="py-3 pr-4 text-body">{r.alpha}</td>
                  <td className="py-3 pr-4 text-body">{r.compression}</td>
                  <td className="py-3 text-body">{r.compat}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-muted mt-3 leading-relaxed">{t('compare.note')}</p>
      </section>

      {/* ── HEIC 다른 방법 ── */}
      <section id="heic-help" className="ui-card p-6 scroll-mt-24" aria-labelledby={`${uidBase}-heic`}>
        <h2 id={`${uidBase}-heic`} className="text-xl font-semibold text-fg mb-4">{t('heicHelp.title')}</h2>
        <ol className="space-y-2 list-decimal list-inside text-sm text-body leading-relaxed">
          {heicSteps.map((s) => <li key={s}>{s}</li>)}
        </ol>
      </section>

      <GuideSection namespace="imageConverter" />
    </div>
  )
}
