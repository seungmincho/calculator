import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'

// Execute the actual service worker with synthetic caches only. No registration,
// browser profile, network, model files, production host or persistent storage is used.
const source = fs.readFileSync('public/sw.js', 'utf8')
const origin = 'https://synthetic.toolhub.test'
const flush = () => new Promise(resolve => setImmediate(resolve))
function basic(body, status = 200) {
  const response = new Response(body, { status, headers: { 'Content-Type': 'text/html', 'X-Test': 'network' } })
  Object.defineProperty(response, 'type', { value: 'basic' }); return response
}
function fixture() {
  const handlers = new Map(), data = new Map(), deleted = [], fetched = [], matched = [], puts = []
  let fetchPort = async () => { throw new Error('synthetic offline') }, matchFault = () => false, claimed = 0, skipped = 0
  const key = input => new URL(typeof input === 'string' ? input : input.url, origin).href
  const open = name => {
    if (!data.has(name)) data.set(name, new Map())
    const entries = data.get(name)
    return { async put(input, response) { entries.set(key(input), response.clone()); puts.push([name, key(input)]) }, async match(input) { return entries.get(key(input))?.clone() } }
  }
  const caches = {
    async keys() { return [...data.keys()] }, async open(name) { return open(name) },
    async delete(name) { deleted.push(name); return data.delete(name) },
    async match(input) { const target = key(input); matched.push(target); if (matchFault(target)) throw new Error('synthetic lookup rejected'); for (const entries of data.values()) if (entries.has(target)) return entries.get(target).clone() },
  }
  const context = vm.createContext({ URL, Request, Response, console, caches,
    fetch(input) { fetched.push(key(input)); return fetchPort(input) },
    self: { location: { origin }, addEventListener(name, callback) { handlers.set(name, callback) }, skipWaiting() { skipped++; return Promise.resolve() }, clients: { claim() { claimed++; return Promise.resolve() } } },
  })
  vm.runInContext(source, context, { filename: 'public/sw.js' })
  const names = vm.runInContext('[CACHE_NAME, STATIC_CACHE_NAME, DYNAMIC_CACHE_NAME]', context)
  return { data, deleted, fetched, matched, puts, names,
    async seed(name, input = '/marker', body = `synthetic:${name}`) { await open(name).put(input, new Response(body, { headers: { 'X-Test': name } })) },
    fetch(port) { fetchPort = port }, failMatch(predicate) { matchFault = predicate }, claimed: () => claimed, skipped: () => skipped,
    async event(name) { let pending; handlers.get(name)({ waitUntil(value) { pending = value } }); assert.ok(pending); await pending },
    request(path, { method = 'GET', destination = 'document', mode = destination === 'document' ? 'navigate' : 'cors', ...init } = {}) {
      const request = new Request(new URL(path, origin), { method, ...init })
      // Native navigation requests cannot be constructed with RequestInit.mode=navigate.
      // Give the real Request that read-only property to exercise the constructor boundary.
      Object.defineProperty(request, 'mode', { value: mode })
      Object.defineProperty(request, 'destination', { value: destination })
      let pending, intercepted = false
      handlers.get('fetch')({ request, respondWith(value) { intercepted = true; pending = value } })
      return { intercepted, response: Promise.resolve(pending), request }
    },
  }
}
let groups = 0, failures = 0
async function check(name, run) {
  if (process.argv[2] && !name.includes(process.argv[2])) return
  try { await run(); groups++; console.log('PASS', name) }
  catch (error) { failures++; console.error('FAIL', name, '\n' + error.message) }
}
async function generated(response) {
  assert.ok(response instanceof Response, 'navigation must resolve to a Response')
  assert.equal(response.status, 200); assert.match(response.headers.get('Content-Type'), /text\/html/)
  assert.match(await response.text(), /<!DOCTYPE html>[\s\S]*오프라인/)
}

await check('activate deletes only exact legacy Toolhub version cache names and preserves model/unknown bytes', async () => {
  const f = fixture(), old = ['toolhub-v1', 'toolhub-static-v2.3', 'toolhub-dynamic-v3.4.5', 'toolhub-v0001.02']
  const protectedNames = ['transformers-cache', 'webllm/model', 'webllm/config', 'webllm/wasm', 'another-cache', 'toolhub-model-v1', 'toolhub-v1-beta', 'toolhub-static-v1.', 'toolhub-v.1', 'toolhub-v1/extra', 'prefix-toolhub-v1', 'toolhub-static-vx', 'toolhub-dynamic-v1\n', 'toolhub', 'TOOLHUB-v1']
  for (const name of [...f.names, ...old, ...protectedNames]) await f.seed(name)
  const references = new Map(protectedNames.map(name => [name, f.data.get(name)]))
  await f.event('activate')
  assert.deepEqual([...f.deleted].sort(), [...old].sort())
  for (const name of [...f.names, ...protectedNames]) { assert.ok(f.data.has(name), name); assert.equal(await f.data.get(name).values().next().value.clone().text(), `synthetic:${name}`) }
  for (const [name, entries] of references) assert.equal(f.data.get(name), entries)
  assert.equal(f.claimed(), 1)
})

await check('offline document with no cached offline page returns generated HTML, never undefined', async () => {
  const f = fixture(), request = f.request('/first-visit?keep=yes')
  assert.ok(request.intercepted); await generated(await request.response)
  assert.equal(f.fetched[0], origin + '/first-visit/?keep=yes'); assert.equal(f.puts.length, 0)
})

await check('offline document uses existing offline Response unchanged', async () => {
  const f = fixture(); await f.seed(f.names[1], '/offline/', '<h1>cached offline marker</h1>')
  const response = await f.request('/uncached/').response
  assert.ok(response instanceof Response); assert.equal(response.headers.get('X-Test'), f.names[1]); assert.equal(await response.text(), '<h1>cached offline marker</h1>')
})

await check('offline lookup rejection and unavailable cache storage both return generated document HTML', async () => {
  for (const rejectAll of [false, true]) {
    const f = fixture(); f.failMatch(target => rejectAll || target === origin + '/offline/')
    await generated(await f.request('/uncached/').response)
  }
})

await check('normalized cache hit and dynamic background refresh retain the existing cache strategy', async () => {
  const f = fixture(); await f.seed(f.names[1], '/json-formatter/?q=1', 'cached tool')
  assert.equal(await (await f.request('/json-formatter?q=1').response).text(), 'cached tool'); assert.equal(f.fetched.length, 0)
  await f.seed(f.names[2], '/lotto-generator/', 'old dynamic'); f.fetch(async () => basic('fresh dynamic'))
  assert.equal(await (await f.request('/lotto-generator/').response).text(), 'old dynamic'); await flush()
  assert.equal(f.fetched.at(-1), origin + '/lotto-generator/'); assert.equal(await f.data.get(f.names[2]).get(origin + '/lotto-generator/').clone().text(), 'fresh dynamic')
})

await check('new successful requests cache normalized pages; non-200 responses do not become cached successes', async () => {
  const f = fixture(); f.fetch(async () => basic('network tool'))
  assert.equal(await (await f.request('/world-clock').response).text(), 'network tool'); await flush()
  assert.ok(f.puts.some(([name, key]) => name === f.names[1] && key === origin + '/world-clock/'))
  f.fetch(async () => basic('missing', 404)); const previous = f.puts.length
  assert.equal((await f.request('/missing').response).status, 404); await flush(); assert.equal(f.puts.length, previous)
})

await check('native navigation normalization preserves request options; unchanged URLs reuse the original request', async () => {
  const f = fixture(), seen = [], controller = new AbortController()
  f.fetch(async request => { seen.push(request); return basic('navigation') })
  const options = { headers: { 'X-Synthetic': 'kept' }, credentials: 'include', cache: 'reload', redirect: 'manual', referrer: origin + '/referrer/', referrerPolicy: 'same-origin', integrity: 'sha256-synthetic', signal: controller.signal, keepalive: true }
  const changed = f.request('/visited-page?keep=한글', options)
  await changed.response
  const normalized = seen[0]
  assert.equal(normalized.url, origin + '/visited-page/?keep=%ED%95%9C%EA%B8%80')
  assert.equal(normalized.mode, 'same-origin'); assert.equal(normalized.method, 'GET')
  assert.equal(normalized.headers.get('X-Synthetic'), 'kept')
  for (const key of ['credentials', 'cache', 'redirect', 'referrer', 'referrerPolicy', 'integrity', 'keepalive']) assert.equal(normalized[key], changed.request[key], key)
  assert.notEqual(normalized, changed.request); controller.abort(); assert.equal(normalized.signal.aborted, true)
  const unchanged = f.request('/already-normalized/?query=kept')
  await unchanged.response; assert.equal(seen.at(-1), unchanged.request); assert.equal(seen.at(-1).mode, 'navigate')
  const fetchRequest = f.request('/fetch-page?q=1', { destination: '', mode: 'cors' })
  await fetchRequest.response; assert.notEqual(seen.at(-1), fetchRequest.request); assert.equal(seen.at(-1).mode, 'cors')
})

await check('non-GET/external/API/park requests bypass the service worker unchanged', async () => {
  const f = fixture()
  for (const path of ['https://other.test/file', '/api/fuel', '/everland/', '/lotte-world/', '/gyeongju-world/']) assert.equal(f.request(path).intercepted, false, path)
  assert.equal(f.request('/form/', { method: 'POST' }).intercepted, false)
  assert.deepEqual(f.fetched, []); assert.deepEqual(f.matched, [])
})

await check('partial static installation still supports a first offline navigation without an offline cache entry', async () => {
  const f = fixture(); f.fetch(async input => { if (String(input) === '/offline/') throw new Error('synthetic partial install'); return basic('static file') })
  await f.event('install'); assert.equal(f.skipped(), 1); assert.ok(f.data.get(f.names[1]).has(origin + '/'))
  assert.equal(f.data.get(f.names[1]).has(origin + '/offline/'), false)
  f.fetch(async () => { throw new Error('synthetic offline') }); await generated(await f.request('/new-route/').response)
})

await check('non-document offline miss keeps the existing empty 408 response', async () => {
  const f = fixture(), response = await f.request('/asset.png', { destination: 'image' }).response
  assert.ok(response instanceof Response); assert.equal(response.status, 408); assert.equal(await response.text(), '')
  assert.ok(!f.matched.includes(origin + '/offline/'))
})
console.log(`Service-worker VM: ${groups} passed, ${failures} failed; synthetic cache storage only`)
if (failures) process.exitCode = 1
