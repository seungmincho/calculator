// 시간 변환 순수 로직 — Intl(IANA tz)만 사용, 오프셋 하드코딩 없음. 검증: node scripts/check-time-convert.ts
import { localParts, offsetMin } from './worldClock.ts'
import { getKoreanHolidays } from './koreanHolidays.ts'

const pad = (n: number, w = 2) => String(n).padStart(w, '0')
const DAY = 86400000
const WD = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const MAX_MS = 8.64e15 // JS Date 한계

export interface Wall { y: number; mo: number; d: number; h: number; mi: number; s: number }
export type WallStatus = 'ok' | 'gap' | 'ambiguous'

export const daysInMonth = (y: number, mo: number) => new Date(Date.UTC(y, mo, 0)).getUTCDate()
const validWall = (w: Wall) =>
  w.mo >= 1 && w.mo <= 12 && w.d >= 1 && w.d <= daysInMonth(w.y, w.mo) && w.h <= 23 && w.mi <= 59 && w.s <= 59

/**
 * tz 벽시계 시각 → epoch ms.
 * 서머타임 갭(존재하지 않는 시각)은 전환 전 오프셋으로 해석해 뒤로 밀고, 중복 시각(가을)은 앞선 쪽 — Temporal 'compatible'과 같음.
 */
export function wallToUtc(tz: string, w: Wall): { ms: number; status: WallStatus } {
  const wall = Date.UTC(w.y, w.mo - 1, w.d, w.h, w.mi, w.s)
  const before = offsetMin(tz, wall - DAY)
  const after = offsetMin(tz, wall + DAY)
  const same = (ms: number) => {
    const l = localParts(tz, ms)
    return l.y === w.y && l.mo === w.mo && l.d === w.d && l.h === w.h && l.mi === w.mi && l.s === w.s
  }
  const cands = [...new Set([before, after])].map(o => wall - o * 60000).filter(same).sort((a, b) => a - b)
  if (!cands.length) return { ms: wall - before * 60000, status: 'gap' }
  return { ms: cands[0], status: cands.length > 1 ? 'ambiguous' : 'ok' }
}

export function wallOf(tz: string, ms: number): Wall {
  const { y, mo, d, h, mi, s } = localParts(tz, ms)
  return { y, mo, d, h, mi, s }
}

/** "2026-10-01T12:00:00" (datetime-local 값) */
export const wallInput = (w: Wall) => `${pad(w.y, 4)}-${pad(w.mo)}-${pad(w.d)}T${pad(w.h)}:${pad(w.mi)}:${pad(w.s)}`
export function parseWallInput(v: string): Wall | null {
  const m = v.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?/)
  if (!m) return null
  const w = { y: +m[1], mo: +m[2], d: +m[3], h: +m[4], mi: +m[5], s: +(m[6] ?? 0) }
  return validWall(w) ? w : null
}

// ── 타임스탬프 ──
export type EpochUnit = 's' | 'ms' | 'us' | 'ns'
/** 숫자 문자열 → epoch ms. 자릿수로 단위 추정: ≤11 초, 12–14 밀리초, 15–17 마이크로초, 18–19 나노초 */
export function parseEpoch(str: string): { ms: number; unit: EpochUnit } | null {
  const m = str.trim().match(/^(-?)(\d{1,19})(?:\.(\d+))?$/)
  if (!m) return null
  const len = m[2].replace(/^0+/, '').length || 1
  const unit: EpochUnit = len <= 11 ? 's' : len <= 14 ? 'ms' : len <= 17 ? 'us' : 'ns'
  const v = Number(`${m[1]}${m[2]}${m[3] ? '.' + m[3] : ''}`)
  const ms = unit === 's' ? Math.round(v * 1000) : Math.floor(v / { ms: 1, us: 1e3, ns: 1e6 }[unit])
  return Math.abs(ms) <= MAX_MS ? { ms, unit } : null
}

const offStr = (min: number, colon: boolean) => {
  const a = Math.abs(min)
  return `${min < 0 ? '-' : '+'}${pad(Math.floor(a / 60))}${colon ? ':' : ''}${pad(a % 60)}`
}

/** "EDT", "BST" 같은 약어. 없으면(GMT+9 형태) '' */
export function tzAbbr(tz: string, ms: number): string {
  try {
    const p = new Intl.DateTimeFormat('en-US', { timeZone: tz, timeZoneName: 'short' }).formatToParts(new Date(ms))
    const v = p.find(x => x.type === 'timeZoneName')?.value ?? ''
    return /^(GMT|UTC)[+-]/.test(v) ? '' : v
  } catch { return '' }
}

export interface Formats { unixS: string; unixMs: string; isoUtc: string; iso: string; rfc2822: string; sql: string }
export function formatAll(ms: number, tz: string): Formats {
  const l = localParts(tz, ms)
  const off = offsetMin(tz, ms)
  const frac = ((ms % 1000) + 1000) % 1000
  const date = `${pad(l.y, 4)}-${pad(l.mo)}-${pad(l.d)}`
  const time = `${pad(l.h)}:${pad(l.mi)}:${pad(l.s)}`
  return {
    unixS: String(Math.floor(ms / 1000)),
    unixMs: String(ms),
    isoUtc: new Date(ms).toISOString(),
    iso: `${date}T${time}${frac ? '.' + pad(frac, 3) : ''}${offStr(off, true)}`,
    rfc2822: `${WD[l.wd]}, ${pad(l.d)} ${MON[l.mo - 1]} ${l.y} ${time} ${offStr(off, false)}`,
    sql: `${date} ${time}`,
  }
}

/** "3시간 전", "2일 후", "어제" — 큰 단위로 버림 */
export function relative(ms: number, now: number, locale: string): string {
  const sec = (ms - now) / 1000
  const a = Math.abs(sec)
  const [v, u]: [number, Intl.RelativeTimeFormatUnit] =
    a < 60 ? [sec, 'second'] : a < 3600 ? [sec / 60, 'minute'] : a < 86400 ? [sec / 3600, 'hour']
      : a < 86400 * 30 ? [sec / 86400, 'day'] : a < 86400 * 365 ? [sec / (86400 * 30.4375), 'month'] : [sec / (86400 * 365.25), 'year']
  return new Intl.RelativeTimeFormat(locale, { numeric: 'auto' }).format(Math.trunc(v) || 0, u)
}

// ── 날짜(YYYY-MM-DD) · 영업일 ──
const dayIdx = (y: number, mo: number, d: number) => Date.UTC(y, mo - 1, d) / DAY
const idxDate = (n: number) => {
  const d = new Date(n * DAY)
  return `${pad(d.getUTCFullYear(), 4)}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`
}
const hcache = new Map<number, Set<string>>()
const holidays = (y: number) => {
  let s = hcache.get(y)
  if (!s) { s = new Set(getKoreanHolidays(y).map(h => h.date)); hcache.set(y, s) }
  return s
}
/** 평일이고 관공서 공휴일(대체공휴일 포함)이 아니면 영업일 */
export function isBusinessDay(n: number): boolean {
  const wd = new Date(n * DAY).getUTCDay()
  const date = idxDate(n)
  return wd !== 0 && wd !== 6 && !holidays(+date.slice(0, 4)).has(date)
}
const BD_RANGE = 366 * 200

/** from 다음 날부터 to까지(포함) 영업일 수. from > to면 음수. 범위가 200년 넘으면 null */
export function businessDaysBetween(from: number, to: number): number | null {
  const [lo, hi] = from <= to ? [from, to] : [to, from]
  if (hi - lo > BD_RANGE) return null
  let n = 0
  for (let i = lo + 1; i <= hi; i++) if (isBusinessDay(i)) n++
  return from <= to ? n : -n
}

// ── 날짜 계산 ──
export type AddUnit = 'y' | 'mo' | 'w' | 'd' | 'bd' | 'h' | 'mi' | 's'
export const ADD_UNITS: AddUnit[] = ['y', 'mo', 'w', 'd', 'bd', 'h', 'mi', 's']

/**
 * 년·월·주·일·영업일은 tz의 달력 기준(벽시계 시각 유지, 말일은 그 달 마지막 날로), 시·분·초는 경과 시간.
 * 예: 뉴욕 3/7 12:00 + 1일 = 3/8 12:00 (서머타임 시작으로 실제 23시간)
 */
export function addTime(ms: number, tz: string, n: number, unit: AddUnit): number {
  if (unit === 'h' || unit === 'mi' || unit === 's') return ms + n * { h: 3600000, mi: 60000, s: 1000 }[unit]
  const w = wallOf(tz, ms)
  if (unit === 'y' || unit === 'mo') {
    const total = w.y * 12 + (w.mo - 1) + n * (unit === 'y' ? 12 : 1)
    w.y = Math.floor(total / 12)
    w.mo = total - w.y * 12 + 1
    w.d = Math.min(w.d, daysInMonth(w.y, w.mo))
  } else {
    let k = dayIdx(w.y, w.mo, w.d)
    if (unit === 'bd') {
      const step = Math.sign(n)
      for (let left = Math.abs(n); left > 0;) { k += step; if (isBusinessDay(k)) left-- }
    } else k += n * (unit === 'w' ? 7 : 1)
    const d = new Date(k * DAY)
    w.y = d.getUTCFullYear(); w.mo = d.getUTCMonth() + 1; w.d = d.getUTCDate()
  }
  return wallToUtc(tz, w).ms + (((ms % 1000) + 1000) % 1000)
}

export interface Diff {
  sign: number; days: number; hours: number; minutes: number; seconds: number
  totalSeconds: number; calendarDays: number; businessDays: number | null
}
/** a → b. 경과 시간(일=24시간) + tz 달력 기준 날짜 차이·영업일 */
export function diffTime(a: number, b: number, tz: string): Diff {
  const s = Math.floor(Math.abs(b - a) / 1000)
  const la = localParts(tz, a), lb = localParts(tz, b)
  const ia = dayIdx(la.y, la.mo, la.d), ib = dayIdx(lb.y, lb.mo, lb.d)
  return {
    sign: Math.sign(b - a),
    days: Math.floor(s / 86400), hours: Math.floor((s % 86400) / 3600), minutes: Math.floor((s % 3600) / 60), seconds: s % 60,
    totalSeconds: s,
    calendarDays: ib - ia,
    businessDays: businessDaysBetween(ia, ib),
  }
}

// ── 아무 문자열 파싱 ──
export type ParseKind = 'epoch' | 'iso' | 'wall' | 'text' | 'now'
export interface Parsed { ms: number; kind: ParseKind; unit?: EpochUnit; status?: WallStatus }

const ZONE_ABBR: Record<string, number> = { Z: 0, UTC: 0, GMT: 0, KST: 540, JST: 540 }
const zoneMin = (z: string): number => {
  const u = z.toUpperCase()
  if (u in ZONE_ABBR) return ZONE_ABBR[u]
  const m = z.match(/^([+-])(\d{2}):?(\d{2})?$/)!
  return (m[1] === '-' ? -1 : 1) * (+m[2] * 60 + +(m[3] ?? 0))
}
const at = (tz: string, w: Wall, frac = 0): Parsed | null => {
  if (!validWall(w)) return null
  const r = wallToUtc(tz, w)
  return { ms: r.ms + frac, kind: 'wall', status: r.status }
}
const h12 = (h: number, ap?: string) => {
  if (!ap) return h
  const pm = /pm|오후/i.test(ap)
  return (h % 12) + (pm ? 12 : 0)
}

/**
 * 타임스탬프(s/ms/µs/ns), ISO 8601(오프셋 있으면 그대로, 없으면 tz 벽시계), 2026.10.01·2026/10/01,
 * 10/01/2026 3:00 PM, 2026년 10월 1일 오후 3시, RFC 2822, now/지금/어제/내일. 로그 한 줄에 섞여 있어도 찾음.
 */
export function parseAny(text: string, tz: string, now: number): Parsed | null {
  const s = text.trim()
  if (!s) return null
  const e = parseEpoch(s)
  if (e) return { ms: e.ms, kind: 'epoch', unit: e.unit }

  const k = s.toLowerCase()
  if (/^(now|지금|today|오늘)$/.test(k)) return { ms: now, kind: 'now' }
  if (/^(yesterday|어제)$/.test(k)) return { ms: addTime(now, tz, -1, 'd'), kind: 'now' }
  if (/^(tomorrow|내일)$/.test(k)) return { ms: addTime(now, tz, 1, 'd'), kind: 'now' }

  // ISO 8601 / 2026-10-01 12:00 / 2026.10.01 / 2026/10/01
  let m = s.match(/(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})(?:[T\s]+(\d{1,2}):(\d{2})(?::(\d{2})(?:[.,](\d{1,9}))?)?)?(?:\s*(Z|UTC|GMT|KST|JST|[+-]\d{2}(?::?\d{2})?)(?![\d:]))?/i)
  if (m) {
    const w = { y: +m[1], mo: +m[2], d: +m[3], h: +(m[4] ?? 0), mi: +(m[5] ?? 0), s: +(m[6] ?? 0) }
    const frac = m[7] ? +m[7].slice(0, 3).padEnd(3, '0') : 0
    if (m[8] && m[4] !== undefined) {
      if (!validWall(w)) return null
      return { ms: Date.UTC(w.y, w.mo - 1, w.d, w.h, w.mi, w.s) + frac - zoneMin(m[8]) * 60000, kind: 'iso' }
    }
    return at(tz, w, frac)
  }
  // 2026년 10월 1일 (목) 오후 3시 30분 / 15:30
  m = s.match(/(\d{4})\s*년\s*(\d{1,2})\s*월\s*(\d{1,2})\s*일\s*(?:\([^)]*\))?\s*(오전|오후)?\s*(?:(\d{1,2})\s*(?:시|:)\s*(?:(\d{1,2})\s*분?)?(?:\s*:?\s*(\d{1,2})\s*초?)?)?/)
  if (m) return at(tz, { y: +m[1], mo: +m[2], d: +m[3], h: h12(+(m[5] ?? 0), m[4]), mi: +(m[6] ?? 0), s: +(m[7] ?? 0) })
  // 미국식 10/01/2026 3:00 PM
  m = s.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)?)?/i)
  if (m) return at(tz, { y: +m[3], mo: +m[1], d: +m[2], h: h12(+(m[4] ?? 0), m[7]), mi: +(m[5] ?? 0), s: +(m[6] ?? 0) })
  // 로그 속 타임스탬프
  m = s.match(/(?<![\d.])(\d{10,19})(?![\d.])/)
  if (m) { const p = parseEpoch(m[1]); if (p) return { ms: p.ms, kind: 'epoch', unit: p.unit } }
  // RFC 2822 등 영문 월 이름 (Date.parse). 시간대 표기가 없으면 tz 벽시계로 재해석
  if (/\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)/i.test(s)) {
    const v = Date.parse(s)
    if (Number.isNaN(v)) return null
    if (/\b(GMT|UTC|UT|Z|[ECMP][SD]T)\b|\s[+-]\d{2}:?\d{2}\b/.test(s)) return { ms: v, kind: 'text' }
    const d = new Date(v)
    const r = at(tz, { y: d.getFullYear(), mo: d.getMonth() + 1, d: d.getDate(), h: d.getHours(), mi: d.getMinutes(), s: d.getSeconds() })
    return r && { ...r, kind: 'text' }
  }
  return null
}
