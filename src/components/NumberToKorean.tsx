'use client'

import { useState, useCallback, useMemo } from 'react'
import { useTranslations } from '@/lib/i18n'
import { Hash, Copy, Check, RotateCcw, BookOpen } from 'lucide-react'
import { glassCard, glassInset, glassInput } from '@/lib/glass'

// ── Korean / Chinese numerals ────────────────────────────────────────────────
const KO_DIGITS = ['', '일', '이', '삼', '사', '오', '육', '칠', '팔', '구']
const KO_SMALL = ['', '십', '백', '천']
const KO_LARGE = ['', '만', '억', '조', '경'] // 4-digit groups: 10^0,10^4,10^8,10^12,10^16

const CN_DIGITS = ['', '壹', '貳', '參', '四', '五', '六', '七', '八', '九']
const CN_SMALL = ['', '拾', '百', '千']
const CN_LARGE = ['', '萬', '億', '兆', '京']

// ── English numerals ─────────────────────────────────────────────────────────
const EN_ONES = ['', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen']
const EN_TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety']
const EN_SCALES = ['', 'thousand', 'million', 'billion', 'trillion', 'quadrillion', 'quintillion']

// Convert a ≤4-digit group to Korean/Chinese (string-safe, no big-number arithmetic)
function group4(num: number, digits: string[], small: string[]): string {
  let result = ''
  const th = Math.floor(num / 1000)
  const hu = Math.floor((num % 1000) / 100)
  const te = Math.floor((num % 100) / 10)
  const on = num % 10
  if (th > 0) result += digits[th] + small[3]
  if (hu > 0) result += digits[hu] + small[2]
  if (te > 0) result += digits[te] + small[1]
  if (on > 0) result += digits[on]
  return result
}

// Split a numeric string into groups of `size` from the right
function groupsOf(numStr: string, size: number): string[] {
  const s = numStr.replace(/^0+/, '')
  if (!s) return []
  const out: string[] = []
  for (let i = s.length; i > 0; i -= size) out.unshift(s.slice(Math.max(0, i - size), i))
  return out
}

function toKorean(numStr: string, digits: string[], small: string[], large: string[], spacing: boolean): string {
  const groups = groupsOf(numStr, 4)
  if (!groups.length) return ''
  const parts: string[] = []
  groups.forEach((g, idx) => {
    const gv = parseInt(g, 10) // g ≤ 4 digits → always safe
    if (gv > 0) {
      const largeIdx = groups.length - 1 - idx
      parts.push(group4(gv, digits, small) + (large[largeIdx] ?? ''))
    }
  })
  return parts.join(spacing ? ' ' : '')
}

function group3English(n: number): string {
  let r = ''
  const h = Math.floor(n / 100)
  const rest = n % 100
  if (h) r += EN_ONES[h] + ' hundred' + (rest ? ' ' : '')
  if (rest) {
    if (rest < 20) r += EN_ONES[rest]
    else r += EN_TENS[Math.floor(rest / 10)] + (rest % 10 ? '-' + EN_ONES[rest % 10] : '')
  }
  return r
}

function toEnglish(numStr: string): string {
  const groups = groupsOf(numStr, 3)
  if (!groups.length) return ''
  const parts: string[] = []
  groups.forEach((g, idx) => {
    const gv = parseInt(g, 10)
    if (gv > 0) {
      const scaleIdx = groups.length - 1 - idx
      if (scaleIdx >= EN_SCALES.length) return
      parts.push(group3English(gv) + (EN_SCALES[scaleIdx] ? ' ' + EN_SCALES[scaleIdx] : ''))
    }
  })
  const joined = parts.join(' ')
  return joined ? joined.charAt(0).toUpperCase() + joined.slice(1) : ''
}

// Insert thousands separators without parseInt (precision-safe for 20 digits)
function commafy(numStr: string): string {
  const s = numStr.replace(/^0+/, '') || '0'
  return s.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}

export default function NumberToKorean() {
  const t = useTranslations('numberToKorean')
  const [inputValue, setInputValue] = useState<string>('')
  const [spacing, setSpacing] = useState(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const hasValue = inputValue !== '' && inputValue !== '0' && /[1-9]/.test(inputValue)

  const formattedNumber = useMemo(() => commafy(inputValue), [inputValue])
  const koreanReading = useMemo(() => (hasValue ? toKorean(inputValue, KO_DIGITS, KO_SMALL, KO_LARGE, spacing) : ''), [inputValue, spacing, hasValue])
  const koreanFormal = useMemo(() => (koreanReading ? `금 ${koreanReading}원정` : ''), [koreanReading])
  const chineseFormat = useMemo(() => {
    if (!hasValue) return ''
    const cn = toKorean(inputValue, CN_DIGITS, CN_SMALL, CN_LARGE, false)
    return cn ? `金 ${cn}圓整` : ''
  }, [inputValue, hasValue])
  const englishFormat = useMemo(() => (hasValue ? toEnglish(inputValue) : ''), [inputValue, hasValue])

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^0-9]/g, '')
    if (value.length > 20) return
    setInputValue(value)
  }, [])

  const handleQuickAmount = useCallback((amount: number) => {
    setInputValue(amount.toString())
  }, [])

  const handleReset = useCallback(() => {
    setInputValue('')
    setCopiedId(null)
  }, [])

  const copyToClipboard = useCallback(async (text: string, id: string) => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text)
      } else {
        const ta = document.createElement('textarea')
        ta.value = text
        ta.style.position = 'fixed'
        ta.style.left = '-999999px'
        document.body.appendChild(ta)
        ta.select()
        document.execCommand('copy')
        document.body.removeChild(ta)
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
    { label: '10만', value: 100000 },
    { label: '100만', value: 1000000 },
    { label: '1000만', value: 10000000 },
    { label: '1억', value: 100000000 },
    { label: '10억', value: 1000000000 },
  ]

  const cards: { id: string; label: string; value: string; accent: string; border: string }[] = [
    { id: 'formal', label: t('koreanFormal'), value: koreanFormal, accent: 'text-blue-700 dark:text-blue-300', border: 'border-blue-500 bg-blue-50 dark:bg-blue-950' },
    { id: 'reading', label: t('koreanInformal'), value: koreanReading, accent: 'text-green-700 dark:text-green-300', border: 'border-green-500 bg-green-50 dark:bg-green-950' },
    { id: 'english', label: t('englishNum'), value: englishFormat, accent: 'text-indigo-700 dark:text-indigo-300', border: 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950' },
    { id: 'chinese', label: t('chineseNum'), value: chineseFormat, accent: 'text-orange-700 dark:text-orange-300', border: 'border-orange-500 bg-orange-50 dark:bg-orange-950' },
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
        {/* Left Panel */}
        <div className="lg:col-span-1">
          <div className={`${glassCard} ${glassInset} p-6 space-y-6`}>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('inputNumber')}</label>
              <input
                type="text"
                inputMode="numeric"
                value={inputValue}
                onChange={handleInputChange}
                placeholder={t('placeholder')}
                className={`w-full px-3 py-2 ${glassInput} focus:ring-2 focus:ring-blue-500 text-lg`}
                maxLength={20}
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{t('maxNumber')}</p>
            </div>

            {/* Spacing toggle */}
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={spacing} onChange={(e) => setSpacing(e.target.checked)} className="w-4 h-4 accent-blue-600" />
              <span className="text-sm text-gray-700 dark:text-gray-300">{t('spacing')}</span>
            </label>

            {/* Quick Amount Buttons */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('quickAmounts')}</label>
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

            <button
              onClick={handleReset}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              {t('reset')}
            </button>
          </div>
        </div>

        {/* Right Panel */}
        <div className="lg:col-span-2">
          <div className={`${glassCard} ${glassInset} p-6 space-y-5`}>
            {/* Number display */}
            <div className="text-center pb-5 border-b border-gray-200 dark:border-gray-700">
              <div className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">{t('numberDisplay')}</div>
              <div className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white break-all">{formattedNumber}</div>
            </div>

            {cards.map((card) => (
              <div key={card.id} className={`rounded-xl p-4 border-l-4 ${card.border}`}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className={`text-sm font-medium mb-2 ${card.accent}`}>{card.label}</div>
                    <div className="text-xl font-medium text-gray-900 dark:text-white break-words">
                      {card.value || t('inputPrompt')}
                    </div>
                  </div>
                  <button
                    onClick={() => card.value && copyToClipboard(card.value, card.id)}
                    disabled={!card.value}
                    className="flex-shrink-0 p-2 hover:bg-white/60 dark:hover:bg-white/10 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    title={t('copy')}
                  >
                    {copiedId === card.id ? <Check className="w-5 h-5 text-green-600 dark:text-green-400" /> : <Copy className={`w-5 h-5 ${card.accent}`} />}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Guide Section */}
      <div className={`${glassCard} ${glassInset} p-6`}>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
          <BookOpen className="w-6 h-6" />
          {t('guide.title')}
        </h2>
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white mb-3">{t('guide.usage.title')}</h3>
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
            <h3 className="font-semibold text-gray-900 dark:text-white mb-3">{t('guide.rules.title')}</h3>
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
