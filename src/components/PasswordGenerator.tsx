'use client'

import { useState, useCallback, useMemo } from 'react'
import { useTranslations } from 'next-intl'
import {
  Copy,
  Check,
  RefreshCw,
  Settings,
  Shield,
  Info,
  Key,
  BookOpen,
  Trash2,
  ChevronDown,
  ChevronUp,
  AlertCircle,
} from 'lucide-react'
import { WORD_LIST } from '@/utils/wordlist'

// ── Types ──

type Mode = 'password' | 'passphrase'
type SeparatorType = 'hyphen' | 'space' | 'period' | 'underscore'

interface PasswordSettings {
  length: number
  uppercase: boolean
  lowercase: boolean
  numbers: boolean
  specialChars: boolean
  customSpecialChars: string
  excludeAmbiguous: boolean
  count: number
}

interface PassphraseSettings {
  wordCount: number
  separator: SeparatorType
  capitalizeFirst: boolean
  count: number
}

interface GeneratedPassword {
  id: string
  value: string
  entropy: number
  strength: StrengthLevel
  strengthPercent: number
}

type StrengthLevel = 'veryWeak' | 'weak' | 'medium' | 'strong' | 'veryStrong'

interface HistoryEntry {
  id: string
  value: string
  strength: StrengthLevel
  timestamp: number
}

// ── Constants ──

const UPPERCASE = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
const LOWERCASE = 'abcdefghijklmnopqrstuvwxyz'
const NUMBERS = '0123456789'
const DEFAULT_SPECIAL = '!@#$%^&*()_+-=[]{}|;:,.<>?'
const AMBIGUOUS_CHARS = '0OolI1'

const SEPARATOR_MAP: Record<SeparatorType, string> = {
  hyphen: '-',
  space: ' ',
  period: '.',
  underscore: '_',
}

const STRENGTH_COLORS: Record<StrengthLevel, string> = {
  veryWeak: 'bg-red-500',
  weak: 'bg-orange-500',
  medium: 'bg-yellow-500',
  strong: 'bg-green-500',
  veryStrong: 'bg-emerald-500',
}

const STRENGTH_TEXT_COLORS: Record<StrengthLevel, string> = {
  veryWeak: 'text-red-600 dark:text-red-400',
  weak: 'text-orange-600 dark:text-orange-400',
  medium: 'text-yellow-600 dark:text-yellow-400',
  strong: 'text-green-600 dark:text-green-400',
  veryStrong: 'text-emerald-600 dark:text-emerald-400',
}

const MAX_HISTORY = 50

// ── Crypto-safe random helpers ──

function secureRandomIndex(max: number): number {
  const array = new Uint32Array(1)
  crypto.getRandomValues(array)
  return array[0] % max
}

function secureShuffleArray<T>(arr: T[]): T[] {
  const shuffled = [...arr]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = secureRandomIndex(i + 1)
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled
}

// ── Strength calculation ──

function calculateEntropy(length: number, poolSize: number): number {
  if (poolSize <= 0 || length <= 0) return 0
  return length * Math.log2(poolSize)
}

function getStrengthFromEntropy(entropy: number): { level: StrengthLevel; percent: number } {
  if (entropy < 30) return { level: 'veryWeak', percent: Math.min((entropy / 30) * 20, 20) }
  if (entropy < 50) return { level: 'weak', percent: 20 + ((entropy - 30) / 20) * 20 }
  if (entropy < 70) return { level: 'medium', percent: 40 + ((entropy - 50) / 20) * 20 }
  if (entropy < 90) return { level: 'strong', percent: 60 + ((entropy - 70) / 20) * 20 }
  return { level: 'veryStrong', percent: Math.min(80 + ((entropy - 90) / 40) * 20, 100) }
}

function calculatePassphraseEntropy(wordCount: number, listSize: number, separatorCount: number): number {
  // entropy from word choices + entropy from separator positions
  const wordEntropy = wordCount * Math.log2(listSize)
  const sepEntropy = (wordCount - 1) * Math.log2(Math.max(separatorCount, 1))
  return wordEntropy + sepEntropy
}

// ── Component ──

export default function PasswordGenerator() {
  const t = useTranslations('passwordGenerator')

  // Mode
  const [mode, setMode] = useState<Mode>('password')

  // Password settings
  const [passwordSettings, setPasswordSettings] = useState<PasswordSettings>({
    length: 16,
    uppercase: true,
    lowercase: true,
    numbers: true,
    specialChars: true,
    customSpecialChars: DEFAULT_SPECIAL,
    excludeAmbiguous: false,
    count: 5,
  })

  // Passphrase settings
  const [passphraseSettings, setPassphraseSettings] = useState<PassphraseSettings>({
    wordCount: 4,
    separator: 'hyphen',
    capitalizeFirst: true,
    count: 5,
  })

  // Results & UI state
  const [results, setResults] = useState<GeneratedPassword[]>([])
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [history, setHistory] = useState<HistoryEntry[]>([])
  const [showHistory, setShowHistory] = useState(false)

  // ── Build character pool ──
  const characterPool = useMemo(() => {
    let pool = ''
    if (passwordSettings.uppercase) pool += UPPERCASE
    if (passwordSettings.lowercase) pool += LOWERCASE
    if (passwordSettings.numbers) pool += NUMBERS
    if (passwordSettings.specialChars) pool += passwordSettings.customSpecialChars

    if (passwordSettings.excludeAmbiguous) {
      pool = pool
        .split('')
        .filter((c) => !AMBIGUOUS_CHARS.includes(c))
        .join('')
    }

    return pool
  }, [passwordSettings])

  // ── Generate a single password ──
  const generateSinglePassword = useCallback((): string => {
    const pool = characterPool
    if (pool.length === 0) return ''

    // Collect required chars from each selected type
    const required: string[] = []
    const buildFiltered = (chars: string) => {
      let filtered = chars
      if (passwordSettings.excludeAmbiguous) {
        filtered = filtered
          .split('')
          .filter((c) => !AMBIGUOUS_CHARS.includes(c))
          .join('')
      }
      return filtered
    }

    if (passwordSettings.uppercase) {
      const set = buildFiltered(UPPERCASE)
      if (set.length > 0) required.push(set[secureRandomIndex(set.length)])
    }
    if (passwordSettings.lowercase) {
      const set = buildFiltered(LOWERCASE)
      if (set.length > 0) required.push(set[secureRandomIndex(set.length)])
    }
    if (passwordSettings.numbers) {
      const set = buildFiltered(NUMBERS)
      if (set.length > 0) required.push(set[secureRandomIndex(set.length)])
    }
    if (passwordSettings.specialChars) {
      const set = buildFiltered(passwordSettings.customSpecialChars)
      if (set.length > 0) required.push(set[secureRandomIndex(set.length)])
    }

    // Fill remaining length from the full pool
    const remaining = passwordSettings.length - required.length
    const chars: string[] = [...required]
    for (let i = 0; i < remaining; i++) {
      chars.push(pool[secureRandomIndex(pool.length)])
    }

    // Secure shuffle to avoid predictable positions for required chars
    return secureShuffleArray(chars).join('')
  }, [characterPool, passwordSettings])

  // ── Generate a single passphrase ──
  const generateSinglePassphrase = useCallback((): string => {
    const words: string[] = []
    for (let i = 0; i < passphraseSettings.wordCount; i++) {
      let word = WORD_LIST[secureRandomIndex(WORD_LIST.length)]
      if (passphraseSettings.capitalizeFirst) {
        word = word.charAt(0).toUpperCase() + word.slice(1)
      }
      words.push(word)
    }
    return words.join(SEPARATOR_MAP[passphraseSettings.separator])
  }, [passphraseSettings])

  // ── Generate all passwords/passphrases ──
  const handleGenerate = useCallback(() => {
    setError(null)

    if (mode === 'password' && characterPool.length === 0) {
      setError(t('errors.noCharType'))
      return
    }

    const count = mode === 'password' ? passwordSettings.count : passphraseSettings.count
    const generated: GeneratedPassword[] = []

    for (let i = 0; i < count; i++) {
      let value: string
      let entropy: number

      if (mode === 'password') {
        value = generateSinglePassword()
        entropy = calculateEntropy(passwordSettings.length, characterPool.length)
      } else {
        value = generateSinglePassphrase()
        entropy = calculatePassphraseEntropy(
          passphraseSettings.wordCount,
          WORD_LIST.length,
          Object.keys(SEPARATOR_MAP).length,
        )
      }

      const { level, percent } = getStrengthFromEntropy(entropy)

      generated.push({
        id: `${Date.now()}-${i}`,
        value,
        entropy,
        strength: level,
        strengthPercent: percent,
      })
    }

    setResults(generated)

    // Add to session history
    setHistory((prev) => {
      const newEntries: HistoryEntry[] = generated.map((g) => ({
        id: g.id,
        value: g.value,
        strength: g.strength,
        timestamp: Date.now(),
      }))
      const combined = [...newEntries, ...prev]
      return combined.slice(0, MAX_HISTORY)
    })
  }, [
    mode,
    characterPool,
    passwordSettings,
    passphraseSettings,
    generateSinglePassword,
    generateSinglePassphrase,
    t,
  ])

  // ── Clipboard ──
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

  const copyAll = useCallback(async () => {
    const allText = results.map((r) => r.value).join('\n')
    await copyToClipboard(allText, 'all')
  }, [results, copyToClipboard])

  // ── History ──
  const clearHistory = useCallback(() => {
    setHistory([])
  }, [])

  // ── Guide arrays ──
  const tipItems = useMemo(() => {
    try {
      return t.raw('guide.tips.items') as string[]
    } catch {
      return []
    }
  }, [t])

  const passphraseItems = useMemo(() => {
    try {
      return t.raw('guide.passphrase.items') as string[]
    } catch {
      return []
    }
  }, [t])

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          {t('title')}
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          {t('description')}
        </p>
      </div>

      {/* Mode Tabs */}
      <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
        <button
          onClick={() => { setMode('password'); setResults([]); setError(null) }}
          className={`flex-1 flex items-center justify-center space-x-2 py-2.5 px-4 rounded-md text-sm font-medium transition-all ${
            mode === 'password'
              ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm'
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
          }`}
        >
          <Key className="w-4 h-4" />
          <span>{t('modes.password')}</span>
        </button>
        <button
          onClick={() => { setMode('passphrase'); setResults([]); setError(null) }}
          className={`flex-1 flex items-center justify-center space-x-2 py-2.5 px-4 rounded-md text-sm font-medium transition-all ${
            mode === 'passphrase'
              ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm'
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          <span>{t('modes.passphrase')}</span>
        </button>
      </div>

      {/* Main Grid */}
      <div className="grid lg:grid-cols-3 gap-8">
        {/* Settings Panel */}
        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 space-y-6">
            <div className="flex items-center space-x-2">
              <Settings className="w-5 h-5 text-blue-600" />
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                {t('settings.title')}
              </h2>
            </div>

            {mode === 'password' ? (
              <>
                {/* Password Length */}
                <div className="space-y-3">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    {t('settings.length')}: <span className="text-blue-600 font-bold">{passwordSettings.length}</span>
                  </label>
                  <input
                    type="range"
                    min={8}
                    max={128}
                    value={passwordSettings.length}
                    onChange={(e) =>
                      setPasswordSettings((prev) => ({ ...prev, length: parseInt(e.target.value) }))
                    }
                    className="w-full h-2 bg-gray-200 dark:bg-gray-600 rounded-lg appearance-none cursor-pointer accent-blue-600"
                  />
                  <div className="flex justify-between text-xs text-gray-400">
                    <span>8</span>
                    <span>128</span>
                  </div>
                </div>

                {/* Character Types */}
                <div className="space-y-3">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    {t('settings.characters')}
                  </label>
                  <div className="space-y-2">
                    <label className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        checked={passwordSettings.uppercase}
                        onChange={(e) =>
                          setPasswordSettings((prev) => ({ ...prev, uppercase: e.target.checked }))
                        }
                        className="w-4 h-4 accent-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300">
                        {t('settings.uppercase')}
                      </span>
                    </label>
                    <label className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        checked={passwordSettings.lowercase}
                        onChange={(e) =>
                          setPasswordSettings((prev) => ({ ...prev, lowercase: e.target.checked }))
                        }
                        className="w-4 h-4 accent-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300">
                        {t('settings.lowercase')}
                      </span>
                    </label>
                    <label className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        checked={passwordSettings.numbers}
                        onChange={(e) =>
                          setPasswordSettings((prev) => ({ ...prev, numbers: e.target.checked }))
                        }
                        className="w-4 h-4 accent-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300">
                        {t('settings.numbers')}
                      </span>
                    </label>
                    <label className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        checked={passwordSettings.specialChars}
                        onChange={(e) =>
                          setPasswordSettings((prev) => ({ ...prev, specialChars: e.target.checked }))
                        }
                        className="w-4 h-4 accent-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300">
                        {t('settings.specialChars')}
                      </span>
                    </label>
                  </div>
                </div>

                {/* Custom Special Characters */}
                {passwordSettings.specialChars && (
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      {t('settings.customSpecialChars')}
                    </label>
                    <input
                      type="text"
                      value={passwordSettings.customSpecialChars}
                      onChange={(e) =>
                        setPasswordSettings((prev) => ({ ...prev, customSpecialChars: e.target.value }))
                      }
                      placeholder={t('settings.customSpecialCharsPlaceholder')}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                    />
                  </div>
                )}

                {/* Exclude Ambiguous */}
                <div className="space-y-1">
                  <label className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      checked={passwordSettings.excludeAmbiguous}
                      onChange={(e) =>
                        setPasswordSettings((prev) => ({ ...prev, excludeAmbiguous: e.target.checked }))
                      }
                      className="w-4 h-4 accent-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      {t('settings.excludeAmbiguous')}
                    </span>
                  </label>
                  <p className="text-xs text-gray-400 dark:text-gray-500 ml-7">
                    {t('settings.excludeAmbiguousDesc')}
                  </p>
                </div>

                {/* Generate Count */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    {t('settings.count')}
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={10}
                    value={passwordSettings.count}
                    onChange={(e) =>
                      setPasswordSettings((prev) => ({
                        ...prev,
                        count: Math.max(1, Math.min(10, parseInt(e.target.value) || 1)),
                      }))
                    }
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </>
            ) : (
              <>
                {/* Word Count */}
                <div className="space-y-3">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    {t('settings.wordCount')}: <span className="text-blue-600 font-bold">{passphraseSettings.wordCount}</span>
                  </label>
                  <input
                    type="range"
                    min={3}
                    max={8}
                    value={passphraseSettings.wordCount}
                    onChange={(e) =>
                      setPassphraseSettings((prev) => ({ ...prev, wordCount: parseInt(e.target.value) }))
                    }
                    className="w-full h-2 bg-gray-200 dark:bg-gray-600 rounded-lg appearance-none cursor-pointer accent-blue-600"
                  />
                  <div className="flex justify-between text-xs text-gray-400">
                    <span>3</span>
                    <span>8</span>
                  </div>
                </div>

                {/* Separator */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    {t('settings.separator')}
                  </label>
                  <select
                    value={passphraseSettings.separator}
                    onChange={(e) =>
                      setPassphraseSettings((prev) => ({ ...prev, separator: e.target.value as SeparatorType }))
                    }
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="hyphen">{t('settings.separators.hyphen')}</option>
                    <option value="space">{t('settings.separators.space')}</option>
                    <option value="period">{t('settings.separators.period')}</option>
                    <option value="underscore">{t('settings.separators.underscore')}</option>
                  </select>
                </div>

                {/* Capitalize First */}
                <label className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={passphraseSettings.capitalizeFirst}
                    onChange={(e) =>
                      setPassphraseSettings((prev) => ({ ...prev, capitalizeFirst: e.target.checked }))
                    }
                    className="w-4 h-4 accent-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    {t('settings.capitalizeFirst')}
                  </span>
                </label>

                {/* Generate Count */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    {t('settings.count')}
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={10}
                    value={passphraseSettings.count}
                    onChange={(e) =>
                      setPassphraseSettings((prev) => ({
                        ...prev,
                        count: Math.max(1, Math.min(10, parseInt(e.target.value) || 1)),
                      }))
                    }
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </>
            )}

            {/* Error */}
            {error && (
              <div className="flex items-center space-x-2 text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950 p-3 rounded-lg">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span className="text-sm">{error}</span>
              </div>
            )}

            {/* Generate Button */}
            <button
              onClick={handleGenerate}
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-medium py-3 px-4 rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 shadow-lg hover:shadow-xl flex items-center justify-center space-x-2"
            >
              <RefreshCw className="w-5 h-5" />
              <span>{t('generate')}</span>
            </button>
          </div>
        </div>

        {/* Results Panel */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
            {/* Results Header */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-2">
                <Shield className="w-5 h-5 text-green-600" />
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  {t('result.title')}
                </h2>
                {results.length > 0 && (
                  <span className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 px-2 py-1 rounded-full text-sm">
                    {t('result.count', { count: results.length })}
                  </span>
                )}
              </div>
              {results.length > 0 && (
                <button
                  onClick={copyAll}
                  className="flex items-center space-x-1 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                >
                  {copiedId === 'all' ? (
                    <Check className="w-4 h-4" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                  <span>{copiedId === 'all' ? t('copied') : t('copyAll')}</span>
                </button>
              )}
            </div>

            {/* Results List */}
            {results.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Key className="w-8 h-8 text-gray-400" />
                </div>
                <p className="text-gray-500 dark:text-gray-400">
                  {t('result.empty')}
                </p>
              </div>
            ) : (
              <div className="space-y-4 max-h-[600px] overflow-y-auto">
                {results.map((item) => (
                  <div
                    key={item.id}
                    className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg space-y-3"
                  >
                    {/* Password value + copy button */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="font-mono text-sm text-gray-900 dark:text-white break-all leading-relaxed">
                          {item.value}
                        </p>
                      </div>
                      <button
                        onClick={() => copyToClipboard(item.value, item.id)}
                        className="flex-shrink-0 p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors rounded-md hover:bg-gray-200 dark:hover:bg-gray-600"
                        title={t('copy')}
                      >
                        {copiedId === item.id ? (
                          <Check className="w-4 h-4 text-green-600" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </button>
                    </div>

                    {/* Strength bar */}
                    <div className="space-y-1.5">
                      <div className="w-full h-2 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${STRENGTH_COLORS[item.strength]}`}
                          style={{ width: `${item.strengthPercent}%` }}
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <span className={`text-xs font-medium ${STRENGTH_TEXT_COLORS[item.strength]}`}>
                          {t(`strength.${item.strength}`)}
                        </span>
                        <span className="text-xs text-gray-400 dark:text-gray-500">
                          {t('strength.entropy')}: {item.entropy.toFixed(1)} {t('strength.bits')}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* History Section */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden">
            <button
              onClick={() => setShowHistory((prev) => !prev)}
              className="w-full flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors"
            >
              <div className="flex items-center space-x-2">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {t('history.title')}
                </h3>
                {history.length > 0 && (
                  <span className="bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300 px-2 py-0.5 rounded-full text-xs">
                    {history.length}
                  </span>
                )}
              </div>
              <div className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400">
                <span>{showHistory ? t('history.hide') : t('history.show')}</span>
                {showHistory ? (
                  <ChevronUp className="w-4 h-4" />
                ) : (
                  <ChevronDown className="w-4 h-4" />
                )}
              </div>
            </button>

            {showHistory && (
              <div className="border-t border-gray-200 dark:border-gray-700 p-4">
                {history.length === 0 ? (
                  <p className="text-center text-gray-400 dark:text-gray-500 py-4 text-sm">
                    {t('history.empty')}
                  </p>
                ) : (
                  <>
                    <div className="flex justify-end mb-3">
                      <button
                        onClick={clearHistory}
                        className="flex items-center space-x-1 text-sm text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>{t('history.clear')}</span>
                      </button>
                    </div>
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {history.map((entry) => (
                        <div
                          key={entry.id}
                          className="flex items-center justify-between p-2.5 bg-gray-50 dark:bg-gray-700 rounded-lg"
                        >
                          <div className="flex items-center space-x-3 min-w-0 flex-1">
                            <div
                              className={`w-2 h-2 rounded-full flex-shrink-0 ${STRENGTH_COLORS[entry.strength]}`}
                            />
                            <span className="font-mono text-xs text-gray-800 dark:text-gray-200 truncate">
                              {entry.value}
                            </span>
                          </div>
                          <button
                            onClick={() => copyToClipboard(entry.value, `hist-${entry.id}`)}
                            className="flex-shrink-0 ml-2 p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                          >
                            {copiedId === `hist-${entry.id}` ? (
                              <Check className="w-3.5 h-3.5 text-green-600" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Guide Section */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
        <div className="flex items-center space-x-2 mb-6">
          <Info className="w-5 h-5 text-orange-600" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            {t('guide.title')}
          </h2>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Tips */}
          <div>
            <h3 className="font-medium text-gray-900 dark:text-white mb-3">
              {t('guide.tips.title')}
            </h3>
            <div className="space-y-3">
              {tipItems.map((item: string, index: number) => (
                <div key={index} className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-blue-600 rounded-full mt-2 flex-shrink-0" />
                  <p className="text-sm text-gray-600 dark:text-gray-400">{item}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Passphrase Benefits */}
          <div>
            <h3 className="font-medium text-gray-900 dark:text-white mb-3">
              {t('guide.passphrase.title')}
            </h3>
            <div className="space-y-3">
              {passphraseItems.map((item: string, index: number) => (
                <div key={index} className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-green-600 rounded-full mt-2 flex-shrink-0" />
                  <p className="text-sm text-gray-600 dark:text-gray-400">{item}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
