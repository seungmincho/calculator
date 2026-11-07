// node scripts/check-child-growth.ts (Node 24)
// 2017 소아청소년 성장도표 공식 값과 대조(확인 2026-11-07). 기대값 출처:
// - 공식 곡선값: 질병관리청 성장도표 계산기(knhanes.kdca.go.kr/knhanes/grtcht/clclt/measClclt.do)가 그리는 P3·P50·P97 / P5·P50·P95
// - 공식 백분위: 같은 계산기에 아래 입력을 넣었을 때의 결과(소수 첫째 자리)
import assert from 'node:assert/strict'
import { MAX_MONTH, Z97, ageMonths, bmiClass, bmiOf, lmsAt, midParental, normCdf, rankOf, score, valueAtZ, zScore, type Lms, type Measure, type Sex } from '../src/utils/childGrowth.ts'

const Z95 = 1.6448536269514722
const r1 = (n: number) => Math.round(n * 10) / 10
const curve = (s: Sex, m: Measure, mo: number, z: number) => r1(valueAtZ(lmsAt(s, m, mo)!, z))

// 1) 공식 성장도표 값(0.1 단위)과 일치
const published: [Sex, Measure, number, number, number, number][] = [
  // 성별, 지표, 개월, 하단(P3|P5), P50, 상단(P97|P95)
  ['m', 'height', 0, 46.3, 49.9, 53.4], // WHO 출생 누운 키
  ['m', 'height', 24, 81.4, 87.1, 92.9], // WHO 선 키 시작
  ['m', 'height', 36, 89.7, 96.5, 104.4], // 한국 자료 시작
  ['m', 'height', 72, 107.4, 115.9, 125.0], // 만 6세 남
  ['f', 'height', 72, 106.6, 114.7, 123.3], // 만 6세 여
  ['f', 'height', 120, 128.2, 139.1, 151.2], // 만 10세 여
  ['m', 'height', 180, 156.5, 169.2, 179.9], // 만 15세 남
  ['m', 'height', 216, 163.3, 173.6, 184.3], // 만 18세 남
  ['f', 'height', 216, 151.6, 160.6, 170.4], // 만 18세 여
  ['m', 'height', 227, 164.4, 174.5, 185.3], // 마지막 달
  ['m', 'weight', 72, 17.5, 21.3, 27.2],
  ['f', 'weight', 120, 25.8, 34.4, 47.5],
  ['m', 'bmi', 24, 14.2, 16.0, 18.3],
  ['f', 'bmi', 120, 14.4, 17.8, 22.4],
  ['m', 'bmi', 180, 17.0, 21.2, 26.2],
]
for (const [s, m, mo, lo, mid, hi] of published) {
  const z = m === 'height' ? Z97 : Z95
  assert.deepEqual([curve(s, m, mo, -z), curve(s, m, mo, 0), curve(s, m, mo, z)], [lo, mid, hi], `${s} ${m} ${mo}개월 공식 곡선`)
}

// 2) 공식 계산기 백분위와 대조. 0~35개월(WHO)은 같은 값, 36개월부터는 역산 LMS 라 허용 오차를 둔다
const official: [Sex, number, number, number, number, number, number | null][] = [
  // 성별, 개월, 키, 몸무게, 키 백분위, 몸무게 백분위, BMI 백분위
  ['m', 12, 76, 9.5, 54.2, 44.4, null],
  ['f', 30, 88, 12, 22.4, 32.4, 49.2],
  ['m', 36, 95, 14, 34.8, 29.8, 33.9],
  ['f', 40, 98, 14.5, 54.3, 40.2, 28.2],
  ['m', 60, 110, 19, 53.7, 50.7, 43.2],
  ['f', 60, 110, 19, 64.9, 60.9, 49.1],
  ['m', 77, 116, 21, 30.0, 30.4, 35.5],
  ['m', 78, 116, 21, 26.4, 27.7, 35.0],
  ['m', 78, 105, 15, 0.1, 0.0, 2.5],
  ['m', 78, 116, 27, 26.4, 87.4, 98.0],
  ['m', 78, 116, 24.5, 26.4, 69.9, 87.8],
  ['m', 78, 130, 30, 98.5, 96.1, 83.0],
  ['f', 100, 125, 23, 24.2, 12.0, 12.7],
  ['m', 120, 135, 35, 25.0, 46.8, 62.4],
  ['f', 140, 148, 42, 38.5, 48.8, 54.5],
  ['m', 150, 150, 48, 24.6, 49.3, 66.1],
  ['m', 180, 170, 60, 55.3, 49.5, 44.6],
  ['f', 180, 160, 52, 53.9, 47.0, 42.7],
  ['m', 200, 172, 70, 48.0, 72.2, 75.3],
  ['f', 210, 158, 55, 31.1, 55.3, 64.9],
]
for (const [s, mo, h, w, ph, pw, pb] of official) {
  const who = mo < 36
  const near = (got: number | undefined, want: number, tol: number, what: string) =>
    assert.ok(got !== undefined && Math.abs(got - want) <= tol, `${s} ${mo}개월 ${what}: ${got?.toFixed(2)} vs 공식 ${want}`)
  near(score(s, 'height', mo, h)?.p, ph, who ? 0.06 : 0.5, '키')
  near(score(s, 'weight', mo, w)?.p, pw, who ? 0.06 : 1, '몸무게')
  if (pb === null) assert.equal(score(s, 'bmi', mo, bmiOf(h, w)), null, '24개월 전 BMI 없음')
  else near(score(s, 'bmi', mo, bmiOf(h, w))?.p, pb, who ? 0.06 : 2, 'BMI')
}

// 3) 공식 판정과 같은 구분
assert.equal(score('m', 'height', 78, 105)!.p < 3, true, '저신장 기준')
assert.equal(bmiClass(score('m', 'bmi', 78, bmiOf(116, 27))!.p), 'obese', '비만')
assert.equal(bmiClass(score('m', 'bmi', 78, bmiOf(116, 24.5))!.p), 'over', '과체중')
assert.equal(bmiClass(score('m', 'bmi', 78, bmiOf(105, 15))!.p), 'thin', '쇠약증')
assert.equal(bmiClass(score('m', 'bmi', 78, bmiOf(116, 21))!.p), 'normal', '정상')
assert.equal(bmiClass(85), 'over'); assert.equal(bmiClass(95), 'obese'); assert.equal(bmiClass(4.99), 'thin')

// 4) 나이: 만 개월(일 단위 내림), 공식 계산기와 같음(2020-05-22 → 2026-11-07 = 77개월)
assert.equal(ageMonths('2020-05-22', '2026-11-07'), 77)
assert.equal(ageMonths('2020-05-07', '2026-11-07'), 78)
assert.equal(ageMonths('2026-11-07', '2026-11-07'), 0)
assert.equal(ageMonths('2026-10-20', '2026-11-07'), 0)
assert.equal(ageMonths('2026-11-08', '2026-11-07'), null, '측정일이 앞섬')
assert.equal(ageMonths('2024-02-29', '2025-02-28'), 11, '윤일생')
assert.equal(ageMonths('2024-02-30', '2025-02-28'), null, '없는 날짜')
assert.equal(ageMonths('', '2025-02-28'), null)

// 5) 범위 밖·잘못된 입력
assert.equal(lmsAt('m', 'height', -1), null)
assert.equal(lmsAt('m', 'height', MAX_MONTH + 1), null, '19세부터 자료 없음(공식 계산기도 빈 결과)')
assert.ok(lmsAt('f', 'bmi', MAX_MONTH))
assert.equal(lmsAt('m', 'bmi', 23), null, 'BMI 는 24개월부터')
assert.equal(lmsAt('m', 'height', 12.5), null)
assert.equal(score('m', 'height', 72, 0), null)
assert.equal(score('m', 'height', 72, NaN), null)
assert.equal(score('m', 'weight', 72, -3), null)
for (const v of [30, 60, 220]) assert.ok(Number.isFinite(score('f', 'height', 100, v)!.p), `극단 키 ${v}`)
assert.ok(score('m', 'weight', 72, 1)!.p < 0.01 && score('m', 'weight', 72, 200)!.p > 99.99, '극단 몸무게')

// 6) 단조성: 모든 달에서 큰 값일수록 백분위가 높다
for (const s of ['m', 'f'] as const) for (const m of ['height', 'weight', 'bmi'] as const) {
  for (let mo = m === 'bmi' ? 24 : 0; mo <= MAX_MONTH; mo++) {
    const l = lmsAt(s, m, mo)!
    const a = valueAtZ(l, -2), b = valueAtZ(l, 0), c = valueAtZ(l, 2)
    assert.ok(a < b && b < c, `${s} ${m} ${mo} 곡선 순서`)
    assert.ok(Math.abs(zScore(b, l)) < 1e-9, `${s} ${m} ${mo} M 의 z=0`)
  }
}

// 7) L=0 분기, 정규분포, 순위 문구
const l0: Lms = [0, 20, 0.1]
assert.ok(Math.abs(zScore(valueAtZ(l0, 1.5), l0) - 1.5) < 1e-12)
assert.ok(Math.abs(normCdf(0) - 0.5) < 1e-7 && Math.abs(normCdf(Z97) - 0.97) < 1e-6 && Math.abs(normCdf(-Z95) - 0.05) < 1e-6)
assert.deepEqual([rankOf(0.04), rankOf(26.4), rankOf(26.5), rankOf(99.96)], [1, 26, 27, 100])

// 8) 부모 키 예상 성인 키(국가건강정보포털 식, 서울아산병원 범위)
assert.deepEqual(midParental('m', 175, 162), { mid: 175, lo: 165, hi: 185 })
assert.deepEqual(midParental('f', 175, 162), { mid: 162, lo: 153.5, hi: 170.5 })
assert.equal(midParental('m', 175, NaN), null)
assert.equal(midParental('m', 175, 40), null)

console.log('check-child-growth: all passed')
