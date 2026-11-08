// 해외주식 양도세 계산기(/overseas-stock-tax) 회귀 체크: node scripts/check-overseas-stock-tax.ts
// page.tsx 본문·FAQ 숫자는 EXAMPLES로 렌더링되므로 여기서 값을 고정한다.
import assert from 'node:assert/strict'
import { usTax } from '../src/utils/stock.ts'
import { analyze, gainOf, decodeRows, encodeRows, parseFee, feeRate, EXAMPLES, DEFAULT_ROWS, DEDUCTION, type Position } from '../src/utils/overseasStockTax.ts'

// ── 세액: (손익 − 250만원) × 20%, 지방소득세 = 과세표준 × 1천분의 20 (지방세법 §103의3①11호) — 정수 산술과 일치 ──
let seed = 7
const rnd = (n: number) => (seed = (seed * 1_103_515_245 + 12_345) % 2 ** 31) % n
for (let i = 0; i < 5000; i++) {
  const gain = rnd(2000) * 100_000 + rnd(100_000) - 20_000_000
  const base = Math.max(0, gain - DEDUCTION)
  const r = usTax(gain)
  assert.deepEqual([r.base, r.income, r.local], [base, Math.floor(base / 5), Math.floor(base / 50)], `usTax ${gain}`)
}
assert.equal(usTax(DEDUCTION).total, 0)
assert.equal(usTax(-5_000_000).total, 0)

// ── 수수료는 매수·매도 양쪽 필요경비 ──
assert.equal(gainOf({ name: '', sold: true, cost: 15_000_000, value: 25_000_000 }, 0.0025), 10_000_000 - 37_500 - 62_500)
assert.equal(gainOf({ name: '', sold: true, cost: 1_000, value: 1_000 }, 0), 0)
assert.equal(feeRate('99'), 0.05)
assert.equal(feeRate('abc'), 0)

// ── 기본값(EXAMPLES.d): 엔비디아 판 이익 990만, 테슬라 −405만·애플 +294.25만 보유 ──
{
  const r = analyze(EXAMPLES.d)
  assert.deepEqual(r.items.map((x) => x.gain), [9_900_000, -4_050_000, 2_942_500])
  assert.deepEqual([r.realized, r.tax.base, r.tax.income, r.tax.local, r.tax.total, r.status], [9_900_000, 7_400_000, 1_480_000, 148_000, 1_628_000, 'taxed'])
  // 손실 정리: 필요 740만 > 테슬라 손실 405만 → 전부 실현(평가금액 800만원어치 매도)
  assert.deepEqual(r.harvest, [{ name: '테슬라', use: 4_050_000, sell: 8_000_000, full: true }])
  assert.deepEqual([r.afterLoss, r.taxAfterLoss, r.lossSaving], [5_850_000, 737_000, 891_000])
  // 공제 여유 없음
  assert.deepEqual([r.room, r.fill.length, r.futureSaving, r.fillFees], [0, 0, 0, 0])
  // 모두 팔면 879.25만 → 138.435만
  assert.deepEqual([r.allGain, r.taxAll], [8_792_500, 1_384_350])
}

// ── 공제 채우기(EXAMPLES.fill): 판 이익 97.75만 → 남은 공제 152.25만을 애플에서 실현 ──
{
  const r = analyze(EXAMPLES.fill)
  assert.deepEqual([r.realized, r.tax.total, r.status, r.used, r.room], [977_500, 0, 'within', 977_500, 1_522_500])
  assert.equal(r.fill.length, 1)
  assert.equal(r.fill[0].gain, 1_522_500)
  assert.equal(r.fill[0].sell, Math.floor((13_000_000 * 1_522_500) / 2_942_500))
  assert.equal(r.fill[0].full, false)
  assert.equal(r.futureSaving, 304_500 + 30_450) // 152.25만 × 22%
  assert.equal(r.fillFees, 2 * Math.floor(r.fill[0].sell * 0.0025))
  // 매도분 비율만큼 이익 → 남은 공제를 넘지 않음
  assert.ok(r.fill[0].sell / 13_000_000 <= 1_522_500 / 2_942_500)
}

// ── 손실이 필요보다 크면 필요한 만큼만(일부 매도, 올림) ──
{
  const rows: Position[] = [{ name: 'A', sold: true, cost: 10_000_000, value: 13_000_000 }, { name: 'B', sold: false, cost: 12_000_000, value: 8_000_000 }]
  const r = analyze(rows, '0')
  assert.deepEqual([r.realized, r.need, r.harvested, r.afterLoss, r.taxAfterLoss, r.lossSaving], [3_000_000, 500_000, 500_000, 2_500_000, 0, 110_000])
  assert.deepEqual(r.harvest, [{ name: 'B', use: 500_000, sell: Math.ceil((8_000_000 * 500_000) / 4_000_000), full: false }])
}
// 큰 손실부터, 여러 종목에 나눔
{
  const rows: Position[] = [
    { name: 'W', sold: true, cost: 0, value: 10_000_000 },
    { name: 'S', sold: false, cost: 3_000_000, value: 2_000_000 },
    { name: 'L', sold: false, cost: 10_000_000, value: 4_000_000 },
  ]
  const r = analyze(rows, '0')
  assert.deepEqual(r.harvest.map((x) => [x.name, x.use, x.full]), [['L', 6_000_000, true], ['S', 1_000_000, true]])
  assert.deepEqual([r.need, r.harvested, r.afterLoss, r.taxAfterLoss], [7_500_000, 7_000_000, 3_000_000, 110_000])
}
// 순손실이면 공제 여유 = 250만 + 손실, 세금 없음·손실 정리 없음
{
  const r = analyze([{ name: 'X', sold: true, cost: 5_000_000, value: 4_000_000 }, { name: 'Y', sold: false, cost: 1_000_000, value: 10_000_000 }], '0')
  assert.deepEqual([r.realized, r.status, r.tax.total, r.need, r.harvest.length, r.room], [-1_000_000, 'loss', 0, 0, 0, 3_500_000])
  assert.deepEqual([r.filled, r.fill[0].sell], [3_500_000, Math.floor((10_000_000 * 3_500_000) / 9_000_000)])
}
// 보유 이익이 여유보다 작으면 전부
{
  const r = analyze([{ name: 'Y', sold: false, cost: 1_000_000, value: 2_000_000 }], '0')
  assert.deepEqual([r.room, r.filled, r.fill[0].full, r.fill[0].sell], [DEDUCTION, 1_000_000, true, 2_000_000])
}
// 빈 목록
{ const r = analyze([]); assert.deepEqual([r.realized, r.tax.total, r.status, r.allGain], [0, 0, 'loss', 0]) }

// ── URL ──
assert.deepEqual(decodeRows(encodeRows(DEFAULT_ROWS)), DEFAULT_ROWS)
assert.deepEqual(decodeRows('a|b~s~1~2'), [{ name: 'b', sold: true, cost: 1, value: 2 }]) // 깨진 행은 버림
assert.equal(decodeRows('x~q~1~2'), null)
assert.equal(decodeRows(null), null)
assert.equal(decodeRows('a~s~-1~2'), null)
assert.equal(encodeRows([{ name: 'a|b~c', sold: false, cost: 1, value: 2 }]), 'abc~h~1~2')
assert.equal(decodeRows(Array(30).fill('a~s~1~1').join('|'))!.length, 20)
assert.deepEqual([parseFee('0.07'), parseFee('0.25'), parseFee('6'), parseFee('1e2'), parseFee(null)], ['0.07', '0.25', null, null, null])

console.log('check-overseas-stock-tax OK')
