import assert from 'node:assert/strict'
import { performance } from 'node:perf_hooks'
import { distributeTeams, encodeTeamBoard, parseTeamBoard, rating } from '../src/utils/teamBoard.ts'
import { countRepeatedTeammatePairs, countTeammatePairs, createTeamRotation, hasMatchingTeamRoster, MAX_ROTATION_CANDIDATES, teamSizeGap, teamSkillGap } from '../src/utils/teamRotation.ts'

const rng = (seed: number) => () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296 }
const makeNames = (count: number) => Array.from({ length: count }, (_, index) => `참가자 ${index + 1}`)
const pairs = (teams: string[][]) => new Set(teams.flatMap(team => team.flatMap((name, index) => team.slice(index + 1).map(other => JSON.stringify([name, other].sort())))))
const bruteRepeats = (teams: string[][], previous: string[][]) => {
  const previousPairs = pairs(previous)
  return [...pairs(teams)].filter(pair => previousPairs.has(pair)).length
}

const four = [['가', '나'], ['다', '라']]
assert.equal(countTeammatePairs(four), 2)
assert.equal(countRepeatedTeammatePairs(four, four), 2)
assert.equal(countRepeatedTeammatePairs([['라', '다'], ['나', '가']], four), 2, 'team numbering does not affect pairs')
assert.equal(countRepeatedTeammatePairs([['가', '다'], ['나', '라']], four), 0)
assert.equal(countRepeatedTeammatePairs([['가', '다', '나'], ['라']], four), 1, 'manual moves use actual pairs')
assert.equal(countRepeatedTeammatePairs([], four), 0)
for (const mode of ['random', 'balanced'] as const) {
  const result = createTeamRotation(four.flat(), 2, {}, mode, four, [], rng(7))!
  assert.equal(result.repeatedPairs, 0, 'a four-person rotation avoids all previous teammate pairs')
  assert.equal(result.previousPairs, 2)
  assert.equal(result.candidatesTried, MAX_ROTATION_CANDIDATES)
}

const invalidInputs = [
  { names: ['가', '가', '다', '라'], count: 2, teams: four },
  { names: four.flat(), count: 3, teams: four },
  { names: four.flat(), count: 2, teams: [['가', '나'], ['다']] },
  { names: four.flat(), count: 2, teams: [['가', '나'], ['다', '외부']] },
  { names: four.flat(), count: 2, teams: [['가', '나'], ['다', '가']] },
  { names: ['가', ''], count: 2, teams: [['가'], ['']] },
  { names: makeNames(201), count: 2, teams: [makeNames(201), []] },
  { names: four.flat(), count: 1, teams: [four.flat()] },
  { names: four.flat(), count: 2.5, teams: four },
  { names: makeNames(9), count: 9, teams: makeNames(9).map(name => [name]) },
]
for (const { names, count, teams } of invalidInputs) {
  assert.equal(hasMatchingTeamRoster(names, count, teams), false)
  assert.equal(createTeamRotation(names, count, {}, 'random', teams), null)
}
assert.equal(createTeamRotation(four.flat(), 2, {}, 'random', four, ['명단 밖']), null)
assert.ok(hasMatchingTeamRoster([...four.flat()].reverse(), 2, four), 'roster order may change')

const uneven = [['가', '나', '다', '라', '마'], ['바']]
const fixed = createTeamRotation(uneven.flat(), 2, {}, 'random', uneven, uneven[0], rng(9))!
assert.equal(fixed.balanceLimited, true)
assert.equal(teamSizeGap(fixed.teams), 4)
assert.deepEqual(fixed.teams, uneven)
assert.equal(fixed.repeatedPairs, 10)
const allLocked = createTeamRotation(four.flat(), 2, {}, 'balanced', four, four.flat(), rng(10))!
assert.deepEqual(allLocked.teams, four)
assert.equal(allLocked.repeatedPairs, 2)
assert.equal(allLocked.balanceLimited, false)

let scenarios = 0
const started = performance.now()
for (const size of [2, 3, 4, 5, 6, 7, 8, 9, 16, 17, 23, 50, 101, 199, 200]) {
  for (let count = 2; count <= Math.min(8, size); count++) {
    const names = makeNames(size)
    const skills = Object.fromEntries(names.map((name, index) => [name, index % 5 + 1]))
    const previous = distributeTeams(names, count, skills, false, [], [], rng(size * count))
    for (const mode of ['random', 'balanced'] as const) {
      const locked = previous.filter(team => team.length).map(team => team[0])
      const snapshot = JSON.stringify({ names, skills, previous, locked })
      const seed = 1234 + size * count
      const baseline = distributeTeams(names, count, skills, mode === 'balanced', previous, locked, rng(seed))
      const result = createTeamRotation(names, count, skills, mode, previous, locked, rng(seed))!
      assert.deepEqual(result.teams.flat().sort(), [...names].sort())
      assert.equal(new Set(result.teams.flat()).size, size)
      assert.ok(teamSizeGap(result.teams) <= 1)
      assert.equal(result.balanceLimited, false)
      for (const name of locked) assert.equal(result.teams.findIndex(team => team.includes(name)), previous.findIndex(team => team.includes(name)))
      assert.equal(result.repeatedPairs, bruteRepeats(result.teams, previous))
      assert.equal(result.previousPairs, pairs(previous).size)
      assert.ok(result.repeatedPairs <= bruteRepeats(baseline, previous), 'baseline is always a selectable candidate')
      assert.equal(result.candidatesTried, 40)
      if (mode === 'balanced') {
        assert.equal(result.baselineSkillGap, teamSkillGap(baseline, skills))
        assert.ok(teamSkillGap(result.teams, skills) <= result.baselineSkillGap!)
      } else assert.equal(result.baselineSkillGap, null)
      assert.equal(JSON.stringify({ names, skills, previous, locked }), snapshot, 'rotation never mutates its input')
      const board = { teams: result.teams, skills: Object.fromEntries(names.map(name => [name, rating(skills, name)])), mode }
      assert.deepEqual(parseTeamBoard(encodeTeamBoard(board)!), board)
      scenarios++
    }
  }
}

// Larger fixed groups still produce the smallest achievable size gap without losing anyone.
for (const count of [2, 3, 8]) {
  const names = makeNames(200)
  const previous = [names.slice(0, 150), ...Array.from({ length: count - 1 }, (_, index) => names.slice(150).filter((_, i) => i % (count - 1) === index))]
  const result = createTeamRotation(names, count, {}, 'random', previous, previous[0], rng(count))!
  assert.equal(result.balanceLimited, true)
  assert.equal(teamSizeGap(result.teams), 150 - Math.floor(50 / (count - 1)))
  assert.deepEqual(result.teams.flat().sort(), [...names].sort())
}

// Names are opaque values, including delimiters, Unicode and object-property names.
const special = [['__proto__', 'a|b'], ['a', 'constructor'], ['이름 😀', 'b|c']]
const specialResult = createTeamRotation(special.flat(), 3, {}, 'balanced', special, [], rng(23))!
assert.equal(specialResult.repeatedPairs, bruteRepeats(specialResult.teams, special))
console.log(`Team rotation: ${scenarios} range/lock/balance/share scenarios plus invalid inputs, exact pair counts and constrained teams passed (${Math.round(performance.now() - started)}ms)`)
