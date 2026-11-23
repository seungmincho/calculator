// node scripts/check-charye-cost.ts (Node 24) — 차례상 비용: aT 합계 대조·간소화·규모·수량·URL·체크리스트 회귀 체크
// 기대값은 aT 보도자료 붙임 표 합계와 손으로 더한 값
import assert from 'node:assert/strict'
import {
  calc, lines, scaledQty, simpleSet, parseQuery, toQuery, normalize, parseChecked, SURVEYS, DEFAULT, HOLIDAYS,
  type State,
} from '../src/utils/charyeCost.ts'

const q = (s: string) => { const p = new URLSearchParams(s); return (k: string) => p.get(k) }
const cost = (st: State, id: string, shop: 'market' | 'mart' = 'market') => lines(st).find((l) => l.id === id)!.cost[shop]

// ── 조사 기준(전체·보통) 합계 = aT 발표 업태별 합계
for (const h of HOLIDAYS) {
  const sv = SURVEYS[h]
  assert.equal(sv.rows.reduce((a, r) => a + r[3], 0), sv.total.market, `${h} 전통시장 표 합`)
  assert.equal(sv.rows.reduce((a, r) => a + r[4], 0), sv.total.mart, `${h} 대형유통 표 합`)
  const r = calc({ ...DEFAULT, h })
  assert.deepEqual(r.byShop, { market: sv.total.market, mart: sv.total.mart }, h)
  assert.equal(r.included.length, sv.rows.length)
}
// 설 2026: 전통시장 185,313 · 대형유통 227,876 / 추석 2026: 195,911 · 191,511
assert.equal(calc(DEFAULT).total, 185_313)
assert.equal(calc({ ...DEFAULT, s: 'mart' }).total, 227_876)
assert.equal(calc({ ...DEFAULT, h: 'chuseok' }).total, 195_911)
assert.equal(calc({ ...DEFAULT, h: 'chuseok', s: 'mart' }).total, 191_511)

// ── 간소화(성균관 표준안 음식에 해당하는 11품목)
assert.deepEqual(simpleSet('seol')[0], 'tteokguk')
assert.deepEqual(simpleSet('chuseok')[0], 'songpyeon')
assert.equal(simpleSet('seol').length, 11)
{
  // 설 전통시장: 6,293+3,228+6,565+2,390+518+38,997+15,722+11,094+9,229+8,386+5,613 (떡국떡·시금치·고사리·무·배추·설도·사과·배·밤·곶감·청주)
  const s = calc({ ...DEFAULT, t: 'simple' })
  assert.equal(s.total, 108_035)
  assert.equal(s.byShop.mart, 125_606)
  assert.equal(s.full, 185_313)
  assert.equal(s.simple, 108_035)
  assert.equal(calc(DEFAULT).full - calc(DEFAULT).simple, 77_278, '간소화로 줄이는 금액')
  // 추석 전통시장: 12,375+6,800+7,560+2,913+1,108+39,456+13,647+10,896+8,578+8,617+5,574
  assert.equal(calc({ ...DEFAULT, h: 'chuseok', t: 'simple' }).total, 117_524)
}

// ── 품목마다 더 싼 곳(설 전체): 전통시장이 싼 줄 15개(한우 설도·양지 = aT 기준 14개 품목)
{
  const r = calc(DEFAULT)
  assert.equal(r.mixed, 174_091)
  assert.equal(r.included.filter((l) => l.cost.market < l.cost.mart).length, 15)
  assert.ok(r.mixed <= Math.min(r.byShop.market, r.byShop.mart))
}

// ── 규모: 조절 단위로 반올림, 최소 한 단위
for (const h of HOLIDAYS) for (const l of lines({ ...DEFAULT, h })) assert.equal(l.qty, l.base, `보통 규모는 조사 수량 그대로 ${h} ${l.id}`)
assert.equal(scaledQty('g', 350, 's'), 200, '약과 350g: 50g 단위, 175 → 200')
assert.equal(scaledQty('g', 900, 's'), 500, '450g → 100g 단위 반올림 500g')
assert.equal(scaledQty('g', 900, 'l'), 1400, '1350g → 1400g')
assert.equal(scaledQty('ea', 5, 's'), 3, '사과 2.5개 → 3개')
assert.equal(scaledQty('ea', 5, 'l'), 8, '7.5개 → 8개')
assert.equal(scaledQty('ea', 1, 's'), 1, '무 0.5개 → 1개')
assert.equal(scaledQty('egg', 10, 's'), 10, '달걀은 10구 단위')
assert.equal(scaledQty('ml', 700, 's'), 700, '청주는 한 병 단위')
assert.equal(scaledQty('ml', 700, 'l'), 1400)
{
  const small: State = { ...DEFAULT, z: 's' }
  assert.equal(cost(small, 'beefRound'), 21_665, '38,997 × 500/900 = 21,665')
  assert.equal(cost(small, 'apple'), 9_433, '15,722 × 3/5 = 9,433.2')
  assert.equal(cost(small, 'pollock'), 3_724, '7,447 × 400/800 = 3,723.5 → 3,724')
  assert.equal(cost(small, 'cheongju'), 5_613)
  const r = calc(small)
  assert.equal(r.total, r.included.reduce((a, l) => a + l.cost.market, 0))
  assert.ok(r.total < calc(DEFAULT).total && calc({ ...DEFAULT, z: 'l' }).total > calc(DEFAULT).total)
}

// ── 수량 직접 조정·포함 여부
assert.equal(calc({ ...DEFAULT, q: { beefRound: 600 } }).total, 185_313 - 38_997 + 25_998, '38,997 × 600/900 = 25,998')
assert.equal(calc({ ...DEFAULT, z: 'l', q: { beefRound: 600 } }).included.find((l) => l.id === 'beefRound')!.qty, 600, '직접 정한 수량은 규모와 무관')
assert.equal(calc({ ...DEFAULT, q: { beefRound: 650 } }).total, 185_313, '100g 단위가 아니면 무시')
assert.equal(calc({ ...DEFAULT, o: ['persimmon'] }).total, 185_313 - 8_386, '전체에서 곶감 빼기')
assert.equal(calc({ ...DEFAULT, t: 'simple', o: ['egg'] }).total, 108_035 + 2_060, '간소화에 달걀 더하기')
assert.equal(calc({ ...DEFAULT, t: 'simple', o: ['tteokguk'] }).total, 108_035 - 6_293)
// 간소화 화면의 '전체보다 N 적어요'는 보이는 총액 기준(full - total). 품목을 더해도 full 을 넘지 않는다
{
  const r = calc({ ...DEFAULT, t: 'simple', o: ['egg'] })
  assert.equal(r.full - r.total, 185_313 - 110_095, '달걀 더한 간소화: 75,218원 적다')
  const all = calc({ ...DEFAULT, t: 'simple', o: lines(DEFAULT).map((l) => l.id).filter((id) => !simpleSet('seol').includes(id)) })
  assert.equal(all.total, all.full, '간소화에 나머지를 모두 더하면 전체와 같다')
}

// ── URL: 기본이면 빈 쿼리, 왕복, 이 명절에 없는 품목·잘못된 수량은 버림
assert.equal(toQuery(DEFAULT), '')
assert.deepEqual(parseQuery(q('')), DEFAULT)
{
  const st: State = { h: 'chuseok', t: 'simple', s: 'mart', z: 'l', o: ['egg', 'apple'], q: { beefRound: 1200 } }
  const qs = toQuery(st)
  assert.equal(qs, 'h=chuseok&t=simple&s=mart&z=l&o=apple.egg&q=beefRound-1200', '조사 표 순서로')
  assert.deepEqual(parseQuery(q(qs)), normalize(st))
  assert.deepEqual(normalize(st).o, ['apple', 'egg'])
}
assert.deepEqual(
  parseQuery(q('h=chuseok&o=tteokguk.nope.rice&q=beefRound-950_apple-0_pork-3100_tteokguk-1000_egg-20_x-5')),
  { ...DEFAULT, h: 'chuseok', o: ['rice'], q: { egg: 20 } },
  '추석엔 떡국떡 없음, 돼지 3,000g(10배) 초과·950g·0개 무시',
)
assert.deepEqual(parseQuery(q('h=xx&t=yy&s=zz&z=ww')), DEFAULT)
assert.equal(toQuery({ ...DEFAULT, q: { pork: 300 } }), 'q=pork-300', '조사 수량과 같아도 직접 정한 값은 남긴다')

// ── 장보기 체크
assert.deepEqual(parseChecked(JSON.stringify(['apple', 'apple', 'nope', 3, 'songpyeon'])), ['apple', 'songpyeon'])
assert.deepEqual(parseChecked('{bad'), [])
assert.deepEqual(parseChecked(null), [])

console.log('charye-cost: all ok')
