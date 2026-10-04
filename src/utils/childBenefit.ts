// 아동 수당 계산 (순수 함수). 회귀 체크: node scripts/check-child-benefit.ts
// 출처 (2026-10-05 확인)
//  - 아동수당: 2026년 9세 미만, 2030년까지 매년 1세씩 상향(13세 미만) — 아동수당법 개정, 복지로 https://www.bokjiro.go.kr/ssis-tbu/cms/pc/news/news/1309692_1114.html
//    비수도권·인구감소지역 월 5천~2만원 추가는 미반영(안내만)
//  - 부모보육료 2026: 0세 584,000 · 1세 515,000 · 2세 426,000 — https://www.incheon.go.kr/earlychild/EC030301 / 누리과정(3~5세) 280,000
//  - 가정양육수당: 24~86개월(취학 전) 월 10만원 / 부모급여 0세 100만·1세 50만(어린이집 이용 시 보육료 차액만 현금)
//  - 첫만남이용권: 첫째 200만원, 둘째부터 300만원(2024년 출생아~), 출생일부터 2년 사용

export const PARENT_PAY_AGE0 = 1_000_000
export const PARENT_PAY_AGE1 = 500_000
export const CHILD_ALLOWANCE = 100_000
export const DAYCARE = { age0: 584_000, age1: 515_000, age2: 426_000, nuri: 280_000 } as const
export const HOME_CARE_ALLOWANCE = 100_000 // 24~86개월
export const HOME_CARE_END_MONTHS = 86
export const WELCOME_GRANT = { first: 2_000_000, later: 3_000_000 } as const

/** 아동수당 대상 '만 N세 미만' — 2026년 9, 2030년부터 13 */
export const allowanceUnderAge = (year: number) => Math.min(13, Math.max(9, year - 2017))

export interface BenefitBreakdown {
  parentPay: number        // 부모급여 (현금)
  childAllowance: number   // 아동수당
  childcareAllowance: number // 양육수당
  daycareSubsidy: number   // 보육료 바우처 (참고용, 현금 아님)
  total: number
  ageYears: number
  ageMonths: number
  ageLabel: string
}

/** ageInMonths = 만 개월 수, year = 그 달의 연도(아동수당 연령 확대 반영) */
export function calcBenefits(ageInMonths: number, usesDaycare: boolean, year: number): BenefitBreakdown {
  const ageYears = Math.floor(ageInMonths / 12)
  const ageMonths = ageInMonths % 12
  let parentPay = 0, childcareAllowance = 0, daycareSubsidy = 0

  if (ageInMonths < 24) {
    const pay = ageInMonths < 12 ? PARENT_PAY_AGE0 : PARENT_PAY_AGE1
    if (usesDaycare) {
      daycareSubsidy = ageInMonths < 12 ? DAYCARE.age0 : DAYCARE.age1
      parentPay = Math.max(0, pay - daycareSubsidy)
    } else parentPay = pay
  } else if (usesDaycare) {
    if (ageInMonths < 36) daycareSubsidy = DAYCARE.age2
    else if (ageInMonths < 72) daycareSubsidy = DAYCARE.nuri
  } else if (ageInMonths < HOME_CARE_END_MONTHS) {
    childcareAllowance = HOME_CARE_ALLOWANCE
  }

  const childAllowance = ageInMonths < allowanceUnderAge(year) * 12 ? CHILD_ALLOWANCE : 0
  return {
    parentPay, childAllowance, childcareAllowance, daycareSubsidy,
    total: parentPay + childAllowance + childcareAllowance,
    ageYears, ageMonths, ageLabel: `만 ${ageYears}세 ${ageMonths}개월`,
  }
}

/** startYear에 태어난 아이(어린이집 미이용)의 연령별 월 수령액 — 만 0~12세 */
export function timeline(startYear: number) {
  return Array.from({ length: 13 }, (_, a) => {
    const b = calcBenefits(a * 12, false, startYear + a)
    return { age: a, parentPay: b.parentPay, childAllowance: b.childAllowance, childcareAllowance: b.childcareAllowance, total: b.total }
  })
}

/** startYear 출생 첫째 기준 누적 현금 수령액(첫만남이용권 포함, 출생 월을 1월로 근사) */
export function cumulative(startYear: number, usesDaycare: boolean): number {
  let total = WELCOME_GRANT.first
  for (let m = 0; m < 13 * 12; m++) total += calcBenefits(m, usesDaycare, startYear + Math.floor(m / 12)).total
  return total
}
