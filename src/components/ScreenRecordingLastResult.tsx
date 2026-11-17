'use client'
import { useState } from 'react'
import { useTranslations } from '@/lib/i18n'
import '@/lib/i18n/ns/screenRecorder'
import { screenRecordingTime, type ScreenRecordingResult } from '@/utils/screenRecording'

export default function ScreenRecordingLastResult({ result, onDownload, onDelete }: {
  result: ScreenRecordingResult
  onDownload: (id: number) => void
  onDelete: (id: number) => void
}) {
  const t = useTranslations('screenRecorder')
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [lastId, setLastId] = useState(result.id)
  if (lastId !== result.id) { setLastId(result.id); setConfirmDelete(false) }
  return <section className="ui-card min-w-0 space-y-4 p-4 sm:p-6" aria-labelledby="screen-recording-last-title" data-screen-recording-result={result.id}>
    <h2 id="screen-recording-last-title" className="text-lg font-semibold text-fg">{t('retry.lastResult')}</h2>
    <p className="text-sm text-sub">{t('retry.lastResultHint')}</p>
    <video key={result.url} src={result.url} controls preload="metadata" aria-label={t('retry.lastPreview')} className="max-h-[480px] w-full rounded-xl bg-subtle" />
    <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
      <div className="min-w-0"><dt className="text-muted">{t('retry.filename')}</dt><dd className="mt-1 break-all text-fg">{result.name}</dd></div>
      <div><dt className="text-muted">{t('fileSize')}</dt><dd className="mt-1 tabular-nums text-fg">{t('retry.bytes', { bytes: result.blob.size })}</dd></div>
      <div><dt className="text-muted">{t('retry.activeTime')}</dt><dd className="mt-1 tabular-nums text-fg">{screenRecordingTime(result.elapsedMs)}</dd></div>
      <div className="min-w-0"><dt className="text-muted">{t('retry.actualFormat')}</dt><dd className="mt-1 break-all text-fg">{result.mime}</dd></div>
    </dl>
    <p className="text-xs text-sub">{t('retry.systemStatus', { state: t(result.audio.system ? 'retry.connected' : 'retry.notConnected') })} · {t('retry.micStatus', { state: t(result.audio.mic ? 'retry.connected' : 'retry.notConnected') })}</p>
    <p className="text-xs text-muted">{t('retry.audioHint')}</p>
    <div className="flex flex-wrap gap-2">
      <button type="button" onClick={() => onDownload(result.id)} className="ui-btn min-h-11 px-4 py-3 text-base">{t('download')}</button>
      <button type="button" onClick={() => setConfirmDelete(true)} className="ui-btn-soft min-h-11 px-4 py-3 text-base">{t('retry.deleteResult')}</button>
    </div>
    {confirmDelete && <div className="space-y-3 rounded-xl bg-subtle p-4"><p className="text-sm text-body">{t('retry.deletePrompt')}</p><div className="flex flex-wrap gap-2"><button type="button" onClick={() => onDelete(result.id)} className="ui-btn min-h-11 px-4 py-2 text-sm">{t('retry.deleteConfirm')}</button><button type="button" onClick={() => setConfirmDelete(false)} className="ui-btn-soft min-h-11 px-4 py-2 text-sm">{t('retry.keepResult')}</button></div></div>}
  </section>
}
