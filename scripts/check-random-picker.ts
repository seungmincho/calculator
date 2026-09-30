// 랜덤 뽑기 로직 회귀 체크: node scripts/check-random-picker.ts
import assert from 'node:assert/strict'
import { parseEntries, seededRng, drawWinners, eligibleCount, newSeed, serializeEntries } from '../src/utils/randomPicker.ts'

// 파싱: 줄바꿈/쉼표, 공백, 가중치
const p = parseEntries('홍길동 x3\n김철수, 이영희\n\n  박민수  \nMax2\n최지우×2\n정우성 * 5', false)
assert.deepEqual(p.entries, [
  { name: '홍길동', weight: 3 }, { name: '김철수', weight: 1 }, { name: '이영희', weight: 1 },
  { name: '박민수', weight: 1 }, { name: 'Max2', weight: 1 }, { name: '최지우', weight: 2 }, { name: '정우성', weight: 5 },
])
assert.equal(parseEntries('a x99999', false).entries[0].name, 'a x99999') // 5자리는 이름으로 취급
assert.equal(parseEntries('a x0', false).entries[0].weight, 1)

// dedupe
const d = parseEntries('a\nb\nA\na x2\nc', true)
assert.deepEqual(d.entries.map((e) => e.name), ['a', 'b', 'c'])
assert.equal(d.removed, 2)
assert.equal(parseEntries('a\na', false).entries.length, 2)
assert.equal(eligibleCount(parseEntries('a\na\nb', false).entries), 2)

// 시드 재현성
const list = parseEntries(Array.from({ length: 52 }, (_, i) => `참가자${i + 1}`).join('\n'), true).entries
const w1 = drawWinners(list, 3, seededRng('abc123'))
assert.deepEqual(drawWinners(list, 3, seededRng('abc123')), w1)
assert.notDeepEqual(drawWinners(list, 3, seededRng('abc124')), w1)
assert.equal(serializeEntries(parseEntries('a x3\nb', false).entries), 'a x3\nb')

// 중복 당첨 없음 (중복 이름 줄 포함), 개수 상한
for (let s = 0; s < 200; s++) {
  const e = parseEntries('a\na\nb x5\nc\nd', false).entries
  const w = drawWinners(e, 10, seededRng(`s${s}`))
  const names = w.map((i) => e[i].name)
  assert.equal(new Set(names).size, names.length)
  assert.equal(names.length, 4)
}

// 제외: 이전 당첨자는 다시 안 뽑힘
for (let s = 0; s < 200; s++) {
  const r1 = drawWinners(list, 5, seededRng(`r${s}`)).map((i) => list[i].name)
  const r2 = drawWinners(list, 5, seededRng(`q${s}`), r1).map((i) => list[i].name)
  assert.ok(r2.every((n) => !r1.includes(n)))
}
assert.deepEqual(drawWinners(list, 3, seededRng('x'), list.map((e) => e.name)), [])

// 가중치 분포: b x3 은 a 대비 약 3배
const we = parseEntries('a\nb x3', false).entries
let b = 0
const rng = seededRng('dist')
for (let i = 0; i < 20000; i++) if (drawWinners(we, 1, rng)[0] === 1) b++
assert.ok(Math.abs(b / 20000 - 0.75) < 0.02, `weight ratio ${b / 20000}`)

// 균등성: 10명 1명씩 뽑기
const ten = parseEntries('0,1,2,3,4,5,6,7,8,9', false).entries
const cnt = new Array(10).fill(0)
for (let i = 0; i < 50000; i++) cnt[drawWinners(ten, 1, rng)[0]]++
assert.ok(cnt.every((c) => Math.abs(c / 50000 - 0.1) < 0.01), `uniform ${cnt}`)

// crypto 시드
const s1 = newSeed()
assert.match(s1, /^[a-z2-9]{10}$/)
assert.notEqual(s1, newSeed())

console.log('check-random-picker: OK')
