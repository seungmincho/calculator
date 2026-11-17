import { chromium } from 'playwright'
import assert from 'node:assert/strict'
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import {PNG} from 'pngjs'
import {installStoragePorts} from '../docs/verify/2026-11-17-repeat-batch41/browser-fixtures.mjs'
import {observeAspectNativeIo} from '../docs/verify/2026-11-17-repeat-batch37/browser-fixtures.mjs'
import {SAVED_KEY,ANNIV_KEY,calendarRows,parseCalendar,calendarEscaped,expectedUid,installDdayPorts} from '../docs/verify/2026-11-17-repeat-batch51/browser-fixtures.mjs'




// Independent real-browser checks. --list never starts Chrome; case-name filters
// preserve previous evidence so only changed boundaries need to be rerun.
const base = process.env.VERIFY_BASE_URL || 'http://127.0.0.1:3039'
const out = resolve('docs/verify/2026-11-17-repeat-batch51/browser')
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
    if (!localStorage.getItem('__batch51Seeded')) { localStorage.setItem('language', options.language ?? 'ko'); localStorage.setItem('theme', options.dark ? 'dark' : 'light'); localStorage.setItem('__batch51Seeded', '1') }
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
  try { detail = await fn({ page, context, open, network, logs }) ?? {}; assert.deepEqual(errors, [], 'JS page errors'); assert.deepEqual(hydration, [], 'Hydration errors'); assert.deepEqual(consoleErrors.filter(value=>/ErrorBoundary|NotFoundError|The above error occurred/i.test(value)),[],'React caught runtime errors'); for (const active of context.pages()) assert.deepEqual(await active.evaluate(() => window.__unhandled), [], 'Unhandled rejections'); assert.ok(!/\b(?:ddayCalculator|shareResult)\.[a-zA-Z][\w.]+/.test(await page.locator('body').innerText()), 'Raw translation key') }
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





const dd=(page,name,value)=>page.locator(`[data-dday-${name}${value===undefined?'':`="${value}"`}]`)
const share=(page,action)=>dd(page,'share').locator(`[data-share-action="${action}"]`)
const tab=(page,mode,language='ko')=>page.getByRole('tab',{name:tr('ddayCalculator',`modes.${mode}`,language),exact:true})
async function setupDday(args,rows=calendarRows(3),query='?mode=dday&date=2028-02-29&title=합성%20일정'){await installStoragePorts(args.context,{[SAVED_KEY]:typeof rows==='string'?rows:JSON.stringify(rows),[ANNIV_KEY]:JSON.stringify({start:'2026-10-01',type:'couple',inc:true})},'dday51');await observeDecisionPorts(args.context);await observeAspectNativeIo(args.context);await installDdayPorts(args.context);await args.open('dday-calculator',query);await dd(args.page,'root').waitFor();if(!/[?&]mode=(anniv|diff|add)/.test(query))await dd(args.page,'calendar-download').waitFor()}
async function settled(page){await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))))}
async function heldCalendar(page,count=1){await page.evaluate(()=>window.__digestMode='hold');await dd(page,'calendar-download').click();await poll(()=>page.evaluate(n=>window.__digestPending.length===n,count),'native SHA completion held')}
const anchorCount=page=>page.evaluate(()=>window.__ddayAnchors.length)
const rawSaved=page=>page.evaluate(key=>window.__nativeStoreGet(key),SAVED_KEY)
async function releaseCalendar(page){await page.evaluate(()=>window.__releaseDigests());await settled(page)}
const normalized=value=>value.replaceAll('\r\n','\n').replaceAll('\r','\n')

test('dday-native-copy-explicit-url-and-receiver',async args=>{
 const {page,context}=args;await setupDday(args,[{id:'different-pin',title:'기기 고정 일정',date:'2031-12-25',pinned:true}]);await page.locator('#dday-title').fill('내 일정 😀');await page.locator('#dday-date').fill('2028-02-29');await settled(page);await page.evaluate(()=>{const url=new URL(location.href);url.searchParams.append('unrelated','one');url.searchParams.append('unrelated','two');url.hash='fixture';history.replaceState({...history.state,nativeDday:1},'',url)});const before=page.url();await dd(page,'copy').click();await poll(()=>page.evaluate(()=>window.__clipboardCalls.length===1),'native copy');const text=await page.evaluate(()=>window.__clipboardCalls.at(-1));assert.ok(text.includes('내 일정 😀'));assert.equal(normalized(await page.evaluate(()=>window.__nativeClipboardRead())),normalized(text));const href=text.match(/https?:\/\/\S+/)[0],url=new URL(href);assert.equal(url.searchParams.get('mode'),'dday');assert.equal(url.searchParams.get('date'),'2028-02-29');assert.equal(url.searchParams.get('title'),'내 일정 😀');assert.deepEqual(url.searchParams.getAll('unrelated'),['one','two']);assert.equal(url.hash,'#fixture');assert.equal(page.url(),before);assert.equal(url.searchParams.has('id'),false);const receiver=await context.newPage();await receiver.goto(href,{waitUntil:'domcontentloaded'});await poll(async()=>await receiver.locator('#dday-date').inputValue()==='2028-02-29','explicit URL overrides receiver pin');assert.equal(await receiver.locator('#dday-title').inputValue(),'내 일정 😀');return {nativeClipboard:true,explicitDateTitleMode:true,currentUnknownQueryHashPreserved:true,copyDoesNotNavigate:true,savedIdNotExposed:true,receiverPinnedPreferenceOverridden:true}
})

test('dday-copy-failure-manual-and-aba',async args=>{
 const {page}=args;await setupDday(args);await page.evaluate(()=>window.__setClipboardMode('absent'));await dd(page,'copy').click();const field=dd(page,'copy-manual');await field.waitFor();const text=await field.inputValue();assert.ok(text.includes('합성 일정'));await dd(page,'copy-select').click();assert.deepEqual(await field.evaluate(el=>[el.selectionStart,el.selectionEnd]),[0,text.length]);await page.evaluate(()=>window.__setClipboardMode('native'));await dd(page,'copy-retry').click();await field.waitFor({state:'detached'});assert.equal(normalized(await page.evaluate(()=>window.__nativeClipboardRead())),normalized(text));await page.evaluate(()=>{window.__setClipboardMode('reject');window.__legacyMode='throw'});await dd(page,'copy').click();await field.waitFor();await dd(page,'copy-close').click();await page.evaluate(()=>{window.__setClipboardMode('hold');window.__legacyMode='false'});await dd(page,'copy').click();await page.locator('#dday-title').fill('B');await page.locator('#dday-title').fill('합성 일정');const fallbacks=await page.evaluate(()=>window.__legacyCalls.length);await page.evaluate(()=>window.__clipboardPending.shift().reject(new Error('stale copy')));await settled(page);assert.equal(await page.evaluate(()=>window.__legacyCalls.length),fallbacks);assert.equal(await dd(page,'copy-recovery').count(),0);await changeLanguage(page,'en');await changeLanguage(page,'ko');assert.equal(await dd(page,'copy-recovery').count(),0);return {absentLegacyFalseFails:true,rejectLegacyThrowFails:true,manualWholeSelection:true,nativeRetryExact:true,inputLocaleAbaNoRevival:true,lateFallbacks:0}
})

test('dday-real-current-ics-and-url-cleanup',async args=>{
 const {page}=args;const title='한글 기념일'.repeat(5)+',;\\';await setupDday(args,calendarRows(1),`?mode=dday&date=2028-02-29&title=${encodeURIComponent(title)}`);const saved=await rawSaved(page);const file=await download(page,()=>dd(page,'calendar-download').click(),'current-leap-native.ics'),calendar=parseCalendar(file.bytes);assert.equal(file.filename,'dday-2028-02-29.ics');assert.equal(calendar.events.length,1);const event=calendar.events[0];assert.equal(event['DTSTART;VALUE=DATE'],'20280229');assert.equal(event['DTEND;VALUE=DATE'],'20280301');assert.equal(event.SUMMARY,calendarEscaped(title));assert.equal(event.UID,expectedUid({title,date:'2028-02-29'}));assert.match(event.DTSTAMP,/^\d{8}T\d{6}Z$/);assert.equal(await page.evaluate(()=>window.__ddayUrls.at(-1).type),'text/calendar;charset=utf-8');const second=parseCalendar((await download(page,()=>dd(page,'calendar-download').click(),'current-leap-native-again.ics')).bytes);assert.equal(second.events[0].UID,event.UID);assert.equal(await rawSaved(page),saved);await page.locator('header a[href="/"]').first().click();await dd(page,'root').waitFor({state:'detached'});await poll(()=>page.evaluate(()=>window.__ddayUrls.every(item=>item.revoked===1)),'download URLs revoked exactly once on unmount');return {actualShaAndBlob:true,bytes:file.bytes.length,uidIndependentSha256:true,utf8Fold75AndCrlfNoBom:true,leapEndNextDay:true,stableUid:true,savedWrites:0,urlRevokeEach:1}
})

test('dday-selected100-and-late-raw-change',async args=>{
 const {page}=args;const rows=calendarRows(100);await setupDday(args,rows);const original=await rawSaved(page);await dd(page,'calendar-source','saved').click();await dd(page,'calendar-all').click();assert.equal(await dd(page,'calendar-select').filter({visible:true}).count(),100);const file=await download(page,()=>dd(page,'calendar-download').click(),'selected-100-native.ics'),calendar=parseCalendar(file.bytes);assert.equal(calendar.events.length,100);const selectedOrder=await dd(page,'calendar-select').evaluateAll(nodes=>nodes.map(node=>node.getAttribute('data-dday-calendar-select')));const byId=new Map(rows.map(row=>[row.id,row]));for(let i=0;i<100;i++){const source=byId.get(selectedOrder[i]);assert.equal(calendar.events[i].UID,expectedUid(source));assert.equal(calendar.events[i].SUMMARY,calendarEscaped(source.title));assert.equal(calendar.events[i]['DTSTART;VALUE=DATE'],source.date.replaceAll('-',''))}assert.equal(new Set(calendar.events.map(event=>event.UID)).size,100);assert.equal(await rawSaved(page),original);const before=await anchorCount(page);await heldCalendar(page,100);const changed=JSON.stringify(rows.map((row,index)=>index===0?{...row,title:'저장소 최신 제목'}:row));await page.evaluate(({key,value})=>window.__nativeStoreSet(key,value),{key:SAVED_KEY,value:changed});await releaseCalendar(page);await dd(page,'calendar').filter({has:page.locator('[role="alert"]')}).waitFor();assert.equal(await anchorCount(page),before);assert.equal(await page.locator('[data-dday-calendar-select]:checked').count(),100);assert.equal(await rawSaved(page),changed);return {selectedEvents:100,actualBytes:file.bytes.length,independentUidAndOrder:true,savedRawUnchangedByExport:true,lateRawChangeWholeFileRejected:true,selectedItemsPreserved:100}
})

test('dday-slow-sha-edit-cancel-mode-unmount',async args=>{
 const {page}=args;await setupDday(args);const before=await anchorCount(page);await heldCalendar(page);await page.locator('#dday-title').fill('최신 제목');await releaseCalendar(page);assert.equal(await anchorCount(page),before);await heldCalendar(page);await dd(page,'calendar-cancel').click();await dd(page,'calendar').getAttribute('data-dday-calendar-status').then(value=>assert.equal(value,'cancelled'));await releaseCalendar(page);assert.equal(await anchorCount(page),before);await heldCalendar(page);await tab(page,'diff').click();await releaseCalendar(page);assert.equal(await anchorCount(page),before);await tab(page,'dday').click();await heldCalendar(page);await page.locator('header a[href="/"]').first().click();await dd(page,'root').waitFor({state:'detached'});await releaseCalendar(page);assert.equal(await anchorCount(page),before);await args.open('dday-calculator','?mode=dday&date=2028-03-01&title=새%20작업');await dd(page,'calendar-download').waitFor();const file=await download(page,()=>dd(page,'calendar-download').click(),'calendar-new-explicit-after-cancel.ics');assert.equal(parseCalendar(file.bytes).events[0].SUMMARY,'새 작업');return {nativeShaCompletionHeld:true,lateAnchorsAfterEditCancelModeUnmount:0,newExplicitDownloadWorks:true,shaItselfNotCanceled:true}
})

test('dday-share-png-copy-ics-ownership',async args=>{
 const {page}=args;await setupDday(args);await page.evaluate(()=>window.__aspectEncodeMode='hold');await share(page,'save').click();await poll(()=>page.evaluate(()=>window.__aspectHeld.some(item=>item.type==='encode')),'real PNG encoder held');const first=await download(page,()=>dd(page,'calendar-download').click(),'calendar-wins-old-png.ics');assert.equal(parseCalendar(first.bytes).events.length,1);const after=await anchorCount(page);await page.evaluate(()=>window.__releaseAspect('encode'));await settled(page);assert.equal(await anchorCount(page),after);await heldCalendar(page);await share(page,'copy').click();await releaseCalendar(page);assert.equal(await anchorCount(page),after);await page.evaluate(()=>window.__setClipboardMode('hold'));await dd(page,'copy').click();await page.evaluate(()=>window.__digestMode='native');await download(page,()=>dd(page,'calendar-download').click(),'calendar-wins-old-copy.ics');const fallbacks=await page.evaluate(()=>window.__legacyCalls.length);await page.evaluate(()=>window.__clipboardPending.shift().reject(new Error('old own copy')));await settled(page);assert.equal(await page.evaluate(()=>window.__legacyCalls.length),fallbacks);await page.evaluate(()=>{window.__setClipboardMode('native');window.__aspectEncodeMode='native'});const png=await download(page,()=>share(page,'save').click(),'dday-current-share.png'),decoded=PNG.sync.read(png.bytes);assert.deepEqual([decoded.width,decoded.height],[1080,1350]);return {actualPngThenIcsOldPngDownload:0,icsThenShareCopyOldIcsDownload:0,ownCopyThenIcsOldFallback:0,nativePng:{width:decoded.width,height:decoded.height,bytes:png.bytes.length}}
})

test('dday-invalid-saved-retry-and-four-modes',async args=>{
 const {page}=args;await setupDday(args,'{corrupt-dday');await dd(page,'calendar-source','saved').click();assert.equal(await dd(page,'calendar-download').isDisabled(),true);assert.equal(await rawSaved(page),'{corrupt-dday');await dd(page,'calendar-source','current').click();await page.evaluate(()=>window.__urlMode='throw');await dd(page,'calendar-download').click();await poll(async()=>await dd(page,'calendar').getAttribute('data-dday-calendar-status')==='error','download error');assert.equal(await anchorCount(page),0);await page.evaluate(()=>window.__urlMode='native');await download(page,()=>dd(page,'calendar-download').click(),'current-despite-corrupt-saved.ics');await page.evaluate(({key,value})=>window.__nativeStoreSet(key,value),{key:SAVED_KEY,value:JSON.stringify(calendarRows(101))});await args.open('dday-calculator','?mode=dday&target=2028-02-29&event=구형%20링크');await poll(async()=>await page.locator('#dday-title').inputValue()==='구형 링크','legacy target/event restored');await dd(page,'calendar-source','saved').click();assert.equal(await dd(page,'calendar-download').isDisabled(),true);await args.open('dday-calculator','?mode=anniv&start=2026-10-01&type=couple&inc=0');await page.locator('#anniv-start').waitFor();assert.equal(await page.locator('#anniv-start').inputValue(),'2026-10-01');await args.open('dday-calculator','?mode=diff&start=2028-02-28&end=2028-03-01');await page.locator('#diff-end').waitFor();assert.equal(await page.locator('#diff-start').inputValue(),'2028-02-28');assert.equal(await page.locator('#diff-end').inputValue(),'2028-03-01');await args.open('dday-calculator','?mode=add&base=2028-01-31&value=1&unit=months');await page.locator('#add-base').waitFor();assert.equal(await page.locator('#add-base').inputValue(),'2028-01-31');assert.ok((await page.locator('main').innerText()).includes('2028'));return {corruptSavedPreserved:true,currentExportIndependent:true,urlFailureFalseSuccess:0,nativeRetryWorks:true,over100SavedBlocked:true,legacyTargetEventRestored:true,fourModesEntryPreserved:true}
})

test('dday-320-dark-ko-en',async args=>{
 const {page}=args;await setupDday(args);const checks={};for(const language of ['ko','en']){if(language==='en')await changeLanguage(page,'en');await page.evaluate(()=>window.__setClipboardMode('absent'));await dd(page,'copy').click();await dd(page,'copy-manual').waitFor();await dd(page,'copy-select').focus();await page.keyboard.press('Enter');const value=await dd(page,'copy-manual').inputValue();assert.deepEqual(await dd(page,'copy-manual').evaluate(el=>[el.selectionStart,el.selectionEnd]),[0,value.length]);checks[language]=await mobile(page,[page.locator('#dday-title'),page.locator('#dday-date'),dd(page,'copy-manual')],[dd(page,'copy'),dd(page,'copy-select'),dd(page,'calendar-download')]);await screenshot(page,`dday-copy-320-${language}`,dd(page,'copy-recovery'));await dd(page,'copy-close').click()}return {geometry:checks,keyboardWholeSelection:true,fields16Buttons44:true}
},{width:320,dark:true,touch:true})

const planned=cases.map(item=>item.name)
if(only==='--list')console.log(planned.join('\n'))
else {const selected=cases.filter(item=>!only||only.split(',').some(part=>item.name.includes(part)));assert.ok(selected.length);mkdirSync(out,{recursive:true});const browser=await chromium.launch({channel:'chrome'});try{for(const scenario of selected)await run(browser,scenario)}finally{await browser.close();const merged=readdirSync(out).filter(name=>name.endsWith('-evidence.json')).map(name=>JSON.parse(readFileSync(resolve(out,name),'utf8')));const final={checkedAt:new Date().toISOString(),passed:merged.filter(item=>item.status==='pass').length,failed:merged.filter(item=>item.status==='fail').length,browserClosed:true,results:merged};writeFileSync(resolve(out,'final-results.json'),JSON.stringify(final,null,2));console.log(JSON.stringify({passed:final.passed,failed:final.failed,browserClosed:true}))}if(results.some(item=>item.status!=='pass'))process.exitCode=1}
