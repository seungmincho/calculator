import assert from 'node:assert/strict'
import {
  createLunarAnniversaryCalendar, selectLunarCalendarOccurrences, LunarCalendarError,
  LUNAR_CALENDAR_TITLE_LIMIT, LUNAR_CALENDAR_YEAR_LIMIT, type LunarCalendarOccurrence,
} from '../src/utils/lunarAnniversaryCalendar.ts'

let count = 0
async function test(label: string, run: () => void | Promise<void>) { await run(); count++; console.log(`PASS ${label}`) }
const stamp = new Date('2026-11-17T01:23:45.678+09:00')
const base = { title: '가족 기념일', month: 6, day: 10, isLeap: true, lunarYears: [2025, 2026] }
const description = (row: LunarCalendarOccurrence) => [
  `음력 ${row.lunarYear}년 기념일`,
  '윤달 없는 해는 평달, 30일 없는 달은 29일로 계산합니다.',
  row.leapFallback ? '이 해에는 윤달이 없어 평달로 대체했습니다.' : '윤달 대체 없음',
  row.dayFallback ? '이 해에는 30일이 없어 29일로 대체했습니다.' : '날짜 대체 없음',
].join('\n')
const errorIs = (code: string) => (error: unknown) => error instanceof LunarCalendarError && error.code === code
const unfold = (text: string) => text.replace(/\r\n[ \t]/g, '')
const parseEvents = (text: string) => {
  const events: Map<string, string>[] = []
  let event: Map<string, string> | null = null
  for (const line of unfold(text).split('\r\n')) {
    if (line === 'BEGIN:VEVENT') { assert.equal(event, null); event = new Map(); continue }
    if (line === 'END:VEVENT') { assert.ok(event); events.push(event); event = null; continue }
    if (!event) continue
    const separator = line.indexOf(':')
    assert.ok(separator > 0)
    assert.equal(event.has(line.slice(0, separator)), false)
    event.set(line.slice(0, separator), line.slice(separator + 1))
  }
  assert.equal(event, null)
  return events
}
const unescapeText = (value: string) => value.replace(/\\([nN,;\\])/g, (_, escaped: string) => /n/i.test(escaped) ? '\n' : escaped)

await test('each lunar year has its actual solar date and individual all-day event', async () => {
  const events = parseEvents(await createLunarAnniversaryCalendar(base, description, stamp))
  assert.equal(events.length, 2)
  assert.deepEqual(events.map(event => event.get('DTSTART;VALUE=DATE')), ['20250803', '20260723'])
  assert.deepEqual(events.map(event => event.get('DTEND;VALUE=DATE')), ['20250804', '20260724'])
  assert.equal(events[0].get('DTSTAMP'), '20261116T162345Z')
  assert.equal(unescapeText(events[0].get('SUMMARY')!), base.title)
})
await test('leap-month fallback and short-month fallback remain visible in event descriptions', async () => {
  const leap = parseEvents(await createLunarAnniversaryCalendar(base, description, stamp))
  assert.match(unescapeText(leap[1].get('DESCRIPTION')!), /윤달이 없어 평달로 대체/)
  assert.doesNotMatch(unescapeText(leap[0].get('DESCRIPTION')!), /이 해에는 윤달이 없어/)
  const shortInput = { ...base, month: 2, day: 30, isLeap: false, lunarYears: [2026] }
  const short = parseEvents(await createLunarAnniversaryCalendar(shortInput, description, stamp))[0]
  assert.equal(short.get('DTSTART;VALUE=DATE'), '20260416')
  assert.match(unescapeText(short.get('DESCRIPTION')!), /30일이 없어 29일로 대체/)
})
await test('a lunar year can export into the following solar year', async () => {
  const event = parseEvents(await createLunarAnniversaryCalendar({ ...base, month: 12, day: 30, isLeap: false, lunarYears: [2027] }, description, stamp))[0]
  assert.equal(event.get('DTSTART;VALUE=DATE'), '20280126')
  assert.equal(event.get('DTEND;VALUE=DATE'), '20280127')
})
await test('supported final solar date remains exportable with the exclusive next-year end', async () => {
  const event = parseEvents(await createLunarAnniversaryCalendar({ ...base, month: 11, day: 18, isLeap: false, lunarYears: [2050] }, description, stamp))[0]
  assert.equal(event.get('DTSTART;VALUE=DATE'), '20501231')
  assert.equal(event.get('DTEND;VALUE=DATE'), '20510101')
  assert.equal(selectLunarCalendarOccurrences({ month: 1, day: 1, isLeap: false }, [1900])[0].date, '1900-01-31')
})
await test('one unsupported occurrence rejects the complete selection instead of skipping it', async () => {
  await assert.rejects(createLunarAnniversaryCalendar({ ...base, month: 11, day: 19, isLeap: false, lunarYears: [2049, 2050] }, description, stamp), errorIs('outOfRange'))
  await assert.rejects(createLunarAnniversaryCalendar({ ...base, month: 12, day: 1, isLeap: false, lunarYears: [2050] }, description, stamp), errorIs('outOfRange'))
})
await test('selected past occurrences remain past; years sort without mutating caller selection', () => {
  const years = [2027, 1900, 2026]
  const rows = selectLunarCalendarOccurrences({ month: 1, day: 1, isLeap: false }, years)
  assert.deepEqual(rows.map(row => row.lunarYear), [1900, 2026, 2027])
  assert.equal(rows[0].date, '1900-01-31')
  assert.deepEqual(years, [2027, 1900, 2026])
})
await test('empty, duplicate and excessive selections fail explicitly', async () => {
  for (const [years, code] of [[[], 'empty'], [[2026, 2026], 'duplicate'], [Array.from({ length: 12 }, (_, index) => 2026 + index), 'tooMany']] as const) {
    await assert.rejects(createLunarAnniversaryCalendar({ ...base, lunarYears: [...years] }, description, stamp), errorIs(code))
  }
  const events = parseEvents(await createLunarAnniversaryCalendar({ ...base, lunarYears: Array.from({ length: LUNAR_CALENDAR_YEAR_LIMIT }, (_, index) => 2026 + index) }, description, stamp))
  assert.equal(events.length, 11)
})
await test('malformed and unsupported years are not rounded or clamped', () => {
  for (const years of [[1899], [2051], [2026.5], [NaN], [Infinity], ['2026'], null]) {
    assert.throws(() => selectLunarCalendarOccurrences(base, years as number[]), errorIs('invalidYears'))
  }
})
await test('lunar month, day and leap flag are strictly validated before conversion', () => {
  for (const value of [0, 13, 1.5, NaN, '6']) assert.throws(() => selectLunarCalendarOccurrences({ ...base, month: value as number }, [2026]), errorIs('invalidLunar'))
  for (const value of [0, 31, 1.5, NaN, '10']) assert.throws(() => selectLunarCalendarOccurrences({ ...base, day: value as number }, [2026]), errorIs('invalidLunar'))
  for (const value of [1, 'true', null]) assert.throws(() => selectLunarCalendarOccurrences({ ...base, isLeap: value as boolean }, [2026]), errorIs('invalidLunar'))
})
await test('100-character Unicode title survives folding; blank, overlong and malformed titles fail', async () => {
  const title = '한😀'.repeat(33) + '글'
  assert.equal(title.length, LUNAR_CALENDAR_TITLE_LIMIT)
  const event = parseEvents(await createLunarAnniversaryCalendar({ ...base, title }, description, stamp))[0]
  assert.equal(unescapeText(event.get('SUMMARY')!), title)
  for (const invalid of ['', ' \n\t ', 'a'.repeat(101), 'x\u0000', 'x\u000b', 'x\u007f', 'x\ud800']) {
    await assert.rejects(createLunarAnniversaryCalendar({ ...base, title: invalid }, description, stamp), errorIs('invalidTitle'))
  }
})
await test('title and description newlines cannot inject calendar properties or events', async () => {
  const title = '가족,친구;모임\\기념\r\nBEGIN:VEVENT\r\nSUMMARY:가짜'
  const text = await createLunarAnniversaryCalendar({ ...base, title, lunarYears: [2026] }, () => '설명,본문;메모\\원문\r\nEND:VEVENT\r\nBEGIN:VEVENT', stamp)
  const lines = unfold(text).split('\r\n')
  assert.equal(lines.filter(line => line === 'BEGIN:VEVENT').length, 1)
  assert.equal(lines.filter(line => line === 'END:VEVENT').length, 1)
  const event = parseEvents(text)[0]
  assert.equal(unescapeText(event.get('SUMMARY')!), title.replace(/\r\n/g, '\n'))
  assert.equal(unescapeText(event.get('DESCRIPTION')!), '설명,본문;메모\\원문\nEND:VEVENT\nBEGIN:VEVENT')
})
await test('RFC CRLF and UTF-8 folds preserve complete text and no recurrence/alarm is invented', async () => {
  const text = await createLunarAnniversaryCalendar({ ...base, title: '한😀'.repeat(30) }, () => '한국 음력 기념일 😀;'.repeat(60), stamp)
  assert.ok(text.startsWith('BEGIN:VCALENDAR\r\nVERSION:2.0\r\n'))
  assert.ok(text.endsWith('END:VCALENDAR\r\n'))
  assert.equal(text.replace(/\r\n/g, '').includes('\n'), false)
  assert.doesNotMatch(text, /(?:^|\r\n)(?:RRULE|RDATE|VALARM|TZID|METHOD)(?:[:;]|\r\n)/)
  for (const line of text.split('\r\n')) {
    assert.ok(Buffer.byteLength(line, 'utf8') <= 75)
    assert.equal(Buffer.from(line).toString('utf8'), line)
  }
  assert.equal(unescapeText(parseEvents(text)[0].get('DESCRIPTION')!), '한국 음력 기념일 😀;'.repeat(60))
})
await test('UID stays stable across timestamps, selection order and localized descriptions', async () => {
  const first = parseEvents(await createLunarAnniversaryCalendar(base, description, stamp))
  const second = parseEvents(await createLunarAnniversaryCalendar({ ...base, lunarYears: [2026, 2025] }, () => 'English description', new Date('2027-01-01T00:00:00Z')))
  assert.deepEqual(first.map(event => event.get('UID')), second.map(event => event.get('UID')))
  assert.notEqual(first[0].get('UID'), first[1].get('UID'))
  assert.match(first[0].get('UID')!, /^lunar-[0-9a-f]{64}@toolhub\.ai\.kr$/)
  const single = parseEvents(await createLunarAnniversaryCalendar({ ...base, lunarYears: [2026] }, description, stamp))[0]
  assert.equal(first[1].get('UID'), single.get('UID'))
  const renamed = parseEvents(await createLunarAnniversaryCalendar({ ...base, title: '다른 기념일' }, description, stamp))
  assert.notEqual(first[0].get('UID'), renamed[0].get('UID'))
})
await test('description and timestamp errors prevent a file from being returned', async () => {
  for (const invalid of ['', 'x\u0000', 'x\udfff', 'x'.repeat(4001)]) {
    await assert.rejects(createLunarAnniversaryCalendar(base, () => invalid, stamp), errorIs('invalidDescription'))
  }
  await assert.rejects(createLunarAnniversaryCalendar(base, description, new Date(NaN)), errorIs('timestamp'))
  await assert.rejects(createLunarAnniversaryCalendar(base, description, new Date('+010000-01-01T00:00:00Z')), errorIs('timestamp'))
})
await test('pending UID generation keeps a complete snapshot of the requested selection', async () => {
  const input = { ...base, lunarYears: [2025, 2026] }
  const pending = createLunarAnniversaryCalendar(input, description, stamp)
  input.title = '바뀐 제목'; input.month = 1; input.lunarYears.splice(0, 2, 2030)
  const events = parseEvents(await pending)
  assert.deepEqual(events.map(event => event.get('DTSTART;VALUE=DATE')), ['20250803', '20260723'])
  assert.equal(unescapeText(events[0].get('SUMMARY')!), base.title)
})

console.log(`${count} lunar anniversary calendar groups passed`)
