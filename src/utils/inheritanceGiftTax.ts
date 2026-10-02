// 상속세·증여세 계산 (상속세 및 증여세법, 2026-10 현재 시행 기준)
// 2024-12-10 정부 개정안(최고세율 40%·자녀공제 5억) 본회의 부결, 2025 정기국회도 상속세 개편 불발,
// 2026-09 정부 제출 개정안은 가업상속공제 위주 → 일반 세율·공제는 아래 현행 그대로.
import { getKoreanHolidays, isHoliday, isWeekend } from './koreanHolidays.ts'

export const EOK = 100_000_000
export const MAN = 10_000

// §26 세율 (상속·증여 동일). upTo 이하 구간, 누진공제
export const BRACKETS = [
  { upTo: 1 * EOK, rate: 0.1, deduction: 0 },
  { upTo: 5 * EOK, rate: 0.2, deduction: 10_000_000 },
  { upTo: 10 * EOK, rate: 0.3, deduction: 60_000_000 },
  { upTo: 30 * EOK, rate: 0.4, deduction: 160_000_000 },
  { upTo: Infinity, rate: 0.5, deduction: 460_000_000 },
] as const

export const FILING_CREDIT = 0.03 // §69 신고세액공제
const MIN_BASE = 500_000 // §25②·§55② 과세표준 50만원 미만은 과세 안 함

export const bracketIndex = (base: number) => BRACKETS.findIndex((b) => base <= b.upTo)
export function progressiveTax(base: number): number {
  if (base < MIN_BASE) return 0
  const b = BRACKETS[bracketIndex(base)]
  return Math.floor(base * b.rate - b.deduction)
}

// ── 증여세 ──
export type Relation = 'parent' | 'grandparent' | 'spouse' | 'child' | 'relative' | 'other'
export const RELATIONS: Relation[] = ['parent', 'grandparent', 'spouse', 'child', 'relative', 'other']

/** §53 증여재산공제(수증자 기준 10년 합산 한도) */
export function giftDeductionLimit(rel: Relation, minor: boolean): number {
  if (rel === 'spouse') return 6 * EOK
  if (rel === 'parent' || rel === 'grandparent') return minor ? 20_000_000 : 50_000_000
  if (rel === 'child') return 50_000_000
  if (rel === 'relative') return 10_000_000
  return 0
}
/** §53의2 혼인·출산 공제는 직계존속(부모·조부모) 증여만 */
export const marriageEligible = (rel: Relation) => rel === 'parent' || rel === 'grandparent'

export interface GiftInput {
  amount: number
  relation: Relation
  minor: boolean
  marriage: boolean
  /** 10년 안에 같은 증여자(부모·조부모면 그 배우자 포함)에게 이미 받은 금액 */
  prior: number
}
export interface GiftResult {
  total: number; baseDeduction: number; marriageDeduction: number; deduction: number
  base: number; rate: number; computed: number; surchargeRate: number; surcharge: number
  priorCredit: number; filingCredit: number; payable: number
}

export function giftTax(i: GiftInput): GiftResult {
  const total = Math.max(0, i.amount) + Math.max(0, i.prior)
  const baseDeduction = Math.min(total, giftDeductionLimit(i.relation, i.minor))
  const marriageDeduction = i.marriage && marriageEligible(i.relation) ? Math.min(total - baseDeduction, EOK) : 0
  const deduction = baseDeduction + marriageDeduction
  const rawBase = total - deduction
  const base = rawBase < MIN_BASE ? 0 : rawBase
  const computed = progressiveTax(base)
  // §57 세대생략 할증: 30%, 미성년 수증자 + 증여재산 20억 초과면 40%
  const surchargeRate = i.relation === 'grandparent' ? (i.minor && total > 20 * EOK ? 0.4 : 0.3) : 0
  const surcharge = Math.floor(computed * surchargeRate)
  // §58 기납부세액공제: 앞선 증여의 산출세액(공제는 먼저 받은 증여부터), 한도 = 합산 산출세액 × 앞선 과세표준/합산 과세표준
  let priorCredit = 0
  if (i.prior > 0 && base > 0) {
    const p = giftTax({ ...i, amount: i.prior, prior: 0, marriage: false })
    priorCredit = Math.min(p.computed + p.surcharge, Math.floor((computed + surcharge) * p.base / base))
  }
  const net = computed + surcharge - priorCredit
  const filingCredit = Math.floor(net * FILING_CREDIT)
  return {
    total, baseDeduction, marriageDeduction, deduction, base,
    rate: base > 0 ? BRACKETS[bracketIndex(base)].rate : 0,
    computed, surchargeRate, surcharge, priorCredit, filingCredit, payable: net - filingCredit,
  }
}

/** 같은 금액을 n명에게 똑같이 / k번(10년 간격)으로 나눠 줄 때 총 납부세액 (기존 증여 없음 가정) */
export function splitGift(i: GiftInput, people: number, rounds: number): number {
  const each = Math.floor(i.amount / (people * rounds))
  return giftTax({ ...i, amount: each, prior: 0 }).payable * people * rounds
}

/** 조부모 → 부모(성년) → 손주 두 번 증여 vs 직접(할증) */
export function viaParent(i: GiftInput): { first: number; second: number; total: number } {
  const first = giftTax({ amount: i.amount, relation: 'parent', minor: false, marriage: false, prior: 0 }).payable
  const second = giftTax({ ...i, relation: 'parent', amount: i.amount - first, prior: 0 }).payable
  return { first, second, total: first + second }
}

// ── 상속세 ──
export type SpouseMode = 'legal' | 'min' | 'custom'
export interface InheritInput {
  estate: number; debts: number
  funeral: number; bongan: number
  fin: number; house: number
  spouse: boolean; spouseMode: SpouseMode; spouseAmount: number
  children: number; minorAges: number[]; elders: number
  /** 10년 안에 상속인에게 미리 증여한 재산 */
  preGift: number
}
export interface InheritResult {
  funeralDeduction: number; taxableValue: number
  personal: number; general: number; lumpSum: boolean; spouseOnly: boolean
  spouseLegal: number; spouseShare: number; spouseDeduction: number
  finDeduction: number; houseDeduction: number
  deductionSum: number; deductionLimit: number; deduction: number; capped: boolean
  base: number; rate: number; computed: number
  preGiftBase: number; giftCredit: number; filingCredit: number; payable: number
}

// ponytail: 사전증여는 성년 자녀 1명이 부모에게 받은 것(증여재산공제 5천만)으로 가정. 수증자·관계별 입력은 필요해지면 추가
export const PRE_GIFT_DEDUCTION = 50_000_000

export function financialDeduction(fin: number): number {
  if (fin <= 0) return 0
  if (fin <= 20_000_000) return fin
  return Math.min(2 * EOK, Math.max(20_000_000, Math.floor(fin * 0.2)))
}

/** 시행령 §9: 장례비 증빙 없어도 500만, 최대 1천만 + 봉안시설·자연장지 최대 500만 */
export const funeralDeduction = (funeral: number, bongan: number) =>
  Math.min(Math.max(funeral, 5_000_000), 10_000_000) + Math.min(Math.max(bongan, 0), 5_000_000)

export function inheritanceTax(i: InheritInput): InheritResult {
  const fd = funeralDeduction(i.funeral, i.bongan)
  const preGift = Math.max(0, i.preGift)
  const taxableValue = Math.max(0, i.estate - i.debts - fd) + preGift // §13 과세가액

  // §20 인적공제: 자녀 5천만, 미성년자 1천만×19세까지 연수, 연로자(65세↑) 5천만
  const minor = i.minorAges.filter((a) => a >= 0 && a < 19).reduce((s, a) => s + (19 - a) * 10_000_000, 0)
  const personal = i.children * 50_000_000 + minor + i.elders * 50_000_000
  // §21: 일괄공제 5억 vs 기초 2억+인적공제 중 큰 쪽. 배우자 단독상속이면 일괄공제 불가
  // ponytail: 자녀가 없으면 배우자 단독상속으로 가정(피상속인의 부모가 공동상속인이면 달라짐)
  const spouseOnly = i.spouse && i.children === 0
  const itemized = 2 * EOK + personal
  const general = spouseOnly ? itemized : Math.max(5 * EOK, itemized)

  // §19 배우자공제: 실제 받은 금액, 한도 = min(법정상속분 기준액, 30억), 최소 5억
  const spouseShare = !i.spouse ? 0 : spouseOnly ? 1 : 1.5 / (1.5 + i.children)
  const spouseLegal = Math.floor((Math.max(0, i.estate - i.debts) + preGift) * spouseShare)
  const actual = i.spouseMode === 'legal' ? spouseLegal : i.spouseMode === 'min' ? 0 : i.spouseAmount
  const spouseDeduction = i.spouse ? Math.max(5 * EOK, Math.min(actual, spouseLegal, 30 * EOK)) : 0

  const finDeduction = financialDeduction(i.fin) // §22
  const houseDeduction = Math.min(Math.max(i.house, 0), 6 * EOK) // §23의2 동거주택

  // §24 공제 종합한도: 과세가액 − (과세가액 5억 초과 시) 가산한 증여재산(증여재산공제 차감)
  const preGiftBase = Math.max(0, preGift - PRE_GIFT_DEDUCTION)
  const deductionLimit = Math.max(0, taxableValue - (taxableValue > 5 * EOK ? preGiftBase : 0))
  const deductionSum = general + spouseDeduction + finDeduction + houseDeduction
  const deduction = Math.min(deductionSum, deductionLimit)

  const rawBase = taxableValue - deduction
  const base = rawBase < MIN_BASE ? 0 : rawBase
  const computed = progressiveTax(base)
  // §28 증여세액공제: 사전증여 때 낸 증여세, 한도 = 산출세액 × 증여 과세표준/상속 과세표준
  const giftCredit = base > 0 && preGiftBase > 0
    ? Math.min(progressiveTax(preGiftBase), Math.floor(computed * Math.min(1, preGiftBase / base)))
    : 0
  const filingCredit = Math.floor((computed - giftCredit) * FILING_CREDIT)
  return {
    funeralDeduction: fd, taxableValue, personal, general, lumpSum: !spouseOnly && general === 5 * EOK, spouseOnly,
    spouseLegal, spouseShare, spouseDeduction, finDeduction, houseDeduction,
    deductionSum, deductionLimit, deduction, capped: deductionSum > deductionLimit,
    base, rate: base > 0 ? BRACKETS[bracketIndex(base)].rate : 0, computed,
    preGiftBase, giftCredit, filingCredit, payable: computed - giftCredit - filingCredit,
  }
}

// ── 신고·납부 기한 ──
const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

/** 기준일이 속한 달의 말일부터 months개월 (증여 3, 상속 6, 상속 국외 9). 기한이 토·일·공휴일이면 다음 영업일(국세기본법 §5) */
export function filingDeadline(dateStr: string, months: number): { legal: string; due: string } {
  const [y, m] = dateStr.split('-').map(Number)
  const d = new Date(y, m - 1 + months + 1, 0) // (기준월 + months)의 말일
  const legal = iso(d)
  // §5: 토·일·공휴일·근로자의 날(5/1)
  while (isWeekend(d) || isHoliday(iso(d), getKoreanHolidays(d.getFullYear())) || (d.getMonth() === 4 && d.getDate() === 1)) d.setDate(d.getDate() + 1)
  return { legal, due: iso(d) }
}
