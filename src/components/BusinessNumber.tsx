'use client'

import { useState, useCallback, useEffect } from 'react'
import { useTranslations } from '@/lib/i18n'
import { Copy, Check, BookOpen, Shield, ShieldCheck, ShieldX, Trash2 } from 'lucide-react'
import { glassCard, glassInset, glassInput } from '@/lib/glass'

interface VerificationResult {
  isValid: boolean
  formatted: string
  checkDigit: number
  timestamp: string
}

interface HistoryItem {
  number: string
  isValid: boolean
  timestamp: string
}

export default function BusinessNumber() {
  const t = useTranslations('businessNumber')
  const [input, setInput] = useState('')
  const [result, setResult] = useState<VerificationResult | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [history, setHistory] = useState<HistoryItem[]>([])

  // Load history from localStorage
  useEffect(() => {
    const stored = localStorage.getItem('businessNumberHistory')
    if (stored) {
      try {
        setHistory(JSON.parse(stored))
      } catch {
        setHistory([])
      }
    }
  }, [])

  // Save history to localStorage
  const saveHistory = useCallback((item: HistoryItem) => {
    const newHistory = [item, ...history.filter(h => h.number !== item.number)].slice(0, 10)
    setHistory(newHistory)
    localStorage.setItem('businessNumberHistory', JSON.stringify(newHistory))
  }, [history])

  // Format input with dashes (XXX-XX-XXXXX)
  const formatBusinessNumber = (value: string): string => {
    const digits = value.replace(/\D/g, '')
    if (digits.length <= 3) return digits
    if (digits.length <= 5) return `${digits.slice(0, 3)}-${digits.slice(3)}`
    return `${digits.slice(0, 3)}-${digits.slice(3, 5)}-${digits.slice(5, 10)}`
  }

  // Validate using Korean business number checksum algorithm
  const validateBusinessNumber = (number: string): { isValid: boolean; checkDigit: number } => {
    const digits = number.replace(/\D/g, '')

    if (digits.length !== 10) {
      return { isValid: false, checkDigit: -1 }
    }

    const weights = [1, 3, 7, 1, 3, 7, 1, 3, 5]
    let sum = 0

    for (let i = 0; i < 9; i++) {
      const digit = parseInt(digits[i])
      sum += digit * weights[i]

      // For 9th position (index 8), add floor(digit * 5 / 10)
      if (i === 8) {
        sum += Math.floor(digit * 5 / 10)
      }
    }

    const calculatedCheckDigit = (10 - (sum % 10)) % 10
    const actualCheckDigit = parseInt(digits[9])

    return {
      isValid: calculatedCheckDigit === actualCheckDigit,
      checkDigit: calculatedCheckDigit
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatBusinessNumber(e.target.value)
    setInput(formatted)
  }

  const handleVerify = () => {
    const digits = input.replace(/\D/g, '')

    if (digits.length !== 10) {
      return
    }

    const validation = validateBusinessNumber(input)
    const formatted = formatBusinessNumber(input)

    const verificationResult: VerificationResult = {
      isValid: validation.isValid,
      formatted,
      checkDigit: validation.checkDigit,
      timestamp: new Date().toISOString()
    }

    setResult(verificationResult)

    // Save to history
    saveHistory({
      number: formatted,
      isValid: validation.isValid,
      timestamp: new Date().toISOString()
    })
  }

  const handleReset = () => {
    setInput('')
    setResult(null)
  }

  const handleClearHistory = () => {
    setHistory([])
    localStorage.removeItem('businessNumberHistory')
  }

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

  const handleHistoryClick = (number: string) => {
    setInput(number)
    const validation = validateBusinessNumber(number)
    setResult({
      isValid: validation.isValid,
      formatted: number,
      checkDigit: validation.checkDigit,
      timestamp: new Date().toISOString()
    })
  }

  const digits = input.replace(/\D/g, '')

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-fg">{t('title')}</h1>
        <p className="text-sm text-muted mt-1">{t('description')}</p>
      </div>

      {/* Main Grid */}
      <div className="grid lg:grid-cols-3 gap-8">
        {/* Input Panel */}
        <div className="lg:col-span-1">
          <div className={`${glassCard} ${glassInset} p-6 space-y-4`}>
            <div>
              <label className="block text-sm font-medium text-body mb-2">
                {t('inputLabel')}
              </label>
              <input
                type="text"
                value={input}
                onChange={handleInputChange}
                placeholder={t('inputPlaceholder')}
                maxLength={12}
                className={`w-full px-3 py-2 ${glassInput} focus:ring-2 focus:ring-blue-500 font-mono text-lg`}
              />
              <p className="text-xs text-muted mt-1">
                {t('digitCount')}: {digits.length}/10
              </p>
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleVerify}
                disabled={digits.length !== 10}
                className="flex-1 bg-primary hover:bg-blue-700 text-white rounded-lg px-4 py-3 font-medium hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <Shield className="w-5 h-5" />
                {t('verify')}
              </button>
              <button
                onClick={handleReset}
                className="bg-soft hover:bg-gray-200 dark:hover:bg-gray-600 text-body rounded-lg px-4 py-3 font-medium"
              >
                {t('reset')}
              </button>
            </div>
          </div>

          {/* Recent Verifications */}
          {history.length > 0 && (
            <div className={`${glassCard} ${glassInset} p-6 mt-6`}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-fg">
                  {t('recentVerifications')}
                </h3>
                <button
                  onClick={handleClearHistory}
                  className="text-sm text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 flex items-center gap-1"
                >
                  <Trash2 className="w-4 h-4" />
                  {t('clearHistory')}
                </button>
              </div>
              <div className="space-y-2">
                {history.map((item, index) => (
                  <div
                    key={index}
                    onClick={() => handleHistoryClick(item.number)}
                    className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      {item.isValid ? (
                        <ShieldCheck className="w-4 h-4 text-green-600 dark:text-green-400" />
                      ) : (
                        <ShieldX className="w-4 h-4 text-red-600 dark:text-red-400" />
                      )}
                      <span className="font-mono text-sm text-fg">
                        {item.number}
                      </span>
                    </div>
                    <span className={`text-xs font-medium ${
                      item.isValid
                        ? 'text-green-600 dark:text-green-400'
                        : 'text-red-600 dark:text-red-400'
                    }`}>
                      {item.isValid ? t('valid') : t('invalid')}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Result Panel */}
        <div className="lg:col-span-2">
          {result ? (
            <div className={`${glassCard} ${glassInset} p-6`}>
              <div className={`mb-6 p-4 rounded-xl flex items-center gap-3 ${
                result.isValid
                  ? 'bg-primary-soft text-primary border-2 border-primary'
                  : 'bg-red-50 dark:bg-red-950 border-2 border-red-200 dark:border-red-800'
              }`}>
                {result.isValid ? (
                  <ShieldCheck className="w-8 h-8 text-green-600 dark:text-green-400" />
                ) : (
                  <ShieldX className="w-8 h-8 text-red-600 dark:text-red-400" />
                )}
                <div>
                  <div className={`text-xl font-bold ${
                    result.isValid
                      ? 'text-fg'
                      : 'text-red-900 dark:text-red-100'
                  }`}>
                    {result.isValid ? t('valid') : t('invalid')}
                  </div>
                  <div className={`text-sm ${
                    result.isValid
                      ? 'text-sub'
                      : 'text-red-700 dark:text-red-300'
                  }`}>
                    {result.isValid ? t('validMessage') : t('invalidMessage')}
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="bg-subtle rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-body">
                      {t('formatted')}
                    </span>
                    <button
                      onClick={() => copyToClipboard(result.formatted, 'formatted')}
                      className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 flex items-center gap-1"
                    >
                      {copiedId === 'formatted' ? (
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
                  </div>
                  <div className="font-mono text-2xl text-fg font-bold">
                    {result.formatted}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-subtle rounded-lg p-4">
                    <div className="text-sm text-sub mb-1">
                      {t('digitCount')}
                    </div>
                    <div className="text-2xl font-bold text-fg">
                      10
                    </div>
                  </div>

                  <div className="bg-subtle rounded-lg p-4">
                    <div className="text-sm text-sub mb-1">
                      {t('checkDigit')}
                    </div>
                    <div className="text-2xl font-bold text-fg">
                      {result.checkDigit}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className={`${glassCard} ${glassInset} p-6`}>
              <div className="text-center py-12">
                <Shield className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                <p className="text-muted">
                  {t('inputPlaceholder')}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Guide Section */}
      <div className={`${glassCard} ${glassInset} p-6`}>
        <h2 className="text-xl font-semibold text-fg mb-6 flex items-center gap-2">
          {t('guide.title')}
        </h2>

        <div className="space-y-6">
          {/* Structure */}
          <div>
            <h3 className="text-lg font-semibold text-fg mb-3">
              {t('guide.structure.title')}
            </h3>
            <ul className="space-y-2">
              {(t.raw('guide.structure.items') as string[]).map((item, index) => (
                <li key={index} className="flex items-start gap-2">
                  <span className="text-blue-600 dark:text-blue-400 mt-1">•</span>
                  <span className="text-body">{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Validation Algorithm */}
          <div>
            <h3 className="text-lg font-semibold text-fg mb-3">
              {t('guide.validation.title')}
            </h3>
            <ul className="space-y-2">
              {(t.raw('guide.validation.items') as string[]).map((item, index) => (
                <li key={index} className="flex items-start gap-2">
                  <span className="text-purple-600 dark:text-purple-400 mt-1">•</span>
                  <span className="text-body">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
