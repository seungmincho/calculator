// node scripts/check-writing-versions-backup.ts
import assert from 'node:assert/strict'
import {
  createWritingBackup, prepareWritingImport, previewWritingImport, readWritingBackup, writingVersionContent,
  WRITING_BACKUP_FORMAT, WRITING_BACKUP_MAX_BYTES,
} from '../src/utils/writingVersionsBackup.ts'
import { parseWritingVersions, writeWritingVersions, WRITING_DRAFT_KEY, WRITING_VERSIONS_KEY, type WritingVersion } from '../src/utils/writingVersions.ts'

let sequence = 0
const date = '2026-11-16T12:00:00.000Z'
const version = (patch: Partial<WritingVersion> = {}): WritingVersion => ({
  id: `v-${++sequence}`, name: '수정본 이름', title: '문항 제목', text: '원고\n둘째 줄\t😀', target: 500, basis: 'chars', sourceTab: 1, createdAt: date, ...patch,
})
const envelope = (versions: unknown, patch: Record<string, unknown> = {}) => JSON.stringify({ format: WRITING_BACKUP_FORMAT, version: 1, exportedAt: date, versions, ...patch })
const originals = [version(), version({ basis: 'bytesKr', target: 0, sourceTab: 5 }), version({ basis: 'x', text: '  공백을 보존  ' })]
const exported = createWritingBackup(originals, date)
const imported = readWritingBackup(exported)
assert.equal(imported.ok, true)
if (!imported.ok) throw new Error('unexpected failure')
assert.deepEqual(imported.versions, originals)
assert.equal(imported.exportedAt, date)
assert.deepEqual(readWritingBackup('\uFEFF' + exported), imported)
assert.equal(previewWritingImport([], imported.versions).filter(row => row.selected).length, 3)

// Maximal legal text, Unicode and JSON escape-heavy data must round-trip through our own 2 MiB gate.
for (const text of ['가'.repeat(15_000), '\u0000'.repeat(15_000), '😀'.repeat(7_500)]) {
  const maximum = Array.from({ length: 20 }, (_, index) => version({
    id: '\u0001'.repeat(90) + index, name: '\u0002'.repeat(40), title: '\u0003'.repeat(40), text,
  }))
  const backup = createWritingBackup(maximum, date)
  assert.ok(new TextEncoder().encode(backup).length < WRITING_BACKUP_MAX_BYTES)
  const result = readWritingBackup(backup)
  assert.equal(result.ok, true)
  if (result.ok) assert.deepEqual(result.versions, maximum)
}
assert.deepEqual(readWritingBackup('x'.repeat(WRITING_BACKUP_MAX_BYTES + 1)), { ok: false, error: 'size' })
assert.deepEqual(readWritingBackup('한'.repeat(Math.floor(WRITING_BACKUP_MAX_BYTES / 3) + 1)), { ok: false, error: 'size' })

// Wrong tools/future versions/malformed records/duplicate IDs are rejected without data coercion.
assert.deepEqual(readWritingBackup(envelope(originals, { format: 'another-tool' })), { ok: false, error: 'format' })
assert.deepEqual(readWritingBackup(envelope(originals, { version: 2 })), { ok: false, error: 'version' })
assert.deepEqual(readWritingBackup(envelope(originals, { version: '1' })), { ok: false, error: 'version' })
for (const text of ['{bad', envelope(originals, { exportedAt: '2026-02-30T12:00:00.000Z' }), envelope([originals[0], originals[0]]),
  envelope([version({ text: 'a'.repeat(50_001) })]), envelope(Array.from({ length: 21 }, () => version())),
  envelope(Array.from({ length: 7 }, () => version({ text: 'a'.repeat(50_000) }))),
  envelope([version({ sourceTab: 6 })]), envelope([version({ basis: 'bad' as WritingVersion['basis'] })]),
]) assert.equal(readWritingBackup(text).ok, false)
const projected = readWritingBackup(envelope([{ ...originals[0], unexpected: 'must not persist', __proto__: { polluted: true } }]))
assert.equal(projected.ok, true)
if (projected.ok) assert.deepEqual(projected.versions, [originals[0]])

// Comparison ignores object property order and external IDs, while retaining all manuscript metadata.
const existing = [version({ id: 'conflict', text: '기존 원고' }), version({ id: 'duplicate', text: '같은 원고' })]
const incoming = [
  version({ id: 'new', text: '새 원고' }), { ...existing[0], text: '충돌 원고' },
  { ...existing[1] }, { ...existing[1], id: 'different-id' },
]
assert.deepEqual(previewWritingImport(existing, incoming).map(row => [row.status, row.selected]), [
  ['new', true], ['conflict', false], ['duplicate', false], ['duplicate', false],
])
const reordered = Object.fromEntries(Object.entries(existing[0]).reverse()) as unknown as WritingVersion
assert.equal(writingVersionContent(reordered), writingVersionContent(existing[0]))
const beforeExisting = JSON.stringify(existing), beforeIncoming = JSON.stringify(incoming)
const prepared = prepareWritingImport(existing, incoming, ['new', 'conflict', 'duplicate', 'different-id'], () => 'copied-conflict')
assert.equal(prepared.ok, true)
if (!prepared.ok) throw new Error('unexpected failure')
assert.equal(prepared.added, 2)
assert.equal(prepared.versions[1].id, 'copied-conflict')
assert.equal(prepared.versions[1].createdAt, incoming[1].createdAt)
assert.deepEqual(prepared.versions.slice(2), existing)
assert.equal(JSON.stringify(existing), beforeExisting)
assert.equal(JSON.stringify(incoming), beforeIncoming)
assert.ok(previewWritingImport(prepared.versions, incoming).every(row => row.status === 'duplicate'))
assert.deepEqual(prepareWritingImport(prepared.versions, incoming, incoming.map(item => item.id), () => 'unused'), { ok: false, error: 'emptySelection' })
assert.deepEqual(prepareWritingImport(existing, [incoming[1]], ['conflict'], () => 'conflict'), { ok: false, error: 'id' })

// Capacity failures are all-or-nothing; reducing the selection permits a complete selected import.
const full = Array.from({ length: 20 }, (_, index) => version({ text: `원고 ${index}` }))
assert.deepEqual(prepareWritingImport(full, [incoming[0]], ['new'], () => 'unused'), { ok: false, error: 'full' })
const largeExisting = Array.from({ length: 3 }, (_, index) => version({ text: String(index).repeat(50_000) }))
const largeIncoming = Array.from({ length: 4 }, (_, index) => version({ text: String(index + 3).repeat(50_000) }))
assert.deepEqual(prepareWritingImport(largeExisting, largeIncoming, largeIncoming.map(item => item.id), () => 'unused'), { ok: false, error: 'totalLimit' })
assert.equal(prepareWritingImport(largeExisting, largeIncoming, [largeIncoming[0].id], () => 'unused').ok, true)
assert.deepEqual(prepareWritingImport(existing, incoming, [], () => 'unused'), { ok: false, error: 'emptySelection' })

// Import writes only the versions key, retaining the five active drafts; quota/stale failures preserve raw data.
const values = new Map<string, string>([
  [WRITING_DRAFT_KEY, 'five current prompts and undo are not imported'],
  [WRITING_VERSIONS_KEY, JSON.stringify({ version: 1, versions: existing })],
])
let failWrite = true
const storage = { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => {
  assert.equal(key, WRITING_VERSIONS_KEY)
  if (failWrite) throw new Error('QuotaExceededError')
  values.set(key, value)
} }
const oldRaw = values.get(WRITING_VERSIONS_KEY)!
assert.deepEqual(writeWritingVersions(storage, oldRaw, prepared.versions), { ok: false, error: 'unavailable' })
assert.equal(values.get(WRITING_VERSIONS_KEY), oldRaw)
failWrite = false
assert.equal(writeWritingVersions(storage, oldRaw, prepared.versions).ok, true)
assert.deepEqual(parseWritingVersions(values.get(WRITING_VERSIONS_KEY)!), prepared.versions)
assert.deepEqual(writeWritingVersions(storage, oldRaw, []), { ok: false, error: 'conflict' })
assert.equal(values.get(WRITING_DRAFT_KEY), 'five current prompts and undo are not imported')

console.log('check-writing-versions-backup OK: maximum round-trips, format/version/schema, duplicates/conflicts, capacities, quota/stale, draft isolation')
