// 1RM 계산기 회귀 체크: node scripts/check-one-rep-max.ts
import {
  estimate1RM, roundTo, round1, percentTable, loadPlates, groupPlates, convertUnit, bigThree, GEAR,
} from '../src/utils/oneRepMax.ts'

let fail = 0
const eq = (name: string, got: unknown, want: unknown, tol = 1e-6) => {
  const ok = typeof want === 'number' ? Math.abs((got as number) - want) <= tol : JSON.stringify(got) === JSON.stringify(want)
  if (!ok) { fail++; console.log('FAIL', name, got, '!=', want) }
}

// 공식 값: 100kg × 10회
let e = estimate1RM(100, 10)
eq('epley 100x10', e.byFormula.epley, 400 / 3)
eq('brzycki 100x10', e.byFormula.brzycki, 3600 / 27)
eq('lombardi 100x10', e.byFormula.lombardi, 100 * 10 ** 0.1)
eq('lombardi ≈125.89', e.byFormula.lombardi, 125.89, 0.01)
eq('oconner 100x10', e.byFormula.oconner, 125)

// 기본값 벤치 80kg × 5회 → 93.3 / 90 / 94.0 / 90, 평균 91.8
e = estimate1RM(80, 5)
eq('epley 80x5', e.byFormula.epley, 93.333, 0.001)
eq('brzycki 80x5', e.byFormula.brzycki, 90)
eq('lombardi 80x5', e.byFormula.lombardi, 93.97, 0.01)
eq('oconner 80x5', e.byFormula.oconner, 90)
eq('avg 80x5', round1(e.average), 91.8)
eq('min 80x5', e.min, 90)
eq('max 80x5', round1(e.max), 94)
// 스쿼트 100kg × 8회 → 평균 123.5 (페이지 예시)
eq('avg 100x8', round1(estimate1RM(100, 8).average), 123.5)
eq('100x8 85%', percentTable(estimate1RM(100, 8).average, 2.5).find((r) => r.pct === 85)?.weight, 105)
// 데드 140kg × 3회 → 평균 152.2
eq('avg 140x3', round1(estimate1RM(140, 3).average), 152.2)

// 1회 = 든 무게 그대로 (Epley·O'Conner도)
e = estimate1RM(120, 1)
eq('r1 epley', e.byFormula.epley, 120)
eq('r1 oconner', e.byFormula.oconner, 120)
eq('r1 avg', e.average, 120)
// 입력 방어: 횟수 1~12로 자름, 무게 0/NaN → 0
eq('reps clamp hi', estimate1RM(100, 20).reps, 12)
eq('reps clamp lo', estimate1RM(100, 0).reps, 1)
eq('reps NaN', estimate1RM(100, NaN).reps, 1)
eq('brzycki 12 finite', estimate1RM(100, 12).byFormula.brzycki, 144)
eq('weight NaN', estimate1RM(NaN, 5).average, 0)
eq('weight neg', estimate1RM(-5, 5).average, 0)

// 원판 단위 반올림
eq('round 2.5', roundTo(91.8257, 2.5), 92.5)
eq('round 1.25', roundTo(91.8257, 1.25), 91.25)
eq('round tie up', roundTo(91.25, 2.5), 92.5)
eq('round lb 5', roundTo(202.4, 5), 200)
const tbl = percentTable(estimate1RM(80, 5).average, 2.5)
eq('table rows', tbl.length, 11)
eq('table 100%', tbl[0].weight, 92.5)
eq('table 85%', tbl.find((r) => r.pct === 85)?.weight, 77.5)
eq('table 85% reps', tbl.find((r) => r.pct === 85)?.reps, 6)
eq('table 50%', tbl[tbl.length - 1].weight, 45)
eq('table 1.25 70%', percentTable(100, 1.25).find((r) => r.pct === 70)?.weight, 70)

// 원판 구성 (20kg 바, 한쪽 기준)
const kg = GEAR.kg.plates
eq('100kg', loadPlates(100, 20, kg).perSide, [25, 15])
eq('60kg', loadPlates(60, 20, kg).perSide, [20])
eq('142.5kg', loadPlates(142.5, 20, kg).perSide, [25, 25, 10, 1.25])
eq('142.5 total', loadPlates(142.5, 20, kg).total, 142.5)
eq('bar only', loadPlates(20, 20, kg).perSide, [])
eq('bar only total', loadPlates(20, 20, kg).total, 20)
eq('below bar', loadPlates(15, 20, kg).belowBar, true)
eq('NaN target', loadPlates(NaN, 20, kg).belowBar, true)
// 끼울 수 없는 무게는 목표를 넘지 않게 내림
let p = loadPlates(91.8, 20, kg)
eq('91.8 plates', p.perSide, [25, 10])
eq('91.8 total', p.total, 90)
eq('91.8 short', p.short, 1.8, 1e-9)
p = loadPlates(91.25, 20, kg) // 한쪽 35.625 → 35
eq('91.25 total', p.total, 90)
eq('15kg bar 100', loadPlates(100, 15, kg).perSide, [25, 15, 2.5])
eq('group', groupPlates([25, 25, 10, 1.25]), [[25, 2], [10, 1], [1.25, 1]])
// lb: 45lb 바
const lb = GEAR.lb.plates
eq('225lb', loadPlates(225, 45, lb).perSide, [45, 45])
eq('135lb', loadPlates(135, 45, lb).perSide, [45])
eq('165lb greedy', loadPlates(165, 45, lb).perSide, [45, 10, 5])
eq('317.5lb', loadPlates(317.5, 45, lb).perSide, [45, 45, 45]) // 한쪽 136.25 → 135, 2.5lb 모자람
eq('317.5lb short', loadPlates(317.5, 45, lb).short, 2.5, 1e-9)

// lb ↔ kg
eq('100kg→lb', convertUnit(100, 'kg', 'lb'), 220.462, 0.001)
eq('225lb→kg', convertUnit(225, 'lb', 'kg'), 102.058, 0.001)
eq('round trip', convertUnit(convertUnit(80, 'kg', 'lb'), 'lb', 'kg'), 80, 1e-9)
eq('same unit', convertUnit(80, 'kg', 'kg'), 80)
eq('1 lb', convertUnit(1, 'lb', 'kg'), 0.45359237, 1e-12)

// 3대 합계: 스쿼트 100×5, 벤치 80×5, 데드 120×5, 체중 70kg
const b = bigThree([{ weight: 100, reps: 5 }, { weight: 80, reps: 5 }, { weight: 120, reps: 5 }], 70)
eq('big3 each', b.each, [114.8, 91.8, 137.7])
eq('big3 total', b.total, 344.3)
eq('big3 ratio', b.ratio, 344.3 / 70)
eq('big3 next', b.nextGoal, 400)
const d = bigThree([{ weight: 140, reps: 1 }, { weight: 100, reps: 1 }, { weight: 160, reps: 1 }], 0)
eq('big3 direct', d.total, 400)
eq('big3 next at 400', d.nextGoal, 500)
eq('big3 no bw', d.ratio, 0)

if (fail) { console.log(`${fail} failed`); process.exit(1) }
console.log('one-rep-max: all ok')
