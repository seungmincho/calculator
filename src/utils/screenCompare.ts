/**
 * 화면 크기 비교 순수 로직. 검증: node scripts/check-screen-compare.ts
 * 대각선(인치) + 해상도(px) → 실제 가로/세로(cm)·면적·PPI·배율 적용 작업공간·권장 시청거리.
 * 정사각 픽셀 가정: 물리 비율 = 픽셀 비율.
 */
import { ppiCalc, ratioLabel } from './screenInfo.ts'

export interface Screen { d: number; w: number; h: number; scale: number } // scale 0 = 자동

/** 자주 쓰는 화면 비율 (가로형). 세로형은 뒤집어 표기 */
export const RATIOS: [string, number, number][] = [
  ['16:9', 16, 9], ['16:10', 16, 10], ['21:9', 21, 9], ['32:9', 32, 9], ['4:3', 4, 3],
  ['3:2', 3, 2], ['5:4', 5, 4], ['19.5:9', 19.5, 9], ['20:9', 20, 9],
]

/** 2556×1179 → '19.5:9', 1179×2556 → '9:19.5'. 0.5% 이내만 대표 비율, 아니면 screenInfo.ratioLabel */
export function screenRatioLabel(w: number, h: number): string {
  const r = Math.max(w, h) / Math.min(w, h)
  for (const [label, a, b] of RATIOS) {
    if (Math.abs(r - a / b) / (a / b) < 0.005) return w >= h ? label : label.split(':').reverse().join(':')
  }
  return ratioLabel(w, h)
}

/** 비율 선택 → 긴 변 유지, 짧은 변 재계산 (방향 유지) */
export function applyRatio(w: number, h: number, a: number, b: number): [number, number] {
  return w >= h ? [w, Math.round((w * b) / a)] : [Math.round((h * b) / a), h]
}

/** Windows 배율 단계 (%) */
export const SCALES = [100, 125, 150, 175, 200, 225, 250, 300]

/**
 * 자동 배율 추정: 배율 적용 후 유효 PPI가 120 이하가 되는 가장 작은 단계 (Windows 96dpi=100% 기준).
 * 27" QHD → 100%, 32" 4K → 125%, 27" 4K → 150%, 15.6" FHD → 125%, 14" FHD → 150%.
 * ponytail: 제조사/OS 기본값과 다를 수 있음 → UI에서 직접 선택 가능
 */
export function autoScale(ppi: number): number {
  return SCALES.find(s => ppi / (s / 100) <= 120) ?? SCALES[SCALES.length - 1]
}

const ARCMIN = Math.PI / 10800
/** 작업공간(배율) 비교는 PC 화면만 의미 있음. 이보다 작으면 null */
export const WORKSPACE_MIN_DIAG = 12

export function screenGeom(s: Screen) {
  const p = ppiCalc(s.w, s.h, s.d)
  if (!p) return null
  const scale = s.scale || autoScale(p.ppi)
  const ws: [number, number] | null = s.d >= WORKSPACE_MIN_DIAG
    ? [Math.round(s.w / (scale / 100)), Math.round(s.h / (scale / 100))]
    : null
  return {
    ...p,
    diagCm: s.d * 2.54,
    areaCm2: p.widthCm * p.heightCm,
    megapixels: (s.w * s.h) / 1e6,
    scale,
    autoScale: !s.scale,
    workspace: ws,
    /** 1920×1080(배율 100%) 대비 작업공간 배수 */
    workspaceVsFhd: ws ? (ws[0] * ws[1]) / (1920 * 1080) : null,
    /** 가로 시야각 30°(SMPTE) / 40°(THX) 거리, 1분각에 픽셀 1개(레티나) 거리. cm */
    distSmpteCm: p.widthCm / (2 * Math.tan((15 * Math.PI) / 180)),
    distThxCm: p.widthCm / (2 * Math.tan((20 * Math.PI) / 180)),
    distRetinaCm: p.dotPitchMm / 10 / Math.tan(ARCMIN),
  }
}
export type Geom = NonNullable<ReturnType<typeof screenGeom>>

/** a 대비 b가 몇 % 큰가 (음수 = 작음) */
export const pctMore = (a: number, b: number) => (b / a - 1) * 100

// ── URL: s=27_2560_1440-32_3840_2160_125 ─────────────────────────────────────

export function serializeScreens(list: Screen[]): string {
  return list.map(s => [s.d, s.w, s.h, ...(s.scale ? [s.scale] : [])].join('_')).join('-')
}

export function parseScreens(q: string | null): Screen[] | null {
  if (!q) return null
  const out: Screen[] = []
  for (const part of q.split('-').slice(0, 4)) {
    const [d, w, h, sc] = part.split('_').map(Number)
    if (!(d > 0 && d <= 1000 && Number.isInteger(w) && Number.isInteger(h) && w > 0 && h > 0 && w <= 20000 && h <= 20000)) continue
    out.push({ d, w, h, scale: SCALES.includes(sc) ? sc : 0 })
  }
  return out.length ? out : null
}

// ── 겹쳐 그리기 레이아웃 (단위 = cm) ──────────────────────────────────────────

export type Align = 'center' | 'bl' | 'side'
export interface Box { x: number; y: number; w: number; h: number }

export function layoutBoxes(sizes: { w: number; h: number }[], align: Align): { boxes: Box[]; vbW: number; vbH: number } {
  if (!sizes.length) return { boxes: [], vbW: 0, vbH: 0 }
  const maxW = Math.max(...sizes.map(s => s.w))
  const maxH = Math.max(...sizes.map(s => s.h))
  if (align === 'side') {
    const gap = maxW * 0.06
    let x = 0
    const boxes = sizes.map(s => {
      const b = { x, y: maxH - s.h, w: s.w, h: s.h }
      x += s.w + gap
      return b
    })
    return { boxes, vbW: x - gap, vbH: maxH }
  }
  const boxes = sizes.map(s => align === 'bl'
    ? { x: 0, y: maxH - s.h, w: s.w, h: s.h }
    : { x: (maxW - s.w) / 2, y: (maxH - s.h) / 2, w: s.w, h: s.h })
  return { boxes, vbW: maxW, vbH: maxH }
}

// ── 프리셋 ────────────────────────────────────────────────────────────────────

export type Kind = 'phone' | 'tablet' | 'laptop' | 'monitor' | 'tv'
export interface Preset { id: string; kind: Kind; d: number; w: number; h: number; name?: string }

const tv = (d: number): Preset => ({ id: `tv-${d}`, kind: 'tv', d, w: 3840, h: 2160 })

/** 폰은 세로형(w<h), 나머지는 가로형. name 없으면 '27" QHD'처럼 자동 표기 */
export const PRESETS: Preset[] = [
  { id: 'iphone-17-pro-max', kind: 'phone', d: 6.9, w: 1320, h: 2868, name: 'iPhone 17 Pro Max' },
  { id: 'iphone-air', kind: 'phone', d: 6.5, w: 1260, h: 2736, name: 'iPhone Air' },
  { id: 'iphone-17', kind: 'phone', d: 6.3, w: 1206, h: 2622, name: 'iPhone 17 / 17 Pro' },
  { id: 'iphone-16', kind: 'phone', d: 6.1, w: 1179, h: 2556, name: 'iPhone 16 / 15' },
  { id: 'iphone-se', kind: 'phone', d: 4.7, w: 750, h: 1334, name: 'iPhone SE (3rd)' },
  { id: 'galaxy-s25-ultra', kind: 'phone', d: 6.9, w: 1440, h: 3120, name: 'Galaxy S25 Ultra' },
  { id: 'galaxy-s25', kind: 'phone', d: 6.2, w: 1080, h: 2340, name: 'Galaxy S25 / S24' },
  { id: 'galaxy-z-fold6', kind: 'phone', d: 7.6, w: 1856, h: 2160, name: 'Galaxy Z Fold6 (inner)' },
  { id: 'galaxy-z-flip6', kind: 'phone', d: 6.7, w: 1080, h: 2640, name: 'Galaxy Z Flip6' },
  { id: 'pixel-9-pro', kind: 'phone', d: 6.3, w: 1280, h: 2856, name: 'Pixel 9 Pro' },
  { id: 'ipad-pro-13', kind: 'tablet', d: 13, w: 2752, h: 2064, name: 'iPad Pro 13"' },
  { id: 'ipad-pro-11', kind: 'tablet', d: 11, w: 2420, h: 1668, name: 'iPad Pro 11"' },
  { id: 'ipad-air-11', kind: 'tablet', d: 10.9, w: 2360, h: 1640, name: 'iPad Air 11"' },
  { id: 'ipad-mini', kind: 'tablet', d: 8.3, w: 2266, h: 1488, name: 'iPad mini' },
  { id: 'galaxy-tab-s9-ultra', kind: 'tablet', d: 14.6, w: 2960, h: 1848, name: 'Galaxy Tab S9 Ultra' },
  { id: 'galaxy-tab-s9', kind: 'tablet', d: 11, w: 2560, h: 1600, name: 'Galaxy Tab S9' },
  { id: 'macbook-air-13', kind: 'laptop', d: 13.6, w: 2560, h: 1664, name: 'MacBook Air 13"' },
  { id: 'macbook-pro-14', kind: 'laptop', d: 14.2, w: 3024, h: 1964, name: 'MacBook Pro 14"' },
  { id: 'macbook-pro-16', kind: 'laptop', d: 16.2, w: 3456, h: 2234, name: 'MacBook Pro 16"' },
  { id: 'laptop-13-fhd', kind: 'laptop', d: 13.3, w: 1920, h: 1080 },
  { id: 'laptop-14-wuxga', kind: 'laptop', d: 14, w: 1920, h: 1200 },
  { id: 'laptop-15-fhd', kind: 'laptop', d: 15.6, w: 1920, h: 1080 },
  { id: 'laptop-16-wqxga', kind: 'laptop', d: 16, w: 2560, h: 1600 },
  { id: 'mon-24-fhd', kind: 'monitor', d: 24, w: 1920, h: 1080 },
  { id: 'mon-27-fhd', kind: 'monitor', d: 27, w: 1920, h: 1080 },
  { id: 'mon-27-qhd', kind: 'monitor', d: 27, w: 2560, h: 1440 },
  { id: 'mon-27-4k', kind: 'monitor', d: 27, w: 3840, h: 2160 },
  { id: 'mon-27-5k', kind: 'monitor', d: 27, w: 5120, h: 2880 },
  { id: 'mon-32-qhd', kind: 'monitor', d: 31.5, w: 2560, h: 1440 },
  { id: 'mon-32-4k', kind: 'monitor', d: 32, w: 3840, h: 2160 },
  { id: 'mon-34-uwqhd', kind: 'monitor', d: 34, w: 3440, h: 1440 },
  { id: 'mon-38-uw', kind: 'monitor', d: 38, w: 3840, h: 1600 },
  { id: 'mon-49-dqhd', kind: 'monitor', d: 49, w: 5120, h: 1440 },
  tv(43), tv(50), tv(55), tv(65), tv(75), tv(85), tv(98),
]

export const findPreset = (s: { d: number; w: number; h: number }) =>
  PRESETS.find(p => p.d === s.d && ((p.w === s.w && p.h === s.h) || (p.w === s.h && p.h === s.w)))

/** 자주 비교하는 조합 (프리셋 id) */
export const SCENARIOS: string[][] = [
  ['mon-27-qhd', 'mon-32-4k'],
  ['mon-24-fhd', 'mon-27-qhd'],
  ['mon-27-qhd', 'mon-27-4k'],
  ['mon-27-qhd', 'mon-34-uwqhd', 'mon-49-dqhd'],
  ['tv-55', 'tv-65', 'tv-75', 'tv-85'],
  ['macbook-air-13', 'macbook-pro-14', 'macbook-pro-16'],
  ['iphone-17', 'iphone-17-pro-max', 'galaxy-s25', 'galaxy-s25-ultra'],
]
