import assert from 'node:assert/strict'
import { performance } from 'node:perf_hooks'
import {
  MEETING_MIN_MS, MEETING_MAX_MS, MEETING_CITY_LIMIT, parseMeetingCityIds, initialMeetingCityIds,
  isMeetingInstant, parseMeetingAt, meetingDay, meetingOffsetSeconds, meetingOffsetIntervals,
  meetingWorkIntervals, meetingSlotIndex, defaultMeetingInstant, meetingShareUrl, meetingShareLine,
  formatMeetingLocal, formatMeetingOffset, MeetingError,
} from '../src/utils/worldClockMeeting.ts'
import { CITIES, DEFAULT_IDS, localParts, resolveCity } from '../src/utils/worldClock.ts'

const utc = (value: string) => Date.parse(value)
const HOUR = 3600000, NY = 'America/New_York', SEOUL = 'Asia/Seoul', LORD = 'Australia/Lord_Howe'
let checks = 0
function check(label: string, run: () => void) { run(); checks++; console.log(`PASS ${label}`) }
const throwsCode = (run: () => void, code: string) => assert.throws(run, e => e instanceof MeetingError && e.code === code)

check('city priority, dedupe/order, invalid tokens and 12-city cap', () => {
  assert.deepEqual(parseMeetingCityIds(' seoul,newYork,seoul,Not/AZone,utc,Asia/Kathmandu '), ['seoul', 'newYork', 'utc', 'Asia/Kathmandu'])
  for (const raw of [null, 2, [], {}, 'x'.repeat(4097)]) assert.deepEqual(parseMeetingCityIds(raw), [])
  assert.deepEqual(parseMeetingCityIds(CITIES.map(c => c.id).join(',')), CITIES.slice(0, MEETING_CITY_LIMIT).map(c => c.id))
  assert.deepEqual(initialMeetingCityIds('utc', 'seoul'), ['utc'])
  assert.deepEqual(initialMeetingCityIds('bad', 'seoul,newYork'), ['seoul', 'newYork'])
  assert.deepEqual(initialMeetingCityIds('', null), DEFAULT_IDS)
})
check('epoch seconds retain Seoul minutes/seconds, both repeated New York hours and zero', () => {
  for (const ms of [utc('2026-11-19T03:30:47Z'), utc('2026-11-01T05:30:17Z'), utc('2026-11-01T06:30:17Z'), 0]) {
    assert.equal(parseMeetingAt(String(ms / 1000), [SEOUL, NY, 'UTC']), ms)
    const link = meetingShareUrl('https://toolhub.ai.kr/world-clock/?keep=1#result', ['seoul', 'newYork'], ms)
    const params = new URL(link).searchParams
    assert.equal(parseMeetingAt(params.get('at'), [SEOUL, NY]), ms)
    assert.equal(params.get('keep'), '1'); assert.equal(new URL(link).hash, '#result')
  }
  const a = formatMeetingLocal(NY, utc('2026-11-01T05:30:17Z'), 'en'), b = formatMeetingLocal(NY, utc('2026-11-01T06:30:17Z'), 'en')
  assert.ok(a.includes('01:30:17 UTC-04:00')); assert.ok(b.includes('01:30:17 UTC-05:00'))
  for (const raw of ['', ' ', 'NaN', 'Infinity', '1e9', '1.2', '+1000', '999999999999999999']) assert.equal(parseMeetingAt(raw, [SEOUL]), null)
  assert.equal(isMeetingInstant(utc('2026-01-01T00:00:00Z') + 1, [SEOUL]), false)
})
check('UTC and every city obey 1900..9999, including negative epoch and offset year boundaries', () => {
  assert.equal(parseMeetingAt(String(MEETING_MIN_MS / 1000), ['UTC']), MEETING_MIN_MS)
  assert.equal(parseMeetingAt(String(MEETING_MAX_MS / 1000), ['UTC']), MEETING_MAX_MS)
  assert.equal(isMeetingInstant(MEETING_MIN_MS - 1000, ['UTC']), false)
  assert.equal(isMeetingInstant(MEETING_MAX_MS + 1000, ['UTC']), false)
  assert.equal(isMeetingInstant(MEETING_MIN_MS, [NY]), false)
  assert.equal(isMeetingInstant(MEETING_MAX_MS, [SEOUL]), false)
  assert.equal(isMeetingInstant(utc('1900-01-02T00:00:00Z'), [NY, SEOUL]), true)
  assert.equal(isMeetingInstant(0, ['Not/AZone']), false)
  assert.equal(isMeetingInstant(0, []), false)
  throwsCode(() => meetingShareUrl('https://example.test', ['utc', 'utc'], 0), 'cities')
})
check('normal, spring and fall days use actual 24/23/25 hours and omit or repeat wall times correctly', () => {
  const ordinary = meetingDay(SEOUL, '2026-11-19')
  assert.equal(ordinary.totalMs, 24 * HOUR); assert.equal(ordinary.slots.length, 24)
  assert.equal(ordinary.startMs, utc('2026-11-18T15:00:00Z')); assert.equal(ordinary.endMs, utc('2026-11-19T15:00:00Z'))
  const spring = meetingDay(NY, '2026-03-08'), fall = meetingDay(NY, '2026-11-01')
  assert.equal(spring.totalMs, 23 * HOUR); assert.equal(spring.slots.length, 23)
  assert.ok(!spring.slots.some(s => localParts(NY, s.startMs).h === 2))
  assert.equal(fall.totalMs, 25 * HOUR); assert.equal(fall.slots.length, 25)
  assert.equal(fall.slots.filter(s => localParts(NY, s.startMs).h === 1).length, 2)
  for (const day of [ordinary, spring, fall]) {
    assert.equal(day.slots.reduce((n, s) => n + s.endMs - s.startMs, 0), day.totalMs)
    assert.ok(day.slots.every((s, i) => i === 0 || s.startMs === day.slots[i - 1].endMs))
    assert.equal(meetingSlotIndex(day, day.startMs), 0); assert.equal(meetingSlotIndex(day, day.endMs), -1)
  }
})
check('Lord Howe half-hour changes and Kathmandu offset retain real partial final slots', () => {
  for (const [date, hours, slots] of [['2026-04-05', 24.5, 25], ['2026-10-04', 23.5, 24]] as const) {
    const day = meetingDay(LORD, date)
    assert.equal(day.totalMs, hours * HOUR); assert.equal(day.slots.length, slots)
    assert.equal(day.slots.at(-1)!.endMs - day.slots.at(-1)!.startMs, HOUR / 2)
    assert.equal(localParts(LORD, day.endMs).h, 0); assert.equal(localParts(LORD, day.endMs).mi, 0)
  }
  const day = meetingDay('Asia/Kathmandu', '2026-11-19')
  assert.equal(day.startMs, utc('2026-11-18T18:15:00Z')); assert.equal(day.totalMs, 24 * HOUR)
  assert.equal(meetingOffsetSeconds('Asia/Kathmandu', day.startMs), 20700)
})
check('strict dates, skipped Apia date, 9999 terminal date and historical long repeated day', () => {
  for (const date of ['1899-12-31', '10000-01-01', '2026-02-29', '2026-13-01', '2026-1-01', '']) throwsCode(() => meetingDay('UTC', date), 'date')
  throwsCode(() => meetingDay('Pacific/Apia', '2011-12-30'), 'unavailableDate')
  const end = meetingDay('UTC', '9999-12-31'); assert.equal(end.endMs, MEETING_MAX_MS + 1000)
  const repeat = meetingDay('Pacific/Kwajalein', '1969-09-30')
  assert.equal(repeat.totalMs, 47 * HOUR); assert.equal(repeat.slots.length, 47)
})
check('transition intervals find the exact second and retain a historical seconds offset', () => {
  const intervals = meetingOffsetIntervals(NY, utc('2026-11-01T04:00:00Z'), utc('2026-11-01T09:00:00Z'))
  assert.deepEqual(intervals, [
    { startMs: utc('2026-11-01T04:00:00Z'), endMs: utc('2026-11-01T06:00:00Z'), offsetSeconds: -14400 },
    { startMs: utc('2026-11-01T06:00:00Z'), endMs: utc('2026-11-01T09:00:00Z'), offsetSeconds: -18000 },
  ])
  const historical = utc('1900-01-01T12:00:00Z')
  assert.equal(meetingOffsetSeconds('Europe/Paris', historical), 561)
  assert.equal(formatMeetingOffset(561), 'UTC+00:09:21')
  assert.equal(formatMeetingOffset(-561), 'UTC-00:09:21')
  const paris = meetingDay('Europe/Paris', '1900-01-02')
  assert.equal(paris.startMs, utc('1900-01-01T23:50:39Z'))
  for (const date of ['0050-01-01T00:00:00Z', '1899-01-01T00:00:00Z', '+010001-01-01T00:00:00Z']) throwsCode(() => meetingOffsetSeconds('UTC', utc(date)), 'instant')
})
check('work intersections use precise boundaries including 45 minutes and historical seconds', () => {
  const seoul = meetingDay(SEOUL, '2026-11-19')
  const modern = meetingWorkIntervals([SEOUL, 'Asia/Kathmandu'], seoul, 9, 18)
  assert.deepEqual(modern.intervals, [{ startMs: utc('2026-11-19T03:15:00Z'), endMs: utc('2026-11-19T09:00:00Z') }])
  assert.equal(modern.totalMs, 5.75 * HOUR)
  assert.equal(modern.slotOverlapMs[12], .75 * HOUR)
  assert.equal(modern.slotOverlapMs.reduce((a, b) => a + b, 0), modern.totalMs)
  const day = meetingDay('UTC', '1900-01-01'), historical = meetingWorkIntervals(['UTC', 'Europe/Paris'], day, 9, 18)
  assert.deepEqual(historical.intervals, [{ startMs: utc('1900-01-01T09:00:00Z'), endMs: utc('1900-01-01T17:50:39Z') }])
  assert.equal(historical.totalMs, (9 * 3600 - 561) * 1000)
  assert.equal(historical.slotOverlapMs.reduce((a, b) => a + b, 0), historical.totalMs)
  assert.equal(meetingWorkIntervals(['UTC'], meetingDay('UTC', '2026-11-21'), 9, 18).totalMs, 0)
  throwsCode(() => meetingWorkIntervals(['UTC'], day, 18, 9), 'workHours')
})
check('selection is independent from highlight and reordered cities; explicit date default uses actual overlap', () => {
  const exact = utc('2026-11-19T03:30:47Z'), seoul = meetingDay(SEOUL, '2026-11-19')
  assert.equal(meetingSlotIndex(seoul, exact), 12); assert.notEqual(seoul.slots[12].startMs, exact)
  for (const ids of [['seoul', 'newYork'], ['newYork', 'seoul']]) {
    const url = new URL(meetingShareUrl('https://example.test/world-clock/', ids, exact))
    assert.equal(url.searchParams.get('at'), String(exact / 1000))
  }
  const overlap = meetingWorkIntervals([SEOUL, 'Asia/Kathmandu'], seoul, 9, 18)
  assert.equal(defaultMeetingInstant(seoul, [SEOUL, 'Asia/Kathmandu'], overlap), utc('2026-11-19T03:15:00Z'))
  const saturday = meetingDay(SEOUL, '2026-11-21'), none = meetingWorkIntervals([SEOUL], saturday, 9, 18)
  assert.equal(localParts(SEOUL, defaultMeetingInstant(saturday, [SEOUL], none)).h, 9)
})
check('copy text preserves seconds, locale city names and offset without rounding the instant', () => {
  const instant = utc('2026-11-19T03:30:47Z'), cities = ['seoul', 'newYork'].map(id => resolveCity(id)!)
  const ko = meetingShareLine(instant, cities, 'ko'), en = meetingShareLine(instant, cities, 'en')
  assert.ok(ko.includes('서울: 2026-11-19')); assert.ok(ko.includes('12:30:47'))
  assert.ok(en.includes('Seoul: 2026-11-19')); assert.ok(en.includes('New York: 2026-11-18'))
  assert.ok(en.includes('22:30:47 UTC-05:00'))
})

const began = performance.now()
const day = meetingDay('Australia/Lord_Howe', '2026-04-06')
meetingWorkIntervals(CITIES.slice(0, 12).map(c => c.tz), day, 0, 24)
console.log(`Bounded Intl day + 12-city intersection: ${(performance.now() - began).toFixed(1)} ms on this Node runtime (not a browser performance guarantee)`)
console.log(`World Clock meeting: ${checks} groups passed`)
