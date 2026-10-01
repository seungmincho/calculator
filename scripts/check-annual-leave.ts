// 연차 계산 회귀 체크: node scripts/check-annual-leave.ts
import { getKoreanHolidays } from '../src/utils/koreanHolidays.ts'
import { leaveForYears, joinGrants, fiscalGrants, total, active, summarize, settlement, timeline, dailyWage, bridges } from '../src/utils/annualLeave.ts'

let fail = 0
const eq = (a: unknown, b: unknown, msg: string) => { if (JSON.stringify(a) !== JSON.stringify(b)) { fail++; console.log('FAIL', msg, JSON.stringify(a), '!=', JSON.stringify(b)) } }

// 근속연수별 일수: 1·2년 15, 3년 16, 5년 17, 19·20년 24, 21년 25, 30년 25(상한)
eq([0, 1, 2, 3, 4, 5, 19, 20, 21, 30].map(leaveForYears), [0, 15, 15, 16, 16, 17, 24, 24, 25, 25], '근속 일수표')

// 입사 11개월: 월 단위 11일, 입사 1년 전날까지 사용
const J = '2025-03-02'
eq(total(joinGrants(J, '2026-02-02')), 11, '11개월 = 11일')
eq(total(joinGrants(J, '2026-02-01')), 10, '11개월 전날 = 10일')
// 정확히 1년 근무(마지막 근무일 = 1주년 전날) → 15일 없음, 1주년 당일 재직 → 15일 (대법원 2021다227100)
eq(total(joinGrants(J, '2026-03-01')), 11, '1년 꽉 채우고 퇴사 = 11일')
eq(total(joinGrants(J, '2026-03-02')), 26, '1년+1일 = 11+15')
eq(active(joinGrants(J, '2026-03-01'), '2026-03-01'), 11, '1주년 전날 사용 가능 11')
eq(active(joinGrants(J, '2026-03-02'), '2026-03-02'), 15, '1주년: 월 단위 소멸, 15 사용 가능')
// 3년: 16일, 2년차 15
const g3 = joinGrants('2023-03-02', '2026-03-02')
eq(g3.filter(g => g.kind === 'annual').map(g => g.days), [15, 15, 16], '3년 근속 15,15,16')
eq(g3[g3.length - 1].year, 4, '3주년 발생분 = 4년차')
// 21년 이상 25일 상한
const g25 = joinGrants('2000-01-10', '2026-01-10').filter(g => g.kind === 'annual')
eq(g25[20].days, 25, '21주년 25일'); eq(g25[25].days, 25, '26주년도 25일')
eq(total(joinGrants('2000-01-10', '2026-01-10')), 11 + [...Array(26)].reduce((s, _, i) => s + leaveForYears(i + 1), 0), '누적 합')

// 80% 미만: 마지막 연 단위 연차를 개근 월수로
eq(joinGrants('2023-03-02', '2026-03-02', { lowAttendanceMonths: 7 }).at(-1)!.days, 7, '80% 미만 → 개근 7개월 = 7일')

// 회계연도: 7/1 입사 → 다음 해 1/1 15×184/365 = 7.56, 2년차 1/1 15, 3년차 15, 4번째 1/1 16
const F = fiscalGrants('2024-07-01', '2028-01-01')
eq(F.filter(g => g.kind !== 'monthly').map(g => [g.date, g.days]), [['2025-01-01', 7.56], ['2026-01-01', 15], ['2027-01-01', 15], ['2028-01-01', 16]], '회계연도 비례·가산')
eq(F.filter(g => g.kind === 'monthly').length, 11, '회계연도도 월 단위 11일 병행')
// 1/1 입사자 = 입사일 기준과 동일
eq(total(fiscalGrants('2020-01-01', '2026-06-30')), total(joinGrants('2020-01-01', '2026-06-30')), '1/1 입사 동일')
// 퇴사 정산: 7/1 입사, 2026-07-01 재직 후 퇴사 → 입사일 11+15+15=41, 회계 11+7.56+15=33.56 → 7.44일 부족
eq(settlement('2024-07-01', '2026-07-01'), { join: 41, fiscal: 33.56, shortfall: 7.44 }, '퇴사 정산 차이')
// 회계연도가 더 많은 경우 shortfall 0
eq(settlement('2024-07-01', '2026-06-30').shortfall, 0, '1/1 직후 퇴사는 회계가 유리 → 0')

// 요약: 다음 발생
const s = summarize('joinDate', '2023-03-02', '2026-10-01')
eq([s.total, s.active, s.next?.date, s.next?.days], [11 + 15 + 15 + 16, 16, '2027-03-02', 16], '요약')
const tl = timeline('joinDate', '2025-03-02', '2025-08-10', 3)
eq(tl.map(r => [r.kind, r.days, r.future]), [['monthly', 5, false], ['monthly', 6, true], ['annual', 15, true], ['annual', 15, true], ['annual', 16, true]], '타임라인 묶음')

// 1일 통상임금: 월 300만 / 209 × 8 = 114,833 · 시급 10,320 × 8 = 82,560
eq(dailyWage('monthly', 3_000_000), 114833, '월급 환산'); eq(dailyWage('hourly', 10320), 82560, '시급 환산')

// 징검다리: 2026-10 개천절(토)→대체 10/5(월), 한글날 10/9(금) → 10/6~8 연차 3일로 10/3~10/11 9일
const b = bridges('2026-10-01', '2026-12-31', getKoreanHolidays)
const oct = b.find(x => x.start === '2026-10-03')
eq(oct && [oct.end, oct.restDays, oct.leaveDates], ['2026-10-11', 9, ['2026-10-06', '2026-10-07', '2026-10-08']], '10월 징검다리')
const xmas = b.find(x => x.start === '2026-12-25')
eq(xmas && [xmas.end, xmas.restDays, xmas.leaveDates.length], ['2027-01-03', 10, 4], '성탄~신정')

if (fail) { console.log(`${fail} failed`); process.exit(1) }
console.log('check-annual-leave: all passed')
