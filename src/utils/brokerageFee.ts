/**
 * 부동산 중개보수(복비) 상한 계산 (BrokerageFeeCalculator, AcquisitionTaxCalculator 공용). 회귀 체크: node scripts/check-brokerage-fee.ts
 *
 * 근거 (2026-10 기준, 2021.10.19 개편 요율)
 * - 공인중개사법 제32조④, 시행규칙 제20조①: 주택 중개보수는 국토교통부령 범위에서 시·도 조례로 정함
 *   (서울특별시 주택 중개보수 등에 관한 조례 별표1 — 전국 시·도 조례가 동일 요율)
 * - 시행규칙 제20조④: 오피스텔(전용 85㎡ 이하 + 상·하수도 시설이 갖춰진 전용 입식 부엌·수세식 화장실·목욕시설)
 *   매매·교환 0.5%, 임대차 0.4%. 그 밖의 오피스텔·토지·상가 등 주택 외 = 0.9% 이내에서 협의
 * - 시행규칙 제20조⑤: 임대차 거래금액 = 보증금 + 월차임 × 100, 그 합계가 5천만원 미만이면 보증금 + 월차임 × 70
 * - 상한 요율·한도액은 부가가치세 별도. 간이과세자 = 공급대가 × 업종별 부가가치율 40% × 10% = 4%
 */

export type Deal = 'sale' | 'jeonse' | 'monthly'
/** officetel = 주거용 요건(85㎡ 이하·부엌·화장실) 충족 오피스텔, officetelEtc = 그 밖의 오피스텔, nonHouse = 상가·토지 등 */
export type Prop = 'house' | 'officetel' | 'officetelEtc' | 'nonHouse'
export type VatType = 'general' | 'simple' | 'none'

/** upTo = 구간 상한(미만, null = 무한), cap = 한도액(null = 없음) */
export interface Bracket { upTo: number | null; rate: number; cap: number | null }

const E = 100_000_000

export const SALE_BRACKETS: Bracket[] = [
  { upTo: 50_000_000, rate: 0.006, cap: 250_000 },
  { upTo: 2 * E, rate: 0.005, cap: 800_000 },
  { upTo: 9 * E, rate: 0.004, cap: null },
  { upTo: 12 * E, rate: 0.005, cap: null },
  { upTo: 15 * E, rate: 0.006, cap: null },
  { upTo: null, rate: 0.007, cap: null },
]

export const LEASE_BRACKETS: Bracket[] = [
  { upTo: 50_000_000, rate: 0.005, cap: 200_000 },
  { upTo: 1 * E, rate: 0.004, cap: 300_000 },
  { upTo: 6 * E, rate: 0.003, cap: null },
  { upTo: 12 * E, rate: 0.004, cap: null },
  { upTo: 15 * E, rate: 0.005, cap: null },
  { upTo: null, rate: 0.006, cap: null },
]

export const VAT_RATE: Record<VatType, number> = { general: 0.1, simple: 0.04, none: 0 }

export function brackets(prop: Prop, deal: Deal): Bracket[] {
  if (prop === 'house') return deal === 'sale' ? SALE_BRACKETS : LEASE_BRACKETS
  if (prop === 'officetel') return [{ upTo: null, rate: deal === 'sale' ? 0.005 : 0.004, cap: null }]
  return [{ upTo: null, rate: 0.009, cap: null }]
}

/** 거래금액: 매매·전세 = 가격/보증금, 월세 = 보증금 + 월세×100 (5천만원 미만이면 ×70) */
export function tradeAmount(deal: Deal, deposit: number, rent: number): number {
  if (deal !== 'monthly') return deposit
  const base = deposit + rent * 100
  return base < 50_000_000 ? deposit + rent * 70 : base
}

export const bracketIndex = (amount: number, list: Bracket[]) => list.findIndex((b) => b.upTo === null || amount < b.upTo)

const floorWon = (v: number) => Math.floor(v + 1e-6) // 1e-6: 부동소수 오차 보정 (예: 3천만 × 0.6%)

export interface FeeInput { deal: Deal; prop: Prop; deposit: number; rent?: number; vat: VatType; rate?: number }
export interface FeeResult {
  amount: number; idx: number; maxRate: number; cap: number | null
  maxFee: number   // 상한 중개보수 (부가세 별도)
  rate: number     // 적용(협의) 요율
  fee: number; vat: number; total: number  // 한쪽 당사자 부담
}

/** 한쪽 당사자(매도인·매수인 각각)가 내는 중개보수. rate를 주면 상한 요율 안에서 협의 요율로 계산 */
export function calcFee(i: FeeInput): FeeResult {
  const amount = Math.max(0, tradeAmount(i.deal, i.deposit, i.rent ?? 0))
  const list = brackets(i.prop, i.deal)
  const idx = bracketIndex(amount, list)
  const { rate: maxRate, cap } = list[idx]
  const feeAt = (r: number) => Math.min(floorWon(amount * r), cap ?? Infinity)
  const rate = Math.min(maxRate, Math.max(0, i.rate ?? maxRate))
  const fee = feeAt(rate)
  const vat = floorWon(fee * VAT_RATE[i.vat])
  return { amount, idx, maxRate, cap, maxFee: feeAt(maxRate), rate, fee, vat, total: fee + vat }
}

/** 매매 중개보수 상한 (부가세 별도) */
export const saleFee = (price: number, prop: Prop) => calcFee({ deal: 'sale', prop, deposit: price, vat: 'none' }).maxFee
