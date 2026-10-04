/**
 * 최저임금 시간급 단일 출처 (최저임금법 제8조① 8월 5일까지 결정, 제10조 고시·다음 해 1월 1일 효력).
 * 근로기준·고용보험 계산기(workHours·weeklyHolidayPay·annualLeave·unemploymentBenefit·paySlip·employmentContract)가 import.
 * 매년 8월 고시가 나오면 표에 한 줄 추가. 검증: node scripts/check-unemployment-benefit.ts
 *
 * 2025 10,030원 · 2026 10,320원: https://www.moel.go.kr/news/enews/report/enewsView.do?news_seq=18144 (2025.8.5 고시)
 * 2027 10,700원(월 209시간 2,236,300원): https://www.moel.go.kr/news/enews/report/enewsView.do?news_seq=19744 (2026.8.5 고시)
 */
export const MIN_WAGE_BY_YEAR: Readonly<Record<number, number>> = { 2025: 10_030, 2026: 10_320, 2027: 10_700 }

/** 화면 기본값(올해) */
export const MIN_WAGE_2026 = MIN_WAGE_BY_YEAR[2026]
/** 고시 완료된 다음 해 금액 (2027.1.1 시행) */
export const MIN_WAGE_2027 = MIN_WAGE_BY_YEAR[2027]

const YEARS = Object.keys(MIN_WAGE_BY_YEAR).map(Number)
const FIRST = Math.min(...YEARS)
const LAST = Math.max(...YEARS)

// ponytail: 표 밖 연도는 가장 가까운 연도 값 — 2025년 이전 날짜가 필요해지면 표에 과거 연도 추가
/** 그 해에 적용되는 최저임금 시간급 */
export const minWageFor = (year: number) => MIN_WAGE_BY_YEAR[Math.min(LAST, Math.max(FIRST, Math.trunc(year)))]

/** 'YYYY-MM-DD' 날짜에 적용되는 최저임금 시간급 */
export const minWageOn = (date: string) => minWageFor(Number(date.slice(0, 4)))
