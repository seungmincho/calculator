// 건강보험료 순수 계산 (2026). 검증: node scripts/check-health-insurance.ts
// 출처
// - 요율 7.19%·장기요양 0.9448%(건보료 대비 13.14%)·점수당 211.5원: 보건복지부 보도자료(2025.8.28) / nhis.or.kr 2026년도 보험료율 기준 안내
// - 상·하한: 「월별 건강보험료액의 상한과 하한에 관한 고시」(복지부 고시 2025-222, 2026.1~)
//   직장 보수월액보험료 상한 9,183,480 / 하한 20,160, 소득월액보험료·지역 상한 4,591,740 / 지역 하한 20,160
// - 재산 60등급·기본공제 1억: 국민건강보험법 시행령 [별표 4] (2024.5.7 개정). 자동차 부과는 2024.2 폐지(별표4 제4호 삭제)
// - 피부양자 소득·재산요건: 시행규칙 [별표 1의2] (2025.4.23 개정)
import { INSURANCE } from './insuranceRates.ts'

export const HI = {
  rate: INSURANCE.healthRateTotal,
  ltcRate: INSURANCE.longTermCareRate,
  premiumCap: 9_183_480,
  premiumFloor: 20_160,
  incomePremiumCap: 4_591_740,
  pointValue: 211.5,
  propertyDeduction: 100_000_000,
  extraIncomeThreshold: 20_000_000,
  financialThreshold: 10_000_000,
} as const

// 10원 미만 절사. ponytail: 공단 고지액과 원 단위까지 같은지는 확인 필요(일부 단계에서 1원 단위 차이 가능)
const cut10 = (n: number) => Math.floor(n / 10) * 10
const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n))

export interface Share { health: number; ltc: number }
const withLtc = (health: number): Share => ({ health, ltc: cut10(health * HI.ltcRate) })

/** 직장가입자 보수월액보험료 (보수월액 = 월 급여 - 비과세). 근로자·사업주 각 50% */
export function workplace(wage: number) {
  const half = wage > 0 ? clamp(cut10(wage * HI.rate / 2), HI.premiumFloor / 2, HI.premiumCap / 2) : 0
  const share = withLtc(half)
  return {
    wage,
    employee: share,
    employer: share,
    employeeTotal: share.health + share.ltc,
    total: (share.health + share.ltc) * 2,
    capped: wage * HI.rate >= HI.premiumCap,
  }
}

/** 직장가입자 보수 외 소득월액보험료 (전액 본인). 연 2,000만원 초과분 ÷ 12 × 7.19%
 *  확인 필요: 근로·연금소득 50% 평가 후 2,000만원과 비교하는지 — 여기서는 입력값을 평가 반영 금액으로 본다 */
export function extraIncome(annual: number): Share {
  const monthly = Math.max(0, annual - HI.extraIncomeThreshold) / 12
  return withLtc(Math.min(cut10(monthly * HI.rate), HI.incomePremiumCap))
}

// [별표 4] 재산등급별 점수: [상한(만원), 점수]
const PROPERTY: [number, number][] = [
  [450, 22], [900, 44], [1350, 66], [1800, 97], [2250, 122], [2700, 146], [3150, 171], [3600, 195], [4050, 219], [4500, 244],
  [5020, 268], [5590, 294], [6220, 320], [6930, 344], [7710, 365], [8590, 386], [9570, 412], [10700, 439], [11900, 465], [13300, 490],
  [14800, 516], [16400, 535], [18300, 559], [20400, 586], [22700, 611], [25300, 637], [28100, 659], [31300, 681], [34900, 706], [38800, 731],
  [43200, 757], [48100, 785], [53600, 812], [59700, 841], [66500, 881], [74000, 921], [82400, 961], [91800, 1001], [103000, 1041], [114000, 1091],
  [127000, 1141], [142000, 1191], [158000, 1241], [176000, 1291], [196000, 1341], [218000, 1391], [242000, 1451], [270000, 1511], [300000, 1571], [330000, 1641],
  [363000, 1711], [399300, 1781], [439230, 1851], [483153, 1921], [531468, 1991], [584615, 2061], [643077, 2131], [707385, 2201], [778124, 2271], [Infinity, 2341],
]

/** 공제 후 재산금액(원) → 등급·점수. 0 이하면 0점 */
export function propertyScore(amount: number): { grade: number; score: number } {
  if (amount <= 0) return { grade: 0, score: 0 }
  const i = PROPERTY.findIndex(([max]) => amount <= max * 10_000)
  return { grade: i + 1, score: PROPERTY[i][1] }
}

export interface RegionalInput {
  business?: number      // 사업소득(임대 포함) 100%
  financial?: number     // 이자+배당: 합계 1,000만원 이하면 미반영, 초과 시 전액
  other?: number         // 기타소득 100%
  wage?: number          // 근로소득 50%
  pension?: number       // 연금소득 50%
  propertyTaxBase?: number // 토지·건축물·주택 재산세 과표 합
  deposit?: number       // 전월세 보증금
  monthlyRent?: number   // 월세
}

/** 지역가입자: 소득보험료(소득월액 × 7.19%, 최저 20,160) + 재산보험료(점수 × 211.5) + 장기요양 */
export function regional(i: RegionalInput) {
  const fin = (i.financial ?? 0) > HI.financialThreshold ? i.financial! : 0
  const assessedIncome = (i.business ?? 0) + fin + (i.other ?? 0) + ((i.wage ?? 0) + (i.pension ?? 0)) * 0.5
  const incomeMonthly = Math.floor(assessedIncome / 12)
  const raw = cut10(incomeMonthly * HI.rate)
  // ponytail: 저소득 세대 소득분 최저보험료 = 하한 20,160으로 근사 (공단은 '소득월액 하한' 기준) — 확인 필요
  const incomePremium = clamp(raw, HI.premiumFloor, HI.incomePremiumCap)
  // 전월세 평가: (보증금 + 월세×40) × 30% — 시행규칙 기준, 원문 대조 확인 필요
  const rentValue = Math.floor(((i.deposit ?? 0) + (i.monthlyRent ?? 0) * 40) * 0.3)
  const propertyAmount = Math.max(0, (i.propertyTaxBase ?? 0) + rentValue - HI.propertyDeduction)
  const { grade, score } = propertyScore(propertyAmount)
  const propertyPremium = cut10(score * HI.pointValue)
  const share = withLtc(Math.min(incomePremium + propertyPremium, HI.incomePremiumCap))
  return {
    assessedIncome, incomeMonthly, incomePremium, minApplied: raw < HI.premiumFloor,
    rentValue, propertyAmount, grade, score, propertyPremium,
    ...share, total: share.health + share.ltc,
  }
}

export type Relation = 'spouse' | 'parent' | 'child' | 'grandparent' | 'grandchild' | 'sibling'
export interface DependentInput {
  relation: Relation
  income: number          // 연 소득 합계(이자·배당·사업·근로·연금·기타)
  business: number        // 그중 사업소득
  bizRegistered: boolean  // 사업자등록 여부
  propertyTaxBase: number
  siblingSpecial: boolean // 형제자매: 만 30세 미만·65세 이상·장애인·상이 국가유공자 중 하나
}

/** 피부양자 소득·재산요건 ([별표 1의2]) + 형제자매 부양요건 일부. 기혼자는 배우자도 요건 충족 필요(입력 밖) */
export function dependent(i: DependentInput) {
  const income = i.income <= 20_000_000
  const business = i.business <= 0 || (!i.bizRegistered && i.business <= 5_000_000)
  const property = i.relation === 'sibling'
    ? i.propertyTaxBase <= 180_000_000
    : i.propertyTaxBase <= 540_000_000 || (i.propertyTaxBase <= 900_000_000 && i.income <= 10_000_000)
  const relation = i.relation !== 'sibling' || i.siblingSpecial
  return { income, business, property, relation, eligible: income && business && property && relation }
}

/** 퇴직 후 선택지 비교 (월). 임의계속가입 = 퇴직 전 12개월 평균 보수월액 × 7.19% × 50% (최대 36개월) */
export function afterRetirement(avgWage: number, rest: Omit<RegionalInput, 'wage'>) {
  const continued = workplace(avgWage).employeeTotal
  const withWage = regional({ ...rest, wage: avgWage * 12 }).total
  const withoutWage = regional(rest).total
  return { continued, withWage, withoutWage }
}
