// 택배·소포 요금 데이터와 요금 단계 선택 (순수 로직). 회귀 체크: node scripts/check-shipping.ts

export type DestinationType = 'mainland' | 'jeju' | 'island'
export type CarrierCategoryType = 'standard' | 'cvs'

export interface PriceTier {
  maxWeight: number
  maxSize?: number // 이 단계의 세 변 합 한도(cm). 없으면 무게만으로 단계 결정
  price: number
  jejuPrice?: number
  islandPrice?: number
}

export interface CarrierData {
  id: string
  name: string
  serviceLabel: string
  category: CarrierCategoryType
  tiers: PriceTier[]
  maxWeight: number
  maxGirth: number
  cvsPickupOnly: boolean
  jejuAvailable: boolean
  islandAvailable: boolean
  deliveryDays: string
  note?: string
}

// 요금 기준일 · 출처 (개인 발송 기준, 2026-09-30 확인 · 2026-10-04 우체국 요금표·롯데·로젠·CJ 규격 단계 재확인)
export const RATE_BASIS = '2026.09'
export const RATE_SOURCES: { label: string; url: string }[] = [
  { label: '우정사업본부 소포요금', url: 'https://koreapost.go.kr/kpost/subIndex/201.do' },
  { label: '우체국 방문접수 요금', url: 'https://parcel.epost.go.kr/parcel/use_guide/charge_1.jsp' },
  { label: '롯데택배 요금안내', url: 'https://www.lotteglogis.com/mobile/reservation/feeinfo/write' },
  { label: '로젠택배 요금안내', url: 'https://www.ilogen.com/web/personal/chargeInfo' },
  { label: 'CJ대한통운 배송운임', url: 'https://www.cjlogistics.com/ko/utility/parcel-price' },
  { label: 'GS25 중량별 운임', url: 'https://www.cvsnet.co.kr/service/national-delivery/use/contentsid/205/index.do' },
  { label: 'GS25 반값택배', url: 'https://www.cvsnet.co.kr/service/slow-delivery/use/contentsid/274/index.do' },
  { label: 'CU 반값택배 (ZDNet 2026.02)', url: 'https://zdnet.co.kr/view/?no=20260209092755' },
  { label: '세븐일레븐 착한택배 (헤럴드경제 2026.04)', url: 'https://www.heraldk.com/article/2026040717030145483' },
]

export const CARRIER_DATA: CarrierData[] = [
  // ── 일반 택배사 ── (타권역 개인 요금. 동일권역은 보통 1,000원 저렴)
  {
    // 구간(극소 2kg/80cm·소 5kg/100cm·중 10kg/120cm·대 15kg/140cm·특대 20kg/160cm, 최대 25kg)은 공식 운임검색·예약 페이지로 확인
    // 미검증: 공식 페이지가 금액을 폼 제출 후에만 보여 줘 2026 금액 확인 못함(2025.4 기업택배만 인상, 개인요금 동결 보도)
    id: 'cj',
    name: 'CJ대한통운',
    serviceLabel: '방문접수',
    category: 'standard',
    tiers: [
      { maxWeight: 2,  maxSize: 80, price: 5000, jejuPrice: 8000,  islandPrice: 9000  },
      { maxWeight: 5,  maxSize: 100, price: 6000, jejuPrice: 9000,  islandPrice: 10000 },
      { maxWeight: 10, maxSize: 120, price: 7000, jejuPrice: 10000, islandPrice: 11000 },
      { maxWeight: 15, maxSize: 140, price: 8000, jejuPrice: 11000, islandPrice: 12000 },
      { maxWeight: 20, maxSize: 160, price: 9000, jejuPrice: 12000, islandPrice: 13000 },
      { maxWeight: 25, maxSize: 160, price: 10000, jejuPrice: 13000, islandPrice: 14000 },
    ],
    maxWeight: 25, maxGirth: 160, cvsPickupOnly: false,
    jejuAvailable: true, islandAvailable: true, deliveryDays: '익일',
  },
  {
    // 미검증: 공식 요금 페이지 접근 불가. 소형(5kg)·중형(15kg) 동일가 구조는 2021.5 보도(초소형 3kg / 소형·중형 동일 / 대형)와 일치해 유지
    id: 'hanjin',
    name: '한진택배',
    serviceLabel: '방문접수',
    category: 'standard',
    tiers: [
      { maxWeight: 3,  price: 6000, jejuPrice: 8000,  islandPrice: 11000 },
      { maxWeight: 5,  price: 7000, jejuPrice: 9000,  islandPrice: 12000 },
      { maxWeight: 15, price: 7000, jejuPrice: 9000,  islandPrice: 12000 },
      { maxWeight: 20, price: 8000, jejuPrice: 10000, islandPrice: 13000 },
    ],
    maxWeight: 20, maxGirth: 160, cvsPickupOnly: false,
    jejuAvailable: true, islandAvailable: true, deliveryDays: '익일',
  },
  {
    // 검증: 롯데택배 요금안내 — 타권역 소(5kg/110cm) 6,000 / 중(15kg/130cm) 7,000 / 대(20kg/160cm) 8,000, 제주권 8,000/9,000/10,000
    // 미검증: 도서산간 요금(공식 표에 없음, 기존 값 유지)
    id: 'lotte',
    name: '롯데택배',
    serviceLabel: '방문접수',
    category: 'standard',
    tiers: [
      { maxWeight: 5,  maxSize: 110, price: 6000, jejuPrice: 8000,  islandPrice: 10000 },
      { maxWeight: 15, maxSize: 130, price: 7000, jejuPrice: 9000,  islandPrice: 11000 },
      { maxWeight: 20, maxSize: 160, price: 8000, jejuPrice: 10000, islandPrice: 12000 },
    ],
    maxWeight: 20, maxGirth: 160, cvsPickupOnly: false,
    jejuAvailable: true, islandAvailable: true, deliveryDays: '익일',
  },
  {
    // 검증: 로젠 요금안내 — 기본(동일권) 6,000/7,000/9,000/12,000 + 타권역 1,000원
    // 미검증: 제주 추가요금 금액 미공개(5kg 제주 9,500원은 기존 값 유지), 도서산간은 지역별 별도
    id: 'logen',
    name: '로젠택배',
    serviceLabel: '방문접수',
    category: 'standard',
    tiers: [
      { maxWeight: 5,  maxSize: 100, price: 7000, jejuPrice: 9500 },
      { maxWeight: 10, maxSize: 120, price: 8000 },
      { maxWeight: 20, maxSize: 140, price: 10000 },
      { maxWeight: 25, maxSize: 160, price: 13000 },
    ],
    maxWeight: 25, maxGirth: 160, cvsPickupOnly: false,
    jejuAvailable: true, islandAvailable: false, deliveryDays: '익일~2일',
    note: '제주 5kg 초과·도서산간 별도 문의',
  },
  {
    // 검증: 우체국 방문접수(2025.6.1 시행 요금, 2026.09 현행) — 5,000/8,000/10,000/14,000
    // 제주 익일 할증(7,500~)은 제주발(제주→육지)에만 적용, 육지→제주는 D+2 동일요금. 도서 할증 항목 없음(배달기간만 상이)
    id: 'post_visit',
    name: '우체국',
    serviceLabel: '방문접수',
    category: 'standard',
    tiers: [
      { maxWeight: 5,  maxSize: 80, price: 5000,  jejuPrice: 5000,  islandPrice: 5000  },
      { maxWeight: 10, maxSize: 100, price: 8000,  jejuPrice: 8000,  islandPrice: 8000  },
      { maxWeight: 20, maxSize: 120, price: 10000, jejuPrice: 10000, islandPrice: 10000 },
      { maxWeight: 30, maxSize: 160, price: 14000, jejuPrice: 14000, islandPrice: 14000 },
    ],
    maxWeight: 30, maxGirth: 160, cvsPickupOnly: false,
    jejuAvailable: true, islandAvailable: true, deliveryDays: '익일',
    note: '제주행 D+2 · 도서 배달기간 상이',
  },
  {
    // 검증: 우정사업본부 등기소포 창구 — 4,000~13,000 (육지→제주 D+2 동일요금, 도서 할증 없음)
    id: 'post_registered',
    name: '우체국 등기소포',
    serviceLabel: '창구접수',
    category: 'standard',
    tiers: [
      { maxWeight: 3,  maxSize: 80, price: 4000,  jejuPrice: 4000,  islandPrice: 4000  },
      { maxWeight: 5,  maxSize: 100, price: 4500,  jejuPrice: 4500,  islandPrice: 4500  },
      { maxWeight: 7,  maxSize: 100, price: 5000,  jejuPrice: 5000,  islandPrice: 5000  },
      { maxWeight: 10, maxSize: 120, price: 6000,  jejuPrice: 6000,  islandPrice: 6000  },
      { maxWeight: 15, maxSize: 120, price: 7000,  jejuPrice: 7000,  islandPrice: 7000  },
      { maxWeight: 20, maxSize: 120, price: 8000,  jejuPrice: 8000,  islandPrice: 8000  },
      { maxWeight: 25, maxSize: 120, price: 11000, jejuPrice: 11000, islandPrice: 11000 },
      { maxWeight: 30, maxSize: 160, price: 13000, jejuPrice: 13000, islandPrice: 13000 },
    ],
    maxWeight: 30, maxGirth: 160, cvsPickupOnly: false,
    jejuAvailable: true, islandAvailable: true, deliveryDays: '익일',
    note: '추적·배상 가능 · 제주행 D+2',
  },
  {
    // 검증: 우정사업본부 일반소포 D+3 — 2,700~11,700. 우체국은 권역 할증 없음(CUpost: "우체국은 동일권/타권/제주권 요금이 동일")
    id: 'post_regular',
    name: '우체국 일반소포',
    serviceLabel: '창구접수',
    category: 'standard',
    tiers: [
      { maxWeight: 3,  maxSize: 80, price: 2700,  jejuPrice: 2700,  islandPrice: 2700  },
      { maxWeight: 5,  maxSize: 100, price: 3200,  jejuPrice: 3200,  islandPrice: 3200  },
      { maxWeight: 7,  maxSize: 100, price: 3700,  jejuPrice: 3700,  islandPrice: 3700  },
      { maxWeight: 10, maxSize: 120, price: 4700,  jejuPrice: 4700,  islandPrice: 4700  },
      { maxWeight: 15, maxSize: 120, price: 5700,  jejuPrice: 5700,  islandPrice: 5700  },
      { maxWeight: 20, maxSize: 120, price: 6700,  jejuPrice: 6700,  islandPrice: 6700  },
      { maxWeight: 25, maxSize: 120, price: 9700,  jejuPrice: 9700,  islandPrice: 9700  },
      { maxWeight: 30, maxSize: 160, price: 11700, jejuPrice: 11700, islandPrice: 11700 },
    ],
    maxWeight: 30, maxGirth: 160, cvsPickupOnly: false,
    jejuAvailable: true, islandAvailable: true, deliveryDays: 'D+3',
    note: '최저가, 추적·배상 없음',
  },
  // ── 편의점 택배 ──
  {
    // 미검증: CUpost 요금표가 동적 로딩이라 금액 확인 못함(2026.1 내일보장택배만 100원 인상 보도). 기존 값 유지. 택배사는 롯데글로벌로지스·우체국 선택
    id: 'cu_standard',
    name: 'CU',
    serviceLabel: 'CU POST (일반)',
    category: 'cvs',
    tiers: [
      { maxWeight: 5,  price: 6200,  jejuPrice: 9200  },
      { maxWeight: 10, price: 8100,  jejuPrice: 10600 },
      { maxWeight: 20, price: 9800,  jejuPrice: 11800 },
    ],
    maxWeight: 20, maxGirth: 160, cvsPickupOnly: false,
    jejuAvailable: true, islandAvailable: false, deliveryDays: '익일',
    note: '롯데글로벌로지스·우체국 · 집 배달 가능',
  },
  {
    // 검증: ZDNet 2026.02.09 — 2월 200원 할인가 1,600/1,900/~2,500 → 정가 1,800/2,100/2,700. 2026.1 롯데글로벌로지스 이관, 익일 배송
    // 미검증: 제주·도서 노선 요금(CUpost 표 동적 로딩)
    id: 'cu_economy',
    name: 'CU',
    serviceLabel: '반값택배 (편의점→편의점)',
    category: 'cvs',
    tiers: [
      { maxWeight: 0.5, price: 1800 },
      { maxWeight: 1,   price: 2100 },
      { maxWeight: 5,   price: 2700 },
    ],
    maxWeight: 5, maxGirth: 80, cvsPickupOnly: true,
    jejuAvailable: false, islandAvailable: false, deliveryDays: '익일',
    note: '편의점 수령 전용',
  },
  {
    // 검증: GS25 중량별 운임(타권 기준, 제주권 별도, 도서지역 +4,000원)
    // 미검증: 최대 크기(160cm 기존 가정 유지)
    id: 'gs_standard',
    name: 'GS25',
    serviceLabel: '일반택배',
    category: 'cvs',
    tiers: [
      { maxWeight: 0.35, price: 3900,  jejuPrice: 6600,  islandPrice: 7900  },
      { maxWeight: 0.4,  price: 4100,  jejuPrice: 6800,  islandPrice: 8100  },
      { maxWeight: 0.45, price: 4200,  jejuPrice: 6900,  islandPrice: 8200  },
      { maxWeight: 0.5,  price: 4400,  jejuPrice: 7100,  islandPrice: 8400  },
      { maxWeight: 0.6,  price: 4600,  jejuPrice: 7600,  islandPrice: 8600  },
      { maxWeight: 0.7,  price: 4700,  jejuPrice: 7700,  islandPrice: 8700  },
      { maxWeight: 0.8,  price: 4800,  jejuPrice: 7800,  islandPrice: 8800  },
      { maxWeight: 0.9,  price: 4900,  jejuPrice: 7900,  islandPrice: 8900  },
      { maxWeight: 1,    price: 5000,  jejuPrice: 8000,  islandPrice: 9000  },
      { maxWeight: 1.5,  price: 5300,  jejuPrice: 8300,  islandPrice: 9300  },
      { maxWeight: 2,    price: 5600,  jejuPrice: 8600,  islandPrice: 9600  },
      { maxWeight: 3,    price: 5900,  jejuPrice: 8900,  islandPrice: 9900  },
      { maxWeight: 4,    price: 6000,  jejuPrice: 9000,  islandPrice: 10000 },
      { maxWeight: 5,    price: 6200,  jejuPrice: 9200,  islandPrice: 10200 },
      { maxWeight: 7,    price: 7700,  jejuPrice: 10700, islandPrice: 11700 },
      { maxWeight: 10,   price: 8200,  jejuPrice: 10700, islandPrice: 12200 },
      { maxWeight: 15,   price: 9000,  jejuPrice: 12000, islandPrice: 13000 },
      { maxWeight: 20,   price: 10000, jejuPrice: 12000, islandPrice: 14000 },
    ],
    maxWeight: 20, maxGirth: 160, cvsPickupOnly: false,
    jejuAvailable: true, islandAvailable: true, deliveryDays: '익일',
    note: '집 배달 가능 · 동일권 500원~ 저렴',
  },
  {
    // 검증: GS25 반값택배 — 내륙 1,900/2,300/2,700, 제주↔내륙·내륙→도서 3,600/4,000/4,400, 5kg·80cm 이하
    id: 'gs_halfprice',
    name: 'GS25',
    serviceLabel: '반값택배 (편의점→편의점)',
    category: 'cvs',
    tiers: [
      { maxWeight: 0.5, price: 1900, jejuPrice: 3600, islandPrice: 3600 },
      { maxWeight: 1,   price: 2300, jejuPrice: 4000, islandPrice: 4000 },
      { maxWeight: 5,   price: 2700, jejuPrice: 4400, islandPrice: 4400 },
    ],
    maxWeight: 5, maxGirth: 80, cvsPickupOnly: true,
    jejuAvailable: true, islandAvailable: true, deliveryDays: '4일 이내',
    note: '편의점 수령 전용 · 제주 5~7일',
  },
  {
    // 검증: 착한택배 전국 균일 1,980원(바이라인 2025.03), 2026.04 인상 대상 제외(헤럴드경제). 점포 간 배송
    // 미검증: 20kg·160cm 한도(검색 요약으로만 확인, 기존 25kg에서 하향), 제주 노선(2026.2 확대 보도) 요금
    id: 'seven',
    name: '세븐일레븐',
    serviceLabel: '착한택배 (편의점→편의점)',
    category: 'cvs',
    tiers: [
      { maxWeight: 20, price: 1980 },
    ],
    maxWeight: 20, maxGirth: 160, cvsPickupOnly: true,
    jejuAvailable: false, islandAvailable: false, deliveryDays: '2~3일',
    note: '전국 균일가 · 편의점 수령 전용',
  },
]

// 국내 택배·소포는 부피무게가 아니라 무게 단계와 크기(세 변 합) 단계 중 높은 단계 요금을 받는다.
// 출처: 우정사업본부 국내소포 요금표 "중량 단계와 크기 단계가 상이한 경우 높은 단계를 기준", CJ대한통운 "크기와 중량 중 큰 값을 기준"
export function findTier(carrier: CarrierData, weight: number, girth: number): PriceTier | undefined {
  if (weight > carrier.maxWeight || girth > carrier.maxGirth) return undefined
  return carrier.tiers.find(t => weight <= t.maxWeight && girth <= (t.maxSize ?? carrier.maxGirth))
}

export function getCarrierPrice(
  carrier: CarrierData,
  weight: number,
  girth: number,
  dest: DestinationType,
): number | null {
  if (dest === 'jeju' && !carrier.jejuAvailable) return null
  if (dest === 'island' && !carrier.islandAvailable) return null
  const tier = findTier(carrier, weight, girth)
  if (!tier) return null
  if (dest === 'jeju') return tier.jejuPrice ?? null
  if (dest === 'island') return tier.islandPrice ?? null
  return tier.price
}

/** 크기 단계 때문에 비싸진 경우: 세 변 합을 cut cm 줄이면 한 단계 아래 요금(price)으로 saving원 절약. 무게는 그대로 */
export function sizeCutSaving(
  carrier: CarrierData,
  weight: number,
  girth: number,
  dest: DestinationType,
): { cut: number; price: number; saving: number } | null {
  const now = getCarrierPrice(carrier, weight, girth, dest)
  if (now === null) return null
  const sizes = [...new Set(carrier.tiers.map(t => t.maxSize ?? carrier.maxGirth))].filter(s => s < girth).sort((a, b) => b - a)
  for (const s of sizes) {
    const p = getCarrierPrice(carrier, weight, s, dest)
    if (p !== null && p < now) return { cut: Math.round((girth - s) * 10) / 10, price: p, saving: now - p }
  }
  return null
}

export function getUnavailableReason(
  carrier: CarrierData,
  weight: number,
  girth: number,
  dest: DestinationType,
): string {
  if (weight > carrier.maxWeight) return `최대 ${carrier.maxWeight}kg 초과`
  if (girth > carrier.maxGirth) return `세변합 ${carrier.maxGirth}cm 초과`
  if (dest === 'jeju' && !carrier.jejuAvailable) return '제주 배송불가'
  if (dest === 'island' && !carrier.islandAvailable) return '도서산간 배송불가'
  const tier = findTier(carrier, weight, girth)
  if (!tier) return '중량 초과'
  if (dest === 'jeju' && !tier.jejuPrice) return '제주 요금 미제공'
  if (dest === 'island' && !tier.islandPrice) return '도서산간 요금 미제공'
  return '배송 불가'
}
