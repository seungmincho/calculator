import { chromium } from 'playwright'
import assert from 'node:assert/strict'
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { legacySettlement, legacyRecent, installDutchStorageObserver, holdDutchLock, releaseDutchLock } from '../docs/verify/2026-11-17-repeat-batch36/browser-fixtures.mjs'




// Independent real-browser checks. --list never starts Chrome; case-name filters
// preserve previous evidence so only changed boundaries need to be rerun.
const base = process.env.VERIFY_BASE_URL || 'http://127.0.0.1:3039'
const out = resolve('docs/verify/2026-11-17-repeat-batch36/browser')
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
    if (!localStorage.getItem('__batch36Seeded')) { localStorage.setItem('language', options.language ?? 'ko'); localStorage.setItem('theme', options.dark ? 'dark' : 'light'); localStorage.setItem('__batch36Seeded', '1') }
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
  try { detail = await fn({ page, context, open, network, logs }) ?? {}; assert.deepEqual(errors, [], 'JS page errors'); assert.deepEqual(hydration, [], 'Hydration errors'); for (const active of context.pages()) assert.deepEqual(await active.evaluate(() => window.__unhandled), [], 'Unhandled rejections'); assert.ok(!/\b(?:dutchPay|shareResult)\.[a-zA-Z][\w.]+/.test(await page.locator('body').innerText()), 'Raw translation key') }
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



const recentKey = 'dutchPay.recent', accountKey = 'dutchPay.account'
const raw = (page, key) => page.evaluate(key => window.__nativeDutchRead(key), key)
const ready = page => page.waitForFunction(() => !!document.querySelector('[data-dutch-copy="notice"]') && !document.querySelector('[data-dutch-copy="notice"]').disabled)
const feedback = (page, status) => page.locator(`[data-dutch-recent-status="${status}"]`).waitFor()
const recovery = page => page.locator('[data-dutch-copy-recovery]')
const copyButton = (page, id) => page.locator(`[data-dutch-copy="${id}"]`)
const accountState = (page, status) => page.locator(`[data-dutch-account-status="${status}"]`).waitFor()

test('dutch-legacy-ten-url-priority-and-explicit-record-actions', async ({page,context,open}) => {
  const records=legacyRecent(), original=JSON.stringify(records), current=legacySettlement({title:'Current URL',amount:9000})
  await installDutchStorageObserver(context,{[recentKey]:original}); await open('dutch-pay',`?d=${current.d}&keep=1#test`); await ready(page)
  assert.equal(await page.locator('#dp-title').inputValue(),current.title); assert.equal(await page.locator('[data-dutch-load]').count(),10)
  assert.equal(await raw(page,recentKey),original); assert.equal(await page.evaluate(()=>window.__dutchWrites.length),0)
  await page.locator('[data-dutch-load]').nth(3).click(); await poll(async()=>await page.locator('#dp-title').inputValue()===records[3].title,'Explicit legacy load')
  assert.equal(await raw(page,recentKey),original); await page.locator('#dp-title').fill('New saved settlement'); await page.locator('[data-dutch-save]').click(); await feedback(page,'saved')
  const committed=JSON.parse(await raw(page,recentKey)); assert.equal(committed.length,10); assert.equal(committed[0].title,'New saved settlement'); assert.equal(committed[1].d,records[0].d)
  await page.locator('[data-dutch-delete]').nth(1).click(); await feedback(page,'deleted'); assert.equal(await page.locator('#dp-title').inputValue(),'New saved settlement'); assert.equal(JSON.parse(await raw(page,recentKey)).length,9)
  await open('dutch-pay','?total=12000&people=4'); await ready(page); assert.equal(await page.locator('[data-dutch-person]').count(),4); assert.equal(await page.locator('[data-dutch-item-amount]').first().inputValue(),'12,000'); assert.equal(await page.locator('#dp-title').inputValue(),'')
  return {legacyRecords:10,retainedAfterExplicitDelete:9,firstVisitWrites:0,urlAndLegacyQueryPriority:true,automaticRecordApplication:false}
})

test('dutch-corrupt-future-and-101-loss-protection', async ({page,context,open}) => {
  await installDutchStorageObserver(context,{[recentKey]:'{broken'}); await open('dutch-pay'); await ready(page); await feedback(page,'error'); await page.locator('[data-dutch-save]').click(); assert.equal(await raw(page,recentKey),'{broken')
  const future=legacySettlement({version:2}), futureRaw=JSON.stringify([{d:future.d,title:future.title,total:future.total,n:future.n,at:Date.now()}])
  await page.evaluate(({key,value})=>window.__nativeDutchWrite(key,value),{key:recentKey,value:futureRaw}); await page.locator('[data-dutch-recent-recheck]').click(); await feedback(page,'error'); assert.equal(await raw(page,recentKey),futureRaw)
  await page.evaluate(key=>window.__nativeDutchWrite(key,'[]'),recentKey); await page.locator('[data-dutch-recent-recheck]').click()
  await page.evaluate(key=>window.__nativeDutchWrite(key,'123'),accountKey); await open('dutch-pay'); await ready(page); await accountState(page,'error'); await page.locator('#dp-title').fill('Independent recent key'); await page.locator('[data-dutch-save]').click(); await feedback(page,'saved'); assert.equal(await raw(page,accountKey),'123'); assert.equal(JSON.parse(await raw(page,recentKey)).length,1)
  await page.evaluate(key=>window.__nativeDutchWrite(key,'[]'),recentKey)
  const hundred=legacySettlement({expenses:100,amount:1}); await open('dutch-pay',`?d=${hundred.d}`); await ready(page); assert.equal(await page.locator('[data-dutch-item-name]').count(),100)
  await page.locator('[data-dutch-add-item]').click(); assert.equal(await page.locator('[data-dutch-item-name]').count(),101); await page.locator('[data-dutch-item-name]').last().fill('Must not silently disappear'); await page.locator('[data-dutch-save]').click(); await feedback(page,'error'); assert.equal(await raw(page,recentKey),'[]'); assert.equal(await page.locator('[data-dutch-item-name]').count(),101)
  return {corruptAndFutureRawPreserved:true,corruptAccountDoesNotBlockRecent:true,liveExpenseCount:101,lossySaveRefused:true,storedRecords:0}
})

test('dutch-native-storage-quota-readback-and-recovery', async ({page,context,open}) => {
  const initial=JSON.stringify(legacyRecent(1)); await installDutchStorageObserver(context,{[recentKey]:initial}); await open('dutch-pay'); await ready(page)
  await page.locator('#dp-title').fill('Quota preserves draft'); await page.evaluate(key=>window.__dutchFaults[key]='quota',recentKey); await page.locator('[data-dutch-save]').click(); await feedback(page,'error'); assert.equal(await raw(page,recentKey),initial); assert.equal(await page.locator('#dp-title').inputValue(),'Quota preserves draft')
  await page.evaluate(key=>{window.__dutchFaults[key]='readback';window.__dutchReadAfterWrite[key]=false},recentKey); await page.locator('[data-dutch-save]').click(); await feedback(page,'error'); const unconfirmed=await raw(page,recentKey); assert.notEqual(unconfirmed,initial); assert.equal(await page.locator('[data-dutch-load]').count(),1)
  await page.evaluate(key=>delete window.__dutchFaults[key],recentKey); const writes=await page.evaluate(()=>window.__dutchWrites.length); await page.locator('[data-dutch-recent-recheck]').click(); await poll(async()=>await page.locator('[data-dutch-load]').count()===2,'Readback recheck exposes committed value'); assert.equal(await page.evaluate(()=>window.__dutchWrites.length),writes)
  await page.evaluate(key=>window.__dutchFaults[key]='read',recentKey); await page.locator('#dp-title').fill('Blocked read preserves draft'); await page.locator('[data-dutch-save]').click(); await feedback(page,'error'); assert.equal(await raw(page,recentKey),unconfirmed)
  const secret='SYNTHETIC-ACCOUNT-36-ONLY'; page.__verificationSecrets.push(secret); await page.evaluate(key=>window.__dutchFaults[key]='quota',accountKey); await page.locator('#dp-account').fill(secret); await accountState(page,'error'); assert.equal(await page.locator('#dp-account').inputValue(),secret); assert.equal(await raw(page,accountKey),null)
  await page.evaluate(key=>delete window.__dutchFaults[key],accountKey); await page.locator('[data-dutch-account-retry]').click(); await accountState(page,'saved'); assert.equal(JSON.parse(await raw(page,accountKey)),secret)
  return {quotaPreservedDraft:true,readbackWriteCommittedButUnconfirmed:true,noRollbackOrRecheckWrite:true,readFailurePreservedRecord:true,accountRetryConfirmed:true,accountRawOmitted:true}
},{sensitive:true})

test('dutch-two-tabs-native-lock-cas-and-latest-account', async ({page,context,open}) => {
  await installDutchStorageObserver(context,{[recentKey]:'[]'}); await open('dutch-pay'); await ready(page); const second=await context.newPage(); await open('dutch-pay','',second); await ready(second)
  await page.locator('#dp-title').fill('First tab commit'); await second.locator('#dp-title').fill('Second tab preserved'); await page.locator('[data-dutch-save]').click(); await feedback(page,'saved'); await feedback(second,'error'); const committed=await raw(page,recentKey)
  await second.locator('[data-dutch-save]').click(); await feedback(second,'error'); assert.equal(await raw(page,recentKey),committed); assert.equal(await second.locator('#dp-title').inputValue(),'Second tab preserved')
  await second.locator('[data-dutch-recent-recheck]').click(); await second.locator('[data-dutch-save]').click(); await feedback(second,'saved'); assert.equal(JSON.parse(await raw(page,recentKey)).length,2)
  await page.locator('[data-dutch-recent-recheck]').click(); await holdDutchLock(second,recentKey); await page.locator('[data-dutch-load]').first().click(); await feedback(page,'loading'); await page.locator('#dp-title').fill('Edit cancels queued load'); await releaseDutchLock(second); await wait(100); assert.equal(await page.locator('#dp-title').inputValue(),'Edit cancels queued load')
  const values=['SYNTHETIC-A-ONLY','SYNTHETIC-B-ONLY']; page.__verificationSecrets.push(...values)
  await holdDutchLock(second,accountKey); await page.locator('#dp-account').fill(values[0]); await accountState(page,'saving'); await page.locator('#dp-account').fill(values[1]); await releaseDutchLock(second); await accountState(page,'saved'); assert.equal(JSON.parse(await raw(page,accountKey)),values[1]); assert.equal(await page.locator('#dp-account').inputValue(),values[1])
  await accountState(second,'error'); await second.locator('[data-dutch-account-recheck]').click(); assert.equal(await second.locator('#dp-account').inputValue(),''); assert.equal(JSON.parse(await raw(page,accountKey)),values[1])
  return {nativeWebLocks:true,twoRealTabs:true,staleSaveBlocked:true,queuedLoadCanceledByEdit:true,latestAccountOnlyCommitted:true,accountRecheckPreservesLocalDraft:true,accountRawOmitted:true}
},{sensitive:true})

test('dutch-readonly-account-privacy-boundary', async ({page,context,open,network}) => {
  const secret='SYNTHETIC-PRIVATE-ACCOUNT-ONLY'; page.__verificationSecrets.push(secret); await installDutchStorageObserver(context,{[accountKey]:JSON.stringify(secret),[recentKey]:'[]'}); await observeDecisionPorts(context)
  const fixture=legacySettlement({amount:12300}); await open('dutch-pay',`?d=${fixture.d}&ro=1`); await ready(page); assert.equal(await page.locator('#dp-account').count(),0); assert.equal(await page.locator('[data-dutch-save]').count(),0); assert.ok(!(await page.locator('body').innerText()).includes(secret)); assert.ok(!page.url().includes(secret)); assert.equal(await page.evaluate(()=>window.__dutchWrites.length),0)
  await copyButton(page,'notice').click(); assert.ok(!(await page.evaluate(()=>window.__nativeClipboardRead())).includes(secret))
  await page.locator('[data-dutch-edit-readonly]').click(); assert.equal(await page.locator('#dp-account').inputValue(),secret); assert.ok((await page.locator('[data-dutch-notice]').innerText()).includes(secret)); await page.locator('[data-dutch-save]').click(); await feedback(page,'saved'); assert.ok(!(await raw(page,recentKey)).includes(secret)); assert.ok(!page.url().includes(secret)); assert.ok(network.every(value=>!value.includes(secret)))
  return {readonlyAccountInDom:false,readonlyNoticeAccount:false,editableNoticeAccount:true,accountInSharedURLOrRecent:false,networkAccount:false,accountRawOmitted:true}
},{sensitive:true})

test('dutch-native-copy-manual-retry-and-focus', async ({page,context,open}) => {
  await installDutchStorageObserver(context); await observeDecisionPorts(context); await open('dutch-pay',`?d=${legacySettlement({amount:12000}).d}`); await ready(page)
  const amount=page.locator('[data-dutch-copy]').filter({hasNot:page.locator('span')}).first(); await amount.click(); const copied=await page.evaluate(()=>window.__nativeClipboardRead()); assert.match(copied,/^\d+$/)
  const notice=await page.locator('[data-dutch-notice]').innerText(); await copyButton(page,'notice').click(); assert.equal((await page.evaluate(()=>window.__nativeClipboardRead())).replaceAll('\r\n','\n'),notice)
  await copyButton(page,'link').click(); const url=new URL(await page.evaluate(()=>window.__nativeClipboardRead())); assert.equal(url.searchParams.get('ro'),'1'); assert.ok(url.searchParams.get('d'))
  await page.evaluate(()=>window.__setClipboardMode('absent')); await copyButton(page,'notice').click(); await recovery(page).waitFor(); const manual=recovery(page).locator('textarea'); assert.equal(await manual.inputValue(),notice); assert.equal(await manual.getAttribute('readonly'),'')
  await page.locator('[data-dutch-copy-select]').click(); assert.deepEqual(await manual.evaluate(el=>[document.activeElement===el,el.selectionStart,el.selectionEnd]),[true,0,notice.length])
  await page.evaluate(()=>window.__setClipboardMode('native')); await page.locator('[data-dutch-copy-retry]').click(); await poll(async()=>await copyButton(page,'notice').getAttribute('data-dutch-copied')==='true','Native retry completed'); assert.equal(await recovery(page).count(),0); assert.equal(await copyButton(page,'notice').evaluate(el=>el===document.activeElement),true)
  await page.evaluate(()=>window.__setClipboardMode('reject')); await copyButton(page,'link').click(); await recovery(page).waitFor(); await page.locator('[data-dutch-copy-close]').click(); assert.equal(await copyButton(page,'link').evaluate(el=>el===document.activeElement),true)
  await page.evaluate(()=>{window.__legacyMode='throw';window.__savedSelect=HTMLTextAreaElement.prototype.select;HTMLTextAreaElement.prototype.select=function(){throw new Error('selection blocked')}}); await copyButton(page,'link').click(); await recovery(page).waitFor(); await page.locator('[data-dutch-copy-select]').click(); assert.ok((await recovery(page).innerText()).includes(tr('dutchPay','copyRecovery.selectionFailed'))); await page.evaluate(()=>HTMLTextAreaElement.prototype.select=window.__savedSelect)
  await page.evaluate(()=>window.__legacyMode='true'); await copyButton(page,'link').click(); await poll(async()=>await recovery(page).count()===0,'True legacy reports completion'); return {nativeClipboardAmountDigitsOnly:true,nativeNoticeAndReadonlyLink:true,missingApiFalseFallbackRecovery:true,manualSelectionExact:true,nativeRetryAndCloseFocus:true,legacyTrueIsControlledPort:true}
})

test('dutch-cross-copy-aba-and-unmount', async ({page,context,open}) => {
  await installDutchStorageObserver(context); await observeDecisionPorts(context); await open('dutch-pay'); await ready(page); const share=page.locator('[data-dutch-share-boundary] [data-share-action="copy"]')
  await page.evaluate(()=>window.__setClipboardMode('hold')); await copyButton(page,'notice').click(); await poll(async()=>await page.evaluate(()=>window.__clipboardPending.length)===1,'Pending parent copy'); await page.evaluate(()=>window.__setClipboardMode('native')); await share.click(); await page.evaluate(()=>window.__clipboardPending.shift().reject(new Error('late rejected'))); await wait(50); assert.equal(await page.evaluate(()=>window.__legacyCalls.length),0); assert.equal(await recovery(page).count(),0)
  await page.evaluate(()=>window.__setClipboardMode('hold')); await share.click(); await poll(async()=>await page.evaluate(()=>window.__clipboardPending.length)===1,'Pending shared copy'); await page.evaluate(()=>window.__setClipboardMode('native')); await copyButton(page,'link').click(); await page.evaluate(()=>window.__clipboardPending.shift().reject(new Error('late rejected'))); await wait(50); assert.equal(await page.evaluate(()=>window.__legacyCalls.length),0); assert.equal(await page.locator('[data-share-recovery]').count(),0)
  await page.locator('#dp-title').fill('A'); await copyButton(page,'notice').click(); await page.locator('#dp-title').fill('B'); await page.locator('#dp-title').fill('A'); assert.equal((await copyButton(page,'notice').innerText()).trim(),tr('dutchPay','notice.copy'))
  await page.evaluate(()=>window.__setClipboardMode('reject')); await copyButton(page,'notice').click(); await recovery(page).waitFor(); await changeLanguage(page,'en'); await changeLanguage(page,'ko'); assert.equal(await recovery(page).count(),0)
  await page.evaluate(()=>window.__setClipboardMode('hold')); await copyButton(page,'notice').click(); await poll(async()=>await page.evaluate(()=>window.__clipboardPending.length)===1,'Pending before unmount')
  await page.locator('header a[href="/"]').first().click(); await page.locator('[data-dutch-copy="notice"]').waitFor({state:'detached'}); await page.evaluate(()=>window.__clipboardPending.shift().reject(new Error('unmounted copy'))); await wait(50); assert.equal(await page.evaluate(()=>window.__legacyCalls.length),1)
  return {parentToShareAndShareToParentLateFallbacks:0,inputAndLocaleABANoRevival:true,realSpaUnmountLateFallbacks:0}
})

test('dutch-320-dark-ko-en', async ({page,context,open}) => {
  await installDutchStorageObserver(context); await observeDecisionPorts(context); await open('dutch-pay'); await ready(page); await page.evaluate(()=>window.__setClipboardMode('reject')); await copyButton(page,'notice').click(); await recovery(page).waitFor()
  const ko=await mobile(page,[page.locator('#dp-title'),page.locator('#dp-account'),recovery(page).locator('textarea')],[copyButton(page,'notice'),page.locator('[data-dutch-save]'),page.locator('[data-dutch-copy-select]'),page.locator('[data-dutch-copy-retry]')]); await screenshot(page,'dutch-320-ko',recovery(page))
  await changeLanguage(page,'en'); await copyButton(page,'notice').click(); await recovery(page).waitFor(); const en=await mobile(page,[page.locator('#dp-account'),recovery(page).locator('textarea')],[copyButton(page,'notice'),page.locator('[data-dutch-copy-retry]')]); await screenshot(page,'dutch-320-en',recovery(page)); return {ko,en,fieldsAtLeast16:true,controlsAtLeast44:true}
},{width:320,dark:true})

// Execution is enabled only after author and canonical integration readiness.
const planned = [
  "dutch-legacy-ten-url-priority-and-explicit-record-actions",
  "dutch-corrupt-future-and-101-loss-protection",
  "dutch-native-storage-quota-readback-and-recovery",
  "dutch-two-tabs-native-lock-cas-and-latest-account",
  "dutch-readonly-account-privacy-boundary",
  "dutch-native-copy-manual-retry-and-focus",
  "dutch-cross-copy-aba-and-unmount",
  "dutch-320-dark-ko-en"
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

export { tr, wait, poll, test, changeLanguage, screenshot, mobile, download, observeDecisionPorts }
