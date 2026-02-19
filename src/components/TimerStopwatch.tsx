'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { Timer, Clock, Coffee, Play, Pause, Square, RotateCcw, SkipForward, Flag } from 'lucide-react'

type Mode = 'stopwatch' | 'timer' | 'pomodoro'
type PomodoroPhase = 'work' | 'shortBreak' | 'longBreak'

interface Lap {
  lap: number
  lapTime: number
  totalTime: number
}

export default function TimerStopwatch() {
  const t = useTranslations('timer')

  // Mode state
  const [mode, setMode] = useState<Mode>('stopwatch')

  // Stopwatch state
  const [stopwatchTime, setStopwatchTime] = useState(0)
  const [stopwatchRunning, setStopwatchRunning] = useState(false)
  const [laps, setLaps] = useState<Lap[]>([])
  const stopwatchIntervalRef = useRef<NodeJS.Timeout | null>(null)

  // Timer state
  const [timerHours, setTimerHours] = useState(0)
  const [timerMinutes, setTimerMinutes] = useState(0)
  const [timerSeconds, setTimerSeconds] = useState(0)
  const [timerRemaining, setTimerRemaining] = useState(0)
  const [timerRunning, setTimerRunning] = useState(false)
  const [timerFinished, setTimerFinished] = useState(false)
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null)

  // Pomodoro state
  const [pomodoroWorkDuration, setPomodoroWorkDuration] = useState(25)
  const [pomodoroShortBreak, setPomodoroShortBreak] = useState(5)
  const [pomodoroLongBreak, setPomodoroLongBreak] = useState(15)
  const [pomodoroSessionsBeforeLongBreak, setPomodoroSessionsBeforeLongBreak] = useState(4)
  const [pomodoroPhase, setPomodoroPhase] = useState<PomodoroPhase>('work')
  const [pomodoroRemaining, setPomodoroRemaining] = useState(25 * 60)
  const [pomodoroRunning, setPomodoroRunning] = useState(false)
  const [pomodoroCompletedSessions, setPomodoroCompletedSessions] = useState(0)
  const pomodoroIntervalRef = useRef<NodeJS.Timeout | null>(null)

  // Format time helper
  const formatTime = (ms: number, showCentiseconds = false): string => {
    const totalSeconds = Math.floor(ms / 1000)
    const hours = Math.floor(totalSeconds / 3600)
    const minutes = Math.floor((totalSeconds % 3600) / 60)
    const seconds = totalSeconds % 60
    const centiseconds = Math.floor((ms % 1000) / 10)

    if (showCentiseconds) {
      return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${String(centiseconds).padStart(2, '0')}`
    }
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
  }

  const formatCountdown = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
  }

  // Beep sound
  const playBeep = useCallback(() => {
    try {
      const ctx = new AudioContext()
      const osc = ctx.createOscillator()
      osc.connect(ctx.destination)
      osc.frequency.value = 800
      osc.start()
      setTimeout(() => osc.stop(), 200)
    } catch {
      // Ignore audio errors
    }
  }, [])

  // Stopwatch functions
  const startStopwatch = () => {
    if (!stopwatchRunning) {
      setStopwatchRunning(true)
      const startTime = Date.now() - stopwatchTime
      stopwatchIntervalRef.current = setInterval(() => {
        setStopwatchTime(Date.now() - startTime)
      }, 10)
    } else {
      setStopwatchRunning(false)
      if (stopwatchIntervalRef.current) {
        clearInterval(stopwatchIntervalRef.current)
      }
    }
  }

  const resetStopwatch = () => {
    setStopwatchRunning(false)
    setStopwatchTime(0)
    setLaps([])
    if (stopwatchIntervalRef.current) {
      clearInterval(stopwatchIntervalRef.current)
    }
  }

  const recordLap = () => {
    const lapNumber = laps.length + 1
    const lapTime = laps.length > 0 ? stopwatchTime - laps[laps.length - 1].totalTime : stopwatchTime
    setLaps([...laps, { lap: lapNumber, lapTime, totalTime: stopwatchTime }])
  }

  // Timer functions
  const setTimerPreset = (minutes: number) => {
    setTimerHours(0)
    setTimerMinutes(minutes)
    setTimerSeconds(0)
    setTimerRemaining(minutes * 60)
    setTimerRunning(false)
    setTimerFinished(false)
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current)
    }
  }

  const startTimer = () => {
    if (timerRemaining === 0) {
      const totalSeconds = timerHours * 3600 + timerMinutes * 60 + timerSeconds
      if (totalSeconds === 0) return
      setTimerRemaining(totalSeconds)
    }
    setTimerRunning(true)
    setTimerFinished(false)
    timerIntervalRef.current = setInterval(() => {
      setTimerRemaining((prev) => {
        if (prev <= 1) {
          if (timerIntervalRef.current) clearInterval(timerIntervalRef.current)
          setTimerRunning(false)
          setTimerFinished(true)
          playBeep()
          return 0
        }
        return prev - 1
      })
    }, 1000)
  }

  const pauseTimer = () => {
    setTimerRunning(false)
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current)
    }
  }

  const resetTimer = () => {
    setTimerRunning(false)
    setTimerRemaining(0)
    setTimerFinished(false)
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current)
    }
  }

  // Pomodoro functions
  const getPomodoroPhaseColor = (phase: PomodoroPhase) => {
    switch (phase) {
      case 'work':
        return 'text-red-600 dark:text-red-400'
      case 'shortBreak':
        return 'text-green-600 dark:text-green-400'
      case 'longBreak':
        return 'text-blue-600 dark:text-blue-400'
    }
  }

  const getPomodoroProgressColor = (phase: PomodoroPhase) => {
    switch (phase) {
      case 'work':
        return 'stroke-red-600 dark:stroke-red-400'
      case 'shortBreak':
        return 'stroke-green-600 dark:stroke-green-400'
      case 'longBreak':
        return 'stroke-blue-600 dark:stroke-blue-400'
    }
  }

  const getPomodoroPhaseTotal = () => {
    switch (pomodoroPhase) {
      case 'work':
        return pomodoroWorkDuration * 60
      case 'shortBreak':
        return pomodoroShortBreak * 60
      case 'longBreak':
        return pomodoroLongBreak * 60
    }
  }

  const startPomodoro = () => {
    setPomodoroRunning(true)
    pomodoroIntervalRef.current = setInterval(() => {
      setPomodoroRemaining((prev) => {
        if (prev <= 1) {
          playBeep()
          // Auto-transition to next phase
          if (pomodoroPhase === 'work') {
            const nextSessionCount = pomodoroCompletedSessions + 1
            setPomodoroCompletedSessions(nextSessionCount)
            if (nextSessionCount % pomodoroSessionsBeforeLongBreak === 0) {
              setPomodoroPhase('longBreak')
              return pomodoroLongBreak * 60
            } else {
              setPomodoroPhase('shortBreak')
              return pomodoroShortBreak * 60
            }
          } else {
            setPomodoroPhase('work')
            return pomodoroWorkDuration * 60
          }
        }
        return prev - 1
      })
    }, 1000)
  }

  const pausePomodoro = () => {
    setPomodoroRunning(false)
    if (pomodoroIntervalRef.current) {
      clearInterval(pomodoroIntervalRef.current)
    }
  }

  const resetPomodoro = () => {
    setPomodoroRunning(false)
    setPomodoroPhase('work')
    setPomodoroRemaining(pomodoroWorkDuration * 60)
    setPomodoroCompletedSessions(0)
    if (pomodoroIntervalRef.current) {
      clearInterval(pomodoroIntervalRef.current)
    }
  }

  const skipPomodoroPhase = () => {
    if (pomodoroPhase === 'work') {
      const nextSessionCount = pomodoroCompletedSessions + 1
      setPomodoroCompletedSessions(nextSessionCount)
      if (nextSessionCount % pomodoroSessionsBeforeLongBreak === 0) {
        setPomodoroPhase('longBreak')
        setPomodoroRemaining(pomodoroLongBreak * 60)
      } else {
        setPomodoroPhase('shortBreak')
        setPomodoroRemaining(pomodoroShortBreak * 60)
      }
    } else {
      setPomodoroPhase('work')
      setPomodoroRemaining(pomodoroWorkDuration * 60)
    }
  }

  // Cleanup intervals on unmount or mode change
  useEffect(() => {
    return () => {
      if (stopwatchIntervalRef.current) clearInterval(stopwatchIntervalRef.current)
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current)
      if (pomodoroIntervalRef.current) clearInterval(pomodoroIntervalRef.current)
    }
  }, [])

  // Cleanup when switching modes
  useEffect(() => {
    if (stopwatchIntervalRef.current) clearInterval(stopwatchIntervalRef.current)
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current)
    if (pomodoroIntervalRef.current) clearInterval(pomodoroIntervalRef.current)
    setStopwatchRunning(false)
    setTimerRunning(false)
    setPomodoroRunning(false)
  }, [mode])

  const progress = pomodoroRemaining / getPomodoroPhaseTotal()
  const circumference = 2 * Math.PI * 120
  const strokeDashoffset = circumference * (1 - progress)

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('title')}</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('description')}</p>
      </div>

      {/* Mode Tabs */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setMode('stopwatch')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
            mode === 'stopwatch'
              ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white'
              : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
          }`}
        >
          <Clock className="w-5 h-5" />
          {t('modes.stopwatch')}
        </button>
        <button
          onClick={() => setMode('timer')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
            mode === 'timer'
              ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white'
              : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
          }`}
        >
          <Timer className="w-5 h-5" />
          {t('modes.timer')}
        </button>
        <button
          onClick={() => setMode('pomodoro')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
            mode === 'pomodoro'
              ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white'
              : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
          }`}
        >
          <Coffee className="w-5 h-5" />
          {t('modes.pomodoro')}
        </button>
      </div>

      {/* Stopwatch Mode */}
      {mode === 'stopwatch' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8">
            {/* Time Display */}
            <div className="text-center mb-8">
              <div className="text-6xl font-mono font-bold text-gray-900 dark:text-white">
                {formatTime(stopwatchTime, true)}
              </div>
            </div>

            {/* Controls */}
            <div className="flex justify-center gap-4 flex-wrap">
              <button
                onClick={startStopwatch}
                className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg px-6 py-3 font-medium hover:from-blue-700 hover:to-indigo-700 transition-colors"
              >
                {stopwatchRunning ? (
                  <>
                    <Pause className="w-5 h-5" />
                    {t('stopwatch.stop')}
                  </>
                ) : (
                  <>
                    <Play className="w-5 h-5" />
                    {t('stopwatch.start')}
                  </>
                )}
              </button>
              <button
                onClick={resetStopwatch}
                className="flex items-center gap-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg px-6 py-3 font-medium transition-colors"
              >
                <RotateCcw className="w-5 h-5" />
                {t('stopwatch.reset')}
              </button>
              {stopwatchRunning && (
                <button
                  onClick={recordLap}
                  className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white rounded-lg px-6 py-3 font-medium transition-colors"
                >
                  <Flag className="w-5 h-5" />
                  {t('stopwatch.lap')}
                </button>
              )}
            </div>
          </div>

          {/* Laps Table */}
          {laps.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                {t('stopwatch.laps')}
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-700">
                      <th className="text-left py-2 px-4 text-gray-700 dark:text-gray-300">
                        {t('stopwatch.lapNumber')}
                      </th>
                      <th className="text-left py-2 px-4 text-gray-700 dark:text-gray-300">
                        {t('stopwatch.lapTime')}
                      </th>
                      <th className="text-left py-2 px-4 text-gray-700 dark:text-gray-300">
                        {t('stopwatch.totalTime')}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {laps.map((lap) => (
                      <tr key={lap.lap} className="border-b border-gray-100 dark:border-gray-700">
                        <td className="py-2 px-4 text-gray-900 dark:text-white font-medium">
                          {lap.lap}
                        </td>
                        <td className="py-2 px-4 text-gray-900 dark:text-white font-mono">
                          {formatTime(lap.lapTime, true)}
                        </td>
                        <td className="py-2 px-4 text-gray-900 dark:text-white font-mono">
                          {formatTime(lap.totalTime, true)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Timer Mode */}
      {mode === 'timer' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8">
            {/* Input Section */}
            {!timerRunning && timerRemaining === 0 && (
              <div className="mb-6">
                <div className="flex justify-center gap-4 mb-6 flex-wrap">
                  <div className="flex flex-col items-center">
                    <label className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                      {t('countdown.hours')}
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="23"
                      value={timerHours}
                      onChange={(e) => setTimerHours(Math.max(0, Math.min(23, parseInt(e.target.value) || 0)))}
                      className="w-20 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-center focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="flex flex-col items-center">
                    <label className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                      {t('countdown.minutes')}
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="59"
                      value={timerMinutes}
                      onChange={(e) => setTimerMinutes(Math.max(0, Math.min(59, parseInt(e.target.value) || 0)))}
                      className="w-20 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-center focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="flex flex-col items-center">
                    <label className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                      {t('countdown.seconds')}
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="59"
                      value={timerSeconds}
                      onChange={(e) => setTimerSeconds(Math.max(0, Math.min(59, parseInt(e.target.value) || 0)))}
                      className="w-20 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-center focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                {/* Preset Buttons */}
                <div className="flex justify-center gap-2 flex-wrap">
                  {[1, 3, 5, 10, 15, 30].map((minutes) => (
                    <button
                      key={minutes}
                      onClick={() => setTimerPreset(minutes)}
                      className="px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg transition-colors"
                    >
                      {minutes}분
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Countdown Display */}
            <div className="text-center mb-8">
              <div className="text-6xl font-mono font-bold text-gray-900 dark:text-white">
                {formatCountdown(timerRemaining)}
              </div>
              {timerFinished && (
                <div className="mt-4 text-2xl font-bold text-red-600 dark:text-red-400">
                  {t('countdown.finished')}
                </div>
              )}
            </div>

            {/* Controls */}
            <div className="flex justify-center gap-4 flex-wrap">
              {!timerRunning && timerRemaining === 0 ? (
                <button
                  onClick={startTimer}
                  className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg px-6 py-3 font-medium hover:from-blue-700 hover:to-indigo-700 transition-colors"
                >
                  <Play className="w-5 h-5" />
                  {t('countdown.start')}
                </button>
              ) : timerRunning ? (
                <button
                  onClick={pauseTimer}
                  className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg px-6 py-3 font-medium hover:from-blue-700 hover:to-indigo-700 transition-colors"
                >
                  <Pause className="w-5 h-5" />
                  {t('countdown.pause')}
                </button>
              ) : (
                <button
                  onClick={startTimer}
                  className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg px-6 py-3 font-medium hover:from-blue-700 hover:to-indigo-700 transition-colors"
                >
                  <Play className="w-5 h-5" />
                  {t('countdown.resume')}
                </button>
              )}
              <button
                onClick={resetTimer}
                className="flex items-center gap-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg px-6 py-3 font-medium transition-colors"
              >
                <Square className="w-5 h-5" />
                {t('countdown.reset')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Pomodoro Mode */}
      {mode === 'pomodoro' && (
        <div className="space-y-6">
          {/* Settings */}
          {!pomodoroRunning && pomodoroPhase === 'work' && pomodoroRemaining === pomodoroWorkDuration * 60 && (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                설정
              </h2>
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm text-gray-700 dark:text-gray-300 mb-2">
                    {t('pomodoro.workDuration')}
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="60"
                    value={pomodoroWorkDuration}
                    onChange={(e) => {
                      const val = Math.max(1, Math.min(60, parseInt(e.target.value) || 25))
                      setPomodoroWorkDuration(val)
                      setPomodoroRemaining(val * 60)
                    }}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-700 dark:text-gray-300 mb-2">
                    {t('pomodoro.shortBreakDuration')}
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="30"
                    value={pomodoroShortBreak}
                    onChange={(e) => setPomodoroShortBreak(Math.max(1, Math.min(30, parseInt(e.target.value) || 5)))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-700 dark:text-gray-300 mb-2">
                    {t('pomodoro.longBreakDuration')}
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="60"
                    value={pomodoroLongBreak}
                    onChange={(e) => setPomodoroLongBreak(Math.max(1, Math.min(60, parseInt(e.target.value) || 15)))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-700 dark:text-gray-300 mb-2">
                    {t('pomodoro.sessionsBeforeLong')}
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={pomodoroSessionsBeforeLongBreak}
                    onChange={(e) => setPomodoroSessionsBeforeLongBreak(Math.max(1, Math.min(10, parseInt(e.target.value) || 4)))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Pomodoro Display */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8">
            {/* Phase and Session Info */}
            <div className="text-center mb-6">
              <div className={`text-2xl font-bold mb-2 ${getPomodoroPhaseColor(pomodoroPhase)}`}>
                {pomodoroPhase === 'work' && t('pomodoro.work')}
                {pomodoroPhase === 'shortBreak' && t('pomodoro.shortBreak')}
                {pomodoroPhase === 'longBreak' && t('pomodoro.longBreak')}
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400">
                {t('pomodoro.completed')}: {pomodoroCompletedSessions}
              </div>
            </div>

            {/* Circular Progress */}
            <div className="flex justify-center mb-8">
              <div className="relative">
                <svg className="w-64 h-64 transform -rotate-90">
                  <circle
                    cx="128"
                    cy="128"
                    r="120"
                    stroke="currentColor"
                    strokeWidth="8"
                    fill="none"
                    className="text-gray-200 dark:text-gray-700"
                  />
                  <circle
                    cx="128"
                    cy="128"
                    r="120"
                    stroke="currentColor"
                    strokeWidth="8"
                    fill="none"
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                    className={getPomodoroProgressColor(pomodoroPhase)}
                    style={{ transition: 'stroke-dashoffset 0.5s ease' }}
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-5xl font-mono font-bold text-gray-900 dark:text-white">
                    {formatCountdown(pomodoroRemaining)}
                  </div>
                </div>
              </div>
            </div>

            {/* Controls */}
            <div className="flex justify-center gap-4 flex-wrap">
              {pomodoroRunning ? (
                <button
                  onClick={pausePomodoro}
                  className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg px-6 py-3 font-medium hover:from-blue-700 hover:to-indigo-700 transition-colors"
                >
                  <Pause className="w-5 h-5" />
                  {t('pomodoro.pause')}
                </button>
              ) : (
                <button
                  onClick={startPomodoro}
                  className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg px-6 py-3 font-medium hover:from-blue-700 hover:to-indigo-700 transition-colors"
                >
                  <Play className="w-5 h-5" />
                  {t('pomodoro.start')}
                </button>
              )}
              <button
                onClick={resetPomodoro}
                className="flex items-center gap-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg px-6 py-3 font-medium transition-colors"
              >
                <RotateCcw className="w-5 h-5" />
                {t('pomodoro.reset')}
              </button>
              <button
                onClick={skipPomodoroPhase}
                className="flex items-center gap-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg px-6 py-3 font-medium transition-colors"
              >
                <SkipForward className="w-5 h-5" />
                {t('pomodoro.skip')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Guide Section */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
          <Timer className="w-6 h-6" />
          {t('guide.title')}
        </h2>
        <div className="space-y-6">
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
              {t('guide.stopwatch.title')}
            </h3>
            <ul className="list-disc list-inside space-y-1 text-gray-700 dark:text-gray-300">
              {(t.raw('guide.stopwatch.items') as string[]).map((item, idx) => (
                <li key={idx}>{item}</li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
              {t('guide.timer.title')}
            </h3>
            <ul className="list-disc list-inside space-y-1 text-gray-700 dark:text-gray-300">
              {(t.raw('guide.timer.items') as string[]).map((item, idx) => (
                <li key={idx}>{item}</li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
              {t('guide.pomodoro.title')}
            </h3>
            <ul className="list-disc list-inside space-y-1 text-gray-700 dark:text-gray-300">
              {(t.raw('guide.pomodoro.items') as string[]).map((item, idx) => (
                <li key={idx}>{item}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
