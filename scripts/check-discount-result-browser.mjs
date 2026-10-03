// node scripts/check-discount-result-browser.mjs --dir out --result report.json
// node scripts/check-discount-result-browser.mjs --url https://toolhub.ai.kr --result report.json
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
const record=name=>results.push({name,status:'PASS'})
try{
  const context=await browser.newContext({serviceWorkers:'block',permissions:['clipboard-read','clipboard-write']})
  const page=await context.newPage(),errors=[]
  page.on('pageerror',e=>errors.push(e.message))
  await page.goto(origin+'/discount-calculator',{waitUntil:'domcontentloaded'})
  await page.getByRole('button',{name:'결과 링크 복사'}).waitFor({timeout:30000})
  await page.waitForFunction(()=>new URL(location.href).searchParams.get('mode')==='discountRate')
  assert.equal(await page.getByRole('button',{name:'결과 링크 복사'}).count(),1)
  await page.getByText('할인 결과 요약').waitFor()
  assert.ok(!(await page.locator('body').innerText()).includes('summaryText'))
  record('translated-result-and-share-labels')
  await page.locator('input[type="number"]').first().fill('0')
  await page.waitForFunction(()=>document.querySelector('input[type="number"]')?.value==='0')
  await page.waitForFunction(()=>[...document.querySelectorAll('span')]
    .find(element=>element.textContent==='실질 할인율')?.parentElement?.textContent?.includes('0.0%'))
  assert.ok(!(await page.locator('body').innerText()).includes('NaN'))
  record('zero-original-has-finite-effective-rate')
  await page.waitForFunction(()=>new URL(location.href).searchParams.get('original')==='0')
  const sharedUrl=page.url()
  await page.reload({waitUntil:'domcontentloaded'})
  await page.waitForFunction(()=>document.querySelector('input[type="number"]')?.value==='0')
  assert.equal(page.url(),sharedUrl)
  assert.deepEqual(errors,[])
  record('shared-link-hydrates-without-runtime-error')
  await page.getByRole('button',{name:'결과 링크 복사'}).click()
  assert.equal(await page.evaluate(()=>navigator.clipboard.readText()),page.url())
  await page.getByRole('button',{name:'복사됨!'}).waitFor()
  record('successful-link-copy')
  assert.deepEqual(errors,[])
  await context.close()

  const boundary=await browser.newContext({serviceWorkers:'block'})
  const boundaryPage=await boundary.newPage(),boundaryErrors=[]
  boundaryPage.on('pageerror',e=>boundaryErrors.push(e.message))
  await boundaryPage.goto(origin+'/discount-calculator?mode=discountAmount&original=0&amount=50',{waitUntil:'domcontentloaded'})
  await boundaryPage.waitForFunction(()=>document.querySelector('input[type="number"]')?.value==='0')
  assert.match(await boundaryPage.locator('.bg-primary.rounded-xl.p-6.text-white').nth(1).innerText(),/0\.0%/)
  assert.ok(!(await boundaryPage.locator('body').innerText()).includes('NaN'))
  assert.deepEqual(boundaryErrors,[])
  record('zero-original-flat-discount-shared-link')
  await boundary.close()

  for(const [name,viewport] of [['desktop',{width:1280,height:900}],['mobile',{width:390,height:844}]]){
    const denied=await browser.newContext({viewport,serviceWorkers:'block'})
    await denied.addInitScript(()=>{
      Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async()=>{throw Error('denied')}}})
      document.execCommand=()=>false
    })
    const deniedPage=await denied.newPage()
    await deniedPage.goto(origin+'/discount-calculator',{waitUntil:'domcontentloaded'})
    await deniedPage.getByRole('button',{name:'결과 링크 복사'}).click()
    await deniedPage.getByRole('alert').getByText(/복사하지 못했습니다/).waitFor()
    assert.equal(await deniedPage.getByRole('button',{name:'복사됨!'}).count(),0)
    record(`${name}-denied-copy-shows-error`)
    await denied.close()
  }
}catch(error){results.push({name:'discount-result-browser',status:'FAIL',message:error.stack?.slice(0,1000)||String(error)})}
finally{
  await browser.close();if(server)await new Promise(done=>server.close(done))
  mkdirSync(resolve(report,'..'),{recursive:true})
  writeFileSync(report,JSON.stringify({at:new Date().toISOString(),origin,results},null,2))
}
for(const item of results)console.log(JSON.stringify(item))
process.exitCode=results.some(item=>item.status==='FAIL')?1:0
