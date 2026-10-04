// node scripts/check-subsidy-i18n-browser.mjs --dir out --result report.json
// node scripts/check-subsidy-i18n-browser.mjs --url https://toolhub.ai.kr --result report.json
import assert from 'node:assert/strict'
import {createReadStream,mkdirSync,statSync,writeFileSync,readFileSync} from 'node:fs'
import {createServer} from 'node:http'
import {extname,resolve,sep} from 'node:path'
import {chromium} from 'playwright'

const args=process.argv.slice(2),option=key=>args[args.indexOf(key)+1]
const directory=args.includes('--dir')?resolve(option('--dir')):null,report=resolve(option('--result'))
const messages={ko:JSON.parse(readFileSync(new URL('../messages/ko.json',import.meta.url))),en:JSON.parse(readFileSync(new URL('../messages/en.json',import.meta.url)))}
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
const routes={youthRentSubsidy:'youth-rent-subsidy',governmentSubsidy:'government-subsidy'}
const leak=/\b(?:hero|input|result|status|checks|programDetails|breakdown|medianTable)\.[A-Za-z][\w.]*/
async function open(context,namespace,locale){
  const page=await context.newPage()
  page.on('pageerror',error=>errors.push(error.message))
  await page.goto(origin+'/'+routes[namespace]+'/',{waitUntil:'networkidle'})
  await page.getByRole('heading',{level:1,name:messages[locale][namespace].title}).waitFor()
  const text=await page.locator('main').innerText()
  assert.doesNotMatch(text,leak)
  const width=await page.evaluate(()=>({viewport:innerWidth,document:document.documentElement.scrollWidth}))
  assert.ok(width.document<=width.viewport+2,`Mobile horizontal overflow: ${width.document}px > ${width.viewport}px`)
  for(const key of ['inputTitle','ageLabel','emptyTitle','emptyDescription'])if(namespace==='youthRentSubsidy')assert.ok(!text.includes(key))
  if(namespace==='governmentSubsidy')assert.ok(!text.includes('input.title'))
  return page
}
async function fillYouth(page){
  const values=['0','0','0','20','0']
  const inputs=page.locator('main input[inputmode="numeric"]')
  for(let i=0;i<values.length;i++)await inputs.nth(i).fill(values[i])
}
try{
  for(const locale of ['ko','en'])for(const namespace of Object.keys(routes)){
    const context=await browser.newContext({viewport:{width:390,height:844},serviceWorkers:'block'})
    await context.route('**/*',route=>new URL(route.request().url()).origin===origin?route.continue():route.abort())
    if(locale==='en')await context.addInitScript(()=>localStorage.setItem('language','en'))
    const page=await open(context,namespace,locale)
    const m=messages[locale][namespace]
    await page.getByText(namespace==='youthRentSubsidy'?m.inputTitle:m.input.title,{exact:true}).first().waitFor()
    await page.getByText(namespace==='youthRentSubsidy'?m.emptyTitle:m.result.emptyTitle,{exact:true}).first().waitFor()
    results.push({name:`${namespace}-${locale}-direct-mobile-empty`,status:'PASS'})
    if(namespace==='youthRentSubsidy'){
      await page.getByRole('button',{name:m.checkButton}).click()
      assert.equal(await page.locator('main [id^="youth-"][id$="-error"]').count(),5)
      assert.equal(await page.getByText(m.validation.required,{exact:true}).count(),5)
      assert.equal(await page.locator('#youth-ownIncome').getAttribute('aria-invalid'),'true')
      assert.equal(await page.evaluate(()=>document.activeElement?.id),'youth-ownIncome')
      await page.getByText(m.emptyTitle,{exact:true}).first().waitFor()
      await fillYouth(page)
    }
    await page.getByRole('button',{name:namespace==='youthRentSubsidy'?m.checkButton:m.input.calculate}).click()
    await page.getByText(namespace==='youthRentSubsidy'?m.eligible:m.result.summaryTitle,{exact:true}).first().waitFor()
    if(namespace==='youthRentSubsidy'){
      const url=new URL(page.url())
      assert.equal(url.searchParams.get('ownIncome'),'0')
      assert.equal(url.searchParams.get('asset'),'0')
      await page.reload({waitUntil:'networkidle'})
      await page.getByText(m.eligible,{exact:true}).first().waitFor()
      await page.locator('#youth-rent').fill('21')
      await page.getByText(m.emptyTitle,{exact:true}).first().waitFor()
      assert.equal(new URL(page.url()).searchParams.has('rent'),false)
      await page.locator('#youth-rent').fill('-1')
      await page.getByRole('button',{name:m.checkButton}).click()
      await page.getByText(m.validation.invalid,{exact:true}).first().waitFor()
      await page.getByText(m.emptyTitle,{exact:true}).first().waitFor()
      await page.locator('#youth-rent').fill('21')
      await page.getByRole('button',{name:m.checkButton}).click()
      await page.getByText(m.eligible,{exact:true}).first().waitFor()
    }
    assert.doesNotMatch(await page.locator('main').innerText(),leak)
    const resultWidth=await page.evaluate(()=>({viewport:innerWidth,document:document.documentElement.scrollWidth}))
    if(resultWidth.document>resultWidth.viewport+2){
      const offenders=await page.evaluate(()=>[...document.querySelectorAll('main *')].map(el=>({right:Math.round(el.getBoundingClientRect().right),tag:el.tagName,depth:(()=>{let n=0,p=el;while(p=p.parentElement)n++;return n})(),className:String(el.className).slice(0,80),text:el.textContent?.trim().slice(0,75)})).filter(x=>x.right>innerWidth+2).sort((a,b)=>b.depth-a.depth).slice(0,12))
      const ancestry=await page.evaluate(()=>{let el=document.querySelector('main table');const rows=[];while(el&&rows.length<8){const box=el.getBoundingClientRect(),style=getComputedStyle(el);rows.push({tag:el.tagName,className:String(el.className).slice(0,65),left:Math.round(box.left),right:Math.round(box.right),scroll:el.scrollWidth,overflow:style.overflowX,minWidth:style.minWidth});el=el.parentElement}return rows})
      throw Error(`Result horizontal overflow: ${resultWidth.document}px > ${resultWidth.viewport}px; ${JSON.stringify({offenders,ancestry})}`)
    }
    if(namespace==='youthRentSubsidy'){
      await page.locator('main input[type="number"]').first().fill('50')
      await page.getByRole('button',{name:m.checkButton}).click()
      await page.getByText(m.ineligible,{exact:true}).first().waitFor()
      assert.doesNotMatch(await page.locator('main').innerText(),leak)
    }
    results.push({name:`${namespace}-${locale}-result-mobile`,status:'PASS'})
    await context.close()
  }

  const toggleContext=await browser.newContext({viewport:{width:390,height:844},serviceWorkers:'block'})
  await toggleContext.route('**/*',route=>new URL(route.request().url()).origin===origin?route.continue():route.abort())
  const youth=await open(toggleContext,'youthRentSubsidy','ko')
  await youth.locator('button:has(svg.lucide-languages):visible').first().click()
  await youth.getByRole('button',{name:'English',exact:true}).last().click()
  await youth.getByRole('heading',{level:1,name:messages.en.youthRentSubsidy.title}).waitFor()
  await youth.reload({waitUntil:'networkidle'})
  await youth.getByRole('heading',{level:1,name:messages.en.youthRentSubsidy.title}).waitFor()
  assert.doesNotMatch(await youth.locator('main').innerText(),leak)
  results.push({name:'youth-language-switch-and-refresh',status:'PASS'})

  const ym=messages.en.youthRentSubsidy
  await fillYouth(youth)
  await youth.getByRole('button',{name:ym.checkButton}).click()
  await youth.getByText(ym.eligible,{exact:true}).first().waitFor()
  await youth.getByText(ym.monthlySupport,{exact:true}).first().waitFor()
  assert.doesNotMatch(await youth.locator('main').innerText(),leak)
  await youth.locator('main input[type="number"]').first().fill('50')
  await youth.getByRole('button',{name:ym.checkButton}).click()
  await youth.getByText(ym.ineligible,{exact:true}).first().waitFor()
  await youth.reload({waitUntil:'domcontentloaded'})
  await youth.getByRole('heading',{level:1,name:ym.title}).waitFor()
  await youth.getByText(ym.ineligible,{exact:true}).first().waitFor()
  assert.doesNotMatch(await youth.locator('main').innerText(),leak)
  await youth.locator('main button[title="'+ym.resetButton+'"]').click()
  await youth.getByText(ym.emptyTitle,{exact:true}).first().waitFor()
  results.push({name:'youth-eligible-ineligible-reset-en',status:'PASS'})

  const validYouth={age:'25',independent:'true',homeless:'true',ownIncome:'0',parentIncome:'0',household:'4',asset:'0',rent:'20',deposit:'0',type:'officetel'}
  for(const [name,changes] of [
    ['missing-money',{asset:undefined}],['negative-money',{rent:'-1'}],
    ['nonfinite-money',{rent:'Infinity'}],['malformed-money',{rent:'1abc'}],
  ]){
    const params=new URLSearchParams({...validYouth,...changes})
    if(changes.asset===undefined)params.delete('asset')
    await youth.goto(origin+'/youth-rent-subsidy/?'+params,{waitUntil:'networkidle'})
    await youth.getByText(ym.emptyTitle,{exact:true}).first().waitFor()
    assert.equal(await youth.getByText(ym.eligible,{exact:true}).count(),0)
    assert.ok(await youth.locator('main [id^="youth-"][id$="-error"]').count()>0)
    results.push({name:`youth-shared-url-${name}`,status:'PASS'})
  }

  await youth.goto(origin+'/',{waitUntil:'networkidle'})
  await youth.locator('#tools-grid details summary').first().click()
  await youth.locator('#tools-grid a[href*="government-subsidy"]:visible').first().click()
  await youth.getByRole('heading',{level:1,name:messages.en.governmentSubsidy.title}).waitFor()
  results.push({name:'government-internal-navigation-en',status:'PASS'})

  const gm=messages.en.governmentSubsidy
  await youth.getByRole('button',{name:gm.input.calculate}).click()
  await youth.getByText(gm.result.summaryTitle,{exact:true}).first().waitFor()
  await youth.locator('main button').filter({hasText:gm.programDetails.livelihood.name}).first().click()
  await youth.getByText(gm.programDetails.livelihood.requirements,{exact:true}).first().waitFor()
  assert.doesNotMatch(await youth.locator('main').innerText(),leak)
  await youth.locator('main input[type="text"]').first().fill('100')
  await youth.getByRole('button',{name:gm.input.calculate}).click()
  await youth.reload({waitUntil:'networkidle'})
  await youth.getByRole('heading',{level:1,name:gm.title}).waitFor()
  await youth.getByText(gm.result.summaryTitle,{exact:true}).first().waitFor()
  assert.doesNotMatch(await youth.locator('main').innerText(),leak)
  await youth.locator('main button[title="'+gm.input.reset+'"]').click()
  await youth.getByText(gm.result.emptyTitle,{exact:true}).first().waitFor()
  results.push({name:'government-results-details-reset-en',status:'PASS'})

  const zeroGovernment='size=4&income=0&assets=0&age=35&housing=monthly&rent=0&deposit=0'
  await youth.goto(origin+'/government-subsidy/?'+zeroGovernment,{waitUntil:'networkidle'})
  await youth.getByText(gm.result.summaryTitle,{exact:true}).first().waitFor()
  for(const input of await youth.locator('main input[type="text"]').all())assert.equal(await input.inputValue(),'0')
  await youth.getByRole('button',{name:gm.input.calculate}).click()
  assert.equal(new URL(youth.url()).searchParams.get('income'),'0')
  assert.equal(new URL(youth.url()).searchParams.get('rent'),'0')
  await youth.reload({waitUntil:'networkidle'})
  await youth.getByText(gm.result.summaryTitle,{exact:true}).first().waitFor()
  for(const input of await youth.locator('main input[type="text"]').all())assert.equal(await input.inputValue(),'0')
  results.push({name:'government-explicit-zero-shared-url',status:'PASS'})
  await youth.goto(origin+'/government-subsidy/?'+zeroGovernment.replace('rent=0','rent=oops'),{waitUntil:'networkidle'})
  await youth.getByText(gm.input.invalidSharedLink,{exact:true}).waitFor()
  await youth.getByText(gm.result.emptyTitle,{exact:true}).first().waitFor()
  results.push({name:'government-invalid-shared-url',status:'PASS'})
  await toggleContext.close()
  assert.deepEqual(errors,[])
}catch(error){results.push({name:'subsidy-i18n',status:'FAIL',message:error.stack?.slice(0,2200)||String(error),runtimeErrors:errors.slice(0,3)})}
finally{
  await browser.close();if(server)await new Promise(done=>server.close(done))
  mkdirSync(resolve(report,'..'),{recursive:true})
  writeFileSync(report,JSON.stringify({at:new Date().toISOString(),origin,results,errors},null,2))
}
for(const item of results)console.log(JSON.stringify(item))
process.exitCode=results.some(item=>item.status==='FAIL')?1:0
