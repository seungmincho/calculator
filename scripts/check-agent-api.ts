/* eslint-disable @typescript-eslint/no-explicit-any -- 검사 스크립트: API 응답 JSON을 느슨하게 읽는다 */
// Compile with esbuild, then run (netSalary imports without .ts extensions):
//   node node_modules/esbuild/bin/esbuild scripts/check-agent-api.ts --bundle --platform=node --format=cjs --outfile=node_modules/.cache/checks/check-agent-api.cjs && node node_modules/.cache/checks/check-agent-api.cjs
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

// retirement = check-retirement.ts 같은 예 (5년, 월 300만원)
const rt = ok('retirement', 'start=2021-03-02&end=2026-03-02&pay=3000000')
assert.deepEqual([rt.serviceDays, rt.retirementPay, rt.eligible, rt.net], [1826, 15_008_219, true, 15_008_219 - rt.tax.total])
assert.match(rt.page, /retirement-calculator\/\?s=2021-03-02&e=2026-03-02&pay=3000000/)
const short = ok('retirement', 'start=2026-01-02&end=2026-12-31&pay=3000000')
assert.deepEqual([short.eligible, short.retirementPay, short.eligibleFromEnd], [false, 0, '2027-01-02'])
// unemployment: 상한·하한·소정급여일수 (고용보험법 별표 1, 시행령 제68조)
const ub = ok('unemployment', 'pay=6000000&age=45&years=4&leave=2026-10-31')
assert.deepEqual([ub.dailyBenefit, ub.applied, ub.benefitDays, ub.total], [68_100, 'cap', 180, 68_100 * 180])
assert.deepEqual(ub.earliestDates, { apply: '2026-11-01', paidFrom: '2026-11-08', lastPaidDay: '2027-05-06' })
const ub2 = ok('unemployment', 'daily=50000&age=55&years=12&leave=2027-01-04')
assert.deepEqual([ub2.dailyBenefit, ub2.applied, ub2.benefitDays], [68_480, 'floor', 270])
assert.match(ub2.page, /mode=day&amt=50000&age=over50&period=over10/)
// minimum wage: 209시간, 단시간 주휴
const mw = ok('minimum-wage', 'year=2027')
assert.deepEqual([mw.hourly, mw.monthlyHours, mw.monthly, mw.raise.diff], [10_700, 209, 2_236_300, 380])
assert.equal(ok('minimum-wage', '').year, 2026, 'defaults to current year')
const pt = ok('minimum-wage', 'year=2026&weeklyHours=20&days=5')
assert.deepEqual([pt.weeklyHolidayHours, pt.page.endsWith('?y=2026&m=pt&h=20&d=5')], [4, true])
assert.equal(ok('minimum-wage', 'year=2026&weeklyHours=10&days=5').weeklyHolidayHours, 0, '15시간 미만 주휴 없음')

// Trust boundary: invalid input → 400 with a message, unknown → 404
for (const [name, s] of [['salary', ''], ['salary', 'annual=-1'], ['salary', 'annual=abc'], ['salary', 'annual=50000000&year=2030'], ['salary', 'annual=50000000&dependents=2&children=5'],
  ['four-insurance', 'pay=100000&nonTaxable=200000'], ['four-insurance', 'pay=3000000&size=huge'], ['four-insurance', 'pay=3000000&accident=50'],
  ['age', 'birth=2026-02-30'], ['age', 'birth=2030-01-01&on=2026-01-01'], ['age', 'year=1800'], ['sun', 'date=2026-13-01'], ['sun', 'lat=51.5&lon=-0.1'], ['sun', 'city=tokyo'],
  ['retirement', 'pay=3000000'], ['retirement', 'start=2026-05-01&end=2026-04-01&pay=3000000'], ['retirement', 'start=2021-03-02'], ['unemployment', 'pay=3000000&years=3'], ['unemployment', 'age=40&years=3'],
  ['unemployment', 'pay=3000000&age=40&years=3&hours=12'], ['minimum-wage', 'year=2024'], ['minimum-wage', 'weeklyHours=0']] as const) {
  const r = handleCalc(name, q(s)); assert.equal(r.status, 400, `${name}?${s} → ${r.status}`); assert.ok(typeof r.body.error === 'string')
}
assert.equal(handleCalc('loan', q('')).status, 404)
assert.equal(handleCalc('toString', q('')).status, 404, 'no prototype keys')
console.log('PASS: salary/four-insurance/age/sun/retirement/unemployment/minimum-wage match the pages, defaults, 22 invalid inputs → 400, unknown → 404')
