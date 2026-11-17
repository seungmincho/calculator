import assert from 'node:assert/strict'
import { attendingTeamMembers, setTeamAttendance } from '../src/utils/teamAttendance.ts'
import { distributeTeams, encodeTeamBoard, parseTeamBoard } from '../src/utils/teamBoard.ts'
import { createTeamRotation, hasMatchingTeamRoster } from '../src/utils/teamRotation.ts'
import { exportTeamRosterBackup, parseTeamRosterBackup } from '../src/utils/teamRosterBackup.ts'
import { parseTeamRosters, type TeamRoster } from '../src/utils/teamRosters.ts'

const fullNames = ['첫 번째', '두 번째', '세 번째', '네 번째', '다섯 번째', '여섯 번째']
const skills = Object.fromEntries(fullNames.map((name, index) => [name, index % 5 + 1]))
const roster: TeamRoster = { id: 'full', title: '전체 모임', names: [...fullNames], skills, teamCount: 2, mode: 'balanced', updatedAt: 12345 }
const original = JSON.stringify(roster)
const present = new Set<string>()
assert.deepEqual(attendingTeamMembers(fullNames, present), fullNames)
const absent = setTeamAttendance(setTeamAttendance(present, fullNames[0], false), fullNames[3], false)
const attendees = attendingTeamMembers(fullNames, absent)
assert.deepEqual(attendees, [fullNames[1], fullNames[2], fullNames[4], fullNames[5]])
assert.equal(present.size, 0, 'attendance changes never mutate the prior set')
assert.equal(absent.size, 2)
assert.deepEqual(attendingTeamMembers(fullNames, setTeamAttendance(absent, fullNames[0], true)), fullNames.filter(name => name !== fullNames[3]))
assert.deepEqual(attendingTeamMembers(fullNames, new Set(fullNames)), [])

for (const mode of ['random', 'balanced'] as const) {
  const teams = distributeTeams(attendees, 2, skills, mode === 'balanced')
  assert.deepEqual(teams.flat().sort(), [...attendees].sort())
  assert.ok(hasMatchingTeamRoster(attendees, 2, teams))
  assert.equal(hasMatchingTeamRoster(fullNames, 2, teams), false, 'full stored roster must not be used as the rotation roster')
  const rotation = createTeamRotation(attendees, 2, skills, mode, teams, [teams[0][0]])!
  assert.deepEqual(rotation.teams.flat().sort(), [...attendees].sort())
  assert.ok(rotation.teams[0].includes(teams[0][0]))
  const shared = parseTeamBoard(encodeTeamBoard({ teams: rotation.teams, skills, mode })!)!
  assert.deepEqual(shared.teams.flat().sort(), [...attendees].sort())
  assert.deepEqual(Object.keys(shared.skills).sort(), [...attendees].sort())
}

// The captain draft takes its captains from the attending order, with every other attendee in the pool.
const captainNames = attendees.slice(0, roster.teamCount)
const captainPool = attendees.slice(roster.teamCount)
assert.deepEqual(captainNames, [fullNames[1], fullNames[2]])
assert.equal(new Set([...captainNames, ...captainPool]).size, attendees.length)
assert.equal(distributeTeams(attendingTeamMembers(fullNames, new Set(fullNames.slice(1))), 2, skills, false).length, 0)

// Saved rosters and backups contain the complete group even while two people are absent today.
assert.equal(JSON.stringify(roster), original)
assert.deepEqual(parseTeamRosters(JSON.stringify([roster]))[0].names, fullNames)
const restored = parseTeamRosterBackup(exportTeamRosterBackup([roster], '2026-11-16T12:00:00.000Z')).rosters[0]
assert.deepEqual(restored.names, fullNames)
assert.deepEqual(restored.skills, skills)
assert.deepEqual(attendingTeamMembers(restored.names, new Set()), fullNames, 'loaded rosters start with everyone attending')

// A removed member re-added later is present by default, including names resembling object properties.
const specialNames = ['__proto__', 'constructor', '참석자']
const priorAbsent = new Set(['__proto__'])
assert.deepEqual(attendingTeamMembers(specialNames, setTeamAttendance(priorAbsent, '__proto__', true)), specialNames)
const twoHundred = Array.from({ length: 200 }, (_, index) => `참가자 ${index}`)
const half = attendingTeamMembers(twoHundred, new Set(twoHundred.filter((_, index) => index % 2 === 0)))
assert.equal(half.length, 100)
assert.deepEqual(distributeTeams(half, 8, {}, true).flat().sort(), [...half].sort())
console.log('Team attendance: selection, both automatic modes, captain order, rotation/locks, sharing, full-roster backup and 200-member boundaries passed')
