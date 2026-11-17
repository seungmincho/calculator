'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslations } from '@/lib/i18n'
import '@/lib/i18n/ns/qrGenerator'
import { useOptionalLanguage } from '@/contexts/LanguageContext'
import { createQrBatchPrintPlan } from '@/utils/qrBatchPrint'
import { startQrBatchPrint, type QrBatchPrintJob } from '@/utils/qrBatchPrintJob'
import {
  generateQrBatch, parseQrBatch, QR_BATCH_MAX_BYTES, QR_BATCH_MAX_CHARS, QR_BATCH_MAX_ROWS, QR_BATCH_OPTIONS,
  type QrBatchImage,
} from '@/utils/qrBatch'

type Notice = 'ready' | 'edited' | 'cancelled' | 'downloaded' | 'zipFailed' | 'renderFailed' | 'printOpened' | 'printFailed' | null

export default function QrBatchGenerator() {
  const t = useTranslations('qrGenerator')
  const locale = useOptionalLanguage()?.language ?? 'ko'
  const [input, setInput] = useState('')
  const [result, setResult] = useState<{ input: string; images: QrBatchImage[] } | null>(null)
  const [busy, setBusy] = useState<'generate' | 'zip' | 'print' | null>(null)
  const [progress, setProgress] = useState(0)
  const [notice, setNotice] = useState<Notice>(null)
  const [failedLine, setFailedLine] = useState<number | null>(null)
  const generation = useRef(0)
  const printJob = useRef<QrBatchPrintJob | null>(null)
  const plan = useMemo(() => parseQrBatch(input), [input])
  const fresh = result?.input === input && plan.valid ? result : null
  const printPlan = useMemo(() => fresh ? createQrBatchPrintPlan(input, fresh.images) : null, [fresh, input])
  const view = { input, busy, result, locale }
  const currentView = useRef(view)
  currentView.current = view

  useEffect(() => () => { generation.current++; printJob.current?.cancel() }, [locale])

  useEffect(() => { setBusy(null); setNotice(null) }, [locale])

  const invalidate = () => {
    generation.current++
    printJob.current?.cancel()
    printJob.current = null
  }

  const changeInput = (value: string) => {
    if (currentView.current !== view || value === input) return
    invalidate()
    setNotice(busy || result ? 'edited' : null)
    setInput(value)
    setResult(null)
    setBusy(null)
    setProgress(0)
    setFailedLine(null)
  }

  const cancel = () => {
    if (currentView.current !== view) return
    invalidate()
    setBusy(null)
    if (busy !== 'print') setResult(null)
    setProgress(0)
    setFailedLine(null)
    setNotice('cancelled')
  }

  const generate = async () => {
    if (currentView.current !== view || !plan.valid || busy) return
    invalidate()
    const token = ++generation.current
    const source = input
    setBusy('generate')
    setProgress(0)
    setResult(null)
    setNotice(null)
    setFailedLine(null)
    const cancelled = () => generation.current !== token || currentView.current.locale !== locale
    try {
      const QRCode = (await import('qrcode')).default
      if (cancelled()) return
      const generated = await generateQrBatch(plan, payload => QRCode.toDataURL(payload, QR_BATCH_OPTIONS), cancelled,
        count => { if (!cancelled()) setProgress(count) })
      if (cancelled()) return
      if (generated.status === 'done') {
        setResult({ input: source, images: generated.images })
        setNotice('ready')
      } else if (generated.status === 'failed') {
        setFailedLine(generated.line)
        setNotice('renderFailed')
      }
    } catch {
      if (!cancelled()) setNotice('renderFailed')
    } finally {
      if (!cancelled()) setBusy(null)
    }
  }

  const downloadZip = async () => {
    if (currentView.current !== view || !fresh || busy) return
    invalidate()
    const token = ++generation.current
    const images = fresh.images
    const cancelled = () => generation.current !== token || currentView.current.locale !== locale
    setBusy('zip')
    setProgress(0)
    setNotice(null)
    try {
      const JSZip = (await import('jszip')).default
      if (cancelled()) return
      const zip = new JSZip()
      images.forEach(image => zip.file(image.row.filename, image.dataUrl.split(',')[1], { base64: true }))
      const blob = await zip.generateAsync({ type: 'blob', compression: 'STORE' }, metadata => {
        if (!cancelled()) setProgress(Math.round(metadata.percent))
      })
      if (cancelled()) return
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = `qr-batch-${images.length}.zip`
      document.body.appendChild(anchor)
      try { anchor.click() } finally { anchor.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000) }
      setNotice('downloaded')
    } catch {
      if (!cancelled()) setNotice('zipFailed')
    } finally {
      if (!cancelled()) setBusy(null)
    }
  }

  const printBatch = async () => {
    if (currentView.current !== view || !printPlan || busy) return
    invalidate()
    const token = ++generation.current
    const current = () => generation.current === token && currentView.current.locale === locale
    setBusy('print')
    setNotice(null)
    const job = startQrBatchPrint(printPlan, {
      title: t('batch.print.documentTitle'),
      row: line => t('batch.print.row', { line }),
      page: (page, total) => t('batch.print.page', { page, total }),
    }, locale, current)
    printJob.current = job
    const outcome = await job.done
    if (!current()) return
    setBusy(null)
    setNotice(outcome === 'opened' ? 'printOpened' : outcome === 'failed' ? 'printFailed' : 'cancelled')
  }

  return (
    <section id="qr-batch" aria-labelledby="qr-batch-title" aria-busy={!!busy} className="ui-card min-w-0 scroll-mt-20 p-4 sm:p-6 space-y-5">
      <div>
        <h2 id="qr-batch-title" className="text-lg font-semibold text-fg">{t('batch.title')}</h2>
        <p className="mt-1 text-sm text-sub">{t('batch.description')}</p>
        <p className="mt-2 text-xs text-muted">{t('batch.fixedSettings')}</p>
      </div>

      <label className="block">
        <span className="text-sm font-medium text-body">{t('batch.inputLabel')}</span>
        <textarea value={input} onChange={event => changeInput(event.target.value)} rows={6} spellCheck={false}
          aria-describedby="qr-batch-input-help" placeholder={t('batch.placeholder')}
          className="ui-field mt-1.5 min-h-11 px-4 py-3 text-base resize-y" />
      </label>
      <div id="qr-batch-input-help" className="space-y-1 text-xs text-muted">
        <p>{t('batch.syntax')}</p>
        <p>{t('batch.limits', { rows: QR_BATCH_MAX_ROWS, bytes: QR_BATCH_MAX_BYTES.toLocaleString(), chars: QR_BATCH_MAX_CHARS.toLocaleString() })}</p>
        <p>{t('batch.privacy')}</p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button type="button" disabled={!plan.valid || !!busy} onClick={() => void generate()} className="ui-btn min-h-11 px-4 py-2 text-sm disabled:opacity-45">{t('batch.generate')}</button>
        <button type="button" disabled={!fresh || !!busy} onClick={() => void downloadZip()} className="ui-btn-soft min-h-11 px-4 py-2 text-sm disabled:opacity-45">{t('batch.download')}</button>
        <button type="button" data-qr-batch-print disabled={!printPlan || !!busy} onClick={() => void printBatch()} className="ui-btn-soft min-h-11 px-4 py-2 text-sm disabled:opacity-45">{t('batch.print.button')}</button>
        {busy && <button type="button" onClick={cancel} className="ui-btn-soft min-h-11 px-4 py-2 text-sm">{t('batch.cancel')}</button>}
      </div>
      {printPlan && <div className="space-y-1 text-xs text-muted" data-qr-batch-print-summary>
        <p>{t('batch.print.summary', { count: printPlan.count, pages: printPlan.pages.length })}</p>
        <p>{t('batch.print.hint')}</p>
        {printPlan.shortened > 0 && <p>{t('batch.print.shortened', { count: printPlan.shortened })}</p>}
      </div>}
      {busy && <p role="status" className="text-sm text-primary tabular-nums">{t(busy === 'generate' ? 'batch.generating' : busy === 'zip' ? 'batch.zipping' : 'batch.print.preparing', { count: progress, total: plan.rowCount })}</p>}
      {notice && <p role={notice === 'zipFailed' || notice === 'renderFailed' || notice === 'printFailed' ? 'alert' : 'status'} className="text-sm text-sub">{t(`batch.notices.${notice}`, { count: fresh?.images.length ?? 0 })}</p>}
      {failedLine !== null && <p role="alert" className="text-sm text-sub">{t('batch.failedLine', { line: failedLine })}</p>}
      {plan.error && input.length > 0 && <p role="alert" className="bg-amber-50 text-amber-800 rounded-2xl p-4 text-sm">{t(`batch.errors.${plan.error}`, { count: plan.rowCount })}</p>}

      {plan.rows.length > 0 && (
        <div className="space-y-3">
          <p className="text-sm text-sub">{t('batch.summary', { count: plan.rowCount, errors: plan.rows.filter(row => row.error).length })}</p>
          <p className="text-xs text-muted">{t('batch.mapping')}</p>
          <ol className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {plan.rows.map(row => {
              const image = fresh?.images.find(item => item.row.line === row.line)
              return (
                <li key={row.line} className="min-w-0 bg-subtle rounded-2xl p-4 space-y-2">
                  <h3 className="text-sm font-semibold text-fg [overflow-wrap:anywhere]">{t('batch.rowTitle', { line: row.line, label: row.label || t('batch.unnamed') })}</h3>
                  <p className="text-xs text-muted [overflow-wrap:anywhere]">{row.filename}</p>
                  <pre className="text-xs text-body whitespace-pre-wrap [overflow-wrap:anywhere] max-h-24 overflow-y-auto">{row.payload || t('batch.emptyPayload')}</pre>
                  <p className="text-xs text-muted tabular-nums">{t('batch.byteCount', { count: row.bytes.toLocaleString() })}</p>
                  {row.error && <p role="alert" className="text-sm text-sub">{t(`batch.rowErrors.${row.error}`)}</p>}
                  {image && (
                    // Generated PNG data stays in memory and is never uploaded.
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={image.dataUrl} width={512} height={512} alt={t('batch.previewAlt', { line: row.line })}
                      className="block mx-auto w-full max-w-56 aspect-square rounded-xl" />
                  )}
                </li>
              )
            })}
          </ol>
        </div>
      )}
    </section>
  )
}
