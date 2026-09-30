// 콜라주 레이아웃/변환 로직 회귀 체크: node scripts/check-collage.ts
import assert from 'node:assert/strict'
import { LAYOUTS, getLayout, layoutForCount, cellRects, hitTest, coverPlacement, panBy, zoomTo, canvasSize, isDark, FIT } from '../src/utils/collage.ts'

const near = (a: number, b: number, msg: string) => assert.ok(Math.abs(a - b) < 1e-6, `${msg}: ${a} != ${b}`)

// 레이아웃 수·id 중복·사진 수 범위
assert.ok(LAYOUTS.length >= 16, 'layout count')
assert.equal(new Set(LAYOUTS.map((l) => l.id)).size, LAYOUTS.length, 'unique ids')
for (let n = 2; n <= 9; n++) assert.ok(LAYOUTS.some((l) => l.n === n), `layout for ${n}`)

// 모든 레이아웃: 칸이 겹치지 않고, 격자를 빈틈없이 덮음 (면적 합 = 전체)
for (const l of LAYOUTS) {
  const occ = new Set<string>()
  for (const [c, r, cs = 1, rs = 1] of l.cells) {
    for (let i = c; i < c + cs; i++) for (let j = r; j < r + rs; j++) {
      assert.ok(i < l.cols && j < l.rows, `${l.id} in bounds`)
      assert.ok(!occ.has(`${i},${j}`), `${l.id} overlap at ${i},${j}`)
      occ.add(`${i},${j}`)
    }
  }
  assert.equal(occ.size, l.cols * l.rows, `${l.id} full cover`)
}

// 사진 수 → 기본 레이아웃
for (let n = 1; n <= 9; n++) assert.equal(layoutForCount(n).n, n, `auto ${n}`)
assert.equal(layoutForCount(15).id, 'g9')
assert.equal(layoutForCount(0).id, 'g4')
assert.equal(getLayout('nope').id, 'g4')

// 2x2, 1000x1000, gap 10 → 칸 485, 바깥/사이 모두 10
const g4 = cellRects(getLayout('g4'), 1000, 1000, 10)
assert.deepEqual(g4[0], { x: 10, y: 10, w: 485, h: 485 })
near(g4[1].x - (g4[0].x + g4[0].w), 10, 'inner gap x')
near(1000 - (g4[3].x + g4[3].w), 10, 'outer gap right')
near(1000 - (g4[3].y + g4[3].h), 10, 'outer gap bottom')

// gap 0 → 정확히 반씩
assert.deepEqual(cellRects(getLayout('h2'), 800, 400, 0), [{ x: 0, y: 0, w: 400, h: 400 }, { x: 400, y: 0, w: 400, h: 400 }])

// 큰 칸 1 + 작은 칸: 큰 칸은 작은 칸 2개 + 사이 gap 과 같은 높이
const l1r2 = cellRects(getLayout('l1r2'), 900, 900, 20)
near(l1r2[0].h, l1r2[1].h + l1r2[2].h + 20, 'span includes gap')
near(l1r2[0].y + l1r2[0].h, l1r2[2].y + l1r2[2].h, 'bottom aligned')

// 하단 문구 영역: 사진 칸의 아래 끝 = H - footer
const strip = cellRects(getLayout('strip4'), 600, 1800, 12, 200)
near(strip[3].y + strip[3].h, 1600, 'footer reserved')
near(strip[0].y, 12, 'top gap')
near(strip[1].y - (strip[0].y + strip[0].h), 12, 'strip inner gap')

// 모든 레이아웃 × 여러 크기: 칸이 캔버스 안, 넓이 > 0
for (const l of LAYOUTS) for (const [W, H] of [[1080, 1080], [1080, 1920], [1920, 1080], [720, 2160]]) {
  for (const r of cellRects(l, W, H, 16, 150)) {
    assert.ok(r.w > 0 && r.h > 0 && r.x >= 0 && r.y >= 0 && r.x + r.w <= W + 1e-6 && r.y + r.h <= H - 150 + 1e-6, `${l.id} ${W}x${H}`)
  }
}

assert.equal(hitTest(g4, 600, 600), 3)
assert.equal(hitTest(g4, 5, 5), -1) // 테두리 gap

// cover-fit: 가로 사진 2000x1000 → 500x500 칸, 가운데 크롭
let p = coverPlacement(2000, 1000, 500, 500, FIT)
near(p.dw, 1000, 'cover w'); near(p.dh, 500, 'cover h'); near(p.dx, -250, 'center x'); near(p.dy, 0, 'no y overflow')
// 확대 2배 → 칸은 여전히 덮음
p = coverPlacement(2000, 1000, 500, 500, { z: 2, fx: 0, fy: 1 })
near(p.dx, 0, 'fx 0 → left edge'); near(p.dy, 500 - 1000, 'fy 1 → bottom edge')
// z 범위 밖 → clamp
near(coverPlacement(100, 100, 100, 100, { z: 0.2, fx: 0.5, fy: 0.5 }).dw, 100, 'z>=1')
near(coverPlacement(100, 100, 100, 100, { z: 99, fx: 0.5, fy: 0.5 }).dw, 500, 'z<=5')

// pan: 넘치는 500px 중 오른쪽으로 250 끌면 fx 0.5 → 0 (왼쪽 가장자리 보임)
let t = panBy(FIT, 250, 100, 2000, 1000, 500, 500)
near(t.fx, 0, 'pan x'); near(t.fy, 0.5, 'no y overflow → center')
t = panBy(t, 10000, 0, 2000, 1000, 500, 500)
near(t.fx, 0, 'pan clamp low')
t = panBy(t, -10000, 0, 2000, 1000, 500, 500)
near(t.fx, 1, 'pan clamp high')
// 어느 위치든 그린 이미지는 칸을 덮음
for (const fx of [0, 0.3, 1]) for (const z of [1, 1.7, 5]) {
  const q = coverPlacement(1200, 1600, 400, 250, { z, fx, fy: 1 - fx })
  assert.ok(q.dx <= 1e-9 && q.dy <= 1e-9 && q.dx + q.dw >= 400 - 1e-9 && q.dy + q.dh >= 250 - 1e-9, 'covers')
}
assert.equal(zoomTo(FIT, 0.5).z, 1)
assert.equal(zoomTo(FIT, 7).z, 5)

assert.deepEqual(canvasSize(1, 2160), { w: 2160, h: 2160 })
assert.deepEqual(canvasSize(4 / 5, 2160), { w: 1728, h: 2160 })
assert.deepEqual(canvasSize(9 / 16, 2160), { w: 1215, h: 2160 })
assert.deepEqual(canvasSize(16 / 9, 2160), { w: 2160, h: 1215 })
assert.deepEqual(canvasSize(NaN, 1000), { w: 1000, h: 1000 })

assert.equal(isDark('#000000'), true)
assert.equal(isDark('#ffffff'), false)
assert.equal(isDark('bad'), false)

console.log(`check-collage OK (${LAYOUTS.length} layouts)`)
