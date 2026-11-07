// 근로장려금·자녀장려금 예상액 — 2025·2026년 소득분(2026·2027년 신청). 회귀 체크: node scripts/check-eitc.ts
// 금액 단위: 원(연간). 모든 숫자는 아래 원문에서 2026-11-07 확인.
//  [법] 조세특례제한법(시행 2026-09-18, 근로장려세제 조문 최종 개정 2024-12-31) https://www.law.go.kr/법령/조세특례제한법
//       제100조의3(총소득기준금액 표·재산 2억4천만원 미만·⑤ 단독/홑벌이/맞벌이 정의·배우자 총급여액 등 3백만원)
//       제100조의5(①산정식 ②반기 35% ④재산 1억7천만원 이상 50% ⑤산정표 우선) 제100조의6(⑦반기 9/1~15·3/1~15 ⑧기한 후 6개월)
//       제100조의7(②기한 후 95% ③1만5천원 미만 0원, 점증 구간 10만원·점감 구간 3만원 보장)
//       제100조의28(자녀: 총소득 7천만원 미만) 제100조의29(자녀 산정식) 제100조의30(②자녀세액공제와 중복 적용 불가)
//       제100조의31(①근로장려금 규정 준용 — 재산 50%·기한 후 95% 포함, ②감액 후 3만원 미만이면 3만원)
//  [령] 같은 법 시행령(시행 2026-09-18) https://www.law.go.kr/법령/조세특례제한법시행령
//       제100조의3(연간 총소득·업종별 조정률) 제100조의4(재산 범위·6월 1일 기준) 제100조의6②(총급여액 등에서 빼는 소득)
//       제100조의9④(반기 상반기분 15만원 미만은 정산 때) 제100조의31②(자녀세액공제액 차감)
//       별표 11 근로장려금 산정표(개정 2025-02-28) · 별표 11의2 자녀장려금 산정표(개정 2024-02-29)
//  2026 세제개편안(2026-08-03, 국회 심의 중)은 2027년 1월 1일 이후 소득분부터라 이 파일에 넣지 않았다.

export const INCOME_YEARS = [2025, 2026] as const // 같은 법령이 적용되는 소득 연도

export type Household = 'single' | 'one' | 'two' // 단독 · 홑벌이 · 맞벌이
export type Method = 'regular' | 'late' | 'half' // 정기(5월) · 기한 후 · 반기
export type Phase = 'rising' | 'flat' | 'falling'

/** [법 제100조의3①2 표·제100조의5①] 총소득기준금액(미만), 최대액, 점증 구간 끝(up), 평탄 구간 끝(flatEnd).
 *  점감 = max − (x − flatEnd) × max ÷ (limit − flatEnd) — 1천300·1천800·2천700분의 금액이 각각 limit − flatEnd 와 같다.
 *  tail = 별표 11이 점감 끝에서 따로 나눈 경계(산정액 3만원·1만5천원이 되는 지점). 단독의 3만원 경계는 표에 21,770,000원으로 적혀 있다. */
export const EITC = {
  single: { limit: 22_000_000, max: 1_650_000, up: 4_000_000, flatEnd: 9_000_000, tail: [21_770_000, 21_881_900] },
  one: { limit: 32_000_000, max: 2_850_000, up: 7_000_000, flatEnd: 14_000_000, tail: [31_810_600, 31_905_300] },
  two: { limit: 44_000_000, max: 3_300_000, up: 8_000_000, flatEnd: 17_000_000, tail: [43_754_600, 43_877_300] },
} as const

/** [별표 11·11의2] 첫 행이 40,000원부터라 그 미만은 장려금이 없다 */
export const TABLE_START = 40_000
/** [법 제100조의3⑤3] 맞벌이 = 부부 각각 총급여액 등 3백만원 이상 → 별표 11 맞벌이 열은 합산 600만원 미만이 '해당 없음' */
export const SPOUSE_MIN = 3_000_000
export const TWO_MIN = SPOUSE_MIN * 2
/** [법 제100조의3①4·제100조의5④] 가구원 재산 합계: cap 이상이면 신청 불가, half 이상이면 50% */
export const PROPERTY = { cap: 240_000_000, half: 170_000_000 } as const
export const LATE_PCT = 95 // [법 제100조의7②]
export const HALF_PCT = 35 // [법 제100조의5②1·별표 11 비고 1]
export const HALF_MIN = 150_000 // [령 제100조의9④] 상반기분이 이보다 적으면 12월에 주지 않고 다음 해 6월 정산 때
/** [법 제100조의7③] 결정 단계 최소액 */
export const DECIDE = { none: 15_000, rising: 100_000, falling: 30_000 } as const
/** [법 제100조의28·제100조의29·제100조의31②] 자녀장려금(부양자녀 1명당). 7천만원에서 1명당 50만원이 되도록 줄어든다 */
export const CTC = {
  limit: 70_000_000, max: 1_000_000, cut: 500_000, min: 30_000,
  one: { flatEnd: 21_000_000 }, two: { flatEnd: 25_000_000 },
} as const

/** [령 제100조의3①4] 사업소득 업종별 조정률(%) */
export const RATES = {
  wholesale: 20, agriRetail: 25, etc: 30, manufacturing: 40, construction: 45,
  lodging: 55, brokerage: 60, finance: 70, professional: 75, personal: 90,
} as const
export type RateKey = keyof typeof RATES

const ceil1000 = (num: number, den: number) => Math.ceil(num / (den * 1000)) * 1000 // num/den 을 천원 단위로 올림(정수 연산)

/** 법 제100조의5①의 구간 이름 */
export function phase(h: Household, x: number): Phase | null {
  const r = EITC[h]
  if (x < 0 || x >= r.limit) return null
  return x < r.up ? 'rising' : x < r.flatEnd ? 'flat' : 'falling'
}

/** x가 속한 별표 11 행의 [이상, 미만). 10만원 단위 + 첫 두 행(4만~7만, 7만~10만) + 점감 끝 경계.
 *  별표에서 맞벌이 열은 세 가구의 끝 경계 행을 모두 따르고, 단독·홑벌이 열은 자기 경계만 따른다. */
const ALL_TAILS = [...EITC.single.tail, ...EITC.one.tail, ...EITC.two.tail]
function band(h: Household, x: number): [number, number] {
  let lo = x < 70_000 ? TABLE_START : x < 100_000 ? 70_000 : Math.floor(x / 100_000) * 100_000
  let hi = x < 70_000 ? 70_000 : x < 100_000 ? 100_000 : lo + 100_000
  for (const s of h === 'two' ? ALL_TAILS : EITC[h].tail) {
    if (s <= x && s > lo) lo = s
    if (s > x && s < hi) hi = s
  }
  return [lo, hi]
}

/** 시행령 별표 11 근로장려금 산정표 값(감액 전). null = 표의 '해당 없음'(맞벌이 합산 600만원 미만).
 *  표를 재현하는 규칙(별표 전 행과 대조 — scripts/check-eitc.ts):
 *   점증 구간은 행의 '미만' 금액, 점감 구간은 행의 '이상' 금액을 산정식에 넣고 천원 단위로 올린다.
 *   홑벌이 점증 구간은 단독가구 값보다 낮지 않다(별표상 400만원 미만 두 열이 같음). */
export function eitcTable(h: Household, x: number): number | null {
  if (h === 'two' && x < TWO_MIN) return null
  const r = EITC[h]
  if (x < TABLE_START || x >= r.tail[1]) return 0 // 표에 없거나 '-'(산정액 1만5천원 미만)
  const [lo, hi] = band(h, x)
  const v = hi <= r.up ? ceil1000(hi * r.max, r.up)
    : lo >= r.flatEnd ? ceil1000(r.max * (r.limit - lo), r.limit - r.flatEnd)
      : r.max
  return h === 'one' ? Math.max(v, eitcTable('single', x) ?? 0) : v
}

/** 시행령 별표 11의2 자녀장려금 산정표 값(부양자녀 1명당, 감액 전). 50만원 단위 행의 '이상' 금액으로 계산해 천원 올림 */
export function ctcTable(h: 'one' | 'two', x: number): number | null {
  if (h === 'two' && x < TWO_MIN) return null
  if (x < TABLE_START || x >= CTC.limit) return 0
  const { flatEnd } = CTC[h]
  const lo = Math.floor(x / 500_000) * 500_000
  return lo < flatEnd ? CTC.max : ceil1000(CTC.max * (CTC.limit - flatEnd) - (lo - flatEnd) * CTC.cut, CTC.limit - flatEnd)
}

export interface EitcInput {
  household: Household
  wage: number // 부부 합산 근로소득 총급여(비과세 제외)
  business: number // 사업소득 총수입금액
  rate: RateKey // 업종 조정률
  other: number // 이자·배당·연금·기타소득 등 — 연간 총소득 판정에만 쓴다
  property: number // 가구원 재산 합계(부채 차감 없음)
  children: number // 18세 미만 부양자녀 수
  childCredit: number // 연말정산·종합소득세에서 실제로 받은 자녀세액공제액
  method: Method
}

/** 감액(재산 50%·기한 후 95%)과 결정 단계 최소액까지 반영한 근로장려금 [법 제100조의5④·제100조의7②③] */
export function eitcAmount(h: Household, x: number, propertyHalf: boolean, late: boolean) {
  const base = eitcTable(h, x) ?? 0
  const reduced = (base * (propertyHalf ? 50 : 100) * (late ? LATE_PCT : 100)) / 10_000 // 표 값이 천원 단위라 정수
  const p = phase(h, x)
  let amount = reduced
  if (reduced < DECIDE.none) amount = 0
  else if (p === 'rising' && reduced < DECIDE.rising) amount = DECIDE.rising
  else if (p === 'falling' && reduced < DECIDE.falling) amount = DECIDE.falling
  return { base, reduced, amount, minApplied: amount > reduced }
}

export function calcEitc(x: EitcInput) {
  const earned = x.wage + Math.floor((x.business * RATES[x.rate]) / 100) // 총급여액 등 [법 제100조의3⑤3]
  const total = earned + x.other // 연간 총소득 [령 제100조의3]
  // 맞벌이로 골랐어도 합산 600만원 미만이면 한 사람은 3백만원 미만 → 홑벌이 [법 제100조의3⑤2가]
  const downgraded = x.household === 'two' && earned < TWO_MIN
  const h: Household = downgraded ? 'one' : x.household
  const r = EITC[h]
  const propertyOver = x.property >= PROPERTY.cap
  const propertyHalf = !propertyOver && x.property >= PROPERTY.half
  const halfInvalid = x.method === 'half' && x.business > 0 // [법 제100조의6③] 근로소득 외 소득이 있으면 정기 신청으로 본다
  const method: Method = halfInvalid ? 'regular' : x.method
  const late = method === 'late'

  // 근로장려금
  const eReason = propertyOver ? 'property' : total >= r.limit ? 'income' : earned < TABLE_START ? 'noIncome' : null
  const e = eReason ? { base: 0, reduced: 0, amount: 0, minApplied: false } : eitcAmount(h, earned, propertyHalf, late)
  const eitc = { ...e, phase: eReason ? null : phase(h, earned), reason: eReason ?? (e.amount === 0 ? 'tiny' : null) }

  // 자녀장려금 [법 제100조의28~31, 령 제100조의31②]
  const kids = h === 'single' ? 0 : Math.max(0, Math.floor(x.children))
  const cReason = h === 'single' ? 'single' : kids === 0 ? 'noChildren' : propertyOver ? 'property'
    : total >= CTC.limit ? 'income' : earned < TABLE_START ? 'noIncome' : null
  const perChild = cReason ? 0 : ctcTable(h as 'one' | 'two', earned) ?? 0
  const cBase = perChild * kids
  const cReduced = (cBase * (propertyHalf ? 50 : 100) * (late ? LATE_PCT : 100)) / 10_000
  const afterCredit = cReduced - Math.max(0, x.childCredit)
  const cAmount = afterCredit <= 0 ? 0 : Math.max(CTC.min, afterCredit)
  const ctc = {
    perChild, kids, base: cBase, reduced: cReduced, credit: cReason ? 0 : Math.min(Math.max(0, x.childCredit), cReduced),
    amount: cAmount, minApplied: cAmount > afterCredit && afterCredit > 0,
    reason: cReason ?? (cAmount === 0 ? 'credit' : null),
  }

  // 반기: 상반기 소득을 1년으로 환산한 금액이 연간과 같다고 보고(소득이 고르게 들어온 경우) 35%를 12월에 [법 제100조의5②, 령 제100조의9④]
  let half: { first: number; second: number; deferred: boolean } | null = null
  if (method === 'half' && eitc.amount > 0) {
    const first = (e.base * HALF_PCT * (propertyHalf ? 50 : 100)) / 10_000
    const deferred = first < HALF_MIN
    const paid = deferred ? 0 : Math.min(first, eitc.amount)
    half = { first: paid, second: eitc.amount - paid, deferred }
  }

  return {
    earned, total, household: h, downgraded, propertyOver, propertyHalf, method, halfInvalid, limit: r.limit,
    eitc, ctc, half, sum: eitc.amount + ctc.amount,
  }
}
export type EitcResult = ReturnType<typeof calcEitc>
