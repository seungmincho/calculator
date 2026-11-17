import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { webcrypto } from 'node:crypto'
import { meetingDay, meetingOffsetSeconds, meetingOffsetIntervals, meetingWorkIntervals, meetingSlotIndex, parseMeetingAt, meetingShareUrl, initialMeetingCityIds, isMeetingInstant, formatMeetingLocal, MEETING_MIN_MS, MEETING_MAX_MS } from '../../../src/utils/worldClockMeeting.ts'
import { createMeetingCalendar, snapshotMeetingCalendar } from '../../../src/utils/worldClockCalendar.ts'

// Reuse only author I/O fixture declarations; none of the author's assertions execute.
const authorFile = 'scripts/check-world-clock-components.mjs'
const author = fs.readFileSync(authorFile, 'utf8')
const prefix = author.slice(0, author.indexOf('let groups = 0')).replace('createRequire(import.meta.url)', `createRequire(${JSON.stringify(pathToFileURL(path.resolve(authorFile)).href)})`) + '\nexport { fixture, url, flush, defer };'
const { fixture, url, flush, defer } = await import('data:text/javascript;base64,' + Buffer.from(prefix).toString('base64'))
const HOUR = 3600000, DAY = HOUR * 24, utc = Date.parse
let groups = 0
async function check(name, run) { if (process.argv[2] && !name.includes(process.argv[2])) return; await run(); groups++; console.log('PASS', name) }

// Separate oracle: formatted local date membership and direct weekday/hour predicates.
// It never calls the product offset/day/localParts implementation.
const formatters = new Map()
function parts(zone, ms) {
  if (!formatters.has(zone)) formatters.set(zone, new Intl.DateTimeFormat('en-GB', { timeZone: zone, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', weekday: 'short', timeZoneName: 'longOffset' }))
  return Object.fromEntries(formatters.get(zone).formatToParts(ms).map(part => [part.type, part.value]))
}
function dateOf(zone, ms) { const p = parts(zone, ms); return `${p.year.padStart(4, '0')}-${p.month}-${p.day}` }
function offsetOf(zone, ms) {
  const name = parts(zone, ms).timeZoneName
  if (name === 'GMT') return 0
  const match = name.match(/^GMT([+-])(\d\d):(\d\d)(?::(\d\d))?$/)
  assert.ok(match, name)
  return (match[1] === '-' ? -1 : 1) * (Number(match[2]) * 3600 + Number(match[3]) * 60 + Number(match[4] ?? 0))
}
function predicateIntervals(start, end, step, predicate) {
  const result = []; let cursor = start, inside = predicate(start), opened = inside ? start : null
  while (cursor < end) {
    const next = Math.min(end, cursor + step), state = next < end ? predicate(next) : false
    if (state !== inside) {
      let low = cursor + 1000, high = next
      while (low < high) { const mid = low + Math.floor((high - low) / 2000) * 1000; if (predicate(mid) === inside) low = mid + 1000; else high = mid }
      if (inside) result.push({ startMs: opened, endMs: low }); else opened = low
      inside = state
    }
    cursor = next
  }
  return result
}
const dates = [
  ['America/New_York', '2026-03-08'], ['America/New_York', '2026-11-01'],
  ['Australia/Lord_Howe', '2026-04-05'], ['Australia/Lord_Howe', '2026-10-04'],
  ['Pacific/Chatham', '2026-04-05'], ['America/Havana', '2026-11-01'],
  ['America/Sao_Paulo', '2018-11-04'], ['Pacific/Apia', '2011-12-30'],
  ['Pacific/Kwajalein', '1969-09-30'], ['Africa/Monrovia', '1972-01-07'],
  ['Europe/Paris', '1900-01-01'], ['UTC', '9999-12-31'],
]

await check('independent date-membership oracle covers folds, skipped midnight/date, half/quarter-hour and historical day boundaries', () => {
  for (const [zone, date] of dates) {
    const wall = utc(`${date}T00:00:00Z`)
    const expected = predicateIntervals(wall - 3 * DAY, wall + 3 * DAY, 15 * 60000, ms => dateOf(zone, ms) === date)
    if (!expected.length) { assert.throws(() => meetingDay(zone, date), error => error.code === 'unavailableDate'); continue }
    assert.equal(expected.length, 1)
    const model = meetingDay(zone, date)
    assert.deepEqual({ startMs: model.startMs, endMs: model.endMs }, expected[0], `${zone} ${date}`)
    assert.equal(model.totalMs, expected[0].endMs - expected[0].startMs)
    let cursor = model.startMs
    for (const slot of model.slots) { assert.equal(slot.startMs, cursor); assert.ok(slot.endMs > slot.startMs && slot.endMs - slot.startMs <= HOUR); cursor = slot.endMs }
    assert.equal(cursor, model.endMs); assert.equal(meetingSlotIndex(model, model.endMs), -1)
  }
})
await check('longOffset oracle preserves exact historical seconds and every second around selected transition boundaries', () => {
  for (const [zone, date] of dates.filter(([, date]) => date !== '2011-12-30' && date !== '9999-12-31')) {
    const day = meetingDay(zone, date), ranges = meetingOffsetIntervals(zone, day.startMs, day.endMs)
    for (const range of ranges) {
      for (const point of [range.startMs, range.endMs - 1000]) assert.equal(meetingOffsetSeconds(zone, point), offsetOf(zone, point))
      for (let delta = -65; delta <= 65; delta++) {
        const point = range.startMs + delta * 1000
        assert.equal(meetingOffsetSeconds(zone, point), offsetOf(zone, point), `${zone} ${new Date(point).toISOString()}`)
      }
    }
  }
  assert.match(formatMeetingLocal('Europe/Paris', utc('1900-01-01T09:00:07Z'), 'en'), /09:09:28 UTC\+00:09:21/)
})
await check('weekday/hour predicate oracle matches exact work intersections and slot sums, including seconds offsets', () => {
  for (const [base, date, zones, start, end] of [
    ['UTC', '1900-01-01', ['UTC', 'Europe/Paris'], 9, 18],
    ['Asia/Seoul', '2026-11-19', ['Asia/Seoul', 'Asia/Kathmandu'], 9, 18],
    ['Pacific/Kwajalein', '1969-09-30', ['Pacific/Kwajalein', 'UTC'], 0, 24],
    ['Australia/Lord_Howe', '2026-04-06', ['Australia/Lord_Howe', 'Pacific/Chatham'], 8, 17],
    ['America/New_York', '2026-11-01', ['America/New_York'], 0, 24],
  ]) {
    const day = meetingDay(base, date)
    const expected = predicateIntervals(day.startMs, day.endMs, 30_000, ms => ms < day.endMs && zones.every(zone => { const p = parts(zone, ms); return p.weekday !== 'Sat' && p.weekday !== 'Sun' && Number(p.hour) >= start && Number(p.hour) < end }))
    const actual = meetingWorkIntervals(zones, day, start, end)
    assert.deepEqual(actual.intervals, expected, `${base} ${date}`)
    assert.equal(actual.totalMs, expected.reduce((sum, interval) => sum + interval.endMs - interval.startMs, 0))
    assert.equal(actual.slotOverlapMs.reduce((sum, value) => sum + value, 0), actual.totalMs)
  }
})
await check('exact URL instant/order invariants hold at epoch, supported edges and repeated-hour seconds', () => {
  const instants = [0, -1000, MEETING_MIN_MS, MEETING_MAX_MS, utc('2026-11-01T05:59:59Z'), utc('2026-11-01T06:00:00Z')]
  for (const instant of instants) {
    const value = meetingShareUrl('https://toolhub.ai.kr/world-clock/?unrelated=keep#section', ['utc'], instant)
    const parsed = new URL(value)
    assert.equal(Number(parsed.searchParams.get('at')) * 1000, instant); assert.equal(parseMeetingAt(parsed.searchParams.get('at'), ['UTC']), instant)
    assert.equal(parsed.hash, '#section'); assert.equal(parsed.searchParams.get('unrelated'), 'keep')
  }
  for (const value of ['1e3', '+10', '10.5', 'NaN', 'Infinity', '', ' '.repeat(2)]) assert.equal(parseMeetingAt(value, ['UTC']), null)
  assert.equal(isMeetingInstant(MEETING_MIN_MS, ['America/New_York']), false); assert.equal(isMeetingInstant(MEETING_MAX_MS, ['Asia/Seoul']), false)
  assert.deepEqual(initialMeetingCityIds('newYork,garbage,newYork,seoul', 'tokyo'), ['newYork', 'seoul'])
})

function parseIcs(raw) {
  assert.ok(raw.endsWith('\r\n')); assert.equal(raw.replace(/\r\n/g, '').includes('\n'), false)
  const lines = raw.split('\r\n'); lines.forEach(line => assert.ok(Buffer.byteLength(line, 'utf8') <= 75))
  const logical = []
  for (const line of lines) { if (/^[ \t]/.test(line)) logical[logical.length - 1] += line.slice(1); else if (line) logical.push(line) }
  assert.equal(logical.filter(line => line === 'BEGIN:VEVENT').length, 1); assert.equal(logical.filter(line => line === 'END:VEVENT').length, 1)
  const entries = logical.slice(logical.indexOf('BEGIN:VEVENT') + 1, logical.indexOf('END:VEVENT')).map(line => { const index = line.indexOf(':'); return [line.slice(0, index), line.slice(index + 1)] })
  const values = Object.fromEntries(entries)
  for (const key of ['DTSTART', 'DTEND', 'DTSTAMP']) assert.match(values[key], /^\d{8}T\d{6}Z$/)
  const timestamp = value => Date.UTC(Number(value.slice(0, 4)), Number(value.slice(4, 6)) - 1, Number(value.slice(6, 8)), Number(value.slice(9, 11)), Number(value.slice(11, 13)), Number(value.slice(13, 15)))
  const unescape = value => { let result = ''; for (let i = 0; i < value.length; i++) { if (value[i] !== '\\') result += value[i]; else { const next = value[++i]; assert.ok(['n', 'N', '\\', ',', ';'].includes(next)); result += /[nN]/.test(next) ? '\n' : next } } return result }
  return { values, start: timestamp(values.DTSTART), end: timestamp(values.DTEND), stamp: timestamp(values.DTSTAMP), summary: unescape(values.SUMMARY) }
}
await check('independent ICS parser confirms escaping/folding, fixed UTC seconds, stable identity and snapshot before digest', async () => {
  const title = '미팅😀'.repeat(13) + ',;\\n\nBEGIN:VEVENT', startMs = utc('2026-11-01T06:30:17Z'), now = utc('2026-11-17T04:23:45.987Z')
  const input = { title, startMs, durationMinutes: 90, cityIds: ['newYork', 'seoul'] }
  const first = parseIcs(await createMeetingCalendar(input, now, bytes => webcrypto.subtle.digest('SHA-256', bytes)))
  assert.equal(first.summary, title); assert.equal(first.start, startMs); assert.equal(first.end, startMs + 90 * 60000); assert.equal(first.stamp, Math.floor(now / 1000) * 1000)
  assert.ok(!Object.keys(first.values).some(key => /RRULE|TZID|ATTENDEE|VALARM/.test(key)))
  const reordered = parseIcs(await createMeetingCalendar({ ...input, cityIds: ['seoul', 'newYork'] }, now + 10000))
  assert.equal(first.values.UID, reordered.values.UID)
  for (const change of [{ title: 'different' }, { durationMinutes: 30 }, { startMs: startMs + 1000 }]) assert.notEqual(parseIcs(await createMeetingCalendar({ ...input, ...change }, now)).values.UID, first.values.UID)
  const wait = defer(), mutable = { ...input, cityIds: [...input.cityIds] }
  const generating = createMeetingCalendar(mutable, now, async bytes => { const stable = await webcrypto.subtle.digest('SHA-256', bytes); await wait.promise; return stable })
  mutable.title = 'later'; mutable.startMs += 3600000; mutable.durationMinutes = 30; mutable.cityIds.reverse(); wait.resolve()
  assert.equal(parseIcs(await generating).values.UID, first.values.UID)
  assert.throws(() => snapshotMeetingCalendar({ ...input, startMs: MEETING_MAX_MS, cityIds: ['utc'] }), error => error.code === 'end')
})

await check('actual parent popstate and order preserve exact UTC selection, invalid draft and private settings correctly', async () => {
  const f = await fixture({ hydrated: false, storage: { 'worldClock.cities': 'tokyo' }, url: url('newYork,seoul', '2026-11-01T06:30:17Z') })
  assert.equal(f.h.stored.get('worldClock.cities'), 'tokyo'); f.h.setHydrated(true)
  const chosen = f.instant(); f.change('data-world-event-title', 'private'); f.change('data-world-duration', '120')
  f.click('data-world-move', 'seoul:up'); assert.equal(f.instant(), chosen); assert.equal(new URL(f.h.window.location).searchParams.get('cities'), 'seoul,newYork')
  f.change('data-world-date', ''); assert.equal(f.by('data-world-date').props.value, ''); assert.equal(f.instant(), chosen); assert.equal(f.by('data-world-copy', 'share').props.disabled, true)
  f.navigate(f.h.window.location.href.replace('#meeting', '#same')); assert.equal(f.by('data-world-date').props.value, '')
  f.navigate(url('Asia/Kathmandu,newYork', '2026-11-01T05:30:17Z')); assert.equal(f.instant(), chosen - HOUR)
  assert.equal(f.by('data-world-event-title').props.value, 'private'); assert.equal(f.by('data-world-duration').props.value, 120)
  const card = f.h.find(node => node.type === 'ShareResult').props
  assert.equal(card.text, f.share()); assert.equal(Number(new URL(card.url).searchParams.get('at')) * 1000, f.instant())
  assert.match(f.share(), /01:30:17 UTC-04:00/); assert.equal(f.h.window.location.href.includes('private'), false)
  f.locale('en'); assert.equal(f.instant(), chosen - HOUR); assert.equal(f.by('data-world-event-title').props.value, 'private'); f.h.cleanup()
})
await check('actual parent partial final slots and skipped/invalid dates retain instant and block stale export', async () => {
  for (const [city, date] of [['Australia/Lord_Howe', '2026-04-05'], ['Africa/Monrovia', '1972-01-07']]) {
    const day = meetingDay(city, date), at = day.endMs - 17000, f = await fixture({ url: url(city, new Date(at).toISOString()) })
    assert.equal(f.instant(), at); const selected = f.slots(city).filter(node => node.props['aria-pressed']); assert.equal(selected.length, 1)
    assert.equal(selected[0].props['data-world-slot-ms'], day.slots.at(-1).startMs)
    assert.equal(selected[0].props['data-world-slot-duration'], day.slots.at(-1).endMs - day.slots.at(-1).startMs)
    f.change('data-world-date', '2027-02-29'); assert.equal(f.instant(), at); assert.equal(f.by('data-world-date').props.value, '2027-02-29'); assert.equal(f.by('data-world-calendar-download').props.disabled, true)
    assert.equal(f.h.all().some(node => node.type === 'ShareResult'), false); f.h.cleanup()
  }
  const f = await fixture({ url: url('Pacific/Apia', '2011-12-29T22:00:07Z') }), at = f.instant()
  f.change('data-world-date', '2011-12-30'); assert.equal(f.instant(), at); assert.equal(f.by('data-world-date').props.value, '2011-12-30'); f.h.cleanup()
})
await check('actual parent clipboard target supersession and edit roundtrip prevent obsolete fallback/success', async () => {
  const f = await fixture(), old = defer(); f.copyPort(() => old.promise); f.click('data-world-copy', 'line')
  f.copyPort(async () => {}); f.click('data-world-copy', 'share'); await flush(); f.h.render(); const count = f.fallbackCalls()
  old.reject(new Error('late')); await flush(); f.h.render(); assert.equal(f.fallbackCalls(), count); assert.equal(f.copies.at(-1).includes('at='), true)
  const next = defer(); f.copyPort(() => next.promise); f.click('data-world-copy', 'line'); f.change('data-world-event-title', 'transient'); f.change('data-world-event-title', '')
  next.resolve(); await flush(); f.h.render(); assert.equal(f.h.text().includes(f.messages.worldClock.copied), false); f.h.cleanup()
})
await check('actual parent digest snapshot survives same-value roundtrips only when current and releases failed saves', async () => {
  for (const action of ['cityRoundtrip', 'titleRoundtrip', 'popstate', 'sameHash']) {
    const f = await fixture(), gate = defer(); f.change('data-world-event-title', 'current'); f.digestPort(() => gate.promise); f.click('data-world-calendar-download')
    if (action === 'cityRoundtrip') { f.click('data-world-move', 'newYork:up'); f.click('data-world-move', 'seoul:up') }
    if (action === 'titleRoundtrip') { f.change('data-world-event-title', 'changed'); f.change('data-world-event-title', 'current') }
    if (action === 'popstate') f.navigate(url('newYork,seoul', '2026-11-01T06:30:17Z'))
    if (action === 'sameHash') f.navigate(f.h.window.location.href.replace('#meeting', '#onlyHash'))
    gate.resolve(new ArrayBuffer(32)); await flush(); f.h.render(); assert.equal(f.saved.length, action === 'sameHash' ? 1 : 0, action)
    if (action === 'sameHash') { const parsed = parseIcs(await f.blobs.get(f.saved[0].url).text()); assert.equal(parsed.start, f.instant()); assert.equal(parsed.summary, 'current') }
    f.h.cleanup()
  }
  const f = await fixture(); f.change('data-world-event-title', 'retry'); f.failSave(true); await f.export()
  assert.equal(f.saved.length, 0); assert.equal(f.revoked.length, 1); assert.equal(f.by('data-world-event-title').props.value, 'retry')
  f.failSave(false); await f.export(); assert.equal(parseIcs(await f.blobs.get(f.saved[0].url).text()).summary, 'retry'); f.h.cleanup()
})
console.log(`World Clock independent: ${groups} groups passed; Intl oracle and actual component I/O harness, no Chrome`)
