'use client'

import { useId, useRef, useState } from 'react'
import { useTranslations } from '@/lib/i18n'
import '@/lib/i18n/ns/characterCounter'

export default function CharacterCopyRecovery({ text, tab, onRetry, onClose }: { text: string; tab: number; onRetry: () => void; onClose: () => void }) {
  const t = useTranslations('characterCounter'), id = useId(), field = useRef<HTMLTextAreaElement>(null)
  const [selectionFailed, setSelectionFailed] = useState(false)
  const select = () => {
    try { if (!field.current) throw new Error('missing field'); field.current.focus(); field.current.select(); field.current.setSelectionRange(0, text.length); setSelectionFailed(false) }
    catch { setSelectionFailed(true) }
  }
  return <section data-character-copy-recovery="" aria-labelledby={`${id}-title`} className="min-w-0 space-y-3 rounded-xl bg-subtle p-4">
    <h2 id={`${id}-title`} className="font-semibold text-fg">{t('copyRecovery.title', { tab: tab + 1 })}</h2>
    <p role="alert" className="text-sm text-body">{t('copyRecovery.failed')}</p>
    <label htmlFor={id} className="block text-sm text-body">{t('copyRecovery.field')}</label>
    <textarea id={id} ref={field} data-character-copy-manual="" value={text} readOnly rows={4} spellCheck={false} className="ui-field min-w-0 w-full resize-y px-3 py-3 text-base" />
    <div className="flex flex-wrap gap-2"><button type="button" data-character-copy-select="" onClick={select} className="ui-btn-soft min-h-11 px-3 py-2 text-sm">{t('copyRecovery.select')}</button>
      <button type="button" data-character-copy-retry="" onClick={onRetry} className="ui-btn min-h-11 px-3 py-2 text-sm">{t('copyRecovery.retry')}</button>
      <button type="button" data-character-copy-close="" onClick={onClose} className="ui-btn-soft min-h-11 px-3 py-2 text-sm">{t('copyRecovery.close')}</button></div>
    {selectionFailed && <p role="status" className="text-sm text-body">{t('copyRecovery.selectionFailed')}</p>}
  </section>
}
