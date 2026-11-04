import { chromium } from 'playwright'
import assert from 'node:assert/strict'
const base=process.argv[2]??'https://toolhub.ai.kr'
const browser=await chromium.launch(),page=await browser.newPage({viewport:{width:390,height:844},serviceWorkers:'block'}),errors=[]
page.on('pageerror',e=>errors.push(e.message))
try{
 for(const [park,name] of [['lotte-world','롯데월드'],['gyeongju-world','경주월드']]){
  await page.goto(base+'/',{waitUntil:'networkidle'})
  await page.getByPlaceholder('도구 이름으로 필터링...').fill(name)
  const entry=page.locator(`a[href="/${park}/"]:visible`).first()
  assert.ok(await entry.isVisible())
  if(new URL(base).hostname==='127.0.0.1')await page.goto(`${base}/${park}/`,{waitUntil:'networkidle'})
  else await entry.click()
  await page.waitForFunction(()=>!!document.getElementById('everland-data'))
  assert.ok(await page.locator('#everland-result').isVisible())
  assert.match(await page.locator('h1').innerText(),new RegExp(name))
  await page.evaluate(()=>localStorage.setItem('theme','dark'));await page.reload({waitUntil:'networkidle'})
  assert.equal(await page.locator('html').getAttribute('class'),'dark')
  const bot=await fetch(`${base}/${park}/`,{headers:{'User-Agent':'OAI-SearchBot'}})
  assert.equal(bot.status,200);assert.ok((await bot.text()).includes('everland-result'))
  await page.goto(`${base}/${park}/map/`,{waitUntil:'networkidle'})
  const frame=page.frameLocator('#everland-map-frame')
  await frame.locator('.pin:visible').first().waitFor()
  const markers=await frame.locator('.pin:visible').evaluateAll(nodes=>nodes.map(n=>{const r=n.getBoundingClientRect();return{x:r.x,y:r.y}}))
  for(let i=0;i<markers.length;i++)for(let j=i+1;j<markers.length;j++)assert.ok(Math.abs(markers[i].x-markers[j].x)>=37.9||Math.abs(markers[i].y-markers[j].y)>=37.9,'overview markers do not overlap')
  for(let i=0;i<14;i++)await frame.locator('#zoom-in').click()
  assert.equal(await frame.locator('.viewport:visible .pin:visible').count(),await frame.locator('.viewport:visible .pin').count(),'zoom can reveal every facility in current zone')
  await frame.locator('#zoom-reset').click()
  await page.screenshot({path:`.wrangler/park-expansion/evidence/${park}-production-mobile.png`,fullPage:true})
 }
 assert.deepEqual(errors,[]);console.log(JSON.stringify({base,homeEntry:true,nextNavigation:true,dark:true,botHtml:true,overlapFree:true,zoomAll:true,errors}))
}finally{await browser.close()}
