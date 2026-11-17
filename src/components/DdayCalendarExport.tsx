'use client'

import { useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useTranslations } from '@/lib/i18n'
import '@/lib/i18n/ns/ddayCalculator'
import type { SavedDday } from '@/utils/dday'
import { useOptionalLanguage } from '@/contexts/LanguageContext'
import { captureDdayEvents, createDdayExportRequests, sameDdayEvents, type DdayExportToken } from '@/utils/ddayExportActions'
import { createShareResultDownloads } from '@/utils/shareResultActions'
import {
  createDdayCalendar, DdayCalendarError, ddayCalendarErrorCode, selectDdayCalendarEvents,
  DDAY_CALENDAR_LIMIT, type DdayCalendarErrorCode, type DdayCalendarEvent,
} from '@/utils/ddayCalendar'

export default function DdayCalendarExport({ current, saved, savedAvailable, readSaved, contextKey = '', onBeginOutput }: {
  current: DdayCalendarEvent
  saved: SavedDday[]
  savedAvailable: boolean
  readSaved: () => SavedDday[]
  contextKey?: string
  onBeginOutput?: () => (() => boolean) | null
}) {
  const t = useTranslations('ddayCalculator')
  const language = useOptionalLanguage()?.language ?? 'ko'
  const [source, setSource] = useState<'current' | 'saved'>('current')
  const [selected, setSelected] = useState<string[]>([])
  const signature = JSON.stringify([contextKey, current, saved, savedAvailable, source, selected, language, t('exportActions.cancelled')])
  const owner = useMemo(() => createDdayExportRequests(signature), [signature])
  const downloads = useMemo(() => createShareResultDownloads(), [])
  const busyRef = useRef<{ token: DdayExportToken; current: () => boolean } | null>(null)
  const [view, setView] = useState<{ owner: typeof owner; token: DdayExportToken; current: () => boolean; status: 'busy' | 'downloaded' | 'error' | 'cancelled'; count?: number; error?: DdayCalendarErrorCode } | null>(null)
  const visible = view?.owner === owner && owner.current(view.token) && view.current() ? view : null
  const busy = visible?.status === 'busy', error = visible?.error, downloaded = visible?.count ?? 0
  useLayoutEffect(() => { owner.activate(); return () => owner.dispose() }, [owner])
  useLayoutEffect(() => { downloads.activate(); return () => downloads.dispose() }, [downloads])

  async function download() {
    if (busyRef.current && owner.current(busyRef.current.token) && busyRef.current.current()) return
    if (source === 'saved' && (!savedAvailable || !selected.length || selected.length > DDAY_CALENDAR_LIMIT)) return
    const token = owner.begin()
    if (!token) return
    const parentCurrent = onBeginOutput ? onBeginOutput() : () => true
    if (!parentCurrent) return
    const isCurrent = () => owner.current(token) && parentCurrent()
    busyRef.current = { token, current: parentCurrent }
    const request = { owner, token, current: parentCurrent }
    setView({ ...request, status: 'busy' })
    try {
      const events = captureDdayEvents(source === 'current' ? [current] : selectDdayCalendarEvents(readSaved(), selected))
      const text = await createDdayCalendar(events)
      if (!isCurrent()) return
      if (source === 'saved' && !sameDdayEvents(events, selectDdayCalendarEvents(readSaved(), selected))) throw new DdayCalendarError('selectionChanged')
      if (!isCurrent()) return
      const outcome = downloads.download(new Blob([text], { type: 'text/calendar;charset=utf-8' }), source === 'current' ? `dday-${events[0].date}.ics` : `dday-selected-${events.length}.ics`, isCurrent)
      if (outcome === 'failed') throw new DdayCalendarError('download')
      if (outcome === 'started' && isCurrent()) setView({ ...request, status: 'downloaded', count: events.length })
    } catch (cause) { if (isCurrent()) setView({ ...request, status: 'error', error: ddayCalendarErrorCode(cause) }) }
    finally { if (busyRef.current?.token === token) busyRef.current = null }
  }
  const cancel = () => {
    if (!busy || !visible || !owner.current(visible.token) || !visible.current()) return
    const token = owner.begin()
    if (token) {
      busyRef.current = null
      setView({ owner, token, current: () => true, status: 'cancelled' })
    }
  }
  const mutate = (change: () => void) => {
    if (busyRef.current && owner.current(busyRef.current.token) && busyRef.current.current()) return
    if (!owner.begin()) return
    busyRef.current = null; setView(null); change()
  }
  const selectSource = (next: 'current' | 'saved') => mutate(() => setSource(next))
  const toggle = (id: string) => {
    mutate(() => setSelected(previous => previous.includes(id) ? previous.filter(item => item !== id) : [...previous, id]))
  }

  return (
    <section data-dday-calendar="" data-dday-calendar-status={visible?.status ?? 'idle'} className="ui-card min-w-0 p-4 sm:p-6 space-y-4" aria-labelledby="dday-calendar-title">
      <div>
        <h2 id="dday-calendar-title" className="text-lg font-semibold text-fg">{t('calendarExport.title')}</h2>
        <p className="mt-2 text-sm text-sub">{t('calendarExport.description')}</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2" role="group" aria-label={t('calendarExport.source')}>
        {(['current', 'saved'] as const).map(item => <button key={item} type="button" data-dday-calendar-source={item} aria-pressed={source === item} disabled={busy} onClick={() => selectSource(item)} className={`min-h-11 rounded-xl px-4 py-2 text-sm font-medium ${source === item ? 'bg-primary text-white' : 'bg-soft text-body hover:bg-subtle'}`}>{t(`calendarExport.${item}`)}</button>)}
      </div>

      {source === 'current' ? (
        <div className="rounded-xl bg-subtle p-4">
          <p className="break-words font-medium text-fg">{current.title}</p>
          <p className="mt-1 text-sm text-sub tabular-nums">{current.date || t('calendarExport.noDate')}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {!savedAvailable && <p role="status" className="text-sm text-sub">{t('calendarExport.savedUnavailable')}</p>}
          {savedAvailable && saved.length === 0 && <p className="text-sm text-muted">{t('calendarExport.emptySaved')}</p>}
          <p className="text-sm text-sub">{t('calendarExport.selectedCount', { count: selected.length, max: DDAY_CALENDAR_LIMIT })}</p>
          {savedAvailable && saved.length > 0 && saved.length <= DDAY_CALENDAR_LIMIT && <button type="button" data-dday-calendar-all="" disabled={busy} onClick={() => mutate(() => setSelected(saved.map(item => item.id)))} className="ui-btn-soft min-h-11 px-4 py-2 text-sm">{t('calendarExport.selectAll')}</button>}
          {selected.length > 0 && <button type="button" disabled={busy} onClick={() => mutate(() => setSelected([]))} className="ui-btn-soft min-h-11 px-4 py-2 text-sm">{t('calendarExport.clearSelection')}</button>}
          <fieldset disabled={busy || !savedAvailable} className="max-h-80 min-w-0 overflow-y-auto space-y-2">
            <legend className="sr-only">{t('calendarExport.selectEvents')}</legend>
            {saved.map(item => <label key={item.id} className={`flex min-h-11 items-start gap-3 rounded-xl border px-3 py-3 cursor-pointer ${selected.includes(item.id) ? 'border-primary bg-primary-soft text-primary' : 'border-line text-body'}`}>
              <input type="checkbox" data-dday-calendar-select={item.id} checked={selected.includes(item.id)} onChange={() => toggle(item.id)} className="mt-1 h-5 w-5 shrink-0 accent-primary" />
              <span className="min-w-0"><span className="block break-words text-sm font-medium">{item.title}</span><span className="mt-1 block text-xs tabular-nums">{item.date}</span></span>
            </label>)}
          </fieldset>
          {selected.length > DDAY_CALENDAR_LIMIT && <p role="alert" className="text-sm text-body">{t('calendarExport.errors.tooMany')}</p>}
        </div>
      )}

      <div className="flex flex-wrap gap-2"><button type="button" data-dday-calendar-download="" onClick={() => { void download() }} disabled={busy || (source === 'saved' && (!savedAvailable || !selected.length || selected.length > DDAY_CALENDAR_LIMIT))} className="ui-btn min-h-11 w-full px-4 py-3 sm:w-auto">{t(busy ? 'calendarExport.preparing' : 'calendarExport.download')}</button>
        {busy && <button type="button" data-dday-calendar-cancel="" onClick={cancel} className="ui-btn-soft min-h-11 px-4 py-3">{t('exportActions.cancel')}</button>}</div>
      {visible?.status === 'cancelled' && <p role="status" className="text-sm text-sub">{t('exportActions.cancelled')}</p>}
      {error && <p role="alert" className="rounded-xl bg-subtle p-3 text-sm text-body">{t(`calendarExport.errors.${error}`)}</p>}
      {downloaded > 0 && <p role="status" className="text-sm text-sub">{t('calendarExport.downloaded', { count: downloaded })}</p>}
      <p className="text-xs text-muted">{t('calendarExport.scope')}</p>
      <p className="text-xs text-muted">{t('exportActions.scopeHint')}</p>
      <p className="text-xs text-muted">{t('calendarExport.importHint')}</p>
    </section>
  )
}
