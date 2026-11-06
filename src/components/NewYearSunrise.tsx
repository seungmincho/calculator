'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useTranslations } from '@/lib/i18n'
import '@/lib/i18n/ns/newYearSunrise'
import { useSearchParams } from '@/hooks/useSearchParams'
import { useHydrated } from '@/hooks/useHydrated'
import ShareResult from '@/components/ShareResult'
import MobileResultLink from '@/components/MobileResultLink'
import { sunTimes, kstTime } from '@/lib/sun/solar'
import { SPOTS, SPOT_REGIONS, isSpot, type SpotId, type SpotRegion } from '@/lib/sun/places'
import type { SpotSky, SunriseSky } from '@/lib/sun/weather'

const chip = (on: boolean) => `min-h-[44px] px-3.5 rounded-xl text-sm font-medium ${on ? 'bg-primary text-white' : 'bg-soft text-body hover:bg-subtle'}`
const level = (s: SpotSky) => (s.rain != null && s.rain >= 0.5 ? 'rain' : s.cloud < 30 ? 'clear' : s.cloud < 70 ? 'partly' : 'cloudy')
const kstClock = (iso: string) => {
  const d = new Date(Date.parse(iso) + 9 * 3600000)
  return `${d.getUTCMonth() + 1}/${d.getUTCDate()} ${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}`
}

/** `target` is the New Year's Day this build covers (YYYY-01-01), fixed at build time. */
export default function NewYearSunrise({ target }: { target: string }) {
  const t = useTranslations('newYearSunrise')
  const sp = useSearchParams()
  // The static HTML is rendered for Jeongdongjin; read a shared spot only after hydration.
  const fromUrl = useHydrated() ? sp.get('spot') : null
  const [picked, setPicked] = useState<SpotId | null>(null)
  const spot: SpotId = picked ?? (isSpot(fromUrl) ? fromUrl : 'jeongdongjin')
  const [region, setRegion] = useState<SpotRegion | 'all'>('all')
  const [sky, setSky] = useState<SunriseSky | null>(null)
  const [skyFailed, setSkyFailed] = useState(false)

  useEffect(() => {
    let alive = true
    fetch('/api/sunrise-weather')
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((d: SunriseSky) => { if (alive) { if (d.target === target) setSky(d); else setSkyFailed(true) } })
      .catch(() => { if (alive) setSkyFailed(true) })
    return () => { alive = false }
  }, [target])

  const year = target.slice(0, 4)
  const name = (id: SpotId) => t(`spots.${id}`)
  const md = (date: string) => t('md', { m: Number(date.slice(5, 7)), d: Number(date.slice(8)) })
  // Sea level for every spot, as KASI publishes; summit height is shown separately.
  const rows = SPOTS.map((s) => ({ ...s, rise: sunTimes(target, s.lat, s.lon).sunrise!, high: s.elevation ? sunTimes(target, s.lat, s.lon, s.elevation).sunrise! : null }))
    .sort((a, b) => a.rise - b.rise)
  const seoulRise = rows.find((r) => r.id === 'seoul')!.rise
  const diffMin = (rise: number) => Math.round(seoulRise / 60000) - Math.round(rise / 60000)
  const first = rows[0], land = rows.find((r) => r.id !== 'dokdo' && (r.region === 'east' || r.region === 'south' || r.region === 'west'))!
  const sel = rows.find((r) => r.id === spot)!
  const diff = diffMin(sel.rise)
  const versus = diff > 0 ? t('vsSeoul', { min: diff }) : diff < 0 ? t('vsSeoulLater', { min: -diff }) : t('sameAsSeoul')
  const selSky = sky?.spots[spot]
  const choose = (id: SpotId) => { setPicked(id); history.replaceState(null, '', `?spot=${id}`) }
  const shown = rows.filter((r) => region === 'all' || r.region === region)
  const faq = t.raw('guide.faq.items') as { q: string; a: string }[]
  const sources = t.raw('guide.sources.items') as { label: string; url: string }[]
  const skyText = !sky ? (skyFailed ? t('sky.unknown') : t('sky.loading')) : !sky.available ? t('sky.notYet', { date: md(sky.from) }) : selSky ? t(`sky.${level(selSky)}`) : t('sky.unknown')

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-fg">{t('title', { year })}</h1>
        <p className="text-sm text-muted mt-1">{t('subtitle')}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1">
          <div className="ui-card p-6 space-y-4">
            <MobileResultLink href="#new-year-sunrise-result" label={t('resultLabel', { spot: name(spot), year })} value={kstTime(sel.rise)} />
            <p id="sunrise-region-label" className="font-semibold text-fg">{t('regionLabel')}</p>
            <div className="flex flex-wrap gap-2" role="group" aria-labelledby="sunrise-region-label">
              {(['all', ...SPOT_REGIONS] as const).map((r) => (
                <button key={r} type="button" aria-pressed={region === r} onClick={() => setRegion(r)} className={chip(region === r)}>{t(`regions.${r}`)}</button>
              ))}
            </div>
            <div className="flex flex-wrap gap-2 pt-2 border-t border-line" role="group" aria-label={t('table.spot')}>
              {shown.map((r) => (
                <button key={r.id} type="button" aria-pressed={r.id === spot} onClick={() => choose(r.id)} className={chip(r.id === spot)}>{name(r.id)}</button>
              ))}
            </div>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-8">
          <div id="new-year-sunrise-result" className="ui-card p-6 space-y-5 scroll-mt-20" aria-live="polite">
            <p className="text-sm text-sub">{t('resultLabel', { spot: name(spot), year })}</p>
            <div>
              <p className="text-5xl font-bold text-fg tabular-nums">{kstTime(sel.rise)}</p>
              <p className="text-sm text-body mt-2">{versus}</p>
            </div>
            <div className="bg-subtle rounded-2xl p-5 text-sm text-sub space-y-2">
              <p>{t('seaLevel')}</p>
              {sel.high != null && <p>{t('elevation', { m: sel.elevation, time: kstTime(sel.high), min: Math.round(sel.rise / 60000) - Math.round(sel.high / 60000) })}</p>}
            </div>
            <div>
              <p className="text-xs text-muted">{t('skyLabel')}</p>
              <p className="text-lg font-semibold text-fg mt-1">{skyText}</p>
              {selSky && <p className="text-sm text-sub mt-1">{t('sky.cloud', { value: selSky.cloud })}{selSky.gapMinutes > 60 ? ` · ${t('sky.coarse', { min: selSky.gapMinutes })}` : ''}</p>}
              {sky?.available && sky.issuedAt && <p className="text-xs text-muted mt-2">{t('sky.issued', { time: kstClock(sky.issuedAt) })}</p>}
            </div>
            <p className="text-sm text-sub">{t('earliest', { first: name(first.id), firstTime: kstTime(first.rise), land: name(land.id), landTime: kstTime(land.rise) })}</p>
            <div className="flex flex-wrap gap-2">
              <Link href="/sunrise-sunset/" className="ui-btn px-4 py-3 text-sm inline-flex items-center min-h-[44px]">{t('toCalculator')}</Link>
            </div>
            <ShareResult
              card={{
                tool: t('title', { year }),
                label: t('resultLabel', { spot: name(spot), year }),
                headline: kstTime(sel.rise),
                sub: t('share.sub', { year }),
                rows: [{ label: t('table.diff'), value: versus }, ...(selSky ? [{ label: t('skyLabel'), value: t('sky.cloud', { value: selSky.cloud }) }] : [])],
              }}
              text={t('share.text', { year, spot: name(spot), time: kstTime(sel.rise) })}
            />
          </div>

          <div className="ui-card p-6 space-y-4">
            <h2 className="text-xl font-semibold text-fg">{t('table.title')}</h2>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-muted">
                  <th scope="col" className="py-2 font-medium">{t('table.spot')}</th>
                  <th scope="col" className="py-2 font-medium hidden sm:table-cell">{t('table.region')}</th>
                  <th scope="col" className="py-2 font-medium">{t('table.time')}</th>
                  <th scope="col" className="py-2 font-medium">{t('table.diff')}</th>
                  {sky?.available && <th scope="col" className="py-2 font-medium">{t('table.sky')}</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {rows.map((r) => {
                  const on = r.id === spot, d = diffMin(r.rise), s = sky?.spots[r.id]
                  return (
                    <tr key={r.id} className={on ? 'bg-primary-soft' : ''}>
                      <td><button type="button" aria-pressed={on} onClick={() => choose(r.id)} className={`min-h-[44px] w-full text-left px-1 ${on ? 'text-primary font-semibold' : 'text-body'}`}>{name(r.id)}</button></td>
                      <td className="text-sub hidden sm:table-cell">{t(`regions.${r.region}`)}</td>
                      <td className="text-fg tabular-nums font-medium">{kstTime(r.rise)}</td>
                      <td className="text-sub tabular-nums">{d > 0 ? t('table.faster', { min: d }) : d < 0 ? t('table.slower', { min: -d }) : t('table.same')}</td>
                      {sky?.available && <td className="text-sub tabular-nums">{!s ? '—' : level(s) === 'clear' ? <span className="whitespace-nowrap rounded-md bg-primary text-white font-semibold px-1.5 py-0.5">{t('table.clear')} {s.cloud}%</span> : `${s.cloud}%`}</td>}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="ui-card p-6 space-y-6">
        <h2 className="text-xl font-semibold text-fg">{t('guide.title')}</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {(['definition', 'elevation', 'why', 'tips'] as const).map((sec) => (
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
