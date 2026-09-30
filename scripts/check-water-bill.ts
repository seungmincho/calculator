// 수도요금 회귀 체크: node scripts/check-water-bill.ts
import assert from 'node:assert/strict'
import { REGIONS, calcBill, tiered, savingWon, avgUsage, dailyLitersToM3 } from '../src/utils/waterBill.ts'

// 서울 4인 24㎥: 1,080 + 24×580 + 24×480 + 24×170 = 30,600
assert.deepEqual(calcBill(24, REGIONS.seoul), { basic: 1080, water: 13920, sewer: 11520, levy: 4080, total: 30600 })
// 서울 하수도 공식 예시: 1인 6㎥ 2,880원, 4인 24㎥ 11,520원
assert.equal(calcBill(6, REGIONS.seoul).sewer, 2880)

// 부산 하수도 공식 예시: 25㎥ → 10×580 + 10×750 + 5×790 = 17,250
assert.equal(tiered(25, REGIONS.busan.sewer), 17250)
// 부산 상수도 20㎥ → 18,400
assert.equal(calcBill(20, REGIONS.busan).water, 18400)
// 누진 경계·최상위 구간: 35㎥ → 5800+7500+7900+5×1110
assert.equal(tiered(35, REGIONS.busan.sewer), 26750)

// 0㎥ = 기본요금만, 음수는 0 처리
assert.equal(calcBill(0, REGIONS.seoul).total, 1080)
assert.equal(calcBill(-5, REGIONS.busan).total, 1200)

// 절감액: 서울은 단일요금 → 1㎥당 1,230원
assert.equal(savingWon(24, 1, REGIONS.seoul), 1230)
assert.equal(savingWon(0.5, 5, REGIONS.seoul), calcBill(0.5, REGIONS.seoul).total - 1080)

assert.equal(avgUsage(4), 24)
assert.equal(dailyLitersToM3(12, 4), 1.44)

console.log('check-water-bill: OK')
