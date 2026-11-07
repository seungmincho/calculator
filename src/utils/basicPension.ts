// 기초연금 수급 자격(소득인정액 vs 선정기준액)과 예상 월액 — 2026년 기준. 회귀 체크: node scripts/check-basic-pension.ts
// 금액 단위: 원(소득은 월액, 재산은 가액). 모든 숫자는 아래 원문에서 2026-11-07 확인.
//  [법]   기초연금법(시행 2025-10-01) https://www.law.go.kr/법령/기초연금법
//         제3조(선정기준액 이하·직역연금 수급권자 제외) 제5조(A급여 산식·부가연금액) 제6조(150% 이하 전액)
//         제7조(기준연금액 상한) 제8조(부부 20%·소득역전 감액) 제24조(10원 미만 절사)
//  [령]   기초연금법 시행령(시행 2026-07-30) https://www.law.go.kr/법령/기초연금법시행령
//         제2조(소득 범위) 제3조(재산 범위) 제4조②(부부 = 단독 × 160%) 제10조(150~200%: 250% 산식과 큰 금액)
//         제11조(소득역전 감액 지급수준: 최저 10%·부부 20%, 부부 배분)
//  [규칙] 기초연금법 시행규칙(시행 2026-07-30) https://www.law.go.kr/법령/기초연금법시행규칙
//         제2조②(무료임차소득 = 시가표준액 × 0.78% ÷ 12) 제4조(재산의 소득환산: 기본재산액·금융재산 공제·부채·4%·고급차 100%)
//  [고시] 보건복지부고시 제2026-156호(시행 2026-07-30) https://www.law.go.kr/LSW/admRulLsInfoR.do?admRulSeq=2100000283276
//         제2조 선정기준액 · 제3조 기준연금액 · 제4조 무료임차 6억 · 제6조 근로 116만+30% · 제6조의2 이자 4만
//         제8조 기본재산액 표 · 제9조 금융 2,000만 · 제10조 임대보증금 50% · 제11조 자동차 4천만·예외
//  [복지부] 선정기준액 보도자료(2026-01-01) https://www.mohw.go.kr/board.es?act=view&bid=0027&list_no=1488478&mid=a10503000000
//         기준연금액 2.1% 인상 보도자료(2026-01-09) https://mohw.go.kr/board.es?act=view&bid=0027&list_no=1488572&mid=a10503000000
//         기초연금 누리집 산정표 https://basicpension.mohw.go.kr/menu.es?mid=a10103010000

export const BP_YEAR = 2026

/** [고시 제2조] 선정기준액(월 소득인정액). 부부 = 단독 × 160% [령 제4조②] */
export const THRESHOLD = { single: 2_470_000, couple: 3_952_000 } as const
/** [고시 제3조] 기준연금액(월). 1~12월 적용 [법 제5조②] */
export const BASE = 349_700
/** [고시 제6조] 근로소득 기본공제(월). 남는 금액의 30%를 더 빼 70%만 소득으로 본다. 부부는 각각. */
export const WORK_DEDUCTION = 1_160_000
export const WORK_KEEP_PCT = 70
/** [고시 제6조의2] 이자소득 월 4만원 제외 */
export const INTEREST_DEDUCTION = 40_000
/** [고시 제8조 표] 기본재산액. 대도시 = 특별시·광역시의 구(도농복합군 포함)·특례시, 중소도시 = 도의 시·세종, 농어촌 = 도의 군 */
export const BASIC_PROPERTY = { metro: 135_000_000, city: 85_000_000, rural: 72_500_000 } as const
/** [고시 제9조] 금융재산 공제 */
export const FINANCIAL_DEDUCTION = 20_000_000
/** [규칙 제4조②] 재산의 소득환산율(연 %) */
export const CONVERSION_PCT = 4
/** [고시 제11조] 이 가액 이상 자동차는 차량가액 전액이 월 소득(차령 10년 이상·생업용 등은 예외) */
export const LUXURY_CAR = 40_000_000
/** [고시 제4조·규칙 제2조②] 1촌 직계비속 소유 주택에 살면 시가표준액 6억 이상부터 × 0.78% ÷ 12 */
export const FREE_RENT_MIN = 600_000_000
export const FREE_RENT_BP = 78 // 10000분의 78

export type Household = 'single' | 'couple2' | 'couple1' // 단독 · 부부 모두 수급 · 부부 중 1명 수급
export type Region = keyof typeof BASIC_PROPERTY

export interface Person {
  work: number // 근로소득(월). 일용·공공일자리·자활근로 소득은 넣지 않는다
  nps: number // 국민연금 노령연금(분할연금 포함) 월액, 부양가족연금 제외
  a?: number | null // A급여(소득재분배급여금액) 월액. 모르면 null → 범위로
}

export interface BasicPensionInput {
  household: Household
  self: Person
  spouse: Person // 단독가구면 무시
  other: number // 가구 월 기타소득: 사업·임대·연금저축·직역·산재·유족/장애연금 등
  interest: number // 가구 월 이자·배당
  freeRent: number // 자녀(1촌 직계비속) 소유 거주 주택 시가표준액, 없으면 0
  region: Region
  property: number // 주택·토지·건물 시가표준액
  deposit: number // 내가 낸 전월세 보증금(임차보증금)
  car: number // 차량가액
  carExempt: boolean // 차령 10년 이상·생업용·화물 등 [고시 제11조②]
  financial: number
  debt: number // 대출·카드 미결제·인정되는 임대보증금(공시가격 50% 한도)
  jikyeok: boolean // 본인 또는 배우자가 공무원·군인·사학·별정우체국 연금 수급권자 [법 제3조③]
}

const floor10 = (n: number) => Math.floor(n / 10) * 10 // [법 제24조]
const pos = (n: number) => Math.max(0, n)
const isCouple = (h: Household) => h !== 'single'

export const workIncome = (w: number) => (pos(w - WORK_DEDUCTION) * WORK_KEEP_PCT) / 100
export const freeRentIncome = (house: number) => (house >= FREE_RENT_MIN ? (house * FREE_RENT_BP) / 10_000 / 12 : 0)

/** 소득평가액(월) [령 제2조·규칙 제2조·고시 제6조] */
export function incomeEval(x: BasicPensionInput) {
  const c = isCouple(x.household)
  const work = workIncome(x.self.work), workSpouse = c ? workIncome(x.spouse.work) : 0
  const nps = x.self.nps, npsSpouse = c ? x.spouse.nps : 0
  // ponytail: 이자 4만원 공제는 가구에 한 번 적용(부부 각각 적용 여부는 고시에 명시 없음 — 보수적으로)
  const interest = pos(x.interest - INTEREST_DEDUCTION)
  const freeRent = freeRentIncome(x.freeRent)
  return { work, workSpouse, nps, npsSpouse, other: x.other, interest, freeRent,
    total: work + workSpouse + nps + npsSpouse + x.other + interest + freeRent }
}

/** 재산의 소득환산액(월) [규칙 제4조]: {max(0, 일반−기본재산액) + max(0, 금융−2천만) − 부채}⁺ × 4% ÷ 12 + 고급차 가액 */
export function propertyEval(x: BasicPensionInput) {
  const luxury = x.car >= LUXURY_CAR && !x.carExempt
  const general = x.property + x.deposit + (luxury ? 0 : x.car)
  const basic = BASIC_PROPERTY[x.region]
  const generalNet = pos(general - basic)
  const financialNet = pos(x.financial - FINANCIAL_DEDUCTION)
  const net = pos(generalNet + financialNet - x.debt)
  const converted = (net * CONVERSION_PCT) / 100 / 12
  const luxuryIncome = luxury ? x.car : 0
  return { general, basic, generalNet, financialNet, net, converted, luxury, luxuryIncome, total: converted + luxuryIncome }
}

export interface Linked { lo: number; hi: number; rule: 'none' | 'full' | 'formula' | 'range' }

/** 국민연금 연계 기초연금액 [법 제5조⑤·제6조·제7조, 령 제10조].
 *  급여 ≤ 기준연금액 150% → 전액. 초과 → max(A산식, 250% − 급여), 상한 기준연금액.
 *  A산식 = max(0, 기준 − ⅔·A급여) + 부가연금액(기준 ½). 250% 산식은 령 제10조상 150~200% 구간에만 쓰이지만,
 *  200% 초과면 250% − 급여 < 부가연금액 ≤ A산식이라 max 결과가 같다.
 *  A급여를 모르면 하한 = max(부가연금액, 250% − 급여), 상한 = 기준연금액. */
export function linkedAmount(nps: number, a: number | null | undefined, base = BASE): Linked {
  if (nps <= 0) return { lo: base, hi: base, rule: 'none' }
  if (nps <= base * 1.5) return { lo: base, hi: base, rule: 'full' }
  const f250 = base * 2.5 - nps
  if (a == null) return { lo: floor10(Math.max(base / 2, f250)), hi: base, rule: 'range' }
  const aForm = pos(base - (2 / 3) * a) + base / 2
  const v = floor10(Math.min(base, Math.max(aForm, f250)))
  return { lo: v, hi: v, rule: 'formula' }
}

/** 부부감액 후 금액에 소득역전 방지 감액 [법 제8조②, 령 제11조]. amounts: 수급자별 금액(부부 2인이면 2개) */
function reversal(amounts: number[], recognized: number, threshold: number, base = BASE) {
  const sum = amounts.reduce((s, v) => s + v, 0)
  if (recognized + sum <= threshold) return { amounts, applied: false }
  const gap = threshold - recognized
  if (amounts.length === 1) {
    const floor = base / 10
    return { amounts: [floor10(Math.min(amounts[0], gap <= floor ? floor : gap))], applied: true }
  }
  const floor = base / 5
  const total = Math.min(sum, gap <= floor ? floor : gap)
  // 령 제11조⑤: 감액 전 금액 비율로 나누되, 1명 몫이 기준연금액 10% 미만이면 그 사람은 10%
  return { amounts: amounts.map((v) => floor10(Math.max(base / 10, (total * v) / sum))), applied: true }
}

export function calcBasicPension(x: BasicPensionInput) {
  const income = incomeEval(x)
  const property = propertyEval(x)
  const recognized = income.total + property.total
  const threshold = isCouple(x.household) ? THRESHOLD.couple : THRESHOLD.single
  const margin = threshold - recognized
  const eligible = !x.jikyeok && recognized <= threshold
  const people = x.household === 'couple2' ? [x.self, x.spouse] : [x.self]
  const linked = people.map((p) => linkedAmount(p.nps, p.a))
  const couple2 = x.household === 'couple2'
  const pipe = (k: 'lo' | 'hi') => {
    const afterLink = linked.map((l) => l[k])
    const afterCouple = couple2 ? afterLink.map((v) => floor10((v * 4) / 5)) : afterLink // [법 제8조①]
    const r = reversal(afterCouple, recognized, threshold)
    return { afterLink, afterCouple, final: eligible ? r.amounts : afterLink.map(() => 0), reversal: eligible && r.applied }
  }
  const lo = pipe('lo'), hi = pipe('hi')
  const sum = (a: number[]) => a.reduce((s, v) => s + v, 0)
  return {
    income, property, recognized, threshold, margin, eligible, linked, lo, hi,
    total: { lo: sum(lo.final), hi: sum(hi.final) },
    exact: sum(lo.final) === sum(hi.final),
  }
}
export type BasicPensionResult = ReturnType<typeof calcBasicPension>

/** 기초연금 누리집 '기초연금액 산정표'의 기준점(월) */
export const LIMITS = {
  min: BASE / 10, // 최저연금액(단독·부부 1인 수급)
  coupleMin: BASE / 5, // 부부 2인 수급 최저(합계)
  addOn: BASE / 2, // 부가연금액
  full150: BASE * 1.5, // 국민연금 이 금액 이하면 전액
  p200: BASE * 2,
  p250: BASE * 2.5,
  coupleMax: floor10((BASE * 4) / 5) * 2, // 부부 모두 수급 최대(합계)
}
