// Independent review probes; no browser, product writes, or current-work storage access.
import assert from 'node:assert/strict'
import { exportTeamRosterBackup, parseTeamRosterBackup, previewTeamRosterImport, appendSelectedTeamRosters } from '../../../src/utils/teamRosterBackup.ts'
import { writeTeamRosters, type TeamRoster } from '../../../src/utils/teamRosters.ts'
import { serializeGpaScenarioBackup, parseGpaScenarioBackup, previewGpaScenarioBackup, mergeGpaScenarioBackup } from '../../../src/utils/gpaScenarioBackup.ts'
import { writeGpaScenarios, type GpaScenario, type GpaScenarioStore } from '../../../src/utils/gpaScenarios.ts'

let checks = 0, sequence = 0
const check = (name: string, action: () => void) => { action(); checks++; console.log(`PASS ${name}`) }
const fresh = () => `review-${++sequence}`
const suffix = (n: number) => ` (복사 ${n})`
const now = '2026-11-16T00:00:00.000Z'
const roster = (id: string, title: string, names = ['가', '나']): TeamRoster => ({ id, title, names, skills: Object.fromEntries(names.map(n => [n, 3])), teamCount: 2, mode: 'random', updatedAt: 1 })
const before = roster('source', '주말 모임'), incoming = roster('source', '주말 모임', ['가', '다'])
const preview = (existing: TeamRoster[], next: TeamRoster[]) => previewTeamRosterImport(existing, next, suffix, fresh)
const copied = preview([before], [incoming])[0].roster

check('team unchanged conflict copy survives export/import and deduplicates its source', () => {
  const exported = exportTeamRosterBackup([before, copied], now)
  const roundtrip = parseTeamRosterBackup(exported).rosters
  assert.deepEqual(roundtrip, [before, copied])
  assert.equal(preview(roundtrip, [incoming])[0].status, 'duplicate')
})
check('team user rename and edited-file rename are distinct from unchanged imported origins', () => {
  const renamed = { ...copied, title: '평일 모임' }
  assert.equal(preview([before, renamed], [incoming])[0].status, 'conflict')
  assert.equal(preview([before, copied], [renamed])[0].status, 'conflict')
})
check('team all body changes break origin dedupe but skill property ordering does not', () => {
  for (const patch of [{ names: [...copied.names].reverse() }, { skills: { ...copied.skills, 다: 5 } }, { mode: 'balanced' as const }]) {
    assert.equal(preview([before, { ...copied, ...patch }], [incoming])[0].status, 'conflict')
  }
  const reordered = { ...copied, skills: Object.fromEntries(Object.entries(copied.skills).reverse()) }
  assert.equal(preview([before, reordered], [incoming])[0].status, 'duplicate')
})
check('team same members in different original groups remain separate in either file order', () => {
  const groups = [roster('weekday', '평일'), roster('weekend', '주말')]
  for (const order of [groups, [...groups].reverse()]) assert.deepEqual(preview([], order).map(row => row.status), ['new', 'new'])
})
check('team selection order does not affect file order, overflow does not mutate inputs', () => {
  const existing = Array.from({ length: 9 }, (_, n) => roster(`old-${n}`, `모임 ${n}`))
  const rows = preview(existing, [roster('new-a', 'A'), roster('new-b', 'B')])
  const original = JSON.stringify(existing)
  assert.throws(() => appendSelectedTeamRosters(existing, rows, ['new-b', 'new-a']), /limit/)
  assert.equal(JSON.stringify(existing), original)
  assert.equal(appendSelectedTeamRosters(existing, rows, ['new-b']).at(-1)?.title, 'B')
})
check('team inherited-name keys and unknown fields are projected without prototype pollution', () => {
  const weird = roster('special', '특수 이름', ['__proto__', 'constructor'])
  const parsed = parseTeamRosterBackup(exportTeamRosterBackup([{ ...weird, extra: { pollution: true } } as TeamRoster], now))
  assert.deepEqual(parsed.rosters, [weird])
  assert.equal(({} as { pollution?: boolean }).pollution, undefined)
})
check('team future format and bad selection reject without touching source records', () => {
  const raw = exportTeamRosterBackup([incoming], now)
  assert.throws(() => parseTeamRosterBackup(raw.replace('"version":1', '"version":2')), /unsupported/)
  const rows = preview([before], [incoming])
  assert.throws(() => appendSelectedTeamRosters([before], rows, ['source', 'source']), /invalid/)
  assert.throws(() => appendSelectedTeamRosters([before], rows, ['missing']), /invalid/)
})
check('team quota and stale raw leave saved records untouched', () => {
  let raw = JSON.stringify([before]), writes = 0
  const storage = { getItem: () => raw, setItem: () => { writes++; const error = new Error('full'); error.name = 'QuotaExceededError'; throw error } }
  const original = raw
  assert.deepEqual(writeTeamRosters([before, copied], raw, storage), { ok: false, error: 'quota' })
  assert.equal(raw, original); assert.equal(writes, 1)
  raw = JSON.stringify([roster('newer', '다른 탭')])
  assert.deepEqual(writeTeamRosters([before], original, storage), { ok: false, error: 'conflict' })
  assert.equal(writes, 1)
})

const scenario = (id: string, name = id): GpaScenario => ({ id, name, createdAt: now, snapshot: { scale: '4.3', targetGpa: '4.2', remainingCredits: '18', semesters: [{ id: '학기', isExpanded: false, courses: [{ id: '과목', name: '수업\u0001😀', credits: 2.5, grade: 'A+', major: true, retake: true }] }] } })
const store = (scenarios: GpaScenario[]): GpaScenarioStore => ({ version: 1, revision: 'initial', scenarios })
const backup = (scenarios: GpaScenario[]) => parseGpaScenarioBackup(serializeGpaScenarioBackup(store(scenarios), new Date(now)))
check('GPA conflict copies change only outer ID and keep internal IDs and academic fields', () => {
  const original = scenario('same', '현재'), source = scenario('same', '새 학기')
  const base = store([original]), file = backup([source]), saved = JSON.stringify(base)
  assert.equal(previewGpaScenarioBackup(base, file)[0].status, 'conflict')
  const merged = mergeGpaScenarioBackup(base, file, ['same'], fresh)
  assert.notEqual(merged.scenarios[1].id, source.id)
  assert.deepEqual({ ...merged.scenarios[1], id: source.id }, source)
  assert.equal(JSON.stringify(base), saved)
  assert.equal(previewGpaScenarioBackup(merged, file)[0].status, 'duplicate')
})
check('GPA equivalent timestamps and property orders deduplicate canonically', () => {
  const a = scenario('one'), b = { ...a, id: 'two', createdAt: '2026-11-16T09:00:00+09:00' }
  const reordered = JSON.parse(JSON.stringify(b), (_key, value) => value && !Array.isArray(value) && typeof value === 'object' ? Object.fromEntries(Object.entries(value).reverse()) : value)
  assert.equal(previewGpaScenarioBackup(store([a]), backup([reordered]))[0].status, 'duplicate')
})
check('GPA every projected academic field and title changes remain importable', () => {
  const a = scenario('one')
  for (const change of [
    { ...a, name: '새 이름' },
    { ...a, snapshot: { ...a.snapshot, targetGpa: '3.0' } },
    { ...a, snapshot: { ...a.snapshot, remainingCredits: '15' } },
    { ...a, snapshot: { ...a.snapshot, semesters: [{ ...a.snapshot.semesters[0], courses: [{ ...a.snapshot.semesters[0].courses[0], retake: false }] }] } },
  ]) assert.equal(previewGpaScenarioBackup(store([a]), backup([change]))[0].status, 'conflict')
})
check('GPA nested unknown fields never reach storage projection', () => {
  const source = scenario('safe')
  const raw = JSON.parse(serializeGpaScenarioBackup(store([source]), new Date(now)))
  raw.scenarios[0].secret = 'drop'; raw.scenarios[0].snapshot.hidden = true
  raw.scenarios[0].snapshot.semesters[0].secret = true; raw.scenarios[0].snapshot.semesters[0].courses[0].secret = true
  assert.deepEqual(parseGpaScenarioBackup(JSON.stringify(raw)).scenarios, [source])
})
check('GPA capacity is atomic and invalid selections cannot be partly imported', () => {
  const base = store(Array.from({ length: 7 }, (_, n) => scenario(`old-${n}`)))
  const file = backup([scenario('new-a'), scenario('new-b')]), saved = JSON.stringify(base)
  assert.throws(() => mergeGpaScenarioBackup(base, file, ['new-a', 'new-b'], fresh), /limit/)
  assert.throws(() => mergeGpaScenarioBackup(base, file, ['new-a', 'missing'], fresh), /selection/)
  assert.equal(JSON.stringify(base), saved)
  assert.equal(mergeGpaScenarioBackup(base, file, ['new-b'], fresh).scenarios.length, 8)
})
check('GPA rejects internally duplicate IDs instead of changing retake identity', () => {
  const value = scenario('invalid')
  value.snapshot.semesters[0].courses[0].id = value.snapshot.semesters[0].id
  assert.throws(() => backup([value]), /invalidFile/)
})
check('GPA stale/quota protections write no current-autosave key', () => {
  const base = store([scenario('one')]), expected = JSON.stringify(base)
  let raw = expected, writes = 0
  const storage = { getItem: (key: string) => { assert.equal(key, 'toolhub-gpa-scenarios-v1'); return raw }, setItem: (key: string) => { assert.equal(key, 'toolhub-gpa-scenarios-v1'); writes++; const error = new Error('full'); error.name = 'QuotaExceededError'; throw error } }
  const next = mergeGpaScenarioBackup(base, backup([scenario('two')]), ['two'], fresh)
  assert.deepEqual(writeGpaScenarios(storage, expected, next), { ok: false, error: 'quota' }); assert.equal(raw, expected)
  raw = JSON.stringify(store([scenario('newer')]))
  assert.deepEqual(writeGpaScenarios(storage, expected, next), { ok: false, error: 'conflict' }); assert.equal(writes, 1)
})
console.log(`Independent team/GPA review: ${checks} groups passed`)
