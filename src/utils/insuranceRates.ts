/**
 * 4대보험 요율 — 단일 출처. 여기만 갱신하면 급여/성과급/연봉비교/근무시간/세금/건강보험 계산기에 모두 반영.
 *
 * 2026년 확정치 (근로자 부담분):
 * - 국민연금 9.5% (근로자 4.75%) — 연금개혁: 2026년부터 매년 0.5%p 인상, 2033년 13%
 *   기준소득월액 상한 6,590,000 / 하한 410,000 (2026.7~2027.6, 매년 7월 갱신)
 * - 건강보험 7.19% (근로자 3.595%), 장기요양 = 건강보험료 × 13.14% (보수 대비 0.9448%)
 * - 고용보험 근로자 0.9% (사업주 0.9% + 고용안정 0.25~0.85%)
 * 출처(2026-10-04 재확인):
 * - 건강·장기요양 요율: 국민건강보험공단 '2026년 달라지는 건강·장기요양제도' https://www.nhis.or.kr/renewal_popup/poster/20260204_poster_longdesc_1.html
 * - 국민연금 상·하한: 정책브리핑 2026.1.12 https://www.korea.kr/news/policyNewsView.do?newsId=148957832 (2026.1~6월은 637만/40만)
 * - 고용보험 0.9%: 고용산재보험료징수법 시행령 제12조 실업급여 1.8%의 절반 (2027년 인상 정부안은 미확정)
 */
export const INSURANCE = {
  year: 2026,
  pensionRateTotal: 0.095,
  pensionRate: 0.0475,
  pensionMonthlyCap: 6_590_000,
  pensionMonthlyFloor: 410_000,
  healthRateTotal: 0.0719,
  healthRate: 0.03595,
  longTermCareRate: 0.1314,
  employmentRate: 0.009,
} as const

/** 연 소득 기준 국민연금 상한 (기준소득월액 상한 × 12) */
export const PENSION_ANNUAL_CAP = INSURANCE.pensionMonthlyCap * 12

/** 표시용 퍼센트 문자열 (예: 4.75%) */
export const pct = (rate: number, digits = 3) => `${parseFloat((rate * 100).toFixed(digits))}%`
