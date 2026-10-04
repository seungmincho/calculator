/**
 * 임대수익률 계산기 (RentalYieldCalculator). 회귀 체크: node scripts/check-rental-yield.ts
 *
 * 수익률 정의 (금액 단위 원, 비율 %)
 * - 표면 수익률 = 연 월세(월세 × 12) ÷ (매매가 − 보증금)
 * - 순수익률   = 연 순임대수익(NOI) ÷ (매매가 + 취득비용 − 보증금)
 *     NOI = 월세 × 12 × (1 − 공실률) − (월 관리비 본인부담 × 12 + 연 수선비 + 연 보유세)
 * - 실투자 수익률(레버리지) = (NOI − 첫해 대출이자) ÷ 실투자금, 실투자금 = 매매가 + 취득비용 − 보증금 − 대출금
 * - 월 현금흐름 = NOI ÷ 12 − 첫 회차 대출 상환액 (이자만 = 이자, 원리금균등 = 원금 포함 상환액)
 * - 손익분기 월세 = (연 운영비 + 첫해 이자) ÷ (12 × (1 − 공실률))  → 실투자 수익률이 0이 되는 월세
 * 임대소득세·양도세·부가세는 계산하지 않음 (안내만).
 *
 * 취득비용 (2026-10 기준)
 * - 취득세·농특세·지방교육세: acquisitionTax.calcTax 그대로. 주택 = 1~3%(+중과), 오피스텔·상가 = 그 밖의 유상취득 4%
 *   (지방세법 제11조①7호나목) + 농특세 0.2% + 지방교육세 0.4% = 4.6%
 * - 중개보수 상한 + 부가세 10%: brokerageFee.saleFee. 오피스텔은 주거용 요건 충족(0.5%) 가정, 상가 0.9%
 * - 등기 부대비용(채권 할인·인지세·법무사): acquisitionTax.buyExtras 추정치
 */
import { calcTax, buyExtras, type Owner } from './acquisitionTax.ts'
import { saleFee } from './brokerageFee.ts'
import { schedule } from './loanSchedule.ts'

export type PropType = 'house' | 'officetel' | 'store'
export type Repay = 'interest' | 'amortize'
export type HouseCount = Extract<Owner, '1' | '2' | '3' | '4'>

export interface RentalInput {
  type: PropType
  price: number
  deposit: number
  rent: number      // 월세 (상가는 부가세 제외)
  mgmt: number      // 월 관리비 등 본인부담
  vacancy: number   // 공실률 %
  repair: number    // 연 수선비
  holdTax: number   // 연 보유세 (재산세 등)
  extra: number     // 기타 초기비용 (인테리어 등)
  loan: number
  rate: number      // 대출 연 %
  repay: Repay
  years: number     // 원리금균등 상환 기간(년)
  owner: HouseCount // 주택: 취득 후 주택 수
  adjusted: boolean // 주택: 조정대상지역
  over85: boolean   // 주택: 전용 85㎡ 초과
}

export interface AcqCosts { tax: number; taxRate: number; heavy: boolean; broker: number; misc: number; extra: number; total: number }

const pos = (n: number) => (Number.isFinite(n) ? Math.max(0, n) : 0)
const kindOf = (t: PropType) => (t === 'house' ? 'house' : 'building') as 'house' | 'building'

// ponytail: 등기 부대비용은 서울·광역시 채권 매입률로 고정. 지역 차이는 수만원 수준이라 입력을 늘리지 않음
export function acquisitionCosts(i: Pick<RentalInput, 'type' | 'price' | 'extra' | 'owner' | 'adjusted' | 'over85'>): AcqCosts {
  const price = pos(i.price)
  const kind = kindOf(i.type)
  const tx = calcTax({
    mode: 'buy', kind, price, over85: i.over85, adjusted: i.adjusted, owner: i.type === 'house' ? i.owner : '1',
    under1eok: false, relief: 'none', inheritSole: false, giftStd3eok: false, giftFromSingle: false,
  })
  const fee = saleFee(price, i.type === 'house' ? 'house' : i.type === 'officetel' ? 'officetel' : 'nonHouse')
  const broker = fee + Math.floor(fee * 0.1)
  const ex = price > 0 ? buyExtras(price, kind, true) : { bond: 0, stamp: 0, legal: 0 }
  const misc = ex.bond + ex.stamp + ex.legal
  const extra = pos(i.extra)
  return { tax: tx.total, taxRate: tx.rate, heavy: tx.heavy, broker, misc, extra, total: tx.total + broker + misc + extra }
}

/** 첫해 대출: 연 이자 합계와 첫 회차 상환액 (loanSchedule 반올림 규칙 그대로) */
export function loanFirstYear(loan: number, rate: number, repay: Repay, years: number) {
  if (pos(loan) <= 0) return { interest: 0, payment: 0 }
  const months = Math.max(1, Math.round(pos(years) || 1)) * 12
  const rows = schedule({ principal: loan, rate: pos(rate), months, method: repay === 'interest' ? 'bullet' : 'equalPayment' }).rows
  return { interest: rows.slice(0, 12).reduce((s, x) => s + x.interest, 0), payment: rows[0]?.payment ?? 0 }
}

const pct = (num: number, den: number) => (den > 0 ? (num / den) * 100 : null)
const vacOf = (i: RentalInput) => Math.min(100, pos(i.vacancy)) / 100
const opCostOf = (i: RentalInput) => pos(i.mgmt) * 12 + pos(i.repair) + pos(i.holdTax)

export function calcRental(i: RentalInput, acqIn?: AcqCosts) {
  const acq = acqIn ?? acquisitionCosts(i)
  const price = pos(i.price), deposit = pos(i.deposit), loan = pos(i.loan)
  const v = vacOf(i)
  const grossRent = pos(i.rent) * 12
  const effRent = grossRent * (1 - v)
  const opCost = opCostOf(i)
  const noi = effRent - opCost
  const base = price + acq.total - deposit   // 대출 없이 들어가는 돈
  const cash = base - loan                   // 실투자금
  const ln = loanFirstYear(loan, i.rate, i.repay, i.years)
  const profit = noi - ln.interest           // 연 세전 순이익 (원금 상환 제외)
  return {
    acq, grossRent, effRent, vacancyLoss: grossRent - effRent, opCost, noi, base, cash,
    interest: ln.interest, payment: ln.payment, profit,
    surface: pct(grossRent, price - deposit),
    net: pct(noi, base),
    leveraged: pct(profit, cash),
    monthlyCF: Math.round(noi / 12 - ln.payment),
    breakEvenRent: v < 1 ? Math.ceil((opCost + ln.interest) / (12 * (1 - v))) : null,
  }
}

export type RentalResult = ReturnType<typeof calcRental>

/** 목표 순수익률(%)을 맞추는 월세 (원 단위 올림). 공실 100%·목표 ≤ 0이면 null */
export function rentForTarget(i: RentalInput, target: number, acq = acquisitionCosts(i)): number | null {
  const v = vacOf(i)
  if (target <= 0 || v >= 1) return null
  const base = pos(i.price) + acq.total - pos(i.deposit)
  return Math.ceil(Math.max(0, (target / 100) * base + opCostOf(i)) / (12 * (1 - v)))
}

/**
 * 목표 순수익률(%)을 맞추는 최대 매수가 (만원 단위 내림).
 * 매매가 + 취득비용(매매가) = NOI ÷ 목표 + 보증금 을 이분법으로 푼다 — 취득비용은 매매가에 대해 단조 증가(구간 요율이 위로만 뜀).
 * NOI ≤ 0이면 어떤 가격도 목표를 못 맞추므로 null.
 */
export function priceForTarget(i: RentalInput, target: number): number | null {
  if (target <= 0) return null
  const noi = pos(i.rent) * 12 * (1 - vacOf(i)) - opCostOf(i)
  if (noi <= 0) return null
  const goal = noi / (target / 100) + pos(i.deposit)
  const f = (p: number) => p + acquisitionCosts({ ...i, price: p }).total
  if (f(0) >= goal) return null
  let lo = 0, hi = goal
  for (let k = 0; k < 60 && hi - lo > 1; k++) {
    const mid = (lo + hi) / 2
    if (f(mid) <= goal) lo = mid
    else hi = mid
  }
  return Math.floor(lo / 1e4) * 1e4
}

export const SENS_RATES = [-1, 0, 1] as const
export const SENS_VACANCY = [0, 5, 10] as const

/** 민감도 표: 금리 ±1%p × 공실률 0/5/10% → 월 현금흐름·실투자 수익률 */
export function sensitivity(i: RentalInput) {
  const acq = acquisitionCosts(i)
  return SENS_RATES.map((d) => {
    const rate = Math.max(0, i.rate + d)
    return { d, rate, cells: SENS_VACANCY.map((vacancy) => {
      const r = calcRental({ ...i, rate, vacancy }, acq)
      return { vacancy, monthlyCF: r.monthlyCF, leveraged: r.leveraged }
    }) }
  })
}
