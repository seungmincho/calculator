// node scripts/check-home-hydration-browser.mjs --dir out --result report.json
// node scripts/check-home-hydration-browser.mjs --url https://toolhub.ai.kr --result report.json
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
  for(const [name,viewport,seeded] of [
    ['desktop-fresh',{width:1280,height:900},false],
    ['desktop-recent',{width:1280,height:900},true],
    ['mobile-recent',{width:390,height:844},true],
  ]){
    const context=await browser.newContext({viewport,serviceWorkers:'block'})
    if(seeded)await context.addInitScript(()=>localStorage.setItem('recent_tools',JSON.stringify({health:[{href:'/running-pace',timestamp:2000000000000}]})))
    await context.route('**/*',route=>{
      const request=route.request(),url=new URL(request.url())
      return url.origin===origin&&['GET','HEAD'].includes(request.method())?route.continue():route.abort()
    })
    const page=await context.newPage(),errors=[]
    page.on('pageerror',error=>errors.push(error.message))
    await page.goto(origin+'/',{waitUntil:'networkidle'})
    if(seeded){
      const heading=page.getByText('최근 사용한 도구',{exact:true})
      await heading.waitFor()
      const section=heading.locator('xpath=ancestor::section[1]')
      assert.equal((await section.locator('a').first().getAttribute('href'))?.replace(/\/$/,''),'/running-pace')
    }else{
      await page.getByText('추천',{exact:true}).first().waitFor()
    }
    assert.deepEqual(errors,[],`${name} hydration/runtime errors`)
    results.push({name,status:'PASS'})
    await context.close()
  }
}catch(error){results.push({name:'home-hydration',status:'FAIL',message:error.message.slice(0,450)})}
finally{
  await browser.close();if(server)await new Promise(done=>server.close(done))
  mkdirSync(resolve(report,'..'),{recursive:true})
  writeFileSync(report,JSON.stringify({at:new Date().toISOString(),origin,results},null,2))
}
for(const item of results)console.log(JSON.stringify(item))
process.exitCode=results.some(item=>item.status==='FAIL')?1:0
