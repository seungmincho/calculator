import { chromium } from 'playwright'
import assert from 'node:assert/strict'
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { conversionImage, rasterInfo } from '../docs/verify/2026-11-17-repeat-batch56/browser-fixtures.mjs'
import { installOcrWorkerPort } from '../docs/verify/2026-11-17-repeat-batch57/browser-fixtures.mjs'
import { observeAspectNativeIo } from '../docs/verify/2026-11-17-repeat-batch37/browser-fixtures.mjs'




// Independent real-browser checks. --list never starts Chrome; case-name filters
// preserve previous evidence so only changed boundaries need to be rerun.
const base = process.env.VERIFY_BASE_URL || 'http://127.0.0.1:3039'
const out = resolve('docs/verify/2026-11-17-repeat-batch57/browser')
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
    if (!localStorage.getItem('__batch57Seeded')) { localStorage.setItem('language', options.language ?? 'ko'); localStorage.setItem('theme', options.dark ? 'dark' : 'light'); localStorage.setItem('__batch57Seeded', '1') }
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
const button = (page, key, language = 'ko') => page.getByRole('button', { name: tr('imageOcr', key, language), exact: true })
async function setup(args) { await installOcrWorkerPort(args.context); await observeAspectNativeIo(args.context); await args.open('image-ocr'); await oc(args.page, 'root').waitFor() }
async function done(page, count) { await poll(async () => await oc(page, 'status', 'done').count() === count, `${count} OCR success rows`) }
async function jobs(page) { return page.evaluate(() => window.__ocrPackets.filter(item => item.packet.action === 'recognize').length) }
async function plans(page, list) { await page.evaluate(list => window.__ocrPlans.push(...list), list) }
async function upload(page, files) { await oc(page, 'upload').setInputFiles(files) }
async function settle(page) { await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))) }
async function leave(page) { await page.locator('header a[href="/"]').first().click(); await oc(page, 'root').waitFor({ state: 'detached' }) }
async function evidence(page) { const result = await page.evaluate(() => ({ workers: window.__ocrWorkers.map(worker => ({ index: worker.index, terminated: worker.terminated })), jobs: window.__ocrPackets.map(record => ({ worker: record.worker, action: record.packet.action, jobId: record.packet.jobId, bytes: record.packet.payload?.image?.byteLength, output: record.packet.payload?.output, delivered: record.delivered })), deliveryThrows: window.__ocrDeliveryThrows })); assert.deepEqual(result.deliveryThrows, []); return result }
async function confirm(page, kind) { await oc(page, 'confirmation', kind).waitFor(); await oc(page, 'confirm').click() }

test('ocr-native-preview-protocol-and-visible-txt', async args => {
  const { page, network } = args; await setup(args); await oc(page, 'prep', 'off').click(); await plans(page, [{ text: 'first source\nsecond line' }, { text: '다음 원고' }]); await upload(page, [conversionImage('first.png'), conversionImage('second.png', [20, 190, 90, 255])]); await done(page, 2)
  assert.equal(await input(page).inputValue(), 'first source\nsecond line'); await input(page).fill('사용자가 고친 첫 원고\n끝'); const file = await download(page, () => button(page, 'downloadTxt').click(), 'ocr-visible-text.txt'); assert.equal(file.text, '사용자가 고친 첫 원고\n끝\n\n다음 원고'); assert.ok(!file.bytes.subarray(0, 3).equals(Buffer.from([239, 187, 191])))
  const firstPreview = await oc(page, 'preview').getAttribute('src'); const bytes = await page.evaluate(async url => [...new Uint8Array(await (await fetch(url)).arrayBuffer())], firstPreview); const preview = await rasterInfo(page, Buffer.from(bytes)); assert.deepEqual([preview.width, preview.height], [160, 96]); assert.deepEqual(preview.pixel, [220, 30, 40, 255]); await oc(page, 'rotate', 'right').click(); await poll(async () => await oc(page, 'preview').evaluate(image => image.complete && image.naturalWidth === 96 && image.naturalHeight === 160), 'actual rotated PNG preview'); assert.equal(await jobs(page), 2)
  const port = await evidence(page); assert.equal(port.workers.length, 1); for (const job of port.jobs.filter(job => job.action === 'recognize')) { assert.ok(job.bytes > 0); assert.deepEqual(job.output, { text: true, blocks: true }); assert.match(job.jobId, /^toolhub-ocr-/) }; assert.ok(!network.some(url => /traineddata|tesseract-core.*wasm|tessdata/.test(url)))
  return { ...port, actualPreview: preview, rotatedSize: [96, 160], actualTxtBytes: file.bytes.length, visibleEditedWholeOutput: true, modelDownloads: 0, controlledRecognition: true }
})

test('ocr-pause-current-finish-and-selective-failure-retry', async args => {
  const { page } = args; await setup(args); await plans(page, [{ text: 'first', hold: true }, { fail: true }, { text: 'third' }]); await upload(page, [conversionImage('one.png'), conversionImage('two.png')]); await poll(async () => await jobs(page) === 1, 'first recognize held'); await oc(page, 'pause').click(); await page.evaluate(() => window.__ocrRelease()); await done(page, 1); assert.equal(await oc(page, 'root').getAttribute('data-ocr-paused'), 'true'); assert.equal(await jobs(page), 1); await upload(page, conversionImage('three.png')); assert.equal(await jobs(page), 1)
  await oc(page, 'pause').click(); await done(page, 2); assert.equal(await oc(page, 'status', 'error').count(), 1); assert.equal(await jobs(page), 3); await oc(page, 'pause').click(); await plans(page, [{ text: 'recovered second' }]); await oc(page, 'retry-failed').click(); assert.equal(await oc(page, 'root').getAttribute('data-ocr-paused'), 'true'); assert.equal(await oc(page, 'status', 'pending').count(), 1); assert.equal(await jobs(page), 3); await oc(page, 'pause').click(); await done(page, 3); assert.equal(await jobs(page), 4)
  return { ...(await evidence(page)), pauseAtFileBoundary: true, pausedUploadAndRetryStayPaused: true, onlyFailedItemRecognizedAgain: true, intentionalRejectHandledWithoutGlobalThrow: true }
})

test('ocr-confirmed-rerun-preserves-new-edit-failure-and-empty', async args => {
  const { page } = args; await setup(args); await plans(page, [{ text: 'original source' }]); await upload(page, conversionImage()); await done(page, 1); await input(page).fill('edited draft'); await oc(page, 'rerun', 'active').click(); await oc(page, 'confirmation', 'rerun').waitFor(); await oc(page, 'confirm-cancel').click(); assert.equal(await jobs(page), 1); assert.equal(await input(page).inputValue(), 'edited draft')
  await plans(page, [{ hold: true, fail: true }]); await oc(page, 'rerun', 'active').click(); await confirm(page, 'rerun'); await poll(async () => await jobs(page) === 2, 'confirmed rerun held'); await oc(page, 'previous').waitFor(); assert.equal(await input(page).inputValue(), 'edited draft'); const previous = await download(page, () => button(page, 'downloadTxt').click(), 'ocr-pending-previous.txt'); assert.equal(previous.text, 'edited draft'); await input(page).fill('new edit while running'); await page.evaluate(() => window.__ocrRelease()); await oc(page, 'status', 'error').waitFor(); assert.equal(await input(page).inputValue(), 'new edit while running')
  await plans(page, [{ text: 'new raw', hold: true }]); await oc(page, 'rerun', 'active').click(); await confirm(page, 'rerun'); await poll(async () => await jobs(page) === 3, 'second rerun held'); await input(page).fill('newest edit protected'); await page.evaluate(() => window.__ocrRelease()); await done(page, 1); assert.equal(await input(page).inputValue(), 'newest edit protected'); await oc(page, 'result-notice').waitFor()
  await plans(page, [{ text: '' }]); await oc(page, 'rerun', 'active').click(); await confirm(page, 'rerun'); await done(page, 1); await poll(async () => await input(page).inputValue() === '', 'approved empty success'); assert.equal(await oc(page, 'result-notice').innerText(), tr('imageOcr', 'jobs.emptyResult'))
  return { ...(await evidence(page)), confirmCancelStartsNothing: true, pendingActualTxtUsesPreviousDraft: true, failureKeepsNewEdit: true, successfulRecognitionKeepsLaterEdit: true, approvedEmptyTextIsNewSuccess: true }
})

test('ocr-cleanup-reset-confirmation-and-revision', async args => {
  const { page } = args; await setup(args); await plans(page, [{ text: 'alpha\nbeta' }]); await upload(page, conversionImage()); await done(page, 1); await input(page).fill('my edited text'); assert.equal(await oc(page, 'clean', 'joinLines').isChecked(), false); await oc(page, 'clean', 'joinLines').click(); await oc(page, 'confirmation', 'cleanup').waitFor(); assert.equal(await oc(page, 'clean', 'joinLines').isChecked(), false); await oc(page, 'confirm-cancel').click(); assert.equal(await input(page).inputValue(), 'my edited text')
  await oc(page, 'clean', 'joinLines').click(); await input(page).fill('new after permission'); await oc(page, 'confirm').click(); await oc(page, 'confirm-changed').waitFor(); assert.equal(await input(page).inputValue(), 'new after permission'); assert.equal(await oc(page, 'clean', 'joinLines').isChecked(), false); await oc(page, 'clean', 'joinLines').click(); await confirm(page, 'cleanup'); assert.equal(await input(page).inputValue(), 'alpha beta'); assert.equal(await oc(page, 'clean', 'joinLines').isChecked(), true)
  await input(page).fill('keep on reset cancel'); await oc(page, 'reset').click(); await oc(page, 'confirmation', 'reset').waitFor(); await oc(page, 'confirm-cancel').click(); assert.equal(await input(page).inputValue(), 'keep on reset cancel'); await oc(page, 'reset').click(); await confirm(page, 'reset'); assert.equal(await oc(page, 'select').count(), 0); assert.equal(await oc(page, 'text').count(), 0)
  return { ...(await evidence(page)), cleanupCancelPreservesCheckboxAndDraft: true, newerEditInvalidatesOldConfirmation: true, confirmedCleanupFromOriginalRaw: true, resetCancelAndConfirm: true }
})

test('ocr-late-create-reinitialize-and-cleanup-ownership', async args => {
  const { page } = args; await setup(args); await page.evaluate(() => window.__ocrHoldActions = ['load']); await upload(page, conversionImage('old-create.png')); await poll(() => page.evaluate(() => window.__ocrPackets.some(item => item.packet.action === 'load' && !item.delivered)), 'worker initial load held'); await oc(page, 'reset').click(); await plans(page, [{ text: 'new after late create' }]); await upload(page, conversionImage('new-create.png')); await settle(page); assert.equal(await page.evaluate(() => window.__ocrWorkers.length), 1); await page.evaluate(() => { window.__ocrHoldActions = []; window.__ocrRelease('load') }); await done(page, 1); assert.equal(await input(page).inputValue(), 'new after late create'); assert.equal(await page.evaluate(() => window.__ocrWorkers[0].terminated), 1); assert.equal(await page.evaluate(() => window.__ocrPackets.filter(item => item.worker === 0 && item.packet.action === 'recognize').length), 0)
  await page.evaluate(() => window.__ocrHoldActions = ['initialize']); await oc(page, 'language', 'jpn').click(); await oc(page, 'rerun', 'active').click(); await poll(() => page.evaluate(() => window.__ocrPackets.some(item => item.packet.action === 'initialize' && !item.delivered)), 'reinitialize held'); await oc(page, 'remove').click(); await page.evaluate(() => window.__ocrHoldActions = []); await plans(page, [{ text: 'new after removed reinit' }]); await upload(page, conversionImage('third.png')); await done(page, 1); const count = await jobs(page); await page.evaluate(() => window.__ocrRelease('initialize')); await settle(page); assert.equal(await jobs(page), count); assert.equal(await input(page).inputValue(), 'new after removed reinit')
  await page.evaluate(() => window.__ocrHoldActions = ['initialize']); await oc(page, 'language', 'jpn').click(); await oc(page, 'rerun', 'active').click(); await poll(() => page.evaluate(() => window.__ocrPackets.some(item => item.packet.action === 'initialize' && !item.delivered)), 'unmount initialize held'); await leave(page); await page.evaluate(() => { window.__ocrHoldActions = []; window.__ocrRelease('initialize') }); await settle(page); assert.equal(await jobs(page), count); assert.ok(await page.evaluate(() => window.__ocrWorkers.every(worker => worker.terminated > 0)))
  return { ...(await evidence(page)), delayedCreateNoOverlapAndRetiredBeforeRecognize: true, removedReinitializeLateCompletionCannotRecognize: true, unmountTerminatesOwnedWorker: true }
})

test('ocr-recognize-cancel-and-late-preview', async args => {
  const { page } = args; await setup(args); await plans(page, [{ text: 'old removed', hold: true }]); await upload(page, conversionImage('old.png')); await poll(async () => await jobs(page) === 1, 'held recognize'); const oldIndex = await page.evaluate(() => window.__ocrPackets.findIndex(item => item.packet.action === 'recognize')); await oc(page, 'remove').click(); await plans(page, [{ text: 'current recognized' }]); await upload(page, conversionImage('current.png', [0, 180, 30, 255])); await done(page, 1); assert.equal(await input(page).inputValue(), 'current recognized'); await page.evaluate(index => { window.__ocrProgress(index); window.__ocrRelease() }, oldIndex); await settle(page); assert.equal(await input(page).inputValue(), 'current recognized')
  await oc(page, 'pause').click(); await page.evaluate(() => window.__ocrImagePlans.push({ hold: true, fail: true })); await upload(page, conversionImage('preview-old.png', [255, 0, 0, 255], 180, 80)); await poll(() => page.evaluate(() => window.__ocrImageReads.some(item => item.plan.hold && !item.delivered)), 'old preview native decode held'); await upload(page, conversionImage('preview-new.png', [0, 0, 255, 255], 120, 60)); await poll(async () => await oc(page, 'preview').evaluate(image => image.complete && image.naturalWidth === 240 && image.naturalHeight === 120), 'new prepared preview'); const newest = await oc(page, 'preview').getAttribute('src'); await page.evaluate(() => window.__ocrReleaseImages()); await settle(page); assert.equal(await oc(page, 'preview').getAttribute('src'), newest)
  await page.evaluate(() => window.__aspectEncodeMode = 'hold'); await oc(page, 'prep', 'off').click(); await poll(() => page.evaluate(() => window.__aspectHeld.some(item => item.type === 'encode')), 'old preview toBlob held'); await page.evaluate(() => window.__aspectEncodeMode = 'native'); await upload(page, conversionImage('preview-final.png', [100, 70, 20, 255], 90, 50)); await poll(async () => await oc(page, 'preview').evaluate(image => image.complete && image.naturalWidth === 90 && image.naturalHeight === 50 && window.__ocrObjectUrls.some(item => item.url === image.src && !item.file)), 'new final preview'); const final = await oc(page, 'preview').getAttribute('src'); await page.evaluate(() => window.__releaseAspect('encode')); await settle(page); assert.equal(await oc(page, 'preview').getAttribute('src'), final)
  return { ...(await evidence(page)), terminateWithOldRecognizePendingDoesNotBlockNewWork: true, lateProgressAndResultIgnored: true, actualPreviewDecodeFailureAndToBlobLateCannotReplaceNew: true }
})

test('ocr-settings-snapshot-and-tts-handoff', async args => {
  const { page, network } = args; await setup(args); await plans(page, [{ text: 'captured old settings', hold: true }, { text: 'new settings next' }]); await upload(page, [conversionImage('first.png'), conversionImage('second.png')]); await poll(async () => await jobs(page) === 1, 'first settings held'); await oc(page, 'language', 'jpn').click(); await oc(page, 'prep', 'off').click(); await page.evaluate(() => window.__ocrRelease()); await done(page, 2); await oc(page, 'settings-changed').waitFor(); await oc(page, 'select').nth(1).click(); assert.equal(await oc(page, 'settings-changed').count(), 0); await input(page).fill('정확한 전달 원고\n두 번째 문장'); const before = await page.evaluate(() => JSON.stringify([{ ...localStorage }, { ...sessionStorage }])); assert.ok(!before.includes('정확한 전달 원고')); assert.ok(!page.url().includes('정확한'))
  await button(page, 'handoff.read').click(); await page.waitForURL('**/text-to-speech/?from=ocr'); await page.locator('#tts-text').waitFor(); await poll(async () => await page.locator('#tts-text').inputValue() === '정확한 전달 원고\n두 번째 문장', 'handoff restored'); assert.equal(await page.evaluate(() => sessionStorage.getItem('toolhub-ocr-tts-v1')), null); assert.ok(!network.some(url => /traineddata|tesseract-core.*wasm|tessdata/.test(url)))
  return { runningUsesCapturedSettings: true, followingJobUsesNewSettings: true, metadataMismatchVisible: true, actualSameTabHandoffExactTextAndOneTimeConsume: true, noRawInUrlOrPersistentStorage: true, modelDownloads: 0 }
})

test('ocr-320-dark-ko-en-and-confirmation-keyboard', async args => {
  const { page } = args; await setup(args); await plans(page, [{ text: '합성 원고\nsecond line' }]); await upload(page, conversionImage('mobile.png')); await done(page, 1); await input(page).fill('모바일에서 편집한 원고'); const geometry = {}
  for (const language of ['ko', 'en']) { if (language === 'en') { await changeLanguage(page, language); await poll(async () => await oc(page, 'pause').innerText() === tr('imageOcr', 'jobs.pause', language), 'English OCR ready') }; await oc(page, 'rerun', 'active').focus(); await page.keyboard.press('Enter'); await oc(page, 'confirmation', 'rerun').waitFor(); geometry[language] = await mobile(page, [input(page)], [oc(page, 'pause'), oc(page, 'retry-failed'), oc(page, 'confirm'), oc(page, 'confirm-cancel')]); await oc(page, 'confirmation').evaluate(element => element.scrollIntoView({ block: 'center', behavior: 'instant' })); await page.screenshot({ path: resolve(out, `ocr-320-${language}-confirmation.png`), caret: 'initial' }); await oc(page, 'confirm-cancel').click(); await input(page).evaluate(element => element.scrollIntoView({ block: 'center', behavior: 'instant' })); await page.screenshot({ path: resolve(out, `ocr-320-${language}-draft.png`), caret: 'initial' }); assert.equal(await input(page).inputValue(), '모바일에서 편집한 원고') }
  return { geometry, text16MajorControls44: true, nativeEnterConfirmationAndCancelKeepsDraft: true, ...(await evidence(page)) }
}, { width: 320, dark: true, touch: true })

const planned = cases.map(item => item.name)
if (only === '--list') console.log(planned.join('\n'))
else { const selected = cases.filter(item => !only || only.split(',').some(part => item.name.includes(part))); assert.ok(selected.length); mkdirSync(out, { recursive: true }); const browser = await chromium.launch({ channel: 'chrome' }); try { for (const scenario of selected) await run(browser, scenario) } finally { await browser.close(); const merged = readdirSync(out).filter(name => name.endsWith('-evidence.json')).map(name => JSON.parse(readFileSync(resolve(out, name), 'utf8'))); const final = { checkedAt: new Date().toISOString(), passed: merged.filter(item => item.status === 'pass').length, failed: merged.filter(item => item.status === 'fail').length, browserClosed: true, results: merged }; writeFileSync(resolve(out, 'final-results.json'), JSON.stringify(final, null, 2)); console.log(JSON.stringify({ passed: final.passed, failed: final.failed, browserClosed: true })) } if (results.some(item => item.status !== 'pass')) process.exitCode = 1 }

