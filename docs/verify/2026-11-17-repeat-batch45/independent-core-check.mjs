import assert from 'node:assert/strict'
import fs from 'node:fs'
import { parseFontPairProfiles, readFontPairProfiles, FONT_PAIR_PROFILES_KEY } from '../../../src/utils/fontPairProfiles.ts'
import { FONT_BY_ID } from '../../../src/utils/fontPreview.ts'
import { parseFontPairBackup, createFontPairBackup, inspectFontPairImport, importFontPairBackup, createFontPairBackupReader } from '../../../src/utils/fontPairBackup.ts'

const styles = { title: { fontId: 'noto-sans-kr', size: 31, weight: 800 }, body: { fontId: 'nanum-myeongjo', size: 17, weight: 500 } }
assert.ok(FONT_BY_ID.has(styles.title.fontId) && FONT_BY_ID.has(styles.body.fontId))
const profile = (id, name = id) => ({ id, name, styles: structuredClone(styles) })
const envelope = profiles => ({ app: 'toolhub-font-pair-profiles', version: 1, exportedAt: '2026-11-17T03:12:13.001Z', profiles })
const rawStore = profiles => JSON.stringify({ version: 1, profiles })
const choices = source => source.profiles.map(row => ({ sourceId: row.id, name: row.name }))
const memory = initial => { let raw = initial ?? null; const writes = []; return { writes, get raw() { return raw }, external(value) { raw = value }, getItem(key) { assert.equal(key, FONT_PAIR_PROFILES_KEY); return raw }, setItem(key, value) { assert.equal(key, FONT_PAIR_PROFILES_KEY); writes.push(value); raw = value } } }
const deferred = () => { let resolve, reject; const promise = new Promise((a, b) => { resolve = a; reject = b }); return { promise, resolve, reject } }
const deferredLock = () => { const pending = []; return { pending, lock(action) { return new Promise((resolve, reject) => pending.push(() => { try { resolve(action()) } catch (error) { reject(error) } })) } } }
const parsed = value => { const result = parseFontPairBackup(JSON.stringify(value)); assert.equal(result.ok, true); return result.backup }

if (process.argv.includes('--reproduce-callback')) {
  const source = envelope([profile('incoming')]), storage = memory(), events = []
  const result = await importFontPairBackup(readFontPairProfiles(storage), source, choices(source), { storage, id: () => 'new-id', onConfirmed(snapshot) { events.push({ confirmed: snapshot.raw === storage.raw }); throw new Error('view callback failed') } })
  const evidence = { result, storageWrites: storage.writes.length, storedProfiles: JSON.parse(storage.raw).profiles, events }
  fs.writeFileSync(new URL('./callback-before-fix.json', import.meta.url), JSON.stringify(evidence, null, 2) + '\n')
  console.log(JSON.stringify(evidence, null, 2)); process.exit(0)
}

let groups = 0
const only = process.argv.find(value => value.startsWith('--only='))?.slice(7)
async function check(name, run) { if (only && !name.includes(only)) return; await run(); groups++; console.log('PASS', name) }
await check('export trusts validated raw only, with exact private-field-free structure and requested weight', () => {
  const originals = Array.from({ length: 6 }, (_, i) => profile(`s${i}`, `한글😀"\\${i}`)), basis = parseFontPairProfiles(rawStore(originals))
  basis.profiles[0].name = 'PRIVATE-MANUSCRIPT'; basis.profiles[0].styles.title.text = 'PRIVATE-BODY'; basis.manuscript = 'PRIVATE-TEXT'
  const result = createFontPairBackup(basis, '2026-11-17T03:12:13.001Z'); assert.equal(result.ok, true)
  const data = JSON.parse(result.text); assert.deepEqual(Object.keys(data).sort(), ['app', 'exportedAt', 'profiles', 'version']); assert.deepEqual(data.profiles, originals); assert.equal(result.text.includes('PRIVATE'), false)
  for (const row of data.profiles) { assert.deepEqual(Object.keys(row).sort(), ['id', 'name', 'styles']); for (const role of ['title', 'body']) assert.deepEqual(Object.keys(row.styles[role]).sort(), ['fontId', 'size', 'weight']) }
  assert.equal(parsed(data).profiles[0].styles.body.weight, 500)
  assert.equal(createFontPairBackup({ ...basis, raw: rawStore([{ ...originals[0], manuscript: 'secret' }]) }).ok, false)
})
await check('strict catalog/style/schema matrix and UTF8 boundary reject whole files without silent replacement', () => {
  const base = envelope([profile('i')]), variants = []
  for (const role of ['title', 'body']) for (const [key, values] of Object.entries({ fontId: ['local:upload', 'https://font.test/font.woff', 'Noto-Sans-Kr', '', null], size: [0, 12.5, role === 'title' ? 97 : 41, Infinity], weight: [0, 350, 1000, '400'], text: ['private'] })) {
    for (const value of values) { const copy = structuredClone(base); copy.profiles[0].styles[role][key] = value; variants.push(copy) }
  }
  variants.push({ ...base, other: true }, { ...base, profiles: [{ ...profile('i'), url: 'private' }] }, { ...base, version: 2 }, { ...base, exportedAt: '2026-11-17T03:12:13+00:00' }, { ...base, app: 'other' })
  for (const candidate of variants) assert.equal(parseFontPairBackup(JSON.stringify(candidate)).ok, false)
  const text = JSON.stringify(base), bytes = Buffer.byteLength(text), exact = '\uFEFF' + text + ' '.repeat(65536 - bytes - 3)
  assert.equal(Buffer.byteLength(exact), 65536); assert.equal(parseFontPairBackup(exact).ok, true); assert.equal(parseFontPairBackup(exact + ' ').error, 'tooLarge')
  const wide = text + '\u3000'.repeat(22000); assert.ok(wide.length < 65536); assert.equal(parseFontPairBackup(wide).error, 'tooLarge')
})
await check('all selected names use NFKC/case uniqueness, every collision reported,6slots never partially append', async () => {
  const source = envelope([profile('a', 'one'), profile('b', 'two'), profile('c', 'three')]), current = parseFontPairProfiles(rawStore([profile('existing', 'Ｋ')]))
  const collision = inspectFontPairImport(current, source, [{ sourceId: 'a', name: 'k' }, { sourceId: 'b', name: '①' }, { sourceId: 'c', name: '1' }])
  assert.equal(collision.ok, false); assert.deepEqual(collision.rows.map(row => [row.sourceId, row.error]), [['a', 'duplicateName'], ['b', 'duplicateName'], ['c', 'duplicateName']])
  const invalid = inspectFontPairImport(current, source, [{ sourceId: 'a', name: 'x'.repeat(41) }, { sourceId: 'b', name: '\t' }]); assert.equal(invalid.rows.length, 2)
  const storage = memory(rawStore(Array.from({ length: 5 }, (_, i) => profile(`saved${i}`))))
  assert.equal((await importFontPairBackup(readFontPairProfiles(storage), source, choices(source).slice(0, 2), { storage })).error, 'limit'); assert.equal(storage.writes.length, 0)
  const one = await importFontPairBackup(readFontPairProfiles(storage), source, [{ sourceId: 'a', name: '  final  ' }], { storage, id: () => 'fresh' }); assert.equal(one.ok, true); assert.equal(JSON.parse(storage.raw).profiles.length, 6); assert.equal(JSON.parse(storage.raw).profiles.at(-1).name, 'final')
})
await check('deferred import captures basis/selection/styles before lock and reserves every original ID', async () => {
  const source = envelope([profile('a'), profile('a-1'), profile('unselected')]), select = choices(source).slice(0, 2), storage = memory(rawStore([profile('a-2', 'existing')])), basis = readFontPairProfiles(storage), queue = deferredLock()
  const pending = importFontPairBackup(basis, source, select, { storage, lock: queue.lock, id: () => 'a' })
  source.profiles[0].styles.title.fontId = 'bad'; source.profiles[1].name = 'CHANGED'; select[0].name = 'CHANGED'; basis.raw = 'changed-view'; basis.profiles.length = 0
  queue.pending.shift()(); const result = await pending; assert.equal(result.ok, true)
  const rows = JSON.parse(storage.raw).profiles; assert.deepEqual(rows.map(row => row.id), ['a-2', 'a-3', 'a-4']); assert.deepEqual(rows.map(row => row.name), ['existing', 'a', 'a-1']); assert.deepEqual(rows[1].styles, styles)
  assert.equal(storage.writes.length, 1)
})
await check('external CAS/new corruption/future/cancel/id-stage cancellation preserve raw and do not notify confirmation', async () => {
  const source = envelope([profile('i')])
  for (const next of ['{', '{"version":9,"profiles":[]}', rawStore([profile('other')])]) {
    const storage = memory(), queue = deferredLock(); let confirmed = 0
    const pending = importFontPairBackup(readFontPairProfiles(storage), source, choices(source), { storage, lock: queue.lock, onConfirmed: () => confirmed++ })
    storage.external(next); queue.pending.shift()(); assert.equal((await pending).ok, false); assert.equal(storage.raw, next); assert.equal(storage.writes.length, 0); assert.equal(confirmed, 0)
  }
  const storage = memory(); let active = true
  const result = await importFontPairBackup(readFontPairProfiles(storage), source, choices(source), { storage, isCurrent: () => active, id() { active = false; return 'safe' } })
  assert.equal(result.error, 'cancelled'); assert.equal(storage.writes.length, 0)
})
await check('readback throw/different raw remain unknown and never rollback; quota is precommit failure', async () => {
  const source = envelope([profile('i')])
  for (const mode of ['throw', 'external']) {
    const storage = memory(), basis = readFontPairProfiles(storage); let reads = 0, confirmed = 0
    const result = await importFontPairBackup(basis, source, choices(source), { id: () => 'new', onConfirmed: () => confirmed++, storage: { getItem(key) { if (++reads === 2) { if (mode === 'throw') throw new Error('blocked'); storage.external(rawStore([profile('other')])) } return storage.getItem(key) }, setItem: storage.setItem } })
    assert.equal(result.error, 'unknownWrite'); assert.equal(storage.writes.length, 1); assert.equal(confirmed, 0); assert.ok(storage.raw.includes(mode === 'throw' ? 'new' : 'other'))
  }
  const storage = memory(rawStore([profile('saved')])), raw = storage.raw
  const result = await importFontPairBackup(readFontPairProfiles(storage), source, choices(source), { storage: { getItem: storage.getItem, setItem() { throw Object.assign(new Error('full'), { name: 'QuotaExceededError' }) } } })
  assert.equal(result.error, 'quota'); assert.equal(storage.raw, raw); assert.equal(storage.writes.length, 0)
})
await check('confirmed callback runs before lock release and exception cannot relabel a readback-confirmed commit', async () => {
  const storage = memory(), source = envelope([profile('i')]), order = []
  const result = await importFontPairBackup(readFontPairProfiles(storage), source, choices(source), { storage, id: () => 'new', lock: async action => { order.push('locked'); const value = action(); order.push('released'); return value }, onConfirmed(value) { order.push('confirmed'); assert.equal(value.raw, storage.raw); throw new Error('view failed after commit') } })
  assert.deepEqual(order, ['locked', 'confirmed', 'released']); assert.equal(storage.writes.length, 1); assert.equal(result.ok, true); assert.equal(result.snapshot.raw, storage.raw)
})
await check('reader latest/cancel/Strict dispose-activate rejects stale work and oversized file reads0', async () => {
  const reader = createFontPairBackupReader(), a = deferred(), b = deferred(), raw = JSON.stringify(envelope([profile('new')]))
  const old = reader.read({ size: 12, text: () => a.promise }); const latest = reader.read({ size: 12, text: () => b.promise }); b.resolve(raw); assert.equal((await latest).ok, true); a.reject(new Error('late unreadable')); assert.equal(await old, null)
  const c = deferred(), stale = reader.read({ size: 12, text: () => c.promise }); reader.dispose(); reader.activate(); const current = await reader.read({ size: Buffer.byteLength(raw), text: async () => raw }); assert.equal(current.ok, true); c.resolve(raw); assert.equal(await stale, null)
  let reads = 0; assert.equal((await reader.read({ size: 65537, text: async () => { reads++; return raw } })).error, 'tooLarge'); assert.equal(reads, 0)
  const d = deferred(), cancelled = reader.read({ size: 12, text: () => d.promise }); reader.cancel(); d.resolve(raw); assert.equal(await cancelled, null)
})
console.log(`Font pair backup independent core: ${groups} groups passed`)
