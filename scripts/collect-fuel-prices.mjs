#!/usr/bin/env node
// OPINET 시도별 유가 수집 → Supabase 저장
// GitHub Actions에서 직접 실행 (Cloudflare Worker 우회 — OPINET이 CF IP를 차단하는 문제 해결)
// 필요 env: OPINET_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_KEY

const { OPINET_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_KEY } = process.env

if (!OPINET_API_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('Missing required env vars: OPINET_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_KEY')
  process.exit(1)
}

const PRODUCT_MAP = {
  B027: 'gasoline',
  B034: 'premium_gasoline',
  D047: 'diesel',
  K015: 'lpg',
}

async function main() {
  const apiUrl = `https://www.opinet.co.kr/api/avgSidoPrice.do?out=json&code=${OPINET_API_KEY}`
  const res = await fetch(apiUrl, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; ToolHubBot/1.0; +https://toolhub.ai.kr)' },
  })
  if (!res.ok) {
    console.error(`OPINET API error: ${res.status} ${res.statusText}`)
    console.error(await res.text())
    process.exit(1)
  }

  const data = await res.json()
  const oils = data?.RESULT?.OIL
  if (!Array.isArray(oils) || oils.length === 0) {
    console.error('No oil data from OPINET')
    console.error(JSON.stringify(data).slice(0, 500))
    process.exit(1)
  }

  const today = new Date().toISOString().slice(0, 10)
  const priceMap = {}
  for (const oil of oils) {
    const sido = String(oil.SIDOCD)
    if (sido === '00') continue
    if (!priceMap[sido]) priceMap[sido] = { sido_nm: oil.SIDONM }
    const col = PRODUCT_MAP[oil.PRODCD]
    if (col) priceMap[sido][col] = Math.round(Number(oil.PRICE) * 100) / 100
  }

  const rows = Object.entries(priceMap).map(([sido_cd, v]) => ({
    trade_date: today,
    sido_cd,
    sido_nm: v.sido_nm,
    gasoline: v.gasoline ?? null,
    premium_gasoline: v.premium_gasoline ?? null,
    diesel: v.diesel ?? null,
    lpg: v.lpg ?? null,
  }))

  const supRes = await fetch(`${SUPABASE_URL}/rest/v1/fuel_prices`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: SUPABASE_SERVICE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
      Prefer: 'resolution=merge-duplicates',
    },
    body: JSON.stringify(rows),
  })

  if (!supRes.ok) {
    console.error(`Supabase insert failed: ${supRes.status}`)
    console.error(await supRes.text())
    process.exit(1)
  }

  console.log(`✓ Collected ${rows.length} regions for ${today}`)
  console.log(JSON.stringify(rows.slice(0, 3), null, 2))
}

main().catch((err) => {
  console.error('Collection failed:', err)
  process.exit(1)
})
