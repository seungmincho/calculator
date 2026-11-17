import assert from 'node:assert/strict'
import {
  createDdayCalendar, ddayCalendarUid, escapeCalendarText, foldCalendarLine,
  parseSavedDdays, selectDdayCalendarEvents, writeSavedDdays, DDAY_SAVED_KEY,
  DdayCalendarError, ddayCalendarErrorCode, type DdayCalendarEvent,
} from '../src/utils/ddayCalendar.ts'
import { addDays, isValidDate } from '../src/utils/dday.ts'

let count = 0
function test(label: string, run: () => void) { run(); count++; console.log(`PASS ${label}`) }
async function asyncTest(label: string, run: () => Promise<void>) { await run(); count++; console.log(`PASS ${label}`) }
const stamp = new Date('2026-11-16T22:00:01+09:00')
const event: DdayCalendarEvent = { id: 'saved-1', title: '졸업 기념일', date: '2028-02-29' }
const unfold = (text: string) => text.replace(/\r\n[ \t]/g, '')
const field = (text: string, name: string) => unfold(text).split('\r\n').find(line => line.startsWith(`${name}:`))?.slice(name.length + 1)
const errorIs = (code: string) => (error: unknown) => error instanceof DdayCalendarError && error.code === code
const file = await createDdayCalendar([event], stamp)

test('calendar envelope and final CRLF', () => {
  assert.ok(file.startsWith('BEGIN:VCALENDAR\r\nVERSION:2.0\r\n'))
  assert.ok(file.endsWith('END:VCALENDAR\r\n'))
  assert.equal(file.replace(/\r\n/g, '').includes('\n'), false)
  assert.equal(field(file, 'DTSTAMP'), '20261116T130001Z')
})
test('leap day is a one-day DATE with exclusive next-day end', () => {
  assert.equal(field(file, 'DTSTART;VALUE=DATE'), '20280229')
  assert.equal(field(file, 'DTEND;VALUE=DATE'), '20280301')
  assert.equal(file.includes('TZID'), false)
  assert.equal(file.includes('RRULE'), false)
  assert.equal(file.includes('VALARM'), false)
  assert.equal(file.includes('METHOD'), false)
})
test('TEXT escaping keeps colon literal and handles CRLF, CR, LF', () => {
  assert.equal(escapeCalendarText('가\\나,다;라:마\r\n바\r사\n아'), '가\\\\나\\,다\\;라:마\\n바\\n사\\n아')
})
test('75 octets exact boundary and 76th ASCII character', () => {
  assert.equal(foldCalendarLine('x'.repeat(75)), 'x'.repeat(75))
  assert.equal(foldCalendarLine('x'.repeat(76)), `${'x'.repeat(75)}\r\n x`)
})
for (const [label, text] of [
  ['Korean', '한글일정'.repeat(100)], ['emoji', '🧑‍💻📅'.repeat(80)], ['mixed', 'a한😀;\\,'.repeat(80)],
]) test(`UTF-8 folding preserves ${label} without splitting code points`, () => {
  const line = `SUMMARY:${escapeCalendarText(text)}`
  const folded = foldCalendarLine(line)
  assert.equal(unfold(folded), line)
  for (const physical of folded.split('\r\n')) {
    assert.ok(Buffer.byteLength(physical, 'utf8') <= 75)
    assert.equal(Buffer.from(physical).toString('utf8'), physical)
  }
})
await asyncTest('untrusted title cannot inject events or properties', async () => {
  const title = '모임\r\nEND:VEVENT\r\nBEGIN:VEVENT\r\nSUMMARY:가짜;날짜,내용\\끝'
  const text = await createDdayCalendar([{ ...event, title }], stamp)
  const lines = unfold(text).split('\r\n')
  assert.equal(lines.filter(line => line === 'BEGIN:VEVENT').length, 1)
  assert.equal(lines.filter(line => line === 'END:VEVENT').length, 1)
  assert.equal(lines.filter(line => line.startsWith('SUMMARY:')).length, 1)
  assert.equal(field(text, 'SUMMARY'), escapeCalendarText(title))
})
await asyncTest('repeat exports keep saved UID even when DTSTAMP changes', async () => {
  const later = await createDdayCalendar([event], new Date('2026-11-17T00:00:00Z'))
  assert.equal(field(file, 'UID'), field(later, 'UID'))
  assert.notEqual(field(file, 'DTSTAMP'), field(later, 'DTSTAMP'))
  assert.match(field(file, 'UID')!, /^dday-[0-9a-f]{64}@toolhub\.ai\.kr$/)
})
await asyncTest('separate saved IDs create separate UIDs without exposing names', async () => {
  assert.notEqual(await ddayCalendarUid(event), await ddayCalendarUid({ ...event, id: 'saved-2' }))
  assert.equal((await ddayCalendarUid(event)).includes(event.title), false)
})
await asyncTest('unsaved current identity is stable and distinct from saved identity', async () => {
  const current = { title: event.title, date: event.date }
  assert.equal(await ddayCalendarUid(current), await ddayCalendarUid({ ...current }))
  assert.notEqual(await ddayCalendarUid(current), await ddayCalendarUid(event))
})
for (const [date, expected] of [
  ['2028-02-28', '20280229'], ['2028-02-29', '20280301'], ['2027-02-28', '20270301'],
  ['2026-12-31', '20270101'], ['2026-03-08', '20260309'], ['0100-01-01', '01000102'], ['9999-12-30', '99991231'],
]) await asyncTest(`exclusive end ${date}`, async () => {
  assert.equal(isValidDate(date), true)
  const text = await createDdayCalendar([{ ...event, date }], stamp)
  assert.equal(field(text, 'DTEND;VALUE=DATE'), expected)
  assert.equal(expected, addDays(date, 1).replace(/-/g, ''))
})
for (const date of ['2027-02-29', '2028-02-30', '2026-13-01', '2026-00-10', '2026-01-00', '0000-01-01', '0001-01-01', '0099-12-31', '10000-01-01', '2026-1-1', '20260101', '2026-01-01\r\nSUMMARY:x']) {
  await asyncTest(`invalid date rejects whole file: ${JSON.stringify(date)}`, async () => {
    assert.equal(isValidDate(date), false)
    await assert.rejects(createDdayCalendar([event, { ...event, id: 'bad', date }], stamp), errorIs('invalidDate'))
  })
}
await asyncTest('9999 final day aborts the complete selection', async () => {
  assert.equal(isValidDate('9999-12-31'), true)
  assert.equal(isValidDate(addDays('9999-12-31', 1)), false)
  await assert.rejects(createDdayCalendar([event, { ...event, id: 'last', date: '9999-12-31' }], stamp), errorIs('endDate'))
})
for (const title of ['', '   ', '\u0000', 'x\u000b', 'x\u007f', 'x\ud800', '\udfff', '가'.repeat(2001)]) {
  await asyncTest(`invalid title rejected: ${JSON.stringify(title.slice(0, 20))}`, async () => {
    await assert.rejects(createDdayCalendar([{ ...event, title }], stamp), errorIs('invalidTitle'))
  })
}
await asyncTest('2000-character title stays intact', async () => {
  const title = '한'.repeat(2000)
  assert.equal(field(await createDdayCalendar([{ ...event, title }], stamp), 'SUMMARY'), title)
})
await asyncTest('invalid IDs cannot become injected UID text', async () => {
  await assert.rejects(createDdayCalendar([{ ...event, id: 'id\r\nSUMMARY:x' }], stamp), errorIs('invalidId'))
})
await asyncTest('empty export and 101 events are rejected without truncation', async () => {
  await assert.rejects(createDdayCalendar([], stamp), errorIs('empty'))
  await assert.rejects(createDdayCalendar(Array.from({ length: 101 }, (_, i) => ({ ...event, id: `s${i}` })), stamp), errorIs('tooMany'))
})
await asyncTest('100 events preserve selection order and distinct UIDs', async () => {
  const events = Array.from({ length: 100 }, (_, i) => ({ ...event, id: `s${i}`, title: `일정 ${i}` }))
  const lines = unfold(await createDdayCalendar(events, stamp)).split('\r\n')
  assert.equal(lines.filter(line => line === 'BEGIN:VEVENT').length, 100)
  assert.equal(new Set(lines.filter(line => line.startsWith('UID:'))).size, 100)
  assert.deepEqual(lines.filter(line => line.startsWith('SUMMARY:')), events.map(item => `SUMMARY:${item.title}`))
})
await asyncTest('duplicate entries abort the file', async () => { await assert.rejects(createDdayCalendar([event, event], stamp), errorIs('duplicate')) })
await asyncTest('invalid or five-digit generation year rejected', async () => {
  await assert.rejects(createDdayCalendar([event], new Date(NaN)), errorIs('timestamp'))
  await assert.rejects(createDdayCalendar([event], new Date('+010000-01-01T00:00:00Z')), errorIs('timestamp'))
})

const saved = [{ id: '1', title: '첫 일정', date: '2028-02-29', pinned: true }, { id: '2', title: '두 번째', date: '2026-12-31' }]
const raw = JSON.stringify(saved)
test('valid saved list survives completely', () => assert.deepEqual(parseSavedDdays(raw), saved))
test('missing saved list becomes empty', () => assert.deepEqual(parseSavedDdays(null), []))
test('selection follows chosen IDs and does not silently drop missing entries', () => {
  assert.deepEqual(selectDdayCalendarEvents(saved, ['2', '1']).map(item => item.id), ['2', '1'])
  assert.throws(() => selectDdayCalendarEvents(saved, ['1', 'gone']), errorIs('selectionChanged'))
  assert.throws(() => selectDdayCalendarEvents(saved, ['1', '1']), errorIs('duplicate'))
  assert.throws(() => selectDdayCalendarEvents(saved, []), errorIs('empty'))
})
for (const value of ['{oops', 'null', '{}', '42', '[null]', '[{}]', JSON.stringify([...saved, { ...saved[0] }]), JSON.stringify([{ ...saved[0], date: 'invalid' }]), JSON.stringify([{ ...saved[0], title: 123 }]), JSON.stringify([{ ...saved[0], pinned: 'yes' }])]) {
  test(`unreadable saved list rejected: ${value.slice(0, 30)}`, () => assert.throws(() => parseSavedDdays(value), errorIs('savedCorrupt')))
}
test('future envelope is preserved as unsupported', () => assert.throws(() => parseSavedDdays('{"version":2,"items":[]}'), errorIs('savedUnsupported')))
class MemoryStorage {
  values = new Map<string, string>()
  getItem(key: string) { return this.values.get(key) ?? null }
  setItem(key: string, value: string) { this.values.set(key, value) }
}
test('writes succeed only from observed saved list', () => {
  const storage = new MemoryStorage()
  assert.equal(writeSavedDdays(storage, null, saved), raw)
  assert.equal(storage.getItem(DDAY_SAVED_KEY), raw)
  assert.throws(() => writeSavedDdays(storage, null, []), errorIs('savedConflict'))
  assert.equal(storage.getItem(DDAY_SAVED_KEY), raw)
})
test('corrupt list cannot be overwritten', () => {
  const storage = new MemoryStorage(); storage.setItem(DDAY_SAVED_KEY, '[null]')
  assert.throws(() => writeSavedDdays(storage, '[null]', saved), errorIs('savedCorrupt'))
  assert.equal(storage.getItem(DDAY_SAVED_KEY), '[null]')
})
test('quota errors preserve previous raw', () => {
  const storage = new MemoryStorage(); storage.setItem(DDAY_SAVED_KEY, raw)
  storage.setItem = () => { const error = new Error('full'); error.name = 'QuotaExceededError'; throw error }
  try { writeSavedDdays(storage, raw, []) } catch (error) { assert.equal(ddayCalendarErrorCode(error), 'savedQuota') }
  assert.equal(storage.getItem(DDAY_SAVED_KEY), raw)
})
test('readback catches a write conflict', () => {
  const storage = new MemoryStorage(); storage.setItem = key => storage.values.set(key, 'changed')
  assert.throws(() => writeSavedDdays(storage, null, saved), errorIs('savedConflict'))
})
console.log(`${count} D-day calendar checks passed`)
