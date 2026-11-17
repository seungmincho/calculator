import assert from 'node:assert/strict'
import { FONTS } from '../../../src/utils/fontPreview.ts'
import { createFontPair, PAIR_WEIGHTS, appliedPairWeight } from '../../../src/utils/fontPairing.ts'
import { FONT_PAIR_PROFILES_KEY, applyFontPairStyles, fontPairStyles, isFontPairStyles, parseFontPairProfiles, readFontPairProfiles, writeFontPairProfileAction } from '../../../src/utils/fontPairProfiles.ts'

let count = 0
const check = (name: string, action: () => void) => { action(); count++; console.log(`PASS ${name}`) }
const manuscript = createFontPair('현재 제목 😀\n', ' 현재 원고\n\r\n가나다😀 ')
const styles = fontPairStyles(manuscript)
const profile = (id = 'profile-1', name = '문서 제목') => ({ id, name, styles: structuredClone(styles) })
const encode = (profiles: unknown[], version = 1) => JSON.stringify({ version, profiles })
const memory = (initial: string | null = null) => {
  let raw = initial, writes = 0
  return { get raw() { return raw }, get writes() { return writes }, replace(value: string | null) { raw = value },
    getItem(key: string) { assert.equal(key, FONT_PAIR_PROFILES_KEY); return raw },
    setItem(key: string, value: string) { assert.equal(key, FONT_PAIR_PROFILES_KEY); writes++; raw = value },
  }
}

check('all catalog fonts and requested weights roundtrip without altering current manuscript', () => {
  let combinations = 0
  for (const font of FONTS) for (const weight of PAIR_WEIGHTS) {
    const saved = { title: { fontId: font.id, size: 96, weight }, body: { fontId: font.id, size: 12, weight } }
    assert.ok(isFontPairStyles(saved))
    const state = parseFontPairProfiles(encode([{ id: 'one', name: '스타일', styles: saved }]))
    assert.equal(state.status, 'ready')
    const loaded = applyFontPairStyles(manuscript, saved)!
    assert.equal(loaded.title.text, manuscript.title.text); assert.equal(loaded.body.text, manuscript.body.text)
    assert.equal(loaded.title.weight, weight); assert.ok(font.weights.includes(appliedPairWeight(loaded.title)))
    combinations++
  }
  assert.equal(combinations, FONTS.length * PAIR_WEIGHTS.length)
  console.log(`  ${combinations} catalog/weight combinations`)
})
check('explicit style projection excludes text and all future runtime metadata', () => {
  const pair = { title: { ...manuscript.title, file: 'PRIVATE-FONT', extra: true }, body: { ...manuscript.body, blobUrl: 'blob:private' } }
  const projected = fontPairStyles(pair)
  assert.deepEqual(projected, styles)
  const storage = memory()
  assert.equal(writeFontPairProfileAction(readFontPairProfiles(storage), { kind: 'add', id: 'one', name: '문서', styles: projected }, storage).ok, true)
  assert.equal(storage.raw!.includes(manuscript.title.text), false); assert.equal(storage.raw!.includes('PRIVATE'), false); assert.equal(storage.raw!.includes('text'), false)
})
check('foreign/local IDs, invalid sizes/weights and text injection reject the whole snapshot', () => {
  const patches = [
    { fontId: 'local-font' }, { fontId: '__proto__' }, { fontId: 'NOTO-SERIF-KR' },
    { size: 15 }, { size: 97 }, { size: 16.5 }, { size: '36' }, { size: Infinity },
    { weight: 450 }, { weight: 0 }, { weight: 1000 }, { weight: '700' }, { text: 'private text' },
  ]
  for (const patch of patches) {
    const changed = { ...styles, title: { ...styles.title, ...patch } }
    assert.equal(isFontPairStyles(changed), false)
    assert.equal(applyFontPairStyles(manuscript, changed), null)
    assert.equal(parseFontPairProfiles(encode([{ ...profile(), styles: changed }])).status, 'invalidData')
  }
  for (const size of [11, 41, NaN]) assert.equal(isFontPairStyles({ ...styles, body: { ...styles.body, size } }), false)
})
check('exact schema rejects extra root/profile/style fields, duplicate IDs and future versions', () => {
  const valid = profile()
  for (const raw of [JSON.stringify({ version: 1, profiles: [valid], text: 'private' }), encode([{ ...valid, text: 'private' }]), encode([{ ...valid, styles: { ...styles, text: 'private' } }]), encode([valid, { ...profile('two', '다른 제목'), id: valid.id }])]) assert.equal(parseFontPairProfiles(raw).status, 'invalidData')
  assert.equal(parseFontPairProfiles(encode([valid], 2)).status, 'unsupportedVersion')
})
check('six profiles and forty-character names are accepted; seven or forty-one reject atomically', () => {
  const six = Array.from({ length: 6 }, (_, n) => profile(`p${n}`, `${n}${'가'.repeat(39)}`))
  const storage = memory(encode(six)), before = storage.raw
  assert.equal(readFontPairProfiles(storage).status, 'ready')
  assert.deepEqual(writeFontPairProfileAction(readFontPairProfiles(storage), { kind: 'add', ...profile('extra', '새 조합') }, storage), { ok: false, error: 'limit' })
  assert.equal(storage.raw, before); assert.equal(storage.writes, 0)
  assert.equal(parseFontPairProfiles(encode([...six, profile('extra', '새 조합')])).status, 'invalidData')
  assert.equal(parseFontPairProfiles(encode([profile('long', '가'.repeat(41))])).status, 'invalidData')
})
check('NFKC/case duplicate names never overwrite existing profile', () => {
  const storage = memory(encode([profile('existing', 'ＡＢＣ')]))
  const before = storage.raw
  assert.deepEqual(writeFontPairProfileAction(readFontPairProfiles(storage), { kind: 'add', ...profile('next', 'abc') }, storage), { ok: false, error: 'duplicateName' })
  assert.equal(storage.raw, before); assert.equal(storage.writes, 0)
})
check('stale deletion/addition and newly corrupt storage do not write', () => {
  const storage = memory(encode([profile()])), snapshot = readFontPairProfiles(storage)
  storage.replace(encode([profile('newer', '다른 탭 조합')]))
  const latest = storage.raw
  for (const action of [{ kind: 'delete' as const, id: 'profile-1' }, { kind: 'add' as const, ...profile('new', '새 조합') }]) assert.deepEqual(writeFontPairProfileAction(snapshot, action, storage), { ok: false, error: 'conflict' })
  assert.equal(storage.raw, latest); assert.equal(storage.writes, 0)
  storage.replace('{bad')
  assert.deepEqual(writeFontPairProfileAction(snapshot, { kind: 'delete', id: 'profile-1' }, storage), { ok: false, error: 'invalidData' })
  assert.equal(storage.raw, '{bad')
})
check('quota and pre-write access failures preserve prior raw data', () => {
  const storage = memory(encode([profile()])), before = storage.raw, snapshot = readFontPairProfiles(storage)
  const quota = new Error('Full'); quota.name = 'QuotaExceededError'
  assert.deepEqual(writeFontPairProfileAction(snapshot, { kind: 'delete', id: 'profile-1' }, { getItem: storage.getItem, setItem() { throw quota } }), { ok: false, error: 'quota' })
  assert.equal(storage.raw, before)
  assert.deepEqual(readFontPairProfiles({ getItem() { throw new Error('Denied') }, setItem: storage.setItem }), { status: 'unavailable' })
})
check('post-write readback mismatch/failure never claims success or rolls back an unknown outcome', () => {
  const initial = encode([profile()])
  for (const mode of ['mismatch', 'throw']) {
    let reads = 0, raw = initial, writes = 0
    const result = writeFontPairProfileAction(parseFontPairProfiles(initial), { kind: 'delete', id: 'profile-1' }, {
      getItem() { reads++; if (reads > 1) { if (mode === 'throw') throw new Error('Read blocked'); return 'changed-after-write' } return raw },
      setItem(_key, value) { writes++; raw = value },
    })
    assert.equal(result.ok, false); assert.equal(writes, 1); assert.equal(raw, encode([]))
  }
})
check('deletion removes exactly the chosen profile and does not apply another style', () => {
  const storage = memory(encode([profile('a', 'A'), profile('b', 'B'), profile('c', 'C')]))
  const result = writeFontPairProfileAction(readFontPairProfiles(storage), { kind: 'delete', id: 'b' }, storage)
  assert.ok(result.ok)
  if (result.ok) assert.deepEqual(result.snapshot.profiles.map(value => value.id), ['a', 'c'])
  assert.equal(manuscript.title.text, '현재 제목 😀\n')
})
console.log(`Independent font profiles: ${count} domain groups passed`)
