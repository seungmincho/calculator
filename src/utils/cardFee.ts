// 카드 수수료 계산기(/card-fee-calculator) 로직. 회귀 체크: node scripts/check-card-fee.ts
// 근거(2026-11-08 확인):
//   우대수수료율 — 금융위원회 보도자료 2026.8.11 「2026년 하반기 영세·중소가맹점 선정결과」(2026.8.14~ 적용),
//     2025.2.14 인하(2024.12.17 적격비용 재산정 발표, 여신전문금융업감독규정 개정) 이후 같은 값
//   구간 — 연매출(국세청 과세자료로 확인한 가맹점 연간 매출액, 카드·현금 합계) 3억 이하 영세, 30억 이하 중소. 반기마다 재선정
//   일반가맹점(30억 초과) — 카드사가 적격비용으로 정함. 기본값은 공시된 직전 연도 신용카드업계 평균
//     (매출 30억~100억 신용 2.10%·체크 1.44%, 신한카드 가맹점수수료율 안내) — 사용자가 고치는 참고값
//   세액공제 — 부가가치세법 제46조, 율·한도는 vat.ts(부가세 계산기와 같은 상수)
import { CARD_RATE, CARD_LIMIT } from './vat.ts'

export const BRACKETS = ['small', 'mid1', 'mid2', 'mid3', 'general'] as const
export type Bracket = (typeof BRACKETS)[number]
export interface Rates { credit: number; check: number } // %

/** 연매출 상한(이하). general은 상한 없음 */
export const UPPER: Record<Bracket, number> = {
  small: 300_000_000, mid1: 500_000_000, mid2: 1_000_000_000, mid3: 3_000_000_000, general: Infinity,
}
export const RATES: Record<Bracket, Rates> = {
  small: { credit: 0.4, check: 0.15 },
  mid1: { credit: 1.0, check: 0.75 },
  mid2: { credit: 1.15, check: 0.9 },
  mid3: { credit: 1.45, check: 1.15 },
  general: { credit: 2.1, check: 1.44 }, // 참고값 (업계 평균 공시) — 실제는 카드사별 계약
}
/** 부가가치세법 제46조: 개인사업자 + 직전 연도 공급가액 10억 이하. mid2 상한과 같아 구간으로 판정 */
export const VAT_ELIGIBLE_MAX = 1_000_000_000
// 2027.1.1 공급분부터 정부안(2026.8.3 세제개편안, 국회 심의 중): 1.2%·연 500만원, 2029.12.31까지
export const PROPOSAL_2027 = { rate: 0.012, limit: 5_000_000 }

const pos = (n: number) => (Number.isFinite(n) && n > 0 ? n : 0)

/** 연매출 → 구간 (상한 이하인 첫 구간) */
export const classify = (annualSales: number): Bracket => BRACKETS.find((b) => pos(annualSales) <= UPPER[b])!

/** 카드매출 × 수수료율. checkShare = 체크카드 비중(0~100%) */
export function fees(cardSales: number, checkShare: number, r: Rates) {
  const s = pos(cardSales)
  const check = Math.round((s * Math.min(100, pos(checkShare))) / 100)
  const credit = s - check
  const creditFee = Math.round((credit * r.credit) / 100)
  const checkFee = Math.round((check * r.check) / 100)
  return { credit, check, creditFee, checkFee, fee: creditFee + checkFee }
}

/** 신용카드매출전표 등 발행세액공제 (카드 결제금액, 부가세 포함). 납부세액을 넘는 부분은 없는 것으로 봄 — 여기선 상한만 */
export const vatCredit = (annualCard: number, rate = CARD_RATE, limit = CARD_LIMIT) => Math.min(Math.floor(pos(annualCard) * rate), limit)

export interface Input { bracket: Bracket; monthly: number; checkShare: number; rates: Rates; corp: boolean }

export function analyze(i: Input) {
  const m = fees(i.monthly, i.checkShare, i.rates)
  const annualCard = pos(i.monthly) * 12
  const annualFee = m.fee * 12
  const eligible = !i.corp && UPPER[i.bracket] <= VAT_ELIGIBLE_MAX
  const taxCredit = eligible ? vatCredit(annualCard) : 0
  const taxCredit2027 = eligible ? vatCredit(annualCard, PROPOSAL_2027.rate, PROPOSAL_2027.limit) : 0
  // 구간별 비교 (같은 카드매출). 현재 구간은 입력한 수수료율
  const compare = BRACKETS.map((b) => {
    const fee = fees(i.monthly, i.checkShare, b === i.bracket ? i.rates : RATES[b]).fee * 12
    return { bracket: b, rates: b === i.bracket ? i.rates : RATES[b], fee, diff: fee - annualFee }
  })
  const idx = BRACKETS.indexOf(i.bracket)
  const up = idx < BRACKETS.length - 1 ? compare[idx + 1] : null
  // 신규가맹점: 첫 선정 전엔 일반가맹점 수수료율 → 영세·중소로 확인되면 차액 환급 (한 달 기준)
  const refundMonthly = i.bracket === 'general' ? 0 : Math.max(0, fees(i.monthly, i.checkShare, RATES.general).fee - m.fee)
  return {
    ...m, monthlyFee: m.fee, annualCard, annualFee,
    effective: annualCard ? (annualFee / annualCard) * 100 : 0, // 실효 수수료율 %
    eligible, taxCredit, taxCredit2027, net: annualFee - taxCredit, net2027: annualFee - taxCredit2027,
    compare, up, refundMonthly,
  }
}

/** 첫 화면 기본값: 영세가맹점, 월 카드매출 2,000만원, 체크카드 25% */
export const DEFAULTS = { bracket: 'small' as Bracket, monthly: 20_000_000, checkShare: 25, corp: false }
