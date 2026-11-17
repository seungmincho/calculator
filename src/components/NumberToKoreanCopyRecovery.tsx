'use client'

import { useId, useRef, useState } from 'react'
import { useTranslations } from '@/lib/i18n'
import '@/lib/i18n/ns/numberToKorean'
import type { NumberCopyTarget } from '@/utils/numberToKoreanActions'

export default function NumberToKoreanCopyRecovery({ target, text, label, onRetry, onClose }: {
  target: NumberCopyTarget; text: string; label: string; onRetry: () => void; onClose: () => void
}) {
  const t = useTranslations('numberToKorean')
  const id = useId(), field = useRef<HTMLTextAreaElement>(null)
  const [selectionFailure, setSelectionFailure] = useState<{ target: NumberCopyTarget; text: string } | null>(null)
  const select = () => {
    try {
      if (!field.current) throw new Error('missingField')
      field.current.focus(); field.current.select(); field.current.setSelectionRange(0, text.length)
      setSelectionFailure(null)
    } catch { setSelectionFailure({ target, text }) }
  }
  return <section data-number-copy-recovery={target} aria-labelledby={`${id}-label`} className="min-w-0 rounded-xl bg-subtle p-4 space-y-3">
    <p role="alert" className="text-sm text-body">{t('copyRecovery.failed', { label })}</p>
    <label id={`${id}-label`} htmlFor={id} className="block text-sm font-medium text-body">{t('copyRecovery.field', { label })}</label>
    <textarea id={id} ref={field} value={text} readOnly rows={target === 'batch' ? 8 : 4} spellCheck={false}
      className="ui-field w-full min-w-0 resize-y px-3 py-3 text-base [overflow-wrap:anywhere]" aria-describedby={`${id}-hint`} />
    <p id={`${id}-hint`} className="text-sm text-sub">{t('copyRecovery.hint')}</p>
    <div className="flex flex-wrap gap-2">
      <button type="button" data-number-copy-select className="ui-btn-soft min-h-11 px-3 py-2 text-sm" onClick={select}>{t('copyRecovery.select')}</button>
      <button type="button" data-number-copy-retry className="ui-btn min-h-11 px-3 py-2 text-sm" onClick={onRetry}>{t('copyRecovery.retry')}</button>
      <button type="button" data-number-copy-close className="ui-btn-soft min-h-11 px-3 py-2 text-sm" onClick={onClose}>{t('copyRecovery.close')}</button>
    </div>
    {selectionFailure?.target === target && selectionFailure.text === text && <p role="status" className="text-sm text-body">{t('copyRecovery.selectionFailed')}</p>}
  </section>
}
