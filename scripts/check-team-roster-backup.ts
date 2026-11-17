import assert from 'node:assert/strict'
import { TEAM_ROSTERS_KEY, isTeamRoster, parseTeamRosters, projectTeamRoster, readTeamRosters, withTeamRosterLock, writeTeamRosters, type TeamRoster } from '../src/utils/teamRosters.ts'
import { TEAM_ROSTER_BACKUP_FORMAT, TEAM_ROSTER_BACKUP_MAX_BYTES, appendSelectedTeamRosters, exportTeamRosterBackup, parseTeamRosterBackup, previewTeamRosterImport } from '../src/utils/teamRosterBackup.ts'

let checks = 0
const check = (name: string, fn: () => void) => { fn(); checks++; console.log(`PASS ${name}`) }
const time = '2026-11-16T11:00:00.000Z'
const make = (id: string, title = id, names = ['가', '나']): TeamRoster => ({ id, title, names, skills: Object.fromEntries(names.map((name, index) => [name, index % 5 + 1])), teamCount: 2, mode: 'balanced', updatedAt: 12345 })
const suffix = (number: number) => ` (복사 ${number})`
let sequence = 0
const id = () => `fresh-${++sequence}`

check('all fields, skill values and safe origin metadata survive a backup roundtrip', () => {
  const roster = { ...make('one', '주말 모임', ['__proto__', 'constructor', '한글 😀']), importOrigin: { id: 'source', title: '원래 모임' } }
  assert.ok(isTeamRoster(roster))
  const restored = parseTeamRosterBackup(exportTeamRosterBackup([roster], time))
  assert.deepEqual(restored.rosters, [roster])
  assert.equal(restored.format, TEAM_ROSTER_BACKUP_FORMAT)
  assert.ok(!Object.hasOwn(projectTeamRoster(make('old')), 'importOrigin'), 'legacy rosters get no invented origin')
  assert.ok(!isTeamRoster({ ...roster, importOrigin: { id: 2, title: '제목' } }))
  assert.ok(!isTeamRoster({ ...roster, importOrigin: { id: 'source', title: 'x'.repeat(41) } }))
  assert.ok(!isTeamRoster({ ...roster, importOrigin: { id: 'source', title: '원본', copyTitle: 12 } }))
})

check('same participants under different original titles are both restored', () => {
  const weekday = make('weekday', '평일 모임')
  const weekend = make('weekend', '주말 모임')
  const rows = previewTeamRosterImport([], [weekday, weekend], suffix, id)
  assert.deepEqual(rows.map(row => row.status), ['new', 'new'])
  assert.equal(appendSelectedTeamRosters([], rows, rows.map(row => row.sourceId)).length, 2)
  assert.equal(previewTeamRosterImport([weekday], [weekend], suffix, id)[0].status, 'new')
  assert.equal(previewTeamRosterImport([weekday], [{ ...weekday, id: 'other', updatedAt: 999 }], suffix, id)[0].status, 'duplicate')
})

check('ID/title conflicts make distinct copies and a repeated original file is excluded', () => {
  const existing = make('one', '모임')
  const incoming = make('one', '모임', ['가', '다'])
  const row = previewTeamRosterImport([existing], [incoming], suffix, id)[0]
  assert.equal(row.status, 'conflict'); assert.notEqual(row.roster.id, incoming.id)
  assert.equal(row.roster.title, '모임 (복사 1)')
  assert.deepEqual(row.roster.importOrigin, { id: incoming.id, title: incoming.title, copyTitle: row.roster.title })
  const combined = appendSelectedTeamRosters([existing], [row], [row.sourceId])
  assert.deepEqual(combined[0], existing)
  assert.equal(previewTeamRosterImport(combined, [incoming], suffix, id)[0].status, 'duplicate')
  const roundtrip = parseTeamRosterBackup(exportTeamRosterBackup(combined, time)).rosters
  assert.equal(previewTeamRosterImport(roundtrip, [incoming], suffix, id)[0].status, 'duplicate')
  const edited = combined.map(roster => roster.id === row.roster.id ? { ...roster, skills: { ...roster.skills, 다: 5 } } : roster)
  assert.equal(previewTeamRosterImport(edited, [incoming], suffix, id)[0].status, 'conflict', 'changed skill content is not silently treated as the old imported copy')
  const renamed = combined.map(roster => roster.id === row.roster.id ? { ...roster, title: '다른 이름으로 바꾼 모임' } : roster)
  assert.equal(previewTeamRosterImport(renamed, [incoming], suffix, id)[0].status, 'conflict', 'changing only the copied title must also break origin deduplication')
  assert.equal(previewTeamRosterImport(combined, [{ ...row.roster, title: '파일에서 고친 제목' }], suffix, id)[0].status, 'conflict', 'edited titles inside imported backup files are also distinct')
  const earlyCopy = { ...row.roster, importOrigin: { id: incoming.id, title: incoming.title } }
  assert.equal(previewTeamRosterImport([existing, earlyCopy], [incoming], suffix, id)[0].status, 'conflict', 'an early origin without copyTitle cannot silently erase a differently titled item')
  const otherTitle = { ...incoming, id: 'another', title: '다른 날' }
  assert.equal(previewTeamRosterImport(combined, [otherTitle], suffix, id)[0].status, 'new')
})

check('titles fit 40 characters and generated IDs cannot overwrite reserved source IDs', () => {
  const title = '가'.repeat(40)
  const existing = make('one', title)
  const incoming = make('one', title, ['가', '다'])
  const row = previewTeamRosterImport([existing], [incoming], suffix, id)[0]
  assert.equal(row.roster.title.length, 40)
  assert.ok(row.roster.title.endsWith(' (복사 1)'))
  assert.throws(() => previewTeamRosterImport([existing], [incoming], suffix, () => 'one'), /invalid/)
  const titleOnly = previewTeamRosterImport([existing], [{ ...incoming, id: 'different' }], suffix, id)[0]
  assert.equal(titleOnly.status, 'conflict'); assert.notEqual(titleOnly.roster.id, 'different')
})

check('canonical comparisons ignore skill property order while preserving member order', () => {
  const roster = make('one', '순서', ['가', '나', '다'])
  const rekeyed = { ...roster, skills: Object.fromEntries(Object.entries(roster.skills).reverse()) }
  assert.equal(previewTeamRosterImport([roster], [rekeyed], suffix, id)[0].status, 'duplicate')
  assert.equal(previewTeamRosterImport([roster], [{ ...roster, names: [...roster.names].reverse() }], suffix, id)[0].status, 'conflict')
})

check('files reject another tool, future versions, duplicate IDs, bad dates and bad ratings', () => {
  const backup = JSON.parse(exportTeamRosterBackup([make('one')], time))
  assert.throws(() => parseTeamRosterBackup('{bad'), /corrupt/)
  assert.throws(() => parseTeamRosterBackup(JSON.stringify({ ...backup, format: 'another-tool' })), /wrongFormat/)
  assert.throws(() => parseTeamRosterBackup(JSON.stringify({ ...backup, version: 2 })), /unsupported/)
  assert.throws(() => parseTeamRosterBackup(JSON.stringify({ ...backup, exportedAt: '2026-02-30T00:00:00.000Z' })), /corrupt/)
  assert.throws(() => parseTeamRosterBackup(JSON.stringify({ ...backup, rosters: [make('one'), make('one')] })), /corrupt/)
  assert.throws(() => parseTeamRosterBackup(JSON.stringify({ ...backup, rosters: [{ ...make('one'), skills: { 가: 9, 나: 1 } }] })), /corrupt/)
  assert.throws(() => parseTeamRosterBackup('x'.repeat(TEAM_ROSTER_BACKUP_MAX_BYTES + 1)), /tooLarge/)
})

check('maximum legacy control-character rosters exceed 1MB but roundtrip within 2MB', () => {
  const names = Array.from({ length: 200 }, (_, index) => `${'\u0001'.repeat(76)}${String(index).padStart(3, '0')}가`)
  const rosters = Array.from({ length: 10 }, (_, index) => make(`max-${index}`, `${'\u0002'.repeat(38)}${index}`, names))
  assert.ok(rosters.every(isTeamRoster))
  const serialized = exportTeamRosterBackup(rosters, time)
  const bytes = new TextEncoder().encode(serialized).length
  assert.ok(bytes > 1024 * 1024); assert.ok(bytes <= TEAM_ROSTER_BACKUP_MAX_BYTES)
  assert.deepEqual(parseTeamRosterBackup(serialized).rosters, rosters)
  const withExtras = { ...make('extras'), unused: 'x'.repeat(TEAM_ROSTER_BACKUP_MAX_BYTES), skills: { ...make('extras').skills, unused: 999 } }
  const projected = parseTeamRosterBackup(exportTeamRosterBackup([withExtras], time)).rosters[0]
  assert.deepEqual(projected, make('extras'))
  assert.throws(() => exportTeamRosterBackup([{ ...make('giant'), id: 'x'.repeat(TEAM_ROSTER_BACKUP_MAX_BYTES) }], time), /tooLarge/, 'an oversized export is rejected rather than producing an unimportable file')
})

check('selection capacity is atomic and cannot select duplicate or unknown rows', () => {
  const existing = Array.from({ length: 9 }, (_, index) => make(`existing-${index}`))
  const rows = previewTeamRosterImport(existing, [make('new-1'), make('new-2')], suffix, id)
  assert.throws(() => appendSelectedTeamRosters(existing, rows, rows.map(row => row.sourceId)), /limit/)
  assert.equal(existing.length, 9)
  assert.equal(appendSelectedTeamRosters(existing, rows, [rows[0].sourceId]).length, 10)
  assert.throws(() => appendSelectedTeamRosters(existing, rows, []), /emptySelection/)
  assert.throws(() => appendSelectedTeamRosters(existing, rows, ['missing']), /invalid/)
  const duplicate = previewTeamRosterImport([make('same')], [make('same')], suffix, id)
  assert.throws(() => appendSelectedTeamRosters([make('same')], duplicate, ['same']), /invalid/)
})

check('old save/update/delete and import share CAS, quota, readback and corrupt protections', () => {
  let raw: string | null = JSON.stringify([make('one')])
  const storage = { getItem: (key: string) => { assert.equal(key, TEAM_ROSTERS_KEY); return raw }, setItem: (key: string, value: string) => { assert.equal(key, TEAM_ROSTERS_KEY); raw = value } }
  const original = raw
  assert.equal(writeTeamRosters([make('one'), make('two')], original, storage).ok, true)
  const saved = raw
  assert.deepEqual(writeTeamRosters([], original, storage), { ok: false, error: 'conflict' }); assert.equal(raw, saved)
  assert.equal(writeTeamRosters([make('two')], raw, storage).ok, true)
  raw = '{broken'
  assert.deepEqual(writeTeamRosters([], raw, storage), { ok: false, error: 'corrupt' }); assert.equal(raw, '{broken')
  const quota = new Error('full'); quota.name = 'QuotaExceededError'
  assert.deepEqual(writeTeamRosters([make('one')], null, { getItem: () => null, setItem: () => { throw quota } }), { ok: false, error: 'quota' })
  assert.deepEqual(writeTeamRosters([make('one')], null, { getItem: () => null, setItem: () => {} }), { ok: false, error: 'conflict' })
  assert.deepEqual(readTeamRosters({ getItem: () => { throw new Error('denied') } }), { ok: false, error: 'unavailable' })
  assert.deepEqual(parseTeamRosters(JSON.stringify([{ ...make('legacy'), ignored: true }])), [make('legacy')])
})

const navigatorDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'navigator')
try {
  Object.defineProperty(globalThis, 'navigator', { configurable: true, value: {} })
  assert.equal(await withTeamRosterLock(() => 1), 1)
  let calls = 0
  Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { locks: { request: async (key: string, options: { mode: string }, action: () => number) => { assert.equal(key, TEAM_ROSTERS_KEY); assert.equal(options.mode, 'exclusive'); calls++; return action() } } } })
  assert.equal(await withTeamRosterLock(() => 2), 2); assert.equal(calls, 1)
  checks++; console.log('PASS shared Web Locks and checked fallback')
} finally {
  if (navigatorDescriptor) Object.defineProperty(globalThis, 'navigator', navigatorDescriptor)
  else Reflect.deleteProperty(globalThis, 'navigator')
}
console.log(`Team roster backup: ${checks} groups passed`)
