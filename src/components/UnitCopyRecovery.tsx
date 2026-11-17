'use client'

import { useId, useRef, useState } from 'react'
import { useTranslations } from '@/lib/i18n'
import '@/lib/i18n/ns/unitConverter'

export default function UnitCopyRecovery({ text, label, busy, onRetry, onClose }: { text: string; label: string; busy: boolean; onRetry: () => void; onClose: () => void }) {
  const t = useTranslations('unitConverter'), id = useId(), field = useRef<HTMLTextAreaElement>(null)
  const [selectionFailed, setSelectionFailed] = useState(false)
  const select = () => {
    try { if (!field.current) throw new Error('missing'); field.current.focus(); field.current.select(); field.current.setSelectionRange(0, text.length); setSelectionFailed(false) }
    catch { setSelectionFailed(true) }
  }
  return <section data-unit-copy-recovery="" aria-labelledby={`${id}-title`} className="min-w-0 space-y-3 rounded-2xl bg-subtle p-4">
    <h3 id={`${id}-title`} className="font-semibold text-fg">{t('batchCopy.title', { label })}</h3>
    <p role="status" className="text-sm text-body">{t('batchCopy.failed')}</p>
    <label htmlFor={`${id}-text`} className="block text-sm text-body">{t('batchCopy.field')}</label>
    <textarea id={`${id}-text`} data-unit-copy-manual="" ref={field} value={text} readOnly rows={4} spellCheck={false} className="ui-field w-full min-w-0 resize-y px-3 py-2 text-base" />
    <div className="flex flex-wrap gap-2">
      <button type="button" data-unit-copy-select="" onClick={select} className="ui-btn-soft min-h-11 px-3 py-2 text-sm">{t('batchCopy.select')}</button>
      <button type="button" data-unit-copy-retry="" onClick={onRetry} disabled={busy} className="ui-btn min-h-11 px-3 py-2 text-sm disabled:opacity-40">{t(busy ? 'batchCopy.copying' : 'batchCopy.retry')}</button>
      <button type="button" data-unit-copy-close="" onClick={onClose} className="ui-btn-soft min-h-11 px-3 py-2 text-sm">{t('batchCopy.close')}</button>
    </div>
    {selectionFailed && <p role="status" className="text-sm text-body">{t('batchCopy.selectionFailed')}</p>}
  </section>
}
