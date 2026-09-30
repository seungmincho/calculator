// 주식 계산 회귀 체크: node scripts/check-stock.ts
import assert from 'node:assert/strict'
import {
  trade, breakeven, targetSell, averagePrice, sharesToTarget, usTax, usTrade, tickUp, sellTaxRate,
} from '../src/utils/stock.ts'

// 2026 매도세율: 코스피 0.05%+농특 0.15%, 코스닥 0.20%, 코넥스 0.10%, ETF 면제
assert.equal(+sellTaxRate('kospi').toFixed(6), 0.002)
assert.equal(sellTaxRate('kosdaq'), 0.002)
assert.equal(sellTaxRate('konex'), 0.001)
assert.equal(sellTaxRate('etf'), 0)

// 70,000원 100주 매수 → 77,000원 매도, 수수료 0.015%, 코스피
const k = trade({ buy: 70_000, sell: 77_000, qty: 100, feePct: 0.015, market: 'kospi' })
assert.equal(k.buyAmount, 7_000_000)
assert.equal(k.buyFee, 1_050)
assert.equal(k.sellFee, 1_155)
assert.equal(k.txTax, 3_850)
assert.equal(k.farmTax, 11_550)
assert.equal(k.tax, 15_400)
assert.equal(k.profit, 7_700_000 - 1_155 - 15_400 - 7_001_050)
assert.equal(k.profit, 682_395)
assert.ok(Math.abs(k.returnPct - 9.7470) < 0.001)

// 원 미만 절사: 1,234원 × 7주 × 0.015% = 1.2957 → 1원
const s = trade({ buy: 1_234, sell: 1_300, qty: 7, feePct: 0.015, market: 'kosdaq' })
assert.equal(s.buyFee, 1)
assert.equal(s.tax, 18) // 9,100 × 0.2% = 18.2
// 코스피는 거래세·농특세 각각 절사
const t = trade({ buy: 999, sell: 999, qty: 1, feePct: 0, market: 'kospi' })
assert.deepEqual([t.txTax, t.farmTax], [0, 1])

// 손익분기: 해당 가격에선 손실 없음, 1원 낮으면 손실
for (const m of ['kospi', 'kosdaq', 'konex', 'etf'] as const) for (const [buy, qty] of [[70_000, 100], [1_234, 7], [512, 3_333], [312_500, 2]]) {
  const i = { buy, qty, feePct: 0.015, market: m }
  const be = breakeven(i)
  assert.ok(trade({ ...i, sell: be.price }).profit >= 0)
  assert.ok(trade({ ...i, sell: be.price - 1 }).profit < 0, `${m} ${buy}`)
  assert.ok(be.tick >= be.price)
}
assert.equal(breakeven({ buy: 70_000, qty: 100, feePct: 0.015, market: 'kospi' }).price, 70_162)
assert.equal(breakeven({ buy: 70_000, qty: 100, feePct: 0.015, market: 'kospi' }).tick, 70_200)
// 수수료·세금 0 이면 손익분기 = 매수가
assert.equal(breakeven({ buy: 70_000, qty: 100, feePct: 0, market: 'etf' }).price, 70_000)

// 목표 수익률: 10% 순수익 달성 최소 가격
const ts = targetSell({ buy: 70_000, qty: 100, feePct: 0.015, market: 'kospi' }, 10)
assert.ok(trade({ buy: 70_000, sell: ts.price, qty: 100, feePct: 0.015, market: 'kospi' }).returnPct >= 10)
assert.ok(trade({ buy: 70_000, sell: ts.price - 1, qty: 100, feePct: 0.015, market: 'kospi' }).returnPct < 10)
assert.equal(ts.price, 77_178)
// 손절 -5%
const sl = targetSell({ buy: 70_000, qty: 100, feePct: 0.015, market: 'kospi' }, -5)
assert.ok(sl.price < 70_000 && trade({ buy: 70_000, sell: sl.price, qty: 100, feePct: 0.015, market: 'kospi' }).returnPct >= -5)

// 호가단위
assert.equal(tickUp(1_999), 1_999)
assert.equal(tickUp(2_001), 2_005)
assert.equal(tickUp(19_991), 20_000)
assert.equal(tickUp(20_001), 20_050)
assert.equal(tickUp(70_172), 70_200)
assert.equal(tickUp(200_001), 200_500)
assert.equal(tickUp(500_001), 501_000)
assert.equal(tickUp(12_341, 'etf'), 12_345)

// 평균단가
const a = averagePrice([{ price: 80_000, qty: 10 }, { price: 70_000, qty: 20 }, { price: 0, qty: 0 }])
assert.deepEqual([a.qty, a.amount], [30, 2_200_000])
assert.ok(Math.abs(a.avg - 73_333.333) < 0.01)
assert.equal(averagePrice([]).avg, 0)

// 물타기: 평단 80,000 × 100주, 현재가 60,000 → 평단 70,000 → 100주 필요
assert.deepEqual(sharesToTarget(80_000, 100, 60_000, 70_000), { add: 100, amount: 6_000_000, newAvg: 70_000, newQty: 200 })
// 딱 떨어지지 않으면 올림 → 목표 이하
const w = sharesToTarget(80_000, 100, 60_000, 75_000)!
assert.equal(w.add, 34)
assert.ok(w.newAvg <= 75_000 && (80_000 * 100 + 60_000 * 33) / 133 > 75_000)
// 불타기: 평단 50,000 × 10주, 현재가 70,000, 평단 60,000 이하 유지 → 최대 10주
assert.equal(sharesToTarget(50_000, 10, 70_000, 60_000)!.add, 10)
// 도달 불가
assert.equal(sharesToTarget(80_000, 100, 60_000, 55_000), null)
assert.equal(sharesToTarget(80_000, 100, 60_000, 85_000), null)
assert.equal(sharesToTarget(80_000, 0, 60_000, 70_000), null)

// 해외주식 세금: 250만 공제 후 20% + 지방 2%
assert.deepEqual(usTax(2_500_000), { base: 0, income: 0, local: 0, total: 0 })
assert.deepEqual(usTax(10_000_000), { base: 7_500_000, income: 1_500_000, local: 150_000, total: 1_650_000 })
assert.equal(usTax(-3_000_000).total, 0)

// $100 → $150, 50주, 환율 1,300 → 1,400, 수수료 0.25%
const u = usTrade({ buy: 100, sell: 150, qty: 50, buyFx: 1_300, sellFx: 1_400, feePct: 0.25 })
assert.equal(u.buyKrw, 6_500_000)
assert.equal(u.sellKrw, 10_500_000)
assert.equal(u.feeKrw, 16_250 + 26_250)
assert.equal(u.gain, 3_957_500)
assert.equal(u.priceGain, 3_250_000)
assert.equal(u.fxGain, 750_000)
assert.equal(u.tax, Math.floor((3_957_500 - 2_500_000) * 0.2) + Math.floor(Math.floor((3_957_500 - 2_500_000) * 0.2) * 0.1))
assert.equal(u.tax, 320_650)
assert.equal(u.net, 3_957_500 - 320_650)
// 이미 다른 손익으로 공제를 다 쓴 경우 이번 이익 전체에 22%
const u2 = usTrade({ buy: 100, sell: 150, qty: 50, buyFx: 1_300, sellFx: 1_400, feePct: 0.25, otherGain: 5_000_000 })
assert.equal(u2.tax, Math.floor(3_957_500 * 0.2) + Math.floor(Math.floor(3_957_500 * 0.2) * 0.1))
// 다른 손실과 상계
assert.equal(usTrade({ buy: 100, sell: 150, qty: 50, buyFx: 1_300, sellFx: 1_400, feePct: 0.25, otherGain: -4_000_000 }).tax, 0)
// 달러 손실이어도 환차익으로 원화 이익 가능
const fx = usTrade({ buy: 100, sell: 98, qty: 10, buyFx: 1_200, sellFx: 1_400, feePct: 0 })
assert.ok(fx.usdPct < 0 && fx.gain > 0 && fx.fxGain > 0 && fx.priceGain < 0)
// 손익분기 USD
const be = usTrade({ buy: 100, sell: 0, qty: 50, buyFx: 1_300, sellFx: 1_400, feePct: 0.25 }).breakevenUsd
assert.ok(usTrade({ buy: 100, sell: be + 0.01, qty: 50, buyFx: 1_300, sellFx: 1_400, feePct: 0.25 }).gain >= 0)
assert.ok(usTrade({ buy: 100, sell: be - 0.01, qty: 50, buyFx: 1_300, sellFx: 1_400, feePct: 0.25 }).gain < 0)

// 잘못된 입력은 0
assert.equal(trade({ buy: NaN, sell: -1, qty: 0, feePct: 0.015, market: 'kospi' }).profit, 0)
assert.equal(breakeven({ buy: 0, qty: 10, feePct: 0.015, market: 'kospi' }).price, 0)

console.log('check-stock: all passed')
