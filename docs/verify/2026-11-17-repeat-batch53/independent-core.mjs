import assert from 'node:assert/strict'
import fs from 'node:fs'
import { createHash } from 'node:crypto'
import { componentHarness } from '../2026-11-17-repeat-batch29/team-parent-harness.mjs'
import { parseOpaqueHex, convertOpaqueColor, rgbColorHex, hslColorHex, readColorQuery, colorQueryUrl } from '../../../src/utils/colorConversion.ts'

let groups = 0, parityColors = 0, sliderCases = 0, roundtrips = 0
async function check(name, run) { await run(); groups++; console.log(`PASS ${name}`) }
const expectedStrings = color => [color.hex, `rgb(${color.rgb.r}, ${color.rgb.g}, ${color.rgb.b})`, `hsl(${color.hsl.h}, ${color.hsl.s}%, ${color.hsl.l}%)`, `hsv(${color.hsv.h}, ${color.hsv.s}%, ${color.hsv.v}%)`, `cmyk(${color.cmyk.c}%, ${color.cmyk.m}%, ${color.cmyk.y}%, ${color.cmyk.k}%)`]
const hexOf = channels => '#' + channels.map(channel => channel.toString(16).padStart(2, '0')).join('').toUpperCase()
const messages = JSON.parse(fs.readFileSync('messages/ko.json', 'utf8'))
const copies = [], deterministicMath = Object.create(Math)
deterministicMath.random = () => 1 - Number.EPSILON
const host = await componentHarness('src/components/ColorConverter.tsx', { messages, globals: { Math: deterministicMath }, navigator: { clipboard: { async writeText(value) { copies.push(value) } } } })
host.render()
const input = () => host.find(node => node.type === 'input' && node.props.type === 'text')
const change = value => { input().props.onChange({ target: { value } }); host.render() }
const ranges = () => host.all().filter(node => node.type === 'input' && node.props.type === 'range')
const originalSha = createHash('sha256').update(fs.readFileSync('src/components/ColorConverter.tsx')).digest('hex')
const baseline = JSON.parse(fs.readFileSync('docs/verify/2026-11-17-repeat-batch53/before-fix.json', 'utf8'))
assert.equal(originalSha, baseline.sourceSha256, 'Parity must execute the still-unmodified original parent')

try {
  await check('strict parser returns canonical opaque bytes without consuming alpha, CSS expressions or malformed tails', () => {
    for (const [input, expected] of [['#a0F', '#AA00FF'], ['AbCdEf', '#ABCDEF'], ['\t #09c \r\n', '#0099CC'], ['\u00a0fff\uFEFF', '#FFFFFF']]) assert.equal(parseOpaqueHex(input), expected)
    for (const value of ['#0000', '#12345678', '#123456\0', '#12345g', '#123456;', '#123456!important', '#12\n3456', '# 123', '#12\u200b3', '＃123', '１２３', 'rgba(0,0,0,1)', ['abc'], Object('abc')]) assert.equal(parseOpaqueHex(value), null)
    const original = '  #abg  '; assert.equal(convertOpaqueColor(original), null); assert.equal(original, '  #abg  ')
    const color = convertOpaqueColor('#a0F')
    assert.deepEqual(color.rgb, { r: 170, g: 0, b: 255 }); assert.equal(color.hex, '#AA00FF')
    for (const part of [color, color.rgb, color.hsl, color.hsv, color.cmyk]) assert.equal(Object.isFrozen(part), true)
    assert.throws(() => { color.rgb.r = 1 }, TypeError); assert.equal(convertOpaqueColor('#a0f').rgb.r, 170)
  })

  await check('new module matches all five original-parent copy representations for edges and deterministic colors', async () => {
    const channels = [0, 1, 63, 127, 128, 254, 255], cases = []
    for (const r of channels) for (const g of channels) for (const b of channels) cases.push(hexOf([r, g, b]))
    let seed = 0x530017
    for (let i = 0; i < 100; i++) { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; cases.push('#' + (seed & 0xffffff).toString(16).padStart(6, '0').toUpperCase()) }
    for (const hex of cases) {
      change(hex)
      const buttons = host.all().filter(node => node.type === 'button' && ['icon:Copy', 'icon:Check'].includes(node.props.children?.type))
      assert.equal(buttons.length, 5)
      const start = copies.length
      buttons.forEach(button => button.props.onClick())
      assert.deepEqual(copies.slice(start), expectedStrings(convertOpaqueColor(hex)))
      await Promise.resolve(); parityColors++
    }
  })

  await check('actual original RGB and HSL slider commits retain exact finite input rounding', () => {
    for (const source of ['#3B82F6', '#808080', '#FE0100', '#00FF80', '#321ABC']) {
      const color = convertOpaqueColor(source)
      for (let channel = 0; channel < 3; channel++) for (const value of [0, 1, 127, 254, 255]) {
        change(source); const rgb = Object.values(color.rgb); rgb[channel] = value
        ranges()[channel].props.onChange({ target: { value: String(value) } }); host.render()
        assert.equal(input().props.value, rgbColorHex(...rgb)); sliderCases++
      }
      for (let channel = 0; channel < 3; channel++) for (const value of (channel === 0 ? [0, 1, 59, 180, 359, 360] : [0, 1, 49, 50, 99, 100])) {
        change(source); const hsl = Object.values(color.hsl); hsl[channel] = value
        ranges()[channel + 3].props.onChange({ target: { value: String(value) } }); host.render()
        assert.equal(input().props.value, hslColorHex(...hsl)); sliderCases++
      }
    }
  })

  await check('independent neutral and hue anchors, finite ranges and integer-HSL roundtrip error stay bounded', () => {
    for (const gray of [0, 1, 64, 127, 128, 191, 254, 255]) {
      const color = convertOpaqueColor(hexOf([gray, gray, gray]))
      assert.deepEqual(color.hsl, { h: 0, s: 0, l: Math.round(gray * 100 / 255) })
      assert.deepEqual(color.hsv, { h: 0, s: 0, v: Math.round(gray * 100 / 255) })
      assert.equal(color.cmyk.c + color.cmyk.m + color.cmyk.y, 0)
    }
    for (const [h, hex] of [[0, '#FF0000'], [120, '#00FF00'], [240, '#0000FF'], [360, '#FF0000']]) assert.equal(hslColorHex(h, 100, 50), hex)
    for (const [args, expected] of [[[.49, .5, 254.5], '#0001FF'], [[-20, 300, 127.5], '#00FF80']]) assert.equal(rgbColorHex(...args), expected)
    for (let index = 0; index < 3; index++) for (const invalid of [NaN, Infinity, -Infinity]) {
      const rgb = [1, 2, 3], hsl = [180, 50, 50]; rgb[index] = invalid; hsl[index] = invalid
      assert.equal(rgbColorHex(...rgb), null); assert.equal(hslColorHex(...hsl), null)
    }
    for (const args of [[-.01, 50, 50], [360.01, 50, 50], [60, -.01, 50], [60, 100.01, 50], [60, 50, -.01], [60, 50, 100.01]]) assert.equal(hslColorHex(...args), null)
    // The integer UI rounds hue/saturation/lightness, so inversion is approximate.
    // Half-degree hue plus half-percent saturation/lightness bounds channel error by <5 bytes.
    for (const r of [0, 17, 51, 102, 153, 204, 255]) for (const g of [0, 17, 51, 102, 153, 204, 255]) for (const b of [0, 17, 51, 102, 153, 204, 255]) {
      const color = convertOpaqueColor(hexOf([r, g, b])), roundtrip = convertOpaqueColor(hslColorHex(...Object.values(color.hsl)))
      for (const [index, value] of Object.values(roundtrip.rgb).entries()) assert.ok(Math.abs(value - [r, g, b][index]) <= 5)
      roundtrips++
    }
  })

  await check('owned color query rejects duplicate ambiguity and preserves unrelated ordered values, fragment and source objects', () => {
    for (const query of ['color', 'color=%23abc&color=%23ABC', 'color=&color=abc', 'color=12345678', 'color=12%00abc']) assert.deepEqual(readColorQuery(new URLSearchParams(query)), { status: 'invalid' })
    assert.deepEqual(readColorQuery(new URLSearchParams('COLOR=abc&foreign=1')), { status: 'absent' })
    const params = new URLSearchParams('foreign=%2B&color=%20%23aBc%20&foreign=%20'), before = params.toString()
    assert.deepEqual(readColorQuery(params), { status: 'valid', hex: '#AABBCC' }); assert.equal(params.toString(), before)
    const source = 'https://toolhub.ai.kr/color-converter/?x=first&color=000&x=%2B&color=fff&x=%20&flag#fragment'
    const built = colorQueryUrl(source, '#123'), url = new URL(built)
    assert.deepEqual(url.searchParams.getAll('x'), ['first', '+', ' ']); assert.equal(url.hash, '#fragment'); assert.equal(url.pathname, '/color-converter/')
    assert.deepEqual(url.searchParams.getAll('color'), ['112233']); assert.equal(url.searchParams.get('flag'), '')
    assert.equal(colorQueryUrl(source, '#1234'), null); assert.ok(source.includes('color=000'))
    assert.equal(colorQueryUrl('invalid URL', '#123'), null)
    assert.deepEqual(readColorQuery(url.searchParams), { status: 'valid', hex: '#112233' })
  })

  await check('original random upper-bound observation is separate from the unconnected pure module', () => {
    host.find(node => node.type === 'button' && node.props.title === messages.colorConverter.actions.random).props.onClick(); host.render()
    assert.equal(input().props.value, '#FFFFFE')
    assert.equal(rgbColorHex(255, 255, 255), '#FFFFFF')
  })
} finally { host.cleanup() }

console.log(JSON.stringify({ groups, parityColors, representations: parityColors * 5, sliderCases, roundtrips, parentConnected: false, nativeBrowser: false }))
