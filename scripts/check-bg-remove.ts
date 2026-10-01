// 배경 제거 픽셀 로직 회귀 체크: node scripts/check-bg-remove.ts
import {
  rgbToLab, deltaE, toHex, fromHex, fitSize, detectBorderColors, distanceMap, computeAlpha, applyMask, composite,
  paintMask, scaleMask, MASK_ERASE, MASK_KEEP, type RGB,
} from '../src/utils/bgRemove.ts'

let fail = 0
const eq = (a: unknown, b: unknown, msg: string) => {
  if (JSON.stringify(a) !== JSON.stringify(b)) { fail++; console.log('FAIL', msg, JSON.stringify(a), '!=', JSON.stringify(b)) }
}
const near = (a: number, b: number, tol: number, msg: string) => {
  if (!(Math.abs(a - b) <= tol)) { fail++; console.log('FAIL', msg, a, '!~', b) }
}

// 그림 → RGBA. rows: 문자 하나 = 픽셀 하나
const PAL: Record<string, RGB> = { W: [255, 255, 255], K: [0, 0, 0], R: [220, 30, 30], G: [0, 200, 0], w: [250, 250, 248] }
const img = (rows: string[]) => {
  const h = rows.length, w = rows[0].length
  const d = new Uint8ClampedArray(w * h * 4)
  rows.forEach((row, y) => [...row].forEach((ch, x) => { const i = (y * w + x) * 4; d.set([...PAL[ch], 255], i) }))
  return { d, w, h }
}

// Lab
const white = rgbToLab(255, 255, 255)
near(white[0], 100, 0.01, 'white L'); near(white[1], 0, 0.01, 'white a'); near(white[2], 0, 0.01, 'white b')
eq(rgbToLab(0, 0, 0).map((v) => Math.round(v)), [0, 0, 0], 'black Lab')
near(rgbToLab(255, 0, 0)[0], 53.24, 0.05, 'red L')
// 지각 색차: 어두운 쪽 같은 RGB 차이가 더 크게 보임
const dDark = deltaE(rgbToLab(10, 10, 10), rgbToLab(30, 30, 30))
const dLight = deltaE(rgbToLab(225, 225, 225), rgbToLab(245, 245, 245))
eq(dDark > dLight, true, 'perceptual: dark diff > light diff')

eq(toHex([255, 128, 0]), '#ff8000', 'toHex')
eq(fromHex('#3D7CC9'), [61, 124, 201], 'fromHex')
eq(fitSize(100, 50, 10000), { w: 100, h: 50 }, 'fit small')
eq(fitSize(4000, 3000, 1_200_000), { w: 1264, h: 948 }, 'fit large')

// 테두리 색 감지
const ring = img([
  'WWWWWWW',
  'WKKKKKW',
  'WKWWWKW',
  'WKWRWKW',
  'WKWWWKW',
  'WKKKKKW',
  'WWWWWWW',
])
const det = detectBorderColors(ring.d, ring.w, ring.h)
eq(det.colors, [[255, 255, 255]], 'border white')
eq(det.share, 1, 'border share')
const half = img(['GGGGWWWW', 'GKKKKKKW', 'GGGGWWWW'])
const det2 = detectBorderColors(half.d, half.w, half.h)
eq(det2.colors.length, 2, 'two border colors')
eq(det2.share < 0.7, true, 'two colors → lower share')

// flood vs global: 검은 링 안쪽 흰색은 flood에서 남고 global에서 지워짐
const n = ring.w * ring.h
const dm = distanceMap(ring.d, n, [[255, 255, 255]])
const fl = computeAlpha(dm.dist, ring.w, ring.h, 10, 0, 'flood')
eq(fl[0], 0, 'flood corner removed')
eq(fl[2 * 7 + 2], 255, 'flood: enclosed white kept')
eq(fl[1 * 7 + 1], 255, 'flood: ring kept')
eq(fl[3 * 7 + 3], 255, 'flood: red kept')
const gl = computeAlpha(dm.dist, ring.w, ring.h, 10, 0, 'global')
eq(gl[2 * 7 + 2], 0, 'global: enclosed white removed')
eq(gl[3 * 7 + 3], 255, 'global: red kept')
// 안쪽 클릭(seed) → 닫힌 영역도 지움
const sd = computeAlpha(dm.dist, ring.w, ring.h, 10, 0, 'flood', [2 * 7 + 2])
eq(sd[2 * 7 + 2], 0, 'seed removes enclosed')
eq(sd[2 * 7 + 4], 0, 'seed fills region')
eq(sd[3 * 7 + 3], 255, 'seed keeps red')

// 거의 흰색(JPEG 노이즈)은 허용 오차 안
const noisy = img(['wWw', 'WRW', 'wWw'])
const dn = distanceMap(noisy.d, 9, [[255, 255, 255]])
eq(computeAlpha(dn.dist, 3, 3, 5, 0, 'flood')[0], 0, 'near-white removed')

// 부드러운 경계: 배경 옆 중간색은 부분 투명, 그 너머로는 번지지 않음
const mid: RGB = [237, 143, 143] // 빨강·흰색 반반 섞임
const soft = { d: new Uint8ClampedArray([...[255, 255, 255, 255], ...mid, 255, ...[220, 30, 30, 255]]), w: 3, h: 1 }
const ds = distanceMap(soft.d, 3, [[255, 255, 255]])
const as = computeAlpha(ds.dist, 3, 1, 5, 60, 'flood')
eq(as[0], 0, 'soft: bg 0')
eq(as[1] > 0 && as[1] < 255, true, 'soft: edge partial')
eq(as[2], 255, 'soft: subject opaque')
// soft 영역은 seed처럼 번지지 않음: 같은 중간색이 이어져도 두 번째부터는 불투명
PAL.M = mid
const chain = img(['WWWWW', 'WRRRW', 'WMMRW', 'WRRRW', 'WWWWW'])
const ac = computeAlpha(distanceMap(chain.d, 25, [[255, 255, 255]]).dist, 5, 5, 5, 60, 'flood')
eq(ac[11] > 0 && ac[11] < 255, true, 'soft edge next to bg')
eq(ac[12], 255, 'soft does not propagate')

// defringe: 128 알파 + 흰 배경 섞임 → 원래 빨강 복원
const fr = composite(new Uint8ClampedArray([...mid, 255]), new Uint8Array([128]), new Uint8Array([0]), [[255, 255, 255]], true, null)
near(fr[0], 220, 2, 'defringe r'); near(fr[1], 31, 2, 'defringe g'); eq(fr[3], 128, 'defringe alpha')
const nf = composite(new Uint8ClampedArray([...mid, 255]), new Uint8Array([128]), new Uint8Array([0]), [[255, 255, 255]], false, null)
eq([nf[0], nf[1]], [237, 143], 'no defringe keeps color')
// 배경 채우기 (증명사진 파랑)
const blue: RGB = [61, 124, 201]
const fl2 = composite(new Uint8ClampedArray([255, 255, 255, 255, 10, 20, 30, 255]), new Uint8Array([0, 255]), new Uint8Array(2), [[255, 255, 255]], true, blue)
eq([...fl2], [61, 124, 201, 255, 10, 20, 30, 255], 'fill bg')

// 브러시 마스크
const mask = new Uint8Array(25)
paintMask(mask, 5, 5, 2, 2, 2, 2, 1, MASK_ERASE)
eq(mask.reduce((s, v) => s + (v ? 1 : 0), 0), 5, 'brush r=1 → plus shape')
paintMask(mask, 5, 5, 0, 4, 4, 4, 0, MASK_KEEP)
eq([...mask.slice(20)], [2, 2, 2, 2, 2], 'brush line')
const am = applyMask(new Uint8Array(25).fill(255), mask)
eq([am[12], am[0], am[20]], [0, 255, 255], 'applyMask')
eq([...scaleMask(new Uint8Array([1, 2, 0, 1]), 2, 2, 4, 4).slice(0, 4)], [1, 1, 2, 2], 'scaleMask')

if (fail) { console.log(`${fail} failed`); process.exit(1) }
console.log('bg-remove ok')
