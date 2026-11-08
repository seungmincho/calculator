// 퇴사하면 받는 돈 계산기(/resignation-pay) 회귀 체크: node scripts/check-resignation-pay.ts
// page.tsx 본문·FAQ 숫자는 EXAMPLES로 렌더링되므로 여기서 값을 고정한다.
import assert from 'node:assert/strict'
import { calcRetirement } from '../src/utils/retirementPay.ts'
import { avgDailyWage, dailyBenefit } from '../src/utils/unemploymentBenefit.ts'
import { calc as yearEnd, DEFAULT_INPUT } from '../src/utils/yearEndTax.ts'
import { wageTax } from '../src/utils/wageTaxTable.ts'
import { compute, simulate, EXAMPLES, DEF } from '../src/utils/resignationPay.ts'

// ── 기본 예시: 2023.3.2 입사, 2026.12.31 마지막 근무, 월 350만, 남은 연차 5일, 권고사직, 34세 ──
const d = compute(DEF)!
// 퇴직금: 350만 × 3 ÷ 92일(10.1~12.31) × 30 × 재직 1,401일 ÷ 365
assert.equal(d.sev.days, 1401)
assert.equal(d.sev.pay, Math.floor((10_500_000 * 30 * 1401) / (92 * 365)))
assert.equal(d.sev.pay, 13_142_197)
// 퇴직소득세: 근속 4년(끝수 올림) → 공제 400만, 환산 27,426,591 − 19,655,954 = 7,770,637 × 6% × 4/12 → 155,410 + 지방 15,540
assert.deepEqual([d.sev.taxYears, d.sev.tax, d.sev.localTax, d.sev.net], [4, 155_410, 15_540, 12_971_247])
// 연차수당: 350만 ÷ 209 × 8 = 133,971원 × 5일. 이번 해 쓸 수 있는 연차 16일(2026.3.2 발생), 다음 발생 2027.3.2
assert.deepEqual([d.daily, d.leavePay, d.lv.active, d.lv.next?.date], [133_971, 669_855, 16, '2027-03-02'])
// 실업급여: 114,130 × 60% = 68,478 → 2026 상한 68,100 × 180일(50세 미만·3~5년)
assert.deepEqual([d.ue.daily, d.ue.applied, d.ue.days, d.ue.total, d.ue.eligible], [68_100, 'cap', 180, 12_258_000, true])
assert.deepEqual([d.ue.applyFrom, d.ue.applyUntil, d.payBy], ['2027-01-01', '2027-12-31', '2027-01-15'])
// 연말정산: 기납부 = 간이세액표(350만, 1인) × 12, 총급여 = 4,200만 + 연차수당
assert.equal(d.tax.prepaid, wageTax(3_500_000, 1) * 12)
assert.deepEqual([d.tax.salary, d.tax.prepaid, d.tax.refund], [42_669_855, 1_526_640, -392_320])
// 합계 = 퇴직금 세후 + 연차수당 + 연말정산(추가 납부면 −) + 실업급여
assert.equal(d.sure, 12_971_247 + 669_855 - 392_320)
assert.equal(d.total, d.sure + 12_258_000)
assert.equal(d.total, 25_506_782)

// ── 재사용 util과 같은 값 ──
assert.deepEqual(d.sev, calcRetirement({ start: DEF.start, end: '2027-01-01', monthly: DEF.monthly, bonus: 0, leave: 0 }))
{ // 상여는 평균임금에 3/12 — 퇴직금·실업급여 같은 기준
  const x = { ...DEF, bonus: 6_000_000 }
  const r = compute(x)!
  assert.equal(r.sev.pay, calcRetirement({ start: x.start, end: '2027-01-01', monthly: x.monthly, bonus: x.bonus, leave: 0 })!.pay)
  assert.equal(r.ue.daily, dailyBenefit(avgDailyWage(x.monthly + x.bonus / 12, x.last), 8, x.last).daily)
  assert.equal(r.tax.salary, 42_000_000 + 6_000_000 + r.leavePay)
  const y = yearEnd({ ...DEFAULT_INPUT, credit: 0, debit: 0, culture: 0, market: 0, transport: 0, salary: r.tax.salary, others: 0, prepaid: r.tax.prepaid })
  assert.equal(r.tax.refund, y.refund)
}

// ── 1년 미만: 퇴직금 0, 1년 되는 날(2027.3.1 마지막 근무)엔 생김 ──
{
  const r = compute(EXAMPLES.short)!
  assert.deepEqual([r.sev.eligible, r.sev.pay, r.sev.net, r.sev.oneYearEnd], [false, 0, 0, '2027-03-02'])
  assert.deepEqual([r.ue.period, r.ue.days, r.ue.eligible], ['under1', 120, true]) // 재직 305일 × 6/7 = 261 ≥ 180
  const sim = simulate(EXAMPLES.short, r)
  assert.deepEqual(sim.map((s) => s.key), ['now', 'nextLeave', 'oneYear']) // 한 달 안 연차 발생이라 '한 달 뒤' 생략
  const one = sim.find((s) => s.key === 'oneYear')!
  assert.deepEqual([one.last, one.sevEligible, one.sev > 0, one.added], ['2027-03-01', true, true, 2])
}

// ── 자발적 퇴사: 실업급여 0, 합계 = 확실히 받는 돈 ──
{
  const r = compute(EXAMPLES.voluntary)!
  assert.deepEqual([r.ue.eligible, r.ue.involuntary, r.total === r.sure], [false, false, true])
  assert.equal(r.total, 13_248_782)
}

// ── 피보험 단위기간 180일 미만(재직 122일 × 6/7 = 104) → 대상 아님 ──
{ const r = compute({ ...DEF, start: '2026-09-01' })!; assert.deepEqual([r.ue.unitDays, r.ue.insuredOk, r.ue.eligible], [104, false, false]) }

// ── 사용한 일수로 입력: 16 − 11 = 남은 5일 ──
assert.equal(compute({ ...DEF, leaveMode: 'used', leaveDays: 11 })!.leavePay, 669_855)
assert.equal(compute({ ...DEF, leaveMode: 'used', leaveDays: 30 })!.leavePay, 0)

// ── 50세 이상·장애인: 3~5년이면 210일 ──
assert.equal(compute({ ...DEF, age: 50 })!.ue.days, 210)
assert.equal(compute({ ...DEF, disabled: true })!.ue.days, 210)

// ── 퇴사일 바꿔 보기: 2027년 이직은 하한 68,480(최저임금 10,700 × 80% × 8) > 상한 68,100 ──
{
  const sim = simulate(DEF, d)
  assert.deepEqual(sim.map((s) => [s.key, s.last]), [['now', '2026-12-31'], ['nextMonth', '2027-01-31'], ['nextLeave', '2027-03-02']])
  assert.deepEqual(sim.map((s) => s.ueDaily), [68_100, 68_480, 68_480])
  const nl = sim[2]
  assert.deepEqual([nl.added, nl.leavePay], [16, Math.round(21 * 133_971)])
  assert.equal(sim[0].sum, d.sev.net + d.leavePay + d.ue.total)
}

// ── 잘못된 입력 ──
assert.equal(compute({ ...DEF, last: '2020-01-01' }), null)
assert.equal(compute({ ...DEF, start: '2026-02-30' }), null)

console.log('check-resignation-pay OK')
