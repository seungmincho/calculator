// node scripts/check-percent-copy-browser.mjs --dir out --result report.json
// node scripts/check-percent-copy-browser.mjs --url https://toolhub.ai.kr --result report.json
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
  await page.goto(origin+'/percent-calculator',{waitUntil:'domcontentloaded'})
  const button=page.locator('#pc-of').locator('..').getByRole('button',{name:'결과 복사'})
  await button.waitFor()
  await page.waitForTimeout(300)
  return {page,button}
}
try{
  const allowed=await browser.newContext({serviceWorkers:'block',permissions:['clipboard-read','clipboard-write']})
  const normal=await open(allowed)
  await normal.button.click()
  await normal.page.getByRole('button',{name:'복사됨!'}).first().waitFor()
  assert.equal(await normal.page.evaluate(()=>navigator.clipboard.readText()),'7500')
  assert.equal(await normal.page.getByText(/결과를 복사하지 못했습니다/).count(),0)
  results.push({name:'actual-result-copied',status:'PASS'})
  await allowed.close()

  for(const [name,viewport,reject] of [
    ['desktop-no-clipboard',{width:1280,height:900},false],
    ['mobile-rejected-clipboard',{width:390,height:844},true],
  ]){
    const denied=await browser.newContext({viewport,serviceWorkers:'block'})
    await denied.addInitScript(({reject})=>{
      Object.defineProperty(navigator,'clipboard',{configurable:true,value:reject?{writeText:async()=>{throw Error('denied')}}:undefined})
      document.execCommand=()=>false
    },{reject})
    const {page,button}=await open(denied)
    await button.click()
    await page.getByRole('alert').getByText(/결과를 복사하지 못했습니다/).waitFor()
    assert.equal(await page.getByRole('button',{name:'복사됨!'}).count(),0)
    results.push({name,status:'PASS'})
    await denied.close()
  }

  const fallback=await browser.newContext({serviceWorkers:'block'})
  await fallback.addInitScript(()=>{
    Object.defineProperty(navigator,'clipboard',{configurable:true,value:undefined})
    document.execCommand=()=>true
  })
  const recovered=await open(fallback)
  await recovered.button.click()
  await recovered.page.getByRole('button',{name:'복사됨!'}).first().waitFor()
  assert.equal(await recovered.page.getByText(/결과를 복사하지 못했습니다/).count(),0)
  results.push({name:'successful-fallback-confirmed',status:'PASS'})
  await fallback.close()
}catch(error){results.push({name:'percent-copy',status:'FAIL',message:error.stack?.slice(0,950)||String(error)})}
finally{
  await browser.close();if(server)await new Promise(done=>server.close(done))
  mkdirSync(resolve(report,'..'),{recursive:true})
  writeFileSync(report,JSON.stringify({at:new Date().toISOString(),origin,results},null,2))
}
for(const item of results)console.log(JSON.stringify(item))
process.exitCode=results.some(item=>item.status==='FAIL')?1:0
