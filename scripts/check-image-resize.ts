// 이미지 크기 조절 로직 회귀 체크: node scripts/check-image-resize.ts
import { cmToPx, clampInt, PRESETS, drawPlan, resolveSize, downscaleSteps, isFixedSize, MAX_SIDE, type SizeOptions } from '../src/utils/imageResize.ts'
import { fitToSize } from '../src/utils/imageCompress.ts'

let fail = 0
const eq = (a: unknown, b: unknown, msg: string) => {
  if (JSON.stringify(a) !== JSON.stringify(b)) { fail++; console.log('FAIL', msg, JSON.stringify(a), '!=', JSON.stringify(b)) }
}
const base: SizeOptions = { mode: 'px', width: 0, height: 0, lock: true, percent: 100, longSide: 1920, fit: 'stretch' }
const size = (w: number, h: number, o: Partial<SizeOptions>, scale = 1) => {
  const r = resolveSize(w, h, { ...base, ...o }, scale)
  return [r.width, r.height]
}

// cm → px (300dpi): 반명함 3×4 = 354×472, 여권 3.5×4.5 = 413×531
eq([cmToPx(3), cmToPx(4)], [354, 472], '반명함 3×4cm')
eq([cmToPx(3.5), cmToPx(4.5)], [413, 531], '여권 3.5×4.5cm')
eq(cmToPx(2.54, 96), 96, '1인치 = dpi')
eq(PRESETS.find((p) => p.id === 'passport')!.width, 413, '프리셋은 계산값')

eq(clampInt('1080', 1, 10000, 5), 1080, '정수')
eq(clampInt('', 1, 10000, 5), 5, '빈 값 → 기본')
eq(clampInt('abc', 1, 10000, 5), 5, 'NaN → 기본')
eq(clampInt('99999', 1, 10000, 5), 10000, '상한')
eq(clampInt(12.6, 1, 100, 5), 13, '반올림')

// 픽셀 + 비율 고정: W×H 상자 안에 맞춤
eq(size(4000, 3000, { width: 800, height: 800 }), [800, 600], '가로 사진 상자 맞춤')
eq(size(3000, 4000, { width: 800, height: 800 }), [600, 800], '세로 사진 상자 맞춤')
eq(size(4000, 3000, { width: 1000, height: 0 }), [1000, 750], '가로만 입력')
eq(size(4000, 3000, { width: 0, height: 300 }), [400, 300], '세로만 입력')
eq(size(4000, 3000, { width: 0, height: 0 }), [4000, 3000], '둘 다 비면 원본')
eq(size(400, 300, { width: 800, height: 800 }), [800, 600], 'px 지정은 확대 허용')
// 픽셀 + 비율 고정 끔: 정확히 W×H
eq(size(4000, 3000, { lock: false, width: 354, height: 472, fit: 'cover' }), [354, 472], '증명사진 정확한 크기')
eq(size(4000, 3000, { lock: false, width: 500, height: 0 }), [500, 375], '고정 끔인데 한쪽 비면 비율')
eq(isFixedSize({ ...base, lock: false, width: 354, height: 472 }), true, '고정 크기 판정')
eq(isFixedSize({ ...base, lock: false, width: 354 }), false, '한쪽 비면 고정 아님')
eq(isFixedSize({ ...base, mode: 'long' }), false, '긴 변은 고정 아님')

// 퍼센트·긴 변
eq(size(4000, 3000, { mode: 'pct', percent: 50 }), [2000, 1500], '50%')
eq(size(333, 333, { mode: 'pct', percent: 10 }), [33, 33], '10% 반올림')
eq(size(4000, 3000, { mode: 'long', longSide: 1920 }), [1920, 1440], '긴 변 가로')
eq(size(3000, 4000, { mode: 'long', longSide: 1920 }), [1440, 1920], '긴 변 세로')
eq(size(800, 600, { mode: 'long', longSide: 1920 }), [800, 600], '긴 변은 확대 안 함')
eq(size(1, 1, { mode: 'pct', percent: 1 }), [1, 1], '최소 1px')
eq(size(4000, 3000, { mode: 'pct', percent: 400 }), [MAX_SIDE, 7500], '캔버스 한계로 축소')
eq(size(4000, 3000, { mode: 'pct', percent: 50 }, 0.5), [1000, 750], '용량 탐색 scale')

// 그리기 계획
eq(drawPlan(4000, 3000, 800, 600, 'stretch'), { sx: 0, sy: 0, sw: 4000, sh: 3000, dx: 0, dy: 0, dw: 800, dh: 600 }, '늘이기')
eq(drawPlan(4000, 2000, 1000, 1000, 'contain'), { sx: 0, sy: 0, sw: 4000, sh: 2000, dx: 0, dy: 250, dw: 1000, dh: 500 }, '맞춤 위아래 여백')
eq(drawPlan(2000, 4000, 1000, 1000, 'contain'), { sx: 0, sy: 0, sw: 2000, sh: 4000, dx: 250, dy: 0, dw: 500, dh: 1000 }, '맞춤 좌우 여백')
eq(drawPlan(4000, 2000, 1000, 1000, 'cover'), { sx: 1000, sy: 0, sw: 2000, sh: 2000, dx: 0, dy: 0, dw: 1000, dh: 1000 }, '채우기 가운데 자르기')
const idp = drawPlan(4000, 3000, 354, 472, 'cover')
eq(Math.abs(idp.sw / idp.sh - 354 / 472) < 1e-9 && idp.sh === 3000, true, '증명사진 채우기 비율·세로 전체')
eq(idp.sx, (4000 - idp.sw) / 2, '증명사진 가로 가운데')
const wideLeft = drawPlan(1200, 600, 413, 531, 'cover', 0, 50)
const wideRight = drawPlan(1200, 600, 413, 531, 'cover', 100, 50)
eq(wideLeft.sx, 0, '여권 가로 왼쪽 크롭')
eq(wideRight.sx + wideRight.sw, 1200, '여권 가로 오른쪽 크롭')
eq(wideLeft.sy, 0, '가로 사진의 세로 빈 영역 없음')
const tallTop = drawPlan(600, 1200, 413, 531, 'cover', 50, 0)
const tallBottom = drawPlan(600, 1200, 413, 531, 'cover', 50, 100)
eq(tallTop.sy, 0, '여권 세로 위쪽 크롭')
eq(tallBottom.sy + tallBottom.sh, 1200, '여권 세로 아래쪽 크롭')
eq(drawPlan(1200, 600, 413, 531, 'cover', -10, 50).sx, 0, '크롭 좌표 하한')
eq(drawPlan(1200, 600, 413, 531, 'cover', 110, 50).sx, wideRight.sx, '크롭 좌표 상한')
eq(drawPlan(1200, 600, 413, 531, 'cover', NaN, 50).sx, (1200 - wideLeft.sw) / 2, '잘못된 크롭 좌표는 중앙')

// 단계적 축소
eq(downscaleSteps(4000, 3000, 800, 600), [{ w: 2000, h: 1500 }, { w: 1000, h: 750 }], '절반씩 2단계')
eq(downscaleSteps(1000, 1000, 800, 800), [], '2배 미만이면 단계 없음')
eq(downscaleSteps(800, 600, 1600, 1200), [], '확대는 단계 없음')
eq(downscaleSteps(100000, 100000, 1, 1).length, 12, '단계 상한')

// 목표 용량 탐색(공용 fitToSize): 고정 크기는 축소하지 않고 실패 반환
const fake = (perQ: number) => async (q: number, s: number) => ({ size: Math.round(q * perQ * s * s) })
const run = async () => {
  const fixed = await fitToSize(fake(1000), 100, { maxQ: 0.9, minQ: 0.4, minScale: 1 })
  eq([fixed.ok, fixed.scale], [false, 1], '고정 크기: 화질만으로 안 되면 실패, 축소 안 함')
  const free = await fitToSize(fake(1000), 100, { maxQ: 0.9, minQ: 0.4 })
  eq(free.ok && free.scale < 1 && free.out.size <= 100, true, '자유 크기: 축소로 맞춤')
  const q = await fitToSize(fake(1000), 600, { maxQ: 0.9, minQ: 0.4 })
  eq(q.ok && q.scale === 1 && q.quality >= 0.55 && q.quality <= 0.6, true, '화질 이분 탐색')

  console.log(fail ? `${fail} FAILED` : 'all passed')
  if (fail) process.exit(1)
}
run()
