'use client'

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useTranslations } from 'next-intl'
import {
  Play, Pause, RotateCcw, Settings, Volume2, VolumeX, Bell, BellOff,
  SkipForward, Plus, Trash2, Check, ChevronDown, ChevronUp, X
} from 'lucide-react'

// ── Types ──────────────────────────────────────────────────────
type Phase = 'work' | 'shortBreak' | 'longBreak'

interface TimerSettings {
  workDuration: number       // minutes
  shortBreakDuration: number
  longBreakDuration: number
  longBreakInterval: number  // every N pomodoros
  autoStart: boolean
  notificationsEnabled: boolean
  soundEnabled: boolean
  soundVolume: number        // 0-100
}

interface Task {
  id: string
  text: string
  completed: boolean
  estimatedPomodoros: number
  completedPomodoros: number
}

interface DailyStat {
  date: string  // YYYY-MM-DD
  count: number
  minutes: number
}

interface SavedTimerState {
  phase: Phase
  timeLeft: number
  isRunning: boolean
  currentRound: number
  completedRounds: number
  totalWorkSeconds: number
  lastTickTime: number  // Date.now() of last tick
  settings: TimerSettings
}

// ── Constants ──────────────────────────────────────────────────
const STORAGE_KEYS = {
  settings: 'pomodoro-settings',
  tasks: 'pomodoro-tasks',
  stats: 'pomodoro-daily-stats',
  timerState: 'pomodoro-timer-state',
} as const

const DEFAULT_SETTINGS: TimerSettings = {
  workDuration: 25,
  shortBreakDuration: 5,
  longBreakDuration: 15,
  longBreakInterval: 4,
  autoStart: false,
  notificationsEnabled: false,
  soundEnabled: true,
  soundVolume: 70,
}

// ── Audio Helpers ──────────────────────────────────────────────
function playAlarm(volume: number) {
  try {
    const ctx = new AudioContext()
    for (let i = 0; i < 3; i++) {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.type = 'sine'
      osc.frequency.value = 800 + i * 200
      gain.gain.setValueAtTime((volume / 100) * 0.4, ctx.currentTime + i * 0.3)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.3 + 0.2)
      osc.start(ctx.currentTime + i * 0.3)
      osc.stop(ctx.currentTime + i * 0.3 + 0.25)
    }
    // Close after sounds finish
    setTimeout(() => ctx.close(), 1500)
  } catch {
    // Audio not available
  }
}

function playPreviewSound(volume: number) {
  playAlarm(volume)
}

// ── localStorage Helpers ───────────────────────────────────────
function loadFromStorage<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return fallback
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

function saveToStorage(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // storage full or unavailable
  }
}

// ── Date Helpers ───────────────────────────────────────────────
function getTodayStr(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function getWeekDates(): string[] {
  const dates: string[] = []
  const now = new Date()
  const day = now.getDay() // 0=Sun
  const monday = new Date(now)
  monday.setDate(now.getDate() - ((day + 6) % 7))
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    dates.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`)
  }
  return dates
}

function getStreak(stats: DailyStat[]): number {
  if (stats.length === 0) return 0
  const statMap = new Map(stats.map(s => [s.date, s.count]))
  let streak = 0
  const d = new Date()
  // Check today first
  const todayStr = getTodayStr()
  if (!statMap.get(todayStr)) {
    // If no pomodoros today, check yesterday as streak start
    d.setDate(d.getDate() - 1)
  }
  while (true) {
    const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    const count = statMap.get(dateStr)
    if (count && count > 0) {
      streak++
      d.setDate(d.getDate() - 1)
    } else {
      break
    }
  }
  return streak
}

// ── Main Component ─────────────────────────────────────────────
export default function PomodoroTimer() {
  const t = useTranslations('pomodoroTimer')

  // Settings
  const [settings, setSettings] = useState<TimerSettings>(DEFAULT_SETTINGS)
  const [showSettings, setShowSettings] = useState(false)
  const [tempSettings, setTempSettings] = useState<TimerSettings>(DEFAULT_SETTINGS)

  // Timer
  const [phase, setPhase] = useState<Phase>('work')
  const [timeLeft, setTimeLeft] = useState(DEFAULT_SETTINGS.workDuration * 60)
  const [isRunning, setIsRunning] = useState(false)
  const [currentRound, setCurrentRound] = useState(1)
  const [completedRounds, setCompletedRounds] = useState(0)
  const [totalWorkSeconds, setTotalWorkSeconds] = useState(0)

  // Tasks
  const [tasks, setTasks] = useState<Task[]>([])
  const [newTaskText, setNewTaskText] = useState('')
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null)
  const [showTasks, setShowTasks] = useState(true)

  // Stats
  const [dailyStats, setDailyStats] = useState<DailyStat[]>([])

  // UI state
  const [flashPhase, setFlashPhase] = useState(false)
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default')
  const [mounted, setMounted] = useState(false)

  // Refs
  const lastTickRef = useRef<number>(Date.now())
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const originalTitleRef = useRef<string>('')

  // ── Init from localStorage ──────────────────────────────────
  useEffect(() => {
    setMounted(true)
    originalTitleRef.current = document.title

    const savedSettings = loadFromStorage<TimerSettings>(STORAGE_KEYS.settings, DEFAULT_SETTINGS)
    setSettings(savedSettings)
    setTempSettings(savedSettings)

    const savedTasks = loadFromStorage<Task[]>(STORAGE_KEYS.tasks, [])
    setTasks(savedTasks)

    const savedStats = loadFromStorage<DailyStat[]>(STORAGE_KEYS.stats, [])
    setDailyStats(savedStats)

    // Restore timer state
    const savedState = loadFromStorage<SavedTimerState | null>(STORAGE_KEYS.timerState, null)
    if (savedState) {
      setPhase(savedState.phase)
      setCurrentRound(savedState.currentRound)
      setCompletedRounds(savedState.completedRounds)
      setTotalWorkSeconds(savedState.totalWorkSeconds)
      setSettings(savedState.settings)

      if (savedState.isRunning && savedState.lastTickTime) {
        // Calculate elapsed time since last tick
        const elapsed = Math.floor((Date.now() - savedState.lastTickTime) / 1000)
        const remaining = Math.max(0, savedState.timeLeft - elapsed)
        setTimeLeft(remaining)
        if (remaining > 0) {
          setIsRunning(true)
        }
      } else {
        setTimeLeft(savedState.timeLeft)
      }
    }

    // Check notification permission
    if (typeof Notification !== 'undefined') {
      setNotificationPermission(Notification.permission)
    }

    return () => {
      document.title = originalTitleRef.current
    }
  }, [])

  // ── Save timer state on changes ─────────────────────────────
  useEffect(() => {
    if (!mounted) return
    const state: SavedTimerState = {
      phase, timeLeft, isRunning, currentRound,
      completedRounds, totalWorkSeconds, lastTickTime: Date.now(), settings,
    }
    saveToStorage(STORAGE_KEYS.timerState, state)
  }, [phase, timeLeft, isRunning, currentRound, completedRounds, totalWorkSeconds, settings, mounted])

  // ── Save settings ───────────────────────────────────────────
  useEffect(() => {
    if (!mounted) return
    saveToStorage(STORAGE_KEYS.settings, settings)
  }, [settings, mounted])

  // ── Save tasks ──────────────────────────────────────────────
  useEffect(() => {
    if (!mounted) return
    saveToStorage(STORAGE_KEYS.tasks, tasks)
  }, [tasks, mounted])

  // ── Save stats ──────────────────────────────────────────────
  useEffect(() => {
    if (!mounted) return
    saveToStorage(STORAGE_KEYS.stats, dailyStats)
  }, [dailyStats, mounted])

  // ── Phase helpers ───────────────────────────────────────────
  const getPhaseTotal = useCallback((p: Phase, s: TimerSettings) => {
    if (p === 'work') return s.workDuration * 60
    if (p === 'shortBreak') return s.shortBreakDuration * 60
    return s.longBreakDuration * 60
  }, [])

  const phaseLabels = useMemo(() => ({
    work: t('phaseWork'),
    shortBreak: t('phaseShortBreak'),
    longBreak: t('phaseLongBreak'),
  }), [t])

  // ── Notification ────────────────────────────────────────────
  const requestNotificationPermission = useCallback(async () => {
    if (typeof Notification === 'undefined') return
    const result = await Notification.requestPermission()
    setNotificationPermission(result)
    if (result === 'granted') {
      setSettings(s => ({ ...s, notificationsEnabled: true }))
    }
  }, [])

  const sendNotification = useCallback((title: string, body: string) => {
    if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
      try {
        new Notification(title, { body, icon: '/icons/icon-192x192.png' })
      } catch {
        // notifications not supported
      }
    }
  }, [])

  // ── Timer control ───────────────────────────────────────────
  const stopTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
    setIsRunning(false)
  }, [])

  const recordPomodoroStat = useCallback((workMinutes: number) => {
    setDailyStats(prev => {
      const today = getTodayStr()
      const existing = prev.find(s => s.date === today)
      if (existing) {
        return prev.map(s => s.date === today
          ? { ...s, count: s.count + 1, minutes: s.minutes + workMinutes }
          : s
        )
      }
      return [...prev, { date: today, count: 1, minutes: workMinutes }]
    })

    // Increment active task's completed pomodoros
    if (activeTaskId) {
      setTasks(prev => prev.map(task =>
        task.id === activeTaskId
          ? { ...task, completedPomodoros: task.completedPomodoros + 1 }
          : task
      ))
    }
  }, [activeTaskId])

  const handlePhaseComplete = useCallback((
    currentPhase: Phase, rounds: number, completed: number, s: TimerSettings
  ) => {
    stopTimer()

    // Sound
    if (s.soundEnabled) {
      playAlarm(s.soundVolume)
    }

    // Screen flash
    setFlashPhase(true)
    setTimeout(() => setFlashPhase(false), 1500)

    // Record stats
    if (currentPhase === 'work') {
      setTotalWorkSeconds(prev => prev + s.workDuration * 60)
      recordPomodoroStat(s.workDuration)
    }

    // Determine next phase
    let nextPhase: Phase
    let nextRound = rounds
    let nextCompleted = completed

    if (currentPhase === 'work') {
      nextCompleted = completed + 1
      nextPhase = (nextCompleted % s.longBreakInterval === 0) ? 'longBreak' : 'shortBreak'
    } else {
      nextPhase = 'work'
      nextRound = currentPhase === 'longBreak' ? 1 : rounds + 1
    }

    // Notification
    if (s.notificationsEnabled) {
      const nextLabel = nextPhase === 'work' ? t('phaseWork')
        : nextPhase === 'shortBreak' ? t('phaseShortBreak')
        : t('phaseLongBreak')
      sendNotification(
        t('notificationTitle'),
        currentPhase === 'work'
          ? t('notificationWorkDone', { next: nextLabel })
          : t('notificationBreakDone')
      )
    }

    setCompletedRounds(nextCompleted)
    setCurrentRound(nextRound)
    setPhase(nextPhase)
    setTimeLeft(getPhaseTotal(nextPhase, s))

    if (s.autoStart) {
      setIsRunning(true)
    }
  }, [stopTimer, getPhaseTotal, recordPomodoroStat, sendNotification, t])

  // ── Main timer tick with drift correction ───────────────────
  useEffect(() => {
    if (!isRunning) return

    lastTickRef.current = Date.now()

    intervalRef.current = setInterval(() => {
      const now = Date.now()
      const elapsed = Math.round((now - lastTickRef.current) / 1000)
      lastTickRef.current = now

      setTimeLeft(prev => {
        const next = prev - elapsed
        if (next <= 0) return 0
        return next
      })
    }, 1000)

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [isRunning])

  // ── Watch for timeLeft=0 ────────────────────────────────────
  useEffect(() => {
    if (timeLeft === 0 && isRunning) {
      handlePhaseComplete(phase, currentRound, completedRounds, settings)
    }
  }, [timeLeft, isRunning, phase, currentRound, completedRounds, settings, handlePhaseComplete])

  // ── Update document title ───────────────────────────────────
  useEffect(() => {
    if (!mounted) return
    const mins = Math.floor(timeLeft / 60)
    const secs = timeLeft % 60
    const timeStr = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
    const label = phaseLabels[phase]
    document.title = isRunning || timeLeft < getPhaseTotal(phase, settings)
      ? `${timeStr} - ${label} | ${t('title')}`
      : originalTitleRef.current || t('title')
  }, [timeLeft, phase, isRunning, mounted, phaseLabels, getPhaseTotal, settings, t])

  // ── User actions ────────────────────────────────────────────
  const handleStartPause = useCallback(() => {
    if (isRunning) {
      stopTimer()
    } else {
      setIsRunning(true)
    }
  }, [isRunning, stopTimer])

  const handleSkip = useCallback(() => {
    handlePhaseComplete(phase, currentRound, completedRounds, settings)
  }, [phase, currentRound, completedRounds, settings, handlePhaseComplete])

  const handleResetPhase = useCallback(() => {
    stopTimer()
    setTimeLeft(getPhaseTotal(phase, settings))
  }, [stopTimer, phase, settings, getPhaseTotal])

  const handleResetAll = useCallback(() => {
    stopTimer()
    setPhase('work')
    setTimeLeft(settings.workDuration * 60)
    setCurrentRound(1)
    setCompletedRounds(0)
    setTotalWorkSeconds(0)
  }, [stopTimer, settings.workDuration])

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

  // ── Task management ─────────────────────────────────────────
  const addTask = useCallback(() => {
    const text = newTaskText.trim()
    if (!text) return
    const task: Task = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      text,
      completed: false,
      estimatedPomodoros: 1,
      completedPomodoros: 0,
    }
    setTasks(prev => [...prev, task])
    setNewTaskText('')
    if (!activeTaskId) setActiveTaskId(task.id)
  }, [newTaskText, activeTaskId])

  const toggleTask = useCallback((id: string) => {
    setTasks(prev => prev.map(task =>
      task.id === id ? { ...task, completed: !task.completed } : task
    ))
  }, [])

  const deleteTask = useCallback((id: string) => {
    setTasks(prev => prev.filter(task => task.id !== id))
    if (activeTaskId === id) setActiveTaskId(null)
  }, [activeTaskId])

  const updateTaskEstimate = useCallback((id: string, est: number) => {
    setTasks(prev => prev.map(task =>
      task.id === id ? { ...task, estimatedPomodoros: Math.max(1, est) } : task
    ))
  }, [])

  // ── Computed values ─────────────────────────────────────────
  const phaseTotal = getPhaseTotal(phase, settings)
  const progress = phaseTotal > 0 ? (phaseTotal - timeLeft) / phaseTotal : 0

  const minutes = Math.floor(timeLeft / 60)
  const seconds = timeLeft % 60
  const timeStr = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`

  const radius = 90
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference * (1 - progress)

  const phaseColorMap: Record<Phase, { text: string; stroke: string; bg: string; buttonFrom: string; buttonTo: string; accent: string }> = {
    work: {
      text: 'text-red-500',
      stroke: '#ef4444',
      bg: 'bg-red-50 dark:bg-red-950',
      buttonFrom: 'from-red-500',
      buttonTo: 'to-rose-600',
      accent: 'accent-red-500',
    },
    shortBreak: {
      text: 'text-green-500',
      stroke: '#22c55e',
      bg: 'bg-green-50 dark:bg-green-950',
      buttonFrom: 'from-green-500',
      buttonTo: 'to-emerald-600',
      accent: 'accent-green-500',
    },
    longBreak: {
      text: 'text-blue-500',
      stroke: '#3b82f6',
      bg: 'bg-blue-50 dark:bg-blue-950',
      buttonFrom: 'from-blue-500',
      buttonTo: 'to-indigo-600',
      accent: 'accent-blue-500',
    },
  }

  const colors = phaseColorMap[phase]
  const totalWorkMinutes = Math.floor(totalWorkSeconds / 60)

  // Today stats
  const todayStr = getTodayStr()
  const todayStat = dailyStats.find(s => s.date === todayStr)
  const todayPomodoros = todayStat?.count ?? 0
  const todayMinutes = todayStat?.minutes ?? 0

  // Weekly stats
  const weekDates = useMemo(() => getWeekDates(), [])
  const weekStats = useMemo(() => weekDates.map(date => {
    const stat = dailyStats.find(s => s.date === date)
    return { date, count: stat?.count ?? 0, minutes: stat?.minutes ?? 0 }
  }), [weekDates, dailyStats])
  const maxWeekCount = Math.max(...weekStats.map(s => s.count), 1)
  const streak = useMemo(() => getStreak(dailyStats), [dailyStats])

  const dayLabels = useMemo(() => {
    try { return (t.raw('weekDays') as string[]) } catch { return ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] }
  }, [t])

  const activeTask = tasks.find(task => task.id === activeTaskId)

  if (!mounted) {
    return (
      <div className="space-y-8">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8 flex flex-col items-center">
          <div className="w-56 h-56 rounded-full bg-gray-100 dark:bg-gray-700 animate-pulse" />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Flash overlay */}
      {flashPhase && (
        <div className="fixed inset-0 z-40 pointer-events-none animate-pulse"
          style={{ backgroundColor: colors.stroke, opacity: 0.15 }}
        />
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('title')}</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('description')}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSettings(s => ({ ...s, soundEnabled: !s.soundEnabled }))}
            className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300"
            aria-label={settings.soundEnabled ? t('soundOff') : t('soundOn')}
            title={settings.soundEnabled ? t('soundOff') : t('soundOn')}
          >
            {settings.soundEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
          </button>
          <button
            onClick={() => {
              if (settings.notificationsEnabled) {
                setSettings(s => ({ ...s, notificationsEnabled: false }))
              } else {
                requestNotificationPermission()
              }
            }}
            className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300"
            aria-label={settings.notificationsEnabled ? t('notifOff') : t('notifOn')}
            title={settings.notificationsEnabled ? t('notifOff') : t('notifOn')}
          >
            {settings.notificationsEnabled ? <Bell size={18} /> : <BellOff size={18} />}
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

      {/* Phase tabs */}
      <div className="flex gap-2">
        {(['work', 'shortBreak', 'longBreak'] as Phase[]).map(p => (
          <button
            key={p}
            onClick={() => {
              if (p !== phase) {
                stopTimer()
                setPhase(p)
                setTimeLeft(getPhaseTotal(p, settings))
              }
            }}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
              p === phase
                ? `${phaseColorMap[p].bg} ${phaseColorMap[p].text} font-semibold`
                : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
          >
            {phaseLabels[p]}
          </button>
        ))}
      </div>

      {/* Main Timer Card */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8 flex flex-col items-center gap-6">
        {/* Active task display */}
        {activeTask && !activeTask.completed && (
          <div className={`text-sm font-medium ${colors.text} flex items-center gap-2`}>
            <span className="opacity-60">{t('currentTask')}:</span>
            <span>{activeTask.text}</span>
          </div>
        )}

        {/* Phase Label */}
        <div className={`text-lg font-semibold ${colors.text}`}>
          {phaseLabels[phase]}
        </div>

        {/* SVG Circle Timer */}
        <div className="relative w-56 h-56 sm:w-64 sm:h-64 flex items-center justify-center">
          <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 200 200">
            <circle
              cx="100" cy="100" r={radius}
              fill="none" stroke="currentColor" strokeWidth="6"
              className="text-gray-200 dark:text-gray-700"
            />
            <circle
              cx="100" cy="100" r={radius}
              fill="none" stroke={colors.stroke} strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              className="transition-[stroke-dashoffset] duration-700 ease-linear"
            />
          </svg>
          {/* Pulsing glow when running */}
          {isRunning && (
            <div
              className="absolute inset-2 rounded-full animate-pulse opacity-10"
              style={{ backgroundColor: colors.stroke }}
            />
          )}
          <div className="flex flex-col items-center relative z-10">
            <span className="text-5xl sm:text-6xl font-mono font-bold text-gray-900 dark:text-white tabular-nums">
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
            className={`flex items-center gap-2 px-8 py-4 rounded-full bg-gradient-to-r ${colors.buttonFrom} ${colors.buttonTo} text-white font-semibold text-lg shadow-md hover:shadow-lg transition-shadow`}
            aria-label={isRunning ? t('pause') : t('start')}
          >
            {isRunning ? <Pause size={24} /> : <Play size={24} />}
            {isRunning ? t('pause') : t('start')}
          </button>

          <button
            onClick={handleSkip}
            className="p-3 rounded-full bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300"
            aria-label={t('skip')}
            title={t('skip')}
          >
            <SkipForward size={20} />
          </button>
        </div>

        {/* Quick toggles */}
        <div className="flex items-center gap-6 text-sm text-gray-600 dark:text-gray-400">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={settings.autoStart}
              onChange={e => setSettings(s => ({ ...s, autoStart: e.target.checked }))}
              className={`w-4 h-4 ${colors.accent}`}
            />
            {t('autoStart')}
          </label>
          <button
            onClick={handleResetAll}
            className="flex items-center gap-1 hover:text-red-500 transition-colors"
          >
            <RotateCcw size={14} />
            {t('resetAll')}
          </button>
        </div>
      </div>

      {/* Task Management */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
        <button
          onClick={() => setShowTasks(v => !v)}
          className="flex items-center justify-between w-full text-left"
        >
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{t('taskTitle')}</h2>
          {showTasks ? <ChevronUp size={20} className="text-gray-400" /> : <ChevronDown size={20} className="text-gray-400" />}
        </button>

        {showTasks && (
          <div className="mt-4 space-y-3">
            {/* Add task */}
            <div className="flex gap-2">
              <input
                type="text"
                value={newTaskText}
                onChange={e => setNewTaskText(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addTask()}
                placeholder={t('taskPlaceholder')}
                className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500 text-sm"
              />
              <button
                onClick={addTask}
                disabled={!newTaskText.trim()}
                className="px-3 py-2 rounded-lg bg-red-500 text-white hover:bg-red-600 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Plus size={18} />
              </button>
            </div>

            {/* Task list */}
            {tasks.length === 0 ? (
              <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-4">{t('taskEmpty')}</p>
            ) : (
              <ul className="space-y-2">
                {tasks.map(task => (
                  <li
                    key={task.id}
                    className={`flex items-center gap-3 p-3 rounded-lg border transition-colors cursor-pointer ${
                      task.id === activeTaskId
                        ? 'border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-950'
                        : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'
                    } ${task.completed ? 'opacity-50' : ''}`}
                    onClick={() => !task.completed && setActiveTaskId(task.id === activeTaskId ? null : task.id)}
                  >
                    <button
                      onClick={e => { e.stopPropagation(); toggleTask(task.id) }}
                      className={`flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                        task.completed
                          ? 'bg-green-500 border-green-500 text-white'
                          : 'border-gray-300 dark:border-gray-600 hover:border-red-400'
                      }`}
                    >
                      {task.completed && <Check size={12} />}
                    </button>
                    <span className={`flex-1 text-sm text-gray-800 dark:text-gray-200 ${task.completed ? 'line-through' : ''}`}>
                      {task.text}
                    </span>
                    {/* Est pomodoros */}
                    <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                      <span className="text-xs text-gray-400">{task.completedPomodoros}/</span>
                      <input
                        type="number"
                        min={1}
                        max={99}
                        value={task.estimatedPomodoros}
                        onChange={e => updateTaskEstimate(task.id, parseInt(e.target.value) || 1)}
                        className="w-10 text-center text-xs px-1 py-0.5 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        title={t('taskEstimate')}
                      />
                    </div>
                    <button
                      onClick={e => { e.stopPropagation(); deleteTask(task.id) }}
                      className="flex-shrink-0 p-1 text-gray-400 hover:text-red-500"
                    >
                      <Trash2 size={14} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      {/* Statistics */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{t('statsTitle')}</h2>

        {/* Today + session stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <div className="bg-red-50 dark:bg-red-950 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-red-600 dark:text-red-400">{todayPomodoros}</div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">{t('statsTodayPomodoros')}</div>
          </div>
          <div className="bg-orange-50 dark:bg-orange-950 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">{todayMinutes}</div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">{t('statsTodayMinutes')}</div>
          </div>
          <div className="bg-green-50 dark:bg-green-950 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">{completedRounds}</div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">{t('statsSessionRounds')}</div>
          </div>
          <div className="bg-blue-50 dark:bg-blue-950 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{streak}</div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">{t('statsStreak')}</div>
          </div>
        </div>

        {/* Weekly chart */}
        <div>
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">{t('statsWeeklyTitle')}</h3>
          <div className="flex items-end gap-2 h-32">
            {weekStats.map((stat, i) => {
              const barHeight = maxWeekCount > 0 ? (stat.count / maxWeekCount) * 100 : 0
              const isToday = stat.date === todayStr
              return (
                <div key={stat.date} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-xs text-gray-500 dark:text-gray-400 font-mono">
                    {stat.count > 0 ? stat.count : ''}
                  </span>
                  <div className="w-full flex items-end" style={{ height: '80px' }}>
                    <div
                      className={`w-full rounded-t transition-all duration-300 ${
                        isToday
                          ? 'bg-red-400 dark:bg-red-500'
                          : 'bg-gray-300 dark:bg-gray-600'
                      }`}
                      style={{ height: `${Math.max(barHeight, 4)}%`, minHeight: '2px' }}
                    />
                  </div>
                  <span className={`text-xs ${isToday ? 'text-red-500 font-bold' : 'text-gray-400 dark:text-gray-500'}`}>
                    {dayLabels[i] ?? ''}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowSettings(false)}>
          <div
            className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-md p-6 space-y-5 max-h-[90vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">{t('settingsTitle')}</h2>
              <button onClick={() => setShowSettings(false)} className="p-1 text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>

            {/* Time settings */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">{t('settingsTimeSection')}</h3>

              <div>
                <label className="flex items-center justify-between text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  <span>{t('settingsWork')}</span>
                  <span className="text-red-500 font-mono">{tempSettings.workDuration}{t('settingsMin')}</span>
                </label>
                <input
                  type="range" min={1} max={120}
                  value={tempSettings.workDuration}
                  onChange={e => setTempSettings(s => ({ ...s, workDuration: Number(e.target.value) }))}
                  className="w-full accent-red-500"
                />
              </div>

              <div>
                <label className="flex items-center justify-between text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  <span>{t('settingsShortBreak')}</span>
                  <span className="text-green-500 font-mono">{tempSettings.shortBreakDuration}{t('settingsMin')}</span>
                </label>
                <input
                  type="range" min={1} max={30}
                  value={tempSettings.shortBreakDuration}
                  onChange={e => setTempSettings(s => ({ ...s, shortBreakDuration: Number(e.target.value) }))}
                  className="w-full accent-green-500"
                />
              </div>

              <div>
                <label className="flex items-center justify-between text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  <span>{t('settingsLongBreak')}</span>
                  <span className="text-blue-500 font-mono">{tempSettings.longBreakDuration}{t('settingsMin')}</span>
                </label>
                <input
                  type="range" min={1} max={60}
                  value={tempSettings.longBreakDuration}
                  onChange={e => setTempSettings(s => ({ ...s, longBreakDuration: Number(e.target.value) }))}
                  className="w-full accent-blue-500"
                />
              </div>

              <div>
                <label className="flex items-center justify-between text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  <span>{t('settingsLongBreakInterval')}</span>
                  <span className="font-mono">{tempSettings.longBreakInterval}</span>
                </label>
                <input
                  type="range" min={2} max={10}
                  value={tempSettings.longBreakInterval}
                  onChange={e => setTempSettings(s => ({ ...s, longBreakInterval: Number(e.target.value) }))}
                  className="w-full accent-gray-500"
                />
              </div>
            </div>

            {/* Notification settings */}
            <div className="space-y-4 border-t border-gray-200 dark:border-gray-700 pt-4">
              <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">{t('settingsNotifSection')}</h3>

              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-700 dark:text-gray-300">{t('settingsBrowserNotif')}</span>
                <div className="flex items-center gap-2">
                  {notificationPermission === 'denied' && (
                    <span className="text-xs text-red-500">{t('settingsNotifDenied')}</span>
                  )}
                  {notificationPermission === 'default' && (
                    <button
                      onClick={requestNotificationPermission}
                      className="text-xs px-2 py-1 rounded bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400 hover:bg-blue-200"
                    >
                      {t('settingsNotifAllow')}
                    </button>
                  )}
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={tempSettings.notificationsEnabled}
                      onChange={e => {
                        if (e.target.checked && notificationPermission !== 'granted') {
                          requestNotificationPermission()
                        }
                        setTempSettings(s => ({ ...s, notificationsEnabled: e.target.checked }))
                      }}
                      disabled={notificationPermission === 'denied'}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-gray-200 dark:bg-gray-600 rounded-full peer peer-checked:bg-blue-500 peer-disabled:opacity-50 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-full" />
                  </label>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-700 dark:text-gray-300">{t('settingsSound')}</span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={tempSettings.soundEnabled}
                    onChange={e => setTempSettings(s => ({ ...s, soundEnabled: e.target.checked }))}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-gray-200 dark:bg-gray-600 rounded-full peer peer-checked:bg-blue-500 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-full" />
                </label>
              </div>

              {tempSettings.soundEnabled && (
                <>
                  <div>
                    <label className="flex items-center justify-between text-sm text-gray-700 dark:text-gray-300 mb-1">
                      <span>{t('settingsVolume')}</span>
                      <span className="font-mono text-xs">{tempSettings.soundVolume}%</span>
                    </label>
                    <input
                      type="range" min={0} max={100}
                      value={tempSettings.soundVolume}
                      onChange={e => setTempSettings(s => ({ ...s, soundVolume: Number(e.target.value) }))}
                      className="w-full accent-blue-500"
                    />
                  </div>
                  <button
                    onClick={() => playPreviewSound(tempSettings.soundVolume)}
                    className="text-sm px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300"
                  >
                    {t('settingsPreview')}
                  </button>
                </>
              )}
            </div>

            {/* Auto start */}
            <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-700 dark:text-gray-300">{t('autoStart')}</span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={tempSettings.autoStart}
                    onChange={e => setTempSettings(s => ({ ...s, autoStart: e.target.checked }))}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-gray-200 dark:bg-gray-600 rounded-full peer peer-checked:bg-blue-500 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-full" />
                </label>
              </div>
            </div>

            {/* Buttons */}
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
