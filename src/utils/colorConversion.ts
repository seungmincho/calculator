export interface RgbColor { readonly r: number; readonly g: number; readonly b: number }
export interface HslColor { readonly h: number; readonly s: number; readonly l: number }
export interface ConvertedColor {
  readonly hex: string
  readonly rgb: Readonly<RgbColor>
  readonly hsl: Readonly<HslColor>
  readonly hsv: Readonly<{ h: number; s: number; v: number }>
  readonly cmyk: Readonly<{ c: number; m: number; y: number; k: number }>
}

/** Only opaque 3/6-digit HEX is supported; never partially consume an invalid draft. */
export function parseOpaqueHex(input: unknown): string | null {
  if (typeof input !== 'string') return null
  const match = /^#?([a-f\d]{3}|[a-f\d]{6})$/i.exec(input.trim())
  if (!match) return null
  const digits = match[1].length === 3 ? [...match[1]].map(value => value + value).join('') : match[1]
  return `#${digits.toUpperCase()}`
}

export function rgbColorHex(r: number, g: number, b: number): string | null {
  if (![r, g, b].every(Number.isFinite)) return null
  return '#' + [r, g, b].map(value => Math.max(0, Math.min(255, Math.round(value))).toString(16).padStart(2, '0')).join('').toUpperCase()
}

/** Matches the existing converter's integer RGB/HSL/HSV/CMYK rounding. */
export function convertOpaqueColor(input: unknown): ConvertedColor | null {
  const hex = parseOpaqueHex(input)
  if (!hex) return null
  const rgb = Object.freeze({ r: parseInt(hex.slice(1, 3), 16), g: parseInt(hex.slice(3, 5), 16), b: parseInt(hex.slice(5, 7), 16) })
  const r = rgb.r / 255, g = rgb.g / 255, b = rgb.b / 255, max = Math.max(r, g, b), min = Math.min(r, g, b), difference = max - min
  const lightness = (max + min) / 2
  let hue = 0
  if (difference !== 0) {
    if (max === r) hue = ((g - b) / difference + (g < b ? 6 : 0)) / 6
    else if (max === g) hue = ((b - r) / difference + 2) / 6
    else hue = ((r - g) / difference + 4) / 6
  }
  const saturation = difference === 0 ? 0 : lightness > 0.5 ? difference / (2 - max - min) : difference / (max + min)
  const black = 1 - max
  return Object.freeze({ hex, rgb,
    hsl: Object.freeze({ h: Math.round(hue * 360), s: Math.round(saturation * 100), l: Math.round(lightness * 100) }),
    hsv: Object.freeze({ h: Math.round(hue * 360), s: Math.round((max === 0 ? 0 : difference / max) * 100), v: Math.round(max * 100) }),
    cmyk: Object.freeze(black === 1 ? { c: 0, m: 0, y: 0, k: 100 } : {
      c: Math.round(((1 - r - black) / (1 - black)) * 100), m: Math.round(((1 - g - black) / (1 - black)) * 100),
      y: Math.round(((1 - b - black) / (1 - black)) * 100), k: Math.round(black * 100),
    }),
  })
}

export function hslColorHex(h: number, s: number, l: number): string | null {
  if (![h, s, l].every(Number.isFinite) || h < 0 || h > 360 || s < 0 || s > 100 || l < 0 || l > 100) return null
  h /= 360; s /= 100; l /= 100
  if (s === 0) return rgbColorHex(l * 255, l * 255, l * 255)
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q
  const channel = (at: number) => {
    if (at < 0) at += 1
    if (at > 1) at -= 1
    if (at < 1 / 6) return p + (q - p) * 6 * at
    if (at < 1 / 2) return q
    if (at < 2 / 3) return p + (q - p) * (2 / 3 - at) * 6
    return p
  }
  return rgbColorHex(channel(h + 1 / 3) * 255, channel(h) * 255, channel(h - 1 / 3) * 255)
}

export type ColorQuery = { status: 'absent' } | { status: 'invalid' } | { status: 'valid'; hex: string }
export function readColorQuery(params: URLSearchParams): ColorQuery {
  const values = params.getAll('color')
  if (!values.length) return { status: 'absent' }
  if (values.length !== 1) return { status: 'invalid' }
  const hex = parseOpaqueHex(values[0])
  return hex ? { status: 'valid', hex } : { status: 'invalid' }
}

/** Own just one parameter. The caller retains history.state when committing this URL. */
export function colorQueryUrl(href: string, input: unknown): string | null {
  const hex = parseOpaqueHex(input)
  if (!hex) return null
  try { const url = new URL(href); url.searchParams.set('color', hex.slice(1)); return url.href } catch { return null }
}
