// 내신 석차등급 순수 로직. 회귀 체크: node scripts/check-grade-rank.ts
//
// 근거
// - 5등급 상대평가(2025학년도 고1 입학생부터): 1등급 10% / 2등급 누적 34% / 3등급 66% / 4등급 90% / 5등급 100%
//   교육부 「2028 대학입시제도 개편 확정안」(2023-12-27)
//   https://files-scs.pstatic.net/2024/07/02/Ic4S8r8egU/[교육부+12-27(수)+브리핑시(11시)+보도자료]+(별첨)+미래+사회를+대비하는+2028+대학입시제도+개편+확정안.pdf
//   https://m.seoul.co.kr/news/2023/10/11/20231011002006
//   (사회·과학 융합선택 9과목은 석차등급 없이 성취도만 기재: https://dhnews.co.kr/news/view/1065593562751098)
// - 9등급(2024학년도 이전 입학생): 누적 4/11/23/40/60/77/89/96/100%
// - 동석차: 중간석차 = 석차 + (동석차수 - 1) / 2, 중간석차 백분율 = 중간석차 / 수강자수 × 100 으로 등급 부여
//   (예: 96명 중 1등 동점 7명 → 중간석차 4, 4.17% → 9등급제 2등급)
//   https://www.sangji.ac.kr/thumbnail/editor/files/000004/20221110125935101_GSOLHZMI.pdf

export type GradeSystem = 5 | 9

export const CUMULATIVE: Record<GradeSystem, readonly number[]> = {
  5: [10, 34, 66, 90, 100],
  9: [4, 11, 23, 40, 60, 77, 89, 96, 100],
}

/** 입학년도 → 적용 등급제 (2025년 이후 입학 = 5등급제) */
export const systemForYear = (entryYear: number): GradeSystem => (entryYear >= 2025 ? 5 : 9)

export interface RankResult {
  grade: number
  midRank: number
  topPercent: number // 중간석차 백분율 (상위 %)
}

/** 입력이 올바르지 않으면 null. ties = 동석차수(본인 포함, 없으면 1) */
export function gradeOf(rank: number, ties: number, total: number, system: GradeSystem): RankResult | null {
  if (![rank, ties, total].every(Number.isInteger) || rank < 1 || ties < 1 || total < 1) return null
  if (rank + ties - 1 > total) return null
  const midRank = rank + (ties - 1) / 2
  const cuts = CUMULATIVE[system]
  // 부동소수 오차 없이 비교: mid/total*100 <= cut  ⇔  mid*100 <= cut*total (mid는 0.5 단위라 정확)
  const idx = cuts.findIndex((c) => midRank * 100 <= c * total)
  return { grade: idx + 1, midRank, topPercent: (midRank / total) * 100 }
}

export interface Boundary {
  grade: number
  cumulative: number
  from: number // 이 등급의 첫 석차 (count=0이면 의미 없음)
  to: number // 이 등급의 마지막 석차 (동석차 없을 때)
  count: number
}

/** 수강자수 기준 등급별 석차 구간 (동석차 없을 때) */
export function boundaries(total: number, system: GradeSystem): Boundary[] {
  let prev = 0
  return CUMULATIVE[system].map((c, i) => {
    const to = Math.floor((c * total) / 100)
    const b = { grade: i + 1, cumulative: c, from: prev + 1, to, count: to - prev }
    prev = to
    return b
  })
}

/** 단위수(학점) 가중 평균 등급. 유효 행이 없으면 null */
export function weightedAverage(rows: { units: number; grade: number }[]): number | null {
  const valid = rows.filter((r) => r.units > 0 && r.grade > 0)
  const sum = valid.reduce((s, r) => s + r.units, 0)
  return sum ? valid.reduce((s, r) => s + r.units * r.grade, 0) / sum : null
}
