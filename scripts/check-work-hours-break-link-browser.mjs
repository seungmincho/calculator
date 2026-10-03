// node scripts/check-work-hours-break-link-browser.mjs --dir out --result report.json
// node scripts/check-work-hours-break-link-browser.mjs --url https://toolhub.ai.kr --result report.json
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
const cases=[
  {name:'desktop-zero-break',breakValue:'0',expected:'0',pay:'36,000',viewport:{width:1280,height:900}},
  {name:'mobile-zero-break',breakValue:'0',expected:'0',pay:'36,000',viewport:{width:390,height:844}},
  {name:'thirty-minute-break',breakValue:'30',expected:'30',pay:'30,000',viewport:{width:1280,height:900}},
  {name:'invalid-negative-break',breakValue:'-1',expected:'60',pay:'24,000',viewport:{width:1280,height:900}},
]
try{
  for(const test of cases){
    const context=await browser.newContext({viewport:test.viewport,serviceWorkers:'block'})
    const page=await context.newPage(),errors=[]
    page.on('pageerror',e=>errors.push(e.message))
    const query=new URLSearchParams({mode:'period',wage:'12000',start:'2026-10-05',end:'2026-10-05',days:'1000000',st:'09:00',et:'12:00',break:test.breakValue})
    await page.goto(origin+'/work-hours-calculator?'+query,{waitUntil:'domcontentloaded'})
    await page.waitForFunction(()=>new URL(location.href).searchParams.get('tab')==='daily')
    await page.waitForFunction(expected=>new URL(location.href).searchParams.get('break')===expected,test.expected)
    const pay=page.locator('.text-3xl.font-bold.text-fg.tabular-nums').first()
    await page.waitForFunction(expected=>[...document.querySelectorAll('.text-3xl.font-bold.text-fg.tabular-nums')].some(el=>el.textContent?.includes(expected)),test.pay)
    assert.ok((await pay.innerText()).includes(test.pay),`${test.name}: ${await pay.innerText()}`)
    assert.ok(errors.length<=1&&errors.every(error=>error.includes('React error #418')),`${test.name}: ${errors}`)
    results.push({name:test.name,status:'PASS',breakValue:new URL(page.url()).searchParams.get('break'),pay:test.pay})
    await context.close()
  }
}catch(error){results.push({name:'work-hours-break-link',status:'FAIL',message:error.stack?.slice(0,950)||String(error)})}
finally{
  await browser.close();if(server)await new Promise(done=>server.close(done))
  mkdirSync(resolve(report,'..'),{recursive:true})
  writeFileSync(report,JSON.stringify({at:new Date().toISOString(),origin,results},null,2))
}
for(const item of results)console.log(JSON.stringify(item))
process.exitCode=results.some(item=>item.status==='FAIL')?1:0
