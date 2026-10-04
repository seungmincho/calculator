// node scripts/check-work-hours-share-browser.mjs --dir out --result report.json
// node scripts/check-work-hours-share-browser.mjs --url https://toolhub.ai.kr --result report.json
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
async function open(context){
  const page=await context.newPage()
  await page.goto(origin+'/work-hours-calculator',{waitUntil:'domcontentloaded'})
  await page.getByRole('button',{name:'결과 공유'}).waitFor()
  await page.waitForFunction(()=>new URL(location.href).searchParams.get('tab')==='daily')
  return page
}
try{
  const context=await browser.newContext({serviceWorkers:'block',permissions:['clipboard-read','clipboard-write']})
  const page=await open(context)
  await page.getByRole('button',{name:'결과 공유'}).click()
  await page.getByRole('button',{name:'복사됨!'}).waitFor()
  assert.equal(await page.evaluate(()=>navigator.clipboard.readText()),page.url())
  assert.equal(await page.getByText(/링크를 복사하지 못했습니다/).count(),0)
  results.push({name:'actual-clipboard-copy',status:'PASS'})
  await context.close()

  for(const [name,viewport,reject] of [
    ['desktop-missing-clipboard',{width:1280,height:900},false],
    ['mobile-rejected-clipboard',{width:390,height:844},true],
  ]){
    const denied=await browser.newContext({viewport,serviceWorkers:'block'})
    await denied.addInitScript(({reject})=>{
      Object.defineProperty(navigator,'clipboard',{configurable:true,value:reject?{writeText:async()=>{throw Error('denied')}}:undefined})
      document.execCommand=()=>false
    },{reject})
    const deniedPage=await open(denied)
    await deniedPage.getByRole('button',{name:'결과 공유'}).click()
    await deniedPage.getByRole('alert').getByText(/링크를 복사하지 못했습니다/).waitFor()
    assert.equal(await deniedPage.getByRole('button',{name:'복사됨!'}).count(),0)
    results.push({name,status:'PASS'})
    await denied.close()
  }
}catch(error){results.push({name:'work-hours-share',status:'FAIL',message:error.stack?.slice(0,950)||String(error)})}
finally{
  await browser.close();if(server)await new Promise(done=>server.close(done))
  mkdirSync(resolve(report,'..'),{recursive:true})
  writeFileSync(report,JSON.stringify({at:new Date().toISOString(),origin,results},null,2))
}
for(const item of results)console.log(JSON.stringify(item))
process.exitCode=results.some(item=>item.status==='FAIL')?1:0
