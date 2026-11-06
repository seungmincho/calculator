import { renderToString } from 'react-dom/server.edge'
import EverlandPlanner, { type PlannerProps } from '../../components/EverlandPlanner'
import { visitDays } from './planner.ts'
import { escapeHtml } from './render.ts'
import { plannerMessages } from '../theme-parks/messages.ts'
import { calendarMonths, hasCalendar } from '../theme-parks/calendar.ts'
const origin = 'https://toolhub.ai.kr'
export const safeJson = (value: unknown) => JSON.stringify(value).replace(/</g,'\\u003c').replace(/\u2028/g,'\\u2028').replace(/\u2029/g,'\\u2029')
export function renderPlanner(props: PlannerProps, styles: string) {
  const park = props.park ?? 'everland'
  const base = `/${park}/`
  const m = plannerMessages(park)
  const cal = props.view==='calendar' ? props.calendar : undefined
  const calMonth = cal ? String(Number(cal.month.slice(5))) : ''
  const path = props.view==='map' ? `${base}map/` : cal ? `${base}calendar/${cal.month}/` : props.pageDate ? `${base}date/${props.pageDate}/` : base
  const title = props.view==='map' ? m.mapTitle : cal ? m.calendar.title.replace('{month}',calMonth) : props.pageDate ? m.dateTitle.replace('{date}',props.pageDate) : `${m.title} 날씨·혼잡도 방문 추천`
  const description = cal ? m.calendar.metaDescription.replace('{year}',cal.month.slice(0,4)).replace('{month}',calMonth) : props.pageDate ? m.dateDescription.replace('{date}',props.pageDate) : m.staticIntro
  const schema = [
    {'@context':'https://schema.org','@type':'WebApplication',name:m.eyebrow,url:origin+path,description,applicationCategory:'TravelApplication',operatingSystem:'Any',offers:{'@type':'Offer',price:'0',priceCurrency:'KRW'},dateModified:props.forecast?.issuedAt},
    {'@context':'https://schema.org','@type':'BreadcrumbList',itemListElement:[{'@type':'ListItem',position:1,name:'툴허브',item:origin+'/'},{'@type':'ListItem',position:2,name:m.eyebrow,item:origin+base},...(path===base?[]:[{'@type':'ListItem',position:3,name:title,item:origin+path}])]},
  ]
  // Forecast text and reasons are server-rendered, even when JavaScript is disabled.
  return `<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="theme-color" content="#3182f6"><title>${escapeHtml(title)} | 툴허브</title><meta name="description" content="${escapeHtml(description)}"><link rel="canonical" href="${origin+path}"><meta property="og:type" content="website"><meta property="og:title" content="${escapeHtml(title)}"><meta property="og:description" content="${escapeHtml(description)}"><meta property="og:url" content="${origin+path}"><meta property="og:image" content="${origin}/og/${park}.png"><meta name="twitter:card" content="summary_large_image"><meta name="twitter:image" content="${origin}/og/${park}.png"><link rel="icon" href="/favicon.ico">${styles}<style>body{margin:0;font-family:var(--font-sans,system-ui,sans-serif);background:var(--canvas);color:var(--body)}button,a,summary,input{touch-action:manipulation}button:focus-visible,a:focus-visible,summary:focus-visible{outline:3px solid var(--primary);outline-offset:3px}</style><script>try{if(localStorage.getItem('theme')==='dark'||(!localStorage.getItem('theme')&&matchMedia('(prefers-color-scheme:dark)').matches))document.documentElement.classList.add('dark')}catch{}</script></head><body><header class="border-b border-line"><div class="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between"><a href="/" class="text-xl font-bold text-fg">${escapeHtml(m.home)}</a><a href="/" class="text-sm text-sub">${escapeHtml(m.allTools)}</a></div></header><main id="everland-root">${renderToString(<EverlandPlanner {...props}/>)}</main><script type="application/ld+json">${safeJson(schema)}</script><script id="everland-data" type="application/json">${safeJson(props)}</script><script type="module" src="/everland-assets/planner.js?v=20261106-picks"></script></body></html>`
}
export function dateSitemap(props: PlannerProps) {
  const park = props.park ?? 'everland', base = `/${park}/`
  return `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${[base,`${base}map/`,...(hasCalendar(park)?calendarMonths(props.now).map(m=>`${base}calendar/${m}/`):[]),...visitDays(props.forecast,'balanced',props.now,park).map(d=>`${base}date/${d.date}/`)].map(path=>`<url><loc>${origin+path}</loc>${props.forecast?`<lastmod>${props.forecast.issuedAt}</lastmod>`:''}</url>`).join('')}</urlset>`
}
