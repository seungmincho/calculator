// OCR 전처리·후처리 회귀 체크: node scripts/check-ocr.ts
import { otsuThreshold, preprocessPixels, prepScale, joinSplitHangul, cleanOcrText } from '../src/utils/ocr.ts'

let fail = 0
const eq = (a: unknown, b: unknown, msg: string) => {
  if (JSON.stringify(a) !== JSON.stringify(b)) { fail++; console.log('FAIL', msg, JSON.stringify(a), '!=', JSON.stringify(b)) }
}

// Otsu: 두 봉우리(40, 200) 사이에서 나뉘어야 한다
const hist = new Array(256).fill(0)
hist[40] = 500; hist[45] = 300; hist[200] = 700; hist[210] = 100
const th = otsuThreshold(hist)
eq(th >= 45 && th < 200, true, `Otsu 쌍봉 분리 (t=${th})`)
eq(otsuThreshold(new Array(256).fill(0).map((_, i) => (i === 128 ? 10 : 0))), 0, '단일값 히스토그램')

// 이진화: 흰 바탕(다수) 검은 글씨 → 반전 없음
const mk = (vals: number[]) => new Uint8ClampedArray(vals.flatMap(v => [v, v, v, 255]))
let px = mk([250, 250, 250, 20])
eq(preprocessPixels(px, 'binary').inverted, false, '흰 바탕 반전 없음')
eq([px[0], px[12]], [255, 0], '흰 바탕 이진화')
// 다크모드 캡처(검은 바탕 다수 + 흰 글씨) → 반전되어 흰 바탕 검은 글씨
px = mk([15, 15, 15, 240])
eq(preprocessPixels(px, 'binary').inverted, true, '검은 바탕 반전')
eq([px[0], px[12]], [255, 0], '검은 바탕 → 흰 바탕')
px = mk([100, 100, 150, 200])
preprocessPixels(px, 'off')
eq(px[0], 100, 'off 모드 무변경')

// 확대 배율
eq(prepScale(800, 600, 'gray'), 2, '작은 이미지 2배')
eq(prepScale(800, 600, 'off'), 1, 'off면 확대 안 함')
eq(prepScale(3000, 2000, 'gray'), 1, '큰 이미지 그대로')
eq(prepScale(8000, 2000, 'gray'), 0.5, '초대형 축소')

// 한글 음절 공백
eq(joinSplitHangul('대 한 민 국 의 수도'), '대한민국의 수도', '음절 공백 제거')
eq(joinSplitHangul('이 책 을 읽다'), '이책을 읽다', '3연속 한 글자 결합')
eq(joinSplitHangul('그 책 좋아'), '그 책 좋아', '2연속은 유지')
eq(joinSplitHangul('A B C 가 나'), 'A B C 가 나', '영문 한 글자는 무시')

// 전체 정리
const raw = '안 녕 하 세 요   반갑습니다\ninfor-\nmation 입니다\n\n\n\n둘째  문단\n이어짐 '
eq(cleanOcrText(raw, { fixKoreanSpaces: true, joinLines: false }),
  '안녕하세요 반갑습니다\ninformation 입니다\n\n둘째 문단\n이어짐', '기본 정리')
eq(cleanOcrText(raw, { fixKoreanSpaces: false, joinLines: true }),
  '안 녕 하 세 요 반갑습니다 information 입니다\n\n둘째 문단 이어짐', '줄 합치기')
eq(cleanOcrText('a-\nB', { fixKoreanSpaces: true, joinLines: false }), 'a-\nB', '대문자 앞 하이픈 유지')
eq(cleanOcrText('x\r\ny', { fixKoreanSpaces: true, joinLines: false }), 'x\ny', 'CRLF')

if (fail) { console.log(`${fail} failed`); process.exit(1) }
console.log('check-ocr: all passed')
