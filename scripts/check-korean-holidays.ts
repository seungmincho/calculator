// 공휴일 회귀 체크: node scripts/check-korean-holidays.ts
// 기대값 출처: 관공서의 공휴일에 관한 규정 제2·3조(2026-04-28 개정 — 노동절·제헌절), 인사혁신처 월력요항,
// 선거일(공직선거법 제34조)·임시공휴일(국무회의 의결)
import assert from 'node:assert/strict'
import { getKoreanHolidays, csatDate, getPresetDates } from '../src/utils/koreanHolidays.ts'

const dates = (y: number) => [...new Set(getKoreanHolidays(y).map(h => h.date))]
const subs = (y: number) => getKoreanHolidays(y).filter(h => h.nameKey === 'substituteHoliday').map(h => h.date)
const md = (y: number, list: string) => list.split(' ').map(d => `${y}-${d}`)

// 연도별 전체 휴일(중복 날짜는 하루)
assert.deepEqual(dates(2025), md(2025, '01-01 01-27 01-28 01-29 01-30 03-01 03-03 05-05 05-06 06-03 06-06 08-15 10-03 10-05 10-06 10-07 10-08 10-09 12-25'))
assert.deepEqual(dates(2026), md(2026, '01-01 02-16 02-17 02-18 03-01 03-02 05-01 05-05 05-24 05-25 06-03 06-06 07-17 08-15 08-17 09-24 09-25 09-26 10-03 10-05 10-09 12-25'))
assert.deepEqual(dates(2027), md(2027, '01-01 02-06 02-07 02-08 02-09 03-01 05-01 05-03 05-05 05-13 06-06 07-17 07-19 08-15 08-16 09-14 09-15 09-16 10-03 10-04 10-09 10-11 12-25 12-27'))
assert.equal(dates(2027).length, 24, '2027 휴일 24일 (인사처 발표)')

// 대체공휴일
assert.deepEqual(subs(2025), md(2025, '03-03 05-06 10-08'), '2025: 삼일절(토), 어린이날·부처님오신날 겹침, 추석(일)')
assert.deepEqual(subs(2026), md(2026, '03-02 05-25 08-17 10-05'), '2026: 현충일(토)·추석(목~토)은 대체 없음')
assert.deepEqual(subs(2027), md(2027, '02-09 05-03 07-19 08-16 10-04 10-11 12-27'), '2027 대체 7일')
assert.ok(subs(2028).includes('2028-10-05'), '2028 추석 연휴·개천절 겹침 → 10/5')
assert.ok(!subs(2028).includes('2028-01-03'), '2028 신정(토) 대체 없음')
assert.ok(!subs(2027).some(d => d.startsWith('2027-06')), '2027 현충일(일) 대체 없음')

// 노동절·제헌절은 2026년부터
const has = (d: string, key: string) => getKoreanHolidays(+d.slice(0, 4)).some(h => h.date === d && h.nameKey === key)
assert.ok(has('2026-05-01', 'laborDay') && has('2026-07-17', 'constitutionDay'))
assert.ok(!has('2025-05-01', 'laborDay') && !has('2025-07-17', 'constitutionDay'))

// 선거일·임시공휴일
for (const d of ['2024-04-10', '2025-06-03', '2026-06-03', '2028-04-12']) assert.ok(has(d, 'election'), d)
for (const d of ['2024-10-01', '2025-01-27']) assert.ok(has(d, 'tempHoliday'), d)

// 수능 (공식 발표일)
assert.equal(csatDate(2024).date, '2024-11-14')
assert.equal(csatDate(2025).date, '2025-11-13')
assert.equal(csatDate(2026).date, '2026-11-19')
assert.equal(csatDate(2027).date, '2027-11-18')
const csat = getPresetDates(new Date().getFullYear()).find(p => p.key === 'csat')
assert.ok(csat && csat.date === csatDate(+csat.date.slice(0, 4)).date, 'getPresetDates 수능 = csatDate')

console.log('all korean holiday checks passed')
