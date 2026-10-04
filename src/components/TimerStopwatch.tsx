'use client'

import { useState, useRef, useEffect, useCallback, useId } from 'react'
import Link from 'next/link'
import { useTranslations } from '@/lib/i18n'
import '@/lib/i18n/ns/timer'
import { Play, Pause, RotateCcw, Flag, Plus, Maximize, Minimize, BellOff, Copy, Check, Volume2, Bell } from 'lucide-react'
import GuideSection from '@/components/GuideSection'
import * as T from '@/utils/timer'

type Mode = 'timer' | 'stopwatch'
const MODES: Mode[] = ['timer', 'stopwatch']
const PRESETS = [1, 3, 5, 10, 15, 30]
const STORE = 'timer_settings_v2'
const ALARM_EVERY = 2500
const ALARM_MAX = 3 * 60_000 // ponytail: 반복 알림은 3분 뒤 자동 중지 — 자리를 비운 사이 끝없이 울리지 않게
const R = 108
const C = 2 * Math.PI * R

interface Settings { mode: Mode; h: string; m: string; s: string; sound: boolean; repeat: boolean; vibrate: boolean; wake: boolean }
const DEFAULTS: Settings = { mode: 'timer', h: '0', m: '5', s: '0', sound: true, repeat: true, vibrate: true, wake: true }

const softBtn = 'inline-flex items-center justify-center gap-2 rounded-xl bg-soft hover:bg-subtle text-body font-semibold transition-colors disabled:opacity-45 disabled:pointer-events-none'

export default function TimerStopwatch() {
  const t = useTranslations('timer')
  const uid = useId()
  const [cfg, setCfg] = useState<Settings>(DEFAULTS)
  const set = <K extends keyof Settings>(k: K, v: Settings[K]) => setCfg((c) => ({ ...c, [k]: v }))
  const mode = cfg.mode
  const [cd, setCd] = useState<T.Countdown>(T.IDLE)
  const [sw, setSw] = useState<T.Stopwatch>(T.SW_IDLE)
  const [now, setNow] = useState(0)
  const [ringing, setRinging] = useState(false)
  const [big, setBig] = useState(false)
  const [msg, setMsg] = useState('')
  const [err, setErr] = useState('')
  const [fromLink, setFromLink] = useState<number | null>(null)
  const [copied, setCopied] = useState<'' | 'link' | 'csv'>('')
  const [support, setSupport] = useState({ wake: false, notify: false, vibrate: false })
  const [perm, setPerm] = useState<NotificationPermission>('default')
  const [wakeOn, setWakeOn] = useState(false)
  const loaded = useRef(false)
  const audioRef = useRef<AudioContext | null>(null)
  const oneMinRef = useRef(false)
  const fsBtnRef = useRef<HTMLButtonElement>(null)
  const minRef = useRef<HTMLInputElement>(null)
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([])
  const origTitle = useRef('')
  const wasBig = useRef(false)

  // ── 설정 저장 / 불러오기 (URL > localStorage > 기본값). 저장 effect가 먼저 선언돼야 첫 렌더의 기본값으로 덮어쓰지 않음 ──
  useEffect(() => {
    if (loaded.current) try { localStorage.setItem(STORE, JSON.stringify(cfg)) } catch { /* 사파리 사생활 모드 */ }
  }, [cfg])
  useEffect(() => {
    let saved: Partial<Settings> = {}
    try { saved = JSON.parse(localStorage.getItem(STORE) || '{}') } catch { /* 없음 */ }
    const next: Settings = { ...DEFAULTS, ...saved }
    const q = T.parseQuery(window.location.search)
    if (q.mode) next.mode = q.mode
    if (q.sec !== null) {
      const { h, m, s } = T.splitSec(q.sec)
      Object.assign(next, { h: String(h), m: String(m), s: String(s) })
      setFromLink(q.sec)
    }
    setCfg(next)
    setSupport({ wake: 'wakeLock' in navigator, notify: 'Notification' in window, vibrate: 'vibrate' in navigator })
    if ('Notification' in window) setPerm(Notification.permission)
    origTitle.current = document.title
    loaded.current = true
    return () => { if (origTitle.current) document.title = origTitle.current }
  }, [])

  const inputSec = T.hmsToSec(cfg.h, cfg.m, cfg.s)
  const cdRunning = cd.status === 'running'
  const swRunning = sw.startAt !== null
  const leftMs = T.left(cd, now)
  const swMs = T.elapsed(sw, now)

  const human = (ms: number) => {
    const { h, m, s } = T.splitSec(Math.ceil(Math.max(0, ms) / 1000))
    return [h && t('unit.h', { n: h }), m && t('unit.m', { n: m }), (s || (!h && !m)) && t('unit.s', { n: s })].filter(Boolean).join(' ')
  }

  // ── 소리: 사용자가 누른 순간 AudioContext를 만들어 둬야 나중에(자동 재생 정책) 울림 ──
  const unlockAudio = () => {
    try {
      audioRef.current ??= new AudioContext()
      if (audioRef.current.state === 'suspended') audioRef.current.resume().catch(() => {})
    } catch { /* Web Audio 미지원 */ }
  }
  const beep = useCallback(() => {
    const ctx = audioRef.current
    if (!ctx) return
    try {
      if (ctx.state === 'suspended') ctx.resume().catch(() => {})
      ;[0, 0.25, 0.5].forEach((d) => {
        const t0 = ctx.currentTime + d
        const osc = ctx.createOscillator()
        const g = ctx.createGain()
        osc.connect(g)
        g.connect(ctx.destination)
        osc.type = 'sine'
        osc.frequency.setValueAtTime(880, t0)
        g.gain.setValueAtTime(0, t0)
        g.gain.linearRampToValueAtTime(0.35, t0 + 0.01)
        g.gain.linearRampToValueAtTime(0, t0 + 0.18)
        osc.start(t0)
        osc.stop(t0 + 0.2)
      })
    } catch { /* 무시 */ }
  }, [])

  // ── 타이머 조작 ──
  const startTimer = (sec = inputSec) => {
    if (sec < 1) { setErr(t('countdown.zeroError')); minRef.current?.focus(); return }
    unlockAudio()
    setErr('')
    setRinging(false)
    setFromLink(null)
    const n = Date.now()
    oneMinRef.current = sec <= 60
    setCd(T.start(sec * 1000, n))
    setNow(n)
    setMsg(t('announce.started', { time: human(sec * 1000) }))
  }
  const preset = (min: number) => {
    setCfg((c) => ({ ...c, h: '0', m: String(min), s: '0' }))
    startTimer(min * 60)
  }
  const stopAlarm = () => setRinging(false)
  const toggleTimer = () => {
    const n = Date.now()
    if (cd.status === 'running') {
      const p = T.pause(cd, n)
      setCd(p)
      setMsg(t('announce.paused', { time: human(p.leftMs) }))
    } else if (cd.status === 'paused') {
      unlockAudio()
      setCd(T.resume(cd, n))
      setNow(n)
      setMsg(t('announce.resumed'))
    } else if (ringing) stopAlarm()
    else startTimer()
  }
  const resetTimer = () => {
    setCd(T.IDLE)
    setRinging(false)
    setMsg(t('announce.reset'))
  }
  const addMinute = () => {
    const n = Date.now()
    if (cd.status === 'idle') {
      const { h, m, s } = T.splitSec(Math.min(T.MAX_SEC, inputSec + 60))
      setCfg((c) => ({ ...c, h: String(h), m: String(m), s: String(s) }))
      return
    }
    if (cd.status === 'done') unlockAudio()
    const next = T.addTime(cd, 60_000, n)
    if (T.left(next, n) > 60_000) oneMinRef.current = false
    setCd(next)
    setNow(n)
    setRinging(false)
    setMsg(t('announce.added', { time: human(T.left(next, n)) }))
  }

  const finish = () => {
    setCd((c) => (c.status === 'running' ? { ...c, status: 'done', leftMs: 0 } : c))
    setRinging(true)
    set('mode', 'timer')
    if (perm === 'granted' && document.visibilityState !== 'visible') {
      const title = t('notification.title')
      const opts = { body: t('notification.body', { time: human(cd.durationMs) }), tag: 'toolhub-timer' }
      try { new Notification(title, opts) } catch { navigator.serviceWorker?.ready.then((r) => r.showNotification(title, opts)).catch(() => {}) } // 안드로이드 크롬은 SW 경유만 허용
    }
  }

  // ── 스톱워치 조작 ──
  const toggleSw = () => {
    unlockAudio()
    const n = Date.now()
    const next = T.swToggle(sw, n)
    setSw(next)
    setNow(n)
    setMsg(next.startAt === null ? t('announce.swStopped', { time: T.formatClock(T.elapsed(next, n), { cs: true }) }) : t('announce.swStarted'))
  }
  const lap = () => {
    if (sw.startAt === null) return
    const n = Date.now()
    const next = T.swLap(sw, n)
    setSw(next)
    setNow(n)
    setMsg(t('stopwatch.lapRecorded', { n: next.laps.length, time: T.formatClock(T.lapStats(next.laps).splits.at(-1) ?? 0, { cs: true }) }))
  }
  const resetSw = () => {
    setSw(T.SW_IDLE)
    setMsg(t('announce.reset'))
  }

  // ── 틱: 화면 갱신만 담당. 남은/경과 시간은 항상 기준 시각으로 계산 → 틱이 늦어도 오차 없음 ──
  useEffect(() => {
    if (!cdRunning && !swRunning) return
    const tick = () => setNow(Date.now())
    tick()
    const id = setInterval(tick, swRunning && mode === 'stopwatch' ? 50 : 250)
    document.addEventListener('visibilitychange', tick)
    return () => { clearInterval(id); document.removeEventListener('visibilitychange', tick) }
  }, [cdRunning, swRunning, mode])

  // 끝나는 시각에 맞춘 단발 타임아웃: 백그라운드 탭의 반복 타이머는 크롬에서 최대 1분까지 지연되지만 단발은 ~1초 이내
  useEffect(() => {
    if (cd.status !== 'running') return
    const id = setTimeout(() => setNow(Date.now()), Math.max(0, cd.endAt - Date.now()) + 20)
    return () => clearTimeout(id)
  }, [cd])

  useEffect(() => {
    if (cd.status !== 'running') return
    if (leftMs <= 0) finish()
    else if (leftMs <= 60_000 && !oneMinRef.current) {
      oneMinRef.current = true
      setMsg(t('announce.oneMinute'))
    }
  }) // 매 렌더 확인 (finish가 최신 상태를 보도록)

  // ── 알림: 소리·진동 반복, 끄기 ──
  useEffect(() => {
    if (!ringing) return
    const ring = () => {
      if (cfg.sound) beep()
      if (cfg.vibrate) navigator.vibrate?.([300, 150, 300, 150, 300])
    }
    ring()
    const id = cfg.repeat ? setInterval(ring, ALARM_EVERY) : undefined
    const stop = setTimeout(() => setRinging(false), cfg.repeat ? ALARM_MAX : 1500)
    return () => { clearInterval(id); clearTimeout(stop); navigator.vibrate?.(0) }
  }, [ringing, cfg.sound, cfg.vibrate, cfg.repeat, beep])

  // ── 문서 제목에 남은 시간 ──
  const titleText = ringing
    ? t('countdown.finished')
    : cd.status === 'running' || cd.status === 'paused'
      ? `${T.formatClock(leftMs, { down: true })} · ${t('modes.timer')}`
      : swRunning ? `${T.formatClock(swMs)} · ${t('modes.stopwatch')}` : ''
  useEffect(() => {
    if (origTitle.current) document.title = titleText || origTitle.current
  }, [titleText])

  // ── 화면 꺼짐 방지 ──
  const active = cdRunning || swRunning
  useEffect(() => {
    if (!active || !cfg.wake || !('wakeLock' in navigator)) return
    let lock: WakeLockSentinel | null = null
    let dead = false
    const req = async () => {
      if (document.visibilityState !== 'visible' || (lock && !lock.released)) return
      try {
        lock = await navigator.wakeLock.request('screen')
        if (dead) { lock.release().catch(() => {}); return }
        setWakeOn(true)
        lock.addEventListener('release', () => setWakeOn(false))
      } catch { /* 저전력 모드 등 */ }
    }
    req()
    document.addEventListener('visibilitychange', req)
    return () => {
      dead = true
      document.removeEventListener('visibilitychange', req)
      lock?.release().catch(() => {})
      setWakeOn(false)
    }
  }, [active, cfg.wake])

  // ── 전체화면 (iPhone 등 미지원이면 화면 덮기만) ──
  const enterBig = () => {
    setBig(true)
    document.documentElement.requestFullscreen?.().catch(() => {})
  }
  const exitBig = () => {
    setBig(false)
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {})
  }
  useEffect(() => {
    const f = () => { if (!document.fullscreenElement) setBig(false) }
    document.addEventListener('fullscreenchange', f)
    return () => document.removeEventListener('fullscreenchange', f)
  }, [])
  useEffect(() => {
    if (wasBig.current && !big) fsBtnRef.current?.focus()
    wasBig.current = big
  }, [big])
  const trapFocus = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'Tab') return
    const f = e.currentTarget.querySelectorAll<HTMLElement>('button:not([disabled])')
    if (!f.length) return
    const first = f[0], last = f[f.length - 1]
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus() }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus() }
  }

  // ── 단축키 (e.code → 한글 입력 상태에서도 동작). 입력란에선 끔, 버튼 위 Space는 브라우저 기본 동작에 맡김 ──
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey || e.isComposing) return
      const el = e.target instanceof Element ? e.target : null
      if (el?.closest('input, textarea, select, [contenteditable="true"]')) return
      switch (e.code) {
        case 'Space':
          if (el?.closest('button, a, [role="tab"]')) return
          e.preventDefault()
          if (mode === 'timer') toggleTimer(); else toggleSw()
          break
        case 'KeyR': if (mode === 'timer') resetTimer(); else resetSw(); break
        case 'KeyF': if (big) exitBig(); else enterBig(); break
        case 'KeyL': if (mode === 'stopwatch') lap(); break
        case 'Escape': if (ringing) stopAlarm(); else if (big) exitBig(); break
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }) // 매 렌더 재등록 → 항상 최신 상태

  // ── 탭 ──
  const onTabKey = (e: React.KeyboardEvent, i: number) => {
    const j = e.key === 'ArrowRight' ? (i + 1) % MODES.length : e.key === 'ArrowLeft' ? (i - 1 + MODES.length) % MODES.length : e.key === 'Home' ? 0 : e.key === 'End' ? MODES.length - 1 : -1
    if (j < 0) return
    e.preventDefault()
    set('mode', MODES[j])
    tabRefs.current[j]?.focus()
  }

  // ── 복사 ──
  const copy = async (text: string, id: 'link' | 'csv') => {
    try {
      if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(text)
      else {
        const ta = document.createElement('textarea')
        ta.value = text
        ta.style.position = 'fixed'
        ta.style.left = '-999999px'
        document.body.appendChild(ta)
        ta.select()
        document.execCommand('copy')
        document.body.removeChild(ta)
      }
    } catch { /* 무시 */ }
    setCopied(id)
    setMsg(t('share.copied'))
    setTimeout(() => setCopied(''), 2000)
  }
  const shareSec = cd.status === 'idle' ? inputSec : Math.round(cd.durationMs / 1000)
  const shareUrl = () => `${window.location.origin}/timer/?${T.shareQuery(shareSec)}`
  const askNotify = async () => {
    unlockAudio()
    try { setPerm(await Notification.requestPermission()) } catch { /* 미지원 */ }
  }

  // ── 표시 값 ──
  const timerMs = cd.status === 'idle' ? inputSec * 1000 : leftMs
  const frac = cd.status === 'idle' ? 1 : cd.status === 'done' || !cd.durationMs ? 0 : leftMs / cd.durationMs
  const clock = mode === 'timer' ? T.formatClock(timerMs, { down: true }) : T.formatClock(swMs, { cs: true })
  const stats = T.lapStats(sw.laps)
  const lastLap = sw.laps.at(-1) ?? 0
  const endClock = cdRunning ? new Date(cd.endAt).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }) : ''
  const pulse = ringing ? 'motion-safe:animate-pulse' : ''

  const primaryLabel = mode === 'timer'
    ? cd.status === 'running' ? t('countdown.pause') : cd.status === 'paused' ? t('countdown.resume') : ringing ? t('countdown.dismiss') : t('countdown.start')
    : swRunning ? t('stopwatch.stop') : t('stopwatch.start')
  const PrimaryIcon = mode === 'timer' ? (cdRunning ? Pause : ringing ? BellOff : Play) : swRunning ? Pause : Play

  const controls = (inBig: boolean) => {
    const h = inBig ? 'min-h-14 px-6 text-lg' : 'min-h-12 px-5'
    return (
      <div className="flex flex-wrap justify-center gap-3">
        <button type="button" onClick={mode === 'timer' ? toggleTimer : toggleSw} autoFocus={inBig} className={`ui-btn ${h} min-w-36`}>
          <PrimaryIcon className="w-5 h-5" aria-hidden="true" />
          {primaryLabel}
        </button>
        {mode === 'timer' ? (
          <button type="button" onClick={addMinute} className={`ui-btn-soft ${h}`}>
            <Plus className="w-5 h-5" aria-hidden="true" />
            {t('countdown.addMinute')}
          </button>
        ) : (
          <button type="button" onClick={lap} disabled={!swRunning} className={`ui-btn-soft ${h} disabled:opacity-45 disabled:pointer-events-none`}>
            <Flag className="w-5 h-5" aria-hidden="true" />
            {t('stopwatch.lap')}
          </button>
        )}
        <button type="button" onClick={mode === 'timer' ? resetTimer : resetSw} className={`${softBtn} ${h}`}>
          <RotateCcw className="w-5 h-5" aria-hidden="true" />
          {mode === 'timer' ? t('countdown.reset') : t('stopwatch.reset')}
        </button>
        {inBig ? (
          <button type="button" onClick={exitBig} className={`${softBtn} ${h}`}>
            <Minimize className="w-5 h-5" aria-hidden="true" />
            {t('fullscreen.exit')}
          </button>
        ) : (
          <button type="button" ref={fsBtnRef} onClick={enterBig} className={`${softBtn} ${h}`}>
            <Maximize className="w-5 h-5" aria-hidden="true" />
            {t('fullscreen.enter')}
          </button>
        )}
      </div>
    )
  }

  const doneAlert = cd.status === 'done' && (
    <div role="alert" className="w-full bg-subtle rounded-2xl p-4 text-center">
      <p className="text-lg font-bold text-fg">{t('countdown.finished')}</p>
      <p className="text-sm text-muted mt-1">{t('countdown.finishedHint')}</p>
    </div>
  )

  const checkbox = (k: 'sound' | 'repeat' | 'vibrate' | 'wake', label: string) => (
    <label className="flex items-center justify-between gap-3 min-h-11 cursor-pointer">
      <span className="text-body">{label}</span>
      <input type="checkbox" checked={cfg[k]} onChange={(e) => set(k, e.target.checked)} className="w-5 h-5 accent-primary cursor-pointer" />
    </label>
  )

  const unitKeys = { h: 'hours', m: 'minutes', s: 'seconds' } as const

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-fg">{t('title')}</h1>
        <p className="text-sm text-muted mt-1">{t('description')}</p>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div role="tablist" aria-label={t('modeTabs')} className="inline-flex bg-soft rounded-2xl p-1 gap-1">
          {MODES.map((m, i) => (
            <button
              key={m}
              ref={(el) => { tabRefs.current[i] = el }}
              type="button"
              role="tab"
              id={`${uid}-tab-${m}`}
              aria-selected={mode === m}
              aria-controls={`${uid}-panel`}
              tabIndex={mode === m ? 0 : -1}
              onClick={() => set('mode', m)}
              onKeyDown={(e) => onTabKey(e, i)}
              className={`min-h-11 px-6 rounded-xl font-semibold transition-colors ${mode === m ? 'bg-primary text-white' : 'text-sub hover:text-fg'}`}
            >
              {t(`modes.${m}`)}
            </button>
          ))}
        </div>
        <Link href="/pomodoro/" className="inline-flex items-center min-h-11 px-2 text-sm font-medium text-primary hover:underline">
          {t('pomodoroLink')}
        </Link>
      </div>

      <p aria-live="polite" className="sr-only">{msg}</p>

      <div role="tabpanel" id={`${uid}-panel`} aria-labelledby={`${uid}-tab-${mode}`} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <section className="lg:col-span-2 ui-card p-6 sm:p-8">
          {mode === 'timer' ? (
            <div className="flex flex-col items-center gap-6">
              <div
                role="progressbar"
                aria-label={t('countdown.progress')}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.round((1 - frac) * 100)}
                aria-valuetext={t('countdown.remainingText', { time: human(timerMs) })}
                className="relative w-full max-w-[19rem] aspect-square"
              >
                <svg viewBox="0 0 240 240" className="w-full h-full -rotate-90" aria-hidden="true">
                  <circle cx="120" cy="120" r={R} fill="none" strokeWidth="10" stroke="currentColor" className="text-track" />
                  <circle
                    cx="120" cy="120" r={R} fill="none" strokeWidth="10" stroke="currentColor" strokeLinecap="round"
                    strokeDasharray={C} strokeDashoffset={C * (1 - frac)} strokeOpacity={frac > 0 ? 1 : 0}
                    className="text-primary transition-[stroke-dashoffset] duration-300 ease-linear motion-reduce:transition-none"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-1">
                  <span className={`font-bold tabular-nums text-fg leading-none ${clock.length > 5 ? 'text-4xl sm:text-5xl' : 'text-6xl sm:text-7xl'} ${pulse}`}>{clock}</span>
                  {endClock && <span className="text-sm text-muted">{t('countdown.endsAt', { time: endClock })}</span>}
                  {cd.status === 'paused' && <span className="text-sm text-muted">{t('countdown.paused')}</span>}
                </div>
              </div>

              {!big && doneAlert}
              {fromLink !== null && cd.status === 'idle' && <p className="text-sm text-sub text-center">{t('countdown.readyFromLink', { time: human(fromLink * 1000) })}</p>}

              {(cd.status === 'idle' || cd.status === 'done') && (
                <fieldset className="w-full max-w-sm">
                  <legend className="sr-only">{t('countdown.setTime')}</legend>
                  <div className="grid grid-cols-3 gap-3">
                    {(['h', 'm', 's'] as const).map((k) => (
                      <div key={k}>
                        <label htmlFor={`${uid}-${k}`} className="block text-sm text-sub mb-1.5 text-center">{t(`countdown.${unitKeys[k]}`)}</label>
                        <input
                          id={`${uid}-${k}`}
                          ref={k === 'm' ? minRef : undefined}
                          inputMode="numeric"
                          pattern="[0-9]*"
                          maxLength={2}
                          autoComplete="off"
                          value={cfg[k]}
                          onChange={(e) => { set(k, e.target.value.replace(/\D/g, '').slice(0, 2)); setFromLink(null) }}
                          onFocus={(e) => e.target.select()}
                          onKeyDown={(e) => { if (e.key === 'Enter') startTimer() }}
                          aria-invalid={!!err}
                          aria-describedby={err ? `${uid}-err` : undefined}
                          className="ui-field px-3 py-3 text-center text-2xl font-semibold tabular-nums"
                        />
                      </div>
                    ))}
                  </div>
                  {err && <p id={`${uid}-err`} role="alert" className="text-sm text-red-600 mt-2 text-center">{err}</p>}
                </fieldset>
              )}

              {!cdRunning && (
                <div className="w-full">
                  <p id={`${uid}-presets`} className="text-sm text-sub text-center mb-2">{t('countdown.presets')}</p>
                  <div role="group" aria-labelledby={`${uid}-presets`} className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                    {PRESETS.map((n) => (
                      <button key={n} type="button" onClick={() => preset(n)} aria-label={t('countdown.presetStart', { n })} className={`${softBtn} min-h-11 tabular-nums`}>
                        {t('countdown.presetLabel', { n })}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {controls(false)}
            </div>
          ) : (
            <div className="flex flex-col items-center gap-6">
              <div className="py-6 text-center">
                <span className="font-bold tabular-nums text-fg leading-none text-5xl sm:text-7xl">{clock}</span>
                {sw.laps.length > 0 && (
                  <p className="text-sm text-muted mt-3 tabular-nums">{t('stopwatch.currentLap')} {T.formatClock(swMs - lastLap, { cs: true })}</p>
                )}
              </div>
              {controls(false)}
              {sw.laps.length > 0 && (
                <div className="w-full max-h-80 overflow-y-auto border-t border-line" tabIndex={0} role="region" aria-label={t('stopwatch.laps')}>
                  <table className="w-full text-sm">
                    <caption className="sr-only">{t('stopwatch.laps')}</caption>
                    <thead className="sticky top-0 bg-surface">
                      <tr className="border-b border-line text-sub">
                        <th scope="col" className="text-left py-2 px-3 font-medium">{t('stopwatch.lapNumber')}</th>
                        <th scope="col" className="text-right py-2 px-3 font-medium">{t('stopwatch.lapTime')}</th>
                        <th scope="col" className="text-right py-2 px-3 font-medium">{t('stopwatch.totalTime')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sw.laps.map((_, i) => i).reverse().map((i) => (
                        <tr key={i} className="border-b border-line">
                          <td className="py-2 px-3 text-fg font-medium tabular-nums">
                            {i + 1}
                            {i === stats.fastest && <span className="ml-2 text-xs font-semibold text-primary">{t('stopwatch.fastest')}</span>}
                            {i === stats.slowest && <span className="ml-2 text-xs font-semibold text-red-600">{t('stopwatch.slowest')}</span>}
                          </td>
                          <td className="py-2 px-3 text-right text-fg tabular-nums">{T.formatClock(stats.splits[i], { cs: true })}</td>
                          <td className="py-2 px-3 text-right text-sub tabular-nums">{T.formatClock(sw.laps[i], { cs: true })}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </section>

        <aside className="space-y-6">
          {mode === 'timer' ? (
            <div className="ui-card p-6">
              <h2 className="font-semibold text-fg mb-2">{t('options.title')}</h2>
              <div className="divide-y divide-line">
                {checkbox('sound', t('options.sound'))}
                {checkbox('repeat', t('options.repeat'))}
                {support.vibrate && checkbox('vibrate', t('options.vibrate'))}
                {support.wake && checkbox('wake', t('options.wakeLock'))}
              </div>
              <div className="flex flex-wrap gap-2 mt-3">
                <button type="button" onClick={() => { unlockAudio(); beep() }} className={`${softBtn} min-h-11 px-4 text-sm`}>
                  <Volume2 className="w-4 h-4" aria-hidden="true" />
                  {t('options.testSound')}
                </button>
                {support.notify && perm === 'default' && (
                  <button type="button" onClick={askNotify} className={`${softBtn} min-h-11 px-4 text-sm`}>
                    <Bell className="w-4 h-4" aria-hidden="true" />
                    {t('options.notify')}
                  </button>
                )}
              </div>
              {support.notify && perm !== 'default' && (
                <p className="text-sm text-muted mt-3">{perm === 'granted' ? t('options.notifyOn') : t('options.notifyDenied')}</p>
              )}
              {wakeOn && <p className="text-sm text-muted mt-2">{t('options.wakeLockActive')}</p>}

              <div className="border-t border-line mt-4 pt-4">
                <h2 className="font-semibold text-fg">{t('share.title')}</h2>
                <p className="text-sm text-muted mt-1">{t('share.hint', { time: human(shareSec * 1000) })}</p>
                <button type="button" onClick={() => copy(shareUrl(), 'link')} disabled={shareSec < 1} className="ui-btn-soft min-h-11 px-4 mt-3 w-full disabled:opacity-45">
                  {copied === 'link' ? <Check className="w-4 h-4" aria-hidden="true" /> : <Copy className="w-4 h-4" aria-hidden="true" />}
                  {copied === 'link' ? t('share.copied') : t('share.copy')}
                </button>
              </div>
            </div>
          ) : (
            <div className="ui-card p-6">
              <h2 className="font-semibold text-fg mb-3">{t('stopwatch.statsTitle')}</h2>
              {sw.laps.length === 0 ? (
                <p className="text-sm text-muted">{t('stopwatch.noLaps')}</p>
              ) : (
                <>
                  <dl className="space-y-2 text-sm">
                    {stats.fastest >= 0 && (
                      <div className="flex justify-between gap-3">
                        <dt className="text-sub">{t('stopwatch.fastest')} ({t('stopwatch.lapNumber')} {stats.fastest + 1})</dt>
                        <dd className="text-fg font-semibold tabular-nums">{T.formatClock(stats.splits[stats.fastest], { cs: true })}</dd>
                      </div>
                    )}
                    {stats.slowest >= 0 && (
                      <div className="flex justify-between gap-3">
                        <dt className="text-sub">{t('stopwatch.slowest')} ({t('stopwatch.lapNumber')} {stats.slowest + 1})</dt>
                        <dd className="text-fg font-semibold tabular-nums">{T.formatClock(stats.splits[stats.slowest], { cs: true })}</dd>
                      </div>
                    )}
                    <div className="flex justify-between gap-3">
                      <dt className="text-sub">{t('stopwatch.average')}</dt>
                      <dd className="text-fg font-semibold tabular-nums">{T.formatClock(stats.average, { cs: true })}</dd>
                    </div>
                  </dl>
                  <button
                    type="button"
                    onClick={() => copy(T.lapsCsv(sw.laps, [t('stopwatch.lapNumber'), t('stopwatch.lapTime'), t('stopwatch.totalTime')]), 'csv')}
                    className="ui-btn-soft min-h-11 px-4 mt-4 w-full"
                  >
                    {copied === 'csv' ? <Check className="w-4 h-4" aria-hidden="true" /> : <Copy className="w-4 h-4" aria-hidden="true" />}
                    {copied === 'csv' ? t('share.copied') : t('stopwatch.copyCsv')}
                  </button>
                </>
              )}
              {support.wake && <div className="border-t border-line mt-4 pt-2">{checkbox('wake', t('options.wakeLock'))}</div>}
              {wakeOn && <p className="text-sm text-muted mt-1">{t('options.wakeLockActive')}</p>}
            </div>
          )}

          <div className="ui-card p-6">
            <h2 className="font-semibold text-fg mb-3">{t('shortcuts.title')}</h2>
            <dl className="space-y-2 text-sm">
              {([['Space', 'space'], ['R', 'r'], ['F', 'f'], ['L', 'l'], ['Esc', 'esc']] as const).map(([k, key]) => (
                <div key={key} className="flex items-center justify-between gap-3">
                  <dt><kbd className="inline-block min-w-8 text-center px-2 py-0.5 rounded-md bg-soft border border-line font-mono text-xs text-body">{k}</kbd></dt>
                  <dd className="text-sub text-right">{t(`shortcuts.${key}`)}</dd>
                </div>
              ))}
            </dl>
            <p className="text-xs text-muted mt-3">{t('shortcuts.note')}</p>
          </div>
        </aside>
      </div>

      {big && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={t(`modes.${mode}`)}
          onKeyDown={trapFocus}
          className="fixed inset-0 m-0 z-[100] bg-canvas flex flex-col items-center justify-center gap-8 p-6"
        >
          <p className="text-lg text-muted">
            {t(`modes.${mode}`)}
            {mode === 'timer' && endClock && ` · ${t('countdown.endsAt', { time: endClock })}`}
          </p>
          <span className={`font-bold tabular-nums text-fg leading-none ${mode === 'timer' ? pulse : ''}`} style={{ fontSize: `min(${Math.floor(160 / clock.length)}vw, 42vh)` }}>
            {clock}
          </span>
          {mode === 'timer' && (
            <div className="w-full max-w-4xl h-2 bg-track rounded-full overflow-hidden" aria-hidden="true">
              <div className="h-full bg-primary transition-[width] duration-300 ease-linear motion-reduce:transition-none" style={{ width: `${frac * 100}%` }} />
            </div>
          )}
          {mode === 'timer' && <div className="w-full max-w-md">{doneAlert}</div>}
          {controls(true)}
          <p className="text-sm text-muted text-center">{t('fullscreen.hint')}</p>
        </div>
      )}

      <GuideSection namespace="timer" />
    </div>
  )
}
