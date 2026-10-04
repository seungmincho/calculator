// node scripts/check-government-policy-browser.mjs --dir out --result report.json
// node scripts/check-government-policy-browser.mjs --url https://toolhub.ai.kr --result report.json
import assert from 'node:assert/strict'
import {createReadStream,mkdirSync,statSync,writeFileSync,readFileSync} from 'node:fs'
import {createServer} from 'node:http'
import {extname,resolve,sep} from 'node:path'
import {chromium} from 'playwright'
const args=process.argv.slice(2),option=key=>args[args.indexOf(key)+1]
const directory=args.includes('--dir')?resolve(option('--dir')):null,report=resolve(option('--result'))
const messages=Object.fromEntries(['ko','en'].map(locale=>[locale,JSON.parse(readFileSync(new URL(`../messages/${locale}.json`,import.meta.url))).governmentSubsidy]))
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript','.css':'text/css','.json':'application/json'}
let server
if(directory)server=createServer((request,response)=>{
 try{let file=resolve(directory,'.'+decodeURIComponent(new URL(request.url,'http://localhost').pathname));if(file!==directory&&!file.startsWith(directory+sep)){response.writeHead(403);response.end();return}if(statSync(file).isDirectory())file=resolve(file,'index.html');response.setHeader('Content-Type',types[extname(file)]||'application/octet-stream');createReadStream(file).pipe(response)}catch{response.writeHead(404);response.end()}
})
if(server)await new Promise(done=>server.listen(0,'127.0.0.1',done))
const origin=server?`http://127.0.0.1:${server.address().port}`:new URL(option('--url')).origin
const browser=await chromium.launch({headless:true}),results=[],errors=[]
const base={size:'1',income:'0',assets:'0',age:'30',housing:'monthly',rent:'40',deposit:'0'}
const leak=/\b(?:input|result|status|reasons|programDetails|screening|guide)\.[A-Za-z][\w.]*/
async function visit(page,params={}){await page.goto(origin+'/government-subsidy/?'+new URLSearchParams({...base,...params}),{waitUntil:'load'});await page.getByText(messages[await page.evaluate(()=>localStorage.getItem('language')||'ko')].result.summaryTitle,{exact:true}).first().waitFor()}
async function width(page){
 const overflow=await page.evaluate(()=>({viewport:innerWidth,width:document.documentElement.scrollWidth,offenders:[...document.querySelectorAll('body *')].filter(el=>el.getBoundingClientRect().right>innerWidth+2).map(el=>({tag:el.tagName,className:String(el.className).slice(0,100),right:Math.round(el.getBoundingClientRect().right),visibility:getComputedStyle(el).visibility,text:el.textContent?.trim().slice(0,80)})).slice(-8)}))
 assert.ok(overflow.width<=overflow.viewport+2,`Horizontal overflow: ${JSON.stringify(overflow)}`)
 assert.doesNotMatch(await page.locator('main').innerText(),leak)
}
function pass(name){results.push({name,status:'PASS'})}
try{
 for(const locale of args.includes('--locale')?[option('--locale')]:['ko','en']){
  const context=await browser.newContext({viewport:{width:390,height:844},serviceWorkers:'block',colorScheme:'dark'})
  await context.addInitScript(locale=>{localStorage.setItem('language',locale);localStorage.setItem('theme','dark')},locale)
  await context.route('**/*',route=>new URL(route.request().url()).origin===origin?route.continue():route.abort())
  const page=await context.newPage();page.on('pageerror',error=>errors.push(error.message));const m=messages[locale]
  await visit(page)
  await page.getByRole('heading',{level:1,name:m.title}).waitFor()
  assert.equal(await page.locator('#government-income-basis').inputValue(),'gross')
  assert.equal(await page.locator('#government-region').inputValue(),'unknown')
  await page.getByText(m.reasons.assessedRequired,{exact:true}).first().waitFor()
  assert.equal(await page.getByText(m.result.estimatedMonthly,{exact:false}).count(),0)
  assert.ok(!(await page.locator('main').innerText()).includes(locale==='ko'?'월 예상 총 지원금':'Total Estimated Monthly'))
  await width(page);pass(`${locale}-legacy-url-gross-no-fabricated-total`)

  await visit(page,{basis:'assessed',region:'seoul',income:'100'})
  const housing=page.locator('#government-program-housing')
  await housing.getByText(locale==='ko'?'315,166원':'₩315,166',{exact:false}).waitFor()
  await housing.getByRole('button').click()
  await housing.getByText(locale==='ko'?'1,230,834원':'₩1,230,834',{exact:false}).waitFor()
  assert.equal(await housing.getByRole('link',{name:m.officialSite}).getAttribute('href'),'https://www.lh.or.kr/menu.es?mid=a10401050100')
  await width(page);pass(`${locale}-seoul-contribution-threshold-and-source`)

  await visit(page,{basis:'assessed',region:'other',income:'0'})
  await page.locator('#government-program-housing').getByText(locale==='ko'?'212,000원':'₩212,000',{exact:false}).waitFor()
  await page.reload({waitUntil:'load'});await page.getByText(m.result.summaryTitle,{exact:true}).first().waitFor()
  assert.equal(await page.locator('#government-region').inputValue(),'other')
  assert.equal(await page.locator('#government-income-basis').inputValue(),'assessed')
  await page.locator('#government-income-basis').selectOption('gross')
  await page.getByText(m.result.emptyTitle,{exact:true}).first().waitFor();assert.equal(new URL(page.url()).searchParams.has('basis'),false)
  pass(`${locale}-region-share-refresh-and-invalidation`)

  await visit(page,{basis:'assessed',region:'seoul',housing:'own'})
  await page.locator('#government-program-housing').getByText(m.reasons.housingNonRental,{exact:true}).waitFor()
  await visit(page,{basis:'assessed',region:'seoul',housing:'jeonse',deposit:'3000',rent:'999'})
  await page.locator('#government-program-housing').getByText(locale==='ko'?'100,000원':'₩100,000',{exact:false}).waitFor()
  assert.equal(await page.locator('#government-deposit').count(),1)
  pass(`${locale}-owner-and-deposit-only-lease`)

  await visit(page,{assets:'24000',children:'1',childCount:'1'})
  for(const id of ['eitc','childCredit'])await page.locator('#government-program-'+id).getByText(m.reasons.taxAssetsOver,{exact:true}).waitFor()
  await visit(page,{age:'65',over65:'1',disabled:'1'})
  await page.locator('#government-program-basicPension').getByText(m.reasons.pensionDetailsRequired,{exact:true}).waitFor()
  await page.locator('#government-program-disabilityPension').getByText(m.reasons.disabilityDetailsRequired,{exact:true}).waitFor()
  pass(`${locale}-tax-asset-boundary-and-pensions-require-review`)

  for(const age of ['15','39']){await visit(page,{age});await page.locator('#government-program-youthSavings').getByText(m.reasons.savingsDetailsRequired,{exact:true}).waitFor()}
  await visit(page,{age:'40'});await page.locator('#government-program-youthSavings').getByText(m.reasons.savingsAge,{exact:true}).waitFor()
  await visit(page,{age:'30'});const youth=page.locator('#government-program-youthRent');await youth.getByRole('button').click();await youth.getByText(m.reasons.youthRentClosed,{exact:true}).waitFor();assert.equal(await youth.getByRole('link',{name:m.result.youthCalculator}).getAttribute('href'),'/youth-rent-subsidy/')
  pass(`${locale}-savings-age-and-rent-closed-detail-link`)

  for(const changes of [{basis:'bogus'},{region:'bogus'}]){await page.goto(origin+'/government-subsidy/?'+new URLSearchParams({...base,...changes}),{waitUntil:'load'});await page.getByText(m.input.invalidSharedLink,{exact:true}).waitFor();await page.getByText(m.result.emptyTitle,{exact:true}).first().waitFor()}
  await visit(page,{basis:'assessed',region:'seoul'})
  for(const invalid of ['','-1','oops','999999999999999999999']){await page.locator('#government-monthlyIncome').fill(invalid);await page.getByRole('button',{name:m.input.calculate,exact:true}).click();await page.getByText(m.input.invalidAmounts,{exact:true}).waitFor();assert.equal(await page.evaluate(()=>document.activeElement.id),'government-monthlyIncome');assert.equal(await page.locator('#government-program-livelihood').count(),0)}
  await page.locator('#government-monthlyIncome').fill('0');await page.getByRole('button',{name:m.input.calculate,exact:true}).click();await page.locator('#government-program-livelihood').getByText(locale==='ko'?'820,556원':'₩820,556',{exact:false}).waitFor()
  pass(`${locale}-invalid-urls-and-empty-vs-zero`)

  await visit(page,{size:'4',income:'207.8316',basis:'assessed',region:'seoul'})
  await page.locator('#government-program-livelihood').getByText(m.reasons.livelihoodConditional,{exact:true}).waitFor()
  assert.equal(await page.locator('#government-monthlyIncome').inputValue(),'207.8316')
  await page.locator('#government-monthlyIncome').fill('207.8317');await page.getByRole('button',{name:m.input.calculate,exact:true}).click()
  await page.locator('#government-program-livelihood').getByText(m.reasons.incomeOver,{exact:true}).waitFor()
  await page.reload({waitUntil:'load'});await page.getByText(m.result.summaryTitle,{exact:true}).first().waitFor()
  assert.equal(await page.locator('#government-monthlyIncome').inputValue(),'207.8317')
  pass(`${locale}-one-won-income-boundary-and-decimal-url`)

  await page.getByRole('button',{name:m.guide.title,exact:true}).click();await page.getByText('A. '+m.guide.faq.items[0].a,{exact:true}).waitFor()
  for(const size of [320,1024,1280,1536]){
   await page.setViewportSize({width:size,height:844});await width(page)
   if(size>=1024){
    const navigation=page.locator('header nav')
    for(const button of await navigation.locator(':scope > div > button').all()){
     assert.ok((await button.boundingBox()).width>=40)
     await button.click();assert.equal(await button.getAttribute('aria-expanded'),'true')
     assert.ok(await navigation.locator(':scope > div > div a').count()>0)
     await width(page);await button.click()
    }
   }
  }
  pass(`${locale}-guide-translations-and-responsive-navigation`)
  await page.setViewportSize({width:390,height:844});await page.locator('#government-program-livelihood').scrollIntoViewIfNeeded();mkdirSync(resolve(report,'..'),{recursive:true});await page.screenshot({path:resolve(report,'..',`government-${locale}-mobile.png`)})
  const schema=await page.locator('script[type="application/ld+json"]').allTextContents();assert.ok(schema.join('').includes('6,494,738'));assert.ok(!schema.join('').includes('3,800만원'))
  pass(`${locale}-metadata-2026-values`)
  await context.close()
 }
 assert.deepEqual(errors,[])
}catch(error){results.push({name:'government-policy-browser',status:'FAIL',message:error.stack?.slice(0,2200)||String(error),runtimeErrors:errors})}
finally{await browser.close();if(server)await new Promise(done=>server.close(done));mkdirSync(resolve(report,'..'),{recursive:true});writeFileSync(report,JSON.stringify({at:new Date().toISOString(),origin,results},null,2))}
for(const result of results)console.log(JSON.stringify(result));process.exitCode=results.some(r=>r.status==='FAIL')?1:0
