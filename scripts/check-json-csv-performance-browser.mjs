import { chromium } from 'playwright'
import assert from 'node:assert/strict'
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createHash } from 'node:crypto'




// Independent real-browser checks. --list never starts Chrome; case-name filters
// preserve previous evidence so only changed boundaries need to be rerun.
const base = process.env.VERIFY_BASE_URL || 'http://127.0.0.1:3039'
const out = resolve('docs/verify/2026-11-17-repeat-batch26/performance/browser')
const only = process.argv[2]
const messages = Object.fromEntries(['ko', 'en'].map(language => [language, JSON.parse(readFileSync(`messages/${language}.json`, 'utf8'))]))
const tr = (ns, key, language = 'ko', values = {}) => {
  const value = key.split('.').reduce((object, key) => object?.[key], messages[language][ns])
  assert.equal(typeof value, 'string', `Missing ${language}:${ns}.${key}`)
  return value.replace(/\{(\w+)\}/g, (match, key) => values[key] ?? match)
}
const cv = (key, language = 'ko', values = {}) => tr('jsonCsvConverter', key, language, values)
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
    if (!localStorage.getItem('__csvPerformanceSeeded')) { localStorage.setItem('language', options.language ?? 'ko'); localStorage.setItem('theme', options.dark ? 'dark' : 'light'); localStorage.setItem('__csvPerformanceSeeded', '1') }
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
  try { detail = await fn({ page, context, open, network, logs }) ?? {}; assert.deepEqual(errors, [], 'JS page errors'); assert.deepEqual(hydration, [], 'Hydration errors'); for (const active of context.pages()) assert.deepEqual(await active.evaluate(() => window.__unhandled), [], 'Unhandled rejections'); assert.ok(!/\b(?:jsonCsvConverter)\.[a-zA-Z][\w.]+/.test(await page.locator('body').innerText()), 'Raw translation key') }
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

// Observe actual module Workers. Held/error deliveries are explicit fixtures;
// the real constructor, request, computation and structured clone still run.
async function observeCsvWorkers(context) {
  await context.addInitScript(() => {
    const NativeWorker = window.Worker
    window.__csvWorkers = []; window.__csvHeldResponses = []; window.__csvResponseMode = 'native'
    window.__csvWorkerBootstraps = []; const createObjectURL = URL.createObjectURL.bind(URL)
    URL.createObjectURL = blob => { const url = createObjectURL(blob); if (/javascript/.test(blob.type)) { const entry = { url, type: blob.type, source: '' }; window.__csvWorkerBootstraps.push(entry); void blob.text().then(source => { entry.source = source }) }; return url }
    window.__csvNativeWorker = NativeWorker
    window.Worker = class extends NativeWorker {
      constructor(url, options) {
        super(url, options)
        const nativePost = this.postMessage.bind(this), nativeTerminate = this.terminate.bind(this)
        const record = { index: window.__csvWorkers.length, url: String(url), type: options?.type, createdAt: performance.now(), requests: [], responses: [], terminated: false }
        window.__csvWorkers.push(record)
        let onmessage = null, onerror = null, onmessageerror = null
        Object.defineProperties(this, {
          onmessage: { configurable: true, get: () => onmessage, set: callback => { onmessage = callback } },
          onerror: { configurable: true, get: () => onerror, set: callback => { onerror = callback } },
          onmessageerror: { configurable: true, get: () => onmessageerror, set: callback => { onmessageerror = callback } },
        })
        this.addEventListener('message', event => {
          const receivedAt = performance.now(), mode = record.deliveryMode, captured = onmessage
          const info = { id: event.data?.id, kind: event.data?.kind, ok: event.data?.ok, computeMs: event.data?.computeMs, receivedAt, roundTripMs: receivedAt - record.requests.at(-1).postedAt, outputBytes: event.data?.result?.stats?.bytes, callbackMs: null }
          record.responses.push(info)
          const deliver = () => { const start = performance.now(); captured?.call(this, event); info.callbackMs = performance.now() - start; info.deliveredAt = performance.now() }
          if (mode === 'hold') window.__csvHeldResponses.push({ workerIndex: record.index, deliver })
          else if (mode === 'error') onerror?.call(this, { preventDefault() {}, message: 'Controlled worker failure' })
          else if (mode === 'messageerror') onmessageerror?.call(this, new MessageEvent('messageerror'))
          else if (mode === 'invalid') captured?.call(this, new MessageEvent('message', { data: { version: 1, id: event.data.id, kind: event.data.kind, ok: true, result: null, computeMs: 0 } }))
          else deliver()
        })
        this.addEventListener('error', event => { event.preventDefault(); onerror?.call(this, event) })
        this.addEventListener('messageerror', event => onmessageerror?.call(this, event))
        this.postMessage = (request, transfer) => {
          record.deliveryMode = window.__csvResponseMode
          const entry = { id: request.id, kind: request.kind, inputCharacters: request.input?.length, byteLengthBefore: request.bytes?.byteLength, postedAt: performance.now(), transferCount: transfer?.length ?? 0 }
          record.requests.push(entry)
          if (window.__csvResponseMode === 'postError') throw new Error('Controlled postMessage failure')
          const result = nativePost(request, transfer); entry.byteLengthAfter = request.bytes?.byteLength; entry.postReturnedAt = performance.now(); entry.postCallMs = entry.postReturnedAt - entry.postedAt; return result
        }
        this.terminate = () => { record.terminated = true; record.terminatedAt = performance.now(); return nativeTerminate() }
      }
    }
  })
}
async function beginPerformanceWindow(page, label) {
  await page.evaluate(label => {
    const start = performance.now(); window.__csvPerformance = { label, start, previous: start, maxGap: 0, ticks: 0, longTasks: [] }
    window.__csvHeartbeat = setInterval(() => { const now = performance.now(), value = window.__csvPerformance; value.maxGap = Math.max(value.maxGap, now - value.previous); value.previous = now; value.ticks++ }, 16)
    if (PerformanceObserver.supportedEntryTypes.includes('longtask')) { window.__csvLongTasks = new PerformanceObserver(list => { window.__csvPerformance.longTasks.push(...list.getEntries().map(entry => ({ start: entry.startTime, duration: entry.duration }))) }); window.__csvLongTasks.observe({ type: 'longtask' }) }
    const result = document.querySelector('#json-csv-result'); if (result) { window.__csvCommitObserver = new MutationObserver(() => { if (result.dataset.jsonCsvResult === 'current') { window.__csvPerformance.confirmedDomAt = performance.now(); requestAnimationFrame(() => { window.__csvPerformance.confirmedFrameAt = performance.now() }) } }); window.__csvCommitObserver.observe(result, { attributes: true, attributeFilter: ['data-json-csv-result'] }) }
  }, label)
  await wait(40)
}
async function endPerformanceWindow(page) {
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))))
  return page.evaluate(() => { clearInterval(window.__csvHeartbeat); window.__csvLongTasks?.disconnect(); window.__csvCommitObserver?.disconnect(); const value = window.__csvPerformance; return { label: value.label, elapsedMs: performance.now() - value.start, maxTimerGapMs: value.maxGap, ticks: value.ticks, longTasks: value.longTasks, confirmedDomAt: value.confirmedDomAt, confirmedFrameAt: value.confirmedFrameAt } })
}
const fixedCsv = (rows, columns) => {
  const headers = Array.from({ length: columns }, (_, index) => `c${index}`), line = Array.from({ length: columns }, (_, index) => `v${index}`).join(',')
  return headers.join(',') + '\n' + Array(rows).fill(line).join('\n')
}
const priorArtifact = name => readFileSync(resolve('docs/verify/2026-11-17-repeat-batch26/browser', name))
const cs = (page, name, value) => page.locator(`[data-json-csv-${name}${value === undefined ? '' : `="${value}"`}]`)
const ci = page => page.locator('#json-csv-input')
const co = page => page.locator('#json-csv-output')
const hash = value => createHash('sha256').update(value).digest('hex')
const file = (name, value) => ({ name, buffer: Buffer.isBuffer(value) ? value : Buffer.from(value), mimeType: 'application/octet-stream' })
async function openCsv(args, mode = 'jsonToCsv') { await observeCsvWorkers(args.context); await args.open('json-csv-converter'); await ci(args.page).waitFor(); if (mode !== 'jsonToCsv') await cs(args.page, 'mode-button', mode).click() }
async function fillText(page, value) { if (value.length < 20000) await ci(page).fill(value); else { await ci(page).click(); await page.keyboard.press('Control+a'); await page.evaluate(value => navigator.clipboard.writeText(value), value); await page.keyboard.press('Control+v'); await poll(async () => await ci(page).inputValue() === value.replace(/\r\n?/g, '\n'), 'native pasted CSV input') } }
async function converted(page) { await poll(async () => await cs(page, 'result').getAttribute('data-json-csv-result') === 'current' && !(await cs(page, 'download').isDisabled()), 'confirmed Worker result'); assert.equal(await cs(page, 'error').count(), 0) }
async function convert(page) { await cs(page, 'convert').click(); await converted(page) }
async function uploaded(page, value, expected) { await page.locator('#json-csv-file').setInputFiles(value); await poll(async () => !(await cs(page, 'convert').isDisabled()), 'Worker file decode finished'); if (expected !== undefined) assert.equal(await ci(page).inputValue(), expected.replace(/\r\n?/g, '\n')) }
async function workerEvidence(page) { return page.evaluate(() => window.__csvWorkers) }
async function latestConversion(page) { return page.evaluate(() => { const worker = window.__csvWorkers.findLast(item => item.requests.at(-1)?.kind === 'convert'); const request = worker.requests.at(-1), response = worker.responses.at(-1); return { url: worker.url, type: worker.type, terminated: worker.terminated, ...request, ...response, remainingRoundTripMs: response.roundTripMs - response.computeMs, deliveredToConfirmedFrameMs: window.__csvPerformance?.confirmedFrameAt - response.deliveredAt } }) }
async function setClipboard(page, mode) { await page.evaluate(mode => { window.__nativeClipboard ??= navigator.clipboard; window.__csvCopyPending = []; window.__csvFallbackCalls = 0; document.execCommand = () => { window.__csvFallbackCalls++; return false }; Object.defineProperty(navigator, 'clipboard', { configurable: true, value: mode === 'native' ? window.__nativeClipboard : { writeText: mode === 'hold' ? text => new Promise((resolve, reject) => window.__csvCopyPending.push({ text, resolve, reject })) : () => Promise.reject(new DOMException('Controlled clipboard denial', 'NotAllowedError')) } }) }, mode) }
async function heldResponse(page) { await poll(() => page.evaluate(() => window.__csvHeldResponses.length > 0), 'actual Worker response held'); return page.evaluate(() => window.__csvHeldResponses.at(-1).workerIndex) }
async function releaseAll(page) { await page.evaluate(() => { for (const item of window.__csvHeldResponses.splice(0)) item.deliver() }); await wait(60) }
async function workerError(page, key) { await cs(page, 'error').getByText(cv(`fidelity.workerErrors.${key}`), { exact: true }).waitFor() }

test('csv-worker-native-byte-parity-and-separated-timings', async args => {
  const { page } = args; await openCsv(args, 'csvToJson'); assert.equal(await cs(page, 'compute-ms').count(), 0)
  await ci(page).fill('warm\n001'); await convert(page); assert.deepEqual(JSON.parse(await co(page).inputValue()), [{ warm: '001' }])
  const input = fixedCsv(10000, 20); await uploaded(page, file('native-200000-cells.csv', input), input)
  await beginPerformanceWindow(page, 'native Worker convert + bounded initial preview'); await convert(page); const timing = await endPerformanceWindow(page), worker = await latestConversion(page)
  const output = await download(page, () => cs(page, 'download').click(), 'worker-200000-cells-full.json'); assert.deepEqual(output.bytes, priorArtifact('csv-200000-cells-full.json')); assert.equal(JSON.parse(output.text).length, 10000)
  const bootstrap = await page.evaluate(url => window.__csvWorkerBootstraps.find(item => item.url === url), worker.url)
  assert.ok(worker.url.startsWith('blob:') || worker.url.includes('_next/')); assert.ok(worker.computeMs >= 0); assert.equal(worker.terminated, true); assert.ok((await co(page).inputValue()).length <= 50001)
  if (bootstrap) { assert.ok(/importScripts|_next|TURBOPACK/.test(bootstrap.source)); writeFileSync(resolve(out, 'actual-worker-bootstrap.txt'), bootstrap.source) }
  assert.equal(Number(await cs(page, 'compute-ms').getAttribute('data-json-csv-compute-ms')), worker.computeMs)
  return { inputBytes: Buffer.byteLength(input), outputBytes: output.bytes.length, outputSha256: hash(output.bytes), equalsOriginal26ActualFile: true, timing, worker, nativeWorkerBootstrap: bootstrap ? { type: bootstrap.type, sourceBytes: Buffer.byteLength(bootstrap.source), sourceSha256: hash(bootstrap.source) } : null, measurementNotes: 'Next dev may transform the declared module Worker into a Blob bootstrap. Round trip includes startup, input/output clone and scheduling; callbackMs includes validation + settlement; frame delay is not pure React render' }
})

test('csv-preview-all-pages-and-unicode-crlf-boundaries', async args => {
  const { page } = args; await openCsv(args); const value = 'a'.repeat(49991) + '😀' + 'b'.repeat(49999) + '\r\n' + 'c'.repeat(100010) + '\nprivate-preview-end', raw = JSON.stringify({ value })
  await fillText(page, raw); await convert(page); const expected = 'value\r\n"' + value + '"', parts = [], visibleLengths = []; let end = 0
  do {
    const part = await co(page).evaluate(node => ({ text: node[Object.keys(node).find(key => key.startsWith('__reactProps$'))].value, visible: node.value, start: Number(node.dataset.jsonCsvPreviewStart), end: Number(node.dataset.jsonCsvPreviewEnd), total: Number(node.dataset.jsonCsvPreviewTotal), wrap: node.wrap }))
    assert.equal(part.start, end); assert.equal(part.total, expected.length); assert.equal(part.text, expected.slice(part.start, part.end)); assert.equal(part.visible, part.text.replace(/\r\n?/g, '\n')); assert.equal(part.wrap, 'off'); assert.ok(part.text.length <= 50001); assert.ok(!/^[\udc00-\udfff]/.test(part.text) && !/[\ud800-\udbff]$/.test(part.text)); assert.ok(!(expected[part.start - 1] === '\r' && part.text[0] === '\n')); parts.push(part.text); visibleLengths.push(part.text.length); end = part.end
    if (await cs(page, 'text-page', 'next').isDisabled()) break; await cs(page, 'text-page', 'next').click()
  } while (true)
  assert.equal(parts.join(''), expected); assert.equal(Math.max(...visibleLengths), 50001); const output = await download(page, () => cs(page, 'download').click(), 'unicode-all-preview-pages.csv'); assert.deepEqual(output.bytes, Buffer.from(expected))
  await cs(page, 'copy').click(); await page.getByText(cv('fidelity.copied'), { exact: true }).waitFor(); assert.equal((await page.evaluate(() => navigator.clipboard.readText())).replace(/\r\n/g, '\n'), expected.replace(/\r\n/g, '\n'))
  const before = await co(page).inputValue(); await ci(page).fill('{"changed":true}'); assert.equal(await co(page).inputValue(), before); assert.ok(await cs(page, 'download').isDisabled()); await convert(page); assert.equal(await co(page).getAttribute('data-json-csv-preview-start'), '0')
  const state = await page.evaluate(() => JSON.stringify([location.href, localStorage, sessionStorage])); assert.ok(!state.includes('private-preview-end')); assert.ok(!args.network.some(value => value.includes('private-preview-end')))
  return { pages: parts.length, pageUtf16Lengths: visibleLengths, originalCrLfAndAstralBytesRejoined: true, DOMLineEndingNormalizationAccountedFor: true, downloadBytes: output.bytes.length, nativeWholeCopy: true, oldPreviewPreservedWhileDirty: true }
})

test('csv-table-1000-cells-memo-and-independent-render-timings', async args => {
  const { page } = args; await openCsv(args, 'csvToJson'); const input = fixedCsv(1000, 200); await uploaded(page, file('wide.csv', input), input)
  await beginPerformanceWindow(page, 'wide convert + initial 50k preview'); await convert(page); const conversion = await endPerformanceWindow(page), worker = await latestConversion(page)
  const output = await download(page, () => cs(page, 'download').click(), 'worker-wide-200000-cells-full.json'); assert.deepEqual(output.bytes, priorArtifact('csv-wide-200000-cells-full.json'))
  await beginPerformanceWindow(page, 'switch text to 1000-cell table'); await cs(page, 'view', 'table').click(); await cs(page, 'table').waitFor(); const tableRender = await endPerformanceWindow(page)
  assert.equal(await cs(page, 'table').locator('tbody td').count(), 1000); assert.equal(await cs(page, 'table').locator('tbody tr').count(), 5)
  await cs(page, 'page-size').selectOption('1000'); assert.equal(await cs(page, 'table').locator('tbody td').count(), 1000)
  await button(cs(page, 'result'), cv('pagination.last')).click(); await cs(page, 'cell', '999-199').waitFor(); assert.equal(await cs(page, 'cell', '999-199').innerText(), 'v199')
  await page.evaluate(() => { window.__tableBefore = document.querySelector('[data-json-csv-table]'); window.__tableChanges = []; window.__tableObserver = new MutationObserver(entries => window.__tableChanges.push(...entries.map(entry => entry.type))); window.__tableObserver.observe(window.__tableBefore, { subtree: true, childList: true, attributes: true, characterData: true }) })
  await beginPerformanceWindow(page, 'edit original input while memoized table remains'); await ci(page).fill('a\nnew'); const edit = await endPerformanceWindow(page)
  const memo = await page.evaluate(() => { window.__tableObserver.disconnect(); return { sameNode: window.__tableBefore === document.querySelector('[data-json-csv-table]'), mutations: window.__tableChanges } }); assert.equal(memo.sameNode, true); assert.deepEqual(memo.mutations, []); assert.ok(await cs(page, 'download').isDisabled())
  return { rows: 1000, columns: 200, outputBytes: output.bytes.length, visibleCells: 1000, visibleRows: 5, lastDataRowAccessible: true, conversion, worker, tableRender, edit, memo }
})

test('csv-worker-cancel-new-input-and-stale-delivery', async args => {
  const { page } = args; await openCsv(args); const initial = await co(page).inputValue(), actions = []
  for (const action of ['cancel', 'edit', 'option', 'mode']) {
    await cs(page, 'mode-button', 'jsonToCsv').click(); await ci(page).fill('{"old":"held-' + action + '"}'); await page.evaluate(() => { window.__csvResponseMode = 'hold' }); await cs(page, 'convert').click(); const index = await heldResponse(page)
    if (action === 'cancel') await cs(page, 'cancel').click(); if (action === 'edit') await ci(page).fill('{"new":"typed"}'); if (action === 'option') await cs(page, 'option', 'bom').check(); if (action === 'mode') await cs(page, 'mode-button', 'csvToJson').click()
    await poll(async () => !(await cs(page, 'convert').isDisabled()), 'canceled task settled'); const input = await ci(page).inputValue(); await releaseAll(page); assert.equal(await ci(page).inputValue(), input); assert.equal(await co(page).inputValue(), initial); assert.equal((await workerEvidence(page))[index].terminated, true); actions.push(action)
  }
  await page.evaluate(() => { window.__csvResponseMode = 'native' }); await ci(page).fill('new\n003'); await convert(page); assert.deepEqual(JSON.parse(await co(page).inputValue()), [{ new: '003' }])
  await page.evaluate(() => { window.__csvResponseMode = 'hold' }); await ci(page).fill('old\nunmount'); await cs(page, 'convert').click(); const index = await heldResponse(page)
  await page.keyboard.press('Control+k'); await page.locator('input[aria-controls="search-listbox"]').fill('텍스트 변환'); await page.locator('#search-listbox a[href="/text-converter"]').first().click(); await ci(page).waitFor({ state: 'detached' }); await poll(() => page.evaluate(index => window.__csvWorkers[index].terminated, index), 'unmounted Worker terminated'); await releaseAll(page); assert.equal(await ci(page).count(), 0)
  return { heldNativeWorkerActions: actions, allTerminatedAndCapturedLateResponsesIgnored: true, retryNewConfirmation: true, actualSpaUnmount: true }
})

test('csv-worker-real-decode-fidelity-and-limits', async args => {
  const { page } = args; await openCsv(args, 'csvToJson'); await cs(page, 'option', 'encoding').selectOption('euc-kr'); const euc = Buffer.concat([Buffer.from('name,id\r\n'), Buffer.from('c7d1b1db', 'hex'), Buffer.from(',00123\r\n')]); await uploaded(page, file('actual-euc.csv', euc), 'name,id\r\n한글,00123\r\n'); await convert(page); const eucOutput = await download(page, () => cs(page, 'download').click(), 'worker-euc-kr.json'); assert.deepEqual(JSON.parse(eucOutput.text), [{ name: '한글', id: '00123' }])
  await cs(page, 'option', 'encoding').selectOption('utf-8'); await uploaded(page, file('utf8.csv', '\uFEFFname,note\r\n값,"원문\r\n둘"\r\n'), 'name,note\r\n값,"원문\r\n둘"\r\n'); await convert(page); const utf = await download(page, () => cs(page, 'download').click(), 'worker-utf8.json'); assert.deepEqual(JSON.parse(utf.text), [{ name: '값', note: '원문\r\n둘' }]); const preserved = await ci(page).inputValue()
  await uploaded(page, file('invalid.csv', Buffer.from([0xed, 0xa0, 0x80]))); await cs(page, 'error').getByText(cv('fidelity.encodingFailed'), { exact: true }).waitFor(); assert.equal(await ci(page).inputValue(), preserved)
  const before = (await workerEvidence(page)).length; await uploaded(page, file('oversized.csv', Buffer.alloc(2 * 1024 * 1024 + 1, 97))); await cs(page, 'error').getByText(cv('fidelity.fileLimit'), { exact: true }).waitFor(); assert.equal((await workerEvidence(page)).length, before)
  await cs(page, 'option', 'encoding').selectOption('euc-kr'); const expanded = Buffer.alloc(1400000); for (let index = 0; index < expanded.length; index += 2) { expanded[index] = 0xc7; expanded[index + 1] = 0xd1 }; await uploaded(page, file('expanded.csv', expanded)); await cs(page, 'error').getByText(cv('fidelity.decodedLimit'), { exact: true }).waitFor(); assert.equal(await ci(page).inputValue(), preserved)
  await cs(page, 'option', 'encoding').selectOption('utf-8'); await page.evaluate(() => { window.__csvResponseMode = 'hold' }); await page.locator('#json-csv-file').setInputFiles(file('late-decode.csv', 'old\nlate')); const index = await heldResponse(page); await ci(page).fill('typed\nnewer'); await releaseAll(page); assert.equal(await ci(page).inputValue(), 'typed\nnewer'); assert.equal((await workerEvidence(page))[index].terminated, true)
  const decodes = (await workerEvidence(page)).filter(item => item.requests.at(-1).kind === 'decode'); assert.ok(decodes.every(item => item.requests[0].transferCount === 1 && item.requests[0].byteLengthAfter === 0))
  return { actualUtf8AndEucKrDecoded: true, crLfPreservedInActualJsonFile: true, transferredDecodeRequests: decodes.length, allArrayBuffersDetached: true, oversizedCreatedWorkers: 0, decodedUtf8ExpansionRejected: true, obsoleteDecodeIgnored: true }
})

test('csv-worker-failure-no-main-fallback-and-retry', async args => {
  const { page } = args; await openCsv(args); const prior = await co(page).inputValue(), observed = []
  await page.evaluate(() => { window.__observedWorker = window.Worker; window.Worker = undefined }); await ci(page).fill('{"unsupported":true}'); await cs(page, 'convert').click(); await workerError(page, 'unsupported'); assert.equal((await workerEvidence(page)).length, 0); assert.equal(await co(page).inputValue(), prior)
  await page.evaluate(() => { window.Worker = window.__observedWorker })
  for (const mode of ['postError', 'error', 'messageerror', 'invalid']) { await page.evaluate(mode => { window.__csvResponseMode = mode }, mode); await ci(page).fill(JSON.stringify({ probe: mode })); await cs(page, 'convert').click(); await workerError(page, mode === 'invalid' ? 'invalidResponse' : 'workerFailed'); assert.equal(await co(page).inputValue(), prior); assert.ok(await cs(page, 'download').isDisabled()); assert.equal((await workerEvidence(page)).at(-1).terminated, true); observed.push(mode) }
  await page.evaluate(() => { window.__nativeSetTimeout = window.setTimeout; window.setTimeout = (callback, delay, ...args) => window.__nativeSetTimeout(callback, delay === 30000 ? 100 : delay, ...args); window.__csvResponseMode = 'hold' }); await ci(page).fill('{"timeout":true}'); await cs(page, 'convert').click(); await workerError(page, 'timeout'); await releaseAll(page); assert.equal(await co(page).inputValue(), prior)
  await page.evaluate(() => { window.setTimeout = window.__nativeSetTimeout; window.__csvResponseMode = 'native' }); await ci(page).fill('{"retry":"works"}'); await convert(page); assert.equal(await co(page).inputValue(), 'retry\nworks')
  return { unsupportedCreatedWorkers: 0, controlledPostOrNativeResponseFailures: observed, accelerated30SecondTimeout: true, noSynchronousSuccessFallback: true, allPreviousConfirmedDataPreserved: true, actualWorkerRetrySucceeded: true }
})

test('csv-large-input-and-full-manual-copy-performance', async args => {
  const { page } = args; await openCsv(args); const value = 'x'.repeat(2 * 1024 * 1024 - 40), input = JSON.stringify({ value })
  await beginPerformanceWindow(page, 'near-2MiB native paste into controlled wrap-off input'); await fillText(page, input); const paste = await endPerformanceWindow(page)
  await beginPerformanceWindow(page, 'near-2MiB single-cell Worker + preview'); await convert(page); const conversion = await endPerformanceWindow(page), worker = await latestConversion(page); const expected = 'value\r\n' + value
  const output = await download(page, () => cs(page, 'download').click(), 'near-two-mib-full.csv'); assert.deepEqual(output.bytes, Buffer.from(expected)); await setClipboard(page, 'reject')
  await beginPerformanceWindow(page, 'full manual recovery mount after explicit failed copy'); await cs(page, 'copy').click(); await cs(page, 'copy-recovery').waitFor(); const recovery = await endPerformanceWindow(page), manual = page.locator('#json-csv-manual'); assert.equal((await manual.inputValue()).replace(/\r\n/g, '\n'), expected.replace(/\r\n/g, '\n')); assert.equal(await manual.getAttribute('wrap'), 'off')
  await beginPerformanceWindow(page, 'full manual recovery select'); await button(cs(page, 'copy-recovery'), cv('fidelity.select')).click(); const selection = await endPerformanceWindow(page); assert.deepEqual(await manual.evaluate(node => [node.selectionStart, node.selectionEnd]), [0, (await manual.inputValue()).length])
  await setClipboard(page, 'native'); await beginPerformanceWindow(page, 'native whole result clipboard retry'); await button(cs(page, 'copy-recovery'), cv('fidelity.retry')).click(); await cs(page, 'copy-recovery').waitFor({ state: 'detached' }); const nativeCopy = await endPerformanceWindow(page); assert.equal((await page.evaluate(() => navigator.clipboard.readText())).replace(/\r\n/g, '\n'), expected.replace(/\r\n/g, '\n'))
  await setClipboard(page, 'hold'); await cs(page, 'copy').click(); await poll(() => page.evaluate(() => window.__csvCopyPending.length === 1), 'copy request held'); await ci(page).fill('{"latest":true}'); await page.evaluate(() => window.__csvCopyPending[0].reject(new Error('obsolete rejection'))); await wait(60); assert.equal(await page.evaluate(() => window.__csvFallbackCalls), 0); assert.equal(await cs(page, 'copy-recovery').count(), 0)
  return { inputBytes: Buffer.byteLength(input), outputBytes: output.bytes.length, previewMaximum: 50001, paste, conversion, worker, fullManualRecovery: recovery, fullManualSelection: selection, nativeWholeCopy: nativeCopy, staleCopyExtraFallbacks: 0, note: 'Manual field is intentionally full-size; these timings are separate from bounded normal preview' }
})

test('csv-worker-320-dark-ko-en-navigation', async args => {
  const { page } = args; await openCsv(args); const input = JSON.stringify({ value: '모바일😀'.repeat(15000) }); await fillText(page, input); await convert(page); const workerCount = (await workerEvidence(page)).length
  await cs(page, 'text-page', 'next').focus(); await page.keyboard.press('Enter'); const start = await co(page).getAttribute('data-json-csv-preview-start'), before = await co(page).inputValue(); assert.ok(Number(start) > 0)
  const korean = await mobile(page, [ci(page), co(page)], [cs(page, 'convert'), cs(page, 'text-page', 'previous'), cs(page, 'copy')]); await screenshot(page, 'csv-performance-320-dark-ko', cs(page, 'result'))
  await changeLanguage(page, 'en'); await page.getByText(cv('fidelity.previewHint', 'en'), { exact: true }).waitFor(); assert.equal(await ci(page).inputValue(), input); assert.equal(await co(page).inputValue(), before); assert.equal(await co(page).getAttribute('data-json-csv-preview-start'), start); assert.equal((await workerEvidence(page)).length, workerCount)
  const english = await mobile(page, [ci(page), co(page)], [cs(page, 'text-page', 'first'), cs(page, 'text-page', 'last'), cs(page, 'download')]); await screenshot(page, 'csv-performance-320-dark-en', cs(page, 'result')); await cs(page, 'text-page', 'first').click(); assert.equal(await co(page).getAttribute('data-json-csv-preview-start'), '0')
  return { korean, english, keyboardPreviewNavigation: true, localePreservedInputPageAndResult: true, localeCreatedWorkers: 0 }
}, { width: 320, dark: true })
const prepared = [
  'csv-worker-native-byte-parity-and-separated-timings', 'csv-preview-all-pages-and-unicode-crlf-boundaries',
  'csv-table-1000-cells-memo-and-independent-render-timings', 'csv-worker-cancel-new-input-and-stale-delivery',
  'csv-worker-real-decode-fidelity-and-limits', 'csv-worker-failure-no-main-fallback-and-retry',
  'csv-large-input-and-full-manual-copy-performance', 'csv-worker-320-dark-ko-en-navigation',
]
const productCasesReady = true
if (only === '--list') console.log(prepared.join('\n'))
else {
  assert.ok(productCasesReady, 'CSV Worker parent final readiness is pending; Chrome was not started')
  const selected = cases.filter(item => !only || only.split(',').some(part => item.name.includes(part))); assert.ok(selected.length, 'No selected cases')
  mkdirSync(out, { recursive: true }); const browser = await chromium.launch({ channel: 'chrome' })
  try { for (const scenario of selected) await run(browser, scenario) }
  finally { await browser.close(); const merged = readdirSync(out).filter(name => name.endsWith('-evidence.json')).map(name => JSON.parse(readFileSync(resolve(out, name), 'utf8'))); const final = { checkedAt: new Date().toISOString(), passed: merged.filter(item => item.status === 'pass').length, failed: merged.filter(item => item.status === 'fail').length, browserClosed: true, results: merged }; writeFileSync(resolve(out, 'final-results.json'), JSON.stringify(final, null, 2)); console.log(JSON.stringify({ passed: final.passed, failed: final.failed, browserClosed: true })) }
  if (results.some(item => item.status !== 'pass')) process.exitCode = 1
}



