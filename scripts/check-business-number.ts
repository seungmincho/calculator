// 사업자등록번호 로직 회귀 체크: node scripts/check-business-number.ts
import assert from 'node:assert/strict'
import { validate, formatBizNo, checkSteps, categoryOf, entityOf, partsOf, parseBulk, toCsv, statusKind, ymdDots } from '../src/utils/businessNumber.ts'

// 실존 공개 번호(삼성전자 124-81-00998) — 손계산: 1+6+28+8+3+0+0+27+45=118, +⌊9·5/10⌋=4 → 122 → 10-2=8
assert.equal(checkSteps('124810099').sum, 122)
assert.equal(validate('124-81-00998').valid, true)
assert.equal(validate('1248100997').reason, 'checksum')
assert.equal(validate('1248100997').expected, 8)
// 검증번호가 0이 되는 경우 (합의 일의 자리 0 → (10-0)%10 = 0)
{
  // 모든 9자리 중 expected=0 인 것 하나 찾아 확인
  const nine = '100000009' // 1 + 45 + 4 = 50 → 0
  assert.equal(checkSteps(nine).expected, 0)
  assert.equal(validate(nine + '0').valid, true)
}
assert.equal(validate('1234567891').valid, true) // 165 + 4 = 169 → 1

// 붙여넣기/형식
assert.equal(validate(' 124 81 00998 ').valid, true)
assert.equal(validate('124.81.00998').formatted, '124-81-00998')
assert.equal(formatBizNo('12'), '12')
assert.equal(formatBizNo('1248'), '124-8')
assert.equal(formatBizNo('12481009'), '124-81-009')
assert.equal(formatBizNo('124810099812'), '124-81-00998')
assert.equal(validate('').reason, 'empty')
assert.equal(validate('124-81').reason, 'short')
assert.equal(validate('12481009981').reason, 'long')

// 구분코드
assert.equal(categoryOf('01'), 'individualTaxable')
assert.equal(categoryOf('79'), 'individualTaxable')
assert.equal(categoryOf('80'), 'individualOther')
assert.equal(categoryOf('81'), 'corpHQ')
assert.equal(categoryOf('82'), 'nonprofit')
assert.equal(categoryOf('83'), 'government')
assert.equal(categoryOf('84'), 'foreignCorp')
assert.equal(categoryOf('85'), 'corpBranch')
assert.equal(categoryOf('88'), 'corpHQ')
assert.equal(categoryOf('89'), 'religious')
assert.equal(categoryOf('90'), 'individualExempt')
assert.equal(categoryOf('99'), 'individualExempt')
assert.equal(categoryOf('00'), 'unknown')
assert.equal(entityOf('corpBranch'), 'corporation')
assert.equal(entityOf('individualExempt'), 'individual')
assert.equal(entityOf('government'), 'other')
assert.deepEqual(partsOf('1248100998'), { office: '124', mid: '81', serial: '0099', check: '8', category: 'corpHQ' })

// 일괄: 헤더·빈 줄 무시, 쉼표/탭/줄바꿈, 번호 내부 공백 허용, 중복 표시
const rows = parseBulk('사업자번호\n124-81-00998\r\n\n1234567891, 124 81 00997\t12345\n1248100998')
assert.deepEqual(rows.map(r => [r.digits, r.valid, r.reason, r.dup]), [
  ['1248100998', true, 'ok', false],
  ['1234567891', true, 'ok', false],
  ['1248100997', false, 'checksum', false],
  ['12345', false, 'short', false],
  ['1248100998', true, 'ok', true],
])

// CSV
assert.equal(toCsv([['a', 'b,c'], ['"q"', 'x']]), '﻿a,"b,c"\r\n"""q""",x')

// 상태
assert.equal(statusKind({ b_stt_cd: '01' }), 'active')
assert.equal(statusKind({ b_stt_cd: '02' }), 'suspended')
assert.equal(statusKind({ b_stt_cd: '03' }), 'closed')
assert.equal(statusKind({ b_stt_cd: '' }), 'unregistered')
assert.equal(ymdDots('20240131'), '2024.01.31')
assert.equal(ymdDots(''), '')

console.log('check-business-number: OK')
