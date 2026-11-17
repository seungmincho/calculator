import { chromium } from 'playwright'
import assert from 'node:assert/strict'
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { PNG } from 'pngjs'
import { colorExamples, invalidColorExamples, installColorPorts } from '../docs/verify/2026-11-17-repeat-batch53/browser-fixtures.mjs'
import { observeAspectNativeIo } from '../docs/verify/2026-11-17-repeat-batch37/browser-fixtures.mjs'




// Independent real-browser checks. --list never starts Chrome; case-name filters
// preserve previous evidence so only changed boundaries need to be rerun.
const base = process.env.VERIFY_BASE_URL || 'http://127.0.0.1:3039'
const out = resolve('docs/verify/2026-11-17-repeat-batch53/browser')
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
    if (!localStorage.getItem('__batch53Seeded')) { localStorage.setItem('language', options.language ?? 'ko'); localStorage.setItem('theme', options.dark ? 'dark' : 'light'); localStorage.setItem('__batch53Seeded', '1') }
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
  try { detail = await fn({ page, context, open, network, logs }) ?? {}; assert.deepEqual(errors, [], 'JS page errors'); assert.deepEqual(hydration, [], 'Hydration errors'); assert.deepEqual(consoleErrors.filter(value=>/ErrorBoundary|NotFoundError|The above error occurred/i.test(value)),[],'React caught runtime errors'); for (const active of context.pages()) assert.deepEqual(await active.evaluate(() => window.__unhandled), [], 'Unhandled rejections'); assert.ok(!/\b(?:colorConverter|shareResult)\.[a-zA-Z][\w.]+/.test(await page.locator('body').innerText()), 'Raw translation key') }
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






const cc=(page,key,value)=>page.locator(`[data-color-${key}${value===undefined?'':`="${value}"`}]`)
const share=(page,action)=>cc(page,'share-boundary').locator(`[data-share-action="${action}"]`)
const last=page=>cc(page,'workspace').getAttribute('data-color-last-valid')
const draft=page=>page.locator('#color-hex')
async function setup(args,query='',hold=false){await observeDecisionPorts(args.context);await installColorPorts(args.context,hold);await observeAspectNativeIo(args.context);await args.open('color-converter',query);if(!hold)await poll(async()=>!(await cc(args.page,'copy','hex').isDisabled()),'color ready')}
async function settle(page){await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))))}
async function nativePaste(page,locator,text){await page.evaluate(text=>navigator.clipboard.writeText(text),text);await locator.focus();await page.keyboard.press('Control+A');await page.keyboard.press('Control+V');await poll(async()=>await locator.inputValue()===text,'native pasted exact text')}
async function setRange(page,key,value){await cc(page,'channel',key).evaluate((el,value)=>{Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(el,value);el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}))},String(value));await settle(page)}
async function pop(page,url){await page.evaluate(url=>{history.pushState({...history.state,fixture:'preserved'},'',url);dispatchEvent(new PopStateEvent('popstate',{state:history.state}))},url);await settle(page)}
function formats(item){return {hex:item.canonical,rgb:`rgb(${item.rgb.join(', ')})`,hsl:`hsl(${item.hsl[0]}, ${item.hsl[1]}%, ${item.hsl[2]}%)`,hsv:`hsv(${item.hsv[0]}, ${item.hsv[1]}%, ${item.hsv[2]}%)`,cmyk:`cmyk(${item.cmyk.map(n=>n+'%').join(', ')})`}}

test('color-valid-shorthand-invalid-last-good',async args=>{
 const {page}=args;await setup(args);for(const item of colorExamples){await draft(page).fill(item.raw);assert.equal(await last(page),item.canonical);assert.equal(await draft(page).inputValue(),item.raw);for(const [kind,text]of Object.entries(formats(item)))assert.equal(await cc(page,'value',kind).locator('dd').innerText(),text);assert.equal(await cc(page,'preview').evaluate(el=>getComputedStyle(el).backgroundColor),`rgb(${item.rgb.join(', ')})`)}const final=await last(page);for(const input of invalidColorExamples){if(input==='#12345678')await nativePaste(page,draft(page),input);else await draft(page).fill(input);assert.equal(await draft(page).inputValue(),input);assert.equal(await last(page),final);assert.equal(await draft(page).getAttribute('aria-invalid'),'true');assert.equal(await cc(page,'picker').inputValue(),final.toLowerCase())}await cc(page,'restore').click();assert.equal(await draft(page).inputValue(),final);assert.equal(await draft(page).getAttribute('aria-invalid'),'false');return {handCalculatedOpaqueColors:6,fiveFormatsEach:true,invalidDrafts:invalidColorExamples.length,nativeEightHexPasteNotTruncated:true,explicitRestore:true}
})

test('color-canonical-picker-presets-sliders-random',async args=>{
 const {page}=args;await setup(args);await cc(page,'picker').fill('#123456');assert.equal(await last(page),'#123456');await cc(page,'preset','#EF4444').click();assert.equal(await draft(page).inputValue(),'#EF4444');await draft(page).fill('#000000');await setRange(page,'r',255);assert.equal(await last(page),'#FF0000');await setRange(page,'g',255);assert.equal(await last(page),'#FFFF00');await setRange(page,'b',255);assert.equal(await last(page),'#FFFFFF');await draft(page).fill('#FF0000');await setRange(page,'h',120);assert.equal(await last(page),'#00FF00');await setRange(page,'s',0);assert.equal(await last(page),'#808080');await setRange(page,'l',100);assert.equal(await last(page),'#FFFFFF');for(const [random,expected]of [[0,'#000000'],[1-Number.EPSILON,'#FFFFFF']]){await page.evaluate(value=>window.__colorRandom=value,random);await cc(page,'random').click();assert.equal(await last(page),expected)}await page.evaluate(()=>window.__colorRandom=null);return {pickerValueNativeControl:true,sixSliderInputs:true,twentyPresets:await cc(page,'preset').count(),randomEndpoints:['#000000','#FFFFFF']}
})

test('color-url-real-visit-and-popstate',async args=>{
 const {page,context}=args;await setup(args,'?foreign=a&color=abc&foreign=b#keep');assert.equal(await last(page),'#AABBCC');assert.deepEqual(new URL(page.url()).searchParams.getAll('foreign'),['a','b']);await page.evaluate(()=>history.replaceState({...history.state,verification:'keep'},'',location.href));await draft(page).fill(' #f00 ');assert.equal(new URL(page.url()).searchParams.get('color'),'FF0000');assert.equal(await page.evaluate(()=>history.state.verification),'keep');const next=await context.newPage();await args.open('color-converter',new URL(page.url()).search+new URL(page.url()).hash,next);await poll(async()=>!(await cc(next,'copy','hex').isDisabled()),'new visit');assert.equal(await last(next),'#FF0000');await next.close();await draft(page).fill('private invalid draft');await pop(page,'?foreign=a&color=FF0000&foreign=b#second');assert.equal(await draft(page).inputValue(),'private invalid draft');await pop(page,'?foreign=changed&color=FF0000#second');assert.equal(await draft(page).inputValue(),'private invalid draft');await pop(page,'?color=00FF00#second');assert.equal(await last(page),'#00FF00');await pop(page,'?color=badcolor');assert.equal(await draft(page).inputValue(),'#00FF00');assert.equal(await cc(page,'query-error','invalid').count(),1);await pop(page,'?foreign=only');assert.equal(await last(page),'#3B82F6');await args.open('color-converter','?color=fff&color=000#invalid');await poll(async()=>!(await cc(page,'copy','hex').isDisabled()),'duplicate ready');assert.equal(await last(page),'#3B82F6');assert.deepEqual(new URL(page.url()).searchParams.getAll('color'),['fff','000']);await page.goBack();await poll(async()=>!(await cc(page,'copy','hex').isDisabled()),'back ready');return {validUrlAndRealNewVisit:true,unknownRepeatedQueryHashStatePreserved:true,hashAndUnrelatedQueryKeepInvalidDraft:true,ownedPopRestores:true,invalidPopKeepsCurrent:true,absentPopDefaults:true,duplicateQueryNotOverwritten:true,nativeBackNavigation:true}
})

test('color-early-edit-and-history-failure',async args=>{
 const {page,context}=args;await setup(args,'?color=FF0000',true);await poll(()=>page.evaluate(()=>window.__colorRestore.some(item=>!item.canceled)),'initial named callback held');assert.equal(await cc(page,'copy','hex').isDisabled(),true);await draft(page).fill('invalid early');await page.evaluate(()=>window.__releaseColorRestore());await poll(async()=>!(await cc(page,'copy','hex').isDisabled()),'released invalid early');assert.equal(await draft(page).inputValue(),'invalid early');assert.equal(await last(page),'#3B82F6');const next=await context.newPage();await args.open('color-converter','?color=FF0000',next);await poll(()=>next.evaluate(()=>window.__colorRestore.some(item=>!item.canceled)),'second initial held');await draft(next).fill('0f0');await next.evaluate(()=>window.__releaseColorRestore());await poll(async()=>!(await cc(next,'copy','hex').isDisabled()),'released valid early');assert.equal(await last(next),'#00FF00');await next.close();const previous=page.url();await page.evaluate(()=>window.__colorHistoryMode='throw');await draft(page).fill('#123456');assert.equal(await last(page),'#123456');assert.equal(page.url(),previous);await cc(page,'query-error','writeFailed').waitFor();await share(page,'copy').click();const link=await page.evaluate(()=>window.__clipboardCalls.at(-1));assert.equal(new URL(link).searchParams.get('color'),'123456');assert.equal(await page.evaluate(()=>window.__nativeClipboardRead()),link);return {namedInitialCallbackControlled:true,invalidAndValidEarlyIntentWins:true,preReadyCopyDisabled:true,historyDenialKeepsColor:true,explicitNativeShareUsesCurrentCanonical:true}
})

test('color-five-native-copy-and-manual',async args=>{
 const {page}=args;await setup(args);await draft(page).fill('#ff0000');for(const [kind,text]of Object.entries(formats(colorExamples[3]))){await cc(page,'copy',kind).click();await cc(page,'output','copied').waitFor();assert.equal(await page.evaluate(()=>window.__clipboardCalls.at(-1)),text);assert.equal(await page.evaluate(()=>window.__nativeClipboardRead()),text)}await page.evaluate(()=>window.__setClipboardMode('absent'));await cc(page,'copy','cmyk').click();await cc(page,'output','failed').waitFor();const text=await page.locator('#color-copy-manual').inputValue();assert.equal(text,formats(colorExamples[3]).cmyk);await cc(page,'recovery-action','select').click();assert.deepEqual(await page.locator('#color-copy-manual').evaluate(el=>[el.selectionStart,el.selectionEnd]),[0,text.length]);await page.evaluate(()=>{window.__setClipboardMode('reject');window.__legacyMode='throw'});await cc(page,'recovery-action','retry').click();await cc(page,'output','failed').waitFor();assert.equal(await page.locator('#color-copy-manual').inputValue(),text);await page.evaluate(()=>window.__legacyMode='true');await cc(page,'recovery-action','retry').click();await cc(page,'output','copied').waitFor();assert.equal(await cc(page,'recovery').count(),0);return {nativeFormats:5,missingApiFalseLegacyManual:true,rejectThrowKeepsWholeText:true,wholeSelection:true,controlledLegacyTrue:true}
})

test('color-share-cross-owner-and-aba',async args=>{
 const {page}=args;await setup(args);await page.evaluate(()=>window.__setClipboardMode('hold'));await cc(page,'copy','hex').click();await page.evaluate(()=>window.__setClipboardMode('native'));await share(page,'copy').click();let before=await page.evaluate(()=>window.__legacyCalls.length);await page.evaluate(()=>window.__clipboardPending.shift().reject(new Error('old own')));await settle(page);assert.equal(await page.evaluate(()=>window.__legacyCalls.length),before);await page.evaluate(()=>window.__setClipboardMode('hold'));await share(page,'copy').click();await page.evaluate(()=>window.__setClipboardMode('native'));await cc(page,'copy','rgb').click();await cc(page,'output','copied').waitFor();await page.evaluate(()=>window.__clipboardPending.shift().reject(new Error('old share')));await settle(page);assert.equal(await page.evaluate(()=>window.__legacyCalls.length),before);await page.evaluate(()=>window.__aspectEncodeMode='hold');await share(page,'save').click();await poll(()=>page.evaluate(()=>window.__aspectHeld.some(item=>item.type==='encode')),'native PNG callback held');let downloads=0;page.on('download',()=>downloads++);await cc(page,'copy','hsl').click();await page.evaluate(()=>window.__releaseAspect('encode'));await settle(page);assert.equal(downloads,0);await draft(page).fill('#000');await draft(page).fill('#3B82F6');assert.equal(await cc(page,'output').count(),0);await page.evaluate(()=>window.__setClipboardMode('hold'));await cc(page,'copy','hex').click();await changeLanguage(page,'en');await poll(async()=>await cc(page,'copy','hex').innerText()===tr('colorConverter','copy.action','en'),'English loaded');await changeLanguage(page,'ko');await poll(async()=>await cc(page,'copy','hex').innerText()===tr('colorConverter','copy.action'),'Korean loaded');await page.evaluate(()=>window.__clipboardPending.shift().reject(new Error('old locale')));await settle(page);assert.equal(await cc(page,'recovery').count(),0);assert.equal(await page.evaluate(()=>window.__legacyCalls.length),before);await cc(page,'copy','hex').click();await page.locator('header a[href="/"]').first().click();await cc(page,'workspace').waitFor({state:'detached'});await page.evaluate(()=>window.__clipboardPending.shift().reject(new Error('old unmounted')));await settle(page);assert.equal(await page.evaluate(()=>window.__legacyCalls.length),before);return {ownShareBothDirectionsLateFallback:0,realNativePngDeliveredLateDownloads:0,inputLocaleAbaOldNotice:0,unmountLateFallback:0}
})

test('color-actual-png-current-canonical',async args=>{
 const {page}=args;await setup(args);await draft(page).fill('#ff0000');await draft(page).fill('private-invalid-alpha-#12345678');await page.evaluate(()=>window.__colorDrawText=[]);const file=await download(page,()=>share(page,'save').click(),'color-current-native.png'),png=PNG.sync.read(file.bytes);assert.deepEqual([png.width,png.height],[1080,1350]);const drawn=await page.evaluate(()=>window.__colorDrawText);assert.ok(drawn.includes('#FF0000'));assert.ok(drawn.includes('rgb(255, 0, 0)'));assert.ok(!drawn.some(text=>text.includes('private-invalid')));assert.equal(new URL(page.url()).searchParams.get('color'),'FF0000');const memory=await page.evaluate(()=>JSON.stringify([{...localStorage},{...sessionStorage}]));assert.ok(!memory.includes('private-invalid'));await share(page,'copy').click();assert.equal(new URL(await page.evaluate(()=>window.__clipboardCalls.at(-1))).searchParams.get('color'),'FF0000');return {png:{width:png.width,height:png.height,bytes:file.bytes.length},actualCanvasText:drawn,lastValidCanonicalUsed:true,privateDraftAbsentFromPngUrlStorage:true}
})

test('color-320-dark-ko-en',async args=>{
 const {page}=args;await setup(args);const geometry={};for(const lang of ['ko','en']){if(lang==='en'){await changeLanguage(page,lang);await poll(async()=>await cc(page,'copy','hex').innerText()===tr('colorConverter','copy.action',lang),'English loaded')}await draft(page).fill('#12345678');await page.evaluate(()=>window.__setClipboardMode('absent'));await cc(page,'copy','rgb').click();await page.locator('#color-copy-manual').waitFor();await cc(page,'recovery-action','select').focus();await page.keyboard.press('Enter');const text=await page.locator('#color-copy-manual').inputValue();assert.deepEqual(await page.locator('#color-copy-manual').evaluate(el=>[el.selectionStart,el.selectionEnd]),[0,text.length]);geometry[lang]=await mobile(page,[draft(page),page.locator('#color-copy-manual')],[cc(page,'restore'),cc(page,'random'),cc(page,'preset').first(),cc(page,'copy','rgb'),cc(page,'recovery-action','select')]);const positions=await cc(page,'preset').evaluateAll(nodes=>nodes.slice(0,6).map(node=>({x:node.getBoundingClientRect().x,y:node.getBoundingClientRect().y,width:node.getBoundingClientRect().width})));assert.equal(new Set(positions.slice(0,5).map(item=>item.y)).size,1);assert.ok(positions[5].y>positions[0].y);assert.ok(positions.every(item=>item.width>=44));await screenshot(page,`color-converter-320-${lang}`,page.locator('#color-converter-result'));await cc(page,'recovery-action','close').click();const jump=page.locator('a[href="#color-converter-result"]').first();await jump.click();assert.equal(new URL(page.url()).hash,'#color-converter-result')}return {geometry,mobilePresetFiveColumns:true,fields16Controls44:true,wholeKeyboardSelection:true,resultJump:true}
},{width:320,dark:true,touch:true})

const planned=cases.map(item=>item.name)
if(only==='--list')console.log(planned.join('\n'))
else {const selected=cases.filter(item=>!only||only.split(',').some(part=>item.name.includes(part)));assert.ok(selected.length);mkdirSync(out,{recursive:true});const browser=await chromium.launch({channel:'chrome'});try{for(const scenario of selected)await run(browser,scenario)}finally{await browser.close();const merged=readdirSync(out).filter(name=>name.endsWith('-evidence.json')).map(name=>JSON.parse(readFileSync(resolve(out,name),'utf8')));const final={checkedAt:new Date().toISOString(),passed:merged.filter(item=>item.status==='pass').length,failed:merged.filter(item=>item.status==='fail').length,browserClosed:true,results:merged};writeFileSync(resolve(out,'final-results.json'),JSON.stringify(final,null,2));console.log(JSON.stringify({passed:final.passed,failed:final.failed,browserClosed:true}))}if(results.some(item=>item.status!=='pass'))process.exitCode=1}
