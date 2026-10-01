// CSS 단위 변환 회귀 체크: node scripts/check-css-units.ts
import { convert, fmt, parseCssValue, pxToRemCss, fluidClamp, clampAt, type CssContext } from '../src/utils/cssUnits.ts'

let fail = 0
const eq = (a: unknown, b: unknown, msg: string) => {
  if (JSON.stringify(a) !== JSON.stringify(b)) { fail++; console.log('FAIL', msg, JSON.stringify(a), '!=', JSON.stringify(b)) }
}
const c: CssContext = { root: 16, parent: 20, vw: 1440, vh: 900 }
const near = (a: number, b: number, msg: string) => { if (Math.abs(a - b) > 1e-9) { fail++; console.log('FAIL', msg, a, '!=', b) } }

// 절대 단위 (CSS Values 4)
near(convert(1, 'in', 'px', c), 96, '1in = 96px')
near(convert(1, 'in', 'cm', c), 2.54, '1in = 2.54cm')
near(convert(1, 'in', 'pt', c), 72, '1in = 72pt')
near(convert(1, 'in', 'pc', c), 6, '1in = 6pc')
near(convert(1, 'pc', 'px', c), 16, '1pc = 16px')
near(convert(12, 'pt', 'px', c), 16, '12pt = 16px')
near(convert(1, 'mm', 'Q', c), 4, '1mm = 4Q')
near(convert(1, 'cm', 'mm', c), 10, '1cm = 10mm')
eq(fmt(convert(1, 'cm', 'px', c)), '37.7953', '1cm ≈ 37.7953px')

// 상대·뷰포트
near(convert(24, 'px', 'rem', c), 1.5, '24px = 1.5rem @16')
near(convert(1, 'em', 'px', c), 20, '1em = parent 20px')
near(convert(150, '%', 'px', c), 30, '150% of 20px')
near(convert(1, 'ch', 'px', c), 10, 'ch ≈ 0.5em')
near(convert(10, 'vw', 'px', c), 144, '10vw @1440')
near(convert(10, 'vmin', 'px', c), 90, 'vmin = vh when landscape')
near(convert(10, 'vmax', 'px', c), 144, 'vmax = vw when landscape')
near(convert(2, 'rem', 'em', c), 1.6, '2rem → em')

// fmt
eq(fmt(0.1 + 0.2), '0.3', 'float noise')
eq(fmt(-0.00001), '-0.00001', 'tiny keeps sign')
eq(fmt(-0), '0', '-0')
eq(fmt(1 / 3), '0.3333', '4 decimals')

// parse
eq(parseCssValue('24px'), { value: 24, unit: 'px' }, 'parse px')
eq(parseCssValue(' 1.5 REM '), { value: 1.5, unit: 'rem' }, 'parse rem case')
eq(parseCssValue('-.5em'), { value: -0.5, unit: 'em' }, 'parse -.5em')
eq(parseCssValue('3q'), { value: 3, unit: 'Q' }, 'parse q')
eq(parseCssValue('12'), { value: 12 }, 'parse bare')
eq(parseCssValue('12foo'), null, 'unknown unit')
eq(parseCssValue('abc'), null, 'garbage')

// 일괄 px → rem
const o = { root: 16, minPx: 0, keep1px: true, skipMedia: true }
eq(pxToRemCss('a{margin:8px -24px;border:1px solid}', o),
  { out: 'a{margin:0.5rem -1.5rem;border:1px solid}', count: 2 }, 'basic + keep 1px')
eq(pxToRemCss('a{border:1px solid}', { ...o, keep1px: false }).out, 'a{border:0.0625rem solid}', 'convert 1px')
eq(pxToRemCss('a{padding:2px 12px}', { ...o, minPx: 4 }).out, 'a{padding:2px 0.75rem}', 'min threshold')
eq(pxToRemCss('@media (min-width: 768px) {\n  a{font-size:20px}\n}', o).out,
  '@media (min-width: 768px) {\n  a{font-size:1.25rem}\n}', 'skip media line')
eq(pxToRemCss('@media (min-width: 768px){}', { ...o, skipMedia: false }).out, '@media (min-width: 48rem){}', 'convert media')
eq(pxToRemCss('/* 16px */ a{background:url(img-32px.png);content:"8px";width:0px;w:1.5px;x:.5px}', o).out,
  '/* 16px */ a{background:url(img-32px.png);content:"8px";width:0px;w:0.0938rem;x:0.0313rem}', 'protected + 0px')
eq(pxToRemCss('a{width:calc(100% - 32px);b:foo10px}', o).out, 'a{width:calc(100% - 2rem);b:foo10px}', 'calc, ident')

// clamp (Utopia 방식)
const r = fluidClamp({ minSize: 16, maxSize: 24, minVw: 375, maxVw: 1440, root: 16 })!
eq(r.css, 'clamp(1rem, 0.8239rem + 0.7512vw, 1.5rem)', 'clamp css')
near(clampAt(r, 375, 16), 16, 'clamp @ minVw')
near(clampAt(r, 1440, 16), 24, 'clamp @ maxVw')
near(clampAt(r, 320, 16), 16, 'clamp below')
near(clampAt(r, 1920, 16), 24, 'clamp above')
const shrink = fluidClamp({ minSize: 40, maxSize: 24, minVw: 375, maxVw: 1440, root: 16 })!
near(clampAt(shrink, 375, 16), 40, 'shrinking @ min')
near(clampAt(shrink, 1440, 16), 24, 'shrinking @ max')
eq(shrink.css.startsWith('clamp(1.5rem,') && shrink.css.includes(' - '), true, 'shrinking order + sign')
eq(fluidClamp({ minSize: 16, maxSize: 24, minVw: 800, maxVw: 800, root: 16 }), null, 'zero range')

console.log(fail ? `${fail} FAILED` : 'all css-unit checks passed')
if (fail) process.exit(1)
