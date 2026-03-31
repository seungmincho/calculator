'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { RotateCcw, Play, Pause, Flag, Maximize2, Minimize2, Timer, Clock, Users } from 'lucide-react'
import GuideSection from '@/components/GuideSection'

type Mode = 'countdown' | 'stopwatch' | 'turnTimer'

interface LapEntry {
  index: number
  split: number
  total: number
}

interface Player {
  name: string
  active: boolean
}

const GLASS_CARD = 'bg-white/10 dark:bg-gray-900/20 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-2xl shadow-[inset_2px_2px_10px_rgba(255,255,255,0.15),inset_-2px_-2px_10px_rgba(255,255,255,0.05)] p-6'
const GLASS_BTN = 'bg-white/10 dark:bg-gray-900/20 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-xl px-4 py-2 text-white font-medium transition-all hover:bg-white/20 hover:shadow-[0_0_12px_rgba(255,255,255,0.2)] active:scale-95'
const DIGIT_BOX = 'bg-white/10 backdrop-blur-xl border border-white/20 rounded-xl px-3 py-4 min-w-[3rem] text-center select-none'

function padTwo(n: number) {
  return String(n).padStart(2, '0')
}

function splitTime(totalMs: number) {
  const totalSec = Math.floor(totalMs / 1000)
  const ms = Math.floor((totalMs % 1000) / 10)
  const h = Math.floor(totalSec / 3600)
  const m = Math.floor((totalSec % 3600) / 60)
  const s = totalSec % 60
  return { h, m, s, ms }
}

function DigitDisplay({ value, label, showMs = false }: { value: number; label?: string; showMs?: boolean }) {
  const digits = showMs ? String(value).padStart(2, '0') : padTwo(value)
  return (
    <div className="flex flex-col items-center gap-1">
      <div className={DIGIT_BOX}>
        <span className="text-4xl sm:text-6xl font-mono font-bold text-white tabular-nums">{digits}</span>
      </div>
      {label && <span className="text-xs text-white/50 uppercase tracking-widest">{label}</span>}
    </div>
  )
}

function Colon() {
  return <span className="text-3xl font-bold text-white/60 pb-4">:</span>
}

function ProgressRing({ progress, size = 200 }: { progress: number; size?: number }) {
  const r = (size - 16) / 2
  const circ = 2 * Math.PI * r
  const offset = circ * (1 - progress)
  return (
    <svg width={size} height={size} className="absolute inset-0 m-auto rotate-[-90deg]">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="8" />
      <circle
        cx={size / 2} cy={size / 2} r={r} fill="none"
        stroke="rgba(16,185,129,0.7)" strokeWidth="8"
        strokeLinecap="round"
        strokeDasharray={circ}
        strokeDashoffset={offset}
        style={{ transition: 'stroke-dashoffset 0.5s linear' }}
      />
    </svg>
  )
}

export default function GameTimer() {
  const t = useTranslations('gameTimer')
  const [mode, setMode] = useState<Mode>('countdown')
  const [isFullscreen, setIsFullscreen] = useState(false)

  // ── Countdown state ──
  const [cdHours, setCdHours] = useState(0)
  const [cdMinutes, setCdMinutes] = useState(5)
  const [cdSeconds, setCdSeconds] = useState(0)
  const [cdRunning, setCdRunning] = useState(false)
  const [cdRemaining, setCdRemaining] = useState<number | null>(null)
  const [cdTotal, setCdTotal] = useState(0)
  const [cdFlash, setCdFlash] = useState(false)

  // ── Stopwatch state ──
  const [swRunning, setSwRunning] = useState(false)
  const [swElapsed, setSwElapsed] = useState(0)
  const [swLaps, setSwLaps] = useState<LapEntry[]>([])
  const swLastLap = useRef(0)

  // ── Turn Timer state ──
  const [ttRunning, setTtRunning] = useState(false)
  const [ttTurnSec, setTtTurnSec] = useState(60)
  const [ttRemaining, setTtRemaining] = useState(60)
  const [ttCurrentPlayer, setTtCurrentPlayer] = useState(0)
  const [players, setPlayers] = useState<Player[]>([
    { name: 'Player 1', active: true },
    { name: 'Player 2', active: false },
  ])

  // Refs for intervals
  const cdIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const swIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const ttIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const audioCtxRef = useRef<AudioContext | null>(null)

  // ── Cleanup on unmount ──
  useEffect(() => {
    return () => {
      cdIntervalRef.current && clearInterval(cdIntervalRef.current)
      swIntervalRef.current && clearInterval(swIntervalRef.current)
      ttIntervalRef.current && clearInterval(ttIntervalRef.current)
      audioCtxRef.current?.close().catch(() => {})
    }
  }, [])

  // ── Audio: beep alert ──
  const playBeep = useCallback((urgent = false) => {
    try {
      if (!audioCtxRef.current) audioCtxRef.current = new AudioContext()
      const ctx = audioCtxRef.current
      if (ctx.state === 'suspended') ctx.resume()
      const freqs = urgent ? [880, 1100, 880, 1100] : [660, 880]
      freqs.forEach((freq, i) => {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.connect(gain)
        gain.connect(ctx.destination)
        osc.frequency.value = freq
        osc.type = 'sine'
        const start = ctx.currentTime + i * 0.18
        gain.gain.setValueAtTime(0.35, start)
        gain.gain.exponentialRampToValueAtTime(0.001, start + 0.15)
        osc.start(start)
        osc.stop(start + 0.15)
      })
    } catch {}
  }, [])

  const playTick = useCallback(() => {
    try {
      if (!audioCtxRef.current) audioCtxRef.current = new AudioContext()
      const ctx = audioCtxRef.current
      if (ctx.state === 'suspended') ctx.resume()
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.frequency.value = 1200
      osc.type = 'square'
      gain.gain.setValueAtTime(0.08, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05)
      osc.start(ctx.currentTime)
      osc.stop(ctx.currentTime + 0.05)
    } catch {}
  }, [])

  // ── Countdown controls ──
  const cdTotalSec = cdHours * 3600 + cdMinutes * 60 + cdSeconds

  const startCountdown = useCallback(() => {
    const total = cdRemaining !== null ? cdRemaining : cdTotalSec * 1000
    if (total <= 0) return
    if (cdRemaining === null) setCdTotal(cdTotalSec * 1000)
    setCdRemaining(total)
    setCdRunning(true)
    let remaining = total
    cdIntervalRef.current = setInterval(() => {
      remaining -= 100
      if (remaining <= 0) {
        remaining = 0
        setCdRemaining(0)
        setCdRunning(false)
        clearInterval(cdIntervalRef.current!)
        playBeep(true)
        setCdFlash(true)
        setTimeout(() => setCdFlash(false), 2000)
      } else {
        if (remaining <= 5000 && remaining % 1000 < 100) playTick()
        setCdRemaining(remaining)
      }
    }, 100)
  }, [cdRemaining, cdTotalSec, playBeep, playTick])

  const pauseCountdown = useCallback(() => {
    setCdRunning(false)
    cdIntervalRef.current && clearInterval(cdIntervalRef.current)
  }, [])

  const resetCountdown = useCallback(() => {
    setCdRunning(false)
    cdIntervalRef.current && clearInterval(cdIntervalRef.current)
    setCdRemaining(null)
    setCdFlash(false)
  }, [])

  const applyPreset = useCallback((totalSec: number) => {
    resetCountdown()
    setCdHours(Math.floor(totalSec / 3600))
    setCdMinutes(Math.floor((totalSec % 3600) / 60))
    setCdSeconds(totalSec % 60)
  }, [resetCountdown])

  const displayMs = cdRemaining !== null ? cdRemaining : cdTotalSec * 1000
  const displayTime = splitTime(displayMs)
  const cdProgress = cdTotal > 0 ? displayMs / cdTotal : 1

  // ── Stopwatch controls ──
  const startStopwatch = useCallback(() => {
    setSwRunning(true)
    swIntervalRef.current = setInterval(() => {
      setSwElapsed(prev => prev + 10)
    }, 10)
  }, [])

  const stopStopwatch = useCallback(() => {
    setSwRunning(false)
    swIntervalRef.current && clearInterval(swIntervalRef.current)
  }, [])

  const resetStopwatch = useCallback(() => {
    setSwRunning(false)
    swIntervalRef.current && clearInterval(swIntervalRef.current)
    setSwElapsed(0)
    setSwLaps([])
    swLastLap.current = 0
  }, [])

  const addLap = useCallback(() => {
    const split = swElapsed - swLastLap.current
    swLastLap.current = swElapsed
    setSwLaps(prev => [...prev, { index: prev.length + 1, split, total: swElapsed }])
    playTick()
  }, [swElapsed, playTick])

  const swTime = splitTime(swElapsed)
  const bestLap = swLaps.length > 1 ? Math.min(...swLaps.map(l => l.split)) : null
  const worstLap = swLaps.length > 1 ? Math.max(...swLaps.map(l => l.split)) : null

  // ── Turn Timer controls ──
  const advancePlayer = useCallback((current: number, count: number) => {
    const next = (current + 1) % count
    setTtCurrentPlayer(next)
    setPlayers(prev => prev.map((p, i) => ({ ...p, active: i === next })))
    setTtRemaining(ttTurnSec)
    playBeep()
  }, [ttTurnSec, playBeep])

  const startTurnTimer = useCallback(() => {
    setTtRunning(true)
    ttIntervalRef.current = setInterval(() => {
      setTtRemaining(prev => {
        if (prev <= 1) {
          setTtCurrentPlayer(cur => {
            const next = (cur + 1) % players.length
            setPlayers(p => p.map((pl, i) => ({ ...pl, active: i === next })))
            return next
          })
          playBeep(true)
          return ttTurnSec
        }
        if (prev <= 4) playTick()
        return prev - 1
      })
    }, 1000)
  }, [players.length, ttTurnSec, playBeep, playTick])

  const pauseTurnTimer = useCallback(() => {
    setTtRunning(false)
    ttIntervalRef.current && clearInterval(ttIntervalRef.current)
  }, [])

  const resetTurnTimer = useCallback(() => {
    setTtRunning(false)
    ttIntervalRef.current && clearInterval(ttIntervalRef.current)
    setTtCurrentPlayer(0)
    setTtRemaining(ttTurnSec)
    setPlayers(prev => prev.map((p, i) => ({ ...p, active: i === 0 })))
  }, [ttTurnSec])

  const addPlayer = useCallback(() => {
    if (players.length >= 8) return
    setPlayers(prev => [...prev, { name: `Player ${prev.length + 1}`, active: false }])
  }, [players.length])

  const removePlayer = useCallback((idx: number) => {
    if (players.length <= 2) return
    setPlayers(prev => prev.filter((_, i) => i !== idx).map((p, i) => ({ ...p, active: i === 0 })))
    setTtCurrentPlayer(0)
  }, [players.length])

  const PRESETS = [
    { label: t('preset1m'), sec: 60 },
    { label: t('preset3m'), sec: 180 },
    { label: t('preset5m'), sec: 300 },
    { label: t('preset10m'), sec: 600 },
    { label: t('preset15m'), sec: 900 },
    { label: t('preset30m'), sec: 1800 },
    { label: t('preset1h'), sec: 3600 },
  ]

  const containerClass = isFullscreen
    ? 'fixed inset-0 z-50 flex flex-col items-center justify-center bg-gradient-to-br from-emerald-900/90 via-green-900/80 to-teal-900/90 backdrop-blur-2xl p-8'
    : ''

  return (
    <div className={containerClass}>
      <div className="relative min-h-[600px] w-full max-w-3xl mx-auto">
        {/* Background gradient blob */}
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/20 via-green-500/10 to-teal-500/20 dark:from-emerald-900/30 dark:via-green-900/20 dark:to-teal-900/30 rounded-3xl" />

        {cdFlash && (
          <div className="absolute inset-0 rounded-3xl animate-pulse bg-red-500/30 z-20 pointer-events-none" />
        )}

        <div className="relative z-10 p-4 sm:p-6 space-y-5">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-white">{t('title')}</h2>
              <p className="text-sm text-white/60 mt-0.5">{t('description')}</p>
            </div>
            <button
              onClick={() => setIsFullscreen(f => !f)}
              className={GLASS_BTN + ' p-2 px-3'}
              aria-label={isFullscreen ? t('exitFullscreen') : t('fullscreen')}
            >
              {isFullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
            </button>
          </div>

          {/* Mode tabs */}
          <div className="flex gap-2">
            {([['countdown', <Timer key="t" size={15} />, t('countdown')], ['stopwatch', <Clock key="c" size={15} />, t('stopwatch')], ['turnTimer', <Users key="u" size={15} />, t('turnTimer')]] as const).map(([m, icon, label]) => (
              <button
                key={m}
                onClick={() => setMode(m as Mode)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-all border ${mode === m ? 'bg-white/20 border-white/30 text-white shadow-[0_0_12px_rgba(255,255,255,0.15)]' : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10 hover:text-white/80'}`}
              >
                {icon}{label}
              </button>
            ))}
          </div>

          {/* ── COUNTDOWN ── */}
          {mode === 'countdown' && (
            <div className={GLASS_CARD + ' space-y-6'}>
              {/* Progress ring + time display */}
              <div className="flex justify-center">
                <div className="relative w-48 h-48 flex items-center justify-center">
                  <ProgressRing progress={cdProgress} size={192} />
                  <div className="flex items-center gap-1 z-10">
                    {displayTime.h > 0 && <><DigitDisplay value={displayTime.h} /><Colon /></>}
                    <DigitDisplay value={displayTime.m} label={t('minutes')} />
                    <Colon />
                    <DigitDisplay value={displayTime.s} label={t('seconds')} />
                  </div>
                </div>
              </div>

              {/* Set time (only when not running) */}
              {!cdRunning && cdRemaining === null && (
                <div className="flex items-center justify-center gap-3">
                  <div className="flex flex-col items-center gap-1">
                    <span className="text-white/50 text-xs">{t('hours')}</span>
                    <input type="number" min={0} max={23} value={cdHours}
                      onChange={e => setCdHours(Math.max(0, Math.min(23, +e.target.value)))}
                      className="w-16 text-center text-white bg-white/10 border border-white/20 rounded-lg py-2 text-lg font-mono focus:outline-none focus:ring-2 focus:ring-emerald-400/50" />
                  </div>
                  <span className="text-white/50 text-2xl pb-1">:</span>
                  <div className="flex flex-col items-center gap-1">
                    <span className="text-white/50 text-xs">{t('minutes')}</span>
                    <input type="number" min={0} max={59} value={cdMinutes}
                      onChange={e => setCdMinutes(Math.max(0, Math.min(59, +e.target.value)))}
                      className="w-16 text-center text-white bg-white/10 border border-white/20 rounded-lg py-2 text-lg font-mono focus:outline-none focus:ring-2 focus:ring-emerald-400/50" />
                  </div>
                  <span className="text-white/50 text-2xl pb-1">:</span>
                  <div className="flex flex-col items-center gap-1">
                    <span className="text-white/50 text-xs">{t('seconds')}</span>
                    <input type="number" min={0} max={59} value={cdSeconds}
                      onChange={e => setCdSeconds(Math.max(0, Math.min(59, +e.target.value)))}
                      className="w-16 text-center text-white bg-white/10 border border-white/20 rounded-lg py-2 text-lg font-mono focus:outline-none focus:ring-2 focus:ring-emerald-400/50" />
                  </div>
                </div>
              )}

              {/* Presets */}
              {!cdRunning && cdRemaining === null && (
                <div className="flex flex-wrap gap-2 justify-center">
                  {PRESETS.map(p => (
                    <button key={p.sec} onClick={() => applyPreset(p.sec)} className={GLASS_BTN + ' text-sm py-1.5 px-3'}>
                      {p.label}
                    </button>
                  ))}
                </div>
              )}

              {/* Controls */}
              <div className="flex gap-3 justify-center">
                {!cdRunning ? (
                  <button onClick={startCountdown} disabled={cdTotalSec === 0 && cdRemaining === null}
                    className={GLASS_BTN + ' flex items-center gap-2 bg-emerald-500/20 hover:bg-emerald-500/30'}>
                    <Play size={16} /> {cdRemaining !== null ? t('resume') : t('start')}
                  </button>
                ) : (
                  <button onClick={pauseCountdown} className={GLASS_BTN + ' flex items-center gap-2'}>
                    <Pause size={16} /> {t('pause')}
                  </button>
                )}
                <button onClick={resetCountdown} className={GLASS_BTN + ' flex items-center gap-2'}>
                  <RotateCcw size={16} /> {t('reset')}
                </button>
              </div>

              {cdRemaining === 0 && (
                <div className="text-center text-2xl font-bold text-red-300 animate-bounce">{t('timeUp')}</div>
              )}
            </div>
          )}

          {/* ── STOPWATCH ── */}
          {mode === 'stopwatch' && (
            <div className={GLASS_CARD + ' space-y-5'}>
              {/* Display */}
              <div className="flex items-center justify-center gap-2">
                {swTime.h > 0 && <><DigitDisplay value={swTime.h} /><Colon /></>}
                <DigitDisplay value={swTime.m} label={t('minutes')} />
                <Colon />
                <DigitDisplay value={swTime.s} label={t('seconds')} />
                <Colon />
                <DigitDisplay value={swTime.ms} showMs label="ms" />
              </div>

              {/* Controls */}
              <div className="flex gap-3 justify-center">
                {!swRunning ? (
                  <button onClick={startStopwatch} className={GLASS_BTN + ' flex items-center gap-2 bg-emerald-500/20 hover:bg-emerald-500/30'}>
                    <Play size={16} /> {swElapsed > 0 ? t('resume') : t('start')}
                  </button>
                ) : (
                  <>
                    <button onClick={stopStopwatch} className={GLASS_BTN + ' flex items-center gap-2'}>
                      <Pause size={16} /> {t('stop')}
                    </button>
                    <button onClick={addLap} className={GLASS_BTN + ' flex items-center gap-2'}>
                      <Flag size={16} /> {t('lap')}
                    </button>
                  </>
                )}
                <button onClick={resetStopwatch} className={GLASS_BTN + ' flex items-center gap-2'}>
                  <RotateCcw size={16} /> {t('reset')}
                </button>
              </div>

              {/* Lap list */}
              {swLaps.length > 0 && (
                <div className="space-y-1 max-h-48 overflow-y-auto pr-1">
                  <div className="flex justify-between text-xs text-white/50 px-2 mb-1">
                    <span>{t('laps')}</span>
                    <span className="flex gap-6">
                      <span>{t('lap')}</span>
                      <span>Total</span>
                    </span>
                  </div>
                  {[...swLaps].reverse().map(lap => {
                    const isBest = bestLap !== null && lap.split === bestLap
                    const isWorst = worstLap !== null && lap.split === worstLap
                    const { m, s, ms } = splitTime(lap.split)
                    const { m: tm, s: ts, ms: tms } = splitTime(lap.total)
                    return (
                      <div key={lap.index}
                        className={`flex justify-between items-center px-3 py-1.5 rounded-lg text-sm ${isBest ? 'bg-emerald-500/20 text-emerald-300' : isWorst ? 'bg-red-500/20 text-red-300' : 'bg-white/5 text-white/80'}`}>
                        <span className="font-medium">#{lap.index} {isBest ? `· ${t('bestLap')}` : isWorst ? `· ${t('worstLap')}` : ''}</span>
                        <span className="flex gap-6 font-mono text-xs">
                          <span>{padTwo(m)}:{padTwo(s)}.{padTwo(ms)}</span>
                          <span className="text-white/40">{padTwo(tm)}:{padTwo(ts)}.{padTwo(tms)}</span>
                        </span>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* ── TURN TIMER ── */}
          {mode === 'turnTimer' && (
            <div className={GLASS_CARD + ' space-y-5'}>
              {/* Current player + time */}
              <div className="text-center space-y-2">
                <div className="text-white/60 text-sm">{t('currentPlayer')}</div>
                <div className="text-2xl font-bold text-emerald-300">{players[ttCurrentPlayer]?.name}</div>
                <div className="flex items-center justify-center gap-2 mt-2">
                  <DigitDisplay value={Math.floor(ttRemaining / 60)} label={t('minutes')} />
                  <Colon />
                  <DigitDisplay value={ttRemaining % 60} label={t('seconds')} />
                </div>
              </div>

              {/* Players grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {players.map((p, i) => (
                  <div key={i} className={`rounded-xl p-2 border text-center transition-all ${p.active ? 'bg-emerald-500/20 border-emerald-400/40 shadow-[0_0_12px_rgba(16,185,129,0.3)]' : 'bg-white/5 border-white/10'}`}>
                    <input value={p.name} onChange={e => setPlayers(prev => prev.map((pl, idx) => idx === i ? { ...pl, name: e.target.value } : pl))}
                      className="w-full text-center bg-transparent text-white text-sm font-medium focus:outline-none" />
                    {players.length > 2 && (
                      <button onClick={() => removePlayer(i)} className="text-white/30 hover:text-red-400 text-xs mt-0.5">×</button>
                    )}
                  </div>
                ))}
                {players.length < 8 && (
                  <button onClick={addPlayer} className="rounded-xl p-2 border border-dashed border-white/20 text-white/40 hover:text-white/70 hover:border-white/40 text-sm transition-all">
                    + {t('addPlayer')}
                  </button>
                )}
              </div>

              {/* Turn time setting */}
              {!ttRunning && (
                <div className="flex items-center justify-center gap-3">
                  <span className="text-white/60 text-sm">{t('perTurn')}:</span>
                  <div className="flex items-center gap-2">
                    {[15, 30, 60, 90, 120].map(sec => (
                      <button key={sec} onClick={() => { setTtTurnSec(sec); setTtRemaining(sec) }}
                        className={`px-3 py-1.5 rounded-lg text-sm border transition-all ${ttTurnSec === sec ? 'bg-white/20 border-white/30 text-white' : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10'}`}>
                        {sec}s
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Controls */}
              <div className="flex gap-3 justify-center">
                {!ttRunning ? (
                  <button onClick={startTurnTimer} className={GLASS_BTN + ' flex items-center gap-2 bg-emerald-500/20 hover:bg-emerald-500/30'}>
                    <Play size={16} /> {t('start')}
                  </button>
                ) : (
                  <button onClick={pauseTurnTimer} className={GLASS_BTN + ' flex items-center gap-2'}>
                    <Pause size={16} /> {t('pause')}
                  </button>
                )}
                <button onClick={resetTurnTimer} className={GLASS_BTN + ' flex items-center gap-2'}>
                  <RotateCcw size={16} /> {t('reset')}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {!isFullscreen && <GuideSection namespace="gameTimer" />}
    </div>
  )
}
