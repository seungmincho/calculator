/**
 * CSS 단위 변환 순수 로직. 검증: node scripts/check-css-units.ts
 * 절대 단위는 CSS Values 4 정의(1in = 96px = 2.54cm = 72pt = 6pc, 1Q = 1/4mm)를 그대로 사용.
 */

export type CssUnit =
  | 'px' | 'rem' | 'em' | '%' | 'ch' | 'ex'
  | 'vw' | 'vh' | 'vmin' | 'vmax'
  | 'pt' | 'pc' | 'in' | 'cm' | 'mm' | 'Q'

export const UNIT_GROUPS: { key: 'font' | 'viewport' | 'physical'; units: CssUnit[] }[] = [
  { key: 'font', units: ['px', 'rem', 'em', '%', 'ch', 'ex'] },
  { key: 'viewport', units: ['vw', 'vh', 'vmin', 'vmax'] },
  { key: 'physical', units: ['pt', 'pc', 'in', 'cm', 'mm', 'Q'] },
]
export const ALL_UNITS: CssUnit[] = UNIT_GROUPS.flatMap(g => g.units)
/** 글꼴마다 달라 정확히 알 수 없는 단위 — CSS 명세 대체값 0.5em으로 근사 */
export const APPROX_UNITS: CssUnit[] = ['ch', 'ex']

export interface CssContext { root: number; parent: number; vw: number; vh: number }

/** 1단위가 몇 px인지 */
export function pxPer(unit: CssUnit, c: CssContext): number {
  switch (unit) {
    case 'px': return 1
    case 'rem': return c.root
    case 'em': return c.parent
    case '%': return c.parent / 100 // font-size 기준
    case 'ch': case 'ex': return c.parent / 2
    case 'vw': return c.vw / 100
    case 'vh': return c.vh / 100
    case 'vmin': return Math.min(c.vw, c.vh) / 100
    case 'vmax': return Math.max(c.vw, c.vh) / 100
    case 'in': return 96
    case 'pt': return 96 / 72
    case 'pc': return 16
    case 'cm': return 96 / 2.54
    case 'mm': return 96 / 25.4
    case 'Q': return 96 / 101.6
  }
}

export const convert = (v: number, from: CssUnit, to: CssUnit, c: CssContext) =>
  from === to ? v : (v * pxPer(from, c)) / pxPer(to, c)

/** 소수점 dec자리 반올림 후 불필요한 0 제거. -0 → "0" */
export function fmt(n: number, dec = 4): string {
  if (!Number.isFinite(n)) return '—'
  const r = Number(n.toFixed(dec))
  if (r === 0 && n !== 0) return Number(n.toPrecision(3)).toString()
  return (r || 0).toString()
}

/** "24px", "1.5 rem", "-.5em", "12" → { value, unit? } */
export function parseCssValue(s: string): { value: number; unit?: CssUnit } | null {
  const m = s.trim().match(/^(-?(?:\d+\.?\d*|\.\d+))\s*([a-zA-Z%]+)?$/)
  if (!m) return null
  const value = Number(m[1])
  if (!m[2]) return { value }
  const unit = ALL_UNITS.find(u => u.toLowerCase() === m[2].toLowerCase())
  return unit ? { value, unit } : null
}

export interface PxToRemOptions { root: number; minPx: number; keep1px: boolean; skipMedia: boolean }

/** CSS 텍스트의 px 값을 rem으로. 주석·url()·문자열 안은 건드리지 않음 */
export function pxToRemCss(css: string, o: PxToRemOptions): { out: string; count: number } {
  let count = 0
  const conv = (chunk: string) =>
    chunk.replace(/(?<![\w.\-])(-?(?:\d+\.?\d*|\.\d+))px\b/g, (all, num: string) => {
      const px = Number(num)
      const abs = Math.abs(px)
      if (abs === 0 || abs < o.minPx || (o.keep1px && abs === 1)) return all
      count++
      return `${fmt(px / o.root)}rem`
    })
  // 보호 구간 제외하고 줄 단위로 변환 (@media 줄은 옵션에 따라 유지)
  const parts = css.split(/(\/\*[\s\S]*?\*\/|url\([^)]*\)|"(?:[^"\\\n]|\\.)*"|'(?:[^'\\\n]|\\.)*')/)
  const result = parts
    .map((p, i) => {
      if (i % 2 === 1) return p
      return p.split('\n').map(line => (o.skipMedia && /@media\b/i.test(line) ? line : conv(line))).join('\n')
    })
    .join('')
  return { out: result, count }
}

export interface ClampInput { minSize: number; maxSize: number; minVw: number; maxVw: number; root: number }
export interface ClampResult { css: string; minRem: number; maxRem: number; slopeVw: number; interceptRem: number }

/** 유동 타이포: minVw에서 minSize, maxVw에서 maxSize가 되도록 선형 보간 */
export function fluidClamp({ minSize, maxSize, minVw, maxVw, root }: ClampInput): ClampResult | null {
  if (!(maxVw > minVw) || !(root > 0) || !(minSize > 0) || !(maxSize > 0)) return null
  const slope = (maxSize - minSize) / (maxVw - minVw)
  const slopeVw = slope * 100
  const interceptRem = (minSize - slope * minVw) / root
  const lo = Math.min(minSize, maxSize) / root
  const hi = Math.max(minSize, maxSize) / root
  const pref = `${fmt(interceptRem)}rem ${slopeVw < 0 ? '-' : '+'} ${fmt(Math.abs(slopeVw))}vw`
  return { css: `clamp(${fmt(lo)}rem, ${pref}, ${fmt(hi)}rem)`, minRem: lo, maxRem: hi, slopeVw, interceptRem }
}

/** clamp 결과를 특정 뷰포트 너비에서 계산한 px */
export function clampAt(r: ClampResult, vwPx: number, root: number): number {
  const pref = r.interceptRem * root + (r.slopeVw / 100) * vwPx
  return Math.min(Math.max(pref, r.minRem * root), r.maxRem * root)
}
