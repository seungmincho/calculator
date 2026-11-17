'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslations } from '@/lib/i18n'
import '@/lib/i18n/ns/pomodoroTimer'
import type { PomodoroKeyState } from '@/lib/pomodoro/browserSession'
import type { PomodoroStateKind } from '@/utils/pomodoroPersistence'

interface Props {
  stores: Record<PomodoroStateKind, PomodoroKeyState>
  onReload: (kind: PomodoroStateKind) => Promise<boolean>
  onDiscard: (kind: PomodoroStateKind, raw: string) => Promise<boolean>
  onCancel: () => void
}
type Confirmation = { kind: PomodoroStateKind; action: 'reload' | 'discard'; raw?: string | null }
const kinds: PomodoroStateKind[] = ['settings', 'tasks', 'timer']
export default function PomodoroRecovery({ stores, onReload, onDiscard, onCancel }: Props) {
  const t = useTranslations('pomodoroTimer')
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const mounted = useRef(false), generation = useRef(0)
  const invalidate = useCallback(() => { generation.current++ }, [])
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; invalidate() } }, [invalidate])
  const visible = kinds.filter(kind => stores[kind].status !== 'ready' || stores[kind].pending)
  if (!visible.length && !message) return null
  const label = (kind: PomodoroStateKind) => t(`reliability.${kind === 'settings' ? 'settingsLabel' : kind === 'tasks' ? 'tasksLabel' : 'timerLabel'}`)
  const confirm = async () => {
    if (!confirmation) return
    const item = confirmation, token = ++generation.current
    setConfirmation(null); setMessage(null)
    const success = item.action === 'reload' ? await onReload(item.kind)
      : typeof item.raw === 'string' && await onDiscard(item.kind, item.raw)
    if (mounted.current && token === generation.current && success) setMessage(item.action === 'reload' ? 'reloaded' : 'discarded')
  }
  return <section className="ui-card p-4 space-y-3" data-pomodoro-recovery aria-label={t('reliability.storageTitle')}>
    <h2 className="font-semibold text-fg">{t('reliability.storageTitle')}</h2>
    {visible.map(kind => {
      const stored = stores[kind]
      const error = stored.status === 'conflict' ? 'saveConflict' : stored.status === 'unconfirmed' ? 'saveUnconfirmed' : stored.status
      return <div key={kind} className="space-y-2" data-pomodoro-store={kind} data-store-status={stored.status}>
        <p className="text-sm text-sub" role="status">{stored.pending ? t('reliability.pending') : t(`reliability.${error}`, { item: label(kind) })}</p>
        <div className="flex flex-wrap gap-2">
          {stored.pending ? <button type="button" className="ui-btn-soft min-h-11 px-3" onClick={() => { generation.current++; setConfirmation(null); onCancel(); setMessage('canceled') }}>{t('reliability.cancelPending')}</button>
            : <button type="button" className="ui-btn-soft min-h-11 px-3" data-pomodoro-reload={kind} onClick={() => { generation.current++; setMessage(null); setConfirmation({ kind, action: 'reload' }) }}>{t('reliability.reload')}</button>}
          {!stored.pending && typeof stored.raw === 'string' && ['corrupt', 'unsupported', 'oversized'].includes(stored.status)
            && <button type="button" className="ui-btn-soft min-h-11 px-3" data-pomodoro-discard={kind} onClick={() => { generation.current++; setMessage(null); setConfirmation({ kind, action: 'discard', raw: stored.raw }) }}>{t('reliability.discard')}</button>}
        </div>
      </div>
    })}
    {confirmation && <div className="bg-subtle rounded-xl p-4 space-y-3" role="group" aria-label={t('reliability.confirm')}>
      <p className="text-sm text-body">{t(`reliability.${confirmation.action === 'reload' ? 'reloadConfirm' : 'discardConfirm'}`, { item: label(confirmation.kind) })}</p>
      <div className="flex flex-wrap gap-2">
        <button type="button" data-pomodoro-confirm={confirmation.action} className="ui-btn min-h-11 px-4" onClick={() => void confirm()}>{t('reliability.confirm')}</button>
        <button type="button" className="ui-btn-soft min-h-11 px-4" onClick={() => { generation.current++; setConfirmation(null) }}>{t('reliability.cancel')}</button>
      </div>
    </div>}
    {message && <p role="status" className="text-sm text-sub">{t(`reliability.${message}`)}</p>}
  </section>
}
