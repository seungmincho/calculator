// node scripts/check-transit-pass.ts (Node 24) — K-패스(모두의카드) 기본형·일반형·플러스형 환급, 손익분기, URL 회귀 체크
// 기대값은 손으로 계산: 기본형 = 전체 × 환급률(+시차 승차분 × 30%p), 일반형 = 전체 − 3천원 이상 금액 − 기준금액, 플러스형 = 전체 − 기준금액
import assert from 'node:assert/strict'
import {
  refunds, breakeven, plusOverGeneral, baseOf, usageOf, parseState, toQuery, BASE, RATE, DEFAULT, REGIONS, GROUPS,
  type State, type Usage,
} from '../src/utils/transitPass.ts'

const U = (total: number, trips: number, wide = 0, offpeak = 0): Usage => ({ total, trips, wide, offpeak })

// ── 기준금액 표(누리집 원문)와 묶음
assert.deepEqual(baseOf('seoul', 'general'), [62_000, 100_000])
assert.deepEqual(baseOf('metro', 'youth'), [55_000, 90_000])
assert.deepEqual(baseOf('seoul', 'kids3'), [45_000, 80_000])
assert.deepEqual(baseOf('local', 'general'), [55_000, 95_000])
assert.deepEqual(baseOf('local', 'senior'), [50_000, 85_000])
assert.deepEqual(baseOf('pref', 'kids2'), [45_000, 80_000])
assert.deepEqual(baseOf('pref', 'low'), [35_000, 70_000])
assert.deepEqual(baseOf('special', 'general'), [45_000, 85_000])
assert.deepEqual(baseOf('special', 'senior'), [40_000, 75_000])
assert.deepEqual(baseOf('special', 'low'), [30_000, 65_000])
for (const rows of Object.values(BASE)) {
  assert.ok(rows[0][0] > rows[1][0] && rows[1][0] > rows[2][0], '일반 > 청년 > 저소득')
  for (const [g, p] of rows) assert.ok(p - g >= 35_000 && p - g <= 40_000, '플러스형 − 일반형 3.5~4만원')
}
assert.deepEqual(RATE, { general: 0.2, youth: 0.3, senior: 0.3, kids2: 0.3, kids3: 0.5, low: 0.533 })

// ── 기본값: 1,550원 × 44회 = 68,200원, 서울 일반
{
  const u = usageOf(DEFAULT)
  assert.deepEqual(u, { total: 68_200, wide: 0, trips: 44, offpeak: 0 })
  const r = refunds(u, 'seoul', 'general')
  assert.deepEqual(r.by, { basic: 13_640, general: 6_200, plus: 0 }, '20% / 68,200 − 62,000')
  assert.equal(r.best, 'basic')
  assert.equal(r.refund, 13_640)
  assert.equal(r.pay, 54_560)
  // 손익분기: 62,000 ÷ 0.8 = 77,500 은 동률(기본형 유지) → 77,501원부터 일반형
  assert.deepEqual(breakeven(u, 'seoul', 'general'), { amount: 77_501, method: 'general' })
  assert.deepEqual(refunds(U(77_500, 50), 'seoul', 'general').best, 'basic', '동률은 기본형')
  assert.deepEqual(refunds(U(77_501, 50), 'seoul', 'general').best, 'general')
}

// ── 15회 기준
assert.equal(refunds(U(21_700, 14), 'seoul', 'general').refund, 0, '14회: 환급 없음')
assert.equal(refunds(U(21_700, 14), 'seoul', 'general').eligible, false)
assert.equal(refunds(U(23_250, 15), 'seoul', 'general').refund, 4_650, '15회 × 1,550 × 20%')

// ── 많이 타면 일반형: 1,550 × 60회 = 93,000 → 93,000 − 62,000 = 31,000, 부담은 기준금액 62,000 에서 멈춘다
{
  const r = refunds(U(93_000, 60), 'seoul', 'general')
  assert.deepEqual(r.by, { basic: 18_600, general: 31_000, plus: 0 })
  assert.equal(r.best, 'general')
  assert.equal(r.pay, 62_000)
  assert.equal(breakeven(U(93_000, 60), 'seoul', 'general'), null, '이미 정액형')
}

// ── 광역버스·GTX: 1,550 × 20 + 3,000 × 40 = 151,000(3천원 이상 120,000) → 일반형 0, 플러스형 51,000
{
  const s: State = { ...DEFAULT, n: 20, w: true, wf: 3_000, wn: 40 }
  const u = usageOf(s)
  assert.deepEqual(u, { total: 151_000, wide: 120_000, trips: 60, offpeak: 0 })
  const r = refunds(u, 'seoul', 'general')
  assert.deepEqual(r.by, { basic: 30_200, general: 0, plus: 51_000 })
  assert.equal(r.best, 'plus')
  assert.equal(plusOverGeneral('seoul', 'general'), 38_000, '100,000 − 62,000')
  // 전부 3천원 이상이면 일반형은 못 이기고 플러스형 손익분기 100,000 ÷ 0.8 = 125,000 → 125,001
  assert.deepEqual(breakeven(U(90_000, 30, 90_000), 'seoul', 'general'), { amount: 125_001, method: 'plus' })
  // 3천원 이상 45,000원 > 38,000원이어도 전체 76,000원 ≤ 100,000원이면 일반형·플러스형 모두 0 → 화면은 'plusNow' 를 띄우지 않는다(by.plus > by.general 로 판단)
  const r2 = refunds(U(76_000, 35, 45_000), 'seoul', 'general')
  assert.ok(45_000 > plusOverGeneral('seoul', 'general'))
  assert.equal(r2.by.plus, 0)
  assert.equal(r2.by.general, 0)
}
// 회당 → 월 금액 전환(컴포넌트 setMode): wa = w ? 지금 3천원 이상 금액 : 그대로. 3천원 이상 0회면 0원을 옮겨야 결과가 같다(예전엔 30,000원으로 바뀜)
{
  const s: State = { ...DEFAULT, w: true, wn: 0 }
  const u = usageOf(s)
  assert.equal(u.wide, 0)
  const amt: State = { ...s, m: 'amt', a: u.total, t: u.trips, wa: s.w ? u.wide : s.wa }
  assert.deepEqual(refunds(usageOf(amt), 'seoul', 'general'), refunds(u, 'seoul', 'general'))
}

// ── 유형별
assert.equal(refunds(U(68_200, 44), 'seoul', 'youth').by.basic, 20_460, '30%')
assert.equal(refunds(U(68_200, 44), 'seoul', 'youth').by.general, 13_200, '68,200 − 55,000')
assert.equal(refunds(U(100_000, 40), 'seoul', 'low').by.basic, 53_300, '53.3%')
assert.equal(refunds(U(100_000, 40), 'seoul', 'low').best, 'general', '100,000 − 45,000 = 55,000 > 53,300')
assert.equal(refunds(U(96_000, 40), 'seoul', 'low').best, 'basic', '51,168 > 51,000')
// 저소득 손익분기 45,000 ÷ 0.467 = 96,359.7 → 96,360
assert.deepEqual(breakeven(U(60_000, 40), 'seoul', 'low'), { amount: 96_360, method: 'general' })
assert.equal(refunds(U(96_360, 40), 'seoul', 'low').best, 'general', '51,359 < 51,360')
assert.equal(refunds(U(96_359, 40), 'seoul', 'low').best, 'basic', '51,359 = 51,359 동률')
assert.deepEqual(refunds(U(100_000, 40), 'local', 'kids3').by, { basic: 50_000, general: 60_000, plus: 25_000 })
assert.equal(refunds(U(50_000, 30), 'special', 'senior').by.general, 10_000, '50,000 − 40,000')
assert.equal(refunds(U(36_350, 30), 'seoul', 'low').by.basic, 19_374, '36,350 × 0.533 = 19,374.55 내림')

// ── 시차 출퇴근(+30%p): 44회 중 22회 → 68,200 × 1/2 × 30% = 10,230 추가
{
  const u = U(68_200, 44, 0, 22)
  assert.equal(refunds(u, 'seoul', 'general').by.basic, 23_870)
  assert.equal(refunds(u, 'seoul', 'general', false).by.basic, 13_640, '기간이 끝나면 추가 없음')
  // 손익분기: 환급률 0.2 + 0.15 = 0.35 → 62,000 ÷ 0.65 = 95,384.6 → 95,385
  assert.deepEqual(breakeven(u, 'seoul', 'general'), { amount: 95_385, method: 'general' })
  assert.deepEqual(breakeven(u, 'seoul', 'general', false), { amount: 77_501, method: 'general' })
  // 시차 횟수가 통행 수보다 많아도 통행 수까지만
  assert.equal(refunds(U(68_200, 44, 0, 99), 'seoul', 'general').by.basic, 13_640 + 20_460)
}

// ── 금액 입력 모드: 3천원 이상 금액은 전체를 넘지 않는다
assert.deepEqual(usageOf({ ...DEFAULT, m: 'amt', a: 120_000, t: 50, w: true, wa: 200_000 }), { total: 120_000, wide: 120_000, trips: 50, offpeak: 0 })
assert.deepEqual(usageOf({ ...DEFAULT, m: 'amt', a: 120_000, t: 50, w: false, wa: 50_000 }), { total: 120_000, wide: 0, trips: 50, offpeak: 0 })
assert.deepEqual(usageOf({ ...DEFAULT, o: 50 }), { total: 68_200, wide: 0, trips: 44, offpeak: 44 })
// 이용이 0이면 환급 0
assert.deepEqual(refunds(U(0, 0), 'seoul', 'general').by, { basic: 0, general: 0, plus: 0 })

// ── URL
{
  const back = (s: State) => { const p = new URLSearchParams(toQuery(s)); return parseState((k) => p.get(k)) }
  assert.equal(toQuery(DEFAULT), '', '기본값이면 쿼리 없음')
  assert.deepEqual(parseState(() => null), DEFAULT)
  const a: State = { ...DEFAULT, n: 60, r: 'metro', g: 'youth' }
  assert.equal(toQuery(a), 'n=60&r=metro&g=youth')
  assert.deepEqual(back(a), a)
  const b: State = { ...DEFAULT, m: 'amt', a: 95_000, t: 50, o: 10 }
  assert.equal(toQuery(b), 'm=amt&a=95000&t=50&o=10')
  assert.deepEqual(back(b), b)
  const c: State = { ...DEFAULT, w: true, wf: 3_200, wn: 40, g: 'low', r: 'special' }
  assert.equal(toQuery(c), 'w=1&wf=3200&wn=40&r=special&g=low')
  assert.deepEqual(back(c), c)
  const d: State = { ...DEFAULT, m: 'amt', w: true, wa: 45_000 }
  assert.equal(toQuery(d), 'm=amt&w=1&wa=45000')
  assert.deepEqual(back(d), d)
  // 지금 모드에서 안 쓰는 값은 쿼리에 넣지 않는다
  assert.equal(toQuery({ ...DEFAULT, a: 99_000, wf: 4_000 }), '')
  for (const r of REGIONS) for (const g of GROUPS) assert.deepEqual(back({ ...DEFAULT, r, g }), { ...DEFAULT, r, g })
  // 틀린 값은 기본값: 3천원 이상은 '3천원 미만 요금' 칸에 못 온다, 소수 횟수, 모르는 지역·유형
  const bad = new URLSearchParams('m=x&f=3000&n=12.5&wf=2999&wn=-1&a=abc&t=301&o=1e9&r=busan&g=vip&w=yes')
  assert.deepEqual(parseState((k) => bad.get(k)), DEFAULT)
  const edge = new URLSearchParams('f=100&n=300&wf=30000&w=1&wn=0')
  assert.deepEqual(parseState((k) => edge.get(k)), { ...DEFAULT, f: 100, n: 300, wf: 30_000, w: true, wn: 0 })
}

console.log('check-transit-pass: all passed')
