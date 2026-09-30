/**
 * 소음 측정기 순수 로직 (브라우저 API 없음 → node로 검증: scripts/check-noise-meter.ts)
 * - dBFS: 디지털 풀스케일 기준 레벨. 휴대폰 마이크는 보정이 안 돼 있으므로
 *   표시값 = dBFS + 보정값(offset) 은 어디까지나 "추정치"다.
 * - Leq: 에너지(10^(L/10)) 평균 후 다시 dB로. 산술평균 dB는 과소평가된다.
 */

export const DB_FLOOR = -120 // dBFS 하한 (무음 → -Infinity 방지)
export const DEFAULT_OFFSET = 94 // dBFS → dB 추정 기본 보정값 (일반 스마트폰 마이크 대략치)

export function meanSquare(buf: ArrayLike<number>): number {
  let s = 0
  for (let i = 0; i < buf.length; i++) s += buf[i] * buf[i]
  return buf.length ? s / buf.length : 0
}

export function msToDbfs(ms: number): number {
  return ms > 0 ? Math.max(DB_FLOOR, 10 * Math.log10(ms)) : DB_FLOOR
}

/** RMS(진폭) → dBFS. 20·log10(rms) */
export function rmsToDbfs(rms: number): number {
  return msToDbfs(rms * rms)
}

/** 에너지 평균 Leq. levels는 dB 값 배열 */
export function leq(levels: ArrayLike<number>): number {
  if (!levels.length) return DB_FLOOR
  let e = 0
  for (let i = 0; i < levels.length; i++) e += 10 ** (levels[i] / 10)
  return 10 * Math.log10(e / levels.length)
}

/** 누적 Leq용: 에너지 합 + 개수 (세션 전체를 배열로 들고 있지 않기 위해) */
export interface EnergyAcc { sum: number; n: number }
export const accAdd = (a: EnergyAcc, db: number) => { a.sum += 10 ** (db / 10); a.n++ }
export const accLeq = (a: EnergyAcc) => (a.n ? 10 * Math.log10(a.sum / a.n) : DB_FLOOR)

// ── A-가중 (IEC 61672) ──
const F1 = 20.598997, F2 = 107.65265, F3 = 737.86223, F4 = 12194.217

/** 아날로그 A-가중 기준 곡선 (dB), 1 kHz ≈ 0 dB */
export function aWeightingDb(f: number): number {
  const f2 = f * f
  const ra = (F4 ** 2 * f2 * f2) / ((f2 + F1 ** 2) * Math.sqrt((f2 + F2 ** 2) * (f2 + F3 ** 2)) * (f2 + F4 ** 2))
  return 20 * Math.log10(ra) + 2.0
}

export interface Biquad { b: [number, number, number]; a: [number, number, number] }

/** s-영역 2차 (분자 n2 s² + n1 s + n0) / (s² + d1 s + d0) → 쌍선형 변환 */
function bilinear(n: [number, number, number], d: [number, number, number], fs: number): Biquad {
  const k = 2 * fs, k2 = k * k
  const [n2, n1, n0] = n, [d2, d1, d0] = d
  const a0 = d2 * k2 + d1 * k + d0
  return {
    b: [(n2 * k2 + n1 * k + n0) / a0, (2 * n0 - 2 * n2 * k2) / a0, (n2 * k2 - n1 * k + n0) / a0],
    a: [1, (2 * d0 - 2 * d2 * k2) / a0, (d2 * k2 - d1 * k + d0) / a0],
  }
}

/** 복소 주파수 응답 크기 (dB) */
export function biquadGainDb(q: Biquad[], f: number, fs: number): number {
  const w = (2 * Math.PI * f) / fs
  let mag = 1
  for (const { b, a } of q) {
    const re = (c: number[]) => c[0] + c[1] * Math.cos(w) + c[2] * Math.cos(2 * w)
    const im = (c: number[]) => -(c[1] * Math.sin(w) + c[2] * Math.sin(2 * w))
    mag *= Math.hypot(re(b), im(b)) / Math.hypot(re(a), im(a))
  }
  return 20 * Math.log10(mag)
}

/**
 * A-가중 필터를 2차 구간(biquad) 3개로 근사 (Web Audio IIRFilterNode 3단).
 * H(s) = K s⁴ / ((s+ω1)² (s+ω2)(s+ω3) (s+ω4)²)
 * 쌍선형 변환이라 10 kHz 이상은 기준보다 조금 더 깎인다(48 kHz에서 10 kHz ≈ -1 dB 추가) — 생활 소음 측정엔 영향 미미.
 */
export function aWeightingBiquads(fs: number): Biquad[] {
  const w = (f: number) => 2 * Math.PI * f
  const [w1, w2, w3, w4] = [w(F1), w(F2), w(F3), w(F4)]
  const q = [
    bilinear([1, 0, 0], [1, 2 * w1, w1 * w1], fs),
    bilinear([1, 0, 0], [1, w2 + w3, w2 * w3], fs),
    bilinear([0, 0, 1], [1, 2 * w4, w4 * w4], fs),
  ]
  // 1 kHz 에서 0 dB 가 되도록 마지막 구간 분자 스케일
  const g = 10 ** (-biquadGainDb(q, 1000, fs) / 20)
  q[2].b = q[2].b.map(v => v * g) as Biquad['b']
  return q
}

// ── 층간소음 기준 (공동주택 층간소음의 범위와 기준에 관한 규칙, 2023.1.2 시행) ──
export type Period = 'day' | 'night'
/** 주간 06:00~22:00, 야간 22:00~06:00 */
export const periodAt = (d: Date): Period => (d.getHours() >= 6 && d.getHours() < 22 ? 'day' : 'night')

export const FLOOR_NOISE = {
  day: { leq1m: 39, max: 57 },
  night: { leq1m: 34, max: 52 },
  /** 2005.6.30 이전 사업승인 공동주택: 2025.1.1부터 +2dB (2024년까지는 +5dB) */
  oldBuildingBonus: 2,
  /** 최고소음도는 1시간 내 3회 이상 초과 시 기준 초과 */
  maxCountPerHour: 3,
} as const

export function floorLimits(p: Period, oldBuilding: boolean) {
  const add = oldBuilding ? FLOOR_NOISE.oldBuildingBonus : 0
  return { leq1m: FLOOR_NOISE[p].leq1m + add, max: FLOOR_NOISE[p].max + add }
}

/**
 * 순간 레벨 초과 이벤트 검출 (히스테리시스).
 * 레벨이 threshold 초과 → 시작, holdMs 동안 계속 threshold 이하 → 종료.
 * 스트리밍으로 쓰기 위해 상태를 넘겨받는다.
 */
export interface PeakState { active: boolean; start: number; peak: number; lastAbove: number }
export interface PeakEvent { start: number; end: number; peak: number }
export const newPeakState = (): PeakState => ({ active: false, start: 0, peak: -Infinity, lastAbove: 0 })

export function stepPeak(s: PeakState, t: number, db: number, threshold: number, holdMs = 1000):
  { started?: boolean; ended?: PeakEvent } {
  if (db > threshold) {
    s.lastAbove = t
    if (!s.active) { s.active = true; s.start = t; s.peak = db; return { started: true } }
    if (db > s.peak) s.peak = db
    return {}
  }
  if (s.active && t - s.lastAbove >= holdMs) {
    s.active = false
    return { ended: { start: s.start, end: s.lastAbove, peak: s.peak } }
  }
  return {}
}

/** 최근 windowMs 안의 이벤트 개수 (최고소음도 1시간 3회 판정용) */
export const countSince = (times: number[], now: number, windowMs = 3600_000) =>
  times.filter(t => now - t < windowMs).length

/** 레벨 분포 (10 dB 구간). levels는 1 dB 정수 bin 카운트: key = dB */
export function histogram10(bins: Map<number, number>, lo = 30, hi = 90): { from: number; to: number; pct: number }[] {
  let total = 0
  bins.forEach(c => { total += c })
  const out: { from: number; to: number; pct: number }[] = []
  for (let from = lo - 10; from <= hi; from += 10) out.push({ from, to: from + 10, pct: 0 })
  if (!total) return out
  bins.forEach((c, db) => {
    const i = Math.min(out.length - 1, Math.max(0, Math.floor((db - (lo - 10)) / 10)))
    out[i].pct += (c / total) * 100
  })
  return out
}

/** CSV 한 줄 이스케이프 */
export function toCsv(rows: (string | number)[][]): string {
  return rows.map(r => r.map(v => {
    const s = String(v)
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }).join(',')).join('\n')
}

export function formatDuration(ms: number): string {
  const s = Math.floor(ms / 1000)
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60
  const p = (n: number) => String(n).padStart(2, '0')
  return h ? `${h}:${p(m)}:${p(sec)}` : `${p(m)}:${p(sec)}`
}
