import { chromium } from 'playwright'
import assert from 'node:assert/strict'
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { installTypingReviewPorts, composition, typingStorage, historyKey, dailyKey } from '../docs/verify/2026-11-17-repeat-batch54/browser-fixtures.mjs'




// Independent real-browser checks. --list never starts Chrome; case-name filters
// preserve previous evidence so only changed boundaries need to be rerun.
const base = process.env.VERIFY_BASE_URL || 'http://127.0.0.1:3039'
const out = resolve('docs/verify/2026-11-17-repeat-batch54/browser')
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
    if (!localStorage.getItem('__batch54Seeded')) { localStorage.setItem('language', options.language ?? 'ko'); localStorage.setItem('theme', options.dark ? 'dark' : 'light'); localStorage.setItem('__batch54Seeded', '1') }
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
  try { detail = await fn({ page, context, open, network, logs }) ?? {}; assert.deepEqual(errors, [], 'JS page errors'); assert.deepEqual(hydration, [], 'Hydration errors'); assert.deepEqual(consoleErrors.filter(value=>/ErrorBoundary|NotFoundError|The above error occurred/i.test(value)),[],'React caught runtime errors'); for (const active of context.pages()) assert.deepEqual(await active.evaluate(() => window.__unhandled), [], 'Unhandled rejections'); assert.ok(!/\b(?:typingTest|shareResult)\.[a-zA-Z][\w.]+/.test(await page.locator('body').innerText()), 'Raw translation key') }
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

const rv=(page,key)=>page.locator(`[data-typing-review${key?'-'+key:''}]`)
const custom=(page,key)=>page.locator(`[data-custom-${key}]`)
const mode=(page,value)=>page.locator(`[data-typing-mode="${value}"]`)
const activeTimers=page=>page.evaluate(()=>window.__typingIntervals.filter(item=>item.delay===200&&item.active).length)
async function setup(args,query=''){await installTypingReviewPorts(args.context);await args.open('typing-test',query);await mode(args.page,'custom').waitFor()}
async function customStart(page,text='alpha beta gamma',lang='en'){await mode(page,'custom').click();await custom(page,'draft').fill(text);await page.locator(`[data-custom-language="${lang}"]`).click();await custom(page,'apply').click();await custom(page,'input').waitFor()}
async function completeWithErrors(page,target,wrong){await custom(page,'input').fill(wrong);if(await custom(page,'input').isEnabled())await custom(page,'input').fill(target);await custom(page,'result').waitFor();await rv(page).waitFor()}
async function startFragment(page,index=0){await rv(page,'fragment').nth(index).locator('input').check();const text=await rv(page,'preview').textContent();await rv(page,'start').click();await poll(()=>rv(page,'input').evaluate(el=>document.activeElement===el),'explicit review focuses input');assert.equal(await rv(page,'target').textContent(),text);return text}
async function completeReview(page,text){await rv(page,'input').pressSequentially(text,{delay:3});await rv(page,'result').waitFor();assert.equal(await activeTimers(page),0)}


test('typing-review-native-english-corrected-error-and-isolation',async args=>{
 const {page}=args;await setup(args);await customStart(page);const before=await typingStorage(page);await custom(page,'input').pressSequentially('X',{delay:10});await page.keyboard.press('Backspace');await custom(page,'input').pressSequentially('alpha beta gamma',{delay:8});await custom(page,'result').waitFor();assert.equal(await rv(page,'fragment').count(),1);const originalResult=await custom(page,'result').innerText();const draft=await custom(page,'draft').inputValue();const target=await startFragment(page);assert.equal(target,'alpha');await completeReview(page,target);assert.deepEqual(await typingStorage(page),before);assert.equal(await custom(page,'result').innerText(),originalResult);assert.equal(await custom(page,'draft').inputValue(),draft);assert.equal(await custom(page,'target').textContent(),'alpha beta gamma');assert.ok(!/WPM/.test(await rv(page,'result').innerText()));await rv(page,'retry').click();assert.equal(await rv(page,'input').inputValue(),'');await rv(page,'close').click();assert.equal(await rv(page,'attempt').count(),0);assert.deepEqual(await typingStorage(page),before);return {nativeEnglishKeys:true,correctedErrorStillCandidate:'alpha',originalResultDraftTargetUnchanged:true,reviewStorageWrites:0,reviewSpeedRanking:false}
})

test('typing-review-whitespace-repeated-tokens-and-pages',async args=>{
 const {page}=args;await setup(args);await customStart(page,'one two one three');await completeWithErrors(page,'one two one three','oneXtwo');assert.equal(await rv(page,'fragment').count(),1);assert.equal(await startFragment(page),'one two');await rv(page,'close').click();const words=Array.from({length:25},()=> 'aa'),target=words.join(' ');await customStart(page,target);await completeWithErrors(page,target,words.map(()=> 'Xa').join(' '));assert.equal(await rv(page,'fragment').count(),20);const firstIds=await rv(page,'fragment').evaluateAll(nodes=>nodes.map(node=>node.dataset.typingReviewFragment));await rv(page,'next').click();assert.equal(await rv(page,'fragment').count(),5);const nextIds=await rv(page,'fragment').evaluateAll(nodes=>nodes.map(node=>node.dataset.typingReviewFragment));assert.equal(new Set([...firstIds,...nextIds]).size,25);assert.equal(await startFragment(page,4),'aa');await rv(page,'prev').click();await rv(page,'fragment').first().locator('input').check();assert.equal(await rv(page,'target').textContent(),'aa');await completeReview(page,'aa');await customStart(page,'a bcdef ghijk');await completeWithErrors(page,'a bcdef ghijk','x');assert.equal(await startFragment(page),'a');await completeReview(page,'a');return {spaceErrorExactContext:'one two',repeatedTokensDistinctPositions:25,pageCounts:[20,5],oneCharacterReviewAllowed:true,originalCustomMinimumUnchanged:true}
})

test('typing-review-four-standard-modes-record-once',async args=>{
 const {page}=args;await setup(args,'?mode=short&lang=en&i=0');const observations=[];for(const kind of ['short','long','daily','time']){await mode(page,kind).click();await page.locator('[data-standard-input]').waitFor();const target=await page.locator('[data-standard-typing] div[lang]').textContent();const prior=await typingStorage(page),count=JSON.parse(prior.history).length;await page.locator('[data-standard-input]').pressSequentially('X');if(kind==='time'){await page.evaluate(()=>window.__typingClockOffset+=65000)}else await page.locator('[data-standard-input]').fill(target);await page.locator('[data-standard-result]').waitFor();const done=await typingStorage(page);assert.equal(JSON.parse(done.history).length,count+1);const result=await page.locator('[data-standard-result]').evaluate(node=>{const clone=node.cloneNode(true);clone.querySelector('[data-typing-review]')?.remove();return clone.textContent});const text=await startFragment(page);await completeReview(page,text);assert.deepEqual(await typingStorage(page),done);assert.equal(await page.locator('[data-standard-result]').evaluate(node=>{const clone=node.cloneNode(true);clone.querySelector('[data-typing-review]')?.remove();return clone.textContent}),result);await rv(page,'retry').click();await rv(page,'close').click();assert.deepEqual(await typingStorage(page),done);observations.push({mode:kind,sourceCodepoints:[...target].length,reviewCodepoints:[...text].length,normalRecordsAdded:1,reviewRecordsAdded:0})}return {modes:observations,timedClockControlled:true,originalResultsPreserved:true}
})

test('typing-review-timed-composition-and-untyped-suffix',async args=>{
 const {page}=args;await setup(args,'?mode=time&lang=en&i=0&sec=30');const input=page.locator('[data-standard-input]'),target=await page.locator('[data-standard-typing] div[lang]').textContent();await input.pressSequentially('X');await composition(input,'XXXXX','start');await page.evaluate(()=>window.__typingClockOffset+=31000);await page.locator('[data-standard-result]').waitFor();assert.equal(await rv(page,'fragment').count(),1);const first=await startFragment(page);assert.equal(first,target.split(/\s/)[0]);assert.ok(first.length<target.length/10);await rv(page,'close').click();await mode(page,'short').click();await mode(page,'time').click();const next=page.locator('[data-standard-input]');await composition(next,'XXXXX','start');await page.evaluate(()=>window.__typingClockOffset+=65000);await page.locator('[data-standard-result]').waitFor();assert.equal(await rv(page,'fragment').count(),0);assert.equal(await rv(page,'empty').count(),1);return {committedFirstTokenOnly:true,untypedSuffixExcluded:true,inProgressCompositionNotCommittedAtTimeout:true,timedCompletionControlledDateNow:true}
})

test('typing-review-synthetic-ime-paste-drop-and-escape',async args=>{
 const {page}=args;await setup(args);await customStart(page,'각 나다라마바사아자','ko');await completeWithErrors(page,'각 나다라마바사아자','x');assert.equal(await startFragment(page),'각');await composition(rv(page,'input'),'가','start');assert.equal(await rv(page,'result').count(),0);const key=await rv(page,'input').evaluate(node=>{const event=new KeyboardEvent('keydown',{key:'Escape',keyCode:229,bubbles:true,cancelable:true});return node.dispatchEvent(event)});assert.equal(key,true);assert.equal(await rv(page,'attempt').count(),1);await composition(rv(page,'input'),'가','end');await rv(page,'result').waitFor();assert.equal(await page.locator('[data-typing-review-char="wrong"]').count(),1);const result=await rv(page,'result').innerText();await composition(rv(page,'input'),'가','end');assert.equal(await rv(page,'result').innerText(),result);await rv(page,'retry').click();await page.evaluate(()=>navigator.clipboard.writeText('각'));await rv(page,'input').focus();await page.keyboard.press('Control+V');assert.equal(await rv(page,'input').inputValue(),'');const dropped=await rv(page,'input').evaluate(node=>{const data=new DataTransfer();data.setData('text/plain','각');return !node.dispatchEvent(new DragEvent('drop',{bubbles:true,cancelable:true,dataTransfer:data}))});assert.equal(dropped,true);await composition(rv(page,'input'),'각','start');assert.equal(await rv(page,'result').count(),0);await composition(rv(page,'input'),'각','end');await rv(page,'result').waitFor();assert.equal(await page.locator('[data-typing-review-char="correct"]').count(),1);await rv(page,'retry').click();await rv(page,'input').press('Escape');assert.equal(await rv(page,'attempt').count(),0);return {syntheticKoreanIme:true,osImeTested:false,prefixCommittedWrong:true,duplicateEndNoSecondResult:true,nativePasteBlocked:true,syntheticDropBlocked:true,compositionEscape229Untouched:true,ordinaryEscapeClosesOnlyReview:true}
})

test('typing-review-stale-origin-timers-draft-and-locale',async args=>{
 const {page}=args;await setup(args);await customStart(page);await completeWithErrors(page,'alpha beta gamma','X');await startFragment(page);await rv(page,'input').pressSequentially('a');assert.equal(await activeTimers(page),1);await rv(page,'input').evaluate(node=>{const props=node[Object.keys(node).find(key=>key.startsWith('__reactProps$'))];window.__oldReviewInput=()=>props.onChange({target:{value:'OLD'},nativeEvent:{isComposing:false}})});const before=await typingStorage(page),origin=await rv(page).getAttribute('data-typing-review-origin');await custom(page,'draft').fill('draft waiting for future application');await changeLanguage(page,'en');await poll(async()=>await rv(page).getByRole('heading',{name:tr('typingTest','review.title','en'),exact:true}).count()===1,'English review loaded');assert.equal(await rv(page,'input').inputValue(),'a');assert.equal(await rv(page,'target').textContent(),'alpha');assert.equal(await activeTimers(page),1);await custom(page,'apply').click();assert.equal(await rv(page).count(),0);assert.equal(await activeTimers(page),0);await page.evaluate(()=>{window.__oldReviewInput();for(const timer of window.__typingIntervals.filter(item=>item.delay===200&&!item.active))timer.callback()});assert.equal(await custom(page,'input').inputValue(),'');await completeWithErrors(page,'draft waiting for future application','X');assert.notEqual(await rv(page).getAttribute('data-typing-review-origin'),origin);const text=await startFragment(page);assert.equal(text,'draft');await rv(page,'input').pressSequentially('d');assert.equal(await activeTimers(page),1);await mode(page,'short').click();assert.equal(await activeTimers(page),0);await page.evaluate(()=>{window.__oldReviewInput();for(const timer of window.__typingIntervals.filter(item=>item.delay===200&&!item.active))timer.callback()});await mode(page,'custom').click();assert.equal(await custom(page,'draft').inputValue(),'draft waiting for future application');assert.equal(await rv(page).count(),0);const after=await typingStorage(page);assert.equal(after.history,before.history);assert.equal(after.daily,before.daily);return {draftAndLocaleKeepActiveTarget:true,maxObservedTypingTimers:1,newOriginClearsReview:true,oldDomHandlerAndIntervalIgnored:true,modeExitClearsTimer:true,reviewRawStoragePreserved:true}
})

test('typing-review-320-dark-ko-en-and-original-summary',async args=>{
 const {page}=args;await setup(args);await customStart(page);await completeWithErrors(page,'alpha beta gamma','X');const before=await typingStorage(page),geometry={};for(const lang of ['ko','en']){if(lang==='en'){await changeLanguage(page,lang);await poll(async()=>await rv(page).getByRole('heading',{name:tr('typingTest','review.title',lang),exact:true}).count()===1,'English review')}await rv(page,'fragment').first().locator('input').focus();await page.keyboard.press('Space');await rv(page,'start').focus();await page.keyboard.press('Enter');await poll(()=>rv(page,'input').evaluate(el=>document.activeElement===el),'keyboard starts focus');geometry[lang]=await mobile(page,[custom(page,'draft'),rv(page,'input')],[rv(page,'start'),rv(page,'retry'),rv(page,'close')]);await rv(page,'input').pressSequentially('alpha');await rv(page,'result').waitFor();await rv(page).evaluate(el=>el.scrollIntoView({block:'start',behavior:'instant'}));await page.evaluate(()=>scrollBy(0,-70));await page.screenshot({path:resolve(out,`typing-review-320-${lang}-viewport.png`),caret:'initial'});await rv(page,'close').click()}const copy=page.locator('[data-typing-copy]').getByRole('button',{name:tr('typingTest','copyRecovery.copy','en'),exact:true});await copy.click();await page.locator('[data-typing-copy]').getByRole('status').waitFor();const summary=await page.evaluate(()=>navigator.clipboard.readText());assert.ok(!summary.includes('alpha beta gamma'));assert.ok(!summary.includes('alpha'));assert.deepEqual(await typingStorage(page),before);return {geometry,keyboardRadioStartFocus:true,fields16Controls44:true,nativeSummaryExcludesPrivateSource:true,reviewNoRecordWrites:true}
},{width:320,dark:true,touch:true})

const planned=cases.map(item=>item.name)
if(only==='--list')console.log(planned.join('\n'))
else {const selected=cases.filter(item=>!only||only.split(',').some(part=>item.name.includes(part)));assert.ok(selected.length);mkdirSync(out,{recursive:true});const browser=await chromium.launch({channel:'chrome'});try{for(const scenario of selected)await run(browser,scenario)}finally{await browser.close();const merged=readdirSync(out).filter(name=>name.endsWith('-evidence.json')).map(name=>JSON.parse(readFileSync(resolve(out,name),'utf8')));const final={checkedAt:new Date().toISOString(),passed:merged.filter(item=>item.status==='pass').length,failed:merged.filter(item=>item.status==='fail').length,browserClosed:true,results:merged};writeFileSync(resolve(out,'final-results.json'),JSON.stringify(final,null,2));console.log(JSON.stringify({passed:final.passed,failed:final.failed,browserClosed:true}))}if(results.some(item=>item.status!=='pass'))process.exitCode=1}
export {historyKey,dailyKey,observeDecisionPorts,download,screenshot}









