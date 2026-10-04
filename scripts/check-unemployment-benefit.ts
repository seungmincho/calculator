// 실업급여 회귀 체크: node scripts/check-unemployment-benefit.ts
import {
  DAILY_CAP, dailyCap, dailyFloor, benefitDays, daysIn3Months, avgDailyWage, dailyBenefit,
  earlyBonus, lastEligiblePaidDay, schedule, nextBusinessDay,
} from '../src/utils/unemploymentBenefit.ts'
import { MIN_WAGE_2026, MIN_WAGE_2027, minWageFor, minWageOn } from '../src/utils/minimumWage.ts'

let fail = 0
const eq = (a: unknown, b: unknown, msg: string) => {
  if (JSON.stringify(a) !== JSON.stringify(b)) { fail++; console.log('FAIL', msg, JSON.stringify(a), '!=', JSON.stringify(b)) }
}

// 2026 상·하한
eq(DAILY_CAP, 68100, '2026 상한')
eq(dailyFloor(8), 66048, '하한 8h = 10,320×0.8×8')
eq(dailyFloor(4), 33024, '하한 4h')
eq(dailyFloor(2), 16512, '하한 2h (4시간 간주 폐지)')
eq(dailyFloor(10), 66048, '8h 초과는 8h')
eq(dailyFloor(8) < DAILY_CAP, true, '하한 < 상한 (역전 없음)')

// 상·하한 경계
eq(dailyBenefit(113_500).applied, 'none', '113,500×0.6=68,100 → 상한 그대로')
eq(dailyBenefit(113_502), { daily: 68100, raw: 68101, floor: 66048, applied: 'cap' }, '상한 초과')
eq(dailyBenefit(110_080).applied, 'none', '110,080×0.6=66,048 → 하한 그대로')
eq(dailyBenefit(110_079), { daily: 66048, raw: 66047, floor: 66048, applied: 'floor' }, '하한 미달')
eq(dailyBenefit(50_000, 4), { daily: 33024, raw: 30000, floor: 33024, applied: 'floor' }, '단시간 4h 하한')
eq(dailyBenefit(200_000, 4).daily, 68100, '단시간도 상한 동일')

// 최저임금 단일 출처 (minimumWage.ts) — 고용노동부 고시
eq([minWageFor(2025), minWageFor(2026), minWageFor(2027)], [10030, 10320, 10700], '최저임금 2025·2026·2027')
eq(MIN_WAGE_2026 * 209, 2_156_880, '2026 월 환산 209시간')
eq(MIN_WAGE_2027 * 209, 2_236_300, '2027 월 환산 209시간 (2026.8.5 고시)')
eq(minWageOn('2027-01-01'), 10700, '2027.1.1 시행')

// 이직일별 상·하한 (시행령 제68조·부칙 제4조, 법 제45조④ 이직일 당시 최저임금)
eq(dailyCap('2025-12-31'), 66000, '2025 이직 상한 66,000 (종전)')
eq(dailyCap('2026-01-01'), 68100, '2026 이직 상한 68,100')
eq(dailyFloor(8, '2025-12-31'), 64192, '2025 이직 하한 10,030×0.8×8')
eq(dailyFloor(8, '2026-06-30'), 66048, '2026 이직 하한')
eq(dailyFloor(8, '2027-01-04'), 68480, '2027 이직 하한 10,700×0.8×8')
eq(dailyBenefit(200_000, 8, '2025-12-31'), { daily: 66000, raw: 120000, floor: 64192, applied: 'cap' }, '2025 이직 상한')
// 법 제46조②: 하한 > 상한이면 고소득자도 하한 지급 (2027 이직, 상한 개정 전)
eq(dailyBenefit(200_000, 8, '2027-01-04'), { daily: 68480, raw: 120000, floor: 68480, applied: 'floor' }, '2027 하한 > 상한 → 하한')
eq(dailyBenefit(113_700, 8, '2027-01-04').daily, 68480, '상한~하한 사이 raw → 하한')
eq(dailyBenefit(150_000, 4, '2027-01-04'), { daily: 68100, raw: 90000, floor: 34240, applied: 'cap' }, '2027 단시간 4h는 상한 그대로')

// 소정급여일수 표 (고용보험법 별표 1)
eq(['under1', '1to3', '3to5', '5to10', 'over10'].map((p) => benefitDays('under50', p as never)), [120, 150, 180, 210, 240], '50세 미만')
eq(['under1', '1to3', '3to5', '5to10', 'over10'].map((p) => benefitDays('over50', p as never)), [120, 180, 210, 240, 270], '50세 이상·장애인')

// 3개월 일수 / 평균임금
eq(daysIn3Months('2026-12-31'), 92, '10/1~12/31')
eq(daysIn3Months('2026-03-31'), 90, '1/1~3/31')
eq(daysIn3Months('2026-02-28'), 90, '12/1~2/28')
eq(daysIn3Months('2026-04-30'), 89, '2/1~4/30')
eq(avgDailyWage(3_000_000, '2026-12-31'), 97826, '월 300만 → 9,000,000/92')

// 조기재취업수당
eq(earlyBonus(66048, 120, 60), { remaining: 60, eligible: true, bonus: 1981440, total: 66048 * 60 + 1981440 }, '정확히 1/2 남김 → 지급')
eq(earlyBonus(66048, 120, 61).eligible, false, '1/2 미만 → 불가')
eq(earlyBonus(66048, 150, 75).eligible, true, '150일 중 75 남김')
eq(earlyBonus(66048, 150, 76).eligible, false, '150일 중 74 남김')
eq(lastEligiblePaidDay(150), 75, '홀짝 무관 floor')
eq(earlyBonus(10000, 120, 0).bonus, 600000, '바로 재취업: 120×1만/2')

// 일정: 합계 = 소정급여일수, 첫 회 7일, 이후 28일
const s = schedule('2027-01-04', 120, 66048)
eq(s.map((r) => r.payDays), [7, 28, 28, 28, 28, 1], '120일 회차 분할')
eq(s[s.length - 1].cumulative, 66048 * 120, '누적 = 총액')
eq(s[0].date, '2027-01-18', '1차 인정 = 신청 2주 뒤(월)')
eq(nextBusinessDay('2027-01-02'), '2027-01-04', '토 → 월')
eq(nextBusinessDay('2026-12-25'), '2026-12-28', '성탄절(금) → 월')

if (fail) { console.log(`${fail} failed`); process.exit(1) }
console.log('check-unemployment-benefit: all passed')
