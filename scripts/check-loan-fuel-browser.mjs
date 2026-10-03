// Usage: node scripts/check-loan-fuel-browser.mjs http://127.0.0.1:3040 <artifact-directory>
// Or: node scripts/check-loan-fuel-browser.mjs --dir out <artifact-directory>
// Uses fresh browser storage and mocked fuel APIs; external requests are blocked.
import assert from 'node:assert/strict'
import { readFileSync, mkdirSync, writeFileSync, statSync, createReadStream } from 'node:fs'
import { resolve, sep, extname } from 'node:path'
import { createServer } from 'node:http'
import { chromium } from 'playwright'

const localDirectory = process.argv[2] === '--dir' ? resolve(process.argv[3] || 'out') : null
let base = localDirectory ? '' : new URL(process.argv[2] || 'http://127.0.0.1:3040').origin
const artifacts = resolve(process.argv[localDirectory ? 4 : 3] || 'tmp/diagnostics')
const ko = JSON.parse(readFileSync(new URL('../messages/ko.json', import.meta.url), 'utf8'))
mkdirSync(artifacts, { recursive: true })
const results = []
let server
if (localDirectory) {
  const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml', '.woff2': 'font/woff2' }
  server = createServer((request, response) => {
    try {
      let file = resolve(localDirectory, '.' + decodeURIComponent(new URL(request.url, 'http://localhost').pathname))
      if (file !== localDirectory && !file.startsWith(localDirectory + sep)) { response.writeHead(403); response.end(); return }
      if (statSync(file).isDirectory()) file = resolve(file, 'index.html')
      response.setHeader('Content-Type', types[extname(file)] || 'application/octet-stream')
      createReadStream(file).pipe(response)
    } catch { response.writeHead(404); response.end() }
  })
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
  base = `http://127.0.0.1:${server.address().port}`
}
let browser
try {
  const response = await fetch(`${base}/loan-calculator/`)
  assert.equal(response.status, 200, 'static export must be available before running browser checks')
  browser = await chromium.launch({ headless: true })
} catch (error) {
  if (server) await new Promise(resolve => server.close(resolve))
  throw error
}

async function fixture(history, mobile = false) {
  const context = await browser.newContext({ serviceWorkers: 'block', timezoneId: 'Asia/Seoul',
    viewport: mobile ? { width: 390, height: 844 } : { width: 1280, height: 900 }, colorScheme: mobile ? 'dark' : 'light' })
  await context.addInitScript((saved) => {
    sessionStorage.setItem('toolhub_tracked_tools', JSON.stringify(['/loan-calculator', '/fuel-calculator']))
    if (saved) localStorage.setItem('calculation_history', JSON.stringify([{
      id: 'diagnostic', type: 'loan', title: 'Regression fixture', timestamp: 1, inputs: saved, result: {},
    }]))
  }, history)
  const page = await context.newPage()
  await page.clock.setFixedTime(new Date('2026-10-03T03:00:00Z'))
  const errors = []
  page.on('pageerror', error => errors.push(error.message))
  let fuelMode = 'exact'
  await context.route('**/*', async route => {
    const url = new URL(route.request().url())
    if (url.origin !== base) return route.abort()
    if (url.pathname !== '/api/fuel-prices') return route.continue()
    if (!url.searchParams.has('date')) return route.fulfill({ json: { RESULT: { OIL: [
      { PRODCD: 'B027', PRICE: 1600, TRADE_DT: '20261003' }, { PRODCD: 'D047', PRICE: 1400, TRADE_DT: '20261003' },
    ] } } })
    if (fuelMode === 'error') return route.fulfill({ status: 500, json: { error: 'Fixture API failure' } })
    return route.fulfill({ json: { source: 'supabase', data: fuelMode === 'empty' ? [] : [{
      gasoline: 1900, diesel: 1700, trade_date: fuelMode === 'old' ? '2026-05-31' : url.searchParams.get('date'),
    }] } })
  })
  return { context, page, errors, setFuelMode: mode => { fuelMode = mode } }
}

async function inputs(page, expected) {
  await page.waitForFunction(values => Object.entries(values).every(([key, value]) =>
    document.querySelector(`#lc-${key}`)?.value === String(value)), expected)
}

async function load(page) {
  await page.getByRole('button', { name: /^계산 이력/ }).click()
  await page.getByRole('button', { name: ko.common.load, exact: true }).click()
}

async function check(name, run, history, mobile = false) {
  const f = await fixture(history, mobile)
  try {
    await run(f)
    assert.deepEqual(f.errors, [], 'no page runtime errors')
    results.push({ name, status: 'PASS' })
  } catch (error) {
    results.push({ name, status: 'FAIL', error: error.message })
    await f.page.screenshot({ path: resolve(artifacts, `${name}-failed.png`), fullPage: true }).catch(() => {})
  } finally { await f.context.close() }
  console.log(JSON.stringify(results.at(-1)))
}

async function loanZero({ page }, screenshot) {
  await page.goto(`${base}/loan-calculator/`, { waitUntil: 'networkidle' })
  await page.locator('#lc-r').fill('0')
  await page.locator('#lc-inc').fill('7200')
  await page.locator('#lc-ex').fill('0')
  await page.getByRole('button', { name: ko.loan.history.save, exact: true }).click()
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('calculation_history'))[0].inputs)
  assert.equal(saved.interestRate, '0')
  assert.equal(saved.inc, 7200)
  assert.equal(saved.ex, 0)
  await page.locator('#lc-r').fill('4.5')
  await page.locator('#lc-inc').fill('6000')
  await page.locator('#lc-ex').fill('100')
  await load(page)
  await inputs(page, { r: 0, inc: 7200, ex: 0 })
  if (screenshot) await page.screenshot({ path: resolve(artifacts, screenshot), fullPage: true })
}

async function fuelDate(f) {
  await f.page.goto(`${base}/fuel-calculator/`, { waitUntil: 'networkidle' })
  await f.page.getByText('OPINET 전국 · 2026-10-03 기준', { exact: true }).first().waitFor()
  await f.page.getByRole('button', { name: /^출장일 \(유가 기준일\)/ }).click()
  await f.page.locator('[data-day="2026-10-02"]').click()
}

async function fuelOld(f, screenshot) {
  f.setFuelMode('old')
  await fuelDate(f)
  const notice = f.page.getByRole('status').filter({ hasText: '2026-05-31' })
  await notice.waitFor()
  assert.match(await notice.innerText(), /2026-10-02/)
  await f.page.getByText('OPINET 전국 · 2026-05-31 기준', { exact: true }).first().waitFor()
  if (screenshot) await f.page.screenshot({ path: resolve(artifacts, screenshot), fullPage: true })
}

try {
  await check('loan-zero-and-dsr', f => loanZero(f, 'loan-history-desktop.png'))
  await check('loan-reverse', async ({ page }) => {
    await page.goto(`${base}/loan-calculator/`, { waitUntil: 'networkidle' })
    await page.getByRole('tab', { name: ko.loan.mode.rev, exact: true }).click()
    for (const [key, value] of Object.entries({ r: 0, pay: 125, gr: 12, inc: 7200, ex: 100 })) await page.locator(`#lc-${key}`).fill(String(value))
    await page.getByRole('button', { name: ko.loan.history.save, exact: true }).click()
    await page.getByRole('tab', { name: ko.loan.mode.calc, exact: true }).click()
    await page.locator('#lc-r').fill('4.5')
    await load(page)
    await inputs(page, { r: 0, pay: 125, gr: 12, inc: 7200, ex: 100 })
    assert.equal(await page.getByRole('tab', { name: ko.loan.mode.rev, exact: true }).getAttribute('aria-selected'), 'true')
  })
  await check('loan-legacy', async ({ page }) => {
    await page.goto(`${base}/loan-calculator/`, { waitUntil: 'networkidle' })
    await page.locator('#lc-inc').fill('8500')
    await page.locator('#lc-ex').fill('20')
    await load(page)
    await inputs(page, { am: 10000, r: 0, t: 10, inc: 8500, ex: 20 })
  }, { loanAmount: '100,000,000', interestRate: '0', loanTerm: '10', selectedTypes: ['interest-only'] })
  await check('loan-malformed', async ({ page }) => {
    await page.goto(`${base}/loan-calculator/`, { waitUntil: 'networkidle' })
    await load(page)
    await inputs(page, { am: 30000, r: 4.5, t: 30, gr: 0, inc: 6000, ex: 0 })
  }, { loanAmount: 'Infinity', interestRate: 'bad', loanTerm: -1, grace: 'NaN', inc: null, ex: false, pay: {}, method: 'unknown' })
  await check('fuel-exact-date', async f => {
    await fuelDate(f)
    await f.page.getByText('OPINET 전국 · 2026-10-02 기준', { exact: true }).first().waitFor()
    assert.equal(await f.page.getByRole('status').filter({ hasText: /요청한 .*자료가 없어/ }).count(), 0)
  })
  await check('fuel-earlier-date', f => fuelOld(f, 'fuel-fallback-desktop.png'))
  for (const mode of ['empty', 'error']) await check(`fuel-${mode}`, async f => {
    f.setFuelMode(mode)
    await fuelDate(f)
    await f.page.getByText(ko.fuelCalculator.priceSource.noData, { exact: true }).waitFor()
    await f.page.getByText('OPINET 전국 · 2026-10-03 기준', { exact: true }).first().waitFor()
    assert.equal(await f.page.getByRole('status').filter({ hasText: '2026-05-31' }).count(), 0)
  })
  await check('fuel-manual-and-realtime', async f => {
    await fuelOld(f)
    const panel = f.page.locator('.ui-card').filter({ has: f.page.getByRole('heading', { name: ko.fuelCalculator.opinet.title, exact: true }) })
    await panel.getByRole('button', { name: ko.fuelCalculator.priceSource.edit, exact: true }).click()
    await panel.getByRole('spinbutton', { name: ko.fuelCalculator.fuelTypes.gasoline, exact: true }).fill('1800')
    await panel.getByRole('button', { name: ko.common.save, exact: true }).click()
    await f.page.getByText(ko.fuelCalculator.priceSource.manual, { exact: true }).first().waitFor()
    assert.equal(await f.page.getByRole('status').filter({ hasText: '2026-05-31' }).count(), 0)
    await f.page.getByRole('button', { name: ko.fuelCalculator.region.today, exact: true }).click()
    await f.page.getByText('OPINET 전국 · 2026-10-03 기준', { exact: true }).first().waitFor()
  })
  await check('loan-mobile-dark', f => loanZero(f, 'loan-history-mobile-dark.png'), undefined, true)
  await check('fuel-mobile-dark', f => fuelOld(f, 'fuel-fallback-mobile-dark.png'), undefined, true)
} finally {
  await browser.close()
  if (server) await new Promise(resolve => server.close(resolve))
  writeFileSync(resolve(artifacts, 'browser-results.json'), JSON.stringify(results, null, 2))
}
process.exitCode = results.some(result => result.status === 'FAIL') ? 1 : 0
