// node scripts/check-scroll-lock-browser.mjs --dir out --result report.json
// node scripts/check-scroll-lock-browser.mjs --url https://toolhub.ai.kr --result report.json
import assert from 'node:assert/strict'
import {createReadStream,mkdirSync,statSync,writeFileSync} from 'node:fs'
import {createServer} from 'node:http'
import {extname,resolve,sep} from 'node:path'
import {chromium} from 'playwright'

const args=process.argv.slice(2),option=key=>args[args.indexOf(key)+1]
const directory=args.includes('--dir')?resolve(option('--dir')):null,report=resolve(option('--result'))
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript','.css':'text/css','.json':'application/json'}
let server
if(directory)server=createServer((request,response)=>{
  try{
    let file=resolve(directory,'.'+decodeURIComponent(new URL(request.url,'http://localhost').pathname))
    if(file!==directory&&!file.startsWith(directory+sep)){response.writeHead(403);response.end();return}
    if(statSync(file).isDirectory())file=resolve(file,'index.html')
    response.setHeader('Content-Type',types[extname(file)]||'application/octet-stream')
    createReadStream(file).pipe(response)
  }catch{response.writeHead(404);response.end()}
})
if(server)await new Promise(done=>server.listen(0,'127.0.0.1',done))
const origin=server?`http://127.0.0.1:${server.address().port}`:new URL(option('--url')).origin
const browser=await chromium.launch({headless:true}),results=[],errors=[]
const record=(name,data={})=>results.push({name,status:'PASS',...data})
const state=page=>page.evaluate(()=>({y:scrollY,bodyOverflow:document.body.style.overflow,htmlOverflow:document.documentElement.style.overflow,bodyPosition:document.body.style.position}))
const at=async(page,y)=>{await page.evaluate(y=>scrollTo(0,y),y);await page.waitForTimeout(100);assert.equal((await state(page)).y,y)}
const locked=async(page,y)=>{const value=await state(page);assert.equal(value.y,y);assert.equal(value.bodyOverflow,'hidden');assert.equal(value.htmlOverflow,'hidden');assert.equal(value.bodyPosition,'');return value}
const unlocked=async(page,y)=>{const value=await state(page);assert.equal(value.y,y);assert.equal(value.bodyOverflow,'');assert.equal(value.htmlOverflow,'');assert.equal(value.bodyPosition,'');return value}
try{
  const context=await browser.newContext({viewport:{width:390,height:844},serviceWorkers:'block'})
  await context.route('**/*',route=>new URL(route.request().url()).origin===origin?route.continue():route.abort())
  const page=await context.newPage()
  page.on('pageerror',error=>errors.push(error.message))
  await page.goto(origin+'/',{waitUntil:'networkidle'})
  await at(page,600)
  for(let cycle=0;cycle<3;cycle++){
    await page.keyboard.press('Control+k')
    const dialog=page.getByRole('dialog'),input=dialog.getByRole('combobox')
    await input.waitFor()
    await locked(page,600)
    await page.waitForFunction(()=>document.activeElement?.getAttribute('role')==='combobox')
    await page.mouse.move(380,750)
    await page.mouse.wheel(0,400)
    await page.waitForTimeout(100)
    await locked(page,600)
    if(cycle===0)await input.press('Escape')
    else if(cycle===1)await page.mouse.click(5,750)
    if(cycle===2)await input.press('Escape')
    await dialog.waitFor({state:'detached'})
    await unlocked(page,600)
  }
  record('mobile-search-escape-outside-repeat-preserves-scroll',{before:600,after:(await state(page)).y})

  await page.keyboard.press('Control+k')
  const dialog=page.getByRole('dialog'),input=dialog.getByRole('combobox')
  await input.fill('calculator')
  const list=page.locator('#search-listbox')
  const capacity=await list.evaluate(el=>el.scrollHeight-el.clientHeight)
  assert.ok(capacity>100,`Search list must be scrollable: ${capacity}`)
  await list.hover()
  await page.mouse.wheel(0,250)
  await page.waitForFunction(()=>document.querySelector('#search-listbox')?.scrollTop>0)
  await locked(page,600)
  assert.equal(await input.evaluate(el=>document.activeElement===el),true)
  await input.fill('loan')
  const loan=dialog.locator('[role="option"][href="/loan-calculator"]')
  await loan.click()
  await page.waitForURL(url=>new URL(url).pathname.replace(/\/$/,'')==='/loan-calculator')
  await page.waitForFunction(()=>document.body.style.overflow==='')
  assert.equal((await state(page)).htmlOverflow,'')
  record('inner-results-scroll-and-result-navigation-unlocks',{listScrollablePixels:capacity})
  await page.goBack({waitUntil:'networkidle'})
  await page.keyboard.press('Control+k')
  await page.getByRole('dialog').getByRole('combobox').waitFor()
  await page.getByRole('dialog').getByRole('combobox').press('Escape')
  assert.equal((await state(page)).bodyOverflow,'')
  record('back-navigation-and-reopen-leaves-no-lock')

  await page.goto(origin+'/',{waitUntil:'networkidle'})
  await at(page,600)
  const menu=page.getByRole('button',{name:'메뉴',exact:true})
  await menu.click()
  await locked(page,600)
  const menuPanel=page.locator('header [data-scroll-lock-scrollable]')
  const menuBounds=await menuPanel.boundingBox()
  assert.ok(menuBounds&&menuBounds.x>=0&&menuBounds.x+menuBounds.width<=390&&menuBounds.y+menuBounds.height<=844-60,JSON.stringify(menuBounds))
  const menuCapacity=await menuPanel.evaluate(el=>el.scrollHeight-el.clientHeight)
  if(menuCapacity>0){
    await menuPanel.hover()
    await page.mouse.wheel(0,200)
    await page.waitForFunction(()=>document.querySelector('header [data-scroll-lock-scrollable]')?.scrollTop>0)
    await locked(page,600)
  }
  await page.keyboard.press('Control+k')
  await page.getByRole('dialog').waitFor()
  await locked(page,600)
  await page.getByRole('dialog').getByRole('combobox').press('Escape')
  await page.getByRole('dialog').waitFor({state:'detached'})
  await locked(page,600)
  await page.getByRole('button',{name:'닫기',exact:true}).first().click()
  await unlocked(page,600)
  record('overlapping-menu-and-search-release-in-order')

  await page.locator('nav[aria-label="하단 네비게이션"]').getByRole('button',{name:'최근'}).click()
  await locked(page,600)
  await page.getByRole('button',{name:'닫기',exact:true}).last().click()
  await unlocked(page,600)
  record('mobile-recent-panel-restores-scroll')
  await context.close()

  const desktop=await browser.newContext({viewport:{width:1280,height:800},serviceWorkers:'block'})
  await desktop.route('**/*',route=>new URL(route.request().url()).origin===origin?route.continue():route.abort())
  const desktopPage=await desktop.newPage()
  desktopPage.on('pageerror',error=>errors.push(error.message))
  await desktopPage.goto(origin+'/',{waitUntil:'networkidle'})
  await at(desktopPage,600)
  await desktopPage.keyboard.press('Control+k')
  await desktopPage.getByRole('dialog').waitFor()
  await locked(desktopPage,600)
  await desktopPage.mouse.move(1200,700)
  await desktopPage.mouse.wheel(0,400)
  await locked(desktopPage,600)
  await desktopPage.getByRole('dialog').getByRole('combobox').press('Escape')
  await unlocked(desktopPage,600)
  record('desktop-search-lock-and-restore')
  await desktop.close()
  assert.deepEqual(errors,[])
}catch(error){results.push({name:'scroll-lock',status:'FAIL',message:error.stack?.slice(0,1500)||String(error),runtimeErrors:errors})}
finally{
  await browser.close();if(server)await new Promise(done=>server.close(done))
  mkdirSync(resolve(report,'..'),{recursive:true})
  writeFileSync(report,JSON.stringify({at:new Date().toISOString(),origin,results},null,2))
}
for(const item of results)console.log(JSON.stringify(item))
process.exitCode=results.some(item=>item.status==='FAIL')?1:0
