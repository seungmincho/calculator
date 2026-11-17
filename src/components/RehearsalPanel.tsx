'use client'

import { useState } from 'react'
import { useHydrated } from '@/hooks/useHydrated'
import { useTranslations } from '@/lib/i18n'
import '@/lib/i18n/ns/presentationTimer'
import { type Segment, formatClock } from '@/utils/presentationTimer'
import { REHEARSAL_KEY, MAX_REHEARSALS, measuredSegments, parseRehearsals, sameRehearsalPlan, type RehearsalRecord } from '@/utils/rehearsal'

export default function RehearsalPanel({ enabled, onEnabled, segments, elapsed, running, marks, onMark, stopAndRead, onReuse, attemptId, title, onTitle }: {
  enabled: boolean; onEnabled: (value: boolean) => void; segments: Segment[]; elapsed: number; running: boolean; marks: number[]; onMark: () => void
  stopAndRead: () => number; onReuse: (segments: Segment[]) => void; attemptId: string | null; title: string; onTitle: (value: string) => void
}) {
  const t = useTranslations('presentationTimer'), hydrated = useHydrated()
  const [ready, setReady] = useState(false), [records, setRecords] = useState<RehearsalRecord[]>([])
  const [compareId, setCompareId] = useState(''), [error, setError] = useState(''), [notice, setNotice] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)
  if (hydrated && !ready) {
    try { const saved = parseRehearsals(localStorage.getItem(REHEARSAL_KEY)); setRecords(saved); setCompareId(saved[0]?.id ?? '') }
    catch { setError('rehearsal.storageFailed') }
    setReady(true)
  }
  const previous = records.find(record => record.id === compareId)
  const comparable = !!previous && sameRehearsalPlan(segments, previous.segments)
  const actual = measuredSegments(segments.length, marks, Math.max(elapsed, marks.at(-1) ?? 0))
  const persist = (next: RehearsalRecord[]) => {
    try { parseRehearsals(localStorage.getItem(REHEARSAL_KEY)); const raw = JSON.stringify(next); parseRehearsals(raw); localStorage.setItem(REHEARSAL_KEY, raw); setRecords(next); setError(''); return true }
    catch { setNotice(''); setError('rehearsal.storageFailed'); return false }
  }
  const finish = () => {
    if (!enabled || !attemptId || !ready) return
    const totalMs = Math.round(stopAndRead())
    if (totalMs < 1000) { setError('rehearsal.tooShort'); return }
    if (records.length >= MAX_REHEARSALS && !records.some(r => r.id === attemptId)) { setError('rehearsal.full'); return }
    const record: RehearsalRecord = { id: attemptId, title: title.trim() || t('rehearsal.defaultTitle'), createdAt: Date.now(), segments: segments.map(s => ({ ...s })), totalMs, actualMs: measuredSegments(segments.length, marks, totalMs) }
    if (persist([record, ...records.filter(r => r.id !== attemptId)])) { setNotice('rehearsal.saved'); if (!previous || previous.id === attemptId) setCompareId(records.find(r => r.id !== attemptId && sameRehearsalPlan(r.segments, segments))?.id ?? '') }
  }
  const remove = () => { if (persist(records.filter(r => r.id !== compareId))) { setCompareId(''); setConfirmDelete(false); setNotice('rehearsal.deleted') } }
  const exportHistory = () => {
    const url = URL.createObjectURL(new Blob([JSON.stringify(records, null, 2)], { type: 'application/json' }))
    const a = document.createElement('a'); a.href = url; a.download = 'toolhub-rehearsals.json'; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000)
  }
  const gap = (value: number) => `${value >= 0 ? '+' : '−'}${formatClock(Math.abs(value))}`
  return <section className="ui-card p-4 sm:p-6 space-y-4" aria-labelledby="rehearsal-title">
    <h2 id="rehearsal-title" className="font-bold text-fg">{t('rehearsal.title')}</h2>
    <label className="flex items-center gap-3 min-h-11 text-sm text-body"><input type="checkbox" checked={enabled} onChange={e => onEnabled(e.target.checked)} disabled={running || elapsed > 0} className="w-5 h-5 accent-primary" />{t('rehearsal.enable')}</label>
    <p className="text-xs text-muted">{t('rehearsal.hint')}</p>
    {enabled && <>
      <label className="block text-sm text-body">{t('rehearsal.name')}<input value={title} onChange={e => onTitle(e.target.value)} maxLength={60} className="ui-field mt-1 px-3 py-3 text-base" placeholder={t('rehearsal.defaultTitle')} /></label>
      <p className="text-sm text-primary" role="status">{t('rehearsal.current', { name: segments[marks.length]?.name || t('segNamePlaceholder', { n: marks.length + 1 }) })}</p>
      <div className="flex flex-wrap gap-2">
        <button onClick={onMark} disabled={!running || marks.length >= segments.length - 1} className="ui-btn min-h-11 px-4 py-2 text-sm disabled:opacity-40">{t('rehearsal.next')}</button>
        <button onClick={finish} disabled={!ready || elapsed < 1000} className="ui-btn-soft min-h-11 px-4 py-2 text-sm disabled:opacity-40">{t('rehearsal.finish')}</button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-body tabular-nums"><thead><tr className="text-xs text-sub border-b border-line">{['segment', 'target', 'actual', 'previous', 'change'].map(key => <th key={key} className="p-2 text-left whitespace-nowrap">{t(`rehearsal.${key}`)}</th>)}</tr></thead>
          <tbody>{segments.map((segment, i) => <tr key={i} className="border-b border-line"><th className="p-2 text-left font-medium min-w-24 break-words">{segment.name || t('segNamePlaceholder', { n: i + 1 })}</th><td className="p-2">{formatClock(segment.sec * 1000)}</td><td className="p-2">{elapsed > 0 && actual[i] !== null ? formatClock(actual[i]!) : '—'}</td><td className="p-2">{comparable && previous.actualMs[i] !== null ? formatClock(previous.actualMs[i]!) : '—'}</td><td className="p-2 whitespace-nowrap">{comparable && elapsed > 0 && actual[i] !== null && previous.actualMs[i] !== null ? gap(actual[i]! - previous.actualMs[i]!) : '—'}</td></tr>)}</tbody>
        </table>
      </div>
      {previous && !comparable && <p className="text-xs text-muted">{t('rehearsal.differentPlan')}</p>}
      {previous && <p className="text-sm text-sub">{t('rehearsal.totalCompare', { previous: formatClock(previous.totalMs), current: formatClock(elapsed) })}</p>}
    </>}
    {records.length > 0 && <div className="space-y-3 border-t border-line pt-4">
      <label className="block text-sm text-body">{t('rehearsal.history', { count: records.length })}
        <select aria-label={t('rehearsal.select')} value={compareId} onChange={e => { setCompareId(e.target.value); setConfirmDelete(false) }} className="ui-field mt-1 px-3 py-3 text-base">
          <option value="">{t('rehearsal.choose')}</option>{records.map(record => <option key={record.id} value={record.id}>{record.title} · {new Date(record.createdAt).toLocaleString()} · {formatClock(record.totalMs)}</option>)}
        </select>
      </label>
      <div className="flex flex-wrap gap-2">
        <button onClick={() => previous && onReuse(previous.segments)} disabled={!previous || running} className="ui-btn-soft min-h-11 px-3 py-2 text-sm disabled:opacity-40">{t('rehearsal.reuse')}</button>
        <button onClick={() => setConfirmDelete(true)} disabled={!previous} className="ui-btn-soft min-h-11 px-3 py-2 text-sm disabled:opacity-40">{t('rehearsal.delete')}</button>
        <button onClick={exportHistory} className="ui-btn-soft min-h-11 px-3 py-2 text-sm">{t('rehearsal.export')}</button>
      </div>
      {confirmDelete && previous && <div className="bg-subtle rounded-xl p-3 space-y-2"><p className="text-sm text-body">{t('rehearsal.confirm', { name: previous.title })}</p><button onClick={remove} className="ui-btn min-h-11 px-3 py-2 text-sm mr-2">{t('rehearsal.confirmDelete')}</button><button onClick={() => setConfirmDelete(false)} className="ui-btn-soft min-h-11 px-3 py-2 text-sm">{t('rehearsal.cancel')}</button></div>}
    </div>}
    {notice && <p role="status" className="text-sm text-sub">{t(notice)}</p>}
    {error && <p role="alert" className="text-sm text-body">{t(error)}</p>}
  </section>
}
