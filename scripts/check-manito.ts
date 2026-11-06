// node scripts/check-manito.ts (Node 24, 타입 제거 실행)
import assert from 'node:assert/strict'
import { decodeCard, drawCycle, duplicates, encodeCard, parseNames, pickMissions, seeded, type Pair } from '../src/utils/manito.ts'

const isCycle = (names: string[], a: Record<string, string>) => {
  const seen = new Set<string>()
  let cur = names[0]
  for (let i = 0; i < names.length; i++) { assert.notEqual(a[cur], cur, 'no self'); seen.add(cur); cur = a[cur] }
  return cur === names[0] && seen.size === names.length
}

assert.deepEqual(parseNames(' 민지,서준\n\n 하은 ,, 도윤 '), ['민지', '서준', '하은', '도윤'])
assert.deepEqual(duplicates(['a', 'b', 'a', 'a', 'c', 'b']), ['a', 'b'])
assert.equal(parseNames('x'.repeat(30))[0].length, 20)

// 한 바퀴: 자기 자신·맞뽑기 없음, 모두 한 번씩 주고받음
const names = ['민지', '서준', '하은', '도윤', '지우', '예준']
for (let s = 1; s <= 200; s++) {
  const a = drawCycle(names, [], seeded(s))!
  assert.ok(isCycle(names, a), `cycle seed ${s}`)
  for (const n of names) assert.notEqual(a[a[n]], n, 'no mutual pair')
}
// 같은 시드 = 같은 배정 (정적 HTML 과 브라우저 첫 렌더 일치)
assert.deepEqual(drawCycle(names, [], seeded(1)), drawCycle(names, [], seeded(1)))
// 균등성 대략: 4명 순환 6가지가 모두 나온다
const kinds = new Set<string>()
for (let s = 1; s <= 400; s++) { const a = drawCycle(['a', 'b', 'c', 'd'], [], seeded(s))!; kinds.add(['a', 'b', 'c', 'd'].map(x => a[x]).join('')) }
assert.equal(kinds.size, 6)

// 제외 규칙은 어느 방향으로도 잇지 않는다
const ex: Pair[] = [['민지', '서준'], ['하은', '도윤']]
for (let s = 1; s <= 200; s++) {
  const a = drawCycle(names, ex, seeded(s))!
  assert.ok(isCycle(names, a))
  for (const [x, y] of ex) { assert.notEqual(a[x], y); assert.notEqual(a[y], x) }
}
// 3명은 모든 쌍이 이어지므로 제외 하나면 불가
assert.equal(drawCycle(['a', 'b', 'c'], [['a', 'b']]), null)
// 한 사람을 나머지 모두와 제외하면 불가
assert.equal(drawCycle(['a', 'b', 'c', 'd'], [['a', 'b'], ['a', 'c']]), null, 'a needs 2 neighbours')
assert.ok(drawCycle(['a', 'b', 'c', 'd'], [['a', 'b'], ['c', 'd']]), 'a-c-b-d-a works')
assert.equal(drawCycle(['a', 'b']), null, 'too few')
assert.equal(drawCycle(['a', 'b', 'a']), null, 'duplicates')
// 50명, 제외 25쌍도 금방 끝난다
const big = Array.from({ length: 50 }, (_, i) => `p${i}`)
const bigEx = Array.from({ length: 25 }, (_, i) => [`p${2 * i}`, `p${2 * i + 1}`] as Pair)
assert.ok(isCycle(big, drawCycle(big, bigEx, seeded(7))!))

// 개인 링크 왕복, 한글·이모지, 선택 항목 생략
const card = { g: '개발팀 송년회 🎄', f: '민지', t: '서준', b: 30000, d: '2026-12-19', m: '손편지 필수, 12/19 회식 때 공개' }
const code = encodeCard(card)
assert.match(code, /^1[A-Za-z0-9_-]+$/)
assert.ok(!code.includes('민지') && !decodeURIComponent(code).includes('서준'), 'names are not readable in the URL')
assert.deepEqual(decodeCard('#' + code), card)
assert.deepEqual(decodeCard(encodeCard({ f: 'A', t: 'B' })), { f: 'A', t: 'B' })
for (const bad of ['', '#', '#2abc', '#1@@@', '#1' + 'A'.repeat(10), '#1' + code.slice(1, -3), encodeCard({ f: '', t: 'B' }), encodeCard({ f: 'A', t: 'x'.repeat(21) })]) {
  assert.equal(decodeCard(bad), null, `reject ${bad.slice(0, 20)}`)
}

// 미션: 같은 링크는 같은 미션, 서로 다른 3개
const m1 = pickMissions(code, 12, 3)
assert.deepEqual(m1, pickMissions(code, 12, 3))
assert.equal(new Set(m1).size, 3)
assert.ok(m1.every(i => i >= 0 && i < 12))
assert.deepEqual(pickMissions('x', 2, 3).sort(), [0, 1])

console.log('check-manito: all passed')
