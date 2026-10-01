// 칼로리 계산 회귀 체크: node scripts/check-calorie.ts
import { mifflin, harris, katch, bmr, tdee, dailyDelta, plan, macros, eer, bmi, floorKcal, type PlanInput } from '../src/utils/calorie.ts'

let fail = 0
const eq = (a: unknown, b: unknown, msg: string) => {
  if (JSON.stringify(a) !== JSON.stringify(b)) { fail++; console.log('FAIL', msg, JSON.stringify(a), '!=', JSON.stringify(b)) }
}
const r = (n: number | null, d = 2) => (n == null ? null : Number(n.toFixed(d)))

const M = { sex: 'male' as const, age: 30, height: 175, weight: 75 }
const F = { sex: 'female' as const, age: 30, height: 160, weight: 60 }

// BMR — 손계산
eq(r(mifflin(M)), 1698.75, 'Mifflin 남 750+1093.75-150+5')
eq(r(mifflin(F)), 1289, 'Mifflin 여 600+1000-150-161')
eq(r(harris(M)), 1762.65, 'HB 1984 남 88.362+1004.775+839.825-170.31')
eq(r(harris(F)), 1368.19, 'HB 1984 여 447.593+554.82+495.68-129.9')
eq(r(katch({ ...M, bodyFat: 20 })), 1666, 'Katch 370+21.6*60')
eq(katch(M), null, 'Katch 체지방 없음')
eq(r(bmr(M, 'katch')), 1698.75, 'Katch 미입력 → Mifflin')

// TDEE·하루 차이
eq(r(tdee(1698.75, 'light')), 2335.78, '1.375배')
eq(r(tdee(1289, 'sedentary')), 1546.8, '1.2배')
eq(dailyDelta(0.5), 550, '0.5kg/주 = 550kcal/일')
eq(dailyDelta(1), 1100, '1kg/주 = 1100kcal/일')
eq(floorKcal('female', 1100), 1200, '여 하한 1200')
eq(floorKcal('male', 1698.75), 1698.75, '남 하한 = BMR')

const P = (o: Partial<PlanInput> = {}): PlanInput => ({ ...M, activity: 'light', formula: 'mifflin', goal: 'lose', pace: 0.5, ...o })

// 감량 0.5kg/주, 75→70: 하한 미적용, 차이 550 유지 → 정확히 10주
const p1 = plan(P(), 70)
eq([r(p1.kcal), p1.clamped, r(p1.effPace, 3), r(p1.weeks), p1.reason], [1785.78, false, 0.5, 10, 'ok'], '남 감량 0.5')
eq(r(p1.series[1].plan), 74.5, '첫 주 -0.5kg')
eq(p1.series[10].fixed > 70, true, '칼로리 고정 시 더 느림')

// 감량 1kg/주: 1235.78 < BMR 1698.75 → 하한 적용, 실제 (2335.78-1698.75)*7/7700
const p2 = plan(P({ pace: 1 }), 70)
eq([r(p2.raw), r(p2.kcal), p2.clamped, r(p2.effPace, 4)], [1235.78, 1698.75, true, 0.5791], '남 감량 1kg 하한')

// 여 비활동 0.5kg/주: 996.8 → 하한 1289(BMR), 실제 257.8*7/7700
const p3 = plan({ ...F, activity: 'sedentary', formula: 'mifflin', goal: 'lose', pace: 0.5 }, 55)
eq([r(p3.kcal), p3.clamped, r(p3.effPace, 4)], [1289, true, 0.2344], '여 하한')

// 여 45kg 60세 비활동: TDEE 1186.8 < 1200 → 식단만으론 불가
const p4 = plan({ sex: 'female', age: 60, height: 160, weight: 45, activity: 'sedentary', formula: 'mifflin', goal: 'lose', pace: 0.5 }, 43)
eq([r(p4.tdee), p4.weeks, p4.reason], [1186.8, null, 'floor'], '하한 > TDEE')

// 방향 불일치·유지·증량
eq(plan(P(), 80).reason, 'direction', '감량인데 목표가 더 무거움')
eq([plan(P({ goal: 'maintain' }), 70).reason, r(plan(P({ goal: 'maintain' }), 70).kcal)], ['maintain', 2335.78], '유지 = TDEE')
const g = plan(P({ goal: 'gain', pace: 0.25 }), 77)
eq([r(g.kcal), g.reason, r(g.weeks)], [2610.78, 'ok', 8], '증량 +275/일 매주 재계산 → 2kg/0.25 = 8주')

// 탄단지: 1785.78kcal, 기준 70kg ×1.6 = 112g
const m = macros(1785.78, 70, 'lose')
eq([r(m.protein.g, 1), r(m.fat.g, 1), r(m.carbs.g, 1)], [112, 49.6, 222.8], '탄단지 g')
eq(r(m.protein.pct + m.fat.pct + m.carbs.pct, 6), 100, '합 100%')

// KDRI 2020 에너지 필요추정량
eq(eer('male', 30)?.kcal, 2500, '남 30-49')
eq(eer('female', 25)?.kcal, 2000, '여 19-29')
eq(eer('male', 80)?.kcal, 1900, '남 75+')
eq(eer('female', 64), { from: 50, to: 64, kcal: 1700 }, '여 50-64')
eq(eer('male', 10), null, '12세 미만 없음')

eq(r(bmi(70, 175), 1), 22.9, 'BMI')

console.log(fail ? `${fail} failed` : 'all passed')
if (fail) process.exit(1)
