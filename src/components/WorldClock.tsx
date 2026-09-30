'use client'

import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import Link from 'next/link'
import { useTranslations } from '@/lib/i18n'
import { useSearchParams } from '@/hooks/useSearchParams'
import { X, ChevronUp, ChevronDown, Sun, Moon, Link2, Check, Copy, Search } from 'lucide-react'
import ShareResult from '@/components/ShareResult'
import GuideSection from '@/components/GuideSection'
import {
  type City, DEFAULT_IDS, resolveCity, searchCities, localParts, offsetMin, isDST, fmtOffset, dayDiff,
  isNight, hm, ymd, mdw, daySlots, inWork, overlap, ranges, shareLine, MARKETS, marketSession,
} from '@/utils/worldClock'

const LS_KEY = 'worldClock.cities'

async function copyText(text: string) {
  try {
    if (navigator.clipboard?.writeText) { await navigator.clipboard.writeText(text); return }
  } catch { /* fallback */ }
  const ta = document.createElement('textarea')
  ta.value = text
  ta.style.position = 'fixed'
  ta.style.left = '-999999px'
  document.body.appendChild(ta)
  ta.select()
  document.execCommand('copy')
  document.body.removeChild(ta)
}

const parseIds = (s: string | null) => (s ?? '').split(',').filter(id => resolveCity(id))

export default function WorldClock() {
  const t = useTranslations('worldClock')
  const searchParams = useSearchParams()
  const weekdays = useMemo(() => {
    const d = t.raw('days') as Record<string, string>
    return ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'].map(k => d[k])
  }, [t])

  const [ids, setIds] = useState<string[]>(DEFAULT_IDS)
  const [ready, setReady] = useState(false)
  const [now, setNow] = useState<number | null>(null)
  const [is24h, setIs24h] = useState(true)
  const [query, setQuery] = useState('')
  const [copied, setCopied] = useState<string | null>(null)
  // 미팅 플래너
  const [date, setDate] = useState('')
  const [sel, setSel] = useState<number | null>(null)
  const [workStart, setWorkStart] = useState(9)
  const [workEnd, setWorkEnd] = useState(18)
  const dragging = useRef(false)

  const cities = useMemo(() => ids.map(resolveCity).filter((c): c is City => !!c), [ids])
  const base = cities[0]
  const name = (c: City) => c.ko

  // 1초 틱 (서버/첫 렌더는 null → hydration 안전)
  useEffect(() => {
    setNow(Date.now())
    const iv = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(iv)
  }, [])

  // 초기화: URL(cities, at) > localStorage > 기본값. 한 번만.
  useEffect(() => {
    if (ready) return
    const fromUrl = parseIds(searchParams.get('cities'))
    let init = fromUrl
    if (!init.length) {
      try { init = parseIds(localStorage.getItem(LS_KEY)) } catch { /* 저장소 차단 */ }
    }
    if (init.length) setIds(init)
    const baseTz = resolveCity((init.length ? init : DEFAULT_IDS)[0])!.tz
    const at = Number(searchParams.get('at'))
    const ref = at > 0 ? at * 1000 : Date.now()
    const l = localParts(baseTz, ref)
    setDate(ymd(l))
    setSel(at > 0 ? l.h : null)
    setReady(true)
  }, [searchParams, ready])

  // 저장 + URL 동기화 (초기화 이후 변경분만)
  useEffect(() => {
    if (!ready) return
    try { localStorage.setItem(LS_KEY, ids.join(',')) } catch { /* 저장소 차단 */ }
    const url = new URL(window.location.href)
    url.searchParams.set('cities', ids.join(','))
    window.history.replaceState(window.history.state, '', url)
  }, [ids, ready])

  const flash = (key: string) => { setCopied(key); setTimeout(() => setCopied(null), 2000) }

  const allTz = useMemo(() => {
    try { return (Intl as unknown as { supportedValuesOf: (k: string) => string[] }).supportedValuesOf('timeZone') } catch { return [] }
  }, [])
  const results = useMemo(() => searchCities(query, ids, allTz), [query, ids, allTz])

  const add = (id: string) => { setIds(v => (v.includes(id) ? v : [...v, id])); setQuery('') }
  const remove = (id: string) => setIds(v => v.filter(x => x !== id))
  const move = (i: number, d: -1 | 1) => setIds(v => {
    const j = i + d
    if (j < 0 || j >= v.length) return v
    const n = [...v];[n[i], n[j]] = [n[j], n[i]]
    return n
  })

  const durText = (min: number) => {
    const a = Math.abs(min), h = Math.floor(a / 60), m = a % 60
    return m ? t('durHM', { h, m }) : t('durH', { h })
  }

  const fmtClock = useCallback((tz: string, ms: number) =>
    new Intl.DateTimeFormat('ko-KR', { timeZone: tz, hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: !is24h }).format(ms),
  [is24h])

  // ── 미팅 플래너 ──
  const slots = useMemo(() => (base && date ? daySlots(base.tz, date) : []), [base, date])
  const overlapFlags = useMemo(() => overlap(cities.map(c => c.tz), slots, workStart, workEnd), [cities, slots, workStart, workEnd])
  const overlapRanges = useMemo(() => ranges(overlapFlags), [overlapFlags])
  const grid = useMemo(() => cities.map(c => slots.map(ms => {
    const l = localParts(c.tz, ms)
    return { l, work: inWork(c.tz, ms, workStart, workEnd), night: l.h < 7 || l.h >= 22 }
  })), [cities, slots, workStart, workEnd])

  // 선택 칸 기본값: 첫 겹침 구간 → 없으면 오전 9시
  const selIdx = sel ?? (overlapRanges[0]?.[0] ?? 9)
  const selMs = slots[selIdx]
  const line = selMs != null ? shareLine(selMs, cities.map(c => ({ tz: c.tz, name: name(c) })), weekdays) : ''
  const shareUrl = () => {
    const u = new URL(window.location.href)
    u.searchParams.set('cities', ids.join(','))
    if (selMs != null) u.searchParams.set('at', String(Math.floor(selMs / 1000)))
    return u.toString()
  }

  useEffect(() => {
    const up = () => { dragging.current = false }
    window.addEventListener('pointerup', up)
    return () => window.removeEventListener('pointerup', up)
  }, [])

  const rangeText = (r: [number, number]) => {
    const a = localParts(base.tz, slots[r[0]])
    const endMs = slots[r[1] - 1] + 3600000
    const b = localParts(base.tz, endMs)
    return `${hm(a)}–${b.h === 0 && b.mi === 0 ? '24:00' : hm(b)}`
  }
  const overlapHours = overlapFlags.filter(Boolean).length

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
              className={`px-3 py-1.5 rounded-lg font-medium ${is24h === v ? 'bg-primary text-white' : 'text-body'}`}>
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
            <button onClick={() => setIds(DEFAULT_IDS)} className="ui-btn-soft px-3 py-1.5 text-sm">{t('resetDefault')}</button>
            <button onClick={async () => { await copyText(window.location.href); flash('link') }} className="ui-btn-soft px-3 py-1.5 text-sm">
              {copied === 'link' ? <Check className="w-4 h-4" /> : <Link2 className="w-4 h-4" />}
              {copied === 'link' ? t('copied') : t('copyLink')}
            </button>
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
            className="ui-field w-full pl-10 pr-4 py-3"
          />
          {query.trim() && (
            <ul className="absolute z-20 mt-2 w-full bg-surface border border-line rounded-xl shadow-lg max-h-72 overflow-auto">
              {results.length ? results.map(c => (
                <li key={c.id}>
                  <button onClick={() => add(c.id)} className="w-full text-left px-4 py-2.5 hover:bg-soft flex justify-between gap-3">
                    <span className="text-fg">{c.ko} <span className="text-muted text-sm">{c.en !== c.ko ? c.en : ''}</span></span>
                    <span className="text-xs text-faint tabular-nums shrink-0">{now ? fmtOffset(offsetMin(c.tz, now)) : c.tz}</span>
                  </button>
                </li>
              )) : <li className="px-4 py-3 text-sm text-muted">{t('noResults')}</li>}
            </ul>
          )}
        </div>
      </div>

      {/* 도시 카드 */}
      <div className="grid lg:grid-cols-3 md:grid-cols-2 gap-4">
        {cities.map((c, i) => {
          const l = now ? localParts(c.tz, now) : null
          const off = now ? offsetMin(c.tz, now) : 0
          const diff = now && base ? off - offsetMin(base.tz, now) : 0
          const dd = now && base ? dayDiff(c.tz, base.tz, now) : 0
          const night = l ? isNight(l.h) : false
          return (
            <div key={c.id} className={`ui-card p-5 ${i === 0 ? 'border-primary' : ''}`}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h3 className="text-lg font-bold text-fg truncate">
                    {name(c)}
                    {i === 0 && <span className="ml-2 align-middle text-xs font-medium px-2 py-0.5 rounded-full bg-primary-soft text-primary">{t('base')}</span>}
                  </h3>
                  <div className="text-xs text-faint truncate">{c.country}</div>
                </div>
                <div className="flex items-center shrink-0 -mr-1">
                  <button onClick={() => move(i, -1)} disabled={i === 0} aria-label={t('moveUp')} className="p-1 rounded-lg hover:bg-soft text-muted disabled:opacity-30"><ChevronUp className="w-4 h-4" /></button>
                  <button onClick={() => move(i, 1)} disabled={i === cities.length - 1} aria-label={t('moveDown')} className="p-1 rounded-lg hover:bg-soft text-muted disabled:opacity-30"><ChevronDown className="w-4 h-4" /></button>
                  <button onClick={() => remove(c.id)} aria-label={t('removeCity')} className="p-1 rounded-lg hover:bg-soft text-muted"><X className="w-4 h-4" /></button>
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
      {base && date && (
        <div className="ui-card p-6 space-y-5">
          <div>
            <h2 className="text-lg font-semibold text-fg">{t('meetingPlanner.title')}</h2>
            <p className="text-sm text-muted mt-1">{t('meetingPlanner.description')}</p>
          </div>

          <div className="flex flex-wrap gap-4 items-end">
            <label className="text-sm text-body space-y-1">
              <span className="block">{t('meetingPlanner.date', { city: name(base) })}</span>
              <input type="date" value={date} onChange={e => { if (e.target.value) { setDate(e.target.value); setSel(null) } }} className="ui-field px-3 py-2" />
            </label>
            <label className="text-sm text-body space-y-1">
              <span className="block">{t('meetingPlanner.workStart')}</span>
              <select value={workStart} onChange={e => setWorkStart(Number(e.target.value))} className="ui-field px-3 py-2">
                {Array.from({ length: 24 }, (_, h) => <option key={h} value={h} disabled={h >= workEnd}>{String(h).padStart(2, '0')}:00</option>)}
              </select>
            </label>
            <label className="text-sm text-body space-y-1">
              <span className="block">{t('meetingPlanner.workEnd')}</span>
              <select value={workEnd} onChange={e => setWorkEnd(Number(e.target.value))} className="ui-field px-3 py-2">
                {Array.from({ length: 24 }, (_, h) => h + 1).map(h => <option key={h} value={h} disabled={h <= workStart}>{String(h).padStart(2, '0')}:00</option>)}
              </select>
            </label>
            <button onClick={() => { if (!now) return; const l = localParts(base.tz, now); setDate(ymd(l)); setSel(l.h) }} className="ui-btn-soft px-4 py-2 text-sm">
              {t('meetingPlanner.now')}
            </button>
          </div>

          <p className="text-xs text-muted">{t('meetingPlanner.hint')}</p>

          {/* 타임라인: 행 = 도시, 열 = 기준 도시의 1시간 */}
          <div className="overflow-x-auto -mx-2 px-2">
            <div className="min-w-[720px] select-none" onPointerLeave={() => { dragging.current = false }}>
              <div className="flex items-end gap-2 mb-1">
                <div className="w-24 shrink-0" />
                <div className="flex-1 grid grid-cols-24 gap-px">
                  {overlapFlags.map((f, i) => (
                    <div key={i} className={`h-1.5 rounded-full ${f ? 'bg-primary' : 'bg-transparent'}`} title={f ? t('meetingPlanner.overlap') : undefined} />
                  ))}
                </div>
              </div>
              {cities.map((c, ci) => (
                <div key={c.id} className="flex items-center gap-2 mb-1">
                  <div className="w-24 shrink-0 text-sm font-medium text-body truncate">{name(c)}</div>
                  <div className="flex-1 grid grid-cols-24 gap-px">
                    {grid[ci]?.map((cell, i) => {
                      const selected = i === selIdx
                      const cls = selected ? 'bg-primary text-white'
                        : cell.work ? 'bg-primary-soft text-primary'
                          : cell.night ? 'bg-subtle text-faint' : 'bg-soft text-sub'
                      return (
                        <button key={i} type="button"
                          onPointerDown={() => { dragging.current = true; setSel(i) }}
                          onPointerEnter={() => { if (dragging.current) setSel(i) }}
                          onClick={() => setSel(i)}
                          aria-label={`${name(c)} ${hm(cell.l)}`}
                          aria-pressed={selected}
                          className={`h-9 rounded text-[11px] leading-none tabular-nums flex flex-col items-center justify-center ${cls}`}>
                          <span>{cell.l.mi ? `${cell.l.h}:${String(cell.l.mi).padStart(2, '0')}` : cell.l.h}</span>
                          {cell.l.h === 0 && cell.l.mi === 0 && <span className="text-[9px] opacity-80">{cell.l.mo}/{cell.l.d}</span>}
                        </button>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap gap-4 text-xs text-sub">
            <span className="inline-flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-primary" />{t('meetingPlanner.overlap')}</span>
            <span className="inline-flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-primary-soft border border-line" />{t('meetingPlanner.workingHours')}</span>
            <span className="inline-flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-soft border border-line" />{t('meetingPlanner.offHours')}</span>
            <span className="inline-flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-subtle border border-line" />{t('meetingPlanner.night')}</span>
          </div>

          <div className={`rounded-2xl p-4 text-sm ${overlapHours ? 'bg-subtle text-body' : 'bg-amber-50 text-amber-800 dark:bg-amber-950 dark:text-amber-300'}`}>
            {overlapHours
              ? <>{t('meetingPlanner.overlapFound', { hours: overlapHours })} · {t('meetingPlanner.overlapRanges', { city: name(base), ranges: overlapRanges.map(rangeText).join(', ') })}</>
              : t('meetingPlanner.noOverlap')}
            <div className="text-xs text-muted mt-1">{t('meetingPlanner.weekendNote')}</div>
          </div>

          {/* 선택한 시간 */}
          {selMs != null && (
            <div className="bg-subtle rounded-2xl p-5 space-y-3">
              <div className="text-sm text-muted">{t('meetingPlanner.selected')}</div>
              <ul className="divide-y divide-line">
                {cities.map(c => {
                  const l = localParts(c.tz, selMs)
                  const work = inWork(c.tz, selMs, workStart, workEnd)
                  const dd = dayDiff(c.tz, base.tz, selMs)
                  return (
                    <li key={c.id} className="flex items-center justify-between gap-3 py-2">
                      <span className="text-body">{name(c)}</span>
                      <span className="text-right">
                        <span className="text-lg font-bold text-fg tabular-nums">{hm(l)}</span>
                        <span className="text-xs text-muted ml-2">{mdw(l, weekdays)}{dd !== 0 && ` · ${dd > 0 ? t('nextDay') : t('prevDay')}`}</span>
                        <span className={`ml-2 text-xs ${work ? 'text-primary font-medium' : 'text-faint'}`}>
                          {work ? t('meetingPlanner.workingHours') : l.h < 7 || l.h >= 22 ? t('meetingPlanner.night') : t('meetingPlanner.offHours')}
                        </span>
                      </span>
                    </li>
                  )
                })}
              </ul>
              <div className="ui-field px-4 py-3 text-sm text-body break-keep">{line}</div>
              <div className="flex flex-wrap gap-2">
                <button onClick={async () => { await copyText(line); flash('line') }} className="ui-btn px-4 py-2.5 text-sm">
                  {copied === 'line' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  {copied === 'line' ? t('copied') : t('meetingPlanner.copyText')}
                </button>
                <button onClick={async () => { await copyText(`${line}\n${shareUrl()}`); flash('share') }} className="ui-btn-soft px-4 py-2.5 text-sm">
                  {copied === 'share' ? <Check className="w-4 h-4" /> : <Link2 className="w-4 h-4" />}
                  {copied === 'share' ? t('copied') : t('meetingPlanner.share')}
                </button>
              </div>
              <ShareResult
                card={{
                  tool: t('title'),
                  label: t('meetingPlanner.shareLabel'),
                  headline: `${mdw(localParts(base.tz, selMs), weekdays)} ${hm(localParts(base.tz, selMs))}`,
                  sub: name(base),
                  rows: cities.slice(1, 6).map(c => ({ label: name(c), value: `${mdw(localParts(c.tz, selMs), weekdays)} ${hm(localParts(c.tz, selMs))}` })),
                }}
                text={line}
                url={typeof window !== 'undefined' ? shareUrl() : undefined}
                fileName="world-clock"
              />
            </div>
          )}
        </div>
      )}

      {/* 증시 정규장 */}
      {base && (
        <div className="ui-card p-6 space-y-4">
          <h2 className="text-lg font-semibold text-fg">{t('markets.title', { city: name(base) })}</h2>
          <div className="grid sm:grid-cols-2 gap-3">
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
