// 나이 계산 회귀 체크: node scripts/check-age.ts
import { lunarToSolar } from '../src/utils/lunarCalendar.ts'
import {
  birthSolar, ageUpDay, manAge, yeonAge, countingAge, ageDetail, nextBirthday, zodiacOf, westernSign,
  schoolEntryYear, schoolStatus, pensionAge, ageMilestones, ageGap, sanitizeMembers,
} from '../src/utils/age.ts'

let fail = 0
const eq = (a: unknown, b: unknown, msg: string) => {
  if (JSON.stringify(a) !== JSON.stringify(b)) { fail++; console.log('FAIL', msg, JSON.stringify(a), '!=', JSON.stringify(b)) }
}

// 만 나이: 생일 당일에 한 살
eq(manAge('2000-05-15', '2026-05-14'), 25, '생일 전날')
eq(manAge('2000-05-15', '2026-05-15'), 26, '생일 당일')
eq(manAge('2000-05-15', '2000-05-15'), 0, '출생일 0세')
eq(manAge('1999-12-31', '2026-01-01'), 26, '연말생 새해')

// 2/29생: 평년엔 3/1에 한 살 (민법 제160조 제3항)
eq(ageUpDay('2004-02-29', 2025), '2025-03-01', '평년 나이 먹는 날')
eq(ageUpDay('2004-02-29', 2028), '2028-02-29', '윤년 나이 먹는 날')
eq(manAge('2004-02-29', '2025-02-28'), 20, '2/29생 평년 2/28')
eq(manAge('2004-02-29', '2025-03-01'), 21, '2/29생 평년 3/1')
eq(manAge('2004-02-29', '2028-02-28'), 23, '2/29생 윤년 2/28')
eq(manAge('2004-02-29', '2028-02-29'), 24, '2/29생 윤년 2/29')
eq(nextBirthday({ cal: 'solar', date: '2004-02-29' }, '2026-03-02')?.date, '2027-03-01', '2/29 다음 생일 평년')
eq(nextBirthday({ cal: 'solar', date: '2004-02-29' }, '2027-03-02')?.date, '2028-02-29', '2/29 다음 생일 윤년')
eq(ageDetail('2004-02-29', '2025-03-01'), { years: 21, months: 0, days: 0 }, '2/29 상세 당일')

// 연 나이·세는 나이
eq(yeonAge('2007-12-31', '2026-01-01'), 19, '연 나이 새해')
eq(countingAge('2007-12-31', '2026-01-01'), 20, '세는 나이')
eq(ageDetail('2000-05-15', '2026-10-01'), { years: 26, months: 4, days: 16 }, '만 나이 상세')

// 다음 생일 (양력)
const nb = nextBirthday({ cal: 'solar', date: '2000-05-15' }, '2026-05-15')!
eq([nb.date, nb.days, nb.turning, nb.isToday], ['2026-05-15', 0, 26, true], '오늘 생일')
const nb2 = nextBirthday({ cal: 'solar', date: '2000-05-15' }, '2026-05-16')!
eq([nb2.date, nb2.days, nb2.turning], ['2027-05-15', 364, 27], '생일 다음날')

// 음력 생일: 2026 추석(음 8/15) = 양 2026-09-25
eq(birthSolar({ cal: 'lunar', date: '2026-08-15' }), '2026-09-25', '음→양 추석')
const lb = nextBirthday({ cal: 'lunar', date: '1990-08-15' }, '2026-09-25')!
eq([lb.date, lb.isToday, lb.turning], ['2026-09-25', true, 36], '음력 생일 당일')
const lb2 = nextBirthday({ cal: 'lunar', date: '1990-08-15' }, '2026-09-26')!
eq(lb2.date, (() => { const s = lunarToSolar(2027, 8, 15)!; return `2027-${String(s.month).padStart(2, '0')}-${String(s.day).padStart(2, '0')}` })(), '음력 생일 다음 해')
// 음력 12월생: 양력으로는 다음 해 1~2월
const dec = nextBirthday({ cal: 'lunar', date: '1990-12-20' }, '2026-10-01')!
eq(dec.date.slice(0, 4), '2027', '음 12월 생일 → 양력 다음 해')
eq(dec.turning, 36, '음 12월 생일 turning')

// 윤달생: 2020 윤4월 10일. 윤4월 없는 해엔 평달 4/10
eq(birthSolar({ cal: 'lunar', date: '2020-04-10', leap: true }) !== null, true, '2020 윤4월 존재')
eq(birthSolar({ cal: 'lunar', date: '2021-04-10', leap: true }), null, '2021 윤4월 없음')
const lp = nextBirthday({ cal: 'lunar', date: '2020-04-10', leap: true }, '2026-01-01')!
const p4 = lunarToSolar(2026, 4, 10)!
eq([lp.date, lp.lunar?.leapFallback], [`2026-${String(p4.month).padStart(2, '0')}-${String(p4.day).padStart(2, '0')}`, true], '윤달생 평달 대체')
eq(nextBirthday({ cal: 'lunar', date: '2023-02-10', leap: true }, '2023-01-01')!.lunar?.leapFallback, false, '윤달 있는 해엔 윤달')
// 30일생, 작은달이면 29일
const bad = nextBirthday({ cal: 'lunar', date: '1990-01-30' }, '2026-01-01')
eq(bad === null || bad.days >= 0, true, '30일생 처리')

// 띠(설날 기준)·별자리
eq(zodiacOf('2000-01-15').key, 'rabbit', '2000년 1월 설 전 = 토끼')
eq(zodiacOf('2000-02-10').key, 'dragon', '2000년 설 후 = 용')
eq(zodiacOf('2026-03-01').ganzi, '병오', '2026 병오')
eq(['01-19', '01-20', '03-20', '03-21', '06-21', '06-22', '12-21', '12-22'].map(d => westernSign(`2000-${d}`)),
  ['capricorn', 'aquarius', 'pisces', 'aries', 'gemini', 'cancer', 'sagittarius', 'capricorn'], '별자리 경계')

// 학교: 2002년 1~2월생이 마지막 빠른년생
eq(schoolEntryYear('2002-02-10'), { year: 2008, early: true }, '마지막 빠른년생')
eq(schoolEntryYear('2003-02-10'), { year: 2010, early: false }, '빠른년생 폐지 후')
eq(schoolEntryYear('2002-03-01'), { year: 2009, early: false }, '2002 3월생')
eq(schoolStatus('2019-05-01', '2026-03-02'), { status: 'elementary', grade: 1 }, '초1')
eq(schoolStatus('2019-05-01', '2026-02-28'), { status: 'preschool', grade: 0 }, '입학 전')

// 국민연금 수급 개시 연령
eq([1952, 1953, 1956, 1957, 1961, 1965, 1968, 1969, 1990].map(pensionAge), [60, 61, 61, 62, 63, 64, 64, 65, 65], '국민연금')

// 이정표
const ms = ageMilestones('2007-12-31')
const get = (k: string) => ms.find(m => m.key === k)!.date
eq(get('youthProtection'), '2026-01-01', '청소년보호법 연 나이')
eq(get('adult'), '2026-12-31', '민법 성년 만 19세')
eq(get('idCard'), '2024-12-31', '주민등록증 만 17세')

// 나이 차이
const g = ageGap('1990-03-10', '1993-01-05')
eq([g.years, g.months, g.days, g.sign], [2, 9, 26, 1], '나이 차이')
eq(sanitizeMembers([{ id: 'a', name: 'x', cal: 'lunar', date: '2021-04-10', leap: true }, { id: 'b', name: 'y', cal: 'solar', date: '2000-01-01' }]).length, 1, '저장값 검증')

if (fail) { console.log(`${fail} failed`); process.exit(1) }
console.log('check-age: all passed')
