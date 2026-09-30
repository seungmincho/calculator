/**
 * 화면 비율 계산 순수 로직. 검증: node scripts/check-aspect-ratio.ts
 */

export const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b))

/** 1920×1080 → [16, 9] (정수 픽셀 기준) */
export function reduceRatio(w: number, h: number): [number, number] {
  const W = Math.round(w), H = Math.round(h)
  if (W <= 0 || H <= 0) return [0, 0]
  const g = gcd(W, H)
  return [W / g, H / g]
}

/** 자주 쓰는 비율 (가로형; 세로형은 뒤집어서 비교) */
export const COMMON_RATIOS: [number, number][] = [
  [1, 1], [5, 4], [4, 3], [3, 2], [16, 10], [16, 9], [1.91, 1], [2, 1], [21, 9], [32, 9],
]

/**
 * 가장 가까운 대표 비율. 1366×768(683:384) → '16:9', 3440×1440 → '21:9'.
 * exact = 약분 결과와 같은 비율인지. 3% 넘게 벗어나면 null.
 */
export function nearestCommon(w: number, h: number): { label: string; exact: boolean } | null {
  if (w <= 0 || h <= 0) return null
  const r = w / h
  let best: { label: string; err: number; val: number } | null = null
  for (const [a, b] of COMMON_RATIOS) {
    for (const [x, y] of a === b ? [[a, b]] : [[a, b], [b, a]]) {
      const val = x / y
      const err = Math.abs(r - val) / val
      if (!best || err < best.err) best = { label: `${x}:${y}`, err, val }
    }
  }
  if (!best || best.err > 0.03) return null
  return { label: best.label, exact: Math.abs(r - best.val) < 1e-9 }
}

/** '16:9' '16/9' '16x9' '2.39:1' '1.85' → 가로/세로 값. 잘못된 입력은 null */
export function parseRatio(s: string): number | null {
  const m = s.trim().match(/^(\d+(?:\.\d+)?)\s*(?:[:/x×]\s*(\d+(?:\.\d+)?))?$/i)
  if (!m) return null
  const a = parseFloat(m[1]), b = m[2] ? parseFloat(m[2]) : 1
  return a > 0 && b > 0 ? a / b : null
}

/** 짧은 변 기준 해상도 표 (영상 규격 표기: 1080p = 짧은 변 1080). 긴 변은 짝수로 반올림 */
export const LADDER = [480, 720, 1080, 1440, 2160, 4320] as const
export function resolutionLadder(ratio: number) {
  return LADDER.map((short) => {
    const longExact = short * (ratio >= 1 ? ratio : 1 / ratio)
    const long = Math.round(longExact / 2) * 2
    const [w, h] = ratio >= 1 ? [long, short] : [short, long]
    return { short, w, h, exact: Math.abs(long - longExact) < 1e-6 }
  })
}

export interface Rect { x: number; y: number; w: number; h: number }

/**
 * 원본(sw×sh)을 목표(tw×th)에 맞추는 두 방식.
 * crop: 원본에서 잘라낼 영역(중앙 기준) — 목표 비율로 꽉 채움
 * pad : 목표 캔버스 위에 원본을 그릴 영역 — 여백(레터박스/필러박스)
 */
export function fitImage(sw: number, sh: number, tw: number, th: number): { crop: Rect; pad: Rect; cutPct: number } {
  const t = tw / th
  const s = sw / sh
  const crop: Rect = s > t
    ? { w: sh * t, h: sh, x: (sw - sh * t) / 2, y: 0 }
    : { w: sw, h: sw / t, x: 0, y: (sh - sw / t) / 2 }
  const scale = Math.min(tw / sw, th / sh)
  const pw = sw * scale, ph = sh * scale
  const pad: Rect = { w: pw, h: ph, x: (tw - pw) / 2, y: (th - ph) / 2 }
  const cutPct = (1 - (crop.w * crop.h) / (sw * sh)) * 100
  return { crop, pad, cutPct }
}
