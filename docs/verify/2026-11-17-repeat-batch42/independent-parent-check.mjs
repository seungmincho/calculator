import assert from 'node:assert/strict'
import fs from 'node:fs'
import { wordleFixture, deferred, text } from './wordle-parent-harness.mjs'
import { componentHarness } from '../2026-11-17-repeat-batch29/team-parent-harness.mjs'
import { parseDailyRecords, parseLegacyStats, parseWordleSettings, readWordleStorage, WORDLE_KEYS } from '../../../src/utils/koreanWordleStorage.ts'

// Only the React/DOM/storage host is reused. No author test assertions are imported/executed.
const results = []
const plain = value => JSON.parse(JSON.stringify(value))
const modal = f => f.h.find(n => n.type === 'NameInputModal').props
const closeDialog = async f => { const buttons = f.h.all().filter(n => n.type === 'button' && n.props['aria-label'] === '닫기'); buttons.at(-1)?.props.onClick(); await f.settle() }
const shareProps = f => f.h.find(n => n.type === 'ShareResult').props
async function group(name, run) { if (process.argv[2] && !name.includes(process.argv[2])) return; await run(); results.push(name); console.log('PASS ' + name) }
async function completed() { const f = await wordleFixture(); await f.init(); await f.submit(f.game.dailyAnswer(f.today())); await f.run(750); return f }

await group('strict raw and legacy precedence: malformed/future bytes remain; zero writes on restore and replay', async () => {
  const invalid = ['null', '[]', '{"1":{"guesses":null}}', '{"1":{"guesses":[],"hard":"false"}}', '{"01":{"guesses":[]}}', '{"1":{"guesses":[]},"\\u0031":{"guesses":[]}}']
  for (const raw of invalid) assert.equal(parseDailyRecords(raw, 321).ok, false)
  assert.equal(parseDailyRecords('{"322":{"guesses":[]}}', 321).error, 'unsupported')
  assert.equal(parseWordleSettings('{"hard":true,"contrast":false,"extra":1}').error, 'unsupported')
  assert.equal(parseLegacyStats('{"gamesPlayed":"9"}').ok, false)
  const values = new Map([[WORDLE_KEYS.daily, 'null'], [WORDLE_KEYS.settings, '{"contrast":true}'], [WORDLE_KEYS.legacy[0], '{"gamesPlayed":0}'], [WORDLE_KEYS.legacy[1], '{"gamesPlayed":7,"gamesWon":3,"guessDistribution":[1,2],"extra":"kept"}']])
  const read = readWordleStorage(321, { getItem: k => values.get(k) ?? null }); assert.equal(read.legacyKey, WORDLE_KEYS.legacy[1]); assert.deepEqual(read.legacy.dist, [1, 2, 0, 0, 0, 0])
  const f = await wordleFixture({ shared: values }); const before = [...values]; f.h.replayEffects(); await f.init(); assert.equal(f.writes.length, 0); assert.deepEqual([...values], before)
  assert.equal(f.attr('data-wordle-setting', 'contrast').props.checked, true)
  await f.click('data-wordle-switch', 'practice'); await f.submit(f.game.ANSWERS[2][0]); assert.equal(f.records.length, 1); assert.equal(f.root()['data-wordle-status'], 'won'); assert.deepEqual([...values], before); f.cleanup()
})

await group('actual branches: compatible prefix is idempotent, unrelated saved day survives, unknown needs explicit reload', async () => {
  const shared = new Map(), a = await wordleFixture({ shared }), b = await wordleFixture({ shared }); await a.init(); await b.init()
  const day = a.today(), wrong = Array.from(a.game.VALID[2]).filter(w => w !== a.game.dailyAnswer(day))
  shared.set(WORDLE_KEYS.daily, JSON.stringify({ [day - 2]: { guesses: [] } }))
  await a.submit(wrong[2]); await b.submit(wrong[2]); assert.equal(a.writes.length + b.writes.length, 1); assert.ok(Object.hasOwn(a.saved(), day - 2))
  await a.run(750); await b.run(750); await a.submit(wrong[3]); await b.submit(wrong[4]); assert.equal(b.attr('data-wordle-daily-error', 'conflict').props.role, 'status'); assert.deepEqual(a.saved()[day].guesses, [wrong[2], wrong[3]])
  assert.ok(b.row(1).includes(wrong[4][0])); await b.click('data-wordle-reload'); await b.click('data-wordle-cancel-reload'); assert.ok(b.row(1).includes(wrong[4][0])); assert.equal(b.records.length, 0)
  a.cleanup(); b.cleanup()
  const u = await wordleFixture(); await u.init(); u.io.readbackFail = true; await u.submit(u.game.dailyAnswer(u.today())); assert.equal(u.writes.length, 1); assert.equal(u.attr('data-wordle-daily-error', 'writeUnknown').props.role, 'status'); assert.equal(u.records.length, 1)
  u.io.readbackFail = false; await u.click('data-wordle-reload'); await u.click('data-wordle-confirm-reload'); assert.equal(u.writes.length, 1); assert.equal(u.records.length, 1); assert.equal(u.root()['data-wordle-status'], 'won'); u.cleanup()
})

await group('semantic loss/win precedes reveal once; old timers cannot mutate practice or new midnight lock', async () => {
  const f = await wordleFixture(); await f.init(); const miss = Array.from(f.game.VALID[2]).find(w => w !== f.game.dailyAnswer(f.today()))
  for (let i = 0; i < 5; i++) { await f.submit(miss); await f.run(750) }
  await f.key(miss); const enter = f.attr('data-wordle-key', 'Enter').props.onClick; const e = { currentTarget: { blur() {} } }; enter(e); enter(e); await f.settle()
  assert.equal(f.records.length, 1); assert.equal(f.records[0].result, 'loss'); assert.equal(f.records[0].moves, 6); assert.equal(f.saved()[f.today()].guesses.length, 6)
  const old = f.timers.filter(t => !t.interval); await f.click('data-wordle-switch', 'practice'); await f.click('data-wordle-length', 3); await f.key(f.game.ANSWERS[3][0]); await f.click('data-wordle-key', 'Enter')
  assert.equal(f.records.length, 2); assert.equal(f.records[1].result, 'win'); old.forEach(t => t.callback()); await f.settle(); assert.equal(f.root()['data-wordle-revealing'], true); assert.equal(modal(f).isOpen, false); assert.equal(f.submissions.length, 0); f.cleanup()
  const m = await wordleFixture(); await m.init(); await m.submit(m.game.dailyAnswer(m.today())); const oldReveal = m.timers.filter(t => t.delay === 750).at(-1)
  m.clock(Date.UTC(2026, 10, 17, 15, 0, 1)); await m.run(1000); await m.submit(m.game.dailyAnswer(m.today())); oldReveal.callback(); await m.settle(); assert.equal(m.root()['data-wordle-revealing'], true); assert.equal(m.records.length, 2); assert.equal(modal(m).isOpen, false); m.cleanup()
})

await group('lock continuation keeps submitted day; later name RPC uses original duration and cannot close new modal', async () => {
  const f = await wordleFixture(); await f.init(); f.io.hold = true; f.io.qualifies = true
  f.clock(Date.UTC(2026, 10, 17, 3, 0, 2, 345)); await f.submit(f.game.dailyAnswer(f.today())); await f.run(750)
  const pending = deferred(); f.io.submit = pending; const task = modal(f).onSubmit('independent synthetic')
  assert.deepEqual(f.submissions[0], [1, 'independent synthetic', 2345]); await f.click('data-wordle-switch', 'practice'); await f.key(f.game.ANSWERS[2][0]); const currentRow = f.row(0)
  f.locks[0].resolve(); await f.settle(); assert.equal(f.root()['data-wordle-mode'], 'practice'); assert.equal(f.row(0), currentRow); assert.equal(f.saved()[321].guesses.length, 1)
  await f.click('data-wordle-switch', 'daily'); f.clock(Date.UTC(2026, 10, 18, 3)); await f.run(1000); f.io.hold = false; await f.submit(f.game.dailyAnswer(f.today())); await f.run(750); assert.equal(modal(f).isOpen, true)
  pending.resolve(); await task; await f.settle(); assert.equal(modal(f).isOpen, true); assert.equal(f.names.length, 0); assert.equal(f.submissions.length, 1)
  f.io.submit = null; await modal(f).onSubmit('current synthetic'); await f.settle(); assert.deepEqual(f.names, ['current synthetic']); assert.equal(modal(f).isOpen, false); f.cleanup()
})

await group('30 projected rows preserve all47 records and legacy counts; independent stat and green-grid oracle', async () => {
  const seed = await wordleFixture(), day = seed.today(), records = {}
  for (let i = 0; i < 47; i++) {
    const answer = seed.game.dailyAnswer(day - i), wrong = Array.from(seed.game.VALID[2]).find(w => w !== answer)
    records[day - i] = { guesses: i % 4 === 0 ? [wrong] : i % 4 === 1 ? Array(6).fill(wrong) : [answer] }
  }
  seed.cleanup(); const raw = JSON.stringify(records), legacy = JSON.stringify({ gamesPlayed: 10, gamesWon: 4, maxStreak: 3, guessDistribution: [4, 0, 0, 0, 0, 0] })
  const f = await wordleFixture({ storage: { [WORDLE_KEYS.daily]: raw, [WORDLE_KEYS.legacy[0]]: legacy, [WORDLE_KEYS.legacy[1]]: '{"gamesPlayed":900}' } }); await f.init(); await f.click('data-wordle-stats')
  const outcomes = Array.from({ length: 47 }, (_, i) => i % 4 === 0 ? 'playing' : i % 4 === 1 ? 'lost' : 'won')
  const played = outcomes.filter(x => x !== 'playing').length + 10, won = outcomes.filter(x => x === 'won').length + 4
  const stat = f.h.all().filter(n => n.type === 'div' && n.props.className?.startsWith('text-2xl font-bold text-fg')).map(text)
  assert.deepEqual(stat.slice(0, 2), [String(played), String(Math.round(won / played * 100))]); assert.equal(f.history().rows.length, 30); assert.deepEqual(plain(f.history().rows.map(r => r.day)), Array.from({ length: 30 }, (_, i) => day - i))
  const row = f.history().rows.find(r => r.status === 'won'), answer = records[row.day].guesses[0]
  const expectedGrid = [...answer].map(ch => { const code = ch.charCodeAt(0) - 0xac00; return '🟩'.repeat(code % 28 ? 3 : 2) }).join(' ')
  assert.equal(row.grid, expectedGrid); assert.ok(row.text.includes(`${row.date}\n`)); assert.equal(row.text.includes(answer), false)
  f.history().onSelect(row.day); await f.settle(); assert.equal(f.root()['data-wordle-day'], day); assert.equal(f.values.get(WORDLE_KEYS.daily), raw); assert.equal(f.writes.length, 0); assert.equal(f.records.length, 0); f.cleanup()
})

await group('history/current reverse copy, hard/locale/contrast ABA, and canceled timers preserve newest owner', async () => {
  const f = await completed(); f.io.clipboard = 'wait'; await f.click('data-wordle-copy', 'current'); const current = f.pendingCopies.at(-1)
  await f.click('data-wordle-stats'); const row = f.history().rows[0]; f.history().onSelect(row.day); await f.settle(); f.history().onCopy(row); await f.settle(); const history = f.pendingCopies.at(-1), count = f.fallback.length
  current.reject(new Error('old current')); await f.settle(); assert.equal(f.fallback.length, count); history.resolve(); await f.settle(); assert.equal(f.history().copied, row.day)
  const oldTimer = f.timers.filter(t => t.delay === 2000).at(-1); await f.language('en'); await f.language('ko'); assert.equal(f.history().copied, null)
  f.io.clipboard = 'reject'; f.io.legacy = false; f.history().onCopy(row); await f.settle(); assert.equal(f.recovery().props.text, row.text)
  f.history().onSelect(null); await f.settle(); f.history().onSelect(row.day); await f.settle(); assert.equal(f.recovery(), undefined)
  f.io.clipboard = 'success'; f.history().onCopy(row); await f.settle(); oldTimer.callback(); await f.settle(); assert.equal(f.history().copied, row.day)
  await closeDialog(f); await f.click('data-wordle-switch', 'practice'); await f.click('data-wordle-stats'); f.history().onSelect(row.day); await f.settle(); f.io.clipboard = 'wait'; f.history().onCopy(row); await f.settle(); const hardPending = f.pendingCopies.at(-1)
  const hard = f.attr('data-wordle-setting', 'hard'); hard.props.onChange({ target: { checked: true } }); await f.settle(); f.attr('data-wordle-setting', 'hard').props.onChange({ target: { checked: false } }); await f.settle(); hardPending.reject(new Error('old hard scope')); await f.settle(); assert.equal(f.recovery(), undefined)
  f.history().onCopy(row); await f.settle(); const contrastPending = f.pendingCopies.at(-1), beforeContrast = f.fallback.length
  const contrast = f.attr('data-wordle-setting', 'contrast'); contrast.props.onChange({ target: { checked: true } }); await f.settle(); f.attr('data-wordle-setting', 'contrast').props.onChange({ target: { checked: false } }); await f.settle(); contrastPending.reject(new Error('old contrast scope')); await f.settle(); assert.equal(f.recovery(), undefined); assert.equal(f.fallback.length, beforeContrast); f.cleanup()
})

async function connectShare(f) {
  const messages = JSON.parse(fs.readFileSync('messages/ko.json', 'utf8')).shareResult
  const s = await componentHarness('src/components/ShareResult.tsx', { props: shareProps(f), navigator: f.h.context.navigator, document: f.h.document,
    modules: { '@/lib/i18n/shared': { useTranslations: () => key => messages[key] }, '@/utils/shareCard': { renderShareCard: async () => { throw new Error('Image action not part of this test') } } },
    globals: { HTMLElement: f.h.context.HTMLElement },
  })
  s.render()
  return { s, sync: () => s.setProps(shareProps(f)), action: () => s.find(n => n.props['data-share-action'] === 'copy'), recovery: () => s.all().some(n => Object.hasOwn(n.props, 'data-share-recovery')) }
}
await group('actual ShareResult and actual parent ownership in both directions; failed fallback is never success', async () => {
  const f = await completed(), linked = await connectShare(f); f.io.clipboard = 'wait'
  f.attr('data-wordle-share-boundary').props.onClickCapture(); await f.settle(); linked.sync(); const shareRequest = linked.action().props.onClick(); linked.s.render(); const oldShare = f.pendingCopies.at(-1)
  await f.click('data-wordle-copy', 'current'); linked.sync(); const own = f.pendingCopies.at(-1), fallbacks = f.fallback.length
  oldShare.reject(new Error('old share')); await shareRequest; linked.s.render(); assert.equal(f.fallback.length, fallbacks); assert.equal(linked.recovery(), false)
  own.resolve(); await f.settle(); assert.equal(f.recovery(), undefined)
  await f.click('data-wordle-copy', 'current'); const oldOwn = f.pendingCopies.at(-1); f.attr('data-wordle-share-boundary').props.onClickCapture(); await f.settle(); linked.sync(); const shareLatest = linked.action().props.onClick(); linked.s.render(); const latest = f.pendingCopies.at(-1)
  oldOwn.reject(new Error('old current')); await f.settle(); assert.equal(f.fallback.length, fallbacks); latest.reject(new Error('new share failed')); await shareLatest; linked.s.render(); assert.equal(linked.recovery(), true); assert.equal(f.fallback.length, fallbacks + 1); assert.equal(f.recovery(), undefined)
  f.io.clipboard = 'reject'; await f.click('data-wordle-copy', 'current'); linked.sync(); assert.equal(linked.recovery(), false); assert.ok(f.recovery()); assert.equal(f.recovery().props.text, f.native.at(-1))
  linked.s.cleanup(); f.cleanup()
})

await group('actual recovery child keeps full literal text and selection failure; close/unmount block late fallback', async () => {
  const f = await completed(); f.io.clipboard = 'reject'; await f.click('data-wordle-copy', 'current'); const props = f.recovery().props
  let selected = null, fail = true; const field = { focus() { if (fail) throw new Error('focus denied') }, select() {}, setSelectionRange(a, b) { selected = [a, b] } }
  const messages = JSON.parse(fs.readFileSync('messages/ko.json', 'utf8')); Object.assign(messages.koreanWordle, JSON.parse(fs.readFileSync('docs/verify/2026-11-17-repeat-batch42/translations-wordle.json', 'utf8')).ko.koreanWordle)
  const c = await componentHarness('src/components/KoreanWordleCopyRecovery.tsx', { props, messages, beforeEffects(tree) { const walk = n => { if (Array.isArray(n)) return n.forEach(walk); if (!n || typeof n !== 'object') return; if (n.type === 'textarea') n.props.ref.current = field; walk(n.props?.children) }; walk(tree) } }); c.render()
  const by = key => c.find(n => Object.hasOwn(n.props, key)); assert.equal(by('data-wordle-copy-manual').props.value, props.text); by('data-wordle-copy-select').props.onClick(); c.render(); assert.ok(c.text().includes(messages.koreanWordle.copyRecovery.selectionFailed)); fail = false; by('data-wordle-copy-select').props.onClick(); c.render(); assert.deepEqual(selected, [0, props.text.length])
  f.io.clipboard = 'wait'; by('data-wordle-copy-retry').props.onClick(); await f.settle(); const pending = f.pendingCopies.at(-1), count = f.fallback.length; by('data-wordle-copy-close').props.onClick(); await f.settle(); pending.reject(new Error('closed')); await f.settle(); assert.equal(f.fallback.length, count); assert.equal(f.recovery(), undefined)
  await f.click('data-wordle-copy', 'current'); const disposed = f.pendingCopies.at(-1); f.cleanup(); disposed.reject(new Error('unmounted')); await Promise.resolve(); await Promise.resolve(); assert.equal(f.fallback.length, count); c.cleanup()
})

console.log(`Wordle independent actual parent: ${results.length} groups PASS; public RPC 0, native browser not run`)
