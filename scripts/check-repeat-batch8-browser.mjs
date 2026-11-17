import { chromium } from 'playwright'
import assert from 'node:assert/strict'
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import JSZip from 'jszip'

const base = process.env.VERIFY_BASE_URL || 'http://127.0.0.1:3039'
const out = resolve('docs/verify/2026-11-16-repeat-batch8/browser')
const only = process.argv[2]
const messages = Object.fromEntries(['ko', 'en'].map(language => [language, JSON.parse(readFileSync(`messages/${language}.json`, 'utf8'))]))
const tr = (ns, key, values = {}, language = 'ko') => {
  const value = key.split('.').reduce((object, key) => object?.[key], messages[language][ns])
  assert.equal(typeof value, 'string', `Missing ${language}:${ns}.${key}`)
  return value.replace(/\{(\w+)\}/g, (match, key) => values[key] ?? match)
}
const i = (key, values) => tr('imageResizer', key, values)
const d = (key, values) => tr('ddayCalculator', key, values)
const p = (key, values) => tr('pomodoroTimer', key, values)
const button = (scope, name) => scope.getByRole('button', { name, exact: true })
const raw = (page, key) => page.evaluate(key => localStorage.getItem(key), key)
const stored = async (page, key) => JSON.parse(await raw(page, key))
const results = []
const keys = { image: 'toolhub:image-resize:profiles', dday: 'dday-saved', goal: 'pomodoro-daily-goal.v1', stats: 'pomodoro-daily-stats', timer: 'pomodoro-timer-state' }
mkdirSync(out, { recursive: true })
const browser = await chromium.launch({ channel: 'chrome' })

async function run(name, fn, options = {}) {
  if (only && !only.split(',').some(part => name.includes(part))) return
  const context = await browser.newContext({ viewport: { width: options.width ?? 1280, height: 900 }, timezoneId: 'Asia/Seoul', serviceWorkers: 'block', acceptDownloads: true })
  const errors = [], external = []
  await context.addInitScript(options => {
    if (!/^https?:$/.test(location.protocol)) return
    localStorage.setItem('language', options.language ?? 'ko')
    localStorage.setItem('theme', options.dark ? 'dark' : 'light')
  }, options)
  await context.route('**/*', route => { if (route.request().url().startsWith(base)) return route.continue(); external.push(route.request().url()); return route.abort() })
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
    if (!/^https?:$/.test(location.protocol) || localStorage.getItem('__batch8Seeded')) return
    for (const [key, value] of Object.entries(values)) localStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value))
    localStorage.setItem('__batch8Seeded', '1')
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
  assert.doesNotMatch(await panel.innerText(), /(?:profiles|calendarExport|goal)\.[a-z]/)
  await panel.evaluate(element => element.scrollIntoView({ block: 'center' }))
  await panel.screenshot({ path: resolve(out, `${name}-320-dark-panel.png`), caret: 'initial' })
  await page.evaluate(() => scrollTo(0, 0)); await page.screenshot({ path: resolve(out, `${name}-320-dark-top.png`), caret: 'initial' })
}
const imagePanel = page => page.getByTestId('image-resize-profiles')
async function openProfiles(page) {
  const panel = imagePanel(page)
  await panel.waitFor()
  if (await panel.getAttribute('open') === null) await panel.locator('summary').click()
  await panel.getByLabel(i('profiles.name'), { exact: true }).waitFor()
  return panel
}
async function saveProfile(page, name) {
  const panel = imagePanel(page)
  await panel.getByLabel(i('profiles.name'), { exact: true }).fill(name)
  await button(panel, i('profiles.save')).click()
  await page.waitForFunction(({ key, name }) => JSON.parse(localStorage.getItem(key))?.profiles?.some(profile => profile.name === name), { key: keys.image, name })
  await panel.getByRole('status').filter({ hasText: i('profiles.saved') }).waitFor()
}
async function loadProfile(page, name) { await button(imagePanel(page).locator('li').filter({ has: page.getByRole('heading', { name, exact: true }) }), i('profiles.load')).click() }
async function smallPng(page, name = 'fixture.png') {
  const base64 = await page.evaluate(() => {
    const canvas = document.createElement('canvas'); canvas.width = 80; canvas.height = 40
    const ctx = canvas.getContext('2d'); ctx.fillStyle = '#3182f6'; ctx.fillRect(0, 0, 40, 40); ctx.fillStyle = '#f2f4f6'; ctx.fillRect(40, 0, 40, 40)
    return canvas.toDataURL('image/png').split(',')[1]
  })
  return { name, mimeType: 'image/png', buffer: Buffer.from(base64, 'base64') }
}
async function imageInfo(page, bytes) {
  const mime = bytes.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10])) ? 'image/png' : bytes[0] === 255 && bytes[1] === 216 ? 'image/jpeg' : 'unknown'
  const size = await page.evaluate(async ({ base64, mime }) => { const bytes = Uint8Array.from(atob(base64), char => char.charCodeAt(0)); const image = await createImageBitmap(new Blob([bytes], { type: mime })); const result = { width: image.width, height: image.height }; image.close(); return result }, { base64: bytes.toString('base64'), mime })
  return { mime, ...size }
}
const imageFixture = { version: 1, profiles: [{ id: 'fixture-profile', name: 'Stored profile', settings: { mode: 'px', width: 32, height: 16, lock: false, percent: 50, longSide: 1920, fit: 'cover', format: 'png', quality: 90, targetKB: 0, bg: '#ffffff' } }] }
const calendarPanel = page => page.locator('section[aria-labelledby="dday-calendar-title"]')
const goalPanel = page => page.locator('section[aria-labelledby="pomodoro-goal-title"]')
const calendarText = bytes => {
  const text = bytes.toString('utf8')
  assert.ok(text.startsWith('BEGIN:VCALENDAR\r\n') && text.endsWith('END:VCALENDAR\r\n'))
  assert.doesNotMatch(text.replaceAll('\r\n', ''), /[\r\n]/)
  for (const line of text.split('\r\n')) assert.ok(Buffer.byteLength(line, 'utf8') <= 75, `Calendar line too long: ${line}`)
  assert.doesNotMatch(text, /BEGIN:VALARM|RRULE:/)
  return text.replace(/\r\n[ \t]/g, '')
}
const calendarIds = text => [...text.matchAll(/^UID:(.+)$/gm)].map(match => match[1].trim()).sort()
const calendarRows = [
  { id: 'one', title: '가나다라마바사아자차카타파하'.repeat(8) + ',;\\\n둘째 줄', date: '2028-02-29' },
  { id: 'two', title: 'Selected second', date: '2026-12-31' },
  { id: 'three', title: 'Excluded event', date: '2027-01-03' },
]
const fixedNow = new Date('2026-11-16T10:00:00+09:00')
const pomodoroSettings = { workDuration: 1, shortBreakDuration: 1, longBreakDuration: 1, longBreakInterval: 4, autoStart: false, notificationsEnabled: false, soundEnabled: false, soundVolume: 70 }
const timerFixture = (changes = {}) => ({ phase: 'work', timeLeft: 3, isRunning: false, currentRound: 1, completedRounds: 0, totalWorkSeconds: 0, lastTickTime: fixedNow.getTime(), settings: pomodoroSettings, ...changes })
async function poll(predicate, description) {
  for (let attempt = 0; attempt < 100; attempt++) { if (await predicate()) return; await new Promise(resolve => setTimeout(resolve, 100)) }
  assert.fail(`Timed out: ${description}`)
}
async function openPomodoro({ page, context, open }, extra = {}, timer = timerFixture()) {
  await page.clock.install({ time: fixedNow })
  await seed(context, { 'pomodoro-settings': pomodoroSettings, [keys.timer]: timer, ...extra })
  await open('pomodoro'); await goalPanel(page).waitFor()
  await poll(async () => await button(goalPanel(page), p('goal.save')).isEnabled(), 'goal hydration')
  await poll(async () => (await stored(page, keys.timer))?.timeLeft === timer.timeLeft, 'timer restored')
  await page.clock.pauseAt(new Date(await page.evaluate(() => Date.now()) + 1000))
  return goalPanel(page)
}
async function waitTimer(page, expected) { await poll(async () => { const state = await stored(page, keys.timer); return Object.entries(expected).every(([key, value]) => state?.[key] === value) }, `timer ${JSON.stringify(expected)}`) }
async function waitStats(page, count, minutes) { await poll(async () => { const row = (await stored(page, keys.stats))?.find(row => row.date === '2026-11-16'); return row?.count === count && row?.minutes === minutes }, `stats ${count}/${minutes}`) }

try {
  await run('image-profile-real-output-and-zip', async ({ page, open }) => {
    shape('imageResizer', 'profiles')
    await open('image-resizer', '?w=40&h=20&l=0&f=png')
    await openProfiles(page)
    await page.waitForFunction(() => document.querySelector('#ir-w')?.value === '40')
    await saveProfile(page, 'PNG output')
    const fixture = await smallPng(page)
    await page.locator('input[type="file"]').setInputFiles([fixture, fixture])
    await button(page, i('downloadOf', { name: fixture.name })).first().waitFor()
    const png = await download(page, () => button(page, i('downloadOf', { name: fixture.name })).first().click(), 'resized-40x20.png')
    assert.deepEqual(await imageInfo(page, png.bytes), { mime: 'image/png', width: 40, height: 20 })
    await page.locator('#ir-w').fill('24'); await page.locator('#ir-h').fill('24'); await button(page, 'JPG').click()
    await page.getByText('24×24px', { exact: true }).first().waitFor()
    const jpeg = await download(page, () => button(page, i('downloadOf', { name: fixture.name })).first().click(), 'resized-24x24.jpg')
    assert.deepEqual(await imageInfo(page, jpeg.bytes), { mime: 'image/jpeg', width: 24, height: 24 })
    await loadProfile(page, 'PNG output')
    await page.getByText('40×20px', { exact: true }).first().waitFor()
    const zipFile = await download(page, () => button(page, i('downloadZip', { n: 2 })).click(), 'resized-batch.zip')
    const zip = await JSZip.loadAsync(zipFile.bytes), entries = Object.values(zip.files).filter(file => !file.dir)
    assert.equal(entries.length, 2); assert.equal(new Set(entries.map(file => file.name)).size, 2)
    for (const file of entries) assert.deepEqual(await imageInfo(page, await file.async('nodebuffer')), { mime: 'image/png', width: 40, height: 20 })
    assert.doesNotMatch(await raw(page, keys.image), /fixture|data:image|blob:|cropX|cropY/)
    await page.reload({ waitUntil: 'domcontentloaded' }); await openProfiles(page)
    assert.equal((await stored(page, keys.image)).profiles.length, 1)
    assert.equal(await button(page, i('downloadOf', { name: fixture.name })).count(), 0, 'Profile stores no source photos')
    const panel = imagePanel(page)
    await button(panel, i('profiles.rename')).click(); await panel.getByLabel(i('profiles.newName'), { exact: true }).fill('Renamed output')
    await button(panel, i('profiles.renameSave')).click()
    await poll(async () => (await stored(page, keys.image)).profiles[0].name === 'Renamed output', 'profile renamed')
    await button(panel, i('profiles.delete')).click(); await button(panel, i('profiles.cancel')).click()
    assert.equal((await stored(page, keys.image)).profiles.length, 1)
    await button(panel, i('profiles.delete')).click(); await button(panel, i('profiles.deleteConfirm')).click()
    await poll(async () => (await stored(page, keys.image)).profiles.length === 0, 'profile deleted after confirmation')
  })
  await run('image-profile-quota-retains-original', async ({ page, open }) => {
    await open('image-resizer'); const panel = await openProfiles(page)
    await saveProfile(page, 'Keep profile'); const before = await raw(page, keys.image)
    await quota(page, keys.image)
    await panel.getByLabel(i('profiles.name'), { exact: true }).fill('Keep entered name')
    await button(panel, i('profiles.save')).click(); await panel.getByRole('alert').waitFor()
    assert.equal(await raw(page, keys.image), before)
    assert.equal(await panel.getByLabel(i('profiles.name'), { exact: true }).inputValue(), 'Keep entered name')
    await page.evaluate(() => window.__restoreStorage()); await saveProfile(page, 'Recovered profile')
    assert.equal((await stored(page, keys.image)).profiles.length, 2)
  })
  await run('image-profile-corrupt-and-future-values', async ({ page, context, open }) => {
    const corrupt = '{"version":1,"profiles":'
    await seed(context, { [keys.image]: corrupt }); await open('image-resizer'); const panel = await openProfiles(page)
    await panel.getByRole('alert').waitFor(); assert.equal(await raw(page, keys.image), corrupt)
    assert.ok(await button(panel, i('profiles.save')).isDisabled())
    const future = JSON.stringify({ version: 99, protected: 'original' })
    await page.evaluate(({ key, future }) => localStorage.setItem(key, future), { key: keys.image, future })
    await button(panel, i('profiles.refresh')).click(); await panel.getByRole('alert').waitFor()
    assert.equal(await raw(page, keys.image), future)
    await page.evaluate(key => localStorage.removeItem(key), keys.image); await button(panel, i('profiles.refresh')).click()
    await panel.getByRole('alert').waitFor({ state: 'hidden' }); await saveProfile(page, 'Recovered')
  })
  await run('image-profile-two-tab-collision', async ({ page, context, open }) => {
    await open('image-resizer'); await openProfiles(page); await saveProfile(page, 'Original')
    const second = await context.newPage(); await open('image-resizer', '', second); const secondPanel = await openProfiles(second)
    await secondPanel.getByLabel(i('profiles.name'), { exact: true }).fill('Second draft')
    await saveProfile(page, 'First addition')
    await secondPanel.getByRole('alert').waitFor(); assert.ok(await button(secondPanel, i('profiles.save')).isDisabled())
    assert.equal(await secondPanel.getByLabel(i('profiles.name'), { exact: true }).inputValue(), 'Second draft')
    await button(secondPanel, i('profiles.refresh')).click(); await saveProfile(second, 'Second addition')
    assert.deepEqual((await stored(page, keys.image)).profiles.map(profile => profile.name).sort(), ['First addition', 'Original', 'Second addition'])
  })
  await run('image-profile-url-priority-mobile-dark', async ({ page, context, open }) => {
    shape('imageResizer', 'profiles')
    await context.addInitScript(() => { const original = HTMLCanvasElement.prototype.toBlob; HTMLCanvasElement.prototype.toBlob = function(callback, type, quality) { return original.call(this, callback, type === 'image/webp' ? 'image/png' : type, quality) } })
    const webp = { ...imageFixture.profiles[0], id: 'webp', name: 'WebP unavailable', settings: { ...imageFixture.profiles[0].settings, width: 64, format: 'webp' } }
    await seed(context, { [keys.image]: { version: 1, profiles: [...imageFixture.profiles, webp] } })
    await open('image-resizer', '?w=40&h=20&l=0&f=jpeg'); const panel = await openProfiles(page)
    await page.waitForFunction(() => document.querySelector('#ir-w')?.value === '40')
    assert.equal(await page.locator('#ir-h').inputValue(), '20')
    await loadProfile(page, 'Stored profile'); assert.equal(await page.locator('#ir-w').inputValue(), '32')
    assert.equal(await page.locator('#ir-h').inputValue(), '16')
    await loadProfile(page, 'WebP unavailable'); await panel.getByRole('alert').filter({ hasText: i('profiles.errors.webpUnsupported') }).waitFor()
    assert.equal(await page.locator('#ir-w').inputValue(), '32'); assert.equal(await button(page, 'PNG').getAttribute('aria-pressed'), 'true')
    await mobile(page, panel, 'image')
  }, { width: 320, dark: true, language: 'en' })
  await run('dday-current-calendar-leap-date-and-stable-uid', async ({ page, open }) => {
    shape('ddayCalculator', 'calendarExport')
    const title = 'Leap, title; slash\\'
    await open('dday-calculator', `?date=2028-02-29&title=${encodeURIComponent(title)}`)
    await page.waitForFunction(() => document.querySelector('#dday-date')?.value === '2028-02-29')
    const panel = calendarPanel(page)
    await page.evaluate(() => { const original = URL.createObjectURL; URL.createObjectURL = blob => { window.__calendarMime = blob.type; return original.call(URL, blob) } })
    const first = await download(page, () => button(panel, d('calendarExport.download')).click(), 'current-leap.ics')
    assert.equal(first.name, 'dday-2028-02-29.ics')
    assert.equal(await page.evaluate(() => window.__calendarMime), 'text/calendar;charset=utf-8')
    const text = calendarText(first.bytes)
    assert.match(text, /DTSTART;VALUE=DATE:20280229\r\nDTEND;VALUE=DATE:20280301/)
    assert.ok(text.includes('SUMMARY:Leap\\, title\\; slash\\\\'))
    assert.equal((text.match(/BEGIN:VEVENT/g) ?? []).length, 1)
    const second = await download(page, () => button(panel, d('calendarExport.download')).click(), 'current-leap-again.ics')
    assert.deepEqual(calendarIds(calendarText(second.bytes)), calendarIds(text)); assert.equal(calendarIds(text).length, 1)
    assert.equal(await page.locator('#dday-title').inputValue(), title)
  })
  await run('dday-selected-calendar-utf8-fold-and-selection', async ({ page, context, open }) => {
    await seed(context, { [keys.dday]: calendarRows }); await open('dday-calculator')
    await page.waitForFunction(() => !!document.querySelector('#dday-date')?.value)
    const panel = calendarPanel(page); await button(panel, d('calendarExport.saved')).click()
    await panel.getByRole('checkbox').nth(2).waitFor()
    assert.ok(await button(panel, d('calendarExport.download')).isDisabled())
    await panel.getByRole('checkbox', { name: /2028-02-29/ }).check(); await panel.getByRole('checkbox', { name: /Selected second/ }).check()
    const output = await download(page, () => button(panel, d('calendarExport.download')).click(), 'selected-two.ics')
    assert.equal(output.name, 'dday-selected-2.ics'); const text = calendarText(output.bytes)
    assert.equal((text.match(/BEGIN:VEVENT/g) ?? []).length, 2); assert.doesNotMatch(text, /Excluded event/)
    assert.ok(text.includes('SUMMARY:' + calendarRows[0].title.replaceAll('\\', '\\\\').replaceAll('\n', '\\n').replaceAll(';', '\\;').replaceAll(',', '\\,')))
    assert.match(text, /DTEND;VALUE=DATE:20270101/); assert.match(output.bytes.toString(), /\r\n /)
    assert.equal(new Set(calendarIds(text)).size, 2)
    await button(panel, d('calendarExport.clearSelection')).click(); assert.ok(await button(panel, d('calendarExport.download')).isDisabled())
  })
  await run('dday-corrupt-storage-preserved-and-current-independent', async ({ page, context, open }) => {
    const corrupt = '{"bad":"protected"}'
    await seed(context, { [keys.dday]: corrupt }); await open('dday-calculator', '?date=2026-12-25&title=Current')
    await page.getByRole('alert').filter({ hasText: d('calendarExport.errors.savedCorrupt') }).waitFor()
    assert.equal(await raw(page, keys.dday), corrupt)
    const panel = calendarPanel(page); await button(panel, d('calendarExport.saved')).click()
    assert.ok(await button(panel, d('calendarExport.download')).isDisabled())
    await button(panel, d('calendarExport.current')).click()
    const output = await download(page, () => button(panel, d('calendarExport.download')).click(), 'current-with-corrupt-store.ics')
    assert.match(calendarText(output.bytes), /SUMMARY:Current/); assert.equal(await raw(page, keys.dday), corrupt)
    await page.locator('#dday-date').fill(''); await button(panel, d('calendarExport.download')).click()
    await panel.getByRole('alert').filter({ hasText: d('calendarExport.errors.invalidDate') }).waitFor()
  })
  await run('dday-stale-selection-and-invalid-exclusive-end', async ({ page, context, open }) => {
    await seed(context, { [keys.dday]: [...calendarRows, { id: 'edge', title: 'Last date', date: '9999-12-31' }] })
    await open('dday-calculator', '?date=2026-12-25&title=Current')
    await page.waitForFunction(() => document.querySelector('#dday-date')?.value === '2026-12-25')
    const panel = calendarPanel(page); await button(panel, d('calendarExport.saved')).click()
    await panel.getByRole('checkbox').nth(3).check(); await button(panel, d('calendarExport.download')).click()
    await panel.getByRole('alert').filter({ hasText: d('calendarExport.errors.endDate') }).waitFor()
    await button(panel, d('calendarExport.clearSelection')).click(); await panel.getByRole('checkbox').nth(0).check()
    const before = await raw(page, keys.dday)
    await page.evaluate(({ key, rows }) => localStorage.setItem(key, JSON.stringify(rows)), { key: keys.dday, rows: [calendarRows[1]] })
    await button(panel, d('calendarExport.download')).click(); await panel.getByRole('alert').waitFor()
    assert.notEqual(await raw(page, keys.dday), before); assert.deepEqual(await stored(page, keys.dday), [calendarRows[1]])
  })
  await run('dday-download-failure-and-mobile-dark', async ({ page, open }) => {
    await open('dday-calculator', '?date=2027-01-01&title=Mobile')
    await page.waitForFunction(() => document.querySelector('#dday-title')?.value === 'Mobile')
    const panel = calendarPanel(page)
    await page.evaluate(() => { const original = URL.createObjectURL; window.__restoreUrl = () => { URL.createObjectURL = original }; URL.createObjectURL = () => { throw new Error('Download unavailable') } })
    await button(panel, d('calendarExport.download')).click(); await panel.getByRole('alert').waitFor()
    assert.equal(await page.locator('#dday-title').inputValue(), 'Mobile')
    await page.evaluate(() => window.__restoreUrl())
    const output = await download(page, () => button(panel, d('calendarExport.download')).click(), 'mobile.ics')
    assert.match(calendarText(output.bytes), /DTSTART;VALUE=DATE:20270101/)
    await mobile(page, panel, 'dday')
  }, { width: 320, dark: true, language: 'en' })
  await run('pomodoro-goal-running-pause-resume-completion-revisit', async args => {
    const { page } = args; shape('pomodoroTimer', 'goal'); const panel = await openPomodoro(args)
    await button(page, p('start')).click(); await waitTimer(page, { isRunning: true })
    await page.clock.runFor(1000); await waitTimer(page, { timeLeft: 2 })
    await panel.getByLabel(p('goal.label'), { exact: true }).fill('6'); await button(panel, p('goal.save')).click()
    await poll(async () => (await stored(page, keys.goal))?.target === 6, 'goal saved')
    await waitTimer(page, { isRunning: true, timeLeft: 2, phase: 'work' })
    await button(page, p('pause')).click(); await page.clock.runFor(3000); await waitTimer(page, { isRunning: false, timeLeft: 2 })
    await button(page, p('start')).click(); await page.clock.runFor(2000); await waitStats(page, 1, 1)
    await waitTimer(page, { phase: 'shortBreak', completedRounds: 1, totalWorkSeconds: 60, isRunning: false })
    assert.equal(await panel.getByRole('progressbar').getAttribute('aria-valuetext'), p('goal.progress', { count: 1, goal: 6 }))
    await page.clock.runFor(5000); await waitStats(page, 1, 1)
    await page.reload({ waitUntil: 'domcontentloaded' }); await goalPanel(page).waitFor()
    await poll(async () => await goalPanel(page).getByLabel(p('goal.label'), { exact: true }).inputValue() === '6', 'goal revisit')
    await waitStats(page, 1, 1); await waitTimer(page, { completedRounds: 1 })
  })
  await run('pomodoro-skip-and-break-do-not-inflate-statistics', async args => {
    const { page } = args; await openPomodoro(args, { [keys.stats]: [] })
    await button(page, p('skip')).click(); await waitTimer(page, { phase: 'shortBreak', completedRounds: 0, totalWorkSeconds: 0 })
    assert.deepEqual(await stored(page, keys.stats), [])
    await button(page, p('start')).click(); await page.clock.runFor(60000)
    await waitTimer(page, { phase: 'work', completedRounds: 0, totalWorkSeconds: 0, isRunning: false })
    assert.deepEqual(await stored(page, keys.stats), [])
    await button(page, p('start')).click(); await page.clock.runFor(60000); await waitStats(page, 1, 1)
    await button(page, p('skip')).click(); await waitTimer(page, { phase: 'work', completedRounds: 1 })
    await waitStats(page, 1, 1)
  })
  await run('pomodoro-seven-day-csv-duplicates-and-private-task-exclusion', async args => {
    const { page } = args
    const panel = await openPomodoro(args, { [keys.stats]: [{ date: '2026-11-01', count: 9, minutes: 90 }, { date: '2026-11-14', count: 1, minutes: 5 }, { date: '2026-11-14', count: 2, minutes: 7 }, { date: '2026-11-16', count: 2, minutes: 30 }], 'pomodoro-tasks': [{ id: 'secret', text: 'Private task should never export', completed: false, estimatedPomodoros: 2, completedPomodoros: 0 }] })
    const output = await download(page, () => button(panel, p('goal.export')).click(), 'pomodoro-seven-days.csv')
    assert.equal(output.name, 'pomodoro-2026-11-16-7days.csv'); assert.deepEqual([...output.bytes.subarray(0, 3)], [239, 187, 191])
    const csv = output.bytes.toString('utf8').replace(/^\uFEFF/, ''), rows = csv.trim().split('\r\n').map(row => row.split(',').map(value => value.replace(/^"|"$/g, '')))
    assert.equal(rows.length, 8); assert.deepEqual(rows[1], ['2026-11-10', '0', '0'])
    assert.deepEqual(rows[5], ['2026-11-14', '3', '12']); assert.deepEqual(rows[7], ['2026-11-16', '2', '30'])
    assert.doesNotMatch(csv, /Private|task|2026-11-01/)
    await page.evaluate(() => { URL.createObjectURL = () => { throw new Error('Download denied') } })
    await button(panel, p('goal.export')).click(); await panel.getByRole('alert').filter({ hasText: p('goal.notices.downloadFailed') }).waitFor()
  })
  await run('pomodoro-goal-quota-and-statistics-retry', async args => {
    const { page } = args; const panel = await openPomodoro(args, { [keys.goal]: { version: 1, target: 4 }, [keys.stats]: [] })
    await quota(page, keys.goal); await panel.getByLabel(p('goal.label'), { exact: true }).fill('8'); await button(panel, p('goal.save')).click()
    await panel.getByRole('alert').waitFor(); assert.equal((await stored(page, keys.goal)).target, 4)
    assert.equal(await panel.getByLabel(p('goal.label'), { exact: true }).inputValue(), '8')
    await page.evaluate(() => window.__restoreStorage()); await button(panel, p('goal.save')).click()
    await poll(async () => (await stored(page, keys.goal)).target === 8, 'goal retry')
    await quota(page, keys.stats); await button(page, p('start')).click(); await page.clock.runFor(3000)
    await panel.getByRole('alert').filter({ hasText: p('goal.statsErrors.failed') }).waitFor(); assert.deepEqual(await stored(page, keys.stats), [])
    assert.equal(await panel.getByRole('progressbar').getAttribute('aria-valuetext'), p('goal.progress', { count: 1, goal: 8 }))
    const output = await download(page, () => button(panel, p('goal.export')).click(), 'pomodoro-unsaved-progress.csv')
    assert.ok(output.bytes.toString().includes('"2026-11-16","1","1"'))
    await page.evaluate(() => window.__restoreStorage()); await button(panel, p('goal.retryStats')).click(); await waitStats(page, 1, 1)
  })
  await run('pomodoro-corrupt-storage-preserved-and-goal-conflict', async args => {
    const { page, context, open } = args
    const corruptGoal = '{"version":99,"target":9}', corruptStats = '[{"date":"2030-01-01","count":1,"minutes":1}]'
    await seed(context, { [keys.goal]: corruptGoal, [keys.stats]: corruptStats }); await open('pomodoro')
    const panel = goalPanel(page); await panel.getByRole('alert').filter({ hasText: p('goal.errors.corrupt') }).waitFor()
    await panel.getByRole('alert').filter({ hasText: p('goal.statsErrors.corrupt') }).waitFor()
    assert.equal(await raw(page, keys.goal), corruptGoal); assert.equal(await raw(page, keys.stats), corruptStats)
    assert.ok(await button(panel, p('goal.save')).isDisabled()); assert.ok(await button(panel, p('goal.export')).isDisabled())
    await page.evaluate(key => localStorage.removeItem(key), keys.goal); await button(panel, p('goal.reload')).click()
    await panel.getByLabel(p('goal.label'), { exact: true }).fill('7')
    const second = await context.newPage(); await open('pomodoro', '', second); const secondPanel = goalPanel(second)
    await poll(async () => await button(secondPanel, p('goal.save')).isEnabled(), 'second goal hydrated')
    await secondPanel.getByLabel(p('goal.label'), { exact: true }).fill('5'); await button(secondPanel, p('goal.save')).click()
    await panel.getByRole('alert').filter({ hasText: p('goal.errors.conflict') }).waitFor()
    assert.ok(await button(panel, p('goal.save')).isDisabled()); assert.equal(await panel.getByLabel(p('goal.label'), { exact: true }).inputValue(), '7')
    await button(panel, p('goal.reload')).click(); await button(panel, p('goal.save')).click()
    await poll(async () => (await stored(page, keys.goal)).target === 7, 'conflict refresh keeps input')
    assert.equal(await raw(page, keys.stats), corruptStats)
  })
  await run('pomodoro-mobile-dark-goal-and-existing-timer', async args => {
    const { page } = args; const panel = await openPomodoro(args, { [keys.goal]: { version: 1, target: 3 }, [keys.stats]: [{ date: '2026-11-16', count: 2, minutes: 50 }] })
    assert.equal(await panel.getByRole('progressbar').getAttribute('aria-valuenow'), '67')
    await button(page, p('start')).click(); await page.clock.runFor(1000); await button(page, p('pause')).click()
    await waitTimer(page, { isRunning: false, timeLeft: 2 }); await mobile(page, panel, 'pomodoro')
  }, { width: 320, dark: true, language: 'en' })
} finally { await browser.close() }
const latest = new Map()
const runs = readdirSync(out).filter(name => /^results.*\.json$/.test(name)).map(name => ({ name, ...JSON.parse(readFileSync(resolve(out, name), 'utf8')) })).sort((a, b) => a.checkedAt.localeCompare(b.checkedAt))
for (const run of runs) for (const result of run.results) latest.set(result.name, { ...result, sourceRun: run.name })
writeFileSync(resolve(out, 'final-results.json'), JSON.stringify({ base, checkedAt: new Date().toISOString(), total: latest.size, passed: [...latest.values()].filter(result => result.pass).length, results: [...latest.values()] }, null, 2))
if (results.some(result => !result.pass)) process.exitCode = 1
