// node scripts/check-basic-pension.ts (Node 24) — 기초연금 2026 소득인정액·연금액 회귀 체크
// 기대값: 기초연금 누리집 소득인정액 예시·기초연금액 산정표, 복지부 보도자료(2026-01-09), 법·령 조문 수계산
import assert from 'node:assert/strict'
import {
  BASE, THRESHOLD, LIMITS, BASIC_PROPERTY, calcBasicPension, linkedAmount, workIncome, freeRentIncome, propertyEval,
  type BasicPensionInput,
} from '../src/utils/basicPension.ts'

const zero: BasicPensionInput = {
  household: 'single', self: { work: 0, nps: 0 }, spouse: { work: 0, nps: 0 }, other: 0, interest: 0, freeRent: 0,
  region: 'metro', property: 0, deposit: 0, car: 0, carExempt: false, financial: 0, debt: 0, jikyeok: false,
}
const calc = (p: Partial<BasicPensionInput>) => calcBasicPension({ ...zero, ...p })
const near = (a: number, b: number, msg: string) => assert.ok(Math.abs(a - b) < 1e-6, `${msg}: ${a} != ${b}`)

// 고시 숫자·산정표 (기초연금 누리집 '기초연금액 산정표' 2026)
assert.equal(THRESHOLD.couple, THRESHOLD.single * 1.6, '부부 선정기준액 = 단독 × 160%')
assert.deepEqual([LIMITS.min, LIMITS.addOn, LIMITS.full150, LIMITS.p200, LIMITS.p250], [34_970, 174_850, 524_550, 699_400, 874_250], '산정표')
assert.equal(LIMITS.coupleMin, 69_940, '부부 2인 최저 합계(기준연금액 20%)')
assert.equal(LIMITS.coupleMax, 559_520, '부부 최대 합계(보도자료 2026-01-09)')

// 0 입력: 단독 전액, 부부 2인 각 20% 감액
const z = calc({})
assert.equal(z.recognized, 0); assert.equal(z.eligible, true); assert.equal(z.total.lo, BASE, '무소득 단독 전액')
const zc = calc({ household: 'couple2' })
assert.deepEqual(zc.lo.final, [279_760, 279_760], '부부 각 20% 감액'); assert.equal(zc.total.hi, 559_520)
assert.deepEqual(calc({ household: 'couple1' }).lo.final, [BASE], '부부 1명 수급은 부부감액 없음')

// 누리집 소득인정액 예시: 단독 근로 200만 + 국민연금 30만 = 888,000 / 부부 + 배우자 근로 150만 = 1,126,000
near(calc({ self: { work: 2_000_000, nps: 300_000 } }).recognized, 888_000, '단독 예시')
near(calc({ household: 'couple2', self: { work: 2_000_000, nps: 300_000 }, spouse: { work: 1_500_000, nps: 0 } }).recognized, 1_126_000, '부부 예시')
assert.equal(workIncome(1_160_000), 0, '116만원 이하 근로소득 0'); assert.equal(workIncome(500_000), 0)
assert.equal(calc({ household: 'single', spouse: { work: 9_000_000, nps: 900_000 } }).recognized, 0, '단독이면 배우자 입력 무시')

// 이자 4만원 공제, 무료임차소득(6억 이상 × 0.78% ÷ 12)
assert.equal(calc({ interest: 30_000 }).recognized, 0); assert.equal(calc({ interest: 100_000 }).recognized, 60_000)
assert.equal(freeRentIncome(600_000_000), 390_000, '무료임차 6억'); assert.equal(freeRentIncome(599_999_999), 0, '6억 미만 제외')

// 재산의 소득환산 [규칙 제4조]
near(calc({ property: 300_000_000, financial: 30_000_000 }).property.converted, (165_000_000 + 10_000_000) * 0.04 / 12, '대도시 3억 + 금융 3천만')
assert.deepEqual([BASIC_PROPERTY.metro, BASIC_PROPERTY.city, BASIC_PROPERTY.rural], [135_000_000, 85_000_000, 72_500_000], '기본재산액 표')
near(propertyEval({ ...zero, region: 'rural', property: 100_000_000 }).converted, 27_500_000 * 0.04 / 12, '농어촌 기본재산액')
// 기본재산액 남는 몫은 금융재산으로 넘어가지 않는다(각각 0 하한)
near(calc({ property: 100_000_000, financial: 25_000_000 }).property.converted, 5_000_000 * 0.04 / 12, '기본재산액 이월 없음')
// 부채는 일반·금융 합계에서 빼고 0 하한
assert.equal(calc({ property: 100_000_000, financial: 50_000_000, debt: 40_000_000 }).property.total, 0, '부채가 금융재산 상쇄')
assert.equal(calc({ property: 200_000_000, debt: 100_000_000 }).property.net, 0, '부채 > 순재산 → 0')
near(calc({ deposit: 200_000_000 }).property.converted, 65_000_000 * 0.04 / 12, '전월세 보증금은 일반재산')
// 자동차: 4천만 이상은 가액 전액이 월 소득, 예외 차량은 일반재산
const lux = calc({ car: 40_000_000 })
assert.equal(lux.property.luxuryIncome, 40_000_000); assert.equal(lux.eligible, false, '고급차 → 사실상 탈락')
assert.equal(calc({ car: 40_000_000, carExempt: true }).property.total, 0, '예외 차량은 일반재산(기본재산액 안)')
assert.equal(calc({ car: 39_990_000 }).property.luxury, false, '4천만 미만 일반재산')

// 선정기준액 경계: '이하'면 수급
assert.equal(calc({ other: 2_470_000 }).eligible, true, '단독 247만 = 수급')
assert.equal(calc({ other: 2_470_001 }).eligible, false, '단독 247만 초과 탈락')
assert.equal(calc({ household: 'couple2', other: 3_952_000 }).eligible, true, '부부 395.2만 = 수급')
assert.equal(calc({ household: 'couple2', other: 3_952_001 }).eligible, false)
// 재산만 있는 경우 역산: 대도시 단독 일반재산 8억 7,600만(공제 후 7억 4,100만 × 4% ÷ 12 = 247만)
near(calc({ property: 876_000_000 }).recognized, 2_470_000, '재산만 역산'); assert.equal(calc({ property: 876_000_000 }).eligible, true)
// 근로소득만: (w − 116만) × 70% ≤ 247만 → 월 4,688,571원까지(가이드 문구)
assert.equal(calc({ self: { work: 4_688_571, nps: 0 } }).eligible, true); assert.equal(calc({ self: { work: 4_688_572, nps: 0 } }).eligible, false)
assert.equal(calc({ property: 876_010_000 }).eligible, false, '재산 8억 7,600만 초과 탈락')
assert.equal(calc({ jikyeok: true }).eligible, false, '직역연금 수급권자 제외')
assert.equal(calc({ jikyeok: true }).total.hi, 0)

// 소득역전 방지 감액 [령 제11조]
assert.equal(calc({ other: 2_200_000 }).total.lo, 270_000, '단독: 선정기준액 − 소득인정액')
assert.equal(calc({ other: 2_120_300 }).total.lo, BASE, '합계가 정확히 선정기준액이면 감액 없음')
assert.equal(calc({ other: 2_435_030 }).total.lo, 34_970, '차이 = 10% → 10%')
assert.equal(calc({ other: 2_435_020 }).total.lo, 34_980, '차이 > 10% → 차이')
assert.equal(calc({ other: 2_450_000 }).total.lo, 34_970, '차이 < 10% → 최저 10%')
assert.equal(calc({ other: 2_470_000 }).total.lo, 34_970, '경계 수급자도 최저 10%')
assert.equal(calc({ household: 'couple1', other: 3_700_000 }).total.lo, 252_000, '부부 1명 수급 소득역전')
assert.deepEqual(calc({ household: 'couple2', other: 3_500_000 }).lo.final, [226_000, 226_000], '부부: 452,000 비례 배분')
assert.deepEqual(calc({ household: 'couple2', other: 3_900_000 }).lo.final, [34_970, 34_970], '부부: 최저 20% 합계 → 각 10%')
assert.equal(calc({ household: 'couple2', other: 3_392_480 }).total.lo, 559_520, '부부 합계가 선정기준액과 같으면 감액 없음')

// 국민연금 연계 감액 [법 제5조⑤·제6조, 령 제10조]
assert.deepEqual(linkedAmount(524_550, null), { lo: BASE, hi: BASE, rule: 'full' }, '150% 이하 전액')
assert.deepEqual(linkedAmount(524_560, null), { lo: 349_690, hi: BASE, rule: 'range' }, '150% 초과: 250% 산식 하한')
assert.deepEqual(linkedAmount(600_000, null), { lo: 274_250, hi: BASE, rule: 'range' })
// 60만·A급여 30만: A산식 349,700 − 200,000 + 174,850 = 324,550 > 250% 산식 274,250
assert.equal(linkedAmount(600_000, 300_000).lo, 324_550, 'A산식 적용')
// 60만·A급여 45만: A산식 349,700 − 300,000 + 174,850 = 224,550 < 250% 산식 874,250 − 600,000 = 274,250
assert.equal(linkedAmount(600_000, 450_000).lo, 274_250, '250% 산식이 더 크면 250% 산식')
assert.equal(linkedAmount(900_000, null).lo, 174_850, '200% 초과·A 모름 → 부가연금액 하한')
assert.equal(linkedAmount(900_000, 600_000).lo, 174_850, 'A산식 괄호 음수 → 0 + 부가연금액')
assert.equal(linkedAmount(900_000, 200_000).lo, BASE, 'A산식이 기준연금액 넘으면 상한')
assert.equal(linkedAmount(600_000, 300_001).lo, 324_540, '10원 미만 절사')
assert.equal(linkedAmount(0, null).rule, 'none')
// 연계 감액 → 부부감액 → 소득역전 순서
const chain = calc({ household: 'couple2', self: { work: 0, nps: 600_000, a: 300_000 }, spouse: { work: 0, nps: 0 } })
assert.deepEqual(chain.lo.afterLink, [324_550, BASE]); assert.deepEqual(chain.lo.final, [259_640, 279_760], '연계 → 20%')
const rng = calc({ self: { work: 0, nps: 700_000 } })
assert.equal(rng.exact, false); assert.deepEqual([rng.total.lo, rng.total.hi], [174_850, BASE], 'A급여 모르면 범위')
near(rng.recognized, 700_000, '국민연금은 소득인정액에 공적이전소득으로')

console.log('check-basic-pension: all passed')
