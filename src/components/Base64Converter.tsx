'use client'

import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useTranslations } from '@/lib/i18n'
import '@/lib/i18n/ns/base64Converter'
import MobileResultLink from '@/components/MobileResultLink'
import Base64CopyRecovery from '@/components/Base64CopyRecovery'
import { copyBase64Text, createBase64ActionGuard, createBase64ImagePreview, readBase64File, type Base64Preview } from '@/utils/base64Actions'
import { Base64CodecError, base64DataUrl, decodeBase64, encodeBase64Bytes, encodeBase64Text, safeBase64Filename, type Base64ErrorCode, type Base64Format } from '@/utils/base64Codec'

type Mode = 'encode' | 'decode'
type OutputView = 'raw' | 'dataUrl'
type FileSource = { bytes: Uint8Array; name: string; mime: string }
type Form = { input: string; mode: Mode; format: Base64Format; padding: boolean; file: FileSource | null; filename: string }
type Result = { mode: Mode; bytes: Uint8Array; text: string | null; dataUrl: string | null; filename: string }
type Message = Base64ErrorCode | 'empty' | 'convertFailed' | 'downloadFailed'

function convert(form: Form): Result | null {
  if (!form.file && form.input === '') return null
  if (form.mode === 'decode') {
    const decoded = decodeBase64(form.input, form.format)
    return { mode: 'decode', bytes: decoded.bytes, text: decoded.text, dataUrl: null, filename: form.filename }
  }
  const encoded = form.file
    ? { bytes: form.file.bytes, value: encodeBase64Bytes(form.file.bytes, form.format, form.padding) }
    : encodeBase64Text(form.input, form.format, form.padding)
  return { mode: 'encode', bytes: encoded.bytes, text: encoded.value, dataUrl: base64DataUrl(encoded.bytes, form.file?.mime ?? 'text/plain'), filename: form.file?.name ?? form.filename }
}

export default function Base64Converter() {
  const t = useTranslations('base64Converter')
  // Capture the example once: language changes never replace user content or results.
  const [form, setForm] = useState<Form>(() => ({ input: t('flow.sample'), mode: 'encode', format: 'standard', padding: false, file: null, filename: 'converted' }))
  const [result, setResult] = useState<Result | null>(() => convert(form))
  const [view, setView] = useState<OutputView>('raw')
  const [changed, setChanged] = useState(false)
  const [error, setError] = useState<Message | null>(null)
  const [reading, setReading] = useState(false)
  const [preview, setPreview] = useState<Base64Preview | null>(null)
  const [copied, setCopied] = useState(false)
  const [copyPending, setCopyPending] = useState(false)
  const [recovery, setRecovery] = useState<{ text: string; request: number } | null>(null)
  const formRef = useRef(form), resultRef = useRef(result), viewRef = useRef(view)
  const mounted = useRef(false), guard = useRef(createBase64ActionGuard())
  const previewController = useRef<AbortController | null>(null)
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const downloadUrls = useRef(new Map<string, ReturnType<typeof setTimeout>>())

  useLayoutEffect(() => {
    mounted.current = true
    const actions = guard.current, urls = downloadUrls.current
    return () => {
      mounted.current = false; actions.invalidate(); previewController.current?.abort()
      if (copyTimer.current !== null) clearTimeout(copyTimer.current)
      for (const [url, timer] of urls) { clearTimeout(timer); URL.revokeObjectURL(url) }
      urls.clear()
    }
  }, [])

  useEffect(() => {
    if (!result) return
    const controller = new AbortController()
    previewController.current = controller
    void createBase64ImagePreview(result.bytes, controller.signal).then(next => {
      if (mounted.current && resultRef.current === result && !controller.signal.aborted) setPreview(next)
      else if (next.status === 'ready') next.release()
    })
    return () => { controller.abort(); if (previewController.current === controller) previewController.current = null }
  }, [result])

  const resetCopy = () => {
    guard.current.beginCopy()
    if (copyTimer.current !== null) clearTimeout(copyTimer.current)
    copyTimer.current = null
    setCopied(false); setCopyPending(false); setRecovery(null)
  }
  const invalidate = () => {
    guard.current.invalidate(); previewController.current?.abort(); resetCopy()
    resultRef.current = null; setResult(null); setPreview(null); setReading(false); setError(null)
  }
  const edit = (next: Form) => {
    invalidate(); formRef.current = next; setForm(next); setChanged(true)
  }
  const publish = (next: Form) => {
    try {
      const converted = convert(next)
      resultRef.current = converted; setResult(converted); setChanged(false)
      setError(converted ? null : 'empty')
    } catch (cause) {
      setChanged(false); setError(cause instanceof Base64CodecError ? cause.code : 'convertFailed')
    }
  }
  const handleConvert = () => { if (!mounted.current) return; invalidate(); publish(formRef.current) }
  const changeMode = (next: Mode) => {
    if (next === formRef.current.mode) return
    edit({ ...formRef.current, mode: next, file: null })
  }
  const upload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file || !mounted.current) return
    invalidate(); setChanged(true); setReading(true)
    const actions = guard.current, token = actions.beginRead(), snapshot = formRef.current
    const current = () => mounted.current && actions.isCurrent(token)
    const read = await readBase64File(file, snapshot.mode, current)
    if (!current() || read.status === 'stale') return
    setReading(false)
    if (read.status === 'failed') { setError(read.error); return }
    const next: Form = read.kind === 'file'
      ? { ...snapshot, input: '', filename: read.name, file: { bytes: read.bytes, name: read.name, mime: read.mime } }
      : { ...snapshot, input: read.text, filename: read.name, file: null }
    formRef.current = next; setForm(next)
    // Preserve automatic file encoding; decode uploads fill the source for explicit conversion.
    if (read.kind === 'file') publish(next)
  }
  const output = result ? view === 'dataUrl' && result.mode === 'encode' ? result.dataUrl : result.text : null
  const changeView = (next: OutputView) => { resetCopy(); viewRef.current = next; setView(next) }
  const copy = async () => {
    if (!mounted.current || !result || resultRef.current !== result || output === null || viewRef.current !== view) return
    const actions = guard.current, token = actions.beginCopy()
    const current = () => mounted.current && actions.isCurrent(token) && resultRef.current === result && viewRef.current === view
    if (copyTimer.current !== null) clearTimeout(copyTimer.current)
    copyTimer.current = null
    setCopied(false); setCopyPending(true)
    const outcome = await copyBase64Text(output, current)
    if (!current() || outcome === 'stale') return
    setCopyPending(false)
    if (outcome === 'copied') {
      setRecovery(null); setCopied(true)
      copyTimer.current = setTimeout(() => { if (current()) { setCopied(false); copyTimer.current = null } }, 2000)
    } else setRecovery({ text: output, request: token.request })
  }
  const swap = () => {
    if (!result || resultRef.current !== result || output === null || output === '' || viewRef.current !== view) return
    edit({ ...formRef.current, input: output, mode: result.mode === 'encode' ? 'decode' : 'encode', file: null, filename: 'converted' })
    viewRef.current = 'raw'; setView('raw')
  }
  const clear = () => {
    edit({ ...formRef.current, input: '', file: null, filename: 'converted' }); setChanged(false)
    viewRef.current = 'raw'; setView('raw')
  }
  const download = () => {
    if (!mounted.current || !result || resultRef.current !== result || viewRef.current !== view) return
    let url: string | null = null
    let link: HTMLAnchorElement | null = null
    try {
      const raster = preview?.status === 'ready' ? preview.mime : null
      const extension = result.mode === 'encode' ? 'txt' : raster === 'image/png' ? 'png' : raster === 'image/jpeg' ? 'jpg' : raster === 'image/gif' ? 'gif' : raster === 'image/webp' ? 'webp' : result.text !== null ? 'txt' : 'bin'
      const blob = result.mode === 'encode'
        ? new Blob([output ?? ''], { type: 'text/plain;charset=utf-8' })
        : new Blob([new Uint8Array(result.bytes).buffer], { type: raster ?? (result.text !== null ? 'text/plain;charset=utf-8' : 'application/octet-stream') })
      url = URL.createObjectURL(blob); link = document.createElement('a')
      link.href = url; link.download = safeBase64Filename(result.filename, extension)
      document.body.appendChild(link); link.click()
      const created = url
      downloadUrls.current.set(created, setTimeout(() => { URL.revokeObjectURL(created); downloadUrls.current.delete(created) }, 1000))
      url = null; setError(null)
    } catch { setError('downloadFailed') }
    finally { link?.remove(); if (url) URL.revokeObjectURL(url) }
  }
  const errorText = error === 'empty' || error === 'convertFailed' || error === 'downloadFailed' ? t('flow.' + error) : error ? t('codecErrors.' + error) : null
  const button = (selected: boolean) => 'min-h-11 rounded-xl px-4 py-2 text-sm font-medium ' + (selected ? 'bg-primary text-white' : 'ui-btn-soft')

  return <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
    <header className="mb-6">
      <h1 className="text-2xl font-bold text-fg">{t('title')}</h1>
      <p className="mt-1 text-sm text-muted">{t('description')}</p>
    </header>
    <div className="mb-5 flex flex-wrap gap-2" aria-label={t('flow.mode')}>
      {(['encode', 'decode'] as const).map(mode => <button key={mode} type="button" data-base64-mode={mode} aria-pressed={form.mode === mode} onClick={() => changeMode(mode)} className={button(form.mode === mode)}>{t('modes.' + mode)}</button>)}
    </div>
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <section className="ui-card min-w-0 space-y-4 p-4 sm:p-5">
        <MobileResultLink href="#base64-converter-result" label={t('flow.result')} value={result ? t(result.mode === 'encode' ? 'flow.sourceBytes' : 'flow.bytes', { bytes: result.bytes.byteLength }) : t(changed ? 'flow.changed' : 'flow.empty')} />
        <div>
          <label htmlFor="base64-format" className="mb-2 block text-sm font-medium text-body">{t('flow.format')}</label>
          <select id="base64-format" data-base64-format="" value={form.format} onChange={event => edit({ ...formRef.current, format: event.target.value === 'url' ? 'url' : 'standard' })} className="ui-field min-h-11 w-full px-3 py-2 text-base">
            <option value="standard">{t('flow.standard')}</option><option value="url">{t('flow.url')}</option>
          </select>
          {form.mode === 'encode' && form.format === 'url' && <label className="mt-2 flex min-h-11 items-center gap-2 text-sm text-body"><input type="checkbox" data-base64-padding="" checked={form.padding} onChange={event => edit({ ...formRef.current, padding: event.target.checked })} className="h-5 w-5 accent-[var(--primary)]" />{t('flow.padding')}</label>}
          <p className="mt-2 text-xs leading-relaxed text-muted">{t(form.mode === 'encode' ? 'flow.paddingHint' : 'flow.decodeRules')}</p>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2">
          {!form.file && <label htmlFor="base64-input" className="text-sm font-medium text-body">{form.mode === 'encode' ? t('input.text') : t('input.base64')}</label>}
          <label className="ui-btn-soft relative flex min-h-11 cursor-pointer items-center rounded-xl px-3 py-2 text-sm focus-within:outline-2 focus-within:outline-primary">
            {t('actions.upload')}
            <input type="file" data-base64-upload="" aria-label={t('actions.upload')} onChange={upload} className="sr-only" accept={form.mode === 'decode' ? '.txt,.base64,.b64,text/plain' : undefined} />
          </label>
        </div>
        {form.file ? <div data-base64-file-source="" className="space-y-3 rounded-xl bg-subtle p-4 text-sm text-body">
          <p className="font-medium">{t('flow.fileSource')}</p>
          <p className="[overflow-wrap:anywhere]">{t('flow.fileSelected', { name: form.file.name, bytes: form.file.bytes.byteLength })}</p>
          <p className="text-sub">{t('flow.fileSourceHint')}</p>
          <button type="button" data-base64-use-text="" onClick={() => edit({ ...formRef.current, file: null, filename: 'converted' })} className="ui-btn-soft min-h-11 px-3 py-2">{t('flow.useText')}</button>
        </div> : <textarea id="base64-input" data-base64-input="" value={form.input} onChange={event => edit({ ...formRef.current, input: event.target.value, file: null, filename: 'converted' })} rows={8} spellCheck={false} autoComplete="off" autoCorrect="off" autoCapitalize="off" placeholder={t(form.mode === 'encode' ? 'input.textPlaceholder' : 'input.base64Placeholder')} className="ui-field w-full min-w-0 resize-y px-3 py-3 text-base font-mono" />}
        {form.mode === 'decode' && <p className="text-xs text-muted">{t('flow.decodeFileHint')}</p>}
        <p className="text-xs leading-relaxed text-muted">{t('flow.limits')}</p>
        <div className="flex flex-wrap gap-2">
          <button type="button" data-base64-convert="" onClick={handleConvert} disabled={reading} className="ui-btn min-h-11 px-4 py-2">{t(form.mode === 'encode' ? 'actions.encode' : 'actions.decode')}</button>
          <button type="button" data-base64-clear="" onClick={clear} className="ui-btn-soft min-h-11 px-4 py-2">{t('actions.clear')}</button>
        </div>
        {reading && <p data-base64-reading="" role="status" className="text-sm text-sub">{t('flow.reading')}</p>}
        {errorText && <p data-base64-error="" role="alert" className="text-sm text-red-600">{errorText}</p>}
      </section>
      <section id="base64-converter-result" className="ui-card min-w-0 scroll-mt-20 space-y-4 p-4 sm:p-5">
        <h2 className="text-lg font-semibold text-fg">{t('flow.result')}</h2>
        {result?.mode === 'encode' && <div className="flex flex-wrap gap-2">
          {(['raw', 'dataUrl'] as const).map(value => <button key={value} type="button" data-base64-output-view={value} aria-pressed={view === value} onClick={() => changeView(value)} className={button(view === value)}>{t('flow.' + value)}</button>)}
        </div>}
        {result?.mode === 'encode' && view === 'dataUrl' && <p className="text-xs text-muted">{t('flow.dataUrlRule')}</p>}
        {result && <p data-base64-bytes="" className="text-sm text-sub">{t(result.mode === 'encode' ? 'flow.sourceBytes' : 'flow.bytes', { bytes: result.bytes.byteLength })}</p>}
        {result?.mode === 'decode' && <p data-base64-utf8={result.text !== null} className="text-sm text-body">{t(result.text !== null ? 'flow.utf8' : 'flow.binary')}</p>}
        {(!result || output !== null) && <div>
          <label htmlFor="base64-output" className="mb-2 block text-sm font-medium text-body">{t(result?.mode === 'decode' ? 'output.text' : 'output.base64')}</label>
          <textarea id="base64-output" data-base64-output="" value={output ?? ''} readOnly rows={8} spellCheck={false} className="ui-field w-full min-w-0 resize-y px-3 py-3 text-base font-mono" />
        </div>}
        {!result && <p data-base64-result-empty="" role="status" className="text-sm text-sub">{t(changed ? 'flow.changed' : 'flow.empty')}</p>}
        {preview?.status === 'ready' && <img data-base64-preview="" src={preview.url} alt={t('flow.previewAlt')} className="mx-auto max-h-64 max-w-full rounded-xl object-contain" />}
        {preview?.status === 'failed' && <p data-base64-preview-failed="" className="text-sm text-sub">{t('flow.previewFailed')}</p>}
        <div className="flex flex-wrap gap-2">
          <button type="button" data-base64-copy="" data-base64-copied={copied} disabled={!result || output === null || copyPending} onClick={copy} className="ui-btn min-h-11 px-3 py-2 text-sm">{t(copied ? 'actions.copied' : copyPending ? 'flow.copying' : 'actions.copy')}</button>
          <button type="button" data-base64-download="" disabled={!result} onClick={download} className="ui-btn-soft min-h-11 px-3 py-2 text-sm">{t('flow.download')}</button>
          <button type="button" data-base64-swap="" disabled={!result || output === null || output === ''} onClick={swap} className="ui-btn-soft min-h-11 px-3 py-2 text-sm">{t('flow.swap')}</button>
        </div>
        {copied && <p role="status" className="text-sm text-sub">{t('actions.copied')}</p>}
        {recovery && <Base64CopyRecovery key={recovery.request} text={recovery.text} busy={copyPending} onRetry={copy} onClose={resetCopy} />}
      </section>
    </div>
    <p className="mt-4 text-sm leading-relaxed text-sub">{t('flow.privacy')}</p>
    <section className="ui-card mt-8 p-5 sm:p-6">
      <h2 className="mb-4 text-lg font-semibold text-fg">{t('guide.title')}</h2>
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div><h3 className="mb-3 text-sm font-medium text-body">{t('guide.whatIs.title')}</h3><p className="text-sm text-sub">{t('guide.whatIs.description')}</p></div>
        <div><h3 className="mb-3 text-sm font-medium text-body">{t('guide.useCases.title')}</h3><ul className="list-disc space-y-2 pl-5 text-sm text-sub">{(t.raw('guide.useCases.items') as string[]).map((item, index) => <li key={index}>{item}</li>)}</ul></div>
      </div>
    </section>
  </div>
}
