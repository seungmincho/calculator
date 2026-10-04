'use client'

import { useState, useRef, useCallback, useEffect, useMemo } from 'react'
import { useTranslations } from '@/lib/i18n'
import '@/lib/i18n/ns/metronome'
import { useSearchParams } from '@/hooks/useSearchParams'
import { Play, Square } from 'lucide-react'
import ShareResult from '@/components/ShareResult'
import GuideSection from '@/components/GuideSection'
import {
  BPM_MIN, BPM_MAX, clampBpm, tempoMark, TEMPO_MARKS, pushTap, tapBpm, cycleAccent, defaultAccents,
  step, trainerBpm, decodeSettings, encodeSettings, synth, DEFAULTS, SUBDIVISIONS,
  type Settings, type Subdivision, type Sound, type Pos,
} from '@/utils/metronome'

const METERS: [number, number][] = [[2, 4], [3, 4], [4, 4], [5, 4], [6, 8], [7, 8], [12, 8]]
const SOUNDS: Sound[] = ['click', 'wood', 'beep']
const STORE_KEY = 'metronome-settings'
const LOOKAHEAD = 0.12 // 초. 탭이 백그라운드면 타이머가 1초까지 늦어지므로 1.5초로 늘림
const TICK_MS = 25

interface Note { time: number; bar: number; beat: number; sub: number; countIn: boolean; muted: boolean; bpm: number }
interface View { bar: number; beat: number; countIn: boolean; muted: boolean; elapsed: number; flash: number }

const seg = (on: boolean) =>
  `px-3 py-2 rounded-xl text-sm font-medium transition-colors ${on ? 'bg-primary text-white' : 'bg-soft text-body hover:bg-subtle'}`
const Toggle = ({ on, onClick, label }: { on: boolean; onClick: () => void; label: string }) => (
  <button type="button" role="switch" aria-checked={on} aria-label={label} onClick={onClick}
    className={`w-11 h-6 rounded-full relative transition-colors shrink-0 ${on ? 'bg-primary' : 'bg-track'}`}>
    <span className={`block w-4 h-4 rounded-full bg-white absolute top-1 transition-transform ${on ? 'translate-x-6' : 'translate-x-1'}`} />
  </button>
)

export default function Metronome() {
  const t = useTranslations('metronome')
  const sp = useSearchParams()
  const [s, setS] = useState<Settings>(DEFAULTS)
  const set = useCallback((patch: Partial<Settings>) => setS((p) => ({ ...p, ...patch })), [])
  const [ready, setReady] = useState(false)
  const [playing, setPlaying] = useState(false)
  const [view, setView] = useState<View>({ bar: 0, beat: -1, countIn: false, muted: false, elapsed: 0, flash: 0 })
  const [taps, setTaps] = useState<number[]>([])
  const [customMeter, setCustomMeter] = useState(false)
  const [canVibrate, setCanVibrate] = useState(false)

  // ── 설정 복원: localStorage → URL(공유 링크가 우선) ──
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORE_KEY) ?? 'null')
      if (saved && typeof saved === 'object') {
        const merged = { ...DEFAULTS, ...saved } as Settings
        setS(decodeSettings((k) => encodeSettings(merged).get(k), { ...merged })) // 저장값도 검증 거침
      }
    } catch { /* 손상된 저장값 무시 */ }
    setCanVibrate('vibrate' in navigator)
    setReady(true)
  }, [])
  const appliedQuery = useRef('')
  const query = sp.toString()
  useEffect(() => {
    if (!ready || !query || appliedQuery.current === query) return
    appliedQuery.current = query
    const q = new URLSearchParams(query)
    setS((p) => decodeSettings((k) => q.get(k), p))
  }, [ready, query])
  useEffect(() => {
    if (!ready) return
    try { localStorage.setItem(STORE_KEY, JSON.stringify(s)) } catch { /* 저장 불가 */ }
  }, [s, ready])
  useEffect(() => {
    if (!METERS.some(([b, u]) => b === s.beats && u === s.unit)) setCustomMeter(true)
  }, [s.beats, s.unit])

  // ── 오디오 엔진 (A Tale of Two Clocks: 짧은 타이머가 AudioContext 시간으로 미리 예약) ──
  const cfg = useRef(s)
  useEffect(() => { cfg.current = s }, [s])
  const ctxRef = useRef<AudioContext | null>(null)
  const masterRef = useRef<GainNode | null>(null)
  const busRef = useRef<GainNode | null>(null) // 재생 세션별 버스: 정지 시 끊어서 예약된 클릭 제거
  const bufs = useRef<Record<string, AudioBuffer>>({})
  const timerRef = useRef<{ stop: () => void } | null>(null)
  const rafRef = useRef(0)
  const queue = useRef<Note[]>([])
  const run = useRef({ pos: { bar: 0, beat: 0, sub: 0 } as Pos, next: 0, start: 0, countInBars: 0, barMuted: false })
  const wake = useRef<WakeLockSentinel | null>(null)
  const stopRef = useRef<() => void>(() => {})
  const starting = useRef(false)

  useEffect(() => {
    const m = masterRef.current, ctx = ctxRef.current
    if (m && ctx) m.gain.setTargetAtTime(s.volume, ctx.currentTime, 0.01)
  }, [s.volume])

  const schedule = useCallback(() => {
    const ctx = ctxRef.current, bus = busRef.current
    if (!ctx || !bus) return
    const c = cfg.current, r = run.current
    const ahead = document.hidden ? 1.5 : LOOKAHEAD
    while (r.next < ctx.currentTime + ahead) {
      if (r.pos.beat >= c.beats) r.pos = { bar: r.pos.bar + 1, beat: 0, sub: 0 } // 재생 중 박자표 축소
      const { bar, beat, sub } = r.pos
      const countIn = bar < r.countInBars
      const played = bar - r.countInBars
      if (!countIn && beat === 0 && sub === 0) r.barMuted = played > 0 && c.gap > 0 && Math.random() * 100 < c.gap
      const bpm = c.trainer && !countIn ? trainerBpm(c.trStart, c.trTarget, c.trStep, c.trEvery, played) : c.bpm
      const acc = countIn ? (beat === 0 ? 'a' : 'n') : c.accents[beat] ?? 'n'
      const muted = !countIn && (r.barMuted || acc === 'm')
      if (!muted && !(countIn && sub > 0)) {
        const level = sub > 0 ? 2 : acc === 'a' ? 0 : 1
        const src = ctx.createBufferSource()
        src.buffer = bufs.current[c.sound + level]
        src.connect(bus)
        src.start(r.next)
        if (c.vibrate && sub === 0 && 'vibrate' in navigator) {
          setTimeout(() => navigator.vibrate(level === 0 ? 40 : 20), Math.max(0, (r.next - ctx.currentTime) * 1000))
        }
      }
      queue.current.push({ time: r.next, bar, beat, sub, countIn, muted, bpm })
      const { next, dt } = step(r.pos, c.beats, countIn ? 'none' : c.subdiv, bpm)
      r.pos = next
      r.next += dt
    }
    if (c.stopMin > 0 && ctx.currentTime - r.start >= c.stopMin * 60) stopRef.current()
  }, [])

  const draw = useCallback(() => {
    const ctx = ctxRef.current
    if (!ctx) return
    const heard = ctx.currentTime - (ctx.outputLatency || 0) - ctx.baseLatency
    let last: Note | undefined
    while (queue.current.length && queue.current[0].time <= heard) last = queue.current.shift()
    if (last && last.sub === 0) {
      const n = last
      setView((v) => ({
        bar: n.countIn ? n.bar : n.bar - run.current.countInBars, beat: n.beat, countIn: n.countIn, muted: n.muted,
        elapsed: Math.max(0, Math.floor(n.time - run.current.start)), flash: v.flash + 1,
      }))
      if (n.bpm !== cfg.current.bpm) setS((p) => ({ ...p, bpm: n.bpm })) // 스피드 트레이너 진행을 화면에 반영
    }
    rafRef.current = requestAnimationFrame(draw)
  }, [])

  const lockScreen = useCallback(async () => {
    try {
      if ('wakeLock' in navigator && document.visibilityState === 'visible' && (!wake.current || wake.current.released)) {
        wake.current = await navigator.wakeLock.request('screen')
      }
    } catch { /* 저전력 모드 등: 무시 */ }
  }, [])

  const stop = useCallback(() => {
    timerRef.current?.stop()
    timerRef.current = null
    cancelAnimationFrame(rafRef.current)
    busRef.current?.disconnect()
    busRef.current = null
    queue.current = []
    wake.current?.release().catch(() => {})
    wake.current = null
    setPlaying(false)
    setView((v) => ({ ...v, beat: -1, countIn: false, muted: false }))
  }, [])
  stopRef.current = stop

  const start = useCallback(async () => {
    if (busRef.current || starting.current) return
    starting.current = true
    let ctx = ctxRef.current
    if (!ctx) {
      ctx = new AudioContext({ latencyHint: 'interactive' })
      const master = ctx.createGain()
      master.gain.value = cfg.current.volume
      master.connect(ctx.destination)
      for (const snd of SOUNDS) for (const lv of [0, 1, 2] as const) {
        const data = synth(snd, lv, ctx.sampleRate)
        const b = ctx.createBuffer(1, data.length, ctx.sampleRate)
        b.copyToChannel(data, 0)
        bufs.current[snd + lv] = b
      }
      ctxRef.current = ctx
      masterRef.current = master
    }
    await ctx.resume().finally(() => { starting.current = false })
    const bus = ctx.createGain()
    bus.connect(masterRef.current!)
    busRef.current = bus
    if (cfg.current.trainer) { cfg.current = { ...cfg.current, bpm: cfg.current.trStart }; set({ bpm: cfg.current.trStart }) } // 카운트인부터 시작 BPM
    const c = cfg.current
    const t0 = ctx.currentTime + 0.08
    run.current = { pos: { bar: 0, beat: 0, sub: 0 }, next: t0, start: t0 + c.countIn * c.beats * (60 / c.bpm), countInBars: c.countIn, barMuted: false }
    queue.current = []
    setView({ bar: 0, beat: -1, countIn: c.countIn > 0, muted: false, elapsed: 0, flash: 0 })
    // 워커 타이머: 메인 스레드 타이머보다 백그라운드 스로틀링이 약함. 실패 시 setInterval
    try {
      const url = URL.createObjectURL(new Blob(['let i;onmessage=e=>{clearInterval(i);if(e.data)i=setInterval(()=>postMessage(0),e.data)}'], { type: 'text/javascript' }))
      const w = new Worker(url)
      URL.revokeObjectURL(url)
      w.onmessage = schedule
      w.postMessage(TICK_MS)
      timerRef.current = { stop: () => w.terminate() }
    } catch {
      const id = window.setInterval(schedule, TICK_MS)
      timerRef.current = { stop: () => clearInterval(id) }
    }
    schedule()
    rafRef.current = requestAnimationFrame(draw)
    setPlaying(true)
    lockScreen()
  }, [schedule, draw, lockScreen, set])

  const toggle = useCallback(() => (busRef.current ? stop() : start()), [start, stop])

  useEffect(() => {
    const onVis = () => { if (busRef.current && document.visibilityState === 'visible') lockScreen() }
    document.addEventListener('visibilitychange', onVis)
    return () => document.removeEventListener('visibilitychange', onVis)
  }, [lockScreen])
  useEffect(() => () => { stopRef.current(); ctxRef.current?.close() }, [])

  // ── BPM · 탭 템포 ──
  const nudge = useCallback((d: number) => setS((p) => ({ ...p, bpm: clampBpm(p.bpm + d) })), [])
  const tap = useCallback(() => {
    setTaps((prev) => {
      const next = pushTap(prev, performance.now())
      const b = tapBpm(next)
      if (b) setS((p) => ({ ...p, bpm: b }))
      return next
    })
  }, [])

  // ── 키보드: Space 재생/정지, ↑↓ BPM(Shift ±5), T 탭 ──
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return
      const el = e.target instanceof HTMLElement ? e.target : document.body
      if (el.closest('textarea, select, [contenteditable="true"], input:not([type="range"])')) return
      const onRange = el instanceof HTMLInputElement // 슬라이더는 화살표를 자체 처리
      if (e.code === 'Space') {
        e.preventDefault()
        el.blur?.() // 포커스된 버튼이 keyup에서 한 번 더 눌리는 것 방지
        toggle()
      } else if ((e.key === 'ArrowUp' || e.key === 'ArrowDown') && !onRange) {
        e.preventDefault()
        nudge((e.key === 'ArrowUp' ? 1 : -1) * (e.shiftKey ? 5 : 1))
      } else if ((e.key === 't' || e.key === 'T') && !e.repeat) {
        tap()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [toggle, nudge, tap])

  const setMeter = (beats: number, unit: number) => set({ beats, unit, accents: defaultAccents(beats, unit) })
  const shareUrl = useMemo(
    () => (typeof window === 'undefined' ? undefined : `${window.location.origin}${window.location.pathname}?${encodeSettings(s)}`),
    [s],
  )
  const mark = tempoMark(s.bpm)
  const mmss = `${String(Math.floor(view.elapsed / 60)).padStart(2, '0')}:${String(view.elapsed % 60).padStart(2, '0')}`
  const dotSize = s.beats > 8 ? ['w-10 h-10', 'w-8 h-8'] : ['w-14 h-14', 'w-11 h-11']
  const flashOn = s.flash && playing && view.beat >= 0 && !view.muted
  const nextStepIn = s.trainer && playing && !view.countIn && s.bpm !== s.trTarget ? s.trEvery - ((view.bar) % s.trEvery) : 0

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-fg">{t('title')}</h1>
        <p className="text-sm text-muted mt-1">{t('description')}</p>
      </div>

      <div className="grid lg:grid-cols-5 gap-6">
        {/* ── 메인: 박 표시 + BPM ── */}
        <div className="lg:col-span-3 ui-card p-6 sm:p-8 relative overflow-hidden">
          {s.flash && (
            <div
              key={view.flash}
              aria-hidden="true"
              className={`absolute inset-0 bg-primary pointer-events-none ${flashOn ? 'animate-[mnFlash_.18s_ease-out_forwards]' : 'opacity-0'}`}
            />
          )}
          <style>{'@keyframes mnFlash{from{opacity:.35}to{opacity:0}}'}</style>

          <div className="relative">
            {/* 박 점: 크기·모양·숫자로 구분(색 의존 X). 누르면 강박→보통→음소거 */}
            <div className="flex flex-wrap justify-center items-center gap-2 sm:gap-3 min-h-16" role="group" aria-label={t('beatPattern')}>
              {s.accents.map((a, i) => {
                const active = playing && view.beat === i
                const base = a === 'a' ? dotSize[0] : dotSize[1]
                const look = a === 'm'
                  ? `border-2 border-dashed ${active ? 'border-primary text-primary' : 'border-line-strong text-faint'}`
                  : active ? 'bg-primary text-white scale-110' : a === 'a' ? 'bg-sub text-white' : 'bg-track text-sub'
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => set({ accents: s.accents.map((x, j) => (j === i ? cycleAccent(x) : x)) })}
                    aria-label={t('beatAria', { n: i + 1, level: t(`accentLevels.${a}`) })}
                    className={`${base} rounded-full flex items-center justify-center font-bold tabular-nums transition-transform duration-75 ${look}`}
                  >
                    {a === 'a' ? <span className="text-base">{i + 1}</span> : <span className="text-xs">{i + 1}</span>}
                  </button>
                )
              })}
            </div>
            <p className="text-center text-xs text-muted mt-2">{t('beatPatternHint')}</p>

            <div className="text-center mt-6">
              <p className="text-7xl sm:text-8xl font-bold text-fg tabular-nums leading-none">{s.bpm}</p>
              <p className="text-sm text-muted mt-2">
                {t('bpmUnit')} · <span className="text-body font-medium">{t(`tempos.${mark}`)}</span>
              </p>
              <p className="text-sm text-sub mt-1 h-5 tabular-nums" aria-live="polite">
                {playing
                  ? view.countIn
                    ? t('countingIn')
                    : `${t('barCount', { n: view.bar + 1 })} · ${mmss}${view.muted ? ` · ${t('gapBar')}` : ''}`
                  : t('keyboardShort')}
              </p>
            </div>

            <div className="flex items-center justify-center gap-3 mt-6">
              {[-5, -1].map((d) => (
                <button key={d} type="button" onClick={() => nudge(d)} aria-label={t('bpmChange', { n: d })}
                  className={`${d === -5 ? 'w-12 h-12' : 'w-10 h-10'} rounded-full bg-soft hover:bg-subtle text-body text-sm font-semibold tabular-nums`}>
                  {d}
                </button>
              ))}
              <button type="button" onClick={toggle} aria-label={playing ? t('stop') : t('play')}
                className="ui-btn w-16 h-16 rounded-full">
                {playing ? <Square className="w-6 h-6" /> : <Play className="w-6 h-6 ml-1" />}
              </button>
              {[1, 5].map((d) => (
                <button key={d} type="button" onClick={() => nudge(d)} aria-label={t('bpmChange', { n: `+${d}` })}
                  className={`${d === 5 ? 'w-12 h-12' : 'w-10 h-10'} rounded-full bg-soft hover:bg-subtle text-body text-sm font-semibold tabular-nums`}>
                  +{d}
                </button>
              ))}
            </div>

            <div className="mt-6 px-1">
              <input type="range" min={BPM_MIN} max={BPM_MAX} value={s.bpm} aria-label={t('bpmUnit')}
                onChange={(e) => set({ bpm: Number(e.target.value) })}
                className="w-full h-2 bg-track rounded-lg appearance-none cursor-pointer accent-[var(--primary)]" />
              <div className="flex justify-between text-xs text-faint mt-1 tabular-nums">
                <span>20</span><span>100</span><span>200</span><span>300</span>
              </div>
            </div>

            <div className="flex justify-center mt-5">
              <button type="button" onClick={tap} className="ui-btn-soft px-8 py-3 min-w-40">
                {t('tapTempo')}{taps.length > 1 ? ` · ${t('tapCount', { n: taps.length })}` : ''}
              </button>
            </div>
            {s.trainer && (
              <p className="text-center text-xs text-sub mt-4 tabular-nums">
                {t('trainerStatus', { from: s.trStart, to: s.trTarget, step: s.trStep, every: s.trEvery })}
                {nextStepIn > 0 ? ` · ${t('trainerNext', { n: nextStepIn })}` : ''}
              </p>
            )}
          </div>
        </div>

        {/* ── 설정 ── */}
        <div className="lg:col-span-2 ui-card p-6 space-y-5">
          <h2 className="text-base font-semibold text-fg">{t('settings')}</h2>

          <div>
            <p className="text-sm text-body mb-2">{t('timeSignature')}</p>
            <div className="flex flex-wrap gap-2">
              {METERS.map(([b, u]) => (
                <button key={`${b}/${u}`} type="button" className={seg(!customMeter && s.beats === b && s.unit === u)}
                  onClick={() => { setCustomMeter(false); setMeter(b, u) }}>{b}/{u}</button>
              ))}
              <button type="button" className={seg(customMeter)} onClick={() => setCustomMeter(true)}>{t('custom')}</button>
            </div>
            {customMeter && (
              <div className="flex items-center gap-2 mt-2">
                <input type="number" min={1} max={16} value={s.beats} aria-label={t('beatsPerBar')}
                  onChange={(e) => { const b = Math.max(1, Math.min(16, Math.round(Number(e.target.value)) || 1)); setMeter(b, s.unit) }}
                  className="ui-field px-3 py-2 w-20 tabular-nums" />
                <span className="text-muted">/</span>
                <select value={s.unit} aria-label={t('noteValue')} onChange={(e) => setMeter(s.beats, Number(e.target.value))}
                  className="ui-field px-3 py-2 w-24">
                  {[2, 4, 8, 16].map((u) => <option key={u} value={u}>{u}</option>)}
                </select>
              </div>
            )}
            <p className="text-xs text-muted mt-2">{t('noteHint', { unit: s.unit })}</p>
          </div>

          <div>
            <p className="text-sm text-body mb-2">{t('subdivision')}</p>
            <div className="flex flex-wrap gap-2">
              {(Object.keys(SUBDIVISIONS) as Subdivision[]).map((k) => (
                <button key={k} type="button" className={seg(s.subdiv === k)} onClick={() => set({ subdiv: k })}>{t(`subdivisions.${k}`)}</button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-sm text-body mb-2">{t('sound')}</p>
            <div className="flex flex-wrap gap-2">
              {SOUNDS.map((k) => (
                <button key={k} type="button" className={seg(s.sound === k)} onClick={() => set({ sound: k })}>{t(`sounds.${k}`)}</button>
              ))}
            </div>
          </div>

          <div>
            <div className="flex justify-between text-sm text-body mb-2">
              <span>{t('volume')}</span><span className="tabular-nums text-sub">{Math.round(s.volume * 100)}%</span>
            </div>
            <input type="range" min={0} max={100} value={Math.round(s.volume * 100)} aria-label={t('volume')}
              onChange={(e) => set({ volume: Number(e.target.value) / 100 })}
              className="w-full h-2 bg-track rounded-lg appearance-none cursor-pointer accent-[var(--primary)]" />
          </div>

          <div>
            <p className="text-sm text-body mb-2">{t('countIn')}</p>
            <div className="flex gap-2">
              {[0, 1, 2].map((n) => (
                <button key={n} type="button" className={seg(s.countIn === n)} onClick={() => set({ countIn: n })}>
                  {n ? t('bars', { n }) : t('off')}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm text-body">{t('flash')}</p>
              <p className="text-xs text-muted">{t('flashHint')}</p>
            </div>
            <Toggle on={s.flash} onClick={() => set({ flash: !s.flash })} label={t('flash')} />
          </div>
          {canVibrate && (
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm text-body">{t('vibration')}</p>
              <Toggle on={s.vibrate} onClick={() => set({ vibrate: !s.vibrate })} label={t('vibration')} />
            </div>
          )}
        </div>
      </div>

      {/* ── 연습 도구 ── */}
      <div className="ui-card p-6">
        <h2 className="text-base font-semibold text-fg mb-4">{t('practice')}</h2>
        <div className="grid md:grid-cols-3 gap-6">
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-body">{t('trainer')}</p>
                <p className="text-xs text-muted">{t('trainerHint')}</p>
              </div>
              <Toggle on={s.trainer} onClick={() => set({ trainer: !s.trainer })} label={t('trainer')} />
            </div>
            {s.trainer && (
              <div className="grid grid-cols-2 gap-2">
                {([['trStart', BPM_MIN, BPM_MAX], ['trTarget', BPM_MIN, BPM_MAX], ['trStep', 1, 50], ['trEvery', 1, 64]] as const).map(([k, lo, hi]) => (
                  <label key={k} className="text-xs text-sub">
                    {t(k)}
                    <input type="number" min={lo} max={hi} value={s[k]}
                      onChange={(e) => set({ [k]: Math.min(hi, Math.max(0, Math.round(Number(e.target.value)) || 0)) })}
                      onBlur={() => set({ [k]: Math.max(lo, s[k]) })}
                      className="ui-field px-3 py-2 mt-1 tabular-nums" />
                  </label>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-3">
            <div>
              <p className="text-sm font-medium text-body">{t('gap')}</p>
              <p className="text-xs text-muted">{t('gapHint')}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {[0, 25, 50, 75].map((n) => (
                <button key={n} type="button" className={seg(s.gap === n)} onClick={() => set({ gap: n })}>{n ? `${n}%` : t('off')}</button>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <p className="text-sm font-medium text-body">{t('stopAfter')}</p>
              <p className="text-xs text-muted">{t('stopAfterHint')}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {[0, 5, 10, 20, 30].map((n) => (
                <button key={n} type="button" className={seg(s.stopMin === n)} onClick={() => set({ stopMin: n })}>{n ? t('minutes', { n }) : t('off')}</button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── 빠르기말 프리셋 ── */}
      <div className="ui-card p-6">
        <h2 className="text-base font-semibold text-fg mb-3">{t('presets')}</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
          {TEMPO_MARKS.map((m) => (
            <button key={m.key} type="button" onClick={() => set({ bpm: m.bpm })}
              className={`py-2 px-3 rounded-xl text-sm text-left transition-colors ${mark === m.key ? 'bg-primary-soft text-primary ring-1 ring-primary' : 'bg-subtle text-body hover:bg-soft'}`}>
              <span className="font-medium">{t(`tempos.${m.key}`)}</span>
              <span className="text-xs text-muted ml-1 tabular-nums">{m.bpm}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="ui-card p-6 space-y-3">
        <p className="text-sm text-sub">{t('keyboardHint')}</p>
        <ShareResult
          url={shareUrl}
          fileName="metronome"
          text={t('shareText', { bpm: s.bpm, ts: `${s.beats}/${s.unit}` })}
          card={{
            tool: t('title'),
            label: t('shareLabel'),
            headline: `${s.bpm} BPM`,
            sub: `${s.beats}/${s.unit} · ${t(`subdivisions.${s.subdiv}`)} · ${t(`tempos.${mark}`)}`,
          }}
        />
      </div>

      <GuideSection namespace="metronome" />
    </div>
  )
}
