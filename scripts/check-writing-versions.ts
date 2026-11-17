// node scripts/check-writing-versions.ts
import assert from 'node:assert/strict'
import {
  addWritingVersion, draftFromWritingVersion, parseWritingDraft, parseWritingVersions,
  readWritingVersions, writeWritingVersions, withWritingStorageLock, WRITING_VERSIONS_KEY,
  WRITING_TEXT_LIMIT, WRITING_TOTAL_LIMIT, WRITING_VERSION_LIMIT,
  type WritingVersion,
} from '../src/utils/writingVersions.ts'

class MemoryStorage {
  value: string | null = null
  failRead = false
  failWrite = false
  writes = 0
  getItem(key: string) {
    assert.equal(key, WRITING_VERSIONS_KEY)
    if (this.failRead) throw new Error('SecurityError')
    return this.value
  }
  setItem(key: string, value: string) {
    assert.equal(key, WRITING_VERSIONS_KEY)
    if (this.failWrite) throw new Error('QuotaExceededError')
    this.value = value
    this.writes++
  }
}

let sequence = 0
const version = (patch: Partial<WritingVersion> = {}): WritingVersion => ({
  id: `version-${++sequence}`, name: '지원동기 1차', sourceTab: 1, createdAt: '2026-11-16T00:00:00.000Z',
  title: '지원동기', text: '  첫 번째 원고\n문항별 비교 😀 ', target: 500, basis: 'chars', ...patch,
})
const encoded = (versions: WritingVersion[]) => JSON.stringify({ version: 1, versions })
const storage = new MemoryStorage()
assert.deepEqual(readWritingVersions(storage), { ok: true, raw: null, versions: [] })

// Round-trip every counting method, preserve formatting, and show versions from every source prompt.
let versions: WritingVersion[] = []
for (const [index, basis] of (['chars', 'charsNoSpace', 'bytesKr', 'x'] as const).entries()) {
  const candidate = version({ basis, sourceTab: index + 1, target: index === 0 ? 0 : 500, name: '  수정본  ' })
  const result = addWritingVersion(storage, storage.value, versions, candidate)
  assert.equal(result.ok, true)
  if (!result.ok) throw new Error('unexpected failure')
  versions = result.versions
  assert.equal(versions[0].name, '수정본')
  assert.equal(versions[0].text, candidate.text)
  assert.deepEqual(draftFromWritingVersion(versions[0]), {
    title: candidate.title, text: candidate.text, target: candidate.target, basis: candidate.basis,
  })
  assert.deepEqual(parseWritingVersions(result.raw), versions)
}
assert.equal(versions.length, 4)
assert.deepEqual(new Set(versions.map(item => item.sourceTab)), new Set([1, 2, 3, 4]))

// Invalid names/text and all size limits fail before writing or evicting an older version.
for (const [candidate, error] of [
  [version({ name: '' }), 'title'], [version({ name: ' '.repeat(5) }), 'title'],
  [version({ name: '가'.repeat(41) }), 'title'], [version({ text: '' }), 'empty'],
  [version({ text: '\n\t  ' }), 'empty'], [version({ text: '가'.repeat(WRITING_TEXT_LIMIT + 1) }), 'textLimit'],
] as const) {
  const before = storage.value
  assert.deepEqual(addWritingVersion(storage, before, versions, candidate), { ok: false, error })
  assert.equal(storage.value, before)
}
const full = Array.from({ length: WRITING_VERSION_LIMIT }, () => version())
storage.value = encoded(full)
assert.deepEqual(addWritingVersion(storage, storage.value, full, version()), { ok: false, error: 'full' })
assert.deepEqual(parseWritingVersions(storage.value), full)
const maximumText = '가'.repeat(WRITING_TEXT_LIMIT)
const maximum = Array.from({ length: WRITING_TOTAL_LIMIT / WRITING_TEXT_LIMIT }, () => version({ text: maximumText, name: '가'.repeat(40) }))
storage.value = null
assert.equal(writeWritingVersions(storage, null, maximum).ok, true)
assert.deepEqual(addWritingVersion(storage, storage.value, maximum, version({ text: '가' })), { ok: false, error: 'totalLimit' })

// Stale writers cannot overwrite additions or deletions from another browser tab.
storage.value = encoded([version()])
const oldRaw = storage.value
const oldVersions = parseWritingVersions(oldRaw)
const newer = addWritingVersion(storage, oldRaw, oldVersions, version({ sourceTab: 5 }))
assert.equal(newer.ok, true)
const newestRaw = storage.value
assert.deepEqual(addWritingVersion(storage, oldRaw, oldVersions, version()), { ok: false, error: 'conflict' })
assert.deepEqual(writeWritingVersions(storage, oldRaw, []), { ok: false, error: 'conflict' })
assert.equal(storage.value, newestRaw)
assert.equal(writeWritingVersions(storage, newestRaw, []).ok, true)
assert.deepEqual(parseWritingVersions(storage.value), [])

// Storage exceptions preserve both the prior store and the in-memory candidate.
const candidate = version()
const candidateBefore = JSON.stringify(candidate)
const beforeQuota = storage.value
storage.failWrite = true
assert.deepEqual(addWritingVersion(storage, beforeQuota, [], candidate), { ok: false, error: 'unavailable' })
assert.equal(storage.value, beforeQuota)
assert.equal(JSON.stringify(candidate), candidateBefore)
storage.failWrite = false
storage.failRead = true
assert.deepEqual(readWritingVersions(storage), { ok: false, error: 'unavailable' })
assert.deepEqual(writeWritingVersions(storage, storage.value, []), { ok: false, error: 'unavailable' })
storage.failRead = false

// Malformed and future stores never become empty writable lists; duplicate IDs are rejected.
const duplicate = version()
const invalidStores = [
  '', '{broken', 'null', '[]', '{}', JSON.stringify({ version: 2, versions: [] }),
  encoded([duplicate, duplicate]), encoded(Array.from({ length: 21 }, () => version())),
  encoded([version({ sourceTab: 0 })]), encoded([version({ sourceTab: 6 })]),
  encoded([version({ sourceTab: 1.5 })]), encoded([version({ createdAt: '2026-02-30T00:00:00.000Z' })]),
  encoded([version({ basis: 'unsupported' as WritingVersion['basis'] })]),
  encoded([version({ target: -1 })]), encoded([version({ target: Infinity })]),
  encoded([version({ title: '가'.repeat(41) })]), encoded([...maximum, version()]),
]
for (const raw of invalidStores) {
  assert.throws(() => parseWritingVersions(raw))
  storage.value = raw
  assert.deepEqual(readWritingVersions(storage), { ok: false, error: 'corrupt' })
  assert.deepEqual(writeWritingVersions(storage, raw, []), { ok: false, error: 'corrupt' })
  assert.equal(storage.value, raw)
}

// Existing five-prompt drafts retain the original key's shape without coercing corrupt fields.
const draft = { tabs: Array.from({ length: 5 }, () => draftFromWritingVersion(version())), active: 4 }
assert.deepEqual(parseWritingDraft(JSON.stringify(draft)), draft)
assert.equal(parseWritingDraft(null), null)
for (const value of [
  null, [], {}, { ...draft, active: -1 }, { ...draft, active: 5 }, { ...draft, active: 1.5 },
  { ...draft, tabs: [] }, { ...draft, tabs: draft.tabs.slice(1) },
  ...[null, false, 123, {}, [], { ...draft.tabs[0], text: null }, { ...draft.tabs[0], title: 4 },
    { ...draft.tabs[0], basis: 'bad' }, { ...draft.tabs[0], target: -1 }, { ...draft.tabs[0], target: 1.5 },
    { ...draft.tabs[0], target: Number.MAX_VALUE }].map(bad => ({ ...draft, tabs: [bad, ...draft.tabs.slice(1)] })),
]) assert.throws(() => parseWritingDraft(JSON.stringify(value)))

// Emulate Web Locks scheduling: simultaneous writers must serialize and the loser must keep its input.
let lockQueue = Promise.resolve<unknown>(undefined)
const locks = {
  request(_key: string, callback: () => unknown) {
    const result = lockQueue.then(callback)
    lockQueue = result.catch(() => undefined)
    return result
  },
} as Pick<LockManager, 'request'>
storage.value = null
const simultaneous = await Promise.all([
  withWritingStorageLock(WRITING_VERSIONS_KEY, () => addWritingVersion(storage, null, [], version({ name: 'first' })), locks),
  withWritingStorageLock(WRITING_VERSIONS_KEY, () => addWritingVersion(storage, null, [], version({ name: 'second' })), locks),
])
assert.equal(simultaneous[0].ok, true)
assert.deepEqual(simultaneous[1], { ok: false, error: 'conflict' })
assert.equal(parseWritingVersions(storage.value)[0].name, 'first')
const beforeUnsupported = storage.value
const fallback = await withWritingStorageLock(WRITING_VERSIONS_KEY,
  () => addWritingVersion(storage, beforeUnsupported, parseWritingVersions(beforeUnsupported), version({ name: 'fallback' })),
  {} as Pick<LockManager, 'request'>)
assert.equal(fallback.ok, true)
assert.equal(parseWritingVersions(storage.value)[0].name, 'fallback')
const overwritten = {
  getItem: () => storage.value,
  setItem: () => { storage.value = encoded([version({ name: 'another writer' })]) },
}
assert.deepEqual(writeWritingVersions(overwritten, storage.value, []), { ok: false, error: 'conflict' })

console.log('check-writing-versions OK: round trips, all prompts, restore settings, caps, stale and simultaneous writes, quota, corrupt stores, legacy drafts')
