'use client'

import { useState } from 'react'
import { useTranslations } from '@/lib/i18n'
import '@/lib/i18n/ns/voiceMemo'
import { buildVoiceMemoTranscriptBundle, isExportableVoiceTranscript, VOICE_TRANSCRIPT_EXPORT_LIMIT, type VoiceTranscriptItem } from '@/utils/voiceMemoExport'

export default function VoiceMemoTranscriptExport({ items, visibleIds, selectedIds, onSelectionChange, disabled }: {
  items: VoiceTranscriptItem[]
  visibleIds: string[]
  selectedIds: string[]
  onSelectionChange: (ids: string[]) => void
  disabled: boolean
}) {
  const t = useTranslations('voiceMemo')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const visible = new Set(visibleIds)
  const eligible = new Set(items.filter(isExportableVoiceTranscript).map(item => item.id))
  const outsideCount = selectedIds.filter(id => !visible.has(id)).length
  const staleCount = selectedIds.filter(id => !eligible.has(id)).length
  const characters = items.filter(item => selectedIds.includes(item.id)).reduce((total, item) => total + item.transcript.length, 0)

  function changeSelection(next: string[]) {
    if (disabled) return
    setError(''); setNotice('')
    if (next.length > VOICE_TRANSCRIPT_EXPORT_LIMIT) { setError('selectionLimit'); return }
    onSelectionChange(next)
  }

  function download() {
    if (disabled) return
    setError(''); setNotice('')
    let url: string | null = null
    let anchor: HTMLAnchorElement | null = null
    try {
      const result = buildVoiceMemoTranscriptBundle(items, selectedIds, {
        title: t('transcriptExport.fileTitle'), recordedAt: t('transcriptExport.fileRecordedAt'), duration: t('transcriptExport.fileDuration'),
      })
      url = URL.createObjectURL(new Blob([result.text], { type: 'text/plain;charset=utf-8' }))
      anchor = document.createElement('a')
      anchor.href = url
      anchor.download = `voice-memo-transcripts-${new Date().toISOString().slice(0, 10)}.txt`
      document.body.appendChild(anchor); anchor.click()
      setNotice(t('transcriptExport.downloaded', { count: result.count }))
    } catch (cause) {
      const code = cause instanceof Error ? cause.message : ''
      setError(['emptySelection', 'selectionLimit', 'invalidSelection', 'staleSelection', 'textLimit', 'totalLimit'].includes(code) ? code : 'downloadFailed')
    } finally { anchor?.remove(); if (url) { const objectUrl = url; setTimeout(() => URL.revokeObjectURL(objectUrl), 1000) } }
  }

  return (
    <section className="mb-4 rounded-xl border border-line bg-subtle p-4" aria-labelledby="voice-transcript-export-title">
      <h3 id="voice-transcript-export-title" className="font-semibold text-fg">{t('transcriptExport.title')}</h3>
      <p className="mt-2 text-sm text-sub">{t('transcriptExport.description')}</p>
      <p className="mt-2 text-xs text-muted">{t('transcriptExport.limits')}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" disabled={disabled || !visibleIds.some(id => eligible.has(id))} onClick={() => changeSelection([...new Set([...selectedIds, ...visibleIds.filter(id => eligible.has(id))])])} className="ui-btn-soft min-h-11 px-3 py-2 text-sm disabled:opacity-50">{t('transcriptExport.selectVisible')}</button>
        <button type="button" disabled={disabled || !selectedIds.some(id => visible.has(id))} onClick={() => changeSelection(selectedIds.filter(id => !visible.has(id)))} className="ui-btn-soft min-h-11 px-3 py-2 text-sm disabled:opacity-50">{t('transcriptExport.clearVisible')}</button>
        <button type="button" disabled={disabled || !selectedIds.length} onClick={() => changeSelection([])} className="ui-btn-soft min-h-11 px-3 py-2 text-sm disabled:opacity-50">{t('transcriptExport.clearAll')}</button>
      </div>
      <p className="mt-3 text-sm text-body tabular-nums" role="status">{t('transcriptExport.selected', { count: selectedIds.length, characters: characters.toLocaleString(), outside: outsideCount })}</p>
      {staleCount > 0 && <div className="mt-2 text-sm text-sub"><p role="alert">{t('transcriptExport.stale', { count: staleCount })}</p><button type="button" disabled={disabled} onClick={() => changeSelection(selectedIds.filter(id => eligible.has(id)))} className="ui-btn-soft mt-2 min-h-11 px-3 py-2 text-sm">{t('transcriptExport.clearStale')}</button></div>}
      <button type="button" disabled={disabled || !selectedIds.length} onClick={download} className="ui-btn mt-3 min-h-11 px-4 py-2 text-sm disabled:opacity-50">{t('transcriptExport.download')}</button>
      {error && <p role="alert" className="mt-2 text-sm text-sub">{t(`transcriptExport.errors.${error}`)}</p>}
      {notice && <p role="status" className="mt-2 text-sm text-sub">{notice}</p>}
    </section>
  )
}
