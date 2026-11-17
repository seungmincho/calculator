import { chromium } from 'playwright'
import assert from 'node:assert/strict'
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import JSZip from 'jszip'

const base = process.env.VERIFY_BASE_URL || 'http://127.0.0.1:3039'
const out = resolve('docs/verify/2026-11-16-repeat-batch9/browser')
const only = process.argv[2]
const decoderUrl = 'https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.js'
const messages = Object.fromEntries(['ko', 'en'].map(language => [language, JSON.parse(readFileSync(`messages/${language}.json`, 'utf8'))]))
const tr = (ns, key, values = {}, language = 'ko') => {
  const value = key.split('.').reduce((object, key) => object?.[key], messages[language][ns])
  assert.equal(typeof value, 'string', `Missing ${language}:${ns}.${key}`)
  return value.replace(/\{(\w+)\}/g, (match, key) => values[key] ?? match)
}
const t = (key, values) => tr('timer', key, values)
const u = (key, values) => tr('unitConverter', key, values)
const q = (key, values) => tr('qrGenerator', key, values)
const button = (scope, name) => scope.getByRole('button', { name, exact: true })
const raw = (page, key) => page.evaluate(key => localStorage.getItem(key), key)
const stored = async (page, key) => JSON.parse(await raw(page, key))
const results = []
const keys = { routine: 'toolhub-timer-routines-v1', units: 'toolhub:unit-converter:favorites' }
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
    if (!/^https?:$/.test(location.protocol) || localStorage.getItem('__batch9Seeded')) return
    for (const [key, value] of Object.entries(values)) localStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value))
    localStorage.setItem('__batch9Seeded', '1')
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
  assert.doesNotMatch(await panel.innerText(), /(?:routine|favorites|batch)\.[a-z]/)
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
const routine = page => page.locator('[data-timer-routine]')
const routineStatus = page => page.locator('[data-routine-status]')
const classic = page => page.getByRole('tabpanel')
const routineFixture = { version: 1, revision: 'fixture', profiles: [{ id: 'saved', updatedAt: '2026-11-16T01:00:00.000Z', routine: { name: 'Saved routine', stages: [{ name: 'Focus', seconds: 2 }, { name: 'Break', seconds: 3 }], repeats: 2 } }] }
async function openTimer(args, extra = {}, sound = false) {
  const { page, context, open } = args
  await page.clock.install({ time: new Date('2026-11-16T10:00:00+09:00') })
  await seed(context, { timer_settings_v2: { mode: 'timer', h: '0', m: '0', s: '10', sound, repeat: false, vibrate: false, wake: false }, ...extra })
  await context.addInitScript(() => {
    window.__oscillators = 0
    const original = AudioContext.prototype.createOscillator
    AudioContext.prototype.createOscillator = function(...args) { window.__oscillators++; return original.apply(this, args) }
  })
  await open('timer'); await routine(page).waitFor()
  await poll(async () => await classic(page).getByLabel(t('countdown.seconds'), { exact: true }).inputValue() === '10', 'timer hydration')
  await page.clock.pauseAt(new Date(await page.evaluate(() => Date.now()) + 1000))
  return routine(page)
}
async function configureRoutine(page, durations = [2, 3], repeats = 2) {
  const panel = routine(page)
  while (await panel.locator('ol li').count() > durations.length) await button(panel, t('routine.removeStage', { number: await panel.locator('ol li').count() })).click()
  while (await panel.locator('ol li').count() < durations.length) await button(panel, t('routine.addStage')).click()
  await panel.getByLabel(t('routine.name'), { exact: true }).fill('Browser routine')
  for (let index = 0; index < durations.length; index++) {
    await panel.getByLabel(t('routine.stageName', { number: index + 1 }), { exact: true }).fill(`Stage ${index + 1}`)
    await panel.getByLabel(t('routine.stageSeconds', { number: index + 1 }), { exact: true }).fill(String(durations[index]))
  }
  await panel.getByLabel(t('routine.repeats'), { exact: true }).fill(String(repeats))
}
async function expectRoutine(page, state, step, cycle) {
  await poll(async () => (await routineStatus(page).getAttribute('data-routine-status')) === state, `routine ${state}`)
  if (step !== undefined) assert.equal(await routineStatus(page).getAttribute('data-routine-step'), String(step))
  if (cycle !== undefined) assert.equal(await routineStatus(page).getAttribute('data-routine-cycle'), String(cycle))
}
const favorites = page => page.getByTestId('unit-favorites')
const unitFixture = { version: 1, favorites: [{ id: 'temp', name: 'C to F', pair: { c: 'temperature', f: 'degC', t: 'degF', p: 6, rb: 16 } }] }
async function openFavorites(page) {
  const panel = favorites(page)
  await panel.waitFor()
  if (await panel.locator('details').getAttribute('open') === null) await panel.locator('summary').click()
  await poll(async () => await panel.getByLabel(u('favorites.name'), { exact: true }).isEnabled(), 'favorites hydrated')
  return panel
}
async function saveFavorite(page, name) {
  const panel = favorites(page); await panel.getByLabel(u('favorites.name'), { exact: true }).fill(name)
  await button(panel, u('favorites.save')).click()
  await poll(async () => (await stored(page, keys.units))?.favorites?.some(favorite => favorite.name === name), 'favorite saved')
}
async function unitInputs(page, expected) {
  await poll(async () => { for (const [id, value] of Object.entries(expected)) if (await page.locator(`#uc-${id}`).inputValue() !== value) return false; return true }, `unit inputs ${JSON.stringify(expected)}`)
}
const qrPanel = page => page.locator('#qr-batch')
async function openQr({ page, open }) {
  await open('qr-generator'); await button(page, q('result.copyImage')).waitFor()
  return qrPanel(page)
}
async function createQr(page, value) {
  const panel = qrPanel(page); await panel.locator('textarea').fill(value)
  await button(panel, q('batch.generate')).click()
  await poll(async () => await button(panel, q('batch.download')).isEnabled(), 'QR batch fully generated')
}
async function decodePng(page, bytes) {
  assert.deepEqual([...bytes.subarray(0, 8)], [137,80,78,71,13,10,26,10])
  return page.evaluate(async base64 => {
    const image = await createImageBitmap(new Blob([Uint8Array.from(atob(base64), char => char.charCodeAt(0))], { type: 'image/png' }))
    const canvas = document.createElement('canvas'); canvas.width = image.width; canvas.height = image.height
    const ctx = canvas.getContext('2d'); ctx.drawImage(image, 0, 0); image.close()
    const decoded = window.jsQR(ctx.getImageData(0, 0, canvas.width, canvas.height).data, canvas.width, canvas.height)
    return { width: canvas.width, height: canvas.height, text: decoded?.data ?? null }
  }, bytes.toString('base64'))
}

try {
  await run('timer-routine-pause-resume-cycles-skip-signal', async args => {
    const { page } = args; shape('timer', 'routine'); const panel = await openTimer(args, {}, true); await configureRoutine(page)
    await button(panel, t('routine.start')).click(); await expectRoutine(page, 'running', 0, 1)
    assert.ok(await panel.getByLabel(t('routine.name'), { exact: true }).isDisabled())
    await page.clock.runFor(1000); await button(panel, t('routine.pause')).click()
    const remaining = await page.locator('[data-routine-remaining]').getAttribute('data-routine-remaining')
    await page.clock.runFor(5000); assert.equal(await page.locator('[data-routine-remaining]').getAttribute('data-routine-remaining'), remaining)
    await button(panel, t('routine.resume')).click(); await page.clock.runFor(1000); await expectRoutine(page, 'running', 1, 1)
    assert.equal(await page.evaluate(() => window.__oscillators), 3, 'one boundary emits one existing three-tone signal')
    await button(panel, t('routine.skip')).click(); await expectRoutine(page, 'running', 0, 2)
    assert.equal(await page.evaluate(() => window.__oscillators), 3, 'skip is silent')
    await page.clock.runFor(2000); await expectRoutine(page, 'running', 1, 2)
    await page.clock.runFor(3000); await expectRoutine(page, 'done', 1, 2)
    assert.equal(await page.locator('[data-routine-total-remaining]').getAttribute('data-routine-total-remaining'), '0')
    assert.equal(await page.evaluate(() => window.__oscillators), 9)
    await page.clock.runFor(5000); assert.equal(await page.evaluate(() => window.__oscillators), 9, 'completion never duplicates')
    await button(panel, t('routine.reset')).click(); await expectRoutine(page, 'idle'); assert.ok(await panel.getByLabel(t('routine.name'), { exact: true }).isEnabled())
  })
  await run('timer-routine-background-elapsed-and-muted-signal', async args => {
    const { page } = args; const panel = await openTimer(args, {}, true); await configureRoutine(page, [60, 120], 2)
    await button(panel, t('routine.start')).click(); await page.clock.fastForward(300000)
    await expectRoutine(page, 'running', 1, 2)
    assert.equal(await page.locator('[data-routine-total-remaining]').getAttribute('data-routine-total-remaining'), '60000')
    assert.equal(await page.evaluate(() => window.__oscillators), 3, 'sleep crossing many boundaries emits only latest signal')
    await button(panel, t('routine.pause')).click(); await page.clock.fastForward(300000); await expectRoutine(page, 'paused', 1, 2)
    assert.equal(await page.locator('[data-routine-total-remaining]').getAttribute('data-routine-total-remaining'), '60000')
    await page.getByRole('checkbox', { name: t('options.sound'), exact: true }).uncheck()
    await button(panel, t('routine.resume')).click(); await page.clock.fastForward(60000); await expectRoutine(page, 'done')
    assert.equal(await page.evaluate(() => window.__oscillators), 3, 'muted completion does not create tones')
  })
  await run('timer-routine-classic-mutual-exclusion-and-keyboard', async args => {
    const { page } = args; const panel = await openTimer(args); await configureRoutine(page, [3], 1)
    await button(panel, t('routine.start')).focus(); await page.keyboard.press('Space'); await expectRoutine(page, 'running')
    assert.ok(await button(classic(page), t('countdown.start')).isDisabled()); assert.ok(await button(classic(page), t('countdown.addMinute')).isDisabled())
    await page.locator('body').click({ position: { x: 2, y: 2 } }); await page.keyboard.press('Space')
    assert.ok(await button(classic(page), t('countdown.start')).isDisabled())
    await button(panel, t('routine.pause')).click(); await expectRoutine(page, 'paused')
    await button(panel, t('routine.resume')).focus(); await page.keyboard.press('Enter'); await expectRoutine(page, 'running')
    await button(panel, t('routine.pause')).click(); await button(classic(page), t('countdown.start')).click()
    assert.ok(await button(panel, t('routine.resume')).isDisabled())
    await button(classic(page), t('countdown.pause')).click(); await button(panel, t('routine.reset')).click()
    await panel.getByLabel(t('routine.name'), { exact: true }).focus(); await page.keyboard.press('Space')
    assert.ok(await button(classic(page), t('countdown.resume')).isEnabled(), 'routine input key does not resume classic timer')
    await button(classic(page), t('countdown.reset')).click()
    await page.getByRole('tab', { name: t('modes.stopwatch'), exact: true }).click(); await button(classic(page), t('stopwatch.start')).click()
    assert.ok(await button(panel, t('routine.start')).isDisabled())
    await page.clock.runFor(1250); await button(classic(page), t('stopwatch.lap')).click()
    assert.equal(await classic(page).getByRole('region', { name: t('stopwatch.laps') }).locator('tbody tr').count(), 1)
    await button(classic(page), t('stopwatch.stop')).click(); assert.ok(await button(panel, t('routine.start')).isEnabled())
  })
  await run('timer-routine-profile-quota-corrupt-and-revisit', async args => {
    const { page, context, open } = args; const panel = await openTimer(args, { [keys.routine]: routineFixture })
    await panel.getByRole('combobox').selectOption('saved'); await button(panel, t('routine.load')).click()
    await poll(async () => await panel.getByLabel(t('routine.name'), { exact: true }).inputValue() === 'Saved routine', 'routine load finishes under storage lock')
    assert.equal(await panel.getByLabel(t('routine.name'), { exact: true }).inputValue(), 'Saved routine'); await expectRoutine(page, 'idle')
    await panel.getByLabel(t('routine.name'), { exact: true }).fill('Quota draft'); const before = await raw(page, keys.routine)
    await quota(page, keys.routine); await button(panel, t('routine.save')).click(); await panel.getByRole('alert').waitFor()
    assert.equal(await raw(page, keys.routine), before); assert.equal(await panel.getByLabel(t('routine.name'), { exact: true }).inputValue(), 'Quota draft')
    await page.evaluate(() => window.__restoreStorage()); await button(panel, t('routine.save')).click()
    await poll(async () => (await stored(page, keys.routine)).profiles.length === 2, 'routine saved')
    await button(panel, t('routine.start')).click(); await page.clock.runFor(1000)
    await page.reload({ waitUntil: 'domcontentloaded' }); await poll(async () => await routine(page).getByRole('combobox').count() === 1, 'profiles revisit')
    await expectRoutine(page, 'idle'); assert.equal(await routine(page).getByLabel(t('routine.name'), { exact: true }).inputValue(), t('routine.example.name'))
    const corrupt = '{"version":99,"protected":true}'
    await page.evaluate(({ key, corrupt }) => localStorage.setItem(key, corrupt), { key: keys.routine, corrupt })
    const second = await context.newPage(); await open('timer', '', second); await routine(second).getByRole('alert').waitFor()
    assert.equal(await raw(second, keys.routine), corrupt); assert.ok(await button(routine(second), t('routine.save')).isDisabled())
    await routine(second).getByLabel(t('routine.stageSeconds', { number: 1 }), { exact: true }).fill('0')
    assert.ok(await button(routine(second), t('routine.start')).isDisabled())
  })
  await run('timer-routine-mobile-dark', async args => {
    const { page } = args; const panel = await openTimer(args); await configureRoutine(page, [3], 1)
    await button(panel, t('routine.start')).click(); await page.clock.runFor(1000); await button(panel, t('routine.pause')).click()
    await mobile(page, page.locator('#timer-routine-result'), 'timer')
    assert.ok(await panel.getByLabel(t('routine.stageSeconds', { number: 1 }), { exact: true }).isDisabled())
  }, { width: 320, dark: true, language: 'en' })
  await run('unit-favorite-values-nonlinear-css-and-management', async ({ page, open }) => {
    shape('unitConverter', 'favorites')
    await open('unit-converter', '?c=temperature&f=degC&t=degF&v=100&p=6'); await unitInputs(page, { value: '100', from: 'degC', to: 'degF' })
    assert.match(await page.locator('#unit-converter-result').innerText(), /212/)
    let panel = await openFavorites(page); await saveFavorite(page, 'Temperature')
    await open('unit-converter', '?c=css&f=px&t=rem&v=32&rb=20&p=6'); await unitInputs(page, { value: '32', from: 'px', to: 'rem', rb: '20' })
    panel = await openFavorites(page); await saveFavorite(page, 'CSS 20')
    await button(panel, 'Temperature').click(); await unitInputs(page, { value: '32', from: 'degC', to: 'degF', sig: '6' })
    assert.match(await page.locator('#unit-converter-result').innerText(), /89\.6/)
    await button(page, u('swap')).click(); await unitInputs(page, { value: '89.6', from: 'degF', to: 'degC' })
    assert.match(await page.locator('#unit-converter-result').innerText(), /32/)
    await open('unit-converter', '?c=fuel&f=kmL&t=L100km&v=10'); await unitInputs(page, { value: '10', from: 'kmL', to: 'L100km' })
    assert.match(await page.locator('#unit-converter-result').innerText(), /10/)
    panel = await openFavorites(page); await button(panel, 'CSS 20').click(); await unitInputs(page, { value: '10', from: 'px', to: 'rem', rb: '20', sig: '6' })
    assert.match(await page.locator('#unit-converter-result').innerText(), /0\.5/)
    await poll(async () => JSON.parse(await raw(page, 'unitConverter.recent'))?.[0]?.c === 'css', 'existing recent history stores converted state')
    const row = panel.locator('li').filter({ has: page.getByRole('heading', { name: 'CSS 20', exact: true }) })
    await button(row, u('favorites.rename')).click(); await row.getByLabel(u('favorites.newName'), { exact: true }).fill('CSS renamed'); await button(row, u('favorites.renameSave')).click()
    await poll(async () => (await stored(page, keys.units)).favorites.some(favorite => favorite.name === 'CSS renamed'), 'favorite rename')
    const renamed = panel.locator('li').filter({ has: page.getByRole('heading', { name: 'CSS renamed', exact: true }) })
    await button(renamed, u('favorites.delete')).click(); await button(renamed, u('favorites.cancel')).click(); assert.equal((await stored(page, keys.units)).favorites.length, 2)
    await button(renamed, u('favorites.delete')).click(); await button(renamed, u('favorites.deleteConfirm')).click()
    await poll(async () => (await stored(page, keys.units)).favorites.length === 1, 'favorite deleted')
    assert.ok((await stored(page, keys.units)).favorites.every(favorite => !('v' in favorite.pair)))
    await page.reload({ waitUntil: 'domcontentloaded' }); await button(favorites(page), 'Temperature').waitFor(); await unitInputs(page, { value: '10', from: 'px', to: 'rem' })
  })
  await run('unit-favorite-quota-corrupt-and-recent-preservation', async ({ page, context, open }) => {
    const corruptRecent = '{"protected":"bad recent"}'
    await seed(context, { 'unitConverter.recent': corruptRecent }); await open('unit-converter', '?v=5'); await unitInputs(page, { value: '5' })
    const panel = await openFavorites(page); await saveFavorite(page, 'Original'); const before = await raw(page, keys.units)
    await page.locator('#uc-to').selectOption('cm'); await quota(page, keys.units)
    await panel.getByLabel(u('favorites.name'), { exact: true }).fill('Unwritten name'); await button(panel, u('favorites.save')).click(); await panel.getByRole('alert').waitFor()
    assert.equal(await raw(page, keys.units), before); assert.equal(await panel.getByLabel(u('favorites.name'), { exact: true }).inputValue(), 'Unwritten name')
    assert.equal(await raw(page, 'unitConverter.recent'), corruptRecent)
    await page.evaluate(() => window.__restoreStorage()); await saveFavorite(page, 'Recovered')
    const corrupt = '{"version":99,"protected":true}'
    await page.evaluate(({ key, corrupt }) => localStorage.setItem(key, corrupt), { key: keys.units, corrupt }); await button(panel, u('favorites.refresh')).click()
    await panel.getByRole('alert').waitFor(); assert.equal(await raw(page, keys.units), corrupt); assert.ok(await button(panel, u('favorites.save')).isDisabled())
  })
  await run('unit-favorite-two-tab-conflict', async ({ page, context, open }) => {
    await open('unit-converter'); await openFavorites(page); await saveFavorite(page, 'Original')
    const second = await context.newPage(); await open('unit-converter', '?c=weight&v=7', second); const panel = await openFavorites(second)
    await panel.getByLabel(u('favorites.name'), { exact: true }).fill('Second draft')
    await page.locator('#uc-to').selectOption('cm'); await saveFavorite(page, 'First addition')
    await panel.getByRole('alert').waitFor(); assert.ok(await button(panel, u('favorites.save')).isDisabled())
    assert.equal(await panel.getByLabel(u('favorites.name'), { exact: true }).inputValue(), 'Second draft')
    await button(panel, u('favorites.refresh')).click(); await saveFavorite(second, 'Second draft')
    assert.equal((await stored(page, keys.units)).favorites.length, 3); assert.equal(await second.locator('#uc-value').inputValue(), '7')
  })
  await run('unit-favorite-mobile-url-priority-traditional-and-invalid-value', async ({ page, context, open }) => {
    await seed(context, { [keys.units]: unitFixture }); await open('unit-converter', '?c=css&f=px&t=rem&v=32&rb=20')
    await unitInputs(page, { value: '32', from: 'px', to: 'rem', rb: '20' }); const panel = await openFavorites(page)
    await page.getByRole('tab', { name: u('categories.traditional'), exact: true }).click(); assert.ok(await button(panel, u('favorites.save')).isDisabled())
    await page.locator('#uc-value').fill('-'); await button(panel, 'C to F').click(); await unitInputs(page, { value: '-', from: 'degC', to: 'degF', sig: '6' })
    await page.locator('#uc-value').fill('0'); assert.match(await page.locator('#unit-converter-result').innerText(), /32/)
    await mobile(page, panel, 'unit')
  }, { width: 320, dark: true, language: 'en' })
  await run('qr-real-zip-independent-decode-and-existing-wifi-vcard', async args => {
    const { page } = args; shape('qrGenerator', 'batch'); const panel = await openQr(args)
    const native = await page.evaluate(async () => ({ available: typeof BarcodeDetector !== 'undefined', formats: typeof BarcodeDetector !== 'undefined' ? await BarcodeDetector.getSupportedFormats() : [] }))
    await page.addScriptTag({ url: decoderUrl }); assert.equal(await page.evaluate(() => typeof window.jsQR), 'function')
    const payloads = ['https://example.com/batch-fixture', ' 안녕\tQR ', 'plain text fixture']
    const input = `same\t${payloads[0]}\nsame\t${payloads[1]}\n../CON\t${payloads[2]}\n`
    await createQr(page, input); assert.equal(await panel.getByRole('img').count(), 3)
    const output = await download(page, () => button(panel, q('batch.download')).click(), 'qr-three.zip')
    assert.equal(output.name, 'qr-batch-3.zip'); const zip = await JSZip.loadAsync(output.bytes)
    const entries = Object.values(zip.files).filter(file => !file.dir)
    assert.deepEqual(entries.map(file => file.name), ['qr-001-same.png', 'qr-002-same.png', 'qr-003-CON.png'])
    const decoded = []
    for (let index = 0; index < entries.length; index++) {
      const bytes = await entries[index].async('nodebuffer'), value = await decodePng(page, bytes)
      assert.deepEqual(value, { width: 512, height: 512, text: payloads[index] }); decoded.push({ file: entries[index].name, ...value })
      writeFileSync(resolve(out, entries[index].name), bytes)
    }
    assert.doesNotMatch(page.url(), /batch-fixture|plain%20text/)
    const storage = await page.evaluate(() => Object.values(localStorage).join('\n')); assert.doesNotMatch(storage, /batch-fixture|plain text fixture/)
    await page.getByRole('tab', { name: q('types.wifi'), exact: true }).click()
    await page.locator('#qr-ssid').fill('Fixture wifi'); await page.locator('#qr-password').fill('test1234')
    const wifi = await download(page, () => button(page, q('result.downloadPng')).click(), 'single-wifi.png')
    const wifiDecoded = await decodePng(page, wifi.bytes); assert.equal(wifiDecoded.text, 'WIFI:T:WPA;S:Fixture wifi;P:test1234;H:false;;')
    await page.getByRole('tab', { name: q('types.vcard'), exact: true }).click(); await page.locator('#qr-name').fill('Fixture Person'); await page.locator('#qr-tel').fill('01000000000')
    const vcard = await download(page, () => button(page, q('result.downloadPng')).click(), 'single-vcard.png')
    const vcardDecoded = await decodePng(page, vcard.bytes); assert.match(vcardDecoded.text, /BEGIN:VCARD/); assert.match(vcardDecoded.text, /Fixture Person/); assert.match(vcardDecoded.text, /TEL;TYPE=CELL:01000000000/)
    assert.equal(await panel.getByRole('img').count(), 3, 'existing single QR changes do not alter completed batch')
    writeFileSync(resolve(out, 'qr-independent-decoded.json'), JSON.stringify({ decoderUrl, native, decoded, single: [wifiDecoded, vcardDecoded] }, null, 2))
  }, { decoder: true })
  await run('qr-errors-block-whole-batch-and-edits-clear-output', async args => {
    const { page } = args; const panel = await openQr(args), input = panel.locator('textarea')
    for (const value of ['good\n\nbad', '한'.repeat(334), Array.from({ length: 31 }, (_, index) => `row ${index}`).join('\n'), 'a'.repeat(30001)]) {
      await input.fill(value); assert.ok(await button(panel, q('batch.generate')).isDisabled()); assert.ok(await button(panel, q('batch.download')).isDisabled()); assert.ok(await panel.getByRole('alert').count() > 0)
    }
    await createQr(page, 'First\nSecond'); assert.equal(await panel.getByRole('img').count(), 2)
    await input.fill('Changed'); assert.equal(await panel.getByRole('img').count(), 0); assert.ok(await button(panel, q('batch.download')).isDisabled())
    await button(panel, q('batch.generate')).click(); await poll(async () => await button(panel, q('batch.download')).isEnabled(), 'corrected QR regenerates')
    assert.equal(await panel.getByRole('img').count(), 1)
    await page.reload({ waitUntil: 'domcontentloaded' }); await button(page, q('result.copyImage')).waitFor()
    assert.equal(await qrPanel(page).locator('textarea').inputValue(), '', 'batch input is never persisted')
  })
  await run('qr-cancel-stale-generation-and-download-failures', async args => {
    const { page } = args; const panel = await openQr(args)
    await page.clock.install(); await page.clock.pauseAt(new Date(await page.evaluate(() => Date.now()) + 1000))
    const input = panel.locator('textarea'); await input.fill('Cancel one\nCancel two')
    await button(panel, q('batch.generate')).click(); await button(panel, q('batch.cancel')).click(); await page.clock.runFor(100)
    assert.equal(await panel.getByRole('img').count(), 0); assert.ok(await button(panel, q('batch.download')).isDisabled())
    await button(panel, q('batch.generate')).click(); await input.fill('Replacement'); await page.clock.runFor(100)
    assert.equal(await panel.getByRole('img').count(), 0); assert.ok(await button(panel, q('batch.download')).isDisabled())
    await page.evaluate(() => { const original = HTMLCanvasElement.prototype.toDataURL; window.__restoreCanvas = () => { HTMLCanvasElement.prototype.toDataURL = original }; HTMLCanvasElement.prototype.toDataURL = () => { throw new Error('Canvas export failed') } })
    await button(panel, q('batch.generate')).click(); await page.clock.runFor(100); await panel.getByRole('alert').first().waitFor()
    assert.equal(await panel.getByRole('img').count(), 0); assert.ok(await button(panel, q('batch.download')).isDisabled())
    await page.evaluate(() => window.__restoreCanvas()); await button(panel, q('batch.generate')).click(); await page.clock.runFor(100)
    await poll(async () => await button(panel, q('batch.download')).isEnabled(), 'QR render failure recovery')
    await page.evaluate(() => { const original = URL.createObjectURL; window.__restoreObjectUrl = () => { URL.createObjectURL = original }; URL.createObjectURL = () => { throw new Error('ZIP download failed') } })
    await button(panel, q('batch.download')).click(); await page.clock.runFor(100); await panel.getByRole('alert').waitFor()
    assert.equal(await input.inputValue(), 'Replacement'); assert.equal(await panel.getByRole('img').count(), 1)
    await page.evaluate(() => window.__restoreObjectUrl())
    const event = page.waitForEvent('download'); await button(panel, q('batch.download')).click(); await page.clock.runFor(100)
    const file = await event; await file.saveAs(resolve(out, 'qr-recovered.zip'))
    let lateDownloads = 0; page.on('download', () => { lateDownloads++ })
    await panel.evaluate((element, downloadLabel) => {
      [...element.querySelectorAll('button')].find(button => button.textContent === downloadLabel).click()
      const textarea = element.querySelector('textarea')
      Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set.call(textarea, 'Edited during ZIP')
      textarea.dispatchEvent(new Event('input', { bubbles: true }))
    }, q('batch.download'))
    await page.clock.runFor(100); assert.equal(lateDownloads, 0, 'same-turn input invalidation suppresses stale ZIP download')
    assert.equal(await panel.getByRole('img').count(), 0); assert.ok(await button(panel, q('batch.download')).isDisabled())
  })
  await run('qr-mobile-dark-preview-and-original-input', async args => {
    const { page } = args; const panel = await openQr(args)
    await createQr(page, '모바일\t안녕하세요 QR'); assert.equal(await page.locator('#qr-url').inputValue(), 'https://toolhub.ai.kr')
    await mobile(page, panel, 'qr')
  }, { width: 320, dark: true, language: 'en' })
} finally { await browser.close() }
const latest = new Map()
const runs = readdirSync(out).filter(name => /^results.*\.json$/.test(name)).map(name => ({ name, ...JSON.parse(readFileSync(resolve(out, name), 'utf8')) })).sort((a, b) => a.checkedAt.localeCompare(b.checkedAt))
for (const run of runs) for (const result of run.results) latest.set(result.name, { ...result, sourceRun: run.name })
writeFileSync(resolve(out, 'final-results.json'), JSON.stringify({ base, checkedAt: new Date().toISOString(), total: latest.size, passed: [...latest.values()].filter(result => result.pass).length, results: [...latest.values()] }, null, 2))
if (results.some(result => !result.pass)) process.exitCode = 1
