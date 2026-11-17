import { chromium } from 'playwright'
import assert from 'node:assert/strict'
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

const base = process.env.VERIFY_BASE_URL || 'http://127.0.0.1:3039'
const out = resolve('docs/verify/2026-11-17-repeat-batch16/browser')
const only = process.argv[2]
const messages = Object.fromEntries(['ko', 'en'].map(language => [language, JSON.parse(readFileSync(`messages/${language}.json`, 'utf8'))]))
const tr = (ns, key, values = {}, language = 'ko') => {
  const value = key.split('.').reduce((object, key) => object?.[key], messages[language][ns])
  assert.equal(typeof value, 'string', `Missing ${language}:${ns}.${key}`)
  return value.replace(/\{(\w+)\}/g, (match, key) => values[key] ?? match)
}
const button = (scope, name) => scope.getByRole('button', { name, exact: true })
const raw = (page, key) => page.evaluate(key => localStorage.getItem(key), key)
const stored = async (page, key) => JSON.parse(await raw(page, key))
const results = []
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
  await context.route('**/*', route => { const url = route.request().url(); if (url.startsWith(base)) return route.continue(); external.push(url); return route.abort() })
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
    if (!/^https?:$/.test(location.protocol) || localStorage.getItem('__batch16Seeded')) return
    for (const [key, value] of Object.entries(values)) localStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value))
    localStorage.setItem('__batch16Seeded', '1')
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
  assert.doesNotMatch(await panel.innerText(), /(?:basis|season|official|practiceLinks)\.[a-z]/)
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

const g = (key, values) => tr('gradeCalc', key, values)
const gradeKey = 'toolhub-grade-records-v1'
const gradePanel = page => page.locator('[data-grade-records]')
const gradeField = (page, field, n = 0) => page.getByRole(field === 'name' ? 'textbox' : 'spinbutton', { name: g(`subjects.${field}`), exact: true }).nth(n)
const gradeSnapshot = { entryYear: 2024, system: 9, rows: [
  { name: '같은 국어', units: '3.5', rank: '1', ties: '7', total: '96' },
  { name: '같은 국어', units: '1.5', rank: '30', ties: '1', total: '100' },
  { name: '편집 중', units: '2', rank: '200', ties: '1', total: '100' },
  { name: '', units: '', rank: '', ties: '', total: '' },
] }
const gradeRecord = (id = 'grade-a', name = '1학기 중간고사', snapshot = gradeSnapshot) => ({ id, name, createdAt: '2026-11-17T00:00:00.000Z', snapshot: structuredClone(snapshot) })
const gradeEnvelope = records => ({ version: 1, revision: 'verification', records })
const gradeName = page => gradePanel(page).getByRole('textbox', { name: g('records.name'), exact: true })
const gb = (page, action) => button(gradePanel(page), g(`records.${action}`))
async function gradeForm(page) {
  const count = await page.getByRole('textbox', { name: g('subjects.name'), exact: true }).count(), rows = []
  for (let i = 0; i < count; i++) { const row = {}; for (const field of ['name', 'units', 'rank', 'ties', 'total']) row[field] = await gradeField(page, field, i).inputValue(); rows.push(row) }
  return { entryYear: Number(await page.locator('#grade-entry-year').inputValue()), system: await button(page, g('settings.system9')).getAttribute('aria-pressed') === 'true' ? 9 : 5, rows }
}
async function fillGrade(page, snapshot) {
  await page.locator('#grade-entry-year').selectOption(String(snapshot.entryYear)); await button(page, g(snapshot.system === 9 ? 'settings.system9' : 'settings.system5')).click(); await button(page, g('input.reset')).click()
  for (let i = 0; i < snapshot.rows.length; i++) { if (i) await button(page, g('subjects.add')).click(); for (const [field, value] of Object.entries(snapshot.rows[i])) await gradeField(page, field, i).fill(value) }
}
async function openGrade(args, query = '', records) {
  if (records) await seed(args.context, { [gradeKey]: gradeEnvelope(records) })
  await args.open('grade-calculator', query); await gradePanel(args.page).waitFor(); await poll(async () => /[?&]sys=/.test(args.page.url()), 'grade URL restored')
}
async function selectGrade(page, id = 'grade-a') { await gradePanel(page).getByRole('combobox', { name: g('records.savedList'), exact: true }).selectOption(id) }
async function loadGrade(page, id = 'grade-a') { await selectGrade(page, id); await gb(page, 'load').click(); await gb(page, 'confirmLoad').click(); await gradePanel(page).getByRole('status').waitFor() }
async function saveGrade(page, name) { await gradeName(page).fill(name); await gb(page, 'save').click(); await gradePanel(page).getByRole('status').waitFor() }
async function hold(page, key) { await page.evaluate(key => { window.__holdPromise = navigator.locks.request(key, async () => { window.__held = true; await new Promise(resolve => { window.__release = resolve }) }) }, key); await poll(async () => await page.evaluate(() => window.__held), 'Web Lock held') }
async function release(page) { await page.evaluate(async () => { window.__release(); await window.__holdPromise; window.__held = false }) }
async function inputSizes(panel) { const sizes = await panel.locator('input:not([type="checkbox"]),select,button').evaluateAll(elements => elements.filter(element => element.getBoundingClientRect().height).map(element => ({ tag: element.tagName, text: element.textContent.slice(0, 45), height: element.getBoundingClientRect().height, font: parseFloat(getComputedStyle(element).fontSize) }))); for (const value of sizes) { assert.ok(value.height >= 44, `Height ${JSON.stringify(value)}`); if (value.tag !== 'BUTTON') assert.ok(value.font >= 16, `Font ${JSON.stringify(value)}`) } }
async function blockRead(page, key) { await page.evaluate(key => { const get = Storage.prototype.getItem; window.__restoreRead = () => { Storage.prototype.getItem = get }; Storage.prototype.getItem = function(name) { if (name === key) throw new DOMException('Read blocked', 'SecurityError'); return get.call(this, name) }; window.dispatchEvent(new StorageEvent('storage', { key })) }, key) }
async function unconfirmWrite(page, key) { await page.evaluate(key => { const get = Storage.prototype.getItem, set = Storage.prototype.setItem; let wrote = false; window.__restoreConfirm = () => { Storage.prototype.getItem = get; Storage.prototype.setItem = set }; Storage.prototype.setItem = function(name, value) { const result = set.call(this, name, value); if (name === key) wrote = true; return result }; Storage.prototype.getItem = function(name) { if (name === key && wrote) throw new DOMException('Readback unavailable', 'SecurityError'); return get.call(this, name) } }, key) }

const c = (key, values) => tr('csatGrade', key, values)
const csatKey = 'toolhub-csat-score-records-v1'
const csatPanel = page => page.locator('section[aria-labelledby="csat-score-records-title"]')
const cb = (page, action) => button(csatPanel(page), c(`records.${action}`))
const csatSnapshot = { examYear: 2027, referenceYear: 2026, scores: { kor: '85', math: '', eng: '', hist: '40', inq1: '44', inq2: '41' }, selection: { kor: 'lm', math: 'calc', inq1: 'society', inq2: 'ethics' } }
const csatRecord = (id = 'csat-a', name = '6월 모의고사', snapshot = csatSnapshot) => ({ id, name, createdAt: '2026-11-17T00:00:00.000Z', snapshot: structuredClone(snapshot) })
const csatEnvelope = records => ({ version: 1, revision: 'verification', records })
const csatName = page => page.locator('#csat-score-record-name')
const csatSelect = (page, id = 'csat-a') => page.locator('#csat-score-record-select').selectOption(id)
const csatCompare = (page, field) => csatPanel(page).locator(`[data-score-field="${field}"]`)
const csatSubject = (page, field) => page.getByRole('combobox', { name: c('u.selectAria', { s: c(field === 'kor' ? 'subjects.korean' : field === 'math' ? 'subjects.math' : field === 'inq1' ? 'u.inq1' : 'u.inq2') }), exact: true })
async function csatForm(page) { const scores = {}, selection = {}; for (const id of ['kor', 'math', 'eng', 'hist', 'inq1', 'inq2']) scores[id] = await page.locator(`#csat-${id}`).inputValue(); for (const id of ['kor', 'math', 'inq1', 'inq2']) selection[id] = await csatSubject(page, id).inputValue(); return { scores, selection } }
async function fillCsat(page, snapshot) { for (const [id, value] of Object.entries(snapshot.scores)) await page.locator(`#csat-${id}`).fill(value); for (const [id, value] of Object.entries(snapshot.selection)) await csatSubject(page, id).selectOption(value) }
async function openCsat(args, query = '', records) { if (records) await seed(args.context, { [csatKey]: csatEnvelope(records) }); await args.open('csat-grade', query); await csatPanel(args.page).waitFor(); await poll(async () => /[?&]kor=/.test(args.page.url()) && await csatPanel(args.page).getByText(c('records.loading'), { exact: true }).count() === 0, 'CSAT storage and URL ready') }
async function csatConfirm(page, action) { await cb(page, action).click(); await cb(page, `confirm.${action}Action`).click() }
async function loadCsat(page, id = 'csat-a') { await csatSelect(page, id); await csatConfirm(page, 'load'); await csatPanel(page).getByRole('status').waitFor() }
async function saveCsat(page, name) { await csatName(page).fill(name); await csatConfirm(page, 'save'); await csatPanel(page).getByRole('status').waitFor() }

try {
  await run('grade-records-save-restore-raw-rows-weighted-calculation-and-delete', async args => {
    const { page, open } = args; await openGrade(args); shape('gradeCalc', 'records'); await fillGrade(page, gradeSnapshot); await saveGrade(page, '동석차와 편집 입력'); const record = (await stored(page, gradeKey)).records[0]; assert.deepEqual(record.snapshot, gradeSnapshot)
    assert.match(await gradePanel(page).innerText(), /9등급제.*유효 2과목\/5단위/); assert.match(await page.locator('p[aria-live="polite"]').first().innerText(), /2.60/)
    await open('grade-calculator'); await gradePanel(page).waitFor(); assert.notDeepEqual(await gradeForm(page), gradeSnapshot, 'saved record is not automatically restored'); await selectGrade(page, record.id); const current = await gradeForm(page); await gb(page, 'load').click(); await gb(page, 'cancel').click(); assert.deepEqual(await gradeForm(page), current)
    await loadGrade(page, record.id); assert.deepEqual(await gradeForm(page), gradeSnapshot); assert.match(await page.locator('p[aria-live="polite"]').first().innerText(), /2.60/)
    await page.locator('#grade-entry-year').selectOption('2026'); assert.match(await page.locator('p[aria-live="polite"]').first().innerText(), /1.30/); await saveGrade(page, '5등급제 새 학기'); assert.equal((await stored(page, gradeKey)).records[1].snapshot.system, 5)
    await loadGrade(page, record.id); await button(page, g('subjects.add')).click(); await gradeField(page, 'name', 4).fill('추가 행'); await gradeField(page, 'rank', 1).fill('31'); await button(page, g('subjects.remove')).nth(0).click(); const edited = await gradeForm(page); assert.equal(edited.rows.length, 4); assert.equal(edited.rows[0].rank, '31'); assert.equal(edited.rows[3].name, '추가 행'); assert.equal(edited.rows[2].rank, '')
    await selectGrade(page, record.id); await gb(page, 'delete').click(); await gb(page, 'confirmDelete').click(); await poll(async () => (await stored(page, gradeKey)).records.length === 1, 'record deleted'); assert.deepEqual(await gradeForm(page), edited)
  })
  await run('grade-records-share-url-priority-and-mobile-eight-record-limit', async args => {
    const { page, context, open } = args; const records = Array.from({ length: 8 }, (_, i) => gradeRecord(`grade-${i}`, i ? `시험 ${i}` : '가'.repeat(40))); const query = new URLSearchParams({ y: '2023', sys: '9', s: '공유 과목~2~3~2~100|다른 과목~4~20~1~100' }); await openGrade(args, '?' + query, records)
    await poll(async () => await gradeField(page, 'name').inputValue() === '공유 과목', 'shared rows restored'); assert.equal(await page.locator('#grade-entry-year').inputValue(), '2023'); const current = await gradeForm(page); await selectGrade(page, 'grade-0'); assert.deepEqual(await gradeForm(page), current)
    await gradeName(page).fill('나'.repeat(41)); assert.equal((await gradeName(page).inputValue()).length, 40); assert.ok(await gb(page, 'save').isDisabled()); await mobile(page, gradePanel(page), 'grade-records'); await inputSizes(gradePanel(page)); assert.doesNotMatch(await gradePanel(page).innerText(), /records\.[a-z]/)
    await button(page, tr('shareResult', 'copyLink')).click(); const link = await page.evaluate(() => navigator.clipboard.readText()); const second = await context.newPage(); await open('grade-calculator', new URL(link).search, second); await poll(async () => await gradeField(second, 'name').inputValue() === '공유 과목', 'copied URL restores before saved records'); assert.deepEqual(await gradeForm(second), current); await second.close()
  }, { width: 320, dark: true, language: 'en' })
  await run('grade-records-corrupt-future-invalid-preserve-and-recover', async args => {
    const { page } = args; const broken = ['{damaged', JSON.stringify({ version: 9, revision: 'future', records: [] }), JSON.stringify(gradeEnvelope([gradeRecord('bad', '잘못된 입력', { ...gradeSnapshot, system: 7 })]))]; await openGrade(args, '', [gradeRecord()]); const form = await gradeForm(page)
    for (const value of broken) { await page.evaluate(({ key, value }) => localStorage.setItem(key, value), { key: gradeKey, value }); await page.reload({ waitUntil: 'domcontentloaded' }); await gradePanel(page).getByRole('alert').waitFor(); assert.equal(await raw(page, gradeKey), value); assert.ok(await gb(page, 'save').isDisabled()); assert.deepEqual(await gradeForm(page), form) }
    await page.evaluate(({ key, value }) => localStorage.setItem(key, JSON.stringify(value)), { key: gradeKey, value: gradeEnvelope([gradeRecord()]) }); await gb(page, 'refresh').click(); await loadGrade(page); assert.deepEqual(await gradeForm(page), gradeSnapshot)
  })
  await run('grade-records-quota-blocked-read-and-unconfirmed-write', async args => {
    const { page } = args; await openGrade(args, '', [gradeRecord()]); await gradeField(page, 'rank').fill('19'); const form = await gradeForm(page), before = await raw(page, gradeKey); await gradeName(page).fill('저장 실패 입력'); await quota(page, gradeKey); await gb(page, 'save').click(); await gradePanel(page).getByText(g('records.errors.quota'), { exact: true }).waitFor(); assert.equal(await raw(page, gradeKey), before); assert.equal(await gradeName(page).inputValue(), '저장 실패 입력'); assert.deepEqual(await gradeForm(page), form); assert.equal(await gradePanel(page).getByRole('status').count(), 0); await page.evaluate(() => window.__restoreStorage()); await gb(page, 'refresh').click()
    await blockRead(page, gradeKey); await gradePanel(page).getByRole('alert').waitFor(); await gb(page, 'refresh').click(); await gradePanel(page).getByText(g('records.errors.unavailable'), { exact: true }).waitFor(); assert.deepEqual(await gradeForm(page), form); await page.evaluate(() => window.__restoreRead()); assert.equal(await raw(page, gradeKey), before); await gb(page, 'refresh').click()
    await unconfirmWrite(page, gradeKey); await gradeName(page).fill('쓰기 확인 불가'); await gb(page, 'save').click(); await gradePanel(page).getByText(g('records.errors.unconfirmed'), { exact: true }).waitFor(); assert.equal(await gradePanel(page).getByRole('status').count(), 0); await page.evaluate(() => window.__restoreConfirm()); assert.equal((await stored(page, gradeKey)).records.length, 2); await gb(page, 'refresh').click(); assert.deepEqual(await gradeForm(page), form)
  })
  await run('grade-records-two-tabs-real-lock-conflict-and-reread', async args => {
    const { page, context, open } = args; await openGrade(args, '', []); const second = await context.newPage(); await open('grade-calculator', '', second); await gradePanel(second).waitFor(); await gradeName(page).fill('탭 A'); await gradeName(second).fill('탭 B'); await hold(page, gradeKey); await gb(page, 'save').click(); await gb(second, 'save').click(); await release(page); await poll(async () => (await stored(page, gradeKey)).records.length === 1, 'one writer committed'); const winner = (await stored(page, gradeKey)).records[0].name, loser = winner === '탭 A' ? second : page; await gradePanel(loser).getByRole('alert').waitFor(); assert.equal(await gradeName(loser).inputValue(), winner === '탭 A' ? '탭 B' : '탭 A'); await gb(loser, 'refresh').click(); await gb(loser, 'save').click(); await poll(async () => (await stored(page, gradeKey)).records.length === 2, 'explicit reread retry'); await second.close()
  })
  await run('grade-records-queued-restore-cancel-input-edit-and-unmount', async args => {
    const { page, context, open } = args; await openGrade(args, '', [gradeRecord()]); const holder = await context.newPage(); await open('grade-calculator', '', holder); await gradePanel(holder).waitFor(); await hold(holder, gradeKey); await selectGrade(page); await gb(page, 'load').click(); await gb(page, 'confirmLoad').click(); await gradeField(page, 'name').fill('기다리는 동안 변경'); const changed = await gradeForm(page); await release(holder); await gradePanel(page).getByText(g('records.errors.changed'), { exact: true }).waitFor(); assert.deepEqual(await gradeForm(page), changed)
    await gb(page, 'refresh').click(); await hold(holder, gradeKey); await selectGrade(page); await gb(page, 'load').click(); await gb(page, 'confirmLoad').click(); await gb(page, 'cancel').click(); await release(holder); await poll(async () => await gradeName(page).isEnabled(), 'cancel settled'); assert.deepEqual(await gradeForm(page), changed)
    const before = await raw(page, gradeKey); await hold(holder, gradeKey); await gradeName(page).fill('떠난 화면 저장'); await gb(page, 'save').click(); await open('csat-grade'); await release(holder); assert.equal(await raw(holder, gradeKey), before); await holder.close()
  })
  await run('csat-records-raw-blank-comparison-save-restore-delete', async args => {
    const { page, context, open } = args; await openCsat(args, '', [csatRecord()]); shape('csatGrade', 'records'); const start = await csatForm(page); await csatSelect(page); assert.deepEqual(await csatForm(page), start); await csatCompare(page, 'kor').getByText(c('records.difference', { value: '-1' }), { exact: true }).waitFor(); await csatCompare(page, 'math').getByText(c('records.reasons.differentSubject'), { exact: true }).waitFor(); await csatCompare(page, 'eng').getByText(c('records.reasons.missingScore'), { exact: true }).waitFor()
    await csatSubject(page, 'math').selectOption('calc'); await csatCompare(page, 'math').getByText(c('records.reasons.missingScore'), { exact: true }).waitFor(); await page.locator('#csat-kor').fill('90'); await csatCompare(page, 'kor').getByText(c('records.difference', { value: '+5' }), { exact: true }).waitFor(); await csatSubject(page, 'kor').selectOption('hj'); await csatCompare(page, 'kor').getByText(c('records.reasons.differentSubject'), { exact: true }).waitFor()
    await fillCsat(page, csatSnapshot); await saveCsat(page, '빈 입력도 보관'); const saved = (await stored(page, csatKey)).records[1]; assert.deepEqual(saved.snapshot, csatSnapshot); await open('csat-grade'); await csatPanel(page).waitFor(); await poll(async () => await page.locator('#csat-math').inputValue() === '80', 'new visit keeps defaults'); await csatSelect(page, saved.id); const current = await csatForm(page); await cb(page, 'load').click(); await cb(page, 'cancel').click(); assert.deepEqual(await csatForm(page), current); await loadCsat(page, saved.id); assert.deepEqual(await csatForm(page), { scores: csatSnapshot.scores, selection: csatSnapshot.selection })
    await button(page, tr('shareResult', 'copyLink')).click(); const blankLink = await page.evaluate(() => navigator.clipboard.readText()); assert.equal(new URL(blankLink).searchParams.get('math'), ''); assert.equal(new URL(blankLink).searchParams.get('eng'), ''); const second = await context.newPage(); await open('csat-grade', new URL(blankLink).search, second); await poll(async () => await second.locator('#csat-math').inputValue() === '', 'empty score stays empty through shared URL'); assert.deepEqual(await csatForm(second), { scores: csatSnapshot.scores, selection: csatSnapshot.selection })
    await open('csat-grade', '?kor=0&eng=', second); await poll(async () => await second.locator('#csat-kor').inputValue() === '0', 'explicit zero preserved'); assert.equal(await second.locator('#csat-eng').inputValue(), ''); await open('csat-grade', '?subject=english&score=', second); await poll(async () => await second.locator('#csat-eng').inputValue() === '', 'legacy blank preserved'); assert.equal(await second.locator('#csat-kor').inputValue(), '84'); await second.close()
    await page.locator('#csat-kor').fill('92'); const edited = await csatForm(page); await csatConfirm(page, 'delete'); await poll(async () => (await stored(page, csatKey)).records.length === 1, 'CSAT record deleted'); assert.deepEqual(await csatForm(page), edited)
  })
  await run('csat-records-url-priority-historical-basis-mobile-twelve-limit', async args => {
    const { page, context, open } = args; const historical = { ...structuredClone(csatSnapshot), examYear: 2026, referenceYear: 2025 }; const records = Array.from({ length: 12 }, (_, i) => csatRecord(`csat-${i}`, i ? `모의고사 ${i}` : '가'.repeat(40), historical)); const query = new URLSearchParams({ kor: '91', math: '87', eng: '88', hist: '37', inq1: '45', inq2: '42', korSel: 'hj', mathSel: 'geo', inq1Type: 'earth1', inq2Type: 'bio1' }); await openCsat(args, '?' + query, records); await poll(async () => await page.locator('#csat-kor').inputValue() === '91', 'shared CSAT score restored'); const current = await csatForm(page); await csatSelect(page, 'csat-0'); assert.deepEqual(await csatForm(page), current); await csatPanel(page).getByText(c('records.differentYear'), { exact: true }).waitFor(); assert.match(await csatPanel(page).innerText(), /2027/); assert.match(await csatPanel(page).innerText(), /2026/); assert.match(await csatPanel(page).innerText(), /2025/); await csatName(page).fill('나'.repeat(41)); assert.equal((await csatName(page).inputValue()).length, 40); assert.ok(await cb(page, 'save').isDisabled()); await mobile(page, csatPanel(page), 'csat-records'); await inputSizes(csatPanel(page)); assert.doesNotMatch(await csatPanel(page).innerText(), /records\.[a-z]/)
    for (const field of ['math', 'eng']) await csatCompare(page, field).screenshot({ path: resolve(out, `csat-comparison-${field}-320-dark.png`), caret: 'initial' })
    await button(page, tr('shareResult', 'copyLink')).click(); const link = await page.evaluate(() => navigator.clipboard.readText()); const second = await context.newPage(); await open('csat-grade', new URL(link).search, second); await poll(async () => await second.locator('#csat-kor').inputValue() === '91', 'copied CSAT URL restores'); assert.deepEqual(await csatForm(second), current); await second.close(); await loadCsat(page, 'csat-0'); assert.equal(await page.locator('#csat-eng').inputValue(), ''); assert.match(await csatPanel(page).innerText(), /2027/); assert.match(await page.locator('#csat-grade-result').innerText(), /2026.*추정/)
  }, { width: 320, dark: true, language: 'en' })
  await run('csat-records-corrupt-future-invalid-preserve-and-recover', async args => {
    const { page } = args; const invalid = structuredClone(csatSnapshot); invalid.scores.hist = '51'; const broken = ['{damaged', JSON.stringify({ version: 2, revision: 'future', records: [] }), JSON.stringify(csatEnvelope([csatRecord('bad', '잘못된 점수', invalid)]))]; await openCsat(args, '', [csatRecord()]); const form = await csatForm(page)
    for (const value of broken) { await page.evaluate(({ key, value }) => localStorage.setItem(key, value), { key: csatKey, value }); await page.reload({ waitUntil: 'domcontentloaded' }); await csatPanel(page).getByRole('alert').waitFor(); assert.equal(await raw(page, csatKey), value); assert.ok(await cb(page, 'save').isDisabled()); assert.deepEqual(await csatForm(page), form) }
    await page.evaluate(({ key, value }) => localStorage.setItem(key, JSON.stringify(value)), { key: csatKey, value: csatEnvelope([csatRecord()]) }); await cb(page, 'refresh').click(); await loadCsat(page); assert.equal(await page.locator('#csat-eng').inputValue(), '')
  })
  await run('csat-records-quota-blocked-read-unverified-write-and-recovery', async args => {
    const { page } = args; await openCsat(args, '', [csatRecord()]); await page.locator('#csat-kor').fill('93'); const form = await csatForm(page), before = await raw(page, csatKey); await csatName(page).fill('저장 실패 점수'); await quota(page, csatKey); await csatConfirm(page, 'save'); await csatPanel(page).getByText(c('records.errors.quota'), { exact: true }).waitFor(); assert.equal(await raw(page, csatKey), before); assert.equal(await csatName(page).inputValue(), '저장 실패 점수'); assert.deepEqual(await csatForm(page), form); assert.equal(await csatPanel(page).getByRole('status').count(), 0); await page.evaluate(() => window.__restoreStorage()); await cb(page, 'refresh').click()
    await blockRead(page, csatKey); await cb(page, 'refresh').click(); await csatPanel(page).getByText(c('records.errors.unavailable'), { exact: true }).waitFor(); assert.deepEqual(await csatForm(page), form); await page.evaluate(() => window.__restoreRead()); assert.equal(await raw(page, csatKey), before); await cb(page, 'refresh').click(); await unconfirmWrite(page, csatKey); await csatName(page).fill('쓰기 확인 불가'); await csatConfirm(page, 'save'); await csatPanel(page).getByText(c('records.errors.unverified'), { exact: true }).waitFor(); assert.equal(await csatPanel(page).getByRole('status').count(), 0); await page.evaluate(() => window.__restoreConfirm()); assert.equal((await stored(page, csatKey)).records.length, 2); await cb(page, 'refresh').click(); assert.deepEqual(await csatForm(page), form)
  })
  await run('csat-records-two-tabs-real-lock-conflict-and-reread', async args => {
    const { page, context, open } = args; await openCsat(args, '', []); const second = await context.newPage(); await open('csat-grade', '', second); await csatPanel(second).waitFor(); await csatName(page).fill('탭 A 점수'); await csatName(second).fill('탭 B 점수'); await cb(page, 'save').click(); await cb(second, 'save').click(); await hold(page, csatKey); await cb(page, 'confirm.saveAction').click(); await cb(second, 'confirm.saveAction').click(); await release(page); await poll(async () => (await stored(page, csatKey)).records.length === 1, 'one CSAT writer committed'); const winner = (await stored(page, csatKey)).records[0].name, loser = winner === '탭 A 점수' ? second : page; await csatPanel(loser).getByRole('alert').waitFor(); assert.equal(await csatName(loser).inputValue(), winner === '탭 A 점수' ? '탭 B 점수' : '탭 A 점수'); await cb(loser, 'refresh').click(); await csatConfirm(loser, 'save'); await poll(async () => (await stored(page, csatKey)).records.length === 2, 'reread allows second CSAT save'); await second.close()
  })
  await run('csat-records-queued-load-cancel-input-change-and-stale-save', async args => {
    const { page, context, open } = args; await openCsat(args, '', [csatRecord()]); const holder = await context.newPage(); await open('csat-grade', '', holder); await csatPanel(holder).waitFor(); await hold(holder, csatKey); await csatSelect(page); await csatConfirm(page, 'load'); await page.locator('#csat-kor').fill('97'); const changed = await csatForm(page); await release(holder); await csatPanel(page).getByText(c('records.errors.stale'), { exact: true }).waitFor(); assert.deepEqual(await csatForm(page), changed)
    await cb(page, 'refresh').click(); await hold(holder, csatKey); await csatSelect(page); await csatConfirm(page, 'load'); await cb(page, 'cancel').click(); await release(holder); assert.deepEqual(await csatForm(page), changed); const before = await raw(page, csatKey); await hold(holder, csatKey); await csatName(page).fill('오래된 저장'); await csatConfirm(page, 'save'); await page.locator('#csat-math').fill('99'); await release(holder); await csatPanel(page).getByText(c('records.errors.stale'), { exact: true }).waitFor(); assert.equal(await raw(page, csatKey), before); assert.equal(await page.locator('#csat-math').inputValue(), '99'); await holder.close()
  })
} finally { await browser.close() }
const latest = new Map()
const runs = readdirSync(out).filter(name => /^results.*\.json$/.test(name)).map(name => ({ name, ...JSON.parse(readFileSync(resolve(out, name), 'utf8')) })).sort((a, b) => a.checkedAt.localeCompare(b.checkedAt))
for (const run of runs) for (const result of run.results) latest.set(result.name, { ...result, sourceRun: run.name })
writeFileSync(resolve(out, 'final-results.json'), JSON.stringify({ base, checkedAt: new Date().toISOString(), total: latest.size, passed: [...latest.values()].filter(result => result.pass).length, results: [...latest.values()] }, null, 2))
if (results.some(result => !result.pass)) process.exitCode = 1

