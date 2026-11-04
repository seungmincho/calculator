import { collect, type Env } from '../../src/lib/everland/storage.ts'
const worker = {
  async scheduled(_event: unknown, env: Env) {
    if (!env.EVERLAND_DB) throw new Error('EVERLAND_DB binding required')
    await collect(env.EVERLAND_DB)
  },
  // No public trigger or raw data endpoint.
  async fetch() { return new Response('Not found', { status: 404 }) },
}

export default worker
