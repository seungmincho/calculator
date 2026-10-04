'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import { Printer, RotateCcw, ExternalLink } from 'lucide-react'
import { useTranslations } from '@/lib/i18n'
import '@/lib/i18n/ns/csatDday'
import { useSearchParams } from '@/hooks/useSearchParams'
import ShareResult from '@/components/ShareResult'
import AddToCalendar from '@/components/AddToCalendar'
import { CSAT_EXAM_DATE, daysUntil } from '@/utils/csatGrade'
import {
  kstParts, toMin, fmtMin, slotAt, countdown, timelineStatus, progress, cleanAnswer, isShortAnswer,
  SCHEDULE, INQ_DETAIL, EXAM_START, TIMELINE, SHEET, type TimelineItem,
} from '@/utils/csatDday'

const NS = 'csatDday'
const CHECK_GROUPS: Record<string, string[]> = {
  required: ['admitCard', 'idCard'],
  personal: ['pencil', 'eraser', 'lead', 'watch'],
  extra: ['lunch', 'water', 'blanket', 'outer', 'mask', 'tissue'],
}
const CHECK_KEYS = Object.values(CHECK_GROUPS).flat()
const SCORE_DATE = TIMELINE.find((x) => x.key === 'score')!.start

const load = <T,>(k: string, fb: T): T => {
  try { const v = localStorage.getItem(k); return v ? (JSON.parse(v) as T) : fb } catch { return fb }
}
const save = (k: string, v: unknown) => { try { localStorage.setItem(k, JSON.stringify(v)) } catch { /* 저장 불가: 무시 */ } }

/** 마운트 후에만 현재 시각 (정적 HTML과 hydration 일치) */
function useNow(ms: number) {
  const [now, setNow] = useState<number | null>(null)
  useEffect(() => {
    const tick = () => setNow(Date.now())
    tick()
    const id = setInterval(tick, ms)
    return () => clearInterval(id)
  }, [ms])
  return now
}

const ddayText = (n: number) => (n > 0 ? `D-${n}` : n === 0 ? 'D-day' : `D+${-n}`)

function useDateFmt() {
  const t = useTranslations(NS)
  const wd = t.raw('weekdays') as string[]
  return (date: string) => {
    const [y, m, d] = date.split('-').map(Number)
    return t('md', { m, d, w: wd[new Date(Date.UTC(y, m - 1, d)).getUTCDay()] })
  }
}

export default function CsatDday() {
  const t = useTranslations(NS)
  const sp = useSearchParams()
  const sharedName = (sp.get('name') ?? '').trim().slice(0, 20)
  const [name, setName] = useState('')
  useEffect(() => { if (sharedName) setName(sharedName) }, [sharedName])

  return (
    <div className="space-y-8">
      {sharedName && (
        <div className="rounded-2xl bg-primary-soft text-primary px-5 py-4 font-semibold break-words">
          {t('cheer.banner', { name: sharedName })}
        </div>
      )}

      <div>
        <h1 className="text-2xl font-bold text-fg">{t('title')}</h1>
        <p className="text-sm text-muted mt-1">{t('description')}</p>
      </div>

      <Hero />
      <Cheer name={name} setName={setName} />
      <Schedule />
      <Checklist />
      <AnswerSheet />
      <Timeline />
      <Guide />
    </div>
  )
}

function Hero() {
  const t = useTranslations(NS)
  const fmt = useDateFmt()
  const now = useNow(1000)
  const c = now == null ? null : countdown(now)
  const slot = c?.phase === 'during' && now != null ? slotAt(kstParts(now).min) : null

  return (
    <div className="ui-hero p-6 sm:p-8">
      <p className="text-sm text-white/70">{t('hero.label')}</p>
      {!c && <p className="mt-1 text-4xl sm:text-5xl font-bold tracking-tight">{t('hero.calculating')}</p>}

      {c?.phase === 'before' && (
        <>
          <p className="mt-1 text-5xl sm:text-6xl font-bold tabular-nums tracking-tight">{ddayText(c.dday)}</p>
          <div className="mt-6 grid grid-cols-4 gap-2 sm:gap-3">
            {([['d', c.d], ['h', c.h], ['m', c.m], ['s', c.s]] as const).map(([k, v]) => (
              <div key={k} className="rounded-2xl bg-white/15 p-3 text-center">
                <p className="text-2xl sm:text-3xl font-bold tabular-nums">{k === 'd' ? v : String(v).padStart(2, '0')}</p>
                <p className="text-xs text-white/70 mt-0.5">{t(`hero.unit.${k}`)}</p>
              </div>
            ))}
          </div>
        </>
      )}

      {c?.phase === 'during' && (
        <>
          <p className="mt-1 text-4xl sm:text-5xl font-bold tracking-tight">{t('hero.during')}</p>
          {slot && slot.type !== 'done' && (
            <p className="mt-3 text-white/90">
              {t(slot.type === 'now' ? 'schedule.statusNow' : 'schedule.statusNext', { name: t(`schedule.slots.${SCHEDULE[slot.idx].key}`), n: slot.left })}
            </p>
          )}
        </>
      )}

      {c?.phase === 'after' && (
        <>
          <p className="mt-1 text-4xl sm:text-5xl font-bold tracking-tight">{t('hero.after')}</p>
          <div className="mt-5 flex flex-wrap gap-2">
            <Link href="/csat-grade/" className="inline-flex items-center px-4 py-2.5 rounded-xl bg-white text-primary text-sm font-semibold">{t('hero.ctaGrade')}</Link>
            <a href="#csat-timeline" className="inline-flex items-center px-4 py-2.5 rounded-xl bg-white/15 text-white text-sm font-semibold">{t('hero.ctaTimeline')}</a>
          </div>
        </>
      )}

      <p className="mt-5 text-sm text-white/80 break-words">
        {t('hero.date', { exam: fmt(CSAT_EXAM_DATE), time: EXAM_START, score: fmt(SCORE_DATE) })}
      </p>
    </div>
  )
}

function Cheer({ name, setName }: { name: string; setName: (v: string) => void }) {
  const t = useTranslations(NS)
  const fmt = useDateFmt()
  const now = useNow(60_000)
  if (now == null) return null
  const c = countdown(now)
  const n = name.trim().slice(0, 20)
  const headline = c.phase === 'after' ? t('cheer.doneHeadline') : t('cheer.headline', { dday: ddayText(c.dday) })
  const sub = n ? t(c.phase === 'after' ? 'cheer.doneNamed' : 'cheer.subNamed', { name: n }) : t(c.phase === 'after' ? 'cheer.done' : 'cheer.sub')
  const base = `${window.location.origin}${window.location.pathname}`
  const url = n ? `${base}?name=${encodeURIComponent(n)}` : base

  return (
    <div className="ui-card p-6 space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-fg">{t('cheer.title')}</h2>
        <p className="text-sm text-muted mt-1">{t('cheer.desc')}</p>
      </div>
      <input
        value={name} onChange={(e) => setName(e.target.value.slice(0, 20))}
        placeholder={t('cheer.placeholder')} aria-label={t('cheer.placeholder')}
        className="ui-field px-4 py-3 w-full"
      />
      <div className="rounded-2xl bg-subtle p-5">
        <p className="text-2xl font-bold text-fg tabular-nums">{headline}</p>
        <p className="text-sub mt-1 break-words">{sub}</p>
      </div>
      <ShareResult
        card={{
          tool: t('title'), label: t('cheer.cardLabel'), headline, sub,
          rows: [{ label: t('cheer.rowExam'), value: fmt(CSAT_EXAM_DATE) }, { label: t('cheer.rowScore'), value: fmt(SCORE_DATE) }],
        }}
        url={url} text={`${headline} · ${sub}`} fileName="csat-dday"
      />
    </div>
  )
}

function Schedule() {
  const t = useTranslations(NS)
  const now = useNow(1000)
  const [practice, setPractice] = useState<number | null>(null)
  const k = now == null ? null : kstParts(now)
  const examDay = k?.date === CSAT_EXAM_DATE
  const before = now != null && countdown(now).phase === 'before'

  // 실전 연습: 누른 순간을 1교시 시작(08:40)으로 놓고 같은 시간표를 진행
  const delta = practice != null && !examDay ? kstParts(practice).min - toMin(EXAM_START) : 0
  const active = examDay && k ? k.min : practice != null && now != null ? toMin(EXAM_START) + Math.floor((now - practice) / 60_000) : null
  const st = active == null ? null : slotAt(active)
  const time = (hhmm: string) => fmtMin(toMin(hhmm) + delta)

  return (
    <div className="ui-card p-6 space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-fg">{t('schedule.title')}</h2>
          <p className="text-sm text-muted mt-1">{t('schedule.desc')}</p>
        </div>
        {before && !examDay && (
          <button
            onClick={() => setPractice(practice == null ? Date.now() : null)}
            className={practice == null ? 'ui-btn-soft px-4 py-2 text-sm' : 'ui-btn px-4 py-2 text-sm'}
          >
            {t(practice == null ? 'schedule.practiceStart' : 'schedule.practiceStop')}
          </button>
        )}
      </div>

      {practice != null && !examDay && <p className="text-sm text-sub bg-subtle rounded-2xl px-4 py-3">{t('schedule.practiceOn')}</p>}

      {st && (
        <p className="rounded-2xl bg-primary-soft text-primary px-4 py-3 font-semibold">
          {st.type === 'done'
            ? t('schedule.statusDone')
            : t(st.type === 'now' ? 'schedule.statusNow' : 'schedule.statusNext', { name: t(`schedule.slots.${SCHEDULE[st.idx].key}`), n: st.left })}
        </p>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-muted border-b border-line">
              <th className="py-2 pr-2 font-medium">{t('schedule.colPeriod')}</th>
              <th className="py-2 pr-2 font-medium">{t('schedule.colTime')}</th>
              <th className="py-2 font-medium text-right">{t('schedule.colMin')}</th>
            </tr>
          </thead>
          <tbody>
            {SCHEDULE.map((s, i) => {
              const on = st?.type === 'now' && st.idx === i
              return (
                <tr key={s.key} className={`border-b border-line last:border-0 ${on ? 'bg-primary-soft text-primary font-semibold' : s.exam ? 'text-body' : 'text-sub'}`}>
                  <td className="py-2.5 pr-2 pl-1">{t(`schedule.slots.${s.key}`)}</td>
                  <td className="py-2.5 pr-2 tabular-nums whitespace-nowrap">
                    {s.end ? `${time(s.start)}–${time(s.end)}` : t('schedule.by', { time: time(s.start) })}
                  </td>
                  <td className="py-2.5 pr-1 text-right tabular-nums">{s.end ? toMin(s.end) - toMin(s.start) : ''}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-muted">{t('schedule.lang2Note')}</p>

      <div className="rounded-2xl bg-subtle p-5 space-y-2">
        <p className="text-sm font-semibold text-fg">{t('schedule.inqTitle')}</p>
        <p className="text-xs text-muted">{t('schedule.inqNote')}</p>
        <ul className="text-sm text-sub space-y-1">
          {INQ_DETAIL.map((s) => (
            <li key={s.key} className="flex justify-between gap-3">
              <span>{t(`schedule.inq.${s.key}`)}</span>
              <span className="tabular-nums whitespace-nowrap">{time(s.start)}–{time(s.end!)}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

function Checklist() {
  const t = useTranslations(NS)
  const [checked, setChecked] = useState<Record<string, boolean>>({})
  useEffect(() => { setChecked(load('csatDday.checklist', {})) }, [])
  const toggle = (k: string) => setChecked((p) => { const n = { ...p, [k]: !p[k] }; save('csatDday.checklist', n); return n })
  const reset = () => { setChecked({}); save('csatDday.checklist', {}) }
  const { done, total } = progress(checked, CHECK_KEYS)

  return (
    <div className="ui-card p-6 space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-fg">{t('checklist.title')}</h2>
          <p className="text-xs text-muted mt-1">{t('checklist.verifyNote')}</p>
        </div>
        <button onClick={reset} className="ui-btn-soft px-3 py-1.5 text-sm inline-flex items-center gap-1">
          <RotateCcw className="w-3.5 h-3.5" /> {t('checklist.reset')}
        </button>
      </div>

      <div>
        <p className="text-sm font-semibold text-fg tabular-nums">{t('checklist.progress', { done, total })}</p>
        <div className="mt-2 h-2 rounded-full bg-track overflow-hidden">
          <div className="h-full bg-primary transition-all" style={{ width: `${(done / total) * 100}%` }} />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {Object.entries(CHECK_GROUPS).map(([g, keys]) => (
          <div key={g}>
            <p className="text-sm font-semibold text-fg mb-2">{t(`checklist.groups.${g}`)}</p>
            <ul className="space-y-1">
              {keys.map((k) => (
                <li key={k}>
                  <label className={`flex items-start gap-2 rounded-xl px-2 py-1.5 cursor-pointer hover:bg-soft ${checked[k] ? 'text-faint line-through' : 'text-body'}`}>
                    <input type="checkbox" checked={!!checked[k]} onChange={() => toggle(k)} className="mt-0.5 w-4 h-4 shrink-0 accent-[var(--primary)]" />
                    <span className="text-sm break-words">{t(`checklist.items.${k}`)}</span>
                  </label>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="rounded-2xl bg-subtle p-5 text-sm text-sub space-y-1">
        <p className="font-semibold text-fg">{t('checklist.providedTitle')}</p>
        <p>{t('checklist.provided')}</p>
        <p className="text-xs text-muted">{t('checklist.penNote')}</p>
      </div>

      <div className="rounded-2xl bg-amber-50 text-amber-800 p-5 text-sm space-y-2">
        <p className="font-semibold">{t('checklist.bannedTitle')}</p>
        <ul className="list-disc pl-5 space-y-0.5">
          {(t.raw('checklist.banned') as string[]).map((x) => <li key={x} className="break-words">{x}</li>)}
        </ul>
        <p className="font-medium">{t('checklist.bannedNote')}</p>
      </div>

      <ul className="text-sm text-sub space-y-1 list-disc pl-5">
        {(t.raw('checklist.tips') as string[]).map((x) => <li key={x}>{x}</li>)}
      </ul>
    </div>
  )
}

type Sheet = { a: Record<string, string[]>; s: Record<string, string> }

function AnswerSheet() {
  const t = useTranslations(NS)
  const [sheet, setSheet] = useState<Sheet>({ a: {}, s: {} })
  const [subj, setSubj] = useState(SHEET[0].key)
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setSheet(load('csatDday.sheet', { a: {}, s: {} })); setMounted(true) }, [])
  const update = (fn: (p: Sheet) => Sheet) => setSheet((p) => { const n = fn(p); save('csatDday.sheet', n); return n })
  const setAns = (key: string, q: number, v: string) => update((p) => {
    const arr = [...(p.a[key] ?? [])]
    arr[q - 1] = cleanAnswer(key, q, v)
    return { ...p, a: { ...p.a, [key]: arr } }
  })
  const clear = () => { if (window.confirm(t('sheet.clearConfirm'))) update(() => ({ a: {}, s: {} })) }
  const cur = SHEET.find((x) => x.key === subj)!
  const filled = (sheet.a[subj] ?? []).filter(Boolean).length

  return (
    <div className="ui-card p-6 space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-fg">{t('sheet.title')}</h2>
          <p className="text-sm text-muted mt-1">{t('sheet.desc')}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => window.print()} className="ui-btn px-4 py-2 text-sm inline-flex items-center gap-1.5">
            <Printer className="w-4 h-4" /> {t('sheet.print')}
          </button>
          <button onClick={clear} className="ui-btn-soft px-3 py-2 text-sm">{t('sheet.clear')}</button>
        </div>
      </div>

      <p className="rounded-2xl bg-amber-50 text-amber-800 px-4 py-3 text-sm">{t('sheet.warn')}</p>

      <div className="flex flex-wrap gap-2" role="tablist">
        {SHEET.map((s) => (
          <button
            key={s.key} role="tab" aria-selected={subj === s.key} onClick={() => setSubj(s.key)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium ${subj === s.key ? 'bg-primary text-white' : 'bg-soft text-body hover:bg-subtle'}`}
          >
            {t(`sheet.subjects.${s.key}`)}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-sub">{t(`sheet.info.${subj}`)} · <span className="tabular-nums">{t('sheet.filled', { n: filled, total: cur.count })}</span></p>
        {cur.select && (
          <input
            value={sheet.s[subj] ?? ''} placeholder={t('sheet.selectPlaceholder')} aria-label={t('sheet.selectPlaceholder')}
            onChange={(e) => { const v = e.target.value.slice(0, 20); update((p) => ({ ...p, s: { ...p.s, [subj]: v } })) }}
            className="ui-field px-3 py-2 text-sm w-full sm:w-56"
          />
        )}
      </div>

      <div className="grid grid-cols-5 sm:grid-cols-10 gap-2">
        {Array.from({ length: cur.count }, (_, i) => {
          const q = i + 1
          const short = isShortAnswer(subj, q)
          return (
            <label key={`${subj}-${q}`} className="block text-center">
              <span className={`block text-xs tabular-nums ${short ? 'text-primary font-semibold' : 'text-muted'}`}>
                {short ? t('sheet.shortQ', { q }) : q}
              </span>
              <input
                value={sheet.a[subj]?.[i] ?? ''} onChange={(e) => setAns(subj, q, e.target.value)}
                inputMode="numeric" maxLength={short ? 3 : 2} aria-label={t('sheet.qLabel', { q })}
                className="ui-field w-full mt-1 py-2 text-center tabular-nums"
              />
            </label>
          )
        })}
      </div>
      <p className="text-xs text-muted">{t('sheet.countNote')}</p>

      {mounted && createPortal(<PrintSheet sheet={sheet} />, document.body)}
    </div>
  )
}

/** 인쇄 전용: body 바로 아래 포털 → 인쇄 시 나머지 페이지는 숨김, 흰 종이·검은 글씨 */
function PrintSheet({ sheet }: { sheet: Sheet }) {
  const t = useTranslations(NS)
  return (
    <div id="csat-print" className="hidden print:block" style={{ color: '#000', background: '#fff', fontSize: 11 }}>
      <style>{'@media print{body>*:not(#csat-print){display:none!important}html,body{background:#fff!important}@page{margin:12mm}}'}</style>
      <h1 style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>{t('sheet.printTitle')}</h1>
      <p style={{ marginBottom: 12 }}>{t('sheet.printName')} ________________ &nbsp; {t('sheet.countNote')}</p>
      {SHEET.map((s) => (
        <section key={s.key} style={{ breakInside: 'avoid', marginBottom: 12 }}>
          <p style={{ fontWeight: 700, marginBottom: 4 }}>
            {t(`sheet.subjects.${s.key}`)}{s.select ? ` (${t('sheet.selectLabel')}: ${sheet.s[s.key] || '________'})` : ''}
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(10, 1fr)', borderTop: '1px solid #000', borderLeft: '1px solid #000' }}>
            {Array.from({ length: s.count }, (_, i) => (
              <div key={i} style={{ display: 'flex', borderRight: '1px solid #000', borderBottom: '1px solid #000', height: 24 }}>
                <span style={{ width: '45%', borderRight: '1px solid #000', textAlign: 'center', lineHeight: '24px', fontWeight: isShortAnswer(s.key, i + 1) ? 700 : 400 }}>
                  {i + 1}{isShortAnswer(s.key, i + 1) ? '*' : ''}
                </span>
                <span style={{ flex: 1, textAlign: 'center', lineHeight: '24px' }}>{sheet.a[s.key]?.[i] ?? ''}</span>
              </div>
            ))}
          </div>
        </section>
      ))}
      <p>{t('sheet.printFoot')}</p>
    </div>
  )
}

function Timeline() {
  const t = useTranslations(NS)
  const fmt = useDateFmt()
  const now = useNow(60_000)
  const today = now == null ? null : kstParts(now).date
  const when = (x: TimelineItem) =>
    x.approx ? t('timeline.lateFeb') : x.until ? t('timeline.until', { date: fmt(x.start) }) : x.end ? `${fmt(x.start)} ~ ${fmt(x.end)}` : fmt(x.start)

  return (
    <div id="csat-timeline" className="ui-card p-6 space-y-4 scroll-mt-20">
      <div>
        <h2 className="text-lg font-semibold text-fg">{t('timeline.title')}</h2>
        <p className="text-sm text-muted mt-1">{t('timeline.desc')}</p>
      </div>
      <ol className="space-y-1">
        {TIMELINE.map((x) => {
          const status = today ? timelineStatus(x, today) : 'future'
          const tag = !today || x.approx ? '' : status === 'past' ? t('timeline.past') : status === 'now' ? t('timeline.ongoing') : ddayText(daysUntil(today, x.start))
          return (
            <li key={x.key} className={`flex items-center justify-between gap-3 rounded-xl px-3 py-2.5 ${status === 'now' ? 'bg-primary-soft' : ''} ${status === 'past' ? 'opacity-50' : ''}`}>
              <div className="min-w-0">
                <p className={`text-sm font-semibold ${status === 'now' ? 'text-primary' : 'text-fg'}`}>{t(`timeline.items.${x.key}`)}</p>
                <p className="text-xs text-muted tabular-nums break-words">{when(x)}</p>
              </div>
              {tag && <span className={`shrink-0 text-sm font-semibold tabular-nums ${status === 'now' ? 'text-primary' : 'text-sub'}`}>{tag}</span>}
            </li>
          )
        })}
      </ol>
      <p className="text-xs text-muted">{t('timeline.note')}</p>
      <div className="flex flex-wrap gap-2">
        <Link href="/csat-grade/" className="ui-btn-soft px-4 py-2 text-sm">{t('timeline.linkGrade')}</Link>
        <Link href="/dday-calculator/" className="ui-btn-soft px-4 py-2 text-sm">{t('timeline.linkDday')}</Link>
        <AddToCalendar file="csat-2027-schedule.ics" events={TIMELINE.filter((x) => !x.approx && (!today || (x.end ?? x.start) >= today)).map((x) => ({
          uid: `csat-${x.key}-${x.start}`, date: x.start, end: x.end, alarmDays: 1,
          title: x.until ? `${t(`timeline.items.${x.key}`)} (${when(x)})` : t(`timeline.items.${x.key}`),
          description: 'https://toolhub.ai.kr/csat-dday/',
        }))} />
      </div>
    </div>
  )
}

function Guide() {
  const t = useTranslations(NS)
  const faq = t.raw('guide.faq.items') as { q: string; a: string }[]
  const sources = t.raw('guide.sources.items') as { label: string; url: string }[]
  const list = (k: string) => (
    <section>
      <h3 className="font-semibold text-fg mb-2">{t(`guide.${k}.title`)}</h3>
      <ul className="list-disc pl-5 space-y-1 text-sm text-body">
        {(t.raw(`guide.${k}.items`) as string[]).map((x) => <li key={x}>{x}</li>)}
      </ul>
    </section>
  )

  return (
    <div className="ui-card p-6 space-y-6">
      <h2 className="text-xl font-semibold text-fg">{t('guide.title')}</h2>
      <section>
        <h3 className="font-semibold text-fg mb-2">{t('guide.whatIs.title')}</h3>
        <p className="text-sm text-body leading-relaxed">{t('guide.whatIs.desc')}</p>
      </section>
      {list('dayBefore')}
      {list('examDay')}
      {list('tips')}
      <section>
        <h3 className="font-semibold text-fg mb-2">{t('guide.faq.title')}</h3>
        <div className="space-y-3">
          {faq.map((f) => (
            <div key={f.q} className="rounded-2xl bg-subtle p-4">
              <p className="text-sm font-semibold text-fg">{f.q}</p>
              <p className="text-sm text-sub mt-1 leading-relaxed">{f.a}</p>
            </div>
          ))}
        </div>
      </section>
      <section>
        <h3 className="font-semibold text-fg mb-2">{t('guide.sources.title')}</h3>
        <ul className="space-y-1 text-sm">
          {sources.map((s) => (
            <li key={s.url}>
              <a href={s.url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline inline-flex items-center gap-1 break-all">
                {s.label} <ExternalLink className="w-3.5 h-3.5 shrink-0" />
              </a>
            </li>
          ))}
        </ul>
        <p className="text-xs text-muted mt-2">{t('guide.sources.note')}</p>
      </section>
    </div>
  )
}
