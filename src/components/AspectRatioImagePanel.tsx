'use client'

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useTranslations } from '@/lib/i18n'
import '@/lib/i18n/ns/aspectRatio'
import AspectCropControls from '@/components/AspectCropControls'
import { createAspectImageAdapter, type AspectSourceAsset, type AspectPreviewAsset } from '@/lib/aspectRatioImage/browser'
import { AspectImageError, aspectOutputSize, aspectImageGeometry, aspectImageFilename, isAspectDimension, type AspectFit, type AspectPadColor, type AspectImageFailure } from '@/utils/aspectRatioImage'
import { reduceRatio } from '@/utils/aspectRatio'

interface Props { width: number; height: number; ratioLabel: string; inputRevision: number; isInputCurrent: (revision: number) => boolean; onUseSize: (width: number, height: number) => void; overlay?: ReactNode; zoneNote?: ReactNode }
type Notice = { key: string; kind: 'preview' | 'export'; error?: AspectImageFailure }
const segment = (selected: boolean) => 'min-h-11 rounded-xl px-3 py-2 text-sm ' + (selected ? 'bg-primary text-white' : 'bg-soft text-body hover:bg-subtle')

export default function AspectRatioImagePanel({ width, height, ratioLabel, inputRevision, isInputCurrent, onUseSize, overlay, zoneNote }: Props) {
  const t = useTranslations('aspectRatio')
  const [source, setSource] = useState<AspectSourceAsset | null>(null), [sourceVersion, setSourceVersion] = useState(0)
  const [fit, setFit] = useState<AspectFit>('crop'), [padColor, setPadColor] = useState<AspectPadColor>('#000000'), [position, setPosition] = useState({ x: 50, y: 50 })
  const [loading, setLoading] = useState(false), [readError, setReadError] = useState<AspectImageFailure | null>(null), [dragOver, setDragOver] = useState(false)
  const [previewNotice, setPreviewNotice] = useState<Notice | null>(null), [exportNotice, setExportNotice] = useState<Notice | null>(null)
  const [previewState, setPreviewState] = useState<{ key: string; asset: AspectPreviewAsset } | null>(null), [retry, setRetry] = useState(0)
  const owner = useRef<ReturnType<typeof createAspectImageAdapter> | null>(null), sourceRef = useRef<AspectSourceAsset | null>(null), previewRef = useRef<AspectPreviewAsset | null>(null)
  const readSequence = useRef(0), workSequence = useRef(0), readAbort = useRef<AbortController | null>(null), mounted = useRef(false), currentKey = useRef('')
  const exportPending = useRef(false), fileRef = useRef<HTMLInputElement>(null), canvasHost = useRef<HTMLDivElement>(null)
  const downloadUrls = useRef(new Map<string, ReturnType<typeof setTimeout>>())
  const invalidateWork = useCallback(() => { workSequence.current++; exportPending.current = false }, [])
  const cancelRead = useCallback(() => { const pending = readAbort.current; readSequence.current++; pending?.abort(); readAbort.current = null; setLoading(false); if (pending && sourceRef.current) setRetry(value => value + 1) }, [])
  useLayoutEffect(() => {
    const adapter = createAspectImageAdapter(), urls = downloadUrls.current, reads = readSequence, work = workSequence
    owner.current = adapter; mounted.current = true
    return () => {
      mounted.current = false; reads.current++; work.current++; readAbort.current?.abort(); owner.current = null
      adapter.dispose(); sourceRef.current = null; previewRef.current = null; exportPending.current = false
      for (const [url, timer] of urls) { clearTimeout(timer); URL.revokeObjectURL(url) }; urls.clear()
    }
  }, [])
  useEffect(() => { const field = fileRef.current; field?.addEventListener('cancel', cancelRead); return () => field?.removeEventListener('cancel', cancelRead) }, [cancelRead])
  const output = useMemo(() => aspectOutputSize(width, height), [width, height])
  const settings = useMemo(() => ({ width, height, fit, padColor, x: position.x, y: position.y }), [width, height, fit, padColor, position.x, position.y])
  const key = JSON.stringify([sourceVersion, inputRevision, settings, retry])
  useLayoutEffect(() => { currentKey.current = key; invalidateWork() }, [key, invalidateWork])
  useEffect(() => {
    const adapter = owner.current, captured = sourceRef.current
    if (!adapter || !captured || !output.ok) return
    const token = workSequence.current
    const current = () => mounted.current && owner.current === adapter && sourceRef.current === captured && workSequence.current === token && currentKey.current === key && isInputCurrent(inputRevision)
    // One debounced reservation; canceled queued jobs do not allocate a canvas.
    const timer = setTimeout(() => {
      if (!current()) return
      setPreviewNotice({ key, kind: 'preview' })
      void adapter.preview(captured, settings, current).then(asset => {
        if (!current()) { asset.release(); return }
        previewRef.current?.release(); previewRef.current = asset; setPreviewState({ key, asset }); setPreviewNotice(null)
      }).catch(error => { if (current()) setPreviewNotice({ key, kind: 'preview', error: error instanceof AspectImageError ? error.code : 'canvas' }) })
    }, 60)
    return () => clearTimeout(timer)
  }, [key, source, output, settings, inputRevision, isInputCurrent])
  const visiblePreview = previewState?.key === key ? previewState.asset : null
  useLayoutEffect(() => {
    const host = canvasHost.current
    if (!host) return
    host.replaceChildren(...(visiblePreview ? [visiblePreview.canvas] : []))
    if (visiblePreview) { visiblePreview.canvas.style.width = '100%'; visiblePreview.canvas.style.height = '100%'; visiblePreview.canvas.setAttribute('aria-hidden', 'true') }
    return () => { host.replaceChildren() }
  }, [visiblePreview])

  const loadFile = useCallback((file: File | undefined) => {
    const adapter = owner.current
    cancelRead()
    if (!file || !adapter || !mounted.current) return
    invalidateWork(); setPreviewNotice(null); setExportNotice(null); setReadError(null); setLoading(true)
    const token = readSequence.current, abort = new AbortController(); readAbort.current = abort
    const current = () => mounted.current && owner.current === adapter && readSequence.current === token && !abort.signal.aborted
    void adapter.loadSource(file, current, abort.signal).then(asset => {
      if (!current()) { asset.release(); return }
      invalidateWork(); const previous = sourceRef.current; sourceRef.current = asset
      previewRef.current?.release(); previewRef.current = null; setPreviewState(null)
      setSource(asset); setSourceVersion(value => value + 1); setPosition({ x: 50, y: 50 }); setLoading(false); setReadError(null); readAbort.current = null; previous?.release()
    }).catch(error => { if (current()) { setLoading(false); setReadError(error instanceof AspectImageError ? error.code : 'decode'); readAbort.current = null; if (sourceRef.current) setRetry(value => value + 1) } })
  }, [cancelRead, invalidateWork])
  const clear = () => {
    cancelRead(); invalidateWork(); sourceRef.current?.release(); sourceRef.current = null; previewRef.current?.release(); previewRef.current = null
    setSource(null); setSourceVersion(value => value + 1); setPreviewState(null); setPosition({ x: 50, y: 50 }); setReadError(null); setPreviewNotice(null); setExportNotice(null)
    if (fileRef.current) fileRef.current.value = ''
  }
  const download = () => {
    const adapter = owner.current, captured = sourceRef.current
    if (!adapter || !captured || !output.ok || !mounted.current || exportPending.current || !isInputCurrent(inputRevision) || currentKey.current !== key) return
    const token = workSequence.current; exportPending.current = true; setExportNotice({ key, kind: 'export' })
    const current = () => mounted.current && owner.current === adapter && sourceRef.current === captured && token === workSequence.current && currentKey.current === key && isInputCurrent(inputRevision)
    void adapter.export(captured, settings, current).then(result => {
      if (!current()) return
      let url: string | null = null
      try {
        url = URL.createObjectURL(result.blob); const link = document.createElement('a')
        link.href = url; link.download = aspectImageFilename(captured.name, result.width, result.height, fit, result.mime)
        document.body.appendChild(link); try { link.click() } finally { link.remove() }
        const owned = url, timer = setTimeout(() => { if (downloadUrls.current.delete(owned)) URL.revokeObjectURL(owned) }, 1000)
        downloadUrls.current.set(owned, timer); url = null; setExportNotice(null)
      } catch { if (current()) setExportNotice({ key, kind: 'export', error: 'output' }) }
      finally { if (url) URL.revokeObjectURL(url) }
    }).catch(error => { if (current()) setExportNotice({ key, kind: 'export', error: error instanceof AspectImageError ? error.code : 'output' }) })
      .finally(() => { if (current()) exportPending.current = false })
  }
  const changePosition = (x: number, y: number) => { if (x === position.x && y === position.y) return; invalidateWork(); setPosition({ x, y }) }
  const geometry = source && output.ok ? aspectImageGeometry(source.width, source.height, output.width, output.height, position.x, position.y) : null
  const ratio = output.ok ? output.width / output.height : isAspectDimension(width) && isAspectDimension(height) ? width / height : 1
  const currentNotice = exportNotice?.key === key ? exportNotice : previewNotice?.key === key ? previewNotice : null
  return <div data-aspect-image-panel="" data-aspect-image-source={source?.name ?? ''} data-aspect-image-x={position.x} data-aspect-image-y={position.y} className="min-w-0 space-y-4">
    <div className={'flex min-h-64 min-w-0 items-center justify-center rounded-2xl bg-subtle p-3 sm:p-6 ' + (dragOver ? 'ring-2 ring-primary' : '')}
      onDragOver={event => { event.preventDefault(); setDragOver(true) }} onDragLeave={() => setDragOver(false)} onDrop={event => { event.preventDefault(); setDragOver(false); loadFile(event.dataTransfer.files[0]) }}>
      <div data-aspect-preview-bounds="" className="flex aspect-square w-full max-w-80 items-center justify-center">
        <div data-aspect-image-frame="" className="relative min-h-0 min-w-0 overflow-hidden rounded-md outline-2 outline-primary" style={{ width: ratio < 1 ? ratio * 100 + '%' : '100%', height: ratio >= 1 ? 100 / ratio + '%' : '100%' }}>
          <div ref={canvasHost} data-aspect-image-preview="" className="h-full w-full" />
          {!source && <div className="absolute inset-0 flex flex-col items-center justify-center px-2 text-center font-semibold tabular-nums text-primary"><span>{ratioLabel}</span><span className="text-xs font-normal text-muted">{width}×{height}</span></div>}
          {overlay}
        </div>
      </div>
    </div>
    {zoneNote}
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
      <div><h3 className="font-semibold text-fg">{t('image.title')}</h3><p className="mt-1 text-sm text-sub">{t('imageWork.limits')}</p></div>
      <input ref={fileRef} data-aspect-image-file="" type="file" accept="image/png,image/jpeg,image/webp,image/gif,.png,.jpg,.jpeg,.webp,.gif" className="hidden" onChange={event => { loadFile(event.target.files?.[0]); event.target.value = '' }} />
      <div className="flex flex-wrap gap-2"><button type="button" data-aspect-image-pick="" onClick={() => fileRef.current?.click()} className="ui-btn-soft min-h-11 px-4 py-2 text-sm">{t(source ? 'image.change' : 'image.pick')}</button>
        {(source || loading) && <button type="button" data-aspect-image-clear="" onClick={clear} className="ui-btn-soft min-h-11 px-3 py-2 text-sm">{t('image.remove')}</button>}</div>
    </div>
    {loading && <p role="status" data-aspect-image-status="loading" className="text-sm text-sub">{t('imageWork.loading')}</p>}
    {readError && readError !== 'canceled' && <p role="alert" data-aspect-image-error={readError} className="text-sm text-body">{t(`imageWork.errors.${readError}`)}</p>}
    {source && <>
      <div className="space-y-1 rounded-2xl bg-subtle p-4 text-sm tabular-nums text-sub">
        <p>{t('image.source', { w: source.width, h: source.height, ratio: reduceRatio(source.width, source.height).join(':') })}</p>
        <button type="button" data-aspect-image-use-size="" onClick={() => onUseSize(source.width, source.height)} className="min-h-11 text-primary">{t('image.useSize')}</button>
        {geometry && <p>{geometry.cutPct < .05 ? t('image.sameRatio') : fit === 'crop' ? t(source.width / source.height > ratio ? 'image.cropSides' : 'image.cropTopBottom', { pct: geometry.cutPct.toFixed(1) }) : t(source.width / source.height > ratio ? 'image.padTopBottom' : 'image.padSides')}</p>}
      </div>
      <div className="flex flex-wrap gap-2">
        {(['crop', 'pad'] as const).map(value => <button type="button" key={value} data-aspect-image-fit={value} aria-pressed={fit === value} className={segment(fit === value)} onClick={() => { if (value !== fit) { invalidateWork(); setFit(value) } }}>{t(`image.${value}`)}</button>)}
        {fit === 'pad' && (['#000000', '#ffffff'] as const).map(value => <button type="button" key={value} data-aspect-image-pad={value} aria-pressed={padColor === value} className={segment(padColor === value)} onClick={() => { if (padColor !== value) { invalidateWork(); setPadColor(value) } }}>{t(value === '#000000' ? 'image.black' : 'image.white')}</button>)}
      </div>
      {fit === 'crop' && geometry && <AspectCropControls x={position.x} y={position.y} canMoveX={geometry.canMoveX} canMoveY={geometry.canMoveY} onChange={changePosition} />}
      {output.ok ? <div className="space-y-2"><p data-aspect-image-output="" className="text-sm font-medium tabular-nums text-body">{t('imageWork.actualOutput', { width: output.width, height: output.height })}</p>{output.scaled && <p className="text-sm text-sub">{t('imageWork.scaled')}</p>}
        <button type="button" data-aspect-image-download="" disabled={currentNotice?.kind === 'export' && currentNotice.error === undefined} onClick={download} className="ui-btn min-h-11 px-4 py-2 text-sm disabled:opacity-40">{t('image.download', { w: output.width, h: output.height })}</button></div>
        : <p role="status" data-aspect-image-error={output.reason} className="text-sm text-body">{t(output.reason === 'tooThin' ? 'imageWork.errors.tooThin' : 'numberBounds.invalid')}</p>}
      {currentNotice && <div className="space-y-2"><p role={currentNotice.error ? 'alert' : 'status'} data-aspect-image-status={currentNotice.error ?? currentNotice.kind} className="text-sm text-body">{t(currentNotice.error ? `imageWork.errors.${currentNotice.error}` : currentNotice.kind === 'export' ? 'imageWork.exporting' : 'imageWork.previewing')}</p>
        {currentNotice.error && <button type="button" data-aspect-image-retry={currentNotice.kind} className="ui-btn-soft min-h-11 px-3 py-2 text-sm" onClick={() => { if (currentNotice.kind === 'export') download(); else { invalidateWork(); setRetry(value => value + 1) } }}>{t(currentNotice.kind === 'export' ? 'imageWork.retryExport' : 'imageWork.retryPreview')}</button>}</div>}
    </>}
    <p className="text-xs text-muted">{t('image.privacy')}</p>
  </div>
}
