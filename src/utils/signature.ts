// 서명 만들기 — 순수 헬퍼 (획 스무딩·속도 기반 굵기·SVG 경로·알파 경계 트림)
// 체크: node scripts/check-signature.ts

/** 입력 점. t = ms 타임스탬프, p = 펜 필압(0~1, 펜 입력일 때만) */
export interface Pt { x: number; y: number; t: number; p?: number }
export interface Stroke { pts: Pt[]; color: string; size: number }
/** 3차 베지어 한 구간 + 그 구간 선 굵기 */
export interface Seg { x0: number; y0: number; c1x: number; c1y: number; c2x: number; c2y: number; x1: number; y1: number; w: number }
export interface Rect { x: number; y: number; w: number; h: number }

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))
const dist = (a: Pt, b: Pt) => Math.hypot(b.x - a.x, b.y - a.y)

// 굵기 배율 범위: 빠르게 그을수록 가늘게(최소 0.45), 천천히 그으면 굵게(최대 1.5)
export const W_MIN = 0.45
export const W_MAX = 1.6

/** minDist 미만으로 붙은 점 제거 (첫·마지막 점은 유지) — 떨림·중복 좌표로 인한 꺾임 방지 */
export function dedupe(pts: Pt[], minDist = 1): Pt[] {
  if (pts.length <= 2) return pts.slice()
  const out = [pts[0]]
  for (let i = 1; i < pts.length - 1; i++) if (dist(out[out.length - 1], pts[i]) >= minDist) out.push(pts[i])
  const last = pts[pts.length - 1]
  if (dist(out[out.length - 1], last) > 0 || out.length === 1) out.push(last)
  return out
}

/**
 * 점별 선 굵기. 펜 필압이 있으면 필압, 없으면(마우스·터치) 속도(px/ms)로 붓 느낌을 흉내 낸다.
 * 급변을 막으려고 지수 평활(이전 60% + 목표 40%).
 */
export function strokeWidths(pts: Pt[], size: number): number[] {
  const out: number[] = []
  let w = size
  for (let i = 0; i < pts.length; i++) {
    const b = pts[i]
    let f: number
    if (b.p != null && b.p > 0) f = 0.4 + clamp(b.p, 0, 1) * 1.2
    else if (i === 0) f = 1
    else {
      const a = pts[i - 1]
      const v = dist(a, b) / Math.max(1, b.t - a.t)
      f = clamp(1.5 - v * 0.6, W_MIN, 1.5)
    }
    w = i === 0 ? size * f : w * 0.6 + size * f * 0.4
    out.push(w)
  }
  return out
}

/** Catmull-Rom 스플라인 → 3차 베지어 구간들. 모든 입력 점을 지나고 끝점 사이를 부드럽게 잇는다 */
export function segments(s: Stroke): Seg[] {
  const pts = dedupe(s.pts)
  if (pts.length < 2) return []
  const ws = strokeWidths(pts, s.size)
  const segs: Seg[] = []
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] ?? p2
    segs.push({
      x0: p1.x, y0: p1.y,
      c1x: p1.x + (p2.x - p0.x) / 6, c1y: p1.y + (p2.y - p0.y) / 6,
      c2x: p2.x - (p3.x - p1.x) / 6, c2y: p2.y - (p3.y - p1.y) / 6,
      x1: p2.x, y1: p2.y,
      w: (ws[i] + ws[i + 1]) / 2,
    })
  }
  return segs
}

/** 점 하나만 찍은 획(탭)의 점 반지름 */
export const dotRadius = (s: Stroke) => s.size * 0.6

/** 모든 획의 경계(선 굵기 절반 포함). 베지어는 제어점 볼록 껍질 안에 있으므로 제어점까지 포함하면 안전한 상한 */
export function strokesBounds(strokes: Stroke[]): Rect | null {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity
  const add = (x: number, y: number, r: number) => {
    x0 = Math.min(x0, x - r); y0 = Math.min(y0, y - r); x1 = Math.max(x1, x + r); y1 = Math.max(y1, y + r)
  }
  for (const s of strokes) {
    const segs = segments(s)
    if (!segs.length) { if (s.pts.length) add(s.pts[0].x, s.pts[0].y, dotRadius(s)); continue }
    for (const g of segs) {
      const r = g.w / 2
      add(g.x0, g.y0, r); add(g.c1x, g.c1y, r); add(g.c2x, g.c2y, r); add(g.x1, g.y1, r)
    }
  }
  return x0 === Infinity ? null : { x: x0, y: y0, w: x1 - x0, h: y1 - y0 }
}

const n = (v: number) => String(Math.round(v * 100) / 100)

/**
 * 벡터 SVG. 같은 색·같은 굵기(0.25px 단위 반올림)로 이어지는 구간은 path 하나로 합쳐 용량을 줄인다.
 * 좌표는 경계 기준으로 옮겨 viewBox가 (0,0)부터 시작하게 한다.
 */
export function strokesSvg(strokes: Stroke[], pad = 12): string | null {
  const b = strokesBounds(strokes)
  if (!b) return null
  const ox = b.x - pad, oy = b.y - pad
  const W = b.w + pad * 2, H = b.h + pad * 2
  const els: string[] = []
  for (const s of strokes) {
    const segs = segments(s)
    if (!segs.length) {
      if (s.pts.length) els.push(`<circle cx="${n(s.pts[0].x - ox)}" cy="${n(s.pts[0].y - oy)}" r="${n(dotRadius(s))}" fill="${s.color}"/>`)
      continue
    }
    let d = '', w = -1
    const flush = () => { if (d) els.push(`<path d="${d}" stroke="${s.color}" stroke-width="${n(w)}"/>`) }
    for (const g of segs) {
      const gw = Math.round(g.w * 4) / 4
      if (gw !== w) { flush(); w = gw; d = `M${n(g.x0 - ox)} ${n(g.y0 - oy)}` }
      d += `C${n(g.c1x - ox)} ${n(g.c1y - oy)} ${n(g.c2x - ox)} ${n(g.c2y - oy)} ${n(g.x1 - ox)} ${n(g.y1 - oy)}`
    }
    flush()
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${n(W)} ${n(H)}" width="${Math.ceil(W)}" height="${Math.ceil(H)}" fill="none" stroke-linecap="round" stroke-linejoin="round">${els.join('')}</svg>`
}

/** RGBA 픽셀에서 알파 > threshold 인 영역의 경계. 비어 있으면 null (PNG 트림용) */
export function alphaBounds(data: ArrayLike<number>, w: number, h: number, threshold = 8): Rect | null {
  let x0 = w, y0 = h, x1 = -1, y1 = -1
  for (let y = 0; y < h; y++) {
    const row = y * w * 4
    for (let x = 0; x < w; x++) {
      if (data[row + x * 4 + 3] > threshold) {
        if (x < x0) x0 = x
        if (x > x1) x1 = x
        if (y < y0) y0 = y
        y1 = y
      }
    }
  }
  return x1 < 0 ? null : { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 }
}

export const hasHangul = (s: string) => /[ᄀ-ᇿㄱ-ㆎ가-힣]/.test(s)

// 저장된 서명 (localStorage)
export const SAVED_MAX = 5
export interface SavedSig { id: string; png: string; svg?: string; at: number }

/** localStorage 문자열 → 검증된 목록 (깨진 값·이상한 항목은 버림) */
export function parseSaved(raw: string | null): SavedSig[] {
  try {
    const arr: unknown = JSON.parse(raw ?? '[]')
    if (!Array.isArray(arr)) return []
    return arr.filter((x): x is SavedSig =>
      !!x && typeof x === 'object' && typeof x.id === 'string' && typeof x.at === 'number' &&
      typeof x.png === 'string' && x.png.startsWith('data:image/png') &&
      (x.svg === undefined || (typeof x.svg === 'string' && x.svg.startsWith('<svg')))
    ).slice(0, SAVED_MAX)
  } catch {
    return []
  }
}
