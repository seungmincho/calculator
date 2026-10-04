// node scripts/check-recent-tool-visits-browser.mjs --dir out --result report.json
// node scripts/check-recent-tool-visits-browser.mjs --url https://toolhub.ai.kr --result report.json
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
const browser=await chromium.launch({headless:true}),results=[]
try{
  const context=await browser.newContext({viewport:{width:390,height:844},serviceWorkers:'block'})
  await context.route('**/*',route=>new URL(route.request().url()).origin===origin?route.continue():route.abort())
  const page=await context.newPage()
  const storage=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('recent_tools')||'{}'))
  const waitFor=href=>page.waitForFunction(href=>Object.values(JSON.parse(localStorage.getItem('recent_tools')||'{}')).flat().some(entry=>entry.href===href),href)
  await page.goto(origin+'/',{waitUntil:'domcontentloaded'})
  await page.locator('#tools-grid').waitFor()
  await page.waitForTimeout(500)
  await page.locator('#tools-grid a[href*="loan-calculator"]').first().click()
  await page.waitForURL(url=>new URL(url).pathname.replace(/\/$/,'')==='/loan-calculator')
  await waitFor('/loan-calculator')
  assert.equal((await storage()).calculators.filter(entry=>entry.href==='/loan-calculator').length,1)
  await page.goBack({waitUntil:'domcontentloaded'})
  const nav=page.locator('nav[aria-label="하단 네비게이션"]')
  await nav.getByRole('button',{name:'최근',exact:true}).click()
  await page.getByRole('button',{name:'대출 계산기',exact:true}).waitFor()
  assert.match(await nav.evaluate(el=>el.previousElementSibling?.textContent||''),/대출 계산기/)
  results.push({name:'home-card-populates-mobile-recent',status:'PASS'})

  await page.goto(origin+'/bmi-calculator/?email=private%40example.com',{waitUntil:'domcontentloaded'})
  await waitFor('/bmi-calculator')
  const direct=JSON.stringify(await storage())
  assert.ok(!direct.includes('private')&&!direct.includes('?'))
  results.push({name:'direct-visit-saves-path-without-query',status:'PASS'})

  await page.evaluate(()=>localStorage.setItem('toolhub_favorites',JSON.stringify(['/percent-calculator'])))
  await page.goto(origin+'/',{waitUntil:'domcontentloaded'})
  await nav.getByRole('button',{name:'즐겨찾기',exact:true}).click()
  await page.getByRole('button',{name:'퍼센트 계산기',exact:true}).click()
  await waitFor('/percent-calculator')
  results.push({name:'favorite-navigation-recorded',status:'PASS'})

  await page.goto(origin+'/',{waitUntil:'networkidle'})
  await page.keyboard.press('Control+k')
  const dialog=page.getByRole('dialog'),input=dialog.getByRole('combobox')
  await input.waitFor()
  await input.fill('대출 계산기')
  await dialog.locator('[role="option"][href="/loan-calculator"]').click()
  await page.waitForURL(url=>new URL(url).pathname.replace(/\/$/,'')==='/loan-calculator')
  await waitFor('/loan-calculator')
  const calculators=(await storage()).calculators
  assert.equal(calculators.filter(entry=>entry.href==='/loan-calculator').length,1)
  assert.equal(calculators[0].href,'/loan-calculator')
  assert.ok(calculators.some(entry=>entry.href==='/percent-calculator'))
  results.push({name:'existing-search-record-dedupes-and-orders',status:'PASS'})

  const before=JSON.stringify(await storage())
  await page.goto(origin+'/tips/?email=private%40example.com',{waitUntil:'domcontentloaded'})
  await page.waitForTimeout(400)
  assert.equal(JSON.stringify(await storage()),before)
  results.push({name:'non-tool-path-excluded',status:'PASS'})
  await context.close()
}catch(error){results.push({name:'recent-tool-visits',status:'FAIL',message:error.stack?.slice(0,900)||String(error)})}
finally{
  await browser.close();if(server)await new Promise(done=>server.close(done))
  mkdirSync(resolve(report,'..'),{recursive:true})
  writeFileSync(report,JSON.stringify({at:new Date().toISOString(),origin,results},null,2))
}
for(const item of results)console.log(JSON.stringify(item))
process.exitCode=results.some(item=>item.status==='FAIL')?1:0
