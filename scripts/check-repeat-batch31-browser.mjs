import { PNG } from 'pngjs'
import { chromium } from 'playwright'
import assert from 'node:assert/strict'
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'




// Independent real-browser checks. --list never starts Chrome; case-name filters
// preserve previous evidence so only changed boundaries need to be rerun.
const base = process.env.VERIFY_BASE_URL || 'http://127.0.0.1:3039'
const out = resolve('docs/verify/2026-11-17-repeat-batch31/browser')
const only = process.argv[2]
const messages = Object.fromEntries(['ko', 'en'].map(language => [language, JSON.parse(readFileSync(`messages/${language}.json`, 'utf8'))]))
const tr = (ns, key, language = 'ko', values = {}) => {
  const value = key.split('.').reduce((object, key) => object?.[key], messages[language][ns])
  assert.equal(typeof value, 'string', `Missing ${language}:${ns}.${key}`)
  return value.replace(/\{(\w+)\}/g, (match, key) => values[key] ?? match)
}
const decision = (key, language = 'ko', values = {}) => tr('decisionTools', key, language, values)
const button = (scope, name) => scope.getByRole('button', { name, exact: true })
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
    if (!localStorage.getItem('__batch31Seeded')) { localStorage.setItem('language', options.language ?? 'ko'); localStorage.setItem('theme', options.dark ? 'dark' : 'light'); localStorage.setItem('__batch31Seeded', '1') }
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
  try { detail = await fn({ page, context, open, network, logs }) ?? {}; assert.deepEqual(errors, [], 'JS page errors'); assert.deepEqual(hydration, [], 'Hydration errors'); for (const active of context.pages()) assert.deepEqual(await active.evaluate(() => window.__unhandled), [], 'Unhandled rejections'); assert.ok(!/\b(?:decisionTools)\.[a-zA-Z][\w.]+/.test(await page.locator('body').innerText()), 'Raw translation key') }
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
async function readNativeClipboard(page){return (await page.evaluate(()=>window.__nativeClipboardRead())).replace(/\r\n/g,'\n')}
const orderBox=page=>page.locator('#order-picker-result')
async function orderState(page){return orderBox(page).evaluate(node=>({phase:node.dataset.orderPhase,run:Number(node.dataset.orderRun),count:Number(node.dataset.orderRevealedCount),mode:node.dataset.orderRevealMode}))}
async function orderNames(page){return page.locator('[data-order-card][data-order-visible="true"]').evaluateAll(nodes=>nodes.map(node=>node.querySelector('span.text-base').textContent.trim()))}
async function orderWait(page,expected){await poll(async()=>{const state=await orderState(page);return Object.entries(expected).every(([key,value])=>state[key]===value)},'order '+JSON.stringify(expected));return orderState(page)}
const orderFixture=['Alpha','같은 이름','같은 이름','마지막 참가자']
async function openOrder(context,open,page,names=orderFixture){await observeDecisionPorts(context);await open('order-picker','?order='+encodeURIComponent(names.join(',')));await page.locator('[data-order-draw]').waitFor();await poll(async()=>new URL(page.url()).searchParams.get('order')===names.join(','),'order URL restored')}
async function completeManual(page){await page.locator('[data-order-mode="manual"]').click();await page.locator('[data-order-draw]').click();await page.locator('[data-order-reveal-all]').click();await orderWait(page,{phase:'complete'});return orderNames(page)}

test('order-native-auto-all-reset-and-late-callbacks',async({page,context,open})=>{
  await openOrder(context,open,page);await page.locator('[data-order-draw]').click();await orderWait(page,{phase:'revealing',count:1});assert.equal(await page.locator('[data-order-input]').isDisabled(),true);assert.equal(await page.locator('[data-order-copy]').count(),0);assert.equal(await page.locator('[data-order-download]').count(),0)
  await page.evaluate(()=>{window.__oldReveal=window.__orderTimers.findLast(item=>item.delay===500&&!item.canceled&&!item.fired).callback});await page.locator('[data-order-reveal-all]').click();const complete=await orderWait(page,{phase:'complete',count:4});const names=await orderNames(page);await page.evaluate(()=>window.__oldReveal());await wait(650);assert.deepEqual(await orderState(page),complete);assert.deepEqual(await orderNames(page),names)
  await page.locator('[data-order-reset]').click();await orderWait(page,{phase:'idle',count:0});await page.evaluate(()=>window.__orderHold=true);await page.locator('[data-order-draw]').click();const newer=await orderWait(page,{phase:'shuffling',count:0});await page.evaluate(()=>window.__oldReveal());assert.deepEqual(await orderState(page),newer)
  await page.evaluate(()=>window.__releaseOrderTimer());await orderWait(page,{phase:'revealing',count:0});await page.locator('[data-order-reset]').click();await page.evaluate(()=>{for(const item of window.__orderTimers.filter(item=>item.canceled&&[400,500].includes(item.delay)))item.callback()});await orderWait(page,{phase:'idle',count:0})
  return{nativeFirstReveal:true,allCountNeverDecreased:4,staleOldRunCount:0,editLockedDuringReveal:true,hiddenExports:0}
})

test('order-manual-keyboard-mode-switch-and-duplicate-multiset',async({page,context,open})=>{
  await openOrder(context,open,page);await page.locator('[data-order-mode="manual"]').click();await page.locator('[data-order-draw]').focus();await page.keyboard.press('Enter');const initial=await orderWait(page,{phase:'shuffling',count:0});assert.equal(await page.locator('[data-order-card][data-order-visible="true"]').count(),0)
  const next=page.locator('[data-order-next]');await next.focus();await page.keyboard.press('Space');await orderWait(page,{phase:'revealing',count:1});const prefix=await orderNames(page);assert.equal(await next.evaluate(node=>node===document.activeElement),true)
  const hidden=await page.locator('[data-order-card][data-order-visible="false"]').evaluateAll(nodes=>nodes.map(node=>({text:node.textContent,html:node.outerHTML})));assert.equal(hidden.length,3);for(const row of hidden)for(const name of orderFixture)assert.ok(!row.html.includes(name),'unrevealed card has no name')
  await page.locator('[data-order-mode="auto"]').click();await page.locator('[data-order-mode="manual"]').click();await wait(600);await orderWait(page,{run:initial.run,count:1});assert.deepEqual(await orderNames(page),prefix)
  await next.focus();for(let i=0;i<3;i++)await page.keyboard.press('Enter');await orderWait(page,{phase:'complete',run:initial.run,count:4});const names=await orderNames(page);assert.deepEqual([...names].sort(),[...orderFixture].sort());assert.equal(names[0],prefix[0]);assert.equal(await page.locator('[data-order-copy]').evaluate(node=>node===document.activeElement),true)
  await page.locator('[data-order-mode="auto"]').click();assert.deepEqual(await orderNames(page),names)
  return{duplicateCount:names.filter(name=>name==='같은 이름').length,oneRun:initial.run,prefixPreserved:true,hiddenNamesExposed:0,keyboardEndFocus:'copy'}
})

test('order-native-clipboard-exact-txt-and-edit-invalidation',async({page,context,open})=>{
  await openOrder(context,open,page);const names=await completeManual(page);const expected=names.map((name,index)=>decision('order.copyLine','ko',{rank:index+1,name})).join('\n');await page.locator('[data-order-copy]').click();await poll(()=>readNativeClipboard(page).then(value=>value===expected),'native clipboard equals all visible rows')
  const file=await download(page,()=>page.locator('[data-order-download]').click(),'presentation-order-native.txt');assert.equal(file.filename,'presentation-order.txt');assert.equal(file.text,expected);assert.notDeepEqual([...file.bytes.subarray(0,3)],[239,187,191]);const run=await orderState(page)
  await page.locator('[data-order-input]').fill('새 참가자');assert.deepEqual(await orderState(page),run);await page.locator('[data-order-input]').press('Enter');await orderWait(page,{phase:'idle',count:0});assert.equal(await page.locator('[data-order-copy]').count(),0)
  const data=await page.evaluate(()=>({local:JSON.stringify(localStorage),session:JSON.stringify(sessionStorage),url:location.href}));assert.ok(!data.local.includes('Alpha')&&!data.session.includes('Alpha'));assert.equal(new URL(data.url).searchParams.get('order'),[...orderFixture,'새 참가자'].join(','))
  return{nativeClipboard:true,fileName:file.filename,bytes:file.bytes.length,noBom:true,visibleOrderAndTxtExact:true,draftKeepsResultCommittedEditClears:true,existingRosterUrlPreserved:true,newResultStorage:0}
})

test('decision-copy-recovery-and-cross-request-stale',async({page,context,open})=>{
  await openOrder(context,open,page);const names=await completeManual(page);const expected=names.map((name,index)=>decision('order.copyLine','ko',{rank:index+1,name})).join('\n');await page.evaluate(()=>window.__setClipboardMode('reject'));await page.locator('[data-order-copy]').click();await page.locator('[data-decision-copy-recovery]').waitFor();assert.equal(await page.locator('[data-decision-copy-recovery] textarea').inputValue(),expected)
  await page.locator('[data-decision-copy-select]').click();assert.deepEqual(await page.locator('[data-decision-copy-recovery] textarea').evaluate(node=>[node.selectionStart,node.selectionEnd,node===document.activeElement]),[0,expected.length,true]);await page.evaluate(()=>window.__setClipboardMode('native'));await page.locator('[data-decision-copy-retry]').click();await poll(async()=>!await page.locator('[data-decision-copy-recovery]').count(),'native retry closes recovery');assert.equal(await readNativeClipboard(page),expected)
  await page.evaluate(()=>{window.__setClipboardMode('absent');window.__legacyMode='true'});await page.locator('[data-order-copy]').click();assert.equal(await page.locator('[data-order-copy]').innerText(),decision('common.copied'))
  await page.evaluate(()=>{window.__setClipboardMode('hold');window.__legacyMode='false'});await page.locator('[data-order-copy]').click();await poll(()=>page.evaluate(()=>window.__clipboardPending.length>0),'pending result copy');const calls=await page.evaluate(()=>window.__legacyCalls.length);await page.locator('[data-order-reset]').click();await page.evaluate(()=>window.__clipboardPending.shift().reject(new Error('late fixture rejection')));await wait(80);assert.equal(await page.evaluate(()=>window.__legacyCalls.length),calls);assert.equal(await page.locator('[data-decision-copy-recovery]').count(),0)
  await page.evaluate(()=>window.__setClipboardMode('reject'));await completeManual(page);await page.locator('[data-order-copy]').click();await page.locator('[data-decision-copy-recovery]').waitFor();await page.locator('[data-decision-copy-close]').click();assert.equal(await page.locator('[data-order-copy]').evaluate(node=>node===document.activeElement),true)
  return{nativeRetry:true,legacyTrueModeled:true,falseManualFullSelection:true,lateRejectAfterResetFallback:0,closeFocus:'current copy'}
})

test('menu-roulette-existing-history-plan-and-native-png',async({page,context,open})=>{
  const history={records:[{id:'excluded-fixture',name:'피자',date:'2026-11-17'}],excludeDays:7},plan={version:1,entries:[{date:'2026-11-18',menu:'합성 주간 메뉴'}]};await observeDecisionPorts(context);await context.addInitScript(({history,plan})=>{if(!localStorage.getItem('__menu31')){localStorage.setItem('toolhub-meals-v1',JSON.stringify(history));localStorage.setItem('toolhub:meal-plan',JSON.stringify(plan));localStorage.setItem('__menu31','1')}},{history,plan});await page.clock.setFixedTime(new Date('2026-11-17T12:00:00+09:00'));await open('menu-roulette','?roulette='+encodeURIComponent('피자,국수,김밥'))
  const before=await page.evaluate(()=>({history:localStorage.getItem('toolhub-meals-v1'),plan:localStorage.getItem('toolhub:meal-plan')}));await page.locator('#roulette-spin').click();await page.locator('[data-roulette-copy]').waitFor();await page.locator('[data-roulette-copy]').click();const pick=await page.evaluate(()=>window.__nativeClipboardRead());assert.ok(['국수','김밥'].includes(pick),`excluded pick ${pick}`)
  const file=await download(page,()=>button(page,decision('roulette.saveImage')).click(),'menu-roulette-native.png');const png=PNG.sync.read(file.bytes);assert.equal(png.width,600);assert.equal(png.height,340);assert.deepEqual(await page.evaluate(()=>({history:localStorage.getItem('toolhub-meals-v1'),plan:localStorage.getItem('toolhub:meal-plan')})),before)
  await button(page,decision('weekly.savePick','ko',{name:pick})).last().click();await poll(()=>page.evaluate(()=>JSON.parse(localStorage.getItem('toolhub-meals-v1')).records.length===2),'explicit meal history save');assert.equal(await page.evaluate(()=>localStorage.getItem('toolhub:meal-plan')),before.plan)
  return{nativeRafSpin:true,pickNotExcluded:true,pngDimensions:[600,340],nativePngBytes:file.bytes.length,historyUntouchedUntilExplicitSave:true,weekPlanBytesPreserved:true}
})

test('order-320-dark-ko-en-reduced-motion',async({page,context,open})=>{
  await page.emulateMedia({reducedMotion:'reduce'});await openOrder(context,open,page,['긴 이름의 합성 참가자 Alpha','긴 이름의 합성 참가자 Beta','같은 이름','같은 이름']);const names=await completeManual(page);await page.evaluate(()=>window.__setClipboardMode('reject'));await page.locator('[data-order-copy]').click();await page.locator('[data-decision-copy-recovery]').waitFor();const ko=await mobile(page,[page.locator('[data-order-input]'),page.locator('[data-decision-copy-recovery] textarea')],[page.locator('[data-order-draw]'),page.locator('[data-order-reveal-all]'),page.locator('[data-decision-copy-select]')]);await screenshot(page,'order-320-ko',orderBox(page));const state=await orderState(page)
  await changeLanguage(page,'en');await poll(async()=>await page.locator('[data-order-mode="manual"]').innerText()===decision('order.manualReveal','en'),'English order');assert.deepEqual(await orderState(page),state);assert.deepEqual(await orderNames(page),names);await page.locator('[data-order-copy]').click();await page.locator('[data-decision-copy-recovery]').waitFor();const en=await mobile(page,[page.locator('[data-order-input]'),page.locator('[data-decision-copy-recovery] textarea')],[page.locator('[data-order-draw]'),page.locator('[data-decision-copy-select]')]);await screenshot(page,'order-320-en',orderBox(page));assert.equal(await page.evaluate(()=>matchMedia('(prefers-reduced-motion: reduce)').matches),true)
  return{ko,en,fontMinimumPx:16,touchMinimumPx:44,reducedMotion:true,localePreservesRunAndPermutation:true}
},{width:320,dark:true})

const planned = [
  "order-native-auto-all-reset-and-late-callbacks",
  "order-manual-keyboard-mode-switch-and-duplicate-multiset",
  "order-native-clipboard-exact-txt-and-edit-invalidation",
  "decision-copy-recovery-and-cross-request-stale",
  "menu-roulette-existing-history-plan-and-native-png",
  "order-320-dark-ko-en-reduced-motion"
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
