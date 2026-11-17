import assert from 'node:assert/strict'
import { createTextPipelineHistory as create, reduceTextPipelineHistory as reduce, cloneTextPipelineSteps, TEXT_PIPELINE_HISTORY_LIMIT } from '../src/utils/textPipelineHistory.ts'
import { CASE_IDS, LINE_OPS, SPACE_OPS, CHAR_OPS, LIST_PRESETS, runPipeline, encodeSteps, decodeSteps, REGEX_MAX, type Step } from '../src/utils/textConvert.ts'

let passed = 0
function check(name: string, action: () => void) { action(); passed++; console.log(`PASS ${name}`) }
const special: Step[] = [
  { op: 'replace', find: '(안녕)\\s+', repl: '$1\\n $&', regex: true, flags: 'ims' },
  { op: 'affix', prefix: '앞\t', suffix: '\n뒤' },
  { op: 'shuffle', seed: 0 },
  { op: 'shuffle', seed: undefined },
  { op: 'shuffle' },
  { op: 'list', preset: 'json' },
]
check('empty reset/undo/redo are true no-ops', () => {
  const state = create()
  for (const type of ['reset', 'undo', 'redo'] as const) assert.equal(reduce(state, { type }), state)
})
check('every existing step kind survives cloning without rewriting properties', () => {
  const steps: Step[] = [...CASE_IDS, ...LINE_OPS, ...SPACE_OPS, ...CHAR_OPS].map(op => ({ op }))
  steps.push(...LIST_PRESETS.map(preset => ({ op: 'list' as const, preset })), ...special)
  const state = create(steps)
  assert.deepEqual(state.present, steps); assert.notEqual(state.present, steps)
  state.present.forEach((step, index) => assert.notEqual(step, steps[index]))
  assert.equal(Object.hasOwn(state.present.at(-4)!, 'seed'), true)
  assert.equal(Object.hasOwn(state.present.at(-3)!, 'seed'), true)
  assert.equal(Object.hasOwn(state.present.at(-2)!, 'seed'), false)
})
check('later changes to original arrays/step objects cannot rewrite the baseline', () => {
  const original = cloneTextPipelineSteps(special), expected = cloneTextPipelineSteps(original), state = create(original)
  const replace = original[0] as Extract<Step, { op: 'replace' }>; replace.find = 'changed'; original.reverse(); original.pop()
  assert.deepEqual(state.present, expected)
})
check('add captures its step and the previous present without sharing mutable input objects', () => {
  const original: Step = { op: 'affix', prefix: 'pre', suffix: 'post' }, before = create([{ op: 'shuffle', seed: 7 }])
  const after = reduce(before, { type: 'add', step: original }); original.prefix = 'changed'
  ;(before.present[0] as Extract<Step, { seed?: number }>).seed = 99; before.present.push({ op: 'upper' })
  assert.deepEqual(after.present, [{ op: 'shuffle', seed: 7 }, { op: 'affix', prefix: 'pre', suffix: 'post' }])
  assert.deepEqual(after.past, [[{ op: 'shuffle', seed: 7 }]])
})
check('remove targets an occurrence by index and preserves another equal step', () => {
  const state = create([{ op: 'upper' }, { op: 'lower' }, { op: 'upper' }])
  const removed = reduce(state, { type: 'remove', index: 2 })
  assert.deepEqual(removed.present, [{ op: 'upper' }, { op: 'lower' }]); assert.deepEqual(reduce(removed, { type: 'undo' }).present, state.present)
})
check('moving a step changes actual trim/dedupe output and undo/redo restores its order', () => {
  const input = '가 \n가', before = create([{ op: 'dedupe' }, { op: 'trimLines' }])
  const moved = reduce(before, { type: 'move', index: 1, direction: 'up' })
  assert.equal(runPipeline(input, before.present).text, '가\n가'); assert.equal(runPipeline(input, moved.present).text, '가')
  const undone = reduce(moved, { type: 'undo' }); assert.deepEqual(undone.present, before.present)
  assert.deepEqual(reduce(undone, { type: 'redo' }).present, moved.present)
  assert.deepEqual(reduce(moved, { type: 'move', index: 0, direction: 'down' }).present, before.present)
})
check('invalid indexes and boundary moves leave history and redo untouched', () => {
  const state = reduce(reduce(create(), { type: 'add', step: { op: 'upper' } }), { type: 'undo' })
  for (const index of [-1, 0, 1, 1.5, NaN, Infinity]) {
    assert.equal(reduce(state, { type: 'remove', index }), state)
    assert.equal(reduce(state, { type: 'move', index, direction: 'down' }), state)
  }
  const one = create([{ op: 'lower' }])
  assert.equal(reduce(one, { type: 'move', index: 0, direction: 'up' }), one)
  assert.equal(reduce(one, { type: 'move', index: 0, direction: 'down' }), one)
})
check('swapping equal steps is a no-op, while different shuffle seeds are distinct', () => {
  const same = create([{ op: 'upper' }, { op: 'upper' }])
  assert.equal(reduce(same, { type: 'move', index: 0, direction: 'down' }), same)
  const seeds = create([{ op: 'shuffle', seed: 1 }, { op: 'shuffle', seed: 2 }])
  assert.deepEqual(reduce(seeds, { type: 'move', index: 0, direction: 'down' }).present, [{ op: 'shuffle', seed: 2 }, { op: 'shuffle', seed: 1 }])
})
check('reset remains reversible and a second empty reset retains the undo stack', () => {
  const before = create(special), reset = reduce(before, { type: 'reset' })
  assert.equal(reset.present.length, 0); assert.equal(reduce(reset, { type: 'reset' }), reset)
  const undone = reduce(reset, { type: 'undo' }); assert.deepEqual(undone.present, special)
  assert.deepEqual(reduce(undone, { type: 'redo' }).present, [])
})
check('a new edit discards redo, but a no-op after undo does not', () => {
  const edited = reduce(create(), { type: 'add', step: { op: 'upper' } }), undone = reduce(edited, { type: 'undo' })
  assert.equal(reduce(undone, { type: 'reset' }).future.length, 1)
  const branched = reduce(undone, { type: 'add', step: { op: 'lower' } })
  assert.equal(branched.future.length, 0); assert.equal(reduce(branched, { type: 'redo' }), branched)
})
check('at most thirty transitions span past and future, with the current state separate', () => {
  let state = create()
  for (let i = 0; i < 45; i++) state = reduce(state, { type: 'add', step: { op: 'shuffle', seed: i } })
  assert.equal(state.past.length, TEXT_PIPELINE_HISTORY_LIMIT); assert.equal(state.present.length, 45)
  for (let i = 0; i < 30; i++) { state = reduce(state, { type: 'undo' }); assert.equal(state.past.length + state.future.length, 30) }
  assert.equal(state.present.length, 15); assert.equal(reduce(state, { type: 'undo' }), state)
  for (let i = 0; i < 30; i++) { state = reduce(state, { type: 'redo' }); assert.equal(state.past.length + state.future.length, 30) }
  assert.equal(state.present.length, 45); assert.equal(reduce(state, { type: 'redo' }), state)
})
check('external URL restoration starts a fresh baseline even with matching current values', () => {
  const decoded = decodeSteps('trimLines,shuffle,list-json', 123)
  const state = reduce(create(decoded), { type: 'add', step: { op: 'upper' } })
  const restored = reduce(state, { type: 'restore', steps: decoded })
  assert.deepEqual(restored.present, decoded); assert.equal(restored.past.length + restored.future.length, 0)
  const withPast = reduce(create(), { type: 'add', step: { op: 'upper' } })
  const same = reduce(withPast, { type: 'restore', steps: [{ op: 'upper' }] })
  assert.equal(same.past.length, 0); assert.equal(reduce(same, { type: 'undo' }), same)
  decoded.reverse(); assert.deepEqual(restored.present, decodeSteps('trimLines,shuffle,list-json', 123))
})
check('history stores no source/form values and URL encoding still excludes private parameters', () => {
  const state = create(special), encoded = encodeSteps(state.present)
  assert.deepEqual(Object.keys(state).sort(), ['future', 'past', 'present'])
  assert.doesNotMatch(encoded, /안녕|앞|뒤|replace|affix|seed|ims/)
  const sourceA = 'A\nB\nC\nD', sourceB = '다른 입력'
  const shuffled = create([{ op: 'shuffle', seed: 123 }]), first = runPipeline(sourceA, shuffled.present)
  const restored = reduce(reduce(shuffled, { type: 'reset' }), { type: 'undo' })
  assert.deepEqual(runPipeline(sourceA, restored.present), first); assert.equal(runPipeline(sourceB, restored.present).text, sourceB)
})
check('failed steps and REGEX_MAX behavior remain the existing calculator policy', () => {
  const bad: Step = { op: 'replace', find: '(', repl: 'x', regex: true, flags: 'i' }
  const state = create([bad, { op: 'upper' }]), restored = reduce(reduce(state, { type: 'reset' }), { type: 'undo' })
  assert.deepEqual(runPipeline('a', restored.present), { text: 'A', errors: ['badRegex', null] })
  const tooLong = create([{ op: 'replace', find: 'a', repl: 'b', regex: true, flags: '' }])
  assert.deepEqual(runPipeline('a'.repeat(REGEX_MAX + 1), tooLong.present).errors, ['tooLong'])
})
console.log(`Text pipeline history: ${passed} groups passed`)
