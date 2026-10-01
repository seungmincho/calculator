// 이미지 압축 로직 회귀 체크: node scripts/check-image-compress.ts
import {
  formatBytes, targetBytes, savingsPct, fitDimensions, outputMime, outputName, uniqueNames, isHeic, fitToSize,
} from '../src/utils/imageCompress.ts'

let fail = 0
const eq = (a: unknown, b: unknown, msg: string) => {
  if (JSON.stringify(a) !== JSON.stringify(b)) { fail++; console.log('FAIL', msg, JSON.stringify(a), '!=', JSON.stringify(b)) }
}

// 용량 표기 (1024 단위)
eq(formatBytes(0), '0 B', '0')
eq(formatBytes(512), '512 B', 'B')
eq(formatBytes(1536), '1.5 KB', 'KB 소수')
eq(formatBytes(500 * 1024), '500 KB', 'KB 정수')
eq(formatBytes(3.2 * 1024 * 1024), '3.2 MB', 'MB')
eq(targetBytes(500), 500000, '500KB = 500,000B (1000/1024 둘 다 통과)')
eq(savingsPct(1000, 250), 75, '절감률')
eq(savingsPct(1000, 1200), -20, '커짐')
eq(savingsPct(0, 10), 0, '0 나눗셈')

// 크기 맞춤: 긴 변 기준, 확대 안 함, scale은 maxSide 적용 후 곱
eq(fitDimensions(4000, 3000, 1920), { width: 1920, height: 1440 }, '가로 긴 변')
eq(fitDimensions(3000, 4000, 1080), { width: 810, height: 1080 }, '세로 긴 변')
eq(fitDimensions(800, 600, 1920), { width: 800, height: 600 }, '확대 안 함')
eq(fitDimensions(4000, 3000, 0), { width: 4000, height: 3000 }, '제한 없음')
eq(fitDimensions(4000, 3000, 1920, 0.5), { width: 960, height: 720 }, 'maxSide 후 scale')
eq(fitDimensions(4000, 3000, 0, 0.5), { width: 2000, height: 1500 }, 'scale만')
eq(fitDimensions(10, 1, 0, 0.01), { width: 1, height: 1 }, '최소 1px')

// 포맷·파일명
eq(outputMime('original', 'image/jpg'), 'image/jpeg', 'jpg 정규화')
eq(outputMime('original', 'image/png'), 'image/png', 'png 유지')
eq(outputMime('original', 'image/heic'), 'image/jpeg', 'HEIC → JPEG')
eq(outputMime('original', 'image/gif'), 'image/jpeg', 'GIF → JPEG')
eq(outputMime('webp', 'image/png'), 'image/webp', 'webp 지정')
eq(outputName('IMG_0001.HEIC', 'image/jpeg'), 'IMG_0001_compressed.jpg', 'HEIC 이름')
eq(outputName('my.photo.png', 'image/webp'), 'my.photo_compressed.webp', '점 여러 개')
eq(outputName('.png', 'image/png'), 'image_compressed.png', '빈 이름')
eq(uniqueNames(['a.jpg', 'b.jpg', 'A.jpg', 'a.jpg']), ['a.jpg', 'b.jpg', 'A (2).jpg', 'a (3).jpg'], '중복 이름')
eq(uniqueNames(['noext', 'noext']), ['noext', 'noext (2)'], '확장자 없음')
eq(isHeic({ name: 'x.HEIC', type: '' }), true, 'heic 확장자')
eq(isHeic({ name: 'x.jpg', type: 'image/heif' }), true, 'heif type')
eq(isHeic({ name: 'x.jpg', type: 'image/jpeg' }), false, 'jpg')

// 목표 용량 탐색: 가짜 인코더 size = pixels(scale²) × quality 비례
const fake = (full: number) => {
  let calls = 0
  const enc = async (q: number, s: number) => { calls++; return { size: Math.round(full * s * s * (0.2 + q)) } }
  return { enc, calls: () => calls }
}
const run = async () => {
  // 이미 작음 → 최고 화질 한 번에
  let f = fake(100_000)
  let r = await fitToSize(f.enc, 500_000)
  eq([r.ok, r.quality, r.scale, f.calls()], [true, 0.92, 1, 1], '이미 목표 이하')

  // 화질만 낮추면 됨 → 이진 탐색, 통과한 최고 화질, 축소 없음
  f = fake(1_000_000)
  r = await fitToSize(f.enc, 900_000)
  eq([r.ok, r.scale], [true, 1], '화질 탐색 성공')
  eq(r.out.size <= 900_000, true, '목표 이하')
  eq(r.quality >= 0.6 && r.quality <= 0.7, true, `통과한 최고 화질 근처 (${r.quality})`) // 정답 0.7
  eq(f.calls() <= 2 + 6, true, '호출 수 상한')

  // 최저 화질로도 큼 → 축소
  f = fake(10_000_000)
  r = await fitToSize(f.enc, 500_000)
  eq(r.ok, true, '축소 후 성공')
  eq(r.out.size <= 500_000, true, '축소 후 목표 이하')
  eq(r.scale < 1, true, '축소됨')

  // PNG처럼 화질 무관(무손실) → 축소만으로 맞춤
  const lossless = async (_q: number, s: number) => ({ size: Math.round(3_000_000 * s * s) })
  r = await fitToSize(lossless, 1_000_000)
  eq([r.ok, r.out.size <= 1_000_000], [true, true], '무손실 축소')

  // 불가능 → ok:false, 가장 작은 결과
  const stubborn = async () => ({ size: 999_999 })
  r = await fitToSize(stubborn, 10)
  eq([r.ok, r.out.size], [false, 999_999], '불가능')

  console.log(fail ? `${fail} FAIL` : 'ALL PASS')
  process.exit(fail ? 1 : 0)
}
run()
