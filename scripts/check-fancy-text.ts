// 텍스트 꾸미기 회귀 체크: node scripts/check-fancy-text.ts
import assert from 'node:assert/strict'
import { STYLES, FRAMES, styleByKey, unchangedChars, visibleLength, splitJamo, chosung, applyFrame } from '../src/utils/fancyText.ts'

const conv = (key: string, s: string) => styleByKey(key)!.convert(s)
const cps = (s: string) => [...s].map((c) => c.codePointAt(0)!.toString(16))

// 기본 블록 + 서로게이트 쌍 (𝐀 = U+1D400 → UTF-16 2칸, 코드포인트 1개)
assert.deepEqual(cps(conv('bold', 'Aa0')), ['1d400', '1d41a', '1d7ce'])
assert.equal(conv('bold', 'Hi').length, 4)
assert.equal([...conv('bold', 'Hi')].length, 2)
assert.deepEqual(cps(conv('monospace', 'z9')), ['1d6a3', '1d7ff'])
assert.deepEqual(cps(conv('sansSerifBold', 'Z')), ['1d5ed'])

// 수학 영숫자 빈자리(holes): 미할당 코드포인트로 가면 □ 로 보임
assert.equal(conv('italic', 'h'), 'ℎ')                 // U+1D455 미할당
assert.equal(conv('script', 'BEFHILMR'), 'ℬℰℱℋℐℒℳℛ')
assert.equal(conv('script', 'ego'), 'ℯℊℴ')
assert.equal(conv('fraktur', 'CHIRZ'), 'ℭℌℑℜℨ')
assert.equal(conv('doubleStruck', 'CHNPQRZ'), 'ℂℍℕℙℚℝℤ')
const RESERVED = new Set([0x1d455, 0x1d49d, 0x1d4a0, 0x1d4a1, 0x1d4a3, 0x1d4a4, 0x1d4a7, 0x1d4a8, 0x1d4ad, 0x1d4ba, 0x1d4bc, 0x1d4c4,
  0x1d506, 0x1d50b, 0x1d50c, 0x1d515, 0x1d51d, 0x1d53a, 0x1d53f, 0x1d545, 0x1d547, 0x1d548, 0x1d549, 0x1d551])
const ALL = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
for (const s of STYLES) {
  for (const c of s.convert(ALL)) assert.ok(!RESERVED.has(c.codePointAt(0)!), `${s.key}: reserved U+${c.codePointAt(0)!.toString(16)}`)
  // 어떤 스타일도 고립 서로게이트를 만들지 않음
  assert.ok(s.convert(ALL + ' 한글 😀').isWellFormed?.() ?? true, `${s.key}: lone surrogate`)
}

// 한글 passthrough + 안 바뀐 글자 보고
assert.equal(conv('bold', 'Hi 안녕!'), '𝐇𝐢 안녕!')
assert.deepEqual(unchangedChars(styleByKey('bold')!, 'Hi 안녕!'), ['안', '녕'])
assert.deepEqual(unchangedChars(styleByKey('italic')!, 'Hi 5'), ['5'])     // 이탤릭은 숫자 없음
assert.deepEqual(unchangedChars(styleByKey('tiny')!, 'quiz'), ['q'])       // 위첨자 q 없음
assert.deepEqual(unchangedChars(styleByKey('upsideDown')!, 'ox'), [])      // 대칭 글자는 지원으로 간주
assert.deepEqual(unchangedChars(styleByKey('jamo')!, 'abc'), [])           // 한글 스타일은 경고 없음

// 기타 스타일
assert.equal(conv('negativeSquared', 'ab'), '🅰🅱')                        // U+1F170 (예전엔 동그라미 블록 오류)
assert.equal(conv('squared', 'a'), '🄰')
assert.equal(conv('circled', 'a10'), 'ⓐ①⓪')
assert.equal(conv('fullwidth', 'A1 !'), 'Ａ１　！')
assert.equal(conv('upsideDown', 'hello!'), '¡oʃʃǝɥ'.replace(/ʃ/g, 'ן'))
assert.equal(conv('smallCaps', 'Hello'), 'ʜᴇʟʟᴏ')
assert.equal(conv('strikethrough', 'a b'), 'a̶ b̶')
assert.equal(visibleLength(conv('strikethrough', 'abc')), 3)

// 한글 꾸미기
assert.equal(splitJamo('안녕 hi'), 'ㅇㅏㄴㄴㅕㅇ hi')
assert.equal(splitJamo('닭'), 'ㄷㅏㄺ')
assert.equal(chosung('럭키 day'), 'ㄹㅋ day')
assert.equal(conv('chosungCircled', '럭키'), '㉣㉪')
assert.equal(conv('chosungParen', '까치'), '㈀㈉')
assert.equal(conv('heartBetween', '행운 가득'), '행♡운 가♡득')
assert.equal(conv('eachBracket', '해 달'), '『해』 『달』')

// 테두리
assert.equal(applyFrame(FRAMES[0], '  럭키 '), '꧁ 럭키 ꧂')
assert.equal(new Set(STYLES.map((s) => s.key)).size, STYLES.length)

console.log(`all passed (${STYLES.length} styles, ${FRAMES.length} frames)`)
