'use client'

import { useId, useRef, useState } from 'react'
import { useTranslations } from '@/lib/i18n'
import '@/lib/i18n/ns/imageOcr'

export interface OcrCopyFailure {
  readonly text: string
  readonly label: string
}

/** Parent owns each failure object and invalidates it when its source or output request changes. */
export default function OcrCopyRecovery({ failure, isCurrent, onRetry, onClose }: {
  failure: OcrCopyFailure
  isCurrent: (failure: OcrCopyFailure) => boolean
  onRetry: (failure: OcrCopyFailure) => void
  onClose: (failure: OcrCopyFailure) => void
}) {
  const t = useTranslations('imageOcr'), id = useId(), field = useRef<HTMLTextAreaElement>(null)
  const [expanded, setExpanded] = useState<OcrCopyFailure | null>(null)
  const [selectionFailed, setSelectionFailed] = useState<OcrCopyFailure | null>(null)
  const current = () => isCurrent(failure)
  const select = () => {
    if (!current()) return
    try {
      if (!field.current) throw new Error('missingField')
      field.current.focus({ preventScroll: true }); if (!current()) return
      field.current.select(); if (!current()) return
      field.current.setSelectionRange(0, failure.text.length)
      if (current()) setSelectionFailed(null)
    } catch { if (current()) setSelectionFailed(failure) }
  }
  return <section data-ocr-copy-recovery aria-label={t('output.recoveryTitle', { label: failure.label })} className="min-w-0 space-y-3 rounded-xl bg-subtle p-4">
    <p role="alert" className="text-sm text-body">{t('output.failed', { label: failure.label })}</p>
    {!failure.text && <p className="text-sm text-sub">{t('output.empty')}</p>}
    {expanded !== failure ? <button type="button" data-ocr-copy-expand onClick={() => { if (current()) setExpanded(failure) }} className="ui-btn-soft min-h-11 px-3 py-2 text-sm">{t('output.showText')}</button> : <>
      <label htmlFor={id} className="block text-sm text-body">{t('output.manualLabel')}</label>
      <textarea ref={field} id={id} data-ocr-copy-manual readOnly value={failure.text} rows={8} spellCheck={false} className="ui-field min-h-40 w-full min-w-0 resize-y p-3 text-base" />
      <button type="button" data-ocr-copy-select onClick={select} disabled={!failure.text} className="ui-btn-soft min-h-11 px-3 py-2 text-sm disabled:opacity-50">{t('output.select')}</button>
      {selectionFailed === failure && <p role="status" className="text-sm text-body">{t('output.selectionFailed')}</p>}
    </>}
    <div className="flex flex-wrap gap-2"><button type="button" data-ocr-copy-retry onClick={() => { if (current()) onRetry(failure) }} className="ui-btn min-h-11 px-3 py-2 text-sm">{t('output.retry')}</button><button type="button" data-ocr-copy-close onClick={() => { if (current()) onClose(failure) }} className="ui-btn-soft min-h-11 px-3 py-2 text-sm">{t('output.close')}</button></div>
  </section>
}
