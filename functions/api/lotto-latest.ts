// Cloudflare Pages Function — 정적 데이터(public/lottoData.ts) 이후 새 로또 회차.
// GET /api/lotto-latest?after=N → { draws: LottoDraw[] } (N+1회부터, 최대 50회).
// 동행복권 공식 조회를 같은 도메인에서 대신 부르고 엣지에 캐시한다(방문자 브라우저가 외부로 나가지 않게).
// 정적 데이터는 배포 때 `node scripts/update-lotto-data.mjs` 로 갱신한다 — 이건 그 사이 몇 주를 메우는 용도.
import { DH_API, DH_HEADERS, DH_PAGE, cacheSeconds, parseDhList, type LottoDraw } from '../../src/utils/lottoRemote.ts'

const MAX_PAGES = 5

export async function onRequestGet({ request }: { request: Request }) {
  const after = Number(new URL(request.url).searchParams.get('after'))
  if (!Number.isInteger(after) || after < 1 || after > 9999) {
    return Response.json({ error: 'after must be a draw number' }, { status: 400, headers: { 'Cache-Control': 'no-store' } })
  }
  const key = new Request(`https://cache.internal/lotto-latest-v1?after=${after}`, { method: 'GET' })
  const hit = await caches.default.match(key)
  if (hit) return hit

  const draws: LottoDraw[] = []
  for (let page = 0; page < MAX_PAGES; page++) {
    const cursor = after + draws.length
    let list: LottoDraw[]
    try {
      const res = await fetch(DH_API + cursor, { headers: DH_HEADERS, redirect: 'manual', signal: AbortSignal.timeout(5000) })
      if (res.status !== 200 || !(res.headers.get('content-type') ?? '').includes('json')) throw new Error(`upstream ${res.status}`)
      list = parseDhList(await res.json(), cursor)
    } catch (e) {
      if (draws.length) break // 받은 만큼은 내보낸다
      return Response.json({ error: 'upstream unavailable', detail: String(e) }, { status: 502, headers: { 'Cache-Control': 'no-store' } })
    }
    draws.push(...list)
    if (list.length < DH_PAGE) break
  }

  const body = JSON.stringify({ draws })
  const headers = { 'Content-Type': 'application/json', 'Cache-Control': `public, max-age=${cacheSeconds(Date.now())}` }
  await caches.default.put(key, new Response(body, { headers }))
  return new Response(body, { headers })
}
