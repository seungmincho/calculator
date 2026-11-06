'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useTranslations } from '@/lib/i18n'
import '@/lib/i18n/ns/skiResorts'
import { useSearchParams } from '@/hooks/useSearchParams'
import { useHydrated } from '@/hooks/useHydrated'
import ShareResult from '@/components/ShareResult'
import MobileResultLink from '@/components/MobileResultLink'
import { RESORTS, SKI_REGIONS, isResort, openingFor, type ResortId, type SkiRegion } from '@/lib/ski/resorts'
import { skiScore, type SkiDay, type SkiForecast } from '@/lib/ski/forecast'

const chip = (on: boolean) => `min-h-[44px] px-3.5 rounded-xl text-sm font-medium ${on ? 'bg-primary text-white' : 'bg-soft text-body hover:bg-subtle'}`
const kstClock = (iso: string) => {
  const d = new Date(Date.parse(iso) + 9 * 3600000)
  return `${d.getUTCMonth() + 1}/${d.getUTCDate()} ${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}`
}

export default function SkiResorts() {
  const t = useTranslations('skiResorts')
  const sp = useSearchParams()
  // The static HTML is rendered for Yongpyong; a shared resort is read after hydration.
  const fromUrl = useHydrated() ? sp.get('resort') : null
  const [picked, setPicked] = useState<ResortId | null>(null)
  const id: ResortId = picked ?? (isResort(fromUrl) ? fromUrl : 'yongpyong')
  const [region, setRegion] = useState<SkiRegion | 'all'>('all')
  const [data, setData] = useState<SkiForecast | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let alive = true
    fetch('/api/ski-forecast')
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((d: SkiForecast) => { if (alive) setData(d) })
      .catch(() => { if (alive) setFailed(true) })
    return () => { alive = false }
  }, [])

  const weekdays = t.raw('weekdays') as string[]
  const md = (d: string) => t('md', { m: Number(d.slice(5, 7)), d: Number(d.slice(8)) })
  const dayLabel = (d: string) => t('day', { m: Number(d.slice(5, 7)), d: Number(d.slice(8)), w: weekdays[new Date(`${d}T00:00:00Z`).getUTCDay()] })
  const name = (r: ResortId) => t(`resorts.${r}.name`)
  const openingText = (r: (typeof RESORTS)[number]) => r.opening ? t('opening.target', { date: md(r.opening.date) }) : t('opening.unknown', { usual: t(`usual.${r.usual}`) })
  const choose = (r: ResortId) => { setPicked(r); history.replaceState(null, '', `?resort=${r}`) }

  const resort = RESORTS.find((r) => r.id === id)!
  const days: SkiDay[] = data?.resorts[id] ?? []
  // Days before the announced (or, if not announced, usual) opening are not recommended.
  const scored = days.map((d) => { const o = openingFor(resort, d.date); return { d, s: skiScore(d), before: d.date < o.date, estimated: o.estimated } })
  const top = scored.filter((x) => !x.before).sort((a, b) => b.s.score - a.s.score || a.d.date.localeCompare(b.d.date)).slice(0, 3)
  const best = top[0]
  const shown = RESORTS.filter((r) => region === 'all' || r.region === region)
  const faq = t.raw('guide.faq.items') as { q: string; a: string }[]
  const sources = t.raw('guide.sources.items') as { label: string; url: string }[]
  const precip = (d: SkiDay) => (d.snow >= 0.1 ? t('snow', { mm: d.snow }) : '') + (d.rain >= 0.1 ? `${d.snow >= 0.1 ? ' · ' : ''}${t('rain', { mm: d.rain })}` : '') || t('dry')

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-fg">{t('title')}</h1>
        <p className="text-sm text-muted mt-1">{t('subtitle')}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1">
          <div className="ui-card p-6 space-y-4">
            <MobileResultLink href="#ski-result" label={t('resultLabel', { resort: name(id) })} value={best ? `${dayLabel(best.d.date)} · ${best.s.score}${t('scoreUnit')}` : openingText(resort)} />
            <p id="ski-region-label" className="font-semibold text-fg">{t('pickLabel')}</p>
            <div className="flex flex-wrap gap-2" role="group" aria-labelledby="ski-region-label">
              {(['all', ...SKI_REGIONS] as const).map((r) => <button key={r} type="button" aria-pressed={region === r} onClick={() => setRegion(r)} className={chip(region === r)}>{t(`regions.${r}`)}</button>)}
            </div>
            <div className="flex flex-wrap gap-2 pt-2 border-t border-line" role="group" aria-label={t('pickLabel')}>
              {shown.map((r) => <button key={r.id} type="button" aria-pressed={r.id === id} onClick={() => choose(r.id)} className={chip(r.id === id)}>{name(r.id)}</button>)}
            </div>
          </div>
        </div>

        <div className="lg:col-span-2">
          <div id="ski-result" className="ui-card p-6 space-y-5 scroll-mt-20" aria-live="polite">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-sm text-sub">{t('resultLabel', { resort: name(id) })}</p>
                <p className="text-xs text-muted mt-1">{t(`resorts.${id}.place`)} · {openingText(resort)}</p>
              </div>
              <a href={resort.url} target="_blank" rel="noopener noreferrer" className="ui-btn-soft px-3 py-2 text-sm inline-flex items-center min-h-[44px]">{t('officialSite')}</a>
            </div>
            {best ? (
              <div>
                <p className="text-xs text-muted">{t('best')}</p>
                <p className="text-3xl font-bold text-fg tabular-nums">{dayLabel(best.d.date)} <span className="text-primary">{best.s.score}{t('scoreUnit')}</span></p>
                <ul className="mt-2 text-sm text-sub list-disc pl-5 space-y-1">{best.s.reasons.map((k) => <li key={k}>{t(`reasons.${k}`)}</li>)}</ul>
                {top.length > 1 && <p className="text-sm text-sub mt-2">{t('alternatives', { list: top.slice(1).map((x) => `${dayLabel(x.d.date)} ${x.s.score}${t('scoreUnit')}`).join(', ') })}</p>}
              </div>
            ) : (
              <p className="text-lg font-semibold text-fg">{!data ? (failed ? t('failed') : t('loading')) : t('noDays')}</p>
            )}
            {!resort.opening && <p className="text-sm text-body bg-subtle rounded-2xl p-4">{t('unknownCaveat')}</p>}

            {scored.length > 0 && (
              <ul className="divide-y divide-line border-y border-line">
                {scored.map(({ d, s, before, estimated }) => (
                  <li key={d.date} className={`flex flex-wrap items-center gap-x-3 gap-y-1 py-2.5 text-sm ${before ? 'opacity-60' : ''}`}>
                    <span className="text-body w-20 shrink-0">{dayLabel(d.date)}</span>
                    <span className="text-sub tabular-nums">{t('temps', { low: d.low, high: d.high })}</span>
                    <span className="text-sub">{precip(d)}</span>
                    <span className="text-sub tabular-nums">{t('wind', { v: d.wind })}</span>
                    <span className={`ml-auto px-2 py-0.5 rounded-full text-xs font-medium ${before ? 'bg-soft text-muted' : s.score >= 80 ? 'bg-primary-soft text-primary' : 'bg-soft text-sub'}`}>{before ? t(estimated ? 'beforeOpenUsual' : 'beforeOpen') : `${s.score}${t('scoreUnit')}`}</span>
                  </li>
                ))}
              </ul>
            )}
            {data && <p className="text-xs text-muted">{t('issued', { time: kstClock(data.issuedAt) })} {t('scoreHelp')}</p>}
            <ShareResult
              card={{ tool: t('title'), label: t('resultLabel', { resort: name(id) }), headline: best ? `${dayLabel(best.d.date)} · ${best.s.score}${t('scoreUnit')}` : openingText(resort), sub: openingText(resort) }}
              text={t('share', { resort: name(id), value: best ? dayLabel(best.d.date) : openingText(resort) })}
            />
          </div>
        </div>
      </div>

      <div className="ui-card p-6 space-y-4">
        <h2 className="text-xl font-semibold text-fg">{t('openingTitle')}</h2>
        <p className="text-sm text-sub">{t('openingNote')}</p>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-muted border-b border-line">
              <th scope="col" className="py-2 font-medium">{t('cols.resort')}</th>
              <th scope="col" className="py-2 font-medium hidden sm:table-cell">{t('cols.region')}</th>
              <th scope="col" className="py-2 font-medium">{t('cols.opening')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {RESORTS.map((r) => (
              <tr key={r.id} className={r.id === id ? 'bg-primary-soft' : ''}>
                <td><button type="button" aria-pressed={r.id === id} onClick={() => choose(r.id)} className={`min-h-[44px] w-full text-left px-1 ${r.id === id ? 'text-primary font-semibold' : 'text-body'}`}>{name(r.id)}</button></td>
                <td className="text-sub hidden sm:table-cell">{t(`resorts.${r.id}.place`)}</td>
                <td className="text-sub">
                  {openingText(r)}
                  {r.opening && <a href={r.opening.source} target="_blank" rel="noopener noreferrer" className="ml-2 text-xs text-primary hover:underline">{t('opening.source')}</a>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="ui-card p-6 space-y-6">
        <h2 className="text-xl font-semibold text-fg">{t('guide.title')}</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {(['tips', 'weather', 'season'] as const).map((sec) => (
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
            {sources.map((s) => <li key={s.url}><a href={s.url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">{s.label}</a></li>)}
          </ul>
          <p className="text-xs text-muted">{t('guide.sources.asOf')}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/sunrise-sunset/" className="ui-btn-soft px-4 py-2 text-sm inline-flex items-center min-h-[44px]">{t('links.sunrise')}</Link>
          <Link href="/holiday-planner/" className="ui-btn-soft px-4 py-2 text-sm inline-flex items-center min-h-[44px]">{t('links.holiday')}</Link>
        </div>
      </div>
    </div>
  )
}
