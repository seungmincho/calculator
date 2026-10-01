// 종합소득세 회귀 체크: node scripts/check-income-tax.ts  (기대값은 손계산, 근거 조문은 src/utils/incomeTax.ts)
import { calc, finCompareTax, pensionAccountCredit, DEFAULT_INPUT as D, type Input } from '../src/utils/incomeTax.ts'

let fail = 0
const eq = (a: unknown, b: unknown, msg: string) => {
  if (JSON.stringify(a) !== JSON.stringify(b)) { fail++; console.log('FAIL', msg, JSON.stringify(a), '!=', JSON.stringify(b)) }
}
const run = (p: Partial<Input>) => calc({ ...D, ...p })

// ── 1. 기본값: 프리랜서 3,000만, 기타자영업 단순경비율 64.1%, 1인 ──
// 경비 1,923만 → 소득 1,077만 − 기본 150만 = 과표 927만 × 6% = 556,200 − (표준 7만 + 전자 2만) = 466,200
const r1 = run({})
eq(r1.biz.income, 10_770_000, '기본 사업소득금액')
eq(r1.taxBase, 9_270_000, '기본 과표')
eq(r1.computed, 556_200, '기본 산출세액')
eq(r1.determined, 466_200, '기본 결정세액')
eq(r1.localTax, 46_620, '기본 지방소득세')
eq([r1.prepaid.income, r1.prepaid.local], [900_000, 90_000], '3.3% 기납부')
eq([r1.refundIncome, r1.refundLocal, r1.refund], [433_800, 43_380, 477_180], '기본 환급')
eq(r1.marginal, 0.06, '한계세율 6%')
eq(run({ withheld33: false }).refund, -512_820, '원천징수 없음 → 전액 납부')

// ── 2. 근로소득만 5,000만: 근로소득공제 1,225만 → 과표 3,625만 → 산출 4,177,500
// 근로소득세액공제 한도 66만(3,300만~7,000만 최저), 표준 13만 → 연말정산 추정 3,387,500, 신고 시 전자신고 2만만 차이
const w = { biz: false, wage: true, salary: 50_000_000 }
const r2 = run(w)
eq(r2.earnedDeduction, 12_250_000, '근로소득공제')
eq(r2.computed, 4_177_500, '근로 산출세액')
eq(r2.cr.earned, 660_000, '근로소득세액공제 한도')
eq(r2.cr.standard, 130_000, '근로자 표준세액공제 13만')
eq(r2.wageTax, 3_387_500, '연말정산 결정세액 추정')
eq(r2.wageTaxEstimated, true, '추정 플래그')
eq(r2.determined, 3_367_500, '근로 결정세액(전자신고 반영)')
eq(r2.refund, 22_000, '근로만: 전자신고공제분 환급')
eq(run({ ...w, otherCredit: 500_000 }).cr.standard, 0, '특별세액공제 입력 → 표준 없음')

// ── 3. 근로 5,000만 + 사업 3,000만 (연말정산 결정세액 3,387,500 입력) ──
// 종합소득 4,852만 − 150만 = 과표 4,702만 → 5,793,000. 근로분 산출 4,507,125 → 공제 한도 66만
const r3 = run({ wage: true, salary: 50_000_000, wageTax: 3_387_500 })
eq(r3.total, 48_520_000, '근로+사업 종합소득금액')
eq(r3.computed, 5_793_000, '근로+사업 산출세액')
eq(r3.cr.earned, 660_000, '근로+사업 근로소득세액공제')
eq(r3.determined, 4_983_000, '근로+사업 결정세액')
eq([r3.prepaid.income, r3.prepaid.local], [4_287_500, 428_750], '근로+사업 기납부')
eq([r3.refundIncome, r3.refundLocal], [-695_500, -69_550], '근로+사업 추가납부')
eq(r3.wageTaxEstimated, false, '입력값 사용')

// ── 4. 기타소득 500만(필요경비 60% → 소득금액 200만 ≤ 300만): 종합과세가 유리(한계 6% < 20%) ──
const r4 = run({ other: true, otherPay: 5_000_000 })
eq(r4.otherIncome, 2_000_000, '기타소득금액')
eq(r4.otherSeparated, false, '저소득: 종합과세 선택')
eq(r4.computed, 676_200, '기타 합산 산출세액')
eq([r4.prepaid.income, r4.prepaid.local], [1_300_000, 130_000], '기타 원천징수 20%·2% 포함')
eq(r4.refund, 785_180, '기타 합산 환급')
// 고소득(근로 1.5억): 분리과세가 유리 → 원천징수로 종결, 결과는 기타소득 없을 때와 같음
const hiW = { biz: false, wage: true, salary: 150_000_000, wageTax: 30_000_000 }
const r4b = run({ ...hiW, other: true, otherPay: 5_000_000 })
eq(r4b.otherSeparated, true, '고소득: 분리과세 선택')
eq(r4b.refund, run(hiW).refund, '분리과세 → 정산 영향 없음')
eq(run({ other: true, otherPay: 10_000_000 }).otherMustInclude, true, '기타소득금액 400만 → 종합과세 의무')

// ── 5. 금융소득 비교과세 (§62) ──
// 과표 4,850만, 금융 5,000만: 일반 = (2,850만 기본세율 3,015,000) + 280만 = 5,815,000 / 비교 = 700만 + 0 → 700만
eq(finCompareTax(48_500_000, 50_000_000).tax, 7_000_000, '비교과세: 비교산출세액')
// 과표 1억, 금융 3,000만: 일반 = 8,000만 기본세율 13,440,000 + 280만 = 16,240,000 / 비교 = 420만 + 7,000만분 11,040,000
eq(finCompareTax(100_000_000, 30_000_000), { tax: 16_240_000, rateBase: 80_000_000 }, '비교과세: 일반산출세액')
const r5 = run({ biz: false, fin: true, finIncome: 50_000_000 })
eq(r5.computed, 7_000_000, '금융 5천만 산출세액')
eq([r5.prepaid.income, r5.prepaid.local], [7_000_000, 700_000], '금융 원천징수 14%')
eq(r5.refund, 99_000, '금융만: 공제분 환급')
const r5b = run({ fin: true, finIncome: 20_000_000 })
eq([r5b.finSeparated, r5b.fin, r5b.refund], [true, 0, r1.refund], '2천만 이하 분리과세')

// ── 6. 연금계좌 세액공제 (§59의3) ──
eq(pensionAccountCredit(6_000_000, 3_000_000, 40_000_000, false, 0), 1_350_000, '900만 × 15%')
eq(pensionAccountCredit(9_000_000, 0, 40_000_000, false, 0), 900_000, '연금저축 600만 한도')
eq(pensionAccountCredit(6_000_000, 3_000_000, 45_000_001, false, 0), 1_080_000, '4,500만 초과 12%')
eq(pensionAccountCredit(6_000_000, 0, 0, true, 55_000_000), 900_000, '근로만 총급여 5,500만 15%')
eq(pensionAccountCredit(6_000_000, 0, 0, true, 55_000_001), 720_000, '근로만 5,500만 초과 12%')

// ── 7. 복식부기의무자 기준경비율 추계 + 무기장가산세 (§81의5) ──
// 수입 9,000만, 직전 8,000만 → 기준경비율 17.4% × 1/2 = 8.7% → 소득 8,217만, 과표 8,067만 → 13,600,800
// 가산세 = max(13,600,800 × 20%, 9,000만 × 0.07%) = 2,720,160
const r7 = run({ revenue: 90_000_000, prev: 80_000_000, method: 'standard' })
eq(r7.biz.income, 82_170_000, '복식의무 기준경비율 1/2')
eq(r7.computed, 13_600_800, '고소득 산출세액')
eq(r7.penalty, 2_720_160, '무기장가산세')
eq(r7.determined, 13_600_800 - 90_000 + 2_720_160, '가산세 포함 결정세액')
eq(run({ revenue: 90_000_000, prev: 80_000_000, method: 'book', bookExpense: 30_000_000 }).penalty, 0, '장부 → 가산세 없음')
eq(run({ revenue: 90_000_000, prev: 40_000_000, method: 'standard' }).penalty, 0, '소규모사업자 가산세 없음')

// ── 8. 공제 한도·하한 ──
eq(run({ yellow: 9_000_000 }).yellow, 6_000_000, '노란우산 600만 한도')
eq(run({ persons: 10 }).taxBase, 0, '공제 > 소득 → 과표 0')
eq(run({ persons: 10 }).refund, 990_000, '세액 0 → 기납부 전액 환급')
eq(run({ children: 2 }).cr.child, 550_000, '자녀 2명 55만')
eq(run({ midterm: 200_000 }).refund, r1.refund + 200_000, '중간예납 차감')

if (fail) { console.log(`check-income-tax: ${fail} failed`); process.exit(1) }
console.log('check-income-tax: all passed')
