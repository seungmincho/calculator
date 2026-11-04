import { collect, type Env } from '../../src/lib/everland/storage.ts'
import { refreshForecast } from '../../src/lib/everland/weather.ts'
import { collectPark } from '../../src/lib/theme-parks/storage.ts'
const worker = {
  async scheduled(_event: unknown, env: Env) {
    if (!env.EVERLAND_DB) throw new Error('EVERLAND_DB binding required')
    const results = await Promise.allSettled([collect(env.EVERLAND_DB), refreshForecast(env.EVERLAND_DB),refreshForecast(env.EVERLAND_DB,fetch,Date.now(),'lotte-world'),refreshForecast(env.EVERLAND_DB,fetch,Date.now(),'gyeongju-world'),collectPark(env.EVERLAND_DB,'lotte-world')])
    const errors = results.filter(r => r.status === 'rejected')
    if (errors.length) throw new Error(errors.map(r => String((r as PromiseRejectedResult).reason)).join('; '))
  },
  // No public trigger or raw data endpoint.
  async fetch() { return new Response('Not found', { status: 404 }) },
}

export default worker
