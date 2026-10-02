// 배란일·가임기·생리 예정일 순수 로직. 날짜는 'YYYY-MM-DD' 문자열(dday.ts, UTC 일련번호 → 시간대 무관).
// 검증: node scripts/check-ovulation.ts
// 근거: 대한산부인과학회 — 배란은 다음 월경 시작 약 14일 전, 가임기 = 배란 전 5일 ~ 배란 후 1일
//       Wilcox AJ et al., NEJM 1995;333:1517 — 임신은 배란일로 끝나는 6일 안에서만, 배란 2일 전~당일 확률 최고
//       FIGO 2018(Munro) — 정상 주기 24~38일, 최단·최장 차이 ≤7~9일
//       달력법(오기노/Knaus): 첫 가임일 = 최단 주기 − 18, 마지막 가임일 = 최장 주기 − 11 (주기 일차)
import { addDays, daysBetween } from './dday.ts'
import { icsEscape, icsFold } from './carMaintenance.ts'

export const CYCLE_MIN = 21
export const CYCLE_MAX = 45
export const LUTEAL_MIN = 10
export const LUTEAL_MAX = 16
export const PERIOD_MIN = 2
export const PERIOD_MAX = 10

export interface Settings {
  lastPeriod: string
  cycle: number
  /** 생리 기간(일) */
  period: number
  /** 황체기(일), 기본 14 */
  luteal: number
}

export interface Cycle {
  start: string
  periodEnd: string
  ovulation: string
  fertileStart: string
  fertileEnd: string
  /** 임신 가능성 가장 높은 날 시작(배란 2일 전) ~ 배란일 */
  peakStart: string
  nextStart: string
}

/** 생리 시작일 하나로 그 주기 계산. 배란일 = 다음 생리 예정일 − 황체기 */
export function cycleFrom(start: string, s: Omit<Settings, 'lastPeriod'>): Cycle {
  const nextStart = addDays(start, s.cycle)
  const ovulation = addDays(nextStart, -s.luteal)
  return {
    start,
    periodEnd: addDays(start, s.period - 1),
    ovulation,
    fertileStart: addDays(ovulation, -5),
    fertileEnd: addDays(ovulation, 1),
    peakStart: addDays(ovulation, -2),
    nextStart,
  }
}

/** 오늘이 속한 주기의 시작일 (마지막 생리일이 미래면 그대로) */
export function currentStart(s: Settings, today: string): string {
  const passed = daysBetween(s.lastPeriod, today)
  return passed <= 0 ? s.lastPeriod : addDays(s.lastPeriod, Math.floor(passed / s.cycle) * s.cycle)
}

/** 현재 주기부터 until(포함)까지 덮는 주기들. 직전 주기도 하나 포함(마지막 생리일 이전으로는 안 감) */
export function forecast(s: Settings, today: string, until: string): Cycle[] {
  let start = currentStart(s, today)
  if (start !== s.lastPeriod) start = addDays(start, -s.cycle)
  const out: Cycle[] = []
  for (; start <= until; start = addDays(start, s.cycle)) out.push(cycleFrom(start, s))
  return out
}

export interface Stats {
  lengths: number[]
  /** 21~45일 범위를 벗어나 평균에서 뺀 주기 수 */
  excluded: number
  avg: number
  min: number
  max: number
  /** 최단·최장 차이 8일 이상 (FIGO 2018: 26~41세 정상 ≤7일) */
  irregular: boolean
}

/** 생리 시작일 기록들 → 주기 통계. 유효 주기가 하나도 없으면 null */
export function cycleStats(dates: string[]): Stats | null {
  const sorted = [...new Set(dates)].sort()
  const all = sorted.slice(1).map((d, i) => daysBetween(sorted[i], d))
  const lengths = all.filter(n => n >= CYCLE_MIN && n <= CYCLE_MAX)
  if (!lengths.length) return null
  const min = Math.min(...lengths), max = Math.max(...lengths)
  return {
    lengths,
    excluded: all.length - lengths.length,
    avg: Math.round(lengths.reduce((a, b) => a + b, 0) / lengths.length),
    min,
    max,
    irregular: max - min >= 8,
  }
}

/**
 * 불규칙 주기의 가임 가능 범위. 황체기 14일이면 오기노식(최단−18 ~ 최장−11 일차)과 같다:
 * 가장 이른 배란(최단−황체기) 5일 전 ~ 가장 늦은 배란(최장−황체기) 2일 후.
 */
export function rangeWindow(start: string, min: number, max: number, luteal: number) {
  return { start: addDays(start, min - luteal - 5), end: addDays(start, max - luteal + 2) }
}

export type DayType = 'period' | 'ovulation' | 'peak' | 'fertile' | 'range'

export function dayType(date: string, cycles: Cycle[], ranges: { start: string; end: string }[] = []): DayType | null {
  for (const c of cycles) {
    if (date === c.ovulation) return 'ovulation'
    if (date >= c.start && date <= c.periodEnd) return 'period'
    if (date >= c.peakStart && date < c.ovulation) return 'peak'
    if (date >= c.fertileStart && date <= c.fertileEnd) return 'fertile'
  }
  return ranges.some(r => date >= r.start && date <= r.end) ? 'range' : null
}

/** 종일 일정 여러 날짜 .ics (DTEND는 다음 날, 배타적) */
export interface IcsSpan { uid: string; start: string; end: string; title: string }
export function buildIcs(spans: IcsSpan[], stamp: string): string {
  const d = (s: string) => s.replace(/-/g, '')
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//toolhub.ai.kr//ovulation-calculator//KO', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH']
  for (const e of spans) {
    lines.push(
      'BEGIN:VEVENT',
      `UID:${e.uid}@toolhub.ai.kr`,
      `DTSTAMP:${d(stamp)}T000000Z`,
      `DTSTART;VALUE=DATE:${d(e.start)}`,
      `DTEND;VALUE=DATE:${d(addDays(e.end, 1))}`,
      `SUMMARY:${icsEscape(e.title)}`,
      'TRANSP:TRANSPARENT',
      'END:VEVENT',
    )
  }
  lines.push('END:VCALENDAR')
  return lines.map(icsFold).join('\r\n') + '\r\n'
}
