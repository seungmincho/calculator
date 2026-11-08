// 난방기구 전기세 계산기(/heater-electricity-cost) 회귀 체크: node scripts/check-heater-electricity-cost.ts
// page.tsx 본문·FAQ 숫자는 EXAMPLES·compare로 렌더링되므로 여기서 값을 고정한다.
import assert from 'node:assert/strict'
import { calcBill } from '../src/utils/electricityBill.ts'
import { analyze, compare, extraCost, tierTip, optsOf, device, EXAMPLES, DEFAULTS, SIM_HOURS, KINDS } from '../src/utils/heaterElectricityCost.ts'

const winter = optsOf(1, 'low')

// ── 증분 요금 = calcBill(평소 + 추가) − calcBill(평소) (결정적 난수 2,000건, 계절·전압 섞어서) ──
let seed = 7
const rnd = (n: number) => (seed = (seed * 1_103_515_245 + 12_345) % 2 ** 31) % n
for (let i = 0; i < 2000; i++) {
  const base = rnd(900)
  const o = optsOf(1 + rnd(12), rnd(2) ? 'high' : 'low')
  const devices = Array.from({ length: rnd(4) }, () => ({ kind: KINDS[rnd(KINDS.length)], watt: rnd(3000), hours: rnd(49) / 2, days: rnd(32) }))
  const r = analyze({ base, month: o.month!, voltage: o.voltage!, devices })
  const kwh = devices.reduce((s, d) => s + (d.watt * d.hours * d.days) / 1000, 0)
  assert.equal(r.extra, calcBill(base + kwh, o).total - calcBill(base, o).total, JSON.stringify({ base, devices }))
  assert.ok(r.extra >= 0)
  assert.ok(Math.abs(r.rows.reduce((s, x) => s + x.cost, 0) - (devices.length && kwh > 0 ? r.extra : 0)) < 1e-6) // 기구별 몫 합 = 증분
}

// ── 기본값 손계산 (동계, 주택용 저압) ──
// 평소 280kWh: 기본 1,600 + 전력량 200×120 + 80×214.6 = 41,168 + 기후 2,520 + 연료 1,400 = 46,688 → 부가세 4,669 · 기금 1,260 → 52,610
// 난방 48 + 120 = 168kWh → 448kWh: 기본 7,300 + 24,000 + 42,920 + 48×307.3(14,750.4) = 81,670 + 4,032 + 2,240 = 95,242 → 9,524 · 2,570 → 107,330
{
  const r = analyze(DEFAULTS)
  assert.deepEqual([r.kwh, r.before.total, r.before.tier, r.after.kwh, r.after.total, r.after.tier, r.extra, r.days], [168, 52_610, 2, 448, 107_330, 3, 54_720, 30])
  assert.deepEqual(r.rows.map((x) => [x.kind, x.kwh, Math.round(x.cost)]), [['mat', 48, 15_634], ['fanHeater', 120, 39_086]])
  // 400kWh 경계를 48kWh 넘음 → 400kWh 요금 83,530 (66,920 + 1,600 + 3,600 + 2,000 = 74,120 → 7,412 · 2,000) → 23,800원 절약
  assert.deepEqual(r.tip, { kind: 'above', tier: 3, over: 48, save: 23_800 })
  assert.equal(r.top?.kind, 'fanHeater')
  assert.ok(Math.abs(r.cutHours! - 0.8) < 1e-9) // 48kWh ÷ (2kW × 30일) = 하루 0.8시간
  assert.equal(Math.round(r.perDay), 1824)
}

// ── 동계 구간 경계 ──
// 전기장판만 8시간: 328kWh, 2구간 그대로 — 1,600 + 24,000 + 128×214.6(27,468.8) = 51,468 + 2,952 + 1,640 = 57,660 → 5,766 · 1,550 → 64,970
{ const r = analyze(EXAMPLES.mat); assert.deepEqual([r.after.kwh, r.after.tier, r.after.total, r.extra, r.tip], [328, 2, 64_970, 12_360, null]) }
// 평소 150kWh(1구간) + 300kWh → 450kWh: 두 경계를 넘어도 안내는 가장 높은 400kWh 경계 기준
{ const r = analyze({ ...DEFAULTS, base: 150, devices: [{ kind: 'stove', watt: 1000, hours: 10, days: 30 }] }); assert.deepEqual([r.before.tier, r.after.tier, r.tip?.kind, r.tip?.tier, r.tip && 'over' in r.tip ? r.tip.over : 0], [1, 3, 'above', 3, 50]) }
// 평소 180kWh + 전기장판 → 228kWh: 200kWh 경계를 넘김
{ const r = analyze({ ...DEFAULTS, base: 180, devices: [device('mat', 8)] }); assert.deepEqual(r.tip, { kind: 'above', tier: 2, over: 28, save: calcBill(228, winter).total - calcBill(200, winter).total }) }
// 평소가 이미 400kWh 넘음(410) → 난방이 넘긴 경계 없음, 전기요금 계산기와 같은 30kWh 안내
assert.deepEqual(tierTip(410, 420, winter), { kind: 'above', tier: 3, over: 20, save: calcBill(420, winter).total - calcBill(400, winter).total })
assert.equal(tierTip(410, 448, winter), null)
// 경계 직전: 380kWh → 400까지 20kWh 남음
assert.deepEqual(tierTip(300, 380, winter), { kind: 'below', tier: 3, left: 20 })
// 같은 448kWh라도 여름(7~8월 구간 300·450kWh)은 2구간
{ const r = analyze({ ...DEFAULTS, month: 7 }); assert.deepEqual([r.after.kwh, r.after.tier, r.o.season], [448, 2, 'summer']) }
// 동계 1,000kWh 초과 = 슈퍼유저 (라디에이터 2kW 하루 12시간 = 720kWh)
{ const r = analyze({ ...DEFAULTS, devices: [device('radiator', 12)] }); assert.deepEqual([r.after.kwh, r.after.isSuper], [1000, false]) }
// 13시간 = 780kWh → 1,060kWh 슈퍼유저. 400kWh 경계까지 660kWh = 라디에이터 하루 11시간
{ const r = analyze({ ...DEFAULTS, devices: [device('radiator', 13)] }); assert.deepEqual([r.after.kwh, r.after.isSuper, r.tip?.kind, r.cutHours], [1060, true, 'above', 11]) }
// 기구 없음
{ const r = analyze({ ...DEFAULTS, devices: [] }); assert.deepEqual([r.kwh, r.extra, r.days, r.perDay, r.top, r.cutHours], [0, 0, 0, 0, null, null]) }

// ── 같은 시간 비교 (평소 280kWh, 1월, 하루 4시간 × 30일) ──
{
  const c = compare(DEFAULTS.base, SIM_HOURS, winter)
  const by = Object.fromEntries(c.map((x) => [x.kind, x]))
  // 온풍기 240kWh → 520kWh: 7,300 + 24,000 + 42,920 + 120×307.3(36,876) = 103,796 + 4,680 + 2,600 = 118,376 → 11,838 · 3,190 → 133,400
  assert.deepEqual([by.fanHeater.kwh, by.fanHeater.extra], [240, 133_400 - 52_610])
  assert.equal(by.mat.extra, extraCost(280, 24, winter))
  assert.ok(c.every((x) => x.extra === calcBill(280 + x.kwh, winter).total - 52_610))
  assert.deepEqual(c.map((x) => x.kind), [...KINDS])
}

console.log('check-heater-electricity-cost OK')
