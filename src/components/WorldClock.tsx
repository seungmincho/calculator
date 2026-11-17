'use client'

import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import Link from 'next/link'
import { useTranslations } from '@/lib/i18n'
import '@/lib/i18n/ns/worldClock'
import { useHydrated } from '@/hooks/useHydrated'
import { useLanguage } from '@/contexts/LanguageContext'
import { X, ChevronUp, ChevronDown, Sun, Moon, Search } from 'lucide-react'
import ShareResult from '@/components/ShareResult'
import GuideSection from '@/components/GuideSection'
import MobileResultLink from '@/components/MobileResultLink'
import {
  type City, DEFAULT_IDS, resolveCity, searchCities, localParts, offsetMin, isDST, fmtOffset, dayDiff,
  isNight, hm, ymd, mdw, inWork, MARKETS, marketSession,
} from '@/utils/worldClock'
import { initialMeetingCityIds, parseMeetingCityIds, parseMeetingAt, isMeetingInstant, meetingDate, meetingDay, meetingWorkIntervals, defaultMeetingInstant, meetingSlotIndex, meetingShareLine, meetingShareUrl, formatMeetingLocal, MeetingError, MEETING_CITY_LIMIT, type MeetingErrorCode } from '@/utils/worldClockMeeting'
import { createMeetingActionGuard, copyMeetingText, downloadMeetingCalendar } from '@/utils/worldClockActions'
import { snapshotMeetingCalendar, MeetingCalendarError, MEETING_DURATIONS, type MeetingCalendarErrorCode } from '@/utils/worldClockCalendar'

const LS_KEY = 'worldClock.cities'
const control = 'ui-btn-soft min-h-11 px-4 py-2 text-base disabled:opacity-40'
const field = 'ui-field min-h-11 max-w-full px-3 py-2 text-base'
type CopyState = { identity: string; kind: string; text: string; status: 'pending' | 'copied' | 'failed' }
type CalendarState = { identity: string; status: 'pending' | 'started' | 'failed'; error?: MeetingCalendarErrorCode }

export default function WorldClock() {
  const t = useTranslations('worldClock')
  const hydrated = useHydrated()
  const { language } = useLanguage()
  const weekdays = useMemo(() => {
    const d = t.raw('days') as Record<string, string>
    return ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'].map(k => d[k])
  }, [t])

  const [ids, setIds] = useState<string[]>(DEFAULT_IDS)
  const [ready, setReady] = useState(false)
  const [now, setNow] = useState<number | null>(null)
  const [is24h, setIs24h] = useState(true)
  const [query, setQuery] = useState('')
  const [selectedMs, setSelectedMs] = useState<number | null>(null)
  const [dateDraft, setDateDraft] = useState<string | null>(null)
  const [meetingIssue, setMeetingIssue] = useState<MeetingErrorCode | null>(null)
  const [urlNotice, setUrlNotice] = useState(false)
  const [workStart, setWorkStart] = useState(9)
  const [workEnd, setWorkEnd] = useState(18)
  const [eventTitle, setEventTitle] = useState('')
  const [duration, setDuration] = useState(60)
  const [copyState, setCopyState] = useState<CopyState | null>(null)
  const [calendarState, setCalendarState] = useState<CalendarState | null>(null)
  const [selectionFailed, setSelectionFailed] = useState(false)
  const actions = useRef(createMeetingActionGuard()), alive = useRef(true), initialized = useRef(false)
  const observedUrl = useRef(''), manual = useRef<HTMLTextAreaElement>(null)
  const dragging = useRef(false)

  const cities = useMemo(() => ids.map(resolveCity).filter((c): c is City => !!c), [ids])
  const tzs = useMemo(() => cities.map(c => c.tz), [cities])
  const base = cities[0]
  const name = (c: City) => language === 'ko' ? c.ko : c.en
  const validSelection = selectedMs !== null && isMeetingInstant(selectedMs, tzs)
  const date = dateDraft ?? (validSelection && base ? meetingDate(localParts(base.tz, selectedMs)) : '')
  const identity = JSON.stringify([ids, selectedMs, dateDraft, workStart, workEnd, eventTitle, duration, language])
  const currentIdentity = useRef(identity)
  currentIdentity.current = identity
  const visibleCopy = copyState?.identity === identity ? copyState : null
  const visibleCalendar = calendarState?.identity === identity ? calendarState : null
  const invalidate = () => { actions.current.invalidate(); setCopyState(null); setCalendarState(null); setSelectionFailed(false) }

  // 1초 틱 (서버/첫 렌더는 null → hydration 안전)
  useEffect(() => {
    setNow(Date.now())
    const iv = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(iv)
  }, [])

  // Restore only after hydration. Self synchronization and hash-only navigation never restore private inputs.
  useEffect(() => {
    if (!hydrated) return
    const restore = () => {
      const params = new URLSearchParams(window.location.search)
      const key = JSON.stringify([params.get('cities'), params.get('at')])
      if (initialized.current && observedUrl.current === key) return
      observedUrl.current = key; initialized.current = true
      let saved: string | null = null
      try { saved = localStorage.getItem(LS_KEY) } catch { /* City preference is optional. */ }
      const initial = initialMeetingCityIds(params.get('cities'), saved), zones = initial.map(id => resolveCity(id)!.tz)
      const fromUrl = parseMeetingAt(params.get('at'), zones)
      actions.current.invalidate(); setCopyState(null); setCalendarState(null); setSelectionFailed(false)
      setIds(initial); setDateDraft(null); setMeetingIssue(null); setUrlNotice(params.has('at') && fromUrl === null)
      try {
        const clock = Math.floor(Date.now() / 1000) * 1000
        if (fromUrl !== null) setSelectedMs(fromUrl)
        else {
          if (!isMeetingInstant(clock, zones)) throw new MeetingError('instant')
          const day = meetingDay(zones[0], meetingDate(localParts(zones[0], clock)))
          setSelectedMs(defaultMeetingInstant(day, zones, meetingWorkIntervals(zones, day, workStart, workEnd)))
        }
      } catch (cause) { setSelectedMs(null); setMeetingIssue(cause instanceof MeetingError ? cause.code : 'instant') }
      setReady(true)
    }
    if (!initialized.current) restore()
    window.addEventListener('popstate', restore)
    return () => window.removeEventListener('popstate', restore)
  }, [hydrated, workStart, workEnd])

  useEffect(() => {
    if (!ready) return
    try { localStorage.setItem(LS_KEY, ids.join(',')) } catch { /* 저장소 차단 */ }
    if (selectedMs === null || !isMeetingInstant(selectedMs, tzs)) return
    const url = new URL(meetingShareUrl(window.location.href, ids, selectedMs))
    observedUrl.current = JSON.stringify([url.searchParams.get('cities'), url.searchParams.get('at')])
    if (url.href !== window.location.href) window.history.replaceState(window.history.state, '', url)
  }, [ids, ready, selectedMs, tzs])

  useEffect(() => {
    alive.current = true
    const guard = actions.current
    const up = () => { dragging.current = false }
    window.addEventListener('pointerup', up)
    return () => { alive.current = false; guard.invalidate(); window.removeEventListener('pointerup', up) }
  }, [])

  useEffect(() => {
    actions.current.invalidate(); setCopyState(null); setCalendarState(null); setSelectionFailed(false)
  }, [language])

  const allTz = useMemo(() => {
    try { return (Intl as unknown as { supportedValuesOf: (k: string) => string[] }).supportedValuesOf('timeZone') } catch { return [] }
  }, [])
  const results = useMemo(() => searchCities(query, ids, allTz), [query, ids, allTz])

  const changeCities = (next: string[]) => {
    invalidate()
    const clean = parseMeetingCityIds(next.join(','))
    if (!clean.length || clean.length !== next.length) { setMeetingIssue('cities'); return }
    if (selectedMs !== null && !isMeetingInstant(selectedMs, clean.map(id => resolveCity(id)!.tz))) { setMeetingIssue('instant'); return }
    setIds(clean); setDateDraft(null); setMeetingIssue(null); setUrlNotice(false)
  }
  const add = (id: string) => { if (!ids.includes(id)) changeCities([...ids, id]); setQuery('') }
  const remove = (id: string) => changeCities(ids.filter(x => x !== id))
  const move = (i: number, d: -1 | 1) => {
    const j = i + d
    if (j < 0 || j >= ids.length) return
    const next = [...ids];[next[i], next[j]] = [next[j], next[i]]; changeCities(next)
  }

  const durText = (min: number) => {
    const a = Math.abs(min), h = Math.floor(a / 60), m = a % 60
    return m ? t('durHM', { h, m }) : t('durH', { h })
  }

  const fmtClock = useCallback((tz: string, ms: number) =>
    new Intl.DateTimeFormat(language === 'ko' ? 'ko-KR' : 'en-US', { timeZone: tz, hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: !is24h }).format(ms),
  [is24h, language])

  // ── 미팅 플래너 ──
  const model = useMemo(() => {
    if (!base || !date) return null
    try {
      const day = meetingDay(base.tz, date)
      return { day, overlap: meetingWorkIntervals(tzs, day, workStart, workEnd), error: null }
    } catch (cause) { return { day: null, overlap: null, error: cause instanceof MeetingError ? cause.code : 'unsupportedDate' as const } }
  }, [base, date, tzs, workStart, workEnd])
  const slots = model?.day?.slots ?? []
  const selIdx = model?.day && selectedMs !== null ? meetingSlotIndex(model.day, selectedMs) : -1
  const line = useMemo(() => validSelection && selectedMs !== null ? meetingShareLine(selectedMs, cities, language) : '', [validSelection, selectedMs, cities, language])
  // Clock ticks must not reformat hundreds of date/offset labels every second.
  const timeline = useMemo(() => cities.map(city => (model?.day?.slots ?? []).map(slot => ({
    valid: isMeetingInstant(slot.startMs, tzs),
    local: localParts(city.tz, slot.startMs),
    work: inWork(city.tz, slot.startMs, workStart, workEnd),
    start: isMeetingInstant(slot.startMs, [city.tz]) ? formatMeetingLocal(city.tz, slot.startMs, language) : null,
    end: isMeetingInstant(slot.endMs, [city.tz]) ? formatMeetingLocal(city.tz, slot.endMs, language) : null,
  }))), [cities, model, tzs, workStart, workEnd, language])
  const canExport = ready && validSelection && !dateDraft && !meetingIssue && !model?.error
  const shareUrl = () => meetingShareUrl(window.location.href, ids, selectedMs!)
  const localText = (tz: string, instant: number) => isMeetingInstant(instant, [tz]) ? formatMeetingLocal(tz, instant, language) : t('meetingExact.outsideRange')
  const durationText = (ms: number) => t('meetingExact.durationHMS', { hours: Math.floor(ms / 3600000), minutes: Math.floor(ms / 60000) % 60, seconds: Math.floor(ms / 1000) % 60 })
  const selectInstant = (ms: number) => {
    invalidate()
    if (!isMeetingInstant(ms, tzs)) { setMeetingIssue('instant'); return }
    setSelectedMs(ms); setDateDraft(null); setMeetingIssue(null); setUrlNotice(false)
  }
  const changeDate = (value: string) => {
    invalidate(); setDateDraft(value); setMeetingIssue(null); setUrlNotice(false)
    try {
      const day = meetingDay(base.tz, value)
      const instant = defaultMeetingInstant(day, tzs, meetingWorkIntervals(tzs, day, workStart, workEnd))
      setSelectedMs(instant); setDateDraft(null)
    } catch (cause) { setMeetingIssue(cause instanceof MeetingError ? cause.code : 'date') }
  }
  const changeWork = (kind: 'start' | 'end', value: number) => {
    invalidate()
    if (kind === 'start') setWorkStart(value); else setWorkEnd(value)
  }
  const requestCopy = async (kind: string, text: string) => {
    if (!canExport) return
    const token = actions.current.begin('copy'), key = identity
    const current = () => alive.current && currentIdentity.current === key && actions.current.isCurrent(token)
    setCopyState({ identity: key, kind, text, status: 'pending' }); setSelectionFailed(false)
    const outcome = await copyMeetingText(text, current)
    if (outcome !== 'stale' && current()) setCopyState({ identity: key, kind, text, status: outcome })
  }
  const copyLabel = (kind: string, label: string) => visibleCopy?.kind === kind ? t(visibleCopy.status === 'pending' ? 'copyRecovery.copying' : visibleCopy.status === 'copied' ? 'copied' : label) : t(label)
  const exportCalendar = async () => {
    if (!canExport || selectedMs === null) return
    const key = identity, token = actions.current.begin('calendar')
    const current = () => alive.current && currentIdentity.current === key && actions.current.isCurrent(token)
    let snapshot
    try { snapshot = snapshotMeetingCalendar({ title: eventTitle, startMs: selectedMs, durationMinutes: duration, cityIds: ids }) }
    catch (cause) { setCalendarState({ identity: key, status: 'failed', error: cause instanceof MeetingCalendarError ? cause.code : 'generate' }); return }
    setCalendarState({ identity: key, status: 'pending' })
    const outcome = await downloadMeetingCalendar(snapshot, current)
    if (outcome !== 'stale' && current()) setCalendarState({ identity: key, status: outcome })
  }
  const endMs = selectedMs === null ? null : selectedMs + duration * 60000

  return (
    <div className="space-y-8">
      {/* 헤더 */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-fg">{t('title')}</h1>
          <p className="text-sm text-muted mt-1">{t('description')}</p>
        </div>
        <div className="flex rounded-xl bg-soft p-1 text-sm">
          {[false, true].map(v => (
            <button key={String(v)} onClick={() => setIs24h(v)}
              className={`min-h-11 px-3 py-2 rounded-lg font-medium ${is24h === v ? 'bg-primary text-white' : 'text-body'}`}>
              {v ? t('format24h') : t('format12h')}
            </button>
          ))}
        </div>
      </div>

      {/* 기준 도시 */}
      {base && (
        <div className="ui-hero p-6 sm:p-8">
          <div className="text-sm text-white/70">{t('baseCity', { city: name(base) })}</div>
          <div className="text-5xl font-bold tabular-nums mt-2" suppressHydrationWarning>
            {now ? fmtClock(base.tz, now) : '--:--:--'}
          </div>
          <div className="text-white/70 mt-2 text-sm">
            {now ? `${ymd(localParts(base.tz, now))} (${weekdays[localParts(base.tz, now).wd]}) · ${fmtOffset(offsetMin(base.tz, now))}` : ' '}
          </div>
        </div>
      )}

      {/* 도시 추가 */}
      <div className="ui-card p-6 space-y-3">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <h2 className="text-lg font-semibold text-fg">{t('addCity')}</h2>
          <div className="flex gap-2">
            <button onClick={() => changeCities([...DEFAULT_IDS])} className={control}>{t('resetDefault')}</button>
            <button data-world-copy="link" disabled={!canExport} onClick={() => { void requestCopy('link', shareUrl()) }} className={control}>{copyLabel('link', 'copyLink')}</button>
          </div>
        </div>
        <div className="relative">
          <Search className="w-4 h-4 text-faint absolute left-4 top-1/2 -translate-y-1/2" aria-hidden />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && results[0]) add(results[0].id); if (e.key === 'Escape') setQuery('') }}
            placeholder={t('searchPlaceholder')}
            aria-label={t('search')}
            className="ui-field w-full pl-10 pr-4 py-3 text-base"
          />
          {query.trim() && (
            <ul className="absolute z-20 mt-2 w-full bg-surface border border-line rounded-xl shadow-lg max-h-72 overflow-auto">
              {results.length ? results.map(c => (
                <li key={c.id}>
                  <button data-world-add={c.id} disabled={ids.length >= MEETING_CITY_LIMIT} onClick={() => add(c.id)} className="min-h-11 w-full text-left px-4 py-2.5 hover:bg-soft flex justify-between gap-3 disabled:opacity-40">
                    <span className="text-fg">{name(c)} <span className="text-muted text-sm">{c.en !== c.ko ? language === 'ko' ? c.en : c.ko : ''}</span></span>
                    <span className="text-xs text-faint tabular-nums shrink-0">{now ? fmtOffset(offsetMin(c.tz, now)) : c.tz}</span>
                  </button>
                </li>
              )) : <li className="px-4 py-3 text-sm text-muted">{t('noResults')}</li>}
            </ul>
          )}
        </div>
        <p className="text-xs text-muted">{t('meetingExact.cityLimit')}</p>
      </div>

      {/* 도시 카드 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 md:grid-cols-2 gap-4">
        {cities.map((c, i) => {
          const l = now ? localParts(c.tz, now) : null
          const off = now ? offsetMin(c.tz, now) : 0
          const diff = now && base ? off - offsetMin(base.tz, now) : 0
          const dd = now && base ? dayDiff(c.tz, base.tz, now) : 0
          const night = l ? isNight(l.h) : false
          return (
            <div key={c.id} data-world-city={c.id} className={`ui-card p-5 ${i === 0 ? 'border-primary' : ''}`}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h3 className="text-lg font-bold text-fg truncate">
                    {name(c)}
                    {i === 0 && <span className="ml-2 align-middle text-xs font-medium px-2 py-0.5 rounded-full bg-primary-soft text-primary">{t('base')}</span>}
                  </h3>
                  <div className="text-xs text-faint truncate">{c.country}</div>
                </div>
                <div className="flex items-center shrink-0 -mr-1">
                  <button data-world-move={`${c.id}:up`} onClick={() => move(i, -1)} disabled={i === 0} aria-label={t('meetingExact.moveCityUp', { city: name(c) })} className="min-h-11 min-w-11 flex items-center justify-center rounded-lg hover:bg-soft text-muted disabled:opacity-30"><ChevronUp className="w-4 h-4" /></button>
                  <button data-world-move={`${c.id}:down`} onClick={() => move(i, 1)} disabled={i === cities.length - 1} aria-label={t('meetingExact.moveCityDown', { city: name(c) })} className="min-h-11 min-w-11 flex items-center justify-center rounded-lg hover:bg-soft text-muted disabled:opacity-30"><ChevronDown className="w-4 h-4" /></button>
                  <button data-world-remove={c.id} disabled={cities.length === 1} onClick={() => remove(c.id)} aria-label={t('meetingExact.removeCity', { city: name(c) })} className="min-h-11 min-w-11 flex items-center justify-center rounded-lg hover:bg-soft text-muted disabled:opacity-30"><X className="w-4 h-4" /></button>
                </div>
              </div>

              <div className="text-3xl font-bold text-fg tabular-nums mt-3" suppressHydrationWarning>
                {now ? fmtClock(c.tz, now) : '--:--:--'}
              </div>
              <div className="text-sm text-sub mt-1 flex items-center gap-2 flex-wrap">
                <span>{l ? `${l.mo}/${l.d} (${weekdays[l.wd]})` : ' '}</span>
                {l && i > 0 && (
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${dd === 0 ? 'bg-soft text-sub' : 'bg-primary-soft text-primary'}`}>
                    {dd === 0 ? t('today') : dd > 0 ? t('tomorrow') : t('yesterday')}
                  </span>
                )}
                {l && (
                  <span className="inline-flex items-center gap-1 text-xs text-muted">
                    {night ? <Moon className="w-3.5 h-3.5" aria-hidden /> : <Sun className="w-3.5 h-3.5" aria-hidden />}
                    {night ? t('night') : t('day')}
                  </span>
                )}
              </div>
              {l && (
                <div className="mt-3 pt-3 border-t border-line text-xs text-muted flex flex-wrap gap-x-3 gap-y-1">
                  <span className="tabular-nums">{fmtOffset(off)}</span>
                  <span className={isDST(c.tz, now!) ? 'text-amber-700 dark:text-amber-400 font-medium' : ''}>
                    {isDST(c.tz, now!) ? t('dst') : t('standardTime')}
                  </span>
                  {i > 0 && base && (
                    <span className="text-body">
                      {diff === 0 ? t('sameAsBase', { city: name(base) })
                        : diff > 0 ? t('diffAhead', { city: name(base), dur: durText(diff) })
                          : t('diffBehind', { city: name(base), dur: durText(diff) })}
                    </span>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
      {!cities.length && <p className="text-sm text-muted">{t('meetingPlanner.noCities')}</p>}

      {/* 미팅 플래너 */}
      {base && ready && (
        <section id="world-clock-meeting" data-world-meeting className="ui-card min-w-0 space-y-5 p-4 sm:p-6">
          <div><h2 className="text-lg font-semibold text-fg">{t('meetingPlanner.title')}</h2><p className="mt-1 text-sm text-muted">{t('meetingPlanner.description')}</p></div>
          {validSelection && selectedMs !== null && <MobileResultLink href="#world-clock-selected" label={t('meetingExact.selected')} value={[localParts(base.tz, selectedMs).h, localParts(base.tz, selectedMs).mi, localParts(base.tz, selectedMs).s].map(value => String(value).padStart(2, '0')).join(':')} />}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <label className="min-w-0 space-y-1 text-sm text-body"><span className="block">{t('meetingPlanner.date', { city: name(base) })}</span><input data-world-date type="date" min="1900-01-01" max="9999-12-31" value={date} onChange={event => changeDate(event.target.value)} className={field + ' w-full min-w-0'} /></label>
            <label className="space-y-1 text-sm text-body"><span className="block">{t('meetingPlanner.workStart')}</span><select data-world-work="start" value={workStart} onChange={event => changeWork('start', Number(event.target.value))} className={field + ' w-full'}>{Array.from({ length: 24 }, (_, h) => <option key={h} value={h} disabled={h >= workEnd}>{String(h).padStart(2, '0')}:00</option>)}</select></label>
            <label className="space-y-1 text-sm text-body"><span className="block">{t('meetingPlanner.workEnd')}</span><select data-world-work="end" value={workEnd} onChange={event => changeWork('end', Number(event.target.value))} className={field + ' w-full'}>{Array.from({ length: 24 }, (_, i) => i + 1).map(h => <option key={h} value={h} disabled={h <= workStart}>{String(h).padStart(2, '0')}:00</option>)}</select></label>
          </div>
          <button data-world-now type="button" className={control} onClick={() => selectInstant(Math.floor(Date.now() / 1000) * 1000)}>{t('meetingPlanner.now')}</button>
          <div className="space-y-1 text-xs leading-relaxed text-muted"><p>{t('meetingExact.dateHint')}</p><p>{t('meetingExact.preserved')}</p><p>{t('meetingExact.rangeLimit')}</p><p>{t('meetingExact.zoneData')}</p><p>{t('meetingExact.transitionLimit')}</p></div>
          {urlNotice && <p role="status" data-world-url-notice className="rounded-xl bg-subtle p-3 text-sm text-body">{t('meetingExact.invalidUrl')}</p>}
          {(meetingIssue || model?.error) && <p data-world-error role="alert" className="rounded-xl bg-subtle p-3 text-sm text-body">{t('meetingExact.errors.' + (meetingIssue ?? model?.error))}</p>}
          {model?.day && model.overlap && <>
            <p data-world-day-ms={model.day.totalMs} className="text-sm font-medium text-body">{t('meetingExact.dayLength', { date, duration: durationText(model.day.totalMs) })}</p>
            <p className="text-xs text-muted">{t('meetingExact.slotHint')}</p>
            <div className="overflow-x-auto rounded-xl border border-line p-2" tabIndex={0} aria-label={t('meetingExact.timeline')}>
              <div className="w-max space-y-2" onPointerLeave={() => { dragging.current = false }}>
                {cities.map((c, cityIndex) => <div key={c.id} className="flex items-center gap-1" data-world-timeline-city={c.id}>
                  <span className="w-24 shrink-0 break-words px-1 text-sm font-medium text-body">{name(c)}</span>
                  {slots.map((slot, index) => {
                    const { valid, local, work, start, end } = timeline[cityIndex][index]
                    const overlapMs = model.overlap!.slotOverlapMs[index], slotMs = slot.endMs - slot.startMs
                    const selected = index === selIdx
                    const label = t('meetingExact.slotRange', { city: name(c), start: start ?? t('meetingExact.outsideRange'), end: end ?? t('meetingExact.outsideRange'), duration: durationText(slotMs) })
                    return <button type="button" key={slot.startMs} data-world-slot={index} data-world-slot-city={c.id} data-world-slot-ms={slot.startMs} data-world-slot-duration={slotMs} data-world-overlap-ms={overlapMs}
                      disabled={!valid} aria-pressed={selected} aria-label={label + (overlapMs > 0 && overlapMs < slotMs ? ' · ' + t('meetingExact.partialOverlap', { duration: durationText(overlapMs) }) : '')} title={label}
                      onPointerDown={() => { dragging.current = true; selectInstant(slot.startMs) }} onPointerEnter={() => { if (dragging.current) selectInstant(slot.startMs) }} onClick={() => selectInstant(slot.startMs)}
                      className={'flex min-h-11 w-20 shrink-0 flex-col items-center justify-center rounded-lg border px-1 py-2 text-xs tabular-nums disabled:opacity-30 ' + (selected ? 'border-primary bg-primary text-white' : work ? 'border-line bg-primary-soft text-primary' : 'border-line bg-soft text-sub')}>
                      <span>{[local.h, local.mi, local.s].map(value => String(value).padStart(2, '0')).join(':')}</span>
                      <span className="mt-1 text-[10px]">{local.mo}/{local.d}</span>
                      {overlapMs > 0 && <span className="mt-1 text-[10px]">{t('meetingExact.cellOverlap', { minutes: Math.floor(overlapMs / 60000), seconds: Math.floor(overlapMs / 1000) % 60 })}</span>}
                    </button>
                  })}
                </div>)}
              </div>
            </div>
            <div className="rounded-xl bg-subtle p-4 text-sm text-body" data-world-overlap-total={model.overlap.totalMs}>
              <p>{model.overlap.totalMs ? t('meetingExact.overlapDuration', { duration: durationText(model.overlap.totalMs) }) : t('meetingPlanner.noOverlap')}</p>
              <ul className="mt-2 space-y-1 break-words">{model.overlap.intervals.map(range => <li key={range.startMs} data-world-overlap-start={range.startMs} data-world-overlap-end={range.endMs}>{t('meetingExact.range', { start: localText(base.tz, range.startMs), end: localText(base.tz, range.endMs) })}</li>)}</ul>
              <p className="mt-2 text-xs text-muted">{t('meetingPlanner.weekendNote')}</p>
            </div>
          </>}
          {validSelection && selectedMs !== null && <div id="world-clock-selected" data-world-selected-ms={selectedMs} className="min-w-0 scroll-mt-20 space-y-4 rounded-2xl bg-subtle p-4 sm:p-5">
            <h3 className="font-semibold text-fg">{t('meetingExact.selected')}</h3>
            <ul className="divide-y divide-line">{cities.map(c => <li key={c.id} data-world-selected-city={c.id} className="space-y-1 py-3"><span className="text-sm font-medium text-body">{name(c)}</span><p className="break-words text-base font-semibold tabular-nums text-fg">{formatMeetingLocal(c.tz, selectedMs, language)}</p></li>)}</ul>
            <textarea data-world-share-text readOnly aria-label={t('meetingPlanner.copyText')} value={line} className={field + ' min-h-32 w-full resize-y'} />
            <div className="flex flex-wrap gap-2">
              <button data-world-copy="line" disabled={!canExport} className="ui-btn min-h-11 px-4 py-2 text-base disabled:opacity-40" onClick={() => { void requestCopy('line', line) }}>{copyLabel('line', 'meetingPlanner.copyText')}</button>
              <button data-world-copy="share" disabled={!canExport} className={control} onClick={() => { void requestCopy('share', line + '\n' + shareUrl()) }}>{copyLabel('share', 'meetingPlanner.share')}</button>
            </div>
            {canExport && <ShareResult card={{ tool: t('title'), label: t('meetingPlanner.shareLabel'), headline: formatMeetingLocal(base.tz, selectedMs, language), sub: name(base), rows: cities.slice(1).map(c => ({ label: name(c), value: formatMeetingLocal(c.tz, selectedMs, language) })) }} text={line} url={shareUrl()} fileName="world-clock" />}
            <div className="space-y-3 border-t border-line pt-4" data-world-calendar>
              <h3 className="font-semibold text-fg">{t('meetingCalendar.title')}</h3>
              <label className="block space-y-1 text-sm text-body"><span>{t('meetingCalendar.titleLabel')}</span><input data-world-event-title value={eventTitle} maxLength={100} placeholder={t('meetingCalendar.titlePlaceholder')} onChange={event => { invalidate(); setEventTitle(event.target.value) }} className={field + ' w-full'} /></label>
              <label className="block space-y-1 text-sm text-body"><span>{t('meetingCalendar.duration')}</span><select data-world-duration value={duration} onChange={event => { invalidate(); setDuration(Number(event.target.value)) }} className={field + ' w-full'}>{MEETING_DURATIONS.map(minutes => <option value={minutes} key={minutes}>{t('meetingCalendar.minutes', { minutes })}</option>)}</select></label>
              <ul className="space-y-3 text-sm text-body">{cities.map(c => <li key={c.id} data-world-calendar-city={c.id}><p className="font-medium">{name(c)}</p><p className="break-words">{t('meetingCalendar.start')}: {formatMeetingLocal(c.tz, selectedMs, language)}</p><p className="break-words">{t('meetingCalendar.end')}: {endMs === null ? '' : localText(c.tz, endMs)}</p></li>)}</ul>
              {endMs !== null && !isMeetingInstant(endMs, tzs) && <p role="alert" className="text-sm text-body">{t('meetingCalendar.errors.end')}</p>}
              <button data-world-calendar-download disabled={!canExport || visibleCalendar?.status === 'pending'} className="ui-btn min-h-11 px-4 py-3 text-base disabled:opacity-40" onClick={() => { void exportCalendar() }}>{t(visibleCalendar?.status === 'pending' ? 'meetingCalendar.preparing' : 'meetingCalendar.download')}</button>
              {visibleCalendar && visibleCalendar.status !== 'pending' && <p data-world-calendar-status={visibleCalendar.status} role={visibleCalendar.status === 'failed' ? 'alert' : 'status'} className="text-sm text-body">{t(visibleCalendar.error ? 'meetingCalendar.errors.' + visibleCalendar.error : visibleCalendar.status === 'started' ? 'meetingCalendar.started' : 'meetingCalendar.failed')}</p>}
              <p className="text-xs leading-relaxed text-muted">{t('meetingCalendar.scope')}</p>
            </div>
          </div>}
        </section>
      )}
      {visibleCopy?.status === 'failed' && <section data-world-copy-recovery className="ui-card space-y-3 p-4">
        <p role="alert" className="text-sm text-body">{t('copyRecovery.failed')}</p>
        <label htmlFor="world-clock-copy-manual" className="block text-sm font-medium text-body">{t('copyRecovery.title')}</label>
        <textarea id="world-clock-copy-manual" ref={manual} readOnly value={visibleCopy.text} className={field + ' min-h-40 w-full'} />
        <div className="flex flex-wrap gap-2"><button className={control} onClick={() => { try { if (!manual.current) throw new Error('missing'); manual.current.focus(); manual.current.select(); setSelectionFailed(false) } catch { setSelectionFailed(true) } }}>{t('copyRecovery.selectAll')}</button><button className={control} onClick={() => { void requestCopy(visibleCopy.kind, visibleCopy.text) }}>{t('copyRecovery.retry')}</button><button className={control} onClick={invalidate}>{t('copyRecovery.close')}</button></div>
        {selectionFailed && <p role="alert" className="text-sm text-body">{t('copyRecovery.selectionFailed')}</p>}
      </section>}

      {/* 증시 정규장 */}
      {base && (
        <div className="ui-card p-6 space-y-4">
          <h2 className="text-lg font-semibold text-fg">{t('markets.title', { city: name(base) })}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {MARKETS.map(m => {
              const s = now ? marketSession(m, now) : null
              const o = s && localParts(base.tz, s.open), cl = s && localParts(base.tz, s.close)
              return (
                <div key={m.id} className="bg-subtle rounded-2xl p-4">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium text-fg">{t(`markets.${m.id}`)}</span>
                    {s && (
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${s.isOpen ? 'bg-primary text-white' : 'bg-soft text-sub'}`}>
                        {s.isOpen ? t('markets.open') : t('markets.closed')}
                      </span>
                    )}
                  </div>
                  <div className="text-2xl font-bold text-fg tabular-nums mt-2">
                    {o && cl ? `${hm(o)} – ${hm(cl)}` : ' '}
                  </div>
                  <div className="text-xs text-muted mt-1">
                    {o && cl && s && `${s.isOpen ? t('markets.session') : t('markets.nextSession')}: ${mdw(o, weekdays)} ${hm(o)} ~ ${mdw(cl, weekdays)} ${hm(cl)}`}
                    {m.id === 'nyse' && now && ` · ${isDST(m.tz, now) ? t('dst') : t('standardTime')}`}
                  </div>
                </div>
              )
            })}
          </div>
          <p className="text-xs text-muted">{t('markets.note')}</p>
        </div>
      )}

      <p className="text-sm text-muted">
        {t('relatedTimeConverter')}{' '}
        <Link href="/time-converter/" className="text-primary font-medium hover:underline">{t('timeConverterLink')}</Link>
      </p>

      <GuideSection namespace="worldClock" />
    </div>
  )
}
