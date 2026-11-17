'use client'

import { useId, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useTranslations } from '@/lib/i18n'
import '@/lib/i18n/ns/lunarConverter'
import { daysBetween, MIN_YEAR, MAX_YEAR, type SolarDate } from '@/utils/lunarCalendar'
import {
  createLunarAnniversaryCalendar, selectLunarCalendarOccurrences, LunarCalendarError,
  LUNAR_CALENDAR_TITLE_LIMIT, LUNAR_CALENDAR_YEAR_LIMIT,
  type LunarAnniversarySpec, type LunarCalendarErrorCode, type LunarCalendarOccurrence,
} from '@/utils/lunarAnniversaryCalendar'

interface Props { spec: LunarAnniversarySpec; startLunarYear: number; today: SolarDate | null; initialTitle?: string; onEdit?: () => void }

export default function LunarAnniversaryCalendar({ spec, startLunarYear, today, initialTitle = '', onEdit }: Props) {
  const t = useTranslations('lunarConverter')
  const titleId = useId()
  const [title, setTitle] = useState(initialTitle)
  const sourceKey = JSON.stringify([spec.month, spec.day, spec.isLeap, startLunarYear])
  const [selection, setSelection] = useState<{ sourceKey: string; years: number[] }>({ sourceKey, years: [] })
  const selected = selection.sourceKey === sourceKey ? selection.years : []
  const [busy, setBusy] = useState(false)
  const busyRef = useRef(false)
  const mounted = useRef(false)
  const generation = useRef(0)
  const [feedback, setFeedback] = useState<{ key: string; error?: LunarCalendarErrorCode; count?: number } | null>(null)
  const requestKey = JSON.stringify([sourceKey, title, selected, t('calendarExport.title')])
  const shownFeedback = feedback?.key === requestKey ? feedback : null

  useLayoutEffect(() => { mounted.current = true; return () => { mounted.current = false } }, [])
  useLayoutEffect(() => { generation.current++ }, [requestKey])

  const rows = useMemo(() => {
    if (!Number.isInteger(startLunarYear) || startLunarYear < MIN_YEAR || startLunarYear > MAX_YEAR) return []
    return Array.from({ length: LUNAR_CALENDAR_YEAR_LIMIT }, (_, index) => {
      const year = startLunarYear + index
      try { return { year, occurrence: selectLunarCalendarOccurrences(spec, [year])[0] } }
      catch { return { year, occurrence: null } }
    })
  }, [spec, startLunarYear])
  const availableYears = rows.filter(row => row.occurrence !== null).map(row => row.year)
  const selectedRows = rows.filter(row => row.occurrence && selected.includes(row.year))

  const invalidate = () => { generation.current++; setFeedback(null); onEdit?.() }
  const chooseYears = (years: number[]) => { invalidate(); setSelection({ sourceKey, years }) }
  const toggleYear = (year: number) => chooseYears(selected.includes(year) ? selected.filter(value => value !== year) : [...selected, year].sort((a, b) => a - b))
  const adjustment = (row: LunarCalendarOccurrence) => [
    row.leapFallback ? t('yearly.leapFallback', { month: spec.month }) : '',
    row.dayFallback ? t('yearly.dayFallback') : '',
  ].filter(Boolean).join(' · ')

  async function download() {
    if (busyRef.current) return
    busyRef.current = true
    setBusy(true)
    setFeedback(null)
    const request = ++generation.current
    const current = () => mounted.current && generation.current === request
    let objectUrl: string | undefined
    try {
      const text = await createLunarAnniversaryCalendar({ ...spec, title, lunarYears: [...selected] }, occurrence => [
        t('calendarExport.descriptionLunar', { year: occurrence.lunarYear, leap: spec.isLeap ? t('leapPrefix') : '', month: spec.month, day: spec.day }),
        t('calendarExport.descriptionSolar', { date: occurrence.date }),
        t('calendarExport.rule'),
        adjustment(occurrence) || t('calendarExport.noAdjustment'),
        'https://toolhub.ai.kr/lunar-converter/',
      ].join('\n'))
      if (!current()) return
      objectUrl = URL.createObjectURL(new Blob([text], { type: 'text/calendar;charset=utf-8' }))
      const link = document.createElement('a')
      link.href = objectUrl
      const years = [...selected].sort((a, b) => a - b)
      // User text never becomes a filename or a path.
      link.download = `lunar-anniversary-${years[0]}-${years[years.length - 1]}.ics`
      document.body.appendChild(link)
      try { link.click() } finally { link.remove() }
      if (current()) setFeedback({ key: requestKey, count: selected.length })
    } catch (cause) {
      if (current()) setFeedback({ key: requestKey, error: cause instanceof LunarCalendarError ? cause.code : 'download' })
    } finally {
      if (objectUrl) { const url = objectUrl; setTimeout(() => URL.revokeObjectURL(url), 1000) }
      busyRef.current = false
      if (mounted.current) setBusy(false)
    }
  }

  return <details id="lunar-calendar-export" className="min-w-0 rounded-2xl border border-line bg-surface">
    <summary className="min-h-11 cursor-pointer px-4 py-3 text-base font-semibold text-fg">{t('calendarExport.title')}</summary>
    <div className="min-w-0 space-y-4 px-4 pb-4">
      <p className="text-sm text-sub">{t('calendarExport.description')}</p>
      <div>
        <label htmlFor={titleId} className="mb-2 block text-sm font-medium text-body">{t('calendarExport.eventTitle')}</label>
        <input id={titleId} value={title} maxLength={LUNAR_CALENDAR_TITLE_LIMIT} disabled={busy} onChange={event => { invalidate(); setTitle(event.target.value) }} className="ui-field min-h-11 w-full min-w-0 px-3 py-2 text-base" />
        <p className="mt-1 text-xs text-muted">{t('calendarExport.titleHint', { count: title.length, max: LUNAR_CALENDAR_TITLE_LIMIT })}</p>
      </div>

      <div className="flex flex-wrap gap-2">
        <button type="button" disabled={busy || !availableYears.length} onClick={() => chooseYears(availableYears)} className="ui-btn-soft min-h-11 px-3 py-2 text-sm">{t('calendarExport.selectAll')}</button>
        <button type="button" disabled={busy || !selected.length} onClick={() => chooseYears([])} className="ui-btn-soft min-h-11 px-3 py-2 text-sm">{t('calendarExport.clearSelection')}</button>
      </div>
      <fieldset disabled={busy} className="min-w-0 space-y-2">
        <legend className="mb-2 text-sm font-medium text-body">{t('calendarExport.selectYears')}</legend>
        {rows.map(({ year, occurrence }) => {
          const checked = selected.includes(year)
          const past = occurrence && today && daysBetween(today, occurrence.solar) < 0
          return <label key={year} className={`flex min-h-11 min-w-0 items-start gap-3 rounded-xl border px-3 py-3 ${!occurrence ? 'border-line text-muted' : checked ? 'cursor-pointer border-primary bg-primary-soft text-primary' : 'cursor-pointer border-line text-body'}`}>
            <input type="checkbox" checked={checked} disabled={!occurrence} onChange={() => toggleYear(year)} aria-label={t('calendarExport.selectYear', { year, date: occurrence?.date ?? t('calendarExport.unavailable') })} className="mt-0.5 h-5 w-5 shrink-0 accent-primary" />
            <span className="min-w-0 text-sm">
              <span className="block font-medium">{t('calendarExport.lunarYear', { year })}</span>
              <span className="mt-1 block break-words tabular-nums">{occurrence?.date ?? t('calendarExport.unavailable')}</span>
              {occurrence && adjustment(occurrence) && <span className="mt-1 block break-words text-xs">{adjustment(occurrence)}</span>}
              {past && <span className="mt-1 block text-xs">{t('calendarExport.past')}</span>}
            </span>
          </label>
        })}
      </fieldset>
      {!availableYears.length && <p role="status" className="text-sm text-sub">{t('calendarExport.noAvailable')}</p>}
      <p className="text-sm text-body" aria-live="polite">{t('calendarExport.selectedCount', { count: selectedRows.length })}</p>
      <p className="text-xs text-muted">{t('calendarExport.rule')}</p>
      <p className="text-xs text-muted">{t('calendarExport.range', { from: '1900-01-31', to: '2050-12-31' })}</p>

      <button type="button" disabled={busy || !title.trim() || !selected.length || selectedRows.length !== selected.length} onClick={() => { void download() }} className="ui-btn min-h-11 w-full px-4 py-3 sm:w-auto">{t(busy ? 'calendarExport.preparing' : 'calendarExport.download')}</button>
      {shownFeedback?.error && <p role="alert" className="rounded-xl bg-subtle p-3 text-sm text-body">{t(`calendarExport.errors.${shownFeedback.error}`)}</p>}
      {!!shownFeedback?.count && <p role="status" className="text-sm text-sub">{t('calendarExport.downloaded', { count: shownFeedback.count })}</p>}
      <p className="text-xs text-muted">{t('calendarExport.scope')}</p>
      <p className="text-xs text-muted">{t('calendarExport.importHint')}</p>
      <p className="text-xs text-muted">{t('calendarExport.privacy')}</p>
    </div>
  </details>
}
