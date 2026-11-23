// node scripts/check-traffic-fine.ts (Node 24) — 범칙금·과태료·벌점·보호구역 가중·감경·누적 벌점·URL 회귀 체크
// 기대값은 도로교통법 시행령 별표 6·7·8·10, 시행규칙 별표 28·39 원문에서 손으로 옮겼다(원 단위)
import assert from 'node:assert/strict'
import {
  calc, finePlan, verdict, parseState, toQuery, inputOf, speedBand, zoneApplies,
  DEFAULT, VIDS, RULES, type Input, type State,
} from '../src/utils/trafficFine.ts'

const base: Input = { v: 'speed', veh: 'car', zone: 'none', hours: true, over: 25, twoHour: false }
const r = (p: Partial<Input>) => { const x = calc({ ...base, ...p }); assert.ok(x, JSON.stringify(p)); return x }
const money = (p: Partial<Input>) => { const x = r(p); return [x.fine, x.penalty, x.penaltyCut, x.points] }

// ── 속도 구간
assert.equal(speedBand(0), null)
assert.equal(speedBand(-5), null)
assert.equal(speedBand(1), 'b20')
assert.equal(speedBand(20), 'b20')
assert.equal(speedBand(21), 'b40')
assert.equal(speedBand(40), 'b40')
assert.equal(speedBand(41), 'b60')
assert.equal(speedBand(60), 'b60')
assert.equal(speedBand(61), 'b80')
assert.equal(speedBand(80), 'b80')
assert.equal(speedBand(81), 'b100')
assert.equal(speedBand(100), 'b100')
assert.equal(speedBand(101), 'b100p')
assert.equal(calc({ ...base, over: 0 }), null, '초과 없음')

// ── 속도위반 일반: [범칙금, 과태료, 자진납부, 벌점]
assert.deepEqual(money({}), [60000, 70000, null, 15], '기본: 승용 25km/h 초과')
assert.deepEqual(money({ veh: 'van' }), [70000, 80000, null, 15])
assert.deepEqual(money({ veh: 'moto' }), [40000, 50000, null, 15])
assert.deepEqual(money({ over: 20 }), [30000, 40000, 32000, 0], '20 이하: 벌점 없음, 과태료 20% 감경(별표 39 제10호)')
assert.deepEqual(money({ over: 5, veh: 'moto' }), [20000, 30000, 24000, 0])
assert.deepEqual(money({ over: 5, veh: 'van' }), [30000, 40000, 32000, 0])
assert.deepEqual(money({ over: 41 }), [90000, 100000, null, 30])
assert.deepEqual(money({ over: 60, veh: 'van' }), [100000, 110000, null, 30])
assert.deepEqual(money({ over: 61 }), [120000, 130000, null, 60])
assert.deepEqual(money({ over: 80, veh: 'van' }), [130000, 140000, null, 60])
assert.deepEqual(money({ over: 80, veh: 'moto' }), [80000, 90000, null, 60])
assert.equal(r({ over: 80 }).crime, null)
// 80 초과는 범칙금이 아니라 형사처벌. 무인 과태료는 60 초과 칸
{
  const a = r({ over: 81 })
  assert.deepEqual([a.fine, a.penalty, a.points, a.crime], [null, 130000, 80, 'over80'])
  const b = r({ over: 101 })
  assert.deepEqual([b.fine, b.penalty, b.points, b.crime], [null, 130000, 100, 'over100'])
  assert.equal(r({ over: 100 }).crime, 'over80')
}

// ── 속도위반 보호구역(오전 8시~오후 8시): 범칙금 별표 10, 과태료 별표 7, 벌점 별표 28 주4
assert.deepEqual(money({ zone: 'child' }), [90000, 100000, null, 30], '20~40: 벌점 2배')
assert.deepEqual(money({ zone: 'elder' }), [90000, 100000, null, 30])
assert.deepEqual(money({ zone: 'child', over: 15 }), [60000, 70000, 56000, 15], '어린이보호구역 20 이내 15점(제15호의2)')
assert.deepEqual(money({ zone: 'elder', over: 15 }), [60000, 70000, 56000, 0], '노인보호구역 20 이내는 벌점 없음')
assert.deepEqual(money({ zone: 'child', over: 15, veh: 'moto' }), [40000, 50000, 40000, 15])
assert.deepEqual(money({ zone: 'child', over: 50 }), [120000, 130000, null, 60])
assert.deepEqual(money({ zone: 'child', over: 70 }), [150000, 160000, null, 120])
assert.deepEqual(money({ zone: 'child', over: 70, veh: 'van' }), [160000, 170000, null, 120])
assert.deepEqual(money({ zone: 'child', over: 70, veh: 'moto' }), [100000, 110000, null, 120])
{
  const z = r({ zone: 'child', over: 90 })
  assert.deepEqual([z.fine, z.penalty, z.points, z.crime], [null, 160000, 120, 'over80'])
  assert.equal(r({ zone: 'elder', over: 120 }).points, 120)
}
// 시간 밖이면 일반 기준
assert.deepEqual(money({ zone: 'child', hours: false }), [60000, 70000, null, 15])
assert.equal(r({ zone: 'child', hours: false }).zoneOn, false)
assert.equal(r({ zone: 'child' }).zoneOn, true)

// ── 그 밖의 위반(승용)
assert.deepEqual(money({ v: 'signal' }), [60000, 70000, null, 15])
assert.deepEqual(money({ v: 'signal', veh: 'van' }), [70000, 80000, null, 15])
assert.deepEqual(money({ v: 'signal', zone: 'child' }), [120000, 130000, null, 30])
assert.deepEqual(money({ v: 'signal', zone: 'elder', veh: 'van' }), [130000, 140000, null, 30])
assert.deepEqual(money({ v: 'signal', zone: 'child', veh: 'moto' }), [80000, 90000, null, 30])
assert.deepEqual(money({ v: 'centerline' }), [60000, 90000, null, 30])
assert.deepEqual(money({ v: 'centerline', zone: 'child' }), [60000, 90000, null, 30], '중앙선은 보호구역 가중 없음')
assert.deepEqual(money({ v: 'crosswalk' }), [60000, 70000, null, 10])
assert.deepEqual(money({ v: 'crosswalk', zone: 'child' }), [120000, 70000, null, 20], '과태료는 별표 7 대상 아님')
assert.deepEqual(money({ v: 'intersection' }), [40000, 50000, null, 0])
assert.deepEqual(money({ v: 'intersection', veh: 'van' }), [50000, 60000, null, 0])
assert.deepEqual(money({ v: 'cutIn' }), [30000, 40000, null, 0])
assert.deepEqual(money({ v: 'cutIn', veh: 'moto' }), [20000, 30000, null, 0])
assert.deepEqual(money({ v: 'solidLine' }), [30000, 40000, null, 10])
assert.deepEqual(money({ v: 'distance' }), [20000, null, null, 10])
assert.equal(r({ v: 'distance' }).fineHw, 40000)
assert.equal(r({ v: 'distance', veh: 'van' }).fineHw, 50000)
assert.deepEqual([r({ v: 'distance', veh: 'moto' }).fine, r({ v: 'distance', veh: 'moto' }).fineHw], [10000, 30000])
assert.equal(r({ v: 'signal' }).fineHw, null)
assert.deepEqual(money({ v: 'phone' }), [60000, 70000, null, 15])
assert.deepEqual(money({ v: 'belt' }), [30000, null, null, 0])
assert.deepEqual(money({ v: 'belt', veh: 'moto' }), [20000, 30000, null, 0])
assert.deepEqual(money({ v: 'shoulder' }), [60000, 90000, null, 30])
assert.deepEqual(money({ v: 'shoulder', veh: 'moto' }), [40000, 70000, null, 30])
assert.deepEqual(money({ v: 'overtake' }), [60000, 70000, null, 15])

// ── 주정차(벌점 없음, 과태료 20% 감경, 2시간 이상 +1만원)
assert.deepEqual(money({ v: 'parking' }), [40000, 40000, 32000, 0])
assert.deepEqual(money({ v: 'parking', twoHour: true }), [40000, 50000, 40000, 0])
assert.deepEqual(money({ v: 'parking', veh: 'van', twoHour: true }), [50000, 60000, 48000, 0])
assert.deepEqual(money({ v: 'parking', veh: 'moto' }), [30000, null, null, 0], '이륜 주정차 과태료 기준 없음')
assert.deepEqual(money({ v: 'parking', zone: 'child' }), [120000, 120000, 96000, 0])
assert.deepEqual(money({ v: 'parking', zone: 'child', twoHour: true }), [120000, 130000, 104000, 0])
assert.deepEqual(money({ v: 'parking', zone: 'child', veh: 'van', twoHour: true }), [130000, 140000, 112000, 0])
assert.deepEqual(money({ v: 'parking', zone: 'child', veh: 'moto' }), [90000, null, null, 0])
assert.deepEqual(money({ v: 'parking', zone: 'elder' }), [80000, 80000, 64000, 0])
assert.deepEqual(money({ v: 'parking', zone: 'elder', twoHour: true }), [80000, 90000, 72000, 0])
assert.deepEqual(money({ v: 'parking', zone: 'elder', veh: 'moto' }), [60000, null, null, 0])
assert.deepEqual(money({ v: 'parking', zone: 'child', hours: false }), [40000, 40000, 32000, 0])
assert.deepEqual(money({ v: 'hydrant' }), [80000, 80000, 64000, 0])
assert.deepEqual(money({ v: 'hydrant', twoHour: true, veh: 'van' }), [90000, 100000, 80000, 0])
assert.deepEqual(money({ v: 'hydrant', zone: 'child' }), [120000, 120000, 96000, 0])
assert.deepEqual(money({ v: 'signal', twoHour: true }), [60000, 70000, null, 15], '2시간 가산은 주정차만')

// 모든 위반·차종·구역에서 금액은 1만원 단위 양수 또는 null, 벌점은 0 이상
for (const v of VIDS) for (const veh of ['car', 'van', 'moto'] as const) for (const zone of ['none', 'child', 'elder'] as const) {
  for (const over of [5, 25, 45, 65, 85, 105]) {
    const x = calc({ v, veh, zone, hours: true, over, twoHour: true })
    assert.ok(x)
    for (const m of [x.fine, x.penalty, x.fineHw]) assert.ok(m === null || (m > 0 && m % 10000 === 0), `${v} ${veh} ${zone} ${over}: ${m}`)
    assert.ok(x.penaltyCut === null || (x.penalty !== null && x.penaltyCut === x.penalty * 0.8))
    assert.ok(x.points >= 0)
  }
}
assert.equal(zoneApplies('speed'), true)
assert.equal(zoneApplies('parking'), true)
assert.equal(zoneApplies('crosswalk'), true)
assert.equal(zoneApplies('centerline'), false)
assert.equal(zoneApplies('phone'), false)
assert.equal(Object.keys(RULES).length + 1, VIDS.length)

// ── 범칙금 납부 단계: 10일 안 원금, 20일 안 +20%, 즉결심판 전 +50%
assert.deepEqual(finePlan(60000), { first: 60000, second: 72000, court: 90000 })
assert.deepEqual(finePlan(30000), { first: 30000, second: 36000, court: 45000 })

// ── 누적 벌점: 40점 정지(1점 1일), 1년 121점 취소
assert.deepEqual(verdict(0, 15), { total: 15, status: 'ok', days: 0, toSuspend: 25, toRevoke: 106 })
assert.deepEqual(verdict(24, 15), { total: 39, status: 'ok', days: 0, toSuspend: 1, toRevoke: 82 })
assert.deepEqual(verdict(25, 15), { total: 40, status: 'suspend', days: 40, toSuspend: 0, toRevoke: 81 })
assert.deepEqual(verdict(105, 15), { total: 120, status: 'suspend', days: 120, toSuspend: 0, toRevoke: 1 })
assert.deepEqual(verdict(106, 15), { total: 121, status: 'revoke', days: 0, toSuspend: 0, toRevoke: 0 })
assert.equal(verdict(0, 100).status, 'suspend', '한 번에 100점')
assert.equal(verdict(0, 120).days, 120)

// ── URL
{
  const back = (s: State) => { const p = new URLSearchParams(toQuery(s)); return parseState((k) => p.get(k)) }
  assert.equal(toQuery(DEFAULT), '', '기본값이면 쿼리 없음')
  assert.deepEqual(parseState(() => null), DEFAULT)
  assert.equal(inputOf(DEFAULT).over, 25)
  const a: State = { v: 'parking', veh: 'van', zone: 'child', hours: false, lim: 60, spd: 85, two: true, pts: 30 }
  assert.equal(toQuery(a), 'v=parking&c=van&z=child&h=0&t=1&p=30')
  assert.deepEqual(back(a), a)
  const b: State = { ...DEFAULT, lim: 30, spd: 52 }
  assert.equal(toQuery(b), 'l=30&s=52')
  assert.deepEqual(back(b), b)
  for (const v of VIDS) assert.deepEqual(back({ ...DEFAULT, v }), { ...DEFAULT, v })
  // 지금 화면에서 안 쓰는 값(숨은 속도·시간대·2시간)은 URL 에 남기지 않는다
  assert.equal(toQuery({ ...DEFAULT, v: 'signal', lim: 30, spd: 52, two: true }), 'v=signal')
  assert.equal(toQuery({ ...DEFAULT, hours: false }), '', '일반 도로면 시간대 체크는 안 쓴다')
  assert.equal(toQuery({ ...DEFAULT, v: 'hydrant', two: true }), 'v=hydrant&t=1')
  // 틀린 값은 기본값
  const bad = new URLSearchParams('v=foo&c=bus&z=x&l=5&s=999&p=-1&h=2&t=yes')
  assert.deepEqual(parseState((k) => bad.get(k)), DEFAULT)
  const frac = new URLSearchParams('l=30.5&s=1e2&p=401')
  assert.deepEqual(parseState((k) => frac.get(k)), DEFAULT)
  // 경계 허용
  const edge = new URLSearchParams('l=10&s=300&p=400')
  assert.deepEqual(parseState((k) => edge.get(k)), { ...DEFAULT, lim: 10, spd: 300, pts: 400 })
}

console.log('check-traffic-fine: all passed')
