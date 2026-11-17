'use client'

import { useId, useRef, useState } from 'react'
import { useTranslations } from '@/lib/i18n'
import '@/lib/i18n/ns/markdownEditor'
import type { MarkdownCopySnapshot, MarkdownCopyTarget } from '@/utils/markdownActions'

export default function MarkdownCopyRecovery({ target, snapshot, onRetry, onClose }: {
  target: MarkdownCopyTarget
  snapshot: MarkdownCopySnapshot
  onRetry: () => void
  onClose: () => void
}) {
  const t = useTranslations('markdownEditor')
  const id = useId()
  const field = useRef<HTMLTextAreaElement>(null)
  const [format, setFormat] = useState<'md' | 'html'>(target === 'html' ? 'html' : 'md')
  const [selectionFailed, setSelectionFailed] = useState(false)
  const text = format === 'md' ? snapshot.markdown : snapshot.html
  const select = () => {
    try {
      if (!field.current) return
      field.current.focus(); field.current.select(); field.current.setSelectionRange(0, text.length)
      setSelectionFailed(false)
    } catch { setSelectionFailed(true) }
  }
  return <section data-markdown-copy-recovery={target} className="min-w-0 rounded-xl bg-subtle p-4 space-y-3" aria-labelledby={`${id}-title`}>
    <h2 id={`${id}-title`} className="text-base font-semibold text-fg">{t('copyRecovery.title')}</h2>
    <p role="alert" className="text-sm text-body">{t(`copyRecovery.failed.${target}`)}</p>
    {target === 'rich' && <div role="group" aria-label={t('copyRecovery.chooseFormat')} className="flex flex-wrap gap-2">
      {(['md', 'html'] as const).map(value => <button key={value} type="button" aria-pressed={format === value} onClick={() => { setFormat(value); setSelectionFailed(false) }} className={`min-h-11 rounded-xl px-3 py-2 text-sm font-medium ${format === value ? 'bg-primary text-white' : 'bg-soft text-body'}`}>{t(`copyRecovery.textTypes.${value}`)}</button>)}
    </div>}
    <label htmlFor={id} className="block text-sm font-medium text-body">{t('copyRecovery.fieldLabel', { format: t(`copyRecovery.textTypes.${format}`) })}</label>
    <textarea id={id} ref={field} value={text} readOnly rows={7} spellCheck={false} className="ui-field min-w-0 w-full resize-y px-3 py-3 text-base [overflow-wrap:anywhere]" aria-describedby={`${id}-hint`} />
    <p id={`${id}-hint`} className="text-xs text-muted">{t('copyRecovery.selectionHint')}</p>
    <div className="flex flex-wrap gap-2">
      <button type="button" onClick={select} className="ui-btn-soft min-h-11 px-3 py-2 text-sm">{t('copyRecovery.selectAll')}</button>
      <button type="button" onClick={onRetry} className="ui-btn min-h-11 px-3 py-2 text-sm">{t('copyRecovery.retry')}</button>
      <button type="button" onClick={onClose} className="ui-btn-soft min-h-11 px-3 py-2 text-sm">{t('copyRecovery.close')}</button>
    </div>
    {selectionFailed && <p role="status" className="text-sm text-body">{t('copyRecovery.selectionFailed')}</p>}
  </section>
}
