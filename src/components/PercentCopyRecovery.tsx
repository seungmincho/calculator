'use client'

import { useRef, useState } from 'react'
import { useTranslations } from '@/lib/i18n'
import '@/lib/i18n/ns/percentCalculator'

export interface PercentCopyRecoveryProps {
  text: string
  onSelectIntent: () => void
  onRetry: () => void
  onClose: () => void
}
/** Mount with a new key for each request; the full failed text is never a preview slice. */
export default function PercentCopyRecovery({ text, onSelectIntent, onRetry, onClose }: PercentCopyRecoveryProps) {
  const t = useTranslations('percentCalculator'), field = useRef<HTMLTextAreaElement>(null)
  const [failedSelection, setFailedSelection] = useState(false)
  const select = () => {
    onSelectIntent()
    try {
      if (!field.current) throw Error('field unavailable')
      field.current.focus(); field.current.select(); field.current.setSelectionRange(0, text.length)
      setFailedSelection(field.current.selectionStart !== 0 || field.current.selectionEnd !== text.length)
    } catch { setFailedSelection(true) }
  }
  return <section data-percent-copy-recovery="" className="bg-subtle rounded-2xl p-4 min-w-0 space-y-3" aria-label={t('comparison.recovery.title')}>
    <p className="text-sm text-body">{t('comparison.recovery.description')}</p>
    <label className="block text-sm text-sub">{t('comparison.recovery.text')}<textarea data-percent-recovery-text="" ref={field} readOnly value={text} rows={5} className="ui-field mt-2 w-full min-w-0 text-base px-3 py-2" /></label>
    <div className="flex flex-wrap gap-2">
      <button type="button" data-percent-recovery-select="" onClick={select} className="ui-btn-soft min-h-11 px-4 py-2">{t('comparison.recovery.select')}</button>
      <button type="button" data-percent-recovery-retry="" onClick={onRetry} className="ui-btn min-h-11 px-4 py-2">{t('comparison.recovery.retry')}</button>
      <button type="button" data-percent-recovery-close="" onClick={onClose} className="ui-btn-soft min-h-11 px-4 py-2">{t('comparison.recovery.close')}</button>
    </div>
    {failedSelection && <p role="alert" className="text-sm text-sub">{t('comparison.recovery.selectionFailed')}</p>}
  </section>
}
