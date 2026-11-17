// Independent adversarial review of menu plans and transcript export; no browser/storage writes.
import assert from 'node:assert/strict'
import { mealPlanWeekDates, mealPlanWeek, fillMealPlanBlanks, parseMealPlan, writeMealPlanChanges, mealPlanHistoryState, mealPlanText } from '../../../src/utils/mealPlan.ts'
import { selectVoiceMemoTranscripts, buildVoiceMemoTranscriptBundle, formatVoiceTranscriptLocalTime, type VoiceTranscriptItem } from '../../../src/utils/voiceMemoExport.ts'

let checks = 0
const check = (name: string, action: () => void) => { action(); checks++; console.log(`PASS ${name}`) }
check('every calendar month edge in 2000–2200 produces seven exact adjacent days', () => {
  let weeks = 0
  for (let year = 2000; year <= 2200; year++) for (let month = 0; month < 12; month++) {
    const start = new Date(Date.UTC(year, month + 1, 0)).toISOString().slice(0, 10)
    const dates = mealPlanWeekDates(start)
    if (year === 2200 && month === 11) { assert.equal(dates, null); continue }
    assert.equal(dates?.length, 7)
    assert.equal(new Set(dates).size, 7)
    dates!.forEach((date, index) => assert.equal(Date.parse(date) - Date.parse(start), index * 86400000))
    weeks++
  }
  assert.equal(weeks, 2411)
})
check('overlapping weeks share the same unsaved date and preserve unrelated drafts', () => {
  const draft = { '2026-11-16': '미역국', '2026-11-20': '초밥', '2026-11-26': '파스타' }
  const a = mealPlanWeek('2026-11-16', [], draft)!, b = mealPlanWeek('2026-11-20', [], draft)!
  assert.equal(a[4].menu, b[0].menu)
  assert.equal(b[6].menu, '파스타')
  assert.deepEqual(mealPlanWeek('2026-11-16', [], draft), a)
})
check('NFKC/case variants never repeat filled candidates or overwrite chosen dates', () => {
  const week = mealPlanWeek('2026-11-16', [{ date: '2026-11-18', menu: 'Pizza' }])!
  for (const candidates of [['ＰＩＺＺＡ', '치킨', ' 치킨 ', 'ＴＡＣＯ', 'taco'], ['taco', 'ＴＡＣＯ', '치킨', 'PIZZA']]) {
    const result = fillMealPlanBlanks(week, candidates, values => values.reverse())
    assert.ok(result.ok)
    if (!result.ok) continue
    assert.equal(result.filled, 2); assert.equal(result.remaining, 4)
    assert.ok(result.changes.every(entry => entry.date !== '2026-11-18'))
    assert.equal(new Set(result.changes.map(entry => entry.menu.normalize('NFKC').toLowerCase())).size, 2)
  }
})
check('mixed deletions/updates/additions are atomic at capacity and order-independent', () => {
  const entries = Array.from({ length: 90 }, (_, n) => ({ date: new Date(Date.UTC(2026, 0, n + 1)).toISOString().slice(0, 10), menu: `메뉴 ${n}` }))
  const initial = JSON.stringify({ version: 1, entries })
  const changes = [{ ...entries[3], menu: '' }, { ...entries[4], menu: '변경 메뉴' }, { date: '2026-11-16', menu: '오늘' }]
  let expected: string | undefined
  for (const ordering of [changes, [...changes].reverse()]) {
    let raw = initial
    const result = writeMealPlanChanges(parseMealPlan(initial), ordering, { getItem: () => raw, setItem: (_key, value) => { raw = value } })
    assert.ok(result.ok)
    if (expected) assert.equal(raw, expected)
    expected = raw
    assert.equal(JSON.parse(raw).entries.length, 90)
  }
})
check('future version, corrupted storage, stale writes and quota cannot silently replace data', () => {
  const change = [{ date: '2026-11-16', menu: '국수' }]
  for (const initial of ['{broken', JSON.stringify({ version: 2, entries: [] }), JSON.stringify({ version: 1, entries: [{ date: '2026-02-30', menu: '국수' }] })]) {
    let writes = 0
    const result = writeMealPlanChanges(parseMealPlan(initial), change, { getItem: () => initial, setItem: () => { writes++ } })
    assert.equal(result.ok, false); assert.equal(writes, 0)
  }
  assert.deepEqual(writeMealPlanChanges(parseMealPlan(null), change, { getItem: () => '{newer', setItem: () => assert.fail('must not write') }), { ok: false, error: 'invalidData' })
  assert.deepEqual(writeMealPlanChanges(parseMealPlan(null), change, { getItem: () => null, setItem: () => { throw new Error('quota') } }), { ok: false, error: 'unavailable' })
})
check('eaten history eligibility does not confuse tomorrow, same menu on another day, or an empty edit', () => {
  const history = [{ date: '2026-11-15', name: '초밥' }]
  assert.equal(mealPlanHistoryState({ date: '2026-11-16', menu: '초밥' }, '2026-11-16', history), 'ready')
  assert.equal(mealPlanHistoryState({ date: '2026-11-17', menu: '초밥' }, '2026-11-16', history), 'future')
  assert.equal(mealPlanHistoryState({ date: '2026-11-15', menu: ' 초밥 ' }, '2026-11-16', history), 'duplicate')
  assert.equal(mealPlanHistoryState({ date: '2026-11-16', menu: '  ' }, '2026-11-16', history), 'invalid')
})
check('TXT uses visible draft values and seven dates without changing source records', () => {
  const source = [{ date: '2026-11-16', menu: '저장 값' }]
  const week = mealPlanWeek('2026-11-16', source, { '2026-11-16': '수정 값', '2026-11-17': '' })!
  const output = mealPlanText(week, '미정')
  assert.equal(output.split('\n').length, 7)
  assert.ok(output.startsWith('2026-11-16\t수정 값\n2026-11-17\t미정'))
  assert.equal(source[0].menu, '저장 값')
})

const labels = { title: '제목', recordedAt: '기기 현지 시각', duration: '길이' }
const item = (id: string, timestamp: number): VoiceTranscriptItem => ({ id, name: `${id} 메모`, timestamp, duration: 3661.99, transcript: ` ${id}\r\n현재 수정 문장 😀 ` })
const baseTime = Date.UTC(2026, 10, 16, 0, 0, 0)
const items = [item('newest', baseTime + 2), item('tie-a', baseTime + 1), item('tie-b', baseTime + 1), item('oldest', baseTime)]
check('selection permutations always export newest first with equal-time screen order', () => {
  const permutations = (values: string[]): string[][] => values.length < 2 ? [values] : values.flatMap((value, index) => permutations(values.filter((_v, n) => n !== index)).map(rest => [value, ...rest]))
  for (const selection of permutations(items.map(value => value.id))) assert.deepEqual(selectVoiceMemoTranscripts(items, selection).map(value => value.id), items.map(value => value.id))
})
check('deleted, emptied, oversized and duplicated selected entries fail the entire export', () => {
  for (const invalid of [items.slice(1), [{ ...items[0], transcript: '' }, ...items.slice(1)], [{ ...items[0], transcript: 'x'.repeat(12001) }, ...items.slice(1)], [...items, items[0]]]) {
    assert.throws(() => buildVoiceMemoTranscriptBundle(invalid, ['newest', 'oldest'], labels))
  }
  assert.throws(() => buildVoiceMemoTranscriptBundle(items, ['oldest', 'oldest'], labels), /invalidSelection/)
})
check('current edits, metadata and exact whitespace survive while audio and unused fields are untouched', () => {
  const edited = { ...items[0], transcript: '\t최신\n\r\n텍스트\u0000😀 ', get blob(): never { throw new Error('audio access') }, secret: 'not included' }
  const result = buildVoiceMemoTranscriptBundle([edited], [edited.id], labels)
  assert.ok(result.text.includes(edited.transcript)); assert.ok(result.text.includes(edited.name)); assert.ok(result.text.includes('1:01:01'))
  assert.equal(result.text.includes(edited.secret), false)
  assert.equal(result.characters, edited.transcript.length)
})
check('exact maximum export keeps all 20 records and one-over-limit rejects without truncation', () => {
  const maximum = Array.from({ length: 20 }, (_, n) => ({ ...item(`max-${n}`, baseTime + n), transcript: '😀'.repeat(6000) }))
  const ids = maximum.map(value => value.id), result = buildVoiceMemoTranscriptBundle(maximum, ids, labels)
  assert.equal(result.count, 20); assert.equal(result.characters, 240000)
  maximum.forEach(value => assert.ok(result.text.includes(value.name)))
  assert.throws(() => buildVoiceMemoTranscriptBundle([...maximum, item('extra', baseTime)], [...ids, 'extra'], labels), /selectionLimit/)
})
check('local timestamp offset reflects the actual device timezone at recording time', () => {
  for (const timestamp of [Date.UTC(2026, 0, 1), Date.UTC(2026, 6, 1)]) {
    const date = new Date(timestamp), offset = -date.getTimezoneOffset(), text = formatVoiceTranscriptLocalTime(timestamp)
    assert.ok(text.startsWith(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`))
    assert.ok(text.endsWith(`(UTC${offset >= 0 ? '+' : '-'}${String(Math.floor(Math.abs(offset) / 60)).padStart(2, '0')}:${String(Math.abs(offset) % 60).padStart(2, '0')})`))
  }
})
console.log(`Independent menu/voice review: ${checks} groups passed`)
