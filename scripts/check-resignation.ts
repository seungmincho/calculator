// 사직서 작성기 회귀 체크: node scripts/check-resignation.ts
import { noticeLastDay, severance, tenure, anniversaryEve } from '../src/utils/resignation.ts'

let fail = 0
const eq = (a: unknown, b: unknown, msg: string) => { if (JSON.stringify(a) !== JSON.stringify(b)) { fail++; console.log('FAIL', msg, JSON.stringify(a), '!=', JSON.stringify(b)) } }

// 민법 660조: 10/15 제출 → 일반 11/15까지, 월급제 11/30까지 / 1/31 제출 → 2/28, 2월 말일
eq(noticeLastDay('2026-10-15'), { general: '2026-11-15', monthly: '2026-11-30' }, '10/15 제출')
eq(noticeLastDay('2026-01-31'), { general: '2026-02-28', monthly: '2026-02-28' }, '1/31 제출')
eq(noticeLastDay('2026-12-01').monthly, '2027-01-31', '12월 제출 → 다음 해 1월 말')

// 퇴직금: 2025-03-02 입사 → 2026-03-01까지 근무해야 1년
eq(severance('2025-03-02', '2026-03-01'), { eligible: true, needLastDay: '2026-03-01', shortDays: 0 }, '정확히 1년')
eq(severance('2025-03-02', '2026-02-20'), { eligible: false, needLastDay: '2026-03-01', shortDays: 9 }, '9일 부족')

// 근속: 2023-03-02 ~ 2026-03-01 = 3년 0개월 0일
eq(tenure('2023-03-02', '2026-03-01'), { years: 3, months: 0, days: 0, totalMonths: 36 }, '근속 3년')
eq(tenure('2026-01-01', '2026-01-31').months, 1, '한 달')

// 주년 전날 퇴사
eq(anniversaryEve('2025-03-02', '2026-03-01'), 1, '1주년 전날')
eq(anniversaryEve('2023-03-02', '2026-03-01'), 3, '3주년 전날')
eq(anniversaryEve('2025-03-02', '2026-03-02'), 0, '1주년 당일까지 근무')
eq(anniversaryEve('2025-03-02', '2025-04-01'), 0, '1개월은 해당 없음')

if (fail) { console.log(`${fail} failed`); process.exit(1) }
console.log('check-resignation: all passed')
