'use client'

import { useMemo, useState } from 'react'
import { createPortal, flushSync } from 'react-dom'
import Link from 'next/link'
import { useTranslations } from '@/lib/i18n'
import '@/lib/i18n/ns/yearCalendar'
import '@/lib/i18n/ns/holidayPlanner'
import AddToCalendar from '@/components/AddToCalendar'
import { useHydrated } from '@/hooks/useHydrated'
import { useSearchParams } from '@/hooks/useSearchParams'
import { todayKST } from '@/utils/dday'
import { getKoreanHolidays, type KoreanHoliday } from '@/utils/koreanHolidays'
import { buildYear, customDays, dayOfWeek, holidaySummary, longWeekends, lunarOf, solarTerms, type CalDay, type CalMonth } from '@/utils/yearCalendar'

type Mode = 'year' | 'months'
const num = (date: string) => ({ m: Number(date.slice(5, 7)), d: Number(date.slice(8)) })

/** 정적 HTML = 연간 요약·1월(또는 ?m=)·표·가이드. 오늘 표시·현재 달 이동은 마운트 후 */
export default function YearCalendar({ year }: { year: number }) {
  const t = useTranslations('yearCalendar')
  const th = useTranslations('holidayPlanner')
  const hydrated = useHydrated()
  const sp = useSearchParams()
  const W = t.raw('weekdays') as string[]

  const months = useMemo(() => buildYear(year), [year])
  const hol = useMemo(() => getKoreanHolidays(year), [year])
  const terms = useMemo(() => solarTerms(year), [year])
  const custom = useMemo(() => customDays(year), [year])
  const breaks = useMemo(() => longWeekends(year), [year])
  const sum = useMemo(() => holidaySummary(year), [year])

  const today = hydrated ? todayKST() : ''
  const urlMonth = hydrated ? Number(sp.get('m')) : 0
  const [picked, setPicked] = useState<number | null>(null)
  const month = picked ?? (urlMonth >= 1 && urlMonth <= 12 ? urlMonth : today.startsWith(`${year}-`) ? num(today).m : 1)
  const [printMode, setPrintMode] = useState<Mode | null>(null)

  const holName = (h: KoreanHoliday) => {
    if (h.nameKey !== 'substituteHoliday') return th(`holiday.${h.nameKey}`)
    const parent = hol.find(x => x.nameKey !== 'substituteHoliday' && h.name.includes(`(${x.name})`))
    return parent ? t('substitute', { name: th(`holiday.${parent.nameKey}`) }) : th('holiday.substituteHoliday')
  }
  const mdw = (date: string) => t('mdw', { ...num(date), w: W[dayOfWeek(date)] })
  const lunar = (date: string, full = false) => {
    const l = lunarOf(date)
    if (!l) return ''
    return full ? t(l.leap ? 'lunarFullLeap' : 'lunarFull', { m: l.month, d: l.day }) : t(l.leap ? 'lunarLeap' : 'lunar', { m: l.month, d: l.day })
  }
  const tone = (d: CalDay) => (d.holidays.length || d.dow === 0 ? 'text-red-500' : d.dow === 6 ? 'text-primary' : 'text-body')
  const choose = (m: number) => { setPicked(m); history.replaceState(history.state, '', m === 1 ? window.location.pathname : `?m=${m}`) }
  const print = (mode: Mode) => { flushSync(() => setPrintMode(mode)); window.print() }

  const longest = breaks.reduce<(typeof breaks)[number] | null>((a, b) => (!a || b.days > a.days ? b : a), null)
  const rangeOf = (s: string, e: string) => t('range', { from: mdw(s), to: mdw(e) })
  const cur = months[month - 1]
  const monthEvents = [
    ...hol.filter(h => num(h.date).m === month).map(h => ({ date: h.date, label: holName(h), kind: 'hol' as const })),
    ...terms.filter(x => num(x.date).m === month).map(x => ({ date: x.date, label: `${t(`terms.${x.key}`)} ${x.time}`, kind: 'term' as const })),
    ...custom.filter(x => num(x.date).m === month).map(x => ({ date: x.date, label: t(`custom.${x.key}`), kind: 'custom' as const })),
  ].sort((a, b) => a.date.localeCompare(b.date))
  const faq = t.raw('guide.faq.items') as { q: string; a: string }[]
  const sources = t.raw('guide.sources.items') as { label: string; url: string }[]
  const icsEvents = hol.map(h => ({ uid: `kr-holiday-${h.date}-${h.nameKey}`, date: h.date, title: holName(h), description: t('ics.note', { year, url: `https://toolhub.ai.kr/calendar-${year}/` }) }))

  const stat = (label: string, value: string, note: string) => (
    <div className="bg-subtle rounded-2xl p-4">
      <p className="text-xs text-sub">{label}</p>
      <p className="text-3xl font-bold text-fg tabular-nums mt-1">{value}</p>
      <p className="text-xs text-muted mt-1">{note}</p>
    </div>
  )

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-fg">{t('title', { year })}</h1>
        <p className="text-sm text-muted mt-1">{t('subtitle')}</p>
      </div>

      <div className="ui-card p-6 space-y-5">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {stat(t('summary.holidays'), t('summary.days', { n: sum.total }), t('summary.holidaysNote', { sub: sum.substitute }))}
          {stat(t('summary.weekday'), t('summary.days', { n: sum.weekday }), t('summary.weekdayNote', { n: sum.weekend }))}
          {stat(t('summary.offDays'), t('summary.days', { n: sum.offDays }), t('summary.offDaysNote', { w: sum.weekends, h: sum.weekday }))}
          {stat(t('summary.longWeekends'), t('summary.times', { n: breaks.length }), longest ? t('summary.longWeekendsNote', { days: longest.days, range: rangeOf(longest.start, longest.end) }) : '')}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={() => print('year')} className="ui-btn px-4 py-3 text-sm min-h-[44px]">{t('actions.printYear')}</button>
          <button type="button" onClick={() => print('months')} className="ui-btn-soft px-4 py-3 text-sm min-h-[44px]">{t('actions.printMonths')}</button>
          <AddToCalendar events={icsEvents} file={`holidays-${year}.ics`} />
          <Link href="/holiday-planner/" className="inline-flex items-center min-h-[44px] px-2 text-sm text-primary hover:underline">{t('actions.planner')}</Link>
        </div>
      </div>

      <section className="ui-card p-6 space-y-4" aria-labelledby="cal-overview">
        <div>
          <h2 id="cal-overview" className="text-xl font-semibold text-fg">{t('overview.title', { year })}</h2>
          <p className="text-xs text-muted mt-1">{t('overview.hint')}</p>
        </div>
        <Legend t={t} />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-6 gap-y-4">
          {months.map(mo => (
            <div key={mo.month}>
              <button type="button" aria-pressed={mo.month === month} onClick={() => { choose(mo.month); document.getElementById('calendar-month')?.scrollIntoView({ behavior: 'smooth', block: 'start' }) }}
                className={`min-h-[44px] px-2 -ml-2 rounded-lg font-semibold ${mo.month === month ? 'text-primary' : 'text-fg hover:text-primary'}`}>
                {t('monthName', { m: mo.month })}
              </button>
              <table className="w-full table-fixed text-center text-xs tabular-nums">
                <thead><tr>{W.map((w, i) => <th key={w} scope="col" className={`pb-1 font-medium ${i === 0 ? 'text-red-500' : i === 6 ? 'text-primary' : 'text-muted'}`}>{w}</th>)}</tr></thead>
                <tbody>
                  {mo.weeks.map((wk, i) => (
                    <tr key={i}>
                      {wk.map((d, j) => (
                        <td key={j} className="py-0.5">
                          {d && (
                            <span title={d.holidays.map(holName).join('·') || undefined}
                              className={`inline-grid place-items-center w-7 h-7 rounded-full ${tone(d)} ${d.holidays.length ? 'font-bold' : ''} ${d.date === today ? 'ring-2 ring-primary' : ''}`}>
                              {d.d}{d.holidays.length > 0 && <span className="sr-only"> {d.holidays.map(holName).join(', ')}</span>}
                            </span>
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      </section>

      <section id="calendar-month" className="ui-card p-4 sm:p-6 space-y-4 scroll-mt-20" aria-labelledby="cal-month">
        <div className="flex items-center justify-between gap-2">
          <h2 id="cal-month" className="text-xl font-semibold text-fg">{t('monthTitle', { year, m: month })}</h2>
          <div className="flex gap-1">
            <button type="button" aria-label={t('month.prev')} disabled={month === 1} onClick={() => choose(month - 1)} className="w-11 h-11 rounded-xl bg-soft text-body hover:bg-subtle disabled:opacity-40">‹</button>
            <button type="button" aria-label={t('month.next')} disabled={month === 12} onClick={() => choose(month + 1)} className="w-11 h-11 rounded-xl bg-soft text-body hover:bg-subtle disabled:opacity-40">›</button>
          </div>
        </div>
        <div className="grid grid-cols-6 sm:flex sm:flex-wrap gap-1.5" role="group" aria-label={t('month.title')}>
          {months.map(mo => (
            <button key={mo.month} type="button" aria-pressed={mo.month === month} onClick={() => choose(mo.month)}
              className={`min-h-[44px] sm:min-w-[44px] px-1 sm:px-2.5 rounded-xl text-sm font-medium tabular-nums ${mo.month === month ? 'bg-primary text-white' : 'bg-soft text-body hover:bg-subtle'}`}>
              {t('monthName', { m: mo.month })}
            </button>
          ))}
        </div>
        <table className="w-full table-fixed border-collapse">
          <thead><tr>{W.map((w, i) => <th key={w} scope="col" className={`pb-2 text-xs font-medium ${i === 0 ? 'text-red-500' : i === 6 ? 'text-primary' : 'text-muted'}`}>{w}</th>)}</tr></thead>
          <tbody>
            {cur.weeks.map((wk, i) => (
              <tr key={i}>
                {wk.map((d, j) => (
                  <td key={j} className={`align-top border border-line h-20 sm:h-24 p-1 sm:p-1.5 ${d?.date === today ? 'bg-primary-soft' : ''}`}>
                    {d && (
                      <div className="space-y-0.5 text-left">
                        <p className={`text-sm sm:text-base font-semibold tabular-nums ${tone(d)}`}>{d.d}</p>
                        <p className="text-[10px] sm:text-xs text-faint tabular-nums">{lunar(d.date)}</p>
                        {d.holidays.map(h => <p key={h.nameKey + h.date} className="text-[10px] sm:text-xs leading-tight text-red-500 break-keep line-clamp-2">{holName(h)}</p>)}
                        {d.term && <p className="text-[10px] sm:text-xs leading-tight text-primary break-keep">{t(`terms.${d.term.key}`)}</p>}
                        {d.custom.map(c => <p key={c} className="text-[10px] sm:text-xs leading-tight text-sub break-keep">{t(`custom.${c}`)}</p>)}
                      </div>
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        <p className="text-xs text-muted">{t('month.lunarHint')}</p>
        <div>
          <h3 className="font-semibold text-fg mb-2">{t('month.events', { m: month })}</h3>
          {monthEvents.length ? (
            <ul className="divide-y divide-line border-y border-line text-sm">
              {monthEvents.map(e => (
                <li key={e.date + e.label} className="flex justify-between gap-4 py-2">
                  <span className="text-sub tabular-nums">{mdw(e.date)}</span>
                  <span className={e.kind === 'hol' ? 'text-red-500 font-medium' : e.kind === 'term' ? 'text-primary' : 'text-body'}>{e.label}</span>
                </li>
              ))}
            </ul>
          ) : <p className="text-sm text-sub">{t('month.none')}</p>}
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <section className="ui-card p-6 space-y-3" aria-labelledby="cal-holidays">
          <h2 id="cal-holidays" className="text-xl font-semibold text-fg">{t('tables.holidays.title', { year })}</h2>
          <table className="w-full text-sm">
            <thead><tr className="text-left text-muted"><th scope="col" className="py-2 font-medium">{t('tables.holidays.date')}</th><th scope="col" className="py-2 font-medium">{t('tables.holidays.name')}</th></tr></thead>
            <tbody className="divide-y divide-line">
              {hol.map(h => (
                <tr key={h.date + h.nameKey}>
                  <td className="py-2 tabular-nums text-body">{mdw(h.date)}</td>
                  <td className="py-2 text-fg">{holName(h)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <div className="space-y-8">
          <section className="ui-card p-6 space-y-3" aria-labelledby="cal-long">
            <h2 id="cal-long" className="text-xl font-semibold text-fg">{t('tables.long.title', { year })}</h2>
            <table className="w-full text-sm">
              <thead><tr className="text-left text-muted"><th scope="col" className="py-2 font-medium">{t('tables.long.range')}</th><th scope="col" className="py-2 font-medium">{t('tables.long.days')}</th><th scope="col" className="py-2 font-medium hidden sm:table-cell">{t('tables.long.includes')}</th></tr></thead>
              <tbody className="divide-y divide-line">
                {breaks.map(b => (
                  <tr key={b.start}>
                    <td className="py-2 tabular-nums text-body">{rangeOf(b.start, b.end)}</td>
                    <td className="py-2 tabular-nums text-fg font-medium">{t('summary.days', { n: b.days })}</td>
                    <td className="py-2 text-sub hidden sm:table-cell">{[...new Set(b.holidays.map(holName))].join('·')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          <section className="ui-card p-6 space-y-3" aria-labelledby="cal-custom">
            <h2 id="cal-custom" className="text-xl font-semibold text-fg">{t('tables.custom.title', { year })}</h2>
            <table className="w-full text-sm">
              <thead><tr className="text-left text-muted"><th scope="col" className="py-2 font-medium">{t('tables.custom.name')}</th><th scope="col" className="py-2 font-medium">{t('tables.custom.date')}</th><th scope="col" className="py-2 font-medium">{t('tables.custom.lunar')}</th></tr></thead>
              <tbody className="divide-y divide-line">
                {custom.map(c => (
                  <tr key={c.key}><td className="py-2 text-fg">{t(`custom.${c.key}`)}</td><td className="py-2 tabular-nums text-body">{mdw(c.date)}</td><td className="py-2 tabular-nums text-sub">{lunar(c.date, true)}</td></tr>
                ))}
              </tbody>
            </table>
          </section>
        </div>
      </div>

      <section className="ui-card p-6 space-y-3" aria-labelledby="cal-terms">
        <h2 id="cal-terms" className="text-xl font-semibold text-fg">{t('tables.terms.title', { year })}</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
          {[terms.slice(0, 12), terms.slice(12)].map((half, i) => (
            <table key={i} className="w-full text-sm">
              <thead><tr className="text-left text-muted"><th scope="col" className="py-2 font-medium">{t('tables.terms.name')}</th><th scope="col" className="py-2 font-medium">{t('tables.terms.date')}</th><th scope="col" className="py-2 font-medium">{t('tables.terms.time')}</th></tr></thead>
              <tbody className="divide-y divide-line">
                {half.map(x => <tr key={x.key}><td className="py-2 text-fg">{t(`terms.${x.key}`)}</td><td className="py-2 tabular-nums text-body">{mdw(x.date)}</td><td className="py-2 tabular-nums text-sub">{x.time}</td></tr>)}
              </tbody>
            </table>
          ))}
        </div>
      </section>

      <div className="ui-card p-6 space-y-6">
        <h2 className="text-xl font-semibold text-fg">{t('guide.title', { year })}</h2>
        <div>
          <h3 className="font-semibold text-fg mb-3">{t('guide.howTo.title')}</h3>
          <ul className="list-disc pl-5 space-y-2 text-sm text-sub">{(t.raw('guide.howTo.items') as string[]).map((s, i) => <li key={i}>{s}</li>)}</ul>
        </div>
        <div>
          <h3 className="font-semibold text-fg mb-3">{t('guide.faq.title')}</h3>
          <div className="divide-y divide-line border-y border-line">
            {faq.map(f => (
              <details key={f.q} className="py-3">
                <summary className="cursor-pointer text-sm font-medium text-body min-h-[24px]">{f.q}</summary>
                <p className="text-sm text-sub mt-2 leading-relaxed">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
        <div className="bg-subtle rounded-2xl p-5 text-sm text-sub space-y-2">
          <p className="font-medium text-body">{t('guide.sources.title')}</p>
          <ul className="space-y-1">{sources.map(s => <li key={s.url}><a href={s.url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">{s.label}</a></li>)}</ul>
          <p className="text-xs text-muted">{t('guide.sources.asOf')}</p>
        </div>
      </div>

      {hydrated && printMode && createPortal(
        <PrintSheet year={year} mode={printMode} months={months} W={W} holName={holName} lunar={lunar} t={t} />, document.body,
      )}
    </div>
  )
}

function Legend({ t }: { t: ReturnType<typeof useTranslations> }) {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-sub">
      <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-red-500" aria-hidden />{t('legend.holiday')}</span>
      <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-primary" aria-hidden />{t('legend.saturday')}</span>
      <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full ring-2 ring-primary" aria-hidden />{t('legend.today')}</span>
    </div>
  )
}

/** 인쇄 전용: body 바로 아래 포털, 흰 종이·검은 글씨. 연간 = A4 가로 1장, 월별 = 달마다 1장 */
function PrintSheet({ year, mode, months, W, holName, lunar, t }: {
  year: number; mode: Mode; months: CalMonth[]; W: string[]
  holName: (h: KoreanHoliday) => string; lunar: (date: string) => string; t: ReturnType<typeof useTranslations>
}) {
  const color = (d: CalDay) => (d.holidays.length || d.dow === 0 ? '#d32f2f' : d.dow === 6 ? '#1d4ed8' : '#111')
  const head = (size: number) => (
    <thead><tr>{W.map((w, i) => <th key={w} style={{ fontSize: size, fontWeight: 600, padding: 2, color: i === 0 ? '#d32f2f' : i === 6 ? '#1d4ed8' : '#555' }}>{w}</th>)}</tr></thead>
  )
  return (
    <div id="calendar-print" className="hidden print:block" style={{ color: '#111', background: '#fff', fontFamily: 'inherit' }}>
      <style>{'@media print{body>*:not(#calendar-print){display:none!important}html,body{background:#fff!important}@page{size:A4 landscape;margin:8mm}}'}</style>
      {mode === 'year' ? (
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, margin: '0 0 6px' }}>{t('title', { year })}</h1>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px 14px' }}>
            {months.map(mo => (
              <div key={mo.month}>
                <p style={{ fontSize: 12, fontWeight: 700, margin: '0 0 2px' }}>{t('monthName', { m: mo.month })}</p>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'center', fontSize: 10 }}>
                  {head(8)}
                  <tbody>{mo.weeks.map((wk, i) => <tr key={i}>{wk.map((d, j) => <td key={j} style={{ padding: '1px 0', color: d ? color(d) : undefined, fontWeight: d?.holidays.length ? 700 : 400 }}>{d?.d ?? ''}</td>)}</tr>)}</tbody>
                </table>
                <p style={{ fontSize: 7.5, color: '#444', margin: '2px 0 0', lineHeight: 1.3 }}>
                  {mo.weeks.flat().filter((d): d is CalDay => !!d && d.holidays.length > 0).map(d => `${d.d} ${d.holidays.map(holName).join('·')}`).join(' · ')}
                </p>
              </div>
            ))}
          </div>
          <p style={{ fontSize: 8, color: '#666', marginTop: 6 }}>{t('print.foot', { year })}</p>
        </div>
      ) : (
        months.map((mo, k) => (
          <div key={mo.month} style={{ breakAfter: k < 11 ? 'page' : 'auto' }}>
            <h1 style={{ fontSize: 22, fontWeight: 700, margin: '0 0 6px' }}>{t('monthTitle', { year, m: mo.month })}</h1>
            <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
              {head(11)}
              <tbody>
                {mo.weeks.map((wk, i) => (
                  <tr key={i}>
                    {wk.map((d, j) => (
                      <td key={j} style={{ border: '1px solid #bbb', verticalAlign: 'top', padding: 4, height: mo.weeks.length > 5 ? 82 : 98 }}>
                        {d && <>
                          <div style={{ fontSize: 15, fontWeight: 700, color: color(d) }}>{d.d}</div>
                          <div style={{ fontSize: 8.5, color: '#777' }}>{lunar(d.date)}</div>
                          {d.holidays.map(h => <div key={h.nameKey + h.date} style={{ fontSize: 9, color: '#d32f2f' }}>{holName(h)}</div>)}
                          {d.term && <div style={{ fontSize: 9, color: '#1d4ed8' }}>{t(`terms.${d.term.key}`)}</div>}
                          {d.custom.map(c => <div key={c} style={{ fontSize: 9, color: '#444' }}>{t(`custom.${c}`)}</div>)}
                        </>}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            <p style={{ fontSize: 8, color: '#666', marginTop: 4 }}>{t('print.foot', { year })}</p>
          </div>
        ))
      )}
    </div>
  )
}
