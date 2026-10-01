// 수능 원점수 → 등급/표준점수/백분위 추정. 순수 로직 (scripts/check-csat-grade.ts로 회귀 체크).
//
// 상대평가 등급컷(국어·수학·탐구)은 2025학년도 수능 기준 참고치이며 공식 원점수 컷이 아니다
// (평가원은 표준점수 컷만 발표, 원점수 컷은 입시기관 추정). 매년 달라지므로 화면에 '추정'으로 표기.
// 영어(100점, 10점 단위)·한국사(50점, 5점 단위)는 절대평가라 고정 규칙.

/** 2027학년도 수능 시행일. ponytail: 매년 갱신 (평가원 시행기본계획 공고 기준) */
export const CSAT_EXAM_DATE = '2026-11-19'
export const CSAT_YEAR = 2027
/** 상대평가 등급컷 데이터의 학년도 */
export const CUT_YEAR = 2025

export type CutKey = 'korean' | 'mathCalc' | 'mathProb' | 'english' | 'koreanHistory' | 'socialStudies' | 'science'

export interface Cut {
  grade: number
  raw: number
  std?: number | null
  pct?: number | null
}

export interface CutTable {
  max: number
  absolute: boolean
  cuts: Cut[] // 1등급 → 9등급 (raw 내림차순)
}

const absCuts = (step: number, first: number): Cut[] =>
  Array.from({ length: 9 }, (_, i) => ({ grade: i + 1, raw: i === 8 ? 0 : first - step * i }))

export const CUTS: Record<CutKey, CutTable> = {
  // 2025학년도 수능 기준 추정치 (기존 데이터 유지)
  korean: {
    max: 100, absolute: false,
    cuts: [
      { grade: 1, raw: 92, std: 131, pct: 96 },
      { grade: 2, raw: 85, std: 124, pct: 89 },
      { grade: 3, raw: 77, std: 116, pct: 77 },
      { grade: 4, raw: 68, std: 107, pct: 60 },
      { grade: 5, raw: 58, std: 97, pct: 40 },
      { grade: 6, raw: 47, std: 86, pct: 23 },
      { grade: 7, raw: 36, std: 75, pct: 11 },
      { grade: 8, raw: 27, std: 66, pct: 4 },
      { grade: 9, raw: 0, std: null, pct: 0 },
    ],
  },
  mathCalc: {
    max: 100, absolute: false,
    cuts: [
      { grade: 1, raw: 92, std: 135, pct: 96 },
      { grade: 2, raw: 85, std: 131, pct: 90 },
      { grade: 3, raw: 76, std: 123, pct: 77 },
      { grade: 4, raw: 64, std: 112, pct: 60 },
      { grade: 5, raw: 48, std: 96, pct: 40 },
      { grade: 6, raw: 32, std: 80, pct: 23 },
      { grade: 7, raw: 20, std: 68, pct: 11 },
      { grade: 8, raw: 12, std: 60, pct: 4 },
      { grade: 9, raw: 0, std: null, pct: 0 },
    ],
  },
  mathProb: {
    max: 100, absolute: false,
    cuts: [
      { grade: 1, raw: 88, std: 130, pct: 95 },
      { grade: 2, raw: 80, std: 124, pct: 88 },
      { grade: 3, raw: 68, std: 114, pct: 76 },
      { grade: 4, raw: 52, std: 100, pct: 58 },
      { grade: 5, raw: 36, std: 86, pct: 39 },
      { grade: 6, raw: 24, std: 74, pct: 22 },
      { grade: 7, raw: 16, std: 66, pct: 10 },
      { grade: 8, raw: 8, std: 58, pct: 4 },
      { grade: 9, raw: 0, std: null, pct: 0 },
    ],
  },
  english: { max: 100, absolute: true, cuts: absCuts(10, 90) },
  koreanHistory: { max: 50, absolute: true, cuts: absCuts(5, 40) },
  // 탐구는 과목별 편차가 큼 — 사탐/과탐 평균적 추정치 (기존 데이터 유지)
  socialStudies: {
    max: 50, absolute: false,
    cuts: [47, 44, 40, 35, 29, 23, 17, 11, 0].map((raw, i) => ({ grade: i + 1, raw })),
  },
  science: {
    max: 50, absolute: false,
    cuts: [46, 42, 38, 33, 27, 21, 15, 9, 0].map((raw, i) => ({ grade: i + 1, raw })),
  },
}

/** 상대평가 등급별 누적 비율 상한(%) — 1등급 상위 4%, 2등급 11% … (평가원 9등급 기준) */
export const TOP_PCT = [4, 11, 23, 40, 60, 77, 89, 96, 100]

export const clampScore = (key: CutKey, v: number) =>
  Math.min(CUTS[key].max, Math.max(0, Math.round(Number.isFinite(v) ? v : 0)))

export function gradeOf(key: CutKey, score: number): number {
  for (const c of CUTS[key].cuts) if (score >= c.raw) return c.grade
  return 9
}

/** 상대평가 등급의 상위 % 구간 [from, to] */
export const topRange = (grade: number): [number, number] => [grade === 1 ? 0 : TOP_PCT[grade - 2], TOP_PCT[grade - 1]]

/** 한 등급 올리려면 필요한 원점수 (1등급이면 null) */
export function pointsToNext(key: CutKey, score: number): number | null {
  const g = gradeOf(key, score)
  if (g === 1) return null
  return CUTS[key].cuts[g - 2].raw - score
}

const lerp = (x: number, x0: number, y0: number, x1: number, y1: number) =>
  x1 === x0 ? y0 : y0 + ((x - x0) * (y1 - y0)) / (x1 - x0)

/**
 * 표준점수·백분위 추정 (국어·수학만, 등급컷 지점 사이 선형 보간).
 * 표준점수: 1등급 컷 이상은 'ge'(이상), 8등급 컷 미만은 'lt'(미만)로 경계값만 반환.
 * 백분위: (만점,100) … 등급컷 … (0,0) 사이 보간.
 */
export function estimate(key: CutKey, score: number): { std: number; bound: 'ge' | 'lt' | null; pct: number } | null {
  const { max, cuts } = CUTS[key]
  const stdPts = cuts.filter((c) => c.std != null) as { raw: number; std: number }[]
  if (!stdPts.length) return null

  let std: number, bound: 'ge' | 'lt' | null = null
  if (score >= stdPts[0].raw) { std = stdPts[0].std; bound = score === stdPts[0].raw ? null : 'ge' }
  else if (score < stdPts[stdPts.length - 1].raw) { std = stdPts[stdPts.length - 1].std; bound = 'lt' }
  else {
    const i = stdPts.findIndex((c) => score >= c.raw) // 첫 이하 컷
    std = lerp(score, stdPts[i].raw, stdPts[i].std, stdPts[i - 1].raw, stdPts[i - 1].std)
  }

  const pctPts: [number, number][] = [[max, 100], ...cuts.filter((c) => c.grade < 9).map((c) => [c.raw, c.pct ?? 0] as [number, number]), [0, 0]]
  let pct = 0
  for (let i = 1; i < pctPts.length; i++) {
    if (score >= pctPts[i][0]) { pct = lerp(score, pctPts[i][0], pctPts[i][1], pctPts[i - 1][0], pctPts[i - 1][1]); break }
  }
  return { std: Math.round(std), bound, pct: Math.round(pct) }
}

/** 오늘(YYYY-MM-DD)부터 시험일까지 남은 일수 (당일 0, 지나면 음수) */
export function daysUntil(today: string, exam = CSAT_EXAM_DATE): number {
  const d = (s: string) => { const [y, m, dd] = s.split('-').map(Number); return Date.UTC(y, m - 1, dd) }
  return Math.round((d(exam) - d(today)) / 86_400_000)
}

export interface Grades { kor: number; math: number; eng: number; hist: number; inq1: number; inq2: number }

/** 국·수·영·탐(상위 1과목) 중 상위 n개 등급 합 — 수능최저 'n합' 계산 */
export function bestSum(g: Grades, n: number): number {
  return [g.kor, g.math, g.eng, Math.min(g.inq1, g.inq2)].sort((a, b) => a - b).slice(0, n).reduce((a, b) => a + b, 0)
}

const r2 = (v: number) => Math.round(v * 100) / 100

/** 등급 평균: 국수영탐(탐구 2과목 평균을 한 영역으로) / 국수탐(영어 제외) */
export function gradeAverages(g: Grades): { all: number; noEng: number } {
  const inq = (g.inq1 + g.inq2) / 2
  return { all: r2((g.kor + g.math + g.eng + inq) / 4), noEng: r2((g.kor + g.math + inq) / 3) }
}
