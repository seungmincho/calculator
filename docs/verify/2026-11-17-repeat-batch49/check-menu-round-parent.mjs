import assert from 'node:assert/strict'
import fs from 'node:fs'
import { menuHost, plain, deferred } from './menu-round-parent-harness.mjs'
import { componentHarness } from '../2026-11-17-repeat-batch29/team-parent-harness.mjs'

let groups = 0
const test = async (name, run) => { await run(); groups++; console.log('PASS ' + name) }
const result = f => f.h.all().find(n => n.props.id === 'roulette-result')
const values = f => plain(f.round().items.map(item => item.value))

await test('duplicate slots excluded together and restored in original order; URL/storage/weekly candidates untouched', async () => {
  const f = await menuHost(), rawUrl = f.h.window.location.href, original = plain(f.round().source), plan = plain(f.child('MealPlanPanel').candidates)
  assert.deepEqual(original, ['피자', '국수', '피자', '김밥']); assert.equal(f.storageWrites.length, 0)
  await f.spinTo(0); assert.equal(f.copies.length, 0); assert.ok(result(f)); const randoms = f.randomCalls()
  await f.click('data-menu-exclude-result'); assert.deepEqual(values(f), ['국수', '김밥']); assert.equal(result(f), undefined); assert.equal(f.focuses.at(-1), 'roulette-spin')
  assert.equal(f.randomCalls(), randoms); assert.deepEqual(plain(f.round().source), original); assert.deepEqual(plain(f.child('MealPlanPanel').candidates), plan); assert.equal(f.h.window.location.href, rawUrl); assert.equal(f.storageWrites.length, 0)
  assert.equal(f.h.all().filter(n => n.props['data-menu-temporarily-excluded'] === true).length, 2)
  f.child('MenuRoundExclusions').onRestore('피자', f.round().revision); await f.settle(); assert.deepEqual(values(f), original); assert.equal(f.focuses.at(-1), 'roulette-spin'); assert.equal(f.storageWrites.length, 0); f.cleanup()
})

await test('minimum two slots and explicit no-op/stale handler guards; no spin or records from restoration', async () => {
  const f = await menuHost({ source: ['A', 'A', 'B'] }); await f.spinTo(0); const before = f.round(), exclude = f.by('data-menu-exclude-result')
  assert.equal(exclude.props.disabled, true); exclude.props.onClick(); await f.settle(); assert.equal(f.round(), before); assert.ok(f.h.text().includes(f.label('menuRound.minimum')))
  await f.spinTo(2); const stale = f.by('data-menu-exclude-result').props.onClick; await f.click('data-menu-exclude-result'); assert.deepEqual(values(f), ['A', 'A']); const oldPanel = f.child('MenuRoundExclusions'), oldRevision = f.round().revision
  oldPanel.onRestore('B', oldRevision); await f.settle(); const restored = f.round(); stale(); oldPanel.onRestoreAll(oldRevision); await f.settle(); assert.equal(f.round(), restored); assert.deepEqual(values(f), ['A', 'A', 'B']); assert.equal(f.storageWrites.length, 0); f.cleanup()
})

await test('candidate edits and same preset reset, unrelated meal records retain skip, actual meal eligibility changes reset', async () => {
  const f = await menuHost(); await f.spinTo(0); await f.click('data-menu-exclude-result')
  const input = f.h.find(n => n.type === 'input' && n.props['aria-label'] === f.label('roulette.addInputLabel')); input.props.onChange({ target: { value: '새 메뉴' } }); await f.settle(); f.h.find(n => n.type === 'input' && n.props['aria-label'] === f.label('roulette.addInputLabel')).props.onKeyDown({ key: 'Enter' }); await f.settle(); assert.deepEqual(plain(f.round().excluded), []); assert.equal(f.round().source.at(-1), '새 메뉴')
  await f.preset('dinner'); await f.spinTo(0); await f.click('data-menu-exclude-result'); assert.equal(f.round().excluded.length, 1); await f.preset('dinner'); assert.equal(f.round().excluded.length, 0)
  await f.spinTo(0); await f.click('data-menu-exclude-result'); const skipped = [...f.round().excluded]; const history = f.child('MealHistoryPanel'); assert.equal(history.onAdd('후보 밖 메뉴', history.today), true); await f.settle(); assert.deepEqual(plain(f.round().excluded), skipped); assert.equal(f.storageWrites.length, 1)
  f.child('MealHistoryPanel').onExclude(0); await f.settle(); assert.deepEqual(plain(f.round().excluded), skipped)
  assert.equal(f.child('MealHistoryPanel').onAdd(f.round().source[1], history.today), true); await f.settle(); assert.deepEqual(plain(f.round().excluded), skipped)
  f.child('MealHistoryPanel').onExclude(1); await f.settle(); assert.equal(f.round().excluded.length, 0); assert.equal(values(f).includes(f.round().source[1]), false); f.cleanup()
})

await test('day filter context resets temporary skips while preserving raw; old/canceled RAF cannot resurrect result or history', async () => {
  const raw = JSON.stringify({ records: [{ id: 'fixture', name: 'B', date: '2026-11-17' }], excludeDays: 1 })
  const f = await menuHost({ source: ['A', 'B', 'C', 'D'], storage: { 'toolhub-meals-v1': raw } }); assert.deepEqual(values(f), ['A', 'C', 'D']); const oldFrame = await f.spinTo(0); await f.click('data-menu-exclude-result'); assert.deepEqual(values(f), ['C', 'D'])
  oldFrame.callback(Infinity); await f.settle(); assert.equal(result(f), undefined); assert.deepEqual(values(f), ['C', 'D'])
  f.clock(Date.UTC(2026, 10, 18, 3)); await f.tick(60000); assert.deepEqual(values(f), ['A', 'B', 'C', 'D']); assert.equal(f.round().excluded.length, 0); assert.equal(f.storage.get('toolhub-meals-v1'), raw)
  const current = await f.start(), rev = f.round().revision; const pool = f.child('MenuRoundExclusions'); pool.onRestoreAll(rev); await f.settle(); assert.equal(f.root()['data-roulette-spinning'], true)
  oldFrame.callback(Infinity); await f.settle(); assert.equal(f.root()['data-roulette-spinning'], true); await f.finish(current); assert.ok(result(f)); const root = f.root()['data-roulette-run']; current.callback(Infinity); await f.settle(); assert.equal(f.root()['data-roulette-run'], root)
  f.cleanup(); current.callback(Infinity); assert.equal(f.storageWrites.length, 0)
})

await test('pending copy and old PNG/result actions are invalidated, same result can be copied again after restore', async () => {
  const f = await menuHost(), waiting = deferred(); await f.spinTo(0); f.copy(() => waiting.promise)
  await f.click('data-roulette-copy'); const png = f.h.button(f.label('roulette.saveImage')).props.onClick
  await f.click('data-menu-exclude-result'); const fallbacks = f.legacy.length; waiting.reject(new Error('old copy')); await f.settle(); assert.equal(f.legacy.length, fallbacks); assert.equal(f.h.all().some(n => n.type?.name === 'DecisionResultCopyRecovery'), false)
  png(); assert.equal(f.files.length, 0); f.child('MenuRoundExclusions').onRestoreAll(f.round().revision); await f.settle(); await f.spinTo(0); f.copy(async () => {}); await f.click('data-roulette-copy'); assert.equal(f.by('data-roulette-copy').props['data-roulette-copied'], true)
  f.h.button(f.label('roulette.saveImage')).props.onClick(); await f.settle(); assert.equal(f.files.length, 1); assert.equal(f.files[0].name, 'roulette-피자.png'); assert.ok(f.images.includes('피자'))
  const before = plain(f.round()); await f.language('en'); assert.deepEqual(plain(f.round()), before); assert.equal(f.storageWrites.length, 0); f.cleanup()
})

await test('Strict replay supports first draw; 20-result history and non-menu roulette have no temporary UI', async () => {
  const f = await menuHost(); f.h.replayEffects(); await f.settle(); await f.spinTo(0); await f.click('data-menu-exclude-result'); assert.equal(f.round().excluded.length, 1); f.cleanup()
  const g = await menuHost({ source: ['A', 'B', 'C'], props: { menuMode: false, defaultPreset: undefined } }); assert.equal(g.h.all().some(n => n.type === 'MenuRoundExclusions'), false)
  for (let i = 0; i < 21; i++) await g.spinTo(i % 3)
  assert.equal(g.h.all().some(n => Object.hasOwn(n.props, 'data-menu-exclude-result')), false); assert.ok(g.h.text().includes(g.label('roulette.history').replace('{count}', '20'))); assert.equal(g.storageWrites.length, 0); g.cleanup()
})

await test('actual KO/EN recovery child uses whole names, disabled handlers, current revision and 44px controls', async () => {
  const f = await menuHost(); await f.spinTo(0); await f.click('data-menu-exclude-result'); const state = f.round(); f.cleanup()
  for (const locale of ['ko', 'en']) {
    const messages = JSON.parse(fs.readFileSync(`messages/${locale}.json`, 'utf8')); Object.assign(messages.decisionTools, JSON.parse(fs.readFileSync('docs/verify/2026-11-17-repeat-batch49/translations-menu-round.json', 'utf8'))[locale].decisionTools)
    const calls = [], props = { state, busy: false, onRestore: (...args) => calls.push(args), onRestoreAll: rev => calls.push(rev) }
    const h = await componentHarness('src/components/MenuRoundExclusions.tsx', { props, messages }); h.render(); h.find(n => n.props['data-menu-restore'] === '피자').props.onClick(); assert.deepEqual(calls.pop(), ['피자', state.revision]); h.find(n => Object.hasOwn(n.props, 'data-menu-restore-all')).props.onClick(); assert.equal(calls.pop(), state.revision)
    assert.ok(h.all().filter(n => n.type === 'button').every(n => n.props.className.includes('min-h-11'))); h.setProps({ ...props, busy: true }); for (const n of h.all().filter(n => n.type === 'button')) n.props.onClick(); assert.equal(calls.length, 0); h.cleanup()
  }
})
console.log(`menu round actual parent/child: ${groups} groups passed; native canvas/layout are separate`)
