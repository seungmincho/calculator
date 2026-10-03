// --dir out --record baseline.json, or --compare baseline.json; --url supports a deployed export.
// Isolated browser storage, fixed date and read-only/mocked network keep comparisons repeatable.
import assert from 'node:assert/strict'
import { readFileSync, writeFileSync, statSync, createReadStream } from 'node:fs'
import { resolve, sep, extname } from 'node:path'
import { createServer } from 'node:http'
import { chromium } from 'playwright'

const args = process.argv.slice(2)
const option = name => args[args.indexOf(name) + 1]
const directory = args.includes('--dir') ? resolve(option('--dir')) : null
let origin = directory ? '' : new URL(option('--url')).origin
const baseline = args.includes('--compare') ? JSON.parse(readFileSync(resolve(option('--compare')), 'utf8').replace(/^\uFEFF/, '')) : null
const routes = ['/', '/loan-calculator/', '/salary-calculator/', '/fuel-calculator/', '/json-formatter/', '/bmi-calculator/']
let server
if (directory) {
  const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json' }
  server = createServer((request, response) => {
    try {
      let file = resolve(directory, '.' + decodeURIComponent(new URL(request.url, 'http://localhost').pathname))
      if (file !== directory && !file.startsWith(directory + sep)) { response.writeHead(403); response.end(); return }
      if (statSync(file).isDirectory()) file = resolve(file, 'index.html')
      response.setHeader('Content-Type', types[extname(file)] || 'application/octet-stream')
      createReadStream(file).pipe(response)
    } catch { response.writeHead(404); response.end() }
  })
  await new Promise(done => server.listen(0, '127.0.0.1', done))
  origin = `http://127.0.0.1:${server.address().port}`
}
const browser = await chromium.launch({ headless: true })
const results = [], snapshots = []
try {
  for (const mobile of [false, true]) for (const route of routes) {
    const context = await browser.newContext({ serviceWorkers: 'block', timezoneId: 'Asia/Seoul',
      viewport: mobile ? { width: 390, height: 844 } : { width: 1280, height: 900 }, colorScheme: mobile ? 'dark' : 'light' })
    await context.addInitScript(() => sessionStorage.setItem('toolhub_tracked_tools', JSON.stringify(['/loan-calculator', '/fuel-calculator', '/salary-calculator', '/json-formatter', '/bmi-calculator'])))
    await context.route('**/*', handler => {
      const request = handler.request(), url = new URL(request.url())
      if (url.origin !== origin || !['GET', 'HEAD'].includes(request.method())) return handler.abort()
      if (url.pathname.startsWith('/api/')) return handler.fulfill({ json: url.pathname === '/api/fuel-prices' ? { RESULT: { OIL: [
        { PRODCD: 'B027', PRICE: 1600, TRADE_DT: '20261003' }, { PRODCD: 'D047', PRICE: 1400, TRADE_DT: '20261003' },
      ] } } : {} })
      return handler.continue()
    })
    const page = await context.newPage(), errors = []
    page.on('pageerror', error => errors.push(error.message))
    await page.clock.setFixedTime(new Date('2026-10-03T03:00:00Z'))
    const name = `${mobile ? 'mobile-dark' : 'desktop-light'}:${route}`
    try {
      const html = await (await context.request.get(origin + route)).text()
      assert.ok(html.includes('<main'), 'main content must be present in static HTML')
      await page.goto(origin + route, { waitUntil: 'networkidle' })
      const main = page.locator('main').first()
      await main.waitFor()
      const snapshot = { name, headings: await main.locator('h1,h2,h3').allTextContents(), text: await main.innerText() }
      snapshots.push(snapshot)
      if (baseline) {
        const expected = baseline.snapshots.find(item => item.name === name)
        assert.ok(expected, 'baseline route exists')
        assert.deepEqual(snapshot.headings, expected.headings, 'translated headings stay identical')
        assert.equal(snapshot.text, expected.text, 'visible tool text stays identical')
      }
      const toggle = page.getByRole('button', { name: /^(KO|한국어)$/ }).filter({ visible: true }).first()
      await toggle.click()
      await page.getByRole('button', { name: 'English', exact: true }).click()
      assert.equal(await page.evaluate(() => localStorage.getItem('language')), 'en')
      // The existing application intentionally keeps Korean messages in both language modes.
      assert.deepEqual(await main.locator('h1,h2,h3').allTextContents(), snapshot.headings)
      await page.getByRole('button', { name: /^(EN|English)$/ }).filter({ visible: true }).first().click()
      await page.getByRole('button', { name: '한국어', exact: true }).click()
      assert.equal(await page.evaluate(() => localStorage.getItem('language')), 'ko')
      await page.keyboard.press('Control+k')
      const search = page.locator('input[type="text"]').filter({ visible: true }).first()
      await search.fill('대출')
      const loan = page.locator('a[href="/loan-calculator"]').filter({ visible: true }).first()
      await loan.click()
      await page.waitForURL('**/loan-calculator**')
      await page.locator('#lc-r').waitFor()
      assert.deepEqual(errors, [], 'no hydration or runtime errors')
      results.push({ name, status: 'PASS' })
    } catch (error) { results.push({ name, status: 'FAIL', error: error.message }) }
    finally { await context.close() }
    console.log(JSON.stringify(results.at(-1)))
  }
} finally {
  await browser.close()
  if (server) await new Promise(done => server.close(done))
}
const report = { at: new Date().toISOString(), results, snapshots }
if (args.includes('--record')) writeFileSync(resolve(option('--record')), JSON.stringify(report, null, 2))
if (args.includes('--result')) writeFileSync(resolve(option('--result')), JSON.stringify(report, null, 2))
process.exitCode = results.some(item => item.status === 'FAIL') ? 1 : 0
