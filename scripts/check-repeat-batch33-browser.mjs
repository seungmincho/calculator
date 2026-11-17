import { PNG } from 'pngjs'
import { chromium } from 'playwright'
import assert from 'node:assert/strict'
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'




// Independent real-browser checks. --list never starts Chrome; case-name filters
// preserve previous evidence so only changed boundaries need to be rerun.
const base = process.env.VERIFY_BASE_URL || 'http://127.0.0.1:3039'
const out = resolve('docs/verify/2026-11-17-repeat-batch33/browser')
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
    if (!localStorage.getItem('__batch33Seeded')) { localStorage.setItem('language', options.language ?? 'ko'); localStorage.setItem('theme', options.dark ? 'dark' : 'light'); localStorage.setItem('__batch33Seeded', '1') }
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
  try { detail = await fn({ page, context, open, network, logs }) ?? {}; assert.deepEqual(errors, [], 'JS page errors'); assert.deepEqual(hydration, [], 'Hydration errors'); for (const active of context.pages()) assert.deepEqual(await active.evaluate(() => window.__unhandled), [], 'Unhandled rejections'); assert.ok(!/\b(?:shareResult|discountCalculator)\.[a-zA-Z][\w.]+/.test(await page.locator('body').innerText()), 'Raw translation key') }
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

async function observeShareRender(context){await context.addInitScript(()=>{
  window.__shareRenders=[];window.__shareHeld=[];window.__shareRenderMode='native';window.__shareUrls=[];window.__shareCalls=[];window.__shareMode='file'
  const texts=new WeakMap(),fill=CanvasRenderingContext2D.prototype.fillText,encode=HTMLCanvasElement.prototype.toBlob,create=URL.createObjectURL.bind(URL),revoke=URL.revokeObjectURL.bind(URL)
  CanvasRenderingContext2D.prototype.fillText=function(text,x,y,...rest){if(this.canvas.width===1080&&this.canvas.height===1350){let rows=texts.get(this.canvas);if(!rows){rows=[];texts.set(this.canvas,rows)}rows.push({text:String(text),x,y})}return fill.call(this,text,x,y,...rest)}
  HTMLCanvasElement.prototype.toBlob=function(callback,...args){if(this.width!==1080||this.height!==1350)return encode.call(this,callback,...args);const item={texts:texts.get(this)??[],mode:window.__shareRenderMode,delivered:false};window.__shareRenders.push(item);return encode.call(this,blob=>{item.bytes=blob?.size;const deliver=()=>{if(item.delivered)return;item.delivered=true;callback(item.mode==='null'?null:blob)};if(item.mode==='hold')window.__shareHeld.push(deliver);else deliver()},...args)}
  URL.createObjectURL=blob=>{const url=create(blob);window.__shareUrls.push({url,type:blob.type,bytes:blob.size,revoked:false});return url};URL.revokeObjectURL=url=>{const item=window.__shareUrls.find(item=>item.url===url);if(item)item.revoked=true;return revoke(url)}
  window.__shareRelease=()=>{for(const deliver of window.__shareHeld.splice(0))deliver()}
  Object.defineProperty(navigator,'canShare',{configurable:true,value:()=>window.__shareMode==='file'})
  Object.defineProperty(navigator,'share',{configurable:true,value:async data=>{const record={title:data.title,text:data.text,url:data.url,files:[],mode:window.__shareMode};window.__shareCalls.push(record);if(window.__shareMode==='abort')throw new DOMException('fixture canceled','AbortError');if(window.__shareMode==='throw')throw new Error('fixture native share failure');for(const file of data.files??[])record.files.push({name:file.name,type:file.type,bytes:[...new Uint8Array(await file.arrayBuffer())]});record.done=true}})
})}

const d = (key, language = 'ko', values = {}) => tr('discountCalculator', key, language, values)
const panel = page => page.locator('[data-discount-comparison]')
const rows = page => page.locator('[data-discount-row]')
const field = (page, index, name) => rows(page).nth(index).locator(`[data-discount-field="${name}"]`)
const action = (page, name) => panel(page).locator(`[data-discount-action="${name}"]`)
const share = (page, name) => panel(page).locator(`[data-share-action="${name}"]`)
const readClipboard = async page => (await page.evaluate(() => window.__nativeClipboardRead())).replace(/\r\n/g, '\n')
async function boot({ context, open, page }, query = '') { await observeDecisionPorts(context); await open('discount-calculator', query); await poll(async () => await rows(page).count() >= 1 && !await field(page, 0, 'name').isDisabled(), 'comparison ready') }
async function editRow(page, index, values) { for (const [key, value] of Object.entries(values)) await field(page, index, key).fill(String(value)) }
function oracle({ unitPrice, quantity, coupon, shipping }) {
  const price = BigInt(unitPrice), count = BigInt(quantity), discount = BigInt(coupon), delivery = BigInt(shipping), subtotal = price * count
  const appliedCoupon = discount < subtotal ? discount : subtotal, goodsTotal = subtotal - appliedCoupon, total = goodsTotal + delivery
  return { subtotal, appliedCoupon, excessCoupon: discount - appliedCoupon, goodsTotal, shipping: delivery, total, unitAverage: Number(total) / Number(count) }
}
const money = (value, language = 'ko', fraction = false) => `${new Intl.NumberFormat(language === 'en' ? 'en-US' : 'ko-KR', { maximumFractionDigits: fraction ? 2 : 0 }).format(Number(value))} ${d('comparison.won', language)}`
async function assertRow(page, index, expected, language = 'ko') { const id = await rows(page).nth(index).getAttribute('data-discount-row'); for (const [key, value] of Object.entries(expected)) assert.equal(await panel(page).locator(`[data-discount-result="${id}"] [data-discount-value="${key}"]`).innerText(), money(value, language, key === 'unitAverage')) }

test('discount-legacy-modes-and-import-snapshots', async env => {
  const { page, open } = env; await boot(env, '?mode=discountRate&original=101&rate=15')
  await action(page, 'import-basic').click(); assert.equal(await field(page, 2, 'unitPrice').inputValue(), '86')
  await action(page, 'import-multi').click(); assert.equal(await field(page, 3, 'unitPrice').inputValue(), '73'); assert.ok(await action(page, 'add').isDisabled())
  await page.locator('input[type="number"]').first().fill('1000'); assert.equal(await field(page, 2, 'unitPrice').inputValue(), '86'); assert.equal(await field(page, 3, 'unitPrice').inputValue(), '73')
  for (const [query, expected] of [['?mode=finalPrice&original=1000&final=750', '750'], ['?mode=discountAmount&original=1000&amount=2000', '0']]) { await open('discount-calculator', query); await poll(async () => !await action(page, 'import-basic').isDisabled(), 'legacy mode restored'); await action(page, 'import-basic').click(); assert.equal(await field(page, 2, 'unitPrice').inputValue(), expected) }
  await open('discount-calculator', '?mode=finalPrice&original=100&final=150'); await page.locator('#discount-final-price-error').waitFor(); assert.ok(await action(page, 'import-basic').isDisabled())
  return { legacyModes: 3, basicRounded: 86, sequentialRounded: 73, importedSnapshotStable: true, maximumRows: 4, invalidFinalImportBlocked: true }
})

test('discount-bigint-oracle-incomplete-and-boundaries', async env => {
  const { page } = env; await boot(env)
  const fixtures = [{ name: 'Coupon', unitPrice: 100, quantity: 3, coupon: 400, shipping: 30 }, { name: 'Quantity', unitPrice: 10, quantity: 4, coupon: 0, shipping: 0 }, { name: 'Tie', unitPrice: 30, quantity: 1, coupon: 0, shipping: 0 }, { name: 'Zero', unitPrice: 0, quantity: 1, coupon: 0, shipping: 40 }]
  await action(page, 'add').click(); await action(page, 'add').click()
  for (let i = 0; i < fixtures.length; i++) { await editRow(page, i, fixtures[i]); await assertRow(page, i, oracle(fixtures[i])) }
  assert.match(await panel(page).locator('[data-discount-lowest="total"]').innerText(), /Coupon \/ Tie/); assert.match(await panel(page).locator('[data-discount-lowest="unit"]').innerText(), /Coupon \/ Quantity/)
  for (const invalid of ['', '1.5', '-1', '1000000001']) { await field(page, 0, 'unitPrice').fill(invalid); assert.equal(await field(page, 0, 'unitPrice').inputValue(), invalid); assert.ok(await action(page, 'copy').isDisabled()); assert.equal(await panel(page).locator('[data-discount-lowest]').count(), 0); assert.equal(await panel(page).locator('[data-share-result]').count(), 0) }
  await editRow(page, 0, { unitPrice: '1000000000', quantity: '999', coupon: '1000000000000', shipping: '10000000', name: '😀'.repeat(40) }); await assertRow(page, 0, oracle({ unitPrice: 1000000000, quantity: 999, coupon: 1000000000000, shipping: 10000000 })); assert.ok(!await action(page, 'copy').isDisabled())
  await field(page, 0, 'name').fill('😀'.repeat(41)); assert.equal(await field(page, 0, 'name').getAttribute('aria-invalid'), 'true'); assert.ok(await action(page, 'txt').isDisabled())
  return { bigintOracleRows: 5, totalAndUnitTiesIndependent: true, invalidRawPreserved: true, incompleteExportBlocked: true, unicodeName40Boundary: true }
})

test('discount-initial-share-url-edit-and-revisit', async env => {
  const { page, open, context, network } = env, comparison = 'v1:123,2,4,5;999,1,0,0', query = `?mode=discountAmount&original=2000&amount=500&fixture=keep&compare=${encodeURIComponent(comparison)}#retained`
  await context.addInitScript(() => { if (location.pathname.includes('discount-calculator')) history.replaceState({ ...history.state, fixtureState: 'retained' }, '', location.href) })
  await boot(env, query); assert.equal(await field(page, 0, 'unitPrice').inputValue(), '123'); assert.equal(new URL(page.url()).searchParams.get('compare'), comparison)
  await page.locator('input[type="number"]').first().fill('3000'); await poll(() => Promise.resolve(new URL(page.url()).searchParams.get('original') === '3000'), 'basic URL edit'); assert.equal(new URL(page.url()).searchParams.get('compare'), comparison)
  await editRow(page, 0, { name: 'PRIVATE fixture seller', coupon: '8' }); await poll(() => Promise.resolve(!new URL(page.url()).searchParams.has('compare')), 'comparison edit removes stale query')
  await share(page, 'copy').click(); await poll(() => readClipboard(page).then(value => value.includes('compare=')), 'explicit comparison URL'); const url = new URL(await readClipboard(page)); assert.equal(url.searchParams.get('compare'), 'v1:123,2,8,5;999,1,0,0'); assert.equal(url.searchParams.get('fixture'), 'keep'); assert.equal(url.hash, '#retained'); assert.ok(!url.href.includes('PRIVATE')); assert.equal(await page.evaluate(() => history.state.fixtureState), 'retained')
  assert.ok(!network.some(value => value.includes('PRIVATE fixture seller'))); assert.ok(!await page.evaluate(() => JSON.stringify({ ...localStorage, ...sessionStorage }).includes('PRIVATE fixture seller')))
  await open('discount-calculator', `${url.search}${url.hash}`); assert.equal(await field(page, 0, 'name').inputValue(), ''); assert.equal(await field(page, 0, 'coupon').inputValue(), '8')
  await page.locator('[data-discount-basic-action="copy-link"]').click(); await poll(() => readClipboard(page).then(value => !new URL(value).searchParams.has('compare')), 'basic link excludes comparison')
  await open('discount-calculator', '?mode=finalPrice&original=100&final=70&compare=v99%3A1%2C1%2C0%2C0'); await panel(page).getByRole('alert').filter({ hasText: d('comparison.invalidLink') }).waitFor(); assert.equal(await field(page, 0, 'unitPrice').inputValue(), '80000'); assert.equal(await rows(page).count(), 2)
  return { initialNumericRestore: true, privateNamesExcluded: true, explicitShareRevisit: true, basicLinkScope: true, unrelatedQueryHashStatePreserved: true, malformedAllOrNothing: true }
})

test('discount-native-text-txt-png-and-resultkey-stale', async env => {
  const { page, context } = env; await observeShareRender(context); await boot(env)
  await action(page, 'add').click(); await action(page, 'add').click()
  const fixtures = [{ name: 'Seller Alpha', unitPrice: 100, quantity: 3, coupon: 10, shipping: 5 }, { name: 'Seller Beta', unitPrice: 20, quantity: 2, coupon: 0, shipping: 0 }, { name: 'Seller Gamma', unitPrice: 9, quantity: 1, coupon: 99, shipping: 10 }, { name: 'Seller Delta', unitPrice: 5, quantity: 4, coupon: 0, shipping: 1 }]
  for (let i = 0; i < fixtures.length; i++) await editRow(page, i, fixtures[i])
  await action(page, 'copy').click(); await poll(() => readClipboard(page).then(value => value.includes('Seller Delta')), 'native full comparison copy'); const text = await readClipboard(page)
  for (const fixture of fixtures) { assert.ok(text.includes(fixture.name)); const result = oracle(fixture); assert.ok(text.includes(`${d('comparison.results.total')}: ${money(result.total)}`)) }
  const file = await download(page, () => action(page, 'txt').click(), 'discount-comparison-native.txt'); assert.equal(file.filename, 'discount-comparison.txt'); assert.equal(file.text, text); assert.notEqual(file.bytes[0], 0xef)
  const image = await download(page, () => share(page, 'save').click(), 'discount-comparison-native.png'), png = PNG.sync.read(image.bytes); assert.deepEqual([png.width, png.height], [1080, 1350]); const render = await page.evaluate(() => window.__shareRenders.at(-1)); const labels = render.texts.map(row => row.text).join('\n')
  for (let i = 1; i <= 4; i++) assert.ok(labels.includes(d('comparison.defaultName', 'ko', { index: i }))); assert.ok(!labels.includes('Seller Alpha')); writeFileSync(resolve(out, 'discount-comparison-native-canvas.json'), JSON.stringify(render, null, 2))
  let downloads = 0; page.on('download', () => downloads++); await page.evaluate(() => window.__shareRenderMode = 'hold'); await share(page, 'save').click(); await poll(() => page.evaluate(() => window.__shareHeld.length > 0), 'actual PNG held')
  await field(page, 0, 'name').fill('changed'); await field(page, 0, 'name').fill('Seller Alpha'); await page.evaluate(() => window.__shareRelease()); await wait(100); assert.equal(downloads, 0)
  return { txtBytes: file.bytes.length, txtNativeClipboardExact: true, independentTotals: 4, pngBytes: image.bytes.length, pngDimensions: [1080, 1350], allFourSummaryRows: true, namesExcludedFromPng: true, resultKeyAbaLateDownloads: 0 }
})

test('discount-copy-recovery-and-stale-requests', async env => {
  const { page } = env; await boot(env)
  const basicLink = page.locator('[data-discount-basic-action="copy-link"]'), basicOriginal = page.locator('[data-discount-basic-field="original"]')
  const changeAwayAndBack = async () => { for (const value of ['100001', '100000']) { await basicOriginal.fill(value); await poll(() => Promise.resolve(new URL(page.url()).searchParams.get('original') === value), `original ${value} applied`) } }
  await basicLink.click(); await poll(async () => (await basicLink.innerText()).includes(d('copied')), 'basic native success'); await page.evaluate(() => window.__basicAbaFlash = window.__orderTimers.findLast(item => item.delay === 2000).callback); await changeAwayAndBack(); assert.ok(!(await basicLink.innerText()).includes(d('copied')), 'A-B-A must not resurrect basic success'); await page.evaluate(() => window.__basicAbaFlash()); assert.ok(!(await basicLink.innerText()).includes(d('copied')))
  await page.evaluate(() => window.__setClipboardMode('reject')); await basicLink.click(); await page.locator('[data-discount-basic-manual]').waitFor(); await changeAwayAndBack(); assert.equal(await page.locator('[data-discount-basic-manual]').count(), 0, 'A-B-A must not resurrect basic recovery')
  await page.evaluate(() => window.__setClipboardMode('native')); await action(page, 'copy').click(); await poll(async () => (await panel(page).locator('[data-discount-feedback]').innerText()) === d('comparison.actions.copied'), 'comparison native success'); await changeAwayAndBack(); assert.equal(await panel(page).locator('[data-discount-feedback]').count(), 0, 'A-B-A base URL must not resurrect comparison success')
  await page.evaluate(() => window.__setClipboardMode('reject')); await action(page, 'copy').click(); await panel(page).locator('[data-discount-manual]').waitFor(); await changeAwayAndBack(); assert.equal(await panel(page).locator('[data-discount-manual]').count(), 0, 'A-B-A base URL must not resurrect comparison recovery')
  await action(page, 'copy').click(); const manual = panel(page).locator('[data-discount-manual]'); await manual.waitFor(); const text = await manual.inputValue()
  await page.evaluate(() => { window.__discountSelect = HTMLTextAreaElement.prototype.select; HTMLTextAreaElement.prototype.select = function () { throw new Error('fixture selection failure') } }); await action(page, 'select-text').click(); await panel(page).getByRole('status').filter({ hasText: d('comparison.selectionFailed') }).waitFor(); await page.evaluate(() => HTMLTextAreaElement.prototype.select = window.__discountSelect)
  await action(page, 'select-text').click(); assert.deepEqual(await manual.evaluate(node => [node.selectionStart, node.selectionEnd]), [0, text.length])
  await page.evaluate(() => window.__setClipboardMode('native')); await action(page, 'copy').click(); await poll(() => readClipboard(page).then(value => value === text), 'native retry'); await page.evaluate(() => window.__previousSuccess = window.__orderTimers.findLast(item => item.delay === 2000).callback)
  await page.evaluate(() => window.__setClipboardMode('hold')); await action(page, 'copy').click(); await field(page, 0, 'shipping').fill('5'); await page.evaluate(() => window.__setClipboardMode('native')); await action(page, 'copy').click(); await poll(async () => (await panel(page).locator('[data-discount-feedback]').innerText()) === d('comparison.actions.copied'), 'new result success'); const calls = await page.evaluate(() => window.__legacyCalls.length)
  await page.evaluate(() => { window.__clipboardPending.shift().reject(new Error('old result')); window.__previousSuccess() }); await wait(80); assert.equal(await page.evaluate(() => window.__legacyCalls.length), calls); assert.equal(await panel(page).locator('[data-discount-feedback]').innerText(), d('comparison.actions.copied'))
  await page.evaluate(() => window.__setClipboardMode('hold')); await action(page, 'copy').click(); await page.evaluate(() => window.__setClipboardMode('native')); await share(page, 'copy').click(); await poll(() => readClipboard(page).then(value => value.startsWith('http') && value.includes('compare=')), 'shared link owns clipboard'); const link = await readClipboard(page); await page.evaluate(() => window.__clipboardPending.shift().reject(new Error('old comparison'))); await wait(80); assert.equal(await page.evaluate(() => window.__legacyCalls.length), calls); assert.equal(await readClipboard(page), link)
  await page.evaluate(() => window.__setClipboardMode('hold')); await share(page, 'copy').click(); await page.evaluate(() => window.__setClipboardMode('native')); await action(page, 'copy').click(); await poll(async () => (await panel(page).locator('[data-discount-feedback]').innerText()) === d('comparison.actions.copied'), 'comparison takes share ownership'); await page.evaluate(() => window.__clipboardPending.shift().reject(new Error('old shared link'))); await wait(80); assert.equal(await page.evaluate(() => window.__legacyCalls.length), calls)
  await page.evaluate(() => window.__setClipboardMode('hold')); await page.locator('[data-discount-basic-action="copy-link"]').click(); await page.evaluate(() => window.__setClipboardMode('native')); await action(page, 'copy').click(); await poll(async () => (await panel(page).locator('[data-discount-feedback]').innerText()) === d('comparison.actions.copied'), 'comparison takes basic ownership'); await page.evaluate(() => window.__clipboardPending.shift().reject(new Error('old basic link'))); await wait(80); assert.equal(await page.evaluate(() => window.__legacyCalls.length), calls); assert.equal(await page.locator('[data-discount-basic-manual]').count(), 0)
  await page.evaluate(() => { window.__setClipboardMode('absent'); window.__legacyMode = 'true' }); await action(page, 'copy').click(); await poll(async () => (await panel(page).locator('[data-discount-feedback]').innerText()) === d('comparison.actions.copied'), 'legacy modeled success')
  await page.evaluate(() => window.__setClipboardMode('hold')); await action(page, 'copy').click(); await page.locator('header a[href="/"]:visible').first().click(); await poll(async () => await panel(page).count() === 0, 'comparison unmounted'); const before = await page.evaluate(() => window.__legacyCalls.length); await page.evaluate(() => window.__clipboardPending.shift().reject(new Error('unmounted'))); await wait(80); assert.equal(await page.evaluate(() => window.__legacyCalls.length), before)
  return { nativeRetry: true, manualFullSelection: true, selectionFailureRecovered: true, basicAbaSuccessRevival: 0, basicAbaRecoveryRevival: 0, comparisonAbaSuccessRevival: 0, comparisonAbaRecoveryRevival: 0, oldFailureFallback: 0, oldTimerPreservesNew: true, wholeToShareAndReverseFallback: 0, basicToWholeFallback: 0, legacyTrueModeled: true, unmountFallback: 0 }
})

test('discount-320-dark-ko-en', async env => {
  const { page } = env; await boot(env); await field(page, 0, 'name').fill('긴 조건 이름 합성 Alpha 12345678901234567890'); const before = await rows(page).locator('input').evaluateAll(nodes => nodes.map(node => node.value))
  await page.evaluate(() => window.__setClipboardMode('reject')); await action(page, 'copy').click(); await panel(page).locator('[data-discount-manual]').waitFor(); const ko = await mobile(page, [field(page, 0, 'name'), field(page, 0, 'unitPrice'), panel(page).locator('[data-discount-manual]')], [action(page, 'add'), action(page, 'copy'), action(page, 'select-text')]); await screenshot(page, 'discount-320-ko', page.locator('#discount-comparison-result'))
  await changeLanguage(page, 'en'); await poll(async () => await action(page, 'copy').innerText() === d('comparison.copy', 'en'), 'English comparison'); assert.deepEqual(await rows(page).locator('input').evaluateAll(nodes => nodes.map(node => node.value)), before); assert.equal(await panel(page).locator('[data-discount-manual]').count(), 0)
  await action(page, 'copy').click(); await panel(page).locator('[data-discount-manual]').waitFor(); const en = await mobile(page, [field(page, 0, 'name'), panel(page).locator('[data-discount-manual]')], [action(page, 'copy'), action(page, 'select-text')]); await screenshot(page, 'discount-320-en', page.locator('#discount-comparison-result'))
  return { ko, en, fontMinimumPx: 16, touchMinimumPx: 44, localeKeepsDraft: true }
}, { width: 320, dark: true })

const planned = [
  "discount-legacy-modes-and-import-snapshots",
  "discount-bigint-oracle-incomplete-and-boundaries",
  "discount-initial-share-url-edit-and-revisit",
  "discount-native-text-txt-png-and-resultkey-stale",
  "discount-copy-recovery-and-stale-requests",
  "discount-320-dark-ko-en"
]
const productCasesReady = true
if (only === '--self-test') {
  assert.deepEqual(oracle({ unitPrice: 100, quantity: 3, coupon: 400, shipping: 30 }), { subtotal: 300n, appliedCoupon: 300n, excessCoupon: 100n, goodsTotal: 0n, shipping: 30n, total: 30n, unitAverage: 10 })
  assert.equal(oracle({ unitPrice: 1000000000, quantity: 999, coupon: 0, shipping: 10000000 }).total, 999010000000n)
  console.log('PASS verifier BigInt oracle preparation (not product/browser execution)')
} else if (only === '--list') console.log(planned.join('\n'))
else {
  assert.ok(productCasesReady, 'Final ready and native cases pending; Chrome was not started')
  const selected = cases.filter(item => !only || only.split(',').some(part => item.name.includes(part))); assert.ok(selected.length, 'No selected cases')
  mkdirSync(out, { recursive: true }); const browser = await chromium.launch({ channel: 'chrome' })
  try { for (const scenario of selected) await run(browser, scenario) }
  finally { await browser.close(); const merged = readdirSync(out).filter(name => name.endsWith('-evidence.json')).map(name => JSON.parse(readFileSync(resolve(out, name), 'utf8'))); const final = { checkedAt: new Date().toISOString(), passed: merged.filter(item => item.status === 'pass').length, failed: merged.filter(item => item.status === 'fail').length, browserClosed: true, results: merged }; writeFileSync(resolve(out, 'final-results.json'), JSON.stringify(final, null, 2)); console.log(JSON.stringify({ passed: final.passed, failed: final.failed, browserClosed: true })) }
  if (results.some(item => item.status !== 'pass')) process.exitCode = 1
}
