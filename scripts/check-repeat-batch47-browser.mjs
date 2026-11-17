import { chromium } from 'playwright'
import assert from 'node:assert/strict'
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import {installDiffPorts,separatedChanges,largeMergeSources} from '../docs/verify/2026-11-17-repeat-batch47/browser-fixtures.mjs'
import {installStoragePorts} from '../docs/verify/2026-11-17-repeat-batch41/browser-fixtures.mjs'
import {DRAFT_KEY,VERSIONS_KEY,syntheticDraft,syntheticVersions} from '../docs/verify/2026-11-17-repeat-batch48/browser-fixtures.mjs'




// Independent real-browser checks. --list never starts Chrome; case-name filters
// preserve previous evidence so only changed boundaries need to be rerun.
const base = process.env.VERIFY_BASE_URL || 'http://127.0.0.1:3039'
const out = resolve('docs/verify/2026-11-17-repeat-batch47/browser')
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
    if (!localStorage.getItem('__batch47Seeded')) { localStorage.setItem('language', options.language ?? 'ko'); localStorage.setItem('theme', options.dark ? 'dark' : 'light'); localStorage.setItem('__batch47Seeded', '1') }
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
  try { detail = await fn({ page, context, open, network, logs }) ?? {}; assert.deepEqual(errors, [], 'JS page errors'); assert.deepEqual(hydration, [], 'Hydration errors'); assert.deepEqual(consoleErrors.filter(value=>/ErrorBoundary|NotFoundError|The above error occurred/i.test(value)),[],'React caught runtime errors'); for (const active of context.pages()) assert.deepEqual(await active.evaluate(() => window.__unhandled), [], 'Unhandled rejections'); assert.ok(!/\b(?:diffViewer|characterCounter|shareResult)\.[a-zA-Z][\w.]+/.test(await page.locator('body').innerText()), 'Raw translation key') }
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




const lm=(page,name,value)=>page.locator(`[data-line-merge-${name}${value===undefined?'':`="${value}"`}]`)
const db=(page,key,language='ko')=>page.getByRole('button',{name:tr('diffViewer',key,language),exact:true})
const documentId=page=>page.locator('[data-line-merge]').getAttribute('data-line-merge-document')
async function setupDiff(args){await observeDecisionPorts(args.context);await installDiffPorts(args.context);await args.open('diff-viewer');await pageReady(args.page)}
async function pageReady(page){await page.locator('[data-line-merge]').waitFor()}
async function inputPair(page,left,right){await page.locator('#diff-left').fill(left);await page.locator('#diff-right').fill(right)}
async function compare(page){const before=await documentId(page);await db(page,'actions.compare').click();await poll(async()=>await documentId(page)!==before,'new native Worker success');assert.equal(await lm(page,'stale').count(),0)}
async function mergedFile(page,filename){return download(page,()=>lm(page,'download').click(),filename)}
async function nativePaste(page,selector,text){await page.evaluate(text=>navigator.clipboard.writeText(text),text);await page.locator(selector).focus();await page.keyboard.press('Control+A');await page.keyboard.press('Control+V');await poll(async()=>await page.locator(selector).inputValue()===text,'native pasted exact text')}
const normalized=value=>value.replaceAll('\r\n','\n').replaceAll('\r','\n')

test('merge-native-mixed-and-empty',async args=>{
 const {page}=args;await setupDiff(args);const left='시작\r\n원본 하나\r\n중복\r\n같은 기준\r\n원본 둘\r\n끝\r\n',right='시작\n수정 하나\n중복\n같은 기준\n수정 둘\n끝\n';await inputPair(page,left,right);await compare(page);assert.equal(await lm(page,'block').count(),2);let file=await mergedFile(page,'merged-original-lf.txt');assert.equal(file.text,normalized(left));await lm(page,'block').nth(0).locator('input[value="modified"]').check();file=await mergedFile(page,'merged-mixed.txt');assert.equal(file.text,'시작\n수정 하나\n중복\n같은 기준\n원본 둘\n끝\n');await lm(page,'all','modified').click();assert.equal((await mergedFile(page,'merged-modified.txt')).text,right);assert.equal(await page.locator('#diff-left').inputValue(),normalized(left));assert.equal(await page.locator('#diff-right').inputValue(),right);await inputPair(page,'','');await compare(page);await lm(page,'empty').waitFor();const empty=await mergedFile(page,'merged-empty.txt');assert.equal(empty.bytes.length,0);await lm(page,'copy').click();await poll(()=>page.evaluate(()=>window.__clipboardCalls.at(-1)===''),'empty native Clipboard request');return {nativeWorker:await page.evaluate(()=>window.__workers),blocks:2,originalMixedModifiedExact:true,inputUnchanged:true,lfAndTrailingNewline:true,emptyBytes:0}
})

test('merge-block-and-result-pagination',async args=>{
 const {page}=args;await setupDiff(args);const pair=separatedChanges();await inputPair(page,pair.left,pair.right);await compare(page);assert.equal(await lm(page,'block').count(),6);await lm(page,'block').first().locator('input[value="modified"]').check();await lm(page,'block-next').click();assert.equal(await lm(page,'block').count(),2);await lm(page,'block').last().locator('input[value="modified"]').check();await lm(page,'block-prev').click();assert.equal(await lm(page,'block').first().locator('input[value="modified"]').isChecked(),true);const expected=pair.left.replace('old 0','new 0').replace('old 7','new 7');assert.equal((await mergedFile(page,'merged-block-pages.txt')).text,expected);
 const left=Array.from({length:600},(_,i)=>`row-${String(i+1).padStart(3,'0')}`).join('\n'),right=left.replace('row-301','changed-301');await inputPair(page,left,right);await compare(page);await lm(page,'all','modified').click();assert.equal(await lm(page,'row').count(),200);assert.equal(await lm(page,'row').first().getAttribute('data-line-merge-row'),'1');await lm(page,'result-next').click();assert.equal(await lm(page,'row').first().getAttribute('data-line-merge-row'),'201');await db(page,'workspace.filter.changes').click();await lm(page,'result-next').click();assert.equal(await lm(page,'row').last().getAttribute('data-line-merge-row'),'600');assert.equal((await mergedFile(page,'merged-600-all.txt')).text,right);return {eightBlocksTwoPages:true,choicesPersist:true,previewPages:[200,200,200],comparisonFilterIndependent:true,fullExportRows:600}
})

test('merge-exact-2mib-and-full-manual',async args=>{
 const {page}=args;await setupDiff(args);const source=largeMergeSources();const timings={};let start=performance.now();await nativePaste(page,'#diff-left',source.left);await nativePaste(page,'#diff-right',source.right);timings.nativePastePairMs=Math.round(performance.now()-start);await page.evaluate(()=>window.__heartbeat=[]);start=performance.now();await compare(page);timings.workerValidationAndCommitMs=Math.round(performance.now()-start);assert.equal(await lm(page,'block').count(),2);start=performance.now();await lm(page,'block').nth(1).locator('input[value="modified"]').check();timings.selectionAndPaintMs=Math.round(performance.now()-start);const file=await mergedFile(page,'merged-exact-2mib.txt');assert.equal(file.bytes.length,2097152);assert.equal(file.text,source.expected);assert.ok(await lm(page,'preview').innerText().then(text=>text.length<50010));assert.ok(await lm(page,'row').count()<=200);await page.evaluate(()=>window.__setClipboardMode('absent'));start=performance.now();await lm(page,'copy').click();await page.locator('[data-diff-copy-expand]').waitFor();assert.equal(await page.locator('[data-diff-copy-manual]').count(),0);await page.locator('[data-diff-copy-expand]').click();assert.equal(await page.locator('[data-diff-copy-manual]').inputValue(),source.expected);await page.locator('[data-diff-copy-select]').click();assert.deepEqual(await page.locator('[data-diff-copy-manual]').evaluate(el=>[el.selectionStart,el.selectionEnd]),[0,source.expected.length]);timings.explicitFullRecoveryAndSelectMs=Math.round(performance.now()-start);const heartbeat=await page.evaluate(()=>({samples:window.__heartbeat.length,maxGapMs:Math.round(Math.max(...window.__heartbeat))}));return {outputBytes:file.bytes.length,inputsEachBytes:1048576,independentStringExact:true,boundedPreview:true,explicitFullRecovery:true,timings,heartbeat,performanceScope:'Wall times include browser/Playwright; heartbeat includes validation, render and full manual textarea. Not isolated Worker CPU.'}
})

test('merge-last-success-stale-cancel-reset',async args=>{
 const {page}=args;await setupDiff(args);const pair=separatedChanges(2);await inputPair(page,pair.left,pair.right);await compare(page);await lm(page,'all','modified').click();const before=await documentId(page);await page.locator('#diff-left').fill('different input');await lm(page,'stale').waitFor();assert.equal((await mergedFile(page,'merged-stale-confirmed.txt')).text,pair.right);await db(page,'actions.swap').click();assert.equal(await documentId(page),before);assert.equal(await lm(page,'all','modified').isDisabled(),true);await page.evaluate(()=>window.__workerMode='hold');await db(page,'actions.compare').click();await poll(()=>page.evaluate(()=>window.__workerPending.length===1),'actual Worker reply held');await db(page,'workspace.cancel').click();await page.evaluate(()=>window.__workerPending.shift()());assert.equal(await documentId(page),before);assert.equal((await mergedFile(page,'merged-after-cancel.txt')).text,pair.right);await page.evaluate(()=>window.__workerMode='native');await compare(page);assert.notEqual(await documentId(page),before);assert.equal(await lm(page,'all','original').isDisabled(),true);await db(page,'actions.clear').click();assert.equal(await page.locator('[data-line-merge]').count(),0);return {lastSuccessChoicesSurviveEditSwapCancel:true,lateNativeReplyIgnored:true,newSuccessResetsOriginal:true,clearRemovesMerge:true}
})

test('merge-native-source-validation',async args=>{
 const {page}=args;await setupDiff(args);await inputPair(page,'source alpha\nanchor\nsource beta','target alpha\nanchor\nsource beta');await compare(page);await lm(page,'all','modified').click();const id=await documentId(page),expected='target alpha\nanchor\nsource beta';await page.evaluate(()=>window.__workerMode='tamper');await page.locator('#diff-right').fill('new target\nanchor\nsource beta');await db(page,'actions.compare').click();await page.getByText(tr('diffViewer','workspace.errors.invalidResponse'),{exact:true}).waitFor();assert.equal(await documentId(page),id);assert.equal((await mergedFile(page,'merged-after-invalid-response.txt')).text,expected);const records=await page.evaluate(()=>window.__workers);assert.ok(records.at(-1).received);assert.equal(records.at(-1).terminated,1);await page.evaluate(()=>window.__workerMode='native');await compare(page);return {actualWorkerReplyTamperedAfterNativeExecution:true,shapePreservedButSourceMismatchRejected:true,lastSuccessAndChoicesPreserved:true,workerTerminated:true,subsequentNativeSuccess:true}
})

test('merge-output-ownership-and-recovery',async args=>{
 const {page}=args;await setupDiff(args);await inputPair(page,'one\nold\nend','one\nnew\nend');await compare(page);await lm(page,'all','modified').click();await lm(page,'copy').click();await page.locator('[data-diff-output-status]').waitFor();assert.equal(await page.evaluate(()=>window.__nativeClipboardRead()),'one\r\nnew\r\nend');assert.equal(await page.evaluate(()=>window.__clipboardCalls.at(-1)),'one\nnew\nend');await page.evaluate(()=>window.__setClipboardMode('absent'));await lm(page,'copy').click();const field=page.locator('[data-diff-copy-manual]');await page.locator('[data-diff-copy-expand]').click();await field.waitFor();assert.equal(await field.inputValue(),'one\nnew\nend');await page.locator('[data-diff-copy-select]').click();assert.deepEqual(await field.evaluate(el=>[el.selectionStart,el.selectionEnd]),[0,11]);await page.evaluate(()=>window.__setClipboardMode('native'));await page.locator('[data-diff-copy-retry]').click();await field.waitFor({state:'detached'});
 await page.evaluate(()=>window.__setClipboardMode('hold'));await lm(page,'copy').click();await page.locator('[data-diff-output="download-comparison"]').click();const fallback=await page.evaluate(()=>window.__legacyCalls.length);await page.evaluate(()=>window.__clipboardPending.shift().reject(new Error('late merged failure')));await wait(80);assert.equal(await page.evaluate(()=>window.__legacyCalls.length),fallback);assert.equal(await page.locator('[data-diff-copy-recovery]').count(),0);
 await page.locator('[data-diff-output="copy-comparison"]').click();await lm(page,'all','original').click();await page.evaluate(()=>{window.__setClipboardMode('native')});await lm(page,'copy').click();await page.evaluate(()=>window.__clipboardPending.shift().reject(new Error('late comparison failure')));await wait(80);assert.equal(await page.evaluate(()=>window.__legacyCalls.length),fallback);assert.equal(normalized(await page.evaluate(()=>window.__nativeClipboardRead())),'one\nold\nend');await page.locator('#diff-right').fill('edit');await page.locator('#diff-right').fill('one\nnew\nend');assert.equal(await page.locator('[data-diff-output-status]').count(),0);await changeLanguage(page,'en');await changeLanguage(page,'ko');assert.equal(await page.locator('[data-diff-output-status]').count(),0);return {nativeClipboardPayloadExact:true,windowsClipboardCrLfSeparated:true,manualSelectAndRetry:true,mergedPendingComparisonDownloadOldFallback:0,comparisonPendingMergedCopyOldFallback:0,inputLocaleAbaNoRevival:true}
})

test('merge-writing-handoff-new-tab',async args=>{
 const {page,context}=args;const draft=syntheticDraft(),versions=syntheticVersions();await installStoragePorts(context,{[DRAFT_KEY]:JSON.stringify(draft),[VERSIONS_KEY]:JSON.stringify(versions)},'merge47');await installDiffPorts(context);await args.open('character-counter');await page.locator('[data-character-ready="true"]').waitFor();const panel=page.locator('[aria-labelledby="writing-versions-title"]');await panel.getByRole('button',{name:versions.versions[0].name,exact:false}).first().click();const sourceBefore=await page.evaluate(keys=>keys.map(key=>localStorage.getItem(key)),[DRAFT_KEY,VERSIONS_KEY]);const incoming=context.waitForEvent('page');await page.locator('[data-writing-diff-send]').click();const target=await incoming;await target.waitForURL('**/diff-viewer/?from=writing-versions');await target.locator('[data-writing-diff-handoff="loaded"]').waitFor();assert.equal(await target.evaluate(()=>opener),null);assert.equal(await target.evaluate(()=>window.__workers.length),0);assert.equal(await target.locator('[data-line-merge]').count(),0);assert.equal(await target.locator('#diff-left').inputValue(),normalized(versions.versions[0].text));assert.equal(await target.locator('#diff-right').inputValue(),normalized(draft.tabs[draft.active].text));const button=db(target,'actions.compare');await button.click();await pageReady(target);await lm(target,'all','modified').click();const file=await mergedFile(target,'merged-from-writing.txt');assert.equal(file.text,normalized(draft.tabs[draft.active].text));assert.deepEqual(await page.evaluate(keys=>keys.map(key=>localStorage.getItem(key)),[DRAFT_KEY,VERSIONS_KEY]),sourceBefore);assert.equal(await target.evaluate(()=>sessionStorage.getItem('toolhub-writing-diff-v1')),null);const pendingPayload=JSON.stringify({version:1,source:'writing-versions',createdAt:Date.now(),left:{role:'saved',name:'pending saved',title:'',sourceTab:1,text:'incoming original'},right:{role:'current',title:'',sourceTab:1,text:'incoming modified'}});await target.evaluate(raw=>{sessionStorage.setItem('toolhub-writing-diff-v1',raw);sessionStorage.setItem('__holdMergeReceiver','1')},pendingPayload);await args.open('diff-viewer','?from=writing-versions',target);await pageReady(target);await poll(()=>target.evaluate(()=>window.__receiverQueue.some(item=>item.active)),'pending receiver');await lm(target,'all','modified').click();const chosenId=await documentId(target);await target.evaluate(()=>window.__releaseReceiver());await target.locator('[data-writing-diff-handoff="edited"]').waitFor();assert.equal(await documentId(target),chosenId);assert.equal(await lm(target,'all','modified').isDisabled(),true);assert.equal(await target.evaluate(()=>sessionStorage.getItem('toolhub-writing-diff-v1')),pendingPayload);return {actualNewTab:true,openerNull:true,autoWorkers:0,explicitNativeWorker:true,currentDraftMergedExact:true,sourceFiveTabsAndSavedVersionsRawUnchanged:true,oneTimeHandoffConsumed:true,pendingReceiverUserMergeSelectionPreserved:true,txtBytes:file.bytes.length}
})

test('merge-320-dark-ko-en',async args=>{
 const {page}=args;await setupDiff(args);await inputPair(page,'원본 합성 문장\n공통\n두 번째 원본','수정된 합성 문장\n공통\n두 번째 수정');await compare(page);const radio=lm(page,'block').first().locator('input[value="original"]');await radio.focus();await page.keyboard.press('ArrowRight');assert.equal(await lm(page,'block').first().locator('input[value="modified"]').isChecked(),true);const checks={};for(const language of ['ko','en']){if(language==='en')await changeLanguage(page,'en');await page.evaluate(()=>window.__setClipboardMode('absent'));await lm(page,'copy').click();await page.locator('[data-diff-copy-expand]').click();await page.locator('[data-diff-copy-manual]').waitFor();checks[language]=await mobile(page,[page.locator('#diff-left'),page.locator('#diff-right'),page.locator('[data-diff-copy-manual]')],[lm(page,'copy'),lm(page,'download'),page.locator('[data-diff-copy-select]')]);await screenshot(page,`line-merge-320-${language}`,page.locator('[data-line-merge]'));await page.locator('[data-diff-copy-close]').click()}return {geometry:checks,radioArrowKeyboard:true,fieldsAtLeast16:true,buttonsAtLeast44:true}
},{width:320,dark:true,touch:true})

test('merge-jump-320-ko-en-impact',async args=>{
 const {page}=args;await setupDiff(args);const left=Array.from({length:600},(_,i)=>'anchor-line-'+i).join('\n'),right=left.replace('anchor-line-300','modified-line-300');await inputPair(page,left,right);await compare(page);await lm(page,'all','modified').click();const id=await documentId(page),before=await page.evaluate(()=>window.__workers.length),checks={};for(const language of ['ko','en']){if(language==='en')await changeLanguage(page,'en');const link=page.locator('[data-line-merge-jump]');await link.scrollIntoViewIfNeeded();assert.equal(await link.getAttribute('href'),'#line-merge-result');await link.click();await poll(async()=>{const rect=await page.locator('#line-merge-result').boundingBox();return rect.y>=55&&rect.y<150},'jump target below mobile header');assert.equal(new URL(page.url()).hash,'#line-merge-result');assert.equal(await page.locator('#diff-left').inputValue(),left);assert.equal(await page.locator('#diff-right').inputValue(),right);assert.equal(await documentId(page),id);assert.equal(await lm(page,'all','modified').isDisabled(),true);assert.equal(await page.evaluate(()=>window.__workers.length),before);checks[language]=await page.locator('#line-merge-result').boundingBox();await page.screenshot({path:resolve(out,'line-merge-jump-320-'+language+'.png'),caret:'initial'})}return {anchor:'line-merge-result',targetGeometry:checks,inputsAndChoicesUnchanged:true,additionalWorkers:0,onlyHashChanged:true}
},{width:320,dark:true,touch:true})

const planned=cases.map(item=>item.name)
if(only==='--list')console.log(planned.join('\n'))
else {
 const selected=cases.filter(item=>!only||only.split(',').some(part=>item.name.includes(part)));assert.ok(selected.length,'No selected cases');mkdirSync(out,{recursive:true});const browser=await chromium.launch({channel:'chrome'});
 try{for(const scenario of selected)await run(browser,scenario)}finally{await browser.close();const merged=readdirSync(out).filter(name=>name.endsWith('-evidence.json')).map(name=>JSON.parse(readFileSync(resolve(out,name),'utf8')));const final={checkedAt:new Date().toISOString(),passed:merged.filter(item=>item.status==='pass').length,failed:merged.filter(item=>item.status==='fail').length,browserClosed:true,results:merged};writeFileSync(resolve(out,'final-results.json'),JSON.stringify(final,null,2));console.log(JSON.stringify({passed:final.passed,failed:final.failed,browserClosed:true}))}if(results.some(item=>item.status!=='pass'))process.exitCode=1
}
