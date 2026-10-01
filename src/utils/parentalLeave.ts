/**
 * 육아휴직급여·육아기 근로시간 단축 급여 순수 로직 (2026 기준). 검증: node scripts/check-parental-leave.ts
 *
 * 근거: 고용보험법 제70조·제73조의2, 시행령 제95조(일반·한부모)·제95조의3(출생 후 18개월 특례, 6+6)·제104조의2(단축 급여)
 * - 일반: 1~3개월 100%(상한 250만) · 4~6개월 100%(200만) · 7개월~ 80%(160만), 하한 70만, 사후지급금 폐지(2025.1~)
 * - 한부모: 1~3개월 상한 300만, 이후 일반과 같음
 * - 6+6: 생후 18개월 안에 부모 모두 휴직 → 각자 첫 6개월 100%, 상한 250·250·300·350·400·450만 (공통 사용 개월수만큼)
 * - 기간: 1년, 부모 각각 3개월 이상 사용·한부모면 1년 6개월
 * - 단축(2026.1~): 첫 주 10시간분 = 통상임금(상한 250만·하한 50만)×10/단축 전 시간,
 *   나머지 = 통상임금 80%(상한 160만·하한 50만)×나머지 시간/단축 전 시간. 단축 후 주 15~35시간
 */
import { addDays, addMonths } from './dday.ts'

export const FLOOR = 700_000
export const SPECIAL_CAPS = [2_500_000, 2_500_000, 3_000_000, 3_500_000, 4_000_000, 4_500_000]
export const SINGLE_CAP = 3_000_000

export type Applied = 'cap' | 'floor' | 'none'
export type Kind = 'general' | 'special' | 'single'

export function monthRule(n: number, special: boolean, single: boolean): { rate: number; cap: number; kind: Kind } {
  if (special && n <= 6) return { rate: 1, cap: SPECIAL_CAPS[n - 1], kind: 'special' }
  if (n <= 3) return single ? { rate: 1, cap: SINGLE_CAP, kind: 'single' } : { rate: 1, cap: 2_500_000, kind: 'general' }
  if (n <= 6) return { rate: 1, cap: 2_000_000, kind: 'general' }
  return { rate: 0.8, cap: 1_600_000, kind: 'general' }
}

export function monthBenefit(wage: number, n: number, special = false, single = false) {
  const r = monthRule(n, special, single)
  const raw = Math.floor(wage * r.rate)
  const amount = wage > 0 ? Math.min(Math.max(raw, FLOOR), r.cap) : 0
  const applied: Applied = raw > r.cap ? 'cap' : raw < FLOOR ? 'floor' : 'none'
  return { ...r, amount, applied }
}

/** 최대 휴직 개월수: 한부모 또는 부모 각각 3개월 이상이면 18, 아니면 12 */
export const maxMonths = (single: boolean, mine: number, other: number) =>
  single || (mine >= 3 && other >= 3) ? 18 : 12

export interface Row {
  n: number; from: string; to: string
  amount: number; base: number; rate: number; cap: number; kind: Kind; applied: Applied
}

export function rows(wage: number, months: number, start: string, specialMonths = 0, single = false): Row[] {
  return Array.from({ length: months }, (_, i) => {
    const n = i + 1
    const b = monthBenefit(wage, n, n <= specialMonths, single)
    return {
      n, from: addMonths(start, i), to: addDays(addMonths(start, n), -1),
      amount: b.amount, base: monthBenefit(wage, n, false, single).amount,
      rate: b.rate, cap: b.cap, kind: b.kind, applied: b.applied,
    }
  })
}

export type Who = 'both' | 'one' | 'single'
export type Order = 'mom' | 'dad' | 'same'

export interface PlanInput {
  who: Who; order: Order; start: string; birth: string
  momWage: number; momMonths: number; dadWage: number; dadMonths: number
}

export function plan(i: PlanInput) {
  const single = i.who === 'single'
  const both = i.who === 'both'
  const reqMom = i.momMonths
  const reqDad = both ? i.dadMonths : 0
  const momMonths = Math.min(reqMom, maxMonths(single, reqMom, reqDad))
  const dadMonths = Math.min(reqDad, maxMonths(single, reqDad, reqMom))

  const momStart = i.order === 'dad' && both ? addMonths(i.start, dadMonths) : i.start
  const dadStart = i.order === 'mom' ? addMonths(i.start, momMonths) : i.start
  const secondStart = momStart > dadStart ? momStart : dadStart
  // 출생일 산입: 생후 18개월이 되기 전에 두 번째 부모도 휴직을 시작해야 함
  // ponytail: 두 번째 부모 휴직이 18개월을 걸쳐도 공통 개월수 전부 특례로 봄 — 고용센터 판단과 다를 수 있음
  const eligible66 = both && momMonths > 0 && dadMonths > 0 && secondStart < addMonths(i.birth, 18)
  const special = eligible66 ? Math.min(6, momMonths, dadMonths) : 0

  const mom = rows(i.momWage, momMonths, momStart, special, single)
  const dad = both ? rows(i.dadWage, dadMonths, dadStart, special, false) : []
  const sum = (r: Row[]) => r.reduce((s, x) => s + x.amount, 0)
  // 순차 사용이면 먼저 쉰 부모의 상향분은 두 번째 부모 휴직 후 소급 지급
  const first = i.order === 'same' ? [] : i.order === 'mom' ? mom : dad
  const retro = first.reduce((s, x) => s + x.amount - x.base, 0)

  // 달력 기준 합산 (지급 단위기간 시작월)
  const map = new Map<string, { ym: string; mom: number; dad: number; momRow?: Row; dadRow?: Row }>()
  const put = (r: Row, who: 'mom' | 'dad') => {
    const ym = r.from.slice(0, 7)
    const e = map.get(ym) ?? { ym, mom: 0, dad: 0 }
    e[who] += r.amount
    if (who === 'mom') e.momRow = r; else e.dadRow = r
    map.set(ym, e)
  }
  mom.forEach((r) => put(r, 'mom'))
  dad.forEach((r) => put(r, 'dad'))
  const calendar = [...map.values()].sort((a, b) => a.ym.localeCompare(b.ym))

  // 가구 월 최저 소득(세전): 휴직 중이 아닌 부모는 통상임금으로 근무한다고 가정
  const lowest = both
    ? Math.min(...calendar.map((c) => (c.momRow ? c.mom : i.momWage) + (c.dadRow ? c.dad : i.dadWage)))
    : 0
  const ends = [...mom, ...dad].map((r) => r.to).sort()
  const careMonths = i.order === 'same' || !both ? Math.max(momMonths, dadMonths) : momMonths + dadMonths

  return {
    momMonths, dadMonths, clampedMom: momMonths < reqMom, clampedDad: dadMonths < reqDad,
    momStart, dadStart, eligible66, special, mom, dad,
    momTotal: sum(mom), dadTotal: sum(dad), total: sum(mom) + sum(dad),
    retro, calendar, lowest, careMonths, end: ends[ends.length - 1] ?? i.start,
  }
}

/** 순서 3가지 비교 (both 전용) */
export const compareOrders = (i: PlanInput) =>
  (['mom', 'dad', 'same'] as Order[]).map((order) => ({ order, ...plan({ ...i, order }) }))

/** 육아기 근로시간 단축 급여 (월, 2026.1.1~) */
export const RH = { firstCap: 2_500_000, restCap: 1_600_000, floor: 500_000, minAfter: 15, maxAfter: 35 }

export function reducedHours(wage: number, before: number, after: number) {
  const cut = before - after
  if (before <= 0 || cut <= 0 || after < RH.minAfter || after > RH.maxAfter) {
    return { cut: 0, first: 0, rest: 0, gov: 0, company: Math.floor(wage), total: Math.floor(wage) }
  }
  const clamp = (v: number, cap: number) => Math.min(Math.max(v, RH.floor), cap)
  const first = Math.floor(clamp(wage, RH.firstCap) * Math.min(cut, 10) / before)
  const rest = Math.floor(clamp(wage * 0.8, RH.restCap) * Math.max(cut - 10, 0) / before)
  const company = Math.floor(wage * after / before)
  return { cut, first, rest, gov: first + rest, company, total: first + rest + company }
}

/** 단축 가능 기간: 1년 + 미사용 육아휴직(1년 기준)×2, 최대 3년 */
export const maxReduceMonths = (leaveUsed: number) => Math.min(36, 12 + 2 * Math.max(0, 12 - leaveUsed))
