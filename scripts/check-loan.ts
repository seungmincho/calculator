// 대출 계산기 회귀 체크: node scripts/check-loan.ts
import { schedule, type Method } from '../src/utils/loanSchedule.ts'
import { maxPrincipal, annualRepay } from '../src/utils/loanQuick.ts'

let fail = 0
const eq = (a: unknown, b: unknown, msg: string) => {
  if (JSON.stringify(a) !== JSON.stringify(b)) { fail++; console.log('FAIL', msg, JSON.stringify(a), '!=', JSON.stringify(b)) }
}
const near = (a: number, b: number, tol: number, msg: string) => {
  if (!(Math.abs(a - b) <= tol)) { fail++; console.log('FAIL', msg, a, '!~', b) }
}

// 3억 4.5% 30년 원리금균등: 표준 공식 월 1,520,056원
const ep = schedule({ principal: 3e8, rate: 4.5, months: 360, method: 'equalPayment' })
eq(ep.firstPayment, 1520056, '원리금균등 월 상환액')
eq(ep.rows.reduce((s, x) => s + x.principal, 0), 3e8, '원금 합계 = 대출금')
near(ep.totalInterest, 1520056 * 360 - 3e8, 1000, '원리금균등 총 이자 ≈ 월×n−P')

// 원금균등: 총 이자 ≈ P·r·(n+1)/2, 첫 달 = P/n + P·r
const eqp = schedule({ principal: 3e8, rate: 4.5, months: 360, method: 'equalPrincipal' })
eq(eqp.firstPayment, Math.round(3e8 / 360) + Math.floor(3e8 * 0.045 / 12), '원금균등 첫 달')
near(eqp.totalInterest, 3e8 * 0.045 / 12 * 361 / 2, 400, '원금균등 총 이자')

// 만기일시: 월 이자 = P·r, 총 이자 = P·r·n
const bl = schedule({ principal: 3e8, rate: 4.5, months: 360, method: 'bullet' })
eq(bl.rows[0].payment, 1125000, '만기일시 월 이자')
eq(bl.totalInterest, 1125000 * 360, '만기일시 총 이자')
eq(bl.lastPayment, 3e8 + 1125000, '만기일시 마지막 회차')

// 거치 24개월: 거치 중 이자만, 이후 336개월 원리금균등
const gr = schedule({ principal: 3e8, rate: 4.5, months: 360, grace: 24, method: 'equalPayment' })
eq(gr.graceInterest, 1125000, '거치 이자')
const r = 0.045 / 12
eq(gr.firstPayment, Math.round(3e8 * r * Math.pow(1 + r, 336) / (Math.pow(1 + r, 336) - 1)), '거치 후 월 상환액')

// 역산: 구한 원금의 첫 상환액 ≤ 예산, 1만원 더 빌리면 초과(만원 단위 최대)
const cases: [number, number, number, number, Method][] = [
  [1500000, 4.5, 360, 0, 'equalPayment'], [1500000, 4.5, 360, 0, 'equalPrincipal'], [1500000, 4.5, 360, 0, 'bullet'],
  [800000, 3.2, 240, 12, 'equalPayment'], [800000, 3.2, 240, 12, 'equalPrincipal'], [500000, 0, 120, 0, 'equalPayment'],
  [2345678, 6.9, 60, 0, 'equalPayment'], [2345678, 6.9, 60, 6, 'equalPrincipal'],
]
for (const [pay, rate, months, grace, method] of cases) {
  const P = maxPrincipal(pay, rate, months, grace, method)
  const tag = `${method} ${pay}/${rate}%/${months}m/${grace}`
  const a = schedule({ principal: P, rate, months, grace, method })
  const pay1 = method === 'bullet' ? a.rows[0].payment : a.firstPayment
  if (pay1 > pay) { fail++; console.log('FAIL 역산 초과', tag, P, pay1) }
  const b = schedule({ principal: P + 2e4, rate, months, grace, method })
  const pay2 = method === 'bullet' ? b.rows[0].payment : b.firstPayment
  if (pay2 <= pay) { fail++; console.log('FAIL 역산 덜 빌림', tag, P, pay2) }
}
eq(maxPrincipal(1500000, 4.5, 360, 0, 'equalPayment'), 296040000, '역산 150만원 4.5% 30년')
eq(maxPrincipal(1125000, 4.5, 360, 0, 'bullet'), 3e8, '역산 만기일시')
eq(maxPrincipal(100000, 0, 120, 0, 'bullet'), Infinity, '역산 0% 만기일시 무한')
eq(maxPrincipal(100000, 4, 120, 120, 'equalPayment'), 0, '역산 거치 ≥ 기간')

// DSR 연간 원리금: 거치 후 첫 12회차
eq(annualRepay(ep), 1520056 * 12, '연 원리금 원리금균등')
eq(annualRepay(gr), gr.firstPayment * 12, '연 원리금 거치 제외')
eq(annualRepay(schedule({ principal: 1e7, rate: 5, months: 6, method: 'equalPayment' })), 1e7 + schedule({ principal: 1e7, rate: 5, months: 6, method: 'equalPayment' }).totalInterest, '12회차 미만 = 전체')

console.log(fail ? `${fail} FAILED` : 'all ok')
if (fail) process.exit(1)
