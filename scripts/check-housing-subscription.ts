// 청약가점 회귀 체크: node scripts/check-housing-subscription.ts
import {
  homelessStart, homelessScore, dependentScore, subScoreByMonths, spouseSubScoreByMonths,
  scoreAt, nextHomelessUp, nextSubUp, householdMax, isNewlywed, backYears, backMonths,
} from '../src/utils/housingSubscription.ts'

let fail = 0
const eq = (a: unknown, b: unknown, msg: string) => { if (JSON.stringify(a) !== JSON.stringify(b)) { fail++; console.log('FAIL', msg, JSON.stringify(a), '!=', JSON.stringify(b)) } }

// 기산일: 만30세 되는 날 / 30세 전 혼인 → 혼인신고일 / 30세 후 혼인 → 여전히 30세 / 처분일이 늦으면 처분일
eq(homelessStart('1996-05-15'), '2026-05-15', '미혼 = 만30세 되는 날')
eq(homelessStart('1996-05-15', '2022-03-01'), '2022-03-01', '30세 전 혼인 = 혼인신고일')
eq(homelessStart('1990-05-15', '2023-03-01'), '2020-05-15', '30세 후 혼인 = 만30세')
eq(homelessStart('1990-05-15', '2019-10-12', '2021-06-30'), '2021-06-30', '처분일이 더 늦으면 처분일')
eq(homelessStart('1990-05-15', '2019-10-12', '2018-01-01'), '2019-10-12', '처분일이 이르면 기산일 유지')

// 만30세 미만 미혼 0점, 30세 생일 당일 2점
eq(homelessScore(homelessStart('1996-10-02'), '2026-10-01'), 0, '30세 전날 미혼 = 0점')
eq(homelessScore(homelessStart('1996-10-01'), '2026-10-01'), 2, '30세 당일 = 2점')
eq(homelessScore(null, '2026-10-01'), 0, '유주택 = 0점')
// 1년 미만 2점, 1년마다 +2, 15년 이상 32점 (만 년 기준 경계)
eq(homelessScore('2025-10-02', '2026-10-01'), 2, '1년 하루 모자람 = 2')
eq(homelessScore('2025-10-01', '2026-10-01'), 4, '만1년 = 4')
eq(homelessScore('2012-10-01', '2026-10-01'), 30, '14년 = 30')
eq(homelessScore('2011-10-02', '2026-10-01'), 30, '15년 하루 모자람 = 30')
eq(homelessScore('2011-10-01', '2026-10-01'), 32, '15년 = 32')
eq(homelessScore('1990-01-01', '2026-10-01'), 32, '36년도 32')

// 부양가족: 0명 5점 … 6명 35점, 7명도 35점
eq([0, 1, 2, 3, 4, 5, 6, 7].map(dependentScore), [5, 10, 15, 20, 25, 30, 35, 35], '부양가족 표')
eq(householdMax(3), 69, '4인 가구 최고점 69')
eq(householdMax(0), 54, '1인 가구 최고점 54')

// 통장: 6개월 미만 1, 6~12 2, 1~2년 3, 14~15년 16, 15년 이상 17
eq([0, 5, 6, 11, 12, 23, 24, 179, 180, 300].map(subScoreByMonths), [1, 1, 2, 2, 3, 3, 4, 16, 17, 17], '통장 표')
// 배우자: 기간 50% 환산, 최대 3점 (1년 미만 1, 1~2년 2, 2년 이상 3)
eq([0, 11, 12, 23, 24, 120].map(spouseSubScoreByMonths), [1, 1, 2, 2, 3, 3], '배우자 통장')

// 합산: 본인 5년(7) + 배우자 4년(3) = 10 (국토부 예시) / 본인 15년 + 배우자 → 17 상한
const s1 = scoreAt({ homelessStart: null, subStart: '2021-10-01', spouseSubStart: '2022-10-01', dependents: 0 }, '2026-10-01')
eq([s1.cOwn, s1.cSpouse, s1.c], [7, 3, 10], '본인5년+배우자4년')
const s2 = scoreAt({ homelessStart: null, subStart: '2010-01-01', spouseSubStart: '2020-01-01', dependents: 0 }, '2026-10-01')
eq(s2.c, 17, '통장 합산 17점 상한')
eq(scoreAt({ homelessStart: null, subStart: null, spouseSubStart: null, dependents: 0 }, '2026-10-01').c, 0, '통장 없음 0')

// 기본 예시: 1990-05-15생, 2019-10-12 혼인, 통장 2015-03-01, 부양 3명 → 14+20+13 = 47
const ex = { homelessStart: homelessStart('1990-05-15', '2019-10-12'), subStart: '2015-03-01', spouseSubStart: null, dependents: 3 }
eq(scoreAt(ex, '2026-10-01').total, 47, '기본 예시 47점')
eq(scoreAt(ex, '2027-10-01').total, 50, '1년 뒤 50점 (+2 +1)')
eq(nextHomelessUp(ex.homelessStart, '2026-10-01'), '2026-10-12', '다음 무주택 상승일')
eq(nextSubUp('2015-03-01', '2026-10-01'), '2027-03-01', '다음 통장 상승일')
eq(nextSubUp('2026-09-01', '2026-10-01'), '2027-03-01', '가입 1개월 → 6개월 시점')
eq(nextSubUp('2010-01-01', '2026-10-01'), null, '통장 만점')
eq(nextHomelessUp(homelessStart('1996-10-02'), '2026-10-01'), '2026-10-02', '30세 되는 날부터 산정')

// 직접 선택 모드 역산
eq(homelessScore(backYears('2026-10-01', 0), '2026-10-01'), 2, '직접: 1년 미만 = 2')
eq(homelessScore(backYears('2026-10-01', 15), '2026-10-01'), 32, '직접: 15년 = 32')
eq(subScoreByMonths(scoreAt({ homelessStart: null, subStart: backMonths('2026-10-31', 6), spouseSubStart: null, dependents: 0 }, '2026-10-31').subMonths), 2, '직접: 6개월 = 2')

// 신혼부부 7년
eq(isNewlywed('2019-10-12', '2026-10-01'), true, '7년 이내')
eq(isNewlywed('2019-09-30', '2026-10-01'), false, '7년 초과')
eq(isNewlywed(null, '2026-10-01'), false, '미혼')

if (fail) { console.log(`${fail} failed`); process.exit(1) }
console.log('check-housing-subscription: all passed')
