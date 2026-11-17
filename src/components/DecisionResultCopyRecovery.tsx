'use client'

import { useId, useRef, useState } from 'react'
import { useTranslations } from '@/lib/i18n'
import '@/lib/i18n/ns/decisionTools'

export default function DecisionResultCopyRecovery({ text, busy, onRetry, onClose }: {
  text: string; busy: boolean; onRetry: () => void; onClose: () => void
}) {
  const t = useTranslations('decisionTools')
  const id = useId(), field = useRef<HTMLTextAreaElement>(null)
  const [selectionFailed, setSelectionFailed] = useState(false)
  const select = () => {
    try {
      if (!field.current) return
      field.current.focus(); field.current.select(); field.current.setSelectionRange(0, text.length)
      setSelectionFailed(false)
    } catch { setSelectionFailed(true) }
  }
  return <section data-decision-copy-recovery="" className="min-w-0 space-y-3 rounded-xl bg-subtle p-4">
    <p role="alert" className="text-sm text-body">{t('resultActions.copyFailed')}</p>
    <label htmlFor={id} className="block text-sm font-medium text-body">{t('resultActions.copyLabel')}</label>
    <textarea id={id} ref={field} value={text} readOnly rows={6} autoComplete="off" autoCorrect="off" autoCapitalize="off" spellCheck={false} className="ui-field w-full min-w-0 resize-y px-3 py-3 text-base [overflow-wrap:anywhere]" />
    <div className="flex flex-wrap gap-2">
      <button type="button" data-decision-copy-select="" onClick={select} className="ui-btn-soft min-h-11 px-3 py-2 text-sm">{t('resultActions.select')}</button>
      <button type="button" data-decision-copy-retry="" onClick={onRetry} disabled={busy} className="ui-btn min-h-11 px-3 py-2 text-sm">{t(busy ? 'resultActions.copying' : 'resultActions.retry')}</button>
      <button type="button" data-decision-copy-close="" onClick={onClose} className="ui-btn-soft min-h-11 px-3 py-2 text-sm">{t('resultActions.close')}</button>
    </div>
    {selectionFailed && <p role="status" className="text-sm text-body">{t('resultActions.selectionFailed')}</p>}
  </section>
}
