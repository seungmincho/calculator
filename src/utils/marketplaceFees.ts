// 오픈마켓 건당 수수료 (순수 함수). 회귀 체크: node scripts/check-sales-commission.ts
// 금액 단위: 원. 요율 단위: %. 요율 확인일: 2026-10-05.

export type CategoryKey = 'fashion' | 'fashionAcc' | 'beauty' | 'food' | 'living' | 'electronics' | 'sports' | 'books' | 'baby' | 'furniture'
export type PlatformKey = 'coupang' | 'smartstore' | 'elevenst'
export type NaverTier = 'micro' | 'small1' | 'small2' | 'small3' | 'general'
export type NaverInflow = 'normal' | 'marketing'

// ─────────────────────────────────────────────────────────────────────────────
// 요율 (확인일 2026-10-05)
//
// [네이버 스마트스토어] 카테고리 무관. 수수료 = 주문관리 수수료 + 판매수수료, 둘 다 부가세 10% 별도.
//  · 주문관리(네이버페이) 수수료: 연 매출 구간(여신금융협회 영세·중소 기준)별, 결제수단 무관(2021.7.31~),
//    배송비 포함 결제금액에 부과. 2025.10.1 결제완료건부터 영세 -0.03%p, 중소 -0.02%p.
//    - https://www.navercorp.com/media/pressReleasesDetail?seq=33382 (2025.9.30 보도자료: 스마트스토어·주문형 영세 -0.03%p, 중소 -0.02%p)
//    - https://navercorp.com/media/pressReleasesDetail?seq=30686 (2022.1.26: 영세 주문관리 2.0% → 1.8%)
//    - https://view.asiae.co.kr/article/2021070210030690509 (2021.7.31: 결제수단별 요율 폐지, 매출 구간 단일화)
//    - 구간별 수치(1.77/2.33/2.48/2.73/3.30)는 판매자센터 공지 캡처를 옮긴 2차 자료로 대조:
//      https://glasswallet.com/calculate/smartstore-fee/business-tier-rates (스마트스토어센터는 로그인·SPA라 직접 조회 불가)
//  · 판매수수료(2025.6.2 신설, 유입수수료 폐지): 일반 2.73%, 판매자 마케팅 링크 유입 0.91% (브랜드스토어 3.64/1.82%는 미반영).
//    판매가 기준, 배송비 제외(옛 유입수수료와 같은 기준 — 2차 자료).
//    - https://byline.network/2025/03/04_naver (네이버 발표 보도: 2.73%·0.91%, 부가세 별도, 2025.6.2 시행)
//
// [쿠팡 마켓플레이스] 대분류 기본 수수료(소분류 예외 있음). 고객 최종 결제가(할인 후) 기준.
//    - https://cloud.mkt.coupang.com/Fee-Table (쿠팡 공식 "카테고리별 판매 수수료", 표 기준일 2019.11.25,
//      2026-10 현재 로켓그로스 요금 페이지 https://marketplace.coupang.com/rocket-growth/en-us/fee-page 에서 링크)
//    - https://marketplace.coupang.com/information-center/almyeon-alsurog-deo-joheun-kupang-susuryo-2 (4~10.9%,
//      월 매출(배송비 제외) 100만원 이상 시 서비스 이용료 월 55,000원 VAT 포함)
//  · 판매수수료 부가세 별도, 배송비 수수료 3%(+부가세): 쿠팡 공식 문서엔 명시 없음 — 판매자 정산 예시 2차 자료 기준.
//
// [11번가] 카테고리별 요율표는 셀러오피스 로그인 후에만 공개 → 카테고리별 값 미검증.
//    11번가가 밝힌 명목 수수료 범위 7~13%(2024.1, 20% 3개 카테고리는 2025.4.1 13%로 인하).
//    - https://mobile.newsis.com/view/NISX20240116_0002593587 (11번가 입장: 180개 카테고리 평균 7~13%)
//    - https://www.news1.kr/industry/distribution/5735328 (2025.4 85개 카테고리 인하)
//    기본값 13%는 범위 상단의 '대표값'(사용자가 입력해 바꿈). 입력 요율은 부가세 포함으로 보고 그대로 적용.
//    선결제 배송비 수수료 3.3%(부가세 포함) — 2차 자료(https://www.windly.cc/blog/11st-onboarding-fee-settlement-guide).
// ─────────────────────────────────────────────────────────────────────────────

export const NAVER_ORDER_MGMT: Record<NaverTier, number> = { micro: 1.77, small1: 2.33, small2: 2.48, small3: 2.73, general: 3.3 }
export const NAVER_SALES: Record<NaverInflow, number> = { normal: 2.73, marketing: 0.91 }

export const COUPANG_SALES: Record<CategoryKey, number> = {
  fashion: 10.5,     // 패션 > 패션의류
  fashionAcc: 10.5,  // 패션 > 패션잡화
  beauty: 9.6,
  food: 10.6,        // 면/라면 10.9, 쌀/잡곡 5.8 등 예외
  living: 7.8,       // 생활용품 기본 — 청소·수납·공구 등 다수 소분류 10.8
  electronics: 7.8,  // 가전디지털 기본 — TV·냉장고·세탁기·에어컨 5.8, 컴퓨터·태블릿 5, 모니터 4.5
  sports: 10.8,
  books: 10.8,
  baby: 10,          // 출산/유아 — 분유·기저귀 6.4, 영유아식품 7.8
  furniture: 10.8,
}
export const COUPANG_SHIPPING = 3       // 배송비 × 3% (+부가세)
export const ELEVENST_DEFAULT = 13      // 대표값(공개 범위 7~13% 상단)
export const ELEVENST_SHIPPING = 3.3    // 부가세 포함
export const VAT_RATE = 0.1

export const CATEGORY_KEYS = Object.keys(COUPANG_SALES) as CategoryKey[]
export const PLATFORM_KEYS: PlatformKey[] = ['coupang', 'smartstore', 'elevenst']
export const NAVER_TIERS = Object.keys(NAVER_ORDER_MGMT) as NaverTier[]

export interface MarketInput {
  price: number          // 판매가(고객 결제가, 할인 후)
  shipping: number       // 고객이 낸 배송비
  category: CategoryKey  // 쿠팡에만 영향
  tier: NaverTier
  inflow: NaverInflow
  elevenstRate: number
}
export interface FeeLine { key: 'sales' | 'orderMgmt' | 'shipping'; rate: number; base: number; amount: number }
export interface FeeResult { platform: PlatformKey; lines: FeeLine[]; vat: number; total: number; settlement: number; effRate: number }

const line = (key: FeeLine['key'], rate: number, base: number): FeeLine =>
  ({ key, rate, base, amount: Math.round((base * rate) / 100) })

export function marketFees(platform: PlatformKey, i: MarketInput): FeeResult {
  const price = Math.max(0, i.price), shipping = Math.max(0, i.shipping)
  let lines: FeeLine[]
  let vatApplies = true
  if (platform === 'coupang') {
    lines = [line('sales', COUPANG_SALES[i.category], price), line('shipping', COUPANG_SHIPPING, shipping)]
  } else if (platform === 'smartstore') {
    lines = [line('orderMgmt', NAVER_ORDER_MGMT[i.tier], price + shipping), line('sales', NAVER_SALES[i.inflow], price)]
  } else {
    lines = [line('sales', i.elevenstRate, price), line('shipping', ELEVENST_SHIPPING, shipping)]
    vatApplies = false
  }
  const sum = lines.reduce((s, l) => s + l.amount, 0)
  const vat = vatApplies ? Math.round(sum * VAT_RATE) : 0
  const total = sum + vat
  const paid = price + shipping
  return { platform, lines, vat, total, settlement: paid - total, effRate: paid > 0 ? (total / paid) * 100 : 0 }
}
