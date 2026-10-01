// 수능 등급 계산 회귀 체크: node scripts/check-csat-grade.ts
import { gradeOf, pointsToNext, estimate, daysUntil, bestSum, gradeAverages, topRange, clampScore } from '../src/utils/csatGrade.ts'

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

// 상대평가 컷 경계: 컷 점수 이상이면 그 등급
eq(gradeOf('korean', 92), 1, '국어 1컷')
eq(gradeOf('korean', 91), 2, '국어 1컷-1')
eq(gradeOf('mathProb', 88), 1, '확통 1컷')
eq(pointsToNext('korean', 84), 1, '국어 84 → 2등급까지 1점')
eq(pointsToNext('korean', 95), null, '1등급은 다음 없음')
eq(pointsToNext('english', 85), 5, '영어 85 → 90')

// 표준점수·백분위 추정 (보간)
eq(estimate('korean', 92), { std: 131, bound: null, pct: 96 }, '국어 1컷 지점')
eq(estimate('korean', 96), { std: 131, bound: 'ge', pct: 98 }, '국어 1컷 위')
eq(estimate('korean', 100)?.pct, 100, '만점 백분위 100')
eq(estimate('korean', 0), { std: 66, bound: 'lt', pct: 0 }, '국어 0점')
eq(estimate('korean', 81), { std: 120, bound: null, pct: 83 }, '국어 81 (2·3컷 중간)')
eq(estimate('socialStudies', 40), null, '탐구는 표준점수 데이터 없음')

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
