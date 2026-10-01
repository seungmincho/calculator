// 로마 숫자 회귀 체크: node scripts/check-roman.ts
import {
  toRoman, parseRoman, parseNumber, romanParts, unicodeRoman, dateToRoman, looksNumeric, overline, MAX_EXT,
} from '../src/utils/romanNumeral.ts'

let fail = 0
const eq = (a: unknown, b: unknown, msg: string) => {
  if (JSON.stringify(a) !== JSON.stringify(b)) { fail++; console.log('FAIL', msg, JSON.stringify(a), '!=', JSON.stringify(b)) }
}

// 왕복: 1..9,999 전부 + 그 위는 13 간격 (표준형 → 해석 → 같은 값, 표준 판정)
for (let n = 1; n <= MAX_EXT; n += n < 10000 ? 1 : 13) {
  const r = toRoman(n)
  const p = parseRoman(r)
  if (!p.ok || p.value !== n || p.canonical !== r) { eq([p.ok, p.value], [true, n], `round-trip ${n} ${r}`); if (fail > 20) break }
}
// 소문자·자릿수 분해 합계 (표준 범위)
for (let n = 1; n <= 3999; n++) {
  const p = parseRoman(toRoman(n).toLowerCase())
  if (!p.ok || p.value !== n) eq(p.value, n, `lowercase ${n}`)
  const parts = romanParts(n)
  if (parts.reduce((s, x) => s + x.value, 0) !== n || parts.map((x) => x.roman).join('') !== toRoman(n)) eq(parts, n, `parts ${n}`)
}

eq(toRoman(2026), 'MMXXVI', '2026')
eq(toRoman(1999), 'MCMXCIX', '1999')
eq(toRoman(3999), 'MMMCMXCIX', '3999')
eq(toRoman(4000), overline('IV'), '4000 = I̅V̅')
eq(toRoman(10000), overline('X'), '10000')
eq(toRoman(MAX_EXT), overline('MMMCMXCIX') + 'CMXCIX', 'max')
eq(parseRoman(toRoman(MAX_EXT)).value, MAX_EXT, 'max round-trip')
eq([toRoman(0), toRoman(-1), toRoman(1.5), toRoman(MAX_EXT + 1)], ['', '', '', ''], 'out of range')
eq(romanParts(2026), [{ value: 2000, roman: 'MM' }, { value: 20, roman: 'XX' }, { value: 6, roman: 'VI' }], 'parts 2026')
eq(romanParts(12345).map((p) => p.value), [10000, 2000, 300, 40, 5], 'parts 12345')
eq(romanParts(12345).map((p) => p.roman).join(''), toRoman(12345), 'parts 12345 roman')

// 유니코드 Ⅻ 등
eq(parseRoman('Ⅻ').value, 12, 'Ⅻ')
eq(parseRoman('ⅻ').ok, true, 'ⅻ')
eq(parseRoman('ⅯⅯⅩⅩⅥ').value, 2026, 'unicode letters')
eq(parseRoman(' mm xx vi ').value, 2026, 'spaces/lowercase')
eq([unicodeRoman(1), unicodeRoman(12), unicodeRoman(12, true), unicodeRoman(13), unicodeRoman(1000)], ['Ⅰ', 'Ⅻ', 'ⅻ', '', 'Ⅿ'], 'unicodeRoman')
for (let n = 1; n <= 12; n++) eq(parseRoman(unicodeRoman(n)).value, n, `unicode ${n}`)

// 비표준 → 이유 + 표준형
const bad = (s: string) => { const p = parseRoman(s); return [p.ok, p.reason, p.detail, p.value, p.canonical] }
eq(bad('IIII'), [false, 'repeat', 'IIII', 4, 'IV'], 'IIII')
eq(bad('MMMM'), [false, 'repeat', 'MMMM', 4000, overline('IV')], 'MMMM')
eq(bad('VV'), [false, 'repeatFive', 'V', 10, 'X'], 'VV')
eq(bad('VIV'), [false, 'repeatFive', 'V', 9, 'IX'], 'VIV')
eq(bad('IC'), [false, 'badSubtract', 'IC', 99, 'XCIX'], 'IC')
eq(bad('VX'), [false, 'badSubtract', 'VX', 5, 'V'], 'VX')
eq(bad('IL'), [false, 'badSubtract', 'IL', 49, 'XLIX'], 'IL')
eq(bad('XM'), [false, 'badSubtract', 'XM', 990, 'CMXC'], 'XM')
eq(bad('XCX'), [false, 'order', '', 100, 'C'], 'XCX')
eq(bad('IXI')[1], 'order', 'IXI')
eq(bad('ABC'), [false, 'badChar', 'AB', 0, ''], 'badChar')
eq(bad(''), [false, 'empty', '', 0, ''], 'empty')
eq(bad('X' + overline('V'))[1], 'overline', 'overline not leading')
eq(bad(overline('I')), [false, 'overline', '', 1000, 'M'], 'I̅ < 4000')

// 숫자 입력
eq(parseNumber('2,026'), { ok: true, value: 2026 }, 'comma')
eq(parseNumber('0'), { ok: false, reason: 'zero' }, 'zero')
eq(parseNumber('4000000'), { ok: false, reason: 'tooBig' }, 'tooBig')
eq(parseNumber('3.5'), { ok: false, reason: 'notInteger' }, 'decimal')
eq(parseNumber('-3'), { ok: false, reason: 'notInteger' }, 'negative')
eq([looksNumeric('2026'), looksNumeric('1,000'), looksNumeric('XII'), looksNumeric('Ⅻ')], [true, true, false, false], 'looksNumeric')

// 날짜
eq(dateToRoman('2026-10-01', 'ymd', '.')?.roman, 'MMXXVI.X.I', 'date ymd')
eq(dateToRoman('2026-10-01', 'mdy', ' · ')?.roman, 'X · I · MMXXVI', 'date mdy')
eq(dateToRoman('1999-12-31', 'dmy', '-')?.roman, 'XXXI-XII-MCMXCIX', 'date dmy')
eq(dateToRoman('2026-02-30', 'ymd', '.'), null, 'invalid date')
eq(dateToRoman('', 'ymd', '.'), null, 'empty date')

if (fail) { console.log(`${fail} failed`); process.exit(1) }
console.log('check-roman: all passed')
