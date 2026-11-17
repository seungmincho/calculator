import { chromium } from 'playwright'
import assert from 'node:assert/strict'
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'




// Independent real-browser checks. --list never starts Chrome; case-name filters
// preserve previous evidence so only changed boundaries need to be rerun.
const base = process.env.VERIFY_BASE_URL || 'http://127.0.0.1:3039'
const out = resolve('docs/verify/2026-11-17-repeat-batch34/browser')
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
    if (!localStorage.getItem('__batch34Seeded')) { localStorage.setItem('language', options.language ?? 'ko'); localStorage.setItem('theme', options.dark ? 'dark' : 'light'); localStorage.setItem('__batch34Seeded', '1') }
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
  try { detail = await fn({ page, context, open, network, logs }) ?? {}; assert.deepEqual(errors, [], 'JS page errors'); assert.deepEqual(hydration, [], 'Hydration errors'); for (const active of context.pages()) assert.deepEqual(await active.evaluate(() => window.__unhandled), [], 'Unhandled rejections'); assert.ok(!/\b(?:numberToKorean)\.[a-zA-Z][\w.]+/.test(await page.locator('body').innerText()), 'Raw translation key') }
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


const n = (key, language = 'ko', values = {}) => tr('numberToKorean', key, language, values)
const input = page => page.locator('#ntk-input')
const copy = (page, target) => page.locator(`[data-number-copy="${target}"]`)
const recovery = page => page.locator('[data-number-copy-recovery]')
const batch = page => page.locator('[aria-labelledby="number-batch-heading"]')
const readClipboard = page => page.evaluate(() => window.__nativeClipboardRead())
const resultValue = (page, target) => target === 'formal' ? page.locator('[data-number-result] [aria-live]') : copy(page, target).locator('..').locator('.text-lg')
async function boot({ page, context, open }, query = '') { await observeDecisionPorts(context); await open('number-to-korean', query); await page.locator('[data-number-restored="true"]').waitFor() }
async function copied(page, target) { await poll(async () => await copy(page, target).getAttribute('data-number-copied') === 'true', `copied ${target}`) }
async function replaceNativeSelection(page, start, end, text) { await input(page).focus(); await input(page).evaluate((node, range) => node.setSelectionRange(...range), [start, end]); await page.keyboard.insertText(text) }
function parseDelimited(text, separator) {
  const records = []; let row = [], cell = '', quoted = false
  for (let i = text.charCodeAt(0) === 0xfeff ? 1 : 0; i < text.length; i++) {
    const c = text[i]
    if (quoted) { if (c === '"' && text[i + 1] === '"') { cell += '"'; i++ } else if (c === '"') quoted = false; else cell += c }
    else if (c === '"' && cell === '') quoted = true
    else if (c === separator) { row.push(cell); cell = '' }
    else if (c === '\r' || c === '\n') { row.push(cell); records.push(row); row = []; cell = ''; if (c === '\r' && text[i + 1] === '\n') i++ }
    else cell += c
  }
  assert.equal(quoted, false, 'unclosed exported quote'); if (cell || row.length) { row.push(cell); records.push(row) }; return records
}
async function syntheticInput(page, raw, composing = true) { await input(page).evaluate((node, detail) => { Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(node, detail.raw); node.dispatchEvent(new InputEvent('input', { bubbles: true, data: detail.raw, inputType: detail.composing ? 'insertCompositionText' : 'insertText', isComposing: detail.composing })) }, { raw, composing }) }

test('number-native-caret-blur-and-legacy-calculation', async env => {
  const { page } = env; await boot(env); assert.equal(await input(page).evaluate(node => node === document.activeElement), false); assert.equal(await input(page).inputValue(), '123,456,789')
  await input(page).fill('1000000'); await replaceNativeSelection(page, 3, 3, '9'); assert.deepEqual(await input(page).evaluate(node => [node.value, node.selectionStart, node.selectionEnd]), ['10090000', 4, 4]); await page.keyboard.press('Backspace'); assert.deepEqual(await input(page).evaluate(node => [node.value, node.selectionStart]), ['1000000', 3])
  await replaceNativeSelection(page, 1, 4, '88'); assert.deepEqual(await input(page).evaluate(node => [node.value, node.selectionStart]), ['188000', 3]); await input(page).press('Tab'); assert.equal(await input(page).inputValue(), '188,000')
  for (const raw of ['-', '-.', '123.', '1.00', '일억']) { await input(page).fill(raw); await input(page).press('Tab'); assert.equal(await input(page).inputValue(), raw) }
  await input(page).fill('12345678901234567890'); await input(page).press('Tab'); assert.equal(await input(page).inputValue(), '12,345,678,901,234,567,890'); await copy(page, 'link').click(); await copied(page, 'link'); assert.equal(new URL(await readClipboard(page)).searchParams.get('n'), '12345678901234567890')
  await input(page).fill('-1.5'); await input(page).press('Tab'); assert.equal(await resultValue(page, 'reading').innerText(), '마이너스 일점오'); assert.ok(await copy(page, 'formal').isDisabled()); await page.locator('[data-number-quick="1000"]').click(); assert.equal(await input(page).inputValue(), '1,000')
  await input(page).fill('99999999999999999999'); await input(page).press('Tab'); const largest = await input(page).inputValue(); await page.locator('[data-number-quick="1000"]').click(); assert.equal(await input(page).inputValue(), largest)
  return { nativeInsertionDeletionReplacementCaret: true, blurOnlyGrouping: true, incompleteRawPreserved: true, exact20DigitLink: true, negativeFractionAndQuickLegacy: true, quickOverflowNoop: true, autoFocus: false }
})

test('number-synthetic-ime-and-deferred-blur', async env => {
  const { page } = env; await boot(env, '?n=1000'); await input(page).focus(); const originalUrl = page.url(); await input(page).dispatchEvent('compositionstart', { data: '' }); await syntheticInput(page, '일억')
  assert.equal(await input(page).inputValue(), '일억'); assert.equal(page.url(), originalUrl); assert.ok(await copy(page, 'reading').isDisabled()); assert.ok(await page.locator('[data-number-clear]').isDisabled()); assert.ok(await page.locator('[data-number-quick="1000"]').isDisabled())
  await input(page).dispatchEvent('compositionend', { data: '일억' }); await syntheticInput(page, '일억', false); assert.equal(await input(page).inputValue(), '일억'); await input(page).press('Tab'); await poll(() => Promise.resolve(new URL(page.url()).searchParams.get('n') === '100000000'), 'completed Korean input sync')
  await input(page).focus(); await input(page).dispatchEvent('compositionstart', { data: '' }); await syntheticInput(page, '1234'); await input(page).evaluate(node => node.blur()); assert.equal(await input(page).inputValue(), '1234')
  await input(page).evaluate(node => { node.dispatchEvent(new CompositionEvent('compositionend', { bubbles: true, data: '1234' })); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(node, '12345'); node.dispatchEvent(new InputEvent('input', { bubbles: true, data: '5', inputType: 'insertText', isComposing: false })) }); await poll(async () => await input(page).inputValue() === '12,345', 'final trailing input deferred blur')
  await input(page).focus(); await input(page).dispatchEvent('compositionstart'); await syntheticInput(page, '9876'); await input(page).evaluate(node => node.blur()); await input(page).evaluate(node => { node.dispatchEvent(new CompositionEvent('compositionend', { bubbles: true, data: '9876' })); node.focus() }); await syntheticInput(page, '98765', false); await wait(80); assert.equal(await input(page).inputValue(), '98765')
  return { syntheticCompositionOnly: true, nativeOsImeTested: false, compositionUrlFrozen: true, composingActionsDisabled: true, trailingInputDeferredNormalization: '12,345', refocusKeepsLatestRaw: true }
})

test('number-url-initial-clear-revisit-and-current-link', async env => {
  const { page, open, context } = env; await context.addInitScript(() => { if (location.pathname.includes('number-to-korean')) history.replaceState({ ...history.state, numberFixture: 'keep' }, '', location.href) }); await boot(env, '?keep=1#anchor'); assert.equal(new URL(page.url()).searchParams.has('n'), false); assert.equal(await input(page).inputValue(), '123,456,789')
  await page.locator('[data-number-clear]').click(); await poll(() => Promise.resolve(new URL(page.url()).searchParams.has('n') && new URL(page.url()).searchParams.get('n') === ''), 'explicit empty n'); assert.equal(await input(page).inputValue(), ''); await page.reload({ waitUntil: 'domcontentloaded' }); await page.locator('[data-number-restored="true"]').waitFor(); assert.equal(await input(page).inputValue(), ''); assert.equal(await page.locator('[data-number-example]').count(), 0)
  await open('number-to-korean', '?n=invalid-fixture&keep=1#anchor'); await page.locator('[data-number-restored="true"]').waitFor(); assert.equal(await input(page).inputValue(), 'invalid-fixture'); assert.equal(new URL(page.url()).searchParams.get('n'), 'invalid-fixture')
  await input(page).fill('9007199254740993'); await copy(page, 'link').click(); await copied(page, 'link'); const url = new URL(await readClipboard(page)); assert.equal(url.searchParams.get('n'), '9007199254740993'); assert.equal(url.searchParams.get('keep'), '1'); assert.equal(url.hash, '#anchor'); assert.equal(await page.evaluate(() => history.state.numberFixture), 'keep')
  await open('number-to-korean', '?n=0'); await page.locator('[data-number-restored="true"]').waitFor(); assert.equal(await input(page).inputValue(), '0'); assert.equal(await resultValue(page, 'reading').innerText(), '영'); assert.ok(await copy(page, 'formal').isDisabled())
  return { initialExampleNoUrlWrite: true, clearEmptyNReload: true, invalidQueryPreservedUntilEdit: true, currentCanonicalBeyondSafeInteger: '9007199254740993', unrelatedQueryHashStatePreserved: true, actualZeroDistinct: true }
})

test('number-single-copy-recovery-and-stale-options', async env => {
  const { page } = env; await boot(env, '?n=1000'); await page.evaluate(() => window.__setClipboardMode('reject')); await copy(page, 'formal').click(); await recovery(page).waitFor(); assert.equal(await recovery(page).locator('textarea').inputValue(), '금 일천원정')
  await page.evaluate(() => { window.__numberNativeSelect = HTMLTextAreaElement.prototype.select; HTMLTextAreaElement.prototype.select = function () { throw new Error('fixture selection failure') } }); await page.locator('[data-number-copy-select]').click(); await recovery(page).getByRole('status').filter({ hasText: n('copyRecovery.selectionFailed') }).waitFor(); await page.evaluate(() => HTMLTextAreaElement.prototype.select = window.__numberNativeSelect)
  await page.locator('[data-number-copy-select]').click(); assert.deepEqual(await recovery(page).locator('textarea').evaluate(node => [node.selectionStart, node.selectionEnd, node === document.activeElement]), [0, '금 일천원정'.length, true]); await page.evaluate(() => window.__setClipboardMode('native')); await page.locator('[data-number-copy-retry]').click(); await copied(page, 'formal'); assert.equal(await readClipboard(page), '금 일천원정'); await page.evaluate(() => window.__oldNumberFlash = window.__orderTimers.findLast(item => item.delay === 2000).callback)
  await page.evaluate(() => window.__setClipboardMode('hold')); await copy(page, 'reading').click(); await page.locator('[data-number-prefix="ilgeum"]').click(); await page.locator('[data-number-spacing]').check(); await page.evaluate(() => window.__setClipboardMode('native')); await copy(page, 'formal').click(); await copied(page, 'formal'); const calls = await page.evaluate(() => window.__legacyCalls.length); await page.evaluate(() => { window.__clipboardPending.shift().reject(new Error('stale options')); window.__oldNumberFlash() }); await wait(80); assert.equal(await page.evaluate(() => window.__legacyCalls.length), calls); assert.equal(await copy(page, 'formal').getAttribute('data-number-copied'), 'true'); assert.match(await readClipboard(page), /^일금 /)
  await page.evaluate(() => { window.__setClipboardMode('absent'); window.__legacyMode = 'throw' }); await copy(page, 'reading').click(); await recovery(page).waitFor(); await page.locator('[data-number-copy-close]').click(); assert.equal(await recovery(page).count(), 0)
  await page.evaluate(() => window.__legacyMode = 'true'); await copy(page, 'reading').click(); await copied(page, 'reading')
  return { failedFullText: true, manualSelection: true, selectionFailureRecovered: true, nativeRetry: true, staleOptionsFallback: 0, oldSuccessTimerSafe: true, absentThrowRecovery: true, legacyTrueModeled: true }
})

test('number-batch-global-copy-owner-and-unmount', async env => {
  const { page } = env; await boot(env, '?n=1000'); await page.locator('#number-batch-input').fill('Batch fixture\t2000')
  await page.evaluate(() => window.__setClipboardMode('hold')); await copy(page, 'formal').click(); await page.evaluate(() => window.__setClipboardMode('native')); await copy(page, 'batch').click(); await copied(page, 'batch'); const table = await readClipboard(page), before = await page.evaluate(() => window.__legacyCalls.length); await page.evaluate(() => window.__clipboardPending.shift().reject(new Error('old single'))); await wait(80); assert.equal(await page.evaluate(() => window.__legacyCalls.length), before); assert.equal(await copy(page, 'batch').getAttribute('data-number-copied'), 'true'); assert.equal(await readClipboard(page), table)
  await page.evaluate(() => window.__setClipboardMode('hold')); await copy(page, 'batch').click(); await page.evaluate(() => window.__setClipboardMode('native')); await copy(page, 'link').click(); await copied(page, 'link'); const link = await readClipboard(page); await page.evaluate(() => window.__clipboardPending.shift().reject(new Error('old batch'))); await wait(80); assert.equal(await readClipboard(page), link); assert.equal(await page.evaluate(() => window.__legacyCalls.length), before)
  await page.evaluate(() => window.__setClipboardMode('hold')); await copy(page, 'batch').click(); await page.locator('header a[href="/"]:visible').first().click(); await poll(async () => await input(page).count() === 0, 'number tool unmounted'); await page.evaluate(() => window.__clipboardPending.shift().reject(new Error('unmounted'))); await wait(80); assert.equal(await page.evaluate(() => window.__legacyCalls.length), before)
  return { singleToBatchOwner: true, batchToLinkOwner: true, oldFallback: 0, unmountFallback: 0, nativeClipboardRetainsNewest: true }
})

test('number-native-100-lines-csv-tsv-and-limits', async env => {
  const { page, network } = env; await boot(env)
  const lines = Array.from({ length: 100 }, (_, i) => `Row ${i + 1}\t${i + 1}`); lines[1] = ''; lines[2] = '=SUM(1,2)\t1000'; lines[3] = 'Quoted "label"\t1,234'; lines[4] = 'Negative\t-3'; lines[5] = 'Large\t12345678901234567890'; lines[6] = 'Bad\t12,34'; lines[7] = 'Extra\t12\textra'; lines[8] = 'Empty\t'; lines[99] = 'End\t0'
  const source = lines.join('\n') + '\n'; await page.locator('#number-batch-input').fill(source); assert.equal(await batch(page).locator('tbody tr').count(), 99); await copy(page, 'batch').click(); await copied(page, 'batch'); const tsv = await readClipboard(page); const table = parseDelimited(tsv, '\t'); assert.equal(table.length, 100); assert.ok(table.every(row => row.length === 7))
  const file = await download(page, () => page.locator('[data-number-download="csv"]').click(), 'number-100-native.csv'); assert.equal(file.filename, 'number-to-korean-batch.csv'); assert.deepEqual([...file.bytes.subarray(0, 3)], [239, 187, 191]); const csv = parseDelimited(file.text, ','); assert.deepEqual(csv, table)
  for (let i = 0, row = 1; i < lines.length; i++) { if (!lines[i]) continue; assert.equal(csv[row][0], String(i + 1)); assert.equal(csv[row][2], `'${lines[i]}`); row++ }
  assert.equal(csv[2][1], "'=SUM(1,2)"); assert.equal(csv[3][1], "'Quoted \"label\""); assert.equal(csv[4][3], "'-3"); assert.equal(csv[5][3], "'12345678901234567890"); assert.equal(csv[6][6], n('batch.errors.invalidAmount')); assert.equal(csv[7][6], n('batch.errors.tooManyColumns')); assert.equal(csv[8][6], n('batch.errors.emptyAmount')); assert.equal(csv[99][3], "'0")
  assert.ok(!network.some(value => value.includes('=SUM(1,2)'))); assert.equal(new URL(page.url()).searchParams.has('n'), false); writeFileSync(resolve(out, 'number-100-native.tsv'), tsv)
  await page.locator('#number-batch-input').fill(Array.from({ length: 101 }, () => '1').join('\n')); await batch(page).getByRole('alert').filter({ hasText: n('batch.errors.tooManyLines') }).waitFor(); assert.equal(await batch(page).locator('tbody tr').count(), 0); assert.ok(await page.locator('[data-number-download="csv"]').isDisabled())
  return { physicalLines: 100, exportedRows: 99, columns: 7, csvBytes: file.bytes.length, utf8Bom: true, csvTsvIndependentParseExact: true, rawLineNumbersAndErrorsPreserved: true, formulaTextProtection: true, limit101BlocksAll: true }
})

test('number-320-dark-ko-en', async env => {
  const { page } = env; await boot(env, '?n=123456789'); await page.locator('#number-batch-input').fill('긴 항목 합성\t12345678901234567890\nBad\tinvalid'); await page.evaluate(() => window.__setClipboardMode('reject')); await copy(page, 'formal-mobile').click(); await recovery(page).waitFor()
  const ko = await mobile(page, [input(page), recovery(page).locator('textarea')], [page.locator('[data-number-clear]'), page.locator('[data-number-copy-select]'), page.locator('[data-number-copy-retry]')]); await screenshot(page, 'number-320-ko', recovery(page)); const raw = await input(page).inputValue(); await changeLanguage(page, 'en'); await poll(async () => await page.locator('[data-number-clear]').innerText() === n('editing.clear', 'en'), 'English number UI'); assert.equal(await input(page).inputValue(), raw); assert.equal(await recovery(page).count(), 0)
  await copy(page, 'batch').click(); await recovery(page).waitFor(); const en = await mobile(page, [input(page), page.locator('#number-batch-input'), recovery(page).locator('textarea')], [copy(page, 'batch'), page.locator('[data-number-copy-select]'), page.locator('[data-number-copy-retry]')]); const scroll = await batch(page).locator('[role="region"]').evaluate(node => ({ client: node.clientWidth, scroll: node.scrollWidth })); assert.ok(scroll.scroll > scroll.client); await screenshot(page, 'number-320-en', recovery(page))
  return { ko, en, fontMinimumPx: 16, touchMinimumPx: 44, localeKeepsInput: true, tableScrollInternal: scroll, syntheticOsKeyboardOnly: true }
}, { width: 320, dark: true })

const planned = [
  "number-native-caret-blur-and-legacy-calculation",
  "number-synthetic-ime-and-deferred-blur",
  "number-url-initial-clear-revisit-and-current-link",
  "number-single-copy-recovery-and-stale-options",
  "number-batch-global-copy-owner-and-unmount",
  "number-native-100-lines-csv-tsv-and-limits",
  "number-320-dark-ko-en"
]
const productCasesReady = true
if (only === '--self-test') {
  assert.deepEqual(parseDelimited('\uFEFFa,b,c\r\n"quoted""cell","line\r\ninside",\r\n', ','), [['a', 'b', 'c'], ['quoted"cell', 'line\r\ninside', '']])
  assert.deepEqual(parseDelimited('a\tb\n"tab\tinside"\t"quote""x"', '\t'), [['a', 'b'], ['tab\tinside', 'quote"x']])
  console.log('PASS verifier independent CSV/TSV reader preparation (not product/browser execution)')
} else if (only === '--list') console.log(planned.join('\n'))
else {
  assert.ok(productCasesReady, 'Final ready and native cases pending; Chrome was not started')
  const selected = cases.filter(item => !only || only.split(',').some(part => item.name.includes(part))); assert.ok(selected.length, 'No selected cases')
  mkdirSync(out, { recursive: true }); const browser = await chromium.launch({ channel: 'chrome' })
  try { for (const scenario of selected) await run(browser, scenario) }
  finally { await browser.close(); const merged = readdirSync(out).filter(name => name.endsWith('-evidence.json')).map(name => JSON.parse(readFileSync(resolve(out, name), 'utf8'))); const final = { checkedAt: new Date().toISOString(), passed: merged.filter(item => item.status === 'pass').length, failed: merged.filter(item => item.status === 'fail').length, browserClosed: true, results: merged }; writeFileSync(resolve(out, 'final-results.json'), JSON.stringify(final, null, 2)); console.log(JSON.stringify({ passed: final.passed, failed: final.failed, browserClosed: true })) }
  if (results.some(item => item.status !== 'pass')) process.exitCode = 1
}
