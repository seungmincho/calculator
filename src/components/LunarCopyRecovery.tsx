'use client'

import { useId, useRef, useState } from 'react'
import { useTranslations } from '@/lib/i18n'
import '@/lib/i18n/ns/lunarConverter'

export default function LunarCopyRecovery({ target, text, onRetry, onClose }: {
  target: 'result' | 'table'; text: string; onRetry: () => void; onClose: () => void
}) {
  const t = useTranslations('lunarConverter')
  const id = useId()
  const field = useRef<HTMLTextAreaElement>(null)
  const [selectionFailed, setSelectionFailed] = useState(false)
  const select = () => {
    try { field.current?.focus(); field.current?.select(); field.current?.setSelectionRange(0, text.length); setSelectionFailed(false) }
    catch { setSelectionFailed(true) }
  }
  return <section data-lunar-copy-recovery={target} className="min-w-0 space-y-3 rounded-xl bg-subtle p-4">
    <p role="alert" className="text-sm text-body">{t('copyRecovery.failed')}</p>
    <label htmlFor={id} className="block text-sm font-medium text-body">{t(`copyRecovery.${target}`)}</label>
    <textarea id={id} ref={field} value={text} readOnly rows={target === 'table' ? 8 : 4} className="ui-field w-full min-w-0 px-3 py-2 text-base" />
    <p className="text-xs text-muted">{t('copyRecovery.hint')}</p>
    <div className="flex flex-wrap gap-2">
      <button type="button" onClick={select} className="ui-btn-soft min-h-11 px-3 py-2 text-sm">{t('copyRecovery.select')}</button>
      <button type="button" onClick={onRetry} className="ui-btn min-h-11 px-3 py-2 text-sm">{t('copyRecovery.retry')}</button>
      <button type="button" onClick={onClose} className="ui-btn-soft min-h-11 px-3 py-2 text-sm">{t('copyRecovery.close')}</button>
    </div>
    {selectionFailed && <p role="status" className="text-sm text-body">{t('copyRecovery.selectionFailed')}</p>}
  </section>
}
