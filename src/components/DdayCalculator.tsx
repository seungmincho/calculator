'use client'

import { useState, useCallback, useEffect, useMemo, useRef } from 'react'
import { useTranslations } from '@/lib/i18n'
import '@/lib/i18n/ns/ddayCalculator'
import { useSearchParams } from '@/hooks/useSearchParams'
import { ArrowRightLeft, Check, ChevronLeft, ChevronRight, Copy, Pin, PinOff, Plus, Trash2 } from 'lucide-react'
import { getKoreanHolidays } from '@/utils/koreanHolidays'
import {
  todayKST, isValidDate, weekday, addDays, addMonths, addYears, daysBetween, ddayLabel, ymd,
  holidaysOfYear, holidaysInRange, rangeStats, addBusinessDays, presets as getPresets,
  dayCount, milestones, sortSaved, monthGrid, type SavedDday, type Milestone,
} from '@/utils/dday'
import ShareResult from '@/components/ShareResult'
import MobileResultLink from '@/components/MobileResultLink'
import GuideSection from '@/components/GuideSection'

type Mode = 'dday' | 'anniv' | 'diff' | 'add'
type AddUnit = 'days' | 'weeks' | 'months' | 'years'
type AnnivType = 'couple' | 'marriage' | 'baby'

const MODES: Mode[] = ['dday', 'anniv', 'diff', 'add']
const UNITS: AddUnit[] = ['days', 'weeks', 'months', 'years']
const ANNIV_TYPES: AnnivType[] = ['couple', 'marriage', 'baby']
const SAVED_KEY = 'dday-saved'
const ANNIV_KEY = 'dday-anniv'
const H = getKoreanHolidays

function readLS<T>(key: string, fallback: T): T {
  try { const v = localStorage.getItem(key); return v ? (JSON.parse(v) as T) : fallback } catch { return fallback }
}
function writeLS(key: string, v: unknown) {
  try { localStorage.setItem(key, JSON.stringify(v)) } catch { /* 저장 불가(시크릿 모드 등) */ }
}

const asList = (v: unknown) => (Array.isArray(v) ? (v as string[]) : [])

async function copyText(text: string) {
  try {
    if (navigator.clipboard?.writeText) { await navigator.clipboard.writeText(text); return }
  } catch { /* 폴백 */ }
  const ta = document.createElement('textarea')
  ta.value = text
  ta.style.position = 'fixed'
  ta.style.left = '-999999px'
  document.body.appendChild(ta)
  ta.select()
  document.execCommand('copy')
  document.body.removeChild(ta)
}

const DdayCalculator = () => {
  const t = useTranslations('ddayCalculator')
  const searchParams = useSearchParams()
  const weekdays = asList(t.raw('date.weekdays'))
  const fmt = useCallback((s: string) => {
    const [y, m, d] = s.split('-').map(Number)
    return t('date.format', { y, m, d, w: weekdays[weekday(s)] })
  }, [t, weekdays])
  const holidayName = useCallback((key: string) => t(`holidays.${key}`), [t])

  // today = null 이면 아직 마운트 전(정적 HTML) → 날짜 의존 결과는 마운트 후 계산
  const [today, setToday] = useState<string | null>(null)
  const [mode, setMode] = useState<Mode>('dday')

  const [title, setTitle] = useState('')
  const [target, setTarget] = useState('')
  const [saved, setSaved] = useState<SavedDday[]>([])

  const [annivType, setAnnivType] = useState<AnnivType>('couple')
  const [annivStart, setAnnivStart] = useState('')
  const [includeStart, setIncludeStart] = useState(true)

  const [start, setStart] = useState('')
  const [end, setEnd] = useState('')

  const [base, setBase] = useState('')
  const [addValue, setAddValue] = useState(100)
  const [addUnit, setAddUnit] = useState<AddUnit>('days')
  const [subtract, setSubtract] = useState(false)
  const [businessOnly, setBusinessOnly] = useState(false)

  const [copied, setCopied] = useState(false)

  // ── 초기화: URL 파라미터 → 고정한 D-day → 다음 수능 ──
  const inited = useRef(false)
  useEffect(() => {
    if (inited.current) return
    inited.current = true
    const now = todayKST()
    setToday(now)
    const p = searchParams
    const list = readLS<SavedDday[]>(SAVED_KEY, []).filter(s => isValidDate(s.date))
    setSaved(list)
    const m = p.get('mode') as Mode | null
    if (m && MODES.includes(m)) setMode(m)

    const urlDate = p.get('date') ?? p.get('target') // target/event = 예전 링크 호환
    const urlTitle = p.get('title') ?? p.get('event')
    const pinned = list.find(s => s.pinned)
    if (isValidDate(urlDate)) { setTarget(urlDate); setTitle(urlTitle ?? '') }
    else if (pinned) { setTarget(pinned.date); setTitle(pinned.title) }
    else {
      const csat = getPresets(now, H).find(x => x.key === 'csat')!
      setTarget(csat.date); setTitle(t('presets.csat'))
    }

    const a = readLS<{ start?: string; type?: AnnivType; inc?: boolean }>(ANNIV_KEY, {})
    const urlStart = m === 'anniv' ? p.get('start') : null
    setAnnivStart(isValidDate(urlStart) ? urlStart : isValidDate(a.start) ? a.start : addDays(now, -80))
    const ty = (m === 'anniv' ? p.get('type') : null) ?? a.type
    if (ty && ANNIV_TYPES.includes(ty as AnnivType)) setAnnivType(ty as AnnivType)
    const inc = m === 'anniv' ? p.get('inc') : null
    setIncludeStart(inc != null ? inc !== '0' : a.inc ?? true)

    const s = p.get('start'), e = p.get('end')
    setStart(m === 'diff' && isValidDate(s) ? s : now)
    setEnd(m === 'diff' && isValidDate(e) ? e : addDays(now, 100))

    const b = p.get('base')
    setBase(isValidDate(b) ? b : now)
    const v = Number(p.get('value'))
    if (Number.isInteger(v) && v > 0) setAddValue(v)
    const u = p.get('unit') as AddUnit | null
    if (u && UNITS.includes(u)) setAddUnit(u)
    if (p.get('dir') === 'subtract') setSubtract(true)
    if (p.get('biz') === '1') setBusinessOnly(true)
  }, [searchParams, t])

  // ── URL 동기화 (현재 모드의 값만) ──
  useEffect(() => {
    if (!today) return
    const params = new URLSearchParams({ mode })
    if (mode === 'dday') { if (title) params.set('title', title); params.set('date', target) }
    if (mode === 'anniv') { params.set('start', annivStart); params.set('type', annivType); params.set('inc', includeStart ? '1' : '0') }
    if (mode === 'diff') { params.set('start', start); params.set('end', end) }
    if (mode === 'add') {
      params.set('base', base); params.set('value', String(addValue)); params.set('unit', addUnit)
      if (subtract) params.set('dir', 'subtract')
      if (businessOnly && addUnit === 'days') params.set('biz', '1')
    }
    window.history.replaceState(window.history.state, '', `${window.location.pathname}?${params}`)
  }, [today, mode, title, target, annivStart, annivType, includeStart, start, end, base, addValue, addUnit, subtract, businessOnly])

  useEffect(() => {
    if (today && isValidDate(annivStart)) writeLS(ANNIV_KEY, { start: annivStart, type: annivType, inc: includeStart })
  }, [today, annivStart, annivType, includeStart])

  const updateSaved = useCallback((next: SavedDday[]) => { setSaved(next); writeLS(SAVED_KEY, next) }, [])

  // ── D-day ──
  const dday = useMemo(() => {
    if (!today || !isValidDate(target)) return null
    const diff = daysBetween(today, target)
    return { diff, label: ddayLabel(diff), stats: rangeStats(today, target, H) }
  }, [today, target])

  const presetList = useMemo(() => (today ? getPresets(today, H) : []), [today])
  const sortedSaved = useMemo(() => (today ? sortSaved(saved, today) : saved), [saved, today])
  const displayTitle = title.trim() || t('dday.untitled')
  const isSaved = saved.some(s => s.title === displayTitle && s.date === target)

  const saveCurrent = () => {
    if (!isValidDate(target) || isSaved) return
    updateSaved([...saved, { id: `${Date.now()}`, title: displayTitle, date: target, pinned: saved.length === 0 }])
  }
  const togglePin = (id: string) => updateSaved(saved.map(s => ({ ...s, pinned: s.id === id ? !s.pinned : false })))
  const remove = (id: string) => updateSaved(saved.filter(s => s.id !== id))
  const load = (s: { title: string; date: string }) => { setMode('dday'); setTitle(s.title); setTarget(s.date) }

  const ddayShareText = dday ? `${displayTitle} ${dday.label} · ${fmt(target)}` : ''

  // ── 기념일 ──
  const anniv = useMemo(() => {
    if (!today || !isValidDate(annivStart)) return null
    const count = dayCount(annivStart, today, includeStart)
    const list = milestones(annivStart, includeStart)
    const next = list.find(m => m.date >= today) ?? null
    const span = ymd(annivStart, today)
    return { count, list, next, span, started: annivStart <= today }
  }, [today, annivStart, includeStart])

  const msLabel = (m: Milestone) => (m.kind === 'days' ? t('anniv.daysMilestone', { n: m.n }) : t('anniv.yearsMilestone', { n: m.n }))
  const annivTitle = t(`anniv.types.${annivType}.name`)
  const annivHeadline = anniv ? (anniv.started ? t('anniv.dayCount', { n: anniv.count.toLocaleString() }) : ddayLabel(daysBetween(today!, annivStart))) : ''
  const annivShareText = anniv
    ? `${annivTitle} ${annivHeadline}${anniv.next ? ` · ${msLabel(anniv.next)} ${ddayLabel(daysBetween(today!, anniv.next.date))}` : ''}`
    : ''

  // ── 날짜 차이 / 더하기 ──
  const diffResult = useMemo(() => {
    if (!isValidDate(start) || !isValidDate(end)) return null
    return { ...rangeStats(start, end, H), span: ymd(start, end), holidays: holidaysInRange(addDays(start <= end ? start : end, 1), start <= end ? end : start, H) }
  }, [start, end])

  const addResult = useMemo(() => {
    if (!isValidDate(base) || !(addValue > 0)) return null
    const n = subtract ? -addValue : addValue
    if (addUnit === 'days') return businessOnly ? addBusinessDays(base, n, H) : addDays(base, n)
    if (addUnit === 'weeks') return addDays(base, n * 7)
    if (addUnit === 'months') return addMonths(base, n)
    return addYears(base, n)
  }, [base, addValue, addUnit, subtract, businessOnly])
  const addStats = useMemo(() => (addResult ? rangeStats(base, addResult, H) : null), [addResult, base])

  const onCopy = async (text: string) => {
    await copyText(`${text}\n${window.location.href}`)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const segBtn = (active: boolean) =>
    `px-3 py-2 rounded-xl text-sm font-medium transition-colors ${active ? 'bg-primary text-white' : 'bg-soft text-body hover:bg-subtle'}`
  const label = 'block text-sm font-medium text-body mb-1.5'
  const statLine = (s: { weeks: number; restDays: number; business: number; weekend: number; holiday: number }) =>
    [t('hero.weeksDays', { w: s.weeks, d: s.restDays }), t('hero.business', { n: s.business }), t('hero.weekend', { n: s.weekend }), t('hero.holiday', { n: s.holiday })].join(' · ')

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-fg">{t('title')}</h1>
        <p className="text-sm text-muted mt-1">{t('description')}</p>
      </div>

      <div className="grid grid-cols-4 gap-1 p-1 bg-soft rounded-2xl" role="tablist">
        {MODES.map(k => (
          <button key={k} role="tab" aria-selected={mode === k} onClick={() => setMode(k)}
            className={`px-2 py-2.5 rounded-xl text-sm font-semibold transition-colors ${mode === k ? 'bg-primary text-white' : 'text-sub hover:text-fg'}`}>
            {t(`modes.${k}`)}
          </button>
        ))}
      </div>

      {mode === 'dday' && (
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 space-y-6">
            <div className="ui-card p-6 space-y-4">
              {dday && <MobileResultLink href="#dday-calculator-result" label={displayTitle} value={dday.label} />}
              <div>
                <label className={label} htmlFor="dday-title">{t('dday.eventName')}</label>
                <input id="dday-title" type="text" value={title} maxLength={40} onChange={e => setTitle(e.target.value)}
                  placeholder={t('dday.eventNamePlaceholder')} className="ui-field w-full px-4 py-3" />
              </div>
              <div>
                <label className={label} htmlFor="dday-date">{t('dday.targetDate')}</label>
                <input id="dday-date" type="date" value={target} onChange={e => setTarget(e.target.value)} className="ui-field w-full px-4 py-3" />
              </div>
              <button onClick={saveCurrent} disabled={!dday || isSaved} className="ui-btn w-full px-4 py-3">
                {isSaved ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                {isSaved ? t('saved.done') : t('saved.add')}
              </button>
              <div>
                <p className="text-sm font-medium text-body mb-2">{t('presets.title')}</p>
                <div className="flex flex-wrap gap-2">
                  {presetList.map(p => {
                    const name = t(`presets.${p.key}`)
                    const active = target === p.date && title === name
                    return (
                      <button key={p.key} onClick={() => load({ title: name, date: p.date })} className={segBtn(active)}
                        title={p.estimated ? t('presets.estimated') : undefined}>
                        {name} <span className={active ? 'text-white/80' : 'text-muted'}>{ddayLabel(daysBetween(today!, p.date))}</span>
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>

            <div className="ui-card p-6">
              <h2 className="text-base font-semibold text-fg mb-3">{t('saved.title')}</h2>
              {sortedSaved.length === 0 ? (
                <p className="text-sm text-muted">{t('saved.empty')}</p>
              ) : (
                <ul className="divide-y divide-line">
                  {sortedSaved.map(s => {
                    const d = today ? daysBetween(today, s.date) : 0
                    const active = s.date === target && s.title === displayTitle
                    return (
                      <li key={s.id} className="flex items-center gap-2 py-2">
                        <button onClick={() => load(s)} className={`flex-1 min-w-0 text-left rounded-xl px-3 py-2 ${active ? 'bg-primary-soft' : 'hover:bg-subtle'}`}>
                          <span className={`block text-sm font-medium truncate ${active ? 'text-primary' : 'text-fg'}`}>{s.title}</span>
                          <span className="block text-xs text-muted">{fmt(s.date)}</span>
                        </button>
                        <span className={`text-sm font-bold tabular-nums ${d >= 0 ? 'text-primary' : 'text-muted'}`}>{today ? ddayLabel(d) : ''}</span>
                        <button onClick={() => togglePin(s.id)} aria-label={s.pinned ? t('saved.unpin') : t('saved.pin')} title={s.pinned ? t('saved.unpin') : t('saved.pin')}
                          className={`p-2 rounded-lg ${s.pinned ? 'text-primary' : 'text-faint hover:text-body'}`}>
                          {s.pinned ? <Pin className="w-4 h-4" /> : <PinOff className="w-4 h-4" />}
                        </button>
                        <button onClick={() => remove(s.id)} aria-label={t('saved.delete')} title={t('saved.delete')} className="p-2 rounded-lg text-faint hover:text-red-500">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </li>
                    )
                  })}
                </ul>
              )}
              <p className="text-xs text-faint mt-3">{t('saved.hint')}</p>
            </div>
          </div>

          <div className="lg:col-span-2 space-y-6">
            <div id="dday-calculator-result" className="ui-hero p-6 sm:p-8 scroll-mt-20">
              <p className="text-white/80 text-sm font-medium truncate">{displayTitle}</p>
              <p className="text-6xl sm:text-7xl font-bold tabular-nums mt-2">{dday ? dday.label : 'D-'}</p>
              {isValidDate(target) && <p className="text-white/90 text-lg font-medium mt-3">{fmt(target)}</p>}
              {dday && (
                <p className="text-white/70 text-sm mt-2">
                  {dday.diff === 0 ? t('hero.todayIs') : `${dday.diff > 0 ? t('hero.remaining') : t('hero.passed')} · ${statLine(dday.stats)}`}
                </p>
              )}
            </div>
            {dday && (
              <div className="flex flex-wrap gap-2">
                <ShareResult
                  fileName={`dday-${target}`}
                  text={ddayShareText}
                  card={{
                    tool: t('title'), label: displayTitle, headline: dday.label, sub: fmt(target),
                    rows: [
                      { label: t('shareText.rowPeriod'), value: t('hero.weeksDays', { w: dday.stats.weeks, d: dday.stats.restDays }) },
                      { label: t('shareText.rowBusiness'), value: t('hero.business', { n: dday.stats.business }) },
                      { label: t('shareText.rowHoliday'), value: t('hero.holiday', { n: dday.stats.holiday }) },
                    ],
                  }}
                />
                <button onClick={() => onCopy(ddayShareText)} className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold bg-soft text-body hover:bg-track">
                  {copied ? <Check className="w-4 h-4 text-primary" /> : <Copy className="w-4 h-4" />} {copied ? t('shareText.copied') : t('shareText.copyText')}
                </button>
              </div>
            )}
            {isValidDate(target) && <MiniCalendar target={target} today={today} fmt={fmt} holidayName={holidayName} />}
          </div>
        </div>
      )}

      {mode === 'anniv' && (
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <div className="ui-card p-6 space-y-4">
              <div>
                <p className={label}>{t('anniv.typeLabel')}</p>
                <div className="grid grid-cols-3 gap-2">
                  {ANNIV_TYPES.map(k => (
                    <button key={k} onClick={() => setAnnivType(k)} className={segBtn(annivType === k)}>{t(`anniv.types.${k}.short`)}</button>
                  ))}
                </div>
              </div>
              <div>
                <label className={label} htmlFor="anniv-start">{t(`anniv.types.${annivType}.startLabel`)}</label>
                <input id="anniv-start" type="date" value={annivStart} onChange={e => setAnnivStart(e.target.value)} className="ui-field w-full px-4 py-3" />
              </div>
              <label className="flex items-start gap-2 cursor-pointer">
                <input type="checkbox" checked={includeStart} onChange={e => setIncludeStart(e.target.checked)} className="w-4 h-4 mt-0.5 accent-blue-600" />
                <span className="text-sm text-body">
                  {t('anniv.includeStart')}
                  <span className="block text-xs text-muted mt-0.5">{t('anniv.includeStartHint')}</span>
                </span>
              </label>
            </div>
          </div>

          <div className="lg:col-span-2 space-y-6">
            {anniv && (
              <>
                <div className="ui-hero p-6 sm:p-8">
                  <p className="text-white/80 text-sm font-medium">{annivTitle}</p>
                  <p className="text-5xl sm:text-6xl font-bold tabular-nums mt-2">{annivHeadline}</p>
                  <p className="text-white/90 text-lg font-medium mt-3">{fmt(annivStart)}</p>
                  {anniv.started && (
                    <p className="text-white/70 text-sm mt-2">
                      {annivType === 'baby'
                        ? t('anniv.babyAge', { y: anniv.span.years, m: anniv.span.months, total: anniv.span.totalMonths })
                        : t('anniv.together', { y: anniv.span.years, m: anniv.span.months, d: anniv.span.days })}
                      {anniv.next && ` · ${t('anniv.nextIs', { name: msLabel(anniv.next), d: ddayLabel(daysBetween(today!, anniv.next.date)) })}`}
                    </p>
                  )}
                </div>
                <ShareResult
                  fileName={`anniversary-${annivStart}`}
                  text={annivShareText}
                  card={{
                    tool: t('title'), label: annivTitle, headline: annivHeadline, sub: t('anniv.since', { date: fmt(annivStart) }),
                    rows: anniv.list.filter(m => m.date >= today!).slice(0, 4).map(m => ({ label: msLabel(m), value: `${fmt(m.date)} ${ddayLabel(daysBetween(today!, m.date))}` })),
                  }}
                />
                <div className="ui-card p-6">
                  <h2 className="text-base font-semibold text-fg mb-3">{t('anniv.milestones')}</h2>
                  <ul className="divide-y divide-line">
                    {anniv.list.filter(m => m.kind === 'years' ? m.n <= Math.max(10, anniv.span.years + 3) : true).map(m => {
                      const d = daysBetween(today!, m.date)
                      const isNext = anniv.next === m
                      return (
                        <li key={`${m.kind}-${m.n}`} className={`flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl ${isNext ? 'bg-primary-soft' : ''}`}>
                          <span className={`text-sm font-medium ${isNext ? 'text-primary' : d < 0 ? 'text-muted' : 'text-fg'}`}>{msLabel(m)}</span>
                          <span className="flex items-center gap-3">
                            <span className="text-sm text-sub">{fmt(m.date)}</span>
                            <span className={`w-16 text-right text-sm font-semibold tabular-nums ${d >= 0 ? 'text-primary' : 'text-faint'}`}>{ddayLabel(d)}</span>
                            <button onClick={() => load({ title: `${annivTitle} ${msLabel(m)}`, date: m.date })} className="text-xs text-muted hover:text-primary">{t('anniv.toDday')}</button>
                          </span>
                        </li>
                      )
                    })}
                  </ul>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {mode === 'diff' && (
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <div className="ui-card p-6 space-y-4">
              <div>
                <label className={label} htmlFor="diff-start">{t('diff.startDate')}</label>
                <input id="diff-start" type="date" value={start} onChange={e => setStart(e.target.value)} className="ui-field w-full px-4 py-3" />
              </div>
              <button onClick={() => { setStart(end); setEnd(start) }} className="ui-btn-soft w-full px-4 py-2">
                <ArrowRightLeft className="w-4 h-4" /> {t('diff.swap')}
              </button>
              <div>
                <label className={label} htmlFor="diff-end">{t('diff.endDate')}</label>
                <input id="diff-end" type="date" value={end} onChange={e => setEnd(e.target.value)} className="ui-field w-full px-4 py-3" />
              </div>
            </div>
          </div>
          <div className="lg:col-span-2 space-y-6">
            {diffResult && (
              <>
                <div className="ui-hero p-6 sm:p-8">
                  <p className="text-white/80 text-sm font-medium">{fmt(start)} → {fmt(end)}</p>
                  <p className="text-5xl font-bold tabular-nums mt-2">{t('diff.totalDays', { n: diffResult.total.toLocaleString() })}</p>
                  <p className="text-white/70 text-sm mt-3">{statLine(diffResult)}</p>
                </div>
                <div className="ui-card p-6 space-y-4">
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    <Stat label={t('result.ymd')} value={t('anniv.together', { y: diffResult.span.years, m: diffResult.span.months, d: diffResult.span.days })} />
                    <Stat label={t('result.totalMonths')} value={t('result.monthsValue', { n: diffResult.span.totalMonths })} />
                    <Stat label={t('result.inclusive')} value={t('result.daysValue', { n: (diffResult.total + 1).toLocaleString() })} />
                  </div>
                  <p className="text-xs text-muted">{t('diff.note')}</p>
                  <HolidayList holidays={diffResult.holidays} fmt={fmt} holidayName={holidayName} title={t('result.holidaysInRange')} />
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {mode === 'add' && (
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <div className="ui-card p-6 space-y-4">
              <div>
                <label className={label} htmlFor="add-base">{t('add.baseDate')}</label>
                <input id="add-base" type="date" value={base} onChange={e => setBase(e.target.value)} className="ui-field w-full px-4 py-3" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => setSubtract(false)} className={segBtn(!subtract)}>{t('add.direction.add')}</button>
                <button onClick={() => setSubtract(true)} className={segBtn(subtract)}>{t('add.direction.subtract')}</button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className={label} htmlFor="add-value">{t('add.value')}</label>
                  <input id="add-value" type="number" min={1} max={100000} value={addValue}
                    onChange={e => setAddValue(Math.min(100000, Math.max(1, Math.floor(Number(e.target.value) || 1))))} className="ui-field w-full px-4 py-3" />
                </div>
                <div>
                  <label className={label} htmlFor="add-unit">{t('add.unit')}</label>
                  <select id="add-unit" value={addUnit} onChange={e => setAddUnit(e.target.value as AddUnit)} className="ui-field w-full px-4 py-3">
                    {UNITS.map(u => <option key={u} value={u}>{t(`add.units.${u}`)}</option>)}
                  </select>
                </div>
              </div>
              {addUnit === 'days' && (
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={businessOnly} onChange={e => setBusinessOnly(e.target.checked)} className="w-4 h-4 accent-blue-600" />
                  <span className="text-sm text-body">{t('add.businessDaysOnly')}</span>
                </label>
              )}
            </div>
          </div>
          <div className="lg:col-span-2 space-y-6">
            {addResult && addStats && (
              <>
                <div className="ui-hero p-6 sm:p-8">
                  <p className="text-white/80 text-sm font-medium">
                    {fmt(base)} {subtract ? '−' : '+'} {addValue.toLocaleString()}{t(`add.units.${addUnit}`)}{businessOnly && addUnit === 'days' ? ` (${t('add.businessShort')})` : ''}
                  </p>
                  <p className="text-4xl sm:text-5xl font-bold mt-2">{fmt(addResult)}</p>
                  <p className="text-white/70 text-sm mt-3">
                    {today ? `${ddayLabel(daysBetween(today, addResult))} · ` : ''}{t('diff.totalDays', { n: addStats.total.toLocaleString() })} · {statLine(addStats)}
                  </p>
                </div>
                <button onClick={() => load({ title: t('add.resultDate'), date: addResult })} className="ui-btn-soft px-4 py-2">{t('add.toDday')}</button>
              </>
            )}
          </div>
        </div>
      )}

      <GuideSection namespace="ddayCalculator" defaultOpen />
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-subtle rounded-xl p-4">
      <p className="text-xs text-muted">{label}</p>
      <p className="text-lg font-bold text-fg tabular-nums mt-1">{value}</p>
    </div>
  )
}

function HolidayList({ holidays, fmt, holidayName, title }: { holidays: { date: string; key: string }[]; fmt: (s: string) => string; holidayName: (k: string) => string; title: string }) {
  if (!holidays.length) return null
  return (
    <div>
      <p className="text-sm font-semibold text-body mb-2">{title} ({holidays.length})</p>
      <ul className="grid sm:grid-cols-2 gap-x-6 gap-y-1">
        {holidays.map(h => (
          <li key={`${h.date}-${h.key}`} className="flex justify-between text-sm py-1">
            <span className="text-red-500">{holidayName(h.key)}</span>
            <span className="text-sub">{fmt(h.date)}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function MiniCalendar({ target, today, fmt, holidayName }: { target: string; today: string | null; fmt: (s: string) => string; holidayName: (k: string) => string }) {
  const t = useTranslations('ddayCalculator')
  const weekdays = asList(t.raw('date.weekdays'))
  const [ym, setYm] = useState(target.slice(0, 7) + '-01')
  useEffect(() => { setYm(target.slice(0, 7) + '-01') }, [target])
  const y = +ym.slice(0, 4), m = +ym.slice(5, 7)
  const cells = monthGrid(y, m)
  const holidays = useMemo(() => new Map(holidaysOfYear(y, getKoreanHolidays).map(h => [h.date, h.key])), [y])
  const [lo, hi] = today ? (today <= target ? [today, target] : [target, today]) : [target, target]
  const rangeHolidays = useMemo(() => (today ? holidaysInRange(lo, hi, getKoreanHolidays) : []), [today, lo, hi])

  return (
    <div className="ui-card p-6 space-y-4">
      <div className="flex items-center justify-between">
        <button onClick={() => setYm(addMonths(ym, -1))} aria-label={t('calendar.prev')} className="p-2 rounded-lg text-sub hover:bg-soft"><ChevronLeft className="w-5 h-5" /></button>
        <h2 className="text-base font-semibold text-fg">{t('calendar.month', { y, m })}</h2>
        <button onClick={() => setYm(addMonths(ym, 1))} aria-label={t('calendar.next')} className="p-2 rounded-lg text-sub hover:bg-soft"><ChevronRight className="w-5 h-5" /></button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center">
        {weekdays.map((w, i) => <div key={w} className={`text-xs py-1 ${i === 0 ? 'text-red-500' : 'text-muted'}`}>{w}</div>)}
        {cells.map((d, i) => {
          if (!d) return <div key={`e${i}`} />
          const hol = holidays.get(d)
          const isTarget = d === target
          const inRange = today != null && d > lo && d < hi
          const red = hol || weekday(d) === 0
          return (
            <div key={d} title={hol ? `${fmt(d)} ${holidayName(hol)}` : fmt(d)}
              className={`relative aspect-square flex flex-col items-center justify-center rounded-xl text-sm tabular-nums
                ${isTarget ? 'bg-primary text-white font-bold' : inRange ? 'bg-primary-soft' : ''}
                ${!isTarget ? (red ? 'text-red-500' : 'text-body') : ''}
                ${d === today && !isTarget ? 'ring-2 ring-primary font-semibold' : ''}`}>
              {+d.slice(8)}
              {hol && <span className={`absolute bottom-1 w-1 h-1 rounded-full ${isTarget ? 'bg-white' : 'bg-red-500'}`} />}
            </div>
          )
        })}
      </div>
      <div className="flex flex-wrap gap-4 text-xs text-muted">
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-primary" />{t('calendar.legendTarget')}</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded ring-2 ring-primary" />{t('calendar.legendToday')}</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-primary-soft" />{t('calendar.legendRange')}</span>
        <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-red-500" />{t('calendar.legendHoliday')}</span>
      </div>
      <HolidayList holidays={rangeHolidays} fmt={fmt} holidayName={holidayName} title={t('result.holidaysInRange')} />
    </div>
  )
}

export default DdayCalculator
