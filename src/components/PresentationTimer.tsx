'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import {
  Play, Pause, RotateCcw, Plus, Minus,
  Maximize, Minimize, Volume2, VolumeX,
  Clock, BookOpen, Settings
} from 'lucide-react'

type TimerPhase = 'normal' | 'warning' | 'danger' | 'overtime'

interface TimerConfig {
  totalMinutes: number
  warningMinutes: number
  dangerMinutes: number
  soundEnabled: boolean
}

const DEFAULT_CONFIG: TimerConfig = {
  totalMinutes: 10,
  warningMinutes: 2,
  dangerMinutes: 1,
  soundEnabled: true,
}

const PRESETS = [3, 5, 10, 15, 20, 30]

function playBeep(audioCtx: AudioContext, frequency: number, duration: number, count: number = 1) {
  for (let i = 0; i < count; i++) {
    const oscillator = audioCtx.createOscillator()
    const gainNode = audioCtx.createGain()
    oscillator.connect(gainNode)
    gainNode.connect(audioCtx.destination)
    oscillator.type = 'sine'
    const startTime = audioCtx.currentTime + i * 0.25
    oscillator.frequency.setValueAtTime(frequency, startTime)
    gainNode.gain.setValueAtTime(0.35, startTime)
    gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + duration)
    oscillator.start(startTime)
    oscillator.stop(startTime + duration)
  }
}

export default function PresentationTimer() {
  const t = useTranslations('presentationTimer')

  const [config, setConfig] = useState<TimerConfig>(DEFAULT_CONFIG)
  const [showSettings, setShowSettings] = useState(false)

  // Timer state: elapsedSeconds counts up from 0
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const [isRunning, setIsRunning] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const audioCtxRef = useRef<AudioContext | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Track which alerts have fired to avoid repeats
  const alertsFiredRef = useRef<{ warning: boolean; danger: boolean; end: boolean }>({
    warning: false,
    danger: false,
    end: false,
  })

  const totalSeconds = config.totalMinutes * 60
  const remainingSeconds = totalSeconds - elapsedSeconds

  const getAudioContext = useCallback(() => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new AudioContext()
    }
    if (audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume()
    }
    return audioCtxRef.current
  }, [])

  // Determine current phase
  const getPhase = useCallback((remaining: number): TimerPhase => {
    if (remaining <= 0) return 'overtime'
    if (remaining <= config.dangerMinutes * 60) return 'danger'
    if (remaining <= config.warningMinutes * 60) return 'warning'
    return 'normal'
  }, [config.dangerMinutes, config.warningMinutes])

  const phase = getPhase(remainingSeconds)

  // Sound alerts
  useEffect(() => {
    if (!isRunning || !config.soundEnabled) return

    const warningThreshold = config.warningMinutes * 60
    const dangerThreshold = config.dangerMinutes * 60

    try {
      if (remainingSeconds <= warningThreshold && remainingSeconds > dangerThreshold && !alertsFiredRef.current.warning) {
        alertsFiredRef.current.warning = true
        const ctx = getAudioContext()
        playBeep(ctx, 660, 0.2, 1)
      }
      if (remainingSeconds <= dangerThreshold && remainingSeconds > 0 && !alertsFiredRef.current.danger) {
        alertsFiredRef.current.danger = true
        const ctx = getAudioContext()
        playBeep(ctx, 880, 0.2, 2)
      }
      if (remainingSeconds <= 0 && !alertsFiredRef.current.end) {
        alertsFiredRef.current.end = true
        const ctx = getAudioContext()
        playBeep(ctx, 1100, 0.3, 3)
      }
    } catch {
      // audio not available
    }
  }, [remainingSeconds, isRunning, config.soundEnabled, config.warningMinutes, config.dangerMinutes, getAudioContext])

  // Timer tick
  useEffect(() => {
    if (!isRunning) return

    intervalRef.current = setInterval(() => {
      setElapsedSeconds(prev => prev + 1)
    }, 1000)

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [isRunning])

  // Fullscreen change listener
  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
    }
    document.addEventListener('fullscreenchange', handleFsChange)
    return () => document.removeEventListener('fullscreenchange', handleFsChange)
  }, [])

  const handleStartPause = useCallback(() => {
    if (isRunning) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
      setIsRunning(false)
    } else {
      setIsRunning(true)
    }
  }, [isRunning])

  const handleReset = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
    setIsRunning(false)
    setElapsedSeconds(0)
    alertsFiredRef.current = { warning: false, danger: false, end: false }
  }, [])

  const handleAddMinute = useCallback(() => {
    setConfig(prev => ({ ...prev, totalMinutes: prev.totalMinutes + 1 }))
    // Reset end alert if adding time brings us back
    if (remainingSeconds <= 0) {
      alertsFiredRef.current.end = false
    }
  }, [remainingSeconds])

  const handleSubtractMinute = useCallback(() => {
    setConfig(prev => ({
      ...prev,
      totalMinutes: Math.max(1, prev.totalMinutes - 1),
    }))
  }, [])

  const handlePreset = useCallback((minutes: number) => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
    setIsRunning(false)
    setElapsedSeconds(0)
    alertsFiredRef.current = { warning: false, danger: false, end: false }

    // Auto-set warning/danger proportionally
    const warning = Math.max(1, Math.round(minutes * 0.2))
    const danger = Math.max(1, Math.round(minutes * 0.1))
    setConfig(prev => ({
      ...prev,
      totalMinutes: minutes,
      warningMinutes: warning,
      dangerMinutes: danger,
    }))
  }, [])

  const toggleFullscreen = useCallback(async () => {
    try {
      if (!document.fullscreenElement) {
        await containerRef.current?.requestFullscreen()
      } else {
        await document.exitFullscreen()
      }
    } catch {
      // fullscreen not supported
    }
  }, [])

  // Format time display
  const formatTime = (secondsVal: number): string => {
    const isNegative = secondsVal < 0
    const abs = Math.abs(secondsVal)
    const m = Math.floor(abs / 60)
    const s = abs % 60
    const formatted = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
    return isNegative ? `-${formatted}` : formatted
  }

  // SVG progress ring
  const radius = 90
  const circumference = 2 * Math.PI * radius
  const progress = Math.min(1, Math.max(0, elapsedSeconds / totalSeconds))
  const strokeDashoffset = circumference * (1 - progress)

  // Phase-based colors
  const phaseColors: Record<TimerPhase, { stroke: string; bg: string; text: string; bgFull: string }> = {
    normal: {
      stroke: '#22c55e',
      bg: '',
      text: 'text-green-500',
      bgFull: 'bg-gradient-to-br from-green-50 to-emerald-100 dark:from-gray-900 dark:to-gray-800',
    },
    warning: {
      stroke: '#eab308',
      bg: 'bg-yellow-50/50 dark:bg-yellow-950/20',
      text: 'text-yellow-500',
      bgFull: 'bg-gradient-to-br from-yellow-50 to-amber-100 dark:from-yellow-950 dark:to-gray-800',
    },
    danger: {
      stroke: '#ef4444',
      bg: 'bg-red-50/50 dark:bg-red-950/20',
      text: 'text-red-500',
      bgFull: 'bg-gradient-to-br from-red-50 to-rose-100 dark:from-red-950 dark:to-gray-800',
    },
    overtime: {
      stroke: '#ef4444',
      bg: 'bg-red-100/60 dark:bg-red-950/40',
      text: 'text-red-600',
      bgFull: 'bg-gradient-to-br from-red-100 to-rose-200 dark:from-red-950 dark:to-gray-900',
    },
  }

  const currentColors = phaseColors[phase]

  // Pulsing animation for danger/overtime
  const pulseClass = phase === 'danger' || phase === 'overtime' ? 'animate-pulse' : ''

  return (
    <div ref={containerRef} className={`space-y-8 ${isFullscreen ? `fixed inset-0 z-50 flex flex-col items-center justify-center p-8 ${currentColors.bgFull}` : ''}`}>
      {/* Header - hidden in fullscreen */}
      {!isFullscreen && (
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('title')}</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('description')}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setConfig(prev => ({ ...prev, soundEnabled: !prev.soundEnabled }))}
              className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300"
              aria-label={config.soundEnabled ? t('soundOff') : t('soundOn')}
              title={config.soundEnabled ? t('soundOff') : t('soundOn')}
            >
              {config.soundEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
            </button>
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300"
              aria-label={t('settings')}
              title={t('settings')}
            >
              <Settings size={18} />
            </button>
          </div>
        </div>
      )}

      {/* Settings Panel */}
      {showSettings && !isFullscreen && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <Settings size={18} />
            {t('settings')}
          </h2>
          <div className="grid sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('totalTime')} ({t('minutes')})
              </label>
              <input
                type="number"
                min={1}
                max={180}
                value={config.totalMinutes}
                onChange={e => setConfig(prev => ({ ...prev, totalMinutes: Math.max(1, Number(e.target.value) || 1) }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('warningTime')} ({t('minutes')})
              </label>
              <input
                type="number"
                min={0}
                max={config.totalMinutes}
                value={config.warningMinutes}
                onChange={e => setConfig(prev => ({ ...prev, warningMinutes: Math.max(0, Math.min(prev.totalMinutes, Number(e.target.value) || 0)) }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-yellow-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('dangerTime')} ({t('minutes')})
              </label>
              <input
                type="number"
                min={0}
                max={config.warningMinutes}
                value={config.dangerMinutes}
                onChange={e => setConfig(prev => ({ ...prev, dangerMinutes: Math.max(0, Math.min(prev.warningMinutes, Number(e.target.value) || 0)) }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500"
              />
            </div>
          </div>
        </div>
      )}

      {/* Presets */}
      {!isFullscreen && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
            <Clock size={16} />
            {t('presets')}
          </h2>
          <div className="flex flex-wrap gap-2">
            {PRESETS.map(min => (
              <button
                key={min}
                onClick={() => handlePreset(min)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  config.totalMinutes === min && elapsedSeconds === 0 && !isRunning
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300'
                }`}
              >
                {t(`preset${min}`)}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Main Timer Card */}
      <div className={`rounded-xl shadow-lg p-8 flex flex-col items-center gap-6 transition-colors duration-500 ${
        isFullscreen
          ? 'bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm max-w-lg w-full'
          : `bg-white dark:bg-gray-800 ${currentColors.bg}`
      }`}>
        {/* Phase indicator */}
        {phase === 'overtime' && (
          <div className={`text-lg font-bold ${currentColors.text} ${pulseClass}`}>
            {t('overtime')}
          </div>
        )}
        {phase !== 'overtime' && remainingSeconds <= 0 && (
          <div className={`text-lg font-bold text-red-600 ${pulseClass}`}>
            {t('timeUp')}
          </div>
        )}

        {/* SVG Circle Timer */}
        <div className="relative w-64 h-64 sm:w-72 sm:h-72 flex items-center justify-center">
          <svg className="absolute inset-0 w-full h-full" viewBox="0 0 200 200">
            {/* Background circle */}
            <circle
              cx="100"
              cy="100"
              r={radius}
              fill="none"
              stroke="currentColor"
              strokeWidth="8"
              className="text-gray-200 dark:text-gray-700"
            />
            {/* Progress circle */}
            <circle
              cx="100"
              cy="100"
              r={radius}
              fill="none"
              stroke={phase === 'overtime' ? '#ef4444' : currentColors.stroke}
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={phase === 'overtime' ? 0 : strokeDashoffset}
              transform="rotate(-90 100 100)"
              style={{ transition: 'stroke-dashoffset 0.8s ease, stroke 0.5s ease' }}
            />
          </svg>
          {/* Time display */}
          <div className="flex flex-col items-center z-10">
            <span className={`text-5xl sm:text-6xl font-mono font-bold tabular-nums ${
              phase === 'overtime' || phase === 'danger'
                ? `${currentColors.text} ${pulseClass}`
                : phase === 'warning'
                  ? currentColors.text
                  : 'text-gray-900 dark:text-white'
            }`}>
              {formatTime(remainingSeconds)}
            </span>
            <span className="text-sm text-gray-500 dark:text-gray-400 mt-2">
              {config.totalMinutes} {t('minutes')}
            </span>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-3">
          {/* -1 min */}
          <button
            onClick={handleSubtractMinute}
            className="p-3 rounded-full bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300"
            aria-label={t('subtractMinute')}
            title={t('subtractMinute')}
          >
            <Minus size={18} />
          </button>

          {/* Reset */}
          <button
            onClick={handleReset}
            className="p-3 rounded-full bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300"
            aria-label={t('reset')}
            title={t('reset')}
          >
            <RotateCcw size={18} />
          </button>

          {/* Start/Pause */}
          <button
            onClick={handleStartPause}
            className={`flex items-center gap-2 px-8 py-4 rounded-full font-semibold text-lg shadow-md transition-colors ${
              phase === 'danger' || phase === 'overtime'
                ? 'bg-gradient-to-r from-red-500 to-rose-600 text-white hover:from-red-600 hover:to-rose-700'
                : phase === 'warning'
                  ? 'bg-gradient-to-r from-yellow-500 to-amber-600 text-white hover:from-yellow-600 hover:to-amber-700'
                  : 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700'
            }`}
            aria-label={isRunning ? t('pause') : t('start')}
          >
            {isRunning ? <Pause size={24} /> : <Play size={24} />}
            {isRunning ? t('pause') : t('start')}
          </button>

          {/* Fullscreen */}
          <button
            onClick={toggleFullscreen}
            className="p-3 rounded-full bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300"
            aria-label={isFullscreen ? t('exitFullscreen') : t('fullscreen')}
            title={isFullscreen ? t('exitFullscreen') : t('fullscreen')}
          >
            {isFullscreen ? <Minimize size={18} /> : <Maximize size={18} />}
          </button>

          {/* +1 min */}
          <button
            onClick={handleAddMinute}
            className="p-3 rounded-full bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300"
            aria-label={t('addMinute')}
            title={t('addMinute')}
          >
            <Plus size={18} />
          </button>
        </div>

        {/* Fullscreen sound toggle + exit */}
        {isFullscreen && (
          <div className="flex items-center gap-3 mt-2">
            <button
              onClick={() => setConfig(prev => ({ ...prev, soundEnabled: !prev.soundEnabled }))}
              className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300"
              aria-label={config.soundEnabled ? t('soundOff') : t('soundOn')}
            >
              {config.soundEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
            </button>
          </div>
        )}
      </div>

      {/* Guide - hidden in fullscreen */}
      {!isFullscreen && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
            <BookOpen size={20} />
            {t('guide.title')}
          </h2>
          <div className="grid md:grid-cols-3 gap-6">
            {/* How to use */}
            <div>
              <h3 className="font-medium text-gray-800 dark:text-gray-200 mb-3">{t('guide.howto.title')}</h3>
              <ol className="space-y-2">
                {(t.raw('guide.howto.items') as string[]).map((item, i) => (
                  <li key={i} className="flex gap-2 text-sm text-gray-600 dark:text-gray-400">
                    <span className="flex-shrink-0 w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400 flex items-center justify-center text-xs font-bold">
                      {i + 1}
                    </span>
                    {item}
                  </li>
                ))}
              </ol>
            </div>
            {/* Features */}
            <div>
              <h3 className="font-medium text-gray-800 dark:text-gray-200 mb-3">{t('guide.features.title')}</h3>
              <ul className="space-y-2">
                {(t.raw('guide.features.items') as string[]).map((item, i) => (
                  <li key={i} className="flex gap-2 text-sm text-gray-600 dark:text-gray-400">
                    <span className="flex-shrink-0 text-blue-500 mt-0.5">•</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            {/* Tips */}
            <div>
              <h3 className="font-medium text-gray-800 dark:text-gray-200 mb-3">{t('guide.tips.title')}</h3>
              <ul className="space-y-2">
                {(t.raw('guide.tips.items') as string[]).map((item, i) => (
                  <li key={i} className="flex gap-2 text-sm text-gray-600 dark:text-gray-400">
                    <span className="flex-shrink-0 text-green-500 mt-0.5">•</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
