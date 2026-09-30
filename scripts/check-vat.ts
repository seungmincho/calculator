// 부가세 계산 회귀 체크: node scripts/check-vat.ts
import assert from 'node:assert/strict'
import {
  fromSupply, fromTotal, fromVat, vatOf, invoice, encodeLines, decodeLines,
  generalReturn, simpleReturn, nextDeadline, type Line,
} from '../src/utils/vat.ts'

// 정방향: 세액 원 미만 절사/반올림
assert.deepEqual(fromSupply(1_000_000), { supply: 1_000_000, vat: 100_000, total: 1_100_000 })
assert.deepEqual(fromSupply(15, 'floor'), { supply: 15, vat: 1, total: 16 })
assert.deepEqual(fromSupply(15, 'round'), { supply: 15, vat: 2, total: 17 })
assert.deepEqual(fromSupply(-5), { supply: 0, vat: 0, total: 0 })
assert.deepEqual(fromSupply(NaN), { supply: 0, vat: 0, total: 0 })

// 역산: 합계는 그대로, 세액 = 합계/11, 1원 끝수 차이(gap)
assert.deepEqual(fromTotal(1_100_000), { supply: 1_000_000, vat: 100_000, total: 1_100_000, gap: 0 })
assert.deepEqual(fromTotal(10_000), { supply: 9_091, vat: 909, total: 10_000, gap: 0 })
assert.deepEqual(fromTotal(16, 'floor'), { supply: 15, vat: 1, total: 16, gap: 0 })
assert.deepEqual(fromTotal(16, 'round'), { supply: 15, vat: 1, total: 16, gap: -1 })
assert.deepEqual(fromTotal(21, 'floor'), { supply: 20, vat: 1, total: 21, gap: -1 })
assert.deepEqual(fromTotal(21, 'round'), { supply: 19, vat: 2, total: 21, gap: 0 })
// 어떤 합계든 공급가액 + 세액 = 합계
for (let t = 1; t < 5000; t++) for (const r of ['floor', 'round'] as const) {
  const s = fromTotal(t, r)
  assert.equal(s.supply + s.vat, t)
  assert.ok(Math.abs(s.gap) <= 1)
}
assert.deepEqual(fromVat(100_000), { supply: 1_000_000, vat: 100_000, total: 1_100_000 })
assert.equal(vatOf(99_999), 9_999)

// 여러 품목: 과세/면세/영세율
const lines: Line[] = [
  { name: 'A', qty: 2, price: 15_000, kind: 'taxable' },
  { name: 'B', qty: 3, price: 333, kind: 'taxable' },
  { name: '쌀', qty: 1, price: 50_000, kind: 'exempt' },
  { name: '수출', qty: 1, price: 100_000, kind: 'zero' },
]
const inv = invoice(lines, false)
assert.equal(inv.taxableSupply, 30_999)
assert.equal(inv.vat, 3_099)
assert.equal(inv.vatOnSum, 3_099)
assert.equal(inv.exempt, 50_000)
assert.equal(inv.zeroSupply, 100_000)
assert.equal(inv.total, 184_098)
assert.equal(inv.lines[2].vat, 0)
// 품목별 절사 합 ≠ 합계 × 10%
const small = invoice(Array.from({ length: 5 }, () => ({ name: '', qty: 1, price: 15, kind: 'taxable' as const })), false)
assert.equal(small.vat, 5)
assert.equal(small.vatOnSum, 7)
// 단가 부가세 포함(쇼핑몰 판매가)
const incl = invoice([
  { name: 'X', qty: 1, price: 11_000, kind: 'taxable' },
  { name: 'Y', qty: 3, price: 990, kind: 'taxable' },
  { name: 'Z', qty: 1, price: 5_000, kind: 'exempt' },
], true)
assert.deepEqual([incl.lines[0].supply, incl.lines[0].vat], [10_000, 1_000])
assert.deepEqual([incl.lines[1].supply, incl.lines[1].vat], [2_700, 270])
assert.equal(incl.total, 11_000 + 2_970 + 5_000)
// 소수 수량 (1.5kg × 3,333원 = 4,999.5 → 5,000)
assert.equal(invoice([{ name: '', qty: 1.5, price: 3_333, kind: 'taxable' }], false).taxableSupply, 5_000)

// URL 인코딩 왕복
const tricky: Line[] = [{ name: '쌀;~ 10kg', qty: 2, price: 1_500, kind: 'exempt' }, { name: '', qty: 1, price: 0, kind: 'zero' }]
assert.deepEqual(decodeLines(encodeLines(tricky)), tricky)
assert.deepEqual(decodeLines('x|1|2|?'), [{ name: 'x', qty: 1, price: 2, kind: 'taxable' }])

// 일반과세자 신고
assert.deepEqual(
  generalReturn({ sales: 50_000_000, purchases: 20_000_000, cardSales: 33_000_000, cardEligible: true, eFiling: true }),
  { outputTax: 5_000_000, inputTax: 2_000_000, cardCredit: 429_000, eFilingCredit: 10_000, payable: 2_561_000 },
)
// 카드 공제 연 1,000만원 한도
assert.equal(generalReturn({ sales: 2e9, purchases: 0, cardSales: 1e9, cardEligible: true, eFiling: false }).cardCredit, 10_000_000)
// 카드 공제는 납부세액 한도
assert.equal(generalReturn({ sales: 10_000_000, purchases: 9_900_000, cardSales: 11_000_000, cardEligible: true, eFiling: false }).cardCredit, 10_000)
// 대상 아님(법인·10억 초과)
assert.equal(generalReturn({ sales: 10_000_000, purchases: 0, cardSales: 11_000_000, cardEligible: false, eFiling: false }).cardCredit, 0)
// 환급
const refund = generalReturn({ sales: 10_000_000, purchases: 30_000_000, cardSales: 5_000_000, cardEligible: true, eFiling: true })
assert.equal(refund.cardCredit, 0)
assert.equal(refund.payable, -2_010_000)

// 간이과세자: 공급대가 × 부가가치율 × 10%
const s1 = simpleReturn({ sales: 80_000_000, industry: 'retail', purchases: 30_000_000, cardSales: 50_000_000, eFiling: true })
assert.deepEqual(s1, { outputTax: 1_200_000, inputTax: 150_000, cardCredit: 650_000, eFilingCredit: 10_000, payable: 390_000, exempt: false, overThreshold: false })
assert.equal(simpleReturn({ sales: 100_000_000, industry: 'professional', purchases: 0, cardSales: 0, eFiling: false }).outputTax, 4_000_000)
assert.equal(simpleReturn({ sales: 100_000_000, industry: 'manufacturing', purchases: 0, cardSales: 0, eFiling: false }).outputTax, 2_000_000)
// 납부면제 4,800만원 미만
assert.equal(simpleReturn({ sales: 47_999_999, industry: 'construction', purchases: 0, cardSales: 0, eFiling: false }).payable, 0)
assert.equal(simpleReturn({ sales: 47_999_999, industry: 'construction', purchases: 0, cardSales: 0, eFiling: false }).exempt, true)
assert.equal(simpleReturn({ sales: 48_000_000, industry: 'construction', purchases: 0, cardSales: 0, eFiling: false }).payable, 1_440_000)
// 공제가 납부세액 초과 → 환급 없음
assert.equal(simpleReturn({ sales: 50_000_000, industry: 'professional', purchases: 0, cardSales: 200_000_000, eFiling: true }).payable, 0)
// 기준금액 1억 400만원
assert.equal(simpleReturn({ sales: 104_000_000, industry: 'retail', purchases: 0, cardSales: 0, eFiling: false }).overThreshold, true)
assert.equal(simpleReturn({ sales: 103_999_999, industry: 'retail', purchases: 0, cardSales: 0, eFiling: false }).overThreshold, false)

// 신고 기한 (주말·공휴일 → 다음 날)
assert.deepEqual(nextDeadline(new Date(2026, 9, 1), false), { date: '2027-01-25', year: 2026, period: 'h2', dday: 116 })
assert.deepEqual(nextDeadline(new Date(2026, 6, 1), false), { date: '2026-07-27', year: 2026, period: 'h1', dday: 26 }) // 7/25 토
assert.deepEqual(nextDeadline(new Date(2026, 0, 1), true), { date: '2026-01-26', year: 2025, period: 'year', dday: 25 }) // 1/25 일
assert.equal(nextDeadline(new Date(2026, 6, 27), false).dday, 0)
assert.equal(nextDeadline(new Date(2026, 6, 28), true).date, '2027-01-25')

console.log('check-vat: all passed')
