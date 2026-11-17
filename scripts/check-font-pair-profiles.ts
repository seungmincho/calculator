import assert from 'node:assert/strict'
import { createFontPair, fontPairCss, fontPairShareUrl, readFontPair, swapFontPair } from '../src/utils/fontPairing.ts'
import {
  FONT_PAIR_PROFILES_KEY, applyFontPairStyles, fontPairStyles, isFontPairStyles,
  parseFontPairProfiles, readFontPairProfiles, withFontPairProfilesLock, writeFontPairProfileAction,
  type FontPairProfileAction, type FontPairProfilesSnapshot,
} from '../src/utils/fontPairProfiles.ts'

let count = 0
const check = async (name: string, run: () => void | Promise<void>) => { await run(); count++; console.log(`PASS ${name}`) }
const pair = createFontPair('저장하면 안 되는 제목', '비공개 본문\n두 번째 줄')
const styles = fontPairStyles(pair)
const entry = { id: 'first', name: '문서', styles }
const encode = (profiles: unknown[]) => JSON.stringify({ version: 1, profiles })
const memory = (initial: string | null = null) => {
  let raw = initial
  return { get raw() { return raw }, replace(value: string | null) { raw = value }, getItem(key: string) { assert.equal(key, FONT_PAIR_PROFILES_KEY); return raw }, setItem(key: string, value: string) { assert.equal(key, FONT_PAIR_PROFILES_KEY); raw = value } }
}
const add: FontPairProfileAction = { kind: 'add', ...entry }
const ready = (snapshot: FontPairProfilesSnapshot) => { assert.equal(snapshot.status, 'ready'); if (snapshot.status !== 'ready') throw new Error(snapshot.status); return snapshot }

await check('saving projects only the six style values, never manuscript/runtime font data', () => {
  assert.deepEqual(Object.keys(styles.title).sort(), ['fontId', 'size', 'weight'])
  const storage = memory(), saved = writeFontPairProfileAction(readFontPairProfiles(storage), add, storage)
  assert.equal(saved.ok, true)
  assert.equal(storage.raw, encode([entry]))
  assert.ok(!storage.raw!.includes(pair.title.text) && !storage.raw!.includes(pair.body.text))
  assert.deepEqual(ready(readFontPairProfiles(storage)).profiles[0].styles, styles)
})

await check('load preserves current text including empty and multiline input without mutation', () => {
  const current = createFontPair('', '사용 중인 원고\n😀')
  const snapshot = JSON.stringify(current)
  const selected = { title: { fontId: 'gowun-dodum', size: 96, weight: 900 }, body: { fontId: 'noto-serif-kr', size: 40, weight: 100 } }
  const applied = applyFontPairStyles(current, selected)!
  assert.equal(applied.title.text, '')
  assert.equal(applied.body.text, current.body.text)
  assert.deepEqual(fontPairStyles(applied), selected)
  assert.equal(JSON.stringify(current), snapshot)
  assert.equal(selected.title.weight, 900, 'requested weights retain existing nearest-supported display behavior')
})

await check('known catalog IDs and exact role-specific integer sizes/weight choices are required', () => {
  for (const role of ['title', 'body'] as const) {
    const min = role === 'title' ? 16 : 12, max = role === 'title' ? 96 : 40
    for (const size of [min, max]) assert.ok(isFontPairStyles({ ...styles, [role]: { ...styles[role], size } }))
    for (const size of [min - 1, max + 1, min + 0.5, '36', null, Infinity]) assert.equal(isFontPairStyles({ ...styles, [role]: { ...styles[role], size } }), false)
    for (const weight of [0, 99, 450, 901, '400', NaN]) assert.equal(isFontPairStyles({ ...styles, [role]: { ...styles[role], weight } }), false)
    for (const fontId of ['', 'removed-font', '__proto__', 'constructor']) assert.equal(isFontPairStyles({ ...styles, [role]: { ...styles[role], fontId } }), false)
  }
})

await check('text/file/unknown fields cannot sneak into a style or stored envelope', () => {
  const invalid = [
    { ...styles, title: { ...styles.title, text: 'private' } },
    { ...styles, body: { ...styles.body, file: 'font binary' } },
    { ...styles, extra: true }, { title: styles.title },
  ]
  for (const value of invalid) {
    assert.equal(isFontPairStyles(value), false)
    assert.equal(applyFontPairStyles(pair, value), null)
    assert.equal(parseFontPairProfiles(encode([{ ...entry, styles: value }])).status, 'invalidData')
  }
  assert.equal(parseFontPairProfiles(JSON.stringify({ version: 1, profiles: [entry], text: 'private' })).status, 'invalidData')
  assert.equal(parseFontPairProfiles(encode([{ ...entry, text: 'private' }])).status, 'invalidData')
})

await check('one bad entry rejects the whole list and never repairs/overwrites the raw data', () => {
  for (const raw of ['{', '[]', encode([entry, { ...entry, id: 'bad', styles: { ...styles, title: { ...styles.title, fontId: 'unknown' } } }]), 'x'.repeat(20_001)]) {
    const storage = memory(raw), before = storage.raw
    const snapshot = readFontPairProfiles(storage)
    assert.equal(snapshot.status, 'invalidData')
    assert.deepEqual(writeFontPairProfileAction(snapshot, add, storage), { ok: false, error: 'invalidData' })
    assert.equal(storage.raw, before)
  }
})

await check('future storage is protected instead of being reset to an empty list', () => {
  const raw = JSON.stringify({ version: 2, profiles: [entry] }), storage = memory(raw)
  assert.equal(readFontPairProfiles(storage).status, 'unsupportedVersion')
  assert.deepEqual(writeFontPairProfileAction(readFontPairProfiles(storage), add, storage), { ok: false, error: 'unsupportedVersion' })
  assert.equal(storage.raw, raw)
})

await check('name trim/40-character boundary and normalized duplicates are explicit', () => {
  const storage = memory()
  assert.equal(writeFontPairProfileAction(readFontPairProfiles(storage), { ...add, name: ` ${'가'.repeat(40)} ` }, storage).ok, true)
  for (const name of ['', ' ', '가'.repeat(41), '제목\n본문', '\u0000']) {
    assert.deepEqual(writeFontPairProfileAction(readFontPairProfiles(storage), { ...add, id: 'another', name }, storage), { ok: false, error: 'invalidName' })
  }
  const duplicate = memory(encode([{ ...entry, name: 'Ａ' }]))
  assert.deepEqual(writeFontPairProfileAction(readFontPairProfiles(duplicate), { ...add, id: 'other', name: 'a' }, duplicate), { ok: false, error: 'duplicateName' })
})

await check('duplicate IDs/names and oversized stored lists reject without dropping records', () => {
  for (const profiles of [[entry, { ...entry, name: '다른 이름' }], [entry, { ...entry, id: 'different' }], Array.from({ length: 7 }, (_, index) => ({ ...entry, id: `id${index}`, name: `name${index}` }))]) assert.equal(parseFontPairProfiles(encode(profiles)).status, 'invalidData')
})

await check('six saves succeed, a seventh is atomic, deletion frees only its own entry', () => {
  const storage = memory()
  for (let index = 0; index < 6; index++) assert.equal(writeFontPairProfileAction(readFontPairProfiles(storage), { ...add, id: `id${index}`, name: `name${index}` }, storage).ok, true)
  const full = storage.raw
  assert.deepEqual(writeFontPairProfileAction(readFontPairProfiles(storage), add, storage), { ok: false, error: 'limit' })
  assert.equal(storage.raw, full)
  assert.equal(writeFontPairProfileAction(readFontPairProfiles(storage), { kind: 'delete', id: 'id2' }, storage).ok, true)
  assert.deepEqual(ready(readFontPairProfiles(storage)).profiles.map(profile => profile.id), ['id0', 'id1', 'id3', 'id4', 'id5'])
  assert.equal(writeFontPairProfileAction(readFontPairProfiles(storage), add, storage).ok, true)
})

await check('stale snapshots cannot add or delete another tab changes', () => {
  const storage = memory(), stale = readFontPairProfiles(storage)
  assert.equal(writeFontPairProfileAction(stale, add, storage).ok, true)
  const latest = storage.raw
  for (const action of [{ ...add, id: 'second', name: '다른 스타일' }, { kind: 'delete', id: entry.id }] as FontPairProfileAction[]) assert.deepEqual(writeFontPairProfileAction(stale, action, storage), { ok: false, error: 'conflict' })
  assert.equal(storage.raw, latest)
})

await check('new corruption or a future version appearing after read cannot be overwritten', () => {
  for (const raw of ['{', JSON.stringify({ version: 8, profiles: [] })]) {
    const storage = memory(), snapshot = readFontPairProfiles(storage)
    storage.replace(raw)
    assert.equal(writeFontPairProfileAction(snapshot, add, storage).ok, false)
    assert.equal(storage.raw, raw)
  }
})

await check('quota/read/write blocking never reports success or clears the original list', () => {
  const storage = memory(encode([entry])), snapshot = readFontPairProfiles(storage), before = storage.raw
  for (const name of ['QuotaExceededError', 'SecurityError']) {
    const blocked = { ...storage, setItem() { const error = new Error(name); error.name = name; throw error } }
    assert.deepEqual(writeFontPairProfileAction(snapshot, { kind: 'delete', id: entry.id }, blocked), { ok: false, error: name === 'QuotaExceededError' ? 'quota' : 'unavailable' })
    assert.equal(storage.raw, before)
  }
  const unreadable = { ...storage, getItem() { throw new Error('blocked') } }
  assert.equal(readFontPairProfiles(unreadable).status, 'unavailable')
  assert.deepEqual(writeFontPairProfileAction(snapshot, add, unreadable), { ok: false, error: 'unavailable' })
})

await check('readback detects ignored or intervening writes and does not roll back external data', () => {
  const storage = memory(), snapshot = readFontPairProfiles(storage)
  assert.deepEqual(writeFontPairProfileAction(snapshot, add, { ...storage, setItem() {} }), { ok: false, error: 'conflict' })
  const external = encode([{ ...entry, name: '외부 변경' }])
  assert.deepEqual(writeFontPairProfileAction(snapshot, add, { ...storage, setItem() { storage.replace(external) } }), { ok: false, error: 'conflict' })
  assert.equal(storage.raw, external)
})

await check('unknown action and missing delete targets cannot accidentally delete a profile', () => {
  const storage = memory(encode([entry])), snapshot = readFontPairProfiles(storage), before = storage.raw
  assert.deepEqual(writeFontPairProfileAction(snapshot, { kind: 'replace', id: entry.id } as unknown as FontPairProfileAction, storage), { ok: false, error: 'invalidAction' })
  assert.deepEqual(writeFontPairProfileAction(snapshot, { kind: 'delete', id: 'missing' }, storage), { ok: false, error: 'missingProfile' })
  assert.equal(storage.raw, before)
})

await check('Web Locks serialize competing saves while CAS rejects their stale snapshots', async () => {
  const original = Object.getOwnPropertyDescriptor(globalThis, 'navigator')
  let tail = Promise.resolve(), calls = 0
  Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { locks: { request: async (key: string, action: () => unknown) => {
    assert.equal(key, FONT_PAIR_PROFILES_KEY); calls++
    const next = tail.then(action)
    tail = next.then(() => undefined, () => undefined)
    return next
  } } } })
  try {
    const storage = memory(), snapshot = readFontPairProfiles(storage)
    const results = await Promise.all([
      withFontPairProfilesLock(() => writeFontPairProfileAction(snapshot, add, storage)),
      withFontPairProfilesLock(() => writeFontPairProfileAction(snapshot, { ...add, id: 'second', name: '둘째' }, storage)),
    ])
    assert.equal(results.filter(result => result.ok).length, 1)
    assert.deepEqual(results[1], { ok: false, error: 'conflict' })
    assert.equal(calls, 2)
    Object.defineProperty(globalThis, 'navigator', { configurable: true, value: {} })
    assert.equal(await withFontPairProfilesLock(() => 42), 42)
  } finally {
    if (original) Object.defineProperty(globalThis, 'navigator', original)
    else Reflect.deleteProperty(globalThis, 'navigator')
  }
})

await check('shared URL restore stays separate, manual load keeps shared text and CSS/swap still use styles', () => {
  const fromUrl = readFontPair(new URLSearchParams('pair=1&pairTitleFont=pretendard&pairTitleText=공유제목&pairBodyText=공유본문'), pair)
  const storage = memory(encode([entry]))
  readFontPairProfiles(storage)
  assert.equal(fromUrl.title.fontId, 'pretendard')
  const loaded = applyFontPairStyles(fromUrl, styles)!
  assert.equal(loaded.title.text, '공유제목'); assert.equal(loaded.body.text, '공유본문')
  assert.ok(fontPairCss(loaded).includes('font-size: 36px;'))
  const shared = fontPairShareUrl('https://example.test/font-preview/?view=pair', loaded)
  assert.equal(shared.ok, true)
  if (shared.ok) assert.deepEqual(readFontPair(new URL(shared.url).searchParams, pair), loaded)
  const swapped = swapFontPair(loaded)
  assert.equal(swapped.title.fontId, loaded.body.fontId)
  assert.equal(swapped.title.text, loaded.title.text)
  assert.equal(swapped.body.text, loaded.body.text)
})

console.log(`${count} font pair profile checks passed`)
