import assert from 'node:assert/strict'
import { webcrypto } from 'node:crypto'
import {
  snapshotMeetingCalendar, createMeetingCalendar, MeetingCalendarError, type MeetingCalendarInput,
} from '../src/utils/worldClockCalendar.ts'
import { createMeetingActionGuard, copyMeetingText, downloadMeetingCalendar } from '../src/utils/worldClockActions.ts'
import { MEETING_MAX_MS } from '../src/utils/worldClockMeeting.ts'

const now = Date.parse('2026-11-17T00:00:00Z')
const input: MeetingCalendarInput = { title: '미팅 제목', startMs: Date.parse('2026-11-19T03:30:47Z'), durationMinutes: 60, cityIds: ['seoul', 'newYork'] }
const digest = (bytes: Uint8Array<ArrayBuffer>) => webcrypto.subtle.digest('SHA-256', bytes)
const code = (expected: string) => (error: unknown) => error instanceof MeetingCalendarError && error.code === expected
function deferred<T>() { let resolve!: (value: T) => void, reject!: (error: Error) => void; const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no }); return { promise, resolve, reject } }
const parse = (ics: string) => {
  assert.equal(ics.replace(/\r\n/g, '').includes('\n'), false)
  assert.ok(ics.endsWith('\r\n'))
  assert.ok(ics.split('\r\n').every(line => new TextEncoder().encode(line).length <= 75))
  const lines = ics.replace(/\r\n[ \t]/g, '').split('\r\n').filter(Boolean)
  assert.equal(lines.filter(line => line === 'BEGIN:VEVENT').length, 1)
  assert.equal(lines.filter(line => line === 'END:VEVENT').length, 1)
  const properties = new Map(lines.filter(line => !line.startsWith('BEGIN:') && !line.startsWith('END:')).map(line => {
    const at = line.indexOf(':'); return [line.slice(0, at), line.slice(at + 1)]
  }))
  const instant = (key: string) => {
    const value = properties.get(key)!
    assert.match(value, /^\d{8}T\d{6}Z$/)
    return Date.parse(`${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}T${value.slice(9, 11)}:${value.slice(11, 13)}:${value.slice(13, 15)}Z`)
  }
  const text = (key: string) => properties.get(key)!.replace(/\\([nN,;\\])/g, (_, c) => c.toLowerCase() === 'n' ? '\n' : c)
  return { lines, properties, instant, text }
}
let groups = 0
async function check(label: string, run: () => void | Promise<void>) { await run(); groups++; console.log(`PASS ${label}`) }

await check('strict snapshot fields, 1..100 title, allowed durations and isolated city order', () => {
  const value = { ...input, cityIds: [...input.cityIds] }; const snapshot = snapshotMeetingCalendar(value)
  value.cityIds.reverse(); value.title = 'later'; value.startMs += 1000
  assert.equal(snapshot.title, input.title); assert.equal(snapshot.startMs, input.startMs); assert.deepEqual(snapshot.cityIds, input.cityIds)
  assert.equal(snapshot.endMs - snapshot.startMs, 3600000)
  for (const title of ['', ' ', '\0', '\ud800', '가'.repeat(101)]) assert.throws(() => snapshotMeetingCalendar({ ...input, title }), code('title'))
  assert.equal(snapshotMeetingCalendar({ ...input, title: '가'.repeat(100) }).title.length, 100)
  for (const durationMinutes of [0, 15, 45, 61, 180, NaN]) assert.throws(() => snapshotMeetingCalendar({ ...input, durationMinutes }), code('duration'))
  for (const cityIds of [[], ['utc', 'utc'], ['bad'], [' seoul']]) assert.throws(() => snapshotMeetingCalendar({ ...input, cityIds }), code('cities'))
})
await check('single UTC VEVENT roundtrip preserves seconds and exact durations across DST and midnight', async () => {
  for (const startMs of [input.startMs, Date.parse('2026-11-01T05:30:17Z'), Date.parse('2026-11-01T06:30:17Z'), Date.parse('2026-11-19T23:45:59Z')]) {
    for (const durationMinutes of [30, 60, 90, 120]) {
      const result = parse(await createMeetingCalendar({ ...input, startMs, durationMinutes }, now, digest))
      assert.equal(result.instant('DTSTART'), startMs); assert.equal(result.instant('DTEND'), startMs + durationMinutes * 60000)
      assert.equal(result.instant('DTSTAMP'), now)
      assert.ok(!result.lines.some(line => /^(RRULE|ATTENDEE|BEGIN:VALARM|TZID|DTSTART;|DTEND;)/.test(line)))
      assert.match(result.properties.get('UID')!, /^world-clock-[a-f0-9]{64}@toolhub\.ai\.kr$/)
    }
  }
})
await check('TEXT escape and UTF8 folding prevent property injection without changing valid text', async () => {
  const title = '한글😀'.repeat(10) + '\\;,' + '\r\nBEGIN:VEVENT\nSUMMARY:다른 제목'
  assert.ok(title.length <= 100)
  const raw = await createMeetingCalendar({ ...input, title }, now, digest), parsed = parse(raw)
  assert.equal(parsed.text('SUMMARY'), title.replace(/\r\n|\r/g, '\n'))
  assert.equal(parsed.lines.filter(line => line.startsWith('SUMMARY:')).length, 1)
  assert.ok(raw.includes('\r\n '))
  assert.equal(parsed.properties.size, 8)
})
await check('stable UID excludes locale/city order and export timestamp, includes actual event identity', async () => {
  const a = parse(await createMeetingCalendar(input, now, digest))
  const b = parse(await createMeetingCalendar({ ...input, cityIds: [...input.cityIds].reverse() }, now + 1000, digest))
  assert.equal(a.properties.get('UID'), b.properties.get('UID')); assert.notEqual(a.properties.get('DTSTAMP'), b.properties.get('DTSTAMP'))
  for (const patch of [{ title: '다른 미팅' }, { startMs: input.startMs + 1000 }, { durationMinutes: 30 }]) {
    assert.notEqual(parse(await createMeetingCalendar({ ...input, ...patch }, now, digest)).properties.get('UID'), a.properties.get('UID'))
  }
})
await check('UTC/all-selected-city end boundary, timestamp and digest failure are explicit', async () => {
  assert.throws(() => snapshotMeetingCalendar({ ...input, cityIds: ['utc'], startMs: MEETING_MAX_MS - 29 * 60000 }), code('end'))
  assert.throws(() => snapshotMeetingCalendar({ ...input, cityIds: ['seoul'], startMs: Date.parse('9999-12-31T14:30:00Z') }), code('end'))
  assert.throws(() => snapshotMeetingCalendar({ ...input, cityIds: ['newYork'], startMs: Date.parse('1900-01-01T00:00:00Z') }), code('instant'))
  assert.ok(await createMeetingCalendar({ ...input, cityIds: ['utc'], startMs: MEETING_MAX_MS - 3600000 }, now, digest))
  await assert.rejects(createMeetingCalendar(input, NaN, digest), code('timestamp'))
  await assert.rejects(createMeetingCalendar(input, now, async () => { throw new Error('blocked') }), code('generate'))
  await assert.rejects(createMeetingCalendar(input, now, async () => new ArrayBuffer(1)), code('generate'))
})
await check('async UID uses click-time snapshot even when the caller mutates its input objects', async () => {
  const value = { ...input, cityIds: [...input.cityIds] }, wait = deferred<ArrayBuffer>()
  const promise = createMeetingCalendar(value, now, () => wait.promise)
  value.startMs += 60000; value.title = 'edited'; value.cityIds[0] = 'utc'
  wait.resolve(await digest(new TextEncoder().encode('controlled digest')))
  const parsed = parse(await promise)
  assert.equal(parsed.instant('DTSTART'), input.startMs); assert.equal(parsed.text('SUMMARY'), input.title)
})
await check('generation guard blocks late download on edits/new request/unmount and preserves retry', async () => {
  const guard = createMeetingActionGuard(), ticket = guard.begin('calendar'), wait = deferred<ArrayBuffer>()
  const files: { text: string; filename: string }[] = []
  const pending = downloadMeetingCalendar(input, () => guard.isCurrent(ticket), { now: () => now, digest: () => wait.promise, save: (text, filename) => { files.push({ text, filename }) } })
  guard.invalidate(); wait.resolve(await digest(new TextEncoder().encode('late')))
  assert.equal(await pending, 'stale'); assert.equal(files.length, 0)
  const latest = guard.begin('calendar')
  assert.equal(await downloadMeetingCalendar(input, () => guard.isCurrent(latest), { now: () => now, digest, save: (text, filename) => { files.push({ text, filename }) } }), 'started')
  assert.equal(files.length, 1); assert.equal(files[0].filename, 'toolhub-world-clock-meeting.ics'); assert.equal(parse(files[0].text).instant('DTSTART'), input.startMs)
  const old = guard.begin('calendar'); guard.begin('calendar'); assert.equal(guard.isCurrent(old), false)
  assert.equal(await downloadMeetingCalendar(input, () => true, { now: () => now, digest, save() { throw new Error('blocked') } }), 'failed')
  assert.equal(await downloadMeetingCalendar(input, () => false, { digest: async () => { throw new Error('must not run') } }), 'stale')
})
await check('clipboard only reports actual success, suppresses old fallback and orders independent actions', async () => {
  const guard = createMeetingActionGuard(), a = guard.begin('copy'), b = guard.begin('calendar')
  assert.equal(guard.isCurrent(a), true); assert.equal(guard.isCurrent(b), true)
  let fallback = 0
  assert.equal(await copyMeetingText('exact summary', () => true, { writeText: async () => {}, fallback() { fallback++; return false } }), 'copied')
  assert.equal(fallback, 0)
  assert.equal(await copyMeetingText('exact summary', () => true, { writeText: async () => { throw new Error('blocked') }, fallback() { fallback++; return false } }), 'failed')
  assert.equal(await copyMeetingText('exact summary', () => true, { fallback: () => true }), 'copied')
  const wait = deferred<void>(), pending = copyMeetingText('old summary', () => guard.isCurrent(a), { writeText: () => wait.promise, fallback() { fallback++; return true } })
  guard.begin('copy'); wait.reject(new Error('late')); assert.equal(await pending, 'stale'); assert.equal(fallback, 1)
  guard.invalidate(); assert.equal(guard.isCurrent(b), false)
  assert.equal(await copyMeetingText('old summary', () => false, { fallback() { throw new Error('must not run') } }), 'stale')
})

console.log(`World Clock calendar/actions: ${groups} groups passed`)
