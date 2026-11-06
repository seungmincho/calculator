'use client'

import { useEffect, useMemo, useState } from 'react'
import { useTranslations } from '@/lib/i18n'
import '@/lib/i18n/ns/windChill'
import ShareResult from '@/components/ShareResult'
import MobileResultLink from '@/components/MobileResultLink'
import { useHydrated } from '@/hooks/useHydrated'
import { useSearchParams } from '@/hooks/useSearchParams'
import { STAGES, TABLE_TEMPS, TABLE_WINDS_KMH, applies, coldRuns, stageOf, tableValue, windChill, windChillKmh, msToKmh, type Stage } from '@/utils/windChill'
import { CITIES, isCity, type CityId, type WindChillForecast } from '@/lib/windChill/forecast'

const HOUR = 3600000
const kst = (ms: number) => new Date(ms + 9 * HOUR)
const r1 = (n: number) => Math.round(n * 10) / 10
const fmt = (n: number) => (Object.is(r1(n), -0) ? 0 : r1(n)).toFixed(1)
const num = (s: string) => (s.trim() === '' || s.trim() === '-' ? NaN : Number(s))
const BADGE: Record<Stage, string> = {
  none: 'bg-soft text-sub', interest: 'bg-soft text-body', caution: 'bg-amber-50 text-amber-800',
  warning: 'bg-red-50 text-red-700', danger: 'bg-red-600 text-white',
}
const cellTone = (wc: number) => (wc >= -10 ? 'text-body' : wc >= -25 ? 'text-amber-600' : wc >= -45 ? 'text-red-500' : 'text-red-600 font-bold')
const PRESETS = [['calm', 2], ['breeze', 5], ['strong', 10], ['gale', 15]] as const

export default function WindChill() {
  const t = useTranslations('windChill')
  const hydrated = useHydrated()
  const sp = useSearchParams()
  const url = (k: string) => (hydrated ? sp.get(k) : null)

  const [tEdit, setTEdit] = useState<string | null>(null)
  const [vEdit, setVEdit] = useState<string | null>(null)
  const [cityEdit, setCityEdit] = useState<CityId | null>(null)
  const tText = tEdit ?? url('t') ?? '-5'
  const vText = vEdit ?? url('v') ?? '5'
  const urlCity = url('city')
  const city: CityId = cityEdit ?? (isCity(urlCity) ? urlCity : 'seoul')

  const sync = (next: { t?: string; v?: string; city?: CityId }) => {
    const q = new URLSearchParams({ t: next.t ?? tText, v: next.v ?? vText, city: next.city ?? city })
    history.replaceState(history.state, '', `?${q}`)
  }
  const temp = num(tText), wind = num(vText)
  const valid = Number.isFinite(temp) && Number.isFinite(wind) && temp >= -60 && temp <= 50 && wind >= 0 && wind <= 60
  const wc = valid ? windChill(temp, wind) : NaN
  const stage: Stage = valid ? stageOf(temp, wind) : 'none'
  const diff = valid ? r1(temp - wc) : 0

  const [data, setData] = useState<WindChillForecast | null>(null)
  const [loadedAt, setLoadedAt] = useState(0) // 예보를 받은 시각(렌더 중 Date.now 금지)
  const [failed, setFailed] = useState(false)
  useEffect(() => {
    let alive = true
    fetch('/api/wind-chill')
      .then(r => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((d: WindChillForecast) => { if (alive) { setLoadedAt(Date.now()); setData(d) } })
      .catch(() => { if (alive) setFailed(true) })
    return () => { alive = false }
  }, [])

  const W = t.raw('forecast.weekdays') as string[]
  const cityName = (id: CityId) => t(`cities.${id}`)
  const view = useMemo(() => {
    const cf = data?.cities[city]
    if (!cf) return null
    const now = loadedAt, today = kst(now).toISOString().slice(0, 10)
    const hours = cf.hours.filter(h => Date.parse(h.at) + HOUR > now)
    const days = cf.days.filter(d => d.date >= today)
    const ranking = CITIES.flatMap(c => {
      const d = data?.cities[c.id]?.days.find(x => x.date === today)
      return d ? [{ id: c.id, minWc: d.minWc, min: d.min }] : []
    }).sort((a, b) => a.minWc - b.minWc)
    return { now: hours[0], hours: hours.filter((_, i) => i % 3 === 0).slice(0, 16), days, cold: coldRuns(days), ranking }
  }, [data, city, loadedAt])
  const hourLabel = (at: string) => { const d = kst(Date.parse(at)); return t('forecast.hourFmt', { d: d.getUTCDate(), h: d.getUTCHours() }) }
  const dayLabel = (date: string) => t('forecast.dayFmt', { m: Number(date.slice(5, 7)), d: Number(date.slice(8)), w: W[new Date(`${date}T00:00:00Z`).getUTCDay()] })

  const faq = t.raw('guide.faq.items') as { q: string; a: string }[]
  const sources = t.raw('guide.sources.items') as { label: string; url: string }[]
  const field = 'ui-field px-4 py-3 w-full pr-12 tabular-nums'

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-fg">{t('title')}</h1>
        <p className="text-sm text-muted mt-1">{t('subtitle')}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="ui-card p-6 space-y-5">
          <MobileResultLink href="#wind-chill-result" label={t('result.label')} value={valid ? t('result.value', { v: fmt(wc) }) : '—'} />
          <h2 className="font-semibold text-fg">{t('input.title')}</h2>
          <div>
            <label htmlFor="wc-temp" className="block text-sm font-medium text-body mb-1.5">{t('input.temp')}</label>
            <div className="relative">
              <input id="wc-temp" inputMode="decimal" className={field} value={tText}
                onChange={e => { const v = e.target.value.replace(/[^\d.-]/g, '').slice(0, 6); setTEdit(v); sync({ t: v }) }} />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-muted">{t('input.celsius')}</span>
            </div>
          </div>
          <div>
            <label htmlFor="wc-wind" className="block text-sm font-medium text-body mb-1.5">{t('input.wind')}</label>
            <div className="relative">
              <input id="wc-wind" inputMode="decimal" className={field} value={vText} aria-describedby="wc-wind-hint"
                onChange={e => { const v = e.target.value.replace(/[^\d.]/g, '').slice(0, 5); setVEdit(v); sync({ v }) }} />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-muted">{t('input.ms')}</span>
            </div>
            <p id="wc-wind-hint" className="text-xs text-muted mt-1 tabular-nums">{t('input.windHint', { kmh: Number.isFinite(wind) ? fmt(msToKmh(wind)) : '—' })}</p>
          </div>
          <div>
            <p id="wc-presets" className="text-sm font-medium text-body mb-1.5">{t('input.presets')}</p>
            <div className="grid grid-cols-2 gap-2" role="group" aria-labelledby="wc-presets">
              {PRESETS.map(([k, v]) => (
                <button key={k} type="button" aria-pressed={wind === v} onClick={() => { setVEdit(String(v)); sync({ v: String(v) }) }}
                  className={`min-h-[44px] rounded-xl text-sm font-medium ${wind === v ? 'bg-primary text-white' : 'bg-soft text-body hover:bg-subtle'}`}>
                  {t(`input.${k}`)}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div id="wind-chill-result" className="lg:col-span-2 ui-card p-6 space-y-5 scroll-mt-20" aria-live="polite">
          <p className="text-sm text-sub">{t('result.label')}</p>
          <div className="flex flex-wrap items-end gap-3">
            <p className="text-5xl font-bold text-fg tabular-nums">{valid ? t('result.value', { v: fmt(wc) }) : '—'}</p>
            {valid && stage !== 'none' && <span className={`rounded-lg px-2.5 py-1 text-sm font-semibold ${BADGE[stage]}`}>{t('result.stage', { name: t(`stages.${stage}`) })}</span>}
          </div>
          {valid && (
            <p className="text-sm text-body">{applies(temp, wind) && diff > 0 ? t('result.colder', { d: fmt(diff) }) : t('result.same')}</p>
          )}
          {valid && stage !== 'none' && <p className="bg-subtle rounded-2xl p-4 text-sm text-sub">{t(`stages.advice.${stage}`)}</p>}
          {valid && !applies(temp, wind) && <p className="bg-subtle rounded-2xl p-4 text-sm text-sub">{t('result.notApplied')}</p>}
          <p className="text-xs text-muted">{t('result.formula')}</p>
          {valid && (
            <ShareResult
              card={{ tool: t('result.share.tool'), label: t('result.label'), headline: t('result.value', { v: fmt(wc) }), sub: t('result.share.sub', { t: fmt(temp), v: fmt(wind) }), rows: stage !== 'none' ? [{ label: t('stages.title'), value: t(`stages.${stage}`) }] : [] }}
              text={t('result.share.text', { t: fmt(temp), v: fmt(wind), wc: fmt(wc), stage: t(`stages.${stage}`) })}
            />
          )}
        </div>
      </div>

      <section className="ui-card p-6 space-y-5" aria-labelledby="wc-forecast">
        <h2 id="wc-forecast" className="text-xl font-semibold text-fg">{t('forecast.title')}</h2>
        <div className="flex flex-wrap gap-2" role="group" aria-label={t('forecast.cityLabel')}>
          {CITIES.map(c => (
            <button key={c.id} type="button" aria-pressed={c.id === city} onClick={() => { setCityEdit(c.id); sync({ city: c.id }) }}
              className={`min-h-[44px] px-3.5 rounded-xl text-sm font-medium ${c.id === city ? 'bg-primary text-white' : 'bg-soft text-body hover:bg-subtle'}`}>
              {cityName(c.id)}
            </button>
          ))}
        </div>
        {!view ? (
          <p className="text-sm text-sub" role="status">{failed ? t('forecast.failed') : t('forecast.loading')}</p>
        ) : (
          <div className="space-y-6">
            {view.now && (
              <div className="bg-subtle rounded-2xl p-5">
                <p className="text-sm text-sub">{t('forecast.now', { city: cityName(city) })}</p>
                <div className="flex flex-wrap items-end gap-3 mt-1">
                  <p className="text-3xl font-bold text-fg tabular-nums">{t('result.value', { v: fmt(windChill(view.now.temp, view.now.wind)) })}</p>
                  {stageOf(view.now.temp, view.now.wind) !== 'none' && <span className={`rounded-lg px-2 py-0.5 text-xs font-semibold ${BADGE[stageOf(view.now.temp, view.now.wind)]}`}>{t(`stages.${stageOf(view.now.temp, view.now.wind)}`)}</span>}
                </div>
                <p className="text-sm text-sub mt-1 tabular-nums">{t('forecast.nowDetail', { t: fmt(view.now.temp), v: fmt(view.now.wind) })}</p>
              </div>
            )}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <h3 className="font-semibold text-fg mb-2">{t('forecast.hourly')}</h3>
                <table className="w-full text-sm tabular-nums">
                  <thead><tr className="text-left text-muted"><th scope="col" className="py-1.5 font-medium">{t('forecast.time')}</th><th scope="col" className="py-1.5 font-medium">{t('forecast.temp')}</th><th scope="col" className="py-1.5 font-medium">{t('forecast.wind')}</th><th scope="col" className="py-1.5 font-medium">{t('forecast.wc')}</th></tr></thead>
                  <tbody className="divide-y divide-line">
                    {view.hours.map(h => {
                      const v = windChill(h.temp, h.wind)
                      return (
                        <tr key={h.at}>
                          <td className="py-1.5 text-sub">{hourLabel(h.at)}</td>
                          <td className="py-1.5 text-body">{fmt(h.temp)}℃</td>
                          <td className="py-1.5 text-body">{fmt(h.wind)}</td>
                          <td className={`py-1.5 font-semibold ${cellTone(v)}`}>{fmt(v)}℃</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
              <div className="space-y-6">
                <div>
                  <h3 className="font-semibold text-fg mb-2">{t('forecast.daily')}</h3>
                  <table className="w-full text-sm tabular-nums">
                    <thead><tr className="text-left text-muted"><th scope="col" className="py-1.5 font-medium">{t('forecast.date')}</th><th scope="col" className="py-1.5 font-medium">{t('forecast.morningMin')}</th><th scope="col" className="py-1.5 font-medium">{t('forecast.minWc')}</th><th scope="col" className="py-1.5 font-medium">{t('forecast.cold')}</th></tr></thead>
                    <tbody className="divide-y divide-line">
                      {view.days.map(d => (
                        <tr key={d.date}>
                          <td className="py-1.5 text-sub">{dayLabel(d.date)}</td>
                          <td className="py-1.5 text-body">{d.morningMin == null ? '—' : `${fmt(d.morningMin)}℃`}</td>
                          <td className={`py-1.5 font-semibold ${cellTone(d.minWc)}`}>{fmt(d.minWc)}℃</td>
                          <td className="py-1.5">
                            {view.cold[d.date] && <span className={`rounded-md px-1.5 py-0.5 text-xs font-semibold ${view.cold[d.date] === 'warning' ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-800'}`}>{t(view.cold[d.date] === 'warning' ? 'forecast.warningLevel' : 'forecast.advisory')}</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <p className="text-xs text-muted mt-2">{t('forecast.coldNote')}</p>
                </div>
                {view.ranking.length > 0 && (
                  <div>
                    <h3 className="font-semibold text-fg mb-2">{t('forecast.ranking')}</h3>
                    <ol className="divide-y divide-line border-y border-line text-sm tabular-nums">
                      {view.ranking.slice(0, 8).map((r, i) => (
                        <li key={r.id} className="flex justify-between gap-3 py-1.5">
                          <span className="text-body">{i + 1}. {cityName(r.id)}</span>
                          <span className={`font-semibold ${cellTone(r.minWc)}`}>{fmt(r.minWc)}℃</span>
                        </li>
                      ))}
                    </ol>
                  </div>
                )}
              </div>
            </div>
            {data && <p className="text-xs text-muted">{t('forecast.issued', { time: hourLabel(data.issuedAt) })}</p>}
          </div>
        )}
      </section>

      <section className="ui-card p-6 space-y-4" aria-labelledby="wc-stages">
        <h2 id="wc-stages" className="text-xl font-semibold text-fg">{t('stages.title')}</h2>
        <ul className="divide-y divide-line border-y border-line">
          {STAGES.map(s => (
            <li key={s} className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 py-3">
              <span className="sm:w-40 shrink-0 flex items-center gap-2">
                <span className={`rounded-md px-2 py-0.5 text-xs font-semibold ${BADGE[s]}`}>{t(`stages.${s}`)}</span>
                <span className="text-sm text-sub tabular-nums">{t(`stages.range.${s}`)}</span>
              </span>
              <span className="text-sm text-body">{t(`stages.advice.${s}`)}</span>
            </li>
          ))}
        </ul>
        <p className="text-xs text-muted">{t('stages.note')}</p>
      </section>

      <section className="ui-card p-6 space-y-3" aria-labelledby="wc-table">
        <h2 id="wc-table" className="text-xl font-semibold text-fg">{t('table.title')}</h2>
        <p className="text-sm text-sub">{t('table.desc')}</p>
        <div className="overflow-x-auto -mx-2 px-2">
          <table className="w-full min-w-[640px] text-sm text-center tabular-nums">
            <thead>
              <tr className="text-muted">
                <th scope="col" className="py-2 text-left font-medium">{t('table.wind')}</th>
                {TABLE_TEMPS.map(x => <th key={x} scope="col" className="py-2 font-medium">{x}℃</th>)}
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {TABLE_WINDS_KMH.map(v => (
                <tr key={v}>
                  <th scope="row" className="py-1.5 text-left font-normal text-sub whitespace-nowrap">{t('table.kmh', { v })} <span className="text-faint">· {t('table.ms', { v: fmt(v / 3.6) })}</span></th>
                  {TABLE_TEMPS.map(x => { const val = tableValue(x, v); return <td key={x} className={`py-1.5 ${cellTone(windChillKmh(x, v))}`}>{val}</td> })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <div className="ui-card p-6 space-y-6">
        <h2 className="text-xl font-semibold text-fg">{t('guide.title')}</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {(['whatIs', 'coldWave', 'prevent'] as const).map(sec => (
            <div key={sec}>
              <h3 className="font-semibold text-fg mb-3">{t(`guide.${sec}.title`)}</h3>
              <ul className="list-disc pl-5 space-y-2 text-sm text-sub">{(t.raw(`guide.${sec}.items`) as string[]).map((s, i) => <li key={i}>{s}</li>)}</ul>
            </div>
          ))}
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
    </div>
  )
}
