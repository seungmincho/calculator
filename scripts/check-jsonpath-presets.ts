import assert from 'node:assert/strict'
import { JSONPath } from 'jsonpath-plus'
import {
  JSONPATH_PRESETS_KEY, JSONPATH_PRESET_LIMITS, addJsonPathPreset, evaluateSavedJsonPath, isSavedJsonPathExpression,
  parseJsonPathPresets, readJsonPathPresets, renameJsonPathPreset, withJsonPathPresetLock, writeJsonPathPresets,
  type JsonPathPresetStore,
} from '../src/utils/jsonPathPresets.ts'

let checks = 0
function check(name: string, fn: () => void) { fn(); checks++; console.log(`PASS ${name}`) }
const empty: JsonPathPresetStore = { version: 1, revision: 'empty', presets: [] }
const date = '2026-11-16T10:00:00.000Z'
const query = '$.store.book[?(@.price < 10)].author'
const first = addJsonPathPreset(empty, ' 저렴한 책 저자 ', query, 'one', date)

check('store roundtrip keeps only names/expressions and accepts syntactically invalid expressions', () => {
  assert.equal(first.presets[0].name, '저렴한 책 저자')
  assert.equal(first.presets[0].expression, query)
  assert.deepEqual(Object.keys(first.presets[0]).sort(), ['expression', 'id', 'name', 'updatedAt'])
  const read = parseJsonPathPresets(JSON.stringify(first))
  assert.equal(read.ok, true)
  if (read.ok) assert.deepEqual(read.store, first)
  const invalidSyntax = addJsonPathPreset(first, '나중에 고칠 식', '$[?(@.x === )]', 'two', date)
  assert.equal(invalidSyntax.presets[1].expression, '$[?(@.x === )]')
  assert.equal(empty.presets.length, 0, 'adding does not mutate the original store')
  const whitespace = addJsonPathPreset(empty, '공백 보존', '  $["한글 이름"]  ', 'space', date)
  assert.equal(whitespace.presets[0].expression, '  $["한글 이름"]  ')
})

check('name/expression/count limits and duplicate names are strict', () => {
  assert.equal(isSavedJsonPathExpression(''), false); assert.equal(isSavedJsonPathExpression('  \n'), false)
  assert.equal(isSavedJsonPathExpression('x'.repeat(1000)), true); assert.equal(isSavedJsonPathExpression('x'.repeat(1001)), false)
  assert.throws(() => addJsonPathPreset(empty, 'x'.repeat(41), '$', 'one', date), /invalid/)
  assert.throws(() => addJsonPathPreset(empty, 'x\ny', '$', 'one', date), /invalid/)
  assert.equal(addJsonPathPreset(empty, 'x'.repeat(40), '$', 'max', date).presets.length, 1)
  assert.throws(() => addJsonPathPreset(first, '저렴한 책 저자', '$', 'two', date), /duplicate/)
  let store = empty
  for (let i = 0; i < JSONPATH_PRESET_LIMITS.count; i++) store = addJsonPathPreset(store, `이름 ${i}`, `$.value[${i}]`, `id-${i}`, date)
  assert.equal(store.presets.length, 12)
  assert.throws(() => addJsonPathPreset(store, '초과', '$', 'extra', date), /limit/)
})

check('rename changes only the selected name and timestamp, preserving expressions', () => {
  const two = addJsonPathPreset(first, '전체', '$', 'two', date)
  const renamed = renameJsonPathPreset(two, 'one', ' 새 이름 ', 'rename', '2026-11-16T11:00:00.000Z')
  assert.equal(renamed.presets[0].name, '새 이름'); assert.equal(renamed.presets[0].expression, query)
  assert.deepEqual(renamed.presets[1], two.presets[1])
  assert.equal(two.presets[0].name, '저렴한 책 저자')
  assert.throws(() => renameJsonPathPreset(two, 'one', '전체', 'rename', date), /duplicate/)
  assert.throws(() => renameJsonPathPreset(two, 'missing', '없음', 'rename', date), /invalid/)
})

check('corrupt/future/oversized/unknown fields and invalid timestamps are not normalized away', () => {
  const bad = [
    '{broken', '{}', JSON.stringify({ ...first, version: 2 }), 'x'.repeat(100001),
    JSON.stringify({ ...first, json: { secret: true } }),
    JSON.stringify({ ...first, presets: [{ ...first.presets[0], result: [1] }] }),
    JSON.stringify({ ...first, presets: [first.presets[0], first.presets[0]] }),
    JSON.stringify({ ...first, presets: [{ ...first.presets[0], updatedAt: '2026-02-30T10:00:00.000Z' }] }),
    JSON.stringify({ ...first, presets: [{ ...first.presets[0], expression: '' }] }),
  ]
  for (const raw of bad) assert.equal(parseJsonPathPresets(raw).ok, false)
  assert.deepEqual(parseJsonPathPresets(JSON.stringify({ ...first, version: 2 })), { ok: false, error: 'unsupported' })
})

check('CAS, corrupt preservation, quota, unavailable and failed readback', () => {
  let raw: string | null = null
  const storage = { getItem: (key: string) => { assert.equal(key, JSONPATH_PRESETS_KEY); return raw }, setItem: (key: string, next: string) => { assert.equal(key, JSONPATH_PRESETS_KEY); raw = next } }
  assert.equal(writeJsonPathPresets(storage, null, first).ok, true)
  assert.equal(readJsonPathPresets(storage).ok, true)
  const original = raw
  assert.deepEqual(writeJsonPathPresets(storage, null, empty), { ok: false, error: 'conflict' }); assert.equal(raw, original)
  raw = null
  assert.deepEqual(writeJsonPathPresets(storage, original, empty), { ok: false, error: 'conflict' })
  for (const invalid of ['{broken', JSON.stringify({ ...first, version: 8 })]) {
    raw = invalid
    assert.equal(writeJsonPathPresets(storage, invalid, empty).ok, false); assert.equal(raw, invalid)
  }
  const quota = new Error('full'); quota.name = 'QuotaExceededError'
  assert.deepEqual(writeJsonPathPresets({ getItem: () => null, setItem: () => { throw quota } }, null, first), { ok: false, error: 'quota' })
  assert.deepEqual(readJsonPathPresets({ getItem: () => { throw new Error('blocked') } }), { ok: false, error: 'unavailable' })
  assert.deepEqual(writeJsonPathPresets({ getItem: () => null, setItem: () => {} }, null, first), { ok: false, error: 'conflict' })
})

check('current jsonpath-plus filter, arrays, recursion, Unicode keys and errors are preserved', () => {
  const input = { store: { book: [{ author: '가', price: 8 }, { author: '나', price: 12 }], bicycle: { price: 20 } }, '한글 이름': 0 }
  const evaluate = (options: { path: string; json: unknown }) => JSONPath(options)
  assert.deepEqual(evaluateSavedJsonPath(input, query, evaluate), ['가'])
  assert.deepEqual(evaluateSavedJsonPath(input, '$..price', evaluate), [8, 12, 20])
  assert.deepEqual(evaluateSavedJsonPath(input, '$["한글 이름"]', evaluate), [0])
  assert.deepEqual(evaluateSavedJsonPath([false, 0, null, ''], '$[*]', evaluate), [false, 0, null, ''])
  assert.deepEqual(evaluateSavedJsonPath(input, '$.missing', evaluate), [])
  assert.throws(() => evaluateSavedJsonPath(input, '$.store.book[?(@.price === )]', evaluate))
})

check('exact root lookup supports falsy valid JSON without rewriting other expressions', () => {
  for (const source of ['false', '0', 'null', '""', 'true', '42', '"문자열"', '[]', '{}']) {
    const value: unknown = JSON.parse(source)
    assert.deepEqual(evaluateSavedJsonPath(value, '$', () => { throw new Error('root selector should not require the broken library branch') }), [value])
  }
  // Document the installed engine limitation, instead of inventing new path semantics.
  for (const value of [false, 0, null, '']) {
    assert.equal(JSONPath({ path: '$.anything', json: value }), undefined)
    assert.throws(() => evaluateSavedJsonPath(value, '$.anything', options => JSONPath(options)), /unsupportedRoot/)
  }
})

const navigatorDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'navigator')
try {
  Object.defineProperty(globalThis, 'navigator', { configurable: true, value: {} })
  assert.equal(await withJsonPathPresetLock(() => 1), 1)
  let calls = 0
  Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { locks: { request: async (key: string, options: { mode: string }, action: () => number) => { assert.equal(key, JSONPATH_PRESETS_KEY); assert.equal(options.mode, 'exclusive'); calls++; return action() } } } })
  assert.equal(await withJsonPathPresetLock(() => 2), 2); assert.equal(calls, 1)
  checks++; console.log('PASS Web Locks and checked fallback')
} finally {
  if (navigatorDescriptor) Object.defineProperty(globalThis, 'navigator', navigatorDescriptor)
  else Reflect.deleteProperty(globalThis, 'navigator')
}
console.log(`JSONPath presets: ${checks} groups passed`)
