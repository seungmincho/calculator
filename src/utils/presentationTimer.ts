/**
 * 프레젠테이션 타이머 순수 로직. 시간은 전부 "경과 ms" 하나로 계산한다
 * (컴포넌트가 performance.now() 차이로 경과를 구함 → 인터벌 누적 오차·백그라운드 지연 없음).
 * 체크: node scripts/check-presentation-timer.ts
 */

export interface Segment { name: string; sec: number }
export type Phase = 'normal' | 'warning' | 'overtime'
export type Alert = 'warning' | 'segment' | 'end'

export const MIN_SEG_SEC = 30
export const MAX_TOTAL_SEC = 6 * 3600
export const MAX_SEGMENTS = 20

export const totalSec = (segs: Segment[]) => segs.reduce((a, s) => a + s.sec, 0)

/** 경고 시점 기본값(분): 5분 이하 1분, 10분 이하 2분, 그 이상 3분 */
export const defaultWarnMin = (totalSeconds: number) => (totalSeconds <= 300 ? 1 : totalSeconds <= 600 ? 2 : 3)

/** URL `s` 파라미터: "도입:2,본론:8,Q&A:5" 또는 "10" (이름 없음). 분은 소수 허용. 잘못된 항목은 버림. */
export function parseSegments(raw: string | null): Segment[] | null {
  if (!raw) return null
  const segs = raw.split(',').map((part) => {
    const i = part.lastIndexOf(':')
    const name = (i >= 0 ? part.slice(0, i) : '').trim().slice(0, 30)
    const min = Number(i >= 0 ? part.slice(i + 1) : part)
    return { name, sec: Math.round(min * 60) }
  }).filter((s) => Number.isFinite(s.sec) && s.sec >= MIN_SEG_SEC && s.sec <= MAX_TOTAL_SEC)
  const out: Segment[] = []
  for (const s of segs.slice(0, MAX_SEGMENTS)) {
    if (totalSec(out) + s.sec > MAX_TOTAL_SEC) break
    out.push(s)
  }
  return out.length ? out : null
}

export function serializeSegments(segs: Segment[]): string {
  return segs.map((s) => {
    const min = String(+(s.sec / 60).toFixed(2))
    const name = s.name.replace(/[,:]/g, ' ').trim()
    return name ? `${name}:${min}` : min
  }).join(',')
}

export interface TimerState {
  totalMs: number
  remainingMs: number // 음수 = 초과
  phase: Phase
  segIndex: number
  segRemainingMs: number // 마지막 구간 초과 시 음수
  progress: number // 0~1
}

export function timerState(segs: Segment[], elapsedMs: number, warnSec: number): TimerState {
  const totalMs = totalSec(segs) * 1000
  const remainingMs = totalMs - elapsedMs
  const phase: Phase = remainingMs <= 0 ? 'overtime' : warnSec > 0 && remainingMs <= warnSec * 1000 ? 'warning' : 'normal'
  let end = 0
  let segIndex = segs.length - 1
  for (let i = 0; i < segs.length; i++) {
    end += segs[i].sec * 1000
    if (elapsedMs < end) { segIndex = i; break }
  }
  if (segIndex === segs.length - 1) end = totalMs
  return {
    totalMs, remainingMs, phase, segIndex,
    segRemainingMs: end - elapsedMs,
    progress: totalMs > 0 ? Math.min(1, Math.max(0, elapsedMs / totalMs)) : 0,
  }
}

/**
 * prev → next 경과 사이에 넘은 알림 지점 (중요도 순: end > warning > segment).
 * 탭이 백그라운드라 틱이 늦어도 한 번에 몰아서 잡고, 시간을 늘렸다가 다시 넘으면 다시 울린다.
 */
export function alertsBetween(segs: Segment[], warnSec: number, prevMs: number, nextMs: number): Alert[] {
  if (nextMs <= prevMs) return []
  const crossed = (at: number) => prevMs < at && nextMs >= at
  const total = totalSec(segs) * 1000
  const out: Alert[] = []
  if (crossed(total)) out.push('end')
  if (warnSec > 0 && warnSec * 1000 < total && crossed(total - warnSec * 1000)) out.push('warning')
  let acc = 0
  for (let i = 0; i < segs.length - 1; i++) {
    acc += segs[i].sec * 1000
    if (crossed(acc)) { out.push('segment'); break }
  }
  return out
}

/** 카운트다운 표시: 남은 시간은 올림(10:00에서 시작), 초과는 "+mm:ss". 1시간 이상 h:mm:ss */
export function formatClock(ms: number): string {
  const s = ms > 0 ? Math.ceil(ms / 1000) : Math.floor(-ms / 1000)
  const h = Math.floor(s / 3600)
  const mm = String(Math.floor((s % 3600) / 60)).padStart(2, '0')
  const ss = String(s % 60).padStart(2, '0')
  return (ms < 0 && s > 0 ? '+' : '') + (h ? `${h}:${mm}:${ss}` : `${mm}:${ss}`)
}

/** ms → 분·초 (절댓값, 초 내림) */
export function splitDuration(ms: number): { m: number; s: number } {
  const sec = Math.floor(Math.abs(ms) / 1000)
  return { m: Math.floor(sec / 60), s: sec % 60 }
}

/** idx 구간 길이를 deltaSec만큼 조절. 최소 30초·전체 6시간을 넘으면 그대로 */
export function adjustSegment(segs: Segment[], idx: number, deltaSec: number): Segment[] {
  const seg = segs[idx]
  if (!seg) return segs
  const next = seg.sec + deltaSec
  if (next < MIN_SEG_SEC || totalSec(segs) + deltaSec > MAX_TOTAL_SEC) return segs
  return segs.map((s, i) => (i === idx ? { ...s, sec: next } : s))
}
