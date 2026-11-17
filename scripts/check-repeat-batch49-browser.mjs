import { chromium } from 'playwright'
import assert from 'node:assert/strict'
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { PNG } from 'pngjs'
import {installStoragePorts} from '../docs/verify/2026-11-17-repeat-batch41/browser-fixtures.mjs'
import {MEALS_KEY,PLAN_KEY,originalItems,menuQuery,winnerIndex,installMenuPorts} from '../docs/verify/2026-11-17-repeat-batch49/browser-fixtures.mjs'




// Independent real-browser checks. --list never starts Chrome; case-name filters
// preserve previous evidence so only changed boundaries need to be rerun.
const base = process.env.VERIFY_BASE_URL || 'http://127.0.0.1:3039'
const out = resolve('docs/verify/2026-11-17-repeat-batch49/browser')
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
    if (!localStorage.getItem('__batch49Seeded')) { localStorage.setItem('language', options.language ?? 'ko'); localStorage.setItem('theme', options.dark ? 'dark' : 'light'); localStorage.setItem('__batch49Seeded', '1') }
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
  try { detail = await fn({ page, context, open, network, logs }) ?? {}; assert.deepEqual(errors, [], 'JS page errors'); assert.deepEqual(hydration, [], 'Hydration errors'); assert.deepEqual(consoleErrors.filter(value=>/ErrorBoundary|NotFoundError|The above error occurred/i.test(value)),[],'React caught runtime errors'); for (const active of context.pages()) assert.deepEqual(await active.evaluate(() => window.__unhandled), [], 'Unhandled rejections'); assert.ok(!/\b(?:runningPace|characterCounter|decisionTools|shareResult)\.[a-zA-Z][\w.]+/.test(await page.locator('body').innerText()), 'Raw translation key') }
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




const menuAction=(page,name)=>page.locator(`[data-menu-${name}]`)
const round=page=>page.locator('[data-menu-round]')
const resultText=page=>page.locator('#roulette-result p.text-2xl')
const count=async page=>Number(await page.locator('[data-menu-round-count]').getAttribute('data-menu-round-count'))
const mealRaw=page=>page.evaluate(keys=>keys.map(key=>window.__nativeStoreGet(key)),[MEALS_KEY,PLAN_KEY])
async function setupMenu(args,items=originalItems,meals={records:[],excludeDays:1},plan={version:1,entries:[]}) {
 await installStoragePorts(args.context,{[MEALS_KEY]:JSON.stringify(meals),[PLAN_KEY]:JSON.stringify(plan)},'menu49');await installMenuPorts(args.context);await observeDecisionPorts(args.context);await args.open('menu-roulette',menuQuery(items));await poll(async()=>await count(args.page)===items.length,'Menu URL hydration');await poll(async()=>!(await args.page.locator('#roulette-spin').isDisabled()),'Menu storage ready');await args.page.evaluate(()=>window.__testMenuTurns=0)
}
async function spinAtIndex(page,items,index) {
 const previous=await page.evaluate(()=>window.__testMenuTurns??0),random=((.75-previous-(index+.5)/items.length)%1+1)%1,expected=winnerIndex(items.length,previous,random)
 assert.equal(expected.index,index);await page.evaluate(random=>window.__menuRandom=random,random);const started=Date.now();await page.locator('#roulette-spin').click();await page.locator('[data-roulette-spinning="true"]').waitFor();await page.locator('[data-roulette-spinning="false"]').waitFor();await resultText(page).waitFor();assert.equal(await resultText(page).innerText(),items[index]);await page.evaluate(turns=>window.__testMenuTurns=turns,expected.turns);return {random,elapsedMs:Date.now()-started,index,result:items[index]}
}
async function historyCount(page) {const prefix=tr('decisionTools','roulette.history','ko',{count:'__COUNT__'}).split('__COUNT__')[0];const button=page.locator('#roulette-items button[aria-expanded]').filter({hasText:prefix});return Number((await button.innerText()).match(/\d+/)?.[0]??0)}
async function addMeal(page,name) {const panel=page.locator('#meal-history');await panel.locator('details').evaluate(el=>el.open=true);await panel.getByLabel(tr('decisionTools','weekly.name'),{exact:true}).fill(name);await panel.getByRole('button',{name:tr('decisionTools','weekly.add'),exact:true}).click()}

test('menu-duplicate-exclude-and-restore',async args=>{
 const {page}=args;await setupMenu(args);const before=await mealRaw(page),url=page.url();const spin=await spinAtIndex(page,originalItems,0);await menuAction(page,'exclude-result').click();assert.equal(await count(page),2);assert.equal(await page.locator('[data-menu-temporarily-excluded="true"]').count(),2);assert.equal(await page.locator('[data-menu-candidate-index]').count(),4);assert.equal(await resultText(page).count(),0);assert.equal(await page.locator('#roulette-spin').evaluate(el=>el===document.activeElement),true);assert.equal(page.url(),url);assert.deepEqual(await mealRaw(page),before);await spinAtIndex(page,['국수','김밥'],1);await menuAction(page,'restore').click();assert.equal(await count(page),4);assert.equal(await page.locator('[data-menu-temporarily-excluded="true"]').count(),0);assert.equal(await resultText(page).count(),0);assert.equal(await page.locator('#roulette-spin').evaluate(el=>el===document.activeElement),true);assert.equal(await historyCount(page),2);assert.deepEqual(await mealRaw(page),before);return {nativeSpin:spin,duplicatesExcluded:2,originalRows:4,restoredOrder:true,historyPreserved:2,urlAndRawUnchanged:true,actualFocus:true}
})
test('menu-minimum-noop-spin-guards',async args=>{
 const {page}=args,items=['피자','피자','국수'];await setupMenu(args,items);await spinAtIndex(page,items,0);assert.equal(await menuAction(page,'exclude-result').isDisabled(),true);await spinAtIndex(page,items,2);await menuAction(page,'exclude-result').click();assert.equal(await count(page),2);const revision=await round(page).getAttribute('data-menu-round-revision');await page.getByRole('textbox',{name:tr('decisionTools','roulette.addInputLabel')}).fill('  ');await page.keyboard.press('Enter');assert.equal(await round(page).getAttribute('data-menu-round-revision'),revision);await menuAction(page,'restore').evaluate(el=>{window.__oldMenuRestore=Object.entries(el).find(([key])=>key.startsWith('__reactProps$'))[1].onClick});await page.evaluate(()=>{window.__menuRandom=.123;window.__menuHoldFrames=true});await page.locator('#roulette-spin').click();assert.equal(await menuAction(page,'restore').isDisabled(),true);await page.evaluate(()=>window.__oldMenuRestore());assert.equal(await count(page),2);await page.evaluate(()=>{const frame=window.__menuFrames.at(-1);window.__menuHoldFrames=false;frame.callback(performance.now()+10000)});await page.locator('[data-roulette-spinning="false"]').waitFor();assert.equal(await resultText(page).innerText(),'피자');const history=await historyCount(page);await page.evaluate(()=>window.__menuFrames.at(-1).callback(performance.now()+20000));assert.equal(await historyCount(page),history);await menuAction(page,'restore-all').click();assert.equal(await count(page),3);return {minimumRejectsDuplicateGroup:true,twoEqualWedgesAllowed:true,blankAdditionNoop:true,oldRestoreDuringSpinBlocked:true,controlledLateRafNoDuplicate:true}
})
test('menu-source-filter-and-revisit',async args=>{
 const {page,context}=args;await setupMenu(args);await spinAtIndex(page,originalItems,0);await menuAction(page,'exclude-result').click();const other=await context.newPage();await args.open('menu-roulette',menuQuery(originalItems),other);await poll(async()=>await count(other)===4,'Other tab starts without temporary exclusions');assert.equal(await count(page),2);await addMeal(page,'관계없는 샐러드');assert.equal(await count(page),2);assert.equal(await menuAction(page,'restore').count(),1);await addMeal(page,'국수');assert.equal(await count(page),3);assert.equal(await menuAction(page,'restore').count(),0);await page.locator('#meal-history').getByRole('button',{name:tr('decisionTools','weekly.days0'),exact:true}).click();assert.equal(await count(page),4);await spinAtIndex(page,originalItems,0);await menuAction(page,'exclude-result').click();await page.getByRole('textbox',{name:tr('decisionTools','roulette.addInputLabel')}).fill('합성 추가');await page.keyboard.press('Enter');assert.equal(await count(page),5);assert.equal(await menuAction(page,'restore').count(),0);await page.reload();await poll(async()=>await count(page)===5,'Reload original candidates');assert.equal(await menuAction(page,'restore').count(),0);return {otherTabIndependent:true,unrelatedHistoryPreservesExclusion:true,actualFilterChangeResets:true,sourceEditResets:true,revisitMemoryOnly:true}
})
test('menu-meal-plan-and-history-isolation',async args=>{
 const {page}=args;await setupMenu(args);const before=await mealRaw(page);await spinAtIndex(page,originalItems,0);await menuAction(page,'exclude-result').click();await page.locator('#meal-plan').getByRole('button',{name:tr('decisionTools','mealPlan.fill'),exact:true}).click();const menus=await page.locator('#meal-plan li input').evaluateAll(elements=>elements.map(el=>el.value));assert.deepEqual(menus.filter(Boolean).sort(),['국수','김밥','피자'].sort());assert.deepEqual(await mealRaw(page),before);const txt=await download(page,()=>page.locator('#meal-plan').getByRole('button',{name:tr('decisionTools','mealPlan.download'),exact:true}).click(),'menu-week.txt');const lines=txt.text.split('\n');assert.equal(lines.length,7);assert.ok(lines.some(line=>line.endsWith('\t피자')));assert.ok(!txt.bytes.subarray(0,3).equals(Buffer.from([239,187,191])));await menuAction(page,'restore-all').click();assert.deepEqual(await page.locator('#meal-plan li input').evaluateAll(elements=>elements.map(el=>el.value)),menus);assert.deepEqual(await mealRaw(page),before);return {temporaryExclusionDoesNotWrite:true,planStillIncludesTemporarilyExcludedMenu:true,actualTxtBytes:txt.bytes.length,allSevenDays:true,planDraftPreservedOnRestore:true}
})
test('menu-native-rng-png-and-stale',async args=>{
 const {page}=args;await setupMenu(args);const spin=await spinAtIndex(page,originalItems,0);assert.ok(spin.elapsedMs>=4000&&spin.elapsedMs<14000);const png=await download(page,()=>page.locator('#roulette-result').getByRole('button',{name:tr('decisionTools','roulette.saveImage'),exact:true}).click(),'native-menu-result.png');const decoded=PNG.sync.read(png.bytes);assert.deepEqual([decoded.width,decoded.height],[600,340]);await page.locator('[data-roulette-copy]').click();await page.locator('[data-roulette-copied="true"]').waitFor();const native=await page.evaluate(()=>window.__nativeClipboardRead());assert.ok(native.includes('피자'));await page.evaluate(()=>window.__setClipboardMode('hold'));await page.locator('[data-roulette-copy]').click();await poll(async()=>page.evaluate(()=>window.__clipboardPending.length===1),'Pending copy');await menuAction(page,'exclude-result').click();await page.evaluate(()=>window.__clipboardPending[0].reject(new Error('Old copy denied')));await wait(80);assert.equal(await page.evaluate(()=>window.__legacyCalls.length),0);assert.equal(await page.locator('[data-decision-copy-recovery]').count(),0);const before=await historyCount(page);await page.evaluate(()=>window.__menuFrames.at(-1).callback(performance.now()+10000));assert.equal(await historyCount(page),before);assert.equal(await resultText(page).count(),0);await page.evaluate(key=>window.__storeModes[key]='quota',MEALS_KEY);await menuAction(page,'restore-all').click();assert.equal(await count(page),4);return {nativeSpin:spin,nativeRafFrames:await page.evaluate(()=>window.__menuFrames.length),pngDimensions:[600,340],pngBytes:png.bytes.length,nativeClipboard:true,oldCopyFallback:0,lateCompletedRafIgnored:true,temporaryRestoreWithStorageQuota:true}
})
test('menu-generic-route-regression',async args=>{
 const {page}=args;await observeDecisionPorts(args.context);await args.open('roulette','?roulette=A,B,C');assert.equal(await round(page).count(),0);await page.locator('#roulette-spin').click();await page.locator('#roulette-result').waitFor();await page.locator('[data-roulette-copy]').click();await page.locator('[data-roulette-copied="true"]').waitFor();assert.ok(await page.evaluate(()=>window.__nativeClipboardRead()));await args.open('order-picker','?order=A,A,B,C');assert.equal(await round(page).count(),0);await page.locator('[data-order-mode="manual"]').click();await page.locator('[data-order-draw]').click();await page.locator('[data-order-reveal-all]').click();await page.locator('[data-order-copy]').waitFor();return {ordinaryRouletteNativeCopy:true,ordinaryOrderManualReveal:true,menuOnlyUiOnOtherRoutes:0}
})
test('menu-320-dark-ko-en',async args=>{
 const {page}=args;const items=['길이가 긴 합성 메뉴 피자','국수','길이가 긴 합성 메뉴 피자','김밥'];await setupMenu(args,items);await spinAtIndex(page,items,0);await menuAction(page,'exclude-result').focus();await page.keyboard.press('Enter');await menuAction(page,'restore').focus();const ko=await mobile(page,[page.getByRole('textbox',{name:tr('decisionTools','roulette.addInputLabel')})],[menuAction(page,'restore'),menuAction(page,'restore-all'),page.locator('#roulette-spin')]);await screenshot(page,'menu-round-320-ko',round(page));await changeLanguage(page,'en');await round(page).getByRole('heading',{name:tr('decisionTools','menuRound.title','en'),exact:true}).waitFor();const en=await mobile(page,[page.getByRole('textbox',{name:tr('decisionTools','roulette.addInputLabel','en')})],[menuAction(page,'restore'),menuAction(page,'restore-all'),page.locator('#roulette-spin')]);await screenshot(page,'menu-round-320-en',round(page));await menuAction(page,'restore').focus();await page.keyboard.press('Space');await poll(async()=>await count(page)===4,'Native Space restore');assert.equal(await page.locator('#roulette-spin').evaluate(el=>el===document.activeElement),true);return {ko,en,fields16:true,controls44:true,nativeEnterAndSpace:true,focusRestored:true}
},{width:320,dark:true})

// Author final ready and canonical ready are still required before launch.
const planned = [
  "menu-duplicate-exclude-and-restore",
  "menu-minimum-noop-spin-guards",
  "menu-source-filter-and-revisit",
  "menu-meal-plan-and-history-isolation",
  "menu-native-rng-png-and-stale",
  "menu-generic-route-regression",
  "menu-320-dark-ko-en"
]
const productCasesReady = true
if (only === '--list') console.log(planned.join('\n'))
else {
 assert.ok(productCasesReady, 'Parent/canonical final ready and native cases pending; Chrome was not started')
 const selected=cases.filter(item=>!only||only.split(',').some(part=>item.name.includes(part)));assert.ok(selected.length,'No selected cases')
 mkdirSync(out,{recursive:true});const browser=await chromium.launch({channel:'chrome'})
 try {for(const scenario of selected)await run(browser,scenario)}
 finally {await browser.close();const merged=readdirSync(out).filter(name=>name.endsWith('-evidence.json')).map(name=>JSON.parse(readFileSync(resolve(out,name),'utf8')));const final={checkedAt:new Date().toISOString(),passed:merged.filter(item=>item.status==='pass').length,failed:merged.filter(item=>item.status==='fail').length,browserClosed:true,results:merged};writeFileSync(resolve(out,'final-results.json'),JSON.stringify(final,null,2));console.log(JSON.stringify({passed:final.passed,failed:final.failed,browserClosed:true}))}
 if(results.some(item=>item.status!=='pass'))process.exitCode=1
}
export {tr,wait,poll,test,changeLanguage,screenshot,mobile,download,observeDecisionPorts}
