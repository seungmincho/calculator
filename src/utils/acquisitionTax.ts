/**
 * 취득세·농어촌특별세·지방교육세 + 집 살 때 부대비용 (AcquisitionTaxCalculator). 회귀 체크: node scripts/check-acquisition-tax.ts
 *
 * 근거 (2026-10 기준)
 * - 지방세법 제11조①8호: 주택 유상취득 6억 이하 1%, 6~9억 (가액×2/3억 − 3)% (소수점 넷째 자리까지), 9억 초과 3%
 *   제11조①: 상속 2.8%(농지 2.3%), 무상취득(증여) 3.5%, 그 밖의 유상취득 4%(농지 3%)
 * - 지방세법 제13조의2: 개인 조정 2주택 8%·3주택 12%, 비조정 3주택 8%·4주택+ 12%, 법인 12%,
 *   조정대상지역 시가표준액 3억 이상 주택 증여 12%(1세대 1주택자의 배우자·직계존비속 증여 제외). 시행령 제28조의2: 시가표준액 1억 이하 주택 중과 제외
 *   시행령 제28조의5: 일시적 2주택 = 신규 취득 후 3년 내 종전 주택 처분, 둘 다 조정대상지역이면 2년
 *   (2026.10.1 시행, 2026.8.26까지 계약·계약금 지급분은 3년) — 기간 판정은 사용자가 '2temp'로 선택
 * - 지방세법 제15조①2호: 무주택 세대의 상속 1주택 = 2.8% − 2% = 0.8%
 * - 지방교육세(지방세법 제151조): (표준세율 − 2%) × 20%. 1~3% 주택은 취득세의 10%, 중과는 0.4%
 * - 농어촌특별세(농특세법 제5조): 표준세율 2%로 계산한 취득세의 10% = 0.2%, 중과는 0.2% + (세율 − 4%) × 10%. 전용 85㎡ 이하 주택 비과세
 * - 감면(지방세특례제한법): 생애최초 제36조의3(12억 이하, 200만원·소형/인구감소지역 300만원, ~2028.12.31),
 *   출산·양육 제36조의5(12억 이하 1가구 1주택, 500만원, ~2028.12.31). 지방교육세는 취득세 감면 비율만큼 함께 감면
 */
import { getKoreanHolidays, isHoliday, isWeekend } from './koreanHolidays.ts'
import { saleFee } from './brokerageFee.ts'

export type Mode = 'buy' | 'inherit' | 'gift'
/** house = 주택, building = 토지·상가·오피스텔·건물(4%), farmland = 농지 */
export type Kind = 'house' | 'building' | 'farmland'
/** 취득 후 주택 수 (매매). 2temp = 일시적 2주택, corp = 법인 */
export type Owner = '1' | '2temp' | '2' | '3' | '4' | 'corp'
export type Relief = 'none' | 'first' | 'firstSmall' | 'birth'

export interface TaxInput {
  mode: Mode
  kind: Kind
  price: number
  over85: boolean
  adjusted: boolean
  owner: Owner
  under1eok: boolean       // 시가표준액(공시가격) 1억 이하 → 중과 제외
  relief: Relief
  inheritSole: boolean     // 무주택 세대의 상속 1주택 특례
  giftStd3eok: boolean     // 증여 주택 공시가격 3억 이상
  giftFromSingle: boolean  // 1세대 1주택자가 배우자·직계존비속에게 증여 → 중과 제외
}

export interface TaxResult {
  rate: number           // 취득세율 (소수, 0.01 = 1%)
  heavy: boolean
  acqGross: number       // 감면 전 취득세
  relief: number         // 취득세 감면액
  acq: number            // 납부 취득세
  nong: number
  eduGross: number
  edu: number
  total: number
  effRate: number        // 총 세금 / 가액 (%)
  reliefBlocked: '' | 'price' | 'owner' | 'mode'
}

export const RELIEF_LIMIT: Record<Relief, number> = { none: 0, first: 2_000_000, firstSmall: 3_000_000, birth: 5_000_000 }
export const RELIEF_PRICE_CAP = 1_200_000_000

const floor10 = (v: number) => Math.floor(v / 10 + 1e-6) * 10 // 1e-6: 부동소수 오차 보정

/** 주택 유상취득 표준세율 (1~3%). 6~9억은 % 단위 소수점 넷째 자리까지 반올림 */
export function houseRate(price: number): number {
  if (price <= 600_000_000) return 0.01
  if (price > 900_000_000) return 0.03
  const pct = Math.round(((price / 100_000_000) * (2 / 3) - 3) * 10_000) / 10_000
  return pct / 100
}

/** 매매 주택 중과세율. 중과 아니면 0 */
function buyHeavyRate(i: TaxInput): number {
  if (i.under1eok) return 0
  switch (i.owner) {
    case 'corp': case '4': return 0.12
    case '3': return i.adjusted ? 0.12 : 0.08
    case '2': return i.adjusted ? 0.08 : 0
    default: return 0
  }
}

export function calcTax(i: TaxInput): TaxResult {
  const p = Math.max(0, i.price)
  const house = i.kind === 'house'
  let rate: number
  let heavy = false
  let special = false // 상속 1주택 특례

  if (i.mode === 'buy') {
    const hr = house ? buyHeavyRate(i) : 0
    heavy = hr > 0
    rate = house ? (heavy ? hr : houseRate(p)) : i.kind === 'farmland' ? 0.03 : 0.04
  } else if (i.mode === 'inherit') {
    special = house && i.inheritSole
    rate = special ? 0.008 : i.kind === 'farmland' ? 0.023 : 0.028
  } else {
    heavy = house && i.adjusted && i.giftStd3eok && !i.giftFromSingle
    rate = heavy ? 0.12 : 0.035
  }

  const acqGross = floor10(p * rate)

  const eduRate = heavy ? 0.004
    : i.mode === 'buy' && house ? rate * 0.1
    : special ? 0.008 * 0.2
    : Math.max(0, rate - 0.02) * 0.2
  const eduGross = floor10(p * eduRate)

  const nongRate = (house && !i.over85) || special ? 0
    : heavy ? 0.002 + (rate - 0.04) * 0.1
    : 0.002
  const nong = floor10(p * nongRate)

  // 감면: 매매 주택, 취득 후 1주택(개인), 12억 이하
  let reliefBlocked: TaxResult['reliefBlocked'] = ''
  let relief = 0
  if (i.relief !== 'none') {
    if (i.mode !== 'buy' || !house) reliefBlocked = 'mode'
    else if (i.owner !== '1') reliefBlocked = 'owner'
    else if (p > RELIEF_PRICE_CAP) reliefBlocked = 'price'
    else relief = Math.min(acqGross, RELIEF_LIMIT[i.relief])
  }
  const acq = acqGross - relief
  const edu = acqGross > 0 ? floor10(eduGross * (acq / acqGross)) : 0
  const total = acq + nong + edu

  return { rate, heavy, acqGross, relief, acq, nong, eduGross, edu, total, effRate: p > 0 ? (total / p) * 100 : 0, reliefBlocked }
}

// ── 부대비용 (매매) ──

/** 매매 중개보수 상한 (부가세 별도). 주택 외(토지·상가·오피스텔 등)는 0.9% — 요율표는 brokerageFee.ts */
export const brokerFee = (price: number, kind: Kind): number => saleFee(price, kind === 'house' ? 'house' : 'nonHouse')

/** 국민주택채권 매입률 (소유권이전등기, 시가표준액 기준, 서울·광역시 / 그 밖의 지역) */
export function bondRate(std: number, kind: Kind, metro: boolean): number {
  const pick = (a: number, b: number) => (metro ? a : b) / 1000
  if (kind === 'house') {
    if (std < 20_000_000) return 0
    if (std < 50_000_000) return pick(13, 13)
    if (std < 100_000_000) return pick(19, 14)
    if (std < 160_000_000) return pick(21, 16)
    if (std < 260_000_000) return pick(23, 18)
    if (std < 600_000_000) return pick(26, 21)
    return pick(31, 26)
  }
  if (kind === 'farmland') { // 토지
    if (std < 5_000_000) return 0
    if (std < 50_000_000) return pick(25, 20)
    if (std < 100_000_000) return pick(40, 35)
    return pick(50, 45)
  }
  if (std < 10_000_000) return 0 // 주택 외 건물
  if (std < 130_000_000) return pick(10, 8)
  if (std < 250_000_000) return pick(16, 14)
  return pick(20, 18)
}

/** 인지세 (부동산 매매계약서, 매수·매도 각 1/2 부담 가정). 주택 1억 이하 비과세 */
export function stampDuty(price: number, kind: Kind): number {
  if (kind === 'house' && price <= 100_000_000) return 0
  if (price <= 10_000_000) return 0
  if (price <= 30_000_000) return 20_000
  if (price <= 50_000_000) return 40_000
  if (price <= 100_000_000) return 70_000
  if (price <= 1_000_000_000) return 150_000
  return 350_000
}

// ponytail: 공시가격 = 거래가 × 70%, 채권 즉시매도 본인부담 5%, 법무사·등기 고정 60만원으로 근사. 실제는 공시가격·당일 할인율·법무사 견적으로 바꿀 것
export const STD_RATIO = 0.7
export const BOND_DISCOUNT = 0.05
export const LEGAL_FEE = 600_000

export interface Extras { broker: number; brokerVat: number; bond: number; stamp: number; legal: number; total: number }

export function buyExtras(price: number, kind: Kind, metro: boolean): Extras {
  const broker = brokerFee(price, kind)
  const brokerVat = Math.floor(broker * 0.1)
  const bond = Math.floor(price * STD_RATIO * bondRate(price * STD_RATIO, kind, metro) * BOND_DISCOUNT)
  const stamp = stampDuty(price, kind) / 2
  return { broker, brokerVat, bond, stamp, legal: LEGAL_FEE, total: broker + brokerVat + bond + stamp + LEGAL_FEE }
}

// ── 신고·납부 기한 / 가산세 ──

const ymd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

/** 지방세법 제20조①: 매매 취득일부터 60일, 증여 취득일이 속한 달 말일부터 3개월, 상속 상속개시일이 속한 달 말일부터 6개월.
 *  기한이 토·일·공휴일이면 다음 영업일 (지방세기본법 제25조) */
export function dueDate(acquired: string, mode: Mode): string {
  const [y, m, d] = acquired.split('-').map(Number)
  let due = mode === 'buy' ? new Date(y, m - 1, d + 60)
    : new Date(y, m - 1 + (mode === 'gift' ? 3 : 6) + 1, 0) // 달 말일 + N개월 = (m+N)월 말일
  for (let k = 0; k < 15; k++) {
    if (!isWeekend(due) && !isHoliday(ymd(due), getKoreanHolidays(due.getFullYear()))) break
    due = new Date(due.getFullYear(), due.getMonth(), due.getDate() + 1)
  }
  return ymd(due)
}

/** 기한 후 가산세: 무신고 20%(신고했으면 0) + 납부지연 1일 0.022% (최대 75%). 지방세기본법 제53조·제55조 */
export function latePenalty(tax: number, daysLate: number, reported: boolean) {
  const report = reported ? 0 : floor10(tax * 0.2)
  const delay = floor10(tax * Math.min(0.75, 0.00022 * Math.max(0, daysLate)))
  return { report, delay, total: report + delay }
}
