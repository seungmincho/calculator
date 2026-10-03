// node scripts/check-loan-history.ts
import assert from 'node:assert/strict'
import { restoreLoanHistory, saveLoanHistory, type LoanHistoryState } from '../src/utils/loanHistory.ts'

const current: LoanHistoryState = {
  mode: 'calc', am: 30000, pay: 150, r: 4.5, t: 30, m: 'equalPayment', gr: 0, inc: 6000, ex: 100,
}
for (const mode of ['calc', 'rev'] as const) {
  const state = { ...current, mode, r: 0, pay: 125, gr: 12, inc: 7200, ex: 0 }
  const principal = 150_000_000
  const saved = JSON.parse(JSON.stringify(saveLoanHistory(state, principal)))
  assert.deepEqual(restoreLoanHistory(saved, current), { ...state, am: principal / 1e4 }, `${mode}: save → JSON → load`)
}

// 구형 이력: 없는 소득/기존 상환액을 0으로 덮어쓰지 않으며, 이전 상환방식과 쉼표 금액을 읽는다.
assert.deepEqual(restoreLoanHistory({ loanAmount: '100,000,000', interestRate: '0', loanTerm: '10', selectedTypes: ['interest-only'] }, current),
  { ...current, am: 10000, r: 0, t: 10, m: 'bullet' })
assert.equal(restoreLoanHistory({ selectedTypes: ['balloon'] }, current).gr, 24)
assert.equal(restoreLoanHistory({ grace: '0', inc: '0', ex: 0 }, { ...current, gr: 12 }).gr, 0)
assert.equal(restoreLoanHistory({ inc: '0', ex: 0 }, current).inc, 0)
assert.equal(restoreLoanHistory({ inc: '0', ex: 0 }, current).ex, 0)

// 손상·빈 값·음수·오버플로를 무시한다. Boolean을 0/1로 변환하지 않는다.
for (const value of [null, undefined, '', ' ', ',', ' , ', 'bad', false, {}, [], -1, '-1', NaN, Infinity, '1e309']) {
  const result = restoreLoanHistory({ loanAmount: value, interestRate: value, loanTerm: value, grace: value, pay: value, inc: value, ex: value }, current)
  assert.deepEqual(result, current, `invalid ${String(value)}`)
}
assert.deepEqual(restoreLoanHistory({ loanAmount: 0, loanTerm: 0, grace: 1.5, method: 'unknown' }, current), current)
assert.deepEqual(restoreLoanHistory({ interestRate: 100, loanTerm: 51, grace: 360, inc: Number.MAX_VALUE, ex: Number.MAX_VALUE, pay: Number.MAX_VALUE }, current), current)
console.log('check-loan-history OK: normal/reverse, zero, legacy, malformed inputs')
