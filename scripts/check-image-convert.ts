// 이미지 형식 변환 회귀 체크: node scripts/check-image-convert.ts
import { sniffFormat, detectFormat, acceptFile, convertName, parseSettings, fitArea, nativeHeic, usesQuality, needsBg, MAX_AREA, MAX_FILE } from '../src/utils/imageConvert.ts'
import { savingsPct, uniqueNames } from '../src/utils/imageCompress.ts'

let fail = 0
const eq = (a: unknown, b: unknown, msg: string) => { if (JSON.stringify(a) !== JSON.stringify(b)) { fail++; console.log('FAIL', msg, JSON.stringify(a), '!=', JSON.stringify(b)) } }

const bytes = (...parts: (number[] | string)[]) => {
  const out: number[] = []
  for (const p of parts) typeof p === 'string' ? out.push(...[...p].map((c) => c.charCodeAt(0))) : out.push(...p)
  while (out.length < 32) out.push(0)
  return new Uint8Array(out)
}
const ftyp = (major: string, ...compat: string[]) => {
  const len = 16 + compat.length * 4
  return bytes([0, 0, 0, len], 'ftyp', major, [0, 0, 0, 0], compat.join(''))
}

// 매직 바이트
eq(sniffFormat(bytes([0xff, 0xd8, 0xff, 0xe1])), 'jpeg', 'JPEG')
eq(sniffFormat(bytes([0x89], 'PNG', [0x0d, 0x0a, 0x1a, 0x0a])), 'png', 'PNG')
eq(sniffFormat(bytes('GIF89a')), 'gif', 'GIF')
eq(sniffFormat(bytes('BM')), 'bmp', 'BMP')
eq(sniffFormat(bytes('RIFF', [1, 2, 3, 4], 'WEBPVP8 ')), 'webp', 'WebP')
eq(sniffFormat(bytes('RIFF', [1, 2, 3, 4], 'WAVE')), null, 'RIFF WAVE는 이미지 아님')
eq(sniffFormat(bytes([0x49, 0x49, 0x2a, 0])), 'tiff', 'TIFF LE')
eq(sniffFormat(ftyp('heic', 'mif1', 'heic')), 'heic', '아이폰 HEIC')
eq(sniffFormat(ftyp('mif1', 'heic')), 'heic', 'HEIF mif1')
eq(sniffFormat(ftyp('avif', 'mif1', 'miaf')), 'avif', 'AVIF')
eq(sniffFormat(ftyp('mif1', 'avif', 'miaf')), 'avif', 'mif1 major + avif compat = AVIF')
eq(sniffFormat(ftyp('isom', 'mp41')), null, 'MP4는 이미지 아님')
eq(sniffFormat(bytes('<svg xmlns')), 'svg', 'SVG')
eq(sniffFormat(new Uint8Array([1, 2])), null, '짧은 파일')

// 바이트 우선 → MIME → 확장자
eq(detectFormat(ftyp('heic', 'mif1'), 'IMG_0001.JPG', 'image/jpeg'), 'heic', '확장자 JPG지만 내용은 HEIC')
eq(detectFormat(null, 'IMG_0001.HEIC', ''), 'heic', '윈도우 크롬: MIME 빈 값 + .HEIC')
eq(detectFormat(null, 'a.heif', ''), 'heic', '.heif')
eq(detectFormat(null, 'x', 'image/heic'), 'heic', 'MIME heic')
eq(detectFormat(null, 'x', 'image/x-ms-bmp'), 'bmp', 'MIME x-ms-bmp')
eq(detectFormat(null, 'x', 'image/svg+xml'), 'svg', 'MIME svg+xml')
eq(detectFormat(null, 'photo.jpeg', ''), 'jpeg', '.jpeg')
eq(detectFormat(null, 'doc.pdf', 'application/pdf'), 'unknown', 'PDF')

// 받을 파일
eq(acceptFile({ name: 'IMG.HEIC', type: '', size: 10 }), true, 'HEIC 빈 MIME 허용')
eq(acceptFile({ name: 'a.svg', type: 'image/svg+xml', size: 10 }), false, 'SVG 제외')
eq(acceptFile({ name: 'a.pdf', type: 'application/pdf', size: 10 }), false, 'PDF 제외')
eq(acceptFile({ name: 'a.jpg', type: 'image/jpeg', size: 0 }), false, '빈 파일 제외')
eq(acceptFile({ name: 'a.jpg', type: 'image/jpeg', size: MAX_FILE + 1 }), false, '100MB 초과 제외')
eq(acceptFile({ name: 'pasted', type: 'image/x-icon', size: 10 }), true, 'ICO MIME')

// 파일명
eq(convertName('IMG_1234.HEIC', 'jpeg'), 'IMG_1234.jpg', 'HEIC → jpg')
eq(convertName('logo.final.png', 'webp'), 'logo.final.webp', '점 여러 개')
eq(convertName('noext', 'png'), 'noext.png', '확장자 없음')
eq(convertName('.png', 'avif'), 'image.avif', '이름 없음')
eq(uniqueNames(['a.jpg', 'A.jpg', 'a.jpg']), ['a.jpg', 'A (2).jpg', 'a (3).jpg'], 'ZIP 중복 이름')

// 절감률 (커지면 음수)
eq(savingsPct(1000, 400), 60, '60% 절감'); eq(savingsPct(1000, 1200), -20, '20% 증가'); eq(savingsPct(0, 10), 0, '0 바이트 원본')

// URL 설정
eq(parseSettings(null, null, null), { format: 'jpeg', quality: 85, bg: '#ffffff' }, '기본값')
eq(parseSettings('webp', '70', '000000'), { format: 'webp', quality: 70, bg: '#000000' }, '파라미터 복원')
eq(parseSettings('gif', '5', 'red'), { format: 'jpeg', quality: 10, bg: '#ffffff' }, '잘못된 값 보정')
eq(parseSettings('avif', '101', 'ABCDEF', false).format, 'jpeg', 'AVIF 미지원 브라우저')
eq(parseSettings('avif', '101', 'ABCDEF').quality, 100, '품질 상한')
eq(parseSettings('png', 'x', null).quality, 85, '품질 NaN')
eq([usesQuality('png'), usesQuality('jpeg'), needsBg('jpeg'), needsBg('webp')], [false, true, true, false], '형식별 옵션')

// 면적 제한 (48MP 아이폰 사진 → 16.7MP)
const big = fitArea(8064, 6048)
eq(big.width * big.height <= MAX_AREA, true, '면적 한계 이하')
eq(Math.abs(big.width / big.height - 8064 / 6048) < 0.001, true, '비율 유지')
eq(fitArea(4000, 3000), { width: 4000, height: 3000 }, '한계 이하 그대로')

// HEIC 네이티브 디코딩 브라우저
const UA = {
  mac17: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15',
  mac16: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Safari/605.1.15',
  ios17: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1',
  ios16: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1',
  iosChrome: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/129.0 Mobile/15E148 Safari/604.1',
  chrome: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36',
  android: 'Mozilla/5.0 (Linux; Android 14; SM-S918N) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/25.0 Chrome/121.0 Mobile Safari/537.36',
  firefox: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:130.0) Gecko/20100101 Firefox/130.0',
}
eq(Object.fromEntries(Object.entries(UA).map(([k, v]) => [k, nativeHeic(v)])),
  { mac17: true, mac16: false, ios17: true, ios16: false, iosChrome: true, chrome: false, android: false, firefox: false }, 'HEIC 지원 판별')

if (fail) { console.log(`\n${fail}개 실패`); process.exit(1) }
console.log('image-convert OK')
