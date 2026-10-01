// 수능 등급 계산 회귀 체크: node scripts/check-csat-grade.ts
import { CUTS, gradeOf, pointsToNext, estimate, daysUntil, bestSum, gradeAverages, topRange, clampScore } from '../src/utils/csatGrade.ts'

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

if (fail) { console.log(`${fail} failed`); process.exit(1) }
console.log('csat-grade OK')
