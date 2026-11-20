// node scripts/check-scientific-calculator.ts (Node 24) — 공학용 계산기 파서·계산·표시 회귀 체크
import assert from 'node:assert/strict'
import { evaluate, formatNumber, backspace, inlineAns, parseHistory, type Angle, type CalcError } from '../src/utils/scientificCalculator.ts'

const val = (s: string, angle: Angle = 'deg', ans = 0) => {
  const r = evaluate(s, angle, ans)
  assert.ok(r.ok, `${s} → 오류 ${!r.ok && r.error}`)
  return r.value
}
const eq = (s: string, want: number, angle: Angle = 'deg') => assert.equal(val(s, angle), want, s)
const near = (s: string, want: number, angle: Angle = 'deg') => {
  const v = val(s, angle)
  assert.ok(Math.abs(v - want) < 1e-9 * Math.max(1, Math.abs(want)), `${s}: ${v} ≠ ${want}`)
}
const err = (s: string, code: CalcError, angle: Angle = 'deg') => {
  const r = evaluate(s, angle)
  assert.deepEqual(r, { ok: false, error: code }, s)
}
const shown = (s: string, want: string, angle: Angle = 'deg') => assert.equal(formatNumber(val(s, angle)), want, s)

// ── 우선순위·결합
eq('2+3*4', 14)
eq('(2+3)*4', 20)
eq('10-4-3', 3)
eq('100/10/5', 2)
eq('2^3^2', 512) // 오른쪽 결합
eq('2^-2', 0.25)
eq('-2^2', -4) // 단항 − 는 ^ 보다 약하다
eq('(-2)^2', 4)
eq('-3!', -6)
eq('3!^2', 36)
eq('2*-3', -6)
eq('--5', 5)

// ── 생략된 곱셈
near('2π', 2 * Math.PI)
eq('3(4+5)', 27)
eq('(1+2)(3+4)', 21)
eq('2sin(30)', 1)
near('1/2π', 1 / (2 * Math.PI)) // 생략된 곱이 ÷ 보다 먼저
near('2e', 2 * Math.E)
near('2π^2', 2 * Math.PI ** 2)
err('π2', 'syntax')
err('(2)3', 'syntax')
err('2 3', 'syntax')

// ── 후위 ! %, nPr·nCr
eq('5!', 120)
eq('0!', 1)
eq('170!', [...Array(170)].reduce((a, _, k) => a * (k + 1), 1))
err('171!', 'domain')
err('2.5!', 'domain')
err('(-1)!', 'domain')
eq('50%', 0.5)
eq('200*10%', 20)
eq('5P2', 20)
eq('5C2', 10)
eq('52C5', 2598960)
err('2C5', 'domain')

// ── 지수 표기·EXP
eq('1.2e-3', 0.0012)
eq('1.2E3', 1200)
eq('2E+2', 200)
eq('.5+5.', 5.5)
err('2E', 'syntax')
err('1.2.3', 'syntax')

// ── 도(DEG) 정확값
eq('sin(180)', 0)
eq('sin(30)', 0.5)
eq('cos(90)', 0)
eq('cos(60)', 0.5)
eq('tan(45)', 1)
eq('tan(-45)', -1)
eq('tan(180)', 0)
eq('sin(-90)', -1)
eq('sin(30)*2-1', 0)
eq('asin(0.5)', 30)
eq('acos(0)', 90)
eq('atan(1)', 45)
err('tan(90)', 'undefined')
err('tan(270)', 'undefined')
err('asin(2)', 'domain')

// ── 라디안(RAD)
eq('sin(π)', 0, 'rad')
eq('cos(π/2)', 0, 'rad')
err('tan(π/2)', 'undefined', 'rad')
near('sin(1)', Math.sin(1), 'rad')
near('asin(1)', Math.PI / 2, 'rad')
eq('sin(1e-20)', 1e-20, 'rad') // 진짜 작은 값은 0 으로 지우지 않는다

// ── 함수
eq('log(1000)', 3)
eq('ln(e)', 1)
eq('log₂(8)', 3)
eq('log2(8)', 3)
eq('√(16)', 4)
eq('√16', 4)
eq('sqrt(16)', 4)
eq('∛(27)', 3)
eq('cbrt(-8)', -2)
eq('abs(-3)', 3)
near('exp(1)', Math.E)
eq('10^(3)', 1000)
eq('4^(−1)', 0.25)
near('sinh(1)', Math.sinh(1))
eq('Ans+1', 1) // Ans 기본 0
assert.equal(val('Ans*2', 'deg', 21), 42)
assert.equal(val('ans*2', 'deg', 21), 42)
err('log(0)', 'domain')
err('ln(-1)', 'domain')
err('√(-4)', 'domain')
err('(-8)^(1/3)', 'domain')

// ── 오류
err('1/0', 'divZero')
err('5÷(2-2)', 'divZero')
err('0^-1', 'divZero')
err('1e999', 'overflow')
err('10^400', 'overflow')
err('3+', 'syntax')
err('*3', 'syntax')
err('()', 'syntax')
err('', 'syntax')
err('2+3)', 'paren')
err('sinx', 'syntax')
err('#', 'syntax')
err('('.repeat(5000), 'syntax') // 깊은 재귀도 죽지 않는다

// ── 괄호 자동 닫기
eq('(2+3', 5)
eq('2*(3+(4', 14)
eq('sin(30', 0.5)

// ── 유니코드 연산자
eq('6×7', 42)
eq('8÷2', 4)
eq('5−8', -3)
eq('−2^2', -4)
eq('2·3', 6)

// ── 표시: 유효숫자 12자리
shown('0.1+0.2', '0.3')
shown('1/3', '0.333333333333')
shown('2/3', '0.666666666667')
shown('123456789*1000', '123456789000')
shown('10^20', '1E+20')
shown('1.5*10^-7', '1.5E-7')
shown('-0', '0')
shown('0.000001', '0.000001')
assert.equal(formatNumber(1234567.891, true), '1,234,567.891')
assert.equal(formatNumber(-1234, true), '-1,234')
assert.equal(formatNumber(999, true), '999')
assert.equal(formatNumber(0.5, true), '0.5')
// 표시한 값을 다시 넣어도 같은 값
for (const x of [1e20, -1.5e-7, 1234567.891, 1 / 3]) assert.ok(evaluate(formatNumber(x)).ok, `${x} 재입력`)

// ── 지우기·Ans 치환·기록 파싱
assert.equal(backspace('2+sin('), '2+')
assert.equal(backspace('log₂('), '')
assert.equal(backspace('3×Ans'), '3×')
assert.equal(backspace('12'), '1')
assert.equal(backspace(''), '')
assert.equal(inlineAns('Ans×2', 0.5), '(0.5)×2')
assert.equal(val(inlineAns('Ans×2', -3)), -6)
assert.deepEqual(parseHistory('[{"expr":"1+1","result":"2"},{"expr":3},"x"]'), [{ expr: '1+1', result: '2' }])
assert.deepEqual(parseHistory('not json'), [])
assert.deepEqual(parseHistory(null), [])
assert.equal(parseHistory(JSON.stringify(Array.from({ length: 30 }, () => ({ expr: '1', result: '1' })))).length, 20)

console.log('scientific-calculator: ok')
