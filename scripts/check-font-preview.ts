// 폰트 미리보기 헬퍼 회귀 체크: node scripts/check-font-preview.ts
import assert from 'node:assert/strict'
import {
  FONTS, FONT_BY_ID, CATS, nearestWeight, uniqChars, googleCssUrl, previewCssUrl, fullCssUrl,
  cssSnippet, filterFonts, parseIds, togglePin, clampNum, fontStack, SUBSET_MAX, LOCAL_EXT,
} from '../src/utils/fontPreview.ts'

// 데이터 무결성
assert.equal(new Set(FONTS.map(f => f.id)).size, FONTS.length, 'id 중복')
for (const f of FONTS) {
  assert.ok(CATS.includes(f.cat), f.id)
  assert.ok(f.weights.length > 0 && f.weights.every(w => w % 100 === 0 && w >= 100 && w <= 900), f.id)
  assert.deepEqual([...f.weights].sort((a, b) => a - b), f.weights, `${f.id} 굵기 정렬`)
  assert.ok(f.link.startsWith('https://'), f.id)
  assert.ok(!f.cssUrl || f.cssUrl.startsWith('https://cdn.jsdelivr.net/'), f.id)
}
for (const c of CATS) assert.ok(FONTS.some(f => f.cat === c), `분류 ${c} 비어 있음`)
assert.equal(FONT_BY_ID.get('noto-sans-kr')?.family, 'Noto Sans KR')
assert.equal(FONT_BY_ID.get('pretendard')?.family, 'Pretendard Variable')

// 가까운 굵기
assert.equal(nearestWeight([400, 700, 800], 900), 800)
assert.equal(nearestWeight([400, 700, 800], 500), 400) // 동률 아님: 100 vs 200
assert.equal(nearestWeight([300, 500, 700], 400), 300) // 동률 → 가벼운 쪽
assert.equal(nearestWeight([400], 100), 400)

// 고유 문자
assert.equal(uniqChars('가 나 가\n나다'), '가나다')
assert.equal(uniqChars('ba ab'), 'ab')
assert.equal(uniqChars('😀a😀'), 'a😀') // 서로게이트 페어 보존
assert.equal(uniqChars('   '), '')

// Google Fonts URL
assert.equal(googleCssUrl('Jua'), 'https://fonts.googleapis.com/css2?family=Jua&display=swap')
assert.equal(googleCssUrl('Noto Sans KR', [700, 400, 700]),
  'https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;700&display=swap')
assert.equal(googleCssUrl('Noto Sans KR', [400]), 'https://fonts.googleapis.com/css2?family=Noto+Sans+KR&display=swap')
assert.equal(googleCssUrl('Jua', [], '가 나가'),
  `https://fonts.googleapis.com/css2?family=Jua&text=${encodeURIComponent('가나')}&display=swap`)
const long = Array.from({ length: SUBSET_MAX + 1 }, (_, i) => String.fromCodePoint(0xac00 + i)).join('')
assert.ok(!googleCssUrl('Jua', [], long).includes('text='), '긴 텍스트는 서브셋 생략')
assert.ok(googleCssUrl('Jua', [], long.slice(0, SUBSET_MAX)).includes('text='))
assert.ok(!googleCssUrl('Jua', [], '  ').includes('text='))

const nanum = FONT_BY_ID.get('nanum-gothic')!
assert.equal(previewCssUrl(nanum, 900, '가'),
  `https://fonts.googleapis.com/css2?family=Nanum+Gothic:wght@800&text=${encodeURIComponent('가')}&display=swap`)
assert.equal(previewCssUrl(FONT_BY_ID.get('jua')!, 700, ''), 'https://fonts.googleapis.com/css2?family=Jua&display=swap')
assert.equal(fullCssUrl(nanum), 'https://fonts.googleapis.com/css2?family=Nanum+Gothic:wght@400;700;800&display=swap')
const d2 = FONT_BY_ID.get('d2coding')!
assert.equal(previewCssUrl(d2, 400, '가'), d2.cssUrl)
assert.equal(fullCssUrl(d2), d2.cssUrl)

// 스니펫
assert.equal(fontStack(nanum), "'Nanum Gothic', sans-serif")
assert.equal(fontStack(d2), "'D2Coding', monospace")
const snip = cssSnippet(nanum, 900)
assert.ok(snip.includes(`<link rel="stylesheet" href="${fullCssUrl(nanum)}">`))
assert.ok(snip.includes(`@import url('${fullCssUrl(nanum)}');`))
assert.ok(snip.includes("font-family: 'Nanum Gothic', sans-serif;"))
assert.ok(snip.includes('font-weight: 800;'))
assert.ok(!cssSnippet(nanum).includes('font-weight'))

// 필터·검색
const base = { cat: 'all' as const, q: '', favOnly: false, favs: [] as string[] }
assert.equal(filterFonts(FONTS, base).length, FONTS.length)
assert.ok(filterFonts(FONTS, { ...base, cat: 'myeongjo' }).every(f => f.cat === 'myeongjo'))
assert.deepEqual(filterFonts(FONTS, { ...base, q: '나눔 고딕' }).map(f => f.id), ['nanum-gothic', 'nanum-gothic-coding'])
assert.deepEqual(filterFonts(FONTS, { ...base, q: 'notosans' }).map(f => f.id), ['noto-sans-kr'])
assert.ok(filterFonts(FONTS, { ...base, q: 'woowahan' }).length >= 4) // 제작사 검색
assert.deepEqual(filterFonts(FONTS, { ...base, favOnly: true, favs: ['jua', 'x'] }).map(f => f.id), ['jua'])
assert.equal(filterFonts(FONTS, { ...base, cat: 'coding', q: 'jua' }).length, 0)

// URL 파라미터
assert.deepEqual(parseIds('jua,bogus,jua,noto-sans-kr'), ['jua', 'noto-sans-kr'])
assert.deepEqual(parseIds(null), [])
assert.equal(parseIds(FONTS.map(f => f.id).join(',')).length, 4)
assert.deepEqual(togglePin(['a'], 'a'), [])
assert.deepEqual(togglePin(['a'], 'b'), ['a', 'b'])
assert.deepEqual(togglePin(['a', 'b', 'c', 'd'], 'e'), ['a', 'b', 'c', 'd'])
assert.equal(clampNum('500', 12, 120, 32), 120)
assert.equal(clampNum('abc', 12, 120, 32), 32)
assert.equal(clampNum(null, 12, 120, 32), 32)
assert.equal(clampNum('', 12, 120, 32), 32)
assert.equal(clampNum('48', 12, 120, 32), 48)

assert.ok(LOCAL_EXT.test('a.WOFF2') && LOCAL_EXT.test('b.otf') && !LOCAL_EXT.test('c.eot'))

console.log(`font-preview OK (${FONTS.length} fonts)`)
