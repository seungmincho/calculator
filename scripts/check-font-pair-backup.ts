import assert from 'node:assert/strict'
import { createFontPair, appliedPairWeight } from '../src/utils/fontPairing.ts'
import { FONT_PAIR_PROFILES_KEY, fontPairStyles, parseFontPairProfiles, readFontPairProfiles, type FontPairProfile } from '../src/utils/fontPairProfiles.ts'
import { FONT_PAIR_BACKUP_APP, FONT_PAIR_BACKUP_MAX_BYTES, createFontPairBackup, parseFontPairBackup, inspectFontPairImport, importFontPairBackup, createFontPairBackupReader, type FontPairBackup } from '../src/utils/fontPairBackup.ts'

const style = fontPairStyles(createFontPair('PRIVATE TITLE', 'PRIVATE BODY'))
const profile = (id: string, name = id): FontPairProfile => ({ id, name, styles: structuredClone(style) })
const encode = (profiles: FontPairProfile[]) => JSON.stringify({ version: 1, profiles })
const wrapper = (profiles: FontPairProfile[]) => ({ app: FONT_PAIR_BACKUP_APP, version: 1, exportedAt: '2026-11-17T00:00:00.000Z', profiles })
const parsed = (profiles = [profile('source')]): FontPairBackup => {
  const result = parseFontPairBackup(JSON.stringify(wrapper(profiles)))
  assert.equal(result.ok, true); if (!result.ok) throw new Error(result.error); return result.backup
}
const selection = (backup: FontPairBackup) => backup.profiles.map(item => ({ sourceId: item.id, name: item.name }))
const memory = (initial: string | null = null) => {
  let raw = initial, writes = 0
  return { get raw() { return raw }, get writes() { return writes }, replace(value: string | null) { raw = value },
    getItem(key: string) { assert.equal(key, FONT_PAIR_PROFILES_KEY); return raw },
    setItem(key: string, value: string) { assert.equal(key, FONT_PAIR_PROFILES_KEY); writes++; raw = value } }
}
let groups = 0
async function test(name: string, run: () => void | Promise<void>) { await run(); groups++; console.log('PASS', name) }

await test('maximum self backup preserves requested styles and excludes manuscript and runtime fields', () => {
  const entries = Array.from({ length: 6 }, (_, i) => ({ ...profile(`${i}`.padEnd(80, 'x'), '\uD800'.repeat(39) + i),
    styles: { title: { fontId: 'black-and-white-picture', size: 96, weight: 900 }, body: { fontId: 'black-and-white-picture', size: 40, weight: 900 } } }))
  const snapshot = parseFontPairProfiles(encode(entries)); assert.equal(snapshot.status, 'ready')
  if (snapshot.status !== 'ready') throw new Error(snapshot.status)
  // Export reads the validated raw rather than an independently mutated view.
  snapshot.profiles[0].name = 'PRIVATE TITLE'
  const backup = createFontPairBackup(snapshot, '2026-11-17T00:00:00.000Z')
  assert.equal(backup.ok, true); if (!backup.ok) throw new Error(backup.error)
  assert.equal(backup.count, 6); assert.ok(Buffer.byteLength(backup.text) < FONT_PAIR_BACKUP_MAX_BYTES)
  assert.ok(!backup.text.includes('PRIVATE')); assert.deepEqual(JSON.parse(backup.text).profiles, entries)
  const reread = parseFontPairBackup(backup.text); assert.equal(reread.ok, true)
  if (!reread.ok) throw new Error(reread.error)
  assert.equal(reread.backup.profiles[0].styles.title.weight, 900)
  assert.notEqual(appliedPairWeight({ ...entries[0].styles.title, text: '' }), 900)
  assert.ok(Object.isFrozen(reread.backup) && Object.isFrozen(reread.backup.profiles) && Object.isFrozen(reread.backup.profiles[0].styles.title))
})
await test('strict wrapper, future version, catalog, unknown fields and names fail as a whole', () => {
  const valid = wrapper([profile('a')])
  const cases = [null, [], { ...valid, app: 'other' }, { ...valid, version: 2 }, { ...valid, exportedAt: 'yesterday' },
    { ...valid, exportedAt: '2026-02-30T00:00:00.000Z' }, { ...valid, privateText: 'secret' },
    { ...valid, profiles: [profile('a'), profile('a', 'other')] }, { ...valid, profiles: [profile('a', 'Ａ'), profile('b', 'a')] },
    { ...valid, profiles: [profile('a', ' padded ')] }, { ...valid, profiles: [profile('a', 'x'.repeat(41))] },
    { ...valid, profiles: [{ ...profile('a'), styles: { ...style, title: { ...style.title, fontId: 'file:///private.woff' } } }] },
    { ...valid, profiles: [{ ...profile('a'), styles: { ...style, body: { ...style.body, text: 'secret' } } }] }]
  for (const value of cases) assert.equal(parseFontPairBackup(JSON.stringify(value)).ok, false)
  assert.deepEqual(parseFontPairBackup(JSON.stringify({ ...valid, version: 2 })), { ok: false, error: 'unsupportedVersion' })
  assert.equal(parseFontPairBackup('\uFEFF' + JSON.stringify(valid)).ok, true)
})
await test('UTF8 file limit is exact, checked before decoding and independent of storage limit', async () => {
  const raw = JSON.stringify(wrapper([profile('a')])), exact = raw + ' '.repeat(FONT_PAIR_BACKUP_MAX_BYTES - Buffer.byteLength(raw))
  assert.equal(parseFontPairBackup(exact).ok, true)
  assert.deepEqual(parseFontPairBackup(exact + ' '), { ok: false, error: 'tooLarge' })
  const wide = JSON.stringify({ ...wrapper([profile('a')]), extra: '가'.repeat(23000) })
  assert.ok(wide.length < FONT_PAIR_BACKUP_MAX_BYTES); assert.deepEqual(parseFontPairBackup(wide), { ok: false, error: 'tooLarge' })
  let reads = 0
  const reader = createFontPairBackupReader()
  assert.deepEqual(await reader.read({ size: FONT_PAIR_BACKUP_MAX_BYTES + 1, text: async () => { reads++; return raw } }), { ok: false, error: 'tooLarge' })
  assert.equal(reads, 0)
})
await test('selection previews every name collision, permits deselection/rename, rejects no choice and slots', () => {
  const snapshot = parseFontPairProfiles(encode([profile('old', 'Ａ')])), backup = parsed([profile('one', 'a'), profile('two', 'B')])
  assert.deepEqual(inspectFontPairImport(snapshot, backup, []), { ok: false, error: 'emptySelection', rows: [] })
  const duplicate = inspectFontPairImport(snapshot, backup, [{ sourceId: 'one', name: 'b' }, { sourceId: 'two', name: 'Ｂ' }])
  assert.equal(duplicate.ok, false); if (duplicate.ok) throw new Error('unexpected')
  assert.deepEqual(duplicate.rows, [{ sourceId: 'one', error: 'duplicateName' }, { sourceId: 'two', error: 'duplicateName' }])
  assert.equal(inspectFontPairImport(snapshot, backup, selection(backup)).ok, false)
  assert.equal(inspectFontPairImport(snapshot, backup, [{ sourceId: 'one', name: ' new name ' }]).ok, true)
  assert.equal(inspectFontPairImport(snapshot, backup, [{ sourceId: 'one', name: '\n' }]).ok, false)
  assert.equal(inspectFontPairImport(snapshot, backup, [{ sourceId: 'missing', name: 'new' }]).ok, false)
  assert.equal(inspectFontPairImport(snapshot, backup, [...selection(backup), ...selection(backup)]).ok, false)
  const full = parseFontPairProfiles(encode(Array.from({ length: 6 }, (_, i) => profile(`old${i}`))))
  assert.deepEqual(inspectFontPairImport(full, backup, selection(backup)), { ok: false, error: 'limit', rows: [] })
})
await test('one append preserves old rows, gives every imported row new unique IDs, and never edits current styles', async () => {
  const storage = memory(encode([profile('old')])), backup = parsed([profile('source'), profile('imported-profile')])
  let confirms = 0
  const result = await importFontPairBackup(readFontPairProfiles(storage), backup, selection(backup), { storage, id: () => 'source', onConfirmed: value => { confirms++; assert.equal(value.raw, storage.raw) } })
  assert.equal(result.ok, true); if (!result.ok) throw new Error(result.error)
  assert.equal(result.added, 2); assert.equal(storage.writes, 1); assert.equal(confirms, 1)
  assert.deepEqual(result.snapshot.profiles[0], profile('old'))
  assert.deepEqual(result.snapshot.profiles.slice(1).map(item => item.id), ['source-1', 'source-2'])
  assert.deepEqual(result.snapshot.profiles.slice(1).map(item => item.styles), [style, style])
  assert.deepEqual(backup, parsed([profile('source'), profile('imported-profile')]))
})
await test('invalid import, stale preview, corruption and future data never mutate storage', async () => {
  const backup = parsed(), storage = memory(), basis = readFontPairProfiles(storage)
  assert.equal((await importFontPairBackup(basis, backup, [], { storage })).ok, false)
  for (const raw of [encode([profile('new')]), '{', '{"version":2,"profiles":[]}']) {
    storage.replace(raw)
    const result = await importFontPairBackup(basis, backup, selection(backup), { storage })
    assert.equal(result.ok, false); assert.equal(storage.raw, raw); assert.equal(storage.writes, 0)
  }
})
await test('lock completion uses a captured preview and cancelled deferred writes never run', async () => {
  const backup = structuredClone(parsed()), choices = selection(backup), storage = memory()
  let run: (() => void) | undefined, active = true
  const lock = <T>(action: () => T) => new Promise<T>(resolve => { run = () => resolve(action()) })
  const first = importFontPairBackup(readFontPairProfiles(storage), backup, choices, { storage, lock, id: () => 'new' })
  choices[0].name = 'MUTATED'; backup.profiles[0].styles.title.fontId = 'invalid'; run!()
  assert.equal((await first).ok, true); assert.ok(!storage.raw?.includes('MUTATED')); assert.ok(!storage.raw?.includes('invalid'))
  const nextBackup = parsed([profile('next')])
  const second = importFontPairBackup(readFontPairProfiles(storage), nextBackup, selection(nextBackup), { storage, lock, isCurrent: () => active })
  active = false; run!(); assert.deepEqual(await second, { ok: false, error: 'cancelled' }); assert.equal(storage.writes, 1)
})
await test('readback unknown never claims success or rolls back another tab, quota leaves original data', async () => {
  const backup = parsed(), storage = memory(), basis = readFontPairProfiles(storage)
  let confirms = 0
  const ports = { id: () => 'new', onConfirmed: () => { confirms++ } }
  const external = encode([profile('external')])
  const replaced = await importFontPairBackup(basis, backup, selection(backup), { ...ports, storage: { ...storage, setItem() { storage.replace(external) } } })
  assert.deepEqual(replaced, { ok: false, error: 'unknownWrite' }); assert.equal(storage.raw, external)
  storage.replace(null)
  let reads = 0
  const unreadable = await importFontPairBackup(basis, backup, selection(backup), { ...ports, storage: { ...storage, getItem(key) { if (++reads > 1) throw new Error('readback'); return storage.getItem(key) } } })
  assert.deepEqual(unreadable, { ok: false, error: 'unknownWrite' }); assert.ok(storage.raw?.includes('new')); assert.equal(confirms, 0)
  const previous = storage.raw, current = readFontPairProfiles(storage), other = parsed([profile('other')])
  assert.deepEqual(await importFontPairBackup(current, other, selection(other), { storage: { ...storage, setItem() { throw Object.assign(new Error('full'), { name: 'QuotaExceededError' }) } } }), { ok: false, error: 'quota' })
  assert.equal(storage.raw, previous)
})
await test('newer file, same file reread, cancellation, late rejection and dispose own their preview', async () => {
  const reader = createFontPairBackupReader(), raw = JSON.stringify(wrapper([profile('a')]))
  let finish: (value: string) => void = () => {}, reject: (error: Error) => void = () => {}
  const old = reader.read({ size: 10, text: () => new Promise<string>(resolve => { finish = resolve }) })
  const file = { size: Buffer.byteLength(raw), text: async () => raw }
  assert.equal((await reader.read(file))?.ok, true); finish(raw); assert.equal(await old, null)
  assert.equal((await reader.read(file))?.ok, true)
  const cancelled = reader.read({ size: 10, text: () => new Promise<string>((_, failure) => { reject = failure }) })
  reader.cancel(); reject(new Error('late')); assert.equal(await cancelled, null)
  const disposed = reader.read({ size: 10, text: () => new Promise<string>(resolve => { finish = resolve }) })
  reader.dispose(); finish(raw); assert.equal(await disposed, null)
  assert.equal(await reader.read(file), null); reader.activate(); assert.equal((await reader.read(file))?.ok, true)
  assert.deepEqual(await reader.read({ size: 10, text: async () => { throw new Error('denied') } }), { ok: false, error: 'unreadable' })
})
console.log(`${groups} font pair backup groups passed`)
