import { chromium } from 'playwright'
import assert from 'node:assert/strict'
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { execFileSync } from 'node:child_process'
import { PNG } from 'pngjs'
import { splitSeconds,runningQuery,installRunningPorts } from '../docs/verify/2026-11-17-repeat-batch44/browser-fixtures.mjs'
import {parseDelimited} from '../docs/verify/2026-11-17-repeat-batch43/browser-fixtures.mjs'
import {observeAspectNativeIo} from '../docs/verify/2026-11-17-repeat-batch37/browser-fixtures.mjs'




// Independent real-browser checks. --list never starts Chrome; case-name filters
// preserve previous evidence so only changed boundaries need to be rerun.
const base = process.env.VERIFY_BASE_URL || 'http://127.0.0.1:3039'
const out = resolve('docs/verify/2026-11-17-repeat-batch44/browser')
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
    if (!localStorage.getItem('__batch44Seeded')) { localStorage.setItem('language', options.language ?? 'ko'); localStorage.setItem('theme', options.dark ? 'dark' : 'light'); localStorage.setItem('__batch44Seeded', '1') }
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




const rp=(page,name,value)=>page.locator(`[data-running-${name}${value===undefined?'':`="${value}"`}]`)
const clock=total=>`${Math.floor(total/3600)}:${String(Math.floor(total%3600/60)).padStart(2,'0')}:${String(total%60).padStart(2,'0')}`
async function setupRunning(args,query='',options={}) {await observeDecisionPorts(args.context);await installRunningPorts(args.context,options);await args.open('running-pace',query);if(!options.holdRestore)await poll(async()=>await rp(args.page,'single-action','copy').isEnabled(),'Running query ready')}
async function setGoal(page,index,total){const goal=rp(page,'goal').nth(index);for(const [field,value]of [['hours',Math.floor(total/3600)],['minutes',Math.floor(total%3600/60)],['seconds',total%60]])await goal.locator(`[data-running-goal-field="${field}"]`).fill(String(value))}
const goalsRaw=page=>rp(page,'goal').evaluateAll(elements=>elements.map(el=>[...el.querySelectorAll('input')].map(input=>input.value)))
async function runningCsv(page,name){return download(page,()=>rp(page,'export','csv').click(),name)}
function assertRows(rows,distance,split,goals){assert.equal(rows[0].length,3+5*goals.length);assert.equal(rows.length,Math.ceil(distance/split)+1);for(let i=1;i<rows.length;i++){const mark=Math.min(i*split,distance);assert.deepEqual(rows[i].slice(0,3).map(Number),[distance,split,mark]);for(let g=0;g<goals.length;g++){const offset=3+g*5;assert.equal(Number(rows[i][offset]),goals[g]);assert.equal(Number(rows[i][offset+1]),goals[g]/distance);assert.ok(Math.abs(Number(rows[i][offset+2])-3600*distance/goals[g])<1e-9);assert.ok(Math.abs(Number(rows[i][offset+3])-goals[g]*mark/distance)<1e-8);assert.equal(rows[i][offset+4],clock(splitSeconds(goals[g],distance,mark)))}}}

test('running-goals-current-and-isolation',async args=>{
 const {page}=args;await setupRunning(args);assert.equal(await page.locator('#running-minutes').inputValue(),'50');await rp(page,'goal-action','addCurrent').click();await rp(page,'goal-action','addCurrent').click();await rp(page,'goal-action','addBlank').click();assert.deepEqual(await goalsRaw(page),[['0','50','0'],['0','50','0'],['0','','0']]);assert.equal(await rp(page,'goal-action','addCurrent').isDisabled(),true);assert.equal(await rp(page,'export','csv').isDisabled(),true);await setGoal(page,2,3300);assert.equal(await rp(page,'export','csv').isDisabled(),false);const before=await goalsRaw(page);await rp(page,'distance','21.0975').click();await rp(page,'mode','pace').click();assert.deepEqual(await goalsRaw(page),before);await rp(page,'goal').nth(1).locator('[data-running-goal-action="remove"]').click();assert.deepEqual(await goalsRaw(page),[before[0],before[2]]);assert.match(await rp(page,'goal-summary','2').innerText(),/5:00|0:05:00/);return {maxThree:true,duplicateGoalsKept:true,invalidNotExported:true,goalClockSurvivesDistanceMode:true,removeStableOrder:true}
})
test('running-rounding-and-remainder',async args=>{
 const {page}=args;await setupRunning(args,runningQuery({distanceKm:100,custom:true,valueSeconds:29,splitKm:1,goals:[29]}));let file=await runningCsv(page,'round-half-29.csv');let rows=parseDelimited(file.text);assertRows(rows,100,1,[29]);assert.equal(rows[50][7],'0:00:15');await setGoal(page,0,28803);file=await runningCsv(page,'round-half-28803.csv');rows=parseDelimited(file.text);assertRows(rows,100,1,[28803]);assert.equal(rows[50][7],'4:00:02');for(const distance of [21.0975,42.195]){await rp(page,'distance',String(distance)).click();await rp(page,'split','5').click();await setGoal(page,0,7200);file=await runningCsv(page,`remainder-${distance}.csv`);rows=parseDelimited(file.text);assertRows(rows,distance,5,[7200]);assert.equal(Number(rows.at(-1)[2]),distance);assert.equal(rows.at(-1)[7],'2:00:00')}return {independentIntegerRationalOracle:true,halfSecond29:15,halfSecond28803:14402,halfMarathonAndMarathonExactLastSplit:true}
})
test('running-full-csv-tsv-pagination',async args=>{
 const {page}=args,goals=[180000,180600,179400];await setupRunning(args,runningQuery({distanceKm:500,custom:true,valueSeconds:180000,splitKm:1,goals}));assert.equal(await page.locator('#running-comparison-result tbody tr').count(),50);const file=await runningCsv(page,'running-500.csv');assert.deepEqual([...file.bytes.subarray(0,3)],[239,187,191]);const rows=parseDelimited(file.text);assertRows(rows,500,1,goals);await rp(page,'export','tsv').click();await rp(page,'output','copied').waitFor();const native=await page.evaluate(()=>window.__nativeClipboardRead());assert.deepEqual(parseDelimited(native,'\t'),rows);for(let i=0;i<9;i++)await rp(page,'page','next').click();assert.equal(await page.locator('#running-comparison-result tbody tr').count(),50);assert.ok((await page.locator('#running-comparison-result tbody tr').last().innerText()).includes('500 km'));const after=await runningCsv(page,'running-500-last-page.csv');assert.deepEqual(after.bytes,file.bytes);return {csvBytes:file.bytes.length,csvBom:true,wholeRows:500,columns:18,screenRows:50,pages:10,nativeTsvMatchesCsv:true,exportIndependentOfPage:true}
})
test('running-native-print-full-snapshot',async args=>{
 const {page}=args;await setupRunning(args,runningQuery({distanceKm:500,custom:true,valueSeconds:180000,splitKm:1,goals:[180000,180600,179400]}));await rp(page,'export','print').click();await poll(async()=>page.evaluate(()=>window.__runningPrintCalls.length===1),'Print called after DOM commit');assert.equal(await rp(page,'print-row').count(),500);assert.equal(await page.evaluate(()=>window.__runningPrintCalls[0].rows),500);const path=resolve(out,'running-500-print.pdf');await page.pdf({path,format:'A4',printBackground:true,preferCSSPageSize:true});const nativeRoot='C:/Program Files/WindowsApps/OpenAI.CodexPrimaryRuntime.v26-1112-611-0_26.1112.611.0_x64__3k8sg7r9htsxt/dependencies';const meta=JSON.parse(execFileSync(`${nativeRoot}/python/python.exe`,['docs/verify/2026-11-17-repeat-batch44/inspect-printed-pdf.py',path],{encoding:'utf8'}));assert.ok(meta.pages>5);const text=readFileSync(path.replace(/\.pdf$/,'.normalized.txt'),'utf8');for(let i=1;i<=500;i++)assert.ok(text.includes(clock(i*360)),`PDF includes split ${i}`);assert.ok(!/이용약관|금융 계산기|게임 센터|툴허브 건강 도구/.test(text),'Printed snapshot excludes site navigation/footer');for(const [pageNumber,label]of [[1,'first'],[meta.pages,'last']])execFileSync(`${nativeRoot}/native/poppler/Library/bin/pdftoppm.exe`,['-f',String(pageNumber),'-l',String(pageNumber),'-scale-to','1400','-png','-singlefile',path,resolve(out,`running-print-${label}`)],{stdio:'pipe'});await page.evaluate(()=>dispatchEvent(new Event('afterprint')));assert.equal(await rp(page,'print-document').count(),0);await page.evaluate(()=>window.__runningHoldPrint=true);await rp(page,'export','print').click();await poll(async()=>page.evaluate(()=>window.__runningPrintFrames.length>=2),'Held print RAF');await setGoal(page,0,180001);await page.evaluate(()=>window.__runningPrintFrames.at(-1).callback(performance.now()));assert.equal(await page.evaluate(()=>window.__runningPrintCalls.length),1);assert.equal(await rp(page,'print-document').count(),0);return {nativeChromiumPdf:true,pdf:meta,fullDomRows:500,all500ElapsedLabelsExtracted:true,firstLastRendered:true,afterprintCleanup:true,stalePrintCalls:0,physicalPrinterNotInvoked:true}
})
test('running-url-restore-and-invalid-draft',async args=>{
 const {page,context}=args;const query=runningQuery({distanceKm:21.0975,mode:'time',valueSeconds:5400,splitKm:1,goals:[5400,6000]})+'&keep=one&keep=two#native';await setupRunning(args,query,{holdRestore:true});await poll(async()=>page.evaluate(()=>window.__runningRestore.some(item=>!item.canceled)),'Initial callback captured');await page.locator('#running-minutes').fill('17');await page.evaluate(()=>{history.replaceState({...history.state,nativeFixture:7},'',location.href);window.__releaseRunningRestore()});await poll(async()=>await rp(page,'goal').count()===2,'Initial restored goals');assert.equal(await page.locator('#running-hours').inputValue(),'1');assert.equal(await page.locator('#running-minutes').inputValue(),'17');assert.deepEqual(await page.evaluate(()=>[new URLSearchParams(location.search).getAll('keep'),location.hash,history.state.nativeFixture]),[['one','two'],'#native',7]);const shared=await page.evaluate(()=>location.href);writeFileSync(resolve(out,'running-url-native-before-revisit.json'),JSON.stringify({shared,cachedUrl:page.url(),hours:await page.locator('#running-hours').inputValue(),minutes:await page.locator('#running-minutes').inputValue(),historyCalls:await page.evaluate(()=>window.__runningHistoryCalls)},null,2));assert.equal(JSON.parse(new URL(shared).searchParams.get('rp')).valueSeconds,4620,'Native address reflects early edit');const revisit=await context.newPage();await args.open('running-pace',new URL(shared).search+new URL(shared).hash,revisit);await poll(async()=>revisit.evaluate(()=>window.__runningRestore.some(item=>!item.canceled)),'Revisit restore callback scheduled');await revisit.evaluate(()=>window.__releaseRunningRestore());await wait(150);writeFileSync(resolve(out,'running-url-revisit-observation.json'),JSON.stringify({shared,actualUrl:revisit.url(),minutes:await revisit.locator('#running-minutes').inputValue(),restoreQueue:await revisit.evaluate(()=>window.__runningRestore.map(item=>({canceled:item.canceled})))},null,2));await poll(async()=>await revisit.locator('#running-minutes').inputValue()==='17','Revisit exact edited query');await rp(page,'goal').nth(0).locator('[data-running-goal-field="minutes"]').fill('');assert.equal(new URL(page.url()).searchParams.has('rp'),false);assert.equal(await rp(page,'share-boundary').count(),0);await args.open('running-pace','?rpV=99&rp=%7B%7D&keep=yes');await page.evaluate(()=>window.__releaseRunningRestore());await rp(page,'query-error','unsupported').waitFor();assert.equal(new URL(page.url()).searchParams.get('rpV'),'99');await page.locator('#running-minutes').fill('18');await poll(async()=>new URL(page.url()).searchParams.get('rpV')==='1','Explicit edit unblocks malformed query');assert.equal(new URL(page.url()).searchParams.get('keep'),'yes');return {earlyPartialEditWins:true,untouchedUrlFieldsRestored:true,unknownDuplicateQueryHashHistoryPreserved:true,newVisitExact:true,invalidGoalRemovesOwnedShareQuery:true,unsupportedRawPreservedUntilEdit:true}
})
test('running-copy-and-png-ownership',async args=>{
 const {page,context}=args;await observeAspectNativeIo(context);await setupRunning(args,runningQuery({goals:[3000,3300]}));await rp(page,'single-action','copy').click();await rp(page,'output','copied').waitFor();const native=await page.evaluate(()=>window.__nativeClipboardRead());assert.ok(native.includes('10 km'));await page.evaluate(()=>window.__setClipboardMode('absent'));await rp(page,'export','tsv').click();await rp(page,'output','failed').waitFor();const manual=await page.locator('#running-copy-manual').inputValue();await rp(page,'recovery','select').click();assert.deepEqual(await page.locator('#running-copy-manual').evaluate(el=>[el.selectionStart,el.selectionEnd]),[0,manual.length]);await page.evaluate(()=>window.__setClipboardMode('native'));await rp(page,'recovery','retry').click();await rp(page,'output','copied').waitFor();assert.equal((await page.evaluate(()=>window.__nativeClipboardRead())).replaceAll('\r\n','\n'),manual.replaceAll('\r\n','\n'));await page.evaluate(()=>window.__setClipboardMode('hold'));await rp(page,'single-action','copy').click();const legacy=await page.evaluate(()=>window.__legacyCalls.length);await page.evaluate(()=>window.__setClipboardMode('native'));await rp(page,'share-boundary').locator('[data-share-action="copy"]').click();await page.evaluate(()=>window.__clipboardPending[0].reject(new Error('Late copy')));await wait(80);assert.equal(await page.evaluate(()=>window.__legacyCalls.length),legacy);assert.equal(await rp(page,'output').count(),0);let downloads=0;page.on('download',()=>downloads++);await page.evaluate(()=>window.__aspectEncodeMode='hold');await rp(page,'share-boundary').locator('[data-share-action="save"]').click();await poll(async()=>page.evaluate(()=>window.__aspectHeld.some(item=>item.type==='encode')),'Native PNG encoded but callback held');await runningCsv(page,'copy-owner.csv');await page.evaluate(()=>window.__releaseAspect('encode'));await wait(100);assert.equal(downloads,1);await page.evaluate(()=>window.__aspectEncodeMode='native');const png=await download(page,()=>rp(page,'share-boundary').locator('[data-share-action="save"]').click(),'running-current-share.png');const image=PNG.sync.read(png.bytes);assert.ok(image.width>=600&&image.height>0);await rp(page,'single-action','copy').click();await rp(page,'output','copied').waitFor();await page.locator('#running-minutes').fill('51');await page.locator('#running-minutes').fill('50');assert.equal(await rp(page,'output').count(),0);await changeLanguage(page,'en');await changeLanguage(page,'ko');assert.equal(await rp(page,'output').count(),0);return {nativeClipboard:true,absentApiFalseRecovery:true,wholeManualSelection:true,retryNative:true,crossShareLateFallback:0,lateNativePngDownload:0,currentPng:[image.width,image.height],inputAndLocaleAbaNoRevival:true}
})
test('running-single-calculation-boundaries',async args=>{
 const {page}=args;await setupRunning(args);assert.ok((await page.locator('#running-pace-result').innerText()).includes('0:50:00'));await rp(page,'mode','pace').click();assert.equal(await page.locator('#running-pace-minutes').inputValue(),'5');await rp(page,'distance','custom').click();await page.locator('#running-distance').fill('500');await page.locator('#running-pace-minutes').fill('99');await page.locator('#running-pace-seconds').fill('59');assert.equal(await rp(page,'goal-action','addCurrent').isDisabled(),true);assert.ok((await page.locator('#running-pace-result').innerText()).includes('833:11:40'));await page.locator('#running-distance').fill('0.0001');await page.locator('#running-pace-minutes').fill('0');await page.locator('#running-pace-seconds').fill('1');assert.equal(await rp(page,'goal-action','addCurrent').isDisabled(),true);await rp(page,'distance','5').click();await page.locator('#running-pace-minutes').fill('6');await page.locator('#running-pace-seconds').fill('0');await rp(page,'mode','time').click();assert.equal(await page.locator('#running-minutes').inputValue(),'30');return {legacyDefaultAndModeConversion:true,aboveClockSingleValidButNotAddable:true,roundedBelowOneSecondNotAddable:true,presetRecovery:true}
})
test('running-320-dark-ko-en',async args=>{
 const {page}=args;await setupRunning(args,runningQuery({distanceKm:42.195,goals:[10800,12000,11000]}));await page.evaluate(()=>window.__setClipboardMode('reject'));await rp(page,'export','tsv').click();await rp(page,'output','failed').waitFor();const fields=[page.locator('#running-hours'),rp(page,'goal-field','minutes').first(),page.locator('#running-copy-manual')],controls=[rp(page,'export','tsv'),rp(page,'export','csv'),rp(page,'export','print'),rp(page,'recovery','select')];const ko=await mobile(page,fields,controls);await screenshot(page,'running-320-ko',rp(page,'output'));await changeLanguage(page,'en');await rp(page,'goal-action','addBlank').getByText(tr('runningPace','comparison.addBlank','en'),{exact:true}).waitFor();await page.evaluate(()=>window.__setClipboardMode('reject'));await rp(page,'export','tsv').click();await rp(page,'output','failed').waitFor();const en=await mobile(page,fields,controls);await screenshot(page,'running-320-en',rp(page,'output'));return {ko,en,fields16:true,controls44:true,allThreeGoalDraftsPreserved:true,translatedRecovery:true}
},{width:320,dark:true})

// Author final/canonical readiness received; runner executed sequentially after 49.
const planned = [
  "running-goals-current-and-isolation",
  "running-rounding-and-remainder",
  "running-full-csv-tsv-pagination",
  "running-native-print-full-snapshot",
  "running-url-restore-and-invalid-draft",
  "running-copy-and-png-ownership",
  "running-single-calculation-boundaries",
  "running-320-dark-ko-en"
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
