// 프리랜서(인적용역 사업소득) 3.3% 원천징수 · 종합소득세 추계. 회귀 체크: node scripts/check-freelancer-tax.ts
// 금액 단위: 원(정수). 경비율 단위: %.
import { withholding33, type Withholding } from './salesCommission.ts'
import { getKoreanHolidays } from './koreanHolidays.ts'

export { withholding33 }

// ── 종합소득세 기본세율 (소득세법 제55조, 2023 귀속~ · 2026 귀속 개정 없음) ──
export const BRACKETS = [
  { upTo: 14_000_000, rate: 0.06, deduction: 0 },
  { upTo: 50_000_000, rate: 0.15, deduction: 1_260_000 },
  { upTo: 88_000_000, rate: 0.24, deduction: 5_760_000 },
  { upTo: 150_000_000, rate: 0.35, deduction: 15_440_000 },
  { upTo: 300_000_000, rate: 0.38, deduction: 19_940_000 },
  { upTo: 500_000_000, rate: 0.40, deduction: 25_940_000 },
  { upTo: 1_000_000_000, rate: 0.42, deduction: 35_940_000 },
  { upTo: Infinity, rate: 0.45, deduction: 65_940_000 },
]

export const bracketIndex = (taxable: number) => BRACKETS.findIndex((b) => taxable <= b.upTo)

export function progressiveTax(taxable: number): number {
  if (taxable <= 0) return 0
  const b = BRACKETS[bracketIndex(taxable)]
  return Math.floor(taxable * b.rate - b.deduction + 1e-6)
}

// ── 업종별 경비율 (국세청 2025년 귀속 경비율 고시, 일반율) ──
// excess = 단순경비율 초과율: 수입금액 4천만원 초과분 적용. 고시값 그대로(대부분 100-(100-단순)×1.4, 배우 등 예외)
export interface Industry { code: string; simple: number; excess: number; standard: number }

export const INDUSTRIES: Industry[] = [
  { code: '940909', simple: 64.1, excess: 49.7, standard: 17.4 }, // 기타자영업
  { code: '940926', simple: 64.4, excess: 50.2, standard: 20.9 }, // 소프트웨어 프리랜서
  { code: '940100', simple: 58.7, excess: 42.2, standard: 7.2 },  // 작가
  { code: '940903', simple: 61.7, excess: 46.4, standard: 15.4 }, // 학원강사·강사·과외
  { code: '940306', simple: 64.1, excess: 49.7, standard: 12.1 }, // 1인미디어콘텐츠창작자
  { code: '940500', simple: 70.9, excess: 59.3, standard: 16.2 }, // 연예보조서비스
  { code: '940600', simple: 58.4, excess: 41.8, standard: 7.6 },  // 자문·고문·교정료
  { code: '940918', simple: 79.4, excess: 71.2, standard: 19.8 }, // 퀵서비스배달원
  { code: '940302', simple: 29.0, excess: 10.6, standard: 5.9 },  // 배우·탤런트
]

export const excessRate = (simple: number) => Math.round((100 - (100 - simple) * 1.4) * 10) / 10

export function industryOf(code: string, customSimple = 64.1, customStandard = 17.4): Industry {
  return INDUSTRIES.find((x) => x.code === code)
    ?? { code: 'custom', simple: customSimple, excess: Math.max(0, excessRate(customSimple)), standard: customStandard }
}

// ── 기장의무·경비율 적용 기준 (인적용역 = 시행령 §143④ '다'군, 인적용역 직전 기준 3,600만) ──
export const SIMPLE_PREV_LIMIT = 36_000_000   // 직전연도 수입 3,600만 미만 → 단순경비율
export const NEW_BIZ_LIMIT = 75_000_000       // 신규: 당해 수입 7,500만 미만 → 단순경비율
export const DOUBLE_ENTRY_LIMIT = 75_000_000  // 직전 수입 7,500만 이상 → 복식부기의무자
export const SMALL_BIZ_LIMIT = 48_000_000     // 직전 수입 4,800만 미만 = 소규모 → 무기장가산세 없음
export const EXCESS_FROM = 40_000_000         // 단순경비율 초과율 적용 구간

export type Method = 'simple' | 'standard' | 'book'

/** prev = 직전연도 수입 (0 = 올해 신규). 시행령 §143④: 신규 또는 직전 3,600만 미만이면서 당해 수입도 7,500만(§208⑤2호다목) 미만 */
export function eligibleMethod(revenue: number, prev: number): 'simple' | 'standard' {
  if (revenue >= NEW_BIZ_LIMIT) return 'standard'
  return prev <= 0 || prev < SIMPLE_PREV_LIMIT ? 'simple' : 'standard'
}

export const isDoubleEntry = (prev: number) => prev >= DOUBLE_ENTRY_LIMIT

/** 단순경비율 필요경비 (4천만 초과분은 초과율) */
export function simpleExpense(revenue: number, ind: Industry): number {
  const base = Math.min(revenue, EXCESS_FROM), over = Math.max(0, revenue - EXCESS_FROM)
  return Math.floor((base * ind.simple + over * ind.excess) / 100 + 1e-6)
}

/** 기준경비율 소득금액 = 수입 - 주요경비(증빙) - 수입×기준경비율(복식부기의무자는 1/2, 소득세법 시행령 §143③1호 단서),
 *  한도 = 단순경비율 소득금액 × 2.8(간편장부)/3.4(복식부기) */
export function standardIncome(revenue: number, major: number, ind: Industry, doubleEntry: boolean) {
  const rate = doubleEntry ? ind.standard / 2 : ind.standard
  const raw = Math.max(0, revenue - major - Math.floor((revenue * rate) / 100 + 1e-6))
  const cap = Math.floor((revenue - simpleExpense(revenue, ind)) * (doubleEntry ? 3.4 : 2.8))
  return { income: Math.min(raw, cap), capped: raw > cap, cap }
}

/** 노란우산공제 소득공제 한도 (조특법 §86의3①, 2025.3.14 개정 — 2025년 납부분부터) — 사업소득금액 기준 */
export const yellowUmbrellaLimit = (bizIncome: number) =>
  bizIncome <= 40_000_000 ? 6_000_000 : bizIncome <= 60_000_000 ? 5_000_000 : bizIncome <= 100_000_000 ? 4_000_000 : 2_000_000

/** 자녀세액공제 (소득세법 §59의2, 2025~): 1명 25만, 2명 55만, 3명째부터 +40만.
 *  대상 연령: 2025 귀속 8세 이상, 2026~2029 귀속 2016년 이전 출생(부칙 2026.4.21 §2 — 2017년생 제외), 2030~ 13세 이상 */
export const childCredit = (n: number) => (n <= 0 ? 0 : n === 1 ? 250_000 : 550_000 + (n - 2) * 400_000)

export const STANDARD_CREDIT = 70_000 // 표준세액공제 (근로소득 없는 종합소득자, §59의4⑨)

const floor10 = (x: number) => Math.floor(Math.max(0, x) / 10 + 1e-9) * 10

export interface Input {
  revenue: number        // 연 수입금액 (3.3% 떼기 전 지급액 합계)
  prev: number           // 직전연도 수입 (0 = 신규)
  industry: Industry
  method: Method
  major: number          // 기준경비율: 주요경비(매입·임차료·인건비, 증빙)
  bookExpense: number    // 장부: 실제 필요경비 (지역 건보료 포함 가능)
  persons: number        // 기본공제 인원 (본인 포함)
  children: number       // 8~20세 자녀 수
  pension: number        // 국민연금 납부액 (지역가입)
  yellow: number         // 노란우산공제 납입액
}

export interface Result {
  method: Method
  expense: number
  income: number         // 사업소득금액
  capped: boolean
  basic: number
  pension: number
  yellow: number
  yellowLimit: number
  totalDeduction: number
  taxable: number
  bracket: number
  computed: number       // 산출세액
  childCredit: number
  standardCredit: number
  penalty: number        // 무기장가산세
  incomeTax: number      // 결정세액(소득세)
  localTax: number
  totalTax: number
  withheld: Withholding
  refund: number         // + 환급 / - 추가납부
  effRate: number
}

export function calc(i: Input): Result {
  const revenue = Math.max(0, i.revenue)
  let expense: number, income: number, capped = false
  if (i.method === 'simple') {
    expense = simpleExpense(revenue, i.industry)
    income = revenue - expense
  } else if (i.method === 'standard') {
    const s = standardIncome(revenue, Math.max(0, i.major), i.industry, isDoubleEntry(i.prev))
    income = s.income; capped = s.capped; expense = revenue - income
  } else {
    expense = Math.min(revenue, Math.max(0, i.bookExpense))
    income = revenue - expense
  }

  const basic = Math.max(1, Math.floor(i.persons)) * 1_500_000
  const pension = Math.max(0, i.pension)
  const yellowLimit = yellowUmbrellaLimit(income)
  const yellow = Math.min(Math.max(0, i.yellow), yellowLimit, income)
  const totalDeduction = Math.min(income, basic + pension + yellow)
  const taxable = income - totalDeduction
  const computed = progressiveTax(taxable)

  const cc = childCredit(Math.max(0, Math.floor(i.children)))
  const credits = Math.min(computed, cc + STANDARD_CREDIT)
  const childCr = Math.min(cc, credits)
  // 무기장가산세 (§81의5): 소규모사업자(신규 또는 직전 4,800만 미만) 제외, 추계 신고 시 max(산출세액 20%, 수입 0.07%)
  const smallBiz = i.prev <= 0 || i.prev < SMALL_BIZ_LIMIT
  const penalty = i.method !== 'book' && !smallBiz
    ? Math.max(Math.floor(computed * 0.2), Math.floor(revenue * 0.0007)) : 0

  const incomeTax = floor10(computed - credits + penalty)
  const localTax = floor10(incomeTax * 0.1)
  const withheld = withholding33(revenue)
  const totalTax = incomeTax + localTax
  return {
    method: i.method, expense, income, capped, basic, pension, yellow, yellowLimit, totalDeduction,
    taxable, bracket: taxable > 0 ? bracketIndex(taxable) : -1, computed,
    childCredit: childCr, standardCredit: credits - childCr, penalty,
    incomeTax, localTax, totalTax, withheld,
    refund: withheld.total - totalTax,
    effRate: revenue > 0 ? (totalTax / revenue) * 100 : 0,
  }
}

/** 실수령액 → 계약(지급)액: 실수령이 net 이상이 되는 가장 작은 지급액 */
export function grossFromNet(net: number): number {
  if (net <= 0) return 0
  let g = Math.ceil(net / 0.967)
  while (g - withholding33(g).total < net) g++
  while (g > 0 && g - 1 - withholding33(g - 1).total >= net) g--
  return g
}

// ── 신고 기한: 5월 31일, 토·일·공휴일이면 다음 영업일 (국세기본법 §5) ──
const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

export function filingDeadline(year: number): Date {
  const hol = new Set(getKoreanHolidays(year).map((h) => h.date))
  const d = new Date(year, 4, 31)
  while (d.getDay() === 0 || d.getDay() === 6 || hol.has(iso(d))) d.setDate(d.getDate() + 1)
  return d
}

/** today 기준 다음 신고 기한 · 귀속연도 · 남은 일수 */
export function nextFiling(today: Date) {
  const t0 = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  let year = t0.getFullYear()
  let deadline = filingDeadline(year)
  if (t0 > deadline) deadline = filingDeadline(++year)
  return { deadline, dateStr: iso(deadline), taxYear: year - 1, days: Math.round((deadline.getTime() - t0.getTime()) / 86_400_000) }
}
