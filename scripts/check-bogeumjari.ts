// 보금자리론 회귀 체크: node scripts/check-bogeumjari.ts
// 기준: hf.go.kr 상품안내(sub01_01_01/02, 2026-10-04 확인)·금리안내(2026-10-01 공시), 금융위 10.15 FAQ, 6.27 대책
import assert from 'node:assert/strict'
import { calcBogeumjari, didimdolHint, getLtv, getIncomeLimit, PERIOD_RATES, MIN_RATE, type BogeumjariInput } from '../src/utils/bogeumjari.ts'

const base: BogeumjariInput = {
  income: 60_000_000, price: 400_000_000, type: 'general', children: 0, period: '30', age: 35,
  owned: '0', kind: 'apt', region: 'local', debtMonthly: 0, want: 0, perks: [],
}
const run = (x: Partial<BogeumjariInput>) => calcBogeumjari({ ...base, ...x })

// 공식 만기·금리 (아낌e 2026-10-01): 25년 만기 없음
assert.deepEqual(Object.keys(PERIOD_RATES), ['10', '15', '20', '30', '40', '50'])
assert.deepEqual(Object.values(PERIOD_RATES), [4.9, 5.0, 5.05, 5.1, 5.15, 5.2])
assert.equal(MIN_RATE.toFixed(2), '3.90')

// 소득 기준
assert.deepEqual(
  [getIncomeLimit('general', 0), getIncomeLimit('newlywed', 0), getIncomeLimit('general', 1), getIncomeLimit('general', 2), getIncomeLimit('newlywed', 1)],
  [70_000_000, 85_000_000, 90_000_000, 100_000_000, 90_000_000],
)

// LTV: 생애최초 지방 80%, 수도권·규제지역 70% (6.27, hf 생애최초 보금자리론)
assert.equal(getLtv('first', 'apt', 'local', true), 0.8)
assert.equal(getLtv('first', 'other', 'capital', true), 0.7)
assert.equal(getLtv('first', 'apt', 'regulated', true), 0.7)
// 일반 아파트 70 / 기타 65, 규제지역 비실수요자 60 / 55
assert.deepEqual([getLtv('general', 'apt', 'capital', false), getLtv('general', 'other', 'local', false)], [0.7, 0.65])
assert.deepEqual([getLtv('general', 'apt', 'regulated', false), getLtv('general', 'other', 'regulated', false)], [0.6, 0.55])
assert.equal(getLtv('general', 'apt', 'regulated', true), 0.7) // 실수요자 미차감

// 생애최초 4억 주택: 지방 3.2억(80%), 수도권 2.8억(70%) — 한도 4.2억 내
assert.equal(run({ type: 'first' }).maxLoan, 320_000_000)
assert.equal(run({ type: 'first', region: 'capital' }).maxLoan, 280_000_000)
// 생애최초 6억 지방: 80% = 4.8억 → 상한 4.2억
assert.equal(run({ type: 'first', price: 600_000_000, income: 69_000_000 }).binding.key, 'cap')

// 규제지역 가산 0.2%p (전세사기피해자 제외), 우대 상한 1.0%p
assert.equal(run({ region: 'regulated' }).rate, 5.3)
assert.equal(run({ region: 'capital' }).rate, 5.1)
assert.equal(run({ region: 'regulated', perks: ['fraud'] }).rate, 4.1)
assert.equal(run({ type: 'newlywed', children: 3, perks: ['single'] }).rate, 4.1) // 0.3+0.7+0.7 → 1.0 상한

// 규제지역 실수요자(무주택·7천 이하·6억 이하) → LTV·DTI 미차감
let r = run({ region: 'regulated' })
assert.deepEqual([r.ltv, r.dtiCap], [0.7, 60])
// 1주택(처분조건) 또는 소득 7천 초과 → LTV 60%, DTI 50%
r = run({ region: 'regulated', owned: '1' })
assert.deepEqual([r.ltv, r.dtiCap, r.maxLoan], [0.6, 50, 240_000_000])
r = run({ region: 'regulated', type: 'newlywed', income: 80_000_000 })
assert.deepEqual([r.ltv, r.dtiCap], [0.6, 50])
// 생애최초는 규제지역에서도 DTI 60% 유지
assert.equal(run({ type: 'first', region: 'regulated', income: 69_000_000 }).dtiCap, 60)

// 전세사기피해자 한도 4억
assert.equal(run({ price: 600_000_000, perks: ['fraud'], income: 69_000_000 }).limits.find((l) => l.key === 'cap')!.amount, 400_000_000)

// 전세사기피해자 보금자리론 (hf sub01_01_02, 2026-10-04): 소득 상한 없음·9억 이하·LTV 80%·DTI 100%·한도 4억
r = run({ perks: ['fraud'], income: 150_000_000, price: 800_000_000, region: 'regulated', owned: '1' })
assert.deepEqual([r.eligible, r.ltv, r.dtiCap, r.maxLoan, r.surcharge], [true, 0.8, 100, 400_000_000, 0])
assert.equal(run({ perks: ['fraud'], price: 950_000_000 }).checks.find((c) => c.label === '주택가격')!.status, 'fail')
assert.equal(run({ price: 650_000_000 }).eligible, false) // 일반은 6억 초과 불가

// NICE CB점수 (hf sub01_01_01, 2026-10-04): 271점 미만 불가, 271~614점 LTV 10%p 차감(규제지역 차감과 누적)
assert.equal(run({ credit: 'low' }).eligible, false)
assert.deepEqual([run({ credit: 'mid' }).ltv, run({ credit: 'mid', kind: 'other' }).ltv], [0.6, 0.55])
assert.equal(run({ credit: 'mid', region: 'regulated', owned: '1' }).ltv, 0.5)
assert.deepEqual([run({ credit: 'mid', type: 'first' }).ltv, run({ credit: 'mid', type: 'first', region: 'capital' }).ltv], [0.7, 0.6])
assert.equal(run({ credit: 'mid', perks: ['fraud'] }).ltv, 0.8)
assert.ok(run({ credit: 'mid' }).checks.some((c) => c.label === '신용점수' && c.status === 'warn'))
assert.equal(run({ credit: 'mid' }).maxLoan, 240_000_000) // 4억 × 60%

// 신혼가구·신생아 중복 불가
assert.deepEqual(run({ type: 'newlywed', perks: ['newborn'] }).discounts.map((d) => d.label), ['신혼가구'])

// 만기 50년: 만 35세 미만(신혼 40세 미만)
assert.equal(run({ period: '50', age: 35 }).eligible, false)
assert.equal(run({ period: '50', age: 38, type: 'newlywed' }).eligible, true)

// 수도권·규제지역 6개월 전입 의무 안내
assert.ok(run({ region: 'capital' }).checks.some((c) => c.label === '전입 의무' && c.status === 'warn'))
assert.ok(!run({}).checks.some((c) => c.label === '전입 의무'))

// DTI 역산: 연 6천 × 60% = 월 300만 여력 → 5.1% 30년 원리금균등
r = run({ price: 600_000_000, income: 60_000_000, type: 'first' })
assert.ok(r.monthly <= 3_000_000 && r.dti <= 60)

// 디딤돌 자격 힌트: 소득 6천/7천(생애최초·2자녀)/8.5천(신혼), 주택 5억/6억, 한도 2억/2.4억/3.2억
const dd = (x: Partial<Parameters<typeof didimdolHint>[0]>) => didimdolHint({ income: 50_000_000, price: 400_000_000, type: 'general', children: 0, owned: '0', ...x })
assert.deepEqual([dd({}).incomeLimit, dd({}).priceLimit, dd({}).maxLoan, dd({}).ok], [60_000_000, 500_000_000, 200_000_000, true])
assert.deepEqual([dd({ type: 'first' }).incomeLimit, dd({ type: 'first' }).priceLimit, dd({ type: 'first' }).maxLoan], [70_000_000, 500_000_000, 240_000_000])
assert.deepEqual([dd({ type: 'newlywed' }).incomeLimit, dd({ type: 'newlywed' }).priceLimit, dd({ type: 'newlywed' }).maxLoan], [85_000_000, 600_000_000, 320_000_000])
assert.deepEqual([dd({ children: 2 }).incomeLimit, dd({ children: 2 }).priceLimit, dd({ children: 2 }).maxLoan], [70_000_000, 600_000_000, 320_000_000])
assert.equal(dd({ income: 65_000_000 }).ok, false)
assert.equal(dd({ price: 550_000_000 }).priceOk, false)
assert.equal(dd({ owned: '1' }).ok, false)

console.log('check-bogeumjari: all passed')
