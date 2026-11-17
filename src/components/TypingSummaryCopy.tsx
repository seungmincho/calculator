'use client'

import { useCallback, useId, useLayoutEffect, useRef, useState } from 'react'
import { useTranslations } from '@/lib/i18n'
import '@/lib/i18n/ns/typingTest'
import { copyTypingSummary } from '@/utils/typingClipboard'

export default function TypingSummaryCopy({ text, contextKey, active = true }: { text: string; contextKey: string; active?: boolean }) {
  const t = useTranslations('typingTest')
  const id = useId()
  const field = useRef<HTMLTextAreaElement>(null)
  const mounted = useRef(false)
  const generation = useRef(0)
  const [state, setState] = useState<'idle' | 'pending' | 'copied' | 'failed'>('idle')
  const [selectionFailed, setSelectionFailed] = useState(false)
  const identity = JSON.stringify([text, contextKey, active])
  const [previousIdentity, setPreviousIdentity] = useState(identity)
  if (previousIdentity !== identity) { setPreviousIdentity(identity); setState('idle'); setSelectionFailed(false) }
  const invalidate = useCallback(() => { generation.current++ }, [])
  useLayoutEffect(() => { mounted.current = true; return () => { mounted.current = false; invalidate() } }, [invalidate])
  useLayoutEffect(() => { generation.current++ }, [identity])

  async function copy() {
    if (!active || !text) return
    const request = ++generation.current
    const current = () => mounted.current && generation.current === request
    setState('pending'); setSelectionFailed(false)
    const outcome = await copyTypingSummary(text, current)
    if (current() && outcome !== 'stale') setState(outcome)
  }
  function select() {
    try { field.current?.focus(); field.current?.select(); field.current?.setSelectionRange(0, text.length); setSelectionFailed(false) }
    catch { setSelectionFailed(true) }
  }
  if (!active) return null
  return <div className="min-w-0 space-y-3" data-typing-copy>
    <button type="button" onClick={() => { void copy() }} disabled={!text || state === 'pending'} className="ui-btn-soft min-h-11 px-4 py-2 text-sm disabled:opacity-40">{t(state === 'pending' ? 'copyRecovery.pending' : state === 'copied' ? 'copyRecovery.copied' : 'copyRecovery.copy')}</button>
    {state === 'copied' && <p role="status" className="text-sm text-primary">{t('copyRecovery.copied')}</p>}
    {state === 'failed' && <section className="min-w-0 space-y-2 rounded-xl bg-subtle p-4">
      <p role="alert" className="text-sm text-body">{t('copyRecovery.failed')}</p>
      <label htmlFor={id} className="block text-sm text-body">{t('copyRecovery.summary')}</label>
      <textarea id={id} ref={field} value={text} readOnly rows={4} className="ui-field w-full min-w-0 px-3 py-2 text-base" />
      <p className="text-xs text-muted">{t('copyRecovery.hint')}</p>
      <button type="button" onClick={select} className="ui-btn-soft min-h-11 px-4 py-2 text-sm">{t('copyRecovery.select')}</button>
      {selectionFailed && <p role="status" className="text-sm text-body">{t('copyRecovery.selectionFailed')}</p>}
    </section>}
  </div>
}
