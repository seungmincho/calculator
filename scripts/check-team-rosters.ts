import assert from 'node:assert/strict'
import { isTeamRoster, parseTeamRosters, MAX_TEAM_ROSTERS } from '../src/utils/teamRosters.ts'
const roster = { id: 'one', title: '모임', names: ['가', '나'], skills: { 가: 5, 나: 1 }, teamCount: 2, mode: 'balanced', updatedAt: 1 }
assert.ok(isTeamRoster(roster))
assert.deepEqual(parseTeamRosters(null), [])
assert.deepEqual(parseTeamRosters(JSON.stringify([roster])), [roster])
assert.throws(() => parseTeamRosters('{broken'))
assert.throws(() => parseTeamRosters(JSON.stringify([roster, roster])), 'duplicate ids rejected')
for (const invalid of [{ names: ['가', '가'] }, { skills: { 가: 99, 나: 1 } }, { teamCount: 8 }, { mode: 'invalid' }, { title: ' ' }, { names: [] }]) assert.ok(!isTeamRoster({ ...roster, ...invalid }))
assert.throws(() => parseTeamRosters(JSON.stringify(Array.from({ length: MAX_TEAM_ROSTERS + 1 }, (_, i) => ({ ...roster, id: String(i) })))))
const special = { ...roster, names: ['__proto__', 'constructor'], skills: Object.fromEntries([['__proto__', 3], ['constructor', 4]]) }
assert.ok(isTeamRoster(special), 'literal member names can resemble object properties')
assert.ok(!isTeamRoster({ ...special, skills: {} }), 'inherited fields are not skill ratings')
console.log('Team roster validation: 14 checks passed')
