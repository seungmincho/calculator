import { chromium } from 'playwright'
import assert from 'node:assert/strict'
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { conversionImage } from '../docs/verify/2026-11-17-repeat-batch56/browser-fixtures.mjs'
import { installOcrWorkerPort } from '../docs/verify/2026-11-17-repeat-batch57/browser-fixtures.mjs'
import { installOcrOutputPorts } from '../docs/verify/2026-11-17-repeat-batch58/browser-fixtures.mjs'




// Independent real-browser checks. --list never starts Chrome; case-name filters
// preserve previous evidence so only changed boundaries need to be rerun.
const base = process.env.VERIFY_BASE_URL || 'http://127.0.0.1:3039'
const out = resolve('docs/verify/2026-11-17-repeat-batch58/browser')
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
    if (!localStorage.getItem('__batch58Seeded')) { localStorage.setItem('language', options.language ?? 'ko'); localStorage.setItem('theme', options.dark ? 'dark' : 'light'); localStorage.setItem('__batch58Seeded', '1') }
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
  try { detail = await fn({ page, context, open, network, logs }) ?? {}; assert.deepEqual(errors, [], 'JS page errors'); assert.deepEqual(hydration, [], 'Hydration errors'); assert.deepEqual(consoleErrors.filter(value=>/ErrorBoundary|NotFoundError|The above error occurred/i.test(value)),[],'React caught runtime errors'); for (const active of context.pages()) assert.deepEqual(await active.evaluate(() => window.__unhandled), [], 'Unhandled rejections'); assert.ok(!/\b(?:imageOcr|shareResult)\.[a-zA-Z][\w.]+/.test(await page.locator('body').innerText()), 'Raw translation key') }
  catch (cause) { status = 'fail'; error = redact(cause.stack ?? String(cause)); await page.screenshot({ path: resolve(out, `${name}-failure.png`), caret: 'initial', mask: options.sensitive ? [page.locator('#dp-account'), page.locator('pre'), page.locator('[data-dutch-copy-recovery]')] : [] }).catch(() => {}); writeFileSync(resolve(out, `${name}-failure.txt`), `${error}\n\n${options.sensitive ? 'Sensitive page body intentionally omitted.' : await page.locator('body').innerText().catch(() => '')}`) }
  const result = { name, status, checkedAt: new Date().toISOString(), ...detail, error, errors: errors.map(redact), hydration: hydration.map(redact), consoleErrors: consoleErrors.map(redact), external: [...new Set(external)].map(redact) }
  clearTimeout(watchdog); results.push(result); writeFileSync(resolve(out, `${name}-evidence.json`), JSON.stringify(result, null, 2)); console.log(`${status.toUpperCase()} ${name}${error ? `: ${error.split('\n')[0]}` : ''}`); await context.close()
}
async function changeLanguage(page, language) {
  await page.evaluate(() => scrollTo({ top: 0, behavior: 'instant' })); const toggle = page.locator('[data-language-toggle]:visible').first()
  await toggle.locator('button[aria-expanded]').click(); await toggle.getByRole('button', { name: language === 'en' ? 'English' : '한국어', exact: true }).last().click()
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

const oc = (page, key, value) => page.locator(`[data-ocr-${key}${value === undefined ? '' : `="${value}"`}]`)
const input = page => oc(page, 'text')
const copy = (page, target = 'result') => oc(page, 'output-copy', target)
async function setup(args, texts = ['first source', 'second source']) { await installOcrWorkerPort(args.context); await installOcrOutputPorts(args.context); await args.open('image-ocr'); await args.page.evaluate(texts => window.__ocrPlans.push(...texts.map(text => ({ text }))), texts); await oc(args.page, 'upload').setInputFiles(texts.map((text, i) => conversionImage(`source-${i}.png`))); await poll(async () => await oc(args.page, 'status', 'done').count() === texts.length, 'controlled OCR ready') }
async function settle(page) { await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))) }
async function native(page) { return page.evaluate(() => window.__ocrNativeRead()) }
async function failed(page) { await oc(page, 'copy-recovery').waitFor() }
async function txt(page, name) { return download(page, () => oc(page, 'output-download').click(), name) }

test('ocr-output-native-current-all-and-actual-txt', async args => {
  const { page } = args; await setup(args); const first = '  한글 😀 <b>literal</b>\n둘째 줄\t끝  '; await input(page).fill(first); await copy(page).click(); await oc(page, 'output-status', 'copied').waitFor(); assert.equal((await native(page)).replace(/\r\n/g, '\n'), first); await copy(page, 'all').click(); await oc(page, 'output-status', 'copied').waitFor(); const expected = first + '\n\nsecond source'; assert.equal((await native(page)).replace(/\r\n/g, '\n'), expected); const file = await txt(page, 'ocr-native-output.txt'); assert.ok(file.bytes.equals(Buffer.from(expected))); assert.equal(file.filename, 'ocr-result.txt'); assert.equal(await input(page).inputValue(), first); assert.equal(await page.locator('[data-ocr-root] b').filter({ hasText: 'literal' }).count(), 0)
  return { realOsClipboardCurrentAndAll: true, windowsClipboardNewlineNormalizedForComparison: true, actualUtf8TxtBytes: file.bytes.length, sourceLiteralAndWhitespacePreserved: true }
})

test('ocr-output-missing-reject-manual-select-retry', async args => {
  const { page } = args; await setup(args, ['manual original']); await input(page).fill('전체 수동 원고\n둘째 줄 😀'); await page.evaluate(() => window.__setOcrClipboard('absent')); await copy(page).click(); await failed(page); assert.equal(await oc(page, 'copy-manual').count(), 0); await oc(page, 'copy-expand').click(); const field = oc(page, 'copy-manual'), text = await field.inputValue(); assert.equal(text, await input(page).inputValue()); assert.equal(await field.getAttribute('readonly'), ''); await oc(page, 'copy-select').click(); assert.deepEqual(await field.evaluate(el => [el.selectionStart, el.selectionEnd]), [0, text.length]); await page.evaluate(() => window.__ocrSelectionFailure = true); await oc(page, 'copy-select').click(); assert.ok((await oc(page, 'copy-recovery').innerText()).includes(tr('imageOcr', 'output.selectionFailed'))); await page.evaluate(() => { window.__ocrSelectionFailure = false; window.__setOcrClipboard('reject'); window.__ocrLegacyMode = 'throw' }); await oc(page, 'copy-retry').click(); await failed(page); await page.evaluate(() => window.__ocrLegacyMode = 'true'); await oc(page, 'copy-retry').click(); await oc(page, 'output-status', 'copied').waitFor(); assert.equal(await oc(page, 'copy-recovery').count(), 0)
  return { apiAbsentLegacyFalseNoFalseSuccess: true, apiRejectLegacyThrow: true, lazyWholeReadonlyAndNativeSelection: true, explicitSelectionFailure: true, controlledLegacyTrueRetry: true }
})

test('ocr-output-large-whole-manual-and-txt', async args => {
  const { page } = args; await setup(args, ['large']); const text = '원고 😀\t<literal>\n'.repeat(4200); await page.evaluate(value => navigator.clipboard.writeText(value), text); await input(page).focus(); await page.keyboard.press('Control+A'); await page.keyboard.press('Control+V'); await poll(async () => (await input(page).inputValue()).length === text.length, 'native paste completed'); await page.evaluate(() => window.__setOcrClipboard('reject')); await copy(page).click(); await failed(page); assert.equal(await oc(page, 'copy-manual').count(), 0); await oc(page, 'copy-expand').click(); assert.equal(await oc(page, 'copy-manual').inputValue(), text); await oc(page, 'copy-select').click(); assert.deepEqual(await oc(page, 'copy-manual').evaluate(el => [el.selectionStart, el.selectionEnd]), [0, text.length]); const file = await txt(page, 'ocr-large-output.txt'); assert.ok(file.bytes.equals(Buffer.from(text))); assert.equal(await oc(page, 'copy-recovery').count(), 0)
  return { utf16Length: text.length, exactUtf8Bytes: file.bytes.length, wholeManualOnlyAfterExpand: true, exactWholeDownload: true }
})

test('ocr-output-cross-owner-late-copy-and-download', async args => {
  const { page } = args; await setup(args); let before = 0
  for (const [old, next] of [['result', 'all'], ['all', 'result']]) { await page.evaluate(() => window.__setOcrClipboard('hold')); await copy(page, old).click(); await page.evaluate(() => window.__setOcrClipboard('native')); await copy(page, next).click(); await oc(page, 'output-status', 'copied').waitFor(); before = await page.evaluate(() => window.__ocrLegacyCalls.length); await page.evaluate(() => window.__ocrClipboardPending.shift().reject(new Error('late previous copy'))); await settle(page); assert.equal(await page.evaluate(() => window.__ocrLegacyCalls.length), before); assert.equal(await oc(page, 'copy-recovery').count(), 0) }
  await page.evaluate(() => window.__setOcrClipboard('hold')); await copy(page).click(); const file = await txt(page, 'ocr-cross-copy-txt.txt'); await page.evaluate(() => window.__ocrClipboardPending.shift().reject(new Error('late before TXT'))); await settle(page); assert.equal(await page.evaluate(() => window.__ocrLegacyCalls.length), before); await oc(page, 'output-status', 'downloadStarted').waitFor(); assert.equal(file.text, 'first source\n\nsecond source')
  return { currentAllBothDirectionsLateFallback: 0, copyToActualTxtLateFallback: 0, latestDownloadNoticePreserved: true }
})

test('ocr-output-edit-selection-locale-aba-and-unmount', async args => {
  const { page } = args; await setup(args)
  for (const boundary of ['edit', 'selection', 'locale']) { await page.evaluate(() => window.__setOcrClipboard('hold')); await copy(page).click(); const original = await input(page).inputValue(); if (boundary === 'edit') { await input(page).fill('temporary'); await input(page).fill(original) }; if (boundary === 'selection') { await oc(page, 'select').nth(1).click(); await oc(page, 'select').nth(0).click() }; if (boundary === 'locale') { await changeLanguage(page, 'en'); await poll(async () => await copy(page).innerText() === tr('imageOcr', 'copy', 'en'), 'English ready'); await changeLanguage(page, 'ko'); await poll(async () => await copy(page).innerText() === tr('imageOcr', 'copy'), 'KO restored') }; const before = await page.evaluate(() => window.__ocrLegacyCalls.length); await page.evaluate(() => window.__ocrClipboardPending.shift().reject(new Error('old context'))); await settle(page); assert.equal(await page.evaluate(() => window.__ocrLegacyCalls.length), before); assert.equal(await oc(page, 'copy-recovery').count(), 0); assert.equal(await oc(page, 'output-status').count(), 0) }
  await copy(page).click(); await page.locator('header a[href="/"]').first().click(); await oc(page, 'root').waitFor({ state: 'detached' }); const before = await page.evaluate(() => window.__ocrLegacyCalls.length); await page.evaluate(() => window.__ocrClipboardPending.shift().reject(new Error('old unmounted'))); await settle(page); assert.equal(await page.evaluate(() => window.__ocrLegacyCalls.length), before)
  return { editSelectionLocaleAbaLateNoticeAndFallback: 0, unmountLateFallback: 0 }
})

test('ocr-output-download-failure-cleanup-and-handoff', async args => {
  const { page } = args; await setup(args, ['output']); await input(page).fill('current handoff text\n두 번째 줄'); for (const failure of ['url', 'anchor']) { await page.evaluate(value => window.__ocrOutputFailure = value, failure); await oc(page, 'output-download').click(); await oc(page, 'output-status', 'downloadFailed').waitFor(); assert.equal(await input(page).inputValue(), 'current handoff text\n두 번째 줄') }; assert.ok(await page.evaluate(() => window.__ocrOutputUrls.every(item => item.revoked))); await page.evaluate(() => window.__ocrOutputFailure = ''); const file = await txt(page, 'ocr-after-download-error.txt'); assert.equal(file.text, 'current handoff text\n두 번째 줄'); await page.getByRole('button', { name: tr('imageOcr', 'handoff.read'), exact: true }).click(); await page.waitForURL('**/text-to-speech/?from=ocr'); await page.locator('#tts-text').waitFor(); await poll(async () => await page.locator('#tts-text').inputValue() === file.text, 'exact TTS handoff'); assert.equal(await page.evaluate(() => sessionStorage.getItem('toolhub-ocr-tts-v1')), null); assert.deepEqual(await page.evaluate(() => window.__ocrSpeechCalls), [])
  return { createObjectUrlAndAnchorFailuresKeepDraft: true, ownedFailureUrlsRevoked: true, realTxtRetry: true, handoffExactAndOneTime: true, automaticSpeechCalls: 0 }
})

test('ocr-output-320-dark-ko-en-manual-keyboard', async args => {
  const { page } = args; await setup(args, ['mobile']); await input(page).fill('줄바꿈 없는 아주 긴 원고 '.repeat(40)); const geometry = {}
  for (const language of ['ko', 'en']) { if (language === 'en') { await changeLanguage(page, language); await poll(async () => await copy(page).innerText() === tr('imageOcr', 'copy', language), 'English copy ready') }; await page.evaluate(() => window.__setOcrClipboard('absent')); await copy(page).focus(); await page.keyboard.press('Enter'); await failed(page); assert.equal(await page.getByText(tr('imageOcr', 'output.failed', language, { label: tr('imageOcr', 'output.current', language) }), { exact: true }).count(), 1); await oc(page, 'copy-expand').click(); geometry[language] = await mobile(page, [input(page), oc(page, 'copy-manual')], [oc(page, 'copy-select'), oc(page, 'copy-retry'), oc(page, 'copy-close')]); await oc(page, 'copy-select').focus(); await page.keyboard.press('Enter'); assert.equal(await oc(page, 'copy-manual').evaluate(el => el.selectionEnd), (await input(page).inputValue()).length); await oc(page, 'copy-recovery').evaluate(element => element.scrollIntoView({ block: 'center', behavior: 'instant' })); await page.screenshot({ path: resolve(out, `ocr-copy-320-${language}-viewport.png`), caret: 'initial' }); await oc(page, 'copy-close').click(); assert.equal(await oc(page, 'copy-recovery').count(), 0) }
  return { geometry, fields16Controls44: true, nativeKeyboardCopyAndSelect: true }
}, { width: 320, dark: true, touch: true })

const planned = cases.map(item => item.name)
if (only === '--list') console.log(planned.join('\n'))
else { const selected = cases.filter(item => !only || only.split(',').some(part => item.name.includes(part))); assert.ok(selected.length); mkdirSync(out, { recursive: true }); const browser = await chromium.launch({ channel: 'chrome' }); try { for (const scenario of selected) await run(browser, scenario) } finally { await browser.close(); const merged = readdirSync(out).filter(name => name.endsWith('-evidence.json')).map(name => JSON.parse(readFileSync(resolve(out, name), 'utf8'))); const final = { checkedAt: new Date().toISOString(), passed: merged.filter(item => item.status === 'pass').length, failed: merged.filter(item => item.status === 'fail').length, browserClosed: true, results: merged }; writeFileSync(resolve(out, 'final-results.json'), JSON.stringify(final, null, 2)); console.log(JSON.stringify({ passed: final.passed, failed: final.failed, browserClosed: true })) } if (results.some(item => item.status !== 'pass')) process.exitCode = 1 }

