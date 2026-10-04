'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { CalendarPlus, Minus, Plus } from 'lucide-react'
import { useTranslations } from '@/lib/i18n'
import { useSearchParams } from '@/hooks/useSearchParams'
import ShareResult from '@/components/ShareResult'
import { plan as makePlan, toIcs, MAX_LEAVE, type Break, type Day, type Mode } from '@/utils/holidayPlanner'

const MODES: Mode[] = ['total', 'long']
const STATS = ['redDays', 'offDays', 'weekdayHolidays', 'onWeekend', 'substitutes', 'longWeekends'] as const
// 설·추석 앞뒤 연휴는 이름 하나로 묶어 표시
const LABEL_KEY: Record<string, string> = { seollalEve: 'seollal', seollalAfter: 'seollal', chuseokEve: 'chuseok', chuseokAfter: 'chuseok' }
const parts = (s: string) => {
  const [y, m, d] = s.split('-').map(Number)
  return { y, m, d, w: new Date(Date.UTC(y, m - 1, d)).getUTCDay() }
}

export default function HolidayPlanner() {
  const t = useTranslations('holidayPlanner')
  const sp = useSearchParams()
  // ponytail: 기본 연도는 렌더 시점 날짜 기준. 빌드일과 방문일이 10월 1일·1월 1일을 사이에 두면 hydration 경고 1건(클라이언트 값으로 복구)
  const now = new Date()
  const thisYear = now.getFullYear()
  const years = [thisYear, thisYear + 1]

  const [year, setYear] = useState(() => {
    const y = Number(sp.get('y'))
    return years.includes(y) ? y : now.getMonth() >= 9 ? thisYear + 1 : thisYear
  })
  const [k, setK] = useState(() => {
    const n = Math.floor(Number(sp.get('k')))
    return n >= 1 && n <= MAX_LEAVE ? n : 5
  })
  const [mode, setMode] = useState<Mode>(() => (sp.get('m') === 'long' ? 'long' : 'total'))
  const [skipPast, setSkipPast] = useState(() => sp.get('p') !== '0')
  const [today, setToday] = useState<string | null>(null) // 클라이언트에서만 (정적 HTML은 지난 날짜 제외 없이)
  useEffect(() => setToday(new Date().toLocaleDateString('sv-SE')), [])

  useEffect(() => {
    const q = new URLSearchParams({ y: String(year), k: String(k) })
    if (mode === 'long') q.set('m', 'long')
    if (!skipPast) q.set('p', '0')
    window.history.replaceState(null, '', `?${q}`)
  }, [year, k, mode, skipPast])

  const from = year === thisYear && skipPast && today ? today : ''
  const p = useMemo(() => makePlan(year, k, mode, from), [year, k, mode, from])

  const weekdays = t.raw('fmt.weekdays') as string[]
  const months = t.raw('fmt.months') as string[]
  const fmt = (s: string) => {
    const { y, m, d, w } = parts(s)
    return t(y === year ? 'fmt.date' : 'fmt.dateY', { y, m, d, mon: months[m - 1], w: weekdays[w] })
  }
  const short = (s: string) => { const { m, d, w } = parts(s); return t('fmt.short', { m, d, w: weekdays[w] }) }
  const span = (b: Break) => `${fmt(b.start)} ~ ${fmt(b.end)}`
  const holName = (key: string) => t(`holiday.${LABEL_KEY[key] ?? key}`)
  const label = (b: Break) => {
    const names = [...new Set(b.holidays.filter((h) => h.nameKey !== 'substituteHoliday').map((h) => holName(h.nameKey)))]
    return names.length ? names.join('·') : t('plan.weekend')
  }
  const longest = Math.max(0, ...p.breaks.map((b) => b.days))
  const ratio = p.leaveUsed ? (p.totalDays / p.leaveUsed).toFixed(1) : '0'

  const leaveSet = useMemo(() => new Set(p.breaks.flatMap((b) => b.leave)), [p])
  const breakSet = useMemo(() => new Set(p.days.filter((d) => p.breaks.some((b) => d.date >= b.start && d.date <= b.end)).map((d) => d.date)), [p])
  const yearDays = p.days.filter((d) => d.inYear)
  const holidayDays = yearDays.filter((d) => d.holidays.length)

  const describe = (d: Day) => {
    const s: string[] = []
    if (leaveSet.has(d.date)) s.push(t('cal.leave'))
    if (d.holidays.length) s.push(d.holidays.map((h) => t(`holiday.${h.nameKey}`)).join('·'))
    else if (d.dow % 6 === 0) s.push(t('cal.weekend'))
    if (breakSet.has(d.date) && !leaveSet.has(d.date)) s.push(t('cal.inBreak'))
    if (!s.length) s.push(t('cal.workday'))
    return `${fmt(d.date)}: ${s.join(', ')}`
  }

  const downloadIcs = () => {
    const events = p.breaks.flatMap((b) => b.leave.map((date) => ({
      date,
      summary: t('ics.summary', { label: label(b), days: b.days }),
      description: t('ics.desc', { range: span(b), url: 'https://toolhub.ai.kr/holiday-planner/' }),
    })))
    const blob = new Blob([toIcs(events, Date.now(), t('ics.calName', { year }))], { type: 'text/calendar;charset=utf-8' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `holiday-plan-${year}.ics`
    a.click()
    setTimeout(() => URL.revokeObjectURL(a.href), 1000)
  }

  const seg = (on: boolean) =>
    `min-h-11 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${on ? 'bg-primary text-white' : 'bg-soft text-body hover:bg-subtle'}`
  const faq = t.raw('guide.faq.items') as { q: string; a: string }[]
  const sources = t.raw('guide.sources.items') as { label: string; url: string }[]

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-fg">{t('title')}</h1>
        <p className="text-sm text-muted mt-1">{t('subtitle')}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* 입력 */}
        <div className="lg:col-span-1">
          <div className="ui-card p-6 space-y-6">
            <div role="group" aria-labelledby="hp-year">
              <p id="hp-year" className="text-sm font-medium text-body mb-2">{t('u.year')}</p>
              <div className="grid grid-cols-2 gap-2">
                {years.map((y) => (
                  <button key={y} onClick={() => setYear(y)} className={seg(year === y)} aria-pressed={year === y}>{t('u.yearOpt', { y })}</button>
                ))}
              </div>
            </div>

            <div>
              <div className="flex items-baseline justify-between mb-2">
                <label htmlFor="hp-leave" className="text-sm font-medium text-body">{t('u.leave')}</label>
                <span className="text-lg font-bold text-fg tabular-nums">{t('u.leaveValue', { n: k })}</span>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => setK((n) => Math.max(1, n - 1))} disabled={k <= 1} aria-label={t('u.less')} className="w-11 h-11 shrink-0 rounded-xl bg-soft text-body hover:bg-subtle disabled:opacity-40 flex items-center justify-center">
                  <Minus className="w-4 h-4" aria-hidden="true" />
                </button>
                <input
                  id="hp-leave" type="range" min={1} max={MAX_LEAVE} step={1} value={k}
                  onChange={(e) => setK(Number(e.target.value))}
                  aria-valuetext={t('u.leaveValue', { n: k })}
                  className="w-full h-11 accent-primary cursor-pointer"
                />
                <button onClick={() => setK((n) => Math.min(MAX_LEAVE, n + 1))} disabled={k >= MAX_LEAVE} aria-label={t('u.more')} className="w-11 h-11 shrink-0 rounded-xl bg-soft text-body hover:bg-subtle disabled:opacity-40 flex items-center justify-center">
                  <Plus className="w-4 h-4" aria-hidden="true" />
                </button>
              </div>
              <p className="text-xs text-muted mt-1.5">{t('u.leaveHint')}</p>
            </div>

            <div role="group" aria-labelledby="hp-mode">
              <p id="hp-mode" className="text-sm font-medium text-body mb-2">{t('u.mode')}</p>
              <div className="grid grid-cols-2 gap-2">
                {MODES.map((m) => (
                  <button key={m} onClick={() => setMode(m)} className={seg(mode === m)} aria-pressed={mode === m}>{t(`u.modes.${m}`)}</button>
                ))}
              </div>
              <p className="text-xs text-muted mt-1.5">{t(`u.modeHint.${mode}`)}</p>
            </div>

            {year === thisYear && (
              <label className="flex items-center gap-3 min-h-11 cursor-pointer text-sm text-body">
                <input type="checkbox" checked={skipPast} onChange={(e) => setSkipPast(e.target.checked)} className="w-5 h-5 accent-primary" />
                {t('u.skipPast')}
              </label>
            )}

            <p className="text-xs text-muted bg-subtle rounded-xl p-3">{t('u.workType')}</p>
          </div>
        </div>

        {/* 결과 */}
        <div className="lg:col-span-2 space-y-6">
          <div className="ui-card p-6 space-y-5">
            <div aria-live="polite">
              <p className="text-sm text-muted">{t('summary.label', { year, k: p.leaveUsed })}</p>
              <p className="text-3xl font-bold text-fg tabular-nums mt-1">{t('summary.headline', { n: p.totalDays })}</p>
              <p className="text-sm text-sub mt-1">
                {p.breaks.length ? t('summary.sub', { count: p.breaks.length, longest, ratio }) : t('summary.empty')}
              </p>
              {p.breaks.length > 0 && p.leaveUsed < k && <p className="text-xs text-muted mt-1">{t('summary.unused', { n: k - p.leaveUsed })}</p>}
            </div>

            {p.breaks.length > 0 && (
              <ol className="divide-y divide-line border-y border-line">
                {p.breaks.map((b) => (
                  <li key={b.start} className="py-3 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-fg">{label(b)}</p>
                      <p className="text-sm text-body">{span(b)}</p>
                      <p className="text-xs text-muted mt-0.5">{t('plan.leaveDays', { list: b.leave.map(short).join(', ') })}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-lg font-bold text-primary tabular-nums">{t('plan.days', { n: b.days })}</p>
                      <p className="text-xs text-muted">{t('plan.leaveN', { n: b.leave.length })}</p>
                    </div>
                  </li>
                ))}
              </ol>
            )}
            <p className="text-xs text-faint">{t('summary.note')}</p>

            <div className="flex flex-wrap gap-2">
              <button onClick={downloadIcs} disabled={!p.breaks.length} className="ui-btn-soft min-h-11 px-4 py-2.5 text-sm disabled:opacity-40">
                <CalendarPlus className="w-4 h-4" aria-hidden="true" /> {t('ics.button')}
              </button>
            </div>
            <ShareResult
              card={{
                tool: t('title'),
                label: t('share.label', { year, k: p.leaveUsed }),
                headline: t('summary.headline', { n: p.totalDays }),
                sub: t('share.sub', { count: p.breaks.length, longest }),
                rows: p.breaks.slice(0, 5).map((b) => ({ label: `${label(b)} ${short(b.start)}~${short(b.end)}`, value: t('share.row', { days: b.days, leave: b.leave.length }) })),
              }}
              text={t('share.text', { year, k: p.leaveUsed, n: p.totalDays })}
            />
          </div>

          {/* 추천 */}
          <div className="ui-card p-6 space-y-4">
            <div>
              <h2 className="text-lg font-semibold text-fg">{t('recs.title', { year })}</h2>
              <p className="text-sm text-muted mt-1">{t('recs.desc')}</p>
            </div>
            {p.recs.length ? (
              <ol className="space-y-3">
                {p.recs.slice(0, 8).map((r, i) => {
                  const inPlan = p.breaks.some((b) => b.start <= r.start && b.end >= r.end)
                  return (
                    <li key={r.start} className="bg-subtle rounded-2xl p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-fg">
                            {i + 1}. {label(r)}
                            {inPlan && <span className="ml-2 align-middle text-xs font-medium bg-primary-soft text-primary rounded-md px-1.5 py-0.5">{t('recs.inPlan')}</span>}
                          </p>
                          <p className="text-sm text-body">{span(r)}</p>
                          <p className="text-xs text-muted mt-0.5">{t('plan.leaveDays', { list: r.leave.map(short).join(', ') })}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-base font-bold text-fg tabular-nums">{t('recs.deal', { leave: r.leave.length, days: r.days })}</p>
                          <p className="text-xs text-muted">{t('recs.ratio', { x: r.eff.toFixed(1) })}</p>
                        </div>
                      </div>
                      {r.longer && (
                        <p className="text-xs text-sub mt-3 pt-3 border-t border-line">
                          {t('recs.longer', { leave: r.longer.leave.length, days: r.longer.days, range: span(r.longer), list: r.longer.leave.map(short).join(', ') })}
                        </p>
                      )}
                    </li>
                  )
                })}
              </ol>
            ) : (
              <p className="text-sm text-muted">{t('recs.empty')}</p>
            )}
          </div>
        </div>
      </div>

      {/* 달력 + 통계 */}
      <section className="ui-card p-6 space-y-6" aria-labelledby="hp-cal">
        <div>
          <h2 id="hp-cal" className="text-lg font-semibold text-fg">{t('cal.title', { year })}</h2>
          <p className="text-sm text-muted mt-1">{t('cal.desc')}</p>
        </div>

        <dl className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {STATS.map((key) => (
            <div key={key} className="bg-subtle rounded-2xl p-4">
              <dt className="text-xs text-muted">{t(`stats.${key}`)}</dt>
              <dd className="text-xl font-bold text-fg tabular-nums mt-1">{t(key === 'longWeekends' ? 'stats.times' : 'stats.days', { n: p.stats[key] })}</dd>
            </div>
          ))}
        </dl>
        <p className="text-xs text-faint -mt-3">{t('stats.note')}</p>

        <div className="flex flex-wrap gap-x-5 gap-y-2 text-xs text-muted" aria-hidden="true">
          <span className="flex items-center gap-1.5"><span className="w-4 h-4 rounded bg-primary" />{t('cal.leave')}</span>
          <span className="flex items-center gap-1.5"><span className="w-4 h-4 rounded bg-primary-soft" />{t('cal.inBreak')}</span>
          <span className="flex items-center gap-1.5"><span className="relative w-4 h-4 rounded border border-line text-[10px] leading-4 text-center text-red-500">1<span className="absolute left-1/2 -translate-x-1/2 -bottom-1 w-1 h-1 rounded-full bg-red-500" /></span>{t('cal.holiday')}</span>
          <span className="flex items-center gap-1.5"><span className="w-4 h-4 rounded border border-line text-[10px] leading-4 text-center text-muted">1</span>{t('cal.weekend')}</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {months.map((name, mi) => {
            const md = yearDays.filter((d) => parts(d.date).m === mi + 1)
            const cells: (Day | null)[] = [...Array(md[0].dow).fill(null), ...md]
            while (cells.length % 7) cells.push(null)
            const weeks = Array.from({ length: cells.length / 7 }, (_, w) => cells.slice(w * 7, w * 7 + 7))
            return (
              <table key={name} className="w-full table-fixed border-collapse">
                <caption className="text-sm font-semibold text-fg text-left mb-2">{name}</caption>
                <thead>
                  <tr>{weekdays.map((w, i) => <th key={w} scope="col" className={`text-[11px] font-medium pb-1 ${i === 0 ? 'text-red-500' : 'text-muted'}`}>{w}</th>)}</tr>
                </thead>
                <tbody>
                  {weeks.map((row, wi) => (
                    <tr key={wi}>
                      {row.map((d, ci) => {
                        if (!d) return <td key={ci} />
                        const leave = leaveSet.has(d.date)
                        const inBreak = breakSet.has(d.date)
                        const red = d.holidays.length > 0 || d.dow === 0
                        const tone = leave ? 'bg-primary text-white font-bold'
                          : inBreak ? `bg-primary-soft font-semibold ${red ? 'text-red-500' : 'text-primary'}`
                            : red ? 'text-red-500' : d.dow === 6 ? 'text-muted' : 'text-body'
                        const desc = describe(d)
                        return (
                          <td key={ci} className="p-0.5">
                            <div title={desc} className={`relative h-8 flex items-center justify-center rounded-lg text-xs tabular-nums ${tone}`}>
                              <span aria-hidden="true">{parts(d.date).d}</span>
                              <span className="sr-only">{desc}</span>
                              {d.holidays.length > 0 && <span aria-hidden="true" className="absolute bottom-0.5 w-1 h-1 rounded-full bg-red-500" />}
                            </div>
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            )
          })}
        </div>

        <div>
          <h3 className="font-semibold text-fg mb-3">{t('cal.listTitle', { year, n: holidayDays.length })}</h3>
          <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 text-sm">
            {holidayDays.map((d) => (
              <li key={d.date} className="flex justify-between gap-3 py-2 border-b border-line">
                <span className={`tabular-nums ${d.dow % 6 === 0 ? 'text-muted' : 'text-body'}`}>{fmt(d.date)}</span>
                <span className="text-sub text-right">{d.holidays.map((h) => t(`holiday.${h.nameKey}`)).join('·')}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* 가이드 */}
      <div className="ui-card p-6 space-y-6">
        <h2 className="text-xl font-semibold text-fg">{t('guide.title')}</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {(['tips', 'substitute', 'promotion', 'method'] as const).map((sec) => (
            <div key={sec}>
              <h3 className="font-semibold text-fg mb-3">{t(`guide.${sec}.title`)}</h3>
              <ul className="list-disc pl-5 space-y-2 text-sm text-sub">
                {(t.raw(`guide.${sec}.items`) as string[]).map((item, i) => <li key={i}>{item}</li>)}
              </ul>
              {sec === 'promotion' && (
                <Link href="/annual-leave/" className="inline-flex mt-3 ui-btn-soft min-h-11 px-4 py-2 text-sm">{t('guide.promotion.link')}</Link>
              )}
            </div>
          ))}
        </div>

        <div>
          <h3 className="font-semibold text-fg mb-3">{t('guide.faq.title')}</h3>
          <div className="divide-y divide-line border-y border-line">
            {faq.map((f) => (
              <details key={f.q} className="py-1">
                <summary className="cursor-pointer text-sm font-medium text-body py-2.5">{f.q}</summary>
                <p className="text-sm text-sub pb-2 leading-relaxed">{f.a}</p>
              </details>
            ))}
          </div>
        </div>

        <div className="bg-subtle rounded-2xl p-5 text-sm text-sub space-y-2">
          <p className="font-medium text-body">{t('guide.sources.title')}</p>
          <ul className="space-y-1">
            {sources.map((s) => (
              <li key={s.url}><a href={s.url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">{s.label}</a></li>
            ))}
          </ul>
          <p className="text-xs text-muted">{t('guide.sources.asOf')}</p>
        </div>

        <div className="flex flex-wrap gap-2">
          {(['annual-leave', 'dday-calculator', 'weekly-holiday-pay', 'work-hours-calculator'] as const).map((href) => (
            <Link key={href} href={`/${href}/`} className="ui-btn-soft min-h-11 px-3 py-2 text-sm">{t(`guide.links.${href}`)}</Link>
          ))}
        </div>
      </div>
    </div>
  )
}
