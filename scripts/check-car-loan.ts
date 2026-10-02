// 자동차 할부 회귀 체크: node scripts/check-car-loan.ts
import { carLoan, carTax, burden, burdenLevel, type CarLoanInput } from '../src/utils/carLoan.ts'
import { schedule } from '../src/utils/loanSchedule.ts'

let fail = 0
const eq = (name: string, got: unknown, want: unknown, tol = 0) => {
  const ok = typeof want === 'number' ? Math.abs((got as number) - want) <= tol : got === want
  if (!ok) { fail++; console.log('FAIL', name, got, '!=', want) }
}
// 엑셀 PMT(rate, nper, pv, fv) — 부호 규약 그대로
const pmt = (r: number, n: number, pv: number, fv = 0) => -(pv * Math.pow(1 + r, n) + fv) * r / (Math.pow(1 + r, n) - 1)

const base: CarLoanInput = { price: 35_000_000, options: 0, discount: 0, down: 10_500_000, months: 48, rate: 6, balloonPct: 0, fuel: 'normal', extra: 0 }
const c = (o: Partial<CarLoanInput>) => carLoan({ ...base, ...o })

// 기본값: 3,500만 · 선수금 30% · 48개월 · 6% → 원금 2,450만
let r = c({})
eq('principal', r.principal, 24_500_000)
eq('monthly = 엑셀 PMT 575,383', r.monthly, 575_383, 1)
const s = schedule({ principal: 24_500_000, rate: 6, months: 48, method: 'equalPayment' })
eq('monthly = loanSchedule', r.monthly, s.firstPayment)
eq('totalInterest = loanSchedule', r.totalInterest, s.totalInterest)
eq('원금 합 = 할부 원금', r.rows.reduce((a, x) => a + x.principal, 0), 24_500_000)
eq('rows 48', r.rows.length, 48); eq('last balance 0', r.rows[47].balance, 0)

// 취득세: 3,500만 / 1.1 × 7% (10원 미만 절사)
eq('tax 7%', r.tax.tax, Math.floor(35_000_000 / 1.1 * 0.07 / 10) * 10)
eq('tax 2,227,270', r.tax.tax, 2_227_270)
eq('upfront', r.upfront, 10_500_000 + 2_227_270)
eq('total', r.total, 35_000_000 + r.totalInterest + 2_227_270)

// 여러 조건에서 loanSchedule과 일치
for (const months of [12, 24, 36, 48, 60]) for (const rate of [0, 3.9, 6, 9.5, 15]) {
  const x = c({ months, rate, down: 0 })
  const y = schedule({ principal: 35_000_000, rate, months, method: 'equalPayment' })
  eq(`sched ${months}m ${rate}%`, x.monthly, y.firstPayment)
  eq(`interest ${months}m ${rate}%`, x.totalInterest, y.totalInterest)
}

// 유예 할부 30%: 유예금 1,050만 → 월 납입 = 엑셀 PMT(0.5%, 48, −2,450만, 1,050만) = 381,290
r = c({ balloonPct: 30 })
eq('balloon', r.balloon, 10_500_000)
eq('balloon monthly = PMT FV', r.monthly, Math.round(pmt(0.005, 48, -24_500_000, 10_500_000)), 2)
eq('balloon monthly 381,290', r.monthly, 381_290, 2)
eq('마지막 회차에 유예금 포함', r.rows[47].principal > 10_500_000, true)
eq('balloon 원금 합', r.rows.reduce((a, x) => a + x.principal, 0), 24_500_000)
eq('balloon 잔액 = 유예금 유지', r.rows[46].balance > 10_500_000, true)
// 유예 할부는 월 납입이 낮지만 총이자는 큼
eq('balloon 이자 > 일반', r.totalInterest > c({}).totalInterest, true)
// 선수금 0, 36개월, 유예 30% — PMT(0.5%, 36, −3,500만, 1,050만) = 797,837
eq('balloon 36m no down', c({ down: 0, months: 36, balloonPct: 30 }).monthly, 797_837, 2)
// 유예율이 원금보다 크면 원금으로 잘림 → 매달 이자만
r = c({ balloonPct: 60, down: 21_000_000 })
eq('balloon clamp', r.balloon, 14_000_000); eq('interest only', r.monthly, 70_000)

// 옵션·할인, 선수금 > 차값 클램프
eq('carPrice', c({ options: 2_000_000, discount: 1_000_000 }).carPrice, 36_000_000)
eq('down clamp', c({ down: 99_000_000 }).principal, 0)
eq('no loan monthly', c({ down: 99_000_000 }).monthly, 0)

// 경차 4% · 감면 75만 한도, 전기차 7% · 140만 감면
eq('light 2,500만', carTax(25_000_000, 'light').pay, Math.floor(25_000_000 / 1.1 * 0.04 / 10) * 10 - 750_000)
eq('light 1,500만 → 0', carTax(15_000_000, 'light').pay, 0)
eq('ev 5,000만', carTax(50_000_000, 'ev').pay, Math.floor(50_000_000 / 1.1 * 0.07 / 10) * 10 - 1_400_000)
eq('normal no relief', carTax(50_000_000, 'normal').relief, 0)

// 소득 대비 부담
eq('burden', burden(900_000, 3_000_000), 30); eq('burden none', burden(1, 0), null)
eq('level', [10, 20, 30].map(burdenLevel).join(), 'ok,mid,high')

if (fail) { console.log(`${fail} failed`); process.exit(1) }
console.log('check-car-loan: all passed')
