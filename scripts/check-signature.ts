// 서명 헬퍼 회귀 체크: node scripts/check-signature.ts
import assert from 'node:assert/strict'
import { dedupe, strokeWidths, segments, strokesBounds, strokesSvg, alphaBounds, hasHangul, parseSaved, W_MIN, W_MAX, type Pt, type Stroke } from '../src/utils/signature.ts'

const line = (n: number, step: number, dt: number): Pt[] => Array.from({ length: n }, (_, i) => ({ x: i * step, y: 0, t: i * dt }))

// dedupe: 가까운 점 제거, 끝점 유지
const dd = dedupe([{ x: 0, y: 0, t: 0 }, { x: 0.2, y: 0, t: 1 }, { x: 5, y: 0, t: 2 }, { x: 5.1, y: 0, t: 3 }, { x: 10, y: 0, t: 4 }])
assert.deepEqual(dd.map(p => p.x), [0, 5, 10])

// 속도 기반 굵기: 느린 획이 빠른 획보다 굵고, 범위 안
const slow = strokeWidths(line(20, 1, 16), 4)   // 0.06 px/ms
const fast = strokeWidths(line(20, 40, 16), 4)  // 2.5 px/ms
assert.ok(slow[19] > fast[19] * 2, `slow ${slow[19]} vs fast ${fast[19]}`)
for (const w of [...slow, ...fast]) assert.ok(w >= 4 * W_MIN - 1e-9 && w <= 4 * W_MAX + 1e-9, `width ${w}`)
// 펜 필압: 세게 누르면 굵게
const pr = (p: number) => strokeWidths(line(10, 2, 16).map(q => ({ ...q, p })), 4).at(-1)!
assert.ok(pr(1) > pr(0.2), 'pressure')
// dt=0 (같은 타임스탬프) 이어도 NaN/Infinity 없음
assert.ok(strokeWidths(line(5, 3, 0), 3).every(Number.isFinite))

// Catmull-Rom: 구간 끝점이 입력 점을 지나고, 직선 입력이면 제어점도 직선 위
const zig: Stroke = { pts: [{ x: 0, y: 0, t: 0 }, { x: 10, y: 10, t: 10 }, { x: 20, y: 0, t: 20 }, { x: 30, y: 10, t: 30 }], color: '#000', size: 3 }
const segs = segments(zig)
assert.equal(segs.length, 3)
segs.forEach((g, i) => {
  assert.deepEqual([g.x0, g.y0], [zig.pts[i].x, zig.pts[i].y])
  assert.deepEqual([g.x1, g.y1], [zig.pts[i + 1].x, zig.pts[i + 1].y])
  if (i > 0) assert.deepEqual([g.x0, g.y0], [segs[i - 1].x1, segs[i - 1].y1], 'continuous')
})
// C1 연속: 이음점 양쪽 접선 방향 동일
const g0 = segs[0], g1 = segs[1]
const cross = (g0.x1 - g0.c2x) * (g1.c1y - g1.y0) - (g0.y1 - g0.c2y) * (g1.c1x - g1.x0)
assert.ok(Math.abs(cross) < 1e-9, 'tangent continuity')
for (const g of segments({ pts: line(5, 10, 10), color: '#000', size: 2 })) assert.equal(g.c1y, 0), assert.equal(g.c2y, 0)
assert.equal(segments({ pts: [{ x: 1, y: 1, t: 0 }], color: '#000', size: 2 }).length, 0)

// 경계: 획 굵기 절반 포함, 점(탭)도 포함, 비었으면 null
assert.equal(strokesBounds([]), null)
const b = strokesBounds([{ pts: line(11, 10, 50), color: '#000', size: 4 }])!
assert.ok(b.x < 0 && b.x > -4 && b.w > 100 && b.w < 108 && b.h > 0 && b.h < 8, JSON.stringify(b))
const dot = strokesBounds([{ pts: [{ x: 50, y: 50, t: 0 }], color: '#000', size: 5 }])!
assert.deepEqual(dot, { x: 47, y: 47, w: 6, h: 6 })

// SVG: 경계 기준 좌표(음수 없음), 색 유지, 점은 circle
assert.equal(strokesSvg([]), null)
const svg = strokesSvg([zig, { pts: [{ x: 50, y: 50, t: 0 }], color: '#1d3fae', size: 4 }], 10)!
assert.ok(svg.startsWith('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 '))
assert.ok(svg.includes('<path d="M') && svg.includes('stroke="#000"') && svg.includes('<circle') && svg.includes('fill="#1d3fae"'))
assert.ok(!/[ MC]-\d/.test(svg), 'no negative coords')
const vb = svg.match(/viewBox="0 0 ([\d.]+) ([\d.]+)"/)!
assert.ok(Number(vb[1]) > 50 && Number(vb[2]) > 50)

// 알파 트림
const W = 6, H = 4, px = new Uint8ClampedArray(W * H * 4)
assert.equal(alphaBounds(px, W, H), null)
const setA = (x: number, y: number, a: number) => { px[(y * W + x) * 4 + 3] = a }
setA(2, 1, 255); setA(4, 2, 200); setA(0, 3, 3) // 마지막은 threshold 이하 → 무시
assert.deepEqual(alphaBounds(px, W, H), { x: 2, y: 1, w: 3, h: 2 })
assert.deepEqual(alphaBounds(px, W, H, 0), { x: 0, y: 1, w: 5, h: 3 })

// 한글 감지
assert.ok(hasHangul('홍길동') && hasHangul('Kim 민수') && hasHangul('ㅎㅎ'))
assert.ok(!hasHangul('John Smith') && !hasHangul(''))

// 저장 목록 파싱: 깨진 JSON·잘못된 항목 제거, 최대 5개
assert.deepEqual(parseSaved(null), [])
assert.deepEqual(parseSaved('{bad'), [])
assert.deepEqual(parseSaved('{"a":1}'), [])
const ok = { id: 'a', png: 'data:image/png;base64,AA', at: 1 }
const list = parseSaved(JSON.stringify([ok, { id: 'b', png: 'javascript:alert(1)', at: 2 }, { ...ok, id: 'c', svg: '<svg/>' }, { ...ok, id: 'd', svg: 5 }, null, ...Array(6).fill(ok)]))
assert.deepEqual(list.map(x => x.id), ['a', 'c', 'a', 'a', 'a'])

console.log('check-signature: OK')
