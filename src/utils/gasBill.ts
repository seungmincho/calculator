// 도시가스 주택용 요금 계산 (순수 함수). 요금 = 기본요금 + 사용열량(MJ)×단가, 부가세 10% 별도.
// 주택용은 취사·난방 단가가 같고 계절 차등이 없다(한국가스공사 도매요금 기준, 2026-10-01).

export type RegionKey = 'seoul' | 'gyeonggi' | 'daegu' | 'other' | 'custom'
export type Insulation = 'good' | 'average' | 'poor'

export interface RegionRate {
  unit: number // 원/MJ, 부가세 별도 (도매+소매 소비자요금)
  basic: number // 원/월
  verified: boolean
  since?: string // 적용일
  source?: string
  url?: string
}

/** 전국 동일 주택용 도매요금 (한국가스공사, 2026-10-01 기준) */
export const WHOLESALE_UNIT = 20.8495

export const REGION_RATES: Record<Exclude<RegionKey, 'custom'>, RegionRate> = {
  seoul: { unit: 22.5268, basic: 1250, verified: true, since: '2026-09-01', source: '서울시 물가정보 · 공공요금(도시가스)', url: 'https://sftc.seoul.go.kr/seoul/mulga/main/contents.do?menuNo=200012' },
  gyeonggi: { unit: 22.6226, basic: 1250, verified: true, since: '2026-10-01', source: '코원에너지서비스 요금안내(경기 공급권역)', url: 'https://www.skens.com/koone/rate/guide.do?regionSeq=275' },
  daegu: { unit: 23.3459, basic: 900, verified: true, since: '2026-08-01', source: '대구시 소매요금 조정(세계일보 2026-07-30 보도)', url: 'https://www.segye.com/newsView/20260730517199' },
  // ponytail: 기타 지역은 도매요금 + 평균 소매공급비용(약 2.3원) 추정. 지역별 확인되면 항목 추가.
  other: { unit: 23.15, basic: 1000, verified: false },
}

export const VAT = 0.1
/** m³ → MJ 환산 (고지서: 사용량 × 보정계수 × 단위열량, 대략 42~43.5). 추정값. */
export const MJ_PER_M3 = 43

export const toMJ = (value: number, unit: 'mj' | 'm3') => (unit === 'm3' ? value * MJ_PER_M3 : value)

export interface Bill { mj: number; basic: number; usageCharge: number; subtotal: number; vat: number; total: number }

export function calcBill(mj: number, rate: { unit: number; basic: number }): Bill {
  const m = Math.max(0, mj || 0)
  const usageCharge = Math.floor(m * rate.unit)
  const subtotal = rate.basic + usageCharge
  const vat = Math.floor(subtotal * VAT)
  return { mj: m, basic: rate.basic, usageCharge, subtotal, vat, total: subtotal + vat }
}

// ── 사용량 추정 모델 (추정치; 30평·보통 단열·하루 8시간·22℃ 1월 ≈ 6,300MJ ≈ 15~16만원에 맞춤) ──
/** 월별 난방 부하 비율 (1월=1). 서울 난방도일 대략 비례 */
export const HEAT_FACTOR = [1, 0.85, 0.55, 0.2, 0, 0, 0, 0, 0, 0.15, 0.5, 0.9]
/** MJ / 평 / 가동시간 (22℃ 설정, 1월) */
export const K_INSULATION: Record<Insulation, number> = { good: 0.5, average: 0.7, poor: 1.0 }
/** 설정온도 1℃당 난방에너지 변화율 (흔히 인용되는 약 7%) */
export const PER_DEGREE = 0.07
/** 온수·취사 기본 사용량 (3~4인, 추정). 겨울엔 급수 온도가 낮아 증가 */
export const hotWaterMJ = (month: number) => Math.round(800 + 500 * HEAT_FACTOR[month - 1])

export interface EstimateInput { pyeong: number; insulation: Insulation; hours: number; temp: number; month: number }

export function heatingMJ({ pyeong, insulation, hours, temp, month }: EstimateInput): number {
  const f = HEAT_FACTOR[month - 1] ?? 0
  const tempFactor = Math.max(0, 1 + PER_DEGREE * (temp - 22))
  return Math.round(Math.max(0, pyeong) * Math.max(0, Math.min(24, hours)) * 30 * K_INSULATION[insulation] * f * tempFactor)
}

export const estimateMJ = (i: EstimateInput) => heatingMJ(i) + hotWaterMJ(i.month)

/** 12개월 사용량. 실제 사용량(anchorMJ)이 있으면 해당 월에 맞춰 모델 곡선을 비례 조정 */
export function yearlyMJ(i: EstimateInput, anchorMJ?: number): number[] {
  const months = Array.from({ length: 12 }, (_, k) => estimateMJ({ ...i, month: k + 1 }))
  if (anchorMJ == null) return months
  const base = months[i.month - 1]
  const scale = base > 0 ? anchorMJ / base : 0
  return months.map((m) => Math.round(m * scale))
}

/** 변화율(%). 이전 값이 없으면 null */
export const pctChange = (now: number, before: number) => (before > 0 ? ((now - before) / before) * 100 : null)

const withVat = (mj: number, unit: number) => Math.round(mj * unit * (1 + VAT))

/** 절약 시나리오 (원/월, 부가세 포함). scale = 실제 사용량 보정 비율(없으면 1) */
export function savings(i: EstimateInput, unit: number, scale = 1) {
  const heat = heatingMJ(i)
  return {
    tempDown1: withVat((heat - heatingMJ({ ...i, temp: i.temp - 1 })) * scale, unit),
    hourDown1: withVat((heat - heatingMJ({ ...i, hours: Math.max(0, i.hours - 1) })) * scale, unit),
    water10: withVat(hotWaterMJ(i.month) * 0.1 * scale, unit),
  }
}
