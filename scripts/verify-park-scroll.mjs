import { chromium } from 'playwright'
import assert from 'node:assert/strict'
import { mkdir,writeFile } from 'node:fs/promises'
const base=process.argv[2]??'http://127.0.0.1:8791',dir='.wrangler/park-scroll'
await mkdir(dir,{recursive:true})
const browser=await chromium.launch(),results=[]
const fits=async page=>{
 await page.waitForFunction(()=>{
  const el=document.getElementById('everland-map-frame'),doc=el?.contentDocument
  return doc&&doc.body.offsetHeight>0&&doc.documentElement.scrollHeight<=el.clientHeight+1&&Math.abs(el.clientHeight-Math.max(600,doc.body.offsetHeight+20))<=2
 })
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'no outer horizontal overflow')
}
try{
 for(const park of ['lotte-world','gyeongju-world','everland']){
  const page=await browser.newPage({viewport:{width:1546,height:900},serviceWorkers:'block'}),errors=[]
  page.on('pageerror',error=>errors.push(error.message))
  let release
  const gate=new Promise(resolve=>release=resolve)
  await page.route('**/everland-assets/planner.js*',async route=>{await gate;await route.continue()})
  try{
   const navigation=page.goto(`${base}/${park}/map/`,{waitUntil:'networkidle'})
   const frame=page.frameLocator('#everland-map-frame'),viewport=frame.locator(park==='everland'?'.map-scroll':'.viewport:visible')
   await frame.locator('.map img').first().waitFor({state:'attached'})
   // Make the child send its initial height before the parent can hydrate.
   await frame.locator('body').evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))))
   release();await navigation;await fits(page)
   assert.ok(await viewport.evaluate(el=>el.scrollHeight<=el.clientHeight+1),'overview has no inner vertical scroll')
   // A wheel over the overview must move the outer document, not an iframe.
   await viewport.evaluate(el=>el.scrollIntoView({block:'start'}))
   let box=await viewport.boundingBox(),before=await page.evaluate(()=>scrollY)
   await page.mouse.move(box.x+box.width/2,Math.max(20,box.y+100));await page.mouse.wheel(0,260)
   await page.waitForFunction(value=>scrollY>value+100,before)
   assert.equal(await frame.locator('body').evaluate(()=>scrollY),0,'iframe itself never takes over scrolling')
   // Inner scrolling is useful only after explicit zoom, and must chain at edges.
   await frame.locator('#zoom-in').click();await frame.locator('#zoom-in').click();await fits(page)
   assert.ok(await viewport.evaluate(el=>el.scrollHeight>el.clientHeight),'zoomed map can pan vertically')
   assert.equal(await viewport.evaluate(el=>getComputedStyle(el).overscrollBehaviorY),'auto')
   await viewport.evaluate(el=>{el.scrollIntoView({block:'start'});el.scrollTop=el.scrollHeight;return new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))})
   box=await viewport.boundingBox();before=await page.evaluate(()=>scrollY)
   await page.mouse.move(box.x+box.width/2,Math.max(20,box.y+100));await page.mouse.wheel(0,260)
   await viewport.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))))
   await page.mouse.wheel(0,260)
   try{await page.waitForFunction(value=>scrollY>value+100,before,{timeout:3000})}catch(error){console.log({park,before,after:await page.evaluate(()=>scrollY),box,scroll:await viewport.evaluate(el=>({top:el.scrollTop,height:el.clientHeight,content:el.scrollHeight,frame:scrollY}))});await page.screenshot({path:`${dir}/failure.png`});throw error}
   await frame.locator('#zoom-reset').click();await fits(page)
   assert.ok(await viewport.evaluate(el=>el.scrollHeight<=el.clientHeight+1))
   if(park==='lotte-world'){
    for(const zone of ['floor2','floor4','underground','outdoor','indoor1']){await frame.locator('#area').selectOption(zone);await fits(page)}
   }
   await frame.locator('#search').fill(park==='everland'?'T 익스프레스':park==='lotte-world'?'아트란티스':'드라켄');await fits(page)
   await frame.locator('#search').fill('');await fits(page)
   for(const width of [390,320]){
    await page.setViewportSize({width,height:844});await fits(page)
    assert.ok(await viewport.evaluate(el=>el.scrollHeight<=el.clientHeight+1))
   }
   await page.setViewportSize({width:1546,height:900});await fits(page)
   await viewport.evaluate(el=>el.scrollIntoView({block:'center'}));await page.screenshot({path:`${dir}/${park}-after.png`})
   // Reloading a frame after hydration must also renew its height.
   await page.locator('#everland-map-frame').evaluate(el=>el.contentWindow.location.reload())
   await frame.locator('.map img').first().waitFor({state:'attached'});await fits(page)
   assert.deepEqual(errors,[])
   results.push({park,delayedHydration:true,frameFits:true,overviewWheel:true,zoomEdgeWheel:true,resize:[390,320],errors})
  }finally{release();await page.close()}
 }
 await writeFile(`${dir}/results.json`,JSON.stringify({base,results},null,2));console.log(JSON.stringify({base,results}))
}finally{await browser.close()}
