import { chromium } from 'playwright'
import assert from 'node:assert/strict'
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import {installStoragePorts,holdNativeLock,releaseNativeLock} from '../docs/verify/2026-11-17-repeat-batch41/browser-fixtures.mjs'
import {DRAFT_KEY,VERSIONS_KEY,syntheticDraft,syntheticVersions,installCharacterPorts} from '../docs/verify/2026-11-17-repeat-batch48/browser-fixtures.mjs'




// Independent real-browser checks. --list never starts Chrome; case-name filters
// preserve previous evidence so only changed boundaries need to be rerun.
const base = process.env.VERIFY_BASE_URL || 'http://127.0.0.1:3039'
const out = resolve('docs/verify/2026-11-17-repeat-batch48/browser')
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
    if (!localStorage.getItem('__batch48Seeded')) { localStorage.setItem('language', options.language ?? 'ko'); localStorage.setItem('theme', options.dark ? 'dark' : 'light'); localStorage.setItem('__batch48Seeded', '1') }
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




const cc=(page,name,value)=>page.locator(`[data-character-${name}${value===undefined?'':`="${value}"`}]`)
const ccText=page=>cc(page,'content')
const normalize=value=>value.replaceAll('\r\n','\n').replaceAll('\r','\n')
const ccRaw=page=>page.evaluate(keys=>keys.map(key=>window.__nativeStoreGet(key)),[DRAFT_KEY,VERSIONS_KEY])
async function setupCharacter(args,draft=syntheticDraft(),options={}) {await installStoragePorts(args.context,{[DRAFT_KEY]:typeof draft==='string'?draft:JSON.stringify(draft),[VERSIONS_KEY]:JSON.stringify(syntheticVersions())},'character48');await observeDecisionPorts(args.context);await installCharacterPorts(args.context,options);await args.open('character-counter');if(!options.holdRestore)await pageReady(args.page)}
async function pageReady(page){await page.locator('[data-character-ready="true"]').waitFor()}
async function ccSaved(page){await cc(page,'save-status','autosaved').waitFor()}
async function selectedVersion(page){const panel=page.locator('[aria-labelledby="writing-versions-title"]');await panel.getByRole('button',{name:'합성 저장본',exact:false}).first().click();return panel}
async function restoreVersion(page){const panel=await selectedVersion(page);await panel.getByRole('button',{name:tr('characterCounter','versions.restore'),exact:true}).click();await panel.getByRole('button',{name:tr('characterCounter','versions.confirmRestoreButton'),exact:true}).click()}

test('character-early-restore-field-merge',async args=>{
 const {page,context}=args,initial=syntheticDraft();await setupCharacter(args,initial,{holdRestore:true});await poll(async()=>page.evaluate(()=>window.__characterRestores.length>0),'Named initial restore held');await cc(page,'title').fill('복원 전 제목');await ccText(page).fill('복원 전 최신 원문');await cc(page,'tab','1').click();await cc(page,'target').fill('999');await cc(page,'basis','x').click();assert.equal(await page.locator('[data-character-ready="false"]').count(),1);await page.evaluate(()=>window.__releaseCharacterRestore());await pageReady(page);await ccSaved(page);const stored=JSON.parse((await ccRaw(page))[0]);const expected=structuredClone(initial);expected.active=1;Object.assign(expected.tabs[0],{title:'복원 전 제목',text:'복원 전 최신 원문'});Object.assign(expected.tabs[1],{target:999,basis:'x'});assert.deepEqual(stored,expected);assert.equal(await ccText(page).inputValue(),normalize(initial.tabs[1].text));const other=await context.newPage();await args.open('character-counter','',other);await other.evaluate(()=>window.__releaseCharacterRestore());await pageReady(other);assert.equal(await other.locator('[data-character-active="1"]').count(),1);assert.equal(await cc(other,'target').inputValue(),'999');assert.equal(await other.evaluate(key=>window.__storeLog.filter(entry=>entry.key===key).length,DRAFT_KEY),0);return {namedRestoreOnly:true,earlyEditsAcrossTwoTabsMerged:true,untouchedThreeTabsExact:true,activeIntentPreserved:true,revisitExact:true,revisitWrites:0}
})
test('character-copy-native-and-recovery',async args=>{
 const {page}=args;await setupCharacter(args);await ccText(page).fill('합성 전체 원문 😀\n둘째 줄');await ccSaved(page);await cc(page,'copy').click();await cc(page,'copy').getByText(tr('characterCounter','actions.copied'),{exact:true}).waitFor();assert.equal(normalize(await page.evaluate(()=>window.__nativeClipboardRead())),await ccText(page).inputValue());assert.equal(await page.evaluate(()=>window.__clipboardCalls.at(-1)),await ccText(page).inputValue());await page.evaluate(()=>window.__setClipboardMode('absent'));await cc(page,'copy').click();await cc(page,'copy-recovery').waitFor();const text=await cc(page,'copy-manual').inputValue();await cc(page,'copy-select').click();assert.deepEqual(await cc(page,'copy-manual').evaluate(el=>[el.selectionStart,el.selectionEnd]),[0,text.length]);await page.evaluate(()=>{window.__setClipboardMode('reject');window.__legacyMode='throw'});await cc(page,'copy-retry').click();await cc(page,'copy-recovery').waitFor();await page.evaluate(()=>{window.__setClipboardMode('native');window.__legacyMode='false'});await cc(page,'copy-retry').click();await cc(page,'copy').getByText(tr('characterCounter','actions.copied'),{exact:true}).waitFor();await page.evaluate(()=>window.__setClipboardMode('hold'));await cc(page,'copy').click();const legacy=await page.evaluate(()=>window.__legacyCalls.length);await cc(page,'tab','3').click();await page.evaluate(()=>window.__clipboardPending[0].reject(new Error('Old tab copy')));await wait(80);assert.equal(await page.evaluate(()=>window.__legacyCalls.length),legacy);assert.equal(await cc(page,'copy-recovery').count(),0);assert.equal(await cc(page,'copy').innerText(),tr('characterCounter','actions.copy'));await page.evaluate(()=>window.__setClipboardMode('native'));await cc(page,'copy').click();await cc(page,'copy').getByText(tr('characterCounter','actions.copied'),{exact:true}).waitFor();const old=await ccText(page).inputValue();await ccText(page).fill(old+' edit');await ccText(page).fill(old);assert.equal(await cc(page,'copy').innerText(),tr('characterCounter','actions.copy'));await changeLanguage(page,'en');await changeLanguage(page,'ko');assert.equal(await cc(page,'copy').innerText(),tr('characterCounter','actions.copy'));return {nativeWholeClipboard:true,absentFalseAndRejectThrowFail:true,manualExactSelection:true,nativeRetry:true,oldTabFallback:0,inputLocaleAbaNoRevival:true}
})
test('character-transform-undo-revision',async args=>{
 const {page}=args;await setupCharacter(args);await ccText(page).fill('alpha   beta');await cc(page,'transform','collapse').click();assert.equal(await ccText(page).inputValue(),'alpha beta');await cc(page,'undo').click();assert.equal(await ccText(page).inputValue(),'alpha   beta');await cc(page,'transform','collapse').click();await ccText(page).fill('사용자 최신 편집');assert.equal(await cc(page,'undo').isDisabled(),true);await ccText(page).fill('alpha beta');assert.equal(await cc(page,'undo').isDisabled(),true);await cc(page,'transform','collapse').click();assert.equal(await cc(page,'undo').isDisabled(),true);await cc(page,'clear').click();assert.equal(await ccText(page).inputValue(),'');await cc(page,'undo').click();assert.equal(await ccText(page).inputValue(),'alpha beta');await cc(page,'title').fill('복원 전 사용자 제목');await cc(page,'target').fill('1234');await cc(page,'basis','x').click();await ccSaved(page);const original=JSON.parse((await ccRaw(page))[0]).tabs[2];await restoreVersion(page);assert.equal(await ccText(page).inputValue(),normalize(syntheticVersions().versions[0].text));assert.equal(await cc(page,'target').inputValue(),'777');await cc(page,'undo').click();await ccSaved(page);assert.deepEqual(JSON.parse((await ccRaw(page))[0]).tabs[2],original);await cc(page,'transform','upper').click();await cc(page,'tab','1').click();assert.equal(await cc(page,'undo').isDisabled(),true);await cc(page,'tab','2').click();assert.equal(await cc(page,'undo').isDisabled(),false);await cc(page,'undo').click();assert.equal(await ccText(page).inputValue(),original.text);return {transformUndo:true,laterEditAndAbaInvalidate:true,noOpCreatesNoUndo:true,currentClearUndo:true,versionRestoreAllFourFieldsUndo:true,unmodifiedTabRoundtripKeepsOwner:true}
})
test('character-native-clear-lock-ownership',async args=>{
 const {page,context}=args;await setupCharacter(args);const holder=await context.newPage();await args.open('character-counter','',holder);await pageReady(holder);await holdNativeLock(holder,DRAFT_KEY);const before=await ccRaw(page);await cc(page,'clear-all').click();await ccText(page).fill('초기화 대기보다 최신 원고');await releaseNativeLock(holder,DRAFT_KEY);await ccSaved(page);assert.equal(await ccText(page).inputValue(),'초기화 대기보다 최신 원고');assert.equal(await page.evaluate(key=>window.__storeLog.filter(item=>item.key===key&&item.operation==='remove').length,DRAFT_KEY),0);assert.equal((await ccRaw(page))[1],before[1]);await holdNativeLock(holder,DRAFT_KEY);await cc(page,'clear-all').click();const leaving=await ccRaw(page);await page.locator('header a[href="/"]').first().click();await cc(page,'root').waitFor({state:'detached'});await releaseNativeLock(holder,DRAFT_KEY);await wait(80);assert.deepEqual(await ccRaw(page),leaving);await args.open('character-counter');await pageReady(page);await cc(page,'clear-all').click();await poll(async()=>await page.evaluate(key=>window.__nativeStoreGet(key),DRAFT_KEY)===null,'Explicit fresh clear removes only draft');assert.equal(await ccText(page).inputValue(),'');assert.equal((await ccRaw(page))[1],before[1]);return {actualWebLock:true,queuedClearNewEditPreserved:true,oldRemoveCalls:0,spaUnmountCancelsPending:true,freshExplicitClearWorks:true,versionKeyUnchanged:true}
})
test('character-autosave-storage-protection',async args=>{
 const {page,context}=args;const bad='{broken-character';await setupCharacter(args,bad);await cc(page,'save-status','corrupt').waitFor();await ccText(page).fill('손상 중 메모리 편집');assert.equal((await ccRaw(page))[0],bad);await cc(page,'clear-all').click();await poll(async()=>await page.evaluate(key=>window.__nativeStoreGet(key),DRAFT_KEY)===null,'Explicit corrupt draft clear');await page.evaluate(key=>window.__storeModes[key]='quota',DRAFT_KEY);await ccText(page).fill('quota 원고 보존');await cc(page,'save-status','failed').waitFor();assert.equal((await ccRaw(page))[0],null);assert.equal(await ccText(page).inputValue(),'quota 원고 보존');await page.evaluate(key=>delete window.__storeModes[key],DRAFT_KEY);await cc(page,'save-retry').click();await ccSaved(page);const holder=await context.newPage();await args.open('character-counter','',holder);await pageReady(holder);await holdNativeLock(holder,DRAFT_KEY);await ccText(page).fill('대기 첫 문장');await ccText(page).fill('대기 마지막 문장');await releaseNativeLock(holder,DRAFT_KEY);await ccSaved(page);assert.equal(JSON.parse((await ccRaw(page))[0]).tabs[0].text,'대기 마지막 문장');const external=syntheticDraft({active:4});await holder.evaluate(({key,raw})=>window.__nativeStoreSet(key,raw),{key:DRAFT_KEY,raw:JSON.stringify(external)});await ccText(page).fill('외부 저장 뒤 내 편집');await cc(page,'save-status','conflict').waitFor();assert.deepEqual(JSON.parse((await ccRaw(page))[0]),external);assert.equal(await ccText(page).inputValue(),'외부 저장 뒤 내 편집');return {corruptRawKept:true,memoryEditable:true,quotaDraftPreserved:true,explicitRetry:true,nativeQueuedLatestOnly:true,externalCasPreventsOverwrite:true}
})
test('character-speller-gesture-and-stale',async args=>{
 const {page,network}=args;await setupCharacter(args);await ccText(page).fill('외부로 자동 전송하지 않는 합성 원문');await ccSaved(page);await page.evaluate(()=>window.__setClipboardMode('hold'));await cc(page,'speller').click();let opened=await page.evaluate(()=>window.__characterPopupCalls);assert.equal(opened.length,1);assert.deepEqual(opened[0],{url:'https://nara-speller.co.kr/speller/',target:'_blank',features:'noopener,noreferrer',pendingClipboard:1});assert.equal(await page.evaluate(()=>window.__clipboardPending.length),1);await cc(page,'tab','1').click();await page.evaluate(()=>window.__clipboardPending[0].reject(new Error('Old speller copy')));await wait(80);assert.equal(await cc(page,'copy-recovery').count(),0);assert.equal(await page.evaluate(()=>window.__legacyCalls.length),0);await page.evaluate(()=>window.__setClipboardMode('reject'));await cc(page,'speller').click();await cc(page,'copy-recovery').waitFor();assert.equal(await page.evaluate(()=>window.__characterPopupCalls.length),2);assert.ok(!network.some(line=>line.includes('nara-speller')||line.includes('외부로 자동')));return {fixedUrlNoRaw:true,popupRequestedBeforeAwaitSettles:true,nullReturnNotTreatedAsConfirmedBlock:true,mockedExternalPopupOnly:true,oldTabFallback:0,failedCopyRecovery:true,externalRequests:0}
})
test('character-versions-backup-diff-regression',async args=>{
 const {page,context}=args;await context.addInitScript(()=>{const Native=Worker;window.__characterWorkers=0;window.Worker=class extends Native{constructor(...args){super(...args);window.__characterWorkers++}}});await setupCharacter(args,syntheticDraft(),{mockPopup:false});await ccText(page).fill('current alpha\n새 문장 😀');await cc(page,'transform','upper').click();await ccSaved(page);const before=await ccRaw(page);await selectedVersion(page);const backup=await download(page,()=>page.getByRole('button',{name:tr('characterCounter','backup.export'),exact:true}).click(),'character-versions-backup.json');const parsed=JSON.parse(backup.text);assert.equal(parsed.format,'toolhub-writing-versions');assert.deepEqual(parsed.versions,syntheticVersions().versions);assert.equal(await cc(page,'undo').isDisabled(),false);const [target]=await Promise.all([context.waitForEvent('page'),page.locator('[data-writing-diff-send]').click()]);await target.waitForURL('**/diff-viewer/?from=writing-versions');await poll(async()=>await target.locator('#diff-right').inputValue()==='CURRENT ALPHA\n새 문장 😀','Diff handoff received current');assert.equal(await target.locator('#diff-left').inputValue(),normalize(syntheticVersions().versions[0].text));assert.equal(await target.evaluate(()=>opener),null);assert.equal(await target.evaluate(()=>window.__characterWorkers),0);await target.getByRole('button',{name:tr('diffViewer','actions.compare'),exact:true}).click();await target.locator('#diff-result').waitFor();const txt=await download(target,()=>target.getByRole('button',{name:tr('diffViewer','workspace.download'),exact:true}).click(),'character-diff.txt');assert.ok(txt.text.includes('CURRENT ALPHA'));assert.equal(await target.evaluate(()=>window.__characterWorkers),1);assert.deepEqual(await ccRaw(page),before);await cc(page,'undo').click();assert.equal(await ccText(page).inputValue(),'current alpha\n새 문장 😀');return {actualBackupBytes:backup.bytes.length,legacyVersionSchemaExact:true,actualNewDiffTab:true,openerNull:true,noAutomaticWorker:true,explicitWorker:1,actualTxtBytes:txt.bytes.length,sourceRawPreservedAtSend:true,undoOwnerSurvivesExport:true}
})
test('character-320-dark-ko-en',async args=>{
 const {page}=args;await setupCharacter(args);await ccText(page).fill('모바일 합성 한국어 😀\n두 번째 줄');await page.evaluate(()=>window.__setClipboardMode('reject'));await cc(page,'copy').click();await cc(page,'copy-recovery').waitFor();const fields=[cc(page,'content'),cc(page,'title'),cc(page,'target'),cc(page,'copy-manual')],controls=[cc(page,'copy'),cc(page,'copy-select'),cc(page,'copy-retry'),cc(page,'copy-close'),cc(page,'speller')];const ko=await mobile(page,fields,controls);await screenshot(page,'character-320-ko',cc(page,'copy-recovery'));await changeLanguage(page,'en');await cc(page,'copy').click();await cc(page,'copy-recovery').waitFor();const en=await mobile(page,fields,controls);await screenshot(page,'character-320-en',cc(page,'copy-recovery'));await cc(page,'copy-select').focus();await page.keyboard.press('Enter');const text=await cc(page,'copy-manual').inputValue();assert.deepEqual(await cc(page,'copy-manual').evaluate(el=>[el.selectionStart,el.selectionEnd]),[0,text.length]);assert.equal(await ccText(page).inputValue(),'모바일 합성 한국어 😀\n두 번째 줄');return {ko,en,fields16:true,controls44:true,nativeKeyboardManualSelection:true,localePreservesDraft:true,osImeNotTested:true}
},{width:320,dark:true})

// Parent/canonical final readiness received; single Chrome after 44.
const planned = [
  "character-early-restore-field-merge",
  "character-copy-native-and-recovery",
  "character-transform-undo-revision",
  "character-native-clear-lock-ownership",
  "character-autosave-storage-protection",
  "character-speller-gesture-and-stale",
  "character-versions-backup-diff-regression",
  "character-320-dark-ko-en"
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
