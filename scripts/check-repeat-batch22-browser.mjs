import { chromium } from 'playwright'
import assert from 'node:assert/strict'
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createHash } from 'node:crypto'
import { PNG } from 'pngjs'
import JSZip from 'jszip'
import { PDFDocument } from 'pdf-lib'

// Independent real-browser checks. --list never starts Chrome; case-name filters
// preserve previous evidence so only changed boundaries need to be rerun.
const base = process.env.VERIFY_BASE_URL || 'http://127.0.0.1:3039'
const out = resolve('docs/verify/2026-11-17-repeat-batch22/browser')
const only = process.argv[2]
const messages = Object.fromEntries(['ko', 'en'].map(language => [language, JSON.parse(readFileSync(`messages/${language}.json`, 'utf8'))]))
const tr = (ns, key, language = 'ko', values = {}) => {
  const value = key.split('.').reduce((object, key) => object?.[key], messages[language][ns])
  assert.equal(typeof value, 'string', `Missing ${language}:${ns}.${key}`)
  return value.replace(/\{(\w+)\}/g, (match, key) => values[key] ?? match)
}
const c = (key, language = "ko", values = {}) => tr("csatGrade", key, language, values)
const ic = (key, language = "ko", values = {}) => tr("imageCompressor", key, language, values)
const button = (scope, name) => scope.getByRole('button', { name, exact: true })
const wait = ms => new Promise(resolve => setTimeout(resolve, ms))
async function poll(predicate, description, attempts = 180) { for (let n = 0; n < attempts; n++) { if (await predicate()) return; await wait(100) }; assert.fail(`Timed out: ${description}`) }
const cases = [], results = []
const test = (name, fn, options = {}) => cases.push({ name, fn, options })

async function run(browser, { name, fn, options }) {
  if (only && !only.split(',').some(part => name.includes(part))) return
  const context = await browser.newContext({ viewport: { width: options.width ?? 1280, height: 900 }, timezoneId: 'Asia/Seoul', serviceWorkers: 'block', permissions: ['clipboard-read', 'clipboard-write'], acceptDownloads: true })
  const errors = [], hydration = [], external = [], consoleErrors = []
  await context.addInitScript(options => {
    if (!/^https?:$/.test(location.protocol)) return
    if (!localStorage.getItem('__batch22Seeded')) { localStorage.setItem('language', options.language ?? 'ko'); localStorage.setItem('theme', options.dark ? 'dark' : 'light'); localStorage.setItem('__batch22Seeded', '1') }
    window.__unhandled = []; addEventListener('unhandledrejection', event => window.__unhandled.push(String(event.reason)))

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
  const watchdog = setTimeout(() => { void context.close().catch(() => {}) }, 120000)
  try { detail = await fn({ page, context, open }) ?? {}; assert.deepEqual(errors, [], 'JS page errors'); assert.deepEqual(hydration, [], 'Hydration errors'); for (const active of context.pages()) assert.deepEqual(await active.evaluate(() => window.__unhandled), [], 'Unhandled rejections'); assert.doesNotMatch(await page.locator('body').innerText(), /\b(?:csatGrade|imageCompressor)\.[a-zA-Z][\w.]+/, 'Raw translation key') }
  catch (cause) { status = 'fail'; error = cause.stack ?? String(cause); await page.screenshot({ path: resolve(out, `${name}-failure.png`), caret: 'initial' }).catch(() => {}); writeFileSync(resolve(out, `${name}-failure.txt`), `${error}\n\n${await page.locator('body').innerText().catch(() => '')}`) }
  const result = { name, status, checkedAt: new Date().toISOString(), ...detail, error, errors, hydration, consoleErrors, external: [...new Set(external)] }
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

const goalKey = 'toolhub-csat-goals-v1', recordKey = 'toolhub-csat-score-records-v1'
const goal = (id = 'g2', areas = 2, maxSum = 3) => ({ id, name: `${areas}개 영역 목표`, areas, maxSum, createdAt: '2026-11-17T00:00:00.000Z', updatedAt: '2026-11-17T00:00:00.000Z' })
const goalEnvelope = goals => ({ version: 1, revision: 'browser-verification', goals })
const scores = { kor: '85', math: '85', eng: '90', hist: '40', inq1: '44', inq2: '45' }
const query = (patch = {}) => '?' + new URLSearchParams({ ...scores, korSel: 'lm', mathSel: 'calc', inq1Type: 'society', inq2Type: 'ethics', ...patch })
const recordBytes = JSON.stringify({ version: 1, revision: 'byte-preservation', records: [{ id: 'old-record', name: '기존 원점수 기록', createdAt: '2026-11-17T00:00:00.000Z', snapshot: { examYear: 2027, referenceYear: 2026, scores: { ...scores, eng: '' }, selection: { kor: 'lm', math: 'calc', inq1: 'society', inq2: 'ethics' } } }] }, null, 2)
const direct = page => page.locator('[data-csat-direct-grades]')
const grade = (page, field) => page.locator(`[data-direct-grade="${field}"]`)
const directRow = (page, id = 'g2') => page.locator(`[data-direct-goal="${id}"]`)
const goalPanel = page => page.locator('section[aria-labelledby="csat-goals-title"]')
const gb = (page, key) => button(goalPanel(page), c(`goals.${key}`))
const rawRow = (page, field) => page.locator(`[data-csat-score-field="${field}"]`)
const avg = (page, type = 'all') => page.locator(`[data-csat-average="${type}"]`)
const heroGrade = (page, field) => page.locator(`[data-csat-hero-grade="${field}"]`)
async function rawState(page) { return page.evaluate(key => ({ query: location.search, record: localStorage.getItem(key), fields: Object.fromEntries([...document.querySelectorAll('[data-csat-score-field] input')].map(node => [node.id, node.value])) }), recordKey) }
async function directState(page) { return direct(page).locator('select').evaluateAll(nodes => nodes.map(node => [node.dataset.directGrade ?? node.dataset.directInquiry, node.value])) }
async function openCsat(args, goals = [goal()], url = query()) {
  await args.context.addInitScript(({ key, recordKey, recordBytes, value }) => { if (!/^https?:$/.test(location.protocol)) return; if (!localStorage.getItem('__csat22')) { localStorage.setItem(key, JSON.stringify(value)); localStorage.setItem(recordKey, recordBytes); localStorage.setItem('__csat22', '1') } }, { key: goalKey, recordKey, recordBytes, value: goalEnvelope(goals) })
  await args.open('csat-grade', url); await poll(async () => await goalPanel(args.page).getByText(c('goals.loading'), { exact: true }).count() === 0 && new URL(args.page.url()).searchParams.has('kor'), 'CSAT restored')
}
async function openDirect(page, language = 'ko') { await button(direct(page), c('directGrades.open', language)).click(); await grade(page, 'kor').waitFor() }
async function ds(page, status, id = 'g2') { await poll(async () => await directRow(page, id).getAttribute('data-direct-status') === status, `direct ${id} ${status}`) }
async function draftGoal(page, name, areas = 2, max = 3) { await page.locator('#csat-goal-name').fill(name); await page.locator('#csat-goal-areas').selectOption(String(areas)); await page.locator('#csat-goal-max').fill(String(max)) }
async function saveGoal(page, kind = 'save') { await gb(page, kind).click(); await gb(page, `confirm.${kind}Action`).click(); await poll(async () => await goalPanel(page).getByRole('alertdialog').count() === 0, 'goal action settled') }
async function fillRaw(page, values) { for (const [key, value] of Object.entries(values)) await page.locator(`#csat-${key}`).fill(value) }
async function captureCanvas(context) { await context.addInitScript(() => { window.__canvasTexts = []; const original = CanvasRenderingContext2D.prototype.fillText; CanvasRenderingContext2D.prototype.fillText = function(text, x, y) { window.__canvasTexts.push({ text: String(text), x, y, width: this.canvas.width, height: this.canvas.height }); return original.apply(this, arguments) }; Object.defineProperty(navigator, 'canShare', { configurable: true, value: () => false }); Object.defineProperty(navigator, 'share', { configurable: true, value: async data => { window.__shared = data } }) }) }

test('csat-direct-validity-inquiry-and-raw-isolation', async args => {
  const { page } = args; await openCsat(args, [goal(), goal('g4', 4, 10)]); const before = await rawState(page); await openDirect(page)
  assert.deepEqual((await directState(page)).map(item => item[1]), ['', '', '', '', '', '', '']); await ds(page, 'needsInput'); await grade(page, 'kor').selectOption('1'); await ds(page, 'needsInput'); await grade(page, 'math').selectOption('2'); await ds(page, 'within'); await grade(page, 'math').selectOption('3'); await ds(page, 'over')
  await grade(page, 'eng').selectOption('4'); await grade(page, 'inq1').selectOption('1'); await ds(page, 'needsInput', 'g4'); await directRow(page, 'g4').getByText(c('directGrades.subjectRequired', 'ko', { fields: c('u.inq1') }), { exact: true }).waitFor()
  await page.locator('[data-direct-inquiry="inq1"]').selectOption('society'); await ds(page, 'within', 'g4'); await grade(page, 'inq2').selectOption('2'); await page.locator('[data-direct-inquiry="inq2"]').selectOption('ethics'); await ds(page, 'within', 'g4'); assert.equal(await directRow(page, 'g4').locator('[data-direct-used]').count(), 4); assert.equal(await directRow(page, 'g4').locator('[data-direct-used="inq1"]').count(), 1)
  await page.locator('[data-direct-inquiry="inq2"]').selectOption('society'); await ds(page, 'needsInput', 'g4'); await directRow(page, 'g4').getByText(c('directGrades.inquiryConflict'), { exact: true }).waitFor(); await grade(page, 'inq2').selectOption('1'); await ds(page, 'within', 'g4'); await directRow(page, 'g4').getByText(c('goals.duplicateInquiry'), { exact: true }).waitFor(); assert.deepEqual(await rawState(page), before)
  const options = await grade(page, 'kor').locator('option').evaluateAll(nodes => nodes.map(node => node.value)); assert.deepEqual(options, ['', ...Array.from({ length: 9 }, (_, i) => String(i + 1))]); await button(direct(page), c('directGrades.reset')).click(); await ds(page, 'needsInput'); assert.deepEqual(await rawState(page), before)
  return { rawFormQueryAndRecordBytesPreserved: true, optionAllowlist: options, inputScenarios: ['blank', 'partial', 'equal-boundary', 'over', 'missing-subject', 'best-one-inquiry', 'same-subject-conflict', 'same-subject-equal', 'reset'] }
})

test('csat-direct-goal-crud-other-tab-and-refresh', async args => {
  const { page, context, open } = args; await openCsat(args); await openDirect(page); await grade(page, 'kor').selectOption('2'); await grade(page, 'math').selectOption('3'); const input = await directState(page), before = await rawState(page)
  await draftGoal(page, '직접 비교용', 2, 5); await saveGoal(page); const saved = await page.evaluate(key => JSON.parse(localStorage.getItem(key)).goals.find(item => item.name === '직접 비교용'), goalKey); await ds(page, 'within', saved.id)
  await button(page.locator(`[data-csat-goal-id="${saved.id}"]`), c('goals.editAria', 'ko', { name: saved.name })).click(); await page.locator('#csat-goal-max').fill('4'); await saveGoal(page, 'update'); await ds(page, 'over', saved.id); assert.deepEqual(await directState(page), input)
  await button(page.locator(`[data-csat-goal-id="${saved.id}"]`), c('goals.deleteAria', 'ko', { name: saved.name })).click(); await gb(page, 'confirm.deleteAction').click(); await directRow(page, saved.id).waitFor({ state: 'detached' }); assert.deepEqual(await directState(page), input)
  const second = await context.newPage(); await open('csat-grade', '', second); await poll(async () => await goalPanel(second).getByText(c('goals.loading'), { exact: true }).count() === 0, 'second goals ready'); await draftGoal(second, '다른 탭 새 목표', 2, 5); await saveGoal(second)
  await direct(page).getByText(c('directGrades.blocked'), { exact: true }).waitFor(); assert.deepEqual(await directState(page), input); assert.equal(await directRow(page).count(), 0); await gb(page, 'refresh').click(); await ds(page, 'over'); assert.equal(await direct(page).locator('[data-direct-goal]').count(), 2); assert.deepEqual(await directState(page), input); assert.deepEqual(await rawState(page), before); await second.close()
  return { goalCrudReflected: true, realOtherTabConflictPausedComparison: true, directInputsPreserved: input, rawBytesPreserved: true }
})

test('csat-raw-empty-zero-invalid-and-query-restoration', async args => {
  const { page, open } = args; const observed = []; await openCsat(args, [goal()], query({ kor: '' }))
  for (const [value, state, label] of [['', 'missing', c('rawSummary.missing')], ['0', 'valid', '9'], ['abc', 'invalid', c('rawSummary.invalid')], ['-1', 'invalid', c('rawSummary.invalid')], ['84.5', 'invalid', c('rawSummary.invalid')]]) {
    await open('csat-grade', query({ kor: value })); await poll(async () => await rawRow(page, 'kor').getAttribute('data-csat-score-state') === state && new URL(page.url()).searchParams.get('kor') === value, `raw ${value} restored`); assert.equal(await heroGrade(page, 'kor').innerText(), label); assert.equal(await page.locator('#csat-grade-cut-table tbody tr.bg-primary-soft').count(), state === 'valid' ? 1 : 0); assert.equal(await page.evaluate(key => localStorage.getItem(key), recordKey), recordBytes); observed.push({ value, state, hero: label, dom: await page.locator('#csat-kor').inputValue(), url: new URL(page.url()).searchParams.get('kor') })
  }
  await open('csat-grade', '?math=85'); await poll(async () => await page.locator('#csat-kor').inputValue() === '84', 'absent keeps legacy default'); await open('csat-grade', '?subject=english&score='); await poll(async () => await rawRow(page, 'eng').getAttribute('data-csat-score-state') === 'missing', 'legacy empty remains missing'); await open('csat-grade', '?subject=english&score=0'); await poll(async () => await heroGrade(page, 'eng').innerText() === '9', 'legacy zero remains valid')
  return { observed, absentDefault: 84, legacyEmptyAndZeroPreserved: true, note: 'Native number inputs display invalid alphabetic/fractional raw strings according to browser rules; query and status are independently asserted.' }
})

test('csat-real-share-png-and-missing-zero-invalid-text', async args => {
  const { page, context } = args; await captureCanvas(context); await openCsat(args, [goal()], query({ kor: 'abc' })); await openDirect(page); await grade(page, 'kor').selectOption('1'); await grade(page, 'math').selectOption('1'); const artifacts = []
  for (const [value, expected] of [['abc', c('rawSummary.invalid')], ['', c('rawSummary.missing')], ['0', '9등급']]) {
    if (value !== 'abc') { if (value === '') await page.locator('#csat-kor').fill('1'); await page.locator('#csat-kor').fill(value) }; await poll(async () => new URL(page.url()).searchParams.get('kor') === value, 'share query synced'); await page.evaluate(() => { window.__canvasTexts = []; window.__shared = null }); const tag = value === 'abc' ? 'invalid' : value === '' ? 'missing' : 'zero'
    const file = await download(page, () => button(page, tr('shareResult', 'save')).click(), `csat-raw-${tag}.png`); assert.equal(file.bytes.toString('ascii', 1, 4), 'PNG'); assert.equal(file.bytes.readUInt32BE(16), 1080); assert.equal(file.bytes.readUInt32BE(20), 1350)
    const drawn = await page.evaluate(() => window.__canvasTexts.filter(item => item.width === 1080 && item.height === 1350)); const text = drawn.map(item => item.text).join('\n'); assert.ok(text.includes(expected), `${tag} PNG text: ${text}`); assert.match(text, /2026/); assert.match(text, /2027/); assert.doesNotMatch(text, /직접 입력|직접 등급|2개 영역 목표/); if (value === '') assert.doesNotMatch(text, /9등급|(?:^|\D)0점/)
    await button(page, tr('shareResult', 'share')).click(); await poll(() => page.evaluate(() => !!window.__shared), 'share metadata delivered'); const share = await page.evaluate(() => window.__shared); assert.equal(new URL(share.url).searchParams.get('kor'), value); assert.match(share.text, /2026/); assert.match(share.text, /2027/); assert.doesNotMatch(share.text, /직접 입력|직접 등급/); if (value === 'abc') assert.ok(share.text.includes(c('rawSummary.checkInput'))); if (value === '') assert.ok(share.text.includes(c('rawSummary.needsInput')))
    writeFileSync(resolve(out, `csat-raw-${tag}-canvas.json`), JSON.stringify({ drawn, share }, null, 2)); artifacts.push({ name: file.filename, tag, bytes: file.bytes.length, dimensions: [1080, 1350], share })
  }
  assert.equal(await page.evaluate(key => localStorage.getItem(key), recordKey), recordBytes); return { artifacts, actualCanvasAndPng: true, nativeShareUi: 'controlled navigator.share receiver; no external share sent', directGradesExcluded: true }
})

test('csat-complete-averages-english-history-and-inquiry-conflict', async args => {
  const { page } = args; await openCsat(args); assert.equal(await avg(page).innerText(), c('u.gradeN', 'ko', { g: '1.00' })); assert.match(await avg(page, 'noEnglish').innerText(), /1\.00/); await fillRaw(page, { hist: '' }); assert.equal(await avg(page).innerText(), c('u.gradeN', 'ko', { g: '1.00' })); assert.match(await avg(page, 'noEnglish').innerText(), /1\.00/); await fillRaw(page, { eng: '' }); assert.equal(await avg(page).innerText(), c('rawSummary.needsInput')); assert.match(await avg(page, 'noEnglish').innerText(), /1\.00/); await fillRaw(page, { eng: '90', inq1: '44', inq2: '45' })
  await page.getByRole('combobox', { name: c('u.selectAria', 'ko', { s: c('u.inq2') }), exact: true }).selectOption('society'); assert.equal(await heroGrade(page, 'inq1').innerText(), '1'); assert.equal(await heroGrade(page, 'inq2').innerText(), '1'); assert.equal(await avg(page).innerText(), c('rawSummary.checkInput')); assert.ok((await avg(page, 'noEnglish').innerText()).includes(c('rawSummary.checkInput'))); await fillRaw(page, { inq2: '44' }); assert.equal(await avg(page).innerText(), c('u.gradeN', 'ko', { g: '1.00' })); await page.getByText(c('goals.duplicateInquiry'), { exact: true }).first().waitFor(); return { completeAverage: '1.00', historyMissingDoesNotBlock: true, englishMissingBlocksOnlyFull: true, inquiryDifferentRawSameGradeBlocked: true, sameRawDuplicateOriginalAveragePreserved: true }
})

test('csat-direct-anchor-collapse-320-dark-english', async args => {
  const { page } = args; await openCsat(args); const raw = await rawState(page); const anchor = page.locator('#csat-grade-context a[href="#csat-direct-grade-panel"]'); await anchor.click(); await poll(async () => { const box = await direct(page).boundingBox(); return box.y >= 0 && box.y < 900 }, 'direct anchor visible'); await openDirect(page); await grade(page, 'kor').selectOption('2'); await grade(page, 'math').selectOption('1'); const input = await directState(page); await button(direct(page), c('directGrades.close')).click(); await openDirect(page); assert.deepEqual(await directState(page), input); await changeLanguage(page, 'en'); await button(direct(page), c('directGrades.close', 'en')).waitFor(); assert.deepEqual(await directState(page), input); const geometry = await mobile(page, [grade(page, 'kor'), page.locator('[data-direct-inquiry="inq1"]')], [button(direct(page), c('directGrades.close', 'en')), button(direct(page), c('directGrades.reset', 'en'))]); await screenshot(page, 'csat-direct-english-320-dark', direct(page)); assert.deepEqual(await rawState(page), raw); return { geometry, anchorVisible: true, collapseAndLanguageKeepInputs: input }
}, { width: 320, dark: true })

const fixtureDir = resolve(out, 'fixtures')
function pngFixture(name, rgb, noise = false) {
  mkdirSync(fixtureDir, { recursive: true }); const path = resolve(fixtureDir, name); if (!readdirSync(fixtureDir).includes(name)) { const png = new PNG({ width: 640, height: 480 }); let seed = 123456
    for (let i = 0; i < png.data.length; i += 4) { for (let ch = 0; ch < 3; ch++) { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; png.data[i + ch] = noise ? seed >>> 24 : rgb[ch] }; png.data[i + 3] = 255 }; writeFileSync(path, PNG.sync.write(png)) }; return readFileSync(path)
}
const imageFile = (name, color = 'red') => ({ name, mimeType: 'image/png', buffer: pngFixture(`${color}.png`, { red: [220, 20, 30], green: [20, 200, 40], blue: [20, 30, 220], yellow: [230, 210, 30], noise: [0, 0, 0] }[color], color === 'noise') })
const imageRows = page => page.locator('[data-image-row]')
const imageRow = (page, n) => imageRows(page).nth(n)
const imageAction = (page, action) => page.locator(`[data-image-action="${action}"]`)
async function done(page, count) { await poll(async () => await page.locator('[data-image-row][data-image-status="done"]').count() === count && await page.locator('[data-image-status="processing"]').count() === 0, `${count} compression outputs ready`, 400) }
async function imageObserve(context) {
  await context.addInitScript(() => {
    window.__imageTasks = []; window.__activeImages = 0; window.__maxImages = 0; window.__heldBitmaps = []; window.__holdBitmap = false; window.__encodeCalls = []; window.__failImages = []; window.__zipReads = []; window.__zipMode = 'normal'; window.__objects = []
    const nativeBitmap = window.createImageBitmap.bind(window); window.__nativeBitmap = nativeBitmap
    window.createImageBitmap = async function(source, ...rest) {
      if (!(source instanceof File)) return nativeBitmap(source, ...rest)
      const task = { name: source.name, closed: false }; window.__imageTasks.push(task); window.__activeImages++; window.__maxImages = Math.max(window.__maxImages, window.__activeImages)
      let bitmap; try { bitmap = await nativeBitmap(source, ...rest) } catch (error) { window.__activeImages--; throw error }
      bitmap.__sourceName = source.name; const close = bitmap.close.bind(bitmap); bitmap.close = () => { if (!task.closed) { task.closed = true; window.__activeImages-- }; return close() }
      if (window.__holdBitmap) await new Promise(resolve => window.__heldBitmaps.push(resolve)); return bitmap
    }
    window.__releaseBitmaps = () => { window.__holdBitmap = false; for (const resolve of window.__heldBitmaps.splice(0)) resolve() }
    for (const prototype of [CanvasRenderingContext2D.prototype, typeof OffscreenCanvasRenderingContext2D === 'undefined' ? null : OffscreenCanvasRenderingContext2D.prototype].filter(Boolean)) { const draw = prototype.drawImage; prototype.drawImage = function(source, ...rest) { this.canvas.__sourceName = source.__sourceName; return draw.call(this, source, ...rest) } }
    if (window.OffscreenCanvas) { const convert = OffscreenCanvas.prototype.convertToBlob; OffscreenCanvas.prototype.convertToBlob = function(options) { if (this.__sourceName) window.__encodeCalls.push({ name: this.__sourceName, width: this.width, height: this.height, ...options }); if (window.__failImages.includes(this.__sourceName)) return Promise.reject(new DOMException('Injected encoder rejection', 'EncodingError')); return convert.call(this, options) } }
    const toBlob = HTMLCanvasElement.prototype.toBlob; HTMLCanvasElement.prototype.toBlob = function(callback, ...rest) { if (this.__sourceName) window.__encodeCalls.push({ name: this.__sourceName, width: this.width, height: this.height, type: rest[0] }); if (window.__failImages.includes(this.__sourceName)) { queueMicrotask(() => callback(null)); return }; return toBlob.call(this, callback, ...rest) }
    const read = FileReader.prototype.readAsArrayBuffer; FileReader.prototype.readAsArrayBuffer = function(blob) { if (!(blob instanceof File) && /^image\//.test(blob.type) && window.__zipMode !== 'normal') { const task = { type: blob.type, bytes: blob.size, mode: window.__zipMode }; window.__zipReads.push(task); if (window.__zipMode === 'fail') { Object.defineProperty(this, 'error', { configurable: true, value: new DOMException('Injected ZIP Blob read failure', 'NotReadableError') }); queueMicrotask(() => this.dispatchEvent(new ProgressEvent('error'))); return }; task.release = () => read.call(this, blob); return }; return read.call(this, blob) }
    window.__releaseZip = () => { window.__zipMode = 'normal'; for (const item of window.__zipReads) { if (item.release) { item.release(); delete item.release } } }
    const create = URL.createObjectURL.bind(URL), revoke = URL.revokeObjectURL.bind(URL); URL.createObjectURL = blob => { const url = create(blob); window.__objects.push({ url, size: blob.size, type: blob.type, revoked: false }); return url }; URL.revokeObjectURL = url => { const item = window.__objects.find(item => item.url === url); if (item) item.revoked = true; return revoke(url) }
  })
}
async function imageEvidence(page) { return page.evaluate(() => ({ nativeTasks: window.__imageTasks, maximumActive: window.__maxImages, active: window.__activeImages, encodes: window.__encodeCalls, objectUrls: window.__objects, zipReads: window.__zipReads.map(({ type, bytes, mode }) => ({ type, bytes, mode })) })) }
async function prepareImages(args, language = 'ko') { await imageObserve(args.context); await args.open('image-compressor'); await args.page.locator('[data-image-format="jpeg"]').click(); await args.page.getByRole('spinbutton', { name: ic('sideCustom', language), exact: true }).fill('320') }
async function imageInfo(page, bytes, type) { return page.evaluate(async ({ bytes, type }) => { const blob = new Blob([new Uint8Array(bytes)], { type }); const bitmap = await (window.__nativeBitmap ?? window.createImageBitmap)(blob); const canvas = new OffscreenCanvas(bitmap.width, bitmap.height); const ctx = canvas.getContext('2d'); ctx.drawImage(bitmap, 0, 0); const result = { width: bitmap.width, height: bitmap.height, type: blob.type, pixel: [...ctx.getImageData(4, 4, 1, 1).data] }; bitmap.close(); return result }, { bytes: [...bytes], type }) }
async function inspectZip(page, artifact) { const zip = await JSZip.loadAsync(artifact.bytes); const entries = []; for (const file of Object.values(zip.files).filter(file => !file.dir)) { const bytes = await file.async('nodebuffer'); const mime = /\.png$/i.test(file.name) ? 'image/png' : 'image/jpeg'; entries.push({ name: file.name, bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex'), ...(await imageInfo(page, bytes, mime)) }) }; assert.equal(new Set(entries.map(item => item.name.toLocaleLowerCase())).size, entries.length); return entries }
async function navigateSpa(page, slug, search) { await page.keyboard.press('Control+k'); await page.locator('input[aria-controls="search-listbox"]').fill(search); await page.locator(`#search-listbox a[href="/${slug}"]`).first().click(); await page.waitForURL(url => url.pathname.replace(/\/$/, '') === `/${slug}`); await page.locator('main h1').waitFor() }

test('image-real-pixels-quality-target-and-output', async args => {
  const { page } = args; await prepareImages(args); await page.locator('[data-image-input]').setInputFiles(imageFile('noise.png', 'noise')); await done(page, 1); const quality = await download(page, () => imageRow(page, 0).locator('[data-image-download]').click(), 'compressed-quality.jpg'); assert.equal(quality.bytes.readUInt16BE(0), 0xffd8); const qualityInfo = await imageInfo(page, quality.bytes, 'image/jpeg'); assert.equal(qualityInfo.width, 320); assert.equal(qualityInfo.height, 240)
  await button(page, ic('modeTarget')).click(); await page.getByRole('spinbutton', { name: ic('targetCustom'), exact: true }).first().fill('20'); await page.getByRole('spinbutton', { name: ic('sideCustom'), exact: true }).last().fill('640'); await done(page, 1); const target = await download(page, () => imageRow(page, 0).locator('[data-image-download]').click(), 'compressed-target-20kb.jpg'); assert.ok(target.bytes.length <= 20480, `target ${target.bytes.length}`); const targetInfo = await imageInfo(page, target.bytes, 'image/jpeg'); assert.ok(targetInfo.width <= 640 && targetInfo.height <= 480); const evidence = await imageEvidence(page); assert.equal(evidence.maximumActive, 1); assert.equal(evidence.active, 0); return { sourceBytes: imageFile('noise.png', 'noise').buffer.length, quality: { bytes: quality.bytes.length, ...qualityInfo }, target: { bytes: target.bytes.length, ...targetInfo }, ...evidence }
})

test('image-pause-resume-settings-and-single-active-task', async args => {
  const { page } = args; await prepareImages(args); await page.evaluate(() => { window.__holdBitmap = true }); await page.locator('[data-image-input]').setInputFiles([imageFile('pause.png'), imageFile('second.png', 'green')]); await poll(() => page.evaluate(() => window.__heldBitmaps.length === 1), 'native bitmap completion held'); await imageAction(page, 'pause').click(); await page.getByText(ic('queue.pausing'), { exact: false }).waitFor(); await page.locator('[data-image-input]').setInputFiles(imageFile('added-paused.png', 'blue')); await page.locator('[data-image-format="png"]').click(); await page.getByRole('spinbutton', { name: ic('sideCustom'), exact: true }).fill('160'); assert.equal(await page.locator('[data-image-download]').count(), 0); await wait(150); assert.equal(await page.evaluate(() => window.__imageTasks.length), 1)
  await imageAction(page, 'resume').click(); await wait(150); assert.equal(await page.evaluate(() => window.__imageTasks.length), 1); await page.evaluate(() => window.__releaseBitmaps()); await done(page, 3); const evidence = await imageEvidence(page); assert.equal(evidence.maximumActive, 1); assert.equal(evidence.active, 0); assert.equal(evidence.nativeTasks.length, 4); assert.ok(evidence.nativeTasks.every(item => item.closed)); const file = await download(page, () => imageRow(page, 0).locator('[data-image-download]').click(), 'resumed-current-settings.png'); const info = await imageInfo(page, file.bytes, 'image/png'); assert.equal(info.width, 160); assert.equal(info.height, 120); return { ...evidence, finalOutput: info, pausedAddAndSettingsStayedPaused: true, canceledNativeTaskSettledBeforeNext: true }
})

test('image-failure-only-retry-success-reuse-and-delete', async args => {
  const { page } = args; await prepareImages(args); await page.evaluate(() => { window.__failImages = ['failed.png'] }); await page.locator('[data-image-input]').setInputFiles([imageFile('success.png'), imageFile('failed.png', 'green')]); await poll(async () => await page.locator('[data-image-status="done"]').count() === 1 && await page.locator('[data-image-status="error"]').count() === 1, 'one real success one injected encoder failure'); const before = await imageEvidence(page); await imageAction(page, 'pause').click(); await page.evaluate(() => { window.__failImages = [] }); await imageAction(page, 'retry').click(); await wait(180); assert.equal(await page.evaluate(() => window.__imageTasks.length), before.nativeTasks.length); await imageAction(page, 'resume').click(); await done(page, 2); let evidence = await imageEvidence(page); assert.equal(evidence.nativeTasks.filter(task => task.name === 'success.png').length, 1); assert.equal(evidence.nativeTasks.filter(task => task.name === 'failed.png').length, 2)
  await page.evaluate(() => { window.__holdBitmap = true }); await page.locator('[data-image-input]').setInputFiles(imageFile('delete-late.png', 'blue')); await poll(() => page.evaluate(() => window.__heldBitmaps.length === 1), 'deleted file held'); await imageRow(page, 2).locator('[data-image-remove]').click(); await page.evaluate(() => window.__releaseBitmaps()); await poll(() => page.evaluate(() => window.__activeImages === 0), 'deleted native decode closed'); assert.equal(await imageRows(page).count(), 2); await imageAction(page, 'clear').click(); assert.equal(await imageRows(page).count(), 0); evidence = await imageEvidence(page); assert.ok(evidence.objectUrls.filter(item => /^image\//.test(item.type)).every(item => item.revoked)); assert.equal(evidence.maximumActive, 1); return { ...evidence, successNotReencoded: true, pausedRetryDidNotResume: true, lateDeleteNotRestored: true }
})

test('image-zip-fixed-snapshot-bytes-and-names', async args => {
  const { page } = args; await prepareImages(args); await page.locator('[data-image-input]').setInputFiles([imageFile('a.png'), imageFile('a.png', 'green'), imageFile('a (2).png', 'blue'), imageFile('A.png', 'yellow')]); await done(page, 4); const originals = []; for (let n = 0; n < 4; n++) { const file = await download(page, () => imageRow(page, n).locator('[data-image-download]').click(), `zip-source-${n}.jpg`); originals.push(createHash('sha256').update(file.bytes).digest('hex')) }
  await page.evaluate(() => { window.__zipMode = 'hold' }); const pending = page.waitForEvent('download'); await page.locator('[data-image-zip]').click(); await poll(() => page.evaluate(() => window.__zipReads.length === 4), 'ZIP snapshot Blob reads held'); await imageAction(page, 'pause').click(); await page.locator('[data-image-format="png"]').click(); await imageRow(page, 0).locator('[data-image-remove]').click(); assert.equal(await page.locator('[data-image-download]').count(), 0); await page.evaluate(() => window.__releaseZip()); const file = await pending; const path = resolve(out, 'compressed-fixed-snapshot.zip'); await file.saveAs(path); const entries = await inspectZip(page, { bytes: readFileSync(path) }); assert.equal(entries.length, 4); assert.deepEqual(entries.map(item => item.sha256).sort(), originals.sort()); assert.ok(entries.every(item => item.width === 320 && item.height === 240 && item.type === 'image/jpeg')); return { entries, clickSnapshotSurvivedSettingsAndDeletion: true, originalCount: 4, currentRows: await imageRows(page).count(), ...(await imageEvidence(page)) }
})

test('image-zip-failure-new-request-and-unmount', async args => {
  const { page } = args; await prepareImages(args); await page.locator('[data-image-input]').setInputFiles([imageFile('a.png'), imageFile('b.png', 'blue')]); await done(page, 2); await page.evaluate(() => { window.__zipMode = 'fail' }); await page.locator('[data-image-zip]').click(); await page.locator('[data-image-queue-controls]').getByRole('alert').waitFor(); assert.equal(await page.locator('[data-image-status="done"]').count(), 2)
  await page.evaluate(() => { window.__zipMode = 'hold'; window.__zipReads = [] }); await page.locator('[data-image-zip]').click(); await poll(() => page.evaluate(() => window.__zipReads.length === 2), 'old ZIP pending'); await page.evaluate(() => { window.__zipMode = 'normal' }); const current = await download(page, () => page.locator('[data-image-zip]').click(), 'compressed-retry.zip'); const entries = await inspectZip(page, current); assert.equal(entries.length, 2); let lateDownloads = 0; page.on('download', () => lateDownloads++); await page.evaluate(() => window.__releaseZip()); await wait(350); assert.equal(lateDownloads, 0)
  await page.evaluate(() => { window.__zipMode = 'hold'; window.__zipReads = [] }); await page.locator('[data-image-zip]').click(); await poll(() => page.evaluate(() => window.__zipReads.length === 2), 'unmount ZIP pending'); await page.evaluate(() => { window.__holdBitmap = true }); await page.locator('[data-image-input]').setInputFiles(imageFile('unmount.png', 'green')); await poll(() => page.evaluate(() => window.__heldBitmaps.length === 1), 'unmount decode pending'); await navigateSpa(page, 'text-converter', '텍스트 변환'); await page.evaluate(() => { window.__releaseZip(); window.__releaseBitmaps() }); await poll(() => page.evaluate(() => window.__activeImages === 0), 'unmounted native bitmap closed'); await wait(300); assert.equal(lateDownloads, 0); const evidence = await imageEvidence(page); assert.ok(evidence.nativeTasks.every(item => item.closed)); assert.ok(evidence.objectUrls.filter(item => /^image\//.test(item.type)).every(item => item.revoked)); return { ...evidence, zipErrorRecovered: true, newZipEntries: entries, oldZipAndUnmountDownloads: lateDownloads }
})

test('image-shared-name-converter-resizer-and-pdf-regression', async args => {
  const { page, open } = args; await open('image-converter'); await button(page, 'JPG').click(); await page.locator('main input[type="file"]').setInputFiles([imageFile('a.png'), imageFile('a.png', 'green'), imageFile('a (2).png', 'blue'), imageFile('A.png', 'yellow')]); const converterZip = button(page, tr('imageConverter', 'downloadZip', 'ko', { n: 4 })); await converterZip.waitFor(); const converted = await download(page, () => converterZip.click(), 'converter-name-collisions.zip'); const entries = await inspectZip(page, converted); assert.equal(entries.length, 4); assert.ok(entries.some(item => item.name === 'a (2).jpg')); assert.equal(entries.find(item => item.name === 'a (2).jpg').pixel[2] > 180, true); assert.ok(entries.every(item => item.width === 640 && item.height === 480));
  await open('image-resizer'); await page.locator('#ir-w').fill('160'); await page.locator('#ir-h').fill('120'); await page.locator('main input[type="file"]').first().setInputFiles([imageFile('same.png'), imageFile('same.png', 'green')]); const resized = await download(page, async () => { const zip = button(page, tr('imageResizer', 'downloadZip', 'ko', { n: 2 })); await zip.waitFor(); await zip.click() }, 'resizer-regression.zip'); const resizedEntries = await inspectZip(page, resized); assert.equal(resizedEntries.length, 2); assert.ok(resizedEntries.every(item => item.width === 160 && item.height === 120));
  const pdf = await PDFDocument.create(); pdf.addPage([200, 300]); pdf.addPage([300, 400]); await open('pdf-tools'); await page.getByRole('tab', { name: tr('pdfTools', 'tabs.split'), exact: true }).click(); await page.locator('main input[type="file"]').first().setInputFiles({ name: 'pages.pdf', mimeType: 'application/pdf', buffer: Buffer.from(await pdf.save()) }); await page.locator('#pdf-range').fill('1,1,2'); await page.getByRole('checkbox', { name: tr('pdfTools', 'split.separate'), exact: true }).check(); await button(page, tr('pdfTools', 'split.button')).click(); const link = page.locator('main a[download]'); await link.waitFor(); const split = await download(page, () => link.click(), 'pdf-split-regression.zip'); const archive = await JSZip.loadAsync(split.bytes); const pdfEntries = []; for (const item of Object.values(archive.files).filter(item => !item.dir)) { const bytes = await item.async('uint8array'); const doc = await PDFDocument.load(bytes); pdfEntries.push({ name: item.name, pages: doc.getPageCount(), size: doc.getPage(0).getSize() }) }; assert.equal(new Set(pdfEntries.map(item => item.name.toLowerCase())).size, pdfEntries.length); assert.ok(pdfEntries.length >= 2); assert.ok(pdfEntries.every(item => item.pages === 1)); return { converter: entries, resizer: resizedEntries, pdf: pdfEntries }
})

test('image-queue-320-dark-english', async args => {
  const { page } = args; await prepareImages(args, 'en'); await page.locator('[data-image-input]').setInputFiles([imageFile('mobile.png'), imageFile('second.png', 'green')]); await done(page, 2); await imageAction(page, 'pause').click(); await button(page, ic('modeTarget', 'en')).click(); const fields = [page.getByRole('spinbutton', { name: ic('targetCustom', 'en'), exact: true }).first(), page.getByRole('spinbutton', { name: ic('sideCustom', 'en'), exact: true }).last()]; const geometry = await mobile(page, fields, [imageAction(page, 'resume'), imageAction(page, 'retry'), imageAction(page, 'clear')]); await imageAction(page, 'resume').click(); await done(page, 2); await page.locator('[data-image-queue-controls]').evaluate(node => node.scrollIntoView({ block: 'start', behavior: 'instant' })); await page.screenshot({ path: resolve(out, 'image-queue-english-320-dark.png'), caret: 'initial' }); await page.evaluate(() => scrollTo({ top: 0, behavior: 'instant' })); await page.screenshot({ path: resolve(out, 'image-queue-english-320-top.png'), caret: 'initial' }); return { geometry, ...(await imageEvidence(page)) }
}, { width: 320, dark: true, language: 'en' })

test('image-fallback-abort-boundaries-and-real-html-output', async args => {
  const { page } = args; await prepareImages(args); await page.evaluate(() => {
    window.__bitmapMode = 'reject'; window.__offscreenMode = 'reject'; window.__htmlDecodes = 0; window.__htmlEncodes = 0; window.__bitmapReject = null; window.__offscreenReject = null
    const bitmap = window.createImageBitmap; window.createImageBitmap = function(source, ...rest) { if (source instanceof File && window.__bitmapMode === 'reject') return Promise.reject(new DOMException('Controlled native bitmap failure', 'EncodingError')); if (source instanceof File && window.__bitmapMode === 'holdReject') return new Promise((resolve, reject) => { window.__bitmapReject = () => reject(new DOMException('Late native bitmap failure', 'EncodingError')) }); return bitmap(source, ...rest) }
    const decode = HTMLImageElement.prototype.decode; HTMLImageElement.prototype.decode = function() { window.__htmlDecodes++; return decode.call(this) }
    const offscreen = OffscreenCanvas.prototype.convertToBlob; OffscreenCanvas.prototype.convertToBlob = function(options) { if (this.width > 2 && window.__offscreenMode === 'reject') return Promise.reject(new DOMException('Controlled offscreen failure', 'EncodingError')); if (this.width > 2 && window.__offscreenMode === 'holdReject') return new Promise((resolve, reject) => { window.__offscreenReject = () => reject(new DOMException('Late offscreen failure', 'EncodingError')) }); return offscreen.call(this, options) }
    const toBlob = HTMLCanvasElement.prototype.toBlob; HTMLCanvasElement.prototype.toBlob = function(...values) { if (this.width > 2) window.__htmlEncodes++; return toBlob.apply(this, values) }
  })
  await page.locator('[data-image-input]').setInputFiles(imageFile('fallback-success.png')); await done(page, 1); const file = await download(page, () => imageRow(page, 0).locator('[data-image-download]').click(), 'html-fallback-output.jpg'); const info = await imageInfo(page, file.bytes, 'image/jpeg'); assert.equal(info.width, 320); assert.equal(info.height, 240); assert.ok(info.pixel[0] > 200 && info.pixel[1] < 40); const baseline = await page.evaluate(() => ({ decode: window.__htmlDecodes, encode: window.__htmlEncodes })); assert.equal(baseline.decode, 1); assert.equal(baseline.encode, 1)
  await imageAction(page, 'clear').click(); await page.evaluate(() => { window.__bitmapMode = 'holdReject' }); await page.locator('[data-image-input]').setInputFiles(imageFile('abort-bitmap.png')); await poll(() => page.evaluate(() => !!window.__bitmapReject), 'bitmap rejection held'); await imageAction(page, 'pause').click(); await page.evaluate(() => window.__bitmapReject()); await poll(async () => await page.locator('[data-image-status="processing"]').count() === 0, 'bitmap abort settles'); assert.equal(await page.evaluate(() => window.__htmlDecodes), baseline.decode); assert.equal(await page.locator('[data-image-status="error"]').count(), 0); assert.equal(await imageRow(page, 0).getAttribute('data-image-status'), 'pending')
  await imageAction(page, 'clear').click(); await page.evaluate(() => { window.__bitmapMode = 'native'; window.__offscreenMode = 'holdReject' }); await page.locator('[data-image-input]').setInputFiles(imageFile('abort-offscreen.png', 'green')); await imageAction(page, 'resume').click(); await poll(() => page.evaluate(() => !!window.__offscreenReject), 'offscreen rejection held'); await imageAction(page, 'pause').click(); await page.evaluate(() => window.__offscreenReject()); await poll(async () => await page.locator('[data-image-status="processing"]').count() === 0, 'encoder abort settles'); assert.equal(await page.evaluate(() => window.__htmlEncodes), baseline.encode); assert.equal(await page.locator('[data-image-status="error"]').count(), 0); assert.equal(await page.evaluate(() => window.__activeImages), 0)
  await page.evaluate(() => { window.__offscreenMode = 'reject' }); await imageAction(page, 'resume').click(); await done(page, 1); assert.equal(await page.evaluate(() => window.__htmlEncodes), baseline.encode + 1); return { realHtmlFallback: info, controlledNativeFailure: true, abortBeforeHtmlDecodeStarts: true, abortBeforeHtmlToBlobStarts: true, resumedFallbackSucceeded: true, ...(await imageEvidence(page)) }
})

if (only === '--list') console.log(cases.map(item => item.name).join('\n'))
else {
  mkdirSync(out, { recursive: true }); const browser = await chromium.launch({ channel: 'chrome' })
  try { for (const scenario of cases) await run(browser, scenario) }
  finally { await browser.close(); const merged = readdirSync(out).filter(name => name.endsWith('-evidence.json')).map(name => JSON.parse(readFileSync(resolve(out, name), 'utf8'))); const final = { checkedAt: new Date().toISOString(), passed: merged.filter(item => item.status === 'pass').length, failed: merged.filter(item => item.status === 'fail').length, results: merged }; writeFileSync(resolve(out, 'final-results.json'), JSON.stringify(final, null, 2)); console.log(JSON.stringify({ passed: final.passed, failed: final.failed, browserClosed: true })) }
  if (results.some(item => item.status !== 'pass')) process.exitCode = 1
}

