'use client'

import { useState, useCallback, ChangeEvent } from 'react'
import { useTranslations } from '@/lib/i18n'
import { Shield, AlertCircle, CheckCircle, Copy, Check, BookOpen } from 'lucide-react'
import { glassCard, glassInset, glassInput } from '@/lib/glass'

interface ValidationResult {
  isValid: boolean
  birthDate: string
  gender: string
  regionCode: string
}

export default function ResidentNumber() {
  const t = useTranslations('residentNumber')
  const [input, setInput] = useState('')
  const [result, setResult] = useState<ValidationResult | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const formatInput = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 13)
    if (digits.length <= 6) return digits
    return `${digits.slice(0, 6)}-${digits.slice(6)}`
  }

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const formatted = formatInput(e.target.value)
    setInput(formatted)
    setResult(null)
  }

  const validateResidentNumber = (number: string): ValidationResult | null => {
    const digits = number.replace(/-/g, '')
    if (digits.length !== 13 || !/^\d{13}$/.test(digits)) {
      return null
    }

    const mm = digits.slice(2, 4)
    const dd = digits.slice(4, 6)
    const genderCode = parseInt(digits[6])
    const regionCode = digits.slice(7, 11)
    const checkDigit = parseInt(digits[12])
    const yy = digits.slice(0, 2)

    const monthNum = parseInt(mm)
    const dayNum = parseInt(dd)
    if (monthNum < 1 || monthNum > 12 || dayNum < 1 || dayNum > 31) {
      return null
    }

    if (genderCode < 1 || genderCode > 4) {
      return null
    }

    const weights = [2, 3, 4, 5, 6, 7, 8, 9, 2, 3, 4, 5]
    let sum = 0
    for (let i = 0; i < 12; i++) {
      sum += parseInt(digits[i]) * weights[i]
    }
    const calculatedCheck = (11 - (sum % 11)) % 10

    const isValid = calculatedCheck === checkDigit

    const century = (genderCode === 1 || genderCode === 2) ? '19' : '20'
    const birthDate = `${century}${yy}.${mm}.${dd}`

    const gender = (genderCode % 2 === 1) ? t('info.male') : t('info.female')

    return {
      isValid,
      birthDate,
      gender,
      regionCode,
    }
  }

  const handleVerify = () => {
    const validationResult = validateResidentNumber(input)
    if (validationResult) {
      setResult(validationResult)
    } else {
      setResult({
        isValid: false,
        birthDate: '',
        gender: '',
        regionCode: '',
      })
    }
  }

  const handleReset = () => {
    setInput('')
    setResult(null)
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

  const maskNumber = (number: string) => {
    const digits = number.replace(/-/g, '')
    if (digits.length !== 13) return number
    return `${digits.slice(0, 6)}-${'*'.repeat(6)}${digits.slice(12)}`
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-fg flex items-center gap-2">
          <Shield className="w-6 h-6" />
          {t('title')}
        </h1>
        <p className="text-sm text-muted mt-1">{t('description')}</p>
      </div>

      <div className="bg-subtle border border-line rounded-xl p-4">
        <p className="text-sm text-fg flex items-center gap-2">
          <Shield className="w-4 h-4" />
          {t('privacy')}
        </p>
      </div>

      <div className={`${glassCard} ${glassInset} p-6 space-y-4`}>
        <div>
          <label htmlFor="resident-input" className="block text-sm font-medium text-body mb-2">
            {t('inputLabel')}
          </label>
          <input
            id="resident-input"
            type="text"
            value={input}
            onChange={handleInputChange}
            placeholder={t('inputPlaceholder')}
            className={`${glassInput} px-3 py-2`}
            maxLength={14}
          />
        </div>

        <div className="flex gap-3">
          <button
            onClick={handleVerify}
            disabled={input.replace(/-/g, '').length !== 13}
            className="flex-1 bg-primary hover:bg-blue-700 text-white rounded-lg px-4 py-3 font-medium hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {t('verify')}
          </button>
          <button
            onClick={handleReset}
            className="bg-soft hover:bg-gray-200 dark:hover:bg-gray-600 text-body rounded-lg px-6 py-3 font-medium transition-all"
          >
            {t('reset')}
          </button>
        </div>
      </div>

      {!!result && (
        <div className={`rounded-xl shadow-lg p-6 ${
          result.isValid
            ? 'bg-subtle border border-line'
            : 'bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800'
        }`}>
          <div className="flex items-center gap-3 mb-4">
            {result.isValid ? (
              <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
            ) : (
              <AlertCircle className="w-6 h-6 text-red-600 dark:text-red-400" />
            )}
            <h2 className={`text-xl font-semibold ${
              result.isValid
                ? 'text-fg'
                : 'text-red-900 dark:text-red-100'
            }`}>
              {result.isValid ? t('valid') : t('invalid')}
            </h2>
          </div>

          <p className={`text-sm mb-4 ${
            result.isValid
              ? 'text-fg'
              : 'text-red-800 dark:text-red-200'
          }`}>
            {result.isValid ? t('validMessage') : t('invalidMessage')}
          </p>

          {result.isValid && (
            <div className="space-y-3 bg-surface rounded-lg p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-body">
                  {t('inputLabel')}
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-fg font-mono">
                    {maskNumber(input)}
                  </span>
                  <button
                    onClick={() => copyToClipboard(input, 'number')}
                    className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                    title={t('copy')}
                  >
                    {copiedId === 'number' ? (
                      <Check className="w-4 h-4 text-green-600" />
                    ) : (
                      <Copy className="w-4 h-4 text-gray-500" />
                    )}
                  </button>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-body">{t('info.birthDate')}</span>
                <span className="text-sm text-fg">{result.birthDate}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-body">{t('info.gender')}</span>
                <span className="text-sm text-fg">{result.gender}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-body">{t('info.region')}</span>
                <span className="text-sm text-fg font-mono">{result.regionCode}</span>
              </div>
            </div>
          )}
        </div>
      )}

      <div className={`${glassCard} ${glassInset} p-6`}>
        <h2 className="text-xl font-semibold text-fg mb-6 flex items-center gap-2">
          {t('guide.title')}
        </h2>
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-medium text-fg mb-3">{t('guide.structure.title')}</h3>
            <ul className="space-y-2">
              {(t.raw('guide.structure.items') as string[]).map((item, index) => (
                <li key={index} className="flex items-start gap-2 text-body">
                  <span className="text-blue-600 dark:text-blue-400 mt-1">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="text-lg font-medium text-fg mb-3">{t('guide.validation.title')}</h3>
            <ul className="space-y-2">
              {(t.raw('guide.validation.items') as string[]).map((item, index) => (
                <li key={index} className="flex items-start gap-2 text-body">
                  <span className="text-blue-600 dark:text-blue-400 mt-1">•</span>
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
