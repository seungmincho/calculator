// 퇴직금·퇴직소득세 회귀 체크: node scripts/check-retirement.ts
import {
  addMonths, serviceDays, fullYears, taxServiceYears, serviceDeduction, convertedDeduction, retirementTax, calcRetirement, isDate, periodSegments, delaySimulation,
} from '../src/utils/retirementPay.ts'

let fail = 0
const eq = (a: unknown, b: unknown, msg: string) => {
  if (JSON.stringify(a) !== JSON.stringify(b)) { fail++; console.log('FAIL', msg, JSON.stringify(a), '!=', JSON.stringify(b)) }
}

// 날짜
eq(addMonths('2026-05-31', -3), '2026-02-28', '말일 보정')
eq(addMonths('2024-05-31', -3), '2024-02-29', '윤년 말일 보정')
eq(addMonths('2026-10-01', -3), '2026-07-01', '3개월 전')
eq(serviceDays('2026-07-01', '2026-10-01'), 92, '평균임금 기간 92일')
eq(serviceDays('2025-12-02', '2026-03-02'), 90, '평균임금 기간 90일')
eq(serviceDays('2026-03-01', '2026-06-01'), 92, '3~5월 92일')
eq(serviceDays('2026-11-01', '2027-02-01'), 92, '11~1월 92일')
eq(serviceDays('2026-12-01', '2027-03-01'), 90, '12~2월 90일')
eq(isDate('2026-02-30'), false, '없는 날짜')
eq(isDate('2026-02-28'), true, '정상 날짜')

// 근속연수: 1년 미만 끝수 1년 (소득세법 시행령 제105조)
eq(fullYears('2021-03-02', '2026-03-02'), 5, '만 5년')
eq(fullYears('2021-03-02', '2026-03-01'), 4, '하루 모자람')
eq(taxServiceYears('2021-03-02', '2026-03-02'), 5, '정확히 5년')
eq(taxServiceYears('2021-03-02', '2026-03-03'), 6, '5년 1일 → 6년')
eq(fullYears('2024-02-29', '2025-02-28'), 1, '2/29 입사 1년(말일 보정)')

// 근속연수공제 (2023~)
eq(serviceDeduction(1), 1_000_000, '1년')
eq(serviceDeduction(5), 5_000_000, '5년')
eq(serviceDeduction(10), 15_000_000, '10년')
eq(serviceDeduction(20), 40_000_000, '20년')
eq(serviceDeduction(30), 70_000_000, '30년')

// 환산급여공제 (2023~) 구간 경계
eq(convertedDeduction(8_000_000), 8_000_000, '800만 전액')
eq(convertedDeduction(70_000_000), 45_200_000, '7천만')
eq(convertedDeduction(100_000_000), 61_700_000, '1억')
eq(convertedDeduction(300_000_000), 151_700_000, '3억')

// 퇴직소득세 수계산 예시
// 1억·10년: 공제 1,500만 → 환산 1억200만 → 공제 6,260만 → 과표 3,940만 → 465만 → ×10/12 = 3,875,000
eq(retirementTax(100_000_000, 10).tax, 3_875_000, '1억 10년')
eq(retirementTax(100_000_000, 10).localTax, 387_500, '1억 10년 지방세')
// 5천만·5년: 환산 1억800만 → 공제 6,530만 → 과표 4,270만 → 514.5만 → ×5/12 = 2,143,750
eq(retirementTax(50_000_000, 5).tax, 2_143_750, '5천만 5년')
// 근속연수공제가 퇴직금보다 크면 세금 0
eq(retirementTax(3_000_000, 5).tax, 0, '소액 비과세')
eq(retirementTax(0, 5).totalTax, 0, '0원')

// 전체 계산: 입사 2021-03-02, 퇴직일 2026-03-02(마지막 근무 3/1), 월 300만, 상여 0
const r = calcRetirement({ start: '2021-03-02', end: '2026-03-02', monthly: 3_000_000, bonus: 0, leave: 0 })!
eq(r.days, 1826, '재직일수(윤년 포함)')
eq(r.periodDays, 90, '산정기간 90일')
eq(r.pay, Math.floor((9_000_000 / 90) * 30 * (1826 / 365)), '퇴직금')
eq(r.pay, 15_008_219, '퇴직금 값')
eq(r.taxYears, 5, '근속연수')
eq(r.net, r.pay - r.totalTax, '세후')
// 상여·연차 3/12 가산
const b = calcRetirement({ start: '2021-03-02', end: '2026-03-02', monthly: 3_000_000, bonus: 4_000_000, leave: 400_000 })!
eq(b.wages3m, 9_000_000 + 1_000_000 + 100_000, '3개월 임금총액 가산')

// 1년 미만: 퇴직금 0
const s = calcRetirement({ start: '2026-01-02', end: '2026-12-31', monthly: 3_000_000, bonus: 0, leave: 0 })!
eq([s.eligible, s.pay, s.totalTax], [false, 0, 0], '1년 미만')
const one = calcRetirement({ start: '2025-01-02', end: '2026-01-02', monthly: 3_000_000, bonus: 0, leave: 0 })!
eq(one.eligible, true, '정확히 1년')
eq(calcRetirement({ start: '2026-01-02', end: '2026-01-01', monthly: 1, bonus: 0, leave: 0 }), null, '역순 날짜')

// IRP 연금수령 감면
const t = calcRetirement({ start: '2016-03-02', end: '2026-03-02', monthly: 5_000_000, bonus: 6_000_000, leave: 0 })!
eq(t.irp70 <= t.totalTax * 0.7 && t.irp60 < t.irp70, true, 'IRP 30%/40% 감면')

eq(t.irp50 < t.irp60, true, 'IRP 20년 초과 50% 감면')

// 산정기간 3구간 (일수 자동)
eq(periodSegments('2026-10-01'), [
  { from: '2026-07-01', to: '2026-07-31', days: 31 },
  { from: '2026-08-01', to: '2026-08-31', days: 31 },
  { from: '2026-09-01', to: '2026-09-30', days: 30 },
], '7~9월 구간')
eq(periodSegments('2026-03-15').map((x) => x.days), [31, 31, 28], '12/15~3/14 구간')
eq(periodSegments('2026-03-15').reduce((a, x) => a + x.days, 0), serviceDays('2025-12-15', '2026-03-15'), '구간 합 = 산정기간')

// 상세 입력: 3구간 합계가 monthly×3 대신 사용
const d = calcRetirement({ start: '2021-03-02', end: '2026-03-02', monthly: 0, bonus: 0, leave: 0, months3: [3_000_000, 3_000_000, 3_000_000] })!
eq(d.pay, r.pay, '3구간 합계 = 월급×3')

// 통상임금이 평균임금보다 크면 통상임금 적용 (근로기준법 제2조 ②)
const o = calcRetirement({ start: '2021-03-02', end: '2026-03-02', monthly: 2_000_000, bonus: 0, leave: 0, ordinary: 3_000_000 })!
eq(o.usedOrdinary, true, '통상임금 적용')
eq(o.dailyWage, 3_000_000 * 8 / 209, '1일 통상임금 = 월액×8/209')
const o2 = calcRetirement({ start: '2021-03-02', end: '2026-03-02', monthly: 3_000_000, bonus: 0, leave: 0, ordinary: 2_000_000 })!
eq([o2.usedOrdinary, o2.pay], [false, r.pay], '평균임금이 크면 그대로')

// 1년 미만: 남은 일수
eq([s.oneYearEnd, s.daysToEligible], ['2027-01-02', 2], '1년까지 2일')

// 퇴직일 늦추기 시뮬레이션: 5년 정확히 → +1개월이면 세법 근속연수 6년(공제 구간 변경)
const sim = delaySimulation({ start: '2021-03-02', end: '2026-03-02', monthly: 3_000_000, bonus: 0, leave: 0 }, [0, 1, 12])
eq(sim.map((x) => x.r.taxYears), [5, 6, 6], '근속연수 끝수 올림')
eq(sim.map((x) => [x.yearUp, x.bracketUp]), [[false, false], [true, true], [false, false]], '구간 변경 표시')
eq(sim[1].r.pay > sim[0].r.pay && sim[2].r.pay > sim[1].r.pay, true, '늦출수록 퇴직금 증가')
const sim2 = delaySimulation({ start: '2026-01-02', end: '2026-12-31', monthly: 3_000_000, bonus: 0, leave: 0 }, [0, 1])
eq(sim2.map((x) => x.r.eligible), [false, true], '1개월 늦추면 퇴직금 발생')

if (fail) { console.log(`${fail} failed`); process.exit(1) }
console.log('check-retirement: all passed')
