// 최저임금 계산기 회귀 체크: node scripts/check-minimum-wage.ts
import { calcMinWage, checkWage, hourlyFor, raiseFrom } from '../src/utils/minimumWageCalc.ts'

let fail = 0
const eq = (name: string, got: unknown, want: unknown, tol = 1e-6) => {
  const ok = typeof want === 'number' ? Math.abs((got as number) - want) <= tol : got === want
  if (!ok) { fail++; console.log('FAIL', name, got, '!=', want) }
}

// 고시 월 환산액 (주 40시간, 월 209시간)
const ft27 = calcMinWage(2027, 40, 5)
eq('2027 hourly', ft27.hourly, 10_700)
eq('2027 209h', ft27.monthlyHours, 209)
eq('2027 monthly', ft27.monthly, 2_236_300)
eq('2027 yearly', ft27.yearly, 26_835_600)
eq('2027 daily 8h', ft27.daily, 85_600)
eq('2027 weekly 48h', ft27.weekly, 513_600)
eq('2027 holiday pay', ft27.holidayPay, 85_600)
const ft26 = calcMinWage(2026, 40, 5)
eq('2026 monthly', ft26.monthly, 2_156_880)
eq('2026 yearly', ft26.yearly, 25_882_560)

// 인상액·인상률: 2027 +380원(3.7%), 2026 +290원(2.9%)
eq('raise 2027', raiseFrom(2027).diff, 380)
eq('raise 2027 rate', Math.round(raiseFrom(2027).rate * 10) / 10, 3.7)
eq('raise 2026 rate', Math.round(raiseFrom(2026).rate * 10) / 10, 2.9)
eq('monthly diff', ft27.monthly - ft26.monthly, 79_420)

// 수습 감액 90%
eq('probation 2027', hourlyFor(2027, true), 9_630)
eq('probation 2026', hourlyFor(2026, true), 9_288)
eq('probation monthly', calcMinWage(2027, 40, 5, true).monthly, 9_630 * 209)

// 단시간: 주 20시간(주휴 4h, 월 104h), 주 15시간 경계(주휴 3h, 78h), 14시간(주휴 없음, 61h)
const p20 = calcMinWage(2027, 20, 5)
eq('20h holiday', p20.holidayHours, 4)
eq('20h monthly h', p20.monthlyHours, 104)
eq('20h monthly', p20.monthly, 1_112_800)
eq('20h weekly', p20.weekly, 24 * 10_700)
eq('20h daily 4h', p20.daily, 42_800)
const p15 = calcMinWage(2027, 15, 3)
eq('15h eligible', p15.eligible, true)
eq('15h monthly h', p15.monthlyHours, 78)
const p14 = calcMinWage(2027, 14, 2)
eq('14h no holiday', p14.eligible, false)
eq('14h weekly', p14.weekly, 14 * 10_700)
eq('14h monthly h', p14.monthlyHours, 61)
// 35시간: (35+7) × 365/7/12 = 182.5 → 반올림 183
eq('35h monthly h', calcMinWage(2027, 35, 5).monthlyHours, 183)

// 반올림: 주 20시간 3일 → 하루 6.67시간 일급 71,333원
eq('daily rounding', calcMinWage(2027, 20, 3).daily, 71_333)
// 소정근로는 일 8h·주 40h 이내로 자름
const clip = calcMinWage(2027, 30, 3)
eq('clip to 24h', clip.hours, 24)
eq('clip flag', clip.clipped, true)
eq('clip 40', calcMinWage(2027, 52, 6).hours, 40)
eq('days clamp', calcMinWage(2027, 20, 0).days, 1)
eq('NaN hours', calcMinWage(2027, NaN, 5).monthly, 0)

// 위반 체크
let c = checkWage(10_000, 'hourly', 10_700, 209)
eq('below', c.below, true)
eq('gap', c.gapHourly, 700)
eq('short monthly', c.shortMonthly, 146_300)
eq('short yearly', c.shortYearly, 1_755_600)
c = checkWage(10_700, 'hourly', 10_700, 209)
eq('equal ok', c.below, false)
eq('equal surplus', c.surplusHourly, 0)
c = checkWage(11_000, 'hourly', 10_700, 104)
eq('above', c.below, false)
eq('surplus', c.surplusHourly, 300)
c = checkWage(2_000_000, 'monthly', 10_700, 209)
eq('monthly below', c.below, true)
eq('monthly short', c.shortMonthly, 236_300)
eq('monthly gap ceil', c.gapHourly, 1_131)
eq('monthly exact ok', checkWage(2_236_300, 'monthly', 10_700, 209).below, false)
eq('probation ok', checkWage(9_700, 'hourly', hourlyFor(2027, true), 209).below, false)
eq('empty pay', checkWage(0, 'hourly', 10_700, 209).below, false)

if (fail) { console.log(`${fail} failed`); process.exit(1) }
console.log('minimum-wage: all ok')
