// CSV → Supabase fuel_prices 테이블 일괄 import
// Usage: node scripts/import-fuel-prices.mjs

import { readFileSync } from 'fs'

const SUPABASE_URL = 'https://fodancicubtjoilnritt.supabase.co'
// service_role key — 환경변수 또는 직접 입력
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY
if (!SUPABASE_KEY) {
  console.error('❌ SUPABASE_SERVICE_KEY 환경변수를 설정하세요')
  console.error('  예: SUPABASE_SERVICE_KEY=sb_secret_... node scripts/import-fuel-prices.mjs')
  process.exit(1)
}

// CSV 헤더의 지역명 → OPINET 시도코드 매핑
const REGION_TO_SIDO = {
  '서울': '01', '경기': '02', '강원': '03', '충북': '04', '충남': '05',
  '전북': '06', '전남': '07', '경북': '08', '경남': '09', '부산': '10',
  '제주': '11', '대구': '14', '인천': '15', '광주': '16', '대전': '17',
  '울산': '18', '세종': '19',
}

function readCSV(filename) {
  const buf = readFileSync(filename)
  const td = new TextDecoder('euc-kr')
  const text = td.decode(buf)
  const lines = text.trim().split('\n')
  const headers = lines[0].split(',') // 구분,서울,부산,...

  const data = {} // { '2026-01-23': { '서울': 1234.56, ... } }

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',')
    if (cols.length < 2) continue

    // '2026년01월23일' → '2026-01-23'
    const dateStr = cols[0]
      .replace('년', '-')
      .replace('월', '-')
      .replace('일', '')

    if (!data[dateStr]) data[dateStr] = {}

    for (let j = 1; j < headers.length; j++) {
      const region = headers[j].trim()
      const price = parseFloat(cols[j])
      if (!isNaN(price)) {
        if (!data[dateStr][region]) data[dateStr][region] = {}
        data[dateStr][region] = price
      }
    }
  }

  return { headers: headers.slice(1).map(h => h.trim()), data }
}

async function main() {
  console.log('📂 CSV 파일 읽는 중...')

  const gasoline = readCSV('주유소_지역별_평균판매가격_보통휘발유.csv')
  const diesel = readCSV('주유소_지역별_평균판매가격_자동차용경유.csv')

  // 모든 날짜 수집
  const allDates = [...new Set([...Object.keys(gasoline.data), ...Object.keys(diesel.data)])].sort()
  const regions = gasoline.headers

  console.log(`📅 날짜 범위: ${allDates[0]} ~ ${allDates[allDates.length - 1]} (${allDates.length}일)`)
  console.log(`🗺️  지역: ${regions.join(', ')} (${regions.length}개)`)

  // Supabase upsert용 행 생성
  const rows = []
  for (const date of allDates) {
    for (const region of regions) {
      const sidoCd = REGION_TO_SIDO[region]
      if (!sidoCd) {
        console.warn(`⚠️  알 수 없는 지역: ${region}`)
        continue
      }

      const g = gasoline.data[date]?.[region] ?? null
      const d = diesel.data[date]?.[region] ?? null

      rows.push({
        trade_date: date,
        sido_cd: sidoCd,
        sido_nm: region,
        gasoline: g ? Math.round(g * 100) / 100 : null,
        diesel: d ? Math.round(d * 100) / 100 : null,
        lpg: null, // LPG CSV 없음
      })
    }
  }

  console.log(`📊 총 ${rows.length}행 생성 (${allDates.length}일 × ${regions.length}지역)`)

  // 50행씩 배치 upsert
  const BATCH_SIZE = 50
  let inserted = 0
  let errors = 0

  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE)

    const res = await fetch(`${SUPABASE_URL}/rest/v1/fuel_prices`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Prefer': 'resolution=merge-duplicates',
      },
      body: JSON.stringify(batch),
    })

    if (res.ok) {
      inserted += batch.length
      process.stdout.write(`\r✅ ${inserted}/${rows.length} 행 완료`)
    } else {
      const errText = await res.text()
      errors += batch.length
      console.error(`\n❌ 배치 실패 (${i}~${i + batch.length}): ${errText}`)
    }
  }

  console.log(`\n\n🎉 완료! 삽입: ${inserted}행, 에러: ${errors}행`)
}

main().catch(err => {
  console.error('❌ 에러:', err)
  process.exit(1)
})
