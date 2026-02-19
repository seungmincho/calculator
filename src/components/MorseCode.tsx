'use client'

import { useState, useCallback, useRef, useMemo, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { Radio, Copy, Check, Volume2, VolumeX, BookOpen, Trash2 } from 'lucide-react'

const MORSE_MAP: Record<string, string> = {
  'A': '·─', 'B': '─···', 'C': '─·─·', 'D': '─··', 'E': '·',
  'F': '··─·', 'G': '──·', 'H': '····', 'I': '··', 'J': '·───',
  'K': '─·─', 'L': '·─··', 'M': '──', 'N': '─·', 'O': '───',
  'P': '·──·', 'Q': '──·─', 'R': '·─·', 'S': '···', 'T': '─',
  'U': '··─', 'V': '···─', 'W': '·──', 'X': '─··─', 'Y': '─·──',
  'Z': '──··',
  '0': '─────', '1': '·────', '2': '··───', '3': '···──',
  '4': '····─', '5': '·····', '6': '─····', '7': '──···',
  '8': '───··', '9': '────·',
  ' ': '/'
}

const REVERSE_MORSE_MAP = Object.entries(MORSE_MAP).reduce((acc, [key, value]) => {
  acc[value] = key
  return acc
}, {} as Record<string, string>)

type Mode = 'textToMorse' | 'morseToText'
type Speed = 'slow' | 'normal' | 'fast'

const SPEED_MULTIPLIER: Record<Speed, number> = {
  slow: 2,
  normal: 1,
  fast: 0.5
}

export default function MorseCode() {
  const t = useTranslations('morseCode')
  const [mode, setMode] = useState<Mode>('textToMorse')
  const [textInput, setTextInput] = useState('')
  const [morseInput, setMorseInput] = useState('')
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [speed, setSpeed] = useState<Speed>('normal')

  const audioContextRef = useRef<AudioContext | null>(null)
  const stopPlaybackRef = useRef<(() => void) | null>(null)

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (stopPlaybackRef.current) {
        stopPlaybackRef.current()
      }
      if (audioContextRef.current) {
        audioContextRef.current.close()
      }
    }
  }, [])

  const textToMorse = useCallback((text: string): string => {
    return text
      .toUpperCase()
      .split('')
      .map(char => MORSE_MAP[char] || '')
      .filter(code => code !== '')
      .join(' ')
  }, [])

  const morseToText = useCallback((morse: string): string => {
    return morse
      .split(' / ')
      .map(word =>
        word
          .split(' ')
          .map(code => REVERSE_MORSE_MAP[code] || '')
          .join('')
      )
      .join(' ')
  }, [])

  const result = useMemo(() => {
    if (mode === 'textToMorse') {
      return textToMorse(textInput)
    } else {
      return morseToText(morseInput)
    }
  }, [mode, textInput, morseInput, textToMorse, morseToText])

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

  const playMorse = useCallback(async () => {
    const morseCode = mode === 'textToMorse' ? result : morseInput
    if (!morseCode || isPlaying) return

    try {
      // Initialize AudioContext on user interaction
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)()
      }

      const ctx = audioContextRef.current
      const multiplier = SPEED_MULTIPLIER[speed]

      const DOT_DURATION = 100 * multiplier / 1000 // seconds
      const DASH_DURATION = 300 * multiplier / 1000
      const ELEMENT_GAP = 100 * multiplier / 1000
      const LETTER_GAP = 300 * multiplier / 1000
      const WORD_GAP = 700 * multiplier / 1000

      let currentTime = ctx.currentTime
      let stopped = false

      stopPlaybackRef.current = () => {
        stopped = true
        setIsPlaying(false)
      }

      setIsPlaying(true)

      for (let i = 0; i < morseCode.length && !stopped; i++) {
        const char = morseCode[i]

        if (char === '·') {
          const osc = ctx.createOscillator()
          const gain = ctx.createGain()
          osc.connect(gain)
          gain.connect(ctx.destination)
          osc.frequency.value = 600
          gain.gain.value = 0.3
          osc.start(currentTime)
          osc.stop(currentTime + DOT_DURATION)
          currentTime += DOT_DURATION + ELEMENT_GAP
        } else if (char === '─') {
          const osc = ctx.createOscillator()
          const gain = ctx.createGain()
          osc.connect(gain)
          gain.connect(ctx.destination)
          osc.frequency.value = 600
          gain.gain.value = 0.3
          osc.start(currentTime)
          osc.stop(currentTime + DASH_DURATION)
          currentTime += DASH_DURATION + ELEMENT_GAP
        } else if (char === ' ') {
          currentTime += LETTER_GAP
        } else if (char === '/') {
          currentTime += WORD_GAP
        }
      }

      // Schedule cleanup
      setTimeout(() => {
        if (!stopped) {
          setIsPlaying(false)
          stopPlaybackRef.current = null
        }
      }, (currentTime - ctx.currentTime) * 1000)

    } catch (error) {
      setIsPlaying(false)
      stopPlaybackRef.current = null
    }
  }, [mode, result, morseInput, isPlaying, speed])

  const stopPlayback = useCallback(() => {
    if (stopPlaybackRef.current) {
      stopPlaybackRef.current()
    }
  }, [])

  const handleClear = useCallback(() => {
    setTextInput('')
    setMorseInput('')
  }, [])

  const letters = Object.entries(MORSE_MAP).filter(([key]) => /[A-Z]/.test(key))
  const numbers = Object.entries(MORSE_MAP).filter(([key]) => /[0-9]/.test(key))

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('title')}</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('description')}</p>
      </div>

      {/* Main Grid */}
      <div className="grid lg:grid-cols-3 gap-8">
        {/* Input Panel */}
        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 space-y-4">
            {/* Mode Selection */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                <Radio className="inline w-4 h-4 mr-1" />
                {t('mode.textToMorse')}
              </label>
              <div className="flex gap-2">
                <button
                  onClick={() => setMode('textToMorse')}
                  className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
                    mode === 'textToMorse'
                      ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  {t('mode.textToMorse')}
                </button>
                <button
                  onClick={() => setMode('morseToText')}
                  className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
                    mode === 'morseToText'
                      ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  {t('mode.morseToText')}
                </button>
              </div>
            </div>

            {/* Input Area */}
            {mode === 'textToMorse' ? (
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  {t('textInput')}
                </label>
                <textarea
                  value={textInput}
                  onChange={(e) => setTextInput(e.target.value)}
                  placeholder={t('textPlaceholder')}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white min-h-[120px] focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            ) : (
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  {t('morseInput')}
                </label>
                <textarea
                  value={morseInput}
                  onChange={(e) => setMorseInput(e.target.value)}
                  placeholder={t('morsePlaceholder')}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white min-h-[120px] focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono"
                />
              </div>
            )}

            {/* Speed Control */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                {t('speed')}
              </label>
              <div className="flex gap-2">
                {(['slow', 'normal', 'fast'] as Speed[]).map((s) => (
                  <button
                    key={s}
                    onClick={() => setSpeed(s)}
                    className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      speed === s
                        ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 border border-blue-300 dark:border-blue-700'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                  >
                    {t(s)}
                  </button>
                ))}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2">
              <button
                onClick={handleClear}
                className="flex-1 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg px-4 py-2 font-medium flex items-center justify-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                {t('clear')}
              </button>
            </div>
          </div>
        </div>

        {/* Result Panel */}
        <div className="lg:col-span-2">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                {t('result')}
              </h2>
              <div className="flex gap-2">
                <button
                  onClick={isPlaying ? stopPlayback : playMorse}
                  disabled={!result && mode === 'textToMorse'}
                  className="bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg px-4 py-2 font-medium hover:from-green-700 hover:to-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isPlaying ? (
                    <>
                      <VolumeX className="w-4 h-4" />
                      {t('stop')}
                    </>
                  ) : (
                    <>
                      <Volume2 className="w-4 h-4" />
                      {t('play')}
                    </>
                  )}
                </button>
                <button
                  onClick={() => copyToClipboard(result, 'result')}
                  disabled={!result}
                  className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg px-4 py-2 font-medium hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {copiedId === 'result' ? (
                    <>
                      <Check className="w-4 h-4" />
                      {t('copied')}
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      {t('copy')}
                    </>
                  )}
                </button>
              </div>
            </div>
            <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 min-h-[200px]">
              <pre className="text-gray-900 dark:text-white font-mono text-lg whitespace-pre-wrap break-words">
                {result || (mode === 'textToMorse' ? t('textPlaceholder') : t('morsePlaceholder'))}
              </pre>
            </div>
          </div>

          {/* Reference Table */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 mt-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              {t('referenceTable')}
            </h2>
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('letters')}
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                  {letters.map(([letter, morse]) => (
                    <div
                      key={letter}
                      className="bg-gray-50 dark:bg-gray-900 rounded-lg px-3 py-2 flex items-center justify-between"
                    >
                      <span className="font-bold text-gray-900 dark:text-white">{letter}</span>
                      <span className="font-mono text-blue-600 dark:text-blue-400">{morse}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('numbers')}
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
                  {numbers.map(([number, morse]) => (
                    <div
                      key={number}
                      className="bg-gray-50 dark:bg-gray-900 rounded-lg px-3 py-2 flex items-center justify-between"
                    >
                      <span className="font-bold text-gray-900 dark:text-white">{number}</span>
                      <span className="font-mono text-blue-600 dark:text-blue-400">{morse}</span>
                    </div>
                  ))}
                </div>
              </div>
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
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
              {t('guide.basics.title')}
            </h3>
            <ul className="space-y-2">
              {(t.raw('guide.basics.items') as string[]).map((item, index) => (
                <li key={index} className="flex items-start gap-2 text-gray-700 dark:text-gray-300">
                  <span className="text-blue-600 dark:text-blue-400 mt-1">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
              {t('guide.tips.title')}
            </h3>
            <ul className="space-y-2">
              {(t.raw('guide.tips.items') as string[]).map((item, index) => (
                <li key={index} className="flex items-start gap-2 text-gray-700 dark:text-gray-300">
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
