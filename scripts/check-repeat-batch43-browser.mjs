import { chromium } from 'playwright'
import assert from 'node:assert/strict'
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import {parseDelimited,thousandRows,independentPairs} from '../docs/verify/2026-11-17-repeat-batch43/browser-fixtures.mjs'
import {installStoragePorts} from '../docs/verify/2026-11-17-repeat-batch41/browser-fixtures.mjs'




// Independent real-browser checks. --list never starts Chrome; case-name filters
// preserve previous evidence so only changed boundaries need to be rerun.
const base = process.env.VERIFY_BASE_URL || 'http://127.0.0.1:3039'
const out = resolve('docs/verify/2026-11-17-repeat-batch43/browser')
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
    if (!localStorage.getItem('__batch43Seeded')) { localStorage.setItem('language', options.language ?? 'ko'); localStorage.setItem('theme', options.dark ? 'dark' : 'light'); localStorage.setItem('__batch43Seeded', '1') }
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
  try { detail = await fn({ page, context, open, network, logs }) ?? {}; assert.deepEqual(errors, [], 'JS page errors'); assert.deepEqual(hydration, [], 'Hydration errors'); assert.deepEqual(consoleErrors.filter(value=>/ErrorBoundary|NotFoundError|The above error occurred/i.test(value)),[],'React caught runtime errors'); for (const active of context.pages()) assert.deepEqual(await active.evaluate(() => window.__unhandled), [], 'Unhandled rejections'); assert.ok(!/\b(?:unitConverter|shareResult)\.[a-zA-Z][\w.]+/.test(await page.locator('body').innerText()), 'Raw translation key') }
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



const batch=page=>page.locator('[data-unit-batch]')
const batchInput=page=>page.locator('#unit-batch-input')
const batchButton=(page,action)=>page.locator(`[data-unit-batch-${action}]`)
const shared=page=>page.locator('[data-unit-share-boundary] [data-share-action="copy"]')
async function setup(args,query='?c=length&f=m&t=cm&v=7&p=6&rb=16&keep=1#verify'){
  await observeDecisionPorts(args.context);await installStoragePorts(args.context,{'toolhub:unit-converter:favorites':JSON.stringify({version:1,favorites:[{id:'synthetic-temp',name:'검증 온도',pair:{c:'temperature',f:'degC',t:'degF',p:6,rb:16}}]})},'unit-batch');await args.open('unit-converter',query);await poll(async()=>await args.page.locator('#uc-value').inputValue()===(new URLSearchParams(query.split('#')[0]).get('v')??'1'),'Initial single URL value');await batchButton(args.page,'toggle').click();await batchInput(args.page).waitFor();assert.equal(await args.page.locator('[data-unit-batch-result]').count(),0)
}
async function runBatch(page,text){await batchInput(page).fill(text);await batchButton(page,'run').click();await page.locator('[data-unit-batch-result]').waitFor()}
async function setPair(page,pair){await page.locator(`[data-unit-category="${pair.c}"]`).click();await page.locator('#uc-from').selectOption(pair.f);await page.locator('#uc-to').selectOption(pair.t);await page.locator('#uc-sig').selectOption(String(pair.p));if(pair.c==='css')await page.locator('#uc-rb').fill(String(pair.rb))}
async function csv(page,name){const file=await download(page,()=>batchButton(page,'csv').click(),name);assert.equal(file.filename,'unit-conversion-batch.csv');assert.deepEqual([...file.bytes.subarray(0,3)],[239,187,191]);return {...file,rows:parseDelimited(file.text)}}
async function copied(page,id){if(id==='batch')await poll(async()=>(await batchButton(page,'copy').innerText())===tr('unitConverter','batch.copied'),'Batch native copy feedback');else await page.locator(`[data-unit-copy="${id}"][data-unit-copied="true"]`).waitFor()}

test('unit-batch-pairs-and-independent-arithmetic',async args=>{
  const {page}=args;await setup(args);const checks=[];for(const fixture of independentPairs){await setPair(page,fixture.pair);await runBatch(page,fixture.source);const values=await page.locator('[data-unit-batch-line]').evaluateAll(rows=>rows.map(row=>Number(row.querySelectorAll('td')[1].textContent.trim().split(' ')[0])));assert.equal(values.length,fixture.expected.length);values.forEach((value,index)=>assert.ok(Math.abs(value-fixture.expected[index])<1e-7));checks.push({category:fixture.pair.c,values})}
  await setPair(page,independentPairs[0].pair);await runBatch(page,'0x10\n1,000\n1_000\n1 000\n\n1\t2\n0\n');const file=await csv(page,'syntax-and-blank.csv');assert.equal(file.rows.length,8);assert.deepEqual(file.rows.slice(1).map(row=>row[3]),['1600','100000','100000','100000','','','0']);assert.equal(file.rows[6][1],"'1\t2");assert.equal(await page.locator('#uc-value').inputValue(),'7');return {checks,legacyNumberSyntax:true,blankIsNotZero:true,tabIsInvalidWholeRow:true,singleValueUnchanged:true}
})

test('unit-batch-1000-rows-csv-and-tsv',async args=>{
  const {page}=args;await setup(args);const source=thousandRows();await runBatch(page,source);assert.equal(await page.locator('[data-unit-batch-line]').count(),200);assert.equal(await page.locator('[data-unit-batch-counts]').innerText(),tr('unitConverter','batch.counts','ko',{total:1000,valid:995,invalid:4,blank:1}));const file=await csv(page,'all-1000.csv');assert.equal(file.rows.length,1001);assert.ok(file.rows.every(row=>row.length===8));const original=source.slice(0,-1).split('\n');for(let i=0;i<original.length;i++){assert.equal(file.rows[i+1][0],String(i+1));assert.equal(file.rows[i+1][1],original[i]?"'"+original[i]:'')};assert.equal(file.rows[1000][3],'100000');assert.equal(file.rows[5][1],"'=SUM(A1:A2)");assert.equal(file.text.indexOf('\uFEFF',1),-1)
  await batchButton(page,'copy').click();await copied(page,'batch');const native=await page.evaluate(()=>window.__nativeClipboardRead());assert.equal(native.startsWith('\uFEFF'),false);assert.deepEqual(parseDelimited(native,'\t'),file.rows);return {previewRows:200,exportRows:1000,columns:8,csvBytes:file.bytes.length,bomExactlyOnce:true,nativeTsvMatchesCsvCells:true,allSourceRowsPreserved:true}
})

test('unit-batch-confirmed-snapshot-and-collapse',async args=>{
  const {page}=args;await setup(args);await runBatch(page,'1\n2');await batchInput(page).fill('3\n4');await page.locator('[data-unit-swap]').click();await page.locator('#uc-sig').selectOption('4');await page.locator('[data-unit-batch-stale="true"]').waitFor();const previous=await csv(page,'previous-pair.csv');assert.deepEqual(previous.rows.slice(1).map(row=>[row[1],row[2],row[3],row[4],row[6]]),[["'1",'m','100','cm','6'],["'2",'m','200','cm','6']]);await batchButton(page,'toggle').click();assert.equal(await batch(page).isVisible(),false);await batchButton(page,'toggle').click();assert.equal(await batchInput(page).inputValue(),'3\n4');assert.equal(await page.locator('[data-unit-batch-stale="true"]').count(),1)
  const singleBeforeFavorite=await page.locator('#uc-value').inputValue();assert.equal(singleBeforeFavorite,'700');await page.getByRole('group',{name:tr('unitConverter','favorites.quickList'),exact:true}).getByRole('button',{name:'검증 온도',exact:true}).click();assert.equal(await page.locator('#uc-value').inputValue(),singleBeforeFavorite);await batchButton(page,'run').click();const next=await csv(page,'favorite-current.csv');assert.deepEqual(next.rows.slice(1).map(row=>row[3]),['37.4','39.2']);assert.equal(await page.locator('[data-unit-batch-stale="false"]').count(),1);return {oldSnapshotPairPrecisionAndRawPreserved:true,collapsePreservesDraftAndSnapshot:true,favoriteKeepsSingleValue:true,newRunUsesCurrentPair:true,fixtureCorrection:'The existing swap converts the single input 7 m to 700 cm; favorites must preserve the current 700 value.'}
})

test('unit-batch-limits-and-empty-lines',async args=>{
  const {page}=args;await setup(args);await runBatch(page,'1');await batchInput(page).fill(Array(1001).fill('2').join('\n'));await batchButton(page,'run').click();await page.locator('[data-unit-batch-error="tooManyRows"]').waitFor();assert.equal(await page.locator('[data-unit-batch-line]').count(),1);await batchInput(page).fill('x'.repeat(50001));await batchButton(page,'run').click();await page.locator('[data-unit-batch-error="tooManyCharacters"]').waitFor();assert.equal((await batchInput(page).inputValue()).length,50001)
  await runBatch(page,'1\n\n');let file=await csv(page,'trailing-blank.csv');assert.equal(file.rows.length,3);assert.equal(file.rows[2][1],'');await runBatch(page,'\n');file=await csv(page,'blank-only.csv');assert.equal(file.rows.length,2);await runBatch(page,'');assert.equal(await page.locator('[data-unit-batch-line]').count(),0);assert.equal(await batchButton(page,'copy').isDisabled(),true);assert.equal(await batchButton(page,'csv').isDisabled(),true);await setPair(page,{c:'fuel',f:'kmL',t:'L100km',p:6,rb:16});await runBatch(page,'0\n10');file=await csv(page,'nonfinite-row.csv');assert.equal(file.rows[1][3],'');assert.equal(file.rows[2][3],'10');return {overLimitRawNotTruncated:true,oldResultPreserved:true,oneTerminatorAndAdditionalBlank:true,emptyZeroRowsExportsDisabled:true,nonfiniteIsRowError:true}
})

test('unit-batch-native-copy-ownership',async args=>{
  const {page}=args;await setup(args);await runBatch(page,'1\n2');await batchButton(page,'copy').click();await copied(page,'batch');const full=await page.evaluate(()=>window.__nativeClipboardRead());await page.evaluate(()=>window.__setClipboardMode('absent'));await batchButton(page,'copy').click();await page.locator('[data-unit-copy-recovery]').waitFor();const manual=page.locator('[data-unit-copy-manual]');assert.equal((await manual.inputValue()).replace(/\r\n/g,'\n'),full.replace(/\r\n/g,'\n'));await page.locator('[data-unit-copy-select]').click();assert.deepEqual(await manual.evaluate(el=>[el.selectionStart,el.selectionEnd]),[0,(await manual.inputValue()).length]);await page.evaluate(()=>window.__setClipboardMode('native'));await page.locator('[data-unit-copy-retry]').click();await copied(page,'batch')
  for(const direction of ['batchToMain','batchToShare','shareToBatch']){await page.evaluate(()=>window.__setClipboardMode('hold'));if(direction==='shareToBatch')await shared(page).click();else await batchButton(page,'copy').click();await page.evaluate(()=>window.__setClipboardMode('native'));if(direction==='batchToMain'){await page.locator('[data-unit-copy="main"]').click();await copied(page,'main')}else if(direction==='batchToShare'){await shared(page).click();await poll(async()=>(await page.evaluate(()=>window.__nativeClipboardRead())).includes('unit-converter'),'Shared native copy')}else{await batchButton(page,'copy').click();await copied(page,'batch')};const before=await page.evaluate(()=>({legacy:window.__legacyCalls.length,text:window.__nativeClipboardRead()}));const latest=await page.evaluate(()=>window.__nativeClipboardRead());await page.evaluate(()=>window.__clipboardPending.at(-1).reject(new Error('Synthetic late copy rejection')));await wait(50);assert.equal(await page.evaluate(()=>window.__legacyCalls.length),before.legacy);assert.equal(await page.evaluate(()=>window.__nativeClipboardRead()),latest)}
  await page.locator('#uc-value').fill('8');await page.locator('#uc-value').fill('7');assert.equal(await page.locator('[data-unit-copied="true"]').count(),0);await page.evaluate(()=>window.__setClipboardMode('hold'));await batchButton(page,'copy').click();await changeLanguage(page,'en');await changeLanguage(page,'ko');await page.evaluate(()=>window.__clipboardPending.at(-1).resolve());await wait(50);assert.notEqual(await batchButton(page,'copy').innerText(),tr('unitConverter','batch.copied'));return {nativeFullCopy:true,failedManualSelectionAndRetry:true,lateCrossTargets:3,lateFallback:0,inputAndLocaleABAFeedback:0}
})

test('unit-batch-url-storage-and-revisit',async args=>{
  const {page,context,network}=args;await setup(args);await page.evaluate(()=>history.replaceState({verification:19},'',location.href));const marker='SYNTHETIC-BATCH-PRIVATE-983741';await runBatch(page,'2\n'+marker);await page.locator('#uc-value').fill('12');await poll(()=>new URL(page.url()).searchParams.get('v')==='12','Updated single URL');assert.equal(new URL(page.url()).searchParams.get('keep'),'1');assert.equal(new URL(page.url()).hash,'#verify');assert.equal(await page.evaluate(()=>history.state.verification),19);await wait(600);assert.ok(!page.url().includes(marker));assert.ok(!(await page.evaluate(()=>JSON.stringify({...localStorage}))).includes(marker));assert.ok(network.every(request=>!request.includes(marker)));const next=await context.newPage();await next.goto(page.url());await next.locator('#uc-value').waitFor();await poll(async()=>await next.locator('#uc-value').inputValue()==='12','Revisit single input');await batchButton(next,'toggle').click();assert.equal(await batchInput(next).inputValue(),'1\n10\n100');assert.equal(await next.locator('[data-unit-batch-result]').count(),0);await next.close();await page.locator('[data-unit-category="traditional"]').click();assert.equal(await batchButton(page,'run').isDisabled(),true);return {batchMarkerAbsentFromUrlStorageAndNetwork:true,singleUnknownQueryHashHistoryPreserved:true,revisitOnlyRestoresSingleValue:true,traditionalHasNoBatchPair:true}
})

test('unit-batch-320-dark-ko-en',async args=>{
  const {page}=args;await setup(args);await runBatch(page,'1\n\nwrong\n1\t2');await page.evaluate(()=>window.__setClipboardMode('absent'));await batchButton(page,'copy').click();await page.locator('[data-unit-copy-manual]').waitFor();const fields=[batchInput(page),page.locator('#uc-value'),page.locator('#uc-from'),page.locator('#uc-to'),page.locator('[data-unit-copy-manual]')],controls=['toggle','run','copy','csv'].map(id=>batchButton(page,id));const ko=await mobile(page,fields,controls);await screenshot(page,'unit-batch-320-ko',page.locator('[data-unit-copy-recovery]'));await changeLanguage(page,'en');await page.getByRole('heading',{name:tr('unitConverter','batch.title','en'),exact:true}).waitFor();await batchButton(page,'copy').click();await page.locator('[data-unit-copy-manual]').waitFor();const en=await mobile(page,fields,controls);await screenshot(page,'unit-batch-320-en',page.locator('[data-unit-copy-recovery]'));const file=await csv(page,'english-rows.csv');assert.equal(file.rows[0][0],tr('unitConverter','batch.columns.line','en'));assert.equal(await batchInput(page).inputValue(),'1\n\nwrong\n1\t2');return {ko,en,fields16:true,controls44:true,englishCsvHeaders:true,localePreservesSource:true}
},{width:320,dark:true})

// Author/canonical final ready received. Other batch runners remain closed.
const planned = [
  "unit-batch-pairs-and-independent-arithmetic",
  "unit-batch-1000-rows-csv-and-tsv",
  "unit-batch-confirmed-snapshot-and-collapse",
  "unit-batch-limits-and-empty-lines",
  "unit-batch-native-copy-ownership",
  "unit-batch-url-storage-and-revisit",
  "unit-batch-320-dark-ko-en"
]
const productCasesReady = true
if (only === '--list') console.log(planned.join('\n'))
else {
  assert.ok(productCasesReady, 'Parent/canonical final ready and native cases pending; Chrome was not started')
  const selected = cases.filter(item => !only || only.split(',').some(part => item.name.includes(part))); assert.ok(selected.length, 'No selected cases')
  mkdirSync(out, {recursive:true});const browser=await chromium.launch({channel:'chrome'})
  try {for(const scenario of selected){await run(browser,scenario);if(results.at(-1)?.errors.some(error=>/Export .*doesn't exist|Module not found|Failed to compile/.test(error)))break}}
  finally {await browser.close();const merged=readdirSync(out).filter(name=>name.endsWith('-evidence.json')).map(name=>JSON.parse(readFileSync(resolve(out,name),'utf8')));const final={checkedAt:new Date().toISOString(),passed:merged.filter(item=>item.status==='pass').length,failed:merged.filter(item=>item.status==='fail').length,browserClosed:true,results:merged};writeFileSync(resolve(out,'final-results.json'),JSON.stringify(final,null,2));console.log(JSON.stringify({passed:final.passed,failed:final.failed,browserClosed:true}))}
  if(results.some(item=>item.status!=='pass'))process.exitCode=1
}
export {tr,wait,poll,test,changeLanguage,screenshot,mobile,download,observeDecisionPorts}
