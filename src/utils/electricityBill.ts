/**
 * 한전 주택용 전기요금 계산 (순수 함수). 요금 적용 기준일: 2026-10-01 (2026년 4분기).
 *
 * 출처 (2026-10-02 확인):
 * - 주택용 저압·고압 요금표 (2023.11.9 시행, 이후 주택용 동결)
 *   https://cyber.kepco.co.kr/ckepco/front/jsp/CY/E/E/CYEEHP00101.jsp
 *   저압 기본 910/1,600/7,300원, 전력량 120.0/214.6/307.3원/kWh
 *   고압 기본 730/1,260/6,060원, 전력량 105.0/174.0/242.3원/kWh
 *   구간: 하계(7.1~8.31) 300/450kWh, 기타 200/400kWh
 *   슈퍼유저: 하계·동계(12.1~2월 말일) 1,000kWh 초과분 저압 736.2 / 고압 593.3원/kWh
 * - 기후환경요금 9.0원/kWh ('23.1~): https://cyber.kepco.co.kr/ckepco/front/jsp/CY/H/C/CYHCHP00211.jsp
 * - 연료비조정단가 +5.0원/kWh (2026년 4분기 동결, 상한): https://cyber.kepco.co.kr/ckepco/front/jsp/CY/H/C/CYHCHP00210.jsp
 *   보도: https://supple.kr/news/cmuahfnfp008krge3204ov6z9 (2026-09-21)
 * - 전력산업기반기금 3.7% → 3.2%(2024.7) → 2.7%(2025.7): https://www.etoday.co.kr/news/view/2375003
 * - 복지할인 한도: https://cyber.kepco.co.kr/ckepco/front/jsp/CY/H/C/CYHCHP00208.jsp
 *
 * 계산 순서 (한전 고지서 방식): 전력량요금·기후환경요금·연료비조정요금 원 미만 절사 →
 * 전기요금계 = 기본 + 전력량 + 기후환경 + 연료비조정 → 부가세 10%(원 미만 반올림) →
 * 기금 2.7%(10원 미만 절사) → 청구금액 10원 미만 절사.
 * 검증: 2024년 8월(기금 3.2%) 하계 363kWh = 63,610원 (한전 발표 8월 주택 평균과 일치).
 */

export type Season = 'normal' | 'summer' | 'winter'
export type Voltage = 'low' | 'high'
export type Welfare = 'none' | 'disabled' | 'basicLiving' | 'basicHousing' | 'nearPoor' | 'family' | 'lifeSupport'

export const RATE_DATE = '2026-10-01'

export const TARIFF: Record<Voltage, { base: [number, number, number]; rate: [number, number, number]; superRate: number }> = {
  low: { base: [910, 1600, 7300], rate: [120.0, 214.6, 307.3], superRate: 736.2 },
  high: { base: [730, 1260, 6060], rate: [105.0, 174.0, 242.3], superRate: 593.3 },
}
export const LIMITS: Record<Season, [number, number]> = { normal: [200, 400], summer: [300, 450], winter: [200, 400] }
export const SUPER_USER_KWH = 1000
export const CLIMATE = 9.0
export const FUEL = 5.0
export const VAT = 0.1
export const FUND = 0.027

/** 복지할인: 정액 한도(기타/여름 6.1~8.31) 또는 30% 정률(한도). 한전 복지할인 요금제 표 */
export const WELFARE: Record<Exclude<Welfare, 'none'>, { cap: [number, number] | null; pct?: number }> = {
  disabled: { cap: [16000, 20000] }, // 장애의 정도가 심한 장애인·1~3급 상이유공자·독립유공자
  basicLiving: { cap: [16000, 20000] }, // 기초생활수급(생계·의료)
  basicHousing: { cap: [10000, 12000] }, // 기초생활수급(주거·교육)
  nearPoor: { cap: [8000, 10000] }, // 차상위계층
  family: { cap: [16000, 16000], pct: 0.3 }, // 대가족(5인+)·3자녀+·출산가구(3년): 30%, 월 16,000원 한도
  lifeSupport: { cap: null, pct: 0.3 }, // 생명유지장치: 30%
}

/** 사용 월(1~12) → 요금 계절. 하계 7~8월, 동계 12~2월(슈퍼유저만 다름) */
export const seasonOf = (month: number): Season =>
  month === 7 || month === 8 ? 'summer' : month === 12 || month <= 2 ? 'winter' : 'normal'

export interface TierRow { tier: 1 | 2 | 3 | 4; from: number; to: number | null; kwh: number; rate: number; amount: number }

export interface Bill {
  kwh: number
  tier: 1 | 2 | 3
  isSuper: boolean
  base: number
  rows: TierRow[]
  energy: number
  climate: number
  fuel: number
  subtotal: number // 전기요금계
  discount: number
  vat: number
  fund: number
  total: number // 청구금액 (10원 미만 절사)
}

export interface Options { season?: Season; voltage?: Voltage; welfare?: Welfare; month?: number; fundRate?: number }

export function calcBill(kwhIn: number, o: Options = {}): Bill {
  const season = o.season ?? 'normal'
  const t = TARIFF[o.voltage ?? 'low']
  const kwh = Math.max(0, Math.round(Number.isFinite(kwhIn) ? kwhIn : 0)) // 계량기 검침은 kWh 정수
  const [l1, l2] = LIMITS[season]
  const tier: 1 | 2 | 3 = kwh <= l1 ? 1 : kwh <= l2 ? 2 : 3
  const superOn = season !== 'normal' && kwh > SUPER_USER_KWH
  const top = superOn ? SUPER_USER_KWH : kwh

  const rows: TierRow[] = [
    { tier: 1, from: 0, to: l1, kwh: Math.min(kwh, l1), rate: t.rate[0], amount: 0 },
    { tier: 2, from: l1, to: l2, kwh: Math.max(0, Math.min(kwh, l2) - l1), rate: t.rate[1], amount: 0 },
    { tier: 3, from: l2, to: superOn ? SUPER_USER_KWH : null, kwh: Math.max(0, top - l2), rate: t.rate[2], amount: 0 },
  ]
  if (superOn) rows.push({ tier: 4, from: SUPER_USER_KWH, to: null, kwh: kwh - SUPER_USER_KWH, rate: t.superRate, amount: 0 })
  rows.forEach((r) => { r.amount = r.kwh * r.rate })

  const base = t.base[tier - 1]
  const energy = Math.floor(rows.reduce((s, r) => s + r.amount, 0) + 1e-9)
  const climate = Math.floor(kwh * CLIMATE + 1e-9)
  const fuel = Math.floor(kwh * FUEL + 1e-9)
  const subtotal = base + energy + climate + fuel

  // ponytail: 복지할인은 전기요금계에서 차감 후 부가세·기금 계산(근사). 200kWh 이하 추가감액(구 필수사용량 보장공제)은 미반영.
  let discount = 0
  const w = o.welfare && o.welfare !== 'none' ? WELFARE[o.welfare] : null
  if (w) {
    const m = o.month ?? 0
    const cap = w.cap ? w.cap[m >= 6 && m <= 8 ? 1 : 0] : Infinity
    discount = Math.floor(Math.min(cap, w.pct ? subtotal * w.pct : subtotal, subtotal))
  }
  const net = subtotal - discount
  const vat = Math.round(net * VAT)
  const fund = Math.floor((net * (o.fundRate ?? FUND)) / 10) * 10
  const total = Math.floor((net + vat + fund) / 10) * 10
  return { kwh, tier, isSuper: superOn, base, rows, energy, climate, fuel, subtotal, discount, vat, fund, total }
}

/** 가전 월 사용량(kWh) = W × 시간/일 × 일수 / 1000 */
export const applianceKwh = (watt: number, hours: number, days: number) =>
  (Math.max(0, watt || 0) * Math.min(24, Math.max(0, hours || 0)) * Math.min(31, Math.max(0, days || 0))) / 1000

/** 누진 구간 경계 근처 안내. within kWh 이내일 때만 */
export type BoundaryTip =
  | { kind: 'above'; tier: 2 | 3; over: number; save: number } // 경계를 조금 넘음: over kWh 줄이면 save원 절약
  | { kind: 'below'; tier: 2 | 3; left: number } // 경계 직전: left kWh 넘게 더 쓰면 tier 구간 진입
  | null

export function boundaryTip(kwh: number, o: Options = {}, within = 30): BoundaryTip {
  const k = Math.max(0, Math.round(kwh || 0))
  const [l1, l2] = LIMITS[o.season ?? 'normal']
  for (const [lim, tier] of [[l1, 2], [l2, 3]] as const) {
    if (k > lim && k - lim <= within) return { kind: 'above', tier, over: k - lim, save: calcBill(k, o).total - calcBill(lim, o).total }
    if (k <= lim && lim - k < within) return { kind: 'below', tier, left: lim - k }
  }
  return null
}

/** 변화율(%). 이전 값이 0이면 null */
export const pctChange = (now: number, before: number) => (before > 0 ? ((now - before) / before) * 100 : null)
