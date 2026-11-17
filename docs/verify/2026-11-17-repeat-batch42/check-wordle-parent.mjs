import assert from 'node:assert/strict'
import { wordleFixture, deferred } from './wordle-parent-harness.mjs'
import { WORDLE_KEYS } from '../../../src/utils/koreanWordleStorage.ts'

const checks = [], check = (name, run) => checks.push({ name, run })
check('SSR-like first render contains no daily answer; strict initial reads and Strict replay perform zero writes', async () => {
  for (const raw of ['null', '{"321":{"guesses":5}}', '{"321":{"guesses":[],"future":true}}']) {
    const f = await wordleFixture({ storage: { [WORDLE_KEYS.daily]: raw, [WORDLE_KEYS.settings]: '{"hard":true}' } }); assert.equal(f.h.text().includes(f.game.dailyAnswer(f.today())), false); f.h.replayEffects(); await f.init(); assert.equal(f.writes.length, 0); assert.equal(f.values.get(WORDLE_KEYS.daily), raw); assert.equal(f.attr('data-wordle-setting', 'hard').props.checked, true); assert.ok(f.h.all().some(node => node.props['data-wordle-daily-error'])); f.cleanup()
  }
})
check('actual valid submit is claimed once before reveal and old timers cannot open windows in a new practice', async () => {
  const f = await wordleFixture(); await f.init(); f.io.qualifies = true; await f.key(f.game.dailyAnswer(f.today()))
  const enter = f.attr('data-wordle-key', 'Enter').props.onClick; enter({ currentTarget: { blur() {} } }); enter({ currentTarget: { blur() {} } }); await f.settle()
  assert.equal(f.records.length, 1); assert.equal(f.records[0].moves, 1); assert.equal(f.saved()[f.today()].guesses.length, 1); assert.equal(f.root()['data-wordle-revealing'], true)
  const oldTimers = [...f.timers]; await f.click('data-wordle-switch', 'practice'); await f.click('data-wordle-length', 3)
  for (const timer of oldTimers.filter(item => !item.interval)) timer.callback(); await f.settle(); assert.equal(f.root()['data-wordle-mode'], 'practice'); assert.equal(f.root()['data-wordle-revealing'], false); assert.equal(f.h.find(node => node.type === 'NameInputModal').props.isOpen, false); assert.equal(f.h.all().some(node => node.type === 'KoreanWordleHistory'), false); assert.equal(f.records.length, 1); f.cleanup()
})
check('failed saves preserve current memory and malformed raw; explicit reload is confirmed and does not replay completion', async () => {
  const f = await wordleFixture(); await f.init(); f.io.quota = true; const answer = f.game.dailyAnswer(f.today()); await f.submit(answer); assert.equal(f.root()['data-wordle-status'], 'won'); assert.equal(f.records.length, 1); assert.equal(f.attr('data-wordle-daily-error', 'quota').props.role, 'status'); assert.equal(f.values.has(WORDLE_KEYS.daily), false)
  await f.click('data-wordle-reload'); await f.click('data-wordle-cancel-reload'); assert.equal(f.root()['data-wordle-status'], 'won')
  f.io.quota = false; f.values.set(WORDLE_KEYS.daily, JSON.stringify({ [f.today()]: { guesses: [answer] } })); await f.click('data-wordle-reload'); await f.click('data-wordle-confirm-reload'); assert.equal(f.root()['data-wordle-status'], 'won'); assert.equal(f.records.length, 1); assert.equal(f.writes.length, 0)
  f.values.set(WORDLE_KEYS.daily, 'null'); await f.click('data-wordle-reload'); await f.click('data-wordle-confirm-reload'); assert.equal(f.root()['data-wordle-status'], 'won'); assert.equal(f.values.get(WORDLE_KEYS.daily), 'null'); f.cleanup()
  const unknown = await wordleFixture(); await unknown.init(); unknown.io.readbackFail = true; const day = unknown.today(), first = [...unknown.game.VALID[2]].find(word => word !== unknown.game.dailyAnswer(day)); await unknown.submit(first)
  assert.equal(unknown.attr('data-wordle-daily-error', 'writeUnknown').props.role, 'status'); assert.equal(unknown.writes.length, 1); await unknown.run(750); await unknown.submit(unknown.game.dailyAnswer(day)); assert.equal(unknown.root()['data-wordle-status'], 'won'); assert.equal(unknown.writes.length, 1)
  unknown.io.readbackFail = false; await unknown.click('data-wordle-reload'); await unknown.click('data-wordle-confirm-reload'); assert.equal(unknown.root()['data-wordle-status'], 'playing'); assert.equal(unknown.records.length, 1); unknown.cleanup()
})
check('two actual parents merge compatible prefix and unrelated dates but preserve conflicting in-memory branches', async () => {
  const shared = new Map(), a = await wordleFixture({ shared }), b = await wordleFixture({ shared }); await a.init(); await b.init(); const day = a.today(), guesses = [...a.game.VALID[2]].filter(word => word !== a.game.dailyAnswer(day))
  await a.submit(guesses[0]); await b.submit(guesses[0]); assert.equal(a.writes.length + b.writes.length, 1); await a.run(750); await b.run(750)
  await a.submit(guesses[1]); await b.submit(guesses[2]); assert.equal(b.attr('data-wordle-daily-error', 'conflict').props.role, 'status'); assert.equal(a.saved()[day].guesses[1], guesses[1]); assert.ok(b.row(1).includes(guesses[2][0])); assert.equal(b.records.length, 0)
  await b.click('data-wordle-reload'); await b.click('data-wordle-confirm-reload'); assert.ok(b.row(1).includes(guesses[1][0])); assert.equal(b.records.length, 0); a.cleanup(); b.cleanup()
})
check('captured saves survive mode changes; explicit reload and unmount cancel pending work without late input replacement', async () => {
  const f = await wordleFixture(); await f.init(); f.io.hold = true; const answer = f.game.dailyAnswer(f.today()); await f.submit(answer); assert.equal(f.locks.length, 1); await f.click('data-wordle-switch', 'practice'); const practice = f.row(0); f.locks[0].resolve(); await f.settle(); assert.equal(f.saved()[f.today()].guesses[0], answer); assert.equal(f.root()['data-wordle-mode'], 'practice'); assert.equal(f.row(0), practice); f.cleanup()
  const g = await wordleFixture(); await g.init(); g.io.hold = true; await g.submit(g.game.dailyAnswer(g.today())); await g.click('data-wordle-reload'); await g.click('data-wordle-confirm-reload'); g.locks[0].resolve(); await g.settle(); assert.equal(g.writes.length, 0); assert.equal(g.root()['data-wordle-status'], 'playing'); g.cleanup()
  const h = await wordleFixture(); await h.init(); h.io.hold = true; await h.submit(h.game.dailyAnswer(h.today())); h.cleanup(); h.locks[0].resolve(); await Promise.resolve(); await Promise.resolve(); assert.equal(h.writes.length, 0)
})
check('midnight preserves submitted previous-day result but old reveal cannot unlock the current-day input', async () => {
  const f = await wordleFixture(); await f.init(); f.clock(Date.UTC(2026, 10, 17, 14, 59, 59, 900)); const day = f.today(); await f.submit(f.game.dailyAnswer(day)); const previous = f.timers.filter(item => item.delay === 750).at(-1)
  f.clock(Date.UTC(2026, 10, 17, 15, 0, 0, 100)); await f.run(1000); assert.equal(f.root()['data-wordle-day'], day + 1); const wrong = [...f.game.VALID[2]].find(word => word !== f.game.dailyAnswer(day + 1)); await f.submit(wrong); previous.callback(); await f.settle(); assert.equal(f.root()['data-wordle-revealing'], true); assert.equal(f.saved()[day].guesses.length, 1); assert.equal(f.saved()[day + 1].guesses.length, 1); assert.equal(f.records.length, 1); f.cleanup()
})
check('latest30 does not truncate full statistics or raw; history copy is full spoiler-free text and copy scopes reject stale ABA', async () => {
  const initial = await wordleFixture(); const day = initial.today(), raw = {}; for (let n = 0; n < 40; n++) raw[day - n] = { guesses: [initial.game.dailyAnswer(day - n)] }; initial.cleanup()
  const f = await wordleFixture({ storage: { [WORDLE_KEYS.daily]: JSON.stringify(raw) } }); await f.init(); await f.click('data-wordle-stats'); assert.equal(f.history().rows.length, 30); assert.ok(f.h.text().includes('40')); assert.equal(f.writes.length, 0)
  const statsCalls = f.statsCalls.length; await f.run(1000); await f.run(1000); assert.equal(f.statsCalls.length, statsCalls)
  const row = f.history().rows[1]; f.history().onSelect(row.day); await f.settle(); f.io.clipboard = 'reject'; f.history().onCopy(row); await f.settle(); assert.equal(f.recovery().props.text, row.text); assert.ok(!f.recovery().props.text.includes(raw[row.day].guesses[0])); assert.equal(f.values.get(WORDLE_KEYS.daily), JSON.stringify(raw))
  f.io.legacy = true; f.recovery().props.onRetry(); await f.settle(); assert.equal(f.history().copied, row.day)
  f.io.clipboard = 'wait'; f.history().onCopy(row); await f.settle(); const pending = f.pendingCopies.at(-1), fallback = f.fallback.length; await f.language('en'); await f.language('ko'); pending.reject(Error('old')); await f.settle(); assert.equal(f.recovery(), undefined); assert.equal(f.fallback.length, fallback)
  f.io.clipboard = 'wait'; f.history().onCopy(row); await f.settle(); const selection = f.pendingCopies.at(-1); f.history().onSelect(f.history().rows[2].day); await f.settle(); f.history().onSelect(row.day); await f.settle(); selection.resolve(); await f.settle(); assert.equal(f.history().copied, null); f.cleanup()
})
check('current copy and ShareResult invalidate each other; leaderboard uses completed snapshot and old response cannot close new view', async () => {
  const f = await wordleFixture(); await f.init(); f.io.qualifies = true; await f.submit(f.game.dailyAnswer(f.today())); await f.run(750); const modal = f.h.find(node => node.type === 'NameInputModal'); assert.equal(modal.props.score, 1); modal.props.onClose(); await f.settle()
  const shareBefore = f.h.find(node => node.type === 'ShareResult').props.resultKey; f.io.clipboard = 'wait'; await f.click('data-wordle-copy', 'current'); const pending = f.pendingCopies.at(-1); assert.notEqual(f.h.find(node => node.type === 'ShareResult').props.resultKey, shareBefore)
  f.attr('data-wordle-share-boundary').props.onClickCapture(); await f.settle(); const count = f.fallback.length; pending.reject(Error('old')); await f.settle(); assert.equal(f.fallback.length, count); assert.equal(f.recovery(), undefined)
  // A separate completed snapshot is explicitly submitted only through the fake port.
  await f.click('data-wordle-switch', 'practice'); await f.click('data-wordle-switch', 'daily'); assert.equal(f.submissions.length, 0); f.cleanup()
  const g = await wordleFixture(); await g.init(); g.io.qualifies = true; await g.submit(g.game.dailyAnswer(g.today())); await g.run(750); const request = g.h.find(node => node.type === 'NameInputModal'); g.io.submit = deferred(); const submission = request.props.onSubmit('fixture'); await g.click('data-wordle-switch', 'practice'); g.io.submit.resolve(); await submission; await g.settle(); assert.equal(g.submissions[0][0], 1); assert.equal(g.submissions[0][1], 'fixture'); assert.equal(g.names.length, 0); assert.equal(g.h.find(node => node.type === 'NameInputModal').props.isOpen, false); g.cleanup()
})

let passed = 0
for (const { name, run } of checks) { if (process.argv[2] && !name.includes(process.argv[2])) continue; await run(); passed++; console.log('PASS', name) }
console.log(`Korean Wordle actual parent: ${passed} groups passed`)
