/**
 * 반응속도 테스트 순수 로직 (ReactionTest.tsx, scripts/check-reaction.ts).
 *
 * 분포 모델(참고용): 웹 단순 시각 반응 시간을 로그정규로 근사 — 중앙값 255ms, σ(ln) 0.2.
 * 공개된 온라인 테스트 분포(중앙값 대략 250~280ms, 입력·화면 지연 포함)에 맞춘 대략값이지
 * 정밀한 인구 통계가 아니다. 화면에는 반드시 "참고"로 표시.
 */

export const ROUNDS = 5
/** 100ms 미만은 자극을 보고 반응한 게 아니라 예측 입력으로 본다 (반응시간 연구의 관례적 하한) */
export const MIN_VALID_MS = 100
const MEDIAN_MS = 255
const SIGMA = 0.2

/** 표준정규 CDF (Abramowitz–Stegun 7.1.26, 오차 < 1.5e-7) */
function normCdf(z: number): number {
  const x = Math.abs(z) / Math.SQRT2
  const t = 1 / (1 + 0.3275911 * x)
  const erf = 1 - ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x)
  return z >= 0 ? (1 + erf) / 2 : (1 - erf) / 2
}

/** 나보다 빠른 사람 비율 → "상위 N%" (1~99) */
export function topPercent(ms: number): number {
  const p = normCdf(Math.log(ms / MEDIAN_MS) / SIGMA) * 100
  return Math.min(99, Math.max(1, Math.round(p)))
}

export const TIERS = [180, 210, 240, 280, 330] as const
/** 평균(ms) → 등급 키 t1(가장 빠름)~t6 */
export function tierOf(ms: number): string {
  const i = TIERS.findIndex(limit => ms < limit)
  return `t${i === -1 ? 6 : i + 1}`
}

export interface Summary { avg: number; best: number; worst: number; median: number; sd: number }

export function summarize(times: number[]): Summary | null {
  if (!times.length) return null
  const s = [...times].sort((a, b) => a - b)
  const avg = s.reduce((a, b) => a + b, 0) / s.length
  const mid = s.length >> 1
  const median = s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2
  const sd = Math.sqrt(s.reduce((a, b) => a + (b - avg) ** 2, 0) / s.length)
  return { avg: Math.round(avg), best: s[0], worst: s[s.length - 1], median: Math.round(median), sd: Math.round(sd) }
}

/** 다른 라운드보다 눈에 띄게 느린 라운드(중앙값의 1.5배 이상이면서 100ms 이상 차이) — 평균을 끌어올림 */
export function outlierIdx(times: number[]): number[] {
  const m = summarize(times)?.median
  if (m === undefined || times.length < 3) return []
  return times.flatMap((v, i) => (v >= m * 1.5 && v - m >= 100 ? [i] : []))
}

export type Device = 'mouse' | 'touch' | 'pen' | 'keyboard'
export interface HistoryEntry { t: number; avg: number; best: number; median: number; dev: Device }
export const HISTORY_MAX = 50

/** localStorage 값 검증 (손상·구버전 값 걸러냄), 최근 HISTORY_MAX개 */
export function sanitizeHistory(raw: unknown): HistoryEntry[] {
  if (!Array.isArray(raw)) return []
  const ok = (n: unknown) => typeof n === 'number' && Number.isFinite(n) && n >= MIN_VALID_MS && n < 5000
  return raw.filter((e): e is HistoryEntry =>
    !!e && typeof e === 'object' && typeof e.t === 'number' && ok(e.avg) && ok(e.best) && ok(e.median)
    && ['mouse', 'touch', 'pen', 'keyboard'].includes(e.dev)).slice(-HISTORY_MAX)
}

/** 공유 링크 ?vs= 값 (친구 평균) 검증 */
export function parseVs(v: string | null): number | null {
  const n = Number(v)
  return v && Number.isInteger(n) && n >= MIN_VALID_MS && n < 2000 ? n : null
}
