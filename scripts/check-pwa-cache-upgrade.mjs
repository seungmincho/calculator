// node scripts/check-pwa-cache-upgrade.mjs --dir out --result report.json
// node scripts/check-pwa-cache-upgrade.mjs --url https://toolhub.ai.kr --result report.json
import assert from 'node:assert/strict'
import {createReadStream,mkdirSync,statSync,writeFileSync} from 'node:fs'
import {createServer} from 'node:http'
import {extname,resolve,sep} from 'node:path'
import {chromium} from 'playwright'

const args=process.argv.slice(2),option=key=>args[args.indexOf(key)+1]
const directory=args.includes('--dir')?resolve(option('--dir')):null,report=resolve(option('--result'))
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript','.css':'text/css','.json':'application/json','.xml':'application/xml'}
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
  const context=await browser.newContext({serviceWorkers:'allow'})
  const page=await context.newPage();page.setDefaultTimeout(30000)
  await page.goto(origin+'/sitemap.xml',{waitUntil:'load'})
  await page.evaluate(async()=>{
    for(const version of ['v4.31.16','v4.31.17','v4.31.18','v4.31.19','v4.31.20']){
      await caches.open(`toolhub-static-${version}`)
      await caches.open(`toolhub-dynamic-${version}`)
    }
  })
  await page.goto(origin+'/',{waitUntil:'load'})
  let state,ready=false
  const deadline=Date.now()+30000
  while(Date.now()<deadline){
    state=await page.evaluate(async()=>({
      active:(await navigator.serviceWorker.getRegistration())?.active?.state==='activated',
      controlled:!!navigator.serviceWorker.controller,
      cacheNames:await caches.keys()
    }))
    ready=state.active&&state.controlled&&state.cacheNames.includes('toolhub-static-v4.31.21')&&
      !state.cacheNames.some(key=>/toolhub-(?:static|dynamic)-v4\.31\.(?:16|17|18|19|20)$/.test(key))
    if(ready)break
    await new Promise(done=>setTimeout(done,200))
  }
  assert.ok(ready,`Service worker activation or cache cleanup did not finish: ${JSON.stringify(state)}`)
  const keys=state.cacheNames
  results.push({name:'previous-static-and-dynamic-caches-removed',status:'PASS',cacheNames:keys})
  await context.close()
}catch(error){results.push({name:'pwa-upgrade',status:'FAIL',message:error.message.slice(0,450)})}
finally{
  await browser.close();if(server)await new Promise(done=>server.close(done))
  mkdirSync(resolve(report,'..'),{recursive:true})
  writeFileSync(report,JSON.stringify({at:new Date().toISOString(),origin,results},null,2))
}
for(const item of results)console.log(JSON.stringify(item))
process.exitCode=results.some(item=>item.status==='FAIL')?1:0
