import assert from 'node:assert/strict'
import fs from 'node:fs'
import { menuHost } from './menu-round-parent-harness.mjs'
import { componentHarness } from '../2026-11-17-repeat-batch29/team-parent-harness.mjs'
import { createMenuRoundExclusions, excludeMenuRoundName, restoreMenuRoundName, restoreAllMenuRoundNames, updateMenuRoundContext } from '../../../src/utils/menuRoundExclusions.ts'

// Reuse controlled I/O only; observations and expected values below are independent.
const plain = value => JSON.parse(JSON.stringify(value))
const all = node => !node || typeof node !== 'object' ? [] : Array.isArray(node) ? node.flatMap(all) : [node, ...all(node.props?.children)]
const result = f => {
  const card = f.h.all().find(node => node.props.id === 'roulette-result')
  return card && all(card).find(node => node.type === 'p' && node.props.className.includes('text-2xl')).props.children
}
const values = f => plain(f.round().items.map(item => item.value))
const draw = async f => { const frame = await f.start(); await f.finish(frame); return { frame, name: result(f) } }
const deferred = () => { let resolve, reject; const promise = new Promise((a, b) => { resolve = a; reject = b }); return { promise, resolve, reject } }
const messages = JSON.parse(fs.readFileSync('messages/ko.json', 'utf8'))
async function recovery(f) {
  const h = await componentHarness('src/components/MenuRoundExclusions.tsx', { props: f.child('MenuRoundExclusions'), messages })
  h.render()
  return { h, async restore(name) { h.setProps(f.child('MenuRoundExclusions')); h.find(n => n.props['data-menu-restore'] === name).props.onClick(); await f.settle() },
    async restoreAll() { h.setProps(f.child('MenuRoundExclusions')); h.find(n => Object.hasOwn(n.props, 'data-menu-restore-all')).props.onClick(); await f.settle() }, cleanup: () => h.cleanup() }
}
let groups = 0
const check = async (name, run) => { await run(); groups++; console.log('PASS', name) }

await check('independent set model follows 180 exclude/restore operations, ordered slots and trim-only equality', () => {
  const source = [' A ', 'B', 'A', 'Ｃ', 'C', '__proto__', '🍲', ' B ', '<&>', '끝'], original = JSON.stringify(source)
  let state = createMenuRoundExclusions(source), expected = new Set()
  for (let step = 0; step < 180; step++) {
    const name = source[(step * 7 + 2) % source.length].trim(), revision = state.revision
    const before = state, next = step % 5 === 0 ? restoreAllMenuRoundNames(state, revision)
      : step % 3 === 0 ? restoreMenuRoundName(state, name, revision) : excludeMenuRoundName(state, name, revision)
    if (step % 5 === 0) expected = new Set()
    else if (step % 3 === 0) expected.delete(name)
    else if (!expected.has(name) && source.filter(value => !expected.has(value.trim()) && value.trim() !== name).length >= 2) expected.add(name)
    state = next.state
    assert.deepEqual(state.items.map(({ sourceIndex, value }) => [sourceIndex, value]), source.map((value, index) => [index, value]).filter(([, value]) => !expected.has(value.trim())))
    assert.deepEqual(state.source, source); assert.equal(JSON.stringify(source), original)
    if (state !== before) assert.equal(excludeMenuRoundName(state, 'A', revision).error, 'stale')
    assert.ok(state.items.length >= 2)
  }
  const noChange = updateMenuRoundContext(state, source, ['NOT IN SOURCE'])
  assert.equal(noChange, state)
  const changed = updateMenuRoundContext(state, source, ['B'])
  assert.deepEqual(changed.excluded, []); assert.equal(changed.items.some(item => item.key === 'B'), false)
  assert.equal(changed.items.some(item => item.key === 'Ｃ'), true); assert.equal(changed.items.some(item => item.key === 'C'), true)
})

await check('actual repeated draws and actual recovery child preserve original index order, URL and weekly pool', async () => {
  const source = ['라면', '한식', '라면', '분식', '한식', '🥙', 'a & <b>', '🥙', '초밥', '빵']
  const f = await menuHost({ source }), child = await recovery(f), url = f.h.window.location.href, excluded = new Set()
  for (let step = 0; step < 14; step++) {
    const { name } = await draw(f); assert.ok(values(f).includes(name))
    const remaining = source.filter(value => !excluded.has(value) && value !== name), before = f.round(), button = f.by('data-menu-exclude-result')
    assert.equal(button.props.disabled, remaining.length < 2)
    button.props.onClick(); await f.settle()
    if (remaining.length >= 2) { excluded.add(name); assert.equal(result(f), undefined) } else assert.equal(f.round(), before)
    if (step % 3 === 2 && excluded.size) { const name = [...excluded][0]; await child.restore(name); excluded.delete(name) }
    assert.deepEqual(values(f), source.filter(value => !excluded.has(value)))
    assert.deepEqual(plain(f.round().source), source); assert.deepEqual(plain(f.child('MealPlanPanel').candidates), source)
    assert.equal(f.h.window.location.href, url); assert.equal(f.storageWrites.length, 0)
    for (const item of f.round().items) assert.equal(item.value, source[item.sourceIndex])
  }
  if (excluded.size) await child.restoreAll()
  assert.deepEqual(values(f), source); assert.equal(f.focuses.at(-1), 'roulette-spin'); child.cleanup(); f.cleanup()
})

await check('physical slot minimum accepts two copies of one name and rejects last distinct name removal', async () => {
  const source = ['single', 'pair', 'pair'], f = await menuHost({ source })
  // Observe actual outcomes; do not reproduce the engine angle-to-index formula.
  for (let count = 0; count < 10 && !f.round().excluded.length; count++) {
    const { name } = await draw(f), before = f.round(), button = f.by('data-menu-exclude-result')
    assert.equal(button.props.disabled, name === 'pair'); button.props.onClick(); await f.settle()
    if (name === 'pair') assert.equal(f.round(), before)
  }
  assert.deepEqual(values(f), ['pair', 'pair']); await draw(f)
  const blocked = f.by('data-menu-exclude-result'), before = f.round(); assert.equal(blocked.props.disabled, true); blocked.props.onClick(); await f.settle(); assert.equal(f.round(), before)
  const child = await recovery(f); await child.restoreAll(); assert.deepEqual(values(f), source); child.cleanup(); f.cleanup()
})

await check('only original candidates, explicit preset and effective meal eligibility reset exclusions', async () => {
  const source = ['A', 'B', 'C', 'D', 'E'], raw = JSON.stringify({ records: [{ id: 'meal-1', name: 'C', date: '2026-11-17' }], excludeDays: 1 })
  const f = await menuHost({ source, storage: { 'toolhub-meals-v1': raw } }); assert.deepEqual(values(f), ['A', 'B', 'D', 'E'])
  const { name } = await draw(f); await f.click('data-menu-exclude-result'); assert.deepEqual(plain(f.round().excluded), [name])
  const meal = f.child('MealHistoryPanel'); assert.equal(meal.onAdd('unrelated', meal.today), true); await f.settle(); assert.deepEqual(plain(f.round().excluded), [name])
  const outside = f.child('MealHistoryPanel').records.find(row => row.name === 'unrelated'); f.child('MealHistoryPanel').onDelete(outside.id); await f.settle(); assert.deepEqual(plain(f.round().excluded), [name])
  f.child('MealHistoryPanel').onExclude(7); await f.settle(); assert.deepEqual(plain(f.round().excluded), [name]); assert.deepEqual(plain(f.child('MealPlanPanel').candidates), ['A', 'B', 'D', 'E'])
  f.child('MealHistoryPanel').onExclude(0); await f.settle(); assert.deepEqual(plain(f.round().excluded), []); assert.deepEqual(values(f), source)
  await draw(f); await f.click('data-menu-exclude-result'); await f.preset('dinner'); assert.equal(f.round().excluded.length, 0)
  const preset = plain(f.round().source); await draw(f); await f.click('data-menu-exclude-result'); await f.preset('dinner'); assert.deepEqual(plain(f.round().source), preset); assert.equal(f.round().excluded.length, 0)
  assert.equal(f.round().source.length, 12)
  const row = f.by('data-menu-candidate-index', 11); all(row).find(n => n.type === 'button').props.onClick(); await f.settle(); assert.equal(f.round().excluded.length, 0)
  await draw(f); await f.click('data-menu-exclude-result'); const input = f.h.find(n => n.type === 'input' && n.props['aria-label'] === f.label('roulette.addInputLabel'))
  input.props.onChange({ target: { value: 'new candidate' } }); await f.settle(); f.h.find(n => n.type === 'input' && n.props['aria-label'] === f.label('roulette.addInputLabel')).props.onKeyDown({ key: 'Enter' }); await f.settle()
  assert.equal(f.round().excluded.length, 0); assert.equal(f.round().source.at(-1), 'new candidate'); f.cleanup()
})

await check('same-render stale restoration and spin-time stale commands do not own the new round', async () => {
  const f = await menuHost({ source: ['A', 'B', 'C', 'D', 'E', 'F'] }); const first = await draw(f), oldExclude = f.by('data-menu-exclude-result').props.onClick
  oldExclude(); await f.settle(); const firstPanel = f.child('MenuRoundExclusions'), firstRevision = f.round().revision
  const second = await draw(f); await f.click('data-menu-exclude-result'); assert.notEqual(first.name, second.name)
  const secondPanel = f.child('MenuRoundExclusions'), secondRevision = f.round().revision
  firstPanel.onRestore(first.name, firstRevision); await f.settle(); assert.equal(f.round().excluded.length, 2)
  secondPanel.onRestore(first.name, secondRevision); secondPanel.onRestoreAll(secondRevision); await f.settle()
  assert.deepEqual(plain(f.round().excluded), [second.name])
  const currentRound = f.round(), pending = await f.start(), frameCount = f.frames.length
  oldExclude(); secondPanel.onRestoreAll(currentRound.revision); f.h.button(f.label('presets.dinner')).props.onClick(); f.by('id', 'roulette-spin').props.onClick(); await f.settle()
  assert.equal(f.round(), currentRound); assert.equal(f.frames.length, frameCount); assert.equal(f.root()['data-roulette-spinning'], true)
  first.frame.callback(Infinity); second.frame.callback(Infinity); await f.settle(); assert.equal(result(f), undefined); assert.equal(f.root()['data-roulette-spinning'], true)
  await f.finish(pending); const completed = result(f), text = f.h.text(); pending.callback(Infinity); await f.settle(); assert.equal(result(f), completed); assert.equal(f.h.text(), text)
  f.cleanup(); pending.callback(Infinity); assert.equal(f.storageWrites.length, 0)
})

await check('copy rejection and PNG handlers stay invalid across exclude/restore and identical-result ABA', async () => {
  const f = await menuHost({ source: ['A', 'A', 'B', 'B', 'C', 'C'] }), wait = deferred()
  const { name } = await draw(f); f.copy(() => wait.promise); await f.click('data-roulette-copy')
  const oldImage = f.h.button(f.label('roulette.saveImage')).props.onClick, oldCopy = f.by('data-roulette-copy').props.onClick
  await f.click('data-menu-exclude-result'); const child = await recovery(f); await child.restoreAll()
  for (let count = 0; count < 12; count++) { const next = await draw(f); if (next.name === name) break }
  assert.equal(result(f), name); const beforeCopies = f.copies.length; oldImage(); oldCopy(); await f.settle(); assert.equal(f.files.length, 0); assert.equal(f.copies.length, beforeCopies)
  wait.reject(new Error('old owner')); await f.settle(); assert.equal(f.legacy.length, 0); assert.equal(f.by('data-roulette-copy').props['data-roulette-copied'], false)
  f.copy(async () => {}); await f.click('data-roulette-copy'); assert.equal(f.by('data-roulette-copy').props['data-roulette-copied'], true)
  f.h.button(f.label('roulette.saveImage')).props.onClick(); await f.settle(); assert.equal(f.files.length, 1); assert.equal(f.files[0].name, `roulette-${name}.png`)
  child.cleanup(); f.cleanup()
})

await check('local day expiry changes eligible pool without writing source records and preserves URL/raw candidates', async () => {
  const source = ['A', 'B', 'C', 'D', 'E'], raw = JSON.stringify({ records: [{ id: 'today', name: 'A', date: '2026-11-17' }], excludeDays: 1 })
  const f = await menuHost({ source, storage: { 'toolhub-meals-v1': raw } }), url = f.h.window.location.href
  await draw(f); await f.click('data-menu-exclude-result'); assert.equal(f.round().excluded.length, 1)
  f.clock(Date.UTC(2026, 10, 18, 3)); await f.tick(60000); assert.deepEqual(values(f), source); assert.deepEqual(plain(f.child('MealPlanPanel').candidates), source)
  assert.equal(f.storage.get('toolhub-meals-v1'), raw); assert.equal(f.storageWrites.length, 0); assert.equal(f.h.window.location.href, url); assert.equal(result(f), undefined)
  f.cleanup()
})
console.log(`Independent menu round: ${groups} groups passed (controlled I/O; native tests separate)`)
