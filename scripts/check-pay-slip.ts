// 급여명세서 계산 회귀 체크: node scripts/check-pay-slip.ts
import assert from 'node:assert/strict'
import { computePay } from '../src/utils/paySlip.ts'
import { wageTax } from '../src/utils/wageTaxTable.ts'

// 간이세액표 원문(소득세법 시행령 별표2, 2026.2.27 개정) 값과 대조 — [월급여 하한(천원), 가족1, 가족2, 가족3, 가족4]
const ROWS: number[][] = [
  [1060, 1040, 0, 0, 0],
  [1110, 1740, 0, 0, 0],
  [2150, 24340, 17840, 9570, 6200],
  [3000, 74350, 56850, 31940, 26690],
  [3500, 127220, 102220, 62460, 49340],
  [4240, 228000, 199810, 138930, 120180],
  [5000, 335470, 306710, 237850, 219100],
  [8040, 968580, 918920, 777000, 747000],
  [9980, 1503990, 1428170, 1198650, 1168650],
]
for (const [k, ...v] of ROWS) v.forEach((tax, f) => assert.equal(wageTax(k * 1000 + 1, f + 1), tax, `간이세액 ${k}천원 ${f + 1}명`))
assert.equal(wageTax(10_000_000, 1), 1_507_400, '정확히 1,000만원')
assert.equal(wageTax(3_360_001, 11), 7_820, '3,360천원 11명 (원문 2026.2.27 표 전체 620행 대조 완료 2026-10-04)')
assert.equal(wageTax(12_000_000, 1), Math.floor((1_507_400 + 2_000_000 * 0.98 * 0.35 + 25_000) / 10) * 10, '1,000만원 초과')
assert.equal(wageTax(700_000, 1), 0)
// 자녀 공제: 350만·4명(자녀 2) = 49,340 − 45,830 / 80%·120% 10원 미만 절사
assert.equal(wageTax(3_500_000, 4, 2), 3_510)
assert.equal(wageTax(3_500_000, 4, 2, 120), 4_210)
assert.equal(wageTax(3_000_000, 1, 0, 80), 59_480)

const AUTO = { pension: null, health: null, care: null, employment: null, incomeTax: null, localTax: null }
const base = {
  mode: 'ins', small: false, wageType: 'monthly', base: 2_800_000, workHours: 0, holidayHours: 0, monthHours: 209, ordinary: 0,
  ot: 0, night: 0, hol: 0, hol8: 0, rows: [], dependents: 1, children: 0, taxPct: 100, insBase: 0, ded: AUTO, extraDeds: [],
}
const meal = (amount: number) => ({ type: 'meal', name: '식대', amount, taxFree: true, method: '매월 고정 지급' })

// 월 280만 + 식대 20만, 연장 8h → 통상시급 13,397, 연장수당 160,764
const r = computePay({ ...base, ot: 8, rows: [meal(200_000)] })
assert.equal(r.ordinary, 13_397)
assert.equal(r.pay.find((l: any) => l.key === 'ot').amount, Math.floor(13_397 * 8 * 1.5))
assert.equal(r.gross, 2_800_000 + 200_000 + 160_764)
assert.equal(r.taxFree, 200_000)
assert.equal(r.insBase, 2_800_000, '보수월액 = 기본급 (연장·비과세 제외)')
assert.equal(r.auto.pension, 133_000, '국민연금 280만 × 4.75%')
assert.equal(r.auto.health, 100_660, '건강보험 280만 × 3.595%')
assert.equal(r.auto.care, Math.floor(100_660 * 0.1314 / 10) * 10, '장기요양')
assert.equal(r.auto.employment, Math.floor((2_800_000 + 160_764) * 0.009 / 10) * 10, '고용보험은 연장수당 포함')
assert.equal(r.auto.incomeTax, wageTax(2_800_000 + 160_764, 1), '소득세 = 과세 임금 간이세액')
assert.equal(r.auto.localTax, Math.floor(r.auto.incomeTax * 0.1 / 10) * 10)
assert.equal(r.net, r.gross - r.totalDed)
assert.ok(r.minWage.ok)
assert.deepEqual(r.missingMethod, [])

// 비과세 한도 초과: 식대 25만 → 20만 비과세, 5만 과세
const ex = computePay({ ...base, rows: [meal(250_000)] })
assert.equal(ex.taxFree, 200_000)
assert.deepEqual(ex.excess, [{ name: '식대', limit: 200_000, excess: 50_000 }])

// 5인 미만: 연장 1배, 야간 없음, 휴일 1배
const sm = computePay({ ...base, small: true, ot: 10, night: 4, hol: 8 })
assert.equal(sm.pay.find((l: any) => l.key === 'ot').amount, 13_397 * 10)
assert.equal(sm.pay.find((l: any) => l.key === 'night'), undefined)
assert.equal(sm.pay.find((l: any) => l.key === 'hol').amount, 13_397 * 8)

// 시급제: 10,320 × 130h + 주휴 26h, 최저임금 정확히 충족
const hr = computePay({ ...base, wageType: 'hourly', base: 10_320, workHours: 130, holidayHours: 26 })
assert.equal(hr.gross, 10_320 * 156)
assert.ok(hr.minWage.ok)
assert.equal(computePay({ ...base, wageType: 'hourly', base: 10_000, workHours: 100, holidayHours: 0 }).minWage.ok, false)

// 최저임금 미달 월급: 210만 / 209h → 미달 56,880원
const low = computePay({ ...base, base: 2_100_000 })
assert.equal(low.minWage.ok, false)
assert.equal(low.minWage.shortfall, 56_880)
// 식대도 최저임금 산입(2024~ 복리후생비 전액) → 충족
assert.equal(computePay({ ...base, base: 2_000_000, rows: [meal(200_000)] }).minWage.ok, true)

// 국민연금 하한·상한
assert.equal(computePay({ ...base, wageType: 'hourly', base: 10_320, workHours: 30, holidayHours: 0 }).pensionClamp, 'floor')
const hi = computePay({ ...base, base: 8_000_000 })
assert.equal(hi.pensionClamp, 'cap')
assert.equal(hi.auto.pension, Math.floor(6_590_000 * 0.0475 / 10) * 10)

// 수동 수정 + 기타 공제
const man = computePay({ ...base, ded: { ...AUTO, pension: 0 }, extraDeds: [{ name: '가불금', amount: 100_000 }] })
assert.equal(man.ded.find((l: any) => l.key === 'pension'), undefined, '0으로 직접 입력하면 빠짐')
assert.equal(man.ded.find((l: any) => l.name === '가불금').amount, 100_000)

// 3.3% 사업소득: 비과세 없음, 4대보험 없음
const biz = computePay({ ...base, mode: 'biz', base: 2_000_000, rows: [meal(200_000)] })
assert.equal(biz.taxFree, 0)
assert.deepEqual(biz.ded.map((l: any) => [l.key, l.amount]), [['incomeTax', 66_000], ['localTax', 6_600]])
assert.equal(biz.net, 2_200_000 - 72_600)

// 계산방법 누락
assert.deepEqual(computePay({ ...base, rows: [{ type: 'other', name: '직책수당', amount: 100_000, taxFree: false, method: '' }] }).missingMethod, ['직책수당'])

console.log('check-pay-slip OK', { gross: r.gross, totalDed: r.totalDed, net: r.net, incomeTax: r.auto.incomeTax })
