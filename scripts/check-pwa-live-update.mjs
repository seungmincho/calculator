// Start before deployment, then deploy in another terminal while this browser remains open.
// node scripts/check-pwa-live-update.mjs --url https://toolhub.ai.kr --from v4.31.18 --to v4.31.19 --result report.json
import assert from 'node:assert/strict'
import {mkdirSync,writeFileSync,readFileSync} from 'node:fs'
import {resolve} from 'node:path'
import {chromium} from 'playwright'

const args=process.argv.slice(2),option=key=>args[args.indexOf(key)+1]
const origin=new URL(option('--url')).origin,from=option('--from'),to=option('--to'),report=resolve(option('--result'))
const m=JSON.parse(readFileSync(new URL('../messages/ko.json',import.meta.url))).youthRentSubsidy
const browser=await chromium.launch({headless:true}),results=[]
try{
  const context=await browser.newContext({viewport:{width:390,height:844},serviceWorkers:'allow'})
  await context.route('**/*',route=>new URL(route.request().url()).origin===origin?route.continue():route.abort())
  const page=await context.newPage()
  await page.goto(origin+'/',{waitUntil:'networkidle'})
  await page.waitForFunction(version=>!!navigator.serviceWorker.controller&&caches.keys().then(keys=>keys.includes(`toolhub-static-${version}`)),from)
  await page.goto(origin+'/youth-rent-subsidy/',{waitUntil:'networkidle'})
  const oldText=await page.locator('main').innerText()
  assert.ok(oldText.includes('12개월'),'Old production page must show the prior 12-month policy')
  const oldKeys=await page.evaluate(()=>caches.keys())
  assert.ok(oldKeys.includes(`toolhub-static-${from}`))
  results.push({name:'existing-production-client-and-old-policy',status:'PASS',cacheNames:oldKeys})
  console.log('READY: existing production client is controlled by '+from+'; waiting for deployment of '+to)

  let upgraded=false
  const deadline=Date.now()+5*60*1000
  while(Date.now()<deadline){
    await page.evaluate(async()=>{const r=await navigator.serviceWorker.getRegistration();await r?.update()})
    const keys=await page.evaluate(()=>caches.keys())
    if(keys.includes(`toolhub-static-${to}`)&&!keys.some(key=>key.endsWith(from))){upgraded=true;break}
    await new Promise(done=>setTimeout(done,5000))
  }
  assert.ok(upgraded,'Production service worker did not upgrade before the deadline')
  const cacheNames=await page.evaluate(()=>caches.keys())
  assert.ok(cacheNames.every(key=>!key.startsWith('toolhub-')||key.endsWith(to)))
  results.push({name:'live-controller-upgrade-removes-old-caches',status:'PASS',cacheNames})

  await page.reload({waitUntil:'networkidle'})
  await page.getByRole('heading',{level:1,name:m.title}).waitFor()
  await page.getByRole('heading',{name:m.policy.closedTitle}).waitFor()
  assert.ok((await page.locator('main').innerText()).includes(m.hero.months))
  results.push({name:'previous-client-reloads-new-policy',status:'PASS'})
  mkdirSync(resolve(report,'..'),{recursive:true})
  await page.screenshot({path:resolve(report,'..','pwa-upgraded-production-mobile.png')})
  await context.close()
}catch(error){results.push({name:'pwa-live-update',status:'FAIL',message:error.stack?.slice(0,1600)||String(error)})}
finally{
  await browser.close()
  mkdirSync(resolve(report,'..'),{recursive:true})
  writeFileSync(report,JSON.stringify({at:new Date().toISOString(),origin,from,to,results},null,2))
}
for(const result of results)console.log(JSON.stringify(result))
process.exitCode=results.some(result=>result.status==='FAIL')?1:0
