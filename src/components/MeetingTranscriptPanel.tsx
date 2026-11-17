'use client'

import { useState } from 'react'
import { useTranslations } from '@/lib/i18n'
import '@/lib/i18n/ns/meetingMinutes'
import { meetingSentences, MAX_MEETING_SELECTIONS, type MeetingHandoff, type MeetingExcerpt, type MeetingExcerptKind } from '@/utils/meetingHandoff'

export default function MeetingTranscriptPanel({ source, onApply, onDismiss, blocked }: {
  source: MeetingHandoff; onApply: (entries: MeetingExcerpt[]) => boolean; onDismiss: () => void; blocked: boolean
}) {
  const t = useTranslations('meetingMinutes')
  const [sentences] = useState(() => meetingSentences(source.transcript))
  const [selection, setSelection] = useState<Record<number, MeetingExcerpt>>({})
  const [limit, setLimit] = useState(10)
  const entries = Object.entries(selection).sort(([a], [b]) => Number(a) - Number(b)).map(([, entry]) => entry)
  const update = (index: number, values: Partial<MeetingExcerpt>) => setSelection(previous => ({ ...previous, [index]: { ...previous[index], ...values } }))
  return <section aria-labelledby="meeting-import-title" className="ui-card p-4 sm:p-6 space-y-4 print:hidden">
    <div><h2 id="meeting-import-title" className="text-lg font-bold text-fg">{t('import.title')}</h2><p className="text-sm text-sub mt-1 break-words">{source.name}</p></div>
    <p className="text-sm text-body">{t('import.hint')}</p>
    <p className="text-xs text-muted">{t('import.privacy')}</p>
    <div className="flex flex-wrap items-center gap-2">
      <p role="status" className="text-sm font-semibold text-primary">{t('import.selected', { count: entries.length, total: sentences.length })}</p>
      <button type="button" onClick={() => setSelection({})} disabled={!entries.length} className="ui-btn-soft min-h-11 px-3 py-2 text-sm disabled:opacity-40">{t('import.clear')}</button>
    </div>
    <ol className="space-y-3">
      {sentences.slice(0, limit).map((text, index) => <li key={index} className={`rounded-2xl border p-3 sm:p-4 space-y-3 ${selection[index] ? 'border-primary bg-primary-soft' : 'border-line bg-subtle'}`}>
        <label className="flex items-start gap-3 text-sm text-body cursor-pointer min-h-11">
          <input type="checkbox" checked={!!selection[index]} disabled={!selection[index] && entries.length >= MAX_MEETING_SELECTIONS} onChange={event => setSelection(previous => { const next = { ...previous }; if (event.target.checked) next[index] = { text, kind: 'discussion' }; else delete next[index]; return next })} aria-label={t('import.selectSentence', { number: index + 1 })} className="w-5 h-5 shrink-0 mt-0.5 accent-primary" />
          <span className="min-w-0 break-words whitespace-pre-wrap">{text}</span>
        </label>
        {selection[index] && <>
          <div className="flex flex-wrap gap-2" role="group" aria-label={t('import.destination', { number: index + 1 })}>
            {(['discussion', 'decision', 'action'] as MeetingExcerptKind[]).map(kind => <button type="button" key={kind} aria-pressed={selection[index].kind === kind} onClick={() => update(index, { kind })} className={`min-h-11 rounded-xl px-3 py-2 text-sm font-medium ${selection[index].kind === kind ? 'bg-primary text-white' : 'bg-soft text-body'}`}>{t(`import.${kind}`)}</button>)}
          </div>
          <div><label htmlFor={`meeting-excerpt-${index}`} className="block text-sm text-body">{t('import.editSentence', { number: index + 1 })}</label><textarea id={`meeting-excerpt-${index}`} value={selection[index].text} maxLength={1000} rows={2} onChange={event => update(index, { text: event.target.value })} className="ui-field mt-1 px-3 py-3 text-base resize-y" /></div>
        </>}
      </li>)}
    </ol>
    {sentences.length > limit && <button type="button" onClick={() => setLimit(value => value + 10)} className="ui-btn-soft min-h-11 px-4 py-2 text-sm">{t('import.more', { count: sentences.length - limit })}</button>}
    {sentences.length === 0 && <p className="text-sm text-sub">{t('import.noSentences')}</p>}
    <p className="text-xs text-muted">{t('import.appendHint')}</p>
    <div className="flex flex-wrap gap-2">
      <button type="button" onClick={() => onApply(entries)} disabled={blocked || !entries.length || entries.some(entry => !entry.text.trim()) || entries.reduce((sum, entry) => sum + entry.text.length, 0) > 12000} className="ui-btn min-h-11 px-4 py-3 text-sm disabled:opacity-40">{t('import.apply', { count: entries.length })}</button>
      <button type="button" onClick={onDismiss} className="ui-btn-soft min-h-11 px-4 py-3 text-sm">{t('import.dismiss')}</button>
    </div>
  </section>
}
