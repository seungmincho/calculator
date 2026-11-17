'use client'

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { MAX_SECONDS } from '@/lib/speaking/core'
import { createSpeakingPreparation, isSpeakingPreparationSeconds, type SpeakingPreparationSeconds } from '@/utils/speakingPreparation'

type Phase = 'idle' | 'requesting' | 'preparing' | 'recording' | 'stopping'
type RecorderState = { phase: Phase; remaining: number; seconds: number; level: number; error: string | null }
type Run = {
  phase: Phase; closed: boolean; stream: MediaStream | null; recorder: MediaRecorder | null; context: AudioContext | null
  timer: ReturnType<typeof setInterval> | null; preparation: ReturnType<typeof createSpeakingPreparation> | null
  started: number; stopped: number | null; chunks: Blob[]
}
const idle: RecorderState = { phase: 'idle', remaining: 0, seconds: 0, level: 0, error: null }
const pageHidden = () => document.hidden || document.visibilityState === 'hidden'

/** Releases only this run, including resources acquired before a constructor/start failure. */
function releaseRun(run: Run) {
  run.closed = true
  run.preparation?.cancel()
  if (run.timer !== null) clearInterval(run.timer)
  run.timer = null
  const recorder = run.recorder; run.recorder = null
  if (recorder) {
    recorder.ondataavailable = null; recorder.onstop = null; recorder.onerror = null
    try { if (recorder.state !== 'inactive') recorder.stop() } catch { /* Continue releasing tracks. */ }
  }
  const stream = run.stream; run.stream = null
  stream?.getTracks().forEach(track => { try { track.stop() } catch { /* Release other tracks too. */ } })
  const context = run.context; run.context = null
  try { void context?.close().catch(() => {}) } catch { /* Already closed/unsupported context. */ }
  run.chunks = []
}

export function useSpeakingRecorder(onComplete: (blob: Blob, seconds: number) => void) {
  const [state, setState] = useState<RecorderState>(idle)
  const active = useRef<Run | null>(null), alive = useRef(false), complete = useRef(onComplete)
  useLayoutEffect(() => { complete.current = onComplete }, [onComplete])
  const current = useCallback((run: Run) => alive.current && active.current === run && !run.closed, [])
  const isBusy = useCallback(() => !!active.current && !active.current.closed, [])
  const cancelRun = useCallback((run: Run) => {
    if (!current(run)) return
    active.current = null; releaseRun(run); setState(idle)
  }, [current])
  const fail = useCallback((run: Run, error: string) => {
    if (!current(run)) return
    active.current = null; releaseRun(run)
    setState(previous => ({ ...previous, phase: 'idle', remaining: 0, level: 0, error }))
  }, [current])
  const stop = useCallback(() => {
    const run = active.current
    if (!run || !current(run) || run.phase !== 'recording' || !run.recorder) return
    run.phase = 'stopping'; run.stopped = performance.now()
    if (run.timer !== null) clearInterval(run.timer)
    run.timer = null
    setState(previous => ({ ...previous, phase: 'stopping' }))
    try { if (run.recorder.state !== 'inactive') run.recorder.stop() }
    catch { fail(run, 'recordingFailed') }
  }, [current, fail])
  const cancelRequest = useCallback(() => {
    const run = active.current
    if (run && (run.phase === 'requesting' || run.phase === 'preparing')) cancelRun(run)
  }, [cancelRun])

  useEffect(() => {
    alive.current = true
    const hidden = () => { if (pageHidden()) cancelRequest() }
    document.addEventListener('visibilitychange', hidden)
    window.addEventListener('pagehide', cancelRequest)
    return () => {
      alive.current = false
      document.removeEventListener('visibilitychange', hidden)
      window.removeEventListener('pagehide', cancelRequest)
      const run = active.current; active.current = null
      if (run) releaseRun(run)
    }
  }, [cancelRequest])

  const start = useCallback(async (delay: SpeakingPreparationSeconds = 0) => {
    if (!alive.current || isBusy() || !isSpeakingPreparationSeconds(delay) || pageHidden()) return
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') { setState({ ...idle, error: 'noMicrophone' }); return }
    const run: Run = { phase: 'requesting', closed: false, stream: null, recorder: null, context: null, timer: null, preparation: null, started: 0, stopped: null, chunks: [] }
    active.current = run; setState({ ...idle, phase: 'requesting' })
    const beginRecording = () => {
      if (!current(run)) return
      if (pageHidden()) { cancelRun(run); return }
      if (run.timer !== null) clearInterval(run.timer)
      run.timer = null
      try {
        if (!run.stream) throw new Error('missingStream')
        const mimeType = ['audio/webm;codecs=opus', 'audio/mp4', 'audio/webm'].find(type => MediaRecorder.isTypeSupported(type))
        const rec = new MediaRecorder(run.stream, mimeType ? { mimeType } : undefined)
        run.recorder = rec
        const ownsRecorder = () => current(run) && run.recorder === rec
        rec.ondataavailable = event => { if (ownsRecorder() && event.data.size) run.chunks.push(event.data) }
        rec.onerror = () => { if (ownsRecorder()) fail(run, 'recordingFailed') }
        rec.onstop = () => {
          if (!ownsRecorder()) return
          const elapsed = Math.max(0, Math.min(MAX_SECONDS, ((run.stopped ?? performance.now()) - run.started) / 1000))
          const blob = new Blob(run.chunks, { type: rec.mimeType || 'audio/webm' })
          active.current = null; releaseRun(run)
          const error = elapsed < .5 || !blob.size ? 'audioTooShort' : null
          setState({ phase: 'idle', remaining: 0, seconds: Math.floor(elapsed), level: 0, error })
          if (!error) complete.current(blob, elapsed)
        }
        const audio = new AudioContext(); run.context = audio
        const analyser = audio.createAnalyser(); analyser.fftSize = 256
        audio.createMediaStreamSource(run.stream).connect(analyser)
        const data = new Uint8Array(analyser.fftSize)
        if (!current(run)) { releaseRun(run); return }
        run.started = performance.now(); run.phase = 'recording'
        rec.start(250)
        if (!current(run)) return
        setState({ ...idle, phase: 'recording' })
        const timer = setInterval(() => {
          if (!ownsRecorder() || run.timer !== timer || run.phase !== 'recording') return
          try {
            const elapsed = Math.max(0, (performance.now() - run.started) / 1000)
            analyser.getByteTimeDomainData(data)
            const rms = Math.sqrt(data.reduce((sum, n) => sum + ((n - 128) / 128) ** 2, 0) / data.length)
            setState(previous => ({ ...previous, seconds: Math.min(MAX_SECONDS, Math.floor(elapsed)), level: Math.min(1, rms * 5) }))
            if (elapsed >= MAX_SECONDS) stop()
          } catch { fail(run, 'recordingFailed') }
        }, 100)
        run.timer = timer
      } catch { fail(run, 'recordingFailed') }
    }
    try {
      const media = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true }, video: false })
      if (!current(run)) { media.getTracks().forEach(track => { try { track.stop() } catch { /* Other tracks still stop. */ } }); return }
      run.stream = media
      if (pageHidden()) { cancelRun(run); return }
      run.preparation = createSpeakingPreparation(delay, performance.now())
      const first = run.preparation.advance(performance.now())
      if (first.start) { beginRecording(); return }
      run.phase = 'preparing'; setState({ ...idle, phase: 'preparing', remaining: first.remaining })
      const timer = setInterval(() => {
        if (!current(run) || run.timer !== timer || run.phase !== 'preparing') return
        if (pageHidden()) { cancelRun(run); return }
        const next = run.preparation!.advance(performance.now())
        if (next.start) beginRecording()
        else setState(previous => previous.remaining === next.remaining ? previous : { ...previous, remaining: next.remaining })
      }, 100)
      run.timer = timer
    } catch (cause) {
      fail(run, cause instanceof DOMException && cause.name === 'NotAllowedError' ? 'microphoneDenied' : 'recordingFailed')
    }
  }, [cancelRun, current, fail, isBusy, stop])

  return { ...state, recording: state.phase === 'recording', requesting: state.phase === 'requesting', preparing: state.phase === 'preparing', start, stop, cancelRequest, isBusy }
}
