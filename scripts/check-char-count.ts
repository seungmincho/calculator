// 글자수 세기 회귀 체크: node scripts/check-char-count.ts
import assert from 'node:assert/strict'
import { analyze, graphemes, bytesKr, bytesUtf8, xLength, manuscript, countSentences, countWords, tidy, collapseSpaces, joinLines, stripSpecial, topWords, splitHighlights, stem, durations } from '../src/utils/charCount.ts'

// 그래핌: ZWJ 가족 이모지·국기·결합 문자·피부색 = 1글자
assert.equal(graphemes('👨‍👩‍👧‍👦').length, 1)
assert.equal(graphemes('🇰🇷').length, 1)
assert.equal(graphemes('é').length, 1)
assert.equal(graphemes('👍🏽').length, 1)
assert.equal(graphemes('각').length, 1, 'NFD 한글 자모 조합 = 1글자')
assert.equal(analyze('안녕 👨‍👩‍👧‍👦').chars, 4)

// 공백 포함/제외, CRLF 통일
const a = analyze('가 나\r\n다')
assert.equal(a.chars, 5); assert.equal(a.charsNoSpace, 3); assert.equal(a.lines, 2)

// 잡코리아·사람인 바이트: 한글 2, ASCII 1, 줄바꿈 1, 이모지 4
assert.equal(bytesKr('가나다'), 6)
assert.equal(bytesKr('abc 1'), 5)
assert.equal(bytesKr('가\n나'), 5)
assert.equal(bytesKr('😀'), 4)
assert.equal(bytesKr('é'), 2)
assert.equal(analyze('가 나').bytesKrNoSpace, 4)
// UTF-8: 한글 3, ASCII 1, 이모지 4
assert.equal(bytesUtf8('가a😀'), 8)
// 사이트 방식 글자수(JS length) vs 그래핌
const e = analyze('좋아요😀')
assert.equal(e.chars, 4); assert.equal(e.siteChars, 5)

// X 가중치: 라틴 1, 한글 2, 이모지 2(조합도 2), URL 23
assert.equal(xLength('hello'), 5)
assert.equal(xLength('안녕'), 4)
assert.equal(xLength('👨‍👩‍👧‍👦'), 2)
assert.equal(xLength('see https://example.com/very/long/path?x=1'), 4 + 23)
assert.equal(xLength('가'.repeat(140)), 280)
assert.equal(xLength('—'), 1, 'em dash 경량 구간')
assert.equal(xLength('가'), 2, 'NFC로 합쳐 한글 1자 = 2')

// 원고지: 들여쓰기 1 + 글자, 소문자·숫자 2자 1칸, 20칸 줄, 10줄 1매
assert.deepEqual(manuscript('가'.repeat(19)), { rows: 1, sheets: 0.1, pages: 1 })
assert.equal(manuscript('가'.repeat(20)).rows, 2)
assert.equal(manuscript('abcd').rows, 1)
assert.equal(manuscript('2026년').rows, 1)
assert.equal(manuscript('가'.repeat(199)).pages, 1)
assert.equal(manuscript('가'.repeat(200)).pages, 2)
assert.equal(manuscript('가\n\n나').rows, 2, '빈 줄 무시, 문단마다 새 줄')
{ // 38 소문자 = 19칸 + 들여쓰기 = 20칸 = 1줄
  assert.equal(manuscript('a'.repeat(38)).rows, 1)
  assert.equal(manuscript('A'.repeat(19)).rows, 1)
}

// 단어·문장
assert.equal(countWords('  hello,  world — ! 안녕 '), 3)
assert.equal(countSentences('원주율은 3.14입니다. 맞나요? 네!'), 3)
assert.equal(countSentences('첫 줄\n둘째 줄'), 2)
assert.equal(countSentences(''), 0)

// 시간
assert.deepEqual(durations('가'.repeat(500)), { readSec: 60, speakSec: 120 })

// 정리 도구
assert.equal(tidy('  a  \n\n\n\n b \n'), 'a\n\nb')
assert.equal(collapseSpaces('a   b　　c'), 'a b c')
assert.equal(joinLines('한 문장이\n이어진다\n\n새 문단'), '한 문장이 이어진다\n\n새 문단')
assert.equal(stripSpecial('안녕★하세요♥! 😀 (a-b)'), '안녕하세요!  (a-b)')

// 반복어
assert.equal(stem('경험을'), '경험'); assert.equal(stem('경험에서'), '경험'); assert.equal(stem('이'), '이')
assert.deepEqual(topWords('경험을 통해 경험이 쌓였고, 경험에서 배웠다. Team team'), [{ word: '경험', count: 3 }, { word: 'team', count: 2 }])
assert.deepEqual(splitHighlights('열정과 열정', ['열정']), [{ text: '열정', hit: true }, { text: '과 ', hit: false }, { text: '열정', hit: true }])
assert.deepEqual(splitHighlights('a+b', ['+']), [{ text: 'a', hit: false }, { text: '+', hit: true }, { text: 'b', hit: false }])

console.log('check-char-count: OK')
