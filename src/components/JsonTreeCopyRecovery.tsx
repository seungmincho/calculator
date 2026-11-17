'use client'

import { useId, useRef, useState } from 'react'
import { useTranslations } from '@/lib/i18n'
import '@/lib/i18n/ns/jsonFormatter'
import type { JsonTreeCopyTarget } from '@/utils/jsonTreeCopy'

export default function JsonTreeCopyRecovery({ target, text, busy, onRetry, onClose }: {
  target: JsonTreeCopyTarget; text: string; busy: boolean; onRetry: () => void; onClose: () => void
}) {
  const t = useTranslations('jsonFormatter'), id = useId(), field = useRef<HTMLTextAreaElement>(null)
  const [selectionFailed, setSelectionFailed] = useState(false)
  const select = () => {
    try {
      if (!field.current) { setSelectionFailed(true); return }
      field.current.focus(); field.current.select(); field.current.setSelectionRange(0, text.length); setSelectionFailed(false)
    } catch { setSelectionFailed(true) }
  }
  return <section data-json-tree-recovery={target} className="min-w-0 space-y-3 rounded-xl bg-subtle p-4">
    <p role="alert" className="text-sm text-body">{t('selection.recovery.failed')}</p>
    <label htmlFor={id} className="block text-sm font-medium text-body">{t(`selection.recovery.field.${target}`)}</label>
    <textarea id={id} ref={field} data-json-tree-manual="" value={text} readOnly rows={6} wrap="off" spellCheck={false} autoComplete="off" autoCorrect="off" autoCapitalize="off" className="ui-field w-full min-w-0 resize-y px-3 py-3 text-base" aria-describedby={`${id}-hint`} />
    <p id={`${id}-hint`} className="text-xs text-sub">{t('selection.recovery.hint')}</p>
    {target === 'pointer' && text === '' && <p className="text-sm text-sub">{t('selection.rootPointer')}</p>}
    <div className="flex flex-wrap gap-2">
      <button type="button" data-json-tree-manual-select="" onClick={select} className="ui-btn-soft min-h-11 px-3 py-2 text-sm">{t('selection.recovery.select')}</button>
      <button type="button" data-json-tree-retry="" onClick={onRetry} disabled={busy} className="ui-btn min-h-11 px-3 py-2 text-sm disabled:opacity-40">{t(busy ? 'selection.copying' : 'selection.recovery.retry')}</button>
      <button type="button" data-json-tree-recovery-close="" onClick={onClose} className="ui-btn-soft min-h-11 px-3 py-2 text-sm">{t('selection.recovery.close')}</button>
    </div>
    {selectionFailed && <p role="status" className="text-sm text-body">{t('selection.recovery.selectionFailed')}</p>}
  </section>
}
