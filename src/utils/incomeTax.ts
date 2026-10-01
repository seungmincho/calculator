// 종합소득세 (2025년 귀속 → 2026년 5월 확정신고) — 사업·근로·기타·금융소득 합산. 회귀 체크: node scripts/check-income-tax.ts
// 금액 단위: 원(정수). 세율표·경비율·노란우산·자녀공제는 freelancerTax.ts, 근로소득공제·근로소득세액공제는 yearEndTax.ts 재사용.
import {
  BRACKETS, bracketIndex, progressiveTax, simpleExpense, standardIncome, eligibleMethod, isDoubleEntry,
  yellowUmbrellaLimit, childCredit, withholding33, SMALL_BIZ_LIMIT, type Industry, type Method,
} from './freelancerTax.ts'
import { earnedIncomeDeduction, earnedIncomeCredit } from './yearEndTax.ts'

export { BRACKETS, bracketIndex, eligibleMethod, type Method }

export const FIN_THRESHOLD = 20_000_000   // 금융소득 종합과세 기준 (소득세법 §14③6호)
export const FIN_RATE = 0.14              // 이자·배당 원천징수세율 (§129①1호라·2호나)
export const OTHER_SEPARATE_LIMIT = 3_000_000 // 기타소득금액 300만 이하 분리과세 선택 (§14③8호)
export const OTHER_WH_RATE = 0.2          // 기타소득 원천징수 20% (§129①6호)
export const EFILING_CREDIT = 20_000      // 전자신고세액공제 (조특법 §104의8①)
export const STD_CREDIT_EARNED = 130_000  // 표준세액공제: 근로소득 있음, 특별공제 미신청 (§59의4⑨1호)
export const STD_CREDIT_OTHER = 70_000    // 표준세액공제: 근로소득 없는 종합소득자 (§59의4⑨2호)

const floor10 = (x: number) => Math.floor(Math.max(0, x) / 10 + 1e-9) * 10
const trunc10 = (n: number) => Math.trunc(n / 10) * 10 // 차감세액 10원 미만 절사 (국고금관리법 §47)

export interface Input {
  // 사업소득 (biz = false면 무시)
  biz: boolean
  revenue: number
  prev: number            // 직전연도 수입 (0 = 신규)
  industry: Industry
  method: Method
  major: number           // 기준경비율 주요경비
  bookExpense: number     // 장부 필요경비
  withheld33: boolean     // 3.3% 원천징수 받음
  // 근로소득
  wage: boolean
  salary: number          // 총급여 (비과세 제외)
  wageTax: number | null  // 연말정산 결정세액 (기납부). null = 근로소득만으로 추정
  otherDeduction: number  // 연말정산 그 밖의 소득공제 (카드·건강·고용보험 등)
  otherCredit: number     // 특별세액공제 등 (입력 시 표준세액공제 13만 대신)
  // 기타소득
  other: boolean
  otherPay: number        // 지급총액
  otherExpenseRate: number // 필요경비율 % (강연료·원고료 등 60%, 시행령 §87)
  // 금융소득 (이자·배당)
  fin: boolean
  finIncome: number
  // 공제
  persons: number         // 기본공제 인원 (본인 포함)
  elderly: number         // 70세 이상 (+100만, §51①1호)
  disabled: number        // 장애인 (+200만, §51①2호)
  children: number        // 8세 이상 기본공제 자녀 (§59의2)
  pension: number         // 국민연금 본인 부담 (§51의3)
  yellow: number          // 노란우산 (조특법 §86의3, 사업소득 있을 때)
  pensionSavings: number  // 연금저축 (600만 한도)
  irp: number             // IRP (합산 900만)
  midterm: number         // 중간예납 소득세 (11월)
  efiling: boolean
}

export const DEFAULT_INPUT: Input = {
  biz: true, revenue: 30_000_000, prev: 25_000_000, industry: { code: '940909', simple: 64.1, excess: 49.7, standard: 17.4 },
  method: 'simple', major: 0, bookExpense: 0, withheld33: true,
  wage: false, salary: 40_000_000, wageTax: null, otherDeduction: 0, otherCredit: 0,
  other: false, otherPay: 5_000_000, otherExpenseRate: 60,
  fin: false, finIncome: 30_000_000,
  persons: 1, elderly: 0, disabled: 0, children: 0, pension: 0, yellow: 0, pensionSavings: 0, irp: 0,
  midterm: 0, efiling: true,
}

/** 금융소득 종합과세 산출세액 (§62 비교과세): max(일반, 비교). Gross-up(§17③)·배당세액공제는 미반영 */
export function finCompareTax(taxBase: number, fin: number) {
  const general = progressiveTax(Math.max(0, taxBase - FIN_THRESHOLD)) + Math.floor(Math.min(taxBase, FIN_THRESHOLD) * FIN_RATE)
  const compare = Math.floor(fin * FIN_RATE) + progressiveTax(Math.max(0, taxBase - fin))
  return general >= compare
    ? { tax: general, rateBase: Math.max(0, taxBase - FIN_THRESHOLD) }
    : { tax: compare, rateBase: Math.max(0, taxBase - fin) }
}

/** 연금계좌 세액공제 (§59의3): 연금저축 600만, IRP 합산 900만. 종합소득금액 4,500만 이하(근로소득만 있으면 총급여 5,500만 이하) 15%, 초과 12% */
export function pensionAccountCredit(savings: number, irp: number, totalIncome: number, wageOnly: boolean, salary: number) {
  const base = Math.min(Math.min(savings, 6_000_000) + irp, 9_000_000)
  const low = wageOnly ? salary <= 55_000_000 : totalIncome <= 45_000_000
  return Math.floor(Math.max(0, base) * (low ? 0.15 : 0.12))
}

function bizPart(i: Input) {
  const rev = Math.max(0, i.revenue)
  if (i.method === 'simple') { const e = simpleExpense(rev, i.industry); return { expense: e, income: rev - e, capped: false } }
  if (i.method === 'standard') {
    const de = isDoubleEntry(i.prev)
    const s = standardIncome(rev, Math.max(0, i.major), i.industry, de) // 복식부기의무자 1/2 적용은 standardIncome 안에서
    return { expense: rev - s.income, income: s.income, capped: s.capped }
  }
  const e = Math.min(rev, Math.max(0, i.bookExpense))
  return { expense: e, income: rev - e, capped: false }
}

function core(i: Input, otherIncluded: boolean) {
  const biz = i.biz ? bizPart(i) : { expense: 0, income: 0, capped: false }
  const salary = i.wage ? Math.max(0, i.salary) : 0
  const earnedDeduction = i.wage ? earnedIncomeDeduction(salary) : 0
  const earned = salary - earnedDeduction
  const otherPay = i.other ? Math.max(0, i.otherPay) : 0
  const otherIncome = otherPay - Math.floor(otherPay * Math.min(100, Math.max(0, i.otherExpenseRate)) / 100)
  const other = otherIncluded ? otherIncome : 0
  const finAmt = i.fin ? Math.max(0, i.finIncome) : 0
  const fin = finAmt > FIN_THRESHOLD ? finAmt : 0 // 2천만 이하 = 14% 분리과세로 종결
  const total = biz.income + earned + other + fin

  // ── 소득공제 ──
  const basic = Math.max(1, Math.floor(i.persons)) * 1_500_000 + Math.max(0, i.elderly) * 1_000_000 + Math.max(0, i.disabled) * 2_000_000
  const pension = Math.max(0, i.pension)
  const yellowLimit = i.biz ? Math.min(yellowUmbrellaLimit(biz.income), biz.income) : 0
  const yellow = Math.min(Math.max(0, i.yellow), yellowLimit)
  const otherDed = i.wage ? Math.min(Math.max(0, i.otherDeduction), earned) : 0
  const deduction = Math.min(total, basic + pension + yellow + otherDed)
  const taxBase = total - deduction

  // ── 산출세액 ──
  const f = fin > 0 ? finCompareTax(taxBase, fin) : { tax: progressiveTax(taxBase), rateBase: taxBase }
  const computed = f.tax
  const marginal = BRACKETS[bracketIndex(Math.max(1, f.rateBase))].rate

  // ── 세액공제 (합계는 산출세액 한도) ──
  const earnedCr = salary > 0 && total > 0 ? earnedIncomeCredit(Math.floor(computed * earned / total), salary) : 0 // §59: 근로소득분 산출세액
  const child = childCredit(Math.max(0, Math.floor(i.children)))
  const wageOnly = salary > 0 && biz.income + other + fin === 0
  const pensionCr = pensionAccountCredit(i.pensionSavings, i.irp, total, wageOnly, salary)
  const otherCr = i.wage ? Math.max(0, i.otherCredit) : 0
  const standard = i.wage ? (otherCr > 0 ? 0 : STD_CREDIT_EARNED) : STD_CREDIT_OTHER
  const efiling = i.efiling ? EFILING_CREDIT : 0
  const creditsRaw = earnedCr + child + pensionCr + otherCr + standard + efiling
  const credits = Math.min(computed, creditsRaw)

  // 무기장가산세 (§81의5): 추계 + 소규모사업자 아님 → max(산출세액×무기장소득비율×20%, 수입×0.07%)
  const smallBiz = i.prev <= 0 || i.prev < SMALL_BIZ_LIMIT
  const penalty = i.biz && i.method !== 'book' && !smallBiz && total > 0
    ? Math.max(Math.floor(computed * biz.income / total * 0.2), Math.floor(Math.max(0, i.revenue) * 0.0007)) : 0

  const determined = Math.max(0, computed - credits) + penalty
  const localTax = Math.floor(determined * 0.1) // 지방소득세 = 소득세 결정세액의 10% (지방세법 §92)
  return {
    biz, salary, earnedDeduction, earned, otherPay, otherIncome, other, finAmt, fin, total,
    basic, pension, yellow, yellowLimit, otherDed, deduction, taxBase, computed, marginal,
    cr: { earned: earnedCr, child, pension: pensionCr, other: otherCr, standard, efiling },
    credits, penalty, determined, localTax, totalTax: determined + localTax,
  }
}

function prepaidOf(i: Input, c: ReturnType<typeof core>, wageTax: number) {
  const w33 = i.biz && i.withheld33 ? withholding33(i.revenue) : { incomeTax: 0, localTax: 0 }
  const otherIt = c.other > 0 ? floor10(c.otherIncome * OTHER_WH_RATE) : 0
  const finIt = c.fin > 0 ? floor10(c.fin * FIN_RATE) : 0
  const items = {
    biz: w33.incomeTax,
    wage: wageTax,
    other: otherIt,
    fin: finIt,
    midterm: Math.max(0, i.midterm),
  }
  const income = items.biz + items.wage + items.other + items.fin + items.midterm
  const local = w33.localTax + Math.floor(wageTax * 0.1) + floor10(otherIt * 0.1) + floor10(finIt * 0.1) // 중간예납은 소득세만
  return { items, income, local, total: income + local }
}

export function calc(i: Input) {
  // 근로 기납부세액: 미입력 시 근로소득만으로 계산한 결정세액(연말정산 추정)
  const wageTax = !i.wage ? 0 : i.wageTax ?? core({ ...i, biz: false, other: false, fin: false, efiling: false }, false).determined
  const wageTaxEstimated = i.wage && i.wageTax == null

  const otherIncome = i.other ? Math.max(0, i.otherPay) - Math.floor(Math.max(0, i.otherPay) * Math.min(100, Math.max(0, i.otherExpenseRate)) / 100) : 0
  const mustInclude = otherIncome > OTHER_SEPARATE_LIMIT
  // 300만 이하: 분리과세(원천징수로 종결) vs 종합과세 중 총부담이 적은 쪽
  const run = (inc: boolean) => {
    const c = core(i, inc)
    const p = prepaidOf(i, c, wageTax)
    const sepTax = !inc && otherIncome > 0 ? floor10(otherIncome * OTHER_WH_RATE) + floor10(floor10(otherIncome * OTHER_WH_RATE) * 0.1) : 0
    return { c, p, burden: c.totalTax + sepTax, sepTax }
  }
  const inc = run(true)
  const sep = mustInclude || otherIncome === 0 ? null : run(false)
  const pick = sep && sep.burden < inc.burden ? sep : inc
  const { c, p } = pick

  const refundIncome = trunc10(p.income - c.determined)
  const refundLocal = trunc10(p.local - c.localTax)
  return {
    ...c,
    otherIncome, otherSeparated: pick === sep, otherSepTax: pick.sepTax, otherMustInclude: mustInclude,
    finSeparated: i.fin && c.finAmt > 0 && c.fin === 0,
    wageTax, wageTaxEstimated,
    prepaid: p,
    refundIncome, refundLocal, refund: refundIncome + refundLocal, // + 환급 / − 추가납부
    effRate: c.total > 0 ? (c.totalTax / c.total) * 100 : 0,       // 종합소득금액 대비 실효세율 (지방세 포함)
  }
}
export type Result = ReturnType<typeof calc>
