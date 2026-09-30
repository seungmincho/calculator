'use client'

import { useState, useCallback, useEffect } from 'react'
import { useTranslations } from '@/lib/i18n'
import { Copy, Check, BookOpen, RotateCcw, Hash } from 'lucide-react'
import { glassCard, glassInset, glassInput } from '@/lib/glass'

interface ConversionState {
  decimal: string
  binary: string
  octal: string
  hex: string
}

const MAX_VALUE = 4294967295 // 2^32 - 1

export default function BaseConverter() {
  const t = useTranslations('baseConverter')
  const [values, setValues] = useState<ConversionState>({
    decimal: '',
    binary: '',
    octal: '',
    hex: ''
  })
  const [source, setSource] = useState<keyof ConversionState>('decimal')
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const parseInput = (value: string, base: number): number | null => {
    if (!value.trim()) return null
    const num = parseInt(value, base)
    if (isNaN(num) || num < 0 || num > MAX_VALUE) return null
    return num
  }

  const validateInput = (value: string, base: number): boolean => {
    if (!value.trim()) return true

    const patterns: Record<number, RegExp> = {
      2: /^[01]+$/,
      8: /^[0-7]+$/,
      10: /^\d+$/,
      16: /^[0-9A-Fa-f]+$/
    }

    return patterns[base]?.test(value) ?? false
  }

  const convertFromDecimal = (decimalNum: number): ConversionState => {
    return {
      decimal: decimalNum.toString(10),
      binary: decimalNum.toString(2),
      octal: decimalNum.toString(8),
      hex: decimalNum.toString(16).toUpperCase()
    }
  }

  const handleInputChange = (field: keyof ConversionState, value: string) => {
    const baseMap = { decimal: 10, binary: 2, octal: 8, hex: 16 }
    const base = baseMap[field]

    if (!validateInput(value, base)) return

    setSource(field)

    if (!value.trim()) {
      setValues({ decimal: '', binary: '', octal: '', hex: '' })
      return
    }

    const decimalNum = parseInput(value, base)
    if (decimalNum === null) {
      setValues(prev => ({ ...prev, [field]: value }))
      return
    }

    setValues(convertFromDecimal(decimalNum))
  }

  const handleReset = () => {
    setValues({ decimal: '', binary: '', octal: '', hex: '' })
    setSource('decimal')
  }

  const handleQuickValue = (decimalValue: number) => {
    setSource('decimal')
    setValues(convertFromDecimal(decimalValue))
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

  const renderBitVisualization = (bitCount: number) => {
    const decimalNum = parseInput(values.decimal, 10)
    if (decimalNum === null) return null

    const binary = decimalNum.toString(2).padStart(bitCount, '0')
    const bits = binary.split('').slice(-bitCount)

    return (
      <div className="flex flex-wrap gap-1">
        {bits.map((bit, idx) => (
          <div
            key={idx}
            className={`w-8 h-8 flex items-center justify-center rounded text-xs font-mono font-bold ${
              bit === '1'
                ? 'bg-blue-500 text-white'
                : 'bg-track text-sub'
            }`}
          >
            {bit}
          </div>
        ))}
      </div>
    )
  }

  const commonValues = [0, 1, 8, 10, 16, 32, 64, 128, 255, 256, 1024, 65535]

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-fg">{t('title')}</h1>
          <p className="text-sm text-muted mt-1">{t('description')}</p>
        </div>
        <button
          onClick={handleReset}
          className="flex items-center gap-2 bg-soft hover:bg-gray-200 dark:hover:bg-gray-600 text-body rounded-lg px-4 py-2"
        >
          <RotateCcw className="w-4 h-4" />
          {t('reset')}
        </button>
      </div>

      {/* Conversion Cards */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Decimal */}
        <div className={`${glassCard} ${glassInset} p-6`}>
          <div className="flex items-center gap-2 mb-3">
            <Hash className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <h2 className="text-lg font-semibold text-fg">
              {t('decimal')}
            </h2>
            <span className="text-xs text-muted">(Base 10)</span>
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={values.decimal}
              onChange={(e) => handleInputChange('decimal', e.target.value)}
              placeholder="0"
              className={`flex-1 px-3 py-2 ${glassInput} focus:ring-2 focus:ring-blue-500 font-mono`}
            />
            <button
              onClick={() => copyToClipboard(values.decimal, 'decimal')}
              disabled={!values.decimal}
              className="bg-soft hover:bg-gray-200 dark:hover:bg-gray-600 text-body rounded-lg px-3 py-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {copiedId === 'decimal' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Binary */}
        <div className={`${glassCard} ${glassInset} p-6`}>
          <div className="flex items-center gap-2 mb-3">
            <Hash className="w-5 h-5 text-green-600 dark:text-green-400" />
            <h2 className="text-lg font-semibold text-fg">
              {t('binary')}
            </h2>
            <span className="text-xs text-muted">(Base 2)</span>
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={values.binary}
              onChange={(e) => handleInputChange('binary', e.target.value)}
              placeholder="0"
              className={`flex-1 px-3 py-2 ${glassInput} focus:ring-2 focus:ring-blue-500 font-mono`}
            />
            <button
              onClick={() => copyToClipboard(values.binary, 'binary')}
              disabled={!values.binary}
              className="bg-soft hover:bg-gray-200 dark:hover:bg-gray-600 text-body rounded-lg px-3 py-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {copiedId === 'binary' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Octal */}
        <div className={`${glassCard} ${glassInset} p-6`}>
          <div className="flex items-center gap-2 mb-3">
            <Hash className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            <h2 className="text-lg font-semibold text-fg">
              {t('octal')}
            </h2>
            <span className="text-xs text-muted">(Base 8)</span>
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={values.octal}
              onChange={(e) => handleInputChange('octal', e.target.value)}
              placeholder="0"
              className={`flex-1 px-3 py-2 ${glassInput} focus:ring-2 focus:ring-blue-500 font-mono`}
            />
            <button
              onClick={() => copyToClipboard(values.octal, 'octal')}
              disabled={!values.octal}
              className="bg-soft hover:bg-gray-200 dark:hover:bg-gray-600 text-body rounded-lg px-3 py-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {copiedId === 'octal' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Hexadecimal */}
        <div className={`${glassCard} ${glassInset} p-6`}>
          <div className="flex items-center gap-2 mb-3">
            <Hash className="w-5 h-5 text-orange-600 dark:text-orange-400" />
            <h2 className="text-lg font-semibold text-fg">
              {t('hex')}
            </h2>
            <span className="text-xs text-muted">(Base 16)</span>
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={values.hex}
              onChange={(e) => handleInputChange('hex', e.target.value)}
              placeholder="0"
              className={`flex-1 px-3 py-2 ${glassInput} focus:ring-2 focus:ring-blue-500 font-mono`}
            />
            <button
              onClick={() => copyToClipboard(values.hex, 'hex')}
              disabled={!values.hex}
              className="bg-soft hover:bg-gray-200 dark:hover:bg-gray-600 text-body rounded-lg px-3 py-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {copiedId === 'hex' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>

      {/* Bit Visualization */}
      {values.decimal && parseInput(values.decimal, 10) !== null && (
        <div className={`${glassCard} ${glassInset} p-6 space-y-4`}>
          <h2 className="text-lg font-semibold text-fg">
            {t('bitVisualization')}
          </h2>

          <div className="space-y-3">
            <div>
              <h3 className="text-sm font-medium text-body mb-2">
                8비트
              </h3>
              {renderBitVisualization(8)}
            </div>

            <div>
              <h3 className="text-sm font-medium text-body mb-2">
                16비트
              </h3>
              {renderBitVisualization(16)}
            </div>

            <div>
              <h3 className="text-sm font-medium text-body mb-2">
                32비트
              </h3>
              {renderBitVisualization(32)}
            </div>
          </div>
        </div>
      )}

      {/* Common Values */}
      <div className={`${glassCard} ${glassInset} p-6`}>
        <h2 className="text-lg font-semibold text-fg mb-4">
          {t('commonValues')}
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line">
                <th className="text-left py-2 px-3 text-body font-semibold">
                  {t('decimal')}
                </th>
                <th className="text-left py-2 px-3 text-body font-semibold">
                  {t('binary')}
                </th>
                <th className="text-left py-2 px-3 text-body font-semibold">
                  {t('octal')}
                </th>
                <th className="text-left py-2 px-3 text-body font-semibold">
                  {t('hex')}
                </th>
              </tr>
            </thead>
            <tbody>
              {commonValues.map((val) => {
                const converted = convertFromDecimal(val)
                return (
                  <tr
                    key={val}
                    onClick={() => handleQuickValue(val)}
                    className="border-b border-line hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer"
                  >
                    <td className="py-2 px-3 font-mono text-fg">
                      {converted.decimal}
                    </td>
                    <td className="py-2 px-3 font-mono text-body">
                      {converted.binary}
                    </td>
                    <td className="py-2 px-3 font-mono text-body">
                      {converted.octal}
                    </td>
                    <td className="py-2 px-3 font-mono text-body">
                      {converted.hex}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Guide Section */}
      <div className={`${glassCard} ${glassInset} p-6`}>
        <h2 className="text-xl font-semibold text-fg mb-6 flex items-center gap-2">
          <BookOpen className="w-5 h-5" />
          {t('guide.title')}
        </h2>
        <div className="space-y-6">
          {/* How to Use */}
          <div>
            <h3 className="text-lg font-semibold text-fg mb-3">
              {t('guide.howToUse.title')}
            </h3>
            <ul className="list-disc list-inside space-y-2 text-body">
              {(t.raw('guide.howToUse.items') as string[]).map((item, idx) => (
                <li key={idx}>{item}</li>
              ))}
            </ul>
          </div>

          {/* Tips */}
          <div>
            <h3 className="text-lg font-semibold text-fg mb-3">
              {t('guide.tips.title')}
            </h3>
            <ul className="list-disc list-inside space-y-2 text-body">
              {(t.raw('guide.tips.items') as string[]).map((item, idx) => (
                <li key={idx}>{item}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
