// 카드 할부 계산 회귀 체크: node scripts/check-card-installment.ts
import { calcInstallment } from '../src/utils/cardInstallment.ts'
let fail = 0
const eq = (name: string, got: number, want: number) => { if (got !== want) { fail++; console.log('FAIL', name, got, '!=', want) } }

// 120만원 12개월 연 12% (월 1%): 수수료 = 1% × (120+110+...+10)만 = 78,000
const a = calcInstallment(1_200_000, 12, 12)
eq('12m fee', a.totalFee, 78_000)
eq('12m first', a.firstPayment, 112_000)
eq('12m last balance', a.schedule[11].balance, 0)
eq('12m total', a.totalPayment, 1_278_000)
// 무이자
eq('free fee', calcInstallment(1_200_000, 12, 12, 0).totalFee, 0)
// 부분무이자 1~3회차 부담: 1%×(120+110+100)만 = 33,000
eq('partial fee', calcInstallment(1_200_000, 12, 12, 3).totalFee, 33_000)
// 나누어떨어지지 않음: 원금 합계 보존
const b = calcInstallment(1_000_000, 3, 15)
eq('rem principal sum', b.schedule.reduce((s, r) => s + r.principal, 0), 1_000_000)
eq('rem first principal', b.schedule[0].principal, 333_334)
// 잘못된 입력
eq('zero', calcInstallment(0, 12, 10).schedule.length, 0)
eq('neg months', calcInstallment(1000, -1, 10).schedule.length, 0)
console.log(fail ? `${fail} failed` : 'all passed'); if (fail) process.exit(1)
