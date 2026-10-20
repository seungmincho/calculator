// Cloudflare Pages Function — OPINET 유가정보 프록시
// 지원 쿼리:
//   /api/fuel-prices                    → 전국 평균 (실시간, 2시간 캐시)
//   /api/fuel-prices?sido=01            → 시도별 실시간 유가
//   /api/fuel-prices?sido=all           → 전체 시도의 실시간 유가 (수집 접근 검증)
//   /api/fuel-prices?date=2026-03-20    → 과거 날짜 유가 (Supabase)
//   /api/fuel-prices?date=2026-03-20&sido=01 → 과거 날짜 + 특정 지역

interface Env {
  OPINET_API_KEY: string
  SUPABASE_URL: string
  SUPABASE_SERVICE_KEY: string
}

type Oil = { DATE?: string; AREA_CD?: string; AREA_NM?: string; SIDOCD?: string; PRODCD: string; PRICE: number | string }
type Row = { trade_date: string; sido_cd: string; sido_nm: string } & Record<'gasoline' | 'premium_gasoline' | 'diesel' | 'lpg', number | null>
const PRODUCTS: Record<string, 'gasoline' | 'premium_gasoline' | 'diesel' | 'lpg'> = { B027: 'gasoline', B034: 'premium_gasoline', D047: 'diesel', K015: 'lpg' }
const BACKFILL_MARK = new Request('https://cache.internal/fuel-backfill', { method: 'GET' })

// 과거 날짜 조회용 Supabase 적재. OPINET 은 해외 IP(GitHub Actions 등)에 빈 결과를 주므로, 국내 엣지에서
// 실시간 조회가 성공한 김에 최근 7일치(전국 + 시도별)를 넣는다. 일주일에 한 번만 불려도 빈 날이 메워진다.
async function backfillRecent(env: Env) {
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_KEY || await caches.default.match(BACKFILL_MARK)) return
  const opinet = async (query: string) => {
    const res = await fetch(`https://www.opinet.co.kr/api/${query}&code=${env.OPINET_API_KEY}`, {
      headers: { 'User-Agent': 'ToolHub/1.0 (https://toolhub.ai.kr)' },
    })
    return ((await res.json() as { RESULT?: { OIL?: Oil[] } })?.RESULT?.OIL ?? [])
  }
  // 시도 코드는 바뀐다(2026 전남·광주 → 20 전남광주) — 현재 목록을 OPINET 에서 받는다
  const codes = [...new Set((await opinet('avgSidoPrice.do?out=json')).map(o => String(o.SIDOCD)))].filter(c => /^\d{2}$/.test(c) && c !== '00')
  const lists = await Promise.all([
    opinet('avgRecentPrice.do?out=json').then(list => list.map(o => ({ ...o, AREA_CD: '00', AREA_NM: '전국' }))),
    ...codes.map(c => opinet(`areaAvgRecentPrice.do?out=json&area=${c}`)),
  ])
  const rows = new Map<string, Row>()
  for (const o of lists.flat()) {
    const field = PRODUCTS[o.PRODCD]
    const price = Number(o.PRICE)
    const d = String(o.DATE ?? '')
    if (!field || !(price > 0) || !/^\d{8}$/.test(d) || !o.AREA_CD || !o.AREA_NM) continue
    const date = `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6)}`
    const key = `${date}|${o.AREA_CD}`
    const row = rows.get(key) ?? { trade_date: date, sido_cd: o.AREA_CD, sido_nm: o.AREA_NM, gasoline: null, premium_gasoline: null, diesel: null, lpg: null }
    row[field] = Math.round(price * 100) / 100
    rows.set(key, row)
  }
  const complete = [...rows.values()].filter(r => r.gasoline && r.diesel)
  if (!complete.length) return
  const res = await fetch(`${env.SUPABASE_URL}/rest/v1/fuel_prices?on_conflict=trade_date,sido_cd`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: env.SUPABASE_SERVICE_KEY,
      Authorization: `Bearer ${env.SUPABASE_SERVICE_KEY}`,
      Prefer: 'resolution=merge-duplicates',
    },
    body: JSON.stringify(complete),
  })
  // 성공했을 때만 12시간 표시 — 실패하면 다음 실시간 조회에서 다시 시도한다
  if (res.ok) await caches.default.put(BACKFILL_MARK, new Response('1', { headers: { 'Cache-Control': 'max-age=43200' } }))
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const url = new URL(context.request.url)
  const allRegions = url.searchParams.get('sido') === 'all'
  const sido = allRegions ? null : url.searchParams.get('sido') // 시도코드
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
  const cacheId = allRegions ? 'opinet-fuel-regions-all' : sido ? `opinet-fuel-${sido}` : 'opinet-fuel-all'
  const cacheKey = new Request(`https://cache.internal/${cacheId}`, { method: 'GET' })
  const cache = caches.default

  const cached = await cache.match(cacheKey)
  if (cached) {
    return cached
  }

  try {
    // sido 파라미터가 있으면 시도별 API, 없으면 전국 평균 API
    const apiUrl = sido || allRegions
      ? `https://www.opinet.co.kr/api/avgSidoPrice.do?out=json&code=${OPINET_KEY}${sido ? `&sido=${encodeURIComponent(sido)}` : ''}`
      : `https://www.opinet.co.kr/api/avgAllPrice.do?out=json&code=${OPINET_KEY}`

    const upstream = await fetch(apiUrl, {
      headers: { 'User-Agent': 'ToolHub/1.0 (https://toolhub.ai.kr)' },
    })

    if (!upstream.ok) {
      return new Response(JSON.stringify({ error: 'OPINET API error', status: upstream.status }), {
        status: 502, headers,
      })
    }

    const data = await upstream.json() as { RESULT?: { OIL?: unknown[] } }
    // 이 엣지에서 OPINET 이 응답했을 때만(해외 엣지는 빈 결과) 과거 날짜용 적재
    if (data?.RESULT?.OIL?.length) context.waitUntil(backfillRecent(context.env).catch(() => {}))

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
