// 혈중알코올 계산 회귀 체크: node scripts/check-alcohol.ts
import assert from 'node:assert/strict'
import { grams, widmark, bacAt, hoursUntil, peak, status, somaek, sojuBottles, series, clockAt, elapsedH, parseHM, fmtHM, encodeDrinks, decodeDrinks, R, BETA, PRESETS, type Drink } from '../src/utils/alcohol.ts'

const near = (a: number, b: number, eps = 1e-3) => assert.ok(Math.abs(a - b) < eps, `${a} ≉ ${b}`)
const D = (kind: Drink['kind'], n = 1, t = 0): Drink => ({ kind, ...PRESETS[kind], n, t })

// 알코올 g: 소주 360ml × 15.7% × 0.789 = 44.6g
near(grams(360, 15.7), 44.595, 1e-3)
near(sojuBottles(grams(360, 15.7)), 1)
// 위드마크: 44.6g / (70 × 0.68 × 10) = 0.0937%
near(widmark(44.595, 70, 0.68), 0.09369, 1e-4)
assert.equal(widmark(10, 0, 0.68), 0)

const bottle = [D('sojuBottle')]
near(bacAt(bottle, 70, R.male, BETA.typical, 0), 0.09369, 1e-4)
near(bacAt(bottle, 70, R.male, BETA.typical, 2), 0.09369 - 0.03, 1e-4)
assert.equal(bacAt(bottle, 70, R.male, BETA.typical, 100), 0)
assert.equal(bacAt([], 70, R.male, BETA.typical, 1), 0)
// 0 도달: 느린 β = 9.37h, 평균 = 6.25h
near(hoursUntil(bottle, 70, R.male, BETA.slow), 9.369, 1e-2)
near(hoursUntil(bottle, 70, R.male, BETA.typical), 6.246, 1e-2)
assert.equal(hoursUntil([], 70, R.male, BETA.slow), 0)
// 여성은 r 작아 BAC 높음
assert.ok(bacAt(bottle, 70, R.female, BETA.typical, 0) > bacAt(bottle, 70, R.male, BETA.typical, 0))

// 여러 잔 · 시차: 잔 사이 감소 반영, 0 아래로 안 내려감
const spaced = [D('sojuGlass', 1, 0), D('sojuGlass', 1, 10)]
const one = widmark(grams(50, 15.7), 70, R.male)
near(bacAt(spaced, 70, R.male, BETA.typical, 10), one, 1e-6) // 첫 잔은 이미 0 → 두 번째 잔만
near(hoursUntil(spaced, 70, R.male, BETA.typical), 10 + one / BETA.typical, 1e-6)
// 순서 무관
near(hoursUntil([D('beer500', 2, 1), D('sojuBottle', 1, 0)], 70, R.male, BETA.slow),
  hoursUntil([D('sojuBottle', 1, 0), D('beer500', 2, 1)], 70, R.male, BETA.slow))
// level 0.03 교차: 이후 쭉 0.03 이하
const h03 = hoursUntil(bottle, 70, R.male, BETA.typical, 0.03)
near(bacAt(bottle, 70, R.male, BETA.typical, h03), 0.03, 1e-6)
// 중간에 0.03 아래로 떨어졌다 다시 오르는 경우 → 마지막 교차
const dip = [D('sojuGlass', 5, 0), D('sojuGlass', 5, 6)]
const hd = hoursUntil(dip, 70, R.male, BETA.typical, 0.03)
assert.ok(hd > 6)
near(bacAt(dip, 70, R.male, BETA.typical, hd), 0.03, 1e-6)
// 0잔·0ml 무시
assert.equal(hoursUntil([D('sojuBottle', 0)], 70, R.male, BETA.slow), 0)

// 최고치
const p = peak([D('beer500', 1, 0), D('sojuBottle', 1, 1)], 70, R.male, BETA.typical)
assert.equal(p.t, 1)

// 상태 구간 (도로교통법)
assert.equal(status(0), 'zero')
assert.equal(status(0.029), 'low')
assert.equal(status(0.03), 'suspend')
assert.equal(status(0.0799), 'suspend')
assert.equal(status(0.08), 'revoke')
assert.equal(status(0.2), 'severe')

// 소맥: 소주 50 + 맥주 150 → 7.3%
assert.deepEqual(somaek(50, 150), { ml: 200, abv: 7.3 })
assert.deepEqual(somaek(0, 0), { ml: 0, abv: 0 })
near(grams(somaek(50, 150).ml, somaek(50, 150).abv), grams(50, 15.7) + grams(150, 4.5), 0.05)

// 시계열: 느린 β가 항상 ≥ 평균 β
for (const pt of series(bottle, 70, R.male, 10)) assert.ok(pt.slow >= pt.typical)

// 시각
assert.equal(parseHM('20:30'), 1230)
assert.equal(parseHM('24:00'), null)
assert.equal(parseHM('x'), null)
assert.equal(fmtHM(1230 + 1440), '20:30')
assert.deepEqual(clockAt(20 * 60, 9.5), { day: 1, hm: '05:30' })
assert.deepEqual(clockAt(20 * 60, 1), { day: 0, hm: '21:00' })
assert.equal(elapsedH(20 * 60, 22 * 60), 2)
assert.equal(elapsedH(20 * 60, 1 * 60 + 30), 5.5) // 자정 넘김

// URL 왕복 (도수 소수점 포함)
const ds = [D('sojuBottle', 1.5, 0), { kind: 'custom' as const, ml: 330, abv: 8.5, n: 2, t: 1.5 }]
assert.deepEqual(decodeDrinks(encodeDrinks(ds)), ds)
assert.equal(decodeDrinks(''), null)
assert.equal(decodeDrinks('hack~1~2~3~4'), null)
assert.equal(decodeDrinks('custom~1~200~1~0'), null) // 도수 > 100
assert.equal(decodeDrinks('custom~-1~5~1~0'), null)

console.log('check-alcohol: ok')
