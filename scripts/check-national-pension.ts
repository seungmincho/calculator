// 국민연금 계산 회귀 체크: node scripts/check-national-pension.ts
import {
  A_VALUE, coef, premiumRate, startAge, childCreditMonths, calcPension, shifted, crossoverAge,
  workReduction, paybackAge, nominal, catchUpCost, calcByAge, DEPENDENT_ANNUAL, INCOME_FLOOR, INCOME_CAP, CPI_2026,
} from '../src/utils/nationalPension.ts'

let fail = 0
const eq = (a: unknown, b: unknown, msg: string) => { if (JSON.stringify(a) !== JSON.stringify(b)) { fail++; console.log('FAIL', msg, JSON.stringify(a), '!=', JSON.stringify(b)) } }
const A = A_VALUE

// 계수: 부칙 제20조 (2008 1.5 → 2025 1.245), 2026~ 1.29 (제51조), 1988~98 2.4(A+0.75B)
eq([1990, 2000, 2008, 2022, 2025, 2026, 2050].map((y) => coef(y).c), [2.4, 1.8, 1.5, 1.29, 1.245, 1.29, 1.29], '연도별 계수')
eq(coef(1995).bw, 0.75, '1988~98 B 가중치')
// 보험료율: 9% → 2026 9.5% → 매년 0.5%p → 2033 13%
eq([1990, 1995, 2025, 2026, 2027, 2032, 2033, 2040].map(premiumRate), [0.03, 0.06, 0.09, 0.095, 0.1, 0.125, 0.13, 0.13], '보험료율')
eq([1952, 1953, 1960, 1961, 1968, 1969, 1990].map(startAge), [60, 61, 62, 63, 64, 65, 65], '수급개시연령')
// 출산 크레딧: 2026~ 첫째부터 12·12·18…, 상한 없음 / 종전: 둘째 12, 셋째부터 18, 상한 50
eq([0, 1, 2, 3, 4].map((n) => childCreditMonths(n, true)), [0, 12, 24, 42, 60], '출산 크레딧(신)')
eq([1, 2, 3, 5].map((n) => childCreditMonths(n, false)), [0, 12, 30, 50], '출산 크레딧(종전)')

// 소득대체율 검산: 2026년부터 40년, 소득 = A → 월 0.43A
const r40 = calcPension({ birthYear: 1990, startYear: 2026, years: 40, income: A })
eq(r40.basic, Math.round(0.43 * A), '40년·A소득 = 43%')
eq(calcPension({ birthYear: 1990, startYear: 2026, years: 20, income: A }).basic, Math.round(0.215 * A), '20년 = 21.5%')
eq(calcPension({ birthYear: 1990, startYear: 2026, years: 10, income: A }).basic, Math.round(0.1075 * A), '10년 = 기본연금액 50%')
// 10년 미만 → 수급권 없음, 출산 크레딧으로 10년 충족 시 수급
const r9 = calcPension({ birthYear: 1990, startYear: 2026, years: 9, income: A })
eq([r9.eligible, r9.basic], [false, 0], '9년 = 반환일시금')
const r9c = calcPension({ birthYear: 1990, startYear: 2026, years: 9, income: A, children: 1, childNewRule: true })
eq([r9c.eligible, r9c.totalMonths, r9c.basic], [true, 120, Math.round(0.1075 * A)], '9년+첫째 크레딧 = 10년')
// 군 크레딧: B = A/2
eq(calcPension({ birthYear: 1990, startYear: 2026, years: 10, income: A, militaryMonths: 12 }).basic, Math.round(1.29 * 2 * A * 120 / 2880 + 1.29 * 1.5 * A * 12 / 2880), '군복무 크레딧 A/2')
// 소득 상한 659만
eq(calcPension({ birthYear: 1990, startYear: 2026, years: 20, income: 10_000_000 }).B, 6_590_000, '기준소득월액 상한')

// 과거 기간 혼합: 1975년생, 2002~2031 30년, 월 300만 → 계수합 1.8×6 + Σ2008~2025 + 1.29×6 = 43.245
const r = calcPension({ birthYear: 1975, startYear: 2002, years: 30, income: 3_000_000 })
eq(r.basic, Math.round(43.245 * (A + 3_000_000) / 240), '1975년생 30년')
eq([r.startAge, r.pensionYear], [65, 2040], '수령 시작')
eq(r.periods.map((p) => [p.from, p.to, p.months]), [[2002, 2007, 72], [2008, 2025, 216], [2026, 2031, 72]], '기간 구분')
eq([r.paidTotal, r.paidSelf], [100_980_000, 50_490_000], '총 보험료 / 본인 부담')
eq(calcPension({ birthYear: 1975, startYear: 2002, years: 30, income: 3_000_000, employee: false }).paidSelf, 100_980_000, '지역가입자 전액 본인')
// 1988~1998: 2.4(A + 0.75B)
eq(calcPension({ birthYear: 1960, startYear: 1988, years: 11, income: A }).basic, Math.round(0.1925 * A), '1988~98 계수')
// 부양가족연금: 배우자 + 자녀 1
const rd = calcPension({ birthYear: 1990, startYear: 2026, years: 20, income: A, spouse: true, depChildren: 1 })
eq(rd.dependent, 42_583, '부양가족연금 월액')
// 추납 12개월 = 1.29 × (A+B) × 12 / 2880 증가
const base = calcPension({ birthYear: 1975, startYear: 2002, years: 30, income: 3_000_000 })
const plus = calcPension({ birthYear: 1975, startYear: 2002, years: 30, income: 3_000_000, extraMonths: 12 })
eq(plus.basic - base.basic, Math.round(43.245 * (A + 3e6) / 240 + 1.29 * (A + 3e6) * 12 / 2880) - base.basic, '추납 12개월 증가분')
eq(catchUpCost(3_000_000, 12), 3_420_000, '추납 보험료 9.5%')

// 조기·연기
eq([shifted(1_000_000, 10, -5), shifted(1_000_000, 10, 0), shifted(1_000_000, 10, 5), shifted(1_000_000, 0, -1), shifted(1_000_000, 0, 1)], [700_010, 1_000_010, 1_360_010, 940_000, 1_072_000], '조기 6%·연기 7.2%')
eq(crossoverAge(1000, 65, 700, 60), 76.7, '조기 5년 역전 나이')
eq(crossoverAge(1000, 65, 1360, 70), 83.9, '연기 5년 역전 나이')
// 소득활동 감액 (2026.6.17~ A+200만 미만 감액 없음)
eq([2_000_000 - 1, 2_000_000, 3_500_000, 6_000_000].map((x) => workReduction(1_000_000, A + x)), [0, 150_000, 400_000, 500_000], '소득활동 감액·1/2 한도')

eq(paybackAge(50_490_000, 1_000_000, 65), 69.2, '손익분기 나이')
eq(nominal(1_000_000, 2026, 2040, 0.02), 1_319_479, '명목 환산')

// 공식 수치 (2026-10-04 확인): A값 2025.12~2026.11·부양가족연금 2026 = 국민연금공단, 상·하한 2026.7~ = 정책브리핑, 물가 2.1% = 복지부
eq([A_VALUE, DEPENDENT_ANNUAL.spouse, DEPENDENT_ANNUAL.child, DEPENDENT_ANNUAL.parent], [3_193_511, 306_630, 204_360, 204_360], 'A값·부양가족연금')
eq([INCOME_FLOOR, INCOME_CAP, CPI_2026], [410_000, 6_590_000, 0.021], '기준소득월액 상·하한·물가')

// /pension-calculator 나이 입력: 30세·2023년(27세) 가입·65세 은퇴 = 2023~2060 38년 (60~65세 임의계속가입)
const byAge = calcByAge(30, 3_000_000, 27, 65)
eq(byAge.basic, calcPension({ birthYear: 1996, startYear: 2023, years: 38, income: 3_000_000 }).basic, '나이 → 연도 변환')
eq(byAge.ownMonths, 456, '38년')
if (!(byAge.basic > 1_000_000 && byAge.basic < 3_000_000 * 0.5)) { fail++; console.log('FAIL 월 연금이 소득의 50% 넘음', byAge.basic) }
eq(calcByAge(30, 3_000_000, 27, 70).ownMonths, 456, '65세 넘는 은퇴 나이는 65세까지만 납부')
eq(calcByAge(58, 3_000_000, 57, 60).eligible, false, '3년 가입 = 수급권 없음')

if (fail) { console.log(`${fail} failed`); process.exit(1) }
console.log('check-national-pension: all passed')
