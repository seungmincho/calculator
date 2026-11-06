// Cloudflare Pages Function — 스키장 12곳의 날짜별 슬로프 시간대 날씨 (MET Norway, CC BY 4.0)
// 엣지 캐시 3시간(일부 실패 시 10분). 점수는 브라우저에서 계산한다(공휴일·요일 규칙을 화면과 공유).
import { RESORTS } from '../../src/lib/ski/resorts.ts'
import { metToSkiDays, type SkiForecast } from '../../src/lib/ski/forecast.ts'

const KEY = new Request('https://cache.internal/ski-forecast-v1', { method: 'GET' })

export async function onRequestGet() {
  const hit = await caches.default.match(KEY)
  if (hit) return hit
  const now = Date.now()
  const settled = await Promise.allSettled(RESORTS.map(async r => {
    const res = await fetch(`https://api.met.no/weatherapi/locationforecast/2.0/compact?lat=${r.lat}&lon=${r.lon}`, {
      signal: AbortSignal.timeout(10000), headers: { 'User-Agent': 'ToolHub/1.0 (+https://toolhub.ai.kr/about/)', Accept: 'application/json' },
    })
    if (!res.ok) throw new Error(`MET HTTP ${res.status}`)
    const json = await res.json() as { properties?: { meta?: { updated_at?: string } } }
    return { id: r.id, days: metToSkiDays(json, now), issuedAt: String(json.properties?.meta?.updated_at ?? '') }
  }))
  const ok = settled.flatMap(s => s.status === 'fulfilled' && s.value.days.length ? [s.value] : [])
  if (!ok.length) return Response.json({ error: 'forecast unavailable' }, { status: 503, headers: { 'Cache-Control': 'no-store' } })
  const body: SkiForecast = { issuedAt: ok.map(o => o.issuedAt).sort()[0], fetchedAt: new Date(now).toISOString(), resorts: Object.fromEntries(ok.map(o => [o.id, o.days])) }
  const maxAge = ok.length === RESORTS.length ? 10800 : 600
  const headers = { 'Content-Type': 'application/json', 'Cache-Control': `public, max-age=${maxAge}` }
  await caches.default.put(KEY, new Response(JSON.stringify(body), { headers }))
  return new Response(JSON.stringify(body), { headers })
}
