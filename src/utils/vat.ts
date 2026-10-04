// 부가가치세 계산 (순수 함수). 회귀 체크: node scripts/check-vat.ts
// 근거: 부가가치세법 제30조(세율 10%)·제63조(간이과세자 납부세액 = 공급대가 × 업종별 부가가치율 × 10%)
//       ·제46조(신용카드매출전표 등 발행세액공제)·제48·49조(신고 기한), 시행령 제109조(간이과세 기준 1억 400만원)
import { getKoreanHolidays, isHoliday, isWeekend } from './koreanHolidays.ts'

/** 세액의 원 미만 처리. 법정 규칙은 없고 거래 당사자 약정 — 실무 다수가 절사 */
export type Rounding = 'floor' | 'round'
export type TaxKind = 'taxable' | 'zero' | 'exempt' // 과세 10% · 영세율 0% · 면세(세금계산서 대신 계산서)

export interface Split { supply: number; vat: number; total: number }

const rnd = (n: number, r: Rounding) => (r === 'floor' ? Math.floor(n) : Math.round(n))
const pos = (n: number) => (Number.isFinite(n) && n > 0 ? Math.floor(n) : 0)

/** 공급가액 × 10% (원 미만 처리) */
export const vatOf = (supply: number, r: Rounding = 'floor') => rnd(pos(supply) / 10, r)

/** 공급가액 → 세액·합계 */
export function fromSupply(supply: number, r: Rounding = 'floor'): Split {
  const s = pos(supply)
  const vat = vatOf(s, r)
  return { supply: s, vat, total: s + vat }
}

/**
 * 합계(부가세 포함) → 공급가액·세액. 합계는 받은 돈이므로 절대 바뀌지 않게
 * 세액 = 합계 ÷ 11 (원 미만 처리), 공급가액 = 합계 − 세액.
 * gap = 세액 − (공급가액 × 10%) : 0이 아니면 1원 끝수 차이 (공급가액 × 10%로 다시 계산하면 합계가 1원 어긋남)
 */
export function fromTotal(total: number, r: Rounding = 'floor'): Split & { gap: number } {
  const t = pos(total)
  const vat = rnd(t / 11, r)
  const supply = t - vat
  return { supply, vat, total: t, gap: vat - vatOf(supply, r) }
}

/** 세액 → 공급가액(세액 × 10)·합계 */
export function fromVat(vat: number): Split {
  const v = pos(vat)
  return { supply: v * 10, vat: v, total: v * 11 }
}

// ── 여러 품목 (세금계산서 품목란) ──
export interface Line { name: string; qty: number; price: number; kind: TaxKind }
export interface LineResult extends Line, Split {}
export interface Invoice {
  lines: LineResult[]
  taxableSupply: number // 과세 공급가액
  zeroSupply: number    // 영세율 공급가액
  exempt: number        // 면세 금액 (계산서 별도 발급)
  vat: number           // 품목별 세액 합
  vatOnSum: number      // 과세 공급가액 합계 × 10% — 품목별 합과 다르면 끝수 차이 안내
  total: number
}

/** 품목 한 줄. inclusive=단가가 부가세 포함 가격(쇼핑몰 판매가) */
export function lineAmounts(l: Line, inclusive: boolean, r: Rounding = 'floor'): Split {
  const gross = Math.round((Number.isFinite(l.qty) ? l.qty : 0) * (Number.isFinite(l.price) ? l.price : 0))
  if (gross <= 0) return { supply: 0, vat: 0, total: 0 }
  if (l.kind !== 'taxable') return { supply: gross, vat: 0, total: gross }
  const s = inclusive ? fromTotal(gross, r) : fromSupply(gross, r)
  return { supply: s.supply, vat: s.vat, total: s.total }
}

export function invoice(lines: Line[], inclusive: boolean, r: Rounding = 'floor'): Invoice {
  const out = lines.map(l => ({ ...l, ...lineAmounts(l, inclusive, r) }))
  const sum = (k: TaxKind, f: keyof Split) => out.filter(l => l.kind === k).reduce((a, l) => a + l[f], 0)
  const taxableSupply = sum('taxable', 'supply')
  const vat = sum('taxable', 'vat')
  const vatOnSum = inclusive ? fromTotal(sum('taxable', 'total'), r).vat : vatOf(taxableSupply, r)
  return {
    lines: out,
    taxableSupply,
    zeroSupply: sum('zero', 'supply'),
    exempt: sum('exempt', 'supply'),
    vat,
    vatOnSum,
    total: out.reduce((a, l) => a + l.total, 0),
  }
}

const KIND_CODE: Record<TaxKind, string> = { taxable: 't', zero: 'z', exempt: 'e' }
/** URL 파라미터용: 이름|수량|단가|종류 를 ; 로 연결 */
export const encodeLines = (lines: Line[]) =>
  lines.map(l => [encodeURIComponent(l.name), l.qty, l.price, KIND_CODE[l.kind]].join('|')).join(';')
export function decodeLines(s: string): Line[] {
  const kinds = Object.fromEntries(Object.entries(KIND_CODE).map(([k, v]) => [v, k])) as Record<string, TaxKind>
  return s.split(';').filter(Boolean).slice(0, 50).map(part => {
    const [n = '', q = '', p = '', k = 't'] = part.split('|')
    let name = n
    try { name = decodeURIComponent(n) } catch { /* 깨진 인코딩: 원문 유지 */ }
    return { name, qty: Number(q) || 0, price: Number(p) || 0, kind: kinds[k] ?? 'taxable' }
  })
}

// ── 부가세 신고 예상 ──
export const SIMPLE_THRESHOLD = 104_000_000 // 간이과세 기준(직전 연도 공급대가, 2024.7.1~) — 시행령 제109조
export const SIMPLE_EXEMPT = 48_000_000     // 해당 과세기간 공급대가 미만이면 납부의무 면제 — 법 제69조
export const CARD_RATE = 0.013              // 2026.12.31 공급분까지 1.3% (원칙 1%) — 법 제46조
export const CARD_LIMIT = 10_000_000        // 연간 한도
export const E_FILING_CREDIT = 10_000       // 확정신고 전자신고세액공제 — 조특법 제104조의8
export const SIMPLE_PURCHASE_RATE = 0.005   // 간이: 세금계산서 등 수취 매입 공급대가 × 0.5% — 법 제63조③

/** 간이과세자 업종별 부가가치율(%) — 시행령 제111조② (2021.7.1~) */
export const SIMPLE_RATES = { retail: 15, manufacturing: 20, lodging: 25, construction: 30, professional: 40 } as const
export type SimpleIndustry = keyof typeof SIMPLE_RATES

export interface GeneralInput {
  sales: number        // 과세 매출 공급가액 (6개월)
  purchases: number    // 공제받는 매입 공급가액 (세금계산서·사업용 카드)
  cardSales: number    // 신용카드·현금영수증 매출 발행금액 (부가세 포함)
  cardEligible: boolean // 개인사업자 + 직전 연도 공급가액 10억 이하
  eFiling: boolean
}
export interface ReturnResult {
  outputTax: number    // 매출세액 (간이: 공급대가 × 부가가치율 × 10%)
  inputTax: number     // 매입세액 (간이: 매입 공급대가 × 0.5%)
  cardCredit: number
  eFilingCredit: number
  payable: number      // 음수 = 환급
  exempt?: boolean     // 간이 납부면제
  overThreshold?: boolean
}

export function generalReturn(i: GeneralInput): ReturnResult {
  const outputTax = Math.floor(pos(i.sales) / 10)
  const inputTax = Math.floor(pos(i.purchases) / 10)
  const base = outputTax - inputTax
  // 발행세액공제는 납부할 세액을 넘으면 넘는 부분은 없는 것으로 봄 (법 제46조①)
  const cardCredit = i.cardEligible ? Math.min(Math.floor(pos(i.cardSales) * CARD_RATE), CARD_LIMIT, Math.max(base, 0)) : 0
  const eFilingCredit = i.eFiling ? E_FILING_CREDIT : 0
  return { outputTax, inputTax, cardCredit, eFilingCredit, payable: base - cardCredit - eFilingCredit }
}

export interface SimpleInput {
  sales: number        // 공급대가 (1년, 부가세 포함 매출)
  industry: SimpleIndustry
  purchases: number    // 세금계산서 등 수취 매입 공급대가
  cardSales: number
  eFiling: boolean
}

export function simpleReturn(i: SimpleInput): ReturnResult {
  const sales = pos(i.sales)
  const outputTax = Math.floor((sales * SIMPLE_RATES[i.industry]) / 1000)
  const inputTax = Math.floor(pos(i.purchases) * SIMPLE_PURCHASE_RATE)
  const cardCredit = Math.min(Math.floor(pos(i.cardSales) * CARD_RATE), CARD_LIMIT)
  const eFilingCredit = i.eFiling ? E_FILING_CREDIT : 0
  const exempt = sales < SIMPLE_EXEMPT
  // 간이과세자는 공제세액이 납부세액을 넘어도 환급 없음 (법 제63조⑥)
  const payable = exempt ? 0 : Math.max(0, outputTax - inputTax - cardCredit - eFilingCredit)
  return { outputTax, inputTax, cardCredit, eFilingCredit, payable, exempt, overThreshold: sales >= SIMPLE_THRESHOLD }
}

// ── 신고 기한 (개인 확정신고: 1기 7/25, 2기 1/25 · 간이 1/25). 공휴일·주말이면 다음 날 (국세기본법 제5조) ──
const ymd = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

export function adjustBusinessDay(d: Date): Date {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  while (isWeekend(x) || isHoliday(ymd(x), getKoreanHolidays(x.getFullYear()))) x.setDate(x.getDate() + 1)
  return x
}

export interface Deadline { date: string; dday: number; year: number; period: 'h1' | 'h2' | 'year' }

/** today 이후(당일 포함) 가장 가까운 확정신고 기한 */
export function nextDeadline(today: Date, simple: boolean): Deadline {
  const t0 = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  for (let y = t0.getFullYear(); ; y++) {
    const cands: Omit<Deadline, 'dday'>[] = [
      { date: ymd(adjustBusinessDay(new Date(y, 0, 25))), year: y - 1, period: simple ? 'year' : 'h2' },
      ...(simple ? [] : [{ date: ymd(adjustBusinessDay(new Date(y, 6, 25))), year: y, period: 'h1' as const }]),
    ]
    for (const c of cands) {
      const [yy, mm, dd] = c.date.split('-').map(Number)
      const dday = Math.round((new Date(yy, mm - 1, dd).getTime() - t0.getTime()) / 86_400_000)
      if (dday >= 0) return { ...c, dday }
    }
  }
}
