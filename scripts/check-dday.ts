// 디데이 계산 회귀 체크: node scripts/check-dday.ts
import { getKoreanHolidays } from '../src/utils/koreanHolidays.ts'
import {
  todayKST, weekday, addDays, addMonths, addYears, daysBetween, ddayLabel, ymd, isValidDate,
  holidaysOfYear, rangeStats, addBusinessDays, csatDate, presets, dayCount, milestones, sortSaved, monthGrid,
} from '../src/utils/dday.ts'

let fail = 0
const ok = (cond: boolean, msg: string) => { if (!cond) { fail++; console.log('FAIL', msg) } }
const eq = (a: unknown, b: unknown, msg: string) => ok(JSON.stringify(a) === JSON.stringify(b), `${msg}: ${JSON.stringify(a)} != ${JSON.stringify(b)}`)
const H = getKoreanHolidays

// KST 오늘: UTC 2026-09-30 15:00 = KST 10-01 00:00, 14:59 = 09-30 23:59
eq(todayKST(Date.UTC(2026, 8, 30, 15, 0)), '2026-10-01', 'KST 자정 경계')
eq(todayKST(Date.UTC(2026, 8, 30, 14, 59)), '2026-09-30', 'KST 자정 직전')

eq(weekday('2026-11-19'), 4, '2026-11-19 목')
eq(weekday('1970-01-01'), 4, 'epoch 목')
eq(weekday('1969-12-28'), 0, '음수 일련번호 일요일')

// 윤년
eq(daysBetween('2024-02-28', '2024-03-01'), 2, '2024 윤년')
eq(daysBetween('2023-02-28', '2023-03-01'), 1, '2023 평년')
eq(daysBetween('2099-12-31', '2100-03-01'), 60, '2100 평년(400 규칙)')
eq(daysBetween('1999-12-31', '2000-03-01'), 61, '2000 윤년')
eq(addMonths('2024-01-31', 1), '2024-02-29', '말일 고정(윤)')
eq(addMonths('2025-01-31', 1), '2025-02-28', '말일 고정')
eq(addMonths('2025-03-31', -1), '2025-02-28', '빼기 말일')
eq(addMonths('2025-01-15', -13), '2023-12-15', '해 넘김 빼기')
eq(addYears('2024-02-29', 1), '2025-02-28', '2/29 + 1년')
eq(addYears('2024-02-29', 4), '2028-02-29', '2/29 + 4년')
ok(isValidDate('2024-02-29') && !isValidDate('2023-02-29') && !isValidDate('2026-13-01') && !isValidDate('abc'), 'isValidDate')

// D-Day 표기: 당일 = D-Day
eq(ddayLabel(0), 'D-Day', '당일')
eq(ddayLabel(49), 'D-49', '남음')
eq(ddayLabel(-1), 'D+1', '다음 날')
eq(ddayLabel(daysBetween('2026-10-01', '2026-11-19')), 'D-49', '수능 D-49 (10/1 기준)')

eq(ymd('2024-01-31', '2024-02-29'), { years: 0, months: 1, days: 0, totalMonths: 1 }, 'ymd 말일')
eq(ymd('2020-05-10', '2026-10-01'), { years: 6, months: 4, days: 21, totalMonths: 76 }, 'ymd 일반')
eq(ymd('2026-10-01', '2020-05-10').totalMonths, 76, 'ymd 순서 무관')

// 공휴일/대체공휴일
const has = (y: number, d: string, k: string) => holidaysOfYear(y, H).some(h => h.date === d && h.key === k)
ok(has(2025, '2025-05-06', 'substituteHoliday'), '2025 어린이날·부처님오신날 겹침 → 5/6')
ok(holidaysOfYear(2025, H).filter(h => h.key === 'substituteHoliday' && h.date.startsWith('2025-05')).length === 1, '2025-05 대체 1일')
ok(has(2025, '2025-10-08', 'substituteHoliday'), '2025 추석 일요일 → 10/8')
ok(has(2026, '2026-03-02', 'substituteHoliday'), '2026 삼일절(일) → 3/2')
ok(has(2026, '2026-05-25', 'substituteHoliday'), '2026 부처님오신날(일) → 5/25')
ok(has(2026, '2026-08-17', 'substituteHoliday'), '2026 광복절(토) → 8/17')
ok(has(2026, '2026-10-05', 'substituteHoliday'), '2026 개천절(토) → 10/5')
ok(has(2026, '2026-05-01', 'laborDay') && has(2026, '2026-07-17', 'constitutionDay'), '2026 노동절·제헌절')
ok(!has(2025, '2025-07-17', 'constitutionDay'), '2025 제헌절은 공휴일 아님')
ok(has(2026, '2026-06-03', 'election'), '2026 지방선거')
ok(!holidaysOfYear(2026, H).some(h => h.key === 'substituteHoliday' && h.date === '2026-06-08'), '현충일(토) 대체 없음')
ok(!holidaysOfYear(2026, H).some(h => h.key === 'substituteHoliday' && h.date.startsWith('2026-09')), '2026 추석(목~토) 대체 없음')
ok(has(2027, '2027-02-09', 'substituteHoliday'), '2027 설(일 포함) → 2/9')
ok(has(2028, '2028-10-05', 'substituteHoliday'), '2028 추석·개천절 겹침 → 10/5')

// 기간 구성: 주말+공휴일+영업일 = 총 일수
const r = rangeStats('2026-10-01', '2026-11-19', H)
eq(r.total, 49, '총 49일')
eq([r.weeks, r.restDays], [7, 0], '7주 0일')
eq(r.weekend + r.holiday + r.business, r.total, '합 = 총')
eq(r.holiday, 2, '10/5 대체 + 10/9 한글날 (10/3은 토요일이라 주말에)')
eq(r.weekend, 14, '주말 14일')
eq(rangeStats('2026-11-19', '2026-10-01', H).total, 49, '역순도 동일')
eq(rangeStats('2026-10-01', '2026-10-01', H).total, 0, '당일 0')

// 영업일 더하기: 2026-09-30(수) + 3영업일 → 10/1, 10/2, (10/3토,4일,5대체) 10/6
eq(addBusinessDays('2026-09-30', 3, H), '2026-10-06', '영업일 더하기(공휴일 제외)')
eq(addBusinessDays('2026-10-06', -3, H), '2026-09-30', '영업일 빼기')

// 수능
eq(csatDate(2026), { date: '2026-11-19', estimated: false }, '2027학년도 수능')
eq(csatDate(2027), { date: '2027-11-18', estimated: false }, '2028학년도 수능')
ok(csatDate(2028).estimated && weekday(csatDate(2028).date) === 4, '2028 추정 = 목요일')

const p = presets('2026-10-01', H)
eq(p.map(x => x.key), ['csat', 'christmas', 'yearEnd', 'newYear', 'seollal', 'chuseok'], '프리셋 가까운 순')
eq(p.find(x => x.key === 'seollal')?.date, '2027-02-07', '다음 설날')
eq(p.find(x => x.key === 'chuseok')?.date, '2027-09-15', '다음 추석(올해 지남)')
eq(presets('2026-12-25', H).find(x => x.key === 'christmas')?.date, '2026-12-25', '당일 프리셋은 오늘')

// 기념일: 연애 1일 = 시작일
eq(dayCount('2026-01-01', '2026-01-01', true), 1, '시작일 = 1일')
eq(dayCount('2026-01-01', '2026-01-01', false), 0, '미포함 = 0일')
const ms = milestones('2026-01-01', true)
eq(ms.find(m => m.kind === 'days' && m.n === 100)?.date, '2026-04-10', '100일 (시작일 포함)')
eq(milestones('2026-01-01', false).find(m => m.kind === 'days' && m.n === 100)?.date, '2026-04-11', '100일 (미포함)')
eq(ms.find(m => m.kind === 'years' && m.n === 1)?.date, '2027-01-01', '1주년')
eq(milestones('2024-02-29', true).find(m => m.kind === 'years' && m.n === 1)?.date, '2025-02-28', '2/29 1주년')
ok(ms.every((m, i) => i === 0 || ms[i - 1].date <= m.date), '기념일 날짜순')

// 저장 목록 정렬
const s = sortSaved([
  { id: 'a', title: 'past', date: '2026-09-01' },
  { id: 'b', title: 'far', date: '2027-01-01' },
  { id: 'c', title: 'near', date: '2026-10-10' },
  { id: 'd', title: 'pin', date: '2028-01-01', pinned: true },
  { id: 'e', title: 'recent past', date: '2026-09-29' },
], '2026-10-01')
eq(s.map(x => x.id), ['d', 'c', 'b', 'e', 'a'], '고정 → 다가오는 순 → 지난 최근 순')

const g = monthGrid(2026, 11)
eq(g.filter(Boolean).length, 30, '11월 30일')
eq(g.indexOf('2026-11-01'), 0, '2026-11-01 일요일 → 첫 칸')
eq(monthGrid(2024, 2).filter(Boolean).length, 29, '윤년 2월')

console.log(fail ? `${fail} FAILED` : 'all dday checks passed')
if (fail) process.exit(1)
