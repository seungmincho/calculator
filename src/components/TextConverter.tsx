'use client'

import { useState, useCallback, useMemo } from 'react'
import { useTranslations } from 'next-intl'
import { Copy, Check, Trash2, Type, ArrowRight } from 'lucide-react'

type ConversionType =
  | 'uppercase'
  | 'lowercase'
  | 'capitalize'
  | 'titleCase'
  | 'camelCase'
  | 'pascalCase'
  | 'snakeCase'
  | 'kebabCase'
  | 'constantCase'
  | 'dotCase'
  | 'reverse'
  | 'removeSpaces'
  | 'removeLineBreaks'
  | 'singleSpaces'
  | 'trim'
  | 'sortLines'
  | 'reverseLines'
  | 'uniqueLines'
  | 'numberLines'

interface ConversionOption {
  type: ConversionType
  labelKey: string
  category: 'case' | 'coding' | 'formatting' | 'lines'
}

const CONVERSIONS: ConversionOption[] = [
  // Case conversions
  { type: 'uppercase', labelKey: 'conversions.uppercase', category: 'case' },
  { type: 'lowercase', labelKey: 'conversions.lowercase', category: 'case' },
  { type: 'capitalize', labelKey: 'conversions.capitalize', category: 'case' },
  { type: 'titleCase', labelKey: 'conversions.titleCase', category: 'case' },

  // Coding conventions
  { type: 'camelCase', labelKey: 'conversions.camelCase', category: 'coding' },
  { type: 'pascalCase', labelKey: 'conversions.pascalCase', category: 'coding' },
  { type: 'snakeCase', labelKey: 'conversions.snakeCase', category: 'coding' },
  { type: 'kebabCase', labelKey: 'conversions.kebabCase', category: 'coding' },
  { type: 'constantCase', labelKey: 'conversions.constantCase', category: 'coding' },
  { type: 'dotCase', labelKey: 'conversions.dotCase', category: 'coding' },

  // Formatting
  { type: 'reverse', labelKey: 'conversions.reverse', category: 'formatting' },
  { type: 'removeSpaces', labelKey: 'conversions.removeSpaces', category: 'formatting' },
  { type: 'removeLineBreaks', labelKey: 'conversions.removeLineBreaks', category: 'formatting' },
  { type: 'singleSpaces', labelKey: 'conversions.singleSpaces', category: 'formatting' },
  { type: 'trim', labelKey: 'conversions.trim', category: 'formatting' },

  // Line operations
  { type: 'sortLines', labelKey: 'conversions.sortLines', category: 'lines' },
  { type: 'reverseLines', labelKey: 'conversions.reverseLines', category: 'lines' },
  { type: 'uniqueLines', labelKey: 'conversions.uniqueLines', category: 'lines' },
  { type: 'numberLines', labelKey: 'conversions.numberLines', category: 'lines' },
]

export default function TextConverter() {
  const t = useTranslations('textConverter')
  const [input, setInput] = useState('')
  const [selectedConversion, setSelectedConversion] = useState<ConversionType>('uppercase')
  const [copied, setCopied] = useState(false)

  const toWords = (str: string): string[] => {
    return str
      .replace(/([a-z])([A-Z])/g, '$1 $2') // camelCase
      .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2') // ABCDef -> ABC Def
      .replace(/[-_./]+/g, ' ') // separators
      .trim()
      .split(/\s+/)
      .filter(w => w)
  }

  const convert = useCallback((text: string, type: ConversionType): string => {
    if (!text) return ''

    switch (type) {
      case 'uppercase':
        return text.toUpperCase()
      case 'lowercase':
        return text.toLowerCase()
      case 'capitalize':
        return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase()
      case 'titleCase':
        return text.toLowerCase().replace(/\b\w/g, c => c.toUpperCase())
      case 'camelCase': {
        const words = toWords(text)
        return words.map((w, i) =>
          i === 0 ? w.toLowerCase() : w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()
        ).join('')
      }
      case 'pascalCase': {
        const words = toWords(text)
        return words.map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join('')
      }
      case 'snakeCase': {
        const words = toWords(text)
        return words.map(w => w.toLowerCase()).join('_')
      }
      case 'kebabCase': {
        const words = toWords(text)
        return words.map(w => w.toLowerCase()).join('-')
      }
      case 'constantCase': {
        const words = toWords(text)
        return words.map(w => w.toUpperCase()).join('_')
      }
      case 'dotCase': {
        const words = toWords(text)
        return words.map(w => w.toLowerCase()).join('.')
      }
      case 'reverse':
        return text.split('').reverse().join('')
      case 'removeSpaces':
        return text.replace(/\s+/g, '')
      case 'removeLineBreaks':
        return text.replace(/[\r\n]+/g, ' ')
      case 'singleSpaces':
        return text.replace(/\s+/g, ' ')
      case 'trim':
        return text.split('\n').map(line => line.trim()).join('\n')
      case 'sortLines':
        return text.split('\n').sort((a, b) => a.localeCompare(b)).join('\n')
      case 'reverseLines':
        return text.split('\n').reverse().join('\n')
      case 'uniqueLines':
        return [...new Set(text.split('\n'))].join('\n')
      case 'numberLines':
        return text.split('\n').map((line, i) => `${i + 1}. ${line}`).join('\n')
      default:
        return text
    }
  }, [])

  const output = useMemo(() => convert(input, selectedConversion), [input, selectedConversion, convert])

  const handleCopy = useCallback(async () => {
    if (!output) return
    try {
      await navigator.clipboard.writeText(output)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      const textarea = document.createElement('textarea')
      textarea.value = output
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand('copy')
      document.body.removeChild(textarea)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }, [output])

  const handleClear = useCallback(() => {
    setInput('')
  }, [])

  const categories = ['case', 'coding', 'formatting', 'lines'] as const

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <Type className="w-7 h-7 text-violet-500" />
          {t('title')}
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          {t('description')}
        </p>
      </div>

      {/* Conversion Options */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 p-6 mb-6">
        {categories.map((category) => (
          <div key={category} className="mb-4 last:mb-0">
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
              {t(`categories.${category}`)}
            </h3>
            <div className="flex flex-wrap gap-2">
              {CONVERSIONS.filter(c => c.category === category).map((conversion) => (
                <button
                  key={conversion.type}
                  onClick={() => setSelectedConversion(conversion.type)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                    selectedConversion === conversion.type
                      ? 'bg-violet-500 text-white shadow-md'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  {t(conversion.labelKey)}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Input/Output */}
      <div className="grid md:grid-cols-2 gap-4 mb-6">
        {/* Input */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {t('input.label')}
            </span>
            <button
              onClick={handleClear}
              disabled={!input}
              className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 text-gray-700 dark:text-gray-200 transition-all disabled:opacity-50"
            >
              <Trash2 className="w-3 h-3" />
              {t('actions.clear')}
            </button>
          </div>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={t('input.placeholder')}
            className="w-full h-64 p-4 text-gray-900 dark:text-white bg-transparent resize-none focus:outline-none text-sm font-mono leading-relaxed placeholder:text-gray-400 dark:placeholder:text-gray-500"
            spellCheck={false}
          />
        </div>

        {/* Output */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {t('output.label')}
              </span>
              <ArrowRight className="w-4 h-4 text-violet-500" />
              <span className="text-xs text-violet-600 dark:text-violet-400 font-medium">
                {t(`conversions.${selectedConversion}`)}
              </span>
            </div>
            <button
              onClick={handleCopy}
              disabled={!output}
              className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium bg-violet-500 hover:bg-violet-600 text-white transition-all disabled:opacity-50"
            >
              {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
              {copied ? t('actions.copied') : t('actions.copy')}
            </button>
          </div>
          <textarea
            value={output}
            readOnly
            className="w-full h-64 p-4 text-gray-900 dark:text-white bg-transparent resize-none focus:outline-none text-sm font-mono leading-relaxed"
            spellCheck={false}
          />
        </div>
      </div>

      {/* Quick Examples */}
      {input && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 p-6 mb-6">
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">
            {t('preview.title')}
          </h3>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {(['camelCase', 'snakeCase', 'kebabCase', 'pascalCase', 'constantCase', 'uppercase'] as ConversionType[]).map((type) => (
              <div
                key={type}
                className={`px-3 py-2 rounded-lg cursor-pointer transition-all ${
                  selectedConversion === type
                    ? 'bg-violet-100 dark:bg-violet-900/30 border-2 border-violet-500'
                    : 'bg-gray-50 dark:bg-gray-700/50 border-2 border-transparent hover:border-gray-300 dark:hover:border-gray-600'
                }`}
                onClick={() => setSelectedConversion(type)}
              >
                <span className="text-xs text-gray-500 dark:text-gray-400">{t(`conversions.${type}`)}</span>
                <p className="font-mono text-sm text-gray-900 dark:text-white truncate">
                  {convert(input.slice(0, 30), type)}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Guide */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          {t('guide.title')}
        </h2>
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              {t('guide.caseConversions.title')}
            </h3>
            <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400 font-mono">
              <li>camelCase → myVariableName</li>
              <li>PascalCase → MyClassName</li>
              <li>snake_case → my_variable_name</li>
              <li>kebab-case → my-css-class</li>
              <li>CONSTANT_CASE → MY_CONSTANT</li>
            </ul>
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              {t('guide.useCases.title')}
            </h3>
            <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
              {(t.raw('guide.useCases.items') as string[]).map((item, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="text-violet-500 mt-0.5">•</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
