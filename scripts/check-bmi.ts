// BMI 회귀 체크: node scripts/check-bmi.ts  (기대값은 손계산, 키 170cm → m² = 2.89)
import {
  bmi, round1, classify, weightAt, classRanges, analyze, gaugePos, waistCheck, ageNote, parseStd,
  sanitizeLog, upsertLog, fromLegacy,
} from '../src/utils/bmi.ts'

let fail = 0
const eq = (a: unknown, b: unknown, msg: string) => {
  if (JSON.stringify(a) !== JSON.stringify(b)) { fail++; console.log('FAIL', msg, JSON.stringify(a), '!=', JSON.stringify(b)) }
}

// 공식: 70 / 1.7² = 24.22
eq(round1(bmi(170, 70)), 24.2, 'BMI 170/70')

// 대한비만학회 2022 경계 (표시값 기준)
eq(classify(18.44, 'kr'), 'under', '18.44 → 18.4 저체중')
eq(classify(18.46, 'kr'), 'normal', '18.46 → 18.5 정상')
eq(classify(22.9, 'kr'), 'normal', '22.9 정상')
eq(classify(22.94, 'kr'), 'normal', '22.94 → 22.9 정상')
eq(classify(22.96, 'kr'), 'pre', '22.96 → 23.0 비만 전단계 (표시와 판정 일치)')
eq(classify(23, 'kr'), 'pre', '23.0 비만 전단계')
eq(classify(24.9, 'kr'), 'pre', '24.9 비만 전단계')
eq(classify(25, 'kr'), 'obese1', '25 1단계')
eq(classify(29.9, 'kr'), 'obese1', '29.9 1단계')
eq(classify(30, 'kr'), 'obese2', '30 2단계')
eq(classify(34.9, 'kr'), 'obese2', '34.9 2단계')
eq(classify(35, 'kr'), 'obese3', '35 3단계')
// WHO
eq(classify(24.9, 'who'), 'normal', 'WHO 24.9 정상')
eq(classify(25, 'who'), 'pre', 'WHO 25 과체중')
eq(classify(30, 'who'), 'obese1', 'WHO 30 비만1')
eq(classify(39.9, 'who'), 'obese2', 'WHO 39.9 비만2')
eq(classify(40, 'who'), 'obese3', 'WHO 40 비만3')

// 체중 경계: 66.3kg → 22.94(22.9), 66.4kg → 22.98(23.0)
eq(weightAt(23, 170), 66.4, '170cm 23.0 되는 체중')
// 53.3kg → 18.44, 53.4kg → 18.48(18.5)
eq(weightAt(18.5, 170), 53.4, '170cm 18.5 되는 체중')
// 72.1kg → 24.95(24.9), 72.2kg → 24.98(25.0)
eq(weightAt(25, 170), 72.2, '170cm 25.0 되는 체중')
// 경계 체중을 실제로 넣으면 그 단계
for (const h of [150, 163.5, 170, 182, 195]) {
  for (const c of [18.5, 23, 25, 30, 35]) {
    const w = weightAt(c, h)
    eq([round1(bmi(h, w)) >= c, round1(bmi(h, round1(w - 0.1))) < c], [true, true], `경계 ${h}cm BMI ${c}`)
  }
}

const r = analyze(170, 70, 'kr')
eq([r.bmi, r.cls, r.healthyMin, r.healthyMax], [24.2, 'pre', 53.4, 66.3], '170/70 kr 판정·정상범위')
eq([r.toNormal, r.toLower, r.toUpper, r.standardKg], [-3.7, 3.7, 2.2, 63.6], '170/70 kr 정상까지·위아래 단계')
const rw = analyze(170, 70, 'who')
eq([rw.cls, rw.toNormal, rw.healthyMax, rw.toLower, rw.toUpper], ['normal', 0, 72.1, 16.7, 2.2], '170/70 WHO')
const ru = analyze(170, 50, 'kr')
eq([ru.cls, ru.toNormal, ru.toLower, ru.toUpper], ['under', 3.4, null, 3.4], '170/50 저체중 → 3.4kg 증량')
eq(analyze(170, 110, 'kr').toUpper, null, '3단계는 위 단계 없음')

const rows = classRanges(170, 'kr')
eq(rows[1], { c: 'normal', bmiMin: 18.5, bmiMax: 22.9, kgMin: 53.4, kgMax: 66.3 }, '정상 행')
eq([rows[0].kgMin, rows[0].kgMax, rows[5].kgMax, rows[5].bmiMax], [null, 53.3, null, null], '양 끝 행')

eq(gaugePos(15, 'kr'), 0, '게이지 왼끝')
eq(gaugePos(27.5, 'kr'), 50, '게이지 가운데')
eq(gaugePos(50, 'kr'), 100, '게이지 넘침')

// 허리둘레: 남 90 / 여 85 이상 복부비만
eq(waistCheck('male', 89.9, 170, 'pre', 'kr')?.abdominal, false, '남 89.9')
eq(waistCheck('male', 90, 170, 'pre', 'kr'), { abdominal: true, ratio: 90 / 170, risk: 'high' }, '남 90 복부비만 + 비만전단계 → 높음')
eq(waistCheck('female', 85, 170, 'normal', 'kr')?.risk, 'slight', '여 85 + 정상 → 약간 높음')
eq(waistCheck('female', 84, 170, 'normal', 'who')?.risk, null, 'WHO는 위험도 표 없음')
eq(waistCheck('male', 0, 170, 'normal', 'kr'), null, '허리 미입력')

eq([ageNote(0), ageNote(15), ageNote(18), ageNote(19), ageNote(64), ageNote(65)], [null, 'child', 'child', null, null, 'senior'], '나이 안내')
eq([parseStd(null), parseStd('who'), parseStd('x')], ['kr', 'who', 'kr'], '기준 파라미터')

// 기록
const log = upsertLog(upsertLog([], { d: '2026-09-02', h: 170, w: 70 }), { d: '2026-09-01', h: 170, w: 71 })
eq(log.map((e) => e.d), ['2026-09-01', '2026-09-02'], '날짜 정렬')
eq(upsertLog(log, { d: '2026-09-02', h: 170, w: 69 }).map((e) => e.w), [71, 69], '같은 날 덮어쓰기')
eq(sanitizeLog([{ d: 'x', h: 170, w: 70 }, { d: '2026-01-01', h: 0, w: 70 }, null]), [], '깨진 기록 제거')

// 예전 계산 기록 이전
const t1 = new Date(2026, 7, 1, 9).getTime(), t2 = new Date(2026, 7, 1, 20).getTime(), t3 = new Date(2026, 7, 5, 9).getTime()
eq(fromLegacy([
  { type: 'bmi', timestamp: t2, inputs: { height: 170, weight: 69, age: 0, gender: 'male' } },
  { type: 'bmi', timestamp: t1, inputs: { height: 170, weight: 70 } },
  { type: 'salary', timestamp: t3, inputs: { height: 1 } },
  { type: 'bmi', timestamp: t3, inputs: { height: '172', weight: '68.5' } },
  { type: 'bmi', timestamp: t3, inputs: { height: 0, weight: 0 } },
]), [{ d: '2026-08-01', h: 170, w: 69 }, { d: '2026-08-05', h: 172, w: 68.5 }], '예전 기록 이전')
eq(fromLegacy(null), [], '예전 기록 없음')

console.log(fail ? `${fail} FAIL` : 'all ok')
if (fail) process.exit(1)
