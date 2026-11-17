// node scripts/check-font-pairing.ts
import assert from 'node:assert/strict'
import {
  appliedPairWeight, createFontPair, fontPairCss, fontPairCssRequests, fontPairShareUrl, getPairFont,
  limitPairText, PAIR_BODY_LIMIT, PAIR_LINK_LIMIT, PAIR_SIZE_LIMITS, PAIR_TITLE_LIMIT,
  readFontPair, swapFontPair,
} from '../src/utils/fontPairing.ts'
import { FONTS } from '../src/utils/fontPreview.ts'

const defaults = createFontPair('읽기 좋은 제목', '첫 문단\n\n둘째 문단')
const fallback = readFontPair(new URLSearchParams('s=96&w=900&t=catalog'), defaults)
assert.deepEqual(fallback, defaults)
assert.notEqual(fallback.title, defaults.title)

// Explicit share round-trip preserves other tool options and Unicode; it does not mutate either input.
const base = 'https://toolhub.ai.kr/font-preview/?s=48&w=500&f=nanum-gothic&t=catalog#sample'
const state = {
  title: { fontId: 'nanum-myeongjo', size: 48, weight: 800, text: '제목 & ? + # 😀' },
  body: { fontId: 'noto-sans-kr', size: 18, weight: 300, text: '첫 줄\n둘째 줄\n\n"문장" & <tag>' },
}
const before = JSON.stringify(state)
const shared = fontPairShareUrl(base, state)
assert.equal(shared.ok, true)
if (!shared.ok) throw new Error('unexpected failure')
const url = new URL(shared.url)
assert.equal(url.searchParams.get('s'), '48')
assert.equal(url.searchParams.get('t'), 'catalog')
assert.equal(url.searchParams.get('f'), 'nanum-gothic')
assert.equal(url.hash, '#sample')
assert.equal(url.searchParams.get('pair'), '1')
assert.deepEqual(readFontPair(url.searchParams, defaults), state)
assert.equal(JSON.stringify(state), before)
assert.equal([...url.searchParams.keys()].filter(key => key.startsWith('pair')).length, 9)

// Untrusted font IDs, local files, malformed numbers and unsupported URL versions fall back safely.
for (const id of ['local-upload', 'fp-local-123', 'https://evil.example/font.css', "x'); color:red; /*", 'unknown']) {
  const parsed = readFontPair(new URLSearchParams({ pair: '1', pairTitleFont: id, pairBodyFont: id }), defaults)
  assert.equal(parsed.title.fontId, defaults.title.fontId)
  assert.equal(parsed.body.fontId, defaults.body.fontId)
}
assert.deepEqual(readFontPair(new URLSearchParams('pair=2&pairTitleSize=90'), defaults), defaults)
for (const value of ['', ' ', 'Infinity', '-Infinity', 'NaN', 'abc', '1e999']) {
  const parsed = readFontPair(new URLSearchParams({ pair: '1', pairTitleSize: value, pairBodyWeight: value }), defaults)
  assert.equal(parsed.title.size, defaults.title.size)
  assert.equal(parsed.body.weight, defaults.body.weight)
}
const bounds = readFontPair(new URLSearchParams('pair=1&pairTitleSize=-99&pairBodySize=999&pairTitleWeight=9999&pairBodyWeight=-5'), defaults)
assert.equal(bounds.title.size, PAIR_SIZE_LIMITS.title.min)
assert.equal(bounds.body.size, PAIR_SIZE_LIMITS.body.max)
assert.equal(bounds.title.weight, 900)
assert.equal(bounds.body.weight, 100)
const decimal = readFontPair(new URLSearchParams('pair=1&pairTitleSize=33.7&pairBodyWeight=650'), defaults)
assert.equal(decimal.title.size, 34)
assert.equal(decimal.body.weight, 600)

// Text clipping preserves newline/empty samples and never cuts a surrogate pair in half.
assert.equal(limitPairText('가😀', 2), '가')
assert.equal(limitPairText('가😀', 3), '가😀')
const clipped = readFontPair(new URLSearchParams({ pair: '1', pairTitleText: '가'.repeat(200), pairBodyText: '나'.repeat(3000) }), defaults)
assert.equal(clipped.title.text.length, PAIR_TITLE_LIMIT)
assert.equal(clipped.body.text.length, PAIR_BODY_LIMIT)
const empty = readFontPair(new URLSearchParams('pair=1&pairTitleText=&pairBodyText='), defaults)
assert.equal(empty.title.text, '')
assert.equal(empty.body.text, '')

// A fixed-weight font applies its real weight to preview, imports and copied CSS.
const fixed = { ...defaults, title: { ...defaults.title, fontId: 'black-han-sans', weight: 900 } }
assert.equal(appliedPairWeight(fixed.title), 400)
const fixedCss = fontPairCss(fixed)
assert.match(fixedCss, /font-family: 'Black Han Sans', sans-serif/)
assert.match(fixedCss, /font-weight: 400/)
assert.doesNotMatch(fixedCss, /wght@900/)
assert.doesNotMatch(fixedCss, /text=/)
for (const font of FONTS) {
  const part = { ...defaults.title, fontId: font.id, weight: 900 }
  assert.ok(font.weights.includes(appliedPairWeight(part)))
  assert.equal(getPairFont(font.id), font)
}

// Shared families union the selected weights in one full import and share both roles' text subsets.
const same = {
  title: { fontId: 'nanum-gothic', size: 40, weight: 700, text: '제목' },
  body: { fontId: 'nanum-gothic', size: 16, weight: 400, text: '본문' },
}
const sameCss = fontPairCss(same)
assert.equal((sameCss.match(/@import/g) ?? []).length, 1)
assert.match(sameCss, /wght@400;700&display=swap/)
assert.doesNotMatch(sameCss, /800/)
assert.match(sameCss, /font-size: 40px/)
assert.match(sameCss, /font-size: 16px/)
const requests = fontPairCssRequests(same)
assert.equal(requests.length, 2)
for (const request of requests) {
  const chars = new URL(request).searchParams.get('text')
  assert.equal(chars?.length, 4)
  for (const char of '제목본문') assert.ok(chars?.includes(char))
}
assert.equal(fontPairCssRequests({ ...same, title: { ...same.title, weight: 400 } }).length, 1)
assert.equal(fontPairCssRequests({ title: { ...same.title, fontId: 'pretendard' }, body: { ...same.body, fontId: 'pretendard' } }).length, 1)

// Swapping is reversible and keeps each role's content and size intact.
const swapped = swapFontPair(state)
assert.equal(swapped.title.fontId, state.body.fontId)
assert.equal(swapped.title.weight, state.body.weight)
assert.equal(swapped.title.size, state.title.size)
assert.equal(swapped.title.text, state.title.text)
assert.deepEqual(swapFontPair(swapped), state)

// Long links fail explicitly rather than truncating a draft or reporting a copied link.
const long = { ...defaults, body: { ...defaults.body, text: '한'.repeat(PAIR_BODY_LIMIT) } }
assert.deepEqual(fontPairShareUrl(base, long), { ok: false, error: 'length' })
assert.ok(shared.url.length < PAIR_LINK_LIMIT)
assert.deepEqual(fontPairShareUrl('not a URL', defaults), { ok: false, error: 'url' })
assert.deepEqual(fontPairShareUrl('javascript:alert(1)', defaults), { ok: false, error: 'url' })
const repeatShare = fontPairShareUrl(shared.url, defaults)
assert.equal(repeatShare.ok, true)
if (repeatShare.ok) assert.equal(new URL(repeatShare.url).searchParams.getAll('pairTitleFont').length, 1)

console.log('check-font-pairing OK: URL round-trip/validation, catalog isolation, Unicode limits, all font weights, CSS imports/subsets, swap, link caps')
