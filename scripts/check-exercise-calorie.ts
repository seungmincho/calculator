// 운동 칼로리 회귀 체크: node scripts/check-exercise-calorie.ts
import assert from 'node:assert/strict'
import {
  ACTIVITIES, CATEGORIES, findActivity, kcal, netKcal, harrisBenedict, rmrMl, correctedMet, personalNetKcal,
  minutesToBurn, FOODS, findFood, strideCm, stepsToCalories, encodePlan, decodePlan, weekTotal, clampNum, matches,
} from '../src/utils/exerciseCalorie.ts'

const near = (a: number, b: number, eps = 0.01) => assert.ok(Math.abs(a - b) <= eps, `${a} ≉ ${b}`)

// 표 무결성: id 중복 없음, 카테고리 유효, MET 범위, Compendium 5자리 코드
assert.equal(new Set(ACTIVITIES.map((a) => a.id)).size, ACTIVITIES.length)
for (const a of ACTIVITIES) {
  assert.ok(CATEGORIES.includes(a.cat), a.id)
  assert.ok(a.met >= 1 && a.met <= 20, a.id)
  assert.match(a.code, /^\d{5}$/, a.id)
}
for (const c of CATEGORIES) assert.ok(ACTIVITIES.some((a) => a.cat === c), c)
// 2024 Compendium 대표값
assert.equal(findActivity('run8')!.met, 8.5)      // 12030
assert.equal(findActivity('walkBrisk')!.met, 4.8) // 17200
assert.equal(findActivity('jumpRope')!.met, 11.0) // 02068
assert.equal(findActivity('butterfly')!.met, 13.8)
// 레거시 id
assert.equal(findActivity('walkNormal')!.id, 'walkModerate')
assert.equal(findActivity('runSprint')!.id, 'run16')
assert.equal(findActivity('nope'), undefined)
assert.equal(findActivity(null), undefined)

// kcal = MET × kg × h
near(kcal(8.5, 65, 30), 276.25)
near(kcal(7.5, 70, 30), 262.5)
assert.equal(kcal(8.5, 0, 30), 0)
assert.equal(kcal(8.5, 65, -5), 0)
assert.equal(kcal(NaN, 65, 30), 0)
near(netKcal(8.5, 65, 30), 243.75)
assert.equal(netKcal(0.5, 65, 30), 0)

// Harris-Benedict: 남 30세 175cm 70kg
near(harrisBenedict('m', 70, 175, 30), 66.473 + 875.5775 + 962.612 - 202.65, 1e-6)
const rmr = harrisBenedict('f', 55, 160, 30) // ≈ 1334
near(rmr, 655.0955 + 295.936 + 525.987 - 140.268, 1e-6)
near(rmrMl(1440 * 5 * 70 * 3.5 / 1000, 70), 3.5, 1e-9) // 3.5 ml/kg/min 역산
assert.equal(rmrMl(1500, 0), 0)
const ml = rmrMl(rmr, 55)
assert.ok(ml < 3.5 && ml > 2.5)
assert.ok(correctedMet(8.5, ml) > 8.5)
near(correctedMet(8.5, 3.5), 8.5)
near(personalNetKcal(8.5, 55, 60, 1440), 8.5 * 55 - 60)
assert.equal(personalNetKcal(1, 55, 60, 1e6), 0)

// 역산
near(minutesToBurn(300, 8.5, 65), 300 / (8.5 * 65) * 60)
near(kcal(8.5, 65, minutesToBurn(500, 8.5, 65)), 500)
assert.equal(minutesToBurn(0, 8.5, 65), 0)

// 음식
assert.equal(new Set(FOODS.map((f) => f.id)).size, FOODS.length)
assert.equal(findFood('rice')!.kcal, 300)
assert.equal(findFood('x'), undefined)

// 걸음: 170cm 남 → 보폭 70.55cm, 10,000보 = 7.055km, 보통(5km/h)·3.8MET
near(strideCm(170, 'm'), 70.55)
near(strideCm(170, 'f'), 70.21)
const st = stepsToCalories(10_000, 170, 'm', 'walkModerate', 65)
near(st.km, 7.055)
near(st.minutes, 7.055 / 5 * 60)
near(st.kcal, 3.8 * 65 * (7.055 / 5))
assert.equal(stepsToCalories(-5, 170, 'm', 'walkBrisk', 65).kcal, 0)

// 주간 계획 인코딩
const plan = [{ a: 'run8', m: 30, n: 3 }, { a: 'walkBrisk', m: 40, n: 2 }]
assert.equal(encodePlan(plan), 'run8.30.3~walkBrisk.40.2')
assert.deepEqual(decodePlan(encodePlan(plan)), plan)
assert.deepEqual(decodePlan('bad.1.1~run8.x.2~jogging.20.0~walkFast.30.99'), [{ a: 'walkVeryBrisk', m: 30, n: 14 }])
assert.equal(decodePlan(''), null)
assert.equal(decodePlan('bad'), null)
const wk = weekTotal(plan, 65)
near(wk.total, kcal(8.5, 65, 30) * 3 + kcal(4.8, 65, 40) * 2)
assert.equal(wk.minutes, 170)
near(wk.month, wk.total * 52 / 12)
near(wk.fatKgMonth, wk.month / 7700)

// 입력 정리·검색
assert.equal(clampNum('70', 20, 300, 65), 70)
assert.equal(clampNum('abc', 20, 300, 65), 65)
assert.equal(clampNum(null, 20, 300, 65), 65)
assert.equal(clampNum('', 20, 300, 65), 65)
assert.equal(clampNum('999', 20, 300, 65), 300)
assert.ok(matches('달 리기', '달리기 (8km/h)'))
assert.ok(matches('RUN', 'Running 8 km/h'))
assert.ok(matches('', 'x'))
assert.ok(!matches('수영', '달리기'))

console.log('check-exercise-calorie: all passed')
