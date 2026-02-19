'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useTranslations } from 'next-intl'
import { Volume2, Play, Pause, Square, BookOpen, MessageSquare } from 'lucide-react'

type Status = 'stopped' | 'speaking' | 'paused'

export default function TextToSpeech() {
  const t = useTranslations('textToSpeech')

  const [text, setText] = useState('')
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([])
  const [selectedVoice, setSelectedVoice] = useState<SpeechSynthesisVoice | null>(null)
  const [rate, setRate] = useState(1)
  const [pitch, setPitch] = useState(1)
  const [volume, setVolume] = useState(1)
  const [status, setStatus] = useState<Status>('stopped')
  const [isSupported, setIsSupported] = useState(true)

  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null)

  // Load voices
  useEffect(() => {
    if (typeof window === 'undefined' || !window.speechSynthesis) {
      setIsSupported(false)
      return
    }

    const loadVoices = () => {
      const availableVoices = speechSynthesis.getVoices()
      if (availableVoices.length > 0) {
        setVoices(availableVoices)

        // Prefer Korean voices
        const koreanVoice = availableVoices.find(v => v.lang.startsWith('ko'))
        setSelectedVoice(koreanVoice || availableVoices[0])
      }
    }

    loadVoices()
    speechSynthesis.onvoiceschanged = loadVoices

    return () => {
      speechSynthesis.cancel()
    }
  }, [])

  const handlePlay = useCallback(() => {
    if (!text.trim() || !selectedVoice) return

    speechSynthesis.cancel()

    const utterance = new SpeechSynthesisUtterance(text)
    utterance.voice = selectedVoice
    utterance.rate = rate
    utterance.pitch = pitch
    utterance.volume = volume

    utterance.onstart = () => setStatus('speaking')
    utterance.onend = () => setStatus('stopped')
    utterance.onerror = () => setStatus('stopped')

    utteranceRef.current = utterance
    speechSynthesis.speak(utterance)
  }, [text, selectedVoice, rate, pitch, volume])

  const handlePause = useCallback(() => {
    if (status === 'speaking') {
      speechSynthesis.pause()
      setStatus('paused')
    }
  }, [status])

  const handleResume = useCallback(() => {
    if (status === 'paused') {
      speechSynthesis.resume()
      setStatus('speaking')
    }
  }, [status])

  const handleStop = useCallback(() => {
    speechSynthesis.cancel()
    setStatus('stopped')
  }, [])

  const handleVoiceChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    const voice = voices.find(v => v.name === e.target.value)
    if (voice) setSelectedVoice(voice)
  }, [voices])

  const handlePresetClick = useCallback((presetText: string) => {
    setText(presetText)
  }, [])

  const charCount = text.length
  const estimatedTime = Math.ceil((text.split(/\s+/).length / (rate * 150)) * 60)

  if (!isSupported) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('title')}</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('description')}</p>
        </div>
        <div className="bg-red-50 dark:bg-red-950 rounded-xl p-6">
          <p className="text-red-700 dark:text-red-300">{t('notSupported')}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('title')}</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('description')}</p>
      </div>

      {/* Main Grid */}
      <div className="grid lg:grid-cols-3 gap-8">
        {/* Settings Panel */}
        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 space-y-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <Volume2 className="w-5 h-5" />
              {t('voice')}
            </h2>

            {/* Voice Selector */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('voice')}
              </label>
              {voices.length > 0 ? (
                <select
                  value={selectedVoice?.name || ''}
                  onChange={handleVoiceChange}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                >
                  {voices.map((voice) => (
                    <option key={voice.name} value={voice.name}>
                      {voice.name} ({voice.lang})
                    </option>
                  ))}
                </select>
              ) : (
                <p className="text-sm text-gray-500 dark:text-gray-400">{t('noVoices')}</p>
              )}
            </div>

            {/* Rate Slider */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('rate')}: {rate.toFixed(1)}x
              </label>
              <input
                type="range"
                min="0.5"
                max="2"
                step="0.1"
                value={rate}
                onChange={(e) => setRate(Number(e.target.value))}
                className="w-full accent-blue-600"
              />
            </div>

            {/* Pitch Slider */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('pitch')}: {pitch.toFixed(1)}
              </label>
              <input
                type="range"
                min="0.5"
                max="2"
                step="0.1"
                value={pitch}
                onChange={(e) => setPitch(Number(e.target.value))}
                className="w-full accent-blue-600"
              />
            </div>

            {/* Volume Slider */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('volume')}: {Math.round(volume * 100)}%
              </label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={volume}
                onChange={(e) => setVolume(Number(e.target.value))}
                className="w-full accent-blue-600"
              />
            </div>

            {/* Status Display */}
            <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${
                  status === 'speaking' ? 'bg-green-500 animate-pulse' :
                  status === 'paused' ? 'bg-yellow-500' :
                  'bg-gray-400'
                }`} />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {status === 'speaking' ? t('speaking') :
                   status === 'paused' ? t('paused') :
                   t('stopped')}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Text Input & Controls */}
        <div className="lg:col-span-2 space-y-6">
          {/* Text Input */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('textInput')}
            </label>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={t('textPlaceholder')}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 min-h-[200px]"
            />

            {/* Info */}
            <div className="flex flex-wrap gap-4 mt-4 text-sm text-gray-600 dark:text-gray-400">
              <span>{t('charCount')}: {charCount}</span>
              {charCount > 0 && (
                <span>{t('estimatedTime')}: {estimatedTime} {t('seconds')}</span>
              )}
            </div>
          </div>

          {/* Playback Controls */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
            <div className="flex flex-wrap gap-3">
              <button
                onClick={handlePlay}
                disabled={!text.trim() || !selectedVoice}
                className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg px-4 py-3 font-medium hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <Play className="w-5 h-5" />
                {t('play')}
              </button>

              <button
                onClick={handlePause}
                disabled={status !== 'speaking'}
                className="bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg px-4 py-3 font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <Pause className="w-5 h-5" />
                {t('pause')}
              </button>

              <button
                onClick={handleResume}
                disabled={status !== 'paused'}
                className="bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg px-4 py-3 font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <Play className="w-5 h-5" />
                {t('resume')}
              </button>

              <button
                onClick={handleStop}
                disabled={status === 'stopped'}
                className="bg-red-100 dark:bg-red-900 hover:bg-red-200 dark:hover:bg-red-800 text-red-700 dark:text-red-300 rounded-lg px-4 py-3 font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <Square className="w-5 h-5" />
                {t('stop')}
              </button>
            </div>
          </div>

          {/* Sample Presets */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <MessageSquare className="w-5 h-5" />
              {t('presets.title')}
            </h3>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => handlePresetClick(t('presets.greeting'))}
                className="bg-blue-50 dark:bg-blue-950 hover:bg-blue-100 dark:hover:bg-blue-900 text-blue-700 dark:text-blue-300 rounded-lg px-4 py-2 text-sm font-medium"
              >
                {t('presets.greeting').substring(0, 20)}...
              </button>
              <button
                onClick={() => handlePresetClick(t('presets.news'))}
                className="bg-blue-50 dark:bg-blue-950 hover:bg-blue-100 dark:hover:bg-blue-900 text-blue-700 dark:text-blue-300 rounded-lg px-4 py-2 text-sm font-medium"
              >
                {t('presets.news').substring(0, 20)}...
              </button>
              <button
                onClick={() => handlePresetClick(t('presets.story'))}
                className="bg-blue-50 dark:bg-blue-950 hover:bg-blue-100 dark:hover:bg-blue-900 text-blue-700 dark:text-blue-300 rounded-lg px-4 py-2 text-sm font-medium"
              >
                {t('presets.story').substring(0, 20)}...
              </button>
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
          {/* Usage Section */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
              {t('guide.usage.title')}
            </h3>
            <ul className="space-y-2">
              {(t.raw('guide.usage.items') as string[]).map((item, index) => (
                <li key={index} className="flex items-start gap-2 text-gray-700 dark:text-gray-300">
                  <span className="text-blue-600 dark:text-blue-400 mt-1">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Tips Section */}
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
