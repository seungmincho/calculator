// Cloudflare Pages Function — OPINET 유가정보 프록시
// CORS 우회 + 2시간 캐싱으로 OPINET API 호출 최소화 (일 12회 이하)

interface Env {
  OPINET_API_KEY: string
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const OPINET_KEY = context.env.OPINET_API_KEY
  if (!OPINET_KEY) {
    return new Response(JSON.stringify({ error: 'API key not configured' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    })
  }

  // Cloudflare Cache API
  const cacheKey = new Request('https://cache.internal/opinet-fuel-prices', { method: 'GET' })
  const cache = caches.default

  // 캐시 확인
  const cached = await cache.match(cacheKey)
  if (cached) {
    return cached
  }

  // OPINET API 호출 — 전국 평균가격
  try {
    const apiUrl = `https://www.opinet.co.kr/api/avgAllPrice.do?out=json&code=${OPINET_KEY}`
    const upstream = await fetch(apiUrl, {
      headers: { 'User-Agent': 'ToolHub/1.0 (https://toolhub.ai.kr)' },
    })

    if (!upstream.ok) {
      return new Response(JSON.stringify({ error: 'OPINET API error', status: upstream.status }), {
        status: 502,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      })
    }

    const data = await upstream.json()

    const response = new Response(JSON.stringify(data), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=7200', // 2시간
        'X-Data-Source': 'OPINET',
        'X-Cached-At': new Date().toISOString(),
      },
    })

    // 캐시 저장
    context.waitUntil(cache.put(cacheKey, response.clone()))

    return response
  } catch (err) {
    return new Response(JSON.stringify({ error: 'Failed to fetch fuel prices', detail: String(err) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    })
  }
}
