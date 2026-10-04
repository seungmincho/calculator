// 연휴·연차 플래너 — 주5일(토·일 휴무) + 관공서 공휴일(koreanHolidays.ts, 대체공휴일 포함) 기준.
// 순수 함수. 날짜는 'YYYY-MM-DD', UTC로 계산해 브라우저 시간대와 무관.
// 연휴 = 쉬는 날(주말·공휴일)이 이어진 구간. 연차로 그 사이 평일을 메우거나 앞뒤로 늘려 만든다.
import { getKoreanHolidays, type KoreanHoliday } from './koreanHolidays.ts'

export const MAX_LEAVE = 15
export type Mode = 'total' | 'long'

export interface Day { date: string; dow: number; inYear: boolean; off: boolean; holidays: KoreanHoliday[] }
export interface Break { start: string; end: string; days: number; leave: string[]; eff: number; holidays: KoreanHoliday[] }
export interface Rec extends Break { longer?: Break }
export interface Stats {
  redDays: number // 관공서 공휴일 (일요일 포함, 같은 날 겹치면 1일)
  offDays: number // 주5일 기준 쉬는 날
  weekdayHolidays: number
  onWeekend: number // 토·일과 겹친 공휴일
  substitutes: number
  longWeekends: number // 3일 이상 이어지는 연휴 (그해 시작)
  longest: number
}
export interface Plan { year: number; days: Day[]; breaks: Break[]; totalDays: number; leaveUsed: number; recs: Rec[]; stats: Stats }

const PAD = 14 // 연말·연초 연휴가 해를 넘겨도 끊기지 않게 앞뒤 2주
const iso = (ms: number) => new Date(ms).toISOString().slice(0, 10)

/** year 앞뒤 PAD일을 포함한 날짜 배열 */
export function buildDays(year: number): Day[] {
  const hol = new Map<string, KoreanHoliday[]>()
  for (const y of [year - 1, year, year + 1]) for (const h of getKoreanHolidays(y)) hol.set(h.date, [...(hol.get(h.date) ?? []), h])
  const days: Day[] = []
  for (let ms = Date.UTC(year, 0, 1 - PAD); ms <= Date.UTC(year + 1, 0, PAD); ms += 86_400_000) {
    const date = iso(ms)
    const dow = new Date(ms).getUTCDay()
    const holidays = hol.get(date) ?? []
    days.push({ date, dow, inYear: date.startsWith(`${year}-`), off: dow === 0 || dow === 6 || holidays.length > 0, holidays })
  }
  return days
}

export interface Cand { s: number; e: number; leave: number[] }
const len = (c: Cand) => c.e - c.s + 1
const TIE = 10_000 // DP 점수 = 일수×TIE + 길이². 길이² 합 ≤ 최장(~30일)×총일수(~100) < TIE
const apart = (a: Cand, b: Cand) => a.e <= b.s - 2 || a.s >= b.e + 2 // 겹치지도, 붙지도 않음

function runsOf(days: Day[]): [number, number][] {
  const runs: [number, number][] = []
  days.forEach((d, i) => {
    if (!d.off) return
    const last = runs[runs.length - 1]
    if (last && last[1] === i - 1) last[1] = i
    else runs.push([i, i])
  })
  return runs
}

/**
 * 연휴 후보: 쉬는 날 묶음 i..j 사이 평일을 모두 연차로 메우고, 앞뒤로 a·b일 더 붙인 구간.
 * 연차는 그해 평일만, from(YYYY-MM-DD) 이전에 시작하는 연휴는 제외. 연차 1~budget일.
 */
export function candidates(days: Day[], budget: number, from: string): Cand[] {
  const ok = (i: number) => i >= 0 && i < days.length && !days[i].off && days[i].inYear && days[i].date >= from
  const stretch = (start: number, step: number, cap: number) => { let n = 0; while (n < cap && ok(start + step * n)) n++; return n }
  const range = (a: number, b: number) => Array.from({ length: Math.max(0, b - a + 1) }, (_, k) => a + k)
  const runs = runsOf(days)
  const out: Cand[] = []
  for (let i = 0; i < runs.length; i++) {
    const [rs] = runs[i]
    const maxA = stretch(rs - 1, -1, rs - (i ? runs[i - 1][1] : -1) - 2) // 앞 묶음에 닿기 직전까지
    const gap: number[] = []
    for (let j = i; j < runs.length; j++) {
      if (j > i) {
        const g = range(runs[j - 1][1] + 1, runs[j][0] - 1)
        if (!g.every(ok)) break
        gap.push(...g)
        if (gap.length > budget) break
      }
      const re = runs[j][1]
      const maxB = stretch(re + 1, 1, (j + 1 < runs.length ? runs[j + 1][0] : days.length) - re - 2)
      for (let a = 0; a <= maxA; a++) {
        if (days[rs - a].date < from) continue
        for (let b = 0; b <= maxB; b++) {
          const L = gap.length + a + b
          if (L < 1 || L > budget) continue
          out.push({ s: rs - a, e: re + b, leave: [...range(rs - a, rs - 1), ...gap, ...range(re + 1, re + b)] })
        }
      }
    }
  }
  return out
}

/**
 * 겹치지 않는 후보 조합 중 연휴 일수 합이 최대인 것 (구간 스케줄링 + 연차 예산 DP).
 * 합이 같으면 긴 연휴 위주(길이 제곱합 큰 쪽), 그것도 같으면 연차를 덜 쓰는 쪽.
 */
function best(cands: Cand[], budget: number): Cand[] {
  if (budget <= 0 || !cands.length) return []
  const cs = [...cands].sort((x, y) => x.e - y.e || x.s - y.s)
  const n = cs.length, W = budget + 1
  const dp = new Int32Array((n + 1) * W), take = new Uint8Array((n + 1) * W), prev = new Int32Array(n + 1)
  for (let i = 1; i <= n; i++) {
    const c = cs[i - 1]
    let lo = 0, hi = i - 1 // 끝이 c.s-2 이하인 후보 개수
    while (lo < hi) { const m = (lo + hi) >> 1; if (cs[m].e <= c.s - 2) lo = m + 1; else hi = m }
    prev[i] = lo
    const L = c.leave.length
    for (let b = 0; b <= budget; b++) {
      let v = dp[(i - 1) * W + b]
      if (L <= b) { const w = dp[lo * W + b - L] + len(c) * TIE + len(c) ** 2; if (w > v) { v = w; take[i * W + b] = 1 } }
      dp[i * W + b] = v
    }
  }
  let b = 0
  while (dp[n * W + b] < dp[n * W + budget]) b++
  const out: Cand[] = []
  for (let i = n; i > 0;) {
    if (take[i * W + b]) { const c = cs[i - 1]; out.push(c); b -= c.leave.length; i = prev[i] } else i--
  }
  return out.reverse()
}

export function plan(year: number, budget: number, mode: Mode = 'total', from = ''): Plan {
  const days = buildDays(year)
  const k = Math.max(0, Math.min(MAX_LEAVE, Math.floor(budget)))
  const cands = candidates(days, k, from)
  const toBreak = (c: Cand): Break => {
    const hs = days.slice(c.s, c.e + 1).flatMap((d) => d.holidays)
    return { start: days[c.s].date, end: days[c.e].date, days: len(c), leave: c.leave.map((i) => days[i].date), eff: len(c) / c.leave.length, holidays: hs }
  }

  let chosen: Cand[]
  if (mode === 'long' && cands.length) {
    // 가장 긴 연휴 하나를 먼저 고르고(같으면 연차 적게·이른 날짜), 남은 연차로 총 일수 최대
    const top = cands.reduce((a, c) => (len(c) - len(a) || a.leave.length - c.leave.length || a.s - c.s) > 0 ? c : a)
    chosen = [...best(cands.filter((c) => apart(c, top)), k - top.leave.length), top].sort((x, y) => x.s - y.s)
  } else chosen = best(cands, k)

  // 추천: 평일 공휴일이 낀 후보를 효율(연휴 일수 ÷ 연차) 순으로, 서로 겹치지 않게
  const weekdayHoliday = (c: Cand) => days.slice(c.s, c.e + 1).some((d) => d.holidays.length && d.dow % 6 !== 0)
  const eff = (c: Cand) => len(c) / c.leave.length
  const pool = cands.filter((c) => eff(c) >= 3 && weekdayHoliday(c)).sort((x, y) => eff(y) - eff(x) || len(y) - len(x) || x.s - y.s)
  const picked: Cand[] = []
  for (const c of pool) if (picked.every((r) => apart(r, c))) picked.push(c)
  const recs: Rec[] = picked.map((r) => {
    // 같은 시기에 연차를 더 써서 더 길게: 덤으로 얻는 휴일(일수−연차)이 더 많은 것 중 최대 (1일당 2.5일 이상만)
    const free = (c: Cand) => len(c) - c.leave.length
    const longer = cands
      .filter((c) => c.s <= r.e && c.e >= r.s && free(c) > free(r) && eff(c) >= 2.5)
      .reduce<Cand | undefined>((a, c) => (!a || (free(c) - free(a) || a.leave.length - c.leave.length || a.s - c.s) > 0 ? c : a), undefined)
    return { ...toBreak(r), longer: longer && toBreak(longer) }
  })

  const breaks = chosen.map(toBreak)
  return {
    year, days, breaks, recs,
    totalDays: breaks.reduce((s, b) => s + b.days, 0),
    leaveUsed: breaks.reduce((s, b) => s + b.leave.length, 0),
    stats: stats(days),
  }
}

export function stats(days: Day[]): Stats {
  const y = days.filter((d) => d.inYear)
  const runs = runsOf(days).filter(([s]) => days[s].inYear).map(([s, e]) => e - s + 1)
  return {
    redDays: y.filter((d) => d.dow === 0 || d.holidays.length).length,
    offDays: y.filter((d) => d.off).length,
    weekdayHolidays: y.filter((d) => d.holidays.length && d.dow % 6 !== 0).length,
    onWeekend: y.filter((d) => d.holidays.length && d.dow % 6 === 0).length,
    substitutes: y.filter((d) => d.holidays.some((h) => h.nameKey === 'substituteHoliday')).length,
    longWeekends: runs.filter((n) => n >= 3).length,
    longest: Math.max(0, ...runs),
  }
}

// ── 캘린더(.ics, RFC 5545) ──
const esc = (s: string) => s.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/([,;])/g, '\\$1')
/** 75옥텟마다 줄 접기 (UTF-8 글자 중간에서 자르지 않음) */
const enc = new TextEncoder()
function fold(line: string): string {
  const out: string[] = []
  let cur = '', bytes = 0
  for (const ch of line) {
    const n = enc.encode(ch).length
    if (bytes + n > (out.length ? 74 : 75)) { out.push(cur); cur = ''; bytes = 0 }
    cur += ch; bytes += n
  }
  out.push(cur)
  return out.join('\r\n ')
}
const ymd = (date: string) => date.replace(/-/g, '')
const nextDay = (date: string) => { const [y, m, d] = date.split('-').map(Number); return iso(Date.UTC(y, m - 1, d + 1)) }

/** 종일 일정 묶음 → .ics 텍스트. stamp = 생성 시각(ms) */
export function toIcs(events: { date: string; summary: string; description?: string }[], stamp: number, calName = '연차 계획'): string {
  const dt = new Date(stamp).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//toolhub.ai.kr//holiday-planner//KO', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH', `X-WR-CALNAME:${esc(calName)}`]
  for (const ev of events) {
    lines.push(
      'BEGIN:VEVENT',
      `UID:${ymd(ev.date)}-leave@holiday-planner.toolhub.ai.kr`,
      `DTSTAMP:${dt}`,
      `DTSTART;VALUE=DATE:${ymd(ev.date)}`,
      `DTEND;VALUE=DATE:${ymd(nextDay(ev.date))}`,
      `SUMMARY:${esc(ev.summary)}`,
      ...(ev.description ? [`DESCRIPTION:${esc(ev.description)}`] : []),
      'TRANSP:OPAQUE',
      'END:VEVENT',
    )
  }
  lines.push('END:VCALENDAR')
  return lines.map(fold).join('\r\n') + '\r\n'
}
