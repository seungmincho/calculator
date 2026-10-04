// 건강보험료 계산 회귀 체크: node scripts/check-health-insurance.ts
import { HI, workplace, extraIncome, propertyScore, regional, dependent, afterRetirement } from '../src/utils/healthInsurance.ts'
import { INSURANCE } from '../src/utils/insuranceRates.ts'

let fail = 0
const eq = (a: unknown, b: unknown, msg: string) => { if (JSON.stringify(a) !== JSON.stringify(b)) { fail++; console.log('FAIL', msg, JSON.stringify(a), '!=', JSON.stringify(b)) } }

// 직장: 보수월액 330만 → 3,300,000 × 3.595% = 118,635 → 118,630, 장기요양 × 13.14% = 15,587 → 15,580
const w = workplace(3_300_000)
eq([w.employee.health, w.employee.ltc, w.employeeTotal, w.total], [118_630, 15_580, 134_210, 268_420], '직장 330만')
eq(workplace(3_000_000).employeeTotal, 122_020, 'FAQ 예시: 월 300만')
eq(workplace(0).employeeTotal, 0, '보수 0')
eq(workplace(100_000).employee.health, 10_080, '하한 20,160의 절반')
const top = workplace(200_000_000)
eq([top.employee.health, top.employee.ltc, top.capped], [4_591_740, 603_350, true], '상한 9,183,480의 절반')

// 보수 외 소득: 2,000만 이하 0, 3,200만 → 1,200만/12 × 7.19% = 71,900
eq(extraIncome(20_000_000).health, 0, '보수 외 2천 이하')
eq([extraIncome(32_000_000).health, extraIncome(32_000_000).ltc], [71_900, 9_440], '보수 외 3,200만')

// 재산 등급 경계 ([별표 4])
eq(propertyScore(0), { grade: 0, score: 0 }, '재산 0')
eq(propertyScore(4_500_000), { grade: 1, score: 22 }, '450만 이하 1등급')
eq(propertyScore(4_500_001), { grade: 2, score: 44 }, '450만 초과 2등급')
eq(propertyScore(100_000_000), { grade: 18, score: 439 }, '1억 = 18등급')
eq(propertyScore(1e11), { grade: 60, score: 2341 }, '최고 60등급')

// 지역: 사업소득 3,000만 + 과표 1.5억 → 소득 179,750 + 재산(5,000만, 11등급 268점 × 211.5 = 56,682 → 56,680)
const r = regional({ business: 30_000_000, propertyTaxBase: 150_000_000 })
eq([r.incomePremium, r.grade, r.propertyPremium, r.health, r.ltc, r.total], [179_750, 11, 56_680, 236_430, 31_060, 267_490], '지역 기본')
const r0 = regional({})
eq([r0.incomePremium, r0.minApplied, r0.total], [20_160, true, 22_800], '지역 최저보험료')
eq(regional({ financial: 10_000_000 }).assessedIncome, 0, '금융소득 1천 이하 미반영')
eq(regional({ financial: 10_000_001 }).assessedIncome, 10_000_001, '금융소득 1천 초과 전액')
eq(regional({ wage: 24_000_000 }).incomePremium, 71_900, '근로소득 50% 반영')
eq([regional({ deposit: 200_000_000 }).rentValue, regional({ deposit: 200_000_000 }).propertyAmount], [60_000_000, 0], '전세 30% 평가 후 1억 공제')

// 피부양자 ([별표 1의2])
const base = { relation: 'parent' as const, income: 20_000_000, business: 0, bizRegistered: false, propertyTaxBase: 0, siblingSpecial: false }
eq(dependent(base).eligible, true, '소득 2,000만 "이하"는 충족')
eq(dependent({ ...base, income: 20_000_001 }).eligible, false, '2,000만 초과 탈락')
eq(dependent({ ...base, business: 4_000_000 }).business, true, '미등록 사업소득 500만 이하')
eq(dependent({ ...base, business: 4_000_000, bizRegistered: true }).business, false, '사업자등록 + 사업소득')
eq(dependent({ ...base, propertyTaxBase: 600_000_000, income: 10_000_000 }).property, true, '5.4~9억 + 소득 1천 이하')
eq(dependent({ ...base, propertyTaxBase: 600_000_000, income: 11_000_000 }).property, false, '5.4~9억 + 소득 1천 초과')
eq(dependent({ ...base, propertyTaxBase: 900_000_001, income: 0 }).property, false, '9억 초과')
eq(dependent({ ...base, relation: 'sibling', propertyTaxBase: 200_000_000, siblingSpecial: true }).property, false, '형제자매 1.8억 초과')
eq(dependent({ ...base, relation: 'sibling' }).relation, false, '형제자매 연령·장애 요건')

// 퇴직 후: 평균 보수 400만, 과표 2억
eq(afterRetirement(4_000_000, { propertyTaxBase: 200_000_000 }), { continued: 162_690, withWage: 267_730, withoutWage: 127_840 }, '퇴직 후 비교')

// 공식 수치 (2026-10-04 확인): NHIS 2026 요율·점수당 금액, 복지부 고시 제2025-222호 상·하한, 국민연금 상·하한 2026.7~
eq([INSURANCE.healthRateTotal, INSURANCE.healthRate, INSURANCE.longTermCareRate, INSURANCE.employmentRate], [0.0719, 0.03595, 0.1314, 0.009], '건강·장기요양·고용 요율')
eq(Math.abs(INSURANCE.healthRateTotal * INSURANCE.longTermCareRate - 0.009448) < 1e-5, true, '장기요양 0.9448% (소득 대비)')
eq([INSURANCE.pensionRateTotal, INSURANCE.pensionRate, INSURANCE.pensionMonthlyCap, INSURANCE.pensionMonthlyFloor], [0.095, 0.0475, 6_590_000, 410_000], '국민연금 요율·상하한')
eq([HI.premiumCap, HI.premiumFloor, HI.incomePremiumCap, HI.pointValue], [9_183_480, 20_160, 4_591_740, 211.5], '건보 상·하한·점수당 금액')

if (fail) { console.log(`${fail} failed`); process.exit(1) }
console.log('check-health-insurance: all passed')
