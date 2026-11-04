import { readDashboard, type Env } from '../../src/lib/everland/storage.ts'
import { renderDashboard } from '../../src/lib/everland/render.ts'
interface Context { request: Request; env: Env }
// A human-facing HTML view used only within ToolHub. No JSON API, export or cross-site embedding.
export async function onRequestGet({ request, env }: Context) {
  const locale = new URL(request.url).searchParams.get('lang') === 'en' ? 'en' : 'ko'
  let result: Awaited<ReturnType<typeof readDashboard>> = { snapshot:null, history:[] }
  let failed = !env.EVERLAND_DB
  if (env.EVERLAND_DB) {
    try { result = await readDashboard(env.EVERLAND_DB) } catch { failed = true }
  }
  return new Response(renderDashboard(result.snapshot, result.history, locale, failed), {
    status: failed ? 503 : 200,
    headers: {
      'Content-Type':'text/html; charset=utf-8',
      'Cache-Control':'no-store',
      'X-Robots-Tag':'noindex',
      'X-Frame-Options':'SAMEORIGIN',
      'X-Content-Type-Options':'nosniff',
      'Referrer-Policy':'strict-origin-when-cross-origin',
      'Content-Security-Policy':"default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; frame-ancestors 'self'; base-uri 'none'; form-action 'none'",
    },
  })
}
