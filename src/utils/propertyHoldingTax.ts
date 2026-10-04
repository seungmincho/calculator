// 주택 보유세(재산세 + 종합부동산세) — 2026년 귀속(과세기준일 2026-06-01) 현행법 기준.
// 2026 세제개편안(공정시장가액비율 70%·실거주 공제 등)은 2027년 귀속부터라 반영하지 않음.
//
// 재산세 (지방세법 제110~112조, 시행령 제109조)
//  - 과세표준 = 공시가격 × 공정시장가액비율: 일반 60%, 1세대1주택 공시 3억↓43% · 6억↓44% · 6억 초과 45% (2026년분)
//  - 표준세율 0.1/0.15/0.25/0.4%, 1세대1주택(공시 9억 이하) 특례세율 0.05/0.1/0.2/0.35%
//  - 도시지역분 과세표준 × 0.14%, 지방교육세 재산세 × 20%
//  - 미반영: 과세표준상한제(전년 과표 +5%)·세부담상한, 지역자원시설세(건축물 시가표준액 기준) → 실제 고지액은 이보다 적을 수 있음
// 종합부동산세 (종부세법 제8~10조의2, 시행령 제4조의3)
//  - 과세표준 = (공시가격 합 − 9억, 1세대1주택 12억) × 60%
//  - 세율: 2주택 이하 0.5~2.7%, 3주택 이상은 과표 12억 초과 구간 2.0~5.0%
//  - 공제할 재산세 = 부과 재산세 × (종부세 과표 × 재산세 공정시장가액비율 × 0.4%) / 합산 공시가로 계산한 재산세 표준세율 상당액
//    (1세대1주택은 재산세에 실제 적용된 43~45% 비율을 사용 — 시행령 제109조제1항제2호 단서 포함으로 해석, 확인 필요)
//  - 1세대1주택 세액공제: 고령자 60세 20%·65세 30%·70세 40% + 장기보유 5년 20%·10년 40%·15년 50%, 합산 최대 80%
//  - 세부담 상한: (재산세 + 종부세)가 직전연도 총세액상당액의 150% 초과분은 종부세에서 뺌 (개인 공통)
//  - 농어촌특별세 = 종부세 × 20%
// 끝수: 지방세 10원 미만, 국세 1원 미만 버림.
// 일정 (2026-10-04 확인)
//  - 종부세법 제16조①: 12월 1~15일 부과·징수. 제20조·시행령 제16조: 분납 = 납부기한이 지난 날부터 6개월 이내(신청은 납부기한까지)
//  - 제20조의2: 1세대1주택 고령자·장기보유자 납부유예 신청 = 납부기한 만료 3일 전까지
//  - 제8조③④·제10조의2: 합산배제·1세대1주택 특례·공동명의 특례 신청 9월 16~30일
//  - 국세기본법 제5조: 기한이 토·일·공휴일(근로자의 날 포함)이면 다음 날
//  - 일시적 2주택 처분기한: 종부세 시행령 제4조의2 3년, 2026.10.1 개정으로 종전·신규 모두 조정대상지역 + 신규 2026.8.4 이후 취득 → 2년
//    (2027년 6월 1일 과세기준일분부터, 2026.8.3까지 계약·계약금 지급분은 3년 — 재정경제부 2026-09-29 국무회의 의결)

import { getKoreanHolidays } from './koreanHolidays.ts'
import { addDays, addMonths, addYears, addBusinessDays } from './dday.ts'
import { tempPeriod } from './capitalGainsTax.ts'

const EOK = 100_000_000
type Bracket = [upTo: number, rate: number]

const PROP_STD: Bracket[] = [[0.6 * EOK, 0.001], [1.5 * EOK, 0.0015], [3 * EOK, 0.0025], [Infinity, 0.004]]
const PROP_ONE: Bracket[] = [[0.6 * EOK, 0.0005], [1.5 * EOK, 0.001], [3 * EOK, 0.002], [Infinity, 0.0035]]
export const JONGBU_GENERAL: Bracket[] = [[3 * EOK, 0.005], [6 * EOK, 0.007], [12 * EOK, 0.01], [25 * EOK, 0.013], [50 * EOK, 0.015], [94 * EOK, 0.02], [Infinity, 0.027]]
export const JONGBU_HEAVY: Bracket[] = [[3 * EOK, 0.005], [6 * EOK, 0.007], [12 * EOK, 0.01], [25 * EOK, 0.02], [50 * EOK, 0.03], [94 * EOK, 0.04], [Infinity, 0.05]]

export const URBAN_RATE = 0.0014
export const EDU_RATE = 0.2
export const NONG_RATE = 0.2
export const JONGBU_FMV = 0.6
export const CAP_RATE = 1.5
export const DEDUCT_GENERAL = 9 * EOK
export const DEDUCT_ONE = 12 * EOK
export const SPLIT_JONGBU = 2_500_000 // 종부세법 제20조·시행령 제16조: 본세 250만원 초과분(500만원 초과 시 50%) 분납 (농특세 포함 300만원 초과와 같음)
export const PROP_JULY_ONLY = 200_000 // 재산세 20만원 이하 → 7월 한 번에 (조례)

export function progressive(base: number, table: Bracket[]): number {
  let tax = 0, prev = 0
  for (const [upTo, rate] of table) {
    if (base <= prev) break
    tax += (Math.min(base, upTo) - prev) * rate
    prev = upTo
  }
  return tax
}
const floor10 = (v: number) => Math.floor(v / 10) * 10

/** 재산세 공정시장가액비율 */
export function propRatio(price: number, oneHouse: boolean): number {
  if (!oneHouse) return 0.6
  return price <= 3 * EOK ? 0.43 : price <= 6 * EOK ? 0.44 : 0.45
}

export interface PropertyTax { price: number; ratio: number; base: number; special: boolean; main: number; urban: number; edu: number; total: number }

/** 주택 1채 재산세 (상한 미반영) */
export function propertyTax(price: number, oneHouse: boolean, urban = true): PropertyTax {
  const ratio = propRatio(price, oneHouse)
  const base = price * ratio
  const special = oneHouse && price <= 9 * EOK
  const main = floor10(progressive(base, special ? PROP_ONE : PROP_STD))
  const urb = urban ? floor10(base * URBAN_RATE) : 0
  const edu = floor10(main * EDU_RATE)
  return { price, ratio, base, special, main, urban: urb, edu, total: main + urb + edu }
}

export function creditRate(age: number, years: number): { elderly: number; holding: number; total: number } {
  const elderly = age >= 70 ? 0.4 : age >= 65 ? 0.3 : age >= 60 ? 0.2 : 0
  const holding = years >= 15 ? 0.5 : years >= 10 ? 0.4 : years >= 5 ? 0.2 : 0
  return { elderly, holding, total: Math.min(0.8, elderly + holding) }
}

export interface JongbuInput {
  /** 이 납세자 몫 공시가격 합 (지분 반영) */
  total: number
  /** 이 납세자에게 부과된 주택분 재산세 본세 합 */
  levied: number
  /** 재산세 공정시장가액비율 (재산세 공제 산식용) */
  ratio: number
  deduction: number
  heavy: boolean
  credit: number
  /** 직전연도 재산세+종부세 (0 = 상한 미적용) */
  prevTotal?: number
}
export interface Jongbu {
  base: number; gross: number; propDeduct: number; afterProp: number; credit: number
  capCut: number; tax: number; nong: number; total: number
}

export function jongbu(i: JongbuInput): Jongbu {
  const base = Math.max(0, i.total - i.deduction) * JONGBU_FMV
  if (base <= 0) return { base: 0, gross: 0, propDeduct: 0, afterProp: 0, credit: 0, capCut: 0, tax: 0, nong: 0, total: 0 }
  const gross = progressive(base, i.heavy ? JONGBU_HEAVY : JONGBU_GENERAL)
  const den = progressive(i.total * i.ratio, PROP_STD)
  const propDeduct = Math.min(gross, den > 0 ? i.levied * (base * i.ratio * 0.004) / den : 0)
  const afterProp = gross - propDeduct
  const credit = afterProp * i.credit
  let tax = afterProp - credit
  let capCut = 0
  if (i.prevTotal && i.prevTotal > 0) {
    const over = i.levied + tax - i.prevTotal * CAP_RATE
    if (over > 0) { capCut = Math.min(tax, over); tax -= capCut }
  }
  tax = Math.floor(tax)
  const nong = Math.floor(tax * NONG_RATE)
  return { base, gross, propDeduct, afterProp, credit, capCut, tax, nong, total: tax + nong }
}

export interface HoldingInput {
  prices: number[]
  /** 1세대1주택 (주택이 1채일 때만 의미) */
  oneHouse: boolean
  age: number
  years: number
  /** 부부 공동명의 (1채일 때) */
  joint: boolean
  /** 공동명의일 때 본인 지분 % (1~99) */
  share: number
  urban: boolean
  prevTotal: number
}

export type JointMode = 'single' | 'jointEach' | 'jointSpecial'

export interface Holding {
  houses: PropertyTax[]
  property: { main: number; urban: number; edu: number; total: number }
  jongbu: Jongbu
  /** 부부 공동명의일 때 각자 9억 공제 방식(두 사람 합) vs 1주택자 특례 */
  jointEach?: Jongbu
  jointSpecial?: Jongbu
  mode: JointMode
  oneHouse: boolean
  heavy: boolean
  deduction: number
  credit: ReturnType<typeof creditRate>
  total: number
  schedule: { july: number; september: number; december: number; split: number }
}

const sumJ = (a: Jongbu, b: Jongbu): Jongbu => {
  const r = {} as Jongbu
  for (const k of Object.keys(a) as (keyof Jongbu)[]) r[k] = a[k] + b[k]
  return r
}

/** 종부세 본세 분납 가능액 (6개월 뒤 납부 가능분). 농특세도 같은 비율로 나눠 낸다 */
export function splitAmount(tax: number): number {
  if (tax <= SPLIT_JONGBU) return 0
  return tax <= 2 * SPLIT_JONGBU ? tax - SPLIT_JONGBU : Math.floor(tax / 2)
}

export function holdingTax(i: HoldingInput): Holding {
  const prices = i.prices.filter((p) => p > 0)
  const single = prices.length === 1
  const oneHouse = single && i.oneHouse
  const heavy = prices.length >= 3
  const houses = prices.map((p) => propertyTax(p, oneHouse, i.urban))
  const property = houses.reduce((s, h) => ({ main: s.main + h.main, urban: s.urban + h.urban, edu: s.edu + h.edu, total: s.total + h.total }), { main: 0, urban: 0, edu: 0, total: 0 })
  const totalPrice = prices.reduce((s, p) => s + p, 0)
  const ratio = houses[0]?.ratio ?? 0.6
  const credit = oneHouse ? creditRate(i.age, i.years) : { elderly: 0, holding: 0, total: 0 }
  const deduction = oneHouse ? DEDUCT_ONE : DEDUCT_GENERAL
  const prev = i.prevTotal > 0 ? i.prevTotal : 0

  // 단독명의 (또는 공동명의 1주택자 특례 = 지분 큰 사람이 단독처럼)
  const solo = jongbu({ total: totalPrice, levied: property.main, ratio, deduction, heavy, credit: credit.total, prevTotal: prev })
  let jb = solo
  let mode: JointMode = 'single'
  let jointEach: Jongbu | undefined
  let jointSpecial: Jongbu | undefined
  if (single && i.joint) {
    // ponytail: 공동명의 각자 계산 시 세부담 상한은 생략 (사람별 전년 세액을 따로 받아야 함)
    const s = Math.min(99, Math.max(1, i.share)) / 100
    const one = (sh: number) => jongbu({ total: totalPrice * sh, levied: property.main * sh, ratio, deduction: DEDUCT_GENERAL, heavy: false, credit: 0 })
    jointEach = sumJ(one(s), one(1 - s))
    jointSpecial = oneHouse ? solo : undefined
    if (!jointSpecial || jointEach.total <= jointSpecial.total) { jb = jointEach; mode = 'jointEach' } else { jb = jointSpecial; mode = 'jointSpecial' }
  }

  const julyOnly = property.main + property.urban <= PROP_JULY_ONLY
  const july = julyOnly ? property.total : Math.ceil(property.total / 2)
  return {
    houses, property, jongbu: jb, jointEach, jointSpecial, mode, oneHouse, heavy, deduction, credit,
    total: property.total + jb.total,
    schedule: { july, september: property.total - july, december: jb.total, split: splitAmount(jb.tax) },
  }
}

// ── 일정 ('YYYY-MM-DD' 문자열, 날짜 계산은 dday.ts) ──
export const TAX_YEAR = 2026
/** 국세기본법 제5조: 기한이 토·일·공휴일이면 그다음 영업일 (= 전날부터 영업일 1일 뒤) */
export const nextBusinessDay = (s: string) => addBusinessDays(addDays(s, -1), 1, getKoreanHolidays)

export interface JongbuDates { due: string; deferral: string; split: string; specialFrom: string; specialTo: string }
/** year 귀속 종부세 일정. ponytail: 분납 기한은 법정 12/15 기준 (납부기한이 밀린 해의 하루 차이는 무시) */
export function jongbuDates(year = TAX_YEAR): JongbuDates {
  const due = nextBusinessDay(`${year}-12-15`)
  return {
    due,
    deferral: nextBusinessDay(addDays(due, -3)),
    split: nextBusinessDay(addMonths(`${year}-12-15`, 6)),
    specialFrom: `${year}-09-16`,
    specialTo: nextBusinessDay(`${year}-09-30`),
  }
}

// ── 일시적 2주택 처분기한 (신규 주택 취득일부터 N년 되는 날까지) ──
export type TempTax = 'jongbu' | 'capitalGains' | 'acquisition'
export interface TempDeadline { tax: TempTax; years: number; date: string; verified: boolean }
export function tempDeadlines(newAcq: string, bothAdjusted: boolean): TempDeadline[] {
  const row = (tax: TempTax, years: number, verified = true) => ({ tax, years, date: addYears(newAcq, years), verified })
  return [
    row('jongbu', bothAdjusted && newAcq >= '2026-08-04' ? 2 : 3),
    // 양도세는 capitalGainsTax.ts가 단일 출처 (양도일은 앞으로 = 2026.10.1 이후로 봄)
    row('capitalGains', tempPeriod({ adjusted: bothAdjusted, newAdjusted: bothAdjusted, newAcqDate: newAcq, saleDate: '9999-12-31' })),
    // 지방세법 시행령 제28조의5 개정(행안부 2026 지방세제 개편: 2026.10.1 이후 취득분, 8.26까지 계약분 3년) — 공포 원문 미확인 → 참고
    row('acquisition', bothAdjusted && newAcq >= '2026-10-01' ? 2 : 3, false),
  ]
}

// ── 고지서 대조 (새 세금 계산 없음: 고지서 금액 − 이 계산기 추정) ──
export interface Bill { jongbu: number; nong: number; total: number; july: number; september: number }
export type BillKey = 'jongbu' | 'nong' | 'total' | 'property'
export interface BillRow { key: BillKey; bill: number; est: number; diff: number }
export type BillReason = 'price' | 'cap' | 'exclude' | 'joint' | 'oneHouse' | 'credit' | 'propDeduct' | 'land' | 'propCap' | 'propExtra'
/** 끝수 처리 차이로 보는 범위 */
export const BILL_TOLERANCE = 1_000

export function compareBill(b: Bill, h: Holding): { rows: BillRow[]; reasons: BillReason[] } {
  const prop = b.july + b.september
  const rows = ([
    ['jongbu', b.jongbu, h.jongbu.tax], ['nong', b.nong, h.jongbu.nong], ['total', b.total, h.jongbu.total], ['property', prop, h.property.total],
  ] as const).filter(([, bill]) => bill > 0).map(([key, bill, est]) => ({ key, bill, est, diff: bill - est }))
  const jb = rows.filter((r) => r.key !== 'property')
  const over = jb.some((r) => r.diff > BILL_TOLERANCE)
  const under = jb.some((r) => r.diff < -BILL_TOLERANCE)
  const p = rows.find((r) => r.key === 'property')
  const reasons: BillReason[] = []
  const add = (on: boolean, k: BillReason) => { if (on) reasons.push(k) }
  add(over || under || Math.abs(p?.diff ?? 0) > BILL_TOLERANCE, 'price')
  add(under && h.jongbu.capCut === 0, 'cap')
  add(under && h.houses.length > 1, 'exclude')
  add((over || under) && h.mode !== 'single', 'joint')
  add((over && h.oneHouse) || (under && !h.oneHouse && h.houses.length === 1), 'oneHouse')
  add((over || under) && h.oneHouse, 'credit')
  add(over, 'propDeduct')
  add(over, 'land')
  add(!!p && p.diff < -BILL_TOLERANCE, 'propCap')
  add(!!p && p.diff > BILL_TOLERANCE, 'propExtra')
  return { rows, reasons }
}
