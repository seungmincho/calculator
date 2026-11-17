// Isolated localhost regression checks. Never loads production pages or user storage.
// node scripts/check-fuel-experience-browser.mjs http://127.0.0.1:3039 <artifact-directory> [chrome|msedge]
import assert from 'node:assert/strict'
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { chromium } from 'playwright'

const base = new URL(process.argv[2] || 'http://127.0.0.1:3039').origin
assert.ok(['localhost', '127.0.0.1'].includes(new URL(base).hostname), 'only test local pages')
const artifacts = resolve(process.argv[3] || 'tmp/fuel-verification')
mkdirSync(artifacts, { recursive: true })
const ko = JSON.parse(readFileSync(new URL('../messages/ko.json', import.meta.url), 'utf8'))
const en = JSON.parse(readFileSync(new URL('../messages/en.json', import.meta.url), 'utf8'))
const t = ko.fuelCalculator
const results = []
const today = '2026-11-16'
const digits = today.replaceAll('-', '')
const response = await fetch(`${base}/fuel-calculator/`, { signal: AbortSignal.timeout(60000) })
assert.equal(response.status, 200)
const browser = await chromium.launch({ headless: true, ...(process.argv[4] ? { channel: process.argv[4] } : {}) })

function prices(amount = 1600) {
  return { RESULT: { OIL: [
    { PRODCD: 'B027', PRICE: amount, TRADE_DT: digits },
    { PRODCD: 'B034', PRICE: 1800, TRADE_DT: digits },
    { PRODCD: 'D047', PRICE: 1400, TRADE_DT: digits },
    { PRODCD: 'K015', PRICE: 900, TRADE_DT: digits },
  ] } }
}
async function fixture(options = {}) {
  const context = await browser.newContext({ serviceWorkers: 'block', acceptDownloads: true,
    timezoneId: 'Asia/Seoul', viewport: { width: options.width || 1365, height: options.width ? 844 : 1000 },
    colorScheme: options.dark ? 'dark' : 'light' })
  await context.addInitScript(({ dark, saved }) => {
    localStorage.setItem('theme', dark ? 'dark' : 'light')
    sessionStorage.setItem('toolhub_tracked_tools', JSON.stringify(['/fuel-calculator']))
    for (const [key, value] of Object.entries(saved || {})) localStorage.setItem(key, JSON.stringify(value))
  }, { dark: options.dark, saved: options.saved })
  const page = await context.newPage()
  await page.clock.setFixedTime(new Date(`${today}T03:00:00Z`))
  page.setDefaultTimeout(12000)
  page.setDefaultNavigationTimeout(60000)
  const errors = []
  page.on('pageerror', error => errors.push(error.message))
  page.on('console', message => {
    if (message.type() === 'error' && /hydration|didn't match|Minified React error/.test(message.text())) errors.push(message.text())
  })
  await context.route('**/*', async route => {
    const url = new URL(route.request().url())
    if (url.origin !== base) return route.abort()
    if (url.pathname.replace(/\/$/, '') !== '/api/fuel-prices') return route.continue()
    if (options.api) return options.api(route, url)
    return route.fulfill({ json: prices() })
  })
  return { context, page, errors }
}
async function check(name, run, options) {
  const f = await fixture(options)
  try {
    await run(f)
    assert.deepEqual(f.errors, [], 'no runtime or hydration errors')
    results.push({ name, status: 'PASS' })
  } catch (error) {
    results.push({ name, status: 'FAIL', error: error.message })
    await f.page.screenshot({ path: resolve(artifacts, `${name}-failed.png`) }).catch(() => {})
  } finally { await f.context.close() }
  console.log(JSON.stringify(results.at(-1)))
}
async function headline(page, amount) {
  await page.getByTestId('fuel-headline').filter({ hasText: amount }).waitFor()
}
async function open(page, query = '') {
  await page.goto(`${base}/fuel-calculator/${query}`, { waitUntil: 'domcontentloaded' })
  await headline(page, '11,034')
  await page.locator('#fuel-calculator-result').getByText(/OPINET/).waitFor()
  for (const selector of ['#fuel-vehicle', '#fuel-type', '#fuel-sido', '#fuel-efficiency', '#fuel-depr']) {
    assert.equal(await page.locator(selector).isVisible(), true, `${selector} is available without expanding settings`)
  }
  assert.equal(await page.getByRole('button', { name: /^출장일 \(유가 기준일\)/ }).isVisible(), true)
  assert.equal(await page.locator('label[for="fuel-efficiency"]').innerText(), t.input.efficiency)
  assert.equal(await page.getByText(t.input.defaultEfficiencyHint, { exact: true }).isVisible(), true)
  assert.equal(await page.getByTestId('fuel-basic-options').locator('#fuel-depr').count(), 1)
}
async function details(page, name) {
  const summary = page.locator('summary').filter({ hasText: name }).first()
  if (!(await summary.evaluate(el => el.parentElement.open))) await summary.click()
}
async function splitTrip(page) {
  await page.getByRole('button', { name: t.experience.split, exact: true }).click()
  await page.getByRole('button', { name: t.trip.roundTrip, exact: true }).click()
  await details(page, t.experience.extraSettings)
  await page.locator('#fuel-toll').fill('6000')
  await page.locator('#fuel-parking').fill('3000')
  await page.locator('#fuel-trip-memo').fill('검증, "왕복" 이동')
  await headline(page, '7,767')
}
// Parse quoted fields (including commas/newlines) independently of the exporter.
function csvRows(text) {
  const rows = [], row = []
  let field = '', quoted = false
  const csv = text.replace(/^\uFEFF/, '')
  for (let i = 0; i < csv.length; i++) {
    const char = csv[i]
    if (char === '"') {
      if (quoted && csv[i + 1] === '"') { field += '"'; i++ } else quoted = !quoted
    } else if (char === ',' && !quoted) { row.push(field); field = '' }
    else if (char === '\n' && !quoted) { row.push(field); rows.push([...row]); row.length = 0; field = '' }
    else field += char
  }
  row.push(field); rows.push(row)
  return rows
}
try {
  await check('visible-adjustment-calculation-and-persistence', async ({ page }) => {
    await open(page)
    const adjustment = page.getByRole('slider', { name: t.depreciation.multiplier, exact: true })
    await adjustment.fill('1.2')
    await headline(page, '13,241')
    assert.equal(new URL(page.url()).searchParams.get('dm'), '1.2')
    assert.equal(await page.evaluate(() => localStorage.getItem('fuel_depreciation_multiplier')), '1.2')
    await details(page, t.experience.extraSettings)
    await page.locator('#fuel-toll').fill('3000')
    await headline(page, '16,241')
    const shared = page.url()
    await page.goto(shared)
    await headline(page, '16,241')
    assert.equal(await adjustment.inputValue(), '1.2')
    await page.goto(`${base}/fuel-calculator/`)
    await headline(page, '13,241')
    await page.getByRole('button', { name: t.depreciation.reset, exact: true }).click()
    await headline(page, '11,034')
    assert.equal(await adjustment.inputValue(), '1')
    await page.locator('#fuel-efficiency').scrollIntoViewIfNeeded()
    await page.screenshot({ path: resolve(artifacts, 'fuel-visible-adjustment.png') })
  })
  await check('korean-english-labels', async ({ page }) => {
    await open(page)
    await page.getByRole('button', { name: /^(KO|한국어)$/ }).filter({ visible: true }).first().click()
    await page.getByRole('button', { name: 'English', exact: true }).click()
    await page.getByText(en.fuelCalculator.input.efficiency, { exact: true }).waitFor()
    await page.getByText(en.fuelCalculator.input.defaultEfficiencyHint, { exact: true }).waitFor()
    assert.equal(await page.getByRole('slider', { name: en.fuelCalculator.depreciation.multiplier, exact: true }).isVisible(), true)
    await page.locator('#fuel-efficiency').fill('10')
    await page.getByText(en.fuelCalculator.input.customEfficiencyHint, { exact: true }).waitFor()
    await page.getByRole('button', { name: en.fuelCalculator.input.resetEfficiency, exact: true }).click()
    assert.doesNotMatch(await page.locator('main').innerText(), /input\.(?:efficiency|defaultEfficiencyHint|customEfficiencyHint|resetEfficiency)|priceSource\.estimate/)
    await page.locator('#fuel-efficiency').scrollIntoViewIfNeeded()
    await page.screenshot({ path: resolve(artifacts, 'fuel-english-inputs.png') })
    await page.getByRole('button', { name: /^(EN|English)$/ }).filter({ visible: true }).first().click()
    await page.getByRole('button', { name: '한국어', exact: true }).click()
    await page.getByText(t.input.efficiency, { exact: true }).waitFor()
    await page.getByText(t.input.defaultEfficiencyHint, { exact: true }).waitFor()
    await headline(page, '11,034')
  })
  await check('direct-efficiency-and-reset', async ({ page }) => {
    await open(page)
    await page.locator('#fuel-efficiency').fill('10')
    await headline(page, '16,000')
    assert.equal(new URL(page.url()).searchParams.get('eff'), '10')
    await page.locator('#fuel-vehicle').selectOption('suv')
    await headline(page, '16,000')
    await page.getByRole('button', { name: t.input.resetEfficiency, exact: true }).click()
    await headline(page, '16,842')
    assert.equal(await page.locator('#fuel-efficiency').inputValue(), '9.5')
    await page.locator('#fuel-efficiency').fill('0')
    await page.getByText(t.experience.invalidInput, { exact: true }).waitFor()
    assert.equal(await page.getByRole('button', { name: t.vehicleSettings.save, exact: true }).isDisabled(), true)
    await page.getByRole('button', { name: t.input.resetEfficiency, exact: true }).click()
    await headline(page, '16,842')
  })
  await check('split-save-csv-share', async ({ page, context }) => {
    await open(page)
    await splitTrip(page)
    await page.locator('#fuel-vehicle').selectOption('midsize')
    await page.getByRole('button', { name: t.vehicleSettings.save, exact: true }).click()
    await headline(page, '8,916')
    await page.getByRole('button', { name: t.trip.addToLog, exact: true }).click()
    await page.getByRole('button', { name: t.experience.saveCalculation, exact: true }).click()
    const saved = await page.evaluate(() => ({
      logs: JSON.parse(localStorage.getItem('fuel_driving_log')),
      history: JSON.parse(localStorage.getItem('calculation_history')),
    }))
    assert.equal(saved.logs[0].settlement, 26667)
    assert.equal(saved.logs[0].snapshot.fuelPrices.gasoline, 1600)
    assert.equal(saved.history[0].result.tripTotal, 35667)
    assert.match(saved.history[0].title, /35천원/)
    await page.locator('#fuel-vehicle').selectOption('suv')
    await page.getByRole('button', { name: /^주행일지 1$/ }).click()
    const table = page.locator('table')
    assert.match(await table.innerText(), /35,667원/)
    const downloadPromise = page.waitForEvent('download', { timeout: 20000 })
    await page.getByRole('button', { name: t.drivingLog.export.csv, exact: true }).click()
    const download = await downloadPromise
    assert.equal(await download.failure(), null)
    const file = resolve(artifacts, 'fuel-driving-log.csv')
    await download.saveAs(file)
    const bytes = readFileSync(file)
    assert.deepEqual([...bytes.subarray(0, 3)], [239, 187, 191], 'UTF-8 BOM for Korean Excel')
    const rows = csvRows(bytes.toString('utf8'))
    assert.ok(rows.every(row => row.length === 11), 'CSV columns remain aligned')
    assert.deepEqual(rows[1].slice(1, 8), ['100', 'Y', '200', '6000', '3000', '26667', '35667'])
    assert.equal(rows[1][8], '검증, "왕복" 이동')
    assert.match(rows[1][9], /중형차.*12\.0.*1,600/)
    assert.match(rows[1][10], /8,916.*8,919/)
    assert.equal(rows[2][7], '35667')
    await page.getByRole('button', { name: t.experience.restoreLog, exact: true }).click()
    await headline(page, '8,916')
    await context.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: base })
    await page.getByRole('button', { name: '링크 복사', exact: true }).click()
    const link = await page.evaluate(() => navigator.clipboard.readText())
    const query = new URL(link).searchParams
    assert.equal(query.get('price'), '1600-1800-1400-900')
    assert.equal(query.get('toll'), '6000')
    assert.equal(query.has('tripMemo'), false)
    await page.goto(link)
    await headline(page, '8,916')
    await page.evaluate(() => window.scrollTo(0, 0))
    await page.screenshot({ path: resolve(artifacts, 'fuel-desktop.png') })
    await page.goto(`${base}/fuel-calculator/`)
    await headline(page, '13,333')
    assert.equal(await page.locator('#fuel-vehicle').inputValue(), 'midsize')
  })

  await check('historical-prices-and-fallback', async ({ page }) => {
    await open(page)
    await page.locator('#fuel-sido').selectOption('01')
    await headline(page, '11,724')
    await page.getByRole('button', { name: /^출장일 \(유가 기준일\)/ }).click()
    await page.locator(`[data-day="${today.slice(0, 8)}01"]`).click()
    await headline(page, '13,103')
    await page.getByRole('status').filter({ hasText: '2026-10-31' }).waitFor()
    await page.getByRole('button', { name: t.priceSource.edit, exact: true }).click()
    await page.getByRole('spinbutton', { name: t.fuelTypes.gasoline, exact: true }).fill('1800')
    await page.getByRole('button', { name: ko.common.save, exact: true }).click()
    await headline(page, '12,414')
    await page.getByRole('button', { name: t.region.today, exact: true }).click()
    await headline(page, '11,724')
  }, { api: async (route, url) => route.fulfill({ json: url.searchParams.has('date')
    ? { source: 'supabase', data: [{ trade_date: '2026-10-31', sido_cd: '01', gasoline: 1900, diesel: 1700, premium_gasoline: 2000, lpg: 1100 }] }
    : prices(url.searchParams.get('sido') ? 1700 : 1600) }) })

  for (const width of [320, 390]) await check(`mobile-${width}`, async ({ page }) => {
    await open(page)
    await splitTrip(page)
    await page.evaluate(() => window.scrollTo(0, 0))
    const bounds = await page.evaluate(() => ({
      width: innerWidth, page: document.documentElement.scrollWidth,
      result: document.querySelector('[data-testid="fuel-headline"]').getBoundingClientRect().bottom,
      height: innerHeight,
    }))
    assert.ok(bounds.page <= bounds.width, 'no horizontal overflow')
    assert.ok(bounds.result <= bounds.height, 'first-screen result is visible')
    await page.screenshot({ path: resolve(artifacts, `fuel-mobile-${width}.png`) })
  }, { width, dark: width === 390 })

  if (existsSync(resolve(artifacts, 'live-national.json'))) await check('live-response-rendering', async ({ page }) => {
    await page.goto(`${base}/fuel-calculator/`)
    const data = JSON.parse(readFileSync(resolve(artifacts, 'live-national.json'), 'utf8'))
    const price = Math.round(Number(data.RESULT.OIL.find(o => o.PRODCD === 'B027').PRICE))
    await headline(page, Math.round(100 / 14.5 * price).toLocaleString('ko-KR'))
    await page.locator('#fuel-calculator-result').getByText(/OPINET/).waitFor()
    await page.screenshot({ path: resolve(artifacts, 'fuel-live-price.png') })
  }, { api: route => route.fulfill({ json: JSON.parse(readFileSync(resolve(artifacts, 'live-national.json'), 'utf8')) }) })
} finally {
  await browser.close()
  writeFileSync(resolve(artifacts, 'browser-results.json'), JSON.stringify(results, null, 2))
}
process.exitCode = results.some(r => r.status === 'FAIL') ? 1 : 0
