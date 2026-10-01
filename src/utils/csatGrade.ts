// 수능 원점수 → 등급/표준점수/백분위 추정. 순수 로직 (scripts/check-csat-grade.ts로 회귀 체크).
//
// 상대평가 등급컷(국어·수학·탐구)은 2026학년도 수능(2025-11-13 시행) 확정 등급컷.
// 등급 구분 표준점수는 평가원 채점 결과 발표치, 원점수 컷은 종로학원이 표준점수로 역산한 값
// (평가원은 원점수 컷을 발표하지 않음) → 화면에 '추정'으로 표기. 매년 12월 채점 결과 발표 후 갱신.
// 영어(100점, 10점 단위)·한국사(50점, 5점 단위)는 절대평가라 고정 규칙.

/** 2027학년도 수능 시행일. ponytail: 매년 갱신 (평가원 시행기본계획 공고 기준) */
export const CSAT_EXAM_DATE = '2026-11-19'
export const CSAT_YEAR = 2027
/** 상대평가 등급컷 데이터의 학년도 */
export const CUT_YEAR = 2026

export const INQ_SOC = ['ethics', 'thought', 'kgeo', 'wgeo', 'eastAsia', 'world', 'econ', 'law', 'society'] as const
export const INQ_SCI = ['phy1', 'chem1', 'bio1', 'earth1', 'phy2', 'chem2', 'bio2', 'earth2'] as const
export type InqKey = (typeof INQ_SOC)[number] | (typeof INQ_SCI)[number]
export type CutKey = 'korHj' | 'korLm' | 'mathProb' | 'mathCalc' | 'mathGeo' | 'english' | 'koreanHistory' | InqKey

export interface Cut {
  grade: number
  raw: number
  std?: number | null
  pct?: number | null
}

export interface CutTable {
  max: number
  absolute: boolean
  /** 만점자 표준점수·백분위 (보간 상단점) */
  top?: { std: number; pct: number }
  cuts: Cut[] // 1등급 → 9등급 (raw 내림차순)
}

const absCuts = (step: number, first: number): Cut[] =>
  Array.from({ length: 9 }, (_, i) => ({ grade: i + 1, raw: i === 8 ? 0 : first - step * i }))

/** '만점raw,std,pct|1컷raw,std,pct|…|8컷' → CutTable */
function rel(s: string): CutTable {
  const [top, ...cuts] = s.split('|').map((r) => r.split(',').map(Number))
  return {
    max: top[0], absolute: false, top: { std: top[1], pct: top[2] },
    cuts: [...cuts.map(([raw, std, pct], i) => ({ grade: i + 1, raw, std, pct })), { grade: 9, raw: 0, std: null, pct: 0 }],
  }
}

// 2026학년도 수능 확정 등급컷 — 원점수(종로학원 역산) / 등급 구분 표준점수(평가원) / 백분위
export const CUTS: Record<CutKey, CutTable> = {
  korHj: rel('100,142,99|90,133,96|83,126,89|73,117,77|63,107,61|49,94,40|37,83,23|27,73,11|20,66,4'),
  korLm: rel('100,147,100|85,133,96|78,126,89|69,117,77|59,107,61|46,94,40|35,83,23|25,73,11|17,66,4'),
  mathProb: rel('100,137,100|87,128,96|82,124,88|76,119,76|65,111,60|41,92,40|24,79,23|17,74,12|13,71,5'),
  mathCalc: rel('100,139,100|85,128,96|80,124,88|73,119,76|62,111,60|37,92,40|20,79,23|14,74,12|10,71,5'),
  mathGeo: rel('100,139,100|85,128,96|81,124,88|74,119,76|63,111,60|37,92,40|20,79,23|14,74,12|10,71,5'),
  ethics: rel('50,71,100|45,66,95|42,64,90|37,59,78|30,53,60|23,46,39|18,42,23|12,36,9|9,33,3'),
  thought: rel('50,70,100|45,66,95|43,64,89|37,59,76|30,53,60|20,45,39|15,41,22|12,38,12|7,34,3'),
  kgeo: rel('50,72,100|45,68,96|41,65,91|34,59,76|26,52,59|17,45,40|12,41,24|10,39,13|6,36,4'),
  wgeo: rel('50,73,100|44,68,97|38,63,88|34,59,77|27,53,60|17,45,39|12,40,21|9,38,10|6,35,3'),
  eastAsia: rel('50,68,99|46,65,96|42,62,88|38,59,76|33,55,61|22,46,41|14,40,22|10,37,12|8,35,5'),
  world: rel('50,72,100|45,68,96|40,64,88|35,59,76|26,52,59|18,45,39|13,41,22|10,38,11|7,36,5'),
  econ: rel('50,70,99|47,68,96|44,65,90|36,59,76|27,52,60|18,45,41|13,41,24|10,39,11|6,36,4'),
  law: rel('50,67,99|47,65,97|44,62,87|40,59,76|35,55,60|23,46,39|15,40,23|12,37,12|8,34,3'),
  society: rel('50,70,100|44,65,95|41,62,89|38,59,77|32,54,61|24,47,39|17,41,23|11,36,11|8,33,4'),
  phy1: rel('50,70,100|45,66,96|43,64,90|38,60,79|29,53,59|21,46,39|15,41,24|11,38,14|7,35,4'),
  chem1: rel('50,71,100|45,67,95|41,64,89|35,59,77|27,52,60|20,46,41|13,41,24|10,38,11|7,36,5'),
  bio1: rel('50,74,100|42,67,97|39,63,89|35,59,77|30,54,60|22,47,39|17,42,24|12,37,11|8,33,4'),
  earth1: rel('50,68,99|46,65,95|43,63,89|38,59,75|32,54,60|21,46,40|13,40,22|9,37,11|7,35,4'),
  phy2: rel('50,68,99|47,66,95|43,63,88|39,60,79|32,54,61|20,45,39|13,40,22|11,38,12|8,36,6'),
  chem2: rel('50,70,99|47,68,96|42,64,89|36,59,77|28,53,61|18,45,40|13,41,24|10,39,15|6,36,5'),
  bio2: rel('50,69,99|45,65,95|42,63,88|38,60,76|30,54,60|18,45,40|13,41,24|8,37,10|5,35,4'),
  earth2: rel('50,69,98|48,68,95|44,65,88|38,60,77|25,51,61|15,44,39|11,41,20|8,39,10|7,38,6'),
  english: { max: 100, absolute: true, cuts: absCuts(10, 90) },
  koreanHistory: { max: 50, absolute: true, cuts: absCuts(5, 40) },
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
  const { max, cuts, top } = CUTS[key]
  const stdPts = [...(top ? [{ raw: max, std: top.std }] : []), ...cuts.filter((c) => c.std != null)] as { raw: number; std: number }[]
  if (!stdPts.length) return null

  let std: number, bound: 'ge' | 'lt' | null = null
  if (score >= stdPts[0].raw) { std = stdPts[0].std; bound = score === stdPts[0].raw ? null : 'ge' }
  else if (score < stdPts[stdPts.length - 1].raw) { std = stdPts[stdPts.length - 1].std; bound = 'lt' }
  else {
    const i = stdPts.findIndex((c) => score >= c.raw) // 첫 이하 컷
    std = lerp(score, stdPts[i].raw, stdPts[i].std, stdPts[i - 1].raw, stdPts[i - 1].std)
  }

  const pctPts: [number, number][] = [[max, top?.pct ?? 100], ...cuts.filter((c) => c.grade < 9).map((c) => [c.raw, c.pct ?? 0] as [number, number]), [0, 0]]
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
