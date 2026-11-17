import { chromium } from 'playwright'
import assert from 'node:assert/strict'
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

const base = process.env.VERIFY_BASE_URL || 'http://127.0.0.1:3039'
const out = resolve('docs/verify/2026-11-16-repeat-batch14/browser')
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
  const errors = [], external = [], allowed = [], fontAssets = new Set()
  await context.addInitScript(options => {
    if (!/^https?:$/.test(location.protocol)) return
    localStorage.setItem('language', options.language ?? 'ko')
    localStorage.setItem('theme', options.dark ? 'dark' : 'light')
  }, options)
  await context.route('**/*', async route => {
    const request = route.request(), url = new URL(request.url())
    if (request.url().startsWith(base)) return route.continue()
    if (options.fontCssFixture && (url.hostname === 'fonts.googleapis.com' || (url.hostname === 'cdn.jsdelivr.net' && request.resourceType() === 'stylesheet'))) return route.fulfill({ status: 200, contentType: 'text/css', body: '/* Verification-only stylesheet; font loading callbacks are controlled separately. */' })
    if (options.realFonts && url.hostname === 'fonts.googleapis.com' && /^(Noto Serif KR|Nanum Gothic)(:|$)/.test(url.searchParams.get('family') ?? '')) {
      const response = await route.fetch(), css = await response.text()
      for (const match of css.matchAll(/url\(([^)]+)\)/g)) { const asset = match[1].replace(/^['"]|['"]$/g, ''); if (new URL(asset).hostname === 'fonts.gstatic.com') fontAssets.add(asset) }
      allowed.push({ type: 'stylesheet', url: request.url(), status: response.status() }); return route.fulfill({ response })
    }
    if (options.realFonts && fontAssets.has(request.url())) { const response = await route.fetch(); allowed.push({ type: 'font', url: request.url(), status: response.status() }); return route.fulfill({ response }) }
    external.push(request.url()); return route.abort()
  })
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
    await fn({ page, context, open, allowed })
    assert.deepEqual(errors, [], 'JavaScript / hydration errors')
    results.push({ name, pass: true, milliseconds: Date.now() - start, errors, externalRequestsBlocked: external.length, allowed })
  } catch (error) {
    results.push({ name, pass: false, milliseconds: Date.now() - start, error: error.message, errors, allowed })
    await page.screenshot({ path: resolve(out, `${name}-failed.png`), caret: 'initial' }).catch(() => {})
  } finally { await context.close() }
  console.log(JSON.stringify({ ...results.at(-1), allowed: results.at(-1).allowed.map(({ type, status, url }) => ({ type, status, host: new URL(url).hostname })) }))
  writeFileSync(resolve(out, `results${only ? '-' + only.replace(/[^\w-]/g, '') : ''}.json`), JSON.stringify({ base, checkedAt: new Date().toISOString(), results }, null, 2))
}
async function seed(context, values) {
  await context.addInitScript(values => {
    if (!/^https?:$/.test(location.protocol) || localStorage.getItem('__batch14Seeded')) return
    for (const [key, value] of Object.entries(values)) localStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value))
    localStorage.setItem('__batch14Seeded', '1')
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
  assert.doesNotMatch(await panel.innerText(), /(?:profiles|pairing)\.[a-z]/)
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

const f = (key, values) => tr('fontPreview', key, values)
const key = 'toolhub:font-pair:profiles'
const pairPanel = page => page.locator('[aria-labelledby="font-pair-title"]')
const profiles = page => page.locator('[data-font-pair-profiles]')
const part = (page, role) => pairPanel(page).getByRole('group', { name: f(`pairing.roles.${role}`), exact: true })
const pairFont = (page, role) => part(page, role).locator('select').first()
const pairWeight = (page, role) => part(page, role).locator('select').last()
const pairSize = (page, role) => part(page, role).locator('input[type="range"]')
const pairText = (page, role) => part(page, role).getByRole('textbox')
const profileRow = (page, name) => profiles(page).locator('li').filter({ has: page.getByRole('heading', { name, exact: true }) })
const stylesA = { title: { fontId: 'song-myung', size: 96, weight: 900 }, body: { fontId: 'nanum-gothic', size: 40, weight: 600 } }
const stylesB = { title: { fontId: 'noto-serif-kr', size: 36, weight: 700 }, body: { fontId: 'nanum-gothic', size: 16, weight: 400 } }
const envelope = profiles => ({ version: 1, profiles })
const fixture = (id = 'profile-a', name = 'Saved style', styles = stylesA) => ({ id, name, styles })
async function ready(page, expectError = false) {
  if (new URL(page.url()).searchParams.get('pair') !== '1' && await pairPanel(page).count() === 0) await button(page, f('pairing.open')).click()
  await pairPanel(page).waitFor(); await page.waitForFunction(() => document.querySelector('link[data-fp-pair]'))
  assert.notEqual(await profiles(page).getAttribute('open'), null, 'saved styles are expanded when the pair panel opens')
  if (!expectError) await poll(async () => await page.locator('#font-pair-profile-name').isEnabled(), 'profile storage and URL ready')
}
async function openPair(args, data = [], query = '') { await seed(args.context, { [key]: envelope(data) }); await args.open('font-preview', query); await ready(args.page) }
async function style(page) {
  const result = {}
  for (const role of ['title', 'body']) result[role] = { fontId: await pairFont(page, role).inputValue(), size: Number(await pairSize(page, role).inputValue()), weight: Number(await pairWeight(page, role).inputValue()) }
  return result
}
async function editA(page) {
  for (const role of ['title', 'body']) { await pairFont(page, role).selectOption(stylesA[role].fontId); await pairWeight(page, role).selectOption(String(stylesA[role].weight)); await pairSize(page, role).focus(); await page.keyboard.press('End') }
  assert.deepEqual(await style(page), stylesA)
}
async function save(page, name, count) {
  await page.locator('#font-pair-profile-name').fill(name); await button(profiles(page), '현재 스타일 저장').click(); await poll(async () => (await stored(page, key))?.profiles.length === count, `saved ${count} profiles`)
}
async function load(page, name, expected) { await button(profileRow(page, name), '스타일 불러오기').click(); await poll(async () => JSON.stringify(await style(page)) === JSON.stringify(expected), 'saved style applied') }

try {
  await run('font-profiles-save-revisit-load-manuscript-and-delete', async args => {
    const { page, open } = args; shape('fontPreview', 'pairing'); await openPair(args)
    await editA(page); await pairText(page, 'title').fill('PRIVATE title never saved'); await pairText(page, 'body').fill('PRIVATE draft body\nRetain this manuscript.'); await save(page, 'Report style', 1)
    const saved = await stored(page, key); assert.deepEqual(saved.profiles[0].styles, stylesA); assert.deepEqual(Object.keys(saved.profiles[0]).sort(), ['id', 'name', 'styles']); assert.doesNotMatch(await raw(page, key), /PRIVATE|text|Retain/)
    await pairFont(page, 'title').selectOption('noto-serif-kr'); await page.locator('#font-pair-profile-name').fill('report style'); await button(profiles(page), '현재 스타일 저장').click(); await profiles(page).getByRole('alert').waitFor(); assert.deepEqual(await stored(page, key), saved)
    await open('font-preview'); assert.equal(await pairPanel(page).count(), 0); await ready(page); assert.equal(await pairFont(page, 'title').inputValue(), 'noto-serif-kr'); assert.equal(await pairFont(page, 'body').inputValue(), 'pretendard')
    await pairText(page, 'title').fill('New visit current title'); await pairText(page, 'body').fill('New visit current body'); await load(page, 'Report style', stylesA)
    assert.equal(await pairText(page, 'title').inputValue(), 'New visit current title'); assert.equal(await pairText(page, 'body').inputValue(), 'New visit current body'); assert.equal(new URL(page.url()).searchParams.has('pairTitleText'), false)
    const row = profileRow(page, 'Report style'); await button(row, '스타일 삭제').click(); await button(row, '취소').click(); assert.deepEqual(await stored(page, key), saved); await button(row, '스타일 삭제').click(); await button(row, '삭제 확인').click(); await poll(async () => (await stored(page, key)).profiles.length === 0, 'explicit profile deletion'); assert.deepEqual(await style(page), stylesA); assert.equal(await pairText(page, 'title').inputValue(), 'New visit current title')
    writeFileSync(resolve(out, 'style-profile-without-manuscript.json'), JSON.stringify(saved, null, 2))
  })
  await run('font-profiles-name-limit-capacity-mobile-dark', async args => {
    const { page } = args; await openPair(args, Array.from({ length: 5 }, (_, i) => fixture(`saved-${i}`, `Stored ${i + 1}`, stylesB)))
    const name = '가'.repeat(40); await page.locator('#font-pair-profile-name').fill(name + '나'); assert.equal((await page.locator('#font-pair-profile-name').inputValue()).length, 40); await button(profiles(page), '현재 스타일 저장').click(); await poll(async () => (await stored(page, key)).profiles.length === 6, 'sixth profile stored')
    const before = await raw(page, key); await page.locator('#font-pair-profile-name').fill('Seventh style'); const saveButton = button(profiles(page), '현재 스타일 저장'); if (await saveButton.isEnabled()) { await saveButton.click(); await profiles(page).getByRole('alert').waitFor() }; assert.equal(await raw(page, key), before)
    assert.ok(await page.locator('#font-pair-profile-name').evaluate(element => parseFloat(getComputedStyle(element).fontSize) >= 16)); for (const control of await profiles(page).getByRole('button').all()) assert.ok((await control.boundingBox()).height >= 44)
    await mobile(page, profiles(page), 'font-profiles'); await load(page, 'Stored 1', stylesB); assert.deepEqual(await style(page), stylesB)
  }, { width: 320, dark: true, language: 'en' })
  await run('font-profiles-quota-and-blocked-storage-recovery', async args => {
    const { page, open } = args; await openPair(args, [fixture()]); const before = await raw(page, key); await pairText(page, 'title').fill('Preserve title on failure'); await page.locator('#font-pair-profile-name').fill('Quota draft'); await quota(page, key)
    await button(profiles(page), '현재 스타일 저장').click(); await profiles(page).getByRole('alert').waitFor(); assert.equal(await raw(page, key), before); assert.equal(await page.locator('#font-pair-profile-name').inputValue(), 'Quota draft'); assert.equal(await pairText(page, 'title').inputValue(), 'Preserve title on failure')
    await page.evaluate(() => window.__restoreStorage()); await button(profiles(page), '현재 스타일 저장').click(); await poll(async () => (await stored(page, key)).profiles.length === 2, 'quota retry saved')
    const row = profileRow(page, 'Saved style'); await quota(page, key); await button(row, '스타일 삭제').click(); await button(row, '삭제 확인').click(); await profiles(page).getByRole('alert').waitFor(); assert.equal((await stored(page, key)).profiles.length, 2); await page.evaluate(() => window.__restoreStorage())
    await page.evaluate(key => { const original = Storage.prototype.getItem; window.__restoreRead = () => { Storage.prototype.getItem = original }; window.__rawProfiles = original.call(localStorage, key); Storage.prototype.getItem = function (name) { if (name === key) throw new DOMException('Verification read blocked', 'SecurityError'); return original.call(this, name) } }, key)
    await button(profiles(page), '목록 다시 읽기').click(); await profiles(page).getByRole('alert').waitFor(); assert.ok(await button(profiles(page), '현재 스타일 저장').isDisabled()); assert.equal(await button(profiles(page), '스타일 불러오기').count(), 0)
    await page.evaluate(() => window.__restoreRead()); assert.equal(await raw(page, key), await page.evaluate(() => window.__rawProfiles)); await button(profiles(page), '목록 다시 읽기').click(); await profileRow(page, 'Quota draft').waitFor(); await load(page, 'Saved style', stylesA)
    await open('font-preview'); await ready(page); assert.equal((await stored(page, key)).profiles.length, 2)
  })
  await run('font-profiles-corrupt-future-invalid-font-and-range-preserved', async args => {
    const { page, context, open } = args; await seed(context, { [key]: '{damaged' }); await open('font-preview'); await ready(page, true)
    const invalidFont = fixture(); invalidFont.styles = structuredClone(stylesA); invalidFont.styles.title.fontId = 'not-a-font'
    const invalidRange = fixture(); invalidRange.styles = structuredClone(stylesA); invalidRange.styles.body.size = 41
    const withText = fixture(); withText.styles = structuredClone(stylesA); withText.styles.title.text = 'Must reject injected text'
    const cases = ['{damaged', JSON.stringify({ version: 99, profiles: [] }), JSON.stringify(envelope([invalidFont])), JSON.stringify(envelope([invalidRange])), JSON.stringify(envelope([withText]))]
    for (const broken of cases) { await page.evaluate(({ key, broken }) => localStorage.setItem(key, broken), { key, broken }); await button(profiles(page), '목록 다시 읽기').click(); await profiles(page).getByRole('alert').waitFor(); assert.equal(await raw(page, key), broken); assert.ok(await button(profiles(page), '현재 스타일 저장').isDisabled()); assert.equal(await button(profiles(page), '스타일 불러오기').count(), 0) }
    await page.evaluate(({ key, data }) => localStorage.setItem(key, JSON.stringify(data)), { key, data: envelope([fixture()]) }); await button(profiles(page), '목록 다시 읽기').click(); await profileRow(page, 'Saved style').waitFor(); await load(page, 'Saved style', stylesA)
  })
  await run('font-profiles-two-tabs-queued-writes-conflict-and-refresh', async args => {
    const { page, context, open } = args; await openPair(args); const second = await context.newPage(); await open('font-preview', '', second); await ready(second)
    await page.locator('#font-pair-profile-name').fill('Tab A style'); await second.locator('#font-pair-profile-name').fill('Tab B style')
    await page.evaluate(key => { window.__held = false; window.__holdPromise = navigator.locks.request(key, async () => { window.__held = true; await new Promise(resolve => { window.__release = resolve }) }) }, key); await poll(async () => await page.evaluate(() => window.__held), 'profile lock acquired')
    await button(profiles(page), '현재 스타일 저장').click(); await button(profiles(second), '현재 스타일 저장').click(); assert.equal((await stored(page, key)).profiles.length, 0); await page.evaluate(async () => { window.__release(); await window.__holdPromise })
    await poll(async () => (await stored(page, key)).profiles.length === 1, 'only one stale-snapshot writer committed'); const savedName = (await stored(page, key)).profiles[0].name, loser = savedName === 'Tab A style' ? second : page, loserName = savedName === 'Tab A style' ? 'Tab B style' : 'Tab A style'
    await profiles(loser).getByRole('alert').waitFor(); assert.equal(await loser.locator('#font-pair-profile-name').inputValue(), loserName); assert.ok(await button(profiles(loser), '현재 스타일 저장').isDisabled()); assert.equal((await stored(page, key)).profiles.length, 1)
    await button(profiles(loser), '목록 다시 읽기').click(); await profileRow(loser, savedName).waitFor(); await button(profiles(loser), '현재 스타일 저장').click(); await poll(async () => (await stored(page, key)).profiles.length === 2, 'explicit reread allows retry'); assert.deepEqual((await stored(page, key)).profiles.map(item => item.name).sort(), ['Tab A style', 'Tab B style']); await second.close()
  })
  await run('font-profiles-url-css-share-collapse-and-catalog-regression', async args => {
    const { page, context, open } = args; const query = new URLSearchParams({ pair: '1', pairTitleFont: 'nanum-gothic', pairTitleSize: '52', pairTitleWeight: '800', pairTitleText: 'URL title', pairBodyFont: 'song-myung', pairBodySize: '18', pairBodyWeight: '400', pairBodyText: 'URL body' })
    await openPair(args, [fixture()], '?' + query); await poll(async () => await pairText(page, 'title').inputValue() === 'URL title', 'pair URL first restored'); assert.equal(await pairFont(page, 'title').inputValue(), 'nanum-gothic'); assert.equal(await pairSize(page, 'title').inputValue(), '52')
    await pairText(page, 'title').fill('Current private title'); await pairText(page, 'body').fill('Current body\nSecond line'); await load(page, 'Saved style', stylesA); assert.equal(await pairText(page, 'title').inputValue(), 'Current private title'); assert.equal(await pairText(page, 'body').inputValue(), 'Current body\nSecond line')
    await button(pairPanel(page), f('pairing.copyCss')).click(); await pairPanel(page).getByText(f('pairing.copyStatus.css'), { exact: true }).waitFor(); const css = (await page.evaluate(() => navigator.clipboard.readText())).replace(/\r\n/g, '\n'); assert.match(css, /font-family: 'Song Myung', serif;/); assert.match(css, /font-size: 96px;/); assert.match(css, /font-weight: 400;/); assert.match(css, /font-weight: 700;/); assert.doesNotMatch(css, /Current private/); writeFileSync(resolve(out, 'restored-profile.css'), css)
    await button(pairPanel(page), f('pairing.share')).click(); await pairPanel(page).getByText(f('pairing.copyStatus.link'), { exact: true }).waitFor(); const link = await page.evaluate(() => navigator.clipboard.readText()); const url = new URL(link); assert.equal(url.searchParams.get('pairTitleFont'), 'song-myung'); assert.equal(url.searchParams.get('pairTitleText'), 'Current private title'); assert.equal(new URL(page.url()).searchParams.get('pairTitleText'), 'URL title')
    const target = await context.newPage(); await target.goto(link); await ready(target); await poll(async () => await pairText(target, 'title').inputValue() === 'Current private title', 'new shared link restored'); assert.deepEqual(await style(target), stylesA); await target.close()
    await pairFont(page, 'title').selectOption('noto-serif-kr'); await page.evaluate(() => { window.__copyFallbacks = 0; Object.defineProperty(navigator.clipboard, 'writeText', { configurable: true, value: () => new Promise((resolve, reject) => { window.__rejectOldCopy = reject }) }); document.execCommand = () => { window.__copyFallbacks++; return false } }); await button(pairPanel(page), f('pairing.copyCss')).click(); await load(page, 'Saved style', stylesA); await page.evaluate(() => window.__rejectOldCopy(new Error('Old CSS rejected after profile load'))); await page.waitForTimeout(100); assert.equal(await page.evaluate(() => window.__copyFallbacks), 0); assert.equal(await pairPanel(page).getByText(f('pairing.copyStatus.failed'), { exact: true }).count(), 0); assert.equal(await pairPanel(page).getByText(f('pairing.copyStatus.css'), { exact: true }).count(), 0)
    await page.getByRole('searchbox', { name: f('search'), exact: true }).fill('Nanum Gothic'); const card = page.locator('.ui-card').filter({ has: page.getByRole('heading', { name: 'Nanum Gothic', exact: true }) }).last(); await button(card, f('favorite')).click(); await button(card, f('pin')).click(); const favs = await raw(page, 'fontPreview.favs'); assert.ok(new URL(page.url()).searchParams.get('f').includes('nanum-gothic'))
    await button(page, f('pairing.close')).click(); await pairPanel(page).waitFor({ state: 'hidden' }); assert.equal(await page.locator('link[data-fp-pair]').count(), 0); await button(page, f('pairing.open')).click(); await ready(page); assert.deepEqual(await style(page), stylesA); assert.equal(await pairText(page, 'title').inputValue(), 'Current private title'); assert.equal(await raw(page, 'fontPreview.favs'), favs); assert.ok(await button(page, f('unpin')).count() >= 1)
    await button(pairPanel(page), f('pairing.swap')).click(); assert.equal(await pairFont(page, 'title').inputValue(), 'nanum-gothic'); assert.equal(await pairSize(page, 'title').inputValue(), '96'); assert.equal(await pairText(page, 'title').inputValue(), 'Current private title')
    await page.reload({ waitUntil: 'domcontentloaded' }); await ready(page); await poll(async () => await pairText(page, 'title').inputValue() === 'URL title', 'reload keeps original URL priority'); assert.equal(await pairFont(page, 'title').inputValue(), 'nanum-gothic'); assert.ok(await button(page, f('unfavorite')).count() >= 1)
  })
  await run('font-profiles-load-generation-ignores-old-font-failure', async args => {
    const { page, context } = args; await context.addInitScript(() => { window.__faceChecks = []; Object.defineProperty(document.fonts, 'load', { configurable: true, value: (font, text) => new Promise((resolve, reject) => window.__faceChecks.push({ font, text, resolve, reject })) }) })
    await openPair(args, [fixture()]); await poll(async () => await page.evaluate(() => window.__faceChecks.length >= 2), 'initial font checks pending'); const oldCount = await page.evaluate(() => window.__faceChecks.length)
    await load(page, 'Saved style', stylesA); await poll(async () => await page.evaluate(count => window.__faceChecks.length >= count + 2, oldCount), 'saved style font checks queued')
    await page.evaluate(count => { for (const check of window.__faceChecks.slice(count)) check.resolve([{ status: 'loaded' }]) }, oldCount); await pairPanel(page).getByText(f('pairing.fontStatus.loading'), { exact: true }).waitFor({ state: 'hidden' })
    await page.evaluate(count => { for (const check of window.__faceChecks.slice(0, count)) check.reject(new Error('Old font request failed late')) }, oldCount); await page.waitForTimeout(100); assert.equal(await pairPanel(page).getByText(f('pairing.fontStatus.failed'), { exact: true }).count(), 0); assert.deepEqual(await style(page), stylesA)
  }, { fontCssFixture: true })
  await run('font-profiles-restored-style-two-real-fonts-load', async args => {
    const { page, allowed } = args; const query = new URLSearchParams({ pair: '1', pairTitleFont: 'song-myung', pairTitleText: 'ToolHub', pairBodyFont: 'song-myung', pairBodyText: 'Public font verification.' })
    await openPair(args, [fixture('real-style', 'Verified web fonts', stylesB)], '?' + query); await poll(async () => await pairText(page, 'title').inputValue() === 'ToolHub', 'public test text restored'); await load(page, 'Verified web fonts', stylesB)
    const handle = await page.waitForFunction(async () => {
      const title = await document.fonts.load('700 36px "Noto Serif KR"', 'ToolHub'), body = await document.fonts.load('400 16px "Nanum Gothic"', 'Public font verification.')
      if (!title.length || !body.length || ![...title, ...body].every(face => face.status === 'loaded')) return false
      return { title: title.map(face => ({ family: face.family, status: face.status })), body: body.map(face => ({ family: face.family, status: face.status })) }
    }, null, { timeout: 30000 }); const loaded = await handle.jsonValue()
    await pairPanel(page).getByText(f('pairing.fontStatus.loading'), { exact: true }).waitFor({ state: 'hidden' }); assert.equal(await pairPanel(page).getByText(f('pairing.fontStatus.failed'), { exact: true }).count(), 0); assert.ok(allowed.filter(request => request.type === 'font' && request.status === 200).length >= 2); assert.ok(allowed.every(request => request.status === 200))
    writeFileSync(resolve(out, 'restored-style-font-network.json'), JSON.stringify({ loaded, requests: allowed }, null, 2)); await pairPanel(page).getByRole('article').screenshot({ path: resolve(out, 'restored-style-real-fonts-preview.png'), caret: 'initial' })
  }, { realFonts: true })
} finally { await browser.close() }
const latest = new Map()
const runs = readdirSync(out).filter(name => /^results.*\.json$/.test(name)).map(name => ({ name, ...JSON.parse(readFileSync(resolve(out, name), 'utf8')) })).sort((a, b) => a.checkedAt.localeCompare(b.checkedAt))
for (const run of runs) for (const result of run.results) latest.set(result.name, { ...result, sourceRun: run.name })
writeFileSync(resolve(out, 'final-results.json'), JSON.stringify({ base, checkedAt: new Date().toISOString(), total: latest.size, passed: [...latest.values()].filter(result => result.pass).length, results: [...latest.values()] }, null, 2))
if (results.some(result => !result.pass)) process.exitCode = 1



