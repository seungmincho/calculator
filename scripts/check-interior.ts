// 인테리어 자재 계산 회귀 체크: node scripts/check-interior.ts
import assert from 'node:assert/strict'
import {
  areas, room, dims, stripLength, stripsPerRoll, wallStrips, ceilingStrips, rollsFor, paintLiters, bestCans,
  vinylMeters, boxes, tileCount, sticks, calculate, encodeState, decodeState, PRESETS, DEFAULT_SETTINGS, type Settings,
} from '../src/utils/interior.ts'

const near = (a: number, b: number, eps = 1e-6) => assert.ok(Math.abs(a - b) < eps, `${a} ≈ ${b}`)

// 개구부 공제: 4×3×2.3 = 벽 32.2㎡, 문 0.9×2.1=1.89, 창 1.5×1.2=1.8
const r = room('t', 4, 3)
const a = areas(r)
near(a.floor, 12)
near(a.wallGross, 32.2)
near(a.openings, 3.69)
near(a.wallNet, 28.51)
near(a.doorWidth, 0.9)
// 공제가 벽보다 커도 음수 아님
assert.equal(areas(room('x', 1, 1, { extra: 100 })).wallNet, 0)
// 평수 모드: 면적 보존
near(areas(room('p', 0, 0, { mode: 'pyeong', pyeong: 5 })).floor, 5 * 400 / 121)
near(dims(room('p', 0, 0, { mode: 'pyeong', pyeong: 5 })).w / dims(room('p', 0, 0, { mode: 'pyeong', pyeong: 5 })).l, 1.25)

// 폭 길이: 무늬 없음 = 높이+0.1, 무늬 64cm → 2.4 → 4×0.64=2.56
near(stripLength(2.3, 0), 2.4)
near(stripLength(2.3, 0.64), 2.56)
near(stripLength(2.3, 0.6), 2.4) // 딱 맞으면 그대로
// 실크 15.6m: 무늬 없음 6폭, 64cm 반복 6폭(15.36), 1m 반복(3m 폭) 5폭
assert.equal(stripsPerRoll(15.6, 2.4), 6)
assert.equal(stripsPerRoll(15.6, 2.56), 6)
assert.equal(stripsPerRoll(15.6, stripLength(2.3, 1)), 5)
assert.equal(stripsPerRoll(12.5, 2.4), 5)
// 벽 폭 수: 28.51 / (1.06×2.3) = 11.69 → 12
assert.equal(wallStrips(28.51, 2.3, 1.06), 12)
assert.equal(wallStrips(0, 2.3, 1.06), 0)
// 천장 4×3: 긴변 4/1.06 → 4폭, 길이 3.1
assert.deepEqual(ceilingStrips(4, 3, 1.06), { count: 4, len: 3.1 })
// 롤 수: 12폭/6 = 2롤, 여유 5% → 2.1 → 3롤
assert.equal(rollsFor([{ strips: 12, len: 2.4 }], 15.6, 0), 2)
assert.equal(rollsFor([{ strips: 12, len: 2.4 }], 15.6, 0.05), 3)
// 무늬 반복 1m → 5폭/롤 → 12/5 = 2.4 → 3롤 (반복이 롤 수를 늘림)
assert.equal(rollsFor([{ strips: 12, len: stripLength(2.3, 1) }], 15.6, 0), 3)
// 방 사이 이어쓰기: 7폭 + 5폭 = 12/6 = 2롤
assert.equal(rollsFor([{ strips: 7, len: 2.4 }, { strips: 5, len: 2.4 }], 15.6, 0), 2)
assert.equal(rollsFor([{ strips: 1, len: 20 }], 15.6, 0), Infinity)

// 페인트: 50㎡ × 2회 / 10 = 10L, 여유 5% = 10.5
near(paintLiters(50, 2, 10, 0), 10)
near(paintLiters(50, 2, 10, 0.05), 10.5)
// 캔 조합 (가격 미입력 → 상대단가: 큰 통이 L당 저렴)
assert.deepEqual(bestCans(17).picks, [{ size: 18, count: 1 }])
assert.deepEqual(bestCans(5).picks, [{ size: 4, count: 1 }, { size: 1, count: 1 }])
assert.deepEqual(bestCans(3).picks, [{ size: 1, count: 3 }]) // 1L×3 (4.8) < 4L (5)
assert.deepEqual(bestCans(0).picks, [])
// 실가격: 18L 90,000 / 4L 28,000 / 1L 10,000 → 20L = 18+1+1 (110,000) vs 4×5 (140,000) vs 18+4 (118,000)
const c20 = bestCans(20, [18, 4, 1], [90000, 28000, 10000])
assert.deepEqual(c20.picks, [{ size: 18, count: 1 }, { size: 1, count: 2 }])
assert.equal(c20.cost, 110000)
// 18L가 비싸면 4L 조합 선택
assert.deepEqual(bestCans(16, [18, 4, 1], [200000, 28000, 10000]).picks, [{ size: 4, count: 4 }])
// 항상 필요량 이상
for (let n = 0.5; n < 60; n += 0.7) assert.ok(bestCans(n).liters >= n - 1e-6)

// 장판: 4×3 폭 1.8 → 세로방향 ceil(4/1.8)=3×3.1=9.3 vs ceil(3/1.8)=2×4.1=8.2 → 8.2m
near(vinylMeters(4, 3, 1.8), 8.2)
// 강마루: 12㎡×1.05/3.3 = 3.82 → 4박스
assert.equal(boxes(12, 3.3, 0.05), 4)
assert.equal(boxes(0, 3.3, 0.05), 0)
// 타일: 3.15㎡(2.1×1.5), 300×300 줄눈 3mm, 로스 10% → 3.465/0.091809 = 37.7 → 38장
assert.equal(tileCount(3.15, 300, 300, 3, 0.1), 38)
// 줄눈 0, 로스 0: 1㎡ / 0.09 = 11.1 → 12
assert.equal(tileCount(1, 300, 300, 0, 0), 12)
// 로스율이 장수를 늘림
assert.ok(tileCount(10, 600, 600, 2, 0.1) > tileCount(10, 600, 600, 2, 0.05))
// 걸레받이: 13.1m ×1.1 / 2.4 = 6.004 → 7본
assert.equal(sticks(13.1, 2.4, 0.1), 7)

// 전체 계산: 24평 프리셋 결과가 상식 범위
const t = calculate(PRESETS.apt24, DEFAULT_SETTINGS)
const line = (k: string) => t.lines.find((l) => l.key === k)
assert.ok(t.floor > 45 && t.floor < 60, `floor ${t.floor}`)
const paper = line('paper')!.qty
assert.ok(paper >= 15 && paper <= 30, `paper ${paper}`) // 실크 24평 벽+천장 대략 15~30롤
assert.ok(line('laminate')!.qty >= 14 && line('laminate')!.qty <= 18)
assert.ok(line('floorTile')!.qty > 0 && line('wallTile')!.qty > 0)
assert.equal(line('paint'), undefined) // 페인트 선택 방 없음
assert.equal(t.cost, 0)
assert.equal(t.partial, true)
// 가격 입력 → 총액 = 라인 합
const priced: Settings = { ...DEFAULT_SETTINGS, paperPrice: 40000, lamPrice: 60000 }
const tp = calculate(PRESETS.apt24, priced)
assert.equal(tp.cost, line('paper')!.qty * 40000 + line('laminate')!.qty * 60000)
// 욕실(벽 타일)은 걸레받이·몰딩 제외
const bathOnly = calculate([PRESETS.apt24[5]], DEFAULT_SETTINGS)
assert.equal(bathOnly.lines.find((l) => l.key === 'baseboard'), undefined)

// URL 왕복 + 잘못된 입력 방어
const rt = decodeState(encodeState(PRESETS.apt24, priced))!
assert.deepEqual(rt.rooms, PRESETS.apt24)
assert.deepEqual(rt.settings, priced)
assert.equal(decodeState('garbage!!'), null)
assert.equal(decodeState(null), null)
const evil = Buffer.from(JSON.stringify([1, [['x', 0, -5, 1e9, 3, 2.3, 1, 0.9, 2.1, 0, 1, 1, 0, 9, 9, 9]], { coats: 99, paper: 'hack' }])).toString('base64url')
const ev = decodeState(evil)!
assert.equal(ev.rooms[0].w, 3)
assert.equal(ev.rooms[0].l, 3)
assert.equal(ev.rooms[0].wall, 'wallpaper')
assert.equal(ev.settings.coats, 2)
assert.equal(ev.settings.paper, 'silk')

console.log('interior OK', { floor: t.floor.toFixed(1), lines: t.lines.map((l) => `${l.key}:${l.qty}`).join(' ') })
