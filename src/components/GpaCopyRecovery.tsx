'use client'

import { useRef, useState } from 'react'
import { useTranslations } from '@/lib/i18n'
import '@/lib/i18n/ns/gpaConverterCalc'
import type { GpaCopyTarget } from '@/utils/gpaCopy'

export default function GpaCopyRecovery({ target, text, onRetry }: { target: GpaCopyTarget; text: string; onRetry: () => void }) {
  const t = useTranslations('gpaConverterCalc')
  const field = useRef<HTMLTextAreaElement>(null)
  const [selectionFailed, setSelectionFailed] = useState(false)
  const id = `gpa-copy-${target}-text`
  const select = () => {
    try {
      if (!field.current) return
      field.current.focus()
      field.current.select()
      field.current.setSelectionRange(0, text.length)
      setSelectionFailed(false)
    } catch { setSelectionFailed(true) }
  }

  return <section data-gpa-copy-recovery={target} className="min-w-0 rounded-xl bg-subtle p-3 space-y-3" aria-labelledby={`${id}-label`}>
    <p role="alert" className="text-sm text-body">{t(`copyRecovery.${target}.failed`)}</p>
    <label id={`${id}-label`} htmlFor={id} className="block text-sm font-medium text-body">{t(`copyRecovery.${target}.field`)}</label>
    <textarea ref={field} id={id} value={text} readOnly rows={target === 'result' ? 5 : 3} spellCheck={false} className="ui-field min-w-0 w-full resize-y px-3 py-3 text-base [overflow-wrap:anywhere]" aria-describedby={`${id}-hint`} />
    <p id={`${id}-hint`} className="text-xs text-muted">{t('copyRecovery.manualHint')}</p>
    <div className="flex flex-wrap gap-2">
      <button type="button" onClick={select} className="ui-btn-soft min-h-11 max-w-full px-3 py-2 text-sm">{t(`copyRecovery.${target}.select`)}</button>
      <button type="button" onClick={onRetry} className="ui-btn min-h-11 max-w-full px-3 py-2 text-sm">{t(`copyRecovery.${target}.retry`)}</button>
    </div>
    {selectionFailed && <p role="status" className="text-sm text-body">{t('copyRecovery.selectionFailed')}</p>}
  </section>
}
