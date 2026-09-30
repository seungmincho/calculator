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
