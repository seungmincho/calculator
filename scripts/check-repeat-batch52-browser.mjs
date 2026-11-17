import { chromium } from 'playwright'
import assert from 'node:assert/strict'
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { percentExamples, percentFixtureUrl, inspectPercentMemory, installPercentRestorePort } from '../docs/verify/2026-11-17-repeat-batch52/browser-fixtures.mjs'




// Independent real-browser checks. --list never starts Chrome; case-name filters
// preserve previous evidence so only changed boundaries need to be rerun.
const base = process.env.VERIFY_BASE_URL || 'http://127.0.0.1:3039'
const out = resolve('docs/verify/2026-11-17-repeat-batch52/browser')
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
    if (!localStorage.getItem('__batch52Seeded')) { localStorage.setItem('language', options.language ?? 'ko'); localStorage.setItem('theme', options.dark ? 'dark' : 'light'); localStorage.setItem('__batch52Seeded', '1') }
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
  try { detail = await fn({ page, context, open, network, logs }) ?? {}; assert.deepEqual(errors, [], 'JS page errors'); assert.deepEqual(hydration, [], 'Hydration errors'); assert.deepEqual(consoleErrors.filter(value=>/ErrorBoundary|NotFoundError|The above error occurred/i.test(value)),[],'React caught runtime errors'); for (const active of context.pages()) assert.deepEqual(await active.evaluate(() => window.__unhandled), [], 'Unhandled rejections'); assert.ok(!/\b(?:percentCalculator|shareResult)\.[a-zA-Z][\w.]+/.test(await page.locator('body').innerText()), 'Raw translation key') }
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






const pc=(page,key,value)=>page.locator(`[data-percent-${key}${value===undefined?'':`="${value}"`}]`)
const items=page=>pc(page,'comparison-item')
async function ready(page){await page.locator('[data-percent-ready="true"]').waitFor()}
async function setup(args,query=''){await observeDecisionPorts(args.context);await args.open('percent-calculator',query);await ready(args.page)}
async function fill(page,values){for(const [key,value]of Object.entries(values))await page.locator(`#pc-${key}`).fill(value)}
async function example(page,item){await fill(page,item.values);if(item.chain){while(await pc(page,'chain-remove').count()<item.chain.length)await pc(page,'chain-add').click();for(let i=0;i<item.chain.length;i++)await page.locator(`#pc-c${i}`).fill(item.chain[i])}}
async function textResult(page,kind){return pc(page,'result',kind).locator('p').last().innerText()}
async function copied(page,kind){await poll(async()=>await pc(page,'copy',kind).getAttribute('aria-label')===tr('percentCalculator','common.copied'),'card copied')}
async function settle(page){await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))))}

test('percent-eight-cards-and-units',async args=>{
 const {page}=args;await setup(args);const actual=[];for(const item of percentExamples){await example(page,item);const text=await textResult(page,item.kind);assert.equal(Number(text.replaceAll(',','').replace(/%p?$|^\+/g,'')),item.result);assert.equal(text.endsWith(item.unit),true);await pc(page,'copy',item.kind).click();await copied(page,item.kind);assert.equal(await page.evaluate(()=>window.__clipboardCalls.at(-1)),String(item.result));assert.equal(await page.evaluate(()=>window.__nativeClipboardRead()),String(item.result));actual.push({kind:item.kind,text,copy:String(item.result)})}return {handCalculatedEight:actual,nativeClipboard:true}
})

test('percent-snapshot-six-and-independent-reset',async args=>{
 const {page}=args;await setup(args);await fill(page,{a:'00120',b:'25'});await pc(page,'decimals','4').click();await pc(page,'add','of').click();const first=await items(page).first().innerText();await pc(page,'add','of').click();assert.equal(await pc(page,'comparison-notice').getAttribute('data-percent-comparison-notice'),'duplicate');for(const item of percentExamples.slice(1,6)){await example(page,item);await pc(page,'add',item.kind).click()}assert.equal(await items(page).count(),6);const six=await items(page).allTextContents();await pc(page,'add','pp').click();assert.equal(await pc(page,'comparison-notice').getAttribute('data-percent-comparison-notice'),'limit');assert.deepEqual(await items(page).allTextContents(),six);await fill(page,{a:'999'});await pc(page,'korean').click();await pc(page,'reset').click();assert.equal(await items(page).first().innerText(),first);assert.equal(await page.locator('#pc-a').inputValue(),'50000');await pc(page,'comparison-remove').nth(2).click();assert.equal(await items(page).count(),5);await pc(page,'comparison-clear').click();assert.equal(await items(page).count(),0);assert.equal(await page.locator('#pc-a').inputValue(),'50000');const memory=await inspectPercentMemory(page);assert.ok(!JSON.stringify(memory.local).includes('00120'));assert.ok(!JSON.stringify(memory.session).includes('00120'));return {sixImmutable:true,duplicateRejected:true,noEviction:true,resetAndClearIndependent:true,listStorageWrites:0}
})

test('percent-whole-native-txt-and-clipboard',async args=>{
 const {page}=args;await setup(args);for(const item of [percentExamples[0],percentExamples[5],percentExamples[6]]){await example(page,item);await pc(page,'add',item.kind).click()}await pc(page,'comparison-copy').click();await page.locator('[data-percent-comparison-status="copied"]').waitFor();const sent=await page.evaluate(()=>window.__clipboardCalls.at(-1));assert.equal((await page.evaluate(()=>window.__nativeClipboardRead())).replaceAll('\r\n','\n'),sent);for(const text of ['120','25','31.6%','+1.5%p','(1 − 10%)','(1 − 20%)','(1 − 5%)'])assert.ok(sent.includes(text),text);const file=await download(page,()=>pc(page,'comparison-download').click(),'percent-native-whole.txt');assert.equal(file.filename,'percent-comparison.txt');assert.equal(file.text,sent);assert.notEqual(file.bytes.subarray(0,3).toString('hex'),'efbbbf');const original=await items(page).allTextContents();await fill(page,{a:'222'});assert.deepEqual(await items(page).allTextContents(),original);const second=await download(page,()=>pc(page,'comparison-download').click(),'percent-snapshot-after-edit.txt');assert.equal(second.text,sent);return {nativeTextBytes:file.bytes.length,wholeSnapshotText:true,utf8NoBom:true,nativeClipboardWindowsCrLfNormalized:true,editsDoNotRewriteSnapshot:true}
})

test('percent-copy-recovery-and-cross-owner',async args=>{
 const {page}=args;await setup(args);await pc(page,'add','of').click();await page.evaluate(()=>window.__setClipboardMode('absent'));await pc(page,'copy','of').click();await pc(page,'recovery-text').waitFor();assert.equal(await pc(page,'recovery-text').inputValue(),'7500');await pc(page,'recovery-select').click();assert.deepEqual(await pc(page,'recovery-text').evaluate(el=>[el.selectionStart,el.selectionEnd]),[0,4]);await page.evaluate(()=>{window.__setClipboardMode('reject');window.__legacyMode='true'});await pc(page,'recovery-retry').click();await copied(page,'of');assert.equal(await pc(page,'copy-recovery').count(),0);await page.evaluate(()=>{window.__legacyMode='false';window.__setClipboardMode('hold')});await pc(page,'copy','of').click();await page.evaluate(()=>window.__setClipboardMode('native'));await pc(page,'comparison-copy').click();await page.locator('[data-percent-comparison-status="copied"]').waitFor();const fallbacks=await page.evaluate(()=>window.__legacyCalls.length);await page.evaluate(()=>window.__clipboardPending.shift().reject(new Error('old card')));await settle(page);assert.equal(await page.evaluate(()=>window.__legacyCalls.length),fallbacks);await page.evaluate(()=>window.__setClipboardMode('hold'));await pc(page,'comparison-copy').click();await pc(page,'copy','ratio').click();await page.evaluate(()=>window.__clipboardPending.shift().reject(new Error('old list')));await settle(page);assert.equal(await page.evaluate(()=>window.__legacyCalls.length),fallbacks);await download(page,()=>pc(page,'comparison-download').click(),'percent-download-wins-copy.txt');await page.evaluate(()=>window.__clipboardPending.shift().reject(new Error('old ratio')));await settle(page);assert.equal(await page.evaluate(()=>window.__legacyCalls.length),fallbacks);assert.equal(await pc(page,'copy-recovery').count(),0);return {absentLegacyFalseManual:true,wholeSelection:true,legacyTrueSuccessControlled:true,crossOwnerLateFallbacks:0,downloadWinsPendingCopy:true}
})

test('percent-input-locale-aba-and-early-edit',async args=>{
 const {page,context}=args;await installPercentRestorePort(context,true);await observeDecisionPorts(context);await args.open('percent-calculator','?a=120&b=25');await poll(()=>page.evaluate(()=>window.__percentRestorePending.length>0),'named source restore interception');assert.equal(await pc(page,'ready').getAttribute('data-percent-ready'),'false');assert.equal(await pc(page,'copy','of').isDisabled(),true);await page.locator('#pc-a').fill('777');await page.evaluate(()=>window.__releasePercentRestore());await ready(page);assert.equal(await page.locator('#pc-a').inputValue(),'777');assert.equal(await page.locator('#pc-b').inputValue(),'15');await pc(page,'copy','of').click();await copied(page,'of');await fill(page,{a:'888'});await fill(page,{a:'777'});assert.equal(await pc(page,'copy','of').getAttribute('aria-label'),tr('percentCalculator','copy'));await page.evaluate(()=>window.__setClipboardMode('hold'));await pc(page,'copy','of').click();await changeLanguage(page,'en');await poll(async()=>await pc(page,'add','of').innerText()===tr('percentCalculator','comparison.add','en'),'English loaded');await changeLanguage(page,'ko');await poll(async()=>await pc(page,'add','of').innerText()===tr('percentCalculator','comparison.add'),'Korean loaded');const before=await page.evaluate(()=>window.__legacyCalls.length);await page.evaluate(()=>window.__clipboardPending.shift().reject(new Error('old language')));await settle(page);assert.equal(await page.evaluate(()=>window.__legacyCalls.length),before);assert.equal(await pc(page,'copy-recovery').count(),0);return {controlledInitialRestore:true,earlyWholeInputWins:true,preReadyCopyDisabled:true,inputAndLocaleAbaOldNotice:0,lateFallback:0}
})

test('percent-url-real-revisit-and-ownership',async args=>{
 const {page,context}=args;await observeDecisionPorts(context);const values=Object.assign({},...percentExamples.map(item=>item.values)),url=percentFixtureUrl(base,values,{chain:['10','20','5','0','1'],decimals:4,korean:true});await args.open('percent-calculator',new URL(url).search+new URL(url).hash);await ready(page);assert.equal(page.url(),url);for(const [key,value]of Object.entries(values))assert.equal(await page.locator(`#pc-${key}`).inputValue(),value);assert.equal(await page.locator('#pc-c4').inputValue(),'1');await page.evaluate(()=>history.replaceState({...history.state,verification:'preserve'},'',location.href));await pc(page,'add','of').click();const initial=page.url();assert.equal(initial,url);await fill(page,{a:''});await poll(()=>Promise.resolve(new URL(page.url()).searchParams.has('a')&&new URL(page.url()).searchParams.get('a')===''),'blank URL sync');const edited=new URL(page.url());assert.deepEqual(edited.searchParams.getAll('nativeFixture'),['first','second']);assert.equal(edited.hash,'#native-percent');assert.equal(await page.evaluate(()=>history.state.verification),'preserve');const next=await context.newPage();await args.open('percent-calculator',edited.search+edited.hash,next);await ready(next);assert.equal(await next.locator('#pc-a').inputValue(),'');assert.equal(await items(next).count(),0);assert.equal(await items(page).count(),1);await next.close();return {all14FieldsFiveStagesRestored:true,decimals4Korean:true,initialUrlUnchanged:true,blankExplicitParamPreserved:true,unknownDuplicatesHashStatePreserved:true,newVisitListEmpty:true}
})

test('percent-overflow-and-legacy-boundaries',async args=>{
 const {page}=args;await setup(args);const overflow=[['of',{a:'1e308',b:'1e308'}],['ratio',{p:'1e308',w:'1e-308'}],['change',{f:'-1e308',t:'1e308'}],['reverse',{rs:'1e308',rr:'99.9999'}],['pp',{x:'1e-308',y:'1e308'}]];for(const [kind,values]of overflow){await fill(page,values);assert.equal(await pc(page,'error',kind).count(),1);assert.equal(await pc(page,'result',kind).count(),0);assert.equal(await pc(page,'copy',kind).count(),0);assert.equal(await pc(page,'add',kind).count(),0)}await fill(page,{a:'0',b:'10'});assert.equal(await textResult(page,'of'),'0');await fill(page,{a:''});assert.equal(await pc(page,'error','of').count(),1);await fill(page,{p:'5',w:'0'});assert.equal(await pc(page,'error','ratio').count(),1);await fill(page,{v:'1e300',cp:'not-a-number'});assert.equal(await pc(page,'result','vat').count(),1);assert.equal(await pc(page,'result','chain').count(),1);await page.locator('#pc-q').fill('50000의 15%');assert.equal(await textResult(page,'of'),'7,500');await pc(page,'chain-add').click();await pc(page,'chain-add').click();await pc(page,'chain-add').click();assert.equal(await pc(page,'chain-remove').count(),5);assert.equal(await pc(page,'chain-add').count(),0);return {overflowKinds:overflow.map(item=>item[0]),zeroVsBlank:true,zeroBaseError:true,largeFiniteNoArbitraryCap:true,optionalBadChainPriceIgnored:true,legacyQuestionAndFiveStages:true}
})

test('percent-320-dark-ko-en',async args=>{
 const {page}=args;await setup(args);await pc(page,'add','of').click();await pc(page,'add','pp').click();const geometry={};for(const lang of ['ko','en']){if(lang==='en'){await changeLanguage(page,lang);await poll(async()=>await pc(page,'add','of').innerText()===tr('percentCalculator','comparison.add',lang),'English translations')}await page.evaluate(()=>window.__setClipboardMode('absent'));await pc(page,'comparison-copy').click();await pc(page,'recovery-text').waitFor();await pc(page,'recovery-select').focus();await page.keyboard.press('Enter');const text=await pc(page,'recovery-text').inputValue();assert.deepEqual(await pc(page,'recovery-text').evaluate(el=>[el.selectionStart,el.selectionEnd]),[0,text.length]);geometry[lang]=await mobile(page,[page.locator('#pc-a'),page.locator('#pc-q'),pc(page,'recovery-text')],[pc(page,'add','of'),pc(page,'comparison-copy'),pc(page,'comparison-download'),pc(page,'recovery-select')]);await screenshot(page,`percent-comparison-320-${lang}`,pc(page,'comparison'));await pc(page,'recovery-close').click();await pc(page,'comparison-jump').click();assert.equal(new URL(page.url()).hash,'#percent-comparison')}return {geometry,keyboardSelect:true,fields16Controls44:true,comparisonAnchor:true}
},{width:320,dark:true,touch:true})

const planned=cases.map(item=>item.name)
if(only==='--list')console.log(planned.join('\n'))
else {const selected=cases.filter(item=>!only||only.split(',').some(part=>item.name.includes(part)));assert.ok(selected.length);mkdirSync(out,{recursive:true});const browser=await chromium.launch({channel:'chrome'});try{for(const scenario of selected)await run(browser,scenario)}finally{await browser.close();const merged=readdirSync(out).filter(name=>name.endsWith('-evidence.json')).map(name=>JSON.parse(readFileSync(resolve(out,name),'utf8')));const final={checkedAt:new Date().toISOString(),passed:merged.filter(item=>item.status==='pass').length,failed:merged.filter(item=>item.status==='fail').length,browserClosed:true,results:merged};writeFileSync(resolve(out,'final-results.json'),JSON.stringify(final,null,2));console.log(JSON.stringify({passed:final.passed,failed:final.failed,browserClosed:true}))}if(results.some(item=>item.status!=='pass'))process.exitCode=1}
