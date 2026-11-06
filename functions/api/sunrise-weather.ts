// Cloudflare Pages Function — 새해 첫 해돋이 시각의 명소별 구름양 (MET Norway, CC BY 4.0)
// 예보 범위 밖이면 MET 를 부르지 않고 공개 날짜만 알려 준다. 엣지 캐시 3시간(범위 밖·일부 실패 1시간).
import { newYearTarget } from '../../src/lib/sun/solar.ts'
import { SPOTS } from '../../src/lib/sun/places.ts'
import { fetchSunriseSky } from '../../src/lib/sun/weather.ts'

export async function onRequestGet() {
  const now = Date.now(), target = newYearTarget(now)
  const key = new Request(`https://cache.internal/sunrise-weather-${target}`, { method: 'GET' })
  const hit = await caches.default.match(key)
  if (hit) return hit
  const body = await fetchSunriseSky(target, now)
  const complete = body.available && Object.keys(body.spots).length === SPOTS.length
  const headers = { 'Content-Type': 'application/json', 'Cache-Control': `public, max-age=${complete ? 10800 : 3600}` }
  await caches.default.put(key, new Response(JSON.stringify(body), { headers }))
  return new Response(JSON.stringify(body), { headers })
}
