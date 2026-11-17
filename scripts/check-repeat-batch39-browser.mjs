import { chromium } from 'playwright'
import assert from 'node:assert/strict'
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { installRegexPorts, regexQuery, workerStats } from '../docs/verify/2026-11-17-repeat-batch39/browser-fixtures.mjs'




// Independent real-browser checks. --list never starts Chrome; case-name filters
// preserve previous evidence so only changed boundaries need to be rerun.
const base = process.env.VERIFY_BASE_URL || 'http://127.0.0.1:3039'
const out = resolve('docs/verify/2026-11-17-repeat-batch39/browser')
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
  const context = await browser.newContext({ viewport: { width: options.width ?? 1280, height: 900 }, timezoneId: 'Asia/Seoul', serviceWorkers: 'block', permissions: ['clipboard-read', 'clipboard-write'], acceptDownloads: true })
  const errors = [], hydration = [], external = [], consoleErrors = [], network = [], logs = []
  await context.addInitScript(options => {
    if (!/^https?:$/.test(location.protocol)) return
    if (!localStorage.getItem('__batch39Seeded')) { localStorage.setItem('language', options.language ?? 'ko'); localStorage.setItem('theme', options.dark ? 'dark' : 'light'); localStorage.setItem('__batch39Seeded', '1') }
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
  try { detail = await fn({ page, context, open, network, logs }) ?? {}; assert.deepEqual(errors, [], 'JS page errors'); assert.deepEqual(hydration, [], 'Hydration errors'); assert.deepEqual(consoleErrors.filter(value=>/ErrorBoundary|NotFoundError|The above error occurred/i.test(value)),[],'React caught runtime errors'); for (const active of context.pages()) assert.deepEqual(await active.evaluate(() => window.__unhandled), [], 'Unhandled rejections'); assert.ok(!/\b(?:regexExtractor|shareResult)\.[a-zA-Z][\w.]+/.test(await page.locator('body').innerText()), 'Raw translation key') }
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



const action=(page,name)=>page.locator(`[data-regex-action="${name}"]`)
const output=page=>page.locator('[data-regex-output]')
async function status(page,value){await page.locator(`[data-regex-status="${value}"]`).waitFor()}
async function completed(page,expected){await status(page,'complete');if(expected!==undefined)await poll(async()=>await output(page).inputValue()===expected,'Exact expected Worker output')}
async function setup(args,job={}){await installRegexPorts(args.context);await observeDecisionPorts(args.context);await args.open('regex-extractor',regexQuery(job));await completed(args.page);}
async function navigateJob(page,job,extra=''){await page.evaluate(query=>{history.pushState(history.state,'',query);dispatchEvent(new PopStateEvent('popstate'))},regexQuery(job,extra));}
async function paste(page,locator,text){await page.evaluate(text=>navigator.clipboard.writeText(text),text);await locator.focus();await page.keyboard.press('Control+A');await page.keyboard.press('Control+V');const normalized=text.replace(/\r\n?/g,'\n');await poll(async()=>await locator.inputValue()===normalized,'Native paste input');}
async function smart(page,id,description){const title=tr('regexExtractor',`smartModes.${id}.title`);await page.getByRole('button').filter({has:page.getByText(title,{exact:true})}).click();if(description!==undefined)await page.getByRole('textbox',{name:title,exact:true}).fill(description);await page.getByRole('button',{name:tr('regexExtractor','smartMode.apply'),exact:true}).click();}

test('regex-native-worker-empty-matches-and-legacy',async args=>{
  const {page}=args;await setup(args,{pattern:'(a)(b)?',flags:'',inputText:'a ab'});await completed(page,['a','a',''].join('\n'))
  await navigateJob(page,{operation:'grep',pattern:'^keep',flags:'gm',inputText:'skip\r\nkeep A\r\nkeep B\r\n'});await completed(page,'keep A\nkeep B\n');const crlf=await download(page,()=>action(page,'download').click(),'crlf-grep.txt');assert.deepEqual(crlf.bytes,Buffer.from('keep A\r\nkeep B\r'))
  const text='abX ab',replacement="$$|$&|$1|$2|$`|$'";await navigateJob(page,{operation:'replace',pattern:'(a)(b)',flags:'g',inputText:text,replacement});await completed(page,text.replace(/(a)(b)/g,replacement))
  await navigateJob(page,{operation:'extract',pattern:'(?=.)|$',flags:'gu',inputText:'😀A'});await completed(page,'\n\n');await navigateJob(page,{operation:'replace',pattern:' ',flags:'g',inputText:'a b  c',replacement:'_'});await completed(page,'a_b__c')
  await page.locator('#regex-pattern').fill('ZZZ');await completed(page,'a b  c');await page.getByRole('group',{name:tr('regexExtractor','operation.title'),exact:true}).getByRole('button',{name:new RegExp('^'+tr('regexExtractor','operation.extract'))}).click();await completed(page,'');assert.equal(await action(page,'save').isEnabled(),true)
  const workers=await workerStats(page);assert.ok(workers.length>=6);assert.ok(workers.every(w=>w.terminated===1&&w.responses===1));return {nativeModuleWorkers:workers.length,workerUrls:[...new Set(workers.map(w=>w.url))],legacyCaptureAndReplacementOracle:true,crlfTextAreaNormalization:true,unicodeEmptyMatchAdvances:true,whitespacePatternValid:true,emptyResultIsComplete:true}
})

test('regex-native-catastrophic-cancel-retry-timeout',async args=>{
  const {page}=args;await setup(args);const safe=await output(page).inputValue();const hostile='a'.repeat(32)+'!';await page.locator('#regex-pattern').fill('(a+)+$');await page.locator('#regex-input').fill(hostile);await status(page,'running');await page.evaluate(()=>window.__regexHeartbeatReset());await wait(300);const heartbeat=await page.evaluate(()=>({...window.__regexHeartbeat}));assert.ok(heartbeat.count>=5,'UI heartbeat while native Worker backtracks');await action(page,'cancel').click();await status(page,'canceled');const count=(await workerStats(page)).length;await wait(450);assert.equal((await workerStats(page)).length,count);assert.equal(await output(page).inputValue(),safe);assert.equal(await action(page,'save').isDisabled(),true)
  await action(page,'retry').click();await status(page,'running');await page.locator('#regex-pattern').fill('\\d+');await page.locator('#regex-input').fill('fixed42');await completed(page,'42');await page.locator('#regex-pattern').fill('(a+)+$');await page.locator('#regex-input').fill(hostile);await status(page,'running');const start=Date.now();await status(page,'error');const timeoutMs=Date.now()-start;assert.ok(timeoutMs>=4000&&timeoutMs<9000);assert.ok((await page.locator('[data-regex-status]').innerText()).includes(tr('regexExtractor','execution.errors.timeout')));assert.equal(await output(page).inputValue(),'42');const workers=await workerStats(page);assert.ok(workers.every(w=>w.terminated===1));return {nativeBacktrackingOnlyInWorker:true,heartbeatTicksDuring300ms:heartbeat.count,heartbeatMaxGapMs:heartbeat.maxGap,cancelPreventsAutomaticRestart:true,editedRetryResult:'42',foregroundTimeoutObservedMs:timeoutMs,workersTerminated:workers.length}
})

test('regex-worker-stale-hidden-and-failures',async args=>{
  const {page}=args;await setup(args);await page.evaluate(()=>window.__regexWorkerMode='hold');await page.locator('#regex-input').fill('A123');await status(page,'running');await poll(async()=>await page.evaluate(()=>window.__regexWorkers.at(-1).responses.length===1),'Native held Worker response');await page.evaluate(()=>{window.__oldRegexDelivery=window.__regexWorkers.at(-1).responses[0];window.__regexWorkerMode='native'});await page.locator('#regex-input').fill('B456');await completed(page,'456');await page.evaluate(()=>window.__oldRegexDelivery.callback(window.__oldRegexDelivery.event));assert.equal(await output(page).inputValue(),'456')
  await page.locator('#regex-input').fill('C789');await page.evaluate(()=>window.__regexVisibility('hidden'));await status(page,'canceled');const n=(await workerStats(page)).length;await page.evaluate(()=>window.__regexVisibility('visible'));await wait(400);assert.equal((await workerStats(page)).length,n);await action(page,'retry').click();await completed(page,'789');await page.locator('#regex-input').fill('D987');await page.evaluate(()=>dispatchEvent(new Event('pagehide')));await status(page,'canceled');await wait(400);assert.equal(await output(page).inputValue(),'789')
  const failures=[];for(const mode of ['unsupported','construct-fail','messageerror','invalid']){await page.evaluate(mode=>{window.Worker=mode==='unsupported'?undefined:window.__regexObservedWorker;window.__regexWorkerMode=mode},mode);await action(page,'retry').click();await status(page,'error');failures.push({mode,message:await page.locator('[data-regex-status]').innerText()});assert.equal(await output(page).inputValue(),'789')}
  await page.evaluate(()=>{window.Worker=window.__regexObservedWorker;window.__regexWorkerMode='native'});await action(page,'retry').click();await completed(page,'987');return {actualNativeResponseHeldThenLateIgnored:true,controlledVisibilityAndPagehideRequireRetry:true,failures,successAfterRestoringNativeWorker:true}
})

test('regex-smart-snapshot-and-history',async args=>{
  const {page}=args;await setup(args);await page.locator('#regex-input').fill('A\nA\nB');await smart(page,'removeDuplicates');await completed(page,'A\nB');await page.locator('#regex-input').fill('hello world');await smart(page,'capitalizeWords');await completed(page,'Hello World');await page.locator('#regex-input').fill('x <<한글>> y <<A>>');await smart(page,'extractBetween','<< >>');await completed(page,'<<한글>>\n<<A>>')
  await navigateJob(page,{operation:'replace',pattern:'(\\d+)',flags:'g',replacement:'[$1]',inputText:'price12'});await completed(page,'price[12]');await action(page,'save').click();const raw=await page.evaluate(()=>localStorage.getItem('calculation_history'));assert.ok(raw);const saved=JSON.parse(raw)[0];assert.equal(saved.inputs.replacement,'[$1]');assert.equal(saved.result.inputText,'price12')
  await page.locator('#regex-input').fill('other99');await completed(page,'other[99]');await page.getByRole('button',{name:new RegExp(tr('common','calcHistory.title'))}).click();await page.getByRole('dialog').getByRole('button',{name:tr('common','load'),exact:true}).first().click();await completed(page,'price[12]');assert.equal(await page.locator('#rx-replacement').inputValue(),'[$1]');await page.evaluate(()=>window.__regexHistoryFail=true);await action(page,'save').click();await page.getByText(tr('regexExtractor','execution.errors.saveFailed'),{exact:true}).waitFor();assert.equal(await page.evaluate(()=>localStorage.getItem('calculation_history')),raw)
  await page.locator('#regex-pattern').fill('[');await status(page,'error');assert.equal(await output(page).inputValue(),'price[12]');await page.locator('[data-regex-previous]').waitFor();assert.equal(await action(page,'save').isDisabled(),true);assert.equal(await action(page,'link').isDisabled(),true);const file=await download(page,()=>action(page,'download').click(),'previous-success.txt');assert.equal(file.text,'price[12]');return {smartUppercaseDedupeLiteralDelimiters:true,historyReplacementRestores:true,historyQuotaPreservesBytes:true,invalidCurrentKeepsConfirmedSnapshot:true,previousSnapshotDownloadBytes:file.bytes.length}
})

test('regex-large-preview-whole-txt-and-limits',async args=>{
  const {page}=args;await setup(args,{operation:'replace',pattern:'^',flags:'',replacement:'',inputText:'seed'});const text=('한글😀|row\r\n').repeat(7000);const normalized=text.replace(/\r\n/g,'\n');await page.evaluate(()=>window.__regexHeartbeatReset());const began=Date.now();await paste(page,page.locator('#regex-input'),text);await completed(page,normalized.slice(0,50000));const nativeFlowMs=Date.now()-began;const heartbeat=await page.evaluate(()=>({...window.__regexHeartbeat}));const file=await download(page,()=>action(page,'download').click(),'large-whole.txt');assert.deepEqual(file.bytes,Buffer.from(normalized));assert.equal(file.filename,'regex-replace-result.txt');await action(page,'copy').click();await page.locator('[data-regex-copy-status="copied"]').waitFor();assert.equal(await page.evaluate(()=>window.__clipboardCalls.at(-1)),normalized);assert.equal((await page.evaluate(()=>window.__nativeClipboardRead())).replace(/\r\n/g,'\n'),normalized)
  await page.evaluate(()=>window.__setClipboardMode('reject'));await action(page,'copy').click();await page.locator('[data-regex-copy-status="failed"]').waitFor();assert.equal(await page.locator('#regex-copy-manual').count(),0);await page.getByRole('button',{name:tr('regexExtractor','execution.actions.openManual'),exact:true}).click();assert.equal(await page.locator('#regex-copy-manual').inputValue(),normalized);await page.getByRole('button',{name:tr('regexExtractor','execution.actions.select'),exact:true}).click();assert.deepEqual(await page.locator('#regex-copy-manual').evaluate(el=>[el.selectionStart,el.selectionEnd]),[0,normalized.length]);await page.evaluate(()=>window.__setClipboardMode('native'))
  await paste(page,page.locator('#regex-input'),'x'.repeat(1000001));await status(page,'error');assert.ok((await page.locator('[data-regex-status]').innerText()).includes(tr('regexExtractor','execution.errors.inputTooLarge')));const last=await output(page).inputValue();assert.equal(last,normalized.slice(0,50000));await paste(page,page.locator('#regex-input'),'a'.repeat(100001));await page.locator('#regex-pattern').fill('a');await page.getByRole('group',{name:tr('regexExtractor','flags.title'),exact:true}).getByRole('button',{name:'g',exact:true}).click();await status(page,'error');assert.ok((await page.locator('[data-regex-status]').innerText()).includes(tr('regexExtractor','execution.errors.tooManyMatches')))
  await page.locator('#regex-input').fill('a'.repeat(100));await page.locator('#rx-replacement').fill('x'.repeat(50000));await status(page,'error');assert.ok((await page.locator('[data-regex-status]').innerText()).includes(tr('regexExtractor','execution.errors.outputTooLarge')));assert.equal(await output(page).inputValue(),last);return {wholeUtf16:normalized.length,previewUtf16:50000,downloadBytes:file.bytes.length,nativeClipboardWhole:true,manualWhole:true,pasteAndWorkerAndRenderMs:nativeFlowMs,mainHeartbeatMaxGapMs:heartbeat.maxGap,limits:['input1000001','matches100001','output5000000'],priorOutputPreserved:true}
})

test('regex-file-and-copy-late-recovery',async args=>{
  const {page}=args;await setup(args);const file=page.locator('[data-regex-file]');await page.evaluate(()=>window.__regexReadMode='hold');await file.setInputFiles({name:'A.txt',mimeType:'text/plain',buffer:Buffer.from('A123')});await poll(async()=>await page.evaluate(()=>!!window.__regexReaders.at(-1).delivery),'Native FileReader A complete');await page.evaluate(()=>window.__oldReader=window.__regexReaders.at(-1));await file.setInputFiles({name:'B.txt',mimeType:'text/plain',buffer:Buffer.from('B456')});await poll(async()=>await page.evaluate(()=>!!window.__regexReaders.at(-1).delivery),'Native FileReader B complete');await page.evaluate(()=>{const r=window.__regexReaders.at(-1);r.delivery.callback(r.delivery.event);window.__oldReader.delivery.callback(window.__oldReader.delivery.event)});await completed(page,'456');assert.equal(await page.locator('#regex-input').inputValue(),'B456')
  await file.setInputFiles({name:'C.txt',mimeType:'text/plain',buffer:Buffer.from('C789')});await poll(async()=>await page.evaluate(()=>!!window.__regexReaders.at(-1).delivery),'Native C read');await action(page,'cancel').click();await page.evaluate(()=>{const r=window.__regexReaders.at(-1);r.delivery.callback(r.delivery.event)});await status(page,'canceled');assert.equal(await page.locator('#regex-input').inputValue(),'B456');await page.evaluate(()=>window.__regexReadMode='fail');await file.setInputFiles({name:'bad.txt',mimeType:'text/plain',buffer:Buffer.from('bad')});await page.locator('[data-regex-file-error]').waitFor();assert.equal(await page.locator('#regex-input').inputValue(),'B456');const reads=await page.evaluate(()=>window.__regexReaders.length);await file.setInputFiles({name:'large.txt',mimeType:'text/plain',buffer:Buffer.alloc(4*1024*1024+1,65)});assert.equal(await page.evaluate(()=>window.__regexReaders.length),reads);await page.evaluate(()=>window.__regexReadMode='native');await file.setInputFiles({name:'B.txt',mimeType:'text/plain',buffer:Buffer.from('B456')});await completed(page,'456')
  await action(page,'copy').click();await page.locator('[data-regex-copy-status="copied"]').waitFor();assert.equal(await page.evaluate(()=>window.__nativeClipboardRead()),'456');await page.evaluate(()=>window.__setClipboardMode('absent'));await action(page,'copy').click();await page.locator('#regex-copy-manual').waitFor();assert.equal(await page.locator('#regex-copy-manual').inputValue(),'456');await page.getByRole('button',{name:tr('regexExtractor','execution.actions.select'),exact:true}).click();assert.deepEqual(await page.locator('#regex-copy-manual').evaluate(el=>[el.selectionStart,el.selectionEnd]),[0,3]);await page.evaluate(()=>{window.__setClipboardMode('reject');window.__legacyMode='true'});await page.getByRole('button',{name:tr('regexExtractor','execution.actions.retryCopy'),exact:true}).click();await page.locator('[data-regex-copy-status="copied"]').waitFor()
  await page.evaluate(()=>{window.__setClipboardMode('hold');window.__legacyMode='false'});await action(page,'copy').click();await page.evaluate(()=>window.__setClipboardMode('native'));await action(page,'link').click();await page.locator('[data-regex-copy-status="copied"]').waitFor();const link=await page.evaluate(()=>window.__nativeClipboardRead());assert.ok(link.includes('regex-extractor'));const fallback=await page.evaluate(()=>window.__legacyCalls.length);await page.evaluate(()=>window.__clipboardPending.at(-1).reject(new Error('old output reject')));await wait(50);assert.equal(await page.evaluate(()=>window.__legacyCalls.length),fallback);assert.equal(await page.evaluate(()=>window.__nativeClipboardRead()),link)
  await page.locator('#regex-input').fill('B457');await page.locator('#regex-input').fill('B456');await completed(page,'456');assert.equal(await page.locator('[data-regex-copy-status]').count(),0);await page.evaluate(()=>window.__setClipboardMode('hold'));await action(page,'copy').click();await changeLanguage(page,'en');await changeLanguage(page,'ko');await page.evaluate(()=>window.__clipboardPending.at(-1).resolve());await wait(50);assert.equal(await page.locator('[data-regex-copy-status]').count(),0);return {nativeFileReadersWithHeldDelivery:true,reverseDeliveryAndCancelPreserveInput:true,oversizeBeforeRead:true,sameFileReselectWorks:true,nativeClipboard:true,legacySuccessIsControlled:true,outputToLinkLateFallback:0,inputAndLocaleABAFeedback:0}
})

test('regex-url-legacy-malformed-and-revisit',async args=>{
  const {page,context,open}=args;await installRegexPorts(context);await observeDecisionPorts(context);const job={operation:'replace',pattern:'(한글)',flags:'',replacement:'[$1] $& %',inputText:'한글+50%'};await open('regex-extractor',regexQuery(job,'unrelated=keep')+'#keep');await completed(page,job.inputText.replace(/(한글)/,job.replacement));assert.equal(await page.locator('#regex-pattern').inputValue(),job.pattern);await page.evaluate(()=>history.replaceState({fixture:7},'',location.href));await page.locator('#rx-replacement').fill('EDIT-$1');await completed(page,'EDIT-한글+50%');assert.equal(await page.evaluate(()=>history.state.fixture),7);assert.equal(new URL(page.url()).searchParams.get('unrelated'),'keep');assert.equal(new URL(page.url()).hash,'#keep');await action(page,'link').click();await page.locator('[data-regex-copy-status="copied"]').waitFor();const link=await page.evaluate(()=>window.__nativeClipboardRead());const second=await context.newPage();await second.goto(link);await completed(second,'EDIT-한글+50%');assert.equal(await second.locator('#rx-replacement').inputValue(),'EDIT-$1');await second.close()
  await page.evaluate(()=>{history.pushState(history.state,'','?pattern=%25E0%25A4%25A&pattern=second&input=hello&flags=&unrelated=keep#keep');dispatchEvent(new PopStateEvent('popstate'))});await page.getByText(tr('regexExtractor','execution.url.malformedEncoding'),{exact:true}).waitFor();await page.getByText(tr('regexExtractor','execution.url.duplicateParameter'),{exact:true}).waitFor();assert.equal(await page.locator('#regex-pattern').inputValue(),'%E0%A4%A');await page.locator('#regex-pattern').fill('a');await page.locator('#regex-input').fill('a');await completed(page,'a');await paste(page,page.locator('#regex-input'),'a'.repeat(17000));await completed(page,'a'.repeat(17000));assert.equal(new URL(page.url()).searchParams.has('input'),false);assert.equal(new URL(page.url()).searchParams.has('pattern'),false);assert.equal(new URL(page.url()).searchParams.get('unrelated'),'keep');assert.equal(await action(page,'link').isDisabled(),true);await page.reload();await status(page,'idle');assert.equal(await page.locator('#regex-input').inputValue(),'');return {legacyDoubleEncodingAndEmptyFlags:true,sharedReplacementRevisit:true,unknownQueryHashAndHistoryState:true,malformedPercentPreservedAndDuplicateWarned:true,oversizeClearsOldOwnedUrlKeys:true,reloadCannotResurrectOldInput:true}
})

test('regex-320-dark-ko-en',async args=>{
  const {page}=args;await setup(args,{operation:'replace',pattern:'(\\d+)',replacement:'금액 $1',inputText:'합성 원고 123'});await page.evaluate(()=>window.__setClipboardMode('absent'));await action(page,'copy').click();await page.locator('#regex-copy-manual').waitFor();const fields=[page.locator('#regex-pattern'),page.locator('#regex-input'),page.locator('#rx-replacement'),page.locator('#regex-copy-manual')],controls=['cancel','retry','copy','download','link','save'].map(x=>action(page,x));const ko=await mobile(page,fields,controls);await screenshot(page,'regex-320-ko',page.locator('[data-regex-copy-status]'));await changeLanguage(page,'en');await page.getByRole('heading',{name:tr('regexExtractor','title','en'),exact:true}).waitFor();await action(page,'copy').click();await page.locator('#regex-copy-manual').waitFor();const en=await mobile(page,fields,controls);await screenshot(page,'regex-320-en',page.locator('[data-regex-copy-status]'));assert.equal(await output(page).inputValue(),'합성 원고 금액 123');return {ko,en,fields16:true,newControls44:true,localePreservesDraftAndResult:true}
},{width:320,dark:true})

// --list never opens Chrome. Author/canonical final ready received before execution.
const planned = [
  "regex-native-worker-empty-matches-and-legacy",
  "regex-native-catastrophic-cancel-retry-timeout",
  "regex-worker-stale-hidden-and-failures",
  "regex-smart-snapshot-and-history",
  "regex-large-preview-whole-txt-and-limits",
  "regex-file-and-copy-late-recovery",
  "regex-url-legacy-malformed-and-revisit",
  "regex-320-dark-ko-en"
]
const productCasesReady = true
if (only === '--list') console.log(planned.join('\n'))
else {
  assert.ok(productCasesReady, 'Final ready and native cases pending; Chrome was not started')
  const selected = cases.filter(item => !only || only.split(',').some(part => item.name.includes(part))); assert.ok(selected.length, 'No selected cases')
  mkdirSync(out, { recursive: true }); const browser = await chromium.launch({ channel: 'chrome' })
  try { for (const scenario of selected) { await run(browser, scenario);if(results.at(-1)?.errors.some(error=>/Export .*doesn't exist|Module not found|Failed to compile/.test(error)))break } }
  finally { await browser.close(); const merged = readdirSync(out).filter(name => name.endsWith('-evidence.json')).map(name => JSON.parse(readFileSync(resolve(out, name), 'utf8'))); const final = { checkedAt: new Date().toISOString(), passed: merged.filter(item => item.status === 'pass').length, failed: merged.filter(item => item.status === 'fail').length, browserClosed: true, results: merged }; writeFileSync(resolve(out, 'final-results.json'), JSON.stringify(final, null, 2)); console.log(JSON.stringify({ passed: final.passed, failed: final.failed, browserClosed: true })) }
  if (results.some(item => item.status !== 'pass')) process.exitCode = 1
}

export { tr, wait, poll, test, changeLanguage, screenshot, mobile, download, observeDecisionPorts }
