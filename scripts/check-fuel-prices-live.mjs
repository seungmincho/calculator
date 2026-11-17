// Read-only checks against the public proxy; no credentials are read or printed.
// node scripts/check-fuel-prices-live.mjs <artifact-directory>
import assert from 'node:assert/strict'
import { mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

const directory = resolve(process.argv[2] || 'tmp/fuel-verification')
mkdirSync(directory, { recursive: true })
const yesterday = new Date(Date.now() + 9 * 3600000 - 86400000).toISOString().slice(0, 10)
const cases = [
  ['national', ''],
  ['seoul', '?sido=01'],
  ['historical', `?date=${yesterday}&sido=01`],
]
const results = []
for (const [name, query] of cases) {
  const url = `https://toolhub.ai.kr/api/fuel-prices${query}`
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(25000) })
    assert.equal(response.status, 200, `${name} HTTP status`)
    const data = await response.json()
    let basis
    if (name === 'historical') {
      assert.equal(data.source, 'supabase')
      assert.ok(data.data?.length > 0, 'historical response contains a record')
      assert.ok(data.data[0].gasoline > 0 && data.data[0].diesel > 0)
      assert.ok(data.data[0].trade_date <= yesterday)
      basis = data.data[0].trade_date
    } else {
      const oil = data.RESULT?.OIL
      assert.ok(Array.isArray(oil) && oil.length > 0, 'live response contains prices')
      for (const product of ['B027', 'D047']) assert.ok(oil.some(o => o.PRODCD === product && Number(o.PRICE) > 0))
      basis = oil[0].TRADE_DT ?? oil[0].DATE ?? null
    }
    writeFileSync(resolve(directory, `live-${name}.json`), JSON.stringify(data, null, 2))
    results.push({ name, url, status: 'PASS', basis, cacheControl: response.headers.get('cache-control') })
  } catch (error) {
    results.push({ name, url, status: 'FAIL', error: error.message })
  }
  console.log(JSON.stringify(results.at(-1)))
}
writeFileSync(resolve(directory, 'live-api-results.json'), JSON.stringify({ checkedAt: new Date().toISOString(), results }, null, 2))
process.exitCode = results.some(r => r.status === 'FAIL') ? 1 : 0
