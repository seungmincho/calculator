/**
 * 화면 정보 순수 로직. 검증: node scripts/check-screen-info.ts
 */
import { reduceRatio, nearestCommon } from './aspectRatio.ts'

export { reduceRatio, nearestCommon }

/** CSS px × DPR → 실제(물리) 픽셀 추정. 브라우저가 반올림/배율을 적용하므로 '추정'으로 표기할 것 */
export const physicalPx = (css: number, dpr: number) => Math.round(css * dpr)

/** 대각선 인치 → PPI, 도트 피치(mm), 가로/세로 실제 크기(cm) */
export function ppiCalc(w: number, h: number, diagIn: number) {
  if (!(w > 0 && h > 0 && diagIn > 0)) return null
  const ppi = Math.hypot(w, h) / diagIn
  return {
    ppi,
    dotPitchMm: 25.4 / ppi,
    widthCm: (w / ppi) * 2.54,
    heightCm: (h / ppi) * 2.54,
  }
}

/** 브레이크포인트 정의 (min-width, CSS px) */
export const BREAKPOINTS = {
  tailwind: [['sm', 640], ['md', 768], ['lg', 1024], ['xl', 1280], ['2xl', 1536]],
  bootstrap: [['sm', 576], ['md', 768], ['lg', 992], ['xl', 1200], ['xxl', 1400]],
} as const satisfies Record<string, readonly (readonly [string, number])[]>

export type BreakpointSystem = keyof typeof BREAKPOINTS

/** 뷰포트 너비에서 현재 활성 브레이크포인트 (min-width 기준). 미만이면 tailwind 'base', bootstrap 'xs' */
export function activeBreakpoint(width: number, system: BreakpointSystem): string {
  let name: string = system === 'tailwind' ? 'base' : 'xs'
  for (const [bp, min] of BREAKPOINTS[system]) if (width >= min) name = bp
  return name
}

/** 대표 해상도 이름 (가로/세로 무관) */
const NAMED: [number, number, string][] = [
  [1280, 720, 'HD'], [1366, 768, 'HD'], [1600, 900, 'HD+'], [1280, 800, 'WXGA'], [1440, 900, 'WXGA+'],
  [1680, 1050, 'WSXGA+'], [1920, 1080, 'FHD'], [1920, 1200, 'WUXGA'], [2560, 1080, 'UW-FHD'],
  [2560, 1440, 'QHD'], [2560, 1600, 'WQXGA'], [3440, 1440, 'UWQHD'], [3840, 2160, '4K UHD'],
  [5120, 2880, '5K'], [7680, 4320, '8K'],
]
export function resolutionName(w: number, h: number): string | null {
  const [a, b] = w >= h ? [w, h] : [h, w]
  return NAMED.find(([x, y]) => x === a && y === b)?.[2] ?? null
}

const COMMON_HZ = [24, 30, 48, 50, 60, 72, 75, 85, 90, 100, 120, 144, 165, 170, 175, 180, 200, 240, 280, 300, 360, 480]

/**
 * requestAnimationFrame 프레임 간격(ms) 표본 → 주사율 추정(Hz).
 * 중앙값을 쓰고, 흔한 주사율과 4% 이내면 그 값으로 맞춘다. 배터리 절약·백그라운드 탭에선 낮게 나올 수 있음.
 */
export function estimateHz(deltas: number[]): number | null {
  const d = deltas.filter(x => x > 0 && x < 100).sort((a, b) => a - b)
  if (d.length < 10) return null
  const median = d[Math.floor(d.length / 2)]
  const raw = 1000 / median
  const near = COMMON_HZ.reduce((p, c) => (Math.abs(c - raw) < Math.abs(p - raw) ? c : p))
  return Math.abs(near - raw) / near <= 0.04 ? near : Math.round(raw)
}

/** 참고용 기기 해상도 (기본 설정 기준. 확대/디스플레이 크기 설정에 따라 달라짐) */
export const DEVICE_REFERENCE: { name: string; css: [number, number]; dpr: number; kind: 'phone' | 'tablet' | 'laptop' | 'monitor' }[] = [
  { name: 'iPhone SE 2/3', css: [375, 667], dpr: 2, kind: 'phone' },
  { name: 'iPhone 13 / 14', css: [390, 844], dpr: 3, kind: 'phone' },
  { name: 'iPhone 15 / 16', css: [393, 852], dpr: 3, kind: 'phone' },
  { name: 'iPhone 16 Pro', css: [402, 874], dpr: 3, kind: 'phone' },
  { name: 'iPhone 15 Pro Max / 16 Plus', css: [430, 932], dpr: 3, kind: 'phone' },
  { name: 'iPhone 16 Pro Max', css: [440, 956], dpr: 3, kind: 'phone' },
  { name: 'Galaxy S24', css: [360, 780], dpr: 3, kind: 'phone' },
  { name: 'iPad mini 6', css: [744, 1133], dpr: 2, kind: 'tablet' },
  { name: 'iPad 10', css: [820, 1180], dpr: 2, kind: 'tablet' },
  { name: 'iPad Pro 11" (M1/M2)', css: [834, 1194], dpr: 2, kind: 'tablet' },
  { name: 'MacBook Air 13" (M1)', css: [1440, 900], dpr: 2, kind: 'laptop' },
  { name: 'MacBook Pro 14"', css: [1512, 982], dpr: 2, kind: 'laptop' },
  { name: '15.6" FHD', css: [1536, 864], dpr: 1.25, kind: 'laptop' },
  { name: '24" FHD', css: [1920, 1080], dpr: 1, kind: 'monitor' },
  { name: '27" QHD', css: [2560, 1440], dpr: 1, kind: 'monitor' },
  { name: '27" 4K', css: [2560, 1440], dpr: 1.5, kind: 'monitor' },
]

/** 화면 비율 라벨: 대표 비율과 정확히 같으면 '16:10'(8:5 대신), 작은 정수비면 '7:3', 대표 비율 근처면 '≈ 21:9', 아니면 '2.16:1' (방향 유지) */
export function ratioLabel(w: number, h: number): string {
  const [a, b] = reduceRatio(w, h)
  if (!a || !b) return '—'
  const near = nearestCommon(w, h)
  if (near?.exact) return near.label
  if (a <= 21 && b <= 21) return `${a}:${b}`
  if (near) return `≈ ${near.label}`
  const r = (Math.max(w, h) / Math.min(w, h)).toFixed(2)
  return w >= h ? `${r}:1` : `1:${r}`
}
