// node scripts/check-unit-favorites.ts
import assert from 'node:assert/strict'
import { convert, formatNum } from '../src/utils/units.ts'
import {
  UNIT_FAVORITES_KEY, UNIT_FAVORITE_PRECISIONS, applyUnitFavorite, isUnitFavoritePair, sameUnitFavoritePair,
  isUnitRecent, parseUnitRecent, parseUnitFavorites, readUnitFavorites, writeUnitFavoriteAction,
  type UnitFavoritePair, type UnitFavoritesSnapshot, type UnitFavoriteAction,
} from '../src/utils/unitFavorites.ts'

const pair: UnitFavoritePair = { c: 'length', f: 'm', t: 'ft', p: 10, rb: 16 }
const favorite = { id: 'unit-a', name: '해외 길이', pair }
const encode = (favorites: unknown[], version = 1) => JSON.stringify({ version, favorites })
const memory = (initial: string | null = null) => {
  let raw = initial, writes = 0
  return {
    get raw() { return raw }, get writes() { return writes }, replace(next: string | null) { raw = next },
    getItem(key: string) { assert.equal(key, UNIT_FAVORITES_KEY); return raw },
    setItem(key: string, next: string) { assert.equal(key, UNIT_FAVORITES_KEY); writes++; raw = next },
  }
}
const ready = (snapshot: UnitFavoritesSnapshot) => {
  assert.equal(snapshot.status, 'ready')
  if (snapshot.status !== 'ready') throw new Error('Expected ready snapshot')
  return snapshot
}
const add: UnitFavoriteAction = { kind: 'add', ...favorite }
let count = 0
const check = (name: string, run: () => void) => { run(); count++; console.log(`PASS ${name}`) }

check('empty favorites and recent history are independent empty lists', () => {
  assert.deepEqual(readUnitFavorites(memory()), { status: 'ready', raw: null, favorites: [] })
  assert.deepEqual(parseUnitRecent(null), { status: 'ready', entries: [] })
  assert.equal(UNIT_FAVORITES_KEY === ('unitConverter.recent' as string), false)
})
check('category, both units, precision and rem base persist without input values', () => {
  const storage = memory()
  assert.equal(writeUnitFavoriteAction(readUnitFavorites(storage), add, storage).ok, true)
  assert.deepEqual(ready(readUnitFavorites(storage)).favorites, [favorite])
  assert.deepEqual(Object.keys(JSON.parse(storage.raw!).favorites[0].pair).sort(), ['c', 'f', 'p', 'rb', 't'])
})
check('loading a pair preserves exact current input, even unfinished or invalid input', () => {
  for (const v of ['1,234.500', '1e-9', '', '-', 'bad']) {
    const current = { c: 'weight', f: 'kg', t: 'lb', p: 6, rb: 20, v }
    const restored = applyUnitFavorite(current, pair)
    assert.deepEqual(restored, { ...pair, v })
    assert.equal(current.c, 'weight')
    assert.equal(current.v, v)
  }
  const injected = { ...pair, v: '999' }
  assert.equal(isUnitFavoritePair(injected), false)
  assert.equal(applyUnitFavorite({ v: '7' }, injected).v, '7')
})
check('temperature and reciprocal fuel conversions retain the existing formulas', () => {
  const temp = { ...pair, c: 'temperature', f: 'degC', t: 'degF' } as UnitFavoritePair
  const fuel = { ...pair, c: 'fuel', f: 'kmL', t: 'L100km' } as UnitFavoritePair
  for (const [value, settings, expected] of [[100, temp, 212], [20, fuel, 5]] as const) {
    const saved = ready(parseUnitFavorites(encode([{ ...favorite, pair: settings }]))).favorites[0].pair
    assert.ok(Math.abs(convert(saved.c, saved.f, saved.t, value, { remBase: saved.rb }) - expected) < 1e-9)
  }
})
check('CSS rem base and chosen significant digits survive storage and application', () => {
  const css: UnitFavoritePair = { c: 'css', f: 'px', t: 'rem', p: 4, rb: 20.5 }
  const restored = ready(parseUnitFavorites(encode([{ ...favorite, pair: css }]))).favorites[0].pair
  assert.equal(convert(restored.c, restored.f, restored.t, 41, { remBase: restored.rb }), 2)
  assert.equal(formatNum(1.23456789, restored.p, false), '1.235')
  assert.equal(applyUnitFavorite({ v: '41' }, restored).v, '41')
})
check('traditional overview is excluded but traditional units within a category are allowed', () => {
  assert.equal(isUnitFavoritePair({ ...pair, c: 'traditional', f: '', t: '' }), false)
  assert.equal(isUnitFavoritePair({ ...pair, c: 'area', f: 'pyeong', t: 'm2' }), true)
  assert.equal(isUnitFavoritePair({ ...pair, f: 'ja', t: 'cm' }), true)
})
check('unit pairs require the actual category and supported precision/base values', () => {
  for (const change of [
    { c: 'unknown' }, { c: null }, { f: 'kg' }, { t: 'unknown' }, { f: 3 }, { p: 5 }, { p: 10.5 }, { p: '10' },
    { rb: 0 }, { rb: -1 }, { rb: 1000 }, { rb: Infinity }, { rb: NaN }, { rb: '16' }, { v: '2' },
  ]) assert.equal(isUnitFavoritePair({ ...pair, ...change }), false, JSON.stringify(change))
  for (const key of Object.keys(pair)) {
    const missing = { ...pair } as Record<string, unknown>; delete missing[key]
    assert.equal(isUnitFavoritePair(missing), false, key)
  }
  for (const p of UNIT_FAVORITE_PRECISIONS) assert.equal(isUnitFavoritePair({ ...pair, p }), true)
  assert.equal(isUnitFavoritePair({ ...pair, rb: 0.1 }), true)
  assert.equal(isUnitFavoritePair({ ...pair, rb: 999.9 }), true)
})
check('same conversion conditions cannot be pinned again under another name', () => {
  const storage = memory(encode([favorite]))
  assert.deepEqual(writeUnitFavoriteAction(readUnitFavorites(storage), { ...add, id: 'b', name: '다른 이름' }, storage), { ok: false, error: 'duplicatePair' })
  assert.deepEqual(writeUnitFavoriteAction(readUnitFavorites(storage), { ...add, id: 'b', name: '다른 이름', pair: { ...pair, rb: 20 } }, storage), { ok: false, error: 'duplicatePair' })
  assert.equal(storage.writes, 0)
  assert.equal(sameUnitFavoritePair(pair, { ...pair, f: pair.t, t: pair.f }), false)
  assert.equal(sameUnitFavoritePair(pair, { ...pair, p: 6 }), false)
  const css: UnitFavoritePair = { ...pair, c: 'css', f: 'px', t: 'rem' }
  assert.equal(sameUnitFavoritePair(css, { ...css, rb: 20 }), false)
})
check('empty, long, whitespace-only and control-character names are rejected', () => {
  for (const name of ['', '  ', '가'.repeat(41), '길이\n변환', 'a\u0000b']) {
    const storage = memory()
    assert.deepEqual(writeUnitFavoriteAction(readUnitFavorites(storage), { ...add, name }, storage), { ok: false, error: 'invalidName' })
    assert.equal(storage.raw, null)
  }
})
check('40-character trimmed names are accepted and normalized duplicate names are rejected', () => {
  const storage = memory()
  assert.equal(writeUnitFavoriteAction(readUnitFavorites(storage), { ...add, name: ` ${'가'.repeat(40)} ` }, storage).ok, true)
  assert.equal(ready(readUnitFavorites(storage)).favorites[0].name, '가'.repeat(40))
  const duplicate = memory(encode([{ ...favorite, name: 'Length' }]))
  assert.deepEqual(writeUnitFavoriteAction(readUnitFavorites(duplicate), { ...add, id: 'b', name: 'ＬＥＮＧＴＨ', pair: { ...pair, p: 6 } }, duplicate), { ok: false, error: 'duplicateName' })
})
check('twelve unique pairs survive a thirteenth attempt and deletion frees a slot', () => {
  const favorites = [false, true].flatMap((reverse) => UNIT_FAVORITE_PRECISIONS.map((p) => ({ ...favorite, id: `u-${reverse}-${p}`, name: `단위 ${reverse} ${p}`, pair: { ...pair, p, f: reverse ? 'ft' : 'm', t: reverse ? 'm' : 'ft' } })))
  const storage = memory(encode(favorites))
  const extra: UnitFavoriteAction = { ...add, pair: { ...pair, c: 'weight', f: 'kg', t: 'lb' } }
  const before = storage.raw
  assert.deepEqual(writeUnitFavoriteAction(readUnitFavorites(storage), extra, storage), { ok: false, error: 'limit' })
  assert.equal(storage.raw, before)
  assert.equal(writeUnitFavoriteAction(readUnitFavorites(storage), { kind: 'delete', id: favorites[0].id }, storage).ok, true)
  assert.equal(writeUnitFavoriteAction(readUnitFavorites(storage), extra, storage).ok, true)
  assert.equal(ready(readUnitFavorites(storage)).favorites.length, 12)
})
check('rename/delete preserve conversion settings and cannot mutate missing entries', () => {
  const storage = memory(encode([favorite]))
  assert.equal(writeUnitFavoriteAction(readUnitFavorites(storage), { kind: 'rename', id: favorite.id, name: '새 이름' }, storage).ok, true)
  assert.deepEqual(ready(readUnitFavorites(storage)).favorites, [{ ...favorite, name: '새 이름' }])
  assert.deepEqual(writeUnitFavoriteAction(readUnitFavorites(storage), { kind: 'rename', id: 'missing', name: '다른 이름' }, storage), { ok: false, error: 'missingFavorite' })
  assert.deepEqual(writeUnitFavoriteAction(readUnitFavorites(storage), { kind: 'delete', id: 'missing' }, storage), { ok: false, error: 'missingFavorite' })
  assert.equal(writeUnitFavoriteAction(readUnitFavorites(storage), { kind: 'delete', id: favorite.id }, storage).ok, true)
  assert.deepEqual(ready(readUnitFavorites(storage)).favorites, [])
})
check('damaged lists and unknown fields are preserved without dropping rows', () => {
  const invalid = ['', '{', 'null', '[]', '{}', encode([favorite, favorite]), encode([{ ...favorite, id: '' }]),
    encode([{ ...favorite, pair: { ...pair, v: '55' } }]), encode([{ ...favorite, pair: { ...pair, c: 'fake' } }]),
    encode([{ ...favorite, name: ' x' }]), encode([{ ...favorite, value: '5' }]),
    JSON.stringify({ version: 1, favorites: [favorite], extra: true }), ' '.repeat(100001)]
  for (const raw of invalid) {
    const storage = memory(raw)
    assert.equal(readUnitFavorites(storage).status, 'invalidData')
    assert.deepEqual(writeUnitFavoriteAction(readUnitFavorites(storage), add, storage), { ok: false, error: 'invalidData' })
    assert.equal(storage.raw, raw)
    assert.equal(storage.writes, 0)
  }
})
check('unsupported versions stay untouched even when their structure differs', () => {
  const raw = JSON.stringify({ version: 2, pinned: [favorite] })
  const storage = memory(raw)
  assert.equal(readUnitFavorites(storage).status, 'unsupportedVersion')
  assert.deepEqual(writeUnitFavoriteAction(readUnitFavorites(storage), add, storage), { ok: false, error: 'unsupportedVersion' })
  assert.equal(storage.raw, raw)
})
check('stale tabs cannot add, rename or delete over a newer saved list', () => {
  const storage = memory(encode([favorite]))
  const stale = readUnitFavorites(storage)
  assert.equal(writeUnitFavoriteAction(readUnitFavorites(storage), { kind: 'rename', id: favorite.id, name: '다른 탭 이름' }, storage).ok, true)
  const newer = storage.raw
  for (const action of [add, { kind: 'rename', id: favorite.id, name: '오래된 이름' }, { kind: 'delete', id: favorite.id }] as UnitFavoriteAction[]) {
    assert.deepEqual(writeUnitFavoriteAction(stale, action, storage), { ok: false, error: 'conflict' })
    assert.equal(storage.raw, newer)
  }
})
check('a newer corrupt or future-format list blocks writes from an earlier healthy view', () => {
  for (const [raw, error] of [['{', 'invalidData'], [encode([favorite], 2), 'unsupportedVersion']] as const) {
    const storage = memory(); const stale = readUnitFavorites(storage); storage.replace(raw)
    assert.deepEqual(writeUnitFavoriteAction(stale, add, storage), { ok: false, error })
    assert.equal(storage.raw, raw)
  }
})
check('storage denial and quota failure never display success or discard data', () => {
  const storage = memory()
  assert.deepEqual(readUnitFavorites({ ...storage, getItem() { throw new Error('SecurityError') } }), { status: 'unavailable' })
  assert.deepEqual(writeUnitFavoriteAction(readUnitFavorites(storage), add, { ...storage, setItem() { throw new Error('QuotaExceededError') } }), { ok: false, error: 'unavailable' })
  assert.equal(storage.raw, null)
})
check('readback detects ineffective writes and an intervening writer', () => {
  const storage = memory()
  assert.deepEqual(writeUnitFavoriteAction(readUnitFavorites(storage), add, { ...storage, setItem() {} }), { ok: false, error: 'conflict' })
  const external = encode([{ ...favorite, name: '외부' }])
  assert.deepEqual(writeUnitFavoriteAction(readUnitFavorites(storage), add, { ...storage, setItem() { storage.replace(external) } }), { ok: false, error: 'conflict' })
  assert.equal(storage.raw, external)
})
check('valid recent entries retain values and do not become pinned conditions', () => {
  const entries = [{ c: 'css', f: 'px', t: 'rem', v: '1,234.5' }, { c: 'temperature', f: 'degC', t: 'degF', v: '-20' }]
  assert.deepEqual(parseUnitRecent(JSON.stringify(entries)), { status: 'ready', entries })
  assert.equal(isUnitFavoritePair(entries[0]), false)
  assert.equal(isUnitRecent(pair), false)
})
check('malformed recent values, categories and unit pairs are rejected before UI use', () => {
  const base = { c: 'length', f: 'm', t: 'ft', v: '1' }
  for (const change of [{ c: 'bad' }, { c: 'traditional' }, { f: 'kg' }, { t: 'bad' }, { v: 7 }, { v: {} }, { v: null }, { v: '' }, { v: 'Infinity' }, { v: 'bad' }, { v: '0'.repeat(1001) }]) {
    const item = { ...base, ...change }
    assert.equal(isUnitRecent(item), false, JSON.stringify(change))
    assert.deepEqual(parseUnitRecent(JSON.stringify([base, item])), { status: 'invalidData' })
  }
  for (const raw of ['{', '{}', 'null', JSON.stringify(Array(9).fill(base))]) assert.deepEqual(parseUnitRecent(raw), { status: 'invalidData' })
})

console.log(`${count} unit favorite checks passed`)
