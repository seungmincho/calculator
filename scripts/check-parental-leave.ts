// 육아휴직급여 회귀 체크: node scripts/check-parental-leave.ts
import {
  FLOOR, SPECIAL_CAPS, monthBenefit, maxMonths, rows, plan, compareOrders, reducedHours, maxReduceMonths,
  type PlanInput,
} from '../src/utils/parentalLeave.ts'

let fail = 0
const eq = (a: unknown, b: unknown, msg: string) => {
  if (JSON.stringify(a) !== JSON.stringify(b)) { fail++; console.log('FAIL', msg, JSON.stringify(a), '!=', JSON.stringify(b)) }
}
const amt = (w: number, n: number, sp = false, single = false) => monthBenefit(w, n, sp, single).amount

// 일반 (시행령 제95조): 250·200·160(80%), 하한 70만
eq([1, 3, 4, 6, 7, 12, 18].map((n) => amt(3_000_000, n)), [2_500_000, 2_500_000, 2_000_000, 2_000_000, 1_600_000, 1_600_000, 1_600_000], '월 300만 일반')
eq([1, 4, 7].map((n) => amt(1_800_000, n)), [1_800_000, 1_800_000, 1_440_000], '월 180만: 100%/100%/80%')
eq(amt(600_000, 1), FLOOR, '하한 70만')
eq(amt(0, 1), 0, '임금 0이면 0')
eq(amt(800_000, 7), FLOOR, '7개월차 80%=64만 → 하한 70만')
eq(monthBenefit(3_000_000, 1).applied, 'cap', '상한 표시')
eq(monthBenefit(600_000, 1).applied, 'floor', '하한 표시')
eq(rows(3_000_000, 12, '2026-01-01').reduce((s, r) => s + r.amount, 0), 23_100_000, '12개월 2,310만 (고용부 보도자료)')

// 한부모: 1~3개월 300만
eq([1, 3, 4, 7].map((n) => amt(4_000_000, n, false, true)), [3_000_000, 3_000_000, 2_000_000, 1_600_000], '한부모')

// 6+6 (시행령 제95조의3)
eq([1, 2, 3, 4, 5, 6].map((n) => amt(5_000_000, n, true)), SPECIAL_CAPS, '6+6 상한 250·250·300·350·400·450')
eq(SPECIAL_CAPS.reduce((s, x) => s + x, 0), 20_000_000, '6+6 1인 6개월 최대 2,000만 (부부 4,000만)')
eq(amt(3_200_000, 5, true), 3_200_000, '6+6 상한 미만이면 통상임금 100%')
eq(amt(5_000_000, 7, true), 1_600_000, '7개월차는 일반')

// 기간 1년 6개월
eq([maxMonths(false, 12, 0), maxMonths(false, 18, 3), maxMonths(false, 18, 2), maxMonths(true, 18, 0)], [12, 18, 12, 18], '최대 기간')

// 플랜: 엄마 12 → 아빠 6, 생후 3개월 시작
const base: PlanInput = { who: 'both', order: 'mom', start: '2026-10-01', birth: '2026-07-01', momWage: 3_000_000, momMonths: 12, dadWage: 3_500_000, dadMonths: 6 }
const p = plan(base)
eq([p.eligible66, p.special, p.dadStart], [true, 6, '2027-10-01'], '엄마 먼저: 아빠 생후 15개월 시작 → 6+6')
eq(p.momTotal, 2_500_000 * 2 + 3_000_000 * 4 + 1_600_000 * 6, '엄마 합계 직접식')
eq(p.dadTotal, 2_500_000 * 2 + 3_000_000 + 3_500_000 * 3, '아빠 합계 (350만은 상한 미만 그대로)')
eq(p.retro, (2_500_000 * 2 + 3_000_000 * 4) - (2_500_000 * 3 + 2_000_000 * 3), '엄마 소급분')
eq(p.careMonths, 18, '순차 돌봄 18개월')
eq(p.calendar.length, 18, '달력 18행')
eq(p.lowest, 1_600_000 + 3_500_000, '가구 최저 = 엄마 7개월차 160만 + 아빠 근무 350만')

// 18개월 초과 → 6+6 미적용
eq(plan({ ...base, birth: '2025-03-01' }).eligible66, false, '두 번째 부모가 생후 18개월 이후 시작')
eq(plan({ ...base, birth: '2026-04-02' }).eligible66, true, '생후 18개월 되기 전날까지 시작')
eq(plan({ ...base, birth: '2026-04-01' }).eligible66, false, '출생일 산입 18개월 당일은 제외')

// 공통 개월수만큼만 특례
const p3 = plan({ ...base, dadMonths: 3, order: 'same' })
eq([p3.special, p3.retro, p3.careMonths], [3, 0, 12], '아빠 3개월 → 특례 3개월, 동시엔 소급 없음')

// 1년 초과 요청 클램프
const p2 = plan({ ...base, momMonths: 18, dadMonths: 2 })
eq([p2.momMonths, p2.clampedMom], [12, true], '아빠 3개월 미만이면 엄마 12개월로 제한')
eq(plan({ ...base, who: 'single', momMonths: 18 }).momMonths, 18, '한부모 18개월')
eq(plan({ ...base, who: 'single', momMonths: 3, momWage: 4_000_000 }).total, 9_000_000, '한부모 3개월 900만')
eq(plan({ ...base, who: 'one' }).dad.length, 0, '한 명만이면 아빠 행 없음')

// 순서 비교: 엄마 먼저는 6+6, 아빠 먼저(아빠 6 → 엄마 생후 9개월 시작)도 6+6
const c = compareOrders(base)
eq(c.map((x) => x.eligible66), [true, true, true], '세 순서 모두 6+6')
eq(c[0].total === c[1].total && c[1].total === c[2].total, true, '6+6이면 순서와 무관하게 총액 동일')
eq(c[2].careMonths, 12, '동시 사용 돌봄 12개월')
eq(c[2].lowest < c[0].lowest, true, '동시 사용이 가구 최저소득 더 낮음')

// 근로시간 단축 (2026.1~ 상한 250/160)
eq(reducedHours(3_000_000, 40, 30), { cut: 10, first: 625_000, rest: 0, gov: 625_000, company: 2_250_000, total: 2_875_000 }, '40→30: 250만×10/40')
eq(reducedHours(3_000_000, 40, 25).rest, 200_000, '나머지 5h: 160만×5/40')
eq(reducedHours(2_000_000, 40, 30).first, 500_000, '통상임금 200만 → 200만×10/40')
eq(reducedHours(400_000, 40, 30).first, 125_000, '하한 50만×10/40')
eq(reducedHours(3_000_000, 35, 25).first, 714_285, '35h 기준: 250만×10/35')
eq(reducedHours(3_000_000, 40, 14).gov, 0, '단축 후 15시간 미만은 불가')
eq(reducedHours(3_000_000, 40, 40).gov, 0, '단축 없음')
eq([maxReduceMonths(0), maxReduceMonths(6), maxReduceMonths(12)], [36, 24, 12], '단축 가능 기간')

if (fail) { console.log(`${fail} FAILED`); process.exit(1) }
console.log('check-parental-leave OK')
