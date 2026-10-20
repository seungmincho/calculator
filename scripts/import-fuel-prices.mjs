// 오피넷 '주유소 지역별 평균판매가격' CSV(EUC-KR) → Supabase fuel_prices 빈 날짜 채우기
// Usage: node scripts/import-fuel-prices.mjs <보통휘발유.csv> <고급휘발유.csv> <경유.csv> [> out.sql]
//   SUPABASE_SERVICE_KEY 가 있으면 REST 로 넣고, 없으면 SQL Editor 에 붙여 넣을 SQL 을 출력한다.
// 이미 있는 (날짜, 지역) 행은 건드리지 않는다 — 실시간 수집분이 LPG·전국('00')까지 있어 더 낫다.

import { readFileSync } from 'fs'

const SUPABASE_URL = 'https://fodancicubtjoilnritt.supabase.co'
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY
const files = process.argv.slice(2)
if (files.length !== 3) {
  console.error('Usage: node scripts/import-fuel-prices.mjs <보통휘발유.csv> <고급휘발유.csv> <경유.csv>')
  process.exit(1)
}

// CSV 헤더의 지역명 → OPINET 시도코드 (2026 전남·광주 통합 뒤로는 전남광주 20 만 값이 있다)
const REGION_TO_SIDO = {
  '서울': '01', '경기': '02', '강원': '03', '충북': '04', '충남': '05',
  '전북': '06', '전남': '07', '경북': '08', '경남': '09', '부산': '10',
  '제주': '11', '대구': '14', '인천': '15', '광주': '16', '대전': '17',
  '울산': '18', '세종': '19', '전남광주': '20',
}

// { '2026-01-23|01': 1234.56 }
function readCSV(filename) {
  const [header, ...lines] = new TextDecoder('euc-kr').decode(readFileSync(filename)).trim().split(/\r?\n/)
  const regions = header.split(',').map(h => h.trim())
  const prices = {}
  for (const line of lines) {
    const cols = line.split(',')
    const m = cols[0].match(/^(\d{4})년(\d{2})월(\d{2})일$/)
    if (!m) continue
    for (let j = 1; j < regions.length; j++) {
      const sido = REGION_TO_SIDO[regions[j]]
      if (!sido) throw new Error(`알 수 없는 지역: ${regions[j]}`)
      const price = parseFloat(cols[j])
      if (price > 0) prices[`${m[1]}-${m[2]}-${m[3]}|${sido}`] = Math.round(price * 100) / 100
    }
  }
  return prices
}

const [gasoline, premium, diesel] = files.map(readCSV)
const nameOf = Object.fromEntries(Object.entries(REGION_TO_SIDO).map(([nm, cd]) => [cd, nm]))
const rows = Object.keys({ ...gasoline, ...diesel }).sort()
  .filter(key => gasoline[key] && diesel[key])
  .map(key => {
    const [trade_date, sido_cd] = key.split('|')
    return { trade_date, sido_cd, sido_nm: nameOf[sido_cd], gasoline: gasoline[key], premium_gasoline: premium[key] ?? null, diesel: diesel[key], lpg: null }
  })
const dates = [...new Set(rows.map(r => r.trade_date))]
console.error(`${dates[0]} ~ ${dates.at(-1)} · ${dates.length}일 · ${rows.length}행`)

if (!SUPABASE_KEY) {
  const v = x => x === null ? 'NULL' : typeof x === 'number' ? String(x) : `'${x}'`
  console.log('INSERT INTO fuel_prices (trade_date, sido_cd, sido_nm, gasoline, premium_gasoline, diesel, lpg) VALUES')
  console.log(rows.map(r => `(${[r.trade_date, r.sido_cd, r.sido_nm, r.gasoline, r.premium_gasoline, r.diesel, r.lpg].map(v).join(', ')})`).join(',\n'))
  console.log('ON CONFLICT (trade_date, sido_cd) DO NOTHING;')
  process.exit(0)
}

for (let i = 0; i < rows.length; i += 500) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/fuel_prices?on_conflict=trade_date,sido_cd`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      Prefer: 'resolution=ignore-duplicates',
    },
    body: JSON.stringify(rows.slice(i, i + 500)),
  })
  if (!res.ok) {
    console.error(`배치 ${i} 실패: ${res.status} ${await res.text()}`)
    process.exit(1)
  }
}
console.error('완료 (이미 있던 행은 그대로)')
