import { readDashboard, type Env } from './storage.ts'
import { renderDashboard } from './render.ts'

export async function dashboardResponse(request: Request, env: Env) {
  const locale = new URL(request.url).searchParams.get('lang') === 'en' ? 'en' : 'ko'
  let result: Awaited<ReturnType<typeof readDashboard>> = { snapshot:null, history:[] }
  let failed = !env.EVERLAND_DB
  if (env.EVERLAND_DB) {
    try { result = await readDashboard(env.EVERLAND_DB) } catch { failed = true }
  }
  const headers = new Headers({
    'Content-Type':'text/html; charset=utf-8',
    'Cache-Control':'no-store',
    'X-Robots-Tag':'noindex',
    'X-Frame-Options':'DENY',
    'X-Content-Type-Options':'nosniff',
    'Referrer-Policy':'strict-origin-when-cross-origin',
    'Content-Security-Policy':`default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'`,
  })
  return new Response(request.method === 'HEAD' ? null : renderDashboard(result.snapshot, result.history, locale, failed), {
    status: failed ? 503 : 200, headers,
  })
}
