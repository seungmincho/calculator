import assert from 'node:assert/strict'
import { attendingTeamMembers, setTeamAttendance } from '../../../src/utils/teamAttendance.ts'
import { distributeTeams, encodeTeamBoard, parseTeamBoard } from '../../../src/utils/teamBoard.ts'
import { createTeamRotation, hasMatchingTeamRoster } from '../../../src/utils/teamRotation.ts'
import { readTeamRosters, writeTeamRosters, type TeamRoster } from '../../../src/utils/teamRosters.ts'
import { exportTeamRosterBackup, parseTeamRosterBackup } from '../../../src/utils/teamRosterBackup.ts'

let checked = 0
const check = (name: string, run: () => void) => { run(); checked++; console.log(`PASS ${name}`) }
const names = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']
const skills = Object.fromEntries(names.map((name, index) => [name, index % 5 + 1]))
const missing = new Set(['A', 'D', 'G'])
const attendees = attendingTeamMembers(names, missing)
const roster: TeamRoster = { id: 'all', title: 'Full roster', names, skills, teamCount: 2, mode: 'balanced', updatedAt: 1 }
const rng = (seed: number) => () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296 }

check('selection preserves roster order, inactive names, and immutable prior state', () => {
  const snapshot = JSON.stringify({ names, missing: [...missing] })
  assert.deepEqual(attendees, ['B', 'C', 'E', 'F', 'H'])
  const next = setTeamAttendance(missing, 'B', false)
  assert.deepEqual(attendingTeamMembers(names, next), ['C', 'E', 'F', 'H'])
  assert.equal(JSON.stringify({ names, missing: [...missing] }), snapshot)
})

check('removal and re-add use exact names, including object property names', () => {
  const special = ['__proto__', 'constructor', 'toString', '가', '가나']
  const absent = new Set(['__proto__', '가', 'removed elsewhere'])
  assert.deepEqual(attendingTeamMembers(special, absent), ['constructor', 'toString', '가나'])
  assert.deepEqual(attendingTeamMembers(special, setTeamAttendance(absent, '__proto__', true)), ['__proto__', 'constructor', 'toString', '가나'])
})

check('absent locked members from a prior full board cannot return in automatic modes', () => {
  const previous = [['A', 'B', 'C', 'D'], ['E', 'F', 'G', 'H']]
  for (const balanced of [false, true]) {
    const teams = distributeTeams(attendees, 2, skills, balanced, previous, ['A', 'B', 'G'], rng(9))
    assert.deepEqual(teams.flat().sort(), [...attendees].sort())
    assert.ok(teams[0].includes('B'))
    assert.ok(!teams.flat().some(name => missing.has(name)))
  }
})

check('captain and pool order are taken from attendance, including no remaining pool', () => {
  assert.deepEqual(attendees.slice(0, 2), ['B', 'C'])
  assert.deepEqual(attendees.slice(2), ['E', 'F', 'H'])
  const exactlyTwo = attendingTeamMembers(names, new Set(names.filter(name => !['C', 'F'].includes(name))))
  assert.deepEqual(exactlyTwo.slice(0, 2), ['C', 'F'])
  assert.deepEqual(exactlyTwo.slice(2), [])
})

check('rotation rejects an older full board and accepts an attended board with locks', () => {
  const previous = distributeTeams(names, 2, skills, true, [], [], rng(2))
  assert.equal(hasMatchingTeamRoster(attendees, 2, previous), false)
  assert.equal(createTeamRotation(attendees, 2, skills, 'balanced', previous), null)
  for (const mode of ['random', 'balanced'] as const) {
    const presentBoard = distributeTeams(attendees, 2, skills, mode === 'balanced', [], [], rng(3))
    const fixed = presentBoard[0][0]
    const next = createTeamRotation(attendees, 2, skills, mode, presentBoard, [fixed], rng(4))!
    assert.ok(next.teams[0].includes(fixed))
    assert.deepEqual(next.teams.flat().sort(), [...attendees].sort())
  }
})

check('shared boards project absent skill entries out in all three result modes', () => {
  for (const mode of ['random', 'balanced', 'captain'] as const) {
    const teams = [attendees.slice(0, 2), attendees.slice(2)]
    const code = encodeTeamBoard({ teams, skills: Object.fromEntries(attendees.map(name => [name, skills[name]])), mode })!
    const restored = parseTeamBoard(code)!
    assert.deepEqual(restored.teams, teams)
    assert.deepEqual(Object.keys(restored.skills).sort(), [...attendees].sort())
    assert.ok(!Object.keys(JSON.parse(decodeURIComponent(code)).skills).some(name => missing.has(name)))
  }
})

check('zero and too few attendees never produce an automatic board', () => {
  for (const present of [[], ['B']]) for (const balanced of [false, true]) {
    assert.deepEqual(distributeTeams(present, 2, skills, balanced), [])
    assert.equal(createTeamRotation(present, 2, skills, balanced ? 'balanced' : 'random', [[], []]), null)
  }
})

check('full-name save/update/backup survives attendance and stale writers preserve newer roster', () => {
  let raw: string | null = null
  const storage = { getItem: () => raw, setItem: (_key: string, value: string) => { raw = value } }
  const saved = writeTeamRosters([roster], null, storage)
  assert.equal(saved.ok, true)
  if (!saved.ok) return
  const updated = writeTeamRosters([{ ...roster, skills: { ...skills, A: 5 }, updatedAt: 2 }], saved.raw, storage)
  assert.equal(updated.ok, true)
  if (!updated.ok) return
  assert.equal(updated.rosters[0].names.length, 8)
  assert.equal(updated.rosters[0].skills.A, 5)
  assert.deepEqual(writeTeamRosters([roster], saved.raw, storage), { ok: false, error: 'conflict' })
  assert.equal(raw, updated.raw)
  const loaded = readTeamRosters(storage)
  assert.equal(loaded.ok, true)
  if (!loaded.ok) return
  assert.deepEqual(attendingTeamMembers(loaded.rosters[0].names, new Set()), names)
  const restored = parseTeamRosterBackup(exportTeamRosterBackup(loaded.rosters, '2026-11-16T00:00:00.000Z')).rosters[0]
  assert.deepEqual(restored.names, names)
  assert.equal(restored.skills.A, 5)
  assert.equal(JSON.stringify(restored).includes('absent'), false)
})

check('all-attending original behavior and partial attendance hold at small and 200-name bounds', () => {
  for (const size of [2, 3, 7, 8, 17, 200]) {
    const full = Array.from({ length: size }, (_, index) => `member-${index}`)
    for (const count of [2, Math.min(8, size)]) {
      for (const balanced of [false, true]) {
        assert.deepEqual(distributeTeams(attendingTeamMembers(full, new Set()), count, {}, balanced, [], [], rng(7)), distributeTeams(full, count, {}, balanced, [], [], rng(7)))
        const absent = new Set(full.filter((_, index) => index % 3 === 0))
        const present = attendingTeamMembers(full, absent)
        const board = distributeTeams(present, count, {}, balanced, [], [], rng(8))
        assert.deepEqual(board.flat().sort(), present.length < count ? [] : [...present].sort())
      }
    }
  }
})

console.log(`${checked} independent attendance checks passed`)
