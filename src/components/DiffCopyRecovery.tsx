'use client'

import { useRef, useState } from 'react'
import { useTranslations } from '@/lib/i18n'
import '@/lib/i18n/ns/diffViewer'
import type { DiffOutputState, DiffOutputToken } from '@/lib/diff/output'

export default function DiffCopyRecovery({ state, onRetry, onClose }: {
  state: Extract<DiffOutputState, { kind: 'copy' }>
  onRetry: (token: DiffOutputToken) => void; onClose: (token: DiffOutputToken) => void
}) {
  const t = useTranslations('diffViewer'), field = useRef<HTMLTextAreaElement>(null)
  const [expanded, setExpanded] = useState<DiffOutputToken | null>(null), [failed, setFailed] = useState<DiffOutputToken | null>(null)
  const shown = expanded === state.token, copying = state.status === 'copying'
  const select = () => {
    try {
      if (!field.current) return
      field.current.focus({ preventScroll: true }); field.current.select(); field.current.setSelectionRange(0, state.text.length); setFailed(null)
    } catch { setFailed(state.token) }
  }
  return <section data-diff-copy-recovery="" aria-label={t('output.recoveryTitle', { label: state.label })} className="min-w-0 space-y-3 rounded-xl bg-subtle p-4">
    <p role="alert" className="text-sm text-body">{t('output.failed', { label: state.label })}</p>
    {!state.text && <p className="text-sm text-sub">{t('output.empty')}</p>}
    {!shown ? <button type="button" data-diff-copy-expand="" onClick={() => setExpanded(state.token)} className="ui-btn-soft min-h-11 px-3 py-2 text-sm">{t('output.showText')}</button> : <>
      <label htmlFor="diff-output-manual" className="block text-sm text-body">{t('output.manualLabel')}</label>
      <textarea ref={field} id="diff-output-manual" data-diff-copy-manual="" readOnly value={state.text} rows={8} spellCheck={false} className="ui-field min-h-40 w-full min-w-0 resize-y p-3 font-mono text-base" />
      <button type="button" data-diff-copy-select="" onClick={select} disabled={!state.text} className="ui-btn-soft min-h-11 px-3 py-2 text-sm disabled:opacity-50">{t('output.select')}</button>
      {failed === state.token && <p role="status" className="text-sm text-body">{t('output.selectionFailed')}</p>}
    </>}
    <div className="flex flex-wrap gap-2"><button type="button" data-diff-copy-retry="" onClick={() => onRetry(state.token)} disabled={copying} className="ui-btn min-h-11 px-3 py-2 text-sm disabled:opacity-50">{t(copying ? 'output.copying' : 'output.retry')}</button><button type="button" data-diff-copy-close="" onClick={() => onClose(state.token)} className="ui-btn-soft min-h-11 px-3 py-2 text-sm">{t('output.close')}</button></div>
  </section>
}
