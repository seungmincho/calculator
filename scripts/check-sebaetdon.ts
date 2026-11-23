// node scripts/check-sebaetdon.ts (Node 24) — 세뱃돈 합계·신권 장수·D-day·URL·저장값 회귀 체크
// 기대값은 손으로 계산
import assert from 'node:assert/strict'
import {
  calc, notesFor, nextSeollal, parseQuery, toQuery, hasQuery, decodeRows, parseSaved, cleanRel, isPresetRel,
  DEFAULT, REF, BANDS, ROWS_MAX, type State,
} from '../src/utils/sebaetdon.ts'

const q = (s: string) => { const p = new URLSearchParams(s); return (k: string) => p.get(k) }

// ── 신권: 큰 권종부터 최소 장수 [5만, 1만, 5천, 1천]
assert.deepEqual(notesFor(20_000), [0, 2, 0, 0])
assert.deepEqual(notesFor(30_000), [0, 3, 0, 0])
assert.deepEqual(notesFor(50_000), [1, 0, 0, 0])
assert.deepEqual(notesFor(100_000), [2, 0, 0, 0])
assert.deepEqual(notesFor(78_000), [1, 2, 1, 3], '5만+1만×2+5천+1천×3')
assert.deepEqual(notesFor(1_000), [0, 0, 0, 1])
assert.deepEqual(notesFor(15_500), [0, 1, 1, 0], '1천원 미만은 버린다')

// ── 기본 명단: 미취학 2만·초등 저학년 3만·고학년 5만·중학생 5만·고등학생 10만, 각 1명
{
  const r = calc(DEFAULT)
  assert.equal(r.people, 5)
  assert.equal(r.total, 250_000)
  assert.equal(r.envelopes, 5)
  assert.equal(r.avg, 50_000)
  assert.deepEqual(r.notes, [4, 5, 0, 0], '5만원권 1+1+2=4, 1만원권 2+3=5')
  assert.equal(r.sheets, 9)
  assert.equal(r.left, null)
  assert.deepEqual(r.byBand.map((b) => b.band), ['pre', 'el', 'eh', 'mid', 'high'])
}
// 인원·예산·같은 나이대 두 줄
{
  const s: State = {
    rows: [
      { rel: 'n', band: 'mid', n: 2, amt: 50_000 },
      { rel: 'u', band: 'mid', n: 1, amt: 70_000 },
      { rel: 'p', band: 'adult', n: 2, amt: 200_000 },
    ],
    budget: 500_000,
  }
  const r = calc(s)
  assert.equal(r.people, 5)
  assert.equal(r.total, 100_000 + 70_000 + 400_000)
  assert.equal(r.left, 500_000 - 570_000, '7만원 초과')
  assert.deepEqual(r.notes, [2 + 1 + 8, 2, 0, 0], '5만×2명=2, 7만=5만+1만×2, 20만×2명=5만원권 8장')
  assert.deepEqual(r.byBand, [{ band: 'mid', people: 3, total: 170_000 }, { band: 'adult', people: 2, total: 400_000 }])
  assert.equal(calc({ ...s, budget: 600_000 }).left, 30_000)
}
assert.equal(calc({ rows: [], budget: 0 }).avg, 0)

// ── 참고 범위: 하한 ≤ 참고값 ≤ 상한, 1천원 단위
for (const b of BANDS) {
  const [lo, hi, ref] = REF[b]
  assert.ok(lo <= ref && ref <= hi, b)
  assert.equal(ref % 1000, 0)
}

// ── 다음 설날: 2027-02-07(일). 2026-11-22 → 8 + 31 + 31 + 7 = 77일
assert.deepEqual(nextSeollal('2026-11-22'), { date: '2027-02-07', days: 77 })
assert.deepEqual(nextSeollal('2027-02-07'), { date: '2027-02-07', days: 0 }, '설날 당일 D-0')
assert.equal(nextSeollal('2027-02-08')?.date.slice(0, 4), '2028', '지나면 다음 해')
assert.deepEqual(nextSeollal('2026-01-01'), { date: '2026-02-17', days: 47 }, '2026 설 2/17: 30 + 17')

// ── URL: 기본이면 빈 쿼리, 왕복
assert.equal(toQuery(DEFAULT), '')
assert.equal(hasQuery(q('')), false)
assert.deepEqual(parseQuery(q('')), DEFAULT)
{
  const s: State = {
    rows: [
      { rel: 'n', band: 'pre', n: 2, amt: 15_000 },
      { rel: '외손녀', band: 'univ', n: 1, amt: 150_000 },
      { rel: 'p', band: 'adult', n: 2, amt: 300_000 },
    ],
    budget: 1_000_000,
  }
  const qs = toQuery(s)
  assert.equal(new URLSearchParams(qs).get('r'), 'pre.2.15.n_univ.1.150.외손녀_adult.2.300.p')
  assert.equal(new URLSearchParams(qs).get('b'), '1000')
  assert.equal(hasQuery(q(qs)), true)
  assert.deepEqual(parseQuery(q(qs)), s, '왕복')
}
// 예산만 있으면 명단은 기본
assert.deepEqual(parseQuery(q('b=300')), { rows: DEFAULT.rows, budget: 300_000 })
assert.equal(toQuery({ rows: DEFAULT.rows, budget: 300_000 }), 'b=300')
// 잘못된 줄은 버리고, 모두 잘못되면 기본 명단
assert.deepEqual(decodeRows('pre.1.20.n_xx.1.20.n_mid.0.50.n_mid.31.50.n_mid.1.0.n_mid.1.1001.n_mid.1.x.n_mid.1.5.n'), [
  { rel: 'n', band: 'pre', n: 1, amt: 20_000 },
  { rel: 'n', band: 'mid', n: 1, amt: 5_000 },
], '나이대·인원 1~30·금액 1~1000천원만')
assert.deepEqual(parseQuery(q('r=garbage&b=-5')), DEFAULT)
assert.deepEqual(parseQuery(q('b=100001')).budget, 0, '예산 1억 초과는 무시')
// 관계 생략 → 성인은 부모님, 나머지는 조카
assert.deepEqual(decodeRows('adult.1.200_high.1.100'), [
  { rel: 'p', band: 'adult', n: 1, amt: 200_000 },
  { rel: 'n', band: 'high', n: 1, amt: 100_000 },
])
assert.equal(decodeRows(Array(25).fill('pre.1.10.n').join('_')).length, ROWS_MAX)
// 관계 이름의 '.'·'_' 는 지워 URL 구분자와 섞이지 않게
assert.equal(cleanRel('큰.조카_1'), '큰조카1')
assert.equal(cleanRel('가나다라마바사아자차카타파하'), '가나다라마바사아자차카타')
// 12자 자르기는 코드 포인트 단위: 이모지를 반으로 자르면 URL 왕복에서 '�' 가 된다
{
  const rel = cleanRel('가나다라마바사아자차카😀😀')
  assert.equal(rel, '가나다라마바사아자차카😀')
  const s: State = { rows: [{ rel, band: 'pre', n: 1, amt: 20_000 }], budget: 0 }
  assert.equal(parseQuery(q(toQuery(s))).rows[0].rel, rel, '이모지 관계 이름 왕복')
}
assert.equal(isPresetRel('n'), true)
assert.equal(isPresetRel('외손녀'), false)

// ── 저장값
{
  const s: State = { rows: [{ rel: 'g', band: 'el', n: 3, amt: 30_000 }], budget: 200_000 }
  assert.deepEqual(parseSaved(JSON.stringify(s)), s)
  assert.equal(parseSaved(null), null)
  assert.equal(parseSaved('{bad'), null)
  assert.equal(parseSaved(JSON.stringify({ rows: [] })), null)
  assert.deepEqual(parseSaved(JSON.stringify({ rows: [{ band: 'pre', n: 1, amt: 10_500 }, ...s.rows], budget: 7 })), { rows: s.rows, budget: 0 },
    '1천원 단위가 아니면 버림')
}

console.log('sebaetdon: all ok')
