import assert from 'node:assert/strict'
import { performance } from 'node:perf_hooks'
import { VALID, dailyAnswer, dayNumber, computeStats, shareText, type DailyRecords } from '../src/utils/koreanWordle.ts'
import { WORDLE_KEYS, WORDLE_STORAGE_LIMITS as LIMIT, parseDailyRecords, parseWordleSettings, parseLegacyStats, readWordleStorage, appendDailyGuess, writeWordleSettings, wordleDate, type WordleLock } from '../src/utils/koreanWordleStorage.ts'
import { projectRecentWordleDays } from '../src/utils/koreanWordleHistory.ts'
import { createWordleRoundController, createWordleCopyGuard, copyWordleText } from '../src/utils/koreanWordleController.ts'

const tests: { name: string; run: () => void | Promise<void> }[] = [], test = (name: string, run: () => void | Promise<void>) => tests.push({ name, run })
const today = dayNumber(Date.UTC(2026, 10, 17)), words = [...VALID[2]], wrong = (day: number) => words.find(word => word !== dailyAnswer(day))!
const deferred = () => { let resolve!: () => void, reject!: (error: Error) => void; const promise = new Promise<void>((yes, no) => { resolve = yes; reject = no }); return { promise, resolve, reject } }
const memory = (raw: string | null = null) => {
  const values = new Map<string, string>(), writes: [string, string][] = []
  if (raw !== null) values.set(WORDLE_KEYS.daily, raw)
  return { values, writes, getItem(key: string) { return values.get(key) ?? null }, setItem(key: string, value: string) { writes.push([key, value]); values.set(key, value) } }
}
const action = (day = today, prefix: string[] = [], guess = wrong(day)) => ({ day, prefix, guess, hard: false })

test('strict daily parser preserves valid legacy and negative/zero dates; malformed shapes and terminal suffixes are rejected', () => {
  const data = { [-1]: { guesses: [] }, 0: { guesses: [wrong(0), wrong(0)] }, [today]: { guesses: [dailyAnswer(today)], hard: true } }
  const raw = JSON.stringify(data, null, 2), result = parseDailyRecords(raw, today)
  assert.equal(result.ok, true); if (result.ok) { assert.equal(result.raw, raw); assert.deepEqual(result.value, data) }
  assert.equal(wordleDate(0), '2025-12-31'); assert.equal(wordleDate(-1), '2025-12-30'); assert.equal(wordleDate(Infinity), null)
  for (const value of [null, [], { '01': { guesses: [] } }, { '-0': { guesses: [] } }, { [today]: { guesses: 5 } }, { [today]: { guesses: [dailyAnswer(today), wrong(today)] } }, { [today]: { guesses: Array(7).fill(wrong(today)) } }, { [today]: { guesses: ['가가'] } }, { [today]: { guesses: [], hard: 'false' } }]) assert.equal(parseDailyRecords(JSON.stringify(value), today).ok, false)
  assert.deepEqual(parseDailyRecords(`{"${today}":{"guesses":[],"future":true}}`, today), { ok: false, raw: `{"${today}":{"guesses":[],"future":true}}`, error: 'unsupported' })
  assert.equal(parseDailyRecords(JSON.stringify({ [today + 1]: { guesses: [] } }), today).ok, false)
})
test('decoded duplicate keys reject aliases at root and record; quoting and arrays are parsed only by JSON.parse', () => {
  for (const raw of ['{"0":{"guesses":[]},"\\u0030":{"guesses":[]}}', '{"0":{"guesses":[],"guesses":[]}}', '{"0":{"guesses":[],"hard":false,"h\\u0061rd":true}}']) assert.deepEqual(parseDailyRecords(raw, today), { ok: false, error: 'corrupt', raw })
  assert.equal(parseWordleSettings('{"hard":false,"contrast":true}').ok, true)
  assert.equal(parseLegacyStats('{"gamesPlayed":1,"extra":{"text":"quoted \\\" : } ["}}').ok, true)
})
test('settings errors are independent; legacy first valid positive entry only, short distribution/date validation and initial zero writes', () => {
  const store = memory('null'); store.values.set(WORDLE_KEYS.settings, '{"hard":true}'); store.values.set(WORDLE_KEYS.legacy[0], '{"gamesPlayed":3,"gamesWon":2,"guessDistribution":[0,2],"lastPlayedDate":"2026-11-16","extra":true}'); store.values.set(WORDLE_KEYS.legacy[1], '{"gamesPlayed":99}')
  const state = readWordleStorage(today, store); assert.equal(state.daily.ok, false); assert.deepEqual(state.settings, { ok: true, raw: '{"hard":true}', value: { hard: true, contrast: false } }); assert.equal(state.legacy?.played, 3); assert.deepEqual(state.legacy?.dist, [0, 2, 0, 0, 0, 0]); assert.equal(state.legacy?.lastDay, today - 1); assert.equal(store.writes.length, 0)
  store.values.set(WORDLE_KEYS.legacy[0], '{"gamesPlayed":"3"}'); const fallback = readWordleStorage(today, store); assert.equal(fallback.legacyReads[0].result.ok, false); assert.equal(fallback.legacy?.played, 99)
  for (const raw of ['null', '{"hard":0}', '{"contrast":null}', '{"hard":false,"unknown":1}']) assert.equal(parseWordleSettings(raw).ok, false)
  for (const raw of ['{"gamesPlayed":-1}', '{"gamesPlayed":1.1}', '{"guessDistribution":["1"]}', '{"lastPlayedDate":"2026-02-30"}', '{"currentStreak":null}']) assert.equal(parseLegacyStats(raw).ok, false)
  assert.equal(parseLegacyStats(JSON.stringify({ gamesPlayed: Number.MAX_SAFE_INTEGER })).ok, true)
})
test('exact byte/day budgets preserve oversized raw and keep full statistics independent of recent30 projection', () => {
  const exact = '{}'.padEnd(LIMIT.bytes, ' '); assert.equal(parseDailyRecords(exact, today).ok, true)
  const tooLarge = exact + ' '; assert.deepEqual(parseDailyRecords(tooLarge, today), { ok: false, raw: tooLarge, error: 'tooLarge' })
  const data: DailyRecords = {}
  for (let i = 0; i < LIMIT.days; i++) { const day = today - i; data[day] = { guesses: Array(6).fill(wrong(day)), hard: false } }
  const raw = JSON.stringify(data), start = performance.now(), parsed = parseDailyRecords(raw, today)
  assert.equal(parsed.ok, true); console.log(`METRIC strict80000days=${(performance.now() - start).toFixed(2)}ms bytes=${new TextEncoder().encode(raw).length}`)
  assert.equal(computeStats(data, today).played, LIMIT.days); assert.equal(projectRecentWordleDays(data, today, { title: 'Wordle', contrast: false, url: 'https://toolhub.ai.kr/korean-wordle/' }).length, 30)
  data[today - LIMIT.days] = { guesses: [] }; assert.equal(parseDailyRecords(JSON.stringify(data), today).ok, false)
  const escaped = raw.replace(/[가-힣]/g, char => '\\u' + char.charCodeAt(0).toString(16)); const blocked = parseDailyRecords(escaped, today); assert.equal(blocked.ok, false); if (!blocked.ok) { assert.equal(blocked.error, 'tooLarge'); assert.equal(blocked.raw, escaped) }
})
test('append merges unrelated current days, acknowledges identical prefix without replay, and rejects divergent or shorter histories', async () => {
  const store = memory(), basis = parseDailyRecords(null, today), input = action(), first = await appendDailyGuess(basis, input, today, { storage: store })
  assert.equal(first.ok, true); if (!first.ok) return; assert.equal(first.alreadyApplied, false)
  const prior = JSON.parse(store.values.get(WORDLE_KEYS.daily)!); prior[today - 1] = { guesses: [dailyAnswer(today - 1)] }; store.values.set(WORDLE_KEYS.daily, JSON.stringify(prior))
  const repeat = await appendDailyGuess(basis, input, today, { storage: store }); assert.equal(repeat.ok, true); if (repeat.ok) assert.equal(repeat.alreadyApplied, true); assert.equal(store.writes.length, 1)
  const next = await appendDailyGuess(first.snapshot, action(today, [input.guess], dailyAnswer(today)), today, { storage: store }); assert.equal(next.ok, true); if (next.ok) assert.equal(next.snapshot.value[today - 1].guesses[0], dailyAnswer(today - 1))
  const branch = await appendDailyGuess(basis, action(today, [], words.find(word => word !== input.guess && word !== dailyAnswer(today))!), today, { storage: store }); assert.deepEqual(branch, { ok: false, error: 'conflict' })
  store.values.set(WORDLE_KEYS.daily, '{}'); assert.deepEqual(await appendDailyGuess(first.snapshot, action(today, [input.guess], dailyAnswer(today)), today, { storage: store }), { ok: false, error: 'conflict' })
})
test('quota, prewrite raw races and postwrite uncertain outcomes never return a successful new basis or overwrite corrupt data', async () => {
  const basis = parseDailyRecords(null, today), store = memory(); let gets = 0
  const conflict = await appendDailyGuess(basis, action(), today, { storage: { getItem: () => ++gets === 1 ? null : '{}', setItem: () => { throw new Error('must not write') } } }); assert.deepEqual(conflict, { ok: false, error: 'conflict' })
  const quota = await appendDailyGuess(basis, action(), today, { storage: { getItem: () => null, setItem: () => { throw new DOMException('full', 'QuotaExceededError') } } }); assert.deepEqual(quota, { ok: false, error: 'quota' })
  const unknown = await appendDailyGuess(basis, action(), today, { storage: { getItem: () => { if (store.writes.length) throw new Error('blocked'); return null }, setItem: store.setItem.bind(store) } }); assert.deepEqual(unknown, { ok: false, error: 'writeUnknown' }); assert.equal(store.writes.length, 1)
  const raw = '{future'; const broken = memory(raw); assert.deepEqual(await appendDailyGuess(basis, action(), today, { storage: broken }), { ok: false, error: 'corrupt' }); assert.equal(broken.values.get(WORDLE_KEYS.daily), raw); assert.equal(broken.writes.length, 0)
})
test('delayed lock captures action, survives view-only changes, and explicit cancellation prevents queued writes', async () => {
  const wait = deferred(), store = memory(), lock: WordleLock = async (_key, work) => { await wait.promise; return work() }
  const input = action(), expected = input.guess, pending = appendDailyGuess(parseDailyRecords(null, today), input, today, { storage: store, lock })
  input.guess = dailyAnswer(today); input.prefix.push(wrong(today)); wait.resolve(); const result = await pending
  assert.equal(result.ok, true); if (result.ok) assert.deepEqual(result.snapshot.value[today].guesses, [expected])
  const abort = new AbortController(), later = deferred(), canceledStore = memory(), delayed: WordleLock = async (_key, work) => { await later.promise; return work() }
  const canceled = appendDailyGuess(parseDailyRecords(null, today), action(), today, { storage: canceledStore, lock: delayed, signal: abort.signal }); abort.abort(); later.resolve(); assert.deepEqual(await canceled, { ok: false, error: 'canceled' }); assert.equal(canceledStore.writes.length, 0)
  const settings = parseWordleSettings(null), saved = await writeWordleSettings(settings, { hard: true, contrast: false }, { storage: store }); assert.equal(saved.ok, true)
  assert.deepEqual(await writeWordleSettings(settings, { hard: false, contrast: false }, { storage: store }), { ok: false, error: 'conflict' })
  assert.deepEqual(await writeWordleSettings({ ok: true, raw: 'null', value: { hard: false, contrast: false } }, { hard: true, contrast: false }, { storage: store }), { ok: false, error: 'corrupt' })
})
test('history is newest30 read-only projection and completed grids contain no answer/guess/query spoilers', () => {
  const records: DailyRecords = {}; for (let i = 0; i < 40; i++) records[today - i] = { guesses: [dailyAnswer(today - i)], hard: i % 2 === 0 }
  records[today] = { guesses: [wrong(today)] }
  const before = JSON.stringify(records), options = { title: 'Korean Wordle', contrast: false, url: 'https://toolhub.ai.kr/other/?answer=SECRET#guess' }, rows = projectRecentWordleDays(records, today, options)
  assert.equal(rows.length, 30); assert.deepEqual(rows.map(row => row.day), Array.from({ length: 30 }, (_, i) => today - i)); assert.equal(rows[0].text, null); assert.equal(rows[0].grid, null)
  for (const row of rows.slice(1)) { assert.ok(row.text?.endsWith('https://toolhub.ai.kr/korean-wordle/')); assert.ok(!row.text?.includes(dailyAnswer(row.day))); assert.ok(!row.text?.includes('SECRET')); assert.equal('guesses' in row, false); assert.equal('answer' in row, false) }
  const row = rows[1]; assert.equal(row.text, row.date + '\n' + shareText(options.title, row.day, records[row.day].guesses, dailyAnswer(row.day), { hard: false, url: 'https://toolhub.ai.kr/korean-wordle/' }))
  assert.equal(JSON.stringify(records), before); assert.equal(computeStats(records, today).played, 39)
  assert.notEqual(projectRecentWordleDays(records, today, { ...options, contrast: true })[1].grid, row.grid)
})
test('controller accepts once synchronously and completed semantics survive a new view without replaying timers', () => {
  const tasks: (() => void)[] = [], cleared: unknown[] = [], controller = createWordleRoundController({ set: run => { tasks.push(run); return tasks.length }, clear: id => { cleared.push(id) } })
  controller.begin({ mode: 'daily', day: today, answer: dailyAnswer(today), len: 2, guesses: [], hard: false, startedAt: 100 })
  const accepted = controller.submit(dailyAnswer(today), 500); assert.equal(accepted.ok, true); assert.deepEqual(controller.submit(dailyAnswer(today), 501), { ok: false, error: 'busy' }); if (!accepted.ok || !accepted.completion) return
  let opened = 0; controller.later('stats', 1000, () => { opened++ }); controller.begin({ mode: 'practice', answer: words[0], len: 2, guesses: [], hard: false, startedAt: 502 }); tasks[0]()
  assert.equal(opened, 0); assert.equal(controller.finishReveal(accepted.reveal), false); assert.equal(controller.claimCompletion(accepted.completion)?.duration, 400); assert.equal(controller.claimCompletion(accepted.completion), null); assert.equal(cleared.length, 1)
  const current = controller.submit(words[0], 600); assert.equal(current.ok, true); if (current.ok) assert.equal(controller.current(current.reveal), true)
  controller.dispose(); for (const task of tasks) task(); if (current.ok) assert.equal(controller.finishReveal(current.reveal), false)
})
test('timer channels reject stale callbacks, day rollover cannot unlock a new reveal, restored completion emits no achievement', () => {
  const callbacks: (() => void)[] = [], controller = createWordleRoundController({ set: run => { callbacks.push(run); return callbacks.length }, clear() {} })
  const initial = { mode: 'daily' as const, day: today, answer: dailyAnswer(today), len: 2 as const, guesses: [], hard: false, startedAt: 0 }
  controller.begin(initial); const old = controller.submit(wrong(today), 1); let feedback = 0
  controller.later('toast', 10, () => { feedback = 1 }); controller.later('toast', 10, () => { feedback = 2 }); callbacks[0](); assert.equal(feedback, 0); callbacks[1](); assert.equal(feedback, 2)
  controller.begin({ ...initial, day: today + 1, answer: dailyAnswer(today + 1) }); const current = controller.submit(wrong(today + 1), 2); if (old.ok) assert.equal(controller.finishReveal(old.reveal), false); if (current.ok) assert.equal(controller.current(current.reveal), true)
  controller.begin({ ...initial, guesses: [dailyAnswer(today)] }); assert.deepEqual(controller.submit(wrong(today), 3), { ok: false, error: 'ended' }); controller.dispose()
})
test('copy accepts only actual success; all targets and ABA/unmount invalidate old fallback or feedback', async () => {
  const guard = createWordleCopyGuard(); let legacy = 0
  for (const fallback of [false, true]) { const token = guard.begin(); assert.equal(await copyWordleText('grid', () => guard.current(token), { writeText: async () => { throw new Error('reject') }, fallback: () => fallback }), fallback ? 'copied' : 'failed') }
  const old = guard.begin(), pending = deferred(), late = copyWordleText('OLD', () => guard.current(old), { writeText: () => pending.promise, fallback: () => { legacy++; return true } })
  const next = guard.begin(); assert.equal(await copyWordleText('NEW', () => guard.current(next), { writeText: async () => {}, fallback: () => false }), 'copied'); pending.reject(new Error('old')); assert.equal(await late, 'stale'); assert.equal(legacy, 0)
  const token = guard.begin(), success = deferred(), waiting = copyWordleText('A', () => guard.current(token), { writeText: () => success.promise, fallback: () => true }); guard.invalidate(); guard.invalidate(); success.resolve(); assert.equal(await waiting, 'stale'); guard.dispose(); assert.equal(await copyWordleText('done', () => guard.current(token), { fallback: () => { legacy++; return true } }), 'stale'); assert.equal(legacy, 0)
})

let count = 0
for (const { name, run } of tests) { if (process.argv[2] && !name.includes(process.argv[2])) continue; await run(); count++; console.log('PASS', name) }
console.log(`Korean Wordle records/controller: ${count} groups passed`)
