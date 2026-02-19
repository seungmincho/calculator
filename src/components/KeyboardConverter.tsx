'use client'

import { useState, useCallback, useMemo } from 'react'
import { useTranslations } from 'next-intl'
import { Copy, Check, ArrowUpDown, RotateCcw, BookOpen } from 'lucide-react'

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

function engToKorConvert(text: string): string {
  // First, map each english character to its jamo
  const jamos: string[] = []
  for (const ch of text) {
    if (ENG_TO_KOR[ch]) {
      jamos.push(ENG_TO_KOR[ch])
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
        // Standalone vowel - output directly
        result += jamo
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
          result += jamo
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
        result += jamo
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

function korToEngConvert(text: string): string {
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
    } else {
      // Non-Korean character - pass through
      result += ch
    }
  }

  return result
}

function jameToEng(jamo: string): string {
  return KOR_TO_ENG[jamo] || jamo
}

// ── Example items (hardcoded, not from translation) ──
const EXAMPLES = [
  { input: 'dkssudgktpdy', output: '안녕하세요' },
  { input: 'rkatkgkqslek', output: '감사합니다' },
  { input: 'tkfkdgody', output: '사랑해요' },
  { input: 'gksrmf', output: '한글' },
]

// ── Component ──

export default function KeyboardConverter() {
  const t = useTranslations('keyboardConverter')
  const [input, setInput] = useState('')
  const [mode, setMode] = useState<'engToKor' | 'korToEng'>('engToKor')
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const output = useMemo(() => {
    if (!input) return ''
    return mode === 'engToKor' ? engToKorConvert(input) : korToEngConvert(input)
  }, [input, mode])

  const copyToClipboard = useCallback(async (text: string, id: string) => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text)
      } else {
        const textarea = document.createElement('textarea')
        textarea.value = text
        textarea.style.position = 'fixed'
        textarea.style.left = '-999999px'
        document.body.appendChild(textarea)
        textarea.select()
        document.execCommand('copy')
        document.body.removeChild(textarea)
      }
      setCopiedId(id)
      setTimeout(() => setCopiedId(null), 2000)
    } catch {
      setCopiedId(id)
      setTimeout(() => setCopiedId(null), 2000)
    }
  }, [])

  const handleSwap = useCallback(() => {
    setInput(output)
    setMode(prev => prev === 'engToKor' ? 'korToEng' : 'engToKor')
  }, [output])

  const handleToggleMode = useCallback(() => {
    setMode(prev => prev === 'engToKor' ? 'korToEng' : 'engToKor')
    setInput('')
  }, [])

  const handleReset = useCallback(() => {
    setInput('')
  }, [])

  const handleExample = useCallback((exInput: string) => {
    setMode('engToKor')
    setInput(exInput)
  }, [])

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('title')}</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('description')}</p>
      </div>

      {/* Main converter card */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 space-y-6">
        {/* Mode toggle */}
        <div className="flex items-center justify-center gap-4">
          <button
            onClick={handleToggleMode}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              mode === 'engToKor'
                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white'
                : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300'
            }`}
          >
            {t('engToKor')}
          </button>
          <button
            onClick={handleToggleMode}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              mode === 'korToEng'
                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white'
                : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300'
            }`}
          >
            {t('korToEng')}
          </button>
        </div>

        {/* Input textarea */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {t('input')}
            </label>
            <span className="text-xs text-gray-400 dark:text-gray-500">
              {input.length} {t('charCount')}
            </span>
          </div>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={t('inputPlaceholder')}
            rows={5}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none text-base"
          />
        </div>

        {/* Action buttons row */}
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={handleSwap}
            disabled={!output}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            title={t('swap')}
          >
            <ArrowUpDown className="w-4 h-4" />
            <span className="text-sm">{t('swap')}</span>
          </button>
          <button
            onClick={handleReset}
            disabled={!input}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <RotateCcw className="w-4 h-4" />
            <span className="text-sm">{t('reset')}</span>
          </button>
        </div>

        {/* Output textarea */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {t('output')}
            </label>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400 dark:text-gray-500">
                {output.length} {t('charCount')}
              </span>
              {output && (
                <button
                  onClick={() => copyToClipboard(output, 'output')}
                  className="flex items-center gap-1 px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-md transition-colors"
                >
                  {copiedId === 'output' ? (
                    <>
                      <Check className="w-3 h-3 text-green-500" />
                      <span className="text-green-500">{t('copied')}</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      <span>{t('copy')}</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
          <textarea
            value={output}
            readOnly
            rows={5}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white resize-none text-base"
          />
        </div>
      </div>

      {/* Examples */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          {t('examples')}
        </h2>
        <div className="grid sm:grid-cols-2 gap-3">
          {EXAMPLES.map((ex, idx) => (
            <button
              key={idx}
              onClick={() => handleExample(ex.input)}
              className="flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-gray-700 hover:bg-blue-50 dark:hover:bg-gray-600 rounded-lg transition-colors text-left"
            >
              <div className="flex items-center gap-3 min-w-0">
                <span className="text-sm font-mono text-blue-600 dark:text-blue-400 truncate">
                  {ex.input}
                </span>
                <span className="text-gray-400 dark:text-gray-500 shrink-0">→</span>
                <span className="text-sm font-medium text-gray-900 dark:text-white truncate">
                  {ex.output}
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Guide section */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
          <BookOpen className="w-5 h-5" />
          {t('guide.title')}
        </h2>
        <div className="space-y-6">
          {/* How to use */}
          <div>
            <h3 className="text-base font-semibold text-gray-800 dark:text-gray-200 mb-3">
              {t('guide.howTo.title')}
            </h3>
            <ul className="space-y-2">
              {(t.raw('guide.howTo.items') as string[]).map((item, idx) => (
                <li key={idx} className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <span className="text-blue-500 mt-0.5 shrink-0">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Tips */}
          <div>
            <h3 className="text-base font-semibold text-gray-800 dark:text-gray-200 mb-3">
              {t('guide.tips.title')}
            </h3>
            <ul className="space-y-2">
              {(t.raw('guide.tips.items') as string[]).map((item, idx) => (
                <li key={idx} className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <span className="text-green-500 mt-0.5 shrink-0">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
