import assert from 'node:assert/strict'
import { DatabaseSync } from 'node:sqlite'
import { readFileSync } from 'node:fs'
import { normalizeForecast, visitDays, recommended, type Forecast } from '../src/lib/everland/planner.ts'
import { refreshForecast, readForecast } from '../src/lib/everland/weather.ts'
import { renderPlanner, safeJson, dateSitemap } from '../src/lib/everland/page.tsx'
import { mapLocations } from '../src/lib/everland/map.ts'
import { onRequestGet } from '../functions/everland/[[path]].ts'
import type { Database, Statement } from '../src/lib/everland/storage.ts'

async function main() {
 const now=Date.parse('2026-11-04T00:00:00Z')
 const raw={properties:{meta:{updated_at:new Date(now).toISOString(),units:{air_temperature:'celsius',wind_speed:'m/s',precipitation_amount:'mm'}},timeseries:Array.from({length:10*24},(_,i)=>({time:new Date(now+i*3600000).toISOString(),data:{instant:{details:{air_temperature:20,wind_speed:2}},next_1_hours:{summary:{symbol_code:'clearsky_day'},details:{precipitation_amount:0}}}}))}}
 const forecast=normalizeForecast(raw,now), days=visitDays(forecast,'balanced',now)
 assert.equal(days[0].date,'2026-11-04','KST daytime aligns to UTC')
 assert.equal(days[0].coverage,8)
 assert.equal(days.find(d=>d.date==='2026-11-07')!.crowd,'high')
 assert.equal(days.find(d=>d.date==='2026-11-05')!.crowd,'low')
 assert.ok(recommended(days,'all')[0].date<'2026-11-07','identical weather prefers weekdays')
 assert.ok(recommended(days,'weekend').every(d=>d.weekday===0||d.weekday===6||d.holiday))
 assert.deepEqual(visitDays(forecast,'balanced',now+25*3600000),[],'stale forecasts never recommend')
 assert.deepEqual(visitDays({...forecast,slots:forecast.slots.slice(0,2)},'balanced',now),[],'partial days excluded')
 assert.throws(()=>normalizeForecast({},now))
 const missing=structuredClone(raw); (missing.properties.timeseries[1].data.next_1_hours.details as {precipitation_amount:unknown}).precipitation_amount=null
 assert.equal(normalizeForecast(missing,now).slots.length,forecast.slots.length-1,'missing rain is not zero')
 const badUnits=structuredClone(raw);badUnits.properties.meta.units.wind_speed='km/h';assert.throws(()=>normalizeForecast(badUnits,now))
 const dangerous:Forecast={...forecast,slots:forecast.slots.map(s=>({...s,rain:12,wind:12,symbol:'heavyrainandthunder'}))}
 assert.ok(visitDays(dangerous,'rides',now).every(d=>d.score<=45&&d.caution))
 assert.equal(visitDays(dangerous,'rides',now)[0].crowd,days[0].crowd,'rain never fabricates low crowd estimates')
 const coarse:Forecast={...forecast,slots:[{start:'2026-11-04T00:00:00Z',end:'2026-11-04T06:00:00Z',temperature:20,wind:2,rain:6,symbol:'rain'},{start:'2026-11-04T06:00:00Z',end:'2026-11-04T12:00:00Z',temperature:20,wind:2,rain:6,symbol:'rain'}]}
 assert.equal(visitDays(coarse,'balanced',now)[0].rain,8,'overlapping visit hours apportion cumulative precipitation')
 assert.equal(visitDays(coarse,'balanced',now)[0].coarse,true)
 assert.ok(visitDays(forecast,'balanced',now).find(d=>d.date==='2026-11-09')!.tentative)
 for(const point of Object.values(mapLocations)) assert.ok(point.x>0&&point.x<100&&point.y>0&&point.y<100)
 assert.equal(new Set(Object.values(mapLocations).map(p=>p.number)).size,Object.keys(mapLocations).length,'unique manually verified map locations')
 const html=renderPlanner({forecast,now},'<link rel="stylesheet" href="/styles.css">')
 assert.match(html,/이 날짜를 추천하는 이유/)
 assert.match(html,/월~목 평일/)
 assert.match(html,/<link rel="canonical" href="https:\/\/toolhub.ai.kr\/everland\/"/)
 assert.ok(!html.includes('noindex'))
 assert.ok(!safeJson({payload:'</script><script>alert(1)</script>'}).includes('</script>'))
 assert.ok(dateSitemap({forecast,now}).includes('/everland/date/2026-11-05/'))
 const sqlite=new DatabaseSync(':memory:');sqlite.exec(readFileSync('workers/everland/migrations/0002_visit_planner.sql','utf8'))
 const db:Database={prepare(sql:string):Statement{let values:(string|number)[]=[];return{bind(...args){values=args;return this},async first<T>(){return(sqlite.prepare(sql).get(...values)??null)as T|null},async all<T>(){return{results:sqlite.prepare(sql).all(...values)as T[]}}}},async batch(statements){for(const statement of statements)await statement.all()}}
 let calls=0;const fetcher:typeof fetch=async()=>{calls++;return new Response(JSON.stringify(raw))}
 await refreshForecast(db,fetcher,now);await refreshForecast(db,fetcher,now+600000);assert.equal(calls,1,'provider polled at most hourly')
 await assert.rejects(()=>refreshForecast(db,async()=>new Response('',{status:429}),now+3600001))
 assert.equal((await readForecast(db))!.fetchedAt,forecast.fetchedAt,'429 preserves previous forecast')
 const unavailable=await onRequestGet({request:new Request('https://toolhub.ai.kr/everland/'),env:{ASSETS:{fetch:async()=>new Response('<link rel="stylesheet" href="/styles.css">')}}})
 assert.equal(unavailable.status,200)
 assert.ok((await unavailable.text()).includes('날씨 예보를 업데이트'))
 const invalid=await onRequestGet({request:new Request('https://toolhub.ai.kr/everland/date/2026-99-99/'),env:{ASSETS:{fetch:async()=>new Response('')}}})
 assert.equal(invalid.status,503)
 sqlite.close()
 console.log('PASS: KST/day coverage, missing data, weather risk, calendar estimates, weekend filtering, coarse rain, staleness, map positions, SSR/canonical/sitemap/escaping, hourly cache, failure preservation and unavailable UI')
}
// React's browser SSR scheduler retains a MessageChannel in Node; all checks are
// awaited above, so explicitly close this one-shot test process.
main().then(()=>process.exit(0)).catch(e=>{console.error(e);process.exit(1)})
