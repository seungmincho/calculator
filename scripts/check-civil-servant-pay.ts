// node scripts/check-civil-servant-pay.ts (Node 24) — 공무원 봉급표·실수령액 회귀 체크
// 기대값: 인사혁신처 2026 봉급표 https://www.mpm.go.kr/mpm/info/resultPay/bizSalary/2026/ (2026-11-07 대조),
//         공무원수당 등에 관한 규정 제18조·별표 15, 공무원연금법 제67조, 2차 자료 9급 1호봉 공제 예시
import assert from 'node:assert/strict'
import {
  PAY_2026, GRADE_ALLOWANCE, MEAL, DEFAULT_GRADE, DEFAULT_STEP, TRACKS, basePay, est2027, maxStep, calcCivilPay,
  type CivilPayInput,
} from '../src/utils/civilServantPay.ts'
import { wageTax } from '../src/utils/wageTaxTable.ts'

// 원문 표본 [일반직 별표 3] — g 는 별표 열 번호(1급 = 1 … 9급 = 9)
const sample: [CivilPayInput['track'], number, number, number][] = [
  ['general', 9, 1, 2_133_000], ['general', 7, 1, 2_317_100], ['general', 5, 1, 2_896_400],
  ['general', 1, 1, 4_656_100], ['general', 1, 23, 8_001_400], ['general', 6, 1, 2_389_500], ['general', 6, 32, 4_967_800],
  ['general', 8, 1, 2_162_100], ['general', 8, 3, 2_233_800], ['general', 9, 2, 2_147_600], ['general', 9, 31, 3_731_100],
  ['general', 4, 1, 3_241_200], ['general', 3, 3, 4_065_700],
  // [경찰·소방 별표 10] 치안정감 = 1 … 순경 = 10
  ['police', 1, 1, 4_905_100], ['police', 1, 23, 8_250_400], ['police', 6, 1, 2_698_600], ['police', 6, 32, 5_372_500],
  ['police', 7, 1, 2_507_700], ['police', 8, 1, 2_472_100], ['police', 9, 1, 2_215_300], ['police', 10, 1, 2_133_000],
  ['police', 10, 31, 3_869_200], ['police', 5, 30, 5_846_900],
  // [교원 별표 11]
  ['teacher', 1, 1, 2_041_500], ['teacher', 1, 20, 3_481_000], ['teacher', 1, 21, 3_600_700], ['teacher', 1, 40, 6_205_700],
]
for (const [track, g, s, v] of sample) assert.equal(basePay(track, g, s), v, `${track} ${g} ${s}호봉`)

// 표 모양: 직급별 호봉 수, 호봉이 오를수록 봉급이 오르고 100원 단위
assert.deepEqual(PAY_2026.general.map((c) => c.length), [23, 25, 27, 28, 30, 32, 31, 31, 31], '일반직 호봉 수')
assert.deepEqual(PAY_2026.police.map((c) => c.length), [23, 25, 27, 28, 30, 32, 31, 31, 31, 31], '경찰·소방 호봉 수')
assert.equal(maxStep('teacher', 1), 40, '교원 40호봉')
for (const t of TRACKS) for (const col of PAY_2026[t]) {
  col.forEach((v, i) => { assert.equal(v % 100, 0, '100원 단위'); if (i) assert.ok(v > col[i - 1], `${t} 호봉 증가`) })
}
assert.equal(GRADE_ALLOWANCE.general.length, PAY_2026.general.length); assert.equal(GRADE_ALLOWANCE.police.length, PAY_2026.police.length)
for (const t of TRACKS) assert.ok(DEFAULT_STEP[t] <= maxStep(t, DEFAULT_GRADE[t]), `${t} 기본값 범위`)

// 2027 추정: × 1.039, 100원 반올림
assert.equal(est2027(2_133_000), 2_216_200, '9급 1호봉 2,216,187 → 2,216,200')
assert.equal(est2027(2_896_400), 3_009_400, '5급 1호봉 3,009,359.6 → 3,009,400')
assert.equal(est2027(1_000_050), 1_039_100, '1,039,051.95 → 반올림')
assert.equal(basePay('general', 9, 1, 2027), 2_216_200)

// 2차 자료 예시: 9급 1호봉 봉급만 → 기여금 191,970 · 건보 76,681 · 장기요양 10,076.
// 기여금은 같고, 건보·장기요양은 이 사이트 공통 규칙(10원 미만 절사, fourInsurance.ts)이라 10원 안쪽 차이.
const base: CivilPayInput = { track: 'general', g: 9, step: 1, family: 1, children: 0, allowances: false }
const r0 = calcCivilPay(base)
assert.equal(r0.pension, 191_970, '기여금 9%')
assert.ok(Math.abs(r0.health - 76_681) < 10, `건보 ${r0.health}`); assert.equal(r0.health, 76_680)
assert.ok(Math.abs(r0.ltc - 10_076) < 10, `장기요양 ${r0.ltc}`); assert.equal(r0.ltc, 10_070)
assert.equal(r0.taxable, 2_133_000); assert.equal(r0.incomeTax, wageTax(2_133_000, 1, 0))
assert.equal(r0.localTax, Math.floor(r0.incomeTax / 100) * 10, '지방소득세 10%·10원 절사')
assert.equal(r0.net, r0.gross - (r0.pension + r0.health + r0.ltc + r0.incomeTax + r0.localTax))

// 고정 수당: 정액급식비 16만(비과세) + 9급 직급보조비 17.5만(과세)
const r1 = calcCivilPay({ ...base, allowances: true })
assert.deepEqual([r1.meal, r1.gradeAllowance, r1.gross, r1.taxable], [MEAL, 175_000, 2_468_000, 2_308_000], '수당 포함')
assert.equal(r1.pension, 207_720, '기여금은 과세 보수(봉급 + 직급보조비) × 9%')
assert.equal(calcCivilPay({ ...base, g: 7, allowances: true }).gradeAllowance, 180_000, '7급 18만')
assert.equal(calcCivilPay({ ...base, g: 5, allowances: true }).gradeAllowance, 250_000, '5급 25만')
assert.equal(calcCivilPay({ track: 'police', g: 7, step: 1, family: 1, children: 0, allowances: true }).gradeAllowance, 185_000, '경위 18.5만')
const tch = calcCivilPay({ track: 'teacher', g: 1, step: 9, family: 1, children: 0, allowances: true })
assert.deepEqual([tch.gradeAllowance, tch.gross - tch.pay], [0, MEAL], '평교사는 정액급식비만')

// 가족·자녀가 늘면 소득세가 줄거나 같다
const tax = (f: number, c: number) => calcCivilPay({ ...base, step: 20, family: f, children: c, allowances: true }).incomeTax
assert.ok(tax(4, 2) <= tax(2, 0) && tax(2, 0) <= tax(1, 0), '가족 공제')

// 2027: 추정 봉급 + 장기요양 13.90%
const r27 = calcCivilPay({ ...base, allowances: true }, 2027)
assert.equal(r27.pay, 2_216_200); assert.ok(r27.ltc >= r1.ltc && r27.net > r1.net, '2027 실수령액 증가')

console.log('9급 1호봉 수당 포함 2026:', r1.net, '2027 추정:', r27.net)
console.log('check-civil-servant-pay: all passed')
