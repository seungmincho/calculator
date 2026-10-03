// node scripts/check-fuel-price-fallback.ts
import assert from 'node:assert/strict'
import { fuelPriceFallback } from '../src/utils/fuelPriceFallback.ts'

assert.deepEqual(fuelPriceFallback('2026-10-03', '2026-05-31'), { requestedDate: '2026-10-03', actualDate: '2026-05-31' })
assert.deepEqual(fuelPriceFallback('2026-01-01', '2025-12-31'), { requestedDate: '2026-01-01', actualDate: '2025-12-31' })
assert.equal(fuelPriceFallback('2026-10-03', '2026-10-03'), null)
assert.equal(fuelPriceFallback(undefined, '2026-10-03'), null) // 실시간 조회
assert.equal(fuelPriceFallback('', '2026-10-03'), null)
assert.equal(fuelPriceFallback('2026-10-03', '2026-10-04'), null)
for (const date of ['', 'bad', '2026-02-29', '2026-13-01', '2026-00-01']) {
  assert.equal(fuelPriceFallback('2026-10-03', date), null)
  assert.equal(fuelPriceFallback(date, '2026-05-31'), null)
}
console.log('check-fuel-price-fallback OK: exact, earlier, missing and invalid dates')
