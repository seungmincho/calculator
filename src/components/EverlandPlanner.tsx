'use client'

import { useEffect, useRef, useState } from 'react'
import { useTranslations } from '@/lib/i18n'
import '@/lib/i18n/ns/everlandPlanner'
import '@/lib/i18n/ns/lotteWorldPlanner'
import '@/lib/i18n/ns/gyeongjuWorldPlanner'
import { parks, PARK_IDS, type ParkId, type VisitArea } from '@/lib/theme-parks/config'
import ShareResult from './ShareResult'
import MobileResultLink from './MobileResultLink'
import { recommended, visitDays, type Forecast, type Profile, type Scope, type VisitDay } from '@/lib/everland/planner'

export interface PlannerProps {
  park?: ParkId
  initialArea?: VisitArea
  forecast: Forecast | null
  now: number
  initialProfile?: Profile
  initialScope?: Scope
  initialDate?: string
  pageDate?: string
  view?: 'plan' | 'map'
}
const requestMapHeight = (frame: HTMLIFrameElement | null) => {
  frame?.contentWindow?.postMessage({type:'everland-resize'},window.location.origin)
}
export default function EverlandPlanner({ park = 'everland', initialArea = 'all', forecast, now, initialProfile = 'balanced', initialScope = 'all', initialDate = '', pageDate = '', view = 'plan' }: PlannerProps) {
  const config = parks[park]
  const basePath = `/${park}/`
  const everlandT = useTranslations('everlandPlanner')
  const lotteT = useTranslations('lotteWorldPlanner')
  const gyeongjuT = useTranslations('gyeongjuWorldPlanner')
  const t = { everland:everlandT, 'lotte-world':lotteT, 'gyeongju-world':gyeongjuT }[park]
  const [area,setArea] = useState<VisitArea>(config.indoor?initialArea:'all')
  const [profile,setProfile] = useState<Profile>(initialProfile)
  const [scope,setScope] = useState<Scope>(initialScope)
  const [chosen,setChosen] = useState(initialDate)
  const [frameHeight,setFrameHeight] = useState(1200)
  const mapFrame = useRef<HTMLIFrameElement>(null)
  const days = visitDays(forecast,profile,now,park,area), top = recommended(days,scope), best = top[0]
  const selected = days.find(d=>d.date===chosen) ?? best
  const featured = pageDate ? days.find(d=>d.date===pageDate) ?? best : best
  const weekdays = t.raw('weekdays') as string[]
  const dateLabel = (day: VisitDay) => `${t('monthDay',{month:Number(day.date.slice(5,7)),day:Number(day.date.slice(8))})} (${weekdays[day.weekday]})`
  const time = (value: string) => new Intl.DateTimeFormat('ko-KR',{timeZone:'Asia/Seoul',month:'long',day:'numeric',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(new Date(value))
  const hour = (value: string) => new Intl.DateTimeFormat('ko-KR',{timeZone:'Asia/Seoul',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(new Date(value))
  const number = (value: number) => Math.round(value*10)/10
  const params = (date?: string) => new URLSearchParams({profile,scope,area,...(date ? {date} : {})}).toString()
  const dateUrl = (date: string) => `${basePath}date/${date}/?${new URLSearchParams({profile,scope,area})}`
  const updateUrl = (p: Profile,s: Scope,d: string,a: VisitArea = area) => {
    if (typeof window !== 'undefined') window.history.replaceState(null,'',`${window.location.pathname}?${new URLSearchParams({profile:p,scope:s,area:a,...(d ? {date:d} : {})})}`)
  }
  const selectDay = (date: string) => { setChosen(date); updateUrl(profile,scope,date) }
  useEffect(()=>{
    // Next's client navigation can load the static fallback RSC. The live page is
    // served by Pages Functions, so enter it through a document navigation.
    if (now===0 && (window.location.hostname==='toolhub.ai.kr' || window.location.hostname.endsWith('.pages.dev'))) { window.location.reload(); return }
    const listener = (event: MessageEvent) => {
      const frame = mapFrame.current
      if (event.origin===window.location.origin && event.source===frame?.contentWindow && event.data?.type==='everland-height' && Number.isFinite(event.data.height)) setFrameHeight(Math.min(25000,Math.max(600,event.data.height+20)))
    }
    window.addEventListener('message',listener)
    // The cached iframe can finish before hydration installs this listener.
    // Request its size again instead of relying on its first resize message.
    requestMapHeight(mapFrame.current)
    return ()=>window.removeEventListener('message',listener)
  },[now,view])
  const metrics = (day: VisitDay) => <dl className="grid grid-cols-2 sm:grid-cols-4 gap-4">
    <div><dt className="text-sm text-muted">{t('weather')}</dt><dd className="mt-1 text-lg font-semibold text-fg tabular-nums">{number(day.low)}~{number(day.high)}°C</dd></div>
    <div><dt className="text-sm text-muted">{t('rain')}</dt><dd className="mt-1 text-lg font-semibold text-fg tabular-nums">{day.rain} mm</dd></div>
    <div><dt className="text-sm text-muted">{t('wind')}</dt><dd className="mt-1 text-lg font-semibold text-fg tabular-nums">{number(day.wind)} m/s</dd></div>
    <div><dt className="text-sm text-muted">{t('crowdLabel')}</dt><dd className="mt-1 font-semibold text-fg">{t(`crowd.${day.crowd}`)}</dd><dd className="text-xs text-muted mt-1">{t('crowdNote')}</dd></div>
  </dl>
  const reasons = (day: VisitDay) => <ul className="space-y-2 text-sm leading-relaxed text-body list-disc pl-5">{day.reasons.map(reason=><li key={reason}>{t(`reasons.${reason}`)}</li>)}</ul>
  return <div className="max-w-6xl mx-auto px-4 py-8 sm:px-6 sm:py-12 text-body">
    <nav aria-label={t('choosePark')} className="flex flex-wrap gap-2 mb-6">{PARK_IDS.map(id=><a key={id} href={`/${id}/`} aria-current={park===id?'page':undefined} className={`min-h-10 rounded-xl px-3 py-2 text-sm font-semibold ${park===id?'bg-primary text-white':'bg-soft text-sub hover:bg-track'}`}>{t(`parkNames.${id}`)}</a>)}</nav>
    <header className="mb-7">
      <p className="text-sm text-muted font-medium mb-3">{t('eyebrow')}</p>
      <h1 className="text-3xl sm:text-4xl font-bold text-fg tracking-tight leading-tight">{view==='map' ? t('mapTitle') : pageDate ? t('dateTitle',{date:pageDate}) : t('title')}</h1>
      <p className="text-sub mt-4 leading-relaxed">{view==='map' ? t('mapIntro') : t('intro')}</p>
    </header>
    <nav aria-label={t('eyebrow')} className="flex gap-1 border-b border-line mb-7">
      <a href={basePath} aria-current={view==='plan'?'page':undefined} className={`px-4 py-3 text-sm font-semibold rounded-t-xl ${view==='plan'?'bg-primary text-white':'text-sub hover:bg-soft'}`}>{t('planTab')}</a>
      <a href={`${basePath}map/`} aria-current={view==='map'?'page':undefined} className={`px-4 py-3 text-sm font-semibold rounded-t-xl ${view==='map'?'bg-primary text-white':'text-sub hover:bg-soft'}`}>{t('mapTab')}</a>
    </nav>
    {view==='map' ? <section>
      <p className="text-sm text-sub mb-2">{t('mapVersion')}</p><p className="text-sm text-muted mb-4">{t('mapCaption')} <a className="text-primary underline" href={config.guide} target="_blank" rel="noopener noreferrer">{t('mapSource')}</a></p>
      <iframe ref={mapFrame} id="everland-map-frame" src={config.board} title={t('mapFrame')} onLoad={()=>requestMapHeight(mapFrame.current)} className="block w-full border-0" style={{height:frameHeight}} />
    </section> : <>
      {featured&&<MobileResultLink href="#everland-result" label={t(pageDate?'selected':featured.caution?'relativeBest':'best')} value={`${dateLabel(featured)} · ${featured.score}${t('scoreUnit')}`} className="mb-5" />}
      <form method="get" className="flex flex-col sm:flex-row sm:flex-wrap gap-5 sm:gap-8 mb-7" onSubmit={e=>e.preventDefault()}>
        <fieldset><legend className="text-sm text-sub mb-2">{t('profileLabel')}</legend><div className="flex flex-wrap gap-2">{(['balanced','family','rides'] as Profile[]).map(p=><button key={p} type="submit" name="profile" value={p} aria-pressed={profile===p} onClick={()=>{setProfile(p);setChosen('');updateUrl(p,scope,'')}} className={`min-h-11 px-3 py-2 rounded-xl text-sm font-semibold ${profile===p?'bg-primary text-white':'bg-soft text-sub hover:bg-track'}`}>{t(`profiles.${p}`)}</button>)}</div></fieldset>
        <fieldset><legend className="text-sm text-sub mb-2">{t('scopeLabel')}</legend><div className="flex gap-2">{(['all','weekend'] as Scope[]).map(s=><button key={s} type="button" aria-pressed={scope===s} onClick={()=>{setScope(s);setChosen('');updateUrl(profile,s,'')}} className={`min-h-11 px-3 py-2 rounded-xl text-sm font-semibold ${scope===s?'bg-primary text-white':'bg-soft text-sub hover:bg-track'}`}>{t(`scopes.${s}`)}</button>)}</div></fieldset>
        {config.indoor&&<fieldset><legend className="text-sm text-sub mb-2">{t('areaLabel')}</legend><div className="flex gap-2">{(['all','indoor'] as VisitArea[]).map(a=><button key={a} type="button" aria-pressed={area===a} onClick={()=>{setArea(a);setChosen('');updateUrl(profile,scope,'',a)}} className={`min-h-11 px-3 py-2 rounded-xl text-sm font-semibold ${area===a?'bg-primary text-white':'bg-soft text-sub hover:bg-track'}`}>{t(`areas.${a}`)}</button>)}</div></fieldset>}
      </form>
      {config.indoor&&<p className="text-sm text-muted mb-6 leading-relaxed">{t('areaNote')}</p>}
      {featured ? <section aria-label={t('best')} className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-10">
        <div className="ui-card p-5 sm:p-7 lg:col-span-2 scroll-mt-20" id="everland-result">
          <div className="flex justify-between gap-3 items-start mb-6"><div><p className="text-sm text-primary font-semibold">{t(pageDate?'selected':featured.caution?'relativeBest':'best')}</p><h2 className="mt-2 text-3xl font-bold text-fg"><a href={dateUrl(featured.date)}>{dateLabel(featured)}</a></h2><p className="text-xs text-muted mt-2">{t(featured.tentative?'tentative':'nearby')}</p></div><div className="text-right shrink-0"><p className="text-xs text-muted">{t('score')}</p><p className="text-3xl font-bold text-primary tabular-nums mt-1">{featured.score}<span className="text-sm ml-1 font-medium">{t('scoreUnit')}</span></p></div></div>
          {metrics(featured)}
          <div className="bg-subtle rounded-2xl p-4 sm:p-5 mt-6"><h3 className="font-semibold text-fg mb-3">{t('reasonTitle')}</h3>{reasons(featured)}</div>
          {featured.caution && <p className="mt-4 text-sm text-body font-semibold" role="status">{t('caution')}</p>}
          <p className="text-xs text-muted my-4 leading-relaxed">{t('scoreHelp')}</p>
          <ShareResult card={{tool:t('eyebrow'),label:t('shareLabel'),headline:dateLabel(featured),sub:t(`profiles.${profile}`),rows:[{label:t('weather'),value:`${number(featured.low)}~${number(featured.high)}°C`},{label:t('rain'),value:`${featured.rain} mm`},{label:t('crowdLabel'),value:t(`crowd.${featured.crowd}`)}]}} url={`https://toolhub.ai.kr${basePath}?${params(featured.date)}`} fileName={`${park}-${featured.date}`} />
        </div>
        <div className="space-y-3"><h2 className="text-lg font-bold text-fg">{t('alternatives')}</h2>{top.filter(d=>d.date!==featured.date).slice(0,2).map((day)=><a key={day.date} href={dateUrl(day.date)} className="ui-card p-5 block hover:border-primary transition-colors"><p className="text-xs text-muted">{t('topRank',{rank:top.indexOf(day)+1})}</p><div className="flex justify-between gap-2 mt-2"><h3 className="text-lg font-bold text-fg">{dateLabel(day)}</h3><span className="font-semibold text-primary tabular-nums">{day.score}{t('scoreUnit')}</span></div><p className="text-sm text-body mt-3">{number(day.low)}~{number(day.high)}°C · {day.rain} mm</p><p className="text-sm text-sub mt-1">{t(`crowd.${day.crowd}`)}</p><p className="text-xs text-muted mt-3 leading-relaxed">{t(`reasons.${day.reasons[0]}`)}</p>{day.tentative&&<p className="text-xs text-muted mt-2">{t('tentative')}</p>}</a>)}<p className="text-xs text-muted leading-relaxed px-1">{t('visitWindow')}</p></div>
      </section> : <div className="ui-card p-6 mb-8" role="status"><h2 className="text-xl font-bold text-fg mb-3">{t(days.length?'none':'noData')}</h2><p className="text-sub leading-relaxed">{t(days.length?'noScope':'noDataHelp')}</p><a href={basePath} className="inline-block ui-btn px-4 py-3 mt-5">{t('refresh')}</a></div>}
      {!!days.length && <section className="mb-10" aria-labelledby="everland-dates"><h2 id="everland-dates" className="text-xl font-bold text-fg">{t('dateList')}</h2><p className="text-sm text-sub mt-2 mb-4">{t('dateListIntro')}</p><div className="flex gap-2 overflow-x-auto pb-3" role="group" aria-label={t('dateList')}>{days.filter(d=>scope==='all'||d.weekday===0||d.weekday===6||d.holiday).map(day=><button key={day.date} aria-pressed={selected?.date===day.date} onClick={()=>selectDay(day.date)} className={`shrink-0 w-32 text-left p-4 rounded-2xl border ${selected?.date===day.date?'border-primary bg-primary-soft text-primary':'border-line bg-surface text-body hover:bg-subtle'}`}><span className="block text-sm font-semibold">{dateLabel(day)}</span><span className="block text-2xl font-bold mt-3 tabular-nums">{day.score}<span className="text-xs ml-1">{t('scoreUnit')}</span></span><span className="block text-xs mt-2">{number(day.low)}~{number(day.high)}°C</span><span className="block text-xs mt-1">{day.rain} mm</span><span className="block text-xs mt-3">{t(`crowd.${day.crowd}`)}</span></button>)}</div></section>}
      {selected && <section className="ui-card p-5 sm:p-7 mb-10 scroll-mt-20" id="everland-date-detail" aria-live="polite"><div className="flex flex-wrap justify-between gap-3 mb-6"><div><p className="text-sm text-primary font-semibold">{t('selected')}</p><h2 className="text-2xl font-bold text-fg mt-2">{dateLabel(selected)}</h2></div><a className="text-sm text-primary underline self-end" href={dateUrl(selected.date)}>{t('fullDateLink')}</a></div>
        {metrics(selected)}<div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-7"><div><h3 className="font-bold text-fg mb-3">{t('reasonTitle')}</h3>{reasons(selected)}{best&&<p className="text-sm text-sub mt-4">{selected.score===best.score?t('sameBest'):t('difference',{value:best.score-selected.score})}</p>}{selected.caution&&<p className="mt-4 text-sm font-semibold">{t('caution')}</p>}</div><div><h3 className="font-bold text-fg mb-3">{t('dayDetail')}</h3><div className="overflow-x-auto"><table className="w-full text-sm text-left"><thead><tr className="text-muted"><th className="py-2 font-medium">{t('hourlyTime')}</th><th className="font-medium">{t('temperature')}</th><th className="font-medium">{t('rainfall')}</th><th className="font-medium">{t('windSpeed')}</th></tr></thead><tbody>{selected.slots.map(slot=><tr key={slot.start} className="border-t border-line tabular-nums"><td className="py-2 pr-3 whitespace-nowrap">{hour(slot.start)}–{hour(slot.end)}</td><td className="pr-3">{number(slot.temperature)}°C</td><td className="pr-3">{number(slot.rain)} mm</td><td>{number(slot.wind)} m/s</td></tr>)}</tbody></table></div></div></div>
        <div className="mt-5 space-y-2 text-xs text-muted leading-relaxed">{selected.coarse&&<p>{t('coarse')}</p>}{selected.tentative&&<p>{t('tentative')}</p>}<p>{t('prorated')}</p></div>
      </section>}
      <section className="mb-10 flex flex-wrap items-center justify-between gap-4 bg-subtle rounded-2xl p-6"><div><h2 className="text-lg font-bold text-fg">{t('mapTitle')}</h2><p className="text-sm text-sub mt-2">{t('mapIntro')}</p></div><a href={`${basePath}map/`} className="ui-btn px-5 py-3 text-sm">{t('mapTab')}</a></section>
    </>}
    <section className="border-t border-line pt-7 mt-6" aria-labelledby="everland-method"><h2 id="everland-method" className="text-xl font-bold text-fg mb-5">{t('sourceTitle')}</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-7 text-sm leading-relaxed"><div><h3 className="font-bold text-fg mb-2">{t('methodologyTitle')}</h3><p>{t('methodology')}</p><p className="mt-3">{t('limitations')}</p><details className="mt-4"><summary className="cursor-pointer text-sub">{t('score')}</summary><p className="mt-3">{t('safetyRule')}</p><p className="mt-3">{t('staleRule')}</p><p className="mt-3">{t('todayPartial')}</p></details></div><div><a className="text-primary underline font-semibold" href="https://api.met.no/weatherapi/locationforecast/2.0/documentation">{t('weatherSource')}</a><p className="mt-2">{t('weatherSourceDetail')}</p>{forecast&&<dl className="mt-3 text-sub"><div>{t('issued')}: <time dateTime={forecast.issuedAt}>{time(forecast.issuedAt)}</time></div><div>{t('fetched')}: <time dateTime={forecast.fetchedAt}>{time(forecast.fetchedAt)}</time></div></dl>}<p className="mt-3 text-xs text-muted">{t('timezone')}</p><div className="flex flex-wrap gap-x-4 gap-y-2 mt-4"><a className="text-primary underline" href="https://api.met.no/doc/License">{t('license')}</a><a className="text-primary underline" href="https://www.weather.go.kr/w/index.do">{t('officialWeather')}</a><a className="text-primary underline" href={config.official}>{t('official')}</a></div></div></div>
    </section>
    <section className="mt-10"><h2 className="text-xl font-bold text-fg mb-4">{t('faqTitle')}</h2><div className="divide-y divide-line">{(t.raw('faq') as {q:string;a:string}[]).map(item=><details key={item.q} className="py-4"><summary className="font-semibold text-fg cursor-pointer leading-relaxed">{item.q}</summary><p className="text-sm text-sub mt-3 leading-relaxed">{item.a}</p></details>)}</div></section>
    <footer className="text-xs text-muted mt-8 border-t border-line pt-5">{t('independent')}</footer>
  </div>
}
