// 기부금 세액공제 계산기(/donation-tax-credit) 전용 로직. 공제액·세금은 yearEndTax.ts(연말정산 계산기와 같은 함수)로 계산.
// 회귀 체크: node scripts/check-donation-tax-credit.ts
// 근거(2026-11-08 casenote.kr 원문 확인):
//   소득세법 §59의4④ 특례 + 일반 합계 15%, 1천만 초과분 30%. 특례 먼저 공제. 일반 한도의 소득금액 = 종합소득금액 − 특례기부금.
//     부양가족(§50①2·3호, 나이 제한 없음, 다른 거주자 기본공제 대상 제외)이 낸 기부금 포함
//   소득세법 §59의4⑧ 3천만 초과분 +10%p는 2024.1.1~12.31 지급분만 → 2026 기부분 없음
//   소득세법 §34②2호 특례 한도 = 기준소득금액 − 이월결손금(100%), §34③2호 일반 한도 산식
//   소득세법 §61② 산출세액 초과로 못 받은 기부금·일반기부금 한도 초과분 → 다음 과세기간부터 10년 이월
//   소득세법 §59의4⑨1호 표준세액공제 13만은 특별세액공제 신청 시 배제 — 정치자금(조특법 §76)은 그 대상이 아님
//   조특법 §76① 정치자금 10만까지 110분의 100, 10만 초과 금액 15%(그 금액 3천만 초과분 25%)
//   법인세법 §24②1호 특례기부금 범위(국가·지자체, 국방헌금, 이재민 구호, 사립학교 등 시설비·장학금, 사회복지공동모금회 등)
import { donationLimits, donationCredit, politicalCredit, itemTaxSaving, earnedIncomeDeduction, type YetInput } from './yearEndTax.ts'

export const KINDS = ['political', 'special', 'general', 'religious'] as const
export type Kind = (typeof KINDS)[number]
export type Gifts = Record<Kind, number>
export const ZERO: Gifts = { political: 0, special: 0, general: 0, religious: 0 }
export const BRACKET = 10_000_000 // §59의4④ 이 금액 초과분 30%
export const POLITICAL_FULL = 100_000 // 조특법 §76① 110분의 100 구간
export const EXTRA = 300_000 // "12월에 더 기부하면" 기본값

export const toInput = (g: Gifts): Partial<YetInput> => ({ political: g.political, donationSpecial: g.special, donation: g.general, donationReligious: g.religious })
export const sumOf = (g: Gifts) => KINDS.reduce((a, k) => a + g[k], 0)

/** 기부처별 한도·공제 대상·한도 초과. 일반기부금 한도는 종교단체 외부터 채운다고 보고 나눔
 *  (종교 외 한도 30%, 종교 한도 = 합계 한도 − 종교 외 → §59의4④2호 합계와 같은 결과) */
export function breakdown(salary: number, g: Gifts) {
  const income = Math.max(0, salary) - earnedIncomeDeduction(Math.max(0, salary)) // 근로소득금액 = 한도 계산의 소득금액
  const l = donationLimits(income, g.special, g.general, g.religious)
  const general = Math.min(g.general, l.cap)
  const religious = l.general - general
  const row = (key: Kind, limit: number | null, eligible: number) => ({ key, amount: g[key], limit, eligible, excess: g[key] - eligible })
  return {
    income, base: l.base,
    rows: [
      row('political', null, g.political),
      row('special', income, l.special),
      row('general', Math.floor(l.base * 0.3), general),
      row('religious', g.religious > 0 ? l.cap - general : Math.floor(l.base * 0.1), religious),
    ],
    eligible: l.special + l.general, // 15%/30% 구간 대상 (정치자금 제외)
  }
}

/** none 기부 없음 / noTax 낼 세금이 원래 0 / standard 표준세액공제(13만)가 더 유리 / partial 결정세액 한도로 일부만 /
 *  swap 원래 받던 표준세액공제 대신 특별세액공제를 받아 그 차이만큼 덜 줄어듦 / full 공제액(+지방소득세 10%)만큼 그대로 줄어듦 */
export type Status = 'none' | 'noTax' | 'standard' | 'partial' | 'swap' | 'full'

export function analyze(salary: number, g: Gifts, extra = EXTRA) {
  const b = breakdown(salary, g)
  const donation = donationCredit(g.general, b.income, g.special, g.religious)
  const political = politicalCredit(g.political)
  const credit = donation + political
  const { before, after, saving } = itemTaxSaving({ salary }, toInput(g))
  const short = saving + 2 < Math.floor(credit * 1.1)
  const status: Status = sumOf(g) === 0 ? 'none' : before.determined === 0 ? 'noTax'
    : after.standard && g.special + g.general + g.religious > 0 ? 'standard'
      : short && after.determined === 0 ? 'partial' : short ? 'swap' : 'full'
  // 12월 31일 전에 일반기부금(종교 외)을 extra만큼 더 내면 추가로 줄어드는 세금
  const more = itemTaxSaving({ salary }, toInput({ ...g, general: g.general + extra })).saving - saving
  // 정치자금을 10만원까지 채우면 돌려받는 금액
  const politicalGap = Math.max(0, POLITICAL_FULL - g.political)
  const politicalGain = politicalGap ? itemTaxSaving({ salary }, toInput({ ...g, political: POLITICAL_FULL })).saving - saving : 0
  return {
    ...b, total: sumOf(g), donation, political, credit, saving, status, tax: before.totalTax,
    high: Math.max(0, b.eligible - BRACKET), // 30% 구간 금액
    excess: b.rows.reduce((a, r) => a + r.excess, 0),
    more, politicalGap, politicalGain,
  }
}

// ── 페이지 예시 (page.tsx 본문·FAQ가 이 값으로 렌더링, check 스크립트가 숫자 고정) ──
export const EXAMPLES = {
  /** 계산기 첫 화면 기본값: 연봉 5,000만, 사회복지단체 정기후원 월 3만(연 36만) + 종교단체 연 120만 */
  d: { salary: 50_000_000, g: { ...ZERO, general: 360_000, religious: 1_200_000 } },
  /** 종교단체 한도: 연봉 3,000만, 종교단체 500만 → 근로소득금액의 10%만 */
  religious: { salary: 30_000_000, g: { ...ZERO, religious: 5_000_000 } },
  /** 1천만 초과 30%: 연봉 1억 5천만, 일반기부금 1,500만 */
  big: { salary: 150_000_000, g: { ...ZERO, general: 15_000_000 } },
  /** 정치자금 10만원: 연봉 5,000만 */
  political: { salary: 50_000_000, g: { ...ZERO, political: 100_000 } },
  /** 특례기부금: 연봉 4,000만, 이재민 구호 200만 */
  special: { salary: 40_000_000, g: { ...ZERO, special: 2_000_000 } },
}
