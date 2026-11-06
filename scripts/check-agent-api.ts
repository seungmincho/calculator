// Compile with esbuild, then run (netSalary imports without .ts extensions):
//   node node_modules/esbuild/bin/esbuild scripts/check-agent-api.ts --bundle --platform=node --format=cjs --outfile=<tmp>/check-agent-api.cjs && node <tmp>/check-agent-api.cjs
import assert from 'node:assert/strict'
import { handleCalc } from '../src/lib/agentApi.ts'

const q = (s: string) => new URLSearchParams(s)
const ok = (name: string, s: string) => { const r = handleCalc(name, q(s), Date.parse('2026-11-06T03:00:00Z')); assert.equal(r.status, 200, JSON.stringify(r.body)); return r.body as Record<string, any> }

// Same numbers as the pages (salary table FAQ, four-insurance FAQ, KASI check)
const s26 = ok('salary', 'annual=50000000'), s27 = ok('salary', 'annual=50000000&year=2027')
assert.deepEqual([s26.monthly.net, s27.monthly.net, s26.year, s27.year], [3_571_528, 3_560_528, 2026, 2027])
assert.match(s27.page, /salary=50000000.*&year=2027$/); assert.equal(s27.rates.employmentProposedNotInForce, 0.01)
assert.equal(ok('salary', 'monthly=3000000').input.annual, 36_000_000)
assert.equal(ok('salary', 'annual=50,000,000&dependents=4&children=2').input.children, 2)
const f26 = ok('four-insurance', 'pay=3000000'), f27 = ok('four-insurance', 'pay=3000000&year=2027')
assert.deepEqual([f26.employee, f26.employer, f27.employee, f27.employer, f26.laborCost], [272_080, 320_240, 279_850, 328_010, 3_320_240])
assert.equal(f27.proposedEmploymentIncreaseEachSide, 2_800)
const a = ok('age', 'birth=1990-05-01&on=2027-01-01')
assert.deepEqual([a.internationalAge, a.yearAge, a.countingAge, a.zodiac.animal, a.elementarySchoolEntry], [36, 37, 38, 'horse', 1997])
assert.equal(ok('age', 'birth=2002-02-01&on=2026-11-06').earlyEntry, true)
const y = ok('age', 'year=1991&on=2027-06-01')
assert.deepEqual([y.internationalAge.afterBirthday, y.zodiac.ganzi, y.zodiac.animal], [36, '신미', 'goat'])
assert.equal(ok('sun', 'date=2026-01-01&city=seoul').sunrise, '07:47')
assert.equal(ok('sun', 'date=2026-01-01&lat=35.359&lon=129.36').sunrise, '07:31')
assert.equal(ok('sun', '').date, '2026-11-06', 'defaults to today KST')

// Trust boundary: invalid input → 400 with a message, unknown → 404
for (const [name, s] of [['salary', ''], ['salary', 'annual=-1'], ['salary', 'annual=abc'], ['salary', 'annual=50000000&year=2030'], ['salary', 'annual=50000000&dependents=2&children=5'],
  ['four-insurance', 'pay=100000&nonTaxable=200000'], ['four-insurance', 'pay=3000000&size=huge'], ['four-insurance', 'pay=3000000&accident=50'],
  ['age', 'birth=2026-02-30'], ['age', 'birth=2030-01-01&on=2026-01-01'], ['age', 'year=1800'], ['sun', 'date=2026-13-01'], ['sun', 'lat=51.5&lon=-0.1'], ['sun', 'city=tokyo']] as const) {
  const r = handleCalc(name, q(s)); assert.equal(r.status, 400, `${name}?${s} → ${r.status}`); assert.ok(typeof r.body.error === 'string')
}
assert.equal(handleCalc('loan', q('')).status, 404)
console.log('PASS: salary/four-insurance/age/sun match the pages (2026·2027), defaults, 14 invalid inputs → 400, unknown → 404')
