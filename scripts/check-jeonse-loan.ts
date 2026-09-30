// 전세대출 계산 회귀 체크: node scripts/check-jeonse-loan.ts
import assert from 'node:assert/strict'
import { quote, tableRate, bestProduct, payment, hugRate, hugFee, hugDiscount, checks, type Profile } from '../src/utils/jeonseLoan.ts'

const base: Profile = {
  deposit: 200_000_000, location: 'capital', income: 45_000_000, netAsset: 200_000_000, age: 30,
  married: 0, kids: 0, newborn: 0, dual: 0, sme: 0, homeless: 1, area: 1, econtract: 0, want: 0, bankRate: 4,
}

// 금리표 경계 (기금e든든 2026-10-01)
assert.equal(tableRate('general', 20_000_000, 50_000_000), 2.5)
assert.equal(tableRate('general', 20_000_001, 50_000_001), 2.8)
assert.equal(tableRate('general', 75_000_000, 300_000_000), 3.5)
assert.equal(tableRate('youth', 45_000_000, 200_000_000), 2.9)
assert.equal(tableRate('newlywed', 70_000_000, 160_000_000), 3.3)
assert.equal(tableRate('newborn', 10_000_000, 40_000_000), 1.3)
assert.equal(tableRate('newborn', 200_000_000, 500_000_000), 4.3)
assert.equal(tableRate('newborn', 90_000_000, 120_000_000), 2.75)

// 일반 버팀목: 2억 × 70% = 1.4억 > 수도권 1.2억 → 1.2억, 금리 4~6천·1억 초과 = 3.2%
let q = quote('general', base)
assert.deepEqual([q.eligible, q.limit, q.loan, q.rate, q.own], [true, 120_000_000, 120_000_000, 3.2, 80_000_000])
// 지방: 한도 8천, 금리 -0.2
q = quote('general', { ...base, location: 'local' })
assert.deepEqual([q.limit, q.rate], [80_000_000, 3.0])
// 소득 초과 → 불합격, 2자녀면 6천까지 + 한도 80%·2.5억
assert.equal(quote('general', { ...base, income: 55_000_000 }).eligible, false)
q = quote('general', { ...base, income: 55_000_000, kids: 2 })
assert.deepEqual([q.eligible, q.limit], [true, 160_000_000])
// 2자녀 우대 0.5 (상한 0.5), 금리 3.2 − 0.5 = 2.7
assert.equal(q.rate, 2.7)
// 다자녀 0.7 + 전자계약 0.1 → 상한 0.7
q = quote('general', { ...base, kids: 3, econtract: 1 })
assert.deepEqual([q.discountTotal, q.rate], [0.7, 2.5])

// 청년: 1.5억 한도, 2억 × 80% = 1.6억 → 1.5억, 2.9 − 중기 0.3 = 2.6
q = quote('youth', { ...base, sme: 1 })
assert.deepEqual([q.eligible, q.limit, q.rate], [true, 150_000_000, 2.6])
// 만 24세 단독: 한도 1.2억 + 25세 미만 0.3 + 중기 0.3 → 상한 0.5
q = quote('youth', { ...base, age: 24, sme: 1 })
assert.deepEqual([q.limit, q.discountTotal, q.rate], [120_000_000, 0.5, 2.4])
assert.equal(quote('youth', { ...base, age: 35 }).eligible, false)
assert.equal(quote('youth', { ...base, age: 36, sme: 1 }).eligible, true) // 병역 연장 최대 39
assert.equal(quote('youth', { ...base, deposit: 310_000_000 }).eligible, false)

// 소액 대출 우대: 희망액 ≤ 한도 30% → 0.2
q = quote('youth', { ...base, want: 40_000_000 })
assert.deepEqual([q.loan, q.discountTotal, q.rate], [40_000_000, 0.2, 2.7])

// 신혼: 혼인 필요, 7.5천 이하
assert.equal(quote('newlywed', base).eligible, false)
q = quote('newlywed', { ...base, married: 1, income: 70_000_000, deposit: 350_000_000 })
assert.deepEqual([q.eligible, q.limit, q.rate], [true, 250_000_000, 3.3])

// 신생아: 1.3억 (맞벌이 2억), 한도 2.4억, 보증금 수도권 5억
const nb = { ...base, newborn: 1, income: 150_000_000, deposit: 400_000_000 }
assert.equal(quote('newborn', nb).eligible, false)
q = quote('newborn', { ...nb, dual: 1 })
assert.deepEqual([q.eligible, q.limit, q.rate], [true, 240_000_000, 3.55])
// 최종금리 하한 1.0%: 1.3 − 지방 0.2 − 소액 0.2 = 0.9 → 1.0
q = quote('newborn', { ...base, newborn: 1, income: 10_000_000, deposit: 40_000_000, location: 'local', want: 5_000_000 })
assert.equal(q.rate, 1.0)

// 순자산·무주택
assert.equal(checks('general', { ...base, netAsset: 346_000_000 }).find((c) => c.key === 'asset')!.pass, false)
assert.equal(quote('general', { ...base, homeless: 0 }).eligible, false)

// 시중은행: 80%, 최대 4억, 금리 = 입력값
q = quote('bank', { ...base, deposit: 600_000_000, bankRate: 4.1 })
assert.deepEqual([q.eligible, q.limit, q.rate], [true, 400_000_000, 4.1])
assert.equal(quote('bank', { ...base, deposit: 600_000_000, location: 'local' }).eligible, false)

// 추천: 청년(1.5억·2.9%)이 일반(1.2억)보다 한도 큼
assert.equal(bestProduct(base), 'youth')
assert.equal(bestProduct({ ...base, homeless: 0 }), 'bank')

// 상환: 1.2억 × 3.2% ÷ 12 = 320,000, 2년 7,680,000
assert.deepEqual(payment(120_000_000, 3.2, 2, 'bullet'), { monthly: 320_000, monthlyInterest: 320_000, totalInterest: 7_680_000 })
const epi = payment(120_000_000, 3.2, 2, 'equalPrincipalInterest')
assert.ok(epi.monthly > 5_000_000 && epi.totalInterest < 7_680_000 && epi.totalInterest > 0)
assert.equal(payment(0, 3, 2, 'bullet').monthly, 0)

// HUG 보증료율표 (khug 2026-10-01)
assert.equal(hugRate(100_000_000, 'apt', 70), 0.097)
assert.equal(hugRate(200_000_000, 'other', 100), 0.184)
assert.equal(hugRate(500_000_001, 'other', 100), 0.211)
// 2억 기타·80%이하 0.151% × 2년 = 604,000, 할인 60% → 241,600
assert.equal(hugFee(200_000_000, 'other', 80, 730, 0), 604_000)
assert.equal(hugFee(200_000_000, 'other', 80, 730, 0.6), 241_600)
assert.deepEqual([hugDiscount(50_000_000, false, 0), hugDiscount(60_000_000, true, 0), hugDiscount(90_000_000, false, 3), hugDiscount(60_000_000, false, 0)], [0.6, 0.4, 0.4, 0])

console.log('check-jeonse-loan: all passed')
