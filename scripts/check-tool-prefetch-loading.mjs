// Compare actual JavaScript requests before/after disabling speculative tool prefetch in fresh browsers.
// node scripts/check-tool-prefetch-loading.mjs --dir out --record before.json
// node scripts/check-tool-prefetch-loading.mjs --dir out --compare before.json --result after.json
// node scripts/check-tool-prefetch-loading.mjs --url https://toolhub.ai.kr --compare before.json --result live.json
import assert from 'node:assert/strict'
import { readFileSync, writeFileSync, statSync, createReadStream } from 'node:fs'
import { resolve, sep, extname } from 'node:path'
import { createServer } from 'node:http'
import { gzipSync } from 'node:zlib'
import { chromium } from 'playwright'

const args = process.argv.slice(2), option = name => args[args.indexOf(name) + 1]
const directory = args.includes('--dir') ? resolve(option('--dir')) : null
const assetDirectory = directory || resolve('out')
const baseline = args.includes('--compare') ? JSON.parse(readFileSync(resolve(option('--compare')), 'utf8')) : null
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json' }
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
const browser = await chromium.launch({ headless: true }), results = [], snapshots = []
try {
  for (const mode of ['desktop-light', 'mobile-dark', 'no-observer']) {
    const mobile = mode === 'mobile-dark', fallback = mode === 'no-observer'
    const context = await browser.newContext({ serviceWorkers: 'block', timezoneId: 'Asia/Seoul',
      viewport: mobile ? { width: 390, height: 844 } : { width: 1280, height: 900 }, colorScheme: mobile ? 'dark' : 'light' })
    await context.addInitScript(disableObserver => {
      sessionStorage.setItem('toolhub_tracked_tools', JSON.stringify(['/fuel-calculator', '/loan-calculator']))
      if (disableObserver) window.IntersectionObserver = undefined
    }, fallback)
    await context.route('**/*', route => {
      const request = route.request(), url = new URL(request.url())
      if (url.origin !== origin || !['GET', 'HEAD'].includes(request.method())) return route.abort()
      if (url.pathname.startsWith('/api/')) return route.fulfill({ json: url.pathname === '/api/fuel-prices' ? { RESULT: { OIL: [
        { PRODCD: 'B027', PRICE: 1600, TRADE_DT: '20261003' }, { PRODCD: 'D047', PRICE: 1400, TRADE_DT: '20261003' },
      ] } } : {} })
      return route.continue()
    })
    const page = await context.newPage(), errors = [], requests = [], pending = [], prefetches = [], scriptRequests = [], unreadableBodies = []
    page.setDefaultTimeout(15000)
    page.on('pageerror', error => errors.push(error.message))
    page.on('request', request => {
      const url = new URL(request.url())
      if (request.headers()['next-router-prefetch'] === '1') prefetches.push(url.pathname)
      if (url.origin === origin && url.pathname.endsWith('.js')) scriptRequests.push(url.pathname)
    })
    page.on('response', response => {
      const url = new URL(response.url())
      if (url.origin !== origin || !url.pathname.endsWith('.js')) return
      // A later document navigation can discard a CDP response body. Initial
      // measurements require every body; later navigation uses request + DOM evidence.
      pending.push(response.body().then(bytes => requests.push({ route: url.pathname, decodedBytes: bytes.length, estimatedGzipBytes: gzipSync(bytes).length })).catch(() => unreadableBodies.push(url.pathname)))
    })
    await page.clock.setFixedTime(new Date('2026-10-03T03:00:00Z'))
    try {
      await page.goto(origin + '/fuel-calculator/', { waitUntil: 'networkidle' })
      await Promise.all(pending)
      assert.deepEqual(unreadableBodies, [], 'initial request sizes have complete response bodies')
      const initial = [...requests]
      const initialPrefetches = [...prefetches]
      const heading = page.getByRole('heading', { name: '비용 구성', exact: true })
      const top = await heading.evaluate(node => node.getBoundingClientRect().top + scrollY)
      const initialPlots = await page.locator('.recharts-surface').count()
      if (baseline && !fallback) {
        assert.equal(initialPlots, 2, 'charts still render initially')
        const before = baseline.snapshots.find(item => item.mode === mode).initial
        assert.ok(initial.reduce((sum, x) => sum + x.decodedBytes, 0) < before.reduce((sum, x) => sum + x.decodedBytes, 0) - 1000000, 'speculative JavaScript requests decrease by at least 1 MB')
      }
      await page.locator('#fuel-distance').fill('250')
      await heading.scrollIntoViewIfNeeded()
      await page.waitForFunction(() => document.querySelectorAll('.recharts-pie-label-text').length === 2)
      assert.equal(await page.locator('.recharts-surface').count(), 2, 'both charts render when needed')
      const afterTop = await heading.evaluate(node => node.getBoundingClientRect().top + scrollY)
      assert.ok(Math.abs(afterTop - top) <= 1, 'reserved layout stays stable')
      const labels = await page.locator('.recharts-pie-label-text').allTextContents()
      const plot = page.locator('.recharts-surface').first()
      await plot.scrollIntoViewIfNeeded()
      const bounds = await plot.boundingBox()
      // Hover inside the first donut sector, away from its empty center.
      await page.mouse.move(bounds.x + bounds.width / 2 + 60, bounds.y + bounds.height / 2 - 20)
      const tooltip = page.locator('.recharts-tooltip-wrapper').filter({ visible: true }).first()
      await tooltip.waitFor()
      const tooltipText = await tooltip.innerText()
      assert.ok(tooltipText.includes('27,586'), 'chart reflects updated 250 km calculation')
      if (baseline) {
        const before = baseline.snapshots.find(item => item.mode === mode)
        assert.deepEqual(labels, before.labels, 'pie percentages stay identical')
        assert.equal(tooltipText, before.tooltipText, 'tooltip amount stays identical')
        if (fallback) assert.equal(initialPlots, 2, 'unsupported observer loads charts eagerly')
      }
      await Promise.all(pending)
      const afterScroll = requests.slice(initial.length)
      const beforeNavigation = requests.length
      const beforeNavigationRequests = scriptRequests.length
      await page.getByRole('navigation', { name: 'Breadcrumb', exact: true }).locator('a[href="/calculators"],a[href="/calculators/"]').click()
      await page.waitForURL(/\/calculators\/?$/)
      await page.locator('main h1').waitFor()
      await page.waitForLoadState('networkidle')
      await Promise.all(pending)
      assert.ok(scriptRequests.slice(beforeNavigationRequests).some(route => statSync(resolve(assetDirectory, '.' + route)).size > 2000000), 'legacy tool code is requested when the category is actually selected')
      await page.locator('header a[href="/"]').first().click()
      await page.waitForURL(origin + '/')
      await page.locator('main a[href="/loan-calculator"],main a[href="/loan-calculator/"]').filter({ visible: true }).first().click()
      await page.waitForURL(/\/loan-calculator\/?$/)
      await page.locator('#lc-r').waitFor()
      if (mobile) await page.locator('header button[aria-label="메뉴"]').click()
      await page.locator('header nav button').filter({ visible: true }).first().click()
      await page.locator('header a[href="/fuel-calculator"],header a[href="/fuel-calculator/"]').filter({ visible: true }).first().click()
      await page.waitForURL(/\/fuel-calculator\/?$/)
      await page.locator('#fuel-distance').waitFor()
      await Promise.all(pending)
      assert.deepEqual(errors, [], 'no chart or hydration runtime errors')
      snapshots.push({ mode, top, initialPlots, prefetches: initialPrefetches, initial, afterScroll, onDemand: requests.slice(beforeNavigation), onDemandRequests: scriptRequests.slice(beforeNavigationRequests), unreadableBodiesAfterNavigation: unreadableBodies, labels, tooltipText })
      results.push({ mode, status: 'PASS', initialDecodedBytes: initial.reduce((sum, x) => sum + x.decodedBytes, 0), initialEstimatedGzipBytes: initial.reduce((sum, x) => sum + x.estimatedGzipBytes, 0) })
    } catch (error) { results.push({ mode, status: 'FAIL', error: error.message }) }
    finally { await context.close() }
    console.log(JSON.stringify(results.at(-1)))
  }
} finally { await browser.close(); if (server) await new Promise(done => server.close(done)) }
const report = { at: new Date().toISOString(), limitations: ['Local gzip is an estimate; no field Web Vitals are inferred.', 'Fonts, images, service worker requests and writes are excluded.'], results, snapshots }
if (args.includes('--record')) writeFileSync(resolve(option('--record')), JSON.stringify(report, null, 2))
if (args.includes('--result')) writeFileSync(resolve(option('--result')), JSON.stringify(report, null, 2))
process.exitCode = results.some(result => result.status === 'FAIL') ? 1 : 0
