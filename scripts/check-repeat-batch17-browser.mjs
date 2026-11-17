import { chromium } from 'playwright'
import assert from 'node:assert/strict'
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

const base = process.env.VERIFY_BASE_URL || 'http://127.0.0.1:3039'
const out = resolve('docs/verify/2026-11-17-repeat-batch17/browser')
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
    if (!/^https?:$/.test(location.protocol) || localStorage.getItem('__batch17Seeded')) return
    for (const [key, value] of Object.entries(values)) localStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value))
    localStorage.setItem('__batch17Seeded', '1')
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

const l = (key, values) => tr('lunarConverter', key, values)
const lunarPanel = page => page.locator('#lunar-calendar-export')
const lb = (page, key) => button(lunarPanel(page), l(`calendarExport.${key}`))
const lunarTitle = page => lunarPanel(page).getByRole('textbox', { name: l('calendarExport.eventTitle'), exact: true })
const lunarYear = (page, year) => lunarPanel(page).getByRole('checkbox', { name: new RegExp(`^음력 ${year}년,`) })
const lunarInput = (page, field) => page.getByRole('combobox', { name: l(field), exact: true })
async function openLunar(args, query = '?mode=lunarToSolar&ly=2026&lm=1&ld=1', date = '2026-11-17T03:00:00Z') {
  await args.page.clock.setFixedTime(new Date(date)); await args.open('lunar-converter', query); const params = new URLSearchParams(query), solar = params.get('mode') === 'solarToLunar'; await poll(async () => await lunarInput(args.page, 'year').inputValue() === params.get(solar ? 'sy' : 'ly') && await lunarInput(args.page, 'month').inputValue() === (solar ? params.get('sm') : `${params.get('leap') === '1' ? 'L' : ''}${params.get('lm')}`), 'original date URL hydration settled'); await lunarPanel(args.page).waitFor({ state: 'attached' }); if (!await lunarPanel(args.page).evaluate(element => element.open)) await lunarPanel(args.page).locator('summary').click(); await lunarTitle(args.page).waitFor(); await poll(async () => await lunarPanel(args.page).getByRole('checkbox').count() === 11, '11 candidate lunar years rendered')
}
const unescapeIcs = text => text.replace(/\\([nN,;\\])/g, (_, character) => /n/i.test(character) ? '\n' : character)
function parseIcs(bytes) {
  const text = new TextDecoder('utf-8', { fatal: true }).decode(bytes); assert.equal(bytes.subarray(0, 3).equals(Buffer.from([239, 187, 191])), false); assert.ok(text.endsWith('\r\n')); assert.equal(text.replace(/\r\n/g, '').includes('\n'), false)
  for (const line of text.split('\r\n')) assert.ok(Buffer.byteLength(line, 'utf8') <= 75, `UTF-8 line exceeds 75 octets: ${line}`)
  const lines = text.replace(/\r\n[ \t]/g, '').split('\r\n').filter(Boolean), events = [], stack = []; let event = null
  for (const line of lines) {
    if (line.startsWith('BEGIN:')) { const type = line.slice(6); stack.push(type); if (type === 'VEVENT') { assert.equal(event, null); event = {} }; continue }
    if (line.startsWith('END:')) { const type = line.slice(4); assert.equal(stack.pop(), type); if (type === 'VEVENT') { events.push(event); event = null }; continue }
    const colon = line.indexOf(':'); assert.ok(colon > 0); const key = line.slice(0, colon), value = line.slice(colon + 1); assert.doesNotMatch(key, /^(RRULE|RDATE|EXDATE|TZID)/)
    if (event) { assert.equal(Object.hasOwn(event, key), false); event[key] = value }
  }
  assert.equal(stack.length, 0); assert.ok(events.length > 0); const uids = new Set()
  for (const item of events) {
    assert.match(item.UID, /^lunar-[0-9a-f]{64}@toolhub\.ai\.kr$/); assert.equal(uids.has(item.UID), false); uids.add(item.UID); assert.match(item.DTSTAMP, /^\d{8}T\d{6}Z$/)
    const date = item['DTSTART;VALUE=DATE'], end = item['DTEND;VALUE=DATE']; assert.match(date, /^\d{8}$/); assert.match(end, /^\d{8}$/); const millis = value => Date.UTC(+value.slice(0, 4), +value.slice(4, 6) - 1, +value.slice(6, 8)); assert.equal(millis(end) - millis(date), 86400000); item.title = unescapeIcs(item.SUMMARY); item.description = unescapeIcs(item.DESCRIPTION)
  }
  return events
}
async function lunarExport(page, filename) { const file = await download(page, () => lb(page, 'download').click(), filename); const events = parseIcs(file.bytes); writeFileSync(resolve(out, filename.replace(/\.ics$/, '-parsed.json')), JSON.stringify(events, null, 2)); return { ...file, events } }
async function titleAndYear(page, title, year) { await lunarTitle(page).fill(title); await lunarYear(page, year).check() }
async function inputSizes(panel) { const sizes = await panel.locator('input:not([type="checkbox"]),select,button,summary').evaluateAll(elements => elements.filter(element => element.getBoundingClientRect().height).map(element => ({ tag: element.tagName, height: element.getBoundingClientRect().height, font: parseFloat(getComputedStyle(element).fontSize) }))); for (const item of sizes) { assert.ok(item.height >= 44); if (item.tag === 'INPUT' || item.tag === 'SELECT') assert.ok(item.font >= 16) } }
const c = (key, values) => tr('csatGrade', key, values)
const goalKey = 'toolhub-csat-goals-v1'
const goalPanel = page => page.locator('section[aria-labelledby="csat-goals-title"]')
const goalRow = (page, id) => page.locator(`[data-csat-goal-id="${id}"]`)
const minimum = page => page.locator('#csat-minimum-result')
const gcb = (page, key) => button(goalPanel(page), c(`goals.${key}`))
const goal = (id = 'g2', areas = 2, maxSum = 3, name = '2개 영역 목표') => ({ id, name, areas, maxSum, createdAt: '2026-11-17T00:00:00.000Z', updatedAt: '2026-11-17T00:00:00.000Z' })
const envelope = goals => ({ version: 1, revision: 'verification', goals })
const emptyQuery = '?' + new URLSearchParams({ kor: '', math: '', eng: '', hist: '40', inq1: '', inq2: '' })
async function openGoals(args, goals = [], query = '') { await seed(args.context, { [goalKey]: envelope(goals) }); await args.open('csat-grade', query); await goalPanel(args.page).waitFor(); await poll(async () => /[?&]kor=/.test(args.page.url()) && await goalPanel(args.page).getByText(c('goals.loading'), { exact: true }).count() === 0, 'goal state ready') }
async function setScores(page, values) { for (const [id, value] of Object.entries(values)) await page.locator(`#csat-${id}`).fill(value) }
async function scores(page) { return page.evaluate(() => Object.fromEntries(['kor', 'math', 'eng', 'hist', 'inq1', 'inq2'].map(id => [id, document.querySelector(`#csat-${id}`).value]))) }
const inquiry = (page, id) => page.getByRole('combobox', { name: c('u.selectAria', { s: c(id === 'inq1' ? 'u.inq1' : 'u.inq2') }), exact: true })
async function expectStatus(scope, status) { await poll(async () => await scope.locator('[data-goal-status]').first().getAttribute('data-goal-status') === status, `goal status ${status}`) }
const usedAreas = scope => scope.locator('[data-goal-used-areas] [data-goal-area]').evaluateAll(items => items.map(item => ({ id: item.dataset.goalArea, field: item.dataset.scoreField, text: item.textContent })))
async function draftGoal(page, name, areas = 3, max = 7) { await page.locator('#csat-goal-name').fill(name); await page.locator('#csat-goal-areas').selectOption(String(areas)); await page.locator('#csat-goal-max').fill(String(max)) }
async function confirmGoal(page, action = 'save') { await gcb(page, action).click(); await gcb(page, `confirm.${action}Action`).click() }
async function hold(page, key) { await page.evaluate(key => { window.__holdPromise = navigator.locks.request(key, async () => { window.__held = true; await new Promise(resolve => { window.__release = resolve }) }) }, key); await poll(async () => await page.evaluate(() => window.__held), 'Web Lock held') }
async function release(page) { await page.evaluate(async () => { window.__release(); await window.__holdPromise; window.__held = false }) }
async function blockRead(page, key) { await page.evaluate(key => { const get = Storage.prototype.getItem; window.__restoreRead = () => { Storage.prototype.getItem = get }; Storage.prototype.getItem = function(name) { if (name === key) throw new DOMException('Read blocked', 'SecurityError'); return get.call(this, name) }; window.dispatchEvent(new StorageEvent('storage', { key })) }, key) }
async function unconfirmWrite(page, key) { await page.evaluate(key => { const get = Storage.prototype.getItem, set = Storage.prototype.setItem; let wrote = false; window.__restoreConfirm = () => { Storage.prototype.getItem = get; Storage.prototype.setItem = set }; Storage.prototype.setItem = function(name, value) { const result = set.call(this, name, value); if (name === key) wrote = true; return result }; Storage.prototype.getItem = function(name) { if (name === key && wrote) throw new DOMException('Readback unavailable', 'SecurityError'); return get.call(this, name) } }, key) }

try {
  await run('lunar-ics-selected-years-independent-file-parse-and-stable-identities', async args => {
    const { page } = args; await openLunar(args); shape('lunarConverter', 'calendarExport'); assert.ok(await lb(page, 'download').isDisabled()); await lunarTitle(page).fill('가족, 친구;기념일\\기록'); assert.ok(await lb(page, 'download').isDisabled()); await lunarYear(page, 2027).check(); await lunarYear(page, 2026).check(); const first = await lunarExport(page, 'selected-2026-2027.ics'); assert.equal(first.name, 'lunar-anniversary-2026-2027.ics'); assert.deepEqual(first.events.map(event => event['DTSTART;VALUE=DATE']), ['20260217', '20270207']); assert.deepEqual(first.events.map(event => event.title), ['가족, 친구;기념일\\기록', '가족, 친구;기념일\\기록']); assert.match(first.events[0].description, /2026-02-17/); assert.match(first.events[0].description, /대체가 없습니다/); assert.match(await lunarYear(page, 2026).locator('..').innerText(), /이미 지난 날짜/)
    await lb(page, 'clearSelection').click(); await lunarYear(page, 2027).check(); const second = await lunarExport(page, 'selected-2027-only.ics'); assert.equal(second.events.length, 1); assert.equal(second.events[0].UID, first.events[1].UID); assert.equal(second.events[0]['DTSTART;VALUE=DATE'], '20270207'); assert.equal(new URL(page.url()).searchParams.has('title'), false)
  })
  await run('lunar-ics-leap-short-month-and-next-solar-year-fallbacks', async args => {
    const { page } = args; await openLunar(args, '?mode=lunarToSolar&ly=2025&lm=6&ld=10&leap=1'); await titleAndYear(page, '윤6월 기념일', 2026); const leap = await lunarExport(page, 'leap-month-fallback.ics'); assert.equal(leap.events[0]['DTSTART;VALUE=DATE'], '20260723'); assert.match(leap.events[0].description, /윤6월/); assert.match(leap.events[0].description, new RegExp(l('yearly.leapFallback', { month: 6 }))); const table = page.locator('table').filter({ has: page.getByRole('columnheader', { name: l('yearly.colSolar'), exact: true }) }); assert.match(await table.innerText(), /2026\.07\.23/)
    await openLunar(args, '?mode=lunarToSolar&ly=2027&lm=2&ld=30'); await titleAndYear(page, '음력 30일 기념일', 2026); const short = await lunarExport(page, 'short-month-fallback.ics'); assert.equal(short.events[0]['DTSTART;VALUE=DATE'], '20260416'); assert.ok(short.events[0].description.includes(l('yearly.dayFallback')))
    await openLunar(args, '?mode=lunarToSolar&ly=2027&lm=12&ld=30'); await titleAndYear(page, '섣달 그믐', 2027); const cross = await lunarExport(page, 'next-solar-year.ics'); assert.equal(cross.events[0]['DTSTART;VALUE=DATE'], '20280126'); assert.equal(cross.events[0]['DTEND;VALUE=DATE'], '20280127')
  })
  await run('lunar-ics-supported-first-last-dates-and-unavailable-years', async args => {
    const { page } = args; await openLunar(args, '?mode=lunarToSolar&ly=1900&lm=1&ld=1', '1900-02-01T03:00:00Z'); await titleAndYear(page, '지원 첫날', 1900); const first = await lunarExport(page, 'first-supported-date.ics'); assert.equal(first.events[0]['DTSTART;VALUE=DATE'], '19000131')
    await openLunar(args, '?mode=solarToLunar&sy=2050&sm=12&sd=31', '2050-06-15T03:00:00Z'); await titleAndYear(page, '지원 마지막 날', 2050); const last = await lunarExport(page, 'last-supported-date.ics'); assert.equal(last.events[0]['DTSTART;VALUE=DATE'], '20501231'); assert.equal(last.events[0]['DTEND;VALUE=DATE'], '20510101'); for (let year = 2051; year <= 2060; year++) assert.ok(await lunarYear(page, year).isDisabled()); await lb(page, 'selectAll').click(); assert.equal(await lunarPanel(page).getByRole('checkbox', { checked: true }).count(), 1)
    await openLunar(args, '?mode=lunarToSolar&ly=2049&lm=12&ld=1', '2050-06-15T03:00:00Z'); await lunarPanel(page).getByText(l('calendarExport.noAvailable'), { exact: true }).waitFor(); assert.ok(await lb(page, 'download').isDisabled()); assert.equal(await lunarPanel(page).locator('input[type=checkbox]:enabled').count(), 0)
  })
  await run('lunar-ics-generation-failure-retry-and-obsolete-sha-completion', async args => {
    const { page } = args; await openLunar(args); await titleAndYear(page, '실패 후 재시도', 2026); let downloads = 0; page.on('download', () => downloads++); await page.evaluate(() => { const original = crypto.subtle.digest.bind(crypto.subtle); window.__restoreDigest = () => { crypto.subtle.digest = original }; crypto.subtle.digest = async () => { throw new Error('Verification digest failure') } }); await lb(page, 'download').click(); await lunarPanel(page).getByRole('alert').waitFor(); assert.equal(downloads, 0); assert.equal(await lunarTitle(page).inputValue(), '실패 후 재시도'); assert.ok(await lunarYear(page, 2026).isChecked()); await page.evaluate(() => window.__restoreDigest()); const retry = await lunarExport(page, 'generation-retry.ics'); assert.equal(retry.events.length, 1); assert.equal(downloads, 1)
    await page.evaluate(() => { const original = crypto.subtle.digest.bind(crypto.subtle); window.__pendingDigests = []; window.__restoreDigest = () => { crypto.subtle.digest = original }; crypto.subtle.digest = (...args) => new Promise((resolve, reject) => window.__pendingDigests.push({ resolve, reject, args })); window.__finishDigests = async () => { for (const pending of window.__pendingDigests) pending.resolve(await original(...pending.args)) } }); await lb(page, 'download').click(); await poll(async () => await page.evaluate(() => window.__pendingDigests.length > 0), 'SHA request waiting'); await lunarInput(page, 'month').selectOption('2'); await page.evaluate(() => window.__finishDigests()); await poll(async () => await lb(page, 'preparing').count() === 0, 'old SHA settled'); assert.equal(downloads, 1, 'source change prevents stale download'); assert.equal(await lunarPanel(page).getByRole('status').count(), 0); assert.equal(await lunarPanel(page).getByRole('checkbox', { checked: true }).count(), 0); await page.evaluate(() => window.__restoreDigest())
  })
  await run('lunar-ics-mobile-long-title-eleven-years-and-original-table-copy', async args => {
    const { page, context, open } = args; await openLunar(args, '?mode=lunarToSolar&ly=2026&lm=9&ld=1'); const yearWidth = await lunarInput(page, 'year').evaluate(element => { const style = getComputedStyle(element), context = document.createElement('canvas').getContext('2d'); context.font = `${style.fontSize} ${style.fontFamily}`; return { available: element.clientWidth, required: context.measureText(element.selectedOptions[0].text).width + parseFloat(style.paddingLeft) + parseFloat(style.paddingRight) + 20 } }); assert.ok(yearWidth.available >= yearWidth.required, `Year label clipped: ${JSON.stringify(yearWidth)}`); const title = '가족기념일'.repeat(20); assert.equal(title.length, 100); await lunarTitle(page).fill(title + '초과'); assert.equal(await lunarTitle(page).inputValue(), title); await lb(page, 'selectAll').click(); assert.equal(await lunarPanel(page).getByRole('checkbox', { checked: true }).count(), 11); await mobile(page, lunarPanel(page), 'lunar-calendar'); await inputSizes(lunarPanel(page)); const file = await lunarExport(page, 'eleven-years-long-title.ics'); assert.equal(file.events.length, 11); assert.ok(file.events.every(event => event.title === title)); assert.equal(file.events[0]['DTSTART;VALUE=DATE'], '20261011'); await lb(page, 'clearSelection').click(); assert.ok(await lb(page, 'download').isDisabled()); await lunarTitle(page).fill('   '); await lunarYear(page, 2026).check(); assert.ok(await lb(page, 'download').isDisabled()); assert.doesNotMatch(await lunarPanel(page).innerText(), /calendarExport\.[a-z]/)
    const tableCard = page.locator('.ui-card').filter({ has: page.locator('#lunar-calendar-export') }); await button(tableCard, l('copy')).click(); const copied = await page.evaluate(() => navigator.clipboard.readText()); assert.match(copied, /2026\.10\.11/); assert.equal(copied.trim().split(/\r?\n/).length, 11); writeFileSync(resolve(out, 'original-year-table-copy.txt'), copied); await button(page, tr('shareResult', 'copyLink')).click(); const link = await page.evaluate(() => navigator.clipboard.readText()); assert.equal(new URL(link).searchParams.get('lm'), '9'); const second = await context.newPage(); await open('lunar-converter', new URL(link).search, second); await poll(async () => await lunarInput(second, 'month').inputValue() === '9', 'original shared lunar date restored'); assert.equal(await lunarInput(second, 'day').inputValue(), '1'); await second.close()
  }, { width: 320, dark: true, language: 'en' })
  await run('csat-goals-empty-partial-valid-areas-and-one-off-consistency', async args => {
    const { page } = args; await openGoals(args, [goal(), goal('g3', 3, 7, '3개 영역 목표'), goal('g4', 4, 9, '4개 영역 목표')], emptyQuery); shape('csatGrade', 'goals'); for (const id of ['g2', 'g3', 'g4']) await expectStatus(goalRow(page, id), 'needsInput'); await expectStatus(minimum(page), 'needsInput'); assert.equal((await usedAreas(goalRow(page, 'g2'))).length, 0)
    await setScores(page, { kor: '85', eng: '90' }); await expectStatus(goalRow(page, 'g2'), 'within'); await expectStatus(goalRow(page, 'g3'), 'needsInput'); assert.deepEqual((await usedAreas(goalRow(page, 'g2'))).map(item => item.id), ['kor', 'eng']); assert.match(await goalRow(page, 'g2').innerText(), /유효 영역 2개/)
    await setScores(page, { math: '87' }); await expectStatus(goalRow(page, 'g3'), 'within'); await expectStatus(goalRow(page, 'g4'), 'needsInput'); await setScores(page, { inq1: '44', inq2: '0' }); await expectStatus(goalRow(page, 'g4'), 'within'); assert.equal((await usedAreas(goalRow(page, 'g4'))).filter(item => item.id === 'inq').length, 1); assert.equal((await usedAreas(goalRow(page, 'g4'))).find(item => item.id === 'inq').field, 'inq1'); await expectStatus(minimum(page), 'within'); assert.deepEqual(await usedAreas(minimum(page)), await usedAreas(goalRow(page, 'g3'))); assert.ok((await goalRow(page, 'g3').innerText()).includes(c('goals.sum', { areas: 3, sum: 3, max: 7 })))
    await button(page, c('u.nSum', { n: 4 })).click(); await page.getByRole('spinbutton', { name: c('u.minSumAria'), exact: true }).fill('9'); await expectStatus(minimum(page), 'within'); assert.deepEqual(await usedAreas(minimum(page)), await usedAreas(goalRow(page, 'g4')))
  })
  await run('csat-goals-inquiry-single-duplicate-conflict-zero-and-invalid-score', async args => {
    const { page, open } = args; await openGoals(args, [goal('g2', 2, 10, '두 영역'), goal('g3', 3, 9, '세 영역')], emptyQuery); await setScores(page, { kor: '0', inq1: '44', inq2: '44' }); await inquiry(page, 'inq2').selectOption('society'); await expectStatus(goalRow(page, 'g2'), 'within'); await expectStatus(goalRow(page, 'g3'), 'needsInput'); assert.ok((await goalRow(page, 'g2').innerText()).includes(c('goals.sum', { areas: 2, sum: 10, max: 10 }))); await goalRow(page, 'g2').getByText(c('goals.duplicateInquiry'), { exact: true }).waitFor(); assert.equal((await usedAreas(goalRow(page, 'g2'))).length, 2)
    await setScores(page, { inq2: '43' }); await expectStatus(goalRow(page, 'g2'), 'needsInput'); await goalRow(page, 'g2').getByText(c('goals.inquiryConflict'), { exact: true }).waitFor(); assert.deepEqual((await usedAreas(goalRow(page, 'g2'))).map(item => item.id), ['kor']); await inquiry(page, 'inq2').selectOption('ethics'); await setScores(page, { inq1: '', inq2: '44', hist: '50' }); await expectStatus(goalRow(page, 'g2'), 'over'); assert.ok((await goalRow(page, 'g2').innerText()).includes(c('goals.sum', { areas: 2, sum: 11, max: 10 }))); assert.equal((await usedAreas(goalRow(page, 'g2'))).find(item => item.id === 'inq').field, 'inq2')
    await open('csat-grade', '?' + new URLSearchParams({ kor: '101', math: '', eng: '', hist: '50', inq1: '', inq2: '' })); await goalPanel(page).waitFor(); await expectStatus(goalRow(page, 'g2'), 'needsInput'); assert.equal((await usedAreas(goalRow(page, 'g2'))).length, 0); assert.ok((await goalRow(page, 'g2').innerText()).includes(c('goals.invalidScores', { fields: c('subjects.korean') }))); await expectStatus(minimum(page), 'needsInput')
  })
  await run('csat-goals-save-edit-cancel-revisit-delete-preserve-score-url', async args => {
    const { page } = args; await openGoals(args); const before = await scores(page), scoreRecords = await raw(page, 'toolhub-csat-score-records-v1'), query = new URL(page.url()).search; await draftGoal(page, '모의고사 목표'); await confirmGoal(page); await poll(async () => (await stored(page, goalKey)).goals.length === 1, 'goal saved'); const original = (await stored(page, goalKey)).goals[0]; assert.deepEqual(await scores(page), before); assert.equal(new URL(page.url()).search, query); assert.equal(await raw(page, 'toolhub-csat-score-records-v1'), scoreRecords)
    await page.reload({ waitUntil: 'domcontentloaded' }); await goalRow(page, original.id).waitFor(); await button(goalRow(page, original.id), c('goals.editAria', { name: original.name })).click(); await draftGoal(page, '수정 목표', 2, 2); await gcb(page, 'update').click(); await gcb(page, 'cancel').click(); assert.deepEqual((await stored(page, goalKey)).goals[0], original); await confirmGoal(page, 'update'); await poll(async () => (await stored(page, goalKey)).goals[0].name === '수정 목표', 'goal updated'); const updated = (await stored(page, goalKey)).goals[0]; assert.equal(updated.id, original.id); assert.equal(updated.createdAt, original.createdAt); await expectStatus(goalRow(page, original.id), 'over'); assert.deepEqual(await scores(page), before); assert.equal(new URL(page.url()).search, query)
    await button(goalRow(page, original.id), c('goals.deleteAria', { name: updated.name })).click(); await gcb(page, 'confirm.deleteAction').click(); await poll(async () => (await stored(page, goalKey)).goals.length === 0, 'goal deleted'); assert.deepEqual(await scores(page), before); assert.equal(await raw(page, 'toolhub-csat-score-records-v1'), scoreRecords)
  })
  await run('csat-goals-six-limit-ranges-forty-name-mobile-dark', async args => {
    const { page } = args; const goals = Array.from({ length: 6 }, (_, index) => goal(`g${index}`, 3, 7, index ? `목표 ${index}` : '가'.repeat(40))); await openGoals(args, goals, emptyQuery); await page.locator('#csat-goal-name').fill('나'.repeat(41)); assert.equal((await page.locator('#csat-goal-name').inputValue()).length, 40); assert.ok(await gcb(page, 'save').isDisabled()); await button(goalRow(page, 'g0'), c('goals.editAria', { name: goals[0].name })).click(); await page.locator('#csat-goal-areas').selectOption('4'); for (const value of ['2', '37', '4.5', '']) { await page.locator('#csat-goal-max').fill(value); assert.ok(await gcb(page, 'update').isDisabled()) }; await page.locator('#csat-goal-max').fill('36'); assert.ok(await gcb(page, 'update').isEnabled()); await gcb(page, 'stopEditing').click(); await mobile(page, goalPanel(page), 'csat-goals'); await inputSizes(goalPanel(page)); await goalRow(page, 'g0').screenshot({ path: resolve(out, 'csat-goal-needs-input-320-dark.png'), caret: 'initial' }); assert.doesNotMatch(await goalPanel(page).innerText(), /goals\.[a-z]/); assert.equal((await stored(page, goalKey)).goals.length, 6)
  }, { width: 320, dark: true, language: 'en' })
  await run('csat-goals-corrupt-future-quota-readback-and-recovery', async args => {
    const { page } = args; await openGoals(args, [goal()]); const beforeScores = await scores(page); const broken = ['{damaged', JSON.stringify({ version: 4, goals: [] }), JSON.stringify(envelope([goal('bad', 4, 2)]))]; for (const value of broken) { await page.evaluate(({ key, value }) => localStorage.setItem(key, value), { key: goalKey, value }); await gcb(page, 'refresh').click(); await goalPanel(page).getByRole('alert').waitFor(); assert.equal(await raw(page, goalKey), value); assert.ok(await gcb(page, 'save').isDisabled()) }; await page.evaluate(({ key, value }) => localStorage.setItem(key, JSON.stringify(value)), { key: goalKey, value: envelope([goal()]) }); await gcb(page, 'refresh').click(); await goalRow(page, 'g2').waitFor(); const before = await raw(page, goalKey); await draftGoal(page, '오류 보존 목표'); await quota(page, goalKey); await confirmGoal(page); await goalPanel(page).getByText(c('goals.errors.quota'), { exact: true }).waitFor(); assert.equal(await raw(page, goalKey), before); assert.equal(await page.locator('#csat-goal-name').inputValue(), '오류 보존 목표'); await page.evaluate(() => window.__restoreStorage()); await gcb(page, 'refresh').click()
    await blockRead(page, goalKey); await gcb(page, 'refresh').click(); await goalPanel(page).getByText(c('goals.errors.unavailable'), { exact: true }).waitFor(); await page.evaluate(() => window.__restoreRead()); await gcb(page, 'refresh').click(); await unconfirmWrite(page, goalKey); await confirmGoal(page); await goalPanel(page).getByText(c('goals.errors.unverified'), { exact: true }).waitFor(); assert.equal(await goalPanel(page).getByRole('status').count(), 0); await page.evaluate(() => window.__restoreConfirm()); assert.equal((await stored(page, goalKey)).goals.length, 2); await gcb(page, 'refresh').click(); assert.deepEqual(await scores(page), beforeScores)
  })
  await run('csat-goals-two-tabs-lock-conflict-cancel-and-stale-input', async args => {
    const { page, context, open } = args; await openGoals(args); const second = await context.newPage(); await open('csat-grade', '', second); await goalPanel(second).waitFor(); await draftGoal(page, '목표 A'); await draftGoal(second, '목표 B'); await gcb(page, 'save').click(); await gcb(second, 'save').click(); await hold(page, goalKey); await gcb(page, 'confirm.saveAction').click(); await gcb(second, 'confirm.saveAction').click(); await release(page); await poll(async () => (await stored(page, goalKey)).goals.length === 1, 'one goal writer committed'); const winner = (await stored(page, goalKey)).goals[0].name, loser = winner === '목표 A' ? second : page; await goalPanel(loser).getByText(c('goals.errors.conflict'), { exact: true }).waitFor(); assert.equal(await loser.locator('#csat-goal-name').inputValue(), winner === '목표 A' ? '목표 B' : '목표 A'); await gcb(loser, 'refresh').click(); await confirmGoal(loser); await poll(async () => (await stored(page, goalKey)).goals.length === 2, 'explicit reread save'); await gcb(page, 'refresh').click(); await gcb(second, 'refresh').click(); const before = await raw(page, goalKey)
    await hold(second, goalKey); await draftGoal(page, '취소 목표'); await confirmGoal(page); await gcb(page, 'cancel').click(); await release(second); assert.equal(await raw(page, goalKey), before); await hold(second, goalKey); await draftGoal(page, '점수 바뀐 목표'); await confirmGoal(page); await page.locator('#csat-kor').fill('95'); await release(second); await goalPanel(page).getByText(c('goals.errors.stale'), { exact: true }).waitFor(); assert.equal(await raw(page, goalKey), before); assert.equal(await page.locator('#csat-kor').inputValue(), '95'); await second.close()
  })
} finally { await browser.close() }
const latest = new Map()
const runs = readdirSync(out).filter(name => /^results.*\.json$/.test(name)).map(name => ({ name, ...JSON.parse(readFileSync(resolve(out, name), 'utf8')) })).sort((a, b) => a.checkedAt.localeCompare(b.checkedAt))
for (const run of runs) for (const result of run.results) latest.set(result.name, { ...result, sourceRun: run.name })
writeFileSync(resolve(out, 'final-results.json'), JSON.stringify({ base, checkedAt: new Date().toISOString(), total: latest.size, passed: [...latest.values()].filter(result => result.pass).length, results: [...latest.values()] }, null, 2))
if (results.some(result => !result.pass)) process.exitCode = 1

