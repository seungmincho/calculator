// 기준 중위소득 (월/원) [1인 … 6인]. 회귀 체크: node scripts/check-median-income.ts
// 출처: 보건복지부 고시 「기준 중위소득, 생계급여ㆍ의료급여의 수급자 선정기준 및 최저보장수준」
//   2026년 = 제2025-135호(2025.8.1 발령), 2027년 = 제2026-157호(2026.7.29 발령, 2027.1.1 시행)
// 매년 7월 말 중앙생활보장위원회 의결 → 8월 초 고시. 새 연도는 여기에 한 줄 추가.
export const MEDIAN_INCOME: Record<string, number[]> = {
  '2023': [2077892, 3456155, 4434816, 5400964, 6330688, 7227981],
  '2024': [2228445, 3682609, 4714657, 5729913, 6695735, 7618369],
  '2025': [2392013, 3932658, 5025353, 6097773, 7108192, 8064805],
  '2026': [2564238, 4199292, 5359036, 6494738, 7556719, 8555952],
  '2027': [2736042, 4480645, 5718091, 6929885, 8063019, 9129201],
}

export const MEDIAN_YEARS = Object.keys(MEDIAN_INCOME).sort().reverse()

/** 지금 적용 중인 연도 (기준 중위소득은 1월 1일 시행). 미래 연도 고시는 미리 들어 있어도 건너뜀 */
export function yearInForce(now: Date = new Date()): string {
  const y = now.getFullYear()
  return MEDIAN_YEARS.find((k) => Number(k) <= y) ?? MEDIAN_YEARS[MEDIAN_YEARS.length - 1]
}
