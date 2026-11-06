// Cloudflare Pages Function — 16개 도시 체감온도 예보 (MET Norway, CC BY 4.0)
// 엣지 캐시 3시간(일부 실패 시 10분). 원본 응답은 그대로 내보내지 않는다. 체감온도 단계는 브라우저에서 계산.
import { CITIES, cityForecast, type CityForecast, type CityId, type WindChillForecast } from '../../src/lib/windChill/forecast.ts'

const KEY = new Request('https://cache.internal/wind-chill-v1', { method: 'GET' })

export async function onRequestGet() {
  const hit = await caches.default.match(KEY)
  if (hit) return hit
  const now = Date.now()
  const settled = await Promise.allSettled(CITIES.map(async c => {
    const res = await fetch(`https://api.met.no/weatherapi/locationforecast/2.0/compact?lat=${c.lat}&lon=${c.lon}`, {
      signal: AbortSignal.timeout(10000), headers: { 'User-Agent': 'ToolHub/1.0 (+https://toolhub.ai.kr/about/)', Accept: 'application/json' },
    })
    if (!res.ok) throw new Error(`MET HTTP ${res.status}`)
    return { id: c.id, ...cityForecast(await res.json(), now) }
  }))
  const ok = settled.flatMap(s => (s.status === 'fulfilled' && s.value.days.length ? [s.value] : []))
  if (!ok.length) return Response.json({ error: 'forecast unavailable' }, { status: 503, headers: { 'Cache-Control': 'no-store' } })
  const body: WindChillForecast = {
    issuedAt: ok.map(o => o.issuedAt).sort()[0], fetchedAt: new Date(now).toISOString(),
    cities: Object.fromEntries(ok.map(o => [o.id, { hours: o.hours, days: o.days }])) as Record<CityId, CityForecast>,
  }
  const maxAge = ok.length === CITIES.length ? 10800 : 600
  const headers = { 'Content-Type': 'application/json', 'Cache-Control': `public, max-age=${maxAge}` }
  await caches.default.put(KEY, new Response(JSON.stringify(body), { headers }))
  return new Response(JSON.stringify(body), { headers })
}
