import { chromium } from 'playwright'
import assert from 'node:assert/strict'
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { PNG } from 'pngjs'
import { conversionImage, inspectConversionZip, rasterInfo, installConversionPorts } from '../docs/verify/2026-11-17-repeat-batch56/browser-fixtures.mjs'
import { observeAspectNativeIo } from '../docs/verify/2026-11-17-repeat-batch37/browser-fixtures.mjs'




// Independent real-browser checks. --list never starts Chrome; case-name filters
// preserve previous evidence so only changed boundaries need to be rerun.
const base = process.env.VERIFY_BASE_URL || 'http://127.0.0.1:3039'
const out = resolve('docs/verify/2026-11-17-repeat-batch56/browser')
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
    if (!localStorage.getItem('__batch56Seeded')) { localStorage.setItem('language', options.language ?? 'ko'); localStorage.setItem('theme', options.dark ? 'dark' : 'light'); localStorage.setItem('__batch56Seeded', '1') }
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
  try { detail = await fn({ page, context, open, network, logs }) ?? {}; assert.deepEqual(errors, [], 'JS page errors'); assert.deepEqual(hydration, [], 'Hydration errors'); assert.deepEqual(consoleErrors.filter(value=>/ErrorBoundary|NotFoundError|The above error occurred/i.test(value)),[],'React caught runtime errors'); for (const active of context.pages()) assert.deepEqual(await active.evaluate(() => window.__unhandled), [], 'Unhandled rejections'); assert.ok(!/\b(?:imageConverter|shareResult)\.[a-zA-Z][\w.]+/.test(await page.locator('body').innerText()), 'Raw translation key') }
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

const cv = (page, key, value) => page.locator(`[data-conversion-${key}${value === undefined ? '' : `="${value}"`}]`)
const row = (page, index = 0) => cv(page, 'row').nth(index)
const action = (page, value) => cv(page, 'action', value)
async function setup(args, query = '', holdRestore = false) {
  await installConversionPorts(args.context, holdRestore); await observeAspectNativeIo(args.context)
  await args.open('image-converter', query)
  if (!holdRestore) await ready(args.page)
}
async function ready(page) { await page.locator('[data-conversion-ready="true"]').waitFor(); await poll(async () => await cv(page, 'controls').getAttribute('data-conversion-settling') === 'false', 'settings settled') }
async function done(page, count) { await poll(async () => await cv(page, 'success', 'current').count() === count, `${count} current successful files`) }
async function upload(page, files) { await cv(page, 'input').setInputFiles(files) }
async function format(page, value) { await cv(page, 'format', value).click(); await ready(page) }
async function settle(page) { await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))) }
async function leave(page) { await page.locator('header a[href="/"]').first().click(); await page.locator('[data-image-converter]').waitFor({ state: 'detached' }) }
async function metrics(page) { return page.evaluate(() => ({ encodes: window.__aspectEncodes.filter(item => item.width >= 64), maximumActiveEncoder: window.__aspectMaxEncode, headers: window.__conversionHeaders, held: window.__aspectHeld.length })) }
async function one(page, index, name) { return download(page, () => row(page, index).locator('[data-conversion-download]').click(), name) }

test('conversion-native-alpha-jpeg-background', async args => {
  const { page } = args; await setup(args, '?f=png'); await upload(page, conversionImage('alpha.png', [220, 30, 40, 128])); await done(page, 1)
  const pngFile = await one(page, 0, 'actual-alpha.png'), png = PNG.sync.read(pngFile.bytes); assert.deepEqual([png.width, png.height], [160, 96]); assert.equal(png.data[3], 128); assert.ok(Math.abs(png.data[0] - 220) <= 1)
  await format(page, 'jpeg'); await cv(page, 'bg').fill('#0000ff'); await done(page, 1)
  const jpeg = await one(page, 0, 'actual-background.jpg'); assert.equal(jpeg.bytes.readUInt16BE(0), 0xffd8); const pixels = await rasterInfo(page, jpeg.bytes); assert.deepEqual([pixels.width, pixels.height], [160, 96]); assert.equal(pixels.pixel[3], 255); for (const [index, expected] of [110, 15, 148].entries()) assert.ok(Math.abs(pixels.pixel[index] - expected) < 5, JSON.stringify(pixels))
  assert.equal(jpeg.filename, 'alpha.jpg'); const memory = await page.evaluate(() => JSON.stringify([{ ...localStorage }, { ...sessionStorage }])); assert.ok(!memory.includes('alpha.png')); assert.ok(!page.url().includes('alpha'))
  return { actualPng: { bytes: pngFile.bytes.length, width: png.width, height: png.height, alpha: png.data[3] }, actualJpeg: { bytes: jpeg.bytes.length, ...pixels }, sourceBytesAbsentFromUrlStorage: true }
})

test('conversion-pause-native-slot-and-resume', async args => {
  const { page } = args; await setup(args); await page.evaluate(() => { window.__aspectEncodeMode = 'hold'; window.__aspectMaxEncode = 0 }); await upload(page, [conversionImage('first.png'), conversionImage('second.png')]); await poll(() => page.evaluate(() => window.__aspectHeld.some(item => item.type === 'encode')), 'first actual native encode held')
  await action(page, 'pause').click(); assert.equal(await cv(page, 'controls').getAttribute('data-conversion-phase'), 'finishing'); await page.evaluate(() => { window.__aspectEncodeMode = 'native'; window.__releaseAspect('encode') }); await done(page, 1); await poll(async () => await cv(page, 'controls').getAttribute('data-conversion-phase') === 'paused', 'pause at file boundary'); assert.equal(await cv(page, 'status', 'processing').count(), 0)
  await upload(page, conversionImage('third.png')); await poll(async () => await cv(page, 'row').count() === 3, 'paused add'); assert.equal(await cv(page, 'success', 'current').count(), 1); await page.evaluate(() => window.__aspectEncodeMode = 'hold'); await action(page, 'resume').click(); await poll(() => page.evaluate(() => window.__aspectHeld.some(item => item.type === 'encode')), 'second encode held'); await action(page, 'pause').click(); await action(page, 'resume').click(); assert.equal(await page.evaluate(() => window.__aspectActiveEncode), 1); await page.evaluate(() => { window.__aspectEncodeMode = 'native'; window.__releaseAspect('encode') }); await done(page, 3); const evidence = await metrics(page); assert.equal(evidence.maximumActiveEncoder, 1)
  return { ...evidence, pausedCurrentFileCompleted: true, pausedNewFileDidNotStart: true, rapidResumeMaximumNativeEncode: 1 }
})

test('conversion-previous-success-failure-retry-and-aba', async args => {
  const { page } = args; await setup(args); await upload(page, conversionImage('kept.png')); await done(page, 1); const previous = await one(page, 0, 'previous-success.jpg'), previousUrl = await row(page).locator('img').getAttribute('src')
  await page.evaluate(() => window.__aspectEncodeMode = 'null'); await format(page, 'png'); await cv(page, 'status', 'error').waitFor(); assert.equal(await cv(page, 'success', 'previous').count(), 1); assert.equal(await cv(page, 'success', 'current').count(), 0); assert.equal(await row(page).locator('img').getAttribute('src'), previousUrl); const kept = await one(page, 0, 'kept-after-failure.jpg'); assert.ok(kept.bytes.equals(previous.bytes)); assert.equal(kept.filename, 'kept.jpg')
  await action(page, 'pause').click(); await action(page, 'retry').click(); assert.equal(await cv(page, 'status', 'pending').count(), 1); await page.evaluate(() => window.__aspectEncodeMode = 'native'); await upload(page, conversionImage('later.png')); await poll(async () => await cv(page, 'row').count() === 2, 'paused second file'); assert.equal(await cv(page, 'status', 'processing').count(), 0); await action(page, 'resume').click(); await done(page, 2)
  assert.equal(await page.evaluate(url => window.__aspectUrls.find(item => item.url === url).revoked, previousUrl), true)
  await page.evaluate(() => window.__aspectEncodeMode = 'hold'); await format(page, 'jpeg'); await poll(() => page.evaluate(() => window.__aspectHeld.some(item => item.type === 'encode')), 'old setting held'); await cv(page, 'format', 'png').click(); await cv(page, 'format', 'jpeg').click(); await ready(page); assert.equal(await page.evaluate(() => window.__aspectActiveEncode), 1); await page.evaluate(() => { window.__aspectEncodeMode = 'native'; window.__releaseAspect('encode') }); await done(page, 2); assert.equal(await cv(page, 'success', 'previous').count(), 0)
  return { previousJpegBytesPreserved: previous.bytes.length, newFailureExcludedFromCurrent: true, pausedRetryAndAddStayPaused: true, oldUrlReleasedAfterReplacement: true, settingAbaLateResultDiscarded: true, ...(await metrics(page)) }
})

test('conversion-header-lifetime-and-existing-file-policy', async args => {
  const { page } = args; await setup(args); await page.evaluate(() => { window.__conversionHeaderModes['old.png'] = 'hold' }); await upload(page, conversionImage('old.png')); await cv(page, 'reading').waitFor(); await action(page, 'clear').click(); await page.evaluate(() => window.__releaseConversionHeaders()); await settle(page); assert.equal(await cv(page, 'row').count(), 0)
  await page.evaluate(() => { window.__conversionHeaderModes['slow.png'] = 'hold' }); await upload(page, conversionImage('slow.png')); await upload(page, conversionImage('fast.png')); await done(page, 1); await page.evaluate(() => window.__releaseConversionHeaders()); await done(page, 2)
  await action(page, 'clear').click(); await page.evaluate(() => { window.__conversionSizeOverrides['boundary.png'] = 100 * 1024 * 1024; window.__conversionSizeOverrides['too-large.png'] = 100 * 1024 * 1024 + 1; window.__conversionHeaderModes['fallback.png'] = 'fail' }); await upload(page, [conversionImage('boundary.png'), conversionImage('too-large.png'), { name: 'zero.png', mimeType: 'image/png', buffer: Buffer.alloc(0) }, { name: 'vector.svg', mimeType: 'image/svg+xml', buffer: Buffer.from('<svg/>') }, conversionImage('fallback.png')]); await done(page, 2); assert.equal(await cv(page, 'row').count(), 2); assert.ok((await cv(page, 'row').allTextContents()).some(text => text.includes('boundary.png')))
  await page.evaluate(() => window.__conversionHeaderModes['leave.png'] = 'hold'); await upload(page, conversionImage('leave.png')); await cv(page, 'reading').waitFor(); await leave(page); const encodeBefore = await page.evaluate(() => window.__aspectEncodes.length); await page.evaluate(() => window.__releaseConversionHeaders()); await settle(page); assert.equal(await page.evaluate(() => window.__aspectEncodes.length), encodeBefore)
  return { lateHeaderAfterClearAndUnmountAdds: 0, concurrentBatchesPreserved: 2, fileSizeBoundaryControlledGetter: '100 MiB accepted; +1 rejected, actual file is a tiny synthetic PNG', zeroAndSvgRejected: true, headerReadFailureUsesExistingMimeFallback: true }
})

test('conversion-real-zip-crc-and-fixed-snapshot', async args => {
  const { page } = args; await setup(args, '?f=png'); await upload(page, [conversionImage('a.jpg', [255, 0, 0, 255]), conversionImage('a.png', [0, 255, 0, 255]), conversionImage('a (2).jpg', [0, 0, 255, 255])]); await done(page, 3)
  const originals = []; for (let index = 0; index < 3; index++) originals.push((await one(page, index, `zip-source-${index}.png`)).bytes)
  await page.evaluate(() => { window.__zipMode = 'hold'; window.__zipReads = [] }); const pending = page.waitForEvent('download'); await cv(page, 'download-all').click(); await poll(() => page.evaluate(() => window.__zipReads.length === 3), 'snapshot Blob reads'); await row(page, 0).locator('[data-conversion-remove]').click(); await upload(page, conversionImage('added.png', [200, 100, 20, 255])); await done(page, 3); await page.evaluate(() => window.__releaseZip()); const file = await pending; const path = resolve(out, 'conversion-fixed-snapshot.zip'); await file.saveAs(path); const entries = await inspectConversionZip(page, readFileSync(path)); assert.equal(entries.length, 3); assert.ok(entries.some(entry => entry.name === 'a (2).png' && entry.pixel[2] === 255)); assert.deepEqual(entries.map(entry => entry.pixel).sort(), [[255, 0, 0, 255], [0, 255, 0, 255], [0, 0, 255, 255]].sort())
  const zip = (await import('jszip')).default; const parsed = await zip.loadAsync(readFileSync(path)); const output = await Promise.all(Object.values(parsed.files).filter(file => !file.dir).map(file => file.async('nodebuffer'))); assert.ok(originals.every(bytes => output.some(entry => entry.equals(bytes))))
  return { actualZip: { bytes: readFileSync(path).length, entries }, crcVerified: true, everyEntryEqualsActualIndividualOutput: true, reservedNameCollisionPreserved: true, clickSnapshotSurvivedAddAndDelete: true }
})

test('conversion-zip-failure-cancel-settings-and-unmount', async args => {
  const { page } = args; await setup(args); await upload(page, [conversionImage('one.png'), conversionImage('two.png')]); await done(page, 2); await page.evaluate(() => window.__zipMode = 'fail'); await cv(page, 'download-all').click(); await cv(page, 'zip-state', 'failed').waitFor(); assert.equal(await cv(page, 'success', 'current').count(), 2); await page.evaluate(() => window.__zipMode = 'normal'); const retry = await download(page, () => action(page, 'retryZip').click(), 'conversion-zip-retry.zip'); assert.equal((await inspectConversionZip(page, retry.bytes)).length, 2)
  let late = 0; page.on('download', () => late++)
  for (const boundary of ['cancel', 'settings', 'clear', 'leave']) {
    if (await cv(page, 'row').count() === 0) { await upload(page, [conversionImage('one.png'), conversionImage('two.png')]); await done(page, 2) }
    await page.evaluate(() => { window.__zipMode = 'hold'; window.__zipReads = [] }); await cv(page, 'download-all').click(); await poll(() => page.evaluate(() => window.__zipReads.length === 2), 'held ZIP')
    if (boundary === 'cancel') await action(page, 'cancelZip').click(); if (boundary === 'settings') { await cv(page, 'format', 'png').click(); await done(page, 2) }; if (boundary === 'clear') await action(page, 'clear').click(); if (boundary === 'leave') await leave(page)
    await page.evaluate(() => window.__releaseZip()); await wait(200); assert.equal(late, 0, boundary)
  }
  return { injectedBlobReadFailureRecoveredWithRealZip: true, completedResultsPreserved: true, cancelSettingsClearUnmountLateDownloads: late }
})

test('conversion-url-restore-early-intent-and-writer-failure', async args => {
  const { page, context } = args; await setup(args, '?foreign=a&f=png&q=67&bg=123456&foreign=b#keep'); assert.equal(await cv(page, 'format', 'png').getAttribute('aria-pressed'), 'true'); await page.evaluate(() => history.replaceState({ ...history.state, verification: 'preserve' }, '', location.href)); await format(page, 'jpeg'); await poll(() => new URL(page.url()).searchParams.get('f') === null, 'default JPEG URL omits owned format'); assert.deepEqual(new URL(page.url()).searchParams.getAll('foreign'), ['a', 'b']); assert.equal(new URL(page.url()).hash, '#keep'); assert.equal(await page.evaluate(() => history.state.verification), 'preserve')
  const next = await context.newPage(); await args.open('image-converter', new URL(page.url()).search + new URL(page.url()).hash, next); await ready(next); assert.equal(await cv(next, 'quality').inputValue(), '65'); assert.ok((await cv(next, 'quality').locator('..').innerText()).includes('67')); assert.equal(new URL(next.url()).searchParams.get('q'), '67'); assert.equal(await cv(next, 'bg').inputValue(), '#123456'); await next.close()
  await page.evaluate(() => { history.pushState(history.state, '', '?foreign=z&f=png#other'); dispatchEvent(new PopStateEvent('popstate')) }); await ready(page); assert.equal(await cv(page, 'format', 'png').getAttribute('aria-pressed'), 'true'); await page.evaluate(() => window.__conversionHistoryFailure = true); await format(page, 'jpeg'); await cv(page, 'url-error').waitFor(); assert.equal(await cv(page, 'format', 'jpeg').getAttribute('aria-pressed'), 'true')
  const early = await context.newPage(); await installConversionPorts(context, true); await args.open('image-converter', '?f=png&q=19', early); await poll(() => early.evaluate(() => window.__conversionRestore.some(item => !item.canceled)), 'initial restore held'); await cv(early, 'format', 'jpeg').click(); await early.evaluate(() => window.__releaseConversionRestore()); await ready(early); assert.equal(await cv(early, 'format', 'jpeg').getAttribute('aria-pressed'), 'true'); await early.close()
  return { realNewVisitSettings: true, popstateOwnedSettings: true, repeatedForeignHashHistoryState: true, historyFailureKeepsCurrentSettings: true, controlledInitialEarlyIntentWins: true }
})

test('conversion-320-dark-ko-en-and-keyboard', async args => {
  const { page } = args; await setup(args); await upload(page, conversionImage('길고 긴 합성 파일 이름 모바일 검증.png')); await done(page, 1); await page.evaluate(() => window.__aspectEncodeMode = 'null'); await format(page, 'png'); await cv(page, 'status', 'error').waitFor(); const geometry = {}
  for (const language of ['ko', 'en']) {
    if (language === 'en') { await changeLanguage(page, language); await poll(async () => await action(page, 'pause').innerText() === tr('imageConverter', 'queue.pause', language), 'English ready') }
    geometry[language] = await mobile(page, [], [action(page, 'pause'), action(page, 'retry'), action(page, 'clear'), row(page).locator('[data-conversion-download]')]); await action(page, 'pause').focus(); await page.keyboard.press('Enter'); await action(page, 'resume').waitFor(); await action(page, 'resume').click(); await cv(page, 'controls').evaluate(element => element.scrollIntoView({ block: 'start', behavior: 'instant' })); await page.screenshot({ path: resolve(out, `conversion-320-${language}-viewport.png`), caret: 'initial' }); await screenshot(page, `conversion-320-${language}`, page.locator('#image-converter-result'))
  }
  return { geometry, majorButtons44: true, previousSuccessAndFailureVisible: true, nativeEnterPause: true }
}, { width: 320, dark: true, touch: true })

const planned = cases.map(item => item.name)
if (only === '--list') console.log(planned.join('\n'))
else { const selected = cases.filter(item => !only || only.split(',').some(part => item.name.includes(part))); assert.ok(selected.length); mkdirSync(out, { recursive: true }); const browser = await chromium.launch({ channel: 'chrome' }); try { for (const scenario of selected) await run(browser, scenario) } finally { await browser.close(); const merged = readdirSync(out).filter(name => name.endsWith('-evidence.json')).map(name => JSON.parse(readFileSync(resolve(out, name), 'utf8'))); const final = { checkedAt: new Date().toISOString(), passed: merged.filter(item => item.status === 'pass').length, failed: merged.filter(item => item.status === 'fail').length, browserClosed: true, results: merged }; writeFileSync(resolve(out, 'final-results.json'), JSON.stringify(final, null, 2)); console.log(JSON.stringify({ passed: final.passed, failed: final.failed, browserClosed: true })) } if (results.some(item => item.status !== 'pass')) process.exitCode = 1 }



