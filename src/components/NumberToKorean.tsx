'use client'

import { useState, useCallback, useMemo } from 'react'
import { useTranslations } from 'next-intl'
import { Hash, Copy, Check, RotateCcw, BookOpen } from 'lucide-react'

export default function NumberToKorean() {
  const t = useTranslations('numberToKorean')
  const [inputValue, setInputValue] = useState<string>('')
  const [copiedId, setCopiedId] = useState<string | null>(null)

  // Korean number system constants
  const koreanDigits = ['', '일', '이', '삼', '사', '오', '육', '칠', '팔', '구']
  const koreanSmallUnits = ['', '십', '백', '천']
  const koreanLargeUnits = ['', '만', '억', '조', '경']

  const chineseDigits = ['', '壹', '貳', '參', '四', '五', '六', '七', '八', '九']
  const chineseSmallUnits = ['', '拾', '百', '千']
  const chineseLargeUnits = ['', '萬', '億', '兆', '京']

  // Convert 4-digit group to Korean
  const convertGroupToKorean = useCallback((num: number, digits: string[], smallUnits: string[]): string => {
    if (num === 0) return ''

    let result = ''
    const thousands = Math.floor(num / 1000)
    const hundreds = Math.floor((num % 1000) / 100)
    const tens = Math.floor((num % 100) / 10)
    const ones = num % 10

    if (thousands > 0) {
      result += digits[thousands] + smallUnits[3]
    }
    if (hundreds > 0) {
      result += digits[hundreds] + smallUnits[2]
    }
    if (tens > 0) {
      result += digits[tens] + smallUnits[1]
    }
    if (ones > 0) {
      result += digits[ones]
    }

    return result
  }, [])

  // Main conversion function
  const convertToKorean = useCallback((numStr: string, digits: string[], smallUnits: string[], largeUnits: string[]): string => {
    if (!numStr || numStr === '0') return ''

    const num = parseInt(numStr, 10)
    if (isNaN(num) || num === 0) return ''

    let result = ''
    let unitIndex = 0
    let tempNum = num

    while (tempNum > 0) {
      const group = tempNum % 10000
      if (group > 0) {
        const groupText = convertGroupToKorean(group, digits, smallUnits)
        result = groupText + largeUnits[unitIndex] + result
      }
      tempNum = Math.floor(tempNum / 10000)
      unitIndex++
    }

    return result
  }, [convertGroupToKorean])

  // Format number with commas
  const formatNumber = useCallback((num: string): string => {
    if (!num) return '0'
    const number = parseInt(num, 10)
    if (isNaN(number)) return '0'
    return number.toLocaleString('ko-KR')
  }, [])

  // Conversion results
  const koreanFormal = useMemo(() => {
    if (!inputValue || inputValue === '0') return ''
    const korean = convertToKorean(inputValue, koreanDigits, koreanSmallUnits, koreanLargeUnits)
    return korean ? `금 ${korean}원정` : ''
  }, [inputValue, convertToKorean, koreanDigits, koreanSmallUnits, koreanLargeUnits])

  const koreanReading = useMemo(() => {
    if (!inputValue || inputValue === '0') return ''
    return convertToKorean(inputValue, koreanDigits, koreanSmallUnits, koreanLargeUnits)
  }, [inputValue, convertToKorean, koreanDigits, koreanSmallUnits, koreanLargeUnits])

  const chineseFormat = useMemo(() => {
    if (!inputValue || inputValue === '0') return ''
    const chinese = convertToKorean(inputValue, chineseDigits, chineseSmallUnits, chineseLargeUnits)
    return chinese ? `金 ${chinese}圓整` : ''
  }, [inputValue, convertToKorean, chineseDigits, chineseSmallUnits, chineseLargeUnits])

  const formattedNumber = useMemo(() => formatNumber(inputValue), [inputValue, formatNumber])

  // Handle input change
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^0-9]/g, '')

    // Max 16 digits (9,999,999,999,999,999)
    if (value.length > 16) return

    setInputValue(value)
  }, [])

  // Handle quick amount buttons
  const handleQuickAmount = useCallback((amount: number) => {
    setInputValue(amount.toString())
  }, [])

  // Reset
  const handleReset = useCallback(() => {
    setInputValue('')
    setCopiedId(null)
  }, [])

  // Copy to clipboard
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

  const quickAmounts = [
    { label: '1만', value: 10000 },
    { label: '5만', value: 50000 },
    { label: '10만', value: 100000 },
    { label: '50만', value: 500000 },
    { label: '100만', value: 1000000 },
    { label: '500만', value: 5000000 },
    { label: '1000만', value: 10000000 },
    { label: '5000만', value: 50000000 },
    { label: '1억', value: 100000000 },
    { label: '5억', value: 500000000 },
    { label: '10억', value: 1000000000 },
    { label: '50억', value: 5000000000 },
  ]

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <Hash className="w-7 h-7" />
          {t('title')}
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('description')}</p>
      </div>

      {/* Main Grid */}
      <div className="grid lg:grid-cols-3 gap-8">
        {/* Left Panel - Input */}
        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('inputNumber')}
              </label>
              <input
                type="text"
                value={inputValue}
                onChange={handleInputChange}
                placeholder={t('placeholder')}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 text-lg"
                maxLength={16}
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {t('maxNumber')}
              </p>
            </div>

            {/* Quick Amount Buttons */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('quickAmounts')}
              </label>
              <div className="grid grid-cols-3 gap-2">
                {quickAmounts.map((item) => (
                  <button
                    key={item.value}
                    onClick={() => handleQuickAmount(item.value)}
                    className="px-2 py-1.5 text-xs bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded transition-colors"
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Reset Button */}
            <button
              onClick={handleReset}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              {t('reset')}
            </button>
          </div>
        </div>

        {/* Right Panel - Results */}
        <div className="lg:col-span-2">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 space-y-6">
            {/* Formatted Number Display */}
            <div className="text-center pb-6 border-b border-gray-200 dark:border-gray-700">
              <div className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
                숫자 표기
              </div>
              <div className="text-4xl font-bold text-gray-900 dark:text-white">
                {formattedNumber}
              </div>
            </div>

            {/* Korean Formal */}
            <div className="bg-blue-50 dark:bg-blue-950 rounded-xl p-4 border-l-4 border-blue-500">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-blue-700 dark:text-blue-300 mb-2">
                    {t('koreanFormal')}
                  </div>
                  <div className="text-xl font-medium text-gray-900 dark:text-white break-words">
                    {koreanFormal || '숫자를 입력하세요'}
                  </div>
                </div>
                <button
                  onClick={() => koreanFormal && copyToClipboard(koreanFormal, 'formal')}
                  disabled={!koreanFormal}
                  className="flex-shrink-0 p-2 hover:bg-blue-100 dark:hover:bg-blue-900 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  title={t('copy')}
                >
                  {copiedId === 'formal' ? (
                    <Check className="w-5 h-5 text-green-600 dark:text-green-400" />
                  ) : (
                    <Copy className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  )}
                </button>
              </div>
            </div>

            {/* Korean Reading */}
            <div className="bg-green-50 dark:bg-green-950 rounded-xl p-4 border-l-4 border-green-500">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-green-700 dark:text-green-300 mb-2">
                    {t('koreanInformal')}
                  </div>
                  <div className="text-xl font-medium text-gray-900 dark:text-white break-words">
                    {koreanReading || '숫자를 입력하세요'}
                  </div>
                </div>
                <button
                  onClick={() => koreanReading && copyToClipboard(koreanReading, 'reading')}
                  disabled={!koreanReading}
                  className="flex-shrink-0 p-2 hover:bg-green-100 dark:hover:bg-green-900 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  title={t('copy')}
                >
                  {copiedId === 'reading' ? (
                    <Check className="w-5 h-5 text-green-600 dark:text-green-400" />
                  ) : (
                    <Copy className="w-5 h-5 text-green-600 dark:text-green-400" />
                  )}
                </button>
              </div>
            </div>

            {/* Chinese Characters */}
            <div className="bg-orange-50 dark:bg-orange-950 rounded-xl p-4 border-l-4 border-orange-500">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-orange-700 dark:text-orange-300 mb-2">
                    {t('chineseNum')}
                  </div>
                  <div className="text-xl font-medium text-gray-900 dark:text-white break-words">
                    {chineseFormat || '숫자를 입력하세요'}
                  </div>
                </div>
                <button
                  onClick={() => chineseFormat && copyToClipboard(chineseFormat, 'chinese')}
                  disabled={!chineseFormat}
                  className="flex-shrink-0 p-2 hover:bg-orange-100 dark:hover:bg-orange-900 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  title={t('copy')}
                >
                  {copiedId === 'chinese' ? (
                    <Check className="w-5 h-5 text-green-600 dark:text-green-400" />
                  ) : (
                    <Copy className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Guide Section */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
          <BookOpen className="w-6 h-6" />
          {t('guide.title')}
        </h2>
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white mb-3">
              {t('guide.usage.title')}
            </h3>
            <ul className="space-y-2">
              {(t.raw('guide.usage.items') as string[]).map((item, index) => (
                <li key={index} className="text-sm text-gray-600 dark:text-gray-300 flex gap-2">
                  <span className="text-blue-600 dark:text-blue-400">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white mb-3">
              {t('guide.rules.title')}
            </h3>
            <ul className="space-y-2">
              {(t.raw('guide.rules.items') as string[]).map((item, index) => (
                <li key={index} className="text-sm text-gray-600 dark:text-gray-300 flex gap-2">
                  <span className="text-blue-600 dark:text-blue-400">•</span>
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
