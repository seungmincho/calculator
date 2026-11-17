'use client'
import { useCallback, useId, useLayoutEffect, useRef, useState } from 'react'
import { useTranslations } from '@/lib/i18n'
import '@/lib/i18n/ns/qrScanner'
import { readQrImage } from '@/lib/qr/image'
import { canRetryQrImage, checkQrImageSelection, qrImageFailureStatus, qrImageHttpLink, qrImagesText, QrImageError, type QrImageRow } from '@/utils/qrImageBatch'
import { copyQrText } from '@/utils/qrClipboard'
import QrCopyRecovery from '@/components/QrCopyRecovery'

export default function QrBatchScanner({ active }: { active: boolean }) {
  const t = useTranslations('qrScanner'), inputId = useId()
  const [rows, setRows] = useState<QrImageRow[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState<'count' | 'total' | 'downloaded' | 'downloadFailed' | null>(null)
  const [copy, setCopy] = useState<{ id: string; text: string; status: 'pending' | 'copied' | 'failed' } | null>(null)
  const rowsRef = useRef<QrImageRow[]>([]), files = useRef(new Map<string, File>())
  const generation = useRef(0), copyGeneration = useRef(0), fileSequence = useRef(0)
  const mounted = useRef(false), working = useRef(false), controller = useRef<AbortController | null>(null)
  const downloads = useRef(new Set<string>())
  const update = useCallback((next: QrImageRow[]) => { rowsRef.current = next; setRows(next) }, [])
  const invalidate = useCallback(() => { generation.current++; copyGeneration.current++; controller.current?.abort(); controller.current = null; working.current = false }, [])
  const stop = () => {
    invalidate(); setBusy(false); setCopy(null)
    update(rowsRef.current.map(row => row.status === 'waiting' || row.status === 'processing' ? { ...row, status: 'canceled', error: 'canceled' } : row))
  }
  useLayoutEffect(() => {
    mounted.current = true
    const retainedFiles = files.current, retainedDownloads = downloads.current
    return () => { mounted.current = false; invalidate(); retainedFiles.clear(); retainedDownloads.forEach(url => URL.revokeObjectURL(url)); retainedDownloads.clear() }
  }, [invalidate])
  useLayoutEffect(() => {
    if (active) return
    invalidate()
    const request = generation.current
    queueMicrotask(() => {
      if (!mounted.current || generation.current !== request) return
      setBusy(false); setCopy(null)
      update(rowsRef.current.map(row => row.status === 'waiting' || row.status === 'processing' ? { ...row, status: 'canceled', error: 'canceled' } : row))
    })
  }, [active, invalidate, update])

  const choose = (selection: FileList | null) => {
    if (!selection?.length) return
    const next = Array.from(selection), error = checkQrImageSelection(next)
    if (error) { setNotice(error); return }
    invalidate(); setBusy(false); setCopy(null); setNotice(null); setSelected(new Set()); files.current.clear()
    update(next.map((file, index) => {
      const id = `qr-image-${++fileSequence.current}`
      files.current.set(id, file)
      return { id, index, name: file.name, status: 'waiting' }
    }))
  }
  const run = async (retry: boolean) => {
    if (!active || working.current) return
    const jobs = rowsRef.current.filter(row => retry ? canRetryQrImage(row) : row.status === 'waiting')
    if (!jobs.length) return
    invalidate(); const request = generation.current, abort = new AbortController()
    controller.current = abort; working.current = true; setBusy(true); setNotice(null); setCopy(null)
    const current = () => mounted.current && generation.current === request && !abort.signal.aborted
    const patch = (id: string, value: Partial<QrImageRow>) => update(rowsRef.current.map(row => row.id === id ? { ...row, ...value } : row))
    try {
      for (const job of jobs) {
        if (!current()) return
        const file = files.current.get(job.id)
        if (!file) continue
        patch(job.id, { status: 'processing', error: undefined, text: undefined, scaled: undefined, multiple: undefined })
        try {
          const result = await readQrImage(file, abort.signal)
          if (!current()) return
          patch(job.id, { ...result, text: result.text ?? undefined, status: result.text === null ? 'notDetected' : 'success' })
        } catch (cause) {
          if (!current()) return
          const code = cause instanceof QrImageError ? cause.code : 'read'
          patch(job.id, { status: qrImageFailureStatus(code), error: code })
        }
      }
    } finally { if (current()) { working.current = false; controller.current = null; setBusy(false) } }
  }
  const copyResult = async (row: QrImageRow) => {
    if (row.status !== 'success' || row.text === undefined) return
    const request = ++copyGeneration.current, current = () => mounted.current && copyGeneration.current === request
    setCopy({ id: row.id, text: row.text, status: 'pending' })
    const result = await copyQrText(row.text, current)
    if (current() && result !== null) setCopy({ id: row.id, text: row.text, status: result ? 'copied' : 'failed' })
  }
  const download = () => {
    if (!selected.size) return
    let url: string | undefined
    try {
      const body = qrImagesText(rows, selected)
      url = URL.createObjectURL(new Blob([body], { type: 'text/plain;charset=utf-8' })); downloads.current.add(url)
      const link = document.createElement('a'); link.href = url; link.download = `qr-images-${new Date().toISOString().slice(0, 10)}.txt`
      document.body.appendChild(link); try { link.click() } finally { link.remove() }
      const finished = url
      setTimeout(() => { URL.revokeObjectURL(finished); downloads.current.delete(finished) }, 1000)
      setNotice('downloaded')
    } catch { if (url) { URL.revokeObjectURL(url); downloads.current.delete(url) } setNotice('downloadFailed') }
  }
  return <section aria-labelledby="qr-batch-title" className="min-w-0 space-y-4" data-qr-batch="">
    <div><h2 id="qr-batch-title" className="text-lg font-semibold text-fg">{t('batch.title')}</h2><p className="mt-2 text-sm text-sub">{t('batch.description')}</p></div>
    <p className="text-xs leading-relaxed text-muted">{t('batch.limits')}</p>
    <label htmlFor={inputId} className="block text-sm font-medium text-body">{t('batch.choose')}</label>
    <input id={inputId} data-qr-batch-input="" type="file" multiple accept="image/png,image/jpeg,image/webp,image/gif" onChange={event => { choose(event.target.files); event.target.value = '' }} className="ui-field min-h-11 w-full min-w-0 px-3 py-3 text-base" />
    <div className="flex flex-wrap gap-2">
      <button type="button" onClick={() => { void run(false) }} disabled={busy || !rows.some(row => row.status === 'waiting')} className="ui-btn min-h-11 px-4 py-2 text-sm disabled:opacity-50">{t('batch.start')}</button>
      <button type="button" onClick={() => { void run(true) }} disabled={busy || !rows.some(canRetryQrImage)} className="ui-btn-soft min-h-11 px-4 py-2 text-sm disabled:opacity-50">{t('batch.retry')}</button>
      {busy && <button type="button" onClick={stop} className="ui-btn-soft min-h-11 px-4 py-2 text-sm">{t('batch.cancel')}</button>}
      {!!rows.length && <button type="button" onClick={() => { stop(); files.current.clear(); update([]); setSelected(new Set()); setNotice(null) }} className="ui-btn-soft min-h-11 px-4 py-2 text-sm">{t('batch.clear')}</button>}
    </div>
    <p role="status" aria-live="polite" className="text-sm text-sub">{t('batch.progress', { done: rows.filter(row => !['waiting', 'processing'].includes(row.status)).length, total: rows.length })}{busy ? ` · ${t('batch.running')}` : ''}</p>
    {notice && <p role={notice === 'downloaded' ? 'status' : 'alert'} className="text-sm text-body">{t(`batch.notices.${notice}`)}</p>}
    <p className="text-xs leading-relaxed text-muted">{t('batch.processingHint')}</p>
    {!!rows.length && <ul className="space-y-3" aria-label={t('batch.results')}>{rows.map(row => {
      const link = row.text === undefined ? null : qrImageHttpLink(row.text)
      return <li key={row.id} data-qr-batch-row={row.id} data-qr-status={row.status} className="min-w-0 space-y-3 rounded-xl bg-subtle p-4">
        <h3 className="break-all text-sm font-semibold text-fg">{row.index + 1}. {row.name}</h3>
        <p className="text-sm text-sub">{t(`batch.status.${row.status}`)}{row.error && row.error !== 'canceled' ? ` · ${t(`batch.errors.${row.error}`)}` : ''}</p>
        {row.scaled && <p className="text-xs text-muted">{t('batch.scaled')}</p>}
        {row.multiple && <p className="text-xs text-muted">{t('batch.multiple')}</p>}
        {row.status === 'success' && <>
          <p data-qr-batch-text="" className="whitespace-pre-wrap break-all text-sm font-mono text-fg">{row.text || t('batch.emptyText')}</p>
          <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm text-body"><input type="checkbox" checked={selected.has(row.id)} onChange={() => { setSelected(previous => { const next = new Set(previous); if (next.has(row.id)) next.delete(row.id); else next.add(row.id); return next }) }} className="h-5 w-5 shrink-0 accent-primary" />{t('batch.selectResult', { number: row.index + 1 })}</label>
          <div className="flex flex-wrap gap-2"><button type="button" onClick={() => { void copyResult(row) }} className="ui-btn-soft min-h-11 px-3 py-2 text-sm">{copy?.id === row.id && copy.status === 'copied' ? t('copied') : t('copy')}</button>{link && <a href={link} target="_blank" rel="noopener noreferrer" className="ui-btn-soft inline-flex min-h-11 items-center px-3 py-2 text-sm">{t('openLink')}</a>}</div>
          {copy?.id === row.id && copy.status === 'failed' && <QrCopyRecovery text={copy.text} onRetry={() => { void copyResult(row) }} onClose={() => { copyGeneration.current++; setCopy(null) }} />}
        </>}
      </li>
    })}</ul>}
    <button type="button" onClick={download} disabled={!selected.size} className="ui-btn min-h-11 w-full px-4 py-3 text-sm disabled:opacity-50">{t('batch.download', { count: selected.size })}</button>
    <p className="text-xs text-muted">{t('batch.privacy')}</p>
  </section>
}
