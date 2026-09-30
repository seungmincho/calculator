// 바이오리듬 순수 로직 (재미용 — 과학적 근거 없음). 날짜는 'YYYY-MM-DD' 문자열, 일수는 dday.ts의 UTC 일련번호로 계산.
// 검증: node scripts/check-biorhythm.ts
import { daysBetween, addDays, isValidDate } from './dday.ts'

export const CYCLES = { physical: 23, emotional: 28, intellectual: 33, intuitive: 38 } as const
export type CycleKey = keyof typeof CYCLES
export const CLASSIC: CycleKey[] = ['physical', 'emotional', 'intellectual']

/** 출생일 = 0일째. target이 출생 전이면 음수 */
export const daysAlive = (birth: string, target: string) => daysBetween(birth, target)

/** -1 … 1 */
export const rhythm = (days: number, cycle: number) => Math.sin((2 * Math.PI * days) / cycle)

/** 세 기본 리듬 평균 (-1 … 1) */
export const composite = (days: number) => CLASSIC.reduce((s, k) => s + rhythm(days, CYCLES[k]), 0) / CLASSIC.length

/**
 * 위험일: 곡선이 0을 지나는 날. 0점(k·c/2)이 [days, days+1) 안에 있으면 그 날.
 * 반환: 'up'(−→+), 'down'(+→−), null. 반주기가 1일보다 길어서 하루에 두 번 지나는 일은 없다.
 */
export function crossing(days: number, cycle: number): 'up' | 'down' | null {
  const half = cycle / 2
  const k = Math.ceil(days / half - 1e-9)
  return k * half < days + 1 - 1e-9 ? (k % 2 === 0 ? 'up' : 'down') : null
}

export type Band = 'high' | 'up' | 'down' | 'low'
/** 한 줄 해석 구간: ≥50 최고 / 0~50 상승 / -50~0 하강 / ≤-50 저조 */
export const band = (v: number): Band => (v >= 0.5 ? 'high' : v >= 0 ? 'up' : v > -0.5 ? 'down' : 'low')

/** 오늘 값이 어제보다 오르는 중인가 */
export const rising = (days: number, cycle: number) => rhythm(days + 1, cycle) > rhythm(days, cycle)

export interface DayPoint {
  date: string
  days: number
  physical: number
  emotional: number
  intellectual: number
  intuitive: number
  composite: number
  critical: CycleKey[]
}

export function dayPoint(birth: string, date: string): DayPoint {
  const d = daysAlive(birth, date)
  const v = (k: CycleKey) => Math.round(rhythm(d, CYCLES[k]) * 100)
  return {
    date, days: d,
    physical: v('physical'), emotional: v('emotional'), intellectual: v('intellectual'), intuitive: v('intuitive'),
    composite: Math.round(composite(d) * 100),
    critical: CLASSIC.filter(k => crossing(d, CYCLES[k])),
  }
}

/** center 기준 앞뒤 span일 */
export const series = (birth: string, center: string, span = 15) =>
  Array.from({ length: span * 2 + 1 }, (_, i) => dayPoint(birth, addDays(center, i - span)))

/** 'YYYY-MM' 한 달치 */
export function monthPoints(birth: string, ym: string): DayPoint[] {
  const first = `${ym}-01`
  const out: DayPoint[] = []
  for (let d = first; d.startsWith(ym); d = addDays(d, 1)) if (d >= birth) out.push(dayPoint(birth, d))
  return out
}

/** 종합 점수 기준 best/worst n일 (동점은 빠른 날짜 우선) */
export function bestWorst(points: DayPoint[], n = 3) {
  const sorted = [...points].sort((a, b) => b.composite - a.composite || a.date.localeCompare(b.date))
  return { best: sorted.slice(0, n), worst: sorted.slice(-n).reverse() }
}

/** from 이후(당일 제외) within일 안의 위험일 */
export function upcomingCritical(birth: string, from: string, within = 14) {
  const out: { date: string; keys: CycleKey[] }[] = []
  for (let i = 1; i <= within; i++) {
    const p = dayPoint(birth, addDays(from, i))
    if (p.critical.length) out.push({ date: p.date, keys: p.critical })
  }
  return out
}

/**
 * 궁합(일치도): 같은 주기 두 사인파의 위상 차 Δ = 2π(생일 차이)/주기 → (1 + cos Δ) / 2.
 * 100% = 생일 차이가 주기의 배수(곡선이 완전히 겹침), 0% = 반주기 차이(정반대). 날짜와 무관하고 대칭.
 */
export function match(birthA: string, birthB: string, cycle: number): number {
  const gap = daysBetween(birthA, birthB)
  return (1 + Math.cos((2 * Math.PI * gap) / cycle)) / 2
}

export function compatibility(birthA: string, birthB: string) {
  const per = Object.fromEntries(CLASSIC.map(k => [k, Math.round(match(birthA, birthB, CYCLES[k]) * 100)])) as Record<'physical' | 'emotional' | 'intellectual', number>
  const overall = Math.round(CLASSIC.reduce((s, k) => s + match(birthA, birthB, CYCLES[k]), 0) / CLASSIC.length * 100)
  return { ...per, overall, gap: Math.abs(daysBetween(birthA, birthB)) }
}

// ── 저장 프로필 ──
export interface Profile { id: string; name: string; date: string }
export function sanitizeProfiles(raw: unknown): Profile[] {
  if (!Array.isArray(raw)) return []
  return raw
    .filter((p): p is Profile => !!p && typeof p.id === 'string' && typeof p.name === 'string' && isValidDate(p.date))
    .map(p => ({ id: p.id.slice(0, 20), name: p.name.slice(0, 20), date: p.date }))
    .slice(0, 20)
}
