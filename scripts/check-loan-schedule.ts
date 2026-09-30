// 대출 상환 스케줄 회귀 체크: node scripts/check-loan-schedule.ts
import assert from 'node:assert/strict'
import { schedule, prepayFee, yearly, payDate, type LoanInput, type Method } from '../src/utils/loanSchedule.ts'

const sumP = (r: ReturnType<typeof schedule>) => r.rows.reduce((s, x) => s + x.principal + x.prepay, 0)
const base: LoanInput = { principal: 300_000_000, rate: 4.5, months: 360, method: 'equalPayment' }

// 원금 합계 = 대출금 (모든 방식, 거치/금리변동/중도상환 조합)
const methods: Method[] = ['equalPayment', 'equalPrincipal', 'bullet', 'graduated']
for (const method of methods) {
  for (const extra of [
    {}, { grace: 12 }, { rateChangeMonth: 60, newRate: 5.5 }, { growth: 2 },
    { prepay: { month: 36, amount: 50_000_000, feeRate: 0.65, mode: 'shorten' as const } },
    { prepay: { month: 36, amount: 50_000_000, feeRate: 0.65, mode: 'reduce' as const } },
    { principal: 12_345_679, rate: 0, months: 7 },
  ]) {
    const r = schedule({ ...base, method, ...extra })
    const P = (extra as { principal?: number }).principal ?? base.principal
    assert.equal(sumP(r), P, `${method} ${JSON.stringify(extra)}`)
    assert.equal(r.rows[r.rows.length - 1].balance, 0)
    assert.ok(r.rows.every((x) => Number.isInteger(x.payment) && Number.isInteger(x.interest)))
  }
}

// 원리금균등 3억 4.5% 30년: 월 1,520,056원 (표준 공식), 총 이자 ≈ 2.47억
const ep = schedule(base)
assert.equal(ep.firstPayment, 1_520_056)
assert.equal(ep.months, 360)
assert.ok(ep.rows.slice(0, -1).every((x) => x.payment === 1_520_056))
assert.ok(Math.abs(ep.lastPayment - 1_520_056) < 1000, `last ${ep.lastPayment}`)
assert.ok(Math.abs(ep.totalInterest - (1_520_056 * 360 - 300_000_000)) < 1000)
// 첫 달 이자 = floor(3억 × 0.045/12) = 1,125,000
assert.equal(ep.rows[0].interest, 1_125_000)

// 원금균등: 원금 833,333 × 359 + 마지막 흡수, 총 이자 ≈ P·r·(n+1)/2
const eq = schedule({ ...base, method: 'equalPrincipal' })
assert.equal(eq.rows[0].principal, 833_333)
assert.equal(eq.rows[359].principal, 300_000_000 - 833_333 * 359)
assert.ok(Math.abs(eq.totalInterest - 300_000_000 * 0.00375 * 361 / 2) < 400)
assert.ok(eq.totalInterest < ep.totalInterest)

// 만기일시: 매월 이자만, 마지막에 원금
const bl = schedule({ ...base, method: 'bullet' })
assert.equal(bl.rows[0].payment, 1_125_000)
assert.equal(bl.rows[359].principal, 300_000_000)
assert.equal(bl.totalInterest, 1_125_000 * 360)

// 체증식: 초기 상환액 < 원리금균등, 1년 후 증가
const gr = schedule({ ...base, method: 'graduated', growth: 2 })
assert.ok(gr.firstPayment < ep.firstPayment)
assert.ok(gr.rows[12].payment > gr.rows[11].payment)
assert.ok(gr.totalInterest > ep.totalInterest)

// 거치 12개월: 이자만 → 이후 348개월 원리금균등
const gc = schedule({ ...base, grace: 12 })
assert.ok(gc.rows.slice(0, 12).every((x) => x.grace && x.principal === 0 && x.interest === 1_125_000))
assert.equal(gc.graceInterest, 1_125_000)
assert.ok(gc.firstPayment > ep.firstPayment)
assert.equal(gc.months, 360)

// 금리 변동: 60회차까지 4.5%, 61회차부터 5.5% → 상환액 재계산, 증가
const rc = schedule({ ...base, rateChangeMonth: 60, newRate: 5.5 })
assert.equal(rc.rows[59].payment, 1_520_056)
assert.equal(rc.rows[60].rate, 5.5)
assert.ok(rc.rows[60].payment > rc.rows[59].payment)
assert.ok(rc.rows.slice(60, -1).every((x) => x.payment === rc.rows[60].payment))
assert.ok(rc.totalInterest > ep.totalInterest)

// 중도상환 5천만 at 36회차, 수수료 0.65%: 기간 단축 vs 월 상환액 감소
const fee = prepayFee(50_000_000, 0.65, 36, 360)
assert.equal(fee, 0) // 3년 경과 → 면제
assert.equal(prepayFee(50_000_000, 0.65, 12, 360), Math.floor(50_000_000 * 0.0065 * 24 / 36)) // 216,666
assert.equal(prepayFee(10_000_000, 1, 6, 24), Math.floor(10_000_000 * 0.01 * 18 / 24)) // 대출기간 < 3년
const sh = schedule({ ...base, prepay: { month: 12, amount: 50_000_000, feeRate: 0.65, mode: 'shorten' } })
const rd = schedule({ ...base, prepay: { month: 12, amount: 50_000_000, feeRate: 0.65, mode: 'reduce' } })
assert.equal(sh.fee, 216_666)
assert.equal(sh.rows[11].prepay, 50_000_000)
assert.ok(sh.months < 360, `shorten months ${sh.months}`)
assert.equal(sh.rows[12].payment, 1_520_056) // 월 상환액 유지
assert.equal(rd.months, 360)
assert.ok(rd.rows[12].payment < 1_520_056) // 월 상환액 감소
assert.ok(sh.totalInterest < rd.totalInterest && rd.totalInterest < ep.totalInterest)
// 원금균등 기간 단축: 원금 833,333 유지 → 60개월 단축
const eqs = schedule({ ...base, method: 'equalPrincipal', prepay: { month: 12, amount: 50_000_000, feeRate: 0, mode: 'shorten' } })
assert.equal(eqs.rows[12].principal, 833_333)
assert.equal(eqs.months, 300)
// 잔액보다 큰 중도상환 → 전액 상환 후 종료
const all = schedule({ ...base, prepay: { month: 24, amount: 1e12, feeRate: 0, mode: 'shorten' } })
assert.equal(all.months, 24)
assert.equal(sumP(all), 300_000_000)

// 연도별 합계
const ys = yearly(ep.rows)
assert.equal(ys.length, 30)
assert.equal(ys.reduce((s, y) => s + y.principal, 0), 300_000_000)
assert.equal(ys[0].to, 12)

// 납입일 말일 보정, 연도 넘김
assert.equal(payDate('2026-01-31', 1), '2026.02.28')
assert.equal(payDate('2028-01-31', 1), '2028.02.29')
assert.equal(payDate('2026-11-15', 2), '2027.01.15')
assert.equal(payDate('bad', 1), '')

console.log('check-loan-schedule OK', { ep: ep.totalInterest, eq: eq.totalInterest, sh: [sh.months, sh.totalInterest], rd: rd.totalInterest })
