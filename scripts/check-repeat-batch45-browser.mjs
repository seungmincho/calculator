import { chromium } from 'playwright'
import assert from 'node:assert/strict'
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import {installStoragePorts,holdNativeLock,releaseNativeLock,installNativeFiles} from '../docs/verify/2026-11-17-repeat-batch41/browser-fixtures.mjs'




// Independent real-browser checks. --list never starts Chrome; case-name filters
// preserve previous evidence so only changed boundaries need to be rerun.
const base = process.env.VERIFY_BASE_URL || 'http://127.0.0.1:3039'
const out = resolve('docs/verify/2026-11-17-repeat-batch45/browser')
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
  const errors = [], hydration = [], external = [], consoleErrors = [], network = [], logs = [], allowedFonts=[],fontAssets=new Set()
  await context.addInitScript(options => {
    if (!/^https?:$/.test(location.protocol)) return
    if (!localStorage.getItem('__batch45Seeded')) { localStorage.setItem('language', options.language ?? 'ko'); localStorage.setItem('theme', options.dark ? 'dark' : 'light'); localStorage.setItem('__batch45Seeded', '1') }
    window.__unhandled = []; addEventListener('unhandledrejection', event => window.__unhandled.push(String(event.reason)))

  }, options)
  await context.route('**/*', async route => { const request = route.request(); network.push(request.url() + '\n' + (request.postData() ?? '')); const url = new URL(request.url()); if (url.origin === base || ['blob:', 'data:'].includes(url.protocol)) return route.continue();if(options.realFonts&&url.hostname==='fonts.googleapis.com'&&/^(Noto Serif KR|Nanum Gothic)(:|$)/.test(url.searchParams.get('family')??'')){const response=await route.fetch(),css=await response.text();for(const match of css.matchAll(/url\(([^)]+)\)/g)){const asset=match[1].replace(/^['"]|['"]$/g,'');if(new URL(asset).hostname==='fonts.gstatic.com')fontAssets.add(asset)}allowedFonts.push({type:'stylesheet',status:response.status(),url:url.href});return route.fulfill({response})}if(options.realFonts&&fontAssets.has(url.href)){const response=await route.fetch();allowedFonts.push({type:'font',status:response.status(),url:url.href});return route.fulfill({response})}external.push(url.href); return route.abort('blockedbyclient') })
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
  try { detail = await fn({ page, context, open, network, logs, browser,allowedFonts }) ?? {}; assert.deepEqual(errors, [], 'JS page errors'); assert.deepEqual(hydration, [], 'Hydration errors'); assert.deepEqual(consoleErrors.filter(value=>/ErrorBoundary|NotFoundError|The above error occurred/i.test(value)),[],'React caught runtime errors'); for (const active of context.pages()) assert.deepEqual(await active.evaluate(() => window.__unhandled), [], 'Unhandled rejections'); assert.ok(!/\b(?:fontPreview|shareResult)\.[a-zA-Z][\w.]+/.test(await page.locator('body').innerText()), 'Raw translation key') }
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



const KEY='toolhub:font-pair:profiles'
const stylesA={title:{fontId:'song-myung',size:48,weight:900},body:{fontId:'nanum-gothic',size:20,weight:600}}
const stylesB={title:{fontId:'noto-serif-kr',size:36,weight:700},body:{fontId:'nanum-gothic',size:16,weight:400}}
const profile=(id='one',name='합성 스타일',styles=stylesA)=>({id,name,styles})
const envelope=profiles=>JSON.stringify({version:1,profiles})
const fileBody=profiles=>JSON.stringify({app:'toolhub-font-pair-profiles',version:1,exportedAt:'2026-11-17T00:00:00.000Z',profiles})
const f=(key,lang='ko')=>tr('fontPreview',`pairing.${key}`,lang)
const pair=page=>page.locator('[aria-labelledby="font-pair-title"]')
const profiles=page=>page.locator('[data-font-pair-profiles]')
const backup=page=>page.locator('[data-font-pair-backup]')
const action=(page,id)=>page.locator(`[data-font-pair-backup-${id}]`)
const role=(page,part,lang='ko')=>pair(page).getByRole('group',{name:f(`roles.${part}`,lang),exact:true})
const textField=(page,part,lang='ko')=>role(page,part,lang).getByRole('textbox')
const row=(page,name)=>profiles(page).locator('ul[aria-label]').locator(':scope > li').filter({has:page.getByRole('heading',{name,exact:true})})
async function shape(page){const value={};for(const part of ['title','body'])value[part]={fontId:await role(page,part).locator('select').first().inputValue(),weight:Number(await role(page,part).locator('select').last().inputValue()),size:Number(await role(page,part).locator('input[type="range"]').inputValue())};return value}
async function ready(page){if(new URL(page.url()).searchParams.get('pair')!=='1'&&!await pair(page).count())await page.getByRole('button',{name:f('open'),exact:true}).click();await pair(page).waitFor();await poll(async()=>await page.locator('#font-pair-profile-name').isEnabled(),'Font profile ready')}
async function setup(args,list=[],query='?pair=1'){await installStoragePorts(args.context,{[KEY]:envelope(list)},'font-backup');await installNativeFiles(args.context);await args.open('font-preview',query);await ready(args.page)}
async function upload(page,body,name='synthetic-profiles.json'){await action(page,'file').setInputFiles({name,mimeType:'application/json',buffer:Buffer.from(body)});await action(page,'preview').waitFor()}
async function stored(page){return page.evaluate(key=>JSON.parse(window.__nativeStoreGet(key)).profiles,KEY)}
async function refresh(page){await profiles(page).getByRole('button',{name:f('profiles.refresh'),exact:true}).click()}
async function load(page,name){await row(page,name).getByRole('button',{name:f('profiles.load'),exact:true}).click()}

test('font-backup-isolated-download-import-load',async args=>{
 const {page,browser}=args;await setup(args,[profile()]);await textField(page,'title').fill('Private synthetic title');await textField(page,'body').fill('Private synthetic body');const file=await download(page,()=>action(page,'download').click(),'actual-export.json');assert.equal(file.filename,'toolhub-font-pair-profiles.json');const parsed=JSON.parse(file.text);assert.equal(parsed.app,'toolhub-font-pair-profiles');assert.equal(parsed.version,1);assert.deepEqual(parsed.profiles,[profile()]);assert.ok(!file.text.includes('Private synthetic'));const destination=await browser.newContext({serviceWorkers:'block',viewport:{width:1280,height:900}});const errors=[];try{await destination.route('**/*',route=>new URL(route.request().url()).origin===base?route.continue():route.abort('blockedbyclient'));await installStoragePorts(destination,{language:'ko',[KEY]:envelope([])},'font-backup');await installNativeFiles(destination);const target=await destination.newPage();target.on('pageerror',error=>errors.push(error.message));await target.goto(`${base}/font-preview/?pair=1`,{waitUntil:'domcontentloaded'});await ready(target);await textField(target,'title').fill('Destination title');await textField(target,'body').fill('Destination body');const before=await shape(target);await upload(target,file.text);assert.deepEqual(await stored(target),[]);await action(target,'confirm').click();await action(target,'saved').waitFor();const imported=await stored(target);assert.equal(imported.length,1);assert.notEqual(imported[0].id,profile().id);assert.deepEqual(imported[0].styles,stylesA);assert.deepEqual(await shape(target),before);await load(target,profile().name);assert.deepEqual(await shape(target),stylesA);assert.equal(await textField(target,'title').inputValue(),'Destination title');assert.equal(await textField(target,'body').inputValue(),'Destination body');assert.deepEqual(await stored(page),[profile()]);assert.deepEqual(errors,[]);return {nativeJsonBytes:file.bytes.length,isolatedContexts:true,wholeProfileExact:true,manuscriptsExcluded:true,newId:true,previewDoesNotWrite:true,importDoesNotApply:true,explicitLoadPreservesBothTexts:true,sourceStorageUnchanged:true}}finally{await destination.close()}
})
test('font-backup-selection-names-slots-and-invalid',async args=>{
 const {page}=args;await setup(args,Array.from({length:5},(_,i)=>profile(`old${i}`,i?'기존'+i:'same')));const incoming=[profile('i1','ＳＡＭＥ'),profile('i2','새 스타일')];await upload(page,fileBody(incoming));assert.equal(await action(page,'confirm').isDisabled(),true);await page.locator('[data-font-pair-backup-row="i1"] input[type="text"], [data-font-pair-backup-row="i1"] input:not([type])').fill('새 이름');assert.equal(await action(page,'confirm').isDisabled(),true);await page.locator('[data-font-pair-backup-row="i2"] input[type="checkbox"]').uncheck();await action(page,'confirm').click();await action(page,'saved').waitFor();assert.equal((await stored(page)).length,6);const basis=await page.evaluate(key=>window.__nativeStoreGet(key),KEY);for(const [name,body] of [['future.json',fileBody([profile()]).replace('"version":1','"version":2')],['unknown.json',fileBody([profile('bad','unknown',{...stylesA,title:{...stylesA.title,fontId:'unknown-font'}})])],['extra.json',JSON.stringify({...JSON.parse(fileBody([profile()])),text:'not allowed'})]]){await action(page,'file').setInputFiles({name,mimeType:'application/json',buffer:Buffer.from(body)});await action(page,'error').waitFor();assert.equal(await action(page,'preview').count(),0);assert.equal(await page.evaluate(key=>window.__nativeStoreGet(key),KEY),basis)}const reads=await page.evaluate(()=>window.__fileReads.length);await action(page,'file').setInputFiles({name:'too-large.json',mimeType:'application/json',buffer:Buffer.alloc(65537,32)});await action(page,'error').waitFor();assert.equal(await page.evaluate(()=>window.__fileReads.length),reads);const valid=fileBody([profile('limit','limit')]);await upload(page,valid+' '.repeat(65536-Buffer.byteLength(valid)));assert.equal(await action(page,'preview').count(),1);return {nfkcDuplicateBlocked:true,selectedNameEdited:true,slotsSixNoOverwrite:true,invalidWholeFiles:3,over64KiBBeforeRead:true,exact65536BytesAccepted:true}
})
test('font-backup-native-lock-conflict-unknown',async args=>{
 const {page,context,open}=args;await setup(args);const other=await context.newPage();await open('font-preview','?pair=1',other);await ready(other);await upload(page,fileBody([profile()]));await holdNativeLock(other,KEY);await action(page,'confirm').click();const changed=envelope([profile('external','외부')]);await other.evaluate(({key,raw})=>window.__nativeStoreSet(key,raw),{key:KEY,raw:changed});await releaseNativeLock(other,KEY);await poll(async()=>!(await action(page,'cancel').count())||await action(page,'confirm').isDisabled(),'External change blocks import');assert.equal(await page.evaluate(key=>window.__nativeStoreGet(key),KEY),changed);await refresh(page);await upload(page,fileBody([profile()]));await page.evaluate(key=>window.__storeModes[key]='quota',KEY);await action(page,'confirm').click();await page.locator('[data-font-pair-backup-error="quota"]').waitFor();assert.equal(await action(page,'preview').count(),1);assert.equal(await page.evaluate(key=>window.__nativeStoreGet(key),KEY),changed);await page.evaluate(key=>window.__storeModes[key]='readback-once',KEY);await action(page,'confirm').click();await page.locator('[data-font-pair-backup-error="unknownWrite"]').waitFor();assert.equal((await stored(page)).length,2);await page.evaluate(key=>delete window.__storeModes[key],KEY);await refresh(page);assert.equal((await stored(page)).length,2);return {actualTwoTabsAndWebLocks:true,stalePreviewNoWrite:true,quotaKeepsSelectionAndRaw:true,writeUnknownStoredNoRollback:true,explicitReloadObservesCommittedList:true}
})
test('font-backup-late-read-cancel-and-leave',async args=>{
 const {page}=args;await setup(args);await page.evaluate(()=>window.__fileMode='hold');await action(page,'file').setInputFiles({name:'old.json',mimeType:'application/json',buffer:Buffer.from(fileBody([profile('old','옛 파일')]))});await poll(async()=>page.evaluate(()=>window.__fileReads.at(-1)?.completed),'Native old file read');await action(page,'cancel').click();assert.equal(await action(page,'choose').evaluate(el=>document.activeElement===el),true);await page.evaluate(()=>window.__fileReads.at(-1).release());await wait(50);assert.equal(await action(page,'preview').count(),0);await action(page,'file').setInputFiles({name:'old2.json',mimeType:'application/json',buffer:Buffer.from(fileBody([profile('old2','옛 두번째')]))});await poll(async()=>page.evaluate(()=>window.__fileReads.at(-1)?.completed),'Second delayed file');const old=await page.evaluate(()=>window.__fileReads.length-1);await page.evaluate(()=>window.__fileMode='native');await upload(page,fileBody([profile('latest','최신 파일')]));await page.evaluate(index=>window.__fileReads[index].reject(),old);assert.equal(await page.locator('[data-font-pair-backup-row="latest"]').count(),1);await action(page,'cancel').click();await page.evaluate(()=>window.__fileMode='hold');await action(page,'file').setInputFiles({name:'leaving.json',mimeType:'application/json',buffer:Buffer.from(fileBody([profile()]))});await poll(async()=>page.evaluate(()=>window.__fileReads.at(-1)?.completed),'Leaving file ready');await page.getByRole('button',{name:f('close'),exact:true}).click();await pair(page).waitFor({state:'detached'});await page.evaluate(()=>window.__fileReads.at(-1).release());await page.getByRole('button',{name:f('open'),exact:true}).click();await ready(page);assert.equal(await action(page,'preview').count(),0);assert.deepEqual(await stored(page),[]);return {nativeFileTextDelayedDelivery:true,cancelRestoresActualFocus:true,lateRejectionKeepsNewPreview:true,collapseUnmountLateReadIgnored:true,storageWrites:0}
})
test('font-backup-existing-save-delete-pending',async args=>{
 const {page,context,open}=args;await setup(args,[profile()]);const other=await context.newPage();await open('font-preview','?pair=1',other);await ready(other);const basis=await page.evaluate(key=>window.__nativeStoreGet(key),KEY);await holdNativeLock(other,KEY);await page.locator('#font-pair-profile-name').fill('대기 저장');await profiles(page).getByRole('button',{name:f('profiles.save'),exact:true}).click();await page.getByRole('button',{name:f('close'),exact:true}).click();await releaseNativeLock(other,KEY);await wait(80);assert.equal(await page.evaluate(key=>window.__nativeStoreGet(key),KEY),basis);await page.getByRole('button',{name:f('open'),exact:true}).click();await ready(page);await holdNativeLock(other,KEY);await row(page,profile().name).getByRole('button',{name:f('profiles.delete'),exact:true}).click();await row(page,profile().name).getByRole('button',{name:f('profiles.deleteConfirm'),exact:true}).click();await page.getByRole('button',{name:f('close'),exact:true}).click();await releaseNativeLock(other,KEY);await wait(80);assert.equal(await page.evaluate(key=>window.__nativeStoreGet(key),KEY),basis);await page.getByRole('button',{name:f('open'),exact:true}).click();await ready(page);await page.locator('#font-pair-profile-name').fill('새 명시 저장');await profiles(page).getByRole('button',{name:f('profiles.save'),exact:true}).click();await poll(async()=>(await stored(page)).length===2,'New explicit save after remount');await row(page,'새 명시 저장').getByRole('button',{name:f('profiles.delete'),exact:true}).click();await row(page,'새 명시 저장').getByRole('button',{name:f('profiles.deleteConfirm'),exact:true}).click();await poll(async()=>(await stored(page)).length===1,'Explicit delete still works');return {oldPendingAddAfterUnmount:0,oldPendingDeleteAfterUnmount:0,newExplicitSaveAndDelete:true,originalProfilePreserved:true}
})
test('font-backup-320-dark-ko-en',async args=>{
 const {page}=args;await setup(args,[profile('existing','Same')]);await upload(page,fileBody([profile('incoming','ｓａｍｅ')]));const name=page.locator('[data-font-pair-backup-row="incoming"] input:not([type="checkbox"])');const fields=[name,page.locator('#font-pair-profile-name')],controls=[action(page,'download'),action(page,'choose'),action(page,'confirm'),action(page,'cancel')];const ko=await mobile(page,fields,controls);await name.focus();await page.keyboard.press('Control+a');await page.keyboard.type('Keyboard profile');assert.equal(await name.inputValue(),'Keyboard profile');await screenshot(page,'font-backup-320-ko',backup(page));await changeLanguage(page,'en');await page.getByRole('heading',{name:f('backup.title','en'),exact:true}).waitFor();const en=await mobile(page,fields,controls);await screenshot(page,'font-backup-320-en',backup(page));await action(page,'cancel').click();assert.equal(await action(page,'choose').evaluate(el=>document.activeElement===el),true);return {ko,en,fields16:true,controls44:true,keyboardRenameAndCancelFocus:true,localeNoAutoImport:true}
},{width:320,dark:true})
test('font-backup-real-selected-fonts',async args=>{
 const {page,allowedFonts}=args;await setup(args,[],'?pair=1&pairTitleFont=noto-serif-kr&pairBodyFont=nanum-gothic&pairTitleText=ToolHub&pairBodyText=Public%20font%20verification');await upload(page,fileBody([profile('real','Public fonts',stylesB)]));await action(page,'confirm').click();await action(page,'saved').waitFor();await load(page,'Public fonts');let faces=[];await poll(async()=>{faces=await page.evaluate(async()=>{const out=[];for(const [family,weight,text]of[['Noto Serif KR',700,'ToolHub'],['Nanum Gothic',400,'Public font verification']]){const loaded=await document.fonts.load(`${weight} 20px "${family}"`,text);out.push({family,weight,count:loaded.length,loaded:loaded.every(face=>face.status==='loaded')})}return out});return faces.every(face=>face.count>0&&face.loaded)},'Actual selected font faces loaded',300);await pair(page).getByText(f('fontStatus.loading'),{exact:true}).waitFor({state:'hidden'});writeFileSync(resolve(out,'actual-two-fonts.json'),JSON.stringify({faces,requests:allowedFonts},null,2));assert.ok(faces.every(face=>face.count>0&&face.loaded));assert.ok(allowedFonts.filter(item=>item.type==='font'&&item.status===200).length>=2);assert.ok(allowedFonts.every(item=>item.status===200));assert.deepEqual(await shape(page),stylesB);return {actualDocumentFonts:faces,allowlistedFontsOnly:allowedFonts,realOsFontRasterizationNotCompared:true}
},{realFonts:true})

// Actual cases execute only after author/canonical ready.
const planned = ["font-backup-isolated-download-import-load","font-backup-selection-names-slots-and-invalid","font-backup-native-lock-conflict-unknown","font-backup-late-read-cancel-and-leave","font-backup-existing-save-delete-pending","font-backup-320-dark-ko-en","font-backup-real-selected-fonts"]
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

