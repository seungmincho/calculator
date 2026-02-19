'use client'

import { useState, useCallback, useMemo } from 'react'
import { useTranslations } from 'next-intl'
import { Hash, Copy, Check, RotateCcw, BookOpen, ArrowLeftRight } from 'lucide-react'

type ConversionMode = 'toRoman' | 'toArabic'

interface ConversionResult {
  arabic: number
  roman: string
  error?: string
}

const romanValues: [number, string][] = [
  [1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'],
  [100, 'C'], [90, 'XC'], [50, 'L'], [40, 'XL'],
  [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']
]

const romanMap: Record<string, number> = {
  I: 1, V: 5, X: 10, L: 50, C: 100, D: 500, M: 1000
}

const referenceValues: [string, number][] = [
  ['I', 1], ['V', 5], ['X', 10], ['L', 50], ['C', 100], ['D', 500], ['M', 1000]
]

const quickNumbers = [1, 4, 5, 9, 10, 40, 50, 90, 100, 500, 1000, 2024, 2025, 2026]

function toRoman(num: number): string {
  let result = ''
  let remaining = num
  for (const [value, symbol] of romanValues) {
    while (remaining >= value) {
      result += symbol
      remaining -= value
    }
  }
  return result
}

function toArabic(roman: string): number {
  let result = 0
  const upperRoman = roman.toUpperCase()
  for (let i = 0; i < upperRoman.length; i++) {
    const current = romanMap[upperRoman[i]]
    const next = romanMap[upperRoman[i + 1]] || 0
    if (current < next) {
      result -= current
    } else {
      result += current
    }
  }
  return result
}

function isValidRomanNumeral(roman: string): boolean {
  const pattern = /^M{0,3}(CM|CD|D?C{0,3})(XC|XL|L?X{0,3})(IX|IV|V?I{0,3})$/i
  return pattern.test(roman)
}

export default function RomanNumeral() {
  const t = useTranslations('romanNumeral')
  const [mode, setMode] = useState<ConversionMode>('toRoman')
  const [inputValue, setInputValue] = useState('')
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

  const conversionResult = useMemo((): ConversionResult | null => {
    if (!inputValue.trim()) return null

    if (mode === 'toRoman') {
      const num = parseInt(inputValue, 10)
      if (isNaN(num)) {
        return { arabic: 0, roman: '', error: t('invalidNumber') }
      }
      if (num < 1 || num > 3999) {
        return { arabic: num, roman: '', error: t('invalidNumber') }
      }
      return { arabic: num, roman: toRoman(num) }
    } else {
      const upperInput = inputValue.toUpperCase()
      if (!isValidRomanNumeral(upperInput)) {
        return { arabic: 0, roman: upperInput, error: t('invalidRoman') }
      }
      const arabic = toArabic(upperInput)
      if (arabic < 1 || arabic > 3999) {
        return { arabic, roman: upperInput, error: t('invalidNumber') }
      }
      return { arabic, roman: upperInput }
    }
  }, [inputValue, mode, t])

  const handleQuickNumber = useCallback((num: number) => {
    if (mode === 'toRoman') {
      setInputValue(String(num))
    } else {
      setInputValue(toRoman(num))
    }
  }, [mode])

  const handleReset = useCallback(() => {
    setInputValue('')
  }, [])

  const handleInputChange = useCallback((value: string) => {
    if (mode === 'toArabic') {
      setInputValue(value.toUpperCase())
    } else {
      setInputValue(value)
    }
  }, [mode])

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('title')}</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('description')}</p>
      </div>

      {/* Main Grid */}
      <div className="grid lg:grid-cols-3 gap-8">
        {/* Left Panel: Settings */}
        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 space-y-6">
            {/* Mode Tabs */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                변환 모드
              </label>
              <div className="flex gap-2">
                <button
                  onClick={() => { setMode('toRoman'); setInputValue('') }}
                  className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
                    mode === 'toRoman'
                      ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  <div className="flex items-center justify-center gap-2">
                    <Hash className="w-4 h-4" />
                    <ArrowLeftRight className="w-3 h-3" />
                    <span className="font-serif">I</span>
                  </div>
                  <div className="text-xs mt-1">{t('mode.toRoman')}</div>
                </button>
                <button
                  onClick={() => { setMode('toArabic'); setInputValue('') }}
                  className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
                    mode === 'toArabic'
                      ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  <div className="flex items-center justify-center gap-2">
                    <span className="font-serif">I</span>
                    <ArrowLeftRight className="w-3 h-3" />
                    <Hash className="w-4 h-4" />
                  </div>
                  <div className="text-xs mt-1">{t('mode.toArabic')}</div>
                </button>
              </div>
            </div>

            {/* Input Field */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {mode === 'toRoman' ? t('inputNumber') : t('inputRoman')}
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={inputValue}
                  onChange={(e) => handleInputChange(e.target.value)}
                  placeholder={mode === 'toRoman' ? '1~3999 사이의 숫자 입력' : '로마 숫자 입력 (예: XIV)'}
                  className={`w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 ${
                    mode === 'toArabic' ? 'font-serif uppercase' : ''
                  }`}
                />
                {inputValue && (
                  <button
                    onClick={handleReset}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-100 dark:hover:bg-gray-600 rounded"
                    title={t('reset')}
                  >
                    <RotateCcw className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                  </button>
                )}
              </div>
            </div>

            {/* Quick Number Buttons */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('quickNumbers')}
              </label>
              <div className="grid grid-cols-4 gap-2">
                {quickNumbers.map((num) => (
                  <button
                    key={num}
                    onClick={() => handleQuickNumber(num)}
                    className="px-2 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium transition-colors"
                  >
                    {num}
                  </button>
                ))}
              </div>
            </div>

            {/* Reference Table */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('referenceTable')}
              </label>
              <div className="grid grid-cols-7 gap-2">
                {referenceValues.map(([roman, arabic]) => (
                  <div
                    key={roman}
                    className="bg-blue-50 dark:bg-blue-950 rounded-lg p-2 text-center"
                  >
                    <div className="font-serif text-lg font-bold text-blue-600 dark:text-blue-400">
                      {roman}
                    </div>
                    <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                      {arabic}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Right Panel: Results */}
        <div className="lg:col-span-2">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 space-y-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              {t('result')}
            </h2>

            {!conversionResult && (
              <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                숫자나 로마 숫자를 입력하세요
              </div>
            )}

            {conversionResult?.error && (
              <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg p-4 text-red-700 dark:text-red-400">
                {conversionResult.error}
              </div>
            )}

            {conversionResult && !conversionResult.error && (
              <div className="grid md:grid-cols-2 gap-4">
                {/* Arabic Number Card */}
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900 rounded-xl p-6 border border-blue-200 dark:border-blue-800">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
                      {t('arabicNumber')}
                    </span>
                    <button
                      onClick={() => copyToClipboard(String(conversionResult.arabic), 'arabic')}
                      className="p-1.5 hover:bg-blue-200 dark:hover:bg-blue-800 rounded transition-colors"
                      title={t('copy')}
                    >
                      {copiedId === 'arabic' ? (
                        <Check className="w-4 h-4 text-green-600 dark:text-green-400" />
                      ) : (
                        <Copy className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      )}
                    </button>
                  </div>
                  <div className="text-4xl md:text-5xl font-bold text-blue-600 dark:text-blue-400 break-all">
                    {conversionResult.arabic.toLocaleString()}
                  </div>
                </div>

                {/* Roman Numeral Card */}
                <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950 dark:to-purple-900 rounded-xl p-6 border border-purple-200 dark:border-purple-800">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-purple-700 dark:text-purple-300">
                      {t('romanNumeral')}
                    </span>
                    <button
                      onClick={() => copyToClipboard(conversionResult.roman, 'roman')}
                      className="p-1.5 hover:bg-purple-200 dark:hover:bg-purple-800 rounded transition-colors"
                      title={t('copy')}
                    >
                      {copiedId === 'roman' ? (
                        <Check className="w-4 h-4 text-green-600 dark:text-green-400" />
                      ) : (
                        <Copy className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                      )}
                    </button>
                  </div>
                  <div className="text-4xl md:text-5xl font-bold text-purple-600 dark:text-purple-400 font-serif break-all">
                    {conversionResult.roman}
                  </div>
                </div>
              </div>
            )}

            {/* Information Box */}
            <div className="bg-blue-50 dark:bg-blue-950 rounded-xl p-4 border border-blue-200 dark:border-blue-800">
              <p className="text-sm text-blue-800 dark:text-blue-200">
                {t('maxNumber')}
              </p>
            </div>
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
          {/* Basic Rules */}
          <div>
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-3">
              {t('guide.rules.title')}
            </h3>
            <ul className="space-y-2">
              {(t.raw('guide.rules.items') as string[]).map((item, index) => (
                <li key={index} className="flex items-start gap-2 text-gray-700 dark:text-gray-300">
                  <span className="text-blue-600 dark:text-blue-400 mt-1">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Examples */}
          <div>
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-3">
              {t('guide.examples.title')}
            </h3>
            <div className="grid md:grid-cols-2 gap-4">
              {(t.raw('guide.examples.items') as string[]).map((example, index) => (
                <div
                  key={index}
                  className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3 font-mono text-sm text-gray-700 dark:text-gray-300"
                >
                  {example}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
