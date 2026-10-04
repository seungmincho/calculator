// Start before deployment, then deploy in another terminal while this browser remains open.
// node scripts/check-pwa-live-update.mjs --url https://toolhub.ai.kr --from v4.31.18 --to v4.31.19 --result report.json
// After deployment, --previous-deployment https://<old-deployment>.pages.dev bootstraps the real old assets through a browser-only proxy.
import assert from 'node:assert/strict'
import {mkdirSync,writeFileSync,readFileSync} from 'node:fs'
import {resolve} from 'node:path'
import {chromium} from 'playwright'

const args=process.argv.slice(2),option=key=>args[args.indexOf(key)+1]
const origin=new URL(option('--url')).origin,from=option('--from'),to=option('--to'),report=resolve(option('--result'))
const previousDeployment=args.includes('--previous-deployment')?new URL(option('--previous-deployment')).origin:null
const m=JSON.parse(readFileSync(new URL('../messages/ko.json',import.meta.url))).youthRentSubsidy
const browser=await chromium.launch({headless:true}),results=[]
try{
  const context=await browser.newContext({viewport:{width:390,height:844},serviceWorkers:'allow'})
  let bootstrapPrevious=!!previousDeployment
  await context.route('**/*',async route=>{
    const url=new URL(route.request().url())
    if(url.origin!==origin)return route.abort()
    if(bootstrapPrevious){
      const response=await route.fetch({url:previousDeployment+url.pathname+url.search})
      return route.fulfill({response})
    }
    return route.continue()
  })
  const page=await context.newPage()
  await page.goto(origin+'/',{waitUntil:'load'})
  let initialized=false
  const initializationDeadline=Date.now()+30000
  while(Date.now()<initializationDeadline){
    initialized=await page.evaluate(async version=>{
      const registration=await navigator.serviceWorker.getRegistration()
      return registration?.active?.state==='activated'&&!!navigator.serviceWorker.controller&&
        (await caches.keys()).includes(`toolhub-static-${version}`)
    },from)
    if(initialized)break
    await new Promise(done=>setTimeout(done,200))
  }
  assert.ok(initialized,'Previous service worker did not activate before the deadline')
  await page.goto(origin+'/youth-rent-subsidy/',{waitUntil:'load'})
  const oldText=await page.locator('main').innerText()
  assert.ok(oldText.includes('12개월'),'Old production page must show the prior 12-month policy')
  const oldKeys=await page.evaluate(()=>caches.keys())
  assert.ok(oldKeys.includes(`toolhub-static-${from}`))
  results.push({name:'existing-production-client-and-old-policy',status:'PASS',cacheNames:oldKeys})
  console.log('READY: existing production client is controlled by '+from+'; waiting for deployment of '+to)
  bootstrapPrevious=false

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

  await page.reload({waitUntil:'load'})
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
  writeFileSync(report,JSON.stringify({at:new Date().toISOString(),origin,from,to,previousDeployment,bootstrap:previousDeployment?'archived-deployment-browser-proxy':'live-before-deployment',results},null,2))
}
for(const result of results)console.log(JSON.stringify(result))
process.exitCode=results.some(result=>result.status==='FAIL')?1:0
