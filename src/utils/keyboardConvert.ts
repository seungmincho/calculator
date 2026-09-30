/** 두벌식 한영 타자 변환 (KeyboardConverter). 검증: node scripts/check-keyboard-convert.ts */

// ── Korean keyboard mapping tables ──

const ENG_TO_KOR: Record<string, string> = {
  'q': 'ㅂ', 'w': 'ㅈ', 'e': 'ㄷ', 'r': 'ㄱ', 't': 'ㅅ',
  'y': 'ㅛ', 'u': 'ㅕ', 'i': 'ㅑ', 'o': 'ㅐ', 'p': 'ㅔ',
  'a': 'ㅁ', 's': 'ㄴ', 'd': 'ㅇ', 'f': 'ㄹ', 'g': 'ㅎ',
  'h': 'ㅗ', 'j': 'ㅓ', 'k': 'ㅏ', 'l': 'ㅣ',
  'z': 'ㅋ', 'x': 'ㅌ', 'c': 'ㅊ', 'v': 'ㅍ',
  'b': 'ㅠ', 'n': 'ㅜ', 'm': 'ㅡ',
  'Q': 'ㅃ', 'W': 'ㅉ', 'E': 'ㄸ', 'R': 'ㄲ', 'T': 'ㅆ',
  'O': 'ㅒ', 'P': 'ㅖ',
}

const KOR_TO_ENG: Record<string, string> = {}
for (const [eng, kor] of Object.entries(ENG_TO_KOR)) {
  KOR_TO_ENG[kor] = eng
}

// Hangul Unicode constants
const CHO_LIST = ['ㄱ','ㄲ','ㄴ','ㄷ','ㄸ','ㄹ','ㅁ','ㅂ','ㅃ','ㅅ','ㅆ','ㅇ','ㅈ','ㅉ','ㅊ','ㅋ','ㅌ','ㅍ','ㅎ']
const JUNG_LIST = ['ㅏ','ㅐ','ㅑ','ㅒ','ㅓ','ㅔ','ㅕ','ㅖ','ㅗ','ㅘ','ㅙ','ㅚ','ㅛ','ㅜ','ㅝ','ㅞ','ㅟ','ㅠ','ㅡ','ㅢ','ㅣ']
const JONG_LIST = ['','ㄱ','ㄲ','ㄳ','ㄴ','ㄵ','ㄶ','ㄷ','ㄹ','ㄺ','ㄻ','ㄼ','ㄽ','ㄾ','ㄿ','ㅀ','ㅁ','ㅂ','ㅄ','ㅅ','ㅆ','ㅇ','ㅈ','ㅊ','ㅋ','ㅌ','ㅍ','ㅎ']

const CHO_SET = new Set(CHO_LIST)
const JUNG_SET = new Set(JUNG_LIST)

// Jamo that can be chosung (initial consonant)
const JAMO_TO_CHO: Record<string, number> = {}
CHO_LIST.forEach((c, i) => { JAMO_TO_CHO[c] = i })

const JAMO_TO_JUNG: Record<string, number> = {}
JUNG_LIST.forEach((v, i) => { JAMO_TO_JUNG[v] = i })

const JAMO_TO_JONG: Record<string, number> = {}
JONG_LIST.forEach((j, i) => { JAMO_TO_JONG[j] = i })

// Compound vowel combinations: base + added = compound
const COMPOUND_VOWELS: Record<string, Record<string, string>> = {
  'ㅗ': { 'ㅏ': 'ㅘ', 'ㅐ': 'ㅙ', 'ㅣ': 'ㅚ' },
  'ㅜ': { 'ㅓ': 'ㅝ', 'ㅔ': 'ㅞ', 'ㅣ': 'ㅟ' },
  'ㅡ': { 'ㅣ': 'ㅢ' },
}

// Compound jongseong (final consonant) combinations
const COMPOUND_JONG: Record<string, Record<string, string>> = {
  'ㄱ': { 'ㅅ': 'ㄳ' },
  'ㄴ': { 'ㅈ': 'ㄵ', 'ㅎ': 'ㄶ' },
  'ㄹ': { 'ㄱ': 'ㄺ', 'ㅁ': 'ㄻ', 'ㅂ': 'ㄼ', 'ㅅ': 'ㄽ', 'ㅌ': 'ㄾ', 'ㅍ': 'ㄿ', 'ㅎ': 'ㅀ' },
  'ㅂ': { 'ㅅ': 'ㅄ' },
}

// Decompose compound jongseong into two single jamo
const DECOMPOSE_JONG: Record<string, [string, string]> = {
  'ㄳ': ['ㄱ', 'ㅅ'],
  'ㄵ': ['ㄴ', 'ㅈ'],
  'ㄶ': ['ㄴ', 'ㅎ'],
  'ㄺ': ['ㄹ', 'ㄱ'],
  'ㄻ': ['ㄹ', 'ㅁ'],
  'ㄼ': ['ㄹ', 'ㅂ'],
  'ㄽ': ['ㄹ', 'ㅅ'],
  'ㄾ': ['ㄹ', 'ㅌ'],
  'ㄿ': ['ㄹ', 'ㅍ'],
  'ㅀ': ['ㄹ', 'ㅎ'],
  'ㅄ': ['ㅂ', 'ㅅ'],
}

// Decompose compound vowels
const DECOMPOSE_VOWEL: Record<string, [string, string]> = {
  'ㅘ': ['ㅗ', 'ㅏ'],
  'ㅙ': ['ㅗ', 'ㅐ'],
  'ㅚ': ['ㅗ', 'ㅣ'],
  'ㅝ': ['ㅜ', 'ㅓ'],
  'ㅞ': ['ㅜ', 'ㅔ'],
  'ㅟ': ['ㅜ', 'ㅣ'],
  'ㅢ': ['ㅡ', 'ㅣ'],
}

const HANGUL_BASE = 0xAC00

function isConsonant(jamo: string): boolean {
  return CHO_SET.has(jamo)
}

function isVowel(jamo: string): boolean {
  return JUNG_SET.has(jamo)
}

function composeHangul(cho: number, jung: number, jong: number): string {
  return String.fromCharCode(HANGUL_BASE + (cho * 21 + jung) * 28 + jong)
}

// ── Eng→Kor: assemble jamo into hangul syllables ──

export function engToKorConvert(text: string): string {
  // CapsLock: 영문자가 전부 대문자면 Shift(쌍자음)가 아니라 CapsLock으로 보고 소문자로 처리
  if (/[A-Z]/.test(text) && !/[a-z]/.test(text)) text = text.toLowerCase()

  // First, map each english character to its jamo
  const jamos: string[] = []
  for (const ch of text) {
    const mapped = ENG_TO_KOR[ch] ?? ENG_TO_KOR[ch.toLowerCase()]
    if (mapped) {
      jamos.push(mapped)
    } else {
      jamos.push(ch)
    }
  }

  // State machine to assemble jamo into syllables
  let result = ''
  let cho = -1    // current chosung index
  let jung = -1   // current jungseong index
  let jong = -1   // current jongseong index
  let jongJamo = '' // the actual jamo for current jongseong (needed for compound decomposition)

  // 직전에 단독 모음을 출력했다면 이어지는 모음과 겹모음으로 합침
  let lastLoneVowel = ''
  const pushLoneVowel = (v: string) => {
    const combined = lastLoneVowel && COMPOUND_VOWELS[lastLoneVowel]?.[v]
    if (combined) {
      result = result.slice(0, -1) + combined
      lastLoneVowel = ''
    } else {
      result += v
      lastLoneVowel = v
    }
  }

  const flush = () => {
    if (cho >= 0 && jung >= 0) {
      result += composeHangul(cho, jung, jong >= 0 ? jong : 0)
    } else if (cho >= 0) {
      result += CHO_LIST[cho]
    }
    cho = -1
    jung = -1
    jong = -1
    jongJamo = ''
  }

  for (let i = 0; i < jamos.length; i++) {
    const jamo = jamos[i]
    if (!isVowel(jamo)) lastLoneVowel = ''

    if (isConsonant(jamo)) {
      if (cho < 0) {
        // No current syllable - start new one with this as chosung
        cho = JAMO_TO_CHO[jamo] ?? -1
      } else if (jung < 0) {
        // Have chosung but no vowel - previous chosung is standalone
        result += CHO_LIST[cho]
        cho = JAMO_TO_CHO[jamo] ?? -1
      } else if (jong < 0) {
        // Have cho+jung, no jong yet
        // Check if this consonant can be jongseong
        if (JAMO_TO_JONG[jamo] !== undefined && JAMO_TO_JONG[jamo] > 0) {
          jong = JAMO_TO_JONG[jamo]
          jongJamo = jamo
        } else {
          // Cannot be jongseong (shouldn't happen for standard jamo, but safety)
          flush()
          cho = JAMO_TO_CHO[jamo] ?? -1
        }
      } else {
        // Already have jong - try compound jongseong
        if (COMPOUND_JONG[jongJamo] && COMPOUND_JONG[jongJamo][jamo]) {
          const compound = COMPOUND_JONG[jongJamo][jamo]
          jong = JAMO_TO_JONG[compound]
          jongJamo = compound
        } else {
          // Can't compound - flush current syllable, start new one
          flush()
          cho = JAMO_TO_CHO[jamo] ?? -1
        }
      }
    } else if (isVowel(jamo)) {
      if (cho < 0 && jung < 0) {
        // Standalone vowel
        pushLoneVowel(jamo)
      } else if (cho >= 0 && jung < 0) {
        // Have chosung, add jungseong
        jung = JAMO_TO_JUNG[jamo]
      } else if (cho >= 0 && jung >= 0 && jong < 0) {
        // Have cho+jung, no jong - try compound vowel
        const currentVowel = JUNG_LIST[jung]
        if (COMPOUND_VOWELS[currentVowel] && COMPOUND_VOWELS[currentVowel][jamo]) {
          const compound = COMPOUND_VOWELS[currentVowel][jamo]
          jung = JAMO_TO_JUNG[compound]
        } else {
          // Can't compound vowel - flush and treat as standalone vowel
          flush()
          pushLoneVowel(jamo)
        }
      } else if (cho >= 0 && jung >= 0 && jong >= 0) {
        // Have cho+jung+jong, vowel comes - split jongseong
        if (DECOMPOSE_JONG[jongJamo]) {
          // Compound jongseong: first part stays, second becomes next chosung
          const [first, second] = DECOMPOSE_JONG[jongJamo]
          jong = JAMO_TO_JONG[first]
          jongJamo = first
          // Flush current syllable
          result += composeHangul(cho, jung, jong)
          // Start new syllable
          cho = JAMO_TO_CHO[second] ?? -1
          jung = JAMO_TO_JUNG[jamo]
          jong = -1
          jongJamo = ''
        } else {
          // Simple jongseong becomes next chosung
          const prevJong = jongJamo
          jong = -1
          jongJamo = ''
          // Flush without jongseong
          flush()
          // Start new syllable
          cho = JAMO_TO_CHO[prevJong] ?? -1
          jung = JAMO_TO_JUNG[jamo]
        }
      } else {
        // Standalone vowel
        flush()
        pushLoneVowel(jamo)
      }
    } else {
      // Non-Korean character
      flush()
      result += jamo
    }
  }

  // Flush remaining
  flush()

  return result
}

// ── Kor→Eng: decompose hangul syllables to english keys ──

export function korToEngConvert(text: string): string {
  let result = ''

  for (const ch of text) {
    const code = ch.charCodeAt(0)

    if (code >= HANGUL_BASE && code <= 0xD7A3) {
      // Composed hangul syllable
      const offset = code - HANGUL_BASE
      const choIdx = Math.floor(offset / (21 * 28))
      const jungIdx = Math.floor((offset % (21 * 28)) / 28)
      const jongIdx = offset % 28

      const choJamo = CHO_LIST[choIdx]
      const jungJamo = JUNG_LIST[jungIdx]
      const jongJamo = jongIdx > 0 ? JONG_LIST[jongIdx] : null

      // Convert chosung to english
      result += jameToEng(choJamo)

      // Convert jungseong (may be compound vowel)
      if (DECOMPOSE_VOWEL[jungJamo]) {
        const [v1, v2] = DECOMPOSE_VOWEL[jungJamo]
        result += jameToEng(v1)
        result += jameToEng(v2)
      } else {
        result += jameToEng(jungJamo)
      }

      // Convert jongseong (may be compound consonant)
      if (jongJamo) {
        if (DECOMPOSE_JONG[jongJamo]) {
          const [j1, j2] = DECOMPOSE_JONG[jongJamo]
          result += jameToEng(j1)
          result += jameToEng(j2)
        } else {
          result += jameToEng(jongJamo)
        }
      }
    } else if (KOR_TO_ENG[ch]) {
      // Standalone jamo
      result += KOR_TO_ENG[ch]
    } else if (DECOMPOSE_VOWEL[ch] || DECOMPOSE_JONG[ch]) {
      // Standalone compound jamo (ㅘ, ㄺ ...)
      const [a, b] = DECOMPOSE_VOWEL[ch] || DECOMPOSE_JONG[ch]
      result += jameToEng(a) + jameToEng(b)
    } else {
      // Non-Korean character - pass through
      result += ch
    }
  }

  return result
}

/** 한글(완성형+자모)이 있고 영문자보다 적지 않으면 한→영, 아니면 영→한 */
export function detectMode(text: string): 'engToKor' | 'korToEng' {
  const hangul = (text.match(/[가-힣ㄱ-ㅣ]/g) || []).length
  const latin = (text.match(/[a-zA-Z]/g) || []).length
  return hangul > 0 && hangul >= latin ? 'korToEng' : 'engToKor'
}

function jameToEng(jamo: string): string {
  return KOR_TO_ENG[jamo] || jamo
}
