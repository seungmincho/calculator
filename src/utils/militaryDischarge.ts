// 전역일 계산 순수 로직. 날짜는 'YYYY-MM-DD' 문자열 (dday.ts 헬퍼, 시간대 무관).
// 검증: node scripts/check-military-discharge.ts
import { addDays, daysBetween, isValidDate } from './dday.ts'

export type Branch =
  | 'army' | 'marines' | 'navy' | 'airForce' | 'katusa' | 'reserveDuty'
  | 'socialService' | 'industrialActive' | 'industrialReserve' | 'researchAgent'

/** 복무기간(개월) — 병무청 기준, 2026. ranks = 병 계급·봉급 적용 대상 */
export const BRANCHES: { key: Branch; months: number; ranks: boolean }[] = [
  { key: 'army', months: 18, ranks: true },
  { key: 'marines', months: 18, ranks: true },
  { key: 'navy', months: 20, ranks: true },
  { key: 'airForce', months: 21, ranks: true },
  { key: 'katusa', months: 18, ranks: true },
  { key: 'reserveDuty', months: 18, ranks: true }, // 상근예비역
  { key: 'socialService', months: 21, ranks: false },
  { key: 'industrialActive', months: 34, ranks: false }, // 산업기능요원(현역 대상)
  { key: 'industrialReserve', months: 23, ranks: false }, // 산업기능요원(보충역 대상)
  { key: 'researchAgent', months: 36, ranks: false },
]

/** 예전 링크 호환 (의경 폐지 → 육군, 산업기능요원 = 보충역 23개월이었음) */
const LEGACY: Record<string, Branch> = { conscriptedPolice: 'army', industrialTechnician: 'industrialReserve' }

export function parseBranch(s: string | null | undefined): Branch | null {
  if (!s) return null
  if (LEGACY[s]) return LEGACY[s]
  return BRANCHES.some(b => b.key === s) ? (s as Branch) : null
}

export const branchInfo = (b: Branch) => BRANCHES.find(x => x.key === b)!

function ym(s: string) { const [y, m, d] = s.split('-').map(Number); return { y, m, d } }
const lastDay = (y: number, m: number) => new Date(Date.UTC(y, m, 0)).getUTCDate() // m: 1~12
const fmt = (y: number, m: number, d: number) => `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
function shift(y: number, m: number, n: number) { const i = y * 12 + (m - 1) + n; return { y: Math.floor(i / 12), m: (i % 12) + 1 } }

/**
 * 전역일(복무 만료일). 입영일부터 기산(초일 산입)하고 민법 제160조에 따라
 * 최종 월의 "입영일에 해당하는 날의 전날"로 만료, 그 날이 없으면 그 달 말일.
 * 예) 3/10 입대 18개월 → 이듬해 9/9, 2025-08-31 입대 18개월 → 2027-02-28
 */
export function dischargeDate(enlist: string, months: number): string {
  const { y, m, d } = ym(enlist)
  const t = shift(y, m, months)
  if (d > lastDay(t.y, t.m)) return fmt(t.y, t.m, lastDay(t.y, t.m))
  return addDays(fmt(t.y, t.m, d), -1)
}

export type Rank = 'pvt' | 'pfc' | 'cpl' | 'sgt'
export const RANKS: Rank[] = ['pvt', 'pfc', 'cpl', 'sgt']
/** 계급별 진급까지 누적 개월 (이병 2 · 일병 6 · 상병 6, 군인사법 시행규칙 제32조) */
const PROMO_MONTHS: Record<Rank, number> = { pvt: 0, pfc: 2, cpl: 8, sgt: 14 }

/** 2026년 병 봉급(월, 원) — 국방부 2026 예산 */
export const PAY_2026: Record<Rank, number> = { pvt: 750000, pfc: 900000, cpl: 1200000, sgt: 1500000 }
/** 장병내일준비적금 정부 매칭지원금 월 최대 (납입액 100% 매칭, 전역 시 지급) */
export const SAVINGS_MATCH_MAX = 550000

/**
 * 진급 예정일: 진급은 매월 1일부 발령, 입영한 달을 1개월로 산입하는 관행 기준.
 * 예) 2026-01-20 입대 → 일병 03-01, 상병 09-01, 병장 2027-03-01.
 * 전역일 이후 진급은 제외. (진급 심사 결과·군별 운영에 따라 달라질 수 있음)
 */
export function promotionDates(enlist: string, discharge: string): { rank: Rank; date: string }[] {
  const { y, m } = ym(enlist)
  return RANKS.map(rank => {
    if (rank === 'pvt') return { rank, date: enlist }
    const t = shift(y, m, PROMO_MONTHS[rank])
    return { rank, date: fmt(t.y, t.m, 1) }
  }).filter(p => p.date <= discharge)
}

export function rankOn(promos: { rank: Rank; date: string }[], day: string): Rank | null {
  let r: Rank | null = null
  for (const p of promos) if (p.date <= day) r = p.rank
  return r
}

export type MilestoneKey = 'enlist' | 'day100' | 'half' | 'left100' | 'left30' | 'discharge' | Rank
export interface Milestone { key: MilestoneKey; date: string }

export interface Summary {
  enlist: string
  discharge: string
  totalDays: number
  /** 입대일 = 1일째. 입대 전 0, 전역 후 totalDays */
  servedDays: number
  /** 전역일 - 오늘 (음수 = 전역 후) */
  daysLeft: number
  /** 복무율 %, 소수 1자리 내림 (전역일 전에는 100.0이 되지 않음) */
  pct: number
  status: 'before' | 'serving' | 'done'
  rank: Rank | null
  nextPromo: { rank: Rank; date: string } | null
  milestones: Milestone[]
}

export function summarize(enlist: string, branch: Branch, today: string): Summary | null {
  if (!isValidDate(enlist)) return null
  const info = branchInfo(branch)
  const discharge = dischargeDate(enlist, info.months)
  const totalDays = daysBetween(enlist, discharge) + 1
  const servedDays = Math.min(Math.max(daysBetween(enlist, today) + 1, 0), totalDays)
  const daysLeft = daysBetween(today, discharge)
  const pct = Math.floor((servedDays / totalDays) * 1000) / 10
  const status = today < enlist ? 'before' : today > discharge ? 'done' : 'serving'
  const promos = info.ranks ? promotionDates(enlist, discharge) : []
  const milestones: Milestone[] = [
    { key: 'enlist', date: enlist },
    { key: 'day100', date: addDays(enlist, 99) },
    { key: 'half', date: addDays(enlist, Math.ceil(totalDays / 2) - 1) },
    { key: 'left100', date: addDays(discharge, -100) },
    { key: 'left30', date: addDays(discharge, -30) },
    { key: 'discharge', date: discharge },
    ...promos.filter(p => p.rank !== 'pvt').map(p => ({ key: p.rank, date: p.date })),
  ]
  milestones.sort((a, b) => a.date.localeCompare(b.date))
  return {
    enlist, discharge, totalDays, servedDays, daysLeft, pct, status,
    rank: status === 'before' ? null : rankOn(promos, status === 'done' ? discharge : today),
    nextPromo: promos.find(p => p.date > today) ?? null,
    milestones,
  }
}

// ── 저장한 사람들 ────────────────────────────────────
export interface Person { id: string; name: string; branch: Branch; date: string }

/** localStorage 등에서 읽은 값 검증 (깨진 항목은 버림) */
export function sanitizePeople(v: unknown): Person[] {
  if (!Array.isArray(v)) return []
  return v.flatMap(p => {
    const b = parseBranch(p?.branch)
    if (!p || typeof p.id !== 'string' || !b || !isValidDate(p.date)) return []
    return [{ id: p.id, name: typeof p.name === 'string' ? p.name.slice(0, 20) : '', branch: b, date: p.date }]
  }).slice(0, 20)
}
