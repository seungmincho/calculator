// Cloudflare Pages Function — OPINET 유가정보 프록시
// 지원 쿼리:
//   /api/fuel-prices                    → 전국 평균 (실시간, 2시간 캐시)
//   /api/fuel-prices?sido=01            → 시도별 실시간 유가
//   /api/fuel-prices?date=2026-03-20    → 과거 날짜 유가 (Supabase)
//   /api/fuel-prices?date=2026-03-20&sido=01 → 과거 날짜 + 특정 지역

interface Env {
  OPINET_API_KEY: string
  SUPABASE_URL: string
  SUPABASE_SERVICE_KEY: string
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const url = new URL(context.request.url)
  const sido = url.searchParams.get('sido')     // 시도코드 (01~19)
  const date = url.searchParams.get('date')     // YYYY-MM-DD (과거 날짜)
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
  }

  // ── 과거 날짜 → Supabase 조회 ──
  if (date) {
    const SUPABASE_URL = context.env.SUPABASE_URL
    const SUPABASE_KEY = context.env.SUPABASE_SERVICE_KEY
    if (!SUPABASE_URL || !SUPABASE_KEY) {
      return new Response(JSON.stringify({ error: 'Supabase not configured' }), {
        status: 500, headers,
      })
    }

    try {
      // get_nearest_fuel_price RPC 호출 (해당 날짜 또는 가장 가까운 이전 날짜)
      const rpcUrl = `${SUPABASE_URL}/rest/v1/rpc/get_nearest_fuel_price`
      const body: Record<string, string> = { p_date: date }
      if (sido) body.p_sido_cd = sido

      const res = await fetch(rpcUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
        },
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        const errText = await res.text()
        return new Response(JSON.stringify({ error: 'Supabase query failed', detail: errText }), {
          status: 502, headers,
        })
      }

      const rows = await res.json()
      return new Response(JSON.stringify({
        source: 'supabase',
        requested_date: date,
        sido: sido || 'all',
        data: rows,
      }), { headers: { ...headers, 'Cache-Control': 'public, max-age=86400' } })
    } catch (err) {
      return new Response(JSON.stringify({ error: 'Supabase error', detail: String(err) }), {
        status: 500, headers,
      })
    }
  }

  // ── 실시간 유가 → OPINET API ──
  const OPINET_KEY = context.env.OPINET_API_KEY
  if (!OPINET_KEY) {
    return new Response(JSON.stringify({ error: 'API key not configured' }), {
      status: 500, headers,
    })
  }

  // 캐시 키: 지역별로 분리
  const cacheId = sido ? `opinet-fuel-${sido}` : 'opinet-fuel-all'
  const cacheKey = new Request(`https://cache.internal/${cacheId}`, { method: 'GET' })
  const cache = caches.default

  const cached = await cache.match(cacheKey)
  if (cached) {
    return cached
  }

  try {
    // sido 파라미터가 있으면 시도별 API, 없으면 전국 평균 API
    const apiUrl = sido
      ? `https://www.opinet.co.kr/api/avgSidoPrice.do?out=json&code=${OPINET_KEY}&sido=${sido}`
      : `https://www.opinet.co.kr/api/avgAllPrice.do?out=json&code=${OPINET_KEY}`

    const upstream = await fetch(apiUrl, {
      headers: { 'User-Agent': 'ToolHub/1.0 (https://toolhub.ai.kr)' },
    })

    if (!upstream.ok) {
      return new Response(JSON.stringify({ error: 'OPINET API error', status: upstream.status }), {
        status: 502, headers,
      })
    }

    const data = await upstream.json()

    const response = new Response(JSON.stringify(data), {
      headers: {
        ...headers,
        'Cache-Control': 'public, max-age=7200',
        'X-Data-Source': 'OPINET',
        'X-Cached-At': new Date().toISOString(),
      },
    })

    context.waitUntil(cache.put(cacheKey, response.clone()))
    return response
  } catch (err) {
    return new Response(JSON.stringify({ error: 'Failed to fetch fuel prices', detail: String(err) }), {
      status: 500, headers,
    })
  }
}
