// Cloudflare Pages Function — 김장 적기용 지역별 일 기온 예보 (MET Norway, CC BY 4.0)
// 15개 도시를 한 번에 받아 엣지 캐시에 3시간(일부 실패 시 10분) 둔다. 원본 응답은 그대로 내보내지 않는다.
import { REGIONS, dailyTemps, type DayTemp, type KimjangForecast } from '../../src/lib/kimjang/timing.ts'

const KEY = new Request('https://cache.internal/kimjang-forecast-v1', { method: 'GET' })

export async function onRequestGet() {
  const hit = await caches.default.match(KEY)
  if (hit) return hit
  const settled = await Promise.allSettled(REGIONS.map(async r => {
    const res = await fetch(`https://api.met.no/weatherapi/locationforecast/2.0/compact?lat=${r.lat}&lon=${r.lon}`, {
      signal: AbortSignal.timeout(10000), headers: { 'User-Agent': 'ToolHub/1.0 (+https://toolhub.ai.kr/about/)', Accept: 'application/json' },
    })
    if (!res.ok) throw new Error(`MET HTTP ${res.status}`)
    const json = await res.json() as { properties?: { meta?: { updated_at?: string } } }
    return { id: r.id, days: dailyTemps(json), issuedAt: String(json.properties?.meta?.updated_at ?? '') }
  }))
  const ok = settled.flatMap(s => s.status === 'fulfilled' && s.value.days.length ? [s.value] : [])
  if (!ok.length) return Response.json({ error: 'forecast unavailable' }, { status: 503, headers: { 'Cache-Control': 'no-store' } })
  const body: KimjangForecast = {
    issuedAt: ok.map(o => o.issuedAt).sort()[0], fetchedAt: new Date().toISOString(),
    regions: Object.fromEntries(ok.map(o => [o.id, o.days])) as Record<string, DayTemp[]>,
  }
  const maxAge = ok.length === REGIONS.length ? 10800 : 600
  const headers = { 'Content-Type': 'application/json', 'Cache-Control': `public, max-age=${maxAge}` }
  await caches.default.put(KEY, new Response(JSON.stringify(body), { headers }))
  return new Response(JSON.stringify(body), { headers })
}
