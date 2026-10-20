// 오피넷 지역별 평균판매가격 CSV → Supabase fuel_prices 빈 칸 채우기 SQL (SQL Editor 에 붙여 넣는다)
// Usage: node scripts/import-fuel-prices.mjs <보통휘발유.csv> <고급휘발유.csv> <경유.csv> [자동차부탄.csv] > fill.sql
//   휘발유·경유: 국내유가통계 › 주유소 › 평균판매가격 › 지역별 (일간)
//   LPG: 국내유가통계 › 자동차충전소 › 평균판매가격 › 지역별 (일간, 원/ℓ). 'LPG용기충전소'·'LPG용기판매소'는 원/kg 이라 다른 값이다.
// 이미 있는 값은 건드리지 않는다(COALESCE) — 실시간 수집분이 전국('00')까지 있어 더 낫다.

import { readFileSync } from 'fs'

const files = process.argv.slice(2)
if (files.length !== 3 && files.length !== 4) {
  console.error('Usage: node scripts/import-fuel-prices.mjs <보통휘발유.csv> <고급휘발유.csv> <경유.csv> [자동차부탄.csv]')
  process.exit(1)
}

// CSV 헤더의 지역명 → OPINET 시도코드 (2026-07 전남·광주 통합 뒤로는 전남광주 20 만 값이 있다)
const REGION_TO_SIDO = {
  '서울': '01', '경기': '02', '강원': '03', '충북': '04', '충남': '05',
  '전북': '06', '전남': '07', '경북': '08', '경남': '09', '부산': '10',
  '제주': '11', '대구': '14', '인천': '15', '광주': '16', '대전': '17',
  '울산': '18', '세종': '19', '전남광주': '20',
  '전국': '00', // 지역별 CSV 에는 없다 — 제품별(전국) 값을 '전국' 열로 붙이면 과거 전국 조회가 시도 단순 평균 대신 이 값을 쓴다
}

// { '2026-01-23|01': 1234.56 }. 오피넷 CSV 는 EUC-KR, 날짜는 '2026년01월23일' 또는 '26년01월23일'
function readCSV(filename) {
  const buf = readFileSync(filename)
  let text
  try { text = new TextDecoder('utf-8', { fatal: true }).decode(buf) } catch { text = new TextDecoder('euc-kr').decode(buf) }
  const [header, ...lines] = text.replace(/^﻿/, '').trim().split(/\r?\n/)
  const regions = header.split(',').map(h => h.trim())
  const prices = {}
  for (const line of lines) {
    const cols = line.split(',')
    const m = cols[0].match(/^(\d{2}|\d{4})년(\d{2})월(\d{2})일$/)
    if (!m) continue
    const year = m[1].length === 2 ? `20${m[1]}` : m[1]
    for (let j = 1; j < regions.length; j++) {
      const sido = REGION_TO_SIDO[regions[j]]
      if (!sido) throw new Error(`알 수 없는 지역: ${regions[j]}`)
      const price = parseFloat(cols[j])
      if (price > 0) prices[`${year}-${m[2]}-${m[3]}|${sido}`] = Math.round(price * 100) / 100
    }
  }
  return prices
}

const [gasoline, premium, diesel, lpg = {}] = files.map(readCSV)
const nameOf = Object.fromEntries(Object.entries(REGION_TO_SIDO).map(([nm, cd]) => [cd, nm]))
const rows = Object.keys(gasoline).sort()
  .filter(key => diesel[key])
  .map(key => {
    const [date, sido] = key.split('|')
    return [date, sido, nameOf[sido], gasoline[key], premium[key] ?? null, diesel[key], lpg[key] ?? null]
  })
const dates = [...new Set(rows.map(r => r[0]))]
console.error(`${dates[0]} ~ ${dates.at(-1)} · ${dates.length}일 · ${rows.length}행 · LPG ${rows.filter(r => r[6]).length}행`)

const v = x => x === null ? 'NULL' : typeof x === 'number' ? String(x) : `'${x}'`
const keep = col => `${col} = COALESCE(fuel_prices.${col}, EXCLUDED.${col})`
console.log('INSERT INTO fuel_prices (trade_date, sido_cd, sido_nm, gasoline, premium_gasoline, diesel, lpg) VALUES')
console.log(rows.map(r => `(${r.map(v).join(', ')})`).join(',\n'))
console.log(`ON CONFLICT (trade_date, sido_cd) DO UPDATE SET ${['gasoline', 'premium_gasoline', 'diesel', 'lpg'].map(keep).join(', ')};`)
