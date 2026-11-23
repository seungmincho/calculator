// node scripts/check-formula-amount.ts (Node 24) — 아기 분유량 계산·생후 개월·URL 회귀 체크
// 기대값은 손으로 계산: 하루 = 체중 × 체중당 mL(아이사랑), 960mL 상한, 화면 mL 는 10 단위 반올림, 스푼은 0.5 단위
import assert from 'node:assert/strict'
import {
  calc, ageFrom, parseState, toQuery, perKg, rowOf, defaultTimes, r10, half,
  DEFAULT, DAILY_CAP, ROWS, M_RANGE, type State,
} from '../src/utils/formulaAmount.ts'

const S = (o: Partial<State>): State => ({ ...DEFAULT, ...o })

// ── 체중당 기준(아이사랑): 3개월이 될 때까지 150~180, 3~6개월 약 120, 6~12개월 90~100
assert.deepEqual(perKg(0), [150, 180])
assert.deepEqual(perKg(2), [150, 180])
assert.deepEqual(perKg(3), [120, 120])
assert.deepEqual(perKg(5), [120, 120])
assert.deepEqual(perKg(6), [90, 100])
assert.deepEqual(perKg(12), [90, 100])

// ── 반올림
assert.equal(r10(675), 680)
assert.equal(r10(594), 590)
assert.equal(half(24 / 7), 3.5)
assert.equal(half(10 / 3), 3.5)

// ── 기본값: 1개월 4.5kg, 하루 7회 → 675~810mL, 1회 96.4~115.7 → 100~120mL, 20mL당 1스푼 → 5~6스푼
{
  const r = calc(DEFAULT)
  assert.equal(r.n, 7)
  assert.deepEqual(r.daily, [680, 810])
  assert.deepEqual(r.feed, [100, 120])
  assert.deepEqual(r.scoops, [5, 6])
  assert.equal(r.interval, 3.5)
  assert.equal(r.over, false)
  assert.equal(r.row.id, 'm1to4')
  assert.equal(r.feedAboveRow, false)
  // AAP: 4.5kg × 75/0.453 = 745.0 → 750, 1회 745.0/7 = 106.4 → 110
  assert.deepEqual(r.aap, { daily: 750, feed: 110 })
}
// 아이사랑 예시: 7kg 5개월 → 하루 840mL
{
  const r = calc(S({ m: 5, w: 7 }))
  assert.deepEqual(r.daily, [840, 840])
  assert.equal(r.n, 5)
  assert.deepEqual(r.feed, [170, 170], '840/5 = 168')
  assert.equal(r.row.id, 'm5to6')
  // AAP 7kg × 165.56 = 1158.9 → 960 상한, 1회 192 → 190
  assert.deepEqual(r.aap, { daily: 960, feed: 190 })
}
// 아이사랑 예시: 4kg 1개월 → 하루 600~720mL(150~180)
assert.deepEqual(calc(S({ m: 1, w: 4 })).daily, [600, 720])
// 신생아 3.3kg 8회: 495~594 → 500~590, 1회 61.9~74.3 → 60~70, 3시간
{
  const r = calc(S({ m: 0, w: 3.3 }))
  assert.equal(r.n, 8)
  assert.deepEqual(r.daily, [500, 590])
  assert.deepEqual(r.feed, [60, 70])
  assert.equal(r.interval, 3)
  assert.equal(r.row.id, 'newborn')
}
// 상한: 2개월 6.5kg → 975~1170 → 960, 1회 960/7 = 137.1 → 140
{
  const r = calc(S({ m: 2, w: 6.5 }))
  assert.deepEqual(r.daily, [960, 960])
  assert.equal(r.over, true)
  assert.deepEqual(r.feed, [140, 140])
}
// 12개월 10kg → 900~1000 → 900~960
{
  const r = calc(S({ m: 12, w: 10 }))
  assert.deepEqual(r.daily, [900, 960])
  assert.equal(r.over, true)
  assert.equal(r.aap, null, '6개월부터는 AAP 체중당 비교 없음')
  assert.equal(r.row.id, 'm12')
}
// 9개월 8.5kg 5회: 765~850 → 770~850, 1회 153~170 → 150~170
{
  const r = calc(S({ m: 9, w: 8.5 }))
  assert.deepEqual(r.daily, [770, 850])
  assert.deepEqual(r.feed, [150, 170])
  assert.equal(r.feedAboveRow, false, '9~11개월 표에는 1회 양이 없다')
}
// 1회 양이 표보다 많음: 신생아 4.5kg 8회 → 1회 84~101 → 80~100(표 50~100) 아님 / 4회로 줄이면 169~203 → 170~200 > 100
assert.equal(calc(S({ m: 0, w: 4.5 })).feedAboveRow, false)
assert.equal(calc(S({ m: 0, w: 4.5, n: 4 })).feedAboveRow, true)

// ── 혼합수유: 기본에 모유 3회 → 분유 4회 × 화면 1회 양 100~120 = 400~480 (화면 식 '4회 × 100~120 mL = 하루 …' 과 맞게)
{
  const r = calc(S({ b: 3 }))
  assert.equal(r.formulaTimes, 4)
  assert.deepEqual(r.mixedDaily, [400, 480])
  assert.deepEqual(r.feed, [100, 120], '1회 양은 그대로')
  // 회귀: 하루 분유 = 보이는 1회 양 × 분유 횟수(예전엔 반올림 전 값으로 곱해 390~460)
  for (const st of [S({ b: 3 }), S({ m: 0, w: 3.3, b: 5 }), S({ m: 2, w: 6.5, b: 1 }), S({ m: 9, w: 8.5, n: 7, b: 2 })]) {
    const x = calc(st)
    assert.deepEqual(x.mixedDaily, [x.feed[0] * x.formulaTimes, x.feed[1] * x.formulaTimes])
  }
  // 모유 횟수가 전체보다 많으면 전체로
  assert.equal(calc(S({ b: 99 })).formulaTimes, 0)
  assert.deepEqual(calc(S({ b: 99 })).mixedDaily, [0, 0])
}
// 스푼: 30mL당 1스푼 → 100/30 = 3.33 → 3.5, 120/30 = 4
assert.deepEqual(calc(S({ s: 30 })).scoops, [3.5, 4])

// ── 표 데이터
for (let m = M_RANGE[0]; m <= M_RANGE[1]; m++) {
  const row = rowOf(m)
  assert.ok(row, `${m}개월 표 줄`)
  assert.ok(defaultTimes(m) >= 1)
  const r = calc(S({ m, w: 3 + m * 0.6 }))
  assert.ok(r.daily[1] <= DAILY_CAP)
  assert.ok(r.daily[0] <= r.daily[1] && r.feed[0] <= r.feed[1])
}
// 월령 0~4 는 표 횟수 범위 안의 기본값
for (let m = 0; m <= 4; m++) assert.ok(defaultTimes(m) >= rowOf(m).times[0] && defaultTimes(m) <= rowOf(m).times[1], `${m}개월`)
assert.equal(ROWS.length, 6)

// ── 생년월일 → 생후 일수·만 개월
assert.deepEqual(ageFrom('2026-10-22', '2026-11-22'), { days: 31, months: 1 })
assert.deepEqual(ageFrom('2026-10-23', '2026-11-22'), { days: 30, months: 0 })
assert.deepEqual(ageFrom('2026-11-22', '2026-11-22'), { days: 0, months: 0 })
assert.deepEqual(ageFrom('2025-11-22', '2026-11-22'), { days: 365, months: 12 })
assert.deepEqual(ageFrom('2024-02-29', '2024-03-28'), { days: 28, months: 0 })
assert.deepEqual(ageFrom('2024-01-31', '2024-02-29'), { days: 29, months: 0 })
assert.equal(ageFrom('2026-11-23', '2026-11-22'), null, '미래')
assert.equal(ageFrom('2026-02-29', '2026-11-22'), null, '없는 날짜')
assert.equal(ageFrom('', '2026-11-22'), null)

// ── URL
{
  const back = (s: State) => { const p = new URLSearchParams(toQuery(s)); return parseState((k) => p.get(k)) }
  assert.equal(toQuery(DEFAULT), '', '기본값이면 쿼리 없음')
  assert.deepEqual(parseState(() => null), DEFAULT)
  const a = S({ m: 3, w: 6.2 })
  assert.equal(toQuery(a), 'm=3&w=6.2')
  assert.deepEqual(back(a), a)
  const b = S({ m: 0, w: 3.3, n: 10, b: 2, s: 30 })
  assert.equal(toQuery(b), 'm=0&w=3.3&n=10&b=2&s=30')
  assert.deepEqual(back(b), b)
  // 월령 기본 횟수와 같으면 n 은 쓰지 않고 null 로 읽는다
  assert.equal(toQuery(S({ m: 3, n: 6 })), 'm=3')
  assert.equal(parseState((k) => ({ m: '3', n: '6' })[k] ?? null).n, null)
  // 틀린 값은 기본값
  const bad = new URLSearchParams('m=13&w=0&n=0&b=-1&s=5')
  assert.deepEqual(parseState((k) => bad.get(k)), DEFAULT)
  assert.deepEqual(parseState((k) => ({ m: '1.5', w: '4.56' })[k] ?? null), S({ w: 4.6 }), '월령은 정수, 체중은 0.1kg')
  // 모유 횟수는 전체 횟수 안으로
  assert.equal(parseState((k) => ({ b: '9' })[k] ?? null).b, 7)
  assert.equal(parseState((k) => ({ n: '4', b: '9' })[k] ?? null).b, 4)
  // 경계 허용
  const edge = new URLSearchParams('m=12&w=20&n=12&s=100')
  assert.deepEqual(parseState((k) => edge.get(k)), S({ m: 12, w: 20, n: 12, s: 100 }))
  const edge2 = new URLSearchParams('m=0&w=1.5&n=1&s=10')
  assert.deepEqual(parseState((k) => edge2.get(k)), S({ m: 0, w: 1.5, n: 1, s: 10 }))
}

console.log('check-formula-amount: all passed')
