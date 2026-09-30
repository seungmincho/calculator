/**
 * PC 전기요금 계산 (한전 주택용 저압, 누진제 한계비용)
 *
 * 요금표 출처 (2026-09 확인):
 * - 주택용 저압 기본요금 910/1,600/7,300원, 전력량요금 120.0/214.6/307.3원/kWh,
 *   구간 200/400kWh(하계 7~8월 300/450kWh), 기후환경요금 9.0원/kWh
 *   https://cyber.kepco.co.kr/ckepco/front/jsp/CY/E/E/CYEEHP00101.jsp (한전 요금표, 2023.11.9 이후 주택용 동결)
 * - 연료비조정요금 +5.0원/kWh (2026년 3분기 유지): https://www.etoday.co.kr/news/view/2595748
 * - 전력산업기반기금 3.7% → 3.2%(2024.7) → 2.7%(2025.7): https://www.etoday.co.kr/news/view/2375003
 * - 부가가치세 10%
 * ponytail: 슈퍼유저 요금(하계·동계 1,000kWh 초과 736.2원) 미반영 — 일반 가구 범위 밖.
 */

export const TARIFF = {
  base: [910, 1600, 7300],
  rate: [120.0, 214.6, 307.3],
  limits: { normal: [200, 400], summer: [300, 450] },
  climate: 9.0,
  fuel: 5.0,
  vat: 0.1,
  fund: 0.027,
}

export type Season = 'normal' | 'summer'

export interface Bill {
  tier: 1 | 2 | 3
  base: number
  energy: number
  climate: number
  fuel: number
  vat: number
  fund: number
  total: number
}

/** 한 달 가구 전기요금. 전기요금계 원 미만 절사, 부가세 반올림, 기금 10원 미만 절사 */
export function monthlyBill(kwh: number, season: Season = 'normal'): Bill {
  const k = Math.max(0, kwh)
  const [l1, l2] = TARIFF.limits[season]
  const tier: 1 | 2 | 3 = k <= l1 ? 1 : k <= l2 ? 2 : 3
  const energy =
    Math.min(k, l1) * TARIFF.rate[0] +
    Math.max(0, Math.min(k, l2) - l1) * TARIFF.rate[1] +
    Math.max(0, k - l2) * TARIFF.rate[2]
  const base = TARIFF.base[tier - 1]
  const climate = k * TARIFF.climate
  const fuel = k * TARIFF.fuel
  const subtotal = Math.floor(base + energy + climate + fuel)
  const vat = Math.round(subtotal * TARIFF.vat)
  const fund = Math.floor((subtotal * TARIFF.fund) / 10) * 10
  return { tier, base, energy, climate, fuel, vat, fund, total: subtotal + vat + fund }
}

export interface Marginal {
  before: Bill
  after: Bill
  added: number
}

/** 가구 기존 사용량 위에 PC 사용량이 더해질 때 늘어나는 요금 */
export function marginalCost(householdKwh: number, pcKwh: number, season: Season = 'normal'): Marginal {
  const before = monthlyBill(householdKwh, season)
  const after = monthlyBill(householdKwh + pcKwh, season)
  return { before, after, added: after.total - before.total }
}

/** 연간 추가요금: 하계 2개월(7~8월) + 나머지 10개월 */
export function yearlyMarginal(householdKwh: number, pcKwh: number): number {
  return marginalCost(householdKwh, pcKwh, 'summer').added * 2 + marginalCost(householdKwh, pcKwh, 'normal').added * 10
}

export const LOAD_RATES = { gaming: 0.85, work: 0.5, idle: 0.2 }

export interface Usage {
  gaming: number // 하루 시간
  work: number
  idle: number
  days: number // 월 사용일
}

/** 부하 프로필별 평균 전력 × 시간 → 월 kWh. psuEff: 파워 효율(0~1), 벽 전력 = DC 전력 / 효율 */
export function pcMonthlyKwh(totalWatt: number, u: Usage, psuEff = 1): number {
  const wh = totalWatt * (u.gaming * LOAD_RATES.gaming + u.work * LOAD_RATES.work + u.idle * LOAD_RATES.idle)
  return (wh * u.days) / 1000 / (psuEff > 0 ? psuEff : 1)
}
