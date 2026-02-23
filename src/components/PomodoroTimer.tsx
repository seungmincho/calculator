'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { Play, Pause, RotateCcw, Settings, Volume2, VolumeX, Bell } from 'lucide-react'

type Phase = 'work' | 'shortBreak' | 'longBreak'

interface TimerSettings {
  workDuration: number
  shortBreakDuration: number
  longBreakDuration: number
  longBreakInterval: number
  autoStart: boolean
  soundEnabled: boolean
}

const DEFAULT_SETTINGS: TimerSettings = {
  workDuration: 25,
  shortBreakDuration: 5,
  longBreakDuration: 15,
  longBreakInterval: 4,
  autoStart: false,
  soundEnabled: true,
}

function playBeep(audioCtx: AudioContext, frequency: number, duration: number, type: OscillatorType = 'sine') {
  const oscillator = audioCtx.createOscillator()
  const gainNode = audioCtx.createGain()
  oscillator.connect(gainNode)
  gainNode.connect(audioCtx.destination)
  oscillator.type = type
  oscillator.frequency.setValueAtTime(frequency, audioCtx.currentTime)
  gainNode.gain.setValueAtTime(0.3, audioCtx.currentTime)
  gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration)
  oscillator.start(audioCtx.currentTime)
  oscillator.stop(audioCtx.currentTime + duration)
}

function playPhaseEndSound(audioCtx: AudioContext) {
  playBeep(audioCtx, 880, 0.15)
  setTimeout(() => playBeep(audioCtx, 1100, 0.15), 200)
  setTimeout(() => playBeep(audioCtx, 880, 0.3), 400)
}

export default function PomodoroTimer() {
  const t = useTranslations('pomodoroTimer')

  const [settings, setSettings] = useState<TimerSettings>(DEFAULT_SETTINGS)
  const [showSettings, setShowSettings] = useState(false)
  const [tempSettings, setTempSettings] = useState<TimerSettings>(DEFAULT_SETTINGS)

  const [phase, setPhase] = useState<Phase>('work')
  const [timeLeft, setTimeLeft] = useState(DEFAULT_SETTINGS.workDuration * 60)
  const [isRunning, setIsRunning] = useState(false)
  const [currentRound, setCurrentRound] = useState(1)
  const [completedRounds, setCompletedRounds] = useState(0)
  const [totalWorkSeconds, setTotalWorkSeconds] = useState(0)

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const audioCtxRef = useRef<AudioContext | null>(null)

  const getPhaseTotal = useCallback((p: Phase, s: TimerSettings) => {
    if (p === 'work') return s.workDuration * 60
    if (p === 'shortBreak') return s.shortBreakDuration * 60
    return s.longBreakDuration * 60
  }, [])

  const getAudioContext = useCallback(() => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new AudioContext()
    }
    return audioCtxRef.current
  }, [])

  const advancePhase = useCallback((currentPhase: Phase, rounds: number, completed: number, s: TimerSettings) => {
    let nextPhase: Phase
    let nextRound = rounds
    let nextCompleted = completed

    if (currentPhase === 'work') {
      nextCompleted = completed + 1
      if (nextCompleted % s.longBreakInterval === 0) {
        nextPhase = 'longBreak'
      } else {
        nextPhase = 'shortBreak'
      }
    } else {
      nextPhase = 'work'
      if (currentPhase !== 'longBreak') {
        nextRound = rounds + 1
      } else {
        nextRound = 1
      }
    }

    return { nextPhase, nextRound, nextCompleted }
  }, [])

  const stopTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
    setIsRunning(false)
  }, [])

  const handlePhaseComplete = useCallback((currentPhase: Phase, rounds: number, completed: number, s: TimerSettings, soundEnabled: boolean) => {
    stopTimer()
    if (soundEnabled) {
      try {
        const ctx = getAudioContext()
        playPhaseEndSound(ctx)
      } catch {
        // audio not available
      }
    }

    if (currentPhase === 'work') {
      setTotalWorkSeconds(prev => prev + s.workDuration * 60)
    }

    const { nextPhase, nextRound, nextCompleted } = advancePhase(currentPhase, rounds, completed, s)
    setCompletedRounds(nextCompleted)
    setCurrentRound(nextRound)
    setPhase(nextPhase)
    setTimeLeft(getPhaseTotal(nextPhase, s))

    if (s.autoStart) {
      setIsRunning(true)
    }
  }, [stopTimer, getAudioContext, advancePhase, getPhaseTotal])

  // Tick effect
  useEffect(() => {
    if (!isRunning) return

    intervalRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          // Phase complete - handled in next render via state update
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [isRunning])

  // Watch for timeLeft reaching 0
  useEffect(() => {
    if (timeLeft === 0 && isRunning) {
      handlePhaseComplete(phase, currentRound, completedRounds, settings, settings.soundEnabled)
    }
  }, [timeLeft, isRunning, phase, currentRound, completedRounds, settings, handlePhaseComplete])

  const handleStartPause = useCallback(() => {
    if (isRunning) {
      stopTimer()
    } else {
      setIsRunning(true)
    }
  }, [isRunning, stopTimer])

  const handleReset = useCallback(() => {
    stopTimer()
    setPhase('work')
    setTimeLeft(settings.workDuration * 60)
    setCurrentRound(1)
    setCompletedRounds(0)
    setTotalWorkSeconds(0)
  }, [stopTimer, settings.workDuration])

  const handleResetPhase = useCallback(() => {
    stopTimer()
    setTimeLeft(getPhaseTotal(phase, settings))
  }, [stopTimer, phase, settings, getPhaseTotal])

  const handleSaveSettings = useCallback(() => {
    setSettings(tempSettings)
    stopTimer()
    setPhase('work')
    setTimeLeft(tempSettings.workDuration * 60)
    setCurrentRound(1)
    setCompletedRounds(0)
    setTotalWorkSeconds(0)
    setShowSettings(false)
  }, [tempSettings, stopTimer])

  const openSettings = useCallback(() => {
    setTempSettings(settings)
    setShowSettings(true)
  }, [settings])

  const phaseTotal = getPhaseTotal(phase, settings)
  const progress = phaseTotal > 0 ? (phaseTotal - timeLeft) / phaseTotal : 0

  const minutes = Math.floor(timeLeft / 60)
  const seconds = timeLeft % 60
  const timeStr = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`

  // SVG circle
  const radius = 90
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference * (1 - progress)

  const phaseColors: Record<Phase, string> = {
    work: 'text-red-500',
    shortBreak: 'text-green-500',
    longBreak: 'text-blue-500',
  }

  const phaseStrokeColors: Record<Phase, string> = {
    work: '#ef4444',
    shortBreak: '#22c55e',
    longBreak: '#3b82f6',
  }

  const phaseLabels: Record<Phase, string> = {
    work: t('phaseWork'),
    shortBreak: t('phaseShortBreak'),
    longBreak: t('phaseLongBreak'),
  }

  const totalWorkMinutes = Math.floor(totalWorkSeconds / 60)

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('title')}</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('description')}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              const newSoundEnabled = !settings.soundEnabled
              setSettings(s => ({ ...s, soundEnabled: newSoundEnabled }))
            }}
            className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300"
            aria-label={settings.soundEnabled ? t('soundOff') : t('soundOn')}
            title={settings.soundEnabled ? t('soundOff') : t('soundOn')}
          >
            {settings.soundEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
          </button>
          <button
            onClick={openSettings}
            className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300"
            aria-label={t('settings')}
            title={t('settings')}
          >
            <Settings size={18} />
          </button>
        </div>
      </div>

      {/* Main Timer Card */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8 flex flex-col items-center gap-6">
        {/* Phase Label */}
        <div className={`text-lg font-semibold ${phaseColors[phase]}`}>
          {phaseLabels[phase]}
        </div>

        {/* SVG Circle Timer */}
        <div className="relative w-56 h-56 flex items-center justify-center">
          <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 200 200">
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
              stroke={phaseStrokeColors[phase]}
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              style={{ transition: 'stroke-dashoffset 0.8s ease' }}
            />
          </svg>
          {/* Time display */}
          <div className="flex flex-col items-center">
            <span className="text-5xl font-mono font-bold text-gray-900 dark:text-white tabular-nums">
              {timeStr}
            </span>
            <span className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {t('roundLabel', { current: currentRound, total: settings.longBreakInterval })}
            </span>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-4">
          <button
            onClick={handleResetPhase}
            className="p-3 rounded-full bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300"
            aria-label={t('resetPhase')}
            title={t('resetPhase')}
          >
            <RotateCcw size={20} />
          </button>

          <button
            onClick={handleStartPause}
            className="flex items-center gap-2 px-8 py-4 rounded-full bg-gradient-to-r from-red-500 to-rose-600 text-white font-semibold text-lg hover:from-red-600 hover:to-rose-700 shadow-md"
            aria-label={isRunning ? t('pause') : t('start')}
          >
            {isRunning ? <Pause size={24} /> : <Play size={24} />}
            {isRunning ? t('pause') : t('start')}
          </button>

          <button
            onClick={handleReset}
            className="p-3 rounded-full bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300"
            aria-label={t('resetAll')}
            title={t('resetAll')}
          >
            <Bell size={20} />
          </button>
        </div>

        {/* Auto-start toggle */}
        <label className="flex items-center gap-2 cursor-pointer select-none text-sm text-gray-600 dark:text-gray-400">
          <input
            type="checkbox"
            checked={settings.autoStart}
            onChange={e => setSettings(s => ({ ...s, autoStart: e.target.checked }))}
            className="accent-red-500 w-4 h-4"
          />
          {t('autoStart')}
        </label>
      </div>

      {/* Session Statistics */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{t('statsTitle')}</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <div className="bg-red-50 dark:bg-red-950 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-red-600 dark:text-red-400">{totalWorkMinutes}</div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">{t('statsTotalWork')}</div>
          </div>
          <div className="bg-green-50 dark:bg-green-950 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">{completedRounds}</div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">{t('statsCompletedRounds')}</div>
          </div>
          <div className="bg-blue-50 dark:bg-blue-950 rounded-lg p-4 text-center col-span-2 sm:col-span-1">
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {Math.floor(completedRounds / settings.longBreakInterval)}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">{t('statsLongBreaks')}</div>
          </div>
        </div>
      </div>

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-md p-6 space-y-5">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">{t('settingsTitle')}</h2>

            {/* Work Duration */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('settingsWork')} ({t('settingsMinutes')})
              </label>
              <input
                type="range"
                min={15}
                max={60}
                value={tempSettings.workDuration}
                onChange={e => setTempSettings(s => ({ ...s, workDuration: Number(e.target.value) }))}
                className="w-full accent-red-500"
              />
              <div className="text-right text-sm text-gray-600 dark:text-gray-400">{tempSettings.workDuration}{t('settingsMinutes')}</div>
            </div>

            {/* Short Break */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('settingsShortBreak')} ({t('settingsMinutes')})
              </label>
              <input
                type="range"
                min={3}
                max={10}
                value={tempSettings.shortBreakDuration}
                onChange={e => setTempSettings(s => ({ ...s, shortBreakDuration: Number(e.target.value) }))}
                className="w-full accent-green-500"
              />
              <div className="text-right text-sm text-gray-600 dark:text-gray-400">{tempSettings.shortBreakDuration}{t('settingsMinutes')}</div>
            </div>

            {/* Long Break */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('settingsLongBreak')} ({t('settingsMinutes')})
              </label>
              <input
                type="range"
                min={10}
                max={30}
                value={tempSettings.longBreakDuration}
                onChange={e => setTempSettings(s => ({ ...s, longBreakDuration: Number(e.target.value) }))}
                className="w-full accent-blue-500"
              />
              <div className="text-right text-sm text-gray-600 dark:text-gray-400">{tempSettings.longBreakDuration}{t('settingsMinutes')}</div>
            </div>

            {/* Long Break Interval */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('settingsLongBreakInterval')}
              </label>
              <select
                value={tempSettings.longBreakInterval}
                onChange={e => setTempSettings(s => ({ ...s, longBreakInterval: Number(e.target.value) }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500"
              >
                {[2, 3, 4, 5, 6].map(n => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setShowSettings(false)}
                className="flex-1 px-4 py-2 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300"
              >
                {t('cancel')}
              </button>
              <button
                onClick={handleSaveSettings}
                className="flex-1 px-4 py-2 rounded-lg bg-gradient-to-r from-red-500 to-rose-600 text-white font-medium hover:from-red-600 hover:to-rose-700"
              >
                {t('save')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Guide */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">{t('guideTitle')}</h2>
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <h3 className="font-medium text-gray-800 dark:text-gray-200 mb-2">{t('guideHowTitle')}</h3>
            <ol className="space-y-2">
              {(t.raw('guideHowItems') as string[]).map((item, i) => (
                <li key={i} className="flex gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <span className="flex-shrink-0 w-5 h-5 rounded-full bg-red-100 dark:bg-red-900 text-red-600 dark:text-red-400 flex items-center justify-center text-xs font-bold">{i + 1}</span>
                  {item}
                </li>
              ))}
            </ol>
          </div>
          <div>
            <h3 className="font-medium text-gray-800 dark:text-gray-200 mb-2">{t('guideTipsTitle')}</h3>
            <ul className="space-y-2">
              {(t.raw('guideTipsItems') as string[]).map((item, i) => (
                <li key={i} className="flex gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <span className="flex-shrink-0 text-red-500 mt-0.5">•</span>
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
