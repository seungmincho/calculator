// 복리 계산 회귀 체크: node scripts/check-compound.ts
import {
  simulate, simpleInterest, doublingYears, rule72, effectiveAnnual, annualizedReturn,
  realValue, realRate, requiredMonthly, requiredRate, type Plan,
} from '../src/utils/compound.ts'

let fail = 0
const near = (a: number | null, b: number, tol: number, msg: string) => {
  if (a === null || Math.abs(a - b) > tol) { fail++; console.log('FAIL', msg, a, '!=', b) }
}
const eq = (a: unknown, b: unknown, msg: string) => { if (JSON.stringify(a) !== JSON.stringify(b)) { fail++; console.log('FAIL', msg, JSON.stringify(a), '!=', JSON.stringify(b)) } }

// 엑셀 FV(rate, nper, pmt, pv, type) — 부호는 양수로 바꿔 씀
const excelFV = (r: number, n: number, pmt: number, pv: number, type: 0 | 1) =>
  r === 0 ? pv + pmt * n : pv * Math.pow(1 + r, n) + pmt * (1 + r * type) * (Math.pow(1 + r, n) - 1) / r

const base: Plan = { principal: 10_000_000, monthly: 0, rate: 5, months: 120, freq: 'yearly', timing: 'begin', tax: 'free', taxTiming: 'maturity' }

// 거치식: =FV(5%,10,0,-10000000) = 16,288,946.27
near(simulate(base).value, 16_288_946.27, 0.01, '연복리 1000만 5% 10년')
// =FV(5%/12,120,0,-10000000) = 16,470,094.98
near(simulate({ ...base, freq: 'monthly' }).value, 16_470_094.98, 0.01, '월복리')
near(simulate({ ...base, freq: 'quarterly' }).value, excelFV(0.05 / 4, 40, 0, 1e7, 0), 0.01, '분기복리')
near(simulate({ ...base, freq: 'semiannually' }).value, excelFV(0.025, 20, 0, 1e7, 0), 0.01, '반기복리')
near(simulate({ ...base, freq: 'daily' }).value, 1e7 * Math.pow(1 + 0.05 / 365, 3650), 0.01, '일복리')
// 연복리 18개월: 1.05^1.5
near(simulate({ ...base, months: 18 }).value, 1e7 * Math.pow(1.05, 1.5), 0.01, '연복리 18개월')

// 적립식: =FV(5%/12,120,-500000,0,1) = 77,964,644.47 (월초), type 0 = 77,641,139.71 (월말)
const dca: Plan = { ...base, principal: 0, monthly: 500_000, freq: 'monthly' }
near(simulate(dca).value, 77_964_644.47, 0.05, '월 50만 월초 10년')
near(simulate({ ...dca, timing: 'end' }).value, 77_641_139.71, 0.05, '월 50만 월말 10년')
// 연복리 적립 = FV((1.05)^(1/12)-1, ...)
near(simulate({ ...dca, freq: 'yearly', principal: 3e6 }).value, excelFV(Math.pow(1.05, 1 / 12) - 1, 120, 5e5, 3e6, 1), 0.05, '연복리 적립+원금')
// 이율 0
eq(simulate({ ...dca, rate: 0 }).value, 60_000_000, '0% = 납입 합')
eq(simulate(dca).principal, 60_000_000, '원금 합')

// 세금: 만기 일시과세 = 이자 × 15.4%
const t1 = simulate({ ...base, tax: 'normal' })
near(t1.tax, 6_288_946.27 * 0.154, 0.01, '만기 15.4%')
near(t1.value, 1e7 + 6_288_946.27 * 0.846, 0.01, '만기 세후')
// 매년 과세, 연복리 = 세후 연 5% × 0.846 로 굴림
near(simulate({ ...base, tax: 'normal', taxTiming: 'yearly' }).value, 1e7 * Math.pow(1 + 0.05 * 0.846, 10), 0.01, '매년 과세')
// 매년 과세가 만기 과세보다 적다 (세금 낸 만큼 덜 굴러감)
eq(simulate({ ...base, tax: 'normal', taxTiming: 'yearly' }).value < t1.value, true, '과세 이연 효과')
near(simulate({ ...base, tax: 'pref' }).tax, 6_288_946.27 * 0.095, 0.01, '세금우대 9.5%')
// 연도별 행: 10행, 마지막 = 결과
const rows = simulate({ ...base, months: 30 }).rows
eq(rows.map((r) => [r.year, r.months]), [[1, 12], [2, 24], [3, 30]], '30개월 행')
near(rows[0].interest, 500_000, 0.01, '1년차 이자')

// 단리: 1000만 5% 10년 = 500만, 월 50만 월초 12개월 = 50만×5%/12×78
near(simpleInterest(base), 5_000_000, 0.01, '단리 거치')
near(simpleInterest({ ...dca, months: 12 }), 500_000 * 0.05 / 12 * 78, 0.01, '단리 적립 월초')
near(simpleInterest({ ...dca, months: 12, timing: 'end' }), 500_000 * 0.05 / 12 * 66, 0.01, '단리 적립 월말')

// 72의 법칙 vs 정확값: 6% 연복리 = ln2/ln1.06 = 11.896
near(rule72(6), 12, 1e-9, '72/6')
near(doublingYears(6, 'yearly'), 11.8957, 1e-4, '정확 2배 6%')
eq(doublingYears(0, 'yearly'), null, '0% 2배 없음')
// 만기과세 세후 2배: 세후 금액 = 2 → 세전 (2-0.154)/0.846 배
const dy = doublingYears(5, 'yearly', 'normal', 'maturity')!
near(1 + (Math.pow(1.05, dy) - 1) * 0.846, 2, 1e-9, '세후 2배 기간')
near(effectiveAnnual(12, 'monthly'), 12.6825, 1e-4, '월복리 12% 실효')

// 연환산 수익률: 거치 연복리 비과세 = 입력 이율
near(annualizedReturn(base, simulate(base).value), 5, 1e-6, 'IRR 거치')
near(annualizedReturn(dca, simulate(dca).value), effectiveAnnual(5, 'monthly'), 1e-6, 'IRR 적립')
// 실질
near(realValue(1.02 ** 10 * 100, 120, 2), 100, 1e-9, '실질 가치')
near(realRate(5, 2), 2.9412, 1e-4, '피셔')

// 목표 역산: 10년 뒤 세후 1억, 5% 월복리, 일반과세
const goalP = { ...dca, tax: 'normal' as const }
const m = requiredMonthly(1e8, goalP)
eq(simulate({ ...goalP, monthly: m }).value >= 1e8 && simulate({ ...goalP, monthly: m - 1 }).value < 1e8, true, '필요 월 적립 최소')
eq(requiredMonthly(1e7, { ...goalP, principal: 2e7 }), 0, '원금만으로 충분')
const r = requiredRate(1e8, { ...goalP, monthly: 600_000 })!
near(simulate({ ...goalP, monthly: 600_000, rate: r }).value, 1e8, 1, '필요 수익률')
eq(requiredRate(5e7, { ...goalP, monthly: 600_000 }), 0, '납입만으로 충분')
eq(requiredRate(1e15, goalP), null, '불가능')

if (fail) { console.log(`${fail} failed`); process.exit(1) }
console.log('check-compound: all passed')
