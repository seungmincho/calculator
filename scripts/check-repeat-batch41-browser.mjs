import { chromium } from 'playwright'
import assert from 'node:assert/strict'
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import {NOTES_KEY,SETTINGS_KEY,syntheticNote,backupNotes,installStoragePorts,holdNativeLock,releaseNativeLock,installNativeFiles} from '../docs/verify/2026-11-17-repeat-batch41/browser-fixtures.mjs'




// Independent real-browser checks. --list never starts Chrome; case-name filters
// preserve previous evidence so only changed boundaries need to be rerun.
const base = process.env.VERIFY_BASE_URL || 'http://127.0.0.1:3039'
const out = resolve('docs/verify/2026-11-17-repeat-batch41/browser')
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
    if (!localStorage.getItem('__batch41Seeded')) { localStorage.setItem('language', options.language ?? 'ko'); localStorage.setItem('theme', options.dark ? 'dark' : 'light'); localStorage.setItem('__batch41Seeded', '1') }
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
  try { detail = await fn({ page, context, open, network, logs }) ?? {}; assert.deepEqual(errors, [], 'JS page errors'); assert.deepEqual(hydration, [], 'Hydration errors'); assert.deepEqual(consoleErrors.filter(value=>/ErrorBoundary|NotFoundError|The above error occurred/i.test(value)),[],'React caught runtime errors'); for (const active of context.pages()) assert.deepEqual(await active.evaluate(() => window.__unhandled), [], 'Unhandled rejections'); assert.ok(!/\b(?:notepad|shareResult)\.[a-zA-Z][\w.]+/.test(await page.locator('body').innerText()), 'Raw translation key') }
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



const initialNotes=[syntheticNote('a','첫 줄\r\n둘째 😀',{title:'같은 제목',pinned:true}),syntheticNote('b','',{title:'같은 제목'})]
const noteContent=page=>page.locator('[data-notepad-content]')
const noteTitle=page=>page.locator('[data-notepad-title]')
const action=(page,name)=>page.locator(`[data-notepad-${name}]`)
async function setup(args,notes=initialNotes,settings={fontSize:16,mono:false,wrap:true},modes={}) {
  await installStoragePorts(args.context,{[NOTES_KEY]:typeof notes==='string'?notes:JSON.stringify(notes),[SETTINGS_KEY]:JSON.stringify(settings)},'notepad')
  await installNativeFiles(args.context)
  await args.context.addInitScript(modes=>Object.assign(window.__storeModes??={},modes),modes)
  await args.open('notepad');await args.page.locator('[data-notepad-ready="true"]').waitFor()
}
async function saved(page){await page.locator('[data-notepad-save-status="saved"]').waitFor()}
async function nativeNotes(page){return page.evaluate(key=>JSON.parse(window.__nativeStoreGet(key)),NOTES_KEY)}
async function backup(page,name='current-notes.json'){const control=await action(page,'backup-current').count()?action(page,'backup-current'):action(page,'backup');const file=await download(page,()=>control.click(),name);const parsed=JSON.parse(file.text);assert.equal(parsed.app,'toolhub-notepad');assert.equal(parsed.version,1);return {file,notes:parsed.notes}}
async function attach(page,name,text){await action(page,'file').setInputFiles({name,mimeType:name.endsWith('.json')?'application/json':'text/plain',buffer:Buffer.from(text)})}
async function newTab(args){const page=await args.context.newPage();await args.open('notepad','',page);await page.locator('[data-notepad-ready="true"]').waitFor();return page}

test('notepad-legacy-revisit-and-files',async args=>{
 const {page}=args;await setup(args);assert.equal(await noteContent(page).inputValue(),'첫 줄\n둘째 😀');await changeLanguage(page,'en');await wait(500);assert.equal(await page.evaluate(keys=>window.__storeLog.filter(item=>keys.includes(item.key)).length,[NOTES_KEY,SETTINGS_KEY]),0);const initial=await backup(page,'legacy-backup.json');assert.deepEqual(initial.notes,initialNotes)
 const txt=await download(page,()=>page.keyboard.press('Control+s'),'legacy-note.txt');assert.deepEqual(txt.bytes,Buffer.from(initialNotes[0].content));await changeLanguage(page,'ko');await noteTitle(page).fill('새 제목');await noteContent(page).fill('수정한 본문\n빈 줄 다음\n\n😀');await saved(page);const stored=await nativeNotes(page);assert.equal(stored.find(n=>n.id==='a').content,'수정한 본문\n빈 줄 다음\n\n😀');assert.deepEqual(stored.find(n=>n.id==='b'),initialNotes[1]);const revisit=await newTab(args);assert.equal(await noteContent(revisit).inputValue(),stored.find(n=>n.id==='a').content);const final=await backup(page,'edited-backup.json');assert.deepEqual(final.notes,stored);await poll(async()=>page.evaluate(()=>window.__downloadUrls.every(item=>item.revoked===1)),'Owned download URLs released');return {initialWrites:0,legacyExactBackup:true,nativeTxtBytes:txt.bytes.length,revisitAndWholeBackup:true,ownedUrlsRevoked:true}
})
test('notepad-native-two-tabs-keep-both',async args=>{
 const {page}=args;await setup(args);const other=await newTab(args);await holdNativeLock(other,NOTES_KEY);await noteContent(page).fill('A 미저장 원문');const external=[syntheticNote('a','B 외부 원문',{title:'외부 제목'}),syntheticNote('c','외부 별개 글')];await other.evaluate(({key,raw})=>window.__nativeStoreSet(key,raw),{key:NOTES_KEY,raw:JSON.stringify(external)});await page.locator('[data-notepad-save-status="external"]').waitFor();assert.equal(await noteContent(page).inputValue(),'A 미저장 원문');await releaseNativeLock(other,NOTES_KEY);await action(page,'keep-both').click();await saved(page);const merged=await nativeNotes(page);assert.equal(merged.length,4);assert.equal(new Set(merged.map(n=>n.id)).size,4);assert.ok(merged.some(n=>n.content==='A 미저장 원문'));assert.ok(merged.some(n=>n.content==='B 외부 원문'));assert.equal(await noteContent(page).inputValue(),'A 미저장 원문');await other.evaluate(key=>window.__nativeStoreRemove(key),NOTES_KEY);await page.locator('[data-notepad-save-status="external"]').waitFor();await wait(500);assert.equal(await page.evaluate(key=>window.__nativeStoreGet(key),NOTES_KEY),null);assert.equal(await noteContent(page).inputValue(),'A 미저장 원문');await action(page,'keep-both').click();await saved(page);assert.equal((await nativeNotes(page)).length,4);return {nativeStorageEvents:true,dirtyOriginalPreserved:true,sameIdConflictCopies:1,mergedNotes:4,externalDeleteNoAutomaticResurrection:true,explicitKeepRestoresMemory:true}
})
test('notepad-native-lock-edit-and-leave',async args=>{
 const {page}=args;await setup(args);const holder=await newTab(args);await holdNativeLock(holder,NOTES_KEY);await noteContent(page).fill('첫 저장 대기');await page.locator('[data-notepad-save-status="saving"]').waitFor();await noteContent(page).fill('최신 저장 대기');await releaseNativeLock(holder,NOTES_KEY);await saved(page);assert.equal((await nativeNotes(page)).find(n=>n.id==='a').content,'최신 저장 대기');const before=await page.evaluate(key=>window.__nativeStoreGet(key),NOTES_KEY);await holdNativeLock(holder,NOTES_KEY);await noteContent(page).fill('이탈하는 메모리');await page.locator('[data-notepad-save-status="saving"]').waitFor();await page.evaluate(()=>dispatchEvent(new PageTransitionEvent('pagehide',{persisted:true})));await releaseNativeLock(holder,NOTES_KEY);await wait(100);assert.equal(await page.evaluate(key=>window.__nativeStoreGet(key),NOTES_KEY),before);await page.evaluate(()=>dispatchEvent(new PageTransitionEvent('pageshow',{persisted:true})));await saved(page);assert.equal((await nativeNotes(page)).find(n=>n.id==='a').content,'이탈하는 메모리');await holdNativeLock(holder,NOTES_KEY);await noteContent(page).fill('SPA 이탈 취소');await page.locator('[data-notepad-save-status="saving"]').waitFor();const beforeLeave=await page.evaluate(key=>window.__nativeStoreGet(key),NOTES_KEY);await page.locator('header a[href="/"]').first().click();await page.locator('[data-notepad-root]').waitFor({state:'detached'});await releaseNativeLock(holder,NOTES_KEY);await wait(100);assert.equal(await page.evaluate(key=>window.__nativeStoreGet(key),NOTES_KEY),beforeLeave);return {actualWebLocks:true,queuedOldEditCanceled:true,controlledPagehidePreservesStorage:true,pageshowRecheckSavesCurrent:true,actualSpaUnmountCancelsPending:true}
})
test('notepad-storage-failures-raw-backup',async args=>{
 const {page}=args;const original='{broken-notepad';await setup(args,original);await page.locator('[data-notepad-save-status="error"]').waitFor();assert.equal(await page.evaluate(key=>window.__nativeStoreGet(key),NOTES_KEY),original);const raw=await download(page,()=>action(page,'backup-raw').click(),'corrupt-original.txt');assert.equal(raw.text,original);await action(page,'new').filter({visible:true}).first().click();await noteContent(page).fill('손상 중 메모리');const current=await backup(page,'corrupt-current.json');assert.equal(current.notes[0].content,'손상 중 메모리');assert.equal(await page.evaluate(key=>window.__nativeStoreGet(key),NOTES_KEY),original)
 await page.evaluate(({key,raw})=>window.__nativeStoreSet(key,raw),{key:NOTES_KEY,raw:JSON.stringify(initialNotes)});await action(page,'save-recheck').click();await action(page,'keep-both').click();await saved(page);await page.evaluate(key=>window.__storeModes[key]='quota',NOTES_KEY);const quotaBasis=await page.evaluate(key=>window.__nativeStoreGet(key),NOTES_KEY);await noteContent(page).fill('quota 뒤 최신 메모리');await page.locator('[data-notepad-save-status="error"]').waitFor();assert.equal(await page.evaluate(key=>window.__nativeStoreGet(key),NOTES_KEY),quotaBasis);assert.equal(await noteContent(page).inputValue(),'quota 뒤 최신 메모리');await page.evaluate(key=>window.__storeModes[key]='readback-once',NOTES_KEY);await action(page,'save-retry').click();await page.locator('[data-notepad-save-status="error"]').waitFor();assert.ok((await nativeNotes(page)).some(n=>n.content==='quota 뒤 최신 메모리'));await page.evaluate(key=>delete window.__storeModes[key],NOTES_KEY);await action(page,'save-recheck').click();await saved(page);await page.evaluate(key=>window.__storeModes[key]='quota',SETTINGS_KEY);await page.getByRole('combobox',{name:tr('notepad','fontSize')}).selectOption('18');await action(page,'settings-retry').waitFor();await noteContent(page).fill('설정 실패와 별개 본문');await saved(page);assert.ok((await nativeNotes(page)).some(n=>n.content==='설정 실패와 별개 본문'));await page.evaluate(key=>window.__storeModes[key]='read-blocked',NOTES_KEY);await page.evaluate(()=>dispatchEvent(new Event('pageshow')));await page.locator('[data-notepad-save-status="error"]').waitFor();assert.equal(await noteContent(page).inputValue(),'설정 실패와 별개 본문');return {corruptRawExactBackup:true,memoryBackupSeparate:true,quotaOldRawPreserved:true,readbackUnknownNoRollback:true,explicitRecheckConfirmsWrite:true,settingsFailureDoesNotBlockNotes:true,readBlockedPreservesMemory:true}
})
test('notepad-native-import-ownership',async args=>{
 const {page}=args;await setup(args);await page.evaluate(()=>window.__fileMode='hold');await action(page,'file').setInputFiles([{name:'old.txt',mimeType:'text/plain',buffer:Buffer.from('늦은 옛 파일')},{name:'must-not-read.txt',mimeType:'text/plain',buffer:Buffer.from('읽기 금지')}]);await poll(async()=>page.evaluate(()=>window.__fileReads[0]?.completed),'First native File.text complete');await noteContent(page).fill('파일보다 최신 편집');await page.evaluate(()=>window.__fileReads[0].release());await page.locator('[data-notepad-import-status="cancelled"]').waitFor();assert.equal(await page.evaluate(()=>window.__fileReads.length),1);assert.equal(await noteContent(page).inputValue(),'파일보다 최신 편집');await attach(page,'old-selection.txt','옛 선택');await poll(async()=>page.evaluate(()=>window.__fileReads.at(-1)?.completed),'Old selection read');const old=await page.evaluate(()=>window.__fileReads.length-1);await page.evaluate(()=>window.__fileMode='native');const incoming=[syntheticNote('a','충돌 파일 원문'),syntheticNote('incoming-reserved','뒤 파일 원문')];await action(page,'file').setInputFiles([{name:'valid.json',mimeType:'application/json',buffer:Buffer.from(backupNotes(incoming))},{name:'bad.json',mimeType:'application/json',buffer:Buffer.from('{invalid')},{name:'plain.txt',mimeType:'text/plain',buffer:Buffer.from('CRLF\r\n정상 😀')}]);await poll(async()=>await page.locator('[data-notepad-select]').count()===5,'Mixed imports completed');await page.evaluate(index=>window.__fileReads[index].release(),old);await saved(page);const notes=await nativeNotes(page);assert.equal(notes.length,5);assert.equal(new Set(notes.map(n=>n.id)).size,5);for(const text of ['파일보다 최신 편집','충돌 파일 원문','뒤 파일 원문','CRLF\n정상 😀'])assert.ok(notes.some(n=>n.content===text));assert.ok(!notes.some(n=>n.content==='옛 선택'));await attach(page,'valid.json',backupNotes(incoming));await poll(async()=>page.evaluate(()=>window.__fileReads.at(-1).name==='valid.json'),'Same file read again');await wait(100);assert.equal((await nativeNotes(page)).length,5);return {actualFileText:true,editedReadCanceled:true,nextFileReadAfterCancellation:0,reverseCompletionIgnored:true,goodFilesSurviveBadJson:true,conflictCopiesAndReservedIds:true,sameFileReselection:true}
})
test('notepad-undo-find-focus-and-pinning',async args=>{
 const {page}=args;await setup(args);await noteContent(page).fill('one one two');await page.getByRole('button',{name:tr('notepad','find.button'),exact:true}).click();await page.getByRole('textbox',{name:tr('notepad','find.find'),exact:true}).fill('one');await page.getByRole('textbox',{name:tr('notepad','find.replace'),exact:true}).fill('새');await page.getByRole('button',{name:tr('notepad','find.replaceAll'),exact:true}).click();assert.equal(await noteContent(page).inputValue(),'새 새 two');await action(page,'undo').click();assert.equal(await noteContent(page).inputValue(),'one one two');await page.locator('[data-notepad-delete="b"]').click();await action(page,'undo').click();assert.equal(await page.locator('[data-notepad-select="b"]').count(),1);await page.locator('[data-notepad-delete="b"]').click();const oldToast=await page.evaluate(()=>window.__noteToastTimers.length-1);await noteContent(page).fill('undo 뒤 새 편집');assert.equal(await action(page,'undo').count(),0);await page.locator('[data-notepad-pin="a"]').click();await page.evaluate(index=>window.__noteToastTimers[index].callback(),oldToast);assert.equal(await noteContent(page).inputValue(),'undo 뒤 새 편집');await noteContent(page).focus();await page.keyboard.press('End');await page.keyboard.press('Tab');assert.ok((await noteContent(page).inputValue()).endsWith('\t'));await page.keyboard.press('Escape');await page.keyboard.press('Tab');assert.equal(await noteContent(page).evaluate(el=>document.activeElement===el),false);await page.getByRole('button',{name:tr('notepad','focus'),exact:true}).click();await page.getByRole('button',{name:tr('notepad','exitFocus'),exact:true}).click();await action(page,'new').filter({visible:true}).first().click();await poll(async()=>noteContent(page).evaluate(el=>document.activeElement===el),'New note actual DOM focus');return {replaceAllUndo:true,deleteUndo:true,laterEditInvalidatesUndo:true,oldToastCannotChangeText:true,nativeTabInsertAndEscapeTab:true,focusModeAndNewNoteFocus:true}
})
test('notepad-selected-reading-and-locale',async args=>{
 const {page,context}=args;await context.addInitScript(()=>{window.__speechCalls=0;if(window.speechSynthesis)window.speechSynthesis.speak=()=>window.__speechCalls++});await setup(args);const text='앞부분 읽을 문장 😀 뒷부분';await noteContent(page).fill(text);await saved(page);await noteContent(page).focus();await page.keyboard.press('Home');for(let i=0;i<4;i++)await page.keyboard.press('ArrowRight');for(let i=0;i<7;i++)await page.keyboard.press('Shift+ArrowRight');assert.deepEqual(await noteContent(page).evaluate(el=>[el.selectionStart,el.selectionEnd]),[4,12]);await poll(async()=>!(await page.locator('[data-notepad-reading="selection"]').isDisabled()),'Native keyboard selection enabled');const [popup]=await Promise.all([context.waitForEvent('page'),page.locator('[data-notepad-reading="selection"]').click()]);await popup.waitForURL('**/text-to-speech/?from=notepad');await popup.locator('textarea').first().waitFor();await poll(async()=>await popup.locator('textarea').first().inputValue()===text.slice(4,12),'TTS hydrated handoff consumption');assert.equal(await popup.locator('textarea').first().inputValue(),text.slice(4,12));assert.equal(await popup.evaluate(()=>window.opener),null);assert.equal(await popup.evaluate(()=>sessionStorage.getItem('toolhub-ocr-tts-v1')),null);assert.equal(await popup.evaluate(()=>window.__speechCalls),0);assert.equal(await noteContent(page).inputValue(),text);await popup.close();await noteContent(page).fill('선택 후 편집');assert.equal(await page.locator('[data-notepad-reading="selection"]').isDisabled(),true);await page.evaluate(()=>window.open=()=>null);await page.locator('[data-notepad-reading="all"]').click();assert.equal(await noteContent(page).inputValue(),'선택 후 편집');await changeLanguage(page,'en');assert.equal(await noteContent(page).inputValue(),'선택 후 편집');return {actualNewTab:true,exactSelectionUtf16:true,openerNull:true,oneTimeSessionConsumption:true,autoplay:0,sourcePreserved:true,editedSelectionInvalidated:true,popupBlockedMemoryPreserved:true}
})
test('notepad-320-dark-ko-en',async args=>{
 const {page}=args;await setup(args);await page.evaluate(key=>window.__storeModes[key]='quota',NOTES_KEY);await noteContent(page).fill('모바일 합성 메모 😀');await page.locator('[data-notepad-save-status="error"]').waitFor();await page.getByRole('button',{name:tr('notepad','find.button'),exact:true}).click();const fields=[noteTitle(page),noteContent(page),page.getByRole('textbox',{name:tr('notepad','find.find'),exact:true})],controls=[action(page,'save-retry'),action(page,'save-recheck'),action(page,'backup-current'),action(page,'export-txt')];const ko=await mobile(page,fields,controls);await screenshot(page,'notepad-320-ko',action(page,'recovery'));await changeLanguage(page,'en');await page.getByRole('heading',{name:tr('notepad','persistence.title','en'),exact:true}).waitFor();const en=await mobile(page,[noteTitle(page),noteContent(page),page.getByRole('textbox',{name:tr('notepad','find.find','en'),exact:true})],controls);await screenshot(page,'notepad-320-en',action(page,'recovery'));assert.equal(await noteContent(page).inputValue(),'모바일 합성 메모 😀');return {ko,en,fields16:true,controls44:true,translatedRecovery:true,localePreservesDraft:true}
},{width:320,dark:true})

// Prepared actual cases; author/canonical final ready still required before execution.
const planned = [
  "notepad-legacy-revisit-and-files",
  "notepad-native-two-tabs-keep-both",
  "notepad-native-lock-edit-and-leave",
  "notepad-storage-failures-raw-backup",
  "notepad-native-import-ownership",
  "notepad-undo-find-focus-and-pinning",
  "notepad-selected-reading-and-locale",
  "notepad-320-dark-ko-en"
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

