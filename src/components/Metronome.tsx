'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { Play, Square, Minus, Plus, BookOpen, Smartphone } from 'lucide-react'

// ── Common tempo markings ──
const TEMPO_PRESETS = [
  { key: 'grave', bpm: 40 },
  { key: 'largo', bpm: 50 },
  { key: 'adagio', bpm: 66 },
  { key: 'andante', bpm: 76 },
  { key: 'moderato', bpm: 108 },
  { key: 'allegro', bpm: 132 },
  { key: 'vivace', bpm: 160 },
  { key: 'presto', bpm: 184 },
]

const TIME_SIGNATURES = [
  { beats: 2, label: '2/4' },
  { beats: 3, label: '3/4' },
  { beats: 4, label: '4/4' },
  { beats: 6, label: '6/8' },
]

export default function Metronome() {
  const t = useTranslations('metronome')
  const [bpm, setBpm] = useState(120)
  const [isPlaying, setIsPlaying] = useState(false)
  const [beatsPerMeasure, setBeatsPerMeasure] = useState(4)
  const [currentBeat, setCurrentBeat] = useState(0)
  const [showGuide, setShowGuide] = useState(false)
  const [vibrationEnabled, setVibrationEnabled] = useState(false)
  const [accentEnabled, setAccentEnabled] = useState(true)

  const audioContextRef = useRef<AudioContext | null>(null)
  const timerIdRef = useRef<number>(0)
  const nextBeatTimeRef = useRef(0)
  const beatCountRef = useRef(0)
  const isPlayingRef = useRef(false)

  // Tap tempo
  const tapTimesRef = useRef<number[]>([])
  const [tapBpm, setTapBpm] = useState<number | null>(null)

  const playClick = useCallback((time: number, isAccent: boolean) => {
    const ctx = audioContextRef.current
    if (!ctx) return

    const osc = ctx.createOscillator()
    const gain = ctx.createGain()

    osc.connect(gain)
    gain.connect(ctx.destination)

    if (isAccent && accentEnabled) {
      osc.frequency.value = 1000
      gain.gain.value = 0.8
    } else {
      osc.frequency.value = 800
      gain.gain.value = 0.5
    }

    osc.start(time)
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.05)
    osc.stop(time + 0.05)
  }, [accentEnabled])

  const scheduleBeats = useCallback(() => {
    const ctx = audioContextRef.current
    if (!ctx || !isPlayingRef.current) return

    const scheduleAhead = 0.1 // schedule 100ms ahead
    const interval = 60.0 / bpm

    while (nextBeatTimeRef.current < ctx.currentTime + scheduleAhead) {
      const isAccent = beatCountRef.current % beatsPerMeasure === 0
      playClick(nextBeatTimeRef.current, isAccent)

      // Vibrate on mobile
      if (vibrationEnabled && navigator.vibrate) {
        const delay = Math.max(0, (nextBeatTimeRef.current - ctx.currentTime) * 1000)
        setTimeout(() => {
          if (isPlayingRef.current) navigator.vibrate(isAccent ? 50 : 25)
        }, delay)
      }

      // Update visual beat indicator
      const beatNum = beatCountRef.current % beatsPerMeasure
      const delay = Math.max(0, (nextBeatTimeRef.current - ctx.currentTime) * 1000)
      setTimeout(() => {
        if (isPlayingRef.current) setCurrentBeat(beatNum)
      }, delay)

      nextBeatTimeRef.current += interval
      beatCountRef.current++
    }

    timerIdRef.current = window.setTimeout(scheduleBeats, 25)
  }, [bpm, beatsPerMeasure, playClick, vibrationEnabled])

  const start = useCallback(() => {
    if (isPlayingRef.current) return

    const ctx = new AudioContext()
    audioContextRef.current = ctx
    isPlayingRef.current = true
    setIsPlaying(true)
    beatCountRef.current = 0
    nextBeatTimeRef.current = ctx.currentTime
    scheduleBeats()
  }, [scheduleBeats])

  const stop = useCallback(() => {
    isPlayingRef.current = false
    setIsPlaying(false)
    setCurrentBeat(0)
    if (timerIdRef.current) clearTimeout(timerIdRef.current)
    if (audioContextRef.current) {
      audioContextRef.current.close()
      audioContextRef.current = null
    }
  }, [])

  const togglePlay = useCallback(() => {
    if (isPlaying) stop()
    else start()
  }, [isPlaying, start, stop])

  // When BPM changes while playing, restart the scheduler
  useEffect(() => {
    if (isPlaying) {
      stop()
      // Short delay to let AudioContext close
      setTimeout(() => start(), 50)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bpm, beatsPerMeasure])

  // Cleanup
  useEffect(() => {
    return () => {
      isPlayingRef.current = false
      if (timerIdRef.current) clearTimeout(timerIdRef.current)
      if (audioContextRef.current) audioContextRef.current.close()
    }
  }, [])

  const adjustBpm = useCallback((delta: number) => {
    setBpm(prev => Math.max(20, Math.min(300, prev + delta)))
  }, [])

  const handleTapTempo = useCallback(() => {
    const now = performance.now()
    const taps = tapTimesRef.current

    // Reset if last tap was more than 2 seconds ago
    if (taps.length > 0 && now - taps[taps.length - 1] > 2000) {
      tapTimesRef.current = []
    }

    taps.push(now)

    // Keep last 8 taps
    if (taps.length > 8) taps.shift()

    if (taps.length >= 2) {
      const intervals: number[] = []
      for (let i = 1; i < taps.length; i++) {
        intervals.push(taps[i] - taps[i - 1])
      }
      const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length
      const calculatedBpm = Math.round(60000 / avgInterval)
      const clampedBpm = Math.max(20, Math.min(300, calculatedBpm))
      setBpm(clampedBpm)
      setTapBpm(clampedBpm)
    }
  }, [])

  const getTempoName = (bpm: number): string => {
    if (bpm <= 45) return t('tempos.grave')
    if (bpm <= 60) return t('tempos.largo')
    if (bpm <= 72) return t('tempos.adagio')
    if (bpm <= 92) return t('tempos.andante')
    if (bpm <= 120) return t('tempos.moderato')
    if (bpm <= 144) return t('tempos.allegro')
    if (bpm <= 172) return t('tempos.vivace')
    return t('tempos.presto')
  }

  const hasVibration = typeof navigator !== 'undefined' && 'vibrate' in navigator

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('title')}</h1>
          {hasVibration && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300 rounded-full">
              <Smartphone className="w-3 h-3" />
              {t('vibrationSupport')}
            </span>
          )}
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('description')}</p>
      </div>

      {/* Main display */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8">
        {/* BPM display */}
        <div className="text-center mb-6">
          <p className="text-7xl sm:text-8xl font-bold text-gray-900 dark:text-white tabular-nums">
            {bpm}
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            BPM · {getTempoName(bpm)}
          </p>
        </div>

        {/* Beat indicators */}
        <div className="flex justify-center gap-3 mb-8">
          {Array.from({ length: beatsPerMeasure }).map((_, i) => (
            <div
              key={i}
              className={`w-5 h-5 rounded-full transition-all duration-75 ${
                isPlaying && currentBeat === i
                  ? i === 0 && accentEnabled
                    ? 'bg-red-500 scale-125 shadow-lg shadow-red-500/50'
                    : 'bg-blue-500 scale-125 shadow-lg shadow-blue-500/50'
                  : 'bg-gray-200 dark:bg-gray-600'
              }`}
            />
          ))}
        </div>

        {/* BPM controls */}
        <div className="flex items-center justify-center gap-4 mb-6">
          <button
            onClick={() => adjustBpm(-5)}
            className="w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 flex items-center justify-center text-gray-700 dark:text-gray-300 transition-colors"
            aria-label="-5 BPM"
          >
            <Minus className="w-5 h-5" />
          </button>
          <button
            onClick={() => adjustBpm(-1)}
            className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 flex items-center justify-center text-gray-700 dark:text-gray-300 text-sm transition-colors"
            aria-label="-1 BPM"
          >
            -1
          </button>

          {/* Play/Stop */}
          <button
            onClick={togglePlay}
            className={`w-16 h-16 rounded-full flex items-center justify-center text-white shadow-lg transition-colors ${
              isPlaying
                ? 'bg-red-600 hover:bg-red-700'
                : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700'
            }`}
          >
            {isPlaying ? <Square className="w-6 h-6" /> : <Play className="w-6 h-6 ml-1" />}
          </button>

          <button
            onClick={() => adjustBpm(1)}
            className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 flex items-center justify-center text-gray-700 dark:text-gray-300 text-sm transition-colors"
            aria-label="+1 BPM"
          >
            +1
          </button>
          <button
            onClick={() => adjustBpm(5)}
            className="w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 flex items-center justify-center text-gray-700 dark:text-gray-300 transition-colors"
            aria-label="+5 BPM"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>

        {/* BPM slider */}
        <div className="px-4 mb-6">
          <input
            type="range"
            min={20}
            max={300}
            value={bpm}
            onChange={e => setBpm(Number(e.target.value))}
            className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-600"
          />
          <div className="flex justify-between text-xs text-gray-400 mt-1">
            <span>20</span>
            <span>100</span>
            <span>200</span>
            <span>300</span>
          </div>
        </div>

        {/* Tap Tempo */}
        <div className="flex justify-center mb-6">
          <button
            onClick={handleTapTempo}
            className="px-6 py-3 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-xl font-medium transition-colors"
          >
            {t('tapTempo')} {tapBpm !== null && `(${tapBpm})`}
          </button>
        </div>
      </div>

      {/* Settings */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 space-y-4">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{t('settings')}</h3>

        {/* Time signature */}
        <div>
          <label className="text-xs text-gray-500 dark:text-gray-400 block mb-2">{t('timeSignature')}</label>
          <div className="flex gap-2">
            {TIME_SIGNATURES.map(ts => (
              <button
                key={ts.label}
                onClick={() => setBeatsPerMeasure(ts.beats)}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                  beatsPerMeasure === ts.beats
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                {ts.label}
              </button>
            ))}
          </div>
        </div>

        {/* Accent toggle */}
        <div className="flex items-center justify-between">
          <label className="text-sm text-gray-700 dark:text-gray-300">{t('accentFirst')}</label>
          <button
            onClick={() => setAccentEnabled(!accentEnabled)}
            className={`w-11 h-6 rounded-full transition-colors relative ${
              accentEnabled ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'
            }`}
            role="switch"
            aria-checked={accentEnabled}
          >
            <span className={`block w-4 h-4 rounded-full bg-white transition-transform absolute top-1 ${
              accentEnabled ? 'translate-x-6' : 'translate-x-1'
            }`} />
          </button>
        </div>

        {/* Vibration toggle (mobile only) */}
        {hasVibration && (
          <div className="flex items-center justify-between">
            <label className="text-sm text-gray-700 dark:text-gray-300">{t('vibration')}</label>
            <button
              onClick={() => setVibrationEnabled(!vibrationEnabled)}
              className={`w-11 h-6 rounded-full transition-colors relative ${
                vibrationEnabled ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'
              }`}
              role="switch"
              aria-checked={vibrationEnabled}
            >
              <span className={`block w-4 h-4 rounded-full bg-white transition-transform absolute top-1 ${
                vibrationEnabled ? 'translate-x-6' : 'translate-x-1'
              }`} />
            </button>
          </div>
        )}
      </div>

      {/* Tempo presets */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">{t('presets')}</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {TEMPO_PRESETS.map(preset => (
            <button
              key={preset.key}
              onClick={() => setBpm(preset.bpm)}
              className={`py-2 px-3 rounded-lg text-sm transition-colors ${
                bpm === preset.bpm
                  ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 ring-1 ring-blue-300 dark:ring-blue-600'
                  : 'bg-gray-50 dark:bg-gray-700/50 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600'
              }`}
            >
              <span className="font-medium">{t(`tempos.${preset.key}`)}</span>
              <span className="text-xs text-gray-400 ml-1">({preset.bpm})</span>
            </button>
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
              <h3 className="font-medium text-gray-900 dark:text-white mb-2">{t('guide.how.title')}</h3>
              <ul className="list-disc pl-5 space-y-1">
                {(t.raw('guide.how.items') as string[]).map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="font-medium text-gray-900 dark:text-white mb-2">{t('guide.tempos.title')}</h3>
              <ul className="list-disc pl-5 space-y-1">
                {(t.raw('guide.tempos.items') as string[]).map((item, i) => (
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
