'use client'

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useTranslations } from '@/lib/i18n'
import '@/lib/i18n/ns/imageWatermark'
import GuideSection from '@/components/GuideSection'
import MobileResultLink from '@/components/MobileResultLink'
import { createWatermarkBrowserAdapter, encodeWatermarkZip, type WatermarkLogoAsset, type WatermarkPreviewAsset } from '@/lib/imageWatermark/browser'
import { createWatermarkQueue, type WatermarkQueueState } from '@/utils/imageWatermarkQueue'
import { createWatermarkZipController } from '@/utils/imageWatermarkZip'
import { DEFAULT_WATERMARK_DRAFT, WATERMARK_POSITIONS, WatermarkError, captureWatermarkZip, createWatermarkSnapshot, normalizeWatermarkText, watermarkOutputName, type WatermarkDraft, type WatermarkErrorCode, type WatermarkOutput } from '@/utils/imageWatermark'

const initialQueue: WatermarkQueueState<WatermarkOutput> = { items: [], key: '', outputBytes: 0, activeId: null, phase: 'idle', paused: false }
type Runtime = { adapter: ReturnType<typeof createWatermarkBrowserAdapter>; queue: ReturnType<typeof createWatermarkQueue<WatermarkOutput>>; zip: ReturnType<typeof createWatermarkZipController>; save: (blob: Blob, name: string) => void }
type Preview = { id: string; asset: WatermarkPreviewAsset }
type Painted = Preview & { key: string }
const errorCode = (cause: unknown, fallback: WatermarkErrorCode = 'output') => cause instanceof WatermarkError ? cause.code : fallback
const formatBytes = (bytes: number) => `${(bytes / 1024 / 1024).toFixed(2)} MiB`
const button = 'ui-btn-soft min-h-11 min-w-11 px-3 py-2 text-sm disabled:opacity-40'
const field = 'ui-field w-full min-w-0 px-3 py-3 text-base'

export default function ImageWatermarkWorkspace() {
  const t = useTranslations('imageWatermark')
  const [draft, setDraft] = useState<WatermarkDraft>(() => ({ ...DEFAULT_WATERMARK_DRAFT, text: t('batch.defaultText') }))
  const draftRef = useRef(draft), sequence = useRef(0), revision = useRef(0), logoRevision = useRef(0), previewRevision = useRef(0)
  const runtimeRef = useRef<Runtime | null>(null), logoRef = useRef<WatermarkLogoAsset | null>(null), selectedRef = useRef('')
  const [runtime, setRuntime] = useState<Runtime | null>(null), [queue, setQueue] = useState(initialQueue)
  const [logo, setLogo] = useState<WatermarkLogoAsset | null>(null), [logoLoading, setLogoLoading] = useState(false), [logoError, setLogoError] = useState<WatermarkErrorCode | null>(null)
  const logoLoadingRef = useRef(false)
  const [activeId, setActiveId] = useState(''), [previewEpoch, setPreviewEpoch] = useState(0), [selected, setSelected] = useState<Set<string>>(() => new Set())
  const [base, setBase] = useState<Preview | null>(null), [painted, setPainted] = useState<Painted | null>(null)
  const [previewError, setPreviewError] = useState<{ id: string; key: string; code: WatermarkErrorCode } | null>(null)
  const [notice, setNotice] = useState<'changed' | 'downloadRequested' | 'downloadFailed' | 'zipFailed' | null>(null)
  const [inputError, setInputError] = useState<WatermarkErrorCode | null>(null), [zipBusy, setZipBusy] = useState(false), [zipStopping, setZipStopping] = useState(false)
  const [dragging, setDragging] = useState(false)
  const fileInput = useRef<HTMLInputElement>(null), logoInput = useRef<HTMLInputElement>(null), canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    let alive = true
    const adapter = createWatermarkBrowserAdapter(), downloadUrls = new Set<string>(), timers = new Set<ReturnType<typeof setTimeout>>()
    const save = (blob: Blob, name: string) => {
      if (!alive) throw new WatermarkError('canceled')
      const url = URL.createObjectURL(blob)
      downloadUrls.add(url)
      let anchor: HTMLAnchorElement | null = null
      const release = () => { if (downloadUrls.delete(url)) URL.revokeObjectURL(url) }
      try {
        anchor = document.createElement('a'); anchor.href = url; anchor.download = name
        document.body.appendChild(anchor); anchor.click()
        const timer = setTimeout(() => { timers.delete(timer); release() }, 30_000); timers.add(timer)
      } catch (cause) { release(); throw cause }
      finally { anchor?.remove() }
    }
    const queue = createWatermarkQueue<WatermarkOutput>({
      process: (file, snapshot, signal) => adapter.process(file, snapshot, () => alive && !signal.aborted),
      release: output => adapter.release(output), onChange: value => { if (alive) setQueue(value) },
    })
    const zip = createWatermarkZipController({ encode: encodeWatermarkZip, download: blob => save(blob, 'watermarked-images.zip'), onChange: value => { if (alive) setZipBusy(value.busy) } })
    const instance = { adapter, queue, zip, save }; runtimeRef.current = instance
    queueMicrotask(() => { if (alive) { setRuntime(instance); setQueue(queue.getSnapshot()) } })
    return () => {
      alive = false
      if (runtimeRef.current === instance) runtimeRef.current = null
      queue.dispose(); zip.dispose(); adapter.dispose()
      for (const timer of timers) clearTimeout(timer)
      for (const url of downloadUrls) URL.revokeObjectURL(url)
      downloadUrls.clear()
    }
  }, [])

  const validation = useMemo(() => {
    try { return { snapshot: createWatermarkSnapshot(draft, logo), error: null } }
    catch (cause) { return { snapshot: null, error: errorCode(cause, 'options') } }
  }, [draft, logo])
  const snapshot = validation.snapshot
  const activeRow = queue.items.find(row => row.id === activeId)
  const sourceFile = activeRow?.file

  useEffect(() => {
    if (!runtime || !sourceFile || !activeId) return
    let alive = true, asset: WatermarkPreviewAsset | null = null
    const token = previewRevision.current
    const current = () => alive && runtimeRef.current === runtime && selectedRef.current === activeId && token === previewRevision.current
    void runtime.adapter.sourcePreview(sourceFile, current).then(result => {
      if (!current()) { result.release(); return }
      asset = result; setBase({ id: activeId, asset: result }); setPreviewError(null)
    }).catch(cause => { if (current()) setPreviewError({ id: activeId, key: '', code: errorCode(cause, 'read') }) })
    return () => { alive = false; asset?.release() }
  }, [runtime, sourceFile, activeId, previewEpoch])

  useEffect(() => {
    if (!runtime || !base || base.id !== activeId || !snapshot || logoLoading) return
    let alive = true, asset: WatermarkPreviewAsset | null = null
    const token = revision.current, previewToken = previewRevision.current
    const current = () => alive && runtimeRef.current === runtime && selectedRef.current === activeId && token === revision.current && previewToken === previewRevision.current
    void runtime.adapter.preview(base.asset, snapshot, logo, current).then(result => {
      if (!current()) { result.release(); return }
      asset = result; setPainted({ id: activeId, key: snapshot.key, asset: result }); setPreviewError(null)
    }).catch(cause => { if (current()) setPreviewError({ id: activeId, key: snapshot.key, code: errorCode(cause) }) })
    return () => { alive = false; asset?.release() }
  }, [runtime, base, activeId, snapshot, logo, logoLoading])

  const visiblePreview = painted?.id === activeId && painted.key === snapshot?.key && !logoLoading ? painted : null
  useLayoutEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !visiblePreview) return
    const image = visiblePreview.asset.canvas
    canvas.width = image.width; canvas.height = image.height
    canvas.getContext('2d')?.drawImage(image, 0, 0)
  }, [visiblePreview])

  const invalidate = (changed = true) => {
    revision.current++
    const current = runtimeRef.current
    current?.queue.invalidate(); current?.zip.invalidate()
    setPainted(null); setPreviewError(null); setZipStopping(current?.zip.getSnapshot().busy ?? false)
    setNotice(changed && (current?.queue.getSnapshot().items.length ?? 0) > 0 ? 'changed' : null)
  }
  const edit = <K extends keyof WatermarkDraft>(key: K, value: WatermarkDraft[K]) => {
    if (Object.is(draftRef.current[key], value)) return
    invalidate(); const next = { ...draftRef.current, [key]: value }; draftRef.current = next; setDraft(next)
  }
  const selectPreview = (id: string) => {
    if (selectedRef.current === id) return
    previewRevision.current++; setPreviewEpoch(previewRevision.current); selectedRef.current = id; setActiveId(id); setBase(null); setPainted(null); setPreviewError(null)
  }
  const addFiles = (files: readonly File[]) => {
    const current = runtimeRef.current; if (!current || !files.length) return
    try {
      const entries = files.map(file => ({ id: `watermark-${++sequence.current}`, file }))
      current.queue.add(entries); setSelected(previous => new Set([...previous, ...entries.map(row => row.id)])); setInputError(null)
      if (!selectedRef.current) selectPreview(entries[0].id)
    } catch (cause) { setInputError(errorCode(cause, 'read')) }
  }
  const loadLogo = async (file: File) => {
    const current = runtimeRef.current; if (!current) return
    invalidate(); const token = ++logoRevision.current, id = `logo-${++sequence.current}`
    logoLoadingRef.current = true; setLogoLoading(true); setLogoError(null)
    const isCurrent = () => runtimeRef.current === current && token === logoRevision.current
    try {
      const result = await current.adapter.logo(file, id, isCurrent)
      if (!isCurrent()) { result.release(); return }
      logoRef.current?.release(); logoRef.current = result; setLogo(result)
    } catch (cause) { if (isCurrent()) setLogoError(errorCode(cause, 'read')) }
    finally { if (isCurrent()) { logoLoadingRef.current = false; setLogoLoading(false) } }
  }
  const clearFiles = () => {
    const current = runtimeRef.current
    revision.current++; previewRevision.current++; setPreviewEpoch(previewRevision.current); current?.queue.clear(); current?.zip.invalidate()
    logoRevision.current++; logoLoadingRef.current = false; setLogoLoading(false); setLogoError(null)
    selectedRef.current = ''; setActiveId(''); setSelected(new Set()); setBase(null); setPainted(null); setPreviewError(null); setInputError(null); setNotice(null)
    setZipStopping(current?.zip.getSnapshot().busy ?? false)
    if (fileInput.current) fileInput.current.value = ''
  }
  const reset = () => {
    clearFiles(); logoRevision.current++; logoLoadingRef.current = false; setLogoLoading(false); setLogoError(null)
    logoRef.current?.release(); logoRef.current = null; setLogo(null)
    const next = { ...DEFAULT_WATERMARK_DRAFT, text: t('batch.defaultText') }; draftRef.current = next; setDraft(next)
    if (logoInput.current) logoInput.current.value = ''
  }
  const remove = (id: string) => {
    const current = runtimeRef.current; if (!current) return
    current.queue.remove(id); setSelected(previous => new Set([...previous].filter(value => value !== id)))
    if (selectedRef.current === id) selectPreview(current.queue.getSnapshot().items[0]?.id ?? '')
  }
  const makeAll = () => {
    const current = runtimeRef.current; if (!current || logoLoadingRef.current) return
    try { current.queue.start(createWatermarkSnapshot(draftRef.current, logoRef.current)); setInputError(null); setNotice(null) }
    catch (cause) { setInputError(errorCode(cause, 'options')) }
  }
  const savePng = (id: string) => {
    const current = runtimeRef.current; if (!current || logoLoadingRef.current) return
    try {
      const key = createWatermarkSnapshot(draftRef.current, logoRef.current).key
      const row = current.queue.getSnapshot().items.find(item => item.id === id)
      if (!row?.out || row.status !== 'done' || row.key !== key) return
      current.save(row.out.blob, watermarkOutputName(row.file.name)); setNotice('downloadRequested')
    } catch { setNotice('downloadFailed') }
  }
  const saveZip = async () => {
    const current = runtimeRef.current; if (!current || current.zip.getSnapshot().busy || logoLoadingRef.current) return
    const token = revision.current
    try {
      const key = createWatermarkSnapshot(draftRef.current, logoRef.current).key
      const capture = captureWatermarkZip(current.queue.getSnapshot().items, selected, key)
      if (!capture.successCount) return
      setNotice(null); setZipStopping(false)
      const outcome = await current.zip.run(capture.snapshot)
      if (runtimeRef.current !== current || revision.current !== token) return
      if (outcome === 'downloaded') setNotice('downloadRequested')
      else if (outcome === 'failed') setNotice('zipFailed')
    } catch { if (runtimeRef.current === current && revision.current === token) setNotice('zipFailed') }
  }
  const capture = captureWatermarkZip(queue.items, selected, snapshot?.key ?? '')
  const done = queue.items.filter(row => row.status === 'done').length, failed = queue.items.filter(row => row.status === 'error').length
  const busy = queue.phase === 'running' || queue.phase === 'pausing'
  const previewFailure = previewError?.id === activeId && (!previewError.key || previewError.key === snapshot?.key) ? previewError : null

  return <div className="space-y-8" data-watermark-workspace>
    <header><h1 className="text-2xl font-bold text-fg">{t('title')}</h1><p className="mt-2 text-sub">{t('batch.description')}</p></header>
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <section className="ui-card min-w-0 space-y-5 p-5" aria-label={t('watermarkType')}>
        <MobileResultLink href="#image-watermark-result" label={t('batch.preview')} value={activeRow?.file.name ?? t('batch.fileCount', { count: queue.items.length })} />
        <div className={`rounded-2xl border-2 border-dashed p-4 ${dragging ? 'border-primary bg-primary-soft' : 'border-line'}`}
          onDragOver={event => { event.preventDefault(); setDragging(true) }} onDragLeave={() => setDragging(false)} onDrop={event => { event.preventDefault(); setDragging(false); addFiles(Array.from(event.dataTransfer.files)) }}>
          <label className="ui-btn-soft flex min-h-11 cursor-pointer items-center justify-center px-3 py-3 text-center focus-within:ring-2 focus-within:ring-primary">
            {t('batch.addFiles')}<input ref={fileInput} data-watermark-files type="file" multiple accept="image/png,image/jpeg,image/webp,image/gif" className="sr-only" disabled={!runtime}
              onChange={event => { addFiles(Array.from(event.target.files ?? [])); event.target.value = '' }} />
          </label><p className="mt-2 text-sm text-sub">{t('batch.dropFiles')}</p>
        </div>
        <p className="text-xs text-muted">{t('batch.limits')}</p>
        {inputError && <p role="alert" className="text-sm text-red-600">{t(`batch.errors.${inputError}`)}</p>}
        <fieldset><legend className="mb-2 text-sm font-medium text-body">{t('watermarkType')}</legend><div className="grid grid-cols-2 gap-2">
          {(['text', 'image'] as const).map(type => <button type="button" key={type} data-watermark-type={type} aria-pressed={draft.watermarkType === type} onClick={() => edit('watermarkType', type)} className={`min-h-11 rounded-xl px-3 py-2 ${draft.watermarkType === type ? 'bg-primary text-white' : 'bg-soft text-body'}`}>{t(type === 'text' ? 'textType' : 'imageType')}</button>)}
        </div></fieldset>
        {draft.watermarkType === 'text' ? <>
          <label className="block space-y-2 text-sm text-body">{t('text')}<textarea data-watermark-text className={field} rows={3} maxLength={800} value={draft.text} onChange={event => edit('text', event.target.value)} /></label>
          <p className="text-xs text-sub">{t('batch.textCount', { count: Array.from(normalizeWatermarkText(draft.text)).length })} · {t('batch.textHint')}</p>
          <div className="rounded-xl bg-subtle p-3 text-sm text-body"><span className="text-sub">{t('batch.normalizedText')}: </span><span className="break-words" data-watermark-normalized>{normalizeWatermarkText(draft.text)}</span></div>
          <label className="block space-y-2 text-sm text-body">{t('fontSize')}: {draft.fontSize}px<input data-watermark-option="fontSize" type="range" min={10} max={200} value={draft.fontSize} onChange={event => edit('fontSize', Number(event.target.value))} className="min-h-11 w-full accent-primary" /></label>
          <label className="block space-y-2 text-sm text-body">{t('fontFamily')}<select data-watermark-option="fontFamily" className={field} value={draft.fontFamily} onChange={event => edit('fontFamily', event.target.value as WatermarkDraft['fontFamily'])}>
            {(['sans-serif', 'serif', 'monospace'] as const).map(font => <option key={font} value={font}>{t(`batch.fonts.${font}`)}</option>)}
          </select></label>
          <label className="block space-y-2 text-sm text-body">{t('fontColor')}<input data-watermark-color className={field} value={draft.fontColor} maxLength={32} spellCheck={false} onChange={event => edit('fontColor', event.target.value)} /></label>
          <input type="color" aria-label={t('fontColor')} value={/^#[\da-f]{6}$/i.test(draft.fontColor) ? draft.fontColor : '#ffffff'} onChange={event => edit('fontColor', event.target.value)} className="h-11 w-full rounded-xl border border-line bg-field" />
          <p className="text-xs text-sub">{t('batch.colorHint')}</p>
          <label className="flex min-h-11 items-center gap-3 text-body"><input data-watermark-option="bold" type="checkbox" checked={draft.bold} onChange={event => edit('bold', event.target.checked)} className="h-5 w-5 accent-primary" />{t('bold')}</label>
        </> : <>
          <label className="ui-btn-soft flex min-h-11 cursor-pointer items-center justify-center px-3 py-3 focus-within:ring-2 focus-within:ring-primary">{t('watermarkImageUpload')}<input ref={logoInput} data-watermark-logo type="file" accept="image/png,image/jpeg,image/webp,image/gif" className="sr-only" disabled={!runtime} onChange={event => { const file = event.target.files?.[0]; if (file) void loadLogo(file); event.target.value = '' }} /></label>
          {logo && <p className="break-all text-sm text-body" data-watermark-logo-name>{t('batch.logoReady', { name: logo.file.name })}</p>}
          {logoLoading && <p role="status" className="text-sm text-sub">{t('batch.logoLoading')}</p>}
          {logoError && <p role="alert" className="text-sm text-red-600">{t('batch.logoFailed')} {t(`batch.errors.${logoError}`)}</p>}
          <label className="block space-y-2 text-sm text-body">{t('watermarkSize')}: {draft.watermarkSize}%<input data-watermark-option="watermarkSize" type="range" min={5} max={80} value={draft.watermarkSize} onChange={event => edit('watermarkSize', Number(event.target.value))} className="min-h-11 w-full accent-primary" /></label>
        </>}
        <fieldset><legend className="mb-2 text-sm text-body">{t('position')}</legend><div className="grid grid-cols-3 gap-2">{WATERMARK_POSITIONS.map(position => <button type="button" key={position} data-watermark-position={position} aria-pressed={draft.position === position} onClick={() => edit('position', position)} className={`min-h-11 rounded-xl px-1 py-2 text-sm ${draft.position === position ? 'bg-primary text-white' : 'bg-soft text-body'}`}>{t(`positions.${position}`)}</button>)}</div></fieldset>
        {([{ key: 'opacity', min: 1, max: 100, unit: '%' }, { key: 'rotation', min: -180, max: 180, unit: '°' }, { key: 'margin', min: 0, max: 100, unit: 'px' }] as const).map(option => <label key={option.key} className="block space-y-2 text-sm text-body">{t(option.key)}: {draft[option.key]}{option.unit}<input data-watermark-option={option.key} type="range" min={option.min} max={option.max} value={draft[option.key]} onChange={event => edit(option.key, Number(event.target.value))} className="min-h-11 w-full accent-primary" /></label>)}
        <label className="flex min-h-11 items-center gap-3 text-body"><input data-watermark-option="tileMode" type="checkbox" checked={draft.tileMode} onChange={event => edit('tileMode', event.target.checked)} className="h-5 w-5 accent-primary" />{t('tileMode')}</label>
        <p className="text-xs text-sub">{t('batch.tileHint')}</p>
        {validation.error && <p role="alert" className="text-sm text-red-600">{t(`batch.errors.${validation.error}`)}</p>}
      </section>
      <div className="min-w-0 space-y-6 lg:col-span-2">
        <section id="image-watermark-result" className="ui-card min-w-0 scroll-mt-20 space-y-3 p-5" aria-labelledby="watermark-preview-heading">
          <h2 id="watermark-preview-heading" className="text-lg font-semibold text-fg">{t('batch.preview')}</h2>
          {visiblePreview ? <><p className="break-all text-sm text-body">{activeRow?.file.name} · {t('batch.dimensions', { width: visiblePreview.asset.width, height: visiblePreview.asset.height })}</p><canvas ref={canvasRef} data-watermark-preview width={visiblePreview.asset.canvas.width} height={visiblePreview.asset.canvas.height} role="img" aria-label={t('batch.preview')} className="mx-auto block h-auto max-w-full rounded-xl bg-subtle" /></> : <p role="status" className="rounded-xl bg-subtle p-6 text-sub">{previewFailure ? t('batch.previewFailed') : !activeRow ? t('batch.empty') : validation.error ? t(`batch.errors.${validation.error}`) : t('batch.previewLoading')}</p>}
          {previewFailure && <p role="alert" className="text-sm text-red-600">{t(`batch.errors.${previewFailure.code}`)}</p>}
          <p className="text-xs text-sub">{t('batch.previewHint')}</p>
        </section>
        <section className="ui-card min-w-0 space-y-4 p-5" aria-labelledby="watermark-list-heading">
          <h2 id="watermark-list-heading" className="text-lg font-semibold text-fg">{t('batch.title')}</h2>
          <p className="text-sm text-sub" data-watermark-count>{t('batch.fileCount', { count: queue.items.length })}</p>
          <div className="flex flex-wrap gap-2">
            <button type="button" data-watermark-action="start" className="ui-btn min-h-11 px-4 py-3 disabled:opacity-40" disabled={!runtime || !queue.items.length || !snapshot || logoLoading || busy} onClick={makeAll}>{t('batch.makeAll')}</button>
            <button type="button" data-watermark-action="pause" className={button} disabled={queue.phase !== 'running'} onClick={() => runtimeRef.current?.queue.pause()}>{t('batch.pause')}</button>
            <button type="button" data-watermark-action="resume" className={button} disabled={!queue.paused || !snapshot || logoLoading || queue.key !== snapshot.key} onClick={() => runtimeRef.current?.queue.resume()}>{t('batch.resume')}</button>
            <button type="button" data-watermark-action="retry" className={button} disabled={!failed || busy || logoLoading || queue.key !== snapshot?.key} onClick={() => runtimeRef.current?.queue.retryFailed()}>{t('batch.retryFailed')}</button>
          </div>
          <p className="text-xs text-sub">{t('batch.makeHint')}</p>
          <p role="status" className="text-sm text-body" data-watermark-progress data-watermark-phase={queue.phase}>{t('batch.progress', { done, failed, pending: queue.items.length - done - failed })} {queue.phase === 'pausing' ? t('batch.pausing') : queue.paused ? t('batch.paused') : ''}</p>
          <ul className="space-y-3">{queue.items.map((row, index) => <li key={row.id} data-watermark-row={row.id} data-watermark-status={row.status} aria-label={t('batch.rowLabel', { position: index + 1, name: row.file.name, status: t(`batch.status.${row.status}`) })} className={`min-w-0 rounded-2xl border p-3 ${activeId === row.id ? 'border-primary bg-primary-soft' : 'border-line bg-subtle'}`}>
            <div className="flex min-w-0 items-start gap-2"><label className="flex min-h-11 min-w-11 items-center justify-center"><input data-watermark-select={row.id} type="checkbox" checked={selected.has(row.id)} aria-label={t('batch.selectOutput', { name: row.file.name })} className="h-5 w-5 accent-primary" onChange={event => setSelected(previous => { const next = new Set(previous); if (event.target.checked) next.add(row.id); else next.delete(row.id); return next })} /></label>
              <button type="button" data-watermark-select-preview={row.id} aria-label={t('batch.selectFile', { name: row.file.name })} aria-pressed={activeId === row.id} onClick={() => selectPreview(row.id)} className="min-h-11 min-w-0 flex-1 break-all rounded-xl px-2 py-2 text-left text-sm font-medium text-fg">{row.file.name}</button>
            </div>
            <p className="text-xs text-sub">{t(`batch.status.${row.status}`)} · {formatBytes(row.file.size)} {row.out && `· ${t('batch.dimensions', { width: row.out.width, height: row.out.height })}`}</p>
            {row.status === 'error' && <p role="alert" className="mt-2 text-sm text-red-600">{t(`batch.errors.${errorCode(row.error)}`)}</p>}
            <div className="mt-2 flex flex-wrap gap-2">
              <button type="button" data-watermark-up={row.id} className={button} disabled={index === 0} aria-label={t('batch.moveUp', { name: row.file.name })} onClick={() => runtimeRef.current?.queue.move(row.id, index - 1)}>↑</button>
              <button type="button" data-watermark-down={row.id} className={button} disabled={index === queue.items.length - 1} aria-label={t('batch.moveDown', { name: row.file.name })} onClick={() => runtimeRef.current?.queue.move(row.id, index + 1)}>↓</button>
              <button type="button" data-watermark-remove={row.id} className={button} aria-label={t('batch.remove', { name: row.file.name })} onClick={() => remove(row.id)}>{t('batch.removeShort')}</button>
              <button type="button" data-watermark-png={row.id} className={button} disabled={row.status !== 'done' || row.key !== snapshot?.key || logoLoading} aria-label={t('batch.downloadPng', { name: row.file.name })} onClick={() => savePng(row.id)}>{t('batch.pngShort')}</button>
            </div>
          </li>)}</ul>
          <p className="text-xs text-sub">{t('batch.outputBytes', { bytes: formatBytes(queue.outputBytes) })}</p>
          <div className="flex flex-wrap gap-2"><button type="button" className={button} data-watermark-action="select-completed" onClick={() => setSelected(new Set(queue.items.filter(row => row.status === 'done' && row.key === snapshot?.key).map(row => row.id)))}>{t('batch.selectCompleted')}</button><button type="button" className={button} data-watermark-action="deselect" onClick={() => setSelected(new Set())}>{t('batch.deselectAll')}</button></div>
          <p className="text-sm text-body" data-watermark-selection>{t('batch.selection', { selected: capture.selectedCount, ready: capture.successCount })}</p>
          {capture.unavailableCount > 0 && <p className="text-xs text-sub">{t('batch.excluded', { count: capture.unavailableCount })}</p>}
          <button type="button" data-watermark-action="zip" className="ui-btn min-h-11 px-4 py-3 disabled:opacity-40" disabled={!capture.successCount || zipBusy || logoLoading} onClick={() => void saveZip()}>{t('batch.downloadZip')}</button>
          {zipBusy && <p role="status" className="text-sm text-sub">{t(zipStopping ? 'batch.zipStopping' : 'batch.zipBusy')}</p>}
          {!capture.successCount && <p className="text-xs text-sub">{t('batch.noSelection')}</p>}
          <p className="text-xs text-sub">{t('batch.zipHint')}</p>
          {notice && <p data-watermark-notice role={notice === 'downloadFailed' || notice === 'zipFailed' ? 'alert' : 'status'} className="text-sm text-body">{t(`batch.${notice}`)}</p>}
          <div className="border-t border-line pt-4"><div className="flex flex-wrap gap-2"><button type="button" data-watermark-action="clear" className={button} onClick={clearFiles}>{t('batch.clearFiles')}</button><button type="button" data-watermark-action="reset" className={button} onClick={reset}>{t('batch.resetAll')}</button></div><p className="mt-2 text-xs text-sub">{t('batch.clearFilesHint')} {t('batch.resetAllHint')}</p></div>
        </section>
      </div>
    </div>
    <div className="space-y-2 rounded-2xl bg-subtle p-5 text-sm text-sub"><p>{t('batch.formats')}</p><p>{t('batch.privacy')}</p><p>{t('batch.memory')}</p></div>
    <GuideSection namespace="imageWatermark" />
  </div>
}
