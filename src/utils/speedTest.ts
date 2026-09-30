// 인터넷 속도 측정 순수 계산 — 측정 방식은 Cloudflare speed.cloudflare.com 오픈소스 엔진(@cloudflare/speedtest)과 같은 골자:
// 크기를 점점 키우며 순차 요청 → 한 요청이 finishMs(1초)를 넘으면 더 큰 크기는 생략 → 10ms 미만 측정은 버리고 90퍼센타일.
// 네트워크/DOM 없음. 회귀 체크: node scripts/check-speed-test.ts

/** bytes 를 ms 동안 전송 → Mbps (10^6 bit/s). ms<=0 이면 0 */
export function mbps(bytes: number, ms: number): number {
  if (!(ms > 0) || !(bytes > 0)) return 0
  return (bytes * 8) / (ms * 1000)
}

/** 선형 보간 퍼센타일 (p: 0~1). 빈 배열 → NaN */
export function percentile(values: number[], p: number): number {
  const v = values.filter(Number.isFinite).sort((a, b) => a - b)
  if (!v.length) return NaN
  const idx = (v.length - 1) * Math.min(1, Math.max(0, p))
  const lo = Math.floor(idx), hi = Math.ceil(idx)
  return v[lo] + (v[hi] - v[lo]) * (idx - lo)
}

export const median = (values: number[]) => percentile(values, 0.5)

/** 지터 = 연속 표본 차이의 절댓값 평균 (Cloudflare 정의). 표본 2개 미만 → NaN */
export function jitter(samples: number[]): number {
  if (samples.length < 2) return NaN
  let sum = 0
  for (let i = 1; i < samples.length; i++) sum += Math.abs(samples[i] - samples[i - 1])
  return sum / (samples.length - 1)
}

export interface Step { bytes: number; count: number }

/** Cloudflare 기본 스케줄에서 100MB 단계를 뺀 것 (첫 100KB 1회는 워밍업 → 결과 제외) */
export const DOWN_STEPS: Step[] = [
  { bytes: 1e5, count: 1 }, { bytes: 1e5, count: 9 }, { bytes: 1e6, count: 8 },
  { bytes: 1e7, count: 6 }, { bytes: 2.5e7, count: 4 },
]
export const UP_STEPS: Step[] = [
  { bytes: 1e5, count: 8 }, { bytes: 1e6, count: 6 }, { bytes: 1e7, count: 4 }, { bytes: 2.5e7, count: 4 },
]

export interface Sample { bytes: number; ms: number }

/**
 * 다음에 보낼 요청 크기 결정 (없으면 null = 이 방향 측정 종료).
 * done: 지금까지 끝난 요청들(순서대로), elapsedMs: 이 방향 누적 시간.
 * 규칙: 시간 예산 초과 → 종료 / 현재 단계 count 채움 → 다음 단계 / 직전 단계(첫 단계 제외) 요청 중 하나라도 finishMs 초과 → 더 키우지 않고 종료.
 */
export function nextSize(steps: Step[], done: Sample[], elapsedMs: number, budgetMs = 10_000, finishMs = 1000): number | null {
  if (elapsedMs >= budgetMs) return null
  let i = 0, used = 0
  for (const s of steps) {
    const inStep = done.slice(used, used + s.count)
    if (inStep.length < s.count) return s.bytes
    used += s.count
    i++
    // 첫 단계(다운로드는 워밍업 1회)는 느려도 다음 단계로 — 저속 회선에서 표본 0개 방지
    if (i > 1 && inStep.some(x => x.ms > finishMs)) return null
  }
  return null
}

/** 대역폭 결과: 10ms 이상 걸린 요청만(너무 짧으면 타이머·지연 오차가 지배) → 90퍼센타일 Mbps */
export function bandwidth(samples: Sample[], skipFirst = 0, minMs = 10): number {
  return percentile(samples.slice(skipFirst).filter(s => s.ms >= minMs).map(s => mbps(s.bytes, s.ms)), 0.9)
}

/** 게이지 눈금: 0~max 를 로그 느낌(제곱근)으로 → 0~1. 저속 구간도 바늘이 보이게 */
export function gaugeRatio(value: number, max = 1000): number {
  if (!(value > 0)) return 0
  return Math.min(1, Math.sqrt(value / max))
}

/** 파일 크기(GB, 10^9)를 Mbps로 받는 데 걸리는 초 */
export function downloadSeconds(gb: number, speedMbps: number): number {
  return speedMbps > 0 ? (gb * 8000) / speedMbps : Infinity
}

// ── 용도별 판정 ──
export type Verdict = 'good' | 'ok' | 'bad'
export interface Need { down?: number; up?: number; ping?: number; jitter?: number }
export interface Measured { down: number; up: number; ping: number; jitter: number }

/** 모두 충족 → good, 기준의 절반 이상(핑은 2배 이하) → ok, 그 밖 → bad. 측정 안 된 항목(NaN)은 판정에서 제외 */
export function verdict(n: Need, m: Measured): Verdict {
  const checks: Verdict[] = []
  const higher = (have: number, need?: number) => {
    if (need === undefined || !Number.isFinite(have)) return
    checks.push(have >= need ? 'good' : have >= need / 2 ? 'ok' : 'bad')
  }
  const lower = (have: number, need?: number) => {
    if (need === undefined || !Number.isFinite(have)) return
    checks.push(have <= need ? 'good' : have <= need * 2 ? 'ok' : 'bad')
  }
  higher(m.down, n.down); higher(m.up, n.up); lower(m.ping, n.ping); lower(m.jitter, n.jitter)
  return checks.includes('bad') ? 'bad' : checks.includes('ok') ? 'ok' : 'good'
}

/** 다운로드 속도 등급 (게이지 옆 한 단어) */
export type SpeedClass = 'slow' | 'moderate' | 'fast' | 'veryFast'
export function speedClass(down: number): SpeedClass {
  return down < 25 ? 'slow' : down < 100 ? 'moderate' : down < 500 ? 'fast' : 'veryFast'
}

/** 국내 인터넷 요금제 최저보장속도 = 계약 속도의 50% (통신3사 약관) */
export const planGuarantee = (planMbps: number) => planMbps * 0.5

/** 표시용 반올림: 100 이상 정수, 10 이상 소수 1자리, 그 밖 소수 2자리 */
export function fmtMbps(v: number): string {
  if (!Number.isFinite(v)) return '—'
  return v >= 100 ? String(Math.round(v)) : v >= 10 ? v.toFixed(1) : v.toFixed(2)
}

// ── Cloudflare 엔진과 같은 타이밍 해석 (Resource Timing + Server-Timing 헤더) ──

/** Server-Timing 헤더 → 서버 처리 시간(ms). cfRequestDuration 우선, 없으면 cfSpeed* 합. 모르면 0 */
export function serverTimeFromHeader(h: string | null | undefined): number {
  if (!h) return 0
  const req = h.match(/(?:^|,\s*)cfReq(?:uest)?Dur(?:ation)?;\s*dur=([0-9.]+)/i)
  if (req && +req[1] > 0.01) return +req[1]
  let sum = 0
  for (const m of h.matchAll(/(?:^|,\s*)cfSpeed[a-zA-Z]*;\s*dur=([0-9.]+)/gi)) sum += +m[1]
  return sum > 0.01 ? sum : 0
}

/** 핑 = TTFB − 서버 처리 시간 (음수 방지) */
export const pingMs = (ttfb: number, serverMs: number) => Math.max(0, ttfb - serverMs)

/** 다운로드 한 요청: 전송 시간 + 핑(첫 바이트까지 한 번 왕복) 동안 bits 받음 */
export function downSample(bytes: number, ttfb: number, payloadMs: number, serverMs: number): Sample {
  return { bytes: bytes * 1.005, ms: pingMs(ttfb, serverMs) + payloadMs }
}

/** 업로드 한 요청: 요청 시작~응답 첫 바이트(TTFB) 동안 bits 보냄 (헤더 오버헤드 0.5%) */
export function upSample(bytes: number, ttfb: number): Sample {
  return { bytes: bytes * 1.005, ms: ttfb }
}
