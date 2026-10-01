// 적금·예금 계산 회귀 체크: node scripts/check-savings.ts
import { calc, schedule, requiredAmount, savingToDepositRate, depositToSavingRate, interestPerWon } from '../src/utils/savings.ts'

let fail = 0
const eq = (name: string, got: number, want: number, tol = 0.5) => {
  if (Math.abs(got - want) > tol) { fail++; console.log('FAIL', name, got, '!=', want) }
}

// 은행 공식: 월 100만원 12개월 연 5% 단리 → 세전 325,000 / 세금 50,050 / 세후 274,950 / 만기 12,274,950
let r = calc({ kind: 'saving', amount: 1_000_000, rate: 5, months: 12, compound: false, tax: 'normal' })
eq('saving gross', r.gross, 325_000); eq('saving tax', r.tax, 50_050); eq('saving net', r.net, 274_950)
eq('saving maturity', r.maturity, 12_274_950); eq('saving principal', r.principal, 12_000_000)
// 세금우대 9.5% / 조합 1.4% / 비과세
eq('pref tax', calc({ kind: 'saving', amount: 1_000_000, rate: 5, months: 12, compound: false, tax: 'pref' }).tax, 30_875)
eq('coop tax', calc({ kind: 'saving', amount: 1_000_000, rate: 5, months: 12, compound: false, tax: 'coop' }).tax, 4_550)
eq('free net', calc({ kind: 'saving', amount: 1_000_000, rate: 5, months: 12, compound: false, tax: 'free' }).net, 325_000)
// 월 50만원 24개월 3.5% 단리: 500000 × 0.035/12 × 300 = 437,500
eq('24m gross', calc({ kind: 'saving', amount: 500_000, rate: 3.5, months: 24, compound: false, tax: 'normal' }).gross, 437_500)
// 월복리 적금: 월 100만원 12개월 5% — Σ 1e6((1+i)^k−1), k=1..12 ≈ 330,017
eq('saving compound', calc({ kind: 'saving', amount: 1_000_000, rate: 5, months: 12, compound: true, tax: 'free' }).gross, 330_017, 2)
// 예금: 1,000만원 12개월 3% 단리 → 300,000 / 세후 253,800
r = calc({ kind: 'deposit', amount: 10_000_000, rate: 3, months: 12, compound: false, tax: 'normal' })
eq('deposit gross', r.gross, 300_000); eq('deposit net', r.net, 253_800); eq('deposit yearly', r.yearly, 2.538, 0.001)
// 예금 월복리 12개월 3%: 1e7 × (1.0025^12 − 1) = 304,159
eq('deposit compound', calc({ kind: 'deposit', amount: 10_000_000, rate: 3, months: 12, compound: true, tax: 'free' }).gross, 304_159, 1)
// 적금 5% 12개월 = 예금 2.708% (흔한 오해 포인트)
eq('equiv rate', savingToDepositRate(5, 12), 2.7083, 0.0001)
eq('equiv roundtrip', depositToSavingRate(savingToDepositRate(5, 12), 12), 5, 1e-9)
eq('equiv via calc', calc({ kind: 'saving', amount: 1_000_000, rate: 5, months: 12, compound: false, tax: 'free' }).yearly, 2.7083, 0.0001)
// 스케줄 마지막 달 = 총 이자
const s = schedule({ kind: 'saving', amount: 1_000_000, rate: 5, months: 12, compound: false, tax: 'normal' })
eq('schedule last', s[11].interest, 325_000); eq('schedule m1', s[0].interest, 4_166, 1)
eq('schedule compound last', schedule({ kind: 'saving', amount: 1_000_000, rate: 5, months: 12, compound: true, tax: 'normal' })[11].interest, 330_017, 2)
// 역산: 세후 1,000만원 / 12개월 / 4% 단리 / 일반과세 → 만기 ≥ 1,000만원, 1원 적으면 미달
const need = requiredAmount(10_000_000, 'saving', 4, 12, false, 'normal')
eq('goal reach', calc({ kind: 'saving', amount: need, rate: 4, months: 12, compound: false, tax: 'normal' }).maturity >= 10_000_000 ? 1 : 0, 1)
eq('goal minimal', calc({ kind: 'saving', amount: need - 1, rate: 4, months: 12, compound: false, tax: 'normal' }).maturity < 10_000_000 ? 1 : 0, 1)
eq('goal approx', need, 10_000_000 / (12 + 0.04 / 12 * 78 * 0.846), 2)
const needD = requiredAmount(10_000_000, 'deposit', 3, 12, false, 'normal')
eq('goal deposit', needD, 9_752_483, 1) // 1e7 / (1 + 0.03 × 0.846)
eq('zero rate', interestPerWon('saving', 0, 12, true), 0)
eq('zero months', calc({ kind: 'saving', amount: 1, rate: 5, months: 0, compound: false, tax: 'normal' }).maturity, 0)

if (fail) { console.log(`${fail} failed`); process.exit(1) }
console.log('check-savings OK')
