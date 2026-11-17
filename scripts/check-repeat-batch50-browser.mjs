import { chromium } from 'playwright'
import assert from 'node:assert/strict'
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import {installSpeakingPorts,inspectAudioBytes} from '../docs/verify/2026-11-17-repeat-batch50/browser-fixtures.mjs'




// Independent real-browser checks. --list never starts Chrome; case-name filters
// preserve previous evidence so only changed boundaries need to be rerun.
const base = process.env.VERIFY_BASE_URL || 'http://127.0.0.1:3039'
const out = resolve('docs/verify/2026-11-17-repeat-batch50/browser')
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
    if (!localStorage.getItem('__batch50Seeded')) { localStorage.setItem('language', options.language ?? 'ko'); localStorage.setItem('theme', options.dark ? 'dark' : 'light'); localStorage.setItem('__batch50Seeded', '1') }
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
  try { detail = await fn({ page, context, open, network, logs }) ?? {}; assert.deepEqual(errors, [], 'JS page errors'); assert.deepEqual(hydration, [], 'Hydration errors'); assert.deepEqual(consoleErrors.filter(value=>/ErrorBoundary|NotFoundError|The above error occurred/i.test(value)),[],'React caught runtime errors'); for (const active of context.pages()) assert.deepEqual(await active.evaluate(() => window.__unhandled), [], 'Unhandled rejections'); assert.ok(!/\b(?:speakingPractice|shareResult)\.[a-zA-Z][\w.]+/.test(await page.locator('body').innerText()), 'Raw translation key') }
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



const sp=(page,name,value)=>page.locator(`[data-speaking-${name}${value===undefined?'':`="${value}"`}]`)
const recordButton=page=>sp(page,'record','')
const speechButton=(page,key,language='ko')=>page.getByRole('button',{name:tr('speakingPractice',key,language),exact:true})
async function setupSpeaking(args){await installSpeakingPorts(args.context);await args.open('speaking-practice');await sp(args.page,'recorder-phase','idle').waitFor()}
async function phase(page,value){await sp(page,'recorder-phase',value).waitFor()}
async function completeNativeTake(page,delay=0){await sp(page,'preparation',String(delay)).click();await recordButton(page).click();await phase(page,'recording');await wait(750);await recordButton(page).click();await phase(page,'idle');await sp(page,'take').last().waitFor()}
async function audioInfo(page){const audio=sp(page,'audio').first();await audio.waitFor();return audio.evaluate(async element=>{element.muted=true;element.volume=0;await element.play();await new Promise(resolve=>setTimeout(resolve,120));const result={muted:element.muted,time:element.currentTime,readyState:element.readyState};element.pause();return result})}
async function nativeAudioDownload(page,name){return download(page,()=>speechButton(page,'exportAudio').click(),name)}
async function requestSummaries(page){return page.evaluate(()=>window.__micRequests.map(item=>({approvedAt:item.approvedAt,requestedAt:item.requestedAt,trackStops:item.trackStops,trackStates:item.stream?.getTracks().map(track=>track.readyState),contextState:item.context?.state})))}
async function dbRecords(page){return page.evaluate(()=>new Promise((resolve,reject)=>{const request=indexedDB.open('toolhub-speaking-practice',1);request.onerror=()=>reject(request.error);request.onsuccess=()=>{const db=request.result,tx=db.transaction('sessions','readonly'),get=tx.objectStore('sessions').getAll();get.onsuccess=()=>{const values=get.result;window.__savedSpeakingRecords=values;resolve(values.map(item=>({id:item.id,title:item.title,takes:item.takes?.map(take=>({seconds:take.seconds,size:take.audio?.size,type:take.audio?.type,transcript:take.transcript})),keys:Object.keys(item)})))};tx.oncomplete=()=>db.close()}}))}

test('speaking-zero-native-blob-idb-revisit',async args=>{
 const {page}=args;await setupSpeaking(args);assert.equal(await sp(page,'preparation','0').getAttribute('aria-pressed'),'true');await completeNativeTake(page);assert.equal(await page.evaluate(()=>window.__recorders[0].timeslice),250);const file=await nativeAudioDownload(page,'speaking-zero-native.webm');assert.ok(file.bytes.length>100);const decoded=await inspectAudioBytes(page,file.bytes);assert.ok(decoded.duration>.5&&decoded.duration<2.5,JSON.stringify(decoded));assert.ok(decoded.rms>0.001);const playback=await audioInfo(page);assert.ok(playback.time>0);assert.equal(playback.muted,true);await page.locator('#speaking-session-title').fill('합성 음원 검증');await page.locator('#speaking-transcript').fill('사람 음성이 아닌 합성 음원의 기록 보존 검사입니다.');await sp(page,'save').click();await sp(page,'record-title').getByText('합성 음원 검증',{exact:true}).waitFor();const saved=await dbRecords(page);assert.equal(saved.length,1);assert.equal(saved[0].takes[0].size,file.bytes.length);assert.ok(saved[0].takes[0].seconds>=.5&&saved[0].takes[0].seconds<2.5);assert.ok(!saved[0].keys.some(key=>/preparation|countdown/i.test(key)));await args.open('speaking-practice');await phase(page,'idle');assert.equal(await sp(page,'preparation','0').getAttribute('aria-pressed'),'true');await sp(page,'history').getByRole('button',{name:tr('speakingPractice','open'),exact:true}).click();const again=await nativeAudioDownload(page,'speaking-reopened.webm');assert.deepEqual(again.bytes,file.bytes);return {nativeMediaRecorder:true,syntheticMicrophoneOnly:true,nativeAudioBytes:file.bytes.length,decoded,mutedPlayback:playback,idbBlobExact:true,preparationNotPersisted:true}
})

test('speaking-three-after-permission-native-deadline',async args=>{
 const {page}=args;await setupSpeaking(args);await sp(page,'preparation','3').click();await page.evaluate(()=>window.__micMode='hold');await recordButton(page).click();await phase(page,'requesting');await wait(700);assert.equal(await page.evaluate(()=>window.__recorders.length),0);await page.evaluate(()=>window.__micRequests[0].resolve());await phase(page,'preparing');assert.equal(await sp(page,'countdown').getAttribute('data-speaking-countdown'),'3');assert.equal(await page.getByRole('timer').innerText(),'00:00');assert.equal(await page.evaluate(()=>window.__recorders.length),0);assert.equal(await page.evaluate(()=>window.__productAudio.length),0);for(const control of [sp(page,'mode','report'),sp(page,'file'),sp(page,'text-take'),page.locator('#speaking-session-title'),sp(page,'preparation','0')])assert.equal(await control.isDisabled(),true);await phase(page,'recording');const timing=await page.evaluate(()=>({permissionWait:window.__micRequests[0].approvedAt-window.__micRequests[0].requestedAt,preparation:window.__recorders[0].startedAt-window.__micRequests[0].approvedAt,starts:window.__recorders[0].starts}));assert.ok(timing.permissionWait>=650);assert.ok(timing.preparation>=2900&&timing.preparation<4500,JSON.stringify(timing));assert.equal(timing.starts,1);await wait(700);await recordButton(page).click();await phase(page,'idle');const file=await nativeAudioDownload(page,'speaking-after-three.webm'),decoded=await inspectAudioBytes(page,file.bytes);assert.ok(decoded.duration<2.5&&decoded.duration>.5);return {permissionWaitExcluded:true,nativeThreeSecondCountdown:timing,preparingRecorderAndProductAudioContexts:0,parentLocked:true,recordedDurationExcludesPreparation:decoded.duration}
})

test('speaking-five-cancel-hidden-pagehide',async args=>{
 const {page}=args;await setupSpeaking(args);await sp(page,'preparation','5').click();await recordButton(page).click();await phase(page,'preparing');await sp(page,'countdown','5').waitFor();await sp(page,'record-cancel').click();await phase(page,'idle');assert.equal(await page.evaluate(()=>window.__recorders.length),0);await recordButton(page).click();await phase(page,'preparing');await page.evaluate(()=>{window.__visibility='hidden';document.dispatchEvent(new Event('visibilitychange'))});await phase(page,'idle');await page.evaluate(()=>{window.__visibility='visible';document.dispatchEvent(new Event('visibilitychange'));window.__clockOffset+=6000;for(const item of window.__speakingIntervals)item.callback()});assert.equal(await page.evaluate(()=>window.__recorders.length),0);await recordButton(page).click();await phase(page,'preparing');await page.evaluate(()=>window.dispatchEvent(new PageTransitionEvent('pagehide')));await phase(page,'idle');await poll(()=>page.evaluate(()=>window.__micRequests.every(item=>item.stream.getTracks().every(track=>track.readyState==='ended'))),'all synthetic tracks stopped');assert.equal(await sp(page,'take').count(),0);return {fiveShown:true,cancelCreatesNoRecorderOrTake:true,controlledVisibilityAndPagehide:true,resumeOldIntervalsCannotStart:true,resources:await requestSummaries(page)}
})

test('speaking-old-recorder-and-stop-receipt',async args=>{
 const {page}=args;await setupSpeaking(args);await recordButton(page).click();await phase(page,'recording');await wait(750);await page.evaluate(()=>window.__holdRecorderStop=true);await recordButton(page).click();await phase(page,'stopping');await poll(()=>page.evaluate(()=>!!window.__recorders[0].releaseStop),'native stop received but held');assert.equal(await recordButton(page).isDisabled(),true);await page.evaluate(()=>{window.__clockOffset+=30000;window.__holdRecorderStop=false;window.__recorders[0].releaseStop()});await phase(page,'idle');assert.equal(await sp(page,'take').count(),1);const first=await nativeAudioDownload(page,'speaking-stop-receipt.webm'),decoded=await inspectAudioBytes(page,first.bytes);await recordButton(page).click();await phase(page,'recording');await page.evaluate(()=>{const old=window.__recorders[0];old.savedStop({});old.savedError(new Event('error'));old.savedData({data:new Blob(['old fake data'])})});await phase(page,'recording');assert.equal(await sp(page,'take').count(),1);assert.equal(await page.evaluate(()=>window.__micRequests[1].stream.getAudioTracks()[0].readyState),'live');assert.equal(await page.evaluate(()=>window.__productAudio[1].state),'running');await wait(750);await recordButton(page).click();await phase(page,'idle');assert.equal(await sp(page,'take').count(),2);await sp(page,'save').click();await poll(async()=>(await dbRecords(page)).length===1,'two takes saved');const saved=await dbRecords(page);assert.ok(saved[0].takes[0].seconds<2.5);assert.ok(saved[0].takes[1].seconds<2.5);assert.ok(decoded.duration<2.5);return {nativeStopCallbackHeld:true,extraReceiptDelayMs:30000,storedElapsedExcludesReceiptDelay:true,oldDataStopErrorCalls:3,currentStreamContextPreserved:true,completedTakesExactly:2,decodedDuration:decoded.duration}
})

test('speaking-clock-jump-once-and-late-permission',async args=>{
 const {page}=args;await setupSpeaking(args);await sp(page,'preparation','5').click();await page.evaluate(()=>window.__micMode='hold');await recordButton(page).click();await phase(page,'requesting');await sp(page,'record-cancel').click();await sp(page,'preparation','0').click();await recordButton(page).click();await phase(page,'requesting');await page.evaluate(()=>window.__micRequests[1].resolve());await phase(page,'recording');await page.evaluate(()=>window.__micRequests[0].resolve());await poll(()=>page.evaluate(()=>window.__micRequests[0].stream?.getAudioTracks()[0].readyState==='ended'),'late permission old stream closed');assert.equal(await page.evaluate(()=>window.__micRequests[1].stream.getAudioTracks()[0].readyState),'live');await wait(700);await recordButton(page).click();await phase(page,'idle');await page.evaluate(()=>window.__micMode='native-synthetic');await sp(page,'preparation','5').click();await recordButton(page).click();await phase(page,'preparing');await page.evaluate(()=>{window.__clockOffset+=5200;window.__speakingIntervals.at(-1).callback();window.__speakingIntervals.at(-1).callback()});await phase(page,'recording');assert.equal(await page.evaluate(()=>window.__recorders.length),2);assert.equal(await page.evaluate(()=>window.__recorders[1].starts),1);assert.equal(await page.getByRole('timer').innerText(),'00:00');await wait(700);await recordButton(page).click();await phase(page,'idle');return {controlledMonotonicJump:true,deadlineStartOnce:true,recordingClockStartsAfterPreparation:true,latePermissionClosesOnlyOwnStream:true,duplicateRecorders:0}
})

test('speaking-rerecord-five-limit-and-memory',async args=>{
 const {page}=args;await setupSpeaking(args);await completeNativeTake(page);await sp(page,'preparation','3').click();await sp(page,'rerecord').click();await phase(page,'preparing');assert.equal(await sp(page,'countdown').getAttribute('data-speaking-countdown'),'3');await sp(page,'record-cancel').click();await phase(page,'idle');assert.equal(await sp(page,'take').count(),1);for(let n=1;n<5;n++)await sp(page,'text-take').click();assert.equal(await sp(page,'take').count(),5);assert.equal(await recordButton(page).isDisabled(),true);assert.equal(await sp(page,'rerecord').isDisabled(),true);assert.equal(await sp(page,'text-take').isDisabled(),true);await page.locator('#speaking-transcript').fill('기본 점검과 TXT의 합성 문장입니다.');const file=await download(page,()=>speechButton(page,'exportText').click(),'speaking-five-takes.txt');assert.ok(file.text.includes('기본 점검과 TXT'));await sp(page,'preparation','5').click();await args.open('speaking-practice');await phase(page,'idle');assert.equal(await sp(page,'preparation','0').getAttribute('aria-pressed'),'true');assert.equal(await sp(page,'take').count(),0);return {resultRerecordUsesSelectedCountdown:true,cancelPreservesPreviousTake:true,maxFiveStillBlocks:true,textPracticeTxtPreserved:true,unsavedPreparationMemoryOnly:true}
})

test('speaking-permission-error-and-spa-dispose',async args=>{
 const {page}=args;await setupSpeaking(args);await page.evaluate(()=>window.__micMode='reject');await recordButton(page).click();await page.getByText(tr('speakingPractice','errors.microphoneDenied'),{exact:true}).waitFor();await phase(page,'idle');assert.equal(await page.evaluate(()=>window.__recorders.length),0);await page.evaluate(()=>window.__micMode='native-synthetic');await sp(page,'preparation','5').click();await recordButton(page).click();await phase(page,'preparing');await page.locator('header a[href="/"]').first().click();await sp(page,'recorder-phase').waitFor({state:'detached'});await poll(()=>page.evaluate(()=>window.__micRequests.at(-1).stream.getAudioTracks()[0].readyState==='ended'),'unmount own stream ended');await page.evaluate(()=>{window.__clockOffset+=9000;for(const item of window.__speakingIntervals)item.callback()});assert.equal(await page.evaluate(()=>window.__recorders.length),0);return {deniedPermissionExplicitError:true,spaUnmountBeforeDeadlineStopsTracks:true,oldIntervalsNoRecorder:true,personalMicrophoneCalls:0}
})

test('speaking-320-dark-ko-en',async args=>{
 const {page,network}=args;await setupSpeaking(args);const checks={};for(const language of ['ko','en']){if(language==='en')await changeLanguage(page,'en');await sp(page,'preparation','5').focus();await page.keyboard.press('Enter');assert.equal(await sp(page,'preparation','5').getAttribute('aria-pressed'),'true');await recordButton(page).click();await phase(page,'preparing');checks[language]=await mobile(page,[page.locator('#speaking-session-title')],[sp(page,'preparation','0'),sp(page,'preparation','3'),sp(page,'preparation','5'),sp(page,'record-cancel')]);await screenshot(page,`speaking-countdown-320-${language}`,sp(page,'recorder-phase'));await sp(page,'record-cancel').click();await phase(page,'idle')}assert.equal(network.filter(url=>/huggingface|\.onnx|\.gguf|model.*\.bin/.test(url)).length,0);return {geometry:checks,keyboardSelection:true,modelDownloads:0,mutedSyntheticOnly:true}
},{width:320,dark:true,touch:true})

const planned=cases.map(item=>item.name)
if(only==='--list')console.log(planned.join('\n'))
else {const selected=cases.filter(item=>!only||only.split(',').some(part=>item.name.includes(part)));assert.ok(selected.length);mkdirSync(out,{recursive:true});const browser=await chromium.launch({channel:'chrome'});try{for(const scenario of selected)await run(browser,scenario)}finally{await browser.close();const merged=readdirSync(out).filter(name=>name.endsWith('-evidence.json')).map(name=>JSON.parse(readFileSync(resolve(out,name),'utf8')));const final={checkedAt:new Date().toISOString(),passed:merged.filter(item=>item.status==='pass').length,failed:merged.filter(item=>item.status==='fail').length,browserClosed:true,results:merged};writeFileSync(resolve(out,'final-results.json'),JSON.stringify(final,null,2));console.log(JSON.stringify({passed:final.passed,failed:final.failed,browserClosed:true}))}if(results.some(item=>item.status!=='pass'))process.exitCode=1}
