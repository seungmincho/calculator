// 체지방률 회귀 체크: node scripts/check-body-fat.ts  (기대값은 손계산)
import {
  navy, rfm, deurenberg, ymca, category, healthyRange, healthyStatus, composition, targetWeight, weeksToLose,
  abdominalObese, bmiClass, parseMethod, sanitizeLog, upsertLog, logDelta, type BodyInput,
} from '../src/utils/bodyFat.ts'

let fail = 0
const eq = (a: unknown, b: unknown, msg: string) => {
  if (JSON.stringify(a) !== JSON.stringify(b)) { fail++; console.log('FAIL', msg, JSON.stringify(a), '!=', JSON.stringify(b)) }
}
const r1 = (x: number | null) => (x == null ? null : Math.round(x * 10) / 10)

const man: BodyInput = { sex: 'male', age: 35, heightCm: 175, weightKg: 75, waistCm: 85, neckCm: 38, hipCm: 0 }
const woman: BodyInput = { sex: 'female', age: 30, heightCm: 162, weightKg: 58, waistCm: 72, neckCm: 32, hipCm: 96 }

// Navy 남: 495/(1.0324 − 0.19077·log10(47) + 0.15456·log10(175)) − 450 = 495/1.06010 − 450 ≈ 16.94
eq(r1(navy(man)), 16.9, 'Navy 남')
// Navy 여: 495/(1.29579 − 0.35004·log10(136) + 0.221·log10(162)) − 450 = 495/1.03727 − 450 ≈ 27.21
eq(r1(navy(woman)), 27.2, 'Navy 여')
eq(navy({ ...woman, hipCm: 0 }), null, 'Navy 여 엉덩이 없음')
eq(navy({ ...man, neckCm: 90 }), null, 'Navy 허리≤목')
eq(navy({ ...man, waistCm: 39 }), 2, 'Navy 하한 클램프')

// RFM: 64 − 20·175/85 = 22.82 / 76 − 20·162/72 = 31.0
eq(r1(rfm(man)), 22.8, 'RFM 남')
eq(r1(rfm(woman)), 31, 'RFM 여')

// Deurenberg: BMI 24.49 → 1.2·24.49 + 0.23·35 − 10.8 − 5.4 = 21.24 / BMI 22.10 → 26.52 + 6.9 − 5.4 = 28.02
eq(r1(deurenberg(man)), 21.2, 'Deurenberg 남')
eq(r1(deurenberg(woman)), 28, 'Deurenberg 여')

// YMCA: 165.35lb, 33.46in → (−98.42 + 138.88 − 13.56)/165.35 = 16.27%
eq(r1(ymca(man)), 16.3, 'YMCA 남')

// ACE 경계
eq([5.9, 6, 13.9, 14, 17.9, 18, 24.9, 25].map((b) => category('male', b)),
  ['essential', 'athletic', 'athletic', 'fitness', 'fitness', 'average', 'average', 'obese'], 'ACE 남')
eq([13.9, 14, 20.9, 21, 24.9, 25, 31.9, 32].map((b) => category('female', b)),
  ['essential', 'athletic', 'athletic', 'fitness', 'fitness', 'average', 'average', 'obese'], 'ACE 여')

// Gallagher 2000
eq(healthyRange('male', 35), { min: 8, max: 19, obese: 25, band: '20-39' }, 'Gallagher 남 30대')
eq(healthyRange('female', 60), { min: 24, max: 35, obese: 42, band: '60-79' }, 'Gallagher 여 60대')
eq([7.9, 8, 19.9, 20, 24.9, 25].map((b) => healthyStatus('male', 30, b)),
  ['under', 'healthy', 'healthy', 'over', 'over', 'obese'], 'Gallagher 상태')

// 체성분·목표 체중: 75kg 20% → 지방 15 / 제지방 60, 15% 목표 → 60/0.85 = 70.59
eq(composition(75, 20), { fatKg: 15, leanKg: 60 }, '체성분')
eq(r1(targetWeight(60, 15)), 70.6, '목표 체중')
eq(r1(weeksToLose(1)), 2.2, '1kg 500kcal/일 → 2.2주')

eq([abdominalObese('male', 89.9), abdominalObese('male', 90), abdominalObese('female', 85)], [false, true, true], '복부비만')
eq([18.4, 22.9, 23, 25, 30, 35].map(bmiClass), ['under', 'normal', 'pre', 'obese1', 'obese2', 'obese3'], 'BMI 분류')
eq(['navy', 'ymca', 'covert-bailey', 'rfm', 'x', null].map(parseMethod), ['navy', 'ymca', 'bmi', 'rfm', 'navy', 'navy'], '구 파라미터')

// 기록
const log = upsertLog(sanitizeLog([{ d: '2026-09-01', bf: 22, w: 80, waist: 90, m: 'navy' }, { d: 'bad', bf: 1, w: 1, waist: 1, m: 'navy' }]),
  { d: '2026-10-01', bf: 20, w: 77, waist: 86, m: 'navy' })
eq(log.length, 2, '기록 검증·추가')
eq(upsertLog(log, { d: '2026-10-01', bf: 19, w: 76, waist: 85, m: 'navy' }).length, 2, '같은 날 덮어쓰기')
const d = logDelta(log)!
// 지방 17.6 → 15.4 (−2.2), 제지방 62.4 → 61.6 (−0.8)
eq([r1(d.bf), r1(d.fatKg), r1(d.leanKg), d.w], [-2, -2.2, -0.8, -3], '변화량')

if (fail) { console.log(`${fail} failed`); process.exit(1) }
console.log('check-body-fat: all passed')
