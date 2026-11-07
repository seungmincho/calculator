// node scripts/check-eitc.ts (Node 24) — 근로·자녀장려금 회귀 체크
// 기대값: 조세특례제한법 제100조의5·제100조의7·제100조의29~31 산식 수계산, 시행령 별표 11·11의2 산정표(2026-11-07 원문 이미지로 대조)
import assert from 'node:assert/strict'
import {
  EITC, CTC, PROPERTY, eitcTable, ctcTable, eitcAmount, calcEitc, phase, type EitcInput,
} from '../src/utils/eitc.ts'

const base: EitcInput = {
  household: 'single', wage: 0, business: 0, rate: 'personal', other: 0, property: 0, children: 0, childCredit: 0, method: 'regular',
}
const calc = (p: Partial<EitcInput>) => calcEitc({ ...base, ...p })

// 법 제100조의3·제100조의5 숫자: 점감 기울기 분모(1천300·1천800·2천700만원) = limit − flatEnd
assert.deepEqual([EITC.single.limit, EITC.one.limit, EITC.two.limit], [22_000_000, 32_000_000, 44_000_000], '총소득기준금액')
assert.deepEqual([EITC.single.max, EITC.one.max, EITC.two.max], [1_650_000, 2_850_000, 3_300_000], '최대액')
assert.deepEqual([EITC.single.limit - EITC.single.flatEnd, EITC.one.limit - EITC.one.flatEnd, EITC.two.limit - EITC.two.flatEnd], [13_000_000, 18_000_000, 27_000_000])
assert.deepEqual([PROPERTY.cap, PROPERTY.half, CTC.limit, CTC.max], [240_000_000, 170_000_000, 70_000_000, 1_000_000])

// 별표 11 원문 행(이미지 대조): [이상, 단독, 홑벌이, 맞벌이]
const rows: [number, number, number, number | null][] = [
  [40_000, 29_000, 29_000, null], [70_000, 42_000, 42_000, null], [1_000_000, 454_000, 454_000, null],
  [3_200_000, 1_362_000, 1_362_000, null], [3_900_000, 1_650_000, 1_650_000, null], [4_000_000, 1_650_000, 1_670_000, null],
  [5_900_000, 1_650_000, 2_443_000, null], [6_000_000, 1_650_000, 2_484_000, 2_517_000],
  [21_400_000, 77_000, 1_679_000, 2_763_000], [21_700_000, 39_000, 1_631_000, 2_726_000], [21_770_000, 30_000, 1_631_000, 2_717_000],
  [21_800_000, 26_000, 1_615_000, 2_714_000], [21_881_900, 0, 1_615_000, 2_704_000],
  [31_800_000, 0, 32_000, 1_492_000], [31_810_600, 0, 30_000, 1_490_000], [31_900_000, 0, 16_000, 1_479_000], [31_905_300, 0, 0, 1_479_000],
  [41_400_000, 0, 0, 318_000], [43_600_000, 0, 0, 49_000], [43_700_000, 0, 0, 37_000], [43_754_600, 0, 0, 30_000],
  [43_800_000, 0, 0, 25_000], [43_877_300, 0, 0, 0], [43_900_000, 0, 0, 0],
]
for (const [x, s, o, t] of rows) {
  assert.equal(eitcTable('single', x), s, `별표 11 단독 ${x}`)
  assert.equal(eitcTable('one', x), o, `별표 11 홑벌이 ${x}`)
  assert.equal(eitcTable('two', x), t, `별표 11 맞벌이 ${x}`)
}
assert.equal(eitcTable('single', 39_999), 0, '표 첫 행(4만원) 미만')
assert.equal(eitcTable('single', 3_999_999), 1_650_000, '같은 행이면 같은 금액')

// 구간 경계: 법정 산식 수계산 → 천원 올림
assert.equal(eitcTable('single', 12_000_000), 1_270_000, '단독 점감 1,650,000 − 300만 × 165/1300 = 1,269,231 → 1,270,000')
assert.equal(eitcTable('single', 9_000_000), 1_650_000, '단독 평탄 끝 = 점감 시작')
assert.equal(eitcTable('one', 7_000_000), 2_850_000); assert.equal(eitcTable('one', 14_000_000), 2_850_000)
assert.equal(eitcTable('one', 20_000_000), 1_900_000, '홑벌이 2,850,000 − 600만 × 285/1800 = 1,900,000')
assert.equal(eitcTable('two', 8_000_000), 3_300_000); assert.equal(eitcTable('two', 17_000_000), 3_300_000)
assert.equal(eitcTable('two', 30_000_000), 1_712_000, '맞벌이 3,300,000 − 1,300만 × 330/2700 = 1,711,111 → 1,712,000')
assert.equal(eitcTable('one', 1_000_000), 454_000, '홑벌이 점증은 단독 금액보다 낮지 않음(100만 × 285/700 = 407,143 아님)')
assert.deepEqual([phase('single', 3_999_999), phase('single', 4_000_000), phase('single', 9_000_000), phase('single', 22_000_000)], ['rising', 'flat', 'falling', null])

// 별표 11의2 자녀장려금(1명당) 원문 행
const kids: [number, number, number | null][] = [
  [40_000, 1_000_000, null], [6_000_000, 1_000_000, 1_000_000], [21_000_000, 1_000_000, 1_000_000], [21_500_000, 995_000, 1_000_000],
  [25_000_000, 960_000, 1_000_000], [25_500_000, 955_000, 995_000], [40_000_000, 807_000, 834_000], [62_000_000, 582_000, 589_000],
  [69_500_000, 506_000, 506_000], [69_999_999, 506_000, 506_000],
]
for (const [x, o, t] of kids) {
  assert.equal(ctcTable('one', x), o, `별표 11의2 홑벌이 ${x}`)
  assert.equal(ctcTable('two', x), t, `별표 11의2 맞벌이 ${x}`)
}
assert.equal(ctcTable('one', 70_000_000), 0, '총소득 7천만원 미만만')

// 결정 단계 최소액 [법 제100조의7③]
assert.deepEqual(eitcAmount('single', 40_000, false, false), { base: 29_000, reduced: 29_000, amount: 100_000, minApplied: true }, '점증 1.5만~10만 → 10만원')
assert.equal(eitcAmount('single', 21_800_000, false, false).amount, 30_000, '점감 1.5만~3만 → 3만원')
assert.equal(eitcAmount('single', 21_700_000, true, false).amount, 30_000, '재산 감액 후 19,500원 → 3만원')
assert.equal(eitcAmount('single', 21_800_000, true, false).amount, 0, '재산 감액 후 13,000원 → 0원')
assert.equal(eitcAmount('two', 43_800_000, false, false).amount, 30_000)
assert.equal(calc({ wage: 21_881_900 }).eitc.reason, 'tiny', '산정액 1만5천원 미만')

// 첫 화면 기본값: 단독 1,200만원·재산 1억
const d = calc({ wage: 12_000_000, property: 100_000_000 })
assert.equal(d.eitc.amount, 1_270_000); assert.equal(d.eitc.phase, 'falling'); assert.equal(d.sum, 1_270_000)

// 재산 [법 제100조의3①4·제100조의5④]
assert.equal(calc({ wage: 12_000_000, property: 169_999_999 }).eitc.amount, 1_270_000, '1억7천만원 미만 감액 없음')
assert.equal(calc({ wage: 12_000_000, property: 170_000_000 }).eitc.amount, 635_000, '1억7천만원 이상 50%')
assert.equal(calc({ wage: 12_000_000, property: 239_999_999 }).eitc.amount, 635_000)
const over = calc({ wage: 12_000_000, property: 240_000_000 })
assert.equal(over.eitc.amount, 0); assert.equal(over.eitc.reason, 'property', '2억4천만원 이상 대상 아님')

// 소득 상한: 연간 총소득(총급여액 등 + 이자·배당·연금·기타) 기준 '미만'
assert.equal(calc({ wage: 21_999_999 }).eitc.reason, 'tiny')
assert.equal(calc({ wage: 22_000_000 }).eitc.reason, 'income')
const other = calc({ wage: 20_000_000, other: 2_000_000 })
assert.equal(other.eitc.amount, 0); assert.equal(other.eitc.reason, 'income', '총소득 2,200만원 이상')
assert.equal(calc({ household: 'one', wage: 32_000_000 }).eitc.reason, 'income')
assert.equal(calc({ household: 'two', wage: 44_000_000 }).eitc.reason, 'income')
assert.equal(calc({ wage: 39_999 }).eitc.reason, 'noIncome')

// 사업소득 × 업종별 조정률 [령 제100조의3①4]
assert.equal(calc({ business: 10_000_000 }).earned, 9_000_000, '인적용역 90%')
assert.equal(calc({ business: 10_000_000 }).eitc.amount, 1_650_000)
assert.equal(calc({ business: 10_000_000, rate: 'wholesale' }).eitc.amount, 867_000, '도매업 20% → 200만원 → 별표 867,000')

// 맞벌이 합산 600만원 미만 → 홑벌이
const dn = calc({ household: 'two', wage: 5_999_999 })
assert.equal(dn.downgraded, true); assert.equal(dn.household, 'one'); assert.equal(dn.eitc.amount, 2_443_000)
assert.equal(calc({ household: 'two', wage: 6_000_000 }).eitc.amount, 2_517_000)

// 기한 후 95% [법 제100조의7②] — 근로·자녀 모두
assert.equal(calc({ wage: 12_000_000, method: 'late' }).eitc.amount, 1_206_500)
assert.equal(calc({ wage: 12_000_000, method: 'late', property: 200_000_000 }).eitc.amount, 603_250, '50% × 95%')
assert.equal(calc({ household: 'one', wage: 10_000_000, method: 'late' }).eitc.amount, 2_707_500)
assert.equal(calc({ household: 'one', wage: 20_000_000, children: 2, method: 'late' }).ctc.amount, 1_900_000)

// 자녀장려금 [법 제100조의29·제100조의31, 령 제100조의31②]
const c2 = calc({ household: 'one', wage: 20_000_000, children: 2 })
assert.equal(c2.ctc.amount, 2_000_000); assert.equal(c2.eitc.amount, 1_900_000); assert.equal(c2.sum, 3_900_000)
assert.equal(calc({ household: 'one', wage: 20_000_000, children: 2, property: 170_000_000 }).ctc.amount, 1_000_000, '재산 50%')
assert.equal(calc({ household: 'one', wage: 20_000_000, children: 1, property: 240_000_000 }).ctc.reason, 'property')
const c40 = calc({ household: 'one', wage: 40_000_000, children: 1 })
assert.equal(c40.eitc.reason, 'income', '홑벌이 근로장려금은 3,200만원 미만'); assert.equal(c40.ctc.amount, 807_000, '자녀장려금은 7천만원 미만')
assert.equal(calc({ household: 'two', wage: 69_999_999, children: 3 }).ctc.amount, 1_518_000)
assert.equal(calc({ household: 'two', wage: 70_000_000, children: 1 }).ctc.reason, 'income')
assert.equal(calc({ household: 'two', wage: 65_000_000, other: 5_000_000, children: 1 }).ctc.reason, 'income', '총소득 기준')
// 자녀세액공제 차감 후 3만원 미만이면 3만원, 0 이하면 없음. 맞벌이 6천만원 1명 = 612,000원
assert.equal(calc({ household: 'two', wage: 60_000_000, children: 1 }).ctc.amount, 612_000)
assert.equal(calc({ household: 'two', wage: 60_000_000, children: 1, childCredit: 250_000 }).ctc.amount, 362_000)
assert.equal(calc({ household: 'two', wage: 60_000_000, children: 1, childCredit: 600_000 }).ctc.amount, 30_000)
const cc0 = calc({ household: 'two', wage: 60_000_000, children: 1, childCredit: 612_000 })
assert.equal(cc0.ctc.amount, 0); assert.equal(cc0.ctc.reason, 'credit')
assert.equal(calc({ wage: 12_000_000, children: 2 }).ctc.reason, 'single', '단독가구는 부양자녀가 없는 가구')
assert.equal(calc({ household: 'one', wage: 12_000_000 }).ctc.reason, 'noChildren')

// 반기 [법 제100조의5②·제100조의6③, 령 제100조의9④]
assert.deepEqual(calc({ wage: 12_000_000, method: 'half' }).half, { first: 444_500, second: 825_500, deferred: false }, '35% 먼저')
assert.deepEqual(calc({ wage: 300_000, method: 'half' }).half, { first: 0, second: 165_000, deferred: true }, '15만원 미만은 정산 때')
const hb = calc({ wage: 6_000_000, business: 1_000_000, method: 'half' })
assert.equal(hb.halfInvalid, true); assert.equal(hb.method, 'regular'); assert.equal(hb.half, null)

console.log('check-eitc: all passed')
