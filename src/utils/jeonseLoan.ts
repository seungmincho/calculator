// 전세자금대출 자격·한도·금리 순수 로직. 금액 단위: 원, 금리: % (예: 2.5 = 연 2.5%)
// 출처: 주택도시기금 기금e든든 (nhuf.molit.go.kr) 상품 안내 + 금리표(국토교통부 고시), 2026-10-01 조회
//   버팀목 FP05020101 · 청년전용 FP05020301 · 신혼부부전용 FP05020401 · 신생아 특례 FP05021401
// HUG 전세보증금반환보증 보증료율: khug.or.kr igdr000001 (2026-10-01 조회)
// HF 일반전세자금보증(시중은행 비교): hf.go.kr — 임차보증금 수도권 7억/그 외 5억 이하, 보증한도 최대 4억

export const SOURCE_DATE = '2026-10-01'

export type Product = 'general' | 'youth' | 'newlywed' | 'newborn' | 'bank'
export const PRODUCTS: Product[] = ['general', 'youth', 'newlywed', 'newborn', 'bank']
export type Location = 'capital' | 'local'

export interface Profile {
  deposit: number      // 전세보증금
  location: Location
  income: number       // 부부합산 연소득
  netAsset: number     // 부부합산 순자산
  age: number          // 만 나이
  married: number      // 1 = 혼인 7년 이내(또는 3개월 내 결혼예정)
  kids: number         // 미성년 자녀 수
  newborn: number      // 1 = 대출접수일 기준 2년 내 출산
  dual: number         // 1 = 맞벌이 (신생아 특례 소득 2억)
  sme: number          // 1 = 중소·중견기업 재직/청년창업 (청년 0.3%p)
  homeless: number     // 1 = 세대원 전원 무주택 세대주
  area: number         // 1 = 전용 85㎡ 이하
  econtract: number    // 1 = 부동산 전자계약 (0.1%p)
  want: number         // 희망 대출액, 0 = 최대 한도
  bankRate: number     // 시중은행 금리 (사용자 입력)
}

const M = 10_000 // 만원
const EOK = 100_000_000
const NET_ASSET_CAP = 345_000_000 // 2026년도 기준 순자산 3.45억 (4개 기금 상품 공통)

// ── 금리표 (행 = 부부합산 연소득 상한, 열 = 임차보증금 상한). 기금e든든 금리 API 값 그대로 ──
const INC_4 = [2000 * M, 4000 * M, 6000 * M, 7500 * M]
const DEP_3 = [5000 * M, 1 * EOK, Infinity]
const DEP_4 = [5000 * M, 1 * EOK, 1.5 * EOK, Infinity]
const GENERAL_RATES = [[2.5, 2.6, 2.7], [2.7, 2.8, 2.9], [3.0, 3.1, 3.2], [3.3, 3.4, 3.5]]
const YOUTH_RATES = [[2.2], [2.5], [2.9], [3.3]] // 보증금 3억 이하 단일 열
const NEWLYWED_RATES = [
  [1.9, 2.0, 2.1, 2.2], [2.2, 2.3, 2.4, 2.5], [2.6, 2.7, 2.8, 2.9], [3.0, 3.1, 3.2, 3.3],
]
const NEWBORN_INC = [2000 * M, 4000 * M, 6000 * M, 7500 * M, 1 * EOK, 1.3 * EOK, 1.5 * EOK, 1.7 * EOK, 2 * EOK]
const NEWBORN_RATES = [
  [1.3, 1.4, 1.5, 1.6], [1.6, 1.7, 1.8, 1.9], [1.9, 2.0, 2.1, 2.2], [2.2, 2.3, 2.4, 2.5],
  [2.55, 2.65, 2.75, 2.85], [2.9, 3.0, 3.1, 3.2], [3.25, 3.35, 3.45, 3.55], [3.6, 3.7, 3.8, 3.9],
  [4.0, 4.1, 4.2, 4.3],
]

const idx = (bounds: number[], v: number) => {
  const i = bounds.findIndex((b) => v <= b)
  return i < 0 ? bounds.length - 1 : i
}

/** 금리표상 기본금리 (지방·우대 적용 전). 은행은 사용자 입력 */
export function tableRate(p: Product, income: number, deposit: number, bankRate = 0): number {
  switch (p) {
    case 'general': return GENERAL_RATES[idx(INC_4, income)][idx(DEP_3, deposit)]
    case 'youth': return YOUTH_RATES[idx(INC_4, income)][0]
    case 'newlywed': return NEWLYWED_RATES[idx(INC_4, income)][idx(DEP_4, deposit)]
    case 'newborn': return NEWBORN_RATES[idx(NEWBORN_INC, income)][idx(DEP_4, deposit)]
    case 'bank': return bankRate
  }
}

/** 버팀목 일반: 신혼 또는 2자녀 이상이면 보증금·한도·LTV 우대 */
const generalSpecial = (x: Profile) => x.married === 1 || x.kids >= 2
const youthSingleUnder25 = (x: Profile) => x.age < 25 && x.married !== 1

/** 소득 상한 */
export function incomeCap(p: Product, x: Profile): number {
  switch (p) {
    case 'general':
    case 'youth':
      return x.married === 1 ? 7500 * M : x.kids >= 2 ? 6000 * M : 5000 * M
    case 'newlywed': return 7500 * M
    case 'newborn': return x.dual === 1 ? 2 * EOK : 1.3 * EOK
    case 'bank': return Infinity
  }
}

/** 임차보증금 상한 */
export function depositCap(p: Product, x: Profile): number {
  const cap = x.location === 'capital'
  switch (p) {
    case 'general': return generalSpecial(x) ? (cap ? 4 : 3) * EOK : (cap ? 3 : 2) * EOK
    case 'youth': return 3 * EOK
    case 'newlywed': return (cap ? 4 : 3) * EOK
    case 'newborn': return (cap ? 5 : 4) * EOK
    case 'bank': return (cap ? 7 : 5) * EOK // HF 일반전세자금보증 기준
  }
}

/** 호당 대출한도와 보증금 대비 비율 */
export function limitRule(p: Product, x: Profile): { cap: number; ltv: number } {
  const capital = x.location === 'capital'
  switch (p) {
    case 'general':
      return generalSpecial(x)
        ? { cap: (capital ? 2.5 : 1.6) * EOK, ltv: 0.8 }
        : { cap: (capital ? 1.2 : 0.8) * EOK, ltv: 0.7 }
    case 'youth': return { cap: youthSingleUnder25(x) ? 1.2 * EOK : 1.5 * EOK, ltv: 0.8 }
    case 'newlywed': return { cap: (capital ? 2.5 : 1.6) * EOK, ltv: 0.8 }
    case 'newborn': return { cap: 2.4 * EOK, ltv: 0.8 }
    case 'bank': return { cap: 4 * EOK, ltv: 0.8 } // HF 일반전세자금보증 최대 4억, 보증금 80%
  }
}

export interface Check { key: string; pass: boolean; value?: number }

export function checks(p: Product, x: Profile): Check[] {
  const list: Check[] = []
  if (p !== 'bank') list.push({ key: 'homeless', pass: x.homeless === 1 })
  if (p === 'youth') list.push({ key: 'age', pass: x.age >= 19 && x.age <= (x.sme === 1 ? 39 : 34) })
  if (p === 'newlywed') list.push({ key: 'married', pass: x.married === 1 })
  if (p === 'newborn') list.push({ key: 'newborn', pass: x.newborn === 1 })
  const ic = incomeCap(p, x)
  if (ic !== Infinity) list.push({ key: 'income', pass: x.income <= ic, value: ic })
  if (p !== 'bank') list.push({ key: 'asset', pass: x.netAsset <= NET_ASSET_CAP, value: NET_ASSET_CAP })
  list.push({ key: 'deposit', pass: x.deposit <= depositCap(p, x), value: depositCap(p, x) })
  if (p !== 'bank') list.push({ key: 'area', pass: x.area === 1 })
  return list
}

export interface Discount { key: string; value: number }

export interface Quote {
  product: Product
  eligible: boolean
  checks: Check[]
  limit: number        // min(호당한도, 보증금 × 비율)
  loan: number         // 실제 대출액 = min(희망, 한도)
  baseRate: number     // 금리표 기본금리
  local: number        // 지방 인하 (0 또는 0.2)
  discounts: Discount[]
  discountTotal: number // 상한 적용 후 우대 합계
  rate: number         // 최종 금리 (하한 1.0%)
  own: number          // 필요한 내 돈 = 보증금 − 대출
}

/** 우대금리. 우대 합계 상한 0.5%p(다자녀 0.7%p), 최종금리 하한 1.0% — 기금 상품 공통 규정 */
function discountsFor(p: Product, x: Profile, loan: number, limit: number): { list: Discount[]; cap: number } {
  const list: Discount[] = []
  if (p === 'bank') return { list, cap: 0 }
  // 금리우대 (중복 불가): 자녀 수 — 신생아 특례는 별도 체계라 제외
  if (p !== 'newborn' && x.kids > 0) list.push({ key: 'kids', value: x.kids >= 3 ? 0.7 : x.kids === 2 ? 0.5 : 0.3 })
  // 추가우대 (중복 가능)
  if (p === 'youth' && x.sme === 1) list.push({ key: 'sme', value: 0.3 })
  if (p === 'youth' && youthSingleUnder25(x) && loan <= 1.2 * EOK) list.push({ key: 'under25', value: 0.3 })
  if (x.econtract === 1) list.push({ key: 'econtract', value: 0.1 })
  if (loan > 0 && loan <= limit * 0.3) list.push({ key: 'small', value: 0.2 })
  return { list, cap: p !== 'newborn' && x.kids >= 3 ? 0.7 : 0.5 }
}

const round2 = (v: number) => Math.round(v * 100) / 100

export function quote(p: Product, x: Profile): Quote {
  const cs = checks(p, x)
  const { cap, ltv } = limitRule(p, x)
  const limit = Math.max(0, Math.min(cap, Math.floor(x.deposit * ltv)))
  const loan = x.want > 0 ? Math.min(x.want, limit) : limit
  const baseRate = tableRate(p, x.income, x.deposit, x.bankRate)
  const local = p !== 'bank' && x.location === 'local' ? 0.2 : 0
  const d = discountsFor(p, x, loan, limit)
  const discountTotal = round2(Math.min(d.cap, d.list.reduce((s, v) => s + v.value, 0)))
  const raw = round2(baseRate - local - discountTotal)
  const rate = p === 'bank' ? baseRate : Math.max(1.0, raw)
  return {
    product: p, eligible: cs.every((c) => c.pass), checks: cs, limit, loan,
    baseRate, local, discounts: d.list, discountTotal, rate, own: Math.max(0, x.deposit - loan),
  }
}

/** 추천: 자격 되는 기금 상품 중 대출액이 가장 크고, 같으면 금리가 낮은 것. 없으면 시중은행 */
export function bestProduct(x: Profile): Product {
  const ok = PRODUCTS.filter((p) => p !== 'bank').map((p) => quote(p, x)).filter((q) => q.eligible && q.loan > 0)
  if (!ok.length) return 'bank'
  ok.sort((a, b) => b.loan - a.loan || a.rate - b.rate)
  return ok[0].product
}

export type Repayment = 'bullet' | 'equalPrincipalInterest'

/** 월 납입액·기간 총 이자 */
export function payment(loan: number, ratePct: number, years: number, type: Repayment) {
  const months = Math.round(years * 12)
  const r = ratePct / 100 / 12
  if (loan <= 0 || months <= 0) return { monthly: 0, monthlyInterest: 0, totalInterest: 0 }
  const monthlyInterest = Math.round(loan * r)
  if (type === 'bullet') return { monthly: monthlyInterest, monthlyInterest, totalInterest: monthlyInterest * months }
  if (r === 0) return { monthly: Math.round(loan / months), monthlyInterest: 0, totalInterest: 0 }
  const f = Math.pow(1 + r, months)
  const monthly = Math.round((loan * r * f) / (f - 1))
  return { monthly, monthlyInterest, totalInterest: monthly * months - loan }
}

// ── HUG 전세보증금반환보증 보증료 ──
export type HouseType = 'apt' | 'other'
export type DebtBand = 70 | 80 | 100 // 부채비율 70% 이하 / 80% 이하 / 80% 초과
const HUG_DEP = [1 * EOK, 2 * EOK, 5 * EOK, Infinity]
const HUG_RATES: Record<HouseType, number[][]> = {
  //         70이하  80이하  80초과
  apt:   [[0.097, 0.117, 0.137], [0.102, 0.124, 0.146], [0.107, 0.131, 0.154], [0.113, 0.138, 0.164]],
  other: [[0.111, 0.142, 0.172], [0.117, 0.151, 0.184], [0.124, 0.161, 0.197], [0.132, 0.172, 0.211]],
}

export function hugRate(deposit: number, house: HouseType, band: DebtBand): number {
  return HUG_RATES[house][idx(HUG_DEP, deposit)][band === 70 ? 0 : band === 80 ? 1 : 2]
}

/** 보증료 할인 (중복 불가, 큰 것 하나): 연소득 5천 이하 60%, 신혼(합산 6천 이하) 40%, 다자녀(3명+) 40% */
export function hugDiscount(income: number, married: boolean, kids: number): number {
  if (income <= 5000 * M) return 0.6
  if ((married && income <= 6000 * M) || kids >= 3) return 0.4
  return 0
}

/** 보증료 = 보증금액 × 보증료율 × 계약일수/365 × (1 − 할인) */
export function hugFee(deposit: number, house: HouseType, band: DebtBand, days: number, discount: number): number {
  return Math.round((deposit * hugRate(deposit, house, band)) / 100 * (days / 365) * (1 - discount))
}
