'use client'

import { useId, useRef, useState } from 'react'
import { useTranslations } from '@/lib/i18n'
import '@/lib/i18n/ns/koreanWordle'

export default function KoreanWordleCopyRecovery({ text, onRetry, onClose }: { text: string; onRetry: () => void; onClose: () => void }) {
  const t = useTranslations('koreanWordle'), id = useId(), field = useRef<HTMLTextAreaElement>(null)
  const [selectionFailed, setSelectionFailed] = useState(false)
  return <section data-wordle-copy-recovery="" className="min-w-0 space-y-3 rounded-xl bg-subtle p-4" aria-labelledby={`${id}-title`}>
    <p id={`${id}-title`} role="status" className="text-sm font-medium text-body">{t('copyRecovery.failed')}</p>
    <label htmlFor={`${id}-field`} className="block text-sm text-sub">{t('copyRecovery.field')}</label>
    <textarea id={`${id}-field`} data-wordle-copy-manual="" ref={field} value={text} readOnly rows={7} spellCheck={false} className="ui-field min-w-0 w-full resize-y px-3 py-2 text-base" />
    <div className="flex flex-wrap gap-2">
      <button type="button" data-wordle-copy-select="" onClick={() => { try { if (!field.current) throw new Error('field'); field.current.focus(); field.current.select(); field.current.setSelectionRange(0, text.length); setSelectionFailed(false) } catch { setSelectionFailed(true) } }} className="ui-btn-soft min-h-11 px-3 py-2 text-sm">{t('copyRecovery.select')}</button>
      <button type="button" data-wordle-copy-retry="" onClick={onRetry} className="ui-btn min-h-11 px-3 py-2 text-sm">{t('copyRecovery.retry')}</button>
      <button type="button" data-wordle-copy-close="" onClick={onClose} className="ui-btn-soft min-h-11 px-3 py-2 text-sm">{t('close')}</button>
    </div>
    {selectionFailed && <p role="status" className="text-sm text-sub">{t('copyRecovery.selectionFailed')}</p>}
  </section>
}
