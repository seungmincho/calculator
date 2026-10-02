// 바코드 로직 회귀 체크: node scripts/check-barcode.ts
import { createRequire } from 'node:module'
import { gs1CheckDigit, checkValue, gs1Prefix, serial, parseBulk, labelSize, cellPos, paginate, contrastWarning, FORMATS, SAMPLE, type Format } from '../src/utils/barcode.ts'

const JsBarcode = createRequire(import.meta.url)('jsbarcode')
let fail = 0
const eq = (a: unknown, b: unknown, msg: string) => { if (JSON.stringify(a) !== JSON.stringify(b)) { fail++; console.log('FAIL', msg, JSON.stringify(a), '!=', JSON.stringify(b)) } }

// 실제 공개 예시 번호의 체크디지트: EAN-13 4006381333931·9780306406157(ISBN)·5901234123457, EAN-8 96385074·73513537, UPC-A 036000291452·012345678905, ITF-14 10012345678902
for (const full of ['4006381333931', '9780306406157', '5901234123457', '96385074', '73513537', '036000291452', '012345678905', '10012345678902'])
  eq(gs1CheckDigit(full.slice(0, -1)), +full.at(-1)!, `체크디지트 ${full}`)

// 12자리 → 자동 추가, 13자리 검증, 틀리면 올바른 번호 제시
eq(checkValue('EAN13', ' 400638133393 '), { ok: true, value: '4006381333931', added: 1 }, 'EAN-13 12자리 자동')
eq(checkValue('EAN13', '4006381333931').ok, true, 'EAN-13 13자리 정상')
eq(checkValue('EAN13', '4006381333932'), { ok: false, value: '4006381333932', error: 'check', expected: '4006381333931' }, 'EAN-13 체크 오류')
eq(checkValue('EAN13', '40063813339').error, 'length', 'EAN-13 11자리')
eq(checkValue('EAN13', '40063A133393').error, 'digits', 'EAN-13 문자')
eq(checkValue('EAN8', '9638507').value, '96385074', 'EAN-8 7자리')
eq(checkValue('UPC', '03600029145').value, '036000291452', 'UPC-A 11자리')
eq(checkValue('ITF14', '1001234567890').value, '10012345678902', 'ITF-14 13자리')
eq(checkValue('CODE39', 'ab-1').value, 'AB-1', 'CODE39 대문자 변환')
eq(checkValue('CODE39', 'A_1').error, 'code39', 'CODE39 밑줄 불가')
eq(checkValue('CODE128', '바코드').error, 'ascii', 'CODE128 한글 불가')
eq(checkValue('CODE128', 'x'.repeat(81)).error, 'tooLong', 'CODE128 길이')
eq(checkValue('CODE128', '').error, 'empty', '빈 값')
eq([gs1Prefix('EAN13', '8801234567893'), gs1Prefix('EAN13', '9791234567896'), gs1Prefix('ITF14', '18801234567890'), gs1Prefix('EAN13', '4006381333931')], ['kr', 'isbn', 'kr', null], '접두어')

// JsBarcode와 판정이 일치하는지 (우리가 통과시킨 값은 JsBarcode도 받아야 함)
const js = (f: Format, v: string) => { try { JsBarcode({}, v, { format: f }); return true } catch { return false } }
const cases: [Format, string][] = [...FORMATS.map((f) => [f, SAMPLE[f]] as [Format, string]),
  ['EAN13', '4006381333932'], ['EAN8', '96385075'], ['UPC', '036000291453'], ['ITF14', '10012345678903'], ['CODE39', 'A_1'], ['CODE128', '바코드'], ['CODE128', 'A-0001 / x']]
for (const [f, v] of cases) { const c = checkValue(f, v); eq(js(f, c.value), c.ok, `JsBarcode 일치 ${f} ${v}`) }

// 일련번호: 0 채우기, EAN-13은 12자리로 맞추면 체크디지트 자동
eq(serial('A-', 9, 3, 4), ['A-0009', 'A-0010', 'A-0011'], '일련번호')
eq(serial('880123456', 1, 2, 3).map((s) => checkValue('EAN13', s).value), ['8801234560016', '8801234560023'], 'EAN-13 일련번호')
eq(serial('', 1, 5000, 0).length, 1000, '최대 1000개')

// 붙여넣기: 쉼표/탭, 따옴표, 빈 줄
eq(parseBulk('A-1,볼펜\n\nB-2\t"노트, A5"\r\nC-3'), [{ line: 1, code: 'A-1', label: '볼펜' }, { line: 3, code: 'B-2', label: '노트, A5' }, { line: 4, code: 'C-3', label: '' }], '붙여넣기 파싱')

// 라벨 시트: 3×8, 여백 위 10·좌우 5, 간격 0 → 66.7 × 34.6 mm
const L = { cols: 3, rows: 8, top: 10, side: 5, gapX: 0, gapY: 0 }
eq(labelSize(L), { w: 66.7, h: 34.6 }, '3×8 칸 크기')
eq(cellPos(L, 4), { x: 71.7, y: 44.6 }, '5번째 칸 위치')
eq(labelSize({ cols: 2, rows: 5, top: 10, side: 5, gapX: 5, gapY: 0 }), { w: 97.5, h: 55.4 }, '2×5 간격')
eq(paginate([1, 2, 3, 4, 5], 4, 2), [[null, null, 1, 2], [3, 4, 5]], '건너뛸 칸 + 페이지')
eq(paginate([1], 4, 9)[0].length, 4, '건너뛰기는 한 장 미만으로 제한')

// 대비: 검정/흰 21:1, 흰 바 = inverted, 빨강 바 = low
eq(contrastWarning('#000000', '#ffffff'), { ratio: 21, warn: null }, '검정/흰')
eq(contrastWarning('#ffffff', '#000000').warn, 'inverted', '반전')
eq(contrastWarning('#ff0000', '#ffffff').warn, 'low', '빨강 바')

console.log(fail ? `${fail} FAILED` : 'barcode OK')
if (fail) process.exit(1)
