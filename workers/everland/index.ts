import { collect, type Env } from '../../src/lib/everland/storage.ts'
import { dashboardResponse } from '../../src/lib/everland/response.ts'
const worker = {
  async scheduled(_event: unknown, env: Env) {
    if (!env.EVERLAND_DB) throw new Error('EVERLAND_DB binding required')
    await collect(env.EVERLAND_DB)
  },
  // Human-facing HTML only. Reads never call the upstream or trigger collection.
  async fetch(request: Request, env: Env) {
    const path = new URL(request.url).pathname
    if (path !== '/everland-board/' && path !== '/everland-board') return new Response('Not found', {status: 404})
    if (request.method !== 'GET' && request.method !== 'HEAD') return new Response('Method not allowed', {status: 405, headers: {Allow: 'GET, HEAD'}})
    return dashboardResponse(request, env)
  },
}

export default worker
