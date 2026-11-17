import { chromium } from 'playwright'
import assert from 'node:assert/strict'
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

// Independent real-browser checks. --list never starts Chrome; case-name filters
// preserve previous evidence so only changed boundaries need to be rerun.
const base = process.env.VERIFY_BASE_URL || 'http://127.0.0.1:3039'
const out = resolve('docs/verify/2026-11-17-repeat-batch20/browser')
const only = process.argv[2]
const messages = Object.fromEntries(['ko', 'en'].map(language => [language, JSON.parse(readFileSync(`messages/${language}.json`, 'utf8'))]))
const tr = (ns, key, language = 'ko', values = {}) => {
  const value = key.split('.').reduce((object, key) => object?.[key], messages[language][ns])
  assert.equal(typeof value, 'string', `Missing ${language}:${ns}.${key}`)
  return value.replace(/\{(\w+)\}/g, (match, key) => values[key] ?? match)
}
const l = (key, language = 'ko', values = {}) => tr('lunarConverter', key, language, values)
const s = (key, language = 'ko', values = {}) => tr('speakingPractice', key, language, values)
const button = (scope, name) => scope.getByRole('button', { name, exact: true })
const wait = ms => new Promise(resolve => setTimeout(resolve, ms))
async function poll(predicate, description, attempts = 180) { for (let n = 0; n < attempts; n++) { if (await predicate()) return; await wait(100) }; assert.fail(`Timed out: ${description}`) }
const cases = [], results = []
const test = (name, fn, options = {}) => cases.push({ name, fn, options })
const planned = [
  'lunar-original-leap-url-priority-and-new-visit', 'lunar-load-ics-reset-real-download-and-late-sha',
  'lunar-rename-delete-limit-and-original-date-boundaries', 'lunar-invalid-blocked-quota-readback-recovery',
  'lunar-two-tab-conflict-and-pending-lock-cancel', 'lunar-copy-recovery-and-320-dark-english',
  'speaking-native-v1-blob-no-migration-and-revision-save', 'speaking-name-all-take-search-mode-and-new-visit',
  'speaking-current-practice-text-audio-and-summary-export', 'speaking-two-tab-save-delete-cas-conflicts',
  'speaking-native-transaction-abort-quota-and-list-recovery', 'speaking-commit-success-list-failure-and-late-completion',
  'speaking-corrupt-physical-limits-and-320-dark-english',
  'lunar-pending-load-calendar-title-and-year-edit-preserved',
]

async function run(browser, { name, fn, options }) {
  if (only && !only.split(',').some(part => name.includes(part))) return
  const context = await browser.newContext({ viewport: { width: options.width ?? 1280, height: 900 }, timezoneId: 'Asia/Seoul', serviceWorkers: 'block', permissions: ['clipboard-read', 'clipboard-write'], acceptDownloads: true })
  const errors = [], hydration = [], external = [], consoleErrors = []
  await context.addInitScript(options => {
    if (!/^https?:$/.test(location.protocol)) return
    if (!localStorage.getItem('__batch20Seeded')) { localStorage.setItem('language', options.language ?? 'ko'); localStorage.setItem('theme', options.dark ? 'dark' : 'light'); localStorage.setItem('__batch20Seeded', '1') }
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
  const watchdog = setTimeout(() => { void context.close().catch(() => {}) }, 90000)
  try { detail = await fn({ page, context, open }) ?? {}; assert.deepEqual(errors, [], 'JS page errors'); assert.deepEqual(hydration, [], 'Hydration errors'); for (const active of context.pages()) assert.deepEqual(await active.evaluate(() => window.__unhandled), [], 'Unhandled rejections'); assert.doesNotMatch(await page.locator('body').innerText(), /\b(?:lunarConverter|speakingPractice)\.[a-zA-Z][\w.]+/, 'Raw translation key') }
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
async function seedLocal(context, entries) { await context.addInitScript(entries => { if (!/^https?:$/.test(location.protocol) || localStorage.getItem('__batch20LocalSeeded')) return; for (const [key, value] of Object.entries(entries)) localStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value)); localStorage.setItem('__batch20LocalSeeded', '1') }, entries) }
const raw = (page, key) => page.evaluate(key => localStorage.getItem(key), key)
const stored = async (page, key) => JSON.parse(await raw(page, key))
async function holdLock(page, key) { await page.evaluate(key => { window.__lockTask = navigator.locks.request(key, async () => { window.__lockHeld = true; await new Promise(resolve => { window.__releaseLock = resolve }) }) }, key); await poll(() => page.evaluate(() => window.__lockHeld), 'native Web Lock held') }
async function releaseLock(page) { await page.evaluate(async () => { window.__releaseLock(); await window.__lockTask; window.__lockHeld = false }) }

// Small synthetic PCM WAV. It is verification data, never a real microphone recording.
function wavFixture() {
  const rate = 8000, samples = 800, bytes = Buffer.alloc(44 + samples * 2)
  bytes.write('RIFF', 0); bytes.writeUInt32LE(bytes.length - 8, 4); bytes.write('WAVEfmt ', 8); bytes.writeUInt32LE(16, 16); bytes.writeUInt16LE(1, 20); bytes.writeUInt16LE(1, 22); bytes.writeUInt32LE(rate, 24); bytes.writeUInt32LE(rate * 2, 28); bytes.writeUInt16LE(2, 32); bytes.writeUInt16LE(16, 34); bytes.write('data', 36); bytes.writeUInt32LE(samples * 2, 40)
  for (let index = 0; index < samples; index++) bytes.writeInt16LE(Math.round(Math.sin(index * 2 * Math.PI * 440 / rate) * 1000), 44 + index * 2)
  return bytes
}
const audioBytes = wavFixture()
const fixtureTime = Date.parse('2026-11-16T03:00:00Z')
const feedback = { strengthQuote: '프로젝트를 완료했습니다.', strength: '결과가 명확합니다.', improveQuote: '', improve: '강점을 한 문장으로 덧붙여 주세요.', rewrite: '프로젝트를 완료했습니다. 저는 개발자입니다.', next: '한 문장에 한 가지 사실만 담아 다시 말해 보세요.', model: 'verification-existing-feedback' }
function speakingFixture(id = 'legacy-1', options = {}) {
  return { version: 1, id, mode: 'intro', createdAt: fixtureTime, updatedAt: fixtureTime + 1000, takes: [
    { id: `${id}-take1`, createdAt: fixtureTime, seconds: 60, transcript: '저는 개발자입니다. 프로젝트를 완료했습니다.', feedback, __audioBytes: [...audioBytes] },
    { id: `${id}-take2`, createdAt: fixtureTime + 1000, seconds: 55, transcript: '두 번째 답변의 고유검색어 ORCHID 입니다.', __audioBytes: [...audioBytes] },
  ], ...options }
}
async function seedSpeaking(page, records) {
  // Call on an innocuous same-origin page before the speaking component mounts.
  await page.evaluate(async records => {
    const db = await new Promise((resolve, reject) => { const request = indexedDB.open('toolhub-speaking-practice', 1); request.onupgradeneeded = () => request.result.createObjectStore('sessions', { keyPath: 'id' }); request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error) })
    try { await new Promise((resolve, reject) => { const tx = db.transaction('sessions', 'readwrite'), store = tx.objectStore('sessions'); for (const record of records) { for (const take of record.takes ?? []) if (take.__audioBytes) { take.audio = new Blob([new Uint8Array(take.__audioBytes)], { type: 'audio/wav' }); delete take.__audioBytes }; store.put(record) }; tx.oncomplete = resolve; tx.onabort = tx.onerror = () => reject(tx.error) }) } finally { db.close() }
  }, records)
}
async function speakingData(page) {
  return page.evaluate(async () => {
    const db = await new Promise((resolve, reject) => { const request = indexedDB.open('toolhub-speaking-practice', 1); request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error) })
    let records
    try { records = await new Promise((resolve, reject) => { const tx = db.transaction('sessions', 'readonly'), request = tx.objectStore('sessions').getAll(); let values; request.onsuccess = () => { values = request.result }; tx.oncomplete = () => resolve(values); tx.onabort = tx.onerror = () => reject(tx.error) }) } finally { db.close() }
    return Promise.all(records.map(async record => ({ ...record, ...(Array.isArray(record.takes) ? { takes: await Promise.all(record.takes.map(async take => ({ ...take, ...(take.audio instanceof Blob ? { audio: { type: take.audio.type, size: take.audio.size, bytes: [...new Uint8Array(await take.audio.arrayBuffer())] } } : {}) }))) } : {}) })))
  })
}
async function idbFault(page, mode) {
  await page.evaluate(mode => {
    window.__restoreIdb?.(); const transaction = IDBDatabase.prototype.transaction, put = IDBObjectStore.prototype.put, getAll = IDBObjectStore.prototype.getAll
    window.__idbEvents = []; window.__failNextList = false
    window.__restoreIdb = () => { IDBDatabase.prototype.transaction = transaction; IDBObjectStore.prototype.put = put; IDBObjectStore.prototype.getAll = getAll }
    IDBDatabase.prototype.transaction = function(...args) {
      const tx = transaction.apply(this, args)
      if (this.name === 'toolhub-speaking-practice') {
        window.__idbEvents.push({ event: 'transaction', mode: tx.mode })
        tx.addEventListener('complete', () => { window.__idbEvents.push({ event: 'complete', mode: tx.mode }); if (mode === 'commit-list-failure' && tx.mode === 'readwrite') window.__failNextList = true })
        tx.addEventListener('abort', () => window.__idbEvents.push({ event: 'abort', mode: tx.mode, error: tx.error?.name }))
        tx.addEventListener('error', event => window.__idbEvents.push({ event: 'error', mode: tx.mode, error: tx.error?.name, requestError: event.target?.error?.name }))
        if (mode === 'abort-write' && tx.mode === 'readwrite') queueMicrotask(() => tx.abort())
      }
      return tx
    }
    IDBObjectStore.prototype.put = function(...args) { if (this.transaction.db.name === 'toolhub-speaking-practice' && mode === 'quota') throw new DOMException('Verification quota', 'QuotaExceededError'); return put.apply(this, args) }
    IDBObjectStore.prototype.getAll = function(...args) { if (this.transaction.db.name === 'toolhub-speaking-practice' && (mode === 'list-failure' || window.__failNextList)) { window.__failNextList = false; window.__idbEvents.push({ event: 'injected-list-error' }); throw new DOMException('Verification list read error', 'UnknownError') }; return getAll.apply(this, args) }
  }, mode)
}
async function holdSpeakingTransaction(page) {
  await page.evaluate(async () => {
    const db = await new Promise((resolve, reject) => { const request = indexedDB.open('toolhub-speaking-practice', 1); request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error) })
    const tx = db.transaction('sessions', 'readwrite'), store = tx.objectStore('sessions'); window.__holdIdb = true
    window.__heldIdbDone = new Promise((resolve, reject) => { tx.oncomplete = () => { db.close(); resolve() }; tx.onabort = tx.onerror = () => { db.close(); reject(tx.error) } })
    const keepAlive = () => { const request = store.get('__verification-lock__'); request.onsuccess = () => { if (window.__holdIdb) keepAlive() } }; keepAlive()
  })
}
async function releaseSpeakingTransaction(page) { await page.evaluate(async () => { window.__holdIdb = false; await window.__heldIdbDone }) }

const unescapeIcs = text => text.replace(/\\([nN,;\\])/g, (_, character) => /n/i.test(character) ? '\n' : character)
function parseIcs(bytes) {
  const text = new TextDecoder('utf-8', { fatal: true }).decode(bytes); assert.equal(bytes.subarray(0, 3).equals(Buffer.from([239, 187, 191])), false); assert.ok(text.endsWith('\r\n')); assert.equal(text.replace(/\r\n/g, '').includes('\n'), false)
  for (const line of text.split('\r\n')) assert.ok(Buffer.byteLength(line, 'utf8') <= 75)
  const events = [], stack = []; let event = null
  for (const line of text.replace(/\r\n[ \t]/g, '').split('\r\n').filter(Boolean)) {
    if (line.startsWith('BEGIN:')) { const type = line.slice(6); stack.push(type); if (type === 'VEVENT') { assert.equal(event, null); event = {} }; continue }
    if (line.startsWith('END:')) { const type = line.slice(4); assert.equal(stack.pop(), type); if (type === 'VEVENT') { events.push(event); event = null }; continue }
    const colon = line.indexOf(':'); assert.ok(colon > 0); const key = line.slice(0, colon); assert.doesNotMatch(key, /^(RRULE|RDATE|EXDATE|TZID)/); if (event) { assert.equal(Object.hasOwn(event, key), false); event[key] = line.slice(colon + 1) }
  }
  assert.equal(stack.length, 0); assert.ok(events.length); const uids = new Set()
  for (const event of events) { assert.match(event.UID, /^lunar-[0-9a-f]{64}@toolhub\.ai\.kr$/); assert.ok(!uids.has(event.UID)); uids.add(event.UID); const millis = value => Date.UTC(+value.slice(0, 4), +value.slice(4, 6) - 1, +value.slice(6, 8)); assert.equal(millis(event['DTEND;VALUE=DATE']) - millis(event['DTSTART;VALUE=DATE']), 86400000); event.title = unescapeIcs(event.SUMMARY); event.description = unescapeIcs(event.DESCRIPTION) }
  return events
}

const lunarKey = 'toolhub:lunar-anniversaries:v1'
const lunarPanel = page => page.locator('#lunar-saved-anniversaries')
const lunarRow = (page, id) => page.locator(`[data-lunar-anniversary="${id}"]`)
const lunarName = page => page.locator('[data-lunar-anniversary-name]')
const lunarButton = (page, key, language = 'ko') => button(lunarPanel(page), l(`savedAnniversaries.${key}`, language))
const lunarInput = (page, field, language = 'ko') => page.getByRole('combobox', { name: l(field, language), exact: true })
const calendar = page => page.locator('#lunar-calendar-export')
const calendarTitle = (page, language = 'ko') => calendar(page).getByRole('textbox', { name: l('calendarExport.eventTitle', language), exact: true })
const calendarButton = (page, key, language = 'ko') => button(calendar(page), l(`calendarExport.${key}`, language))
const calendarYear = (page, year) => calendar(page).locator('input[type="checkbox"]').and(page.locator(`input[aria-label^="음력 ${year}년,"]`))
const originalLeap = { year: 2025, month: 6, day: 10, isLeap: true }
const lunarFixture = (id = 'leap', name = '윤달 가족 기념일', lunar = originalLeap) => ({ id, name, lunar })
const lunarEnvelope = anniversaries => ({ version: 1, revision: 'fixture-r1', anniversaries })
async function openLunar(args, query = '?mode=lunarToSolar&ly=2026&lm=1&ld=1', fixtures, language = 'ko') {
  if (fixtures) await seedLocal(args.context, { [lunarKey]: lunarEnvelope(fixtures) })
  await args.page.clock.setFixedTime(new Date('2026-03-01T03:00:00Z')); await args.open('lunar-converter', query)
  const params = new URLSearchParams(query), solar = params.get('mode') === 'solarToLunar'
  await poll(async () => await lunarInput(args.page, 'year', language).inputValue() === params.get(solar ? 'sy' : 'ly') && await lunarInput(args.page, 'month', language).inputValue() === (solar ? params.get('sm') : `${params.get('leap') === '1' ? 'L' : ''}${params.get('lm')}`), 'lunar URL hydration settled')
  await lunarPanel(args.page).waitFor(); await poll(async () => !await lunarButton(args.page, 'refresh', language).isDisabled(), 'lunar records ready')
}
async function openCalendar(page, language = 'ko') { if (!await calendar(page).evaluate(node => node.open)) await calendar(page).locator('summary').click(); await calendarTitle(page, language).waitFor() }
async function loadLunar(page, id, language = 'ko') { await button(lunarRow(page, id), l('savedAnniversaries.load', language)).click(); await button(lunarRow(page, id), l('savedAnniversaries.loadConfirm', language)).click(); await poll(async () => !await lunarButton(page, 'refresh', language).isDisabled(), 'lunar load finished') }
async function lunarCurrent(page, language = 'ko') { return { year: await lunarInput(page, 'year', language).inputValue(), month: await lunarInput(page, 'month', language).inputValue(), day: await lunarInput(page, 'day', language).inputValue() } }
async function lunarExport(page, filename) { const file = await download(page, () => calendarButton(page, 'download').click(), filename); const events = parseIcs(file.bytes); writeFileSync(resolve(out, filename.replace(/\.ics$/, '-parsed.json')), JSON.stringify(events, null, 2)); return { filename: file.filename, events } }
async function lunarStorageFault(page, mode) {
  await page.evaluate(({ mode, key }) => {
    window.__restoreLunarStorage?.(); const get = Storage.prototype.getItem, set = Storage.prototype.setItem; let wrote = false
    window.__restoreLunarStorage = () => { Storage.prototype.getItem = get; Storage.prototype.setItem = set }
    Storage.prototype.getItem = function(name) { if (name === key && (mode === 'blocked' || (mode === 'readback' && wrote))) throw new DOMException('Verification read block', 'SecurityError'); return get.call(this, name) }
    Storage.prototype.setItem = function(name, value) { if (name === key && mode === 'quota') throw new DOMException('Verification quota', 'QuotaExceededError'); const result = set.call(this, name, value); if (name === key) wrote = true; return result }
  }, { mode, key: lunarKey })
}
async function clipboardFault(page, mode) {
  await page.evaluate(mode => {
    window.__nativeClipboard ??= navigator.clipboard; window.__nativeExec ??= document.execCommand; window.__copyFallbacks = 0; window.__copyPending = []
    document.execCommand = function(command, ...args) { if (command !== 'copy') return window.__nativeExec.call(this, command, ...args); window.__copyFallbacks++; return false }
    if (mode === 'native') { Object.defineProperty(navigator, 'clipboard', { configurable: true, value: window.__nativeClipboard }); document.execCommand = window.__nativeExec; return }
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: mode === 'absent' ? undefined : { writeText: text => mode === 'defer' ? new Promise((resolve, reject) => window.__copyPending.push({ text, resolve, reject })) : Promise.reject(new DOMException('Verification clipboard failure', 'NotAllowedError')) } })
  }, mode)
}
test('lunar-original-leap-url-priority-and-new-visit', async args => {
  const { page, context, open } = args; await openLunar(args, '?mode=lunarToSolar&ly=2025&lm=6&ld=10&leap=1'); assert.equal(await raw(page, lunarKey), null); await lunarName(page).fill('원 윤달 기념일'); await lunarButton(page, 'save').click(); await poll(async () => (await stored(page, lunarKey))?.anniversaries.length === 1, 'original leap date saved'); const saved = (await stored(page, lunarKey)).anniversaries[0]; assert.deepEqual(saved.lunar, originalLeap); assert.ok((await lunarRow(page, saved.id).innerText()).includes('2026')); assert.ok((await lunarRow(page, saved.id).innerText()).includes(l('yearly.leapFallback', 'ko', { month: 6 })))
  await button(page, tr('shareResult', 'copyLink')).click(); const link = new URL(await page.evaluate(() => navigator.clipboard.readText())); assert.equal(link.searchParams.get('ly'), '2025'); assert.equal(link.searchParams.get('leap'), '1'); assert.equal(link.searchParams.has('name'), false)
  const second = await context.newPage(); await second.clock.setFixedTime(new Date('2026-03-01T03:00:00Z')); await open('lunar-converter', '?mode=lunarToSolar&ly=2024&lm=2&ld=30', second); await poll(async () => (await lunarCurrent(second)).year === '2024', 'shared date wins over saved list'); assert.deepEqual(await lunarCurrent(second), { year: '2024', month: '2', day: '30' }); await loadLunar(second, saved.id); assert.deepEqual(await lunarCurrent(second), { year: '2025', month: 'L6', day: '10' }); await openCalendar(second); assert.equal(await calendarTitle(second).inputValue(), saved.name); assert.equal(await calendar(second).getByRole('checkbox', { checked: true }).count(), 0); assert.deepEqual((await stored(second, lunarKey)).anniversaries[0].lunar, originalLeap); await second.close()
  return { original: saved.lunar, sharedOriginalLeapUrl: link.href, explicitLoadPreservedLeapYear: true, automaticLoad: false }
})
test('lunar-load-ics-reset-real-download-and-late-sha', async args => {
  const { page } = args; await openLunar(args, undefined, [lunarFixture()]); await openCalendar(page); await calendarTitle(page).fill('이전 달력 제목'); await calendarYear(page, 2027).check(); await loadLunar(page, 'leap'); await openCalendar(page); assert.equal(await calendarTitle(page).inputValue(), '윤달 가족 기념일'); assert.equal(await calendar(page).getByRole('checkbox', { checked: true }).count(), 0); assert.ok(await calendarButton(page, 'download').isDisabled()); await calendarYear(page, 2026).check(); const file = await lunarExport(page, 'saved-original-leap-2026.ics'); assert.equal(file.events.length, 1); assert.equal(file.events[0]['DTSTART;VALUE=DATE'], '20260723'); assert.equal(file.events[0].title, '윤달 가족 기념일'); assert.ok(file.events[0].description.includes(l('yearly.leapFallback', 'ko', { month: 6 })))
  await calendarTitle(page).fill('사용자가 편집한 제목'); await calendarYear(page, 2027).check(); let downloads = 0; page.on('download', () => downloads++); await page.evaluate(() => { const original = crypto.subtle.digest.bind(crypto.subtle); window.__digests = []; window.__restoreDigest = () => { crypto.subtle.digest = original }; crypto.subtle.digest = (...args) => new Promise(resolve => window.__digests.push({ args, resolve })); window.__finishDigests = async () => { for (const pending of window.__digests) pending.resolve(await original(...pending.args)) } }); await calendarButton(page, 'download').click(); await poll(() => page.evaluate(() => window.__digests.length > 0), 'SHA waiting'); await loadLunar(page, 'leap'); await openCalendar(page); await page.evaluate(() => window.__finishDigests()); await wait(250); assert.equal(downloads, 0); assert.equal(await calendarTitle(page).inputValue(), '윤달 가족 기념일'); assert.equal(await calendar(page).getByRole('checkbox', { checked: true }).count(), 0); await page.evaluate(() => window.__restoreDigest())
  return { file, explicitYearReselection: true, oldPendingDownloadCancelled: true }
})
test('lunar-rename-delete-limit-and-original-date-boundaries', async args => {
  const { page } = args; const fixtures = [lunarFixture('short', '원 30일', { year: 2024, month: 2, day: 30, isLeap: false }), lunarFixture('first', '지원 첫날', { year: 1900, month: 1, day: 1, isLeap: false }), lunarFixture('last', '지원 마지막날', { year: 2050, month: 11, day: 18, isLeap: false }), ...Array.from({ length: 9 }, (_, index) => lunarFixture(`normal-${index}`, `기념일 ${index}`, { year: 2026, month: 1, day: index + 1, isLeap: false }))]; await openLunar(args, undefined, fixtures); assert.equal(await page.locator('[data-lunar-anniversary]').count(), 12); await lunarName(page).fill('가'.repeat(41)); assert.equal((await lunarName(page).inputValue()).length, 40); assert.ok(await lunarButton(page, 'save').isDisabled()); await openCalendar(page); await calendarTitle(page).fill('수정 유지 제목'); await calendarYear(page, 2026).check(); const before = await lunarCurrent(page)
  await button(lunarRow(page, 'short'), l('savedAnniversaries.rename')).click(); await lunarRow(page, 'short').getByRole('textbox', { name: l('savedAnniversaries.renameLabel'), exact: true }).fill('새 원 30일 이름'); await button(lunarRow(page, 'short'), l('savedAnniversaries.renameConfirm')).click(); await poll(async () => (await stored(page, lunarKey)).anniversaries[0].name === '새 원 30일 이름', 'renamed'); assert.deepEqual(await lunarCurrent(page), before); assert.equal(await calendarTitle(page).inputValue(), '수정 유지 제목'); assert.ok(await calendarYear(page, 2026).isChecked())
  await button(lunarRow(page, 'normal-8'), l('savedAnniversaries.delete')).click(); await button(lunarRow(page, 'normal-8'), l('savedAnniversaries.deleteConfirm')).click(); await poll(async () => await page.locator('[data-lunar-anniversary]').count() === 11, 'deleted'); assert.deepEqual(await lunarCurrent(page), before); assert.equal(await calendarTitle(page).inputValue(), '수정 유지 제목'); assert.ok(await calendarYear(page, 2026).isChecked())
  await loadLunar(page, 'first'); assert.deepEqual(await lunarCurrent(page), { year: '1900', month: '1', day: '1' }); await loadLunar(page, 'last'); assert.deepEqual(await lunarCurrent(page), { year: '2050', month: '11', day: '18' }); await loadLunar(page, 'short'); assert.deepEqual(await lunarCurrent(page), { year: '2024', month: '2', day: '30' }); await lunarButton(page, 'save').click(); await poll(async () => (await stored(page, lunarKey)).anniversaries.length === 12, 'remaining slot filled'); assert.equal((await stored(page, lunarKey)).anniversaries.at(-1).lunar.day, 30); assert.equal((await stored(page, lunarKey)).anniversaries.at(-1).name.length, 40)
  return { limit: 12, nameMax: 40, renameDeletePreservedCalendar: true, firstLastAndOriginal30Loaded: true }
})
test('lunar-invalid-blocked-quota-readback-recovery', async args => {
  const { page } = args; await openLunar(args, undefined, [lunarFixture()]); const good = await raw(page, lunarKey), before = await lunarCurrent(page); await lunarName(page).fill('실패 입력 보존')
  for (const value of ['{broken', JSON.stringify({ version: 99, revision: 'future', anniversaries: [] })]) { await page.evaluate(({ key, value }) => localStorage.setItem(key, value), { key: lunarKey, value }); await lunarButton(page, 'refresh').click(); await lunarPanel(page).getByRole('alert').waitFor(); assert.equal(await raw(page, lunarKey), value); assert.ok(await lunarButton(page, 'save').isDisabled()); assert.deepEqual(await lunarCurrent(page), before) }
  await page.evaluate(({ key, value }) => localStorage.setItem(key, value), { key: lunarKey, value: good }); await lunarButton(page, 'refresh').click(); await lunarStorageFault(page, 'blocked'); await lunarButton(page, 'refresh').click(); await lunarPanel(page).getByRole('alert').waitFor(); await page.evaluate(() => window.__restoreLunarStorage()); assert.equal(await raw(page, lunarKey), good); await lunarButton(page, 'refresh').click()
  await lunarStorageFault(page, 'quota'); await lunarButton(page, 'save').click(); await lunarPanel(page).getByText(l('savedAnniversaries.errors.quota'), { exact: true }).waitFor(); await page.evaluate(() => window.__restoreLunarStorage()); assert.equal(await raw(page, lunarKey), good); assert.equal(await lunarName(page).inputValue(), '실패 입력 보존')
  await lunarStorageFault(page, 'readback'); await lunarButton(page, 'save').click(); await lunarPanel(page).getByText(l('savedAnniversaries.errors.unverified'), { exact: true }).waitFor(); assert.equal(await lunarName(page).inputValue(), '실패 입력 보존'); await page.evaluate(() => window.__restoreLunarStorage()); const actuallyWritten = await stored(page, lunarKey); assert.equal(actuallyWritten.anniversaries.length, 2); await lunarButton(page, 'refresh').click(); assert.equal(await page.locator('[data-lunar-anniversary]').count(), 2); assert.deepEqual(await lunarCurrent(page), before)
  return { invalidAndFuturePreserved: true, blockedAndQuotaPreserved: true, readbackFailureHonestAboutActualWrite: true }
})
test('lunar-two-tab-conflict-and-pending-lock-cancel', async args => {
  const { page, context, open } = args; await openLunar(args, undefined, [lunarFixture()]); const second = await context.newPage(); await second.clock.setFixedTime(new Date('2026-03-01T03:00:00Z')); await open('lunar-converter', '?mode=lunarToSolar&ly=2026&lm=1&ld=1', second); await lunarName(second).fill('오래된 탭 이름'); await lunarName(page).fill('첫 탭 추가'); await lunarButton(page, 'save').click(); await poll(async () => (await stored(page, lunarKey)).anniversaries.length === 2, 'first tab stored'); await lunarPanel(second).getByText(l('savedAnniversaries.errors.conflict'), { exact: true }).waitFor(); assert.ok(await lunarButton(second, 'save').isDisabled()); assert.equal(await lunarName(second).inputValue(), '오래된 탭 이름'); await lunarButton(second, 'refresh').click(); assert.equal(await second.locator('[data-lunar-anniversary]').count(), 2)
  const before = await raw(second, lunarKey); await holdLock(page, lunarKey); await lunarButton(second, 'save').click(); await lunarButton(second, 'cancelPending').waitFor(); await lunarButton(second, 'cancelPending').click(); await releaseLock(page); await wait(150); assert.equal(await raw(second, lunarKey), before)
  await holdLock(page, lunarKey); await button(lunarRow(second, 'leap'), l('savedAnniversaries.load')).click(); await button(lunarRow(second, 'leap'), l('savedAnniversaries.loadConfirm')).click(); await lunarButton(second, 'cancelPending').waitFor(); await lunarInput(second, 'day').selectOption('2'); await releaseLock(page); await wait(150); assert.deepEqual(await lunarCurrent(second), { year: '2026', month: '1', day: '2' }); assert.equal(await raw(second, lunarKey), before); await second.close()
  return { actualTwoTabs: true, waitingSaveCancelled: true, pendingLoadDidNotOverwriteNewInput: true }
})
test('lunar-copy-recovery-and-320-dark-english', async args => {
  const { page } = args; await openLunar(args, '?mode=lunarToSolar&ly=2025&lm=6&ld=10&leap=1', [lunarFixture()], 'en'); await clipboardFault(page, 'reject')
  const recoveries = []
  for (const target of ['result', 'table']) { await page.locator(`[data-lunar-copy="${target}"]`).click(); const recovery = page.locator(`[data-lunar-copy-recovery="${target}"]`); await recovery.waitFor(); const field = recovery.locator('textarea'); assert.equal(await field.getAttribute('readonly'), ''); const text = await field.inputValue(); assert.ok(text.length > 0); await button(recovery, l('copyRecovery.select', 'en')).click(); assert.deepEqual(await field.evaluate(node => [node.selectionStart, node.selectionEnd]), [0, text.length]); recoveries.push({ target, length: text.length }); if (target === 'result') await button(recovery, l('copyRecovery.close', 'en')).click() }
  await clipboardFault(page, 'defer'); await page.locator('[data-lunar-copy="result"]').click(); await poll(() => page.evaluate(() => window.__copyPending.length === 1), 'pending copy'); await lunarInput(page, 'day', 'en').selectOption('11'); await page.evaluate(() => window.__copyPending[0].reject(new Error('Old copy failed'))); await wait(150); assert.equal(await page.evaluate(() => window.__copyFallbacks), 0); assert.equal(await page.locator('[data-lunar-copy-recovery]').count(), 0)
  await clipboardFault(page, 'absent'); await page.locator('[data-lunar-copy="result"]').click(); const recovery = page.locator('[data-lunar-copy-recovery="result"]'); await recovery.waitFor(); const geometry = await mobile(page, [lunarName(page), lunarInput(page, 'year', 'en'), recovery.locator('textarea')], [lunarButton(page, 'refresh', 'en'), button(recovery, l('copyRecovery.select', 'en')), button(recovery, l('copyRecovery.retry', 'en'))]); await screenshot(page, 'lunar-records-english-320-dark', lunarPanel(page)); await recovery.screenshot({ path: resolve(out, 'lunar-copy-recovery-english-320-dark.png'), caret: 'initial' }); return { recoveries, geometry, staleFallbackBlocked: true }
}, { width: 320, dark: true, language: 'en' })

const speakingRow = (page, id) => page.locator(`[data-speaking-record="${id}"]`)
const speakingTitle = page => page.locator('#speaking-session-title')
const speakingText = page => page.locator('#speaking-transcript')
const speakingSave = page => page.locator('[data-speaking-save]')
const speakingRefresh = page => page.locator('[data-speaking-refresh]')
async function openSpeaking(args, fixtures = [speakingFixture()]) {
  await args.page.goto(`${base}/robots.txt`, { waitUntil: 'domcontentloaded' }); await seedSpeaking(args.page, fixtures)
  await args.open('speaking-practice'); await speakingRefresh(args.page).waitFor(); const expected = fixtures.filter(record => record.version === 1 && Array.isArray(record.takes)).length
  await poll(async () => !await speakingRefresh(args.page).isDisabled() && await args.page.locator('[data-speaking-record]').count() === expected, 'speaking list loaded')
}
async function loadSpeaking(page, id, language = 'ko') { await button(speakingRow(page, id), s('open', language)).click(); await speakingText(page).waitFor() }
async function saveSpeaking(page, id, previousRevision) {
  await speakingSave(page).click(); await poll(async () => { const record = (await speakingData(page)).find(record => record.id === id); return !!record?.revision && record.revision !== previousRevision }, 'speaking transaction committed')
  await poll(async () => !await speakingSave(page).isDisabled(), 'speaking save UI settled')
  return (await speakingData(page)).find(record => record.id === id)
}
test('speaking-native-v1-blob-no-migration-and-revision-save', async args => {
  const { page, open } = args; await openSpeaking(args); const before = await speakingData(page); assert.equal(before.length, 1); assert.equal(Object.hasOwn(before[0], 'title'), false); assert.equal(Object.hasOwn(before[0], 'revision'), false)
  await loadSpeaking(page, 'legacy-1'); assert.equal(await speakingTitle(page).inputValue(), ''); assert.equal(await speakingText(page).inputValue(), before[0].takes[1].transcript); assert.deepEqual(await speakingData(page), before, 'reading legacy v1 does not migrate')
  await button(page, s('take', 'ko', { number: 1 })).click(); await page.getByTestId('speaking-feedback').waitFor(); assert.ok((await page.getByTestId('speaking-feedback').innerText()).includes(feedback.strength)); assert.deepEqual(await speakingData(page), before)
  await speakingTitle(page).fill('  첫 번째 발표 연습  '); const saved = await saveSpeaking(page, 'legacy-1'); assert.equal(saved.title, '첫 번째 발표 연습'); assert.deepEqual(saved.takes, before[0].takes); assert.ok(saved.revision); assert.equal(saved.version, 1)
  await open('speaking-practice'); assert.equal(await speakingText(page).count(), 0, 'new visit does not auto-load stored practice'); await loadSpeaking(page, 'legacy-1'); assert.equal(await speakingTitle(page).inputValue(), saved.title); assert.deepEqual(await speakingData(page), [saved])
  return { nativeIndexedDbVersion: 1, beforeHadTitle: false, beforeHadRevision: false, afterRevision: saved.revision, takes: saved.takes.length, audioBytesEach: audioBytes.length, feedbackPreserved: true }
})
test('speaking-name-all-take-search-mode-and-new-visit', async args => {
  const { page } = args; const intro = speakingFixture('intro-1', { title: '같은 연습 이름', revision: 'intro-first' }), report = speakingFixture('report-1', { mode: 'report', title: '같은 연습 이름', revision: 'report-first', takes: [{ id: 'report-take', createdAt: fixtureTime, seconds: null, transcript: '업무만 검색하는 보고 내용입니다.' }] })
  await openSpeaking(args, [intro, report]); await loadSpeaking(page, 'intro-1'); await speakingText(page).fill('검색을 바꿔도 보존할 현재 원고'); await speakingTitle(page).fill('아직 저장하지 않은 제목'); const current = { title: await speakingTitle(page).inputValue(), text: await speakingText(page).inputValue() }
  const search = page.locator('#speaking-history-search'), filter = page.locator('#speaking-history-filter')
  await search.fill('같은 연습'); assert.equal(await page.locator('[data-speaking-record]').count(), 2)
  await search.fill('  orchid  '); assert.equal(await page.locator('[data-speaking-record]').count(), 1); await speakingRow(page, 'intro-1').waitFor()
  await search.fill('프로젝트를 완료'); assert.equal(await page.locator('[data-speaking-record]').count(), 1, 'search includes first unselected take')
  await search.fill(''); await filter.selectOption('report'); assert.equal(await page.locator('[data-speaking-record]').count(), 1); await speakingRow(page, 'report-1').waitFor(); await search.fill('없는 검색어'); assert.equal(await page.locator('[data-speaking-record]').count(), 0)
  await changeLanguage(page, 'en'); await poll(async () => await page.locator('main h1').innerText() === s('title', 'en'), 'English speaking scope loaded'); assert.equal(await speakingTitle(page).inputValue(), current.title); assert.equal(await speakingText(page).inputValue(), current.text)
  await changeLanguage(page, 'ko'); await search.fill(''); await filter.selectOption('all'); await speakingTitle(page).fill(''); const saved = await saveSpeaking(page, 'intro-1', 'intro-first'); assert.equal(Object.hasOwn(saved, 'title'), false); assert.equal(saved.takes[1].transcript, current.text)
  await button(page, s('newSession')).click(); await button(page, s('textTake')).click(); await speakingTitle(page).fill('같은 연습 이름'); await speakingText(page).fill('새 ID로 처음 저장한 수동 연습'); await speakingSave(page).click(); await poll(async () => (await speakingData(page)).length === 3, 'new absent record created'); const created = (await speakingData(page)).find(record => !['intro-1', 'report-1'].includes(record.id)); assert.ok(created?.revision); assert.equal(created.title, '같은 연습 이름'); assert.equal(created.takes[0].transcript, '새 ID로 처음 저장한 수동 연습'); await args.open('speaking-practice'); assert.equal(await speakingText(page).count(), 0); await loadSpeaking(page, created.id); assert.equal(await speakingTitle(page).inputValue(), created.title); assert.equal(await speakingText(page).inputValue(), created.takes[0].transcript); return { duplicateNamesRemainSeparate: true, searchedAllTakes: true, currentDraftSurvivedFiltersAndLanguage: true, optionalBlankTitleOmitted: true, nativeNewIdCreated: created.id, newPracticeRevisit: true }
})
test('speaking-current-practice-text-audio-and-summary-export', async args => {
  const { page, context, open } = args; await openSpeaking(args); await loadSpeaking(page, 'legacy-1'); await speakingTitle(page).fill('텍스트에만 포함할 이름'); await page.getByTestId('speaking-comparison').waitFor(); assert.equal(await page.locator('audio[data-speaking-audio]').count() >= 2, true)
  const audio = await download(page, () => button(page, s('exportAudio')).click(), 'speaking-take-2.wav'); assert.equal(audio.filename, 'toolhub-speaking-2.wav'); assert.deepEqual(audio.bytes, audioBytes)
  const txt = await download(page, () => button(page, s('exportText')).click(), 'speaking-two-takes.txt'); assert.deepEqual([...txt.bytes.subarray(0, 3)], [239, 187, 191]); assert.ok(txt.text.includes('텍스트에만 포함할 이름')); assert.ok(txt.text.includes(feedback.strength)); assert.ok(txt.text.includes('ORCHID')); assert.ok(txt.text.includes('프로젝트를 완료했습니다.'))
  await page.locator('summary').filter({ hasText: s('shareTitle') }).click(); await button(page, tr('shareResult', 'copyLink')).click(); const link = new URL(await page.evaluate(() => navigator.clipboard.readText())); assert.deepEqual([...link.searchParams.keys()].sort(), ['mode', 'seconds', 'summary', 'words']); assert.equal(link.searchParams.get('summary'), '1'); assert.equal(link.searchParams.get('seconds'), '55'); assert.equal(decodeURIComponent(link.href).includes('텍스트'), false)
  const second = await context.newPage(); await open('speaking-practice', link.search, second); await second.getByRole('region', { name: s('sharedSummary'), exact: true }).waitFor(); assert.equal(await speakingText(second).count(), 0); await second.close()
  await button(page, s('textTake')).click(); await speakingText(page).fill('저는 새 원고를 직접 입력했습니다.'); await page.getByTestId('speaking-basic-check').waitFor(); await page.getByTestId('speaking-comparison').waitFor(); const saved = await saveSpeaking(page, 'legacy-1'); assert.equal(saved.takes.length, 3); assert.deepEqual(saved.takes[0].feedback, feedback); assert.deepEqual(saved.takes[0].audio.bytes, [...audioBytes])
  return { textFilename: txt.filename, audioFilename: audio.filename, audioByteLength: audio.bytes.length, summaryKeys: [...link.searchParams.keys()], manualThirdTake: true }
})
test('speaking-two-tab-save-delete-cas-conflicts', async args => {
  const { page, context, open } = args; await openSpeaking(args, [speakingFixture('same', { title: '시작', revision: 'r1' })]); await loadSpeaking(page, 'same'); const second = await context.newPage(); await open('speaking-practice', '', second); await loadSpeaking(second, 'same')
  await speakingTitle(page).fill('첫 탭 저장'); const first = await saveSpeaking(page, 'same', 'r1'); await speakingTitle(second).fill('두 번째 탭 원고 보존'); await speakingSave(second).click(); await second.locator('main').getByRole('alert').first().waitFor(); assert.equal(await speakingTitle(second).inputValue(), '두 번째 탭 원고 보존'); assert.deepEqual(await speakingData(page), [first])
  await button(speakingRow(second, 'same'), s('remove')).click(); await second.locator('main').getByRole('alert').first().waitFor(); assert.deepEqual(await speakingData(page), [first], 'stale delete cannot remove newer revision')
  await speakingRefresh(second).click(); await poll(async () => (await speakingRow(second, 'same').innerText()).includes('첫 탭 저장'), 'latest history refreshed'); await speakingSave(second).click(); await second.locator('main').getByRole('alert').first().waitFor(); assert.deepEqual(await speakingData(page), [first], 'refresh alone must not advance current editing basis')
  await loadSpeaking(second, 'same'); assert.equal(await speakingTitle(second).inputValue(), first.title); await speakingTitle(second).fill('명시 재불러온 두 번째 탭'); const secondSave = await saveSpeaking(second, 'same', first.revision); assert.notEqual(secondSave.revision, first.revision); await second.close()
  return { firstRevision: first.revision, secondRevision: secondSave.revision, staleSaveAndDeleteBlocked: true, refreshDidNotAdvanceEditingBasis: true }
})
test('speaking-native-transaction-abort-quota-and-list-recovery', async args => {
  const { page } = args; await openSpeaking(args); await loadSpeaking(page, 'legacy-1'); const before = await speakingData(page); await speakingTitle(page).fill('실패해도 보존할 이름'); await speakingText(page).fill('실패해도 보존할 입력 원고')
  const evidence = []
  for (const mode of ['abort-write', 'quota']) { await idbFault(page, mode); await speakingSave(page).click(); await page.locator('main').getByRole('alert').first().waitFor(); await poll(async () => !await speakingSave(page).isDisabled(), `${mode} settled`); evidence.push({ mode, events: await page.evaluate(() => window.__idbEvents), alert: await page.locator('main').getByRole('alert').allTextContents() }); assert.ok(evidence.at(-1).alert.includes(s(mode === 'abort-write' ? 'errors.storageAborted' : 'errors.storageQuota')), JSON.stringify(evidence.at(-1))); await page.evaluate(() => window.__restoreIdb()); assert.deepEqual(await speakingData(page), before); assert.equal(await speakingTitle(page).inputValue(), '실패해도 보존할 이름'); assert.equal(await speakingText(page).inputValue(), '실패해도 보존할 입력 원고') }
  assert.ok(evidence[0].events.some(event => event.event === 'abort' && event.mode === 'readwrite'))
  await idbFault(page, 'list-failure'); await speakingRefresh(page).click(); await page.locator('main').getByRole('alert').first().waitFor(); await page.evaluate(() => window.__restoreIdb()); await speakingRefresh(page).click(); await speakingRow(page, 'legacy-1').waitFor(); const saved = await saveSpeaking(page, 'legacy-1'); assert.equal(saved.title, '실패해도 보존할 이름'); assert.equal(saved.takes[1].transcript, '실패해도 보존할 입력 원고')
  return { failureInjection: evidence, nativeAbortWasObserved: true, originalRecordPreservedUntilRetry: true }
})
test('speaking-commit-success-list-failure-and-late-completion', async args => {
  const { page } = args; await openSpeaking(args); await loadSpeaking(page, 'legacy-1'); await speakingTitle(page).fill('저장 성공 목록 실패'); await idbFault(page, 'commit-list-failure'); await speakingSave(page).click(); await poll(async () => await page.evaluate(() => window.__idbEvents.some(event => event.event === 'injected-list-error')), 'list read failed after native commit'); await poll(async () => !await speakingSave(page).isDisabled(), 'partial UI settled'); const message = await page.locator('body').innerText(); const events = await page.evaluate(() => window.__idbEvents); await page.evaluate(() => window.__restoreIdb()); const committed = (await speakingData(page))[0]; assert.equal(committed.title, '저장 성공 목록 실패'); assert.ok(committed.revision)
  await speakingTitle(page).fill('저장 기준 유지 후 두 번째 저장'); const next = await saveSpeaking(page, 'legacy-1', committed.revision); assert.notEqual(next.revision, committed.revision)
  await holdSpeakingTransaction(page); await speakingTitle(page).fill('대기 시작 시 이름'); await speakingSave(page).click(); await poll(async () => await speakingSave(page).isDisabled(), 'save waits on actual readwrite transaction'); assert.equal(await speakingTitle(page).isEnabled(), true); assert.equal(await speakingText(page).isEnabled(), true); await speakingTitle(page).fill('대기 중 새로 쓴 이름'); await speakingText(page).fill('대기 중 수정한 최신 원고'); await releaseSpeakingTransaction(page); await poll(async () => !await speakingSave(page).isDisabled(), 'pending save committed'); const snapshot = (await speakingData(page))[0]; assert.equal(snapshot.title, '대기 시작 시 이름'); assert.equal(await speakingTitle(page).inputValue(), '대기 중 새로 쓴 이름'); assert.equal(await speakingText(page).inputValue(), '대기 중 수정한 최신 원고'); await page.getByText(s('unsaved'), { exact: true }).waitFor(); const final = await saveSpeaking(page, 'legacy-1', snapshot.revision); assert.equal(final.title, '대기 중 새로 쓴 이름'); assert.equal(final.takes[1].transcript, '대기 중 수정한 최신 원고')
  return { nativeCommitThenListError: events, partialSuccessMessage: message.split('\n').filter(line => /목록|저장/.test(line)), nextSaveUsedCommittedBasis: true, pendingInputPreserved: true }
})
test('speaking-corrupt-physical-limits-and-320-dark-english', async args => {
  const { page } = args; const records = Array.from({ length: 18 }, (_, index) => speakingFixture(`limit-${index}`, { title: `보존 기록 ${index + 1}`, revision: `r-${index}` })); records[0].takes = Array.from({ length: 5 }, (_, index) => ({ id: `five-${index}`, createdAt: fixtureTime + index, seconds: null, transcript: `5회 한도 원고 ${index + 1}` })); records.push({ id: 'broken', version: 1, takes: 'corrupt raw' }, { id: 'future', version: 2, futureValue: 'preserve' })
  await openSpeaking(args, records); assert.equal(await page.locator('[data-speaking-record]').count(), 18); assert.equal((await speakingData(page)).length, 20); await loadSpeaking(page, 'limit-0', 'en'); assert.ok(await button(page, s('textTake', 'en')).isDisabled()); await speakingTitle(page).fill('가'.repeat(41)); assert.equal((await speakingTitle(page).inputValue()).length, 40); const updated = await saveSpeaking(page, 'limit-0', 'r-0'); assert.equal(updated.takes.length, 5)
  await button(page, s('newSession', 'en')).click(); await button(page, s('textTake', 'en')).click(); await speakingText(page).fill('20개 한도에서 새 저장 거부'); await speakingTitle(page).fill('한도에서 보존'); await speakingSave(page).click(); await page.locator('main').getByRole('alert').first().waitFor(); const after = await speakingData(page); assert.equal(after.length, 20); assert.deepEqual(after.find(record => record.id === 'broken'), records[18]); assert.deepEqual(after.find(record => record.id === 'future'), records[19]); assert.equal(await speakingText(page).inputValue(), '20개 한도에서 새 저장 거부')
  const geometry = await mobile(page, [speakingTitle(page), speakingText(page), page.locator('#speaking-history-search'), page.locator('#speaking-history-filter')], [speakingSave(page), speakingRefresh(page)]); await screenshot(page, 'speaking-records-english-320-dark', page.getByRole('region', { name: s('historyTitle', 'en'), exact: true }).locator('> div').first()); return { geometry, physicalRecords: after.length, displayedValidRecords: 18, corruptAndUnsupportedPreserved: true }
}, { width: 320, dark: true, language: 'en' })

test('lunar-pending-load-calendar-title-and-year-edit-preserved', async args => {
  const { page } = args; await openLunar(args, undefined, [lunarFixture()]); await openCalendar(page); await calendarTitle(page).fill('기존 달력 제목'); await calendarYear(page, 2026).check(); const before = await lunarCurrent(page), beforeRaw = await raw(page, lunarKey)
  const pendingLoad = async () => { await holdLock(page, lunarKey); await button(lunarRow(page, 'leap'), l('savedAnniversaries.load')).click(); await button(lunarRow(page, 'leap'), l('savedAnniversaries.loadConfirm')).click(); await lunarButton(page, 'cancelPending').waitFor() }
  await pendingLoad(); await calendarTitle(page).fill('잠금 대기 중 새로 편집한 제목'); await releaseLock(page); await wait(150); assert.deepEqual(await lunarCurrent(page), before); assert.equal(await calendarTitle(page).inputValue(), '잠금 대기 중 새로 편집한 제목'); assert.ok(await calendarYear(page, 2026).isChecked()); assert.equal(await raw(page, lunarKey), beforeRaw)
  await pendingLoad(); await calendarYear(page, 2027).check(); await releaseLock(page); await wait(150); assert.deepEqual(await lunarCurrent(page), before); assert.equal(await calendarTitle(page).inputValue(), '잠금 대기 중 새로 편집한 제목'); assert.ok(await calendarYear(page, 2026).isChecked()); assert.ok(await calendarYear(page, 2027).isChecked())
  await pendingLoad(); await calendarButton(page, 'clearSelection').click(); await releaseLock(page); await wait(150); assert.deepEqual(await lunarCurrent(page), before); assert.equal(await calendar(page).getByRole('checkbox', { checked: true }).count(), 0); assert.equal(await calendarTitle(page).inputValue(), '잠금 대기 중 새로 편집한 제목'); assert.equal(await raw(page, lunarKey), beforeRaw)
  await loadLunar(page, 'leap'); await openCalendar(page); assert.deepEqual(await lunarCurrent(page), { year: '2025', month: 'L6', day: '10' }); assert.equal(await calendarTitle(page).inputValue(), '윤달 가족 기념일'); assert.equal(await calendar(page).getByRole('checkbox', { checked: true }).count(), 0)
  return { nativeWebLock: true, pendingTitleEditPreserved: true, pendingYearSelectionPreserved: true, pendingClearSelectionPreserved: true, laterExplicitLoadWorks: true }
})

if (only === '--list') { console.log(planned.join('\n')) }
else {
  assert.ok(cases.length > 0, 'No browser cases registered.')
  mkdirSync(out, { recursive: true }); const browser = await chromium.launch({ channel: 'chrome' })
  try { for (const scenario of cases) await run(browser, scenario) }
  finally { await browser.close(); const merged = readdirSync(out).filter(name => name.endsWith('-evidence.json')).map(name => JSON.parse(readFileSync(resolve(out, name), 'utf8'))); const final = { checkedAt: new Date().toISOString(), passed: merged.filter(item => item.status === 'pass').length, failed: merged.filter(item => item.status === 'fail').length, results: merged }; writeFileSync(resolve(out, 'final-results.json'), JSON.stringify(final, null, 2)); console.log(JSON.stringify({ passed: final.passed, failed: final.failed, browserClosed: true })) }
  if (results.some(item => item.status !== 'pass')) process.exitCode = 1
}
