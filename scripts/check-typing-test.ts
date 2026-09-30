// 타자 연습 로직 회귀 체크: node scripts/check-typing-test.ts
import assert from 'node:assert/strict'
import {
  keys, textKeystrokes, diffTyped, correctKeystrokes, perMinute, wpm, accuracy,
  missedKeys, topMissed, gradeLevel, vsAverage, dayNumber, dailyIndex, streamText, TEXTS,
} from '../src/utils/typingTest.ts'

// 자모 타수
assert.deepEqual(keys('닭'), ['ㄷ', 'ㅏ', 'ㄹ', 'ㄱ'])
assert.equal(textKeystrokes('닭'), 4)
assert.equal(textKeystrokes('값'), 4)
assert.equal(textKeystrokes('과'), 3)      // ㄱㅗㅏ
assert.equal(textKeystrokes('의'), 3)      // ㅇㅡㅣ
assert.equal(textKeystrokes('꽤'), 3)      // ㄲ(1, Shift 미포함) ㅗㅐ
assert.equal(textKeystrokes('쌍'), 3)
assert.equal(textKeystrokes('얘'), 2)      // ㅒ = Shift+ㅐ 1타
assert.equal(textKeystrokes('뷁'), 5)      // ㅂ + ㅞ(ㅜㅔ) + ㄺ(ㄹㄱ)
assert.equal(textKeystrokes('안녕하세요.'), 3 + 3 + 2 + 2 + 2 + 1)
assert.equal(textKeystrokes('ㅘ'), 2)
assert.equal(textKeystrokes('Hi!'), 3)

// IME 안전 비교
assert.deepEqual(diffTyped('다라', 'ㄷ'), ['composing', 'pending'])
assert.deepEqual(diffTyped('다라', '달'), ['composing', 'pending'])   // 받침이 다음 초성으로 넘어갈 예정
assert.deepEqual(diffTyped('다라', '다라'), ['correct', 'correct'])
assert.deepEqual(diffTyped('다라', '더'), ['wrong', 'pending'])       // 조합 중이어도 틀린 모음
assert.deepEqual(diffTyped('과', '고'), ['composing'])                // 겹모음 앞부분
assert.deepEqual(diffTyped('닭', '달'), ['composing'])                // 겹받침 앞부분
assert.deepEqual(diffTyped('다 ', '달 '), ['wrong', 'correct'])       // 확정된 글자는 틀림
assert.deepEqual(diffTyped('다라', '달라'), ['wrong', 'correct'])     // 마지막 글자만 조합 중으로 봄
assert.deepEqual(diffTyped('ab', 'a'), ['correct', 'pending'])
assert.deepEqual(diffTyped('ab', 'ax'), ['correct', 'wrong'])
assert.deepEqual(diffTyped('다.', 'ㅏ'), ['wrong', 'pending'])

// 속도 · 정확도
assert.equal(correctKeystrokes('다라', '달'), 3)
assert.equal(correctKeystrokes('닭 한 마리', '닭 한 마'), 4 + 1 + 3 + 1 + 2)
assert.equal(perMinute(100, 30_000), 200)
assert.equal(perMinute(5, 0), 0)
assert.equal(wpm(50, 60_000), 10)
assert.equal(accuracy(50, 1), 98)
assert.equal(accuracy(0, 0), 100)
assert.equal(accuracy(3, 5), 0)

// 오타 자모
assert.deepEqual(missedKeys('닭', '닥'), ['ㄹ'])
assert.deepEqual(missedKeys('과', '가'), ['ㅗ'])
assert.deepEqual(topMissed([['닭', '닥'], ['달', '닥'], ['A', 'b']]), [['ㄹ', 2], ['a', 1]])

// 등급
assert.equal(gradeLevel(99, 'ko'), 0)
assert.equal(gradeLevel(300, 'ko'), 3)
assert.equal(gradeLevel(650, 'ko'), 6)
assert.equal(gradeLevel(45, 'en'), 3)
assert.equal(vsAverage(500, 'ko'), 100)

// 오늘의 문장 (KST)
const kstMidnight = Date.UTC(2025, 11, 31, 15)
assert.equal(dayNumber(kstMidnight), 1)
assert.equal(dayNumber(kstMidnight - 1), 0)
const n = TEXTS.ko.short.length
const cycle = new Set(Array.from({ length: n }, (_, k) => dailyIndex(k + 1)))
assert.equal(cycle.size, n, 'no repeats within a cycle')
assert.equal(dailyIndex(5), dailyIndex(5))

// 지문 품질: 앞뒤 공백·연속 공백·줄바꿈 없음 (Enter 입력 막음)
for (const lang of ['ko', 'en'] as const) for (const s of [...TEXTS[lang].short, ...TEXTS[lang].long]) {
  assert.equal(s, s.trim().replace(/\s+/g, ' '), s)
}
assert.ok([...streamText('ko', 1)].length > 600)
assert.ok(streamText('en', 1).length > 1000)

console.log('check-typing-test: OK')
