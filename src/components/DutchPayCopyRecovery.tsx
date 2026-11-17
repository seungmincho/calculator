'use client'

import { useId, useRef, useState } from 'react'
import { useTranslations } from '@/lib/i18n'
import '@/lib/i18n/ns/dutchPay'
import type { DutchPayCopySnapshot } from '@/utils/dutchPayCopy'

export default function DutchPayCopyRecovery({ snapshot, busy, onRetry, onClose }: {
  snapshot: DutchPayCopySnapshot; busy: boolean; onRetry: () => void; onClose: () => void
}) {
  const t = useTranslations('dutchPay')
  const id = useId(), field = useRef<HTMLTextAreaElement>(null)
  const [failedFor, setFailedFor] = useState<DutchPayCopySnapshot | null>(null)
  const select = () => {
    try {
      if (!field.current) throw new Error('Selection unavailable')
      field.current.focus(); field.current.select(); field.current.setSelectionRange(0, snapshot.text.length)
      setFailedFor(null)
    } catch { setFailedFor(snapshot) }
  }
  return <section data-dutch-copy-recovery="" className="min-w-0 space-y-3 rounded-xl bg-subtle p-4" aria-labelledby={`${id}-title`}>
    <h3 id={`${id}-title`} className="text-base font-semibold text-fg">{t('copyRecovery.title')}</h3>
    <p role="alert" className="text-sm text-body">{t('copyRecovery.failed')}</p>
    <label htmlFor={id} className="block text-sm font-medium text-body">{t(`copyRecovery.${snapshot.target}Label`)}</label>
    <textarea id={id} ref={field} value={snapshot.text} readOnly rows={snapshot.target === 'amount' ? 2 : 6} autoComplete="off" autoCorrect="off" autoCapitalize="off" spellCheck={false} className="ui-field min-w-0 w-full resize-y px-3 py-3 text-base [overflow-wrap:anywhere]" aria-describedby={`${id}-hint`} />
    <p id={`${id}-hint`} className="text-sm text-sub">{t('copyRecovery.hint')}</p>
    <div className="flex flex-wrap gap-2">
      <button type="button" data-dutch-copy-select="" onClick={select} className="ui-btn-soft min-h-11 px-3 py-2 text-sm">{t('copyRecovery.select')}</button>
      <button type="button" data-dutch-copy-retry="" onClick={() => { if (!busy) onRetry() }} disabled={busy} className="ui-btn min-h-11 px-3 py-2 text-sm">{t(busy ? 'copyRecovery.copying' : 'copyRecovery.retry')}</button>
      <button type="button" data-dutch-copy-close="" onClick={onClose} className="ui-btn-soft min-h-11 px-3 py-2 text-sm">{t('copyRecovery.close')}</button>
    </div>
    {failedFor === snapshot && <p role="status" className="text-sm text-body">{t('copyRecovery.selectionFailed')}</p>}
  </section>
}
