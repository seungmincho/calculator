// Daily current-price snapshots. Secrets are supplied by the Worker runtime only.
const products = { B027: 'gasoline', B034: 'premium_gasoline', D047: 'diesel', K015: 'lpg' }
const fields = Object.values(products)

export class CollectionError extends Error {
  constructor(stage, reason) {
    super(`Fuel collection failed: ${stage}/${reason}`)
    this.stage = stage
    this.reason = reason
  }
}

const fail = (stage, reason) => { throw new CollectionError(stage, reason) }
const koreanDate = date => new Date(date.getTime() + 9 * 3600000).toISOString().slice(0, 10)

export function buildRows(oils, date) {
  if (!Array.isArray(oils) || !oils.length) fail('prices', 'empty')
  const regions = new Map()
  for (const oil of oils) {
    if (!oil || typeof oil !== 'object') fail('prices', 'invalid-record')
    const code = String(oil.SIDOCD ?? '')
    if (code === '00' || !products[oil.PRODCD]) continue
    if (!/^\d{2}$/.test(code) || typeof oil.SIDONM !== 'string' || !oil.SIDONM.trim()) fail('prices', 'invalid-region')
    if (typeof oil.PRICE !== 'number' && typeof oil.PRICE !== 'string') fail('prices', 'invalid-price')
    const price = Number(oil.PRICE)
    if (!Number.isFinite(price) || price <= 0) fail('prices', 'invalid-price')
    const row = regions.get(code) || { trade_date: date, sido_cd: code, sido_nm: oil.SIDONM,
      gasoline: null, premium_gasoline: null, diesel: null, lpg: null }
    row[products[oil.PRODCD]] = Math.round(price * 100) / 100
    regions.set(code, row)
  }
  const rows = [...regions.values()].sort((a, b) => a.sido_cd.localeCompare(b.sido_cd))
  if (!rows.length || rows.some(row => !row.gasoline || !row.diesel)) fail('prices', 'incomplete')
  return rows
}

export async function collectFuelPrices(env, fetcher = fetch, now = new Date()) {
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_KEY) fail('configuration', 'missing')
  const url = env.FUEL_PRICES_URL || 'https://toolhub.ai.kr/api/fuel-prices?sido=all'
  const request = async (stage, address, options) => {
    let response
    try { response = await fetcher(address, { ...options, signal: AbortSignal.timeout(20000) }) }
    catch { fail(stage, 'network') }
    if (!response.ok) fail(stage, `http-${response.status}`)
    return response
  }
  const json = async (stage, response) => {
    try { return await response.json() } catch { fail(stage, 'invalid-json') }
  }
  const response = await request('opinet-proxy', url)
  // avgSidoPrice has no trade date. Use the proxy's fetch time, including cache age.
  const cachedAt = response.headers.get('X-Cached-At')
  const timestamp = new Date(cachedAt || '')
  const age = now.getTime() - timestamp.getTime()
  if (!Number.isFinite(age) || age < -300000 || age > 3 * 3600000) fail('prices', 'stale-timestamp')
  const date = koreanDate(timestamp)
  const rows = buildRows((await json('prices', response))?.RESULT?.OIL, date)
  let database
  try {
    database = new URL(env.SUPABASE_URL)
    if (database.protocol !== 'https:') fail('configuration', 'invalid-database')
  } catch { fail('configuration', 'invalid-database') }
  const endpoint = `${database.origin}/rest/v1/fuel_prices`
  const stored = await json('database', await request('database', endpoint, {
    method: 'POST', headers: { 'Content-Type': 'application/json', apikey: env.SUPABASE_SERVICE_KEY,
      Authorization: `Bearer ${env.SUPABASE_SERVICE_KEY}`, Prefer: 'resolution=merge-duplicates,return=representation' },
    body: JSON.stringify(rows),
  }))
  if (!Array.isArray(stored) || stored.length !== rows.length || rows.some(row => {
    const result = stored.find(item => item.sido_cd === row.sido_cd && item.trade_date === date)
    return !result || fields.some(field => row[field] === null
      ? result[field] !== null : result[field] == null || Number(result[field]) !== row[field])
  })) fail('database', 'verification')
  return { ok: true, date, regions: rows.length, verifiedRegions: stored.length, sourceCachedAt: timestamp.toISOString() }
}

export default {
  async scheduled(_controller, env) {
    try {
      const result = await collectFuelPrices(env)
      console.log(JSON.stringify({ event: 'fuel-collection', ...result }))
    } catch (error) {
      // Never log request URLs, env values, upstream bodies or arbitrary exception messages.
      const stage = error instanceof CollectionError ? error.stage : 'unknown'
      const reason = error instanceof CollectionError ? error.reason : 'unexpected'
      console.error(JSON.stringify({ event: 'fuel-collection', ok: false, stage, reason }))
      throw new CollectionError(stage, reason)
    }
  },
}
