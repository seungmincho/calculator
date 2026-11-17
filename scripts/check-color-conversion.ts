import assert from 'node:assert/strict'
import { parseOpaqueHex, rgbColorHex, hslColorHex, convertOpaqueColor, readColorQuery, colorQueryUrl } from '../src/utils/colorConversion.ts'

let groups = 0
function test(name: string, run: () => void) { run(); groups++; console.log('PASS', name) }
test('all4096 shorthand colors expand their exact channel bytes', () => {
  for (let value = 0; value < 4096; value++) {
    const short = value.toString(16).padStart(3, '0'), expected = '#' + [...short].map(value => value + value).join('').toUpperCase()
    assert.equal(parseOpaqueHex(short), expected); assert.equal(parseOpaqueHex(` #${short.toUpperCase()}\n`), expected)
    const color = convertOpaqueColor(short)!; assert.deepEqual(color.rgb, { r: parseInt(short[0], 16) * 17, g: parseInt(short[1], 16) * 17, b: parseInt(short[2], 16) * 17 })
  }
})
test('draft parsing rejects incomplete, alpha, unsupported CSS and partial strings without mutation', () => {
  for (const input of [null, undefined, 0, {}, '', '#', 'ab', '#ab', 'abcd', '#abcde', '#abcd1234', '#abcXYZ', '＃abc', 'ａｂｃ', '#ab c', '#abc trailing', 'rgb(1,2,3)', 'red', '#a'.repeat(100000)]) {
    assert.equal(parseOpaqueHex(input), null); assert.equal(convertOpaqueColor(input), null)
  }
  assert.equal(parseOpaqueHex(' 3b82f6 '), '#3B82F6'); assert.equal(parseOpaqueHex('#000000'), '#000000')
})
test('existing primary, neutral and default color formulas preserve rounded representations', () => {
  const table = [
    ['#000000', [0, 0, 0], [0, 0, 0], [0, 0, 0, 100]], ['#FFFFFF', [0, 0, 100], [0, 0, 100], [0, 0, 0, 0]],
    ['#FF0000', [0, 100, 50], [0, 100, 100], [0, 100, 100, 0]], ['#00FF00', [120, 100, 50], [120, 100, 100], [100, 0, 100, 0]],
    ['#0000FF', [240, 100, 50], [240, 100, 100], [100, 100, 0, 0]], ['#808080', [0, 0, 50], [0, 0, 50], [0, 0, 0, 50]],
    ['#3B82F6', [217, 91, 60], [217, 76, 96], [76, 47, 0, 4]],
  ] as const
  for (const [hex, hsl, hsv, cmyk] of table) {
    const color = convertOpaqueColor(hex)!; assert.deepEqual(Object.values(color.hsl), [...hsl]); assert.deepEqual(Object.values(color.hsv), [...hsv]); assert.deepEqual(Object.values(color.cmyk), [...cmyk])
    assert.ok(Object.isFrozen(color) && Object.isFrozen(color.rgb) && Object.isFrozen(color.hsl) && Object.isFrozen(color.hsv) && Object.isFrozen(color.cmyk))
  }
})
test('RGB channels clamp finite values while HSL handles endpoints and rejects unsupported ranges', () => {
  assert.equal(rgbColorHex(-1, 254.5, 300), '#00FFFF'); assert.equal(rgbColorHex(0, 0, 0), '#000000'); assert.equal(rgbColorHex(255, 255, 255), '#FFFFFF')
  for (const value of [NaN, Infinity, -Infinity]) { assert.equal(rgbColorHex(value, 0, 0), null); assert.equal(hslColorHex(0, value, 50), null) }
  for (const hue of [0, 60, 120, 180, 240, 300, 360]) assert.equal(hslColorHex(hue, 100, 50), ['#FF0000', '#FFFF00', '#00FF00', '#00FFFF', '#0000FF', '#FF00FF', '#FF0000'][hue / 60])
  assert.equal(hslColorHex(0, 0, 50), '#808080'); assert.equal(hslColorHex(217, 100, 0), '#000000'); assert.equal(hslColorHex(217, 100, 100), '#FFFFFF')
  for (const values of [[-1, 50, 50], [361, 50, 50], [0, -1, 50], [0, 101, 50], [0, 50, -1], [0, 50, 101]]) assert.equal(hslColorHex(...values as [number, number, number]), null)
})
test('query supports one color only and URL output preserves unrelated duplicates and fragment', () => {
  assert.deepEqual(readColorQuery(new URLSearchParams('x=1')), { status: 'absent' })
  assert.deepEqual(readColorQuery(new URLSearchParams('color=abc')), { status: 'valid', hex: '#AABBCC' })
  for (const query of ['color=', 'color=%23abc&color=abc', 'color=xyz', 'color=abcd']) assert.deepEqual(readColorQuery(new URLSearchParams(query)), { status: 'invalid' })
  const source = 'https://toolhub.ai.kr/color-converter/?keep=1&color=000000&keep=2#swatch', next = colorQueryUrl(source, '#aBc')!
  assert.equal(new URL(next).hash, '#swatch'); assert.deepEqual(new URL(next).searchParams.getAll('keep'), ['1', '2']); assert.deepEqual(new URL(next).searchParams.getAll('color'), ['AABBCC'])
  assert.equal(source.includes('color=000000'), true); assert.equal(colorQueryUrl(source, 'invalid'), null); assert.equal(colorQueryUrl('not a URL', '#abc'), null)
})
console.log(JSON.stringify({ groups, shorthandCases: 4096, parentConnected: false }))
