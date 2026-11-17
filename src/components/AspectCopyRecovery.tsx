'use client'

import { useId, useRef, useState } from 'react'
import { useTranslations } from '@/lib/i18n'
import '@/lib/i18n/ns/aspectRatio'

export default function AspectCopyRecovery({ text, busy, onRetry, onClose }: { text: string; busy: boolean; onRetry: () => void; onClose: () => void }) {
  const t = useTranslations('aspectRatio'), id = useId(), field = useRef<HTMLTextAreaElement>(null)
  const [selectionFailed, setSelectionFailed] = useState(false)
  const select = () => { try { if (!field.current) throw new Error('missing'); field.current.focus(); field.current.select(); field.current.setSelectionRange(0, text.length); setSelectionFailed(false) } catch { setSelectionFailed(true) } }
  return <section data-aspect-copy-recovery="" className="min-w-0 space-y-3 rounded-2xl bg-subtle p-4" aria-labelledby={`${id}-title`}>
    <p id={`${id}-title`} role="status" className="text-sm font-medium text-body">{t('copyRecovery.failed')}</p>
    <label htmlFor={`${id}-field`} className="block text-sm text-sub">{t('copyRecovery.field')}</label>
    <textarea id={`${id}-field`} data-aspect-copy-manual="" ref={field} value={text} readOnly rows={3} spellCheck={false} className="ui-field w-full min-w-0 resize-y px-3 py-2 text-base" />
    <div className="flex flex-wrap gap-2">
      <button type="button" data-aspect-copy-select="" onClick={select} className="ui-btn-soft min-h-11 px-3 py-2 text-sm">{t('copyRecovery.select')}</button>
      <button type="button" data-aspect-copy-retry="" onClick={onRetry} disabled={busy} className="ui-btn min-h-11 px-3 py-2 text-sm disabled:opacity-40">{t(busy ? 'copyRecovery.copying' : 'copyRecovery.retry')}</button>
      <button type="button" data-aspect-copy-close="" onClick={onClose} className="ui-btn-soft min-h-11 px-3 py-2 text-sm">{t('copyRecovery.close')}</button>
    </div>
    {selectionFailed && <p role="status" className="text-sm text-body">{t('copyRecovery.selectionFailed')}</p>}
  </section>
}
