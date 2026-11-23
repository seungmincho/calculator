// 원 단위 내림 보정 회귀 체크: node scripts/check-won.ts
import assert from 'node:assert/strict'
import { floorWon, floor10Won } from '../src/utils/won.ts'

// 요율 곱이 정수인데 부동소수로 그 바로 아래가 되는 사례 → 정확한 값
assert.equal(Math.floor(47_600_000 * 0.009), 428_399) // 보정 없을 때의 오차(이 assert 가 깨지면 엔진이 바뀐 것)
assert.equal(floorWon(47_600_000 * 0.009), 428_400)
assert.equal(floorWon(180 * 0.35), 63)
assert.equal(floorWon(90 * 0.7), 63)
assert.equal(floorWon(5_000 * 22.6226), 113_113) // 가스 5,000MJ
assert.equal(floorWon(3_000_000 * (0.03 / 100)), 900) // 퍼센트 입력
assert.equal(floorWon(75 * (0.32 + 0.36)), 51) // 1세대1주택 장기보유 보유 8년 + 거주 9년 = 68%
assert.equal(floor10Won(50_000 * 0.009), 450)
assert.equal(floor10Won(50_000 * 0.1314), 6_570)

// 정상 끝수는 그대로 내린다: 소수 6자리 요율(채권 = 가격 × 0.7 × n/1000 × 0.05)의 0.999999
assert.equal(floorWon(12_345.999999), 12_345)
assert.equal(floorWon(9_999_999.999999), 9_999_999)
assert.equal(floorWon(1_234_567_890.99), 1_234_567_890) // 큰 금액(12억대)도 0.01 끝수는 유지
assert.equal(floorWon(0), 0)
assert.equal(floorWon(0.5), 0)
assert.equal(floor10Won(449.99), 440)

// 실측: 정수 금액 × 요율의 정확한 내림(BigInt)과 전부 같다
const exact = (a: number, r: string) => { const [i, f = ''] = r.split('.'); return Number((BigInt(a) * BigInt(i + f)) / 10n ** BigInt(f.length)) }
for (const r of ['0.009', '0.35', '0.7', '0.1314', '0.0475', '0.03595', '0.0065'])
  for (let a = 1; a <= 200_000; a += 7) assert.equal(floorWon(a * Number(r)), exact(a, r), `${a} × ${r}`)
for (let a = 10_000; a <= 5_000_000_000; a += 9_990_001) assert.equal(floorWon(a * 0.68), exact(a, '0.68'), `${a} × 0.68`)

console.log('check-won OK')
