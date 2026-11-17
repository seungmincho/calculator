// node scripts/check-fuel-trip.ts
import assert from 'node:assert/strict'
import { calculateTripCosts, fuelNumber, logFuelCost } from '../src/utils/fuelTrip.ts'

// Round-trip distance doubles fuel, while tolls and parking are already whole-trip totals.
const trip = calculateTripCosts((200 / 14.5) * 1700, 6000, 3000, 4)
assert.equal(trip.total, 32448)
assert.equal(trip.perPerson, 8112)
assert.equal(trip.remainder, 0)
const uneven = calculateTripCosts(11034.48, 6000, 3000, 4)
assert.equal(uneven.total, 20034)
assert.equal(uneven.perPerson, 5008)
assert.equal(uneven.lastPerson, 5010)
// No rounding loss, including more people than whole won and 1-person settlement.
for (const total of [0, 1, 3, 101, 20034, 999999]) {
  for (const people of [1, 2, 4, 7, 100]) {
    const result = calculateTripCosts(total, 0, 0, people)
    assert.equal(result.perPerson * (people - 1) + result.lastPerson, total)
  }
}
// New logs do not change when the current price changes; old logs still estimate costs.
assert.equal(logFuelCost(11034, 18000), 11034)
assert.equal(logFuelCost(0, 18000), 0)
assert.equal(logFuelCost(undefined, 18000), 18000)
assert.equal(logFuelCost(NaN, 18000), 18000)
for (const bad of ['Infinity', '-1', '4oops', true, null, '', '1.5']) {
  assert.equal(fuelNumber(bad, 4, 1, 100, true), 4)
}
assert.equal(fuelNumber('0', 100, 0, 100000), 0)
assert.equal(fuelNumber('14.5', 12, .1, 100), 14.5)
console.log('check-fuel-trip OK: trip totals, whole-won shares, saved/legacy logs and invalid inputs')
