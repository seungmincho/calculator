import { chromium } from 'playwright'
import assert from 'node:assert/strict'
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

const base = process.env.VERIFY_BASE_URL || 'http://127.0.0.1:3039'
const out = resolve('docs/verify/2026-11-16-repeat-batch12/browser')
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
const browser = await chromium.launch({ channel: 'chrome', args: ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream'] })

async function run(name, fn, options = {}) {
  if (only && !only.split(',').some(part => name.includes(part))) return
  const context = await browser.newContext({ viewport: { width: options.width ?? 1280, height: 900 }, timezoneId: 'Asia/Seoul', serviceWorkers: 'block', acceptDownloads: true, permissions: ['clipboard-read', 'clipboard-write', 'microphone'] })
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
    if (!/^https?:$/.test(location.protocol) || localStorage.getItem('__batch12Seeded')) return
    for (const [key, value] of Object.entries(values)) localStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value))
    localStorage.setItem('__batch12Seeded', '1')
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
  assert.doesNotMatch(await panel.innerText(), /(?:attendance|mealPlan|transcriptExport)\.[a-z]/)
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

const team = (key, values) => tr('teamDivider', key, values)
const meal = (key, values) => tr('decisionTools', 'mealPlan.' + key, values)
const voice = (key, values) => tr('voiceMemo', key, values)
const attendance = page => page.locator('[data-team-attendance]')
const attended = (page, name) => page.getByRole('checkbox', { name: team('attendance.attending', { name }), exact: true })
const teamKey = 'toolhub-team-rosters-v1', mealKey = 'toolhub:meal-plan', historyKey = 'toolhub-meals-v1'
const plan = page => page.locator('#meal-plan')
const weekInputs = page => plan(page).locator('li input')
const voicePanel = page => page.locator('[aria-labelledby="voice-transcript-export-title"]')
const memo = (page, name) => page.getByTestId('voice-memo-item').filter({ has: page.getByRole('checkbox', { name: voice('transcriptExport.selectMemo', { name }), exact: true }) })
const checkedMemo = (page, name) => memo(page, name).getByRole('checkbox')
const today = '2026-11-16', fixedDate = '2026-11-16T03:00:00.000Z'
const teams = page => page.locator('[data-team]').evaluateAll(nodes => nodes.map(node => [...node.querySelectorAll('[data-member]')].map(member => member.dataset.member)))
async function teamReady(page) { await poll(async () => await attended(page, '참가자 1').count() === 1 && await page.getByLabel(team('rosters.name'), { exact: true }).isEnabled(), 'team hydrated') }
async function divide(page, count) { await button(page, team('divide')).click(); await poll(async () => await page.locator('[data-member][aria-hidden="false"]').count() === count && await button(page, team('redivide')).isEnabled(), 'team revealed') }
async function mealReady(args, initial = { version: 1, entries: [] }, history = { records: [], excludeDays: 0 }) {
  await args.page.clock.setFixedTime(new Date(fixedDate)); await seed(args.context, { [mealKey]: initial, [historyKey]: history }); await args.open('menu-roulette')
  await poll(async () => await args.page.locator('#meal-plan-start').inputValue() === today && await weekInputs(args.page).count() === 7, 'meal initialized')
}
async function savePlan(page, count) { await button(plan(page), meal('save')).click(); await poll(async () => (await stored(page, mealKey)).entries.length === count && await button(plan(page), meal('save')).isDisabled(), 'meal saved') }
async function brokenDownload(page) { await page.evaluate(() => { window.__oldCreateUrl = URL.createObjectURL; URL.createObjectURL = () => { throw new Error('verification download failure') } }) }
async function restoreDownload(page) { await page.evaluate(() => { URL.createObjectURL = window.__oldCreateUrl }) }
function wav() {
  const buffer = Buffer.alloc(44 + 32000); buffer.write('RIFF'); buffer.writeUInt32LE(buffer.length - 8, 4); buffer.write('WAVEfmt ', 8); buffer.writeUInt32LE(16, 16); buffer.writeUInt16LE(1, 20); buffer.writeUInt16LE(1, 22); buffer.writeUInt32LE(16000, 24); buffer.writeUInt32LE(32000, 28); buffer.writeUInt16LE(2, 32); buffer.writeUInt16LE(16, 34); buffer.write('data', 36); buffer.writeUInt32LE(32000, 40); return buffer
}
const audioBytes = wav()
const voiceRecords = [
  { id: 'old', name: 'Earlier memo', duration: 61.9, timestamp: Date.parse('2026-11-15T23:00:00Z'), transcript: 'Earlier transcript\n한글 본문' },
  { id: 'new', name: 'Latest memo', duration: 125.2, timestamp: Date.parse('2026-11-16T01:30:00Z'), transcript: 'Latest saved transcript' },
  { id: 'empty', name: 'Empty memo', duration: 1, timestamp: Date.parse('2026-11-14T01:00:00Z'), transcript: '' },
]
async function seedVoice(args, records = voiceRecords) {
  await args.open('voice-memo')
  await poll(async () => await button(args.page, voice('record')).isEnabled(), 'voice initialized')
  await args.page.evaluate(async ({ records, bytes }) => {
    const db = await new Promise((resolve, reject) => { const r = indexedDB.open('toolhub-voice-memos', 1); r.onupgradeneeded = () => r.result.createObjectStore('memos', { keyPath: 'id' }); r.onsuccess = () => resolve(r.result); r.onerror = () => reject(r.error) })
    await new Promise((resolve, reject) => { const tx = db.transaction('memos', 'readwrite'), store = tx.objectStore('memos'); store.clear(); for (const item of records) { const blob = new Blob([new Uint8Array(bytes)], { type: 'audio/wav' }); store.put({ ...item, blob, fileSize: blob.size }) }; tx.oncomplete = resolve; tx.onerror = () => reject(tx.error) }); db.close()
  }, { records, bytes: [...audioBytes] })
  await args.page.reload({ waitUntil: 'domcontentloaded' })
  await poll(async () => await args.page.getByTestId('voice-memo-item').count() === records.length && await button(args.page, voice('record')).isEnabled(), 'seeded memos visible')
}
async function readVoice(page) {
  return page.evaluate(async () => {
    const db = await new Promise((resolve, reject) => { const r = indexedDB.open('toolhub-voice-memos', 1); r.onsuccess = () => resolve(r.result); r.onerror = () => reject(r.error) })
    const list = await new Promise((resolve, reject) => { const r = db.transaction('memos').objectStore('memos').getAll(); r.onsuccess = () => resolve(r.result); r.onerror = () => reject(r.error) }); db.close()
    return Promise.all(list.map(async ({ blob, ...record }) => ({ ...record, type: blob.type, bytes: [...new Uint8Array(await blob.arrayBuffer())] })))
  })
}

try {
  await run('attendance-balanced-rotation-share-and-full-roster-backup', async ({ page, context, open }) => {
    shape('teamDivider', 'attendance'); await open('team-divider'); await teamReady(page)
    await attended(page, '참가자 2').uncheck(); await attended(page, '참가자 5').uncheck()
    assert.equal(await page.locator('[data-attending-count]').getAttribute('data-attending-count'), '4'); assert.equal(await page.locator('[data-roster-count]').getAttribute('data-roster-count'), '6')
    await page.locator('input[value="balanced"]').check(); await page.getByLabel(team('board.animate'), { exact: true }).uncheck(); await divide(page, 4)
    const names = ['참가자 1', '참가자 3', '참가자 4', '참가자 6']; assert.deepEqual((await teams(page)).flat().sort(), names)
    const fixed = (await teams(page))[0][0]; await button(page, team('board.lock', { name: fixed })).click(); await button(page, team('rotation.action')).click()
    await page.locator('[data-team-rotation]').waitFor(); assert.deepEqual((await teams(page)).flat().sort(), names); assert.ok((await teams(page))[0].includes(fixed))
    await page.getByLabel(team('rosters.name'), { exact: true }).fill('Whole roster'); await button(page, team('rosters.save')).click(); await poll(async () => (await stored(page, teamKey))?.length === 1, 'full roster stored')
    assert.equal((await stored(page, teamKey))[0].names.length, 6)
    const file = await download(page, () => button(page.locator('[data-team-roster-backup]'), team('backup.download')).click(), 'attendance-whole-roster.json')
    assert.equal(JSON.parse(file.bytes).rosters[0].names.length, 6)
    await button(page, '링크 복사').click(); const link = await page.evaluate(() => navigator.clipboard.readText()); assert.ok(link.includes('#board='))
    const result = await teams(page), sharedPage = await context.newPage(); await sharedPage.goto(link); await sharedPage.locator('[data-member]').first().waitFor(); assert.deepEqual(await teams(sharedPage), result)
    assert.equal(await sharedPage.locator('[data-roster-count]').getAttribute('data-roster-count'), '4'); await sharedPage.close()
    await attended(page, fixed).uncheck(); assert.equal(await page.locator('[data-team]').count(), 0); assert.equal(await page.locator('[data-team-rotation]').count(), 0); assert.equal(await button(page, team('board.undo')).count(), 0)
    assert.equal((await stored(page, teamKey))[0].names.length, 6)
  })
  await run('attendance-captains-insufficient-and-input-reset', async ({ page, open }) => {
    await open('team-divider'); await teamReady(page); await button(attendance(page), team('attendance.none')).click()
    assert.ok(await button(page, team('divide')).isDisabled()); await page.getByText(team('attendance.notEnough', { count: 0, teams: 2 }), { exact: true }).waitFor()
    await attended(page, '참가자 1').check(); assert.ok(await button(page, team('divide')).isDisabled())
    await attended(page, '참가자 3').check(); await attended(page, '참가자 4').check(); await attended(page, '참가자 6').check(); await page.locator('input[value="captain"]').check(); await button(page, team('divide')).click()
    await button(page, team('board.cancelDraft')).waitFor(); assert.deepEqual(await teams(page), [['참가자 1'], ['참가자 3']]); assert.ok(await attended(page, '참가자 2').isDisabled())
    await button(page, '참가자 4').click(); await button(page, '참가자 6').click(); assert.deepEqual((await teams(page)).flat().sort(), ['참가자 1', '참가자 3', '참가자 4', '참가자 6'])
    await button(attendance(page), team('attendance.all')).click(); assert.equal(await page.locator('[data-team]').count(), 0)
    await attended(page, '참가자 2').uncheck(); await page.getByLabel(team('addPlaceholder'), { exact: true }).fill('New attendee'); await button(page, team('add')).click(); assert.ok(await attended(page, 'New attendee').isChecked()); assert.equal(await attended(page, '참가자 2').isChecked(), false)
    await button(page, team('bulkInput')).click(); await page.getByLabel(team('bulkInput'), { exact: true }).fill('Alpha\nBeta\nGamma\nDelta'); await button(page, team('import')).click()
    assert.equal(await page.locator('[data-attending-count]').getAttribute('data-attending-count'), '4'); assert.ok(await attended(page, 'Alpha').isChecked())
    await attended(page, 'Alpha').uncheck(); await button(page, team('presets.study.label')).click(); assert.equal(await page.locator('[data-attending-count]').getAttribute('data-attending-count'), '6')
  })
  await run('attendance-animation-lock-mobile-dark-and-roster-load', async ({ page, open }) => {
    await open('team-divider'); await teamReady(page); await attended(page, '참가자 6').uncheck()
    await page.getByLabel(team('rosters.name'), { exact: true }).fill('Saved six'); await button(page, team('rosters.save')).click(); await poll(async () => (await stored(page, teamKey))?.length === 1, 'roster ready')
    await button(page, team('rosters.load')).click(); assert.ok(await attended(page, '참가자 6').isChecked())
    await page.getByLabel(team('board.animate'), { exact: true }).check(); await button(page, team('divide')).click(); await button(page, team('board.skip')).waitFor(); assert.ok(await attended(page, '참가자 6').isDisabled()); await button(page, team('board.skip')).click()
    await poll(async () => await attended(page, '참가자 6').isEnabled(), 'attendance restored after animation'); await attended(page, '참가자 6').uncheck()
    await mobile(page, attendance(page), 'attendance'); await attended(page, '참가자 6').locator('..').screenshot({ path: resolve(out, 'attendance-320-dark-row.png'), caret: 'initial' })
  }, { width: 320, dark: true, language: 'en' })
  await run('meal-plan-multiweek-save-copy-and-real-txt', async args => {
    const { page } = args; shape('decisionTools', 'mealPlan'); await mealReady(args, { version: 1, entries: [{ date: '2026-11-30', menu: 'Other week retained' }] })
    const originalHistory = await raw(page, historyKey), originalPlan = await raw(page, mealKey)
    await page.locator('#meal-plan-2026-11-16').fill('Keep my menu'); await button(plan(page), meal('fill')).click()
    const firstWeek = await weekInputs(page).evaluateAll(inputs => inputs.map(input => ({ date: input.id.slice(10), menu: input.value })))
    assert.equal(firstWeek[0].menu, 'Keep my menu'); assert.equal(new Set(firstWeek.map(entry => entry.menu)).size, 7); assert.equal(await raw(page, mealKey), originalPlan); assert.equal(await raw(page, historyKey), originalHistory)
    await page.locator('#meal-plan-start').fill('2026-11-23'); await page.locator('#meal-plan-2026-11-23').fill('Next week edit'); await page.locator('#meal-plan-start').fill(today)
    assert.deepEqual(await weekInputs(page).evaluateAll(inputs => inputs.map(input => input.value)), firstWeek.map(entry => entry.menu)); await savePlan(page, 9)
    assert.ok((await stored(page, mealKey)).entries.some(entry => entry.date === '2026-11-30' && entry.menu === 'Other week retained')); assert.ok((await stored(page, mealKey)).entries.some(entry => entry.date === '2026-11-23' && entry.menu === 'Next week edit'))
    const expected = firstWeek.map(entry => `${entry.date}\t${entry.menu}`).join('\n')
    const file = await download(page, () => button(plan(page), meal('download')).click(), 'meal-plan-seven-days.txt'); assert.equal(file.name, 'meal-plan-2026-11-16.txt'); assert.equal(file.bytes.toString('utf8'), expected)
    await button(plan(page), meal('copy')).click(); assert.equal((await page.evaluate(() => navigator.clipboard.readText())).replace(/\r\n/g, '\n'), expected)
    await brokenDownload(page); await button(plan(page), meal('download')).click(); await plan(page).getByText(meal('downloadFailed'), { exact: true }).waitFor(); await restoreDownload(page)
    await page.reload({ waitUntil: 'domcontentloaded' }); await poll(async () => await page.locator('#meal-plan-2026-11-16').inputValue() === 'Keep my menu', 'plan revisited'); assert.equal(await raw(page, historyKey), originalHistory)
  })
  await run('meal-plan-quota-two-tabs-corruption-and-dirty-refresh', async args => {
    const { page, context } = args; await mealReady(args); const original = await raw(page, mealKey); await page.locator('#meal-plan-2026-11-16').fill('Unsaved dinner'); await quota(page, mealKey)
    await button(plan(page), meal('save')).click(); await plan(page).getByText(meal('errors.unavailable'), { exact: true }).waitFor(); assert.equal(await raw(page, mealKey), original); assert.equal(await page.locator('#meal-plan-2026-11-16').inputValue(), 'Unsaved dinner'); await page.evaluate(() => window.__restoreStorage())
    const other = await context.newPage(); await other.goto(`${base}/menu-roulette/`); await other.evaluate(({ key }) => localStorage.setItem(key, JSON.stringify({ version: 1, entries: [{ date: '2026-11-16', menu: 'Other tab dinner' }] })), { key: mealKey })
    await plan(page).getByText(meal('errors.conflict'), { exact: true }).waitFor(); assert.ok(await button(plan(page), meal('save')).isDisabled()); await button(plan(page), meal('refresh')).click(); await button(plan(page), meal('cancel')).click(); assert.equal(await page.locator('#meal-plan-2026-11-16').inputValue(), 'Unsaved dinner')
    await button(plan(page), meal('refresh')).click(); await button(plan(page), meal('refreshConfirm')).click(); assert.equal(await page.locator('#meal-plan-2026-11-16').inputValue(), 'Other tab dinner'); await other.close()
    await page.evaluate(key => localStorage.setItem(key, '{broken-plan'), mealKey); await page.reload({ waitUntil: 'domcontentloaded' }); await plan(page).getByText(meal('errors.invalidData'), { exact: true }).waitFor(); assert.equal(await raw(page, mealKey), '{broken-plan'); assert.ok(await button(plan(page), meal('save')).isDisabled())
  })
  await run('meal-plan-history-explicit-once-and-date-delete', async args => {
    const { page } = args; await mealReady(args, { version: 1, entries: [{ date: today, menu: 'Today dinner' }, { date: '2026-11-17', menu: 'Tomorrow dinner' }] })
    const todayRow = plan(page).locator('li').filter({ has: page.locator('#meal-plan-2026-11-16') }), futureRow = plan(page).locator('li').filter({ has: page.locator('#meal-plan-2026-11-17') })
    assert.equal(await button(futureRow, meal('addHistory')).count(), 0); const planBefore = await raw(page, mealKey), historyBefore = await raw(page, historyKey)
    await quota(page, historyKey); await button(todayRow, meal('addHistory')).click(); await plan(page).getByText(meal('historyFailed'), { exact: true }).waitFor(); assert.equal(await raw(page, historyKey), historyBefore); assert.equal(await raw(page, mealKey), planBefore); await page.evaluate(() => window.__restoreStorage())
    await button(todayRow, meal('addHistory')).click(); await poll(async () => (await stored(page, historyKey)).records.length === 1, 'history added once'); assert.ok(await button(todayRow, meal('alreadyRecorded')).isDisabled()); assert.equal(await raw(page, mealKey), planBefore)
    await button(todayRow, meal('clearDay')).click(); assert.equal(await raw(page, mealKey), planBefore); await savePlan(page, 1); assert.deepEqual((await stored(page, mealKey)).entries, [{ date: '2026-11-17', menu: 'Tomorrow dinner' }]); assert.equal((await stored(page, historyKey)).records.length, 1)
  })
  await run('meal-plan-short-candidates-mobile-dark', async args => {
    const { page } = args; await mealReady(args); const candidates = page.locator('#roulette-items ul').first()
    while (await candidates.locator('li').count() > 2) await candidates.locator('li').last().getByRole('button').click()
    await button(plan(page), meal('fill')).click(); const values = await weekInputs(page).evaluateAll(inputs => inputs.map(input => input.value)); assert.equal(values.filter(Boolean).length, 2); assert.equal(new Set(values.filter(Boolean)).size, 2)
    await plan(page).getByText(meal('filled', { filled: 2, remaining: 5, skipped: 0 }), { exact: true }).waitFor(); assert.equal((await stored(page, mealKey)).entries.length, 0)
    await mobile(page, plan(page), 'meal-plan')
  }, { width: 320, dark: true, language: 'en' })
  await run('voice-bundle-real-txt-edited-text-search-and-existing-downloads', async args => {
    const { page } = args; shape('voiceMemo', 'transcriptExport'); await seedVoice(args); const saved = await readVoice(page)
    await checkedMemo(page, 'Earlier memo').check(); await checkedMemo(page, 'Latest memo').check(); assert.ok(await checkedMemo(page, 'Empty memo').isDisabled())
    await button(memo(page, 'Latest memo'), voice('enhance.editText')).click(); await page.locator('#voice-text-new').fill('Edited unsaved transcript\n두 번째 줄')
    await page.locator('#voice-memo-search').fill('Earlier'); assert.ok((await voicePanel(page).innerText()).includes('검색 밖 선택 1개'))
    const file = await download(page, () => button(voicePanel(page), voice('transcriptExport.download')).click(), 'voice-transcripts-bundle.txt'); const text = file.bytes.toString('utf8')
    assert.deepEqual([...file.bytes.subarray(0, 3)], [239, 187, 191]); assert.ok(text.indexOf('Latest memo') < text.indexOf('Earlier memo')); assert.ok(text.includes('Edited unsaved transcript\n두 번째 줄')); assert.ok(text.includes('2026-11-16 10:30:00 (UTC+09:00)')); assert.ok(text.includes('02:05')); assert.ok(text.includes('01:01')); assert.ok(!text.includes('Empty memo')); assert.deepEqual(await readVoice(page), saved)
    await button(voicePanel(page), voice('transcriptExport.clearVisible')).click(); assert.ok((await voicePanel(page).innerText()).includes('1개 선택')); await page.locator('#voice-memo-search').fill('')
    const audio = await download(page, () => button(memo(page, 'Earlier memo'), voice('download')).click(), 'voice-existing-audio.wav'); assert.deepEqual(audio.bytes, audioBytes)
    await button(memo(page, 'Earlier memo'), voice('enhance.editText')).click(); const single = await download(page, () => button(memo(page, 'Earlier memo'), voice('enhance.exportText')).click(), 'voice-existing-transcript.txt'); assert.equal(single.bytes.toString('utf8'), '\uFEFFEarlier memo\n\nEarlier transcript\n한글 본문')
  })
  await run('voice-bundle-stale-selections-failure-and-retry', async args => {
    const { page } = args; await seedVoice(args); await button(voicePanel(page), voice('transcriptExport.selectVisible')).click()
    await button(memo(page, 'Earlier memo'), voice('enhance.editText')).click(); await page.locator('#voice-text-old').fill(''); await voicePanel(page).getByText(voice('transcriptExport.stale', { count: 1 }), { exact: true }).waitFor()
    await button(voicePanel(page), voice('transcriptExport.download')).click(); await voicePanel(page).getByText(voice('transcriptExport.errors.staleSelection'), { exact: true }).waitFor(); await button(voicePanel(page), voice('transcriptExport.clearStale')).click()
    await brokenDownload(page); await button(voicePanel(page), voice('transcriptExport.download')).click(); await voicePanel(page).getByText(voice('transcriptExport.errors.downloadFailed'), { exact: true }).waitFor(); assert.ok(await checkedMemo(page, 'Latest memo').isChecked()); await restoreDownload(page)
    const file = await download(page, () => button(voicePanel(page), voice('transcriptExport.download')).click(), 'voice-retry.txt'); assert.ok(file.bytes.toString('utf8').includes('Latest saved transcript'))
    await button(memo(page, 'Latest memo'), voice('delete')).click(); await button(memo(page, 'Latest memo'), voice('enhance.confirmDelete')).click(); await voicePanel(page).getByText(voice('transcriptExport.stale', { count: 1 }), { exact: true }).waitFor(); await button(voicePanel(page), voice('transcriptExport.download')).click(); await voicePanel(page).getByText(voice('transcriptExport.errors.staleSelection'), { exact: true }).waitFor(); await button(voicePanel(page), voice('transcriptExport.clearStale')).click(); assert.ok(await button(voicePanel(page), voice('transcriptExport.download')).isDisabled())
  })
  await run('voice-bundle-selection-limit-and-recording-busy', async args => {
    const { page } = args; const records = Array.from({ length: 21 }, (_, index) => ({ ...voiceRecords[0], id: `many-${index}`, name: `Memo ${index + 1}`, timestamp: voiceRecords[0].timestamp + index * 1000 }))
    await seedVoice(args, records); await button(voicePanel(page), voice('transcriptExport.selectVisible')).click(); await voicePanel(page).getByText(voice('transcriptExport.errors.selectionLimit'), { exact: true }).waitFor(); assert.equal(await page.getByTestId('voice-memo-item').locator('input:checked').count(), 0)
    for (let index = 1; index <= 20; index++) await checkedMemo(page, `Memo ${index}`).check(); assert.ok(await checkedMemo(page, 'Memo 21').isDisabled())
    await button(page, voice('record')).click(); await button(page, voice('stop')).waitFor(); assert.ok(await button(voicePanel(page), voice('transcriptExport.download')).isDisabled()); assert.ok(await button(voicePanel(page), voice('transcriptExport.clearAll')).isDisabled()); assert.ok(await checkedMemo(page, 'Memo 1').isDisabled())
    await button(page, voice('pause')).click(); assert.ok(await button(voicePanel(page), voice('transcriptExport.download')).isDisabled()); await button(page, voice('stop')).click(); await poll(async () => await button(voicePanel(page), voice('transcriptExport.download')).isEnabled(), 'export restored after recording')
    assert.equal((await readVoice(page)).length, 21)
  })
  await run('voice-bundle-mobile-dark-selection-search', async args => {
    const { page } = args; await seedVoice(args); await button(voicePanel(page), voice('transcriptExport.selectVisible')).click(); await page.locator('#voice-memo-search').fill('Latest'); await mobile(page, voicePanel(page), 'voice-bundle'); await memo(page, 'Latest memo').screenshot({ path: resolve(out, 'voice-bundle-320-dark-memo.png'), caret: 'initial' })
    assert.ok((await voicePanel(page).innerText()).includes('검색 밖 선택 1개')); const file = await download(page, () => button(voicePanel(page), voice('transcriptExport.download')).click(), 'voice-mobile.txt'); assert.ok(file.bytes.toString('utf8').includes('Earlier transcript'))
  }, { width: 320, dark: true, language: 'en' })
} finally { await browser.close() }
const latest = new Map()
const runs = readdirSync(out).filter(name => /^results.*\.json$/.test(name)).map(name => ({ name, ...JSON.parse(readFileSync(resolve(out, name), 'utf8')) })).sort((a, b) => a.checkedAt.localeCompare(b.checkedAt))
for (const run of runs) for (const result of run.results) latest.set(result.name, { ...result, sourceRun: run.name })
writeFileSync(resolve(out, 'final-results.json'), JSON.stringify({ base, checkedAt: new Date().toISOString(), total: latest.size, passed: [...latest.values()].filter(result => result.pass).length, results: [...latest.values()] }, null, 2))
if (results.some(result => !result.pass)) process.exitCode = 1

