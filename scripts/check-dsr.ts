// DSR 계산 회귀 체크: node scripts/check-dsr.ts
import { schedule } from '../src/utils/loanSchedule.ts'
import { annualRepay as scheduleAnnual } from '../src/utils/loanQuick.ts'
import { annualRepay, stressRatio, stressAdd, maxNewLoan, dsr, type NewLoanSpec } from '../src/utils/dsr.ts'

let fail = 0
const eq = (a: unknown, b: unknown, msg: string) => { if (JSON.stringify(a) !== JSON.stringify(b)) { fail++; console.log('FAIL', msg, JSON.stringify(a), '!=', JSON.stringify(b)) } }
const near = (a: number, b: number, tol: number, msg: string) => { if (Math.abs(a - b) > tol) { fail++; console.log('FAIL', msg, a, '!~', b) } }

// 분할상환 주담대 = 대출 스케줄(loanSchedule)의 첫 12회차 합과 일치 (원 단위 반올림·이자 절사 오차만)
for (const method of ['equalPayment', 'equalPrincipal'] as const) {
  const s = scheduleAnnual(schedule({ principal: 300_000_000, rate: 4, months: 360, method }))
  near(annualRepay({ kind: 'mortgage', amount: 300_000_000, rate: 4, years: 30, method }), s, 100, `주담대 ${method} = 스케줄`)
}
near(annualRepay({ kind: 'installment', amount: 20_000_000, rate: 6, years: 3 }), scheduleAnnual(schedule({ principal: 20_000_000, rate: 6, months: 36, method: 'equalPayment' })), 20, '할부 3년 = 스케줄')
// 만기일시 주담대: 원금 ÷ min(만기, 10년) + 이자
eq(Math.round(annualRepay({ kind: 'mortgage', amount: 300_000_000, rate: 4, years: 30, method: 'bullet' })), 42_000_000, '일시상환 30년 → 10년 상한')
eq(Math.round(annualRepay({ kind: 'mortgage', amount: 100_000_000, rate: 5, years: 5, method: 'bullet' })), 25_000_000, '일시상환 5년')
// 신용대출·마통: 원금 ÷ 5년 + 이자
eq(annualRepay({ kind: 'credit', amount: 50_000_000, rate: 5, years: 1 }), 12_500_000, '신용대출 5천 5%')
eq(annualRepay({ kind: 'revolving', amount: 30_000_000, rate: 6, years: 1 }), 7_800_000, '마통 한도 3천 6%')
// 전세대출: 이자만, 반영 대상일 때만
eq(annualRepay({ kind: 'jeonse', amount: 200_000_000, rate: 4, years: 2, counted: true }), 8_000_000, '전세 반영')
eq(annualRepay({ kind: 'jeonse', amount: 200_000_000, rate: 4, years: 2, counted: false }), 0, '전세 미반영')

// 반영비율(30년 만기)
eq([5, 10, 15, 20].map((f) => stressRatio('mixed', f, 30)), [0.8, 0.6, 0.4, 0.4], '혼합형')
eq([5, 10, 15].map((f) => stressRatio('periodic', f, 30)), [0.4, 0.3, 0.2], '주기형')
eq([stressRatio('variable', 0, 30), stressRatio('fixed', 0, 30), stressRatio('mixed', 3, 30)], [1, 0, 1], '변동·고정·혼합<5년')

const M: NewLoanSpec = { kind: 'mortgage', rate: 4, years: 30, method: 'equalPayment', rateType: 'variable', fixedYears: 5, region: 'capital' }
// 수도권 3.0%, 5년 혼합 2.4%, 5년 주기 1.2% (뱅크몰 30년 만기 예시), 지방 0.75%
eq([stressAdd(M), stressAdd({ ...M, rateType: 'mixed' }), stressAdd({ ...M, rateType: 'periodic' }), stressAdd({ ...M, rateType: 'fixed' })], [3, 2.4, 1.2, 0], '수도권 가산')
eq([stressAdd({ ...M, region: 'local' }), stressAdd({ ...M, region: 'local', rateType: 'mixed' })], [0.75, 0.6], '지방 가산')
const C: NewLoanSpec = { ...M, kind: 'credit', rate: 5 }
eq([stressAdd(C, 90_000_000), stressAdd(C, 110_000_000), stressAdd({ ...C, rateType: 'fixed' }, 110_000_000)], [0, 1.5, 0], '신용대출 1억 초과만')

// 역산: 월 100만원 여력(연소득 3천만 × 40%) · 30년 원리금균등 → 4% 2억946만, 7% 1억5,031만 (뱅크몰 예시)
eq(maxNewLoan(30_000_000, 40, [], M, false), 209_460_000, '역산 4%')
near(maxNewLoan(30_000_000, 40, [], M, true), 150_310_000, 10_000, '역산 4%+3.0% (만원 내림)')
eq(maxNewLoan(30_000_000, 50, [], M, false) > maxNewLoan(30_000_000, 40, [], M, false), true, '2금융권 한도 > 은행')
// 기존 대출이 여력을 넘으면 0
eq(maxNewLoan(30_000_000, 40, [{ kind: 'credit', amount: 50_000_000, rate: 5, years: 1 }], M, true), 0, '여력 없음')
// 신용대출 역산: 1억 이하 무가산 / 1억 경계 / 초과 시 가산
eq(maxNewLoan(50_000_000, 40, [], C, true), 80_000_000, '신용 8천 (1억 이하)')
eq(maxNewLoan(64_375_000, 40, [], C, true), 100_000_000, '신용 1억 경계까지는 무가산')
eq(maxNewLoan(120_000_000, 40, [], C, true), Math.floor(48_000_000 / 0.265 / 1e4) * 1e4, '신용 1억 초과 → 6.5% 기준')

eq(dsr(50_000_000, 20_000_000), 40, 'DSR 40%')

if (fail) { console.log(`${fail} failed`); process.exit(1) }
console.log('check-dsr: all passed')
