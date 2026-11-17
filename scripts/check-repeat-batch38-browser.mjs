import { PNG } from 'pngjs'
import { chromium } from 'playwright'
import assert from 'node:assert/strict'
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'




// Independent real-browser checks. --list never starts Chrome; case-name filters
// preserve previous evidence so only changed boundaries need to be rerun.
const base = process.env.VERIFY_BASE_URL || 'http://127.0.0.1:3039'
const out = resolve('docs/verify/2026-11-17-repeat-batch38/browser')
const only = process.argv[2]
const messages = Object.fromEntries(['ko', 'en'].map(language => [language, JSON.parse(readFileSync(`messages/${language}.json`, 'utf8'))]))
const tr = (ns, key, language = 'ko', values = {}) => {
  const value = key.split('.').reduce((object, key) => object?.[key], messages[language][ns])
  assert.equal(typeof value, 'string', `Missing ${language}:${ns}.${key}`)
  return value.replace(/\{(\w+)\}/g, (match, key) => values[key] ?? match)
}
const shared = (key, language = 'ko', values = {}) => tr('shareResult', key, language, values)
const wait = ms => new Promise(resolve => setTimeout(resolve, ms))
async function poll(predicate, description, attempts = 180) { for (let n = 0; n < attempts; n++) { if (await predicate()) return; await wait(100) }; assert.fail(`Timed out: ${description}`) }
const cases = [], results = []
const test = (name, fn, options = {}) => cases.push({ name, fn, options })

async function run(browser, { name, fn, options }) {
  if (only && !only.split(',').some(part => name.includes(part))) return
  const context = await browser.newContext({ viewport: { width: options.width ?? 1280, height: 900 }, timezoneId: 'Asia/Seoul', serviceWorkers: 'block', permissions: ['clipboard-read', 'clipboard-write'], acceptDownloads: true })
  const errors = [], hydration = [], external = [], consoleErrors = [], network = [], logs = []
  await context.addInitScript(options => {
    if (!/^https?:$/.test(location.protocol)) return
    if (!localStorage.getItem('__batch38Seeded')) { localStorage.setItem('language', options.language ?? 'ko'); localStorage.setItem('theme', options.dark ? 'dark' : 'light'); localStorage.setItem('__batch38Seeded', '1') }
    window.__unhandled = []; addEventListener('unhandledrejection', event => window.__unhandled.push(String(event.reason)))

  }, options)
  await context.route('**/*', route => { const request = route.request(); network.push(request.url() + '\n' + (request.postData() ?? '')); const url = new URL(request.url()); if (url.origin === base || ['blob:', 'data:'].includes(url.protocol)) return route.continue(); external.push(url.href); return route.abort('blockedbyclient') })
  context.on('page', page => {
    page.setDefaultTimeout(16000); page.setDefaultNavigationTimeout(120000)
    page.on('pageerror', error => errors.push(error.stack ?? String(error)))
    page.on('console', message => { logs.push(message.text()); if (message.type() === 'error') { consoleErrors.push(message.text()); if (/hydration|hydrating|did not match|Minified React error/i.test(message.text())) hydration.push(message.text()) } })
    page.on('dialog', dialog => dialog.accept())
  })
  const page = await context.newPage()
  page.__verificationSecrets = []
  const redact = value => { let text = String(value); if (options.sensitive) for (const secret of page.__verificationSecrets.filter(value => value.length >= 4)) text = text.replaceAll(secret, '[redacted generated value]'); return text }
  const open = async (slug, query = '', target = page) => {
    await target.goto(`${base}/${slug}/${query}`, { waitUntil: 'domcontentloaded' }); await target.locator('main h1').first().waitFor()
    await target.waitForFunction(() => [...document.querySelectorAll('[data-language-toggle] button')].some(element => Object.keys(element).some(key => key.startsWith('__reactProps$')))); await wait(200)
  }
  let status = 'pass', detail = {}, error
  const watchdog = setTimeout(() => { void context.close().catch(() => {}) }, 120000)
  try { detail = await fn({ page, context, open, network, logs }) ?? {}; assert.deepEqual(errors, [], 'JS page errors'); assert.deepEqual(hydration, [], 'Hydration errors'); for (const active of context.pages()) assert.deepEqual(await active.evaluate(() => window.__unhandled), [], 'Unhandled rejections'); assert.ok(!/\b(?:shareResult)\.[a-zA-Z][\w.]+/.test(await page.locator('body').innerText()), 'Raw translation key') }
  catch (cause) { status = 'fail'; error = redact(cause.stack ?? String(cause)); await page.screenshot({ path: resolve(out, `${name}-failure.png`), caret: 'initial', mask: options.sensitive ? [page.locator('[data-password-value]'), page.locator('[data-password-copy-recovery] textarea'), page.locator('#pg-check')] : [] }).catch(() => {}); writeFileSync(resolve(out, `${name}-failure.txt`), `${error}\n\n${options.sensitive ? 'Sensitive page body intentionally omitted.' : await page.locator('body').innerText().catch(() => '')}`) }
  const result = { name, status, checkedAt: new Date().toISOString(), ...detail, error, errors: errors.map(redact), hydration: hydration.map(redact), consoleErrors: consoleErrors.map(redact), external: [...new Set(external)].map(redact) }
  clearTimeout(watchdog); results.push(result); writeFileSync(resolve(out, `${name}-evidence.json`), JSON.stringify(result, null, 2)); console.log(`${status.toUpperCase()} ${name}${error ? `: ${error.split('\n')[0]}` : ''}`); await context.close()
}
async function changeLanguage(page, language) {
  await page.evaluate(() => scrollTo({ top: 0, behavior: 'instant' })); const toggle = page.locator('[data-language-toggle]:visible').first()
  await toggle.locator('button[aria-expanded]').click(); await toggle.getByRole('button', { name: language === 'en' ? 'English' : '한국어', exact: true }).last().click()
}
async function screenshot(page, name, panel) {
  if (panel) { await panel.evaluate(element => element.scrollIntoView({ block: 'center', behavior: 'instant' })); await panel.screenshot({ path: resolve(out, `${name}-panel.png`), caret: 'initial' }) }
  await page.evaluate(() => scrollTo({ top: 0, behavior: 'instant' })); await page.screenshot({ path: resolve(out, `${name}-top.png`), caret: 'initial' })
}
async function mobile(page, fields, controls) {
  const box = await page.evaluate(() => ({ viewport: innerWidth, body: document.body.scrollWidth, document: document.documentElement.scrollWidth }))
  assert.ok(box.body <= box.viewport + 1 && box.document <= box.viewport + 1, JSON.stringify(box)); assert.equal(await page.evaluate(() => document.documentElement.classList.contains('dark')), true)
  for (const field of fields) assert.ok(await field.evaluate(node => parseFloat(getComputedStyle(node).fontSize)) >= 16)
  for (const control of controls) assert.ok((await control.boundingBox()).height >= 44)
  return box
}
async function download(page, action, filename) {
  const pending = page.waitForEvent('download'); await action(); const file = await pending; const path = resolve(out, filename ?? file.suggestedFilename()); await file.saveAs(path)
  const bytes = readFileSync(path); return { filename: file.suggestedFilename(), path, bytes, text: bytes.toString('utf8') }
}



// Native clipboard remains available separately; failure/delay modes do not impersonate OS success.
async function observeDecisionPorts(context) {
  await context.addInitScript(() => {
    const nativeClipboard=navigator.clipboard, nativeRead=nativeClipboard?.readText.bind(nativeClipboard), nativeWrite=nativeClipboard?.writeText.bind(nativeClipboard), legacy=document.execCommand.bind(document)
    window.__clipboardMode='native';window.__legacyMode='false';window.__clipboardCalls=[];window.__legacyCalls=[];window.__clipboardPending=[];window.__nativeClipboardRead=nativeRead
    const api={writeText(text){window.__clipboardCalls.push(String(text));if(window.__clipboardMode==='reject')return Promise.reject(new DOMException('fixture denied','NotAllowedError'));if(window.__clipboardMode==='hold')return new Promise((resolve,reject)=>window.__clipboardPending.push({text:String(text),resolve,reject}));return nativeWrite(text)}}
    window.__setClipboardMode=mode=>{window.__clipboardMode=mode;Object.defineProperty(navigator,'clipboard',{configurable:true,value:mode==='absent'?undefined:api})};window.__setClipboardMode('native')
    document.execCommand=(command,...rest)=>{if(command!=='copy')return legacy(command,...rest);window.__legacyCalls.push({text:document.activeElement?.value??'',mode:window.__legacyMode});if(window.__legacyMode==='throw')throw new Error('fixture legacy error');if(window.__legacyMode==='native')return legacy(command,...rest);return window.__legacyMode==='true'}
    const nativeSet=setTimeout.bind(window),nativeClear=clearTimeout.bind(window);window.__orderTimers=[];window.__orderHold=false
    window.setTimeout=(callback,delay,...args)=>{if(typeof callback!=='function'||![400,500,2000].includes(delay))return nativeSet(callback,delay,...args);const item={delay,callback:()=>callback(...args),canceled:false,fired:false,held:window.__orderHold&&[400,500].includes(delay)};item.id=nativeSet(()=>{if(item.held)return;item.fired=true;item.callback()},delay);window.__orderTimers.push(item);return item.id}
    window.clearTimeout=id=>{const item=window.__orderTimers.findLast(item=>item.id===id);if(item)item.canceled=true;return nativeClear(id)}
    window.__releaseOrderTimer=()=>{const item=window.__orderTimers.findLast(item=>item.held&&!item.canceled&&!item.fired);if(item){item.fired=true;item.callback()}}
  })
}

async function observeShareRender(context){await context.addInitScript(()=>{
  window.__shareRenders=[];window.__shareHeld=[];window.__shareRenderMode='native';window.__shareUrls=[];window.__shareCalls=[];window.__shareMode='file'
  const texts=new WeakMap(),fill=CanvasRenderingContext2D.prototype.fillText,encode=HTMLCanvasElement.prototype.toBlob,create=URL.createObjectURL.bind(URL),revoke=URL.revokeObjectURL.bind(URL)
  CanvasRenderingContext2D.prototype.fillText=function(text,x,y,...rest){if(this.canvas.width===1080&&this.canvas.height===1350){let rows=texts.get(this.canvas);if(!rows){rows=[];texts.set(this.canvas,rows)}rows.push({text:String(text),x,y})}return fill.call(this,text,x,y,...rest)}
  HTMLCanvasElement.prototype.toBlob=function(callback,...args){if(this.width!==1080||this.height!==1350)return encode.call(this,callback,...args);const item={texts:texts.get(this)??[],mode:window.__shareRenderMode,delivered:false};window.__shareRenders.push(item);return encode.call(this,blob=>{item.bytes=blob?.size;const deliver=()=>{if(item.delivered)return;item.delivered=true;callback(item.mode==='null'?null:blob)};if(item.mode==='hold')window.__shareHeld.push(deliver);else deliver()},...args)}
  URL.createObjectURL=blob=>{const url=create(blob);window.__shareUrls.push({url,type:blob.type,bytes:blob.size,revoked:false});return url};URL.revokeObjectURL=url=>{const item=window.__shareUrls.find(item=>item.url===url);if(item)item.revoked=true;return revoke(url)}
  window.__shareRelease=()=>{for(const deliver of window.__shareHeld.splice(0))deliver()}
  Object.defineProperty(navigator,'canShare',{configurable:true,value:()=>window.__shareMode==='file'})
  Object.defineProperty(navigator,'share',{configurable:true,value:async data=>{const record={title:data.title,text:data.text,url:data.url,files:[],mode:window.__shareMode};window.__shareCalls.push(record);if(window.__shareMode==='abort')throw new DOMException('fixture canceled','AbortError');if(window.__shareMode==='throw')throw new Error('fixture native share failure');for(const file of data.files??[])record.files.push({name:file.name,type:file.type,bytes:[...new Uint8Array(await file.arrayBuffer())]});record.done=true}})
})}
const shareBox=page=>page.locator('[data-share-result]').first()
const shareAction=(page,action)=>shareBox(page).locator(`[data-share-action="${action}"]`)
async function shareBoot(context,open,page){await observeDecisionPorts(context);await observeShareRender(context);await open('csat-grade','?kor=84&math=80&eng=85&hist=40&inq1=40&inq2=42');await page.locator('#csat-kor').waitFor();await poll(async()=>await page.locator('#csat-kor').inputValue()==='84','CSAT input restored');await shareAction(page,'save').waitFor()}
async function setShareScore(page,value){await page.locator('#csat-kor').fill(String(value));await poll(()=>Promise.resolve(new URL(page.url()).searchParams.get('kor')===String(value)),'current result URL synced');await poll(async()=>!await shareAction(page,'copy').isDisabled(),'current share actions available')}
async function heldRender(page){await poll(()=>page.evaluate(()=>window.__shareHeld.length>0),'native share card toBlob callback held')}

test('share-current-native-clipboard-and-real-png',async({page,context,open})=>{
  await shareBoot(context,open,page);await setShareScore(page,93);const url=page.url();await shareAction(page,'copy').click();await poll(()=>page.evaluate(()=>window.__nativeClipboardRead()).then(value=>value===url),'native exact current URL copied')
  const file=await download(page,()=>shareAction(page,'save').click(),'current-result-native.png'),png=PNG.sync.read(file.bytes);assert.equal(png.width,1080);assert.equal(png.height,1350);assert.equal(png.data[3],255)
  const render=await page.evaluate(()=>window.__shareRenders.at(-1));const text=render.texts.map(row=>row.text).join('\n');assert.match(text,/93점/);assert.match(text,/2026/);assert.match(text,/2027/);assert.ok(text.includes(shared('cta')));writeFileSync(resolve(out,'current-result-native-canvas.json'),JSON.stringify(render,null,2))
  const created=await page.evaluate(()=>window.__shareUrls.filter(item=>item.type==='image/png').at(-1));assert.ok(created&&!created.revoked);await setShareScore(page,70);assert.equal(await page.evaluate(url=>window.__shareUrls.find(item=>item.url===url).revoked,created.url),false,'already-clicked download URL stays valid after edit')
  return{nativeClipboardExact:true,pngDimensions:[1080,1350],pngBytes:file.bytes.length,fileName:file.filename,currentRawScore:93,currentContextYears:[2026,2027],clickedUrlSurvivesLaterEdit:true}
})

test('share-native-render-late-input-url-and-unmount',async({page,context,open})=>{
  await shareBoot(context,open,page);let downloads=0;page.on('download',()=>downloads++)
  await page.evaluate(()=>window.__shareRenderMode='hold');await shareAction(page,'save').click();await heldRender(page);await setShareScore(page,91);await page.evaluate(()=>window.__shareRelease());await wait(80);assert.equal(downloads,0);assert.equal(await page.evaluate(()=>window.__shareUrls.length),0)
  await shareAction(page,'share').click();await heldRender(page);await page.evaluate(()=>{const url=new URL(location.href);url.searchParams.set('native-fixture','changed-url-only');history.replaceState(history.state,'',url)});await page.evaluate(()=>window.__shareRelease());await poll(async()=>!await shareAction(page,'share').isDisabled(),'URL-only stale pending clears');assert.equal(await page.evaluate(()=>window.__shareCalls.length),0);assert.equal(await page.evaluate(()=>window.__clipboardCalls.length),0)
  await shareAction(page,'save').click();await heldRender(page);await page.locator('header a[href="/"]').filter({visible:true}).first().click();await poll(async()=>await page.locator('#csat-kor').count()===0,'actual consumer unmounted');await page.evaluate(()=>window.__shareRelease());await wait(80);assert.equal(downloads,0);assert.equal(await page.evaluate(()=>window.__shareUrls.length),0)
  return{nativePngCreatedBeforeLateCallback:true,afterInputChangeDownload:0,urlOnlyChangeShareAndFallback:0,afterUnmountDownload:0,lateUrlAllocations:0}
})

test('share-file-text-abort-and-render-error-ports',async({page,context,open})=>{
  await shareBoot(context,open,page);const url=page.url();await shareAction(page,'share').click();await poll(()=>page.evaluate(()=>window.__shareCalls.at(-1)?.done),'mock native file share received');const fileCall=await page.evaluate(()=>window.__shareCalls.at(-1));assert.equal(fileCall.files.length,1);assert.ok(fileCall.text.endsWith(url));assert.equal(fileCall.files[0].type,'image/png');const png=PNG.sync.read(Buffer.from(fileCall.files[0].bytes));assert.equal(png.width,1080);assert.equal(png.height,1350)
  await page.evaluate(()=>window.__shareMode='text');await shareAction(page,'share').click();await poll(()=>page.evaluate(()=>window.__shareCalls.length===2&&window.__shareCalls[1].done),'text share received');const textCall=await page.evaluate(()=>window.__shareCalls.at(-1));assert.equal(textCall.url,url);assert.equal(textCall.files.length,0)
  await page.evaluate(()=>window.__shareMode='abort');await shareAction(page,'share').click();await poll(async()=>!await shareAction(page,'share').isDisabled(),'AbortError returns idle');assert.equal(await page.evaluate(()=>window.__clipboardCalls.length+window.__legacyCalls.length),0)
  await page.evaluate(()=>window.__shareRenderMode='null');await shareAction(page,'save').click();await shareBox(page).getByRole('alert').filter({hasText:shared('saveFailed')}).waitFor();await page.evaluate(()=>{window.__setClipboardMode('reject');window.__shareMode='text'});await shareAction(page,'share').click();await shareBox(page).locator('[data-share-recovery]').waitFor();assert.equal(await shareBox(page).locator('textarea').inputValue(),url)
  return{mockFileSharePngDimensions:[1080,1350],fileBytes:fileCall.files[0].bytes.length,fileName:fileCall.files[0].name,textShareSnapshotUrl:true,AbortErrorFallback:0,renderRejectSaveError:true,renderRejectSameLinkRecovery:true,actualOsShareCalls:0}
})

test('share-copy-false-manual-retry-and-late-requests',async({page,context,open})=>{
  await shareBoot(context,open,page);await page.evaluate(()=>window.__setClipboardMode('reject'));await shareAction(page,'copy').click();await shareBox(page).locator('[data-share-recovery]').waitFor();assert.equal(await shareBox(page).getByRole('alert').innerText(),shared('copyFailed'));assert.doesNotMatch(shared('copyFailed'),/주소창|address bar/i);const link=await shareBox(page).locator('textarea').inputValue();assert.equal(link,page.url())
  await page.evaluate(()=>{window.__nativeTextareaSelect=HTMLTextAreaElement.prototype.select;HTMLTextAreaElement.prototype.select=function(){throw new Error('fixture select failure')}});await shareAction(page,'select').click();await shareBox(page).getByRole('status').filter({hasText:shared('selectionFailed')}).waitFor();await page.evaluate(()=>HTMLTextAreaElement.prototype.select=window.__nativeTextareaSelect);await shareAction(page,'select').click();assert.deepEqual(await shareBox(page).locator('textarea').evaluate(node=>[node.selectionStart,node.selectionEnd,node===document.activeElement]),[0,link.length,true])
  await page.evaluate(()=>window.__setClipboardMode('native'));await shareAction(page,'retry').click();await poll(async()=>!await shareBox(page).locator('[data-share-recovery]').count(),'native retry');assert.equal(await page.evaluate(()=>window.__nativeClipboardRead()),link);await page.evaluate(()=>window.__oldSharedFlash=window.__orderTimers.findLast(item=>item.delay===2000).callback)
  await page.evaluate(()=>window.__setClipboardMode('hold'));await shareAction(page,'copy').click();await setShareScore(page,88);await page.evaluate(()=>window.__setClipboardMode('native'));await shareAction(page,'copy').click();const current=page.url();await poll(()=>page.evaluate(()=>window.__nativeClipboardRead()).then(value=>value===current),'new current link');const fallback=await page.evaluate(()=>window.__legacyCalls.length);await page.evaluate(()=>{window.__clipboardPending.shift().reject(new Error('old shared rejection'));window.__oldSharedFlash()});await wait(80);assert.equal(await page.evaluate(()=>window.__legacyCalls.length),fallback);assert.equal(await shareAction(page,'copy').innerText(),shared('copied'));assert.equal(await page.evaluate(()=>window.__nativeClipboardRead()),current)
  await page.evaluate(()=>{window.__setClipboardMode('absent');window.__legacyMode='throw'});await shareAction(page,'copy').click();await shareBox(page).locator('[data-share-recovery]').waitFor();await shareAction(page,'close').click();assert.equal(await shareBox(page).locator('[data-share-recovery]').count(),0)
  return{manualFullSelection:true,selectionThrowCaught:true,nativeRetry:true,staleRejectFallback:0,oldSuccessTimerDoesNotClearNew:true,absentApiLegacyThrowRecovery:true,copyFailed:shared('copyFailed')}
})

test('share-320-dark-ko-en-recovery-and-snapshot',async({page,context,open})=>{
  await shareBoot(context,open,page);await page.evaluate(()=>window.__setClipboardMode('reject'));await shareAction(page,'copy').click();await shareBox(page).locator('[data-share-recovery]').waitFor();assert.equal(await shareBox(page).getByRole('alert').innerText(),shared('copyFailed'));const ko=await mobile(page,[shareBox(page).locator('textarea')],[shareAction(page,'share'),shareAction(page,'select'),shareAction(page,'retry')]);await screenshot(page,'share-320-ko',shareBox(page))
  await page.evaluate(()=>window.__setClipboardMode('hold'));await shareAction(page,'retry').click();await changeLanguage(page,'en');await poll(async()=>await shareAction(page,'copy').innerText()===shared('copyLink','en'),'English current share scope');const calls=await page.evaluate(()=>window.__legacyCalls.length);await page.evaluate(()=>window.__clipboardPending.shift().reject(new Error('old language')));assert.equal(await page.evaluate(()=>window.__legacyCalls.length),calls);assert.equal(await shareBox(page).locator('[data-share-recovery]').count(),0)
  await page.evaluate(()=>window.__setClipboardMode('reject'));await shareAction(page,'copy').click();await shareBox(page).locator('[data-share-recovery]').waitFor();assert.equal(await shareBox(page).getByRole('alert').innerText(),shared('copyFailed','en'));assert.doesNotMatch(shared('copyFailed','en'),/address bar/i);const en=await mobile(page,[shareBox(page).locator('textarea')],[shareAction(page,'share'),shareAction(page,'select'),shareAction(page,'retry')]);await screenshot(page,'share-320-en',shareBox(page));await shareAction(page,'close').click();const file=await download(page,()=>shareAction(page,'save').click(),'current-result-english.png');const png=PNG.sync.read(file.bytes);assert.equal(png.width,1080);assert.equal(png.height,1350);const text=await page.evaluate(()=>window.__shareRenders.at(-1).texts.map(row=>row.text).join('\n'));assert.ok(text.includes(shared('cta','en')))
  return{ko,en,fontMinimumPx:16,touchMinimumPx:44,localeOldFallback:0,currentEnglishPng:true,pngBytes:file.bytes.length,actualOsShareCalls:0,copyFailed:{ko:shared('copyFailed'),en:shared('copyFailed','en')}}
},{width:320,dark:true})


const planned = [
  "share-current-native-clipboard-and-real-png",
  "share-native-render-late-input-url-and-unmount",
  "share-file-text-abort-and-render-error-ports",
  "share-copy-false-manual-retry-and-late-requests",
  "share-320-dark-ko-en-recovery-and-snapshot"
]
const productCasesReady = true
if (only === '--list') console.log(planned.join('\n'))
else {
  assert.ok(productCasesReady, 'Final ready and native cases pending; Chrome was not started')
  const selected = cases.filter(item => !only || only.split(',').some(part => item.name.includes(part))); assert.ok(selected.length, 'No selected cases')
  mkdirSync(out, { recursive: true }); const browser = await chromium.launch({ channel: 'chrome' })
  try { for (const scenario of selected) await run(browser, scenario) }
  finally { await browser.close(); const merged = readdirSync(out).filter(name => name.endsWith('-evidence.json')).map(name => JSON.parse(readFileSync(resolve(out, name), 'utf8'))); const final = { checkedAt: new Date().toISOString(), passed: merged.filter(item => item.status === 'pass').length, failed: merged.filter(item => item.status === 'fail').length, browserClosed: true, results: merged }; writeFileSync(resolve(out, 'final-results.json'), JSON.stringify(final, null, 2)); console.log(JSON.stringify({ passed: final.passed, failed: final.failed, browserClosed: true })) }
  if (results.some(item => item.status !== 'pass')) process.exitCode = 1
}
