// 수능 등급 계산 회귀 체크: node scripts/check-csat-grade.ts
import { CUTS, CUTS_2027_EST, cutsFor, gradeOf, pointsToNext, estimate, daysUntil, bestSum, gradeAverages, topRange, clampScore } from '../src/utils/csatGrade.ts'
import { summarizeCsatRawGrades } from '../src/utils/csatGradeSummary.ts'
import { evaluateCsatGoal } from '../src/utils/csatGoals.ts'

let fail = 0
const eq = (a: unknown, b: unknown, msg: string) => {
  if (JSON.stringify(a) !== JSON.stringify(b)) { fail++; console.log('FAIL', msg, JSON.stringify(a), '!=', JSON.stringify(b)) }
}

// 영어 절대평가: 90↑ 1등급, 10점 단위
eq(gradeOf('english', 100), 1, '영어 100')
eq(gradeOf('english', 90), 1, '영어 90')
eq(gradeOf('english', 89), 2, '영어 89')
eq(gradeOf('english', 80), 2, '영어 80')
eq(gradeOf('english', 20), 8, '영어 20')
eq(gradeOf('english', 19), 9, '영어 19')
eq(gradeOf('english', 0), 9, '영어 0')
// 한국사 절대평가: 50점 만점, 40↑ 1등급, 5점 단위
eq(gradeOf('koreanHistory', 50), 1, '한국사 50')
eq(gradeOf('koreanHistory', 40), 1, '한국사 40')
eq(gradeOf('koreanHistory', 39), 2, '한국사 39')
eq(gradeOf('koreanHistory', 35), 2, '한국사 35')
eq(gradeOf('koreanHistory', 5), 8, '한국사 5')
eq(gradeOf('koreanHistory', 4), 9, '한국사 4')

// 상대평가 컷 경계 (2026학년도 확정 등급컷): 컷 점수 이상이면 그 등급
eq(gradeOf('korLm', 85), 1, '언매 1컷')
eq(gradeOf('korLm', 84), 2, '언매 1컷-1')
eq(gradeOf('korHj', 90), 1, '화작 1컷')
eq(gradeOf('mathProb', 87), 1, '확통 1컷')
eq(gradeOf('mathCalc', 85), 1, '미적 1컷')
eq(gradeOf('mathGeo', 81), 2, '기하 2컷')
eq(gradeOf('society', 44), 1, '사문 1컷')
eq(gradeOf('earth1', 45), 2, '지1 46 미만')
eq(pointsToNext('korLm', 84), 1, '언매 84 → 1등급까지 1점')
eq(pointsToNext('korLm', 95), null, '1등급은 다음 없음')
eq(pointsToNext('english', 85), 5, '영어 85 → 90')

// 통합수능: 같은 등급의 표준점수 컷은 선택과목과 무관 (평가원 발표: 국어 133/126/…, 수학 128/124/…)
const stds = (k: Parameters<typeof estimate>[0]) => CUTS[k].cuts.slice(0, 8).map((c) => c.std)
eq(stds('korHj'), [133, 126, 117, 107, 94, 83, 73, 66], '화작 표준점수 컷')
eq(stds('korLm'), stds('korHj'), '국어 선택과목 무관')
eq(stds('mathProb'), [128, 124, 119, 111, 92, 79, 74, 71], '확통 표준점수 컷')
eq(stds('mathCalc'), stds('mathProb'), '미적 = 확통')
eq(stds('mathGeo'), stds('mathProb'), '기하 = 확통')
// 탐구 1등급 표준점수 (평가원 발표)
eq(['ethics', 'thought', 'kgeo', 'wgeo', 'world', 'econ', 'eastAsia', 'law', 'society', 'phy1', 'phy2', 'chem1', 'bio1', 'chem2', 'earth2', 'bio2', 'earth1']
  .map((k) => CUTS[k as keyof typeof CUTS].cuts[0].std), [66, 66, 68, 68, 68, 68, 65, 65, 65, 66, 66, 67, 67, 68, 68, 65, 65], '탐구 1컷 표준점수')

// 표준점수·백분위 추정 (보간, 만점 지점 포함)
eq(estimate('korLm', 85), { std: 133, bound: null, pct: 96 }, '언매 1컷 지점')
eq(estimate('korLm', 100), { std: 147, bound: null, pct: 100 }, '언매 만점 = 최고 표준점수')
eq(estimate('mathProb', 100)?.std, 137, '확통 만점')
eq(estimate('korLm', 0), { std: 66, bound: 'lt', pct: 0 }, '0점')
eq(estimate('society', 50)?.std, 70, '사문 만점')
eq(estimate('english', 90), null, '절대평가는 표준점수 없음')

eq(topRange(1), [0, 4], '1등급 상위 4%')
eq(topRange(2), [4, 11], '2등급 4~11%')
eq(topRange(9), [96, 100], '9등급')

eq(clampScore('koreanHistory', 70), 50, '한국사 상한')
eq(clampScore('english', -3), 0, '하한')
eq(clampScore('english', NaN), 0, 'NaN')

// D-day: 2027학년도 수능 2026-11-19
eq(daysUntil('2026-10-01'), 49, 'D-49')
eq(daysUntil('2026-11-19'), 0, 'D-day')
eq(daysUntil('2026-11-20'), -1, '지남')

// 등급 합·평균
const g = { kor: 3, math: 2, eng: 2, hist: 1, inq1: 2, inq2: 3 }
eq(bestSum(g, 2), 4, '2합')
eq(bestSum(g, 3), 6, '3합 (탐구 상위 1과목)')
eq(bestSum(g, 4), 9, '4합')
eq(gradeAverages(g), { all: 2.38, noEng: 2.5 }, '평균')

// ── 2027 가채점 예상 컷 (종로학원 2026-11-20 09:03 확인) ──
const E = CUTS_2027_EST
eq(cutsFor(2027) === E && cutsFor(2026) === CUTS, true, 'cutsFor 학년도 선택')
// 1등급 원점수: 종로 원문 = 국제뉴스·베리타스(종로 21:15) 보도와 일치
eq((['korHj', 'korLm', 'mathProb', 'mathCalc', 'mathGeo'] as const).map((k) => E[k].cuts[0].raw), [95, 91, 89, 86, 87], '2027 국수 1컷')
eq(gradeOf('korLm', 91, E), 1, '2027 언매 91 = 1')
eq(gradeOf('korLm', 90, E), 2, '2027 언매 90 = 2')
eq(gradeOf('korLm', 88), 1, '같은 88점: 2026 표 1등급')
eq(gradeOf('korLm', 88, E), 2, '같은 88점: 2027 표 2등급')
eq(pointsToNext('mathCalc', 80, E), 6, '2027 미적 80 → 86')
eq(estimate('korLm', 91, E), { std: 131, bound: null, pct: 96 }, '2027 언매 1컷 지점')
eq(gradeOf('earth2', 50, E), 1, '2027 지2 만점만 1등급')
eq(gradeOf('earth2', 49, E), 2, '2027 지2 49 = 2')
// 같은 등급 표준점수 컷은 선택과목 무관
const estStd = (k: keyof typeof E) => E[k].cuts.slice(0, 8).map((c) => c.std)
eq(estStd('korHj'), [131, 125, 118, 107, 97, 85, 74, 65], '2027 국어 표준점수 컷')
eq(estStd('korLm'), estStd('korHj'), '2027 국어 선택 무관')
eq(estStd('mathProb'), [129, 124, 119, 111, 94, 79, 74, 70], '2027 수학 표준점수 컷')
eq([estStd('mathCalc'), estStd('mathGeo')], [estStd('mathProb'), estStd('mathProb')], '2027 수학 선택 무관')
// 모든 표: 9등급, 원점수·백분위 비증가, 만점 = 2026 표와 같음, 절대평가는 그대로
for (const k of Object.keys(E) as (keyof typeof E)[]) {
  const t = E[k]
  eq([t.cuts.length, t.max, t.absolute], [9, CUTS[k].max, CUTS[k].absolute], `2027 ${k} 형태`)
  const raws = t.cuts.map((c) => c.raw), pcts = t.cuts.map((c) => c.pct ?? 0)
  eq(raws.every((r, i) => i === 0 ? r <= t.max : r < raws[i - 1]), true, `2027 ${k} 원점수 감소`)
  if (!t.absolute) eq(pcts.every((p, i) => i === 0 || p <= pcts[i - 1]), true, `2027 ${k} 백분위 감소`)
}
// 요약·목표 계산이 snapshot.referenceYear 로 표를 고른다
const snap = (referenceYear: number) => ({ examYear: 2027, referenceYear, scores: { kor: '88', math: '80', eng: '85', hist: '42', inq1: '44', inq2: '41' }, selection: { kor: 'lm', math: 'prob', inq1: 'society', inq2: 'ethics' } })
eq(summarizeCsatRawGrades(snap(2026)).rows[0].grade, 1, '요약 2026: 언매 88 = 1')
eq(summarizeCsatRawGrades(snap(2027)).rows[0].grade, 2, '요약 2027: 언매 88 = 2')
// 2합: 2026 = 언매 1 + 사문 1, 2027 = 언매 2 + 영어·사문 2
eq([evaluateCsatGoal(snap(2026), { areas: 2, maxSum: 18 }).sum, evaluateCsatGoal(snap(2027), { areas: 2, maxSum: 18 }).sum], [2, 4], '목표 계산 표 선택')

if (fail) { console.log(`${fail} failed`); process.exit(1) }
console.log('csat-grade OK')
