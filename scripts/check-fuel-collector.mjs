// node scripts/check-fuel-collector.mjs — no network, only fake credentials and responses.
import assert from 'node:assert/strict'
import { buildRows, collectFuelPrices, CollectionError } from '../workers/fuel-collector/index.mjs'

const oil = (region, product, price) => ({ SIDOCD: region, SIDONM: 'Test region', PRODCD: product, PRICE: price })
const oils = [oil('00', 'B027', 1700), oil('01', 'B027', '1900.123'), oil('01', 'D047', 1700),
  oil('20', 'B027', 1600), oil('20', 'D047', 1400), oil('20', 'K015', 900)]
const now = new Date('2026-10-03T15:30:00Z')
const cached = '2026-10-03T14:45:00Z' // KST: previous calendar day, despite execution after midnight.
const env = { SUPABASE_URL: 'https://database.example', SUPABASE_SERVICE_KEY: 'test-only-service-key' }
const rows = buildRows(oils, '2026-10-03')
assert.deepEqual(rows.map(row => row.sido_cd), ['01', '20'], 'accept current region codes; exclude the national aggregate')
assert.equal(rows[0].gasoline, 1900.12)
assert.equal(rows[0].premium_gasoline, null)
for (const invalid of [[], [null], [oil('01', 'B027', true)], [oil('01', 'B027', -1)], [oil('01', 'B027', 'bad')], [oil('01', 'B027', 1600)]]) {
  assert.throws(() => buildRows(invalid, '2026-10-03'), CollectionError)
}
const calls = []
const fetcher = async (address, options) => {
  calls.push({ address, options })
  if (options.method === 'POST') return Response.json(JSON.parse(options.body))
  return Response.json({ RESULT: { OIL: oils } }, { headers: { 'X-Cached-At': cached } })
}
const result = await collectFuelPrices(env, fetcher, now)
assert.equal(result.date, '2026-10-03', 'record the data fetch date in KST, not the execution date or a requested past date')
assert.equal(result.regions, 2)
assert.equal(result.verifiedRegions, 2)
assert.equal(calls[1].options.headers.Prefer, 'resolution=merge-duplicates,return=representation')
assert.equal(calls[1].options.headers.Authorization, 'Bearer test-only-service-key')
assert.deepEqual(JSON.parse(calls[1].options.body), rows)
const before = calls.length
await assert.rejects(collectFuelPrices({}, fetcher, now), error => error.stage === 'configuration')
assert.equal(calls.length, before, 'missing settings must stop before any network call')
let writes = 0
for (const response of [new Response('', { status: 502 }), Response.json({ RESULT: { OIL: [] } }, { headers: { 'X-Cached-At': cached } }),
  Response.json({ RESULT: { OIL: oils } }, { headers: { 'X-Cached-At': '2026-09-30T00:00:00Z' } })]) {
  await assert.rejects(collectFuelPrices(env, async (_url, options) => { if (options.method === 'POST') writes++; return response }, now), CollectionError)
}
assert.equal(writes, 0, 'failed or stale upstream responses cannot write data')
await assert.rejects(collectFuelPrices(env, async (_url, options) => options.method === 'POST'
  ? new Response('', { status: 403 }) : Response.json({ RESULT: { OIL: oils } }, { headers: { 'X-Cached-At': cached } }), now),
  error => error.stage === 'database')
await assert.rejects(collectFuelPrices(env, async (_url, options) => options.method === 'POST'
  ? Response.json([]) : Response.json({ RESULT: { OIL: oils } }, { headers: { 'X-Cached-At': cached } }), now),
  error => error.reason === 'verification')
await assert.rejects(collectFuelPrices(env, async (_url, options) => options.method === 'POST'
  ? Response.json(JSON.parse(options.body).map(row => ({ ...row, premium_gasoline: 0 })))
  : Response.json({ RESULT: { OIL: oils } }, { headers: { 'X-Cached-At': cached } }), now),
  error => error.reason === 'verification', 'a stored zero must not silently replace missing/null price data')
console.log('check-fuel-collector OK: dynamic regions, prices, cache date, upsert verification and fail-before-write guards')
