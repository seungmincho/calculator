// 연말정산(근로소득) 2026년 귀속 → 2027년 1~2월 정산. 회귀 체크: node scripts/check-year-end-tax.ts
// 금액 단위: 원(정수). 근거 조문은 각 함수 주석. 기준일 2026-10-04 (2025.12·2026.4.21 개정 소득세법, 2025.12 개정 조특법 반영).
// 미반영: 2026 세제개편안(2026.8.3 발표, 국회 심의 중 — 기본공제 소득요건 300만, 대중교통 추가공제 폐지, 출산·혼인공제 재정전환 등)
import { INSURANCE, PENSION_ANNUAL_CAP } from './insuranceRates.ts'

export const TAX_YEAR = 2026

// ── 소득세법 §47 근로소득공제 (한도 2천만) ──
export function earnedIncomeDeduction(salary: number): number {
  let d: number
  if (salary <= 5_000_000) d = salary * 0.7
  else if (salary <= 15_000_000) d = 3_500_000 + (salary - 5_000_000) * 0.4
  else if (salary <= 45_000_000) d = 7_500_000 + (salary - 15_000_000) * 0.15
  else if (salary <= 100_000_000) d = 12_000_000 + (salary - 45_000_000) * 0.05
  else d = 14_750_000 + (salary - 100_000_000) * 0.02
  return Math.floor(Math.min(d, 20_000_000))
}

// ── 소득세법 §55 기본세율 [상한, 세율, 누진공제] ──
export const BRACKETS: [number, number, number][] = [
  [14_000_000, 0.06, 0],
  [50_000_000, 0.15, 1_260_000],
  [88_000_000, 0.24, 5_760_000],
  [150_000_000, 0.35, 15_440_000],
  [300_000_000, 0.38, 19_940_000],
  [500_000_000, 0.4, 25_940_000],
  [1_000_000_000, 0.42, 35_940_000],
  [Infinity, 0.45, 65_940_000],
]
export const bracketOf = (base: number) => BRACKETS.find(([cap]) => base <= cap)!
export const progressiveTax = (base: number) => {
  if (base <= 0) return 0
  const [, r, d] = bracketOf(base)
  return Math.floor(base * r - d)
}

// ── 소득세법 §59 근로소득세액공제 (산출세액 130만 이하 55%, 초과 30%) + 총급여별 한도 ──
export function earnedIncomeCredit(tax: number, salary: number): number {
  const c = tax <= 1_300_000 ? tax * 0.55 : 715_000 + (tax - 1_300_000) * 0.3
  let cap: number
  if (salary <= 33_000_000) cap = 740_000
  else if (salary <= 70_000_000) cap = Math.max(660_000, 740_000 - (salary - 33_000_000) * 0.008)
  else if (salary <= 120_000_000) cap = Math.max(500_000, 660_000 - (salary - 70_000_000) / 2)
  else cap = Math.max(200_000, 500_000 - (salary - 120_000_000) / 2)
  return Math.floor(Math.min(c, cap))
}

// ── 소득세법 §59의2 자녀세액공제 + 출산·입양(첫째 30, 둘째 50, 셋째 이상 70).
//    대상 연령(2026.4.21 개정 부칙 §2): 2026 귀속 9세 이상이되 2017년생 제외 → 2016년 이전 출생 기본공제 자녀 ──
export const childCredit = (n: number) => (n <= 0 ? 0 : n === 1 ? 250_000 : 550_000 + (n - 2) * 400_000)
export const birthCredit = (order: number) => [0, 300_000, 500_000, 700_000][Math.min(3, Math.max(0, order))]

// ── 조특법 §126의2 신용카드 등 소득공제 (2026 귀속, 2028년까지 연장) ──
export const CARD_RATE = { credit: 0.15, debit: 0.3, culture: 0.3, market: 0.4, transport: 0.4 } as const
export interface CardSpend { credit: number; debit: number; culture: number; market: number; transport: number }

/** 기본한도: 7천만 이하 300만(+자녀 1명당 50만, 최대 100만) / 초과 250만(+25만, 최대 50만). 추가한도(전통시장·대중교통·문화체육): 300만 / 200만 */
export function cardLimits(salary: number, children: number) {
  const low = salary <= 70_000_000
  const k = Math.min(2, Math.max(0, children))
  return { basic: (low ? 3_000_000 : 2_500_000) + k * (low ? 500_000 : 250_000), extra: low ? 3_000_000 : 2_000_000 }
}

export function cardDeduction(salary: number, s: CardSpend, children = 0) {
  // 도서·공연·박물관·체육시설(문화) 30%는 총급여 7천만 이하만. 초과자는 신용카드 사용분으로 봄(결제수단별 차이 무시)
  const low = salary <= 70_000_000
  const credit = s.credit + (low ? 0 : s.culture)
  const culture = low ? s.culture : 0
  const threshold = Math.floor(salary * 0.25)
  const spent = credit + s.debit + culture + s.market + s.transport
  // 최저사용금액(총급여 25%)은 공제율 낮은 것부터 차감 (조특령 §121의2: 신용 → 체크·현금·문화 → 전통시장·대중교통)
  let left = threshold
  const take = (v: number) => { const x = Math.min(v, left); left -= x; return v - x }
  const cr = take(credit)
  const lowRate = s.debit + culture
  const lr = take(lowRate)
  const dr = lowRate ? Math.round(lr * (s.debit / lowRate)) : 0
  const cu = lr - dr
  const hiRate = s.market + s.transport
  const hr = take(hiRate)
  const mk = hiRate ? Math.round(hr * (s.market / hiRate)) : 0
  const tr = hr - mk
  const parts = {
    credit: Math.floor(cr * CARD_RATE.credit),
    debit: Math.floor(dr * CARD_RATE.debit),
    culture: Math.floor(cu * CARD_RATE.culture),
    market: Math.floor(mk * CARD_RATE.market),
    transport: Math.floor(tr * CARD_RATE.transport),
  }
  const gross = parts.credit + parts.debit + parts.culture + parts.market + parts.transport
  const lim = cardLimits(salary, children)
  const basic = Math.min(gross, lim.basic)
  const extra = Math.min(gross - basic, lim.extra, parts.market + parts.transport + parts.culture)
  return { threshold, spent, shortfall: cardThresholdGap(salary, spent), parts, gross, limits: lim, basic, extra, total: basic + extra }
}

/** 총급여 25%(최저사용금액)까지 더 써야 하는 금액. 0 = 이미 넘김 */
export const cardThresholdGap = (salary: number, spent: number) => Math.max(0, Math.floor(salary * 0.25) - spent)

// ── 미리보기: 1~9월 실적 → 연간 추정 (국세청 연말정산 미리보기도 1~9월 카드 사용액 기준) ──
export const PREVIEW_MONTHS = 9
export const CARD_KEYS: (keyof CardSpend)[] = ['credit', 'debit', 'transport', 'market', 'culture']
/** months개월 실적 → 12개월 환산 (반올림) */
export const annualize = (amount: number, months = PREVIEW_MONTHS) => (months > 0 ? Math.round((amount * 12) / months) : 0)
/** 1~9월 실적 + 10~12월 예상(생략 시 같은 속도로 ×12/9) → 연간 사용액 */
export function annualSpend(ytd: CardSpend, q4?: CardSpend | null): CardSpend {
  const out = { ...ytd }
  for (const k of CARD_KEYS) out[k] = q4 ? ytd[k] + q4[k] : annualize(ytd[k])
  return out
}

// ── 조특법 §87 주택청약종합저축(총급여 7천만 이하 무주택 세대주, 납입 300만 한도 × 40%)
//    + 소득세법 §52④ 주택임차차입금 원리금 40% — 두 항목 합산 400만 한도 ──
export function housingDeduction(salary: number, subscription: number, leaseLoan: number) {
  const sub = salary <= 70_000_000 ? Math.floor(Math.min(subscription, 3_000_000) * 0.4) : 0
  const lease = Math.floor(leaseLoan * 0.4)
  return Math.min(sub + lease, 4_000_000)
}

// ── 소득세법 §59의3 연금계좌: 연금저축 600만, IRP 합산 900만. 총급여 5,500만 이하 15%, 초과 12% ──
export const pensionRate = (salary: number) => (salary <= 55_000_000 ? 0.15 : 0.12)
export function pensionCredit(salary: number, savings: number, irp: number) {
  const base = Math.min(Math.min(savings, 6_000_000) + irp, 9_000_000)
  return Math.floor(base * pensionRate(salary))
}

// ── 소득세법 §59의4① 보장성보험 12% (100만 한도) ──
export const insuranceCredit = (premium: number) => Math.floor(Math.min(premium, 1_000_000) * 0.12)

// ── 소득세법 §59의4② 의료비: 총급여 3% 초과분 15% (일반 부양가족 700만 한도, 미숙아·선천성이상아 20%, 난임 30%).
//    3% 문턱은 일반 → 본인 등 → 미숙아 → 난임 순으로 차감 ──
export interface Medical { special: number; general: number; premature: number; infertility: number }
export function medicalCredit(salary: number, m: Medical) {
  let deficit = Math.floor(salary * 0.03)
  const cut = (v: number) => { const x = Math.min(v, deficit); deficit -= x; return v - x }
  const g = Math.min(cut(m.general), 7_000_000)
  const s = cut(m.special)
  const p = cut(m.premature)
  const i = cut(m.infertility)
  return Math.floor(g * 0.15 + s * 0.15 + p * 0.2 + i * 0.3)
}

// ── 소득세법 §59의4③ 교육비 15%: 본인 무제한, 유치원·초중고 1인당 300만, 대학생 1인당 900만 ──
export function educationCredit(self: number, school: number, univ: number, kids: number) {
  const k = Math.max(1, kids)
  return Math.floor((self + Math.min(school, 3_000_000 * k) + Math.min(univ, 9_000_000 * k)) * 0.15)
}

// ── 소득세법 §59의4④ 기부금 15% (1천만 초과분 30%), 일반기부금 한도 근로소득금액의 30% ──
export function donationCredit(amount: number, earnedIncome: number) {
  const a = Math.min(amount, Math.floor(earnedIncome * 0.3))
  return Math.floor(Math.min(a, 10_000_000) * 0.15 + Math.max(0, a - 10_000_000) * 0.3)
}

// ── 조특법 §58① (2025.12.23 개정, 2026 기부분~) 고향사랑기부금 연 2,000만 한도: 10만 이하 100/110, 10만 초과~20만 40%,
//    20만 초과 15% (특별재난지역 기부 30%는 미반영. 현행 조문에 '1천만 초과 30%' 구간 없음) ──
export function hometownCredit(amount: number) {
  const a = Math.min(amount, 20_000_000)
  const t1 = Math.min(a, 100_000)
  const t2 = Math.min(Math.max(a - 100_000, 0), 100_000)
  const rest = Math.max(a - 200_000, 0)
  return Math.floor(t1 * 100 / 110 + t2 * 0.4 + rest * 0.15)
}

// ── 조특법 §95의2 월세: 총급여 8천만 이하 무주택, 연 1,000만 한도, 5,500만 이하 17% / 초과 15% ──
export function rentCredit(salary: number, rent: number) {
  if (salary > 80_000_000) return 0
  return Math.floor(Math.min(rent, 10_000_000) * (salary <= 55_000_000 ? 0.17 : 0.15))
}

// ── 조특법 §92 결혼세액공제: 2024.1.1~2026.12.31 혼인신고, 1인 50만(생애 1회) ──
export const MARRIAGE_CREDIT = 500_000
// ── 소득세법 §59의4⑨ 표준세액공제 (특별소득·특별세액·월세 공제를 신청하지 않을 때) ──
export const STANDARD_CREDIT = 130_000
// ── 조특법 §30 중소기업 취업자 소득세 감면: 청년 90%, 연 200만 한도 ──
export const SME_RATE = 0.9
export const SME_CAP = 2_000_000

/** 4대보험 근로자 부담분 자동 추정 (insuranceRates.ts 2026 요율, 총급여 = 보수월액 × 12 가정) */
export function autoInsurance(salary: number) {
  const pension = Math.floor(Math.min(salary, PENSION_ANNUAL_CAP) * INSURANCE.pensionRate)
  const health = Math.floor(salary * INSURANCE.healthRate)
  const care = Math.floor(health * INSURANCE.longTermCareRate)
  const emp = Math.floor(salary * INSURANCE.employmentRate)
  return { pension, healthEmp: health + care + emp }
}

export interface YetInput extends CardSpend, Medical {
  salary: number
  spouse: boolean
  children: number        // 기본공제 자녀 (나이 무관)
  kidsUnder8: number      // 그중 자녀세액공제 제외 자녀 (2026 귀속: 2017년 이후 출생). 필드명은 URL 호환용
  others: number          // 부모 등 기타 부양가족
  elderly: number         // 70세 이상 (경로우대 +100만)
  disabled: number        // 장애인 (+200만)
  birth: number           // 올해 출산·입양: 0 없음, 1 첫째, 2 둘째, 3 셋째 이상
  pension?: number        // 국민연금 납부액 (생략 = 자동)
  healthEmp?: number      // 건강·장기요양·고용보험 (생략 = 자동)
  housingSub: number
  leaseLoan: number
  pensionSavings: number
  irp: number
  insurance: number
  eduSelf: number
  eduSchool: number
  eduUniv: number
  donation: number
  hometown: number
  rent: number
  marriage: boolean
  sme: boolean
  prepaid: number         // 기납부 소득세 (지방소득세 제외)
}

export const DEFAULT_INPUT: YetInput = {
  salary: 50_000_000, spouse: false, children: 0, kidsUnder8: 0, others: 0, elderly: 0, disabled: 0, birth: 0,
  housingSub: 0, leaseLoan: 0,
  credit: 10_000_000, debit: 5_000_000, culture: 0, market: 0, transport: 600_000,
  pensionSavings: 0, irp: 0, insurance: 0,
  special: 0, general: 0, premature: 0, infertility: 0,
  eduSelf: 0, eduSchool: 0, eduUniv: 0, donation: 0, hometown: 0, rent: 0,
  marriage: false, sme: false, prepaid: 0,
}

export function calc(x: YetInput) {
  const salary = Math.max(0, x.salary)
  const eid = earnedIncomeDeduction(salary)
  const earnedIncome = salary - eid
  const heads = 1 + (x.spouse ? 1 : 0) + x.children + x.others
  const personal = heads * 1_500_000 + x.elderly * 1_000_000 + x.disabled * 2_000_000
  const auto = autoInsurance(salary)
  const pension = x.pension ?? auto.pension
  const healthEmp = x.healthEmp ?? auto.healthEmp
  const housing = housingDeduction(salary, x.housingSub, x.leaseLoan)
  const card = cardDeduction(salary, x, x.children)
  const kids8 = Math.max(0, x.children - x.kidsUnder8)

  const cr = {
    child: childCredit(kids8) + birthCredit(x.birth),
    pension: pensionCredit(salary, x.pensionSavings, x.irp),
    insurance: insuranceCredit(x.insurance),
    medical: medicalCredit(salary, x),
    education: educationCredit(x.eduSelf, x.eduSchool, x.eduUniv, x.children),
    donation: donationCredit(x.donation, earnedIncome),
    hometown: hometownCredit(x.hometown),
    rent: rentCredit(salary, x.rent),
    marriage: x.marriage ? MARRIAGE_CREDIT : 0,
  }

  // 특별공제 방식 vs 표준세액공제 방식 중 결정세액이 적은 쪽
  const path = (special: boolean) => {
    const deductions = personal + pension + card.total + (special ? healthEmp + housing : 0)
    const taxBase = Math.max(0, earnedIncome - deductions)
    const computedTax = progressiveTax(taxBase)
    const reduction = x.sme ? Math.min(Math.floor(computedTax * SME_RATE), SME_CAP) : 0
    // 감면 시 근로소득세액공제 × (1 − 감면세액/산출세액) — 소득세법 §59①, 조특령 준용
    const ratio = computedTax ? reduction / computedTax : 0
    const earned = Math.floor(earnedIncomeCredit(computedTax, salary) * (1 - ratio))
    const common = cr.child + cr.pension + cr.hometown + cr.marriage
    const extra = special ? cr.insurance + cr.medical + cr.education + cr.donation + cr.rent : STANDARD_CREDIT
    const credits = { earned, common, extra, total: earned + common + extra }
    const determined = Math.max(0, computedTax - reduction - credits.total)
    return { deductions, taxBase, computedTax, rate: bracketOf(Math.max(taxBase, 1))[1], reduction, credits, determined }
  }
  const sp = path(true)
  const st = path(false)
  const standard = st.determined < sp.determined
  const p = standard ? st : sp

  const localTax = Math.floor(p.determined * 0.1)
  const prepaid = Math.max(0, x.prepaid)
  const prepaidLocal = Math.floor(prepaid * 0.1)
  // 차감징수세액: 10원 미만 절사 (국고금관리법 §47)
  const trunc10 = (n: number) => Math.trunc(n / 10) * 10
  const refundIncome = trunc10(prepaid - p.determined)
  const refundLocal = trunc10(prepaidLocal - localTax)

  return {
    salary, eid, earnedIncome, heads, personal, pension, healthEmp, housing, card, kids8, cr,
    ...p, standard, special: sp, std: st,
    localTax, prepaid, prepaidLocal, totalTax: p.determined + localTax,
    refund: refundIncome + refundLocal,
  }
}
export type YetResult = ReturnType<typeof calc>

// ── "이렇게 하면 더 돌려받아요" 시나리오: 한 가지씩 바꿔 재계산한 추가 환급액 ──
export type TipId = 'pension100' | 'pensionMax' | 'debit' | 'hometown' | 'housingSub' | 'rent'
export interface Tip { id: TipId; amount: number; gain: number }

// 연금계좌 남은 한도(연금저축 600 + IRP 합산 900만)와 amt만큼 더 넣을 때의 입력 (연금저축 먼저 채움)
const pensionRoom = (x: YetInput) => Math.max(0, 9_000_000 - Math.min(x.pensionSavings, 6_000_000) - x.irp)
function pensionPatch(x: YetInput, amt: number): Partial<YetInput> {
  const toPs = Math.min(amt, Math.max(0, 6_000_000 - x.pensionSavings))
  return { pensionSavings: x.pensionSavings + toPs, irp: x.irp + amt - toPs }
}
/** 12월 31일까지 연금저축·IRP 남은 한도를 채우면 늘어나는 환급액 (지방소득세 포함) */
export function pensionTopUp(x: YetInput) {
  const room = pensionRoom(x)
  return { room, gain: room ? calc({ ...x, ...pensionPatch(x, room) }).refund - calc(x).refund : 0 }
}

// ── 10~12월 카드 전략: 남은 신용카드 사용분(q4Credit)을 체크카드·현금영수증(30%)으로 돌렸을 때 환급 차이.
//    short = 연말까지 써도 25% 문턱 미달(공제 0) / switch = 바꾸면 이득 / maxed = 기본한도 소진·결정세액 0 /
//    balanced = 신용카드가 전부 문턱 안이라 바꿔도 같음 ──
export type CardAdvice = 'short' | 'switch' | 'maxed' | 'balanced'
export function q4Strategy(x: YetInput, q4Credit: number) {
  const base = calc(x)
  const moved = Math.min(Math.max(0, q4Credit), x.credit)
  const gain = calc({ ...x, credit: x.credit - moved, debit: x.debit + moved }).refund - base.refund
  const gap = cardThresholdGap(base.salary, base.card.spent)
  const kind: CardAdvice = gap > 0 ? 'short' : gain > 0 ? 'switch'
    : base.determined === 0 || base.card.basic >= base.card.limits.basic ? 'maxed' : 'balanced'
  return { kind, gap, moved, gain }
}

/** 카드 공제로 줄어드는 세금(지방소득세 포함) — /card-deduction용. 연봉·자녀 외 다른 공제는 없다고 본 근사 */
export function cardTaxSaving(salary: number, s: CardSpend, children = 0) {
  const x = { ...DEFAULT_INPUT, salary, children, ...s }
  return calc({ ...x, credit: 0, debit: 0, culture: 0, market: 0, transport: 0 }).totalTax - calc(x).totalTax
}

/** 항목(item)을 넣었을 때 줄어드는 세금(지방소득세 포함) — 세액공제 랜딩 페이지용.
 *  base = 연봉 등 기본 상황(카드 사용 0에서 시작). 결정세액 한도·표준세액공제(13만원) 선택이 반영돼 '실제로' 줄어드는 금액 */
export function itemTaxSaving(base: Partial<YetInput>, item: Partial<YetInput>) {
  const x: YetInput = { ...DEFAULT_INPUT, credit: 0, debit: 0, culture: 0, market: 0, transport: 0, ...base }
  const before = calc(x)
  const after = calc({ ...x, ...item })
  return { before, after, saving: before.totalTax - after.totalTax }
}

// 할 일 마감 (KST 날짜). 간소화 서비스는 매년 1월 15일 국세청 홈택스 오픈
export const DEADLINE = { yearEnd: `${TAX_YEAR}-12-31`, simplified: `${TAX_YEAR + 1}-01-15` }

export function tips(x: YetInput): Tip[] {
  const base = calc(x).refund
  const out: Tip[] = []
  const add = (id: TipId, amount: number, patch: Partial<YetInput>) => {
    if (amount <= 0) return
    out.push({ id, amount, gain: calc({ ...x, ...patch }).refund - base })
  }
  const room = pensionRoom(x)
  add('pension100', Math.min(1_000_000, room), pensionPatch(x, Math.min(1_000_000, room)))
  if (room > 1_000_000) add('pensionMax', room, pensionPatch(x, room))
  const mv = Math.min(x.credit, 5_000_000)
  add('debit', mv, { credit: x.credit - mv, debit: x.debit + mv })
  add('hometown', Math.max(0, 100_000 - x.hometown), { hometown: Math.max(x.hometown, 100_000) })
  if (x.salary <= 70_000_000) add('housingSub', Math.max(0, 3_000_000 - x.housingSub), { housingSub: Math.max(x.housingSub, 3_000_000) })
  if (x.rent === 0 && x.salary <= 80_000_000) add('rent', 6_000_000, { rent: 6_000_000 })
  return out.sort((a, b) => b.gain - a.gain)
}
