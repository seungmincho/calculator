// node scripts/check-search-dialog-browser.mjs --dir out --result report.json
// node scripts/check-search-dialog-browser.mjs --url https://toolhub.ai.kr --result report.json
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
const browser=await chromium.launch({headless:true}),results=[],runtimeErrors=[]
const recent=JSON.stringify({health:[{href:'/running-pace',timestamp:2000000000000}]})
try{
  for(const [mode,viewport] of [['desktop',{width:1280,height:900}],['mobile',{width:390,height:844}]]){
    const context=await browser.newContext({viewport,serviceWorkers:'block'})
    await context.route('**/*',route=>{
      const request=route.request(),url=new URL(request.url())
      return url.origin===origin&&['GET','HEAD'].includes(request.method())?route.continue():route.abort()
    })
    const page=await context.newPage();page.setDefaultTimeout(15000)
    page.on('pageerror',error=>runtimeErrors.push(`${mode}:${error.message}`))
    const open=async()=>{
      await page.goto(origin+'/',{waitUntil:'networkidle'})
      await page.evaluate(value=>localStorage.setItem('recent_tools',value),recent)
      await page.reload({waitUntil:'networkidle'})
      await page.keyboard.press('Control+k')
      const dialog=page.getByRole('dialog'),input=dialog.getByRole('combobox')
      await input.waitFor()
      return {dialog,input}
    }
    let {dialog,input}=await open()
    let options=dialog.getByRole('option')
    assert.equal(await options.first().getAttribute('href'),'/running-pace')
    assert.equal(await options.first().getAttribute('aria-selected'),'true')
    assert.equal(await options.first().getAttribute('id'),await input.getAttribute('aria-activedescendant'))
    await input.press('Enter')
    await page.waitForURL(url=>new URL(url).pathname.replace(/\/$/,'')==='/running-pace')
    results.push({name:`${mode}:recent-enter`,status:'PASS'})

    ;({dialog,input}=await open());options=dialog.getByRole('option')
    const secondHref=await options.nth(1).getAttribute('href')
    await input.press('ArrowDown')
    assert.equal(await options.nth(1).getAttribute('aria-selected'),'true')
    assert.equal(await options.nth(1).getAttribute('id'),await input.getAttribute('aria-activedescendant'))
    await input.press('Enter')
    await page.waitForURL(url=>new URL(url).pathname.replace(/\/$/,'')===secondHref)
    results.push({name:`${mode}:suggestion-arrow-enter`,status:'PASS'})

    ;({dialog,input}=await open());options=dialog.getByRole('option')
    const lastHref=await options.last().getAttribute('href')
    await input.press('ArrowUp')
    assert.equal(await options.last().getAttribute('aria-selected'),'true')
    assert.equal(await options.last().getAttribute('id'),await input.getAttribute('aria-activedescendant'))
    await input.press('Enter')
    await page.waitForURL(url=>new URL(url).pathname.replace(/\/$/,'')===lastHref)
    results.push({name:`${mode}:suggestion-wrap`,status:'PASS'})

    ;({dialog,input}=await open());options=dialog.getByRole('option')
    await input.fill('러닝 페이스')
    assert.equal(await options.first().getAttribute('href'),'/running-pace')
    assert.equal(await options.first().getAttribute('id'),await input.getAttribute('aria-activedescendant'))
    await input.press('Enter')
    await page.waitForURL(url=>new URL(url).pathname.replace(/\/$/,'')==='/running-pace')
    results.push({name:`${mode}:query-enter`,status:'PASS'})

    ;({dialog,input}=await open());options=dialog.getByRole('option')
    await input.fill('not-a-tool-zzzz')
    assert.equal(await options.count(),0)
    assert.equal(await input.getAttribute('aria-activedescendant'),null)
    await input.press('ArrowDown');await input.press('ArrowUp');await input.press('Enter')
    assert.equal(new URL(page.url()).pathname,'/')
    await input.press('Escape')
    assert.equal(await dialog.count(),0)
    results.push({name:`${mode}:empty-and-escape`,status:'PASS'})
    await context.close()
  }
  // The pre-existing homepage emits React #418 once per hydration in the baseline deployment.
  assert.ok(runtimeErrors.every(message=>message.includes('Minified React error #418')),`Unexpected runtime error: ${runtimeErrors.join('; ')}`)
}catch(error){results.push({name:'browser-flow',status:'FAIL',message:error.message.slice(0,450)})}
finally{
  await browser.close();if(server)await new Promise(done=>server.close(done))
  mkdirSync(resolve(report,'..'),{recursive:true})
  writeFileSync(report,JSON.stringify({at:new Date().toISOString(),origin,results,runtimeErrors},null,2))
}
for(const item of results)console.log(JSON.stringify(item))
process.exitCode=results.some(item=>item.status==='FAIL')?1:0
