'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { Play, Square, BookOpen, Volume2, Moon, Timer } from 'lucide-react'

// ── Noise types ──
type NoiseType = 'white' | 'pink' | 'brown' | 'rain' | 'wind' | 'wave'

const NOISE_TYPES: NoiseType[] = ['white', 'pink', 'brown', 'rain', 'wind', 'wave']

const TIMER_OPTIONS = [0, 5, 10, 15, 30, 60] // minutes, 0 = no timer

function createWhiteNoise(ctx: AudioContext): AudioBufferSourceNode {
  const bufferSize = ctx.sampleRate * 2
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < bufferSize; i++) {
    data[i] = Math.random() * 2 - 1
  }
  const source = ctx.createBufferSource()
  source.buffer = buffer
  source.loop = true
  return source
}

function createPinkNoise(ctx: AudioContext): AudioBufferSourceNode {
  const bufferSize = ctx.sampleRate * 2
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
  const data = buffer.getChannelData(0)
  let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0
  for (let i = 0; i < bufferSize; i++) {
    const white = Math.random() * 2 - 1
    b0 = 0.99886 * b0 + white * 0.0555179
    b1 = 0.99332 * b1 + white * 0.0750759
    b2 = 0.96900 * b2 + white * 0.1538520
    b3 = 0.86650 * b3 + white * 0.3104856
    b4 = 0.55000 * b4 + white * 0.5329522
    b5 = -0.7616 * b5 - white * 0.0168980
    data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11
    b6 = white * 0.115926
  }
  const source = ctx.createBufferSource()
  source.buffer = buffer
  source.loop = true
  return source
}

function createBrownNoise(ctx: AudioContext): AudioBufferSourceNode {
  const bufferSize = ctx.sampleRate * 2
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
  const data = buffer.getChannelData(0)
  let lastOut = 0
  for (let i = 0; i < bufferSize; i++) {
    const white = Math.random() * 2 - 1
    data[i] = (lastOut + 0.02 * white) / 1.02
    lastOut = data[i]
    data[i] *= 3.5
  }
  const source = ctx.createBufferSource()
  source.buffer = buffer
  source.loop = true
  return source
}

function createNatureNoise(ctx: AudioContext, type: 'rain' | 'wind' | 'wave'): AudioBufferSourceNode {
  const bufferSize = ctx.sampleRate * 4
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
  const data = buffer.getChannelData(0)
  let lastOut = 0

  for (let i = 0; i < bufferSize; i++) {
    const t = i / ctx.sampleRate
    const white = Math.random() * 2 - 1

    if (type === 'rain') {
      // Rain: filtered noise with random crackles
      lastOut = (lastOut + 0.04 * white) / 1.04
      const crackle = Math.random() > 0.997 ? (Math.random() * 0.3) : 0
      data[i] = lastOut * 2.5 + crackle
    } else if (type === 'wind') {
      // Wind: slow modulation of brown noise
      const mod = Math.sin(t * 0.3) * 0.5 + Math.sin(t * 0.7) * 0.3 + 0.5
      lastOut = (lastOut + 0.02 * white) / 1.02
      data[i] = lastOut * 3 * mod
    } else {
      // Wave: rhythmic modulation
      const waveCycle = Math.sin(t * 0.5) * 0.5 + 0.5
      const surge = Math.pow(waveCycle, 2)
      lastOut = (lastOut + 0.03 * white) / 1.03
      data[i] = lastOut * 3 * (0.3 + surge * 0.7)
    }
  }

  const source = ctx.createBufferSource()
  source.buffer = buffer
  source.loop = true
  return source
}

export default function WhiteNoise() {
  const t = useTranslations('whiteNoise')
  const [isPlaying, setIsPlaying] = useState(false)
  const [noiseType, setNoiseType] = useState<NoiseType>('white')
  const [volume, setVolume] = useState(50)
  const [timerMinutes, setTimerMinutes] = useState(0)
  const [timerRemaining, setTimerRemaining] = useState(0)
  const [showGuide, setShowGuide] = useState(false)

  const audioContextRef = useRef<AudioContext | null>(null)
  const sourceRef = useRef<AudioBufferSourceNode | null>(null)
  const gainRef = useRef<GainNode | null>(null)
  const timerRef = useRef<number>(0)

  const stopNoise = useCallback(() => {
    if (sourceRef.current) {
      try { sourceRef.current.stop() } catch { /* already stopped */ }
      sourceRef.current = null
    }
    if (audioContextRef.current) {
      audioContextRef.current.close()
      audioContextRef.current = null
    }
    gainRef.current = null
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = 0
    }
    setIsPlaying(false)
    setTimerRemaining(0)
  }, [])

  const startNoise = useCallback((type: NoiseType) => {
    stopNoise()

    const ctx = new AudioContext()
    audioContextRef.current = ctx

    const gain = ctx.createGain()
    gain.gain.value = volume / 100
    gain.connect(ctx.destination)
    gainRef.current = gain

    let source: AudioBufferSourceNode
    switch (type) {
      case 'pink': source = createPinkNoise(ctx); break
      case 'brown': source = createBrownNoise(ctx); break
      case 'rain':
      case 'wind':
      case 'wave': source = createNatureNoise(ctx, type); break
      default: source = createWhiteNoise(ctx)
    }

    source.connect(gain)
    source.start()
    sourceRef.current = source
    setIsPlaying(true)

    // Timer
    if (timerMinutes > 0) {
      let remaining = timerMinutes * 60
      setTimerRemaining(remaining)
      timerRef.current = window.setInterval(() => {
        remaining--
        setTimerRemaining(remaining)
        if (remaining <= 0) {
          stopNoise()
        }
      }, 1000)
    }
  }, [volume, timerMinutes, stopNoise])

  const togglePlay = useCallback(() => {
    if (isPlaying) stopNoise()
    else startNoise(noiseType)
  }, [isPlaying, noiseType, startNoise, stopNoise])

  const changeNoiseType = useCallback((type: NoiseType) => {
    setNoiseType(type)
    if (isPlaying) {
      startNoise(type)
    }
  }, [isPlaying, startNoise])

  // Update volume in real-time
  useEffect(() => {
    if (gainRef.current) {
      gainRef.current.gain.value = volume / 100
    }
  }, [volume])

  // Cleanup
  useEffect(() => {
    return () => {
      if (sourceRef.current) try { sourceRef.current.stop() } catch { /* */ }
      if (audioContextRef.current) audioContextRef.current.close()
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [])

  const formatTime = (seconds: number): string => {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  const NOISE_ICONS: Record<NoiseType, string> = {
    white: '⚪', pink: '🩷', brown: '🟤', rain: '🌧️', wind: '💨', wave: '🌊',
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <Moon className="w-6 h-6 text-indigo-500" />
          {t('title')}
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('description')}</p>
      </div>

      {/* Main control */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8">
        {/* Play button */}
        <div className="flex justify-center mb-8">
          <button
            onClick={togglePlay}
            className={`w-24 h-24 rounded-full flex items-center justify-center text-white shadow-xl transition-all ${
              isPlaying
                ? 'bg-red-600 hover:bg-red-700 scale-105'
                : 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700'
            }`}
          >
            {isPlaying ? <Square className="w-10 h-10" /> : <Play className="w-10 h-10 ml-1" />}
          </button>
        </div>

        {/* Timer display */}
        {timerRemaining > 0 && (
          <div className="text-center mb-6">
            <p className="text-3xl font-bold text-indigo-600 dark:text-indigo-400 tabular-nums">
              {formatTime(timerRemaining)}
            </p>
            <p className="text-xs text-gray-400">{t('remaining')}</p>
          </div>
        )}

        {/* Noise type selector */}
        <div className="mb-6">
          <label className="text-xs text-gray-500 dark:text-gray-400 block mb-2">{t('noiseType')}</label>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
            {NOISE_TYPES.map(type => (
              <button
                key={type}
                onClick={() => changeNoiseType(type)}
                className={`py-3 px-2 rounded-xl text-center transition-colors ${
                  noiseType === type
                    ? 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 ring-2 ring-indigo-300 dark:ring-indigo-600'
                    : 'bg-gray-50 dark:bg-gray-700/50 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600'
                }`}
              >
                <span className="text-xl block">{NOISE_ICONS[type]}</span>
                <span className="text-xs font-medium mt-1 block">{t(`types.${type}`)}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Volume */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
              <Volume2 className="w-3 h-3" />
              {t('volume')}
            </label>
            <span className="text-xs text-gray-500 dark:text-gray-400">{volume}%</span>
          </div>
          <input
            type="range"
            min={0}
            max={100}
            value={volume}
            onChange={e => setVolume(Number(e.target.value))}
            className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-indigo-600"
          />
        </div>

        {/* Sleep timer */}
        <div>
          <label className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1 mb-2">
            <Timer className="w-3 h-3" />
            {t('sleepTimer')}
          </label>
          <div className="flex gap-2 flex-wrap">
            {TIMER_OPTIONS.map(min => (
              <button
                key={min}
                onClick={() => setTimerMinutes(min)}
                className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                  timerMinutes === min
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                {min === 0 ? t('timerOff') : `${min}${t('timerMin')}`}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Noise descriptions */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">{t('aboutNoise')}</h3>
        <div className="grid sm:grid-cols-2 gap-3">
          {NOISE_TYPES.map(type => (
            <div key={type} className="flex items-start gap-2 p-2">
              <span className="text-lg">{NOISE_ICONS[type]}</span>
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">{t(`types.${type}`)}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{t(`typeDesc.${type}`)}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Guide */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
        <button
          onClick={() => setShowGuide(!showGuide)}
          className="w-full flex items-center justify-between"
          aria-expanded={showGuide}
        >
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <BookOpen className="w-5 h-5" />
            {t('guide.title')}
          </h2>
          <span className="text-gray-400 text-xl" aria-hidden="true">{showGuide ? '−' : '+'}</span>
        </button>
        {showGuide && (
          <div className="mt-4 space-y-4 text-sm text-gray-700 dark:text-gray-300">
            <div>
              <h3 className="font-medium text-gray-900 dark:text-white mb-2">{t('guide.benefits.title')}</h3>
              <ul className="list-disc pl-5 space-y-1">
                {(t.raw('guide.benefits.items') as string[]).map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="font-medium text-gray-900 dark:text-white mb-2">{t('guide.tips.title')}</h3>
              <ul className="list-disc pl-5 space-y-1">
                {(t.raw('guide.tips.items') as string[]).map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
