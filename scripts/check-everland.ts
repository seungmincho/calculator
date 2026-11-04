// Compile with esbuild (see docs/everland.md), then run. No network or production writes.
import assert from 'node:assert/strict'
import { DatabaseSync } from 'node:sqlite'
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { createServer } from 'node:http'
import { chromium } from 'playwright'
import { PARK_ID, normalize, summarize, seoulDay, stale, validLocation } from '../src/lib/everland/model.ts'
import { collect, readDashboard, type Database, type Statement } from '../src/lib/everland/storage.ts'
import { onRequestGet } from '../functions/everland-board/index.ts'
import worker from '../workers/everland/index.ts'
import { renderDashboard } from '../src/lib/everland/render.ts'

async function main() {
  const now = Date.parse('2026-11-04T02:00:00Z')
  const names = ['Zero','Missing','Closed','Down','Maintenance','Unknown','<img src=x onerror=alert(1)>']
  const children = {id:PARK_ID,children:names.map((name,i)=>({id:String(i),name,entityType:'ATTRACTION',location:{latitude:37.292+i*.0002,longitude:127.201+i*.0003}}))}
  const live = {id:PARK_ID,liveData:names.map((name,i)=>({id:String(i),name,entityType:'ATTRACTION',status:['OPERATING','OPERATING','CLOSED','DOWN','REFURBISHMENT','FUTURE_STATUS','OPERATING'][i],queue:{STANDBY:{waitTime:[0,null,50,60,70,80,20][i]}},lastUpdated:'2026-11-04T01:00:00Z'}))}
  const snapshot = normalize(children,live,new Date(now).toISOString())
  assert.deepEqual(snapshot.rides.map(r=>r.wait),[0,null,null,null,null,null,20])
  assert.equal(snapshot.rides[5].status,'UNKNOWN')
  assert.deepEqual(summarize(snapshot),{at:snapshot.fetchedAt,operating:3,reporting:2,median:10})
  assert.equal(seoulDay('2026-11-03T15:00:00Z'),'2026-11-04')
  assert.equal(seoulDay('2026-11-03T14:59:59Z'),'2026-11-03')
  assert.equal(stale(snapshot,now+1200001),true)
  assert.equal(stale(snapshot,now+1200000),false)
  assert.equal(validLocation({latitude:0,longitude:0}),null)
  assert.throws(()=>normalize(children,{id:PARK_ID,liveData:[]},snapshot.fetchedAt))
  const missing = normalize(children,{...live,liveData:live.liveData.slice(1)},snapshot.fetchedAt)
  assert.equal(missing.rides.find(r=>r.id==='0')!.status,'UNKNOWN')
  for(const bad of [-1,'10',NaN,Infinity]) {
    const malformed=structuredClone(live);malformed.liveData[0].queue.STANDBY.waitTime=bad as number
    assert.equal(normalize(children,malformed,snapshot.fetchedAt).rides[0].wait,null)
  }
  const sqlite = new DatabaseSync(':memory:')
  sqlite.exec(readFileSync('workers/everland/migrations/0001_waits.sql','utf8'))
  sqlite.exec(readFileSync('workers/everland/migrations/0002_visit_planner.sql','utf8'))
  const db: Database = {prepare(sql:string):Statement {
    let values:(string|number)[]=[]
    return {bind(...args){values=args;return this},async first<T>(){return (sqlite.prepare(sql).get(...values)??null) as T|null},async all<T>(){return {results:sqlite.prepare(sql).all(...values) as T[]}}}
  },async batch(statements){sqlite.exec('BEGIN');try{for(const s of statements)await s.all();sqlite.exec('COMMIT')}catch(e){sqlite.exec('ROLLBACK');throw e}}}
  const emptyResponse = await onRequestGet({request:new Request('https://toolhub.ai.kr/everland-board/'),env:{EVERLAND_DB:db}})
  assert.equal(emptyResponse.status,200)
  const emptyHtml = await emptyResponse.text()
  assert.ok(emptyHtml.includes('아직 수집된 기록이 없습니다.'))
  assert.ok(emptyHtml.includes('/everland-assets/guide-map.webp'),'reference map remains available without live waits')
  const onePointHtml = renderDashboard(snapshot,[summarize(snapshot)],'ko',false,now)
  assert.ok(onePointHtml.includes('오늘의 기록이 아직 충분하지 않습니다.'))
  assert.ok(onePointHtml.includes('2023년'))
  const fixtureFetch: typeof fetch = async input => new Response(JSON.stringify(String(input).endsWith('/children')?children:live))
  await collect(db,fixtureFetch,now-10*60000)
  await collect(db,fixtureFetch,now)
  await collect(db,fixtureFetch,now)
  assert.equal((await readDashboard(db,now)).history.length,2,'cron retries are idempotent')
  const failedFetch: typeof fetch=async()=>new Response('',{status:429})
  await assert.rejects(()=>collect(db,failedFetch,now+600000))
  assert.equal((await readDashboard(db,now)).snapshot!.fetchedAt,snapshot.fetchedAt,'failure preserves previous success time')
  await collect(db,fixtureFetch,now-9*86400000)
  await collect(db,fixtureFetch,now)
  assert.equal(sqlite.prepare('SELECT count(*) AS n FROM everland_snapshots').get()!.n,2,'retention removes expired data')
  assert.equal((await worker.fetch()).status,404)
  const request=new Request('https://toolhub.ai.kr/everland-board/')
  assert.equal((await onRequestGet({request,env:{}})).status,503)
  const response=await onRequestGet({request,env:{EVERLAND_DB:db}})
  assert.equal(response.headers.get('x-frame-options'),'SAMEORIGIN')
  assert.match(response.headers.get('content-type')!,/text\/html/)
  const html=await response.text()
  assert.ok(html.includes('&lt;img src=x onerror=alert(1)&gt;'))
  assert.ok(!html.includes('<img src=x onerror=alert(1)>'))
  assert.ok(html.includes('Powered by ThemeParks.wiki'))
  console.log('PASS: normalization, 0/missing/status, validation, KST midnight, staleness, SQLite persistence/retention/idempotency, 429 preservation, HTML escaping and frame policy')

  if(process.env.EVERLAND_BROWSER_TEST!=='1')return
  // Synthetic fixtures above; never use them in the shipped page or collector.
  // Refresh fixture timestamps so stale UI is tested separately from ordinary rendering.
  await collect(db,fixtureFetch,Date.now()-600000)
  await collect(db,fixtureFetch,Date.now())
  const server=createServer(async(req,res)=>{
    const request=new Request(`http://localhost:4141${req.url}`)
    const response=await onRequestGet({request,env:{EVERLAND_DB:db}})
    res.writeHead(response.status,Object.fromEntries(response.headers));res.end(await response.text())
  }).listen(4141,'127.0.0.1')
  const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']})
  try{
    const page=await browser.newPage({viewport:{width:390,height:844}})
    const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message))
    await page.goto('http://127.0.0.1:4141/everland-board/')
    assert.ok(await page.locator('.ride').count()>=7)
    assert.equal(await page.locator('#stale').isVisible(),false)
    await page.locator('#search').fill('Zero')
    assert.equal(await page.locator('.ride:visible').count(),1)
    assert.match(await page.locator('.ride:visible').innerText(),/0분/)
    await page.locator('#search').fill('not found')
    assert.equal(await page.locator('#no-matches').isVisible(),true)
    await page.locator('#search').fill('')
    await page.locator('#filter').selectOption('DOWN')
    assert.equal(await page.locator('.ride:visible').count(),1)
    await page.locator('#filter').selectOption('')
    await page.locator('#sort').selectOption('wait')
    assert.match(await page.locator('.ride').first().innerText(),/Zero/)
    await page.locator('.pin').first().click()
    assert.ok((await page.locator('#selected').innerText()).length>0)
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,'mobile overflow')
    await page.locator('summary').click()
    assert.ok(await page.locator('tbody tr').count()>=2)
    mkdirSync('/tmp/everland-evidence',{recursive:true})
    await page.screenshot({path:'/tmp/everland-evidence/mobile-fixture.png',fullPage:true})
    await page.setViewportSize({width:1200,height:900})
    await page.screenshot({path:'/tmp/everland-evidence/desktop-fixture.png',fullPage:true})
    await page.goto('http://127.0.0.1:4141/everland-board/?lang=en')
    assert.equal(await page.locator('h1').innerText(),'Everland wait-time dashboard')
    assert.deepEqual(errors,[])
    writeFileSync('/tmp/everland-evidence/results.json',JSON.stringify({unit:'passed',browser:'passed',errors,fixtures:true},null,2))
    console.log('PASS: Chromium mobile/desktop, search, empty filter, status filter, sort, map selection, trend table, English, no overflow/JS errors')
  }finally{await browser.close();server.close();sqlite.close()}
}
main().catch(e=>{console.error(e);process.exitCode=1})
