// node scripts/check-youth-rent-policy-browser.mjs --dir out --result report.json
// node scripts/check-youth-rent-policy-browser.mjs --url https://toolhub.ai.kr --result report.json
import assert from 'node:assert/strict'
import {createReadStream,mkdirSync,statSync,writeFileSync,readFileSync} from 'node:fs'
import {createServer} from 'node:http'
import {extname,resolve,sep} from 'node:path'
import {chromium} from 'playwright'

const args=process.argv.slice(2),option=key=>args[args.indexOf(key)+1]
const directory=args.includes('--dir')?resolve(option('--dir')):null,report=resolve(option('--result'))
const messages=Object.fromEntries(['ko','en'].map(locale=>[locale,JSON.parse(readFileSync(new URL(`../messages/${locale}.json`,import.meta.url))).youthRentSubsidy]))
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
const record=name=>results.push({name,status:'PASS'})
const valid={age:'25',independent:'true',homeless:'true',ownIncome:'0',parentIncome:'0',household:'4',asset:'0',rent:'20',deposit:'0',type:'officetel'}
const total=page=>page.locator('#youth-payment-total')
const assertTotal=async(page,amount,m)=>assert.equal(await total(page).innerText(),(amount/10000).toLocaleString('ko-KR')+m.manwonUnit)
async function noOverflow(page){
  const width=await page.evaluate(()=>({viewport:innerWidth,document:document.documentElement.scrollWidth}))
  assert.ok(width.document<=width.viewport+2,`Horizontal overflow: ${width.document} > ${width.viewport}`)
}
try{
  for(const locale of ['ko','en']){
    const m=messages[locale]
    const context=await browser.newContext({viewport:{width:390,height:844},colorScheme:'dark',serviceWorkers:'block'})
    await context.addInitScript(value=>localStorage.setItem('language',value),locale)
    await context.route('**/*',route=>new URL(route.request().url()).origin===origin?route.continue():route.abort())
    const page=await context.newPage()
    page.on('pageerror',error=>errors.push(error.message))
    const open=async changes=>{
      await page.goto(origin+'/youth-rent-subsidy/?'+new URLSearchParams({...valid,...changes}),{waitUntil:'networkidle'})
      await page.getByRole('heading',{level:1,name:m.title}).waitFor()
    }
    for(const [received,remaining,amount] of [['0',24,4800000],['12',12,2400000],['23',1,200000]]){
      await open({received})
      await page.getByText(m.eligible,{exact:true}).first().waitFor()
      assert.equal(await page.locator('#youth-payment-summary').innerText(),m.payments.remaining.replace('{count}',String(remaining)))
      await assertTotal(page,amount,m)
      await page.reload({waitUntil:'networkidle'})
      await total(page).waitFor()
      assert.equal(await page.locator('#youth-receivedPayments').inputValue(),received)
      await assertTotal(page,amount,m)
      await noOverflow(page)
      record(`${locale}-prior-${received}-remaining-${remaining}-refresh`)
    }
    await open({received:'24'})
    await page.getByText(m.ineligible,{exact:true}).first().waitFor()
    await page.getByText(m.payments.exhausted,{exact:true}).waitFor()
    assert.equal(await total(page).count(),0)
    assert.equal(await page.locator('#youth-payment-summary').innerText(),m.payments.remaining.replace('{count}','0'))
    record(`${locale}-24-payments-exhausted`)
    for(const received of ['25','-1','1.5','Infinity','oops','']){
      await open({received})
      await page.locator('#youth-receivedPayments-error').waitFor()
      await page.getByText(m.emptyTitle,{exact:true}).waitFor()
      assert.equal(await total(page).count(),0)
    }
    record(`${locale}-invalid-payment-counts-blocked`)
    await open({}) // Older shared links omit prior payments and must default to zero.
    await total(page).waitFor()
    await assertTotal(page,4800000,m)
    await page.locator('#youth-receivedPayments').selectOption('12')
    await page.getByText(m.emptyTitle,{exact:true}).waitFor()
    assert.equal(new URL(page.url()).searchParams.has('received'),false)
    await page.getByRole('button',{name:m.checkButton}).click()
    await total(page).waitFor()
    await assertTotal(page,2400000,m)
    assert.equal(new URL(page.url()).searchParams.get('received'),'12')
    record(`${locale}-legacy-url-selection-invalidation-sharing`)
    mkdirSync(resolve(report,'..'),{recursive:true})
    await page.screenshot({path:resolve(report,'..',`youth-policy-${locale}-mobile.png`),fullPage:true})
    for(const [rent,deposit,amount] of [['15','0',3600000],['50','0',4800000],['100','6000',4800000]]){
      await open({rent,deposit,received:'0'})
      await total(page).waitFor()
      await assertTotal(page,amount,m)
    }
    record(`${locale}-actual-rent-cap-and-removed-housing-limits`)
    await open({ownIncome:'153'})
    await page.getByText(m.eligible,{exact:true}).waitFor()
    await open({ownIncome:'154'})
    await page.getByText(m.ineligible,{exact:true}).waitFor()
    await open({age:'30',parentIncome:'9999'})
    await page.getByText(m.eligible,{exact:true}).waitFor()
    await page.getByText(m.checks.parentIncomeExempt,{exact:true}).waitFor()
    record(`${locale}-2026-income-boundary-and-parent-exemption`)
    await page.getByRole('heading',{name:m.policy.closedTitle}).waitFor()
    await page.locator('details').filter({has:page.getByText(m.policy.details,{exact:true})}).locator('summary').click()
    for(const key of ['applicationWindow','paymentWindow','secondRound','seoulDifference'])await page.getByText(m.policy[key],{exact:true}).waitFor()
    assert.equal(await page.getByRole('link',{name:m.policy.officialLink}).getAttribute('href'),'https://www.bokjiro.go.kr/ssis-tbu/cms/pc/customer/notice/1309500_1141.html')
    const text=await page.locator('main').innerText()
    assert.ok(!text.includes(m.totalSupport+' (12'))
    const faq=await page.locator('script[type="application/ld+json"]').allTextContents()
    assert.ok(faq.some(content=>content.includes('24회')))
    assert.ok(!faq.some(content=>content.includes('총 240만원')||content.includes('최대 12개월(총')))
    await noOverflow(page)
    record(`${locale}-closed-intake-program-separation-and-metadata`)
    await context.close()
  }
  for(const width of [320,1280]){
    const context=await browser.newContext({viewport:{width,height:900},serviceWorkers:'block'})
    const page=await context.newPage()
    await page.goto(origin+'/youth-rent-subsidy/',{waitUntil:'networkidle'})
    await page.getByRole('heading',{level:1,name:messages.ko.title}).waitFor()
    await noOverflow(page)
    record(`policy-layout-${width}px`)
    await context.close()
  }
  assert.deepEqual(errors,[])
}catch(error){results.push({name:'youth-policy',status:'FAIL',message:error.stack?.slice(0,2200)||String(error),runtimeErrors:errors})}
finally{
  await browser.close();if(server)await new Promise(done=>server.close(done))
  mkdirSync(resolve(report,'..'),{recursive:true})
  writeFileSync(report,JSON.stringify({at:new Date().toISOString(),origin,results,errors},null,2))
}
for(const item of results)console.log(JSON.stringify(item))
process.exitCode=results.some(item=>item.status==='FAIL')?1:0
