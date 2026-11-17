import assert from 'node:assert/strict'
import { distributeTeams, moveTeamMember, swapTeamMembers, parseTeamBoard, encodeTeamBoard } from '../src/utils/teamBoard.ts'
const names = Array.from({ length: 17 }, (_, i) => `멤버 ${i}`)
const skills = Object.fromEntries(names.map((n, i) => [n, i % 5 + 1]))
for (let count = 2; count <= 8; count++) for (const balanced of [false, true]) {
  const teams = distributeTeams(names, count, skills, balanced)
  assert.deepEqual(teams.flat().sort(), [...names].sort())
  assert.ok(Math.max(...teams.map(t => t.length)) - Math.min(...teams.map(t => t.length)) <= 1)
  const locked = teams.map(t => t[0])
  const next = distributeTeams(names, count, skills, balanced, teams, locked)
  for (const name of locked) assert.equal(next.findIndex(t => t.includes(name)), teams.findIndex(t => t.includes(name)))
}
const teams = [['가', '나'], ['다', '라']]
assert.equal(moveTeamMember(teams, '가', 1, ['가']), null)
assert.deepEqual(moveTeamMember(teams, '가', 1, []), [['나'], ['다', '라', '가']])
assert.deepEqual(swapTeamMembers(teams, '가', '라', []), [['라', '나'], ['다', '가']])
assert.equal(swapTeamMembers(teams, '가', '라', ['라']), null)
assert.deepEqual(teams, [['가', '나'], ['다', '라']], 'operations never mutate their input')
assert.equal(parseTeamBoard('%broken'), null)
assert.equal(parseTeamBoard(encodeURIComponent(JSON.stringify({ teams: [['가'], ['가']], skills: {}, mode: 'random' }))), null)
const board = { teams, skills: { 가: 1, 나: 2, 다: 3, 라: 4 }, mode: 'balanced' as const }
assert.deepEqual(parseTeamBoard(encodeTeamBoard(board)!), board)
console.log('Team board: distribution, locks, moves, swaps, sharing validation passed')
