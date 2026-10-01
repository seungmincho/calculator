// 모스부호 회귀 체크: node scripts/check-morse.ts
import {
  encode, toMorse, parseMorse, tokensToText, composeHangul, timing, schedule, vibratePattern, wav, grade,
  KO, KOCH_EN, KOCH_KO, INTL,
} from '../src/utils/morse.ts'

let fail = 0
const eq = (a: unknown, b: unknown, msg: string) => {
  if (JSON.stringify(a) !== JSON.stringify(b)) { fail++; console.log('FAIL', msg, JSON.stringify(a), '!=', JSON.stringify(b)) }
}
const near = (a: number, b: number, msg: string) => { if (Math.abs(a - b) > 1e-9) { fail++; console.log('FAIL', msg, a, '!=', b) } }
const enc = (s: string) => toMorse(encode(s).tokens)
const dec = (m: string, a: 'en' | 'ko' = 'en') => tokensToText(parseMorse(m, a), a)

// 국제
eq(enc('SOS'), '... --- ...', 'SOS')
eq(enc('Hello World'), '.... . .-.. .-.. --- / .-- --- .-. .-.. -..', 'HELLO WORLD')
eq(enc('a.b?'), '.- .-.-.- -... ..--..', '문장부호')
eq(enc('<SK>'), '...-.-', '프로사인')
eq(encode('A~').unsupported, ['~'], '미지원 문자')
eq(dec('... --- ...'), 'SOS', 'SOS 해독')
eq(dec('···  −−−  ···'), 'SOS', '유니코드 점·선')
eq(dec('.... .. / - .... . .-. .'), 'HI THERE', '단어 구분 /')
eq(dec('.... ..   - ....'), 'HI TH', '단어 구분 공백 3칸')
eq(dec('...-.-'), '<SK>', 'SK 해독')
eq(dec('...... .-'), '□A', '모르는 부호')
eq(Object.keys(INTL).length, 26 + 10 + 18, 'INTL 개수')

// 한글 SKATS 표 (자음 14 · 모음 12, 부호 중복 없음)
eq(KO['ㄱ'] + ' ' + KO['ㅎ'] + ' ' + KO['ㅏ'] + ' ' + KO['ㅐ'] + ' ' + KO['ㅔ'], '.-.. .--- . --.- -.--', 'SKATS 표 일부')
eq(new Set(Object.values(KO)).size, 26, 'SKATS 부호 고유')
eq(enc('사랑해'), '--. . ...- . -.- .--- --.-', '사랑해')
eq(enc('까'), '.-.. .-.. .', '된소리 = 같은 자음 2번')
eq(enc('왜'), '-.- .- --.-', 'ㅙ = ㅗㅐ')
eq(enc('얘'), '-.- .. ..-', 'ㅒ = ㅑㅣ')

// 한글 왕복
for (const w of ['사랑해', '안녕하세요', '까치', '먹고', '읽기', '있습니다', '갔다', '오빠', '의사', '왜', '괜찮아',
  '얘기', '예', '닭', '값싸다', '훨씬', '박씨', '깎다', '없습니다', '앉아', '삶', '꽃', '뭐해', '쀍', '대한민국 만세'])
  eq(dec(enc(w), 'ko'), w, `왕복 ${w}`)
eq(dec(enc('2026년 SOS'), 'ko'), '2026년 ㅕ펴', '한글 모드: 숫자는 국제, 영문 부호는 자모로 읽힘')
eq(composeHangul([...'ㅏㄱ']), 'ㅏㄱ', '초성 없는 모음')
eq(composeHangul([...'ㄱㄱㄱㅏ']), 'ㄱ까', '남는 자음')

// 타이밍: PARIS + 단어 간격 = 50단위 = 60/WPM 초
const paris = encode('PARIS PARIS').tokens.slice(0, 6)
near(schedule(paris, timing(20)).total, 3, 'PARIS 20WPM = 3초')
near(schedule(paris, timing(20, 10)).total, 6, 'Farnsworth 20/10 = 6초')
near(timing(15, 30).charGap, timing(15).charGap, '실효 속도 > 문자 속도면 무시')
eq(vibratePattern(schedule(encode('A').tokens, timing(12))), [100, 100, 300], '진동 패턴')

// WAV
const w = wav(schedule(encode('E').tokens, timing(12)), 600, 8000)
eq(new TextDecoder().decode(new Uint8Array(w, 0, 4)), 'RIFF', 'WAV 헤더')
eq(new DataView(w).getUint32(40, true), w.byteLength - 44, 'WAV 데이터 길이')

// 연습
eq(KOCH_EN.length, 40, 'Koch 영문 40자')
eq(KOCH_KO.length, 26, 'Koch 한글 26자')
eq(KOCH_EN.every((c) => INTL[c]), true, 'Koch 문자 모두 부호 있음')
eq(grade('KMR', 'k m x').correct, 2, '채점 영문')
eq(grade('ㄱㅏㅁ', '감').correct, 3, '채점 한글 자모')
eq(grade('ㅗㅏ', 'ㅘ').correct, 2, '채점 겹모음')

console.log(fail ? `${fail} FAILED` : 'morse: all passed')
if (fail) process.exit(1)
