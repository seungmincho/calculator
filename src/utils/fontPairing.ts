import { FONTS, FONT_BY_ID, clampNum, fontStack, googleCssUrl, nearestWeight, previewCssUrl } from './fontPreview.ts'

export const PAIR_TITLE_LIMIT = 120
export const PAIR_BODY_LIMIT = 2_000
export const PAIR_LINK_LIMIT = 12_000
export const PAIR_WEIGHTS = [100, 200, 300, 400, 500, 600, 700, 800, 900]
export const PAIR_SIZE_LIMITS = { title: { min: 16, max: 96 }, body: { min: 12, max: 40 } } as const

export interface FontPairPart { fontId: string; size: number; weight: number; text: string }
export interface FontPairState { title: FontPairPart; body: FontPairPart }
export type FontPairRole = keyof FontPairState
export const PAIR_QUERY_KEYS = ['pair', 'pairTitleFont', 'pairTitleSize', 'pairTitleWeight', 'pairTitleText', 'pairBodyFont', 'pairBodySize', 'pairBodyWeight', 'pairBodyText'] as const

export function createFontPair(title: string, body: string): FontPairState {
  return {
    title: { fontId: 'noto-serif-kr', size: 36, weight: 700, text: limitPairText(title, PAIR_TITLE_LIMIT) },
    body: { fontId: 'pretendard', size: 16, weight: 400, text: limitPairText(body, PAIR_BODY_LIMIT) },
  }
}

/** Match input maxLength while never leaving half a surrogate pair at the boundary. */
export function limitPairText(text: string, limit: number): string {
  const clipped = text.slice(0, limit)
  return /[\uD800-\uDBFF]$/.test(clipped) ? clipped.slice(0, -1) : clipped
}

export function getPairFont(id: string) {
  return FONT_BY_ID.get(id) ?? FONTS[0]
}

export function appliedPairWeight(part: FontPairPart): number {
  return nearestWeight(getPairFont(part.fontId).weights, part.weight)
}

const number = (value: string | null, min: number, max: number, fallback: number) =>
  Math.round(clampNum(value?.trim() || null, min, max, fallback))

export function readFontPair(params: Pick<URLSearchParams, 'get'>, defaults: FontPairState): FontPairState {
  if (params.get('pair') !== '1') return { title: { ...defaults.title }, body: { ...defaults.body } }
  const part = (role: FontPairRole): FontPairPart => {
    const prefix = role === 'title' ? 'pairTitle' : 'pairBody'
    const fallback = defaults[role]
    const id = params.get(`${prefix}Font`)
    const text = params.get(`${prefix}Text`)
    return {
      fontId: id && FONT_BY_ID.has(id) ? id : fallback.fontId,
      size: number(params.get(`${prefix}Size`), PAIR_SIZE_LIMITS[role].min, PAIR_SIZE_LIMITS[role].max, fallback.size),
      weight: nearestWeight(PAIR_WEIGHTS, number(params.get(`${prefix}Weight`), 100, 900, fallback.weight)),
      text: text === null ? fallback.text : limitPairText(text, role === 'title' ? PAIR_TITLE_LIMIT : PAIR_BODY_LIMIT),
    }
  }
  return { title: part('title'), body: part('body') }
}

/** Keep text and sizes attached to their document roles; swap the font choices and requested weights. */
export function swapFontPair(pair: FontPairState): FontPairState {
  return {
    title: { ...pair.title, fontId: pair.body.fontId, weight: pair.body.weight },
    body: { ...pair.body, fontId: pair.title.fontId, weight: pair.title.weight },
  }
}

function groupedFonts(pair: FontPairState) {
  const groups = new Map<string, { font: ReturnType<typeof getPairFont>; weights: number[]; text: string }>()
  for (const part of [pair.title, pair.body]) {
    const font = getPairFont(part.fontId)
    const weight = nearestWeight(font.weights, part.weight)
    const group = groups.get(font.id)
    if (group) {
      group.weights.push(weight)
      group.text += part.text
    } else groups.set(font.id, { font, weights: [weight], text: part.text })
  }
  return [...groups.values()]
}

/** Combine the text of both roles before requesting subsets for a shared family. */
export function fontPairCssRequests(pair: FontPairState): string[] {
  return [...new Set(groupedFonts(pair).flatMap(({ font, weights, text }) =>
    [...new Set(weights)].map(weight => previewCssUrl(font, weight, text))))]
}

export function fontPairCss(pair: FontPairState): string {
  const imports = groupedFonts(pair).map(({ font, weights }) =>
    `@import url('${font.cssUrl ?? googleCssUrl(font.family, weights)}');`)
  const rule = (role: FontPairRole) => {
    const part = pair[role]
    return [
      `.font-pair-${role} {`,
      `  font-family: ${fontStack(getPairFont(part.fontId))};`,
      `  font-size: ${part.size}px;`,
      `  font-weight: ${appliedPairWeight(part)};`,
      `  line-height: ${role === 'title' ? '1.25' : '1.75'};`,
      '  overflow-wrap: anywhere;',
      '}',
    ].join('\n')
  }
  return [...imports, '', rule('title'), '', rule('body')].join('\n')
}

export function fontPairShareUrl(base: string, pair: FontPairState): { ok: true; url: string } | { ok: false; error: 'length' | 'url' } {
  let url: URL
  try { url = new URL(base) } catch { return { ok: false, error: 'url' } }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return { ok: false, error: 'url' }
  for (const key of PAIR_QUERY_KEYS) url.searchParams.delete(key)
  url.searchParams.set('pair', '1')
  for (const role of ['title', 'body'] as const) {
    const prefix = role === 'title' ? 'pairTitle' : 'pairBody'
    const part = pair[role]
    url.searchParams.set(`${prefix}Font`, getPairFont(part.fontId).id)
    url.searchParams.set(`${prefix}Size`, String(part.size))
    url.searchParams.set(`${prefix}Weight`, String(part.weight))
    url.searchParams.set(`${prefix}Text`, limitPairText(part.text, role === 'title' ? PAIR_TITLE_LIMIT : PAIR_BODY_LIMIT))
  }
  const result = url.toString()
  return result.length > PAIR_LINK_LIMIT ? { ok: false, error: 'length' } : { ok: true, url: result }
}
