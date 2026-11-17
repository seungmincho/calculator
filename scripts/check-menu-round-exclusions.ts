import assert from 'node:assert/strict'
import { createMenuRoundExclusions, updateMenuRoundContext, excludeMenuRoundName, restoreMenuRoundName, restoreAllMenuRoundNames, createMenuSpinGuard, type MenuRoundChange } from '../src/utils/menuRoundExclusions.ts'

let groups = 0
const test = (name: string, run: () => void) => { run(); groups++; console.log('PASS ' + name) }
const success = (change: MenuRoundChange) => { assert.equal(change.ok, true); if (!change.ok) throw new Error(change.error); return change.state }

test('all duplicate names excluded, original slots/order and caller inputs remain untouched', () => {
  const source = ['피자', '국수', '피자', '김밥'], unavailable: string[] = [], initial = createMenuRoundExclusions(source, unavailable)
  const next = success(excludeMenuRoundName(initial, '피자', initial.revision))
  assert.deepEqual(next.items.map(item => item.sourceIndex), [1, 3]); assert.deepEqual(next.items.map(item => item.value), ['국수', '김밥'])
  assert.deepEqual(next.source, source); assert.deepEqual(initial.items.map(item => item.sourceIndex), [0, 1, 2, 3])
  source[0] = 'changed'; unavailable.push('국수'); assert.equal(initial.source[0], '피자'); assert.equal(next.items[0].value, '국수')
  const restored = success(restoreMenuRoundName(next, '피자', next.revision)); assert.deepEqual(restored.items.map(item => item.value), ['피자', '국수', '피자', '김밥'])
  assert.ok(Object.isFrozen(next) && Object.isFrozen(next.items) && Object.isFrozen(next.items[0]) && Object.isFrozen(next.source))
})
test('minimum uses surviving slots, so repeated rows retain their existing weighting meaning', () => {
  const s = createMenuRoundExclusions(['A', 'A', 'B'])
  assert.deepEqual(excludeMenuRoundName(s, 'A', s.revision), { ok: false, error: 'minimum', state: s })
  const next = success(excludeMenuRoundName(s, 'B', s.revision)); assert.deepEqual(next.items.map(item => item.value), ['A', 'A'])
  assert.equal(excludeMenuRoundName(next, 'A', next.revision).ok, false)
  for (const source of [[], ['only'], ['A', 'B']]) { const state = createMenuRoundExclusions(source); assert.equal(excludeMenuRoundName(state, source[0] ?? '', state.revision).ok, false) }
})
test('trim equality only, literal text and long legacy names are not normalized or truncated', () => {
  const long = '긴 원문😀'.repeat(1000), s = createMenuRoundExclusions([' A ', 'A', 'a', 'Ａ', long, '<b>원문</b>'])
  const n = success(excludeMenuRoundName(s, ' A ', s.revision))
  assert.deepEqual(n.items.map(item => item.value), ['a', 'Ａ', long, '<b>원문</b>']); assert.equal(n.source[0], ' A ')
  const restored = success(restoreAllMenuRoundNames(n, n.revision)); assert.equal(restored.source[4], long); assert.equal(restored.items[0].value, ' A ')
})
test('stale revisions are rejected; repeat/no-op actions preserve exact state identity', () => {
  const first = createMenuRoundExclusions(['A', 'B', 'C', 'D']), n = success(excludeMenuRoundName(first, 'A', first.revision))
  assert.equal(success(excludeMenuRoundName(n, 'A', n.revision)), n); assert.equal(success(restoreMenuRoundName(n, 'missing', n.revision)), n)
  assert.deepEqual(restoreAllMenuRoundNames(n, first.revision), { ok: false, error: 'stale', state: n })
  assert.equal(excludeMenuRoundName(n, 'missing', n.revision).ok, false)
  const reset = success(restoreAllMenuRoundNames(n, n.revision)); assert.equal(success(restoreAllMenuRoundNames(reset, reset.revision)), reset)
})
test('explicit edits/presets reset; unrelated meal filters and render copies preserve exclusions', () => {
  const original = createMenuRoundExclusions(['A', 'B', 'C', 'D']), hidden = success(excludeMenuRoundName(original, 'A', original.revision))
  assert.equal(updateMenuRoundContext(hidden, [...hidden.source]), hidden)
  assert.equal(updateMenuRoundContext(hidden, [...hidden.source], ['not in source']), hidden)
  for (const updated of [updateMenuRoundContext(hidden, ['A', 'B', 'C', 'D', 'E']), updateMenuRoundContext(hidden, ['D', 'C', 'B', 'A']), updateMenuRoundContext(hidden, hidden.source, [], true), updateMenuRoundContext(hidden, hidden.source, ['D'])]) {
    assert.deepEqual(updated.excluded, []); assert.equal(updated.revision, hidden.revision + 1)
  }
})
test('temporary restoration cannot restore a meal-blocked row; planning input remains the prior eligible list', () => {
  const initial = createMenuRoundExclusions(['A', 'B', 'A', 'C', 'D'], ['D']), n = success(excludeMenuRoundName(initial, 'A', initial.revision))
  assert.deepEqual(n.eligible.map(item => item.sourceIndex), [0, 1, 2, 3]); assert.deepEqual(n.items.map(item => item.sourceIndex), [1, 3])
  assert.equal(updateMenuRoundContext(n, initial.source, ['not in source', 'D', 'D']), n)
  const restored = success(restoreAllMenuRoundNames(n, n.revision)); assert.deepEqual(restored.items.map(item => item.sourceIndex), [0, 1, 2, 3]); assert.deepEqual(restored.source, ['A', 'B', 'A', 'C', 'D'])
  // Older valid records can have surrounding spaces; retain the existing filter's exact behavior.
  assert.deepEqual(createMenuRoundExclusions([' A ', 'B'], [' A ']).items.map(item => item.sourceIndex), [0, 1])
  assert.deepEqual(createMenuRoundExclusions([' A ', 'B'], ['A']).items.map(item => item.sourceIndex), [1])
})
test('spin callback ownership: one active run, consume completion once, context/foreign/ABA callbacks fail', () => {
  const g = createMenuSpinGuard(), a = g.begin(7)!; assert.ok(a); assert.equal(g.begin(7), null); assert.equal(g.current(a, 8), false)
  assert.equal(g.current({ ...a }, 7), false); assert.equal(g.finish(a, 8), false); assert.equal(g.current(a, 7), true)
  assert.equal(g.finish(a, 7), true); assert.equal(g.finish(a, 7), false)
  const b = g.begin(8)!; g.invalidate(); const c = g.begin(7)!; assert.equal(g.current(a, 7), false); assert.equal(g.current(b, 8), false); assert.equal(g.current(c, 7), true)
})
test('dispose/Strict lifecycle and invalid context cannot authorize an old spin', () => {
  const g = createMenuSpinGuard(); for (const value of [NaN, Infinity, -1, 1.5]) assert.equal(g.begin(value), null)
  const old = g.begin(0)!; g.dispose(); assert.equal(g.current(old, 0), false); assert.equal(g.begin(0), null)
  g.activate(); assert.equal(g.current(old, 0), false); const current = g.begin(0)!; assert.notEqual(current.run, old.run); assert.equal(g.finish(current, 0), true)
})
console.log(`menu round preparation: ${groups} pure groups passed; parent remains unconnected`)
