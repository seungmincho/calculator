'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { Copy, Check, Link2, Search, X, ClipboardPaste, ArrowRight } from 'lucide-react'
import { useTranslations } from '@/lib/i18n'
import { useSearchParams } from '@/hooks/useSearchParams'
import GuideSection from '@/components/GuideSection'
import { resolveCity, searchCities, offsetMin, isDST, fmtOffset, fmtDiff, dayDiff } from '@/utils/worldClock'
import {
  type AddUnit, type Parsed, type Wall, type WallStatus, ADD_UNITS,
  wallToUtc, wallOf, wallInput, parseWallInput, formatAll, relative, addTime, diffTime, parseAny, tzAbbr,
} from '@/utils/timeConvert'

const EXAMPLE = Date.UTC(2026, 9, 1, 3) // 정적 HTML용 고정 예시 (2026-10-01 12:00 KST). 마운트 후 현재 시각으로 바뀜
const DEFAULT_SRC = 'seoul'
const DEFAULT_TARGETS = ['utc', 'newYork', 'losAngeles', 'london', 'tokyo']
const MAX_MS = 8.64e15
const pad = (n: number) => String(n).padStart(2, '0')

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

const numParam = (v: string | null) => {
  if (!v) return null
  const n = Number(v)
  return Number.isFinite(n) && Math.abs(n) <= MAX_MS ? n : null
}

function ZoneSearch({ placeholder, exclude, onPick, refMs }: {
  placeholder: string; exclude: string[]; onPick: (id: string) => void; refMs: number
}) {
  const t = useTranslations('timeConverter')
  const [q, setQ] = useState('')
  const allTz = useMemo(() => {
    try { return (Intl as unknown as { supportedValuesOf: (k: string) => string[] }).supportedValuesOf('timeZone') } catch { return [] }
  }, [])
  const results = useMemo(() => searchCities(q, exclude, allTz), [q, exclude, allTz])
  const pick = (id: string) => { onPick(id); setQ('') }
  return (
    <div className="relative">
      <Search className="w-4 h-4 text-faint absolute left-4 top-1/2 -translate-y-1/2" aria-hidden />
      <input
        value={q}
        onChange={e => setQ(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter' && results[0]) pick(results[0].id); if (e.key === 'Escape') setQ('') }}
        placeholder={placeholder}
        aria-label={placeholder}
        className="ui-field pl-10 pr-4 py-3"
      />
      {q.trim() && (
        <ul className="absolute z-20 mt-2 w-full bg-surface border border-line rounded-xl shadow-lg max-h-72 overflow-auto">
          {results.length ? results.map(c => (
            <li key={c.id}>
              <button onClick={() => pick(c.id)} className="w-full text-left px-4 py-2.5 hover:bg-soft flex justify-between gap-3">
                <span className="text-fg min-w-0 truncate">{c.ko} <span className="text-muted text-sm">{c.en !== c.ko ? c.en : ''}</span></span>
                <span className="text-xs text-faint tabular-nums shrink-0">{fmtOffset(offsetMin(c.tz, refMs))}</span>
              </button>
            </li>
          )) : <li className="px-4 py-3 text-sm text-muted">{t('noResults')}</li>}
        </ul>
      )}
    </div>
  )
}

export default function TimeConverter() {
  const t = useTranslations('timeConverter')
  const sp = useSearchParams()
  const locale = t('intlLocale')
  const weekdays = t.raw('weekdays') as string[]

  const [ms, setMs] = useState(EXAMPLE)
  const [endMs, setEndMs] = useState(EXAMPLE + 7 * 86400000)
  const [srcId, setSrcId] = useState(DEFAULT_SRC)
  const [targets, setTargets] = useState<string[]>(DEFAULT_TARGETS)
  // 시간대를 바꿀 때: 'wall'이면 같은 벽시계 시각을 새 시간대로 재해석, 'instant'면 같은 순간 유지
  const [anchor, setAnchor] = useState<'wall' | 'instant'>('instant')
  const [status, setStatus] = useState<WallStatus>('ok')
  const [pinned, setPinned] = useState(false) // 사용자가 시각을 정했으면 URL에 t/b 기록
  const [text, setText] = useState('')
  const [parsed, setParsed] = useState<Parsed | null | undefined>(undefined)
  const [now, setNow] = useState<number | null>(null)
  const [ready, setReady] = useState(false)
  const [canPaste, setCanPaste] = useState(false)
  const [copied, setCopied] = useState<string | null>(null)
  const [addN, setAddN] = useState('30')
  const [addSign, setAddSign] = useState<1 | -1>(1)
  const [addUnit, setAddUnit] = useState<AddUnit>('d')

  const src = resolveCity(srcId) ?? resolveCity(DEFAULT_SRC)!
  const tz = src.tz

  useEffect(() => {
    setNow(Date.now())
    setCanPaste(!!navigator.clipboard?.readText && window.isSecureContext)
    const iv = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(iv)
  }, [])

  // 초기화: URL(t, b, tz, to) > 현재 시각. 한 번만.
  useEffect(() => {
    if (ready) return
    const z = sp.get('tz')
    const zone = (z && resolveCity(z)) || resolveCity(DEFAULT_SRC)!
    if (z && resolveCity(z)) setSrcId(z)
    const to = (sp.get('to') ?? '').split(',').filter(id => resolveCity(id))
    if (to.length) setTargets(to)
    const tp = numParam(sp.get('t'))
    const base = tp ?? Date.now()
    setMs(base)
    setEndMs(numParam(sp.get('b')) ?? addTime(base, zone.tz, 7, 'd'))
    if (tp != null) setPinned(true)
    setReady(true)
  }, [ready, sp])

  useEffect(() => {
    if (!ready) return
    const u = new URL(window.location.href)
    const set = (k: string, v: string | null) => (v == null ? u.searchParams.delete(k) : u.searchParams.set(k, v))
    set('t', pinned ? String(ms) : null)
    set('b', pinned ? String(endMs) : null)
    set('tz', srcId === DEFAULT_SRC ? null : srcId)
    set('to', targets.join(',') === DEFAULT_TARGETS.join(',') ? null : targets.join(','))
    window.history.replaceState(window.history.state, '', u)
  }, [ready, ms, endMs, srcId, targets, pinned])

  const flash = (k: string) => { setCopied(k); setTimeout(() => setCopied(null), 2000) }
  const copy = async (v: string, k: string) => { await copyText(v); flash(k) }

  const setWall = (w: Wall) => {
    const r = wallToUtc(tz, w)
    setMs(r.ms); setStatus(r.status); setAnchor('wall'); setPinned(true)
  }
  const setInstant = (v: number) => { setMs(v); setStatus('ok'); setAnchor('instant'); setPinned(true) }

  const onText = (v: string) => {
    setText(v)
    if (!v.trim()) { setParsed(undefined); return }
    const p = parseAny(v, tz, Date.now())
    setParsed(p)
    if (!p) return
    setMs(p.ms); setStatus(p.status ?? 'ok'); setAnchor(p.status ? 'wall' : 'instant'); setPinned(true)
  }
  const paste = async () => {
    try { onText(await navigator.clipboard.readText()) } catch { /* 권한 거부: 직접 붙여넣기 */ }
  }

  const changeSrc = (id: string) => {
    const z = resolveCity(id)
    if (!z) return
    if (anchor === 'wall') {
      const r = wallToUtc(z.tz, wallOf(tz, ms))
      setMs(r.ms); setStatus(r.status)
      setEndMs(wallToUtc(z.tz, wallOf(tz, endMs)).ms)
    }
    setSrcId(id)
  }

  // ── 파생값 ──
  const fm = useMemo(() => formatAll(ms, tz), [ms, tz])
  const w = wallOf(tz, ms)
  const wd = new Date(Date.UTC(w.y, w.mo - 1, w.d)).getUTCDay()
  const off = offsetMin(tz, ms)
  const abbr = tzAbbr(tz, ms)
  const rel = now != null ? relative(ms, now, locale) : '—'
  const dateLabel = (x: Wall) => `${x.y}-${pad(x.mo)}-${pad(x.d)} (${weekdays[new Date(Date.UTC(x.y, x.mo - 1, x.d)).getUTCDay()]})`

  const n = Math.min(Math.abs(parseInt(addN, 10) || 0), 100000)
  const addRes = useMemo(() => {
    try {
      const r = addTime(ms, tz, addSign * n, addUnit)
      return Math.abs(r) <= MAX_MS ? r : null
    } catch { return null }
  }, [ms, tz, addSign, n, addUnit])

  const df = useMemo(() => diffTime(ms, endMs, tz), [ms, endMs, tz])
  const num = (v: number, digits = 0) => v.toLocaleString(locale, { maximumFractionDigits: digits })

  const shareUrl = () => {
    const u = new URL(window.location.href)
    u.searchParams.set('t', String(ms))
    u.searchParams.set('b', String(endMs))
    return u.toString()
  }
  const meetingHref = `/world-clock/?cities=${encodeURIComponent([srcId, ...targets.filter(id => id !== srcId)].join(','))}&at=${Math.floor(ms / 1000)}`

  const formatRows: [string, string][] = [
    ['unixS', fm.unixS],
    ['unixMs', fm.unixMs],
    ['isoUtc', fm.isoUtc],
    ['iso', fm.iso],
    ['rfc2822', fm.rfc2822],
    ['sql', fm.sql],
  ]

  const CopyBtn = ({ v, k }: { v: string; k: string }) => (
    <button onClick={() => copy(v, k)} aria-label={t('copy')} className="p-1.5 rounded-lg text-muted hover:bg-soft shrink-0">
      {copied === k ? <Check className="w-4 h-4 text-primary" /> : <Copy className="w-4 h-4" />}
    </button>
  )

  const parsedText = (p: Parsed) =>
    p.kind === 'epoch' ? t('kind.epoch', { unit: t(`unit.${p.unit}`) })
      : p.kind === 'now' ? t('kind.now')
        : p.status ? t('kind.wall', { zone: src.ko })
          : t('kind.zoned')

  return (
    <div className="py-8 px-4">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* 헤더 */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold text-fg">{t('title')}</h1>
            <p className="text-sm text-muted mt-1">{t('description')}</p>
          </div>
          <button onClick={() => copy(shareUrl(), 'link')} className="ui-btn-soft px-3 py-2 text-sm">
            {copied === 'link' ? <Check className="w-4 h-4" /> : <Link2 className="w-4 h-4" />}
            {copied === 'link' ? t('copied') : t('copyLink')}
          </button>
        </div>

        {/* 지금 (실시간) */}
        <div className="ui-card px-5 py-4 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
          <span className="font-semibold text-fg">{t('nowLive')}</span>
          {([['nowS', now != null ? String(Math.floor(now / 1000)) : ''], ['nowMs', now != null ? String(now) : '']] as const).map(([k, v]) => (
            <span key={k} className="flex items-center gap-1.5 min-w-0">
              <span className="text-muted">{t(`fmt.${k === 'nowS' ? 'unixS' : 'unixMs'}`)}</span>
              <code className="font-mono text-fg tabular-nums">{v || '—'}</code>
              {v && <CopyBtn v={v} k={k} />}
            </span>
          ))}
          <button onClick={() => { setText(''); setParsed(undefined); setInstant(Date.now()) }} className="ui-btn px-3 py-1.5 text-sm sm:ml-auto">
            {t('useNow')}
          </button>
        </div>

        {/* 입력 */}
        <div className="ui-card p-6 space-y-5">
          <div>
            <div className="flex items-center justify-between gap-3 mb-2">
              <label htmlFor="tc-paste" className="text-sm font-medium text-body">{t('pasteLabel')}</label>
              {canPaste && (
                <button onClick={paste} className="ui-btn-soft px-3 py-1.5 text-sm">
                  <ClipboardPaste className="w-4 h-4" />{t('pasteFromClipboard')}
                </button>
              )}
            </div>
            <div className="relative">
              <input
                id="tc-paste"
                value={text}
                onChange={e => onText(e.target.value)}
                placeholder={t('pastePlaceholder')}
                className="ui-field px-4 py-3 pr-10 font-mono text-sm"
                autoComplete="off"
                spellCheck={false}
              />
              {text && (
                <button onClick={() => onText('')} aria-label={t('clear')} className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-muted hover:bg-soft">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            <p className={`text-xs mt-2 ${parsed === null ? 'text-amber-700' : 'text-muted'}`}>
              {parsed === undefined ? t('pasteHint') : parsed === null ? t('parseFail') : t('detected', { what: parsedText(parsed) })}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="tc-dt" className="block text-sm font-medium text-body mb-2">{t('dateTimeIn', { zone: src.ko })}</label>
              <input
                id="tc-dt"
                type="datetime-local"
                step={1}
                value={wallInput(w)}
                onChange={e => { const x = parseWallInput(e.target.value); if (x) setWall(x) }}
                className="ui-field px-4 py-3"
              />
            </div>
            <div>
              <div className="text-sm font-medium text-body mb-2">
                {t('sourceZone')}: <span className="text-primary">{src.ko}</span> <span className="text-faint text-xs">{src.tz}</span>
              </div>
              <ZoneSearch placeholder={t('searchZone')} exclude={[srcId]} onPick={changeSrc} refMs={ms} />
            </div>
          </div>

          {status !== 'ok' && (
            <div className="bg-amber-50 text-amber-800 rounded-xl px-4 py-3 text-sm">
              {status === 'gap' ? t('gapWarn', { zone: src.ko, time: `${pad(w.h)}:${pad(w.mi)}` }) : t('ambiguousWarn', { zone: src.ko })}
            </div>
          )}
        </div>

        {/* 핵심 결과 */}
        <div className="ui-hero p-6 sm:p-8">
          <div className="text-sm text-white/70">{t('heroLabel', { zone: src.ko })}</div>
          <div className="text-4xl sm:text-5xl font-bold tabular-nums mt-2">{`${pad(w.h)}:${pad(w.mi)}:${pad(w.s)}`}</div>
          <div className="mt-2 text-white/80 tabular-nums" suppressHydrationWarning>
            {`${w.y}-${pad(w.mo)}-${pad(w.d)} (${weekdays[wd]}) · ${fmtOffset(off)}${abbr ? ` ${abbr}` : ''}${isDST(tz, ms) ? ` · ${t('dst')}` : ''}`}
          </div>
          <div className="mt-1 text-white/70 text-sm" suppressHydrationWarning>{rel}</div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 개발자 형식 */}
          <div className="ui-card p-6">
            <h2 className="text-lg font-semibold text-fg mb-4">{t('formatsTitle')}</h2>
            <div className="divide-y divide-line">
              {formatRows.map(([k, v]) => (
                <div key={k} className="py-2.5 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-xs text-muted">{t(`fmt.${k}`, { zone: src.ko })}</div>
                    <code className="font-mono text-sm text-fg break-all">{v}</code>
                  </div>
                  <CopyBtn v={v} k={k} />
                </div>
              ))}
              <div className="py-2.5 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-xs text-muted">{t('fmt.relative')}</div>
                  <span className="text-sm text-fg" suppressHydrationWarning>{rel}</span>
                </div>
                {now != null && <CopyBtn v={rel} k="relative" />}
              </div>
            </div>
          </div>

          {/* 다른 시간대 */}
          <div className="ui-card p-6">
            <h2 className="text-lg font-semibold text-fg mb-4">{t('otherZones')}</h2>
            <ul className="divide-y divide-line">
              {targets.map(id => {
                const c = resolveCity(id)
                if (!c) return null
                const l = wallOf(c.tz, ms)
                const o = offsetMin(c.tz, ms)
                const dd = dayDiff(c.tz, tz, ms)
                const ab = tzAbbr(c.tz, ms)
                return (
                  <li key={id} className="py-3 flex items-center gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline gap-2 flex-wrap">
                        <span className="font-semibold text-fg">{c.ko}</span>
                        <span className="text-xs text-faint truncate">{c.tz}</span>
                      </div>
                      <div className="text-xs text-muted mt-0.5" suppressHydrationWarning>
                        {fmtOffset(o)}{ab ? ` ${ab}` : ''}
                        {isDST(c.tz, ms) ? ` · ${t('dst')}` : ''}
                        {' · '}{o === off ? t('sameTime') : t('diffHours', { h: fmtDiff(o - off) })}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="font-bold text-fg tabular-nums text-lg">{`${pad(l.h)}:${pad(l.mi)}`}</div>
                      <div className="text-xs text-muted tabular-nums">
                        {dateLabel(l)}
                        {dd !== 0 && <span className="ml-1 text-primary font-medium">{dd > 0 ? t('nextDay') : t('prevDay')}</span>}
                      </div>
                    </div>
                    <div className="flex flex-col shrink-0">
                      <CopyBtn v={formatAll(ms, c.tz).iso} k={`z-${id}`} />
                      <button onClick={() => setTargets(v => v.filter(x => x !== id))} aria-label={t('remove')} className="p-1.5 rounded-lg text-muted hover:bg-soft">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </li>
                )
              })}
            </ul>
            <div className="mt-3">
              <ZoneSearch placeholder={t('addZone')} exclude={targets} onPick={id => setTargets(v => (v.includes(id) ? v : [...v, id]))} refMs={ms} />
            </div>
            <Link href={meetingHref} className="mt-4 flex items-center justify-between gap-2 bg-subtle rounded-xl px-4 py-3 text-sm text-body hover:bg-soft">
              <span>{t('meetingLink')}</span>
              <ArrowRight className="w-4 h-4 text-primary shrink-0" />
            </Link>
          </div>
        </div>

        {/* 날짜 계산 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="ui-card p-6 space-y-4">
            <div>
              <h2 className="text-lg font-semibold text-fg">{t('add.title')}</h2>
              <p className="text-sm text-muted mt-1">{t('add.desc', { zone: src.ko })}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <div className="flex rounded-xl bg-soft p-1 text-sm">
                {([1, -1] as const).map(s => (
                  <button key={s} onClick={() => setAddSign(s)}
                    className={`px-3 py-2 rounded-lg font-medium ${addSign === s ? 'bg-primary text-white' : 'text-body'}`}>
                    {s === 1 ? t('add.plus') : t('add.minus')}
                  </button>
                ))}
              </div>
              <input
                type="number" inputMode="numeric" min={0} max={100000}
                value={addN} onChange={e => setAddN(e.target.value)}
                aria-label={t('add.amount')}
                className="ui-field px-4 py-2.5 w-28 tabular-nums"
              />
              <select value={addUnit} onChange={e => setAddUnit(e.target.value as AddUnit)} aria-label={t('add.unit')} className="ui-field px-3 py-2.5 w-auto">
                {ADD_UNITS.map(u => <option key={u} value={u}>{t(`addUnit.${u}`)}</option>)}
              </select>
            </div>
            {addRes != null ? (() => {
              const r = wallOf(tz, addRes)
              return (
                <div className="bg-subtle rounded-2xl p-5">
                  <div className="text-sm text-sub">{t('add.result')}</div>
                  <div className="text-2xl font-bold text-fg tabular-nums mt-1">{`${dateLabel(r)} ${pad(r.h)}:${pad(r.mi)}:${pad(r.s)}`}</div>
                  <div className="flex items-center gap-1 mt-1 text-sm text-muted">
                    <code className="font-mono break-all">{formatAll(addRes, tz).iso}</code>
                    <CopyBtn v={formatAll(addRes, tz).iso} k="addIso" />
                  </div>
                  <div className="flex flex-wrap gap-2 mt-3">
                    <button onClick={() => setInstant(addRes)} className="ui-btn-soft px-3 py-1.5 text-sm">{t('add.useAsBase')}</button>
                    <button onClick={() => { setEndMs(addRes); setPinned(true) }} className="ui-btn-soft px-3 py-1.5 text-sm">{t('add.useAsEnd')}</button>
                  </div>
                </div>
              )
            })() : <p className="text-sm text-amber-700">{t('outOfRange')}</p>}
            {addUnit === 'bd' && <p className="text-xs text-muted">{t('holidayNote')}</p>}
          </div>

          <div className="ui-card p-6 space-y-4">
            <div>
              <h2 className="text-lg font-semibold text-fg">{t('diff.title')}</h2>
              <p className="text-sm text-muted mt-1">{t('diff.desc')}</p>
            </div>
            <div className="text-sm text-body">
              <span className="text-muted">{t('diff.start')}</span>{' '}
              <span className="tabular-nums">{`${dateLabel(w)} ${pad(w.h)}:${pad(w.mi)}:${pad(w.s)}`}</span>
            </div>
            <div>
              <label htmlFor="tc-end" className="block text-sm font-medium text-body mb-2">{t('diff.end', { zone: src.ko })}</label>
              <div className="flex gap-2">
                <input
                  id="tc-end" type="datetime-local" step={1}
                  value={wallInput(wallOf(tz, endMs))}
                  onChange={e => { const x = parseWallInput(e.target.value); if (x) { setEndMs(wallToUtc(tz, x).ms); setPinned(true) } }}
                  className="ui-field px-4 py-3 min-w-0"
                />
                <button onClick={() => { setEndMs(Date.now()); setPinned(true) }} className="ui-btn-soft px-3 py-2 text-sm shrink-0">{t('nowShort')}</button>
              </div>
            </div>
            <div className="bg-subtle rounded-2xl p-5">
              <div className="text-sm text-sub">{df.sign < 0 ? t('diff.before') : t('diff.after')}</div>
              <div className="text-2xl font-bold text-fg tabular-nums mt-1">
                {t('diff.dhms', { d: num(df.days), h: df.hours, m: df.minutes, s: df.seconds })}
              </div>
              <dl className="grid grid-cols-2 gap-x-4 gap-y-2 mt-4 text-sm">
                {([
                  ['totalHours', num(df.totalSeconds / 3600, 2)],
                  ['totalMinutes', num(df.totalSeconds / 60, 2)],
                  ['totalSeconds', num(df.totalSeconds)],
                  ['calendarDays', num(Math.abs(df.calendarDays))],
                  ['businessDays', df.businessDays == null ? '—' : num(Math.abs(df.businessDays))],
                ] as const).map(([k, v]) => (
                  <div key={k} className="min-w-0">
                    <dt className="text-muted text-xs">{t(`diff.${k}`)}</dt>
                    <dd className="text-fg font-medium tabular-nums">{v}</dd>
                  </div>
                ))}
              </dl>
              <p className="text-xs text-muted mt-3">{t('diff.businessNote')} {t('holidayNote')}</p>
            </div>
          </div>
        </div>

        <GuideSection namespace="timeConverter" defaultOpen />
      </div>
    </div>
  )
}
