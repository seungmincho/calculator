'use client'

import { useState } from 'react'
import { useTranslations } from '@/lib/i18n'
import '@/lib/i18n/ns/decisionTools'
import type { MealRecord } from '@/utils/mealHistory'

export default function MealHistoryPanel({ records, excludeDays, today, ready, busy, pick, candidates, suggestions, onExclude, onAdd, onDelete, error, notice }: {
  records: MealRecord[]; excludeDays: 0 | 1 | 7; today: string; ready: boolean; busy: boolean; pick?: string; candidates: number; suggestions: string[]
  onExclude: (days: 0 | 1 | 7) => void; onAdd: (name: string, date: string) => boolean; onDelete: (id: string) => void; error: string; notice: string
}) {
  const t = useTranslations('decisionTools')
  const [name, setName] = useState(''), [date, setDate] = useState(''), [showAll, setShowAll] = useState(false)
  const [deleteId, setDeleteId] = useState('')
  const sorted = [...records].sort((a, b) => b.date.localeCompare(a.date))
  return <section id="meal-history" className="ui-card p-4 space-y-3 scroll-mt-20" aria-labelledby="meal-history-title">
    <h2 id="meal-history-title" className="font-semibold text-fg">{t('weekly.title')}</h2>
    <div className="flex flex-wrap gap-2" role="group" aria-label={t('weekly.exclude')}>
      {([0, 1, 7] as const).map(days => <button type="button" key={days} aria-pressed={excludeDays === days} disabled={!ready || busy} onClick={() => onExclude(days)} className={`min-h-11 rounded-xl px-3 py-2 text-sm font-medium disabled:opacity-40 ${excludeDays === days ? 'bg-primary text-white' : 'bg-soft text-body'}`}>{t(`weekly.days${days}`)}</button>)}
    </div>
    <p className="text-xs text-muted">{t('weekly.hint', { count: candidates })}</p>
    {candidates < 2 && <p role="status" className="text-sm text-body">{t('weekly.noCandidates')}</p>}
    {pick && <button type="button" onClick={() => onAdd(pick, today)} disabled={!ready || busy || records.some(record => record.name === pick && record.date === today)} className="ui-btn-soft min-h-11 px-3 py-2 text-sm disabled:opacity-40">{t('weekly.savePick', { name: pick })}</button>}
    <details className="border-t border-line pt-3">
      <summary className="cursor-pointer min-h-11 text-sm font-semibold text-body">{t('weekly.manage', { count: records.length })}</summary>
      <div className="space-y-3 mt-3">
        <form onSubmit={event => { event.preventDefault(); if (onAdd(name, date || today)) setName('') }} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label className="text-sm text-body">{t('weekly.date')}<input type="date" value={date || today} onChange={event => setDate(event.target.value)} max={today} required disabled={!ready || busy} className="ui-field mt-1 min-w-0 px-3 py-3 text-base" /></label>
          <label className="text-sm text-body">{t('weekly.name')}<input value={name} onChange={event => setName(event.target.value)} list="meal-suggestions" maxLength={80} required disabled={!ready || busy} className="ui-field mt-1 px-3 py-3 text-base" /></label>
          <datalist id="meal-suggestions">{suggestions.map(food => <option key={food} value={food} />)}</datalist>
          <button type="submit" disabled={!ready || busy || !name.trim()} className="ui-btn min-h-11 px-4 py-2 text-sm disabled:opacity-40">{t('weekly.add')}</button>
        </form>
        <p className="text-xs text-muted">{t('weekly.storageHint')}</p>
        {records.length === 0 && <p className="text-sm text-muted">{t('weekly.empty')}</p>}
        <ul className="space-y-2">
          {(showAll ? sorted : sorted.slice(0, 7)).map(record => <li key={record.id} className="bg-subtle rounded-xl p-3 flex flex-wrap items-center justify-between gap-2">
            <div className="min-w-0"><p className="text-xs text-muted">{record.date}</p><p className="text-sm text-body break-words">{record.name}</p></div>
            {deleteId === record.id ? <div className="flex gap-2"><button type="button" onClick={() => { onDelete(record.id); setDeleteId('') }} disabled={busy} className="ui-btn min-h-11 px-3 py-2 text-sm">{t('weekly.confirmDelete')}</button><button type="button" onClick={() => setDeleteId('')} className="ui-btn-soft min-h-11 px-3 py-2 text-sm">{t('weekly.cancel')}</button></div> : <button type="button" aria-label={t('weekly.deleteNamed', { name: record.name, date: record.date })} onClick={() => setDeleteId(record.id)} disabled={busy} className="ui-btn-soft min-h-11 px-3 py-2 text-sm">{t('weekly.delete')}</button>}
          </li>)}
        </ul>
        {records.length > 7 && <button type="button" onClick={() => setShowAll(value => !value)} className="ui-btn-soft min-h-11 px-3 py-2 text-sm">{t(showAll ? 'weekly.less' : 'weekly.all')}</button>}
      </div>
    </details>
    {notice && <p role="status" className="text-sm text-sub">{notice}</p>}
    {error && <p role="alert" className="text-sm text-body">{t(error)}</p>}
  </section>
}
