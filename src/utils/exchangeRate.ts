/**
 * 환율 계산 순수 로직. 시세 = open.er-api.com (USD 기준, 하루 1회 갱신하는 시장 중간값).
 * 은행 고시 환율은 매매기준율 ± 스프레드: 현찰 살 때 = 기준 × (1 + s), 팔 때 = 기준 × (1 − s).
 * 환율 우대 p% = 스프레드(수수료)의 p%를 깎아 줌 → 기준 × (1 ± s × (1 − p)).
 */

export interface Currency {
  code: string
  flag: string
  /** 고시 단위: 엔·동·루피아는 은행이 100단위로 고시 */
  unit: 1 | 100
  /** 소수 자릿수 (표시) */
  dec: 0 | 2
  /** 현찰 스프레드 % (대략, 은행·시점마다 다름) */
  cash: number
  /** 송금(전신환) 스프레드 % (대략) */
  wire: number
}

// ponytail: 스프레드 기본값은 국내 시중은행 대략치 — USD·JPY 1.75%, EUR 1.99%, CNY 5%가 흔한 고시값,
// 그 외 주요 통화 약 2%, 동남아 등은 은행마다 편차가 커서 5%로 두고 사용자가 고쳐 쓰게 함.
export const CURRENCIES: Currency[] = [
  { code: 'USD', flag: '🇺🇸', unit: 1, dec: 2, cash: 1.75, wire: 1 },
  { code: 'JPY', flag: '🇯🇵', unit: 100, dec: 0, cash: 1.75, wire: 1 },
  { code: 'EUR', flag: '🇪🇺', unit: 1, dec: 2, cash: 1.99, wire: 1 },
  { code: 'CNY', flag: '🇨🇳', unit: 1, dec: 2, cash: 5, wire: 1 },
  { code: 'VND', flag: '🇻🇳', unit: 100, dec: 0, cash: 5, wire: 2 },
  { code: 'THB', flag: '🇹🇭', unit: 1, dec: 2, cash: 5, wire: 2 },
  { code: 'TWD', flag: '🇹🇼', unit: 1, dec: 2, cash: 5, wire: 2 },
  { code: 'PHP', flag: '🇵🇭', unit: 1, dec: 2, cash: 5, wire: 2 },
  { code: 'HKD', flag: '🇭🇰', unit: 1, dec: 2, cash: 2, wire: 1 },
  { code: 'GBP', flag: '🇬🇧', unit: 1, dec: 2, cash: 2, wire: 1 },
  { code: 'AUD', flag: '🇦🇺', unit: 1, dec: 2, cash: 2, wire: 1 },
  { code: 'CAD', flag: '🇨🇦', unit: 1, dec: 2, cash: 2, wire: 1 },
  { code: 'SGD', flag: '🇸🇬', unit: 1, dec: 2, cash: 2, wire: 1 },
  { code: 'CHF', flag: '🇨🇭', unit: 1, dec: 2, cash: 2, wire: 1 },
  { code: 'NZD', flag: '🇳🇿', unit: 1, dec: 2, cash: 2, wire: 1 },
  { code: 'IDR', flag: '🇮🇩', unit: 100, dec: 0, cash: 5, wire: 2 },
  { code: 'MYR', flag: '🇲🇾', unit: 1, dec: 2, cash: 5, wire: 2 },
  { code: 'MNT', flag: '🇲🇳', unit: 1, dec: 2, cash: 5, wire: 2 },
]
export const CODES = CURRENCIES.map((c) => c.code)
export const currency = (code: string) => CURRENCIES.find((c) => c.code === code) ?? CURRENCIES[0]

export type Rates = Record<string, number>

/** 1 외화당 원화 (매매기준율에 해당하는 시장 중간값). 데이터 없으면 null */
export function krwPer(rates: Rates, code: string): number | null {
  const k = rates.KRW, c = rates[code]
  return k > 0 && c > 0 ? k / c : null
}

/** 스프레드·우대 적용 환율. dir 1 = 고객이 외화 살 때(보낼 때), −1 = 팔 때(받을 때) */
export function applySpread(base: number, spreadPct: number, prefPct: number, dir: 1 | -1): number {
  const s = Math.max(0, spreadPct) / 100
  const p = Math.min(100, Math.max(0, prefPct)) / 100
  return base * (1 + dir * s * (1 - p))
}

export interface BankRates { cashBuy: number; cashSell: number; wireSend: number; wireRecv: number }
export const BANK_KEYS = ['cashBuy', 'cashSell', 'wireSend', 'wireRecv'] as const

export function bankRates(base: number, cash: number, wire: number, pref: number): BankRates {
  return {
    cashBuy: applySpread(base, cash, pref, 1),
    cashSell: applySpread(base, cash, pref, -1),
    wireSend: applySpread(base, wire, pref, 1),
    wireRecv: applySpread(base, wire, pref, -1),
  }
}

/** 표시 단위 값 (JPY 100엔당 원 등) */
export const perUnit = (krwPerOne: number, code: string) => krwPerOne * currency(code).unit

export const roundTo = (n: number, dec: number) => {
  const f = 10 ** dec
  return Math.round(n * f) / f
}

/** localStorage 캐시: { rates, updated(unix 초) } 형식 검사 */
export interface RateCache { rates: Rates; updated: number }
export function parseCache(raw: string | null): RateCache | null {
  if (!raw) return null
  try {
    const v = JSON.parse(raw) as RateCache
    return v && typeof v.updated === 'number' && v.rates && v.rates.KRW > 0 ? v : null
  } catch {
    return null
  }
}

/** 원화 예산 → 각 통화 (기준율, 현찰 살 때 우대 적용) */
export function budgetRows(krw: number, rates: Rates, pref: number, cashOverride?: { code: string; cash: number }) {
  return CURRENCIES.flatMap((c) => {
    const base = krwPer(rates, c.code)
    if (!base) return []
    const cash = cashOverride?.code === c.code ? cashOverride.cash : c.cash
    return [{ code: c.code, base, mid: krw / base, cash: krw / applySpread(base, cash, pref, 1) }]
  })
}
