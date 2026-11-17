import { chromium } from 'playwright'
import assert from 'node:assert/strict'
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { PDFDocument, PDFArray, PDFRawStream, PDFName, decodePDFRawStream, degrees } from 'pdf-lib'
import JSZip from 'jszip'
import { PNG } from 'pngjs'

// Independent real-browser checks. --list never starts Chrome; case-name filters
// preserve previous evidence so only changed boundaries need to be rerun.
const base = process.env.VERIFY_BASE_URL || 'http://127.0.0.1:3039'
const out = resolve('docs/verify/2026-11-17-repeat-batch24/browser')
const only = process.argv[2]
const messages = Object.fromEntries(['ko', 'en'].map(language => [language, JSON.parse(readFileSync(`messages/${language}.json`, 'utf8'))]))
const tr = (ns, key, language = 'ko', values = {}) => {
  const value = key.split('.').reduce((object, key) => object?.[key], messages[language][ns])
  assert.equal(typeof value, 'string', `Missing ${language}:${ns}.${key}`)
  return value.replace(/\{(\w+)\}/g, (match, key) => values[key] ?? match)
}
const pt = (key, language = "ko", values = {}) => tr("pdfTools", key, language, values)
const pg = (key, language = "ko", values = {}) => tr("passwordGenerator", key, language, values)
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
    if (!localStorage.getItem('__batch24Seeded')) { localStorage.setItem('language', options.language ?? 'ko'); localStorage.setItem('theme', options.dark ? 'dark' : 'light'); localStorage.setItem('__batch24Seeded', '1') }
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
  try { detail = await fn({ page, context, open, network, logs }) ?? {}; assert.deepEqual(errors, [], 'JS page errors'); assert.deepEqual(hydration, [], 'Hydration errors'); for (const active of context.pages()) assert.deepEqual(await active.evaluate(() => window.__unhandled), [], 'Unhandled rejections'); assert.ok(!/\b(?:pdfTools|passwordGenerator)\.[a-zA-Z][\w.]+/.test(await page.locator('body').innerText()), 'Raw translation key') }
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



const fixtureDir = resolve(out, 'fixtures')
async function pdfFixture(name = 'source.pdf', count = 3) {
  mkdirSync(fixtureDir, { recursive: true }); const path = resolve(fixtureDir, name)
  if (!readdirSync(fixtureDir).includes(name)) { const pdf = await PDFDocument.create(); pdf.setCreationDate(new Date('2026-11-17T00:00:00.000Z')); pdf.setModificationDate(new Date('2026-11-17T00:00:00.000Z'))
    for (let n = 0; n < count; n++) { const page = pdf.addPage([200 + n * 20, 300 + n * 10]); page.setRotation(degrees(((n + 1) % 4) * 90)); page.drawText(`VERIFY-PAGE-${n + 1}`, { x: 20, y: 100, size: 12 }) }; writeFileSync(path, await pdf.save())
  }; return { name, mimeType: 'application/pdf', buffer: readFileSync(path) }
}
async function inspectPdf(bytes) {
  const pdf = await PDFDocument.load(bytes); const pages = []
  for (const page of pdf.getPages()) { const contents = page.node.Contents(); const streams = contents instanceof PDFArray ? contents.asArray().map(ref => pdf.context.lookup(ref)) : [contents]; const decoded = streams.map(stream => { assert.ok(stream instanceof PDFRawStream); return Buffer.from(decodePDFRawStream(stream).decode()).toString() }).join('\n'); const marker = Array.from({ length: 100 }, (_, i) => `VERIFY-PAGE-${i + 1}`).find(text => decoded.toLowerCase().includes('<' + Buffer.from(text).toString('hex').toLowerCase() + '>')); pages.push({ marker: marker ?? null, rotation: page.getRotation().angle, size: page.getSize(), contentBytes: decoded.length, hasXObject: !!page.node.Resources()?.get(PDFName.of('XObject')) }) }
  return pages
}
async function observePdfAsync(context) {
  await context.addInitScript(() => {
    window.__pdfReadModes = {}; window.__pdfReads = []; window.__pdfWriterTicks = []; window.__holdPdfWriter = false; window.__pdfUrls = []
    const read = File.prototype.arrayBuffer; File.prototype.arrayBuffer = async function() { const bytes = await read.call(this); const mode = window.__pdfReadModes[this.name]; if (mode === 'hold') await new Promise((resolve, reject) => window.__pdfReads.push({ name: this.name, resolve, reject })); if (mode === 'fail') throw new DOMException('Controlled file read failure', 'NotReadableError'); return bytes }
    window.__releasePdfReads = () => { window.__pdfReadModes = {}; for (const item of window.__pdfReads.splice(0)) item.resolve() }
    const timeout = window.setTimeout; window.setTimeout = function(callback, ms, ...args) { if (window.__holdPdfWriter && ms === 0) { const stack = new Error().stack ?? ''; if (/PDFStreamWriter|PDFWriter/.test(stack)) { window.__pdfWriterTicks.push({ callback, args, stack }); return -1000 - window.__pdfWriterTicks.length } }; return timeout(callback, ms, ...args) }
    window.__releasePdfWriter = () => { window.__holdPdfWriter = false; for (const item of window.__pdfWriterTicks.splice(0)) timeout(item.callback, 0, ...item.args) }
    const create = URL.createObjectURL.bind(URL), revoke = URL.revokeObjectURL.bind(URL); URL.createObjectURL = blob => { const url = create(blob); window.__pdfUrls.push({ url, type: blob.type, bytes: blob.size, revoked: false }); return url }; URL.revokeObjectURL = url => { const entry = window.__pdfUrls.find(item => item.url === url); if (entry) entry.revoked = true; return revoke(url) }
  })
}
async function passwordClipboard(page, state) {
  await page.evaluate(state => { if (!window.__nativePasswordClipboard) window.__nativePasswordClipboard = navigator.clipboard; window.__passwordFallbacks = 0; document.execCommand = () => { window.__passwordFallbacks++; return state === 'true' }; if (state === 'native') { Object.defineProperty(navigator, 'clipboard', { configurable: true, value: window.__nativePasswordClipboard }); return }; if (state === 'absent' || state === 'true') { Object.defineProperty(navigator, 'clipboard', { configurable: true, value: undefined }); return }; Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: state === 'pending' ? () => new Promise((resolve, reject) => { window.__passwordCopyResolve = resolve; window.__passwordCopyReject = reject }) : () => Promise.reject(new DOMException('Controlled clipboard denial', 'NotAllowedError')) } }) }, state)
}
async function observePasswordPrivacy(context) {
  await context.addInitScript(() => { if (!/^https?:$/.test(location.protocol)) return; const random = crypto.getRandomValues.bind(crypto); window.__passwordRandomCalls = 0; crypto.getRandomValues = values => { window.__passwordRandomCalls++; return random(values) }; window.__passwordStorageWrites = []; const set = Storage.prototype.setItem; Storage.prototype.setItem = function(key, value) { window.__passwordStorageWrites.push({ key, value: String(value), area: this === localStorage ? 'local' : 'session' }); return set.call(this, key, value) } })
}

const pwValues = async page => { const values = await page.locator('[data-password-value]').allTextContents(); page.__verificationSecrets.push(...values); return values }
const pwTab = (page, tab) => page.locator(`#pg-tab-${tab}`)
const pwRegenerate = (page, index) => page.locator(`[data-password-regenerate="${index}"]`)
const pwCopy = (page, target) => page.locator(`[data-password-copy="${target}"]`)
const pwRecovery = page => page.locator('[data-password-copy-recovery]')
async function openPassword(args, query = '') { await observePasswordPrivacy(args.context); await args.open('password-generator', query); await poll(async () => await pagePasswordCount(args.page) > 0, 'password results ready') }
async function pagePasswordCount(page) { return page.locator('[data-password-value]').count() }
async function checkPasswordPrivacy(args, extra = []) { const { page, network, logs } = args; const values = [...page.__verificationSecrets, ...extra]; const snapshot = await page.evaluate(() => ({ url: location.href, stores: [JSON.stringify(localStorage), JSON.stringify(sessionStorage)], writes: window.__passwordStorageWrites.map(item => item.value) })); for (const value of values.filter(value => value.length >= 4)) { assert.ok(!snapshot.url.includes(value) && !decodeURIComponent(snapshot.url).includes(value), 'Generated result absent from URL'); assert.ok(!snapshot.stores.some(store => store.includes(value)), 'Generated result absent from storage'); assert.ok(!snapshot.writes.some(write => write.includes(value)), 'Generated result absent from storage writes'); assert.ok(!network.some(message => message.includes(value) || message.includes(encodeURIComponent(value))), 'Generated result absent from network requests'); assert.ok(!logs.some(message => message.includes(value)), 'Generated result absent from console') }; return { observedValuesChecked: values.length, generatedPlaintextPersistedOrTransmitted: false } }

test('password-one-position-three-modes-focus-and-options', async args => {
  const { page } = args; await openPassword(args); const checks = []
  for (const tab of ['random', 'pin', 'passphrase']) {
    await pwTab(page, tab).click(); await poll(async () => await pagePasswordCount(page) === 5, 'five results'); const before = await pwValues(page); const control = pwRegenerate(page, 2); const handle = await control.elementHandle(); await control.focus(); const calls = await page.evaluate(() => window.__passwordRandomCalls); await control.click(); const after = await pwValues(page)
    assert.ok(after.every((value, index) => index === 2 || value === before[index]), 'Only requested result position may change'); assert.ok(await handle.evaluate(node => node.isConnected && node === document.activeElement), 'Stable regenerate DOM and focus'); assert.ok(await page.evaluate(() => window.__passwordRandomCalls) > 0, 'Existing secure RNG buffer was populated'); if (tab === 'random') assert.ok(after.every(value => value.length === 16 && /[A-Z]/.test(value) && /[a-z]/.test(value) && /\d/.test(value) && /[^A-Za-z0-9]/.test(value)), 'Random options preserved'); if (tab === 'pin') assert.ok(after.every(value => /^\d{6}$/.test(value)), 'PIN options preserved'); if (tab === 'passphrase') assert.ok(after.every(value => value.split('-').length >= 6), 'Passphrase options preserved'); checks.push({ mode: tab, count: after.length, unchangedOtherPositions: 4, requestedPosition: 2, sameValueAllowed: true, stableButtonFocus: true })
  }
  return { checks, ...(await checkPasswordPrivacy(args)) }
}, { sensitive: true })

test('password-invalid-settings-locale-check-input-and-url', async args => {
  const { page } = args; await openPassword(args, '?len=24&n=5'); let values = await pwValues(page); assert.ok(values.every(value => value.length === 24), 'Setting URL restored'); const query = new URL(page.url()).search; await changeLanguage(page, 'en'); await pwRegenerate(page, 0).waitFor(); assert.ok((await pwValues(page)).every((value, index) => value === values[index]), 'Locale change did not regenerate'); assert.ok(new URL(page.url()).search === query, 'Locale keeps setting URL')
  await pwTab(page, 'check').click(); const probe = 'Only-A-Test-Strength-Input-24!'; page.__verificationSecrets.push(probe); await page.locator('#pg-check').fill(probe); await changeLanguage(page, 'ko'); assert.ok(await page.locator('#pg-check').inputValue() === probe, 'Locale keeps strength input'); await pwTab(page, 'random').click(); await page.locator('#pg-len-n').fill('32'); await poll(async () => (await pwValues(page)).every(value => value.length === 32), 'length setting regenerated all'); for (const key of ['uppercase', 'lowercase', 'numbers', 'specialChars']) await page.getByRole('checkbox', { name: pg(`settings.${key}`), exact: true }).uncheck(); await page.locator('#pg-panel').getByRole('alert').waitFor(); assert.equal(await pagePasswordCount(page), 0); assert.ok(await button(page, pg('generate')).isDisabled()); const calls = await page.evaluate(() => window.__passwordRandomCalls); await wait(150); assert.equal(await page.evaluate(() => window.__passwordRandomCalls), calls); await page.getByRole('checkbox', { name: pg('settings.lowercase'), exact: true }).check(); await poll(async () => await pagePasswordCount(page) === 5, 'valid setting recovers'); values = await pwValues(page); assert.ok(values.every(value => /^[a-z]{32}$/.test(value)), 'Recovered current alphabet only'); await pwTab(page, 'check').click(); assert.ok(await page.locator('#pg-check').inputValue() === probe, 'Strength draft survives generation tab'); return { restoredLength: 24, changedLength: 32, invalidOptionsGenerateNothing: true, localeAndStrengthInputPreserved: true, ...(await checkPasswordPrivacy(args, [probe])) }
}, { sensitive: true })

test('password-native-copy-failure-selection-retry-and-recovery', async args => {
  const { page } = args; await openPassword(args); const values = await pwValues(page); await pwCopy(page, 1).click(); await poll(async () => await pwCopy(page, 1).getAttribute('data-password-copied') === 'true', 'native individual copied'); assert.ok(await page.evaluate(() => navigator.clipboard.readText()) === values[1], 'Native clipboard matches selected current result'); await pwCopy(page, 'all').click(); await poll(async () => await pwCopy(page, 'all').getAttribute('data-password-copied') === 'true', 'native all copied'); assert.ok(await page.evaluate(() => navigator.clipboard.readText().then(text => text.replace(/\r\n/g, '\n'))) === values.join('\n'), 'Native clipboard matches all current results')
  await passwordClipboard(page, 'reject'); await pwCopy(page, 0).click(); await pwRecovery(page).waitFor(); assert.equal(await pwCopy(page, 0).getAttribute('data-password-copied'), 'false'); const field = pwRecovery(page).locator('textarea'); assert.ok(await field.inputValue() === values[0], 'Failure recovery uses selected snapshot'); await button(pwRecovery(page), pg('copyRecovery.selectText')).click(); assert.deepEqual(await field.evaluate(node => [node.selectionStart, node.selectionEnd]), [0, values[0].length]); await passwordClipboard(page, 'native'); await button(pwRecovery(page), pg('copyRecovery.retry')).click(); await pwRecovery(page).waitFor({ state: 'detached' }); assert.ok(await page.evaluate(() => navigator.clipboard.readText()) === values[0], 'Retry copied current recovery snapshot')
  await passwordClipboard(page, 'absent'); await pwCopy(page, 'all').click(); await pwRecovery(page).waitFor(); assert.ok(await pwRecovery(page).locator('textarea').inputValue() === values.join('\n'), 'No API/false exposes complete snapshot'); await passwordClipboard(page, 'true'); await button(pwRecovery(page), pg('copyRecovery.retry')).click(); await pwRecovery(page).waitFor({ state: 'detached' }); assert.equal(await page.evaluate(() => window.__passwordFallbacks), 1); return { nativeIndividualAndAllMatched: true, falseFallbackNoSuccessCheck: true, manualSelectionLength: values[0].length, nativeRetryAndTrueFallbackSucceeded: true, ...(await checkPasswordPrivacy(args)) }
}, { sensitive: true })

test('password-stale-copy-regenerate-settings-tabs-and-unmount', async args => {
  const { page } = args; await openPassword(args); await pwValues(page); const outcomes = []
  for (const action of ['one', 'all', 'settings', 'tab']) { await passwordClipboard(page, 'pending'); await pwCopy(page, 0).click(); await poll(() => page.evaluate(() => !!window.__passwordCopyReject), 'copy pending'); if (action === 'one') await pwRegenerate(page, 0).click(); if (action === 'all') await button(page, pg('generate')).click(); if (action === 'settings') await page.locator('#pg-len-n').fill('20'); if (action === 'tab') await pwTab(page, 'check').click(); await page.evaluate(() => { window.__passwordCopyReject(new Error('Late denial')); window.__passwordCopyReject = null }); await wait(80); assert.equal(await pwRecovery(page).count(), 0); assert.equal(await page.evaluate(() => window.__passwordFallbacks), 0); assert.equal(await page.locator('[data-password-copied="true"]').count(), 0); if (action === 'tab') await pwTab(page, 'random').click(); await pwValues(page); outcomes.push(action) }
  await passwordClipboard(page, 'pending'); await pwCopy(page, 0).click(); await page.evaluate(() => { window.__olderReject = window.__passwordCopyReject }); await passwordClipboard(page, 'native'); await pwCopy(page, 'all').click(); await poll(async () => await pwCopy(page, 'all').getAttribute('data-password-copied') === 'true', 'newer copy succeeds'); await page.evaluate(() => window.__olderReject(new Error('Older request rejected'))); await wait(80); assert.equal(await pwCopy(page, 'all').getAttribute('data-password-copied'), 'true'); assert.equal(await page.evaluate(() => window.__passwordFallbacks), 0)
  await passwordClipboard(page, 'pending'); await pwCopy(page, 0).click(); await page.keyboard.press('Control+k'); await page.locator('input[aria-controls="search-listbox"]').fill('텍스트 변환'); await page.locator('#search-listbox a[href="/text-converter"]').first().click(); await page.waitForURL(url => url.pathname.replace(/\/$/, '') === '/text-converter'); await page.evaluate(() => window.__passwordCopyResolve()); await wait(100); assert.equal(await pwRecovery(page).count(), 0); assert.equal(await page.evaluate(() => window.__passwordFallbacks), 0); return { invalidatedActions: outcomes, oldRejectCannotOverrideNewSuccess: true, unmountedResolveIgnored: true, ...(await checkPasswordPrivacy(args)) }
}, { sensitive: true })

test('password-320-dark-english-masked-results-and-keyboard', async args => {
  const { page } = args; await openPassword(args, '?len=128&n=5'); await pwValues(page); const control = pwRegenerate(page, 1); await control.focus(); await page.keyboard.press('Enter'); assert.ok(await control.evaluate(node => document.activeElement === node), 'Keyboard regeneration retains focus'); await passwordClipboard(page, 'absent'); await pwCopy(page, 'all').click(); await pwRecovery(page).waitFor(); const field = pwRecovery(page).locator('textarea'); const geometry = await mobile(page, [field, page.locator('#pg-len-n')], [control, pwCopy(page, 1), button(pwRecovery(page), pg('copyRecovery.selectText', 'en')), button(pwRecovery(page), pg('copyRecovery.retry', 'en'))]); await button(pwRecovery(page), pg('copyRecovery.selectText', 'en')).click(); const selected = await field.evaluate(node => node.selectionEnd - node.selectionStart); assert.ok(selected > 128); const masks = [page.locator('[data-password-value]'), field, page.locator('#pg-check')]; await pwRecovery(page).evaluate(node => node.scrollIntoView({ block: 'start', behavior: 'instant' })); await page.evaluate(() => scrollBy(0, -75)); await page.screenshot({ path: resolve(out, 'password-copy-320-dark-english.png'), mask: masks, caret: 'initial' }); await page.evaluate(() => scrollTo({ top: 0, behavior: 'instant' })); await page.screenshot({ path: resolve(out, 'password-results-320-dark-top.png'), mask: masks, caret: 'initial' }); await button(pwRecovery(page), pg('copyRecovery.close', 'en')).click(); await pwRecovery(page).waitFor({ state: 'detached' }); await pwTab(page, 'random').focus(); await page.keyboard.press('End'); assert.equal(await pwTab(page, 'check').getAttribute('aria-selected'), 'true'); return { geometry, generatedLength: 128, selectedSummaryLength: selected, resultScreenshotsMasked: true, keyboardTabAndRegenerateFocus: true, ...(await checkPasswordPrivacy(args)) }
}, { sensitive: true, width: 320, dark: true, language: 'en' })

const pdfTab = (page, tab) => page.locator(`#pdf-tab-${tab}`)
const pdfPages = page => page.locator('[data-pdf-page]')
const pdfPage = (page, source) => page.locator(`[data-pdf-page="${source}"]`)
const pdfAction = (page, source, action, language = 'ko') => button(pdfPage(page, source), pt(`a11y.${action}`, language, { n: source }))
async function pageCards(page) { return pdfPages(page).evaluateAll(nodes => nodes.map(node => ({ page: Number(node.dataset.pdfPage), rotation: Number(node.dataset.pdfRotation), key: node.querySelector('[id^="pdf-pg-del-"]')?.id }))) }
async function openPdf(args, file) { await observePdfAsync(args.context); await args.open('pdf-tools'); await pdfTab(args.page, 'organize').click(); await args.page.locator('#pdf-org-file').setInputFiles(file ?? await pdfFixture()); await poll(async () => await pdfPages(args.page).count() > 0, 'PDF pages ready') }
async function expectHistory(page, undo, redo, language = 'ko') { await page.locator('[data-pdf-history]').getByText(pt('history.count', language, { undo, redo, max: 30 }), { exact: true }).waitFor() }
async function editPdfExample(page) { await pdfAction(page, 3, 'pageMoveBack').click(); await pdfAction(page, 3, 'pageMoveBack').click(); await button(page, pt('organize.rotateAllRight')).click(); await pdfAction(page, 1, 'pageRotateRight').click(); await pdfAction(page, 2, 'pageDelete').click() }

test('pdf-real-output-order-content-rotation-undo-redo', async args => {
  const { page } = args; await openPdf(args); const initial = await pageCards(page); await editPdfExample(page); const edited = await pageCards(page); assert.deepEqual(edited.map(item => [item.page, item.rotation]), [[3, 90], [1, 180]]); await page.locator('#pdf-org-undo').click(); assert.equal(await pdfPages(page).count(), 3); await page.locator('#pdf-org-redo').click(); assert.deepEqual(await pageCards(page), edited); const output = await download(page, () => button(page, pt('organize.button')).click(), 'organized-output.pdf'); const parsed = await inspectPdf(output.bytes); assert.deepEqual(parsed.map(item => [item.marker, item.rotation, item.size.width, item.size.height]), [['VERIFY-PAGE-3', 0, 240, 320], ['VERIFY-PAGE-1', 270, 200, 300]]); assert.ok(edited.every(item => initial.some(original => original.key === item.key)), 'Stable card keys'); await pdfAction(page, 1, 'pageRotateRight').click(); assert.equal(await page.locator('#pdf-panel a[download]').count(), 0); return { sourcePages: 3, clickedCards: edited.map(({ page, rotation }) => ({ page, rotation })), outputPages: parsed, file: { name: output.filename, bytes: output.bytes.length }, editAfterExportInvalidatedOldResult: true }
})

test('pdf-thirty-history-keyboard-focus-reset-and-empty', async args => {
  const { page } = args; await openPdf(args); await expectHistory(page, 0, 0); assert.ok(await page.locator('#pdf-org-reset').isDisabled()); assert.ok(await pdfAction(page, 1, 'pageMoveBack').isDisabled()); for (let i = 0; i < 35; i++) await pdfAction(page, 1, 'pageRotateRight').click(); await expectHistory(page, 30, 0); for (let i = 0; i < 30; i++) await page.locator('#pdf-org-undo').click(); await expectHistory(page, 0, 30); assert.equal(await pdfPage(page, 1).getAttribute('data-pdf-rotation'), '90'); await poll(() => page.evaluate(() => !!document.activeElement?.closest('[data-pdf-page]')), 'Undo focuses live card on next frame')
  await page.keyboard.press('Control+Shift+z'); await expectHistory(page, 1, 29); await page.keyboard.press('Control+y'); await expectHistory(page, 2, 28); await pdfAction(page, 1, 'pageRotateRight').click(); await expectHistory(page, 3, 0); await pdfAction(page, 1, 'pageRotateRight').click(); const beforeReset = await pageCards(page); await page.locator('#pdf-org-reset').click(); assert.ok((await pageCards(page)).every(item => item.rotation === 0)); await page.locator('#pdf-org-undo').click(); assert.deepEqual(await pageCards(page), beforeReset)
  const beforeIme = await pageCards(page); const prevented = await page.locator('#pdf-panel').evaluate(node => !node.dispatchEvent(new KeyboardEvent('keydown', { key: 'z', ctrlKey: true, isComposing: true, bubbles: true, cancelable: true }))); assert.equal(prevented, false); assert.deepEqual(await pageCards(page), beforeIme)
  await pdfTab(page, 'split').click(); const input = page.locator('#pdf-range'); await page.locator('#pdf-panel input[type=\"file\"]').first().setInputFiles(await pdfFixture()); await input.fill('1,2'); const intercepted = await input.evaluate(node => !node.dispatchEvent(new KeyboardEvent('keydown', { key: 'z', ctrlKey: true, bubbles: true, cancelable: true }))); assert.equal(intercepted, false); await pdfTab(page, 'organize').click(); assert.deepEqual(await pageCards(page), beforeIme)
  for (const source of [1, 2, 3]) await pdfAction(page, source, 'pageDelete').click(); assert.equal(await pdfPages(page).count(), 0); await poll(() => page.evaluate(() => document.activeElement?.id === 'pdf-org-undo'), 'empty document focuses undo on next frame'); assert.ok(await button(page, pt('organize.button')).isDisabled()); await page.keyboard.press('Control+z'); assert.equal(await pdfPages(page).count(), 1); await poll(() => page.evaluate(() => !!document.activeElement?.closest('[data-pdf-page]')), 'live card focus after frame'); return { historyCap: 30, retainedAfter30Undo: '5 earliest edits', redoNewBranchDiscarded: true, resetUndoRestores: true, emptyDeleteFocus: 'pdf-org-undo', editableAndImeShortcutsNotIntercepted: true }
})

test('pdf-new-file-failure-reverse-read-tabs-and-unmount', async args => {
  const { page } = args; await openPdf(args); await pdfAction(page, 1, 'pageRotateRight').click(); const current = await pageCards(page); await page.locator('#pdf-org-file').setInputFiles({ name: 'broken.pdf', mimeType: 'application/pdf', buffer: Buffer.from('not a PDF') }); await page.locator('[role="alert"]').filter({ hasText: 'broken.pdf' }).waitFor(); assert.deepEqual(await pageCards(page), current); await expectHistory(page, 1, 0)
  await page.evaluate(() => { window.__pdfReadModes['late-a.pdf'] = 'hold' }); await page.locator('#pdf-org-file').setInputFiles(await pdfFixture('late-a.pdf', 4)); await poll(() => page.evaluate(() => window.__pdfReads.length === 1), 'first new file read pending'); await page.locator('#pdf-org-file').setInputFiles(await pdfFixture('new-b.pdf', 2)); await poll(async () => await pdfPages(page).count() === 2, 'newer file installed'); const second = await pageCards(page); await page.evaluate(() => window.__releasePdfReads()); await wait(150); assert.deepEqual(await pageCards(page), second); await expectHistory(page, 0, 0)
  await page.evaluate(() => { window.__pdfReadModes['late-tab.pdf'] = 'hold' }); await page.locator('#pdf-org-file').setInputFiles(await pdfFixture('late-tab.pdf', 4)); await poll(() => page.evaluate(() => window.__pdfReads.length === 1), 'tab read pending'); await pdfTab(page, 'merge').click(); await page.evaluate(() => window.__releasePdfReads()); await wait(150); await pdfTab(page, 'organize').click(); assert.deepEqual(await pageCards(page), second)
  await page.evaluate(() => { window.__pdfReadModes['late-unmount.pdf'] = 'hold' }); await page.locator('#pdf-org-file').setInputFiles(await pdfFixture('late-unmount.pdf', 4)); await poll(() => page.evaluate(() => window.__pdfReads.length === 1), 'unmount read pending'); await page.keyboard.press('Control+k'); await page.locator('input[aria-controls="search-listbox"]').fill('텍스트 변환'); await page.locator('#search-listbox a[href="/text-converter"]').first().click(); await page.waitForURL(url => url.pathname.replace(/\/$/, '') === '/text-converter'); await page.evaluate(() => window.__releasePdfReads()); await wait(150); assert.equal(await pdfPages(page).count(), 0); return { failedReadKeptHistory: true, reverseReadWinnerPages: 2, tabAndUnmountLateReadsIgnored: true }
})

test('pdf-pending-export-edit-tab-and-new-work-invalidates-download', async args => {
  const { page } = args; await openPdf(args, await pdfFixture('many-pages.pdf', 60)); let downloads = 0; page.on('download', () => downloads++); await page.evaluate(() => { window.__holdPdfWriter = true }); await button(page, pt('organize.button')).click(); await poll(() => page.evaluate(() => window.__pdfWriterTicks.length > 0), 'actual PDF writer asynchronous save held'); const heldWriter = await page.evaluate(() => window.__pdfWriterTicks.map(item => item.stack.split('\n').slice(0, 6).join('\n'))); await pdfTab(page, 'merge').click(); await page.evaluate(() => window.__releasePdfWriter()); await wait(300); assert.equal(downloads, 0); assert.equal(await page.locator('#pdf-panel a[download]').count(), 0); await pdfTab(page, 'organize').click(); assert.equal(await pdfPages(page).count(), 60)
  await page.evaluate(() => { window.__pdfReadModes['many-pages.pdf'] = 'hold' }); await button(page, pt('organize.button')).click(); await poll(() => page.evaluate(() => window.__pdfReads.length === 1), 'export source read held'); await pdfAction(page, 1, 'pageRotateRight').click(); await page.evaluate(() => window.__releasePdfReads()); await wait(250); assert.equal(downloads, 0); const output = await download(page, () => button(page, pt('organize.button')).click(), 'latest-sixty-pages.pdf'); const pages = await inspectPdf(output.bytes); assert.equal(pages.length, 60); assert.equal(pages[0].rotation, 180); assert.equal(downloads, 1); return { actualWriterHoldStacks: heldWriter, oldDownloadsAfterTabAndEdit: 0, latestExplicitDownload: 1, outputPageCount: pages.length, latestFirstRotation: pages[0].rotation }
})

test('pdf-common-merge-split-image-output-regression', async args => {
  const { page, open } = args; await observePdfAsync(args.context); await open('pdf-tools'); await page.locator('#pdf-panel input[type="file"]').first().setInputFiles([await pdfFixture('merge-a.pdf', 2), await pdfFixture('merge-b.pdf', 3)]); const merged = await download(page, () => button(page, pt('merge.button')).click(), 'merged.pdf'); const mergedPages = await inspectPdf(merged.bytes); assert.deepEqual(mergedPages.map(item => item.marker), ['VERIFY-PAGE-1', 'VERIFY-PAGE-2', 'VERIFY-PAGE-1', 'VERIFY-PAGE-2', 'VERIFY-PAGE-3'])
  await pdfTab(page, 'split').click(); await page.locator('#pdf-panel input[type="file"]').first().setInputFiles(await pdfFixture()); await page.locator('#pdf-range').fill('3,1'); await page.getByRole('checkbox', { name: pt('split.separate'), exact: true }).check(); const split = await download(page, () => button(page, pt('split.button')).click(), 'split.zip'); const archive = await JSZip.loadAsync(split.bytes); const entries = []; for (const file of Object.values(archive.files).filter(item => !item.dir)) entries.push({ name: file.name, pages: await inspectPdf(await file.async('nodebuffer')) }); assert.deepEqual(entries.map(item => item.pages[0].marker), ['VERIFY-PAGE-3', 'VERIFY-PAGE-1'])
  await pdfTab(page, 'imageToPdf').click(); const png = new PNG({ width: 40, height: 20 }); for (let n = 0; n < png.data.length; n += 4) { png.data[n] = 220; png.data[n + 1] = 30; png.data[n + 2] = 40; png.data[n + 3] = 255 }; await page.locator('#pdf-panel input[type="file"]').first().setInputFiles({ name: 'fixture.png', mimeType: 'image/png', buffer: PNG.sync.write(png) }); const imagePdf = await download(page, () => button(page, pt('imageToPdf.button')).click(), 'image.pdf'); const imagePages = await inspectPdf(imagePdf.bytes); assert.equal(imagePages.length, 1); assert.equal(imagePages[0].hasXObject, true); await pdfTab(page, 'merge').click(); assert.ok((await page.locator('#pdf-panel').innerText()).includes('merge-a.pdf'), 'Other tab input retained'); return { mergedPages, splitEntries: entries, imagePages, otherTabInputRetained: true }
})

test('pdf-history-320-dark-english-keyboard-and-focus', async args => {
  const { page } = args; await openPdf(args); await pdfAction(page, 1, 'pageRotateRight', 'en').click(); await page.locator('#pdf-org-undo').click(); await page.locator('#pdf-org-redo').click(); await pdfAction(page, 1, 'pageDelete', 'en').click(); assert.ok(await page.evaluate(() => !!document.activeElement?.closest('[data-pdf-page]')), 'Delete focuses a remaining card'); const geometry = await mobile(page, [], [page.locator('#pdf-org-undo'), page.locator('#pdf-org-redo'), pdfAction(page, 2, 'pageRotateRight', 'en'), pdfAction(page, 2, 'pageDelete', 'en')]); await page.locator('[data-pdf-history]').evaluate(node => node.scrollIntoView({ block: 'start', behavior: 'instant' })); await page.evaluate(() => scrollBy(0, -75)); await page.screenshot({ path: resolve(out, 'pdf-history-320-dark-english.png'), caret: 'initial' }); await pdfPages(page).first().evaluate(node => node.scrollIntoView({ block: 'start', behavior: 'instant' })); await page.evaluate(() => scrollBy(0, -75)); await page.screenshot({ path: resolve(out, 'pdf-cards-320-dark-english.png'), caret: 'initial' }); await pdfTab(page, 'organize').focus(); await page.keyboard.press('Home'); assert.equal(await pdfTab(page, 'merge').getAttribute('aria-selected'), 'true'); await pdfTab(page, 'organize').click(); assert.equal(await pdfPages(page).count(), 2); return { geometry, keyboardTabNavigation: true, liveCardFocusAfterHistoryAndDelete: true, tabInputsKept: true }
}, { width: 320, dark: true, language: 'en' })

if (only === '--list') console.log(cases.map(item => item.name).join('\n') || 'Product readiness pending; scenarios in browser-scenarios.md')
else {
  const selected = cases.filter(item => !only || only.split(',').some(part => item.name.includes(part)))
  assert.ok(selected.length, 'No selected verification cases')
  mkdirSync(out, { recursive: true }); const browser = await chromium.launch({ channel: 'chrome' })
  try { for (const scenario of selected) await run(browser, scenario) }
  finally { await browser.close(); const merged = readdirSync(out).filter(name => name.endsWith('-evidence.json')).map(name => JSON.parse(readFileSync(resolve(out, name), 'utf8'))); const final = { checkedAt: new Date().toISOString(), passed: merged.filter(item => item.status === 'pass').length, failed: merged.filter(item => item.status === 'fail').length, results: merged }; writeFileSync(resolve(out, 'final-results.json'), JSON.stringify(final, null, 2)); console.log(JSON.stringify({ passed: final.passed, failed: final.failed, browserClosed: true })) }
  if (results.some(item => item.status !== 'pass')) process.exitCode = 1
}



