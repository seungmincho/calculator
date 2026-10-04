// Official 2026 basic-livelihood thresholds: https://www.mohw.go.kr/menu.es?mid=a10708010300
// Housing rates and calculation: https://www.lh.or.kr/menu.es?mid=a10401050100
export const WELFARE_POLICY_YEAR = 2026
export const MEDIAN_INCOME_2026: Record<number, number> = {
  1: 2_564_238, 2: 4_199_292, 3: 5_359_036,
  4: 6_494_738, 5: 7_556_719, 6: 8_555_952,
}
export const HOUSING_RENT_2026 = {
  seoul: [369_000, 414_000, 492_000, 571_000, 591_000, 699_000],
  gyeonggi: [300_000, 335_000, 401_000, 463_000, 479_000, 568_000],
  metro: [247_000, 275_000, 327_000, 381_000, 394_000, 463_000],
  other: [212_000, 238_000, 283_000, 329_000, 340_000, 402_000],
} as const
export type HousingRegion = 'unknown' | keyof typeof HOUSING_RENT_2026
export type HousingType = 'jeonse' | 'monthly' | 'own' | 'other'
export type EligibilityStatus = 'eligible' | 'ineligible' | 'borderline'
export interface SubsidyInput {
  householdSize: number
  monthlyIncome: number // 만원; incomeBasis specifies whether this is assessed income.
  incomeBasis: 'gross' | 'assessed'
  region: HousingRegion
  totalAssets: number // 만원; tax credits require valuation at their own reference date.
  age: number
  housingType: HousingType
  monthlyRent: number
  deposit: number
  hasMinorChildren: boolean
  childrenCount: number
  isSingleParent: boolean
  isDisabled: boolean
  isOver65: boolean
}
export const PROGRAM_SOURCES = {
  livelihood: 'https://www.mohw.go.kr/menu.es?mid=a10708010300',
  medical: 'https://www.mohw.go.kr/menu.es?mid=a10708010300',
  housing: 'https://www.lh.or.kr/menu.es?mid=a10401050100',
  education: 'https://pool.cbe.go.kr/dept-15/cm/cntnts/cntntsView.do?cntntsId=36430&mi=15983',
  childCredit: 'https://kids.nts.go.kr/nts/cm/cntnts/cntntsView.do?cntntsId=7783&mi=2452',
  eitc: 'https://kids.nts.go.kr/nts/cm/cntnts/cntntsView.do?cntntsId=7783&mi=2452',
  basicPension: 'https://www.gwangjin.go.kr/portal/main/contents.do?menuNo=200369',
  youthRent: 'https://www.bokjiro.go.kr/ssis-tbu/cms/pc/customer/notice/1309500_1141.html',
  singleParent: 'https://www.mogef.go.kr/sp/fam/sp_fam_f006.do',
  youthSavings: 'https://www.bokjiro.go.kr/ssis-tbu/cms/pc/customer/notice/1309680_1141.html',
  emergency: 'https://www.mohw.go.kr/menu.es?mid=a10708010100',
  disabilityPension: 'https://www.nabo.go.kr/board/file/bulkDown.do?bid=68&idx=9263',
} as const
export interface ProgramResult {
  id: keyof typeof PROGRAM_SOURCES
  status: EligibilityStatus
  monthlyAmount: number | null
  yearlyAmount: number | null
  reason: string
  threshold?: number
}
export function getMedianIncome(size: number): number {
  return MEDIAN_INCOME_2026[Math.min(Math.max(size, 1), 6)]
}

// A screening result is never a complete eligibility determination. Unknown facts
// remain unknown; household size is not a tax-credit household type or personal income.
export function calculatePrograms(input: SubsidyInput): ProgramResult[] {
  const median = getMedianIncome(input.householdSize)
  const income = Math.round(input.monthlyIncome * 10_000)
  const assessed = input.incomeBasis === 'assessed'
  const results: ProgramResult[] = []
  const add = (id: ProgramResult['id'], status: EligibilityStatus, reason: string,
    threshold?: number, monthlyAmount: number | null = null) => {
    results.push({ id, status, reason, threshold, monthlyAmount,
      yearlyAmount: monthlyAmount === null ? null : monthlyAmount * 12 })
  }
  const livelihood = Math.round(median * 0.32)
  for (const [id, percentage] of [['livelihood', 0.32], ['medical', 0.40], ['housing', 0.48], ['education', 0.50]] as const) {
    const threshold = Math.round(median * percentage)
    if (!assessed) {
      add(id, 'borderline', 'assessedRequired', threshold)
      continue
    }
    if (income > threshold) {
      add(id, 'ineligible', 'incomeOver', threshold)
      continue
    }
    if (id === 'livelihood') {
      add(id, 'eligible', 'livelihoodConditional', threshold, threshold - income)
    } else if (id === 'housing') {
      if (input.housingType === 'own' || input.housingType === 'other') {
        add(id, 'borderline', 'housingNonRental', threshold)
      } else if (input.region === 'unknown') {
        add(id, 'borderline', 'regionRequired', threshold)
      } else {
        const limit = HOUSING_RENT_2026[input.region][input.householdSize - 1]
        const actualRent = (input.housingType === 'monthly' ? Math.round(input.monthlyRent * 10_000) : 0) +
          Math.round(input.deposit * 10_000) * 0.04 / 12
        if (actualRent === 0) {
          add(id, 'ineligible', 'noActualRent', threshold)
        } else {
          const contribution = Math.max(0, income - livelihood) * 0.30
          const amount = actualRent > limit * 5 ? 10_000 :
            Math.max(10_000, Math.floor(Math.min(actualRent, limit) - contribution))
          add(id, 'eligible', 'housingConditional', threshold, amount)
        }
      }
    } else if (id === 'education') {
      add(id, 'borderline', 'studentRequired', threshold)
    } else {
      add(id, 'eligible', 'medicalConditional', threshold)
    }
  }
  // The correct property limit is KRW 240 million, not KRW 2.4 billion.
  // Income year, earned income and household type are not available here.
  const taxAssetsOver = input.totalAssets >= 24_000
  add('childCredit', !input.hasMinorChildren || taxAssetsOver ? 'ineligible' : 'borderline',
    !input.hasMinorChildren ? 'childrenRequired' : taxAssetsOver ? 'taxAssetsOver' : 'taxDetailsRequired')
  add('eitc', taxAssetsOver ? 'ineligible' : 'borderline', taxAssetsOver ? 'taxAssetsOver' : 'taxDetailsRequired')
  add('basicPension', input.isOver65 || input.age >= 65 ? 'borderline' : 'ineligible',
    input.isOver65 || input.age >= 65 ? 'pensionDetailsRequired' : 'elderRequired')
  // 2026 rent applicants are selected by birth year (1991–2007), not age alone.
  add('youthRent', input.age < 18 || input.age > 35 || input.housingType !== 'monthly' || input.monthlyRent === 0 ? 'ineligible' : 'borderline',
    input.age < 18 || input.age > 35 ? 'youthBirthYear' : input.housingType !== 'monthly' || input.monthlyRent === 0 ? 'youthRentRequired' : 'youthRentClosed')
  // Older students can qualify too; a missing under-18 child does not exclude them.
  add('singleParent', !input.isSingleParent ? 'ineligible' : 'borderline',
    !input.isSingleParent ? 'singleParentRequired' : 'singleParentDetailsRequired', Math.round(median * 0.65))
  add('youthSavings', input.age < 15 || input.age > 39 ? 'ineligible' : 'borderline',
    input.age < 15 || input.age > 39 ? 'savingsAge' : 'savingsDetailsRequired', Math.round(median * 0.50))
  add('emergency', 'borderline', 'emergencyDetailsRequired', Math.round(median * 0.75))
  add('disabilityPension', input.isDisabled ? 'borderline' : 'ineligible',
    input.isDisabled ? 'disabilityDetailsRequired' : 'disabilityRequired')
  return results
}
