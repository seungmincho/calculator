'use client'

import { useState, useSyncExternalStore } from 'react'
import Link from 'next/link'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, CartesianGrid } from 'recharts'
import { useTranslations } from '@/lib/i18n'
import '@/lib/i18n/ns/sunriseSunset'
import { useSearchParams } from '@/hooks/useSearchParams'
import { useHydrated } from '@/hooks/useHydrated'
import ShareResult from '@/components/ShareResult'
import MobileResultLink from '@/components/MobileResultLink'
import DatePicker from '@/components/ui/DatePicker'
import { sunTimes, kstTime, kstDate, monthDates } from '@/lib/sun/solar'
import { CITIES, isCity, type CityId } from '@/lib/sun/places'

const subscribe = () => () => {}
const isDate = (v: string | null): v is string => {
  const ms = v && /^(19|20)\d{2}-\d{2}-\d{2}$/.test(v) ? Date.parse(`${v}T12:00:00+09:00`) : NaN
  return Number.isFinite(ms) && kstDate(ms) === v // rejects 2026-02-30 and the like
}
const inKorea = (lat: number, lon: number) => lat >= 33 && lat <= 39 && lon >= 124 && lon <= 132
const MONTHS = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0'))

/** `buildDate` (KST, build time) is shown in the static HTML; the browser switches to today. */
export default function SunriseSunset({ buildDate }: { buildDate: string }) {
  const t = useTranslations('sunriseSunset')
  const sp = useSearchParams()
  const hydrated = useHydrated()
  const today = useSyncExternalStore(subscribe, () => kstDate(Date.now()), () => buildDate)
  const urlDate = hydrated ? sp.get('date') : null, urlCity = hydrated ? sp.get('city') : null
  const [pickedDate, setPickedDate] = useState<string | null>(null)
  const [pickedCity, setPickedCity] = useState<CityId | null>(null)
  const [coords, setCoords] = useState<{ lat: number; lon: number } | null>(null)
  const [geo, setGeo] = useState<'idle' | 'busy' | 'failed' | 'outside'>('idle')
  const date = pickedDate ?? (isDate(urlDate) ? urlDate : today)
  const city: CityId = pickedCity ?? (isCity(urlCity) ? urlCity : 'seoul')
  const place = coords ?? CITIES.find((c) => c.id === city)!
  const placeName = coords ? t('located', { lat: coords.lat.toFixed(2), lon: coords.lon.toFixed(2) }) : t(`cities.${city}`)

  // Location stays out of the URL; shared links carry the city only.
  const sync = (d: string, c: CityId) => history.replaceState(null, '', `?date=${d}&city=${c}`)
  const pickDate = (d: string) => { if (!isDate(d)) return; setPickedDate(d); sync(d, city) }
  const pickCity = (c: CityId) => { setPickedCity(c); setCoords(null); setGeo('idle'); sync(date, c) }
  const locate = () => {
    if (!navigator.geolocation) { setGeo('failed'); return }
    setGeo('busy')
    navigator.geolocation.getCurrentPosition((p) => {
      const lat = Math.round(p.coords.latitude * 1000) / 1000, lon = Math.round(p.coords.longitude * 1000) / 1000
      if (!inKorea(lat, lon)) { setGeo('outside'); return }
      setCoords({ lat, lon }); setGeo('idle')
    }, () => setGeo('failed'), { timeout: 10000, maximumAge: 600000 })
  }

  const weekdays = t.raw('weekdays') as string[]
  const weekday = (d: string) => weekdays[new Date(`${d}T00:00:00Z`).getUTCDay()]
  const md = (d: string) => t('md', { m: Number(d.slice(5, 7)), d: Number(d.slice(8)) })
  const hm = (ms: number | null) => { if (ms == null) return '—'; const m = Math.round(ms / 60000); return t('hm', { h: Math.floor(m / 60), m: m % 60 }) }
  const range = (a: number | null, b: number | null) => t('range', { from: kstTime(a), to: kstTime(b) })
  const s = sunTimes(date, place.lat, place.lon)
  const dateText = `${md(date)} (${weekday(date)})`
  const month = date.slice(0, 7), year = date.slice(0, 4)
  const monthRows = monthDates(month).map((d) => ({ d, ...sunTimes(d, place.lat, place.lon) }))
  const yearData = MONTHS.flatMap((m) => monthDates(`${year}-${m}`)).map((d) => {
    const ms = sunTimes(d, place.lat, place.lon).dayLength!
    return { d, ms, h: Math.round(ms / 36000) / 100 }
  })
  // Compare unrounded lengths: near the solstices several days tie at chart precision.
  const shortest = yearData.reduce((a, b) => (b.ms < a.ms ? b : a)), longest = yearData.reduce((a, b) => (b.ms > a.ms ? b : a))
  const lengthText = (h: number) => hm(h * 3600000)
  const shortLen = hm(shortest.ms), longLen = hm(longest.ms)
  const faq = t.raw('guide.faq.items') as { q: string; a: string }[]
  const sources = t.raw('guide.sources.items') as { label: string; url: string }[]
  const stat = (label: string, value: string) => (
    <div><dt className="text-sm text-muted">{label}</dt><dd className="mt-1 font-semibold text-fg tabular-nums">{value}</dd></div>
  )

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-fg">{t('title')}</h1>
        <p className="text-sm text-muted mt-1">{t('subtitle')}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1">
          <div className="ui-card p-6 space-y-5">
            <MobileResultLink href="#sunrise-sunset-result" label={t('resultLabel', { place: placeName, date: dateText })} value={`${kstTime(s.sunrise)} · ${kstTime(s.sunset)}`} />
            <div>
              <DatePicker value={date} onChange={pickDate} label={t('dateLabel')} id="sunrise-date" />
              <button type="button" onClick={() => pickDate(today)} className="ui-btn-soft min-h-[44px] px-4 py-2 text-sm mt-2">{t('today')}</button>
            </div>
            <div>
              <label htmlFor="sunrise-city" className="block text-sm font-medium text-body mb-2">{t('cityLabel')}</label>
              <select id="sunrise-city" value={city} onChange={(e) => isCity(e.target.value) && pickCity(e.target.value)} className="ui-field px-4 py-3 w-full min-h-[44px]">
                {CITIES.map((c) => <option key={c.id} value={c.id}>{t(`cities.${c.id}`)}</option>)}
              </select>
              <button type="button" onClick={locate} disabled={geo === 'busy'} className="ui-btn-soft min-h-[44px] px-4 py-2 text-sm mt-2">{geo === 'busy' ? t('locating') : t('locate')}</button>
              {coords && <p className="text-sm text-sub mt-2">{placeName}</p>}
              {(geo === 'failed' || geo === 'outside') && <p className="text-sm text-sub mt-2" role="status">{t(geo === 'failed' ? 'locateFailed' : 'outsideKorea')}</p>}
            </div>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-8">
          <div id="sunrise-sunset-result" className="ui-card p-6 space-y-5 scroll-mt-20" aria-live="polite">
            <p className="text-sm text-sub">{t('resultLabel', { place: placeName, date: dateText })}</p>
            <div className="grid grid-cols-2 gap-4">
              <div><p className="text-xs text-muted">{t('sunrise')}</p><p className="text-3xl font-bold text-fg tabular-nums">{kstTime(s.sunrise)}</p></div>
              <div><p className="text-xs text-muted">{t('sunset')}</p><p className="text-3xl font-bold text-fg tabular-nums">{kstTime(s.sunset)}</p></div>
            </div>
            <dl className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {stat(t('dayLength'), hm(s.dayLength))}
              {stat(t('noon'), kstTime(s.noon))}
              {stat(t('dawn'), kstTime(s.dawn))}
              {stat(t('dusk'), kstTime(s.dusk))}
              {stat(t('goldenMorning'), range(s.sunrise, s.goldenEnd))}
              {stat(t('goldenEvening'), range(s.goldenStart, s.sunset))}
            </dl>
            <p className="text-xs text-muted">{t('note')}</p>
            <div className="flex flex-wrap gap-2">
              <Link href="/new-year-sunrise/" className="ui-btn-soft px-4 py-2 text-sm inline-flex items-center min-h-[44px]">{t('toNewYear')}</Link>
            </div>
            <ShareResult
              card={{
                tool: t('title'),
                label: t('resultLabel', { place: placeName, date: dateText }),
                headline: `${kstTime(s.sunrise)} · ${kstTime(s.sunset)}`,
                sub: t('share.sub', { length: hm(s.dayLength) }),
                rows: [{ label: t('noon'), value: kstTime(s.noon) }, { label: t('goldenEvening'), value: range(s.goldenStart, s.sunset) }],
              }}
              text={t('share.text', { place: placeName, date: dateText, sunrise: kstTime(s.sunrise), sunset: kstTime(s.sunset) })}
            />
          </div>

          <div className="ui-card p-6 space-y-4">
            <h2 className="text-xl font-semibold text-fg">{t('yearTitle', { year })}</h2>
            <p className="text-sm text-sub">{t('yearSummary', { short: md(shortest.d), shortLen, long: md(longest.d), longLen })}</p>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={yearData} margin={{ top: 8, right: 12, left: -16, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" />
                  <XAxis dataKey="d" ticks={MONTHS.map((m) => `${year}-${m}-01`)} tickFormatter={(d: string) => t('monthTick', { m: Number(d.slice(5, 7)) })} tick={{ fontSize: 11, fill: 'var(--muted)' }} />
                  <YAxis domain={['dataMin - 0.5', 'dataMax + 0.5']} tickFormatter={(v: number) => String(Math.round(v))} tick={{ fontSize: 11, fill: 'var(--muted)' }} />
                  <Tooltip formatter={(v) => [lengthText(Number(v ?? 0)), t('dayLength')]} labelFormatter={(d) => md(String(d ?? date))} />
                  <ReferenceLine x={date} stroke="var(--primary)" strokeDasharray="4 4" />
                  <Line type="monotone" dataKey="h" stroke="var(--primary)" strokeWidth={2} dot={false} isAnimationActive={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="ui-card p-6 space-y-4">
            <h2 className="text-xl font-semibold text-fg">{t('monthTitle', { month: Number(month.slice(5)) })}</h2>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-muted">
                  <th scope="col" className="py-2 font-medium">{t('table.date')}</th>
                  <th scope="col" className="py-2 font-medium">{t('table.sunrise')}</th>
                  <th scope="col" className="py-2 font-medium">{t('table.sunset')}</th>
                  <th scope="col" className="py-2 font-medium">{t('table.length')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {monthRows.map((r) => {
                  const on = r.d === date
                  return (
                    <tr key={r.d} className={on ? 'bg-primary-soft' : ''}>
                      <td><button type="button" aria-pressed={on} onClick={() => pickDate(r.d)} className={`min-h-[44px] w-full text-left px-1 ${on ? 'text-primary font-semibold' : 'text-body'}`}>{t('day', { d: Number(r.d.slice(8)), w: weekday(r.d) })}</button></td>
                      <td className="text-fg tabular-nums">{kstTime(r.sunrise)}</td>
                      <td className="text-fg tabular-nums">{kstTime(r.sunset)}</td>
                      <td className="text-sub tabular-nums">{hm(r.dayLength)}</td>
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {(['terms', 'year', 'method'] as const).map((sec) => (
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
            {sources.map((x) => (
              <li key={x.url}><a href={x.url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">{x.label}</a></li>
            ))}
          </ul>
          <p className="text-xs text-muted">{t('guide.sources.asOf')}</p>
        </div>
      </div>
    </div>
  )
}
