// node scripts/check-work-hours-conversion-browser.mjs --dir out --result report.json
// node scripts/check-work-hours-conversion-browser.mjs --url https://toolhub.ai.kr --result report.json
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
  for(const [name,viewport] of [['desktop',{width:1280,height:900}],['mobile',{width:390,height:844}]]){
    const context=await browser.newContext({viewport,serviceWorkers:'block'})
    const page=await context.newPage(),errors=[]
    page.on('pageerror',e=>errors.push(e.message))
    await page.goto(origin+'/work-hours-calculator?tab=conversion&cwage=12000&chours=40&cdays=5',{waitUntil:'domcontentloaded'})
    const table=page.getByText('급여 환산표',{exact:true})
    await table.waitFor()
    const wage=page.locator('input[type="number"]').first()
    const hours=page.locator('input[type="number"]').nth(1)
    assert.equal(await wage.inputValue(),'12000')
    assert.equal(await hours.inputValue(),'40')
    await hours.fill('')
    await table.waitFor({state:'detached'})
    await page.waitForFunction(()=>new URL(location.href).searchParams.get('chours')==='')
    results.push({name:`${name}-empty-hours-clears-result`,status:'PASS'})
    await hours.fill('0')
    assert.equal(await table.count(),0)
    results.push({name:`${name}-zero-hours-stays-empty`,status:'PASS'})
    await hours.fill('20')
    await table.waitFor()
    await page.waitForFunction(()=>new URL(location.href).searchParams.get('chours')==='20')
    results.push({name:`${name}-valid-hours-restores-result`,status:'PASS'})
    await wage.fill('')
    await table.waitFor({state:'detached'})
    results.push({name:`${name}-empty-wage-clears-result`,status:'PASS'})
    assert.ok(errors.length<=1&&errors.every(error=>error.includes('React error #418')),`${name}: ${errors}`)
    await context.close()
  }
}catch(error){results.push({name:'work-hours-conversion',status:'FAIL',message:error.stack?.slice(0,1000)||String(error)})}
finally{
  await browser.close();if(server)await new Promise(done=>server.close(done))
  mkdirSync(resolve(report,'..'),{recursive:true})
  writeFileSync(report,JSON.stringify({at:new Date().toISOString(),origin,results},null,2))
}
for(const item of results)console.log(JSON.stringify(item))
process.exitCode=results.some(item=>item.status==='FAIL')?1:0
