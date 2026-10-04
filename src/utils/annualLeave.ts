// 연차 계산 순수 로직 (근로기준법 제60조). 날짜는 'YYYY-MM-DD' 문자열 — dday.ts 헬퍼 재사용.
// 검증: node scripts/check-annual-leave.ts
import { addDays, addMonths, addYears, daysBetween, toDayNum, fromDayNum, weekday } from './dday.ts'
import type { KoreanHoliday } from './koreanHolidays.ts'

export type GrantKind = 'monthly' | 'annual' | 'prorated'
export interface Grant {
  date: string     // 발생일 (이날 재직 중이어야 발생 — 대법원 2021다227100)
  days: number
  kind: GrantKind
  year: number     // n년차에 쓰는 연차 (월 단위 = 1년차)
  expires: string  // 사용 가능 마지막 날
}
export interface LeaveOptions {
  /** 직전 1년(회계연도) 출근율 80% 미만이면 개근한 달 수 → 마지막 연 단위 연차를 월 단위로 대체 (제60조 ②) */
  lowAttendanceMonths?: number | null
}

/** 제60조⑤ 신설: 시간단위 분할 청구 시 부여 의무 (법률 제21784호 부칙 제1조, 공포 2026.6.9 + 1년). 단위·일수는 시행령(미공포) */
export const HOURLY_LEAVE_FROM = '2027-06-10'

const round2 = (n: number) => Math.round(n * 100) / 100

/** 근속 n년을 채웠을 때 발생하는 연차: 15일 + 최초 1년 초과 매 2년마다 1일, 최대 25일 (제60조 ①④) */
export function leaveForYears(n: number): number {
  if (n < 1) return 0
  return Math.min(15 + Math.floor((n - 1) / 2), 25)
}

// 1년 미만: 1개월 개근마다 1일, 최대 11일. 입사 1년 되는 날 전까지 사용 (제60조 ②, 제61조 ②)
function monthlyGrants(join: string, until: string): Grant[] {
  const out: Grant[] = []
  const expires = addDays(addYears(join, 1), -1)
  for (let k = 1; k <= 11; k++) {
    const date = addMonths(join, k)
    if (date > until) break
    out.push({ date, days: 1, kind: 'monthly', year: 1, expires })
  }
  return out
}

function applyLowAttendance(grants: Grant[], opt?: LeaveOptions): Grant[] {
  const m = opt?.lowAttendanceMonths
  if (m == null) return grants
  for (let i = grants.length - 1; i >= 0; i--) {
    if (grants[i].kind !== 'monthly') { grants[i] = { ...grants[i], days: Math.max(0, Math.min(11, m)) }; break }
  }
  return grants
}

/** 입사일 기준: 매 입사기념일에 발생. until(기준일·마지막 근무일)까지 */
export function joinGrants(join: string, until: string, opt?: LeaveOptions): Grant[] {
  if (until < join) return []
  const out = monthlyGrants(join, until)
  for (let n = 1; n <= 60; n++) {
    const date = addYears(join, n)
    if (date > until) break
    out.push({ date, days: leaveForYears(n), kind: 'annual', year: n + 1, expires: addDays(addYears(date, 1), -1) })
  }
  return applyLowAttendance(out, opt)
}

/**
 * 회계연도(1/1) 기준: 입사 다음 해 1/1에 비례연차 15×입사연도 재직일수/365,
 * 그 뒤 1/1마다 입사연도를 1년으로 쳐서 15일·가산 (k번째 1/1 → 근속 k-1년분).
 * 1/1 입사자는 입사일 기준과 같다. 1년 미만 월 단위 연차는 별도로 계속 발생.
 */
export function fiscalGrants(join: string, until: string, opt?: LeaveOptions): Grant[] {
  if (until < join) return []
  const out = monthlyGrants(join, until)
  const jy = +join.slice(0, 4)
  const janFirst = join.slice(5) === '01-01'
  for (let k = 1; k <= 60; k++) {
    const y = jy + k
    const date = `${y}-01-01`
    if (date > until) break
    const expires = `${y}-12-31`
    if (janFirst) out.push({ date, days: leaveForYears(k), kind: 'annual', year: k + 1, expires })
    else if (k === 1) out.push({ date, days: round2(15 * (daysBetween(join, `${jy}-12-31`) + 1) / 365), kind: 'prorated', year: 1, expires })
    else out.push({ date, days: leaveForYears(k - 1), kind: 'annual', year: k, expires })
  }
  return applyLowAttendance(out.sort((a, b) => a.date.localeCompare(b.date)), opt)
}

export const total = (g: Grant[]) => round2(g.reduce((s, x) => s + x.days, 0))
/** 기준일에 사용 가능한(발생했고 아직 소멸 안 된) 연차 */
export const active = (g: Grant[], ref: string) => total(g.filter(x => x.date <= ref && ref <= x.expires))

export interface Summary {
  total: number        // 기준일까지 누적 발생
  active: number       // 지금 쓸 수 있는 연차(소멸 전)
  next: Grant | null   // 다음 발생
  grants: Grant[]
}
export function summarize(basis: 'joinDate' | 'fiscalYear', join: string, ref: string, opt?: LeaveOptions): Summary {
  const f = basis === 'joinDate' ? joinGrants : fiscalGrants
  const grants = f(join, ref, opt)
  const next = f(join, addYears(ref, 2)).find(g => g.date > ref) ?? null
  return { total: total(grants), active: active(grants, ref), next, grants }
}

/** 퇴사 정산: 입사일 기준이 더 많으면 그 차이만큼 수당 정산 (근로자에게 불리하면 안 됨) */
export function settlement(join: string, lastDay: string, opt?: LeaveOptions) {
  const j = total(joinGrants(join, lastDay, opt))
  const f = total(fiscalGrants(join, lastDay, opt))
  return { join: j, fiscal: f, shortfall: Math.max(0, round2(j - f)) }
}

export interface TimelineRow { year: number; date: string; days: number; kind: GrantKind; cumulative: number; future: boolean; count?: number }
/** 연차별 타임라인: 월 단위는 한 줄로 묶음. horizonYears 년차까지 미래분 포함 */
export function timeline(basis: 'joinDate' | 'fiscalYear', join: string, ref: string, horizonYears: number, opt?: LeaveOptions): TimelineRow[] {
  const until = addYears(join, horizonYears)
  const grants = (basis === 'joinDate' ? joinGrants : fiscalGrants)(join, until > ref ? until : ref, opt)
  const rows: TimelineRow[] = []
  let cum = 0
  for (const g of grants) {
    cum = round2(cum + g.days)
    const last = rows[rows.length - 1]
    if (g.kind === 'monthly' && last?.kind === 'monthly' && (last.future === g.date > ref)) {
      last.days += 1; last.count = (last.count ?? 1) + 1; last.cumulative = cum
    } else rows.push({ year: g.year, date: g.date, days: g.days, kind: g.kind, cumulative: cum, future: g.date > ref, count: g.kind === 'monthly' ? 1 : undefined })
  }
  return rows
}

// ── 연차수당 ────────────────────────────────────────────
/** 2026년 최저시급 — minimumWage.ts 단일 출처 */
export { MIN_WAGE_2026 } from './minimumWage.ts'
/** 1일 통상임금. 월급은 월 소정근로시간(주40h·주휴 포함 209h)으로 시급 환산 */
export type WageMode = 'monthly' | 'hourly' | 'daily'
export function dailyWage(mode: WageMode, amount: number, dailyHours = 8, monthlyHours = 209): number {
  if (mode === 'daily') return Math.round(amount)
  const hourly = mode === 'monthly' ? amount / monthlyHours : amount
  return Math.round(hourly * dailyHours)
}

// ── 징검다리 연휴 ───────────────────────────────────────
export interface Bridge { start: string; end: string; restDays: number; leaveDates: string[]; holidays: string[] }
/**
 * from 이후 휴일 블록(주말·공휴일) 사이 평일 1~4일을 연차로 메우면 이어지는 연휴.
 * 공휴일이 낀 경우만, 쉬는 날/연차 ≥ 2인 것만. leaveDates[0] ≥ from, 마지막 연차일 ≤ to.
 */
export function bridges(from: string, to: string, getBase: (y: number) => KoreanHoliday[]): Bridge[] {
  const end = addDays(to, 10)
  const hol = new Map<string, string>()
  for (let y = +from.slice(0, 4); y <= +end.slice(0, 4); y++) for (const h of getBase(y)) if (!hol.has(h.date)) hol.set(h.date, h.name)
  type Block = { start: string; end: string; names: string[] }
  const blocks: Block[] = []
  for (let n = toDayNum(addDays(from, -7)); n <= toDayNum(end); n++) {
    const d = fromDayNum(n)
    const wd = weekday(d)
    if (!(wd === 0 || wd === 6 || hol.has(d))) continue
    const last = blocks[blocks.length - 1]
    const name = hol.get(d)
    if (last && daysBetween(last.end, d) === 1) { last.end = d; if (name) last.names.push(name) }
    else blocks.push({ start: d, end: d, names: name ? [name] : [] })
  }
  const out: Bridge[] = []
  for (let i = 0; i + 1 < blocks.length; i++) {
    const a = blocks[i], b = blocks[i + 1]
    const gap = daysBetween(a.end, b.start) - 1
    if (gap < 1 || gap > 4 || (!a.names.length && !b.names.length)) continue
    const leaveDates = Array.from({ length: gap }, (_, k) => addDays(a.end, k + 1))
    if (leaveDates[0] < from || leaveDates[gap - 1] > to) continue
    const restDays = daysBetween(a.start, b.end) + 1
    if (restDays / gap < 2) continue
    out.push({ start: a.start, end: b.end, restDays, leaveDates, holidays: [...new Set([...a.names, ...b.names])] })
  }
  return out
}
