// node scripts/check-fuel-prices-api.mjs — uses fake credentials and upstream/cache fixtures.
import assert from 'node:assert/strict'
import { onRequestGet } from '../functions/api/fuel-prices.ts'

const previousFetch = globalThis.fetch
const previousCaches = globalThis.caches
const entries = new Map()
const upstream = []
const env = { OPINET_API_KEY: 'test-only-key', SUPABASE_URL: 'https://database.example', SUPABASE_SERVICE_KEY: 'test-only-service-key' }
globalThis.caches = { default: {
  async match(request) { return entries.get(request.url)?.clone() },
  async put(request, response) { entries.set(request.url, response) },
} }
globalThis.fetch = async (input, options) => {
  const url = new URL(input)
  upstream.push({ url, options })
  return new Response(JSON.stringify(url.pathname.includes('/rpc/')
    ? [{ sido_cd: '01', trade_date: '2026-05-31' }]
    : { RESULT: { OIL: [{ SIDOCD: '01', PRODCD: 'B027', PRICE: 1600 }] } }), { status: 200 })
}
async function request(query = '', bindings = env) {
  const pending = []
  const response = await onRequestGet({ request: new Request(`https://toolhub.example/api/fuel-prices${query}`),
    env: bindings, waitUntil(promise) { pending.push(promise) } })
  await Promise.all(pending)
  return response
}
try {
  assert.equal((await request()).status, 200)
  assert.equal(upstream.at(-1).url.pathname, '/api/avgAllPrice.do')
  assert.equal((await request('?sido=01')).headers.get('Cache-Control'), 'public, max-age=7200')
  assert.equal(upstream.at(-1).url.pathname, '/api/avgSidoPrice.do')
  assert.equal(upstream.at(-1).url.searchParams.get('sido'), '01')
  assert.equal((await request('?sido=all')).status, 200)
  assert.equal(upstream.at(-1).url.pathname, '/api/avgSidoPrice.do')
  assert.equal(upstream.at(-1).url.searchParams.has('sido'), false)
  const requests = upstream.length
  await request()
  await request('?sido=01')
  await request('?sido=all')
  assert.equal(upstream.length, requests, 'national, single region and all regions have independent cache entries')
  const historical = await request('?date=2026-10-03&sido=01')
  assert.equal((await historical.json()).data[0].trade_date, '2026-05-31')
  assert.deepEqual(JSON.parse(upstream.at(-1).options.body), { p_date: '2026-10-03', p_sido_cd: '01' })
  assert.equal((await request('', {})).status, 500)
  assert.equal((await request('?date=2026-10-03', {})).status, 500)
  console.log('check-fuel-prices-api OK: national, region, all regions, separate caches, historical and missing configuration')
} finally {
  globalThis.fetch = previousFetch
  if (previousCaches === undefined) delete globalThis.caches
  else globalThis.caches = previousCaches
}
