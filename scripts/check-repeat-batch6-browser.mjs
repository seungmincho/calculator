import { chromium } from 'playwright'
import assert from 'node:assert/strict'
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

const base = process.env.VERIFY_BASE_URL || 'http://127.0.0.1:3039'
const out = resolve('docs/verify/2026-11-16-repeat-batch6/browser')
const only = process.argv[2]
const messages = Object.fromEntries(['ko', 'en'].map(language => [language, JSON.parse(readFileSync(resolve(`messages/${language}.json`), 'utf8'))]))
const tr = (ns, key, values = {}, language = 'ko') => {
  const value = key.split('.').reduce((item, key) => item?.[key], messages[language][ns])
  assert.equal(typeof value, 'string', `Missing translation ${language}:${ns}.${key}`)
  return value.replace(/\{(\w+)\}/g, (match, name) => values[name] ?? match)
}
const n = (key, values) => tr('numberToKorean', key, values)
const f = (key, values) => tr('fontPreview', key, values)
const button = (scope, name) => scope.getByRole('button', { name, exact: true })
const numberPanel = page => page.locator('[aria-labelledby="number-batch-heading"]')
const numberInput = page => page.locator('#number-batch-input')
const results = []
mkdirSync(out, { recursive: true })
const browser = await chromium.launch({ channel: 'chrome' })

async function run(name, fn, options = {}) {
  if (only && !only.split(',').some(part => name.includes(part))) return
  const context = await browser.newContext({ viewport: { width: options.width ?? 1280, height: 900 }, serviceWorkers: 'block', acceptDownloads: true, permissions: ['clipboard-read', 'clipboard-write'] })
  const errors = [], external = [], allowed = [], fontAssets = new Set()
  await context.addInitScript(options => {
    if (!/^https?:$/.test(location.protocol)) return
    localStorage.setItem('language', options.language ?? 'ko')
    localStorage.setItem('theme', options.dark ? 'dark' : 'light')
  }, options)
  await context.route('**/*', async route => {
    const request = route.request(), url = new URL(request.url())
    if (request.url().startsWith(base)) return route.continue()
    if (options.fontCssFixture && url.hostname === 'fonts.googleapis.com') return route.fulfill({ status: 200, contentType: 'text/css', body: '/* Successful stylesheet for Font Loading API failure-state verification. */' })
    if (options.realFonts && url.hostname === 'fonts.googleapis.com' && /^(Noto Serif KR|Nanum Gothic)(:|$)/.test(url.searchParams.get('family') ?? '')) {
      const response = await route.fetch()
      const css = await response.text()
      for (const match of css.matchAll(/url\(([^)]+)\)/g)) {
        const asset = match[1].replace(/^['"]|['"]$/g, '')
        if (new URL(asset).hostname === 'fonts.gstatic.com') fontAssets.add(asset)
      }
      allowed.push({ type: 'stylesheet', url: request.url(), status: response.status() })
      return route.fulfill({ response })
    }
    if (options.realFonts && fontAssets.has(request.url())) {
      if (options.blockFontAssets) { allowed.push({ type: 'font', url: request.url(), status: 'blocked-for-verification' }); return route.abort() }
      const response = await route.fetch()
      allowed.push({ type: 'font', url: request.url(), status: response.status() })
      return route.fulfill({ response })
    }
    external.push(request.url())
    return route.abort()
  })
  context.on('page', page => {
    page.setDefaultTimeout(15000)
    page.setDefaultNavigationTimeout(120000)
    page.on('pageerror', error => errors.push(error.message))
    page.on('console', message => { if (message.type() === 'error' && /hydration|didn't match|server rendered HTML/i.test(message.text())) errors.push(message.text()) })
    page.on('dialog', dialog => dialog.accept())
  })
  const page = await context.newPage()
  const open = async (slug, query = '', target = page) => {
    await target.goto(`${base}/${slug}/${query}`, { waitUntil: 'domcontentloaded' })
    await target.locator('main h1').first().waitFor()
  }
  const startedAt = Date.now()
  try {
    await fn({ page, context, open, allowed })
    assert.deepEqual(errors, [], 'JavaScript / hydration errors')
    results.push({ name, pass: true, milliseconds: Date.now() - startedAt, errors, externalRequestsBlocked: external.length, allowed })
  } catch (error) {
    results.push({ name, pass: false, milliseconds: Date.now() - startedAt, error: error.message, errors, allowed })
    await page.screenshot({ path: resolve(out, `${name}-failed.png`), fullPage: true, caret: 'initial' }).catch(() => {})
  } finally { await context.close() }
  console.log(JSON.stringify({ ...results.at(-1), allowed: results.at(-1).allowed.map(({ type, status, url }) => ({ type, status, host: new URL(url).hostname })) }))
  writeFileSync(resolve(out, `results${only ? '-' + only.replace(/[^\w-]/g, '') : ''}.json`), JSON.stringify({ base, checkedAt: new Date().toISOString(), results }, null, 2))
}

function shape(namespace, prefix) {
  const flat = (value, path = '') => Object.entries(value).flatMap(([key, item]) => typeof item === 'object' && item !== null ? flat(item, `${path}${key}.`) : [`${path}${key}:${typeof item}`]).sort()
  const ko = messages.ko[namespace][prefix], en = messages.en[namespace][prefix]
  assert.ok(ko && en)
  assert.deepEqual(flat(ko), flat(en))
}
async function clipboard(page) { return page.evaluate(() => navigator.clipboard.readText()) }
async function rejectClipboard(page) { await page.evaluate(() => { Object.defineProperty(navigator.clipboard, 'writeText', { configurable: true, value: async () => { throw new DOMException('Blocked for verification', 'NotAllowedError') } }) }) }
async function mobile(page, panel, name) {
  await panel.scrollIntoViewIfNeeded()
  assert.equal(await page.evaluate(() => document.documentElement.classList.contains('dark')), true)
  const width = await page.evaluate(() => ({ viewport: innerWidth, body: document.body.scrollWidth, document: document.documentElement.scrollWidth }))
  assert.ok(width.body <= width.viewport + 1 && width.document <= width.viewport + 1, `Page overflow ${JSON.stringify(width)}`)
  assert.doesNotMatch(await panel.innerText(), /(?:batch|pairing)\.[a-zA-Z]/, 'Untranslated new key')
  await panel.screenshot({ path: resolve(out, `${name}-320-dark-en-panel.png`), caret: 'initial' })
  await page.evaluate(() => scrollTo(0, 0))
  await page.screenshot({ path: resolve(out, `${name}-320-dark-en-top.png`), caret: 'initial' })
}
const mixedNumbers = 'Salary\t1,234,567\n\nInvalid\tno number\nLarge\t12345678901234567890\nZero\t0\nMinus\t-3\nDecimal\t1.5\n=HYPERLINK("https://example.test")\t1000\nEmpty\t\nToo many\t12\textra'
const rows = page => numberPanel(page).locator('tbody tr')
const cells = row => row.locator('th, td').allTextContents()
const pairPanel = page => page.locator('[aria-labelledby="font-pair-title"]')
const part = (page, role) => pairPanel(page).getByRole('group', { name: f(`pairing.roles.${role}`), exact: true })
const pairFont = (page, role) => part(page, role).locator('select').first()
const pairWeight = (page, role) => part(page, role).locator('select').last()
const pairText = (page, role) => part(page, role).getByRole('textbox')
async function waitPair(page) {
  if (new URL(page.url()).searchParams.get('pair') !== '1' && await pairPanel(page).count() === 0) await button(page, f('pairing.open')).click()
  await pairPanel(page).waitFor()
  await pairFont(page, 'title').waitFor()
  await page.waitForFunction(() => document.querySelector('link[data-fp-pair]') !== null)
}

try {
  await run('number-mixed-rows-and-precision', async ({ page, open }) => {
    shape('numberToKorean', 'batch')
    await open('number-to-korean')
    await numberInput(page).fill(mixedNumbers)
    await rows(page).nth(8).waitFor()
    assert.equal(await rows(page).count(), 9)
    assert.deepEqual(await rows(page).locator('th').allTextContents(), ['1', '3', '4', '5', '6', '7', '8', '9', '10'])
    assert.equal((await cells(rows(page).nth(0)))[3], '1234567')
    assert.equal((await cells(rows(page).nth(0)))[4], '백이십삼만사천오백육십칠')
    assert.equal((await cells(rows(page).nth(2)))[3], '12345678901234567890')
    for (const index of [3, 4, 5]) assert.equal((await cells(rows(page).nth(index)))[6], n('batch.formalUnavailable'))
    assert.equal((await cells(rows(page).nth(1)))[6], n('batch.errors.invalidAmount'))
    await numberPanel(page).getByRole('status').filter({ hasText: n('batch.summary', { total: 10, valid: 6, invalid: 3, skipped: 1 }) }).waitFor()
    assert.equal(new URL(page.url()).searchParams.has('n'), false)
  })
  await run('number-real-clipboard-and-csv', async ({ page, open }) => {
    await open('number-to-korean')
    await numberInput(page).fill(mixedNumbers)
    await button(numberPanel(page), n('batch.copyTable')).click()
    await numberPanel(page).getByText(n('batch.copied'), { exact: true }).waitFor()
    const tsv = await clipboard(page)
    assert.match(tsv, /'12345678901234567890/)
    assert.match(tsv, /'=HYPERLINK/)
    assert.match(tsv, new RegExp(n('batch.errors.invalidAmount')))
    assert.equal(tsv.split('\r\n').length, 10)
    writeFileSync(resolve(out, 'number-table.tsv'), tsv)
    const downloadEvent = page.waitForEvent('download')
    await button(numberPanel(page), n('batch.downloadCsv')).click()
    const download = await downloadEvent
    assert.equal(download.suggestedFilename(), 'number-to-korean-batch.csv')
    const file = resolve(out, download.suggestedFilename())
    await download.saveAs(file)
    const csv = readFileSync(file, 'utf8')
    assert.equal(csv.charCodeAt(0), 0xfeff)
    assert.match(csv, /'12345678901234567890/)
    assert.match(csv, /'=HYPERLINK\(""https:\/\/example.test""\)/)
    assert.match(csv, new RegExp(n('batch.errors.tooManyColumns')))
  })
  await run('number-limits-and-copy-failure', async ({ page, open }) => {
    await open('number-to-korean')
    const panel = numberPanel(page)
    await numberInput(page).fill(Array.from({ length: 100 }, () => '1').join('\n'))
    await rows(page).nth(99).waitFor()
    assert.equal(await rows(page).count(), 100)
    await numberInput(page).fill(Array.from({ length: 101 }, () => '1').join('\n'))
    await panel.getByRole('alert').filter({ hasText: n('batch.errors.tooManyLines') }).waitFor()
    assert.equal(await rows(page).count(), 0)
    assert.ok(await button(panel, n('batch.downloadCsv')).isDisabled())
    await numberInput(page).fill('x'.repeat(30001))
    await panel.getByRole('alert').filter({ hasText: n('batch.errors.tooManyCharacters') }).waitFor()
    await numberInput(page).fill('1000')
    await rejectClipboard(page)
    await button(panel, n('batch.copyTable')).click()
    await panel.getByRole('alert').filter({ hasText: n('batch.copyFailed') }).waitFor()
    assert.equal(await panel.getByText(n('batch.copied'), { exact: true }).count(), 0)
    assert.equal(await numberInput(page).inputValue(), '1000')
  })
  await run('number-single-url-and-options-regression', async ({ page, open }) => {
    await open('number-to-korean', '?n=1234567')
    await page.waitForFunction(() => document.querySelector('#ntk-input')?.value === '1,234,567')
    await numberInput(page).fill('Secret test label\t1234567')
    await page.getByRole('radio', { name: '일금', exact: true }).click()
    await page.getByRole('checkbox', { name: n('spacing'), exact: true }).check()
    await rows(page).first().waitFor()
    assert.equal((await cells(rows(page).first()))[5], '일금 일백이십삼만 사천오백육십칠원정')
    await button(page, '+1만').click()
    assert.equal(await page.locator('#ntk-input').inputValue(), '1,244,567')
    assert.equal(new URL(page.url()).searchParams.get('n'), '1244567')
    assert.doesNotMatch(page.url(), /Secret|test|label/)
  })
  await run('number-mobile-320-dark-english-setting', async ({ page, open }) => {
    shape('numberToKorean', 'batch')
    await open('number-to-korean')
    await numberInput(page).fill(mixedNumbers)
    await rows(page).nth(8).waitFor()
    const region = numberPanel(page).getByRole('region')
    const internal = await region.evaluate(element => ({ scroll: element.scrollWidth, client: element.clientWidth }))
    assert.ok(internal.scroll > internal.client, 'Wide output scrolls within its region')
    await mobile(page, numberPanel(page), 'number')
  }, { width: 320, dark: true, language: 'en' })

  await run('font-pair-swap-css-and-share-roundtrip', async ({ page, context, open }) => {
    shape('fontPreview', 'pairing')
    await open('font-preview')
    assert.equal(await pairPanel(page).count(), 0)
    assert.equal(await page.locator('link[data-fp-pair]').count(), 0)
    await waitPair(page)
    await pairFont(page, 'title').selectOption('song-myung')
    await pairWeight(page, 'title').selectOption('900')
    await pairFont(page, 'body').selectOption('nanum-gothic')
    await pairWeight(page, 'body').selectOption('600')
    await part(page, 'title').getByRole('slider').press('End')
    await part(page, 'body').getByRole('slider').press('End')
    await pairText(page, 'title').fill('Public test heading')
    await pairText(page, 'body').fill('Public test paragraph.\nSecond line.')
    await button(pairPanel(page), f('pairing.copyCss')).click()
    await pairPanel(page).getByText(f('pairing.copyStatus.css'), { exact: true }).waitFor()
    const css = await clipboard(page)
    assert.match(css, /font-family: 'Song Myung', serif;/)
    assert.match(css, /font-size: 96px;/)
    assert.match(css, /font-size: 40px;/)
    assert.match(css, /font-weight: 400;/)
    assert.match(css, /font-weight: 700;/)
    writeFileSync(resolve(out, 'font-pair.css'), css)
    assert.equal(new URL(page.url()).searchParams.has('pairTitleText'), false, 'Typing does not put pair text in address bar')
    await button(pairPanel(page), f('pairing.swap')).click()
    assert.equal(await pairFont(page, 'title').inputValue(), 'nanum-gothic')
    assert.equal(await pairFont(page, 'body').inputValue(), 'song-myung')
    assert.equal(await pairText(page, 'title').inputValue(), 'Public test heading')
    assert.equal(await part(page, 'title').getByRole('slider').inputValue(), '96')
    await button(pairPanel(page), f('pairing.share')).click()
    await pairPanel(page).getByText(f('pairing.copyStatus.link'), { exact: true }).waitFor()
    const shared = new URL(await clipboard(page))
    assert.equal(shared.searchParams.get('pairTitleFont'), 'nanum-gothic')
    assert.equal(shared.searchParams.get('pairBodyText'), 'Public test paragraph.\nSecond line.')
    assert.equal(new URL(page.url()).searchParams.has('pairTitleText'), false)
    const second = await context.newPage()
    await second.goto(shared.href, { waitUntil: 'domcontentloaded' })
    await second.waitForFunction(() => document.querySelector('[aria-labelledby="font-pair-title"] textarea')?.value === 'Public test heading')
    assert.equal(await pairFont(second, 'title').inputValue(), 'nanum-gothic')
    assert.equal(await pairFont(second, 'body').inputValue(), 'song-myung')
    assert.equal(await part(second, 'body').getByRole('slider').inputValue(), '40')
    assert.equal(await pairText(second, 'body').inputValue(), 'Public test paragraph.\nSecond line.')
    await button(page, f('pairing.close')).click()
    await pairPanel(page).waitFor({ state: 'hidden' })
    assert.equal(await page.locator('link[data-fp-pair]').count(), 0, 'Collapsing releases pair-specific CSS links')
    await waitPair(page)
    assert.equal(await pairFont(page, 'title').inputValue(), 'nanum-gothic')
    assert.equal(await pairText(page, 'title').inputValue(), 'Public test heading')
    assert.equal(await pairText(page, 'body').inputValue(), 'Public test paragraph.\nSecond line.')
  })

  await run('font-invalid-url-copy-failure-and-catalog-regression', async ({ page, open }) => {
    await open('font-preview', '?pair=1&pairTitleFont=invalid-remote-font&pairTitleSize=-99&pairTitleWeight=950&pairBodyFont=nanum-gothic&pairBodySize=NaN&pairBodyWeight=600')
    await waitPair(page)
    await page.waitForFunction(() => document.querySelector('[aria-labelledby="font-pair-title"] input[type=range]')?.value === '16')
    assert.equal(await pairFont(page, 'title').inputValue(), 'noto-serif-kr')
    assert.equal(await part(page, 'body').getByRole('slider').inputValue(), '16')
    await part(page, 'body').getByText(f('pairing.adjusted', { requested: 600, applied: 700 }), { exact: true }).waitFor()
    await rejectClipboard(page)
    await page.evaluate(() => { document.execCommand = () => false })
    await button(pairPanel(page), f('pairing.copyCss')).click()
    await pairPanel(page).getByRole('alert').filter({ hasText: f('pairing.copyStatus.failed') }).waitFor()
    await page.getByRole('searchbox', { name: f('search'), exact: true }).fill('Nanum Gothic')
    const card = page.locator('.ui-card').filter({ has: page.getByRole('heading', { name: 'Nanum Gothic', exact: true }) }).last()
    await button(card, f('favorite')).click()
    await page.waitForFunction(() => JSON.parse(localStorage.getItem('fontPreview.favs'))?.includes('nanum-gothic'))
    await button(card, f('pin')).click()
    await page.waitForFunction(() => new URL(location.href).searchParams.get('f')?.includes('nanum-gothic'))
    await page.reload({ waitUntil: 'domcontentloaded' })
    await button(page, f('unpin')).first().waitFor()
    await button(page, f('unfavorite')).first().waitFor()
    assert.ok(await button(page, f('unpin')).count() >= 1)
    assert.ok(await button(page, f('unfavorite')).count() >= 1)
    assert.equal(await pairFont(page, 'title').inputValue(), 'noto-serif-kr')
  })

  await run('font-mobile-320-dark-english-setting', async ({ page, open }) => {
    shape('fontPreview', 'pairing')
    await open('font-preview')
    assert.equal(await pairPanel(page).count(), 0)
    await page.screenshot({ path: resolve(out, 'font-320-dark-collapsed-top.png'), caret: 'initial' })
    await waitPair(page)
    await pairText(page, 'title').fill('LongHeadingWithoutSpacesForWrapping')
    await pairText(page, 'body').fill('LongBodyTextWithoutSpaces'.repeat(12))
    await part(page, 'title').getByRole('slider').press('End')
    await button(pairPanel(page), f('pairing.swap')).click()
    await button(pairPanel(page), f('pairing.showCss')).click()
    await mobile(page, pairPanel(page), 'font')
  }, { width: 320, dark: true, language: 'en' })

  await run('font-two-real-webfonts-load', async ({ page, open, allowed }) => {
    const query = new URLSearchParams({ pair: '1', pairTitleFont: 'noto-serif-kr', pairTitleWeight: '700', pairTitleText: 'ToolHub', pairBodyFont: 'nanum-gothic', pairBodyWeight: '400', pairBodyText: 'Public font verification.' })
    await open('font-preview', '?' + query)
    await waitPair(page)
    await page.waitForFunction(() => document.querySelector('[aria-labelledby="font-pair-title"] textarea')?.value === 'ToolHub')
    await page.waitForFunction(() => [...document.fonts].some(font => /Noto Serif KR/.test(font.family)) && [...document.fonts].some(font => /Nanum Gothic/.test(font.family)), null, { timeout: 30000 })
    await page.waitForFunction(() => [...document.querySelectorAll('link[data-fp-pair]')].filter(link => link.href.includes('text=HTblou') || link.href.includes('text=.Pabcefilnortuv')).length === 2 && [...document.querySelectorAll('link[data-fp-pair]')].every(link => link.sheet !== null))
    const loadedHandle = await page.waitForFunction(async () => {
      const title = await document.fonts.load('700 36px "Noto Serif KR"', 'ToolHub')
      const body = await document.fonts.load('400 16px "Nanum Gothic"', 'Public font verification.')
      if (!(title.length > 0 && body.length > 0 && [...title, ...body].every(font => font.status === 'loaded'))) return false
      return { title: title.map(font => ({ family: font.family, status: font.status })), body: body.map(font => ({ family: font.family, status: font.status })) }
    }, null, { timeout: 30000 })
    const loaded = await loadedHandle.jsonValue()
    assert.ok(loaded.title.length > 0 && loaded.title.every(font => font.status === 'loaded'))
    assert.ok(loaded.body.length > 0 && loaded.body.every(font => font.status === 'loaded'))
    assert.ok(allowed.filter(request => request.type === 'font' && request.status === 200).length >= 2)
    assert.ok(allowed.every(request => request.status === 200))
    writeFileSync(resolve(out, 'font-network.json'), JSON.stringify({ loaded, requests: allowed }, null, 2))
    await pairPanel(page).screenshot({ path: resolve(out, 'font-real-webfonts.png'), caret: 'initial' })
  }, { realFonts: true })

  await run('font-css-success-font-binary-failure-notice', async ({ page, open, allowed }) => {
    const query = new URLSearchParams({ pair: '1', pairTitleFont: 'noto-serif-kr', pairTitleText: 'ToolHub', pairBodyFont: 'nanum-gothic', pairBodyText: 'Public font verification.' })
    await open('font-preview', '?' + query)
    await waitPair(page)
    await page.waitForFunction(() => [...document.fonts].some(font => font.status === 'error'))
    assert.ok(allowed.some(request => request.type === 'stylesheet' && request.status === 200))
    assert.ok(allowed.some(request => request.type === 'font' && request.status === 'blocked-for-verification'))
    await pairPanel(page).getByRole('status').filter({ hasText: f('pairing.fontStatus.failed') }).waitFor()
  }, { realFonts: true, blockFontAssets: true })

  await run('font-api-unavailable-timeout-and-recovery', async ({ page, context, open }) => {
    // Only this failure-state test substitutes Font Loading API availability.
    // Real binaries and FontFace status are covered independently above.
    await context.addInitScript(() => { Object.defineProperty(document.fonts, 'load', { configurable: true, value: undefined }) })
    await open('font-preview', '?pair=1&pairTitleFont=noto-serif-kr&pairBodyFont=nanum-gothic')
    await waitPair(page)
    await pairPanel(page).getByRole('status').filter({ hasText: f('pairing.fontStatus.unverified') }).waitFor()
    await page.evaluate(() => { Object.defineProperty(document.fonts, 'load', { configurable: true, value: () => new Promise(() => {}) }) })
    await pairFont(page, 'title').selectOption('song-myung')
    await pairPanel(page).getByRole('status').filter({ hasText: f('pairing.fontStatus.timeout') }).waitFor({ timeout: 20000 })
    await page.evaluate(() => { Object.defineProperty(document.fonts, 'load', { configurable: true, value: async () => [{ status: 'loaded' }] }) })
    await pairFont(page, 'title').selectOption('nanum-gothic')
    await pairFont(page, 'title').selectOption('noto-serif-kr')
    await pairPanel(page).getByRole('status').waitFor({ state: 'hidden' })
    assert.equal(await pairFont(page, 'title').inputValue(), 'noto-serif-kr')
  }, { fontCssFixture: true })
} finally {
  await browser.close()
}
const latest = new Map()
const runs = readdirSync(out).filter(name => /^results.*\.json$/.test(name)).map(name => ({ name, ...JSON.parse(readFileSync(resolve(out, name), 'utf8')) })).sort((a, b) => a.checkedAt.localeCompare(b.checkedAt))
for (const run of runs) for (const result of run.results) latest.set(result.name, { ...result, sourceRun: run.name })
writeFileSync(resolve(out, 'final-results.json'), JSON.stringify({ base, checkedAt: new Date().toISOString(), total: latest.size, passed: [...latest.values()].filter(result => result.pass).length, results: [...latest.values()] }, null, 2))
if (results.some(result => !result.pass)) process.exitCode = 1
