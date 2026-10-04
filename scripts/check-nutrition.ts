// 영양성분 계산 회귀 체크: node scripts/check-nutrition.ts
import { FOODS, findFood, scale, per100, sum, macroRatio, ratioStatus, dvPct, encodeMeal, decodeMeal, DEFAULT_MEAL, DV } from '../src/utils/nutrition.ts'

let fail = 0
const eq = (a: unknown, b: unknown, msg: string) => {
  if (JSON.stringify(a) !== JSON.stringify(b)) { fail++; console.log('FAIL', msg, JSON.stringify(a), '!=', JSON.stringify(b)) }
}
const r1 = (n: number) => Math.round(n * 10) / 10

// 식약처 1일 영양성분 기준치
eq(DV, { cal: 2000, carbs: 324, protein: 55, fat: 54, sodium: 2000 }, '1일 기준치')

// 데이터 무결성: id 중복 없음, 1인분 열량이 탄단지 열량과 크게 어긋나지 않음(알코올 음료 제외)
eq(new Set(FOODS.map((x) => x.id)).size, FOODS.length, 'id 중복')
for (const x of FOODS) {
  if (x.id === 'soju' || x.id === 'beer') continue
  const est = x.carbs * 4 + x.protein * 4 + x.fat * 9
  if (Math.abs(est - x.cal) > Math.max(40, x.cal * 0.2)) { fail++; console.log('FAIL 열량 불일치', x.id, x.cal, est) }
}

// 섭취량 환산
const rice = findFood('rice')!
eq(r1(scale(rice, 105).cal), 150, '밥 반 공기')
eq(r1(per100(rice).cal), 142.9, '밥 100g당')
eq(scale(rice, 0).cal, 0, '0g')

// 합계 / 비율
const tot = sum([scale(rice, 210), scale(findFood('kimchiJjigae')!, 300), scale(findFood('kimchi')!, 40)])
eq([tot.cal, tot.carbs, tot.protein, r1(tot.fat), tot.sodium], [515, 79, 18, 10.8, 1755], '기본 식단 합계')
const mr = macroRatio({ cal: 0, carbs: 50, protein: 25, fat: 100 / 9, sodium: 0 }) // 200 / 100 / 100 kcal
eq([mr.carbs, mr.protein, mr.fat], [50, 25, 25], '탄단지 비율')
eq(macroRatio({ cal: 340, carbs: 0, protein: 0, fat: 0, sodium: 0 }), { carbs: 0, protein: 0, fat: 0 }, '소주만: 0 나눗셈 방지')
// 2025 섭취기준: 탄수화물 50~65%, 단백질 10~20% (2020: 55~65%, 7~20%)
eq([ratioStatus('carbs', 49), ratioStatus('carbs', 50), ratioStatus('carbs', 60), ratioStatus('fat', 31)], [-1, 0, 0, 1], '권장범위 판정')
eq([ratioStatus('protein', 9), ratioStatus('protein', 10)], [-1, 0], '단백질 하한 10%')
eq(Math.round(dvPct(tot).sodium), 88, '나트륨 %')

// URL 왕복
const meal = decodeMeal(DEFAULT_MEAL, null)!
eq(meal.map((e) => [e.food.id, e.amount]), [['rice', 210], ['kimchiJjigae', 300], ['kimchi', 40]], '기본 식단 디코드')
eq(decodeMeal(null, null), null, '파라미터 없음 → 기본값')
eq(decodeMeal('', null), [], '빈 식단 유지')
eq(decodeMeal('rice:abc,nope:100,rice:-5,ramyeon:99999', null)!.map((e) => [e.food.id, e.amount]), [['ramyeon', 5000]], '잘못된 항목 무시·상한')
const custom = { food: { id: 'c0', category: 'custom' as const, name: '프로틴바, 초코', serving: 40, cal: 180, carbs: 20, protein: 12, fat: 6, sodium: 150 }, amount: 40 }
const enc = encodeMeal([meal[0], custom])
eq(enc.m, 'rice:210', '인코드 m')
const dec = decodeMeal(enc.m, enc.c)!
eq([dec.length, dec[1].food.name, dec[1].food.cal, dec[1].amount], [2, '프로틴바, 초코', 180, 40], '직접 입력 왕복')
eq(decodeMeal(null, '{bad json'), [], '깨진 c')
eq(decodeMeal(null, JSON.stringify([['x', 0, 1, 1, 1, 1, 1, 1]])), [], '1인분 0 무시')

console.log(fail ? `${fail} FAIL` : 'nutrition OK')
if (fail) process.exit(1)
