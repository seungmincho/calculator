// 연봉 실수령액 표 공용 (표 페이지 + 구간별 페이지)
import { calculateNetSalary } from '@/utils/netSalary'
import { INSURANCE, INSURANCE_YEARS, type InsuranceYear } from '@/utils/insuranceRates'

export const SITE = 'https://toolhub.ai.kr'
export const YEAR = INSURANCE.year
/** 표 기본 가정: 본인 1인, 비과세 식대 20만/월 */
export const BASE = { dependents: 1, children: 0, nonTaxableMonthly: 200_000 }

/** 전용 페이지가 있는 연봉 구간 (만원) — 검색량 상위 */
export const BRACKETS = [2400, 2600, 2800, 3000, 3200, 3500, 3800, 4000, 4500, 5000, 5500, 6000, 7000, 8000, 10000] as const

/** 표 행: 2,000만~1억 100만 단위 + 1억~2억 1,000만 단위 */
export const TABLE_ROWS = [
  ...Array.from({ length: 81 }, (_, i) => 2000 + i * 100),
  ...Array.from({ length: 10 }, (_, i) => 11000 + i * 1000),
]

export const net = (man: number, opt = BASE) => calculateNetSalary(man * 10_000, opt)!
/** 비교 연도: 다음 해 요율이 있으면 그 해, 없으면 전년 (2026 빌드 → 2027, 2027 빌드 → 2026) */
export const COMPARE_YEAR: InsuranceYear | null = INSURANCE_YEARS.find(y => y === YEAR + 1) ?? INSURANCE_YEARS.find(y => y === YEAR - 1) ?? null
export const netIn = (man: number, year: InsuranceYear, opt = BASE) => calculateNetSalary(man * 10_000, { ...opt, year })!
/** 12340 → '+12,340원', -5 → '-5원' */
export const signedWon = (n: number) => `${n > 0 ? '+' : n < 0 ? '-' : ''}${Math.abs(Math.round(n)).toLocaleString('ko-KR')}원`

export const won = (n: number) => `${Math.round(n).toLocaleString('ko-KR')}원`
/** 12,345,678 → "1,234.6만원" */
export const manwon = (n: number) => `${(Math.round(n / 1000) / 10).toLocaleString('ko-KR')}만원`
/** 5000 → "5,000만원", 10000 → "1억원", 12000 → "1억 2,000만원" */
export const salaryLabel = (man: number) =>
  man >= 10000 ? `${Math.floor(man / 10000)}억${man % 10000 ? ` ${(man % 10000).toLocaleString('ko-KR')}만` : ''}원` : `${man.toLocaleString('ko-KR')}만원`

export const calcLink = (man: number, opt = BASE) =>
  `/salary-calculator/?salary=${man * 10_000}&type=annual&nonTaxable=${opt.nonTaxableMonthly}&dependents=${opt.dependents}&children=${opt.children}`
