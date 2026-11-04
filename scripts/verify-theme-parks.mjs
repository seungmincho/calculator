import { chromium } from 'playwright'
import assert from 'node:assert/strict'
import { mkdir,writeFile } from 'node:fs/promises'
const base=process.argv[2]??'http://127.0.0.1:8791',dir='.wrangler/park-expansion/evidence'
await mkdir(dir,{recursive:true})
const browser=await chromium.launch({headless:true}),context=await browser.newContext({viewport:{width:1280,height:960},serviceWorkers:'block'}),page=await context.newPage(),errors=[]
page.on('pageerror',error=>errors.push(error.message))
const results=[]
try{
 for(const park of ['lotte-world','gyeongju-world']){
  const response=await context.request.get(`${base}/${park}/`),html=await response.text()
  assert.equal(response.status(),200)
  assert.ok(html.includes('everland-result'),'recommendation exists without JavaScript')
  assert.ok(html.includes(`rel="canonical" href="https://toolhub.ai.kr/${park}/"`))
  assert.ok(html.includes(`og/${park}.png`))
  assert.ok(!html.includes('name="robots" content="noindex"'))
  const props=JSON.parse(html.match(/<script id="everland-data" type="application\/json">(.*?)<\/script>/s)[1])
  assert.equal(props.park,park);assert.ok(props.forecast.slots.length>20)
  await page.goto(`${base}/${park}/`,{waitUntil:'networkidle'})
  assert.equal(await page.locator('h1').count(),1)
  if(park==='lotte-world'){
   const indoor=page.getByRole('button',{name:'실내 위주',exact:true})
   await indoor.click();assert.equal(await indoor.getAttribute('aria-pressed'),'true');assert.ok(page.url().includes('area=indoor'))
   await page.reload({waitUntil:'networkidle'});assert.equal(await indoor.getAttribute('aria-pressed'),'true')
   assert.match(await page.locator('#everland-result').innerText(),/실내/)
  }
  await page.getByRole('button',{name:'아이와 함께',exact:true}).click()
  await page.getByRole('button',{name:'주말·공휴일만',exact:true}).click()
  for(const text of await page.getByRole('group',{name:'날짜별로 비교하기'}).getByRole('button').allTextContents())assert.match(text,/토|일/)
  await page.getByRole('button',{name:'평일 포함',exact:true}).click()
  await page.getByRole('group',{name:'날짜별로 비교하기'}).getByRole('button').last().click()
  const selected=await page.locator('#everland-date-detail h2').innerText()
  await page.reload({waitUntil:'networkidle'});assert.equal(await page.locator('#everland-date-detail h2').innerText(),selected)
  const dateUrl=await page.getByRole('link',{name:'이 날짜의 예보 페이지'}).getAttribute('href'),dateResponse=await context.request.get(base+dateUrl)
  assert.equal(dateResponse.status(),200);assert.ok((await dateResponse.text()).includes(`rel="canonical" href="https://toolhub.ai.kr/${park}/date/`))
  const downloadPromise=page.waitForEvent('download');await page.getByRole('button',{name:'이미지 저장',exact:true}).click();await(await downloadPromise).saveAs(`${dir}/${park}-share.png`)
  await page.screenshot({path:`${dir}/${park}-desktop.png`,fullPage:true})
  for(const width of [390,320]){
   await page.setViewportSize({width,height:844});await page.evaluate(()=>scrollTo(0,0))
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`no ${park} overflow at ${width}`)
   const preview=await page.locator('a[href="#everland-result"]').boundingBox()
   assert.ok(preview&&preview.y+preview.height<844,'mobile recommendation visible before filters')
   if(width===390){await page.screenshot({path:`${dir}/${park}-mobile.png`,fullPage:true});await page.screenshot({path:`${dir}/${park}-fold.png`})}
  }
  await page.setViewportSize({width:1280,height:960});await page.goto(`${base}/${park}/map/`,{waitUntil:'networkidle'})
  const frame=page.frameLocator('#everland-map-frame'),expected=park==='lotte-world'?42:26
  await frame.locator('.map img').first().waitFor()
  assert.equal(await frame.locator('.pin').count(),expected)
  const zones=await frame.locator('#area option').evaluateAll(nodes=>nodes.map(n=>n.value))
  assert.equal(zones.length,park==='lotte-world'?6:1)
  for(const zone of zones){
   await frame.locator('#area').selectOption(zone)
   await frame.locator(`[data-area="${zone}"] img`).evaluate(img=>img.complete?Promise.resolve():new Promise((resolve,reject)=>{img.onload=resolve;img.onerror=reject}))
   assert.ok(await frame.locator(`[data-area="${zone}"] img`).evaluate(img=>img.naturalWidth>600))
  }
  const ride=park==='lotte-world'?'아트란티스':'드라켄'
  await frame.locator('#search').fill(ride);assert.equal(await frame.locator('.pin:visible').count(),1)
  await frame.locator('.pin:visible').click();assert.ok((await frame.locator('#selected').innerText()).includes(ride))
  await frame.locator('#zoom-in').click();assert.equal(await frame.locator('.viewport:visible .map').evaluate(el=>el.style.width),'150%')
  await frame.locator('#search').fill('');await frame.locator('#zoom-reset').click()
  if(park==='lotte-world')await frame.locator('#area').selectOption(zones[0])
  await page.screenshot({path:`${dir}/${park}-map.png`,fullPage:true})
  await page.setViewportSize({width:390,height:844})
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth))
  await page.screenshot({path:`${dir}/${park}-map-mobile.png`,fullPage:true})
  await page.evaluate(()=>document.documentElement.classList.add('dark'));await page.screenshot({path:`${dir}/${park}-dark.png`,fullPage:true})
  const board=await context.request.get(`${base}/${park}/board/`)
  assert.equal(board.headers()['x-robots-tag'],'noindex')
  const sitemap=await context.request.get(`${base}/${park}/sitemap.xml`);assert.equal(sitemap.status(),200);assert.ok((await sitemap.text()).includes(`/${park}/date/`))
  const expired=await context.request.get(`${base}/${park}/date/2020-01-01/`);assert.equal(expired.status(),404)
  await page.setViewportSize({width:1280,height:960});results.push({park,pins:expected,zones:zones.length,ssr:true,urlRestore:true,share:true,mobile:true,sitemap:true})
 }
 assert.deepEqual(errors,[])
 await writeFile(`${dir}/results.json`,JSON.stringify({base,results,errors},null,2));console.log(JSON.stringify({base,results,errors}))
}finally{await browser.close()}
