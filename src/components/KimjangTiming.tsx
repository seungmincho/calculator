'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useTranslations } from '@/lib/i18n'
import '@/lib/i18n/ns/kimjangTiming'
import { useSearchParams } from '@/hooks/useSearchParams'
import { useHydrated } from '@/hooks/useHydrated'
import ShareResult from '@/components/ShareResult'
import MobileResultLink from '@/components/MobileResultLink'
import { REGIONS, entryDay, fits, isRegion, type KimjangForecast, type RegionId } from '@/lib/kimjang/timing'

const parts = (date: string) => {
  const [, m, d] = date.split('-').map(Number)
  return { m, d, w: new Date(`${date}T00:00:00Z`).getUTCDay() }
}
const kst = (iso: string) => {
  const d = new Date(Date.parse(iso) + 9 * 3600000)
  return `${d.getUTCMonth() + 1}/${d.getUTCDate()} ${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}`
}
const chip = (on: boolean) => `min-h-[44px] px-3.5 rounded-xl text-sm font-medium ${on ? 'bg-primary text-white' : 'bg-soft text-body hover:bg-subtle'}`

export default function KimjangTiming() {
  const t = useTranslations('kimjangTiming')
  const sp = useSearchParams()
  // The static HTML is rendered for Seoul; read the shared region only after hydration.
  const fromUrl = useHydrated() ? sp.get('region') : null
  const [picked, setPicked] = useState<RegionId | null>(null)
  const region: RegionId = picked ?? (isRegion(fromUrl) ? fromUrl : 'seoul')
  const [data, setData] = useState<KimjangForecast | null>(null)
  const [failed, setFailed] = useState(false)
  const [weekendOnly, setWeekendOnly] = useState(false)

  useEffect(() => {
    let alive = true
    fetch('/api/kimjang-forecast')
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((d: KimjangForecast) => { if (alive) setData(d) })
      .catch(() => { if (alive) setFailed(true) })
    return () => { alive = false }
  }, [])

  const weekdays = t.raw('weekdays') as string[]
  const md = (m: number, d: number) => t('md', { m, d })
  const dayLabel = (date: string) => { const p = parts(date); return t('day', { m: p.m, d: p.d, w: weekdays[p.w] }) }
  const choose = (id: RegionId) => { setPicked(id); history.replaceState(null, '', `?region=${id}`) }

  const info = REGIONS.find((r) => r.id === region)!
  const city = t(`regions.${region}`)
  const normal = md(info.normal[0], info.normal[1])
  const days = data?.regions[region] ?? []
  const entry = entryDay(days)
  const status = !data ? (failed ? 'failed' : 'loading') : !days.length ? 'failed' : entry === days[0].date ? 'now' : entry ? 'from' : 'notYet'
  const headline = status === 'from' ? t('status.from', { date: dayLabel(entry!) })
    : status === 'notYet' ? t('status.notYet', { date: dayLabel(days[days.length - 1].date) })
    : t(`status.${status}`)
  const shown = days.filter((d) => !weekendOnly || [0, 6].includes(parts(d.date).w))
  const nextFit = days.find(fits)
  const faq = t.raw('guide.faq.items') as { q: string; a: string }[]
  const sources = t.raw('guide.sources.items') as { label: string; url: string }[]

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-fg">{t('title')}</h1>
        <p className="text-sm text-muted mt-1">{t('subtitle')}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1">
          <div className="ui-card p-6 space-y-4">
            <MobileResultLink href="#kimjang-timing-result" label={t('resultLabel', { city })} value={data && days.length ? headline : normal} />
            <p id="kimjang-region-label" className="font-semibold text-fg">{t('regionLabel')}</p>
            <div className="flex flex-wrap gap-2" role="group" aria-labelledby="kimjang-region-label">
              {REGIONS.map((r) => (
                <button key={r.id} type="button" aria-pressed={r.id === region} onClick={() => choose(r.id)} className={chip(r.id === region)}>
                  {t(`regions.${r.id}`)}
                </button>
              ))}
            </div>
            <p className="text-xs text-muted">{t('regionNote')}</p>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-8">
          <div id="kimjang-timing-result" className="ui-card p-6 space-y-5 scroll-mt-20" aria-live="polite">
            <p className="text-sm text-sub">{t('resultLabel', { city })}</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-muted">{t('forecastLabel')}</p>
                <p className="text-3xl font-bold text-fg">{headline}</p>
              </div>
              <div>
                <p className="text-xs text-muted">{t('normalLabel')}</p>
                <p className="text-3xl font-bold text-fg tabular-nums">{normal}</p>
              </div>
            </div>
            <p className="text-sm text-sub">{t('rule')}</p>

            {days.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="font-semibold text-fg">{t('daysTitle')}</h2>
                  <div className="flex gap-1" role="group" aria-label={t('daysTitle')}>
                    <button type="button" aria-pressed={!weekendOnly} onClick={() => setWeekendOnly(false)} className={chip(!weekendOnly)}>{t('allDays')}</button>
                    <button type="button" aria-pressed={weekendOnly} onClick={() => setWeekendOnly(true)} className={chip(weekendOnly)}>{t('weekendOnly')}</button>
                  </div>
                </div>
                <ul className="divide-y divide-line border-y border-line">
                  {shown.map((d) => (
                    <li key={d.date} className="flex items-center gap-3 py-2.5 text-sm">
                      <span className="text-body w-20 shrink-0">{dayLabel(d.date)}</span>
                      <span className="text-sub tabular-nums flex-1">{t('temps', { min: d.min, mean: d.mean })}</span>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${fits(d) ? 'bg-primary text-white font-semibold' : 'bg-soft text-muted'}`}>
                        {fits(d) ? t('fit') : t('notFit')}
                      </span>
                    </li>
                  ))}
                  {shown.length === 0 && <li className="py-3 text-sm text-muted">{t('noWeekend')}</li>}
                </ul>
                {data && <p className="text-xs text-muted">{t('issued', { time: kst(data.issuedAt) })} {t('forecastNote')}</p>}
              </div>
            )}
            {status === 'failed' && <p className="text-sm text-sub">{t('failedNote')}</p>}

            <div className="flex flex-wrap gap-2">
              <Link href="/kimjang-calculator/" className="ui-btn px-4 py-3 text-sm inline-flex items-center min-h-[44px]">{t('toCalculator')}</Link>
            </div>

            <ShareResult
              card={{
                tool: t('title'),
                label: t('resultLabel', { city }),
                headline: data && days.length ? headline : normal,
                sub: t('share.sub', { normal }),
                rows: [
                  { label: t('normalLabel'), value: normal },
                  ...(nextFit ? [{ label: t('share.nextFit'), value: dayLabel(nextFit.date) }] : []),
                ],
              }}
              text={t('share.text', { city, headline: data && days.length ? headline : normal, normal })}
            />
          </div>

          <div className="ui-card p-6 space-y-4">
            <h2 className="text-xl font-semibold text-fg">{t('table.title')}</h2>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-muted">
                  <th scope="col" className="py-2 font-medium">{t('table.city')}</th>
                  <th scope="col" className="py-2 font-medium">{t('table.normal')}</th>
                  <th scope="col" className="py-2 font-medium">{t('table.forecast')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {REGIONS.map((r) => {
                  const ds = data?.regions[r.id] ?? []
                  const e = entryDay(ds)
                  const on = r.id === region
                  return (
                    <tr key={r.id} className={on ? 'bg-primary-soft' : ''}>
                      <td>
                        <button type="button" aria-pressed={on} onClick={() => choose(r.id)} className={`min-h-[44px] w-full text-left px-1 ${on ? 'text-primary font-semibold' : 'text-body'}`}>
                          {t(`regions.${r.id}`)}
                        </button>
                      </td>
                      <td className="text-sub tabular-nums">{md(r.normal[0], r.normal[1])}</td>
                      <td className="text-sub">{!ds.length ? '—' : e ? t('table.from', { date: dayLabel(e) }) : t('table.notYet')}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            <p className="text-xs text-muted">{t('table.note')}</p>
          </div>
        </div>
      </div>

      <div className="ui-card p-6 space-y-6">
        <h2 className="text-xl font-semibold text-fg">{t('guide.title')}</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {(['criterion', 'method', 'prep', 'trend'] as const).map((sec) => (
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
            {sources.map((s) => (
              <li key={s.url}><a href={s.url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">{s.label}</a></li>
            ))}
          </ul>
          <p className="text-xs text-muted">{t('guide.sources.asOf')}</p>
        </div>
      </div>
    </div>
  )
}
