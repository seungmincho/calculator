// 숫자 한글 변환 회귀 체크: node scripts/check-number-to-korean.ts
import { parseAmount, toKoreanReading, toKoreanFormal, toHanja, toMixed, toEnglish, canonical, addDigits } from '../src/utils/numberToKorean.ts'

let fail = 0
const eq = (name: string, got: unknown, want: unknown) => {
  if (got !== want) { fail++; console.log('FAIL', name, JSON.stringify(got), '!=', JSON.stringify(want)) }
}
const P = (s: string) => parseAmount(s)!

// 파싱 (붙여넣기·한글 역변환)
const parse: [string, string | null][] = [
  ['1,234,500원', '1234500'], [' 1 234 500 ', '1234500'], ['₩50,000', '50000'], ['000123', '123'],
  ['-12.50', '-12.5'], ['0', '0'], ['-0', '0'], ['3억 5천만', '350000000'], ['일억이천만원', '120000000'],
  ['금 삼백만원정', '3000000'], ['일금 오만원정', '50000'], ['만원', '10000'], ['십만', '100000'],
  ['1.5억', '150000000'], ['1억2,345만6789', '123456789'], ['이천이십육', '2026'], ['abc', null],
  ['123456789012345678901', null], ['12345678901234567890', '12345678901234567890'],
]
for (const [i, o] of parse) { const p = parseAmount(i); eq('parse ' + i, p ? canonical(p) : null, o) }

// 한글 읽기 / 공식 / 한자 / 혼용 / 영문
eq('read 0', toKoreanReading(P('0')), '영')
eq('read 1', toKoreanReading(P('1')), '일')
eq('read 10', toKoreanReading(P('10')), '십')
eq('read 10000', toKoreanReading(P('10000')), '만')
eq('read 11000', toKoreanReading(P('11000')), '만천')
eq('read 1억', toKoreanReading(P('100000000')), '일억')
eq('read 123456789', toKoreanReading(P('123456789')), '일억이천삼백사십오만육천칠백팔십구')
eq('read spacing', toKoreanReading(P('123456789'), true), '일억 이천삼백사십오만 육천칠백팔십구')
eq('read 1조', toKoreanReading(P('1000000000000')), '일조')
eq('read 경', toKoreanReading(P('10000000000000000')), '일경')
eq('read -1.05', toKoreanReading(P('-1.05')), '마이너스 일점영오')
eq('formal 1', toKoreanFormal(P('1')), '금 일원정')
eq('formal 10000', toKoreanFormal(P('10000')), '금 일만원정')
eq('formal 110000 일금', toKoreanFormal(P('110000'), '일금 '), '일금 일십일만원정')
eq('formal 0', toKoreanFormal(P('0')), '')
eq('formal decimal', toKoreanFormal(P('1.5')), '')
eq('hanja 30000', toHanja(P('30000')), '金 參萬圓整')
eq('hanja 123456789', toHanja(P('123456789')), '金 壹億貳仟參佰肆拾伍萬陸仟柒佰捌拾玖圓整')
eq('mixed 123456789', toMixed(P('123456789')), '1억 2,345만 6,789원')
eq('mixed 100010000', toMixed(P('100010000')), '1억 1만원')
eq('mixed 0', toMixed(P('0')), '0원')
eq('mixed dec', toMixed(P('-1234.5')), '-1,234.5원')
eq('en 0', toEnglish(P('0')), 'Zero')
eq('en 1234', toEnglish(P('1234')), 'One thousand two hundred thirty-four')
eq('en 1000000', toEnglish(P('1000000')), 'One million')
eq('en -1.5', toEnglish(P('-1.5')), 'Minus one point five')
eq('add', addDigits('99999999999999999999', '1'), '100000000000000000000')

console.log(fail ? `${fail} failed` : 'all passed'); if (fail) process.exit(1)
