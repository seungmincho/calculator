// 자동차세(소유분) 계산 — 지방세법 제127조(세율·차령 경감)·제128조(납기·연납), 시행령 제122조(차령), 제125조(연납 이자율 5%), 제126조(일할계산), 제151조(지방교육세 30%)
// 순수 함수. 금액은 10원 미만 절사(국고금관리법 제47조).

export type Kind = 'car' | 'ev' | 'van' | 'truck'
export type Use = 'private' | 'business'
export type VanSize = 'small' | 'large'
export const KINDS: readonly Kind[] = ['car', 'ev', 'van', 'truck']
export const VAN_SIZES: readonly VanSize[] = ['small', 'large']
// ponytail: 화물은 10톤 이하만 (10톤 초과 가산분은 대상 적어 생략)
export const TRUCK_TONS = [1, 2, 3, 4, 5, 8, 10] as const
export type TruckTon = (typeof TRUCK_TONS)[number]

export const LUMP_RATE = 0.05 // 연납 이자율 (시행령 제125조, 2025.1.1~ 5% 유지)
export const EDU_RATE = 0.3 // 지방교육세 (비영업용 승용만)
export const LUMP_MONTHS = [1, 3, 6, 9] as const
export type LumpMonth = (typeof LUMP_MONTHS)[number]

export interface CarInput {
  kind: Kind
  use: Use
  cc: number
  regYear: number
  regMonth: number // 1~12
  van: VanSize
  ton: TruckTon
}

const floor10 = (n: number) => Math.floor(n / 10) * 10
export const daysInYear = (y: number) => ((y % 4 === 0 && y % 100 !== 0) || y % 400 === 0 ? 366 : 365)
const dayOfYear = (y: number, m: number, d: number) => Math.round((Date.UTC(y, m - 1, d) - Date.UTC(y, 0, 1)) / 86_400_000) + 1

/** 승용 cc당 세율 (제127조 ①1) */
export function ccRate(cc: number, use: Use): number {
  if (use === 'private') return cc <= 1000 ? 80 : cc <= 1600 ? 140 : 200
  return cc <= 1600 ? 18 : cc <= 2500 ? 19 : 24
}

/** 경감 전 연세액 */
export function baseAnnual(i: CarInput): number {
  const p = i.use === 'private'
  switch (i.kind) {
    case 'car': return Math.max(0, Math.round(i.cc)) * ccRate(i.cc, i.use)
    case 'ev': return p ? 100_000 : 20_000
    case 'van': return i.van === 'large' ? (p ? 115_000 : 42_000) : (p ? 65_000 : 25_000)
    case 'truck': {
      const priv = { 1: 28_500, 2: 34_500, 3: 48_000, 4: 63_000, 5: 79_500, 8: 130_500, 10: 157_500 }
      const biz = { 1: 6_600, 2: 9_600, 3: 13_500, 4: 18_000, 5: 22_500, 8: 36_000, 10: 45_000 }
      return (p ? priv : biz)[i.ton]
    }
  }
}

/** 차령 (시행령 제122조): 1~6월 등록 = 연도차+1, 7~12월 등록 = 1기는 연도차, 2기는 연도차+1 */
export function carAge(year: number, regYear: number, regMonth: number, half: 1 | 2): number {
  const d = year - regYear
  return regMonth <= 6 || half === 2 ? d + 1 : d
}

/** 차령 경감률: 3년차부터 매년 5%, 최대 50% (제127조 ①2호) — 배기량 기준 비영업용 승용만 */
export const ageReduction = (age: number) => (age >= 3 ? Math.min(0.5, 0.05 * (age - 2)) : 0)

export interface Half {
  age: number
  reduction: number
  annual: number // 이 기의 차령으로 본 1년치 세액(경감 후, 절사 전)
  tax: number // 기분 자동차세 = 연세액 1/2
  edu: number
  total: number
}

export interface TaxResult {
  base: number
  hasEdu: boolean
  ageApplies: boolean
  h1: Half
  h2: Half
  tax: number
  edu: number
  total: number
}

export function calcAnnual(i: CarInput, year: number): TaxResult {
  const base = baseAnnual(i)
  const hasEdu = i.use === 'private' && (i.kind === 'car' || i.kind === 'ev')
  const ageApplies = i.kind === 'car' && i.use === 'private' // 제127조①2호: 비영업용 승용만
  const half = (h: 1 | 2): Half => {
    const age = Math.max(0, carAge(year, i.regYear, i.regMonth, h))
    const reduction = ageApplies ? ageReduction(age) : 0
    const annual = base * (1 - reduction)
    const tax = floor10(annual / 2)
    const edu = hasEdu ? floor10(tax * EDU_RATE) : 0
    return { age, reduction, annual, tax, edu, total: tax + edu }
  }
  const h1 = half(1), h2 = half(2)
  return { base, hasEdu, ageApplies, h1, h2, tax: h1.tax + h2.tax, edu: h1.edu + h2.edu, total: h1.total + h2.total }
}

const overlap = (a1: number, a2: number, b1: number, b2: number) => Math.max(0, Math.min(a2, b2) - Math.max(a1, b1) + 1)

/** 연납 (제128조③ 계산식, 시행령 제125조): 1·3월 = 연세액 × 납부기한 다음 날~12/31 일수/연간 일수 × 5%,
 *  6월 = 제2기분 세액 × 5%, 9월 = 제2기분 세액 × 10/1~12/31 일수/184 × 5% */
export function calcLump(r: TaxResult, year: number, month: LumpMonth) {
  const Y = daysInYear(year)
  const rest = Y - dayOfYear(year, month + 1, 1) + 1
  const deduction = (month === 6 ? r.h2.tax : month === 9 ? r.h2.tax * rest / 184 : r.tax * rest / Y) * LUMP_RATE
  const tax = floor10(r.tax - deduction)
  const edu = r.hasEdu ? floor10(tax * EDU_RATE) : 0
  const total = tax + edu
  return { month, tax, edu, total, saved: r.total - total, pct: r.total ? (r.total - total) / r.total * 100 : 0 }
}

/** 소유권 이전·폐차 일할계산 (시행령 제126조): 연세액 × 소유일수 / 연간일수. owned = [from, to] (같은 해, 양 끝 포함) */
export function calcProrated(r: TaxResult, year: number, from: string, to: string) {
  const Y = daysInYear(year)
  const h1End = dayOfYear(year, 6, 30)
  const doy = (s: string) => { const [y, m, d] = s.split('-').map(Number); return y === year ? dayOfYear(y, m, d) : y < year ? 1 : Y }
  const a = doy(from), b = doy(to)
  const d1 = overlap(a, b, 1, h1End), d2 = overlap(a, b, h1End + 1, Y)
  const tax = floor10((r.h1.annual * d1 + r.h2.annual * d2) / Y)
  const edu = r.hasEdu ? floor10(tax * EDU_RATE) : 0
  return { days: d1 + d2, tax, edu, total: tax + edu }
}

/** 신규 등록 후 n년차(1~13) 연간 세액 추이 — 1~6월 등록 기준 */
export function ageSeries(i: CarInput, year: number) {
  return Array.from({ length: 13 }, (_, k) => {
    const age = k + 1
    const r = calcAnnual({ ...i, regYear: year - age + 1, regMonth: 1 }, year)
    return { age, reduction: r.h1.reduction, total: r.total }
  })
}

const dnum = (s: string) => { const [y, m, d] = s.split('-').map(Number); return Date.UTC(y, m - 1, d) / 86_400_000 }
const ymd = (y: number, m: number, d: number) => new Date(Date.UTC(y, m - 1, d)).toISOString().slice(0, 10)

/** 진행 중이거나 다음에 올 연납 신고납부 기간 — 제128조③ 표: 1·3·6·9월 16일~말일.
 *  마감일이 토·일이면 다음 날로 (지방세기본법 제24조①). today = KST 'YYYY-MM-DD'.
 *  days = 기간 중이면 마감까지, 아니면 시작까지 남은 일수.
 *  ponytail: 공휴일 연장은 미반영 (1·3·6·9월 말일이 공휴일인 해는 드묾) */
export function nextLumpWindow(today: string) {
  const y = Number(today.slice(0, 4))
  for (const year of [y, y + 1]) {
    for (const month of LUMP_MONTHS) {
      const last = new Date(Date.UTC(year, month, 0)).getUTCDate()
      const wd = new Date(Date.UTC(year, month - 1, last)).getUTCDay()
      const start = ymd(year, month, 16)
      const due = ymd(year, month, last + (wd === 6 ? 2 : wd === 0 ? 1 : 0))
      if (today > due) continue
      const open = today >= start
      return { year, month, start, due, open, days: dnum(open ? due : start) - dnum(today) }
    }
  }
  throw new Error(`bad date ${today}`)
}
