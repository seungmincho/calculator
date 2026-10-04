/**
 * 부동산 양도소득세 (CapitalGainsTax). 회귀 체크: node scripts/check-capital-gains-tax.ts
 *
 * 근거 (2026-10-01 현행)
 * - 소득세법 제89조①3호, 시행령 제154조: 1세대 1주택 2년 보유 비과세(취득 당시 조정대상지역이면 2년 거주), 양도가액 12억 초과 고가주택 제외
 * - 시행령 제160조: 고가주택 과세 양도차익 = 양도차익 × (양도가액 − 12억) / 양도가액 (장기보유특별공제도 같은 비율)
 * - 시행령 제155조①: 일시적 2주택 — 종전주택 취득 1년 후 신규 취득, 신규 취득일부터 3년 내 종전주택 양도.
 *   2026.10.1 개정(대통령령 제36737호): 종전·신규 모두 조정대상지역 + 신규 2026.8.4 이후 취득 + 2026.10.1 이후 양도 → 2년.
 *   경과조치(재정경제부 2026-09-29 국무회의 의결): 2026.8.3까지 신규 주택(분양권 등 권리 포함)을 취득했거나
 *   매매계약을 체결하고 계약금을 지급한 경우 종전 3년 — 계약·계약금 둘 다 8.3까지여야 함 (newContractDate = 둘 중 늦은 날)
 * - 소득세법 제95조②, 시행령 제159조의4: 장기보유특별공제 표1 3년 6% + 연 2%p(15년 30%),
 *   표2(1세대 1주택, 보유 3년·거주 2년 이상) 보유 연 4%(최대 40%) + 거주 2~3년 8%·3년 이상 연 4%(최대 40%)
 * - 소득세법 제103조: 기본공제 연 250만원. 제104조: 기본세율 6~45%, 주택·입주권 1년 미만 70%·2년 미만 60%,
 *   분양권 1년 미만 70%·1년 이상 60%, 토지·건물 1년 미만 50%·2년 미만 40%, 비사업용 토지 기본세율 + 10%p,
 *   조정대상지역 2주택 +20%p·3주택 이상 +30%p(장기보유특별공제 배제), 여러 세율에 해당하면 산출세액 큰 것
 * - 시행령 제167조의10·11: 보유 2년 이상 주택 중과 한시 배제 2022.5.10 ~ 2026.5.9 양도분. 2026.5.9까지 계약 후
 *   4개월(강남·서초·송파·용산) / 6개월(2025.10.16 이후 신규 조정대상지역) 내 양도도 배제 (경과규정)
 * - 소득세법 제105조: 예정신고 = 양도일이 속하는 달의 말일부터 2개월. 기한이 토·일·공휴일이면 다음 날(국세기본법 제5조)
 * - 지방소득세(지방세법 제103조의3): 양도소득세 산출세액의 10%
 * 국회 심의 중(미반영): 2026 세법개정안 — 2027·2028 중과 +5·10%p / +10·15%p, 2027 기본공제 2,500만원(10년 거주 1주택), 2028 장특공제 개편
 */
import { getKoreanHolidays, isHoliday, isWeekend } from './koreanHolidays.ts'

export type Kind = 'house' | 'land' | 'nonbiz' | 'presale'
export interface CgtInput {
  kind: Kind
  sale: number; acq: number; expense: number
  acqDate: string; saleDate: string
  houses: 1 | 2 | 3          // 양도 주택 포함 1세대 보유 주택 수 (3 = 3주택 이상)
  temp: boolean              // 일시적 2주택(이사) 주장
  newAcqDate: string         // 신규 주택 취득일
  newContractDate?: string   // 신규 주택 매매계약 + 계약금 지급일 (모르면 '' → 취득일 기준)
  newAdjusted: boolean       // 신규 주택이 조정대상지역
  adjusted: boolean          // 양도 주택이 지금(양도 시점) 조정대상지역
  acqAdjusted: boolean       // 양도 주택이 취득 당시 조정대상지역 (거주요건)
  residence: number          // 거주 기간(년)
  grace: boolean             // 중과 유예 경과규정 대상 (2026.5.9 이전 계약 후 4·6개월 내 양도)
  surchargeOverride?: { two: number; three: number } // 개정안 시뮬레이션용
}
export type Exempt = 'full' | 'partial' | 'none' | 'na'
export interface Check { key: 'hold2' | 'res2' | 'under12' | 'tempGap' | 'tempDeadline'; ok: boolean; value?: string }
export interface CgtResult {
  hold: number               // 만 보유 연수
  exempt: Exempt
  checks: Check[]
  tempPeriod: number         // 일시적 2주택 처분 기한(년), 해당 없으면 0
  tempRule: TempRule | ''
  tempDeadline: string
  profit: number; exemptProfit: number; taxableProfit: number; taxableRatio: number
  lthdTable: 'none' | 'general' | 'oneHouse' | 'excluded'
  lthdHoldRate: number; lthdResRate: number; lthdRate: number; lthd: number
  income: number; basic: number; base: number
  rate: { type: 'flat'; rate: number } | { type: 'progressive'; rate: number; add: number; deduction: number }
  surcharge: number; shortRate: number
  tax: number; local: number; total: number
}

export const EXEMPT_CAP = 1_200_000_000
export const BASIC_DEDUCTION = 2_500_000
export const BRACKETS = [
  { upTo: 14_000_000, rate: 0.06, ded: 0 },
  { upTo: 50_000_000, rate: 0.15, ded: 1_260_000 },
  { upTo: 88_000_000, rate: 0.24, ded: 5_760_000 },
  { upTo: 150_000_000, rate: 0.35, ded: 15_440_000 },
  { upTo: 300_000_000, rate: 0.38, ded: 19_940_000 },
  { upTo: 500_000_000, rate: 0.40, ded: 25_940_000 },
  { upTo: 1_000_000_000, rate: 0.42, ded: 35_940_000 },
  { upTo: Infinity, rate: 0.45, ded: 65_940_000 },
]

export const ymd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
const parse = (s: string) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d) }
export const isDate = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s)
export const addYears = (s: string, n: number) => { const d = parse(s); return ymd(new Date(d.getFullYear() + n, d.getMonth(), d.getDate())) }
export const addMonths = (s: string, n: number) => { const d = parse(s); return ymd(new Date(d.getFullYear(), d.getMonth() + n, d.getDate())) }

/** 만 보유 연수: 취득일 다음 날부터 기산(초일 불산입) → 취득일의 n년 뒤 같은 날 양도 시 n년 */
export function fullYears(from: string, to: string): number {
  if (!isDate(from) || !isDate(to) || to < from) return 0
  let n = 0
  while (addYears(from, n + 1) <= to) n++
  return n
}
export const fullMonths = (from: string, to: string) => { let n = 0; while (addMonths(from, n + 1) <= to) n++; return n }
const yearsFrac = (from: string, to: string) => Math.max(0, (parse(to).getTime() - parse(from).getTime()) / (365.25 * 86_400_000))

export function progressive(base: number, add = 0) {
  const b = BRACKETS.find((x) => base <= x.upTo)!
  return { rate: b.rate, add, deduction: b.ded, tax: base * (b.rate + add) - b.ded }
}

export function generalLthd(hold: number) { return hold < 3 ? 0 : Math.min(hold * 0.02, 0.3) }
export function oneHouseLthd(hold: number, res: number) {
  const h = hold < 3 ? 0 : Math.min(hold * 0.04, 0.4)
  const r = res < 2 ? 0 : res < 3 ? 0.08 : Math.min(Math.floor(res) * 0.04, 0.4)
  return { hold: h, res: r }
}

/** 일시적 2주택 처분 기한 규정: adjusted2 = 조정→조정 2년, contract3 = 8.3까지 계약·계약금 지급(경과조치) 3년, base3 = 기본 3년 */
export type TempRule = 'adjusted2' | 'contract3' | 'base3'
type TempIn = Pick<CgtInput, 'adjusted' | 'newAdjusted' | 'newAcqDate' | 'saleDate' | 'newContractDate'>
export function tempRule(i: TempIn): TempRule {
  if (!(i.adjusted && i.newAdjusted && i.newAcqDate >= '2026-08-04' && i.saleDate >= '2026-10-01')) return 'base3'
  return i.newContractDate && isDate(i.newContractDate) && i.newContractDate <= '2026-08-03' ? 'contract3' : 'adjusted2'
}
/** 일시적 2주택 처분 기한(년) */
export const tempPeriod = (i: TempIn) => (tempRule(i) === 'adjusted2' ? 2 : 3)

export function calcCgt(i: CgtInput): CgtResult {
  const hold = fullYears(i.acqDate, i.saleDate)
  const res = Math.min(Math.max(0, i.residence), yearsFrac(i.acqDate, i.saleDate))
  const profit = Math.max(0, i.sale - i.acq - i.expense)
  const house = i.kind === 'house'
  const checks: Check[] = []

  // 일시적 2주택
  let tempOk = false, tPeriod = 0, tDeadline = '', tRule: TempRule | '' = ''
  if (house && i.houses === 2 && i.temp && isDate(i.newAcqDate)) {
    tRule = tempRule(i)
    tPeriod = tRule === 'adjusted2' ? 2 : 3
    tDeadline = addYears(i.newAcqDate, tPeriod)
    const gap = i.newAcqDate >= addYears(i.acqDate, 1)
    const inTime = i.saleDate <= tDeadline && i.saleDate >= i.newAcqDate
    checks.push({ key: 'tempGap', ok: gap }, { key: 'tempDeadline', ok: inTime, value: tDeadline })
    tempOk = gap && inTime
  }
  const oneHouse = house && (i.houses === 1 || tempOk)

  // 1세대 1주택 비과세
  let exempt: Exempt = 'na', taxableRatio = 1
  if (oneHouse) {
    const holdOk = hold >= 2
    const resOk = !i.acqAdjusted || res >= 2
    checks.unshift({ key: 'hold2', ok: holdOk }, ...(i.acqAdjusted ? [{ key: 'res2' as const, ok: resOk }] : []))
    checks.push({ key: 'under12', ok: i.sale <= EXEMPT_CAP })
    if (holdOk && resOk) {
      exempt = i.sale <= EXEMPT_CAP ? 'full' : 'partial'
      taxableRatio = i.sale <= EXEMPT_CAP ? 0 : (i.sale - EXEMPT_CAP) / i.sale
    } else exempt = 'none'
  } else if (house && i.houses === 2 && i.temp) exempt = 'none' // 일시적 2주택 요건 미충족
  const taxableProfit = profit * taxableRatio
  const exemptProfit = profit - taxableProfit

  // 중과 (조정대상지역 다주택, 보유 2년 이상은 2026.5.9 양도분까지 유예 + 경과규정)
  let surcharge = 0
  if (house && !oneHouse && i.houses >= 2 && i.adjusted) {
    const grace = hold >= 2 && (i.saleDate <= '2026-05-09' || i.grace)
    const s = i.surchargeOverride ?? { two: 0.2, three: 0.3 }
    if (!grace) surcharge = i.houses === 2 ? s.two : s.three
  }

  // 장기보유특별공제
  let lthdTable: CgtResult['lthdTable'] = 'none', lthdHoldRate = 0, lthdResRate = 0
  if (i.kind !== 'presale' && hold >= 3) {
    if (surcharge > 0) lthdTable = 'excluded'
    else if (exempt === 'partial' && res >= 2) {
      const r = oneHouseLthd(hold, res); lthdTable = 'oneHouse'; lthdHoldRate = r.hold; lthdResRate = r.res
    } else { lthdTable = 'general'; lthdHoldRate = generalLthd(hold) }
  }
  const lthdRate = lthdHoldRate + lthdResRate
  const lthd = Math.floor(taxableProfit * lthdRate)
  const income = Math.max(0, Math.floor(taxableProfit) - lthd)
  const basic = Math.min(BASIC_DEDUCTION, income)
  const base = income - basic

  // 세율: 해당 세율 중 산출세액이 큰 것
  const shortRate =
    i.kind === 'presale' ? (hold < 1 ? 0.7 : 0.6)
    : i.kind === 'house' ? (hold < 1 ? 0.7 : hold < 2 ? 0.6 : 0)
    : (hold < 1 ? 0.5 : hold < 2 ? 0.4 : 0)
  const add = surcharge + (i.kind === 'nonbiz' ? 0.1 : 0)
  const cands: { rate: CgtResult['rate']; tax: number }[] = []
  if (shortRate) cands.push({ rate: { type: 'flat', rate: shortRate }, tax: base * shortRate })
  if (i.kind !== 'presale' && (!shortRate || add > 0)) {
    const p = progressive(base, add)
    cands.push({ rate: { type: 'progressive', rate: p.rate, add, deduction: p.deduction }, tax: p.tax })
  }
  const best = cands.reduce((a, b) => (b.tax > a.tax ? b : a))
  const tax = base > 0 ? Math.floor(Math.round(Math.max(0, best.tax) * 100) / 100) : 0 // 부동소수 오차 제거 후 원 미만 절사
  const local = Math.floor(tax * 0.1)

  return {
    hold, exempt, checks, tempPeriod: tPeriod, tempRule: tRule, tempDeadline: tDeadline,
    profit, exemptProfit, taxableProfit, taxableRatio,
    lthdTable, lthdHoldRate, lthdResRate, lthdRate, lthd, income, basic, base,
    rate: best.rate, surcharge, shortRate, tax, local, total: tax + local,
  }
}

/** 예정신고·납부 기한: 양도일이 속하는 달의 말일부터 2개월, 토·일·공휴일이면 다음 영업일 */
export function reportDue(saleDate: string): string {
  const [y, m] = saleDate.split('-').map(Number)
  let due = new Date(y, m + 2, 0)
  for (let k = 0; k < 15 && (isWeekend(due) || isHoliday(ymd(due), getKoreanHolidays(due.getFullYear()))); k++) {
    due = new Date(due.getFullYear(), due.getMonth(), due.getDate() + 1)
  }
  return ymd(due)
}

export interface SimRow { date: string; months: number; total: number; saving: number }
/** "더 보유/거주하면": 보유 기념일·거주 연차 도달일마다 다시 계산해 세금이 줄어드는 시점 (양도가 동일 가정) */
export function simulate(i: CgtInput, live: boolean, limit = 4): SimRow[] {
  if (!isDate(i.acqDate) || !isDate(i.saleDate)) return []
  const now = calcCgt(i).total
  const dates = new Set<string>()
  for (let n = 1; n <= 30; n++) { const d = addYears(i.acqDate, n); if (d > i.saleDate && d <= addYears(i.saleDate, 16)) dates.add(d) }
  if (live && i.kind === 'house') {
    for (let n = Math.floor(i.residence) + 1; n <= 10; n++) dates.add(addMonths(i.saleDate, Math.ceil((n - i.residence) * 12)))
  }
  const rows: SimRow[] = []
  let prev = now
  for (const date of [...dates].sort()) {
    const m = fullMonths(i.saleDate, date)
    const yrs = m / 12 + yearsFrac(addMonths(i.saleDate, m), date)
    const total = calcCgt({ ...i, saleDate: date, residence: live ? i.residence + yrs : i.residence }).total
    if (total < prev) {
      rows.push({ date, months: m + (addMonths(i.saleDate, m) < date ? 1 : 0), total, saving: now - total })
      if (rows.length >= limit) break
    }
    prev = Math.min(prev, total)
  }
  return rows
}
