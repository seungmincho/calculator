// node scripts/check-four-insurance.ts (Node 24 strips types). Pure calculation.
import assert from 'node:assert/strict'
import { fourInsurance, STABILITY_RATE, ACCIDENT_AVG } from '../src/utils/fourInsurance.ts'
import { INSURANCE_BY_YEAR, insuranceYearAt } from '../src/utils/insuranceRates.ts'

// 월급 300만원 − 식대 20만원 = 보수월액 280만원
const a = fourInsurance(2_800_000, 2026, 'under150', ACCIDENT_AVG)!
assert.deepEqual(a.rows.pension, { employee: 133_000, employer: 133_000 })   // 280만 × 4.75%
assert.deepEqual(a.rows.health, { employee: 100_660, employer: 100_660 })    // 280만 × 7.19% ÷ 2
assert.equal(a.rows.ltc.employee, 13_220)                                    // 100,660 × 13.14% = 13,226.7
assert.equal(a.rows.employment.employee, 25_200)                             // 280만 × 0.9%
assert.deepEqual([a.rows.stability.employer, a.rows.accident.employer], [7_000, 41_160])
assert.equal(a.employee, 133_000 + 100_660 + 13_220 + 25_200)
assert.equal(3_000_000 + a.employer, 3_320_240, 'guide: labor cost of a 3.0M (incl. 0.2M meals) employee')

const b = fourInsurance(2_800_000, 2027, 'under150', ACCIDENT_AVG)!
assert.equal(b.rows.pension.employee, 140_000)                               // 5%
assert.equal(b.rows.ltc.employee, 13_990)                                    // 100,660 × 13.90% = 13,991.7
assert.equal(b.rows.health.employee, a.rows.health.employee, 'health frozen')
assert.equal(b.proposedExtra, 2_800, 'proposed 1.0% vs 0.9%')
assert.equal(a.proposedExtra, 0)

// Pension cap/floor, health cap, company size, invalid input
const rich = fourInsurance(20_000_000, 2026, 'large', 0)!
assert.equal(rich.pensionClamp, 'cap'); assert.equal(rich.rows.pension.employee, Math.floor(6_590_000 * 0.0475 / 10) * 10)
assert.equal(rich.rows.stability.employer, 20_000_000 * STABILITY_RATE.large)
const huge = fourInsurance(500_000_000, 2026, 'mid', 0)!
assert.equal(huge.healthClamp, true); assert.equal(huge.rows.health.employee, 9_183_480 / 2)
const low = fourInsurance(300_000, 2027, 'under150', 0)!
assert.equal(low.pensionClamp, 'floor'); assert.equal(low.rows.pension.employee, 410_000 * 0.05)
assert.equal(fourInsurance(0, 2026, 'under150', 0.01), null)
assert.equal(fourInsurance(2_800_000, 2026, 'under150', -1)!.rows.accident.employer, 0)

// Year switch at 2027-01-01 00:00 KST; 2027 long-term care = 0.9994% of pay
assert.equal(insuranceYearAt(Date.parse('2026-12-31T23:59:59+09:00')), 2026)
assert.equal(insuranceYearAt(Date.parse('2027-01-01T00:00:00+09:00')), 2027)
assert.ok(Math.abs(INSURANCE_BY_YEAR[2027].healthRateTotal * INSURANCE_BY_YEAR[2027].longTermCareRate - 0.009994) < 1e-6)
assert.ok(Math.abs(INSURANCE_BY_YEAR[2026].healthRateTotal * INSURANCE_BY_YEAR[2026].longTermCareRate - 0.009448) < 2e-6)
console.log(`PASS: 2026/2027 items for 2.8M (employee ${a.employee} → ${b.employee}, employer ${a.employer} → ${b.employer}), caps/floors, sizes, proposed rate, Jan 1 switch`)
