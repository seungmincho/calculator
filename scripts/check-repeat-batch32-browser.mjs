import { treeSource, treeFixture, pointerVectors, ownPointer, assertGeneratedPath, assertOwnStructure, longSelectionText } from '../docs/verify/2026-11-17-repeat-batch32/browser-oracles.mjs'
import { chromium } from 'playwright'
import assert from 'node:assert/strict'
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'




// Independent real-browser checks. --list never starts Chrome; case-name filters
// preserve previous evidence so only changed boundaries need to be rerun.
const base = process.env.VERIFY_BASE_URL || 'http://127.0.0.1:3039'
const out = resolve('docs/verify/2026-11-17-repeat-batch32/browser')
const only = process.argv[2]
const messages = Object.fromEntries(['ko', 'en'].map(language => [language, JSON.parse(readFileSync(`messages/${language}.json`, 'utf8'))]))
const tr = (ns, key, language = 'ko', values = {}) => {
  const value = key.split('.').reduce((object, key) => object?.[key], messages[language][ns])
  assert.equal(typeof value, 'string', `Missing ${language}:${ns}.${key}`)
  return value.replace(/\{(\w+)\}/g, (match, key) => values[key] ?? match)
}
const jsonText = (key, language = 'ko', values = {}) => tr('jsonFormatter', key, language, values)
const button = (scope, name) => scope.getByRole('button', { name, exact: true })
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
    if (!localStorage.getItem('__batch32Seeded')) { localStorage.setItem('language', options.language ?? 'ko'); localStorage.setItem('theme', options.dark ? 'dark' : 'light'); localStorage.setItem('__batch32Seeded', '1') }
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
    await target.goto(`${base}/${slug}/${query}`, { waitUntil: 'domcontentloaded' }); await target.locator('main h1').first().waitFor()
    await target.waitForFunction(() => [...document.querySelectorAll('[data-language-toggle] button')].some(element => Object.keys(element).some(key => key.startsWith('__reactProps$')))); await wait(200)
  }
  let status = 'pass', detail = {}, error
  const watchdog = setTimeout(() => { void context.close().catch(() => {}) }, 120000)
  try { detail = await fn({ page, context, open, network, logs }) ?? {}; assert.deepEqual(errors, [], 'JS page errors'); assert.deepEqual(hydration, [], 'Hydration errors'); for (const active of context.pages()) assert.deepEqual(await active.evaluate(() => window.__unhandled), [], 'Unhandled rejections'); assert.ok(!/\b(?:jsonFormatter)\.[a-zA-Z][\w.]+/.test(await page.locator('body').innerText()), 'Raw translation key') }
  catch (cause) { status = 'fail'; error = redact(cause.stack ?? String(cause)); await page.screenshot({ path: resolve(out, `${name}-failure.png`), caret: 'initial', mask: options.sensitive ? [page.locator('[data-password-value]'), page.locator('[data-password-copy-recovery] textarea'), page.locator('#pg-check')] : [] }).catch(() => {}); writeFileSync(resolve(out, `${name}-failure.txt`), `${error}\n\n${options.sensitive ? 'Sensitive page body intentionally omitted.' : await page.locator('body').innerText().catch(() => '')}`) }
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

const inputJson=page=>page.locator('.cm-content[contenteditable="true"]').first()
const nodeId=path=>JSON.stringify(path.map(part=>[typeof part==='number'?'index':'key',part]))
const treeNode=(page,kind,path)=>page.locator(`[data-json-tree-${kind}="${nodeId(path).replaceAll('\\','\\\\').replaceAll('"','\\"')}"]`)
async function editJson(page,source){const editor=inputJson(page);await editor.click();if(source.length>20000){await page.evaluate(text=>navigator.clipboard.writeText(text),source);await editor.press('Control+A');await editor.press('Control+V')}else await editor.fill(source);await poll(async()=>await page.locator('[data-json-formatter-copy-output]').count()>0,'JSON parsed current input')}
async function treeMode(page){await page.locator('[data-json-formatter-mode="tree"]').click();await treeNode(page,'select',[]).waitFor()}
async function selectTree(page,path){for(let i=0;i<path.length;i++){const toggle=treeNode(page,'toggle',path.slice(0,i));if(await toggle.count()&&await toggle.getAttribute('aria-expanded')==='false')await toggle.click()}await treeNode(page,'select',path).click();await page.locator('[data-json-tree-selection]').waitFor();await poll(async()=>await page.locator('[data-json-tree-path-status="checking"]').count()===0,'literal validation settled')}
async function jsonBoot(context,open,page,source=treeSource){await observeDecisionPorts(context);await open('json-formatter');await inputJson(page).waitFor();await editJson(page,source);await treeMode(page)}
async function jsonSettings(page){if(!await page.locator('[data-json-formatter-sort]').isVisible())await page.getByTitle(jsonText('controls.settings'),{exact:true}).click()}
async function selectedValues(page){return{pointer:await page.locator('[data-json-tree-pointer]').inputValue(),value:await page.locator('[data-json-tree-value]').inputValue(),path:await page.locator('[data-json-tree-path]').count()?await page.locator('[data-json-tree-path]').inputValue():null,status:await page.locator('[data-json-tree-path-status]').count()?await page.locator('[data-json-tree-path-status]').getAttribute('data-json-tree-path-status'):null}}

test('json-tree-native-path-pointer-and-special-own-keys',async({page,context,open})=>{
  await jsonBoot(context,open,page);const paths=[[],['a.b','direct'],['a','b','nested'],['','emptyKey'],['0'],['arr',0],['slash/key','~tilde'],['quote"key'],['back\\slash'],['line\nkey'],['한국어'],['__proto__','keep'],['constructor'],['toString'],['*'],['?(@.x)']];const results=[]
  for(const path of paths){await selectTree(page,path);const actual=await selectedValues(page);assert.deepEqual(JSON.parse(actual.value),ownPointer(treeFixture,actual.pointer));if(actual.path){assertGeneratedPath(actual.path,actual.pointer);assert.equal(await page.locator('[data-json-tree-copy="path"]').isDisabled(),false)}else assert.equal(await page.locator('[data-json-tree-copy="path"]').isDisabled(),true);results.push({path,pointer:actual.pointer,literalSupported:!!actual.path,status:actual.status})}
  await selectTree(page,['slash/key','~tilde']);await page.locator('[data-json-tree-copy="pointer"]').click();assert.equal(await page.evaluate(()=>window.__nativeClipboardRead()),'/slash~1key/~0tilde');await page.locator('[data-json-tree-copy="value"]').click();assert.equal(JSON.parse(await page.evaluate(()=>window.__nativeClipboardRead())),'slash-tilde')
  assert.equal(pointerVectors.length,21);return{selectedNodes:results,nativePointerAndValueCopy:true,independentOwnPointerOracle:true,installedEngineReevaluation:true}
})

test('json-tree-root-empty-primitives-and-nonfinite-json5',async({page,context,open})=>{
  await jsonBoot(context,open,page);const values=[false,0,null,'',{},[]];for(const value of values){await editJson(page,JSON.stringify(value));await selectTree(page,[]);assert.equal(await page.locator('[data-json-tree-pointer]').inputValue(),'');assert.deepEqual(JSON.parse(await page.locator('[data-json-tree-value]').inputValue()),value);assert.equal(await page.locator('[data-json-tree-path]').inputValue(),'$')}
  await page.locator('[data-json-tree-copy="pointer"]').click();assert.equal(await page.evaluate(()=>window.__nativeClipboardRead()),'')
  await jsonSettings(page);await page.locator('[data-json-formatter-json5]').click();await editJson(page,'{a: NaN, b: Infinity, c: 0}');await selectTree(page,[]);assert.equal(await page.locator('[data-json-tree-value-error]').getAttribute('data-json-tree-value-error'),'nonFinite');assert.equal(await page.locator('[data-json-tree-copy="value"]').isDisabled(),true);assert.equal(await page.locator('[data-json-tree-copy="pointer"]').isDisabled(),false)
  await selectTree(page,['c']);assert.equal(await page.locator('[data-json-tree-value]').inputValue(),'0')
  return{falsyAndEmptyRoots:6,rootPointerNativeEmpty:true,json5NonfiniteSubtreeRefused:true,validSiblingStillReadable:true}
})

test('json-tree-sort-expansion-and-existing-jsonpath-filter',async({page,context,open})=>{
  const preset={version:1,revision:'browser-query-revision',presets:[{id:'browser-filter',name:'가격 필터',expression:'$[?(@.price < 10)]',updatedAt:'2026-11-17T00:00:00.000Z'}]};await context.addInitScript(value=>{if(!localStorage.getItem('__json32Preset')){localStorage.setItem('toolhub-jsonpath-presets-v1',JSON.stringify(value));localStorage.setItem('__json32Preset','1')}},preset)
  await jsonBoot(context,open,page);await treeNode(page,'toggle',['a']).click();assert.equal(await treeNode(page,'toggle',['a','b']).getAttribute('aria-expanded'),'false');await treeNode(page,'toggle',['a.b']).click();assert.equal(await treeNode(page,'toggle',['a','b']).getAttribute('aria-expanded'),'false');assert.equal(await treeNode(page,'toggle',['a.b']).getAttribute('aria-expanded'),'true')
  await selectTree(page,['__proto__','keep']);const identity=await page.locator('[data-json-tree-select][aria-pressed="true"]').getAttribute('data-json-tree-select');await jsonSettings(page);await page.locator('[data-json-formatter-sort]').check();assert.equal(await page.locator('[data-json-tree-select][aria-pressed="true"]').getAttribute('data-json-tree-select'),identity)
  await page.locator('[data-json-formatter-copy-output]').click();assertOwnStructure(JSON.parse(await page.evaluate(()=>window.__nativeClipboardRead())),treeFixture)
  const exported=await download(page,()=>button(page,jsonText('controls.download')).click(),'special-own-keys-native.json');assertOwnStructure(JSON.parse(exported.text),treeFixture);assert.match(exported.filename,/^json-\d+\.json$/)
  const source='[{"name":"low","price":5},{"name":"high","price":20}]';await editJson(page,source);await button(page,jsonText('presets.openPanel')).click();const panel=page.locator('[data-jsonpath-presets]');await panel.getByRole('combobox').selectOption('browser-filter');await button(panel,jsonText('presets.load')).click();await poll(async()=>await page.locator('#jsonpath-query').inputValue()===preset.presets[0].expression,'native Web Lock load settled');assert.equal(await page.locator('[data-jsonpath-result]').count(),0)
  await button(page,jsonText('jsonPath.run')).click();await page.locator('[data-jsonpath-result]').waitFor();assert.deepEqual(JSON.parse(await page.locator('[data-jsonpath-result]').innerText()),[{name:'low',price:5}]);assert.equal(await page.evaluate(()=>localStorage.getItem('toolhub-jsonpath-presets-v1')),JSON.stringify(preset))
  return{dottedAndNestedExpansionIndependent:true,sortKeepsOwnProtoKey:true,selectionIdentityAfterSort:true,existingFilterResult:[{name:'low',price:5}],savedPresetRawPreserved:true}
})

test('json-tree-large-preview-exact-native-copy',async({page,context,open})=>{
  const value=longSelectionText(),source=JSON.stringify({long:value});await jsonBoot(context,open,page,source);await selectTree(page,['long']);const expected=JSON.stringify(value,null,2),chunks=[],ranges=[]
  for(;;){const field=page.locator('[data-json-tree-value]');const chunk=await field.inputValue();const start=Number(await field.getAttribute('data-json-tree-preview-start')),end=Number(await field.getAttribute('data-json-tree-preview-end'));chunks.push(chunk);ranges.push({start,end,length:chunk.length});assert.ok(chunk.length<=50001);if(await page.locator('[data-json-tree-page="next"]').isDisabled())break;await page.locator('[data-json-tree-page="next"]').click()}
  assert.equal(chunks.join(''),expected);await page.locator('[data-json-tree-copy="value"]').click();assert.equal(await page.evaluate(()=>window.__nativeClipboardRead()),expected);assert.equal(Number(await page.locator('[data-json-tree-value]').getAttribute('data-json-tree-preview-total')),expected.length)
  await page.evaluate(()=>window.__setClipboardMode('reject'));await page.locator('[data-json-tree-copy="value"]').click();await page.locator('[data-json-tree-manual]').waitFor();assert.equal(await page.locator('[data-json-tree-manual]').inputValue(),expected);await page.locator('[data-json-tree-manual-select]').click();assert.deepEqual(await page.locator('[data-json-tree-manual]').evaluate(node=>[node.selectionStart,node.selectionEnd]),[0,expected.length])
  return{sourceUtf16:source.length,selectedUtf16:expected.length,previewRanges:ranges,allPagesRejoinExact:true,nativeFullCopy:true,manualFullRecovery:true}
})

test('json-tree-copy-recovery-stale-input-selection-and-mode',async({page,context,open})=>{
  await jsonBoot(context,open,page);await selectTree(page,['a.b','direct']);await page.evaluate(()=>window.__setClipboardMode('reject'));await page.locator('[data-json-tree-copy="value"]').click();await page.locator('[data-json-tree-manual]').waitFor();assert.equal(await page.locator('[data-json-tree-manual]').inputValue(),'1');await page.locator('[data-json-tree-manual-select]').click();assert.deepEqual(await page.locator('[data-json-tree-manual]').evaluate(node=>[node.selectionStart,node.selectionEnd,node===document.activeElement]),[0,1,true]);await page.evaluate(()=>window.__setClipboardMode('native'));await page.locator('[data-json-tree-retry]').click();await poll(async()=>!await page.locator('[data-json-tree-recovery]').count(),'native selection retry')
  await page.evaluate(()=>window.__setClipboardMode('hold'));await page.locator('[data-json-tree-copy="pointer"]').click();await selectTree(page,['0']);await page.evaluate(()=>window.__setClipboardMode('native'));await page.locator('[data-json-tree-copy="value"]').click();const current=await page.evaluate(()=>window.__nativeClipboardRead());const calls=await page.evaluate(()=>window.__legacyCalls.length);await page.evaluate(()=>window.__clipboardPending.shift().reject(new Error('old selection')));await wait(50);assert.equal(await page.evaluate(()=>window.__legacyCalls.length),calls);assert.equal(await page.evaluate(()=>window.__nativeClipboardRead()),current)
  await page.evaluate(()=>window.__setClipboardMode('hold'));await page.locator('[data-json-tree-copy="value"]').click();await inputJson(page).fill('{');assert.equal(await page.locator('[data-json-tree-selection]').count(),0);await page.evaluate(()=>window.__clipboardPending.shift().reject(new Error('old input')));assert.equal(await page.locator('[data-json-tree-recovery]').count(),0)
  await page.evaluate(()=>window.__setClipboardMode('native'));await editJson(page,treeSource);await selectTree(page,['a.b']);await page.evaluate(()=>window.__setClipboardMode('hold'));await page.locator('[data-json-formatter-copy-output]').click();await page.locator('[data-json-formatter-mode="format"]').click();await page.evaluate(()=>window.__clipboardPending.shift().reject(new Error('old mode')));assert.equal(await page.locator('[data-json-tree-recovery]').count(),0);assert.equal(await page.evaluate(()=>window.__legacyCalls.length),calls)
  return{nativeRecoveryRetry:true,manualSelectionExact:true,crossTargetLateFallback:0,inputParsingGapInvalidates:true,modeChangeLateFallback:0}
})

test('json-tree-320-dark-ko-en-keyboard-and-no-persistence',async({page,context,open,network,logs})=>{
  await jsonBoot(context,open,page);const select=treeNode(page,'select',['0']);await select.focus();await page.keyboard.press('Enter');await page.locator('[data-json-tree-selection]').waitFor();await poll(async()=>await page.locator('[data-json-tree-path-status="checking"]').count()===0,'path validation')
  const fields=[page.locator('[data-json-tree-pointer]'),page.locator('[data-json-tree-value]')],controls=[page.locator('[data-json-tree-copy="value"]'),page.locator('[data-json-tree-copy="pointer"]'),select];const ko=await mobile(page,fields,controls);await screenshot(page,'json-tree-320-ko',page.locator('[data-json-tree-selection]'));const id=await select.getAttribute('data-json-tree-select')
  await changeLanguage(page,'en');await poll(async()=>await page.locator('[data-json-tree-copy="value"]').innerText()===jsonText('selection.copy.value','en'),'English selection panel');assert.equal(await page.locator('[data-json-tree-select][aria-pressed="true"]').getAttribute('data-json-tree-select'),id);const en=await mobile(page,fields,controls);await screenshot(page,'json-tree-320-en',page.locator('[data-json-tree-selection]'))
  const storage=await page.evaluate(()=>JSON.stringify(localStorage)+JSON.stringify(sessionStorage)+location.href);assert.ok(!storage.includes('numeric own key'));assert.ok(!network.some(item=>item.includes('numeric own key')));assert.ok(!logs.some(item=>item.includes('numeric own key')))
  return{ko,en,fontMinimumPx:16,touchMinimumPx:44,keyboardSelection:true,localeKeepsSelectedIdentity:true,sourceSelectionStorageNetwork:0}
},{width:320,dark:true})


const planned = [
  "json-tree-native-path-pointer-and-special-own-keys",
  "json-tree-root-empty-primitives-and-nonfinite-json5",
  "json-tree-sort-expansion-and-existing-jsonpath-filter",
  "json-tree-large-preview-exact-native-copy",
  "json-tree-copy-recovery-stale-input-selection-and-mode",
  "json-tree-320-dark-ko-en-keyboard-and-no-persistence"
]
const productCasesReady = true
if (only === '--list') console.log(planned.join('\n'))
else {
  assert.ok(productCasesReady, 'Final ready and native cases pending; Chrome was not started')
  const selected = cases.filter(item => !only || only.split(',').some(part => item.name.includes(part))); assert.ok(selected.length, 'No selected cases')
  mkdirSync(out, { recursive: true }); const browser = await chromium.launch({ channel: 'chrome' })
  try { for (const scenario of selected) await run(browser, scenario) }
  finally { await browser.close(); const merged = readdirSync(out).filter(name => name.endsWith('-evidence.json')).map(name => JSON.parse(readFileSync(resolve(out, name), 'utf8'))); const final = { checkedAt: new Date().toISOString(), passed: merged.filter(item => item.status === 'pass').length, failed: merged.filter(item => item.status === 'fail').length, browserClosed: true, results: merged }; writeFileSync(resolve(out, 'final-results.json'), JSON.stringify(final, null, 2)); console.log(JSON.stringify({ passed: final.passed, failed: final.failed, browserClosed: true })) }
  if (results.some(item => item.status !== 'pass')) process.exitCode = 1
}
