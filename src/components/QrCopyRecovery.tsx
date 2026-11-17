'use client'
import { useId, useRef } from 'react'
import { useTranslations } from '@/lib/i18n'
import '@/lib/i18n/ns/qrScanner'
export default function QrCopyRecovery({ text, onRetry, onClose }: { text: string; onRetry: () => void; onClose: () => void }) {
  const t = useTranslations('qrScanner'), id = useId(), field = useRef<HTMLTextAreaElement>(null)
  return <section className="min-w-0 space-y-3 rounded-xl bg-subtle p-4" data-qr-copy-recovery="">
    <p role="alert" className="text-sm text-body">{t('batch.copyFailed')}</p>
    <label htmlFor={id} className="block text-sm text-body">{t('batch.manualCopy')}</label>
    <textarea id={id} ref={field} value={text} readOnly rows={4} className="ui-field w-full min-w-0 px-3 py-2 text-base" />
    <div className="flex flex-wrap gap-2">
      <button type="button" onClick={() => { field.current?.focus(); field.current?.select() }} className="ui-btn-soft min-h-11 px-3 py-2 text-sm">{t('batch.selectText')}</button>
      <button type="button" onClick={onRetry} className="ui-btn min-h-11 px-3 py-2 text-sm">{t('batch.copyRetry')}</button>
      <button type="button" onClick={onClose} className="ui-btn-soft min-h-11 px-3 py-2 text-sm">{t('batch.close')}</button>
    </div>
  </section>
}
