import type { Env } from '../everland/storage.ts'
import { readForecast, refreshForecast } from '../everland/weather.ts'
import { forecastFresh, visitDays, type Profile, type Scope } from '../everland/planner.ts'
import { renderPlanner, dateSitemap } from '../everland/page.tsx'
import { readParkSnapshot } from './storage.ts'
import { renderGuide } from './map-render.ts'
import { parks, type ParkId, type VisitArea } from './config.ts'
export interface ParkContext { request: Request; env: Env & { ASSETS: { fetch(request: Request): Promise<Response> } } }
export async function handlePark({request,env}:ParkContext,park:ParkId) {
 const url=new URL(request.url),path=url.pathname.replace(/\/+$/,''),base=`/${park}`
 const suffix=path.slice(base.length),date=suffix.match(/^\/date\/(\d{4}-\d{2}-\d{2})$/)?.[1],now=Date.now()
 if (!path.startsWith(base) || (!['','/map','/sitemap.xml','/board'].includes(suffix)&&!date)) return new Response('Not found',{status:404,headers:{'X-Robots-Tag':'noindex'}})
 if (suffix==='/board') {
  if(park==='everland')return Response.redirect(new URL('/everland-board/',url.origin),302)
  let snapshot=null
  if(env.EVERLAND_DB&&parks[park].providerId)try{snapshot=await readParkSnapshot(env.EVERLAND_DB,park)}catch{/* The guide remains available without operation data. */}
  return new Response(renderGuide(park,snapshot,now),{headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store','X-Robots-Tag':'noindex','X-Frame-Options':'SAMEORIGIN','X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'none'; img-src 'self'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; frame-ancestors 'self'; base-uri 'none'; form-action 'none'"}})
 }
 let forecast=null
 if(env.EVERLAND_DB){try{forecast=await readForecast(env.EVERLAND_DB,park)}catch{/* Preserve a usable static page if storage is unavailable. */}
  if(!forecast||now-Date.parse(forecast.fetchedAt)>3*3600000)try{forecast=await refreshForecast(env.EVERLAND_DB,fetch,now,park)}catch{/* Preserve last-known successful data. */}
 }
 if(date&&!visitDays(forecast,'balanced',now,park).some(d=>d.date===date)) return new Response(`<!doctype html><html lang="ko"><meta charset="utf-8"><meta name="robots" content="noindex"><title>확인할 수 없는 예보 날짜</title><h1>현재 확인할 수 없는 날짜입니다.</h1><p>예보 범위를 벗어났거나 갱신 중입니다.</p><a href="${base}/">최신 방문 추천 보기</a></html>`,{status:forecastFresh(forecast,now)?404:503,headers:{'Content-Type':'text/html; charset=utf-8','X-Robots-Tag':'noindex','Cache-Control':'no-store'}})
 const profile:Profile=['family','rides'].includes(url.searchParams.get('profile')??'')?url.searchParams.get('profile') as Profile:'balanced'
 const scope:Scope=url.searchParams.get('scope')==='weekend'?'weekend':'all'
 const area:VisitArea=parks[park].indoor&&url.searchParams.get('area')==='indoor'?'indoor':'all'
 const props={park,forecast,now,initialProfile:profile,initialScope:scope,initialArea:area,initialDate:date??url.searchParams.get('date')??'',pageDate:date,view:suffix==='/map'?'map' as const:'plan' as const}
 if(suffix==='/sitemap.xml')return new Response(dateSitemap(props),{headers:{'Content-Type':'application/xml; charset=utf-8','Cache-Control':'public, max-age=600'}})
 const shell=await(await env.ASSETS.fetch(new Request(new URL(`${base}/`,url.origin)))).text()
 const styles=[...shell.matchAll(/<link\b[^>]*rel="stylesheet"[^>]*>/g)].map(m=>m[0]).join('')
 if(!styles)return new Response('Site assets are updating. Please retry.',{status:503,headers:{'Cache-Control':'no-store'}})
 return new Response(renderPlanner(props,styles),{headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'public, max-age=60, s-maxage=300','X-Content-Type-Options':'nosniff','Referrer-Policy':'strict-origin-when-cross-origin','X-Frame-Options':'SAMEORIGIN'}})
}
