// node scripts/check-navigation-i18n-browser.mjs --dir out --result report.json
// node scripts/check-navigation-i18n-browser.mjs --url https://toolhub.ai.kr --result report.json
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
const record=name=>results.push({name,status:'PASS'})
try{
  const context=await browser.newContext({viewport:{width:320,height:780},serviceWorkers:'block'})
  await context.addInitScript(()=>localStorage.setItem('recent_tools',JSON.stringify({calculators:[{href:'/salary-calculator',timestamp:2000000000000}]})))
  await context.route('**/*',route=>new URL(route.request().url()).origin===origin?route.continue():route.abort())
  const page=await context.newPage()
  page.on('pageerror',error=>errors.push(error.message))
  await page.goto(origin+'/',{waitUntil:'networkidle'})
  await page.locator('button:has(svg.lucide-languages):visible').first().click()
  await page.getByRole('button',{name:'English',exact:true}).last().click()
  await page.getByRole('heading',{level:1,name:messages.en.homePage.hero.title}).waitFor()
  assert.equal(await page.locator('nav[aria-label="'+messages.en.mobileNav.label+'"]').count(),1)
  assert.equal(await page.locator('a[href="#main-content"]').innerText(),messages.en.accessibility.skipToContent)
  record('language-switch-updates-home-header-and-bottom-nav')

  await page.locator('nav[aria-label="'+messages.en.mobileNav.label+'"]').getByRole('button',{name:messages.en.mobileNav.search}).click()
  let dialog=page.getByRole('dialog',{name:messages.en.common.search})
  let input=dialog.getByRole('combobox',{name:messages.en.common.search})
  await input.waitFor()
  assert.equal(await input.getAttribute('placeholder'),messages.en.searchDialog.placeholder)
  await dialog.getByText(messages.en.header.recent,{exact:true}).first().waitFor()
  await dialog.getByText(messages.en.searchDialog.popular,{exact:true}).first().waitFor()
  const hints=await dialog.innerText()
  for(const key of ['navigate','open','results'])assert.ok(hints.includes(messages.en.searchDialog[key]),key)
  record('english-search-recent-hints-and-accessible-names')

  await input.fill('Comprehensive Property Tax')
  const longResult=dialog.getByRole('option').filter({hasText:'Comprehensive Property Tax Calculator'}).first()
  await longResult.waitFor()
  const bounds=await page.evaluate(()=>({viewport:innerWidth,document:document.documentElement.scrollWidth,dialog:document.querySelector('[role="dialog"] > div:last-child')?.getBoundingClientRect().right,offenders:[...document.querySelectorAll('body *')].map(el=>({right:Math.round(el.getBoundingClientRect().right),tag:el.tagName,className:String(el.className).slice(0,85),text:el.textContent?.trim().slice(0,55)})).filter(item=>item.right>innerWidth+2).slice(0,8)}))
  assert.ok(bounds.document<=bounds.viewport+2&&bounds.dialog<=bounds.viewport+2,JSON.stringify(bounds))
  await input.fill('zzzxxyy-no-results')
  await dialog.getByText(messages.en.searchDialog.noResults,{exact:true}).waitFor()
  assert.equal(await input.getAttribute('aria-activedescendant'),null)
  await dialog.getByRole('button',{name:messages.en.common.clear}).click()
  assert.equal(await input.inputValue(),'')
  record('mobile-long-title-empty-result-and-clear')

  await input.fill('loan')
  await dialog.getByRole('option').first().waitFor()
  await input.press('ArrowDown')
  const selectedId=await input.getAttribute('aria-activedescendant')
  assert.ok(selectedId)
  const target=await dialog.locator('[id="'+selectedId+'"]').getAttribute('href')
  const selectedLabel=(await dialog.locator('[id="'+selectedId+'"]').innerText()).split('\n')[0]
  assert.ok(target?.startsWith('/'))
  await input.press('Enter')
  await page.waitForURL(url=>new URL(url).pathname.replace(/\/$/,'')===target)
  const breadcrumb=page.locator('nav[aria-label="Breadcrumb"]')
  await breadcrumb.waitFor()
  assert.equal(await breadcrumb.locator('[aria-current="page"]').innerText(),selectedLabel)
  await page.goBack({waitUntil:'networkidle'})
  await page.getByRole('heading',{level:1,name:messages.en.homePage.hero.title}).waitFor()
  await page.getByRole('button',{name:messages.en.homePage.hero.searchPlaceholder}).click()
  dialog=page.getByRole('dialog',{name:messages.en.common.search})
  input=dialog.getByRole('combobox',{name:messages.en.common.search})
  assert.equal(await input.inputValue(),'')
  await input.fill('calculator')
  await dialog.getByRole('option').first().waitFor()
  await input.press('Escape')
  await dialog.waitFor({state:'detached'})
  record('keyboard-select-back-research-and-escape')

  await page.locator('button:has(svg.lucide-languages):visible').first().click()
  await page.getByRole('button',{name:'한국어',exact:true}).last().click()
  await page.getByRole('heading',{level:1,name:messages.ko.homePage.hero.title}).waitFor()
  await page.getByRole('button',{name:messages.ko.homePage.hero.searchPlaceholder}).click()
  dialog=page.getByRole('dialog',{name:messages.ko.common.search})
  input=dialog.getByRole('combobox',{name:messages.ko.common.search})
  assert.equal(await input.getAttribute('placeholder'),messages.ko.searchDialog.placeholder)
  await input.fill('zzzxxyy-no-results')
  await dialog.getByText(messages.ko.searchDialog.noResults,{exact:true}).waitFor()
  record('korean-switch-search-and-empty-result')
  await input.press('Escape')
  await page.getByRole('button',{name:messages.ko.common.menu}).click()
  const mobileInput=page.getByRole('textbox',{name:messages.ko.common.search})
  await mobileInput.fill('zzzxxyy-no-results')
  await page.getByText(messages.ko.searchDialog.noResults,{exact:true}).last().waitFor()
  await page.getByRole('button',{name:messages.ko.common.clear}).click()
  assert.equal(await mobileInput.inputValue(),'')
  record('korean-mobile-menu-search-clear-accessibility')
  await context.close()

  const desktop=await browser.newContext({viewport:{width:1280,height:800},serviceWorkers:'block'})
  await desktop.addInitScript(()=>localStorage.setItem('language','en'))
  await desktop.route('**/*',route=>new URL(route.request().url()).origin===origin?route.continue():route.abort())
  const desktopPage=await desktop.newPage()
  desktopPage.on('pageerror',error=>errors.push(error.message))
  await desktopPage.goto(origin+'/',{waitUntil:'networkidle'})
  await desktopPage.getByRole('heading',{level:1,name:messages.en.homePage.hero.title}).waitFor()
  await desktopPage.keyboard.press('Control+k')
  const desktopDialog=desktopPage.getByRole('dialog',{name:messages.en.common.search})
  assert.equal(await desktopDialog.getByRole('combobox').getAttribute('placeholder'),messages.en.searchDialog.placeholder)
  record('desktop-keyboard-shortcut-english-search')
  await desktop.close()
  assert.deepEqual(errors,[])
}catch(error){results.push({name:'navigation-i18n',status:'FAIL',message:error.stack?.slice(0,1100)||String(error),runtimeErrors:errors})}
finally{
  await browser.close();if(server)await new Promise(done=>server.close(done))
  mkdirSync(resolve(report,'..'),{recursive:true})
  writeFileSync(report,JSON.stringify({at:new Date().toISOString(),origin,results},null,2))
}
for(const item of results)console.log(JSON.stringify(item))
process.exitCode=results.some(item=>item.status==='FAIL')?1:0
