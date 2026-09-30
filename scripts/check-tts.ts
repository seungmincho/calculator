// 텍스트 읽어주기 회귀 체크: node scripts/check-tts.ts
import assert from 'node:assert/strict'
import {
  splitSentences, chunkText, splitLong, estimateSeconds, formatDuration, tidyText, wordRange,
  sortVoices, pickVoice, detectPlatform,
} from '../src/utils/tts.ts'

const texts = (s: string) => splitSentences(s).map((x) => x.text)

// 문장 분리
assert.deepEqual(texts('안녕하세요. 반갑습니다!'), ['안녕하세요.', '반갑습니다!'])
assert.deepEqual(texts('원주율은 3.14입니다. 버전 1.2.3도 그대로.'), ['원주율은 3.14입니다.', '버전 1.2.3도 그대로.'])
assert.deepEqual(texts('그가 말했다. "정말요?" 네.'), ['그가 말했다.', '"정말요?"', '네.'])
assert.deepEqual(texts('“좋아요!” 그녀가 웃었다'), ['“좋아요!”', '그녀가 웃었다'])
assert.deepEqual(texts('첫 줄\n둘째 줄\n\n셋째'), ['첫 줄', '둘째 줄', '셋째'])
assert.deepEqual(texts('그는 "정말 좋아요!"라고 말했다. 끝.'), ['그는 "정말 좋아요!"라고 말했다.', '끝.'])
assert.deepEqual(texts('했어요.하지만 괜찮아요'), ['했어요.', '하지만 괜찮아요'])
assert.deepEqual(texts('음... 글쎄요?! 정말'), ['음...', '글쎄요?!', '정말'])
assert.deepEqual(texts('  \n ... \n'), [], '기호만 있는 조각은 버림')
assert.deepEqual(texts('Hello world. It costs $3.50 now.'), ['Hello world.', 'It costs $3.50 now.'])

// 오프셋이 원문과 일치
const sample = '  오늘은 2026년 10월 1일입니다.  "날씨가 좋네요!"\n\n내일도 맑음. 끝'
for (const s of splitSentences(sample)) assert.equal(sample.slice(s.start, s.end), s.text)

// 긴 문장 청크: 모두 max 이하, 오프셋 일치, 내용 보존
const long = Array.from({ length: 30 }, (_, i) => `항목 ${i}번은 이렇습니다`).join(', ') + '.'
const chunks = chunkText(long, 100)
assert.ok(chunks.length > 3)
for (const c of chunks) {
  assert.ok(c.text.length <= 100, `청크 길이 ${c.text.length}`)
  assert.equal(long.slice(c.start, c.end), c.text)
}
assert.equal(chunks.map((c) => c.text).join(' ').replace(/\s+/g, ''), long.replace(/\s+/g, ''))
// 공백·쉼표 없는 긴 글자는 강제로 자름
const noSpace = '가'.repeat(250)
const hard = splitLong({ text: noSpace, start: 0, end: 250 }, 100)
assert.deepEqual(hard.map((c) => c.text.length), [100, 100, 50])
// 짧은 문장은 그대로
assert.equal(chunkText('짧다. 짧아.', 100).length, 2)

// 소요 시간
const ko = '가'.repeat(65)
assert.ok(Math.abs(estimateSeconds(ko) - (10 + 0.35)) < 0.01)
assert.ok(Math.abs(estimateSeconds(ko, 2) - estimateSeconds(ko) / 2) < 0.01)
assert.ok(estimateSeconds('one two three four five six seven eight nine ten.') > 3)
assert.equal(estimateSeconds(''), 0)
assert.equal(formatDuration(0), '0:00')
assert.equal(formatDuration(59.6), '1:00')
assert.equal(formatDuration(125), '2:05')

// 텍스트 정리
assert.equal(tidyText('가나\n다라\n\n\n마바   사\t아 '), '가나 다라\n\n마바 사 아')
assert.equal(tidyText('a\r\nb\r\n\r\nc'), 'a b\n\nc')

// 단어 범위
assert.deepEqual(wordRange('안녕 세상아', 3), [3, 6])
assert.deepEqual(wordRange('안녕 세상아', 0, 2), [0, 2])

// 음성 정렬/선택
const voices = [
  { name: 'Microsoft David', lang: 'en-US', default: true },
  { name: 'Microsoft Heami', lang: 'ko-KR' },
  { name: 'Google 한국의', lang: 'ko-KR' },
  { name: 'Microsoft SunHi Online (Natural) - Korean', lang: 'ko-KR' },
  { name: 'Google 日本語', lang: 'ja-JP' },
]
assert.deepEqual(sortVoices(voices).map((v) => v.name), [
  'Microsoft SunHi Online (Natural) - Korean', 'Google 한국의', 'Microsoft Heami', 'Microsoft David', 'Google 日本語',
])
assert.equal(pickVoice(voices)?.name, 'Microsoft SunHi Online (Natural) - Korean')
assert.equal(pickVoice(voices, 'Microsoft Heami')?.name, 'Microsoft Heami')
assert.equal(pickVoice(voices, '없는 음성')?.name, 'Microsoft SunHi Online (Natural) - Korean')
assert.equal(pickVoice(voices.filter((v) => !v.lang.startsWith('ko')))?.name, 'Microsoft David')
assert.equal(pickVoice([]), null)

assert.equal(detectPlatform('Mozilla/5.0 (Linux; Android 14)'), 'android')
assert.equal(detectPlatform('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)'), 'ios')
assert.equal(detectPlatform('Mozilla/5.0 (Windows NT 10.0; Win64; x64)'), 'windows')
assert.equal(detectPlatform('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)'), 'mac')

console.log('check-tts: OK')
