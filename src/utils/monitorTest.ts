// 모니터 테스트 순수 로직 (node scripts/check-monitor-test.ts 로 검증)

export type TestId =
  | 'deadPixel' | 'lightBleed' | 'uniformity' | 'viewingAngle' | 'levels' | 'contrastRatio'
  | 'gamma' | 'banding' | 'colorRatio' | 'readability' | 'sharpness' | 'responseTime'
  | 'burnIn' | 'whiteBalance' | 'blackBalance' | 'imageQuality' | 'calibration' | 'pixelFix'

export interface TestDef { id: TestId; steps: number }

/** 전체 테스트 목록(탭 순서). steps = 전체화면 단계 수 */
export const TESTS: TestDef[] = [
  { id: 'deadPixel', steps: 11 },
  { id: 'lightBleed', steps: 5 },
  { id: 'uniformity', steps: 5 },
  { id: 'viewingAngle', steps: 6 },
  { id: 'levels', steps: 2 },
  { id: 'contrastRatio', steps: 14 },
  { id: 'gamma', steps: 4 },
  { id: 'banding', steps: 6 },
  { id: 'colorRatio', steps: 6 },
  { id: 'readability', steps: 12 },
  { id: 'sharpness', steps: 4 },
  { id: 'responseTime', steps: 3 },
  { id: 'burnIn', steps: 7 },
  { id: 'whiteBalance', steps: 15 },
  { id: 'blackBalance', steps: 15 },
  { id: 'imageQuality', steps: 10 },
  { id: 'calibration', steps: 3 },
  { id: 'pixelFix', steps: 1 },
]

/** 체크리스트(결함 표시) 대상 + URL 코드. 빠른 점검 순서이기도 함 */
export const CHECKS: { id: TestId; code: string }[] = [
  { id: 'deadPixel', code: 'dp' },
  { id: 'lightBleed', code: 'lb' },
  { id: 'uniformity', code: 'un' },
  { id: 'levels', code: 'lv' },
  { id: 'banding', code: 'bd' },
  { id: 'sharpness', code: 'sh' },
  { id: 'responseTime', code: 'rt' },
  { id: 'burnIn', code: 'bi' },
  { id: 'viewingAngle', code: 'va' },
]

// ── 테스트 순서 상태 머신 ──
export interface SeqState { order: TestId[]; test: number; step: number }

export function stepsOf(id: TestId, extra: Partial<Record<TestId, number>> = {}): number {
  return (TESTS.find(t => t.id === id)?.steps ?? 1) + (extra[id] ?? 0)
}

/** 다음 단계. 마지막 테스트의 마지막 단계면 null(종료). */
export function nextState(s: SeqState, extra: Partial<Record<TestId, number>> = {}): SeqState | null {
  if (s.step < stepsOf(s.order[s.test], extra) - 1) return { ...s, step: s.step + 1 }
  if (s.test < s.order.length - 1) return { ...s, test: s.test + 1, step: 0 }
  return null
}

/** 이전 단계. 첫 단계면 그대로. 이전 테스트로 넘어가면 그 테스트의 마지막 단계. */
export function prevState(s: SeqState, extra: Partial<Record<TestId, number>> = {}): SeqState {
  if (s.step > 0) return { ...s, step: s.step - 1 }
  if (s.test > 0) return { ...s, test: s.test - 1, step: stepsOf(s.order[s.test - 1], extra) - 1 }
  return s
}

export type NavAction = 'next' | 'prev' | 'exit'

export function keyAction(key: string): NavAction | null {
  if (key === 'ArrowRight' || key === ' ' || key === 'Enter' || key === 'PageDown' || key === 'ArrowDown') return 'next'
  if (key === 'ArrowLeft' || key === 'Backspace' || key === 'PageUp' || key === 'ArrowUp') return 'prev'
  if (key === 'Escape') return 'exit'
  return null
}

/** 포인터 이동량 → 탭(next) / 왼쪽 스와이프(next) / 오른쪽 스와이프(prev) / 무시 */
export function swipeAction(dx: number, dy: number, threshold = 50): NavAction | null {
  if (Math.abs(dx) < 10 && Math.abs(dy) < 10) return 'next'
  if (Math.abs(dx) >= threshold && Math.abs(dx) > Math.abs(dy) * 1.5) return dx < 0 ? 'next' : 'prev'
  return null
}

// ── 주사율 추정 ──
const COMMON_HZ = [24, 30, 48, 50, 60, 72, 75, 85, 90, 100, 120, 144, 165, 170, 175, 180, 200, 240, 280, 360, 480, 500, 540]

/** rAF 프레임 간격(ms) 목록 → 주사율(Hz). 중앙값 사용(프레임 드랍·탭 전환 튐 제거), 흔한 주사율로 3% 이내 스냅. */
export function estimateRefreshRate(deltas: number[]): number | null {
  const d = deltas.filter(x => x > 1 && x < 100).sort((a, b) => a - b)
  if (d.length < 5) return null
  const mid = d.length >> 1
  const median = d.length % 2 ? d[mid] : (d[mid - 1] + d[mid]) / 2
  const hz = 1000 / median
  const snap = COMMON_HZ.find(c => Math.abs(c - hz) / c <= 0.03)
  return snap ?? Math.round(hz)
}

// ── 밴딩 패턴 ──
/** 0~255 값을 levels 단계로 양자화 (예: 64 = 6비트) */
export function quantize(v: number, levels: number): number {
  const step = 255 / (levels - 1)
  return Math.round(Math.round(v / step) * step)
}

/** from~to 채널값을 levels 칸의 계단형 CSS 그라데이션으로. rgb(mask) 로 색 채널 선택. */
export function steppedGradient(levels: number, mask: [number, number, number] = [1, 1, 1], from = 0, to = 255): string {
  const stops: string[] = []
  for (let i = 0; i < levels; i++) {
    const v = Math.round(from + ((to - from) * i) / (levels - 1))
    const c = `rgb(${v * mask[0]},${v * mask[1]},${v * mask[2]})`
    stops.push(`${c} ${((i / levels) * 100).toFixed(3)}%`, `${c} ${(((i + 1) / levels) * 100).toFixed(3)}%`)
  }
  return `linear-gradient(to right, ${stops.join(', ')})`
}

// ── 체크리스트 결과 ──
/** deadPixel = 개수(0~999), 나머지 = 0 없음 / 1 약간 / 2 심함 */
export type Results = Partial<Record<TestId, number>>

export function encodeResults(r: Results): string {
  return CHECKS.filter(c => r[c.id] != null).map(c => `${c.code}${r[c.id]}`).join('.')
}

export function decodeResults(s: string | null | undefined): Results {
  const out: Results = {}
  if (!s) return out
  for (const part of s.split('.')) {
    const m = /^([a-z]{2})(\d{1,3})$/.exec(part)
    const c = m && CHECKS.find(x => x.code === m[1])
    if (!c || !m) continue
    const v = Number(m[2])
    if (c.id === 'deadPixel' || v <= 2) out[c.id] = v
  }
  return out
}

/** 가장 나쁜 등급: 0 양호 / 1 주의 / 2 불량. 체크 없음 = null */
export function overallGrade(r: Results): 0 | 1 | 2 | null {
  const ids = CHECKS.map(c => c.id).filter(id => r[id] != null)
  if (!ids.length) return null
  let g = 0
  for (const id of ids) {
    const v = r[id] as number
    const level = id === 'deadPixel' ? (v === 0 ? 0 : v <= 2 ? 1 : 2) : v
    g = Math.max(g, level)
  }
  return g as 0 | 1 | 2
}

export type Gamut = 'rec2020' | 'p3' | 'srgb'
export function gamutFrom(matches: (q: string) => boolean): Gamut {
  if (matches('(color-gamut: rec2020)')) return 'rec2020'
  if (matches('(color-gamut: p3)')) return 'p3'
  return 'srgb'
}
