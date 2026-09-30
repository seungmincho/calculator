/** 한글 자모 분해·조합·초성·로마자·조사 (KoreanSyllable). 검증: node scripts/check-korean-syllable.ts */
import { engToKorConvert, korToEngConvert } from './keyboardConvert.ts'

const BASE = 0xac00
export const CHO = ['ㄱ','ㄲ','ㄴ','ㄷ','ㄸ','ㄹ','ㅁ','ㅂ','ㅃ','ㅅ','ㅆ','ㅇ','ㅈ','ㅉ','ㅊ','ㅋ','ㅌ','ㅍ','ㅎ']
export const JUNG = ['ㅏ','ㅐ','ㅑ','ㅒ','ㅓ','ㅔ','ㅕ','ㅖ','ㅗ','ㅘ','ㅙ','ㅚ','ㅛ','ㅜ','ㅝ','ㅞ','ㅟ','ㅠ','ㅡ','ㅢ','ㅣ']
export const JONG = ['','ㄱ','ㄲ','ㄳ','ㄴ','ㄵ','ㄶ','ㄷ','ㄹ','ㄺ','ㄻ','ㄼ','ㄽ','ㄾ','ㄿ','ㅀ','ㅁ','ㅂ','ㅄ','ㅅ','ㅆ','ㅇ','ㅈ','ㅊ','ㅋ','ㅌ','ㅍ','ㅎ']

/** 겹자모 → 낱자 (두벌식 타자 단위) */
const SPLIT: Record<string, string> = {
  'ㄳ':'ㄱㅅ','ㄵ':'ㄴㅈ','ㄶ':'ㄴㅎ','ㄺ':'ㄹㄱ','ㄻ':'ㄹㅁ','ㄼ':'ㄹㅂ','ㄽ':'ㄹㅅ','ㄾ':'ㄹㅌ','ㄿ':'ㄹㅍ','ㅀ':'ㄹㅎ','ㅄ':'ㅂㅅ',
  'ㅘ':'ㅗㅏ','ㅙ':'ㅗㅐ','ㅚ':'ㅗㅣ','ㅝ':'ㅜㅓ','ㅞ':'ㅜㅔ','ㅟ':'ㅜㅣ','ㅢ':'ㅡㅣ',
}

export interface Syllable { ch: string; cho: string; jung: string; jong: string }

export const isSyllable = (ch: string) => { const c = ch.charCodeAt(0); return ch.length === 1 && c >= BASE && c <= 0xd7a3 }

export function decompose(ch: string): Syllable | null {
  if (!isSyllable(ch)) return null
  const o = ch.charCodeAt(0) - BASE
  return { ch, cho: CHO[Math.floor(o / 588)], jung: JUNG[Math.floor((o % 588) / 28)], jong: JONG[o % 28] }
}

/** NFD(맥 파일명 등 조합형 자모)도 완성형으로 맞춘 뒤 처리 */
export const nfc = (s: string) => s.normalize('NFC')

/** 초성 추출. keepOther=false면 한글 음절 외 문자(공백·영문·숫자) 제거 */
export function chosung(text: string, keepOther = true): string {
  let r = ''
  for (const ch of nfc(text)) {
    const d = decompose(ch)
    if (d) r += d.cho
    else if (keepOther) r += ch
  }
  return r
}

/** 자모 분리 문자열. splitCompound=true면 겹받침·겹모음까지 낱자로(두벌식 타자 순서) */
export function jamoString(text: string, splitCompound = false): string {
  let r = ''
  for (const ch of nfc(text)) {
    const d = decompose(ch)
    const s = d ? d.cho + d.jung + d.jong : ch
    r += splitCompound ? Array.from(s, (c) => SPLIT[c] ?? c).join('') : s
  }
  return r
}

/** 자모(ㄱ~ㅣ) 연속 구간을 완성형으로 조합. 두벌식 오토마타 재사용(keyboardConvert). 그 외 문자는 그대로 */
export function composeJamo(text: string): string {
  return nfc(text).replace(/[ㄱ-ㅣ]+/g, (run) => engToKorConvert(korToEngConvert(run)))
}

/** 두벌식 영문 키 입력(dkssud) → 한글 */
export const composeKeys = (text: string) => engToKorConvert(text)

export function stats(text: string) {
  const s = nfc(text)
  const chars = Array.from(s)
  return {
    chars: chars.length,
    syllables: chars.filter(isSyllable).length,
    keystrokes: Array.from(jamoString(s, true)).filter((c) => /[ㄱ-ㅣ]/.test(c)).length,
  }
}

const hex = (n: number) => 'U+' + n.toString(16).toUpperCase().padStart(4, '0')
export const codePoint = (ch: string) => hex(ch.codePointAt(0)!)
export const codePoints = (text: string) => Array.from(nfc(text), codePoint).join(' ')
/** NFD 자모 코드를 JS 이스케이프로 (한) */
export const nfdEscaped = (text: string) =>
  Array.from(nfc(text).normalize('NFD'), (c) => {
    const n = c.codePointAt(0)!
    return n < 0x80 ? c : n > 0xffff ? `\\u{${n.toString(16).toUpperCase()}}` : '\\u' + n.toString(16).toUpperCase().padStart(4, '0')
  }).join('')

// ── 로마자 표기 (국어의 로마자 표기법, 문화체육관광부 고시 제2014-42호) ──

const R_CHO: Record<string, string> = { 'ㄱ':'g','ㄲ':'kk','ㄴ':'n','ㄷ':'d','ㄸ':'tt','ㄹ':'r','ㅁ':'m','ㅂ':'b','ㅃ':'pp','ㅅ':'s','ㅆ':'ss','ㅇ':'','ㅈ':'j','ㅉ':'jj','ㅊ':'ch','ㅋ':'k','ㅌ':'t','ㅍ':'p','ㅎ':'h' }
const R_JUNG = ['a','ae','ya','yae','eo','e','yeo','ye','o','wa','wae','oe','yo','u','wo','we','wi','yu','eu','ui','i']
const R_JONG: Record<string, string> = { '':'','ㄱ':'k','ㄴ':'n','ㄷ':'t','ㄹ':'l','ㅁ':'m','ㅂ':'p','ㅇ':'ng' }
/** 겹받침 자음군 단순화 + 7종성 */
const NEUTRAL: Record<string, string> = {
  'ㄲ':'ㄱ','ㅋ':'ㄱ','ㄳ':'ㄱ','ㄺ':'ㄱ','ㅅ':'ㄷ','ㅆ':'ㄷ','ㅈ':'ㄷ','ㅊ':'ㄷ','ㅌ':'ㄷ','ㅎ':'ㄷ',
  'ㅍ':'ㅂ','ㄿ':'ㅂ','ㅄ':'ㅂ','ㄵ':'ㄴ','ㄶ':'ㄴ','ㄻ':'ㅁ','ㄼ':'ㄹ','ㄽ':'ㄹ','ㄾ':'ㄹ','ㅀ':'ㄹ',
}
const neutral = (f: string) => NEUTRAL[f] ?? f
const ASPIRATE: Record<string, string> = { 'ㄱ':'ㅋ','ㄷ':'ㅌ','ㅈ':'ㅊ' }
const NASAL: Record<string, string> = { 'ㄱ':'ㅇ','ㄷ':'ㄴ','ㅂ':'ㅁ' }

/**
 * 한 어절(한글 음절 연속)의 로마자. 반영하는 음운 변화(표기법 제3장 제1항):
 * 연음, 자음동화(비음화·유음화, ㄹ의 비음화), 구개음화, ㅎ 뒤 거센소리, 자음군 단순화.
 * 반영하지 않음: 된소리(규정상 미반영), ㄴ·ㄹ 첨가(학여울), 용언의 ㄱㄷㅂ+ㅎ 거센소리(체언 규정 따라 h 유지).
 */
function romanizeWord(word: string): string {
  const s = Array.from(word, (c) => { const d = decompose(c)!; return { cho: d.cho, jung: d.jung, jong: d.jong } })
  for (let i = 0; i < s.length - 1; i++) {
    const a = s[i], b = s[i + 1]
    let F = a.jong, I = b.cho
    if (!F) continue
    if (I === 'ㅇ' && F !== 'ㅇ') {
      // 연음: ㅎ은 탈락, 겹받침은 뒤 자음만 넘어감 (않아→아나, 닭이→달기)
      if (F === 'ㅎ') F = ''
      else if (F === 'ㄶ' || F === 'ㅀ') { I = F === 'ㄶ' ? 'ㄴ' : 'ㄹ'; F = '' }
      else if (SPLIT[F]) { I = SPLIT[F][1]; F = SPLIT[F][0] }
      else { I = F; F = '' }
      if (b.jung === 'ㅣ' && (I === 'ㄷ' || I === 'ㅌ')) I = I === 'ㄷ' ? 'ㅈ' : 'ㅊ' // 해돋이, 같이
    } else {
      const h = F === 'ㅎ' || F === 'ㄶ' || F === 'ㅀ'
      const rest = F === 'ㄶ' ? 'ㄴ' : F === 'ㅀ' ? 'ㄹ' : ''
      if (h && ASPIRATE[I]) { I = ASPIRATE[I]; F = rest } // 좋고, 않다, 싫다
      else if (h && I === 'ㅅ') F = rest // 좋소 (된소리 미반영)
      else if (F === 'ㅎ' && I === 'ㄴ') F = 'ㄴ' // 놓는
      else if (F === 'ㄷ' && I === 'ㅎ' && b.jung === 'ㅣ') { F = ''; I = 'ㅊ' } // 굳히다
      else if (F === 'ㄺ' && I === 'ㄱ') F = 'ㄹ' // 맑게
      else if (h) F = rest || 'ㄷ'
      F = neutral(F)
      if (I === 'ㄹ' && (F === 'ㄱ' || F === 'ㄷ' || F === 'ㅂ' || F === 'ㅁ' || F === 'ㅇ')) I = 'ㄴ' // 독립, 종로
      if ((I === 'ㄴ' || I === 'ㅁ') && NASAL[F]) F = NASAL[F] // 백마, 독립→동닙
      if (F === 'ㄴ' && I === 'ㄹ') F = 'ㄹ' // 신라
      else if (F === 'ㄹ' && I === 'ㄴ') I = 'ㄹ' // 별내
    }
    a.jong = F; b.cho = I
  }
  const last = s[s.length - 1]
  last.jong = last.jong === 'ㄶ' ? 'ㄴ' : last.jong === 'ㅀ' ? 'ㄹ' : neutral(last.jong)
  let r = ''
  s.forEach((x, i) => {
    const prevL = i > 0 && s[i - 1].jong === 'ㄹ'
    r += (x.cho === 'ㄹ' && prevL ? 'l' : R_CHO[x.cho]) + R_JUNG[JUNG.indexOf(x.jung)] + R_JONG[neutral(x.jong)]
  })
  return r
}

/** 어절(공백·기호로 구분) 단위 로마자. capitalize=true면 어절 첫 글자 대문자 */
export function romanize(text: string, capitalize = false): string {
  return nfc(text).replace(/[가-힣]+/g, (w) => {
    const r = romanizeWord(w)
    return capitalize ? r.charAt(0).toUpperCase() + r.slice(1) : r
  })
}

// ── 조사 자동 선택 ──

export const JOSA_PAIRS = [['을', '를'], ['이', '가'], ['은', '는'], ['과', '와'], ['으로', '로'], ['이랑', '랑'], ['아', '야']] as const
export type JosaPair = (typeof JOSA_PAIRS)[number]

/** 숫자 끝자리 읽기의 받침: 0영 1일 2이 3삼 4사 5오 6육 7칠 8팔 9구 */
const DIGIT_JONG = ['ㅇ', 'ㄹ', '', 'ㅁ', '', '', 'ㄱ', 'ㄹ', 'ㄹ', '']

/** 마지막 글자의 받침. 받침 없음 = '', 판별 불가(영문 등) = null. 괄호·따옴표 등 뒤 기호는 건너뜀 */
export function finalConsonant(word: string): string | null {
  const chars = Array.from(nfc(word).trim())
  for (let i = chars.length - 1; i >= 0; i--) {
    const c = chars[i]
    const d = decompose(c)
    if (d) return d.jong
    if (/[0-9]/.test(c)) return DIGIT_JONG[+c]
    if (/[)\]}"'’”.,!?\s]/.test(c)) continue
    return null
  }
  return null
}

/** 조사 선택. [받침 있을 때, 없을 때]. 으로/로는 ㄹ받침이면 '로'. 판별 불가면 '을(를)' 병기 */
export function josa(word: string, pair: readonly [string, string]): string {
  const f = finalConsonant(word)
  if (f === null) return `${pair[0]}(${pair[1]})`
  if (pair[0] === '으로' && f === 'ㄹ') return pair[1]
  return f ? pair[0] : pair[1]
}

export const JOSA_SNIPPET = `// 받침 유무로 조사 고르기 (으로/로는 ㄹ받침이면 '로')
function josa(word, [withJong, withoutJong]) {
  const c = word.charCodeAt(word.length - 1) - 0xac00
  if (c < 0 || c > 11171) return withJong + '(' + withoutJong + ')'
  const jong = c % 28
  if (withJong === '으로' && jong === 8) return withoutJong
  return jong ? withJong : withoutJong
}
josa('사과', ['을', '를']) // '를'`
