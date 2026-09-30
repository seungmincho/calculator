// 이미지 모자이크 로직 회귀 체크: node scripts/check-image-mosaic.ts
import assert from 'node:assert/strict'
import {
  normalizeRect, pixelBounds, clientToImage, fitZoom, pixelate, boxBlur,
  hitTest, topRegionAt, moveRegion, handleAt, oppositeCorner, brushBounds, type Region,
} from '../src/utils/imageMosaic.ts'

// rect normalization: any drag direction → positive size
assert.deepEqual(normalizeRect({ x: 50, y: 40 }, { x: 10, y: 60 }), { x: 10, y: 40, w: 40, h: 20 })
assert.deepEqual(pixelBounds({ x: -5.5, y: 2.2, w: 20, h: 300 }, 100, 100), { x: 0, y: 2, w: 15, h: 98 })
assert.equal(pixelBounds({ x: 120, y: 0, w: 10, h: 10 }, 100, 100), null)

// coordinate transforms under zoom/scroll: 2000px image shown at 500px (zoom 0.25), scrolled so left=-300
const box = { left: -300, top: 20, width: 500, height: 250 }
assert.deepEqual(clientToImage(-300, 20, box, 2000, 1000), { x: 0, y: 0 })
assert.deepEqual(clientToImage(200, 270, box, 2000, 1000), { x: 2000, y: 1000 })
assert.deepEqual(clientToImage(-50, 145, box, 2000, 1000), { x: 1000, y: 500 })
// same image zoomed to 1 (4x): the pixel under a client point scales with the box, not the scroll
assert.deepEqual(clientToImage(100, 20, { left: -900, top: 20, width: 2000, height: 1000 }, 2000, 1000), { x: 1000, y: 0 })
assert.equal(fitZoom(2000, 1000, 800, 600), 0.4)
assert.equal(fitZoom(300, 200, 800, 600), 1) // never upscale

// pixelate: 4x2 RGBA, block 2 → two averaged cells
const px = new Uint8ClampedArray([
  0, 0, 0, 255, 100, 0, 0, 255, 10, 10, 10, 255, 10, 10, 10, 255,
  0, 0, 0, 255, 100, 0, 0, 255, 30, 30, 30, 255, 30, 30, 30, 255,
])
pixelate(px, 4, 2, 2)
assert.deepEqual([...px.slice(0, 4)], [50, 0, 0, 255])
assert.deepEqual([...px.slice(4, 8)], [50, 0, 0, 255])
assert.deepEqual([...px.slice(12, 16)], [20, 20, 20, 255])
assert.deepEqual([...px.slice(28, 32)], [20, 20, 20, 255])
// partial edge block (3 wide, block 2): last column averaged on its own
const edge = new Uint8ClampedArray([0, 0, 0, 0, 20, 20, 20, 20, 99, 99, 99, 99])
pixelate(edge, 3, 1, 2)
assert.deepEqual([...edge], [10, 10, 10, 10, 10, 10, 10, 10, 99, 99, 99, 99])

// blur: flat image stays flat (no fade at edges), a spike spreads out and keeps its mass
const flat = new Uint8ClampedArray(5 * 5 * 4).fill(200)
boxBlur(flat, 5, 5, 2)
assert.ok(flat.every((v) => v === 200))
const spike = new Uint8ClampedArray(9 * 1 * 4)
spike[4 * 4] = 255
boxBlur(spike, 9, 1, 1)
assert.ok(spike[4 * 4] < 255 && spike[3 * 4] > 0 && spike[5 * 4] > 0)

// hit testing + editing
const rect: Region = { id: 1, shape: 'rect', effect: 'black', strength: 10, x: 10, y: 10, w: 20, h: 10 }
const ell: Region = { id: 2, shape: 'ellipse', effect: 'blur', strength: 10, x: 0, y: 0, w: 40, h: 20 }
assert.ok(hitTest(rect, { x: 30, y: 20 }))
assert.ok(!hitTest(ell, { x: 1, y: 1 })) // bbox corner is outside the ellipse
assert.ok(hitTest(ell, { x: 20, y: 10 }))
assert.equal(topRegionAt([rect, ell], { x: 20, y: 12 })?.id, 2) // last drawn wins
const pts = [{ x: 0, y: 0 }, { x: 100, y: 0 }]
const brush: Region = { id: 3, shape: 'brush', effect: 'mosaic', strength: 10, ...brushBounds(pts, 5), points: pts, radius: 5 }
assert.deepEqual([brush.x, brush.y, brush.w, brush.h], [-5, -5, 110, 10])
assert.ok(hitTest(brush, { x: 50, y: 4 }) && !hitTest(brush, { x: 50, y: 6 }))
const moved = moveRegion(brush, 10, 20)
assert.deepEqual([moved.x, moved.y, moved.points![1]], [5, 15, { x: 110, y: 20 }])
assert.deepEqual(brush.points![1], { x: 100, y: 0 }) // original untouched (undo snapshots rely on it)
assert.equal(handleAt(rect, { x: 31, y: 21 }, 3), 'se')
assert.deepEqual(oppositeCorner(rect, 'se'), { x: 10, y: 10 })

console.log('check-image-mosaic: all passed')
