// 타이머·스톱워치 순수 로직. 시간은 전부 "기준 시각(ms) + 현재 시각"으로 계산 → setInterval이 늦게 와도(백그라운드 탭) 드리프트 없음.

export const MAX_SEC = 99 * 3600 + 59 * 60 + 59

// ── 카운트다운 ──
export type CountdownStatus = 'idle' | 'running' | 'paused' | 'done'
export interface Countdown {
  status: CountdownStatus
  durationMs: number // 진행률 분모 (+1분 하면 같이 늘어남)
  endAt: number // running일 때만 의미: 끝나는 시각(Date.now 기준)
  leftMs: number // paused/idle일 때 남은 시간
}

export const IDLE: Countdown = { status: 'idle', durationMs: 0, endAt: 0, leftMs: 0 }

export const start = (ms: number, now: number): Countdown => ({ status: 'running', durationMs: ms, endAt: now + ms, leftMs: ms })

export const left = (c: Countdown, now: number): number =>
  c.status === 'running' ? Math.max(0, c.endAt - now) : c.status === 'done' ? 0 : c.leftMs

export const pause = (c: Countdown, now: number): Countdown =>
  c.status === 'running' ? { ...c, status: 'paused', leftMs: left(c, now) } : c

export const resume = (c: Countdown, now: number): Countdown =>
  c.status === 'paused' ? { ...c, status: 'running', endAt: now + c.leftMs } : c

/** +1분: 실행 중이면 끝나는 시각을, 일시정지면 남은 시간을 늘림. 끝난 뒤엔 그 시간만큼 새로 시작 */
export const addTime = (c: Countdown, ms: number, now: number): Countdown => {
  if (c.status === 'running') return { ...c, durationMs: c.durationMs + ms, endAt: c.endAt + ms }
  if (c.status === 'paused') return { ...c, durationMs: c.durationMs + ms, leftMs: c.leftMs + ms }
  if (c.status === 'done') return start(ms, now)
  return c
}

// ── 스톱워치 ──
export interface Stopwatch {
  startAt: number | null // 실행 중이면 마지막 시작 시각
  accMs: number // 이전 실행 구간 누적
  laps: number[] // 랩 찍은 순간의 누적 시간
}
export const SW_IDLE: Stopwatch = { startAt: null, accMs: 0, laps: [] }
export const elapsed = (s: Stopwatch, now: number) => s.accMs + (s.startAt === null ? 0 : now - s.startAt)
export const swToggle = (s: Stopwatch, now: number): Stopwatch =>
  s.startAt === null ? { ...s, startAt: now } : { ...s, startAt: null, accMs: elapsed(s, now) }
export const swLap = (s: Stopwatch, now: number): Stopwatch => (s.startAt === null ? s : { ...s, laps: [...s.laps, elapsed(s, now)] })

export interface LapStats {
  splits: number[] // 랩 간격
  fastest: number // index, 랩 2개 미만이면 -1
  slowest: number
  average: number
}
export function lapStats(totals: number[]): LapStats {
  const splits = totals.map((v, i) => v - (i ? totals[i - 1] : 0))
  let fastest = -1, slowest = -1
  if (splits.length >= 2) {
    fastest = 0; slowest = 0
    splits.forEach((v, i) => { if (v < splits[fastest]) fastest = i; if (v > splits[slowest]) slowest = i })
  }
  const average = splits.length ? totals[totals.length - 1] / splits.length : 0
  return { splits, fastest, slowest, average }
}

export function lapsCsv(totals: number[], header: [string, string, string]): string {
  const { splits } = lapStats(totals)
  return [header.join(','), ...totals.map((v, i) => `${i + 1},${formatClock(splits[i], { cs: true })},${formatClock(v, { cs: true })}`)].join('\n')
}

// ── 표시 ──
const p2 = (n: number) => String(n).padStart(2, '0')

/**
 * mm:ss / hh:mm:ss (1시간 이상) + cs 옵션이면 .cc
 * 카운트다운(down)은 초를 올림 → 5:00에서 시작해 정확히 끝나는 순간 00:00
 */
export function formatClock(ms: number, { cs = false, down = false }: { cs?: boolean; down?: boolean } = {}): string {
  ms = Math.max(0, ms)
  const total = down ? Math.ceil(ms / 1000) : Math.floor(ms / 1000)
  const h = Math.floor(total / 3600), m = Math.floor((total % 3600) / 60), s = total % 60
  const base = h ? `${p2(h)}:${p2(m)}:${p2(s)}` : `${p2(m)}:${p2(s)}`
  return cs ? `${base}.${p2(Math.floor((ms % 1000) / 10))}` : base
}

export const splitSec = (sec: number) => ({ h: Math.floor(sec / 3600), m: Math.floor((sec % 3600) / 60), s: sec % 60 })

/** 시·분·초 입력(문자열 허용) → 초. 분·초가 60 넘어도 합산(90분 = 1:30:00), 최대 99:59:59 */
export function hmsToSec(h: string | number, m: string | number, s: string | number): number {
  const n = (v: string | number) => Math.max(0, Math.floor(Number(v) || 0))
  return Math.min(MAX_SEC, n(h) * 3600 + n(m) * 60 + n(s))
}

// ── URL ──
/** ?t=600(초) 또는 ?m=10(분, 소수 허용) / ?mode=stopwatch */
export function parseQuery(search: string): { sec: number | null; mode: 'timer' | 'stopwatch' | null } {
  const q = new URLSearchParams(search)
  const mode = q.get('mode') === 'stopwatch' ? 'stopwatch' : q.get('mode') === 'timer' ? 'timer' : null
  const raw = q.get('t') !== null ? Number(q.get('t')) : q.get('m') !== null ? Number(q.get('m')) * 60 : NaN
  const sec = Number.isFinite(raw) && raw >= 1 ? Math.min(MAX_SEC, Math.round(raw)) : null
  return { sec, mode: sec !== null && !mode ? 'timer' : mode }
}

export const shareQuery = (sec: number) => (sec % 60 === 0 ? `m=${sec / 60}` : `t=${sec}`)
