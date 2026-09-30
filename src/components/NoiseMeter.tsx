'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { useTranslations } from '@/lib/i18n'
import { Mic, Square, RotateCcw, Download, AlertTriangle, Minus, Plus } from 'lucide-react'
import ShareResult from '@/components/ShareResult'
import {
  msToDbfs, meanSquare, accAdd, accLeq, aWeightingBiquads, periodAt, floorLimits, FLOOR_NOISE,
  stepPeak, newPeakState, countSince, histogram10, toCsv, formatDuration, DEFAULT_OFFSET, leq,
  type EnergyAcc, type PeakState, type Period,
} from '@/utils/noiseMeter'

// ── 표시용 소음 수준 (현재 레벨 라벨) ──
const LEVELS: { max: number; key: string }[] = [
  { max: 30, key: 'veryQuiet' }, { max: 50, key: 'quiet' }, { max: 60, key: 'moderate' },
  { max: 70, key: 'loud' }, { max: 85, key: 'veryLoud' }, { max: 100, key: 'harmful' }, { max: Infinity, key: 'dangerous' },
]
const levelKey = (db: number) => LEVELS.find(l => db < l.max)!.key

const BLOCK_MS = 100 // 순간값 블록 (≈ Fast 125ms 시간가중)
const CLIP_MS = 10_000
const MAX_CLIPS = 20
const OFFSET_KEY = 'noiseMeter.offset'

// AudioWorklet: 100ms마다 제곱평균(에너지)을 끊김 없이 계산해 메인 스레드로 보냄
const WORKLET = `class P extends AudioWorkletProcessor{constructor(o){super();this.n=o.processorOptions.n;this.s=0;this.c=0}
process(i){const ch=i[0]&&i[0][0];if(ch){for(let k=0;k<ch.length;k++)this.s+=ch[k]*ch[k];this.c+=ch.length;if(this.c>=this.n){this.port.postMessage(this.s/this.c);this.s=0;this.c=0}}return true}}
registerProcessor('nm-ms',P)`

interface Sec { t: number; leq: number; max: number } // 보정 전(dBFS) 1초 요약
interface LogEvent {
  id: number; type: 'leq' | 'max'; t: number; level: number; limit: number; period: Period
  durMs?: number; clipUrl?: string; clipExt?: string; recording?: boolean
}

type ErrKey = 'denied' | 'notFound' | 'busy' | 'insecure' | 'generic' | 'ended'

function pickMime(): string | undefined {
  if (typeof MediaRecorder === 'undefined') return undefined
  return ['audio/webm;codecs=opus', 'audio/mp4', 'audio/webm', 'audio/ogg'].find(m => MediaRecorder.isTypeSupported(m))
}

export default function NoiseMeter() {
  const t = useTranslations('noiseMeter')

  const [running, setRunning] = useState(false)
  const [, setTick] = useState(0)
  const [mode, setMode] = useState<'general' | 'floor'>('general')
  const [offset, setOffset] = useState(DEFAULT_OFFSET)
  const [oldBuilding, setOldBuilding] = useState(false)
  const [clipOn, setClipOn] = useState(false)
  const [error, setError] = useState<ErrKey | null>(null)
  const [inApp, setInApp] = useState(false)
  const [weighted, setWeighted] = useState(true)
  const [wake, setWake] = useState<'on' | 'unsupported' | null>(null)
  const [events, setEvents] = useState<LogEvent[]>([])
  const [known, setKnown] = useState('')
  const [canClip, setCanClip] = useState(false)

  // 측정 파이프라인
  const ctxRef = useRef<AudioContext | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const timerRef = useRef<number>(0)
  const wakeRef = useRef<WakeLockSentinel | null>(null)
  // 세션 데이터 (모두 보정 전 dBFS로 저장 → 보정값을 바꾸면 전체가 다시 계산됨)
  const s = useRef({
    start: 0, acc: { sum: 0, n: 0 } as EnergyAcc, max: -Infinity, min: Infinity, cur: -Infinity,
    bins: new Map<number, number>(), secs: [] as Sec[], secAcc: { sum: 0, n: 0 } as EnergyAcc, secMax: -Infinity, secStart: 0,
    recent: [] as number[],
    // 층간소음 (보정 후 dB)
    minAcc: { sum: 0, n: 0 } as EnergyAcc, minStart: 0, lastMinute: null as null | { leq: number; limit: number },
    peak: newPeakState() as PeakState, peakTimes: [] as number[], peakId: 0, clips: 0,
  })
  const cfg = useRef({ offset, mode, oldBuilding, clipOn })
  cfg.current = { offset, mode, oldBuilding, clipOn }
  const idRef = useRef(1)

  // 보정값 복원/저장
  useEffect(() => {
    try { const v = parseFloat(localStorage.getItem(OFFSET_KEY) ?? ''); if (Number.isFinite(v)) setOffset(v) } catch { /* 저장소 차단 */ }
    setCanClip(!!pickMime())
    setInApp(/KAKAOTALK|NAVER|Instagram|FBAN|FBAV|Line\//i.test(navigator.userAgent))
  }, [])
  const saveOffset = (v: number) => {
    const r = Math.round(Math.min(140, Math.max(40, v)) * 10) / 10
    setOffset(r)
    try { localStorage.setItem(OFFSET_KEY, String(r)) } catch { /* 무시 */ }
  }

  const resetSession = useCallback(() => {
    const now = Date.now()
    Object.assign(s.current, {
      start: now, acc: { sum: 0, n: 0 }, max: -Infinity, min: Infinity, cur: -Infinity, bins: new Map(), secs: [],
      secAcc: { sum: 0, n: 0 }, secMax: -Infinity, secStart: now, recent: [],
      minAcc: { sum: 0, n: 0 }, minStart: now, lastMinute: null, peak: newPeakState(), peakTimes: [],
    })
    setTick(x => x + 1)
  }, [])

  const logEvent = (e: Omit<LogEvent, 'id'>) => {
    const id = idRef.current++
    setEvents(prev => [{ ...e, id }, ...prev].slice(0, 500))
    return id
  }

  const captureClip = (id: number) => {
    const stream = streamRef.current, mime = pickMime()
    if (!stream || !mime || s.current.clips >= MAX_CLIPS) return
    s.current.clips++
    try {
      const rec = new MediaRecorder(stream, { mimeType: mime })
      const chunks: Blob[] = []
      rec.ondataavailable = e => { if (e.data.size) chunks.push(e.data) }
      rec.onstop = () => {
        const url = URL.createObjectURL(new Blob(chunks, { type: mime }))
        const ext = mime.includes('mp4') ? 'm4a' : mime.includes('ogg') ? 'ogg' : 'webm'
        setEvents(prev => prev.map(ev => (ev.id === id ? { ...ev, clipUrl: url, clipExt: ext, recording: false } : ev)))
      }
      rec.start()
      setEvents(prev => prev.map(ev => (ev.id === id ? { ...ev, recording: true } : ev)))
      setTimeout(() => { if (rec.state !== 'inactive') rec.stop() }, CLIP_MS)
    } catch { /* 녹음 미지원: 무시 */ }
  }

  // 100ms 블록 1개 처리
  const onBlock = useCallback((ms: number) => {
    const d = s.current, { offset: off, mode: m, oldBuilding: ob, clipOn: co } = cfg.current
    const raw = msToDbfs(ms), now = Date.now()
    if (now - d.start < 300) return // 마이크 켜짐 직후 무음/튐 구간 제외
    d.cur = raw
    accAdd(d.acc, raw)
    if (raw > d.max) d.max = raw
    if (raw < d.min) d.min = raw
    const bin = Math.round(raw)
    d.bins.set(bin, (d.bins.get(bin) ?? 0) + 1)
    d.recent.push(raw); if (d.recent.length > 30) d.recent.shift()
    accAdd(d.secAcc, raw); if (raw > d.secMax) d.secMax = raw
    if (now - d.secStart >= 1000) {
      d.secs.push({ t: now, leq: accLeq(d.secAcc), max: d.secMax })
      if (d.secs.length > 36_000) d.secs.shift() // 10시간 상한
      d.secAcc = { sum: 0, n: 0 }; d.secMax = -Infinity; d.secStart = now
    }

    if (m === 'floor') {
      const lvl = raw + off, period = periodAt(new Date(now)), lim = floorLimits(period, ob)
      accAdd(d.minAcc, lvl)
      if (now - d.minStart >= 60_000) {
        const l1 = accLeq(d.minAcc)
        d.lastMinute = { leq: l1, limit: lim.leq1m }
        if (l1 > lim.leq1m) logEvent({ type: 'leq', t: d.minStart, level: l1, limit: lim.leq1m, period })
        d.minAcc = { sum: 0, n: 0 }; d.minStart = now
      }
      const r = stepPeak(d.peak, now, lvl, lim.max)
      if (r.started) {
        d.peakTimes.push(now)
        d.peakId = logEvent({ type: 'max', t: now, level: lvl, limit: lim.max, period })
        if (co) captureClip(d.peakId)
      }
      if (r.ended) {
        const { peak, start, end } = r.ended, id = d.peakId
        setEvents(prev => prev.map(ev => (ev.id === id ? { ...ev, level: peak, durMs: end - start + BLOCK_MS } : ev)))
      }
    }
    setTick(x => (x + 1) % 1e9)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const requestWake = async () => {
    try {
      if (!('wakeLock' in navigator)) { setWake('unsupported'); return }
      wakeRef.current = await navigator.wakeLock.request('screen')
      setWake('on')
    } catch { setWake('unsupported') }
  }

  const stop = useCallback(() => {
    clearInterval(timerRef.current)
    ctxRef.current?.close().catch(() => {})
    streamRef.current?.getTracks().forEach(tr => tr.stop())
    wakeRef.current?.release().catch(() => {})
    ctxRef.current = null; streamRef.current = null; wakeRef.current = null
    setRunning(false); setWake(null)
  }, [])

  const start = useCallback(async () => {
    setError(null)
    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) { setError('insecure'); return }
    // iOS Safari: 사용자 제스처 안에서 AudioContext를 만들어야 소리가 흐름
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    const ctx = new Ctx()
    ctxRef.current = ctx
    let stream: MediaStream
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
      })
    } catch (err) {
      ctx.close().catch(() => {}); ctxRef.current = null
      const n = (err as DOMException)?.name
      setError(n === 'NotAllowedError' || n === 'SecurityError' ? 'denied'
        : n === 'NotFoundError' || n === 'OverconstrainedError' ? 'notFound'
        : n === 'NotReadableError' || n === 'AbortError' ? 'busy' : 'generic')
      return
    }
    streamRef.current = stream
    await ctx.resume().catch(() => {})
    stream.getAudioTracks()[0]?.addEventListener('ended', () => { stop(); setError('ended') })

    // 마이크 → A-가중(biquad 3단) → 측정
    let node: AudioNode = ctx.createMediaStreamSource(stream)
    try {
      for (const q of aWeightingBiquads(ctx.sampleRate)) {
        const f = ctx.createIIRFilter(q.b, q.a)
        node.connect(f); node = f
      }
      setWeighted(true)
    } catch { setWeighted(false) } // IIRFilterNode 미지원(구형 Safari): 비가중

    resetSession()
    let ok = false
    try {
      const url = URL.createObjectURL(new Blob([WORKLET], { type: 'application/javascript' }))
      await ctx.audioWorklet.addModule(url)
      URL.revokeObjectURL(url)
      const w = new AudioWorkletNode(ctx, 'nm-ms', { processorOptions: { n: Math.round((ctx.sampleRate * BLOCK_MS) / 1000) } })
      w.port.onmessage = e => onBlock(e.data as number)
      const mute = ctx.createGain(); mute.gain.value = 0
      node.connect(w); w.connect(mute); mute.connect(ctx.destination) // 일부 브라우저는 출력이 연결돼야 process 호출
      ok = true
    } catch { /* AudioWorklet 미지원 → AnalyserNode 폴링 */ }
    if (!ok) {
      const an = ctx.createAnalyser()
      an.fftSize = 4096
      node.connect(an)
      const buf = new Float32Array(an.fftSize)
      timerRef.current = window.setInterval(() => { an.getFloatTimeDomainData(buf); onBlock(meanSquare(buf)) }, BLOCK_MS)
    }
    setRunning(true)
    requestWake()
  }, [onBlock, resetSession, stop])

  // 화면 복귀 시 wake lock 재요청, iOS 전화/알림으로 멈춘 오디오 재개
  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState !== 'visible' || !ctxRef.current) return
      ctxRef.current.resume().catch(() => {})
      if (!wakeRef.current || wakeRef.current.released) requestWake()
    }
    document.addEventListener('visibilitychange', onVis)
    return () => document.removeEventListener('visibilitychange', onVis)
  }, [])
  useEffect(() => stop, [stop])

  // ── 파생값 (보정 적용) ──
  const d = s.current
  const has = d.acc.n > 0
  const cal = (raw: number) => Math.max(0, Math.round(raw + offset))
  const cur = has ? cal(d.cur) : null
  const avg = has ? cal(accLeq(d.acc)) : null
  const mx = has ? cal(d.max) : null
  const mn = has ? cal(d.min) : null
  const elapsed = has ? (d.secs.length ? d.secs[d.secs.length - 1].t : Date.now()) - d.start : 0
  const durText = (ms: number) => {
    const sec = Math.round(ms / 1000), h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60)
    return sec < 60 ? t('dur.sec', { n: sec }) : h ? t('dur.hourMin', { h, m }) : t('dur.min', { n: m })
  }

  const now = Date.now()
  const period = periodAt(new Date(now))
  const lim = floorLimits(period, oldBuilding)
  const minuteLeq = d.minAcc.n ? Math.round(accLeq(d.minAcc)) : null
  const minuteSec = Math.min(60, Math.floor((now - d.minStart) / 1000))
  const peakCount = countSince(d.peakTimes, now)

  const calibrate = () => {
    const k = parseFloat(known)
    if (!Number.isFinite(k) || d.recent.length < 30) return
    saveOffset(k - leq(d.recent))
  }

  const exportCsv = () => {
    const rows: (string | number)[][] = [t.raw('log.csvHeader') as string[]]
    for (const e of [...events].reverse()) {
      rows.push([
        new Date(e.t).toLocaleString('sv-SE'), t(`log.types.${e.type}`), t(`floor.period.${e.period}`),
        Math.round(e.level), e.limit, e.durMs != null ? (e.durMs / 1000).toFixed(1) : '',
      ])
    }
    rows.push([], [t('log.csvNote', { offset: offset.toFixed(1) })])
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob(['﻿' + toCsv(rows)], { type: 'text/csv;charset=utf-8' }))
    a.download = `noise-log-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    setTimeout(() => URL.revokeObjectURL(a.href), 1000)
  }
  const clearLog = () => {
    events.forEach(e => e.clipUrl && URL.revokeObjectURL(e.clipUrl))
    setEvents([]); s.current.clips = 0
  }

  // ── 차트 (최근 60초) ──
  const W = 600, H = 160, LO = 20, HI = 100
  const y = (db: number) => H - ((Math.min(HI, Math.max(LO, db)) - LO) / (HI - LO)) * H
  const last = d.secs.slice(-60)
  const x = (i: number) => (W * (60 - last.length + i)) / 59
  const line = (k: 'leq' | 'max') => last.map((p, i) => `${x(i).toFixed(1)},${y(p[k] + offset).toFixed(1)}`).join(' ')

  const hist = histogram10(new Map([...d.bins].map(([k, v]) => [k + Math.round(offset), v])))
  const scale = t.raw('scale.items') as { db: number; label: string }[]
  const seg = (on: boolean) => `px-4 py-2 rounded-lg text-sm font-medium transition-colors ${on ? 'bg-primary text-white' : 'bg-soft text-body hover:bg-subtle'}`
  const stat = (label: string, v: string) => (
    <div key={label}><p className="text-xs text-white/70">{label}</p><p className="text-xl font-bold tabular-nums">{v}</p></div>
  )

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-fg">{t('title')}</h1>
        <p className="text-sm text-muted mt-1">{t('description')}</p>
      </div>

      <div className="flex gap-2" role="tablist">
        {(['general', 'floor'] as const).map(m => (
          <button key={m} role="tab" aria-selected={mode === m} onClick={() => { setMode(m); d.minAcc = { sum: 0, n: 0 }; d.minStart = Date.now(); d.peak = newPeakState() }} className={seg(mode === m)}>
            {t(`mode.${m}`)}
          </button>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* 메인: 현재값 + 통계 */}
        <div className="lg:col-span-2 space-y-6">
          <div className="ui-hero p-6 sm:p-8">
            <div className="flex items-center justify-between text-sm text-white/70">
              <span>{t('current')} · {weighted ? 'dB(A)' : 'dB(Z)'} {t('estimate')}</span>
              {running && <span className="tabular-nums">{formatDuration(elapsed)}</span>}
            </div>
            <p className="text-7xl sm:text-8xl font-bold tabular-nums mt-2" aria-live="off">{cur ?? '--'}</p>
            <p className="text-sm text-white/80 mt-1 min-h-5">{cur != null ? t(`levels.${levelKey(cur)}`) : t('idleHint')}</p>
            <div className="grid grid-cols-4 gap-3 mt-6 pt-5 border-t border-white/20">
              {stat(t('avgDb'), avg != null ? String(avg) : '-')}
              {stat(t('maxDb'), mx != null ? String(mx) : '-')}
              {stat(t('minDb'), mn != null ? String(mn) : '-')}
              {stat(t('duration'), has ? formatDuration(elapsed) : '-')}
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {!running ? (
              <button onClick={start} className="ui-btn px-6 py-3 text-base"><Mic className="w-5 h-5" />{t('start')}</button>
            ) : (
              <button onClick={stop} className="ui-btn px-6 py-3 text-base"><Square className="w-4 h-4" />{t('stop')}</button>
            )}
            {has && (
              <button onClick={resetSession} className="bg-soft hover:bg-subtle text-body rounded-xl px-4 py-3 inline-flex items-center gap-2 text-sm font-medium">
                <RotateCcw className="w-4 h-4" />{t('reset')}
              </button>
            )}
            {running && <span className="self-center text-xs text-muted">{wake === 'on' ? t('wake.on') : wake === 'unsupported' ? t('wake.off') : ''}</span>}
          </div>

          {error && (
            <div className="bg-amber-50 text-amber-800 rounded-2xl p-5 text-sm space-y-2" role="alert">
              <p className="font-semibold">{t(`err.${error}`)}</p>
              {error === 'denied' && (
                <ul className="list-disc pl-5 space-y-1">
                  {(t.raw('err.deniedHelp') as string[]).map((h, i) => <li key={i}>{h}</li>)}
                </ul>
              )}
              {inApp && <p>{t('err.inApp')}</p>}
            </div>
          )}
          {running && !weighted && <p className="text-xs text-muted">{t('noWeighting')}</p>}

          {has && avg != null && mx != null && !running && (
            <ShareResult
              card={{
                tool: t('title'), label: t('share.label', { duration: durText(elapsed) }), headline: t('share.headline', { avg }),
                sub: t('share.sub'),
                rows: [
                  { label: t('maxDb'), value: `${mx} dB` },
                  { label: t('minDb'), value: `${mn} dB` },
                  ...(mode === 'floor' ? [{ label: t('share.events'), value: t('share.eventsValue', { n: events.length }) }] : []),
                ],
              }}
              text={t('share.text', { avg, max: mx, duration: durText(elapsed) })}
              fileName="noise-meter"
            />
          )}

          {/* 층간소음 모드 */}
          {mode === 'floor' && (
            <div className="ui-card p-6 space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-lg font-semibold text-fg">{t('floor.title')}</h2>
                <span className="text-xs font-semibold rounded-full bg-primary-soft text-primary px-2.5 py-1">{t(`floor.period.${period}`)}</span>
              </div>
              <div className="grid sm:grid-cols-2 gap-3">
                <div className="bg-subtle rounded-2xl p-4">
                  <p className="text-sm text-sub">{t('floor.leqLabel')}</p>
                  <p className="text-3xl font-bold text-fg tabular-nums mt-1">
                    {running && minuteLeq != null ? minuteLeq : '-'}<span className="text-base font-medium text-muted"> / {lim.leq1m} dB</span>
                  </p>
                  <p className="text-xs text-muted mt-1">{t('floor.currentMinute', { s: running ? minuteSec : 0 })}</p>
                  {d.lastMinute && (
                    <p className={`text-xs mt-1 ${d.lastMinute.leq > d.lastMinute.limit ? 'text-red-600 font-semibold' : 'text-muted'}`}>
                      {t('floor.lastMinute', { v: Math.round(d.lastMinute.leq) })}
                    </p>
                  )}
                </div>
                <div className="bg-subtle rounded-2xl p-4">
                  <p className="text-sm text-sub">{t('floor.maxLabel')}</p>
                  <p className="text-3xl font-bold text-fg tabular-nums mt-1">
                    {cur ?? '-'}<span className="text-base font-medium text-muted"> / {lim.max} dB</span>
                  </p>
                  <p className={`text-xs mt-1 ${peakCount >= FLOOR_NOISE.maxCountPerHour ? 'text-red-600 font-semibold' : 'text-muted'}`}>
                    {t('floor.maxCount', { n: peakCount, limit: FLOOR_NOISE.maxCountPerHour })}
                  </p>
                </div>
              </div>
              <div className="space-y-2 text-sm text-body">
                <label className="flex items-center gap-2"><input type="checkbox" checked={oldBuilding} onChange={e => setOldBuilding(e.target.checked)} className="w-4 h-4 accent-[var(--primary)]" />{t('floor.oldBuilding')}</label>
                <label className="flex items-center gap-2"><input type="checkbox" checked={clipOn} onChange={e => setClipOn(e.target.checked)} disabled={!canClip} className="w-4 h-4 accent-[var(--primary)]" />{t('floor.clip')}</label>
              </div>
              <div className="bg-amber-50 text-amber-800 rounded-2xl p-4 text-xs flex gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" /><p>{t('floor.caveat')}</p>
              </div>

              {/* 초과 기록 */}
              <div>
                <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                  <h3 className="font-semibold text-fg">{t('log.title')} <span className="text-muted font-normal">{events.length}</span></h3>
                  <div className="flex gap-2">
                    <button onClick={exportCsv} disabled={!events.length} className="ui-btn-soft px-3 py-2 text-sm disabled:opacity-40"><Download className="w-4 h-4" />{t('log.csv')}</button>
                    <button onClick={clearLog} disabled={!events.length} className="bg-soft hover:bg-subtle text-body rounded-xl px-3 py-2 text-sm font-medium disabled:opacity-40">{t('log.clear')}</button>
                  </div>
                </div>
                {events.length === 0 ? (
                  <p className="text-sm text-muted">{t('log.empty')}</p>
                ) : (
                  <div className="overflow-x-auto max-h-80 overflow-y-auto">
                    <table className="w-full text-sm">
                      <thead className="text-xs text-muted text-left">
                        <tr><th className="py-2 pr-3 font-medium">{t('log.time')}</th><th className="py-2 pr-3 font-medium">{t('log.type')}</th><th className="py-2 pr-3 font-medium text-right">{t('log.level')}</th><th className="py-2 pr-3 font-medium text-right">{t('log.dur')}</th><th className="py-2 font-medium">{t('log.clip')}</th></tr>
                      </thead>
                      <tbody>
                        {events.map(e => (
                          <tr key={e.id} className="border-t border-line text-body">
                            <td className="py-2 pr-3 tabular-nums whitespace-nowrap">{new Date(e.t).toLocaleTimeString('ko-KR', { hour12: false })}</td>
                            <td className="py-2 pr-3 whitespace-nowrap">{t(`log.types.${e.type}`)}</td>
                            <td className="py-2 pr-3 text-right tabular-nums whitespace-nowrap"><span className="font-semibold text-fg">{Math.round(e.level)}</span><span className="text-muted"> / {e.limit}</span></td>
                            <td className="py-2 pr-3 text-right tabular-nums">{e.durMs != null ? `${(e.durMs / 1000).toFixed(1)}s` : e.type === 'leq' ? '60s' : '…'}</td>
                            <td className="py-2 whitespace-nowrap">
                              {e.clipUrl ? (
                                <a href={e.clipUrl} download={`noise-${new Date(e.t).toISOString().replace(/[:.]/g, '-')}.${e.clipExt}`} className="text-primary font-medium">{t('log.download')}</a>
                              ) : e.recording ? <span className="text-muted">{t('log.recording')}</span> : null}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
              <p className="text-xs text-muted">{t('floor.source')}</p>
            </div>
          )}

          {/* 최근 60초 차트 */}
          <div className="ui-card p-6">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
              <h2 className="font-semibold text-fg">{t('chart.title')}</h2>
              <div className="flex gap-3 text-xs text-muted">
                <span className="inline-flex items-center gap-1"><span className="w-3 h-0.5 bg-primary inline-block" />{t('chart.leq')}</span>
                <span className="inline-flex items-center gap-1"><span className="w-3 h-0.5 bg-track inline-block" />{t('chart.max')}</span>
              </div>
            </div>
            <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-40" preserveAspectRatio="none" role="img" aria-label={t('chart.title')}>
              {[40, 60, 80].map(v => <line key={v} x1={0} x2={W} y1={y(v)} y2={y(v)} stroke="var(--line)" strokeWidth={1} vectorEffect="non-scaling-stroke" />)}
              {mode === 'floor' && [lim.leq1m, lim.max].map(v => (
                <line key={`l${v}`} x1={0} x2={W} y1={y(v)} y2={y(v)} stroke="#f59e0b" strokeDasharray="6 4" strokeWidth={1.5} vectorEffect="non-scaling-stroke" />
              ))}
              {last.length > 1 && <polyline points={line('max')} fill="none" stroke="var(--line-strong)" strokeWidth={1.5} vectorEffect="non-scaling-stroke" />}
              {last.length > 1 && <polyline points={line('leq')} fill="none" stroke="var(--primary)" strokeWidth={2} vectorEffect="non-scaling-stroke" />}
            </svg>
            <div className="flex justify-between text-xs text-faint mt-1 tabular-nums">
              <span>-60s</span><span>{t('chart.axis', { lo: LO, hi: HI })}</span><span>{t('chart.now')}</span>
            </div>
          </div>

          {/* 분포 */}
          <div className="ui-card p-6">
            <h2 className="font-semibold text-fg mb-4">{t('hist.title')}</h2>
            <div className="space-y-2">
              {hist.map((b, i) => (
                <div key={b.from} className="flex items-center gap-3 text-sm">
                  <span className="w-20 shrink-0 text-sub tabular-nums">
                    {i === 0 ? t('hist.below', { v: b.to }) : i === hist.length - 1 ? t('hist.above', { v: b.from }) : `${b.from}–${b.to}`}
                  </span>
                  <div className="flex-1 h-3 bg-soft rounded-full overflow-hidden"><div className="h-full bg-primary rounded-full" style={{ width: `${b.pct}%` }} /></div>
                  <span className="w-12 text-right tabular-nums text-body">{b.pct ? `${b.pct.toFixed(b.pct < 10 ? 1 : 0)}%` : '-'}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 사이드: 보정 + 참고 스케일 */}
        <div className="space-y-6">
          <div className="ui-card p-6 space-y-4">
            <h2 className="font-semibold text-fg">{t('calib.title')}</h2>
            <p className="text-sm text-muted">{t('calib.desc')}</p>
            <div className="flex items-center gap-2">
              <button onClick={() => saveOffset(offset - 1)} className="bg-soft hover:bg-subtle text-body rounded-xl p-2.5" aria-label={t('calib.down')}><Minus className="w-4 h-4" /></button>
              <div className="flex-1 text-center">
                <p className="text-xs text-muted">{t('calib.offset')}</p>
                <p className="text-xl font-bold text-fg tabular-nums">{offset.toFixed(1)}</p>
              </div>
              <button onClick={() => saveOffset(offset + 1)} className="bg-soft hover:bg-subtle text-body rounded-xl p-2.5" aria-label={t('calib.up')}><Plus className="w-4 h-4" /></button>
            </div>
            <div className="bg-subtle rounded-2xl p-4 space-y-2">
              <label className="text-sm text-body block" htmlFor="nm-known">{t('calib.known')}</label>
              <div className="flex gap-2">
                <input id="nm-known" type="number" inputMode="decimal" value={known} onChange={e => setKnown(e.target.value)} placeholder="45" className="ui-field px-3 py-2" />
                <button onClick={calibrate} disabled={!running || d.recent.length < 30 || !known} className="ui-btn px-3 py-2 text-sm whitespace-nowrap">{t('calib.apply')}</button>
              </div>
              <p className="text-xs text-muted">{t('calib.knownHelp')}</p>
            </div>
            {offset !== DEFAULT_OFFSET && (
              <button onClick={() => saveOffset(DEFAULT_OFFSET)} className="text-sm text-primary font-medium">{t('calib.reset', { v: DEFAULT_OFFSET })}</button>
            )}
          </div>

          <div className="ui-card p-6">
            <h2 className="font-semibold text-fg mb-4">{t('scale.title')}</h2>
            <ol className="space-y-1">
              {[...scale].reverse().map((p, i, arr) => {
                const nextDb = i > 0 ? arr[i - 1].db : Infinity
                const here = cur != null && cur >= p.db && cur < nextDb
                return (
                  <li key={p.db} className={`flex items-center gap-3 px-3 py-2 rounded-xl text-sm ${here ? 'bg-primary-soft text-primary font-semibold' : 'text-body'}`}>
                    <span className="w-10 tabular-nums text-right">{p.db}</span>
                    <span className="flex-1">{p.label}</span>
                    {here && <span className="text-xs">{t('scale.now', { v: cur })}</span>}
                  </li>
                )
              })}
            </ol>
          </div>
        </div>
      </div>

      {/* 가이드 + FAQ */}
      <div className="ui-card p-6 space-y-6">
        <h2 className="text-xl font-semibold text-fg">{t('guide.title')}</h2>
        {(['how', 'tips'] as const).map(k => (
          <div key={k}>
            <h3 className="font-semibold text-fg mb-2">{t(`guide.${k}.title`)}</h3>
            <ul className="list-disc pl-5 space-y-1 text-sm text-body">
              {(t.raw(`guide.${k}.items`) as string[]).map((item, i) => <li key={i}>{item}</li>)}
            </ul>
          </div>
        ))}
        <div>
          <h3 className="font-semibold text-fg mb-2">{t('guide.faq.title')}</h3>
          <div className="space-y-3">
            {(t.raw('guide.faq.items') as { q: string; a: string }[]).map((f, i) => (
              <details key={i} className="bg-subtle rounded-2xl p-4">
                <summary className="font-medium text-fg cursor-pointer">{f.q}</summary>
                <p className="text-sm text-sub mt-2">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
        <p className="text-xs text-muted">{t('disclaimer')}</p>
      </div>
    </div>
  )
}
