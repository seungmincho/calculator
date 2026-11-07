'use client'

import { useSyncExternalStore } from 'react'
import { ExternalLink } from 'lucide-react'
import { useTranslations } from '@/lib/i18n'
import '@/lib/i18n/ns/jeongsi2027'
import ShareResult from '@/components/ShareResult'
import AddToCalendar from '@/components/AddToCalendar'
import type { IcsEvent } from '@/utils/carMaintenance'
import { todayKST, weekday } from '@/utils/dday'
import { STEPS, APPLY, YEAR, describe, focusStep, upcoming, phaseStep, type Step } from '@/utils/jeongsi'

const noSub = () => () => {}
const PAGE_URL = 'https://toolhub.ai.kr/jeongsi-2027/'
const LINKS = [
  ['adiga', 'https://www.adiga.kr/'],
  ['uway', 'https://www.uwayapply.com/'],
  ['jinhak', 'https://www.jinhakapply.com/'],
] as const
const SOURCES = [
  ['kcuePlan', 'https://www.kcue.or.kr/_upload/news/2025/04/30/application_25d9ccd90388d6ba316a2c7d398ff944.pdf'],
  ['kcueBasic', 'https://kcue.or.kr/_upload/news/2026/07/31/application_8366fe4b41bdfd2721e0b5596d3a265d.pdf'],
  ['kice', 'https://www.korea.kr/briefing/policyBriefingView.do?newsId=156752001'],
  ['korea', 'https://oku.korea.ac.kr/attach/202609/1790733929908_0.pdf'],
  ['adiga', 'https://www.adiga.kr/'],
] as const
const GUIDE = ['groups', 'afterScore', 'afterResult', 'addRecruit'] as const

export default function Jeongsi2027() {
  const t = useTranslations('jeongsi2027')
  // KST 오늘은 마운트 후에만 — 정적 HTML·첫 렌더는 날짜와 무관하게 전체 일정만 보인다
  const today = useSyncExternalStore(noSub, todayKST, () => null)

  const wd = t.raw('weekdays') as string[]
  const mon = t.raw('months') as string[]
  // short = 연도 생략 (기간의 끝날이 시작과 같은 해일 때)
  const fmt = (s: string, short = false) => {
    const [y, m, d] = s.split('-').map(Number)
    return t(short ? 'dateShort' : 'date', { y, m: mon[m - 1], d, w: wd[weekday(s)] })
  }
  const name = (s: Step) => t(`steps.${s.key}.name`)
  const when = (s: Step) =>
    s.until ? t(s.time ? 'untilTime' : 'until', { a: fmt(s.start), time: s.time })
      : s.end ? t(s.time ? 'rangeTime' : 'range', { a: fmt(s.start), b: fmt(s.end, s.end.slice(0, 4) === s.start.slice(0, 4)), time: s.time })
        : fmt(s.start)
  const tag = (s: Step) => {
    if (!today) return null
    const r = describe(s, today)
    return { status: r.status, text: r.status === 'future' ? t('status.future', { n: r.days }) : t(`status.${r.status}`) }
  }
  const ev = (s: Step): IcsEvent => ({
    uid: `jeongsi${YEAR}-${s.key}-${s.start}`, date: s.start, end: s.end, alarmDays: 3,
    title: [s.until ? t('ics.deadline', { name: name(s) }) : name(s), s.time ? t(s.end ? 'ics.timeEnd' : 'ics.timeUntil', { time: s.time }) : '']
      .filter(Boolean).join(' '),
    description: `${t(`steps.${s.key}.note`)}\n${PAGE_URL}`,
  })

  const focus = today ? focusStep(today) : APPLY
  const fr = today && focus ? describe(focus, today) : null
  const label = !today ? t('top.labelStatic') : !focus ? t('top.labelDone') : fr?.status === 'now' ? t('top.labelNow') : t('top.labelNext')
  const headline = !focus ? t('headline.done') : fr ? t(`headline.${fr.kind}`, { name: name(focus), n: fr.days }) : when(focus)
  const next = today ? upcoming(today, 3) : STEPS.filter((s) => s !== APPLY).slice(0, 3)
  const phase = today ? phaseStep(today) : null

  const faq = t.raw('guide.faq.items') as { q: string; a: string }[]

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-fg">{t('title')}</h1>
        <p className="text-sm text-muted mt-1">{t('subtitle')}</p>
      </div>

      <section id="jeongsi-2027-result" className="ui-card p-6 space-y-5 scroll-mt-20" aria-labelledby="js-top-label">
        <div className="space-y-2" aria-live="polite">
          <p id="js-top-label" className="text-sm text-sub">{label}</p>
          <p className="text-3xl font-bold text-fg tabular-nums break-keep [overflow-wrap:anywhere]">{headline}</p>
          {focus && <p className="text-sm text-body tabular-nums">{fr ? `${name(focus)} · ${when(focus)}` : t('top.staticSub')}</p>}
        </div>

        {today && (
          <div className="bg-subtle rounded-2xl p-5 text-sm space-y-1">
            <p className="font-medium text-body">{t('top.todo')}</p>
            <p className="text-sub">{!focus ? t('top.tipDone') : phase ? t(`steps.${phase.key}.tip`) : t('top.tipBefore')}</p>
          </div>
        )}

        {next.length > 0 && (
          <div>
            <h2 className="text-sm font-semibold text-fg mb-2">{t('top.upcoming')}</h2>
            <ul className="divide-y divide-line">
              {next.map((s) => {
                const g = tag(s)
                return (
                  <li key={s.key} className="flex items-center justify-between gap-3 py-2.5">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-body">{name(s)}</p>
                      <p className="text-xs text-muted tabular-nums">{when(s)}</p>
                    </div>
                    {g && <span className={`shrink-0 text-sm font-semibold tabular-nums ${g.status === 'now' ? 'text-primary' : 'text-sub'}`}>{g.text}</span>}
                  </li>
                )
              })}
            </ul>
          </div>
        )}

        <ShareResult
          fileName={`jeongsi-${YEAR}`}
          card={{
            tool: t('share.tool'), label, headline,
            sub: focus ? when(focus) : undefined,
            rows: next.map((s) => ({ label: name(s), value: when(s) })),
          }}
          text={t('share.text', { headline })}
        />
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <section className="lg:col-span-2 ui-card p-6 space-y-4 min-w-0" aria-labelledby="js-timeline">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 id="js-timeline" className="text-lg font-semibold text-fg">{t('timeline.title')}</h2>
              <p className="text-sm text-muted mt-1">{t('timeline.desc')}</p>
            </div>
            <AddToCalendar events={STEPS.map(ev)} file={`jeongsi-${YEAR}-schedule.ics`} />
          </div>
          <ol className="space-y-2">
            {STEPS.map((s) => {
              const g = tag(s)
              const now = g?.status === 'now'
              const past = g?.status === 'past'
              return (
                <li key={s.key} aria-current={now ? 'step' : undefined}
                  className={`flex items-start gap-3 rounded-xl border px-4 py-3 ${now ? 'border-primary bg-primary-soft' : 'border-line'}`}>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <h3 className={`text-sm font-semibold ${now ? 'text-primary' : past ? 'text-muted' : 'text-fg'}`}>{name(s)}</h3>
                      {g && (
                        <span className={`rounded-md px-2 py-0.5 text-xs font-semibold tabular-nums ${now ? 'bg-primary text-white' : 'bg-soft text-sub'}`}>{g.text}</span>
                      )}
                    </div>
                    <p className={`text-sm tabular-nums mt-0.5 ${past ? 'text-muted' : 'text-body'}`}>
                      <time dateTime={s.start}>{when(s)}</time>
                    </p>
                    <p className="text-xs text-muted mt-1 leading-relaxed">{t(`steps.${s.key}.note`)}</p>
                  </div>
                  <AddToCalendar events={[ev(s)]} file={`jeongsi-${YEAR}-${s.key}.ics`} title={name(s)} />
                </li>
              )
            })}
          </ol>
          <p className="text-xs text-muted">{t('timeline.note')}</p>
        </section>

        <div className="space-y-8 min-w-0">
          <section className="ui-card p-6 space-y-4" aria-labelledby="js-rules">
            <h2 id="js-rules" className="text-lg font-semibold text-fg">{t('rules.title')}</h2>
            <ul className="list-disc pl-5 space-y-2 text-sm text-body">
              {(t.raw('rules.items') as string[]).map((x) => <li key={x}>{x}</li>)}
            </ul>
            <p className="bg-amber-50 text-amber-800 rounded-2xl p-4 text-sm">{t('rules.warn')}</p>
          </section>

          <section className="ui-card p-6 space-y-3" aria-labelledby="js-links">
            <h2 id="js-links" className="text-lg font-semibold text-fg">{t('links.title')}</h2>
            <ul className="space-y-2">
              {LINKS.map(([k, url]) => (
                <li key={k}>
                  <a href={url} target="_blank" rel="noopener noreferrer"
                    className="flex items-center justify-between gap-3 min-h-11 rounded-xl bg-subtle hover:bg-soft px-4 py-3">
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold text-fg">{t(`links.items.${k}.name`)}</span>
                      <span className="block text-xs text-sub mt-0.5">{t(`links.items.${k}.desc`)}</span>
                    </span>
                    <ExternalLink className="w-4 h-4 shrink-0 text-sub" aria-hidden />
                    <span className="sr-only">{t('links.newTab')}</span>
                  </a>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>

      <div className="ui-card p-6 space-y-6">
        <h2 className="text-xl font-semibold text-fg">{t('guide.title')}</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {GUIDE.map((sec) => (
            <section key={sec}>
              <h3 className="font-semibold text-fg mb-3">{t(`guide.${sec}.title`)}</h3>
              <ul className="list-disc pl-5 space-y-2 text-sm text-sub">
                {(t.raw(`guide.${sec}.items`) as string[]).map((x) => <li key={x}>{x}</li>)}
              </ul>
            </section>
          ))}
        </div>
        <section>
          <h3 className="font-semibold text-fg mb-3">{t('guide.faq.title')}</h3>
          <div className="divide-y divide-line border-y border-line">
            {faq.map((f) => (
              <details key={f.q} className="py-3">
                <summary className="cursor-pointer text-sm font-medium text-body min-h-[44px] flex items-center">{f.q}</summary>
                <p className="text-sm text-sub mt-2 leading-relaxed">{f.a}</p>
              </details>
            ))}
          </div>
        </section>
        <div className="bg-subtle rounded-2xl p-5 text-sm text-sub space-y-2">
          <p className="font-medium text-body">{t('guide.sources.title')}</p>
          <ul className="space-y-1">
            {SOURCES.map(([k, url]) => (
              <li key={k}><a href={url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline break-words">{t(`guide.sources.items.${k}`)}</a></li>
            ))}
          </ul>
          <p className="text-xs text-muted">{t('guide.sources.asOf')}</p>
        </div>
      </div>
    </div>
  )
}
