'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useTranslations } from '@/lib/i18n'
import { useSearchParams } from '@/hooks/useSearchParams'
import ShareResult from '@/components/ShareResult'
import {
  type Segment, type Alert, MAX_SEGMENTS, MAX_TOTAL_SEC, MIN_SEG_SEC,
  totalSec, defaultWarnMin, parseSegments, serializeSegments, timerState, alertsBetween,
  formatClock, splitDuration, adjustSegment,
} from '@/utils/presentationTimer'
import { Play, Pause, RotateCcw, Plus, Minus, Maximize, X } from 'lucide-react'

const PLAIN_PRESETS = [3, 5, 10, 15, 20, 30]
const SPLIT_PRESETS: [number, number][] = [[10, 5], [15, 5], [20, 10]]

function playBeep(ctx: AudioContext, frequency: number, duration: number, count = 1) {
  for (let i = 0; i < count; i++) {
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.type = 'sine'
    const at = ctx.currentTime + i * 0.3
    osc.frequency.setValueAtTime(frequency, at)
    gain.gain.setValueAtTime(0.35, at)
    gain.gain.exponentialRampToValueAtTime(0.001, at + duration)
    osc.start(at)
    osc.stop(at + duration)
  }
}

/** 분 입력: 입력 도중 빈칸/소수점을 허용하고, 유효할 때만 부모에 반영 */
function MinutesInput({ sec, min, onCommit, label, className = '' }: {
  sec: number; min: number; onCommit: (sec: number) => boolean; label: string; className?: string
}) {
  const fmt = (s: number) => String(+(s / 60).toFixed(2))
  const [v, setV] = useState(fmt(sec))
  useEffect(() => { if (Math.round(Number(v) * 60) !== sec) setV(fmt(sec)) }, [sec]) // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <input
      type="number" inputMode="decimal" min={min / 60} step={0.5} value={v} aria-label={label}
      onChange={(e) => {
        setV(e.target.value)
        const n = Number(e.target.value)
        if (e.target.value !== '' && Number.isFinite(n) && n * 60 >= min) onCommit(Math.round(n * 60))
      }}
      onBlur={() => setV(fmt(sec))}
      className={`ui-field px-3 py-2 tabular-nums ${className}`}
    />
  )
}

export default function PresentationTimer() {
  const t = useTranslations('presentationTimer')
  const sp = useSearchParams()

  const [segs, setSegs] = useState<Segment[]>(() => parseSegments(sp.get('s')) ?? [{ name: '', sec: 600 }])
  const [warnSec, setWarnSec] = useState(() => {
    const w = Number(sp.get('w'))
    return sp.get('w') !== null && Number.isFinite(w) && w >= 0 ? Math.round(w * 60) : defaultWarnMin(totalSec(segs)) * 60
  })
  const [sound, setSound] = useState(() => sp.get('snd') !== '0')
  const [vibrate, setVibrate] = useState(() => sp.get('vib') !== '0')

  // 경과 = accMs + (실행 중이면 now - runStart). 인터벌은 화면 갱신만 하고 시간은 performance.now 차이로 계산.
  const [accMs, setAccMs] = useState(0)
  const [runStart, setRunStart] = useState<number | null>(null)
  const [now, setNow] = useState(0)
  const [speaker, setSpeaker] = useState(false)
  const [wakeOn, setWakeOn] = useState(false)
  const prevElapsedRef = useRef(0)
  const audioRef = useRef<AudioContext | null>(null)

  const running = runStart !== null
  const elapsed = accMs + (running ? Math.max(0, now - runStart) : 0)
  const st = timerState(segs, elapsed, warnSec)
  const total = totalSec(segs)

  // ── 공유 링크(URL) 동기화 ──
  useEffect(() => {
    const id = setTimeout(() => {
      const p = new URLSearchParams({ s: serializeSegments(segs), w: String(+(warnSec / 60).toFixed(2)) })
      if (!sound) p.set('snd', '0')
      if (!vibrate) p.set('vib', '0')
      window.history.replaceState(null, '', `${window.location.pathname}?${p.toString()}`)
    }, 300)
    return () => clearTimeout(id)
  }, [segs, warnSec, sound, vibrate])

  // ── 알림 ──
  const fire = useCallback((alert: Alert) => {
    if (sound) {
      try {
        const ctx = audioRef.current ?? (audioRef.current = new AudioContext())
        if (ctx.state === 'suspended') ctx.resume()
        if (alert === 'end') playBeep(ctx, 1100, 0.3, 3)
        else if (alert === 'warning') playBeep(ctx, 660, 0.25, 2)
        else playBeep(ctx, 880, 0.15, 1)
      } catch { /* 오디오 불가 */ }
    }
    if (vibrate) navigator.vibrate?.(alert === 'end' ? [300, 150, 300, 150, 300] : alert === 'warning' ? [200, 100, 200] : 150)
  }, [sound, vibrate])

  // ── 틱: 250ms마다 화면 갱신 + 넘은 지점 알림. 백그라운드에서 틱이 늦어도 경과는 정확하고 알림은 몰아서 1회 ──
  useEffect(() => {
    if (runStart === null) return
    const tick = () => {
      const n = performance.now()
      setNow(n)
      const el = accMs + n - runStart
      const alerts = alertsBetween(segs, warnSec, prevElapsedRef.current, el)
      prevElapsedRef.current = el
      if (alerts.length) fire(alerts[0])
    }
    tick()
    const id = setInterval(tick, 250)
    document.addEventListener('visibilitychange', tick)
    return () => { clearInterval(id); document.removeEventListener('visibilitychange', tick) }
  }, [runStart, accMs, segs, warnSec, fire])

  // ── Wake Lock: 실행 중 화면 꺼짐 방지 (미지원 브라우저는 조용히 무시) ──
  useEffect(() => {
    if (runStart === null) return
    let lock: WakeLockSentinel | null = null
    let dead = false
    const request = async () => {
      if (document.visibilityState !== 'visible' || (lock && !lock.released) || !('wakeLock' in navigator)) return
      try {
        lock = await navigator.wakeLock.request('screen')
        if (dead) { lock.release().catch(() => {}); return }
        setWakeOn(true)
        lock.addEventListener('release', () => setWakeOn(false))
      } catch { /* 권한 거부·저전력 모드 */ }
    }
    request()
    document.addEventListener('visibilitychange', request)
    return () => {
      dead = true
      document.removeEventListener('visibilitychange', request)
      lock?.release().catch(() => {})
      setWakeOn(false)
    }
  }, [runStart])

  // ── 조작 ──
  const toggle = useCallback(() => {
    const n = performance.now()
    if (runStart !== null) {
      setAccMs((a) => a + (n - runStart))
      setRunStart(null)
    } else {
      if (sound && !audioRef.current) { try { audioRef.current = new AudioContext() } catch { /* 없음 */ } } // iOS: 사용자 제스처에서 오디오 잠금 해제
      prevElapsedRef.current = accMs
      setNow(n)
      setRunStart(n)
    }
  }, [runStart, accMs, sound])

  const reset = useCallback(() => {
    setRunStart(null)
    setAccMs(0)
    prevElapsedRef.current = 0
  }, [])

  const adjust = useCallback((deltaSec: number) => setSegs((s) => adjustSegment(s, st.segIndex, deltaSec)), [st.segIndex])

  const applyPreset = (next: Segment[]) => {
    reset()
    setSegs(next)
    setWarnSec(defaultWarnMin(totalSec(next)) * 60)
  }

  const enterSpeaker = useCallback(() => {
    setSpeaker(true)
    document.documentElement.requestFullscreen?.().catch(() => { /* iPhone 등 미지원: 화면 덮기만 */ })
  }, [])
  const exitSpeaker = useCallback(() => {
    setSpeaker(false)
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {})
  }, [])

  useEffect(() => {
    const onFs = () => { if (!document.fullscreenElement) setSpeaker(false) }
    document.addEventListener('fullscreenchange', onFs)
    return () => document.removeEventListener('fullscreenchange', onFs)
  }, [])

  // ── 단축키 (e.code 기준 → 한글 입력 상태에서도 동작) ──
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey || e.isComposing) return
      const el = e.target as HTMLElement | null
      if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || el.isContentEditable)) return
      switch (e.code) {
        case 'Space': toggle(); break
        case 'KeyR': reset(); break
        case 'KeyF': if (speaker) exitSpeaker(); else enterSpeaker(); break
        case 'ArrowUp': adjust(60); break
        case 'ArrowDown': adjust(-60); break
        case 'Escape': if (!speaker) return; exitSpeaker(); break
        default: return
      }
      e.preventDefault() // Space가 포커스된 버튼을 한 번 더 누르는 것 방지
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [toggle, reset, adjust, speaker, enterSpeaker, exitSpeaker])

  // ── 구간 편집 ──
  const setSegSec = (i: number, sec: number) => {
    if (sec < MIN_SEG_SEC || total - segs[i].sec + sec > MAX_TOTAL_SEC) return false
    setSegs((s) => s.map((x, j) => (j === i ? { ...x, sec } : x)))
    return true
  }
  const setSegName = (i: number, name: string) => setSegs((s) => s.map((x, j) => (j === i ? { ...x, name: name.slice(0, 30) } : x)))
  const addSeg = () => {
    if (segs.length < MAX_SEGMENTS && total + 300 <= MAX_TOTAL_SEC) setSegs((s) => [...s, { name: '', sec: 300 }])
  }
  const removeSeg = (i: number) => setSegs((s) => (s.length > 1 ? s.filter((_, j) => j !== i) : s))

  // ── 표시 문자열 ──
  const nMin = (sec: number) => t('nMin', { n: +(sec / 60).toFixed(2) })
  const dur = (ms: number) => {
    const { m, s } = splitDuration(ms)
    return m ? t('durMS', { m, s }) : t('durS', { s })
  }
  const segName = (i: number) => segs[i]?.name || t('segNamePlaceholder', { n: i + 1 })
  const delta = elapsed - st.totalMs
  const deltaStr = Math.abs(delta) < 1000 ? '±0' : `${delta > 0 ? '+' : '-'}${dur(delta)}`
  const hasResult = !running && elapsed > 0
  const multi = segs.length > 1
  const serialized = serializeSegments(segs)

  const plainPresets = PLAIN_PRESETS.map((m) => ({ key: `p${m}`, label: t('nMin', { n: m }), segs: [{ name: '', sec: m * 60 }] }))
  const splitPresets = SPLIT_PRESETS.map(([a, b]) => ({
    key: `s${a}-${b}`, label: t('splitPreset', { talk: a, qna: b }),
    segs: [{ name: t('segTalk'), sec: a * 60 }, { name: t('segQna'), sec: b * 60 }],
  }))
  const agendaPreset = {
    key: 'agenda', label: t('agendaPreset', { n: 15 }),
    segs: [{ name: t('segIntro'), sec: 120 }, { name: t('segBody'), sec: 480 }, { name: t('segQna'), sec: 300 }],
  }

  const clockColor = st.phase === 'overtime' ? 'text-red-600' : st.phase === 'warning' ? 'text-amber-600' : 'text-fg'
  const fillColor = st.phase === 'overtime' ? 'bg-red-600' : st.phase === 'warning' ? 'bg-amber-500' : 'bg-primary'
  const status = st.phase === 'overtime' ? t('overtime') : st.phase === 'warning' ? t('phaseWarning')
    : running ? t('statusRunning') : elapsed > 0 ? t('statusPaused') : t('statusReady')

  const progressBar = (track: string, fill: string) => {
    let start = 0
    return (
      <div className="flex gap-1 h-2 w-full" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(st.progress * 100)}>
        {segs.map((s, i) => {
          const f = Math.min(1, Math.max(0, (elapsed - start) / (s.sec * 1000)))
          start += s.sec * 1000
          return (
            <div key={i} className={`${track} rounded-full overflow-hidden`} style={{ flex: `${s.sec} 1 0` }}>
              <div className={`h-full ${fill}`} style={{ width: `${f * 100}%` }} />
            </div>
          )
        })}
      </div>
    )
  }

  const segLine = multi && st.phase !== 'overtime' && (
    <>
      {t('segRemaining', { name: segName(st.segIndex), time: formatClock(st.segRemainingMs) })}
      {st.segIndex < segs.length - 1 && <span className="opacity-70"> · {t('nextSeg', { name: segName(st.segIndex + 1) })}</span>}
    </>
  )

  const iconBtn = 'p-3 rounded-full bg-soft hover:bg-subtle text-body transition-colors'
  const chip = (on: boolean) => `px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${on ? 'bg-primary text-white' : 'bg-soft text-body hover:bg-subtle'}`

  // ── 발표자 모드 ──
  if (speaker) {
    const bg = st.phase === 'overtime' ? 'bg-red-600 text-white' : st.phase === 'warning' ? 'bg-amber-400 text-gray-950' : 'bg-canvas text-fg'
    const btn = st.phase === 'overtime' ? 'bg-white/20 hover:bg-white/30' : st.phase === 'warning' ? 'bg-black/10 hover:bg-black/20' : 'bg-soft hover:bg-subtle'
    return (
      <div className={`fixed inset-0 z-[100] flex flex-col p-4 sm:p-8 select-none transition-colors duration-500 ${bg}`}>
        <div className="flex items-start justify-between gap-4 text-lg sm:text-2xl font-semibold">
          <div>{status}</div>
          <button onClick={exitSpeaker} className={`p-3 rounded-full ${btn}`} aria-label={t('exitSpeaker')} title={t('exitSpeaker')}>
            <X size={22} />
          </button>
        </div>
        <button
          onClick={toggle}
          className="flex-1 flex flex-col items-center justify-center min-h-0 focus-visible:outline-none"
          aria-label={running ? t('pause') : t('start')}
        >
          <span className="font-bold tabular-nums leading-none tracking-tight" style={{ fontSize: 'min(26vw, 55vh)' }}>
            {formatClock(st.remainingMs)}
          </span>
          {segLine && <span className="mt-4 text-xl sm:text-3xl font-medium opacity-90">{segLine}</span>}
          {!running && <span className="mt-4 text-base sm:text-lg opacity-70">{t('tapToToggle')}</span>}
        </button>
        <div className="space-y-4">
          {progressBar(st.phase === 'normal' ? 'bg-track' : 'bg-black/15', st.phase === 'normal' ? 'bg-primary' : 'bg-current')}
          <div className="flex items-center justify-center gap-3">
            <button onClick={() => adjust(-60)} className={`p-3 rounded-full ${btn}`} aria-label={t('subtractMinute')}><Minus size={20} /></button>
            <button onClick={reset} className={`p-3 rounded-full ${btn}`} aria-label={t('reset')}><RotateCcw size={20} /></button>
            <button onClick={toggle} className={`p-4 rounded-full ${btn}`} aria-label={running ? t('pause') : t('start')}>
              {running ? <Pause size={26} /> : <Play size={26} />}
            </button>
            <button onClick={() => adjust(60)} className={`p-3 rounded-full ${btn}`} aria-label={t('addMinute')}><Plus size={20} /></button>
          </div>
          <p className="hidden sm:block text-center text-sm opacity-60">{t('shortcutsLine')}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-fg">{t('title')}</h1>
        <p className="text-sm text-muted mt-1">{t('description')}</p>
      </div>

      {/* 타이머 */}
      <div className="ui-card p-6 sm:p-8 flex flex-col items-center gap-5">
        <div className="flex items-center gap-2 text-sm">
          <span className={`font-semibold ${st.phase === 'normal' ? 'text-sub' : clockColor}`}>{status}</span>
          {wakeOn && <span className="text-faint">· {t('wakeLockOn')}</span>}
        </div>
        <button onClick={toggle} className={`text-7xl sm:text-8xl font-bold tabular-nums leading-none tracking-tight ${clockColor}`} aria-label={running ? t('pause') : t('start')}>
          {formatClock(st.remainingMs)}
        </button>
        <div className="text-sm text-muted text-center min-h-5">
          {hasResult
            ? <span className="text-body font-medium">{t('resultLine', { dur: dur(elapsed), delta: deltaStr })}</span>
            : segLine || t('target', { n: +(total / 60).toFixed(2) })}
        </div>
        {progressBar('bg-track', fillColor)}
        {multi && (
          <div className="flex gap-1 w-full text-xs">
            {segs.map((s, i) => (
              <div key={i} style={{ flex: `${s.sec} 1 0` }} className={`truncate ${i === st.segIndex && elapsed > 0 ? 'text-primary font-semibold' : 'text-muted'}`}>
                {segName(i)} {nMin(s.sec)}
              </div>
            ))}
          </div>
        )}

        <div className="flex items-center gap-3">
          <button onClick={() => adjust(-60)} className={iconBtn} aria-label={t('subtractMinute')} title={t('subtractMinute')}><Minus size={18} /></button>
          <button onClick={reset} className={iconBtn} aria-label={t('reset')} title={t('reset')}><RotateCcw size={18} /></button>
          <button onClick={toggle} className="ui-btn px-8 py-4 text-lg rounded-full min-w-36">
            {running ? <Pause size={22} /> : <Play size={22} />}
            {running ? t('pause') : elapsed > 0 ? t('resume') : t('start')}
          </button>
          <button onClick={enterSpeaker} className={iconBtn} aria-label={t('speakerMode')} title={t('speakerMode')}><Maximize size={18} /></button>
          <button onClick={() => adjust(60)} className={iconBtn} aria-label={t('addMinute')} title={t('addMinute')}><Plus size={18} /></button>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-2">
          <button onClick={enterSpeaker} className="ui-btn-soft px-4 py-2 text-sm">{t('speakerMode')}</button>
          <button onClick={() => setSound((v) => !v)} className={chip(sound)} aria-pressed={sound}>{t('sound')}</button>
          <button onClick={() => setVibrate((v) => !v)} className={chip(vibrate)} aria-pressed={vibrate}>{t('vibration')}</button>
        </div>
        <p className="hidden sm:block text-xs text-faint">{t('shortcutsLine')}</p>
      </div>

      {/* 빠른 설정 */}
      <div className="ui-card p-6 space-y-3">
        <h2 className="text-sm font-semibold text-body">{t('presets')}</h2>
        <div className="flex flex-wrap gap-2">
          {[...plainPresets, ...splitPresets, agendaPreset].map((p) => (
            <button key={p.key} onClick={() => applyPreset(p.segs)} className={chip(serializeSegments(p.segs) === serialized)}>
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* 구간·경고 설정 */}
      <div className="ui-card p-6 space-y-4">
        <div>
          <h2 className="text-sm font-semibold text-body">{t('segments')}</h2>
          <p className="text-xs text-muted mt-1">{t('segmentsHint')}</p>
        </div>
        <div className="space-y-2">
          {segs.map((s, i) => (
            <div key={i} className="flex items-center gap-2">
              <input
                value={s.name} onChange={(e) => setSegName(i, e.target.value)} maxLength={30}
                placeholder={t('segNamePlaceholder', { n: i + 1 })} aria-label={t('segName')}
                className="ui-field px-3 py-2 flex-1 min-w-0"
              />
              <MinutesInput sec={s.sec} min={MIN_SEG_SEC} onCommit={(sec) => setSegSec(i, sec)} label={t('segMinutes')} className="w-24" />
              <span className="text-sm text-muted">{t('minutes')}</span>
              <button
                onClick={() => removeSeg(i)} disabled={segs.length === 1}
                className="p-2 rounded-lg text-muted hover:bg-soft disabled:opacity-30" aria-label={t('removeSegment')} title={t('removeSegment')}
              >
                <X size={16} />
              </button>
            </div>
          ))}
        </div>
        <div className="flex items-center justify-between gap-3">
          <button onClick={addSeg} disabled={segs.length >= MAX_SEGMENTS} className="ui-btn-soft px-4 py-2 text-sm">{t('addSegment')}</button>
          <span className="text-sm text-body tabular-nums">{t('target', { n: +(total / 60).toFixed(2) })}</span>
        </div>
        <div className="pt-4 border-t border-line">
          <label className="block text-sm font-medium text-body mb-1">{t('warningTime')}</label>
          <div className="flex items-center gap-2">
            <MinutesInput sec={warnSec} min={0} onCommit={(sec) => { setWarnSec(sec); return true }} label={t('warningTime')} className="w-24" />
            <span className="text-sm text-muted">{t('minutes')}</span>
          </div>
          <p className="text-xs text-muted mt-1">{t('warningHint')}</p>
        </div>
      </div>

      {/* 공유: 시작 전 = 설정 링크, 멈춘 뒤 = 결과 */}
      <ShareResult
        card={hasResult ? {
          tool: t('title'),
          label: t('shareResultLabel', { target: nMin(total) }),
          headline: dur(elapsed),
          sub: t('shareDelta', { delta: deltaStr }),
          rows: multi ? segs.slice(0, 5).map((s, i) => ({ label: segName(i), value: nMin(s.sec) })) : undefined,
        } : {
          tool: t('title'),
          label: t('shareSetupLabel'),
          headline: nMin(total),
          sub: warnSec > 0 ? t('shareWarning', { n: +(warnSec / 60).toFixed(2) }) : undefined,
          rows: multi ? segs.slice(0, 5).map((s, i) => ({ label: segName(i), value: nMin(s.sec) })) : undefined,
        }}
        text={hasResult ? t('shareTextResult', { dur: dur(elapsed), delta: deltaStr }) : t('shareTextSetup', { total: nMin(total) })}
        fileName="presentation-timer"
      />

      {/* 가이드 */}
      <div className="ui-card p-6">
        <h2 className="text-xl font-semibold text-fg mb-6">{t('guide.title')}</h2>
        <div className="grid md:grid-cols-3 gap-6">
          {(['howto', 'features', 'tips'] as const).map((sec) => (
            <div key={sec}>
              <h3 className="font-medium text-fg mb-3">{t(`guide.${sec}.title`)}</h3>
              <ul className="space-y-2 list-disc pl-4 text-sm text-sub">
                {(t.raw(`guide.${sec}.items`) as string[]).map((item, i) => <li key={i}>{item}</li>)}
              </ul>
            </div>
          ))}
        </div>
        {Array.isArray(t.raw('guide.faq.items')) && (
          <div className="mt-8 space-y-4">
            <h3 className="font-medium text-fg">{t('guide.faq.title')}</h3>
            {(t.raw('guide.faq.items') as { q: string; a: string }[]).map((f, i) => (
              <div key={i}>
                <p className="text-sm font-medium text-body">{f.q}</p>
                <p className="text-sm text-sub mt-1">{f.a}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
