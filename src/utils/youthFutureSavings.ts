// 청년미래적금 만기 수령액·정부기여금·비과세 효과. 회귀 체크: node scripts/check-youth-future-savings.ts
// 금액 단위: 원. 날짜: 'YYYY-MM-DD'. 모든 수치는 아래 출처에서 2026-11-07 에 확인.
//
// [FSC-0930] 금융위원회 보도자료 2026-09-30 「10월 7일부터 2차 가입신청 시작! …달라진 절차와 주요일정」
//            https://www.fsc.go.kr/no010101/87820
// [FSC-0916] 금융위원회 보도자료 2026-09-16 「10월 7일부터 청년미래적금 2차 가입 신청을 받습니다」
//            https://www.fsc.go.kr/no010101/87726
// [FSC-0622] 금융위원회 2026-06-22 「청년미래적금 출시, 6월 22일부터 7.3일까지 가입신청」(만기 수령액 예시)
//            https://www.fsc.go.kr/po010101/87158
// [FSC-0423] 금융위원회 보도자료 2026-04-23 「청년미래적금 출시 준비 점검회의」(가입요건·특별중도해지)
//            https://www.fsc.go.kr/no010101/86767
// [KINFA]    서민금융진흥원 청년미래적금 안내(월 50만원·연 600만원·36개월)
//            https://www.kinfa.or.kr/fill4young/financeCommercial/youthFutureSaving.do
// [LAW]      조세특례제한법 제91조의25(청년미래적금 비과세), 법률 제21223호 2025-12-23 공포·2026-01-01 시행
//            https://www.law.go.kr/법령/조세특례제한법/제91조의25
// [BANK]     취급기관 상품설명서(신한은행 청년미래적금, 준법감시인 심사필 제2026-12748-1호) — 기여금 이자·특별중도해지 세부
//            https://img.shinhan.com/sbank2016/seol/20260602000000540001LC000030.PDF
import { interestPerWon, calc as savingsCalc, TAX_RATES } from './savings.ts'

// ── 상품 구조 ──
export const TERM_MONTHS = 36 // 3년 만기 [FSC-0930][KINFA]
export const MONTHLY_MAX = 500_000 // 월 최대 50만원, 자유적립식 [FSC-0930][KINFA]
export const ANNUAL_MAX = 6_000_000 // 연간 600만원 [KINFA][BANK] — 월 50만원 × 12 와 같아 월 한도만 지키면 넘지 않는다
export const BASE_RATE = 5 // 기본금리 연 5%(3년 고정, 전 취급기관) [FSC-0930]
export const BONUS_MAX = 3 // 우대금리 최대 2~3%p(취급기관별) [FSC-0930]
// 기본값 우대 2%p = 연 7%: 금융위 만기 예시의 첫 가정(7%) [FSC-0622]. 실제 우대 조건은 은행마다 다르다.
export const DEFAULT_BONUS = 2
// 일반 적금 이자소득세 15.4%(소득세 14% + 지방소득세 1.4%) — savings.ts 와 같은 값
export const REGULAR_TAX = TAX_RATES.normal

// ── 정부기여금 ── 납입액 × 비율, 산정 기준금액은 월·연 저축한도까지 [FSC-0930][BANK]
export type Tier = 'general' | 'preferred' | 'taxOnly'
export const TIERS: Tier[] = ['general', 'preferred', 'taxOnly']
export const isTier = (s: string | null | undefined): s is Tier => !!s && (TIERS as string[]).includes(s)
export const CONTRIBUTION_RATE: Record<Tier, number> = { general: 0.06, preferred: 0.12, taxOnly: 0 }
// 2027년 정부 예산안: 우대형 12% → 15%(지방 중소기업 25%), 가입대상 모든 청년, 기존 가입자 우대형 소급 '예정'.
// 국회 확정 전이라 계산 기본값이 아니라 참고 줄에만 쓴다 [FSC-0916]
export const PROPOSED_2027_PREFERRED = 0.15

// ── 가입 요건 ── [FSC-0930][FSC-0423][LAW][BANK]
export const AGE_MIN = 19
export const AGE_MAX = 34
export const MILITARY_MAX_MONTHS = 72 // 병역 이행 기간 최대 6년은 나이에서 뺀다(만 35세·병역 2년 → 33세로 심사)
// 개인소득: 직전연도(2025년) 국세청 확정 소득 기준. 금액은 원.
export const INCOME = {
  taxOnly: { salary: 75_000_000, comprehensive: 63_000_000 }, // 6,000만 초과~7,500만: 기여금 없이 비과세만 (조특법 제91조의25 상한)
  general: { salary: 60_000_000, comprehensive: 48_000_000 }, // 일반형 6%(중소기업 신규 취업자는 이 기준으로 우대형)
  preferred: { salary: 36_000_000, comprehensive: 26_000_000 }, // 우대형 12% 중소기업 재직자
}
export const SMALL_BIZ_SALES = { general: 300_000_000, preferred: 100_000_000 } // 소상공인 연매출
// 가구 기준중위소득 % (맞벌이 = 주민등록등본상 본인과 배우자 2인 가구)
export const HOUSEHOLD = { general: 200, generalDual: 250, preferred: 150, preferredDual: 200 }
export const SME_TENURE_MONTHS = 29 // 우대형(중소기업): 가입~만기 한 달 전 총 29개월 이상 재직, 이직 2회까지
export const REJOIN_WAIT_MONTHS = 2 // 중도해지 후 해지월 기준 2개월 뒤 재신청, 기여금 비율 × (36 − 기존 가입기간)/36 [FSC-0930][BANK]

// ── 가입 신청 일정 ── 토·일·공휴일 제외, 일정은 심사 상황에 따라 연장·순연될 수 있음
export interface Round { round: 1 | 2; apply: [string, string]; review: [string, string]; notice?: [string, string]; open: [string, string] }
export const ROUNDS: Round[] = [
  // 1차 [FSC-0622]: 첫 5영업일 출생연도 끝자리 5부제
  { round: 1, apply: ['2026-06-22', '2026-07-03'], review: ['2026-07-06', '2026-07-24'], open: ['2026-07-27', '2026-08-07'] },
  // 2차 [FSC-0916][FSC-0930]: 10.7~8 출생연도 홀짝제, 계좌개설 기간에 열지 않으면 가입 기회 소멸
  { round: 2, apply: ['2026-10-07', '2026-10-16'], review: ['2026-10-19', '2026-11-13'], notice: ['2026-11-12', '2026-11-13'], open: ['2026-11-16', '2026-11-27'] },
]
// 2차 가입대상 출생일(계좌개설 기간 당일 만 19~34세, 병역 차감 전) [FSC-0930]
export const ROUND2_BIRTH: [string, string] = ['1991-11-17', '2007-11-27']
// 3차: 날짜 미발표 — 2027 예산안 국회 확정 후 제도 정비를 거쳐 진행 예정 [FSC-0930] → 화면에 '확인 필요'

const clamp = (v: number, lo: number, hi: number) => (Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : lo)

export interface Input { monthly: number; baseRate: number; bonusRate: number; tier: Tier }

/**
 * 매달 같은 금액을 36회 넣는 경우. 은행 이자 = 적금 단리(입금 건별 예치기간 × 약정금리) [BANK],
 * 월 단위 근사 월납입 × 연이율/12 × n(n+1)/2 — 은행은 일수로 계산해 몇백~몇천 원 다를 수 있다.
 * 기여금 이자 = 기여금 × 기본금리(우대 제외) [BANK]. 기여금이 납입한 달에 적립된다고 보면
 * 금융위 만기 예시 4개(7%·8% × 일반·우대)와 1만원 단위로 맞는다 [FSC-0622]. 실제 입금일은 진흥원 입금일 기준(확인 필요).
 */
export function calcYouthFutureSavings(input: Input, contributionRate = CONTRIBUTION_RATE[input.tier]) {
  const n = TERM_MONTHS
  const monthly = Math.floor(clamp(input.monthly, 0, MONTHLY_MAX))
  const base = clamp(input.baseRate, 0, 20)
  const rate = base + clamp(input.bonusRate, 0, BONUS_MAX)
  const principal = monthly * n
  const interest = Math.floor(monthly * interestPerWon('saving', rate, n, false))
  const monthlyContribution = Math.floor(monthly * contributionRate)
  const contribution = monthlyContribution * n
  const contributionInterest = Math.floor(monthlyContribution * interestPerWon('saving', base, n, false))
  const maturity = principal + interest + contribution + contributionInterest
  // 비과세로 안 낸 세금: 이자(본인 납입분·기여금분) × 15.4%
  const taxSaved = Math.floor((interest + contributionInterest) * REGULAR_TAX)
  // 같은 금리·같은 납입의 일반 적금(15.4% 과세)
  const regular = savingsCalc({ kind: 'saving', amount: monthly, rate, months: n, compound: false, tax: 'normal' })
  // 일반 적금 금리로 환산: 과세 단리 적금이 몇 %여야 같은 만기액이 되나 (금융위 '○% 단리 적금 가입 효과'와 같은 방식)
  const perPercent = monthly * interestPerWon('saving', 1, n, false) * (1 - REGULAR_TAX)
  const equivalentRate = perPercent > 0 ? (maturity - principal) / perPercent : 0
  return {
    months: n, monthly, rate, baseRate: base, principal, interest, monthlyContribution, contribution, contributionInterest,
    maturity, taxSaved, regular, gainVsRegular: maturity - regular.maturity, equivalentRate,
  }
}

export type WorkerType = 'employee' | 'smeEmployee' | 'smeNewHire' | 'smallBiz'
export const WORKER_TYPES: WorkerType[] = ['employee', 'smeEmployee', 'smeNewHire', 'smallBiz']

/**
 * 나이(만 나이, 병역 개월)·개인소득만으로 본 예상 유형. 가구소득(중위 %)·금융소득종합과세·근속 요건은 심사에서 따로 본다.
 * income: 소상공인은 연매출, 그 외는 직전연도 총급여(원). tier=null 이면 소득 기준 초과.
 */
export function eligibility(age: number, militaryMonths: number, type: WorkerType, income: number) {
  // 만 나이(정수) − 병역 개월/12 의 정수부가 34 이하. 정확한 판정은 생년월일·실제 복무기간으로 한다
  const counted = Math.floor(age - Math.min(Math.max(0, militaryMonths || 0), MILITARY_MAX_MONTHS) / 12)
  const ageOk = age >= AGE_MIN && counted <= AGE_MAX
  let tier: Tier | null
  if (type === 'smallBiz') {
    tier = income <= SMALL_BIZ_SALES.preferred ? 'preferred' : income <= SMALL_BIZ_SALES.general ? 'general' : null
  } else if (income > INCOME.taxOnly.salary) tier = null
  else if (income > INCOME.general.salary) tier = 'taxOnly'
  else if (type === 'smeNewHire' || (type === 'smeEmployee' && income <= INCOME.preferred.salary)) tier = 'preferred'
  else tier = 'general'
  return { ageOk, countedAge: counted, tier }
}
