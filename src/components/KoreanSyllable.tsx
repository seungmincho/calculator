'use client'

import { useState, useCallback, useMemo } from 'react'
import { useTranslations } from 'next-intl'
import { Copy, Check, RotateCcw, BookOpen, Type } from 'lucide-react'

type Mode = 'chosung' | 'decompose' | 'compose'

interface DecomposedChar {
  original: string
  chosung: string
  jungsung: string
  jongsung: string
}

// Korean Unicode constants
const HANGUL_BASE = 0xAC00
const HANGUL_END = 0xD7A3
const CHOSUNG_COUNT = 19
const JUNGSUNG_COUNT = 21
const JONGSUNG_COUNT = 28

const CHOSUNG_LIST = ['ㄱ', 'ㄲ', 'ㄴ', 'ㄷ', 'ㄸ', 'ㄹ', 'ㅁ', 'ㅂ', 'ㅃ', 'ㅅ', 'ㅆ', 'ㅇ', 'ㅈ', 'ㅉ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ']
const JUNGSUNG_LIST = ['ㅏ', 'ㅐ', 'ㅑ', 'ㅒ', 'ㅓ', 'ㅔ', 'ㅕ', 'ㅖ', 'ㅗ', 'ㅘ', 'ㅙ', 'ㅚ', 'ㅛ', 'ㅜ', 'ㅝ', 'ㅞ', 'ㅟ', 'ㅠ', 'ㅡ', 'ㅢ', 'ㅣ']
const JONGSUNG_LIST = ['', 'ㄱ', 'ㄲ', 'ㄳ', 'ㄴ', 'ㄵ', 'ㄶ', 'ㄷ', 'ㄹ', 'ㄺ', 'ㄻ', 'ㄼ', 'ㄽ', 'ㄾ', 'ㄿ', 'ㅀ', 'ㅁ', 'ㅂ', 'ㅄ', 'ㅅ', 'ㅆ', 'ㅇ', 'ㅈ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ']

function isHangulSyllable(char: string): boolean {
  const code = char.charCodeAt(0)
  return code >= HANGUL_BASE && code <= HANGUL_END
}

function extractChosung(text: string): string {
  return Array.from(text)
    .map(char => {
      if (!isHangulSyllable(char)) return ''
      const code = char.charCodeAt(0) - HANGUL_BASE
      const chosungIndex = Math.floor(code / (JUNGSUNG_COUNT * JONGSUNG_COUNT))
      return CHOSUNG_LIST[chosungIndex]
    })
    .join('')
}

function decomposeChar(char: string): DecomposedChar {
  if (!isHangulSyllable(char)) {
    return {
      original: char,
      chosung: '',
      jungsung: '',
      jongsung: ''
    }
  }

  const code = char.charCodeAt(0) - HANGUL_BASE
  const chosungIndex = Math.floor(code / (JUNGSUNG_COUNT * JONGSUNG_COUNT))
  const jungsungIndex = Math.floor((code % (JUNGSUNG_COUNT * JONGSUNG_COUNT)) / JONGSUNG_COUNT)
  const jongsungIndex = code % JONGSUNG_COUNT

  return {
    original: char,
    chosung: CHOSUNG_LIST[chosungIndex],
    jungsung: JUNGSUNG_LIST[jungsungIndex],
    jongsung: JONGSUNG_LIST[jongsungIndex]
  }
}

function decomposeText(text: string): DecomposedChar[] {
  return Array.from(text).map(char => decomposeChar(char))
}

function composeJamo(chosung: string, jungsung: string, jongsung: string = ''): string {
  const chosungIndex = CHOSUNG_LIST.indexOf(chosung)
  const jungsungIndex = JUNGSUNG_LIST.indexOf(jungsung)
  const jongsungIndex = jongsung ? JONGSUNG_LIST.indexOf(jongsung) : 0

  if (chosungIndex === -1 || jungsungIndex === -1 || jongsungIndex === -1) {
    return ''
  }

  const code = HANGUL_BASE + (chosungIndex * JUNGSUNG_COUNT + jungsungIndex) * JONGSUNG_COUNT + jongsungIndex
  return String.fromCharCode(code)
}

function composeText(jamoText: string): string {
  // Simple composition: expects jamo separated by spaces or continuous
  // Example: "ㅎㅏㄴ" -> "한"
  const jamos = Array.from(jamoText.replace(/\s+/g, ''))
  const result: string[] = []
  let i = 0

  while (i < jamos.length) {
    const char1 = jamos[i]
    const char2 = jamos[i + 1]
    const char3 = jamos[i + 2]

    // Check if char1 is chosung
    if (CHOSUNG_LIST.includes(char1) && char2 && JUNGSUNG_LIST.includes(char2)) {
      // Try to compose with optional jongsung
      if (char3 && JONGSUNG_LIST.includes(char3) && char3 !== '') {
        const composed = composeJamo(char1, char2, char3)
        if (composed) {
          result.push(composed)
          i += 3
          continue
        }
      }
      // Compose without jongsung
      const composed = composeJamo(char1, char2, '')
      if (composed) {
        result.push(composed)
        i += 2
        continue
      }
    }

    // If not composable, just add the character
    result.push(char1)
    i++
  }

  return result.join('')
}

export default function KoreanSyllable() {
  const t = useTranslations('koreanSyllable')
  const [mode, setMode] = useState<Mode>('chosung')
  const [inputText, setInputText] = useState('')
  const [composeInput, setComposeInput] = useState('')
  const [copiedId, setCopiedId] = useState<string | null>(null)

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

  const result = useMemo(() => {
    if (mode === 'chosung') {
      return extractChosung(inputText)
    } else if (mode === 'decompose') {
      return decomposeText(inputText)
    } else {
      return composeText(composeInput)
    }
  }, [mode, inputText, composeInput])

  const stats = useMemo(() => {
    const charCount = inputText.length
    const syllableCount = Array.from(inputText).filter(char => isHangulSyllable(char)).length
    return { charCount, syllableCount }
  }, [inputText])

  const handleExampleClick = useCallback((text: string) => {
    setInputText(text)
  }, [])

  const handleReset = useCallback(() => {
    setInputText('')
    setComposeInput('')
  }, [])

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('title')}</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('description')}</p>
      </div>

      {/* Mode Tabs */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-2">
        <div className="grid grid-cols-3 gap-2">
          <button
            onClick={() => setMode('chosung')}
            className={`px-4 py-3 rounded-lg font-medium transition-all ${
              mode === 'chosung'
                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            {t('mode.chosung')}
          </button>
          <button
            onClick={() => setMode('decompose')}
            className={`px-4 py-3 rounded-lg font-medium transition-all ${
              mode === 'decompose'
                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            {t('mode.decompose')}
          </button>
          <button
            onClick={() => setMode('compose')}
            className={`px-4 py-3 rounded-lg font-medium transition-all ${
              mode === 'compose'
                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            {t('mode.compose')}
          </button>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid lg:grid-cols-3 gap-8">
        {/* Left Panel: Input */}
        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 space-y-4">
            <div className="flex items-center justify-between">
              <label className="block text-sm font-medium text-gray-900 dark:text-white">
                <Type className="w-4 h-4 inline mr-2" />
                {t('input')}
              </label>
              <button
                onClick={handleReset}
                className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>

            {mode === 'compose' ? (
              <textarea
                value={composeInput}
                onChange={(e) => setComposeInput(e.target.value)}
                placeholder="ㅎㅏㄴㄱㅡㄹ"
                rows={6}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 font-mono"
              />
            ) : (
              <textarea
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder={t('placeholder')}
                rows={6}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
              />
            )}

            {mode !== 'compose' && (
              <>
                <div>
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t('examples')}
                  </p>
                  <div className="space-y-2">
                    {['대한민국', '안녕하세요', '프로그래밍'].map((text, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleExampleClick(text)}
                        className="w-full px-3 py-2 text-left text-sm bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg transition-colors"
                      >
                        {text}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">{t('charCount')}</span>
                    <span className="font-medium text-gray-900 dark:text-white">{stats.charCount}</span>
                  </div>
                  <div className="flex justify-between text-sm mt-2">
                    <span className="text-gray-600 dark:text-gray-400">{t('syllableCount')}</span>
                    <span className="font-medium text-gray-900 dark:text-white">{stats.syllableCount}</span>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Right Panel: Result */}
        <div className="lg:col-span-2">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                {t('result')}
              </h2>
              {mode !== 'decompose' && (
                <button
                  onClick={() => copyToClipboard(typeof result === 'string' ? result : '', 'result')}
                  disabled={!result || typeof result !== 'string'}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {copiedId === 'result' ? (
                    <>
                      <Check className="w-4 h-4" />
                      <span className="text-sm">{t('copied')}</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      <span className="text-sm">{t('copy')}</span>
                    </>
                  )}
                </button>
              )}
            </div>

            {mode === 'chosung' && (
              <div className="bg-blue-50 dark:bg-blue-950 rounded-xl p-6">
                <p className="text-4xl font-bold text-blue-900 dark:text-blue-100 break-all tracking-wider">
                  {(typeof result === 'string' ? result : '') || '결과가 여기 표시됩니다'}
                </p>
              </div>
            )}

            {mode === 'compose' && (
              <div className="bg-green-50 dark:bg-green-950 rounded-xl p-6">
                <p className="text-4xl font-bold text-green-900 dark:text-green-100 break-all">
                  {(typeof result === 'string' ? result : '') || '결과가 여기 표시됩니다'}
                </p>
              </div>
            )}

            {mode === 'decompose' && Array.isArray(result) && (
              <div className="space-y-4">
                {result.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="border-b-2 border-gray-300 dark:border-gray-600">
                          <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white">
                            {t('original')}
                          </th>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-blue-700 dark:text-blue-400">
                            {t('chosung')}
                          </th>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-green-700 dark:text-green-400">
                            {t('jungsung')}
                          </th>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-orange-700 dark:text-orange-400">
                            {t('jongsung')}
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {result.map((item, idx) => (
                          <tr key={idx} className="border-b border-gray-200 dark:border-gray-700">
                            <td className="px-4 py-3 text-2xl font-bold text-gray-900 dark:text-white">
                              {item.original}
                            </td>
                            <td className="px-4 py-3 text-2xl font-bold text-blue-700 dark:text-blue-400">
                              {item.chosung || '-'}
                            </td>
                            <td className="px-4 py-3 text-2xl font-bold text-green-700 dark:text-green-400">
                              {item.jungsung || '-'}
                            </td>
                            <td className="px-4 py-3 text-2xl font-bold text-orange-700 dark:text-orange-400">
                              {item.jongsung || '-'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-gray-500 dark:text-gray-400 text-center py-8">
                    결과가 여기 표시됩니다
                  </p>
                )}

                {result.length > 0 && (
                  <div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-4">
                    <div className="flex flex-wrap gap-4 text-sm">
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 bg-blue-500 rounded"></div>
                        <span className="text-gray-700 dark:text-gray-300">{t('chosung')}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 bg-green-500 rounded"></div>
                        <span className="text-gray-700 dark:text-gray-300">{t('jungsung')}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 bg-orange-500 rounded"></div>
                        <span className="text-gray-700 dark:text-gray-300">{t('jongsung')}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Guide Section */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
          <BookOpen className="w-5 h-5" />
          {t('guide.title')}
        </h2>

        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
              {t('guide.structure.title')}
            </h3>
            <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300">
              {(t.raw('guide.structure.items') as string[]).map((item, idx) => (
                <li key={idx}>{item}</li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
              모드 안내
            </h3>
            <div className="space-y-4">
              <div className="bg-blue-50 dark:bg-blue-950 rounded-lg p-4">
                <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
                  초성 추출
                </h4>
                <p className="text-blue-800 dark:text-blue-200 text-sm mb-2">
                  한글 텍스트에서 각 글자의 첫소리(초성)만 추출합니다.
                </p>
                <p className="text-blue-700 dark:text-blue-300 text-sm font-mono">
                  예: 대한민국 → ㄷㅎㅁㄱ
                </p>
              </div>

              <div className="bg-green-50 dark:bg-green-950 rounded-lg p-4">
                <h4 className="font-semibold text-green-900 dark:text-green-100 mb-2">
                  자모 분리
                </h4>
                <p className="text-green-800 dark:text-green-200 text-sm mb-2">
                  한글을 초성, 중성, 종성으로 완전히 분해하여 표시합니다.
                </p>
                <p className="text-green-700 dark:text-green-300 text-sm font-mono">
                  예: 한 → ㅎ(초성) + ㅏ(중성) + ㄴ(종성)
                </p>
              </div>

              <div className="bg-orange-50 dark:bg-orange-950 rounded-lg p-4">
                <h4 className="font-semibold text-orange-900 dark:text-orange-100 mb-2">
                  자모 합치기
                </h4>
                <p className="text-orange-800 dark:text-orange-200 text-sm mb-2">
                  자음과 모음을 입력하면 완성된 한글로 조합합니다.
                </p>
                <p className="text-orange-700 dark:text-orange-300 text-sm font-mono">
                  예: ㅎㅏㄴ → 한
                </p>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
              {t('guide.usage.title')}
            </h3>
            <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300">
              {(t.raw('guide.usage.items') as string[]).map((item, idx) => (
                <li key={idx}>{item}</li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
              한글 자모 구성
            </h3>
            <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 space-y-2">
              <p className="text-sm text-gray-700 dark:text-gray-300">
                한글은 유니코드 0xAC00 ~ 0xD7A3 범위에 11,172개의 완성형 글자가 정의되어 있습니다.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                <div className="bg-blue-100 dark:bg-blue-900 rounded-lg p-3">
                  <p className="text-xs font-semibold text-blue-900 dark:text-blue-100 mb-1">
                    초성
                  </p>
                  <p className="text-xs text-blue-800 dark:text-blue-200 font-mono">
                    19개
                  </p>
                </div>
                <div className="bg-green-100 dark:bg-green-900 rounded-lg p-3">
                  <p className="text-xs font-semibold text-green-900 dark:text-green-100 mb-1">
                    중성
                  </p>
                  <p className="text-xs text-green-800 dark:text-green-200 font-mono">
                    21개
                  </p>
                </div>
                <div className="bg-orange-100 dark:bg-orange-900 rounded-lg p-3">
                  <p className="text-xs font-semibold text-orange-900 dark:text-orange-100 mb-1">
                    종성
                  </p>
                  <p className="text-xs text-orange-800 dark:text-orange-200 font-mono">
                    28개 (없음 포함)
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
