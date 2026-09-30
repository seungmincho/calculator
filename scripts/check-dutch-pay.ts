// 더치페이 정산 회귀 체크: node scripts/check-dutch-pay.ts
import assert from 'node:assert/strict'
import { splitExpense, settle, minTransfers, simpleSplit, encodeState, decodeState, type Person, type State } from '../src/utils/dutchPay.ts'

const P = (...ws: number[]): Person[] => ws.map((w, i) => ({ name: `p${i}`, weight: w }))
const sum = (a: number[]) => a.reduce((s, x) => s + x, 0)
const all = (n: number) => Array.from({ length: n }, (_, i) => i)

// 균등 분할: 합계 정확, 차이 최대 1원
assert.deepEqual(splitExpense(10000, [1, 1, 1], [0, 1, 2]), [3334, 3333, 3333])
assert.deepEqual(splitExpense(100, [1, 1, 1, 1, 1, 1, 1], all(7)), [15, 15, 14, 14, 14, 14, 14])

// 가중치: 선배 1.5배
assert.deepEqual(splitExpense(35000, [1.5, 1, 1], [0, 1, 2]), [15000, 10000, 10000])
// 제외: 술 안 마신 사람(2) 빠짐
assert.deepEqual(splitExpense(30000, [1, 1, 1], [0, 1]), [15000, 15000, 0])
// 모두 0배 → 균등, 나눌 사람 없음 → 0
assert.deepEqual(splitExpense(9000, [0, 0, 0], [0, 1, 2]), [3000, 3000, 3000])
assert.deepEqual(splitExpense(9000, [1, 1], []), [0, 0])
// 소수 가중치 부동소수 오차 없음
assert.equal(sum(splitExpense(99999, [0.1, 0.2, 0.3, 1.7], all(4))), 99999)

// 무작위: 분할 합계 = 금액, 제외자는 0
let seed = 7
const rnd = (n: number) => { seed = (seed * 1103515245 + 12345) % 2 ** 31; return seed % n }
for (let k = 0; k < 2000; k++) {
  const n = 1 + rnd(12)
  const ws = Array.from({ length: n }, () => rnd(30) / 10)
  const among = all(n).filter(() => rnd(3) > 0)
  const a = rnd(5_000_000)
  const s = splitExpense(a, ws, among)
  assert.equal(sum(s), among.length ? a : 0, `split sum ${k}`)
  s.forEach((x, i) => { if (!among.includes(i)) assert.equal(x, 0) })
}

// 최소 송금: 적용하면 모두 0, 건수 ≤ n-1, 금액 양수
const apply = (net: number[], tr: { from: number; to: number; amount: number }[]) => {
  const b = [...net]
  for (const t of tr) { assert.ok(t.amount > 0); b[t.from] += t.amount; b[t.to] -= t.amount }
  return b
}
for (let k = 0; k < 2000; k++) {
  const n = 2 + rnd(10)
  const people = P(...Array.from({ length: n }, () => 1 + rnd(3) * 0.5))
  const expenses = Array.from({ length: 1 + rnd(8) }, (_, j) => ({
    name: `e${j}`, amount: rnd(500_000), payer: rnd(n), among: all(n).filter(() => rnd(4) > 0),
  }))
  const s = settle(people, expenses)
  assert.equal(sum(s.net), 0)
  assert.equal(sum(s.owed), s.total)
  assert.equal(sum(s.paid), s.total)
  assert.ok(s.transfers.length <= Math.max(0, n - 1), 'n-1 이하')
  assert.ok(apply(s.net, s.transfers).every((x) => x === 0), `settle ${k}`)
}

// 여행 예: A 숙소 90,000(3명), B 저녁 30,000(3명) → 각 40,000 부담
{
  const s = settle(P(1, 1, 1), [
    { name: '숙소', amount: 90000, payer: 0, among: [0, 1, 2] },
    { name: '저녁', amount: 30000, payer: 1, among: [0, 1, 2] },
  ])
  assert.deepEqual(s.net, [50000, -10000, -40000])
  assert.deepEqual(s.transfers, [{ from: 2, to: 0, amount: 40000 }, { from: 1, to: 0, amount: 10000 }])
}
// 이미 정산됨 → 송금 없음
assert.deepEqual(minTransfers([0, 0, 0]), [])
// 탐욕 매칭이 1:1 정확히 맞는 쌍을 우선: [+3,+2,-3,-2] → 2건
assert.equal(minTransfers([3, 2, -3, -2]).length, 2)

// 간단 모드: 100원 올림, 총무가 차액 흡수, 합계 정확
{
  const s = simpleSplit(P(1, 1, 1), [{ name: '회식', amount: 100000, among: [0, 1, 2] }], 0, 100, 'ceil')
  assert.deepEqual(s.pay, [33200, 33400, 33400])
  assert.equal(sum(s.pay), 100000)
  assert.equal(s.diff, 33200 - 33334)
  assert.deepEqual(s.transfers, [{ from: 1, to: 0, amount: 33400 }, { from: 2, to: 0, amount: 33400 }])
}
{
  const s = simpleSplit(P(1, 1, 1), [{ name: '회식', amount: 100000, among: [0, 1, 2] }], 2, 1000, 'floor')
  assert.deepEqual(s.pay, [33000, 33000, 34000])
  assert.equal(s.leader, 2)
}
// 간단 모드 + 제외 + 가중치: 식사 120,000(4명, 선배 1.5) + 술 40,000(막내 제외)
{
  const s = simpleSplit(P(1.5, 1, 1, 1), [
    { name: '식사', amount: 120000, among: [0, 1, 2, 3] },
    { name: '술', amount: 40000, among: [0, 1, 2] },
  ], 1, 100, 'round')
  assert.equal(sum(s.owed), 160000)
  assert.equal(sum(s.pay), 160000)
  assert.equal(s.owed[3], 26666) // 막내는 술 제외 → 식사분만 (남는 2원은 앞사람)
  assert.deepEqual(s.owed, [40000 + 17143, 26667 + 11429, 26667 + 11428, 26666])
  s.pay.forEach((p, i) => { if (i !== 1) assert.equal(p % 100, 0) })
}
// 무작위 간단 모드: 항상 합계 = 총액
for (let k = 0; k < 1000; k++) {
  const n = 1 + rnd(10)
  const s = simpleSplit(P(...Array.from({ length: n }, () => rnd(20) / 10)),
    [{ name: 'x', amount: rnd(3_000_000), among: all(n) }], rnd(n), [1, 10, 100, 1000][rnd(4)], (['ceil', 'floor', 'round'] as const)[rnd(3)])
  assert.equal(sum(s.pay), s.total, `simple ${k}`)
}

// URL 인코딩 왕복 (한글, 가중치, 부분 among, 계좌 없음)
{
  const st: State = {
    mode: 't', title: '제주 여행', leader: 1, unit: 1000, dir: 'floor',
    people: [{ name: '민수', weight: 1 }, { name: '지현', weight: 1.5 }, { name: '서준', weight: 0 }],
    expenses: [{ name: '숙소', amount: 240000, payer: 0, among: [0, 1, 2] }, { name: '카페', amount: 26000, payer: 2, among: [0, 2] }],
  }
  const enc = encodeState(st)
  assert.match(enc, /^[A-Za-z0-9_-]+$/)
  assert.deepEqual(decodeState(enc), st)
}
// 잘못된 입력 → null / 범위 밖 값 정리
assert.equal(decodeState('!!!'), null)
assert.equal(decodeState(null), null)
assert.equal(decodeState(Buffer.from('[2]').toString('base64url')), null)
{
  const bad = decodeState(Buffer.from(JSON.stringify([1, 'x', 5, 99, 7, 'y', ['a', ['b', 500]], [['e', -5, 9]]])).toString('base64url'))!
  assert.equal(bad.mode, 's'); assert.equal(bad.title, ''); assert.equal(bad.leader, 0); assert.equal(bad.unit, 100); assert.equal(bad.dir, 'ceil')
  assert.equal(bad.people[1].weight, 1); assert.equal(bad.expenses[0].amount, 0); assert.equal(bad.expenses[0].payer, 0)
}

console.log('check-dutch-pay: OK')
