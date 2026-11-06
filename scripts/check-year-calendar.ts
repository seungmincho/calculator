// node scripts/check-year-calendar.ts (Node 24) — 2027 값은 한국천문연구원 달력자료(2026-11-07)와 대조
import assert from 'node:assert/strict'
import { buildYear, customDays, dayOfWeek, holidaySummary, longWeekends, lunarOf, solarTerms } from '../src/utils/yearCalendar.ts'

const months = buildYear(2027)
assert.equal(months.length, 12)
const days = months.flatMap(m => m.weeks.flat()).filter(Boolean)
assert.equal(days.length, 365)
assert.ok(months.every(m => m.weeks.every(w => w.length === 7)), 'full weeks')
assert.equal(dayOfWeek('2027-01-01'), 5, '2027-01-01 금요일')
assert.equal(months[0].weeks[0].findIndex(Boolean), 5, '1월 1일은 금요일 칸')

// 천문연 2027 공휴일 표: 24일, 대체공휴일 7일(설날·노동절·제헌절·광복절·개천절·한글날·크리스마스)
const s = holidaySummary(2027)
assert.deepEqual([s.total, s.substitute, s.weekday, s.weekend, s.weekends, s.offDays], [24, 7, 15, 9, 104, 119])

// 24절기 (KST)
const terms = solarTerms(2027)
assert.equal(terms.length, 24)
assert.deepEqual(terms[2], { key: 'ipchun', date: '2027-02-04', time: '10:46' })
assert.deepEqual(terms[11], { key: 'haji', date: '2027-06-21', time: '23:11' })
assert.deepEqual(terms[23], { key: 'dongji', date: '2027-12-22', time: '11:42' })
assert.ok(terms.every((t, i) => i === 0 || t.date > terms[i - 1].date), 'in order')
assert.equal(days.filter(d => d!.term).length, 24)
assert.deepEqual(customDays(2027).map(c => `${c.key} ${c.date}`), ['daeboreum 2027-02-21', 'hansik 2027-04-06', 'dano 2027-06-09', 'chobok 2027-07-20', 'jungbok 2027-07-30', 'chilseok 2027-08-08', 'malbok 2027-08-09'])
assert.deepEqual(solarTerms(1999), [])

// 음력: 설날 = 음력 1월 1일, 추석 = 8월 15일, 정월대보름 = 1월 15일
assert.deepEqual(lunarOf('2027-02-07'), { month: 1, day: 1, leap: false })
assert.deepEqual(lunarOf('2027-09-15'), { month: 8, day: 15, leap: false })
assert.deepEqual(lunarOf('2027-02-21'), { month: 1, day: 15, leap: false })

// 3일 이상 연휴
const lw = longWeekends(2027).map(w => `${w.start}~${w.end} ${w.days}`)
assert.deepEqual(lw, [
  '2027-01-01~2027-01-03 3', '2027-02-06~2027-02-09 4', '2027-02-27~2027-03-01 3', '2027-05-01~2027-05-03 3',
  '2027-07-17~2027-07-19 3', '2027-08-14~2027-08-16 3', '2027-09-14~2027-09-16 3', '2027-10-02~2027-10-04 3',
  '2027-10-09~2027-10-11 3', '2027-12-25~2027-12-27 3',
])
console.log('check-year-calendar: all passed')
