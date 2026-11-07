'use client'

import { useSyncExternalStore } from 'react'
import Link from 'next/link'
import { useTranslations } from '@/lib/i18n'
import '@/lib/i18n/ns/winterFestivals'
import { useSearchParams } from '@/hooks/useSearchParams'
import { useHydrated } from '@/hooks/useHydrated'
import ShareResult from '@/components/ShareResult'
import AddToCalendar from '@/components/AddToCalendar'
import { todayKST, addDays, addMonths, daysBetween, weekday, ddayLabel } from '@/utils/dday'
import {
  FESTIVAL_TYPES, FESTIVAL_REGIONS, SORTS, SEASON, SOURCES, listFestivals, periodOf, statusOf, partOfMonth,
  isType, isRegion, isSort, type Festival, type SourceKey,
} from '@/lib/festivals'

const noSub = () => () => {}
const chip = (on: boolean) => `min-h-[44px] px-3.5 rounded-xl text-sm font-medium ${on ? 'bg-primary text-white' : 'bg-soft text-body hover:bg-subtle'}`
const BADGE = {
  confirmed: 'bg-primary-soft text-primary', upcoming: 'bg-primary-soft text-primary', ongoing: 'bg-primary text-white',
  tba: 'bg-soft text-sub', ended: 'bg-soft text-muted',
} as const

/** 필터는 URL(?type=&region=&sort=)에 두어 공유 링크로 재현한다. 기본값은 주소에서 뺀다. */
function setParam(key: string, value: string, fallback: string) {
  const p = new URLSearchParams(window.location.search)
  if (value === fallback) p.delete(key); else p.set(key, value)
  const s = p.toString()
  history.replaceState(null, '', s ? `?${s}` : window.location.pathname)
}

export default function WinterFestivals() {
  const t = useTranslations('winterFestivals')
  const sp = useSearchParams()
  // 정적 HTML·첫 렌더는 기본 필터, 공유된 필터는 하이드레이션 뒤에 읽는다.
  const q = useHydrated() ? sp : null
  const qt = q?.get('type'), qr = q?.get('region'), qs = q?.get('sort')
  const type = isType(qt) ? qt : 'all'
  const region = isRegion(qr) ? qr : 'all'
  const sort = isSort(qs) ? qs : 'date'
  // 오늘(KST)은 마운트 후에만 — 정적 HTML은 날짜와 무관하게 확정/공지 전만 보여 준다.
  const today = useSyncExternalStore(noSub, todayKST, () => null)

  const weekdays = t.raw('weekdays') as string[]
  const months = t.raw('months') as string[]
  const mon = (d: string) => Number(d.slice(5, 7))
  const md = (d: string) => t('md', { m: mon(d), d: Number(d.slice(8)) })
  const mdw = (d: string) => t('mdw', { m: mon(d), d: Number(d.slice(8)), w: weekdays[weekday(d)] })
  const range = (start: string, end: string, f = md) => t('range', { from: f(start), to: f(end) })
  const part = (d: string) => t('monthPart', { m: mon(d), mon: months[mon(d) - 1], part: t(`parts.${partOfMonth(d)}`) })
  const usual = (f: Festival) => t('usual', { from: part(f.last.start), to: part(f.last.end) })
  const name = (f: Festival) => t(`festivals.${f.id}.name`)

  const shown = listFestivals(type, region, sort)
  const confirmed = shown.filter((f) => f.dates).length
  const filterLabel = [type !== 'all' && t(`types.${type}`), region !== 'all' && t(`regions.${region}`)].filter(Boolean).join(' · ') || t('types.all')
  // 공유 카드: 아직 끝나지 않은 축제 중 개막이 가까운 3곳
  const next = listFestivals(type, region, 'date').filter((f) => !today || periodOf(f).end >= today).slice(0, 3)

  // 기간 막대: 보이는 축제의 첫 개막 주 월요일 ~ 마지막 폐막 주 일요일
  const periods = shown.map((f) => ({ f, p: periodOf(f) }))
  const min = periods.reduce<string>((m, x) => (x.p.start < m ? x.p.start : m), SEASON.to)
  const max = periods.reduce<string>((m, x) => (x.p.end > m ? x.p.end : m), SEASON.from)
  const from = addDays(min, -((weekday(min) + 6) % 7))
  const weeks = Math.max(1, Math.ceil((daysBetween(from, max) + 1) / 7))
  const total = weeks * 7
  const pct = (d: string) => (daysBetween(from, d) / total) * 100
  const monthStarts: string[] = []
  for (let d = `${from.slice(0, 8)}01`; d <= max; d = addMonths(d, 1)) if (d >= from) monthStarts.push(d)
  const todayPct = today && today >= from && today < addDays(from, total) ? pct(today) : null

  const faq = t.raw('guide.faq.items') as { q: string; a: string }[]

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-fg">{t('title')}</h1>
        <p className="text-sm text-muted mt-1">{t('subtitle')}</p>
      </div>

      <div className="ui-card p-6 grid grid-cols-1 md:grid-cols-3 gap-5">
        <ChipGroup id="wf-type" label={t('filters.type')} options={['all', ...FESTIVAL_TYPES].map((v) => [v, t(`types.${v}`)])} value={type} onChange={(v) => setParam('type', v, 'all')} />
        <ChipGroup id="wf-region" label={t('filters.region')} options={['all', ...FESTIVAL_REGIONS].map((v) => [v, t(`regions.${v}`)])} value={region} onChange={(v) => setParam('region', v, 'all')} />
        <ChipGroup id="wf-sort" label={t('filters.sort')} options={SORTS.map((v) => [v, t(`sort.${v}`)])} value={sort} onChange={(v) => setParam('sort', v, 'date')} />
      </div>

      <p role="note" className="bg-amber-50 text-amber-800 rounded-2xl p-4 text-sm">{t('warning')}</p>

      <section aria-labelledby="wf-list" className="space-y-4">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1" aria-live="polite">
          <h2 id="wf-list" className="text-xl font-semibold text-fg">{t('listTitle', { n: shown.length })}</h2>
          <p className="text-sm text-sub">{t('summary', { confirmed, tba: shown.length - confirmed })}</p>
        </div>
        {shown.length === 0 ? (
          <p className="bg-subtle rounded-2xl p-5 text-sub">{t('empty')}</p>
        ) : (
          <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {shown.map((f) => {
              const s = statusOf(f, today)
              return (
                <li key={f.id} className="ui-card p-5 flex flex-col gap-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-xs text-muted">{t(`types.${f.type}`)}</p>
                      <h3 className="text-lg font-semibold text-fg">{name(f)}</h3>
                    </div>
                    {f.dates && (
                      <AddToCalendar title={name(f)} file={`${f.id}-${f.dates.start.slice(0, 4)}.ics`} events={[{
                        uid: `winter-festival-${f.id}-${f.dates.start}`, date: f.dates.start, end: f.dates.end, alarmDays: 7, title: name(f),
                        description: t('calendarNote', { place: t(`festivals.${f.id}.place`), url: f.url ?? 'https://toolhub.ai.kr/winter-festivals/' }),
                      }]} />
                    )}
                  </div>
                  <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${BADGE[s.kind]}`}>{t(`status.${s.kind === 'upcoming' ? 'confirmed' : s.kind}`)}</span>
                    {s.kind === 'upcoming' && <span className="text-xs font-semibold text-primary tabular-nums">{ddayLabel(s.days ?? 0)}</span>}
                    <span className="font-medium text-body tabular-nums">{f.dates ? range(f.dates.start, f.dates.end, mdw) : usual(f)}</span>
                  </p>
                  <dl className="text-sm text-sub space-y-1">
                    <div><dt className="sr-only">{t('labels.place')}</dt><dd>{t(`festivals.${f.id}.place`)}</dd></div>
                    <div><dt className="sr-only">{t('labels.program')}</dt><dd>{t(`festivals.${f.id}.program`)}</dd></div>
                    <div className="text-muted"><dt className="inline">{t('labels.last')} </dt><dd className="inline tabular-nums">{range(f.last.start, f.last.end)}</dd></div>
                  </dl>
                  {f.url && (
                    <a href={f.url} target="_blank" rel="noopener noreferrer" aria-label={t('officialSiteFor', { name: name(f) })}
                      className="mt-auto ui-btn-soft px-3 py-2 text-sm inline-flex items-center justify-center min-h-[44px]">{t('officialSite')}</a>
                  )}
                </li>
              )
            })}
          </ul>
        )}
        <ShareResult
          card={{
            tool: t('title'), label: t('share.label', { season: SEASON.label, filter: filterLabel }),
            headline: t('share.headline', { n: shown.length }), sub: t('summary', { confirmed, tba: shown.length - confirmed }),
            rows: next.map((f) => ({ label: name(f), value: f.dates ? range(f.dates.start, f.dates.end) : usual(f) })),
          }}
          text={t('share.text', { n: shown.length })}
          fileName="toolhub-winter-festivals"
        />
      </section>

      {shown.length > 0 && (
        <section aria-labelledby="wf-timeline" className="ui-card p-6 space-y-4">
          <h2 id="wf-timeline" className="text-xl font-semibold text-fg">{t('timeline.title')}</h2>
          {/* relative: 안쪽 sr-only(절대 위치)가 스크롤 래퍼 밖으로 나가 모바일 페이지를 옆으로 밀지 않게 */}
          <div className="relative overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <caption className="text-left text-sm text-sub pb-3">{t('timeline.caption')}</caption>
              <thead>
                <tr className="border-b border-line">
                  <th scope="col" className="w-36 sm:w-48 py-2 pr-3 text-left font-medium text-muted">{t('timeline.festival')}</th>
                  <th scope="col" className="py-2 text-left font-medium text-muted">
                    <span className="sr-only">{t('timeline.period')}</span>
                    <div aria-hidden className="relative h-5">
                      {monthStarts.map((d) => <span key={d} className="absolute top-0 text-xs text-muted" style={{ left: `${pct(d)}%` }}>{months[mon(d) - 1]}</span>)}
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {periods.map(({ f, p }) => (
                  <tr key={f.id}>
                    <th scope="row" className="py-2 pr-3 text-left font-normal text-body">{name(f)}</th>
                    <td className="py-2">
                      <span className="sr-only">{t(p.confirmed ? 'timeline.srConfirmed' : 'timeline.srEstimated', { range: range(p.start, p.end) })}</span>
                      <div aria-hidden className="relative h-7">
                        {Array.from({ length: weeks - 1 }, (_, i) => <span key={i} className="absolute inset-y-0 w-px bg-line" style={{ left: `${((i + 1) / weeks) * 100}%` }} />)}
                        <span className={`absolute top-1 bottom-1 rounded-md ${p.confirmed ? 'bg-primary' : 'border-2 border-dashed border-primary bg-primary-soft'}`}
                          style={{ left: `${pct(p.start)}%`, width: `${((daysBetween(p.start, p.end) + 1) / total) * 100}%` }} />
                        {todayPct !== null && <span className="absolute -inset-y-1 w-0.5 bg-fg" style={{ left: `${todayPct}%` }} />}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <ul aria-hidden className="flex flex-wrap gap-x-5 gap-y-2 text-xs text-sub">
            <li className="inline-flex items-center gap-2"><span className="w-6 h-3 rounded bg-primary" />{t('timeline.confirmed')}</li>
            <li className="inline-flex items-center gap-2"><span className="w-6 h-3 rounded border-2 border-dashed border-primary bg-primary-soft" />{t('timeline.estimated')}</li>
            {todayPct !== null && <li className="inline-flex items-center gap-2"><span className="w-0.5 h-4 bg-fg" />{t('timeline.today')}</li>}
          </ul>
        </section>
      )}

      <div className="ui-card p-6 space-y-6">
        <h2 className="text-xl font-semibold text-fg">{t('guide.title')}</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {(['prep', 'tickets', 'safety', 'kids'] as const).map((sec) => (
            <div key={sec}>
              <h3 className="font-semibold text-fg mb-3">{t(`guide.${sec}.title`)}</h3>
              <ul className="list-disc pl-5 space-y-2 text-sm text-sub">
                {(t.raw(`guide.${sec}.items`) as string[]).map((item, i) => <li key={i}>{item}</li>)}
              </ul>
            </div>
          ))}
        </div>
        <div>
          <h3 className="font-semibold text-fg mb-3">{t('guide.faq.title')}</h3>
          <div className="divide-y divide-line border-y border-line">
            {faq.map((f) => (
              <details key={f.q} className="py-3">
                <summary className="cursor-pointer text-sm font-medium text-body min-h-[24px]">{f.q}</summary>
                <p className="text-sm text-sub mt-2 leading-relaxed">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
        <div className="bg-subtle rounded-2xl p-5 text-sm text-sub space-y-2">
          <p className="font-medium text-body">{t('guide.sources.title')}</p>
          <ul className="space-y-1">
            {(Object.entries(SOURCES) as [SourceKey, string][]).map(([k, url]) => (
              <li key={k}><a href={url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">{t(`guide.sources.items.${k}`)}</a></li>
            ))}
          </ul>
          <p className="text-xs text-muted">{t('guide.sources.asOf')}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/wind-chill/" className="ui-btn-soft px-4 py-2 text-sm inline-flex items-center min-h-[44px]">{t('links.windChill')}</Link>
          <Link href="/ski-resorts/" className="ui-btn-soft px-4 py-2 text-sm inline-flex items-center min-h-[44px]">{t('links.skiResorts')}</Link>
        </div>
      </div>
    </div>
  )
}

function ChipGroup({ id, label, options, value, onChange }: {
  id: string; label: string; options: string[][]; value: string; onChange: (v: string) => void
}) {
  return (
    <div>
      <p id={id} className="text-sm font-medium text-body mb-2">{label}</p>
      <div role="group" aria-labelledby={id} className="flex flex-wrap gap-2">
        {options.map(([v, text]) => (
          <button key={v} type="button" aria-pressed={value === v} onClick={() => onChange(v)} className={chip(value === v)}>{text}</button>
        ))}
      </div>
    </div>
  )
}
