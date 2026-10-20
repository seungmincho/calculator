// node scripts/check-fuel-prices-api.mjs — uses fake credentials and upstream/cache fixtures.
import assert from 'node:assert/strict'
import { onRequestGet } from '../functions/api/fuel-prices.ts'

const previousFetch = globalThis.fetch
const previousCaches = globalThis.caches
const entries = new Map()
const upstream = []
let writeStatus = 500
const env = { OPINET_API_KEY: 'test-only-key', SUPABASE_URL: 'https://database.example', SUPABASE_SERVICE_KEY: 'test-only-service-key' }
globalThis.caches = { default: {
  async match(request) { return entries.get(request.url)?.clone() },
  async put(request, response) { entries.set(request.url, response) },
} }
const oil = (DATE, AREA_CD, PRODCD, PRICE) => ({ DATE, AREA_CD, AREA_NM: '지역', PRODCD, PRICE })
globalThis.fetch = async (input, options) => {
  const url = new URL(input)
  upstream.push({ url, options })
  if (url.pathname.includes('/rpc/')) return Response.json([{ sido_cd: '01', trade_date: '2026-05-31' }])
  if (url.pathname === '/rest/v1/fuel_prices') return new Response(null, { status: writeStatus })
  if (url.pathname === '/api/avgRecentPrice.do') return Response.json({ RESULT: { OIL: [
    { DATE: '20261019', PRODCD: 'B027', PRICE: '1856.40' }, { DATE: '20261019', PRODCD: 'D047', PRICE: 1842.7 }] } })
  if (url.pathname === '/api/areaAvgRecentPrice.do') {
    const area = url.searchParams.get('area')
    return Response.json({ RESULT: { OIL: area === '20' ? [oil('20261019', '20', 'B027', 1859.74)] // 경유 없음 → 버린다
      : [oil('20261019', area, 'B027', 1902.22), oil('20261019', area, 'D047', 1885.4), oil('20261019', area, 'C004', 1689.8), oil('bad', area, 'B027', 1)] } })
  }
  return Response.json({ RESULT: { OIL: [{ SIDOCD: '00', PRODCD: 'B027', PRICE: 1600 }, { SIDOCD: '01', PRODCD: 'B027', PRICE: 1600 },
    { SIDOCD: '20', PRODCD: 'B027', PRICE: 1600 }] } })
}
async function request(query = '', bindings = env) {
  const pending = []
  const start = upstream.length
  const response = await onRequestGet({ request: new Request(`https://toolhub.example/api/fuel-prices${query}`),
    env: bindings, waitUntil(promise) { pending.push(promise) } })
  await Promise.all(pending)
  const calls = upstream.slice(start)
  return { response, first: calls[0], writes: calls.filter(c => c.options?.method === 'POST' && c.url.pathname === '/rest/v1/fuel_prices') }
}
try {
  let { response, first, writes } = await request()
  assert.equal(response.status, 200)
  assert.equal(first.url.pathname, '/api/avgAllPrice.do')
  assert.equal(writes.length, 1, 'a successful live lookup backfills the last 7 days')
  assert.equal(writes[0].url.search, '?on_conflict=trade_date,sido_cd', 're-running a day must upsert, not hit the unique constraint')
  assert.deepEqual(JSON.parse(writes[0].options.body).map(r => [r.trade_date, r.sido_cd, r.gasoline, r.diesel]),
    [['2026-10-19', '00', 1856.4, 1842.7], ['2026-10-19', '01', 1902.22, 1885.4]], 'national row from avgRecentPrice; incomplete region and bad date dropped')

  ;({ response, first, writes } = await request('?sido=01'))
  assert.equal(response.headers.get('Cache-Control'), 'public, max-age=7200')
  assert.equal(first.url.pathname, '/api/avgSidoPrice.do')
  assert.equal(first.url.searchParams.get('sido'), '01')
  assert.equal(writes.length, 1, 'a failed write leaves no mark, so the next live lookup retries')
  writeStatus = 201

  ;({ response, first, writes } = await request('?sido=all'))
  assert.equal(response.status, 200)
  assert.equal(first.url.pathname, '/api/avgSidoPrice.do')
  assert.equal(first.url.searchParams.has('sido'), false)
  assert.equal(writes.length, 1)
  assert.equal((await request('?sido=02')).writes.length, 0, 'after a successful write, no backfill for 12 hours')

  const requests = upstream.length
  await request()
  await request('?sido=01')
  await request('?sido=all')
  assert.equal(upstream.length, requests, 'national, single region and all regions have independent cache entries')
  const historical = await request('?date=2026-10-03&sido=01')
  assert.equal((await historical.response.json()).data[0].trade_date, '2026-05-31')
  assert.deepEqual(JSON.parse(historical.first.options.body), { p_date: '2026-10-03', p_sido_cd: '01' })
  assert.equal((await request('', {})).response.status, 500)
  assert.equal((await request('?date=2026-10-03', {})).response.status, 500)
  console.log('check-fuel-prices-api OK: national, region, all regions, separate caches, 7-day backfill, historical and missing configuration')
} finally {
  globalThis.fetch = previousFetch
  if (previousCaches === undefined) delete globalThis.caches
  else globalThis.caches = previousCaches
}
