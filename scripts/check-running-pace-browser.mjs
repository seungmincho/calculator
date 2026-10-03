// node scripts/check-running-pace-browser.mjs --dir out --result report.json
// node scripts/check-running-pace-browser.mjs --url https://toolhub.ai.kr --result report.json
import assert from 'node:assert/strict'
import { createReadStream, mkdirSync, statSync, writeFileSync } from 'node:fs'
import { createServer } from 'node:http'
import { extname, resolve, sep } from 'node:path'
import { chromium } from 'playwright'

const args = process.argv.slice(2), option = key => args[args.indexOf(key) + 1]
const directory = args.includes('--dir') ? resolve(option('--dir')) : null
const report = resolve(option('--result'))
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.xml': 'application/xml' }
let server
if (directory) server = createServer((request, response) => {
  try {
    let file = resolve(directory, '.' + decodeURIComponent(new URL(request.url, 'http://localhost').pathname))
    if (file !== directory && !file.startsWith(directory + sep)) { response.writeHead(403); response.end(); return }
    if (statSync(file).isDirectory()) file = resolve(file, 'index.html')
    response.setHeader('Content-Type', types[extname(file)] || 'application/octet-stream')
    createReadStream(file).pipe(response)
  } catch { response.writeHead(404); response.end() }
})
if (server) await new Promise(done => server.listen(0, '127.0.0.1', done))
const origin = server ? `http://127.0.0.1:${server.address().port}` : new URL(option('--url')).origin
const results = [], errors = []
const browser = await chromium.launch({ headless: true })
try {
  for (const mode of ['mobile-dark', 'desktop-light']) {
    const mobile = mode === 'mobile-dark'
    const context = await browser.newContext({ serviceWorkers: 'block', viewport: mobile ? { width: 390, height: 844 } : { width: 1280, height: 900 }, colorScheme: mobile ? 'dark' : 'light', permissions: ['clipboard-read', 'clipboard-write'] })
    await context.route('**/*', route => {
      const request = route.request(), url = new URL(request.url())
      return url.origin === origin && ['GET', 'HEAD'].includes(request.method()) ? route.continue() : route.abort()
    })
    const page = await context.newPage()
    page.on('pageerror', error => errors.push({ mode, error: error.message }))
    page.setDefaultTimeout(15000)
    await page.goto(origin + '/running-pace/', { waitUntil: 'networkidle' })
    assert.match(await page.title(), /러닝.*페이스/)
    assert.equal(await page.locator('dd').nth(0).innerText(), '0:50:00')
    assert.match(await page.locator('dd').nth(1).innerText(), /5:00/)
    assert.match(await page.locator('dd').nth(2).innerText(), /12\.00/)
    assert.match(await page.getByRole('row', { name: /5 km/ }).innerText(), /0:25:00/)
    results.push({ name: `${mode}:default-10km-50min`, status: 'PASS' })

    await page.getByRole('button', { name: '하프', exact: true }).click()
    await page.locator('#running-hours').fill('2')
    await page.locator('#running-minutes').fill('0')
    assert.equal(await page.locator('dd').nth(0).innerText(), '2:00:00')
    assert.match(await page.locator('dd').nth(1).innerText(), /5:41/)
    await page.getByRole('button', { name: '1 km', exact: true }).click()
    assert.match(await page.getByRole('row', { name: /21 km/ }).innerText(), /1:59:27/)
    assert.match(await page.getByRole('row', { name: /21\.0975 km/ }).innerText(), /2:00:00/)
    assert.equal(await page.getByRole('row', { name: /21\.0975 km/ }).count(), 1)
    results.push({ name: `${mode}:half-and-exact-splits`, status: 'PASS' })

    await page.getByRole('button', { name: '풀', exact: true }).click()
    await page.getByRole('button', { name: '5 km', exact: true }).last().click()
    await page.getByRole('button', { name: '페이스 → 시간' }).click()
    await page.locator('#running-pace-minutes').fill('5')
    await page.locator('#running-pace-seconds').fill('40')
    assert.equal(await page.locator('dd').nth(0).innerText(), '3:59:06')
    await page.getByRole('button', { name: '결과 복사' }).click()
    assert.match(await page.evaluate(() => navigator.clipboard.readText()), /42\.195 km[\s\S]*3:59:06/)
    await page.evaluate(() => { window.__printCalled = false; window.print = () => { window.__printCalled = true } })
    await page.getByRole('button', { name: '인쇄' }).click()
    assert.equal(await page.evaluate(() => window.__printCalled), true)
    await page.emulateMedia({ media: 'print' })
    assert.equal(await page.locator('#running-input-title').evaluate(element => getComputedStyle(element.closest('section')).display), 'none')
    assert.notEqual(await page.locator('#running-result-title').evaluate(element => getComputedStyle(element.closest('section')).display), 'none')
    await page.emulateMedia({ media: 'screen' })
    results.push({ name: `${mode}:pace-copy-print`, status: 'PASS' })

    await page.getByRole('button', { name: '직접 입력', exact: true }).click()
    await page.locator('#running-distance').fill('12.5')
    assert.equal(await page.locator('dd').nth(0).innerText(), '1:10:50')
    await page.locator('#running-distance').fill('0')
    assert.equal(await page.getByRole('alert').filter({ hasText: /거리는 0보다/ }).count(), 1)
    assert.equal(await page.locator('dd').count(), 0)
    await page.locator('#running-distance').fill('12.5')
    await page.locator('#running-pace-seconds').fill('60')
    assert.equal(await page.getByRole('alert').filter({ hasText: /페이스는 0보다/ }).count(), 1)
    assert.equal(await page.locator('dd').count(), 0)
    results.push({ name: `${mode}:custom-and-invalid`, status: 'PASS' })

    await page.locator('#running-pace-seconds').fill('40')
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), true)
    await page.evaluate(() => localStorage.setItem('language', 'en'))
    await page.reload({ waitUntil: 'networkidle' })
    assert.match(await page.locator('h1').first().innerText(), /Running.*Pace Calculator/)
    assert.equal(await page.getByRole('link', { name: 'Estimate calories burned while running →' }).count(), 1)
    results.push({ name: `${mode}:responsive-english-related-link`, status: 'PASS' })
    await context.close()
  }
  const [hub, sitemap] = await Promise.all([fetch(origin + '/health/'), fetch(origin + '/sitemap.xml')])
  assert.equal(hub.status, 200)
  assert.match(await hub.text(), /href="\/running-pace\/?"/)
  assert.equal(sitemap.status, 200)
  assert.match(await sitemap.text(), /https:\/\/toolhub\.ai\.kr\/running-pace\//)
  results.push({ name: 'health-catalog-and-sitemap', status: 'PASS' })
  assert.equal(errors.length, 0)
} catch (error) {
  results.push({ name: 'browser-flow', status: 'FAIL', message: error.message.slice(0, 400) })
} finally {
  await browser.close()
  if (server) await new Promise(done => server.close(done))
  mkdirSync(resolve(report, '..'), { recursive: true })
  writeFileSync(report, JSON.stringify({ at: new Date().toISOString(), origin, results, runtimeErrors: errors }, null, 2))
}
for (const result of results) console.log(JSON.stringify(result))
process.exitCode = results.some(result => result.status === 'FAIL') ? 1 : 0
