import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { DatabaseSync } from 'node:sqlite'
import { visitDays, type Forecast } from '../src/lib/everland/planner.ts'
import { refreshForecast, readForecast } from '../src/lib/everland/weather.ts'
import type { Database, Statement } from '../src/lib/everland/storage.ts'
import { collectPark, readParkSnapshot, normalizeSchedule, collectSchedule } from '../src/lib/theme-parks/storage.ts'
import { parks, PARK_IDS } from '../src/lib/theme-parks/config.ts'
import { guide } from '../src/lib/theme-parks/maps.ts'
import { renderGuide } from '../src/lib/theme-parks/map-render.ts'
import { renderPlanner, dateSitemap } from '../src/lib/everland/page.tsx'
import { calendarMonth, calendarMonths } from '../src/lib/theme-parks/calendar.ts'
import { handlePark } from '../src/lib/theme-parks/handler.ts'

async function main(){
 const now=Date.parse('2026-11-04T00:00:00Z'),forecast:Forecast={issuedAt:new Date(now).toISOString(),fetchedAt:new Date(now).toISOString(),slots:Array.from({length:24*8},(_,i)=>({start:new Date(now+i*3600000).toISOString(),end:new Date(now+(i+1)*3600000).toISOString(),temperature:8,wind:6,rain:.5,symbol:'rain'}))}
 const outdoor=visitDays(forecast,'balanced',now,'lotte-world','all')[0],indoor=visitDays(forecast,'balanced',now,'lotte-world','indoor')[0]
 assert.ok(indoor.score>outdoor.score,'indoor shelter changes suitability')
 assert.equal(indoor.crowd,outdoor.crowd,'weather mode never fabricates a crowd reduction')
 assert.ok(indoor.reasons.includes('indoor'))
 assert.deepEqual(visitDays(forecast,'balanced',now,'gyeongju-world','indoor'),visitDays(forecast,'balanced',now,'gyeongju-world','all'),'outdoor-only parks cannot opt into shelter scoring')
 const severe={...forecast,slots:forecast.slots.map(s=>({...s,rain:5,wind:20,symbol:'heavyrainandthunder'}))}
 assert.ok(visitDays(severe,'family',now,'lotte-world','indoor').every(d=>d.caution&&d.score<=65))
 assert.ok(visitDays(severe,'rides',now,'gyeongju-world').every(d=>d.caution&&d.score<=45))
 for(const park of ['lotte-world','gyeongju-world'] as const){
  const map=guide(park);assert.equal(new Set(map.rides.map(r=>r.number)).size,map.rides.length)
  assert.ok(map.rides.every(r=>r.x>0&&r.x<100&&r.y>0&&r.y<100))
  assert.equal(map.rides.length,park==='lotte-world'?42:26)
  for(const area of map.zones)assert.ok(map.rides.some(r=>r.zone===area.id))
  const props={park,forecast,now,initialArea:'indoor' as const},html=renderPlanner(props,'<link rel="stylesheet" href="/x.css">')
  assert.ok(html.includes(`rel="canonical" href="https://toolhub.ai.kr/${park}/"`))
  assert.ok(html.includes(`og/${park}.png`))
  assert.ok(html.includes(parks[park].name))
  assert.ok(dateSitemap(props).includes(`/${park}/date/2026-11-05/`))
  const board=renderGuide(park,null,now);assert.ok(board.includes('/park-assets/'))
  assert.ok(board.includes(park==='lotte-world'?'대기시간 숫자는 제공되지':'실시간 운영·대기시간은 현재 연결되어 있지'))
 }
 const sqlite=new DatabaseSync(':memory:');for(const f of ['0002_visit_planner.sql','0003_theme_parks.sql','0004_history.sql'])sqlite.exec(readFileSync(`workers/everland/migrations/${f}`,'utf8'))
 const db:Database={prepare(sql:string):Statement{let values:(string|number)[]=[];return{bind(...v){values=v;return this},async first<T>(){return(sqlite.prepare(sql).get(...values)??null)as T|null},async all<T>(){return{results:sqlite.prepare(sql).all(...values)as T[]}}}},async batch(statements){sqlite.exec('BEGIN');try{for(const s of statements)await s.all();sqlite.exec('COMMIT')}catch(e){sqlite.exec('ROLLBACK');throw e}}}
 const urls:string[]=[];const weatherFetch:typeof fetch=async(input)=>{const url=String(input);urls.push(url);const temperature=url.includes('35.837')?18:url.includes('37.511')?12:5;return new Response(JSON.stringify({properties:{meta:{updated_at:new Date(now).toISOString(),units:{air_temperature:'celsius',wind_speed:'m/s',precipitation_amount:'mm'}},timeseries:forecast.slots.map(s=>({time:s.start,data:{instant:{details:{air_temperature:temperature,wind_speed:2}},next_1_hours:{summary:{symbol_code:'clearsky_day'},details:{precipitation_amount:0}}}}))}}))}
 for(const park of PARK_IDS)await refreshForecast(db,weatherFetch,now,park)
 assert.equal(new Set(urls).size,3)
 assert.deepEqual(await Promise.all(PARK_IDS.map(async p=>(await readForecast(db,p))!.slots[0].temperature)),[5,12,18],'park forecasts remain isolated')
 await refreshForecast(db,weatherFetch,now+600000,'lotte-world');assert.equal(urls.length,3)
 await assert.rejects(()=>refreshForecast(db,async()=>new Response('',{status:429}),now+3600001,'gyeongju-world'))
 assert.equal((await readForecast(db,'gyeongju-world'))!.slots[0].temperature,18)
 const id=parks['lotte-world'].providerId,children={id,children:[{id:'ride1',entityType:'ATTRACTION',name:'Ride without a wait'}]},live={id,liveData:[{id:'ride1',entityType:'ATTRACTION',status:'OPERATING',lastUpdated:new Date(now).toISOString()}]}
 const ridesFetch:typeof fetch=async input=>new Response(JSON.stringify(String(input).endsWith('/children')?children:live))
 await collectPark(db,'lotte-world',ridesFetch,now);await collectPark(db,'lotte-world',ridesFetch,now)
 const saved=await readParkSnapshot(db,'lotte-world');assert.equal(saved!.rides[0].wait,null);assert.equal(saved!.rides[0].status,'OPERATING')
 assert.equal(sqlite.prepare('SELECT COUNT(*) AS n FROM park_snapshots').get()!.n,1)
 assert.equal(await collectPark(db,'gyeongju-world',()=>{throw new Error('must not fetch')}),null)
 await assert.rejects(()=>collectPark(db,'lotte-world',async()=>new Response('',{status:429}),now+600000));assert.equal((await readParkSnapshot(db,'lotte-world'))!.fetchedAt,saved!.fetchedAt)
 const op=(date:string,open:string,close:string,type='OPERATING')=>({date,type,openingTime:`${date}T${open}:00+09:00`,closingTime:`${date}T${close}:00+09:00`})
 const schedule={id,schedule:[op('2026-11-03','10:00','20:00'),op('2026-11-04','10:00','21:00'),op('2026-11-04','09:00','10:00','EXTRA_HOURS'),op('2026-11-05','10:00','19:00'),op('2026-11-05','12:00','22:00'),{...op('2026-11-06','10:00','21:00'),openingTime:'bad'},op('2026-11-07','21:00','10:00')]}
 assert.deepEqual(normalizeSchedule(schedule,id!).map(d=>[d.day,d.opening,d.closing]),[['2026-11-03','2026-11-03T01:00:00.000Z','2026-11-03T11:00:00.000Z'],['2026-11-04','2026-11-04T01:00:00.000Z','2026-11-04T12:00:00.000Z'],['2026-11-05','2026-11-05T01:00:00.000Z','2026-11-05T13:00:00.000Z']],'OPERATING only, merged per day, invalid dropped')
 assert.throws(()=>normalizeSchedule({...schedule,id:'other'},id!))
 await collectSchedule(db,'lotte-world',async()=>new Response(JSON.stringify(schedule)),now)
 assert.deepEqual(sqlite.prepare("SELECT day FROM park_schedules WHERE park='lotte-world' ORDER BY day").all().map(r=>r.day),['2026-11-04','2026-11-05'],'past provider days are not stored')
 assert.equal(await collectSchedule(db,'lotte-world',()=>{throw new Error('must not refetch within 12h')},now+3600000),null)
 assert.equal(await collectSchedule(db,'gyeongju-world',()=>{throw new Error('must not fetch')},now),null)
 await collectSchedule(db,'lotte-world',async()=>new Response(JSON.stringify({id,schedule:[op('2026-11-06','10:00','21:00')]})),now+86400000)
 assert.deepEqual(sqlite.prepare("SELECT day FROM park_schedules WHERE park='lotte-world' ORDER BY day").all().map(r=>r.day),['2026-11-04','2026-11-06'],'future days replaced, past kept')
 const calNow=Date.parse('2026-11-06T06:00:00Z'),at=(day:string,h:number)=>new Date(Date.parse(`${day}T00:00:00+09:00`)+h*3600000).toISOString()
 assert.deepEqual(calendarMonths(calNow),['2026-11','2026-12','2027-01','2027-02'])
 const nov=calendarMonth('2026-11',calNow,{schedules:['2026-11-06','2026-11-09','2026-11-10'].map((day,i)=>({day,opening:at(day,10),closing:at(day,i?20:21)})),daily:[{day:'2026-11-05',mean_median:13.9},{day:'2026-11-06',mean_median:15.6}]})
 assert.equal(nov.days.length,30);assert.equal(nov.days[0].weekday,0);assert.equal(nov.prev,null);assert.equal(nov.next,'2026-12');assert.equal(nov.today,'2026-11-06')
 const day=(m:typeof nov,d:string)=>m.days.find(x=>x.date===d)!
 assert.deepEqual([day(nov,'2026-11-06').crowd,day(nov,'2026-11-06').extended,day(nov,'2026-11-06').measured],['medium',true,null],'today: Friday rule, later closing flagged, partial record hidden')
 assert.equal(day(nov,'2026-11-05').measured,13.9);assert.equal(day(nov,'2026-11-09').extended,false);assert.equal(day(nov,'2026-11-11').opening,null)
 const dec=calendarMonth('2026-12',calNow,{schedules:[],daily:[]});assert.equal(day(dec,'2026-12-25').crowd,'high');assert.ok(day(dec,'2026-12-25').holiday);assert.equal(dec.prev,'2026-11')
 const calHtml=renderPlanner({park:'everland',forecast,now:calNow,view:'calendar',calendar:nov},'<link rel="stylesheet" href="/x.css">')
 assert.ok(calHtml.includes('rel="canonical" href="https://toolhub.ai.kr/everland/calendar/2026-11/"'));assert.ok(calHtml.includes('에버랜드 11월 혼잡도 달력'));assert.ok(calHtml.includes('calendar-month'))
 assert.ok(dateSitemap({park:'everland',forecast,now:calNow}).includes('/everland/calendar/2027-02/'));assert.ok(!dateSitemap({park:'gyeongju-world',forecast,now:calNow}).includes('/calendar/'))
 const realFetch=globalThis.fetch;globalThis.fetch=async()=>{throw new Error('no network in tests')}
 try{
  const env={EVERLAND_DB:db,ASSETS:{fetch:async()=>new Response('<link rel="stylesheet" href="/x.css">')}},go=(path:string,park:'everland'|'gyeongju-world'='everland')=>handlePark({request:new Request(`https://toolhub.ai.kr${path}`),env},park)
  const redirect=await go('/everland/calendar/');assert.equal(redirect.status,302)
  const target=new URL(redirect.headers.get('location')!).pathname;assert.match(target,/^\/everland\/calendar\/\d{4}-\d{2}\/$/)
  const page=await go(target);assert.equal(page.status,200);assert.ok((await page.text()).includes('calendar-month'))
  assert.equal((await go('/everland/calendar/2030-01/')).status,404);assert.equal((await go('/gyeongju-world/calendar/','gyeongju-world')).status,404)
 }finally{globalThis.fetch=realFetch}
 sqlite.close();console.log('PASS: calendar months/rules/routes, schedules, indoor/outdoor scoring, storm limits, separate forecasts/cache, absent waits, status retention, map coordinates, park-specific SSR/canonical/OG/sitemaps')
}
main().then(()=>process.exit(0)).catch(e=>{console.error(e);process.exit(1)})
