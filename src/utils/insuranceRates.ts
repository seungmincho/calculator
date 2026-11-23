/**
 * 4대보험 요율 — 단일 출처. 여기만 갱신하면 급여/성과급/연봉비교/근무시간/세금/건강보험 계산기에 모두 반영.
 * 연도별로 두고, 2027-01-01 00:00(KST)부터 `INSURANCE`가 2027년 값으로 바뀐다.
 *
 * 2026년 (근로자 부담분):
 * - 국민연금 9.5% (근로자 4.75%) — 연금개혁: 2026년부터 매년 0.5%p 인상, 2033년 13%
 *   기준소득월액 상한 6,590,000 / 하한 410,000 (2026.7~2027.6, 매년 7월 갱신)
 * - 건강보험 7.19% (근로자 3.595%), 장기요양 = 건강보험료 × 13.14% (보수 대비 0.9448%)
 * - 고용보험 근로자 0.9% (사업주 0.9% + 고용안정 0.25~0.85%)
 * 2027년:
 * - 국민연금 10% (근로자 5%) — 국민연금법 부칙 단계 인상. 상·하한은 2027.6까지 위와 같고 7월에 새로 고시
 * - 건강보험 7.19% 동결 (건강보험정책심의위원회 2026.9.8 의결)
 * - 장기요양 = 건강보험료 × 13.90% (보수 대비 0.9994%, 장기요양위원회 2026.10.30 의결)
 * - 고용보험 실업급여 1.8% → 2.0% 정부안(2026.9.1 발표)은 시행령 제12조 개정 전이라 0.9%를 유지.
 *   개정되면 employmentRate 를 0.01 로 바꾸고 employmentProposed 를 지운다.
 * 출처(2026-11-06 재확인):
 * - 건강·장기요양 2026: 국민건강보험공단 '2026년 달라지는 건강·장기요양제도' https://www.nhis.or.kr/renewal_popup/poster/20260204_poster_longdesc_1.html
 * - 장기요양 2027: 보건복지부 2026년 제5차 장기요양위원회(2026.10.30) — 뉴스핌 https://www.newspim.com/news/view/20261030001234
 * - 국민연금 상·하한: 정책브리핑 2026.1.12 https://www.korea.kr/news/policyNewsView.do?newsId=148957832 (2026.1~6월은 637만/40만)
 * - 고용보험 0.9%: 고용산재보험료징수법 시행령 제12조 실업급여 1.8%의 절반
 */
export type InsuranceYear = 2026 | 2027
export interface InsuranceRates {
  year: InsuranceYear
  pensionRateTotal: number
  pensionRate: number
  pensionMonthlyCap: number
  pensionMonthlyFloor: number
  healthRateTotal: number
  healthRate: number
  longTermCareRate: number
  employmentRate: number
  /** 발표됐지만 아직 법령에 없는 근로자 고용보험료율 (확정되면 employmentRate 로) */
  employmentProposed?: number
}

export const INSURANCE_BY_YEAR: Record<InsuranceYear, InsuranceRates> = {
  2026: {
    year: 2026, pensionRateTotal: 0.095, pensionRate: 0.0475, pensionMonthlyCap: 6_590_000, pensionMonthlyFloor: 410_000,
    healthRateTotal: 0.0719, healthRate: 0.03595, longTermCareRate: 0.1314, employmentRate: 0.009,
  },
  2027: {
    year: 2027, pensionRateTotal: 0.1, pensionRate: 0.05, pensionMonthlyCap: 6_590_000, pensionMonthlyFloor: 410_000,
    healthRateTotal: 0.0719, healthRate: 0.03595, longTermCareRate: 0.139, employmentRate: 0.009, employmentProposed: 0.01,
  },
}
export const INSURANCE_YEARS = [2026, 2027] as const satisfies readonly InsuranceYear[]
export const isInsuranceYear = (v: unknown): v is InsuranceYear => INSURANCE_YEARS.includes(Number(v) as InsuranceYear)

/** 그 시각에 적용되는 요율 연도 (2027-01-01 00:00 KST부터 2027). */
export const insuranceYearAt = (ms: number): InsuranceYear => (ms >= Date.parse('2027-01-01T00:00:00+09:00') ? 2027 : 2026)
export const insuranceFor = (year: InsuranceYear) => INSURANCE_BY_YEAR[year]

/** 지금 적용되는 요율. ponytail: 모듈 로드 시각 기준이라 1/1 전에 빌드한 페이지를 1/1 이후에 열면
 *  정적 HTML(2026)과 브라우저(2027)가 달라 hydration 경고가 난다 — 1월 1일에 다시 빌드·배포한다. */
export const INSURANCE = insuranceFor(insuranceYearAt(Date.now()))

/** 연 소득 기준 국민연금 상한 (기준소득월액 상한 × 12) */
export const PENSION_ANNUAL_CAP = INSURANCE.pensionMonthlyCap * 12

/** 표시용 퍼센트 문자열 (예: 4.75%) */
export const pct = (rate: number, digits = 3) => `${parseFloat((rate * 100).toFixed(digits))}%`
