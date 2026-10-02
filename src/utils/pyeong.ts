// 평수 계산 순수 로직. 1평 = 6척 × 6척 = (10/33 m × 6)² = 400/121 ㎡
export const M2_PER_PYEONG = 400 / 121
export const FT2_PER_M2 = 1 / 0.09290304

export const toPyeong = (m2: number) => m2 / M2_PER_PYEONG
export const toM2 = (pyeong: number) => pyeong * M2_PER_PYEONG

/** "1,234.5" → 1234.5, 음수·비숫자 → 0 */
export function parseNum(s: string): number {
  const n = parseFloat(s.replace(/,/g, ''))
  return Number.isFinite(n) && n > 0 ? n : 0
}

export type AreaType = 'exclusive' | 'supply'

/** 전용률(0~1)로 전용 ↔ 공급 환산. 입력 면적이 어느 쪽인지(type) 받아 둘 다 반환 */
export function splitArea(m2: number, type: AreaType, ratio: number) {
  if (!(ratio > 0)) return { exclusive: m2, supply: m2 }
  return type === 'exclusive'
    ? { exclusive: m2, supply: m2 / ratio }
    : { exclusive: m2 * ratio, supply: m2 }
}

// 아파트 전용률 통상 범위(추정). 단지·타입마다 다름 — 표시값은 대략치
export const TYPICAL_RATIO_MIN = 0.72
export const TYPICAL_RATIO_MAX = 0.77
export const POPULAR_EXCLUSIVE_M2 = [39, 49, 59, 74, 84, 101, 114]

export function popularSizes(sizes = POPULAR_EXCLUSIVE_M2) {
  return sizes.map((m2) => {
    const supplyMin = m2 / TYPICAL_RATIO_MAX
    const supplyMax = m2 / TYPICAL_RATIO_MIN
    return {
      exclusive: m2,
      exclusivePyeong: toPyeong(m2),
      supplyMin,
      supplyMax,
      typeMin: Math.round(toPyeong(supplyMin)),
      typeMax: Math.round(toPyeong(supplyMax)),
    }
  })
}

/** 가격 ÷ 평. 면적 0이면 0 */
export const perPyeong = (price: number, m2: number) => (m2 > 0 ? price / toPyeong(m2) : 0)

/** 평당가 → ㎡당가 (같은 금액 단위). 평당가 ÷ (1평의 ㎡) */
export const perM2FromPerPyeong = (p: number) => p / M2_PER_PYEONG
/** ㎡당가 → 평당가 */
export const perPyeongFromPerM2 = (p: number) => p * M2_PER_PYEONG

/** 면적 감 잡기: 정사각형 한 변, 가로:세로 4:3 직사각형의 두 변 (m) */
export function roomSides(m2: number) {
  const s = Math.sqrt(Math.max(m2, 0))
  return { square: s, long: s * Math.sqrt(4 / 3), short: s * Math.sqrt(3 / 4) }
}

/**
 * 면적 구성. 공급 = 전용 + 주거공용, 계약 = 공급 + 기타공용(주차장·관리동 등),
 * 서비스면적(발코니)은 어디에도 포함되지 않음 — 확장 시 실사용 ≈ 전용 + 서비스.
 */
export function areaBreakdown(exclusive: number, supply: number, otherCommon: number, service: number) {
  return {
    exclusive,
    residentialCommon: Math.max(supply - exclusive, 0),
    supply,
    contract: supply + otherCommon,
    usable: exclusive + service,
  }
}
