// 단색 배경 제거 — 순수 픽셀 로직 (canvas/DOM 없음). 회귀 체크: node scripts/check-bg-remove.ts
// 색 거리는 CIE Lab ΔE76(사람 눈 기준 색차). 배경 판정은 가장자리에서 이어진 영역(flood)
// 또는 이미지 전체(global) 중 선택. 경계 1px은 부드러운 알파 + 배경색 번짐 제거(defringe).

export type RGB = [number, number, number]
export type Mode = 'flood' | 'global'

/** 브러시 마스크 값 */
export const MASK_NONE = 0
export const MASK_ERASE = 1
export const MASK_KEEP = 2

const LIN = new Float32Array(256)
for (let i = 0; i < 256; i++) {
  const c = i / 255
  LIN[i] = c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
}
const f = (t: number) => (t > 216 / 24389 ? Math.cbrt(t) : (24389 / 27 * t + 16) / 116)

/** sRGB(0-255) → CIE Lab (D65) */
export function rgbToLab(r: number, g: number, b: number): RGB {
  const R = LIN[r], G = LIN[g], B = LIN[b]
  const fx = f((0.4124564 * R + 0.3575761 * G + 0.1804375 * B) / 0.95047)
  const fy = f(0.2126729 * R + 0.7151522 * G + 0.072175 * B)
  const fz = f((0.0193339 * R + 0.119192 * G + 0.9503041 * B) / 1.08883)
  return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)]
}

export const deltaE = (a: RGB, b: RGB) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2])

export const toHex = (c: RGB) => '#' + c.map((v) => v.toString(16).padStart(2, '0')).join('')
export const fromHex = (h: string): RGB => {
  const n = parseInt(h.replace('#', ''), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

/** 최대 픽셀 수 안에 들도록 축소한 크기 */
export function fitSize(w: number, h: number, maxPixels: number): { w: number; h: number } {
  if (w * h <= maxPixels) return { w, h }
  const s = Math.sqrt(maxPixels / (w * h))
  return { w: Math.max(1, Math.floor(w * s)), h: Math.max(1, Math.floor(h * s)) }
}

/**
 * 테두리 픽셀에서 배경색 추정. 4비트 버킷 최빈값의 평균색 + (충분히 다르고 20% 이상이면) 두 번째 색.
 * share = 첫 번째 색이 테두리에서 차지하는 비율 (낮으면 단색 배경이 아님).
 */
export function detectBorderColors(data: ArrayLike<number>, w: number, h: number): { colors: RGB[]; share: number } {
  const buckets = new Map<number, { n: number; r: number; g: number; b: number }>()
  let total = 0
  const add = (x: number, y: number) => {
    const i = (y * w + x) * 4
    if (data[i + 3] < 128) return // 이미 투명한 픽셀은 무시
    const r = data[i], g = data[i + 1], b = data[i + 2]
    const k = ((r >> 4) << 8) | ((g >> 4) << 4) | (b >> 4)
    const e = buckets.get(k)
    if (e) { e.n++; e.r += r; e.g += g; e.b += b } else buckets.set(k, { n: 1, r, g, b })
    total++
  }
  const stepX = Math.max(1, Math.floor(w / 500)), stepY = Math.max(1, Math.floor(h / 500))
  for (let x = 0; x < w; x += stepX) { add(x, 0); if (h > 1) add(x, h - 1) }
  for (let y = 1; y < h - 1; y += stepY) { add(0, y); if (w > 1) add(w - 1, y) }
  if (!total) return { colors: [], share: 0 }
  const sorted = [...buckets.values()].sort((a, b) => b.n - a.n)
  const avg = (e: { n: number; r: number; g: number; b: number }): RGB =>
    [Math.round(e.r / e.n), Math.round(e.g / e.n), Math.round(e.b / e.n)]
  const first = avg(sorted[0])
  const colors: RGB[] = [first]
  const firstLab = rgbToLab(...first)
  // 버킷 경계에 걸친 같은 색은 첫 색에 합산해 share 계산
  let share = 0
  for (const e of sorted) {
    const c = avg(e)
    const d = deltaE(rgbToLab(...c), firstLab)
    if (d < 10) share += e.n
    else if (colors.length < 2 && e.n / total >= 0.2) colors.push(c)
  }
  return { colors, share: share / total }
}

/** 픽셀별 가장 가까운 배경색까지의 ΔE와 그 색 번호 */
export function distanceMap(data: ArrayLike<number>, n: number, colors: RGB[]): { dist: Float32Array; nearest: Uint8Array } {
  const dist = new Float32Array(n).fill(Infinity)
  const nearest = new Uint8Array(n)
  const labs = colors.map((c) => rgbToLab(...c))
  if (!labs.length) return { dist, nearest }
  for (let p = 0; p < n; p++) {
    const i = p * 4
    const [L, A, B] = rgbToLab(data[i], data[i + 1], data[i + 2])
    let best = Infinity, bi = 0
    for (let k = 0; k < labs.length; k++) {
      const c = labs[k]
      const d = (L - c[0]) ** 2 + (A - c[1]) ** 2 + (B - c[2]) ** 2
      if (d < best) { best = d; bi = k }
    }
    // 원래 투명했던 픽셀은 배경으로 취급
    dist[p] = data[i + 3] < 8 ? 0 : Math.sqrt(best)
    nearest[p] = bi
  }
  return { dist, nearest }
}

const ramp = (d: number, tol: number, soft: number) =>
  d <= tol ? 0 : soft <= 0 || d >= tol + soft ? 255 : Math.round(((d - tol) / soft) * 255)

/**
 * 알파 계산. d ≤ tol → 0(배경), tol < d < tol+soft → 부분 투명, 그 이상 → 255.
 * flood: 가장자리 + seeds(픽셀 인덱스)에서 4방향으로 이어진 배경만 지움. 부분 투명 픽셀은 경계로만 쓰고 더 번지지 않음
 *        → 피사체 안의 같은 색(흰 셔츠·눈동자 하이라이트)은 남음.
 * global: 색만 보고 전부 지움 (로고 글자 안쪽 구멍까지).
 */
export function computeAlpha(dist: Float32Array, w: number, h: number, tol: number, soft: number, mode: Mode, seeds: number[] = []): Uint8Array {
  const n = w * h
  const alpha = new Uint8Array(n).fill(255)
  if (mode === 'global') {
    for (let p = 0; p < n; p++) alpha[p] = ramp(dist[p], tol, soft)
    return alpha
  }
  const seen = new Uint8Array(n)
  const stack = new Int32Array(n)
  let top = 0
  const visit = (p: number) => {
    if (seen[p]) return
    seen[p] = 1
    const a = ramp(dist[p], tol, soft)
    if (a === 255) return
    alpha[p] = a
    if (a === 0) stack[top++] = p // 완전 배경만 번져 나감
  }
  for (let x = 0; x < w; x++) { visit(x); visit((h - 1) * w + x) }
  for (let y = 0; y < h; y++) { visit(y * w); visit(y * w + w - 1) }
  for (const s of seeds) if (s >= 0 && s < n) visit(s)
  while (top) {
    const p = stack[--top]
    const x = p % w
    if (x > 0) visit(p - 1)
    if (x < w - 1) visit(p + 1)
    if (p >= w) visit(p - w)
    if (p < n - w) visit(p + w)
  }
  return alpha
}

/** 브러시 마스크 적용 (지우기 → 0, 복원 → 255) */
export function applyMask(alpha: Uint8Array, mask: Uint8Array | null): Uint8Array {
  if (!mask) return alpha
  const out = alpha.slice()
  for (let p = 0; p < out.length; p++) {
    if (mask[p] === MASK_ERASE) out[p] = 0
    else if (mask[p] === MASK_KEEP) out[p] = 255
  }
  return out
}

/**
 * 최종 RGBA. defringe: 부분 투명 픽셀에서 배경색 섞임을 빼서(I = aC + (1-a)B → C) 테두리 번짐 제거.
 * fill: 배경을 단색으로 채움 (null이면 투명). bgColors = distanceMap에 쓴 배경색, nearest = 그 번호.
 */
export function composite(
  src: ArrayLike<number>, alpha: Uint8Array, nearest: Uint8Array, bgColors: RGB[], defringe: boolean, fill: RGB | null,
): Uint8ClampedArray {
  const n = alpha.length
  const out = new Uint8ClampedArray(n * 4)
  for (let p = 0; p < n; p++) {
    const i = p * 4
    const a = alpha[p] * (src[i + 3] / 255)
    let r = src[i], g = src[i + 1], b = src[i + 2]
    if (defringe && a > 0 && a < 255 && bgColors.length) {
      const B = bgColors[nearest[p]] ?? bgColors[0]
      const k = a / 255
      r = (r - (1 - k) * B[0]) / k
      g = (g - (1 - k) * B[1]) / k
      b = (b - (1 - k) * B[2]) / k
      r = r < 0 ? 0 : r > 255 ? 255 : r
      g = g < 0 ? 0 : g > 255 ? 255 : g
      b = b < 0 ? 0 : b > 255 ? 255 : b
    }
    if (fill) {
      const k = a / 255
      out[i] = r * k + fill[0] * (1 - k)
      out[i + 1] = g * k + fill[1] * (1 - k)
      out[i + 2] = b * k + fill[2] * (1 - k)
      out[i + 3] = 255
    } else {
      out[i] = r; out[i + 1] = g; out[i + 2] = b; out[i + 3] = a
    }
  }
  return out
}

/** (x0,y0)→(x1,y1) 선을 따라 반지름 r 원으로 마스크 칠하기 (in place) */
export function paintMask(mask: Uint8Array, w: number, h: number, x0: number, y0: number, x1: number, y1: number, r: number, value: number) {
  const steps = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0) / Math.max(1, r / 2)))
  const r2 = r * r
  for (let s = 0; s <= steps; s++) {
    const cx = x0 + ((x1 - x0) * s) / steps, cy = y0 + ((y1 - y0) * s) / steps
    const ya = Math.max(0, Math.floor(cy - r)), yb = Math.min(h - 1, Math.ceil(cy + r))
    const xa = Math.max(0, Math.floor(cx - r)), xb = Math.min(w - 1, Math.ceil(cx + r))
    for (let y = ya; y <= yb; y++) for (let x = xa; x <= xb; x++) {
      if ((x - cx) ** 2 + (y - cy) ** 2 <= r2) mask[y * w + x] = value
    }
  }
}

/** 미리보기 해상도 마스크 → 내보내기 해상도 (최근접) */
export function scaleMask(mask: Uint8Array, w: number, h: number, W: number, H: number): Uint8Array {
  if (w === W && h === H) return mask
  const out = new Uint8Array(W * H)
  for (let y = 0; y < H; y++) {
    const sy = Math.min(h - 1, Math.floor((y * h) / H)) * w
    for (let x = 0; x < W; x++) out[y * W + x] = mask[sy + Math.min(w - 1, Math.floor((x * w) / W))]
  }
  return out
}
