import { chromium } from 'playwright'
import assert from 'node:assert/strict'
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

// Independent real-browser checks. --list never starts Chrome; case-name filters
// preserve previous evidence so only changed boundaries need to be rerun.
const base = process.env.VERIFY_BASE_URL || 'http://127.0.0.1:3039'
const out = resolve('docs/verify/2026-11-17-repeat-batch21/browser')
const only = process.argv[2]
const messages = Object.fromEntries(['ko', 'en'].map(language => [language, JSON.parse(readFileSync(`messages/${language}.json`, 'utf8'))]))
const tr = (ns, key, language = 'ko', values = {}) => {
  const value = key.split('.').reduce((object, key) => object?.[key], messages[language][ns])
  assert.equal(typeof value, 'string', `Missing ${language}:${ns}.${key}`)
  return value.replace(/\{(\w+)\}/g, (match, key) => values[key] ?? match)
}
const tc = (key, language = 'ko', values = {}) => tr('textConverter', key, language, values)
const qr = (key, language = 'ko', values = {}) => tr('qrScanner', key, language, values)
const button = (scope, name) => scope.getByRole('button', { name, exact: true })
const wait = ms => new Promise(resolve => setTimeout(resolve, ms))
async function poll(predicate, description, attempts = 180) { for (let n = 0; n < attempts; n++) { if (await predicate()) return; await wait(100) }; assert.fail(`Timed out: ${description}`) }
const cases = [], results = []
const test = (name, fn, options = {}) => cases.push({ name, fn, options })
const planned = ['text-order-and-stage-history', 'text-options-duplicate-steps-and-shuffle-seed', 'text-thirty-history-noop-and-new-branch', 'text-shared-external-url-baseline-and-private-drafts', 'text-regex-errors-and-input-limit', 'text-keyboard-focus-and-320-dark-english', 'qr-native-unavailable-real-worker-pixels', 'qr-multiple-codes-and-mixed-file-results', 'qr-selection-byte-and-pixel-limits', 'qr-native-success-and-worker-fallback', 'qr-cancel-new-selection-retry-and-timeout', 'qr-exact-txt-and-copy-recovery', 'qr-single-history-camera-and-320-dark-english']

async function run(browser, { name, fn, options }) {
  if (only && !only.split(',').some(part => name.includes(part))) return
  const context = await browser.newContext({ viewport: { width: options.width ?? 1280, height: 900 }, timezoneId: 'Asia/Seoul', serviceWorkers: 'block', permissions: ['clipboard-read', 'clipboard-write'], acceptDownloads: true })
  const errors = [], hydration = [], external = [], consoleErrors = []
  await context.addInitScript(options => {
    if (!/^https?:$/.test(location.protocol)) return
    if (!localStorage.getItem('__batch21Seeded')) { localStorage.setItem('language', options.language ?? 'ko'); localStorage.setItem('theme', options.dark ? 'dark' : 'light'); localStorage.setItem('__batch21Seeded', '1') }
    window.__unhandled = []; addEventListener('unhandledrejection', event => window.__unhandled.push(String(event.reason)))
    if (options.observeQr) {
      window.__qrWorkers = []; window.__qrWorkerRefs = []; window.__qrReplies = []; window.__qrPostQueue = []; window.__holdQrPosts = false
      const NativeWorker = window.Worker; window.__nativeWorker = NativeWorker
      if (NativeWorker) {
        window.Worker = class extends NativeWorker {
          constructor(url, settings) { super(url, settings); this.__entry = { url: String(url), terminated: false, posts: [] }; window.__qrWorkers.push(this.__entry); window.__qrWorkerRefs.push(this); this.addEventListener('message', event => window.__qrReplies.push(event.data)) }
          postMessage(message, ...transfer) {
            const item = { requestId: message.requestId, width: message.width, height: message.height, beforeBytes: message.pixels?.byteLength }; this.__entry.posts.push(item)
            const send = () => { if (this.__entry.terminated) return; super.postMessage(message, ...transfer); item.afterBytes = message.pixels?.byteLength }
            if (window.__holdQrPosts || (Number.isInteger(window.__holdQrAfter) && window.__qrWorkers.length > window.__holdQrAfter)) window.__qrPostQueue.push(send); else send()
          }
          terminate() { this.__entry.terminated = true; return super.terminate() }
        }
      }
      window.__observedWorker = window.Worker
      window.__releaseQrPosts = () => { window.__holdQrPosts = false; for (const send of window.__qrPostQueue.splice(0)) send() }
      const create = URL.createObjectURL.bind(URL), revoke = URL.revokeObjectURL.bind(URL); window.__objectUrls = []
      URL.createObjectURL = value => { const url = create(value); window.__objectUrls.push({ url, type: value.type, size: value.size, revoked: false }); return url }
      URL.revokeObjectURL = url => { const entry = window.__objectUrls.find(item => item.url === url); if (entry) entry.revoked = true; return revoke(url) }
      if (options.nativeQr === 'absent') { try { delete window.BarcodeDetector } catch { Object.defineProperty(window, 'BarcodeDetector', { configurable: true, value: undefined }) } }
    }
  }, options)
  await context.route('**/*', route => { const url = new URL(route.request().url()); if (url.origin === base || ['blob:', 'data:'].includes(url.protocol)) return route.continue(); external.push(url.href); return route.abort('blockedbyclient') })
  context.on('page', page => {
    page.setDefaultTimeout(16000); page.setDefaultNavigationTimeout(120000)
    page.on('pageerror', error => errors.push(error.stack ?? String(error)))
    page.on('console', message => { if (message.type() === 'error') { consoleErrors.push(message.text()); if (/hydration|hydrating|did not match|Minified React error/i.test(message.text())) hydration.push(message.text()) } })
    page.on('dialog', dialog => dialog.accept())
  })
  const page = await context.newPage()
  const open = async (slug, query = '', target = page) => {
    await target.goto(`${base}/${slug}/${query}`, { waitUntil: 'domcontentloaded' }); await target.locator('main h1').first().waitFor()
    await target.waitForFunction(() => [...document.querySelectorAll('[data-language-toggle] button')].some(element => Object.keys(element).some(key => key.startsWith('__reactProps$')))); await wait(200)
  }
  let status = 'pass', detail = {}, error
  const watchdog = setTimeout(() => { void context.close().catch(() => {}) }, 90000)
  try { detail = await fn({ page, context, open }) ?? {}; assert.deepEqual(errors, [], 'JS page errors'); assert.deepEqual(hydration, [], 'Hydration errors'); for (const active of context.pages()) assert.deepEqual(await active.evaluate(() => window.__unhandled), [], 'Unhandled rejections'); assert.doesNotMatch(await page.locator('body').innerText(), /\b(?:textConverter|qrScanner)\.[a-zA-Z][\w.]+/, 'Raw translation key') }
  catch (cause) { status = 'fail'; error = cause.stack ?? String(cause); await page.screenshot({ path: resolve(out, `${name}-failure.png`), caret: 'initial' }).catch(() => {}); writeFileSync(resolve(out, `${name}-failure.txt`), `${error}\n\n${await page.locator('body').innerText().catch(() => '')}`) }
  const observed = options.observeQr ? await page.evaluate(() => ({ workers: window.__qrWorkers, replies: window.__qrReplies, objectUrls: window.__objectUrls })).catch(() => ({})) : {}
  const result = { name, status, checkedAt: new Date().toISOString(), ...detail, error, errors, hydration, ...observed, consoleErrors, external: [...new Set(external)] }
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

// Product-specific scenarios are registered after readiness.
const historyPanel = page => page.locator('[data-text-pipeline-history]')
const steps = page => page.locator('[data-text-step-index]')
const step = (page, index) => page.locator(`[data-text-step-index="${index}"]`)
const historyButton = (page, action) => historyPanel(page).locator(`[data-history-action="${action}"]`)
const stepButton = (page, index, action) => step(page, index).locator(`[data-step-action="${action}"]`)
const sourceField = page => page.locator('#tc-input')
const outputField = (page, language = 'ko') => page.getByRole('textbox', { name: tc('output.label', language), exact: true })
const findField = (page, language = 'ko') => page.getByRole('textbox', { name: tc('replace.find', language), exact: true })
const replaceField = (page, language = 'ko') => page.getByRole('textbox', { name: tc('replace.repl', language), exact: true })
const prefixField = (page, language = 'ko') => page.getByRole('textbox', { name: tc('affix.prefix', language), exact: true })
const suffixField = (page, language = 'ko') => page.getByRole('textbox', { name: tc('affix.suffix', language), exact: true })
const opLabel = (op, language = 'ko') => tc(['upper', 'lower', 'title', 'sentence', 'camel', 'pascal', 'snake', 'screaming', 'kebab', 'train', 'dot', 'path'].includes(op) ? `cases.${op}` : `ops.${op}`, language)
async function addOp(page, op, language = 'ko') { await button(page, opLabel(op, language)).click() }
async function expectOutput(page, value, language = 'ko') { await poll(async () => await outputField(page, language).inputValue() === value, 'text output matches independent expectation') }
async function expectHistory(page, undo, redo, language = 'ko') { await historyPanel(page).getByText(tc('history.available', language, { undo, redo }), { exact: true }).waitFor() }
async function openText(args, query = '') { await args.open('text-converter', query); await historyPanel(args.page).waitFor() }
async function addReplace(page, find, replacement, { regex = false, ignoreCase = false, language = 'ko' } = {}) {
  await findField(page, language).fill(find); await replaceField(page, language).fill(replacement); await page.getByRole('checkbox', { name: tc('replace.regex', language), exact: true }).setChecked(regex); await page.getByRole('checkbox', { name: tc('replace.ignoreCase', language), exact: true }).setChecked(ignoreCase)
  await button(findField(page, language).locator('..').locator('..'), tc('addStep', language)).click()
}
async function addAffix(page, prefix, suffix, language = 'ko') { await prefixField(page, language).fill(prefix); await suffixField(page, language).fill(suffix); await button(prefixField(page, language).locator('..').locator('..'), tc('addStep', language)).click() }
async function paste(page, field, value) { await field.click(); await page.keyboard.press('Control+a'); await page.evaluate(value => navigator.clipboard.writeText(value), value); await page.keyboard.press('Control+v'); await poll(async () => await field.inputValue() === value, 'native clipboard paste') }

test('text-order-and-stage-history', async args => {
  const { page } = args; await openText(args); const input = ' a\n a \na'; await sourceField(page).fill(input); await findField(page).fill('작성 중 검색'); await replaceField(page).fill('작성 중 치환'); await addOp(page, 'trimLines'); await addOp(page, 'dedupe'); await expectOutput(page, 'a'); await expectHistory(page, 2, 0)
  await stepButton(page, 1, 'up').click(); await expectOutput(page, 'a\na\na'); assert.equal(await page.evaluate(() => document.activeElement?.getAttribute('data-text-step-index')), '0'); await expectHistory(page, 3, 0)
  await historyButton(page, 'undo').click(); await expectOutput(page, 'a'); await historyButton(page, 'redo').click(); await expectOutput(page, 'a\na\na'); await stepButton(page, 0, 'remove').click(); assert.equal(await steps(page).count(), 1); await historyButton(page, 'reset').click(); await expectOutput(page, input); assert.equal(await steps(page).count(), 0); await historyButton(page, 'undo').click(); assert.equal(await steps(page).count(), 1); await expectOutput(page, 'a\na\na'); await historyButton(page, 'redo').click(); assert.equal(await steps(page).count(), 0)
  assert.equal(await sourceField(page).inputValue(), input); assert.equal(await findField(page).inputValue(), '작성 중 검색'); assert.equal(await replaceField(page).inputValue(), '작성 중 치환'); return { orderChangedResult: true, moveDeleteResetUndoRedo: true, sourceAndDraftPreserved: true }
})
test('text-options-duplicate-steps-and-shuffle-seed', async args => {
  const { page } = args; await openText(args); await sourceField(page).fill('Aa\nBB\nAA'); await addReplace(page, '^a', 'x', { regex: true, ignoreCase: true }); await expectOutput(page, 'xa\nBB\nxA'); await addAffix(page, '<', '>'); await addAffix(page, '[', ']'); await expectOutput(page, '[<xa>]\n[<BB>]\n[<xA>]')
  await stepButton(page, 2, 'up').click(); await expectOutput(page, '<[xa]>\n<[BB]>\n<[xA]>'); await historyButton(page, 'undo').click(); await expectOutput(page, '[<xa>]\n[<BB>]\n[<xA>]'); await historyButton(page, 'redo').click(); await expectOutput(page, '<[xa]>\n<[BB]>\n<[xA]>'); await historyButton(page, 'undo').click()
  await findField(page).fill('새로 작성한 검색'); await replaceField(page).fill('새로 작성한 치환'); await prefixField(page).fill('새 접두사'); await suffixField(page).fill('새 접미사'); await addOp(page, 'shuffle'); const shuffled = await outputField(page).inputValue(); await historyButton(page, 'undo').click(); await historyButton(page, 'redo').click(); await expectOutput(page, shuffled); await wait(100); await expectOutput(page, shuffled)
  assert.equal(await findField(page).inputValue(), '새로 작성한 검색'); assert.equal(await replaceField(page).inputValue(), '새로 작성한 치환'); assert.equal(await prefixField(page).inputValue(), '새 접두사'); assert.equal(await suffixField(page).inputValue(), '새 접미사'); const url = new URL(page.url()); assert.equal(url.searchParams.get('ops'), 'shuffle'); assert.doesNotMatch(decodeURIComponent(url.href), /새로|접두사|접미사|\^a/); await expectHistory(page, 4, 0)
  return { duplicateAffixOrder: true, regexFlagsPreserved: true, shuffleResultStableAcrossUndoRedo: shuffled, privateStepStringsExcludedFromUrl: true }
})
test('text-thirty-history-noop-and-new-branch', async args => {
  const { page } = args; await openText(args); await sourceField(page).fill('ABC'); for (let index = 0; index < 35; index++) await addOp(page, index % 2 ? 'lower' : 'upper'); assert.equal(await steps(page).count(), 35); await expectHistory(page, 30, 0)
  for (let index = 0; index < 30; index++) await historyButton(page, 'undo').click(); assert.equal(await steps(page).count(), 5); assert.ok(await historyButton(page, 'undo').isDisabled()); await expectHistory(page, 0, 30)
  for (let index = 0; index < 30; index++) await historyButton(page, 'redo').click(); assert.equal(await steps(page).count(), 35); await expectHistory(page, 30, 0); await historyButton(page, 'undo').click(); await expectHistory(page, 29, 1); await step(page, 0).focus(); await page.keyboard.press('Alt+ArrowUp'); await expectHistory(page, 29, 1); assert.ok(await stepButton(page, 0, 'up').isDisabled()); await addOp(page, 'trimLines'); await expectHistory(page, 30, 0); assert.ok(await historyButton(page, 'redo').isDisabled()); assert.equal(await steps(page).count(), 35)
  return { edits: 35, undoLimit: 30, oldestRetainedBaselineSteps: 5, noOpPreservesRedo: true, newBranchClearsRedo: true }
})
test('text-shared-external-url-baseline-and-private-drafts', async args => {
  const { page, context, open } = args; await openText(args, '?ops=upper,trimLines,invalid,list-json&keep=one#preserve'); await poll(async () => await steps(page).count() === 3, 'initial safe ops restored'); await expectHistory(page, 0, 0); await sourceField(page).fill('private_source_A\nprivate_source_B'); await addReplace(page, 'private_find', 'private_replacement'); await addAffix(page, 'private_prefix', 'private_suffix'); await expectHistory(page, 2, 0); await addOp(page, 'reverseLines'); await wait(100); await expectHistory(page, 3, 0); const shared = new URL(page.url()); assert.equal(shared.searchParams.get('keep'), 'one'); assert.equal(shared.hash, '#preserve'); assert.equal(shared.searchParams.get('ops'), 'upper,trimLines,list-json,reverseLines'); assert.doesNotMatch(decodeURIComponent(shared.href), /private_/)
  const second = await context.newPage(); await open('text-converter', shared.search, second); await poll(async () => await steps(second).count() === 4, 'safe shared steps only'); await expectHistory(second, 0, 0); assert.equal((await sourceField(second).inputValue()).includes('private_source'), false); await second.close()
  await addOp(page, 'shuffle'); const beforeAnchor = { text: await outputField(page).inputValue(), count: await steps(page).count() }; await expectHistory(page, 4, 0); await page.evaluate(() => { const anchor = document.createElement('a'); anchor.href = '#verification-anchor'; document.body.append(anchor); anchor.click(); anchor.remove() }); await page.goBack(); await expectHistory(page, 4, 0); assert.equal(await steps(page).count(), beforeAnchor.count); assert.equal(await outputField(page).inputValue(), beforeAnchor.text); await page.goForward(); await expectHistory(page, 4, 0); assert.equal(await outputField(page).inputValue(), beforeAnchor.text); const draft = await sourceField(page).inputValue(); await page.evaluate(() => history.pushState({ ...history.state, verification: 'retained' }, '', '?ops=lower&keep=two#external')); await poll(async () => await steps(page).count() === 1, 'external query replaced baseline'); await expectHistory(page, 0, 0); assert.equal(await sourceField(page).inputValue(), draft); assert.equal(await findField(page).inputValue(), 'private_find'); await addOp(page, 'trimLines'); await expectHistory(page, 1, 0); assert.equal(await page.evaluate(() => history.state.verification), 'retained'); assert.equal(new URL(page.url()).hash, '#external')
  await page.evaluate(() => dispatchEvent(new PopStateEvent('popstate', { state: history.state }))); await expectHistory(page, 1, 0); assert.equal(await steps(page).count(), 2); assert.equal(await sourceField(page).inputValue(), draft); return { initialUrlSafeOps: 3, sharedSafeOps: 4, privateDraftsNeverInUrl: true, ownSyncPreservesHistory: true, externalRestoreClearsHistory: true, sameQueryAndNativeAnchorBackForwardPreserveHistory: true, historyStateAndHashPreserved: true }
})
test('text-regex-errors-and-input-limit', async args => {
  const { page } = args; await openText(args); await sourceField(page).fill('abc'); await addReplace(page, '[', 'bad', { regex: true }); await step(page, 0).getByText(tc('errors.badRegex'), { exact: true }).waitFor(); await addOp(page, 'upper'); await expectOutput(page, 'ABC'); await historyButton(page, 'undo').click(); await expectOutput(page, 'abc'); await historyButton(page, 'redo').click(); await expectOutput(page, 'ABC'); await historyButton(page, 'reset').click(); await addReplace(page, '^a', 'x', { regex: true }); const large = 'a'.repeat(100001); await paste(page, sourceField(page), large); await step(page, 0).getByText(tc('errors.tooLong', 'ko', { max: '100,000' }), { exact: true }).waitFor(); assert.equal((await outputField(page).inputValue()).length, 100001); await historyButton(page, 'undo').click(); assert.equal(await steps(page).count(), 0); await expectOutput(page, large); await historyButton(page, 'redo').click(); await step(page, 0).getByText(tc('errors.tooLong', 'ko', { max: '100,000' }), { exact: true }).waitFor(); return { invalidRegexSkippedOnlyOwnStep: true, regexMax: 100000, actualInputCharacters: large.length, editingAndHistoryRemainAvailable: true }
})
test('text-keyboard-focus-and-320-dark-english', async args => {
  const { page } = args; await openText(args); await sourceField(page).fill(' a\n a \na'); await addOp(page, 'trimLines', 'en'); await addOp(page, 'dedupe', 'en'); await step(page, 1).focus(); await page.keyboard.press('Alt+ArrowUp'); await expectOutput(page, 'a\na\na', 'en'); assert.equal(await page.evaluate(() => document.activeElement?.getAttribute('data-text-step-index')), '0'); await page.keyboard.press('Control+z'); await expectOutput(page, 'a', 'en'); await page.keyboard.press('Control+Shift+z'); await expectOutput(page, 'a\na\na', 'en'); await page.keyboard.press('Control+z'); await page.keyboard.press('Control+y'); await expectOutput(page, 'a\na\na', 'en')
  const before = await steps(page).allTextContents(); await sourceField(page).focus(); await sourceField(page).dispatchEvent('keydown', { key: 'z', ctrlKey: true }); assert.deepEqual(await steps(page).allTextContents(), before); await step(page, 0).focus(); await step(page, 0).dispatchEvent('keydown', { key: 'ArrowDown', altKey: true, isComposing: true }); assert.deepEqual(await steps(page).allTextContents(), before)
  await stepButton(page, 0, 'remove').click(); assert.equal(await page.evaluate(() => document.activeElement?.getAttribute('data-text-step-index')), '0'); await historyButton(page, 'reset').click(); assert.equal(await page.evaluate(() => document.activeElement?.getAttribute('data-history-action')), 'undo'); await historyButton(page, 'undo').click(); await addAffix(page, '<long-prefix>', '<long-suffix>', 'en')
  const geometry = await mobile(page, [sourceField(page), findField(page, 'en'), replaceField(page, 'en'), prefixField(page, 'en'), suffixField(page, 'en')], [historyButton(page, 'undo'), historyButton(page, 'redo'), historyButton(page, 'reset'), stepButton(page, 0, 'up'), stepButton(page, 0, 'down'), stepButton(page, 0, 'remove')]); await screenshot(page, 'text-history-english-320-dark', historyPanel(page)); return { geometry, keyboardMoveAndUndoRedo: true, editableAndImeExcluded: true, focusAfterMoveRemoveReset: true }
}, { width: 320, dark: true, language: 'en' })

const fixtureDir = resolve(out, 'fixtures')
const payloads = JSON.parse(readFileSync(resolve(fixtureDir, 'payloads.json'), 'utf8'))
const qrPanel = page => page.locator('[data-qr-batch]')
const qrRows = page => qrPanel(page).locator('[data-qr-batch-row]')
const qrRow = (page, index) => qrRows(page).nth(index)
const qrInput = page => page.locator('[data-qr-batch-input]')
const qrButton = (page, key, language = 'ko', values = {}) => button(qrPanel(page), qr(`batch.${key}`, language, values))
const qrFile = (fixture, name = `${fixture}.png`, mimeType = 'image/png') => ({ name, mimeType, buffer: readFileSync(resolve(fixtureDir, `${fixture}.png`)) })
async function openQr(args, language = 'ko') { await args.open('qr-scanner'); await button(args.page, qr('scanImage', language)).click(); await button(args.page, qr('batch.multipleMode', language)).click(); await qrPanel(args.page).waitFor() }
async function chooseQr(page, files) { await qrInput(page).setInputFiles(files); await poll(async () => await qrRows(page).count() === files.length, 'QR selection represented') }
async function qrStatuses(page) { return qrRows(page).evaluateAll(rows => rows.map(row => row.dataset.qrStatus)) }
async function readQr(page, language = 'ko', retry = false) { await qrButton(page, retry ? 'retry' : 'start', language).click(); await poll(async () => (await qrStatuses(page)).every(status => status !== 'waiting' && status !== 'processing') && await qrButton(page, 'cancel', language).count() === 0, 'all selected QR rows settled', 280) }
async function qrContents(page) { return qrRows(page).evaluateAll(rows => rows.map(row => row.querySelector('[data-qr-batch-text]')?.textContent ?? null)) }
async function nativeQrMode(page, mode, text = 'native-controlled-result') {
  await page.evaluate(({ mode, text }) => {
    window.__nativeQrMode = mode; window.__nativeQrText = text; window.__nativeDetects = 0; window.__pendingNative = []
    window.BarcodeDetector = class {
      constructor() { if (window.__nativeQrMode === 'constructorError') throw new Error('Controlled native constructor failure') }
      static async getSupportedFormats() { if (window.__nativeQrMode === 'supportError') throw new Error('Controlled support failure'); return window.__nativeQrMode === 'unsupported' ? ['code_128'] : ['qr_code'] }
      detect() {
        window.__nativeDetects++; const mode = window.__nativeQrMode
        if (mode === 'detectError') return Promise.reject(new Error('Controlled native detector failure'))
        if (mode === 'pending') return new Promise(resolve => window.__pendingNative.push(resolve))
        return Promise.resolve(mode === 'empty' ? [] : [{ format: 'qr_code', rawValue: window.__nativeQrText }, ...(mode === 'multiple' ? [{ format: 'qr_code', rawValue: 'native-second-result' }] : [])])
      }
    }
  }, { mode, text })
}
async function injectSizedFiles(page, specs) {
  await qrInput(page).evaluate((input, specs) => { const files = new DataTransfer(); for (const [index, size] of specs.entries()) files.items.add(new File([new Uint8Array(size)], `size-${index}.png`, { type: 'image/png' })); input.files = files.files; input.dispatchEvent(new Event('change', { bubbles: true })) }, specs)
}
async function qrClipboard(page, mode) {
  await page.evaluate(mode => {
    window.__nativeClipboard ??= navigator.clipboard; window.__nativeExec ??= document.execCommand; window.__copyFallbacks = 0; window.__pendingCopies = []
    document.execCommand = function(command, ...args) { if (command !== 'copy') return window.__nativeExec.call(this, command, ...args); window.__copyFallbacks++; return false }
    if (mode === 'native') { Object.defineProperty(navigator, 'clipboard', { configurable: true, value: window.__nativeClipboard }); document.execCommand = window.__nativeExec; return }
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: mode === 'absent' ? undefined : { writeText: text => mode === 'defer' ? new Promise((resolve, reject) => window.__pendingCopies.push({ text, resolve, reject })) : Promise.reject(new DOMException('Controlled clipboard failure', 'NotAllowedError')) } })
  }, mode)
}
test('qr-native-unavailable-real-worker-pixels', async args => {
  const { page, context } = args; const history = JSON.stringify([{ content: '기존 단일 기록', type: 'text', timestamp: 1794844800000 }]); await context.addInitScript(history => { localStorage.setItem('qrScanHistory', history) }, history); await openQr(args); assert.equal(await page.evaluate(() => window.__qrWorkers.length), 0)
  await chooseQr(page, [qrFile('korean', 'same.png'), qrFile('korean', 'same.png'), qrFile('left', 'different.png')]); assert.deepEqual(await qrStatuses(page), ['waiting', 'waiting', 'waiting']); assert.equal(await page.evaluate(() => window.__qrWorkers.length), 0, 'file selection does not start decoder'); const start = Date.now(); await readQr(page); const elapsed = Date.now() - start; assert.deepEqual(await qrStatuses(page), ['success', 'success', 'success']); assert.deepEqual(await qrContents(page), [payloads.korean, payloads.korean, payloads.left]); const ids = await qrRows(page).evaluateAll(rows => rows.map(row => row.dataset.qrBatchRow)); assert.equal(new Set(ids).size, 3); const workers = await page.evaluate(() => window.__qrWorkers); assert.equal(workers.length, 3); assert.ok(workers.every(worker => worker.terminated && worker.posts.length === 1 && worker.posts[0].beforeBytes > 0 && worker.posts[0].afterBytes === 0)); assert.equal(await page.evaluate(() => localStorage.getItem('qrScanHistory')), history); assert.equal(await qrPanel(page).getByRole('checkbox', { checked: true }).count(), 0)
  return { actualDecodeElapsedMs: elapsed, nativeDetectorAbsent: true, sameNamesDistinctIds: ids, exactUnicodeAndWhitespace: true, pixelsTransferredAndWorkerTerminated: true, existingHistoryUnchanged: true }
}, { observeQr: true, nativeQr: 'absent' })
test('qr-multiple-codes-and-mixed-file-results', async args => {
  const { page } = args; await openQr(args); const largeHeader = Buffer.from(qrFile('blank').buffer); largeHeader.writeUInt32BE(4097, 16); largeHeader.writeUInt32BE(4096, 20)
  await chooseQr(page, [qrFile('multiple'), qrFile('blank'), { name: 'broken.png', mimeType: 'image/png', buffer: Buffer.from('not a picture') }, { name: 'vector.svg', mimeType: 'image/svg+xml', buffer: Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"/>') }, { name: 'too-many-pixels.png', mimeType: 'image/png', buffer: largeHeader }, qrFile('right')]); await readQr(page); const statuses = await qrStatuses(page); assert.deepEqual(statuses, ['success', 'notDetected', 'readFailed', 'readFailed', 'outOfRange', 'success']); const content = await qrContents(page); assert.ok([payloads.left, payloads.right].includes(content[0])); assert.equal(content[5], payloads.right); assert.equal(await qrRow(page, 0).locator('[data-qr-batch-text]').count(), 1); assert.equal(await qrRow(page, 5).getByRole('link').count(), 0, 'WiFi content is not executed'); assert.equal(await page.evaluate(() => window.__qrWorkers.length), 3); return { statuses, multipleImageReturnedOneOf: [payloads.left, payloads.right], actualMultipleResult: content[0], predecodeHeaderLimitRejected: true }
}, { observeQr: true, nativeQr: 'absent' })
test('qr-selection-byte-and-pixel-limits', async args => {
  const { page } = args; await openQr(args); await chooseQr(page, [qrFile('korean')]); const ids = await qrRows(page).evaluateAll(rows => rows.map(row => row.dataset.qrBatchRow)); await qrInput(page).setInputFiles(Array.from({ length: 11 }, (_, index) => qrFile('korean', `${index}.png`))); await qrPanel(page).getByRole('alert').waitFor(); assert.deepEqual(await qrRows(page).evaluateAll(rows => rows.map(row => row.dataset.qrBatchRow)), ids); await qrInput(page).setInputFiles([]); assert.deepEqual(await qrRows(page).evaluateAll(rows => rows.map(row => row.dataset.qrBatchRow)), ids)
  await injectSizedFiles(page, Array(6).fill(8 * 1024 * 1024)); await qrPanel(page).getByRole('alert').waitFor(); assert.deepEqual(await qrRows(page).evaluateAll(rows => rows.map(row => row.dataset.qrBatchRow)), ids); await injectSizedFiles(page, Array(5).fill(8 * 1024 * 1024)); assert.equal(await qrRows(page).count(), 5); assert.deepEqual(await qrStatuses(page), Array(5).fill('waiting')); assert.equal(await page.evaluate(() => window.__qrWorkers.length), 0)
  await injectSizedFiles(page, [8 * 1024 * 1024 + 1, 0]); await readQr(page); assert.deepEqual(await qrStatuses(page), ['outOfRange', 'outOfRange']); assert.equal(await page.evaluate(() => window.__qrWorkers.length), 0)
  await chooseQr(page, Array.from({ length: 10 }, (_, index) => qrFile('korean', `${index}.png`))); assert.equal(await qrRows(page).count(), 10); await qrButton(page, 'clear').click(); assert.equal(await qrRows(page).count(), 0); return { maximumFiles: 10, maxFileBytes: 8388608, totalBytesBoundary: 41943040, oversizeSelectionPreservesRows: true, exactCountAcceptedWithoutAutoStart: true }
}, { observeQr: true, nativeQr: 'absent' })
test('qr-native-success-and-worker-fallback', async args => {
  const { page } = args; await openQr(args); await nativeQrMode(page, 'multiple', 'controlled-first-native'); await chooseQr(page, [qrFile('left')]); await readQr(page); assert.deepEqual(await qrContents(page), ['controlled-first-native']); assert.equal(await page.evaluate(() => window.__qrWorkers.length), 0); await qrRow(page, 0).getByText(qr('batch.multiple'), { exact: true }).waitFor()
  const modes = ['empty', 'unsupported', 'constructorError', 'detectError', 'supportError']; for (let index = 0; index < modes.length; index++) { await nativeQrMode(page, modes[index]); await chooseQr(page, [qrFile('korean')]); await readQr(page); assert.deepEqual(await qrContents(page), [payloads.korean]); assert.equal(await page.evaluate(() => window.__qrWorkers.length), index + 1) }
  return { controlledNativeMultipleReturnedFirstOnly: true, nativeSuccessWorkerCount: 0, actualWorkerFallbackModes: modes }
}, { observeQr: true, nativeQr: 'absent' })
test('qr-exact-txt-and-copy-recovery', async args => {
  const { page, context } = args; await context.addInitScript(() => localStorage.setItem('qrScanHistory', JSON.stringify([{ content: '기존 단일 결과 복사', type: 'text', timestamp: 1794844800000 }]))); await openQr(args); await chooseQr(page, [qrFile('korean', '같은\n이름.png'), qrFile('korean', '같은\n이름.png'), qrFile('long', 'inert.png')]); await readQr(page); assert.deepEqual(await qrContents(page), [payloads.korean, payloads.korean, payloads.long]); assert.equal(await qrRow(page, 2).locator('img,script,a').count(), 0); assert.ok(await qrButton(page, 'download', 'ko', { count: 0 }).isDisabled()); await qrRow(page, 0).getByRole('checkbox').check(); await qrRow(page, 2).getByRole('checkbox').check(); const expected = `1. 같은 이름.png\n${payloads.korean}\n\n3. inert.png\n${payloads.long}`; const file = await download(page, () => qrButton(page, 'download', 'ko', { count: 2 }).click(), 'selected-qr-exact-utf8.txt'); assert.deepEqual(file.bytes, Buffer.from(expected, 'utf8')); assert.match(file.filename, /^qr-images-\d{4}-\d{2}-\d{2}\.txt$/)
  await qrClipboard(page, 'reject'); await qrRow(page, 0).getByRole('button').first().click(); const recovery = qrRow(page, 0).locator('[data-qr-copy-recovery]'); await recovery.waitFor(); assert.equal(await recovery.locator('textarea').inputValue(), payloads.korean); await button(recovery, qr('batch.selectText')).click(); assert.deepEqual(await recovery.locator('textarea').evaluate(node => [node.selectionStart, node.selectionEnd]), [0, payloads.korean.length]); await qrClipboard(page, 'native'); await button(recovery, qr('batch.copyRetry')).click(); await poll(async () => await recovery.count() === 0, 'native copy retry cleared recovery'); assert.equal((await page.evaluate(() => navigator.clipboard.readText())).replace(/\r\n/g, '\n'), payloads.korean)
  await qrClipboard(page, 'defer'); await qrRow(page, 0).getByRole('button').first().click(); await qrRow(page, 2).getByRole('button').first().click(); await page.evaluate(() => { window.__pendingCopies[1].resolve(); window.__pendingCopies[0].reject(new Error('Old request')) }); await wait(150); assert.equal(await page.evaluate(() => window.__copyFallbacks), 0); assert.equal(await page.locator('[data-qr-copy-recovery]').count(), 0); for (const reverse of [false, true]) { await qrClipboard(page, 'defer'); const parentCopy = button(page, qr('copy') + ' 1'), batchCopy = qrRow(page, 2).getByRole('button').first(); await (reverse ? batchCopy : parentCopy).click(); await (reverse ? parentCopy : batchCopy).click(); await page.evaluate(() => { window.__pendingCopies[1].resolve(); window.__pendingCopies[0].reject(new Error('Old cross-panel copy')) }); await wait(100); assert.equal(await page.evaluate(() => window.__copyFallbacks), 0); assert.equal(await page.locator('[data-qr-copy-recovery]').count(), 0) }; return { filename: file.filename, exactByteLength: file.bytes.length, sourceWhitespacePreserved: true, duplicateNamesSelectedById: true, inertMarkupAndScriptText: true, actualClipboardRetry: true, staleFallbackBlocked: true, parentBatchCrossCopyBothDirections: true }
}, { observeQr: true, nativeQr: 'absent' })

test('qr-cancel-new-selection-retry-and-timeout', async args => {
  const { page } = args; await openQr(args); await page.evaluate(() => { window.__holdQrAfter = 1 }); await chooseQr(page, [qrFile('korean'), qrFile('left'), qrFile('blank')]); await qrButton(page, 'start').click(); await poll(async () => (await qrStatuses(page))[0] === 'success' && await page.evaluate(() => window.__qrPostQueue.length === 1), 'first success and second native Worker held'); await qrRow(page, 0).getByRole('checkbox').check(); await qrButton(page, 'cancel').click(); assert.deepEqual(await qrStatuses(page), ['success', 'canceled', 'canceled']); await page.evaluate(() => { const old = window.__qrWorkerRefs[1]; old.dispatchEvent(new MessageEvent('message', { data: { requestId: old.__entry.posts[0].requestId, type: 'found', text: 'stale-result' } })); window.__holdQrAfter = null; window.__releaseQrPosts() }); assert.deepEqual(await qrContents(page), [payloads.korean, null, null]); await readQr(page, 'ko', true); assert.deepEqual(await qrStatuses(page), ['success', 'success', 'notDetected']); assert.ok(await qrRow(page, 0).getByRole('checkbox').isChecked())
  await page.evaluate(() => { const original = File.prototype.arrayBuffer; window.__fileReads = []; window.__restoreFileReads = () => { File.prototype.arrayBuffer = original }; File.prototype.arrayBuffer = function() { return new Promise(resolve => window.__fileReads.push(async () => resolve(await original.call(this)))) } }); await chooseQr(page, [qrFile('blank')]); await qrButton(page, 'start').click(); await poll(() => page.evaluate(() => window.__fileReads.length === 1), 'file read held'); await chooseQr(page, [qrFile('korean')]); await page.evaluate(async () => { window.__restoreFileReads(); for (const finish of window.__fileReads) await finish() }); await readQr(page); assert.deepEqual(await qrContents(page), [payloads.korean])
  await page.evaluate(() => { window.__holdQrPosts = true }); await chooseQr(page, [qrFile('left')]); const count = await page.evaluate(() => window.__qrWorkers.length); await qrButton(page, 'start').click(); await poll(() => page.evaluate(count => window.__qrWorkers.length > count, count), 'Worker waiting before tab switch'); await button(page, qr('scanCamera')).click(); await button(page, qr('scanImage')).click(); await button(page, qr('batch.multipleMode')).click(); assert.deepEqual(await qrStatuses(page), ['canceled']); await page.evaluate(() => window.__releaseQrPosts()); await readQr(page, 'ko', true); assert.deepEqual(await qrContents(page), [payloads.left])
  await page.clock.install(); await page.evaluate(() => { window.__holdQrPosts = true }); await chooseQr(page, [qrFile('left')]); await qrButton(page, 'start').click(); await poll(() => page.evaluate(() => window.__qrPostQueue.length === 1), 'timeout Worker has pixel request'); await page.clock.fastForward(11000); await poll(async () => (await qrStatuses(page))[0] === 'timedOut', 'Worker 10-second timeout'); await page.evaluate(() => window.__releaseQrPosts()); await page.clock.resume(); await readQr(page, 'ko', true); assert.deepEqual(await qrContents(page), [payloads.left]); const workers = await page.evaluate(() => window.__qrWorkers); assert.ok(workers.every(worker => worker.terminated)); const images = await page.evaluate(() => window.__objectUrls.filter(item => item.type?.startsWith('image/'))); assert.ok(images.every(item => item.revoked)); return { nativeWorkersTerminated: workers.length, imageObjectUrlsRevoked: images.length, completedSelectionKeptOnRetry: true, lateFileReadDiscarded: true, tabSwitchCancelledWithoutRestart: true, controlledTimeoutRecoveredWithActualDecoder: true }
}, { observeQr: true, nativeQr: 'absent' })
test('qr-single-history-camera-and-320-dark-english', async args => {
  const { page, context, open } = args; const originalHistory = [{ content: '기존 단일 QR', type: 'text', timestamp: 1794844800000 }]
  await context.addInitScript(history => {
    localStorage.setItem('qrScanHistory', JSON.stringify(history)); window.__nativeSingleText = ''; window.__streams = []; window.__mediaResolvers = []; window.__delayMedia = false
    window.BarcodeDetector = class { static async getSupportedFormats() { return ['qr_code'] }; async detect() { return window.__nativeSingleText ? [{ format: 'qr_code', rawValue: window.__nativeSingleText }] : [] } }
    Object.defineProperty(navigator.mediaDevices, 'getUserMedia', { configurable: true, value: () => { const canvas = document.createElement('canvas'); canvas.width = 32; canvas.height = 32; const ctx = canvas.getContext('2d'); ctx.fillStyle = 'white'; ctx.fillRect(0, 0, 32, 32); const stream = canvas.captureStream(1); window.__streams.push(stream); return window.__delayMedia ? new Promise(resolve => window.__mediaResolvers.push(() => resolve(stream))) : Promise.resolve(stream) } })
  }, originalHistory)
  await open('qr-scanner'); await button(page, qr('startCamera', 'en')).click(); await poll(() => page.evaluate(() => window.__streams.length === 1), 'synthetic media stream acquired'); await button(page, qr('scanImage', 'en')).click(); assert.equal(await page.evaluate(() => window.__streams[0].getTracks().every(track => track.readyState === 'ended')), true)
  await button(page, qr('scanCamera', 'en')).click(); await page.evaluate(() => { window.__delayMedia = true }); await button(page, qr('startCamera', 'en')).click(); await poll(() => page.evaluate(() => window.__mediaResolvers.length === 1), 'late media approval pending'); await button(page, qr('scanImage', 'en')).click(); await page.evaluate(() => window.__mediaResolvers[0]()); await poll(() => page.evaluate(() => window.__streams[1].getTracks().every(track => track.readyState === 'ended')), 'late stream tracks stopped')
  await page.evaluate(() => { window.__nativeSingleText = 'single-only-new' }); await page.locator('main input[type="file"]:not([multiple])').setInputFiles(qrFile('left')); await poll(async () => await page.evaluate(() => JSON.parse(localStorage.getItem('qrScanHistory')).length === 2), 'single image appended native-controlled result'); const singleHistory = await page.evaluate(() => JSON.parse(localStorage.getItem('qrScanHistory'))); assert.equal(singleHistory[0].content, 'single-only-new'); assert.equal(singleHistory[1].content, originalHistory[0].content)
  await page.evaluate(() => { localStorage.setItem('qrScanHistory', '{broken'); dispatchEvent(new StorageEvent('storage', { key: 'qrScanHistory', newValue: '{broken' })); window.__nativeSingleText = '' }); await button(page, qr('batch.refreshHistory', 'en')).click(); await page.getByText(qr('batch.historyErrors.corrupt', 'en'), { exact: true }).waitFor(); await button(page, qr('batch.multipleMode', 'en')).click(); await chooseQr(page, [qrFile('long')]); await readQr(page, 'en'); assert.deepEqual(await qrContents(page), [payloads.long]); assert.equal(await page.evaluate(() => localStorage.getItem('qrScanHistory')), '{broken'); await qrClipboard(page, 'absent'); await button(qrRow(page, 0), qr('copy', 'en')).click(); const recovery = qrRow(page, 0).locator('[data-qr-copy-recovery]'); await recovery.waitFor(); const geometry = await mobile(page, [qrInput(page), recovery.locator('textarea')], [qrButton(page, 'start', 'en'), qrButton(page, 'retry', 'en'), button(recovery, qr('batch.selectText', 'en')), button(recovery, qr('batch.copyRetry', 'en'))]); await screenshot(page, 'qr-batch-english-320-dark', recovery); return { geometry, syntheticCameraTracksStopped: 2, nativeSingleResultControlled: true, singleHistoryPreserved: singleHistory, corruptHistoryUntouchedByBatch: true, actualLongPayloadWorkerDecoded: true }
}, { observeQr: true, width: 320, dark: true, language: 'en' })

if (only === "--list") console.log(planned.join("\n"))
else {
  assert.ok(cases.length, "Waiting for product readiness; Chrome was not started.")
  mkdirSync(out, { recursive: true }); const browser = await chromium.launch({ channel: "chrome" })
  try { for (const scenario of cases) await run(browser, scenario) }
  finally { await browser.close(); const merged = readdirSync(out).filter(name => name.endsWith("-evidence.json")).map(name => JSON.parse(readFileSync(resolve(out, name), "utf8"))); const final = { checkedAt: new Date().toISOString(), passed: merged.filter(item => item.status === "pass").length, failed: merged.filter(item => item.status === "fail").length, results: merged }; writeFileSync(resolve(out, "final-results.json"), JSON.stringify(final, null, 2)); console.log(JSON.stringify({ passed: final.passed, failed: final.failed, browserClosed: true })) }
  if (results.some(item => item.status !== "pass")) process.exitCode = 1
}
