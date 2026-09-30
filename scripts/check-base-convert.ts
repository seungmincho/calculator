// 진법 변환 회귀 체크: node scripts/check-base-convert.ts
import assert from 'node:assert/strict'
import {
  parse, show, format, toNumber, twos, ones, signMag, decode, bitString, ieee, parseFloatInput,
  divisionSteps, fractionSteps, placeTerms, groupSteps, groupDigits, textToBytes, bytesToText, showBytes, parseBytes,
  type Rational,
} from '../src/utils/baseConvert.ts'

const P = (s: string, b: number) => { const r = parse(s, b); assert.ok(r, `parse ${s} @${b}`); return r! }
const eq = (a: Rational, b: Rational) => assert.equal(a.num * b.den, b.num * a.den, `${a.num}/${a.den} ≠ ${b.num}/${b.den}`)

// 기본 변환 · 접두사 · 구분자
assert.equal(show(P('255', 10), 2), '11111111')
assert.equal(show(P('0xff', 16), 10), '255')
assert.equal(show(P('0b1010_1101', 2), 16, { prefix: true }), '0xAD')
assert.equal(show(P('-42', 10), 8, { prefix: true }), '-0o52')
assert.equal(show(P('Z', 36), 10), '35')
assert.equal(show(P('1,000,000', 10), 16), 'F4240')
assert.equal(parse('0b1', 16) && show(parse('0b1', 16)!, 10), '177') // 16진에서 0b는 접두사 아님(0x0B1)
assert.equal(parse('2', 2), null)
assert.equal(parse('', 10), null)
assert.equal(parse('-', 10), null)
assert.equal(parse('1.2.3', 10), null)
assert.equal(parse('G', 16), null)

// BigInt 왕복 (임의 크기)
const big = 2n ** 200n - 12345n
for (const b of [2, 3, 8, 10, 16, 36]) eq(P(show({ num: big, den: 1n }, b), b), { num: big, den: 1n })
eq(P(show({ num: -big, den: 1n }, 7), 7), { num: -big, den: 1n })
assert.equal(show(P('18446744073709551615', 10), 16), 'FFFFFFFFFFFFFFFF')

// 묶음 표시
assert.equal(show(P('173', 10), 2, { group: 4 }), '1010 1101')
assert.equal(show(P('5', 10), 2, { group: 4 }), '0101')
assert.equal(show(P('1000000', 10), 10, { group: 3, sep: ',' }), '1,000,000')
assert.equal(groupDigits('ABC', 2, ' ', true), '0A BC')

// 소수: 유한 · 순환 · 잘림
assert.equal(show(P('0.625', 10), 2), '0.101')
assert.equal(show(P('13.625', 10), 2), '1101.101')
assert.equal(show(P('0.1', 10), 2), '0.0(0011)')
assert.equal(show(P('0.1', 10), 16), '0.1(9)')
assert.equal(show(P('0.1', 3), 10), '0.(3)')
assert.equal(show(P('-0.5', 10), 2), '-0.1')
eq(P('0.0(0011)', 2), { num: 1n, den: 10n })         // 순환 표기 입력 → 정확히 1/10
eq(P(show(P('0.1', 10), 2), 2), P('0.1', 10))        // 순환 왕복
assert.equal(show(P('0.1', 10), 2, { maxFrac: 3 }), '0.000…')
const pi = format(P('3.14159', 10), 2, 20)
assert.ok(pi.truncated && pi.frac.length === 20)
assert.equal(show(P('0.1', 10), 2, { maxFrac: 5 }), '0.0(0011)') // 순환마디가 maxFrac 안에서 닫힘
assert.equal(show(P('0.(3)', 10), 3), '0.1')
assert.ok(Math.abs(toNumber(P('0.(3)', 10)) - 1 / 3) < 1e-15)
assert.equal(toNumber(P('-2.5', 10)), -2.5)

// 2의 보수 경계
assert.equal(bitString(twos(-128n, 8).bits, 8), '10000000')
assert.equal(twos(-128n, 8).overflow, false)
assert.equal(twos(-129n, 8).overflow, true)
assert.equal(bitString(twos(-129n, 8).bits, 8), '01111111') // wrap
assert.equal(twos(255n, 8).overflow, false)
assert.equal(twos(255n, 8).unsignedOnly, true)
assert.equal(twos(256n, 8).overflow, true)
assert.equal(bitString(twos(-1n, 8).bits, 8), '11111111')
assert.equal(twos(-(2n ** 63n), 64).overflow, false)
assert.equal(twos(2n ** 64n, 64).overflow, true)
// 1의 보수 · 부호-크기
assert.equal(bitString(ones(-5n, 8)!, 8), '11111010')
assert.equal(ones(-128n, 8), null)
assert.equal(bitString(ones(-127n, 8)!, 8), '10000000')
assert.equal(bitString(signMag(-5n, 8)!, 8), '10000101')
assert.equal(bitString(signMag(-127n, 8)!, 8), '11111111')
assert.equal(signMag(-128n, 8), null)
// 같은 패턴 4가지 해석
assert.deepEqual(decode(0xFFn, 8), { unsigned: 255n, twos: -1n, ones: '-0', signMag: '-127' })
assert.deepEqual(decode(0x80n, 8), { unsigned: 128n, twos: -128n, ones: '-127', signMag: '-0' })
assert.deepEqual(decode(0xADn, 8), { unsigned: 173n, twos: -83n, ones: '-82', signMag: '-45' })
assert.deepEqual(decode(0x7Fn, 8), { unsigned: 127n, twos: 127n, ones: '127', signMag: '127' })

// IEEE 754
const f1 = ieee(0.1, 32)
assert.equal(f1.hex, '3DCCCCCD')
assert.equal(f1.expRaw, 123); assert.equal(f1.exp, -4); assert.equal(f1.kind, 'normal')
assert.equal(f1.mantBits, '10011001100110011001101')
assert.equal(show(f1.stored!, 10, { maxFrac: 60 }), '0.100000001490116119384765625')
const d1 = ieee(0.1, 64)
assert.equal(d1.hex, '3FB999999999999A')
assert.equal(show(d1.stored!, 10, { maxFrac: 80 }), '0.1000000000000000055511151231257827021181583404541015625')
assert.equal(ieee(-0, 32).hex, '80000000'); assert.equal(ieee(-0, 32).kind, 'zero'); assert.equal(ieee(-0, 32).sign, 1)
assert.equal(ieee(Infinity, 64).hex, '7FF0000000000000'); assert.equal(ieee(Infinity, 64).kind, 'inf')
assert.equal(ieee(-Infinity, 32).hex, 'FF800000')
assert.equal(ieee(NaN, 32).kind, 'nan'); assert.equal(ieee(NaN, 64).stored, null)
assert.equal(ieee(1e40, 32).kind, 'inf') // float32 오버플로
assert.equal(ieee(1, 64).hex, '3FF0000000000000')
assert.equal(ieee(-2.5, 32).hex, 'C0200000')
const sub = ieee(5e-324, 64)
assert.equal(sub.kind, 'subnormal'); eq(sub.stored!, { num: 1n, den: 2n ** 1074n })
assert.equal(parseFloatInput('-0'), -0); assert.ok(Object.is(parseFloatInput('-0'), -0))
assert.equal(parseFloatInput('inf'), Infinity); assert.equal(parseFloatInput('-Infinity'), -Infinity)
assert.ok(Number.isNaN(parseFloatInput('NaN')))
assert.equal(parseFloatInput('1e3'), 1000); assert.equal(parseFloatInput('abc'), null); assert.equal(parseFloatInput(''), null)

// 풀이 과정
const ds = divisionSteps(13n, 2)
assert.deepEqual(ds.steps.map((s) => s.r), [1, 0, 1, 1]) // 아래→위: 1101
assert.equal(ds.steps.map((s) => s.r).reverse().join(''), show(P('13', 10), 2))
assert.equal(divisionSteps(0n, 2).steps.length, 0)
assert.equal(divisionSteps(2n ** 100n, 2, 10).truncated, true)
const fs = fractionSteps(P('0.625', 10), 2)
assert.deepEqual(fs.steps.map((s) => s.digit), [1, 0, 1]); assert.equal(fs.repeatAt, -1)
const fr = fractionSteps(P('0.1', 10), 2)
assert.deepEqual(fr.steps.map((s) => s.digit), [0, 0, 0, 1, 1]); assert.equal(fr.repeatAt, 1)
assert.equal(show(fr.steps[1].product, 10), '0.4')
const terms = placeTerms(format(P('1101.1', 2), 2), 2)
assert.deepEqual(terms.map((t) => [t.digit, t.power]), [[1, 3], [1, 2], [0, 1], [1, 0], [1, -1]])
assert.deepEqual(groupSteps('10101101', 4).map((g) => g.digit).join(''), 'AD')
assert.deepEqual(groupSteps('11101101', 3).map((g) => g.bits), ['011', '101', '101'])

// 텍스트 ↔ UTF-8
assert.equal(showBytes(textToBytes('A가'), 16), '41 EA B0 80')
assert.equal(showBytes(textToBytes('Hi'), 2), '01001000 01101001')
assert.equal(bytesToText(parseBytes('41 EA B0 80', 16)!), 'A가')
assert.equal(bytesToText(parseBytes('0x48,0x69', 16)!), 'Hi')
assert.equal(bytesToText(parseBytes('4869', 16)!), 'Hi')
assert.equal(bytesToText(parseBytes('0100100001101001', 2)!), 'Hi')
assert.equal(parseBytes('GG', 16), null)
assert.equal(bytesToText(new Uint8Array([0xEA, 0xB0])), null) // 잘린 UTF-8

console.log('check-base-convert: all OK')
