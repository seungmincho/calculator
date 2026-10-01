// 견적서·거래명세서 금액 회귀 체크: node scripts/check-invoice.ts
import { computeTotals, amountInKorean, nextDocNumber } from '../src/utils/invoiceDoc.ts'

let fail = 0
const eq = (a: unknown, b: unknown, msg: string) => {
  if (JSON.stringify(a) !== JSON.stringify(b)) { fail++; console.log('FAIL', msg, JSON.stringify(a), '!=', JSON.stringify(b)) }
}
const pick = (r: ReturnType<typeof computeTotals>) => [r.supply, r.vat, r.total, r.adjusted]
const T = (qty: number, price: number, taxable = true) => ({ qty, price, taxable })

// 부가세 별도: 세액 = 공급가액 × 10% 원 미만 절사
eq(pick(computeTotals([T(1, 1_000_005)], 'excl', 'line')), [1_000_005, 100_000, 1_100_005, 0], '별도 절사')
eq(pick(computeTotals([T(1.5, 1000)], 'excl', 'line')), [1500, 150, 1650, 0], '소수 수량')
// 품목별 절사 합 vs 공급가액 합계 기준
eq(pick(computeTotals([T(1, 15), T(1, 15)], 'excl', 'line')), [30, 2, 32, 0], '품목별 합산')
const tot = computeTotals([T(1, 15), T(1, 15)], 'excl', 'total')
eq(pick(tot), [30, 3, 33, 1], '합계 기준 끝수 조정')
eq(tot.lines.reduce((a, l) => a + l.vat, 0), tot.vat, '조정 후 품목 세액 합 = 합계 세액')
// 부가세 포함가: 합계(받는 돈)는 그대로, 세액 = 합계 ÷ 11 절사
eq(pick(computeTotals([T(1, 1_100_000)], 'incl', 'line')), [1_000_000, 100_000, 1_100_000, 0], '포함가 역산')
eq(pick(computeTotals([T(1, 21), T(1, 21)], 'incl', 'line')), [40, 2, 42, 0], '포함가 품목별')
eq(pick(computeTotals([T(1, 21), T(1, 21)], 'incl', 'total')), [39, 3, 42, 1], '포함가 합계 기준: 합계 불변')
// 면세 품목 혼합 / 세액 없음
eq(pick(computeTotals([T(1, 1000), T(1, 500, false)], 'excl', 'line')), [1500, 100, 1600, 0], '면세 품목 혼합')
eq(pick(computeTotals([T(2, 1000)], 'none', 'total')), [2000, 0, 2000, 0], '세액 없음')
eq(pick(computeTotals([T(0, 1000), T(1, -5)], 'excl', 'line')), [0, 0, 0, 0], '0·음수 무시')

// 한글 금액
eq(amountInKorean(1_100_000), '금 일백일십만원정', '한글 금액')
eq(amountInKorean(10_000), '금 일만원정', '일만')
eq(amountInKorean(0), '', '0원')

// 문서 번호
eq(nextDocNumber('2026-10-01'), '20261001-001', '첫 번호')
eq(nextDocNumber('2026-10-01', '20261001-009'), '20261001-010', '같은 날 +1')
eq(nextDocNumber('2026-10-02', '20261001-009'), '20261002-001', '다음 날 초기화')

if (fail) { console.log(`${fail} failed`); process.exit(1) }
console.log('check-invoice: all passed')
