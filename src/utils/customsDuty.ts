// 해외직구 관·부가세 계산 (2026-10-04 기준). 순수 함수, 금액은 원 미만 절사(관세청 예상세액 조회와 같은 방식).
// 근거
//  - 면세: 관세법 제94조, 시행규칙 제45조②1 — 물품가격(과세가격 − 수입항까지 운임·보험료, 구분 안 되면 포함) 미화 150달러 이하 자가사용 물품
//  - 목록통관: 특송물품 수입통관 사무처리에 관한 고시 제9조①1 — $150, 한미 FTA 특송 특례 물품(미국 발송) $200 / 별표1 목록통관 배제 물품
//  - 과세가격: 관세법 제30조①(거래가격 + 수입항까지 운임·보험료), 과세환율: 제18조(관세청장이 매주 정함)
//  - 부가세: 부가가치세법 제29조② (과세가격 + 관세 + 개별소비세 + 교육세 …) × 10%
//  - 고급 시계·가방: 개별소비세법 제1조②2가, 시행령 제4조 — 1개당 200만원 초과분 20%, 교육세 = 개별소비세 × 30%
//  - 징수 최저한: 관세법 제40조, 시행령 제37조 — 1만원 미만 미징수 (세목별 적용은 '참고': 공식 문구로 확인 못 함)
//  - 합산과세: 수입통관 사무처리에 관한 고시 제68조 — 같은 B/L 분할, 같은 해외공급자·같은 날 구매 분할 반입 (2022.11.17 '같은 날 입항' 기준 삭제)
//  - 품목 관세율: 관세청 해외직구물품 예상세액 조회(customs.go.kr) 기본세율, 노트북·태블릿 등은 WTO 정보기술협정 양허세율 0%(관세법 제50조③)

export type Origin = 'us' | 'other'
export type Clearance = 'list' | 'general'

export const CURRENCIES = ['USD', 'EUR', 'JPY', 'CNY', 'GBP', 'KRW'] as const
export type Cur = (typeof CURRENCIES)[number]
/** 환율 입력·표시 단위: 엔화만 100엔당 원 */
export const RATE_UNIT: Record<Cur, number> = { USD: 1, EUR: 1, JPY: 100, CNY: 1, GBP: 1, KRW: 1 }
/** 관세청 과세환율(2026-10-04 조회, 주 단위로 바뀜). 실시간 환율을 못 불러올 때만 쓰는 기본값, RATE_UNIT 기준 */
export const FALLBACK_RATES: Record<Cur, number> = { USD: 1357.14, EUR: 1537.92, JPY: 861.31, CNY: 202.24, GBP: 1795.94, KRW: 1 }
export const FALLBACK_DATE = '2026-10-04'

/** 품목 프리셋: 관세율(%)과 기본 통관 방식. luxury = 개당 200만원 초과 고급 시계·가방(개별소비세) */
export const ITEMS = [
  { id: 'clothes', rate: 13, clearance: 'list' },
  { id: 'shoes', rate: 13, clearance: 'list' },
  { id: 'bag', rate: 8, clearance: 'list' },
  { id: 'cosmetics', rate: 8, clearance: 'list' },
  { id: 'perfume', rate: 8, clearance: 'list' },
  { id: 'watch', rate: 8, clearance: 'list' },
  { id: 'luxury', rate: 8, clearance: 'list', luxury: true },
  { id: 'it', rate: 0, clearance: 'general' }, // 전파법 시행령 별표6의2 1호 자목(개인 사용 1대) → 목록통관 배제(특송고시 별표1 11호)
  { id: 'supplement', rate: 8, clearance: 'general' }, // 건강기능식품 → 목록통관 배제(별표1 5호)
  { id: 'toy', rate: 8, clearance: 'list' },
  { id: 'sports', rate: 8, clearance: 'list' },
  { id: 'furniture', rate: 8, clearance: 'list' },
  { id: 'book', rate: 0, clearance: 'list' },
  { id: 'custom', rate: 8, clearance: 'list' },
] as const satisfies readonly { id: string; rate: number; clearance: Clearance; luxury?: boolean }[]
export type ItemId = (typeof ITEMS)[number]['id']
export const ITEM_IDS = ITEMS.map((x) => x.id) as readonly ItemId[]
export const item = (id: ItemId) => ITEMS.find((x) => x.id === id) ?? ITEMS[0]

export const MIN_TAX = 10_000
export const LUXURY_BASE = 2_000_000
export const VAT_RATE = 0.1
export const EXCISE_RATE = 0.2
export const EDU_RATE = 0.3

export const limitUsd = (o: Origin, c: Clearance) => (o === 'us' && c === 'list' ? 200 : 150)
const cents = (n: number) => Math.round(n * 100) / 100

export interface Input {
  origin: Origin
  clearance: Clearance
  cur: Cur
  price: number // 상품 가격 (구매 통화)
  local: number // 현지 세금·현지 배송비 (구매 통화) — 물품가격에 포함
  ship: number // 국제 배송비 (구매 통화) — 면세 판정에서 제외, 과세가격에는 포함
  other: number // 같은 판매자·같은 날 구매해 따로 오는 다른 주문의 물품가격 (구매 통화)
  rate: number // 1 구매 통화당 원 (KRW = 1)
  usdRate: number // 1달러당 원 (면세 판정용)
  dutyRate: number // %
  luxury: boolean
}

export type TaxKey = 'duty' | 'excise' | 'edu' | 'vat'
export const TAX_KEYS: readonly TaxKey[] = ['duty', 'excise', 'edu', 'vat']

export function calc(i: Input) {
  const limit = limitUsd(i.origin, i.clearance)
  const usd = (fx: number) => (i.cur === 'USD' ? cents(fx) : i.usdRate > 0 ? cents((fx * i.rate) / i.usdRate) : 0)
  const goodsFx = i.price + i.local + i.other
  const ownUsd = usd(i.price + i.local) // 이 주문만의 물품가격
  const goodsUsd = usd(goodsFx) // 합산 물품가격 (판정 기준)
  const exempt = goodsUsd <= limit // "이하" — 한도와 같으면 면세
  const combined = i.other > 0 && ownUsd <= limit && !exempt // 합산과세로 과세 전환
  const shipRisk = exempt && i.ship > 0 && usd(goodsFx + i.ship) > limit // 배송비가 결제 내역에서 구분 안 되면 과세될 수 있음
  const paidKrw = Math.floor((goodsFx + i.ship) * i.rate)
  const value = exempt ? 0 : paidKrw // 과세가격 = 물품가격 + 운임 (원)

  const duty = Math.floor((value * i.dutyRate) / 100)
  const excise = i.luxury ? Math.floor(Math.max(0, value + duty - LUXURY_BASE) * EXCISE_RATE) : 0
  const edu = Math.floor(excise * EDU_RATE)
  const vat = Math.floor((value + duty + excise + edu) * VAT_RATE)
  const raw: Record<TaxKey, number> = { duty, excise, edu, vat }
  const tax = { ...raw }
  const waived: TaxKey[] = []
  for (const k of TAX_KEYS) if (raw[k] > 0 && raw[k] < MIN_TAX) { tax[k] = 0; waived.push(k) }
  const total = tax.duty + tax.excise + tax.edu + tax.vat
  const remainUsd = exempt ? cents(limit - goodsUsd) : 0

  return {
    limit, ownUsd, goodsUsd, exempt, combined, shipRisk, paidKrw, value, raw, tax, waived, total,
    totalKrw: paidKrw + total,
    remainUsd,
    remainFx: i.cur === 'USD' ? remainUsd : i.rate > 0 ? (remainUsd * i.usdRate) / i.rate : 0,
    overUsd: exempt ? 0 : cents(goodsUsd - limit),
  }
}
export type Result = ReturnType<typeof calc>
