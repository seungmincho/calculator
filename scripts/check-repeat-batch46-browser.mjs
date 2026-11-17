import { chromium } from 'playwright'
import assert from 'node:assert/strict'
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import {installStoragePorts,holdNativeLock,releaseNativeLock} from '../docs/verify/2026-11-17-repeat-batch41/browser-fixtures.mjs'
import {READING_KEY,localVoice,remoteVoice,sourceText,readingRecord,readingEnvelope,speechMock,installTtsClipboard} from '../docs/verify/2026-11-17-repeat-batch46/browser-fixtures.mjs'




// Independent real-browser checks. --list never starts Chrome; case-name filters
// preserve previous evidence so only changed boundaries need to be rerun.
const base = process.env.VERIFY_BASE_URL || 'http://127.0.0.1:3039'
const out = resolve('docs/verify/2026-11-17-repeat-batch46/browser')
const only = process.argv[2]
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
    if (!localStorage.getItem('__batch46Seeded')) { localStorage.setItem('language', options.language ?? 'ko'); localStorage.setItem('theme', options.dark ? 'dark' : 'light'); localStorage.setItem('__batch46Seeded', '1') }
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
  try { detail = await fn({ page, context, open, network, logs }) ?? {}; assert.deepEqual(errors, [], 'JS page errors'); assert.deepEqual(hydration, [], 'Hydration errors'); assert.deepEqual(consoleErrors.filter(value=>/ErrorBoundary|NotFoundError|The above error occurred/i.test(value)),[],'React caught runtime errors'); for (const active of context.pages()) assert.deepEqual(await active.evaluate(() => window.__unhandled), [], 'Unhandled rejections'); assert.ok(!/\b(?:textToSpeech|shareResult)\.[a-zA-Z][\w.]+/.test(await page.locator('body').innerText()), 'Raw translation key') }
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
const tts=(page,name,value)=>page.locator(`[data-tts-${name}${value===undefined?'':`="${value}"`}]`)
const reading=(page,name,value)=>tts(page,`reading-${name}`,value)
const speeches=page=>page.evaluate(()=>window.__speech.log)
const raw=page=>page.evaluate(key=>window.__nativeStoreGet(key),READING_KEY)
async function emit(page,index,type,code){await page.evaluate(({index,type,code})=>window.__emitSpeech(index,type,code),{index,type,code})}
async function expectSpeaks(page,count){await poll(async()=>(await speeches(page)).length===count,`speak count ${count}`)}
async function setupTts(args,records=readingEnvelope(),query=`?t=${encodeURIComponent(sourceText)}`,voices=[localVoice,remoteVoice]){await installStoragePorts(args.context,{[READING_KEY]:typeof records==='string'?records:records===null?null:JSON.stringify(records)},'tts46');await speechMock(args.context,voices);await installTtsClipboard(args.context);await args.open('text-to-speech',query);await tts(args.page,'ready','true').waitFor();await reading(args.page,'refresh').waitFor();assert.equal((await speeches(args.page)).length,0)}
async function loadRecord(page,id='fixture-saved'){await reading(page,'load',id).click();await reading(page,'confirm','load').click();await reading(page,'success').waitFor()}
async function saveRecord(page,name){await reading(page,'name').fill(name);await reading(page,'save').click();await reading(page,'success','saved').waitFor()}

test('reading-save-paused-position-revisit',async args=>{
 const {page}=args;await setupTts(args,null,`?t=${encodeURIComponent(sourceText)}&r=1.3`);assert.equal(await raw(page),null);await tts(page,'play').click();await expectSpeaks(page,1);await emit(page,0,'end');await expectSpeaks(page,2);await tts(page,'play').click();await tts(page,'status','paused').waitFor();await saveRecord(page,'저장 위치 합성');const saved=JSON.parse(await raw(page));assert.equal(saved.records.length,1);const record=saved.records[0];assert.equal(record.text,sourceText);assert.deepEqual(record.position,readingRecord().position);assert.equal(record.settings.rate,1.3);assert.equal('repeat' in record.settings,false);const before=await raw(page);await args.open('text-to-speech',`?t=${encodeURIComponent('새 방문 URL 원고')}`);await tts(page,'ready','true').waitFor();assert.equal(await page.locator('#tts-text').inputValue(),'새 방문 URL 원고');assert.equal(await raw(page),before);assert.equal((await speeches(page)).length,0);assert.equal(await page.evaluate(key=>window.__storeLog.filter(item=>item.key===key).length,READING_KEY),0);return {pausedSecondSentenceExact:true,rawTextAndSettingsSaved:true,repeatPassNotStored:true,newVisitUrlWins:true,automaticSpeech:0,initialListWrites:0}
})

test('reading-explicit-load-delete-and-old-speech',async args=>{
 const {page}=args;await setupTts(args);await page.locator('#tts-text').fill('현재 읽고 있는 다른 문장. 두 번째 현재 문장.');await tts(page,'repeat').check();await tts(page,'play').click();await expectSpeaks(page,1);await loadRecord(page);assert.equal(await page.locator('#tts-text').inputValue(),sourceText);assert.equal(await tts(page,'repeat').isChecked(),false);assert.equal(await tts(page,'root').getAttribute('data-tts-start-from'),'1');assert.equal(await tts(page,'root').getAttribute('data-tts-status'),'stopped');assert.equal((await speeches(page)).length,1);assert.equal(await page.locator('#tts-rate').inputValue(),'1.3');await emit(page,0,'end');await emit(page,0,'error');assert.equal((await speeches(page)).length,1);await tts(page,'play').click();await expectSpeaks(page,2);assert.equal((await speeches(page))[1].text,readingRecord().position.text);await reading(page,'delete','fixture-saved').click();await reading(page,'confirm','delete').click();await reading(page,'success','deleted').waitFor();assert.equal(await page.locator('#tts-text').inputValue(),sourceText);assert.equal(await tts(page,'root').getAttribute('data-tts-status'),'speaking');assert.equal((await speeches(page)).length,2);await reading(page,'refresh').click();assert.equal((await speeches(page)).length,2);return {explicitLoadNoAutoplay:true,startAtStoredSentence:true,repeatOff:true,oldEndErrorIgnored:true,deleteRefreshKeepCurrentSpeech:true}
})

test('reading-local-voice-loss-and-arrival',async args=>{
 const {page}=args;await setupTts(args,readingEnvelope(),undefined,[remoteVoice]);await loadRecord(page);assert.equal(await tts(page,'local-only').isChecked(),true);assert.equal(await tts(page,'play').isDisabled(),true);assert.equal((await speeches(page)).length,0);await page.evaluate(voice=>window.__setSpeechVoices([voice]),localVoice);await poll(async()=>!(await tts(page,'play').isDisabled()),'local voice arrival');assert.equal((await speeches(page)).length,0);await tts(page,'play').click();await expectSpeaks(page,1);assert.equal((await speeches(page))[0].local,true);await page.evaluate(()=>window.__setSpeechVoices([]));await poll(()=>tts(page,'play').isDisabled(),'empty voices disables play');await emit(page,0,'end');assert.equal((await speeches(page)).length,1);await page.evaluate(voices=>window.__setSpeechVoices(voices),[localVoice,remoteVoice]);await tts(page,'local-only').uncheck();await page.locator('#tts-voice').selectOption(remoteVoice.name);await page.evaluate(voices=>window.__setSpeechVoices(voices),[localVoice,remoteVoice]);assert.equal(await page.locator('#tts-voice').inputValue(),remoteVoice.name);return {remoteOnlyLocalModeSpeech:0,localArrivalNoAutoplay:true,emptyVoicesClearsLiveSelection:true,nextUtteranceAfterLoss:0,manualVoiceIntentWinsLateVoices:true}
})

test('reading-native-lock-and-two-tab-cas',async args=>{
 const {page,context}=args;await setupTts(args);const holder=await context.newPage();await args.open('text-to-speech',`?t=${encodeURIComponent('외부 탭 원고')}`,holder);await tts(holder,'ready','true').waitFor();await holdNativeLock(holder,READING_KEY);await reading(page,'load','fixture-saved').click();await reading(page,'confirm','load').click();await poll(()=>page.evaluate(async key=>(await navigator.locks.query()).pending.some(item=>item.name===key),READING_KEY),'load queued under native WebLock');await page.locator('#tts-text').fill('대기 뒤 최신 원고');await releaseNativeLock(holder,READING_KEY);await wait(80);assert.equal(await page.locator('#tts-text').inputValue(),'대기 뒤 최신 원고');await loadRecord(page);assert.equal(await page.locator('#tts-text').inputValue(),sourceText);await saveRecord(holder,'외부 추가');await reading(page,'error','conflict').waitFor();const changed=await raw(page);assert.equal(JSON.parse(changed).records.length,2);assert.equal(await page.locator('#tts-text').inputValue(),sourceText);await reading(page,'refresh').click();assert.equal(await reading(page,'record').count(),2);await holdNativeLock(holder,READING_KEY);await reading(page,'load','fixture-saved').click();await reading(page,'confirm','load').click();await page.locator('header a[href="/"]').first().click();await tts(page,'root').waitFor({state:'detached'});await releaseNativeLock(holder,READING_KEY);assert.equal(await raw(page),changed);return {realWebLocks:true,queuedLoadEditPreserved:true,freshConfirmedLoadWorks:true,actualOtherTabStorageEvent:true,reloadCurrentTextUnchanged:true,unmountCancelsQueuedLoad:true}
})

test('reading-corrupt-quota-unknown-preservation',async args=>{
 const {page}=args;const corrupt='{bad-reading';await setupTts(args,corrupt);await reading(page,'error','corrupt').waitFor();await tts(page,'play').click();await expectSpeaks(page,1);await tts(page,'stop').click();assert.equal(await raw(page),corrupt);const future=JSON.stringify({version:2,revision:'future',records:[]});await page.evaluate(({key,value})=>window.__nativeStoreSet(key,value),{key:READING_KEY,value:future});await reading(page,'refresh').click();await reading(page,'error','unsupported').waitFor();assert.equal(await raw(page),future);await page.evaluate(key=>window.__nativeStoreRemove(key),READING_KEY);await reading(page,'refresh').click();await page.evaluate(key=>window.__storeModes[key]='quota',READING_KEY);await reading(page,'name').fill('실패 뒤 유지');await reading(page,'save').click();await reading(page,'error','quota').waitFor();assert.equal(await raw(page),null);assert.equal(await reading(page,'name').inputValue(),'실패 뒤 유지');assert.equal(await page.locator('#tts-text').inputValue(),sourceText);await page.evaluate(key=>window.__storeModes[key]='native',READING_KEY);await reading(page,'refresh').click();await reading(page,'save').click();await reading(page,'success','saved').waitFor();await page.evaluate(key=>window.__storeModes[key]='readback-once',READING_KEY);await reading(page,'name').fill('쓰기 결과 미확인');await reading(page,'save').click();await reading(page,'error','writeUnknown').waitFor();assert.equal(JSON.parse(await raw(page)).records.length,2);assert.equal(await reading(page,'save').isDisabled(),true);await page.evaluate(key=>window.__storeModes[key]='native',READING_KEY);await reading(page,'refresh').click();assert.equal(await reading(page,'record').count(),2);return {corruptFutureBytesPreserved:true,normalSpeechIndependent:true,quotaDraftNameAndTextPreserved:true,unknownWriteNoRollback:true,explicitRefreshReconciles:true}
})

test('reading-limits-position-and-unicode',async args=>{
 const {page}=args;const stale=readingRecord({position:{...readingRecord().position,index:0}});await setupTts(args,readingEnvelope([stale]));await loadRecord(page);await reading(page,'success','positionChanged').waitFor();assert.equal(await tts(page,'root').getAttribute('data-tts-start-from'),'0');assert.equal((await speeches(page)).length,0);const unicode='a'.repeat(139)+'😀'+'b'.repeat(10);await page.locator('#tts-text').fill(unicode);await tts(page,'play').click();await expectSpeaks(page,1);assert.equal((await speeches(page))[0].text,'a'.repeat(139));await emit(page,0,'end');await expectSpeaks(page,2);assert.equal((await speeches(page))[1].text,'😀'+'b'.repeat(10));await saveRecord(page,'유니코드 위치');const record=JSON.parse(await raw(page)).records.at(-1);assert.equal(record.position.start,139);assert.equal(record.text.slice(record.position.start,record.position.end),record.position.text);await tts(page,'stop').click();await page.locator('#tts-text').fill('x'.repeat(30001));await reading(page,'name').fill('자르지 않는 초과 원고');const before=await raw(page);await reading(page,'save').click();await reading(page,'error','textTooLong').waitFor();assert.equal(await raw(page),before);assert.equal((await page.locator('#tts-text').inputValue()).length,30001);const eight=readingEnvelope(Array.from({length:8},(_,i)=>readingRecord({id:`record-${i}`,name:`저장 ${i}`})));await page.evaluate(({key,value})=>window.__nativeStoreSet(key,value),{key:READING_KEY,value:JSON.stringify(eight)});await reading(page,'refresh').click();assert.equal(await reading(page,'record').count(),8);assert.equal(await reading(page,'save').isDisabled(),true);assert.equal(await reading(page,'name').getAttribute('maxlength'),'40');return {mismatchedPositionStartsFirstNoAutoplay:true,surrogatePairIntact:true,offsetsExact:true,over30000NotTruncatedOrWritten:true,maxEightNoEviction:true,nameMaxLength40:true}
})

test('reading-late-paste-link-and-failure-bookmark',async args=>{
 const {page}=args;await setupTts(args);await tts(page,'paste').click();await poll(()=>page.evaluate(()=>window.__pastePending.length===1),'paste pending');await loadRecord(page);await page.evaluate(()=>window.__pastePending.shift().resolve('옛 붙여넣기 원고'));assert.equal(await page.locator('#tts-text').inputValue(),sourceText);await page.evaluate(()=>window.__linkMode='hold');await tts(page,'copy-link').click();await page.locator('#tts-text').fill('새 링크 원고');await page.evaluate(()=>window.__linkPending.shift().reject(new Error('old failure')));await page.locator('#tts-text').fill(sourceText);await tts(page,'play').click();await expectSpeaks(page,1);await emit(page,0,'end');await expectSpeaks(page,2);await emit(page,1,'error','network');await tts(page,'retry').waitFor();await saveRecord(page,'오류 문장 저장');const record=JSON.parse(await raw(page)).records.at(-1);assert.deepEqual(record.position,readingRecord().position);await tts(page,'retry').click();await expectSpeaks(page,3);assert.equal((await speeches(page))[2].text,readingRecord().position.text);await emit(page,1,'end');assert.equal((await speeches(page)).length,3);await page.evaluate(()=>window.__linkMode='native');await tts(page,'copy-link').click();const url=await page.evaluate(()=>window.__linkWrites.at(-1));assert.equal(new URL(url).searchParams.get('t'),sourceText);return {lateClipboardReadDidNotReplaceLoad:true,lateLinkFailureNoRevival:true,failureSentenceBookmarkExact:true,explicitRetryExactSentence:true,oldEndIgnored:true,nativeLinkPayloadCurrent:true,osSynthesisTested:false}
})

test('reading-320-dark-ko-en',async args=>{
 const {page}=args;await setupTts(args);await loadRecord(page);const checks={};for(const language of ['ko','en']){if(language==='en')await changeLanguage(page,'en');await reading(page,'name').fill('짧은 합성 저장 이름');checks[language]=await mobile(page,[page.locator('#tts-text'),reading(page,'name')],[tts(page,'play'),reading(page,'save'),reading(page,'refresh')]);await reading(page,'load','fixture-saved').focus();await page.keyboard.press('Enter');await reading(page,'confirm','load').waitFor();await screenshot(page,`reading-list-320-${language}`,reading(page,'list'));await reading(page,'cancel').click();assert.equal(await page.locator('#tts-text').inputValue(),sourceText)}return {geometry:checks,keyboardConfirmation:true,localePreservesDraft:true,fields16Buttons44:true}
},{width:320,dark:true,touch:true})

const planned=cases.map(item=>item.name)
if(only==='--list')console.log(planned.join('\n'))
else {const selected=cases.filter(item=>!only||only.split(',').some(part=>item.name.includes(part)));assert.ok(selected.length);mkdirSync(out,{recursive:true});const browser=await chromium.launch({channel:'chrome'});try{for(const scenario of selected)await run(browser,scenario)}finally{await browser.close();const merged=readdirSync(out).filter(name=>name.endsWith('-evidence.json')).map(name=>JSON.parse(readFileSync(resolve(out,name),'utf8')));const final={checkedAt:new Date().toISOString(),passed:merged.filter(item=>item.status==='pass').length,failed:merged.filter(item=>item.status==='fail').length,browserClosed:true,results:merged};writeFileSync(resolve(out,'final-results.json'),JSON.stringify(final,null,2));console.log(JSON.stringify({passed:final.passed,failed:final.failed,browserClosed:true}))}if(results.some(item=>item.status!=='pass'))process.exitCode=1}
