// PDF 도구 회귀 체크: node scripts/check-pdf-tools.ts
import { parsePageRanges, rangesToPages, planSplit, pageLabel, baseName, outName, isPdf, move, pageSize, fitRect, jpegOrientation, PAPER } from '../src/utils/pdfTools.ts'

let fail = 0
const eq = (a: unknown, b: unknown, msg: string) => { if (JSON.stringify(a) !== JSON.stringify(b)) { fail++; console.log('FAIL', msg, JSON.stringify(a), '!=', JSON.stringify(b)) } }
const ok = (s: string, n: number) => { const r = parsePageRanges(s, n); return r.ok ? r.ranges : r }

// 범위 파서
eq(ok('1-3,5,8-', 10), [[0, 2], [4, 4], [7, 9]], '기본 + 열린 끝')
eq(ok(' 1 ~ 3 , 5 ', 10), [[0, 2], [4, 4]], '물결·공백')
eq(ok('1 – 2', 3), [[0, 1]], 'en dash')
eq(ok('-3', 10), [[0, 2]], '열린 시작')
eq(ok('1 3 5', 5), [[0, 0], [2, 2], [4, 4]], '공백 구분')
eq(ok('10', 10), [[9, 9]], '마지막 쪽')
eq(ok('10-', 10), [[9, 9]], '마지막 쪽부터 끝')
eq(ok('', 5), { ok: false, error: 'empty', token: '' }, '빈 입력')
eq(ok(' , ', 5), { ok: false, error: 'empty', token: '' }, '쉼표만')
eq(ok('0', 5), { ok: false, error: 'outOfRange', token: '0' }, '0쪽')
eq(ok('1-6', 5), { ok: false, error: 'outOfRange', token: '1-6' }, '끝 초과')
eq(ok('6-', 5), { ok: false, error: 'outOfRange', token: '6-' }, '시작 초과')
eq(ok('5-3', 5), { ok: false, error: 'reversed', token: '5-3' }, '역순')
eq(ok('a', 5), { ok: false, error: 'invalid', token: 'a' }, '문자')
eq(ok('-', 5), { ok: false, error: 'invalid', token: '-' }, '대시만')
eq(ok('1-2-3', 5), { ok: false, error: 'invalid', token: '1-2-3' }, '대시 두 개')
eq(ok('1.5', 5), { ok: false, error: 'invalid', token: '1.5' }, '소수')

// 범위 → 페이지 (순서 유지, 중복 제거)
eq(rangesToPages([[2, 3], [0, 0], [3, 4]]), [2, 3, 0, 4], '순서 유지·중복 제거')

// 분할 계획
eq(planSplit('single', 3), [[0], [1], [2]], '한 쪽씩')
eq(planSplit('every', 7, { every: 3 }), [[0, 1, 2], [3, 4, 5], [6]], '3쪽마다 (나머지)')
eq(planSplit('every', 4, { every: 10 }), [[0, 1, 2, 3]], 'N이 전체보다 큼')
eq(planSplit('every', 3, { every: 0 }), [[0], [1], [2]], 'N=0 → 1')
eq(planSplit('range', 10, { ranges: [[0, 2], [4, 4]] }), [[0, 1, 2, 4]], '범위 → 한 파일')
eq(planSplit('range', 10, { ranges: [[0, 2], [4, 4]], separate: true }), [[0, 1, 2], [4]], '범위마다 별도 파일')
eq(planSplit('range', 10, {}), [], '범위 없음')
eq(planSplit('single', 0), [], '빈 문서')

// 파일명
eq(pageLabel([0, 1, 2, 4, 7, 8]), '1-3_5_8-9', '라벨 압축')
eq(pageLabel([4]), '5', '한 쪽')
eq(pageLabel(Array.from({ length: 40 }, (_, i) => i * 2)), '40p', '너무 길면 쪽수')
eq(baseName('보고서.PDF'), '보고서', '확장자 대문자')
eq(baseName('사진.jpg'), '사진', '이미지 확장자')
eq(baseName('.pdf'), 'document', '이름 없음')
eq(outName('계약서.pdf', '합침'), '계약서_합침.pdf', '합침 이름')
eq(outName('a.pdf', 'p1-3'), 'a_p1-3.pdf', '분할 이름')
eq([isPdf({ name: 'a.PDF', type: '' }), isPdf({ name: 'a', type: 'application/pdf' }), isPdf({ name: 'a.png', type: 'image/png' })], [true, true, false], 'PDF 판별')

// 이동
eq(move([1, 2, 3], 0, 2), [2, 3, 1], '아래로')
eq(move([1, 2, 3], 2, 0), [3, 1, 2], '위로')
eq(move([1, 2, 3], 0, -1), [1, 2, 3], '범위 밖')
eq(move([1, 2, 3], 2, 3), [1, 2, 3], '끝 넘어')

// 페이지 크기·맞춤
eq(pageSize('A4', 'auto', 3000, 4000, 0), [...PAPER.A4], '세로 사진 → A4 세로')
eq(pageSize('A4', 'auto', 4000, 3000, 0), [PAPER.A4[1], PAPER.A4[0]], '가로 사진 → A4 가로')
eq(pageSize('A4', 'portrait', 4000, 3000, 0), [...PAPER.A4], '세로 고정')
eq(pageSize('original', 'auto', 800, 600, 10), [620, 470], '원본 크기 + 여백')
const r = fitRect(1000, 500, 600, 800, 50) // 상자 500x700 → 폭 기준 0.5
eq([r.width, r.height, r.x, r.y], [500, 250, 50, 275], 'A4 맞춤 가로 이미지')
const q = fitRect(100, 400, 600, 800, 0) // 높이 기준 2배
eq([q.width, q.height, q.x, q.y], [200, 800, 200, 0], '확대 맞춤')

// EXIF Orientation: SOI + APP1(Exif, II, IFD0 1개: 0x0112 = 6)
const exif = (le: boolean, v: number) => {
  const w16 = (n: number) => (le ? [n & 255, n >> 8] : [n >> 8, n & 255])
  const w32 = (n: number) => (le ? [...w16(n & 0xffff), ...w16(n >>> 16)] : [...w16(n >>> 16), ...w16(n & 0xffff)])
  const tiff = [...(le ? [0x49, 0x49] : [0x4d, 0x4d]), ...w16(42), ...w32(8), ...w16(1), ...w16(0x0112), ...w16(3), ...w32(1), ...w16(v), 0, 0, ...w32(0)]
  const body = [0x45, 0x78, 0x69, 0x66, 0, 0, ...tiff]
  return new Uint8Array([0xff, 0xd8, 0xff, 0xe1, ...w16be(body.length + 2), ...body, 0xff, 0xda, 0, 2])
}
const w16be = (n: number) => [n >> 8, n & 255]
eq(jpegOrientation(exif(true, 6)), 6, 'EXIF LE 6')
eq(jpegOrientation(exif(false, 8)), 8, 'EXIF BE 8')
eq(jpegOrientation(new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 4, 0, 0, 0xff, 0xda])), 1, 'EXIF 없음')
eq(jpegOrientation(new Uint8Array([0x89, 0x50, 0x4e, 0x47])), 1, 'PNG')
eq(jpegOrientation(new Uint8Array([0xff, 0xd8])), 1, '잘린 파일')

console.log(fail ? `${fail} FAILED` : 'all passed')
if (fail) process.exit(1)
