import { chromium } from 'playwright'
import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { createHash } from 'node:crypto'
import { readFileSync, writeFileSync, mkdirSync, readdirSync } from 'node:fs'
import { resolve } from 'node:path'

// A dedicated ephemeral origin: never connect to the existing 3039 app or user profile.
const out = resolve('docs/verify/2026-11-17-repeat-batch35/browser')
const selected = process.argv[2]
const cases = [], results = []
const test = (name, action) => cases.push({ name, action })
const wait = ms => new Promise(resolve => setTimeout(resolve, ms))
async function poll(test, label, attempts = 100) { for (let i = 0; i < attempts; i++) { if (await test()) return; await wait(50) }; assert.fail('Timed out: ' + label) }
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex')
const source = readFileSync('public/sw.js', 'utf8')
const constants = Object.fromEntries([...source.matchAll(/const (CACHE_NAME|STATIC_CACHE_NAME|DYNAMIC_CACHE_NAME) = '([^']+)'/g)].map(match => [match[1], match[2]]))
assert.equal(Object.keys(constants).length, 3)
const html = (marker, count) => `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>SW synthetic fixture</title><body><h1>${marker}</h1><p>request ${count}</p></body></html>`
const requests = []
let origin
const server = createServer((request, response) => {
  const pathname = new URL(request.url, 'http://127.0.0.1').pathname
  const count = requests.filter(entry => entry.path === pathname).length + 1
  requests.push({ path: pathname, url: request.url, method: request.method, count, at: Date.now(), syntheticHeader: request.headers['x-sw-probe'], syntheticCookiePresent: request.headers.cookie?.includes('syntheticSwSession=sw35') ?? false })
  response.setHeader('Cache-Control', 'no-store')
  if (pathname === '/sw.js') { response.setHeader('Content-Type', 'application/javascript'); response.setHeader('Service-Worker-Allowed', '/'); response.end(source); return }
  if (pathname.startsWith('/api/')) { response.setHeader('Content-Type', 'application/json'); response.end(JSON.stringify({ synthetic: true, method: request.method, count })); return }
  if (pathname === '/manifest.json') { response.setHeader('Content-Type', 'application/json'); response.end(JSON.stringify({ name: 'Synthetic verification', start_url: '/', display: 'standalone' })); return }
  if (/\.(png|ico)$/.test(pathname)) { response.setHeader('Content-Type', 'image/png'); response.end(Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jY9kAAAAASUVORK5CYII=', 'base64')); return }
  if (pathname.endsWith('.txt')) { response.setHeader('Content-Type', 'text/plain;charset=utf-8'); response.end(`SYNTHETIC_ASSET ${pathname} ${count}`); return }
  response.setHeader('Content-Type', 'text/html;charset=utf-8')
  response.end(html(pathname === '/offline/' ? 'SYNTHETIC_CACHED_OFFLINE' : `SYNTHETIC_PAGE ${pathname}`, count))
})

async function register(page, context) {
  await page.evaluate(async () => { const registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' }); await navigator.serviceWorker.ready; if (registration.active?.state !== 'activated') await new Promise(resolve => registration.active.addEventListener('statechange', () => { if (registration.active?.state === 'activated') resolve() })); if (!navigator.serviceWorker.controller) await new Promise(resolve => navigator.serviceWorker.addEventListener('controllerchange', resolve, { once: true })) })
  await poll(() => Promise.resolve(context.serviceWorkers().length === 1), 'actual service worker exists')
  const worker = context.serviceWorkers()[0]
  assert.equal(worker.url(), origin + '/sw.js')
  await worker.evaluate(() => { self.__verificationUnhandled = []; self.__verificationErrors = []; self.__verificationFetch = []; self.addEventListener('unhandledrejection', event => self.__verificationUnhandled.push(String(event.reason))); self.addEventListener('error', event => self.__verificationErrors.push({ message: event.message, filename: event.filename, line: event.lineno })); self.addEventListener('fetch', event => self.__verificationFetch.push({ url: event.request.url, mode: event.request.mode, destination: event.request.destination })) })
  return worker
}

test('sw-activate-preserves-model-unknown-current-and-removes-only-old-owned', async ({ page, context }) => {
  const old = ['toolhub-v1', 'toolhub-static-v1.2', 'toolhub-dynamic-v4.35.15', 'toolhub-v4.35.15', 'toolhub-static-v4.35.15', 'toolhub-dynamic-v0']
  const unknown = ['transformers-cache', 'webllm/model', 'webllm/config', 'webllm/wasm', 'unrelated-cache', 'other-toolhub-v1', 'toolhub-vnext', 'toolhub-v4..1', 'toolhub-static-v4.35.16-backup', 'Toolhub-v1', 'toolhub-v1-extra']
  const current = Object.values(constants), names = [...old, ...unknown, ...current]
  const before = await page.evaluate(async names => {
    const snapshots = []
    for (const [index, name] of names.entries()) { const bytes = Uint8Array.from([index, 0, 255, 17, 85, 170]), key = '/synthetic-cache-sentinel/' + encodeURIComponent(name); const cache = await caches.open(name); await cache.put(key, new Response(bytes, { headers: { 'Content-Type': 'application/octet-stream' } })); snapshots.push({ name, key, bytes: [...bytes] }) }
    return snapshots
  }, names)
  await register(page, context)
  const afterNames = await page.evaluate(() => caches.keys()); assert.deepEqual(afterNames.sort(), [...unknown, ...current].sort())
  const retained = await page.evaluate(async snapshots => { const values = []; for (const item of snapshots) { const cache = await caches.open(item.name), response = await cache.match(item.key); values.push({ name: item.name, bytes: response ? [...new Uint8Array(await response.arrayBuffer())] : null }) }; return values }, before.filter(item => !old.includes(item.name)))
  for (const item of retained) assert.deepEqual(item.bytes, before.find(previous => previous.name === item.name).bytes)
  return { actualActivateEvent: true, oldOwnedDeleted: old, preservedNames: retained.map(item => item.name), allRetainedPayloadBytesExact: true, syntheticBytesOnly: true, currentVersion: constants.CACHE_NAME }
})

test('sw-offline-cached-document-and-cached-fallback-return-real-response', async ({ page, context }) => {
  await register(page, context)
  const online = await page.goto(origin + '/visited-page?probe=35', { waitUntil: 'domcontentloaded' }); assert.equal(online.status(), 200)
  await poll(() => page.evaluate(async () => !!(await caches.match('/visited-page/?probe=35'))), 'normalized visited page cached')
  const normalizedNetwork = requests.findLast(item => item.url === '/visited-page/?probe=35'); assert.equal(normalizedNetwork.syntheticHeader, 'sw35-navigation'); assert.equal(normalizedNetwork.syntheticCookiePresent, true)
  await context.setOffline(true)
  const cached = await page.goto(origin + '/visited-page?probe=35', { waitUntil: 'domcontentloaded' }); assert.equal(cached.status(), 200); assert.equal(cached.fromServiceWorker(), true); assert.equal(await page.locator('h1').innerText(), 'SYNTHETIC_PAGE /visited-page/')
  const fallback = await page.goto(origin + '/never-visited-cached-fallback/', { waitUntil: 'domcontentloaded' }); assert.equal(fallback.status(), 200); assert.equal(fallback.fromServiceWorker(), true); assert.equal(await page.locator('h1').innerText(), 'SYNTHETIC_CACHED_OFFLINE')
  return { actualOfflineNetwork: true, cachedPageStatus: cached.status(), normalizedTrailingSlashAndQuery: true, syntheticHeaderAndCookiePreserved: true, cachedOfflineResponseStatus: fallback.status(), bothFromServiceWorker: true }
})

test('sw-offline-missing-fallback-generates-valid-html-response', async ({ page, context }) => {
  await register(page, context)
  await page.evaluate(async () => { for (const name of await caches.keys()) { const cache = await caches.open(name); await cache.delete('/offline/') } })
  assert.equal(await page.evaluate(async () => !!(await caches.match('/offline/'))), false)
  await context.setOffline(true)
  const response = await page.goto(origin + '/never-visited-no-fallback/', { waitUntil: 'domcontentloaded' }); assert.equal(response.status(), 200); assert.equal(response.fromServiceWorker(), true); assert.match(response.headers()['content-type'], /text\/html/); assert.equal(await page.title(), '오프라인 - 툴허브'); assert.match(await page.locator('h1').innerText(), /오프라인 모드/)
  const bytes = await response.body(); writeFileSync(resolve(out, 'actual-generated-offline.html'), bytes); await page.screenshot({ path: resolve(out, 'actual-generated-offline.png') })
  const asset = await page.evaluate(async () => { const response = await fetch('/not-cached-asset.txt'); return { status: response.status, text: await response.text() } }); assert.deepEqual(asset, { status: 408, text: '' })
  return { nativeMissingOfflineCache: true, responseStatus: response.status(), generatedHtmlBytes: bytes.length, generatedHtmlSha256: sha256(bytes), nonDocumentOfflineStatus: asset.status, noUndefinedResponse: true }
})

test('sw-offline-lookup-rejection-still-generates-valid-html-response', async ({ page, context }) => {
  const worker = await register(page, context)
  await worker.evaluate(() => { const nativeMatch = caches.match.bind(caches); self.__offlineLookupRejected = 0; caches.match = (request, options) => { if (request === '/offline/') { self.__offlineLookupRejected++; return Promise.reject(new Error('Synthetic offline lookup failure')) }; return nativeMatch(request, options) } })
  await context.setOffline(true)
  const response = await page.goto(origin + '/never-visited-lookup-error/', { waitUntil: 'domcontentloaded' }); assert.equal(response.status(), 200); assert.equal(response.fromServiceWorker(), true); assert.equal(await page.title(), '오프라인 - 툴허브'); assert.equal(await worker.evaluate(() => self.__offlineLookupRejected), 1)
  await worker.evaluate(() => { self.__allLookupRejected = []; caches.match = request => { self.__allLookupRejected.push(typeof request === 'string' ? request : request.url); return Promise.reject(new Error('Synthetic initial and fallback lookup failure')) } })
  const bothFailed = await page.goto(origin + '/never-visited-all-lookups-fail/', { waitUntil: 'domcontentloaded' }); assert.equal(bothFailed.status(), 200); assert.equal(await page.title(), '오프라인 - 툴허브'); const lookups = await worker.evaluate(() => self.__allLookupRejected); assert.ok(lookups.includes('/offline/') && lookups.some(url => url.endsWith('/never-visited-all-lookups-fail/')))
  await context.setOffline(false)
  const networkRecovery = await page.goto(origin + '/online-with-cache-lookup-failure/', { waitUntil: 'domcontentloaded' }); assert.equal(networkRecovery.status(), 200); assert.equal(await page.locator('h1').innerText(), 'SYNTHETIC_PAGE /online-with-cache-lookup-failure/')
  return { actualServiceWorkerPortInjectedLookupFailure: true, offlineOnlyThenInitialAndFallbackLookupRejections: true, responseStatus: response.status(), initialLookupFailureStillUsesNetworkWhenOnline: true, noUnhandledLookupRejection: true }
})

test('sw-normal-static-dynamic-api-post-and-themepark-bypass-regressions', async ({ page, context }) => {
  await register(page, context)
  const static1 = await page.evaluate(async () => { const response = await fetch('/cacheable-asset.txt'); return { status: response.status, text: await response.text() } })
  await poll(() => page.evaluate(async () => !!(await caches.match('/cacheable-asset.txt'))), 'normal asset cached')
  const static2 = await page.evaluate(async () => (await fetch('/cacheable-asset.txt')).text()); assert.equal(static2, static1.text)
  const api = await page.evaluate(async () => { const values = []; for (let i = 0; i < 2; i++) values.push(await (await fetch('/api/live')).json()); const post = await (await fetch('/api/live', { method: 'POST', body: 'synthetic-only' })).json(); return { values, post, cached: !!(await caches.match('/api/live')) } }); assert.ok(api.values[1].count > api.values[0].count); assert.equal(api.post.method, 'POST'); assert.equal(api.cached, false)
  const bypassPaths = ['/everland/check', '/lotte-world/check', '/gyeongju-world/check']
  for (const pathname of bypassPaths) { const values = await page.evaluate(async pathname => [await (await fetch(pathname)).text(), await (await fetch(pathname)).text(), !!(await caches.match(pathname))], pathname); assert.notEqual(values[0], values[1]); assert.equal(values[2], false) }
  await page.evaluate(async name => { const cache = await caches.open(name); await cache.put('/tips/', new Response('OLD_SYNTHETIC_DYNAMIC', { headers: { 'Content-Type': 'text/plain' } })) }, constants.DYNAMIC_CACHE_NAME)
  const stale = await page.evaluate(async () => (await fetch('/tips/')).text()); assert.equal(stale, 'OLD_SYNTHETIC_DYNAMIC')
  await poll(() => page.evaluate(async () => (await (await caches.match('/tips/')).text()).includes('SYNTHETIC_PAGE /tips/')), 'dynamic background refresh uses normalized cache key')
  return { normalAssetNetworkRequests: requests.filter(item => item.path === '/cacheable-asset.txt').length, staticCachedBytesRetained: true, apiGetNetworkEachTime: true, apiPostBypassed: true, excludedThemeparkPaths: bypassPaths, dynamicImmediateStaleThenBackgroundRefresh: true }
})

async function run(browser, { name, action }) {
  const context = await browser.newContext({ serviceWorkers: 'allow', viewport: { width: 900, height: 750 } }), errors = [], consoles = [], blocked = []
  await context.setExtraHTTPHeaders({ 'x-sw-probe': 'sw35-navigation' }); await context.addCookies([{ name: 'syntheticSwSession', value: 'sw35', url: origin }])
  await context.route('**/*', route => { const url = new URL(route.request().url()); if (url.origin === origin) return route.continue(); blocked.push(url.href); return route.abort('blockedbyclient') })
  const page = await context.newPage(); page.setDefaultTimeout(12000); page.setDefaultNavigationTimeout(20000); page.on('pageerror', error => errors.push(error.message)); page.on('console', event => { if (event.type() === 'error') consoles.push(event.text()) })
  const watchdog = setTimeout(() => { void context.close().catch(() => {}) }, 45000)
  let detail = {}, status = 'pass', error, workerDiagnostics = []
  try { await page.goto(origin + '/probe/', { waitUntil: 'domcontentloaded' }); detail = await action({ page, context }); assert.deepEqual(errors, []); assert.deepEqual(blocked, []); for (const worker of context.serviceWorkers()) { assert.deepEqual(await worker.evaluate(() => self.__verificationUnhandled ?? []), []); assert.deepEqual(await worker.evaluate(() => self.__verificationErrors ?? []), []) } }
  catch (cause) { status = 'fail'; error = cause.stack ?? String(cause); await page.screenshot({ path: resolve(out, name + '-failure.png') }).catch(() => {}) }
  finally { clearTimeout(watchdog); workerDiagnostics = await Promise.all(context.serviceWorkers().map(worker => worker.evaluate(() => ({ errors: self.__verificationErrors, unhandled: self.__verificationUnhandled, fetches: self.__verificationFetch })).catch(error => ({ unavailable: String(error) })))); await context.close() }
  const evidence = { name, status, checkedAt: new Date().toISOString(), actualSwSha256: sha256(source), ...detail, error, errors, consoleErrors: consoles, blockedExternalRequests: blocked, workerDiagnostics }; results.push(evidence); writeFileSync(resolve(out, name + '-evidence.json'), JSON.stringify(evidence, null, 2)); console.log(status.toUpperCase(), name, error ?? '')
}

if (selected === '--list') console.log(cases.map(item => item.name).join('\n'))
else {
  mkdirSync(out, { recursive: true })
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve)); origin = `http://127.0.0.1:${server.address().port}`
  assert.ok(!origin.endsWith(':3039'))
  let browser
  try { browser = await chromium.launch({ channel: 'chrome' }); for (const item of cases.filter(item => !selected || selected.split(',').some(part => item.name.includes(part)))) await run(browser, item) }
  finally { await browser?.close(); await new Promise(resolve => server.close(resolve)); const merged = readdirSync(out).filter(name => name.endsWith('-evidence.json')).map(name => JSON.parse(readFileSync(resolve(out, name), 'utf8'))); const report = { checkedAt: new Date().toISOString(), passed: merged.filter(item => item.status === 'pass').length, failed: merged.filter(item => item.status === 'fail').length, actualSwSha256: sha256(source), currentCaches: constants, ephemeralOrigin: origin, serverClosed: true, browserClosed: true, existing3039Accessed: false, requestPaths: requests, results: merged }; writeFileSync(resolve(out, 'final-results.json'), JSON.stringify(report, null, 2)); console.log(JSON.stringify({ passed: report.passed, failed: report.failed, browserClosed: true, serverClosed: true })) }
  if (results.some(item => item.status === 'fail')) process.exitCode = 1
}
