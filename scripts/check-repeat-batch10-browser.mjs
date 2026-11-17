import { chromium } from 'playwright'
import assert from 'node:assert/strict'
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import JSZip from 'jszip'

const base = process.env.VERIFY_BASE_URL || 'http://127.0.0.1:3039'
const out = resolve('docs/verify/2026-11-16-repeat-batch10/browser')
const only = process.argv[2]
const decoderUrl = 'https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.js'
const messages = Object.fromEntries(['ko', 'en'].map(language => [language, JSON.parse(readFileSync(`messages/${language}.json`, 'utf8'))]))
const tr = (ns, key, values = {}, language = 'ko') => {
  const value = key.split('.').reduce((object, key) => object?.[key], messages[language][ns])
  assert.equal(typeof value, 'string', `Missing ${language}:${ns}.${key}`)
  return value.replace(/\{(\w+)\}/g, (match, key) => values[key] ?? match)
}
const n = (key, values) => tr('notepad', key, values)
const t = (key, values) => tr('textToSpeech', key, values)
const j = (key, values) => tr('jsonFormatter', key, values)
const u = (key, values) => tr('urlEncoder', key, values)
const button = (scope, name) => scope.getByRole('button', { name, exact: true })
const raw = (page, key) => page.evaluate(key => localStorage.getItem(key), key)
const stored = async (page, key) => JSON.parse(await raw(page, key))
const results = []
const keys = { handoff: 'toolhub-ocr-tts-v1', json: 'toolhub-jsonpath-presets-v1', notes: 'toolhub-notepad-notes' }
mkdirSync(out, { recursive: true })
const browser = await chromium.launch({ channel: 'chrome' })

async function run(name, fn, options = {}) {
  if (only && !only.split(',').some(part => name.includes(part))) return
  const context = await browser.newContext({ viewport: { width: options.width ?? 1280, height: 900 }, timezoneId: 'Asia/Seoul', serviceWorkers: 'block', acceptDownloads: true, permissions: ['clipboard-read', 'clipboard-write'] })
  const errors = [], external = []
  await context.addInitScript(options => {
    if (!/^https?:$/.test(location.protocol)) return
    localStorage.setItem('language', options.language ?? 'ko')
    localStorage.setItem('theme', options.dark ? 'dark' : 'light')
  }, options)
  await context.route('**/*', route => { const url = route.request().url(); if (url.startsWith(base) || (options.decoder && url === decoderUrl)) return route.continue(); external.push(url); return route.abort() })
  context.on('page', page => {
    page.setDefaultTimeout(15000); page.setDefaultNavigationTimeout(120000)
    page.on('pageerror', error => errors.push(error.message))
    page.on('console', message => { if (message.type() === 'error' && /hydration|didn't match|server rendered HTML/i.test(message.text())) errors.push(message.text()) })
    page.on('dialog', dialog => dialog.accept())
  })
  const page = await context.newPage()
  const open = async (slug, query = '', target = page) => {
    await target.goto(`${base}/${slug}/${query}`, { waitUntil: 'domcontentloaded' })
    await target.locator('main h1').first().waitFor()
  }
  const start = Date.now()
  try {
    await fn({ page, context, open })
    assert.deepEqual(errors, [], 'JavaScript / hydration errors')
    results.push({ name, pass: true, milliseconds: Date.now() - start, errors, externalRequestsBlocked: external.length })
  } catch (error) {
    results.push({ name, pass: false, milliseconds: Date.now() - start, error: error.message, errors })
    await page.screenshot({ path: resolve(out, `${name}-failed.png`), caret: 'initial' }).catch(() => {})
  } finally { await context.close() }
  console.log(JSON.stringify(results.at(-1)))
  writeFileSync(resolve(out, `results${only ? '-' + only.replace(/[^\w-]/g, '') : ''}.json`), JSON.stringify({ base, checkedAt: new Date().toISOString(), results }, null, 2))
}
async function seed(context, values) {
  await context.addInitScript(values => {
    if (!/^https?:$/.test(location.protocol) || localStorage.getItem('__batch10Seeded')) return
    for (const [key, value] of Object.entries(values)) localStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value))
    localStorage.setItem('__batch10Seeded', '1')
  }, values)
}
async function quota(page, key) {
  await page.evaluate(key => {
    const original = Storage.prototype.setItem
    window.__restoreStorage = () => { Storage.prototype.setItem = original }
    Storage.prototype.setItem = function (name, value) { if (name === key) throw new DOMException('Quota exceeded for verification', 'QuotaExceededError'); return original.call(this, name, value) }
  }, key)
}
async function download(page, click, filename) {
  const event = page.waitForEvent('download')
  await click()
  const file = await event
  const path = resolve(out, filename ?? file.suggestedFilename())
  await file.saveAs(path)
  return { name: file.suggestedFilename(), path, bytes: readFileSync(path) }
}
function shape(namespace, prefix) {
  const flat = (object, prefix = '') => Object.entries(object).flatMap(([key, value]) => value !== null && typeof value === 'object' ? flat(value, `${prefix}${key}.`) : [`${prefix}${key}:${typeof value}`]).sort()
  const ko = messages.ko[namespace][prefix], en = messages.en[namespace][prefix]
  assert.ok(ko && en); assert.deepEqual(flat(ko), flat(en))
}
async function mobile(page, panel, name) {
  const sizes = await page.evaluate(() => ({ width: innerWidth, body: document.body.scrollWidth, document: document.documentElement.scrollWidth }))
  assert.ok(sizes.body <= sizes.width + 1 && sizes.document <= sizes.width + 1, `Page overflow: ${JSON.stringify(sizes)}`)
  assert.equal(await page.evaluate(() => document.documentElement.classList.contains('dark')), true)
  assert.doesNotMatch(await panel.innerText(), /(?:reading|presets|batch)\.[a-z]/)
  const box = await panel.boundingBox()
  if (box.height > 700) {
    await panel.evaluate(element => scrollTo(0, element.getBoundingClientRect().top + scrollY - 80))
    await page.screenshot({ path: resolve(out, `${name}-320-dark-panel.png`), caret: 'initial' })
    const detail = panel.locator('li').last()
    if (await detail.count()) {
      await detail.evaluate(element => element.scrollIntoView({ block: 'center' }))
      await detail.screenshot({ path: resolve(out, `${name}-320-dark-detail.png`), caret: 'initial' })
    }
  } else {
    await panel.evaluate(element => element.scrollIntoView({ block: 'center' }))
    await panel.screenshot({ path: resolve(out, `${name}-320-dark-panel.png`), caret: 'initial' })
  }
  await page.evaluate(() => scrollTo(0, 0)); await page.screenshot({ path: resolve(out, `${name}-320-dark-top.png`), caret: 'initial' })
}
async function poll(predicate, description) {
  for (let attempt = 0; attempt < 100; attempt++) { if (await predicate()) return; await new Promise(resolve => setTimeout(resolve, 100)) }
  assert.fail(`Timed out: ${description}`)
}
const noteText = '앞 문장입니다. 선택할 한글 문장입니다. 마지막 문장입니다.'
const notesFixture = [{ id: 'note1', title: 'Fixture note', content: noteText, createdAt: 1794787200000, updatedAt: 1794787200000 }]
async function speechCounter(context) {
  await context.addInitScript(() => {
    window.__speechCalls = { speak: 0, cancel: 0 }
    if (typeof speechSynthesis === 'undefined') return
    for (const method of ['speak', 'cancel']) { const original = SpeechSynthesis.prototype[method]; SpeechSynthesis.prototype[method] = function(...args) { window.__speechCalls[method]++; return original.apply(this, args) } }
  })
}
async function openNote(args) {
  await speechCounter(args.context); await seed(args.context, { [keys.notes]: notesFixture }); await args.open('notepad')
  const editor = args.page.getByRole('textbox', { name: n('contentPlaceholder'), exact: true })
  await poll(async () => await editor.inputValue() === noteText, 'note restored')
  return editor
}
async function transferred(page, context, action, expected) {
  const event = context.waitForEvent('page'); await action(); const target = await event
  await target.waitForURL('**/text-to-speech/?from=notepad'); await target.locator('#tts-text').waitFor()
  await poll(async () => await target.locator('#tts-text').inputValue() === expected, 'handoff consumed')
  assert.equal(new URL(target.url()).search, '?from=notepad')
  assert.equal(await target.evaluate(() => window.opener === null), true)
  assert.equal(await target.evaluate(key => sessionStorage.getItem(key), keys.handoff), null)
  assert.equal(await target.evaluate(() => window.__speechCalls.speak), 0)
  assert.equal(await target.evaluate(() => window.__speechCalls.cancel), 0, 'handoff tab does not cancel another reader')
  assert.ok(await target.getByRole('checkbox', { name: t('handoff.localOnly'), exact: true }).isChecked())
  return target
}
async function selectNote(page, editor, start, end) {
  await page.bringToFront(); await editor.focus(); await editor.press('Control+Home')
  for (let index = 0; index < start; index++) await editor.press('ArrowRight')
  for (let index = start; index < end; index++) await editor.press('Shift+ArrowRight')
}
const jsonPanel = page => page.locator('[data-jsonpath-presets]')
const jsonInput = page => page.locator('.cm-content[contenteditable="true"]').first()
async function openJson(args) {
  await args.open('json-formatter'); await jsonInput(args.page).waitFor()
  await button(args.page, j('presets.openPanel')).click(); await jsonPanel(args.page).waitFor()
  return jsonPanel(args.page)
}
async function editJson(page, text) { await jsonInput(page).fill(text); await poll(async () => (await jsonInput(page).innerText()) === text, 'JSON input edit') }
async function queryJson(page, query) {
  await page.locator('#jsonpath-query').fill(query); await poll(async () => await button(page, j('jsonPath.run')).isEnabled(), 'JSON parsed for query')
  await button(page, j('jsonPath.run')).click(); await page.locator('[data-jsonpath-result]').waitFor()
  return JSON.parse(await page.locator('[data-jsonpath-result]').innerText())
}
async function saveQuery(page, name) {
  const panel = jsonPanel(page); await panel.getByLabel(j('presets.name'), { exact: true }).fill(name); await button(panel, j('presets.save')).click()
  await poll(async () => (await stored(page, keys.json))?.presets?.some(preset => preset.name === name), 'query saved')
}
const urlPanel = page => page.locator('section[aria-labelledby="url-batch-heading"]')
async function convertLines(page, input, mode = 'encode') {
  const panel = urlPanel(page); await page.locator('#url-batch-input').fill(input)
  await button(panel, u(`batch.modes.${mode}`)).click(); await button(panel, u('batch.convert')).click()
  return panel
}
const urlRows = page => urlPanel(page).locator('tbody tr').evaluateAll(rows => rows.map(row => [...row.querySelectorAll('th,td')].map(cell => cell.textContent)))

try {
  await run('notepad-full-selection-new-tabs-and-existing-reader', async args => {
    const { page, context, open } = args; shape('notepad', 'reading'); shape('textToSpeech', 'handoff'); const editor = await openNote(args)
    await page.evaluate(key => sessionStorage.setItem(key, 'source-session-protected'), keys.handoff)
    const existing = await context.newPage(); await open('text-to-speech', '?t=Existing%20reader', existing)
    await poll(async () => await existing.locator('#tts-text').inputValue() === 'Existing reader', 'existing reader ready')
    const existingCalls = await existing.evaluate(() => window.__speechCalls)
    await transferred(page, context, () => button(page, n('reading.all')).click(), noteText)
    assert.equal(await editor.inputValue(), noteText); assert.deepEqual(await stored(page, keys.notes), notesFixture)
    assert.equal(await page.evaluate(key => sessionStorage.getItem(key), keys.handoff), 'source-session-protected')
    await selectNote(page, editor, 8, 22)
    await poll(async () => await button(page, n('reading.selection')).isEnabled(), 'selection captured')
    await transferred(page, context, () => button(page, n('reading.selection')).click(), noteText.slice(8, 22))
    assert.equal(await editor.inputValue(), noteText); assert.equal(await existing.locator('#tts-text').inputValue(), 'Existing reader')
    assert.deepEqual(await existing.evaluate(() => window.__speechCalls), existingCalls)
    await editor.fill('Changed note content'); assert.ok(await button(page, n('reading.selection')).isDisabled(), 'edited text invalidates prior selection')
    await poll(async () => (await stored(page, keys.notes))[0].content === 'Changed note content', 'existing autosave survives handoff')
  })
  await run('notepad-popup-storage-limit-failure-preserves-original', async args => {
    const { page, context } = args; const editor = await openNote(args)
    await page.evaluate(() => { const original = window.open; window.__restoreOpen = () => { window.open = original }; window.open = () => null })
    await button(page, n('reading.all')).click(); await page.getByRole('alert').filter({ hasText: n('reading.popupBlocked') }).waitFor()
    assert.equal(context.pages().length, 1); assert.equal(await editor.inputValue(), noteText)
    await page.evaluate(() => { window.__restoreOpen(); const original = window.open; window.__restoreOpen = () => { window.open = original }; window.open = (...args) => { const target = original.apply(window, args); Object.defineProperty(target, 'sessionStorage', { get() { throw new Error('Storage blocked') } }); return target } })
    await button(page, n('reading.all')).click(); await page.getByRole('alert').filter({ hasText: n('reading.handoffFailed') }).waitFor()
    await poll(async () => context.pages().length === 1, 'failed target closes'); assert.equal(await editor.inputValue(), noteText)
    await page.evaluate(() => window.__restoreOpen()); await editor.fill('a'.repeat(30001))
    await button(page, n('reading.all')).click(); await page.getByRole('alert').filter({ hasText: n('reading.textTooLong') }).waitFor()
    assert.equal(context.pages().length, 1); assert.equal((await editor.inputValue()).length, 30001)
    await editor.fill(''); assert.ok(await button(page, n('reading.all')).isDisabled())
  })
  await run('notepad-handoff-expiry-source-check-and-ocr-regression', async ({ page, context, open }) => {
    await speechCounter(context); await open('text-to-speech')
    const setPayload = async payload => page.evaluate(({ key, payload }) => sessionStorage.setItem(key, JSON.stringify(payload)), { key: keys.handoff, payload })
    await setPayload({ source: 'notepad', text: 'Expired fixture', createdAt: Date.now() - 601000 }); await open('text-to-speech', '?from=notepad')
    await page.getByRole('status').filter({ hasText: t('handoff.notepadExpired') }).waitFor(); assert.notEqual(await page.locator('#tts-text').inputValue(), 'Expired fixture')
    assert.equal(await page.evaluate(key => sessionStorage.getItem(key), keys.handoff), null)
    const ocr = { source: 'ocr', text: 'OCR fixture preserved', createdAt: Date.now() }; await setPayload(ocr); await open('text-to-speech', '?from=notepad')
    await page.getByRole('status').filter({ hasText: t('handoff.notepadExpired') }).waitFor()
    assert.deepEqual(await page.evaluate(key => JSON.parse(sessionStorage.getItem(key)), keys.handoff), ocr)
    await open('text-to-speech', '?from=ocr'); await poll(async () => await page.locator('#tts-text').inputValue() === ocr.text, 'existing OCR source consumed')
    assert.equal(await page.evaluate(key => sessionStorage.getItem(key), keys.handoff), null); assert.equal(await page.evaluate(() => window.__speechCalls.speak), 0)
    await page.reload({ waitUntil: 'domcontentloaded' }); await page.getByRole('status').filter({ hasText: t('handoff.expired') }).waitFor()
    assert.notEqual(await page.locator('#tts-text').inputValue(), ocr.text, 'handoff consumed once')
  })
  await run('notepad-mobile-dark-selection-transfer', async args => {
    const { page, context } = args; const editor = await openNote(args)
    await selectNote(page, editor, 0, 7)
    await poll(async () => await button(page, n('reading.selection')).isEnabled(), 'mobile selection ready')
    const target = await transferred(page, context, () => button(page, n('reading.selection')).click(), noteText.slice(0, 7))
    await mobile(page, page.getByRole('group', { name: n('reading.title'), exact: true }), 'notepad')
    await target.locator('#tts-text').evaluate(element => element.scrollIntoView({ block: 'center' }))
    await target.screenshot({ path: resolve(out, 'notepad-tts-320-dark.png'), caret: 'initial' })
    assert.ok(await target.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1))
  }, { width: 320, dark: true, language: 'en' })
  await run('jsonpath-save-load-explicit-run-and-management', async args => {
    const { page } = args; shape('jsonFormatter', 'presets'); const panel = await openJson(args)
    const source = '{"people":[{"name":"Alpha"},{"name":"Beta"}],"private":"not saved"}'
    await editJson(page, source); assert.deepEqual(await queryJson(page, '$.people[*].name'), ['Alpha', 'Beta']); await saveQuery(page, 'Names')
    await page.locator('#jsonpath-query').fill('$.private'); assert.equal(await page.locator('[data-jsonpath-result]').count(), 0)
    assert.deepEqual(await queryJson(page, '$.private'), ['not saved']); await button(panel, j('presets.load')).click()
    await poll(async () => await page.locator('#jsonpath-query').inputValue() === '$.people[*].name', 'query restored')
    assert.equal(await page.locator('[data-jsonpath-result]').count(), 0); assert.equal(await jsonInput(page).innerText(), source)
    assert.deepEqual(await queryJson(page, '$.people[*].name'), ['Alpha', 'Beta'])
    assert.doesNotMatch(await raw(page, keys.json), /Alpha|Beta|not saved/)
    await panel.getByLabel(j('presets.renameLabel'), { exact: true }).fill('Renamed names'); await button(panel, j('presets.rename')).click()
    await poll(async () => (await stored(page, keys.json)).presets[0].name === 'Renamed names', 'query renamed')
    await button(panel, j('presets.delete')).click(); await button(panel, j('presets.cancel')).click(); assert.equal((await stored(page, keys.json)).presets.length, 1)
    await page.reload({ waitUntil: 'domcontentloaded' }); await jsonInput(page).waitFor(); await button(page, j('presets.openPanel')).click()
    await jsonPanel(page).getByRole('combobox').selectOption({ label: 'Renamed names' }); await button(jsonPanel(page), j('presets.delete')).click(); await button(jsonPanel(page), j('presets.confirmDelete')).click()
    await poll(async () => (await stored(page, keys.json)).presets.length === 0, 'query delete confirmed')
  })
  await run('jsonpath-falsy-roots-errors-and-stale-results', async args => {
    const { page } = args; await openJson(args)
    for (const value of [false, 0, null, '']) { await editJson(page, JSON.stringify(value)); assert.deepEqual(await queryJson(page, '$'), [value]) }
    await editJson(page, '{"a":1}'); assert.deepEqual(await queryJson(page, '$.a'), [1])
    await editJson(page, '{invalid}'); assert.equal(await page.locator('[data-jsonpath-result]').count(), 0); assert.ok(await button(page, j('jsonPath.run')).isDisabled())
    await editJson(page, '{"a":2}'); await page.locator('#jsonpath-query').fill('$[?(@.bad(]'); await poll(async () => await button(page, j('jsonPath.run')).isEnabled(), 'valid JSON parsed')
    await button(page, j('jsonPath.run')).click(); await page.locator('[role="alert"]:not(#__next-route-announcer__)').waitFor(); assert.equal(await page.locator('[data-jsonpath-result]').count(), 0)
    await page.locator('#jsonpath-query').fill('x'.repeat(1001)); await jsonPanel(page).getByLabel(j('presets.name'), { exact: true }).fill('Too long'); assert.ok(await button(jsonPanel(page), j('presets.save')).isDisabled())
  })
  await run('jsonpath-storage-quota-corruption-and-two-tabs', async args => {
    const { page, context, open } = args; const panel = await openJson(args); await page.locator('#jsonpath-query').fill('$.a'); await saveQuery(page, 'Original'); const before = await raw(page, keys.json)
    await quota(page, keys.json); await panel.getByLabel(j('presets.name'), { exact: true }).fill('Retained draft'); await button(panel, j('presets.save')).click(); await panel.getByRole('alert').waitFor()
    assert.equal(await raw(page, keys.json), before); assert.equal(await panel.getByLabel(j('presets.name'), { exact: true }).inputValue(), 'Retained draft'); await page.evaluate(() => window.__restoreStorage())
    const second = await context.newPage(); await open('json-formatter', '', second); await jsonInput(second).waitFor(); await button(second, j('presets.openPanel')).click(); await second.locator('#jsonpath-query').fill('$.b'); await saveQuery(second, 'Other tab')
    await panel.getByRole('alert').filter({ hasText: j('presets.errors.conflict') }).waitFor(); assert.ok(await button(panel, j('presets.save')).isDisabled())
    await button(panel, j('presets.refresh')).click(); await saveQuery(page, 'Retained draft'); assert.equal((await stored(page, keys.json)).presets.length, 3)
    const corrupt = '{"version":99,"protected":true}'; await page.evaluate(({ key, corrupt }) => localStorage.setItem(key, corrupt), { key: keys.json, corrupt }); await page.reload({ waitUntil: 'domcontentloaded' })
    await jsonInput(page).waitFor(); await button(page, j('presets.openPanel')).click(); await jsonPanel(page).getByRole('alert').waitFor(); assert.equal(await raw(page, keys.json), corrupt)
  })
  await run('jsonpath-mobile-dark-query-result', async args => {
    const { page } = args; const panel = await openJson(args); await editJson(page, '{"hello":"안녕하세요"}'); assert.deepEqual(await queryJson(page, '$.hello'), ['안녕하세요'])
    await saveQuery(page, 'Greeting'); await mobile(page, panel, 'jsonpath')
  }, { width: 320, dark: true, language: 'en' })
  await run('url-batch-encode-actual-clipboard-txt-and-order', async ({ page, open }) => {
    shape('urlEncoder', 'batch'); await open('url-encoder')
    const source = '한글 😀\r\n\r\n%2520\r\n a+b\tc\r\n'
    const panel = await convertLines(page, source)
    const expected = ['%ED%95%9C%EA%B8%80%20%F0%9F%98%80', '', '%252520', '%20a%2Bb%09c']
    await panel.locator('tbody tr').nth(3).waitFor(); const rows = await urlRows(page)
    assert.equal(rows.length, 4); assert.deepEqual(rows.map(row => row[0]), ['1', '2', '3', '4'])
    assert.equal(rows[1][1], u('batch.status.blank')); assert.deepEqual(rows.map(row => row[3] === u('batch.blankCell') ? '' : row[3]), expected)
    await button(panel, u('batch.copyText')).click(); await panel.getByRole('status').filter({ hasText: u('batch.copiedText') }).waitFor()
    assert.equal((await page.evaluate(() => navigator.clipboard.readText())).replaceAll('\r\n', '\n'), expected.join('\n'), 'Windows clipboard newline normalization preserves logical rows')
    const file = await download(page, () => button(panel, u('batch.downloadTxt')).click(), 'url-encoded-lines.txt')
    assert.equal(file.name, 'url-encoded-lines.txt'); assert.equal(file.bytes.toString('utf8'), expected.join('\n')); assert.notEqual(file.bytes[0], 239)
    assert.doesNotMatch(page.url(), /2520|%ED%95/)
  })
  await run('url-batch-decode-errors-newlines-and-tsv', async ({ page, open }) => {
    await open('url-encoder'); const panel = await convertLines(page, '%2520\nbad%ZZ\n%E0%A4%A\n%0A\n%3D1%2B1\n%09x', 'decode')
    const expected = ['%20', 'bad%ZZ', '%E0%A4%A', '\n', '=1+1', '\tx'], rows = await urlRows(page)
    assert.equal(rows.length, 6); assert.deepEqual(rows.map(row => row[3]), expected)
    assert.equal(rows.filter(row => row[1] === u('batch.status.error')).length, 2)
    const file = await download(page, () => button(panel, u('batch.downloadTxt')).click(), 'url-decoded-lines.txt')
    assert.equal(file.bytes.toString('utf8'), expected.join('\n')); assert.equal(file.name, 'url-decoded-lines.txt')
    await button(panel, u('batch.copyTable')).click(); await panel.getByRole('status').filter({ hasText: u('batch.copiedTable') }).waitFor()
    const table = (await page.evaluate(() => navigator.clipboard.readText())).replaceAll('\r\n', '\n'); assert.ok(table.includes("'bad%ZZ")); assert.ok(table.includes("'=1+1")); assert.ok(table.includes('"\'\n"')); assert.ok(table.includes('"\'\tx"'))
    writeFileSync(resolve(out, 'url-lines.tsv'), table)
    await button(panel, u('batch.modes.encode')).click(); assert.equal(await panel.locator('tbody tr').count(), 0); assert.ok(await button(panel, u('batch.downloadTxt')).isDisabled())
  })
  await run('url-batch-limits-failures-and-pending-copy-edit', async ({ page, open }) => {
    await open('url-encoder')
    let panel = await convertLines(page, Array.from({ length: 101 }, () => 'x').join('\n')); await panel.getByRole('alert').waitFor(); assert.equal(await panel.locator('tbody tr').count(), 0)
    panel = await convertLines(page, 'a'.repeat(30001)); await panel.getByRole('alert').waitFor(); assert.ok(await button(panel, u('batch.downloadTxt')).isDisabled())
    panel = await convertLines(page, 'Recover')
    await page.evaluate(() => { Object.defineProperty(navigator.clipboard, 'writeText', { configurable: true, value: () => Promise.reject(new Error('Clipboard denied')) }); document.execCommand = () => false })
    await button(panel, u('batch.copyText')).click(); await panel.getByRole('alert').filter({ hasText: u('batch.copyFailed') }).waitFor()
    await page.evaluate(() => { URL.createObjectURL = () => { throw new Error('Download unavailable') } })
    await button(panel, u('batch.downloadTxt')).click(); await panel.getByRole('alert').filter({ hasText: u('batch.downloadFailed') }).waitFor(); assert.equal(await page.locator('#url-batch-input').inputValue(), 'Recover')
    await page.evaluate(() => { Object.defineProperty(navigator.clipboard, 'writeText', { configurable: true, value: () => new Promise(resolve => { window.__finishCopy = resolve }) }) })
    await button(panel, u('batch.copyText')).click(); await page.locator('#url-batch-input').fill('Changed during copy'); await page.evaluate(() => window.__finishCopy())
    await poll(async () => await button(panel, u('batch.copyText')).isDisabled(), 'edited output unavailable')
    assert.equal(await panel.getByRole('status').filter({ hasText: u('batch.copiedText') }).count(), 0)
    const singleInput = page.getByRole('textbox', { name: u('input.text'), exact: true })
    await singleInput.fill('single fixture'); await button(page, u('actions.encode')).last().click()
    await page.evaluate(() => { Object.defineProperty(navigator.clipboard, 'writeText', { configurable: true, value: () => Promise.reject(new Error('Clipboard denied')) }) })
    await button(page, u('actions.copy')).click(); await page.getByRole('alert').filter({ hasText: u('copyFailed') }).waitFor()
  })
  await run('url-batch-mobile-dark-and-single-normalization-regression', async ({ page, open }) => {
    await open('url-encoder')
    const single = page.getByRole('textbox', { name: u('input.text'), exact: true })
    await single.fill('https://example.com/한글?q=hello world'); await button(page, u('actions.parseUrl')).click()
    const output = page.getByRole('textbox', { name: u('output.encoded'), exact: true })
    assert.equal(await output.inputValue(), 'https://example.com/%ED%95%9C%EA%B8%80?q=hello%20world')
    const panel = await convertLines(page, '한글\n\n%2520')
    assert.equal(await output.inputValue(), 'https://example.com/%ED%95%9C%EA%B8%80?q=hello%20world')
    await mobile(page, panel, 'url'); assert.ok(await panel.getByRole('region', { name: u('batch.results') }).evaluate(element => element.scrollWidth > element.clientWidth))
    await single.fill('edit'); assert.equal(await output.inputValue(), '', 'single edits also clear old output')
  }, { width: 320, dark: true, language: 'en' })
} finally { await browser.close() }
const latest = new Map()
const runs = readdirSync(out).filter(name => /^results.*\.json$/.test(name)).map(name => ({ name, ...JSON.parse(readFileSync(resolve(out, name), 'utf8')) })).sort((a, b) => a.checkedAt.localeCompare(b.checkedAt))
for (const run of runs) for (const result of run.results) latest.set(result.name, { ...result, sourceRun: run.name })
writeFileSync(resolve(out, 'final-results.json'), JSON.stringify({ base, checkedAt: new Date().toISOString(), total: latest.size, passed: [...latest.values()].filter(result => result.pass).length, results: [...latest.values()] }, null, 2))
if (results.some(result => !result.pass)) process.exitCode = 1
