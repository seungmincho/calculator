// Cloudflare Pages Function — OPINET 시도별 유가 수집 → Supabase 저장
// 하루 1회 호출 (GitHub Actions cron 또는 수동)
// 보호: CRON_SECRET 헤더 검증

interface Env {
  OPINET_API_KEY: string
  SUPABASE_URL: string
  SUPABASE_SERVICE_KEY: string
  CRON_SECRET: string
}

interface OilPrice {
  SIDOCD: string
  SIDONM: string
  PRODCD: string
  PRICE: number
  DIFF: number
  TRADE_DT?: string
}

// 시도 코드 → 이름 매핑 (OPINET 기준)
const SIDO_CODES = [
  '01', '02', '03', '04', '05', '06', '07', '08', '09',
  '10', '11', '14', '15', '16', '17', '18', '19'
]

export const onRequestGet: PagesFunction<Env> = async (context) => {
  // 시크릿 키 검증
  const secret = context.request.headers.get('X-Cron-Secret') ||
    new URL(context.request.url).searchParams.get('secret')
  if (!context.env.CRON_SECRET || secret !== context.env.CRON_SECRET) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const OPINET_KEY = context.env.OPINET_API_KEY
  const SUPABASE_URL = context.env.SUPABASE_URL
  const SUPABASE_KEY = context.env.SUPABASE_SERVICE_KEY

  if (!OPINET_KEY || !SUPABASE_URL || !SUPABASE_KEY) {
    return new Response(JSON.stringify({ error: 'Missing env vars' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  try {
    // OPINET API 호출 — 시도별 전체 유가 (sido 미지정 시 18개 시도 전체)
    const apiUrl = `https://www.opinet.co.kr/api/avgSidoPrice.do?out=json&code=${OPINET_KEY}`
    const upstream = await fetch(apiUrl, {
      headers: { 'User-Agent': 'ToolHub/1.0 (https://toolhub.ai.kr)' },
    })

    if (!upstream.ok) {
      return new Response(JSON.stringify({ error: 'OPINET API error', status: upstream.status }), {
        status: 502,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const data = await upstream.json() as { RESULT?: { OIL?: OilPrice[] } }
    const oils = data?.RESULT?.OIL
    if (!Array.isArray(oils) || oils.length === 0) {
      return new Response(JSON.stringify({ error: 'No oil data from OPINET' }), {
        status: 502,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // 시도별로 유가 정리
    const today = new Date().toISOString().slice(0, 10) // YYYY-MM-DD
    const priceMap: Record<string, { sido_nm: string; gasoline?: number; premium_gasoline?: number; diesel?: number; lpg?: number }> = {}

    for (const oil of oils) {
      if (!priceMap[oil.SIDOCD]) {
        priceMap[oil.SIDOCD] = { sido_nm: oil.SIDONM }
      }
      const entry = priceMap[oil.SIDOCD]
      if (oil.PRODCD === 'B027') entry.gasoline = Math.round(Number(oil.PRICE) * 100) / 100
      if (oil.PRODCD === 'B034') entry.premium_gasoline = Math.round(Number(oil.PRICE) * 100) / 100
      if (oil.PRODCD === 'D047') entry.diesel = Math.round(Number(oil.PRICE) * 100) / 100
      if (oil.PRODCD === 'K015') entry.lpg = Math.round(Number(oil.PRICE) * 100) / 100
    }

    // Supabase upsert (ON CONFLICT trade_date + sido_cd)
    const rows = Object.entries(priceMap).map(([sidoCd, data]) => ({
      trade_date: today,
      sido_cd: sidoCd,
      sido_nm: data.sido_nm,
      gasoline: data.gasoline || null,
      premium_gasoline: data.premium_gasoline || null,
      diesel: data.diesel || null,
      lpg: data.lpg || null,
    }))

    const supabaseRes = await fetch(
      `${SUPABASE_URL}/rest/v1/fuel_prices`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
          'Prefer': 'resolution=merge-duplicates',
        },
        body: JSON.stringify(rows),
      }
    )

    if (!supabaseRes.ok) {
      const errText = await supabaseRes.text()
      return new Response(JSON.stringify({ error: 'Supabase insert failed', detail: errText }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({
      success: true,
      date: today,
      regions: rows.length,
      sample: rows.slice(0, 3),
    }), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: 'Collection failed', detail: String(err) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
