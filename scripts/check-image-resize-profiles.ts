// node scripts/check-image-resize-profiles.ts
import assert from 'node:assert/strict'
import { resolveSize, isFixedSize } from '../src/utils/imageResize.ts'
import {
  IMAGE_RESIZE_PROFILES_KEY, isImageResizeProfileSettings, imageResizeProfileApplyError,
  parseImageResizeProfiles, readImageResizeProfiles, writeImageResizeProfileAction,
  type ImageResizeProfileSettings, type ImageResizeProfilesSnapshot, type ImageResizeProfileAction,
} from '../src/utils/imageResizeProfiles.ts'

const settings: ImageResizeProfileSettings = {
  mode: 'px', width: 640, height: 480, lock: false, percent: 50, longSide: 1920,
  fit: 'contain', format: 'jpeg', quality: 87, targetKB: 500, bg: '#abcdef',
}
const profile = { id: 'profile-a', name: '상세 이미지', settings }
const encode = (profiles: unknown[], version = 1) => JSON.stringify({ version, profiles })
const memory = (initial: string | null = null) => {
  let raw = initial, writes = 0
  return {
    get raw() { return raw },
    get writes() { return writes },
    replace(next: string | null) { raw = next },
    getItem(key: string) { assert.equal(key, IMAGE_RESIZE_PROFILES_KEY); return raw },
    setItem(key: string, next: string) { assert.equal(key, IMAGE_RESIZE_PROFILES_KEY); writes++; raw = next },
  }
}
const ready = (snapshot: ImageResizeProfilesSnapshot) => {
  assert.equal(snapshot.status, 'ready')
  if (snapshot.status !== 'ready') throw new Error('Expected ready snapshot')
  return snapshot
}
const add: ImageResizeProfileAction = { kind: 'add', ...profile }
let count = 0
const check = (name: string, run: () => void) => { run(); count++; console.log(`PASS ${name}`) }

check('empty storage is writable without applying any output settings', () => {
  assert.deepEqual(readImageResizeProfiles(memory()), { status: 'ready', raw: null, profiles: [] })
})
check('all output fields round-trip with no file, filename, crop or computed output', () => {
  const storage = memory()
  assert.equal(writeImageResizeProfileAction(readImageResizeProfiles(storage), add, storage).ok, true)
  assert.deepEqual(ready(readImageResizeProfiles(storage)).profiles, [profile])
  assert.deepEqual(Object.keys(JSON.parse(storage.raw!).profiles[0]).sort(), ['id', 'name', 'settings'])
  assert.deepEqual(Object.keys(JSON.parse(storage.raw!).profiles[0].settings).sort(), ['bg', 'fit', 'format', 'height', 'lock', 'longSide', 'mode', 'percent', 'quality', 'targetKB', 'width'])
})
check('restored profiles reuse the current resize algorithm for each different source', () => {
  const restored = ready(readImageResizeProfiles(memory(encode([profile])))).profiles[0].settings
  assert.equal(isFixedSize(restored), true)
  const wide = resolveSize(1600, 900, restored), tall = resolveSize(900, 1600, restored)
  assert.deepEqual([wide.width, wide.height, tall.width, tall.height], [640, 480, 640, 480])
  assert.ok(wide.plan.dy > 0)
  assert.ok(tall.plan.dx > 0)
  const ratio = { ...restored, lock: true }
  assert.deepEqual([resolveSize(1600, 900, ratio).width, resolveSize(1600, 900, ratio).height], [640, 360])
})
check('percentage and long-side profiles keep their own sizing rules', () => {
  const profiles = [
    { ...profile, id: 'pct', name: '비율', settings: { ...settings, mode: 'pct', percent: 25 } },
    { ...profile, id: 'long', name: '긴 변', settings: { ...settings, mode: 'long', longSide: 800 } },
  ]
  const restored = ready(parseImageResizeProfiles(encode(profiles))).profiles
  assert.deepEqual(restored.map((item) => { const out = resolveSize(1600, 1200, item.settings); return [out.width, out.height] }), [[400, 300], [800, 600]])
})
check('valid output boundaries and original-size compression profiles are accepted', () => {
  assert.equal(isImageResizeProfileSettings({ ...settings, width: 0, height: 0, percent: 1, longSide: 16, quality: 10, targetKB: 0 }), true)
  assert.equal(isImageResizeProfileSettings({ ...settings, width: 10000, height: 10000, percent: 400, longSide: 10000, quality: 100, targetKB: 20000, bg: '#ABCDEF' }), true)
  assert.equal(isImageResizeProfileSettings({ ...settings, targetKB: 10 }), true)
})
check('out-of-range, nonfinite, fractional, wrong-type and unknown enum values are rejected', () => {
  const changes = [
    { width: -1 }, { height: 10001 }, { width: 1.5 }, { width: Infinity }, { height: NaN }, { width: '640' },
    { percent: 0 }, { percent: 401 }, { percent: 50.5 }, { longSide: 15 }, { longSide: 10001 },
    { quality: 9 }, { quality: 101 }, { quality: 80.5 }, { targetKB: -1 }, { targetKB: 1 }, { targetKB: 9 }, { targetKB: 20001 },
    { targetKB: '500' }, { bg: 'red' }, { bg: '#abc' }, { bg: '#abcdef00' }, { bg: '#gggggg' },
    { lock: 1 }, { mode: 'cm' }, { fit: 'none' }, { format: 'gif' },
  ]
  for (const change of changes) assert.equal(isImageResizeProfileSettings({ ...settings, ...change }), false, JSON.stringify(change))
  for (const key of Object.keys(settings)) {
    const missing = { ...settings } as Record<string, unknown>
    delete missing[key]
    assert.equal(isImageResizeProfileSettings(missing), false, key)
  }
})
check('file, filename and crop fields cannot be injected into a profile save', () => {
  for (const extra of [{ file: 'data:image/png;base64,abc' }, { filename: 'private.png' }, { cropX: 50 }, { cropY: 80 }, { cm: { w: 3.5 } }]) {
    const storage = memory()
    const value = { ...settings, ...extra }
    assert.equal(isImageResizeProfileSettings(value), false)
    assert.deepEqual(writeImageResizeProfileAction(readImageResizeProfiles(storage), { ...add, settings: value }, storage), { ok: false, error: 'invalidSettings' })
    assert.equal(storage.writes, 0)
  }
})
check('WebP application waits for capability detection and blocks unsupported browsers', () => {
  const webp = { ...settings, format: 'webp' }
  assert.equal(imageResizeProfileApplyError(webp, null), 'webpChecking')
  assert.equal(imageResizeProfileApplyError(webp, false), 'webpUnsupported')
  assert.equal(imageResizeProfileApplyError(webp, true), null)
  assert.equal(imageResizeProfileApplyError(settings, null), null)
  assert.equal(imageResizeProfileApplyError({ ...settings, format: 'png' }, false), null)
  assert.equal(imageResizeProfileApplyError({ ...settings, width: -1 }, true), 'invalidSettings')
  assert.equal(webp.format, 'webp')
})
check('empty, long, whitespace-only and control-character names cannot be saved', () => {
  for (const name of ['', '  ', '가'.repeat(41), '쇼핑몰\n이미지', 'a\u0000b']) {
    const storage = memory()
    assert.deepEqual(writeImageResizeProfileAction(readImageResizeProfiles(storage), { ...add, name }, storage), { ok: false, error: 'invalidName' })
    assert.equal(storage.raw, null)
  }
})
check('names are trimmed, 40 characters are allowed, normalized duplicates are rejected', () => {
  const storage = memory()
  assert.equal(writeImageResizeProfileAction(readImageResizeProfiles(storage), { ...add, name: ` ${'가'.repeat(40)} ` }, storage).ok, true)
  assert.equal(ready(readImageResizeProfiles(storage)).profiles[0].name, '가'.repeat(40))
  const duplicate = memory(encode([{ ...profile, name: 'Shop' }]))
  assert.deepEqual(writeImageResizeProfileAction(readImageResizeProfiles(duplicate), { ...add, id: 'b', name: 'ＳＨＯＰ' }, duplicate), { ok: false, error: 'duplicateName' })
  assert.equal(duplicate.writes, 0)
})
check('ten profiles survive an eleventh attempt and deletion frees a slot', () => {
  const storage = memory(encode(Array.from({ length: 10 }, (_, i) => ({ ...profile, id: `p-${i}`, name: `프로필 ${i}` }))))
  const before = storage.raw
  assert.deepEqual(writeImageResizeProfileAction(readImageResizeProfiles(storage), add, storage), { ok: false, error: 'limit' })
  assert.equal(storage.raw, before)
  assert.equal(writeImageResizeProfileAction(readImageResizeProfiles(storage), { kind: 'delete', id: 'p-0' }, storage).ok, true)
  assert.equal(writeImageResizeProfileAction(readImageResizeProfiles(storage), add, storage).ok, true)
  assert.equal(ready(readImageResizeProfiles(storage)).profiles.length, 10)
})
check('rename and delete preserve output settings and persist the resulting list', () => {
  const storage = memory(encode([profile]))
  assert.equal(writeImageResizeProfileAction(readImageResizeProfiles(storage), { kind: 'rename', id: profile.id, name: '새 프로필' }, storage).ok, true)
  assert.deepEqual(ready(readImageResizeProfiles(storage)).profiles, [{ ...profile, name: '새 프로필' }])
  assert.equal(writeImageResizeProfileAction(readImageResizeProfiles(storage), { kind: 'delete', id: profile.id }, storage).ok, true)
  assert.deepEqual(ready(readImageResizeProfiles(storage)).profiles, [])
})
check('missing profiles and duplicate renames cannot silently succeed', () => {
  const storage = memory(encode([profile, { ...profile, id: 'b', name: '두번째' }]))
  const snapshot = readImageResizeProfiles(storage)
  assert.deepEqual(writeImageResizeProfileAction(snapshot, { kind: 'rename', id: 'b', name: profile.name }, storage), { ok: false, error: 'duplicateName' })
  assert.deepEqual(writeImageResizeProfileAction(snapshot, { kind: 'rename', id: 'missing', name: '새 이름' }, storage), { ok: false, error: 'missingProfile' })
  assert.deepEqual(writeImageResizeProfileAction(snapshot, { kind: 'delete', id: 'missing' }, storage), { ok: false, error: 'missingProfile' })
  assert.equal(storage.writes, 0)
})
check('damaged lists and unknown fields are preserved without dropping individual rows', () => {
  const invalid = [
    '', '{', 'null', '[]', '{}', encode([profile, { ...profile, id: 'b', name: 'bad', settings: { ...settings, width: -1 } }]),
    encode([profile, profile]), encode([{ ...profile, id: '' }]), encode([{ ...profile, name: ' x' }]),
    encode([{ ...profile, settings: { ...settings, cropX: 50 } }]), encode([{ ...profile, filename: 'private.png' }]),
    JSON.stringify({ version: 1, profiles: [profile], extra: true }), ' '.repeat(100001),
    encode(Array.from({ length: 11 }, (_, i) => ({ ...profile, id: `p-${i}`, name: `프로필 ${i}` }))),
  ]
  for (const raw of invalid) {
    const storage = memory(raw)
    assert.equal(readImageResizeProfiles(storage).status, 'invalidData')
    assert.deepEqual(writeImageResizeProfileAction(readImageResizeProfiles(storage), add, storage), { ok: false, error: 'invalidData' })
    assert.equal(storage.raw, raw)
    assert.equal(storage.writes, 0)
  }
})
check('unsupported versions are preserved even when future shape differs', () => {
  const raw = JSON.stringify({ version: 2, outputProfiles: [profile] })
  const storage = memory(raw)
  assert.equal(readImageResizeProfiles(storage).status, 'unsupportedVersion')
  assert.deepEqual(writeImageResizeProfileAction(readImageResizeProfiles(storage), add, storage), { ok: false, error: 'unsupportedVersion' })
  assert.equal(storage.raw, raw)
})
check('an older tab cannot add, rename or delete over a newer list', () => {
  const storage = memory(encode([profile]))
  const stale = readImageResizeProfiles(storage)
  assert.equal(writeImageResizeProfileAction(readImageResizeProfiles(storage), { kind: 'rename', id: profile.id, name: '다른 탭 이름' }, storage).ok, true)
  const newer = storage.raw
  for (const action of [add, { kind: 'rename', id: profile.id, name: '오래된 이름' }, { kind: 'delete', id: profile.id }] as ImageResizeProfileAction[]) {
    assert.deepEqual(writeImageResizeProfileAction(stale, action, storage), { ok: false, error: 'conflict' })
    assert.equal(storage.raw, newer)
  }
  assert.equal(writeImageResizeProfileAction(readImageResizeProfiles(storage), { kind: 'rename', id: profile.id, name: '목록 확인 후 이름' }, storage).ok, true)
})
check('later corruption and future versions block writes from an earlier healthy view', () => {
  for (const [raw, error] of [['{', 'invalidData'], [encode([profile], 2), 'unsupportedVersion']] as const) {
    const storage = memory()
    const stale = readImageResizeProfiles(storage)
    storage.replace(raw)
    assert.deepEqual(writeImageResizeProfileAction(stale, add, storage), { ok: false, error })
    assert.equal(storage.raw, raw)
  }
})
check('storage read denial and quota failure never report success', () => {
  const storage = memory()
  assert.deepEqual(readImageResizeProfiles({ ...storage, getItem() { throw new Error('SecurityError') } }), { status: 'unavailable' })
  assert.deepEqual(writeImageResizeProfileAction(readImageResizeProfiles(storage), add, { ...storage, setItem() { throw new Error('QuotaExceededError') } }), { ok: false, error: 'unavailable' })
  assert.equal(storage.raw, null)
})
check('write readback catches ineffective writes and an intervening writer', () => {
  const storage = memory()
  assert.deepEqual(writeImageResizeProfileAction(readImageResizeProfiles(storage), add, { ...storage, setItem() {} }), { ok: false, error: 'conflict' })
  const external = encode([{ ...profile, id: 'external', name: '외부' }])
  assert.deepEqual(writeImageResizeProfileAction(readImageResizeProfiles(storage), add, { ...storage, setItem() { storage.replace(external) } }), { ok: false, error: 'conflict' })
  assert.equal(storage.raw, external)
})
check('mutated in-memory snapshots cannot inject unchecked settings into storage', () => {
  const storage = memory(encode([profile]))
  const snapshot = ready(readImageResizeProfiles(storage))
  snapshot.profiles[0].settings.width = 999999
  assert.equal(writeImageResizeProfileAction(snapshot, { kind: 'rename', id: profile.id, name: '안전한 이름' }, storage).ok, true)
  assert.equal(ready(readImageResizeProfiles(storage)).profiles[0].settings.width, 640)
})

console.log(`${count} image resize profile checks passed`)
