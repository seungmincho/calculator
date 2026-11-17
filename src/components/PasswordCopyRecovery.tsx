'use client'

import { useId, useRef, useState } from 'react'
import { useTranslations } from '@/lib/i18n'
import '@/lib/i18n/ns/passwordGenerator'
import type { PasswordCopyTarget } from '@/utils/passwordActions'

export default function PasswordCopyRecovery({ text, target, count, busy = false, onRetry, onClose }: {
  text: string
  target: PasswordCopyTarget
  count: number
  busy?: boolean
  onRetry: () => void
  onClose: () => void
}) {
  const t = useTranslations('passwordGenerator')
  const id = useId(), field = useRef<HTMLTextAreaElement>(null)
  const [selectionFailed, setSelectionFailed] = useState(false)
  const select = () => {
    try {
      if (!field.current) return
      field.current.focus(); field.current.select(); field.current.setSelectionRange(0, text.length)
      setSelectionFailed(false)
    } catch { setSelectionFailed(true) }
  }
  return <section data-password-copy-recovery="" className="min-w-0 space-y-3 rounded-xl bg-subtle p-4" aria-labelledby={`${id}-title`}>
    <h3 id={`${id}-title`} className="text-base font-semibold text-fg">{t('copyRecovery.title')}</h3>
    <p role="alert" className="text-sm text-body">{t('copyRecovery.failed')}</p>
    <label htmlFor={id} className="block text-sm font-medium text-body">{target === 'all' ? t('copyRecovery.fieldAll', { n: count }) : t('copyRecovery.fieldOne', { n: target + 1 })}</label>
    <textarea id={id} ref={field} value={text} readOnly rows={target === 'all' ? 5 : 3} autoComplete="off" autoCorrect="off" autoCapitalize="off" spellCheck={false} data-lpignore="true" data-1p-ignore="" className="ui-field w-full min-w-0 resize-y px-3 py-3 text-base [overflow-wrap:anywhere]" aria-describedby={`${id}-hint`} />
    <p id={`${id}-hint`} className="text-xs text-muted">{t('copyRecovery.selectionHint')}</p>
    <div className="flex flex-wrap gap-2">
      <button type="button" onClick={select} className="ui-btn-soft min-h-11 px-3 py-2 text-sm">{t('copyRecovery.selectText')}</button>
      <button type="button" onClick={onRetry} disabled={busy} className="ui-btn min-h-11 px-3 py-2 text-sm">{t(busy ? 'copyRecovery.retrying' : 'copyRecovery.retry')}</button>
      <button type="button" onClick={onClose} className="ui-btn-soft min-h-11 px-3 py-2 text-sm">{t('copyRecovery.close')}</button>
    </div>
    {selectionFailed && <p role="status" className="text-sm text-body">{t('copyRecovery.selectionFailed')}</p>}
  </section>
}
