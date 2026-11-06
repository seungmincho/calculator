// node scripts/check-age-table.ts (Node 24 strips types). Pure calculation.
import assert from 'node:assert/strict'
import { ageRows, yearInfo, seollalOf, FIRST_YEAR } from '../src/utils/ageTable.ts'

assert.deepEqual([yearInfo(2026).ganzi, yearInfo(2026).zodiac, yearInfo(2026).color], ['병오', 'horse', 'red'], '2026 붉은 말')
assert.deepEqual([yearInfo(2027).ganzi, yearInfo(2027).zodiac, yearInfo(2027).color], ['정미', 'goat', 'red'], '2027 붉은 양')
assert.deepEqual([yearInfo(2024).ganzi, yearInfo(2024).color], ['갑진', 'blue'], '2024 푸른 용')
assert.equal(yearInfo(1984).ganzi, '갑자')
const rows = ageRows(2026)
assert.equal(rows[0].year, 2027); assert.equal(rows.at(-1)!.year, FIRST_YEAR)
const r1991 = rows.find(r => r.year === 1991)!
assert.deepEqual([r1991.manNext, r1991.manBase, r1991.yeonNext, r1991.school, r1991.zodiac], [36, 35, 36, 1998, 'goat'])
assert.equal(rows[0].manBase, null, '2027년생은 2026년에 아직 없음')
assert.deepEqual(rows.filter(r => r.zodiac === 'goat').map(r => r.year), [2027, 2015, 2003, 1991, 1979, 1967, 1955, 1943, 1931])
assert.equal(rows.find(r => r.year === 2020)!.school, 2027, '2027년 초등 입학 = 2020년생')
assert.equal(seollalOf(2027), '2027-02-07'); assert.equal(seollalOf(2026), '2026-02-17'); assert.equal(seollalOf(2002), '2002-02-12'); assert.equal(seollalOf(1930), '1930-01-30')
console.log('PASS: ganzi/zodiac/colors, ages for 2026→2027, goat years, school entry, seollal dates')
