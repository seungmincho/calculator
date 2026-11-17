'use client'

import { useState, useEffect, useRef, useCallback, useMemo, useLayoutEffect } from 'react'
import { useTranslations } from '@/lib/i18n'
import '@/lib/i18n/ns/pomodoroTimer'
import PomodoroGoalPanel, { type PomodoroStatsStatus } from '@/components/PomodoroGoalPanel'
import { parsePomodoroStats, pomodoroLocalDay, readPomodoroValue, savePomodoroStats, withPomodoroLock, POMODORO_STATS_KEY, type PomodoroDailyStat, type PomodoroRead } from '@/utils/pomodoroGoal'
import { createPomodoroBrowserSession, initialPomodoroBrowserState, pomodoroBrowserPorts } from '@/lib/pomodoro/browserSession'
import { type PomodoroTransition } from '@/lib/pomodoro/session'
import { DEFAULT_POMODORO_SETTINGS, pomodoroDisplaySeconds, type PomodoroPhase as Phase, type PomodoroSettings as TimerSettings, type PomodoroTask as Task } from '@/utils/pomodoroSession'
import PomodoroRecovery from '@/components/PomodoroRecovery'
import { useDialog } from '@/hooks/useDialog'
import { glassCard, glassInset, glassInput } from '@/lib/glass'
import {
  Play, Pause, RotateCcw, Settings, Volume2, VolumeX, Bell, BellOff,
  SkipForward, Plus, Trash2, Check, ChevronDown, ChevronUp, X
} from 'lucide-react'

type DailyStat = PomodoroDailyStat
const DEFAULT_SETTINGS = DEFAULT_POMODORO_SETTINGS
const STORAGE_KEYS = { stats: POMODORO_STATS_KEY } as const

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

// ── Date Helpers ───────────────────────────────────────────────
function getTodayStr(): string {
  return pomodoroLocalDay()
}

function getWeekDates(today: string): string[] {
  const dates: string[] = []
  const now = new Date(`${today}T12:00:00`)
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

function getStreak(stats: DailyStat[], todayStr: string): number {
  if (stats.length === 0) return 0
  const statMap = new Map(stats.map(s => [s.date, s.count]))
  let streak = 0
  const d = new Date(`${todayStr}T12:00:00`)
  // Check today first
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

  const [runtime, setRuntime] = useState(initialPomodoroBrowserState)
  const { phase, isRunning, currentRound, completedRounds, settings } = runtime.timer
  const timeLeft = pomodoroDisplaySeconds(runtime.timer.remainingMs)
  const tasks = runtime.tasks
  const [showSettings, setShowSettings] = useState(false)
  const [tempSettings, setTempSettings] = useState<TimerSettings>(DEFAULT_SETTINGS)
  const tc = useTranslations('common')
  const settingsRef = useRef<HTMLDivElement>(null)
  useDialog(showSettings, () => setShowSettings(false), settingsRef)
  const [newTaskText, setNewTaskText] = useState('')
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null)
  const [showTasks, setShowTasks] = useState(true)
  const [dailyStats, setDailyStats] = useState<DailyStat[]>([])
  const [statsStatus, setStatsStatus] = useState<PomodoroStatsStatus>('loading')
  const [localDay, setLocalDay] = useState('')
  const [flashPhase, setFlashPhase] = useState(false)
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default')
  const [mounted, setMounted] = useState(false)
  const originalTitleRef = useRef('')
  const statsRaw = useRef<string | null>(null)
  const statsBaseline = useRef('[]')
  const statsBlocked = useRef(false)
  const sessionRef = useRef<ReturnType<typeof createPomodoroBrowserSession> | null>(null)
  const activeTaskRef = useRef<string | null>(null)
  const transitionRef = useRef<(event: PomodoroTransition) => void>(() => {})
  const flashTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)
  const setSettings = useCallback((update: (current: TimerSettings) => TimerSettings) => {
    const session = sessionRef.current
    if (!session) return
    const next = update(session.getSnapshot().timer.settings)
    session.updatePreferences({ soundEnabled: next.soundEnabled, soundVolume: next.soundVolume,
      notificationsEnabled: next.notificationsEnabled, autoStart: next.autoStart })
  }, [])
  const setTasks = useCallback((update: Task[] | ((current: Task[]) => Task[])) => sessionRef.current?.setTasks(update), [])

  useEffect(() => {
    let active = true
    originalTitleRef.current = document.title
    queueMicrotask(() => {
      if (!active) return
      let savedStats: PomodoroRead<DailyStat[]>
      try { savedStats = readPomodoroValue(localStorage, STORAGE_KEYS.stats, raw => parsePomodoroStats(raw, getTodayStr())) }
      catch { savedStats = { ok: false, error: 'unavailable' } }
      if (savedStats.ok) {
        statsRaw.current = savedStats.raw; statsBaseline.current = JSON.stringify(savedStats.value)
        statsBlocked.current = false; setDailyStats(savedStats.value); setStatsStatus('ready')
      } else { statsBlocked.current = true; setStatsStatus(savedStats.error === 'corrupt' ? 'corrupt' : 'unavailable') }
      setLocalDay(getTodayStr())
      const session = createPomodoroBrowserSession(pomodoroBrowserPorts(() => activeTaskRef.current),
        value => { if (active) setRuntime(value) }, event => { if (active) transitionRef.current(event) })
      sessionRef.current = session
      setTempSettings(session.getSnapshot().timer.settings)
      if (typeof Notification !== 'undefined') setNotificationPermission(Notification.permission)
      setMounted(true)
    })
    return () => {
      active = false; sessionRef.current?.dispose(); sessionRef.current = null
      if (flashTimeout.current) clearTimeout(flashTimeout.current)
      document.title = originalTitleRef.current
    }
  }, [])

  // ── Save stats ──────────────────────────────────────────────
  const persistStats = useCallback(async () => {
    if (!mounted || statsBlocked.current) return
    const next = JSON.stringify(dailyStats)
    if (next === statsBaseline.current) return
    try {
      const result = await withPomodoroLock(STORAGE_KEYS.stats, () => {
        if (statsBlocked.current || next === statsBaseline.current) return null
        const write = savePomodoroStats(localStorage, statsRaw.current, dailyStats, getTodayStr())
        if (write.ok) {
          statsRaw.current = write.raw
          statsBaseline.current = next
        } else if (write.error === 'conflict' || write.error === 'corrupt' || write.error === 'invalid') statsBlocked.current = true
        return write
      })
      if (result) setStatsStatus(result.ok ? 'ready' : result.error === 'conflict' ? 'conflict' : result.error === 'corrupt' || result.error === 'invalid' ? 'corrupt' : 'failed')
    } catch { setStatsStatus('failed') }
  }, [dailyStats, mounted])
  useEffect(() => {
    let active = true
    queueMicrotask(() => { if (active) void persistStats() })
    return () => { active = false }
  }, [persistStats])

  useEffect(() => {
    if (!mounted) return
    const updateDay = () => setLocalDay(getTodayStr())
    const timer = setInterval(updateDay, 60_000)
    document.addEventListener('visibilitychange', updateDay)
    return () => { clearInterval(timer); document.removeEventListener('visibilitychange', updateDay) }
  }, [mounted])

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
  }, [setSettings])

  const sendNotification = useCallback((title: string, body: string) => {
    if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
      try {
        new Notification(title, { body, icon: '/icons/icon-192x192.png' })
      } catch {
        // notifications not supported
      }
    }
  }, [])

  const recordPomodoroStat = useCallback((workMinutes: number, observedAt: number) => {
    const today = pomodoroLocalDay(new Date(observedAt))
    setLocalDay(today)
    setDailyStats(previous => {
      const existing = previous.find(row => row.date === today)
      return existing ? previous.map(row => row.date === today ? { ...row, count: row.count + 1, minutes: row.minutes + workMinutes } : row)
        : [...previous, { date: today, count: 1, minutes: workMinutes }]
    })
  }, [])
  const handleTransition = useCallback((event: PomodoroTransition) => {
    if (event.kind === 'expiredAdvance') return
    if (event.settings.soundEnabled) playAlarm(event.settings.soundVolume)
    setFlashPhase(true)
    if (flashTimeout.current) clearTimeout(flashTimeout.current)
    flashTimeout.current = setTimeout(() => setFlashPhase(false), 1500)
    if (event.kind === 'completed') {
      if (event.phase === 'work') recordPomodoroStat(event.workMinutes, event.observedAt)
      if (event.settings.notificationsEnabled) {
        const nextLabel = event.nextPhase === 'work' ? t('phaseWork') : event.nextPhase === 'shortBreak' ? t('phaseShortBreak') : t('phaseLongBreak')
        sendNotification(t('notificationTitle'), event.phase === 'work' ? t('notificationWorkDone', { next: nextLabel }) : t('notificationBreakDone'))
      }
    }
  }, [recordPomodoroStat, sendNotification, t])
  useLayoutEffect(() => { activeTaskRef.current = activeTaskId; transitionRef.current = handleTransition }, [activeTaskId, handleTransition])

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
  const expired = runtime.timer.notice === 'restoredExpired' || runtime.timer.notice === 'clockGapExpired'
  const timerBlocked = runtime.timer.notice === 'conflict' || runtime.timer.notice === 'unconfirmed'
    || runtime.stores.timer.status === 'conflict' || runtime.stores.timer.status === 'unconfirmed'
  const handleStartPause = () => {
    if (expired) sessionRef.current?.advanceExpired()
    else if (isRunning) sessionRef.current?.pause()
    else sessionRef.current?.start()
  }
  const handleSkip = () => { if (expired) sessionRef.current?.advanceExpired(); else sessionRef.current?.skip() }
  const handleResetPhase = () => sessionRef.current?.resetPhase()
  const handleResetAll = () => sessionRef.current?.resetAll()
  const handleSaveSettings = () => { sessionRef.current?.applySettings(tempSettings); setShowSettings(false) }

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
  }, [newTaskText, activeTaskId, setTasks])

  const toggleTask = useCallback((id: string) => {
    setTasks(prev => prev.map(task =>
      task.id === id ? { ...task, completed: !task.completed } : task
    ))
  }, [setTasks])

  const deleteTask = useCallback((id: string) => {
    setTasks(prev => prev.filter(task => task.id !== id))
    if (activeTaskId === id) setActiveTaskId(null)
  }, [activeTaskId, setTasks])

  const updateTaskEstimate = useCallback((id: string, est: number) => {
    setTasks(prev => prev.map(task =>
      task.id === id ? { ...task, estimatedPomodoros: Math.max(1, est) } : task
    ))
  }, [setTasks])

  // ── Computed values ─────────────────────────────────────────
  const phaseTotal = getPhaseTotal(phase, settings)
  const progress = phaseTotal > 0 ? (phaseTotal - timeLeft) / phaseTotal : 0

  const minutes = Math.floor(timeLeft / 60)
  const seconds = timeLeft % 60
  const timeStr = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`

  const radius = 90
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference * (1 - progress)

  const phaseColorMap: Record<Phase, { text: string; stroke: string; accent: string }> = {
    work: {
      text: 'text-red-500',
      stroke: '#ef4444',
      accent: 'accent-red-500',
    },
    shortBreak: {
      text: 'text-green-500',
      stroke: '#22c55e',
      accent: 'accent-green-500',
    },
    longBreak: {
      text: 'text-primary',
      stroke: '#3b82f6',
      accent: 'accent-primary',
    },
  }

  const colors = phaseColorMap[phase]

  // Today stats
  const todayStr = localDay || getTodayStr()
  const todayStat = dailyStats.find(s => s.date === todayStr)
  const todayPomodoros = todayStat?.count ?? 0
  const todayMinutes = todayStat?.minutes ?? 0

  // Weekly stats
  const weekDates = useMemo(() => getWeekDates(todayStr), [todayStr])
  const weekStats = useMemo(() => weekDates.map(date => {
    const stat = dailyStats.find(s => s.date === date)
    return { date, count: stat?.count ?? 0, minutes: stat?.minutes ?? 0 }
  }), [weekDates, dailyStats])
  const maxWeekCount = Math.max(...weekStats.map(s => s.count), 1)
  const streak = useMemo(() => getStreak(dailyStats, todayStr), [dailyStats, todayStr])

  const dayLabels = useMemo(() => {
    try { return (t.raw('weekDays') as string[]) } catch { return ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] }
  }, [t])

  const activeTask = tasks.find(task => task.id === activeTaskId)

  // 서버·첫 렌더는 기본 설정(25분)으로 전체 화면을 그림 → 저장된 설정·통계·타이머는 마운트 effect에서 적용
  return (
    <div className="space-y-6">
      {/* Flash overlay */}
      {flashPhase && (
        <div className="fixed inset-0 z-40 pointer-events-none animate-pulse"
          style={{ backgroundColor: colors.stroke, opacity: 0.15 }}
        />
      )}

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-fg">{t('title')}</h1>
          <p className="text-sm text-muted mt-1">{t('description')}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSettings(s => ({ ...s, soundEnabled: !s.soundEnabled }))}
            className="min-w-11 min-h-11 p-2 rounded-lg bg-soft hover:bg-subtle text-body"
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
            className="min-w-11 min-h-11 p-2 rounded-lg bg-soft hover:bg-subtle text-body"
            aria-label={settings.notificationsEnabled ? t('notifOff') : t('notifOn')}
            title={settings.notificationsEnabled ? t('notifOff') : t('notifOn')}
          >
            {settings.notificationsEnabled ? <Bell size={18} /> : <BellOff size={18} />}
          </button>
          <button
            onClick={openSettings}
            className="min-w-11 min-h-11 p-2 rounded-lg bg-soft hover:bg-subtle text-body"
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
            disabled={!mounted || timerBlocked}
            data-pomodoro-phase={p}
            onClick={() => sessionRef.current?.selectPhase(p)}
            className={`min-h-11 flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
              p === phase
                ? 'bg-primary text-white font-semibold'
                : 'bg-soft text-muted hover:bg-subtle'
            }`}
          >
            {phaseLabels[p]}
          </button>
        ))}
      </div>

      {/* Main Timer Card */}
      <div data-pomodoro-timer data-phase={phase} data-running={isRunning} data-remaining-ms={runtime.timer.remainingMs} data-phase-id={runtime.timer.phaseId} data-notice={runtime.timer.notice ?? ""} className={`${glassCard} ${glassInset} p-4 sm:p-8 flex flex-col items-center gap-6`}>
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
              className="text-track"
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
            <span className="text-5xl sm:text-6xl font-mono font-bold text-fg tabular-nums">
              {timeStr}
            </span>
            <span className="text-sm text-muted mt-1">
              {t('roundLabel', { current: currentRound, total: settings.longBreakInterval })}
            </span>
          </div>
        </div>

        {/* Controls */}
        <div className="flex w-full items-center justify-center gap-2 sm:gap-4">
          <button
            onClick={handleResetPhase}
            disabled={!mounted || timerBlocked}
            className="min-h-11 min-w-11 shrink-0 p-3 rounded-full bg-soft hover:bg-subtle text-sub disabled:opacity-40"
            aria-label={t('resetPhase')}
            title={t('resetPhase')}
          >
            <RotateCcw size={20} />
          </button>

          <button
            onClick={handleStartPause}
            data-pomodoro-toggle
            disabled={!mounted || timerBlocked || runtime.timer.settling}
            className="flex min-w-0 min-h-11 items-center justify-center gap-2 px-4 sm:px-8 py-4 rounded-full bg-primary text-white font-semibold text-base sm:text-lg disabled:opacity-40"
            aria-label={expired ? t('reliability.advanceExpired') : isRunning ? t('pause') : t('start')}
          >
            {isRunning ? <Pause size={24} /> : <Play size={24} />}
            {expired ? t('reliability.advanceExpired') : isRunning ? t('pause') : t('start')}
          </button>

          <button
            onClick={handleSkip}
            disabled={!mounted || timerBlocked}
            className="min-h-11 min-w-11 shrink-0 p-3 rounded-full bg-soft hover:bg-subtle text-sub disabled:opacity-40"
            aria-label={t('skip')}
            title={t('skip')}
          >
            <SkipForward size={20} />
          </button>
        </div>

        {runtime.timer.settling && <p role="status" className="text-sm text-sub">{t('reliability.settling')}</p>}
        {runtime.timer.notice && <div role="status" className="w-full rounded-2xl bg-subtle p-4 text-sm text-sub"><p>{t(`reliability.${runtime.timer.notice}`)}</p>{expired && <p className="mt-2">{t('reliability.advanceHint')}</p>}</div>}
        <p className="text-sm text-muted text-center">{t('reliability.timeHint')}</p>
        {/* Quick toggles */}
        <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-6 text-sm text-sub">
          <label className="min-h-11 flex items-center gap-2 cursor-pointer select-none">
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
            disabled={!mounted || timerBlocked}
            className="min-h-11 flex items-center gap-1 hover:text-red-500 transition-colors"
          >
            <RotateCcw size={14} />
            {t('resetAll')}
          </button>
        </div>
      </div>

      <PomodoroGoalPanel dailyStats={dailyStats} today={mounted ? todayStr : ''} statsStatus={statsStatus} onRetryStats={() => void persistStats()} />
      <PomodoroRecovery stores={runtime.stores} onReload={kind => sessionRef.current?.reload(kind) ?? Promise.resolve(false)}
        onDiscard={(kind, raw) => sessionRef.current?.discard(kind, raw) ?? Promise.resolve(false)} onCancel={() => sessionRef.current?.cancelPending()} />

      {/* Task Management */}
      <div className={`${glassCard} ${glassInset} p-6`}>
        <button
          onClick={() => setShowTasks(v => !v)}
          className="min-h-11 flex items-center justify-between w-full text-left"
        >
          <h2 className="text-lg font-semibold text-fg">{t('taskTitle')}</h2>
          {showTasks ? <ChevronUp size={20} className="text-faint" /> : <ChevronDown size={20} className="text-faint" />}
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
                className={`min-w-0 min-h-11 flex-1 px-3 py-2 ${glassInput} text-base`}
              />
              <button
                onClick={addTask}
                disabled={!newTaskText.trim()}
                aria-label={t('taskAdd')}
                className="min-w-11 min-h-11 px-3 py-2 rounded-lg bg-primary text-white hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Plus size={18} />
              </button>
            </div>

            {/* Task list */}
            {tasks.length === 0 ? (
              <p className="text-sm text-faint text-center py-4">{t('taskEmpty')}</p>
            ) : (
              <ul className="space-y-2">
                {tasks.map(task => (
                  <li
                    key={task.id}
                    className={`flex items-center gap-3 p-3 rounded-lg border transition-colors cursor-pointer ${
                      task.id === activeTaskId
                        ? 'border-primary bg-primary-soft'
                        : 'border-line hover:bg-subtle'
                    } ${task.completed ? 'opacity-50' : ''}`}
                    onClick={() => !task.completed && setActiveTaskId(task.id === activeTaskId ? null : task.id)}
                  >
                    <button
                      onClick={e => { e.stopPropagation(); toggleTask(task.id) }}
                      role="checkbox"
                      aria-checked={task.completed}
                      aria-label={t('taskDone', { task: task.text })}
                      className={`flex-shrink-0 min-w-11 min-h-11 rounded border-2 flex items-center justify-center transition-colors ${
                        task.completed
                          ? 'bg-primary border-primary text-white'
                          : 'border-line-strong hover:border-primary'
                      }`}
                    >
                      {task.completed && <Check size={12} />}
                    </button>
                    {/* 행 클릭은 마우스용, 키보드는 이 버튼으로 현재 작업을 고른다 */}
                    <button
                      type="button"
                      onClick={e => { e.stopPropagation(); if (!task.completed) setActiveTaskId(task.id === activeTaskId ? null : task.id) }}
                      aria-pressed={task.id === activeTaskId}
                      className={`min-w-0 min-h-11 flex-1 break-words text-left cursor-pointer text-sm text-body ${task.completed ? 'line-through' : ''}`}
                    >
                      {task.text}
                    </button>
                    {/* Est pomodoros */}
                    <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                      <span className="text-xs text-faint">{task.completedPomodoros}/</span>
                      <input
                        type="number"
                        min={1}
                        max={99}
                        value={task.estimatedPomodoros}
                        onChange={e => updateTaskEstimate(task.id, parseInt(e.target.value) || 1)}
                        className="w-14 min-h-11 text-center text-base px-1 py-1 border border-line-strong rounded bg-field text-fg"
                        title={t('taskEstimate')}
                      />
                    </div>
                    <button
                      onClick={e => { e.stopPropagation(); deleteTask(task.id) }}
                      aria-label={t('taskDelete', { task: task.text })}
                      className="flex-shrink-0 min-w-11 min-h-11 p-2 text-faint hover:text-red-500"
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
      <div className={`${glassCard} ${glassInset} p-6`}>
        <h2 className="text-lg font-semibold text-fg mb-4">{t('statsTitle')}</h2>

        {/* Today + session stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <div className="bg-subtle rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-fg">{todayPomodoros}</div>
            <div className="text-xs text-muted mt-1">{t('statsTodayPomodoros')}</div>
          </div>
          <div className="bg-subtle rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-fg">{todayMinutes}</div>
            <div className="text-xs text-muted mt-1">{t('statsTodayMinutes')}</div>
          </div>
          <div className="bg-subtle rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-fg">{completedRounds}</div>
            <div className="text-xs text-muted mt-1">{t('statsSessionRounds')}</div>
          </div>
          <div className="bg-subtle rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-fg">{streak}</div>
            <div className="text-xs text-muted mt-1">{t('statsStreak')}</div>
          </div>
        </div>

        {/* Weekly chart */}
        <div>
          <h3 className="text-sm font-medium text-body mb-3">{t('statsWeeklyTitle')}</h3>
          <div className="flex items-end gap-2 h-32">
            {weekStats.map((stat, i) => {
              const barHeight = maxWeekCount > 0 ? (stat.count / maxWeekCount) * 100 : 0
              const isToday = mounted && stat.date === todayStr // 빌드 날짜 ≠ 방문 날짜 → 마운트 후에만 강조
              return (
                <div key={stat.date} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-xs text-muted font-mono">
                    {stat.count > 0 ? stat.count : ''}
                  </span>
                  <div className="w-full flex items-end" style={{ height: '80px' }}>
                    <div
                      className={`w-full rounded-t transition-all duration-300 ${
                        isToday
                          ? 'bg-primary'
                          : 'bg-line-strong'
                      }`}
                      style={{ height: `${Math.max(barHeight, 4)}%`, minHeight: '2px' }}
                    />
                  </div>
                  <span className={`text-xs ${isToday ? 'text-primary font-bold' : 'text-faint'}`}>
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
            ref={settingsRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="pomodoro-settings-title"
            className={`${glassCard} ${glassInset} w-full max-w-md p-6 space-y-5 max-h-[90vh] overflow-y-auto`}
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h2 id="pomodoro-settings-title" className="text-xl font-semibold text-fg">{t('settingsTitle')}</h2>
              <button onClick={() => setShowSettings(false)} aria-label={tc('close')} className="p-1 text-faint hover:text-sub">
                <X size={20} />
              </button>
            </div>

            {/* Time settings */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-sub uppercase tracking-wider">{t('settingsTimeSection')}</h3>

              <div>
                <label className="flex items-center justify-between text-sm font-medium text-body mb-1">
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
                <label className="flex items-center justify-between text-sm font-medium text-body mb-1">
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
                <label className="flex items-center justify-between text-sm font-medium text-body mb-1">
                  <span>{t('settingsLongBreak')}</span>
                  <span className="text-primary font-mono">{tempSettings.longBreakDuration}{t('settingsMin')}</span>
                </label>
                <input
                  type="range" min={1} max={60}
                  value={tempSettings.longBreakDuration}
                  onChange={e => setTempSettings(s => ({ ...s, longBreakDuration: Number(e.target.value) }))}
                  className="w-full accent-primary"
                />
              </div>

              <div>
                <label className="flex items-center justify-between text-sm font-medium text-body mb-1">
                  <span>{t('settingsLongBreakInterval')}</span>
                  <span className="font-mono">{tempSettings.longBreakInterval}</span>
                </label>
                <input
                  type="range" min={2} max={10}
                  value={tempSettings.longBreakInterval}
                  onChange={e => setTempSettings(s => ({ ...s, longBreakInterval: Number(e.target.value) }))}
                  className="w-full accent-primary"
                />
              </div>
            </div>

            {/* Notification settings */}
            <div className="space-y-4 border-t border-line pt-4">
              <h3 className="text-sm font-medium text-sub uppercase tracking-wider">{t('settingsNotifSection')}</h3>

              <div className="flex items-center justify-between">
                <span className="text-sm text-body">{t('settingsBrowserNotif')}</span>
                <div className="flex items-center gap-2">
                  {notificationPermission === 'denied' && (
                    <span className="text-xs text-red-500">{t('settingsNotifDenied')}</span>
                  )}
                  {notificationPermission === 'default' && (
                    <button
                      onClick={requestNotificationPermission}
                      className="text-xs px-2 py-1 rounded bg-soft text-sub hover:bg-subtle"
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
                      aria-label={t('settingsBrowserNotif')}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-line-strong rounded-full peer peer-checked:bg-primary peer-disabled:opacity-50 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-full" />
                  </label>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-body">{t('settingsSound')}</span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={tempSettings.soundEnabled}
                    onChange={e => setTempSettings(s => ({ ...s, soundEnabled: e.target.checked }))}
                    aria-label={t('settingsSound')}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-line-strong rounded-full peer peer-checked:bg-primary after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-full" />
                </label>
              </div>

              {tempSettings.soundEnabled && (
                <>
                  <div>
                    <label className="flex items-center justify-between text-sm text-body mb-1">
                      <span>{t('settingsVolume')}</span>
                      <span className="font-mono text-xs">{tempSettings.soundVolume}%</span>
                    </label>
                    <input
                      type="range" min={0} max={100}
                      value={tempSettings.soundVolume}
                      onChange={e => setTempSettings(s => ({ ...s, soundVolume: Number(e.target.value) }))}
                      aria-label={t('settingsVolume')}
                      className="w-full accent-primary"
                    />
                  </div>
                  <button
                    onClick={() => playPreviewSound(tempSettings.soundVolume)}
                    className="text-sm px-3 py-1.5 rounded-lg bg-soft hover:bg-subtle text-body"
                  >
                    {t('settingsPreview')}
                  </button>
                </>
              )}
            </div>

            {/* Auto start */}
            <div className="border-t border-line pt-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-body">{t('autoStart')}</span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={tempSettings.autoStart}
                    onChange={e => setTempSettings(s => ({ ...s, autoStart: e.target.checked }))}
                    aria-label={t('autoStart')}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-line-strong rounded-full peer peer-checked:bg-primary after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-full" />
                </label>
              </div>
            </div>

            {/* Buttons */}
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setShowSettings(false)}
                className="flex-1 px-4 py-2 rounded-lg bg-soft hover:bg-subtle text-body"
              >
                {t('cancel')}
              </button>
              <button
                onClick={handleSaveSettings}
                className="flex-1 px-4 py-2 rounded-lg bg-primary hover:bg-blue-700 text-white font-medium"
              >
                {t('save')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Guide */}
      <div className={`${glassCard} ${glassInset} p-6`}>
        <h2 className="text-xl font-semibold text-fg mb-4">{t('guideTitle')}</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="font-medium text-body mb-2">{t('guideHowTitle')}</h3>
            <ol className="space-y-2">
              {(t.raw('guideHowItems') as string[]).map((item, i) => (
                <li key={i} className="flex gap-2 text-sm text-sub">
                  <span className="flex-shrink-0 w-5 h-5 rounded-full bg-soft text-sub flex items-center justify-center text-xs font-bold">{i + 1}</span>
                  {item}
                </li>
              ))}
            </ol>
          </div>
          <div>
            <h3 className="font-medium text-body mb-2">{t('guideTipsTitle')}</h3>
            <ul className="space-y-2">
              {(t.raw('guideTipsItems') as string[]).map((item, i) => (
                <li key={i} className="flex gap-2 text-sm text-sub">
                  <span className="flex-shrink-0 text-faint mt-0.5">•</span>
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
