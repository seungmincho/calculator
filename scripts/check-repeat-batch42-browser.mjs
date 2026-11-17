import { chromium } from 'playwright'
import assert from 'node:assert/strict'
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import {WORDLE_DAILY_KEY as DAILY,WORDLE_SETTINGS_KEY as SETTINGS,fixtureDay,historicalRecords,legalWrongWord,fixtureWordKeys,fixtureAnswer,installWordleClock,installWordleTimers,mockWordleRpc,nativeKeysForWord} from '../docs/verify/2026-11-17-repeat-batch42/browser-fixtures.mjs'
import {installStoragePorts,holdNativeLock,releaseNativeLock} from '../docs/verify/2026-11-17-repeat-batch41/browser-fixtures.mjs'




// Independent real-browser checks. --list never starts Chrome; case-name filters
// preserve previous evidence so only changed boundaries need to be rerun.
const base = process.env.VERIFY_BASE_URL || 'http://127.0.0.1:3039'
const out = resolve('docs/verify/2026-11-17-repeat-batch42/browser')
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
    if (!localStorage.getItem('__batch42Seeded')) { localStorage.setItem('language', options.language ?? 'ko'); localStorage.setItem('theme', options.dark ? 'dark' : 'light'); localStorage.setItem('__batch42Seeded', '1') }
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
  try { detail = await fn({ page, context, open, network, logs }) ?? {}; assert.deepEqual(errors, [], 'JS page errors'); assert.deepEqual(hydration, [], 'Hydration errors'); assert.deepEqual(consoleErrors.filter(value=>/ErrorBoundary|NotFoundError|The above error occurred/i.test(value)),[],'React caught runtime errors'); for (const active of context.pages()) assert.deepEqual(await active.evaluate(() => window.__unhandled), [], 'Unhandled rejections'); assert.ok(!/\b(?:koreanWordle|shareResult)\.[a-zA-Z][\w.]+/.test(await page.locator('body').innerText()), 'Raw translation key') }
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



const action=(page,id)=>page.locator(`[data-wordle-${id}]`)
const board=page=>page.locator('[data-wordle-mode]')
const stats=page=>page.getByRole('dialog',{name:tr('koreanWordle','statistics'),exact:true})
async function setup(args,records=historicalRecords(2),extra={}){await installWordleClock(args.context);await installWordleTimers(args.context);await observeDecisionPorts(args.context);await installStoragePorts(args.context,{[DAILY]:typeof records==='string'?records:JSON.stringify(records),[SETTINGS]:JSON.stringify({hard:false,contrast:false}),...extra},'wordle');const rpc=await mockWordleRpc(args.context);await args.open('korean-wordle');await board(args.page).locator('[data-wordle-storage]').waitFor();await args.page.keyboard.press('Escape');return rpc}
async function word(page,text,physical=false){if(physical){await page.locator('h1').click();for(const key of nativeKeysForWord(text))await page.keyboard.press(key)}else for(const key of fixtureWordKeys(text))await page.locator(`[data-wordle-key="${key}"]`).click()}
async function submit(page,text,physical=false){await word(page,text,physical);await page.locator('[data-wordle-key="Enter"]').click()}
async function settled(page){await page.locator('[data-wordle-revealing="false"]').waitFor()}
async function readDaily(page){return page.evaluate(key=>JSON.parse(window.__nativeStoreGet(key)),DAILY)}
async function reloadDaily(page){await action(page,'reload').click();await action(page,'confirm-reload').click();await settled(page)}
async function freshTab(args){const page=await args.context.newPage();await args.open('korean-wordle','',page);await action(page,'storage').waitFor();await page.keyboard.press('Escape');return page}
async function openHistory(page,day=fixtureDay-1){await action(page,'stats').click();await stats(page).waitFor();await page.locator(`[data-wordle-history-expand="${day}"]`).click()}
const historyCopy=(page,day=fixtureDay-1)=>page.locator(`[data-wordle-history-copy="${day}"]`)
const currentCopy=page=>page.locator('[data-wordle-copy="current"]:visible').first()
const shareCopy=page=>page.locator('[data-wordle-share-boundary] [data-share-action="copy"]')
async function copied(page,button){await poll(async()=>await button.innerText()===tr('koreanWordle','shared'),'Wordle native copied feedback')}

test('wordle-legacy-recent30-and-statistics',async args=>{
 const {page}=args;const records={...historicalRecords(35),[fixtureDay]:{guesses:[legalWrongWord()],hard:false}};await setup(args,records,{koreanWordle_stats_2:JSON.stringify({gamesPlayed:3,gamesWon:2,guessDistribution:[2,0,0,0,0,0]}),koreanWordle_stats:JSON.stringify({gamesPlayed:100,gamesWon:100})});await action(page,'stats').click();await stats(page).waitFor();assert.equal(await page.locator('[data-wordle-history-day]').count(),30);assert.equal(await stats(page).getByText(tr('koreanWordle','played'),{exact:true}).locator('..').innerText(),'38\n'+tr('koreanWordle','played'));assert.equal(await page.locator(`[data-wordle-history-expand="${fixtureDay}"]`).count(),0);await page.locator(`[data-wordle-history-expand="${fixtureDay-1}"]`).click();const grid=await page.locator(`[data-wordle-history-grid="${fixtureDay-1}"]`).innerText();assert.ok(grid.includes(`#${fixtureDay-1} 1/6`));assert.ok(!grid.includes(fixtureAnswer(fixtureDay-1)));assert.equal(await page.evaluate(keys=>window.__storeLog.filter(item=>keys.includes(item.key)).length,[DAILY,SETTINGS,'koreanWordle_stats_2','koreanWordle_stats']),0);assert.equal(Object.keys(await readDaily(page)).length,36);const achievements=await page.evaluate(()=>window.__nativeStoreGet('game_achievements'));await page.reload();await action(page,'storage').waitFor();assert.equal(await page.evaluate(()=>window.__nativeStoreGet('game_achievements')),achievements);return {recentRows:30,storedDays:36,completedDays:35,firstLegacyOnlyPlayed:38,spoilerFreeGrid:true,initialRecordWrites:0,revisitNoAchievementReplay:true}
})
test('wordle-damaged-storage-and-practice',async args=>{
 const {page}=args;await setup(args,'null',{[SETTINGS]:'{bad',koreanWordle_stats_2:'null'});await action(page,'daily-error').waitFor();await action(page,'settings-error').waitFor();await action(page,'legacy-error').waitFor();await submit(page,legalWrongWord());await settled(page);assert.equal(await page.evaluate(key=>window.__nativeStoreGet(key),DAILY),'null');await page.locator('[data-wordle-switch="practice"]').click();await submit(page,legalWrongWord());await settled(page);assert.equal(await board(page).getAttribute('data-wordle-mode'),'practice');const future=JSON.stringify({[fixtureDay+1]:{guesses:[],hard:false}});await page.evaluate(({key,raw})=>window.__nativeStoreSet(key,raw),{key:DAILY,raw:future});await reloadDaily(page);await page.locator('[data-wordle-daily-error="unsupported"]').waitFor();assert.equal(await page.evaluate(key=>window.__nativeStoreGet(key),DAILY),future);assert.equal(await page.evaluate(key=>window.__storeLog.filter(item=>item.key===key).length,DAILY),0);return {nullAndFutureOriginalPreserved:true,dailyWrites:0,settingsAndLegacyWarningsIndependent:true,practiceAvailable:true}
})
test('wordle-native-two-tabs-append-conflict',async args=>{
 const {page}=args;await setup(args);const other=await freshTab(args),holder=await freshTab(args);await holdNativeLock(holder,DAILY);await submit(page,legalWrongWord());await submit(other,legalWrongWord());await releaseNativeLock(holder,DAILY);await poll(async()=>!!(await readDaily(page))[fixtureDay],'First concurrent append');assert.deepEqual((await readDaily(page))[fixtureDay].guesses,[legalWrongWord()]);await settled(page);await settled(other);await reloadDaily(page);await reloadDaily(other);await holdNativeLock(holder,DAILY);await submit(page,legalWrongWord(fixtureDay,1));await submit(other,legalWrongWord(fixtureDay,2));await releaseNativeLock(holder,DAILY);await poll(async()=>(await readDaily(page))[fixtureDay]?.guesses.length===2,'Branch conflict winner');const stored=await readDaily(page);assert.equal(Object.keys(stored).length,3);assert.equal(stored[fixtureDay].guesses[0],legalWrongWord());assert.ok([legalWrongWord(fixtureDay,1),legalWrongWord(fixtureDay,2)].includes(stored[fixtureDay].guesses[1]));await settled(page);await settled(other);assert.ok((await page.locator('[data-wordle-daily-error="conflict"]').count())+(await other.locator('[data-wordle-daily-error="conflict"]').count())>=1);await reloadDaily(other);assert.ok((await other.locator('[data-wordle-row="1"]').innerText()).includes(stored[fixtureDay].guesses[1][0]));return {actualWebLocksAndStorageEvents:true,sameGuessStoredOnce:true,branchOverwriteOrConcat:0,pastDaysPreserved:2,explicitReloadChangesView:true}
})
test('wordle-native-lock-and-save-failures',async args=>{
 const {page}=args;await setup(args);const baseline=await page.evaluate(key=>window.__nativeStoreGet(key),DAILY);await page.evaluate(key=>window.__storeModes[key]='quota',DAILY);await submit(page,legalWrongWord());await page.locator('[data-wordle-daily-error="quota"]').waitFor();assert.equal(await page.evaluate(key=>window.__nativeStoreGet(key),DAILY),baseline);await settled(page);assert.ok((await page.locator('[data-wordle-row="0"]').innerText()).includes(legalWrongWord()[0]));await page.evaluate(key=>delete window.__storeModes[key],DAILY);await reloadDaily(page);await page.evaluate(key=>window.__storeModes[key]='readback-once',DAILY);await submit(page,legalWrongWord());await page.locator('[data-wordle-daily-error="writeUnknown"]').waitFor();assert.deepEqual((await readDaily(page))[fixtureDay].guesses,[legalWrongWord()]);await page.evaluate(key=>delete window.__storeModes[key],DAILY);await reloadDaily(page);const holder=await freshTab(args);await holdNativeLock(holder,DAILY);await submit(page,legalWrongWord(fixtureDay,1));await action(page,'save').waitFor();await page.locator('[data-wordle-switch="practice"]').click();await releaseNativeLock(holder,DAILY);await poll(async()=>(await readDaily(page))[fixtureDay]?.guesses.length===2,'Old accepted daily round saved');assert.equal(await board(page).getAttribute('data-wordle-mode'),'practice');assert.equal(await board(page).getAttribute('data-wordle-revealing'),'false');await page.locator('[data-wordle-switch="daily"]').click();await holdNativeLock(holder,DAILY);await submit(page,legalWrongWord(fixtureDay,2));await reloadDaily(page);await releaseNativeLock(holder,DAILY);await wait(100);assert.equal((await readDaily(page))[fixtureDay].guesses.length,2);return {quotaKeepsRawAndMemory:true,unknownWriteNoRollback:true,explicitReloadConfirmsStoredGuess:true,lateAcceptedDailySaveDoesNotChangePractice:true,explicitReloadCancelsQueuedAppend:true}
})
test('wordle-reveal-new-round-and-midnight',async args=>{
 const {page}=args;await setup(args);await page.evaluate(()=>window.__wordleHoldReveal=true);await submit(page,fixtureAnswer(fixtureDay));await page.locator('[data-wordle-key="Enter"]').click();await poll(async()=>page.evaluate(()=>JSON.parse(window.__nativeStoreGet('game_achievements')??'{}').totalGames===1),'Synchronous completion once');await page.locator('[data-wordle-switch="practice"]').click();await page.evaluate(()=>{for(const timer of window.__wordleTimers.filter(item=>item.delay===750))timer.callback()});assert.equal(await page.getByRole('dialog').count(),0);assert.equal(await board(page).getAttribute('data-wordle-mode'),'practice');assert.equal(await board(page).getAttribute('data-wordle-status'),'playing');assert.equal(await board(page).getAttribute('data-wordle-revealing'),'false');await page.evaluate(()=>window.__wordleTime+=86400000);await poll(async()=>await board(page).getAttribute('data-wordle-day')===String(fixtureDay+1),'Native interval observes controlled KST next day');await page.locator('[data-wordle-switch="daily"]').click();assert.equal(await board(page).getAttribute('data-wordle-status'),'playing');await page.reload();await action(page,'storage').waitFor();assert.equal(await page.evaluate(()=>JSON.parse(window.__nativeStoreGet('game_achievements')).totalGames),1);return {synchronousCompletionOnce:true,duplicateEnterCompletion:0,oldRevealCallbacksAfterPractice:0,controlledKstBoundary:true,nativeIntervalClockObservation:true,revisitCompletionReplay:0}
})
test('wordle-current-history-shared-copy',async args=>{
 const {page}=args;await setup(args,{...historicalRecords(2),[fixtureDay]:{guesses:[fixtureAnswer(fixtureDay)],hard:false}});await currentCopy(page).click();await copied(page,currentCopy(page));const native=await page.evaluate(()=>window.__nativeClipboardRead());assert.ok(native.includes(`#${fixtureDay} 1/6`));assert.ok(!native.includes(fixtureAnswer(fixtureDay)));await page.evaluate(()=>window.__setClipboardMode('absent'));await currentCopy(page).click();await action(page,'copy-manual').waitFor();const manual=action(page,'copy-manual');assert.equal((await manual.inputValue()).replace(/\r\n/g,'\n'),native.replace(/\r\n/g,'\n'));await action(page,'copy-select').click();assert.deepEqual(await manual.evaluate(el=>[el.selectionStart,el.selectionEnd]),[0,(await manual.inputValue()).length]);await page.evaluate(()=>window.__setClipboardMode('native'));await action(page,'copy-retry').click();await copied(page,currentCopy(page));for(const direction of ['currentToShare','shareToCurrent']){await page.evaluate(()=>window.__setClipboardMode('hold'));await (direction==='currentToShare'?currentCopy(page):shareCopy(page)).click();await page.evaluate(()=>window.__setClipboardMode('native'));await (direction==='currentToShare'?shareCopy(page):currentCopy(page)).click();const before=await page.evaluate(()=>window.__legacyCalls.length);await page.evaluate(()=>window.__clipboardPending.at(-1).reject(new Error('Synthetic stale rejection')));await wait(50);assert.equal(await page.evaluate(()=>window.__legacyCalls.length),before)}await openHistory(page);await page.evaluate(()=>window.__setClipboardMode('native'));await historyCopy(page).click();await copied(page,historyCopy(page));const past=await page.evaluate(()=>window.__nativeClipboardRead());assert.ok(past.includes(`#${fixtureDay-1} 1/6`));assert.ok(!past.includes(fixtureAnswer(fixtureDay-1)));await page.evaluate(()=>window.__setClipboardMode('hold'));await historyCopy(page).click();await page.locator(`[data-wordle-history-expand="${fixtureDay-2}"]`).click();await page.locator(`[data-wordle-history-expand="${fixtureDay-1}"]`).click();await page.evaluate(()=>window.__clipboardPending.at(-1).resolve());assert.notEqual(await historyCopy(page).innerText(),tr('koreanWordle','shared'));await page.keyboard.press('Escape');await page.evaluate(()=>window.__setClipboardMode('hold'));await currentCopy(page).click();await page.locator('[data-wordle-setting="contrast"]').click();await page.locator('[data-wordle-setting="contrast"]').click();await changeLanguage(page,'en');await changeLanguage(page,'ko');await page.evaluate(()=>window.__clipboardPending.at(-1).resolve());assert.notEqual(await currentCopy(page).innerText(),tr('koreanWordle','shared'));return {nativeCurrentAndPastClipboard:true,spoilers:0,manualExactSelectionAndRetry:true,crossSharedFallback:0,historyDateAndContrastLocaleABA:true}
})
test('wordle-keyboard-modal-and-mocked-rpc',async args=>{
 const {page}=args;const rpc=await setup(args);await action(page,'help').click();await page.keyboard.press('r');assert.equal(await page.locator('[data-wordle-row="0"]').innerText(),'');await page.keyboard.press('Escape');await page.evaluate(()=>window.__wordleTime+=30000);await submit(page,fixtureAnswer(fixtureDay),true);await settled(page);const modal=page.getByRole('dialog').filter({has:page.locator('#name-input-modal-title')});await modal.waitFor();await modal.locator('input').fill('합성검증');await modal.getByRole('button',{name:tr('leaderboard','submit'),exact:true}).click();await poll(()=>rpc.filter(item=>item.name==='submit_leaderboard_score').length===1,'Mock score submission');const request=rpc.find(item=>item.name==='submit_leaderboard_score');assert.equal(request.body.p_player_name,'합성검증');assert.equal(request.body.p_score,1);assert.equal(await page.evaluate(()=>window.__nativeStoreGet('leaderboard_player_name')),'합성검증');return {actualQwertyKeyboardComposition:true,modalKeysDoNotReachBoard:true,mockedSubmitRequests:1,realPublicSubmitRequests:0,score:request.body.p_score,osImeNotClaimed:true}
})
test('wordle-320-dark-ko-en',async args=>{
 const {page}=args;await setup(args);await openHistory(page);await page.evaluate(()=>window.__setClipboardMode('absent'));await historyCopy(page).click();await action(page,'copy-manual').waitFor();const fields=[action(page,'copy-manual')],controls=[historyCopy(page),action(page,'copy-select'),action(page,'copy-retry'),action(page,'copy-close')];const ko=await mobile(page,fields,controls);await screenshot(page,'wordle-320-ko',action(page,'copy-recovery'));await page.keyboard.press('Escape');await changeLanguage(page,'en');await action(page,'stats').click();await page.getByRole('dialog',{name:tr('koreanWordle','statistics','en'),exact:true}).waitFor();if(await page.locator(`[data-wordle-history-expand="${fixtureDay-1}"]`).getAttribute('aria-expanded')!=='true')await page.locator(`[data-wordle-history-expand="${fixtureDay-1}"]`).click();await historyCopy(page).click();await action(page,'copy-manual').waitFor();const en=await mobile(page,fields,controls);await screenshot(page,'wordle-320-en',action(page,'copy-recovery'));assert.equal(Object.keys(await readDaily(page)).length,2);return {ko,en,field16:true,controls44:true,localePreservesRecords:true,reducedMotion:true}
},{width:320,dark:true,reducedMotion:'reduce'})

// Parent/canonical final ready is required before execution.
const planned = [
  "wordle-legacy-recent30-and-statistics",
  "wordle-damaged-storage-and-practice",
  "wordle-native-two-tabs-append-conflict",
  "wordle-native-lock-and-save-failures",
  "wordle-reveal-new-round-and-midnight",
  "wordle-current-history-shared-copy",
  "wordle-keyboard-modal-and-mocked-rpc",
  "wordle-320-dark-ko-en"
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

