import { chromium } from 'playwright'
import assert from 'node:assert/strict'
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { qrPrintRows, inputForRows, installQrPrintPorts, inspectNativePdf } from '../docs/verify/2026-11-17-repeat-batch55/browser-fixtures.mjs'
import JSZip from 'jszip'




// Independent real-browser checks. --list never starts Chrome; case-name filters
// preserve previous evidence so only changed boundaries need to be rerun.
const base = process.env.VERIFY_BASE_URL || 'http://127.0.0.1:3039'
const out = resolve('docs/verify/2026-11-17-repeat-batch55/browser')
const only = process.argv[2]
const messages = Object.fromEntries(['ko', 'en'].map(language => [language, JSON.parse(readFileSync(`messages/${language}.json`, 'utf8'))]))
const tr = (ns, key, language = 'ko', values = {}) => {
  const value = key.split('.').reduce((object, key) => object?.[key], messages[language][ns])
  assert.equal(typeof value, 'string', `Missing ${language}:${ns}.${key}`)
  return value.replace(/\{(\w+)\}/g, (match, key) => values[key] ?? match)
}
const wait = ms => new Promise(resolve => setTimeout(resolve, ms))
async function poll(predicate, description, attempts = 180) { for (let n = 0; n < attempts; n++) { if (await predicate()) return; await wait(100) }; assert.fail(`Timed out: ${description}`) }
const cases = [], results = []
const test = (name, fn, options = {}) => cases.push({ name, fn, options })

async function run(browser, { name, fn, options }) {
  if (only && !only.split(',').some(part => name.includes(part))) return
  const context = await browser.newContext({ viewport: { width: options.width ?? 1280, height: 900 }, timezoneId: 'Asia/Seoul', serviceWorkers: 'block', hasTouch: !!options.touch, reducedMotion: options.reducedMotion ?? 'no-preference', permissions: ['clipboard-read', 'clipboard-write'], acceptDownloads: true })
  const errors = [], hydration = [], external = [], consoleErrors = [], network = [], logs = []
  await context.addInitScript(options => {
    if (!/^https?:$/.test(location.protocol)) return
    if (!localStorage.getItem('__batch55Seeded')) { localStorage.setItem('language', options.language ?? 'ko'); localStorage.setItem('theme', options.dark ? 'dark' : 'light'); localStorage.setItem('__batch55Seeded', '1') }
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
    const response=await target.goto(`${base}/${slug}/${query}`, { waitUntil: 'domcontentloaded' });assert.ok(!response||response.status()<500,`Local page compilation/server failure ${response?.status()}`);await target.locator('main h1').first().waitFor()
    await target.waitForFunction(() => [...document.querySelectorAll('[data-language-toggle] button')].some(element => Object.keys(element).some(key => key.startsWith('__reactProps$')))); await wait(200)
  }
  let status = 'pass', detail = {}, error
  const watchdog = setTimeout(() => { void context.close().catch(() => {}) }, 120000)
  try { detail = await fn({ page, context, open, network, logs }) ?? {}; assert.deepEqual(errors, [], 'JS page errors'); assert.deepEqual(hydration, [], 'Hydration errors'); assert.deepEqual(consoleErrors.filter(value=>/ErrorBoundary|NotFoundError|The above error occurred/i.test(value)),[],'React caught runtime errors'); for (const active of context.pages()) assert.deepEqual(await active.evaluate(() => window.__unhandled), [], 'Unhandled rejections'); assert.ok(!/\b(?:qrGenerator|shareResult)\.[a-zA-Z][\w.]+/.test(await page.locator('body').innerText()), 'Raw translation key') }
  catch (cause) { status = 'fail'; error = redact(cause.stack ?? String(cause)); await page.screenshot({ path: resolve(out, `${name}-failure.png`), caret: 'initial', mask: options.sensitive ? [page.locator('#dp-account'), page.locator('pre'), page.locator('[data-dutch-copy-recovery]')] : [] }).catch(() => {}); writeFileSync(resolve(out, `${name}-failure.txt`), `${error}\n\n${options.sensitive ? 'Sensitive page body intentionally omitted.' : await page.locator('body').innerText().catch(() => '')}`) }
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
  if(box.body>box.viewport+1||box.document>box.viewport+1)box.overflow=await page.evaluate(()=>[...document.querySelectorAll('main *')].map(el=>{const r=el.getBoundingClientRect();return {tag:el.tagName,class:el.className,text:el.textContent?.slice(0,100),left:r.left,right:r.right,width:r.width}}).filter(item=>item.right>innerWidth+1||item.left< -1).slice(0,20))
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

const batch=page=>page.locator('#qr-batch')
const action=(page,key,lang='ko')=>batch(page).getByRole('button',{name:tr('qrGenerator',`batch.${key}`,lang),exact:true})
const print=page=>page.locator('[data-qr-batch-print]')
async function setup(args){await installQrPrintPorts(args.context);await args.open('qr-generator');await batch(args.page).waitFor()}
async function generate(page,rows,lang='ko'){await batch(page).locator('textarea').fill(inputForRows(rows));await action(page,'generate',lang).click();await poll(async()=>!(await print(page).isDisabled()),'all QR images generated');assert.equal(await batch(page).locator('li img').count(),rows.length)}
async function capturePrint(page){const count=await page.evaluate(()=>window.__qrPrints.length),before=await page.evaluate(()=>window.__qrToDataUrls);await print(page).click();await poll(()=>page.evaluate(count=>window.__qrPrints.length===count+1,count),'actual iframe print readiness');assert.equal(await page.evaluate(()=>window.__qrToDataUrls),before);return page.evaluate(()=>window.__qrPrints.at(-1))}
async function cleanup(page){await page.evaluate(()=>window.__qrAfterPrint());await poll(async()=>await page.locator('[data-qr-batch-print-frame]').count()===0,'afterprint owned frame cleanup')}
function validateRecord(record,rows){assert.equal(record.images,rows.length);assert.equal(record.pages,Math.ceil(rows.length/6));assert.deepEqual(record.cells.map(cell=>cell.line),rows.map((_,i)=>i+1));assert.equal(record.injected,false);for(const [index,cell]of record.cells.entries()){assert.deepEqual(cell.natural,[512,512]);assert.ok(Math.abs(cell.rect.width-65*96/25.4)<0.1);assert.ok(Math.abs(cell.rect.height-65*96/25.4)<0.1);const label=Array.from(rows[index].label);assert.equal(cell.name,label.slice(0,48).join('')+(label.length>48?'…':''));assert.ok(!record.text.includes(rows[index].payload),`payload line ${index+1} leaked to print text`)}assert.ok(!record.html.includes('data-language-toggle'));assert.ok(!record.html.includes('https://cdn.'));assert.ok(!record.html.includes('<script'))}

for(const count of [1,7,30])test(`qr-print-native-pdf-${count}`,async args=>{
 const {page}=args;await setup(args);const rows=qrPrintRows(count);await generate(page,rows);const record=await capturePrint(page);validateRecord(record,rows);writeFileSync(resolve(out,`qr-print-${count}-document.html`),record.html);const pdf=await inspectNativePdf(page,record,rows,out,`qr-print-${count}`,count===30?[1,5]:Array.from({length:Math.ceil(count/6)},(_,i)=>i+1));await cleanup(page);return {inputRows:count,actualIframeImages:record.images,pages:record.pages,qrMillimeters:65,labelLimitCodepoints:48,noPlainPayload:true,noSiteChrome:true,noAdditionalQrGeneration:true,pdf}
})

test('qr-print-decode-failure-timeout-and-retry',async args=>{
 const {page}=args;await setup(args);await generate(page,qrPrintRows(7));const sources=await batch(page).locator('li img').evaluateAll(nodes=>nodes.map(node=>node.src));await page.evaluate(()=>window.__qrDecodeMode='reject');await print(page).click();await batch(page).getByRole('alert').filter({hasText:tr('qrGenerator','batch.notices.printFailed')}).waitFor();assert.equal(await page.evaluate(()=>window.__qrPrints.length),0);assert.equal(await page.locator('[data-qr-batch-print-frame]').count(),0);await page.evaluate(()=>{window.__qrDecodeMode='hang';window.__qrFastTimeout=true});await print(page).click();await poll(async()=>!(await print(page).isDisabled()),'bounded decode timeout');assert.equal(await page.evaluate(()=>window.__qrPrints.length),0);assert.equal(await page.locator('[data-qr-batch-print-frame]').count(),0);await page.evaluate(()=>{window.__qrReleaseDecodes();window.__qrDecodeMode='native';window.__qrFastTimeout=false});const record=await capturePrint(page);assert.equal(record.images,7);assert.deepEqual(await batch(page).locator('li img').evaluateAll(nodes=>nodes.map(node=>node.src)),sources);await cleanup(page);return {nativeDecodeThenControlledFailure:true,timeoutMsControlled:50,failedPrintCalls:0,ownedFramesRemoved:true,sameImagesRetry:true}
})

test('qr-print-late-edit-cancel-locale-unmount',async args=>{
 const {page}=args;await setup(args);const rows=qrPrintRows(7);await generate(page,rows);await page.evaluate(()=>window.__qrDecodeMode='hold');await print(page).click();await poll(()=>page.evaluate(()=>window.__qrHeldDecodes.length===7),'seven actual decodes held');await action(page,'cancel').click();assert.equal(await batch(page).locator('li img').count(),7);await page.evaluate(()=>window.__qrReleaseDecodes());assert.equal(await page.evaluate(()=>window.__qrPrints.length),0);await page.evaluate(()=>window.__qrDecodeMode='native');await capturePrint(page);await cleanup(page);await page.evaluate(()=>window.__qrDecodeMode='hold');await print(page).click();await poll(()=>page.evaluate(()=>window.__qrHeldDecodes.length===7),'second decode held');await batch(page).locator('textarea').fill(inputForRows(rows)+'\nnew');await page.evaluate(()=>window.__qrReleaseDecodes());assert.equal(await page.evaluate(()=>window.__qrPrints.length),1);assert.equal(await print(page).isDisabled(),true);await generate(page,rows);await print(page).click();await poll(()=>page.evaluate(()=>window.__qrHeldDecodes.length===7),'language decode held');await changeLanguage(page,'en');await poll(async()=>await print(page).innerText()===tr('qrGenerator','batch.print.button','en'),'English loaded');await page.evaluate(()=>window.__qrReleaseDecodes());assert.equal(await page.evaluate(()=>window.__qrPrints.length),1);await poll(async()=>!(await print(page).isDisabled()),'locale cancel settled');await print(page).click();await poll(()=>page.evaluate(()=>window.__qrHeldDecodes.length===7),'unmount decode held');await page.locator('header a[href="/"]').first().click();await batch(page).waitFor({state:'detached'});await page.evaluate(()=>window.__qrReleaseDecodes());assert.equal(await page.evaluate(()=>window.__qrPrints.length),1);assert.equal(await page.locator('[data-qr-batch-print-frame]').count(),0);return {cancelPreservesSevenImages:true,explicitRetryPrints:true,lateAfterEditLocaleUnmount:0,ownedFrameLeaks:0}
})

test('qr-print-zip-bytes-partial-and-single-regression',async args=>{
 const {page}=args;await setup(args);await generate(page,qrPrintRows(7));const record=await capturePrint(page);await cleanup(page);const file=await download(page,()=>action(page,'download').click(),'qr-batch-unchanged.zip'),zip=await JSZip.loadAsync(file.bytes,{checkCRC32:true}),names=Object.keys(zip.files).filter(name=>!zip.files[name].dir);assert.equal(names.length,7);assert.equal(new Set(names).size,7);for(let i=0;i<7;i++)assert.deepEqual(await zip.files[names[i]].async('nodebuffer'),Buffer.from(record.cells[i].src.split(',')[1],'base64'));await batch(page).locator('textarea').fill('one\n\ntwo');assert.equal(await print(page).isDisabled(),true);await batch(page).locator('textarea').fill(inputForRows(qrPrintRows(7)));await page.evaluate(()=>window.__qrFailDataUrlAt=window.__qrToDataUrls+3);await action(page,'generate').click();await batch(page).getByRole('alert').first().waitFor();assert.equal(await print(page).isDisabled(),true);assert.equal(await batch(page).locator('li img').count(),0);await page.evaluate(()=>window.__qrFailDataUrlAt=null);const section=page.locator('section[aria-labelledby="qr-print-title"]');await section.getByRole('button').last().click();await poll(()=>page.evaluate(()=>window.__singlePrints.length===1),'existing single-code print');const single=await page.evaluate(()=>window.__singlePrints[0]);assert.ok(single.images.length>1);assert.equal(new Set(single.images).size,1);assert.ok(!single.html.includes('data-qr-batch-print-document'));return {zipBytes:file.bytes.length,pngEntries:7,crcVerified:true,printImageAndZipBytesEqual:true,invalidAndPartialPrintDisabled:true,partialResultsExposed:0,existingSingleRepeatedQrImages:single.images.length}
})

test('qr-print-320-dark-ko-en',async args=>{
 const {page}=args;await setup(args);await generate(page,qrPrintRows(7));const geometry={};for(const lang of ['ko','en']){if(lang==='en'){await changeLanguage(page,lang);await poll(async()=>await print(page).innerText()===tr('qrGenerator','batch.print.button',lang),'English batch ready')}geometry[lang]=await mobile(page,[batch(page).locator('textarea')],[print(page),action(page,'generate',lang),action(page,'download',lang)]);await print(page).focus();await page.keyboard.press('Enter');await poll(()=>page.evaluate(()=>window.__qrPrintFrames.some(item=>item.printed>0&&item.node.isConnected)),'keyboard print');const record=await page.evaluate(()=>window.__qrPrints.at(-1));assert.equal(record.lang,lang);assert.equal(record.pages,2);await cleanup(page);await page.locator('[data-qr-batch-print-summary]').evaluate(el=>el.scrollIntoView({block:'center',behavior:'instant'}));await page.screenshot({path:resolve(out,`qr-print-320-${lang}-viewport.png`),caret:'initial'})}return {geometry,keyboardPrint:true,fields16Controls44:true,localeDocumentLabels:true}
},{width:320,dark:true,touch:true})

const planned=cases.map(item=>item.name)
if(only==='--list')console.log(planned.join('\n'))
else {const selected=cases.filter(item=>!only||only.split(',').some(part=>item.name.includes(part)));assert.ok(selected.length);mkdirSync(out,{recursive:true});const browser=await chromium.launch({channel:'chrome'});try{for(const scenario of selected)await run(browser,scenario)}finally{await browser.close();const merged=readdirSync(out).filter(name=>name.endsWith('-evidence.json')).map(name=>JSON.parse(readFileSync(resolve(out,name),'utf8')));const final={checkedAt:new Date().toISOString(),passed:merged.filter(item=>item.status==='pass').length,failed:merged.filter(item=>item.status==='fail').length,browserClosed:true,results:merged};writeFileSync(resolve(out,'final-results.json'),JSON.stringify(final,null,2));console.log(JSON.stringify({passed:final.passed,failed:final.failed,browserClosed:true}))}if(results.some(item=>item.status!=='pass'))process.exitCode=1}
export {observeDecisionPorts,screenshot}








